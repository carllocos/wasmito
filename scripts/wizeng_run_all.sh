#!/bin/sh
#
# Usage: wizeng_run_all.sh <wasm-module-or-dir> [output-dir] [num-runs] [timeout-seconds] [x86-64|jvm]
#
# Benchmarks every whamm analysis monitor compiled by wei_compile_all.sh
# (monitors/*.wasm) against <wasm-module-or-dir>, plus a baseline run with
# no monitor attached at all (equivalent to omitting <whamm-module> on
# wizeng_run.sh / wizeng_lib_run.sh, recorded as "none" in the analysis
# column). This is the same directory-whamm-module mode those scripts use
# when <whamm-module> is a directory, except here the monitors directory
# is fixed to monitors/ rather than being an argument.
#
# monitors/cache_sim.wasm and monitors/loop_tracer.wasm depend on user
# libraries (as wei_compile_all.sh compiled them with --user-libs), so
# they are loaded here the same way wizeng_lib_run.sh does: the matching
# lib is appended to wizeng's --monitors list after whamm_core.wasm.
#
# All optimisations are always disabled (equivalent to the no-opt option
# of wizeng_run.sh / wizeng_lib_run.sh): --mode=int on x86-64, and
# --fast-functions=false on both targets.
#
# All paths are relative to the current working directory, which must be
# the whamm repo root, so this script is portable across machines.
#
# <wasm-module-or-dir> is either a single Wasm module or a directory of
# them (non-recursive), exactly as the second argument of wizeng_run.sh /
# wizeng_lib_run.sh.
#
# [output-dir] is where results are written, exactly as the third argument
# of wizeng_run.sh / wizeng_lib_run.sh. Defaults to times/.
#
# [num-runs] is how many times each (module, analysis) combination is run,
# exactly as the fifth argument of wizeng_run.sh / wizeng_lib_run.sh.
# Defaults to 35.
#
# [timeout-seconds] is how long a single run may take before it is killed,
# exactly as the sixth argument of wizeng_run.sh / wizeng_lib_run.sh.
# Defaults to 600 (10 minutes).
#
# [x86-64|jvm] selects which wizeng build to use, exactly as the first
# argument of wizeng_run.sh / wizeng_lib_run.sh. Defaults to x86-64.
#
# If a run times out, the remaining runs for that (module, analysis)
# combination are skipped, but the script continues on to the next module
# and analysis rather than stopping.
#
# Results are written to [output-dir], named after each Wasm module's
# basename (e.g. fib.wasm -> fib.*), same as wizeng_run.sh:
#   [output-dir]/fib.<analysis>.output  the wizeng output of every run
#   [output-dir]/fib.<analysis>.all     same, with each run's execution
#                                        time (or timeout notice) appended
#   [output-dir]/benchmark.csv          one row per run (all modules and
#                                        analyses): wasm_module,analysis,time_ms
#                                        ("analysis" is "none" for the
#                                        baseline, or the monitor's basename)

MODULE_ARG=$1
OUT_DIR=${2:-times}
NUM_RUNS=${3:-35}
TIMEOUT_SECS=${4:-600}
TARGET=${5:-x86-64}
WHAMM_DIR="monitors"
CORE="$(pwd)/target/wasm32-wasip1/release/whamm_core.wasm"

# Libs required by specific monitors compiled by wei_compile_all.sh, keyed
# by the monitor's basename (without .wasm).
CACHE_LIB="tests/libs/cache/cache.wasm"
LOOP_TRACER_LIB="tests/libs/loop_tracer/tracer.wasm"

if [ -z "$MODULE_ARG" ]; then
    echo "Usage: $0 <wasm-module-or-dir> [output-dir] [num-runs] [timeout-seconds] [x86-64|jvm]" >&2
    exit 1
fi

case "$TARGET" in
    jvm)
        WIZENG_BIN="wizeng.jvm"
        ;;
    x86-64)
        WIZENG_BIN="wizeng.x86-64-linux"
        ;;
    *)
        echo "Unknown target '$TARGET': expected 'x86-64' or 'jvm'" >&2
        exit 1
        ;;
esac

if command -v timeout >/dev/null 2>&1; then
    TIMEOUT_BIN=timeout
elif command -v gtimeout >/dev/null 2>&1; then
    TIMEOUT_BIN=gtimeout
else
    echo "error: 'timeout' command not found (install GNU coreutils)" >&2
    exit 1
fi

# Always run with all optimisations disabled (no-opt).
FAST_FUNCTIONS_FLAG="--fast-functions=false"
X86_MODE_FLAG="--mode=int"

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

if [ ! -d "$WHAMM_DIR" ]; then
    echo "error: monitors directory '$WHAMM_DIR' does not exist (run wei_compile_all.sh first)" >&2
    exit 1
fi
FOUND_ANY_WHAMM=0
for WHAMM_CHECK in "$WHAMM_DIR"/*.wasm; do
    [ -f "$WHAMM_CHECK" ] && FOUND_ANY_WHAMM=1 && break
done
if [ "$FOUND_ANY_WHAMM" -eq 0 ]; then
    echo "No *.wasm files found in monitors directory '$WHAMM_DIR' (run wei_compile_all.sh first)" >&2
    exit 1
fi
if [ -f "$WHAMM_DIR/cache_sim.wasm" ] && [ ! -f "$CACHE_LIB" ]; then
    echo "error: lib '$CACHE_LIB' does not exist (required by $WHAMM_DIR/cache_sim.wasm)" >&2
    exit 1
fi
if [ -f "$WHAMM_DIR/loop_tracer.wasm" ] && [ ! -f "$LOOP_TRACER_LIB" ]; then
    echo "error: lib '$LOOP_TRACER_LIB' does not exist (required by $WHAMM_DIR/loop_tracer.wasm)" >&2
    exit 1
fi

mkdir -p "$OUT_DIR"

run_module() {
    MODULE=$1

    BASENAME=$(basename "$MODULE" .wasm)
    OUT_STEM="$BASENAME.$ANALYSIS_TAG"
    OUTPUT_FILE="$OUT_DIR/$OUT_STEM.output"
    ALL_FILE="$OUT_DIR/$OUT_STEM.all"
    CSV_FILE="$OUT_DIR/benchmark.csv"
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
        if [ "$TARGET" = "x86-64" ]; then
            if [ -n "$WHAMM_FILE" ]; then
                {
                    "$TIMEOUT_BIN" "$TIMEOUT_SECS" "$WIZENG_BIN" --env=TO_CONSOLE=true --expose=wizeng $X86_MODE_FLAG $FAST_FUNCTIONS_FLAG --monitors="$WHAMM_FILE+$CORE$LIBS_MONITORS" "$MODULE" 2>&1
                    echo $? > "$STATUS_TMP"
                } | tee "$RUN_TMP"
            else
                {
                    "$TIMEOUT_BIN" "$TIMEOUT_SECS" "$WIZENG_BIN" $X86_MODE_FLAG $FAST_FUNCTIONS_FLAG "$MODULE" 2>&1
                    echo $? > "$STATUS_TMP"
                } | tee "$RUN_TMP"
            fi
        else
            if [ -n "$WHAMM_FILE" ]; then
                {
                    "$TIMEOUT_BIN" "$TIMEOUT_SECS" "$WIZENG_BIN" --env=TO_CONSOLE=true --expose=wizeng $FAST_FUNCTIONS_FLAG --monitors="$WHAMM_FILE+$CORE$LIBS_MONITORS" "$MODULE" 2>&1
                    echo $? > "$STATUS_TMP"
                } | tee "$RUN_TMP"
            else
                {
                    "$TIMEOUT_BIN" "$TIMEOUT_SECS" "$WIZENG_BIN" --mode=v3-int $FAST_FUNCTIONS_FLAG "$MODULE" 2>&1
                    echo $? > "$STATUS_TMP"
                } | tee "$RUN_TMP"
            fi
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

        if [ "$RUN_STATUS" -eq 124 ]; then
            # Skip the remaining runs for this (module, analysis) combination,
            # but let the caller continue on to the next module/analysis.
            break
        fi

        I=$((I + 1))
    done

    rm -f "$RUN_TMP" "$STATUS_TMP"
}

run_all_modules() {
    if [ -d "$MODULE_ARG" ]; then
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

# Baseline: run wizard without any whamm analysis attached.
WHAMM_FILE=""
ANALYSIS="none"
ANALYSIS_TAG="none"
LIBS_MONITORS=""
run_all_modules

for WHAMM_FILE in "$WHAMM_DIR"/*.wasm; do
    [ -f "$WHAMM_FILE" ] || continue
    ANALYSIS=$(basename "$WHAMM_FILE")
    ANALYSIS_TAG=$(basename "$WHAMM_FILE" .wasm)
    case "$ANALYSIS_TAG" in
        cache_sim)
            LIBS_MONITORS="+$CACHE_LIB"
            ;;
        loop_tracer)
            LIBS_MONITORS="+$LOOP_TRACER_LIB"
            ;;
        *)
            LIBS_MONITORS=""
            ;;
    esac
    run_all_modules
done
