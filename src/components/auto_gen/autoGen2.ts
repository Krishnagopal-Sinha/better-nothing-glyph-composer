/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import dataStore from '@/lib/data_store';
import Meyda, { MeydaFeaturesObject } from 'meyda';

// Constants and Utility Functions
const clamp = (value: number, min = 0, max = 4095) => Math.min(Math.max(value, min), max);
const easeOutQuad = (t: number) => t * (2 - t);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const FREQUENCY_RANGES = {
  subBass: { min: 20, max: 60 },
  bass: { min: 60, max: 250 },
  lowMid: { min: 250, max: 500 },
  mid: { min: 500, max: 2000 },
  highMid: { min: 2000, max: 4000 },
  high: { min: 4000, max: 8000 },
  veryHigh: { min: 8000, max: 20000 }
};

// Enhanced configuration type
type NewFuncTestConfig = {
  ledIdx: number[][];
  ledFrequencyAssignment?: {
    subBass?: number;
    bass?: number;
    lowMid?: number;
    mid?: number;
    highMid?: number;
    high?: number;
    veryHigh?: number;
  };
  amplitudeThreshold?: number;
  frequencyThresholds?: {
    subBass?: number;
    bass?: number;
    lowMid?: number;
    mid?: number;
    highMid?: number;
    high?: number;
    veryHigh?: number;
  };
  sustainDuration?: number;
  decayFactor?: number;
  antiFlicker?: boolean;
  maxEffectDuration?: number;
  maxActiveLEDs?: number;
  beatSensitivity?: number;
  patternComplexity?: number;
  syncMode?: 'beat' | 'frequency' | 'hybrid';
};

export const autoGenerateGlyphsViaFrequency = async (
  config: NewFuncTestConfig
): Promise<string | undefined> => {
  const {
    ledIdx,
    ledFrequencyAssignment,
    amplitudeThreshold,
    frequencyThresholds,
    sustainDuration = 5,
    decayFactor = 0.85,
    antiFlicker = true,
    maxEffectDuration = 4,
    maxActiveLEDs = Math.floor(ledIdx.length * 0.8),
    beatSensitivity = 0.6,
    patternComplexity = 0.7,
    syncMode = 'frequency' // Force frequency-only mode
  } = config;

  const audioSrc: string | undefined = dataStore.get('audioSrc');
  if (!audioSrc) {
    console.error('Error: Audio source not provided, cannot auto-generate Glyphs.');
    return;
  }

  try {
    // Fetch and Decode Audio
    const response = await fetch(audioSrc);
    if (!response.ok) throw new Error(`Failed to fetch audio file: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new OfflineAudioContext(1, arrayBuffer.byteLength, 44100);
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const bufferSize = 2048;
    const hopSize = Math.floor((16.666 / 1000) * sampleRate); // 60fps equivalent
    Meyda.sampleRate = sampleRate;
    Meyda.bufferSize = bufferSize;
    Meyda.windowingFunction = 'hanning';

    const totalFrames = Math.floor((channelData.length - bufferSize) / hopSize) + 1;
    const physicalLEDCount = ledIdx.flat().length;
    const ledSustainCounters = new Array(physicalLEDCount).fill(0);
    const ledCurrentBrightness = new Array(physicalLEDCount).fill(0);

    // Enhanced LED Assignment with more frequency bands
    const totalLeds = ledIdx.length;
    const defaultLedDistribution = {
      subBass: Math.floor(totalLeds * 0.1),
      bass: Math.floor(totalLeds * 0.2),
      lowMid: Math.floor(totalLeds * 0.15),
      mid: Math.floor(totalLeds * 0.25),
      highMid: Math.floor(totalLeds * 0.15),
      high: Math.floor(totalLeds * 0.1),
      veryHigh: Math.floor(totalLeds * 0.05)
    };
    const ledDistribution = { ...defaultLedDistribution, ...ledFrequencyAssignment };

    // Calculate LED assignments for each frequency band
    let currentIndex = 0;
    const ledAssignment: any = {};

    // Assign LEDs to frequency bands
    Object.keys(ledDistribution).forEach((band) => {
      const count = ledDistribution[band as keyof typeof ledDistribution];
      if (count > 0 && currentIndex < totalLeds) {
        const endIndex = Math.min(currentIndex + count, totalLeds);
        ledAssignment[band] = ledIdx.slice(currentIndex, endIndex);
        currentIndex = endIndex;
      }
    });

    // Ensure all remaining LEDs are assigned to the last band
    if (currentIndex < totalLeds) {
      const remainingLeds = ledIdx.slice(currentIndex);
      if (remainingLeds.length > 0) {
        // Find the last band that has LEDs assigned
        const lastBand = Object.keys(ledAssignment).pop();
        if (lastBand) {
          ledAssignment[lastBand] = [...ledAssignment[lastBand], ...remainingLeds];
        } else {
          // If no bands were assigned, put all LEDs in the mid band
          ledAssignment.mid = remainingLeds;
        }
      }
    }

    // Ensure all frequency bands have sub-bands computed
    const subBands = {};
    Object.keys(FREQUENCY_RANGES).forEach((band) => {
      if (ledAssignment[band] && ledAssignment[band].length > 0) {
        subBands[band] = computeSubBands(
          ledAssignment[band],
          FREQUENCY_RANGES[band as keyof typeof FREQUENCY_RANGES]
        );
      }
    });

    // Frequency-only First Pass: Basic Audio Analysis
    const analysisResult = frequencyFirstPass(
      channelData,
      totalFrames,
      hopSize,
      bufferSize,
      sampleRate,
      ledAssignment,
      subBands
    );

    const { totalAmplitude, averageEnergies, energyCounts } = analysisResult;

    const finalAmplitudeThreshold = amplitudeThreshold ?? (totalAmplitude / totalFrames) * 0.6;
    const finalThresholds = mergeThresholds(frequencyThresholds, averageEnergies, energyCounts);

    // Frequency-only Second Pass: Pure Frequency-based LED Activation
    const ledActivationData = frequencySecondPass(
      channelData,
      totalFrames,
      hopSize,
      bufferSize,
      sampleRate,
      finalAmplitudeThreshold,
      ledAssignment,
      subBands,
      finalThresholds,
      sustainDuration,
      decayFactor,
      antiFlicker,
      ledCurrentBrightness,
      ledSustainCounters,
      physicalLEDCount,
      maxActiveLEDs,
      ledIdx
    );

    // Convert to CSV format
    const csvRows = ledActivationData.map((ledData) => ledData.join(','));
    return csvRows.join(',\r\n');
  } catch (error) {
    console.error('Error processing audio:', error);
  }
};

// Frequency-only First Pass: Basic Audio Analysis
const frequencyFirstPass = (
  channelData: Float32Array,
  totalFrames: number,
  hopSize: number,
  bufferSize: number,
  sampleRate: number,
  ledAssignment: any,
  subBands: any
) => {
  let totalAmplitude = 0;
  const averageEnergies: any = {};
  const energyCounts: any = {};

  // Initialize energy tracking for all bands
  Object.keys(ledAssignment).forEach((band) => {
    averageEnergies[band] = 0;
    energyCounts[band] = 0;
  });

  for (let frame = 0; frame < totalFrames; frame++) {
    const signal = getSignal(channelData, frame, hopSize, bufferSize);
    const features = Meyda.extract(['amplitudeSpectrum', 'loudness'], signal);

    if (features && features.amplitudeSpectrum && features.loudness) {
      const loudness = features.loudness.total;
      totalAmplitude += loudness;

      // Update energy analysis for all frequency bands
      Object.keys(ledAssignment).forEach((band) => {
        updateAverageEnergies(
          features,
          band,
          ledAssignment,
          subBands,
          averageEnergies,
          energyCounts,
          sampleRate,
          bufferSize
        );
      });
    }
  }

  return { totalAmplitude, averageEnergies, energyCounts };
};

// Frequency-only Second Pass: Pure Frequency-based LED Activation
const frequencySecondPass = (
  channelData: Float32Array,
  totalFrames: number,
  hopSize: number,
  bufferSize: number,
  sampleRate: number,
  finalAmplitudeThreshold: number,
  ledAssignment: any,
  subBands: any,
  finalThresholds: any,
  sustainDuration: number,
  decayFactor: number,
  antiFlicker: boolean,
  ledCurrentBrightness: number[],
  ledSustainCounters: number[],
  physicalLEDCount: number,
  maxActiveLEDs: number,
  ledIdx: number[][]
) => {
  const ledActivationData: number[][] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    const signal = getSignal(channelData, frame, hopSize, bufferSize);
    const physicalLEDBrightness = new Array(physicalLEDCount).fill(0);
    const features = Meyda.extract(['amplitudeSpectrum', 'loudness'], signal);

    if (features && features.amplitudeSpectrum && features.loudness) {
      const loudness = features.loudness.total;

      if (loudness < finalAmplitudeThreshold) {
        ledActivationData.push(physicalLEDBrightness);
        continue;
      }

      let activeLEDCount = 0;

      // Pure frequency-based activation
      Object.keys(ledAssignment).forEach((band) => {
        ledAssignment[band].forEach((ledGroup: number[], i: number) => {
          if (activeLEDCount >= maxActiveLEDs) return;

          const frequencyBand = subBands[band][i];
          const bandEnergy = calculateBandEnergy(
            features.amplitudeSpectrum,
            frequencyBand.min,
            frequencyBand.max,
            sampleRate,
            bufferSize
          );

          if (bandEnergy > finalThresholds[band]) {
            activeLEDCount += updateLEDBrightnessFrequency(
              ledGroup,
              bandEnergy,
              loudness,
              antiFlicker,
              ledSustainCounters,
              sustainDuration,
              ledCurrentBrightness,
              physicalLEDBrightness
            );
          }
        });
      });

      // Fallback: Ensure all LEDs have a chance to be activated
      if (activeLEDCount < maxActiveLEDs) {
        const remainingCapacity = maxActiveLEDs - activeLEDCount;
        const allAssignedLeds = Object.values(ledAssignment).flat();
        const unassignedLeds = [];

        // Find LEDs that weren't assigned to any frequency band
        for (let i = 0; i < physicalLEDCount; i++) {
          const ledZone = ledIdx.find((zone) => zone.includes(i));
          if (ledZone && !allAssignedLeds.some((zone) => zone.includes(i))) {
            unassignedLeds.push([i]);
          }
        }

        // Activate some unassigned LEDs based on overall audio energy
        unassignedLeds.slice(0, remainingCapacity).forEach((ledGroup) => {
          const fallbackEnergy = loudness * 0.5; // Simple fallback energy
          activeLEDCount += updateLEDBrightnessFrequency(
            ledGroup,
            fallbackEnergy,
            loudness,
            antiFlicker,
            ledSustainCounters,
            sustainDuration,
            ledCurrentBrightness,
            physicalLEDBrightness
          );
        });
      }

      applyFrequencyDecay(
        ledCurrentBrightness,
        ledSustainCounters,
        physicalLEDBrightness,
        decayFactor
      );
    }
    ledActivationData.push(physicalLEDBrightness);
  }
  return ledActivationData;
};

// Frequency-only LED Brightness Update
const updateLEDBrightnessFrequency = (
  ledGroup: number[],
  bandEnergy: number,
  loudness: number,
  antiFlicker: boolean,
  ledSustainCounters: number[],
  sustainDuration: number,
  ledCurrentBrightness: number[],
  physicalLEDBrightness: number[]
) => {
  const brightness = clamp(Math.floor((bandEnergy / loudness) * 4095));
  let activatedLEDs = 0;

  ledGroup.forEach((ledIndex) => {
    if (antiFlicker && ledSustainCounters[ledIndex] > 0) return;

    ledSustainCounters[ledIndex] = sustainDuration;
    ledCurrentBrightness[ledIndex] = brightness;
    physicalLEDBrightness[ledIndex] = brightness;
    activatedLEDs++;
  });

  return activatedLEDs;
};

// Frequency-only Decay
const applyFrequencyDecay = (
  ledCurrentBrightness: number[],
  ledSustainCounters: number[],
  physicalLEDBrightness: number[],
  decayFactor: number
) => {
  for (let i = 0; i < ledCurrentBrightness.length; i++) {
    if (ledSustainCounters[i] > 0) {
      ledSustainCounters[i]--;
    } else {
      ledCurrentBrightness[i] *= decayFactor;
    }
    physicalLEDBrightness[i] = clamp(Math.floor(ledCurrentBrightness[i]));
  }
};

// Enhanced Helper Functions

// Compute Sub-Bands for each frequency range
const computeSubBands = (ledGroup: number[][], range: { min: number; max: number }) => {
  return Array(ledGroup.length)
    .fill(0)
    .map((_, i) => ({
      min: range.min + (i * (range.max - range.min)) / ledGroup.length,
      max: range.min + ((i + 1) * (range.max - range.min)) / ledGroup.length
    }));
};

// Helper Functions
const getSignal = (channelData: Float32Array, frame: number, hopSize: number, bufferSize: number) =>
  channelData.slice(frame * hopSize, frame * hopSize + bufferSize);

const updateAverageEnergies = (
  features: Partial<MeydaFeaturesObject>,
  range: string,
  ledAssignment: any,
  subBands: any,
  averageEnergies: any,
  energyCounts: any,
  sampleRate: number,
  bufferSize: number
) => {
  ledAssignment[range].forEach((_: any, i: number) => {
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
};

const mergeThresholds = (frequencyThresholds: any, averageEnergies: any, energyCounts: any) => {
  const thresholds: any = {};
  Object.keys(averageEnergies).forEach((band) => {
    thresholds[band] =
      frequencyThresholds?.[band] ?? (averageEnergies[band] / energyCounts[band]) * 0.7;
  });
  return thresholds;
};

const calculateBandEnergy = (
  amplitudeSpectrum: Float32Array | undefined,
  minFreq: number,
  maxFreq: number,
  sampleRate: number,
  bufferSize: number
): number => {
  if (!amplitudeSpectrum) return 0;

  const nyquist = sampleRate / 2;
  const startBin = Math.floor((minFreq / nyquist) * (bufferSize / 2));
  const endBin = Math.ceil((maxFreq / nyquist) * (bufferSize / 2));
  let energy = 0;

  for (let i = startBin; i <= endBin && i < amplitudeSpectrum.length; i++) {
    energy += amplitudeSpectrum[i] ** 2;
  }

  return Math.sqrt(energy);
};
