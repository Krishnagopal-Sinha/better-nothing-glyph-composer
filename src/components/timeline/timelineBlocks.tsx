import useGlobalAppStore from "@/lib/timeline_state";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { DraggableCore } from "react-draggable";
import { kEffectNames } from "@/lib/consts";
import { useState } from "react";
import { DeltaUpdateBlock, GlyphBlock } from "@/lib/glyph_model";

type Props = {
  glyphItem: GlyphBlock;
  // duration: number;
};
export default function TimelineBlockComponent({ glyphItem }: Props) {
  const removeItem = useGlobalAppStore((state) => state.removeItem);
  // const updateItem = useGlobalAppStore((state) => state.updateItem);
  const updateSelectedItem = useGlobalAppStore(
    (state) => state.updateSelectedItem
  );
  const selectItem = useGlobalAppStore((state) => state.toggleSelection);
  const timelinePixelFactor = useGlobalAppStore(
    (state) => state.appSettings.timelinePixelFactor
  );
  const [trimStart, setTrimStart] = useState<boolean>(false);

  function calculateMultiplier(timelinePixelFactor: number): number {
    if (timelinePixelFactor >= 350) {
      return timelinePixelFactor / (0.1 * Math.cbrt(timelinePixelFactor));
    } else if (timelinePixelFactor >= 150) {
      return timelinePixelFactor / (0.5 * Math.sqrt(timelinePixelFactor));
    } else {
      return timelinePixelFactor / 10;
    }
  }

  // Investigate this type, works like mouse event but isn't
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDrag = (e: any) => {
    // CORE movement and update

    // Bound the mouse movement on timelineFactor/scale change
    const multiplier = calculateMultiplier(timelinePixelFactor);
    if (trimStart) {
      // Trim if trim is ON
      // Remember: only send difference
      const deltaBlock: DeltaUpdateBlock = {
        durationMilis: (e.movementX / multiplier) * timelinePixelFactor,
      };
      updateSelectedItem(deltaBlock);
    } else {
      // Drag
      // Remember: only send difference

      const deltaBlock: DeltaUpdateBlock = {
        startTimeMilis: (e.movementX / multiplier) * timelinePixelFactor,
      };
      updateSelectedItem(deltaBlock);
    }

    // console.log(`deltaX: ${e.movementX} `);
  };

  const handleStop = () => {
    if (trimStart) setTrimStart(false);
  };

  const onEffectSelect = (effectId: number) => {
    const deltaBlock: DeltaUpdateBlock = {
      effectId: effectId,
    };
    updateSelectedItem(deltaBlock);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        onContextMenu={() => {
          selectItem(glyphItem);
        }}
      >
        <DraggableCore onDrag={handleDrag} onStop={handleStop}>
          {/* Timeline Block */}
          <div
            title={`Click to select / unselect, right click to delete\nEffect: ${
              kEffectNames[glyphItem.effectId]
            }`}
            onClick={(e) => {
              e.preventDefault();
              // Toggle Selection
              if (glyphItem.isSelected) {
                selectItem(glyphItem, false);
              } else {
                selectItem(glyphItem, true);
              }
            }}
            className=" h-full border-primary relative flex items-center cursor-auto border-red-500 rounded-md"
            style={{
              backgroundColor: `rgb(255 255 255 / ${
                Math.sqrt(glyphItem.startingBrightness) / Math.sqrt(4095)
              })`,
              width: `${
                (glyphItem.durationMilis / 1000) * timelinePixelFactor
              }px`,
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
                className="text-white bg-red-500 absolute right-[-5px] cursor-col-resize select-none p-1 pb-2 rounded-sm"
                // Stop text sel for handle (makeshift) icon |||
              >
                |
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
        {Object.entries(kEffectNames).map((e) => (
          <ContextMenuItem key={e[0]} onClick={() => onEffectSelect(parseInt(e[0]))}>
            {e[1]}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
