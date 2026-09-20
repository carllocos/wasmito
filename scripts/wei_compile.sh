#!/bin/sh
#
# Usage: wei_compile.sh <whamm-script-or-dir> <output-file-or-dir>
#
# Compiles a whamm script to a wei monitor.
#
# If <whamm-script-or-dir> is a directory, then <output-file-or-dir> must be
# a directory too. Every immediate subdirectory of <whamm-script-or-dir> is
# searched (non-recursively) for files ending in .mm, and each one is compiled
# as a whamm script to <output-file-or-dir>/<name>.wasm, where <name> is the
# .mm file's name without its extension. In this mode the following .mm files
# are ignored: those starting with "category", those starting with "branches-"
# (except branches-subset), mem_access-nomatches and ins_count-rust.
# A failing compile does not stop the rest; at the end, every .mm file that
# failed to compile is listed and the script exits non-zero.
WHAMM_FILE=$1
OUTPUT_FILE=$2

compile() {
    #cargo run -- instr --script $1 --wei -o $2

    whamm instr --script "$1" --wei -o "$2"
}

if [ -d "$WHAMM_FILE" ]; then
    if [ -z "$OUTPUT_FILE" ]; then
        echo "Usage: $0 <whamm-script-or-dir> <output-file-or-dir>" >&2
        exit 1
    fi
    if [ -e "$OUTPUT_FILE" ] && [ ! -d "$OUTPUT_FILE" ]; then
        echo "error: '$OUTPUT_FILE' must be a directory when '$WHAMM_FILE' is a directory" >&2
        exit 1
    fi
    mkdir -p "$OUTPUT_FILE"

    FOUND_ANY=0
    SEEN=""
    STATUS=0
    FAILED=""
    for SUBDIR in "$WHAMM_FILE"/*/; do
        [ -d "$SUBDIR" ] || continue
        for MM_FILE in "$SUBDIR"*.mm; do
            [ -f "$MM_FILE" ] || continue
            NAME=$(basename "$MM_FILE" .mm)
            case "$NAME" in
                branches-subset)
                    ;;
                category*|branches-*|mem_access-nomatches|ins_count-rust)
                    continue
                    ;;
            esac
            FOUND_ANY=1
            case " $SEEN " in
                *" $NAME "*)
                    echo "warning: more than one '$NAME.mm' found; '$OUTPUT_FILE/$NAME.wasm' will be overwritten by $MM_FILE" >&2
                    ;;
            esac
            SEEN="$SEEN $NAME"
            if ! compile "$MM_FILE" "$OUTPUT_FILE/$NAME.wasm"; then
                STATUS=1
                FAILED="$FAILED$MM_FILE
"
            fi
        done
    done

    if [ "$FOUND_ANY" -eq 0 ]; then
        echo "No .mm files found in any subdirectory of '$WHAMM_FILE'" >&2
        exit 1
    fi
    if [ -n "$FAILED" ]; then
        echo "" >&2
        echo "Compilation failed for the following files:" >&2
        printf '%s' "$FAILED" | sed 's/^/  /' >&2
    fi
    exit "$STATUS"
else
    compile "$WHAMM_FILE" "$OUTPUT_FILE"
fi
