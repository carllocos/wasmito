#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI="$REPO_ROOT/dist/cjs/cli/cli.cjs"

# Run as if invoked from the wasmito repo root, so relative paths passed to
# this script (wasm dir/file, output dir) are resolved against the repo
# root regardless of the caller's current working directory.
cd "$REPO_ROOT"

ANALYSES=(
  no-analysis
  block-profiling
  call-graph
  coverage-instruction
  memory-trace
  branches
  instruction-count
  hotness
)

# Timeout in seconds for the execution of each analysis (10 minutes).
EXECUTION_TIMEOUT_SECONDS=600

usage() {
  echo "Usage: $0 <wasm-dir-or-file> <output-dir> [analysis] [repetitions]" >&2
  echo "  wasm-dir-or-file: either a directory containing one or more .wasm" >&2
  echo "                    files, or the path to a single .wasm file" >&2
  echo "  analysis: one of: ${ANALYSES[*]}, or 'all'" >&2
  echo "            if omitted or 'all', all of the above are run" >&2
  echo "  repetitions: positive integer (>= 1), number of times each" >&2
  echo "               analysis is run per wasm module. Defaults to 1" >&2
}

if [ "$#" -lt 2 ] || [ "$#" -gt 4 ]; then
  usage
  exit 1
fi

WASM_PATH="$1"
OUTPUT_DIR="$2"
ANALYSIS_ARG="${3:-}"
REPETITIONS="${4:-1}"

if [ ! -e "$WASM_PATH" ]; then
  echo "Error: wasm path '$WASM_PATH' does not exist" >&2
  exit 1
fi

if ! [[ "$REPETITIONS" =~ ^[0-9]+$ ]] || [ "$REPETITIONS" -lt 1 ]; then
  echo "Error: repetitions '$REPETITIONS' must be a positive integer (>= 1)" >&2
  usage
  exit 1
fi

if [ -n "$ANALYSIS_ARG" ] && [ "$ANALYSIS_ARG" != "all" ]; then
  found=0
  for a in "${ANALYSES[@]}"; do
    if [ "$a" = "$ANALYSIS_ARG" ]; then
      found=1
      break
    fi
  done
  if [ "$found" -eq 0 ]; then
    echo "Error: unknown analysis '$ANALYSIS_ARG'" >&2
    usage
    exit 1
  fi
  ANALYSES_TO_RUN=("$ANALYSIS_ARG")
else
  ANALYSES_TO_RUN=("${ANALYSES[@]}")
fi

if [ -d "$WASM_PATH" ]; then
  shopt -s nullglob
  WASM_FILES=("$WASM_PATH"/*.wasm)
  shopt -u nullglob

  if [ "${#WASM_FILES[@]}" -eq 0 ]; then
    echo "Error: no .wasm files found in '$WASM_PATH'" >&2
    exit 1
  fi
elif [ -f "$WASM_PATH" ]; then
  case "$WASM_PATH" in
    *.wasm) ;;
    *)
      echo "Error: '$WASM_PATH' is not a .wasm file" >&2
      exit 1
      ;;
  esac
  WASM_FILES=("$WASM_PATH")
else
  echo "Error: '$WASM_PATH' is neither a directory nor a file" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"
csv_file="$OUTPUT_DIR/benchmark.csv"

for analysis in "${ANALYSES_TO_RUN[@]}"; do
  analysis_dir="$OUTPUT_DIR/$analysis"
  mkdir -p "$analysis_dir"

  for wasm_file in "${WASM_FILES[@]}"; do
    module_name="$(basename "$wasm_file" .wasm)"

    for ((run = 1; run <= REPETITIONS; run++)); do
      if [ "$REPETITIONS" -gt 1 ]; then
        run_suffix=".run${run}"
      else
        run_suffix=""
      fi
      all_file="$analysis_dir/$module_name${run_suffix}.all"
      output_file="$analysis_dir/$module_name${run_suffix}.output"

      echo "Running analysis '$analysis' on '$wasm_file' (run $run/$REPETITIONS) -> '$all_file'"
      start_ms="$(node -e 'console.log(Date.now())')"
      node "$CLI" analysis "$analysis" "$wasm_file" --csv "$csv_file" --te "$EXECUTION_TIMEOUT_SECONDS" 2>&1 | tee "$all_file"
      end_ms="$(node -e 'console.log(Date.now())')"
      elapsed_ms="$((end_ms - start_ms))"

      # module.output keeps only the plain console.log output, i.e. strip ANSI
      # color codes (winston colorizes the log level), drop every logger line
      # (lines starting with "[<date> <loglevel>]"), drop lines starting with
      # "Failed to listen for incoming", and drop empty lines.
      sed -E 's/\x1b\[[0-9;]*m//g' "$all_file" \
        | grep -Ev '^\[[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:.]*Z?[[:space:]]+[a-zA-Z]+\]' \
        | grep -Ev '^Failed to listen for incoming' \
        | grep -Ev '^[[:space:]]*$' \
        > "$output_file" || true

      echo "Total time: ${elapsed_ms} ms" | tee -a "$all_file"

      if [ -f "$csv_file" ] && tail -n 1 "$csv_file" | grep -qi "timeout"; then
        echo "Timeout detected in '$csv_file' for analysis '$analysis' on '$wasm_file' (run $run/$REPETITIONS). Stopping remaining runs." >&2
        exit 1
      fi
    done
  done
done
