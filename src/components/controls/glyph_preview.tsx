import useGlobalAppStore from "@/lib/timeline_state";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import NP1_5_Preview from "./previewDevices/NP1_Preview";
import NP2_Preview from "./previewDevices/NP2_Preview";
import NP2a_Preview from "./previewDevices/NP2a_Preview";
import NP1_15_Preview from "./previewDevices/NP1_15_Preview";
import { generateEffectData } from "@/logic/export_logic";
import { kTimeStepMilis } from "@/lib/consts";

export default function GlyphPreviewComponent() {
  const { getPosition } = useGlobalAudioPlayer();
  // Handle live playing indicator updates for playing audio
  const frameRef = useRef<number>();
  const timelineData = useGlobalAppStore((state) => state.items);
  const currentDevice = useGlobalAppStore((state) => state.phoneModel);

  const [currentAudioPosition, setCurrentPosition] = useState(0);

  const animate = useCallback(() => {
    setCurrentPosition(getPosition() * 1000); // Convert to milliseconds
    frameRef.current = requestAnimationFrame(animate);
  }, [getPosition]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [animate]); // Depend on the memoized animate function

  const zoneColors: string[] = []; //0 means off, 1 means on

  function computeGlyphColor() {
    for (let i = 0; i < Object.entries(timelineData).length; i++) {
      for (let j = 0; j < timelineData[i].length; j++) {
        //No need to set back to default color as it is being init @ every frame rendered.
        if (
          currentAudioPosition >= timelineData[i][j].startTimeMilis &&
          currentAudioPosition <=
            timelineData[i][j].startTimeMilis + timelineData[i][j].durationMilis
        ) {
          const curr = timelineData[i][j];
          // cuz in milis
          const currTime = Math.floor((getPosition() * 1000) / kTimeStepMilis);
          const endTimeIdx = Math.floor(
            (curr.startTimeMilis + curr.durationMilis) / kTimeStepMilis
          );
          const iterLimit = endTimeIdx - curr.startTimeMilis;
          const iterCount = currTime;

          const currentEffectBrightness = generateEffectData(
            curr.effectId,
            curr.startingBrightness,
            iterCount,
            iterLimit
          );
          // Sqrt cuz it gets way to dim; making dims more bright.
          zoneColors[curr.glyphId] = `rgb(255 255 255 / ${
            Math.sqrt(currentEffectBrightness) / Math.sqrt(4095)
          })`;
          //   console.info("Encountered lit up glyph!");
          // Cuz one track can only have 1 at a time, skip and save compute
          break;
          // print(
          //     '+++++++++++ ${timelineData.items[i]![j].glyphId} -> ${zoneColors[timelineData.items[i]![j].glyphId]}');
        }
        // console.info(`no glyph lit at @${currentAudioPosition}`);
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
    <div className="bg-black rounded-[20px] h-[300px] w-[150px] text-center flex items-center justify-center ">
      {previewComponent}
    </div>
  );
}
