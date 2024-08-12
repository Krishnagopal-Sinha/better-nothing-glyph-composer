// ffmpegService.ts

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import fileDownload from "js-file-download";

class FFmpegService {
  private static instance: FFmpegService;
  private ffmpeg: FFmpeg;

  private constructor() {
    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on("log", (message) => console.log(message));
  }

  static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  async load(): Promise<void> {
    // console.info(`-+~ Starting to FFMPEG LOADED `);

    const coreURL = `/ffmpeg-core.js`;
    const wasmURL = `/ffmpeg-core.wasm`;
    await this.ffmpeg.load({
      coreURL: await toBlobURL(coreURL, `text/javascript`),
      wasmURL: await toBlobURL(wasmURL, `application/wasm`),
    });
    // console.info(`Success! FFMPEG LOADED -+~`);
  }

  async saveOutput(
    inputAudioFile: File,
    processedGlyphData: string
  ): Promise<void> {
    await this.ffmpeg.writeFile(`input.ogg`, await fetchFile(inputAudioFile));
    console.log("save triger");
    const composer = `Spacewar Glyph Composer`;
    const album = `custom`;
    const custom1 = `eNoljVsKAEEIwy60A+r4qPe/2E7pj8FAiZ340vvYh8S7HjBiPB7ivUQ1ZexS3owkUJxlDGWOUZZfyqrmrs24awVahVFhVIAKUAEqrAqrwg8LSR98`;

    const outputFileName = `glyph_${Date.now()
      .toString()
      .replace(" /g", "_")}.ogg`;

    await this.ffmpeg.exec([
      `-i`,
      `input.ogg`,
      `-strict`,
      `-2`,
      `-metadata`,
      `AUTHOR=${processedGlyphData}`,
      `-metadata`,
      `TITLE=output_${Date.now()}`,
      `-metadata`,
      `COMPOSER=${composer}`,
      `-metadata`,
      `ALBUM=${album}`,
      `-metadata`,
      `CUSTOM1=${custom1}`,
      `-c:a`,
      `opus`,
      `-vn`,
      `-map_metadata`,
      `0:s:a:0`,
      `${outputFileName}`,
    ]);

    const outputFile = await this.ffmpeg.readFile(`${outputFileName}`);

    fileDownload(outputFile, outputFileName);
  }

  getFFmpegInstance(): FFmpeg {
    return this.ffmpeg;
  }
}

export default FFmpegService.getInstance();
