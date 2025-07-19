import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';
import { Play, Pause, Square } from 'lucide-react';
import { showPopUp } from '@/lib/helpers';

interface LegacyAudioEditPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (trimmedAudioBlob: Blob, originalFile: File) => void;
  audioFile: File;
}

export default function LegacyAudioEditPopup({
  isOpen,
  onClose,
  onSave,
  audioFile
}: LegacyAudioEditPopupProps) {
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [loopBetweenTrimPoints, setLoopBetweenTrimPoints] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize audio when component mounts or audio file changes
  useEffect(() => {
    if (audioFile && isOpen) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);

      // Clean up previous URL
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioFile, isOpen]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up audio URL when component unmounts
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle audio metadata loading
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const audio = audioRef.current;
      setDuration(audio.duration);
      setEndTime(audio.duration);
      drawWaveform();
    }
  };

  // Handle audio ended
  const handleEnded = () => {
    if (loopBetweenTrimPoints && endTime > startTime) {
      // Loop back to start time
      seekTo(startTime);
      if (audioRef.current) {
        audioRef.current.play();
      }
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Play/pause audio
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // If loop is enabled, start from start time
        if (loopBetweenTrimPoints && currentTime < startTime) {
          seekTo(startTime);
        }
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Stop audio
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Seek to specific time
  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Format time to MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Draw waveform on canvas
  const drawWaveform = async () => {
    if (!canvasRef.current || !audioRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const channelData = audioBuffer.getChannelData(0);
      const samples = Math.min(800, channelData.length); // Limit samples for better performance
      const blockSize = Math.floor(channelData.length / samples);
      const filteredData = [];

      for (let i = 0; i < samples; i++) {
        let sum = 0;
        const startIndex = i * blockSize;
        const endIndex = Math.min(startIndex + blockSize, channelData.length);

        for (let j = startIndex; j < endIndex; j++) {
          sum += Math.abs(channelData[j]);
        }
        filteredData.push(sum / (endIndex - startIndex));
      }

      const max = Math.max(...filteredData) || 1; // Prevent division by zero
      const multiplier = canvas.height / max;

      // Clear canvas with pure black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = canvas.width / samples;
      const currentSample = Math.floor((currentTime / duration) * samples);

      filteredData.forEach((value, index) => {
        const barHeight = Math.max(2, value * multiplier * 0.8); // Ensure minimum height and scale down
        const x = index * barWidth;
        const y = (canvas.height - barHeight) / 2;

        // Determine color based on playback position
        if (index <= currentSample) {
          // Played portion - use the specified red color
          ctx.fillStyle = 'rgb(220 38 38)';
        } else {
          // Unplayed portion - white
          ctx.fillStyle = '#ffffff';
        }

        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
      });
    } catch (error) {
      console.error('Error drawing waveform:', error);
      // Fallback: draw a simple line
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
  };

  // Handle canvas click for seeking
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTime = (x / canvas.width) * duration;
    seekTo(clickTime);
  };

  // Update waveform when current time changes
  useEffect(() => {
    if (duration > 0) {
      drawWaveform();
    }
  }, [currentTime, duration]);

  // Handle audio time updates with loop logic
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime;
      setCurrentTime(newTime);

      // Check if we need to loop back to start
      if (loopBetweenTrimPoints && newTime >= endTime && isPlaying) {
        seekTo(startTime);
      }
    }
  };

  // Handle slider changes
  const handleStartTimeChange = (value: number[]) => {
    const newStartTime = value[0];
    setStartTime(newStartTime);
    if (newStartTime >= endTime) {
      setEndTime(Math.min(duration, newStartTime + 1));
    }
  };

  const handleEndTimeChange = (value: number[]) => {
    const newEndTime = value[0];
    setEndTime(newEndTime);
    if (newEndTime <= startTime) {
      setStartTime(Math.max(0, newEndTime - 1));
    }
  };

  // Handle slider clicks to skip to position
  const handleStartSliderClick = () => {
    seekTo(startTime);
  };

  const handleEndSliderClick = () => {
    seekTo(endTime);
  };

  // Convert AudioBuffer to WAV blob
  const audioBufferToWav = (buffer: AudioBuffer): Promise<Blob> => {
    return new Promise((resolve) => {
      const length = buffer.length;
      const numberOfChannels = buffer.numberOfChannels;
      const sampleRate = buffer.sampleRate;
      const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
      const view = new DataView(arrayBuffer);

      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length * numberOfChannels * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numberOfChannels * 2, true);
      view.setUint16(32, numberOfChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length * numberOfChannels * 2, true);

      // Write audio data
      let offset = 44;
      for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
          view.setInt16(offset, sample * 0x7fff, true);
          offset += 2;
        }
      }

      resolve(new Blob([arrayBuffer], { type: 'audio/wav' }));
    });
  };

  // Handle continue (trim and load into app)
  const handleContinue = async () => {
    if (startTime >= endTime) {
      showPopUp('Invalid Selection', 'Please select a valid time range for trimming.', 2000);
      return;
    }

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const length = endSample - startSample;

      if (length <= 0) {
        showPopUp('Invalid Selection', 'The selected time range is too short.', 2000);
        return;
      }

      const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        length,
        sampleRate
      );

      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const trimmedData = trimmedBuffer.getChannelData(channel);

        for (let i = 0; i < length; i++) {
          const sourceIndex = startSample + i;
          if (sourceIndex < channelData.length) {
            trimmedData[i] = channelData[sourceIndex];
          }
        }
      }

      // Convert to blob and save
      const wavBlob = await audioBufferToWav(trimmedBuffer);
      // Pass both trimmed audio and original file to preserve embedded glyph data
      onSave(wavBlob, audioFile);
      onClose();
    } catch (error) {
      console.error('Error trimming audio:', error);
      showPopUp('Error', 'Failed to trim audio. Please try again.', 2000);
    }
  };

  // Reset trim points
  const resetTrim = () => {
    setStartTime(0);
    setEndTime(duration);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[800px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto bg-black border-[#333]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Audio Editor</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-gray-400">
            Trim your audio by setting start and end points. Ideal ringtone length is 30 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Audio Element (hidden) */}
          <audio
            ref={audioRef}
            src={audioUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            preload="metadata"
          />

          {/* Waveform Display */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Waveform</span>
              <span className="font-mono text-white">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={800}
                height={100}
                className="w-full h-24 border border-[#333] rounded-lg cursor-pointer bg-black"
                onClick={handleCanvasClick}
              />
              {/* Trim indicators */}
              <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none">
                <div
                  className="absolute top-0 bottom-0 bg-[#939393] opacity-20"
                  style={{
                    left: `${(startTime / duration) * 100}%`,
                    width: `${((endTime - startTime) / duration) * 100}%`
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#939393]"
                  style={{ left: `${(startTime / duration) * 100}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#939393]"
                  style={{ left: `${(endTime / duration) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Trim Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Start Time: {formatTime(startTime)}
              </label>
              <Slider
                value={[startTime]}
                onValueChange={handleStartTimeChange}
                max={duration}
                min={0}
                step={0.1}
                className="w-full"
                onClick={handleStartSliderClick}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                End Time: {formatTime(endTime)}
              </label>
              <Slider
                value={[endTime]}
                onValueChange={handleEndTimeChange}
                max={duration}
                min={0}
                step={0.1}
                className="w-full"
                onClick={handleEndSliderClick}
              />
            </div>

            {/* Loop Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="loopCheckbox"
                checked={loopBetweenTrimPoints}
                onCheckedChange={(checked) => setLoopBetweenTrimPoints(checked as boolean)}
              />
              <label
                htmlFor="loopCheckbox"
                className="text-sm font-medium text-white cursor-pointer"
              >
                Loop between trim points
              </label>
            </div>
          </div>

          {/* Simple Playback Controls */}
          <div className="flex items-center justify-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={stopAudio}
              className="flex items-center space-x-1 border-[#333] text-white hover:bg-[#333]"
            >
              <Square className="w-4 h-4" />
            </Button>

            <Button
              onClick={togglePlayPause}
              className="flex items-center space-x-2 px-6 bg-white text-black hover:bg-gray-200"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#333]">
          <div className="flex gap-2 w-full sm:w-auto order-2 sm:order-1">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto border-[#333] text-white hover:bg-[#333]"
            >
              Cancel
            </Button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
            <Button
              variant="outline"
              onClick={resetTrim}
              className="w-full sm:w-auto border-[#333] text-white hover:bg-[#333]"
            >
              Reset
            </Button>
            <Button
              onClick={handleContinue}
              className="w-full sm:w-auto bg-white text-black hover:bg-gray-200"
            >
              Continue
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
