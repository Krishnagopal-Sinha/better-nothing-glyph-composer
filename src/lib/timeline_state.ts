import { create, useStore } from "zustand";
import dataStore from "./data_store";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { kAllowedModels } from "./consts";
import { temporal, TemporalState } from "zundo";
import { GlyphBlock, DeltaUpdateBlock } from "./glyph_model";

type GlyphStore = { [key: number]: GlyphBlock[] };
type AppSettings = {
  isZoneVisible: boolean;
  isKeyboardGestureEnabled: boolean;
  isMultiSelectActive: boolean;
  timelinePixelFactor: number;
};
export type GlyphEditorState = {
  items: GlyphStore;
  clipboard: GlyphBlock[];
  isCutActive: boolean;
  audioInformation: { durationInMilis: number; title: string };
  phoneModel: string;
  // Settings
  appSettings: AppSettings;
};
// Partial state to track only glyph items
export type PartializedStoreState = Pick<GlyphEditorState, "items">;

export type Action = {
  addItem: (glyphId: number, startTimeMilis: number) => void;
  addGlyphItemDirectly: (glyphBlock: GlyphBlock) => void;
  removeItem: (id: string, glyphId: number) => void;
  updateItem: (updatedItem: GlyphBlock) => void;
  updateSelectedItem: (deltaBlockTemplate: DeltaUpdateBlock) => void;
  toggleSelection: (itemToSelect: GlyphBlock, toSelect?: boolean) => void;
  reset: () => void;
  updateDuration: (durationInMilis: number) => void;
  copyItems: () => void;
  cutItems: () => void;
  pasteItems: () => void;
  removeSelectedItem: () => void;
  selectAll: (toSelect?: boolean) => void;
  changePhoneModel: (phoneType: string) => void;
  fillEntireZone: (
    startGlyphId: number,
    endGlyphId: number,
    startTimeMilis: number
  ) => void;

  // Settings
  toggleKeyboardGesture: () => void;
  toggleMultiSelect: (toSelect?: boolean) => void;
  toggleZoneVisibility: () => void;
  increasePixelFactor: () => void;
  decreasePixelFactor: () => void;
};

export const useGlobalAppStore = create<GlyphEditorState & Action>()(
  temporal(
    (set, get) => ({
      // States
      phoneModel: "NP1",
      items: {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
      },
      clipboard: [],
      isCutActive: false,
      audioInformation: { durationInMilis: 0, title: "" },
      // App Settings State
      appSettings: {
        isZoneVisible: false,
        isKeyboardGestureEnabled: true,
        isMultiSelectActive: false,
        timelinePixelFactor: 160,
      },

      // Setting update functions
      toggleZoneVisibility: () => {
        const oldValue = get().appSettings.isZoneVisible;
        const newSettings: AppSettings = {
          ...get().appSettings,
          isZoneVisible: !oldValue,
        };
        set({ appSettings: newSettings });
      },
      toggleKeyboardGesture: () => {
        const oldValue = get().appSettings.isKeyboardGestureEnabled;
        const newSettings: AppSettings = {
          ...get().appSettings,
          isKeyboardGestureEnabled: !oldValue,
        };
        set({ appSettings: newSettings });
      },
      toggleMultiSelect: (toSelect?: boolean) => {
        const oldValue = get().appSettings.isMultiSelectActive;
        let newSettings: AppSettings;
        if (toSelect) {
          //for force selecting when shift is pressed
          newSettings = {
            ...get().appSettings,
            isMultiSelectActive: true,
          };
        } else {
          newSettings = {
            ...get().appSettings,
            isMultiSelectActive: !oldValue,
          };
        }
        set({ appSettings: newSettings });
      },
      decreasePixelFactor: () => {
        const oldValue = get().appSettings.timelinePixelFactor;
        const newValue = oldValue / 1.5;
        console.log(`Dec--: ${oldValue} => ${newValue}`);

        const newSettings: AppSettings = {
          ...get().appSettings,
          timelinePixelFactor: newValue,
        };
        set({ appSettings: newSettings });
      },
      increasePixelFactor: () => {
        const oldValue = get().appSettings.timelinePixelFactor;
        const newValue = oldValue * 1.5;
        console.log(`Inc++: ${oldValue} => ${newValue}`);
        const newSettings: AppSettings = {
          ...get().appSettings,
          timelinePixelFactor: newValue,
        };
        set({ appSettings: newSettings });
      },

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
          startingBrightness: dataStore.get("newBlockBrightness")!,
          isSelected: false,
          effectId: 0,
          effectData: [],
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

      // Only send difference of time values !
      updateSelectedItem: (deltaBlock: DeltaUpdateBlock) => {
        const items = get().items;
        const updatedItems = {
          ...items,
        };
        const durationInMilis = get().audioInformation.durationInMilis;

        // find selections
        for (let i = 0; i < Object.keys(updatedItems).length; i++) {
          for (let j = 0; j < updatedItems[i].length; j++) {
            let curr: GlyphBlock = { ...updatedItems[i][j] };
            if (curr.isSelected) {
              curr = {
                ...curr,
                startTimeMilis:
                  curr.startTimeMilis + (deltaBlock.startTimeMilis ?? 0),
                durationMilis:
                  curr.durationMilis + (deltaBlock.durationMilis ?? 0),
                effectId: deltaBlock.effectId ?? curr.effectId ?? 0,
                startingBrightness:
                  deltaBlock.startingBrightness ??
                  curr.startingBrightness ??
                  4095,
              };
              // skip if outside respectable bounds
              if (canAddItem(curr, updatedItems[i], durationInMilis, j)) {
                updatedItems[i][j] = curr;
              }
            }
          }
        }
        // updatee
        set({ items: updatedItems });
      },
      // Add - Fill all
      fillEntireZone: (
        startGlyphId: number,
        endGlyphId: number,
        startTimeMilis: number
      ) => {
        // Dont call add item func, cuz undo would track each add, rather fill entire thing at once, easy for undo and redo
        // TODO: Logic repeated - abstract this and make it neater
        const items = get().items;
        // deselect all
        get().selectAll(false);

        const updatedItems = { ...items };
        const durationInMilis = get().audioInformation.durationInMilis;

        for (let i = startGlyphId; i <= endGlyphId; i++) {
          const newItem: GlyphBlock = {
            id: nanoid(),
            glyphId: i,
            startTimeMilis: startTimeMilis,
            durationMilis: dataStore.get("newBlockDurationMilis")!,
            startingBrightness: dataStore.get("newBlockBrightness")!,
            isSelected: false,
            effectId: 0,
            effectData: [],
          };
          if (canAddItem(newItem, items[i], durationInMilis)) {
            updatedItems[i] = [...updatedItems[i], newItem];
          }
          //  else {
          // Can add item would dispatch it's error can skip here
          // console.warn("Error, skipped adding a block, overwrite detected!");
          // }
        }

        set({ items: updatedItems });
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
          const isMutliSelectActive = get().appSettings.isMultiSelectActive;
          if (!isMutliSelectActive) {
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
      reset: () => {
        const currentPhoneModel = get().phoneModel;
        const newItems: GlyphStore = {};
        // Get number of editor rows
        let numberOfItemRows: number;
        switch (currentPhoneModel) {
          case "NP1":
            numberOfItemRows = 5;
            break;
          case "NP1_15":
            numberOfItemRows = 15;
            break;
          case "NP2_33":
            numberOfItemRows = 33;
            break;
          case "NP2a":
            numberOfItemRows = 26;
            break;

          default:
            numberOfItemRows = 5;
        }
        // create empty items array
        for (let i = 0; i < numberOfItemRows; i++) {
          newItems[i] = [];
        }

        // clear undo n stuff - does not work, hekk, trigger from device dropdown change
        set({
          items: newItems,
          clipboard: [],
          //  dont set audio info to null cuz same audio device switch is allowed,
        });
      },

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
          duration: 500,
        });
      },

      cutItems: () => {
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

        get().removeSelectedItem();
        set({ clipboard: newCopyBuffer, isCutActive: true });

        toast("Items Cut", {
          description: "Selected items have been cut.",
          action: {
            label: "Ok",
            onClick: () => {},
          },
          duration: 500,
        });
      },

      pasteItems: () => {
        const clipboardItems = get().clipboard;
        const currentAudioPositionInMilis: number =
          dataStore.get("currentAudioPositionInMilis") ?? 0;

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
          // feat. brightness - also ensure brightness is there
          const newBrightness: number =
            dataStore.get("overwriteBrightnessWithNewBlock") ?? false
              ? dataStore.get("newBlockBrightness") ??
                clipboardItems[i].startingBrightness
              : clipboardItems[i].startingBrightness;

          // actual paste logic
          if (i === lowestIdx) {
            const curr: GlyphBlock = {
              ...clipboardItems[i],
              startingBrightness: newBrightness,
              startTimeMilis: currentAudioPositionInMilis,
            };
            get().addGlyphItemDirectly(curr);
          } else {
            const curr: GlyphBlock = {
              ...clipboardItems[i],
              startingBrightness: newBrightness,

              startTimeMilis:
                currentAudioPositionInMilis +
                (clipboardItems[i].startTimeMilis - deltaAnchor),
            };
            get().addGlyphItemDirectly(curr);
          }

          const isCutActive = get().isCutActive;
          if (isCutActive) {
            //reset clipboard n cut status so no more that paste possible
            set({ clipboard: [], isCutActive: false });
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

      selectAll: (toSelect: boolean = true) => {
        const items = get().items;
        const selectedItems = { ...items };
        for (let i = 0; i < Object.keys(selectedItems).length; i++) {
          for (let j = 0; j < selectedItems[i].length; j++) {
            selectedItems[i][j].isSelected = toSelect;
          }
        }

        set({ items: selectedItems });
      },

      changePhoneModel: (phoneType: string) => {
        // extra check, for safety.
        const validPhoneType = kAllowedModels.find((e) => e === phoneType);
        if (!validPhoneType) {
          console.error("Error Phone Model - Wrong option detected!");
          return;
        }
        set({ phoneModel: phoneType });
        // Main change model logic get into effect via reset!
        get().reset();
      },
    }),
    // only track items, rest are needless and config states may actually cause issues - eg. audio duration n all
    {
      partialize: (state) => {
        const { items } = state;
        return { items };
      },
    }
  )
);

export const useTemporalStore = <T>(
  // Use partalized StoreState type as the generic here
  selector: (state: TemporalState<PartializedStoreState>) => T,
  equality?: (a: T, b: T) => boolean
) => useStore(useGlobalAppStore.temporal, selector, equality);

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
      toast.error("Error - A Block was not added or modified", {
        description: "Overlap with another existing Glyph block detected",
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

export default useGlobalAppStore;
