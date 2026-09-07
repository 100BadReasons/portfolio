#!/usr/bin/env bash
# Build an animated cover from N frames of a source video.
#
#   ./scripts/cover-frames.sh <source.mp4> <slug> [frames] [seconds-per-frame]
#   ./scripts/cover-frames.sh ~/Movies/film.mp4 my-project 6 0.5
#
# Frames are spaced EVENLY across the middle of the runtime, not chosen at
# random. Random picks land on cuts, black frames and motion blur, and would
# also make every run produce a different cover -- so the repo would churn and
# you could never reproduce a build. Even spacing is deterministic and samples
# the whole piece.
#
# Output is a looping WebM + MP4, not a GIF. A 6-frame GIF at this size is
# several MB and limited to 256 colours, which wrecks film stills. The video
# encodes are 20-50x smaller, full colour, and the feed already autoplays
# muted loops when they scroll into view.
set -euo pipefail

SRC="$1"; SLUG="$2"; N="${3:-6}"; HOLD="${4:-0.5}"
OUT="public/media/$SLUG"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
# Sample the middle 90% so titles and end cards do not dominate.
START=$(echo "$DUR * 0.05" | bc -l)
SPAN=$(echo "$DUR * 0.90" | bc -l)

echo "Source: ${DUR}s -> sampling $N frames across ${SPAN}s"
for i in $(seq 0 $((N - 1))); do
  T=$(echo "$START + ($SPAN / $N) * $i" | bc -l)
  ffmpeg -nostdin -v error -ss "$T" -i "$SRC" -frames:v 1 \
    -vf "scale=1280:-2:flags=lanczos" "$TMP/$(printf '%02d' "$i").png"
  printf '  frame %d at %.1fs\n' "$i" "$T"
done

FPS=$(echo "1 / $HOLD" | bc -l)

# VP9: best quality-per-byte for a short silent loop. -an strips audio.
ffmpeg -nostdin -v error -y -framerate "$FPS" -i "$TMP/%02d.png" \
  -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -pix_fmt yuv420p -an \
  "$OUT/preview.webm"

# H.264 fallback for Safari; faststart puts the moov atom first so it streams.
ffmpeg -nostdin -v error -y -framerate "$FPS" -i "$TMP/%02d.png" \
  -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -movflags +faststart -an \
  "$OUT/preview.mp4"

cp "$TMP/00.png" "$TMP/poster-src.png"
ffmpeg -nostdin -v error -y -i "$TMP/poster-src.png" -frames:v 1 "$OUT/poster.avif"

# Social card. Separate from the video poster because Slack, iMessage and X
# still handle AVIF poorly, and a blank unfurl is worse than a larger file.
mkdir -p public/og
ffmpeg -nostdin -v error -y -i "$TMP/poster-src.png" \
  -vf "scale=1200:-2,crop=1200:628" -frames:v 1 -q:v 4 "public/og/$SLUG.jpg"

W=$(ffprobe -v error -select_streams v -show_entries stream=width -of csv=p=0 "$OUT/preview.mp4")
H=$(ffprobe -v error -select_streams v -show_entries stream=height -of csv=p=0 "$OUT/preview.mp4")
BW=$(stat -f%z "$OUT/preview.webm" 2>/dev/null || stat -c%s "$OUT/preview.webm")
BM=$(stat -f%z "$OUT/preview.mp4"  2>/dev/null || stat -c%s "$OUT/preview.mp4")
BYTES=$(( BW > BM ? BW : BM ))
TOTAL=$(echo "$N * $HOLD" | bc -l)

cat <<YAML

featured_preview:
  kind: video
  poster: /media/$SLUG/poster.avif
  webm: /media/$SLUG/preview.webm
  mp4: /media/$SLUG/preview.mp4
  duration_s: $(printf '%.1f' "$TOTAL")
  bytes: $BYTES
  width: $W
  height: $H
  alt: TODO -- describe what the cover shows.
og_image: /og/$SLUG.jpg
YAML

echo
printf 'webm %d KB | mp4 %d KB | budget 5120 KB\n' $((BW/1024)) $((BM/1024))
if [ "$BYTES" -gt 5242880 ]; then
  echo "WARNING: over the 5 MB tier-1 budget. Raise -crf or scale to 960." >&2
fi
