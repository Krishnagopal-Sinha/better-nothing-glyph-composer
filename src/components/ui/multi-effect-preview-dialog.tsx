import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square } from 'lucide-react';
import FullscreenDialog from '@/components/ui/fullscreen-dialog';
import { AudioPreset, AudioData, getDefaultParamsForPreset } from '@/logic/np3_audio_service';
import { DotMatrixSettings } from '@/components/ui/dot-matrix-settings-dialog';
import GlyphPreviewCanvas from '@/components/ui/glyph-preview-canvas';

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

const UNIT_SIZE = 6; // Smaller unit size for preview grid

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
  // Generate brightness maps for all presets (normalized to 0-255 range)
  const brightnessMaps = useMemo(() => {
    if (!audioData || !isOpen || audioPresets.length === 0) return new Map<string, number[][]>();

    const maps = new Map<string, number[][]>();
    audioPresets.forEach((preset) => {
      const params = effectParamsMap.get(preset.id) || getDefaultParamsForPreset(preset.id);
      const brightnessMap = preset.generateFrameData(
        audioData,
        currentFrameIndex,
        totalFrames,
        params
      );
      // Convert from NP3 range (0-4095) to display range (0-255)
      const normalizedMap: number[][] = [];
      for (let row = 0; row < 25; row++) {
        normalizedMap[row] = [];
        for (let col = 0; col < 25; col++) {
          normalizedMap[row][col] = Math.round((brightnessMap[row][col] / 4095) * 255);
        }
      }
      maps.set(preset.id, normalizedMap);
    });
    return maps;
  }, [audioData, audioPresets, currentFrameIndex, totalFrames, effectParamsMap, isOpen]);

  // Calculate grid layout (responsive)
  const getGridCols = () => {
    if (audioPresets.length <= 4) return 2;
    if (audioPresets.length <= 9) return 3;
    if (audioPresets.length <= 16) return 4;
    return 5;
  };

  const gridCols = getGridCols();

  const handleEffectClick = (presetId: string) => {
    onEffectSelect(presetId);
    onClose();
  };

  return (
    <FullscreenDialog isOpen={isOpen} onClose={onClose} title="All Effects Preview" zIndex={60}>
      {/* Playback Controls */}
      <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
        <span className="text-xs text-white/50 text-center mb-3">
          (Note: Approximate Visualization of the effects, tradeoff done due to performance reasons)
        </span>
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
                {brightnessMaps.get(preset.id) ? (
                  <GlyphPreviewCanvas
                    brightnessMap={brightnessMaps.get(preset.id)!}
                    settings={{
                      brightness: dotMatrixSettings.brightness,
                      contrast: dotMatrixSettings.contrast,
                      gamma: dotMatrixSettings.gamma,
                      threshold: dotMatrixSettings.threshold,
                      inversion: dotMatrixSettings.inversion
                    }}
                    unitSize={UNIT_SIZE}
                    showLabels={false}
                    className="w-full"
                  />
                ) : (
                  <div className="flex items-center justify-center text-white/50 h-32">
                    <p className="text-xs">Loading...</p>
                  </div>
                )}
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
