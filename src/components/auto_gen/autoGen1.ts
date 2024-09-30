// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import Meyda, { MeydaFeaturesObject } from 'meyda';
import dataStore from '@/lib/data_store';

const clamp = (value: number, min = 0, max = 4095) => Math.min(Math.max(value, min), max);

const FREQUENCY_RANGES = {
  lows: { min: 60, max: 250 },
  mids: { min: 250, max: 2000 },
  highs: { min: 2000, max: 20000 }
};

type NewFuncTestConfig = {
  ledIdx: number[][];
  ledFrequencyAssignment?: {
    lows?: number;
    mids?: number;
    highs?: number;
  };
  amplitudeThreshold?: number;
  frequencyThresholds?: {
    lows?: number;
    mids?: number;
    highs?: number;
  };
  antiFlicker?: boolean; // New parameter
};

type LEDAssignment = {
  lows: number[][];
  mids: number[][];
  highs: number[][];
};

// Helper function to calculate the 90th percentile loudness
const calculateLoudnessThreshold = (loudnessValues: number[], percentile: number): number => {
  if (loudnessValues.length === 0) return 0;
  const sorted = [...loudnessValues].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * percentile);
  return sorted[index] || 0;
};

// Helper function to apply sequential or reverse sequential effect
const applySequentialEffect = (
  physicalLEDBrightness: number[],
  frame: number,
  physicalLEDCount: number
) => {
  const direction = Math.floor(frame / 10) % 2 === 0 ? 1 : -1; // Alternate direction every 10 frames
  const ledIndex = Math.floor((frame / 10) % physicalLEDCount);
  const index = direction === 1 ? ledIndex : physicalLEDCount - ledIndex - 1;
  physicalLEDBrightness[index] = clamp(4095, 0, 4095); // Full brightness for the effect
};

export const newFuncTest = async (config: NewFuncTestConfig): Promise<string | undefined> => {
  const {
    ledIdx,
    ledFrequencyAssignment,
    amplitudeThreshold,
    frequencyThresholds,
    antiFlicker = false // default
  } = config;
  const audioSrc: string | undefined = dataStore.get('audioSrc');

  if (!audioSrc) {
    console.error('Audio source not provided!');
    return;
  }

  try {
    const response = await fetch(audioSrc);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    const audioContext = new OfflineAudioContext(1, arrayBuffer.byteLength, 44100);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const bufferSize = 2048;
    const hopSize = Math.floor((16.666 / 1000) * sampleRate); // ~60 FPS

    Meyda.sampleRate = sampleRate;
    Meyda.bufferSize = bufferSize;
    Meyda.windowingFunction = 'hanning';

    const totalFrames = Math.floor((channelData.length - bufferSize) / hopSize) + 1;
    const physicalLEDCount = ledIdx.flat().length; // Total LED count
    const csvRows: string[] = [];

    const totalLeds = ledIdx.length;
    const defaultLedDistribution = {
      lows: Math.floor(totalLeds * 0.3),
      mids: Math.floor(totalLeds * 0.4),
      highs: totalLeds - Math.floor(totalLeds * 0.3) - Math.floor(totalLeds * 0.4)
    };
    const ledDistribution = { ...defaultLedDistribution, ...ledFrequencyAssignment };

    let ledAssignment: LEDAssignment = {
      lows: ledIdx.slice(0, ledDistribution.lows),
      mids: ledIdx.slice(
        ledDistribution.lows,
        ledDistribution.lows + ledDistribution.mids
      ),
      highs: ledIdx.slice(ledDistribution.lows + ledDistribution.mids)
    };

    const subBands = {
      lows: Array(ledAssignment.lows.length)
        .fill(0)
        .map((_, i) => ({
          min:
            FREQUENCY_RANGES.lows.min +
            (i * (FREQUENCY_RANGES.lows.max - FREQUENCY_RANGES.lows.min)) /
              ledAssignment.lows.length,
          max:
            FREQUENCY_RANGES.lows.min +
            ((i + 1) * (FREQUENCY_RANGES.lows.max - FREQUENCY_RANGES.lows.min)) /
              ledAssignment.lows.length
        })),
      mids: Array(ledAssignment.mids.length)
        .fill(0)
        .map((_, i) => ({
          min:
            FREQUENCY_RANGES.mids.min +
            (i * (FREQUENCY_RANGES.mids.max - FREQUENCY_RANGES.mids.min)) /
              ledAssignment.mids.length,
          max:
            FREQUENCY_RANGES.mids.min +
            ((i + 1) * (FREQUENCY_RANGES.mids.max - FREQUENCY_RANGES.mids.min)) /
              ledAssignment.mids.length
        })),
      highs: Array(ledAssignment.highs.length)
        .fill(0)
        .map((_, i) => ({
          min:
            FREQUENCY_RANGES.highs.min +
            (i * (FREQUENCY_RANGES.highs.max - FREQUENCY_RANGES.highs.min)) /
              ledAssignment.highs.length,
          max:
            FREQUENCY_RANGES.highs.min +
            ((i + 1) * (FREQUENCY_RANGES.highs.max - FREQUENCY_RANGES.highs.min)) /
              ledAssignment.highs.length
        }))
    };

    // Initialize array to store loudness values for threshold calculation
    const loudnessValues: number[] = [];

    // First Pass: Collect loudness values
    for (let frame = 0; frame < totalFrames; frame++) {
      const startIdx = frame * hopSize;
      const endIdx = startIdx + bufferSize;
      if (endIdx > channelData.length) break;

      const signal = channelData.slice(startIdx, endIdx);
      const features: Partial<MeydaFeaturesObject> | null = Meyda.extract(['loudness'], signal);

      if (features && features.loudness) {
        loudnessValues.push(features.loudness.total);
      }
    }

    // Calculate the 90th percentile loudness threshold
    const loudnessThreshold = calculateLoudnessThreshold(loudnessValues, 0.9);

    // Reset Meyda extractor for the second pass
    Meyda.bufferSize = bufferSize;
    Meyda.sampleRate = sampleRate;

    // Re-initialize activation counts and shuffle LEDs initially
    const activationCountsSecondPass = new Array(physicalLEDCount).fill(0);
    const reassignLogicalLEDs = () => {
      // Shuffle the logical LED assignments randomly
      const shuffled = [...ledIdx].sort(() => Math.random() - 0.5);
      ledAssignment = {
        lows: shuffled.slice(0, ledDistribution.lows),
        mids: shuffled.slice(
          ledDistribution.lows,
          ledDistribution.lows + ledDistribution.mids
        ),
        highs: shuffled.slice(ledDistribution.lows + ledDistribution.mids)
      };
    };

    reassignLogicalLEDs(); // Initial shuffle

    // Initialize current brightness for anti-flicker if enabled
    const currentBrightness: number[] = antiFlicker
      ? new Array(physicalLEDCount).fill(0)
      : [];

    const decayFactor = 0.9; // Adjust this value between 0 (fast decay) and 1 (slow decay)

    for (let frame = 0; frame < totalFrames; frame++) {
      const startIdx = frame * hopSize;
      const endIdx = startIdx + bufferSize;
      if (endIdx > channelData.length) break;

      const signal = channelData.slice(startIdx, endIdx);
      const physicalLEDBrightness = new Array(physicalLEDCount).fill(0);
      const features: Partial<MeydaFeaturesObject> | null = Meyda.extract(
        ['amplitudeSpectrum', 'loudness'],
        signal
      );

      if (features && features.amplitudeSpectrum && features.loudness) {
        const loudness = features.loudness.total;

        // Dynamically adjust amplitude threshold to be more responsive
        const dynamicAmplitudeThreshold =
          amplitudeThreshold ?? 0.5 * Math.max(...loudnessValues);

        // Detect super heavy beats (above 90th percentile)
        const isSuperHeavyBeat = loudness > loudnessThreshold;

        if (isSuperHeavyBeat) {
          // Apply sequential or reverse sequential effect
          applySequentialEffect(physicalLEDBrightness, frame, physicalLEDCount);
        } else if (loudness >= dynamicAmplitudeThreshold) {
          ['lows', 'mids', 'highs'].forEach((range) => {
            ledAssignment[range].forEach((ledGroup, i) => {
              const band = subBands[range][i];
              const bandEnergy = calculateBandEnergy(
                features.amplitudeSpectrum,
                band.min,
                band.max,
                sampleRate,
                bufferSize
              );

              if (bandEnergy > (frequencyThresholds ? frequencyThresholds[range] || 0 : 0)) {
                const brightness = clamp(Math.floor((bandEnergy / loudness) * 4095));
                ledGroup.forEach((ledIndex: number) => {
                  physicalLEDBrightness[ledIndex] = brightness;
                  activationCountsSecondPass[ledIndex]++;
                });
              }
            });
          });
        }

        // Randomly reassign LEDs at certain intervals to ensure all LEDs get a chance
        const reassignmentIntervalFrames = Math.floor(sampleRate / hopSize / 2); // Every ~0.5 seconds
        if (frame % reassignmentIntervalFrames === 0) {
          reassignLogicalLEDs();
        }
      }

      // Apply anti-flicker if enabled
      if (antiFlicker) {
        for (let led = 0; led < physicalLEDCount; led++) {
          const targetBrightness = physicalLEDBrightness[led] || 0;
          currentBrightness[led] = clamp(
            Math.floor(currentBrightness[led] * decayFactor + targetBrightness * (1 - decayFactor)),
            0,
            4095
          );
          physicalLEDBrightness[led] = currentBrightness[led];
        }
      }

      csvRows.push(physicalLEDBrightness.join(','));
    }

    // Optional: Reassign LEDs that are significantly under-activated after processing
    const averageActivation =
      activationCountsSecondPass.reduce((sum, count) => sum + count, 0) / physicalLEDCount;
    const underActivatedLEDs = activationCountsSecondPass
      .map((count, idx) => ({ count, idx }))
      .filter(({ count }) => count < averageActivation * 0.8) // Threshold can be adjusted
      .map(({ idx }) => idx);

    if (underActivatedLEDs.length > 0) {
      // Reassign under-activated LEDs to different logical groups
      underActivatedLEDs.forEach((ledIndex) => {
        // Find a logical group to reassign from
        ['lows', 'mids', 'highs'].forEach((range) => {
          const groupIndex = ledAssignment[range].findIndex((group) =>
            group.includes(ledIndex)
          );
          if (groupIndex !== -1) {
            // Remove from current group
            ledAssignment[range][groupIndex] = ledAssignment[range][groupIndex].filter(
              (idx) => idx !== ledIndex
            );
            // Reassign to a random group
            const randomRange = Object.keys(ledAssignment)[
              Math.floor(Math.random() * 3)
            ] as keyof LEDAssignment;
            ledAssignment[randomRange].push([ledIndex]);
          }
        });
      });
    }

    const csvData = csvRows.join('\r\n');
    // console.log('CSV Data generated successfully.');
    return csvData;
  } catch (error) {
    console.error('Error processing audio:', error);
  }
};

const calculateBandEnergy = (
  amplitudeSpectrum: number[],
  minFreq: number,
  maxFreq: number,
  sampleRate: number,
  bufferSize: number
) => {
  const nyquist = sampleRate / 2;
  const startBin = Math.floor((minFreq / nyquist) * (bufferSize / 2));
  const endBin = Math.ceil((maxFreq / nyquist) * (bufferSize / 2));
  let energy = 0;
  for (let i = startBin; i <= endBin; i++) {
    energy += amplitudeSpectrum[i] ** 2;
  }
  return Math.sqrt(energy);
};
