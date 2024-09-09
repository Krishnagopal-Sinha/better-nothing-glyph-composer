import MainTopPanel from '@/components/controls/control_panel';
import useGlobalAppStore, { useTemporalStore } from '@/lib/timeline_state';
import { useEffect, useRef, useState } from 'react';
import { useFilePicker } from 'use-file-picker';
import { FileTypeValidator } from 'use-file-picker/validators';
import ffmpegService from './logic/ffmpeg_service';
import {
  generateCSV,
  encodeStuffTheWayNothingLikesIt,
  restoreAppGlyphData
} from './logic/export_logic';
import { Button } from './components/ui/button';
import InstructionComponent from './components/timeline/instructions';
import SaveDialog from './components/controls/save_dialog';
import { Toaster } from './components/ui/sonner';
import dataStore from './lib/data_store';
import FullPageAppLoaderPage from './components/ui/fullScreenLoader';
import { showError, validateCSV } from './lib/helpers';
import { EditorComponent } from './components/timeline/editor';
import AudioControlComponent from './components/controls/audioControls';
import Selecto from 'react-selecto';
export default function App() {
  // Promot user for exit confimation - leave it upto browser

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      return '';
    }

    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, []);

  // App state
  const timelineData = useGlobalAppStore((state) => state.items);
  const resetData = useGlobalAppStore((state) => state.reset);

  const currentDevice = useGlobalAppStore((state) => state.phoneModel);
  const isKeyboardGestureEnabled = useGlobalAppStore(
    (state) => state.appSettings.isKeyboardGestureEnabled
  );
  const removeSelectedItem = useGlobalAppStore((state) => state.removeSelectedItem);
  const toggleMultiSelect = useGlobalAppStore((state) => state.toggleMultiSelect);
  const isMultiSelectActive = useGlobalAppStore((state) => state.appSettings.isMultiSelectActive);
  const selectAllItems = useGlobalAppStore((state) => state.selectAll);
  const selectInCurrentPosition = useGlobalAppStore((state) => state.selectInCurrentPosition);
  const importJsonData = useGlobalAppStore((state) => state.importJsonData);
  const copyItems = useGlobalAppStore((state) => state.copyItems);
  const cutItems = useGlobalAppStore((state) => state.cutItems);
  const pasteItems = useGlobalAppStore((state) => state.pasteItems);
  const selectItems = useGlobalAppStore((state) => state.selectItems);

  const {
    undo,
    redo,
    pastStates,
    futureStates,
    clear: clearUndoRedo
  } = useTemporalStore((state) => state);
  // Scroll ref for scrolling editor
  const editorRef = useRef<HTMLDivElement>(null);
  const selectoRef = useRef(null);
  // Input file
  const [isInputLoaded, setIsInputLoaded] = useState<boolean>(false);
  const { openFilePicker, filesContent, errors, plainFiles, clear } = useFilePicker({
    readFilesContent: true,
    readAs: 'DataURL',
    accept: 'audio/*',
    multiple: false,
    validators: [new FileTypeValidator(['mp3', 'ogg'])]
  });

  // On Input File Chosen
  useEffect(() => {
    async function extractGlyphData(inputFile: File) {
      const compressedGlyphData = await ffmpegService.getGlyphData(inputFile);
      if (compressedGlyphData) {
        const restoredGlyphData = restoreAppGlyphData(compressedGlyphData);
        if (restoredGlyphData) {
          importJsonData(JSON.stringify(restoredGlyphData));
        }
      }
    }
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        setIsInputLoaded(true);
        if (plainFiles[0] && plainFiles[0].type === 'audio/ogg') {
          showError(
            'Trying to Recover Glyph Data',
            '.ogg file detected | Working in background to get data...',
            2500
          );
          extractGlyphData(plainFiles[0]);
        }
        // clear undo and stuff
        clearUndoRedo();
        return;
      } catch (e) {
        console.error('Error while loading audio file:', e);
      }
    } else if (errors.length > 0) {
      console.error('Error while selecting audio file:', errors);
      alert(`File error.\nError while loading input audio file, possible file format mismatch.`);
    }
    // edge case error handling
    if (isInputLoaded) {
      setIsInputLoaded(false);
      dataStore.set('isAudioLoaded', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filesContent, errors]);

  if (errors.length) {
    console.error(`Failed to pick file: ${errors}`);
  }

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

  // Key Gesture Handlers
  useEffect(() => {
    // Keyboard Controls

    // Delete
    function onDeleteOrBackspaceKeyDown(e: KeyboardEvent) {
      if (e.code === 'Delete' || (e.code === 'Backspace' && !dataStore.get('isMoreMenuOpen'))) {
        removeSelectedItem();
      }
    }
    // Toggle multi select to on when shift is pressed down
    function onShiftKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && !isMultiSelectActive) {
        toggleMultiSelect(true);
      }
    }
    // Toggle multi select to off when shift is pressed down
    function onShiftKeyUp(e: KeyboardEvent) {
      if (e.key === 'Shift' && isMultiSelectActive) {
        toggleMultiSelect(false);
      }
    }
    // Select all - intercept regular ctrl + a
    function onCtrlAKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA' && !e.altKey) {
        // console.log("intercepting select all!");
        selectAllItems();
        e.preventDefault();
      }
    }
    // Select in current audio position
    function onCtrlAltAKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === 'KeyA') {
        selectInCurrentPosition();
        e.preventDefault();
      }
    }
    // Copy Selected
    function onCtrlCKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        copyItems();
      }
    }
    // Cut Selected
    function onCtrlXKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyX') {
        cutItems();
      }
    }
    // Paste Selected
    function onCtrlVKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        pasteItems();
      }
    }
    // Undo
    function onCtrlZKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        // call it twice cuz of selection thingy to skip selection change,improve on this, same wid redo
        if (pastStates.length <= 0) {
          console.error('Error - Nothing to undo!');
          showError('Action Skipped - Nothing to Undo', "There's nothing to Undo.");

          return;
        }
        undo();
        undo();
      }
    }
    // Redo
    function onCtrlYKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === 'KeyY') {
        if (futureStates.length <= 0) {
          console.error('Error - Nothing to Redo!');
          showError('Action Skipped - Nothing to Rndo', "There's nothing to Rndo.");

          return;
        }
        redo();
        redo();
      }
    }
    if (isInputLoaded && isKeyboardGestureEnabled) {
      // play pause stuff
      window.addEventListener('keydown', onDeleteOrBackspaceKeyDown);
      window.addEventListener('keydown', onShiftKeyDown);
      window.addEventListener('keyup', onShiftKeyUp);
      window.addEventListener('keydown', onCtrlAKeyDown);
      window.addEventListener('keydown', onCtrlAltAKeyDown);
      window.addEventListener('keydown', onCtrlCKeyDown);
      window.addEventListener('keydown', onCtrlXKeyDown);
      window.addEventListener('keydown', onCtrlVKeyDown);
      window.addEventListener('keydown', onCtrlZKeyDown);
      window.addEventListener('keydown', onCtrlYKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', onDeleteOrBackspaceKeyDown);
      window.removeEventListener('keydown', onShiftKeyDown);
      window.removeEventListener('keyup', onShiftKeyUp);
      window.removeEventListener('keydown', onCtrlAKeyDown);
      window.removeEventListener('keydown', onCtrlAltAKeyDown);
      window.removeEventListener('keydown', onCtrlCKeyDown);
      window.removeEventListener('keydown', onCtrlXKeyDown);
      window.removeEventListener('keydown', onCtrlVKeyDown);
      window.removeEventListener('keydown', onCtrlZKeyDown);
      window.removeEventListener('keydown', onCtrlYKeyDown);
    };
  }, [
    isKeyboardGestureEnabled,
    isInputLoaded,
    removeSelectedItem,
    toggleMultiSelect,
    isMultiSelectActive,
    selectAllItems,
    selectInCurrentPosition,
    copyItems,
    pasteItems,
    undo,
    redo,
    pastStates,
    futureStates,
    cutItems
  ]);

  if (!ffmpegLoaded) {
    return <FullPageAppLoaderPage />;
  }
  // UI
  return (
    <main>
      {/* Toast setup */}
      <Toaster visibleToasts={2} position="top-center" duration={700} />
      {/* Keep class here instead of main cuz otherwise grid would include toaster and that would ruin layout */}
      {isSaving && <SaveDialog isOpen={true} />}

      {/* Upper Section - Fixed */}
      {/* Mobile Only - load audio */}
      <div className="px-4 py-4 w-full overflow-auto">
        {!isInputLoaded ? (
          <Button
            variant="outline"
            className=" sm:hidden mb-[10px] p-6 text-lg font-normal border-white w-full"
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
        <div className={`space-y-4 `}>
          {/* Main Top Half Component */}
          <MainTopPanel isSaving={isSaving} isAudioLoaded={isInputLoaded} />

          {/* Load audio n play controls  */}
          {!isInputLoaded && (
            <Button
              className="w-full py-6  font-normal hidden font-[ndot] uppercase tracking-wider text-xl sm:inline-flex hover:bg-black hover:outline hover:text-white duration-700"
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

      {/* Lower Section */}

      {!isInputLoaded ? (
        <InstructionComponent />
      ) : (
        <EditorComponent
          editorRef={editorRef}
          timelineData={timelineData}
          selectoRef={selectoRef}
          // currentAudioPosition={currentPosition}
        >
          <Selecto
            ref={selectoRef}
            container={document.getElementById('select-container')}
            selectableTargets={['.target-block']}
            selectFromInside={false}
            selectByClick={true}
            continueSelect={false}
            continueSelectWithoutDeselect={true}
            toggleContinueSelect={'shift'}
            toggleContinueSelectWithoutDeselect={[['ctrl'], ['meta']]}
            hitRate={0}
            onSelectEnd={(e) => {
              selectItems(e.selected.map((element) => element.getAttribute('data-id')) as string[]);
            }}
            onScroll={(e) => {
              editorRef.current.scrollBy(e.direction[0] * 10, e.direction[1] * 10);
            }}
            scrollOptions={{
              container: editorRef.current,
              throttleTime: 30,
              threshold: 0
            }}
          />
          <AudioControlComponent
            onCloseButtonClicked={onCloseButtonClick}
            isSaving={isSaving}
            onSaveButtonClicked={onSaveButtonClick}
            editorRef={editorRef}
            audioUrl={filesContent[0].content}
          />
        </EditorComponent>
      )}
    </main>
  );

  // Audio Controls
  function loadAudioFile() {
    // Close audio does these clean ups
    resetData();
    clear();
    openFilePicker();
  }

  function stopAudio() {
    stop();
  }

  function onCloseButtonClick() {
    // Reset All Possible States - cleanup
    stopAudio();
    clear();
    setIsInputLoaded(false);
    // clear up loop data
    dataStore.set('loopAPositionInMilis', undefined);
    dataStore.set('loopAPositionInMilis', undefined);
    resetData();
  }

  async function onSaveButtonClick() {
    const inputFile = plainFiles[0];
    const processedEditData = encodeStuffTheWayNothingLikesIt(
      generateCSV(timelineData, dataStore.get('currentAudioDurationInMilis') as number)
    );
    if (inputFile && processedEditData && validateCSV(processedEditData) && !isSaving) {
      setIsSaving(true);
      console.log('Save started...');
      await ffmpegService.saveOutput(plainFiles[0], processedEditData, currentDevice).then(() => {
        setIsSaving(false);
      });
    } else {
      console.warn(
        'Save file error: No input file detected or another save process is ongoing / some error occured.'
      );
    }
  }
}
