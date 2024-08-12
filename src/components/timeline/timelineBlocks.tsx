"use client";

import { GlyphBlock } from "@/logic/glyph_model";
import useTimelineStore from "@/logic/timeline_state";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { DraggableCore } from "react-draggable";
import { kMagicNumber } from "@/lib/consts";
import { useState } from "react";

type Props = {
  glyphItem: GlyphBlock;
  // duration: number;
};
export default function TimelineBlockComponent({ glyphItem }: Props) {
  const removeItem = useTimelineStore((state) => state.removeItem);
  const updateItem = useTimelineStore((state) => state.updateItem);
  const selectItem = useTimelineStore((state) => state.selectItem);
  const [trimStart, setTrimStart] = useState<boolean>(false);

  //Fun fact: Early artefact, used ui delta from handler pkg - so many issue, values would randomly go over 3k in delta, had to clamp and stuff; but yea current usage with movementX is much stable and better as it works as intended...
  // const handleDrag = (e: any, ui: { deltaX: any; deltaY: any }){...}

  // Type is mouse movement , have to investigate why it is not working here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDrag = (e: any) => {
    // CORE movement and update

    // Check if its being moved over the timeline limit, stop if so.

    if (trimStart) {
      // Trim if trim is ON
      updateItem({
        ...glyphItem,
        durationMilis: glyphItem.durationMilis + e.movementX * 10,
      });
    } else {
      updateItem({
        ...glyphItem,
        startTimeMilis: glyphItem.startTimeMilis + e.movementX * 5,
      });
    }

    console.log(`deltaX: ${e.movementX} `);
  };

  const handleStop = () => {
    if (trimStart) setTrimStart(false);
    // console.log("stopped via handler ");
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <DraggableCore onDrag={handleDrag} onStop={handleStop}>
          {/* Timeline Block */}
          <div
            onClick={(e) => {
              e.preventDefault();
              // Toggle Selection
              if (glyphItem.isSelected) {
                selectItem(glyphItem, false);
              } else {
                selectItem(glyphItem, true);
              }
            }}
            className="bg-white h-full border-primary relative flex items-center cursor-auto border-red-500 rounded-md"
            style={{
              width: `${(glyphItem.durationMilis / 1000) * kMagicNumber}px`,
              borderWidth: `${glyphItem.isSelected ? 3 : 0}px`,
            }}
          >
            {/* Right Trim component */}
            {glyphItem.isSelected && (
              <div
                onMouseDown={() => {
                  // console.warn("started ");
                  if (!trimStart) setTrimStart(true);
                }}
                className="text-white bg-red-500 absolute right-[-5px] cursor-col-resize select-none p-1 pb-2"
                // Stop text sel for handle (makeshift) icon |||
              >
                ||
              </div>
            )}
          </div>
        </DraggableCore>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={(e) => {
            e.preventDefault();
            removeItem(glyphItem.id, glyphItem.glyphId);
          }}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
