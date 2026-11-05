#!/usr/bin/env bash
# SPDX-License-Identifier: EPL-2.0
# Records the label metrics table of the JUnit runner subset (decision FX8) by running LayeredLabelMetricsVectors.java, JDK only,
# headless, as the JUnit suites run. Writes <outDir>/layered-label-metrics.json.
# Usage: layered-label-metrics-vectors.sh <outDir>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VECTORS_DIR="$ROOT/tools/vectors"

[ "$#" -eq 1 ] || {
  echo "usage: layered-label-metrics-vectors.sh <outDir>" >&2
  exit 1
}
java -Djava.awt.headless=true "$VECTORS_DIR/LayeredLabelMetricsVectors.java" "$1" "$VECTORS_DIR/layered-label-metrics-texts.txt"
