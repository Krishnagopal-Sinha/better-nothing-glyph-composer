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
};

export const newFuncTest = async (config: NewFuncTestConfig): Promise<string | undefined> => {
  const { ledIdx, ledFrequencyAssignment, amplitudeThreshold, frequencyThresholds } = config;
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
    const hopSize = Math.floor((16.666 / 1000) * sampleRate);

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

    const ledAssignment = {
      lows: ledIdx.slice(0, ledDistribution.lows),
      mids: ledIdx.slice(ledDistribution.lows, ledDistribution.lows + ledDistribution.mids),
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

    let totalAmplitude = 0;
    let amplitudeSampleCount = 0;
    const averageEnergies = { lows: 0, mids: 0, highs: 0 };
    const energyCounts = { lows: 0, mids: 0, highs: 0 };

    for (let frame = 0; frame < totalFrames; frame++) {
      const startIdx = frame * hopSize;
      const endIdx = startIdx + bufferSize;
      if (endIdx > channelData.length) break;

      const signal = channelData.slice(startIdx, endIdx);
      const features: Partial<MeydaFeaturesObject> | null = Meyda.extract(
        ['amplitudeSpectrum', 'loudness'],
        signal
      );

      if (features && features.amplitudeSpectrum && features.loudness) {
        totalAmplitude += features.loudness.total;
        amplitudeSampleCount++;

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

    const computedAmplitudeThreshold = totalAmplitude / amplitudeSampleCount;
    const finalAmplitudeThreshold = amplitudeThreshold ?? computedAmplitudeThreshold;

    const computedThresholds = {
      lows: averageEnergies.lows / energyCounts.lows,
      mids: averageEnergies.mids / energyCounts.mids,
      highs: averageEnergies.highs / energyCounts.highs
    };

    const finalThresholds = {
      lows: frequencyThresholds?.lows ?? computedThresholds.lows,
      mids: frequencyThresholds?.mids ?? computedThresholds.mids,
      highs: frequencyThresholds?.highs ?? computedThresholds.highs
    };

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

        if (loudness < finalAmplitudeThreshold) {
          csvRows.push(physicalLEDBrightness.join(','));
          continue;
        }

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

            if (bandEnergy > finalThresholds[range]) {
              const brightness = clamp(Math.floor((bandEnergy / loudness) * 4095));
              ledGroup.forEach((ledIndex: number) => {
                physicalLEDBrightness[ledIndex] = brightness;
              });
            }
          });
        });
      }

      csvRows.push(physicalLEDBrightness.join(','));
    }

    const csvData = csvRows.join(',\r\n');
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
