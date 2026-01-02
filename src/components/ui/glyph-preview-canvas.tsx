import { useRef, useEffect } from 'react';

/**
 * Props for GlyphPreviewCanvas component
 * Same interface as GlyphPreview but uses canvas for better performance
 */
export interface GlyphPreviewCanvasProps {
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
 * GlyphPreviewCanvas Component
 *
 * Canvas-based version of GlyphPreview for better performance when rendering
 * multiple previews. Uses the same accurate threshold-based processing logic
 * from Advanced Video Editor.
 *
 * This provides the same visual output as GlyphPreview but with better performance.
 */
export default function GlyphPreviewCanvas({
  brightnessMap,
  settings,
  unitSize = DEFAULT_UNIT_SIZE,
  className = '',
  showLabels = true
}: GlyphPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const SQUARE_SIZE = GRID_SIZE * unitSize;
  const CIRCLE_DIAMETER = 25 * unitSize;

  /**
   * Process and render the glyph matrix to canvas
   * Applies processing pipeline and threshold check to generate binary states
   * Matches Advanced Video Editor processing EXACTLY - no normalization, just direct processing
   */
  const renderToCanvas = () => {
    if (!brightnessMap || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Set canvas size (matching div version's SQUARE_SIZE)
      canvas.width = SQUARE_SIZE;
      canvas.height = SQUARE_SIZE;

      // Clear canvas with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw circle border overlay (matching div version's circle overlay)
      // Div version has: border border-white/50 rounded-full
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(SQUARE_SIZE / 2, SQUARE_SIZE / 2, CIRCLE_DIAMETER / 2, 0, 2 * Math.PI);
      ctx.stroke();

      // Process and draw each pixel
      // EXACT same logic as GlyphPreview: render ALL 625 pixels in a grid
      // Invisible pixels are drawn as transparent (matching div version)
      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          // Direct access like Advanced Video Editor - no safety checks, no normalization
          // Receives raw brightness map exactly like Advanced Video Editor does
          let brightness = brightnessMap[row][col];

          // Apply dot matrix settings to brightness - EXACT same as Advanced Video Editor
          // Brightness adjustment
          brightness = Math.max(0, Math.min(255, brightness + settings.brightness));

          // Contrast adjustment
          const factor =
            (259 * (settings.contrast * 255 + 255)) / (255 * (259 - settings.contrast * 255));
          brightness = Math.max(0, Math.min(255, factor * (brightness - 128) + 128));

          // Gamma correction
          brightness = Math.pow(brightness / 255, 1 / settings.gamma) * 255;

          // Inversion - apply BEFORE threshold
          if (settings.inversion) {
            brightness = 255 - brightness;
          }

          // Threshold for black & white conversion - EXACT same check as GlyphPreview
          const isVisible = isPixelInCircle(row, col);
          const isLit = isVisible && brightness > settings.threshold;

          // Calculate position (same grid positioning as div version)
          const x = col * unitSize + unitSize / 2;
          const y = row * unitSize + unitSize / 2;
          const radius = unitSize * 0.45;

          // Draw pixel dot - render ALL pixels like div version does (625 total)
          // Div version renders all divs in a grid, invisible ones are transparent
          if (isVisible) {
            // Visible pixel - draw based on lit state (matching div version exactly)
            if (isLit) {
              // Lit pixel - white (matching div: bg-white)
              // Use canvas shadow to approximate CSS shadow-sm shadow-white/50
              ctx.save();
              ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
              ctx.shadowBlur = 2;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 1;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, 2 * Math.PI);
              ctx.fill();
              ctx.restore();
            } else {
              // Unlit visible pixel - semi-transparent white (matching div: bg-white/20)
              ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
          // Invisible pixels: don't draw (transparent), matching div's bg-transparent
        }
      }
    } catch (error) {
      console.error('Error rendering glyph matrix to canvas:', error);
    }
  };

  // Update canvas when brightness map or settings change
  useEffect(() => {
    if (brightnessMap) {
      renderToCanvas();
    }
  }, [
    brightnessMap,
    settings.brightness,
    settings.contrast,
    settings.gamma,
    settings.threshold,
    settings.inversion,
    unitSize
  ]);

  // Count lit pixels for display - EXACT same logic as GlyphPreview
  const litPixelsCount = brightnessMap
    ? (() => {
        let count = 0;
        for (let row = 0; row < 25; row++) {
          for (let col = 0; col < 25; col++) {
            // Process brightness for ALL pixels (same as GlyphPreview)
            let brightness = brightnessMap[row][col];
            brightness = Math.max(0, Math.min(255, brightness + settings.brightness));
            const factor =
              (259 * (settings.contrast * 255 + 255)) / (255 * (259 - settings.contrast * 255));
            brightness = Math.max(0, Math.min(255, factor * (brightness - 128) + 128));
            brightness = Math.pow(brightness / 255, 1 / settings.gamma) * 255;
            if (settings.inversion) {
              brightness = 255 - brightness;
            }
            // EXACT same check as GlyphPreview: isPixelInCircle(row, col) && brightness > settings.threshold
            if (isPixelInCircle(row, col) && brightness > settings.threshold) {
              count++;
            }
          }
        }
        return count;
      })()
    : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabels && (
        <h4 className="text-sm font-medium text-white text-center">Glyph Matrix Preview</h4>
      )}
      <div className="flex justify-center">
        <div className="relative">
          {/* Canvas container with border matching GlyphPreview */}
          <div
            className="relative "
            style={{
              width: `${SQUARE_SIZE}px`,
              height: `${SQUARE_SIZE}px`
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                width: `${SQUARE_SIZE}px`,
                height: `${SQUARE_SIZE}px`,
                display: 'block'
              }}
            />
          </div>
        </div>
      </div>
      {showLabels && (
        <p className="text-xs text-white/50 text-center">
          How the video will appear on the Phone (3) LED matrix
        </p>
      )}
      <p className="text-xs text-white/30 text-center">
        Inversion: {settings.inversion ? 'ON' : 'OFF'} | Lit pixels: {litPixelsCount}
      </p>
    </div>
  );
}
