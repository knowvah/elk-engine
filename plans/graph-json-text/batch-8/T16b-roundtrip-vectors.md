<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16b — Oracle round-trip vectors for the `.elkj` writer (added 2026-10-18, user)

Added after mission end (stop 16) at the user's request: stages 1 + 2. Two tasks, sequential.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T16b1 | Record the oracle load → `serialize(EcoreUtil.copy, format())` → reload of every loadable input | java-architect | tools/vectors/ElkjRoundTripVectors.java, test/golden/refs/java/graph-json-text-roundtrip.json | T16 | [ ] |
| T16b2 | Replay the round-trip vectors in `test/golden/elkj-roundtrip.test.ts` | typescript-pro | test/golden/elkj-roundtrip.test.ts | T16b1 | [ ] |

## Context
T16's round trip (`test/golden/elkj-roundtrip.test.ts`) compares the TS load with the TS reload of the TS output over
281 loadable inputs (16 curated, 265 T3 scenarios) and classifies differences (serialization-key 34, -string 1,
-value 1, dotted-key 14, empty-element 4, unresolved 28, number-clamp 5, key-quoting 1). No JVM recording backs those
outcomes (AD-13); the dropped-unresolved-endpoint claim is verified from EMF `Copier.copyReference` only.

## T16b1 — recorder
1. `tools/vectors/ElkjRoundTripVectors.java` (picked up by `elkj-vectors.sh`'s glob; setup as `ElkjWriteVectors.java`:
   `ElkGraphPackage` touch, core registry, one injector per worker thread). Inputs: every `test/corpus/elkj-curated/`
   file read as `.elkj` (tier-1 `.elkj` and tier-2 `.json` alike, as `ElkGraphJsonText.load` reads them) and every
   `tools/vectors/elkj-parse-scenarios/*.elkj`, kept when the oracle load has no error (the set must equal T16's 281;
   report any difference).
2. Per input: `loadErrors`; per edge in model order the raw (`basicGet`) source/target counts and proxy flags before
   writing; `formatted` = `serialize(EcoreUtil.copy(root), SaveOptions.format())` or `{error:{cls,msg}}` (normalise any
   output path in messages); for a non-error output `reparse` = `{errors, json}` exactly as T5 records it.
3. Cost control: serial GC (`-XX:+UseSerialGC -Xmn3g`), stage 1 first (the 28 unresolved cases, the 16 curated, one
   case per other class — T16's test names each case's class), then stage 2 (the rest), resumable per case so a
   multi-hour run survives interruption; the final ref merges both stages sorted by id. Determinism: stage-1 cases run
   twice and compared; journal the result.
4. Write-set: the two files above. `elkj-vectors.sh` is not edited (its glob finds the program).

## T16b2 — replay
Replace nothing in T16's classification; add the oracle layer: per recorded row the TS `serialize` text byte-equal to
`formatted`; errors by presence and class; reload error count exact when the recorded count is 0, presence otherwise
(D6); export equal to the recorded `json` where recorded. The 28 unresolved rows must show the oracle dropping the
endpoint. Stop: if the oracle writes an unresolved endpoint, or any recorded row differs byte-wise, STOP and journal
the mechanism before any change to `ElkGraphCopy.ts` or the writer.

## Acceptance criteria
- Every recorded row byte-equal or presence-matched as above; 0 divergences or a stated mechanism and a stop.
- Stage-1 double run byte-identical; `elkj-vectors.sh` full replay byte-identical (new program included).
