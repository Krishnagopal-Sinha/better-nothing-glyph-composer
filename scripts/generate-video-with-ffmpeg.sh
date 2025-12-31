#!/bin/bash
# Script to generate a proper test video with 120 frames using FFmpeg
# Each frame is black with the frame number in the center

OUTPUT_DIR="../src/__tests__/fixtures/files"
OUTPUT_FILE="${OUTPUT_DIR}/test-video-120frames.mp4"

# Create directory if it doesn't exist
mkdir -p "${OUTPUT_DIR}"

echo "Generating test video with 120 frames..."
echo "Each frame will be black with the frame number in the center"
echo ""

# Check if FFmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "[ERROR] FFmpeg is not installed. Please install FFmpeg first:"
    echo "   macOS: brew install ffmpeg"
    echo "   Linux: sudo apt-get install ffmpeg"
    echo "   Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

# Generate video: 2 seconds at 60fps = 120 frames
# Each frame: black background with white frame number in center
ffmpeg -f lavfi \
    -i color=c=black:s=200x200:d=2:r=60 \
    -vf "drawtext=text='%{frame_num}':fontsize=24:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2" \
    -c:v libx264 \
    -pix_fmt yuv420p \
    -y \
    "${OUTPUT_FILE}"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully generated: ${OUTPUT_FILE}"
    echo "   File size: $(ls -lh "${OUTPUT_FILE}" | awk '{print $5}')"
    echo "   Duration: 2 seconds"
    echo "   Frame rate: 60 fps"
    echo "   Total frames: 120"
else
    echo ""
    echo "❌ Failed to generate video"
    exit 1
fi

