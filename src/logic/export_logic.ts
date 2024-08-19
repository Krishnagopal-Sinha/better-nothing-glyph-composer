import { kTimeStepMilis } from "@/lib/consts";
import { GlyphBlock } from "./glyph_model";
import pako from "pako";

export function processEdits(csv: string): string | null {
  try {
    // const utf8Encoded = new TextEncoder().encode(csv);

    const compressedData = pako.deflate(csv, { level: 9 });

    // Fun fact: simple uint8Array .toString() works very wrongly, gotta do it the proper way like below!
    const base64Data = btoa(
      String.fromCharCode(...new Uint8Array(compressedData))
    );

    // console.warn(`data:${csv}\nbase64Encoded:\n${base64Data}`);

    return base64Data;
  } catch (error) {
    console.error(`Error: while processing final glyph data -> ${error}`);
    return null;
  }
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
      const endTimeIdx = Math.floor(
        (curr.startTimeMilis + curr.durationMilis) / kTimeStepMilis
      );
      for (let z = startTimeIdx; z < endTimeIdx; z++) {
        intervals[z][i] = curr.brightness;
      }
    }
  }

  // Create CSV string
  // Having a comma at the end versus not having it, dont seem to make a difference?
  const csvContent = intervals.join(",\r\n") + ','; //extra comma for last line end

  return csvContent;
}
