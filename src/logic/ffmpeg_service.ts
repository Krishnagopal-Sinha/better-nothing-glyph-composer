// ffmpegService.ts

import { kMajorVersion } from '@/lib/consts';
import dataStore, { PhoneSpecificInfo } from '@/lib/data_store';
import { getDateTime, showPopUp } from '@/lib/helpers';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import fileDownload from 'js-file-download';

class FFmpegService {
  private static instance: FFmpegService;
  private ffmpeg: FFmpeg;
  private progressPercentage: number;
  private logs: string[];

  private constructor() {
    this.ffmpeg = new FFmpeg();
    this.progressPercentage = 0;
    this.logs = [];
    this.ffmpeg.on('progress', (progress) => {
      this.progressPercentage = parseInt((progress.progress * 100).toFixed(0));
      if (this.progressPercentage > 99.4) {
        this.progressPercentage = 0;
      }
      // console.log(
      //   `Saving file: ${this.progressPercentage}% done, please wait...`
      // );
    });
    this.ffmpeg.on('log', ({ message }) => {
      this.logs.push(message);
      // console.log(message); //debug
    });
  }

  static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  async load(): Promise<void> {
    // console.info(`-+~ Starting to FFMPEG LOADED `);

    // Hosting did not support files more than 25mb, the local file in public/ is over 32mb sadge :(
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, `text/javascript`),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, `application/wasm`)
    });
    // console.info(`Success! FFMPEG LOADED -+~`);
  }

  async saveOutput(
    inputAudioFile: File,
    processedGlyphData: string,
    currentDevice: string,
    customFilename?: string
  ): Promise<void> {
    // Validate inputs
    if (!inputAudioFile) {
      throw new Error('No input audio file provided');
    }

    if (!processedGlyphData || processedGlyphData.length === 0) {
      throw new Error('No glyph data provided for export');
    }

    if (!currentDevice) {
      throw new Error('No device type specified');
    }

    // Validate audio file
    if (inputAudioFile.size === 0) {
      throw new Error('Input audio file is empty');
    }

    if (!inputAudioFile.type.startsWith('audio/')) {
      console.warn('Input file may not be a valid audio file:', inputAudioFile.type);
    }

    try {
      // Write input file to FFmpeg filesystem
      // Determine file extension from MIME type or filename
      const fileExtension = this.getAudioFileExtension(inputAudioFile);
      const inputFileName = `input.${fileExtension}`;

      const fileData = await fetchFile(inputAudioFile);
      if (!fileData || fileData.byteLength === 0) {
        throw new Error('Failed to read input audio file');
      }

      await this.ffmpeg.writeFile(inputFileName, fileData);

      // default to NP1 on error
      const phoneInfo: PhoneSpecificInfo = dataStore.get(currentDevice) ?? {
        composer: `v1-Spacewar Glyph Composer`,
        album: `BNGC v${kMajorVersion}`,
        custom2: '5cols',
        custom1: `eNoDAAAAAAE=`
      };
      const composer = phoneInfo.composer;
      const album = phoneInfo.album;
      const custom1 = dataStore.get('exportCustom1');
      const custom2 = phoneInfo.custom2;

      // Use custom filename if provided, otherwise use default
      let baseFileName: string;
      let titleMetadata: string;

      if (customFilename && customFilename.trim()) {
        // Sanitize filename and ensure it doesn't have .ogg extension
        const sanitized = customFilename
          .trim()
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .replace(/\.ogg$/i, '');
        baseFileName = sanitized;
        titleMetadata = sanitized; // TITLE should be the user's filename (sanitized)
      } else {
        baseFileName = 'glyph_tone';
        titleMetadata = 'glyph_tone'; // Default title
      }

      // Output filename always includes date_time for uniqueness
      const outputFileName = `${baseFileName}_${getDateTime()}.ogg`;

      // Execute FFmpeg command with error handling
      try {
        await this.ffmpeg.exec([
          `-i`,
          inputFileName,
          `-strict`,
          `-2`,
          `-metadata`,
          `AUTHOR=${processedGlyphData}`,
          `-metadata`,
          `TITLE=${titleMetadata}`,
          `-metadata`,
          `COMPOSER=${composer}`,
          `-metadata`,
          `ALBUM=${album}`,
          `-metadata`,
          `CUSTOM1=${custom1}`,
          `-metadata`,
          `CUSTOM2=${custom2}`,
          `-c:a`,
          `opus`,
          `-vn`,
          `-map_metadata`,
          `0:s:a:0`,
          `${outputFileName}`
        ]);
      } catch (ffmpegError) {
        console.error('FFmpegService: FFmpeg command failed:', ffmpegError);
        throw new Error(
          `FFmpeg processing failed: ${
            ffmpegError instanceof Error ? ffmpegError.message : 'Unknown error'
          }`
        );
      }

      // Read output file
      let outputFile: Uint8Array;
      try {
        outputFile = (await this.ffmpeg.readFile(`${outputFileName}`)) as Uint8Array;
        if (!outputFile || outputFile.byteLength === 0) {
          throw new Error('Generated output file is empty');
        }
      } catch (readError) {
        console.error('FFmpegService: Failed to read output file:', readError);
        throw new Error(
          `Failed to read output file: ${
            readError instanceof Error ? readError.message : 'Unknown error'
          }`
        );
      }

      // Download the file
      try {
        fileDownload(outputFile, outputFileName);
      } catch (downloadError) {
        console.error('FFmpegService: File download failed:', downloadError);
        throw new Error(
          `File download failed: ${
            downloadError instanceof Error ? downloadError.message : 'Unknown error'
          }`
        );
      }

      // Clean up FFmpeg filesystem
      try {
        await this.ffmpeg.deleteFile(inputFileName);
        await this.ffmpeg.deleteFile(outputFileName);
      } catch (cleanupError) {
        console.warn('FFmpegService: Cleanup failed (non-critical):', cleanupError);
      }
    } catch (error) {
      console.error('FFmpegService: saveOutput failed:', error);
      throw error;
    }
  }

  async getGlyphData(inputAudioFile: File): Promise<string[] | null> {
    this.logs = [];
    const fileExtension = this.getAudioFileExtension(inputAudioFile);
    const inputFileName = `input.${fileExtension}`;
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputAudioFile));

    await this.ffmpeg.exec([
      '-i',
      inputFileName,
      '-map',
      '0',
      '-c',
      'copy',
      '-f',
      'ffmetadata',
      '-'
    ]);

    const author = this.extractAuthor(this.logs.join('\n'));

    // console.warn("EXTRACTed:", author);
    if (!author) {
      console.warn('Input file is not a valid Glyph composed file!');
      showPopUp(
        'Import Error',
        'Input file is not a valid Glyph composed file! But you can change that, by composing ;D',
        1800
      );
    }
    return author;
  }

  private extractAuthor(ffmpegOutput: string): string[] | null {
    const aData = [];
    const authorRegexStrat1 = /AUTHOR\s*:\s*([\s\S]*?)(?:\n\s*\w+|$)/i;
    const authorRegexStrat2 = /AUTHOR\s*=\s*([^\n\r;]+)/;

    const match = ffmpegOutput.match(authorRegexStrat1);
    const match2 = ffmpegOutput.match(authorRegexStrat2);

    if (match && match[1]) {
      let cleanBase64Str = match[1].trim().replace(/:/g, '');

      cleanBase64Str = cleanBase64Str.replace(/\s+/g, '');
      aData.push(cleanBase64Str);
    }
    if (match2 && match2[1]) {
      let cleanBase64Str = match2[1].trim().replace(/:/g, '');

      cleanBase64Str = cleanBase64Str.replace(/\s+/g, '');
      aData.push(cleanBase64Str);
    }
    if (!aData[0] && !aData[1]) {
      return null;
    }
    return aData;
  }

  getFFmpegInstance(): FFmpeg {
    return this.ffmpeg;
  }
  getSaveProgress(): number {
    return this.progressPercentage;
  }

  /**
   * Get appropriate file extension for audio file based on MIME type or filename
   * @param audioFile - The audio file
   * @returns File extension (without dot)
   */
  private getAudioFileExtension(audioFile: File): string {
    // Check filename first
    const fileName = audioFile.name.toLowerCase();
    if (fileName.endsWith('.mp3')) return 'mp3';
    if (fileName.endsWith('.m4a') || fileName.endsWith('.aac')) return 'm4a';
    if (fileName.endsWith('.ogg')) return 'ogg';
    if (fileName.endsWith('.wav')) return 'wav';
    if (fileName.endsWith('.flac')) return 'flac';
    if (fileName.endsWith('.opus')) return 'opus';

    // Check MIME type
    const mimeType = audioFile.type.toLowerCase();
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('mp4') || mimeType.includes('aac') || mimeType.includes('m4a'))
      return 'm4a';
    if (mimeType.includes('ogg') || mimeType.includes('opus')) return 'ogg';
    if (mimeType.includes('wav') || mimeType.includes('wave')) return 'wav';
    if (mimeType.includes('flac')) return 'flac';

    // Default to ogg (will be converted by FFmpeg)
    return 'ogg';
  }
}

export default FFmpegService.getInstance();
