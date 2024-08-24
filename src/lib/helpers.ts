import { toast } from "sonner";
import { GlyphBlock, GlyphStore } from "./glyph_model";

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
  if (typeof obj !== "object" || obj === null) {
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
      if (typeof item !== "object" || item === null) {
        return false;
      }

      if (typeof item.id !== "string") return false;
      if (typeof item.glyphId !== "number" || item.glyphId < 0)
        return false;
      if (
        typeof item.startTimeMilis !== "number" ||
        item.startTimeMilis < 0
      )
        return false;
      if (
        typeof item.durationMilis !== "number" ||
        item.durationMilis < 0
      )
        return false;
      if (
        typeof item.startingBrightness !== "number" ||
        item.startingBrightness < 0
      )
        return false;
      if (typeof item.isSelected !== "boolean") return false;
      if (typeof item.effectId !== "number" || item.effectId < 0)
        return false;
      if (!Array.isArray(item.effectData)) return false;
    }
  }

  return true;
}

// get pretty date - for file names
export function getDateTime(): string {
  const now = new Date(Date.now());

  const formattedDate =
    `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}@` +
    `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
  return formattedDate;
}

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
