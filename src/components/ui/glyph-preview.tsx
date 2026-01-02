import { useState, useEffect } from 'react';

/**
 * Props for GlyphPreview component
 */
export interface GlyphPreviewProps {
  /** 25x25 brightness map array, values in 0-255 range */
  brightnessMap: number[][];
  /** Processing settings to apply */
  settings: {
    brightness: number;
    contrast: number;
    gamma: number;
    threshold: number;
    inversion: boolean;
  };
  /** Unit size for glyph matrix (default: 8) */
  unitSize?: number;
  /** Additional CSS classes */
  className?: string;
  /** Show labels for preview (default: true) */
  showLabels?: boolean;
}

// Constants for glyph matrix display
const DEFAULT_UNIT_SIZE = 8;
const GRID_SIZE = 25;

/**
 * Helper function to get pixel index from row/col
 */
const getPixelIndex = (row: number, col: number): number => {
  return row * 25 + col;
};

/**
 * Helper function to check if pixel is within the circular glyph matrix
 * Uses the same visibility ranges as Advanced Video Editor
 */
const isPixelInCircle = (row: number, col: number): boolean => {
  const index = getPixelIndex(row, col);

  // Define the visible pixel ranges (0-based indexing)
  // Only 489 of 625 pixels are visible due to the round Glyph Matrix
  const visibleRanges = [
    [9, 15], // top row
    [32, 42],
    [55, 69],
    [79, 95],
    [103, 121],
    [127, 147],
    [152, 172],
    [176, 198],
    [201, 223],
    [225, 399], // fully filled rows in the middle
    [401, 423],
    [426, 448],
    [452, 472],
    [477, 497],
    [503, 521],
    [529, 545],
    [555, 569],
    [582, 592],
    [609, 615] // bottom row
  ];

  return visibleRanges.some(([start, end]) => {
    return index >= start && index <= end;
  });
};

/**
 * GlyphPreview Component
 * 
 * Renders a glyph matrix preview (binary on/off dots) using the same accurate
 * threshold-based processing logic from Advanced Video Editor.
 * 
 * This is the single source of truth for glyph matrix preview rendering.
 */
export default function GlyphPreview({
  brightnessMap,
  settings,
  unitSize = DEFAULT_UNIT_SIZE,
  className = '',
  showLabels = true
}: GlyphPreviewProps) {
  const [glyphMatrixStates, setGlyphMatrixStates] = useState<boolean[]>(
    new Array(625).fill(false)
  );
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  const SQUARE_SIZE = GRID_SIZE * unitSize;
  const CIRCLE_DIAMETER = 25 * unitSize;

  /**
   * Process current frame for glyph matrix display
   * Applies processing pipeline and threshold check to generate binary states
   * Matches Advanced Video Editor processing EXACTLY - no normalization, just direct processing
   */
  const processCurrentFrameForGlyphMatrix = () => {
    if (!brightnessMap) return;

    try {
      const newGlyphStates = new Array(625).fill(false);
      let litPixels = 0;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const index = getPixelIndex(row, col);
          // Direct access like Advanced Video Editor - no safety checks, no normalization
          // Receives raw brightness map exactly like Advanced Video Editor does
          let brightness = brightnessMap[row][col];

          // Apply dot matrix settings to brightness - EXACT same as Advanced Video Editor
          // Brightness adjustment
          brightness = Math.max(0, Math.min(255, brightness + settings.brightness));

          // Contrast adjustment
          const factor =
            (259 * (settings.contrast * 255 + 255)) /
            (255 * (259 - settings.contrast * 255));
          brightness = Math.max(0, Math.min(255, factor * (brightness - 128) + 128));

          // Gamma correction
          brightness = Math.pow(brightness / 255, 1 / settings.gamma) * 255;

          // Inversion - apply BEFORE threshold
          if (settings.inversion) {
            brightness = 255 - brightness;
          }

          // Threshold for black & white conversion
          if (isPixelInCircle(row, col) && brightness > settings.threshold) {
            newGlyphStates[index] = true;
            litPixels++;
          }
        }
      }

      // Force state update with a new array reference
      setGlyphMatrixStates([...newGlyphStates]);
      setLastUpdateTime(Date.now());
    } catch (error) {
      console.error('Error processing frame for glyph matrix:', error);
    }
  };

  // Update glyph matrix when brightness map or settings change
  // Include individual settings properties to ensure updates trigger correctly
  useEffect(() => {
    if (brightnessMap) {
      processCurrentFrameForGlyphMatrix();
    }
  }, [
    brightnessMap,
    settings.brightness,
    settings.contrast,
    settings.gamma,
    settings.threshold,
    settings.inversion
  ]);

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabels && (
        <h4 className="text-sm font-medium text-white text-center">Glyph Matrix Preview</h4>
      )}
      <div className="flex justify-center">
        <div className="relative">
          {/* 25x25 unit square container */}
          <div
            className="relative outline outline-2 outline-white/30 rounded-2xl outline-offset-[8px]"
            style={{
              width: `${SQUARE_SIZE}px`,
              height: `${SQUARE_SIZE}px`
            }}
            key={`glyph-${settings.inversion}-${settings.threshold}-${settings.brightness}-${settings.contrast}-${settings.gamma}-${lastUpdateTime}`}
          >
            {/* Circle overlay */}
            <div
              className="absolute inset-0 border border-white/50 rounded-full pointer-events-none"
              style={{
                width: `${CIRCLE_DIAMETER}px`,
                height: `${CIRCLE_DIAMETER}px`,
                top: '0px',
                left: '0px'
              }}
            />

            {/* Dot matrix grid */}
            <div
              className="relative"
              style={{
                width: `${SQUARE_SIZE}px`,
                height: `${SQUARE_SIZE}px`,
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, ${unitSize}px)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, ${unitSize}px)`
              }}
            >
              {Array.from({ length: GRID_SIZE }, (_, row) =>
                Array.from({ length: GRID_SIZE }, (_, col) => {
                  const index = getPixelIndex(row, col);
                  const isVisible = isPixelInCircle(row, col);
                  const isLit = glyphMatrixStates[index];

                  return (
                    <div
                      key={`${row}-${col}-${isLit}-${settings.inversion}-${settings.threshold}`}
                      className={`transition-all duration-150 ${
                        isVisible
                          ? isLit
                            ? 'bg-white shadow-sm shadow-white/50'
                            : 'bg-white/20'
                          : 'bg-transparent'
                      }`}
                      style={{
                        width: `${unitSize}px`,
                        height: `${unitSize}px`,
                        borderRadius: '50%'
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      {showLabels && (
        <p className="text-xs text-white/50 text-center">
          How the video will appear on the Phone (3) LED matrix
        </p>
      )}
      <p className="text-xs text-white/30 text-center">
        Inversion: {settings.inversion ? 'ON' : 'OFF'} | Lit pixels:{' '}
        {glyphMatrixStates.filter((state) => state).length}
      </p>
    </div>
  );
}

