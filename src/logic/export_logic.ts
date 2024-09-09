import { kMaxBrightness, kTimeStepMilis } from '@/lib/consts';
import { GlyphBlock, GlyphStore } from '@/lib/glyph_model';
import { convertArrayToObjects } from '@/lib/helpers';
import pako from 'pako';

export function encodeStuffTheWayNothingLikesIt(input: string): string | null {
  try {
    // const utf8Encoded = new TextEncoder().encode(csv); //No need as Pako does this outta the box

    const compressedData = pako.deflate(input, { level: 9 });

    // Fun fact: simple uint8Array .toString() works very wrongly, gotta do it the proper way like below | can't directly do a simple, const base64Data = btoa(String.fromCharCode(...new Uint8Array(compressedData))); as thanks to spread operator for big uInt8Arr it'll throw below error!
    // Bug Fix: Convert Uint8Array to string in chunks to avoid "maximum call stack size exceeded" error
    const uint8Array = new Uint8Array(compressedData);
    let binaryString = '';
    const chunkSize = 0x8000; // Process in chunks of 32KB

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binaryString += String.fromCharCode.apply(
        null,
        Array.from(uint8Array.subarray(i, i + chunkSize))
      );
    }

    const base64Data = btoa(binaryString);

    // console.warn(`data:${csv}\nbase64Encoded:\n${base64Data}`);

    return base64Data;
  } catch (error) {
    console.error(`Error: while processing final glyph data -> ${error}`);
    return null;
  }
}

export function restoreAppGlyphData(base64DataArr: string[]): GlyphStore | undefined {
  function decodeBase64(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }
  function cleanBase64String(base64String: string) {
    return base64String.replace(/[^A-Za-z0-9+/=]/g, '');
  }

  try {
    // to binary
    const binaryData = decodeBase64(cleanBase64String(base64DataArr[0]));

    let decompressedData = pako.inflate(binaryData, { to: 'string' });

    // try 2nd regex result to hit
    if (!decompressedData) {
      console.log('Info: 1st import strategy failed, trying the 2nd one...');
      const binaryData = decodeBase64(cleanBase64String(base64DataArr[1]));

      decompressedData = pako.inflate(binaryData, { to: 'string' });
    }

    return actuallyRestoreGlyphData(decompressedData);
  } catch (error) {
    console.error(`Error: while decompressing glyph data -> ${error}`);
  }
  return;
}

export function actuallyRestoreGlyphData(csvString: string): GlyphStore {
  // convert into arr[][]

  function csvStringToNumberArray(csvString: string): number[][] {
    return csvString
      .trim()
      .split('\n')
      .map((row) =>
        row
          .split(',')
          .filter((cell) => cell.trim() !== '') // Remove empty cells resulting from trailing commas
          .map((cell) => {
            const trimmedCell = cell.trim();
            return trimmedCell !== '' ? parseInt(trimmedCell, 10) : 0;
          })
      );
  }
  const csv = csvStringToNumberArray(csvString);

  return convertArrayToObjects(csv, 3);
}

export function generateEffectData(
  effectId: number,
  brightness: number,
  iterCount: number,
  iterLimit: number
): number {
  iterCount++; //cuz it starts from 0 ;p

  const smoothCalculation = (value: number) => {
    return value < 1 ? Math.ceil(value) : Math.round(value);
  };

  switch (effectId) {
    case 0:
      return brightness;

    case 1: {
      // Smooth Zen Fade, based on sin func curves~
      const sineValue = Math.sin((Math.PI * iterCount) / iterLimit); //0 to pi
      return smoothCalculation(brightness * sineValue);
    }
    case 2:
      {
        //  fade in
        const increaseBy = brightness / iterLimit;
        return smoothCalculation(increaseBy * iterCount);
      }
      break;
    case 3: {
      //  fade out | start->newBlockBright | end->0
      const decreaseFactor = brightness / iterLimit;
      return smoothCalculation(brightness - decreaseFactor * (iterCount - 1));
    }

    case 4: {
      // fade in and out
      const halfIterLimit = Math.floor(iterLimit / 2);
      if (iterCount <= halfIterLimit) {
        // fade in
        const increaseBy = brightness / halfIterLimit;
        return smoothCalculation(increaseBy * iterCount);
      } else {
        // fade out
        const decreaseFactor = brightness / halfIterLimit;
        return smoothCalculation(brightness - decreaseFactor * (iterCount - halfIterLimit));
      }
    }
    case 5: {
      // stobe
      const strobeSpeed = 30; // TODO: make this configurable - 2 to 30, min 2 * 16.66ms ~33 which is fastttt, n 30 would be ~500ms
      return iterCount % strobeSpeed < strobeSpeed / 2 ? brightness : 0;
    }

    case 6: {
      // CHAOSSSS!
      const randomness = Math.random();
      const spikeFactor = Math.sin((Math.PI * randomness * iterCount) / iterLimit);
      const intensity = brightness * spikeFactor;

      //Random decision maker attempt
      if (randomness > 0.9) {
        return kMaxBrightness;
      } else if (randomness > 0.5) {
        return smoothCalculation(intensity);
      } else {
        return 0;
      }
    }

    case 7: {
      // heartbeat try
      const pulseDuration = Math.floor(iterLimit / 5);
      if (iterCount < pulseDuration) {
        return smoothCalculation(brightness * (iterCount / pulseDuration));
      } else if (iterCount < 2 * pulseDuration) {
        return smoothCalculation(brightness * (1 - (iterCount - pulseDuration) / pulseDuration));
      } else if (iterCount < 3 * pulseDuration) {
        return smoothCalculation(
          brightness * 0.5 * ((iterCount - 2 * pulseDuration) / pulseDuration)
        );
      } else if (iterCount < 4 * pulseDuration) {
        return smoothCalculation(
          brightness * 0.5 * (1 - (iterCount - 3 * pulseDuration) / pulseDuration)
        );
      } else {
        return 0;
      }
    }
    case 8: {
      // chaos v2, is different enough or scap?
      const chaosFactor = Math.random();
      if (chaosFactor > 0.8) {
        return kMaxBrightness; //  maximum brightness
      } else if (chaosFactor > 0.6) {
        return 0; // Abrupt darkness
      } else {
        return smoothCalculation(brightness * (0.5 + Math.random() * 0.5)); // rando moderate brightness
      }
    }

    case 9: {
      const blinkInterval = 2;
      return iterCount % (blinkInterval * 2) < blinkInterval ? brightness : 0;
    }

    case 10: {
      // End with bang - pulse
      const breathDuration = iterLimit * 0.8;
      const pulseDuration = iterLimit * 0.2;

      if (iterCount <= breathDuration) {
        const progress = iterCount / breathDuration;
        const brightnessValue = Math.sin(progress * Math.PI);
        return Math.round(brightness * brightnessValue);
      } else {
        // Sharp pulse effect
        const pulseProgress = (iterCount - breathDuration) / pulseDuration;
        return Math.round(brightness * (1 - Math.pow(pulseProgress, 2)));
      }
    }

    case 11: {
      // Dev - Metro, depracated
      const intervalMs = 1000; // every sec
      const intervalIdx = Math.floor(intervalMs / kTimeStepMilis);
      const flashDuration = 5;

      if (iterCount % intervalIdx < flashDuration) {
        return brightness;
      } else {
        return 0;
      }
    }

    default:
      return kMaxBrightness; //safety fall back value lul
  } //switch end
}

export function generateCSV(
  data: { [key: number]: GlyphBlock[] },
  totalDurationInMilis: number
): string {
  const intervals = [];
  const emptyRow: number[] = [];
  for (let i = 0; i < Object.keys(data).length; i++) {
    emptyRow.push(0);
  }

  // Fill with all 0
  for (let i = 0; i < Math.floor(totalDurationInMilis / kTimeStepMilis); i++) {
    intervals.push([...emptyRow]);
  }

  for (let i = 0; i < Object.entries(data).length; i++) {
    for (let j = 0; j < data[i].length; j++) {
      const curr = data[i][j];
      const startTimeIdx = Math.floor(curr.startTimeMilis / kTimeStepMilis);
      const endTimeIdx = Math.floor((curr.startTimeMilis + curr.durationMilis) / kTimeStepMilis);
      // const iterLimit = endTimeIdx - startTimeIdx;
      for (let z = startTimeIdx; z < endTimeIdx; z++) {
        const iterCount = z - startTimeIdx;
        // Use below if you wanna recreate/revalidate effect from some reason - probably has stopped working cuz of changes done
        // const brightnessValue = generateEffectData(
        //   curr.effectId,
        //   curr.startingBrightness,
        //   iterCount,
        //   iterLimit
        // );
        // using precomputed values
        const brightnessValue = curr.effectData[iterCount];

        // Bug temp fix, few old ogg making interval become undefined, hekk cuz ending might just go over ending.
        if (!intervals[z]) intervals[z] = [...emptyRow];
        intervals[z][i] = brightnessValue ?? 0;
      }
    }
  }

  // Create CSV string
  // Having a comma at the end versus not having it, dont seem to make a difference?
  const csvContent = intervals.join(',\r\n') + ','; //extra comma for last line end

  return csvContent;
}
