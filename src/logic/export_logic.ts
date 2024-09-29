import { kMaxBrightness, kTimeStepMilis } from '@/lib/consts';
import dataStore from '@/lib/data_store';
import { GlyphBlock, GlyphStore } from '@/lib/glyph_model';
import { convertArrayToObjects, showPopUp } from '@/lib/helpers';
import pako from 'pako';

export function encodeStuffTheWayNothingLikesIt(input: string | undefined): string | undefined {
  if (!input) return;
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
    return;
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

export function generateCSV(data: { [key: number]: GlyphBlock[] }): string | undefined {
  const totalDurationInMilis: number | undefined = dataStore.get('currentAudioDurationInMilis');
  if (!totalDurationInMilis) {
    showPopUp('Error - Audio File', 'Audio Duration is 0 ?');
    return;
  }

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
//=======================
const mapPeakToBrightness = (peak: number, minPeak: number, maxPeak: number): number => {

  const threshold = 0.6; 


  let normalizedPeak = (peak - minPeak) / (maxPeak - minPeak);


  if (normalizedPeak < threshold) {
    return 0;
  }

  normalizedPeak = Math.pow(normalizedPeak, 2); 

  const brightness = Math.floor(normalizedPeak * kMaxBrightness);

  return brightness;
};

const findMinMaxPeaks = (peaks: number[]): { minPeak: number; maxPeak: number } => {
  const minPeak = Math.min(...peaks);
  const maxPeak = Math.max(...peaks);

  return { minPeak, maxPeak };
};

// Utility function to generate a random number between a range
const getRandomFactor = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Function to detect strong beats based on threshold
const isStrongBeat = (peak: number, minPeak: number, maxPeak: number): boolean => {
  const threshold = minPeak + (maxPeak - minPeak) * 0.8;  // 80% of the peak range
  return peak >= threshold;
};

// Generate LED pattern effects based on audio peaks
export const generateLEDBrightnessCSV = (): string | undefined => {
  const ledCount = 5; // Adjust based on your circular LED arrangement
  const peaks: number[] | undefined = dataStore.get('currentAudioPeaks');
  const totalDurationInMilis: number | undefined = dataStore.get('currentAudioDurationInMilis');
  
  if (!totalDurationInMilis || !peaks) {
    showPopUp('Error - Audio File', 'Audio Duration is 0 or Some other issue occurred');
    return;
  }

  const totalRows = Math.floor(totalDurationInMilis / kTimeStepMilis);  // Total number of rows based on 16.66ms slices
  const totalPeaks = peaks.length;

  let csvData = '';

  // Find min and max peak values for proper normalization
  const { minPeak, maxPeak } = findMinMaxPeaks(peaks);

  // Duration of each peak (in milliseconds)
  const peakDurationInMilis = totalDurationInMilis / totalPeaks;

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
    const row = [];
    
    // Start and end time for this row's time slice
    const sliceStartTime = rowIndex * kTimeStepMilis;
    const sliceEndTime = sliceStartTime + kTimeStepMilis;

    // Aggregate peaks that fall within this time slice
    const peaksInSlice: number[] = [];
    for (let peakIndex = 0; peakIndex < totalPeaks; peakIndex++) {
      const peakTime = peakIndex * peakDurationInMilis;
      if (peakTime >= sliceStartTime && peakTime < sliceEndTime) {
        peaksInSlice.push(peaks[peakIndex]);
      }
    }

    // If no peaks are found in this slice, default to 0
    const peakForThisSlice = peaksInSlice.length > 0 ? Math.max(...peaksInSlice) : 0;

    // Rotational offset to create wave-like effects, spread the wave with distinct separation
    const waveOffset = rowIndex % (ledCount * 2);  // Modulo to rotate around the circle with stronger separation

    // Detect if this peak represents a strong beat
    const strongBeat = isStrongBeat(peakForThisSlice, minPeak, maxPeak);

    // Choose a random lighting pattern: either wave or flashing, or full-LED flash on strong beat
    const isFlashingPattern = Math.random() < 0.5 && !strongBeat;  // Flash or wave, but not during strong beat

    for (let ledIndex = 0; ledIndex < ledCount; ledIndex++) {
      let brightness = 0;

      if (strongBeat) {
        // Strong beat: flash all LEDs at max brightness
        brightness = 4095;  // Max brightness for a strong beat flash
      } else if (!isFlashingPattern) {
        // Wave-like effect: each LED lights up in sequence with distinct separation
        const offsetIndex = (ledIndex + waveOffset) % ledCount;
        const randomWaveFactor = getRandomFactor(0.8, 1.2);  // Randomize each LED's reaction to the wave with a sharper factor

        // Create more pronounced separation between LEDs by skipping brightness for some
        const isActiveLED = Math.abs(offsetIndex - waveOffset) < 2;  // Only light up LEDs closer to the wave position

        if (isActiveLED) {
          brightness = mapPeakToBrightness(peakForThisSlice * randomWaveFactor, minPeak, maxPeak);
        } else {
          brightness = 0;  // Sharp cutoff for LEDs that aren't close to the wave
        }

      } else {
        // Flashing effect: Random LEDs flash in sync with the peak
        if (Math.random() > 0.6) {  // Randomly choose some LEDs to flash
          const randomFlashFactor = getRandomFactor(1.0, 1.5);  // Make flashes more intense
          brightness = mapPeakToBrightness(peakForThisSlice * randomFlashFactor, minPeak, maxPeak);
        } else {
          brightness = 0;  // Other LEDs stay off in the flashing pattern
        }
      }

      row.push(brightness);
    }

    // Create CSV row with brightness values for each LED
    csvData += row.join(',') + ',\r\n';
  }

  // console.log('✌️csvData --->\n', csvData);
  return csvData;
};
