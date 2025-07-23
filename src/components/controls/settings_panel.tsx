import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import DeviceChoiceComponent from './device_choice';
import dataStore from '@/lib/data_store';
import useGlobalAppStore from '@/lib/timeline_state';
import { showPopUp } from '@/lib/helpers';
import { kMaxBrightness } from '@/lib/consts';
import { useRef } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SettingsPanel() {
  const spanRef = useRef<HTMLLegendElement>(null);
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);

  // get settings
  const isKeyboardGestureEnabled = useGlobalAppStore(
    (state) => state.appSettings.isKeyboardGestureEnabled
  );
  const isMultiSelectActive = useGlobalAppStore((state) => state.appSettings.isMultiSelectActive);
  const showAudioTimeStamp = useGlobalAppStore((state) => state.appSettings.showAudioTimeStamp);
  const snapToBpmActive = useGlobalAppStore((state) => state.appSettings.snapToBpmActive);
  const isZoneVisible = useGlobalAppStore((state) => state.appSettings.isZoneVisible);
  const snapSensitivity = useGlobalAppStore((state) => state.appSettings.snapSensitivity);
  const alsoSnapDuration = useGlobalAppStore((state) => state.appSettings.alsoSnapDuration);
  const bpmValue = useGlobalAppStore((state) => state.appSettings.bpmValue);
  const showHeavyUi = useGlobalAppStore((state) => state.appSettings.showHeavyUi);
  const toggleShowAudioTimeStamp = useGlobalAppStore((state) => state.toggleShowAudioTimeStamp);
  const toggleKeyboardGesture = useGlobalAppStore((state) => state.toggleKeyboardGesture);
  const toggleMultiSelect = useGlobalAppStore((state) => state.toggleMultiSelect);
  const toggleAlsoSnapBlockDuration = useGlobalAppStore(
    (state) => state.toggleAlsoSnapBlockDuration
  );
  const toggleShowShowHeavyUi = useGlobalAppStore((state) => state.toggleShowShowHeavyUi);
  const toggleSnapToBpm = useGlobalAppStore((state) => state.toggleSnapToBpm);
  const toggleZoneVisibility = useGlobalAppStore((state) => state.toggleZoneVisibility);

  const setBpmForSnap = useGlobalAppStore((state) => state.setBpmForSnap);
  const setSnapSensitivity = useGlobalAppStore((state) => state.setSnapSensitivity);
  const showHoverGlyphPreview = useGlobalAppStore(
    (state) => state.appSettings.showHoverGlyphPreview
  );
  const toggleShowHoverGlyphPreview = useGlobalAppStore(
    (state) => state.toggleShowHoverGlyphPreview
  );
  const timelineRowHeight = useGlobalAppStore((state) => state.appSettings.timelineRowHeight);
  const setTimelineRowHeight = useGlobalAppStore((state) => state.setTimelineRowHeight);

  const onPasteBrightnessOverwriteToggle = (e: boolean) => {
    dataStore.set('overwriteBrightnessWithNewBlock', e);
  };
  const onBpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.currentTarget.value);
    if (value * 60 > (dataStore.get('currentAudioDurationInMilis') as number)) {
      showPopUp(
        'Warning!',
        'The BPM is on the low side, may cause bad experience with Snap to BPM feature. Provided it is on.',
        1500
      );
    }
    setBpmForSnap(value);
  };

  const onSnapSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.currentTarget.value);
    setSnapSensitivity(value);
  };

  const onNewBlockDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.round(parseInt(e.currentTarget.value));
    if (value >= 20 && value <= 10000) {
      dataStore.set('newBlockDurationMilis', value);
    } else {
      showPopUp('Invalid Value - Glyph Duration', 'Should be between 20ms to 10s');
    }
  };

  const onNewBlockBrightnessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Max val -> 4095
    const selectedValue = parseInt(e.currentTarget.value);
    const value = Math.round((selectedValue / 100) * 4095);
    // console.log(value);
    if (selectedValue >= 1 && selectedValue <= 100) {
      dataStore.set('newBlockBrightness', value);
    } else {
      showPopUp('Invalid Value - Glyph Brightness', 'Should be between 1% to 100%');
    }
  };

  const onAudioSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.currentTarget.value);
    if (value >= 0.1 && value <= 16) {
      dataStore.set('audioSpeed', value);
      try {
        //patch via datastore
        dataStore.set('playbackSpeed', value);
      } catch (e) {
        console.error(`Error while setting audio rate: ${e}`);
      }
    } else {
      showPopUp('Invalid Value - Audio Speed', 'Should be between 0.1x to 16x');
    }
  };

  const onTimelineRowHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.currentTarget.value);
    if (value >= 10 && value <= 200) {
      setTimelineRowHeight(value);
    } else {
      showPopUp('Invalid Value - Timeline Row Height', 'Should be between 50px to 200px');
    }
  };

  // Scroll functions
  const scrollUp = () => {
    if (fieldsetRef.current) {
      fieldsetRef.current.scrollBy({ top: -100, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (fieldsetRef.current) {
      fieldsetRef.current.scrollBy({ top: 100, behavior: 'smooth' });
    }
  };

  //  UI
  return (
    <>
      {/* Config panel */}
      <form className="relative">
        {/* COntrol Grid - match height to left panel  */}
        <fieldset
          ref={fieldsetRef}
          className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 sm:gap-2 border rounded-lg px-3 sm:px-4 py-1 pb-3 hover:shadow-[0px_0px_5px_1px_#aaaaaa] duration-500 bg-[#111111] max-h-[45dvh] p-1 overflow-y-auto"
        >
          <legend
            className="-ml-1 px-1 font-medium font-[ndot] text-base sm:text-lg tracking-wide"
            ref={spanRef}
            onMouseLeave={() => {
              if (spanRef.current) {
                spanRef.current.style.textShadow = '';
              }
            }}
            onMouseEnter={() => {
              if (spanRef.current) {
                spanRef.current.style.textShadow = '#fff 8px 0 20px';
              }
            }}
          >
            SETTINGS
          </legend>
          {/* Configure Device */}
          <Label htmlFor="multiSelect" className="text-base sm:text-lg font-light">
            Device
          </Label>
          <DeviceChoiceComponent />

          {/* Configure block time */}
          <Label htmlFor="newBlockDurationMilis" className="text-base sm:text-lg font-light">
            New Glyph Duration (ms)
            <br />
          </Label>
          <Input
            id="newBlockDurationMilis"
            type="number"
            defaultValue={dataStore.get('newBlockDurationMilis') ?? 500}
            max={10000}
            min={20}
            step={1}
            onChange={onNewBlockDurationChange}
            className="text-sm sm:text-base"
          />

          {/* Configure new block brightness */}
          <Label htmlFor="newBlockBrightness" className="text-base sm:text-lg font-light">
            New Glyph Brightness (%)
            <br />
          </Label>
          <Input
            onChange={onNewBlockBrightnessChange}
            id="newBlockBrightness"
            type="number"
            defaultValue={
              (((dataStore.get('newBlockBrightness') as number) ?? 3072) / kMaxBrightness) * 100
            }
            max={100}
            min={1}
            step={1}
            className="text-sm sm:text-base"
          />

          {/* Configure audio speed */}
          <Label
            htmlFor="newBlockBrightness"
            className="text-base sm:text-lg font-light"
            title="Set audio's playback speed. Values can range from 0.5x till 2x, in steps of 0.1x, if needed."
          >
            Audio Speed
            <br />
          </Label>
          <Input
            onChange={onAudioSpeedChange}
            id="newBlockBrightness"
            type="number"
            defaultValue={dataStore.get('audioSpeed') ?? 1}
            max={16}
            min={0.1}
            step={0.05}
            className="text-sm sm:text-base"
          />

          {/* Timeline Row Height */}
          <Label
            htmlFor="timelineRowHeight"
            className="text-base sm:text-lg font-light"
            title="Set the height of each row in the timeline"
          >
            Timeline Row Height (px)
            <br />
          </Label>
          <Input
            onChange={onTimelineRowHeightChange}
            id="timelineRowHeight"
            type="number"
            defaultValue={timelineRowHeight}
            max={200}
            min={10}
            step={1}
            className="text-sm sm:text-base"
          />

          {/* MultiSelect */}
          <Label htmlFor="multiSelect" className="text-base sm:text-lg font-light">
            Enable Multi-Select
          </Label>
          <Switch
            id="multiSelect"
            onCheckedChange={toggleMultiSelect}
            checked={isMultiSelectActive}
          />

          {/* Show audio timestamp */}
          <Label
            htmlFor="showAudioTimeStamp"
            className="text-base sm:text-lg font-light"
            title="Overwrite the brightness of blocks that would be pasted with the new block brightness value?"
          >
            Show Audio TimeStamp
          </Label>
          <Switch
            id="showAudioTimeStamp"
            onCheckedChange={toggleShowAudioTimeStamp}
            checked={showAudioTimeStamp}
          />

          {/* Toggle zones feat. */}
          <Label
            htmlFor="toggleZones"
            className="text-base sm:text-lg font-light"
            title="Toggle Glyph Zones ID ? Scroll on bottom editor to trigger if it's not visible..."
          >
            Show Glyph Zones
          </Label>
          <Switch id="toggleZones" onCheckedChange={toggleZoneVisibility} checked={isZoneVisible} />

          {/* Keyboard controls */}
          <Label
            htmlFor="keyboardControls"
            className="text-base sm:text-lg font-light"
            title={`Enables keyboard controls like:\n-Pressing Spacebar to Play / Pause Audio.\n-Pressing Delete / Backspace to Delete selected Glyph Blocks\n-Shift to Select multiple at a time\n-Ctrl+Z / Cmd+Z to Undo\n-Ctrl+Y to Redo\n-Ctrl+A / Cmd + A to Select All`}
          >
            Enable Keyboard Gesture
          </Label>
          <Switch
            id="keyboardControls"
            onCheckedChange={toggleKeyboardGesture}
            checked={isKeyboardGestureEnabled}
          />

          {/* Snap to BPM feat. */}
          <Label
            htmlFor="snapToBPM"
            className="text-base sm:text-lg font-light"
            title="Enable for blocks to snap to Audio BPM?"
          >
            Snap to BPM
          </Label>
          <Switch id="snapToBPM" onCheckedChange={toggleSnapToBpm} checked={snapToBpmActive} />

          {/* Snap to BPM feat. - allow duration to also snap */}
          <Label
            htmlFor="snapToDurationToBPM"
            className="text-base sm:text-lg font-light"
            title="Enable for blocks' duration to also snap to Audio BPM? Snap to BPM must be switched on too, for this to apply."
          >
            Snap Duration to BPM
          </Label>
          <Switch
            id="snapToDurationToBPM"
            onCheckedChange={toggleAlsoSnapBlockDuration}
            checked={alsoSnapDuration}
          />

          {/* Configure BPM */}
          <Label
            htmlFor="setBPM"
            className="text-base sm:text-lg font-light"
            title="Set audio's BPM. Applies to and used to configure the above, Snap to BPM settings."
          >
            Audio BPM
            <br />
          </Label>
          <Input
            onChange={onBpmChange}
            id="setBPM"
            type="number"
            defaultValue={bpmValue}
            max={700}
            min={1}
            step={1}
            className="text-sm sm:text-base"
          />

          {/* Configure Snap Sens */}
          <Label
            htmlFor="snapSens"
            className="text-base sm:text-lg font-light"
            title="Higher value here means lower sensitivity overall."
          >
            Snap Inverse Sensitivity
            <br />
          </Label>
          <Input
            onChange={onSnapSensitivityChange}
            id="snapSens"
            type="number"
            defaultValue={snapSensitivity}
            max={25}
            min={13}
            step={1}
            className="text-sm sm:text-base"
          />

          {/* Render Heavy Ui */}
          <Label
            htmlFor="renderHeavy"
            className="text-base sm:text-lg font-light"
            title="Render more demanding UI? Only do this if PC can support it!"
          >
            Switch to Heavy UI?
          </Label>
          <Switch id="renderHeavy" onCheckedChange={toggleShowShowHeavyUi} checked={showHeavyUi} />

          {/* Glyph Preview on Hover */}
          <Label
            htmlFor="glyphZonePreviewOnHover"
            className="text-base sm:text-lg font-light"
            title="Show which Glyph Zone a Row in the Editor Corresponds to on Hover?"
          >
            Glyph Preview on Hover
          </Label>
          <Switch
            id="glyphZonePreviewOnHover"
            onCheckedChange={toggleShowHoverGlyphPreview}
            checked={showHoverGlyphPreview}
          />

          {/* Modifiable paste brightness */}
          <Label
            htmlFor="overwriteBrightness"
            className="text-base sm:text-lg font-light"
            title="Overwrite the brightness of blocks that would be pasted with the new block brightness value?"
          >
            Modify Paste Brightness
          </Label>
          <Switch
            id="overwriteBrightness"
            onCheckedChange={onPasteBrightnessOverwriteToggle}
            defaultValue={dataStore.get('overwriteBrightnessWithNewBlock')}
          />
        </fieldset>

        {/* Floating Scroll Buttons */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          <Button
            type="button"
            onClick={scrollUp}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-[#1a1a1a] border-[#333] hover:bg-[#2a2a2a] hover:border-[#555] transition-all duration-200"
            title="Scroll Up"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            onClick={scrollDown}
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-[#1a1a1a] border-[#333] hover:bg-[#2a2a2a] hover:border-[#555] transition-all duration-200"
            title="Scroll Down"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </>
  );
}
