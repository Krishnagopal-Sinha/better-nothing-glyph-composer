import useGlobalAppStore from "@/lib/timeline_state";
import TimelineBlockComponent from "./timelineBlocks";
import TimeBarComponent from "./timebar";
import PlayingIndicator from "./playingIndicator";
import dataStore from "@/lib/data_store";
import { GlyphBlock } from "@/lib/glyph_model";
import { calculateBeatDurationInMilis } from "@/lib/helpers";

type Props = {
  // currentAudioPosition: number;
  // duration: number ;
  timelineData: {
    [key: number]: GlyphBlock[];
  };
  scrollRef: React.Ref<HTMLDivElement>;
};

export default function EditorComponent({
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
  const timelineRows = [];
  const bpmSnapGridLines: JSX.Element[] = [];

  function generateBPMSnapGridLines() {
    const beatDurationInMilis = calculateBeatDurationInMilis(bpmValue);
    const gridWidth = (beatDurationInMilis / 1000) * timelinePixelFactor;
    let iter = 0;
    for (let i = 0; i < durationInMilis; i = i + beatDurationInMilis) {
      bpmSnapGridLines.push(
        <div
          key={i}
          className="absolute h-full outline-dashed outline-gray-700 z-[-10]"
          style={{
            width: `${gridWidth}px`,
            left: `${gridWidth * iter}px`,
          }}
        ></div>
      );
      iter++;
    }
  }

  function generateAllTimelineBlocksForARow(
    rownumber: number
  ): React.JSX.Element[] {
    const row: React.JSX.Element[] = [];

    timelineData[rownumber].map((e: GlyphBlock) => {
      // console.warn("render frame req @ editor");
      row.push(
        <div
          key={e.id}
          className="h-full w-[50px] absolute inset-0 py-[4px]"
          style={{
            marginLeft: `${(e.startTimeMilis / 1000) * timelinePixelFactor}px`,
          }}
        >
          <TimelineBlockComponent
            glyphItem={e}
            // duration={duration}
          />
          {/* Debug Stuff */}
          {/* {e.startTime} */}
          {/* {e.duration} */}
        </div>
      );
    });

    return row;
  }

  const numberOfRowsToGenerate = Object.keys(itemsSchema).length;
  const rowHeight = numberOfRowsToGenerate > 12 ? 40 : 75;
  for (let i = 0; i < numberOfRowsToGenerate; i++) {
    const rowData = generateAllTimelineBlocksForARow(i);
    timelineRows.push(
      <div
        key={i}
        title="Double tap to add a new glyph block"
        className={`border-b-2 border-dotted border-gray-600 relative select-none`}
        style={{ height: `${rowHeight}px` }}
        onDoubleClick={(e) => {
          e.preventDefault();
          const scrollValue: number = dataStore.get("editorScrollX") ?? 0;
          addItem(
            i,
            ((e.clientX + scrollValue) / timelinePixelFactor) * 1000 //convert to milis; offset needed cuz pointer has width too
          );
        }}
      >
        {rowData}
      </div>
    );
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    dataStore.set("editorScrollX", e.currentTarget.scrollLeft);
  };

  if (snapToBpmActive) {
    generateBPMSnapGridLines();
  }
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

        <div className="">{bpmSnapGridLines}</div>
        {timelineRows}
      </div>
    </div>
  );
}
