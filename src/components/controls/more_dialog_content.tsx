import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { kEffectNames } from '@/lib/consts';
import { DeltaUpdateBlock, GlyphGenerationModel } from '@/lib/glyph_model';

import { showPopUp } from '@/lib/helpers';
import useGlobalAppStore from '@/lib/timeline_state';
import { useState } from 'react';
import dataStore from '@/lib/data_store';
import WaterMarkerComponent from './watermark';
import { autoGenerateGlyphs } from '../auto_gen/autoGen2';
import { actuallyRestoreGlyphData } from '@/logic/export_logic';
import { newFuncTest } from '../auto_gen/autoGen1';

export default function SettingDialogContent({ dialogContentIdx }: { dialogContentIdx: number }) {
  const timelineData = useGlobalAppStore((state) => state.items);

  const audioInfo = useGlobalAppStore((state) => state.audioInformation);
  const updateSelectedItemAbsolutely = useGlobalAppStore(
    (state) => state.updateSelectedItemAbsolutely
  );
  const setIsSettingsDialogOpen = useGlobalAppStore((state) => state.setIsSettingsDialogOpen);
  // adv editing states
  // keep initial value as undefined, so that it can take up values from dataStore - settings
  const [blockDurationMilis, setBlockDurationMilis] = useState<number>();
  const [blockBrightnessPercentage, setBlockBrightnessPercentage] = useState<number>();
  const [blockStartTimeMilis, setBlockStartTimeMilis] = useState<number>();
  const [blockEffectId, setBlockEffectId] = useState<number>();

  // adv Generation - Glyph  states
  const [generationStartTimeMilis, setGenerationStartTimeMilis] = useState<number>(
    +((dataStore.get('currentAudioPositionInMilis') as number) ?? 0).toFixed(2)
  );
  const [generationEndTimeMilis, setGenerationEndTimeMilis] = useState<number>(
    +(((dataStore.get('currentAudioPositionInMilis') as number) ?? 0) + 5000).toFixed(2)
  );
  const [generationBlockDurationMilis, setGenerationBlockDurationMilis] = useState<number>(500);
  const [generationBlockBrightness, setGenerationBlockBrightness] = useState<number>(100);
  const [generationBlockEffectId, setGenerationBlockEffectId] = useState<number>(0);
  const [generationGlyphGap, setGenerationGlyphGap] = useState<number>(500);
  const [generationGlyphZone, setGenerationGlyphZone] = useState<number>(0);
  const generateGlyphs = useGlobalAppStore((state) => state.generateGlyphs);
  const currentDevice = useGlobalAppStore((state) => state.phoneModel);
  const importJsonData = useGlobalAppStore((state) => state.importJsonData);
  const [autoGenStart, setAutoGenStart] = useState(false);
  switch (dialogContentIdx) {
    // BPM Glyph Generator
    case 1:
      return (
        <DialogContent className="sm:max-w-[425px] dontClose ">
          <DialogHeader>
            <DialogTitle>Generate Glyph Blocks</DialogTitle>
            <DialogDescription>
              Generate Glyphs with following parameters. Default values will produce 1 sec interval
              metronome for 5 secs; i.e. In each second there would be a 500ms Duration Glyph Block
              followed by 500ms gap with no block; this will repeat till specified end time.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4 items-center overflow-y-auto pr-1 max-h-[50dvh]">
            {/* Configure generation start time - 1 */}
            <Label htmlFor="blockGenerationStartTime" className="text-lg font-light">
              Start From (ms)
              <br />
            </Label>
            <Input
              id="blockGenerationStartTime"
              type="number"
              max={audioInfo.durationInMilis}
              min={0}
              step={1}
              defaultValue={generationStartTimeMilis}
              onChange={onGenerationStartTimeMilisChanged}
            />

            {/* Configure generation end time - 2 */}
            <Label htmlFor="blockGenerationEndTime" className="text-lg font-light">
              Generate Till (ms)
              <br />
            </Label>
            <Input
              id="blockGenerationEndTime"
              type="number"
              max={audioInfo.durationInMilis}
              min={0}
              step={1}
              defaultValue={generationEndTimeMilis}
              onChange={onGenerationEndTimeMilisChanged}
            />

            {/* Configure block duration - 3 */}
            <Label htmlFor="blocksDurationMilis" className="text-lg font-light">
              Glyph Duration (ms)
              <br />
            </Label>
            <Input
              id="blocksDurationMilis"
              type="number"
              max={10000}
              min={50}
              step={1}
              defaultValue={generationBlockDurationMilis}
              onChange={onGenerationBlockDurationMilis}
            />

            {/* Configure block Brightness - 4 */}
            <Label htmlFor="blocksBrightness" className="text-lg font-light">
              Glyph Brightness (%)
              <br />
            </Label>
            <Input
              id="blocksBrightness"
              type="number"
              max={100}
              min={1}
              step={1}
              defaultValue={generationBlockBrightness}
              onChange={onGenerationBrightnessChanged}
            />

            {/* Configure BPM - 5 */}
            <Label htmlFor="audioBPM" className="text-lg font-light">
              Glyph Gap (ms)
              <br />
            </Label>
            <Input
              id="audioBPM"
              type="number"
              min={1}
              step={1}
              defaultValue={generationGlyphGap}
              onChange={onGenerationGapChanged}
            />

            {/* Generation Block Glyph Zone ID - 6 */}
            <Label className="text-lg font-light">
              Glyph Zone
              <br />
            </Label>
            <div>
              <Select onValueChange={onGenerationGlyphZoneChanged} defaultValue="0">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Choose Glyph Zone</SelectLabel>
                    {/* 101 to indicate -> all */}
                    <SelectItem value="101">All</SelectItem>
                    {Object.values(timelineData).map((_v, i) => {
                      return (
                        <SelectItem key={i} value={i.toString()}>
                          {i + 1}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Configure block effect - 7 */}
            <Label className="text-lg font-light">
              Glyph Effect
              <br />
            </Label>
            <div>
              <Select onValueChange={onGenerationEffectIdChanged} defaultValue="0">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Choose Effects</SelectLabel>
                    {Object.values(kEffectNames).map((v, i) => {
                      return (
                        <SelectItem key={i} value={i.toString()}>
                          {v}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-grow justify-between">
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onGenerateClick}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      );

    // case 2
    // Embed watermark
    case 2:
      return (
        <DialogContent className="sm:max-w-[700px] dontClose">
          <DialogHeader>
            <DialogTitle>
              Embed <span className="font-[ndot]">YOUR</span> Custom Watermark
            </DialogTitle>
            <DialogDescription>
              You put in the efforts, you should get to sign it a&nbsp;
              <span className="font-[ndot]">100%</span> <br />
              [This can be seen in official composer's audio preview screen at the bottom]
            </DialogDescription>
          </DialogHeader>
          <WaterMarkerComponent
            cancelButton={
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                Cancel
              </Button>
            }
            applyAction={() => setIsSettingsDialogOpen(false)}
          />
        </DialogContent>
      );

    case 3: {
      // Glyph Auto Gen Feature =============
      let ledIdx: number[][] = [[0], [1], [2], [3], [4]]; //NP1
      if (currentDevice === 'NP2') {
        ledIdx = [
          [0],
          [1],
          [2],
          //center start
          [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
          [19],
          [20],
          [21],
          [22],
          [23],
          // center end
          [24],
          [25, 26, 27, 28, 29, 30, 31, 32]
        ];
      } else if (currentDevice === 'NP2a') {
        ledIdx = [
          [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
          [24],
          [25]
        ];
      } else if (currentDevice === 'NP1_15') {
        ledIdx = [[0], [1], [2, 3, 4, 5], [6], [7, 8, 9, 10, 11, 12, 13, 14]];
      }
      return (
        <DialogContent className="sm:max-w-[700px] dontClose">
          <DialogHeader>
            <DialogTitle>
              Auto Generating Glyphs <span className="animate-pulse">(Alpha)</span>
            </DialogTitle>
            <DialogDescription>
              <br />

              <span>
                This is still very much in beta, you may not like all the effects produced. This
                can't really nail down what you want, should only be treated as a starting base that
                you can further customize as per you needs. Click "Auto Generate" to confirm and
                proceed :D
              </span>
              <br />
              <span className="text-yellow-50">
                <span className="font-bold text-yellow-200"> Warning:</span> This will replace and
                overwrite all the current Glyphs, ideally this should be used in the start!
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-grow justify-between mt-4">
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="w-[150px]"
              onClick={async () => {
                setAutoGenStart(true);

                // console.warn('deivce is: ', currentDevice, ledIdx);
                await newFuncTest({
                  ledIdx: ledIdx
                }).then((csv) => {
                  if (csv) {
                    const restoredGlyphData = actuallyRestoreGlyphData(csv);
                    if (restoredGlyphData) {
                      importJsonData(JSON.stringify(restoredGlyphData));
                    }
                  } else {
                    showPopUp('Critical Error - AutoGen 1', 'Could not auto generate Glyphs.');
                  }
                });
                setAutoGenStart(false);
                setIsSettingsDialogOpen(false);
              }}
            >
              {autoGenStart ? (
                <div className="animate-spin h-8 w-8 rounded-full border-x-black border-x"></div>
              ) : (
                'AutoGen (Beats)'
              )}
            </Button>
            <Button
              className="w-[150px]"
              onClick={async () => {
                setAutoGenStart(true);

                // console.warn('deivce is: ', currentDevice, ledIdx);
                await newFuncTest({
                  ledIdx: ledIdx,
                  antiFlicker: true
                }).then((csv) => {
                  if (csv) {
                    const restoredGlyphData = actuallyRestoreGlyphData(csv);
                    if (restoredGlyphData) {
                      importJsonData(JSON.stringify(restoredGlyphData));
                    }
                  } else {
                    showPopUp('Critical Error - AutoGen 1', 'Could not auto generate Glyphs.');
                  }
                });
                setAutoGenStart(false);
                setIsSettingsDialogOpen(false);
              }}
            >
              {autoGenStart ? (
                <div className="animate-spin h-8 w-8 rounded-full border-x-black border-x"></div>
              ) : (
                'AutoGen (Smooth)'
              )}
            </Button>
            <Button
              className="w-[150px]"
              onClick={async () => {
                setAutoGenStart(true);

                // console.warn('deivce is: ', currentDevice, ledIdx);
                await autoGenerateGlyphs({
                  ledIdx: ledIdx
                }).then((csv) => {
                  if (csv) {
                    const restoredGlyphData = actuallyRestoreGlyphData(csv);
                    if (restoredGlyphData) {
                      importJsonData(JSON.stringify(restoredGlyphData));
                    }
                  } else {
                    showPopUp('Critical Error - AutoGen 2', 'Could not auto generate Glyphs.');
                  }
                });
                setAutoGenStart(false);
                setIsSettingsDialogOpen(false);
              }}
            >
              {autoGenStart ? (
                <div className="animate-spin h-8 w-8 rounded-full border-x-black border-x"></div>
              ) : (
                'AutoGen Type 2'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      );
    }

    // Advance Edit
    // case 0
    default:
      return (
        <DialogContent className="sm:max-w-[425px] dontClose">
          <DialogHeader>
            <DialogTitle>Edit Selected Glyph Block(s)</DialogTitle>
            <DialogDescription>
              Make advance granular changes to Glyphs here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4 items-center">
            {/* Configure block start time */}
            <Label htmlFor="blocksStartTimeMilis" className="text-lg font-light">
              Glyph Start Time (ms)
              <br />
            </Label>
            <Input
              id="blocksStartTimeMilis"
              type="number"
              max={audioInfo.durationInMilis}
              min={0}
              step={1}
              onChange={onBlockStartTimeChange}
            />

            {/* Configure block duration */}
            <Label htmlFor="blocksDurationMilis" className="text-lg font-light">
              Glyph Duration (ms)
              <br />
            </Label>
            <Input
              id="blocksDurationMilis"
              type="number"
              max={10000}
              min={50}
              step={1}
              onChange={onBlockDurationChange}
            />

            {/* Configure block brightness */}
            <Label htmlFor="blocksBrightness" className="text-lg font-light">
              Glyph Brightness (%)
              <br />
            </Label>
            <Input
              id="blocksBrightness"
              type="number"
              max={100}
              min={1}
              step={1}
              onChange={onBlockBrightnessChange}
            />

            {/* Configure block effect */}
            <Label className="text-lg font-light">
              Glyph Effect
              <br />
            </Label>
            <div>
              <Select onValueChange={onBlockEffectChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Choose Effects</SelectLabel>
                    {Object.values(kEffectNames).map((v, i) => {
                      return (
                        <SelectItem key={i} value={i.toString()}>
                          {v}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-grow justify-between">
            <Button variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onAdvancedEditApply}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      );
  }

  // Adv. Generation functions

  function onGenerateClick() {
    setIsSettingsDialogOpen(false);

    const generatorInputData: GlyphGenerationModel = {
      generationStartTimeMilis: generationStartTimeMilis,
      generationEndTimeMilis: generationEndTimeMilis,
      generationDurationMilis: generationBlockDurationMilis,
      generationGapMilis: generationGlyphGap,
      generationBlockBrightnessPercentage: generationBlockBrightness,
      generationBlockEffectId: generationBlockEffectId,
      generationGlyphZone: generationGlyphZone
    };

    generateGlyphs(generatorInputData);
  }

  function onGenerationStartTimeMilisChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.currentTarget.value);
    if (value < 0 || value > audioInfo.durationInMilis) {
      showPopUp(
        'Error - Invalid Start Time',
        `Generation Start Time must be between 0ms and ${(audioInfo.durationInMilis / 1000).toFixed(
          2
        )}s (current audio duration)`,
        1500
      );
      return;
    }
    setGenerationStartTimeMilis(value);
  }
  function onGenerationEndTimeMilisChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.currentTarget.value);
    if (value < 0 || value > audioInfo.durationInMilis) {
      showPopUp(
        'Error - Invalid End Time',
        `Generation End Time must be between 0ms and ${(audioInfo.durationInMilis / 1000).toFixed(
          2
        )}s (current audio duration)`,
        1500
      );
      return;
    }
    setGenerationEndTimeMilis(value);
  }
  function onGenerationBlockDurationMilis(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.currentTarget.value);
    if (value < 20 || value > (blockStartTimeMilis ?? 0) + audioInfo.durationInMilis) {
      showPopUp(
        'Error - Invalid Duration',
        `Block Duration must be between 20ms and ${(
          ((blockStartTimeMilis ?? 0) + audioInfo.durationInMilis) /
          1000
        ).toFixed(2)}s (current audio duration)`,
        1500
      );
      return;
    }
    setGenerationBlockDurationMilis(value);
  }
  function onGenerationGapChanged(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.currentTarget.value);

    if (value < 20) {
      showPopUp('Error - Invalid Glyph Gap', `Generation Gap should be atleast of 20ms`, 1500);
      return;
    }
    setGenerationGlyphGap(value);
  }
  function onGenerationBrightnessChanged(e: React.ChangeEvent<HTMLInputElement>) {
    // Max val -> 4095
    const selectedValue = parseInt(e.currentTarget.value);
    const value = Math.round((selectedValue / 100) * 4095);
    if (selectedValue >= 1 && selectedValue <= 100) {
      setGenerationBlockBrightness(value);
    } else {
      showPopUp('Invalid Value - Glyph Brightness', 'Brightness should be between 1% to 100%');
    }
  }

  function onGenerationGlyphZoneChanged(e: string) {
    const value = parseInt(e);
    const len = Object.keys(timelineData).length;
    // For lighting up all Glyphs
    if (value === 101) {
      setGenerationGlyphZone(value);
      return;
    } else if (value > len - 1 || value < 0) {
      showPopUp('Error - Invalid Glyph Zone', 'An invalid Glyph Zone was selected.');
      return;
    }
    setGenerationGlyphZone(value);
  }
  function onGenerationEffectIdChanged(e: string) {
    const value = parseInt(e);
    const len = Object.keys(kEffectNames).length;
    if (value > len - 1 || value < 0) {
      showPopUp('Error - Invalid Effect', 'An invalid effect was selected.');
      return;
    }
    setGenerationBlockEffectId(value);
  }

  // Adv. Editing functions

  function onAdvancedEditApply() {
    setIsSettingsDialogOpen(false);
    const deltaBlock: DeltaUpdateBlock = {
      startTimeMilis: blockStartTimeMilis,
      durationMilis: blockDurationMilis,
      effectId: blockEffectId,
      startingBrightness: blockBrightnessPercentage
    };
    // console.log(deltaBlock);

    updateSelectedItemAbsolutely(deltaBlock);
  }

  function onBlockBrightnessChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Max val -> 4095
    const selectedValue = parseInt(e.currentTarget.value);
    const value = Math.round((selectedValue / 100) * 4095);
    if (selectedValue >= 1 && selectedValue <= 100) {
      setBlockBrightnessPercentage(value);
    } else {
      showPopUp('Invalid Value - Glyph Brightness', 'Should be between 1% to 100%');
    }
  }

  function onBlockDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.currentTarget.value);
    if (value < 20 || value > (blockStartTimeMilis ?? 0) + audioInfo.durationInMilis) {
      showPopUp(
        'Error - Invalid Duration',
        `Block Duration must be between 20ms and ${(
          ((blockStartTimeMilis ?? 0) + audioInfo.durationInMilis) /
          1000
        ).toFixed(2)}s (current audio duration)`,
        1500
      );
      return;
    }
    setBlockDurationMilis(value);
  }
  function onBlockStartTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.currentTarget.value);
    if (value < 0 || value > audioInfo.durationInMilis) {
      showPopUp(
        'Error - Invalid Start Time',
        `Block start time must be between 0ms and ${(audioInfo.durationInMilis / 1000).toFixed(
          2
        )}s (current audio duration)`,
        1500
      );
      return;
    }
    setBlockStartTimeMilis(value);
  }

  function onBlockEffectChange(e: string) {
    const value = parseInt(e);
    const len = Object.keys(kEffectNames).length;
    if (value > len - 1 || value < 0) {
      showPopUp('Error - Invalid Effect Option', 'An invalid effect was selected.');
      return;
    }
    setBlockEffectId(value);
  }
}
