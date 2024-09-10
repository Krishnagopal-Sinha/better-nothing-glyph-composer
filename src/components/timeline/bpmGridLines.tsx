import { calculateBeatDurationInMilis } from '@/lib/helpers';
import { useMemo } from 'react';

export default function BPMSnapGridLinesComponent({
  bpmValue,
  durationInMilis,
  timelinePixelFactor
}: {
  bpmValue: number;
  durationInMilis: number;
  timelinePixelFactor: number;
}) {
  return useMemo(() => {
    const beatDurationInMilis = calculateBeatDurationInMilis(bpmValue);
    const gridWidth = (beatDurationInMilis / 1000) * timelinePixelFactor;
    let iter = 0;
    const bpmSnapGridLines = [];

    for (let i = 0; i < durationInMilis; i += beatDurationInMilis) {
      bpmSnapGridLines.push(
        <div
          key={i}
          className="absolute h-full outline-dashed outline-[#333333] z-[10] pointer-events-none"
          style={{
            width: `${gridWidth}px`,
            left: `${gridWidth * iter}px`
          }}
        ></div>
      );
      iter++;
    }

    return bpmSnapGridLines;
  }, [bpmValue, durationInMilis, timelinePixelFactor]);
}
