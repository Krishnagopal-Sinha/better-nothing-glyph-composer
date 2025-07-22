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
  x: number; // Center X in pixels
  y: number; // Center Y in pixels
  radius: number; // Radius in pixels
  scale: number; // Scale factor
  videoWidth: number; // Original video width
  videoHeight: number; // Original video height
}

export default function CircleCropDialog({
  videoFile,
  onCropComplete,
  onCancel,
  isOpen
}: CircleCropDialogProps) {
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    x: 0, // Will be set when video loads
    y: 0, // Will be set when video loads
    radius: 0, // Will be set when video loads
    scale: 1,
    videoWidth: 0,
    videoHeight: 0
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
        const width = video.videoWidth;
        const height = video.videoHeight;

        setVideoDimensions({ width, height });

        // Initialize crop settings with pixel coordinates based on video dimensions
        const defaultRadius = Math.min(width, height) * 0.2; // 20% of smaller dimension
        setCropSettings({
          x: width / 2, // Center X in pixels
          y: height / 2, // Center Y in pixels
          radius: defaultRadius, // Radius in pixels
          scale: 1,
          videoWidth: width,
          videoHeight: height
        });
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    }
  }, [videoUrl]);

  // Draw crop preview
  useEffect(() => {
    if (
      canvasRef.current &&
      videoRef.current &&
      videoDimensions.width > 0 &&
      cropSettings.videoWidth > 0
    ) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const video = videoRef.current;
      const container = containerRef.current;

      if (!ctx || !container) return;

      const containerRect = container.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();

      // Set canvas size to match the container
      canvas.width = containerRect.width;
      canvas.height = containerRect.height;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate video position within the container (centered)
      const videoX = (containerRect.width - videoRect.width) / 2;
      const videoY = (containerRect.height - videoRect.height) / 2;

      // Calculate scale factor from original video to displayed video
      const scaleX = videoRect.width / videoDimensions.width;
      const scaleY = videoRect.height / videoDimensions.height;

      // Convert pixel coordinates to display coordinates
      const displayCenterX = videoX + cropSettings.x * scaleX;
      const displayCenterY = videoY + cropSettings.y * scaleY;
      const displayRadius = cropSettings.radius * Math.min(scaleX, scaleY) * cropSettings.scale;

      // Ensure circle stays within video bounds
      const boundedCenterX = Math.max(
        videoX + displayRadius,
        Math.min(videoX + videoRect.width - displayRadius, displayCenterX)
      );
      const boundedCenterY = Math.max(
        videoY + displayRadius,
        Math.min(videoY + videoRect.height - displayRadius, displayCenterY)
      );

      // Draw circle outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(boundedCenterX, boundedCenterY, displayRadius, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw center crosshair
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boundedCenterX - 10, boundedCenterY);
      ctx.lineTo(boundedCenterX + 10, boundedCenterY);
      ctx.moveTo(boundedCenterX, boundedCenterY - 10);
      ctx.lineTo(boundedCenterX, boundedCenterY + 10);
      ctx.stroke();

      // Draw crop preview (semi-transparent overlay)
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Clear the circle area to show the video
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(boundedCenterX, boundedCenterY, displayRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }, [cropSettings, videoDimensions]);

  const handleCropChange = (setting: keyof CropSettings, value: number) => {
    setCropSettings((prev) => {
      if (setting === 'x') {
        return { ...prev, x: Math.max(0, Math.min(prev.videoWidth, value)) };
      } else if (setting === 'y') {
        return { ...prev, y: Math.max(0, Math.min(prev.videoHeight, value)) };
      } else if (setting === 'radius') {
        const maxRadius = Math.min(prev.videoWidth, prev.videoHeight) / 2;
        return { ...prev, radius: Math.max(10, Math.min(maxRadius, value)) };
      } else if (setting === 'scale') {
        return { ...prev, scale: Math.max(0.1, Math.min(3, value)) };
      }
      return prev;
    });
  };

  const handleScaleChange = (delta: number) => {
    setCropSettings((prev) => ({
      ...prev,
      scale: Math.max(0.1, Math.min(3, prev.scale + delta))
    }));
  };

  const handleReset = () => {
    if (videoDimensions.width > 0 && videoDimensions.height > 0) {
      const defaultRadius = Math.min(videoDimensions.width, videoDimensions.height) * 0.2;
      setCropSettings({
        x: videoDimensions.width / 2,
        y: videoDimensions.height / 2,
        radius: defaultRadius,
        scale: 1,
        videoWidth: videoDimensions.width,
        videoHeight: videoDimensions.height
      });
    }
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
              className="relative border border-white/20 rounded-lg overflow-hidden bg-black flex items-center justify-center"
              style={{
                width: '800px',
                height: '800px',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-w-full max-h-full object-contain"
                muted
                loop
                autoPlay
                playsInline
                style={{
                  display: 'block'
                }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: 'none' }}
              />
            </div>
            {/* Debug info */}
            <div className="text-xs text-white/50 text-center">
              <p>
                Original dimensions: {videoDimensions.width} × {videoDimensions.height}
              </p>
              <p>Aspect ratio: {(videoDimensions.width / videoDimensions.height).toFixed(2)}</p>
              <p>Container: 800×800px fixed size</p>
              <p>
                Crop center: ({Math.round(cropSettings.x)}, {Math.round(cropSettings.y)})px
              </p>
              <p>
                Crop radius: {Math.round(cropSettings.radius)}px (scale:{' '}
                {cropSettings.scale.toFixed(1)}x)
              </p>
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
                    max={cropSettings.videoWidth || 100}
                    value={cropSettings.x}
                    onChange={(e) => handleCropChange('x', parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-white/50">{Math.round(cropSettings.x)}px</span>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Center Y Position</label>
                  <input
                    type="range"
                    min="0"
                    max={cropSettings.videoHeight || 100}
                    value={cropSettings.y}
                    onChange={(e) => handleCropChange('y', parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-white/50">{Math.round(cropSettings.y)}px</span>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Circle Radius</label>
                  <input
                    type="range"
                    min="10"
                    max={Math.min(cropSettings.videoWidth, cropSettings.videoHeight) / 2 || 100}
                    value={cropSettings.radius}
                    onChange={(e) => handleCropChange('radius', parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-white/50">{Math.round(cropSettings.radius)}px</span>
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
