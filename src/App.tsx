import ControlPanelComponent from "@/components/controls/control_panel";
import GlyphPreviewComponent from "@/components/controls/glyph_preview";
import EditorComponent from "@/components/timeline/editor";
import useTimelineStore from "@/lib/timeline_state";
import { useEffect, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { useFilePicker } from "use-file-picker";
import { FileTypeValidator } from "use-file-picker/validators";
import ffmpegService from "./logic/ffmpeg_service";
import { generateCSV, processEdits } from "./logic/export_logic";
import { Button } from "./components/ui/button";
import InstructionComponent from "./components/timeline/instructions";
import SaveDialog from "./components/controls/save_dialog";
import { Toaster } from "./components/ui/sonner";
import { Pause, Play, Save, Square, X } from "lucide-react";
import dataStore from "./lib/data_store";
import FullPageAppLoaderPage from "./components/ui/fullScreenLoader";

export default function App() {
  const timelineData = useTimelineStore((state) => state.items);
  const resetData = useTimelineStore((state) => state.reset);
  const updateDuration = useTimelineStore((state) => state.updateDuration);
  const { openFilePicker, filesContent, errors, plainFiles, clear } =
    useFilePicker({
      readFilesContent: true,
      readAs: "DataURL",
      accept: "audio/*",
      multiple: false,
      validators: [new FileTypeValidator(["mp3", "ogg"])],
    });
  const resetState = useTimelineStore((state) => state.reset);
  const [isInputLoaded, setIsInputLoaded] = useState<boolean>(false);
  const {
    load,
    stop,
    togglePlayPause,
    setRate,
    duration,
    // isReady,
    playing,
  } = useGlobalAudioPlayer();
  // Handle live playing indicator updates for playing audio
  // const frameRef = useRef<number>();
  // const [currentPosition, setCurrentPosition] = useState(0);

  // useEffect(() => {
  //   const animate = () => {
  //     setCurrentPosition(getPosition());
  //     frameRef.current = requestAnimationFrame(animate);
  //   };

  //   frameRef.current = window.requestAnimationFrame(animate);

  //   return () => {
  //     if (frameRef.current) {
  //       cancelAnimationFrame(frameRef.current);
  //     }
  //   };
  // }, [getPosition]);

  // Effect to handle the file loading process
  useEffect(() => {
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        load(filesContent[0].content);
        setIsInputLoaded(true);
        dataStore.set("isAudioLoaded", true);
        // set seek rate
        setRate(dataStore.get("audioSpeed") ?? 1);
        return;
      } catch (e) {
        console.error("Error while loading audio file:", e);
        alert(`ERROR!\n Error while loading audio file!\n${e}`);
      }
    } else if (errors.length > 0) {
      console.error("Error while selecting file:", errors);
      alert(
        `ERROR!\n Error while selecting input audio file!\n${errors
          .map((err) => err)
          .join(", ")}`
      );
    }
    if (isInputLoaded) {
      setIsInputLoaded(false);
      dataStore.set("isAudioLoaded", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesContent, errors]);

  function loadAudioFile() {
    resetData();
    clear();

    openFilePicker();
  }

  function stopAudio() {
    stop();
  }

  function closeAudio(e: React.MouseEvent) {
    e.preventDefault();
    stopAudio();
    clear();
    setIsInputLoaded(false);
    resetState();
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
      <div className="grid grid-cols-1 grid-rows-[50dvh_50dvh] ">
        {/* Upper Section */}
        <div className="bg-red-700">
          {/* Upper Section - Fixed */}

          <div className="fixed left-0 right-0 bg-[#222222] px-4 pb-4 pt-4 overflow-auto h-[50dvh] max-h-[50dvh] w-full overflow-y-scroll z-10">
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
            <div className="space-y-6">
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

              {/* Play Controls */}
              <div className="mt-6">
                {isInputLoaded ? (
                  <div
                    className={`flex justify-evenly items-center border rounded-lg border-white p-4 ${
                      playing ? "animate-pulse" : ""
                    }`}
                  >
                    <button
                      onClick={togglePlayPause}
                      title={"Play / Pause"}
                      aria-label="Toggle play or pause button"
                    >
                      {playing ? <Pause /> : <Play />}
                    </button>
                    <button
                      onClick={stopAudio}
                      title={"Stop"}
                      aria-label="Stop audio button"
                    >
                      <Square />
                    </button>
                    <button
                      onClick={closeAudio}
                      title={"Close audio"}
                      aria-label="close audio button"
                    >
                      <X />
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
                          console.log("save started...");
                          await ffmpegService
                            .saveOutput(plainFiles[0], processedEditData)
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
            </div>
          </div>
        </div>

        {/* Lower Section - Non-Scrollable */}
        <div
        // className="border-t-2 border-white border-dashed"
        >
          {!isInputLoaded ? (
            <InstructionComponent />
          ) : (
            <EditorComponent
              timelineData={timelineData}
              // currentAudioPosition={currentPosition}
            />
          )}
        </div>
      </div>
    </main>
  );
}
