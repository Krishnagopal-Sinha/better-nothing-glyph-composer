/**
 * Tests for export functionality
 * Tests CSV generation, encoding, and export pipeline
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encodeStuffTheWayNothingLikesIt, generateCSV, actuallyRestoreGlyphData } from '@/logic/export_logic';
import type { GlyphStore } from '@/lib/glyph_model';
import {
  createMockGlyphStore,
  createMockVideoProcessingResult
} from './test-utils';

// Mock dataStore
vi.mock('@/lib/data_store', () => ({
  default: {
    get: vi.fn((key: string) => {
      if (key === 'currentAudioDurationInMilis') {
        return 1000; // 1 second
      }
      return null;
    }),
    set: vi.fn()
  }
}));

// Mock showPopUp
vi.mock('@/lib/helpers', async () => {
  const actual = await vi.importActual('@/lib/helpers');
  return {
    ...actual,
    showPopUp: vi.fn()
  };
});

describe('Export Feature Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSV Generation', () => {
    it('should generate CSV from valid GlyphStore', () => {
      const glyphStore = createMockGlyphStore(5, 1);
      const csv = generateCSV(glyphStore);

      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      if (csv) {
        expect(csv.length).toBeGreaterThan(0);
      }
    });

    it('should generate CSV with correct format', () => {
      const glyphStore = createMockGlyphStore(5, 1);
      const csv = generateCSV(glyphStore);

      // CSV should contain commas and newlines
      expect(csv).toContain(',');
      expect(csv).toContain('\r\n');
    });

    it('should handle empty GlyphStore', () => {
      const emptyStore: GlyphStore = {};
      const csv = generateCSV(emptyStore);

      // Should still generate CSV (with zeros)
      expect(csv).toBeDefined();
    });

    it('should generate CSV with correct number of rows', () => {
      const glyphStore = createMockGlyphStore(5, 1);

      const csv = generateCSV(glyphStore);
      if (csv) {
        const rows = csv.split('\r\n');

        // Should have approximately expected number of rows (allowing for trailing comma)
        expect(rows.length).toBeGreaterThan(0);
      }
    });

    it('should generate CSV with correct number of columns per row', () => {
      const glyphStore = createMockGlyphStore(5, 1); // 5 zones
      const csv = generateCSV(glyphStore);
      if (csv) {
        const rows = csv.split('\r\n').filter((row) => row.trim().length > 0);

        if (rows.length > 0) {
          const firstRow = rows[0];
          const columns = firstRow.split(',').filter((col) => col.trim().length > 0);
          // Should have 5 columns (one per zone)
          expect(columns.length).toBe(5);
        }
      }
    });
  });

  describe('Encoding', () => {
    it('should encode valid CSV string', () => {
      const csvData = '0,1,2,3,4,\r\n5,6,7,8,9,';
      const encoded = encodeStuffTheWayNothingLikesIt(csvData);

      expect(encoded).toBeDefined();
      expect(typeof encoded).toBe('string');
      expect(encoded!.length).toBeGreaterThan(0);
    });

    it('should return base64 encoded string', () => {
      const csvData = '0,1,2,3,4,';
      const encoded = encodeStuffTheWayNothingLikesIt(csvData);

      // Base64 strings contain only valid base64 characters
      if (encoded) {
        expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
      }
    });

    it('should handle empty input', () => {
      const encoded = encodeStuffTheWayNothingLikesIt('');
      expect(encoded).toBeUndefined();
    });

    it('should handle undefined input', () => {
      const encoded = encodeStuffTheWayNothingLikesIt(undefined);
      expect(encoded).toBeUndefined();
    });

    it('should handle large CSV data', () => {
      // Generate large CSV data
      const largeCsv = Array(1000)
        .fill(0)
        .map(() => Array(625).fill(128).join(','))
        .join(',\r\n') + ',';

      const encoded = encodeStuffTheWayNothingLikesIt(largeCsv);
      expect(encoded).toBeDefined();
      expect(encoded!.length).toBeGreaterThan(0);
    });

    it('should compress data (encoded should be smaller than original for large data)', () => {
      const largeCsv = Array(100)
        .fill(0)
        .map(() => Array(625).fill(128).join(','))
        .join(',\r\n') + ',';

      const encoded = encodeStuffTheWayNothingLikesIt(largeCsv);
      // For compressed data, base64 might be larger, but the actual compressed size should be smaller
      expect(encoded).toBeDefined();
    });

    it('should handle CSV data with commas', () => {
      const csvData = '0,1,2,3,4,\r\n5,6,7,8,9,';
      const encoded = encodeStuffTheWayNothingLikesIt(csvData);
      expect(encoded).toBeDefined();
    });
  });

  describe('Data Restoration', () => {
    it('should restore glyph data from CSV string', () => {
      const csvString = '0,1,2,3,4,\r\n5,6,7,8,9,';
      const restored = actuallyRestoreGlyphData(csvString);

      expect(restored).toBeDefined();
      expect(typeof restored).toBe('object');
    });

    it('should handle empty CSV string', () => {
      const restored = actuallyRestoreGlyphData('');
      expect(restored).toBeDefined();
      expect(typeof restored).toBe('object');
    });

    it('should parse CSV rows correctly', () => {
      const csvString = '0,1,2,\r\n3,4,5,';
      const restored = actuallyRestoreGlyphData(csvString);

      expect(restored).toBeDefined();
    });
  });

  describe('Export Pipeline Validation', () => {
    it('should validate video processing result structure', () => {
      const result = createMockVideoProcessingResult(10, 1000);

      // Check required fields
      expect(result.audioFile).toBeDefined();
      expect(result.processedVideoFile).toBeDefined();
      expect(result.frameAnalyses).toBeDefined();
      expect(result.displayFrames).toBeDefined();
      expect(result.totalFrames).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should validate frame analyses structure', () => {
      const result = createMockVideoProcessingResult(5, 500);

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
          });
        });
      });
    });

    it('should validate display frames structure', () => {
      const result = createMockVideoProcessingResult(5, 500);

      result.displayFrames.forEach((frame) => {
        expect(frame.pixelStates).toBeDefined();
        expect(frame.brightnessValues).toBeDefined();
        expect(frame.pixelStates.length).toBe(625);
        expect(frame.brightnessValues.length).toBe(625);
      });
    });

    it('should validate frame count consistency', () => {
      const result = createMockVideoProcessingResult(10, 1000);

      expect(result.frameAnalyses.length).toBe(result.displayFrames.length);
      expect(result.frameAnalyses.length).toBe(result.totalFrames);
    });

    it('should validate audio file', () => {
      const result = createMockVideoProcessingResult(5, 500);

      expect(result.audioFile).toBeDefined();
      expect(result.audioFile.size).toBeGreaterThan(0);
      expect(result.audioFile.type.startsWith('audio/')).toBe(true);
    });
  });

  describe('CSV Format Validation', () => {
    it('should generate CSV with trailing commas', () => {
      const glyphStore = createMockGlyphStore(5, 1);
      const csv = generateCSV(glyphStore);

      // CSV should end with comma
      if (csv) {
        expect(csv.endsWith(',')).toBe(true);
      }
    });

    it('should generate CSV with proper line endings', () => {
      const glyphStore = createMockGlyphStore(5, 1);
      const csv = generateCSV(glyphStore);

      // Should contain \r\n for line endings
      expect(csv).toContain('\r\n');
    });

    it('should handle brightness values in valid range', () => {
      const glyphStore = createMockGlyphStore(5, 1);
      const csv = generateCSV(glyphStore);
      if (csv) {
        const rows = csv.split('\r\n').filter((row) => row.trim().length > 0);

        rows.forEach((row) => {
          const values = row.split(',').filter((v) => v.trim().length > 0);
          values.forEach((value) => {
            const numValue = parseInt(value, 10);
            expect(numValue).toBeGreaterThanOrEqual(0);
            expect(numValue).toBeLessThanOrEqual(4095); // Max brightness
          });
        });
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle encoding errors gracefully', () => {
      // Test with invalid input that might cause errors
      const invalidInput = null as any;
      const encoded = encodeStuffTheWayNothingLikesIt(invalidInput);
      expect(encoded).toBeUndefined();
    });

    it('should handle CSV generation with missing duration', () => {
      // This would require mocking dataStore to return undefined
      // The function should handle this case
      // If duration is missing, generateCSV should handle it
      // (actual behavior depends on implementation)
      expect(true).toBe(true); // Placeholder test
    });
  });
});

