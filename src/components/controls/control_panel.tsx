import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import InstructionComponent from '../timeline/instructions';

import {
  Copy,
  Clipboard,
  Trash,
  SquareDashedMousePointer,
  SquarePlus,
  DiamondPlus,
  CirclePlus,
  UndoDot,
  RedoDot,
  Scissors,
  TextCursorInput,
  ExternalLink
} from 'lucide-react';
import useGlobalAppStore, { useTemporalStore } from '@/lib/timeline_state';
import { kAppName, kAppVersion } from '@/lib/consts';
import { useRef, useState } from 'react';
import SettingsPanel from './settings_panel';
import MoreMenuButton from './more_menu_button';
import dataStore from '@/lib/data_store';

export default function MainTopPanel({
  isSaving,
  isAudioLoaded
}: {
  isSaving: boolean;
  isAudioLoaded: boolean;
}) {
  const copyItems = useGlobalAppStore((state) => state.copyItems);
  const cutItems = useGlobalAppStore((state) => state.cutItems);
  const pasteItems = useGlobalAppStore((state) => state.pasteItems);
  const selectAllItems = useGlobalAppStore((state) => state.selectAll);
  const selectInCurrentPosition = useGlobalAppStore((state) => state.selectInCurrentPosition);
  const removeSelectedItem = useGlobalAppStore((state) => state.removeSelectedItem);
  const currentDevice = useGlobalAppStore((state) => state.phoneModel);
  const fillEntireZone = useGlobalAppStore((state) => state.fillEntireZone);
  const addItem = useGlobalAppStore((state) => state.addItem);
  const { undo, redo, futureStates, pastStates } = useTemporalStore((state) => state);

  function getPosition(): number {
    const positionInMilis: number = dataStore.get('currentAudioPositionInMilis') ?? 0;
    return positionInMilis;
  }
  const [selectAll, setSelectAll] = useState<boolean>(true);
  // easter egg
  const [showEasterEgg, setShowEasterEgg] = useState<boolean>(false);
  const toggleEasterEgg = () => {
    setShowEasterEgg((v) => !v);
  };

  const deviceControlsToShow = generateDeviceControls();
  return (
    <>
      <div
        className={`grid rounded-lg p-2 sm:p-3 lg:p-4 grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 ${
          currentDevice === 'NP2' ? 'gap-2 sm:gap-3' : 'gap-3 sm:gap-4'
        }`}
      >
        {/*1st col - Title n all */}
        <TitleAndControlsPanel />

        {/* 2nd col - Config panel */}
        <SettingsPanel />
      </div>
    </>
  );

  function TitleAndControlsPanel({ className }: { className?: string }) {
    return (
      <div
        className={`flex flex-col justify-between bg-[#111111] p-1 sm:p-3 rounded-md outline outline-[#212121]
     hover:shadow-[0px_0px_5px_1px_#ffffff] duration-500 overflow-visible min-h-[200px] sm:min-h-[250px] lg:min-h-[300px] max-h-[45dvh] overflow-y-auto ${className}`}
      >
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-primary">
            <AppNameComponent playing={showEasterEgg} />
            <span className="animate-pulse duration-700 text-red-600">
              {isSaving ? '[Saving...]' : ''}
            </span>
          </h2>

          {/*  Info content */}
          <div className="text-xs sm:text-sm lg:text-base text-muted-foreground leading-relaxed">
            Make ringtones with custom glyphs for your Nothing Phone, Supports auto generation of
            glyph synced to audio too!
            <br />
            Supports: Nothing Phone (1), (2), (2a) / (2a) Plus, (3a) / (3a) Pro, 3?
            <br />
            Use on fullscreen Desktop / Laptop for best experience
            <br />
            <div className="flex items-center">
              <span
                onDoubleClick={toggleEasterEgg}
                className="cursor-pointer"
                title="Double click to toggle easter egg"
              >
                {' '}
                (v{kAppVersion})
              </span>
              <Button
                size="sm"
                variant="link"
                className="p-0 pl-2 pt-[2px] h-1/2 text-xs opacity-90"
                onClick={() => {
                  window.open(
                    'https://discord.com/channels/930878214237200394/1275717674634051661',
                    '_blank'
                  );
                }}
              >
                Contact Support <ExternalLink className="w-4 h-4 pl-1" />
              </Button>
            </div>
          </div>
        </div>

        <OpenInstructionButton />

        {isAudioLoaded && (
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            {/* Command Center */}
            <CommandCenter />
            {/* Glyph Zone Add Center */}
            <div
              className="grid grid-flow-col border border-white rounded-lg p-1 sm:p-2"
              title="Macro Buttons - Eases New Glyph Block Addition"
            >
              {deviceControlsToShow}
            </div>
          </div>
        )}
      </div>
    );
  }

  function generateDeviceControls() {
    switch (currentDevice) {
      case 'NP1':
        return (
          <div className="grid grid-cols-5 gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(0, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(1, startTimeMilis);
              }}
            >
              2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(2, startTimeMilis);
              }}
            >
              3
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(3, startTimeMilis);
              }}
            >
              4
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(4, startTimeMilis);
              }}
            >
              5
            </Button>
          </div>
        );

      case 'NP1_15':
        return (
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 xl:flex gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(0, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(1, startTimeMilis);
              }}
            >
              2
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(2, 5, startTimeMilis);
              }}
            >
              3
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(4, startTimeMilis);
              }}
            >
              3.1
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(5, startTimeMilis);
              }}
            >
              3.2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(2, startTimeMilis);
              }}
            >
              3.3
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(3, startTimeMilis);
              }}
            >
              3.4
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(7, 14, startTimeMilis);
              }}
            >
              4
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(7, 8, startTimeMilis);
              }}
            >
              4.1
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(9, 11, startTimeMilis);
              }}
            >
              4.2
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(12, 14, startTimeMilis);
              }}
            >
              4.3
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(6, startTimeMilis);
              }}
            >
              5
            </Button>
          </div>
        );

      case 'NP2':
        return (
          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-15 xl:grid-cols-15 gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(0, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(1, startTimeMilis);
              }}
            >
              2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(2, startTimeMilis);
              }}
            >
              3
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(3, 7, startTimeMilis);
              }}
            >
              4
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(8, 14, startTimeMilis);
              }}
            >
              5
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(15, 18, startTimeMilis);
              }}
            >
              6
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(19, startTimeMilis);
              }}
            >
              7
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(20, startTimeMilis);
              }}
            >
              8
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(21, startTimeMilis);
              }}
            >
              9
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(22, startTimeMilis);
              }}
            >
              10
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(23, startTimeMilis);
              }}
            >
              11
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(25, 27, startTimeMilis);
              }}
            >
              12
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(28, 30, startTimeMilis);
              }}
            >
              13
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(31, 32, startTimeMilis);
              }}
            >
              14
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(24, startTimeMilis);
              }}
            >
              15
            </Button>
          </div>
        );

      case 'NP2a':
        return (
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 xl:flex gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 23, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 7, startTimeMilis);
              }}
            >
              1.1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(8, 15, startTimeMilis);
              }}
            >
              1.2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(16, 23, startTimeMilis);
              }}
            >
              1.3
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(24, startTimeMilis);
              }}
            >
              2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                addItem(25, startTimeMilis);
              }}
            >
              3
            </Button>
          </div>
        );

      case 'NP3a':
        return (
          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 xl:flex gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 19, startTimeMilis);
              }}
            >
              1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 6, startTimeMilis);
              }}
            >
              1.1
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(7, 13, startTimeMilis);
              }}
            >
              1.2
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(14, 19, startTimeMilis);
              }}
            >
              1.3
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(20, 30, startTimeMilis);
              }}
            >
              2
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(20, 22, startTimeMilis);
              }}
            >
              2.1
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(23, 27, startTimeMilis);
              }}
            >
              2.2
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(28, 30, startTimeMilis);
              }}
            >
              2.3
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(31, 35, startTimeMilis);
              }}
            >
              3
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(31, 32, startTimeMilis);
              }}
            >
              3.1
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs sm:text-sm lg:text-base h-8 sm:h-10 lg:h-12"
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(33, 35, startTimeMilis);
              }}
            >
              3.2
            </Button>
          </div>
        );

      default:
        return <></>;
    }
  }

  function CommandCenter() {
    return (
      <>
        <div className="border rounded-lg border-white grid grid-flow-col gap-1 sm:gap-2 p-1 sm:p-2 overflow-x-auto">
          {/* copy button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
            onClick={copyItems}
            title={'Copy'}
            aria-label="copy button"
          >
            <Copy className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </Button>
          {/* Cut button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
            onClick={cutItems}
            title={'Cut'}
            aria-label="cut button"
          >
            <Scissors className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </Button>
          {/* Paste button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
            onClick={pasteItems}
            title={'Paste'}
            aria-label="paste button"
          >
            <Clipboard className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </Button>
          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
            onClick={removeSelectedItem}
            title={'Delete Selected'}
            aria-label="delete button"
          >
            <Trash className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </Button>
          {/* select all button unselect all */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
            onClick={() => {
              selectAllItems(selectAll);
              setSelectAll((v) => !v);
            }}
            title={'Select / Unselect All'}
            aria-label="select or unselect all button"
          >
            <SquareDashedMousePointer className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </Button>
          {/* Select in current position */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
            onClick={() => {
              selectInCurrentPosition();
            }}
            title={
              'Select / Unselect All Blocks at Current Audio Position; Shortcut Keys: Ctrl + Alt/Option + A'
            }
            aria-label="select items in current audio position"
          >
            <TextCursorInput className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </Button>
          {/* Undo */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
            title="Undo Changes"
            disabled={pastStates.length <= 0}
            onClick={() => {
              // twice cuz selection changes should be skipped

              undo();
              undo();
            }}
          >
            <UndoDot className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </Button>
          {/* Redo */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
            title="Redo Changes"
            disabled={futureStates.length <= 0}
            onClick={() => {
              // twice cuz selection changes should be skipped
              redo();
              redo();
            }}
          >
            <RedoDot className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          </Button>
          {/* Add All Glyphs Button */}
          {/* ========== PHONE 1  ============= */}
          {currentDevice === 'NP1' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
              title="Add all the Glyphs of NP(1) "
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 4, startTimeMilis);
              }}
            >
              <SquarePlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </Button>
          )}
          {/* ========== PHONE 1 | 15 Zone ============= */}

          {currentDevice === 'NP1_15' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
              title="Add all the Glyphs of NP(1) | 15 Zone Mode "
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 14, startTimeMilis);
              }}
            >
              <SquarePlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </Button>
          )}

          {/* Phone 2 | 33 Zone Mode | Add all glyphs */}
          {currentDevice === 'NP2' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
              title="Add all the Glyphs of NP(2) "
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 32, startTimeMilis);
              }}
            >
              <SquarePlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </Button>
          )}
          {currentDevice === 'NP2' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
              title="Fill the Top Right Glyph Zone of NP(2) "
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(3, 18, startTimeMilis);
              }}
            >
              <DiamondPlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </Button>
          )}
          {currentDevice === 'NP2' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
              title="Fill the Battery Glyph Zone of NP(2) "
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(25, 32, startTimeMilis);
              }}
            >
              <CirclePlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </Button>
          )}

          {/* Phone 2a Add all glyphs */}
          {currentDevice === 'NP2a' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
              title="Add all the Glyphs of NP(1) | 15 Zone Mode "
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 25, startTimeMilis);
              }}
            >
              <SquarePlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </Button>
          )}

          {/* Phone 2a Add all glyphs */}
          {currentDevice === 'NP3a' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 sm:h-10 lg:h-12 p-1 sm:p-2"
              title="Add all the Glyphs of NP(3a) "
              onClick={() => {
                const startTimeMilis = getPosition();
                fillEntireZone(0, 35, startTimeMilis);
              }}
            >
              <SquarePlus className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
            </Button>
          )}

          {/* More menu items */}
          <MoreMenuButton />
        </div>
      </>
    );
  }
}

export function OpenInstructionButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="left-0 w-[120px]" variant="link" title="Open instructions">
          Read Instructions
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[90vw] sm:min-w-[400px] md:min-w-[600px] lg:min-w-[900px] h-[80vh] sm:h-[450px] md:h-fit max-h-[80vh]">
        <InstructionComponent />
        <DialogFooter>
          <DialogClose asChild>
            {/* <Button type="submit">
              Ok
            </Button> */}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppNameComponent({ playing }: { playing: boolean }) {
  const kAppNameParts = kAppName.split(' ');
  const spanRef = useRef<HTMLSpanElement>(null);
  return (
    <span
      className={`${
        playing ? 'neon' : ''
      } font-[ndot] tracking-wider uppercase text-sm sm:text-base lg:text-lg xl:text-xl`}
      ref={spanRef}
      onMouseLeave={() => {
        if (spanRef.current) {
          spanRef.current.style.textShadow = '';
        }
      }}
      onMouseEnter={() => {
        if (spanRef.current) {
          spanRef.current.style.textShadow = '#fff 4px 0 20px';
        }
      }}
    >
      <span className={`${playing ? 'flicker-vslow' : ''}`}>{kAppNameParts[0]} </span>
      {kAppNameParts[1]}{' '}
      <span className={`${playing ? 'flicker-slow' : ''}`}> {kAppNameParts[2]} </span>
      {kAppNameParts[3]}{' '}
      <span className={`${playing ? 'flicker-fast' : ''}`}>{kAppNameParts[4]}</span>
    </span>
  );
}
