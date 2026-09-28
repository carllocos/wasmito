#!/bin/sh
#
# Usage: stats_for_whamm.sh <csv-file> [--analysis <name>] [--wasm <module.wasm>]
#
# Reads a CSV produced by wizeng_run.sh (columns: wasm_module,analysis,
# time_ms) and prints, for each distinct (analysis, wasm_module) group,
# statistics over that group's time_ms measurements: count, min, max,
# mean, median and standard deviation. It then prints a second table
# comparing each non-"none" analysis against the "none" baseline for the
# same wasm_module, reporting its slowdown (mean and median time divided
# by the baseline's) and overhead percentage.
#
# Options:
#   --analysis <name>      only show results for the analysis <name>
#   --wasm <module.wasm>   only show results for the wasm module <module.wasm>

usage() {
    echo "Usage: $0 <csv-file> [--analysis <name>] [--wasm <module.wasm>]" >&2
    exit 1
}

CSV_FILE=""
ANALYSIS_FILTER=""
WASM_FILTER=""

while [ $# -gt 0 ]; do
    case "$1" in
        --analysis)
            [ $# -ge 2 ] || usage
            ANALYSIS_FILTER=$2
            shift 2
            ;;
        --wasm)
            [ $# -ge 2 ] || usage
            WASM_FILTER=$2
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            [ -z "$CSV_FILE" ] || usage
            CSV_FILE=$1
            shift
            ;;
    esac
done

if [ -z "$CSV_FILE" ]; then
    usage
fi

if [ ! -f "$CSV_FILE" ]; then
    echo "File not found: $CSV_FILE" >&2
    exit 1
fi

python3 - "$CSV_FILE" "$ANALYSIS_FILTER" "$WASM_FILTER" <<'PYEOF'
import sys
import csv
import statistics
from collections import defaultdict

path = sys.argv[1]
analysis_filter = sys.argv[2]
wasm_filter = sys.argv[3]

with open(path, newline="") as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames or []
    if "wasm_module" not in fieldnames or "time_ms" not in fieldnames:
        sys.exit(f"error: '{path}' must have 'wasm_module' and 'time_ms' columns")
    has_analysis = "analysis" in fieldnames

    groups = defaultdict(list)
    for row in reader:
        module = row["wasm_module"]
        analysis = row["analysis"] if has_analysis else "none"
        try:
            t = float(row["time_ms"])
        except (TypeError, ValueError):
            continue
        if wasm_filter and module != wasm_filter:
            continue
        groups[(analysis, module)].append(t)

if not groups:
    sys.exit(f"error: no measurements found in '{path}'" + (f" for wasm module '{wasm_filter}'" if wasm_filter else ""))

def shown(analysis):
    return not analysis_filter or analysis == analysis_filter

if not any(shown(analysis) for (analysis, _) in groups):
    sys.exit(f"error: no measurements found in '{path}' for analysis '{analysis_filter}'")

def print_table(headers, rows):
    widths = [len(h) for h in headers]
    for row in rows:
        for i, v in enumerate(row):
            widths[i] = max(widths[i], len(v))

    def fmt_row(vals):
        return "  ".join(v.ljust(w) for v, w in zip(vals, widths))

    print(fmt_row(headers))
    print(fmt_row(["-" * w for w in widths]))
    for row in rows:
        print(fmt_row(row))

stats = {}
for (analysis, module), times in groups.items():
    n = len(times)
    stats[(analysis, module)] = {
        "n": n,
        "min": min(times),
        "max": max(times),
        "mean": statistics.mean(times),
        "median": statistics.median(times),
        "stdev": statistics.stdev(times) if n > 1 else 0.0,
    }

headers = ["analysis", "wasm_module", "count", "min_ms", "max_ms", "mean_ms", "median_ms", "stdev_ms"]
rows = []
for (analysis, module) in sorted(stats.keys()):
    if not shown(analysis):
        continue
    s = stats[(analysis, module)]
    rows.append([
        analysis, module, str(s["n"]),
        f"{s['min']:.2f}", f"{s['max']:.2f}", f"{s['mean']:.2f}", f"{s['median']:.2f}", f"{s['stdev']:.2f}",
    ])

print_table(headers, rows)

slowdown_headers = [
    "analysis", "wasm_module",
    "mean_ms", "baseline_mean_ms", "mean_slowdown_x (mean_ms / baseline_mean_ms)", "mean_overhead_%",
    "median_ms", "baseline_median_ms", "median_slowdown_x",
]
slowdown_rows = []
for (analysis, module) in sorted(stats.keys()):
    if analysis == "none" or not shown(analysis):
        continue
    baseline = stats.get(("none", module))
    s = stats[(analysis, module)]
    if baseline is None:
        slowdown_rows.append([
            analysis, module,
            f"{s['mean']:.2f}", "N/A", "N/A", "N/A",
            f"{s['median']:.2f}", "N/A", "N/A",
        ])
        continue
    mean_slowdown = s["mean"] / baseline["mean"] if baseline["mean"] else float("inf")
    median_slowdown = s["median"] / baseline["median"] if baseline["median"] else float("inf")
    mean_overhead_pct = (mean_slowdown - 1) * 100
    slowdown_rows.append([
        analysis, module,
        f"{s['mean']:.2f}", f"{baseline['mean']:.2f}", f"{mean_slowdown:.2f}", f"{mean_overhead_pct:.1f}",
        f"{s['median']:.2f}", f"{baseline['median']:.2f}", f"{median_slowdown:.2f}",
    ])

if slowdown_rows:
    print()
    print("Slowdown vs baseline (analysis=none):")
    print_table(slowdown_headers, slowdown_rows)
PYEOF
