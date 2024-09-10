import useGlobalAppStore from '@/lib/timeline_state';
import TimelineBlockComponent from './timelineBlocks';
import PlayingIndicator from './playingIndicator';
import dataStore from '@/lib/data_store';
import { GlyphBlock } from '@/lib/glyph_model';
import BPMSnapGridLinesComponent from './bpmGridLines';
import HeavyTimelineBlock from '@/logic/hc_tb';
import { memo, useMemo } from 'react';
import Selecto from 'react-selecto';
import { useRef } from 'react';

type Props = {
  // currentAudioPosition: number;
  // duration: number ;
  timelineData: {
    [key: number]: GlyphBlock[];
  };
  editorRef: React.Ref<HTMLDivElement>;
  selectoRef: React.Ref<HTMLDivElement>;
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
  const selectItems = useGlobalAppStore((state) => state.selectItems);
  const selectoRef = useRef(null);

  // label feat.
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    selectoRef.current.checkScroll();
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

        <div
          id="select-container"
        >
          <Selecto
            ref={selectoRef}
            container={document.getElementById('select-container')}
            dragContainer={document.getElementById('select-container')}
            selectableTargets={['.target-block']}
            selectFromInside={false}
            selectByClick={true}
            continueSelect={false}
            continueSelectWithoutDeselect={true}
            toggleContinueSelect={'shift'}
            toggleContinueSelectWithoutDeselect={[['ctrl'], ['meta']]}
            hitRate={0}
            onSelectEnd={(e) => {
              selectItems(e.selected.map((element) => element.getAttribute('data-id')) as string[]);
            }}
            onScroll={(e) => {
              editorRef.current.scrollBy(e.direction[0] * 10, e.direction[1] * 10);
            }}
            scrollOptions={{
              container: editorRef.current,
              throttleTime: 30,
              threshold: 0
            }}
          />
          {TimelineRows()}
        </div>
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
          className={`border-dotted border-t border-[#3e3e3e] relative select-none min-h-[50px]`}
          // ^^ controls editor row track size
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
          <MemoizedTimelineblocks
            showHeavyUi={showHeavyUi}
            rowTimelineData={JSON.stringify(timelineData[i])}
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
  rowTimelineData: string;
  timelinePixelFactor: number;
  showHeavyUi: boolean;
}) => {
  const row: React.JSX.Element[] = [];
  const parsedRowTimelineData = JSON.parse(rowTimelineData);
  for (let i = 0; i < parsedRowTimelineData.length; i++) {
    row.push(
      <div
        key={parsedRowTimelineData[i].id}
        className="h-full w-[50px] absolute inset-0 py-[4px]"
        style={{
          marginLeft: `${(parsedRowTimelineData[i].startTimeMilis / 1000) * timelinePixelFactor}px`
        }}
      >
        {!showHeavyUi ? (
          <TimelineBlockComponent
            stringifiedGlyphItem={JSON.stringify(parsedRowTimelineData[i])}
            // duration={duration}
          />
        ) : (
          <HeavyTimelineBlock stringifiedGlyphItem={JSON.stringify(parsedRowTimelineData[i])} />
        )}
        {/* Debug Stuff */}
        {/* {e.startTime} */}
        {/* {e.duration} */}
      </div>
    );
  }

  return <>{row}</>;
};

const MemoizedTimelineblocks = memo(TimelineBlocks);
