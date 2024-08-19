import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import InstructionComponent from "../timeline/instructions";

import {
  Copy,
  Clipboard,
  Trash,
  SquareDashedMousePointer,
  DiamondPlus,
  SquarePlus,
  Zap,
} from "lucide-react";
import useTimelineStore from "@/lib/timeline_state";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { kAppName, kAppVersion } from "@/lib/consts";
import { useState } from "react";
import SettingsPanel from "./settings_panel";

export default function ControlPanelComponent({
  isSaving,
  isAudioLoaded,
}: {
  isSaving: boolean;
  isAudioLoaded: boolean;
}) {
  const copyItems = useTimelineStore((state) => state.copyItems);
  const pasteItems = useTimelineStore((state) => state.pasteItems);
  const selectAllItems = useTimelineStore((state) => state.selectAll);
  const removeSelectedItem = useTimelineStore(
    (state) => state.removeSelectedItem
  );
  const currentDevice = useTimelineStore((state) => state.phoneModel);
  const fillEntireZone = useTimelineStore((state) => state.fillEntireZone);

  const { getPosition } = useGlobalAudioPlayer();
  const [selectAll, setSelectAll] = useState<boolean>(true);
  // easter egg
  const [showEasterEgg, setShowEasterEgg] = useState<boolean>(false);
  const toggleEasterEgg = () => {
    setShowEasterEgg((v) => !v);
  };

  return (
    <div className="flex sm:flex-row flex-col gap-4 h-max-[50dvh] rounded-lg shadow-lg p-6 flex-grow bg-[#111111] justify-between ">
      {/* Info Title*/}
      <div className="flex flex-col justify-between ">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-primary">
            <AppNameComponent playing={showEasterEgg} />
            <span className="animate-pulse duration-700 text-red-600">
              {" "}
              {isSaving ? "[Saving...]" : ""}
            </span>
          </h2>

          {/*  Info content */}
          <p className="text-muted-foreground">
            This app is usable but is still being actively being worked upon!
            <br />
            Supports: Nothing Phone(1) & Phone(2)
            <br />
            Use on fullscreen Desktop / Laptop
            <br />
            <span
              onDoubleClick={toggleEasterEgg}
              className="cursor- select-none"
              title="Easter egg?"
            >
              {" "}
              (v{kAppVersion})
            </span>
          </p>
        </div>

        <div className=" mt-4 sm:mt-0 space-x-2 flex items-center">
          {/* Instruction Button */}
          <OpenInstructionButton />
          {/* Command Center */}
          <CommandCenter />
        </div>
      </div>
      {/* Config panel */}

      <SettingsPanel />
    </div>
  );

  function CommandCenter() {
    return (
      <>
        {isAudioLoaded && (
          <div className="border p-2 px-4 rounded-lg grid grid-flow-col gap-4 border-white">
            {/* copy button */}
            <button onClick={copyItems} title={"Copy"} aria-label="copy button">
              <Copy />
            </button>
            {/* Paste button */}
            <button
              onClick={() => pasteItems(getPosition() * 1000)}
              title={"Paste"}
              aria-label="paste button"
            >
              <Clipboard />
            </button>
            {/* Delete button */}
            <button
              onClick={removeSelectedItem}
              title={"Delete Selected"}
              aria-label="delete button"
            >
              <Trash />
            </button>
            {/* select all button unselect all */}
            <button
              onClick={() => {
                selectAllItems(selectAll);
                setSelectAll((v) => !v);
              }}
              title={"Select / Unselect All"}
              aria-label="select or unselect all button"
            >
              <SquareDashedMousePointer />
            </button>
            {/* ====================== Phone Specific Controls ====================== */}
            {/* Phone 1 Add all glyphs */}
            {currentDevice === "NP1" && (
              <button
                title="Add all the Glyphs of NP(1) "
                className="flex font-semibold"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(0, 4, startTimeMilis);
                }}
              >
                <Zap />+
              </button>
            )}
            {/* ========== PHONE 1 | 15 Zone ============= */}
            {/* Phone 1 | 15 zone mode | full center zone add button */}
            {currentDevice === "NP1_15" && (
              <button
                title="Fill the Entire Middle Glyph Zone of NP(1) | 15 Zone Mode"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(2, 5, startTimeMilis);
                }}
              >
                <SquarePlus />
              </button>
            )}
            {/*Phone 1 | 15 zone mode | full battery zone add button */}
            {currentDevice === "NP1_15" && (
              <button
                title="Fill the Entire Battery Glyph Zone of NP(1) | 15 Zone Mode"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(7, 14, startTimeMilis);
                }}
              >
                <DiamondPlus />
              </button>
            )}
            {/* Phone 1 | 15 Zone Mode | Add all glyphs */}
            {currentDevice === "NP1_15" && (
              <button
                title="Add all the Glyphs of NP(1) | 15 Zone Mode "
                className="flex font-semibold"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(0, 14, startTimeMilis);
                }}
              >
                <Zap />+
              </button>
            )}
            {/* ========== PHONE 2a ============= */}

            {/* Phone 2a full zone add button */}
            {currentDevice === "NP2a" && (
              <button
                title="Fill the Entire First Glyph Zone of NP(2a)"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(0, 23, startTimeMilis);
                }}
              >
                <SquarePlus />
              </button>
            )}
            {/* Phone 2a Add all glyphs */}
            {currentDevice === "NP2a" && (
              <button
                title="Add all the Glyphs of NP(1) | 15 Zone Mode "
                className="flex font-semibold"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(0, 25, startTimeMilis);
                }}
              >
                <Zap />+
              </button>
            )}
            {/* ==========PHONE 2 | 33 Zone============= */}
            {/* Phone 2 | 33 Zone Mode | full middle-right zone add button */}
            {currentDevice === "NP2_33" && (
              <button
                title="Fill the Entire Middle Right Glyph Zone of NP(2)"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(3, 18, startTimeMilis);
                }}
              >
                <SquarePlus />
              </button>
            )}

            {/* Phone 2 | 33 Zone Mode | full battery zone add button */}
            {currentDevice === "NP2_33" && (
              <button
                title="Fill the Entire Middle Right Glyph Zone of NP(2)"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(25, 32, startTimeMilis);
                }}
              >
                <DiamondPlus />
              </button>
            )}
            {/* Phone 2a | 33 Zone Mode | Add all glyphs */}
            {currentDevice === "NP2_33" && (
              <button
                title="Add all the Glyphs of NP(1) | 15 Zone Mode "
                className="flex font-semibold"
                onClick={() => {
                  const startTimeMilis = getPosition() * 1000;
                  fillEntireZone(0, 32, startTimeMilis);
                }}
              >
                <Zap />+
              </button>
            )}
          </div>
        )}
      </>
    );
  }
}

export function OpenInstructionButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-44" title="Open instructions">
          Instruction
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[400px] sm:min-w-[400px] md:min-w-[900px] h-[450px] md:h-fit overflow-auto">
        <InstructionComponent />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="submit">Ok</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppNameComponent({ playing }: { playing: boolean }) {
  const kAppNameParts = kAppName.split(" ");

  return (
    <span className={`${playing ? "neon" : ""}`}>
      <span className={`${playing ? "flicker-vslow" : ""}`}>
        {kAppNameParts[0]}{" "}
      </span>
      {kAppNameParts[1]}{" "}
      <span className={`${playing ? "flicker-slow" : ""}`}>
        {" "}
        {kAppNameParts[2]}{" "}
      </span>
      {kAppNameParts[3]}{" "}
      <span className={`${playing ? "flicker-fast" : ""}`}>
        {kAppNameParts[4]}
      </span>
    </span>
  );
}
