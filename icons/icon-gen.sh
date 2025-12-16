#!/bin/bash
# Generate png icon from "./icon.svg" and colors from ../custom/manifest.inc.json

MANIFEST=../custom/manifest.inc.json
SIZE=128x128
COLORS=(
    "#548af7"     # bottom
    "#6c707e"     # top
    "transparent" # accent
)

dir=$(dirname -- "$(readlink -f -- "$0")")

mapfile -t colors < <(
    jq ".icon.default |
        .bottom     // \"${COLORS[0]}\",
        .top        // \"${COLORS[1]}\",
        .accent     // \"${COLORS[2]}\"" \
        "$dir/$MANIFEST"
)

sed -e "/id=\"bottom\"/s/fill=\"[^\"]*\"/fill=${colors[0]}/" \
    -e "/id=\"top\"/s/fill=\"[^\"]*\"/fill=${colors[1]}/" \
    -e "/id=\"accent\"/s/fill=\"[^\"]*\"/fill=${colors[2]}/" \
    "$dir/icon.svg" |
    magick -background none -size $SIZE - "$dir/icon.png"
