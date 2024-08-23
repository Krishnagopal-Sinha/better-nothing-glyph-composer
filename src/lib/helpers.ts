import { toast } from "sonner";
import { GlyphBlock } from "./glyph_model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function throttle(func: (...args: any[]) => void, limit: number) {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (...args: any[]) {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
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
const throttledShowError = throttle(
  (message: string, description: string, duration?: number) => {
    toast.error(message, {
      description,
      action: {
        label: "Ok",
        onClick: () => {},
      },
      duration: duration,
    });
  },
  1400
);

export function showError(
  message: string,
  description: string,
  duration?: number
) {
  throttledShowError(message, description, duration);
}

export const insertInSortedOrder = (
  items: GlyphBlock[],
  newItem: GlyphBlock
): GlyphBlock[] => {
  const index = items.findIndex(
    (item) => item.startTimeMilis > newItem.startTimeMilis
  );
  if (index === -1) return [...items, newItem];
  return [...items.slice(0, index), newItem, ...items.slice(index)];
};

export function canAddItem2(
  newItem: GlyphBlock,
  existingItems: GlyphBlock[],
  audioDurationInMilis: number,
  skipIndex: number = -1
): boolean {
  if (newItem.durationMilis <= 0 || newItem.startTimeMilis < 0) {
    showError("Error - Item not added", "Invalid start time or duration.");
    return false;
  }

  if (
    newItem.startTimeMilis >= audioDurationInMilis ||
    newItem.startTimeMilis + newItem.durationMilis > audioDurationInMilis
  ) {
    showError(
      "Error - Item not added or modified",
      "Glyph timings must be within audio's time bounds."
    );
    return false;
  }

  if (newItem.durationMilis <= 20) {
    showError(
      "Error - Item not added or modified",
      "Glyph block duration must be least 20s!"
    );
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
      if (
        newItem.startTimeMilis + newItem.durationMilis >
        rightNeighbor.startTimeMilis
      ) {
        // showError(
        //   "Error - A Block was not added or modified",
        //   "New block duration exceeds or overlaps with the start time of the next block."
        // );
        return false;
      }
    }
  }

  // left neighbour check
  if (index > 0) {
    const leftNeighbor = existingItems[index - 1];
    if (index - 1 !== skipIndex) {
      if (
        newItem.startTimeMilis <
        leftNeighbor.startTimeMilis + leftNeighbor.durationMilis
      ) {
        // showError(
        //   "Error - A Block was not added or modified",
        //   "Overlap with the left neighbor Glyph block detected."
        // );
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
      if (
        newItem.startTimeMilis <
        prevNeighbor.startTimeMilis + prevNeighbor.durationMilis
      ) {
        showError(
          "Error - A Block was not added or modified",
          "Overlap with the Glyph block on the left detected."
        );
        return false;
      }
    }

    // Check next neighbor
    if (nextIndex >= 0) {
      const nextNeighbor = existingItems[nextIndex];
      if (
        newItem.startTimeMilis + newItem.durationMilis >
        nextNeighbor.startTimeMilis
      ) {
        showError(
          "Error - A Block was not added or modified",
          "Overlap with the Glyph block on the right detected."
        );
        return false;
      }
    }
  }

  return true;
}

function findInsertionIndex(
  items: GlyphBlock[],
  startTimeMilis: number
): number {
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
