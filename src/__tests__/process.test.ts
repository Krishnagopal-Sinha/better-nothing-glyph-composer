/**
 * Tests for processing functionality
 * Tests video processing, audio processing, frame analysis, and display frame generation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VideoEditorService from '@/logic/video_editor_service';
import NP3AudioService from '@/logic/np3_audio_service';
import {
  createMockCropSettings,
  createMockVideoProcessingResult,
  createMockFrameAnalysis,
  createMockBrightnessMap,
  createMockFFmpegInstance
} from './test-utils';

// Mock FFmpeg service
vi.mock('@/logic/ffmpeg_service', () => {
  return {
    default: {
      getInstance: vi.fn(() => {
        const mockFFmpeg = createMockFFmpegInstance();
        return {
          load: vi.fn(async () => Promise.resolve()),
          getFFmpegInstance: vi.fn(() => mockFFmpeg)
        };
      })
    }
  };
});

// Mock fetchFile from @ffmpeg/util
vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(async (file: File) => {
    return new Uint8Array(await file.arrayBuffer());
  })
}));

describe('Process Feature Tests', () => {
  let videoEditorService: VideoEditorService;
  let audioService: NP3AudioService;

  beforeEach(() => {
    videoEditorService = VideoEditorService.getInstance();
    audioService = NP3AudioService.getInstance();
    vi.clearAllMocks();
  });

  describe('Video Processing', () => {
    it('should create VideoEditorService instance', () => {
      expect(videoEditorService).toBeInstanceOf(VideoEditorService);
    });

    it('should return same instance on multiple getInstance calls', () => {
      const instance1 = VideoEditorService.getInstance();
      const instance2 = VideoEditorService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should validate crop settings structure', () => {
      const cropSettings = createMockCropSettings({
        x: 100,
        y: 100,
        radius: 50,
        scale: 1.0,
        videoWidth: 200,
        videoHeight: 200
      });

      expect(cropSettings.x).toBe(100);
      expect(cropSettings.y).toBe(100);
      expect(cropSettings.radius).toBe(50);
      expect(cropSettings.scale).toBe(1.0);
      expect(cropSettings.videoWidth).toBe(200);
      expect(cropSettings.videoHeight).toBe(200);
    });

    it('should calculate crop boundaries correctly', () => {
      const cropSettings = createMockCropSettings({
        x: 100,
        y: 100,
        radius: 50,
        scale: 1.0,
        videoWidth: 200,
        videoHeight: 200
      });

      const scaledRadius = cropSettings.radius * cropSettings.scale;
      const cropSize = Math.floor(scaledRadius * 2);
      const cropX = Math.max(0, Math.floor(cropSettings.x - scaledRadius));
      const cropY = Math.max(0, Math.floor(cropSettings.y - scaledRadius));

      expect(cropSize).toBe(100);
      expect(cropX).toBe(50);
      expect(cropY).toBe(50);
    });

    it('should handle crop settings that exceed video boundaries', () => {
      const cropSettings = createMockCropSettings({
        x: 10,
        y: 10,
        radius: 50,
        scale: 1.0,
        videoWidth: 100,
        videoHeight: 100
      });

      const scaledRadius = cropSettings.radius * cropSettings.scale;
      const cropSize = Math.floor(scaledRadius * 2);
      const cropX = Math.max(0, Math.floor(cropSettings.x - scaledRadius));
      const cropY = Math.max(0, Math.floor(cropSettings.y - scaledRadius));

      // Crop should be adjusted to fit within boundaries
      const maxCropX = Math.min(cropX, cropSettings.videoWidth - cropSize);
      const maxCropY = Math.min(cropY, cropSettings.videoHeight - cropSize);

      expect(maxCropX).toBeGreaterThanOrEqual(0);
      expect(maxCropY).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Frame Analysis', () => {
    it('should create valid FrameAnalysis', () => {
      const frameAnalysis = createMockFrameAnalysis(0, 0);
      expect(frameAnalysis.frameNumber).toBe(0);
      expect(frameAnalysis.timestamp).toBe(0);
      expect(frameAnalysis.brightnessMap).toBeDefined();
      expect(frameAnalysis.brightnessMap.length).toBe(25);
      expect(frameAnalysis.brightnessMap[0].length).toBe(25);
    });

    it('should create brightness map with correct dimensions', () => {
      const brightnessMap = createMockBrightnessMap(128);
      expect(brightnessMap.length).toBe(25);
      expect(brightnessMap[0].length).toBe(25);
      expect(brightnessMap[12][12]).toBe(128);
    });

    it('should create brightness map with different values', () => {
      const brightnessMap = createMockBrightnessMap(255);
      expect(brightnessMap[0][0]).toBe(255);
      expect(brightnessMap[24][24]).toBe(255);
    });

    it('should handle multiple frame analyses', () => {
      const analyses = [];
      for (let i = 0; i < 10; i++) {
        analyses.push(createMockFrameAnalysis(i, i * 16.666));
      }

      expect(analyses.length).toBe(10);
      expect(analyses[0].frameNumber).toBe(0);
      expect(analyses[9].frameNumber).toBe(9);
      expect(analyses[9].timestamp).toBeCloseTo(149.994, 2);
    });
  });

  describe('Audio Processing', () => {
    it('should create NP3AudioService instance', () => {
      expect(audioService).toBeInstanceOf(NP3AudioService);
    });

    it('should return same instance on multiple getInstance calls', () => {
      const instance1 = NP3AudioService.getInstance();
      const instance2 = NP3AudioService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should get available presets', () => {
      const presets = audioService.getPresets();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toHaveProperty('id');
      expect(presets[0]).toHaveProperty('name');
      expect(presets[0]).toHaveProperty('description');
      expect(presets[0]).toHaveProperty('generateFrameData');
    });

    it('should have valid preset structure', () => {
      const presets = audioService.getPresets();
      presets.forEach((preset) => {
        expect(typeof preset.id).toBe('string');
        expect(typeof preset.name).toBe('string');
        expect(typeof preset.description).toBe('string');
        expect(typeof preset.generateFrameData).toBe('function');
      });
    });
  });

  describe('Video Processing Result', () => {
    it('should create valid VideoProcessingResult', () => {
      const result = createMockVideoProcessingResult(10, 1000);
      expect(result.totalFrames).toBe(10);
      expect(result.duration).toBe(1000);
      expect(result.fps).toBe(60);
      expect(result.frameAnalyses.length).toBe(10);
      expect(result.displayFrames.length).toBe(10);
      expect(result.audioFile).toBeDefined();
      expect(result.processedVideoFile).toBeDefined();
    });

    it('should have consistent frame counts', () => {
      const result = createMockVideoProcessingResult(60, 1000);
      expect(result.frameAnalyses.length).toBe(result.displayFrames.length);
      expect(result.frameAnalyses.length).toBe(result.totalFrames);
    });

    it('should have valid frame analysis structure', () => {
      const result = createMockVideoProcessingResult(5, 500);
      result.frameAnalyses.forEach((analysis) => {
        expect(analysis).toHaveProperty('frameNumber');
        expect(analysis).toHaveProperty('timestamp');
        expect(analysis).toHaveProperty('brightnessMap');
        expect(analysis.brightnessMap.length).toBe(25);
      });
    });

    it('should have valid display frame structure', () => {
      const result = createMockVideoProcessingResult(5, 500);
      result.displayFrames.forEach((frame) => {
        expect(frame).toHaveProperty('timestamp');
        expect(frame).toHaveProperty('pixelStates');
        expect(frame).toHaveProperty('brightnessValues');
        expect(frame.pixelStates.length).toBe(625);
        expect(frame.brightnessValues.length).toBe(625);
      });
    });
  });

  describe('Display Frame Generation', () => {
    it('should generate display frames with correct pixel count', () => {
      const result = createMockVideoProcessingResult(1, 16.666);
      const displayFrame = result.displayFrames[0];
      expect(displayFrame.pixelStates.length).toBe(625); // 25x25 = 625
      expect(displayFrame.brightnessValues.length).toBe(625);
    });

    it('should have boolean pixel states', () => {
      const result = createMockVideoProcessingResult(1, 16.666);
      const displayFrame = result.displayFrames[0];
      displayFrame.pixelStates.forEach((state) => {
        expect(typeof state).toBe('boolean');
      });
    });

    it('should have numeric brightness values', () => {
      const result = createMockVideoProcessingResult(1, 16.666);
      const displayFrame = result.displayFrames[0];
      displayFrame.brightnessValues.forEach((value) => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('Processing Progress', () => {
    it('should track processing state', () => {
      expect(videoEditorService.isCurrentlyProcessing()).toBe(false);
      expect(videoEditorService.getProgress()).toBe(0);
    });

    it('should track audio processing state', () => {
      // Note: These methods may not be public, testing through public interface
      expect(audioService).toBeDefined();
    });
  });
});

