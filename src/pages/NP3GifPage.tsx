import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Smartphone,
  Play,
  Pause,
  Square,
  Eye,
  Settings,
  X,
  Download
} from 'lucide-react';
import { kAppName } from '@/lib/consts';
import useGlobalAppStore from '@/lib/timeline_state';
import FFmpegService from '@/logic/ffmpeg_service';
import { encodeStuffTheWayNothingLikesIt } from '@/logic/export_logic';
import AdvancedVideoEditor from '@/components/ui/advanced-video-editor';
import { toast } from 'sonner';

// Use the interfaces from VideoEditorService
interface NP3DisplayFrame {
  timestamp: number; // Time in milliseconds
  pixelStates: boolean[]; // 625 pixel states (true = lit, false = off)
  brightnessValues: number[]; // 625 brightness values (0-4095) for NP3 LEDs
}

interface NP3GifProcessingResult {
  audioFile: File;
  gifFile: File;
  frameAnalyses: any[]; // Using any[] for now since we don't have the exact type
  displayFrames: NP3DisplayFrame[]; // 60Hz refresh rate frames
  totalFrames: number;
  duration: number;
  fps: number;
  displayDuration: number; // Duration in milliseconds
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

/**
 * Custom page for Phone (3) with GIF and Audio synchronization
 * This page provides a specialized interface for creating synchronized
 * GIF and audio compositions for the Phone (3) model
 */
export default function NP3GifPage() {
  const [, setLocation] = useLocation();
  const changePhoneModel = useGlobalAppStore((state) => state.changePhoneModel);

  // 25x25 = 625 pixels state array
  const [pixelStates, setPixelStates] = useState<boolean[]>(new Array(625).fill(false));

  // File upload states
  const [gifFile, setGifFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingResult, setProcessingResult] = useState<NP3GifProcessingResult | null>(null);

  // Playback states
  const [currentDisplayFrame, setCurrentDisplayFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0-100
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Advanced video editor states
  const [showAdvancedEditor, setShowAdvancedEditor] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    gamma: 1,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    hue: 0,
    threshold: 128,
    inversion: false
  });

  // Set the phone model to NP3 when this page loads
  useEffect(() => {
    changePhoneModel('NP3');
  }, [changePhoneModel]);

  // Initialize FFmpeg service
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        await FFmpegService.load();
        console.log('FFmpeg NP3 service loaded successfully');
      } catch (error) {
        console.error('Failed to load FFmpeg NP3 service:', error);
        toast.error('Failed to load processing service');
      }
    };
    initFFmpeg();
  }, []);

  // Progress monitoring
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        // Since VideoEditorService doesn't have getProgress, we'll simulate progress
        setProcessingProgress((prev) => Math.min(prev + Math.random() * 10, 100));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  // Synchronized playback control (60Hz refresh rate)
  useEffect(() => {
    if (isPlaying && processingResult && audioElement) {
      const interval = setInterval(() => {
        const currentTime = audioElement.currentTime * 1000; // Convert to milliseconds
        const frameIndex = Math.floor(currentTime / 16.666); // 60Hz = 16.666ms per frame

        if (frameIndex < processingResult.displayFrames.length) {
          setCurrentDisplayFrame(frameIndex);
          const displayFrame = processingResult.displayFrames[frameIndex];

          // Apply video settings to the frame if they've been modified
          if (
            videoSettings.gamma !== 1 ||
            videoSettings.brightness !== 0 ||
            videoSettings.contrast !== 1 ||
            videoSettings.threshold !== 128 ||
            videoSettings.inversion !== false
          ) {
            // Find corresponding frame analysis
            const frameTime = frameIndex * 16.666; // Convert to milliseconds
            const analysisIndex = Math.floor(frameTime / (1000 / processingResult.fps));
            if (analysisIndex < processingResult.frameAnalyses.length) {
              const frameAnalysis = processingResult.frameAnalyses[analysisIndex];
              applyFrameBrightnessWithSettings(frameAnalysis, videoSettings);
            }
          } else {
            // Use default display frame
            setPixelStates(displayFrame.pixelStates);
          }

          // Update progress
          const progress = (currentTime / processingResult.displayDuration) * 100;
          setPlaybackProgress(Math.min(progress, 100));
        } else {
          // Playback ended
          setIsPlaying(false);
          setCurrentDisplayFrame(0);
          setPlaybackProgress(0);
        }
      }, 16.666); // 60Hz refresh rate

      return () => clearInterval(interval);
    }
  }, [isPlaying, processingResult, audioElement, videoSettings]);

  // Audio element management
  useEffect(() => {
    if (processingResult && !audioElement) {
      const audio = new Audio(URL.createObjectURL(processingResult.audioFile));
      audio.preload = 'metadata';

      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentDisplayFrame(0);
        setPlaybackProgress(0);
      });

      setAudioElement(audio);
    }

    return () => {
      if (audioElement) {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
      }
    };
  }, [processingResult]);

  /**
   * Navigate back to the main composer page
   */
  const handleBackToMain = () => {
    setLocation('/');
  };

  /**
   * Handle GIF file upload
   */
  const handleGifUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid GIF file');
      return;
    }

    setGifFile(file);
    const url = URL.createObjectURL(file);
    setGifUrl(url);
    toast.success('GIF uploaded successfully');
  };

  /**
   * Handle audio file upload
   */
  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast.error('Please select a valid audio file');
      return;
    }

    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    toast.success('Audio uploaded successfully');
  };

  /**
   * Process GIF and audio for synchronization
   */
  const handleProcessFiles = async () => {
    if (!gifFile || !audioFile) {
      toast.error('Please upload both GIF and audio files');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      toast.info('Processing GIF and audio for synchronization... This may take a while.');

      // For now, we'll create a mock result since we need to implement GIF processing
      // In a real implementation, you would process the GIF frames and audio
      const mockResult: NP3GifProcessingResult = {
        audioFile: audioFile,
        gifFile: gifFile,
        frameAnalyses: [],
        displayFrames: [],
        totalFrames: 0,
        duration: 0,
        fps: 30,
        displayDuration: 0
      };

      setProcessingResult(mockResult);
      toast.success('Files processed successfully!');
    } catch (error) {
      console.error('File processing failed:', error);
      toast.error('Failed to process files. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle applying advanced video settings
   */
  const handleApplyVideoSettings = (settings: VideoSettings) => {
    setVideoSettings(settings);
    setShowAdvancedEditor(false);

    // Apply settings to current frame analysis if available
    if (processingResult && processingResult.frameAnalyses.length > 0) {
      const currentFrameAnalysis = processingResult.frameAnalyses[currentDisplayFrame];
      if (currentFrameAnalysis) {
        applyFrameBrightnessWithSettings(currentFrameAnalysis, settings);
      }
    }

    toast.success('Settings applied successfully');
  };

  /**
   * Apply frame brightness with custom video settings
   */
  const applyFrameBrightnessWithSettings = (
    frameAnalysis: any, // Changed from FrameAnalysis to any
    settings: VideoSettings
  ) => {
    const newPixelStates = new Array(625).fill(false);

    // Apply brightness map to visible pixels with custom settings
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const index = getPixelIndex(row, col);
        let brightness = frameAnalysis.brightnessMap[row][col];

        // Apply video settings to brightness
        // Brightness adjustment
        brightness = Math.max(0, Math.min(255, brightness + settings.brightness));

        // Contrast adjustment
        const factor =
          (259 * (settings.contrast * 255 + 255)) / (255 * (259 - settings.contrast * 255));
        brightness = Math.max(0, Math.min(255, factor * (brightness - 128) + 128));

        // Gamma correction
        brightness = Math.pow(brightness / 255, 1 / settings.gamma) * 255;

        // Inversion
        if (settings.inversion) {
          brightness = 255 - brightness;
        }

        // Threshold for black & white conversion
        if (isPixelInCircle(row, col) && brightness > settings.threshold) {
          newPixelStates[index] = true;
        }
      }
    }

    setPixelStates(newPixelStates);
  };

  /**
   * Play synchronized GIF and audio
   */
  const playSynchronized = () => {
    if (!audioElement || !processingResult) return;

    audioElement.play();
    setIsPlaying(true);
    toast.info('Playing synchronized GIF and audio...');
  };

  /**
   * Pause playback
   */
  const pausePlayback = () => {
    if (!audioElement) return;

    audioElement.pause();
    setIsPlaying(false);
  };

  /**
   * Stop playback and reset to beginning
   */
  const stopPlayback = () => {
    if (!audioElement) return;

    audioElement.pause();
    audioElement.currentTime = 0;
    setIsPlaying(false);
    setCurrentDisplayFrame(0);
    setPlaybackProgress(0);
    setPixelStates(new Array(625).fill(false));
  };

  /**
   * Handle progress bar seeking
   */
  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioElement || !processingResult) return;

    const progress = parseFloat(event.target.value);
    const newTime = (progress / 100) * (processingResult.displayDuration / 1000);

    audioElement.currentTime = newTime;
    setPlaybackProgress(progress);

    // Update display frame immediately
    const frameIndex = Math.floor((newTime * 1000) / 16.666);
    if (frameIndex < processingResult.displayFrames.length) {
      setCurrentDisplayFrame(frameIndex);
      const displayFrame = processingResult.displayFrames[frameIndex];

      // Apply video settings to the frame if they've been modified
      if (
        videoSettings.gamma !== 1 ||
        videoSettings.brightness !== 0 ||
        videoSettings.contrast !== 1 ||
        videoSettings.threshold !== 128 ||
        videoSettings.inversion !== false
      ) {
        // Find corresponding frame analysis
        const frameTime = frameIndex * 16.666; // Convert to milliseconds
        const analysisIndex = Math.floor(frameTime / (1000 / processingResult.fps));
        if (analysisIndex < processingResult.frameAnalyses.length) {
          const frameAnalysis = processingResult.frameAnalyses[analysisIndex];
          applyFrameBrightnessWithSettings(frameAnalysis, videoSettings);
        }
      } else {
        // Use default display frame
        setPixelStates(displayFrame.pixelStates);
      }
    }
  };

  /**
   * Convert pixel states to CSV format for export
   */
  const convertPixelStatesToCSV = (): string => {
    if (!processingResult) return '';

    const csvRows: string[] = [];
    const totalFrames = processingResult.displayFrames.length;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const displayFrame = processingResult.displayFrames[frameIndex];
      const row: number[] = [];

      // Apply video settings to the frame if they've been modified
      let processedPixelStates = displayFrame.pixelStates;

      if (
        videoSettings.gamma !== 1 ||
        videoSettings.brightness !== 0 ||
        videoSettings.contrast !== 1 ||
        videoSettings.threshold !== 128 ||
        videoSettings.inversion !== false
      ) {
        // Find corresponding frame analysis to apply settings
        const frameTime = frameIndex * 16.666; // Convert to milliseconds
        const analysisIndex = Math.floor(frameTime / (1000 / processingResult.fps));
        if (analysisIndex < processingResult.frameAnalyses.length) {
          const frameAnalysis = processingResult.frameAnalyses[analysisIndex];
          processedPixelStates = new Array(625).fill(false);

          // Apply brightness map to visible pixels with custom settings
          for (let row = 0; row < 25; row++) {
            for (let col = 0; col < 25; col++) {
              const index = getPixelIndex(row, col);
              let brightness = frameAnalysis.brightnessMap[row][col];

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

              // Inversion
              if (videoSettings.inversion) {
                brightness = 255 - brightness;
              }

              // Threshold for black & white conversion
              if (isPixelInCircle(row, col) && brightness > videoSettings.threshold) {
                processedPixelStates[index] = true;
              }
            }
          }
        }
      }

      // Convert boolean pixel states to brightness values (0 or 4095 for NP3)
      for (let pixelIndex = 0; pixelIndex < 625; pixelIndex++) {
        const isLit = processedPixelStates[pixelIndex];
        const brightnessValue = isLit ? 4095 : 0; // NP3 max brightness is 4095
        row.push(brightnessValue);
      }

      csvRows.push(row.join(','));
    }

    return csvRows.join(',\r\n') + ',';
  };

  /**
   * Save synchronized composition as .ogg with pixel state data as metadata
   */
  const handleSaveComposition = async () => {
    if (!processingResult) {
      toast.error('No composition to save');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingProgress(0);
      toast.info('Converting composition to .ogg format with pixel data...');

      // Ensure FFmpegService is loaded
      try {
        await FFmpegService.load();
      } catch (error) {
        console.error('Failed to load FFmpegService:', error);
        toast.error('Failed to load processing service');
        return;
      }

      // Convert pixel states to CSV
      const csvData = convertPixelStatesToCSV();

      if (!csvData) {
        toast.error('Failed to generate pixel data');
        return;
      }

      // Debug: Print CSV data to console
      console.log('=== CSV DATA FOR EXPORT ===');
      console.log('CSV Length:', csvData.length);
      console.log('Total frames:', processingResult.displayFrames.length);
      console.log('Duration:', processingResult.duration);
      console.log('Current settings:', videoSettings);
      console.log('CSV Data:', csvData);
      console.log('=== END CSV DATA ===');

      // Encode CSV data using the existing export logic
      const encodedData = encodeStuffTheWayNothingLikesIt(csvData);

      if (!encodedData) {
        toast.error('Failed to encode pixel data');
        return;
      }

      console.log('=== ENCODED DATA ===');
      console.log('Encoded data length:', encodedData.length);
      console.log('Encoded data:', encodedData);
      console.log('=== END ENCODED DATA ===');

      // Save using FFmpegService
      await FFmpegService.saveOutput(
        processingResult.audioFile,
        encodedData,
        'NP3' // Use NP3 as the device type
      );

      toast.success('Composition saved successfully as .ogg file!');
    } catch (error) {
      console.error('Failed to save composition:', error);
      toast.error('Failed to save composition. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle closing the current composition and resetting to upload state
   */
  const handleCloseComposition = () => {
    // Stop any playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    // Reset all states
    setIsPlaying(false);
    setCurrentDisplayFrame(0);
    setPlaybackProgress(0);
    setPixelStates(new Array(625).fill(false));
    setProcessingResult(null);
    setVideoSettings({
      gamma: 1,
      brightness: 0,
      contrast: 1,
      saturation: 1,
      hue: 0,
      threshold: 128,
      inversion: false
    });

    // Clean up URLs
    if (gifUrl) {
      URL.revokeObjectURL(gifUrl);
      setGifUrl(null);
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    // Reset files
    setGifFile(null);
    setAudioFile(null);

    toast.info('Composition closed. You can upload new files.');
  };

  /**
   * Toggle pixel state when clicked
   * @param index - The index of the pixel to toggle
   */
  const handlePixelClick = (index: number) => {
    setPixelStates((prev) => {
      const newStates = [...prev];
      newStates[index] = !newStates[index];
      return newStates;
    });
  };

  /**
   * Calculate if a pixel should be visible in the circle based on specific pixel ranges
   * @param row - Row index (0-24)
   * @param col - Column index (0-24)
   * @returns boolean indicating if pixel should be visible
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

    // Check if the pixel index falls within any of the visible ranges
    return visibleRanges.some(([start, end]) => {
      return index >= start && index <= end;
    });
  };

  /**
   * Get the index in the 1D array from 2D coordinates
   * @param row - Row index (0-24)
   * @param col - Column index (0-24)
   * @returns index in the 1D array
   */
  const getPixelIndex = (row: number, col: number): number => {
    return row * 25 + col;
  };

  // Constants for sizing
  const UNIT_SIZE = 20; // Reduced unit size for better visibility
  const GRID_SIZE = 25; // 25x25 grid
  const SQUARE_SIZE = GRID_SIZE * UNIT_SIZE; // 500px x 500px

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Custom CSS for slider */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }
          
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: white;
            cursor: pointer;
            border: none;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          }
          
          .slider::-webkit-slider-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            height: 8px;
          }
          
          .slider::-moz-range-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            height: 8px;
            border: none;
          }
        `
        }}
      />

      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToMain}
                className="text-white hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-white/20" />
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-white" />
                <h1 className="text-lg font-semibold font-[ndot] tracking-wider uppercase">
                  {kAppName}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 hover:border-white/40 transition-all duration-200">
                <span className="text-sm font-medium text-white font-[ndot] tracking-wider uppercase">
                  Phone (3) GIF
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 font-[ndot] tracking-wider uppercase">
              Phone (3) GIF to Glyph Matrix
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-white/70 font-[ndot] tracking-wide">
              Synchronize GIF animations with audio for LED matrix display
            </p>
          </div>

          {/* File Upload Section */}
          <div className="mb-8 p-4 sm:p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-4 text-center font-[ndot] tracking-wider uppercase">
              File Upload
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* GIF Upload */}
              <div className="space-y-4">
                <h4 className="text-sm sm:text-base font-medium text-center font-[ndot] tracking-wide uppercase">
                  GIF File
                </h4>
                <div className="text-center">
                  <input
                    type="file"
                    accept="image/gif"
                    onChange={handleGifUpload}
                    className="hidden"
                    id="gif-upload"
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor="gif-upload"
                    className={`inline-flex items-center px-4 py-2 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-200 ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {gifFile ? gifFile.name : 'Upload GIF'}
                  </label>
                </div>
                {gifUrl && (
                  <div className="flex justify-center">
                    <img
                      src={gifUrl}
                      alt="Uploaded GIF"
                      className="max-w-full h-auto rounded-lg border border-white/20"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                )}
              </div>

              {/* Audio Upload */}
              <div className="space-y-4">
                <h4 className="text-sm sm:text-base font-medium text-center font-[ndot] tracking-wide uppercase">
                  Audio File
                </h4>
                <div className="text-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="hidden"
                    id="audio-upload"
                    disabled={isProcessing}
                  />
                  <label
                    htmlFor="audio-upload"
                    className={`inline-flex items-center px-4 py-2 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-200 ${
                      isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {audioFile ? audioFile.name : 'Upload Audio'}
                  </label>
                </div>
                {audioUrl && (
                  <div className="flex justify-center">
                    <audio
                      src={audioUrl}
                      controls
                      className="max-w-full"
                      style={{ maxWidth: '300px' }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Process Button */}
            {gifFile && audioFile && (
              <div className="text-center mt-6">
                <Button
                  onClick={handleProcessFiles}
                  disabled={isProcessing}
                  className="bg-white text-black hover:bg-white/90 font-[ndot] tracking-wider uppercase"
                >
                  {isProcessing ? 'Processing...' : 'Process Files'}
                </Button>

                {isProcessing && (
                  <div className="mt-4">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/70 mt-2">Processing: {processingProgress}%</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* GIF and Dot Matrix Display */}
          {processingResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8">
              {/* GIF Display */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-center font-[ndot] tracking-wider uppercase">
                  GIF Animation
                </h3>
                <div className="flex justify-center">
                  <img
                    src={gifUrl || ''}
                    alt="GIF Animation"
                    className="max-w-full h-auto rounded-lg border border-white/20 hover:border-white/40 transition-colors duration-200"
                    style={{ maxHeight: '300px', maxWidth: '100%' }}
                  />
                </div>
              </div>

              {/* Dot Matrix Display */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-center font-[ndot] tracking-wider uppercase">
                  Phone (3) Glyph Display
                </h3>
                <div className="flex justify-center">
                  <div className="relative">
                    {/* Responsive sizing for dot matrix */}
                    <div
                      className="relative border-2 border-white/30 hover:border-white/50 transition-colors duration-200"
                      style={{
                        width: `min(${SQUARE_SIZE}px, 80vw)`,
                        height: `min(${SQUARE_SIZE}px, 80vw)`,
                        maxWidth: `${SQUARE_SIZE}px`,
                        maxHeight: `${SQUARE_SIZE}px`
                      }}
                    >
                      {/* Circle overlay */}
                      <div
                        className="absolute inset-0 border-2 border-white/50 rounded-full pointer-events-none"
                        style={{
                          width: '100%',
                          height: '100%',
                          top: '0px',
                          left: '0px'
                        }}
                      />

                      {/* Dot matrix grid */}
                      <div
                        className="relative"
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'grid',
                          gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                          gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
                        }}
                      >
                        {Array.from({ length: GRID_SIZE }, (_, row) =>
                          Array.from({ length: GRID_SIZE }, (_, col) => {
                            const index = getPixelIndex(row, col);
                            const isVisible = isPixelInCircle(row, col);
                            const isLit = pixelStates[index];

                            return (
                              <div
                                key={`${row}-${col}`}
                                className={`cursor-pointer transition-all duration-150 ${
                                  isVisible
                                    ? isLit
                                      ? 'bg-white shadow-lg shadow-white/50'
                                      : 'bg-white/20 hover:bg-white/40'
                                    : 'bg-transparent'
                                }`}
                                style={{
                                  borderRadius: '50%'
                                }}
                                onClick={() => isVisible && handlePixelClick(index)}
                                title={
                                  isVisible
                                    ? `Pixel Index: ${index} | Grid: (${row + 1}, ${
                                        col + 1
                                      }) | Position: ${row * 25 + col}`
                                    : 'Outside circle - not interactive'
                                }
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Playback Controls */}
          {processingResult && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 mb-8">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-4 text-center font-[ndot] tracking-wider uppercase">
                Playback Controls
              </h3>

              {/* Synchronized Playback Controls */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isPlaying ? pausePlayback : playSynchronized}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopPlayback}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseComposition}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                  Close
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveComposition}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200"
                >
                  <Download className="h-4 w-4" />
                  Save
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedEditor(true)}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                  Advanced Editor
                </Button>
              </div>

              {/* Progress Bar */}
              <div className="w-full mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={playbackProgress}
                  onChange={handleProgressChange}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider hover:bg-white/20 transition-colors duration-200"
                  style={{
                    background: `linear-gradient(to right, white 0%, white ${playbackProgress}%, rgba(255,255,255,0.1) ${playbackProgress}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>0:00</span>
                  <span>
                    {processingResult
                      ? `${Math.floor(processingResult.duration / 60)}:${(
                          processingResult.duration % 60
                        )
                          .toFixed(0)
                          .padStart(2, '0')}`
                      : '0:00'}
                  </span>
                </div>
              </div>

              {/* Status */}
              {processingResult && (
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-white/70">
                    Frame: {currentDisplayFrame + 1} / {processingResult.displayFrames.length}
                  </p>
                  <p className="text-xs sm:text-sm text-white/70">
                    Time: {((currentDisplayFrame * 16.666) / 1000).toFixed(2)}s
                  </p>
                  <p className="text-xs sm:text-sm text-white/70">
                    Lit pixels: {pixelStates.filter((state) => state).length} / 625
                  </p>
                  {(videoSettings.gamma !== 1 ||
                    videoSettings.brightness !== 0 ||
                    videoSettings.contrast !== 1 ||
                    videoSettings.threshold !== 128 ||
                    videoSettings.inversion !== false) && (
                    <p className="text-xs sm:text-sm text-yellow-400 mt-1">
                      ⚙️ Custom settings active
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Advanced Video Editor Dialog */}
      {processingResult && (
        <AdvancedVideoEditor
          onApplySettings={handleApplyVideoSettings}
          onCancel={() => setShowAdvancedEditor(false)}
          isOpen={showAdvancedEditor}
        />
      )}
    </div>
  );
}
