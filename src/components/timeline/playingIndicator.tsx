import dataStore from "@/lib/data_store";
import useGlobalAppStore from "@/lib/timeline_state";
import { useRef, useState, useEffect, useMemo } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { toast } from "sonner";

//TODO: Animated every instance, throttle this down?
export default function PlayingIndicator({
  editorRows,
}: {
  editorRows: number;
}) {
  const { getPosition, seek } = useGlobalAudioPlayer();
  const timelinePixelFactor = useGlobalAppStore((state) => state.appSettings.timelinePixelFactor);

  // Handle live playing indicator updates for playing audio
  const frameRef = useRef<number>();

  const [currentAudioPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    const animate = () => {
      setCurrentPosition(getPosition()); 
      dataStore.set('currentAudioPositionInMilis', getPosition()*1000); //convert into milis
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

  // for efficiency
  const rowLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < editorRows; i++) {
      labels.push(<div key={i}>{i + 1}</div>);
    }
    return labels;
  }, [editorRows]);

  const isZoneVisible = useGlobalAppStore(
    (state) => state.appSettings.isZoneVisible
  );

  return (
    // Playing indicator
    <div
      className="bg-red-600 h-full w-1 z-[5] absolute"
      style={{
        marginLeft: `${currentAudioPosition * timelinePixelFactor}px`,
      }}
    >
      {isZoneVisible && (
        <div className={`pt-5 ml-3 h-full grid select-none text-slate-600`}>
          {rowLabels}
        </div>
      )}
    </div>
  );
}
