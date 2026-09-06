#!/usr/bin/env bash
# Tier-1 preview encoder: master -> <5 MB silent 3-6s loop, WebM + MP4 + poster.
#
#   ./scripts/encode-preview.sh media-src/turntable.mov pptx-studio 00:00:12 4.5
#
# Prints the exact `featured_preview` frontmatter block to paste into the MDX,
# including the byte count the schema will validate against.
set -euo pipefail

SRC="$1"; SLUG="$2"; START="${3:-0}"; DUR="${4:-5}"
OUT="public/media/$SLUG"
mkdir -p "$OUT"

# VP9: best quality-per-byte for short silent loops. -an strips audio entirely.
ffmpeg -y -ss "$START" -t "$DUR" -i "$SRC" \
  -vf "scale=1280:-2:flags=lanczos" -an \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -deadline good \
  "$OUT/preview.webm"

# H.264 fallback for Safari. faststart puts the moov atom first so it streams.
ffmpeg -y -ss "$START" -t "$DUR" -i "$SRC" \
  -vf "scale=1280:-2:flags=lanczos" -an \
  -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p -movflags +faststart \
  "$OUT/preview.mp4"

ffmpeg -y -ss "$START" -t 0.04 -i "$SRC" -vf "scale=1280:-2" -frames:v 1 "$OUT/poster.avif"

BYTES=$(stat -f%z "$OUT/preview.mp4" 2>/dev/null || stat -c%s "$OUT/preview.mp4")
WEBM=$(stat -f%z "$OUT/preview.webm" 2>/dev/null || stat -c%s "$OUT/preview.webm")
[ "$WEBM" -gt "$BYTES" ] && BYTES=$WEBM

cat <<YAML

featured_preview:
  poster: /media/$SLUG/poster.avif
  webm: /media/$SLUG/preview.webm
  mp4: /media/$SLUG/preview.mp4
  duration_s: $DUR
  bytes: $BYTES
  width: 1280
  height: 720
  alt: TODO — describe what the loop shows.
YAML

if [ "$BYTES" -gt 5242880 ]; then
  echo "WARNING: $((BYTES / 1024 / 1024)) MB exceeds the 5 MB tier-1 budget." >&2
  echo "Raise -crf, shorten the clip, or scale to 960px." >&2
fi
