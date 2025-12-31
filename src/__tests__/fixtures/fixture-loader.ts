/**
 * Test fixture loader for browser environment
 * Creates test files in memory (no file system required)
 */

/**
 * Check if fixture file exists (always returns true for in-memory fixtures)
 */
export function fixtureExists(_filename: string): boolean {
  // For in-memory fixtures, we always return true
  // In a real scenario with file system, you'd check actual file existence
  return true;
}

/**
 * Load fixture file as File object (creates in memory)
 */
export function loadFixtureAsFile(filename: string, _mimeType: string): File {
  // Create fixture in memory based on filename
  if (filename.includes('metronome')) {
    if (filename.endsWith('.wav')) {
      return createMetronomeWAVInMemory();
    } else if (filename.endsWith('.mp3')) {
      const wav = createMetronomeWAVInMemory();
      return new File([wav], filename, { type: 'audio/mpeg' });
    } else if (filename.endsWith('.ogg')) {
      const wav = createMetronomeWAVInMemory();
      return new File([wav], filename, { type: 'audio/ogg' });
    }
  } else if (filename.includes('video')) {
    return createTestVideoFile();
  }
  
  throw new Error(`Unknown fixture file: ${filename}`);
}

/**
 * Create a simple metronome beep WAV file in memory (for browser tests)
 * 5 seconds with beeps at 1 second intervals (5 beeps total)
 */
export function createMetronomeWAVInMemory(): File {
  const sampleRate = 44100;
  const duration = 5.0; // 5 seconds
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const numSamples = Math.floor(duration * sampleRate);
  const audioDataSize = numSamples * blockAlign;
  const totalSize = 44 + audioDataSize;

  const wavFile = new Uint8Array(totalSize);

  // RIFF header
  wavFile.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  const fileSize = totalSize - 8;
  wavFile[4] = fileSize & 0xff;
  wavFile[5] = (fileSize >> 8) & 0xff;
  wavFile[6] = (fileSize >> 16) & 0xff;
  wavFile[7] = (fileSize >> 24) & 0xff;
  wavFile.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt chunk
  wavFile.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  wavFile[16] = 16; // Subchunk1Size
  wavFile[20] = 1; // AudioFormat (PCM)
  wavFile[22] = numChannels;
  wavFile[24] = sampleRate & 0xff;
  wavFile[25] = (sampleRate >> 8) & 0xff;
  wavFile[26] = (sampleRate >> 16) & 0xff;
  wavFile[27] = (sampleRate >> 24) & 0xff;
  wavFile[28] = byteRate & 0xff;
  wavFile[29] = (byteRate >> 8) & 0xff;
  wavFile[30] = (byteRate >> 16) & 0xff;
  wavFile[31] = (byteRate >> 24) & 0xff;
  wavFile[32] = blockAlign;
  wavFile[34] = bitsPerSample;

  // data chunk
  wavFile.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  wavFile[40] = audioDataSize & 0xff;
  wavFile[41] = (audioDataSize >> 8) & 0xff;
  wavFile[42] = (audioDataSize >> 16) & 0xff;
  wavFile[43] = (audioDataSize >> 24) & 0xff;

  // Generate metronome beeps (5 beeps at 1 second intervals)
  const beepFrequency = 440; // A4 note
  const beepDuration = 0.1; // 100ms beeps
  const beepInterval = 1.0; // 1 second between beeps

  for (let sample = 0; sample < numSamples; sample++) {
    const time = sample / sampleRate;
    const beepIndex = Math.floor(time / beepInterval);
    const beepTime = time - beepIndex * beepInterval;

    let amplitude = 0;
    if (beepTime < beepDuration && beepIndex < 5) {
      const fade = Math.min(beepTime / 0.01, (beepDuration - beepTime) / 0.01, 1);
      amplitude = Math.sin(2 * Math.PI * beepFrequency * beepTime) * fade * 0.3;
    }

    const sampleValue = Math.max(-1, Math.min(1, amplitude));
    const intValue = Math.floor(sampleValue * 32767);

    const offset = 44 + sample * blockAlign;
    wavFile[offset] = intValue & 0xff;
    wavFile[offset + 1] = (intValue >> 8) & 0xff;
    wavFile[offset + 2] = intValue & 0xff;
    wavFile[offset + 3] = (intValue >> 8) & 0xff;
  }

  const blob = new Blob([wavFile], { type: 'audio/wav' });
  return new File([blob], 'metronome.wav', { type: 'audio/wav' });
}

/**
 * Create audio files in different formats (all use WAV data for testing)
 */
export function createAudioFixtures() {
  const wavFile = createMetronomeWAVInMemory();
  
  return {
    wav: wavFile,
    mp3: new File([wavFile], 'metronome.mp3', { type: 'audio/mpeg' }),
    ogg: new File([wavFile], 'metronome.ogg', { type: 'audio/ogg' })
  };
}

/**
 * Create a simple test video file (minimal MP4 structure)
 * For real testing, this would need to be generated with FFmpeg
 */
export function createTestVideoFile(): File {
  // Create a minimal MP4 file structure
  const mp4Header = new Uint8Array([
    // ftyp box
    0x00, 0x00, 0x00, 0x20, // box size
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x69, 0x73, 0x6f, 0x6d, // major brand 'isom'
    0x00, 0x00, 0x02, 0x00, // minor version
    0x69, 0x73, 0x6f, 0x6d, // compatible brand 'isom'
    0x69, 0x73, 0x6f, 0x32, // compatible brand 'iso2'
    0x6d, 0x70, 0x34, 0x31, // compatible brand 'mp41'
    0x00, 0x00, 0x00, 0x08, // box size
    0x6d, 0x64, 0x61, 0x74  // 'mdat' (media data)
  ]);

  const blob = new Blob([mp4Header], { type: 'video/mp4' });
  return new File([blob], 'test-video-120frames.mp4', { type: 'video/mp4' });
}

