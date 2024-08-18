import { kMagicNumber } from "@/lib/consts";
import dataStore from "@/lib/data_store";
import { useRef, useState, useEffect } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { toast } from "sonner";

export default function PlayingIndicator() {
  const { getPosition, seek } = useGlobalAudioPlayer();

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

  // Loop feature
  const loopAPositionInMilis: number | undefined = dataStore.get(
    "loopAPositionInMilis"
  );
  const loopBPositionInMilis: number | undefined = dataStore.get(
    "loopBPositionInMilis"
  );
  const currentAudioPositionInMilis = currentAudioPosition * 1000;
  if (loopAPositionInMilis && loopBPositionInMilis) {
    // conver to milis
    if (currentAudioPositionInMilis >= loopBPositionInMilis) {
      // takes in seconds
      seek(loopAPositionInMilis / 1000);
    } else if (currentAudioPositionInMilis < loopAPositionInMilis) {
      // takes in seconds
      seek(loopAPositionInMilis / 1000);
      toast.error("Loop Active", {
        description:
          "Since loop is set, taking you to loop. Remove loop if this is unwanted.",
        action: {
          label: "Ok",
          onClick: () => {},
        },
      });
    }
  }

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
