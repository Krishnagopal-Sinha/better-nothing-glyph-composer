import { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Smartphone,
  Upload,
  Play,
  Pause,
  Square,
  Eye,
  Crop,
  Settings,
  X,
  Download
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
  const [playbackSpeed, setPlaybackSpeed] = useState(0.75); // Default to 1x speed
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Circle crop dialog states
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [cropSettings, setCropSettings] = useState<CropSettings | null>(null);
  const [originalVideoFile, setOriginalVideoFile] = useState<File | null>(null);

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

  // Debug info visibility state
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Pre-processed frame data for efficient playback
  const [preProcessedFrames, setPreProcessedFrames] = useState<boolean[][]>([]);
  const [isPreProcessing, setIsPreProcessing] = useState(false);
  const [preProcessingProgress, setPreProcessingProgress] = useState(0);

  // Helper functions - moved before useMemo to avoid initialization error
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

  // Memoized calculations for performance
  const litPixelCount = useMemo(() => {
    return pixelStates.filter((state) => state).length;
  }, [pixelStates]);

  const visiblePixelCount = useMemo(() => {
    return Array.from({ length: 625 }, (_, i) => {
      const row = Math.floor(i / 25);
      const col = i % 25;
      return isPixelInCircle(row, col);
    }).filter(Boolean).length;
  }, []);

  // Ref for the canvas to draw the processed video
  const processedVideoCanvasRef = useRef<HTMLCanvasElement>(null);

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
      let animationFrameId: number;

      const updateFrame = () => {
        try {
          // Check if audio element is still valid
          if (!audioElement || audioElement.readyState === 0) {
            console.log('Audio element not ready, skipping frame update');
            return;
          }

          const currentTime = audioElement.currentTime;
          const frameIndex = calculateFrameIndex(currentTime);

          // Check if we've reached the end of the video
          const isAtEnd = frameIndex >= videoResult.displayFrames.length - 1;
          const isPastEnd = frameIndex >= videoResult.displayFrames.length;

          if (!isPastEnd) {
            updateFrameDisplay(frameIndex);

            // Update progress based on frame index, not audio time
            const progress = (frameIndex / (videoResult.displayFrames.length - 1)) * 100;
            setVideoProgress(Math.min(progress, 100));

            // If we're at the last frame, prepare to end
            if (isAtEnd) {
              console.log('Reached last frame, preparing to end video');
            }
          } else {
            // Video ended - stop audio and reset
            console.log('Video ended - stopping audio and resetting');
            stopVideoPlayback();
            toast.info('Video playback completed');
            return; // Stop the animation loop
          }

          // Continue the animation loop if still playing
          if (isVideoPlaying) {
            animationFrameId = requestAnimationFrame(updateFrame);
          }
        } catch (error) {
          console.error('Error in playback loop:', error);
          // Stop playback on error to prevent getting stuck
          stopVideoPlayback();
        }
      };

      // Start the animation loop
      animationFrameId = requestAnimationFrame(updateFrame);

      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [isVideoPlaying, videoResult, audioElement, playbackSpeed, preProcessedFrames, videoSettings]); // Added missing dependencies

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
        console.log('Audio element ended naturally');
        stopVideoPlayback();
      });

      audio.addEventListener('error', (error) => {
        console.error('Audio element error:', error);
        stopVideoPlayback();
        toast.error('Audio playback error');
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

  // Get current frame analysis for Advanced Video Editor
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
   * Reset dot matrix display if it gets stuck
   */
  const resetDotMatrix = () => {
    setPixelStates(new Array(625).fill(false));
    setCurrentDisplayFrame(0);
    console.log('Dot matrix reset');
    toast.info('Dot matrix display reset');
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
    setOriginalVideoFile(videoFile);

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
   * Handle crop dialog cancellation
   */
  const handleCropCancel = () => {
    setShowCropDialog(false);
    setSelectedVideoFile(null);
  };

  /**
   * Handle re-crop button click
   */
  const handleReCrop = () => {
    if (originalVideoFile) {
      // Use the original video file for re-cropping
      setSelectedVideoFile(originalVideoFile);
      setShowCropDialog(true);
    } else {
      toast.error('Original video file not available for re-cropping. Please upload a new video.');
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
    setOriginalVideoFile(null);
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
   * Apply frame brightness with custom video settings
   */
  const applyFrameBrightnessWithSettings = (
    frameAnalysis: FrameAnalysis,
    settings: VideoSettings
  ) => {
    const newPixelStates = videoEditorService.applyVideoSettingsToFrame(frameAnalysis, settings);
    setPixelStates(newPixelStates);
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

      setPreProcessedFrames(processedFrames);
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
      stopVideoPlayback();
    } catch (error) {
      console.error('Failed to stop video:', error);
      // Force reset even if stop fails
      stopVideoPlayback();
    }
  };

  /**
   * Handle progress bar seeking
   */
  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioElement || !videoResult) return;

    const progress = parseFloat(event.target.value);

    // Calculate frame index based on progress percentage
    const frameIndex = Math.floor((progress / 100) * (videoResult.displayFrames.length - 1));

    // Calculate the corresponding audio time using the helper function
    const newTime = calculateTimeFromFrameIndex(frameIndex);

    console.log(`Seeking to: ${progress}% progress, frame: ${frameIndex}, time: ${newTime}s`);

    // Pause playback temporarily during seeking to prevent race conditions
    const wasPlaying = isVideoPlaying;
    if (wasPlaying) {
      setIsVideoPlaying(false);
    }

    // Set audio time first
    audioElement.currentTime = newTime;
    setVideoProgress(progress);

    // Update frame display using the helper function
    updateFrameDisplay(frameIndex);

    // Resume playback if it was playing before, with a longer delay to ensure seeking is complete
    if (wasPlaying) {
      setTimeout(() => {
        setIsVideoPlaying(true);
      }, 100); // Increased delay to ensure seeking is complete
    }
  };

  /**
   * Calculate frame index from time using consistent logic
   */
  const calculateFrameIndex = (timeInSeconds: number): number => {
    const timeInMs = timeInSeconds * 1000;
    const adjustedTime = timeInMs / playbackSpeed;
    const frameIndex = Math.floor(adjustedTime / 16.666); // 60Hz = 16.666ms per frame

    // Add bounds checking
    if (frameIndex < 0) {
      console.warn('Calculated negative frame index:', frameIndex, 'time:', timeInSeconds);
      return 0;
    }

    return frameIndex;
  };

  /**
   * Calculate time from frame index using consistent logic
   */
  const calculateTimeFromFrameIndex = (frameIndex: number): number => {
    const frameTimeMs = frameIndex * 16.666; // 60Hz = 16.666ms per frame
    const adjustedTimeMs = frameTimeMs * playbackSpeed; // Account for playback speed
    return adjustedTimeMs / 1000; // Convert to seconds
  };

  /**
   * Stop video playback and reset all states
   */
  const stopVideoPlayback = () => {
    console.log('Stopping video playback and resetting states');

    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    setIsVideoPlaying(false);
    setCurrentDisplayFrame(0);
    setVideoProgress(0);
    setPixelStates(new Array(625).fill(false));
  };

  /**
   * Update frame display with consistent logic
   */
  const updateFrameDisplay = (frameIndex: number) => {
    if (!videoResult) {
      console.warn('No video result available for frame update');
      setPixelStates(new Array(625).fill(false));
      return;
    }

    if (frameIndex < 0 || frameIndex >= videoResult.displayFrames.length) {
      console.warn('Invalid frame index:', frameIndex, 'max:', videoResult.displayFrames.length);
      setPixelStates(new Array(625).fill(false));
      return;
    }

    try {
      setCurrentDisplayFrame(frameIndex);
      drawCurrentFrameToCanvas(frameIndex);

      // Use pre-processed frames if available, otherwise fall back to real-time processing
      if (preProcessedFrames.length > 0 && frameIndex < preProcessedFrames.length) {
        const frameData = preProcessedFrames[frameIndex];
        if (frameData && frameData.length === 625) {
          // Only update if the data has actually changed
          setPixelStates((prevStates) => {
            // Check if the new frame data is different from current state
            for (let i = 0; i < 625; i++) {
              if (prevStates[i] !== frameData[i]) {
                return [...frameData]; // Create new array only if different
              }
            }
            return prevStates; // Return same reference if no changes
          });
        } else {
          console.warn('Invalid pre-processed frame data at index:', frameIndex);
          // Fallback to original frame
          const displayFrame = videoResult.displayFrames[frameIndex];
          if (displayFrame && displayFrame.pixelStates) {
            setPixelStates([...displayFrame.pixelStates]);
          }
        }
      } else {
        // Fallback to real-time processing
        const displayFrame = videoResult.displayFrames[frameIndex];

        if (displayFrame && displayFrame.pixelStates) {
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
            const analysisIndex = Math.floor(frameTime / (1000 / videoResult.fps));
            if (analysisIndex < videoResult.frameAnalyses.length) {
              const frameAnalysis = videoResult.frameAnalyses[analysisIndex];
              applyFrameBrightnessWithSettings(frameAnalysis, videoSettings);
            }
          } else {
            // Use default display frame
            setPixelStates([...displayFrame.pixelStates]);
          }
        } else {
          console.warn('Invalid display frame at index:', frameIndex);
          setPixelStates(new Array(625).fill(false));
        }
      }
    } catch (error) {
      console.error('Error updating frame display:', error);
      setPixelStates(new Array(625).fill(false));
    }
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

  // Constants for sizing
  const UNIT_SIZE = 12; // Reduced from 20 to 12 for better performance
  const GRID_SIZE = 25; // 25x25 grid
  const SQUARE_SIZE = GRID_SIZE * UNIT_SIZE; // 300px x 300px (reduced from 500px)

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
              Phone (3) Video to Glyph Matrix
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
                        key={`canvas-${currentDisplayFrame}-${videoSettings.inversion}-${videoSettings.threshold}-${videoSettings.brightness}-${videoSettings.contrast}-${videoSettings.gamma}`}
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
                        key={`matrix-${currentDisplayFrame}-${videoSettings.inversion}-${videoSettings.threshold}-${videoSettings.brightness}-${videoSettings.contrast}-${videoSettings.gamma}`}
                      >
                        {Array.from({ length: GRID_SIZE }, (_, row) =>
                          Array.from({ length: GRID_SIZE }, (_, col) => {
                            const index = getPixelIndex(row, col);
                            const isVisible = isPixelInCircle(row, col);
                            const isLit = pixelStates[index];

                            return (
                              <div
                                key={`${row}-${col}-${isLit}-${currentDisplayFrame}-${videoSettings.inversion}-${videoSettings.threshold}`}
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
                  <p>Lit pixels: {litPixelCount} / 625</p>
                  <p>Visible pixels: {visiblePixelCount}</p>
                  <p>Current frame: {currentDisplayFrame}</p>
                </div>
              </div>
            </div>
          )}

          {/* Video Controls - Moved to bottom */}
          {videoResult && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-6 mb-8">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-4 text-center font-[ndot] tracking-wider uppercase">
                Video Controls
              </h3>

              {/* Synchronized Video Playback Controls */}
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Unified play/pause toggle for better UX
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
                  {isVideoPlaying ? (
                    <Pause className="h-4 w-4 mr-1" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  {isVideoPlaying ? 'Pause' : 'Play'}
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
                  <Square className="h-4 w-4 mr-1" />
                  Stop
                </Button>

                {/* Re-crop Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReCrop}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
                  title="Re-crop video"
                  aria-label="Re-crop video"
                >
                  <Crop className="h-4 w-4 mr-1" />
                  Re-crop
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
                  <X className="h-4 w-4 mr-1" />
                  Close
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
                  <Download className="h-4 w-4 mr-1" />
                  Save
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
                  <Settings className="h-4 w-4 mr-1" />
                  Advanced Editor
                </Button>

                {/* Reset Display Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetDotMatrix}
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
                  title="Reset dot matrix display"
                  aria-label="Reset display"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Reset Display
                </Button>
              </div>

              {/* Playback Speed Control */}
              <div className="mb-4">
                <label className="block text-sm text-white/70 mb-2 text-center">
                  Playback Speed
                </label>
                <div className="flex justify-center items-center space-x-4">
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={playbackSpeed}
                    onChange={(e) => {
                      const newSpeed = parseFloat(e.target.value);
                      setPlaybackSpeed(newSpeed);
                      // Update playback rate if currently playing
                      if (audioElement) {
                        audioElement.playbackRate = newSpeed;
                      }
                      // processedVideoRef.current?.playbackRate = newSpeed; // This line is removed
                    }}
                    className="w-32 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-sm text-white/70 min-w-[3rem]">{playbackSpeed}x</span>
                </div>
              </div>

              {/* Synchronized Progress Bar */}
              <div className="w-full mb-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={videoProgress}
                  onChange={handleProgressChange}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider hover:bg-white/20 transition-colors duration-200"
                  style={{
                    background: `linear-gradient(to right, white 0%, white ${videoProgress}%, rgba(255,255,255,0.1) ${videoProgress}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>0:00</span>
                  <span>
                    {videoResult
                      ? `${Math.floor(videoResult.duration / 60)}:${(videoResult.duration % 60)
                          .toFixed(0)
                          .padStart(2, '0')}`
                      : '0:00'}
                  </span>
                </div>
              </div>

              {/* Video Status */}
              {videoResult && (
                <div className="text-center">
                  {/* Debug Info Toggle Button */}
                  <div className="mb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                      className="border-white/20 text-white hover:bg-white/10 hover:border-white/40 focus:ring-2 focus:ring-white/40 focus:outline-none active:scale-95 transition-all duration-200"
                      title={showDebugInfo ? 'Hide debug information' : 'Show debug information'}
                    >
                      {showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
                    </Button>
                  </div>

                  {/* Basic info always shown */}
                  <p className="text-xs sm:text-sm text-white/70">
                    Frame: {currentDisplayFrame + 1} / {videoResult.displayFrames.length}
                  </p>
                  <p className="text-xs sm:text-sm text-white/70">
                    Time: {((currentDisplayFrame * 16.666) / 1000).toFixed(2)}s
                  </p>
                  <p className="text-xs sm:text-sm text-white/70">
                    Progress: {videoProgress.toFixed(1)}% (Frame-based)
                  </p>
                  <p className="text-xs sm:text-sm text-white/70">
                    Lit pixels: {litPixelCount} / 625
                  </p>

                  {/* Debug info - only shown when toggle is on */}
                  {showDebugInfo && (
                    <>
                      <p className="text-xs sm:text-sm text-white/70">
                        Playback: {isVideoPlaying ? 'Playing' : 'Paused'} | Speed: {playbackSpeed}x
                        | Audio: {audioElement?.readyState || 'Not ready'} | Video: Image Preview
                      </p>
                      {/* Audio state debug info */}
                      {audioElement && (
                        <p className="text-xs sm:text-sm text-orange-400 mt-1">
                          🔊 Audio: {audioElement.currentTime.toFixed(2)}s /{' '}
                          {(audioElement.duration || 0).toFixed(2)}s | Paused:{' '}
                          {audioElement.paused ? 'Yes' : 'No'} | Ended:{' '}
                          {audioElement.ended ? 'Yes' : 'No'}
                        </p>
                      )}
                      {isPreProcessing && (
                        <p className="text-xs sm:text-sm text-yellow-400 mt-1">
                          ⚙️ Pre-processing frames for efficient playback...
                        </p>
                      )}
                      {preProcessedFrames.length > 0 && !isPreProcessing && (
                        <p className="text-xs sm:text-sm text-green-400 mt-1">
                          ✅ {preProcessedFrames.length} frames pre-processed for smooth playback
                        </p>
                      )}
                      {(videoSettings.gamma !== 1 ||
                        videoSettings.brightness !== 0 ||
                        videoSettings.contrast !== 1 ||
                        videoSettings.threshold !== 128 ||
                        videoSettings.inversion !== false) && (
                        <p className="text-xs sm:text-sm text-yellow-400 mt-1">
                          ⚙️ Custom video settings active
                        </p>
                      )}
                      {/* Debug info for frame issues */}
                      {currentDisplayFrame > 90 && (
                        <p className="text-xs sm:text-sm text-red-400 mt-1">
                          ⚠️ Frame {currentDisplayFrame} - monitoring for issues
                        </p>
                      )}

                      {/* Progress bar debug info */}
                      <p className="text-xs sm:text-sm text-purple-400 mt-1">
                        📊 Progress: Frame {currentDisplayFrame} of{' '}
                        {videoResult.displayFrames.length} ={' '}
                        {(
                          (currentDisplayFrame / (videoResult.displayFrames.length - 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Video Upload Section */}
          <div className="mb-8 p-4 sm:p-6 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-4 text-center font-[ndot] tracking-wider uppercase">
              Video Processing
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
            const event = {
              target: { value: progress.toString() }
            } as React.ChangeEvent<HTMLInputElement>;
            handleProgressChange(event);
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
