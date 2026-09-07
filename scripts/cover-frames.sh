#!/usr/bin/env bash
# Build an animated cover from N frames of a source video.
#
#   ./scripts/cover-frames.sh <source.mp4|folder-of-stills> <slug> [frames] [hold]
#   ./scripts/cover-frames.sh ~/Movies/film.mp4      my-project 6 0.5
#   ./scripts/cover-frames.sh ~/Desktop/must-wins/   my-project 6 0.5
#
# The second form takes a FOLDER of stills instead of a video, for when the
# master is not to hand -- pause the film at six moments, screenshot each, drop
# them in a folder. Files are used in filename order, so name them 01..06.
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

if [ -d "$SRC" ]; then
  # Folder-of-stills mode. No extraction needed; normalise to a common width so
  # frames from different screenshots do not jitter between cuts.
  echo "Source: folder of stills -> $SRC"
  i=0
  for f in "$SRC"/*; do
    case "$f" in *.png|*.jpg|*.jpeg|*.PNG|*.JPG|*.JPEG) ;; *) continue ;; esac
    # Force an exact 1280x720 for every frame. Hand-taken screenshots vary in
    # aspect ratio, and ffmpeg's image sequence encoder requires all frames to
    # share dimensions -- without this it fails on a mixed set.
    ffmpeg -nostdin -v error -y -i "$f" \
      -vf "scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720" \
      "$TMP/$(printf '%02d' "$i").png"
    printf '  frame %d from %s\n' "$i" "$(basename "$f")"
    i=$((i + 1))
  done
  [ "$i" -gt 0 ] || { echo "No images found in $SRC" >&2; exit 1; }
  N=$i
else

DUR=$(ffprobe -v error -show_entries format=duration -of default=nk=1:nw=1 "$SRC")
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
fi

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
# Social cards are 1.91:1. Cropping a normal frame to that is fine, but cropping
# an ultra-wide frame throws away most of the composition -- so above 2.5:1 the
# frame is letterboxed instead, showing the whole thing smaller rather than a
# narrow slice of it.
SRCW=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=nk=1:nw=1 "$TMP/poster-src.png")
SRCH=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nk=1:nw=1 "$TMP/poster-src.png")
if [ "$(echo "$SRCW / $SRCH > 2.5" | bc -l)" = "1" ]; then
  echo "  ultra-wide source -> letterboxing the social card instead of cropping"
  ffmpeg -nostdin -v error -y -i "$TMP/poster-src.png" \
    -vf "scale=1200:628:force_original_aspect_ratio=decrease,pad=1200:628:(ow-iw)/2:(oh-ih)/2:color=black" \
    -frames:v 1 -q:v 4 "public/og/$SLUG.jpg"
else
  ffmpeg -nostdin -v error -y -i "$TMP/poster-src.png" \
    -vf "scale=1200:-2,crop=1200:628" -frames:v 1 -q:v 4 "public/og/$SLUG.jpg"
fi

W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of default=nk=1:nw=1 "$OUT/preview.mp4")
H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of default=nk=1:nw=1 "$OUT/preview.mp4")
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
