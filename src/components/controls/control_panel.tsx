import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import InstructionComponent from "../timeline/instructions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import dataStore from "@/lib/data_store";
import { toast } from "sonner";
import { Copy, Clipboard, Trash, SquareDashedMousePointer } from "lucide-react";
import useTimelineStore from "@/lib/timeline_state";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import { kAppName, kAppVersion } from "@/lib/consts";
import { useState } from "react";
import DeviceChoiceComponent from "./device_choice";

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
  const { getPosition, setRate } = useGlobalAudioPlayer();
  const [selectAll, setSelectAll] = useState<boolean>(true);
  // easter egg
  const [showEasterEgg, setShowEasterEgg] = useState<boolean>(false);
  const toggleEasterEgg = () => {
    setShowEasterEgg((v) => !v);
  };

  const onMultiSelectToggle = (e: boolean) => {
    dataStore.set("multiSelect", e);
  };

  const onPasteBrightnessOverwriteToggle = (e: boolean) => {
    dataStore.set("overwriteBrightnessWithNewBlock", e);
  };

  const onNewBlockDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.round(parseInt(e.target.value));
    if (value >= 50 && value <= 10000) {
      dataStore.set("newBlockDurationMilis", value);
    } else {
      toast.error("Invalid Value - Glyph Duration", {
        description: "Should be between 50ms to 10s",
        action: {
          label: "Ok",
          onClick: () => {},
        },
      });
    }
  };

  const onNewBlockBrightnessChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    // Max val -> 4095
    const selectedValue = parseInt(e.target.value);
    const value = Math.round((selectedValue / 100) * 4095);
    // console.log(value);
    if (selectedValue >= 1 && selectedValue <= 100) {
      dataStore.set("newBlockBrightness", value);
    } else {
      toast.error(`Invalid Value - Glyph Brightness`, {
        description: "Should be between 1% to 100%",
        action: {
          label: "Ok",
          onClick: () => {},
        },
      });
    }
  };

  const onAudioSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value >= 0.5 && value <= 2) {
      dataStore.set("audioSpeed", value);
      try {
        setRate(value);
      } catch (e) {
        console.error(`Error while setting audio rate: ${e}`);
      }
    } else {
      toast.error("Invalid Value - Audio Speed", {
        description: "Should be between 0.5x to 2x",
        action: {
          label: "Ok",
          onClick: () => {},
        },
      });
    }
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
          {isAudioLoaded && (
            <div className="border p-2 px-4 rounded-lg grid grid-cols-4 gap-4 border-white">
              {/* copy button */}
              <button
                onClick={copyItems}
                title={"Copy"}
                aria-label="copy button"
              >
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
            </div>
          )}
        </div>
      </div>

      {/* Config panel */}
      <form className="space-y-2 overflow-scroll h-[270px] ">
        {/* COntrol Grid  */}
        <fieldset className="grid grid-cols-2 items-center gap-2 border rounded-lg p-4">
          <legend className="-ml-1 px-1 text-sm font-medium">Settings</legend>
          {/* Configure Device */}
          <Label htmlFor="multiSelect" className="text-lg font-light">
            Device
          </Label>
          <DeviceChoiceComponent />

          {/* Configure block time */}
          <Label htmlFor="newBlockDurationMilis" className="text-lg font-light">
            New Glyph Duration (ms)
            <br />
          </Label>
          <Input
            id="newBlockDurationMilis"
            type="number"
            defaultValue={dataStore.get("newBlockDurationMilis") ?? 500}
            max={10000}
            min={50}
            step={1}
            onChange={onNewBlockDurationChange}
          />

          {/* Configure new block brightness */}
          <Label htmlFor="newBlockBrightness" className="text-lg font-light">
            New Glyph Brightness (%)
            <br />
          </Label>
          <Input
            onChange={onNewBlockBrightnessChange}
            id="newBlockBrightness"
            type="number"
            defaultValue={
              (((dataStore.get("newBlockBrightness") as number) ?? 3072) /
                4095) *
              100
            }
            max={100}
            min={1}
            step={1}
          />

          {/* Configure audio speed */}
          <Label htmlFor="newBlockBrightness" className="text-lg font-light">
            Audio Speed
            <br />
          </Label>
          <Input
            onChange={onAudioSpeedChange}
            id="newBlockBrightness"
            type="number"
            defaultValue={dataStore.get("audioSpeed") ?? 1}
            max={2}
            min={0.5}
            step={0.1}
          />
          {/* MultiSelect */}
          <Label htmlFor="multiSelect" className="text-lg font-light">
            Enable Multi-Select
          </Label>
          <Switch
            id="multiSelect"
            onCheckedChange={onMultiSelectToggle}
            defaultValue={dataStore.get("multiSelect")}
          />

          <Label
            htmlFor="overwriteBrightness"
            className="text-lg font-light"
            title="Overwrite the brightness of blocks that would be pasted with the new block brightness value?"
          >
            Modify Paste Brightness
          </Label>
          <Switch
            id="overwriteBrightness"
            onCheckedChange={onPasteBrightnessOverwriteToggle}
            defaultValue={dataStore.get("overwriteBrightnessWithNewBlock")}
          />
        </fieldset>
      </form>
    </div>
  );
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
