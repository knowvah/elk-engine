<!-- SPDX-License-Identifier: EPL-2.0 -->

# canonical-nan: planning observations (issue #72)

## Observation: most layout recorders reject NaN rather than hash it raw

- **Context**: auditing `tools/vectors/*.java` for raw NaN encoding on 2026-11-24.
- **Finding**: 20 layout recorders call `doubleToRawLongBits` only after `if (Double.isNaN(d)) throw` ("NaN in a recorded
  value"), so their refs hold no NaN. The raw sites that can emit a NaN are the sweep hashers (`LayeredPipelineVectors.hx`,
  `LayeredPhaseVectors` `bitsOf`, the C4 `double` encoders of order, placement and routing sweeps), `MrTreeUnitVectors.hex`
  and two oracle run-vs-run checks (`RectPackingVectors.positions`, `SporeLayoutVectors.java:973`).
- **Impact**: swapping to `doubleToLongBits` cannot change a guarded recorder's ref; the sweep caches are the only outputs
  where a hash may move, and they are gitignored.
- **Confidence**: High (grep of every encoder; the C4 sites' input type is for T1 to confirm)

## Observation: sweep results are local caches, not committed refs

- **Context**: locating the 7b-7f2 sweep refs.
- **Finding**: `test/corpus/.<sweep>-sweep/results.jsonl` (gitignored) holds the oracle hashes; the TS sweep tests skip
  when absent. All eight were regenerated within about 20 minutes on 2026-11-20, so a full rerun is cheap.
- **Impact**: changing a sweep hasher needs `<sweep>-sweep.sh --force`, not a ref regeneration; `git diff` of
  `test/golden/refs/` does not see it.
- **Confidence**: High

## Observation: the TS shim already has the canonical encoder

- **Context**: choosing the TS form.
- **Finding**: `src/java/lang/JavaDouble.ts:41` `doubleToLongBits` collapses every NaN to `7ff8…` and is proven by the JVM
  rows `test/golden/refs/java/hash.json:354-360` (`fff8…`, payload and signalling NaNs).
- **Impact**: TS helpers need no new bit logic; one shared `canonicalHex` over the shim suffices.
- **Confidence**: High
