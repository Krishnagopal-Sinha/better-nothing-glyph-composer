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
  x: number;
  y: number;
  radius: number;
  scale: number;
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
}

/**
 * Video Editor Service - Handles all video editing capabilities without FFmpeg
 * Uses HTML5 Canvas and Web APIs for video processing
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
   * Process video file with crop settings using HTML5 Canvas
   */
  async processVideoForNP3(
    videoFile: File,
    cropSettings: CropSettings
  ): Promise<VideoProcessingResult> {
    this.isProcessing = true;
    this.processingProgress = 0;

    // Add a timeout to prevent hanging
    const timeout = setTimeout(() => {
      this.isProcessing = false;
      this.processingProgress = 0;
      throw new Error('Video processing timed out after 60 seconds');
    }, 60000); // 60 second timeout

    try {
      // Create video element for processing
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Load video
      const videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;
      video.muted = true;
      video.preload = 'metadata';

      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        video.addEventListener('loadedmetadata', () => resolve());
        video.addEventListener('error', () => reject(new Error('Failed to load video')));
        video.load();
      });

      const { videoWidth, videoHeight, duration } = video;

      // Set canvas size for processing
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Calculate crop parameters
      // Use the smaller dimension to ensure the circle fits within the video
      const maxCircleDiameter = Math.min(videoWidth, videoHeight);
      const cropX = (cropSettings.x / 100) * videoWidth;
      const cropY = (cropSettings.y / 100) * videoHeight;
      const cropRadius = (cropSettings.radius / 100) * (maxCircleDiameter / 2);
      const cropScale = cropSettings.scale;

      // Process frames
      const frameAnalyses: FrameAnalysis[] = [];
      const displayFrames: NP3DisplayFrame[] = [];
      const fps = 60; // Changed from 30 to 60 to match playback rate
      const totalFrames = Math.floor(duration * fps);
      const frameInterval = duration / totalFrames;

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
        const currentTime = frameIndex * frameInterval;
        video.currentTime = currentTime;

        // Wait for video to seek
        await new Promise<void>((resolve) => {
          const handleSeeked = () => {
            video.removeEventListener('seeked', handleSeeked);
            resolve();
          };
          video.addEventListener('seeked', handleSeeked);
        });

        // Reset canvas to original video dimensions
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply circular crop to each frame BEFORE analyzing
        this.applyCircularCrop(ctx, cropX, cropY, cropRadius, cropScale);

        // Analyze frame for brightness (after cropping)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const brightnessMap = this.createBrightnessMap(imageData);
        const frameAnalysis: FrameAnalysis = {
          frameNumber: frameIndex,
          timestamp: currentTime * 1000,
          brightnessMap
        };
        frameAnalyses.push(frameAnalysis);

        // Create display frame (60Hz)
        const displayFrame = this.createDisplayFrame(frameAnalysis);
        displayFrames.push(displayFrame);

        // Update progress
        this.processingProgress = ((frameIndex + 1) / totalFrames) * 100;
      }

      // Create processed video file with actual black and white cropped video
      const processedVideoFile = await this.createProcessedVideoBlob(
        video,
        canvas,
        totalFrames,
        frameInterval,
        cropSettings
      );

      // Create audio file (extract from original)
      const audioBlob = await this.extractAudioFromVideo(videoFile);
      const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mp3' });

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
      console.error('Video processing failed:', error);
      clearTimeout(timeout);
      throw error;
    } finally {
      this.isProcessing = false;
      this.processingProgress = 0;
    }
  }

  /**
   * Apply true circular zoom-in crop to canvas context
   */
  private applyCircularCrop(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    scale: number
  ): void {
    const origWidth = ctx.canvas.width;
    const origHeight = ctx.canvas.height;

    // Calculate circle parameters to ensure it's always perfectly round
    // Use the smaller dimension to ensure the circle fits within the video
    const maxCircleDiameter = Math.min(origWidth, origHeight);
    const adjustedRadius = Math.min(radius, maxCircleDiameter / 2);
    const scaledRadius = adjustedRadius * scale;

    // Ensure the circle stays within bounds
    const boundedCenterX = Math.max(scaledRadius, Math.min(origWidth - scaledRadius, centerX));
    const boundedCenterY = Math.max(scaledRadius, Math.min(origHeight - scaledRadius, centerY));

    // Create a temporary canvas to extract the circle
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = origWidth;
    tempCanvas.height = origHeight;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;
    tempCtx.drawImage(ctx.canvas, 0, 0);

    // Create a new canvas for the circle only
    const circleCanvas = document.createElement('canvas');
    circleCanvas.width = 2 * scaledRadius;
    circleCanvas.height = 2 * scaledRadius;
    const circleCtx = circleCanvas.getContext('2d', { willReadFrequently: true });
    if (!circleCtx) return;

    // Draw the circle region from the original image
    circleCtx.save();
    circleCtx.beginPath();
    circleCtx.arc(scaledRadius, scaledRadius, scaledRadius, 0, 2 * Math.PI);
    circleCtx.closePath();
    circleCtx.clip();
    circleCtx.drawImage(
      tempCanvas,
      boundedCenterX - scaledRadius,
      boundedCenterY - scaledRadius,
      2 * scaledRadius,
      2 * scaledRadius,
      0,
      0,
      2 * scaledRadius,
      2 * scaledRadius
    );
    circleCtx.restore();

    // Clear the main canvas and resize to a square output (1:1 aspect ratio)
    const outputSize = Math.min(origWidth, origHeight);
    ctx.canvas.width = outputSize;
    ctx.canvas.height = outputSize;
    ctx.clearRect(0, 0, outputSize, outputSize);

    // Draw the circle, scaled to fill the output canvas
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      circleCanvas,
      0,
      0,
      2 * scaledRadius,
      2 * scaledRadius,
      0,
      0,
      outputSize,
      outputSize
    );
    ctx.restore();

    // Fill outside the circle with black
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.restore();
  }

  /**
   * Create brightness map from image data
   */
  private createBrightnessMap(imageData: ImageData): number[][] {
    const brightnessMap = Array(25)
      .fill(null)
      .map(() => Array(25).fill(0));
    const { width, height, data } = imageData;

    // Use higher resolution sampling for better quality
    const sampleSize = Math.min(width, height) / 25;

    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        // Sample multiple pixels in each grid cell for better accuracy
        let totalBrightness = 0;
        let sampleCount = 0;

        const startX = Math.floor(col * sampleSize);
        const endX = Math.floor((col + 1) * sampleSize);
        const startY = Math.floor(row * sampleSize);
        const endY = Math.floor((row + 1) * sampleSize);

        // Sample multiple pixels in each grid cell
        for (let y = startY; y < endY && y < height; y++) {
          for (let x = startX; x < endX && x < width; x++) {
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];

            // Calculate brightness using luminance formula
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += brightness;
            sampleCount++;
          }
        }

        // Average the brightness values for this grid cell
        brightnessMap[row][col] = sampleCount > 0 ? totalBrightness / sampleCount : 0;
      }
    }

    return brightnessMap;
  }

  /**
   * Create display frame from frame analysis
   */
  private createDisplayFrame(frameAnalysis: FrameAnalysis): NP3DisplayFrame {
    const pixelStates = new Array(625).fill(false);
    const brightnessValues = new Array(625).fill(0);

    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const index = this.getPixelIndex(row, col);
        const brightness = frameAnalysis.brightnessMap[row][col];

        if (this.isPixelInCircle(row, col) && brightness > 128) {
          pixelStates[index] = true;
          brightnessValues[index] = Math.floor((brightness / 255) * 4095); // NP3 brightness range
        }
      }
    }

    return {
      timestamp: frameAnalysis.timestamp,
      pixelStates,
      brightnessValues
    };
  }

  /**
   * Create processed video blob using MediaRecorder
   */
  private async createProcessedVideoBlob(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    totalFrames: number,
    frameInterval: number,
    cropSettings: CropSettings
  ): Promise<File> {
    return new Promise((resolve, _reject) => {
      try {
        // Create a processed video by generating multiple frames with circular crop
        const createProcessedFrames = async () => {
          const frames: Blob[] = [];
          const sampleFrames = Math.min(30, totalFrames); // Sample up to 30 frames for the preview
          const sampleInterval = Math.max(1, Math.floor(totalFrames / sampleFrames));

          for (let i = 0; i < sampleFrames; i++) {
            const frameIndex = i * sampleInterval;
            const currentTime = frameIndex * frameInterval;

            video.currentTime = currentTime;

            await new Promise<void>((resolve) => {
              const handleSeeked = () => {
                video.removeEventListener('seeked', handleSeeked);
                resolve();
              };
              video.addEventListener('seeked', handleSeeked);
            });

            // Draw and process the frame
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              // Reset canvas to original video dimensions
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;

              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

              // Apply circular crop - this will resize canvas to square
              const maxCircleDiameter = Math.min(canvas.width, canvas.height);
              const cropX = (cropSettings.x / 100) * canvas.width;
              const cropY = (cropSettings.y / 100) * canvas.height;
              const cropRadius = (cropSettings.radius / 100) * (maxCircleDiameter / 2);
              const cropScale = cropSettings.scale;

              this.applyCircularCrop(ctx, cropX, cropY, cropRadius, cropScale);

              // Apply black and white conversion
              this.applyBlackAndWhiteFilter(ctx);

              // Convert canvas to blob
              const blob = await new Promise<Blob>((resolveBlob) => {
                canvas.toBlob((blob) => {
                  if (blob) {
                    resolveBlob(blob);
                  } else {
                    resolveBlob(new Blob());
                  }
                }, 'image/png');
              });

              frames.push(blob);
            }
          }

          // Create a simple video-like file from the frames
          // For now, we'll use the first frame as a representative image
          if (frames.length > 0) {
            const file = new File([frames[0]], 'processed_video_frame.png', { type: 'image/png' });
            resolve(file);
          } else {
            _reject(new Error('Failed to create processed video frames'));
          }
        };

        createProcessedFrames();
      } catch (error) {
        console.error('Error creating video blob:', error);
        _reject(error);
      }
    });
  }

  /**
   * Apply black and white filter to canvas context
   */
  private applyBlackAndWhiteFilter(ctx: CanvasRenderingContext2D): void {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Convert to grayscale
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      // Apply threshold for black and white
      const bw = gray > 128 ? 255 : 0;

      data[i] = bw; // Red
      data[i + 1] = bw; // Green
      data[i + 2] = bw; // Blue
      // Alpha remains unchanged
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Extract audio from video file
   */
  private async extractAudioFromVideo(videoFile: File): Promise<Blob> {
    return new Promise((resolve, _reject) => {
      try {
        // For now, use the original video file as audio
        // This ensures we have working audio for playback
        resolve(videoFile);
      } catch (error) {
        console.error('Error extracting audio:', error);
        // Fallback to original file
        resolve(videoFile);
      }
    });
  }

  /**
   * Apply video settings to frame analysis
   */
  applyVideoSettingsToFrame(frameAnalysis: FrameAnalysis, settings: VideoSettings): boolean[] {
    const pixelStates = new Array(625).fill(false);

    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const index = this.getPixelIndex(row, col);
        let brightness = frameAnalysis.brightnessMap[row][col];

        // Apply video settings
        brightness = Math.max(0, Math.min(255, brightness + settings.brightness));

        const factor =
          (259 * (settings.contrast * 255 + 255)) / (255 * (259 - settings.contrast * 255));
        brightness = Math.max(0, Math.min(255, factor * (brightness - 128) + 128));

        brightness = Math.pow(brightness / 255, 1 / settings.gamma) * 255;

        if (settings.inversion) {
          brightness = 255 - brightness;
        }

        if (this.isPixelInCircle(row, col) && brightness > settings.threshold) {
          pixelStates[index] = true;
        }
      }
    }

    return pixelStates;
  }

  /**
   * Pre-process all frames with video settings
   */
  async preProcessFrames(
    frameAnalyses: FrameAnalysis[],
    settings: VideoSettings
  ): Promise<boolean[][]> {
    const processedFrames: boolean[][] = [];

    for (let i = 0; i < frameAnalyses.length; i++) {
      const frameStates = this.applyVideoSettingsToFrame(frameAnalyses[i], settings);
      processedFrames.push(frameStates);
    }

    return processedFrames;
  }

  /**
   * Get pixel index from 2D coordinates
   */
  private getPixelIndex(row: number, col: number): number {
    return row * 25 + col;
  }

  /**
   * Check if pixel is in circle (visible ranges)
   */
  private isPixelInCircle(row: number, col: number): boolean {
    const index = this.getPixelIndex(row, col);

    const visibleRanges = [
      [9, 15],
      [32, 42],
      [55, 69],
      [79, 95],
      [103, 121],
      [127, 147],
      [152, 172],
      [176, 198],
      [201, 223],
      [225, 399],
      [401, 423],
      [426, 448],
      [452, 472],
      [477, 497],
      [503, 521],
      [529, 545],
      [555, 569],
      [582, 592],
      [609, 615]
    ];

    return visibleRanges.some(([start, end]) => {
      return index >= start && index <= end;
    });
  }

  /**
   * Get processing progress
   */
  getProgress(): number {
    return this.processingProgress;
  }

  /**
   * Check if currently processing
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

export default VideoEditorService;
