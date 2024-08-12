import { create } from "zustand";
import { GlyphBlock } from "./glyph_model";

export type State = {
  items: { [key: number]: GlyphBlock[] };
  audioInformation: { durationInMilis: number; title: string };
};

type Action = {
  addItem: (newItem: GlyphBlock) => void;
  removeItem: (id: string, glyphId: number) => void;
  updateItem: (updatedItem: GlyphBlock) => void;
  selectItem: (itemToSelect: GlyphBlock, toSelect?: boolean) => void;
  reset: () => void;
  updateDuration: (durationInMilis: number) => void;
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
    return false;
  }

  // Check if item if out of bounds
  if (
    newItem.startTimeMilis < audioDurationInMilis &&
    newItem.startTimeMilis + newItem.durationMilis <= audioDurationInMilis
  ) {
    // empty
  } else {
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
      console.error(`
  NewItem Start: ${newItem.startTimeMilis} | Dur: ${newItem.durationMilis}\n
  OldItem Start: ${currentItem.startTimeMilis} | Dur: ${
        currentItem.durationMilis
      }\n
  cond1: ${
    newItem.startTimeMilis <
    currentItem.startTimeMilis + currentItem.durationMilis
  }\n
  cond2: ${
    newItem.startTimeMilis + newItem.durationMilis > currentItem.startTimeMilis
  }
  `);
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
  audioInformation: { durationInMilis: 0, title: "" },
  // Update Duration
  updateDuration: (durationInMilis: number) => {
    const audioInformation = get().audioInformation;

    const newInfo = { ...audioInformation, durationInMilis };

    set({ audioInformation: newInfo });
  },

  // ADD
  addItem: (givenNewItem: GlyphBlock) => {
    const items = get().items;
    const audioInformation = get().audioInformation;

    // Adding 200 offset so that added block on center
    // TODO: Make this into a config
    const newItem: GlyphBlock = {
      ...givenNewItem,
      startTimeMilis: givenNewItem.startTimeMilis,
    };

    function addItemFinal(itemToAdd: GlyphBlock) {
      const updatedItems = {
        ...items,
        [newItem.glyphId]: [...items[newItem.glyphId], itemToAdd],
      };
      console.log(`item id: ${itemToAdd.glyphId}`);
      console.log(updatedItems);
      set({ items: updatedItems });
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
        ...givenNewItem,
        startTimeMilis: givenNewItem.startTimeMilis - 200,
      };
      if (
        canAddItem(
          newItem2,
          items[newItem.glyphId],
          audioInformation.durationInMilis
        )
      ) {
        addItemFinal(newItem2);
      }
      console.warn("Cannot add item: overlapping detected!");
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
      console.log(`Did not update, updateIdx${updatedItemIdx} | `);
      return;
    }

    console.log(
      `Updated start time: ${updatedItem.startTimeMilis} | dur: ${updatedItem.durationMilis}`
    );
  },

  // SELECT
  selectItem: (itemToSelect: GlyphBlock, toSelect: boolean = true) => {
    const items = get().items;

    const itemIdx = items[itemToSelect.glyphId].findIndex(
      (e) => e.id === itemToSelect.id
    );
    //cuz -1 if not found
    if (itemIdx !== -1) {
      if (toSelect) {
        // Unselect other blocks if any
        // TODO: Maintain a single selection int and make if much more efficient
        for (let i = 0; i < Object.keys(items).length; i++) {
          for (let j = 0; j < items[i].length; j++) {
            items[i][j].isSelected = false;
          }
        }
        items[itemToSelect.glyphId][itemIdx].isSelected = true;
      } else {
        items[itemToSelect.glyphId][itemIdx].isSelected = false;
      }
      const updatedItems = {
        ...items,
      };
      console.log(`Item was selected!`);
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
}));

export default useTimelineStore;
