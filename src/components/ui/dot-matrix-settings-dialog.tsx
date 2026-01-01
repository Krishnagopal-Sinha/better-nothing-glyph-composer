import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Settings, Palette, Contrast, Zap, Droplets, RotateCcw, X } from 'lucide-react';

export interface DotMatrixSettings {
  // Drag painting settings
  dragPaintingEnabled: boolean;

  // Video processing settings
  brightness: number;
  contrast: number;
  threshold: number;
  saturation: number;
  filter: number; // Black and white strength
  hue: number;
  gamma: number;
  inversion: boolean;
}

interface DotMatrixSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DotMatrixSettings;
  onSettingsChange: (settings: DotMatrixSettings) => void;
}

export default function DotMatrixSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange
}: DotMatrixSettingsDialogProps) {
  const [localSettings, setLocalSettings] = useState<DotMatrixSettings>(settings);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key: keyof DotMatrixSettings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const handleReset = () => {
    const defaultSettings: DotMatrixSettings = {
      dragPaintingEnabled: true,
      brightness: 0,
      contrast: 1,
      threshold: 128,
      saturation: 1,
      filter: 1,
      hue: 0,
      gamma: 1,
      inversion: false
    };
    setLocalSettings(defaultSettings);
    onSettingsChange(defaultSettings);
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/30 z-[55]" onClick={() => onOpenChange(false)} />
      )}

      {/* Side Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-black/95 border-r border-white/20 z-[60] transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-white" />
              <h2 className="text-lg font-semibold text-white font-[ndot] tracking-wider uppercase">
                Dot Matrix Settings
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-white hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6">
            {/* Drawing Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-white font-[ndot] tracking-wide">
                Drawing Settings
              </h4>
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <Label htmlFor="drag-painting" className="text-sm text-white">
                  Enable Drag to Paint
                </Label>
                <Switch
                  id="drag-painting"
                  checked={localSettings.dragPaintingEnabled}
                  onCheckedChange={(checked) => handleSettingChange('dragPaintingEnabled', checked)}
                  aria-label="Enable drag to paint"
                />
              </div>
            </div>

            <hr className="border-white/10" />

            {/* Video Processing Settings */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-white flex items-center space-x-2 font-[ndot] tracking-wide">
                <Palette className="h-4 w-4" />
                <span>Video Processing</span>
              </h4>

              {/* Brightness */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="brightness" className="text-sm text-white">
                    Brightness
                  </Label>
                  <span className="text-xs text-white/70 font-mono">
                    {localSettings.brightness}
                  </span>
                </div>
                <Slider
                  id="brightness"
                  min={-100}
                  max={100}
                  step={1}
                  value={[localSettings.brightness]}
                  onValueChange={(value) => handleSettingChange('brightness', value[0])}
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="contrast"
                    className="text-sm flex items-center space-x-1 text-white"
                  >
                    <Contrast className="h-3 w-3" />
                    <span>Contrast</span>
                  </Label>
                  <span className="text-xs text-white/70 font-mono">
                    {localSettings.contrast.toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="contrast"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={[localSettings.contrast]}
                  onValueChange={(value) => handleSettingChange('contrast', value[0])}
                  className="w-full"
                />
              </div>

              {/* Threshold */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="threshold"
                    className="text-sm flex items-center space-x-1 text-white"
                  >
                    <Zap className="h-3 w-3" />
                    <span>Threshold</span>
                  </Label>
                  <span className="text-xs text-white/70 font-mono">{localSettings.threshold}</span>
                </div>
                <Slider
                  id="threshold"
                  min={0}
                  max={255}
                  step={1}
                  value={[localSettings.threshold]}
                  onValueChange={(value) => handleSettingChange('threshold', value[0])}
                  className="w-full"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="saturation"
                    className="text-sm flex items-center space-x-1 text-white"
                  >
                    <Droplets className="h-3 w-3" />
                    <span>Saturation</span>
                  </Label>
                  <span className="text-xs text-white/70 font-mono">
                    {localSettings.saturation.toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="saturation"
                  min={0}
                  max={3}
                  step={0.1}
                  value={[localSettings.saturation]}
                  onValueChange={(value) => handleSettingChange('saturation', value[0])}
                  className="w-full"
                />
              </div>

              {/* Filter (Black and White Strength) */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="filter" className="text-sm text-white">
                    Filter Strength
                  </Label>
                  <span className="text-xs text-white/70 font-mono">
                    {localSettings.filter.toFixed(1)}
                  </span>
                </div>
                <Slider
                  id="filter"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[localSettings.filter]}
                  onValueChange={(value) => handleSettingChange('filter', value[0])}
                  className="w-full"
                />
              </div>

              {/* Hue */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hue" className="text-sm flex items-center space-x-1 text-white">
                    <RotateCcw className="h-3 w-3" />
                    <span>Hue</span>
                  </Label>
                  <span className="text-xs text-white/70 font-mono">{localSettings.hue}°</span>
                </div>
                <Slider
                  id="hue"
                  min={-180}
                  max={180}
                  step={1}
                  value={[localSettings.hue]}
                  onValueChange={(value) => handleSettingChange('hue', value[0])}
                  className="w-full"
                />
              </div>

              {/* Gamma */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gamma" className="text-sm text-white">
                    Gamma
                  </Label>
                  <span className="text-xs text-white/70 font-mono">
                    {localSettings.gamma.toFixed(2)}
                  </span>
                </div>
                <Slider
                  id="gamma"
                  min={0.1}
                  max={3.0}
                  step={0.01}
                  value={[localSettings.gamma]}
                  onValueChange={(value) => handleSettingChange('gamma', value[0])}
                  className="w-full"
                />
              </div>

              {/* Inversion */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <Label htmlFor="inversion" className="text-sm text-white">
                  Invert Colors
                </Label>
                <Switch
                  id="inversion"
                  checked={localSettings.inversion}
                  onCheckedChange={(checked) => handleSettingChange('inversion', checked)}
                  aria-label="Invert colors"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10">
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full flex items-center justify-center space-x-2 border-white/20 text-white hover:bg-white/10 hover:border-white/40"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset to Defaults</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
