#!/usr/bin/env bash
#
# Computes descriptive statistics (count, mean, median, min, max, stdev) per
# analysis and wasm module from a benchmark CSV produced by run_analysis.sh,
# and compares every analysis against the "no-analysis" baseline to show how
# much slower each analysis is on each wasm module. Tables are organised per
# analysis (left-most column), then per wasm module.
#
# Usage: stats_for_wasmito.sh <csv-file> [output-dir] [--verbose]
#                             [--analysis <name>] [--wasm <name.wasm>]
#
#   --verbose: by default only the total_ms metric is displayed. With
#              --verbose, all metrics (parsing, register, deploy, run, total)
#              are displayed. The optional CSV output always contains all
#              metrics regardless of this flag.
#
#   --analysis <name>: only display rows for the given analysis. The
#              "no-analysis" baseline is still used to compute the overhead
#              table.
#
#   --wasm <name.wasm>: only display rows for the given wasm module.
#
#   --analysis and --wasm can be combined with each other and with --verbose.
#   Like --verbose, they only affect the printed tables; the optional CSV
#   output always contains every analysis and module.
#
#   csv-file: a CSV with header:
#             analysis,wasm,parsing_ms,spawn_ms,register_ms,deploy_ms,run_ms,total_ms
#             One row per run; multiple rows for the same (analysis, wasm)
#             pair are treated as repeated runs and aggregated together.
#             Rows for failed runs are not aggregated but counted in the
#             Timeouts column (a field containing e.g. "timed out after
#             600000 ms") or the OutOfHeap column (the "out-of-heap" rows
#             written by run_analysis.sh). When every run of an
#             (analysis, wasm) pair failed, its statistics are shown as
#             "timeout" or "out-of-heap" (or "failed" if both occurred).
#
#   output-dir: optional. When given, two CSV files are written there in
#               addition to the tables printed to stdout:
#                 stats_per_module_analysis.csv
#                 comparison_vs_baseline.csv
#
# The baseline analysis is always named "no-analysis" (as produced by
# run_analysis.sh). For every other analysis, on every wasm module that also
# has "no-analysis" runs, this reports the mean-based difference, slowdown
# factor, and percent overhead relative to that baseline, per metric column.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Run as if invoked from the wasmito repo root, so relative paths passed to
# this script (csv file, output dir) are resolved against the repo root
# regardless of the caller's current working directory.
cd "$REPO_ROOT"

usage() {
    echo "Usage: $(basename "$0") <csv-file> [output-dir] [--verbose] [--analysis <name>] [--wasm <name.wasm>]" >&2
    echo "  --verbose:  also show parsing, spawn, register, deploy and run metrics" >&2
    echo "              (by default only total_ms is displayed)." >&2
    echo "  --analysis: only display information for the given analysis." >&2
    echo "  --wasm:     only display information for the given wasm module." >&2
    echo "  csv-file:   CSV with header:" >&2
    echo "              analysis,wasm,parsing_ms,spawn_ms,register_ms,deploy_ms,run_ms,total_ms" >&2
    echo "  output-dir: optional. If given, writes:" >&2
    echo "                stats_per_module_analysis.csv" >&2
    echo "                comparison_vs_baseline.csv" >&2
    echo "              there, in addition to printing tables to stdout." >&2
}

VERBOSE=0
FILTER_ANALYSIS=""
FILTER_WASM=""
POSITIONAL=()
while [ "$#" -gt 0 ]; do
    case "$1" in
        --verbose)
            VERBOSE=1
            ;;
        --analysis|--wasm)
            if [ "$#" -lt 2 ] || [ -z "$2" ]; then
                echo "Error: $1 requires a value" >&2
                usage
                exit 1
            fi
            if [ "$1" = "--analysis" ]; then
                FILTER_ANALYSIS="$2"
            else
                FILTER_WASM="$2"
            fi
            shift
            ;;
        --analysis=*)
            FILTER_ANALYSIS="${1#--analysis=}"
            ;;
        --wasm=*)
            FILTER_WASM="${1#--wasm=}"
            ;;
        -*)
            echo "Error: unknown option '$1'" >&2
            usage
            exit 1
            ;;
        *)
            POSITIONAL+=("$1")
            ;;
    esac
    shift
done

if [ "${#POSITIONAL[@]}" -lt 1 ] || [ "${#POSITIONAL[@]}" -gt 2 ]; then
    usage
    exit 1
fi

CSV_FILE="${POSITIONAL[0]}"
OUTPUT_DIR="${POSITIONAL[1]:-}"

if [ ! -f "$CSV_FILE" ]; then
    echo "Error: csv file '$CSV_FILE' does not exist" >&2
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 is required but was not found on PATH" >&2
    exit 1
fi

if [ -n "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR"
fi

python3 - "$CSV_FILE" "$OUTPUT_DIR" "$VERBOSE" "$FILTER_ANALYSIS" "$FILTER_WASM" <<'PYEOF'
import csv
import re
import statistics
import sys

BASELINE = "no-analysis"
METRICS = ["parsing_ms", "spawn_ms", "register_ms", "deploy_ms", "run_ms", "total_ms"]
REQUIRED_COLUMNS = ["analysis", "wasm"] + METRICS
TIMEOUT = "timeout"
OUT_OF_HEAP = "out-of-heap"
# Failure kind -> pattern that identifies it in any field of a CSV row.
FAILURE_PATTERNS = {
    TIMEOUT: re.compile(r"time[sd]?[ _-]?out", re.IGNORECASE),
    OUT_OF_HEAP: re.compile(r"out[ _-]?of[ _-]?heap|heap out of memory", re.IGNORECASE),
}

csv_path = sys.argv[1]
output_dir = sys.argv[2] if len(sys.argv) > 2 else ""
verbose = len(sys.argv) > 3 and sys.argv[3] == "1"
filter_analysis = sys.argv[4] if len(sys.argv) > 4 else ""
filter_wasm = sys.argv[5] if len(sys.argv) > 5 else ""

# Metrics shown in the printed tables. The CSV output always has every metric.
DISPLAY_METRICS = METRICS if verbose else ["total_ms"]

with open(csv_path, newline="") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames or []
    missing = [c for c in REQUIRED_COLUMNS if c not in fieldnames]
    if missing:
        sys.exit(
            f"Error: csv file '{csv_path}' is missing required column(s): "
            f"{', '.join(missing)}"
        )

    # groups[analysis][wasm][metric] -> list of float values (successful runs)
    groups = {}
    # failures[analysis][wasm][kind] -> number of runs that failed with kind
    failures = {}
    for line_num, row in enumerate(reader, start=2):
        wasm = row["wasm"]
        analysis = row["analysis"]
        # Unquoted error messages containing commas spill into extra fields,
        # which DictReader collects under the None key.
        fields = [v for k, v in row.items() if k not in ("analysis", "wasm") and isinstance(v, str)]
        fields += row.get(None) or []
        kind = next(
            (k for k, pattern in FAILURE_PATTERNS.items() if any(pattern.search(v) for v in fields)),
            None,
        )
        if kind is not None:
            groups.setdefault(analysis, {}).setdefault(wasm, {m: [] for m in METRICS})
            per_wasm = failures.setdefault(analysis, {}).setdefault(wasm, {})
            per_wasm[kind] = per_wasm.get(kind, 0) + 1
            continue
        values = {}
        skip_row = False
        for metric in METRICS:
            raw = row[metric]
            try:
                values[metric] = float(raw)
            except (TypeError, ValueError):
                print(
                    f"Warning: line {line_num}: skipping row, "
                    f"invalid value '{raw}' for '{metric}'",
                    file=sys.stderr,
                )
                skip_row = True
                break
        if skip_row:
            continue

        per_analysis = groups.setdefault(analysis, {})
        per_wasm = per_analysis.setdefault(wasm, {m: [] for m in METRICS})
        for metric in METRICS:
            per_wasm[metric].append(values[metric])

if not groups:
    sys.exit(f"Error: no usable rows found in '{csv_path}'")

all_wasm_names = sorted({w for per_analysis in groups.values() for w in per_analysis})

if filter_analysis and filter_analysis not in groups:
    sys.exit(
        f"Error: analysis '{filter_analysis}' not found in '{csv_path}'. "
        f"Available: {', '.join(sorted(groups.keys()))}"
    )
if filter_wasm and filter_wasm not in all_wasm_names:
    sys.exit(
        f"Error: wasm module '{filter_wasm}' not found in '{csv_path}'. "
        f"Available: {', '.join(all_wasm_names)}"
    )


def stats_of(values):
    count = len(values)
    if count == 0:
        return None
    return {
        "count": count,
        "mean": statistics.fmean(values),
        "median": statistics.median(values),
        "min": min(values),
        "max": max(values),
        "stdev": statistics.stdev(values) if count > 1 else 0.0,
    }


def sorted_analyses(names):
    names = sorted(names)
    if BASELINE in names:
        names.remove(BASELINE)
        names = [BASELINE] + names
    return names


def failures_of(analysis, wasm, kind):
    return failures.get(analysis, {}).get(wasm, {}).get(kind, 0)


def failure_label(analysis, wasm):
    # Shown instead of a value when every run of (analysis, wasm) failed.
    kinds = list(failures.get(analysis, {}).get(wasm, {}))
    return kinds[0] if len(kinds) == 1 else "failed"


def fmt(value, width, suffix=""):
    # A string value is a failure label, shown instead of the number.
    if isinstance(value, str):
        return f"{value:>{width + len(suffix)}}"
    return f"{value:>{width}.2f}{suffix}"


def is_displayed(analysis, wasm):
    if filter_analysis and analysis != filter_analysis:
        return False
    if filter_wasm and wasm != filter_wasm:
        return False
    return True


analysis_names = sorted_analyses(groups.keys())

filters = []
if filter_analysis:
    filters.append(f"analysis={filter_analysis}")
if filter_wasm:
    filters.append(f"wasm={filter_wasm}")
filter_suffix = f" [{', '.join(filters)}]" if filters else ""

# --- Per (analysis, wasm, metric) statistics ---------------------------

stats_rows = []  # (analysis, wasm, metric, stats-dict)
for analysis in analysis_names:
    for wasm in sorted(groups[analysis].keys()):
        for metric in METRICS:
            values = groups[analysis][wasm][metric]
            stats_rows.append((analysis, wasm, metric, stats_of(values)))

displayed_analyses = [a for a in analysis_names if not filter_analysis or a == filter_analysis]
displayed_wasms = [w for w in all_wasm_names if not filter_wasm or w == filter_wasm]
analysis_col_width = max(len("Analysis"), *(len(a) for a in displayed_analyses))
wasm_col_width = max(len("Wasm"), *(len(w) for w in displayed_wasms))

print(f"=== Per-analysis, per-module statistics{filter_suffix} ===")
header = (
    f"  {'Analysis':<{analysis_col_width}} {'Wasm':<{wasm_col_width}} {'Metric':<12} {'Count':>6} "
    f"{'Timeouts':>8} {'OutOfHeap':>9} "
    f"{'Mean(ms)':>11} {'Median(ms)':>11} {'Min(ms)':>11} {'Max(ms)':>11} {'Stdev(ms)':>11}"
)
print(header)
print("  " + "-" * (len(header) - 2))
printed_any = False
for analysis, wasm, metric, s in stats_rows:
    if metric not in DISPLAY_METRICS or not is_displayed(analysis, wasm):
        continue
    printed_any = True
    count = s["count"] if s else 0
    cells = " ".join(
        fmt(s[k] if s else failure_label(analysis, wasm), 11)
        for k in ("mean", "median", "min", "max", "stdev")
    )
    print(
        f"  {analysis:<{analysis_col_width}} {wasm:<{wasm_col_width}} {metric:<12} {count:>6} "
        f"{failures_of(analysis, wasm, TIMEOUT):>8} {failures_of(analysis, wasm, OUT_OF_HEAP):>9} {cells}"
    )
if not printed_any:
    print("  (no runs match the given filters)")

# --- Comparison against the "no-analysis" baseline ----------------------

comparison_rows = []  # (analysis, wasm, metric, baseline_mean, analysis_mean, diff, ratio, pct)
missing_baseline = []  # (analysis, wasm) pairs without baseline runs
baseline = groups.get(BASELINE, {})

for analysis in analysis_names:
    if analysis == BASELINE:
        continue
    for wasm in sorted(groups[analysis].keys()):
        if wasm not in baseline:
            missing_baseline.append((analysis, wasm))
            continue
        for metric in METRICS:
            baseline_values = baseline[wasm][metric]
            analysis_values = groups[analysis][wasm][metric]
            # A failure label (instead of a mean) means every run failed, so
            # there is nothing to compare; the label is shown in its place.
            baseline_mean = (
                statistics.fmean(baseline_values) if baseline_values else failure_label(BASELINE, wasm)
            )
            analysis_mean = (
                statistics.fmean(analysis_values) if analysis_values else failure_label(analysis, wasm)
            )
            if isinstance(analysis_mean, str) or isinstance(baseline_mean, str):
                label = analysis_mean if isinstance(analysis_mean, str) else baseline_mean
                comparison_rows.append(
                    (analysis, wasm, metric, baseline_mean, analysis_mean, label, label, label)
                )
                continue
            diff = analysis_mean - baseline_mean
            if baseline_mean != 0:
                ratio = analysis_mean / baseline_mean
                pct = (diff / baseline_mean) * 100.0
            else:
                ratio = None
                pct = None
            comparison_rows.append(
                (analysis, wasm, metric, baseline_mean, analysis_mean, diff, ratio, pct)
            )

print(f"\n=== Overhead vs baseline ('{BASELINE}'){filter_suffix} ===")
if filter_analysis == BASELINE:
    print(f"  '{BASELINE}' is the baseline itself; nothing to compare.")
else:
    header = (
        f"  {'Analysis':<{analysis_col_width}} {'Wasm':<{wasm_col_width}} {'Metric':<12} {'Baseline(ms)':>13} "
        f"{'Analysis(ms)':>13} {'Diff(ms)':>11} {'Slowdown (analysis/baseline)':>29} {'Overhead%':>11}"
    )
    print(header)
    print("  " + "-" * (len(header) - 2))
    printed_any = False
    for analysis, wasm, metric, baseline_mean, analysis_mean, diff, ratio, pct in comparison_rows:
        if metric not in DISPLAY_METRICS or not is_displayed(analysis, wasm):
            continue
        printed_any = True
        if isinstance(ratio, str):
            ratio_str = f"{ratio:>29}"
            pct_str = f"{pct:>11}"
        else:
            ratio_str = f"{ratio:>28.2f}x" if ratio is not None else f"{'n/a':>29}"
            pct_str = f"{pct:>10.1f}%" if pct is not None else f"{'n/a':>11}"
        print(
            f"  {analysis:<{analysis_col_width}} {wasm:<{wasm_col_width}} {metric:<12} {fmt(baseline_mean, 13)} "
            f"{fmt(analysis_mean, 13)} {fmt(diff, 11)} {ratio_str} {pct_str}"
        )
    if not printed_any:
        print("  (no comparisons match the given filters)")
    for analysis, wasm in missing_baseline:
        if is_displayed(analysis, wasm):
            print(f"  {analysis} on {wasm}: no '{BASELINE}' runs found for this module; skipping comparison.")

# --- Optional CSV output --------------------------------------------------

if output_dir:
    import os

    stats_csv_path = os.path.join(output_dir, "stats_per_module_analysis.csv")
    with open(stats_csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["analysis", "wasm", "metric", "count", "timeouts", "out_of_heap",
             "mean", "median", "min", "max", "stdev"]
        )
        for analysis, wasm, metric, s in stats_rows:
            writer.writerow(
                [
                    analysis,
                    wasm,
                    metric,
                    s["count"] if s else 0,
                    failures_of(analysis, wasm, TIMEOUT),
                    failures_of(analysis, wasm, OUT_OF_HEAP),
                ]
                + [s[k] if s else failure_label(analysis, wasm) for k in ("mean", "median", "min", "max", "stdev")]
            )

    comparison_csv_path = os.path.join(output_dir, "comparison_vs_baseline.csv")
    with open(comparison_csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["analysis", "wasm", "metric", "baseline_mean", "analysis_mean", "diff_ms", "slowdown_x", "overhead_pct"]
        )
        for analysis, wasm, metric, baseline_mean, analysis_mean, diff, ratio, pct in comparison_rows:
            writer.writerow(
                [
                    analysis,
                    wasm,
                    metric,
                    baseline_mean,
                    analysis_mean,
                    diff,
                    "" if ratio is None else ratio,
                    "" if pct is None else pct,
                ]
            )

    print(f"\nWrote '{stats_csv_path}' and '{comparison_csv_path}'.")
PYEOF
