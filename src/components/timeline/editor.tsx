import useGlobalAppStore from "@/lib/timeline_state";
import TimelineBlockComponent from "./timelineBlocks";
import TimeBarComponent from "./timebar";
import PlayingIndicator from "./playingIndicator";
import dataStore from "@/lib/data_store";
import { GlyphBlock } from "@/lib/glyph_model";
import BPMSnapGridLinesComponent from "./bpmGridLines";
import HeavyTimelineBlock from "@/logic/hc_tb";

type Props = {
  // currentAudioPosition: number;
  // duration: number ;
  timelineData: {
    [key: number]: GlyphBlock[];
  };
  scrollRef: React.Ref<HTMLDivElement>;
};

export function EditorComponent({
  timelineData,
  scrollRef,
}: // currentAudioPosition,
Props) {
  const addItem = useGlobalAppStore((state) => state.addItem);
  const bpmValue = useGlobalAppStore((state) => state.appSettings.bpmValue);
  const snapToBpmActive = useGlobalAppStore(
    (state) => state.appSettings.snapToBpmActive
  );
  const durationInMilis = useGlobalAppStore(
    (state) => state.audioInformation.durationInMilis
  );
  const itemsSchema = useGlobalAppStore((state) => state.items);
  const timelinePixelFactor = useGlobalAppStore(
    (state) => state.appSettings.timelinePixelFactor
  );
  const showHeavyUi = useGlobalAppStore(
    (state) => state.appSettings.showHeavyUi
  );

  const timelineRows: React.ReactNode[] = [];

  const numberOfRowsToGenerate = Object.keys(itemsSchema).length;
  const rowHeight = numberOfRowsToGenerate > 12 ? 40 : 75;
  for (let i = 0; i < numberOfRowsToGenerate; i++) {
    timelineRows.push(
      <div
        key={i}
        title="Double tap to add a new glyph block"
        className={`border-b-2 border-dotted border-gray-600 relative select-none`}
        style={{ height: `${rowHeight}px` }}
        onDoubleClick={(e) => {
          e.preventDefault();
          const scrollValue: number = dataStore.get("editorScrollX") ?? 0;
          console.log("double clicked?");
          addItem(
            i,
            ((e.clientX + scrollValue) / timelinePixelFactor) * 1000 //convert to milis; offset needed cuz pointer has width too
          );
        }}
      >
        <TimelineBlocks
          showHeavyUi={showHeavyUi}
          rowTimelineData={timelineData[i]}
          timelinePixelFactor={timelinePixelFactor}
        />
      </div>
    );
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    dataStore.set("editorScrollX", e.currentTarget.scrollLeft);
  };

  return (
    // added to for scroll
    <div
      className="min-h-[50dvh] overflow-auto"
      ref={scrollRef}
      onScroll={handleScroll}
    >
      <div className="flex flex-col flex-grow min-w-max relative">
        {/* time bar */}
        <TimeBarComponent />

        {/* playing indicator */}
        <PlayingIndicator editorRows={numberOfRowsToGenerate} />

        {snapToBpmActive && (
          <BPMSnapGridLinesComponent
            bpmValue={bpmValue}
            durationInMilis={durationInMilis}
            timelinePixelFactor={timelinePixelFactor}
          />
        )}

        {timelineRows}
      </div>
    </div>
  );
}

const TimelineBlocks = ({
  rowTimelineData,
  timelinePixelFactor,
  showHeavyUi,
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
          marginLeft: `${
            (rowTimelineData[i].startTimeMilis / 1000) * timelinePixelFactor
          }px`,
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
