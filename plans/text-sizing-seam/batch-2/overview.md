<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: the fixed-mode recorder and its ref

This batch needs the patched oracle from T1. The expected values for T3 and T4 come from the ref written here (AD-13), so
nothing in TS is written before this batch ends.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T2](T2-label-sizing-recorder.md) | `LabelSizingVectors.java` with its script and text list; ref `label-sizing.json`; the corpus mode; the default-mode re-measure (TX7) | java-architect (sonnet) | `tools/vectors/LabelSizingVectors.java`, `tools/vectors/label-sizing-vectors.sh`, `tools/vectors/label-sizing-texts.txt`, `test/golden/refs/java/label-sizing.json` | T1 | [x] |

Gate after the batch: `shellcheck tools/vectors/label-sizing-vectors.sh` clean; two runs of the recorder give byte-equal refs;
the default-mode re-measure equals `layered-label-metrics.json` (stop 4 otherwise); the corpus run's count is journaled.
