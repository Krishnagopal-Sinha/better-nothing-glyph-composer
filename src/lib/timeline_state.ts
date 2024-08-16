import { create } from "zustand";
import { GlyphBlock } from "../logic/glyph_model";
import dataStore from "./data_store";
import { nanoid } from "nanoid";
import { toast } from "sonner";

type GlyphStore = { [key: number]: GlyphBlock[] };
export type State = {
  items: GlyphStore;
  clipboard: GlyphBlock[];
  audioInformation: { durationInMilis: number; title: string };
};

type Action = {
  addItem: (glyphId: number, startTimeMilis: number) => void;
  addGlyphItemDirectly: (glyphBlock: GlyphBlock) => void;
  removeItem: (id: string, glyphId: number) => void;
  updateItem: (updatedItem: GlyphBlock) => void;
  toggleSelection: (itemToSelect: GlyphBlock, toSelect?: boolean) => void;
  reset: () => void;
  updateDuration: (durationInMilis: number) => void;
  copyItems: () => void;
  pasteItems: (currentAudioPositionInMilis: number) => void;
  removeSelectedItem: () => void;
};

// TODO: Can be optimised, check only the neighbours not entire thing!
function canAddItem(
  newItem: GlyphBlock,
  existingItems: GlyphBlock[],
  audioDurationInMilis: number,
  skipIndex: number = -1
): boolean {
  // Basic check
  if (newItem.durationMilis > 0 && newItem.startTimeMilis >= 0) {
    /* empty */
  } else {
    toast.error("Error - Item not added", {
      description: "Invalid start time or duration.",
      action: {
        label: "Ok",
        onClick: () => {},
      },
    });
    return false;
  }

  // Check if item if out of bounds
  if (
    newItem.startTimeMilis < audioDurationInMilis &&
    newItem.startTimeMilis + newItem.durationMilis <= audioDurationInMilis
  ) {
    // empty
  } else {
    toast.error("Error - Item not added or modified", {
      description:
        "Glyph timings must be within audio's time bounds.\nYes, the UI might say otherwise but the audio has reached it's end",
      action: {
        label: "Ok",
        onClick: () => {},
      },
    });
    return false;
  }

  for (let i = 0; i < existingItems.length; i++) {
    const currentItem = existingItems[i];
    if (skipIndex >= 0 && skipIndex == i) continue; //skip this iter
    //^ for update check

    if (
      newItem.startTimeMilis <
        currentItem.startTimeMilis + currentItem.durationMilis &&
      newItem.startTimeMilis + newItem.durationMilis >
        currentItem.startTimeMilis
    ) {
      //     console.error(`
      // NewItem Start: ${newItem.startTimeMilis} | Dur: ${newItem.durationMilis}\n
      // OldItem Start: ${currentItem.startTimeMilis} | Dur: ${
      //       currentItem.durationMilis
      //     }\n
      // cond1: ${
      //   newItem.startTimeMilis <
      //   currentItem.startTimeMilis + currentItem.durationMilis
      // }\n
      // cond2: ${
      //   newItem.startTimeMilis + newItem.durationMilis > currentItem.startTimeMilis
      // }
      // `);
      toast.error("Error - Item not added or modified", {
        description: "Overlap with another existing Glyph detected.",
        action: {
          label: "Ok",
          onClick: () => {},
        },
      });
      return false;
    }
  }

  return true;
}

export const useTimelineStore = create<State & Action>((set, get) => ({
  items: {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
  },
  clipboard: [],
  audioInformation: { durationInMilis: 0, title: "" },
  // Update Duration
  updateDuration: (durationInMilis: number) => {
    const audioInformation = get().audioInformation;

    const newInfo = { ...audioInformation, durationInMilis };

    set({ audioInformation: newInfo });
  },

  // ADD
  addItem: (glyphId: number, startTimeMilis: number) => {
    const items = get().items;
    const audioInformation = get().audioInformation;

    const newItem: GlyphBlock = {
      id: nanoid(),
      glyphId: glyphId,
      startTimeMilis: startTimeMilis,
      durationMilis: dataStore.get("newBlockDurationMilis")!,
      brightness: dataStore.get("newBlockBrightness")!,
      isSelected: false,
    };

    function addItemFinal(itemToAdd: GlyphBlock) {
      const updatedItems = {
        ...items,
        [newItem.glyphId]: [...items[newItem.glyphId], itemToAdd],
      };
      // console.log(`item id: ${itemToAdd.glyphId}`);
      // console.log(updatedItems);
      set({ items: updatedItems });
      // Select newly added item
      get().toggleSelection(itemToAdd);
    }

    if (
      canAddItem(
        newItem,
        items[newItem.glyphId],
        audioInformation.durationInMilis
      )
    ) {
      addItemFinal(newItem);
    } else {
      //retry with some offset!
      const newItem2: GlyphBlock = {
        ...newItem,
        startTimeMilis: newItem.startTimeMilis - 200,
      };
      if (
        canAddItem(
          newItem2,
          items[newItem.glyphId],
          audioInformation.durationInMilis
        )
      ) {
        addItemFinal(newItem2);
      } else {
        console.warn("Cannot add item: overlapping detected-!");
      }
    }
  },

  // REMOVE
  removeItem: (id: string, glyphId: number) => {
    const items = get().items;
    const updatedItems = {
      ...items,
      [glyphId]: items[glyphId].filter((e) => e.id !== id),
    };
    set({ items: updatedItems });
  },

  // UPDATE
  updateItem: (updatedItem: GlyphBlock) => {
    //Check for illelgal values, tend to happen cuz mouse movement based
    if (updatedItem.durationMilis < 100 || updatedItem.startTimeMilis < 0)
      return;
    const items = get().items;
    const audioInformation = get().audioInformation;

    let updatedItemIdx = -1;

    const updatedItems = {
      ...items,
      [updatedItem.glyphId]: items[updatedItem.glyphId].map((item, idx) => {
        if (item.id === updatedItem.id) {
          updatedItemIdx = idx;
          return updatedItem;
        }
        return item;
      }),
    };

    if (
      updatedItemIdx >= 0 &&
      canAddItem(
        updatedItem,
        items[updatedItem.glyphId],
        audioInformation.durationInMilis,
        updatedItemIdx
      )
    ) {
      set({ items: updatedItems });
    } else {
      console.log(`Did not update, updateIdx${updatedItemIdx} (error)`);
      return;
    }

    // console.log(
    //   `Updated start time: ${updatedItem.startTimeMilis} | dur: ${updatedItem.durationMilis}`
    // );
  },

  // SELECT
  toggleSelection: (itemToSelect: GlyphBlock, toSelect: boolean = true) => {
    // TODO: Maintain a single selection int and make if much more efficient in single select mode or something
    const items = get().items;
    const updatedItems = {
      ...items,
    };
    const itemIdx = updatedItems[itemToSelect.glyphId].findIndex(
      (e) => e.id === itemToSelect.id
    );
    //cuz -1 if not found
    if (itemIdx !== -1) {
      if (!dataStore.get("multiSelect")) {
        // Unselect other blocks if any
        for (let i = 0; i < Object.keys(updatedItems).length; i++) {
          for (let j = 0; j < updatedItems[i].length; j++) {
            updatedItems[i][j].isSelected = false;
          }
        }
      }
      if (toSelect) {
        updatedItems[itemToSelect.glyphId][itemIdx].isSelected = true;
        // console.log(`Item was selected!`);
      } else {
        updatedItems[itemToSelect.glyphId][itemIdx].isSelected = false;
        // console.log(`Item was UNselected!`);
      }

      set({ items: updatedItems });
    } else {
      console.error(`Item for selection not found!${itemIdx}`);
    }
  },

  // RESET
  reset: () =>
    set({
      items: {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
      },
    }),

  copyItems: () => {
    const items = get().items;
    const newCopyBuffer: GlyphBlock[] = [];
    set({ clipboard: [] });

    for (let i = 0; i < Object.keys(items).length; i++) {
      for (let j = 0; j < items[i].length; j++) {
        const curr = { ...items[i][j] };
        if (curr.isSelected) {
          newCopyBuffer.push(curr);
        }
      }
    }

    set({ clipboard: newCopyBuffer });

    toast("Items Copied", {
      description: "Selected items have been copied.",
      action: {
        label: "Ok",
        onClick: () => {},
      },
    });
  },

  pasteItems: (currentAudioPositionInMilis: number) => {
    const clipboardItems = get().clipboard;

    // get glyph item with lowest start time
    let lowest = 999999999;
    let lowestIdx = -1;
    for (let i = 0; i < clipboardItems.length; i++) {
      if (clipboardItems[i].startTimeMilis < lowest) {
        lowest = clipboardItems[i].startTimeMilis;
        lowestIdx = i;
      }
    }

    // first blocks start time - block with earliest start time
    const deltaAnchor = lowest;

    for (let i = 0; i < clipboardItems.length; i++) {
      // first block's start time would be current audio position
      if (i === lowestIdx) {
        const curr: GlyphBlock = {
          ...clipboardItems[i],
          startTimeMilis: currentAudioPositionInMilis,
        };
        get().addGlyphItemDirectly(curr);
      } else {
        const curr: GlyphBlock = {
          ...clipboardItems[i],
          startTimeMilis:
            currentAudioPositionInMilis +
            (clipboardItems[i].startTimeMilis - deltaAnchor),
        };
        get().addGlyphItemDirectly(curr);
      }
    }
  },

  // ADD
  addGlyphItemDirectly: (glyphItem: GlyphBlock) => {
    const items = get().items;
    const audioInformation = get().audioInformation;
    const newItem = { ...glyphItem, id: nanoid() };
    // console.log(
    //   `func reached | startTime: ${glyphItem.startTimeMilis} | dur: ${glyphItem.durationMilis}`
    // );

    function addItemFinal(itemToAdd: GlyphBlock) {
      const updatedItems = {
        ...items,
        [newItem.glyphId]: [...items[newItem.glyphId], itemToAdd],
      };

      // console.log(
      //   `added! item id: ${itemToAdd.glyphId} || start: ${itemToAdd.startTimeMilis}`
      // );
      set({ items: updatedItems });

      // Select newly added item
      get().toggleSelection(itemToAdd);
    }

    if (
      canAddItem(
        newItem,
        items[newItem.glyphId],
        audioInformation.durationInMilis
      )
    ) {
      addItemFinal(newItem);
    } else {
      //retry with some offset!

      const newItem2: GlyphBlock = {
        ...newItem,
        startTimeMilis: newItem.startTimeMilis - 200,
      };
      if (
        canAddItem(
          newItem2,
          items[newItem.glyphId],
          audioInformation.durationInMilis
        )
      ) {
        addItemFinal(newItem2);
      } else {
        // console.warn(
        //   `Cannot add item: overlapping detected! ${newItem2.startTimeMilis} | ${newItem2.durationMilis}`
        // );
      }
    }
  },

  // REMOVE
  removeSelectedItem: () => {
    const items = get().items;
    let updatedItems = { ...items };

    function actualRemove(id2: string, glyphId2: number): void {
      updatedItems = {
        ...updatedItems,
        [glyphId2]: updatedItems[glyphId2].filter((e) => e.id !== id2),
      };
    }

    for (let i = 0; i < Object.keys(items).length; i++) {
      for (let j = 0; j < items[i].length; j++) {
        // console.log(`aaa | ${items[i][j].isSelected}`);
        const curr = items[i][j];
        if (curr.isSelected) {
          actualRemove(curr.id, curr.glyphId);
        }
      }
    }

    // set the updated data with removals
    set({ items: updatedItems });
  },
}));

export default useTimelineStore;
