import useGlobalAppStore from '@/lib/timeline_state';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import { useSpring, animated } from '@react-spring/web';
import { kEffectNames, kMaxBrightness } from '@/lib/consts';
import { useContext, useEffect, useRef, useState } from 'react';
import { DeltaUpdateBlock, GlyphBlock } from '@/lib/glyph_model';
import { useDrag } from '@use-gesture/react';
import { SelectionContext } from '@/lib/area_select_context';
import { useSelected } from '@/lib/area_selection_helper';
import dataStore from '@/lib/data_store';
import { throttle } from '@/lib/helpers';

type Props = {
  // prevItem?: GlyphBlock;
  glyphItem: GlyphBlock;
  // nextItem?: GlyphBlock;
};
export default function TimelineBlockComponent({ glyphItem }: Props) {
  const removeItem = useGlobalAppStore((state) => state.removeItem);
  const updateSelectedItem = useGlobalAppStore((state) => state.updateSelectedItem);
  const selectItem = useGlobalAppStore((state) => state.toggleSelection);
  const timelinePixelFactor = useGlobalAppStore((state) => state.appSettings.timelinePixelFactor);

  const [isTrimActive, setIsTrimActive] = useState<boolean>(false);
  const toggleMultiSelect = useGlobalAppStore((state) => state.toggleMultiSelect);
  const onEffectSelect = (effectId: number) => {
    const deltaBlock: DeltaUpdateBlock = {
      effectId: effectId
    };
    updateSelectedItem(deltaBlock);
  };

  const [{ x: x2 }, trimApi] = useSpring(() => ({ x: 0 }));
  // function milisToPixel(milis: number): number {
  //   return (milis / timelinePixelFactor) * 1000;
  // }
  const throttledUpdate = throttle((x: number) => {
    const deltaBlock: DeltaUpdateBlock = {
      startTimeMilis: (x * 1000) / timelinePixelFactor
    };

    updateSelectedItem(deltaBlock);
  }, 5);

  const dragHandler = useDrag(
    ({ delta }) => {
      if (isTrimActive) return;
      throttledUpdate(delta[0]);
    },
    {
      axis: 'x'
    }
  );

  const trimHandler = useDrag(
    ({ down, movement: [mx], last }) => {
      if (!isTrimActive) return;
      trimApi.start({ x: down ? mx : 0, immediate: true });

      if (last) {
        const delta = (mx / timelinePixelFactor) * 1000;

        const deltaBlock: DeltaUpdateBlock = {
          durationMilis: delta + 20
          //20 is offset for trim bar width
        };
        setIsTrimActive(false);
        // console.error((offset / timelinePixelFactor) * 1000);

        updateSelectedItem(deltaBlock);
      }
    },
    { axis: 'x' }
  );

  const ref = useRef(null);
  const selection = useContext(SelectionContext);
  const isSelected = useSelected(ref, selection);
  useEffect(() => {
    if (isSelected) {
      if (glyphItem.isSelected) return;
      const isDragSelectActive: boolean = dataStore.get('isDragSelectActive') ?? false;
      if (!isDragSelectActive) return;
      console.log('sel: ', isSelected);
      toggleMultiSelect(true);
      selectItem(glyphItem, true);
      toggleMultiSelect(false);
    }
  }, [glyphItem, isSelected, selectItem, toggleMultiSelect]);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        onContextMenu={() => {
          selectItem(glyphItem);
        }}
      >
        <div
          ref={ref}
          {...dragHandler()}
          title={`Click to select / unselect, right click to delete\nStart Time: ${(
            glyphItem.startTimeMilis / 1000
          ).toFixed(2)} s\nDuration: ${(glyphItem.durationMilis / 1000).toFixed(2)} s\nEffect: ${
            kEffectNames[glyphItem.effectId] ?? 'Unkown / Imported'
          }\nStarting Brightness: ${((glyphItem.effectData[0] / kMaxBrightness) * 100).toFixed(
            2
          )}%`}
          onClick={(e) => {
            e.preventDefault();
            // Toggle Selection
            if (glyphItem.isSelected) {
              selectItem(glyphItem, false);
            } else {
              selectItem(glyphItem, true);
            }
          }}
          className={`h-full border-primary relative flex items-center cursor-auto rounded-md bg-white text-black ${
            glyphItem.isSelected ? 'outline outline-red-600 outline-[3px]' : ''
          } hover:shadow-[0px_0px_10px_1px_#ffffff] duration-200`}
          style={{
            width: `${(glyphItem.durationMilis / 1000) * timelinePixelFactor}px`,
            touchAction: 'none'
            // outline: `${
            //   glyphItem.isSelected ? "dashed 3px red" : "solid 2px white"
            // }`,
          }}
        >
          {/* Trim handler */}
          {glyphItem.isSelected && (
            <animated.div
              {...trimHandler()}
              onMouseDown={() => setIsTrimActive(true)}
              className={`text-white bg-[red] absolute right-[-5px] cursor-col-resize select-none rounded-sm ${
                isTrimActive
                  ? 'h-screen w-[2px] p-0 absolute  bg-[red] z-10 right-0'
                  : ' p-1 pb-[8px]'
              }`}
              style={{ x: x2, touchAction: 'none' }}
              // Stop text sel for handle (makeshift) icon |
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
          Delete``
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
