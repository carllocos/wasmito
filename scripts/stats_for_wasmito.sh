#!/usr/bin/env bash
#
# Computes descriptive statistics (count, mean, median, min, max, stdev) per
# wasm module and analysis from a benchmark CSV produced by run_analysis.sh,
# and compares every analysis against the "no-analysis" baseline to show how
# much slower each analysis is on each wasm module.
#
# Usage: stats_for_runs.sh <csv-file> [output-dir] [--verbose]
#
#   --verbose: by default only the total_ms metric is displayed. With
#              --verbose, all metrics (parsing, register, deploy, run, total)
#              are displayed. The optional CSV output always contains all
#              metrics regardless of this flag.
#
#   csv-file: a CSV with header:
#             analysis,wasm,parsing_ms,register_ms,deploy_ms,run_ms,total_ms
#             One row per run; multiple rows for the same (analysis, wasm)
#             pair are treated as repeated runs and aggregated together.
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
    echo "Usage: $(basename "$0") <csv-file> [output-dir] [--verbose]" >&2
    echo "  --verbose:  also show parsing, register, deploy and run metrics" >&2
    echo "              (by default only total_ms is displayed)." >&2
    echo "  csv-file:   CSV with header:" >&2
    echo "              analysis,wasm,parsing_ms,register_ms,deploy_ms,run_ms,total_ms" >&2
    echo "  output-dir: optional. If given, writes:" >&2
    echo "                stats_per_module_analysis.csv" >&2
    echo "                comparison_vs_baseline.csv" >&2
    echo "              there, in addition to printing tables to stdout." >&2
}

VERBOSE=0
POSITIONAL=()
for arg in "$@"; do
    if [ "$arg" = "--verbose" ]; then
        VERBOSE=1
    else
        POSITIONAL+=("$arg")
    fi
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

python3 - "$CSV_FILE" "$OUTPUT_DIR" "$VERBOSE" <<'PYEOF'
import csv
import statistics
import sys

BASELINE = "no-analysis"
METRICS = ["parsing_ms", "register_ms", "deploy_ms", "run_ms", "total_ms"]
REQUIRED_COLUMNS = ["analysis", "wasm"] + METRICS

csv_path = sys.argv[1]
output_dir = sys.argv[2] if len(sys.argv) > 2 else ""
verbose = len(sys.argv) > 3 and sys.argv[3] == "1"

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

    # groups[wasm][analysis][metric] -> list of float values
    groups = {}
    for line_num, row in enumerate(reader, start=2):
        wasm = row["wasm"]
        analysis = row["analysis"]
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

        per_wasm = groups.setdefault(wasm, {})
        per_analysis = per_wasm.setdefault(analysis, {m: [] for m in METRICS})
        for metric in METRICS:
            per_analysis[metric].append(values[metric])

if not groups:
    sys.exit(f"Error: no usable rows found in '{csv_path}'")


def stats_of(values):
    count = len(values)
    return {
        "count": count,
        "mean": statistics.fmean(values),
        "median": statistics.median(values),
        "min": min(values),
        "max": max(values),
        "stdev": statistics.stdev(values) if count > 1 else 0.0,
    }


def sorted_analyses(per_wasm):
    names = sorted(per_wasm.keys())
    if BASELINE in names:
        names.remove(BASELINE)
        names = [BASELINE] + names
    return names


wasm_names = sorted(groups.keys())

# --- Per (wasm, analysis, metric) statistics ---------------------------

stats_rows = []  # (wasm, analysis, metric, stats-dict)
for wasm in wasm_names:
    for analysis in sorted_analyses(groups[wasm]):
        for metric in METRICS:
            values = groups[wasm][analysis][metric]
            stats_rows.append((wasm, analysis, metric, stats_of(values)))

wasm_col_width = max(len("Wasm"), *(len(w) for w in wasm_names))

print("=== Per-module, per-analysis statistics ===")
header = (
    f"  {'Wasm':<{wasm_col_width}} {'Analysis':<20} {'Metric':<12} {'Count':>6} "
    f"{'Mean(ms)':>10} {'Median(ms)':>10} {'Min(ms)':>10} {'Max(ms)':>10} {'Stdev(ms)':>10}"
)
print(header)
print("  " + "-" * (len(header) - 2))
for wasm in wasm_names:
    for analysis in sorted_analyses(groups[wasm]):
        for metric in DISPLAY_METRICS:
            s = stats_of(groups[wasm][analysis][metric])
            print(
                f"  {wasm:<{wasm_col_width}} {analysis:<20} {metric:<12} {s['count']:>6} "
                f"{s['mean']:>10.2f} {s['median']:>10.2f} {s['min']:>10.2f} "
                f"{s['max']:>10.2f} {s['stdev']:>10.2f}"
            )

# --- Comparison against the "no-analysis" baseline ----------------------

comparison_rows = []  # (wasm, analysis, metric, baseline_mean, analysis_mean, diff, ratio, pct)

print("\n=== Overhead vs baseline ('no-analysis') ===")
header_printed = False
for wasm in wasm_names:
    per_wasm = groups[wasm]
    if BASELINE not in per_wasm:
        print(f"\n{wasm}: No '{BASELINE}' runs found for this module; skipping comparison.")
        continue

    other_analyses = [a for a in sorted_analyses(per_wasm) if a != BASELINE]
    if not other_analyses:
        continue

    if not header_printed:
        header = (
            f"  {'Wasm':<{wasm_col_width}} {'Analysis':<20} {'Metric':<12} {'Baseline(ms)':>13} "
            f"{'Analysis(ms)':>13} {'Diff(ms)':>10} {'Slowdown (analysis/baseline)':>29} {'Overhead%':>11}"
        )
        print(header)
        print("  " + "-" * (len(header) - 2))
        header_printed = True
    for analysis in other_analyses:
        for metric in METRICS:
            baseline_values = per_wasm[BASELINE][metric]
            analysis_values = per_wasm[analysis][metric]
            baseline_mean = statistics.fmean(baseline_values)
            analysis_mean = statistics.fmean(analysis_values)
            diff = analysis_mean - baseline_mean
            if baseline_mean != 0:
                ratio = analysis_mean / baseline_mean
                pct = (diff / baseline_mean) * 100.0
                ratio_str = f"{ratio:>28.2f}x"
                pct_str = f"{pct:>10.1f}%"
            else:
                ratio = None
                pct = None
                ratio_str = f"{'n/a':>29}"
                pct_str = f"{'n/a':>11}"
            if metric in DISPLAY_METRICS:
                print(
                    f"  {wasm:<{wasm_col_width}} {analysis:<20} {metric:<12} {baseline_mean:>13.2f} "
                    f"{analysis_mean:>13.2f} {diff:>10.2f} {ratio_str} {pct_str}"
                )
            comparison_rows.append(
                (wasm, analysis, metric, baseline_mean, analysis_mean, diff, ratio, pct)
            )

# --- Optional CSV output --------------------------------------------------

if output_dir:
    import os

    stats_csv_path = os.path.join(output_dir, "stats_per_module_analysis.csv")
    with open(stats_csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["wasm", "analysis", "metric", "count", "mean", "median", "min", "max", "stdev"])
        for wasm, analysis, metric, s in stats_rows:
            writer.writerow(
                [wasm, analysis, metric, s["count"], s["mean"], s["median"], s["min"], s["max"], s["stdev"]]
            )

    comparison_csv_path = os.path.join(output_dir, "comparison_vs_baseline.csv")
    with open(comparison_csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["wasm", "analysis", "metric", "baseline_mean", "analysis_mean", "diff_ms", "slowdown_x", "overhead_pct"]
        )
        for wasm, analysis, metric, baseline_mean, analysis_mean, diff, ratio, pct in comparison_rows:
            writer.writerow(
                [
                    wasm,
                    analysis,
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
