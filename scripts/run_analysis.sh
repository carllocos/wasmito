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
  branches
  icount
  imix
  hotness
  mem_access
  basic-block
  instr-coverage
  call-graph
)

# Timeout in seconds for the execution of each analysis (10 minutes).
EXECUTION_TIMEOUT_SECONDS=600

usage() {
  echo "Usage: $0 <wasm-dir-or-file> <output-dir> [analysis] [repetitions]" >&2
  echo "  wasm-dir-or-file: either a directory containing one or more .wasm" >&2
  echo "                    files, or the path to a single .wasm file" >&2
  echo "  analysis: one of: ${ANALYSES[*]}, or 'all'" >&2
  echo "            multiple analyses can be given comma-separated," >&2
  echo "            e.g. 'call-graph,imix'" >&2
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
  IFS=',' read -r -a REQUESTED_ANALYSES <<< "$ANALYSIS_ARG"
  ANALYSES_TO_RUN=()
  for requested in "${REQUESTED_ANALYSES[@]}"; do
    # Allow whitespace around the commas, e.g. 'call-graph, imix'.
    requested="$(echo "$requested" | xargs)"
    [ -z "$requested" ] && continue
    found=0
    for a in "${ANALYSES[@]}"; do
      if [ "$a" = "$requested" ]; then
        found=1
        break
      fi
    done
    if [ "$found" -eq 0 ]; then
      echo "Error: unknown analysis '$requested'" >&2
      usage
      exit 1
    fi
    ANALYSES_TO_RUN+=("$requested")
  done
  if [ "${#ANALYSES_TO_RUN[@]}" -eq 0 ]; then
    echo "Error: no analysis given in '$ANALYSIS_ARG'" >&2
    usage
    exit 1
  fi
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

# Must match the header written by writeLastMeasurementToFile in
# src/util/benchmark_util.ts.
CSV_HEADER="analysis,wasm,parsing_ms,register_ms,deploy_ms,run_ms,total_ms"

# Returns success if the node output in the given file shows that node ran
# out of heap memory.
is_out_of_heap() {
  grep -qE 'JavaScript heap out of memory|Reached heap limit' "$1"
}

# Appends an out-of-heap row to the CSV file. Like the CLI, rows are
# prefixed with a newline unless the header still has to be written.
write_out_of_heap_row() {
  local row="$1,$2,out-of-heap,out-of-heap,out-of-heap,out-of-heap,out-of-heap"
  if [ -s "$csv_file" ] && [ "$(head -n 1 "$csv_file")" = "$CSV_HEADER" ]; then
    printf '\n%s' "$row" >> "$csv_file"
  else
    printf '%s\n%s' "$CSV_HEADER" "$row" >> "$csv_file"
  fi
}

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
      # Do not let a crashing node process (e.g. out of heap memory) abort the
      # whole script because of `set -e`/`pipefail`; capture its exit status.
      set +e
      node "$CLI" analysis "$analysis" "$wasm_file" --csv "$csv_file" --te "$EXECUTION_TIMEOUT_SECONDS" 2>&1 | tee "$all_file"
      node_status="${PIPESTATUS[0]}"
      set -e
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

      if [ "$node_status" -ne 0 ] && is_out_of_heap "$all_file"; then
        echo "Out of heap memory detected for analysis '$analysis' on '$wasm_file' (run $run/$REPETITIONS). Skipping remaining runs for this module/analysis." >&2
        write_out_of_heap_row "$analysis" "$(basename "$wasm_file")"
        break
      fi

      if [ -f "$csv_file" ] && tail -n 1 "$csv_file" | grep -qi "timeout"; then
        echo "Timeout detected in '$csv_file' for analysis '$analysis' on '$wasm_file' (run $run/$REPETITIONS). Skipping remaining runs for this module/analysis." >&2
        break
      fi
    done
  done
done
