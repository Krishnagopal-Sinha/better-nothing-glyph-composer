import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import DeviceChoiceComponent from "./device_choice";
import dataStore from "@/lib/data_store";
import { useGlobalAudioPlayer } from "react-use-audio-player";
import useGlobalAppStore from "@/lib/timeline_state";
import { showError } from "@/lib/helpers";

export default function SettingsPanel() {
  const { setRate } = useGlobalAudioPlayer();

  // get settings
  const isKeyboardGestureEnabled = useGlobalAppStore(
    (state) => state.appSettings.isKeyboardGestureEnabled
  );
  const isMultiSelectActive = useGlobalAppStore(
    (state) => state.appSettings.isMultiSelectActive
  );
  const toggleKeyboardGesture = useGlobalAppStore(
    (state) => state.toggleKeyboardGesture
  );
  const toggleMultiSelect = useGlobalAppStore(
    (state) => state.toggleMultiSelect
  );

  const onMultiSelectToggle = () => {
    toggleMultiSelect();
  };

  const onPasteBrightnessOverwriteToggle = (e: boolean) => {
    dataStore.set("overwriteBrightnessWithNewBlock", e);
  };

  const onNewBlockDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.round(parseInt(e.target.value));
    if (value >= 50 && value <= 10000) {
      dataStore.set("newBlockDurationMilis", value);
    } else {
      showError(
        "Invalid Value - Glyph Duration",
        "Should be between 50ms to 10s"
      );
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
      showError(
        "Invalid Value - Glyph Brightness",
        "Should be between 1% to 100%"
      );
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
      showError("Invalid Value - Audio Speed", "Should be between 0.5x to 2x");
    }
  };
  return (
    <>
      {/* Config panel */}
      <form className="space-y-2  ">
        {/* COntrol Grid  */}
        <fieldset className="grid grid-cols-2 items-center gap-2 border rounded-lg p-4 overflow-scroll h-[270px]">
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
            checked={isMultiSelectActive}
          />
          {/* Keyboard controls */}
          <Label
            htmlFor="keyboardControls"
            className="text-lg font-light"
            title={`Enables keyboard controls like:\n-Pressing Spacebar to Play / Pause Audio.\n-Pressing Delete / Backspace to Delete selected Glyph Blocks\n-Shift to Select multiple at a time\n-Ctrl+Z / Cmd+Z to Undo\n-Ctrl+Y to Redo\n-Ctrl+A / Cmd + A to Select All`}
          >
            Enable Keyboard Gesture
          </Label>
          <Switch
            id="keyboardControls"
            onCheckedChange={toggleKeyboardGesture}
            checked={isKeyboardGestureEnabled}
          />
          {/* Modifiable paste brightness */}
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
    </>
  );
}
