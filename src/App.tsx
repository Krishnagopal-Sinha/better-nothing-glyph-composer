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
    <main className="flex flex-col">
      <Toaster visibleToasts={2} />
      {/* Upper UI */}
      {isSaving ? <SaveDialog isOpen={true} /> : <></>}
      <div className="fixed space-y-6 px-6 pt-4 min-h-[50dvh] bg-[#222222]  flex flex-col min-w-[100dvw] ">
        {/* Phone and Config Screen */}
        <div className="flex justify-between space-x-4">
          {/* Glyph preview  */}
          <GlyphPreviewComponent />

          {/* Control Panel */}
          <ControlPanelComponent
            isSaving={isSaving}
            isAudioLoaded={isInputLoaded}
          />
        </div>

        {/* Can also use isReady, better tbh but due to load audio btn not gonna */}
        <div className="">
          {isInputLoaded ? (
            // PLAY audio player Controls
            <div className="flex justify-evenly items-center mt-6">
              {/* play button / pause button */}

              <button
                onClick={() => {
                  togglePlayPause();
                }}
              >
                {playing ? <Pause /> : <Play />}
              </button>
              {/* Stop Audio button */}

              <button
                onClick={() => {
                  stopAudio();
                }}
              >
                <Square />
              </button>
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.preventDefault();

                  stopAudio();
                  clear();
                  setIsInputLoaded(false);

                  resetState();
                }}
              >
                <X />
              </button>
              {/* Save Button */}
              <button
                style={{
                  cursor: isSaving ? "not-allowed" : "pointer",
                }}
                onClick={async (e) => {
                  e.preventDefault();
                  //DELETE THIS
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
                      "Save file error: No input file was detected or another save process is ongoing"
                    );
                  }
                }}
              >
                <Save />
              </button>
            </div>
          ) : (
            // Load Audio button
            <Button
              className="w-full py-6 text-lg font-normal"
              onClick={(e) => {
                e.preventDefault();
                loadAudioFile();
              }}
            >
              Load audio
            </Button>
          )}
        </div>
      </div>

      {/* Lower UI - TImeline */}
      {/* Since Upper UI is fixed positoined i.e. floating, need margin to ensure space is kept on top */}

      <div className="min-h-[50dvh] mt-[50dvh]">
        {!isInputLoaded ? (
          <InstructionComponent />
        ) : (
          <EditorComponent
            // duration={duration*1000}
            timelineData={timelineData}
            // currentAudioPosition={currentPosition}
          />
        )}
      </div>
    </main>
  );
}
