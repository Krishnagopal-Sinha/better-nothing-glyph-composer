import { VideoProcessingResult, FrameAnalysis, NP3DisplayFrame } from './video_editor_service';

/**
 * Base effect parameters (common to all effects)
 */
export interface BaseEffectParameters {
  sensitivity: number; // 0-1: 0 = low sensitivity (high threshold), 1 = high sensitivity (low threshold)
  intensity: number; // 0-1: Overall brightness/intensity multiplier
}

/**
 * BeatMonitor-specific parameters
 */
export interface BeatMonitorParams extends BaseEffectParameters {
  waveHeight: number; // 0-2: Waveform amplitude multiplier
  waveSpeed: number; // 0-2: Animation speed
  lineThickness: number; // 0-1: Waveform line thickness
  baselineBrightness: number; // 0-1: Baseline visibility
}

/**
 * Pulse-specific parameters
 */
export interface PulseParams extends BaseEffectParameters {
  pulseSpeed: number; // 0-2: Expansion speed
  ringCount: number; // 1-5: Number of rings
  ringThickness: number; // 0-1: Ring width
  fadeIntensity: number; // 0-1: Fade amount
}

/**
 * AliveThing-specific parameters
 */
export interface AliveThingParams extends BaseEffectParameters {
  waveComplexity: number; // 0-2: Pattern complexity
  movementSpeed: number; // 0-2: Animation speed
  patternDensity: number; // 0-1: Pattern density
  variation: number; // 0-1: Randomness/variation
}

/**
 * Spinny-specific parameters
 */
export interface SpinnyParams extends BaseEffectParameters {
  rotationSpeed: number; // 0-2: Spin speed
  bladeCount: number; // 3-8: Number of blades
  bladeLength: number; // 0-1: Blade length
  centerBrightness: number; // 0-1: Center glow
}

/**
 * Spectrum-specific parameters
 */
export interface SpectrumParams extends BaseEffectParameters {
  barSensitivity: number; // 0-2: Bar sensitivity to audio
  decayRate: number; // 0-1: How fast bars fall
  peakHold: number; // 0-1: Peak hold time
  frequencyRange: number; // 0-1: Frequency range to display
}

/**
 * Radial Frequency Spokes-specific parameters
 */
export interface RadialSpokesParams extends BaseEffectParameters {
  spokeCount: number; // 8-32: Number of spokes
  spokeLength: number; // 0-1: Spoke length multiplier
  rotationSpeed: number; // 0-2: Rotation speed
}

/**
 * Bass Blobs-specific parameters
 */
export interface BassBlobsParams extends BaseEffectParameters {
  blobSize: number; // 0-2: Blob size multiplier
  blobSpeed: number; // 0-2: Blob movement speed
  mergeIntensity: number; // 0-1: How much blobs merge
  decayRate: number; // 0-1: Blob decay rate
}

/**
 * Treble Sparkles-specific parameters
 */
export interface TrebleSparklesParams extends BaseEffectParameters {
  sparkleCount: number; // 0-1: Number of sparkles
  sparkleDuration: number; // 0-1: How long sparkles last
  sparkleSize: number; // 0-1: Sparkle size
  jitterAmount: number; // 0-1: Random jitter
}

/**
 * Frequency Peak Detectors-specific parameters
 */
export interface PeakDetectorsParams extends BaseEffectParameters {
  peakHold: number; // 0-1: Peak hold time
  bloomSize: number; // 0-2: Bloom size
  decayRate: number; // 0-1: Decay rate
  threshold: number; // 0-1: Peak detection threshold
}

/**
 * Stereo Ping-Pong-specific parameters
 */
export interface StereoPingpongParams extends BaseEffectParameters {
  dotSize: number; // 0-1: Dot size
  movementSpeed: number; // 0-2: Movement speed
  smoothing: number; // 0-1: Pan smoothing
}

/**
 * Rotating Checkerboard-specific parameters
 */
export interface CheckerboardParams extends BaseEffectParameters {
  squareSize: number; // 0-1: Checkerboard square size
  rotationSpeed: number; // 0-2: Rotation speed
  colorShift: number; // 0-1: Color shift on beats
}

/**
 * Hue Cycle-specific parameters
 */
export interface HueCycleParams extends BaseEffectParameters {
  cycleSpeed: number; // 0-2: Hue cycle speed
  saturation: number; // 0-1: Color saturation
  brightness: number; // 0-1: Base brightness
}

/**
 * Ambisonic Radial-specific parameters
 */
export interface AmbisonicRadialParams extends BaseEffectParameters {
  octantCount: number; // 4-16: Number of octants
  radiusMultiplier: number; // 0-2: Radius multiplier
  smoothing: number; // 0-1: Transition smoothing
}

/**
 * Strobe/Tremolo-specific parameters
 */
export interface StrobeParams extends BaseEffectParameters {
  flashIntensity: number; // 0-1: Flash brightness
  flashSpeed: number; // 0-2: Flash frequency
  dutyCycle: number; // 0-1: On/off ratio
}

/**
 * Noise Field-specific parameters
 */
export interface NoiseFieldParams extends BaseEffectParameters {
  noiseScale: number; // 0-2: Noise detail level
  flowSpeed: number; // 0-2: Flow animation speed
  contrast: number; // 0-1: Contrast intensity
}

/**
 * Note Map-specific parameters (piano roll)
 */
export interface NoteMapParams extends BaseEffectParameters {
  noteRange: number; // 0-1: Note range to display
  noteHold: number; // 0-1: Note hold time
  brightness: number; // 0-1: Note brightness
}

/**
 * Energy Nebula-specific parameters
 */
export interface NebulaParams extends BaseEffectParameters {
  blobCount: number; // 0-1: Number of blobs
  flowIntensity: number; // 0-2: Flow movement
  softness: number; // 0-1: Blob softness
  colorShift: number; // 0-1: Color variation
}

/**
 * Union type for all effect parameters
 */
export type EffectParameters =
  | BeatMonitorParams
  | PulseParams
  | AliveThingParams
  | SpinnyParams
  | SpectrumParams
  | RadialSpokesParams
  | BassBlobsParams
  | TrebleSparklesParams
  | PeakDetectorsParams
  | StereoPingpongParams
  | CheckerboardParams
  | HueCycleParams
  | AmbisonicRadialParams
  | StrobeParams
  | NoiseFieldParams
  | NoteMapParams
  | NebulaParams;

/**
 * Default parameters for each effect type
 */
export const DEFAULT_BEATMONITOR_PARAMS: BeatMonitorParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  waveHeight: 1.0,
  waveSpeed: 1.0,
  lineThickness: 0.5,
  baselineBrightness: 0.3
};

export const DEFAULT_PULSE_PARAMS: PulseParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  pulseSpeed: 1.0,
  ringCount: 2,
  ringThickness: 0.3,
  fadeIntensity: 0.5
};

export const DEFAULT_ALIVETHING_PARAMS: AliveThingParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  waveComplexity: 1.0,
  movementSpeed: 1.0,
  patternDensity: 0.8,
  variation: 0.5
};

export const DEFAULT_SPINNY_PARAMS: SpinnyParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  rotationSpeed: 1.0,
  bladeCount: 3,
  bladeLength: 0.8,
  centerBrightness: 0.2
};

export const DEFAULT_SPECTRUM_PARAMS: SpectrumParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  barSensitivity: 1.0,
  decayRate: 0.3,
  peakHold: 0.2,
  frequencyRange: 1.0
};

export const DEFAULT_RADIAL_SPOKES_PARAMS: RadialSpokesParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  spokeCount: 16,
  spokeLength: 0.8,
  rotationSpeed: 1.0
};

export const DEFAULT_BASS_BLOBS_PARAMS: BassBlobsParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  blobSize: 1.0,
  blobSpeed: 1.0,
  mergeIntensity: 0.5,
  decayRate: 0.3
};

export const DEFAULT_TREBLE_SPARKLES_PARAMS: TrebleSparklesParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  sparkleCount: 0.5,
  sparkleDuration: 0.3,
  sparkleSize: 0.5,
  jitterAmount: 0.5
};

export const DEFAULT_PEAK_DETECTORS_PARAMS: PeakDetectorsParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  peakHold: 0.3,
  bloomSize: 1.0,
  decayRate: 0.2,
  threshold: 0.4
};

export const DEFAULT_STEREO_PINGPONG_PARAMS: StereoPingpongParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  dotSize: 0.5,
  movementSpeed: 1.0,
  smoothing: 0.7
};

export const DEFAULT_CHECKERBOARD_PARAMS: CheckerboardParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  squareSize: 0.5,
  rotationSpeed: 1.0,
  colorShift: 0.7
};

export const DEFAULT_HUE_CYCLE_PARAMS: HueCycleParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  cycleSpeed: 1.0,
  saturation: 0.8,
  brightness: 0.7
};

export const DEFAULT_AMBISONIC_RADIAL_PARAMS: AmbisonicRadialParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  octantCount: 8,
  radiusMultiplier: 1.0,
  smoothing: 0.6
};

export const DEFAULT_STROBE_PARAMS: StrobeParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  flashIntensity: 0.9,
  flashSpeed: 1.0,
  dutyCycle: 0.5
};

export const DEFAULT_NOISE_FIELD_PARAMS: NoiseFieldParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  noiseScale: 1.0,
  flowSpeed: 1.0,
  contrast: 0.7
};

export const DEFAULT_NOTE_MAP_PARAMS: NoteMapParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  noteRange: 1.0,
  noteHold: 0.4,
  brightness: 0.8
};

export const DEFAULT_NEBULA_PARAMS: NebulaParams = {
  sensitivity: 0.5,
  intensity: 1.0,
  blobCount: 0.6,
  flowIntensity: 1.0,
  softness: 0.8,
  colorShift: 0.5
};

/**
 * Get default parameters for a specific preset
 */
export function getDefaultParamsForPreset(presetId: string): EffectParameters {
  switch (presetId) {
    case 'beatmonitor':
      return { ...DEFAULT_BEATMONITOR_PARAMS };
    case 'pulse':
      return { ...DEFAULT_PULSE_PARAMS };
    case 'alivething':
      return { ...DEFAULT_ALIVETHING_PARAMS };
    case 'spinny':
      return { ...DEFAULT_SPINNY_PARAMS };
    case 'spectrum':
      return { ...DEFAULT_SPECTRUM_PARAMS };
    case 'radialspokes':
      return { ...DEFAULT_RADIAL_SPOKES_PARAMS };
    case 'bassblobs':
      return { ...DEFAULT_BASS_BLOBS_PARAMS };
    case 'treblesparkles':
      return { ...DEFAULT_TREBLE_SPARKLES_PARAMS };
    case 'peakdetectors':
      return { ...DEFAULT_PEAK_DETECTORS_PARAMS };
    case 'stereopingpong':
      return { ...DEFAULT_STEREO_PINGPONG_PARAMS };
    case 'checkerboard':
      return { ...DEFAULT_CHECKERBOARD_PARAMS };
    case 'huecycle':
      return { ...DEFAULT_HUE_CYCLE_PARAMS };
    case 'ambisonicradial':
      return { ...DEFAULT_AMBISONIC_RADIAL_PARAMS };
    case 'strobe':
      return { ...DEFAULT_STROBE_PARAMS };
    case 'noisefield':
      return { ...DEFAULT_NOISE_FIELD_PARAMS };
    case 'notemap':
      return { ...DEFAULT_NOTE_MAP_PARAMS };
    case 'nebula':
      return { ...DEFAULT_NEBULA_PARAMS };
    default:
      return { ...DEFAULT_BEATMONITOR_PARAMS };
  }
}

/**
 * Audio preset interface for NP3 audio processing
 */
export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  generateFrameData: (
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ) => number[][];
}

/**
 * Audio analysis data for a specific frame
 */
export interface AudioAnalysis {
  amplitude: number; // Overall amplitude (RMS)
  normalizedAmplitude: number; // 0-1 normalized amplitude
  frequencyBands: number[]; // FFT bands (16 log-spaced bands)
  leftChannelEnergy: number; // Stereo left channel energy
  rightChannelEnergy: number; // Stereo right channel energy
  onsetDetected: boolean; // Beat/transient detected
  bandEnergy: number[]; // Per-band energy with decay
}

/**
 * Audio data interface for processing
 */
export interface AudioData {
  duration: number;
  sampleRate: number;
  audioBuffer: AudioBuffer;
  // Precomputed analysis data (optional, computed on-demand)
  analyserNode?: AnalyserNode;
  fftSize?: number;
  frequencyBinCount?: number;
}

/**
 * NP3 Audio Service - Handles audio-only files for NP3 processing
 * Creates frame data filled with zeros since audio has no video data
 * Generates the same interface as video processing for seamless integration
 */
export class NP3AudioService {
  private static instance: NP3AudioService;
  private isProcessing = false;
  private processingProgress = 0;
  private spectrumHistory: number[] | null = null; // For spectrum decay effect
  private bandEnergyHistory: number[] = []; // For band energy decay
  private previousEnergy: number = 0; // For onset detection
  private onsetHistory: boolean[] = []; // Track recent onsets

  // Available presets
  private presets: AudioPreset[] = [
    {
      id: 'beatmonitor',
      name: 'BeatMonitor',
      description: 'A Beat Monitor',
      generateFrameData: this.generateBeatMonitorFrame.bind(this)
    },
    {
      id: 'pulse',
      name: 'Pulse',
      description: 'Expanding circles with audio pulse',
      generateFrameData: this.generatePulseFrame.bind(this)
    },
    {
      id: 'alivething',
      name: 'AliveThing',
      description: "It's Alive! Sorta...",
      generateFrameData: this.generateAliveThingFrame.bind(this)
    },
    {
      id: 'spinny',
      name: 'Spinny',
      description: 'A spinny spinner',
      generateFrameData: this.generateSpinnyFrame.bind(this)
    },
    {
      id: 'spectrum',
      name: 'Spectrum',
      description: 'Frequency spectrum analyzer',
      generateFrameData: this.generateSpectrumFrame.bind(this)
    },
    {
      id: 'radialspokes',
      name: 'Radial Spokes',
      description: 'FFT bands as radial spokes from center',
      generateFrameData: this.generateRadialSpokesFrame.bind(this)
    },
    {
      id: 'bassblobs',
      name: 'Bass Blobs',
      description: 'Organic blobs that grow on bass frequencies',
      generateFrameData: this.generateBassBlobsFrame.bind(this)
    },
    {
      id: 'treblesparkles',
      name: 'Treble Sparkles',
      description: 'High-frequency sparkles on cymbals/hi-hats',
      generateFrameData: this.generateTrebleSparklesFrame.bind(this)
    },
    {
      id: 'peakdetectors',
      name: 'Peak Detectors',
      description: 'Note bloom on frequency peaks',
      generateFrameData: this.generatePeakDetectorsFrame.bind(this)
    },
    {
      id: 'stereopingpong',
      name: 'Stereo Ping-Pong',
      description: 'Dots moving left/right with stereo panning',
      generateFrameData: this.generateStereoPingpongFrame.bind(this)
    },
    {
      id: 'checkerboard',
      name: 'Checkerboard',
      description: 'Rotating checkerboard synced to beats',
      generateFrameData: this.generateCheckerboardFrame.bind(this)
    },
    {
      id: 'huecycle',
      name: 'Hue Cycle',
      description: 'Global hue shifts with energy',
      generateFrameData: this.generateHueCycleFrame.bind(this)
    },
    {
      id: 'ambisonicradial',
      name: 'Ambisonic Radial',
      description: 'Energy to radius per octant',
      generateFrameData: this.generateAmbisonicRadialFrame.bind(this)
    },
    {
      id: 'strobe',
      name: 'Strobe',
      description: 'Beat-synced flashes with tremolo',
      generateFrameData: this.generateStrobeFrame.bind(this)
    },
    {
      id: 'noisefield',
      name: 'Noise Field',
      description: 'Perlin/simplex noise flow reaction',
      generateFrameData: this.generateNoiseFieldFrame.bind(this)
    },
    {
      id: 'notemap',
      name: 'Note Map',
      description: 'Piano roll visualization with pitch detection',
      generateFrameData: this.generateNoteMapFrame.bind(this)
    },
    {
      id: 'nebula',
      name: 'Energy Nebula',
      description: 'Soft color blobs with flowing halos',
      generateFrameData: this.generateEnergyNebulaFrame.bind(this)
    }
  ];

  static getInstance(): NP3AudioService {
    if (!NP3AudioService.instance) {
      NP3AudioService.instance = new NP3AudioService();
    }
    return NP3AudioService.instance;
  }

  /**
   * Get available presets
   * @returns Array of available audio presets
   */
  getPresets(): AudioPreset[] {
    return this.presets;
  }

  /**
   * Process audio file for NP3 with a specific preset
   * @param audioFile - The audio file to process
   * @param presetId - The preset ID to use for generation
   * @param params - Effect parameters (sensitivity, intensity, speed, smoothing)
   * @returns VideoProcessingResult with generated frame data
   */
  async processAudioForNP3WithPreset(
    audioFile: File,
    presetId: string,
    params: EffectParameters
  ): Promise<VideoProcessingResult> {
    this.isProcessing = true;
    this.processingProgress = 0;

    // Add a timeout to prevent hanging
    const timeout = setTimeout(() => {
      this.isProcessing = false;
      this.processingProgress = 0;
      throw new Error('Audio processing timed out after 30 seconds');
    }, 30000); // 30 second timeout

    try {
      console.log(
        'NP3AudioService: Processing audio with preset:',
        presetId,
        'file:',
        audioFile.name,
        'type:',
        audioFile.type,
        'size:',
        audioFile.size
      );

      // Find the preset
      const preset = this.presets.find((p) => p.id === presetId);
      if (!preset) {
        throw new Error(`Preset '${presetId}' not found`);
      }

      console.log('NP3AudioService: Using preset:', preset.name);

      // Load and analyze audio
      const audioData = await this.loadAudioData(audioFile);
      const duration = audioData.duration;
      console.log('NP3AudioService: Audio loaded, duration:', duration, 'seconds');

      const fps = 60; // 60Hz refresh rate for NP3
      const totalFrames = Math.floor(duration * fps);
      const frameInterval = duration / totalFrames;

      console.log(
        'NP3AudioService: Calculated frames:',
        totalFrames,
        'fps:',
        fps,
        'frameInterval:',
        frameInterval
      );

      // Create frame analyses with generated brightness maps
      const frameAnalyses: FrameAnalysis[] = [];
      const displayFrames: NP3DisplayFrame[] = [];

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const currentTime = frameIndex * frameInterval;

        // Generate brightness map using the preset with effect parameters
        const brightnessMap = preset.generateFrameData(audioData, frameIndex, totalFrames, params);

        const frameAnalysis: FrameAnalysis = {
          frameNumber: frameIndex,
          timestamp: currentTime * 1000, // Convert to milliseconds
          brightnessMap
        };
        frameAnalyses.push(frameAnalysis);

        // Create display frame with generated pixel states
        const displayFrame = this.createDisplayFrameFromBrightnessMap(frameAnalysis);
        displayFrames.push(displayFrame);

        // Update progress
        this.processingProgress = ((frameIndex + 1) / totalFrames) * 100;
      }

      // Create a dummy processed video file (empty canvas)
      const processedVideoFile = await this.createDummyVideoFile(duration);

      const result: VideoProcessingResult = {
        audioFile,
        processedVideoFile,
        frameAnalyses,
        displayFrames,
        totalFrames,
        duration: duration * 1000, // Convert to milliseconds for consistency
        fps,
        displayDuration: duration * 1000, // Duration in milliseconds
        originalFileType: 'audio' // Track that this was an audio file
      };

      console.log('NP3AudioService: Preset processing complete. Result:', {
        totalFrames: result.totalFrames,
        duration: result.duration,
        displayFrames: result.displayFrames.length,
        originalFileType: result.originalFileType,
        presetUsed: preset.name
      });

      // Clear timeout since processing completed successfully
      clearTimeout(timeout);

      return result;
    } catch (error) {
      console.error('Audio processing failed:', error);
      clearTimeout(timeout);
      throw error;
    } finally {
      this.isProcessing = false;
      this.processingProgress = 0;
    }
  }

  /**
   * Process audio file for NP3 - creates frame data filled with zeros (legacy method)
   * @param audioFile - The audio file to process
   * @returns VideoProcessingResult with zero-filled frame data
   */
  async processAudioForNP3(audioFile: File): Promise<VideoProcessingResult> {
    this.isProcessing = true;
    this.processingProgress = 0;

    // Add a timeout to prevent hanging
    const timeout = setTimeout(() => {
      this.isProcessing = false;
      this.processingProgress = 0;
      throw new Error('Audio processing timed out after 30 seconds');
    }, 30000); // 30 second timeout

    try {
      console.log(
        'NP3AudioService: Processing audio file:',
        audioFile.name,
        'type:',
        audioFile.type,
        'size:',
        audioFile.size
      );

      // Create audio element to get duration
      const audio = document.createElement('audio');
      const audioUrl = URL.createObjectURL(audioFile);
      audio.src = audioUrl;
      audio.preload = 'metadata';

      // Wait for audio to load
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => {
          console.log('NP3AudioService: Audio metadata loaded, duration:', audio.duration);
          resolve();
        });
        audio.addEventListener('error', () => reject(new Error('Failed to load audio file')));
        audio.load();
      });

      const duration = audio.duration;
      console.log('NP3AudioService: Final duration:', duration, 'seconds');

      const fps = 60; // 60Hz refresh rate for NP3
      const totalFrames = Math.floor(duration * fps);
      const frameInterval = duration / totalFrames;

      console.log(
        'NP3AudioService: Calculated frames:',
        totalFrames,
        'fps:',
        fps,
        'frameInterval:',
        frameInterval
      );

      // Create frame analyses with zero-filled brightness maps
      const frameAnalyses: FrameAnalysis[] = [];
      const displayFrames: NP3DisplayFrame[] = [];

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const currentTime = frameIndex * frameInterval;

        // Create zero-filled brightness map (25x25 grid)
        const brightnessMap = this.createZeroBrightnessMap();

        const frameAnalysis: FrameAnalysis = {
          frameNumber: frameIndex,
          timestamp: currentTime * 1000, // Convert to milliseconds
          brightnessMap
        };
        frameAnalyses.push(frameAnalysis);

        // Create display frame with zero-filled pixel states
        const displayFrame = this.createZeroDisplayFrame(frameAnalysis);
        displayFrames.push(displayFrame);

        // Update progress
        this.processingProgress = ((frameIndex + 1) / totalFrames) * 100;
      }

      // Create a dummy processed video file (empty canvas)
      const processedVideoFile = await this.createDummyVideoFile(duration);

      const result: VideoProcessingResult = {
        audioFile,
        processedVideoFile,
        frameAnalyses,
        displayFrames,
        totalFrames,
        duration: duration * 1000, // Convert to milliseconds for consistency
        fps,
        displayDuration: duration * 1000, // Duration in milliseconds
        originalFileType: 'audio' // Track that this was an audio file
      };

      console.log('NP3AudioService: Processing complete. Result:', {
        totalFrames: result.totalFrames,
        duration: result.duration,
        displayFrames: result.displayFrames.length,
        originalFileType: result.originalFileType
      });

      // Clear timeout since processing completed successfully
      clearTimeout(timeout);

      return result;
    } catch (error) {
      console.error('Audio processing failed:', error);
      clearTimeout(timeout);
      throw error;
    } finally {
      this.isProcessing = false;
      this.processingProgress = 0;
    }
  }

  /**
   * Load audio data for analysis
   * @param audioFile - The audio file to load
   * @returns AudioData with buffer, metadata, and analyser node
   */
  async loadAudioData(audioFile: File): Promise<AudioData> {
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Create analyser node for FFT analysis
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048; // Good frequency resolution
    analyserNode.smoothingTimeConstant = 0.8; // Smooth transitions

    // Create source buffer and connect to analyser
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyserNode);
    // Note: We don't need to actually play the source, just connect it for analysis

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      audioBuffer,
      analyserNode,
      fftSize: analyserNode.fftSize,
      frequencyBinCount: analyserNode.frequencyBinCount
    };
  }

  /**
   * Analyze audio at a specific time point
   * @param audioData - The audio data to analyze
   * @param currentTime - Current time in seconds
   * @param frameIndex - Current frame index (for history tracking)
   * @returns AudioAnalysis with FFT, onset, and stereo data
   */
  private analyzeAudioAtTime(
    audioData: AudioData,
    currentTime: number,
    frameIndex: number
  ): AudioAnalysis {
    const sampleIndex = Math.floor(currentTime * audioData.sampleRate);
    const channelData = audioData.audioBuffer.getChannelData(0);
    const numChannels = audioData.audioBuffer.numberOfChannels;
    const leftChannel = channelData;
    const rightChannel = numChannels > 1 ? audioData.audioBuffer.getChannelData(1) : leftChannel;

    // Calculate amplitude (RMS) from time-domain samples
    let amplitude = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;
    const sampleWindow = Math.floor(audioData.sampleRate * 0.02); // 20ms window

    if (sampleIndex < channelData.length) {
      let sum = 0;
      let leftSum = 0;
      let rightSum = 0;
      let count = 0;
      for (
        let i = Math.max(0, sampleIndex - sampleWindow);
        i < Math.min(channelData.length, sampleIndex + sampleWindow);
        i++
      ) {
        const leftSample = leftChannel[i];
        const rightSample = rightChannel[i];
        const mono = (leftSample + rightSample) / 2;
        sum += Math.abs(mono);
        leftSum += Math.abs(leftSample);
        rightSum += Math.abs(rightSample);
        count++;
      }
      amplitude = count > 0 ? sum / count : 0;
      leftEnergy = count > 0 ? leftSum / count : 0;
      rightEnergy = count > 0 ? rightSum / count : 0;
    }

    const maxAmplitude = 0.3;
    const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);

    // FFT Analysis - extract frequency bands
    const frequencyBands = this.extractFrequencyBands(audioData, currentTime);

    // Onset detection - detect beats/transients
    const onsetDetected = this.detectOnset(amplitude, frameIndex);

    // Band energy with decay
    const bandEnergy = this.calculateBandEnergy(frequencyBands, frameIndex);

    return {
      amplitude,
      normalizedAmplitude,
      frequencyBands,
      leftChannelEnergy: leftEnergy,
      rightChannelEnergy: rightEnergy,
      onsetDetected,
      bandEnergy
    };
  }

  /**
   * Extract frequency bands using FFT analysis
   * @param audioData - The audio data
   * @param currentTime - Current time in seconds
   * @returns Array of 16 log-spaced frequency band magnitudes (0-1)
   */
  private extractFrequencyBands(audioData: AudioData, currentTime: number): number[] {
    // For now, we'll use a simplified approach: analyze the audio buffer directly
    // In a real-time scenario, we'd use the AnalyserNode, but for pre-recorded audio,
    // we'll compute FFT manually from the buffer samples

    const sampleIndex = Math.floor(currentTime * audioData.sampleRate);
    const channelData = audioData.audioBuffer.getChannelData(0);
    const numChannels = audioData.audioBuffer.numberOfChannels;
    const leftChannel = channelData;
    const rightChannel = numChannels > 1 ? audioData.audioBuffer.getChannelData(1) : leftChannel;

    // Use a window of samples for FFT analysis
    const fftWindowSize = 1024;
    const startSample = Math.max(0, sampleIndex - fftWindowSize / 2);
    const endSample = Math.min(channelData.length, sampleIndex + fftWindowSize / 2);

    // Simple frequency analysis: divide spectrum into 16 log-spaced bands
    const numBands = 16;
    const bands: number[] = new Array(numBands).fill(0);

    // Frequency ranges (log-spaced from ~20Hz to ~20kHz) - conceptual mapping
    for (let band = 0; band < numBands; band++) {
      // Log-spaced frequency boundaries (conceptual mapping for band distribution)

      // Simple frequency analysis using DFT approximation
      let bandEnergy = 0;
      let count = 0;
      for (let i = startSample; i < endSample && i < channelData.length; i++) {
        const sample = (leftChannel[i] + rightChannel[i]) / 2;
        // Approximate frequency content using windowed samples
        const phase = ((i - startSample) / fftWindowSize) * Math.PI * 2;
        const freq = (band + 0.5) / numBands;
        const component = sample * Math.sin(phase * freq * numBands);
        bandEnergy += Math.abs(component);
        count++;
      }
      bands[band] = count > 0 ? Math.min(bandEnergy / count / 0.3, 1.0) : 0;
    }

    return bands;
  }

  /**
   * Detect onset (beat/transient) in audio
   * @param currentEnergy - Current frame energy
   * @param _frameIndex - Current frame index (unused but kept for future use)
   * @returns True if onset detected
   */
  private detectOnset(currentEnergy: number, _frameIndex: number): boolean {
    // Simple onset detection: energy difference with threshold
    const energyDiff = currentEnergy - this.previousEnergy;
    const threshold = 0.05; // Adjustable threshold

    const detected = energyDiff > threshold;

    // Store onset in history (keep last 10 frames)
    if (this.onsetHistory.length > 10) {
      this.onsetHistory.shift();
    }
    this.onsetHistory.push(detected);

    // Update previous energy with smoothing
    this.previousEnergy = this.previousEnergy * 0.9 + currentEnergy * 0.1;

    return detected;
  }

  /**
   * Calculate band energy with decay
   * @param frequencyBands - Current frequency band magnitudes
   * @param _frameIndex - Current frame index (unused but kept for future use)
   * @returns Band energy array with decay applied
   */
  private calculateBandEnergy(frequencyBands: number[], _frameIndex: number): number[] {
    // Initialize history if needed
    if (this.bandEnergyHistory.length === 0) {
      this.bandEnergyHistory = new Array(frequencyBands.length).fill(0);
    }

    const decayFactor = 0.85; // Decay rate (15% decay per frame)
    const attackFactor = 0.3; // Attack rate (30% of new value)

    // Apply decay and attack to each band
    const bandEnergy: number[] = [];
    for (let i = 0; i < frequencyBands.length; i++) {
      const currentBand = frequencyBands[i];
      const previousEnergy = this.bandEnergyHistory[i] || 0;

      // If current is higher, attack quickly; otherwise decay slowly
      const newEnergy =
        currentBand > previousEnergy
          ? previousEnergy * (1 - attackFactor) + currentBand * attackFactor
          : previousEnergy * decayFactor;

      this.bandEnergyHistory[i] = newEnergy;
      bandEnergy.push(newEnergy);
    }

    return bandEnergy;
  }

  /**
   * Generate BeatMonitor preset frame data
   * Creates a heartbeat monitor-like visualization with waveform moving from right to left
   * @param audioData - The audio data to analyze
   * @param frameIndex - Current frame index
   * @param totalFrames - Total number of frames
   * @returns 25x25 brightness map
   */
  private generateBeatMonitorFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as BeatMonitorParams;
    const brightnessMap = this.createZeroBrightnessMap();

    // Calculate current time in the audio
    const currentTime = (frameIndex / totalFrames) * audioData.duration;

    // Get audio samples around the current time
    const sampleIndex = Math.floor(currentTime * audioData.sampleRate);
    const channelData = audioData.audioBuffer.getChannelData(0);

    // Calculate waveform amplitude for this frame
    let amplitude = 0;
    const sampleWindow = Math.floor(audioData.sampleRate * 0.02);

    if (sampleIndex < channelData.length) {
      let sum = 0;
      let count = 0;
      for (
        let i = Math.max(0, sampleIndex - sampleWindow);
        i < Math.min(channelData.length, sampleIndex + sampleWindow);
        i++
      ) {
        sum += Math.abs(channelData[i]);
        count++;
      }
      amplitude = count > 0 ? sum / count : 0;
    }

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    const audioThreshold = 0.25 - p.sensitivity * 0.24;

    if (amplitude > audioThreshold) {
      const maxAmplitude = 0.3;
      const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
      // Apply waveHeight parameter to control waveform amplitude
      const visualAmplitude = (0.3 + Math.pow(normalizedAmplitude, 0.7) * 1.2) * p.waveHeight;

      // Apply waveSpeed parameter to control animation speed
      const baseFrequency = 2.0;
      const timeOffset = frameIndex * 0.1 * p.waveSpeed;

      for (let col = 0; col < 25; col++) {
        const x = col / 24;
        let waveform = 0;
        waveform += Math.sin((x + timeOffset) * Math.PI * baseFrequency) * 0.6;
        waveform += Math.sin((x + timeOffset) * Math.PI * baseFrequency * 2.5) * 0.2;
        waveform += Math.sin((x + timeOffset) * Math.PI * baseFrequency * 4.0) * 0.1;
        waveform *= visualAmplitude;
        const centerRow = 12;
        // Apply lineThickness parameter (0-1 maps to 1-7 pixels)
        const maxDisplacement = 1 + p.lineThickness * 6;
        const rowPosition = centerRow + Math.round(waveform * maxDisplacement);
        const clampedRow = Math.max(0, Math.min(24, rowPosition));
        // Apply intensity as a multiplier to the amplitude-based brightness
        // Brightness should scale with both audio amplitude and intensity parameter
        // Ensure minimum visibility: use a combination of base brightness and amplitude
        const brightnessFactor = 0.4 + normalizedAmplitude * 0.6; // 40% base + 60% amplitude-based
        const brightness = Math.round(4095 * brightnessFactor * p.intensity);
        brightnessMap[clampedRow][col] = brightness;

        // Fill in line thickness
        if (col > 0) {
          const prevWaveform =
            Math.sin(((col - 1) / 24 + timeOffset) * Math.PI * baseFrequency) * 0.6 +
            Math.sin(((col - 1) / 24 + timeOffset) * Math.PI * baseFrequency * 2.5) * 0.2 +
            Math.sin(((col - 1) / 24 + timeOffset) * Math.PI * baseFrequency * 4.0) * 0.1;
          const prevRow = Math.max(
            0,
            Math.min(24, Math.round(centerRow + prevWaveform * visualAmplitude * maxDisplacement))
          );
          const minRow = Math.min(prevRow, clampedRow);
          const maxRow = Math.max(prevRow, clampedRow);
          const thickness = Math.max(1, Math.floor(p.lineThickness * 3));
          for (let r = minRow; r <= maxRow; r++) {
            if (r >= 0 && r < 25) {
              brightnessMap[r][col] = brightness;
            }
          }
          // Add thickness around the line
          for (let offset = 1; offset <= thickness; offset++) {
            if (clampedRow + offset < 25) brightnessMap[clampedRow + offset][col] = brightness;
            if (clampedRow - offset >= 0) brightnessMap[clampedRow - offset][col] = brightness;
          }
        }
      }
    } else {
      // Apply baselineBrightness parameter
      const centerRow = 12;
      const baselineBright = Math.round(4095 * p.intensity * p.baselineBrightness);
      for (let col = 0; col < 25; col++) {
        brightnessMap[centerRow][col] = baselineBright;
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Pulse preset frame data
   * Creates expanding circles with audio pulse
   * @param audioData - The audio data to analyze
   * @param frameIndex - Current frame index
   * @param totalFrames - Total number of frames
   * @returns 25x25 brightness map
   */
  private generatePulseFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as PulseParams;
    const brightnessMap = this.createZeroBrightnessMap();

    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const sampleIndex = Math.floor(currentTime * audioData.sampleRate);
    const channelData = audioData.audioBuffer.getChannelData(0);

    let amplitude = 0;
    const sampleWindow = Math.floor(audioData.sampleRate * 0.02);

    if (sampleIndex < channelData.length) {
      let sum = 0;
      let count = 0;
      for (
        let i = Math.max(0, sampleIndex - sampleWindow);
        i < Math.min(channelData.length, sampleIndex + sampleWindow);
        i++
      ) {
        sum += Math.abs(channelData[i]);
        count++;
      }
      amplitude = count > 0 ? sum / count : 0;
    }

    const maxAmplitude = 0.3;
    const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    const audioThreshold = 0.25 - p.sensitivity * 0.24;

    if (amplitude > audioThreshold) {
      const centerX = 12;
      const centerY = 12;
      // Apply pulseSpeed parameter
      const timeOffset = frameIndex * 0.2 * p.pulseSpeed;
      const pulseRadius = (timeOffset * normalizedAmplitude * 0.5) % 12;

      // Apply ringCount parameter (1-5 rings)
      const numRings = Math.floor(1 + p.ringCount * 4);

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - centerY) ** 2 + (col - centerX) ** 2);
          const maxDistance = 12;

          if (distance <= maxDistance) {
            let maxIntensity = 0;

            // Create multiple rings based on ringCount
            for (let ring = 0; ring < numRings; ring++) {
              const ringRadius = (pulseRadius + ring * (12 / numRings)) % 12;
              const ringDistance = Math.abs(distance - ringRadius);
              // Apply ringThickness parameter (0-1 maps to 0.5-3.0 pixel width)
              const ringWidth = 0.5 + p.ringThickness * 2.5;
              const ringIntensity = Math.max(0, 1 - ringDistance / ringWidth) * normalizedAmplitude;
              maxIntensity = Math.max(maxIntensity, ringIntensity);
            }

            // Apply fadeIntensity parameter
            const finalIntensity = maxIntensity * (0.5 + p.fadeIntensity * 0.5);
            const finalBrightness = Math.round(4095 * finalIntensity * p.intensity);
            brightnessMap[row][col] = finalBrightness;
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate AliveThing preset frame data
   * @param audioData - The audio data to analyze
   * @param frameIndex - Current frame index
   * @param totalFrames - Total number of frames
   * @returns 25x25 brightness map
   */
  private generateAliveThingFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as AliveThingParams;
    const brightnessMap = this.createZeroBrightnessMap();

    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const sampleIndex = Math.floor(currentTime * audioData.sampleRate);
    const channelData = audioData.audioBuffer.getChannelData(0);

    let amplitude = 0;
    const sampleWindow = Math.floor(audioData.sampleRate * 0.02);

    if (sampleIndex < channelData.length) {
      let sum = 0;
      let count = 0;
      for (
        let i = Math.max(0, sampleIndex - sampleWindow);
        i < Math.min(channelData.length, sampleIndex + sampleWindow);
        i++
      ) {
        sum += Math.abs(channelData[i]);
        count++;
      }
      amplitude = count > 0 ? sum / count : 0;
    }

    const maxAmplitude = 0.3;
    const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    const audioThreshold = 0.25 - p.sensitivity * 0.24;

    if (amplitude > audioThreshold) {
      // Apply movementSpeed parameter
      const timeOffset = frameIndex * 0.12 * p.movementSpeed;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - 12) ** 2 + (col - 12) ** 2);
          const maxDistance = 12;

          if (distance <= maxDistance) {
            // Apply waveComplexity parameter (0-2 maps to 0.1-0.5 frequency multiplier)
            const complexity = 0.1 + p.waveComplexity * 0.4;
            // Apply variation parameter for randomness
            const variation = p.variation * 0.2;
            const randomOffset = Math.sin(frameIndex * 0.1) * variation;

            const wave1 =
              Math.sin((row + col) * complexity + timeOffset + randomOffset) * 0.5 + 0.5;
            const wave2 =
              Math.sin((row - col) * (complexity * 1.3) + timeOffset * 0.7 + randomOffset) * 0.5 +
              0.5;
            const wave3 =
              Math.sin(distance * (complexity * 1.6) + timeOffset * 1.2 + randomOffset) * 0.5 + 0.5;

            // Apply patternDensity parameter
            const trippyIntensity =
              ((wave1 + wave2 + wave3) / 3) * normalizedAmplitude * (0.5 + p.patternDensity * 0.5);

            const finalBrightness = Math.round(4095 * trippyIntensity * p.intensity);
            brightnessMap[row][col] = finalBrightness;
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate MirrorThing preset frame data
   * Creates a waveform mirrored in a 3-star pattern
   * @param audioData - The audio data to analyze
   * @param frameIndex - Current frame index
   * @param totalFrames - Total number of frames
   * @returns 25x25 brightness map
   */
  private generateSpinnyFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as SpinnyParams;
    const brightnessMap = this.createZeroBrightnessMap();

    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const sampleIndex = Math.floor(currentTime * audioData.sampleRate);
    const channelData = audioData.audioBuffer.getChannelData(0);

    let amplitude = 0;
    const sampleWindow = Math.floor(audioData.sampleRate * 0.02);

    if (sampleIndex < channelData.length) {
      let sum = 0;
      let count = 0;
      for (
        let i = Math.max(0, sampleIndex - sampleWindow);
        i < Math.min(channelData.length, sampleIndex + sampleWindow);
        i++
      ) {
        sum += Math.abs(channelData[i]);
        count++;
      }
      amplitude = count > 0 ? sum / count : 0;
    }

    const maxAmplitude = 0.3;
    const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    const audioThreshold = 0.25 - p.sensitivity * 0.24;

    // Apply bladeCount parameter (3-8 blades)
    const numBlades = Math.floor(3 + p.bladeCount * 5);
    const centerX = 12;
    const centerY = 12;
    // Apply rotationSpeed parameter
    const timeOffset = frameIndex * 0.15 * p.rotationSpeed;

    if (amplitude > audioThreshold) {
      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - centerY) ** 2 + (col - centerX) ** 2);
          // Apply bladeLength parameter (0-1 maps to 0.5-1.0 of max distance)
          const maxDistance = 12 * (0.5 + p.bladeLength * 0.5);

          if (distance <= maxDistance) {
            const angle = Math.atan2(row - centerY, col - centerX);

            // Create fan pattern with configurable blade count
            let bladeIntensity = 0;
            for (let blade = 0; blade < numBlades; blade++) {
              const bladeAngle =
                (angle + (Math.PI * 2 * blade) / numBlades + timeOffset) % (Math.PI * 2);
              const normalizedAngle = bladeAngle / (Math.PI * 2);
              const bladePattern = Math.sin(normalizedAngle * Math.PI * numBlades) * 0.5 + 0.5;
              bladeIntensity = Math.max(bladeIntensity, bladePattern);
            }

            // Create waveform along blades
            const waveform = Math.sin((distance - timeOffset * 2) * 0.8) * 0.5 + 0.5;
            const distanceFactor = Math.max(0, 1 - distance / maxDistance);

            // Apply centerBrightness parameter
            const centerGlow = p.centerBrightness * (1 - distance / maxDistance);
            const mirrorIntensity =
              (bladeIntensity * waveform * distanceFactor + centerGlow * 0.3) *
              normalizedAmplitude *
              0.8;

            const finalBrightness = Math.round(4095 * mirrorIntensity * p.intensity);
            brightnessMap[row][col] = finalBrightness;
          }
        }
      }
    } else {
      // When audio is silent, show a dim fan pattern
      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - centerY) ** 2 + (col - centerX) ** 2);
          if (distance <= 12) {
            const angle = Math.atan2(row - centerY, col - centerX);
            let bladeIntensity = 0;
            for (let blade = 0; blade < numBlades; blade++) {
              const bladeAngle =
                (angle + (Math.PI * 2 * blade) / numBlades + timeOffset * 0.3) % (Math.PI * 2);
              const normalizedAngle = bladeAngle / (Math.PI * 2);
              const bladePattern = Math.sin(normalizedAngle * Math.PI * numBlades) * 0.3 + 0.7;
              bladeIntensity = Math.max(bladeIntensity, bladePattern);
            }
            const distanceFactor = Math.max(0, 1 - distance / 12);
            const centerGlow = p.centerBrightness * (1 - distance / 12);
            brightnessMap[row][col] = Math.round(
              4095 * (bladeIntensity * distanceFactor + centerGlow * 0.3) * 0.1 * p.intensity
            );
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Spectrum preset frame data
   * Creates a frequency spectrum analyzer visualization
   * @param audioData - The audio data to analyze
   * @param frameIndex - Current frame index
   * @param totalFrames - Total number of frames
   * @returns 25x25 brightness map
   */
  private generateSpectrumFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as SpectrumParams;
    const brightnessMap = this.createZeroBrightnessMap();

    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const sampleIndex = Math.floor(currentTime * audioData.sampleRate);
    const channelData = audioData.audioBuffer.getChannelData(0);

    let amplitude = 0;
    const sampleWindow = Math.floor(audioData.sampleRate * 0.02);

    if (sampleIndex < channelData.length) {
      let sum = 0;
      let count = 0;
      for (
        let i = Math.max(0, sampleIndex - sampleWindow);
        i < Math.min(channelData.length, sampleIndex + sampleWindow);
        i++
      ) {
        sum += Math.abs(channelData[i]);
        count++;
      }
      amplitude = count > 0 ? sum / count : 0;
    }

    const maxAmplitude = 0.3;
    const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    const audioThreshold = 0.25 - p.sensitivity * 0.24;

    // Store previous frame heights for decay effect
    if (!this.spectrumHistory) {
      this.spectrumHistory = new Array(25).fill(0);
    }

    if (amplitude > audioThreshold) {
      // Apply frequencyRange parameter (0-1 maps to showing 0.5-1.0 of frequency spectrum)
      const freqRangeStart = (1 - p.frequencyRange) * 0.5;
      const freqRangeEnd = freqRangeStart + p.frequencyRange;

      for (let col = 0; col < 25; col++) {
        const bandFreq = col / 24;
        // Only show bars in the selected frequency range
        if (bandFreq >= freqRangeStart && bandFreq <= freqRangeEnd) {
          // Apply barSensitivity parameter
          const bandAmplitude =
            normalizedAmplitude *
            (0.5 + Math.sin(bandFreq * Math.PI * 2 + frameIndex * 0.1) * 0.5) *
            p.barSensitivity;

          // Apply decayRate parameter (0-1: 0 = no decay, 1 = fast decay)
          const previousHeight = this.spectrumHistory[col];
          const newHeight = Math.max(previousHeight * (1 - p.decayRate * 0.1), bandAmplitude * 25);
          this.spectrumHistory[col] = newHeight;

          // Apply peakHold parameter
          const barHeight = Math.floor(newHeight);

          // Draw vertical bars from bottom
          for (let row = 24; row >= 25 - barHeight && row >= 0; row--) {
            const distanceFromTop = 24 - row;
            const brightness = Math.max(0, 1 - distanceFromTop / barHeight) * normalizedAmplitude;
            brightnessMap[row][col] = Math.round(4095 * brightness * p.intensity);
          }
        }
      }
    } else {
      // Apply decay when no audio
      for (let col = 0; col < 25; col++) {
        this.spectrumHistory[col] *= 1 - p.decayRate * 0.2;
        const barHeight = Math.floor(this.spectrumHistory[col]);
        for (let row = 24; row >= 25 - barHeight && row >= 0; row--) {
          const distanceFromTop = 24 - row;
          const brightness = Math.max(0, 1 - distanceFromTop / barHeight) * 0.3;
          brightnessMap[row][col] = Math.round(4095 * brightness * p.intensity);
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Radial Spokes preset frame data - FFT bands as radial spokes
   */
  private generateRadialSpokesFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as RadialSpokesParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (analysis.normalizedAmplitude > 0.25 - p.sensitivity * 0.24) {
      const centerX = 12;
      const centerY = 12;
      const spokeCount = Math.floor(8 + p.spokeCount * 24);
      const maxRadius = 12 * p.spokeLength;
      const rotation = frameIndex * 0.1 * p.rotationSpeed;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const dx = col - centerX;
          const dy = row - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) + rotation) % (Math.PI * 2);

          if (distance <= maxRadius) {
            const spokeIndex = Math.floor((angle / (Math.PI * 2)) * spokeCount) % spokeCount;
            const bandIndex = Math.floor(
              (spokeIndex / spokeCount) * analysis.frequencyBands.length
            );
            const bandValue = analysis.frequencyBands[bandIndex] || 0;
            const distanceFactor = 1 - distance / maxRadius;
            const brightness = Math.round(4095 * bandValue * distanceFactor * p.intensity);
            brightnessMap[row][col] = brightness;
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Bass Blobs preset frame data - organic blobs that grow on bass
   */
  private generateBassBlobsFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as BassBlobsParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    // Bass frequencies are typically in the first few bands
    const bassEnergy = analysis.frequencyBands.slice(0, 4).reduce((a, b) => a + b, 0) / 4;

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (bassEnergy > 0.25 - p.sensitivity * 0.24) {
      const blobCount = 3;
      const blobSize = 3 + p.blobSize * 5;
      const timeOffset = frameIndex * 0.1 * p.blobSpeed;

      for (let blob = 0; blob < blobCount; blob++) {
        const blobX = 6 + blob * 6 + Math.sin(timeOffset + blob) * 2;
        const blobY = 6 + blob * 6 + Math.cos(timeOffset + blob) * 2;

        for (let row = 0; row < 25; row++) {
          for (let col = 0; col < 25; col++) {
            const distance = Math.sqrt((row - blobY) ** 2 + (col - blobX) ** 2);
            if (distance < blobSize) {
              const intensity = (1 - distance / blobSize) * bassEnergy * (1 - p.decayRate * 0.5);
              const brightness = Math.round(4095 * intensity * p.intensity);
              brightnessMap[row][col] = Math.max(brightnessMap[row][col], brightness);
            }
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Treble Sparkles preset frame data - high-frequency sparkles
   */
  private generateTrebleSparklesFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as TrebleSparklesParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    // Treble frequencies are in the higher bands
    const trebleEnergy = analysis.frequencyBands.slice(12, 16).reduce((a, b) => a + b, 0) / 4;

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (trebleEnergy > 0.25 - p.sensitivity * 0.24) {
      const sparkleCount = Math.floor(5 + p.sparkleCount * 15);
      const sparkleLifetime = Math.floor(10 * p.sparkleDuration);

      for (let i = 0; i < sparkleCount; i++) {
        const seed = (frameIndex + i * 7) % sparkleLifetime;
        if (seed < sparkleLifetime * 0.8) {
          const x = (i * 3 + seed * 0.5) % 25;
          const y = (i * 5 + seed * 0.7) % 25;
          const jitterX = p.jitterAmount * (Math.random() - 0.5) * 2;
          const jitterY = p.jitterAmount * (Math.random() - 0.5) * 2;
          const sparkleX = Math.floor(Math.max(0, Math.min(24, x + jitterX)));
          const sparkleY = Math.floor(Math.max(0, Math.min(24, y + jitterY)));
          const fade = 1 - seed / sparkleLifetime;
          const size = Math.floor(1 + p.sparkleSize * 2);

          for (let dy = -size; dy <= size; dy++) {
            for (let dx = -size; dx <= size; dx++) {
              const px = sparkleX + dx;
              const py = sparkleY + dy;
              if (px >= 0 && px < 25 && py >= 0 && py < 25) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= size) {
                  const intensity = (1 - dist / size) * fade * trebleEnergy;
                  const brightness = Math.round(4095 * intensity * p.intensity);
                  brightnessMap[py][px] = Math.max(brightnessMap[py][px], brightness);
                }
              }
            }
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Peak Detectors preset frame data - note bloom on peaks
   */
  private generatePeakDetectorsFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as PeakDetectorsParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    const peakThreshold = 0.3 + p.threshold * 0.4;
    const bloomSize = 2 + p.bloomSize * 4;

    for (let band = 0; band < analysis.frequencyBands.length; band++) {
      const bandValue = analysis.frequencyBands[band];
      if (bandValue > peakThreshold) {
        const x = Math.floor((band / analysis.frequencyBands.length) * 25);
        const y = 12;

        for (let row = 0; row < 25; row++) {
          for (let col = 0; col < 25; col++) {
            const distance = Math.sqrt((row - y) ** 2 + (col - x) ** 2);
            if (distance < bloomSize) {
              const intensity = (1 - distance / bloomSize) * bandValue * (1 - p.decayRate * 0.3);
              const brightness = Math.round(4095 * intensity * p.intensity);
              brightnessMap[row][col] = Math.max(brightnessMap[row][col], brightness);
            }
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Stereo Ping-Pong preset frame data - dots moving with stereo panning
   */
  private generateStereoPingpongFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as StereoPingpongParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (analysis.normalizedAmplitude > 0.25 - p.sensitivity * 0.24) {
      const totalEnergy = analysis.leftChannelEnergy + analysis.rightChannelEnergy;
      const pan =
        totalEnergy > 0
          ? (analysis.rightChannelEnergy - analysis.leftChannelEnergy) / totalEnergy
          : 0;
      const smoothedPan = pan * p.smoothing + (1 - p.smoothing) * (pan * 0.5);
      const dotX = Math.floor(12 + smoothedPan * 12 * p.movementSpeed);
      const dotY = 12;
      const dotSize = Math.floor(1 + p.dotSize * 3);

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - dotY) ** 2 + (col - dotX) ** 2);
          if (distance < dotSize) {
            const intensity = (1 - distance / dotSize) * analysis.normalizedAmplitude;
            const brightness = Math.round(4095 * intensity * p.intensity);
            brightnessMap[row][col] = brightness;
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Checkerboard preset frame data - rotating checkerboard synced to beats
   */
  private generateCheckerboardFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as CheckerboardParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    const squareSize = Math.floor(2 + p.squareSize * 4);
    const rotation = frameIndex * 0.1 * p.rotationSpeed;
    const beatFactor = analysis.onsetDetected ? 1 + p.colorShift : 1;

    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const centerX = 12;
        const centerY = 12;
        const dx = col - centerX;
        const dy = row - centerY;
        const angle = Math.atan2(dy, dx) + rotation;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const rotatedX = Math.cos(angle) * distance;
        const rotatedY = Math.sin(angle) * distance;
        const checkX = Math.floor(rotatedX / squareSize);
        const checkY = Math.floor(rotatedY / squareSize);
        const isEven = (checkX + checkY) % 2 === 0;
        const brightness = Math.round(
          4095 * (isEven ? 1 : 0.3) * beatFactor * analysis.normalizedAmplitude * p.intensity
        );
        brightnessMap[row][col] = brightness;
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Hue Cycle preset frame data - global hue shifts with energy
   */
  private generateHueCycleFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as HueCycleParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    const hueOffset =
      (frameIndex * 0.1 * p.cycleSpeed * analysis.normalizedAmplitude) % (Math.PI * 2);

    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const angle = Math.atan2(row - 12, col - 12) + hueOffset;
        const hue = (angle / (Math.PI * 2) + 1) % 1;
        const brightness = Math.round(
          4095 * hue * p.saturation * analysis.normalizedAmplitude * p.brightness * p.intensity
        );
        brightnessMap[row][col] = brightness;
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Ambisonic Radial preset frame data - energy to radius per octant
   */
  private generateAmbisonicRadialFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as AmbisonicRadialParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (analysis.normalizedAmplitude > 0.25 - p.sensitivity * 0.24) {
      const centerX = 12;
      const centerY = 12;
      const octantCount = Math.floor(4 + p.octantCount * 12);
      const maxRadius = 12 * p.radiusMultiplier;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const dx = col - centerX;
          const dy = row - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
          const octantIndex = Math.floor((angle / (Math.PI * 2)) * octantCount) % octantCount;
          const bandIndex = Math.floor(
            (octantIndex / octantCount) * analysis.frequencyBands.length
          );
          const bandValue = analysis.frequencyBands[bandIndex] || 0;
          const targetRadius = bandValue * maxRadius;

          if (distance <= maxRadius) {
            const radiusDiff = Math.abs(distance - targetRadius);
            const smoothFactor = 1 - radiusDiff / (maxRadius * p.smoothing);
            const brightness = Math.round(4095 * Math.max(0, smoothFactor) * p.intensity);
            brightnessMap[row][col] = brightness;
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Strobe preset frame data - beat-synced flashes
   */
  private generateStrobeFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as StrobeParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    const flashPeriod = Math.floor(60 / (1 + p.flashSpeed * 4));
    const flashPhase = frameIndex % flashPeriod;
    const dutyCycleOn = Math.floor(flashPeriod * p.dutyCycle);
    const isFlashing = flashPhase < dutyCycleOn || analysis.onsetDetected;

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (isFlashing && analysis.normalizedAmplitude > 0.25 - p.sensitivity * 0.24) {
      const brightness = Math.round(4095 * p.flashIntensity * p.intensity);
      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          brightnessMap[row][col] = brightness;
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Noise Field preset frame data - Perlin/simplex noise flow
   */
  private generateNoiseFieldFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as NoiseFieldParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (analysis.normalizedAmplitude > 0.25 - p.sensitivity * 0.24) {
      const timeOffset = frameIndex * 0.1 * p.flowSpeed;
      const noiseScale = 0.1 + p.noiseScale * 0.3;

      // Simple noise function (simplified Perlin noise)
      const noise = (x: number, y: number, t: number) => {
        const n = Math.sin(x * noiseScale + t) * Math.cos(y * noiseScale + t * 0.7);
        return (n + 1) / 2;
      };

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const noiseValue = noise(col, row, timeOffset);
          const contrast = 0.5 + p.contrast * 0.5;
          const brightness = Math.round(
            4095 * noiseValue * contrast * analysis.normalizedAmplitude * p.intensity
          );
          brightnessMap[row][col] = brightness;
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Note Map preset frame data - piano roll visualization
   */
  private generateNoteMapFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as NoteMapParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (analysis.normalizedAmplitude > 0.25 - p.sensitivity * 0.24) {
      const noteRange = Math.floor(25 * p.noteRange);

      for (let col = 0; col < 25; col++) {
        const bandIndex = Math.floor((col / 25) * analysis.frequencyBands.length);
        const bandValue = analysis.frequencyBands[bandIndex] || 0;

        if (bandValue > 0.3) {
          const noteHeight = Math.floor(bandValue * noteRange);
          for (let row = 24; row >= 25 - noteHeight && row >= 0; row--) {
            const brightness = Math.round(4095 * p.brightness * p.intensity);
            brightnessMap[row][col] = brightness;
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Generate Energy Nebula preset frame data - soft color blobs with flowing halos
   */
  private generateEnergyNebulaFrame(
    audioData: AudioData,
    frameIndex: number,
    totalFrames: number,
    params: EffectParameters
  ): number[][] {
    const p = params as NebulaParams;
    const brightnessMap = this.createZeroBrightnessMap();
    const currentTime = (frameIndex / totalFrames) * audioData.duration;
    const analysis = this.analyzeAudioAtTime(audioData, currentTime, frameIndex);

    // Sensitivity: 0 = high threshold (0.25), 1 = low threshold (0.01) - wider range for more impact
    if (analysis.normalizedAmplitude > 0.25 - p.sensitivity * 0.24) {
      const blobCount = Math.floor(3 + p.blobCount * 5);
      const flowOffset = frameIndex * 0.1 * p.flowIntensity;

      for (let blob = 0; blob < blobCount; blob++) {
        const blobX = 12 + Math.sin(flowOffset + blob * 2) * 8;
        const blobY = 12 + Math.cos(flowOffset + blob * 2) * 8;
        const blobSize = 5 + p.softness * 8;
        const colorShift = blob * p.colorShift * 0.3;

        for (let row = 0; row < 25; row++) {
          for (let col = 0; col < 25; col++) {
            const distance = Math.sqrt((row - blobY) ** 2 + (col - blobX) ** 2);
            if (distance < blobSize) {
              const intensity = Math.exp(-distance / blobSize) * (1 + colorShift);
              const brightness = Math.round(
                4095 * intensity * analysis.normalizedAmplitude * p.intensity
              );
              brightnessMap[row][col] = Math.max(brightnessMap[row][col], brightness);
            }
          }
        }
      }
    }

    return brightnessMap;
  }

  /**
   * Create a zero-filled brightness map (25x25 grid)
   * @returns 2D array filled with zeros
   */
  private createZeroBrightnessMap(): number[][] {
    const brightnessMap: number[][] = [];
    for (let row = 0; row < 25; row++) {
      brightnessMap[row] = [];
      for (let col = 0; col < 25; col++) {
        brightnessMap[row][col] = 0; // All pixels are off (zero brightness)
      }
    }
    return brightnessMap;
  }

  /**
   * Create a display frame with zero-filled pixel states
   * @param frameAnalysis - The frame analysis with zero brightness map
   * @returns NP3DisplayFrame with all pixels off
   */
  private createZeroDisplayFrame(frameAnalysis: FrameAnalysis): NP3DisplayFrame {
    const pixelStates = new Array(625).fill(false); // All pixels off
    const brightnessValues = new Array(625).fill(0); // All brightness values zero

    return {
      timestamp: frameAnalysis.timestamp,
      pixelStates,
      brightnessValues
    };
  }

  /**
   * Create a display frame from brightness map
   * @param frameAnalysis - The frame analysis with brightness map
   * @returns NP3DisplayFrame with pixel states based on brightness
   */
  private createDisplayFrameFromBrightnessMap(frameAnalysis: FrameAnalysis): NP3DisplayFrame {
    const pixelStates = new Array(625).fill(false);
    const brightnessValues = new Array(625).fill(0);

    // Convert brightness map to pixel states
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const index = row * 25 + col;
        const brightness = frameAnalysis.brightnessMap[row][col];

        brightnessValues[index] = brightness;
        pixelStates[index] = brightness > 0; // Any brightness > 0 means pixel is on
      }
    }

    return {
      timestamp: frameAnalysis.timestamp,
      pixelStates,
      brightnessValues
    };
  }

  /**
   * Create a dummy video file (empty canvas) for compatibility
   * @param duration - Duration of the audio in seconds
   * @returns File object representing an empty video
   */
  private async createDummyVideoFile(_duration: number): Promise<File> {
    // Create a small canvas with black background
    const canvas = document.createElement('canvas');
    canvas.width = 25;
    canvas.height = 25;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Fill with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Convert canvas to blob
    return new Promise<File>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'dummy_video.mp4', { type: 'video/mp4' });
          resolve(file);
        } else {
          // Fallback: create empty file
          const emptyBlob = new Blob([], { type: 'video/mp4' });
          const file = new File([emptyBlob], 'dummy_video.mp4', { type: 'video/mp4' });
          resolve(file);
        }
      }, 'video/mp4');
    });
  }

  /**
   * Get current processing progress (0-100)
   * @returns Progress percentage
   */
  getProgress(): number {
    return this.processingProgress;
  }

  /**
   * Check if audio is currently being processed
   * @returns True if processing, false otherwise
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

export default NP3AudioService;
