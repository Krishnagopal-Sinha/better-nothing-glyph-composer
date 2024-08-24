import { create, useStore } from "zustand";
import dataStore from "./data_store";
import { nanoid } from "nanoid";
import { kAllowedModels } from "./consts";
import { temporal, TemporalState } from "zundo";
import { GlyphBlock, DeltaUpdateBlock, GlyphStore } from "./glyph_model";
import {
  canAddItem2,
  insertInSortedOrder,
  showError,
  sortObjectByStartTimeMilis,
  validateJsonStructure,
} from "./helpers";

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
  importJsonData: (json: string) => void;
  addItem: (glyphId: number, startTimeMilis: number) => void;
  addItemDirectly: (newItem: GlyphBlock) => void;
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
      // App Settings State  ============================================
      appSettings: {
        isZoneVisible: false,
        isKeyboardGestureEnabled: true,
        isMultiSelectActive: false,
        timelinePixelFactor: 160,
      },

      // Setting update functions
      toggleZoneVisibility: () =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            isZoneVisible: !state.appSettings.isZoneVisible,
          },
        })),

      toggleKeyboardGesture: () =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            isKeyboardGestureEnabled:
              !state.appSettings.isKeyboardGestureEnabled,
          },
        })),

      toggleMultiSelect: (toSelect?: boolean) =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            isMultiSelectActive:
              toSelect ?? !state.appSettings.isMultiSelectActive,
          },
        })),

      decreasePixelFactor: () => {
        const oldValue = get().appSettings.timelinePixelFactor;
        const newValue = oldValue / 1.5;
        // console.log(`Dec--: ${oldValue} => ${newValue}`);

        const newSettings: AppSettings = {
          ...get().appSettings,
          timelinePixelFactor: newValue,
        };
        set({ appSettings: newSettings });
      },

      increasePixelFactor: () => {
        const oldValue = get().appSettings.timelinePixelFactor;
        const newValue = oldValue * 1.5;
        // console.log(`Inc++: ${oldValue} => ${newValue}`);
        const newSettings: AppSettings = {
          ...get().appSettings,
          timelinePixelFactor: newValue,
        };
        set({ appSettings: newSettings });
      },

      // Update Duration
      updateDuration: (durationInMilis: number) =>
        set((state) => ({
          audioInformation: { ...state.audioInformation, durationInMilis },
        })),

      // Import feat  ===================================================
      importJsonData: (json: string) => {
        const data = JSON.parse(json);
        if (validateJsonStructure(data)) {
          // Ensure current selected phone model's Glyph data is being loaded
          // Otherwise phone 1 will load up 33 zone cuz it item.length dependent lulz
          if (Object.keys(get().items).length !== Object.keys(data).length) {
            showError(
              "Import Error - Phone Model Mismatch",
              "Are you sure correct Phone model is selected?",
              2500
            );
            return;
          }
          // caution: sort for safety
          const sortedData = sortObjectByStartTimeMilis(data);
          set({ items: sortedData });
        } else {
          showError(
            "Import Error - Glyph data",
            "Format error in Glyph data detected, skipping import.",
            2100
          );
        }
      },

      // CRUD feat ======================================================

      // ADD
      addItemDirectly: (item: GlyphBlock) => {
        const { items, audioInformation } = get();

        const actualAdd = (newItem: GlyphBlock) => {
          // fetch latest state n add
          set((state) => ({
            items: {
              ...state.items,
              [item.glyphId]: insertInSortedOrder(
                state.items[item.glyphId],
                newItem
              ),
            },
          }));
        };

        if (
          canAddItem2(
            item,
            items[item.glyphId],
            audioInformation.durationInMilis
          )
        ) {
          actualAdd(item);
          get().toggleSelection(item);
        } else {
          // console.warn("Cannot add item: overlapping detected!");
          const offsetItem = {
            ...item,
            startTimeMilis: item.startTimeMilis - 200,
          };
          if (
            canAddItem2(
              offsetItem,
              items[item.glyphId],
              audioInformation.durationInMilis
            )
          ) {
            actualAdd(offsetItem);
            get().toggleSelection(offsetItem);
          }
        }
      },

      addItem: (glyphId: number, startTimeMilis: number) => {
        const newItem: GlyphBlock = {
          id: nanoid(),
          glyphId,
          startTimeMilis,
          durationMilis: dataStore.get("newBlockDurationMilis")!,
          startingBrightness: dataStore.get("newBlockBrightness")!,
          isSelected: false,
          effectId: 0,
          effectData: [],
        };

        get().addItemDirectly(newItem);
      },

      // REMOVE
      removeItem: (id: string, glyphId: number) =>
        set((state) => ({
          items: {
            ...state.items,
            [glyphId]: state.items[glyphId].filter((e) => e.id !== id),
          },
        })),

      // UPDATE
      updateItem: (updatedItem: GlyphBlock) => {
        const { items, audioInformation } = get();
        const updatedItemsList = items[updatedItem.glyphId].filter(
          (item) => item.id !== updatedItem.id
        );

        if (
          canAddItem2(
            updatedItem,
            updatedItemsList,
            audioInformation.durationInMilis
          )
        ) {
          const updatedItems = insertInSortedOrder(
            updatedItemsList,
            updatedItem
          );
          set((state) => ({
            items: {
              ...state.items,
              [updatedItem.glyphId]: updatedItems,
            },
          }));
        } else {
          // console.log("Error: Overlap detected...");
        }
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
              // console.log(curr.durationMilis);
              // skip if outside respectable bounds
              if (canAddItem2(curr, updatedItems[i], durationInMilis, j)) {
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
        const { items, audioInformation } = get();
        const updatedItems = { ...items };
        // Dont call add item func, cuz undo would track each add, rather fill entire thing at once, easy for undo and redo
        // TODO: Logic repeated - abstract this and make it neater
        get().selectAll(false);

        for (let i = startGlyphId; i <= endGlyphId; i++) {
          const newItem: GlyphBlock = {
            id: nanoid(),
            glyphId: i,
            startTimeMilis,
            durationMilis: dataStore.get("newBlockDurationMilis")!,
            startingBrightness: dataStore.get("newBlockBrightness")!,
            isSelected: false,
            effectId: 0,
            effectData: [],
          };
          if (
            canAddItem2(newItem, items[i], audioInformation.durationInMilis)
          ) {
            updatedItems[i] = insertInSortedOrder(updatedItems[i], newItem);
          }
        }

        set({ items: updatedItems });
      },

      // SELECT
      toggleSelection: (itemToSelect: GlyphBlock, toSelect: boolean = true) => {
        // TODO: Maintain a single selection int and make if much more efficient in single select mode or something
        const { items, appSettings } = get();
        const updatedItems = { ...items };
        if (!appSettings.isMultiSelectActive) {
          // Unselect other blocks if any

          for (let i = 0; i < Object.keys(updatedItems).length; i++) {
            for (let j = 0; j < updatedItems[i].length; j++) {
              updatedItems[i][j].isSelected = false;
            }
          }
        }
        const itemList = updatedItems[itemToSelect.glyphId];
        const item = itemList.find((e) => e.id === itemToSelect.id);
        if (item) {
          item.isSelected = toSelect;
          set({ items: updatedItems });
        }
      },

      // RESET
      reset: () => {
        const numberOfItemRows =
          {
            NP1: 5,
            NP1_15: 15,
            NP2: 33,
            NP2a: 26,
          }[get().phoneModel] ?? 5;

        // Remember: calling zundo's clear method from here didn't work, so it is being called when device dropdown changes, from that ui
        set({
          items: Array.from({ length: numberOfItemRows }, () => []),
          clipboard: [],
        });
      },

      copyItems: () => {
        const items = get().items;
        const newCopyBuffer: GlyphBlock[] = [];

        for (let i = 0; i < Object.keys(items).length; i++) {
          for (let j = 0; j < items[i].length; j++) {
            const curr = { ...items[i][j] };
            if (curr.isSelected) {
              newCopyBuffer.push(curr);
            }
          }
        }

        set({ clipboard: newCopyBuffer });
        if (newCopyBuffer.length > 500) {
          showError(
            `Copied Items Count - ${newCopyBuffer.length}`,
            "This is allowed but may slow down the app, for real!",
            1500
          );
        } else {
          showError("Items Copied", "Selected items have been copied.");
        }
      },

      cutItems: () => {
        const items = get().items;
        const newCopyBuffer: GlyphBlock[] = [];

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

        showError("Items Cut", "Selected items have been cut.");
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
              id: nanoid(),
              startingBrightness: newBrightness,
              startTimeMilis: currentAudioPositionInMilis,
            };
            get().addItemDirectly(curr);
          } else {
            const curr: GlyphBlock = {
              ...clipboardItems[i],
              id: nanoid(),
              startingBrightness: newBrightness,
              startTimeMilis:
                currentAudioPositionInMilis +
                (clipboardItems[i].startTimeMilis - deltaAnchor),
            };
            get().addItemDirectly(curr);
          }
          // If cut active, reset cut n clipboard state
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
          canAddItem2(
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
            canAddItem2(
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

export default useGlobalAppStore;
