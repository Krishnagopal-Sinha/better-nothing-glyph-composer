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
  ChevronRight
} from 'lucide-react';
import { kAppName } from '@/lib/consts';
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
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

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
  const [isDragPaintingEnabled, setIsDragPaintingEnabled] = useState(true);
  const [lastPaintedPixel, setLastPaintedPixel] = useState<number | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Zoom state for dot matrix
  const [dotMatrixZoom, setDotMatrixZoom] = useState(0.75);

  // Ref for the dot matrix container
  const dotMatrixContainerRef = useRef<HTMLDivElement>(null);

  // Add state for settings dialog
  const [showDotMatrixSettings, setShowDotMatrixSettings] = useState(false);

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
        console.log('FFmpeg service loaded for export');
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
            console.log('Audio element not ready, skipping frame update');
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
  }, [isVideoPlaying, videoResult, audioElement, playbackSpeed, videoSettings]); // Added videoSettings to dependencies

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
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [videoResult, isVideoPlaying, showAdvancedEditor, showDotMatrixSettings, showCropDialog]);

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
      console.log('Starting video processing with settings:', settings);
      toast.info('Processing video with crop settings... This may take a while.');

      const result = await videoEditorService.processVideoForNP3(videoFile, settings);
      console.log('Video processing result:', result);

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
      const displayFrame = videoResult.displayFrames[frameIndex];
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
        const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));
        if (analysisIndex < videoResult.frameAnalyses.length) {
          const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
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
      console.log('=== CSV DATA FOR EXPORT ===');
      console.log('CSV Length:', csvData.length);
      console.log('Total frames:', videoResult.displayFrames.length);
      console.log('Video duration:', videoResult.duration);
      console.log('Current video settings:', videoSettings);
      console.log('CSV Length:', csvData);
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
      console.log('Recreating audio element');
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
    console.log('NP3Page: Applying video settings:', settings);
    console.log('NP3Page: Previous settings:', videoSettings);

    // Store current playback state
    const wasPlaying = isVideoPlaying;
    const currentTime = audioElement?.currentTime || 0;

    setVideoSettings(settings);
    setShowAdvancedEditor(false);

    // Ensure audio element is properly maintained
    ensureAudioElement();

    // Trigger pre-processing with new settings in the background
    if (videoResult && videoResult.frameAnalyses.length > 0) {
      console.log('NP3Page: Triggering pre-processing with new settings');
      toast.info('Processing video settings for smooth playback...');

      // Pre-process in background without blocking the UI
      preProcessAllFrames()
        .then(() => {
          console.log('NP3Page: Pre-processing completed successfully');
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
    console.log('Starting pre-processing of all frames for efficient playback...');

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

    // Check if audio element is ready
    if (audioElement.readyState === 0) {
      console.log('Audio element not ready, waiting...');
      audioElement.addEventListener('canplay', () => {
        console.log('Audio element ready, starting playback');
        startPlayback();
      });
      return;
    }

    startPlayback();
  };

  const startPlayback = () => {
    if (!audioElement) return;

    console.log('Starting playback with synchronized dot matrix display');

    // Play audio only and update dot matrix
    audioElement.playbackRate = playbackSpeed;
    audioElement
      .play()
      .then(() => {
        setIsVideoPlaying(true);
        console.log('Playback started successfully');
        toast.info(
          `Playing audio at ${playbackSpeed}x speed with synchronized dot matrix display...`
        );
      })
      .catch((error) => {
        console.error('Failed to start audio playback:', error);
        toast.error('Failed to start playback. Please try again.');
        setIsVideoPlaying(false);
      });
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
    }

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
      setTimeout(() => {
        setIsVideoPlaying(true);
      }, 50); // Small delay to ensure seeking is complete
    }
  };

  /**
   * Toggle pixel state when clicked
   * @param index - The index of the pixel to toggle
   */
  const handlePixelClick = (index: number) => {
    // For NP3, set brightness to 4095 (max brightness)
    if (videoResult && currentDisplayFrame < videoResult.frameAnalyses.length) {
      const frameTime = currentDisplayFrame * 16.666; // Convert to milliseconds
      const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));

      if (analysisIndex < videoResult.frameAnalyses.length) {
        const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
        const row = Math.floor(index / 25);
        const col = index % 25;

        // Save current state for undo
        const currentBrightnessMap = frameAnalysis.brightnessMap.map((row) => [...row]);

        // Set brightness to 4095 (max for NP3)
        frameAnalysis.brightnessMap[row][col] = 4095;

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
          // Apply video settings to brightness for display
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
          adjustedBrightness = Math.pow(adjustedBrightness / 255, 1 / videoSettings.gamma) * 255;

          // Inversion
          if (videoSettings.inversion) {
            adjustedBrightness = 255 - adjustedBrightness;
          }

          // Threshold for black & white
          newPixelStates[index] = adjustedBrightness > videoSettings.threshold;
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
    if (!isMouseDown || !isDragPaintingEnabled || !dotMatrixContainerRef.current) return;

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
      if (index !== lastPaintedPixel && isPixelInCircle(row, col)) {
        setLastPaintedPixel(index);

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

            // Set brightness to 4095 (max for NP3)
            frameAnalysis.brightnessMap[pixelRow][pixelCol] = 4095;

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
    if (!isDragPaintingEnabled) return;

    setIsMouseDown(true);
    setLastPaintedPixel(null);

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
    setLastPaintedPixel(null);
  };

  /**
   * Handle mouse leave to stop drag painting
   */
  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsMouseDown(false);
    setLastPaintedPixel(null);
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
            adjustedBrightness = Math.pow(adjustedBrightness / 255, 1 / videoSettings.gamma) * 255;

            // Inversion
            if (videoSettings.inversion) {
              adjustedBrightness = 255 - adjustedBrightness;
            }

            // Threshold for black & white
            const isLit = adjustedBrightness > videoSettings.threshold;
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
    if (!videoResult || currentDisplayFrame <= 0) return;

    const newFrameIndex = currentDisplayFrame - 1;
    setCurrentDisplayFrame(newFrameIndex);

    // Update audio position to match the new frame
    if (audioElement) {
      const newTime = (newFrameIndex * 16.666) / 1000; // Convert to seconds
      audioElement.currentTime = newTime;
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
  };

  /**
   * Navigate to next frame
   */
  const goToNextFrame = () => {
    if (!videoResult || currentDisplayFrame >= videoResult.displayFrames.length - 1) return;

    const newFrameIndex = currentDisplayFrame + 1;
    setCurrentDisplayFrame(newFrameIndex);

    // Update audio position to match the new frame
    if (audioElement) {
      const newTime = (newFrameIndex * 16.666) / 1000; // Convert to seconds
      audioElement.currentTime = newTime;
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 font-[ndot] tracking-wider uppercase">
              Video to Glyph Matrix
            </h2>
            {/* <p className="text-sm sm:text-base lg:text-lg text-white/70 font-[ndot] tracking-wide">
              625 LED dot glyph matrix display (25x25)
            </p> */}
          </div>

          {/* Video and Dot Matrix Display */}
          {videoResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8">
              {/* Processed Video (Cropped & Black & White) */}
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-center font-[ndot] tracking-wider uppercase">
                  Processed Video
                </h3>
                <p className="text-xs sm:text-sm text-white/50 text-center">
                  (Cropped & Black & White)
                </p>
                <div className="flex justify-center">
                  {videoResult ? (
                    <div className="relative">
                      {/* Real-time canvas for processed video playback */}
                      <canvas
                        ref={processedVideoCanvasRef}
                        className="max-w-full h-auto rounded-lg border border-white/20 hover:border-white/40 transition-colors duration-200"
                        style={{ maxHeight: '300px', maxWidth: '100%' }}
                        width={400}
                        height={400}
                      />
                      {/* Placeholder message */}
                      <div
                        className="video-placeholder hidden bg-white/5 border border-white/20 rounded-lg p-8 text-center"
                        style={{ maxHeight: '300px', maxWidth: '100%' }}
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
                      className="bg-white/5 border border-white/20 rounded-lg p-8 text-center"
                      style={{ maxHeight: '300px', maxWidth: '100%' }}
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
                  <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-center font-[ndot] tracking-wider uppercase">
                    Phone (3) Glyph Display
                  </h3>
                  {/* Settings icon button opens the settings dialog */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDotMatrixSettings(true)}
                    className="text-white hover:text-white hover:bg-white/10 transition-all duration-200"
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
                  dragPaintingEnabled={isDragPaintingEnabled}
                  onToggleDragPainting={setIsDragPaintingEnabled}
                />
                <div className="flex justify-center">
                  <div className="relative">
                    {/* Responsive sizing for dot matrix */}
                    <div
                      ref={dotMatrixContainerRef}
                      className="relative transition-colors duration-200"
                      style={{
                        width: `min(${SQUARE_SIZE * dotMatrixZoom}px, 80vw)`,
                        height: `min(${SQUARE_SIZE * dotMatrixZoom}px, 80vw)`,
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
                                      }) | Position: ${row * 25 + col} | Lit: ${isLit}`
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
                  className="flex justify-center items-center space-x-2"
                  style={{ marginTop: '4px' }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDotMatrixZoom(Math.max(0.5, dotMatrixZoom - 0.25))}
                    className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    -
                  </Button>
                  <span className="text-xs text-white/70 min-w-[3rem]">
                    {' '}
                    {(dotMatrixZoom * 100).toFixed(0)}%
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDotMatrixZoom(Math.min(3, dotMatrixZoom + 0.25))}
                    className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
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
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-2xl space-y-2">
              {/* Progress Bar */}
              <div className="flex items-center space-x-2">
                {/* Previous Frame Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousFrame}
                  disabled={!videoResult || currentDisplayFrame <= 0}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous frame"
                  aria-label="Previous frame"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>

                {/* Progress Bar */}
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.01"
                    value={videoProgress}
                    onChange={handleProgressChange}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, white 0%, white ${videoProgress}%, rgba(255,255,255,0.1) ${videoProgress}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                  <span className="text-xs text-white/70 min-w-[2rem] flex-shrink-0">
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
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next frame"
                  aria-label="Next frame"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex flex-wrap justify-center gap-1 items-center">
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
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
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
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
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
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
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
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
                  title="Save as .ogg with pixel data"
                  aria-label="Save video"
                >
                  <Download className="h-3 w-3" />
                </Button>

                {/* Advanced Editor Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedEditor(true)}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
                  title="Open advanced video editor"
                  aria-label="Advanced editor"
                >
                  <Settings className="h-3 w-3" />
                </Button>

                {/* Undo Button - Always visible, disabled if no modifications */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndo}
                  disabled={currentFrameUndoStack.length === 0}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="flex items-center space-x-1 ml-2">
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
                  <span className="text-xs text-white/70 min-w-[1.5rem]">{playbackSpeed}x</span>
                </div>
              </div>
            </div>
          )}

          {/* Video Upload Section */}
          <div className="mb-8 p-4 sm:p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-4 text-center font-[ndot] tracking-wider uppercase">
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
                  className={`inline-flex items-center px-4 py-2 border border-white/20 rounded-lg cursor-pointer hover:bg-white/10 hover:border-white/40 transition-all duration-200 ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Processing...' : 'Upload Video'}
                </label>

                {isProcessing && (
                  <div className="mt-4">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-white h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-white/70 mt-2">
                      Processing: {processingProgress.toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-white/70">
                    Video: {videoResult.totalFrames} frames, {videoResult.duration.toFixed(1)}s
                  </p>
                  <p className="text-xs sm:text-sm text-white/70">
                    Display: {videoResult.displayFrames.length} frames at 60Hz
                  </p>
                  {cropSettings && (
                    <p className="text-xs sm:text-sm text-white/50">
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
                    <p>Click on any pixel in the Phone (3) Glyph Display to turn it on/off</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      3
                    </span>
                    <p>Enable drag-to-paint in settings for continuous drawing</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      4
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
                      <li>• Enable drag-to-paint for smooth line drawing</li>
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

/**
 * DotMatrixSettingsDialog - Settings popup for dot matrix controls (drag to paint, etc.)
 * Uses shadcn/ui Dialog and Switch for accessibility and style.
 */
function DotMatrixSettingsDialog({
  open,
  onOpenChange,
  dragPaintingEnabled,
  onToggleDragPainting
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dragPaintingEnabled: boolean;
  onToggleDragPainting: (enabled: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dot Matrix Settings</DialogTitle>
          <DialogDescription>
            Configure dot matrix editor options for the Phone (3) Glyph Display.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between py-4">
          <span className="text-sm font-medium">Enable Drag to Paint</span>
          <Switch
            checked={dragPaintingEnabled}
            onCheckedChange={onToggleDragPainting}
            aria-label="Enable drag to paint"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
