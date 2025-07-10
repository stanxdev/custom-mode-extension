#!/bin/bash
# Generate png icon from "./icon.svg" and colors from ../custom/manifest.inc.json

MANIFEST=../custom/manifest.inc.json
SIZE=128x128
COLORS=(
    "#6c707e" # disabled
    "#548af7" # enabled
    "#ffa040" # error
    "transparent"
)
FILL=(1 0 3) # fill color indices for circles (bottom, top, accent)

dir=$(dirname -- "$(readlink -f -- "$0")")

mapfile -t colors < <(
    jq ".colors |
        .disabled   // \"${COLORS[0]}\",
        .enabled    // \"${COLORS[1]}\",
        .error      // \"${COLORS[2]}\",
                       \"${COLORS[3]}\"" \
        "$dir/$MANIFEST"
)

sed -e "/id=\"bottom\"/s/fill=\"[^\"]*\"/fill=${colors[${FILL[0]}]}/" \
    -e "/id=\"top\"/s/fill=\"[^\"]*\"/fill=${colors[${FILL[1]}]}/" \
    -e "/id=\"accent\"/s/fill=\"[^\"]*\"/fill=${colors[${FILL[2]}]}/" \
    "$dir/icon.svg" |
    magick -background none -size $SIZE - "$dir/icon.png"
