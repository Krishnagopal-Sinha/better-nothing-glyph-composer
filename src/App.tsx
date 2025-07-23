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
import LegacyAudioEditPopup from './components/controls/legacyAudioEditPopup';
import { Toaster } from './components/ui/sonner';
import dataStore from './lib/data_store';
import FullPageAppLoaderPage from './components/ui/fullScreenLoader';
import { showPopUp, validateCSV } from './lib/helpers';
import { EditorComponent } from './components/timeline/editor';
import AudioControlComponent from './components/controls/audioControls';
import { kWidthBound } from './lib/consts';
import GlyphPreviewComponent from './components/controls/glyph_preview';

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
  const selectAllItems = useGlobalAppStore((state) => state.selectAll);
  const selectInCurrentPosition = useGlobalAppStore((state) => state.selectInCurrentPosition);
  const importJsonData = useGlobalAppStore((state) => state.importJsonData);
  const copyItems = useGlobalAppStore((state) => state.copyItems);
  const cutItems = useGlobalAppStore((state) => state.cutItems);
  const pasteItems = useGlobalAppStore((state) => state.pasteItems);
  const {
    undo,
    redo,
    pastStates,
    futureStates,
    clear: clearUndoRedo
  } = useTemporalStore((state) => state);
  // Scroll ref for scrolling editor
  const editorRef = useRef<HTMLDivElement>(null);
  // Input file
  const [isInputLoaded, setIsInputLoaded] = useState<boolean>(false);
  const [showAudioEditor, setShowAudioEditor] = useState<boolean>(false);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string>('');
  const [processedAudioFile, setProcessedAudioFile] = useState<File | null>(null);
  const { openFilePicker, filesContent, errors, plainFiles, clear } = useFilePicker({
    readFilesContent: true,
    readAs: 'DataURL',
    accept: 'audio/*',
    multiple: false,
    validators: [new FileTypeValidator(['mp3', 'ogg'])]
  });

  // On Input File Chosen
  useEffect(() => {
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        // Set the uploaded file and show audio editor
        setUploadedAudioFile(plainFiles[0]);
        setShowAudioEditor(true);
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

  // Handle trimmed audio save
  const handleTrimmedAudioSave = async (trimmedAudioBlob: Blob, originalFile: File) => {
    try {
      // Convert blob to file
      const trimmedFile = new File([trimmedAudioBlob], 'trimmed_audio.wav', { type: 'audio/wav' });

      // Store the processed audio file for saving
      setProcessedAudioFile(trimmedFile);

      // Create URL for the trimmed audio
      const audioUrl = URL.createObjectURL(trimmedAudioBlob);
      setProcessedAudioUrl(audioUrl);

      // Extract glyph data from the ORIGINAL file to preserve embedded data
      // This is especially important for .ogg files where glyph data might be embedded
      let glyphDataRestored = false;
      if (originalFile) {
        try {
          console.log(
            `Extracting glyph data from original file: ${originalFile.name} (${originalFile.type})`
          );
          const compressedGlyphData = await ffmpegService.getGlyphData(originalFile);
          if (compressedGlyphData) {
            console.log('Glyph data found in original file, restoring...');
            const restoredGlyphData = restoreAppGlyphData(compressedGlyphData);
            if (restoredGlyphData) {
              // Check device compatibility before importing
              const zonesInImportedData = Object.keys(restoredGlyphData).length;
              const currentZones = Object.keys(useGlobalAppStore.getState().items).length;

              if (zonesInImportedData === currentZones) {
                importJsonData(JSON.stringify(restoredGlyphData));
                glyphDataRestored = true;
                console.log('Glyph data successfully restored from original file');
              } else {
                console.log(
                  `Device mismatch: imported data has ${zonesInImportedData} zones, current device has ${currentZones} zones`
                );
                // Don't set glyphDataRestored = true since the data wasn't actually imported
              }
            } else {
              console.warn('Failed to restore glyph data from original file');
            }
          } else {
            console.log('No glyph data found in original file');
          }
        } catch (glyphError) {
          console.error('Error extracting glyph data from original file:', glyphError);
          // Don't fail the entire process if glyph extraction fails
          // The trimmed audio will still be loaded without glyph data
        }
      }

      setIsInputLoaded(true);
      clearUndoRedo();

      // Show appropriate success message based on whether glyph data was restored
      const successMessage = glyphDataRestored
        ? 'Trimmed audio loaded successfully with preserved glyph data!'
        : 'Trimmed audio loaded successfully!';

      showPopUp('Audio Loaded', successMessage, 1500);
    } catch (error) {
      console.error('Error processing trimmed audio:', error);
      showPopUp('Error', 'Failed to process trimmed audio. Please try again.', 2000);
    }
  };

  // Handle audio editor close
  const handleAudioEditorClose = () => {
    setShowAudioEditor(false);
    setUploadedAudioFile(null);
    // Clear the file picker
    clear();
  };

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
      if (e.shiftKey) {
        toggleMultiSelect(true);
      }
    }
    // Toggle multi select to off when shift is pressed down
    function onShiftKeyUp(e: KeyboardEvent) {
      if (e.key === 'Shift') {
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
          showPopUp('Action Skipped - Nothing to Undo', "There's nothing to Undo.");

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
          showPopUp('Action Skipped - Nothing to Rndo', "There's nothing to Rndo.");

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
    <main className="min-h-screen bg-background">
      {/* Toast setup */}
      <Toaster visibleToasts={2} position="top-center" duration={700} />
      {/* Keep class here instead of main cuz otherwise grid would include toaster and that would ruin layout */}
      {isSaving && <SaveDialog isOpen={true} />}

      {/* Audio Editor Dialog */}
      {uploadedAudioFile && (
        <LegacyAudioEditPopup
          isOpen={showAudioEditor}
          onClose={handleAudioEditorClose}
          onSave={handleTrimmedAudioSave}
          audioFile={uploadedAudioFile}
        />
      )}

      {/* Upper Section - W Fixed */}
      <div className={`p-0 mx-auto max-w-[2280px]`} style={{ width: `${kWidthBound}%` }}>
        {/* load audio */}
        {!isInputLoaded && (
          <div className="flex justify-center px-1 sm:px-3">
            <Button
              variant="outline"
              className={`py-4 sm:py-6 font-normal font-[ndot] uppercase tracking-wider text-lg sm:text-xl sm:inline-flex bg-white text-black hover:bg-black hover:outline hover:text-white duration-700 mx-auto mt-2 w-full`}
              onClick={(e) => {
                e.preventDefault();
                loadAudioFile();
              }}
            >
              Load Audio
            </Button>
          </div>
        )}
        <div className={`max-h-[48dvh] relative overflow-y-auto`}>
          {/* Main Top Half Component */}
          <MainTopPanel isSaving={isSaving} isAudioLoaded={isInputLoaded} />
        </div>
      </div>

      {isInputLoaded && <GlyphPreviewComponent isAudioLoaded={isInputLoaded} />}

      {/* Lower Section */}

      {!isInputLoaded ? (
        <InstructionComponent />
      ) : (
        <EditorComponent
          editorRef={editorRef}
          timelineData={timelineData}
          // currentAudioPosition={currentPosition}
        >
          <AudioControlComponent
            onCloseButtonClicked={onCloseButtonClick}
            isSaving={isSaving}
            onSaveButtonClicked={onSaveButtonClick}
            editorRef={editorRef}
            audioUrl={processedAudioUrl || filesContent[0]?.content || ''}
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

  function onCloseButtonClick() {
    // Reset All Possible States - cleanup
    clear();
    setIsInputLoaded(false);
    setShowAudioEditor(false);
    setUploadedAudioFile(null);
    setProcessedAudioUrl('');
    setProcessedAudioFile(null);
    // clear up loop data
    dataStore.set('loopAPositionInMilis', undefined);
    dataStore.set('loopAPositionInMilis', undefined);
    resetData();
  }

  async function onSaveButtonClick() {
    // Use processed audio file if available, otherwise use original file
    const inputFile = processedAudioFile || plainFiles[0];
    const processedEditData = encodeStuffTheWayNothingLikesIt(generateCSV(timelineData));
    if (inputFile && processedEditData && validateCSV(processedEditData) && !isSaving) {
      setIsSaving(true);
      await ffmpegService.saveOutput(inputFile, processedEditData, currentDevice).then(() => {
        setIsSaving(false);
      });
    } else {
      console.warn(
        'Save file error: No input file detected or another save process is ongoing / some error occured.'
      );
    }
  }
}
