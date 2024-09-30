/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import dataStore from '@/lib/data_store';
import Meyda, { MeydaFeaturesObject } from 'meyda';

// Constants and Utility Functions
const clamp = (value: number, min = 0, max = 4095) => Math.min(Math.max(value, min), max);
const easeOutQuad = (t: number) => t * (2 - t);
const FREQUENCY_RANGES = { lows: { min: 60, max: 250 }, mids: { min: 250, max: 2000 }, highs: { min: 2000, max: 20000 } };


type NewFuncTestConfig = {
  ledIdx: number[][],
  ledFrequencyAssignment?: { lows?: number, mids?: number, highs?: number },
  amplitudeThreshold?: number,
  frequencyThresholds?: { lows?: number, mids?: number, highs?: number },
  sustainDuration?: number,
  decayFactor?: number,
  antiFlicker?: boolean,
  maxEffectDuration?: number,
  maxActiveLEDs?: number
};

export const autoGenerateGlyphs = async (config: NewFuncTestConfig): Promise<string | undefined> => {
  const { ledIdx, ledFrequencyAssignment, amplitudeThreshold, frequencyThresholds, sustainDuration = 3, decayFactor = 0.9, antiFlicker = true, maxEffectDuration = 3, maxActiveLEDs = Math.floor(ledIdx.length / 2) } = config;
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
    const hopSize = Math.floor((16.666 / 1000) * sampleRate);
    Meyda.sampleRate = sampleRate; Meyda.bufferSize = bufferSize; Meyda.windowingFunction = 'hanning';

    const totalFrames = Math.floor((channelData.length - bufferSize) / hopSize) + 1;
    const physicalLEDCount = ledIdx.flat().length;
    const ledSustainCounters = new Array(physicalLEDCount).fill(0);
    const ledCurrentBrightness = new Array(physicalLEDCount).fill(0);
    let csvRows: string[] = [];

    // LED Assignment
    const totalLeds = ledIdx.length;
    const defaultLedDistribution = { lows: Math.floor(totalLeds * 0.3), mids: Math.floor(totalLeds * 0.4), highs: totalLeds - Math.floor(totalLeds * 0.3) - Math.floor(totalLeds * 0.4) };
    const ledDistribution = { ...defaultLedDistribution, ...ledFrequencyAssignment };
    const ledAssignment = { lows: ledIdx.slice(0, ledDistribution.lows), mids: ledIdx.slice(ledDistribution.lows, ledDistribution.lows + ledDistribution.mids), highs: ledIdx.slice(ledDistribution.lows + ledDistribution.mids) };
    const subBands = {
      lows: computeSubBands(ledAssignment.lows, FREQUENCY_RANGES.lows),
      mids: computeSubBands(ledAssignment.mids, FREQUENCY_RANGES.mids),
      highs: computeSubBands(ledAssignment.highs, FREQUENCY_RANGES.highs)
    };

    // First Pass: Energy Calculation
    const { totalAmplitude, peakFrames, sequentialBeats, averageEnergies, energyCounts, tempo } = firstPass(channelData, totalFrames, hopSize, bufferSize, sampleRate, ledAssignment, subBands);
    const finalAmplitudeThreshold = amplitudeThreshold ?? (totalAmplitude / totalFrames) * 0.7;
    const finalThresholds = mergeThresholds(frequencyThresholds, averageEnergies, energyCounts);

    // Second Pass: LED Activation
    const ledActivationData = secondPass(channelData, totalFrames, hopSize, bufferSize, sampleRate, finalAmplitudeThreshold, ledAssignment, subBands, finalThresholds, sustainDuration, decayFactor, antiFlicker, ledCurrentBrightness, ledSustainCounters, physicalLEDCount, maxActiveLEDs);

    // Third Pass: Apply Effects
    applyGlobalEffects(ledActivationData, totalFrames, hopSize, sampleRate, peakFrames, sequentialBeats, maxEffectDuration, tempo);

    // Convert to CSV
    csvRows = ledActivationData.map(ledData => ledData.join(','));
    return csvRows.join(',\r\n');
  } catch (error) {
    console.error('Error processing audio:', error);
  }
};

// Helper Functions

// Compute Sub-Bands for each frequency range
const computeSubBands = (ledGroup: number[][], range: { min: number, max: number }) => {
  return Array(ledGroup.length).fill(0).map((_, i) => ({
    min: range.min + (i * (range.max - range.min)) / ledGroup.length,
    max: range.min + ((i + 1) * (range.max - range.min)) / ledGroup.length
  }));
};

// First Pass: Analyze audio for amplitude, peaks, sequential beats, and tempo
const firstPass = (channelData: Float32Array, totalFrames: number, hopSize: number, bufferSize: number, sampleRate: number, ledAssignment: any, subBands: any) => {
  let totalAmplitude = 0;
  const peakFrames = [];
  const sequentialBeats = [];
  const averageEnergies = { lows: 0, mids: 0, highs: 0 };
  const energyCounts = { lows: 0, mids: 0, highs: 0 };
  let tempo = 120; // Default tempo, will be adjusted based on analysis

  for (let frame = 0; frame < totalFrames; frame++) {
    const signal = getSignal(channelData, frame, hopSize, bufferSize);
    const features = Meyda.extract(['amplitudeSpectrum', 'loudness', 'rms', 'zcr'], signal);
    if (features && features.amplitudeSpectrum && features.loudness && features.rms) {
      totalAmplitude += features.loudness.total;
      if (features.rms > 0.5) peakFrames.push(frame);
      if (peakFrames.length > 1 && frame - peakFrames[peakFrames.length - 2] < 10) sequentialBeats.push(frame);

      // Calculate tempo using zero-crossing rate (ZCR) as a proxy
      tempo = features.zcr * 240; // Adjust based on desired scaling
      ['lows', 'mids', 'highs'].forEach(range => updateAverageEnergies(features, range, ledAssignment, subBands, averageEnergies, energyCounts, sampleRate, bufferSize));
    }
  }
  return { totalAmplitude, peakFrames, sequentialBeats, averageEnergies, energyCounts, tempo };
};

// Second Pass: Determine LED Activation
const secondPass = (channelData: Float32Array, totalFrames: number, hopSize: number, bufferSize: number, sampleRate: number, finalAmplitudeThreshold: number, ledAssignment: any, subBands: any, finalThresholds: any, sustainDuration: number, decayFactor: number, antiFlicker: boolean, ledCurrentBrightness: number[], ledSustainCounters: number[], physicalLEDCount: number, maxActiveLEDs: number) => {
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
      ['lows', 'mids', 'highs'].forEach(range => {
        ledAssignment[range].forEach((ledGroup: number[], i: number) => {
          if (activeLEDCount >= maxActiveLEDs) return; // Enforce LED limit

          const band = subBands[range][i];
          const bandEnergy = calculateBandEnergy(features.amplitudeSpectrum, band.min, band.max, sampleRate, bufferSize);
          if (bandEnergy > finalThresholds[range]) {
            activeLEDCount += updateLEDBrightness(ledGroup, bandEnergy, loudness, antiFlicker, ledSustainCounters, sustainDuration, ledCurrentBrightness, physicalLEDBrightness);
          }
        });
      });

      applyDecay(ledCurrentBrightness, ledSustainCounters, physicalLEDBrightness, decayFactor);
    }
    ledActivationData.push(physicalLEDBrightness);
  }
  return ledActivationData;
};

// Third Pass: Apply global and local lighting effects
const applyGlobalEffects = (ledActivationData: number[][], totalFrames: number, hopSize: number, sampleRate: number, peakFrames: number[], sequentialBeats: number[], maxEffectDuration: number, tempo: number) => {
  let inHighActivationSegment = false, segmentStartFrame = 0;
  const highActivationThreshold = Math.floor(ledActivationData[0].length * 0.7);
  const maxFrames = Math.min(maxEffectDuration * sampleRate / hopSize, totalFrames);

  ledActivationData.forEach((ledData, frame) => {
    const activeLEDs = ledData.filter(brightness => brightness > 0).length;
    if (activeLEDs >= highActivationThreshold || sequentialBeats.includes(frame)) {
      if (!inHighActivationSegment) {
        inHighActivationSegment = true;
        segmentStartFrame = frame;
      }
    } else {
      if (inHighActivationSegment) {
        inHighActivationSegment = false;
        const segmentEndFrame = Math.min(segmentStartFrame + maxFrames, frame);
        applyLightingEffect(ledActivationData, segmentStartFrame, segmentEndFrame, Math.floor(Math.random() * 10), peakFrames, tempo);
        applyGlobalLightingEffect(ledActivationData, segmentStartFrame, segmentEndFrame, peakFrames, tempo);
      }
    }
  });
};

// Helper Functions
const getSignal = (channelData: Float32Array, frame: number, hopSize: number, bufferSize: number) => channelData.slice(frame * hopSize, frame * hopSize + bufferSize);
const updateAverageEnergies = (features: Partial<MeydaFeaturesObject>, range: string, ledAssignment: any, subBands: any, averageEnergies: any, energyCounts: any, sampleRate: number, bufferSize: number) => {
  ledAssignment[range].forEach((_: any, i: number) => {
    const band = subBands[range][i];
    const bandEnergy = calculateBandEnergy(features.amplitudeSpectrum, band.min, band.max, sampleRate, bufferSize);
    averageEnergies[range] += bandEnergy;
    energyCounts[range]++;
  });
};
const mergeThresholds = (frequencyThresholds: any, averageEnergies: any, energyCounts: any) => ({
  lows: frequencyThresholds?.lows ?? (averageEnergies.lows / energyCounts.lows) * 0.8,
  mids: frequencyThresholds?.mids ?? (averageEnergies.mids / energyCounts.mids) * 0.8,
  highs: frequencyThresholds?.highs ?? (averageEnergies.highs / energyCounts.highs) * 0.8
});
const updateLEDBrightness = (ledGroup: number[], bandEnergy: number, loudness: number, antiFlicker: boolean, ledSustainCounters: number[], sustainDuration: number, ledCurrentBrightness: number[], physicalLEDBrightness: number[]) => {
  const brightness = clamp(Math.floor((bandEnergy / loudness) * 4095));
  let activatedLEDs = 0;
  ledGroup.forEach(ledIndex => {
    if (antiFlicker && ledSustainCounters[ledIndex] > 0) return;
    ledSustainCounters[ledIndex] = sustainDuration;
    ledCurrentBrightness[ledIndex] = brightness;
    physicalLEDBrightness[ledIndex] = brightness;
    activatedLEDs++;
  });
  return activatedLEDs;
};
const applyDecay = (ledCurrentBrightness: number[], ledSustainCounters: number[], physicalLEDBrightness: number[], decayFactor: number) => {
  for (let i = 0; i < ledCurrentBrightness.length; i++) {
    if (ledSustainCounters[i] > 0) ledSustainCounters[i]--;
    else ledCurrentBrightness[i] *= decayFactor;
    physicalLEDBrightness[i] = clamp(Math.floor(ledCurrentBrightness[i]));
  }
};
const calculateBandEnergy = (amplitudeSpectrum: Float32Array | undefined, minFreq: number, maxFreq: number, sampleRate: number, bufferSize: number): number => {
  const nyquist = sampleRate / 2;
  const startBin = Math.floor((minFreq / nyquist) * (bufferSize / 2));
  const endBin = Math.ceil((maxFreq / nyquist) * (bufferSize / 2));
  let energy = 0;
  for (let i = startBin; i <= endBin; i++) energy += amplitudeSpectrum[i] ** 2;
  return Math.sqrt(energy);
};

// Apply Local Lighting Effect
const applyLightingEffect = (ledActivationData: number[][], startFrame: number, endFrame: number, effectType: number, peakFrames: number[], tempo: number) => {
  const totalFrames = endFrame - startFrame;
  const peakInterval = peakFrames.length > 1 ? peakFrames[1] - peakFrames[0] : 1;
  const effectStepInterval = Math.max(1, Math.floor(peakInterval / (totalFrames / (tempo / 60))));
  let effectFrameCount = 0;

  for (let frame = startFrame; frame < endFrame; frame += effectStepInterval) {
    const step = Math.floor(((effectFrameCount * effectStepInterval) / totalFrames) * ledActivationData[0].length);
    ledActivationData[frame] = ledActivationData[frame].map((brightness, i) =>
      (effectType === 0 && Math.abs(Math.floor(ledActivationData[0].length / 2) - i) === step) || // Ripple
      (effectType === 1 && step === i) || // Sequential
      (effectType === 2 && step === ledActivationData[0].length - 1 - i) ? 4095 : brightness * easeOutQuad(0.5)
    );
    effectFrameCount++;
  }
};

// Apply Global Lighting Effects
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const applyGlobalLightingEffect = (ledActivationData: number[][], startFrame: number, endFrame: number, peakFrames: number[], tempo: number) => {
  // Example of global sequential effect
  for (let frame = startFrame; frame < endFrame; frame++) {
    const step = Math.floor(((frame - startFrame) / (endFrame - startFrame)) * ledActivationData[0].length);
    ledActivationData[frame] = ledActivationData[frame].map((brightness, i) => (i === step ? 4095 : brightness * easeOutQuad(0.5)));
  }
};
