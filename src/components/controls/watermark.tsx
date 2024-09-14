import { encodeStuffTheWayNothingLikesIt } from '@/logic/export_logic';
import { useState } from 'react';
import { DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import dataStore from '@/lib/data_store';
import { showPopUp } from '@/lib/helpers';
type Props = {
  cancelButton: React.ReactNode;
  applyAction: () => void;
};
export default function WaterMarkerComponent({ cancelButton, applyAction }: Props) {
  const [checkedBoxes, setCheckedBoxes] = useState<Set<string>>(new Set());

  const totalDurationMilis: number = dataStore.get('currentAudioDurationInMilis') ?? 1;

  const rowsPerColumn = 5;

  const totalColumns = Math.ceil(totalDurationMilis / 1000); //1 col = 1 sec

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
        className="grid overflow-x-scroll gap-6 px-2 "
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

      <DialogFooter className="flex-grow justify-between mt-2">
        {cancelButton}
        <Button onClick={handleSubmit}>Apply</Button>
      </DialogFooter>
    </>
  );
}
