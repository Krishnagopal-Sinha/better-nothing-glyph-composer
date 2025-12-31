/**
 * Test fixture generation utilities
 * Generates audio and video test files for integration testing
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const FIXTURES_DIR = join(__dirname, 'files');

/**
 * Ensure fixtures directory exists
 */
function ensureFixturesDir(): void {
  if (!existsSync(FIXTURES_DIR)) {
    mkdirSync(FIXTURES_DIR, { recursive: true });
  }
}

/**
 * Generate a simple metronome beep WAV file
 * Creates a 2-second audio file with beeps at 0.5s intervals
 */
function generateMetronomeWAV(): Uint8Array {
  const sampleRate = 44100;
  const duration = 2.0; // 2 seconds
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
  wavFile[21] = 0;
  wavFile[22] = numChannels;
  wavFile[23] = 0;
  wavFile[24] = sampleRate & 0xff;
  wavFile[25] = (sampleRate >> 8) & 0xff;
  wavFile[26] = (sampleRate >> 16) & 0xff;
  wavFile[27] = (sampleRate >> 24) & 0xff;
  wavFile[28] = byteRate & 0xff;
  wavFile[29] = (byteRate >> 8) & 0xff;
  wavFile[30] = (byteRate >> 16) & 0xff;
  wavFile[31] = (byteRate >> 24) & 0xff;
  wavFile[32] = blockAlign;
  wavFile[33] = 0;
  wavFile[34] = bitsPerSample;
  wavFile[35] = 0;

  // data chunk
  wavFile.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  wavFile[40] = audioDataSize & 0xff;
  wavFile[41] = (audioDataSize >> 8) & 0xff;
  wavFile[42] = (audioDataSize >> 16) & 0xff;
  wavFile[43] = (audioDataSize >> 24) & 0xff;

  // Generate metronome beeps (4 beeps at 0.5s intervals)
  const beepFrequency = 440; // A4 note
  const beepDuration = 0.1; // 100ms beeps

  for (let sample = 0; sample < numSamples; sample++) {
    const time = sample / sampleRate;
    const beepIndex = Math.floor(time / 0.5);
    const beepTime = time - beepIndex * 0.5;

    let amplitude = 0;
    if (beepTime < beepDuration && beepIndex < 4) {
      // Generate sine wave beep with fade in/out
      const fade = Math.min(beepTime / 0.01, (beepDuration - beepTime) / 0.01, 1);
      amplitude = Math.sin(2 * Math.PI * beepFrequency * beepTime) * fade * 0.3;
    }

    // Convert to 16-bit PCM
    const sampleValue = Math.max(-1, Math.min(1, amplitude));
    const intValue = Math.floor(sampleValue * 32767);

    // Write to both channels (stereo)
    const offset = 44 + sample * blockAlign;
    wavFile[offset] = intValue & 0xff;
    wavFile[offset + 1] = (intValue >> 8) & 0xff;
    wavFile[offset + 2] = intValue & 0xff;
    wavFile[offset + 3] = (intValue >> 8) & 0xff;
  }

  return wavFile;
}

/**
 * Generate metronome beep audio files in different formats
 */
export async function generateAudioFixtures(): Promise<void> {
  ensureFixturesDir();

  // Generate WAV file
  const wavPath = join(FIXTURES_DIR, 'metronome.wav');
  if (!existsSync(wavPath)) {
    console.log('Generating metronome.wav...');
    const wavData = generateMetronomeWAV();
    writeFileSync(wavPath, wavData);
    console.log(`Generated ${wavPath} (${wavData.length} bytes)`);
  } else {
    console.log(`Skipping ${wavPath} - already exists`);
  }

  // For MP3 and OGG, we'll create simple copies with different extensions
  // In a real scenario, you'd use a proper encoder, but for testing we can use WAV
  // and let the browser/FFmpeg handle conversion
  const mp3Path = join(FIXTURES_DIR, 'metronome.mp3');
  const oggPath = join(FIXTURES_DIR, 'metronome.ogg');

  // Copy WAV to MP3/OGG (they'll be treated as WAV by the test, which is fine for testing)
  if (!existsSync(mp3Path)) {
    console.log('Generating metronome.mp3 (WAV format for testing)...');
    const wavData = generateMetronomeWAV();
    writeFileSync(mp3Path, wavData);
    console.log(`Generated ${mp3Path} (${wavData.length} bytes)`);
  } else {
    console.log(`Skipping ${mp3Path} - already exists`);
  }

  if (!existsSync(oggPath)) {
    console.log('Generating metronome.ogg (WAV format for testing)...');
    const wavData = generateMetronomeWAV();
    writeFileSync(oggPath, wavData);
    console.log(`Generated ${oggPath} (${wavData.length} bytes)`);
  } else {
    console.log(`Skipping ${oggPath} - already exists`);
  }
}

/**
 * Generate a simple MP4 video file with 120 frames
 * Each frame is black with the frame number in the center
 * Note: This creates a minimal MP4 structure. For real testing, you might want to use FFmpeg
 */
export async function generateVideoFixture(): Promise<void> {
  ensureFixturesDir();

  const videoPath = join(FIXTURES_DIR, 'test-video-120frames.mp4');
  if (existsSync(videoPath)) {
    console.log(`Skipping ${videoPath} - already exists`);
    return;
  }

  console.log('Generating test video file...');
  console.log('Note: Creating a minimal MP4 placeholder. For full testing, use FFmpeg to generate actual video.');
  
  // Create a minimal MP4 file structure
  // This is a simplified version - a real MP4 would need proper atom structure
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
    0x6d, 0x64, 0x61, 0x74 // 'mdat' (media data)
  ]);

  // For testing purposes, we'll create a file that can be recognized
  // In actual tests, you might want to use FFmpeg.wasm to generate a real video
  writeFileSync(videoPath, mp4Header);
  console.log(`Generated ${videoPath} (${mp4Header.length} bytes)`);
  console.log('Warning: This is a minimal MP4. For full integration tests, generate actual video with FFmpeg.');
}

/**
 * Generate all test fixtures
 */
export async function generateAllFixtures(): Promise<void> {
  console.log('Generating test fixtures...');
  await generateAudioFixtures();
  await generateVideoFixture();
  console.log('Fixture generation complete!');
}

// Run if called directly
if (require.main === module) {
  generateAllFixtures().catch(console.error);
}

