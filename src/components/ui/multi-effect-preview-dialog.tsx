import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square } from 'lucide-react';
import FullscreenDialog from '@/components/ui/fullscreen-dialog';
import { AudioPreset, AudioData, getDefaultParamsForPreset } from '@/logic/np3_audio_service';
import { DotMatrixSettings } from '@/components/ui/dot-matrix-settings-dialog';

interface AllEffectPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  audioData: AudioData | null;
  audioPresets: AudioPreset[];
  effectParamsMap: Map<string, any>;
  dotMatrixSettings: DotMatrixSettings;
  isVideoPlaying: boolean;
  videoProgress: number;
  currentFrameIndex: number;
  totalFrames: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (progress: number) => void;
  onEffectSelect: (presetId: string) => void;
}

const GRID_SIZE = 25;
const UNIT_SIZE = 6; // Smaller unit size for preview grid
const PREVIEW_SIZE = GRID_SIZE * UNIT_SIZE; // 150px x 150px

export default function AllEffectPreviewDialog({
  isOpen,
  onClose,
  audioData,
  audioPresets,
  effectParamsMap,
  dotMatrixSettings,
  isVideoPlaying,
  videoProgress,
  currentFrameIndex,
  totalFrames,
  onPlayPause,
  onStop,
  onSeek,
  onEffectSelect
}: AllEffectPreviewDialogProps) {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Helper function to get pixel index from row/col
  const getPixelIndex = (row: number, col: number): number => {
    return row * 25 + col;
  };

  // Helper function to check if pixel is in circle (same as NP3Page)
  const isPixelInCircle = (row: number, col: number): boolean => {
    const index = getPixelIndex(row, col);
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

  // Apply dot matrix settings to brightness (same as NP3Page)
  const applyDotMatrixSettingsToBrightness = (
    brightness: number,
    settings: DotMatrixSettings
  ): number => {
    let processedBrightness = brightness;

    // Brightness adjustment
    processedBrightness = Math.max(0, Math.min(255, processedBrightness + settings.brightness));

    // Contrast adjustment
    const factor =
      (259 * (settings.contrast * 255 + 255)) / (255 * (259 - settings.contrast * 255));
    processedBrightness = Math.max(0, Math.min(255, factor * (processedBrightness - 128) + 128));

    // Gamma correction
    processedBrightness = Math.pow(processedBrightness / 255, 1 / settings.gamma) * 255;

    // Saturation adjustment (simplified)
    if (settings.saturation !== 1) {
      const gray =
        processedBrightness * 0.299 + processedBrightness * 0.587 + processedBrightness * 0.114;
      processedBrightness = gray + (processedBrightness - gray) * settings.saturation;
    }

    // Filter (black and white strength)
    if (settings.filter !== 1) {
      const gray =
        processedBrightness * 0.299 + processedBrightness * 0.587 + processedBrightness * 0.114;
      processedBrightness = gray + (processedBrightness - gray) * settings.filter;
    }

    // Hue adjustment (simplified)
    if (settings.hue !== 0) {
      processedBrightness = Math.max(0, Math.min(255, processedBrightness + settings.hue * 0.5));
    }

    // Inversion
    if (settings.inversion) {
      processedBrightness = 255 - processedBrightness;
    }

    return Math.max(0, Math.min(255, processedBrightness));
  };

  // Calculate grid layout (responsive)
  const getGridCols = () => {
    if (audioPresets.length <= 4) return 2;
    if (audioPresets.length <= 9) return 3;
    if (audioPresets.length <= 16) return 4;
    return 5;
  };

  const gridCols = getGridCols();

  // Render all effects
  useEffect(() => {
    if (!isOpen || !audioData || audioPresets.length === 0) return;

    audioPresets.forEach((preset) => {
      const canvas = canvasRefs.current.get(preset.id);
      if (!canvas) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Get effect parameters
      const params = effectParamsMap.get(preset.id) || getDefaultParamsForPreset(preset.id);

      // Generate frame data for this preset
      const brightnessMap = preset.generateFrameData(
        audioData,
        currentFrameIndex,
        totalFrames,
        params
      );

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw brightness map using circular dots (same as live preview)
      const cellSize = PREVIEW_SIZE / GRID_SIZE;
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          // Only draw pixels within the circle
          if (isPixelInCircle(row, col)) {
            const brightness = brightnessMap[row][col];
            // Convert from NP3 range (0-4095) to display range (0-255)
            let displayBrightness = Math.round((brightness / 4095) * 255);

            // Apply dot matrix settings
            displayBrightness = applyDotMatrixSettingsToBrightness(
              displayBrightness,
              dotMatrixSettings
            );

            const opacity = Math.min(1, displayBrightness / 255);
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(
              col * cellSize + cellSize / 2,
              row * cellSize + cellSize / 2,
              cellSize * 0.45,
              0,
              2 * Math.PI
            );
            ctx.fill();
            ctx.restore();
          }
        }
      }
    });
  }, [
    isOpen,
    audioData,
    audioPresets,
    currentFrameIndex,
    totalFrames,
    effectParamsMap,
    dotMatrixSettings,
    isVideoPlaying
  ]);

  const setCanvasRef = (presetId: string, canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvasRefs.current.set(presetId, canvas);
    } else {
      canvasRefs.current.delete(presetId);
    }
  };

  const handleEffectClick = (presetId: string) => {
    onEffectSelect(presetId);
    onClose();
  };

  return (
    <FullscreenDialog isOpen={isOpen} onClose={onClose} title="All Effects Preview" zIndex={60}>
      {/* Playback Controls */}
      <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
        <h3 className="text-sm font-medium text-white text-center mb-3">Playback Controls</h3>
        <div className="flex justify-center items-center space-x-3 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onPlayPause}
            className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
            title={isVideoPlaying ? 'Pause playback' : 'Play audio'}
          >
            {isVideoPlaying ? (
              <>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Play
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onStop}
            className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
            title="Stop playback and reset to beginning"
          >
            <Square className="h-4 w-4 mr-1" />
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
            onValueChange={(value) => onSeek(value[0])}
            max={100}
            step={0.01}
            className="w-full"
          />
        </div>
      </div>

      {/* Effects Grid */}
      {audioData && audioPresets.length > 0 ? (
        <div
          className="grid gap-4 overflow-y-auto"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
            maxHeight: 'calc(95vh - 250px)'
          }}
        >
          {audioPresets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => handleEffectClick(preset.id)}
              className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-2 cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all duration-200 button-hover"
              title={`Click to select ${preset.name}`}
            >
              <h4 className="text-sm font-medium text-white text-center font-[ndot] tracking-wide">
                {preset.name}
              </h4>
              <p className="text-xs text-white/50 text-center mb-2">{preset.description}</p>
              <div className="flex justify-center">
                <div className="relative">
                  <canvas
                    ref={(canvas) => setCanvasRef(preset.id, canvas)}
                    width={PREVIEW_SIZE}
                    height={PREVIEW_SIZE}
                    style={{
                      width: `${PREVIEW_SIZE}px`,
                      height: `${PREVIEW_SIZE}px`,
                      background: 'black',
                      borderRadius: '50%',
                      boxShadow: '0 4px 32px rgba(0,0,0,0.7)',
                      border: '2px solid rgba(255,255,255,0.2)',
                      display: 'block'
                    }}
                  />
                  {/* Circle overlay for border */}
                  <div
                    className="absolute inset-0 border-2 border-white/50 rounded-full pointer-events-none shadow-inner"
                    style={{ width: '100%', height: '100%', top: '0px', left: '0px' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-white/50">
          <div className="text-center">
            <p className="text-sm mb-2">No audio data available</p>
            <p className="text-xs">Please load an audio file to see effect previews</p>
          </div>
        </div>
      )}
    </FullscreenDialog>
  );
}
