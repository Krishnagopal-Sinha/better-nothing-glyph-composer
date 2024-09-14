import { toast } from 'sonner';
import { GlyphBlock, GlyphStore } from './glyph_model';
import { nanoid } from 'nanoid';
import dataStore from './data_store';
import { kTimeStepMilis } from './consts';
import { generateEffectData } from '@/logic/export_logic';

// Remove extra blocks on imported .ogg
export function removeAudioBoundsViolators(effects: GlyphStore, audioDuration: number): GlyphStore {
  const finalData: GlyphStore = {};

  Object.keys(effects).forEach((key: string) => {
    finalData[+key] = effects[+key].filter((block) => {
      // Check if the effect's start time or end time exceeds the audio duration
      return block.startTimeMilis < audioDuration && block.startTimeMilis + block.durationMilis > 0;
    });
  });

  return finalData;
}

export function generateNewGlyphBlock(
  glyphId: number,
  startTimeMilis: number,
  durationMilis?: number,
  startingBrightness?: number,
  effectId?: number
): GlyphBlock {
  const blockEffectId = effectId ?? 0;
  const blockDuration = durationMilis ?? dataStore.get('newBlockDurationMilis') ?? 500; //safety
  const blockStartingBrightness = startingBrightness ?? dataStore.get('newBlockBrightness') ?? 4095;
  const effectData: number[] = [];

  // generate effect data
  const endIndex = Math.floor(blockDuration / kTimeStepMilis);
  for (let i = 0; i < endIndex; i++) {
    effectData.push(generateEffectData(blockEffectId, blockStartingBrightness, i, endIndex));
  }
  // console.log(effectData);
  return {
    id: nanoid(),
    glyphId,
    startTimeMilis,
    durationMilis: blockDuration,
    startingBrightness: blockStartingBrightness,
    isSelected: false,
    effectId: blockEffectId,
    effectData: effectData
  };
}

// Snap To BPM feat.
export function calculateBeatDurationInMilis(bpm: number): number {
  return (60 * 1000) / bpm; //in millis
}
export function snapToNearestBeat(
  timeInMillis: number,
  beatDuration: number,
  direction: 'left' | 'right'
): number {
  if (direction === 'right') {
    return Math.ceil(timeInMillis / beatDuration) * beatDuration;
  } else {
    return Math.floor(timeInMillis / beatDuration) * beatDuration;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  } as T;
}

// sort
export function sortObjectByStartTimeMilis(input: GlyphStore): GlyphStore {
  const sortedObject: GlyphStore = {};

  for (let i = 0; i < Object.keys(input).length; i++) {
    sortedObject[i] = input[i].sort(
      (a: GlyphBlock, b: GlyphBlock) => a.startTimeMilis - b.startTimeMilis
    );
  }

  return sortedObject;
}

// Validate imported JSON
export function validateJsonStructure(obj: unknown): obj is GlyphStore {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  for (const key in obj as Record<string, unknown>) {
    const value = (obj as Record<string, unknown>)[key];

    // value must be an array
    if (!Array.isArray(value)) {
      return false;
    }

    // validate each item cuz some guy definitely gonna manually n mess up a .json just to feel something
    for (const item of value) {
      if (typeof item !== 'object' || item === null) {
        return false;
      }

      if (typeof item.id !== 'string') return false;
      if (typeof item.glyphId !== 'number' || item.glyphId < 0) return false;
      if (typeof item.startTimeMilis !== 'number' || item.startTimeMilis < 0) return false;
      if (typeof item.durationMilis !== 'number' || item.durationMilis < 0) return false;
      if (typeof item.startingBrightness !== 'number' || item.startingBrightness < 0) return false;
      if (typeof item.isSelected !== 'boolean') return false;
      if (typeof item.effectId !== 'number' || item.effectId < 0) return false;
      if (!Array.isArray(item.effectData)) return false;
    }
  }

  return true;
}

// get pretty time - for audio position display; does not account for hours
export function getPrettyTime(currentTime: number, duration: number): string {
  function formatTime(seconds: number): string {
    const fullSeconds = Math.floor(seconds);
    const minutes = Math.floor(fullSeconds / 60);
    const secs = fullSeconds % 60;

    const milliseconds = Math.floor((seconds - fullSeconds) * 1000);
    const milliString = String(milliseconds).padStart(3, '0').slice(0, 2);

    if (minutes > 0) {
      const formattedSeconds = String(secs).padStart(2, '0');
      return `${minutes}:${formattedSeconds}`;
    } else {
      return `${secs}.${milliString}`;
    }
  }

  const formattedCurrentTime = formatTime(currentTime);
  const formattedDuration = formatTime(duration);

  return `${formattedCurrentTime} / ${formattedDuration}`;
}

// get pretty date - for file names
export function getDateTime(): string {
  const now = new Date(Date.now());

  const formattedDate =
    `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')}@` +
    `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  return formattedDate;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// function throttle(func: (...args: any[]) => void, limit: number) {
//   let lastFunc: ReturnType<typeof setTimeout>;
//   let lastRan: number | undefined;
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   return function (...args: any[]) {
//     if (!lastRan) {
//       func(...args);
//       lastRan = Date.now();
//     } else {
//       clearTimeout(lastFunc);
//       lastFunc = setTimeout(
//         () => {
//           if (Date.now() - lastRan! >= limit) {
//             func(...args);
//             lastRan = Date.now();
//           }
//         },
//         limit - (Date.now() - lastRan)
//       );
//     }
//   };
// }

// eslint-disable-next-line react-refresh/only-export-components, @typescript-eslint/no-explicit-any
export function throttle(func: (...args: any[]) => void, limit: number) {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number | undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (...args: any[]) {
    if (!lastRan) {
      // Delay the first call instead of calling it immediately
      lastRan = Date.now();
      lastFunc = setTimeout(() => {
        func(...args);
        lastRan = Date.now();
      }, limit);
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if (Date.now() - lastRan! >= limit) {
          func(...args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

const throttledShowError = throttle((message: string, description: string, duration?: number) => {
  toast.error(message, {
    description,
    action: {
      label: 'Ok',
      onClick: () => {}
    },
    duration: duration
  });
}, 1400);

export function showError(message: string, description: string, duration?: number) {
  throttledShowError(message, description, duration);
}

export const insertInSortedOrder = (items: GlyphBlock[], newItem: GlyphBlock): GlyphBlock[] => {
  const index = items.findIndex((item) => item.startTimeMilis > newItem.startTimeMilis);
  if (index === -1) return [...items, newItem];
  return [...items.slice(0, index), newItem, ...items.slice(index)];
};

export function canAddItem2(
  newItem: GlyphBlock,
  existingItems: GlyphBlock[],
  audioDurationInMilis: number,
  skipIndex: number = -1,
  suppressErrorIfOffsetTryRemaining: boolean = false
): boolean {
  if (newItem.durationMilis <= 0 || newItem.startTimeMilis < 0) {
    showError('Error - Item not added', 'Invalid start time or duration.');
    return false;
  }

  if (
    newItem.startTimeMilis >= audioDurationInMilis ||
    newItem.startTimeMilis + newItem.durationMilis > audioDurationInMilis
  ) {
    showError(
      'Error - Item not added or modified',
      "Glyph timings must be within audio's time bounds."
    );
    return false;
  }

  if (newItem.durationMilis < 20) {
    showError('Error - Item not added or modified', 'Glyph block duration must be least 20s!');
    return false;
  }

  // allow add if empty cuz duh..
  if (existingItems.length === 0) {
    return true;
  }

  const index = findInsertionIndex(existingItems, newItem.startTimeMilis);

  // right neighbor check
  if (index < existingItems.length) {
    const rightNeighbor = existingItems[index];
    //check current if updating
    if (index !== skipIndex) {
      if (newItem.startTimeMilis + newItem.durationMilis > rightNeighbor.startTimeMilis) {
        // Error dispatched, suppress if offset try is remaining!
        if (!suppressErrorIfOffsetTryRemaining) {
          showError(
            'Error - A Block was not added or modified',
            'New block duration exceeds or overlaps with the start time of the next block.'
          );
        }

        return false;
      }
    }
  }

  // left neighbour check
  if (index > 0) {
    const leftNeighbor = existingItems[index - 1];
    if (index - 1 !== skipIndex) {
      if (newItem.startTimeMilis < leftNeighbor.startTimeMilis + leftNeighbor.durationMilis) {
        // Error dispatched, suppress if offset try is remaining!
        if (!suppressErrorIfOffsetTryRemaining) {
          showError(
            'Error - A Block was not added or modified',
            'Overlap with the left neighbor Glyph block detected.'
          );
        }

        return false;
      }
    }
  }

  // update logic
  if (skipIndex >= 0 && skipIndex < existingItems.length) {
    const prevIndex = skipIndex > 0 ? skipIndex - 1 : -1;
    const nextIndex = skipIndex < existingItems.length - 1 ? skipIndex + 1 : -1;

    // Check previous neighbor
    if (prevIndex >= 0) {
      const prevNeighbor = existingItems[prevIndex];
      if (newItem.startTimeMilis < prevNeighbor.startTimeMilis + prevNeighbor.durationMilis) {
        showError(
          'Error - A Block was not added or modified',
          'Overlap with the Glyph block on the left detected.'
        );
        return false;
      }
    }

    // Check next neighbor
    if (nextIndex >= 0) {
      const nextNeighbor = existingItems[nextIndex];
      if (newItem.startTimeMilis + newItem.durationMilis > nextNeighbor.startTimeMilis) {
        showError(
          'Error - A Block was not added or modified',
          'Overlap with the Glyph block on the right detected.'
        );
        return false;
      }
    }
  }

  return true;
}

function findInsertionIndex(items: GlyphBlock[], startTimeMilis: number): number {
  let low = 0;
  let high = items.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (items[mid].startTimeMilis < startTimeMilis) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

// TODO: Optimize this if possible
export function basicCanAddCheck(
  newItem: GlyphBlock,
  existingItems: GlyphBlock[],
  audioDurationInMilis: number,
  skipIndex: number = -1
): boolean {
  // Basic check
  if (newItem.durationMilis > 0 && newItem.startTimeMilis >= 0) {
    /* empty */
  } else {
    showError('Error - Item not added', 'Invalid start time or duration.');
    return false;
  }

  // Check if item if out of bounds
  if (
    newItem.startTimeMilis < audioDurationInMilis &&
    newItem.startTimeMilis + newItem.durationMilis <= audioDurationInMilis
  ) {
    // empty
  } else {
    showError(
      'Error - Item not added',
      "Glyph timings must be within audio's time bounds.\nYes, the UI might say otherwise but the audio has reached it's end"
    );
    return false;
  }

  for (let i = 0; i < existingItems.length; i++) {
    const currentItem = existingItems[i];
    if (skipIndex >= 0 && skipIndex === i) continue; //skip this iter
    //^ for update check

    if (
      newItem.startTimeMilis < currentItem.startTimeMilis + currentItem.durationMilis &&
      newItem.startTimeMilis + newItem.durationMilis > currentItem.startTimeMilis
    ) {
      showError(
        'Error - Item not added or modified',
        'Overlap with another existing Glyph detected'
      );

      return false;
    }
  }

  return true;
}
export function convertArrayToObjects(
  arr: number[][],
  lookAheadLimit: number = 3,
  changeThreshold: number = 3096
): GlyphStore {
  const result: GlyphStore = {};
  const arrayLength = arr[0].length;

  for (let col = 0; col < arrayLength; col++) {
    result[col] = [];

    let row = 0;
    while (row < arr.length) {
      if (arr[row][col] > 0) {
        const startTimeMilis = row * kTimeStepMilis;
        let durationMilis = kTimeStepMilis;
        const effectData = [arr[row][col]];

        let lookAheadCount = 0;
        let lookAhead = 1;
        let endRow = row;

        // Perform the look-ahead to determine the duration of the effect
        while (lookAhead + row < arr.length) {
          const currentValue = arr[row + lookAhead][col];
          const previousValue = arr[row + lookAhead - 1][col];
          if (currentValue > 0) {
            // check for abrupt change
            if (Math.abs(currentValue - previousValue) >= changeThreshold) {
              break; //make into seperate effect
            }
            effectData.push(currentValue);
            durationMilis += kTimeStepMilis;
            lookAheadCount = 0;
            endRow = row + lookAhead; // update endRow to the last non-zero value
          } else {
            lookAheadCount++;
            if (lookAheadCount >= lookAheadLimit) {
              break;
            }
          }
          lookAhead++;
        }

        const data = {
          id: nanoid(),
          glyphId: col,
          startTimeMilis,
          durationMilis,
          startingBrightness: arr[row][col],
          isSelected: false,
          effectId: 101,
          effectData
        };

        result[col].push(data);

        row = endRow + 1;
      } else {
        row++;
      }
    }
  }

  return result;
}

export function validateCSV(csvString: string): boolean {
  const rows = csvString.split('\n');

  const errors: string[] = [];

  rows.forEach((row, rowIndex) => {
    const columns = row.split(',');

    columns.forEach((col, colIndex) => {
      const trimmedValue = col.trim();

      if (trimmedValue === '' && colIndex < columns.length - 1) {
        errors.push(`Missing value at row ${rowIndex + 1}, column ${colIndex + 1}`);
        console.error(
          `Error - While Processing Audio`,
          `Some error occured during processing (malformed output processed), export .json project file as safety and retry exporting. Err:`,
          errors
        );
        showError(
          `Error - While Processing Audio`,
          `Some error occured during processing (malformed output processed), export .json project file as safety and retry exporting. `,
          2100
        );
        return false;
      }
    });
  });
  return true;
}
