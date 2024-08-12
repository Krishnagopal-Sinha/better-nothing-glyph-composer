import { GlyphBlock } from "./glyph_model";
import pako from "pako";

export function processEdits(csv: string): string | null {
  try {
    const utf8Encoded = new TextEncoder().encode(csv);

    const compressedData = pako.deflate(utf8Encoded);

    // Fun fact: simple uint8Array .toString() works very wrongly, gotta do it the proper way like below!
    const base64Data = btoa(
      String.fromCharCode(...new Uint8Array(compressedData))
    );

    // console.warn(`base64Encoded:\n${base64Data}`);

    return base64Data;
  } catch (error) {
    console.error(`Error: while processing compression -> ${error}`);
    return null;
  }
}

export function generateCSV(data: { [key: number]: GlyphBlock[] }, totalDurationInMilis:number): string {

  //   Object.keys(data).forEach((key) => {
  //     data[parseInt(key)].forEach((item) => {
  //       const endTime = item.startTimeMilis + item.durationMilis;
  //       if (endTime > maxTime) {
  //         maxTime = endTime;
  //       }
  //     });
  //   });

  const intervals = [];
  for (let time = 0; time <= totalDurationInMilis; time += 16) {
    const interval = [];

    // Check the status of each light
    for (let i = 0; i < 5; i++) {
      const lightOn = data[i]?.some((item) => {
        return (
          time >= item.startTimeMilis &&
          time < item.startTimeMilis + item.durationMilis
        );
      });
      interval.push(lightOn ? 3072 : 0);
    }

    intervals.push(interval.join(","));
  }

  // Create CSV string
  const csvContent = intervals.join("\n");
  return csvContent;
}
