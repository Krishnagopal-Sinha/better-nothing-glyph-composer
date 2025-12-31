import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import ffmpegService from './ffmpeg_service';

export interface VideoSettings {
  gamma: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  threshold: number;
  inversion: boolean;
}

export interface CropSettings {
  x: number; // Center X in pixels
  y: number; // Center Y in pixels
  radius: number; // Radius in pixels
  scale: number; // Scale factor
  videoWidth: number; // Original video width
  videoHeight: number; // Original video height
}

export interface FrameAnalysis {
  frameNumber: number;
  timestamp: number;
  brightnessMap: number[][];
}

export interface NP3DisplayFrame {
  timestamp: number;
  pixelStates: boolean[];
  brightnessValues: number[];
}

export interface VideoProcessingResult {
  audioFile: File;
  processedVideoFile: File;
  frameAnalyses: FrameAnalysis[];
  displayFrames: NP3DisplayFrame[];
  totalFrames: number;
  duration: number;
  fps: number;
  displayDuration: number;
  originalFileType: 'video' | 'audio'; // Track original file type
}

/**
 * Video Editor Service - Handles all video editing capabilities using FFmpeg.wasm
 */
export class VideoEditorService {
  private static instance: VideoEditorService;
  private isProcessing = false;
  private processingProgress = 0;

  static getInstance(): VideoEditorService {
    if (!VideoEditorService.instance) {
      VideoEditorService.instance = new VideoEditorService();
    }
    return VideoEditorService.instance;
  }

  /**
   * Ensure FFmpeg is loaded and ready
   */
  async ensureFFmpegLoaded(): Promise<void> {
    try {
      await ffmpegService.load();
      console.log('VideoEditorService: FFmpeg loaded successfully via shared service');
    } catch (error) {
      console.error('VideoEditorService: Failed to load FFmpeg via shared service:', error);
      throw new Error('Failed to load FFmpeg via shared service');
    }
  }

  /**
   * Get the shared FFmpeg instance
   */
  private getFFmpegInstance(): FFmpeg {
    return ffmpegService.getFFmpegInstance();
  }

  /**
   * Process video file with crop settings using FFmpeg
   */
  async processVideoForNP3(
    videoFile: File,
    cropSettings: CropSettings
  ): Promise<VideoProcessingResult> {
    this.isProcessing = true;
    this.processingProgress = 0;

    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
      this.isProcessing = false;
      this.processingProgress = 0;
      throw new Error('FFmpeg processing timed out after 120 seconds');
    }, 120000); // 2 minute timeout

    try {
      // Ensure FFmpeg is loaded
      await this.ensureFFmpegLoaded();

      if (!this.getFFmpegInstance()) {
        throw new Error('FFmpeg not loaded');
      }

      // Write input file to FFmpeg FS
      try {
        const fileData = await fetchFile(videoFile);
        await this.getFFmpegInstance().writeFile('input.mp4', fileData);
        this.processingProgress = 5;
      } catch (error) {
        console.error('Error writing input file:', error);
        throw new Error(
          `Failed to write input file: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Get video info
      try {
        await this.getFFmpegInstance().exec(['-i', 'input.mp4', '-f', 'null', '-']);
        // Video duration is handled via frame counting instead
        this.processingProgress = 10;
      } catch (error) {
        console.error('Error getting video info:', error);
        throw new Error(
          `Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Extract frames with circular crop and 60fps
      // Add progress callback for frame processing
      this.getFFmpegInstance().on('progress', ({ progress }) => {
        this.processingProgress = 10 + progress * 40; // 10% to 50%
      });

      try {
        // Calculate crop parameters based on cropSettings
        const { x, y, radius, scale, videoWidth, videoHeight } = cropSettings;

        // Apply scale to radius
        const scaledRadius = radius * scale;

        // Calculate crop dimensions and position (already in pixels)
        const cropSize = Math.floor(scaledRadius * 2);
        const cropX = Math.max(0, Math.floor(x - scaledRadius));
        const cropY = Math.max(0, Math.floor(y - scaledRadius));

        // Ensure crop doesn't exceed video boundaries
        const maxCropX = Math.min(cropX, videoWidth - cropSize);
        const maxCropY = Math.min(cropY, videoHeight - cropSize);
        const finalCropSize = Math.min(
          cropSize,
          Math.min(videoWidth - maxCropX, videoHeight - maxCropY)
        );

        // Simplified approach: Just crop to square and extract frames at 60fps
        await this.getFFmpegInstance().exec([
          '-i',
          'input.mp4',
          '-vf',
          `crop=${finalCropSize}:${finalCropSize}:${maxCropX}:${maxCropY},fps=60`,
          '-y',
          'frame_%04d.png'
        ]);
        this.processingProgress = 50;
      } catch (error) {
        console.error('Error during frame extraction:', error);

        // If crop fails, try without cropping to test basic frame extraction
        try {
          await this.getFFmpegInstance().exec([
            '-i',
            'input.mp4',
            '-vf',
            'fps=60',
            '-y',
            'frame_%04d.png'
          ]);
          this.processingProgress = 50;
        } catch (basicError) {
          console.error('Basic frame extraction also failed:', basicError);
          throw new Error(
            `Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Extract audio using the same FFmpeg instance
      let audioExtracted = false;
      let audioFileName = '';

      try {
        // Extract audio as WAV format for maximum browser compatibility
        await this.getFFmpegInstance().exec([
          '-i',
          'input.mp4',
          '-vn', // No video
          '-acodec',
          'pcm_s16le', // PCM audio codec
          '-ar',
          '44100', // Sample rate
          '-ac',
          '2', // 2 channels
          '-f',
          'wav', // Force WAV format
          '-y', // Overwrite output file
          'audio.wav'
        ]);
        audioExtracted = true;
        audioFileName = 'audio.wav';
        this.processingProgress = 60;
      } catch (error) {
        console.error('WAV audio extraction failed:', error);
        audioExtracted = false;
      }

      // Read frame files
      let frameFiles: any[] = [];
      let pngFrames: any[] = [];
      try {
        frameFiles = await this.getFFmpegInstance().listDir('/');
        pngFrames = frameFiles.filter(
          (f) => f.name.startsWith('frame_') && f.name.endsWith('.png')
        );

        if (pngFrames.length === 0) {
          // Try a very basic frame extraction as last resort
          try {
            await this.getFFmpegInstance().exec([
              '-i',
              'input.mp4',
              '-vf',
              'fps=60',
              'frame_%04d.png'
            ]);

            // Check again
            const newFrameFiles = await this.getFFmpegInstance().listDir('/');
            const newPngFrames = newFrameFiles.filter(
              (f) => f.name.startsWith('frame_') && f.name.endsWith('.png')
            );

            if (newPngFrames.length > 0) {
              pngFrames = newPngFrames.sort((a, b) => a.name.localeCompare(b.name));
            }
          } catch (basicError) {
            console.error('Basic frame extraction failed:', basicError);
          }

          if (pngFrames.length === 0) {
            throw new Error(
              'No frames were generated by FFmpeg. This could be due to an unsupported video format or corrupted file.'
            );
          }
        }

        // Sort frames by name
        pngFrames.sort((a, b) => a.name.localeCompare(b.name));
        this.processingProgress = 70;
      } catch (error) {
        console.error('Error reading frame files:', error);
        throw new Error(
          `Failed to read frame files: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Calculate actual duration based on frame count (do this after frame reading)
      const fps = 60; // Fixed 60 FPS
      const frameInterval = 1000 / fps; // milliseconds per frame

      if (!audioExtracted) {
        console.warn('Audio extraction failed, creating minimal silent WAV...');
        // Create a minimal silent WAV file directly
        // Calculate duration from frame count
        const actualVideoDurationSeconds = (pngFrames.length * frameInterval) / 1000; // Convert ms to seconds
        const silentWavData = this.createMinimalSilentAudio(actualVideoDurationSeconds);
        await this.getFFmpegInstance().writeFile('audio.wav', silentWavData);
        audioFileName = 'audio.wav';
        audioExtracted = true;
      }

      // Create frame analyses with brightness maps
      const frameAnalyses: FrameAnalysis[] = [];
      const displayFrames: NP3DisplayFrame[] = [];

      for (let i = 0; i < pngFrames.length; i++) {
        try {
          const frameData = await this.getFFmpegInstance().readFile(pngFrames[i].name);

          // Convert to Uint8Array if needed
          let imageDataArray: Uint8Array;
          if (frameData instanceof Uint8Array) {
            imageDataArray = frameData;
          } else if (typeof frameData === 'string') {
            // Convert string to Uint8Array if needed
            imageDataArray = new TextEncoder().encode(frameData);
          } else {
            // Assume it's an ArrayBuffer or ArrayLike
            imageDataArray = new Uint8Array(frameData as ArrayBuffer);
          }

          const brightnessMap = await this.createBrightnessMapFromImageData(imageDataArray);

          const frameAnalysis: FrameAnalysis = {
            frameNumber: i,
            timestamp: i * frameInterval,
            brightnessMap
          };

          frameAnalyses.push(frameAnalysis);

          // Create display frame from frame analysis
          const displayFrame = this.createDisplayFrame(frameAnalysis);
          displayFrames.push(displayFrame);

          // Update progress during frame processing
          this.processingProgress = 70 + ((i + 1) / pngFrames.length) * 20; // 70% to 90%
        } catch (error) {
          console.error(`Error processing frame ${i}:`, error);
          // Create fallback frame with zeros
          const fallbackBrightnessMap = Array(25)
            .fill(0)
            .map(() => Array(25).fill(0));
          const frameAnalysis: FrameAnalysis = {
            frameNumber: i,
            timestamp: i * frameInterval,
            brightnessMap: fallbackBrightnessMap
          };
          frameAnalyses.push(frameAnalysis);

          const displayFrame = this.createDisplayFrame(frameAnalysis);
          displayFrames.push(displayFrame);
        }
      }

      // Read audio file
      console.log('Reading audio file...');
      let audioData: any;
      let audioFile: File;
      try {
        // Read the audio file we created
        audioData = await this.getFFmpegInstance().readFile(audioFileName);
        const audioFileLength =
          audioData instanceof Uint8Array ? audioData.byteLength : audioData.length;
        console.log(`Audio file read successfully: ${audioFileName}, size:`, audioFileLength);

        if (audioFileLength > 100) {
          // Determine MIME type based on filename
          const mimeType = audioFileName.endsWith('.mp3') ? 'audio/mp3' : 'audio/wav';
          audioFile = new File([audioData], audioFileName, { type: mimeType });
        } else {
          throw new Error('Audio file is empty');
        }
      } catch (error) {
        console.error('Error reading audio file:', error);
        console.warn('Creating final fallback silent audio...');
        // Final fallback: create a minimal WAV file
        const videoDurationSeconds = (pngFrames.length * frameInterval) / 1000; // Convert ms to seconds
        const silentWavData = this.createMinimalSilentAudio(videoDurationSeconds);
        // Create new Uint8Array to ensure ArrayBuffer backing for BlobPart compatibility
        audioFile = new File([new Uint8Array(silentWavData)], 'audio.wav', { type: 'audio/wav' });
      }

      // Create processed video file (use first frame as representative)
      console.log('Reading first frame for processed video file...');
      let firstFrameData: any;
      try {
        firstFrameData = await this.getFFmpegInstance().readFile(pngFrames[0].name);
        console.log('First frame read successfully, size:', firstFrameData.byteLength);
      } catch (error) {
        console.error('Error reading first frame:', error);
        throw new Error(
          `Failed to read first frame: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
      const processedVideoFile = new File([firstFrameData], 'processed_video.png', {
        type: 'image/png'
      });

      // Clean up FFmpeg filesystem
      console.log('Cleaning up FFmpeg filesystem...');
      try {
        await this.getFFmpegInstance().deleteFile('input.mp4');
        // console.log('Deleted input.mp4');
      } catch (error) {
        console.warn('Could not delete input.mp4:', error);
      }

      // Clean up audio file
      try {
        await this.getFFmpegInstance().deleteFile(audioFileName);
        // console.log(`Deleted ${audioFileName}`);
      } catch (error) {
        console.warn(`Could not delete ${audioFileName}:`, error);
      }

      // Clean up all frame files
      try {
        const remainingFiles = await this.getFFmpegInstance().listDir('/');
        const allFrameFiles = remainingFiles.filter(
          (f) =>
            (f.name.startsWith('frame_') || f.name.startsWith('cropped_frame_')) &&
            f.name.endsWith('.png')
        );

        for (const frame of allFrameFiles) {
          try {
            await this.getFFmpegInstance().deleteFile(frame.name);
            //  For Debug

            //     console.log(`Deleted ${frame.name}`);
          } catch (error) {
            console.warn(`Could not delete ${frame.name}:`, error);
          }
        }
      } catch (error) {
        console.warn('Could not list files for cleanup:', error);

        // Fallback: try to delete frame files by name pattern
        for (const frame of pngFrames) {
          try {
            await this.getFFmpegInstance().deleteFile(frame.name);
            // console.log(`Deleted ${frame.name}`);
          } catch (error) {
            console.warn(`Could not delete ${frame.name}:`, error);
          }
        }
      }

      this.processingProgress = 100;
      console.log('FFmpeg processing completed successfully');

      // Clear timeout since processing completed successfully
      clearTimeout(timeout);

      const result: VideoProcessingResult = {
        audioFile,
        processedVideoFile,
        frameAnalyses,
        displayFrames,
        totalFrames: pngFrames.length,
        duration: pngFrames.length * frameInterval, // Use actual calculated duration
        fps,
        displayDuration: pngFrames.length * frameInterval,
        originalFileType: 'video' // Assuming the input was a video for now
      };

      return result;
    } catch (error) {
      console.error('FFmpeg video processing failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      clearTimeout(timeout);
      throw error;
    } finally {
      this.isProcessing = false;
      this.processingProgress = 0;
    }
  }

  /**
   * Create brightness map from image data
   */
  private async createBrightnessMapFromImageData(imageData: Uint8Array): Promise<number[][]> {
    return new Promise((resolve) => {
      try {
        // Create blob and image from the PNG data
        // Create new Uint8Array to ensure ArrayBuffer backing for BlobPart compatibility
        const blob = new Blob([new Uint8Array(imageData)], { type: 'image/png' });
        const img = new Image();

        img.onload = () => {
          // Create canvas to analyze the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            console.warn('Could not get canvas context, using fallback');
            // Create empty brightness map as fallback
            const fallbackMap: number[][] = [];
            for (let row = 0; row < 25; row++) {
              fallbackMap[row] = [];
              for (let col = 0; col < 25; col++) {
                fallbackMap[row][col] = 0;
              }
            }
            resolve(fallbackMap);
            return;
          }

          // Set canvas size to 25x25 for direct mapping
          canvas.width = 25;
          canvas.height = 25;

          // Draw and scale the image to 25x25
          ctx.drawImage(img, 0, 0, 25, 25);

          // Get pixel data
          const imageDataObj = ctx.getImageData(0, 0, 25, 25);
          const pixels = imageDataObj.data;

          // Create brightness map
          const brightnessMap: number[][] = [];
          for (let row = 0; row < 25; row++) {
            brightnessMap[row] = [];
            for (let col = 0; col < 25; col++) {
              const pixelIndex = (row * 25 + col) * 4; // RGBA format
              const r = pixels[pixelIndex];
              const g = pixels[pixelIndex + 1];
              const b = pixels[pixelIndex + 2];

              // Calculate luminance (perceived brightness)
              const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
              brightnessMap[row][col] = brightness;
            }
          }

          resolve(brightnessMap);
        };

        img.onerror = () => {
          console.warn('Could not load image, using fallback');
          // Create empty brightness map as fallback
          const fallbackMap: number[][] = [];
          for (let row = 0; row < 25; row++) {
            fallbackMap[row] = [];
            for (let col = 0; col < 25; col++) {
              fallbackMap[row][col] = 0;
            }
          }
          resolve(fallbackMap);
        };

        // Load the image
        img.src = URL.createObjectURL(blob);
      } catch (error) {
        console.error('Error analyzing frame data:', error);
        // Create empty brightness map as fallback
        const fallbackMap: number[][] = [];
        for (let row = 0; row < 25; row++) {
          fallbackMap[row] = [];
          for (let col = 0; col < 25; col++) {
            fallbackMap[row][col] = 0;
          }
        }
        resolve(fallbackMap);
      }
    });
  }

  /**
   * Create display frame from frame analysis
   */
  private createDisplayFrame(frameAnalysis: FrameAnalysis): NP3DisplayFrame {
    const { brightnessMap } = frameAnalysis;
    const pixelStates: boolean[] = [];
    const brightnessValues: number[] = [];

    // Process 25x25 brightness map to create 625 pixel states
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const brightness = brightnessMap[row][col];
        const pixelIndex = this.getPixelIndex(row, col);

        // Convert brightness to pixel state (threshold-based)
        const threshold = 128; // You can adjust this threshold
        const pixelState = brightness > threshold;

        pixelStates[pixelIndex] = pixelState;
        brightnessValues[pixelIndex] = brightness;
      }
    }

    return {
      timestamp: frameAnalysis.timestamp,
      pixelStates,
      brightnessValues
    };
  }

  /**
   * Get pixel index from row and column
   */
  private getPixelIndex(row: number, col: number): number {
    return row * 25 + col;
  }

  /**
   * Create a minimal silent audio file (WAV)
   */
  private createMinimalSilentAudio(durationSeconds: number): Uint8Array {
    // Create a proper WAV file that browsers can handle
    const sampleRate = 44100;
    const numChannels = 2;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;

    // Calculate audio data size
    const numSamples = Math.floor(durationSeconds * sampleRate);
    const audioDataSize = numSamples * blockAlign;

    // WAV file structure: 44-byte header + audio data
    const totalSize = 44 + audioDataSize;
    const wavFile = new Uint8Array(totalSize);

    // RIFF header (12 bytes)
    wavFile.set([0x52, 0x49, 0x46, 0x46]); // "RIFF"
    // File size (4 bytes) - total size - 8
    const fileSize = totalSize - 8;
    wavFile[4] = fileSize & 0xff;
    wavFile[5] = (fileSize >> 8) & 0xff;
    wavFile[6] = (fileSize >> 16) & 0xff;
    wavFile[7] = (fileSize >> 24) & 0xff;
    wavFile.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

    // fmt chunk (24 bytes)
    wavFile.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
    // Subchunk1Size (4 bytes) - 16 for PCM
    wavFile[16] = 16;
    wavFile[17] = 0;
    wavFile[18] = 0;
    wavFile[19] = 0;
    // AudioFormat (2 bytes) - 1 for PCM
    wavFile[20] = 1;
    wavFile[21] = 0;
    // NumChannels (2 bytes)
    wavFile[22] = numChannels;
    wavFile[23] = 0;
    // SampleRate (4 bytes) - little endian
    wavFile[24] = sampleRate & 0xff;
    wavFile[25] = (sampleRate >> 8) & 0xff;
    wavFile[26] = (sampleRate >> 16) & 0xff;
    wavFile[27] = (sampleRate >> 24) & 0xff;
    // ByteRate (4 bytes) - little endian
    wavFile[28] = byteRate & 0xff;
    wavFile[29] = (byteRate >> 8) & 0xff;
    wavFile[30] = (byteRate >> 16) & 0xff;
    wavFile[31] = (byteRate >> 24) & 0xff;
    // BlockAlign (2 bytes) - little endian
    wavFile[32] = blockAlign;
    wavFile[33] = 0;
    // BitsPerSample (2 bytes) - little endian
    wavFile[34] = bitsPerSample;
    wavFile[35] = 0;

    // data chunk (8 + audio data bytes)
    wavFile.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
    // Subchunk2Size (4 bytes) - audio data size (little endian)
    wavFile[40] = audioDataSize & 0xff;
    wavFile[41] = (audioDataSize >> 8) & 0xff;
    wavFile[42] = (audioDataSize >> 16) & 0xff;
    wavFile[43] = (audioDataSize >> 24) & 0xff;

    // Audio data (silent - all zeros)
    // The audio data starts at byte 44 and is already initialized to 0

    console.log(
      `Created minimal silent WAV file: ${durationSeconds}s, ${totalSize} bytes, ${numSamples} samples`
    );
    return wavFile;
  }

  /**
   * Get current processing progress (0-100)
   * @returns Progress percentage
   */
  getProgress(): number {
    return this.processingProgress;
  }

  /**
   * Check if video is currently being processed
   * @returns True if processing, false otherwise
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

export default VideoEditorService;
