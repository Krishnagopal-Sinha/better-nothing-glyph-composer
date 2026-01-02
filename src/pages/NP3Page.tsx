import { useEffect, useState, useRef, useLayoutEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  // COMMENTED OUT: Drawing-related imports - Drawing feature removed
  // Pencil,
  // Eraser,
  Palette,
  // Minus,
  // Plus,
  RotateCcw
} from 'lucide-react';
import { kAppName, kTimeStepMilis } from '@/lib/consts';
import useGlobalAppStore from '@/lib/timeline_state';
import VideoEditorService, {
  CropSettings,
  FrameAnalysis,
  VideoProcessingResult
} from '@/logic/video_editor_service';
import NP3AudioService, {
  AudioPreset,
  EffectParameters,
  getDefaultParamsForPreset,
  BeatMonitorParams,
  PulseParams,
  AliveThingParams,
  SpinnyParams,
  SpectrumParams,
  RadialSpokesParams,
  BassBlobsParams,
  TrebleSparklesParams,
  PeakDetectorsParams,
  StereoPingpongParams,
  CheckerboardParams,
  HueCycleParams,
  AmbisonicRadialParams,
  StrobeParams,
  NoiseFieldParams,
  NoteMapParams,
  NebulaParams
} from '@/logic/np3_audio_service';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import FFmpegService from '@/logic/ffmpeg_service';
import { encodeStuffTheWayNothingLikesIt } from '@/logic/export_logic';
import CircleCropDialog from '@/components/ui/circle-crop-dialog';
import AdvancedVideoEditor from '@/components/ui/advanced-video-editor';
import DotMatrixSettingsDialog, {
  DotMatrixSettings
} from '@/components/ui/dot-matrix-settings-dialog';
import AllEffectPreviewDialog from '@/components/ui/multi-effect-preview-dialog';
import GlyphPreview from '@/components/ui/glyph-preview';
import { toast } from 'sonner';
import type { AudioData } from '@/logic/np3_audio_service';

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

  // Get NP3AudioService instance
  const audioService = NP3AudioService.getInstance();

  // 25x25 = 625 pixels state array (internal state only)
  const [, setPixelStates] = useState<boolean[]>(new Array(625).fill(false));

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
  const [showMultiEffectPreview, setShowMultiEffectPreview] = useState(false);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  // Pre-processed frame data for efficient playback
  const [isPreProcessing, setIsPreProcessing] = useState(false);
  const [preProcessingProgress, setPreProcessingProgress] = useState(0);

  // Output filename state
  const [outputFilename, setOutputFilename] = useState<string>('glyph_tone');

  // Ref for the canvas to draw the processed video
  const processedVideoCanvasRef = useRef<HTMLCanvasElement>(null);

  // COMMENTED OUT: Drag-to-paint states - Drawing feature removed
  // const [isMouseDown, setIsMouseDown] = useState(false);

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

  // Audio preset states
  const [audioPresets, setAudioPresets] = useState<AudioPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  // Store effect parameters per preset ID
  const [effectParamsMap, setEffectParamsMap] = useState<Map<string, EffectParameters>>(new Map());
  const [effectSettingsOpen, setEffectSettingsOpen] = useState(false);

  // Get current effect params for selected preset
  const getCurrentEffectParams = (): EffectParameters => {
    if (!selectedPreset) {
      return getDefaultParamsForPreset('beatmonitor');
    }
    const params = effectParamsMap.get(selectedPreset);
    if (params) {
      return params;
    }
    // Initialize with defaults if not found
    const defaultParams = getDefaultParamsForPreset(selectedPreset);
    setEffectParamsMap((prev) => new Map(prev).set(selectedPreset, defaultParams));
    return defaultParams;
  };

  const effectParams = getCurrentEffectParams();

  // COMMENTED OUT: Drawing tool states - Drawing feature removed
  // const [drawingMode, setDrawingMode] = useState<'draw' | 'erase'>('draw');
  // const [strokeWidth, setStrokeWidth] = useState(1); // 1-5 pixels
  // const [brightnessValue, setBrightnessValue] = useState(255); // 0-255 to match processed video
  // const [showBrightnessSlider, setShowBrightnessSlider] = useState(false);
  // const [lastDrawnPixel, setLastDrawnPixel] = useState<number | null>(null);

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

  // Add state to track last processed frame
  const [lastProcessedFrame, setLastProcessedFrame] = useState<number>(-1);

  // Debounced progress bar state
  const [pendingProgress, setPendingProgress] = useState<number | null>(null);

  // Debounced value for progress bar
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce timeout for sensitivity changes
  const sensitivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper: Get undo/redo stacks for the current frame only
  const getCurrentFrameAnalysisIndex = () => {
    if (!videoResult) return -1;
    const frameTimeMs = currentDisplayFrame * kTimeStepMilis; // Convert to milliseconds
    return Math.floor(frameTimeMs / (1000 / videoResult.fps));
  };

  /**
   * Get the frame analysis index for a given display frame index
   * @param frameIndex - The display frame index
   * @returns The corresponding frame analysis index, or -1 if not available
   */
  const getFrameAnalysisIndex = (frameIndex: number): number => {
    if (!videoResult) return -1;
    const frameTimeMs = frameIndex * kTimeStepMilis; // Convert to milliseconds
    return Math.floor(frameTimeMs / (1000 / videoResult.fps));
  };

  /**
   * Get the frame analysis for a given display frame index
   * @param frameIndex - The display frame index
   * @returns The corresponding frame analysis, or undefined if not available
   */
  const getFrameAnalysis = (frameIndex: number): FrameAnalysis | undefined => {
    if (!videoResult) return undefined;
    const analysisIndex = getFrameAnalysisIndex(frameIndex);
    if (analysisIndex >= 0 && analysisIndex < videoResult.frameAnalyses.length) {
      return videoResult.frameAnalyses[analysisIndex];
    }
    return undefined;
  };

  /**
   * Get the current frame's brightness map for GlyphPreview
   * Passes raw brightness map EXACTLY like Advanced Video Editor receives it
   * Advanced Video Editor receives currentFrameAnalysis.brightnessMap directly
   * No normalization - let the component process it exactly like Advanced Video Editor
   * Memoized to avoid unnecessary recalculations
   */
  const currentFrameBrightnessMap = useMemo((): number[][] | null => {
    if (!videoResult) return null;
    const frameAnalysis = getFrameAnalysis(currentDisplayFrame);
    if (!frameAnalysis || !frameAnalysis.brightnessMap) return null;

    // Return the brightness map directly, EXACTLY like Advanced Video Editor receives it
    // Advanced Video Editor receives currentFrameAnalysis.brightnessMap and processes it directly
    // No normalization - the component will process it the same way
    return frameAnalysis.brightnessMap;
  }, [videoResult, currentDisplayFrame]);

  const currentFrameAnalysisIndex = getCurrentFrameAnalysisIndex();
  const currentFrameUndoStack = undoStack.filter((u) => u.frameIndex === currentFrameAnalysisIndex);
  const currentFrameRedoStack = redoStack.filter((r) => r.frameIndex === currentFrameAnalysisIndex);

  // Debug effect to track videoResult changes
  useEffect(() => {
    if (videoResult) {
      console.log('NP3Page: VideoResult updated:', {
        originalFileType: videoResult.originalFileType,
        duration: videoResult.duration,
        totalFrames: videoResult.totalFrames,
        displayFrames: videoResult.displayFrames.length,
        audioFile: videoResult.audioFile
          ? {
              name: videoResult.audioFile.name,
              type: videoResult.audioFile.type,
              size: videoResult.audioFile.size
            }
          : null
      });
    } else {
      console.log('NP3Page: VideoResult cleared');
    }
  }, [videoResult]);

  // Set the phone model to NP3 when this page loads
  useEffect(() => {
    changePhoneModel('NP3');
  }, [changePhoneModel]);

  // Load audio presets
  useEffect(() => {
    const presets = audioService.getPresets();
    setAudioPresets(presets);
  }, [audioService]);

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

  // VideoEditorService now uses the shared FFmpeg instance
  useEffect(() => {
    // VideoEditorService will use the shared FFmpegService instance automatically
    // No separate initialization needed
    console.log('VideoEditorService will use shared FFmpeg instance');
  }, []);

  // Initialize VideoEditorService FFmpeg
  useEffect(() => {
    const initVideoEditorFFmpeg = async () => {
      try {
        await videoEditorService.ensureFFmpegLoaded();
        console.log('VideoEditorService FFmpeg loaded successfully');
      } catch (error) {
        console.error('Failed to load VideoEditorService FFmpeg:', error);
        toast.error('Failed to load video processing service');
      }
    };
    initVideoEditorFFmpeg();
  }, [videoEditorService]);

  // Progress monitoring
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        // Check both video and audio service progress
        const videoProgress = videoEditorService.getProgress();
        const audioProgress = audioService.getProgress();

        // Use the higher progress value (whichever service is active)
        const progress = Math.max(videoProgress, audioProgress);
        setProcessingProgress(progress);

        // Only log significant progress changes to avoid spam
        if (progress > 0 && progress < 100 && progress % 10 < 1) {
          console.log(`Processing progress: ${progress.toFixed(0)}%`);
        }
      }, 200); // Faster updates for smoother progress bar
      return () => clearInterval(interval);
    } else {
      // Reset progress when not processing
      setProcessingProgress(0);
    }
  }, [isProcessing, videoEditorService, audioService]);

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

  // COMMENTED OUT: Replaced with GlyphPreview component (DRY principle)
  // Ref for the dot matrix canvas
  // const dotMatrixCanvasRef = useRef<HTMLCanvasElement>(null);

  // COMMENTED OUT: Replaced with GlyphPreview component (DRY principle)
  // Draw the dot matrix to the canvas
  // const drawDotMatrixToCanvas = (frameIndex: number) => {
  //   if (!videoResult || !dotMatrixCanvasRef.current) return;
  //   const canvas = dotMatrixCanvasRef.current;
  //   const ctx = canvas.getContext('2d');
  //   if (!ctx) return;

  //   // Clear canvas
  //   ctx.clearRect(0, 0, canvas.width, canvas.height);

  //   // Get the current frame analysis using the reusable function
  //   const frameAnalysis = getFrameAnalysis(frameIndex);
  //   if (!frameAnalysis) return;

  //   // Validate brightness map structure
  //   if (!frameAnalysis.brightnessMap || !Array.isArray(frameAnalysis.brightnessMap)) {
  //     console.warn('Invalid brightness map structure:', frameAnalysis.brightnessMap);
  //     return;
  //   }

  //   // Draw each pixel
  //   const gridSize = 25;
  //   const cellSize = canvas.width / gridSize;
  //   for (let row = 0; row < gridSize; row++) {
  //     for (let col = 0; col < gridSize; col++) {
  //       if (isPixelInCircle(row, col)) {
  //         // Safety check for brightness map row
  //         if (
  //           !frameAnalysis.brightnessMap[row] ||
  //           !Array.isArray(frameAnalysis.brightnessMap[row])
  //         ) {
  //           console.warn(
  //             `Invalid brightness map row at index ${row}:`,
  //             frameAnalysis.brightnessMap[row]
  //           );
  //           continue;
  //         }

  //         // Safety check for brightness value
  //         if (frameAnalysis.brightnessMap[row][col] === undefined) {
  //           console.warn(
  //             `Invalid brightness value at [${row}][${col}]:`,
  //             frameAnalysis.brightnessMap[row][col]
  //           );
  //           continue;
  //         }

  //         // Brightness values are in NP3 range (0-4095), convert to display range (0-255)
  //         const np3Brightness = frameAnalysis.brightnessMap[row][col];
  //         let brightness = Math.round((np3Brightness / 4095) * 255);
  //         // Check if this pixel was user-drawn
  //         const analysisIndex = getFrameAnalysisIndex(frameIndex);
  //         const isUserDrawn = userDrawnPixels.has(`${analysisIndex}-${row}-${col}`);
  //         // Get display brightness, preserving user drawing and applying dot matrix settings
  //         brightness = getDisplayBrightnessWithDotMatrixSettings(
  //           brightness,
  //           dotMatrixSettings,
  //           isUserDrawn
  //         );
  //         const opacity = Math.min(1, brightness / 255);
  //         ctx.save();
  //         ctx.globalAlpha = opacity;
  //         ctx.fillStyle = '#fff';
  //         ctx.beginPath();
  //         ctx.arc(
  //           col * cellSize + cellSize / 2,
  //           row * cellSize + cellSize / 2,
  //           cellSize * 0.45,
  //           0,
  //           2 * Math.PI
  //         );
  //         ctx.fill();
  //         ctx.restore();
  //       }
  //     }
  //   }
  // };

  // Update the playback effect to draw to the canvas
  useLayoutEffect(() => {
    if (isVideoPlaying && videoResult && audioElement) {
      const interval = setInterval(() => {
        try {
          if (!audioElement || audioElement.readyState === 0) return;
          const currentTime = audioElement.currentTime * 1000;
          const frameIndex = Math.floor(currentTime / kTimeStepMilis);
          if (frameIndex < videoResult.totalFrames && frameIndex !== lastProcessedFrame) {
            setLastProcessedFrame(frameIndex);
            setCurrentDisplayFrame(frameIndex);
            // drawDotMatrixToCanvas(frameIndex); // COMMENTED OUT: Replaced with GlyphPreview component
          }
          const progress = (currentTime / videoResult.duration) * 100;
          setVideoProgress(Math.min(progress, 100));
        } catch (error) {
          console.error('Error in playback loop:', error);
          setIsVideoPlaying(false);
        }
      }, 33.33);
      return () => clearInterval(interval);
    }
  }, [
    videoResult,
    isVideoPlaying,
    audioElement,
    lastProcessedFrame,
    userDrawnPixels,
    dotMatrixSettings
  ]);

  // Also draw to canvas on frame change (for manual navigation)
  useEffect(() => {
    // drawDotMatrixToCanvas(currentDisplayFrame); // COMMENTED OUT: Replaced with GlyphPreview component
    // Also update the video preview canvas for video uploads
    if (videoResult && videoResult.originalFileType === 'video') {
      drawCurrentFrameToCanvas(currentDisplayFrame);
    }
  }, [currentDisplayFrame, videoResult, userDrawnPixels, dotMatrixSettings]);

  // Handle video settings changes and apply to current frame
  useEffect(() => {
    if (videoResult && videoResult.frameAnalyses.length > 0) {
      // Trigger pre-processing when settings change
      preProcessAllFrames();

      // Draw the initial frame to the canvas
      drawCurrentFrameToCanvas(0);
    }
  }, [dotMatrixSettings, videoResult]); // Simplified dependencies

  // Audio element management
  useEffect(() => {
    if (videoResult && !audioElement) {
      console.log(
        'Creating audio element for file:',
        videoResult.audioFile.name,
        'type:',
        videoResult.audioFile.type,
        'size:',
        videoResult.audioFile.size
      );

      // Ensure playing state is false when creating new audio
      setIsVideoPlaying(false);

      const audio = new Audio(URL.createObjectURL(videoResult.audioFile));
      audio.preload = 'metadata';

      // Add event listeners for better audio handling
      audio.addEventListener('loadedmetadata', () => {
        console.log(
          'Audio metadata loaded, duration:',
          audio.duration,
          'readyState:',
          audio.readyState
        );
        if (audio.duration === 0 || audio.duration < 0.1) {
          console.warn('Audio file appears to be empty or very short');
        } else {
          console.log('Audio file has valid duration:', audio.duration);
        }
      });

      // audio.addEventListener('canplay', () => {
      //   console.log('Audio can play, readyState:', audio.readyState);
      // });

      // audio.addEventListener('canplaythrough', () => {
      //   console.log('Audio can play through, readyState:', audio.readyState);
      // });

      audio.addEventListener('error', (e) => {
        console.error('Audio element error:', e);
        console.error('Audio error details:', audio.error);
        toast.error('Failed to load audio file');
      });

      const handleEnded = () => {
        console.log('Audio playback ended');
        setIsVideoPlaying(false);
        setCurrentDisplayFrame(0);
        setVideoProgress(0);
      };
      audio.addEventListener('ended', handleEnded);

      setAudioElement(audio);
    }

    return () => {
      // Cleanup: stop any playing audio and revoke object URL
      // Use a ref or closure to access the current audioElement
      // This cleanup runs when videoResult changes or component unmounts
    };
  }, [videoResult]); // Only depend on videoResult, not audioElement to avoid loops

  // Cleanup effect for video elements - runs when audioElement changes or component unmounts
  useEffect(() => {
    return () => {
      // Cleanup when component unmounts or audioElement changes
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.removeEventListener('ended', () => {});
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

        // COMMENTED OUT: Ctrl/Cmd + Shift + R conflicts with browser hard reload
        // Changed to Ctrl/Cmd + Shift + S (Stop) to avoid system shortcut conflicts
        case 'KeyS':
          if (event.ctrlKey || event.metaKey) {
            if (event.shiftKey) {
              // Ctrl/Cmd + Shift + S: Reset to beginning (Stop)
              preventDefault();
              if (videoResult) {
                stopVideo();
              } else {
                toast.info('Upload a video first to use reset');
              }
            } else {
              // Ctrl/Cmd + S: Save video
              preventDefault();
              if (videoResult) {
                handleSaveVideo();
              } else {
                toast.info('Upload a video first to save');
              }
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

        case 'KeyE':
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

        // COMMENTED OUT: Drawing-related keyboard shortcuts - Drawing feature removed
        // case 'KeyM':
        //   if (event.ctrlKey || event.metaKey) {
        //     preventDefault();
        //     // Toggle drawing mode
        //     setDrawingMode((prev) => (prev === 'draw' ? 'erase' : 'draw'));
        //     toast.info(`Switched to ${drawingMode === 'draw' ? 'erase' : 'draw'} mode`);
        //   }
        //   break;

        // case 'KeyI':
        //   if (event.ctrlKey || event.metaKey) {
        //     preventDefault();
        //     // Toggle brightness slider (I for Intensity/Illumination)
        //     setShowBrightnessSlider(!showBrightnessSlider);
        //   }
        //   break;

        // case 'BracketLeft':
        //   preventDefault();
        //   // Decrease stroke width
        //   setStrokeWidth(Math.max(1, strokeWidth - 1));
        //   break;

        // case 'BracketRight':
        //   preventDefault();
        //   // Increase stroke width
        //   setStrokeWidth(Math.min(5, strokeWidth + 1));
        //   break;
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
    showCropDialog
    // COMMENTED OUT: Drawing-related dependencies - Drawing feature removed
    // drawingMode,
    // strokeWidth,
    // showBrightnessSlider
  ]); // Removed dotMatrixSettings from dependencies

  /**
   * Get current frame analysis for Advanced Video Editor
   */
  const getCurrentFrameAnalysis = (): FrameAnalysis | undefined => {
    if (!videoResult || !videoResult.frameAnalyses.length) return undefined;

    const frameAnalysis = getFrameAnalysis(currentDisplayFrame);
    if (frameAnalysis) {
      return frameAnalysis;
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
   * Handle video/audio file upload and show crop dialog for video files
   */
  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a video file
    if (file.type.startsWith('video/')) {
      // Show crop dialog for video files
      setSelectedVideoFile(file);
      setShowCropDialog(true);
    }
    // Check if it's an audio file
    else if (file.type.startsWith('audio/')) {
      // Process audio file directly (no crop needed)
      await handleAudioUpload(file);
    } else {
      toast.error('Please select a valid video or audio file');
    }
  };

  /**
   * Handle audio file upload and processing
   */
  const handleAudioUpload = async (audioFile: File) => {
    console.log(
      'NP3Page: Starting audio upload for file:',
      audioFile.name,
      'type:',
      audioFile.type,
      'size:',
      audioFile.size
    );

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      toast.info('Processing audio file... This may take a while.');

      // Load audio data for multi-effect preview
      const loadedAudioData = await audioService.loadAudioData(audioFile);
      setAudioData(loadedAudioData);

      // Use selected preset if available, otherwise use default (zeros)
      let result: VideoProcessingResult;
      if (selectedPreset) {
        console.log('NP3Page: Using selected preset:', selectedPreset);
        // Get or initialize params for this preset
        let params = effectParamsMap.get(selectedPreset);
        if (!params) {
          params = getDefaultParamsForPreset(selectedPreset);
          setEffectParamsMap((prev) => new Map(prev).set(selectedPreset, params!));
        }
        result = await audioService.processAudioForNP3WithPreset(audioFile, selectedPreset, params);
      } else {
        console.log('NP3Page: No preset selected, using default processing');
        result = await audioService.processAudioForNP3(audioFile);
      }

      console.log('NP3Page: Audio processing complete. Result:', {
        originalFileType: result.originalFileType,
        duration: result.duration,
        totalFrames: result.totalFrames,
        displayFrames: result.displayFrames.length,
        audioFileSize: result.audioFile.size
      });

      setVideoResult(result);

      // Update default filename based on input file name
      if (audioFile.name) {
        const baseName = audioFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
        const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
        setOutputFilename(sanitized || 'glyph_tone');
      }

      toast.success(
        `Audio processed successfully! ${result.displayFrames.length} display frames created at 60Hz.`
      );
    } catch (error) {
      console.error('Audio processing failed:', error);
      toast.error('Failed to process audio file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle effect parameters change and reprocess audio if preset is selected
   */
  const handleEffectParamsChange = async (newParams: EffectParameters) => {
    if (!selectedPreset) return;
    setEffectParamsMap((prev) => new Map(prev).set(selectedPreset, newParams));

    // Only reprocess if we have audio loaded and a preset selected
    if (videoResult && videoResult.originalFileType === 'audio' && selectedPreset) {
      // Store current playback state to preserve position
      const wasPlaying = isVideoPlaying;
      const savedCurrentTime = audioElement?.currentTime || 0;
      const savedDisplayFrame = currentDisplayFrame;
      const savedProgress = videoProgress;

      setIsProcessing(true);
      setProcessingProgress(0);

      try {
        toast.info('Updating effect parameters...');

        const result = await audioService.processAudioForNP3WithPreset(
          videoResult.audioFile,
          selectedPreset,
          newParams
        );
        setVideoResult(result);

        // Clean up old audio element completely before creating new one
        if (audioElement) {
          // Stop playback immediately
          audioElement.pause();
          audioElement.currentTime = 0;
          // Remove all event listeners to prevent any callbacks
          audioElement.removeEventListener('ended', () => {});
          // Revoke object URL to free memory
          URL.revokeObjectURL(audioElement.src);
          // Clear the audio element reference
          setAudioElement(null);
        }

        // Ensure playing state is false before creating new audio
        setIsVideoPlaying(false);

        // Create new audio element with fresh object URL
        const newAudio = new Audio(URL.createObjectURL(result.audioFile));
        newAudio.preload = 'metadata';

        const handleEnded = () => {
          setIsVideoPlaying(false);
          setCurrentDisplayFrame(0);
          setVideoProgress(0);
        };
        newAudio.addEventListener('ended', handleEnded);

        // Wait for audio to load metadata before setting position
        await new Promise<void>((resolve) => {
          const onLoadedMetadata = () => {
            newAudio.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve();
          };
          newAudio.addEventListener('loadedmetadata', onLoadedMetadata);
          newAudio.load();
        });

        // Restore playback position
        const restoredTime = Math.min(savedCurrentTime, newAudio.duration || 0);
        newAudio.currentTime = restoredTime;

        // Calculate and restore frame position
        const restoredFrame = Math.min(
          savedDisplayFrame,
          Math.floor((restoredTime * 1000) / kTimeStepMilis)
        );
        const restoredProgress = Math.min(
          savedProgress,
          (restoredTime / (result.duration / 1000)) * 100
        );

        setAudioElement(newAudio);
        setCurrentDisplayFrame(restoredFrame);
        setVideoProgress(restoredProgress);
        setLastProcessedFrame(-1);

        // Draw the frame at the restored position
        drawCurrentFrameToCanvas(restoredFrame);

        // Update pixel states from the restored frame
        const restoredFrameAnalysis = getFrameAnalysis(restoredFrame);
        if (restoredFrameAnalysis) {
          updatePixelStatesFromFrameAnalysis(restoredFrameAnalysis);
        }

        toast.success('Effect parameters updated!');

        // Resume playback if it was playing before - ensure only one play() call
        if (wasPlaying) {
          // Use a small delay to ensure state is fully updated
          setTimeout(async () => {
            try {
              // Use the newAudio reference directly (closure) instead of checking audioElement state
              // This ensures we're using the correct audio instance
              if (newAudio) {
                // Check if audio is not already playing
                if (newAudio.paused) {
                  newAudio.playbackRate = playbackSpeed;
                  await newAudio.play();
                  setIsVideoPlaying(true);
                }
              }
            } catch (error) {
              console.error('Failed to resume playback after params change:', error);
              setIsVideoPlaying(false);
            }
          }, 150);
        }
      } catch (error) {
        console.error('Effect parameters update failed:', error);
        toast.error('Failed to update effect parameters. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  /**
   * Reset effect parameters to defaults for the currently selected preset
   */
  const handleResetEffectParams = async () => {
    if (!selectedPreset) {
      toast.error('No effect selected');
      return;
    }

    const defaultParams = getDefaultParamsForPreset(selectedPreset);
    await handleEffectParamsChange(defaultParams);
    toast.success('Effect parameters reset to defaults');
  };

  /**
   * Handle preset selection and reprocess audio
   */
  const handlePresetSelect = async (presetId: string) => {
    if (!videoResult || videoResult.originalFileType !== 'audio') {
      toast.error('No audio file loaded');
      return;
    }

    // Store current playback state to preserve position
    const wasPlaying = isVideoPlaying;
    const savedCurrentTime = audioElement?.currentTime || 0;
    const savedDisplayFrame = currentDisplayFrame;
    const savedProgress = videoProgress;

    setSelectedPreset(presetId);
    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      toast.info(`Applying ${audioPresets.find((p) => p.id === presetId)?.name} preset...`);

      // Get or initialize params for this preset
      let params = effectParamsMap.get(presetId);
      if (!params) {
        params = getDefaultParamsForPreset(presetId);
        setEffectParamsMap((prev) => new Map(prev).set(presetId, params!));
      }

      const result = await audioService.processAudioForNP3WithPreset(
        videoResult.audioFile,
        presetId,
        params
      );
      setVideoResult(result);

      // Clean up old audio element completely before creating new one
      if (audioElement) {
        // Stop playback immediately
        audioElement.pause();
        audioElement.currentTime = 0;
        // Remove all event listeners to prevent any callbacks
        audioElement.removeEventListener('ended', () => {});
        // Revoke object URL to free memory
        URL.revokeObjectURL(audioElement.src);
        // Clear the audio element reference
        setAudioElement(null);
      }

      // Ensure playing state is false before creating new audio
      setIsVideoPlaying(false);

      // Create new audio element with fresh object URL
      const newAudio = new Audio(URL.createObjectURL(result.audioFile));
      newAudio.preload = 'metadata';

      const handleEnded = () => {
        setIsVideoPlaying(false);
        setCurrentDisplayFrame(0);
        setVideoProgress(0);
      };
      newAudio.addEventListener('ended', handleEnded);

      // Wait for audio to load metadata before setting position
      await new Promise<void>((resolve) => {
        const onLoadedMetadata = () => {
          newAudio.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        };
        newAudio.addEventListener('loadedmetadata', onLoadedMetadata);
        newAudio.load();
      });

      // Restore playback position
      const restoredTime = Math.min(savedCurrentTime, newAudio.duration || 0);
      newAudio.currentTime = restoredTime;

      // Calculate and restore frame position
      const restoredFrame = Math.min(
        savedDisplayFrame,
        Math.floor((restoredTime * 1000) / kTimeStepMilis)
      );
      const restoredProgress = Math.min(
        savedProgress,
        (restoredTime / (result.duration / 1000)) * 100
      );

      setAudioElement(newAudio);
      setCurrentDisplayFrame(restoredFrame);
      setVideoProgress(restoredProgress);
      setLastProcessedFrame(-1);

      // Draw the frame at the restored position
      drawCurrentFrameToCanvas(restoredFrame);

      // Update pixel states from the restored frame
      const restoredFrameAnalysis = getFrameAnalysis(restoredFrame);
      if (restoredFrameAnalysis) {
        updatePixelStatesFromFrameAnalysis(restoredFrameAnalysis);
      }

      toast.success(
        `${audioPresets.find((p) => p.id === presetId)?.name} preset applied successfully!`
      );

      // Resume playback if it was playing before - ensure only one play() call
      if (wasPlaying) {
        // Use a small delay to ensure state is fully updated
        setTimeout(async () => {
          try {
            // Use the newAudio reference directly (closure) instead of checking audioElement state
            // This ensures we're using the correct audio instance
            if (newAudio) {
              // Check if audio is not already playing
              if (newAudio.paused) {
                newAudio.playbackRate = playbackSpeed;
                await newAudio.play();
                setIsVideoPlaying(true);
              }
            }
          } catch (error) {
            console.error('Failed to resume playback after preset change:', error);
            setIsVideoPlaying(false);
            // Don't show error for interrupted playback
            if (error instanceof Error && error.name !== 'AbortError') {
              toast.error('Failed to resume playback after preset change');
            }
          }
        }, 150); // Small delay to ensure processing is complete
      }
    } catch (error) {
      console.error('Preset application failed:', error);
      toast.error('Failed to apply preset. Please try again.');
    } finally {
      setIsProcessing(false);
    }
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

      // Update default filename based on input file name
      if (videoFile.name) {
        const baseName = videoFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
        const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
        setOutputFilename(sanitized || 'glyph_tone');
      }

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
    // Stop any playing video and clean up audio element
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      // Revoke the object URL to free memory
      URL.revokeObjectURL(audioElement.src);
      // Set audio element to null to ensure it's completely cleaned up
      setAudioElement(null);
    }

    // Reset all video-related states
    setIsVideoPlaying(false);
    setCurrentDisplayFrame(0);
    setVideoProgress(0);
    setPixelStates(new Array(625).fill(false));
    setVideoResult(null);
    setCropSettings(null);
    setSelectedPreset(null);
    setDotMatrixSettings({
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

    // Reset frame tracking
    setLastProcessedFrame(-1);

    // Clear undo/redo stacks
    setUndoStack([]);
    setRedoStack([]);
    setUserDrawnPixels(new Set());

    toast.info('Video/Audio closed. You can upload a new file.');
  };

  /**
   * Convert pixel states to CSV format for export
   */
  const convertPixelStatesToCSV = (): string => {
    if (!videoResult) {
      console.error('convertPixelStatesToCSV: No videoResult available');
      return '';
    }

    if (!videoResult.frameAnalyses || videoResult.frameAnalyses.length === 0) {
      console.error('convertPixelStatesToCSV: No frame analyses available');
      return '';
    }

    const csvRows: string[] = [];
    const totalFrames = videoResult.displayFrames.length;

    console.log(
      `convertPixelStatesToCSV: Processing ${totalFrames} frames with ${videoResult.frameAnalyses.length} frame analyses`
    );

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const row: number[] = [];

      // Find corresponding frame analysis using the reusable function
      const frameAnalysis = getFrameAnalysis(frameIndex);

      if (frameAnalysis && frameAnalysis.brightnessMap) {
        // Validate brightness map structure
        if (
          !Array.isArray(frameAnalysis.brightnessMap) ||
          frameAnalysis.brightnessMap.length !== 25
        ) {
          console.warn(
            `convertPixelStatesToCSV: Invalid brightness map structure for frame ${frameIndex}, using fallback`
          );
          // Fallback: fill with zeros
          for (let pixelIndex = 0; pixelIndex < 625; pixelIndex++) {
            row.push(0);
          }
        } else {
          // Process each pixel with all applied effects
          for (let rowIndex = 0; rowIndex < 25; rowIndex++) {
            for (let colIndex = 0; colIndex < 25; colIndex++) {
              // Validate brightness map access
              if (
                !frameAnalysis.brightnessMap[rowIndex] ||
                !Array.isArray(frameAnalysis.brightnessMap[rowIndex]) ||
                frameAnalysis.brightnessMap[rowIndex].length !== 25 ||
                typeof frameAnalysis.brightnessMap[rowIndex][colIndex] !== 'number'
              ) {
                console.warn(
                  `convertPixelStatesToCSV: Invalid brightness value at [${rowIndex}][${colIndex}] for frame ${frameIndex}, using 0`
                );
                row.push(0);
                continue;
              }

              let brightness = frameAnalysis.brightnessMap[rowIndex][colIndex];

              // Ensure brightness is a valid number
              if (isNaN(brightness) || !isFinite(brightness)) {
                brightness = 0;
              }

              // Clamp brightness to valid range
              brightness = Math.max(0, Math.min(255, brightness));

              // Check if this pixel was user-drawn
              const analysisIndex = getFrameAnalysisIndex(frameIndex);
              const isUserDrawn = userDrawnPixels.has(`${analysisIndex}-${rowIndex}-${colIndex}`);

              // Apply dot matrix settings (but preserve user-drawn content)
              if (!isUserDrawn) {
                brightness = applyDotMatrixSettingsToBrightness(brightness, dotMatrixSettings);
              }

              // Convert to NP3 range (0-4095) for export
              if (isPixelInCircle(rowIndex, colIndex)) {
                const np3Brightness = (brightness / 255) * 4095;
                row.push(Math.round(Math.max(0, Math.min(4095, np3Brightness))));
              } else {
                // Pixels outside circle are always 0
                row.push(0);
              }
            }
          }
        }
      } else {
        // Fallback: fill with zeros if frame analysis not available
        console.warn(
          `convertPixelStatesToCSV: No frame analysis for frame ${frameIndex}, using fallback`
        );
        for (let pixelIndex = 0; pixelIndex < 625; pixelIndex++) {
          row.push(0);
        }
      }

      // Validate row length
      if (row.length !== 625) {
        console.error(
          `convertPixelStatesToCSV: Invalid row length ${row.length} for frame ${frameIndex}, expected 625`
        );
        // Pad or truncate to correct length
        while (row.length < 625) {
          row.push(0);
        }
        row.splice(625);
      }

      csvRows.push(row.join(','));
    }

    if (csvRows.length === 0) {
      console.error('convertPixelStatesToCSV: No CSV rows generated');
      return '';
    }

    const csvData = csvRows.join(',\r\n') + ',';

    console.log(
      `convertPixelStatesToCSV: Generated CSV with ${csvRows.length} frames, total length: ${csvData.length}`
    );

    return csvData;
  };

  /**
   * Refresh video elements to ensure they remain functional after save
   */
  const refreshVideoElements = () => {
    if (videoResult) {
      // Clean up old audio element before creating new one
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.removeEventListener('ended', () => {});
        URL.revokeObjectURL(audioElement.src);
        setAudioElement(null);
      }

      // Ensure playing state is false
      setIsVideoPlaying(false);

      // Recreate audio element if needed
      if (videoResult.audioFile) {
        const newAudio = new Audio(URL.createObjectURL(videoResult.audioFile));
        newAudio.preload = 'metadata';

        const handleEnded = () => {
          setIsVideoPlaying(false);
          setCurrentDisplayFrame(0);
          setVideoProgress(0);
        };
        newAudio.addEventListener('ended', handleEnded);

        setAudioElement(newAudio);
      }
    }
  };

  /**
   * Save video as .ogg with pixel state data as metadata
   */
  const handleSaveVideo = async () => {
    // Validate export pipeline first
    const validation = validateExportPipeline();
    if (!validation.isValid) {
      console.error('Export pipeline validation failed:', validation.errors);
      toast.error(`Export validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    // Additional null check after validation
    if (!videoResult) {
      toast.error('No video to save');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingProgress(0);
      toast.info('Starting export process...');

      // Ensure FFmpegService is loaded
      try {
        setProcessingProgress(5);
        // FFmpegService is already loaded globally, no need to reload
        toast.info('Using shared video processing service...');
      } catch (error) {
        console.error('Failed to access FFmpegService:', error);
        toast.error('Failed to access video processing service');
        return;
      }

      // Convert pixel states to CSV
      setProcessingProgress(15);
      toast.info('Generating pixel data...');
      const csvData = convertPixelStatesToCSV();

      if (!csvData) {
        toast.error('Failed to generate pixel data');
        return;
      }

      // Validate CSV data
      if (csvData.length < 100) {
        console.warn('CSV data seems too short, may indicate processing issue');
      }

      console.log('Export pipeline: CSV data generated successfully');
      console.log('Export pipeline: CSV length:', csvData.length);
      console.log('Export pipeline: Total frames:', videoResult.displayFrames.length);

      // Encode CSV data using the existing export logic
      setProcessingProgress(35);
      toast.info('Encoding pixel data...');
      const encodedData = encodeStuffTheWayNothingLikesIt(csvData);

      if (!encodedData) {
        toast.error('Failed to encode pixel data');
        return;
      }

      console.log('Export pipeline: Data encoded successfully');
      console.log('Export pipeline: Encoded data length:', encodedData.length);

      // Validate encoded data
      if (encodedData.length < 10) {
        console.warn('Encoded data seems too short, may indicate encoding issue');
      }

      // Save using FFmpegService with timeout
      setProcessingProgress(60);
      toast.info('Converting to .ogg format...');

      // Use custom filename if provided, otherwise use default
      const filename = outputFilename.trim() || 'glyph_tone';
      const savePromise = FFmpegService.saveOutput(
        videoResult.audioFile,
        encodedData,
        'NP3', // Use NP3 as the device type
        filename // Optional custom filename
      );

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Export timeout after 60 seconds')), 60000);
      });

      await Promise.race([savePromise, timeoutPromise]);

      setProcessingProgress(100);
      toast.success('Video saved successfully as .ogg file!');

      // Refresh video elements to ensure they remain functional
      setTimeout(() => {
        refreshVideoElements();
      }, 100);
    } catch (error) {
      console.error('Failed to save video:', error);

      // Provide specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          toast.error('Export timed out. Please try again with a shorter video.');
        } else if (error.message.includes('FFmpeg')) {
          toast.error('Video processing error. Please try again.');
        } else if (error.message.includes('audio')) {
          toast.error('Audio processing error. Please try again.');
        } else {
          toast.error(`Export failed: ${error.message}`);
        }
      } else {
        toast.error('Failed to save video. Please try again.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  /**
   * Ensure audio element is properly maintained
   */
  const ensureAudioElement = () => {
    if (!videoResult) return;

    // If audio element doesn't exist or is invalid, recreate it
    if (!audioElement || audioElement.readyState === 0) {
      // Clean up old audio element if it exists
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        audioElement.removeEventListener('ended', () => {});
        URL.revokeObjectURL(audioElement.src);
      }

      // Ensure playing state is false
      setIsVideoPlaying(false);

      // console.log('Recreating audio element');
      const newAudio = new Audio(URL.createObjectURL(videoResult.audioFile));
      newAudio.preload = 'metadata';

      const handleEnded = () => {
        setIsVideoPlaying(false);
        setCurrentDisplayFrame(0);
        setVideoProgress(0);
      };
      newAudio.addEventListener('ended', handleEnded);

      setAudioElement(newAudio);
    }
  };

  /**
   * Handle applying advanced video settings
   */
  const handleApplyDotMatrixSettings = (settings: DotMatrixSettings) => {
    // console.log('NP3Page: Applying dot matrix settings:', settings);
    // console.log('NP3Page: Previous settings:', dotMatrixSettings);

    // Store current playback state
    const wasPlaying = isVideoPlaying;
    const currentTime = audioElement?.currentTime || 0;

    setDotMatrixSettings(settings);
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

      // const processedFrames = await videoEditorService.preProcessFrames(
      //   videoResult.frameAnalyses,
      //   videoSettings
      // );

      setPreProcessingProgress(100);
      // console.log(`Pre-processing complete. ${processedFrames.length} frames ready for playback.`);
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

    // Check if audio file has actual content
    if (audioElement.duration === 0 || audioElement.duration < 0.1) {
      console.warn('Audio file is empty or too short, cannot play');
      toast.info('No audio content available. Video frames will still be displayed.');
      return;
    }

    // Check if audio element is ready
    if (audioElement.readyState === 0) {
      console.log('Audio element not ready, waiting...');
      audioElement.addEventListener(
        'canplay',
        () => {
          console.log('Audio element ready, starting playback');
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

    // Prevent multiple simultaneous play() calls
    if (isVideoPlaying) {
      console.log('Playback already in progress, ignoring duplicate play() call');
      return;
    }

    try {
      // Check if audio file has actual content (not just a header)
      if (audioElement.duration === 0 || audioElement.duration < 0.1) {
        console.warn('Audio file is empty or too short, skipping playback');
        toast.info('No audio content available for playback');
        return;
      }

      // Set playback rate before playing
      audioElement.playbackRate = playbackSpeed;

      // Reset frame tracking
      setLastProcessedFrame(-1);

      // Set playing state before play() to prevent duplicate calls
      setIsVideoPlaying(true);

      // Use await to properly handle the promise
      await audioElement.play();

      console.log('Playback started successfully');
      toast.info(
        `Playing audio at ${playbackSpeed}x speed with synchronized dot matrix display...`
      );
    } catch (error) {
      console.error('Failed to start audio playback:', error);

      // Reset playing state on error
      setIsVideoPlaying(false);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Playback was interrupted, this is normal when seeking or stopping');
          // Don't show error for interrupted playback
          return;
        }
      }

      toast.error('Failed to start playback. Please try again.');
    }
  };

  /**
   * Pause video
   */
  const pauseVideo = () => {
    if (!audioElement) return;

    try {
      // Stop playback immediately
      audioElement.pause();
      // Ensure playing state is false
      setIsVideoPlaying(false);
      // Reset frame tracking
      setLastProcessedFrame(-1);
    } catch (error) {
      console.error('Failed to pause video:', error);
      // Force stop even if pause fails
      setIsVideoPlaying(false);
      setLastProcessedFrame(-1);
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
      setLastProcessedFrame(-1);
    } catch (error) {
      console.error('Failed to stop video:', error);
      // Force reset even if stop fails
      setIsVideoPlaying(false);
      setCurrentDisplayFrame(0);
      setVideoProgress(0);
      setPixelStates(new Array(625).fill(false));
      setLastProcessedFrame(-1);
    }
  };

  /**
   * Handle progress bar seeking (currently unused)
   */
  // const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {

  // };

  // New handler for immediate slider movement
  const handlePendingProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const progress = parseFloat(event.target.value);
    setPendingProgress(progress);
  };

  // Debounce and commit the progress change
  useEffect(() => {
    if (pendingProgress === null) return;
    // Clear any previous debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    // Debounce: only update after 120ms of no changes
    debounceTimeoutRef.current = setTimeout(() => {
      handleProgressChangeCommitted(pendingProgress);
      debounceTimeoutRef.current = null;
    }, 120);
    // Optionally, update a preview here if desired
    // drawCurrentFrameToCanvas(...) for instant feedback
    // setCurrentDisplayFrame(...) for instant feedback
    // But do not update videoProgress or audioElement.currentTime until committed
    //
    // Optionally, pause playback while scrubbing
    // if (isVideoPlaying) {
    //   pauseVideo();
    // }
    //
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [pendingProgress]);

  // The committed handler (was handleProgressChange)
  const handleProgressChangeCommitted = (progress: number) => {
    if (!audioElement || !videoResult) return;

    // Calculate time from progress (no playbackSpeed adjustment)
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
    setCurrentDisplayFrame(Math.floor((newTime * 1000) / kTimeStepMilis));

    // Draw the current frame to the canvas
    drawCurrentFrameToCanvas(Math.floor((newTime * 1000) / kTimeStepMilis));

    // Get the current frame analysis and update pixel states from brightness map
    const frameAnalysis = getFrameAnalysis(Math.floor((newTime * 1000) / kTimeStepMilis));

    if (frameAnalysis) {
      // Use the existing helper function to update pixel states
      updatePixelStatesFromFrameAnalysis(frameAnalysis);
    } else {
      // Fallback to original display frame if analysis not available
      const displayFrame = videoResult.displayFrames[Math.floor((newTime * 1000) / kTimeStepMilis)];
      if (displayFrame && displayFrame.pixelStates) {
        setPixelStates([...displayFrame.pixelStates]);
      } else {
        setPixelStates(new Array(625).fill(false));
      }
    }

    // Resume playback if it was playing before
    if (wasPlaying) {
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

  // COMMENTED OUT: Drawing feature removed
  /**
   * Toggle pixel state when clicked
   * @param index - The index of the pixel to toggle
   */
  // const handlePixelClick = (index: number) => {
  //   // For NP3, set brightness to match processed video range (0-255)
  //   if (videoResult && currentDisplayFrame < videoResult.frameAnalyses.length) {
  //     const frameAnalysis = getFrameAnalysis(currentDisplayFrame);

  //     if (frameAnalysis) {
  //       const row = Math.floor(index / 25);
  //       const col = index % 25;

  //       // Save current state for undo
  //       const currentBrightnessMap = frameAnalysis.brightnessMap.map((row) => [...row]);

  //       // Apply stroke width effect for single clicks too
  //       const centerRow = row;
  //       const centerCol = col;
  //       const strokeRadius = Math.floor(strokeWidth / 2);

  //       // Apply to center pixel and surrounding pixels based on stroke width
  //       for (
  //         let r = Math.max(0, centerRow - strokeRadius);
  //         r <= Math.min(24, centerRow + strokeRadius);
  //         r++
  //       ) {
  //         for (
  //           let c = Math.max(0, centerCol - strokeRadius);
  //           c <= Math.min(24, centerCol + strokeRadius);
  //           c++
  //         ) {
  //           if (isPixelInCircle(r, c)) {
  //             // Apply drawing tool based on mode
  //             if (drawingMode === 'draw') {
  //               // Draw mode - set brightness to current brightness value (0-255)
  //               frameAnalysis.brightnessMap[r][c] = brightnessValue;
  //               // Mark as user-drawn
  //               setUserDrawnPixels((prev) =>
  //                 new Set(prev).add(`${currentFrameAnalysisIndex}-${r}-${c}`)
  //               );
  //             } else {
  //               // Erase mode - set brightness to 0
  //               frameAnalysis.brightnessMap[r][c] = 0;
  //               // Mark as user-drawn (erased)
  //               setUserDrawnPixels((prev) =>
  //                 new Set(prev).add(`${currentFrameAnalysisIndex}-${r}-${c}`)
  //               );
  //             }
  //           }
  //         }
  //       }

  //       // Add to undo stack
  //       setUndoStack((prev) => [
  //         ...prev,
  //         {
  //           frameIndex: currentFrameAnalysisIndex,
  //           brightnessMap: currentBrightnessMap,
  //           timestamp: Date.now()
  //         }
  //       ]);

  //       // Clear redo stack when new modification is made
  //       setRedoStack([]);

  //       // Update pixel states immediately to reflect the change
  //       updatePixelStatesFromFrameAnalysis(frameAnalysis);
  //     }
  //   } else {
  //     // Fallback for when no video is loaded
  //     setPixelStates((prev) => {
  //       const newStates = [...prev];
  //       newStates[index] = !newStates[index];
  //       return newStates;
  //     });
  //   }
  // };

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
          // Brightness values are in NP3 range (0-4095), convert to display range (0-255)
          const np3Brightness = frameAnalysis.brightnessMap[row][col];
          const brightness = Math.round((np3Brightness / 4095) * 255);

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

    // Use functional update to ensure we're not overwriting concurrent updates
    setPixelStates((prevStates) => {
      // Only update if the new states are different to prevent unnecessary re-renders
      for (let i = 0; i < 625; i++) {
        if (prevStates[i] !== newPixelStates[i]) {
          return newPixelStates;
        }
      }
      return prevStates; // No change needed
    });
  };

  // COMMENTED OUT: Drawing feature removed - Mouse event handlers for drawing
  /**
   * Handle mouse move for drag painting
   */
  // const handleMouseMove = (event: React.MouseEvent<Element>) => {
  //   event.preventDefault();
  //   if (!isMouseDown || !dotMatrixSettings.dragPaintingEnabled || !dotMatrixContainerRef.current)
  //     return;

  //   const container = dotMatrixContainerRef.current;
  //   const rect = container.getBoundingClientRect();
  //   const x = event.clientX - rect.left;
  //   const y = event.clientY - rect.top;

  //   // Calculate which pixel was clicked based on the container size
  //   const containerSize = Math.min(rect.width, rect.height);
  //   const pixelSize = containerSize / 25;

  //   const col = Math.floor(x / pixelSize);
  //   const row = Math.floor(y / pixelSize);

  //   // Ensure we're within bounds
  //   if (col >= 0 && col < 25 && row >= 0 && row < 25) {
  //     const index = getPixelIndex(row, col);

  //     // Only paint if this is a different pixel than the last one
  //     if (index !== lastDrawnPixel && isPixelInCircle(row, col)) {
  //       setLastDrawnPixel(index);

  //       // Use the same modification tracking as handlePixelClick
  //       if (videoResult && currentDisplayFrame < videoResult.frameAnalyses.length) {
  //         const frameAnalysis = getFrameAnalysis(currentDisplayFrame);

  //         if (frameAnalysis) {
  //           const pixelRow = Math.floor(index / 25);
  //           const pixelCol = index % 25;

  //           // Save current state for undo
  //           const currentBrightnessMap = frameAnalysis.brightnessMap.map((row) => [...row]);

  //           // Apply stroke width effect during dragging
  //           const centerRow = pixelRow;
  //           const centerCol = pixelCol;
  //           const strokeRadius = Math.floor(strokeWidth / 2);

  //           // Apply to center pixel and surrounding pixels based on stroke width
  //           for (
  //             let r = Math.max(0, centerRow - strokeRadius);
  //             r <= Math.min(24, centerRow + strokeRadius);
  //             r++
  //           ) {
  //             for (
  //               let c = Math.max(0, centerCol - strokeRadius);
  //               c <= Math.min(24, centerCol + strokeRadius);
  //               c++
  //             ) {
  //               if (isPixelInCircle(r, c)) {
  //                 // Apply drawing tool based on mode
  //                 if (drawingMode === 'draw') {
  //                   // Draw mode - set brightness to current brightness value (0-255)
  //                   frameAnalysis.brightnessMap[r][c] = brightnessValue;
  //                   // Mark as user-drawn
  //                   setUserDrawnPixels((prev) =>
  //                     new Set(prev).add(`${currentFrameAnalysisIndex}-${r}-${c}`)
  //                   );
  //                 } else {
  //                   // Erase mode - set brightness to 0
  //                   frameAnalysis.brightnessMap[r][c] = 0;
  //                   // Mark as user-drawn (erased)
  //                   setUserDrawnPixels((prev) =>
  //                     new Set(prev).add(`${currentFrameAnalysisIndex}-${r}-${c}`)
  //                   );
  //                 }
  //               }
  //             }
  //           }

  //           // Add to undo stack
  //           setUndoStack((prev) => [
  //             ...prev,
  //             {
  //               frameIndex: currentFrameAnalysisIndex,
  //               brightnessMap: currentBrightnessMap,
  //               timestamp: Date.now()
  //             }
  //           ]);

  //           // Clear redo stack when new modification is made
  //           setRedoStack([]);

  //           // Update pixel states immediately to reflect the change
  //           updatePixelStatesFromFrameAnalysis(frameAnalysis);
  //         }
  //       }
  //     }
  //   }
  // };

  /**
   * Handle mouse down to start drag painting
   */
  // const handleMouseDown = (event: React.MouseEvent<Element>) => {
  //   event.preventDefault();
  //   if (!dotMatrixSettings.dragPaintingEnabled) return;

  //   setIsMouseDown(true);
  //   setLastDrawnPixel(null);

  //   // Determine paint mode based on current pixel state
  //   const container = dotMatrixContainerRef.current;
  //   if (container) {
  //     const rect = container.getBoundingClientRect();
  //     const x = event.clientX - rect.left;
  //     const y = event.clientY - rect.top;

  //     const containerSize = Math.min(rect.width, rect.height);
  //     const pixelSize = containerSize / 25;

  //     const col = Math.floor(x / pixelSize);
  //     const row = Math.floor(y / pixelSize);

  //     if (col >= 0 && col < 25 && row >= 0 && row < 25) {
  //       const index = getPixelIndex(row, col);
  //       if (isPixelInCircle(row, col)) {
  //         // Apply the drawing action with stroke width effect
  //         handlePixelClick(index);
  //       }
  //     }
  //   }
  // };

  /**
   * Handle mouse up to stop drag painting
   */
  // const handleMouseUp = (event: React.MouseEvent<Element>) => {
  //   event.preventDefault();
  //   setIsMouseDown(false);
  //   setLastDrawnPixel(null);
  // };

  /**
   * Handle mouse leave to stop drag painting
   */
  // const handleMouseLeave = (event: React.MouseEvent<Element>) => {
  //   event.preventDefault();
  //   setIsMouseDown(false);
  //   setLastDrawnPixel(null);
  // };

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

    // Get the current frame analysis using the reusable function
    const frameAnalysis = getFrameAnalysis(frameIndex);

    if (frameAnalysis) {
      // Draw the brightness map as a visual representation
      const gridSize = 25;
      const cellSize = canvas.width / gridSize;

      for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
          if (
            frameAnalysis.brightnessMap[row] &&
            frameAnalysis.brightnessMap[row][col] !== undefined
          ) {
            // Brightness values are in NP3 range (0-4095), convert to display range (0-255)
            const np3Brightness = frameAnalysis.brightnessMap[row][col];
            const brightness = Math.round((np3Brightness / 4095) * 255);
            const x = col * cellSize;
            const y = row * cellSize;

            // Apply dot matrix settings for preview
            const adjustedBrightness = applyDotMatrixSettingsToBrightness(
              brightness,
              dotMatrixSettings
            );

            // Convert brightness to grayscale (already in 0-255 range)
            const grayValue = Math.round(Math.max(0, Math.min(255, adjustedBrightness)));
            ctx.fillStyle = `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
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
        const newTime = (newFrameIndex * kTimeStepMilis) / 1000; // Convert to seconds

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
      const newProgress = (newFrameIndex / videoResult.totalFrames) * 100;
      setVideoProgress(newProgress);

      // Draw the frame to canvas
      drawCurrentFrameToCanvas(newFrameIndex);

      // Update pixel states from brightness map for the new frame
      const frameAnalysis = getFrameAnalysis(newFrameIndex);

      if (frameAnalysis) {
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
      const newFrameIndex = Math.min(videoResult.totalFrames - 1, prevFrame + 1);

      // Update audio position to match the new frame
      if (audioElement) {
        const newTime = (newFrameIndex * kTimeStepMilis) / 1000; // Convert to seconds

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
      const newProgress = (newFrameIndex / videoResult.totalFrames) * 100;
      setVideoProgress(newProgress);

      // Draw the frame to canvas
      drawCurrentFrameToCanvas(newFrameIndex);

      // Update pixel states from brightness map for the new frame
      const frameAnalysis = getFrameAnalysis(newFrameIndex);

      if (frameAnalysis) {
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

  // Handle video ending
  useEffect(() => {
    if (isVideoPlaying && videoResult && audioElement) {
      const checkVideoEnd = () => {
        const currentTime = audioElement.currentTime * 1000;
        const frameIndex = Math.floor(currentTime / kTimeStepMilis);

        if (frameIndex >= videoResult.totalFrames) {
          // Video ended
          setIsVideoPlaying(false);
          setCurrentDisplayFrame(0);
          setVideoProgress(0);
          setLastProcessedFrame(-1);
        }
      };

      const endCheckInterval = setInterval(checkVideoEnd, 100);
      return () => clearInterval(endCheckInterval);
    }
  }, [isVideoPlaying, videoResult, audioElement]);

  // COMMENTED OUT: Replaced with GlyphPreview component (DRY principle)
  // Update mouse event handlers for canvas
  // const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
  //   handleMouseDown(event as unknown as React.MouseEvent<Element>);
  // };
  // const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
  //   handleMouseUp(event as unknown as React.MouseEvent<Element>);
  // };
  // const handleCanvasMouseLeave = (event: React.MouseEvent<HTMLCanvasElement>) => {
  //   handleMouseLeave(event as unknown as React.MouseEvent<Element>);
  // };
  // const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
  //   handleMouseMove(event as unknown as React.MouseEvent<Element>);
  // };

  /**
   * Validate export pipeline health before saving
   */
  const validateExportPipeline = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check video result
    if (!videoResult) {
      errors.push('No video result available');
      return { isValid: false, errors };
    }

    // Check audio file
    if (!videoResult.audioFile) {
      errors.push('No audio file available');
    } else if (videoResult.audioFile.size === 0) {
      errors.push('Audio file is empty');
    }

    // Check frame analyses
    if (!videoResult.frameAnalyses || videoResult.frameAnalyses.length === 0) {
      errors.push('No frame analyses available');
    } else {
      // Validate frame analyses structure
      for (let i = 0; i < Math.min(5, videoResult.frameAnalyses.length); i++) {
        const analysis = videoResult.frameAnalyses[i];
        if (!analysis.brightnessMap) {
          errors.push(`Frame analysis ${i} missing brightness map`);
        } else if (!Array.isArray(analysis.brightnessMap) || analysis.brightnessMap.length !== 25) {
          errors.push(`Frame analysis ${i} has invalid brightness map structure`);
        } else {
          // Check a few sample pixels
          for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
              if (
                !Array.isArray(analysis.brightnessMap[row]) ||
                analysis.brightnessMap[row].length !== 25 ||
                typeof analysis.brightnessMap[row][col] !== 'number' ||
                isNaN(analysis.brightnessMap[row][col])
              ) {
                errors.push(`Frame analysis ${i} has invalid brightness values`);
                break;
              }
            }
          }
        }
      }
    }

    // Check display frames
    if (!videoResult.displayFrames || videoResult.displayFrames.length === 0) {
      errors.push('No display frames available');
    }

    // Check frame count consistency
    if (videoResult.frameAnalyses && videoResult.displayFrames) {
      if (videoResult.frameAnalyses.length !== videoResult.displayFrames.length) {
        errors.push(
          `Frame count mismatch: ${videoResult.frameAnalyses.length} analyses vs ${videoResult.displayFrames.length} display frames`
        );
      }
    }

    // Check duration
    if (videoResult.duration <= 0) {
      errors.push('Invalid video duration');
    }

    // Check total frames
    if (videoResult.totalFrames <= 0) {
      errors.push('Invalid total frame count');
    }

    return { isValid: errors.length === 0, errors };
  };

  // Debug effect to track when audio presets should be shown
  useEffect(() => {
    if (videoResult) {
      if (videoResult.originalFileType === 'audio') {
        console.log('NP3Page: Should show audio presets - originalFileType is audio');
        console.log('NP3Page: Audio presets available:', audioPresets.length);
      } else {
        console.log(
          'NP3Page: Should show video preview - originalFileType is:',
          videoResult.originalFileType
        );
      }
    }
  }, [videoResult, audioPresets]);

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
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 font-[ndot] tracking-wider uppercase bg-gradient-to-r from-white via-gray-200 to-white bg-clip-text text-transparent">
              Video/Audio to Glyph Matrix
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-white/20 to-white/40 mx-auto rounded-full mb-4"></div>

            {/* Output Filename Input - Only show after file is processed */}
            {videoResult && (
              <div className="max-w-md mx-auto">
                <label
                  htmlFor="output-filename"
                  className="block text-sm font-medium text-white/70 mb-2"
                >
                  Output Filename
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="output-filename"
                    type="text"
                    value={outputFilename}
                    onChange={(e) => {
                      // Remove .ogg extension if user adds it, we'll add it automatically
                      let value = e.target.value.replace(/\.ogg$/i, '');
                      // Sanitize filename - remove invalid characters
                      value = value.replace(/[^a-zA-Z0-9_-]/g, '_');
                      setOutputFilename(value);
                    }}
                    placeholder="glyph_tone"
                    className="bg-black/40 border-white/20 text-white placeholder:text-white/40 focus:border-white/60"
                    disabled={isProcessing}
                  />
                  <span className="text-white/70 text-sm whitespace-nowrap">.ogg</span>
                </div>
                <p className="text-xs text-white/50 mt-1">
                  Enter a custom filename for your export
                </p>
              </div>
            )}
          </div>

          {/* Video and Dot Matrix Display */}
          {videoResult && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-8">
              <div className="space-y-4">
                {/* Audio Preset Panel - Show below preview for audio files */}
                {videoResult.originalFileType === 'audio' && (
                  <div className="mt-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-center font-[ndot] tracking-wider uppercase mb-4">
                      Audio Presets
                    </h3>
                    <p className="text-xs sm:text-sm text-white/50 text-center mb-6">
                      Select a preset to generate visual patterns from your audio
                    </p>

                    {/* Preset Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {audioPresets.map((preset) => (
                        <Button
                          key={preset.id}
                          variant={selectedPreset === preset.id ? 'default' : 'outline'}
                          onClick={() => handlePresetSelect(preset.id)}
                          disabled={isProcessing}
                          className={`h-24 p-4 flex flex-col items-center justify-center space-y-3 transition-all duration-300 ${
                            selectedPreset === preset.id
                              ? 'bg-white text-black hover:bg-white/90 shadow-lg'
                              : 'border-white/20 text-white hover:bg-white/10 hover:border-white/40'
                          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'button-hover'}`}
                        >
                          <div className="text-lg font-semibold font-[ndot] tracking-wide">
                            {preset.name}
                          </div>
                          <div className="text-xs opacity-70 text-center">{preset.description}</div>
                          {selectedPreset === preset.id && (
                            <div className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                              Active
                            </div>
                          )}
                        </Button>
                      ))}
                    </div>

                    {/* Processing indicator */}
                    {isProcessing && (
                      <div className="mt-6">
                        <div className="w-full bg-white/10 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-white to-gray-300 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${processingProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-white/70 mt-3 font-mono text-center">
                          Processing: {processingProgress.toFixed(2)}%
                          {processingProgress >= 5 &&
                            processingProgress < 15 &&
                            ' - Loading services...'}
                          {processingProgress >= 15 &&
                            processingProgress < 35 &&
                            ' - Generating data...'}
                          {processingProgress >= 35 && processingProgress < 60 && ' - Encoding...'}
                          {processingProgress >= 60 &&
                            processingProgress < 100 &&
                            ' - Saving file...'}
                          {processingProgress >= 100 && ' - Complete!'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
                      const frameAnalysis = getFrameAnalysis(currentDisplayFrame);

                      if (frameAnalysis) {
                        updatePixelStatesFromFrameAnalysis(frameAnalysis);
                      }
                    }
                  }}
                />

                {/* COMMENTED OUT: Drawing Toolbar - Drawing feature removed */}
                {/* <div className="flex justify-center">
                  <div className="glass-effect rounded-2xl p-4 flex flex-wrap items-center justify-center gap-4 shadow-2xl">
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

                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-white/50">Mode:</span>
                      <span className="text-xs text-white font-medium">
                        {drawingMode === 'draw' ? 'Draw' : 'Erase'}
                      </span>
                    </div>
                  </div>
                </div> */}

                {/* COMMENTED OUT: Brightness Slider Popup - Drawing feature removed */}
                {/* {showBrightnessSlider && (
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

                              if (
                                videoResult &&
                                currentDisplayFrame < videoResult.frameAnalyses.length
                              ) {
                                const frameTime = currentDisplayFrame * 16.666;
                                const analysisIndex = Math.floor(
                                  frameTime / (1000 / videoResult.fps)
                                );

                                if (analysisIndex < videoResult.frameAnalyses.length) {
                                  const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
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
                )} */}
                <p className="text-xs sm:text-sm text-white/50 text-center">
                  Glyph Matrix Display Preview
                </p>
                <div className="flex justify-center">
                  <div className="relative">
                    {/* Responsive sizing for dot matrix */}
                    <div
                      ref={dotMatrixContainerRef}
                      className="mt-6 relative transition-all duration-300 rounded-2xl overflow-visible shadow-2xl flex justify-center items-center"
                      style={{
                        width: `min(${SQUARE_SIZE * dotMatrixZoom}px, 90vw)`,
                        height: `min(${SQUARE_SIZE * dotMatrixZoom}px, 90vw)`,
                        maxWidth: `${SQUARE_SIZE * dotMatrixZoom}px`,
                        maxHeight: `${SQUARE_SIZE * dotMatrixZoom}px`
                      }}
                    >
                      {/* Glyph Preview Component - Single source of truth for glyph matrix rendering */}
                      {/* Use scaled unitSize directly instead of CSS transform to avoid clipping */}
                      {currentFrameBrightnessMap ? (
                        <GlyphPreview
                          brightnessMap={currentFrameBrightnessMap}
                          settings={{
                            brightness: dotMatrixSettings.brightness,
                            contrast: dotMatrixSettings.contrast,
                            gamma: dotMatrixSettings.gamma,
                            threshold: dotMatrixSettings.threshold,
                            inversion: dotMatrixSettings.inversion
                          }}
                          unitSize={UNIT_SIZE * dotMatrixZoom}
                          showLabels={false}
                          className="w-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center text-white/50 h-full">
                          <p className="text-sm">No frame data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Debug info for dot matrix */}
                <div className="text-center text-xs text-white/50">
                  <p className="text-base font-mono font-medium">
                    Current frame: {currentDisplayFrame}
                  </p>
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

                {/* Effect Parameters Popover - Only show for audio files */}
                {videoResult && videoResult.originalFileType === 'audio' && (
                  <div className="mt-6 flex justify-center">
                    <Popover open={effectSettingsOpen} onOpenChange={setEffectSettingsOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isProcessing || !selectedPreset}
                          className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 button-hover rounded-xl"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Effect Settings
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 max-h-[80vh] overflow-y-auto bg-black/95 border-white/20 text-white">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2">
                              {selectedPreset
                                ? audioPresets.find((p) => p.id === selectedPreset)?.name
                                : 'Effect'}{' '}
                              Parameters
                            </h4>

                            {/* Common Parameters: Sensitivity and Intensity */}
                            <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
                              {/* Sensitivity */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="sensitivity" className="text-xs text-white/90">
                                    Sensitivity
                                  </Label>
                                  <span className="text-xs text-white/70 font-mono">
                                    {Math.round(effectParams.sensitivity * 100)}%
                                  </span>
                                </div>
                                <Slider
                                  id="sensitivity"
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={[effectParams.sensitivity]}
                                  onValueChange={(value) => {
                                    const newParams = {
                                      ...effectParams,
                                      sensitivity: value[0]
                                    } as EffectParameters;
                                    if (sensitivityTimeoutRef.current) {
                                      clearTimeout(sensitivityTimeoutRef.current);
                                    }
                                    sensitivityTimeoutRef.current = setTimeout(() => {
                                      handleEffectParamsChange(newParams);
                                    }, 300);
                                  }}
                                  disabled={isProcessing || !selectedPreset}
                                  className="w-full"
                                />
                                <div className="flex justify-between">
                                  <span className="text-xs text-white/50">
                                    Low (High Threshold)
                                  </span>
                                  <span className="text-xs text-white/50">
                                    High (Low Threshold)
                                  </span>
                                </div>
                              </div>

                              {/* Intensity */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="intensity" className="text-xs text-white/90">
                                    Intensity
                                  </Label>
                                  <span className="text-xs text-white/70 font-mono">
                                    {Math.round(effectParams.intensity * 100)}%
                                  </span>
                                </div>
                                <Slider
                                  id="intensity"
                                  min={0}
                                  max={1}
                                  step={0.01}
                                  value={[effectParams.intensity]}
                                  onValueChange={(value) => {
                                    const newParams = {
                                      ...effectParams,
                                      intensity: value[0]
                                    } as EffectParameters;
                                    if (sensitivityTimeoutRef.current) {
                                      clearTimeout(sensitivityTimeoutRef.current);
                                    }
                                    sensitivityTimeoutRef.current = setTimeout(() => {
                                      handleEffectParamsChange(newParams);
                                    }, 300);
                                  }}
                                  disabled={isProcessing || !selectedPreset}
                                  className="w-full"
                                />
                                <div className="flex justify-between">
                                  <span className="text-xs text-white/50">Dim</span>
                                  <span className="text-xs text-white/50">Bright</span>
                                </div>
                              </div>
                            </div>

                            {/* Effect-Specific Parameters */}
                            {selectedPreset === 'beatmonitor' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Wave Height</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as BeatMonitorParams).waveHeight * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as BeatMonitorParams).waveHeight]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        waveHeight: value[0]
                                      } as BeatMonitorParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Wave Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as BeatMonitorParams).waveSpeed * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as BeatMonitorParams).waveSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        waveSpeed: value[0]
                                      } as BeatMonitorParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Line Thickness</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as BeatMonitorParams).lineThickness * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as BeatMonitorParams).lineThickness]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        lineThickness: value[0]
                                      } as BeatMonitorParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">
                                      Baseline Brightness
                                    </Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as BeatMonitorParams).baselineBrightness * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as BeatMonitorParams).baselineBrightness]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        baselineBrightness: value[0]
                                      } as BeatMonitorParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'pulse' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Pulse Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as PulseParams).pulseSpeed * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as PulseParams).pulseSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        pulseSpeed: value[0]
                                      } as PulseParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Ring Count</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {Math.floor(1 + (effectParams as PulseParams).ringCount * 4)}
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as PulseParams).ringCount]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        ringCount: value[0]
                                      } as PulseParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Ring Thickness</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as PulseParams).ringThickness * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as PulseParams).ringThickness]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        ringThickness: value[0]
                                      } as PulseParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Fade Intensity</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as PulseParams).fadeIntensity * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as PulseParams).fadeIntensity]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        fadeIntensity: value[0]
                                      } as PulseParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'alivething' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Wave Complexity</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as AliveThingParams).waveComplexity * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as AliveThingParams).waveComplexity]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        waveComplexity: value[0]
                                      } as AliveThingParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Movement Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as AliveThingParams).movementSpeed * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as AliveThingParams).movementSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        movementSpeed: value[0]
                                      } as AliveThingParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Pattern Density</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as AliveThingParams).patternDensity * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as AliveThingParams).patternDensity]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        patternDensity: value[0]
                                      } as AliveThingParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Variation</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as AliveThingParams).variation * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as AliveThingParams).variation]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        variation: value[0]
                                      } as AliveThingParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'spinny' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Rotation Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as SpinnyParams).rotationSpeed * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as SpinnyParams).rotationSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        rotationSpeed: value[0]
                                      } as SpinnyParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Blade Count</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {Math.floor(
                                        3 + (effectParams as SpinnyParams).bladeCount * 5
                                      )}
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as SpinnyParams).bladeCount]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        bladeCount: value[0]
                                      } as SpinnyParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Blade Length</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as SpinnyParams).bladeLength * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as SpinnyParams).bladeLength]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        bladeLength: value[0]
                                      } as SpinnyParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">
                                      Center Brightness
                                    </Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as SpinnyParams).centerBrightness * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as SpinnyParams).centerBrightness]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        centerBrightness: value[0]
                                      } as SpinnyParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'spectrum' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Bar Sensitivity</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as SpectrumParams).barSensitivity * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as SpectrumParams).barSensitivity]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        barSensitivity: value[0]
                                      } as SpectrumParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Decay Rate</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as SpectrumParams).decayRate * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as SpectrumParams).decayRate]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        decayRate: value[0]
                                      } as SpectrumParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Peak Hold</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as SpectrumParams).peakHold * 100).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as SpectrumParams).peakHold]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        peakHold: value[0]
                                      } as SpectrumParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Frequency Range</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as SpectrumParams).frequencyRange * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as SpectrumParams).frequencyRange]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        frequencyRange: value[0]
                                      } as SpectrumParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {/* New Effects */}
                            {selectedPreset === 'radialspokes' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Spoke Count</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {Math.floor(
                                        8 + (effectParams as RadialSpokesParams).spokeCount * 24
                                      )}
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as RadialSpokesParams).spokeCount]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        spokeCount: value[0]
                                      } as RadialSpokesParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Spoke Length</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as RadialSpokesParams).spokeLength * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as RadialSpokesParams).spokeLength]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        spokeLength: value[0]
                                      } as RadialSpokesParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Rotation Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as RadialSpokesParams).rotationSpeed * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as RadialSpokesParams).rotationSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        rotationSpeed: value[0]
                                      } as RadialSpokesParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'bassblobs' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Blob Size</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as BassBlobsParams).blobSize * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as BassBlobsParams).blobSize]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        blobSize: value[0]
                                      } as BassBlobsParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Blob Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as BassBlobsParams).blobSpeed * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as BassBlobsParams).blobSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        blobSpeed: value[0]
                                      } as BassBlobsParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Merge Intensity</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as BassBlobsParams).mergeIntensity * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as BassBlobsParams).mergeIntensity]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        mergeIntensity: value[0]
                                      } as BassBlobsParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Decay Rate</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as BassBlobsParams).decayRate * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as BassBlobsParams).decayRate]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        decayRate: value[0]
                                      } as BassBlobsParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'treblesparkles' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Sparkle Count</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as TrebleSparklesParams).sparkleCount * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as TrebleSparklesParams).sparkleCount]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        sparkleCount: value[0]
                                      } as TrebleSparklesParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">
                                      Sparkle Duration
                                    </Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as TrebleSparklesParams).sparkleDuration * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as TrebleSparklesParams).sparkleDuration]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        sparkleDuration: value[0]
                                      } as TrebleSparklesParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Sparkle Size</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as TrebleSparklesParams).sparkleSize * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as TrebleSparklesParams).sparkleSize]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        sparkleSize: value[0]
                                      } as TrebleSparklesParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Jitter Amount</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as TrebleSparklesParams).jitterAmount * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as TrebleSparklesParams).jitterAmount]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        jitterAmount: value[0]
                                      } as TrebleSparklesParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'peakdetectors' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Peak Hold</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as PeakDetectorsParams).peakHold * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as PeakDetectorsParams).peakHold]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        peakHold: value[0]
                                      } as PeakDetectorsParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Bloom Size</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as PeakDetectorsParams).bloomSize * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as PeakDetectorsParams).bloomSize]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        bloomSize: value[0]
                                      } as PeakDetectorsParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Decay Rate</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as PeakDetectorsParams).decayRate * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as PeakDetectorsParams).decayRate]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        decayRate: value[0]
                                      } as PeakDetectorsParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Threshold</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as PeakDetectorsParams).threshold * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as PeakDetectorsParams).threshold]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        threshold: value[0]
                                      } as PeakDetectorsParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'stereopingpong' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Dot Size</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as StereoPingpongParams).dotSize * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as StereoPingpongParams).dotSize]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        dotSize: value[0]
                                      } as StereoPingpongParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Movement Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as StereoPingpongParams).movementSpeed * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as StereoPingpongParams).movementSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        movementSpeed: value[0]
                                      } as StereoPingpongParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Smoothing</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as StereoPingpongParams).smoothing * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as StereoPingpongParams).smoothing]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        smoothing: value[0]
                                      } as StereoPingpongParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'checkerboard' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Square Size</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as CheckerboardParams).squareSize * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as CheckerboardParams).squareSize]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        squareSize: value[0]
                                      } as CheckerboardParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Rotation Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as CheckerboardParams).rotationSpeed * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as CheckerboardParams).rotationSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        rotationSpeed: value[0]
                                      } as CheckerboardParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Color Shift</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as CheckerboardParams).colorShift * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as CheckerboardParams).colorShift]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        colorShift: value[0]
                                      } as CheckerboardParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'huecycle' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Cycle Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as HueCycleParams).cycleSpeed * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as HueCycleParams).cycleSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        cycleSpeed: value[0]
                                      } as HueCycleParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Saturation</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as HueCycleParams).saturation * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as HueCycleParams).saturation]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        saturation: value[0]
                                      } as HueCycleParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Brightness</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as HueCycleParams).brightness * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as HueCycleParams).brightness]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        brightness: value[0]
                                      } as HueCycleParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'ambisonicradial' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Octant Count</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {Math.floor(
                                        4 + (effectParams as AmbisonicRadialParams).octantCount * 12
                                      )}
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as AmbisonicRadialParams).octantCount]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        octantCount: value[0]
                                      } as AmbisonicRadialParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">
                                      Radius Multiplier
                                    </Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as AmbisonicRadialParams).radiusMultiplier *
                                        100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[
                                      (effectParams as AmbisonicRadialParams).radiusMultiplier
                                    ]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        radiusMultiplier: value[0]
                                      } as AmbisonicRadialParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Smoothing</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as AmbisonicRadialParams).smoothing * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as AmbisonicRadialParams).smoothing]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        smoothing: value[0]
                                      } as AmbisonicRadialParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'strobe' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Flash Intensity</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as StrobeParams).flashIntensity * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as StrobeParams).flashIntensity]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        flashIntensity: value[0]
                                      } as StrobeParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Flash Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as StrobeParams).flashSpeed * 100).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as StrobeParams).flashSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        flashSpeed: value[0]
                                      } as StrobeParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Duty Cycle</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as StrobeParams).dutyCycle * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as StrobeParams).dutyCycle]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        dutyCycle: value[0]
                                      } as StrobeParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'noisefield' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Noise Scale</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {(
                                        (effectParams as NoiseFieldParams).noiseScale * 100
                                      ).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as NoiseFieldParams).noiseScale]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        noiseScale: value[0]
                                      } as NoiseFieldParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Flow Speed</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NoiseFieldParams).flowSpeed * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as NoiseFieldParams).flowSpeed]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        flowSpeed: value[0]
                                      } as NoiseFieldParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Contrast</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NoiseFieldParams).contrast * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as NoiseFieldParams).contrast]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        contrast: value[0]
                                      } as NoiseFieldParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'notemap' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Note Range</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NoteMapParams).noteRange * 100).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as NoteMapParams).noteRange]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        noteRange: value[0]
                                      } as NoteMapParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Note Hold</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NoteMapParams).noteHold * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as NoteMapParams).noteHold]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        noteHold: value[0]
                                      } as NoteMapParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Brightness</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NoteMapParams).brightness * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as NoteMapParams).brightness]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        brightness: value[0]
                                      } as NoteMapParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {selectedPreset === 'nebula' && (
                              <div className="space-y-3">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Blob Count</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NebulaParams).blobCount * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as NebulaParams).blobCount]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        blobCount: value[0]
                                      } as NebulaParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Flow Intensity</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NebulaParams).flowIntensity * 100).toFixed(
                                        0
                                      )}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={2}
                                    step={0.01}
                                    value={[(effectParams as NebulaParams).flowIntensity]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        flowIntensity: value[0]
                                      } as NebulaParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Softness</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NebulaParams).softness * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as NebulaParams).softness]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        softness: value[0]
                                      } as NebulaParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs text-white/90">Color Shift</Label>
                                    <span className="text-xs text-white/70 font-mono">
                                      {((effectParams as NebulaParams).colorShift * 100).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                  <Slider
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={[(effectParams as NebulaParams).colorShift]}
                                    onValueChange={(value) => {
                                      const newParams = {
                                        ...effectParams,
                                        colorShift: value[0]
                                      } as NebulaParams;
                                      if (sensitivityTimeoutRef.current)
                                        clearTimeout(sensitivityTimeoutRef.current);
                                      sensitivityTimeoutRef.current = setTimeout(
                                        () => handleEffectParamsChange(newParams),
                                        300
                                      );
                                    }}
                                    disabled={isProcessing}
                                    className="w-full"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Reset to Default Button */}
                            <div className="mt-6 pt-4 border-t border-white/10">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleResetEffectParams}
                                disabled={isProcessing || !selectedPreset}
                                className="w-full border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed button-hover rounded-xl"
                                title="Reset all parameters to default values"
                                aria-label="Reset to defaults"
                              >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Reset to Defaults
                              </Button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video Controls - Floating at bottom */}
          {videoResult && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 floating-controls rounded-2xl p-4 shadow-2xl space-y-3 min-w-[90vw] max-w-4xl">
              {/* Loading Indicator - Only show when processing */}
              {isProcessing && (
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xs text-white/70 font-mono">
                    Processing: {processingProgress.toFixed(0)}%
                  </span>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-pulse"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              )}

              {/* Progress Bar */}
              <div className="flex items-center space-x-3">
                {/* Previous Frame Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousFrame}
                  disabled={!videoResult || currentDisplayFrame <= 0 || isProcessing}
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
                    onChange={handlePendingProgressChange}
                    disabled={isProcessing}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: `linear-gradient(to right, white 0%, white ${videoProgress}%, rgba(255,255,255,0.1) ${videoProgress}%, rgba(255,255,255,0.1) 100%)`
                    }}
                  />
                  <span className="text-xs text-white/70 min-w-[3rem] flex-shrink-0 font-mono">
                    {Math.floor((videoProgress / 100) * ((videoResult?.duration || 0) / 1000))}s
                  </span>
                </div>

                {/* Next Frame Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextFrame}
                  disabled={
                    !videoResult ||
                    currentDisplayFrame >= (videoResult?.totalFrames || 0) - 1 ||
                    isProcessing
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
                  disabled={isProcessing}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                  disabled={isProcessing}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Multi-Effect Preview Button - Only show for audio files */}
                {videoResult && videoResult.originalFileType === 'audio' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (videoResult && audioData) {
                        setShowMultiEffectPreview(true);
                      } else {
                        toast.info('Please wait for audio processing to complete');
                      }
                    }}
                    disabled={isProcessing || !audioData}
                    className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed button-hover rounded-xl px-4 py-2"
                    title="Preview all effects simultaneously"
                    aria-label="All Effects Preview"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    All Effects Preview
                  </Button>
                )}

                {/* Advanced Editor Button */}
                {videoResult && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (videoResult) {
                        setShowAdvancedEditor(true);
                      } else {
                        toast.info('Upload a video first to open advanced editor');
                      }
                    }}
                    disabled={isProcessing}
                    className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed button-hover rounded-xl px-4 py-2"
                    title="Open Advanced Editor (Ctrl/Cmd + E) - Adjust gamma, brightness, contrast, and saturation"
                    aria-label="Open Advanced Editor"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Advanced Editor
                  </Button>
                )}

                {/* Save Button */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveVideo}
                  disabled={isProcessing}
                  className={`bg-white text-black hover:bg-gray-200 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black focus:outline-none active:scale-95 transition-all duration-200 button-hover rounded-xl px-4 py-2 shadow-lg border-2 border-white font-mono ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Save as .ogg with pixel data"
                  aria-label="Save video"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Saving...' : 'Save'}
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
              Select Video/Audio
            </h3>

            {!videoResult ? (
              <div className="text-center">
                <input
                  type="file"
                  accept="video/*,audio/*"
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
                  {isProcessing ? 'Processing...' : 'Upload Video/Audio'}
                </label>

                {isProcessing && (
                  <div className="mt-6 space-y-3">
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-white to-gray-300 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <p className="text-sm text-white/70 font-mono">
                        Processing: {processingProgress.toFixed(2)}%
                      </p>
                      <p className="text-xs text-white/50">
                        {processingProgress < 10 && 'Preparing...'}
                        {processingProgress >= 10 &&
                          processingProgress < 50 &&
                          'Extracting frames...'}
                        {processingProgress >= 50 &&
                          processingProgress < 70 &&
                          'Processing audio...'}
                        {processingProgress >= 70 &&
                          processingProgress < 90 &&
                          'Analyzing frames...'}
                        {processingProgress >= 90 && 'Finalizing...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm sm:text-base text-white/70 font-mono">
                    {videoResult.originalFileType === 'audio' ? 'Audio' : 'Video'}:{' '}
                    {videoResult.totalFrames} frames, {(videoResult.duration / 1000).toFixed(1)}s
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

                {/* Global Save Progress Indicator */}
                {isProcessing && (
                  <div className="mt-6 space-y-3">
                    <div className="w-full bg-white/10 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-white to-gray-300 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                    <div className="flex flex-col items-center space-y-1">
                      <p className="text-sm text-white/70 font-mono">
                        {processingProgress >= 5 &&
                          processingProgress < 15 &&
                          'Loading services...'}
                        {processingProgress >= 15 &&
                          processingProgress < 35 &&
                          'Generating pixel data...'}
                        {processingProgress >= 35 && processingProgress < 60 && 'Encoding data...'}
                        {processingProgress >= 60 && processingProgress < 100 && 'Saving file...'}
                        {processingProgress >= 100 && 'Export complete!'}
                        {processingProgress < 5 && 'Processing...'}
                      </p>
                      <p className="text-xs text-white/50">
                        {processingProgress.toFixed(2)}% complete
                      </p>
                    </div>
                  </div>
                )}
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
                    <p>Upload a video or audio file using the "Upload Video/Audio" button</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      2
                    </span>
                    <p>For video files: Crop your video to a circle using the crop dialog</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      3
                    </span>
                    <p>
                      For audio files: Select from BeatMonitor, Pulse, AliveThing, or Spinny presets
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      4
                    </span>
                    <p>
                      Wait for processing to complete - your video/audio will be converted to 60Hz
                      frames
                    </p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      5
                    </span>
                    <p>Use the playback controls to navigate through your video/audio</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full font-mono">
                      6
                    </span>
                    <p>For audio: Switch presets anytime to see different visualizations</p>
                  </div>
                </div>
              </div>

              {/* COMMENTED OUT: Frame-by-Frame Drawing section - Drawing feature removed */}
              {/* <div className="space-y-4">
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
              </div> */}
            </div>

            {/* Keyboard Shortcuts */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white font-[ndot] tracking-wide">
                Keyboard Shortcuts
              </h4>
              <p className="text-xs text-white/60 mb-4">
                Note: All shortcuts are designed to avoid conflicts with system and browser
                shortcuts. Drawing-related shortcuts have been removed.
              </p>
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
                    Ctrl/Cmd + Shift + S
                  </div>
                  <p className="text-xs">Reset to Beginning</p>
                  <p className="text-xs text-white/50 mt-1">
                    (Changed from Shift+R to avoid browser conflict)
                  </p>
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
                    Ctrl/Cmd + E
                  </div>
                  <p className="text-xs">Open Advanced Editor</p>
                </div>
                {/* COMMENTED OUT: Drawing-related keyboard shortcuts - Drawing feature removed */}
                {/* <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + M
                  </div>
                  <p className="text-xs">Switch Drawing Mode</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="font-mono text-xs bg-white/20 text-white px-2 py-1 rounded mb-2">
                    Ctrl/Cmd + I
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
                </div> */}
              </div>
            </div>

            {/* Tips and Tricks */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white font-[ndot] tracking-wide">
                Tips & Tricks
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-white/80">
                <div className="space-y-3">
                  {/* COMMENTED OUT: Drawing Tips section - Drawing feature removed */}
                  {/* <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-2">Drawing Tips</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• Use zoom controls for precise pixel editing</li>
                      <li>• Switch between Draw and Erase modes as needed</li>
                      <li>• Adjust stroke width for different line thicknesses</li>
                      <li>• Use brightness control for varying pixel intensities</li>
                      <li>• Only visible pixels (within circle) can be modified</li>
                      <li>• Changes are saved per frame automatically</li>
                    </ul>
                  </div> */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-2">Performance Tips</h5>
                    <ul className="space-y-1 text-xs">
                      <li>• Use shorter videos/audio for faster processing</li>
                      <li>• Lower resolution videos process faster</li>
                      <li>• Audio files process quickly (no video data)</li>
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
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-2">Audio Presets</h5>
                    <ul className="space-y-1 text-xs">
                      <li>
                        • <strong>BeatMonitor:</strong> A Beat Monitor - Waveform visualization
                      </li>
                      <li>
                        • <strong>Pulse:</strong> Expanding circles with audio pulse effects
                      </li>
                      <li>
                        • <strong>AliveThing:</strong> It's Alive! An alive thing in a petri dish
                        that vibin'
                      </li>
                      <li>
                        • <strong>Spinny:</strong> Rotating fan synced to audio
                      </li>
                      <li>
                        • <strong>Spectrum:</strong> Frequency spectrum analyzer with vertical bars
                      </li>
                      <li>
                        • Switch presets anytime during playback to see different visualizations
                      </li>
                      <li>
                        • All presets analyze audio features in real-time and respond to amplitude
                      </li>
                      <li>• Presets are synchronized with audio playback at 60Hz</li>
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
                    <li>
                      • <strong>Audio preset not working:</strong> Ensure audio file is properly
                      loaded and try switching presets
                    </li>
                    <li>
                      • <strong>Old audio still playing:</strong> Use the Close button to properly
                      clean up before uploading new audio
                    </li>
                  </ul>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <h5 className="font-medium text-white mb-2">Performance</h5>
                  <ul className="space-y-1 text-xs">
                    <li>
                      • <strong>Slow processing:</strong> Use shorter videos/audio files
                    </li>
                    <li>
                      • <strong>Audio preset lag:</strong> Try shorter audio files for faster
                      analysis
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
          onApplySettings={handleApplyDotMatrixSettings}
          onCancel={() => setShowAdvancedEditor(false)}
          isOpen={showAdvancedEditor}
          currentFrameAnalysis={getCurrentFrameAnalysis()}
          currentFrameIndex={currentDisplayFrame}
          totalFrames={videoResult.displayFrames.length}
          currentDotMatrixSettings={dotMatrixSettings}
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
            const frameIndex = Math.floor((newTime * 1000) / kTimeStepMilis);
            if (frameIndex < videoResult.displayFrames.length) {
              setCurrentDisplayFrame(frameIndex);

              // Draw the current frame to the canvas
              drawCurrentFrameToCanvas(frameIndex);

              // Get the current frame analysis and update pixel states from brightness map
              const frameAnalysis = getFrameAnalysis(frameIndex);

              if (frameAnalysis) {
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

      {/* All Effect Preview Dialog */}
      {videoResult && videoResult.originalFileType === 'audio' && (
        <AllEffectPreviewDialog
          isOpen={showMultiEffectPreview}
          onClose={() => setShowMultiEffectPreview(false)}
          audioData={audioData}
          audioPresets={audioPresets}
          effectParamsMap={effectParamsMap}
          dotMatrixSettings={dotMatrixSettings}
          isVideoPlaying={isVideoPlaying}
          videoProgress={videoProgress}
          currentFrameIndex={currentDisplayFrame}
          totalFrames={videoResult.displayFrames.length}
          onPlayPause={() => {
            if (isVideoPlaying) {
              pauseVideo();
            } else {
              playVideo();
            }
          }}
          onStop={stopVideo}
          onEffectSelect={async (presetId: string) => {
            await handlePresetSelect(presetId);
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

            // Update display frame immediately
            const frameIndex = Math.floor((newTime * 1000) / kTimeStepMilis);
            if (frameIndex < videoResult.displayFrames.length) {
              setCurrentDisplayFrame(frameIndex);

              // Draw the current frame to the canvas
              drawCurrentFrameToCanvas(frameIndex);

              // Get the current frame analysis and update pixel states
              const frameAnalysis = getFrameAnalysis(frameIndex);

              if (frameAnalysis) {
                updatePixelStatesFromFrameAnalysis(frameAnalysis);
              } else {
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
              }, 50);
            }
          }}
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
