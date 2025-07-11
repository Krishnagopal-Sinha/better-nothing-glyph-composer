import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Smartphone,
  Upload,
  Play,
  Pause,
  Square,
  Settings,
  X,
  Download,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Eraser,
  Palette,
  Minus,
  Plus
} from 'lucide-react';
import { kAppName, kTimeStepMilis } from '@/lib/consts';
import useGlobalAppStore from '@/lib/timeline_state';
import VideoEditorService, {
  VideoSettings,
  CropSettings,
  FrameAnalysis,
  VideoProcessingResult
} from '@/logic/video_editor_service';
import FFmpegService from '@/logic/ffmpeg_service';
import { encodeStuffTheWayNothingLikesIt } from '@/logic/export_logic';
import CircleCropDialog from '@/components/ui/circle-crop-dialog';
import AdvancedVideoEditor from '@/components/ui/advanced-video-editor';
import DotMatrixSettingsDialog, {
  DotMatrixSettings
} from '@/components/ui/dot-matrix-settings-dialog';
import { toast } from 'sonner';


// Remove duplicate interface declarations since they're imported from VideoEditorService
interface NP3VideoProcessingResult extends VideoProcessingResult {}

/**
 * Custom page for Phone (3) with 625 zones
 * This page provides a specialized interface for the Phone (3) model
 * which has significantly more zones than other Nothing phones
 */
export default function NP3Page() {
  const [, setLocation] = useLocation();
  const changePhoneModel = useGlobalAppStore((state) => state.changePhoneModel);

  // Get VideoEditorService instance
  const videoEditorService = VideoEditorService.getInstance();

  // 25x25 = 625 pixels state array
  const [pixelStates, setPixelStates] = useState<boolean[]>(new Array(625).fill(false));

  // Video processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [videoResult, setVideoResult] = useState<NP3VideoProcessingResult | null>(null);

  // Video playback states
  const [currentDisplayFrame, setCurrentDisplayFrame] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0); // 0-100
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // Default to 1x speed
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Circle crop dialog states
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [cropSettings, setCropSettings] = useState<CropSettings | null>(null);

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

  // Pre-processed frame data for efficient playback
  const [isPreProcessing, setIsPreProcessing] = useState(false);
  const [preProcessingProgress, setPreProcessingProgress] = useState(0);

  // Ref for the canvas to draw the processed video
  const processedVideoCanvasRef = useRef<HTMLCanvasElement>(null);

  // Drag-to-paint states

  const [isMouseDown, setIsMouseDown] = useState(false);

  // Zoom state for dot matrix
  const [dotMatrixZoom, setDotMatrixZoom] = useState(0.75);

  // Ref for the dot matrix container
  const dotMatrixContainerRef = useRef<HTMLDivElement>(null);

  // Add state for settings dialog
  const [showDotMatrixSettings, setShowDotMatrixSettings] = useState(false);

  // Dot matrix settings state
  const [dotMatrixSettings, setDotMatrixSettings] = useState<DotMatrixSettings>({
    dragPaintingEnabled: true,
    brightness: 0,
    contrast: 1,
    threshold: 128,
    saturation: 1,
    filter: 1,
    hue: 0,
    gamma: 1,
    inversion: false
  });

  // Drawing tool states
  const [drawingMode, setDrawingMode] = useState<'draw' | 'erase'>('draw');
  const [strokeWidth, setStrokeWidth] = useState(1); // 1-5 pixels
  const [brightnessValue, setBrightnessValue] = useState(255); // 0-255 to match processed video
  const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);
  const [lastDrawnPixel, setLastDrawnPixel] = useState<number | null>(null);

  // Undo/Redo state for user modifications
  const [undoStack, setUndoStack] = useState<
    Array<{
      frameIndex: number;
      brightnessMap: number[][];
      timestamp: number;
    }>
  >([]);
  const [redoStack, setRedoStack] = useState<
    Array<{
      frameIndex: number;
      brightnessMap: number[][];
      timestamp: number;
    }>
  >([]);

  // Track user-drawn pixels to preserve their brightness values
  const [userDrawnPixels, setUserDrawnPixels] = useState<Set<string>>(new Set());

  // Helper: Get undo/redo stacks for the current frame only
  const getCurrentFrameAnalysisIndex = () => {
    if (!videoResult) return -1;
    const frameTime = currentDisplayFrame * 16.666; // Convert to milliseconds
    return Math.floor(frameTime / (1000 / videoResult.fps));
  };

  const currentFrameAnalysisIndex = getCurrentFrameAnalysisIndex();
  const currentFrameUndoStack = undoStack.filter((u) => u.frameIndex === currentFrameAnalysisIndex);
  const currentFrameRedoStack = redoStack.filter((r) => r.frameIndex === currentFrameAnalysisIndex);

  // Set the phone model to NP3 when this page loads
  useEffect(() => {
    changePhoneModel('NP3');
  }, [changePhoneModel]);

  // Initialize FFmpeg service for export only
  useEffect(() => {
    const initFFmpeg = async () => {
      try {
        await FFmpegService.load();
        // console.log('FFmpeg service loaded for export');
      } catch (error) {
        console.error('Failed to load FFmpeg service:', error);
        toast.error('Failed to load export service');
      }
    };
    initFFmpeg();
  }, []);

  // Progress monitoring
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        const progress = videoEditorService.getProgress();
        setProcessingProgress(progress);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isProcessing, videoEditorService]);

  // Pre-processing progress monitoring
  useEffect(() => {
    if (isPreProcessing) {
      const interval = setInterval(() => {
        // Simulate progress since VideoEditorService doesn't provide pre-processing progress
        setPreProcessingProgress((prev) => {
          if (prev < 90) {
            return prev + Math.random() * 5; // Increment by 0-5%
          }
          return prev;
        });
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isPreProcessing]);

  // Synchronized video playback control (60Hz refresh rate)
  useEffect(() => {
    if (isVideoPlaying && videoResult && audioElement) {
      const interval = setInterval(() => {
        try {
          // Check if audio element is still valid
          if (!audioElement || audioElement.readyState === 0) {
            // console.log('Audio element not ready, skipping frame update');
            return;
          }

          const currentTime = audioElement.currentTime * 1000; // Convert to milliseconds
          // Apply playback speed to frame calculation - this affects both audio and visual elements
          const adjustedTime = currentTime / playbackSpeed;
          const frameIndex = Math.floor(adjustedTime / 16.666); // 60Hz = 16.666ms per frame

          if (frameIndex < videoResult.displayFrames.length) {
            setCurrentDisplayFrame(frameIndex);

            // Draw the current frame to the canvas
            drawCurrentFrameToCanvas(frameIndex);

            // Get the current frame analysis and update pixel states from brightness map
            const frameTime = frameIndex * 16.666; // Convert to milliseconds
            const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

            if (analysisIndex < videoResult.frameAnalyses.length) {
              const frameAnalysis = videoResult.frameAnalyses[analysisIndex];

              // Use the existing helper function to update pixel states
              updatePixelStatesFromFrameAnalysis(frameAnalysis);
            } else {
              // Fallback to original display frame if analysis not available
              const displayFrame = videoResult.displayFrames[frameIndex];
              if (displayFrame && displayFrame.pixelStates) {
                setPixelStates([...displayFrame.pixelStates]);
              } else {
                setPixelStates(new Array(625).fill(false));
              }
            }

            // Update progress - use actual audio time, not adjusted time
            const progress = (currentTime / videoResult.displayDuration) * 100;
            setVideoProgress(Math.min(progress, 100));
          } else {
            // Video ended
            setIsVideoPlaying(false);
            setCurrentDisplayFrame(0);
            setVideoProgress(0);
          }
        } catch (error) {
          console.error('Error in playback loop:', error);
          // Stop playback on error to prevent getting stuck
          setIsVideoPlaying(false);
        }
      }, 16.666); // 60Hz refresh rate

      return () => clearInterval(interval);
    }
  }, [
    videoResult,
    isVideoPlaying,
    showAdvancedEditor,
    showDotMatrixSettings,
    showCropDialog,
    drawingMode,
    strokeWidth,
    showBrightnessSlider
  ]); // Removed dotMatrixSettings from dependencies

  // Handle video settings changes and apply to current frame
  useEffect(() => {
    if (videoResult && videoResult.frameAnalyses.length > 0) {
      // Trigger pre-processing when settings change
      preProcessAllFrames();

      // Draw the initial frame to the canvas
      drawCurrentFrameToCanvas(0);
    }
  }, [videoSettings, videoResult]); // Simplified dependencies

  // Audio element management
  useEffect(() => {
    if (videoResult && !audioElement) {
      const audio = new Audio(URL.createObjectURL(videoResult.audioFile));
      audio.preload = 'metadata';

      audio.addEventListener('ended', () => {
        setIsVideoPlaying(false);
        setCurrentDisplayFrame(0);
        setVideoProgress(0);
      });

      setAudioElement(audio);
    }

    return () => {
      if (audioElement) {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
      }
    };
  }, [videoResult]);

  // Cleanup effect for video elements
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts or video changes
      if (audioElement) {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
      }
      setIsVideoPlaying(false);
      setCurrentDisplayFrame(0);
      setVideoProgress(0);
    };
  }, [audioElement]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default behavior for our shortcuts
      const preventDefault = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      switch (event.code) {
        case 'Space':
          preventDefault();
          // Only play/pause if video is loaded
          if (videoResult) {
            if (isVideoPlaying) {
              pauseVideo();
            } else {
              playVideo();
            }
          } else {
            toast.info('Upload a video first to use playback controls');
          }
          break;

        case 'ArrowLeft':
          preventDefault();
          // Only navigate if video is loaded
          if (videoResult) {
            goToPreviousFrame();
          } else {
            toast.info('Upload a video first to navigate frames');
          }
          break;

        case 'ArrowRight':
          preventDefault();
          // Only navigate if video is loaded
          if (videoResult) {
            goToNextFrame();
          } else {
            toast.info('Upload a video first to navigate frames');
          }
          break;

        case 'KeyZ':
          if (event.ctrlKey || event.metaKey) {
            preventDefault();
            // Only undo if video is loaded
            if (videoResult) {
              handleUndo();
            } else {
              toast.info('Upload a video first to use undo/redo');
            }
          }
          break;

        case 'KeyY':
          if (event.ctrlKey || event.metaKey) {
            preventDefault();
            // Only redo if video is loaded
            if (videoResult) {
              handleRedo();
            } else {
              toast.info('Upload a video first to use undo/redo');
            }
          }
          break;

        case 'KeyR':
          if (event.ctrlKey || event.metaKey) {
            preventDefault();
            // Only reset if video is loaded
            if (videoResult) {
              stopVideo();
            } else {
              toast.info('Upload a video first to use reset');
            }
          }
          break;

        case 'Escape':
          preventDefault();
          // Close advanced editor if open
          if (showAdvancedEditor) {
            setShowAdvancedEditor(false);
          }
          // Close dot matrix settings if open
          if (showDotMatrixSettings) {
            setShowDotMatrixSettings(false);
          }
          // Close crop dialog if open
          if (showCropDialog) {
            handleCropCancel();
          }
          break;

        case 'KeyS':
          if (event.ctrlKey || event.metaKey) {
            preventDefault();
            // Save video if available
            if (videoResult) {
              handleSaveVideo();
            } else {
              toast.info('Upload a video first to save');
            }
          }
          break;

        case 'KeyA':
          if (event.ctrlKey || event.metaKey) {
            preventDefault();
            // Open advanced editor if video is loaded
            if (videoResult) {
              setShowAdvancedEditor(true);
            } else {
              toast.info('Upload a video first to open advanced editor');
            }
          }
          break;

        case 'KeyD':
          if (event.ctrlKey || event.metaKey) {
            preventDefault();
            // Toggle drawing mode
            setDrawingMode((prev) => (prev === 'draw' ? 'erase' : 'draw'));
            toast.info(`Switched to ${drawingMode === 'draw' ? 'erase' : 'draw'} mode`);
          }
          break;

        case 'KeyB':
          if (event.ctrlKey || event.metaKey) {
            preventDefault();
            // Toggle brightness slider
            setShowBrightnessSlider(!showBrightnessSlider);
          }
          break;

        case 'BracketLeft':
          preventDefault();
          // Decrease stroke width
          setStrokeWidth(Math.max(1, strokeWidth - 1));
          break;

        case 'BracketRight':
          preventDefault();
          // Increase stroke width
          setStrokeWidth(Math.min(5, strokeWidth + 1));
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    videoResult,
    isVideoPlaying,
    showAdvancedEditor,
    showDotMatrixSettings,
    showCropDialog,
    drawingMode,
    strokeWidth,
    showBrightnessSlider
  ]); // Removed dotMatrixSettings from dependencies

  /**
   * Get current frame analysis for Advanced Video Editor
   */
  const getCurrentFrameAnalysis = (): FrameAnalysis | undefined => {
    if (!videoResult || !videoResult.frameAnalyses.length) return undefined;

    // Calculate which frame analysis corresponds to current display frame
    const frameTime = currentDisplayFrame * 16.666; // Convert to milliseconds
    const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

    if (analysisIndex < videoResult.frameAnalyses.length) {
      return videoResult.frameAnalyses[analysisIndex];
    }

    // Fallback to first frame if current frame analysis not found
    return videoResult.frameAnalyses[0];
  };

  /**
   * Handle crop dialog cancellation
   */
  const handleCropCancel = () => {
    setShowCropDialog(false);
    setSelectedVideoFile(null);
  };

  /**
   * Navigate back to the main composer page
   */
  const handleBackToMain = () => {
    setLocation('/');
  };

  /**
   * Handle video file upload and show crop dialog
   */
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    // Show crop dialog
    setSelectedVideoFile(file);
    setShowCropDialog(true);
  };

  /**
   * Handle crop completion and process video
   */
  const handleCropComplete = async (videoFile: File, settings: CropSettings) => {
    setShowCropDialog(false);
    setSelectedVideoFile(null);
    setCropSettings(settings);

    // Create URL for processed video display
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // console.log('Starting video processing with settings:', settings);
      toast.info('Processing video with crop settings... This may take a while.');

      const result = await videoEditorService.processVideoForNP3(videoFile, settings);
      // console.log('Video processing result:', result);

      setVideoResult(result);

      toast.success(
        `Video processed successfully! ${result.displayFrames.length} display frames created at 60Hz.`
      );
    } catch (error) {
      console.error('Video processing failed:', error);
      toast.error('Failed to process video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle closing the current video and resetting to upload state
   */
  const handleCloseVideo = () => {
    // Stop any playing video
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    // Reset all video-related states
    setIsVideoPlaying(false);
    setCurrentDisplayFrame(0);
    setVideoProgress(0);
    setPixelStates(new Array(625).fill(false));
    setVideoResult(null);
    setCropSettings(null);
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
    // if (processedVideoUrl) { // This line is removed
    //   URL.revokeObjectURL(processedVideoUrl);
    //   setProcessedVideoUrl(null);
    // }

    toast.info('Video closed. You can upload a new video.');
  };

  /**
   * Convert pixel states to CSV format for export
   */
  const convertPixelStatesToCSV = (): string => {
    if (!videoResult) return '';

    const csvRows: string[] = [];
    const totalFrames = videoResult.displayFrames.length;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const row: number[] = [];

      // Find corresponding frame analysis
      const frameTime = frameIndex * 16.666; // Convert to milliseconds
      const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

      if (analysisIndex < videoResult.frameAnalyses.length) {
        const frameAnalysis = videoResult.frameAnalyses[analysisIndex];

        // Process each pixel with all applied effects
        for (let rowIndex = 0; rowIndex < 25; rowIndex++) {
          for (let colIndex = 0; colIndex < 25; colIndex++) {
            let brightness = frameAnalysis.brightnessMap[rowIndex][colIndex];

            // Check if this pixel was user-drawn
            const isUserDrawn = userDrawnPixels.has(`${analysisIndex}-${rowIndex}-${colIndex}`);

            // Apply video settings first
            brightness = applyVideoSettingsToBrightness(brightness, videoSettings);

            // Apply dot matrix settings (but preserve user-drawn content)
            if (!isUserDrawn) {
              brightness = applyDotMatrixSettingsToBrightness(brightness, dotMatrixSettings);
            }

            // Convert to NP3 range (0-4095) for export
            if (isPixelInCircle(rowIndex, colIndex)) {
              const np3Brightness = (brightness / 255) * 4095;
              row.push(Math.round(np3Brightness));
            } else {
              // Pixels outside circle are always 0
              row.push(0);
            }
          }
        }
      } else {
        // Fallback: fill with zeros if frame analysis not available
        for (let pixelIndex = 0; pixelIndex < 625; pixelIndex++) {
          row.push(0);
        }
      }

      csvRows.push(row.join(','));
    }

    return csvRows.join(',\r\n') + ',';
  };

  /**
   * Refresh video elements to ensure they remain functional after save
   */
  const refreshVideoElements = () => {
    if (videoResult) {
      // Recreate audio element if needed
      if (videoResult.audioFile) {
        const newAudio = new Audio(URL.createObjectURL(videoResult.audioFile));
        newAudio.preload = 'metadata';
        setAudioElement(newAudio);
      }
    }
  };

  /**
   * Save video as .ogg with pixel state data as metadata
   */
  const handleSaveVideo = async () => {
    if (!videoResult) {
      toast.error('No video to save');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingProgress(0);
      toast.info('Converting video to .ogg format with pixel data...');

      // Ensure FFmpegService is loaded
      try {
        await FFmpegService.load();
      } catch (error) {
        console.error('Failed to load FFmpegService:', error);
        toast.error('Failed to load video processing service');
        return;
      }

      // Convert pixel states to CSV
      const csvData = convertPixelStatesToCSV();

      if (!csvData) {
        toast.error('Failed to generate pixel data');
        return;
      }

      // Debug: Print CSV data to console
      // console.log('=== CSV DATA FOR EXPORT ===');
      // console.log('CSV Length:', csvData.length);
      // console.log('Total frames:', videoResult.displayFrames.length);
      // console.log('Video duration:', videoResult.duration);
      // console.log('Current video settings:', videoSettings);
      // console.log('CSV Length:', csvData);
      // console.log('=== END CSV DATA ===');

      // Encode CSV data using the existing export logic
      const encodedData = encodeStuffTheWayNothingLikesIt(csvData);

      if (!encodedData) {
        toast.error('Failed to encode pixel data');
        return;
      }

      // console.log('=== ENCODED DATA ===');
      // console.log('Encoded data length:', encodedData.length);
      // console.log('Encoded data:', encodedData);
      // console.log('=== END ENCODED DATA ===');

      // Save using FFmpegService
      await FFmpegService.saveOutput(
        videoResult.audioFile,
        encodedData,
        'NP3' // Use NP3 as the device type
      );

      toast.success('Video saved successfully as .ogg file!');

      // Refresh video elements to ensure they remain functional
      setTimeout(() => {
        refreshVideoElements();
      }, 100);
    } catch (error) {
      console.error('Failed to save video:', error);
      toast.error('Failed to save video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Ensure audio element is properly maintained
   */
  const ensureAudioElement = () => {
    if (!videoResult) return;

    // If audio element doesn't exist or is invalid, recreate it
    if (!audioElement || audioElement.readyState === 0) {
      // console.log('Recreating audio element');
      const newAudio = new Audio(URL.createObjectURL(videoResult.audioFile));
      newAudio.preload = 'metadata';

      newAudio.addEventListener('ended', () => {
        setIsVideoPlaying(false);
        setCurrentDisplayFrame(0);
        setVideoProgress(0);
      });

      setAudioElement(newAudio);
    }
  };

  /**
   * Handle applying advanced video settings
   */
  const handleApplyVideoSettings = (settings: VideoSettings) => {
    // console.log('NP3Page: Applying video settings:', settings);
    // console.log('NP3Page: Previous settings:', videoSettings);

    // Store current playback state
    const wasPlaying = isVideoPlaying;
    const currentTime = audioElement?.currentTime || 0;

    setVideoSettings(settings);
    setShowAdvancedEditor(false);

    // Ensure audio element is properly maintained
    ensureAudioElement();

    // Trigger pre-processing with new settings in the background
    if (videoResult && videoResult.frameAnalyses.length > 0) {
      // console.log('NP3Page: Triggering pre-processing with new settings');
      toast.info('Processing video settings for smooth playback...');

      // Pre-process in background without blocking the UI
      preProcessAllFrames()
        .then(() => {
          // console.log('NP3Page: Pre-processing completed successfully');
          toast.success('Video settings applied successfully!');

          // If video was playing, ensure it continues
          if (wasPlaying && audioElement) {
            console.log('NP3Page: Resuming playback after pre-processing');
            audioElement.currentTime = currentTime;
            setIsVideoPlaying(true);
          }
        })
        .catch((error) => {
          console.error('NP3Page: Pre-processing failed:', error);
          toast.error('Failed to pre-process frames, but settings were applied');

          // Still try to resume playback even if pre-processing failed
          if (wasPlaying && audioElement) {
            audioElement.currentTime = currentTime;
            setIsVideoPlaying(true);
          }
        });
    } else {
      toast.success('Video settings applied successfully');
    }
  };

  /**
   * Pre-process all video frames with current settings for efficient playback
   */
  const preProcessAllFrames = async () => {
    if (!videoResult || !videoResult.frameAnalyses.length) {
      console.log('NP3Page: No video result or frame analyses available for pre-processing');
      return;
    }

    setIsPreProcessing(true);
    setPreProcessingProgress(0);
    // console.log('Starting pre-processing of all frames for efficient playback...');

    try {
      // Add a small delay to prevent blocking the UI
      await new Promise((resolve) => setTimeout(resolve, 10));

      const processedFrames = await videoEditorService.preProcessFrames(
        videoResult.frameAnalyses,
        videoSettings
      );

      setPreProcessingProgress(100);
      console.log(`Pre-processing complete. ${processedFrames.length} frames ready for playback.`);
    } catch (error) {
      console.error('Error pre-processing frames:', error);
      toast.error('Failed to pre-process frames');
      // Don't throw the error, just log it and continue
    } finally {
      setIsPreProcessing(false);
      // Reset progress after a short delay
      setTimeout(() => setPreProcessingProgress(0), 1000);
    }
  };

  /**
   * Play video with synchronized dot matrix display
   */
  const playVideo = () => {
    if (!audioElement || !videoResult) {
      console.log('Cannot play: audio element or video result not available');
      return;
    }

    // Prevent multiple play attempts
    if (isVideoPlaying) {
      console.log('Video is already playing');
      return;
    }

    // Check if audio element is ready
    if (audioElement.readyState === 0) {
      console.log('Audio element not ready, waiting...');
      audioElement.addEventListener(
        'canplay',
        () => {
          // console.log('Audio element ready, starting playback');
          startPlayback();
        },
        { once: true }
      ); // Use once to prevent multiple listeners
      return;
    }

    startPlayback();
  };

  const startPlayback = async () => {
    if (!audioElement) return;

    try {
      // Set playback rate before playing
      audioElement.playbackRate = playbackSpeed;

      // Use await to properly handle the promise
      await audioElement.play();

      setIsVideoPlaying(true);
      console.log('Playback started successfully');
      toast.info(
        `Playing audio at ${playbackSpeed}x speed with synchronized dot matrix display...`
      );
    } catch (error) {
      console.error('Failed to start audio playback:', error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Playback was interrupted, this is normal when seeking or stopping');
          // Don't show error for interrupted playback
          return;
        }
      }

      toast.error('Failed to start playback. Please try again.');
      setIsVideoPlaying(false);
    }
  };

  /**
   * Pause video
   */
  const pauseVideo = () => {
    if (!audioElement) return;

    try {
      audioElement.pause();
      setIsVideoPlaying(false);
    } catch (error) {
      console.error('Failed to pause video:', error);
      // Force stop even if pause fails
      setIsVideoPlaying(false);
    }
  };

  /**
   * Stop video and reset to beginning
   */
  const stopVideo = () => {
    if (!audioElement) return;

    try {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsVideoPlaying(false);
      setCurrentDisplayFrame(0);
      setVideoProgress(0);
      setPixelStates(new Array(625).fill(false));
    } catch (error) {
      console.error('Failed to stop video:', error);
      // Force reset even if stop fails
      setIsVideoPlaying(false);
      setCurrentDisplayFrame(0);
      setVideoProgress(0);
      setPixelStates(new Array(625).fill(false));
    }
  };

  /**
   * Handle progress bar seeking
   */
  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioElement || !videoResult) return;

    const progress = parseFloat(event.target.value);
    // Account for playback speed when calculating time from progress
    const newTime = (progress / 100) * (videoResult.displayDuration / 1000);

    // Pause playback temporarily during seeking
    const wasPlaying = isVideoPlaying;
    if (wasPlaying) {
      setIsVideoPlaying(false);
      audioElement.pause();
    }

    // Set the new time
    audioElement.currentTime = newTime;
    setVideoProgress(progress);

    // Update display frame immediately (accounting for playback speed)
    const adjustedTime = (newTime * 1000) / playbackSpeed;
    const frameIndex = Math.floor(adjustedTime / 16.666);
    if (frameIndex < videoResult.displayFrames.length) {
      setCurrentDisplayFrame(frameIndex);

      // Draw the current frame to the canvas
      drawCurrentFrameToCanvas(frameIndex);

      // Get the current frame analysis and update pixel states from brightness map
      const frameTime = frameIndex * 16.666; // Convert to milliseconds
      const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

      if (analysisIndex < videoResult.frameAnalyses.length) {
        const frameAnalysis = videoResult.frameAnalyses[analysisIndex];

        // Use the existing helper function to update pixel states
        updatePixelStatesFromFrameAnalysis(frameAnalysis);
      } else {
        // Fallback to original display frame if analysis not available
        const displayFrame = videoResult.displayFrames[frameIndex];
        if (displayFrame && displayFrame.pixelStates) {
          setPixelStates([...displayFrame.pixelStates]);
        } else {
          setPixelStates(new Array(625).fill(false));
        }
      }
    }

    // Resume playback if it was playing before
    if (wasPlaying) {
      // Use a longer delay to ensure seeking is complete and prevent race conditions
      setTimeout(async () => {
        try {
          if (audioElement && !isVideoPlaying) {
            audioElement.playbackRate = playbackSpeed;
            await audioElement.play();
            setIsVideoPlaying(true);
          }
        } catch (error) {
          console.error('Failed to resume playback after seeking:', error);
          // Don't show error for interrupted playback
          if (error instanceof Error && error.name !== 'AbortError') {
            toast.error('Failed to resume playback after seeking');
          }
        }
      }, 100); // Increased delay to ensure seeking is complete
    }
  };

  /**
   * Toggle pixel state when clicked
   * @param index - The index of the pixel to toggle
   */
  const handlePixelClick = (index: number) => {
    // For NP3, set brightness to match processed video range (0-255)
    if (videoResult && currentDisplayFrame < videoResult.frameAnalyses.length) {
      const frameTime = currentDisplayFrame * 16.666; // Convert to milliseconds
      const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

      if (analysisIndex < videoResult.frameAnalyses.length) {
        const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
        const row = Math.floor(index / 25);
        const col = index % 25;

        // Save current state for undo
        const currentBrightnessMap = frameAnalysis.brightnessMap.map((row) => [...row]);

        // Apply stroke width effect for single clicks too
        const centerRow = row;
        const centerCol = col;
        const strokeRadius = Math.floor(strokeWidth / 2);

        // Apply to center pixel and surrounding pixels based on stroke width
        for (
          let r = Math.max(0, centerRow - strokeRadius);
          r <= Math.min(24, centerRow + strokeRadius);
          r++
        ) {
          for (
            let c = Math.max(0, centerCol - strokeRadius);
            c <= Math.min(24, centerCol + strokeRadius);
            c++
          ) {
            if (isPixelInCircle(r, c)) {
              // Apply drawing tool based on mode
              if (drawingMode === 'draw') {
                // Draw mode - set brightness to current brightness value (0-255)
                frameAnalysis.brightnessMap[r][c] = brightnessValue;
                // Mark as user-drawn
                setUserDrawnPixels((prev) => new Set(prev).add(`${analysisIndex}-${r}-${c}`));
              } else {
                // Erase mode - set brightness to 0
                frameAnalysis.brightnessMap[r][c] = 0;
                // Mark as user-drawn (erased)
                setUserDrawnPixels((prev) => new Set(prev).add(`${analysisIndex}-${r}-${c}`));
              }
            }
          }
        }

        // Add to undo stack
        setUndoStack((prev) => [
          ...prev,
          {
            frameIndex: analysisIndex,
            brightnessMap: currentBrightnessMap,
            timestamp: Date.now()
          }
        ]);

        // Clear redo stack when new modification is made
        setRedoStack([]);

        // Update pixel states immediately to reflect the change
        updatePixelStatesFromFrameAnalysis(frameAnalysis);
      }
    } else {
      // Fallback for when no video is loaded
      setPixelStates((prev) => {
        const newStates = [...prev];
        newStates[index] = !newStates[index];
        return newStates;
      });
    }
  };

  /**
   * Undo the last modification for the current frame
   */
  const handleUndo = () => {
    if (currentFrameUndoStack.length === 0) return;

    // Only undo the last modification for the current frame
    const lastModification = currentFrameUndoStack[currentFrameUndoStack.length - 1];
    const frameAnalysis = videoResult?.frameAnalyses[lastModification.frameIndex];
    if (frameAnalysis) {
      // Save current state for redo
      const currentBrightnessMap = frameAnalysis.brightnessMap.map((row) => [...row]);

      // Restore previous state
      frameAnalysis.brightnessMap = lastModification.brightnessMap.map((row) => [...row]);

      // Update user-drawn pixels tracking for this frame
      setUserDrawnPixels((prev) => {
        const newSet = new Set(prev);
        // Remove all user-drawn pixels for this frame
        for (let r = 0; r < 25; r++) {
          for (let c = 0; c < 25; c++) {
            newSet.delete(`${lastModification.frameIndex}-${r}-${c}`);
          }
        }
        // Add back user-drawn pixels based on the restored state
        for (let r = 0; r < 25; r++) {
          for (let c = 0; c < 25; c++) {
            if (lastModification.brightnessMap[r][c] > 0) {
              newSet.add(`${lastModification.frameIndex}-${r}-${c}`);
            }
          }
        }
        return newSet;
      });

      // Remove this undo entry for this frame
      setUndoStack((prev) =>
        prev.filter(
          (u, i) =>
            !(
              u.frameIndex === lastModification.frameIndex &&
              i === prev.lastIndexOf(lastModification)
            )
        )
      );
      // Add to redo stack
      setRedoStack((prev) => [
        ...prev,
        {
          frameIndex: lastModification.frameIndex,
          brightnessMap: currentBrightnessMap,
          timestamp: Date.now()
        }
      ]);
      // Update pixel states to reflect the change
      updatePixelStatesFromFrameAnalysis(frameAnalysis);
      toast.success('Undo completed');
    }
  };

  /**
   * Redo the last undone modification for the current frame
   */
  const handleRedo = () => {
    if (currentFrameRedoStack.length === 0) return;

    // Only redo the last modification for the current frame
    const lastRedo = currentFrameRedoStack[currentFrameRedoStack.length - 1];
    const frameAnalysis = videoResult?.frameAnalyses[lastRedo.frameIndex];
    if (frameAnalysis) {
      // Save current state for undo
      const currentBrightnessMap = frameAnalysis.brightnessMap.map((row) => [...row]);

      // Apply the redo state
      frameAnalysis.brightnessMap = lastRedo.brightnessMap.map((row) => [...row]);

      // Update user-drawn pixels tracking for this frame
      setUserDrawnPixels((prev) => {
        const newSet = new Set(prev);
        // Remove all user-drawn pixels for this frame
        for (let r = 0; r < 25; r++) {
          for (let c = 0; c < 25; c++) {
            newSet.delete(`${lastRedo.frameIndex}-${r}-${c}`);
          }
        }
        // Add back user-drawn pixels based on the restored state
        for (let r = 0; r < 25; r++) {
          for (let c = 0; c < 25; c++) {
            if (lastRedo.brightnessMap[r][c] > 0) {
              newSet.add(`${lastRedo.frameIndex}-${r}-${c}`);
            }
          }
        }
        return newSet;
      });

      // Remove this redo entry for this frame
      setRedoStack((prev) =>
        prev.filter(
          (r, i) => !(r.frameIndex === lastRedo.frameIndex && i === prev.lastIndexOf(lastRedo))
        )
      );
      // Add to undo stack
      setUndoStack((prev) => [
        ...prev,
        {
          frameIndex: lastRedo.frameIndex,
          brightnessMap: currentBrightnessMap,
          timestamp: Date.now()
        }
      ]);
      // Update pixel states to reflect the change
      updatePixelStatesFromFrameAnalysis(frameAnalysis);
      toast.success('Redo completed');
    }
  };

  /**
   * Update pixel states from frame analysis
   */
  const updatePixelStatesFromFrameAnalysis = (frameAnalysis: FrameAnalysis) => {
    const newPixelStates = new Array(625).fill(false);

    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        const index = getPixelIndex(row, col);
        if (isPixelInCircle(row, col)) {
          const brightness = frameAnalysis.brightnessMap[row][col];

          // Check if this pixel was user-drawn
          const isUserDrawn = userDrawnPixels.has(`${currentFrameAnalysisIndex}-${row}-${col}`);

          // Get display brightness, preserving user drawing and applying dot matrix settings
          const normalizedBrightness = getDisplayBrightnessWithDotMatrixSettings(
            brightness,
            dotMatrixSettings,
            isUserDrawn
          );

          // Set pixel state based on whether there's any brightness (not threshold-based)
          newPixelStates[index] = normalizedBrightness > 0;
        }
      }
    }

    setPixelStates(newPixelStates);
  };

  /**
   * Handle mouse move for drag painting
   */
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isMouseDown || !dotMatrixSettings.dragPaintingEnabled || !dotMatrixContainerRef.current)
      return;

    const container = dotMatrixContainerRef.current;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Calculate which pixel was clicked based on the container size
    const containerSize = Math.min(rect.width, rect.height);
    const pixelSize = containerSize / 25;

    const col = Math.floor(x / pixelSize);
    const row = Math.floor(y / pixelSize);

    // Ensure we're within bounds
    if (col >= 0 && col < 25 && row >= 0 && row < 25) {
      const index = getPixelIndex(row, col);

      // Only paint if this is a different pixel than the last one
      if (index !== lastDrawnPixel && isPixelInCircle(row, col)) {
        setLastDrawnPixel(index);

        // Use the same modification tracking as handlePixelClick
        if (videoResult && currentDisplayFrame < videoResult.frameAnalyses.length) {
          const frameTime = currentDisplayFrame * 16.666; // Convert to milliseconds
          const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

          if (analysisIndex < videoResult.frameAnalyses.length) {
            const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
            const pixelRow = Math.floor(index / 25);
            const pixelCol = index % 25;

            // Save current state for undo
            const currentBrightnessMap = frameAnalysis.brightnessMap.map((row) => [...row]);

            // Apply stroke width effect during dragging
            const centerRow = pixelRow;
            const centerCol = pixelCol;
            const strokeRadius = Math.floor(strokeWidth / 2);

            // Apply to center pixel and surrounding pixels based on stroke width
            for (
              let r = Math.max(0, centerRow - strokeRadius);
              r <= Math.min(24, centerRow + strokeRadius);
              r++
            ) {
              for (
                let c = Math.max(0, centerCol - strokeRadius);
                c <= Math.min(24, centerCol + strokeRadius);
                c++
              ) {
                if (isPixelInCircle(r, c)) {
                  // Apply drawing tool based on mode
                  if (drawingMode === 'draw') {
                    // Draw mode - set brightness to current brightness value (0-255)
                    frameAnalysis.brightnessMap[r][c] = brightnessValue;
                    // Mark as user-drawn
                    setUserDrawnPixels((prev) => new Set(prev).add(`${analysisIndex}-${r}-${c}`));
                  } else {
                    // Erase mode - set brightness to 0
                    frameAnalysis.brightnessMap[r][c] = 0;
                    // Mark as user-drawn (erased)
                    setUserDrawnPixels((prev) => new Set(prev).add(`${analysisIndex}-${r}-${c}`));
                  }
                }
              }
            }

            // Add to undo stack
            setUndoStack((prev) => [
              ...prev,
              {
                frameIndex: analysisIndex,
                brightnessMap: currentBrightnessMap,
                timestamp: Date.now()
              }
            ]);

            // Clear redo stack when new modification is made
            setRedoStack([]);

            // Update pixel states immediately to reflect the change
            updatePixelStatesFromFrameAnalysis(frameAnalysis);
          }
        }
      }
    }
  };

  /**
   * Handle mouse down to start drag painting
   */
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!dotMatrixSettings.dragPaintingEnabled) return;

    setIsMouseDown(true);
    setLastDrawnPixel(null);

    // Determine paint mode based on current pixel state
    const container = dotMatrixContainerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const containerSize = Math.min(rect.width, rect.height);
      const pixelSize = containerSize / 25;

      const col = Math.floor(x / pixelSize);
      const row = Math.floor(y / pixelSize);

      if (col >= 0 && col < 25 && row >= 0 && row < 25) {
        const index = getPixelIndex(row, col);
        if (isPixelInCircle(row, col)) {
          // Apply the drawing action with stroke width effect
          handlePixelClick(index);
        }
      }
    }
  };

  /**
   * Handle mouse up to stop drag painting
   */
  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsMouseDown(false);
    setLastDrawnPixel(null);
  };

  /**
   * Handle mouse leave to stop drag painting
   */
  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsMouseDown(false);
    setLastDrawnPixel(null);
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

  /**
   * Draw the current processed frame to the canvas
   */
  const drawCurrentFrameToCanvas = (frameIndex: number) => {
    if (!videoResult || !processedVideoCanvasRef.current) return;

    const canvas = processedVideoCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get the current frame analysis
    const frameTime = frameIndex * 16.666; // Convert to milliseconds
    const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

    if (analysisIndex < videoResult.frameAnalyses.length) {
      const frameAnalysis = videoResult.frameAnalyses[analysisIndex];

      // Create a temporary canvas to process the frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

      if (tempCtx) {
        // Create a 25x25 grid representation of the frame
        const gridSize = 25;
        const cellSize = canvas.width / gridSize;

        // Draw the brightness map as a grid
        for (let row = 0; row < gridSize; row++) {
          for (let col = 0; col < gridSize; col++) {
            const brightness = frameAnalysis.brightnessMap[row][col];
            const x = col * cellSize;
            const y = row * cellSize;

            // Apply dot matrix settings using centralized function
            const adjustedBrightness = applyDotMatrixSettingsToBrightness(
              brightness,
              dotMatrixSettings
            );

            // Threshold for black & white
            const isLit = adjustedBrightness > dotMatrixSettings.threshold;
            const color = isLit ? 255 : 0;

            tempCtx.fillStyle = `rgb(${color}, ${color}, ${color})`;
            tempCtx.fillRect(x, y, cellSize, cellSize);
          }
        }

        // Draw the processed frame to the main canvas
        ctx.drawImage(tempCanvas, 0, 0);
      }
    }
  };

  /**
   * Navigate to previous frame
   */
  const goToPreviousFrame = () => {
    if (!videoResult) return;

    setCurrentDisplayFrame((prevFrame) => {
      const newFrameIndex = Math.max(0, prevFrame - 1);

      // Update audio position to match the new frame
      if (audioElement) {
        const newTime = (newFrameIndex * 16.666) / 1000; // Convert to seconds

        // Pause if currently playing to prevent race conditions
        const wasPlaying = isVideoPlaying;
        if (wasPlaying) {
          audioElement.pause();
          setIsVideoPlaying(false);
        }

        audioElement.currentTime = newTime;

        // Resume if it was playing
        if (wasPlaying) {
          setTimeout(async () => {
            try {
              if (audioElement && !isVideoPlaying) {
                audioElement.playbackRate = playbackSpeed;
                await audioElement.play();
                setIsVideoPlaying(true);
              }
            } catch (error) {
              console.error('Failed to resume playback after frame navigation:', error);
            }
          }, 50);
        }
      }

      // Update progress
      const newProgress = (newFrameIndex / videoResult.displayFrames.length) * 100;
      setVideoProgress(newProgress);

      // Draw the frame to canvas
      drawCurrentFrameToCanvas(newFrameIndex);

      // Update pixel states from brightness map for the new frame
      const frameTime = newFrameIndex * 16.666; // Convert to milliseconds
      const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

      if (analysisIndex < videoResult.frameAnalyses.length) {
        const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
        // Use the existing helper function to update pixel states
        updatePixelStatesFromFrameAnalysis(frameAnalysis);
      } else {
        // Fallback to original display frame if analysis not available
        const displayFrame = videoResult.displayFrames[newFrameIndex];
        if (displayFrame && displayFrame.pixelStates) {
          setPixelStates([...displayFrame.pixelStates]);
        } else {
          setPixelStates(new Array(625).fill(false));
        }
      }

      return newFrameIndex;
    });
  };

  /**
   * Navigate to next frame
   */
  const goToNextFrame = () => {
    if (!videoResult) return;

    setCurrentDisplayFrame((prevFrame) => {
      const newFrameIndex = Math.min(videoResult.displayFrames.length - 1, prevFrame + 1);

      // Update audio position to match the new frame
      if (audioElement) {
        const newTime = (newFrameIndex * 16.666) / 1000; // Convert to seconds

        // Pause if currently playing to prevent race conditions
        const wasPlaying = isVideoPlaying;
        if (wasPlaying) {
          audioElement.pause();
          setIsVideoPlaying(false);
        }

        audioElement.currentTime = newTime;

        // Resume if it was playing
        if (wasPlaying) {
          setTimeout(async () => {
            try {
              if (audioElement && !isVideoPlaying) {
                audioElement.playbackRate = playbackSpeed;
                await audioElement.play();
                setIsVideoPlaying(true);
              }
            } catch (error) {
              console.error('Failed to resume playback after frame navigation:', error);
            }
          }, 50);
        }
      }

      // Update progress
      const newProgress = (newFrameIndex / videoResult.displayFrames.length) * 100;
      setVideoProgress(newProgress);

      // Draw the frame to canvas
      drawCurrentFrameToCanvas(newFrameIndex);

      // Update pixel states from brightness map for the new frame
      const frameTime = newFrameIndex * 16.666; // Convert to milliseconds
      const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

      if (analysisIndex < videoResult.frameAnalyses.length) {
        const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
        // Use the existing helper function to update pixel states
        updatePixelStatesFromFrameAnalysis(frameAnalysis);
      } else {
        // Fallback to original display frame if analysis not available
        const displayFrame = videoResult.displayFrames[newFrameIndex];
        if (displayFrame && displayFrame.pixelStates) {
          setPixelStates([...displayFrame.pixelStates]);
        } else {
          setPixelStates(new Array(625).fill(false));
        }
      }

      return newFrameIndex;
    });
  };

  // Constants for sizing
  const UNIT_SIZE = 20; // Reduced unit size for better visibility
  const GRID_SIZE = 25; // 25x25 grid
  const SQUARE_SIZE = GRID_SIZE * UNIT_SIZE; // 500px x 500px

  /**
   * Apply video settings to brightness value consistently across all components
   * @param brightness - Input brightness value (0-255)
   * @param settings - Video settings to apply
   * @returns Processed brightness value (0-255)
   */
  const applyVideoSettingsToBrightness = (brightness: number, settings: VideoSettings): number => {
    let processedBrightness = brightness;

    // Brightness adjustment
    processedBrightness = Math.max(0, Math.min(255, processedBrightness + settings.brightness));

    // Contrast adjustment
    const factor =
      (259 * (settings.contrast * 255 + 255)) / (255 * (259 - settings.contrast * 255));
    processedBrightness = Math.max(0, Math.min(255, factor * (processedBrightness - 128) + 128));

    // Gamma correction
    processedBrightness = Math.pow(processedBrightness / 255, 1 / settings.gamma) * 255;

    // Inversion
    if (settings.inversion) {
      processedBrightness = 255 - processedBrightness;
    }

    return Math.max(0, Math.min(255, processedBrightness));
  };

  /**
   * Apply dot matrix settings to brightness value
   * @param brightness - Input brightness value (0-255)
   * @param settings - Dot matrix settings to apply
   * @returns Processed brightness value (0-255)
   */
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
      // Simple hue shift - in a real implementation this would be more complex
      processedBrightness = Math.max(0, Math.min(255, processedBrightness + settings.hue * 0.5));
    }

    // Inversion
    if (settings.inversion) {
      processedBrightness = 255 - processedBrightness;
    }

    return Math.max(0, Math.min(255, processedBrightness));
  };

  /**
   * Get display brightness for a pixel, preserving user drawing and applying dot matrix settings
   * @param brightness - Raw brightness value from brightness map
   * @param settings - Dot matrix settings to apply
   * @param isUserDrawn - Whether this pixel was drawn by the user
   * @returns Display brightness value (0-255)
   */
  const getDisplayBrightnessWithDotMatrixSettings = (
    brightness: number,
    settings: DotMatrixSettings,
    isUserDrawn: boolean = false
  ): number => {
    // If it's user-drawn content, don't apply dot matrix settings to preserve the user's intent
    if (isUserDrawn) {
      return Math.max(0, Math.min(255, brightness));
    }

    // For processed video content, apply dot matrix settings
    return applyDotMatrixSettingsToBrightness(brightness, settings);
  };

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
            background: #fff;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
          }
          .slider::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(255,255,255,0.2), 0 3px 6px rgba(255,255,255,0.1);
          }
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #fff;
            cursor: pointer;
            border: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2);
            transition: all 0.2s ease;
          }
          .slider::-webkit-slider-track {
            background: #222;
            border-radius: 10px;
            height: 8px;
            border: 1px solid #333;
          }
          .slider::-moz-range-track {
            background: #222;
            border-radius: 10px;
            height: 8px;
            border: 1px solid #333;
          }
          .dot-matrix-pixel {
            transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
          }
          .dot-matrix-pixel:hover {
            transform: scale(1.2);
            filter: drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3));
          }
          .floating-controls {
            backdrop-filter: blur(20px);
            background: #111;
            border: 1px solid #222;
            box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.4);
          }
          .glass-effect {
            backdrop-filter: blur(16px);
            background: #111;
            border: 1px solid #222;
          }
          .button-hover {
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .button-hover:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255,255,255,0.08);
          }
          .button-hover:active {
            transform: translateY(0);
          }
        `
        }}
      />

      {/* Header */}
      <header className="border-b border-white/10 bg-gradient-to-r from-black/80 via-gray-900/80 to-black/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToMain}
                className="text-white hover:text-white hover:bg-white/10 button-hover rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-gradient-to-b from-white/20 to-transparent" />
              <div className="flex items-center space-x-2">
                <Smartphone className="h-5 w-5 text-white" />
                <h1 className="text-lg font-semibold font-[ndot] tracking-wider uppercase">
                  {kAppName}
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="px-4 py-2 bg-gradient-to-r from-white/10 to-white/5 border border-white/20 rounded-full hover:bg-white/20 hover:border-white/40 transition-all duration-300 button-hover">
                <span className="text-sm font-medium text-white font-[ndot] tracking-wider uppercase">
                  Phone (3)
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
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 font-[ndot] tracking-wider uppercase bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
              Video to Glyph Matrix
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-white/20 to-white/40 mx-auto rounded-full"></div>
          </div>

          {/* Video and Dot Matrix Display */}
          {videoResult && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-8">
              {/* Processed Video (Cropped & Black & White) */}
              <div className="space-y-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-center font-[ndot] tracking-wider uppercase">
                  Processed Video
                </h3>
                <p className="text-xs sm:text-sm text-white/50 text-center">
                  (Cropped & Black & White)
                </p>
                <div className="flex justify-center">
                  {videoResult ? (
                    <div className="relative group">
                      {/* Real-time canvas for processed video playback */}
                      <canvas
                        ref={processedVideoCanvasRef}
                        className="max-w-full h-auto rounded-2xl border border-white/20 hover:border-white/40 transition-all duration-300 shadow-2xl group-hover:shadow-white/10"
                        style={{ maxHeight: '400px', maxWidth: '100%' }}
                        width={400}
                        height={400}
                      />
                      {/* Placeholder message */}
                      <div
                        className="video-placeholder hidden bg-white/5 border border-white/20 rounded-2xl p-8 text-center"
                        style={{ maxHeight: '400px', maxWidth: '100%' }}
                      >
                        <div className="text-white/70 text-sm">
                          <p className="mb-2">Processed video preview not available</p>
                          <p className="text-xs">
                            The dot matrix display will show the processed video data
                          </p>
                          <p className="text-xs mt-2">
                            Focus on the Phone (3) Glyph Display on the right
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bg-white/5 border border-white/20 rounded-2xl p-8 text-center"
                      style={{ maxHeight: '400px', maxWidth: '100%' }}
                    >
                      <div className="text-white/70 text-sm">
                        <p className="mb-2">No processed video available</p>
                        <p className="text-xs">Upload and process a video to see the preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dot Matrix Display */}
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-center font-[ndot] tracking-wider uppercase">
                    Phone (3) Glyph Display
                  </h3>
                  {/* Settings icon button opens the settings dialog */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDotMatrixSettings(true)}
                    className="text-white hover:text-white hover:bg-white/10 transition-all duration-200 button-hover rounded-xl"
                    title="Open dot matrix settings"
                    aria-label="Open dot matrix settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                {/* Dot Matrix Settings Dialog */}
                <DotMatrixSettingsDialog
                  open={showDotMatrixSettings}
                  onOpenChange={setShowDotMatrixSettings}
                  settings={dotMatrixSettings}
                  onSettingsChange={(newSettings) => {
                    setDotMatrixSettings(newSettings);
                    // Apply settings immediately to the current frame
                    if (videoResult && currentDisplayFrame < videoResult.frameAnalyses.length) {
                      const frameTime = currentDisplayFrame * kTimeStepMilis; // Convert to milliseconds
                      const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

                      if (analysisIndex < videoResult.frameAnalyses.length) {
                        const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
                        updatePixelStatesFromFrameAnalysis(frameAnalysis);
                      }
                    }
                  }}
                />

                {/* Drawing Toolbar */}
                <div className="flex justify-center">
                  <div className="glass-effect rounded-2xl p-4 flex flex-wrap items-center justify-center gap-4 shadow-2xl">
                    {/* Drawing Mode Toggle */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={drawingMode === 'draw' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDrawingMode('draw')}
                        className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 button-hover rounded-xl"
                        title="Draw mode"
                      >
                        <Pencil className="h-4 w-4 text-red-500" />
                      </Button>
                      <Button
                        variant={drawingMode === 'erase' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDrawingMode('erase')}
                        className="border-white/20  hover:text-black text-white hover:bg-white/10 hover:border-white/40 button-hover rounded-xl"
                        title="Eraser mode"
                      >
                        <Eraser className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    {/* Stroke Width Control */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-white/70">Stroke:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
                        disabled={strokeWidth <= 1}
                        className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 button-hover rounded-xl"
                        title="Decrease stroke width"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-white min-w-[1.5rem] text-center font-mono">
                        {strokeWidth}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStrokeWidth(Math.min(5, strokeWidth + 1))}
                        disabled={strokeWidth >= 5}
                        className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 button-hover rounded-xl"
                        title="Increase stroke width"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Brightness Control */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-white/70">Brightness:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowBrightnessSlider(!showBrightnessSlider)}
                        className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 button-hover rounded-xl"
                        title="Adjust brightness"
                      >
                        <Palette className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-white min-w-[3rem] text-center font-mono">
                        {Math.round((brightnessValue / 255) * 100)}%
                      </span>
                    </div>

                    {/* Current Mode Indicator */}
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-white/50">Mode:</span>
                      <span className="text-xs text-white font-medium">
                        {drawingMode === 'draw' ? 'Draw' : 'Erase'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Brightness Slider Popup */}
                {showBrightnessSlider && (
                  <div className="flex justify-center">
                    <div className="glass-effect rounded-2xl p-6 max-w-xs w-full shadow-2xl">
                      <div className="space-y-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">Brightness</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowBrightnessSlider(false)}
                            className="text-white hover:text-white hover:bg-white/10 button-hover rounded-xl"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-0">
                          <input
                            type="range"
                            min="0"
                            max="255"
                            step="1"
                            value={brightnessValue}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value);
                              setBrightnessValue(newValue);

                              // Update the current frame's brightness map if we're in draw mode
                              if (
                                videoResult &&
                                currentDisplayFrame < videoResult.frameAnalyses.length
                              ) {
                                const frameTime = currentDisplayFrame * 16.666; // Convert to milliseconds
                                const analysisIndex = Math.floor(
                                  frameTime / (1000 / videoResult.fps)
                                );

                                if (analysisIndex < videoResult.frameAnalyses.length) {
                                  const frameAnalysis = videoResult.frameAnalyses[analysisIndex];

                                  // Update pixel states to reflect the new brightness value
                                  updatePixelStatesFromFrameAnalysis(frameAnalysis);
                                }
                              }
                            }}
                            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                              background: `linear-gradient(to right, white 0%, white ${
                                (brightnessValue / 255) * 100
                              }%, rgba(255,255,255,0.1) ${
                                (brightnessValue / 255) * 100
                              }%, rgba(255,255,255,0.1) 100%)`
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-white/50">
                            {Math.round((brightnessValue / 255) * 100)}% brightness
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <div className="relative">
                    {/* Responsive sizing for dot matrix */}
                    <div
                      ref={dotMatrixContainerRef}
                      className="relative transition-all duration-300 rounded-2xl overflow-hidden shadow-2xl"
                      style={{
                        width: `min(${SQUARE_SIZE * dotMatrixZoom}px, 90vw)`,
                        height: `min(${SQUARE_SIZE * dotMatrixZoom}px, 90vw)`,
                        maxWidth: `${SQUARE_SIZE * dotMatrixZoom}px`,
                        maxHeight: `${SQUARE_SIZE * dotMatrixZoom}px`
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                    >
                      {/* Circle overlay */}
                      <div
                        className="absolute inset-0 border-2 border-white/50 rounded-full pointer-events-none shadow-inner"
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
                            let brightnessLevel = 0;
                            if (
                              videoResult &&
                              currentDisplayFrame < videoResult.frameAnalyses.length
                            ) {
                              const frameTime = currentDisplayFrame * 16.666; // ms
                              const analysisIndex = Math.floor(
                                frameTime / (1000 / videoResult.fps)
                              );
                              if (analysisIndex < videoResult.frameAnalyses.length) {
                                const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
                                // Get brightness from map (0-255 range for both processed video and user drawing)
                                brightnessLevel = frameAnalysis.brightnessMap[row][col];

                                // Check if this pixel was user-drawn
                                const isUserDrawn = userDrawnPixels.has(
                                  `${analysisIndex}-${row}-${col}`
                                );

                                // Get display brightness, preserving user drawing and applying dot matrix settings
                                brightnessLevel = getDisplayBrightnessWithDotMatrixSettings(
                                  brightnessLevel,
                                  dotMatrixSettings,
                                  isUserDrawn
                                );

                                // Keep in 0-255 range for display (no conversion to NP3 range)
                              }
                            }
                            // Map 0-255 to 0-1 opacity for display (simpler and more precise)
                            const opacity = isVisible ? Math.min(1, brightnessLevel / 255) : 0;

                            return (
                              <div
                                key={`${row}-${col}`}
                                className={`dot-matrix-pixel cursor-pointer transition-all duration-150 hover:border-red-400 hover:border-2 ${
                                  isVisible ? 'bg-white' : 'bg-transparent'
                                }`}
                                style={{
                                  borderRadius: '50%',
                                  opacity: opacity,
                                  boxShadow:
                                    brightnessLevel > 128 ? '0 0 8px rgba(255,255,255,0.6)' : 'none'
                                }}
                                onClick={() => isVisible && handlePixelClick(index)}
                                title={
                                  isVisible
                                    ? `Pixel Index: ${index} | Grid: (${row + 1}, ${
                                        col + 1
                                      }) | Brightness: ${Math.round(
                                        (brightnessLevel / 255) * 100
                                      )}%`
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
                {/* Debug info for dot matrix */}
                <div className="text-center text-xs text-white/50">
                  <p>Lit pixels: {pixelStates.filter((state) => state).length} / 625</p>
                  <p>Current frame: {currentDisplayFrame}</p>
                </div>

                {/* Zoom Controls */}
                <div
                  className="flex justify-center items-center space-x-3"
                  style={{ marginTop: '8px' }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDotMatrixZoom(Math.max(0.5, dotMatrixZoom - 0.25))}
                    className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl"
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    -
                  </Button>
                  <span className="text-xs text-white/70 min-w-[3rem] font-mono">
                    {' '}
                    {(dotMatrixZoom * 100).toFixed(0)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDotMatrixZoom(Math.min(3, dotMatrixZoom + 0.25))}
                    className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl"
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Video Controls - Floating at bottom */}
          {videoResult && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 floating-controls rounded-2xl p-4 shadow-2xl space-y-3 min-w-[90vw] max-w-4xl">
              {/* Progress Bar */}
              <div className="flex items-center space-x-3">
                {/* Previous Frame Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousFrame}
                  disabled={!videoResult || currentDisplayFrame <= 0}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed button-hover rounded-xl"
                  title="Previous frame"
                  aria-label="Previous frame"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>

                {/* Progress Bar */}
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.01"
                    value={videoProgress}
                    onChange={handleProgressChange}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, white 0%, white ${videoProgress}%, rgba(255,255,255,0.1) ${videoProgress}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                  <span className="text-xs text-white/70 min-w-[3rem] flex-shrink-0 font-mono">
                    {Math.floor((videoProgress / 100) * (videoResult?.duration || 0))}s
                  </span>
                </div>

                {/* Next Frame Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextFrame}
                  disabled={
                    !videoResult ||
                    currentDisplayFrame >= (videoResult?.displayFrames.length || 0) - 1
                  }
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed button-hover rounded-xl"
                  title="Next frame"
                  aria-label="Next frame"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-2 items-center">
                {/* Play/Pause Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isVideoPlaying) {
                      pauseVideo();
                    } else {
                      playVideo();
                    }
                  }}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl"
                  title={isVideoPlaying ? 'Pause playback' : 'Play video'}
                  aria-label={isVideoPlaying ? 'Pause playback' : 'Play video'}
                >
                  {isVideoPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>

                {/* Stop Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopVideo}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl"
                  title="Stop playback and reset to beginning"
                  aria-label="Stop playback"
                >
                  <Square className="h-3 w-3" />
                </Button>

                {/* Close Video Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseVideo}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl"
                  title="Close current video and reset"
                  aria-label="Close video"
                >
                  <X className="h-3 w-3" />
                </Button>

                {/* Save Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveVideo}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl"
                  title="Save as .ogg with pixel data"
                  aria-label="Save video"
                >
                  <Download className="h-3 w-3" />
                </Button>

                {/* Undo Button - Always visible, disabled if no modifications */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={currentFrameUndoStack.length === 0}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed button-hover rounded-xl"
                  title={
                    currentFrameUndoStack.length > 0
                      ? `Undo last modification for frame ${currentDisplayFrame + 1} (${
                          currentFrameUndoStack.length
                        } changes available)`
                      : 'No modifications to undo'
                  }
                  aria-label="Undo last modification"
                >
                  <Undo2 className="h-3 w-3" />
                </Button>

                {/* Redo Button - Always visible, disabled if no redo history */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={currentFrameRedoStack.length === 0}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed button-hover rounded-xl"
                  title={
                    currentFrameRedoStack.length > 0
                      ? `Redo last undone modification for frame ${currentDisplayFrame + 1} (${
                          currentFrameRedoStack.length
                        } changes available)`
                      : 'No modifications to redo'
                  }
                  aria-label="Redo last undone modification"
                >
                  <Redo2 className="h-3 w-3" />
                </Button>

                {/* Playback Speed */}
                <div className="flex items-center space-x-2 ml-2">
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={playbackSpeed}
                    onChange={(e) => {
                      const newSpeed = parseFloat(e.target.value);
                      setPlaybackSpeed(newSpeed);
                      if (audioElement) {
                        audioElement.playbackRate = newSpeed;
                      }
                      if (videoResult && audioElement) {
                        const currentTime = audioElement.currentTime * 1000;
                        const adjustedTime = currentTime / newSpeed;
                        const frameIndex = Math.floor(adjustedTime / 16.666);
                        if (frameIndex < videoResult.displayFrames.length) {
                          setCurrentDisplayFrame(frameIndex);
                          drawCurrentFrameToCanvas(frameIndex);
                        }
                      }
                    }}
                    className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-xs text-white/70 min-w-[2rem] font-mono">
                    {playbackSpeed}x
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Video Upload Section */}
          <div className="mb-8 p-6 sm:p-8 glass-effect rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-2xl">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold mb-6 text-center font-[ndot] tracking-wider uppercase">
              Select Video
            </h3>

            {!videoResult ? (
              <div className="text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                  id="video-upload"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="video-upload"
                  className={`inline-flex items-center px-6 py-3 border border-white/20 rounded-xl cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-300 button-hover ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="h-5 w-5 mr-3" />
                  {isProcessing ? 'Processing...' : 'Upload Video'}
                </label>

                {isProcessing && (
                  <div className="mt-6">
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-white to-gray-300 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/70 mt-3 font-mono">
                      Processing: {processingProgress.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm sm:text-base text-white/70 font-mono">
                    Video: {videoResult.totalFrames} frames, {videoResult.duration.toFixed(1)}s
                  </p>
                  <p className="text-sm sm:text-base text-white/70 font-mono">
                    Display: {videoResult.displayFrames.length} frames at 60Hz
                  </p>
                  {cropSettings && (
                    <p className="text-sm sm:text-base text-white/50 font-mono">
                      Crop: X{cropSettings.x.toFixed(0)}% Y{cropSettings.y.toFixed(0)}% R
                      {cropSettings.radius.toFixed(0)}%
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Usage Instructions */}
      <div className="container mx-auto px-4 py-8 -mt-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6">
            <h3 className="text-xl font-semibold text-white font-[ndot] tracking-wider uppercase text-center">
              How to Use
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Getting Started */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white font-[ndot] tracking-wide">
                  Getting Started
                </h4>
                <div className="space-y-3 text-sm text-white/80">
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      1
                    </span>
                    <p>Upload a video file using the "Upload Video" button</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      2
                    </span>
                    <p>Crop your video to a circle using the crop dialog</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      3
                    </span>
                    <p>
                      Wait for processing to complete - your video will be converted to 60Hz frames
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      4
                    </span>
                    <p>Use the playback controls to navigate through your video</p>
                  </div>
                </div>
              </div>

              {/* Frame-by-Frame Drawing */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-white font-[ndot] tracking-wide">
                  Frame-by-Frame Drawing
                </h4>
                <div className="space-y-3 text-sm text-white/80">
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      1
                    </span>
                    <p>Navigate to any frame using the progress bar or arrow buttons</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      2
                    </span>
                    <p>Select drawing mode: Draw (pencil) or Erase (eraser)</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      3
                    </span>
                    <p>Adjust stroke width (1-5 pixels) and brightness (0-4095)</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      4
                    </span>
                    <p>Click or drag on pixels to draw/erase with your settings</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      5
                    </span>
                    <p>Use Undo/Redo buttons to correct mistakes on the current frame</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white font-[ndot] tracking-wide">
                Keyboard Shortcuts
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/80">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Space
                  </div>
                  <p className="text-xs">Play/Pause</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    ← →
                  </div>
                  <p className="text-xs">Previous/Next Frame</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + Z
                  </div>
                  <p className="text-xs">Undo (Current Frame)</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + Y
                  </div>
                  <p className="text-xs">Redo (Current Frame)</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + R
                  </div>
                  <p className="text-xs">Reset to Beginning</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Escape
                  </div>
                  <p className="text-xs">Close Dialogs</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + S
                  </div>
                  <p className="text-xs">Save Video</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + A
                  </div>
                  <p className="text-xs">Open Advanced Editor</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + D
                  </div>
                  <p className="text-xs">Switch Drawing Mode</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + B
                  </div>
                  <p className="text-xs">Toggle Brightness Slider</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    [
                  </div>
                  <p className="text-xs">Decrease Stroke Width</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    ]
                  </div>
                  <p className="text-xs">Increase Stroke Width</p>
                </div>
              </div>
            </div>

            {/* Tips and Tricks */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white font-[ndot] tracking-wide">
                Tips & Tricks
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-white/80">
                <div className="space-y-3">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-2">Drawing Tips</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• Use zoom controls for precise pixel editing</li>
                      <li>• Switch between Draw and Erase modes as needed</li>
                      <li>• Adjust stroke width for different line thicknesses</li>
                      <li>• Use brightness control for varying pixel intensities</li>
                      <li>• Only visible pixels (within circle) can be modified</li>
                      <li>• Changes are saved per frame automatically</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-2">Performance Tips</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• Use shorter videos for faster processing</li>
                      <li>• Lower resolution videos process faster</li>
                      <li>• Advanced settings are applied in real-time</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-2">Best Practices</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• Start with simple shapes and patterns</li>
                      <li>• Use frame-by-frame navigation for precise editing</li>
                      <li>• Test your creation with different playback speeds</li>
                      <li>• Save frequently to avoid losing work</li>
                    </ul>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-2">Phone (3) Specific</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• 625 LED zones in 25x25 grid</li>
                      <li>• Only 489 pixels are visible (circular display)</li>
                      <li>• 60Hz refresh rate for smooth animation</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Troubleshooting */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white font-[ndot] tracking-wide">
                Troubleshooting
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/80">
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h5 className="font-medium text-white mb-2">Common Issues</h5>
                  <ul className="space-y-1 text-xs">
                    <li>
                      • <strong>Pixels not responding:</strong> Ensure you're clicking within the
                      circle
                    </li>
                    <li>
                      • <strong>Lag during playback:</strong> Try reducing video resolution
                    </li>
                    <li>
                      • <strong>Settings not applying:</strong> Wait for pre-processing to complete
                    </li>
                  </ul>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h5 className="font-medium text-white mb-2">Performance</h5>
                  <ul className="space-y-1 text-xs">
                    <li>
                      • <strong>Slow processing:</strong> Use shorter videos
                    </li>
                    <li>
                      • <strong>Memory issues:</strong> Close other browser tabs
                    </li>
                    <li>
                      • <strong>Export fails:</strong> Check FFmpeg service is loaded
                    </li>
                    <li>
                      • <strong>Preview lag:</strong> Reduce zoom level
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Circle Crop Dialog */}
      {selectedVideoFile && (
        <CircleCropDialog
          videoFile={selectedVideoFile}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          isOpen={showCropDialog}
        />
      )}

      {/* Advanced Video Editor Dialog */}
      {videoResult && (
        <AdvancedVideoEditor
          onApplySettings={handleApplyVideoSettings}
          onCancel={() => setShowAdvancedEditor(false)}
          isOpen={showAdvancedEditor}
          currentFrameAnalysis={getCurrentFrameAnalysis()}
          currentFrameIndex={currentDisplayFrame}
          totalFrames={videoResult.displayFrames.length}
          currentVideoSettings={videoSettings}
          // Add playback control props
          isVideoPlaying={isVideoPlaying}
          videoProgress={videoProgress}
          onPlayPause={() => {
            if (isVideoPlaying) {
              pauseVideo();
            } else {
              playVideo();
            }
          }}
          onSeek={(progress) => {
            if (!videoResult) return;
            const newTime = (progress / 100) * (videoResult.displayDuration / 1000);

            // Pause playback temporarily during seeking
            const wasPlaying = isVideoPlaying;
            if (wasPlaying) {
              setIsVideoPlaying(false);
            }

            if (audioElement) {
              audioElement.currentTime = newTime;
            }
            setVideoProgress(progress);

            // Update display frame immediately (accounting for playback speed)
            const adjustedTime = (newTime * 1000) / playbackSpeed;
            const frameIndex = Math.floor(adjustedTime / 16.666);
            if (frameIndex < videoResult.displayFrames.length) {
              setCurrentDisplayFrame(frameIndex);

              // Draw the current frame to the canvas
              drawCurrentFrameToCanvas(frameIndex);

              // Get the current frame analysis and update pixel states from brightness map
              const frameTime = frameIndex * 16.666; // Convert to milliseconds
              const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

              if (analysisIndex < videoResult.frameAnalyses.length) {
                const frameAnalysis = videoResult.frameAnalyses[analysisIndex];

                // Use the existing helper function to update pixel states
                updatePixelStatesFromFrameAnalysis(frameAnalysis);
              } else {
                // Fallback to original display frame if analysis not available
                const displayFrame = videoResult.displayFrames[frameIndex];
                if (displayFrame && displayFrame.pixelStates) {
                  setPixelStates([...displayFrame.pixelStates]);
                } else {
                  setPixelStates(new Array(625).fill(false));
                }
              }
            }

            // Resume playback if it was playing before
            if (wasPlaying) {
              setTimeout(() => {
                setIsVideoPlaying(true);
              }, 50); // Small delay to ensure seeking is complete
            }
          }}
          onStop={stopVideo}
        />
      )}

      {/* Pre-processing Progress Overlay */}
      {isPreProcessing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black border border-white/20 rounded-lg p-6 max-w-md w-full">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold text-white">Processing Video Settings</h3>
              <p className="text-sm text-white/70">
                Applying video settings to all frames for smooth playback...
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-3">
                <div
                  className="bg-white h-3 rounded-full transition-all duration-300"
                  style={{ width: `${preProcessingProgress}%` }}
                />
              </div>

              <p className="text-xs text-white/50">{preProcessingProgress.toFixed(1)}% complete</p>

              <p className="text-xs text-white/30">
                This may take a few moments depending on video length
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
