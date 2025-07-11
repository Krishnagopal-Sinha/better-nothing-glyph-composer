import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { X, RotateCcw, Check } from 'lucide-react';

interface AdvancedVideoEditorProps {
  onApplySettings: (settings: VideoSettings) => void;
  onCancel: () => void;
  isOpen: boolean;
  // Add props to receive current frame data from main page
  currentFrameAnalysis?: FrameAnalysis;
  currentFrameIndex?: number;
  totalFrames?: number;
  // Add prop to receive current video settings from main page
  currentVideoSettings?: VideoSettings;
  // Add props for playback controls
  isVideoPlaying?: boolean;
  videoProgress?: number;
  onPlayPause?: () => void;
  onSeek?: (progress: number) => void;
  onStop?: () => void;
}

interface VideoSettings {
  gamma: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  threshold: number;
  inversion: boolean; // true = inverted, false = normal
}

interface FrameAnalysis {
  frameNumber: number;
  timestamp: number;
  brightnessMap: number[][];
}

// Constants for glyph matrix display
const UNIT_SIZE = 8; // Smaller for preview
const GRID_SIZE = 25;
const SQUARE_SIZE = GRID_SIZE * UNIT_SIZE;
const CIRCLE_DIAMETER = 25 * UNIT_SIZE;

// Helper functions for glyph matrix
const getPixelIndex = (row: number, col: number): number => {
  return row * 25 + col;
};

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

export default function AdvancedVideoEditor({
  onApplySettings,
  onCancel,
  isOpen,
  currentFrameAnalysis,
  currentFrameIndex = 0,
  totalFrames = 0,
  currentVideoSettings,
  isVideoPlaying = false,
  videoProgress = 0,
  onPlayPause,
  onSeek,
  onStop
}: AdvancedVideoEditorProps) {
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    gamma: 1.0,
    brightness: 0,
    contrast: 1.0,
    saturation: 0,
    hue: 0,
    threshold: 128,
    inversion: false
  });

  const [glyphMatrixStates, setGlyphMatrixStates] = useState<boolean[]>(new Array(625).fill(false));
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize video settings if provided
  useEffect(() => {
    if (currentVideoSettings) {
      setVideoSettings(currentVideoSettings);
    }
  }, [currentVideoSettings]);

  // Update settings when dialog opens to ensure we have the latest settings
  useEffect(() => {
    if (isOpen && currentVideoSettings) {
      setVideoSettings(currentVideoSettings);
    }
  }, [isOpen, currentVideoSettings]);

  // Process current frame for glyph matrix display
  const processCurrentFrameForGlyphMatrix = () => {
    if (!currentFrameAnalysis || !canvasRef.current) return;

    try {
      // Apply video settings to brightness map
      const newGlyphStates = new Array(625).fill(false);
      let litPixels = 0;

      for (let row = 0; row < 25; row++) {
        for (let col = 0; col < 25; col++) {
          const index = getPixelIndex(row, col);
          let brightness = currentFrameAnalysis.brightnessMap[row][col];

          // Apply video settings to brightness
          // Brightness adjustment
          brightness = Math.max(0, Math.min(255, brightness + videoSettings.brightness));

          // Contrast adjustment
          const factor =
            (259 * (videoSettings.contrast * 255 + 255)) /
            (255 * (259 - videoSettings.contrast * 255));
          brightness = Math.max(0, Math.min(255, factor * (brightness - 128) + 128));

          // Gamma correction
          brightness = Math.pow(brightness / 255, 1 / videoSettings.gamma) * 255;

          // Inversion - apply BEFORE threshold
          if (videoSettings.inversion) {
            brightness = 255 - brightness;
          }

          // Threshold for black & white conversion
          if (isPixelInCircle(row, col) && brightness > videoSettings.threshold) {
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

  // Update preview when settings change or current frame changes
  useEffect(() => {
    if (currentFrameAnalysis) {
      processCurrentFrameForGlyphMatrix();
    }
  }, [videoSettings, currentFrameAnalysis]);

  // Update preview when current frame index changes
  useEffect(() => {
    if (currentFrameAnalysis) {
      processCurrentFrameForGlyphMatrix();
    }
  }, [currentFrameIndex, currentFrameAnalysis]);

  // Update canvas preview when settings change
  useEffect(() => {
    if (currentFrameAnalysis && canvasRef.current) {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Create a temporary canvas for high-resolution processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

        if (tempCtx) {
          // Create a high-resolution grid representation of the frame
          const gridSize = 25;
          const cellSize = canvas.width / gridSize;

          // Draw the brightness map as a high-resolution grid
          for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
              const brightness = currentFrameAnalysis.brightnessMap[row][col];
              const x = col * cellSize;
              const y = row * cellSize;

              // Apply video settings to brightness
              let adjustedBrightness = brightness;

              // Brightness adjustment
              adjustedBrightness = Math.max(
                0,
                Math.min(255, adjustedBrightness + videoSettings.brightness)
              );

              // Contrast adjustment
              const factor =
                (259 * (videoSettings.contrast * 255 + 255)) /
                (255 * (259 - videoSettings.contrast * 255));
              adjustedBrightness = Math.max(
                0,
                Math.min(255, factor * (adjustedBrightness - 128) + 128)
              );

              // Gamma correction
              adjustedBrightness =
                Math.pow(adjustedBrightness / 255, 1 / videoSettings.gamma) * 255;

              // Inversion
              if (videoSettings.inversion) {
                adjustedBrightness = 255 - adjustedBrightness;
              }

              // Threshold for black & white
              const isLit = adjustedBrightness > videoSettings.threshold;
              const color = isLit ? 255 : 0;

              // Use high-quality rendering with anti-aliasing
              tempCtx.fillStyle = `rgb(${color}, ${color}, ${color})`;
              tempCtx.fillRect(x, y, cellSize, cellSize);
            }
          }

          // Apply smoothing for better visual quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw the processed frame to the main canvas
          ctx.drawImage(tempCanvas, 0, 0);
        }
      } catch (error) {
        console.error('Error updating canvas preview:', error);
      }
    }
  }, [currentFrameAnalysis, videoSettings]);

  const handleSettingChange = (setting: keyof VideoSettings, value: number | boolean) => {
    setVideoSettings((prev) => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleReset = () => {
    setVideoSettings({
      gamma: 1.0,
      brightness: 0,
      contrast: 1.0,
      saturation: 0,
      hue: 0,
      threshold: 128,
      inversion: false
    });
  };

  const handleApply = () => {
    onApplySettings(videoSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-white/20 rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white font-[ndot] tracking-wider uppercase">
            Advanced Video Editor
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-white hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Playback Controls - Moved to top */}
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <h3 className="text-sm font-medium text-white text-center mb-3">Playback Controls</h3>
          <div className="flex justify-center items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onPlayPause}
              disabled={!onPlayPause}
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
              title={isVideoPlaying ? 'Pause playback' : 'Play video'}
            >
              {isVideoPlaying ? (
                <>
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Play
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              disabled={!onStop}
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
              title="Stop playback and reset to beginning"
            >
              <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                  clipRule="evenodd"
                />
              </svg>
              Stop
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-white/70">
              <span>{Math.floor((videoProgress / 100) * (totalFrames / 60))}s</span>
              <span>{videoProgress.toFixed(1)}%</span>
            </div>
            <Slider
              value={[videoProgress]}
              onValueChange={(value) => onSeek?.(value[0])}
              max={100}
              step={0.01}
              disabled={!onSeek}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview Area */}
          <div className="space-y-4">
            {/* Glyph Matrix Preview - Moved to top */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-white text-center">Glyph Matrix Preview</h4>
              <div className="flex justify-center">
                <div className="relative">
                  {/* 25x25 unit square container */}
                  <div
                    className="relative border border-white/30"
                    style={{
                      width: `${SQUARE_SIZE}px`,
                      height: `${SQUARE_SIZE}px`
                    }}
                    key={`glyph-${videoSettings.inversion}-${videoSettings.threshold}-${videoSettings.brightness}-${videoSettings.contrast}-${videoSettings.gamma}-${lastUpdateTime}`}
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
                        gridTemplateColumns: `repeat(${GRID_SIZE}, ${UNIT_SIZE}px)`,
                        gridTemplateRows: `repeat(${GRID_SIZE}, ${UNIT_SIZE}px)`
                      }}
                    >
                      {Array.from({ length: GRID_SIZE }, (_, row) =>
                        Array.from({ length: GRID_SIZE }, (_, col) => {
                          const index = getPixelIndex(row, col);
                          const isVisible = isPixelInCircle(row, col);
                          const isLit = glyphMatrixStates[index];

                          return (
                            <div
                              key={`${row}-${col}-${isLit}-${videoSettings.inversion}-${videoSettings.threshold}`}
                              className={`transition-all duration-150 ${
                                isVisible
                                  ? isLit
                                    ? 'bg-white shadow-sm shadow-white/50'
                                    : 'bg-white/20'
                                  : 'bg-transparent'
                              }`}
                              style={{
                                width: `${UNIT_SIZE}px`,
                                height: `${UNIT_SIZE}px`,
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
              <p className="text-xs text-white/50 text-center">
                How the video will appear on the Phone (3) LED matrix
              </p>
              <p className="text-xs text-white/30 text-center">
                Inversion: {videoSettings.inversion ? 'ON' : 'OFF'} | Lit pixels:{' '}
                {glyphMatrixStates.filter((state) => state).length}
              </p>
            </div>

            {/* Live Preview - Moved to bottom */}
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-white">Live Preview</h3>
              <div className="relative border border-white/20 rounded-lg overflow-hidden bg-black flex justify-center">
                {currentFrameAnalysis ? (
                  <canvas
                    ref={canvasRef}
                    style={{
                      width: `${SQUARE_SIZE}px`,
                      height: `${SQUARE_SIZE}px`
                    }}
                    width={SQUARE_SIZE}
                    height={SQUARE_SIZE}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64 text-white/50">
                    <div className="text-center">
                      <p className="text-sm mb-2">No frame data available</p>
                      <p className="text-xs">Please play the video to see preview</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-white/50 text-center">
                Current frame: {currentFrameIndex + 1} / {totalFrames} | Adjust settings below to
                see real-time preview
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Video Settings</h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleApply} className="bg-white text-black hover:bg-white/90">
                  <Check className="h-4 w-4 mr-2" />
                  Apply
                </Button>
              </div>
            </div>

            {/* Gamma */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Gamma</label>
                <span className="text-xs text-white/50">{videoSettings.gamma.toFixed(2)}</span>
              </div>
              <Slider
                value={[videoSettings.gamma]}
                onValueChange={(value) => handleSettingChange('gamma', value[0])}
                min={0.1}
                max={3.0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Brightness</label>
                <span className="text-xs text-white/50">{videoSettings.brightness}</span>
              </div>
              <Slider
                value={[videoSettings.brightness]}
                onValueChange={(value) => handleSettingChange('brightness', value[0])}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Contrast</label>
                <span className="text-xs text-white/50">{videoSettings.contrast.toFixed(2)}</span>
              </div>
              <Slider
                value={[videoSettings.contrast]}
                onValueChange={(value) => handleSettingChange('contrast', value[0])}
                min={0.1}
                max={3.0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Saturation</label>
                <span className="text-xs text-white/50">{videoSettings.saturation}</span>
              </div>
              <Slider
                value={[videoSettings.saturation]}
                onValueChange={(value) => handleSettingChange('saturation', value[0])}
                min={-100}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Hue */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Hue</label>
                <span className="text-xs text-white/50">{videoSettings.hue}</span>
              </div>
              <Slider
                value={[videoSettings.hue]}
                onValueChange={(value) => handleSettingChange('hue', value[0])}
                min={-180}
                max={180}
                step={1}
                className="w-full"
              />
            </div>

            {/* Threshold */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Threshold</label>
                <span className="text-xs text-white/50">{videoSettings.threshold}</span>
              </div>
              <Slider
                value={[videoSettings.threshold]}
                onValueChange={(value) => handleSettingChange('threshold', value[0])}
                min={0}
                max={255}
                step={1}
                className="w-full"
              />
            </div>

            {/* Inversion */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white">Inversion</label>
                <span className="text-xs text-white/50">
                  {videoSettings.inversion ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="inversion"
                  checked={videoSettings.inversion}
                  onChange={(e) => handleSettingChange('inversion', e.target.checked)}
                  className="w-4 h-4 text-white bg-transparent border-white/20 rounded focus:ring-white/20"
                />
                <label htmlFor="inversion" className="text-sm text-white/70">
                  Invert colors
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
