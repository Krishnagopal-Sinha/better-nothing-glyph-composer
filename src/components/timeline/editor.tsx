"use client";

import { GlyphBlock } from "@/logic/glyph_model";
import useTimelineStore from "@/logic/timeline_state";

import TimelineBlockComponent from "./timelineBlocks";
import TimeBarComponent from "./timebar";

import { kMagicNumber, kNumberOfTimelineRows } from "@/lib/consts";
import { nanoid } from "nanoid";

type Props = {
	currentAudioPosition: number ;
	// duration: number ;
  timelineData: {
    [key: number]: GlyphBlock[];
  };
};

export default function EditorComponent({timelineData,currentAudioPosition}:Props) {


  const addItem = useTimelineStore((state) => state.addItem);

  const baseGlyphBlock: GlyphBlock = {
    id: nanoid(),
    brightness: 4096,
    durationMilis: 500,
    startTimeMilis: 0,
    glyphId: 0,
    isSelected: false,
  };

  const timelineRows = [];

  function generateAllTimelineBlocksForARow(
    rownumber: number
  ): React.JSX.Element[] {
    const row: React.JSX.Element[] = [];

    timelineData[rownumber].map((e: GlyphBlock) => {
      row.push(
        <div
          key={e.id}
          className="h-full w-[50px] absolute inset-0 p-[4px]"
          style={{
            marginLeft: `${(e.startTimeMilis / 1000) * kMagicNumber}px`,
          }}
        >
          <TimelineBlockComponent glyphItem={e} 
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
        className=" border-t-2 border-dotted border-gray-600 flex flex-row relative"
        onDoubleClick={(e) => {
          e.preventDefault();
          addItem({
            ...baseGlyphBlock,
            glyphId: i,
           
            startTimeMilis: (e.pageX / kMagicNumber) * 1000, //convert to milis
          });

        }}
      >
        {/* Calc offset and palce i.e. margin wackkk */}
        {rowData}
      </div>
    );
  }

  return (
    <div className="min-h-[50dvh] flex flex-col justify-end min-w-max">
      {/* time bar */}
      <TimeBarComponent />
      <div
        className="grid grid-rows-5 flex-grow
      
      "
      >
        {/* Play / playing Indicator */}
        <div
          className="bg-red-600 h-[48dvh] w-1 absolute z-10"
          style={{ marginLeft: `${currentAudioPosition * kMagicNumber}px` }}
        >
          {/* {currentAudioPosition} */}
        </div>
        {timelineRows}
      </div>
    </div>
  );
}
