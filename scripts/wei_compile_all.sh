#!/bin/sh
#
# Usage: wei_compile_all.sh
#
# Compiles the fixed set of whamm paper-eval analyses (see the list below)
# to wei monitors, the same way wei_compile.sh / wei_compile_libs.sh do,
# writing every compiled .wasm to monitors/.
#
# All paths are relative to the current working directory, which must be
# the whamm repo root, so this script is portable across machines.
#
# A failing compile does not stop the rest; at the end, every script that
# failed to compile is listed and the script exits non-zero.

OUTPUT_DIR="monitors"

compile() {
    # $1=whamm-script $2=output-file $3=libs (optional, <name>=<path>[,...])
    if [ -n "$3" ]; then
        whamm instr --script "$1" --wei --user-libs "$3" -o "$2"
    else
        whamm instr --script "$1" --wei -o "$2"
    fi
}

mkdir -p "$OUTPUT_DIR"

STATUS=0
FAILED=""

run() {
    if ! compile "$1" "$2" "$3"; then
        STATUS=1
        FAILED="$FAILED$1
"
    fi
}

run "tests/scripts/paper_eval/branches/branches-subset.mm" "$OUTPUT_DIR/branches.wasm"
run "tests/scripts/paper_eval/ins_count/ins_count-hw.mm" "$OUTPUT_DIR/icount.wasm"
run "tests/scripts/paper_eval/ins_coverage/coverage.mm" "$OUTPUT_DIR/instr_coverage.wasm"
run "tests/scripts/paper_eval/hotness/hotness-hw.mm" "$OUTPUT_DIR/hotness.wasm"
run "tests/scripts/paper_eval/cache_sim/cache_sim-hw.mm" "$OUTPUT_DIR/cache_sim.wasm" "cache=tests/libs/cache/cache.wasm"
run "tests/scripts/paper_eval/mem_access_tracing/mem_access.mm" "$OUTPUT_DIR/mem_access.wasm"
run "tests/scripts/paper_eval/loop_tracer/loop_tracer.mm" "$OUTPUT_DIR/loop_tracer.wasm" "tracer=tests/libs/loop_tracer/tracer.wasm"
run "tests/scripts/paper_eval/basic_block_profiling/basic-blocks.mm" "$OUTPUT_DIR/basic_blocks.wasm"
run "tests/scripts/paper_eval/call_graph/call_graph.mm" "$OUTPUT_DIR/call_graph.wasm"
run "tests/scripts/paper_eval/categories/category-hw.mm" "$OUTPUT_DIR/imix.wasm"

if [ -n "$FAILED" ]; then
    echo "" >&2
    echo "Compilation failed for the following files:" >&2
    printf '%s' "$FAILED" | sed 's/^/  /' >&2
fi

exit "$STATUS"
