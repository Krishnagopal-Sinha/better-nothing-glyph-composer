/**
 * Script to generate test fixture files
 * Run with: npx tsx scripts/generate-test-fixtures.ts
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_DIR = join(__dirname, '../src/__tests__/fixtures/files');

/**
 * Ensure fixtures directory exists
 */
function ensureFixturesDir(): void {
  if (!existsSync(FIXTURES_DIR)) {
    mkdirSync(FIXTURES_DIR, { recursive: true });
    console.log(`Created fixtures directory: ${FIXTURES_DIR}`);
  }
}

/**
 * Generate a simple metronome beep WAV file
 * Creates a 5-second audio file with beeps at 1 second intervals (5 beeps total)
 */
function generateMetronomeWAV(): Uint8Array {
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
async function generateAudioFixtures(): Promise<void> {
  ensureFixturesDir();

  // Generate WAV file
  const wavPath = join(FIXTURES_DIR, 'metronome.wav');
  if (!existsSync(wavPath)) {
    console.log('Generating metronome.wav...');
    const wavData = generateMetronomeWAV();
    writeFileSync(wavPath, wavData);
    console.log(`✓ Generated ${wavPath} (${wavData.length} bytes)`);
  } else {
    console.log(`✓ ${wavPath} already exists (${existsSync(wavPath) ? 'skipped' : ''})`);
  }

  // Generate MP3 (using WAV data for testing - in real scenario would encode)
  const mp3Path = join(FIXTURES_DIR, 'metronome.mp3');
  if (!existsSync(mp3Path)) {
    console.log('Generating metronome.mp3...');
    const wavData = generateMetronomeWAV();
    writeFileSync(mp3Path, wavData);
    console.log(`✓ Generated ${mp3Path} (${wavData.length} bytes) - Note: Contains WAV data for testing`);
  } else {
    console.log(`✓ ${mp3Path} already exists`);
  }

  // Generate OGG (using WAV data for testing - in real scenario would encode)
  const oggPath = join(FIXTURES_DIR, 'metronome.ogg');
  if (!existsSync(oggPath)) {
    console.log('Generating metronome.ogg...');
    const wavData = generateMetronomeWAV();
    writeFileSync(oggPath, wavData);
    console.log(`✓ Generated ${oggPath} (${wavData.length} bytes) - Note: Contains WAV data for testing`);
  } else {
    console.log(`✓ ${oggPath} already exists`);
  }
}

/**
 * Generate a simple MP4 video file with 120 frames
 * Each frame is black with the frame number in the center
 * Note: This is a placeholder - for a real video, FFmpeg would be needed
 */
async function generateVideoFixture(): Promise<void> {
  ensureFixturesDir();

  const videoPath = join(FIXTURES_DIR, 'test-video-120frames.mp4');
  if (existsSync(videoPath)) {
    console.log(`✓ ${videoPath} already exists`);
    return;
  }

  console.log('Generating test video file...');
  console.log('Note: Creating a minimal MP4 placeholder.');
  console.log('For a real video with 120 frames, use FFmpeg:');
  console.log('  ffmpeg -f lavfi -i testsrc2=duration=2:size=200x200:rate=60 -vf "drawtext=text=\'%{frame_num}\':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -pix_fmt yuv420p test-video-120frames.mp4');
  
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

  writeFileSync(videoPath, mp4Header);
  console.log(`✓ Generated ${videoPath} (${mp4Header.length} bytes)`);
  console.log('⚠️  Warning: This is a minimal MP4 placeholder. For full testing, generate actual video with FFmpeg.');
}

/**
 * Generate all test fixtures
 */
async function generateAllFixtures(): Promise<void> {
  console.log('\n🎵 Generating test fixture files...\n');
  await generateAudioFixtures();
  console.log('');
  await generateVideoFixture();
  console.log('\n✅ Fixture generation complete!');
  console.log(`\nFiles location: ${FIXTURES_DIR}\n`);
}

// Run if called directly
generateAllFixtures().catch(console.error);

