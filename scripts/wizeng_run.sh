#!/bin/sh
#
# Usage: wizeng_run.sh <wasm-module-or-dir> <output-dir> [optimise|no-opt] <num-runs> [timeout-seconds] [whamm-module]
#
# Runs a Wasm module with wizeng.jvm and always reports its execution time
# in milliseconds.
#
# If <wasm-module-or-dir> is a directory, every *.wasm file directly inside
# it (non-recursive) is run in turn, each producing its own set of result
# files as described below.
#
# NOTE: this build of wizeng.jvm only registers the "v3-int" execution
# mode (the slow interpreter) -- the optimizing/JIT tiers (jit/spc/lazy/dyn)
# only exist in Wizard's native x86-64 target, not the JVM one, so there is
# no wizeng flag that turns on "all optimisations" here. --fast-functions
# is the only performance-related toggle this build exposes (it makes
# functions exported with a `fast:` name prefix run as fast functions), so
# that's what "optimise" enables; both modes otherwise run the interpreter.
#
# When <whamm-module> is provided, a Wasm module is not run directly.
# Instead, as in wei_run.sh, <whamm-module> is treated as a whamm
# instrumentation module, combined with whamm_core.wasm and attached to
# the Wasm module via wizeng's --monitors flag. The optimise/no-opt toggle
# still applies in this mode.
#
# If <whamm-module> is a directory, every *.wasm file directly inside it
# (non-recursive) is used in turn as the whamm module, and all the benchmarks
# are run once per whamm module, and additionally once with no whamm analysis
# at all (the baseline, recorded as "none" in the analysis column and with
# files named e.g. fib.none.output). In this case the per-module .output and .all
# files include the whamm module's name (e.g. fib.<analysis>.output) so that
# analyses don't overwrite each other, and all CSV rows are written to a
# single <output-dir>/benchmark.csv; the "analysis" CSV column identifies
# which whamm module each row was produced with.
#
# <num-runs> is a positive integer giving how many times to run the
# command.
#
# <timeout-seconds> is a positive integer giving how long a single run may
# take before it is killed; it defaults to 30 and can be set without also
# having to provide <whamm-module>. A timed-out run is recorded as
# "TIMEOUT" in fib.csv's time_ms column (rather than a number) and the
# script moves on to the next run/module.
#
# Results are written to <output-dir>, named after each Wasm module's
# basename (e.g. fib.wasm -> fib.*):
#   <output-dir>/fib.output  the wizeng output of every run, concatenated
#                             (each run separated by a "=== run N ===" line)
#   <output-dir>/fib.all     same as fib.output, but each run's section also
#                             ends with that run's execution time line (or a
#                             timeout notice, when the run timed out)
#   <output-dir>/fib.csv     one row per run appended (header written once):
#                             wasm_module,analysis,time_ms
#                             ("analysis" is <whamm-module>'s basename, or
#                             "none" when it was omitted)
#
# When <wasm-module-or-dir> or <whamm-module> is a directory, the CSV rows
# for every run are instead all appended into a single
# <output-dir>/benchmark.csv (the per-module .output and .all files are still
# written separately).

MODULE_ARG=$1
OUT_DIR=$2
OPT_MODE=$3
NUM_RUNS=$4
TIMEOUT_SECS=${5:-30}
WHAMM_FILE=$6
CORE="/Users/crojcas/Documents/projects/whamm/target/wasm32-wasip1/release/whamm_core.wasm"

if [ -z "$MODULE_ARG" ] || [ -z "$OUT_DIR" ] || [ -z "$NUM_RUNS" ]; then
    echo "Usage: $0 <wasm-module-or-dir> <output-dir> [optimise|no-opt] <num-runs> [timeout-seconds] [whamm-module]" >&2
    exit 1
fi

if command -v timeout >/dev/null 2>&1; then
    TIMEOUT_BIN=timeout
elif command -v gtimeout >/dev/null 2>&1; then
    TIMEOUT_BIN=gtimeout
else
    echo "error: 'timeout' command not found (install GNU coreutils)" >&2
    exit 1
fi

case "$OPT_MODE" in
    optimise)
        FAST_FUNCTIONS_FLAG="--fast-functions=true"
        ;;
    no-opt|"")
        FAST_FUNCTIONS_FLAG="--fast-functions=false"
        ;;
    *)
        echo "Unknown option '$OPT_MODE': expected 'optimise' or 'no-opt'" >&2
        exit 1
        ;;
esac

case "$NUM_RUNS" in
    ''|*[!0-9]*)
        echo "Invalid num-runs '$NUM_RUNS': expected a positive integer" >&2
        exit 1
        ;;
esac
if [ "$NUM_RUNS" -lt 1 ]; then
    echo "Invalid num-runs '$NUM_RUNS': expected a positive integer" >&2
    exit 1
fi

case "$TIMEOUT_SECS" in
    ''|*[!0-9]*)
        echo "Invalid timeout-seconds '$TIMEOUT_SECS': expected a positive integer" >&2
        exit 1
        ;;
esac
if [ "$TIMEOUT_SECS" -lt 1 ]; then
    echo "Invalid timeout-seconds '$TIMEOUT_SECS': expected a positive integer" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

run_module() {
    MODULE=$1

    BASENAME=$(basename "$MODULE" .wasm)
    # When looping over a directory of whamm modules, include the analysis
    # name in the .output/.all file names so analyses don't overwrite each
    # other (e.g. fib.<analysis>.output).
    if [ -n "$ANALYSIS_TAG" ]; then
        OUT_STEM="$BASENAME.$ANALYSIS_TAG"
    else
        OUT_STEM="$BASENAME"
    fi
    OUTPUT_FILE="$OUT_DIR/$OUT_STEM.output"
    ALL_FILE="$OUT_DIR/$OUT_STEM.all"
    CSV_FILE="${COMBINED_CSV:-$OUT_DIR/$BASENAME.csv}"
    RUN_TMP=$(mktemp)
    STATUS_TMP=$(mktemp)
    : > "$OUTPUT_FILE"
    : > "$ALL_FILE"

    I=1
    while [ "$I" -le "$NUM_RUNS" ]; do
        START_MS=$(python3 -c 'import time; print(int(time.time() * 1000))')

        # Stream stdout/stderr to the terminal as the command runs while also
        # capturing it in $RUN_TMP. A plain pipe would hide the command's exit
        # status (no pipefail in POSIX sh), so it is saved via $STATUS_TMP.
        if [ -n "$WHAMM_FILE" ]; then
            {
                "$TIMEOUT_BIN" "$TIMEOUT_SECS" wizeng.jvm --env=TO_CONSOLE=true --expose=wizeng $FAST_FUNCTIONS_FLAG --monitors="$WHAMM_FILE+$CORE" "$MODULE" 2>&1
                echo $? > "$STATUS_TMP"
            } | tee "$RUN_TMP"
        else
            {
                "$TIMEOUT_BIN" "$TIMEOUT_SECS" wizeng.jvm --mode=v3-int $FAST_FUNCTIONS_FLAG "$MODULE" 2>&1
                echo $? > "$STATUS_TMP"
            } | tee "$RUN_TMP"
        fi
        RUN_STATUS=$(cat "$STATUS_TMP")

        END_MS=$(python3 -c 'import time; print(int(time.time() * 1000))')
        ELAPSED_MS=$((END_MS - START_MS))

        {
            echo "=== run $I ==="
            cat "$RUN_TMP"
        } >> "$OUTPUT_FILE"

        if [ "$RUN_STATUS" -eq 124 ]; then
            echo "wizeng execution timed out after ${TIMEOUT_SECS}s" >&2
            {
                echo "=== run $I ==="
                cat "$RUN_TMP"
                echo "wizeng execution timed out after ${TIMEOUT_SECS}s"
            } >> "$ALL_FILE"
            TIME_VALUE="TIMEOUT"
        else
            echo "wizeng execution time: $ELAPSED_MS ms"
            {
                echo "=== run $I ==="
                cat "$RUN_TMP"
                echo "wizeng execution time: $ELAPSED_MS ms"
            } >> "$ALL_FILE"
            TIME_VALUE="$ELAPSED_MS"
        fi

        if [ ! -f "$CSV_FILE" ]; then
            echo "wasm_module,analysis,time_ms" > "$CSV_FILE"
        fi
        echo "$(basename "$MODULE"),$ANALYSIS,$TIME_VALUE" >> "$CSV_FILE"

        I=$((I + 1))
    done

    rm -f "$RUN_TMP" "$STATUS_TMP"
}

run_all_modules() {
    if [ -d "$MODULE_ARG" ]; then
        COMBINED_CSV="$OUT_DIR/benchmark.csv"
        FOUND_ANY=0
        for MODULE_FILE in "$MODULE_ARG"/*.wasm; do
            [ -f "$MODULE_FILE" ] || continue
            FOUND_ANY=1
            run_module "$MODULE_FILE"
        done
        if [ "$FOUND_ANY" -eq 0 ]; then
            echo "No *.wasm files found in directory '$MODULE_ARG'" >&2
            exit 1
        fi
    else
        run_module "$MODULE_ARG"
    fi
}

if [ -n "$WHAMM_FILE" ] && [ -d "$WHAMM_FILE" ]; then
    WHAMM_DIR=$WHAMM_FILE
    COMBINED_CSV="$OUT_DIR/benchmark.csv"
    FOUND_ANY_WHAMM=0
    for WHAMM_FILE in "$WHAMM_DIR"/*.wasm; do
        [ -f "$WHAMM_FILE" ] && FOUND_ANY_WHAMM=1 && break
    done
    if [ "$FOUND_ANY_WHAMM" -eq 0 ]; then
        echo "No *.wasm files found in whamm-module directory '$WHAMM_DIR'" >&2
        exit 1
    fi

    # Baseline: run wizard without any whamm analysis attached.
    WHAMM_FILE=""
    ANALYSIS="none"
    ANALYSIS_TAG="none"
    run_all_modules

    for WHAMM_FILE in "$WHAMM_DIR"/*.wasm; do
        [ -f "$WHAMM_FILE" ] || continue
        ANALYSIS=$(basename "$WHAMM_FILE")
        ANALYSIS_TAG=$(basename "$WHAMM_FILE" .wasm)
        run_all_modules
    done
else
    ANALYSIS_TAG=""
    if [ -n "$WHAMM_FILE" ]; then
        ANALYSIS=$(basename "$WHAMM_FILE")
    else
        ANALYSIS="none"
    fi
    run_all_modules
fi
