"use client";

import ControlPanelComponent from "@/components/controls/control_panel";
import GlyphPreviewComponent from "@/components/controls/glyph_preview";
import EditorComponent from "@/components/timeline/editor";
import useTimelineStore from "@/logic/timeline_state";
import { useEffect, useRef, useState } from "react";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { useFilePicker } from "use-file-picker";
import { FileTypeValidator } from "use-file-picker/validators";
import ffmpegService from "./lib/ffmpeg_service";
import { generateCSV, processEdits } from "./logic/export_logic";
import { Button } from "./components/ui/button";
import InstructionComponent from "./components/timeline/instructions";
import SaveDialog from "./components/controls/save_dialog";

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
    getPosition,
    duration,
    // isReady,
    playing,
  } = useGlobalAudioPlayer();
  // Handle live playing indicator updates for playing audio
  const frameRef = useRef<number>();
  const [currentPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    const animate = () => {
      setCurrentPosition(getPosition());
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [getPosition]);

  // Effect to handle the file loading process
  useEffect(() => {
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        load(filesContent[0].content);
        setIsInputLoaded(true);
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
    return (
      <div className="flex p-6 text-6xl space-y-6 items-center flex-col h-[100dvh] ">
        <div className="my-auto">loading...</div>
        <div className="bg-white text-black text-3xl mt-[200px] rounded-lg p-6">
          Note: Reload if it's taking too much time...
        </div>
      </div>
    );
  }
  return (
    <main className="flex flex-col">
      {/* Upper UI */}
      {isSaving ? <SaveDialog isOpen={true} /> : <></>}
      <div className="fixed space-y-6 px-6 pt-4 min-h-[50dvh] bg-[#222222]  flex flex-col min-w-[100dvw] ">
        {/* Phone and Config Screen */}
        <div className="flex justify-between space-x-4">
          <GlyphPreviewComponent
            currentAudioPosition={currentPosition}
            timelineData={timelineData}
          />
          <ControlPanelComponent isSaving={isSaving} />
        </div>

        {/* Can also use isReady, better tbh but due to load audio btn not gonna */}
        <div className="">
          {isInputLoaded ? (
            // PLAY audio player Controls
            <div className="flex justify-evenly items-center mt-6">
              {/* Play / Pause Audio button */}

              <button
                onClick={() => {
                  togglePlayPause();
                }}
              >
                {playing ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                )}
              </button>
              {/* Stop Audio button */}

              <button
                onClick={() => {
                  stopAudio();
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                </svg>
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  //DELETE THIS
                  const inputFile = plainFiles[0];
                  const processedEditData = processEdits(
                    generateCSV(timelineData, duration * 1000)
                  );
                  if (inputFile && processedEditData) {
                    setIsSaving(true);
                    console.log("true");
                    await ffmpegService
                      .saveOutput(plainFiles[0], processedEditData)
                      .then(() => {
                        setIsSaving(false);
                        
                      });
                  } else {
                    console.error(
                      "Save file error: No input file was detected"
                    );
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                  <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" />
                  <path d="M7 3v4a1 1 0 0 0 1 1h7" />
                </svg>
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
              Load Audio
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
            // duration={duration}
            timelineData={timelineData}
            currentAudioPosition={currentPosition}
          />
        )}
      </div>
    </main>
  );
}
