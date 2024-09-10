import useGlobalAppStore from '@/lib/timeline_state';
import { useEffect, useRef, useState } from 'react';
import NP1_5_Preview from './previewDevices/NP1_Preview';
import NP2_Preview from './previewDevices/NP2_Preview';
import NP2a_Preview from './previewDevices/NP2a_Preview';
import NP1_15_Preview from './previewDevices/NP1_15_Preview';
import { getPrettyTime } from '@/lib/helpers';
import { kTimeStepMilis } from '@/lib/consts';
import dataStore from '@/lib/data_store';
export default function GlyphPreviewComponent({ isAudioLoaded }: { isAudioLoaded: boolean }) {
  const timelineData = useGlobalAppStore((state) => state.items);
  const currentDevice = useGlobalAppStore((state) => state.phoneModel);
  const showAudioTimeStamp = useGlobalAppStore((state) => state.appSettings.showAudioTimeStamp);

  // Polling interval and position state
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const pollingRef = useRef<number | null>(null);

  const getAudioPosition: () => number = () => {
    return (dataStore.get('currentAudioPositionInMilis') ?? 0) as number;
  };

  //   check for position changes
  useEffect(() => {
    if (isAudioLoaded) {
      const pollAudioPosition = () => {
        const newPosition = getAudioPosition();
        if (newPosition !== currentPosition) {
          setCurrentPosition(newPosition);
        }
      };
      // poll for checks every <16ms
      pollingRef.current = window.setInterval(pollAudioPosition, kTimeStepMilis - 2);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [isAudioLoaded, currentPosition]);

  const zoneColors: string[] = [];

  function computeGlyphColor() {
    for (let i = 0; i < Object.keys(timelineData).length; i++) {
      for (let j = 0; j < timelineData[i].length; j++) {
        const curr = timelineData[i][j];
        const startTimeMilis = curr.startTimeMilis;
        const endTimeMilis = startTimeMilis + curr.durationMilis;

        if (currentPosition >= startTimeMilis && currentPosition <= endTimeMilis) {
          const iterCount = Math.floor((currentPosition - startTimeMilis) / kTimeStepMilis);
          const currentEffectBrightness = curr.effectData[iterCount];
          const adjustedBrightness = Math.sqrt(currentEffectBrightness) / Math.sqrt(4095);

          zoneColors[curr.glyphId] = `rgb(255 255 255 / ${adjustedBrightness})`;
        }

        if (
          j + 1 < timelineData[i].length &&
          timelineData[i][j + 1].startTimeMilis > currentPosition
        ) {
          break;
        }
      }
    }
  }

  computeGlyphColor();

  let previewComponent: React.ReactNode;
  switch (currentDevice) {
    case 'NP1':
      previewComponent = <NP1_5_Preview zoneColors={zoneColors} />;
      break;
    case 'NP1_15':
      previewComponent = <NP1_15_Preview zoneColors={zoneColors} />;
      break;
    case 'NP2':
      previewComponent = <NP2_Preview zoneColors={zoneColors} />;
      break;
    case 'NP2a':
      previewComponent = <NP2a_Preview zoneColors={zoneColors} />;
      break;

    default:
      previewComponent = <div className="select-none p-2">Feels Redundant. Scrap this?</div>;
  }
  const timeTextRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-black rounded-[20px] h-[300px] w-[150px] text-center flex items-center justify-center outline outline-[#212121] hover:shadow-[0px_0px_20px_1px_#aaaaaa] duration-500">
      {/* actual glyphs lights */}
      {previewComponent}
      {/* Time component */}
      {isAudioLoaded && showAudioTimeStamp && (
        <div
          ref={timeTextRef}
          className="absolute text-center text-md font-[ndot] text-[#818181]"
          onMouseLeave={() => {
            if (timeTextRef.current) {
              timeTextRef.current.style.textShadow = '';
              timeTextRef.current.style.fontFamily = 'ndot';
              timeTextRef.current.style.color = '#818181';
            }
          }}
          onMouseEnter={() => {
            if (timeTextRef.current) {
              timeTextRef.current.style.textShadow = '#dfdfdf 4px 2px 20px';
              timeTextRef.current.style.color = 'white';
              timeTextRef.current.style.fontFamily = 'arial';
            }
          }}
        >
          {`${getPrettyTime(
            currentPosition / 1000,
            ((dataStore.get('currentAudioDurationInMilis') as number) ?? 1) / 1000
          )}`}
        </div>
      )}
    </div>
  );
}
