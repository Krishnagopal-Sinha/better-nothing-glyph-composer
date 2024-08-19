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
  SquarePlus,
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
  const addItem = useTimelineStore((state) => state.addItem);

  const { getPosition } = useGlobalAudioPlayer();
  const [selectAll, setSelectAll] = useState<boolean>(true);
  // easter egg
  const [showEasterEgg, setShowEasterEgg] = useState<boolean>(false);
  const toggleEasterEgg = () => {
    setShowEasterEgg((v) => !v);
  };

  const deviceControlsToShow = generateDeviceControls();

  return (
    <div className="flex sm:flex-row flex-col gap-4 h-max-[50dvh] rounded-lg shadow-lg p-6 flex-grow bg-[#111111] justify-between ">
      {/* Info Title*/}
      <div className="flex flex-col justify-between">
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

        <OpenInstructionButton />

        {isAudioLoaded && (
          <div className="flex flex-col space-y-3">
            {/* Command Center */}
            <CommandCenter />
            {/* Glyph Zone Add Center */}
            <div className="grid grid-flow-col border border-white rounded-lg">
              {deviceControlsToShow}
            </div>
          </div>
        )}
      </div>
      {/* Config panel */}

      <SettingsPanel />
    </div>
  );

  function generateDeviceControls() {
    switch (currentDevice) {
      case "NP1":
        return (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(0, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(1, startTimeMilis);
              }}
            >
              2
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(2, startTimeMilis);
              }}
            >
              3
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(3, startTimeMilis);
              }}
            >
              4
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(4, startTimeMilis);
              }}
            >
              5
            </Button>
          </>
        );

      case "NP1_15":
        return (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(0, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(1, startTimeMilis);
              }}
            >
              2
            </Button>
            <Button
              variant="ghost"
              title="Fill the Entire Middle Glyph Zone of NP(1) | 15 Zone Mode"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(2, 5, startTimeMilis);
              }}
            >
              3
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(6, startTimeMilis);
              }}
            >
              4
            </Button>
            <Button
              variant="ghost"
              title="Fill the Entire Battery Glyph Zone of NP(1) | 15 Zone Mode"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(7, 14, startTimeMilis);
              }}
            >
              5
            </Button>
          </>
        );

      case "NP2_15":
        // TODO: ADD THIS?
        return <div></div>;

      case "NP2_33":
        return (
          <>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(0, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(1, startTimeMilis);
              }}
            >
              2
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(2, startTimeMilis);
              }}
            >
              3
            </Button>

            <Button
              variant="ghost"
              title="Fill the Entire Middle Right Glyph Zone of NP(2)"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(3, 18, startTimeMilis);
              }}
            >
              4
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(19, startTimeMilis);
              }}
            >
              5
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(20, startTimeMilis);
              }}
            >
              6
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(21, startTimeMilis);
              }}
            >
              7
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(22, startTimeMilis);
              }}
            >
              8
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(23, startTimeMilis);
              }}
            >
              9
            </Button>

            <Button
              variant="ghost"
              title="Fill all the Battery Glyph Zones of NP(2)"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(25, 32, startTimeMilis);
              }}
            >
              10
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(24, startTimeMilis);
              }}
            >
              11
            </Button>
          </>
        );

      case "NP2a":
        return (
          <>
            <Button
              variant="ghost"
              title="Fill the Entire First Glyph Zone of NP(2a)"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(0, 23, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(24, startTimeMilis);
              }}
            >
              2
            </Button>
            <Button
              variant="ghost"
              title="Fill the Entire Middle Glyph Zone of NP(1) | 15 Zone Mode"
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                addItem(25, startTimeMilis);
              }}
            >
              3
            </Button>
          </>
        );

      default:
        return <></>;
    }
  }

  function CommandCenter() {
    return (
      <>
        <div className="border rounded-lg border-white grid grid-flow-col">
          {/* copy button */}
          <Button
            variant="ghost"
            onClick={copyItems}
            title={"Copy"}
            aria-label="copy button"
          >
            <Copy />
          </Button>
          {/* Paste button */}
          <Button
            variant="ghost"
            onClick={() => pasteItems(getPosition() * 1000)}
            title={"Paste"}
            aria-label="paste button"
          >
            <Clipboard />
          </Button>
          {/* Delete button */}
          <Button
            variant="ghost"
            onClick={removeSelectedItem}
            title={"Delete Selected"}
            aria-label="delete button"
          >
            <Trash />
          </Button>
          {/* select all button unselect all */}
          <Button
            variant="ghost"
            onClick={() => {
              selectAllItems(selectAll);
              setSelectAll((v) => !v);
            }}
            title={"Select / Unselect All"}
            aria-label="select or unselect all button"
          >
            <SquareDashedMousePointer />
          </Button>
          {/* Add All Glyphs Button */}
          {/* ========== PHONE 1  ============= */}
          {currentDevice === "NP1" && (
            <Button
              variant="ghost"
              title="Add all the Glyphs of NP(1) "
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(0, 4, startTimeMilis);
              }}
            >
              <SquarePlus />
            </Button>
          )}
          {/* ========== PHONE 1 | 15 Zone ============= */}

          {currentDevice === "NP1_15" && (
            <Button
              variant="ghost"
              title="Add all the Glyphs of NP(1) | 15 Zone Mode "
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(0, 14, startTimeMilis);
              }}
            >
              <SquarePlus />
            </Button>
          )}

          {/* Phone 2 | 33 Zone Mode | Add all glyphs */}
          {currentDevice === "NP2_33" && (
            <Button
              variant="ghost"
              title="Add all the Glyphs of NP(1) | 15 Zone Mode "
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(0, 32, startTimeMilis);
              }}
            >
              <SquarePlus />
            </Button>
          )}

          {/* Phone 2a Add all glyphs */}
          {currentDevice === "NP2a" && (
            <Button
              variant="ghost"
              title="Add all the Glyphs of NP(1) | 15 Zone Mode "
              onClick={() => {
                const startTimeMilis = getPosition() * 1000;
                fillEntireZone(0, 25, startTimeMilis);
              }}
            >
              <SquarePlus />
            </Button>
          )}
        </div>
      </>
    );
  }
}

export function OpenInstructionButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="left-0 max-w-[120px] " variant='link' title="Open instructions">
          Read Instructions
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
