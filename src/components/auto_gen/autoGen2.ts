// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import dataStore from '@/lib/data_store';
import Meyda, { MeydaFeaturesObject } from 'meyda';

// Clamp values to ensure erroneous values do not make it through
const clamp = (value: number, min = 0, max = 4095) => Math.min(Math.max(value, min), max);

// Frequency ranges for lows, mids, and highs
const FREQUENCY_RANGES = {
  lows: { min: 60, max: 250 },
  mids: { min: 250, max: 2000 },
  highs: { min: 2000, max: 20000 }
};

type NewFuncTestConfig = {
  ledIdx: number[][]; // Logical LED array
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
  sustainDuration?: number; // Number of frames to sustain peak brightness
  decayFactor?: number; // Rate at which LEDs decay after the sustain period
  effectProbability?: number; // Probability (0 to 1) for applyLightingEffect to be applied
  antiFlicker?: boolean; // Prevents flickering if true
};

export const autoGenerateGlyphs = async (
  config: NewFuncTestConfig
): Promise<string | undefined> => {
  const {
    ledIdx,
    ledFrequencyAssignment,
    amplitudeThreshold,
    frequencyThresholds,
    sustainDuration = 3, // Corresponds to approximately 16.666ms x 3
    decayFactor = 0.9,
    effectProbability = 0.45,
    antiFlicker = true
  } = config;
  const audioSrc: string | undefined = dataStore.get('audioSrc');

  if (!audioSrc) {
    console.error('Error: Audio source not provided, cannot auto-generate Glyphs.');
    return;
  }

  try {
    const response = await fetch(audioSrc);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // Using OfflineAudioContext
    const audioContext = new OfflineAudioContext(1, arrayBuffer.byteLength, 44100);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const bufferSize = 2048;
    const hopSize = Math.floor((16.666 / 1000) * sampleRate);

    // Meyda config
    Meyda.sampleRate = sampleRate;
    Meyda.bufferSize = bufferSize;
    Meyda.windowingFunction = 'hanning';

    const totalFrames = Math.floor((channelData.length - bufferSize) / hopSize) + 1;
    const physicalLEDCount = ledIdx.flat().length; // Total LED count
    let csvRows: string[] = [];

    // LED distribution for lows, mids, and highs
    const totalLeds = ledIdx.length;
    const defaultLedDistribution = {
      lows: Math.floor(totalLeds * 0.3),
      mids: Math.floor(totalLeds * 0.4),
      highs: totalLeds - Math.floor(totalLeds * 0.3) - Math.floor(totalLeds * 0.4)
    };
    const ledDistribution = { ...defaultLedDistribution, ...ledFrequencyAssignment };

    // Assign LEDs to each frequency range
    const ledAssignment = {
      lows: ledIdx.slice(0, ledDistribution.lows),
      mids: ledIdx.slice(ledDistribution.lows, ledDistribution.lows + ledDistribution.mids),
      highs: ledIdx.slice(ledDistribution.lows + ledDistribution.mids)
    };

    // Determine sub-bands for each frequency range
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

    // Initialize the sustain and decay states for each LED
    const ledSustainCounters = new Array(physicalLEDCount).fill(0);
    const ledCurrentBrightness = new Array(physicalLEDCount).fill(0);

    // First pass: Compute average energy in each frequency range and auto-compute amplitude threshold
    let totalAmplitude = 0;
    let amplitudeSampleCount = 0;
    const averageEnergies = { lows: 0, mids: 0, highs: 0 };
    const energyCounts = { lows: 0, mids: 0, highs: 0 };
    const peakFrames: number[] = []; // Store frames with peaks
    const sequentialBeats: number[] = []; // Store frames where sequential beats are detected

    for (let frame = 0; frame < totalFrames; frame++) {
      const startIdx = frame * hopSize;
      const endIdx = startIdx + bufferSize;
      if (endIdx > channelData.length) break;

      const signal = channelData.slice(startIdx, endIdx);
      const features: Partial<MeydaFeaturesObject> | null = Meyda.extract(
        ['amplitudeSpectrum', 'loudness', 'rms'],
        signal
      );

      if (features && features.amplitudeSpectrum && features.loudness && features.rms) {
        totalAmplitude += features.loudness.total;
        amplitudeSampleCount++;

        // Detect peaks using RMS
        if (features.rms > 0.5) {
          peakFrames.push(frame);

          // Check for sequential beats
          if (peakFrames.length > 1 && frame - peakFrames[peakFrames.length - 2] < 10) {
            sequentialBeats.push(frame);
          }
        }

        ['lows', 'mids', 'highs'].forEach((range) => {
          ledAssignment[range].forEach((_, i) => {
            const band = subBands[range][i];
            const bandEnergy = calculateBandEnergy(
              features.amplitudeSpectrum,
              band.min,
              band.max,
              sampleRate,
              bufferSize
            );
            averageEnergies[range] += bandEnergy;
            energyCounts[range]++;
          });
        });
      }
    }

    // Compute adaptive amplitude threshold if not provided
    const computedAmplitudeThreshold = (totalAmplitude / amplitudeSampleCount) * 0.7;
    const finalAmplitudeThreshold = amplitudeThreshold ?? computedAmplitudeThreshold;

    // Compute adaptive thresholds for each range
    const computedThresholds = {
      lows: (averageEnergies.lows / energyCounts.lows) * 0.8,
      mids: (averageEnergies.mids / energyCounts.mids) * 0.8,
      highs: (averageEnergies.highs / energyCounts.highs) * 0.8
    };

    // Merge computed thresholds with provided overrides
    const finalThresholds = {
      lows: frequencyThresholds?.lows ?? computedThresholds.lows,
      mids: frequencyThresholds?.mids ?? computedThresholds.mids,
      highs: frequencyThresholds?.highs ?? computedThresholds.highs
    };

    // Second pass: Generate the initial CSV data with LED activations
    const ledActivationData: number[][] = [];
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

        // Check if loudness is below the global amplitude threshold
        if (loudness < finalAmplitudeThreshold) {
          ledActivationData.push(physicalLEDBrightness);
          continue;
        }

        // Process lows, mids, and highs separately
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

            // Only turn on the LED if band energy exceeds its specific threshold
            if (bandEnergy > finalThresholds[range]) {
              const brightness = clamp(Math.floor((bandEnergy / loudness) * 4095));
              ledGroup.forEach((ledIndex) => {
                if (antiFlicker && ledSustainCounters[ledIndex] > 0) {
                  return;
                }
                ledSustainCounters[ledIndex] = sustainDuration;
                ledCurrentBrightness[ledIndex] = brightness;
                physicalLEDBrightness[ledIndex] = brightness;
              });
            }
          });
        });

        // Apply decay and sustain to LEDs not triggered in this frame
        for (let i = 0; i < physicalLEDCount; i++) {
          if (ledSustainCounters[i] > 0) {
            ledSustainCounters[i]--;
          } else {
            ledCurrentBrightness[i] *= decayFactor;
          }
          physicalLEDBrightness[i] = clamp(Math.floor(ledCurrentBrightness[i]));
        }
      }

      ledActivationData.push(physicalLEDBrightness);
    }

    // Third pass: Apply lighting effects for high activation segments and sequential beats
    const highActivationThreshold = Math.floor(physicalLEDCount * 0.7);
    let inHighActivationSegment = false;
    let segmentStartFrame = 0;

    ledActivationData.forEach((ledData, frame) => {
      const activeLEDs = ledData.filter((brightness) => brightness > 0).length;

      if (activeLEDs >= highActivationThreshold || sequentialBeats.includes(frame)) {
        if (!inHighActivationSegment) {
          inHighActivationSegment = true;
          segmentStartFrame = frame;
        }
      } else {
        if (inHighActivationSegment) {
          inHighActivationSegment = false;
          const segmentEndFrame = frame;
          const startTime = (segmentStartFrame * hopSize) / sampleRate;

          // Apply a random effect to the segment, based on the probability factor
          if (Math.random() < effectProbability) {
            const effect = Math.floor(Math.random() * 10); // Now includes more effects
            applyLightingEffect(
              ledActivationData,
              segmentStartFrame,
              segmentEndFrame,
              effect,
              peakFrames
            );
            console.log(
              `Debug Info: Fancy effect applied at timestamp: ${startTime.toFixed(2)}s :: ${effect}`
            );
          }
        }
      }
    });

    // Convert the final activation data to CSV
    csvRows = ledActivationData.map((ledData) => ledData.join(','));
    const csvData = csvRows.join(',\r\n');
    return csvData;
  } catch (error) {
    console.error('Error processing audio:', error);
  }
};

// Calculate the energy of a specific frequency band
const calculateBandEnergy = (
  amplitudeSpectrum: Float32Array | undefined,
  minFreq: number,
  maxFreq: number,
  sampleRate: number,
  bufferSize: number
): number => {
  const nyquist = sampleRate / 2;
  const startBin = Math.floor((minFreq / nyquist) * (bufferSize / 2));
  const endBin = Math.ceil((maxFreq / nyquist) * (bufferSize / 2));
  let energy = 0;
  for (let i = startBin; i <= endBin; i++) {
    energy += amplitudeSpectrum[i] ** 2;
  }
  return Math.sqrt(energy);
};

// Apply a lighting effect to a segment with tempo consideration
const applyLightingEffect = (
  ledActivationData: number[][],
  startFrame: number,
  endFrame: number,
  effectType: number,
  peakFrames: number[]
): void => {
  const totalFrames = endFrame - startFrame;
  const peakInterval = peakFrames.length > 1 ? peakFrames[1] - peakFrames[0] : 1;
  const effectStepInterval = Math.max(1, Math.floor(peakInterval / totalFrames)); // Sync effect steps with peaks

  let effectFrameCount = 0;

  switch (effectType) {
    case 0: // Ripple
      for (let frame = startFrame; frame < endFrame; frame += effectStepInterval) {
        const mid = Math.floor(ledActivationData[0].length / 2);
        const step = Math.floor(((effectFrameCount * effectStepInterval) / totalFrames) * mid);
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          Math.abs(mid - i) === step ? 4095 : brightness * 0.5
        );
        effectFrameCount++;
      }
      break;
    case 1: // Inverse Ripple
      for (let frame = startFrame; frame < endFrame; frame += effectStepInterval) {
        const mid = Math.floor(ledActivationData[0].length / 2);
        const step =
          mid - Math.floor(((effectFrameCount * effectStepInterval) / totalFrames) * mid);
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          Math.abs(mid - i) === step ? 4095 : brightness * 0.5
        );
        effectFrameCount++;
      }
      break;
    case 2: // Wave Flow
      for (let frame = startFrame; frame < endFrame; frame++) {
        const step = Math.floor(((frame - startFrame) / totalFrames) * ledActivationData[0].length);
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          i === step ? 4095 : brightness * 0.5
        );
      }
      break;
    case 3: // Meteor
      for (let frame = startFrame; frame < endFrame; frame++) {
        const meteorLength = 5;
        const position = Math.floor(
          ((frame - startFrame) / totalFrames) * (ledActivationData[0].length + meteorLength)
        );
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          i >= position && i < position + meteorLength ? 4095 : brightness * 0.5
        );
      }
      break;
    case 4: // Bouncing Ball
      for (let frame = startFrame; frame < endFrame; frame += effectStepInterval) {
        const ballPosition = Math.abs(((frame - startFrame) % (2 * totalFrames)) - totalFrames);
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          i === ballPosition ? 4095 : brightness * 0.5
        );
      }
      break;
    case 5: // Random Sparkle
      for (let frame = startFrame; frame < endFrame; frame++) {
        ledActivationData[frame] = ledActivationData[frame].map((brightness) =>
          Math.random() < 0.1 ? 4095 : brightness * 0.5
        );
      }
      break;
    case 6: // Reverse Chase
      for (let frame = startFrame; frame < endFrame; frame++) {
        const step =
          ledActivationData[0].length -
          Math.floor(((frame - startFrame) / totalFrames) * ledActivationData[0].length) -
          1;
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          i === step ? 4095 : brightness * 0.5
        );
      }
      break;
    case 7: // Flash Expand
      for (let frame = startFrame; frame < endFrame; frame++) {
        const step = Math.floor(
          ((frame - startFrame) / totalFrames) * (ledActivationData[0].length / 2)
        );
        const mid = Math.floor(ledActivationData[0].length / 2);
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          Math.abs(mid - i) <= step ? 4095 : brightness * 0.5
        );
      }
      break;
    case 8: // Sequential
      for (let frame = startFrame; frame < endFrame; frame++) {
        const step = Math.floor(((frame - startFrame) / totalFrames) * ledActivationData[0].length);
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          i === step ? 4095 : ledActivationData[frame][i]
        );
      }
      break;
    case 9: // Reverse Sequential
      for (let frame = startFrame; frame < endFrame; frame++) {
        const step =
          ledActivationData[0].length -
          Math.floor(((frame - startFrame) / totalFrames) * ledActivationData[0].length) -
          1;
        ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
          i === step ? 4095 : ledActivationData[frame][i]
        );
      }
      break;
    default:
      break;
  }
};
