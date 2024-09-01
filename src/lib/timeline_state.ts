import { create, useStore } from "zustand";
import dataStore from "./data_store";
import { nanoid } from "nanoid";
import {
  kAllowedModels,
  kMaxBrightness,
  kPhoneZones,
  kTimeStepMilis,
} from "./consts";
import { temporal, TemporalState } from "zundo";
import {
  GlyphBlock,
  DeltaUpdateBlock,
  GlyphStore,
  GlyphGenerationModel,
} from "./glyph_model";
import {
  basicCanAddCheck,
  calculateBeatDurationInMilis,
  canAddItem2,
  generateNewGlyphBlock,
  insertInSortedOrder,
  removeAudioBoundsViolators,
  showError,
  snapToNearestBeat,
  sortObjectByStartTimeMilis,
  validateJsonStructure,
} from "./helpers";
import { generateEffectData } from "@/logic/export_logic";

type AppSettings = {
  isZoneVisible: boolean;
  isKeyboardGestureEnabled: boolean;
  isMultiSelectActive: boolean;
  // Used for Seconds to Pixel! Not milis, remember!
  timelinePixelFactor: number;
  isSettingsDialogOpen: boolean;
  settingDialogContentIndex: number;
  showAudioTimeStamp: boolean;
  snapToBpmActive: boolean;
  alsoSnapDuration: boolean;
  bpmValue: number;
  snapSensitivity: number;
  showHeavyUi: boolean;
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
  updateSelectedItem: (deltaBlockTemplate: DeltaUpdateBlock) => void;
  updateSelectedItemAbsolutely: (glyphBlockTemplate: DeltaUpdateBlock) => void;
  toggleSelection: (itemToSelect: GlyphBlock, toSelect?: boolean) => void;
  reset: () => void;
  updateAudioDuration: (durationInMilis: number) => void;
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
  generateGlyphs: (glyphGenerateData: GlyphGenerationModel) => void;

  // Settings
  toggleKeyboardGesture: (value?: boolean) => void;
  toggleMultiSelect: (toSelect?: boolean) => void;
  toggleZoneVisibility: () => void;
  increasePixelFactor: () => void;
  decreasePixelFactor: () => void;
  setIsSettingsDialogOpen: (value: boolean) => void;
  setSettingsDialogContentIndex: (value: number) => void;
  toggleShowAudioTimeStamp: () => void;
  toggleSnapToBpm: () => void;
  toggleAlsoSnapBlockDuration: () => void;
  setBpmForSnap: (value: number) => void;
  setSnapSensitivity: (value: number) => void;
  toggleShowShowHeavyUi: () => void;
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
        isSettingsDialogOpen: false,
        settingDialogContentIndex: 0,
        showAudioTimeStamp: false,
        bpmValue: 60,
        snapToBpmActive: false,
        alsoSnapDuration: false,
        snapSensitivity: 15,
        showHeavyUi: false,
      },

      // Setting update functions
      toggleZoneVisibility: () =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            isZoneVisible: !state.appSettings.isZoneVisible,
          },
        })),

      toggleShowAudioTimeStamp: () =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            showAudioTimeStamp: !state.appSettings.showAudioTimeStamp,
          },
        })),

      toggleShowShowHeavyUi: () =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            showHeavyUi: !state.appSettings.showHeavyUi,
          },
        })),

      setIsSettingsDialogOpen: (value: boolean) => {
        // disable keyboard gesture when dialog is open
        set({
          appSettings: {
            ...get().appSettings,
            isSettingsDialogOpen: value,
            isKeyboardGestureEnabled: !value,
          },
        });
      },

      setSettingsDialogContentIndex: (value: number) => {
        set({
          appSettings: {
            ...get().appSettings,
            settingDialogContentIndex: value,
          },
        });
      },

      toggleKeyboardGesture: (value?: boolean) => {
        if (value) {
          set((state) => ({
            appSettings: {
              ...state.appSettings,
              isKeyboardGestureEnabled: value,
            },
          }));
        } else {
          set((state) => ({
            appSettings: {
              ...state.appSettings,
              isKeyboardGestureEnabled:
                !state.appSettings.isKeyboardGestureEnabled,
            },
          }));
        }
      },

      toggleMultiSelect: (toSelect?: boolean) =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            isMultiSelectActive:
              toSelect ?? !state.appSettings.isMultiSelectActive,
          },
        })),

      toggleSnapToBpm: () =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            snapToBpmActive: !state.appSettings.snapToBpmActive,
          },
        })),

      toggleAlsoSnapBlockDuration: () =>
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            alsoSnapDuration: !state.appSettings.alsoSnapDuration,
          },
        })),

      setBpmForSnap: (value: number) => {
        if (value < 1 || value > 700) {
          showError("Invalid Value - BPM", "BPM must be between 1 and 700.");
          return;
        }
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            bpmValue: value,
          },
        }));
      },

      setSnapSensitivity: (value: number) => {
        if (value < 13 || value > 25) {
          showError(
            "Invalid Value - Snap Sensitivity",
            "BPM range is between 13 and 25. Invserve Sensitivity value not updated.",
            1500
          );
          return;
        }
        set((state) => ({
          appSettings: {
            ...state.appSettings,
            snapSensitivity: value,
          },
        }));
      },

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
      updateAudioDuration: (durationInMilis: number) =>
        set((state) => ({
          audioInformation: { ...state.audioInformation, durationInMilis },
        })),

      // Import feat  ===================================================
      importJsonData: (json: string) => {
        const data = JSON.parse(json);
        if (validateJsonStructure(data)) {
          // Ensure current selected phone model's Glyph data is being loaded
          // Otherwise phone 1 will load up 33 zone cuz it item.length dependent lulz
          const zonesInImportedData = Object.keys(data).length;
          if (Object.keys(get().items).length !== zonesInImportedData) {
            showError(
              "Import Error - Phone Model Mismatch",
              `Are you sure correct Phone model is selected? ${
                kPhoneZones[zonesInImportedData]
                  ? `Hint: Try with ${kPhoneZones[
                      zonesInImportedData
                    ].toUpperCase()}`
                  : ""
              }`,
              2800
            );
            return;
          }
          // caution: sort for safety
          const sortedData = sortObjectByStartTimeMilis(data);

          // TODO: Fix, duration is 0 when file's just loaded, delay the firing or smthin
          // caution: remove glyphs beyond audio, old compositions have frequent violators!

          async function scheme(sortedData: GlyphStore) {
            setTimeout(() => {
              const finalData = removeAudioBoundsViolators(
                sortedData,
                get().audioInformation.durationInMilis
              );
              set({ items: finalData });
            }, 100);
          }

          scheme(sortedData);
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
            audioInformation.durationInMilis,
            -1, //default value for skipping index while updating, doesn't let skip by default.
            true
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
        const newItem: GlyphBlock = generateNewGlyphBlock(
          glyphId,
          startTimeMilis
        );
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

      //  Delta shiz, only send delta
      // Effect's not a bug. When holding down shift key, if user lets go before right click, it toggles multiselect off, thus the effect does not apply as other block (apart from the right clicked one) aren't selected :P
      updateSelectedItem: (deltaBlock: DeltaUpdateBlock) => {
        const items = get().items;
        const { snapToBpmActive, alsoSnapDuration, bpmValue, snapSensitivity } =
          get().appSettings;
        const updatedItems = {
          ...items,
        };
        const durationInMilis = get().audioInformation.durationInMilis;

        // find selections to update
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
                  kMaxBrightness,
              };

              //Was too fast, had to put up accumulators
              if (snapToBpmActive) {
                const beatDuration = calculateBeatDurationInMilis(bpmValue);
                const startTimeAccu: number = dataStore.get(
                  "startTimeAccumulator"
                )!;
                const accuLimit = snapSensitivity;
// No need for duration accumulator check as only one event fired at last user movement # efficiency
                if (deltaBlock.durationMilis) {
                  // Determine the snapping direction based on the deltaBlock's trend
                  if (alsoSnapDuration) {
                    const direction =
                      deltaBlock.durationMilis > 0 ? "right" : "left";
                    curr.durationMilis = snapToNearestBeat(
                      curr.durationMilis,
                      beatDuration,
                      direction
                    );
                    dataStore.set("durationAccumulator", 0);
                    if (
                      canAddItem2(curr, updatedItems[i], durationInMilis, j)
                    ) {
                      updatedItems[i][j] = curr;
                    }
                  } else {
                    if (
                      canAddItem2(curr, updatedItems[i], durationInMilis, j)
                    ) {
                      updatedItems[i][j] = curr;
                    }
                  }
                }

                if (deltaBlock.startTimeMilis) {
                  // Determine the snapping direction based on the deltaBlock's trend

                  dataStore.set("startTimeAccumulator", startTimeAccu + 1);
                  if (startTimeAccu >= accuLimit) {
                    const direction =
                      deltaBlock.startTimeMilis > 0 ? "right" : "left";
                    curr.startTimeMilis = snapToNearestBeat(
                      curr.startTimeMilis,
                      beatDuration,
                      direction
                    );
                    dataStore.set("startTimeAccumulator", 0);
                    if (
                      canAddItem2(curr, updatedItems[i], durationInMilis, j)
                    ) {
                      updatedItems[i][j] = curr;
                    }
                  }
                }
              } else {
                // do normal update
                // skip if outside respectable bounds

                if (canAddItem2(curr, updatedItems[i], durationInMilis, j)) {
                  updatedItems[i][j] = curr;
                }
              }

              // Attach Effect Data if effect id has changed; but also gotta update on duration and other factor change, better to call everytime apart from changes in start time!
              if (
                deltaBlock.effectId ||
                deltaBlock.durationMilis ||
                deltaBlock.startingBrightness
              ) {
                // console.log("should not hit");
                const updatedEffectData: number[] = [];
                const endTimeIdx = Math.floor(
                  curr.durationMilis / kTimeStepMilis
                );
                // Fill with all effect id with 0
                // wrk add -1 as default to ensure evrything being overwritten
                for (
                  let i = 0;
                  i < Math.floor(curr.durationMilis / kTimeStepMilis);
                  i++
                ) {
                  updatedEffectData.push(0);
                }

                for (let i = 0; i < endTimeIdx; i++) {
                  updatedEffectData[i] = generateEffectData(
                    curr.effectId,
                    curr.startingBrightness,
                    i,
                    endTimeIdx
                  );
                }
                // no need for can add check as only effect has changed
                updatedItems[i][j].effectData = updatedEffectData;
                // never assing above to cur directly ^; will bypass safety checks cuz full overwrite
              }
            }
          }
        }

        // updatee
        set({ items: updatedItems });
      },

      // Direct supply all values, Using Delta update as it has nullable val support
      // Updates all selected items
      updateSelectedItemAbsolutely: (glyphUpdateTemplate: DeltaUpdateBlock) => {
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
                  glyphUpdateTemplate.startTimeMilis ??
                  curr.startTimeMilis ??
                  0,
                durationMilis:
                  glyphUpdateTemplate.durationMilis ??
                  curr.durationMilis ??
                  dataStore.get("newBlockDurationMilis"),
                effectId: glyphUpdateTemplate.effectId ?? curr.effectId ?? 0,
                startingBrightness:
                  glyphUpdateTemplate.startingBrightness ??
                  curr.startingBrightness ??
                  dataStore.get("newBlockBrightness"),
              };
              // Attach Effect Data if effect id has changed; but also gotta update on duration and other factor change, better to call everytime apart from changes in start time!
              if (
                glyphUpdateTemplate.effectId ||
                glyphUpdateTemplate.durationMilis ||
                glyphUpdateTemplate.startingBrightness
              ) {
                const updatedEffectData: number[] = [];
                const endTimeIdx = Math.floor(
                  curr.durationMilis / kTimeStepMilis
                );

                // Fill with all effect id with 0
                for (
                  let i = 0;
                  i < Math.floor(curr.durationMilis / kTimeStepMilis);
                  i++
                ) {
                  updatedEffectData.push(0);
                }

                for (let i = 0; i < endTimeIdx; i++) {
                  updatedEffectData[i] = generateEffectData(
                    curr.effectId,
                    curr.startingBrightness,
                    i,
                    endTimeIdx
                  );
                }
                curr.effectData = updatedEffectData;
              }

              // skip if outside respectable bounds
              if (basicCanAddCheck(curr, updatedItems[i], durationInMilis, j)) {
                updatedItems[i][j] = curr;
              }
            }
          }
        }

        // updatee & sort the entire stuf
        set({ items: sortObjectByStartTimeMilis(updatedItems) });
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
          const newItem: GlyphBlock = generateNewGlyphBlock(i, startTimeMilis);
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

      // Glyph generator feat.
      generateGlyphs: (glyphGenerateData: GlyphGenerationModel) => {
        // handle fill range
        // Ensure it's all added in 1 step, for 1 step better undo n redo
        const items = get().items;
        const audioInfo = get().audioInformation;
        const updatedItems = { ...items };

        const interval =
          glyphGenerateData.generationDurationMilis +
          glyphGenerateData.generationGapMilis; //in ms

        // i.e. fill all zones
        if (glyphGenerateData.generationGlyphZone === 101) {
          for (
            let i = glyphGenerateData.generationStartTimeMilis;
            i < glyphGenerateData.generationEndTimeMilis;
            i = i + interval
          ) {
            // add for all glyph zones
            for (let j = 0; j < Object.keys(items).length; j++) {
              const newItem: GlyphBlock = generateNewGlyphBlock(
                j,
                i,
                glyphGenerateData.generationDurationMilis,
                (glyphGenerateData.generationBlockBrightnessPercentage / 100) *
                  kMaxBrightness,
                glyphGenerateData.generationBlockEffectId
              );
              if (
                canAddItem2(newItem, updatedItems[j], audioInfo.durationInMilis)
              ) {
                updatedItems[j] = [
                  ...insertInSortedOrder(updatedItems[j], newItem),
                ];
              }
            }
          }
        } else {
          for (
            let i = glyphGenerateData.generationStartTimeMilis;
            i < glyphGenerateData.generationEndTimeMilis;
            i = i + interval
          ) {
            const newItem: GlyphBlock = generateNewGlyphBlock(
              glyphGenerateData.generationGlyphZone,
              i,
              glyphGenerateData.generationDurationMilis,
              (glyphGenerateData.generationBlockBrightnessPercentage / 100) *
                kMaxBrightness,
              glyphGenerateData.generationBlockEffectId
            );
            if (
              canAddItem2(
                newItem,
                updatedItems[glyphGenerateData.generationGlyphZone],
                audioInfo.durationInMilis
              )
            ) {
              updatedItems[glyphGenerateData.generationGlyphZone] = [
                ...insertInSortedOrder(
                  updatedItems[glyphGenerateData.generationGlyphZone],
                  newItem
                ),
              ];
            }
          }
        }
        set({ items: updatedItems });
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
