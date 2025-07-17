import { encodeStuffTheWayNothingLikesIt } from '@/logic/export_logic';
import { useEffect, useState } from 'react';
import { DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import dataStore from '@/lib/data_store';
import { getDateTime, showPopUp } from '@/lib/helpers';
import fileDownload from 'js-file-download';
import { useFilePicker } from 'use-file-picker';

type Props = {
  cancelButton: React.ReactNode;
  applyAction: () => void;
  isDialogOpen: boolean;
};

// Session storage key for watermark state
const WATERMARK_STORAGE_KEY = 'watermark_checked_boxes';

export default function WaterMarkerComponent({ cancelButton, applyAction, isDialogOpen }: Props) {
  const [checkedBoxes, setCheckedBoxes] = useState<Set<string>>(new Set());
  const { openFilePicker, filesContent, errors } = useFilePicker({
    accept: '.json',
    multiple: false
  });
  const totalDurationMilis: number = dataStore.get('currentAudioDurationInMilis') ?? 1;

  const rowsPerColumn = 5;

  const totalColumns = Math.ceil(totalDurationMilis / 1000); //1 col = 1 sec

  // Load watermark state from session storage when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      try {
        const savedWatermark = sessionStorage.getItem(WATERMARK_STORAGE_KEY);
        if (savedWatermark) {
          const savedBoxes = JSON.parse(savedWatermark);
          setCheckedBoxes(new Set(savedBoxes));
        }
      } catch (error) {
        console.error('Error loading watermark from session storage:', error);
        // Clear corrupted data
        sessionStorage.removeItem(WATERMARK_STORAGE_KEY);
      }
    }
  }, [isDialogOpen]);

  const handleCheckboxChange = (x: number, y: number) => {
    const key = `${x}-${y}`;
    setCheckedBoxes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key); // Uncheck
      } else {
        newSet.add(key); // Check
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (filesContent.length > 0 && filesContent[0]?.content) {
      try {
        const arr = JSON.parse(filesContent[0].content);
        const checkBoxSet = new Set(arr) as Set<string>;
        setCheckedBoxes(checkBoxSet);
      } catch (e) {
        console.error('Error while loading Watermark file:', e);
        showPopUp(
          `Import Error`,
          `Error while importing watermark file, possible file format mismatch?`,
          1200
        );
      }
    } else if (errors.length > 0) {
      console.error('Error while selecting Watermark data file:', errors);
      alert(
        `File error.\nError while importing Glyph watermark file, possible file format mismatch?`
      );
    }
  }, [filesContent, errors]);

  const handleExport = () => {
    const jsonString = JSON.stringify([...checkedBoxes], null, 2); //prettify it with spacing of 2
    fileDownload(jsonString, `watermark_export_${getDateTime()}.json`);
  };

  const handleImport = () => {
    openFilePicker();
  };

  const handleClearWatermark = () => {
    setCheckedBoxes(new Set());
    // Clear from session storage
    sessionStorage.removeItem(WATERMARK_STORAGE_KEY);
    // Clear from data store
    dataStore.set('exportCustom1', 'eNoDAAAAAAE=');
    showPopUp('Watermark Cleared', 'Your custom watermark has been cleared.', 950);
  };

  const handleSubmit = () => {
    // sort for safety
    const sortedResult = Array.from(checkedBoxes).sort((a, b) => {
      const [xA] = a.split('-').map(Number);
      const [xB] = b.split('-').map(Number);
      return xA - xB;
    });

    const processedOfficialComposerPreviewData = encodeStuffTheWayNothingLikesIt(
      sortedResult.join(',')
    );
    // alert(sortedResult.join(','));

    dataStore.set('exportCustom1', processedOfficialComposerPreviewData);

    // Save to session storage for persistence
    sessionStorage.setItem(WATERMARK_STORAGE_KEY, JSON.stringify([...checkedBoxes]));

    // console.log(
    //   '✌️processedOfficialComposerPreviewData --->',
    //   processedOfficialComposerPreviewData
    // );
    showPopUp('Watermark Applied', 'Your custom watermark is set to be applied on export.', 950);
    applyAction(); //closes dialog
  };

  return (
    <>
      <div
        className="grid overflow-x-scroll gap-2 sm:gap-6 px-2"
        style={{
          gridTemplateColumns: `repeat(${totalColumns}, minmax(0, 1fr))`
          //   maxWidth: `${160 * totalColumns * 50}px`
        }}
      >
        {/* Generate total columns - represents seconds */}
        {Array.from({ length: totalColumns }).map((_, x) => (
          <div key={x} className="flex flex-col items-center space-y-1">
            {/* Generate total rows - represents glyph button on official composer app 1 to 5 only */}
            {Array.from({ length: rowsPerColumn }).map((_, y) => {
              // x 1000 cuz representing seconds
              const key = `${x * 1000}-${y}`;
              return (
                <input
                  key={key}
                  type="checkbox"
                  checked={checkedBoxes.has(key)}
                  onChange={() => handleCheckboxChange(x * 1000, y)}
                  //   Custom class for nothing -esque look | at -> index.css
                  className="checkbox-round"
                />
              );
            })}
          </div>
        ))}
      </div>

      <DialogFooter className="mt-4 flex flex-col sm:flex-row sm:justify-between justify-between sm:items-center items-center gap-2 sm:gap-0">
        <div className="space-x-2 flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleImport} className="text-xs sm:text-sm">
            Import Watermark
          </Button>
          <Button variant="outline" onClick={handleExport} className="text-xs sm:text-sm">
            Export Watermark
          </Button>
          <Button
            variant="outline"
            onClick={handleClearWatermark}
            className="text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Clear
          </Button>
        </div>

        <div className="space-x-2 flex flex-wrap gap-2">
          {cancelButton}
          <Button onClick={handleSubmit} className="text-xs sm:text-sm">
            Apply
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
