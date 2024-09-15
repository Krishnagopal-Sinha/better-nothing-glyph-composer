import useGlobalAppStore from '@/lib/timeline_state';
import TimelineBlockComponent from './timelineBlocks';
import PlayingIndicator from './playingIndicator';
import dataStore from '@/lib/data_store';
import { GlyphBlock } from '@/lib/glyph_model';
import BPMSnapGridLinesComponent from './bpmGridLines';
import HeavyTimelineBlock from '@/logic/hc_tb';
import { useAreaSelection } from '@/lib/area_selection_helper';
import { useRef } from 'react';
import { SelectionContext } from '@/lib/area_select_context';

type Props = {
  // currentAudioPosition: number;
  // duration: number ;
  timelineData: {
    [key: number]: GlyphBlock[];
  };
  editorRef: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
};

export function EditorComponent({
  timelineData,
  children,
  editorRef
}: // currentAudioPosition,
Props) {
  const addItem = useGlobalAppStore((state) => state.addItem);
  const bpmValue = useGlobalAppStore((state) => state.appSettings.bpmValue);
  const snapToBpmActive = useGlobalAppStore((state) => state.appSettings.snapToBpmActive);
  const isZoneVisible = useGlobalAppStore((state) => state.appSettings.isZoneVisible);
  const durationInMilis = useGlobalAppStore((state) => state.audioInformation.durationInMilis);
  const itemsSchema = useGlobalAppStore((state) => state.items);
  const numberOfRowsToGenerate = Object.keys(itemsSchema).length;
  const timelinePixelFactor = useGlobalAppStore((state) => state.appSettings.timelinePixelFactor);
  const showHeavyUi = useGlobalAppStore((state) => state.appSettings.showHeavyUi);
  // Hover to see which glyph lights up feat
  const updateHoveredGlyphZone = useGlobalAppStore((state) => state.updateHoveredGlyphZone);

  // label feat.
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollX = e.currentTarget.scrollLeft;
    dataStore.set('editorScrollX', scrollX);
    if (!isZoneVisible) return;
    const labels = document.querySelectorAll<HTMLDivElement>('.glyph_label');
    labels.forEach((label) => {
      label.style.left = `${scrollX}px`;
      label.style.borderTopRightRadius = `12px`;
      label.style.borderBottomRightRadius = `12px`;
      label.style.borderTopLeftRadius = `0px`;
      label.style.borderBottomLeftRadius = `0px`;
    });
  };
  const selectContainerRef = useRef<HTMLDivElement | null>(null);
  const selection = useAreaSelection({ container: selectContainerRef });
  // UI
  return (
    // added to for scroll
    <div className="overflow-auto" ref={editorRef} onScroll={handleScroll}>
      <div className="flex flex-col flex-grow min-w-max relative bg-black">
        {/* AudioControls and timebar */}
        {children}

        {/* playing indicator */}
        <PlayingIndicator />

        {snapToBpmActive && (
          <BPMSnapGridLinesComponent
            bpmValue={bpmValue}
            durationInMilis={durationInMilis}
            timelinePixelFactor={timelinePixelFactor}
          />
        )}
        <SelectionContext.Provider value={selection}>
          <div ref={selectContainerRef}>{TimelineRows()}</div>
        </SelectionContext.Provider>
      </div>
    </div>
  );

  function TimelineRows() {
    const timelineRows: React.ReactNode[] = [];

    for (let i = 0; i < numberOfRowsToGenerate; i++) {
      timelineRows.push(
        <div
          key={i}
          title="Double tap to add a new glyph block"
          className={`relative select-none min-h-[50px] border-dotted border-[#333]  border-t-2 hover:border-[#939393] hover:border-y-2`}
          // ^^ controls editor row track size
          onMouseEnter={() => updateHoveredGlyphZone(i)}
          onMouseLeave={() => updateHoveredGlyphZone(null)}
          onDoubleClick={(e) => {
            e.preventDefault();
            const scrollValue: number = dataStore.get('editorScrollX') ?? 0;
            // console.log("double clicked?");
            addItem(
              i,
              ((e.clientX + scrollValue) / timelinePixelFactor) * 1000 //convert to milis; offset needed cuz pointer has width too
            );
          }}
        >
          {/* Label UI */}
          {isZoneVisible && (
            <div
              className="z-10 w-[10px] h-[15px] text-white text-xl rounded-l-[12px] pl-6 font-[ndot] mt-1 glyph_label duration-75 select-none pointer-events-none"
              style={{
                mixBlendMode: 'difference',
                position: 'absolute',
                left: 0
              }}
            >
              <div>{i + 1}</div>
            </div>
          )}
          <TimelineBlocks
            showHeavyUi={showHeavyUi}
            rowTimelineData={timelineData[i]}
            timelinePixelFactor={timelinePixelFactor}
          />
        </div>
      );
    }

    return timelineRows;
  }
}

const TimelineBlocks = ({
  rowTimelineData,
  timelinePixelFactor,
  showHeavyUi
}: {
  rowTimelineData: GlyphBlock[];
  timelinePixelFactor: number;
  showHeavyUi: boolean;
}) => {
  const row: React.JSX.Element[] = [];
  for (let i = 0; i < rowTimelineData.length; i++) {
    row.push(
      <div
        key={rowTimelineData[i].id}
        className="h-full w-[50px] absolute inset-0 py-[4px]"
        style={{
          marginLeft: `${(rowTimelineData[i].startTimeMilis / 1000) * timelinePixelFactor}px`
        }}
      >
        {!showHeavyUi ? (
          <TimelineBlockComponent
            glyphItem={rowTimelineData[i]}
            // duration={duration}
          />
        ) : (
          <HeavyTimelineBlock glyphItem={rowTimelineData[i]} />
        )}
        {/* Debug Stuff */}
        {/* {e.startTime} */}
        {/* {e.duration} */}
      </div>
    );
  }

  return <>{row}</>;
};
