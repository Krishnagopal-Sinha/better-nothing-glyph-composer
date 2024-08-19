import { GlyphBlock } from "@/logic/glyph_model";
import useTimelineStore from "@/lib/timeline_state";

import TimelineBlockComponent from "./timelineBlocks";
import TimeBarComponent from "./timebar";

import { kMagicNumber, kMouseCursorOffset } from "@/lib/consts";
import PlayingIndicator from "./playingIndicator";
import dataStore from "@/lib/data_store";

type Props = {
  // currentAudioPosition: number;
  // duration: number ;
  timelineData: {
    [key: number]: GlyphBlock[];
  };
  scrollRef: React.Ref<HTMLDivElement>
};

export default function EditorComponent({
  timelineData,
  scrollRef
}: // currentAudioPosition,
Props) {
  const addItem = useTimelineStore((state) => state.addItem);
  const itemsSchema = useTimelineStore((state) => state.items);

  const timelineRows = [];

  function generateAllTimelineBlocksForARow(
    rownumber: number
  ): React.JSX.Element[] {
    const row: React.JSX.Element[] = [];

    timelineData[rownumber].map((e: GlyphBlock) => {
      // console.warn("render frame req @ editor");
      row.push(
        <div
          key={e.id}
          className="h-full w-[50px] absolute inset-0 p-[4px]"
          style={{
            marginLeft: `${(e.startTimeMilis / 1000) * kMagicNumber}px`,
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
            ((e.clientX + scrollValue) / kMagicNumber) * 1000 -
              kMouseCursorOffset //convert to milis; offset needed cuz pointer has width too
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
        {timelineRows}
      </div>
    </div>
  );
}
