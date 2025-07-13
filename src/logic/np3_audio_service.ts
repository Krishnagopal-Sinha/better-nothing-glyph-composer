import { VideoProcessingResult, FrameAnalysis, NP3DisplayFrame } from './video_editor_service';

/**
 * Audio preset interface for NP3 audio processing
 */
export interface AudioPreset {
  id: string;
  name: string;
  description: string;
  generateFrameData: (audioData: AudioData, frameIndex: number, totalFrames: number) => number[][];
}

/**
 * Audio data interface for processing
 */
export interface AudioData {
  duration: number;
  sampleRate: number;
  audioBuffer: AudioBuffer;
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
   * @returns VideoProcessingResult with generated frame data
   */
  async processAudioForNP3WithPreset(
    audioFile: File,
    presetId: string
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
      // Find the preset
      const preset = this.presets.find((p) => p.id === presetId);
      if (!preset) {
        throw new Error(`Preset '${presetId}' not found`);
      }

      // Load and analyze audio
      const audioData = await this.loadAudioData(audioFile);
      const duration = audioData.duration;
      const fps = 60; // 60Hz refresh rate for NP3
      const totalFrames = Math.floor(duration * fps);
      const frameInterval = duration / totalFrames;

      // Create frame analyses with generated brightness maps
      const frameAnalyses: FrameAnalysis[] = [];
      const displayFrames: NP3DisplayFrame[] = [];

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const currentTime = frameIndex * frameInterval;

        // Generate brightness map using the preset
        const brightnessMap = preset.generateFrameData(audioData, frameIndex, totalFrames);

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
        duration,
        fps,
        displayDuration: duration * 1000 // Duration in milliseconds
      };

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
      // Create audio element to get duration
      const audio = document.createElement('audio');
      const audioUrl = URL.createObjectURL(audioFile);
      audio.src = audioUrl;
      audio.preload = 'metadata';

      // Wait for audio to load
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener('loadedmetadata', () => resolve());
        audio.addEventListener('error', () => reject(new Error('Failed to load audio file')));
        audio.load();
      });

      const duration = audio.duration;
      const fps = 60; // 60Hz refresh rate for NP3
      const totalFrames = Math.floor(duration * fps);
      const frameInterval = duration / totalFrames;

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
        duration,
        fps,
        displayDuration: duration * 1000 // Duration in milliseconds
      };

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
   * @returns AudioData with buffer and metadata
   */
  private async loadAudioData(audioFile: File): Promise<AudioData> {
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      audioBuffer
    };
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
    totalFrames: number
  ): number[][] {
    const brightnessMap = this.createZeroBrightnessMap();

    // Calculate current time in the audio
    const currentTime = (frameIndex / totalFrames) * audioData.duration;

    // Get audio samples around the current time
    const sampleIndex = Math.floor(currentTime * audioData.sampleRate);
    const channelData = audioData.audioBuffer.getChannelData(0); // Use first channel

    // Calculate waveform amplitude for this frame
    let amplitude = 0;
    const sampleWindow = Math.floor(audioData.sampleRate * 0.02); // 20ms window for smoother heartbeat

    if (sampleIndex < channelData.length) {
      let sum = 0;
      let count = 0;

      // Average samples in the window
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

    // Only generate waveform if there's actual audio activity
    const audioThreshold = 0.01; // Minimum amplitude to consider as "audio activity"

    if (amplitude > audioThreshold) {
      // Map amplitude to waveform intensity
      const maxAmplitude = 0.3;
      // Smoother, more natural amplitude scaling
      const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
      const visualAmplitude = 0.3 + Math.pow(normalizedAmplitude, 0.7) * 1.2; // base + scaled

      // Create continuous waveform pattern
      const baseFrequency = 2.0;
      const timeOffset = frameIndex * 0.1;

      for (let col = 0; col < 25; col++) {
        const x = col / 24;
        let waveform = 0;
        waveform += Math.sin((x + timeOffset) * Math.PI * baseFrequency) * 0.6;
        waveform += Math.sin((x + timeOffset) * Math.PI * baseFrequency * 2.5) * 0.2;
        waveform += Math.sin((x + timeOffset) * Math.PI * baseFrequency * 4.0) * 0.1;
        waveform *= visualAmplitude;
        const centerRow = 12;
        const maxDisplacement = 7; // slightly less than before
        const rowPosition = centerRow + Math.round(waveform * maxDisplacement);
        const clampedRow = Math.max(0, Math.min(24, rowPosition));
        brightnessMap[clampedRow][col] = 4095;
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
          for (let r = minRow; r <= maxRow; r++) {
            if (r >= 0 && r < 25) {
              brightnessMap[r][col] = 4095;
            }
          }
        }
      }
    } else {
      // When audio is silent, show a static baseline
      const centerRow = 12;
      for (let col = 0; col < 25; col++) {
        brightnessMap[centerRow][col] = 4095; // Bright straight horizontal line
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
    totalFrames: number
  ): number[][] {
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

    const maxAmplitude = 0.3;
    const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
    const audioThreshold = 0.01;

    if (amplitude > audioThreshold) {
      const centerX = 12;
      const centerY = 12;
      const timeOffset = frameIndex * 0.2;
      const pulseRadius = (timeOffset * normalizedAmplitude * 0.5) % 12;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - centerY) ** 2 + (col - centerX) ** 2);
          const maxDistance = 12;

          if (distance <= maxDistance) {
            // Create pulse rings
            const ringDistance = Math.abs(distance - pulseRadius);
            const ringIntensity = Math.max(0, 1 - ringDistance) * normalizedAmplitude * 0.8;

            // Add multiple rings
            const ring2Distance = Math.abs(distance - pulseRadius * 0.6);
            const ring2Intensity = Math.max(0, 1 - ring2Distance) * normalizedAmplitude * 0.4;

            const finalIntensity = Math.max(ringIntensity, ring2Intensity);
            const finalBrightness = Math.round(4095 * finalIntensity);
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
    totalFrames: number
  ): number[][] {
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

    const maxAmplitude = 0.3;
    const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
    const audioThreshold = 0.01;

    if (amplitude > audioThreshold) {
      const timeOffset = frameIndex * 0.12;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - 12) ** 2 + (col - 12) ** 2);
          const maxDistance = 12;

          if (distance <= maxDistance) {
            const wave1 = Math.sin((row + col) * 0.3 + timeOffset) * 0.5 + 0.5;
            const wave2 = Math.sin((row - col) * 0.4 + timeOffset * 0.7) * 0.5 + 0.5;
            const wave3 = Math.sin(distance * 0.5 + timeOffset * 1.2) * 0.5 + 0.5;

            // Combine waves with audio intensity
            const trippyIntensity = ((wave1 + wave2 + wave3) / 3) * normalizedAmplitude * 0.8;

            const finalBrightness = Math.round(4095 * trippyIntensity);
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
    totalFrames: number
  ): number[][] {
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

    const maxAmplitude = 0.3;
    const normalizedAmplitude = Math.min(amplitude / maxAmplitude, 1.0);
    const audioThreshold = 0.01;

    if (amplitude > audioThreshold) {
      const centerX = 12;
      const centerY = 12;
      const timeOffset = frameIndex * 0.15;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - centerY) ** 2 + (col - centerX) ** 2);
          const maxDistance = 12;

          if (distance <= maxDistance) {
            // Calculate angle from center
            const angle = Math.atan2(row - centerY, col - centerX);

            // Create 3-star pattern (120 degrees apart)
            const starAngle1 = Math.sin(angle * 3 + timeOffset) * 0.5 + 0.5;
            const starAngle2 = Math.sin((angle + (Math.PI * 2) / 3) * 3 + timeOffset) * 0.5 + 0.5;
            const starAngle3 = Math.sin((angle + (Math.PI * 4) / 3) * 3 + timeOffset) * 0.5 + 0.5;

            // Create waveform along each star axis
            const waveform1 = Math.sin((distance - timeOffset * 2) * 0.8) * 0.5 + 0.5;
            const waveform2 = Math.sin((distance - timeOffset * 2 + 2) * 0.8) * 0.5 + 0.5;
            const waveform3 = Math.sin((distance - timeOffset * 2 + 4) * 0.8) * 0.5 + 0.5;

            // Combine star pattern with waveforms
            const starIntensity = (starAngle1 + starAngle2 + starAngle3) / 3;
            const waveformIntensity = (waveform1 + waveform2 + waveform3) / 3;

            // Combine with distance and audio intensity
            const distanceFactor = Math.max(0, 1 - distance / maxDistance);
            const mirrorIntensity =
              starIntensity * waveformIntensity * distanceFactor * normalizedAmplitude * 0.8;

            const finalBrightness = Math.round(4095 * mirrorIntensity);
            brightnessMap[row][col] = finalBrightness;
          }
        }
      }
    } else {
      // When audio is silent, show a dim 3-star pattern
      const centerX = 12;
      const centerY = 12;
      const timeOffset = frameIndex * 0.05;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const distance = Math.sqrt((row - centerY) ** 2 + (col - centerX) ** 2);
          if (distance <= 12) {
            const angle = Math.atan2(row - centerY, col - centerX);
            const starAngle1 = Math.sin(angle * 3 + timeOffset) * 0.3 + 0.7;
            const starAngle2 = Math.sin((angle + (Math.PI * 2) / 3) * 3 + timeOffset) * 0.3 + 0.7;
            const starAngle3 = Math.sin((angle + (Math.PI * 4) / 3) * 3 + timeOffset) * 0.3 + 0.7;

            const starIntensity = (starAngle1 + starAngle2 + starAngle3) / 3;
            const distanceFactor = Math.max(0, 1 - distance / 12);
            brightnessMap[row][col] = Math.round(4095 * starIntensity * distanceFactor * 0.1);
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
