import { GlyphBlock } from "@/logic/glyph_model";
import useTimelineStore from "@/lib/timeline_state";

import TimelineBlockComponent from "./timelineBlocks";
import TimeBarComponent from "./timebar";

import { kMagicNumber, kNumberOfTimelineRows } from "@/lib/consts";
import PlayingIndicator from "./playingIndicator";

type Props = {
  // currentAudioPosition: number;
  // duration: number ;
  timelineData: {
    [key: number]: GlyphBlock[];
  };
};

export default function EditorComponent({
  timelineData,
}: // currentAudioPosition,
Props) {
  const addItem = useTimelineStore((state) => state.addItem);

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

  for (let i = 0; i < kNumberOfTimelineRows; i++) {
    const rowData = generateAllTimelineBlocksForARow(i);
    timelineRows.push(
      <div
        key={i}
    title="Double tap to add a new glyph block"

        className=" border-t-2 border-dotted border-gray-600 flex flex-row relative"
        onDoubleClick={(e) => {
          e.preventDefault();
          addItem(
            i,
            (e.pageX / kMagicNumber) * 1000 - 20 //convert to milis; offset needed cuz it looks off otherwise
          );
        }}
      >
        {rowData}
      </div>
    );
  }

  return (
    <div className="min-h-[50dvh] flex flex-col min-w-max">
      {/* time bar */}
      <TimeBarComponent />
      <div className="grid grid-rows-5 flex-grow">
        <PlayingIndicator />
        {timelineRows}
      </div>
    </div>
  );
}
