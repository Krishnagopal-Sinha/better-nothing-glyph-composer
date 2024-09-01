import ControlPanelComponent from "@/components/controls/control_panel";
import GlyphPreviewComponent from "@/components/controls/glyph_preview";

import useGlobalAppStore, { useTemporalStore } from "@/lib/timeline_state";
import { useEffect, useRef, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { useFilePicker } from "use-file-picker";
import { FileTypeValidator } from "use-file-picker/validators";
import ffmpegService from "./logic/ffmpeg_service";
import {
  generateCSV,
  processEdits,
  restoreAppGlyphData,
} from "./logic/export_logic";
import { Button } from "./components/ui/button";
import InstructionComponent from "./components/timeline/instructions";
import SaveDialog from "./components/controls/save_dialog";
import { Toaster } from "./components/ui/sonner";
import {
  ChevronsLeft,
  ChevronsRight,
  ChevronsRightLeft,
  Pause,
  Play,
  Save,
  Square,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import dataStore from "./lib/data_store";
import FullPageAppLoaderPage from "./components/ui/fullScreenLoader";
import { showError } from "./lib/helpers";
import { EditorComponent } from "./components/timeline/editor";

export default function App() {
  // Promot user for exit confimation - leave it upto browser

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      return "";
    }

    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, []);

  // App state
  const timelineData = useGlobalAppStore((state) => state.items);
  const resetData = useGlobalAppStore((state) => state.reset);
  const updateDuration = useGlobalAppStore(
    (state) => state.updateAudioDuration
  );
  const currentDevice = useGlobalAppStore((state) => state.phoneModel);
  const isKeyboardGestureEnabled = useGlobalAppStore(
    (state) => state.appSettings.isKeyboardGestureEnabled
  );
  const removeSelectedItem = useGlobalAppStore(
    (state) => state.removeSelectedItem
  );
  const toggleMultiSelect = useGlobalAppStore(
    (state) => state.toggleMultiSelect
  );
  const selectAllItems = useGlobalAppStore((state) => state.selectAll);
  const importJsonData = useGlobalAppStore((state) => state.importJsonData);
  const copyItems = useGlobalAppStore((state) => state.copyItems);
  const cutItems = useGlobalAppStore((state) => state.cutItems);
  const pasteItems = useGlobalAppStore((state) => state.pasteItems);
  const increasePixelFactor = useGlobalAppStore(
    (state) => state.increasePixelFactor
  );
  const decreasePixelFactor = useGlobalAppStore(
    (state) => state.decreasePixelFactor
  );
  const timelinePixelFactor = useGlobalAppStore(
    (state) => state.appSettings.timelinePixelFactor
  );
  const {
    undo,
    redo,
    pastStates,
    futureStates,
    clear: clearUndoRedo,
  } = useTemporalStore((state) => state);
  // Scroll ref for scrolling editor
  const editorRef = useRef<HTMLDivElement>(null);
  // Input file
  const [isInputLoaded, setIsInputLoaded] = useState<boolean>(false);
  const { openFilePicker, filesContent, errors, plainFiles, clear } =
    useFilePicker({
      readFilesContent: true,
      readAs: "DataURL",
      accept: "audio/*",
      multiple: false,
      validators: [new FileTypeValidator(["mp3", "ogg"])],
    });

  // Audio Player
  const {
    load,
    stop,
    togglePlayPause,
    play,
    pause,
    setRate,
    duration,
    // isReady,
    seek,
    playing,
  } = useGlobalAudioPlayer();

  useEffect(() => {
    async function extractGlyphData(inputFile: File) {
      const compressedGlyphData = await ffmpegService.getGlyphData(inputFile);
      if (compressedGlyphData) {
        const restoredGlyphData = restoreAppGlyphData(compressedGlyphData);
        if (restoredGlyphData) {
          importJsonData(JSON.stringify(restoredGlyphData));
        }
      }
    }
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        load(filesContent[0].content, { format: "mp3" });
        setIsInputLoaded(true);
        updateDuration(duration * 1000); //init duration update
        dataStore.set("isAudioLoaded", true);
        if (plainFiles[0] && plainFiles[0].type === "audio/ogg") {
          showError(
            "Trying to extract Glyph Data",
            "Working in background to get data",
            2500
          );
          extractGlyphData(plainFiles[0]);
        }
        // set seek rate
        setRate(dataStore.get("audioSpeed") ?? 1);
        // clear undo and stuff
        clearUndoRedo();
        return;
      } catch (e) {
        console.error("Error while loading audio file:", e);
      }
    } else if (errors.length > 0) {
      console.error("Error while selecting audio file:", errors);
      alert(
        `File error.\nError while loading input audio file, possible file format mismatch.`
      );
    }
    if (isInputLoaded) {
      setIsInputLoaded(false);
      dataStore.set("isAudioLoaded", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesContent, errors]);

  if (errors.length) {
    console.error(`Failed to pick file: ${errors}`);
  }

  useEffect(() => {
    updateDuration(duration * 1000);
  }, [duration, updateDuration]);

  // FFMPEG
  const [ffmpegLoaded, setFfmpegLoaded] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  //fire on page load
  useEffect(() => {
    async function initializeFFmpeg() {
      await ffmpegService.load();
      setFfmpegLoaded(true);
    }
    initializeFFmpeg();
  }, []);

  // Key Gesture Handlers
  useEffect(() => {
    // Keyboard Controls

    // Play Pause
    function onSpaceKeyPress(e: KeyboardEvent) {
      if (e.code === "Space") {
        if (playing) {
          pause();
        } else {
          play();
        }
        e.preventDefault();
      }
    }
    // Delete
    function onDeleteOrBackspaceKeyDown(e: KeyboardEvent) {
      if (
        e.code === "Delete" ||
        (e.code === "Backspace" && !dataStore.get("isMoreMenuOpen"))
      ) {
        removeSelectedItem();
      }
    }
    // Toggle multi select to on when shift is pressed down
    function onShiftKeyDown(e: KeyboardEvent) {
      if (e.shiftKey) {
        toggleMultiSelect(true);
      }
    }
    // Toggle multi select to off when shift is pressed down
    function onShiftKeyUp(e: KeyboardEvent) {
      if (e.key === "Shift") {
        toggleMultiSelect(false);
      }
    }
    // Select all - intercept regular ctrl + a
    function onCtrlAKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyA") {
        // console.log("intercepting select all!");
        selectAllItems();
        e.preventDefault();
      }
    }
    // Copy Selected
    function onCtrlCKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyC") {
        copyItems();
      }
    }
    // Cut Selected
    function onCtrlXKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyX") {
        cutItems();
      }
    }
    // Paste Selected
    function onCtrlVKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyV") {
        pasteItems();
      }
    }
    // Undo
    function onCtrlZKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ" && !e.shiftKey) {
        // call it twice cuz of selection thingy to skip selection change,improve on this, same wid redo
        if (pastStates.length <= 0) {
          console.error("Error - Nothing to undo!");
          showError(
            "Action Skipped - Nothing to Undo",
            "There's nothing to Undo."
          );

          return;
        }
        undo();
        undo();
      }
    }
    // Redo
    function onCtrlYKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === "KeyY") {
        if (futureStates.length <= 0) {
          console.error("Error - Nothing to Redo!");
          showError(
            "Action Skipped - Nothing to Rndo",
            "There's nothing to Rndo."
          );

          return;
        }
        redo();
        redo();
      }
    }
    if (isInputLoaded && isKeyboardGestureEnabled) {
      // play pause stuff
      window.addEventListener("keypress", onSpaceKeyPress);
      window.addEventListener("keydown", onDeleteOrBackspaceKeyDown);
      window.addEventListener("keydown", onShiftKeyDown);
      window.addEventListener("keyup", onShiftKeyUp);
      window.addEventListener("keydown", onCtrlAKeyDown);
      window.addEventListener("keydown", onCtrlCKeyDown);
      window.addEventListener("keydown", onCtrlXKeyDown);
      window.addEventListener("keydown", onCtrlVKeyDown);
      window.addEventListener("keydown", onCtrlZKeyDown);
      window.addEventListener("keydown", onCtrlYKeyDown);
    }

    return () => {
      window.removeEventListener("keypress", onSpaceKeyPress);
      window.removeEventListener("keydown", onDeleteOrBackspaceKeyDown);
      window.removeEventListener("keydown", onShiftKeyDown);
      window.removeEventListener("keyup", onShiftKeyUp);
      window.removeEventListener("keydown", onCtrlAKeyDown);
      window.removeEventListener("keydown", onCtrlCKeyDown);
      window.removeEventListener("keydown", onCtrlXKeyDown);
      window.removeEventListener("keydown", onCtrlVKeyDown);
      window.removeEventListener("keydown", onCtrlZKeyDown);
      window.removeEventListener("keydown", onCtrlYKeyDown);
    };
  }, [
    isKeyboardGestureEnabled,
    isInputLoaded,
    pause,
    play,
    playing,
    removeSelectedItem,
    toggleMultiSelect,
    selectAllItems,
    copyItems,
    pasteItems,
    undo,
    redo,
    pastStates,
    futureStates,
    cutItems,
  ]);

  if (!ffmpegLoaded) {
    return <FullPageAppLoaderPage />;
  }

  return (
    <main>
      {/* Toast setup */}
      <Toaster visibleToasts={2} position="top-center" duration={700} />
      {/* Keep class here instead of main cuz otherwise grid would include toaster and that would ruin layout */}
      {isSaving && <SaveDialog isOpen={true} />}

      {/* main div */}
      <div
      // className="grid grid-cols-1 grid-rows-[50dvh_50dvh]"
      >
        {/* Upper Section - Fixed */}

        <div className="bg-[#222222] px-4 py-4 w-full overflow-auto">
          {/* Mobile Only */}
          {!isInputLoaded ? (
            <Button
              variant="outline"
              className=" sm:hidden mb-[10px] p-6 text-lg font-normal border-white w-max"
              onClick={(e) => {
                e.preventDefault();
                loadAudioFile();
              }}
            >
              Load Audio
            </Button>
          ) : (
            <></>
          )}
          <div className="space-y-4">
            {/* Phone and Config Screen */}
            <div className="flex justify-between space-x-4">
              {/* Glyph preview */}
              <GlyphPreviewComponent isAudioLoaded={isInputLoaded} />

              {/* Control Panel */}
              <ControlPanelComponent
                isSaving={isSaving}
                isAudioLoaded={isInputLoaded}
              />
            </div>

            {/* Load audio n play controls  */}
            <PlayControlsComponent />
          </div>
        </div>

        {/* Lower Section - Non-Scrollable */}

        {!isInputLoaded ? (
          <InstructionComponent />
        ) : (
          <EditorComponent
            scrollRef={editorRef}
            timelineData={timelineData}
            // currentAudioPosition={currentPosition}
          />
        )}
      </div>
    </main>
  );

  // Audio Controls
  function loadAudioFile() {
    // Close audio does these clean ups
    resetData();
    clear();
    openFilePicker();
  }

  function stopAudio() {
    stop();
  }

  function closeAudio(e: React.MouseEvent) {
    e.preventDefault();
    // Reset All Possible States - cleanup
    stopAudio();
    clear();
    setIsInputLoaded(false);
    // clear up loop data
    dataStore.set("loopAPositionInMilis", undefined);
    dataStore.set("loopAPositionInMilis", undefined);
    resetData();
  }

  function goToStart(): void {
    editorRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    // seek audio
    seek(0);
  }
  function goToEnd(): void {
    editorRef.current?.scrollTo({
      left: duration * timelinePixelFactor,
      behavior: "smooth",
    });

    seek(duration - 2);
  }
  function goToMiddle(): void {
    editorRef.current?.scrollTo({
      left: (duration / 2) * timelinePixelFactor - window.innerWidth / 2,
      behavior: "smooth",
    });
    seek(duration / 2);
  }

  function PlayControlsComponent(): React.ReactNode {
    return (
      <div className="mt-6">
        {/* Play Controls */}

        {isInputLoaded ? (
          <div
            className={`flex justify-evenly items-center border mt-[-8px] rounded-lg border-white p-4 ${
              playing ? "animate-pulse" : ""
            }`}
          >
            <button
              onClick={decreasePixelFactor}
              title={"Zoom out timeline"}
              aria-label="Zoom out timeline"
            >
              <ZoomOut />
            </button>
            <button
              onClick={increasePixelFactor}
              title={"Zoom out timeline"}
              aria-label="Zoom out timeline"
            >
              <ZoomIn />
            </button>

            {/* scroll to middle scroll middle */}

            <button onClick={goToMiddle} title="Jump to middle">
              <ChevronsRightLeft />
            </button>

            {/* scroll to start scroll start */}

            <button onClick={goToStart} title="Jump to start">
              <ChevronsLeft />
            </button>
            <button
              onClick={togglePlayPause}
              title={"Play / Pause"}
              aria-label="Toggle play or pause button"
            >
              {playing ? <Pause /> : <Play />}
            </button>
            {/* scroll to end scroll end */}

            <button onClick={goToEnd} title="Jump to end">
              <ChevronsRight />
            </button>

            <button
              onClick={stopAudio}
              title={"Stop"}
              aria-label="Stop audio button"
            >
              <Square />
            </button>
            <button
              title={"Save audio"}
              aria-label="save audio button"
              className={`${
                isSaving ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={async (e) => {
                e.preventDefault();
                const inputFile = plainFiles[0];
                const processedEditData = processEdits(
                  generateCSV(timelineData, duration * 1000)
                );
                if (inputFile && processedEditData && !isSaving) {
                  setIsSaving(true);
                  console.log("Save started...");
                  await ffmpegService
                    .saveOutput(plainFiles[0], processedEditData, currentDevice)
                    .then(() => {
                      setIsSaving(false);
                    });
                } else {
                  console.error(
                    "Save file error: No input file detected or another save process is ongoing"
                  );
                }
              }}
            >
              <Save />
            </button>
            <button
              onClick={closeAudio}
              title={"Close audio"}
              aria-label="close audio button"
            >
              <X />
            </button>
          </div>
        ) : (
          <Button
            className="w-full py-6 text-lg font-normal hidden sm:inline-flex"
            onClick={(e) => {
              e.preventDefault();
              loadAudioFile();
            }}
          >
            Load Audio
          </Button>
        )}
      </div>
    );
  }
}
