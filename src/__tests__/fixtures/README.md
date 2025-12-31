# Test Fixtures

This directory contains test fixtures for NP3 integration tests.

## Audio Fixtures

The test suite generates metronome beep audio files in memory:
- **metronome.wav** - WAV format metronome (2 seconds, 4 beeps at 0.5s intervals)
- **metronome.mp3** - MP3 format (uses WAV data for testing)
- **metronome.ogg** - OGG format (uses WAV data for testing)

All audio files are generated in-memory during tests and don't require file system access.

## Video Fixtures

- **test-video-120frames.mp4** - Test video file (minimal MP4 structure)

**Note:** The current implementation creates a minimal MP4 file structure for testing. For full integration testing with actual video frames, you would need to:

1. Use FFmpeg.wasm to generate a real video file with 120 frames
2. Each frame should be black with the frame number in the center
3. The video should be 2 seconds at 60fps (120 frames total)

Example FFmpeg command to generate such a video:
```bash
ffmpeg -f lavfi -i testsrc2=duration=2:size=200x200:rate=60 -vf "drawtext=text='%{frame_num}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" -c:v libx264 -pix_fmt yuv420p test-video-120frames.mp4
```

## Usage in Tests

```typescript
import { createAudioFixtures, createTestVideoFile } from './fixtures/fixture-loader';

// Create audio fixtures
const { wav, mp3, ogg } = createAudioFixtures();

// Create video fixture
const video = createTestVideoFile();

// Use in tests
const result = await audioService.processAudioForNP3(wav);
```

## File Generation

The `generate-fixtures.ts` file contains utilities to generate fixture files on disk (for Node.js environments). However, the test suite uses in-memory generation by default to avoid file system dependencies.

