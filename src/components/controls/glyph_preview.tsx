import useGlobalAppStore from "@/lib/timeline_state";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import NP1_5_Preview from "./previewDevices/NP1_Preview";
import NP2_Preview from "./previewDevices/NP2_Preview";
import NP2a_Preview from "./previewDevices/NP2a_Preview";
import NP1_15_Preview from "./previewDevices/NP1_15_Preview";
import { generateEffectData } from "@/logic/export_logic";
import { kTimeStepMilis } from "@/lib/consts";
import { getPrettyTime } from "@/lib/helpers";

export default function GlyphPreviewComponent({
  isAudioLoaded,
}: {
  isAudioLoaded: boolean;
}) {
  const { getPosition, duration } = useGlobalAudioPlayer();
  // Handle live playing indicator updates for playing audio
  const frameRef = useRef<number>();
  const timelineData = useGlobalAppStore((state) => state.items);
  const currentDevice = useGlobalAppStore((state) => state.phoneModel);
  const showAudioTimeStamp = useGlobalAppStore(
    (state) => state.appSettings.showAudioTimeStamp
  );

  // only for refreshing preview every sec audio played
  const [, setCurrentPosition] = useState(0);

  const animate = useCallback(() => {
    setCurrentPosition(getPosition() * 1000); // Convert to millis
    frameRef.current = requestAnimationFrame(animate);
  }, [getPosition]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [animate]);

  const zoneColors: string[] = [];

  function computeGlyphColor() {
    const currentPositionMilis = getPosition() * 1000; // Convert to millis
    for (let i = 0; i < Object.keys(timelineData).length; i++) {
      for (let j = 0; j < timelineData[i].length; j++) {
        const curr = timelineData[i][j];
        const startTime = curr.startTimeMilis;
        const endTime = startTime + curr.durationMilis;

        if (
          currentPositionMilis >= startTime &&
          currentPositionMilis <= endTime
        ) {
          const currTime = Math.floor(currentPositionMilis / kTimeStepMilis);
          const startTimeIdx = Math.floor(startTime / kTimeStepMilis);
          const endTimeIdx = Math.floor(endTime / kTimeStepMilis);
          // see export logic to see main logic, almost copy n paste of that
          const iterCount = currTime - startTimeIdx;
          const iterLimit = endTimeIdx - startTimeIdx;

          const currentEffectBrightness = generateEffectData(
            curr.effectId,
            curr.startingBrightness,
            iterCount,
            iterLimit
          );

          // sqrt to brighten up dim lights
          const adjustedBrightness =
            Math.sqrt(currentEffectBrightness) / Math.sqrt(4095);

          zoneColors[curr.glyphId] = `rgb(255 255 255 / ${adjustedBrightness})`;
        }
      }
    }
  }

  computeGlyphColor();

  let previewComponent: React.ReactNode;
  switch (currentDevice) {
    case "NP1":
      previewComponent = <NP1_5_Preview zoneColors={zoneColors} />;
      break;
    case "NP1_15":
      previewComponent = <NP1_15_Preview zoneColors={zoneColors} />;
      break;
    case "NP2":
      previewComponent = <NP2_Preview zoneColors={zoneColors} />;
      break;
    case "NP2a":
      previewComponent = <NP2a_Preview zoneColors={zoneColors} />;
      break;

    default:
      previewComponent = (
        <div className="select-none p-2">Feels Redundant. Scrap this?</div>
      );
  }

  return (
    // Phone bg
    <div className="bg-black rounded-[20px] h-[300px] w-[150px] text-center flex items-center justify-center ">
      {/* actual glyphs lights */}
      {previewComponent}
      {/* Time component */}
      {isAudioLoaded && showAudioTimeStamp && (
        <div className="absolute text-sm text-center text-gray-700">
          {`${getPrettyTime(getPosition(), duration)}`}
        </div>
      )}
    </div>
  );
}
