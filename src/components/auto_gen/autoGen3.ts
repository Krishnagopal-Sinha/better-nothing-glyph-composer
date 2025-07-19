/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import dataStore from '@/lib/data_store';
import Meyda, { MeydaFeaturesObject } from 'meyda';

// Constants and Utility Functions
const clamp = (value: number, min = 0, max = 4095) => Math.min(Math.max(value, min), max);
const easeOutQuad = (t: number) => t * (2 - t);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Pattern Types
type PatternType = 'wave' | 'spiral' | 'bounce' | 'pulse' | 'chase' | 'ripple';

// Pattern Configuration
type PatternConfig = {
  ledIdx: number[][];
  patternType?: PatternType;
  beatSensitivity?: number;
  patternSpeed?: number;
  patternComplexity?: number;
  brightnessMultiplier?: number;
  sustainDuration?: number;
  decayFactor?: number;
  antiFlicker?: boolean;
  maxActiveLEDs?: number;
  patternDirection?: 'forward' | 'backward' | 'alternating';
  patternLength?: number;
  beatThreshold?: number;
  energyThreshold?: number;
};

export const autoGenerateGlyphsViaPattern = async (
  config: PatternConfig
): Promise<string | undefined> => {
  const {
    ledIdx,
    patternType = 'wave',
    beatSensitivity = 0.7,
    patternSpeed = 1.0,
    patternComplexity = 0.6,
    brightnessMultiplier = 1.0,
    sustainDuration = 8,
    decayFactor = 0.9,
    antiFlicker = true,
    maxActiveLEDs = Math.floor(ledIdx.flat().length * 0.6),
    patternDirection = 'forward',
    patternLength = 4,
    beatThreshold = 0.5,
    energyThreshold = 0.3
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

    console.log(
      `Pattern generation: Processing ${totalFrames} frames for ${physicalLEDCount} LEDs`
    );

    // Beat Detection and Pattern Analysis
    const beatAnalysis = analyzeBeats(
      channelData,
      totalFrames,
      hopSize,
      bufferSize,
      sampleRate,
      beatSensitivity,
      beatThreshold
    );

    console.log(
      `Beat analysis: Found ${beatAnalysis.beats.length} beats, ${
        beatAnalysis.bassBeats.length
      } bass beats, ${
        beatAnalysis.noteEvents.length
      } note events, avg interval: ${beatAnalysis.averageBeatInterval.toFixed(2)}s`
    );

    // Pattern Generation
    const ledActivationData = generatePatternBasedLighting(
      channelData,
      totalFrames,
      hopSize,
      bufferSize,
      sampleRate,
      ledIdx,
      beatAnalysis,
      {
        patternType,
        patternSpeed,
        patternComplexity,
        brightnessMultiplier,
        sustainDuration,
        decayFactor,
        antiFlicker,
        maxActiveLEDs,
        patternDirection,
        patternLength,
        energyThreshold
      }
    );

    console.log(`Pattern generation: Generated ${ledActivationData.length} frames of LED data`);

    // Convert to CSV format
    const csvRows = ledActivationData.map((ledData) => ledData.join(','));
    return csvRows.join(',\r\n');
  } catch (error) {
    console.error('Error processing audio:', error);
    return undefined;
  }
};

// Beat Analysis
const analyzeBeats = (
  channelData: Float32Array,
  totalFrames: number,
  hopSize: number,
  bufferSize: number,
  sampleRate: number,
  beatSensitivity: number,
  beatThreshold: number
) => {
  const beats: number[] = [];
  const bassBeats: number[] = [];
  const noteEvents: number[] = [];
  const energyHistory: number[] = [];
  const bassHistory: number[] = [];
  const windowSize = Math.floor(sampleRate / 4); // 250ms window for beat detection
  const minBeatInterval = Math.floor(sampleRate / 8); // Minimum 125ms between beats

  for (let frame = 0; frame < totalFrames; frame++) {
    const signal = getSignal(channelData, frame, hopSize, bufferSize);
    const features = Meyda.extract(
      ['rms', 'spectralCentroid', 'spectralRolloff', 'spectralFlatness'],
      signal
    );

    if (features && features.rms) {
      const energy = features.rms;
      const bassEnergy = calculateBassEnergy(features, sampleRate, bufferSize);
      energyHistory.push(energy);
      bassHistory.push(bassEnergy);

      // Keep only recent history
      if (energyHistory.length > windowSize) {
        energyHistory.shift();
        bassHistory.shift();
      }

      // Beat detection using energy threshold and local maxima
      if (energyHistory.length >= windowSize) {
        const currentEnergy = energyHistory[energyHistory.length - 1];
        const currentBassEnergy = bassHistory[bassHistory.length - 1];
        const averageEnergy = energyHistory.reduce((sum, e) => sum + e, 0) / energyHistory.length;
        const averageBassEnergy = bassHistory.reduce((sum, e) => sum + e, 0) / bassHistory.length;

        const threshold = averageEnergy * beatThreshold * beatSensitivity;
        const bassThreshold = averageBassEnergy * beatThreshold * beatSensitivity * 0.8; // Bass is more sensitive

        // Check if current energy is a local maximum and above threshold
        if (currentEnergy > threshold && isLocalMaximum(energyHistory, energyHistory.length - 1)) {
          // Ensure minimum interval between beats
          const lastBeat = beats.length > 0 ? beats[beats.length - 1] : -minBeatInterval;
          if (frame - lastBeat >= minBeatInterval) {
            beats.push(frame);
          }
        }

        // Bass beat detection (more sensitive)
        if (
          currentBassEnergy > bassThreshold &&
          isLocalMaximum(bassHistory, bassHistory.length - 1)
        ) {
          const lastBassBeat =
            bassBeats.length > 0 ? bassBeats[bassBeats.length - 1] : -minBeatInterval;
          if (frame - lastBassBeat >= minBeatInterval) {
            bassBeats.push(frame);
          }
        }

        // Note detection using spectral features
        if (features.spectralFlatness && features.spectralCentroid) {
          const flatness = features.spectralFlatness;
          const centroid = features.spectralCentroid;

          // Detect note-like events (low flatness = more tonal)
          if (flatness < 0.3 && centroid > 1000 && currentEnergy > threshold * 0.7) {
            const lastNote =
              noteEvents.length > 0 ? noteEvents[noteEvents.length - 1] : -minBeatInterval;
            if (frame - lastNote >= minBeatInterval) {
              noteEvents.push(frame);
            }
          }
        }
      }
    }
  }

  // If no beats detected, create artificial beats based on tempo
  if (beats.length === 0) {
    const estimatedBPM = 120; // Default BPM
    const beatInterval = Math.floor(((60 / estimatedBPM) * sampleRate) / hopSize);
    for (let frame = beatInterval; frame < totalFrames; frame += beatInterval) {
      beats.push(frame);
    }
  }

  return {
    beats,
    bassBeats,
    noteEvents,
    totalBeats: beats.length,
    totalBassBeats: bassBeats.length,
    totalNoteEvents: noteEvents.length,
    averageBeatInterval:
      beats.length > 1 ? calculateAverageBeatInterval(beats, hopSize, sampleRate) : 0
  };
};

// Calculate bass energy (20-250 Hz)
const calculateBassEnergy = (features: any, sampleRate: number, bufferSize: number): number => {
  if (!features.amplitudeSpectrum) return 0;

  const nyquist = sampleRate / 2;
  const bassStartBin = Math.floor((20 / nyquist) * (bufferSize / 2));
  const bassEndBin = Math.ceil((250 / nyquist) * (bufferSize / 2));
  let bassEnergy = 0;

  for (let i = bassStartBin; i <= bassEndBin && i < features.amplitudeSpectrum.length; i++) {
    bassEnergy += features.amplitudeSpectrum[i] ** 2;
  }

  return Math.sqrt(bassEnergy);
};

// Calculate high frequency energy (2000-8000 Hz)
const calculateHighEnergy = (features: any, sampleRate: number, bufferSize: number): number => {
  if (!features.amplitudeSpectrum) return 0;

  const nyquist = sampleRate / 2;
  const highStartBin = Math.floor((2000 / nyquist) * (bufferSize / 2));
  const highEndBin = Math.ceil((8000 / nyquist) * (bufferSize / 2));
  let highEnergy = 0;

  for (let i = highStartBin; i <= highEndBin && i < features.amplitudeSpectrum.length; i++) {
    highEnergy += features.amplitudeSpectrum[i] ** 2;
  }

  return Math.sqrt(highEnergy);
};

// Select pattern based on audio characteristics
const selectPatternBasedOnAudio = (
  patternVariety: string[],
  bassRatio: number,
  highRatio: number,
  energyRatio: number,
  currentPattern: string
): string => {
  // Bass-heavy music -> Bounce and Pulse patterns
  if (bassRatio > 1.5) {
    return ['bounce', 'pulse'][Math.floor(Math.random() * 2)];
  }

  // High-frequency music -> Chase and Ripple patterns
  if (highRatio > 1.4) {
    return ['chase', 'ripple'][Math.floor(Math.random() * 2)];
  }

  // Balanced energy -> Wave and Spiral patterns
  if (energyRatio > 1.2 && Math.abs(bassRatio - highRatio) < 0.3) {
    return ['wave', 'spiral'][Math.floor(Math.random() * 2)];
  }

  // Random selection for variety
  const availablePatterns = patternVariety.filter((p) => p !== currentPattern);
  return availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
};

// Select zones based on audio frequency content
const selectZonesBasedOnAudio = (
  ledIdx: number[][],
  bassRatio: number,
  highRatio: number,
  energyRatio: number,
  patternPosition: number,
  totalZones: number
): number[] => {
  const selectedZones: number[] = [];

  // Bass-heavy -> activate lower zones
  if (bassRatio > 1.3) {
    const bassZoneCount = Math.floor(totalZones / 3);
    for (let i = 0; i < bassZoneCount; i++) {
      selectedZones.push(i);
    }
  }

  // High-frequency -> activate upper zones
  if (highRatio > 1.3) {
    const highZoneCount = Math.floor(totalZones / 3);
    for (let i = totalZones - highZoneCount; i < totalZones; i++) {
      if (!selectedZones.includes(i)) {
        selectedZones.push(i);
      }
    }
  }

  // Balanced energy -> activate middle zones
  if (energyRatio > 1.2 && Math.abs(bassRatio - highRatio) < 0.3) {
    const middleStart = Math.floor(totalZones / 3);
    const middleEnd = Math.floor((totalZones * 2) / 3);
    for (let i = middleStart; i < middleEnd; i++) {
      if (!selectedZones.includes(i)) {
        selectedZones.push(i);
      }
    }
  }

  // If no specific zones selected, use pattern position
  if (selectedZones.length === 0) {
    selectedZones.push(patternPosition % totalZones);
  }

  return selectedZones;
};

// Pattern-based Lighting Generation
const generatePatternBasedLighting = (
  channelData: Float32Array,
  totalFrames: number,
  hopSize: number,
  bufferSize: number,
  sampleRate: number,
  ledIdx: number[][],
  beatAnalysis: any,
  patternConfig: any
) => {
  const ledActivationData: number[][] = [];
  const physicalLEDCount = ledIdx.flat().length;
  const totalZones = ledIdx.length;
  const ledSustainCounters = new Array(physicalLEDCount).fill(0);
  const ledCurrentBrightness = new Array(physicalLEDCount).fill(0);

  let patternPosition = 0;
  let patternDirection = 1;
  let lastBeatFrame = -1;
  let lastBassBeatFrame = -1;
  let lastNoteFrame = -1;
  let frameCounter = 0;
  let patternChangeCounter = 0;
  let currentPatternType = patternConfig.patternType;
  const patternVariety = ['wave', 'spiral', 'bounce', 'pulse', 'chase', 'ripple'];
  const { antiFlicker, sustainDuration, maxActiveLEDs } = patternConfig;

  // Audio reactivity tracking
  const energyHistory: number[] = [];
  const bassEnergyHistory: number[] = [];
  const highEnergyHistory: number[] = [];
  const historyLength = 10;

  for (let frame = 0; frame < totalFrames; frame++) {
    const signal = getSignal(channelData, frame, hopSize, bufferSize);
    const features = Meyda.extract(
      ['rms', 'spectralCentroid', 'spectralFlatness', 'amplitudeSpectrum'],
      signal
    );
    const physicalLEDBrightness = new Array(physicalLEDCount).fill(0);

    if (features && features.rms) {
      const energy = features.rms;
      const bassEnergy = calculateBassEnergy(features, sampleRate, bufferSize);
      const highEnergy = calculateHighEnergy(features, sampleRate, bufferSize);

      // Track audio energy history for reactivity
      energyHistory.push(energy);
      bassEnergyHistory.push(bassEnergy);
      highEnergyHistory.push(highEnergy);

      if (energyHistory.length > historyLength) {
        energyHistory.shift();
        bassEnergyHistory.shift();
        highEnergyHistory.shift();
      }

      const isBeat = beatAnalysis.beats.includes(frame);
      const isBassBeat = beatAnalysis.bassBeats.includes(frame);
      const isNoteEvent = beatAnalysis.noteEvents.includes(frame);

      // Calculate audio reactivity metrics
      const avgEnergy = energyHistory.reduce((sum, e) => sum + e, 0) / energyHistory.length;
      const avgBassEnergy =
        bassEnergyHistory.reduce((sum, e) => sum + e, 0) / bassEnergyHistory.length;
      const avgHighEnergy =
        highEnergyHistory.reduce((sum, e) => sum + e, 0) / highEnergyHistory.length;

      const energyRatio = energy / Math.max(avgEnergy, 0.1);
      const bassRatio = bassEnergy / Math.max(avgBassEnergy, 0.1);
      const highRatio = highEnergy / Math.max(avgHighEnergy, 0.1);

      // Determine pattern progression based on audio events AND energy
      let shouldProgressPattern = false;
      let eventType = 'none';
      let audioIntensity = 0;

      if (isBassBeat && frame !== lastBassBeatFrame) {
        shouldProgressPattern = true;
        eventType = 'bass';
        audioIntensity = Math.min(bassRatio * 2, 3); // Bass beats get high intensity
        lastBassBeatFrame = frame;
      } else if (isBeat && frame !== lastBeatFrame) {
        shouldProgressPattern = true;
        eventType = 'beat';
        audioIntensity = Math.min(energyRatio * 1.5, 2.5);
        lastBeatFrame = frame;
      } else if (isNoteEvent && frame !== lastNoteFrame) {
        shouldProgressPattern = true;
        eventType = 'note';
        audioIntensity = Math.min(highRatio * 1.2, 2);
        lastNoteFrame = frame;
      } else {
        // Even without beats, react to energy changes
        if (energyRatio > 1.3 || bassRatio > 1.5 || highRatio > 1.4) {
          shouldProgressPattern = true;
          eventType = 'energy';
          audioIntensity = Math.min(Math.max(energyRatio, bassRatio, highRatio), 2);
        } else if (beatAnalysis.beats.length === 0 && beatAnalysis.bassBeats.length === 0) {
          // Fallback: use frame counter if no beats detected
          frameCounter++;
          if (frameCounter % Math.floor(sampleRate / (hopSize * 4)) === 0) {
            shouldProgressPattern = true;
            eventType = 'time';
            audioIntensity = 0.5;
          }
        }
      }

      // Update pattern position and add variety based on audio intensity
      if (shouldProgressPattern) {
        // Audio intensity affects pattern progression speed
        const progressionSpeed = Math.floor(audioIntensity);
        for (let i = 0; i < progressionSpeed; i++) {
          patternPosition = (patternPosition + 1) % patternConfig.patternLength;
        }

        patternChangeCounter++;

        // Change pattern type based on audio characteristics
        if (patternChangeCounter % (6 + Math.floor(audioIntensity * 2)) === 0) {
          const newPatternType = selectPatternBasedOnAudio(
            patternVariety,
            bassRatio,
            highRatio,
            energyRatio,
            currentPatternType
          );
          if (newPatternType !== currentPatternType) {
            currentPatternType = newPatternType;
            console.log(
              `Pattern changed to: ${currentPatternType} (bass: ${bassRatio.toFixed(
                2
              )}, high: ${highRatio.toFixed(2)}, energy: ${energyRatio.toFixed(2)})`
            );
          }
        }

        // Reverse direction based on audio energy
        if (patternChangeCounter % (3 + Math.floor(audioIntensity)) === 0) {
          patternDirection *= -1;
          console.log(
            `Direction reversed to: ${
              patternDirection > 0 ? 'forward' : 'backward'
            } (intensity: ${audioIntensity.toFixed(2)})`
          );
        }

        // Handle alternating direction
        if (patternConfig.patternDirection === 'alternating' && patternPosition === 0) {
          patternDirection *= -1;
        }
      }

      // Calculate brightness based on audio intensity and energy
      let brightnessMultiplier = 1.0;
      if (eventType === 'bass') {
        brightnessMultiplier = 1.5 + (bassRatio - 1) * 0.5; // Bass-responsive brightness
      } else if (eventType === 'beat') {
        brightnessMultiplier = 1.2 + (energyRatio - 1) * 0.3;
      } else if (eventType === 'note') {
        brightnessMultiplier = 1.0 + (highRatio - 1) * 0.4;
      } else if (eventType === 'energy') {
        brightnessMultiplier = 1.0 + audioIntensity * 0.5;
      } else {
        brightnessMultiplier = 0.8;
      }

      // Generate pattern with audio-reactive brightness
      const effectiveEnergy = Math.max(energy, 0.1);
      const brightness = clamp(
        Math.floor(
          effectiveEnergy * 4095 * brightnessMultiplier * patternConfig.brightnessMultiplier
        )
      );

      // Select zones based on audio frequency content
      const selectedZones = selectZonesBasedOnAudio(
        ledIdx,
        bassRatio,
        highRatio,
        energyRatio,
        patternPosition,
        totalZones
      );

      generateAudioReactivePattern(
        ledIdx,
        selectedZones,
        brightness,
        physicalLEDBrightness,
        ledSustainCounters,
        ledCurrentBrightness,
        antiFlicker,
        sustainDuration,
        maxActiveLEDs,
        currentPatternType,
        patternDirection,
        audioIntensity
      );

      // Fallback: Ensure all LEDs get activated occasionally, but only when energy is low
      if (patternChangeCounter % 20 === 0 && energyRatio < 0.8) {
        activateAllLEDs(
          ledIdx,
          Math.floor(brightness * 0.2),
          physicalLEDBrightness,
          ledSustainCounters,
          ledCurrentBrightness,
          sustainDuration
        );
      }

      // Apply decay
      applyPatternDecay(
        ledCurrentBrightness,
        ledSustainCounters,
        physicalLEDBrightness,
        patternConfig.decayFactor
      );
    }

    ledActivationData.push(physicalLEDBrightness);
  }

  return ledActivationData;
};

// Audio-reactive pattern generation
const generateAudioReactivePattern = (
  ledIdx: number[][],
  selectedZones: number[],
  brightness: number,
  physicalLEDBrightness: number[],
  ledSustainCounters: number[],
  ledCurrentBrightness: number[],
  antiFlicker: boolean,
  sustainDuration: number,
  maxActiveLEDs: number,
  patternType: string,
  direction: number,
  audioIntensity: number
) => {
  let activatedLEDs = 0;

  switch (patternType) {
    case 'wave':
      activatedLEDs = generateAudioReactiveWave(
        ledIdx,
        selectedZones,
        brightness,
        physicalLEDBrightness,
        ledSustainCounters,
        ledCurrentBrightness,
        antiFlicker,
        sustainDuration,
        maxActiveLEDs,
        activatedLEDs,
        audioIntensity
      );
      break;
    case 'spiral':
      activatedLEDs = generateAudioReactiveSpiral(
        ledIdx,
        selectedZones,
        brightness,
        physicalLEDBrightness,
        ledSustainCounters,
        ledCurrentBrightness,
        antiFlicker,
        sustainDuration,
        maxActiveLEDs,
        activatedLEDs,
        audioIntensity
      );
      break;
    case 'bounce':
      activatedLEDs = generateAudioReactiveBounce(
        ledIdx,
        selectedZones,
        brightness,
        physicalLEDBrightness,
        ledSustainCounters,
        ledCurrentBrightness,
        antiFlicker,
        sustainDuration,
        maxActiveLEDs,
        activatedLEDs,
        direction,
        audioIntensity
      );
      break;
    case 'pulse':
      activatedLEDs = generateAudioReactivePulse(
        ledIdx,
        selectedZones,
        brightness,
        physicalLEDBrightness,
        ledSustainCounters,
        ledCurrentBrightness,
        antiFlicker,
        sustainDuration,
        maxActiveLEDs,
        activatedLEDs,
        audioIntensity
      );
      break;
    case 'chase':
      activatedLEDs = generateAudioReactiveChase(
        ledIdx,
        selectedZones,
        brightness,
        physicalLEDBrightness,
        ledSustainCounters,
        ledCurrentBrightness,
        antiFlicker,
        sustainDuration,
        maxActiveLEDs,
        activatedLEDs,
        direction,
        audioIntensity
      );
      break;
    case 'ripple':
      activatedLEDs = generateAudioReactiveRipple(
        ledIdx,
        selectedZones,
        brightness,
        physicalLEDBrightness,
        ledSustainCounters,
        ledCurrentBrightness,
        antiFlicker,
        sustainDuration,
        maxActiveLEDs,
        activatedLEDs,
        audioIntensity
      );
      break;
    default:
      activatedLEDs = generateAudioReactiveWave(
        ledIdx,
        selectedZones,
        brightness,
        physicalLEDBrightness,
        ledSustainCounters,
        ledCurrentBrightness,
        antiFlicker,
        sustainDuration,
        maxActiveLEDs,
        activatedLEDs,
        audioIntensity
      );
  }
};

// Audio-reactive Wave Pattern
const generateAudioReactiveWave = (
  ledIdx: number[][],
  selectedZones: number[],
  brightness: number,
  physicalLEDBrightness: number[],
  ledSustainCounters: number[],
  ledCurrentBrightness: number[],
  antiFlicker: boolean,
  sustainDuration: number,
  maxActiveLEDs: number,
  activatedLEDs: number,
  audioIntensity: number
): number => {
  let currentActivatedLEDs = activatedLEDs;
  const waveWidth = Math.max(1, Math.floor(selectedZones.length / 2));

  // Audio intensity affects wave width
  const effectiveWaveWidth = Math.floor(waveWidth * (1 + audioIntensity * 0.5));

  for (let i = 0; i < effectiveWaveWidth && currentActivatedLEDs < maxActiveLEDs; i++) {
    const zoneIndex = selectedZones[i % selectedZones.length];
    const ledGroup = ledIdx[zoneIndex];

    if (ledGroup && (!antiFlicker || ledSustainCounters[ledGroup[0]] === 0)) {
      const zoneBrightness = Math.floor(brightness * (1 - i / effectiveWaveWidth));
      ledGroup.forEach((ledIndex) => {
        if (currentActivatedLEDs < maxActiveLEDs) {
          ledSustainCounters[ledIndex] = sustainDuration;
          ledCurrentBrightness[ledIndex] = zoneBrightness;
          physicalLEDBrightness[ledIndex] = zoneBrightness;
          currentActivatedLEDs++;
        }
      });
    }
  }

  return currentActivatedLEDs;
};

// Audio-reactive Spiral Pattern
const generateAudioReactiveSpiral = (
  ledIdx: number[][],
  selectedZones: number[],
  brightness: number,
  physicalLEDBrightness: number[],
  ledSustainCounters: number[],
  ledCurrentBrightness: number[],
  antiFlicker: boolean,
  sustainDuration: number,
  maxActiveLEDs: number,
  activatedLEDs: number,
  audioIntensity: number
): number => {
  let currentActivatedLEDs = activatedLEDs;
  const centerZone = Math.floor(selectedZones.length / 2);
  const spiralRadius = Math.floor(selectedZones.length / 2) + Math.floor(audioIntensity);

  for (let i = 0; i < selectedZones.length && currentActivatedLEDs < maxActiveLEDs; i++) {
    const distance = Math.abs(i - centerZone);
    if (distance <= spiralRadius) {
      const zoneIndex = selectedZones[i];
      const ledGroup = ledIdx[zoneIndex];

      if (ledGroup && (!antiFlicker || ledSustainCounters[ledGroup[0]] === 0)) {
        const fadeBrightness = Math.floor(brightness * (1 - distance / Math.max(spiralRadius, 1)));
        ledGroup.forEach((ledIndex) => {
          if (currentActivatedLEDs < maxActiveLEDs) {
            ledSustainCounters[ledIndex] = sustainDuration;
            ledCurrentBrightness[ledIndex] = fadeBrightness;
            physicalLEDBrightness[ledIndex] = fadeBrightness;
            currentActivatedLEDs++;
          }
        });
      }
    }
  }

  return currentActivatedLEDs;
};

// Audio-reactive Bounce Pattern
const generateAudioReactiveBounce = (
  ledIdx: number[][],
  selectedZones: number[],
  brightness: number,
  physicalLEDBrightness: number[],
  ledSustainCounters: number[],
  ledCurrentBrightness: number[],
  antiFlicker: boolean,
  sustainDuration: number,
  maxActiveLEDs: number,
  activatedLEDs: number,
  direction: number,
  audioIntensity: number
): number => {
  let currentActivatedLEDs = activatedLEDs;
  const bouncePosition = Math.floor(selectedZones.length / 2);
  const zoneIndex = selectedZones[bouncePosition % selectedZones.length];
  const ledGroup = ledIdx[zoneIndex];

  // Audio intensity affects bounce brightness
  const bounceBrightness = Math.floor(brightness * (1 + audioIntensity * 0.3));

  if (ledGroup && (!antiFlicker || ledSustainCounters[ledGroup[0]] === 0)) {
    ledGroup.forEach((ledIndex) => {
      if (currentActivatedLEDs < maxActiveLEDs) {
        ledSustainCounters[ledIndex] = sustainDuration;
        ledCurrentBrightness[ledIndex] = bounceBrightness;
        physicalLEDBrightness[ledIndex] = bounceBrightness;
        currentActivatedLEDs++;
      }
    });
  }

  return currentActivatedLEDs;
};

// Audio-reactive Pulse Pattern
const generateAudioReactivePulse = (
  ledIdx: number[][],
  selectedZones: number[],
  brightness: number,
  physicalLEDBrightness: number[],
  ledSustainCounters: number[],
  ledCurrentBrightness: number[],
  antiFlicker: boolean,
  sustainDuration: number,
  maxActiveLEDs: number,
  activatedLEDs: number,
  audioIntensity: number
): number => {
  let currentActivatedLEDs = activatedLEDs;

  // Audio intensity affects pulse intensity
  const pulseIntensity = Math.sin(audioIntensity * Math.PI);
  const pulseBrightness = Math.floor(brightness * Math.abs(pulseIntensity));

  for (let i = 0; i < selectedZones.length && currentActivatedLEDs < maxActiveLEDs; i++) {
    const zoneIndex = selectedZones[i];
    const ledGroup = ledIdx[zoneIndex];

    if (ledGroup) {
      ledGroup.forEach((ledIndex) => {
        if (currentActivatedLEDs < maxActiveLEDs) {
          ledSustainCounters[ledIndex] = sustainDuration;
          ledCurrentBrightness[ledIndex] = pulseBrightness;
          physicalLEDBrightness[ledIndex] = pulseBrightness;
          currentActivatedLEDs++;
        }
      });
    }
  }

  return currentActivatedLEDs;
};

// Audio-reactive Chase Pattern
const generateAudioReactiveChase = (
  ledIdx: number[][],
  selectedZones: number[],
  brightness: number,
  physicalLEDBrightness: number[],
  ledSustainCounters: number[],
  ledCurrentBrightness: number[],
  antiFlicker: boolean,
  sustainDuration: number,
  maxActiveLEDs: number,
  activatedLEDs: number,
  direction: number,
  audioIntensity: number
): number => {
  let currentActivatedLEDs = activatedLEDs;
  const chaseLength = Math.max(2, Math.floor(selectedZones.length * (1 + audioIntensity * 0.5)));

  for (let i = 0; i < chaseLength && currentActivatedLEDs < maxActiveLEDs; i++) {
    const zoneIndex = selectedZones[i % selectedZones.length];
    const ledGroup = ledIdx[zoneIndex];

    if (ledGroup && (!antiFlicker || ledSustainCounters[ledGroup[0]] === 0)) {
      const fadeBrightness = Math.floor(brightness * (1 - i / chaseLength));
      ledGroup.forEach((ledIndex) => {
        if (currentActivatedLEDs < maxActiveLEDs) {
          ledSustainCounters[ledIndex] = sustainDuration;
          ledCurrentBrightness[ledIndex] = fadeBrightness;
          physicalLEDBrightness[ledIndex] = fadeBrightness;
          currentActivatedLEDs++;
        }
      });
    }
  }

  return currentActivatedLEDs;
};

// Audio-reactive Ripple Pattern
const generateAudioReactiveRipple = (
  ledIdx: number[][],
  selectedZones: number[],
  brightness: number,
  physicalLEDBrightness: number[],
  ledSustainCounters: number[],
  ledCurrentBrightness: number[],
  antiFlicker: boolean,
  sustainDuration: number,
  maxActiveLEDs: number,
  activatedLEDs: number,
  audioIntensity: number
): number => {
  let currentActivatedLEDs = activatedLEDs;
  const maxRadius = Math.floor(selectedZones.length / 2);
  const rippleRadius = Math.floor(maxRadius * audioIntensity);

  // Create multiple ripples based on audio intensity
  const rippleCount = Math.max(1, Math.floor(audioIntensity));

  for (let ripple = 0; ripple < rippleCount; ripple++) {
    const currentRadius = (rippleRadius + ripple * 2) % maxRadius;

    for (let i = 0; i < selectedZones.length && currentActivatedLEDs < maxActiveLEDs; i++) {
      const distance = Math.abs(i - Math.floor(selectedZones.length / 2));
      if (distance === currentRadius) {
        const zoneIndex = selectedZones[i];
        const ledGroup = ledIdx[zoneIndex];

        if (ledGroup && (!antiFlicker || ledSustainCounters[ledGroup[0]] === 0)) {
          const fadeBrightness = Math.floor(
            brightness * (1 - currentRadius / maxRadius) * (1 - ripple * 0.3)
          );
          ledGroup.forEach((ledIndex) => {
            if (currentActivatedLEDs < maxActiveLEDs) {
              ledSustainCounters[ledIndex] = sustainDuration;
              ledCurrentBrightness[ledIndex] = fadeBrightness;
              physicalLEDBrightness[ledIndex] = fadeBrightness;
              currentActivatedLEDs++;
            }
          });
        }
      }
    }
  }

  return currentActivatedLEDs;
};

// Pattern Decay
const applyPatternDecay = (
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

// Helper Functions
const getSignal = (channelData: Float32Array, frame: number, hopSize: number, bufferSize: number) =>
  channelData.slice(frame * hopSize, frame * hopSize + bufferSize);

const isLocalMaximum = (array: number[], index: number): boolean => {
  if (index === 0 || index === array.length - 1) return false;
  return array[index] > array[index - 1] && array[index] > array[index + 1];
};

const calculateAverageBeatInterval = (
  beats: number[],
  hopSize: number,
  sampleRate: number
): number => {
  if (beats.length < 2) return 0;

  let totalInterval = 0;
  for (let i = 1; i < beats.length; i++) {
    totalInterval += ((beats[i] - beats[i - 1]) * hopSize) / sampleRate;
  }

  return totalInterval / (beats.length - 1);
};

// Fallback: Activate all LEDs to ensure none are permanently dark
const activateAllLEDs = (
  ledIdx: number[][],
  brightness: number,
  physicalLEDBrightness: number[],
  ledSustainCounters: number[],
  ledCurrentBrightness: number[],
  sustainDuration: number
) => {
  ledIdx.forEach((ledGroup) => {
    ledGroup.forEach((ledIndex) => {
      ledSustainCounters[ledIndex] = sustainDuration;
      ledCurrentBrightness[ledIndex] = brightness;
      physicalLEDBrightness[ledIndex] = brightness;
    });
  });
};
