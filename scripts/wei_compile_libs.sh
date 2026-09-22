#!/bin/sh
#
# Usage: wei_compile_libs.sh <whamm-script> <output-file> [<lib_name>=<lib_path>[,<lib_name>=<lib_path>...]]
#
# Like wei_compile.sh, but for a single whamm script that uses user libraries
# (e.g. `use cache;`). Compiles the script to a wei monitor at <output-file>.
#
# The libs argument is the same format as whamm's --user-libs and the
# contents of the tests' *.mm.libs files, e.g.:
#   cache=tests/libs/cache/cache.wasm
#
# If the libs argument is omitted, the script looks for the test-suite
# convention file <script-dir>/libs/<script-file>.libs (e.g.
# tests/scripts/paper_eval/cache_sim/libs/cache_sim-hw.mm.libs) and uses its
# contents. Lib paths in that file are relative to the whamm repo root.
#
# The resulting monitor imports each lib by name, so the lib must also be
# passed to the engine when running it (see wizeng_lib_run.sh).
WHAMM_FILE=$1
OUTPUT_FILE=$2
LIBS=$3

if [ -z "$WHAMM_FILE" ] || [ -z "$OUTPUT_FILE" ]; then
    echo "Usage: $0 <whamm-script> <output-file> [<lib_name>=<lib_path>[,...]]" >&2
    exit 1
fi

if [ -z "$LIBS" ]; then
    LIBS_FILE="$(dirname "$WHAMM_FILE")/libs/$(basename "$WHAMM_FILE").libs"
    if [ -f "$LIBS_FILE" ]; then
        LIBS=$(tr -d ' \n\r' < "$LIBS_FILE")
        echo "using libs from $LIBS_FILE: $LIBS"
    fi
fi

if [ -n "$LIBS" ]; then
    whamm instr --script "$WHAMM_FILE" --wei --user-libs "$LIBS" -o "$OUTPUT_FILE"
else
    whamm instr --script "$WHAMM_FILE" --wei -o "$OUTPUT_FILE"
fi
