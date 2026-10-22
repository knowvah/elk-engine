<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: shared `vector-cache.sh` in both scripts

One task. It consumes T2's argument contract and produces the cache layout and summary lines T4 and T5 rely on.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T3](T3-vector-cache.md) | C4: salted whole-program + per-row cache, `ELK_VECTORS_CACHE=off`, summary lines | tooling-engineer | `tools/vectors/vector-cache.sh` (new), `tools/vectors/elkj-vectors.sh`, `tools/vectors/elkt-vectors.sh`, `tools/vectors/ElkjRoundTripVectors.java` (header comment only) | T2 | [x] |

Batch gate: README "Quality gates" (its `elkt-vectors.sh` step now runs through the cache: run it twice, cold then
warm, and `cmp` both).
