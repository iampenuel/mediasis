#!/usr/bin/env bash
set -euo pipefail

INPUT="${1:-docs/media/demo/mediasis-demo.mov}"
OUTPUT="${2:-docs/media/demo/mediasis-demo.gif}"
PALETTE="docs/media/demo/.mediasis-demo-palette.png"
START_AT="${START_AT:-00:00:00}"
DURATION="${DURATION:-18}"
FPS="${FPS:-10}"
WIDTH="${WIDTH:-540}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate an animated demo GIF." >&2
  echo "Install with Homebrew: brew install ffmpeg" >&2
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "Input video not found: $INPUT" >&2
  exit 1
fi

ffmpeg -y -ss "$START_AT" -t "$DURATION" -i "$INPUT" \
  -vf "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos,palettegen" \
  "$PALETTE"

ffmpeg -y -ss "$START_AT" -t "$DURATION" -i "$INPUT" -i "$PALETTE" \
  -lavfi "fps=${FPS},scale=${WIDTH}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a" \
  -loop 0 "$OUTPUT"

rm -f "$PALETTE"

echo "Generated $OUTPUT"
