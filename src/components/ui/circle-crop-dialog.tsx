import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface CircleCropDialogProps {
  videoFile: File;
  onCropComplete: (croppedVideo: File, cropSettings: CropSettings) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface CropSettings {
  x: number;
  y: number;
  radius: number;
  scale: number;
}

export default function CircleCropDialog({
  videoFile,
  onCropComplete,
  onCancel,
  isOpen
}: CircleCropDialogProps) {
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    x: 50,
    y: 50,
    radius: 40,
    scale: 1
  });

  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create video URL when file changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [videoFile]);

  // Get video dimensions when video loads
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        setVideoDimensions({
          width: video.videoWidth,
          height: video.videoHeight
        });
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [videoUrl]);

  // Draw crop preview
  useEffect(() => {
    if (canvasRef.current && videoRef.current && videoDimensions.width > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const video = videoRef.current;

      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = videoDimensions.width;
      canvas.height = videoDimensions.height;

      // Draw video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw crop circle
      const centerX = (cropSettings.x / 100) * canvas.width;
      const centerY = (cropSettings.y / 100) * canvas.height;
      const radius = (cropSettings.radius / 100) * Math.min(canvas.width, canvas.height);

      // Create circular clipping path
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.clip();

      // Draw the video again (this will be the cropped area)
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Restore context
      ctx.restore();

      // Draw circle outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw center crosshair
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 10, centerY);
      ctx.lineTo(centerX + 10, centerY);
      ctx.moveTo(centerX, centerY - 10);
      ctx.lineTo(centerX, centerY + 10);
      ctx.stroke();
    }
  }, [cropSettings, videoDimensions]);

  const handleCropChange = (setting: keyof CropSettings, value: number) => {
    setCropSettings((prev) => ({
      ...prev,
      [setting]: Math.max(0, Math.min(100, value))
    }));
  };

  const handleScaleChange = (delta: number) => {
    setCropSettings((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(3, prev.scale + delta))
    }));
  };

  const handleReset = () => {
    setCropSettings({
      x: 50,
      y: 50,
      radius: 40,
      scale: 1
    });
  };

  const handleApplyCrop = async () => {
    // Pass the original video file and crop settings to the parent
    // The FFmpeg service will handle the cropping during processing
    onCropComplete(videoFile, cropSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-white/20 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Circle Crop Video</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-white hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preview Area */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Preview</h3>
            <div
              ref={containerRef}
              className="relative border border-white/20 rounded-lg overflow-hidden bg-black"
              style={{ maxHeight: '400px' }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-auto"
                muted
                loop
                autoPlay
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Crop Settings</h3>

              {/* Position Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Center X Position</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cropSettings.x}
                    onChange={(e) => handleCropChange('x', parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-white/50">{cropSettings.x.toFixed(1)}%</span>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Center Y Position</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={cropSettings.y}
                    onChange={(e) => handleCropChange('y', parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-white/50">{cropSettings.y.toFixed(1)}%</span>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Circle Radius</label>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={cropSettings.radius}
                    onChange={(e) => handleCropChange('radius', parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-white/50">{cropSettings.radius.toFixed(1)}%</span>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Scale</label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScaleChange(-0.1)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-white min-w-[60px] text-center">
                      {(cropSettings.scale * 100).toFixed(0)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleScaleChange(0.1)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button onClick={handleApplyCrop} className="bg-white text-black hover:bg-white/90">
                  Apply Crop
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Instructions</h4>
              <ul className="text-xs text-white/70 space-y-1">
                <li>• Adjust the circle position and size to focus on the desired area</li>
                <li>• The circle will be converted to the 25×25 dot matrix display</li>
                <li>• Use scale to zoom in/out of the selected area</li>
                <li>• Click "Apply Crop" to process the video with these settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
