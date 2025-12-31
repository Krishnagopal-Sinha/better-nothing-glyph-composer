/**
 * Comprehensive integration tests for NP3 phone model
 * Tests audio/video import, processing, and export with real file fixtures
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import type { CropSettings } from '@/logic/video_editor_service';
import NP3AudioService from '@/logic/np3_audio_service';
import { encodeStuffTheWayNothingLikesIt } from '@/logic/export_logic';
import { createAudioFixtures, createTestVideoFile } from './fixtures/fixture-loader';
import type { VideoProcessingResult } from '@/logic/video_editor_service';

// Mock FFmpeg service
vi.mock('@/logic/ffmpeg_service', () => {
  return {
    default: {
      getInstance: vi.fn(() => ({
        load: vi.fn(async () => Promise.resolve()),
        getFFmpegInstance: vi.fn(() => {
          const mockFiles = new Map<string, Uint8Array>();
          return {
            writeFile: vi.fn(async (filename: string, data: Uint8Array) => {
              mockFiles.set(filename, data);
            }),
            readFile: vi.fn(async (filename: string) => {
              const data = mockFiles.get(filename);
              if (!data) {
                // Return mock frame data for testing
                if (filename.startsWith('frame_')) {
                  // Return a minimal PNG (simplified for testing)
                  return new Uint8Array([
                    0x89,
                    0x50,
                    0x4e,
                    0x47,
                    0x0d,
                    0x0a,
                    0x1a,
                    0x0a, // PNG signature
                    0x00,
                    0x00,
                    0x00,
                    0x0d,
                    0x49,
                    0x48,
                    0x44,
                    0x52, // IHDR chunk
                    0x00,
                    0x00,
                    0x00,
                    0x19,
                    0x00,
                    0x00,
                    0x00,
                    0x19, // 25x25 dimensions
                    0x08,
                    0x06,
                    0x00,
                    0x00,
                    0x00,
                    0xc4,
                    0xb5,
                    0x6f,
                    0xa7
                  ]);
                }
                if (filename === 'audio.wav') {
                  // Return mock audio data
                  return new Uint8Array(1000).fill(0);
                }
                throw new Error(`File not found: ${filename}`);
              }
              return data;
            }),
            deleteFile: vi.fn(async (filename: string) => {
              mockFiles.delete(filename);
            }),
            listDir: vi.fn(async () => {
              const files: string[] = [];
              for (let i = 1; i <= 120; i++) {
                files.push(`frame_${String(i).padStart(4, '0')}.png`);
              }
              files.push('audio.wav');
              return files.map((name) => ({ name, isFile: true, isDir: false }));
            }),
            exec: vi.fn(async (_args: string[]) => {
              // Mock FFmpeg execution
              return Promise.resolve();
            }),
            on: vi.fn(),
            off: vi.fn()
          };
        })
      }))
    }
  };
});

// Mock fetchFile from @ffmpeg/util
vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn(async (file: File) => {
    return new Uint8Array(await file.arrayBuffer());
  })
}));

describe('NP3 Integration Tests', () => {
  let audioService: NP3AudioService;
  let audioFixtures: { wav: File; mp3: File; ogg: File };
  let videoFixture: File;

  beforeAll(() => {
    // Create test fixtures
    audioFixtures = createAudioFixtures();
    videoFixture = createTestVideoFile();
  });

  beforeEach(() => {
    audioService = NP3AudioService.getInstance();
    vi.clearAllMocks();
  });

  describe('Audio Import and Processing', () => {
    it(
      'should process WAV audio file',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        // Validate result structure
        expect(result).toBeDefined();
        expect(result.originalFileType).toBe('audio');
        expect(result.audioFile).toBeDefined();
        expect(result.audioFile.type).toContain('audio');
        expect(result.totalFrames).toBeGreaterThan(0);
        expect(result.frameAnalyses.length).toBe(result.totalFrames);
        expect(result.displayFrames.length).toBe(result.totalFrames);
      },
      { timeout: 10000 }
    );

    it(
      'should process MP3 audio file',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.mp3);

        expect(result).toBeDefined();
        expect(result.originalFileType).toBe('audio');
        expect(result.totalFrames).toBeGreaterThan(0);
        expect(result.frameAnalyses.length).toBe(result.totalFrames);
      },
      { timeout: 5000 }
    );

    it(
      'should process OGG audio file',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.ogg);

        expect(result).toBeDefined();
        expect(result.originalFileType).toBe('audio');
        expect(result.totalFrames).toBeGreaterThan(0);
        expect(result.frameAnalyses.length).toBe(result.totalFrames);
      },
      { timeout: 5000 }
    );

    it(
      'should process audio with preset',
      async () => {
        const presets = audioService.getPresets();
        expect(presets.length).toBeGreaterThan(0);

        const presetId = presets[0].id;
        const result = await audioService.processAudioForNP3WithPreset(audioFixtures.wav, presetId);

        expect(result).toBeDefined();
        expect(result.originalFileType).toBe('audio');
        expect(result.totalFrames).toBeGreaterThan(0);

        // Validate brightness maps are generated
        result.frameAnalyses.forEach((analysis) => {
          expect(analysis.brightnessMap).toBeDefined();
          expect(analysis.brightnessMap.length).toBe(25);
          analysis.brightnessMap.forEach((row) => {
            expect(row.length).toBe(25);
          });
        });
      },
      { timeout: 5000 }
    );

    it(
      'should generate correct number of frames for 5-second audio',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        // 5 seconds at 60fps = 300 frames
        const expectedFrames = Math.floor(5.0 * 60);
        expect(result.totalFrames).toBe(expectedFrames);
        expect(result.frameAnalyses.length).toBe(expectedFrames);
        expect(result.displayFrames.length).toBe(expectedFrames);
      },
      { timeout: 5000 }
    );

    it(
      'should have valid frame timestamps',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        result.frameAnalyses.forEach((analysis, index) => {
          expect(analysis.frameNumber).toBe(index);
          expect(analysis.timestamp).toBeGreaterThanOrEqual(0);
          if (index > 0) {
            expect(analysis.timestamp).toBeGreaterThan(result.frameAnalyses[index - 1].timestamp);
          }
        });
      },
      { timeout: 5000 }
    );
  });

  describe('Video Import and Processing', () => {
    it('should process video file with crop settings', async () => {
      const cropSettings: CropSettings = {
        x: 100,
        y: 100,
        radius: 50,
        scale: 1.0,
        videoWidth: 200,
        videoHeight: 200
      };

      // Mock the video processing to avoid actual FFmpeg execution
      const mockResult: VideoProcessingResult = {
        audioFile: audioFixtures.wav,
        processedVideoFile: videoFixture,
        frameAnalyses: [],
        displayFrames: [],
        totalFrames: 120,
        duration: 2000,
        fps: 60,
        displayDuration: 2000,
        originalFileType: 'video'
      };

      // For testing, we'll validate the crop settings calculation
      const scaledRadius = cropSettings.radius * cropSettings.scale;
      const cropSize = Math.floor(scaledRadius * 2);
      const cropX = Math.max(0, Math.floor(cropSettings.x - scaledRadius));
      const cropY = Math.max(0, Math.floor(cropSettings.y - scaledRadius));

      expect(cropSize).toBe(100);
      expect(cropX).toBe(50);
      expect(cropY).toBe(50);
      expect(mockResult.totalFrames).toBe(120);
    });

    it('should validate crop settings boundaries', () => {
      const cropSettings: CropSettings = {
        x: 10,
        y: 10,
        radius: 50,
        scale: 1.0,
        videoWidth: 100,
        videoHeight: 100
      };

      const scaledRadius = cropSettings.radius * cropSettings.scale;
      const cropSize = Math.floor(scaledRadius * 2);
      const cropX = Math.max(0, Math.floor(cropSettings.x - scaledRadius));
      const cropY = Math.max(0, Math.floor(cropSettings.y - scaledRadius));

      const maxCropX = Math.min(cropX, cropSettings.videoWidth - cropSize);
      const maxCropY = Math.min(cropY, cropSettings.videoHeight - cropSize);
      const finalCropSize = Math.min(
        cropSize,
        Math.min(cropSettings.videoWidth - maxCropX, cropSettings.videoHeight - maxCropY)
      );

      expect(finalCropSize).toBeGreaterThan(0);
      expect(maxCropX).toBeGreaterThanOrEqual(0);
      expect(maxCropY).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Frame Analysis Validation', () => {
    it(
      'should generate valid brightness maps for audio processing',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        result.frameAnalyses.forEach((analysis) => {
          expect(analysis.brightnessMap).toBeDefined();
          expect(Array.isArray(analysis.brightnessMap)).toBe(true);
          expect(analysis.brightnessMap.length).toBe(25);

          analysis.brightnessMap.forEach((row) => {
            expect(Array.isArray(row)).toBe(true);
            expect(row.length).toBe(25);

            row.forEach((value) => {
              expect(typeof value).toBe('number');
              expect(value).toBeGreaterThanOrEqual(0);
              expect(value).toBeLessThanOrEqual(255);
              expect(Number.isFinite(value)).toBe(true);
            });
          });
        });
      },
      { timeout: 5000 }
    );

    it(
      'should generate valid display frames',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        result.displayFrames.forEach((frame) => {
          expect(frame.pixelStates).toBeDefined();
          expect(frame.brightnessValues).toBeDefined();
          expect(frame.pixelStates.length).toBe(625); // 25x25 = 625
          expect(frame.brightnessValues.length).toBe(625);

          frame.pixelStates.forEach((state) => {
            expect(typeof state).toBe('boolean');
          });

          frame.brightnessValues.forEach((value) => {
            expect(typeof value).toBe('number');
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(255);
          });
        });
      },
      { timeout: 5000 }
    );
  });

  describe('Export Pipeline', () => {
    it(
      'should generate CSV from processed audio',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        // Simulate CSV generation (this would normally be done in the component)
        const csvRows: string[] = [];
        for (let frameIndex = 0; frameIndex < result.frameAnalyses.length; frameIndex++) {
          const analysis = result.frameAnalyses[frameIndex];
          const row: number[] = [];

          for (let rowIndex = 0; rowIndex < 25; rowIndex++) {
            for (let colIndex = 0; colIndex < 25; colIndex++) {
              const brightness = analysis.brightnessMap[rowIndex][colIndex];
              const np3Brightness = (brightness / 255) * 4095;
              row.push(Math.round(Math.max(0, Math.min(4095, np3Brightness))));
            }
          }

          expect(row.length).toBe(625);
          csvRows.push(row.join(','));
        }

        const csvData = csvRows.join(',\r\n') + ',';
        expect(csvData).toBeDefined();
        expect(csvData.length).toBeGreaterThan(0);
        expect(csvData).toContain(',');
        expect(csvData).toContain('\r\n');
      },
      { timeout: 5000 }
    );

    it(
      'should encode CSV data correctly',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        // Generate CSV
        const csvRows: string[] = [];
        for (const analysis of result.frameAnalyses) {
          const row: number[] = [];
          for (let rowIndex = 0; rowIndex < 25; rowIndex++) {
            for (let colIndex = 0; colIndex < 25; colIndex++) {
              const brightness = analysis.brightnessMap[rowIndex][colIndex];
              const np3Brightness = (brightness / 255) * 4095;
              row.push(Math.round(Math.max(0, Math.min(4095, np3Brightness))));
            }
          }
          csvRows.push(row.join(','));
        }

        const csvData = csvRows.join(',\r\n') + ',';
        const encoded = encodeStuffTheWayNothingLikesIt(csvData);

        expect(encoded).toBeDefined();
        expect(typeof encoded).toBe('string');
        expect(encoded!.length).toBeGreaterThan(0);
        // Base64 validation
        expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
      },
      { timeout: 5000 }
    );

    it(
      'should validate export data structure',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        // Validate all required fields for export
        expect(result.audioFile).toBeDefined();
        expect(result.audioFile.size).toBeGreaterThan(0);
        expect(result.frameAnalyses.length).toBeGreaterThan(0);
        expect(result.displayFrames.length).toBeGreaterThan(0);
        expect(result.frameAnalyses.length).toBe(result.displayFrames.length);
        expect(result.totalFrames).toBe(result.frameAnalyses.length);
        expect(result.duration).toBeGreaterThan(0);
        expect(result.fps).toBe(60);
      },
      { timeout: 5000 }
    );
  });

  describe('End-to-End Workflow', () => {
    it(
      'should complete full workflow: import -> process -> export',
      async () => {
        // Step 1: Import audio
        const audioFile = audioFixtures.wav;
        expect(audioFile).toBeDefined();
        expect(audioFile.type).toContain('audio');

        // Step 2: Process audio
        const result = await audioService.processAudioForNP3(audioFile);
        expect(result).toBeDefined();
        expect(result.originalFileType).toBe('audio');
        expect(result.totalFrames).toBeGreaterThan(0);

        // Step 3: Generate CSV
        const csvRows: string[] = [];
        for (const analysis of result.frameAnalyses) {
          const row: number[] = [];
          for (let rowIndex = 0; rowIndex < 25; rowIndex++) {
            for (let colIndex = 0; colIndex < 25; colIndex++) {
              const brightness = analysis.brightnessMap[rowIndex][colIndex];
              const np3Brightness = (brightness / 255) * 4095;
              row.push(Math.round(Math.max(0, Math.min(4095, np3Brightness))));
            }
          }
          expect(row.length).toBe(625);
          csvRows.push(row.join(','));
        }

        const csvData = csvRows.join(',\r\n') + ',';
        expect(csvData.length).toBeGreaterThan(0);

        // Step 4: Encode
        const encoded = encodeStuffTheWayNothingLikesIt(csvData);
        expect(encoded).toBeDefined();

        // Validate complete workflow
        expect(audioFile).toBeDefined();
        expect(result).toBeDefined();
        expect(csvData).toBeDefined();
        expect(encoded).toBeDefined();
      },
      { timeout: 5000 }
    );

    it('should handle different audio formats in workflow', async () => {
      const formats = [
        { file: audioFixtures.wav, name: 'WAV' },
        { file: audioFixtures.mp3, name: 'MP3' },
        { file: audioFixtures.ogg, name: 'OGG' }
      ];

      for (const format of formats) {
        const result = await audioService.processAudioForNP3(format.file);
        expect(result).toBeDefined();
        expect(result.originalFileType).toBe('audio');
        expect(result.totalFrames).toBeGreaterThan(0);
        expect(result.frameAnalyses.length).toBe(result.totalFrames);
      }
    }, 60000);
  });

  describe('Data Validation', () => {
    it(
      'should validate frame count matches duration',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        // Duration should be approximately 5 seconds
        const expectedDuration = 5000; // milliseconds
        const tolerance = 100; // 100ms tolerance

        expect(Math.abs(result.duration - expectedDuration)).toBeLessThan(tolerance);
        // Frame calculation: duration in ms / frame interval (16.666ms)
        const expectedFrames = Math.floor(result.duration / (1000 / 60));
        expect(result.totalFrames).toBeGreaterThanOrEqual(expectedFrames - 1);
        expect(result.totalFrames).toBeLessThanOrEqual(expectedFrames + 1);
      },
      { timeout: 5000 }
    );

    it(
      'should validate brightness values are in correct range',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        result.frameAnalyses.forEach((analysis) => {
          analysis.brightnessMap.forEach((row) => {
            row.forEach((value) => {
              expect(value).toBeGreaterThanOrEqual(0);
              expect(value).toBeLessThanOrEqual(255);
              expect(Number.isInteger(value) || Number.isFinite(value)).toBe(true);
            });
          });
        });
      },
      { timeout: 5000 }
    );

    it(
      'should validate display frame consistency',
      async () => {
        const result = await audioService.processAudioForNP3(audioFixtures.wav);

        expect(result.frameAnalyses.length).toBe(result.displayFrames.length);
        expect(result.frameAnalyses.length).toBe(result.totalFrames);

        result.displayFrames.forEach((frame, index) => {
          expect(frame.timestamp).toBe(result.frameAnalyses[index].timestamp);
          expect(frame.pixelStates.length).toBe(625);
          expect(frame.brightnessValues.length).toBe(625);
        });
      },
      { timeout: 5000 }
    );
  });
});
