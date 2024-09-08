import useGlobalAppStore from '@/lib/timeline_state';
import { useMemo } from 'react';

export default function PlayingIndicator({ editorRows }: { editorRows: number }) {
  // #efficiency
  const rowLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < editorRows; i++) {
      labels.push(<div key={i}>{i + 1}</div>);
    }
    return labels;
  }, [editorRows]);

  const isZoneVisible = useGlobalAppStore((state) => state.appSettings.isZoneVisible);

  return (
    // Playing indicator
    <div
      className="bg-[red] h-full w-[2px] z-[5] absolute"
      id="playing_indicator"
      style={
        {
          // marginLeft: `${currentAudioPosition * timelinePixelFactor}px`,
        }
      }
    >
      {isZoneVisible && (
        <div className={`pt-[210px] ml-3 h-full grid select-none text-slate-600`}>{rowLabels}</div>
      )}
    </div>
  );
}
