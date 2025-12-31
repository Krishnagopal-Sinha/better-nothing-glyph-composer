/**
 * Test utilities and mocks for testing
 * Provides helper functions and mock implementations for common test scenarios
 */
import { vi } from 'vitest';
import type { GlyphBlock, GlyphStore } from '@/lib/glyph_model';
import type { VideoProcessingResult, FrameAnalysis, NP3DisplayFrame } from '@/logic/video_editor_service';
import type { CropSettings } from '@/logic/video_editor_service';

// Re-export fixture loaders for convenience
export { createAudioFixtures, createTestVideoFile } from './fixtures/fixture-loader';

/**
 * Create a mock File object for testing
 */
export function createMockFile(
  name: string,
  type: string,
  content: string | Uint8Array = 'mock content'
): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

/**
 * Create a mock video file
 */
export function createMockVideoFile(name: string = 'test-video.mp4'): File {
  // Create a minimal valid MP4 header (simplified)
  const mockVideoData = new Uint8Array([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
    0x6d, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08
  ]);
  return createMockFile(name, 'video/mp4', mockVideoData);
}

/**
 * Create a mock audio file
 */
export function createMockAudioFile(name: string = 'test-audio.wav'): File {
  // Create a minimal WAV file header
  const sampleRate = 44100;
  const numChannels = 2;
  const bitsPerSample = 16;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 36 + dataSize;

  const wavHeader = new Uint8Array(44);
  // RIFF header
  wavHeader.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  wavHeader[4] = fileSize & 0xff;
  wavHeader[5] = (fileSize >> 8) & 0xff;
  wavHeader[6] = (fileSize >> 16) & 0xff;
  wavHeader[7] = (fileSize >> 24) & 0xff;
  wavHeader.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
  // fmt chunk
  wavHeader.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  wavHeader[16] = 16; // Subchunk1Size
  wavHeader[20] = 1; // AudioFormat (PCM)
  wavHeader[22] = numChannels;
  wavHeader[24] = sampleRate & 0xff;
  wavHeader[25] = (sampleRate >> 8) & 0xff;
  wavHeader[26] = (sampleRate >> 16) & 0xff;
  wavHeader[27] = (sampleRate >> 24) & 0xff;
  wavHeader[32] = numChannels * (bitsPerSample / 8); // BlockAlign
  wavHeader[34] = bitsPerSample;
  // data chunk
  wavHeader.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  wavHeader[40] = dataSize & 0xff;
  wavHeader[41] = (dataSize >> 8) & 0xff;
  wavHeader[42] = (dataSize >> 16) & 0xff;
  wavHeader[43] = (dataSize >> 24) & 0xff;

  const audioData = new Uint8Array(44 + dataSize);
  audioData.set(wavHeader, 0);
  // Rest is silence (zeros)

  return createMockFile(name, 'audio/wav', audioData);
}

/**
 * Create a mock GlyphBlock for testing
 */
export function createMockGlyphBlock(overrides: Partial<GlyphBlock> = {}): GlyphBlock {
  return {
    id: 'test-id-1',
    glyphId: 0,
    startTimeMilis: 0,
    durationMilis: 1000,
    startingBrightness: 2048,
    isSelected: false,
    effectId: 0,
    effectData: [2048, 2048, 2048],
    ...overrides
  };
}

/**
 * Create a mock GlyphStore for testing
 */
export function createMockGlyphStore(zoneCount: number = 5, blocksPerZone: number = 1): GlyphStore {
  const store: GlyphStore = {};
  for (let i = 0; i < zoneCount; i++) {
    store[i] = [];
    for (let j = 0; j < blocksPerZone; j++) {
      store[i].push(
        createMockGlyphBlock({
          id: `test-id-${i}-${j}`,
          glyphId: i,
          startTimeMilis: j * 1000,
          durationMilis: 1000
        })
      );
    }
  }
  return store;
}

/**
 * Create a mock brightness map (25x25)
 */
export function createMockBrightnessMap(value: number = 128): number[][] {
  const map: number[][] = [];
  for (let row = 0; row < 25; row++) {
    map[row] = [];
    for (let col = 0; col < 25; col++) {
      map[row][col] = value;
    }
  }
  return map;
}

/**
 * Create a mock FrameAnalysis
 */
export function createMockFrameAnalysis(
  frameNumber: number = 0,
  timestamp: number = 0,
  brightnessMap?: number[][]
): FrameAnalysis {
  return {
    frameNumber,
    timestamp,
    brightnessMap: brightnessMap || createMockBrightnessMap()
  };
}

/**
 * Create a mock NP3DisplayFrame
 */
export function createMockDisplayFrame(timestamp: number = 0): NP3DisplayFrame {
  const pixelStates = new Array(625).fill(false);
  const brightnessValues = new Array(625).fill(128);
  return {
    timestamp,
    pixelStates,
    brightnessValues
  };
}

/**
 * Create a mock VideoProcessingResult
 */
export function createMockVideoProcessingResult(
  frameCount: number = 10,
  duration: number = 1000
): VideoProcessingResult {
  const frameAnalyses: FrameAnalysis[] = [];
  const displayFrames: NP3DisplayFrame[] = [];
  const frameInterval = 16.666; // ms

  for (let i = 0; i < frameCount; i++) {
    frameAnalyses.push(createMockFrameAnalysis(i, i * frameInterval));
    displayFrames.push(createMockDisplayFrame(i * frameInterval));
  }

  return {
    audioFile: createMockAudioFile(),
    processedVideoFile: createMockFile('processed.png', 'image/png'),
    frameAnalyses,
    displayFrames,
    totalFrames: frameCount,
    duration,
    fps: 60,
    displayDuration: duration,
    originalFileType: 'video'
  };
}

/**
 * Create mock CropSettings
 */
export function createMockCropSettings(overrides: Partial<CropSettings> = {}): CropSettings {
  return {
    x: 100,
    y: 100,
    radius: 50,
    scale: 1.0,
    videoWidth: 200,
    videoHeight: 200,
    ...overrides
  };
}

/**
 * Mock FFmpeg instance
 */
export function createMockFFmpegInstance() {
  const mockFiles: Map<string, Uint8Array> = new Map();
  const mockProgressCallbacks: Array<(progress: { progress: number }) => void> = [];

  return {
    writeFile: vi.fn(async (filename: string, data: Uint8Array) => {
      mockFiles.set(filename, data);
    }),
    readFile: vi.fn(async (filename: string) => {
      const data = mockFiles.get(filename);
      if (!data) {
        throw new Error(`File not found: ${filename}`);
      }
      return data;
    }),
    deleteFile: vi.fn(async (filename: string) => {
      mockFiles.delete(filename);
    }),
    listDir: vi.fn(async (path: string) => {
      return Array.from(mockFiles.keys())
        .filter((name) => name.startsWith(path === '/' ? '' : path))
        .map((name) => ({ name, isFile: true, isDir: false }));
    }),
    exec: vi.fn(async (_args: string[]) => {
      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        mockProgressCallbacks.forEach((cb) => cb({ progress: i / 100 }));
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }),
    on: vi.fn((event: string, callback: (data: { progress: number }) => void) => {
      if (event === 'progress') {
        mockProgressCallbacks.push(callback);
      }
    }),
    off: vi.fn((event: string, callback: Function) => {
      if (event === 'progress') {
        const index = mockProgressCallbacks.indexOf(callback as any);
        if (index > -1) {
          mockProgressCallbacks.splice(index, 1);
        }
      }
    }),
    load: vi.fn(async () => {
      return Promise.resolve();
    })
  };
}

/**
 * Mock AudioContext for testing
 */
export function createMockAudioContext() {
  return {
    decodeAudioData: vi.fn(async (_arrayBuffer: ArrayBuffer) => {
      // Return a mock AudioBuffer
      const sampleRate = 44100;
      const duration = 1;
      const numberOfChannels = 2;
      const length = sampleRate * duration;

      return {
        sampleRate,
        duration,
        numberOfChannels,
        length,
        getChannelData: vi.fn((_channelIndex: number) => {
          return new Float32Array(length).fill(0);
        }),
        copyFromChannel: vi.fn(),
        copyToChannel: vi.fn()
      };
    }),
    sampleRate: 44100,
    currentTime: 0,
    destination: {},
    state: 'running'
  } as unknown as AudioContext;
}

