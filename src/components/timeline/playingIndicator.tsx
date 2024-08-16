import { kMagicNumber } from "@/lib/consts";
import { useRef, useState, useEffect } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";

export default function PlayingIndicator() {
  const { getPosition } = useGlobalAudioPlayer();

  // Handle live playing indicator updates for playing audio
  const frameRef = useRef<number>();

  const [currentAudioPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    const animate = () => {
      setCurrentPosition(getPosition()); //conver to milis
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [getPosition]);

  return (
    // Playing indicator
    <div
      className="bg-red-600 h-[48dvh] w-1 absolute z-10"
      style={{ marginLeft: `${currentAudioPosition * kMagicNumber}px` }}
    >
      {/* {currentAudioPosition} */}
    </div>
  );
}
