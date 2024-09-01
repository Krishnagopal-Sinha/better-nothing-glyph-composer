import useGlobalAppStore from "@/lib/timeline_state";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useSpring, animated } from "@react-spring/web";
import { kEffectNames, kMaxBrightness } from "@/lib/consts";
import { useState } from "react";
import { DeltaUpdateBlock, GlyphBlock } from "@/lib/glyph_model";
import { useDrag } from "@use-gesture/react";
import dataStore from "@/lib/data_store";

type Props = {
  // prevItem?: GlyphBlock;
  glyphItem: GlyphBlock;
  // nextItem?: GlyphBlock;
};
export default function HeavyTimelineBlock({ glyphItem }: Props) {
  const removeItem = useGlobalAppStore((state) => state.removeItem);
  const updateSelectedItem = useGlobalAppStore(
    (state) => state.updateSelectedItem
  );
  const selectItem = useGlobalAppStore((state) => state.toggleSelection);
  const timelinePixelFactor = useGlobalAppStore(
    (state) => state.appSettings.timelinePixelFactor
  );
  const [isTrimActive, setIsTrimActive] = useState<boolean>(false);

  const onEffectSelect = (effectId: number) => {
    const deltaBlock: DeltaUpdateBlock = {
      effectId: effectId,
    };
    updateSelectedItem(deltaBlock);
  };

  const [{ x: x2 }, trimApi] = useSpring(() => ({ x: 0 }));
  // function milisToPixel(milis: number): number {
  //   return (milis / timelinePixelFactor) * 1000;
  // }

  const throttledUpdate = throttle((x: number) => {
    const scrollValue: number = dataStore.get("editorScrollX") ?? 0;

    const updateValue = ((x + scrollValue) * 1000) / timelinePixelFactor;
    const delta = updateValue - glyphItem.startTimeMilis;
    // console.log("updateStartTime: ", updateValue, delta, updateValue - delta);
    const rightTrend = delta > 0 ? true : false;
    const deltaBlock: DeltaUpdateBlock = {
      startTimeMilis: rightTrend ? delta / 10 : delta,
    };

    updateSelectedItem(deltaBlock);
  }, 25);

  const dragHandler = useDrag(
    ({ xy }) => {
      if (isTrimActive) return;
      throttledUpdate(xy[0]);
    },
    {
      axis: "x",
    }
  );

  const trimHandler = useDrag(
    ({ down, movement: [mx], last }) => {
      if (!isTrimActive) return;
      trimApi.start({ x: down ? mx : 0, immediate: true });

      if (last) {
        const delta = (mx / timelinePixelFactor) * 1000;

        const deltaBlock: DeltaUpdateBlock = {
          durationMilis: delta + 20,
          //20 is offset for trim bar width
        };
        setIsTrimActive(false);
        // console.error((offset / timelinePixelFactor) * 1000);

        updateSelectedItem(deltaBlock);
      }
    },
    { axis: "x" }
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger
        onContextMenu={() => {
          selectItem(glyphItem);
        }}
      >
        <div
          {...dragHandler()}
          title={`Click to select / unselect, right click to delete\nStart Time: ${(
            glyphItem.startTimeMilis / 1000
          ).toFixed(2)} s\nDuration: ${(glyphItem.durationMilis / 1000).toFixed(
            2
          )} s\nEffect: ${
            kEffectNames[glyphItem.effectId] ?? "Unkown / Imported"
          }\nStarting Brightness: ${(
            (glyphItem.startingBrightness / kMaxBrightness) *
            100
          ).toFixed(2)}%`}
          onClick={(e) => {
            e.preventDefault();
            // Toggle Selection
            if (glyphItem.isSelected) {
              selectItem(glyphItem, false);
            } else {
              selectItem(glyphItem, true);
            }
          }}
          className={`h-full border-primary relative flex items-center  cursor-auto border-red-500 rounded-md bg-slate-900 text-black ${
            glyphItem.isSelected ? "outline outline-red-500 outline-[3px]" : ""
          }`}
          style={{
            width: `${
              (glyphItem.durationMilis / 1000) * timelinePixelFactor
            }px`,
            touchAction: "none",
            // outline: `${
            //   glyphItem.isSelected ? "dashed 3px red" : "solid 2px white"
            // }`,
          }}
        >
          <div className="h-full w-full grid grid-flow-col items-end ">
            {glyphItem.effectData.map((e, i) => (
              <div
                key={i}
                className={`bg-red-50/90 h-full w-full rounded-t-full`}
                style={{ height: `${(e / kMaxBrightness) * 100}%` }}
              ></div>
            ))}
          </div>
          {/* Trim handler */}
          {glyphItem.isSelected && (
            <animated.div
              {...trimHandler()}
              onMouseDown={() => setIsTrimActive(true)}
              className={`text-white bg-red-500 absolute right-[-5px] cursor-col-resize select-none rounded-sm ${
                isTrimActive
                  ? "h-screen w-[3px] p-0 absolute  bg-red-600 z-10 right-0"
                  : " p-1 pb-[8px]"
              }`}
              style={{ x: x2, touchAction: "none" }}
              // Stop text sel for handle (makeshift) icon |||
            >
              |
            </animated.div>
          )}
        </div>
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
          <ContextMenuItem key={e[0]} onClick={() => onEffectSelect(+e[0])}>
            {e[1]}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// eslint-disable-next-line react-refresh/only-export-components, @typescript-eslint/no-explicit-any
function throttle(func: (...args: any[]) => void, limit: number) {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (...args: any[]) {
    if (!lastRan) {
      // Delay the first call instead of calling it immediately
      lastRan = Date.now();
      lastFunc = setTimeout(() => {
        func(...args);
        lastRan = Date.now();
      }, limit);
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan! >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}
