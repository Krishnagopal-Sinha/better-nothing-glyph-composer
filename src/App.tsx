import ControlPanelComponent from "@/components/controls/control_panel";
import GlyphPreviewComponent from "@/components/controls/glyph_preview";
import EditorComponent from "@/components/timeline/editor";
import useTimelineStore from "@/lib/timeline_state";
import { useEffect, useRef, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { useFilePicker } from "use-file-picker";
import { FileTypeValidator } from "use-file-picker/validators";
import ffmpegService from "./logic/ffmpeg_service";
import { generateCSV, processEdits } from "./logic/export_logic";
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
} from "lucide-react";
import dataStore from "./lib/data_store";
import FullPageAppLoaderPage from "./components/ui/fullScreenLoader";
import { kMagicNumber } from "./lib/consts";

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
  const timelineData = useTimelineStore((state) => state.items);
  const resetData = useTimelineStore((state) => state.reset);
  const updateDuration = useTimelineStore((state) => state.updateDuration);
  const currentDevice = useTimelineStore((state) => state.phoneModel);
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
    setRate,
    duration,
    // isReady,
    seek,
    playing,
  } = useGlobalAudioPlayer();

  useEffect(() => {
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        load(filesContent[0].content, { format: "mp3", loop: true });
        setIsInputLoaded(true);
        dataStore.set("isAudioLoaded", true);
        // set seek rate
        setRate(dataStore.get("audioSpeed") ?? 1);
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

  function loadAudioFile() {
    // Close audio does these clean ups
    // resetData();
    // clear();
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

  if (errors.length) {
    console.error(`Failed to pick file: ${errors}`);
  }

  useEffect(() => {
    updateDuration(duration * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

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

  if (!ffmpegLoaded) {
    return <FullPageAppLoaderPage />;
  }
  return (
    <main>
      {/* Toast setup */}
      <Toaster visibleToasts={2} position="top-center" />
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
              <GlyphPreviewComponent />

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

  function goToStart(): void {
    editorRef.current?.scrollTo({ left: 0, behavior: "smooth" });
    // seek audio
    seek(0);
  }
  function goToEnd(): void {
    editorRef.current?.scrollTo({
      left: duration * kMagicNumber,
      behavior: "smooth",
    });

    seek(duration - 2);
  }
  function goToMiddle(): void {
    editorRef.current?.scrollTo({
      left: (duration / 2) * kMagicNumber - window.innerWidth / 2,
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
              onClick={stopAudio}
              title={"Stop"}
              aria-label="Stop audio button"
            >
              <Square />
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
