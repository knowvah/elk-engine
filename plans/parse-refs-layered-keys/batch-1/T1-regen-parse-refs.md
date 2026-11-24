<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: drop layerId and positionId from STRIP_KEYS and regenerate the parse refs

## Context

The ruling of #63 (2026-11-21, with "carry the EMap reorder" on 2026-11-23) is in the [README](../README.md#objective).
The decisions are [D1](../decisions.md#d1-the-round-trip-test-registers-layered-next-to-coreoptions) (registration),
[D2](../decisions.md#d2-script-test-and-refs-change-in-one-task) (one task, test first),
[D3](../decisions.md#d3-the-allowed-diff-and-how-it-is-proven) (the proof) and
[D5](../decisions.md#d5-no-production-src-change) (no `src/`).

## Read-set

- `test/golden/json-roundtrip.test.ts` (whole file, 113 lines).
- `tools/oracle/regen-parse-refs.sh:1-35` (header and constants); the rest only if a step fails.
- `test/helpers/layered-framework-replay.ts:166-171` (registration pattern).
- `src/emf/ecore/util/EcoreEMap.ts:193-234` (the reorder mechanism, for the journal only).
- `test/golden/refs/elk-parse/_meta.json`.

## Steps

1. **Red.** In the test, set `STRIP_KEYS = ['resolvedAlgorithm']`. Import `LayeredMetaDataProvider` from
   `../../src/alg/layered/options/LayeredMetaDataProvider.js`, and register it in `beforeEach` after `getInstance()`.
   Rewrite the header comment and the `STRIP_KEYS` comment: the port registers CoreOptions plus layered, the input
   strips only `resolvedAlgorithm`, and J7 amendment 2 was retired by #63. Run
   `npx vitest run test/golden/json-roundtrip.test.ts` and journal the red: the `strippedSha256` and byte-identity
   rows fail on the 4 files.
2. In the script, set `STRIP_KEYS="resolvedAlgorithm"`. Rewrite the header so that it no longer says the port
   registers CoreOptions only, the transform line says `STRIP_KEYS = resolvedAlgorithm`, and amendment 2 is retired by
   #63. `TRANSFORM` derives from `STRIP_KEYS`, so leave it alone.
3. **Regenerate.** Run `uptime` (wait while it is above 12), then `nice -n 10 tools/oracle/regen-parse-refs.sh`.
   Expect exit 0, `ElkOracle: 4 input(s), 0 failed`, and `wrote 4 refs + _meta.json`.
4. **D3 proof.** Write `$TMPDIR/parse-refs-layered-keys/d3.mjs` as D3 specifies. Run it against the base and journal
   its whole output (counts per file, `_meta.json` fields). Any difference outside the allowed kinds is stop 2.
5. **Determinism.** Copy the refs to scratch, run the script a second time, and `cmp` all 5 files. Journal the result.
6. **Green.** Run `npx vitest run test/golden/json-roundtrip.test.ts test/graph-json` and journal the counts. If the
   byte-identity rows fail, diagnose first (D1 push-forward or stop 3).
7. `npm run typecheck`, `npx prettier --check` on the two edited files, and
   `git diff --exit-code <base> -- test/golden/refs/ ':!test/golden/refs/elk-parse/'`.
8. Journal the regeneration as a `fix` row: the ruling, the script, the oracle build (commit and patches 0001-0004),
   and the D3 summary. Commit as `test(golden): drop layered keys from the parse ref strip list`, with footer
   `Refs: #63`.

## Write-set

`test/golden/json-roundtrip.test.ts`, `tools/oracle/regen-parse-refs.sh`, `test/golden/refs/elk-parse/` (script
output only), and the journal.

## Interface contracts

Output for T2: the D3 counts (added keys per file, reordered `layoutOptions` objects per file). T2 cites them in the
docs only if it wants to. The refs keep their file names, and `_meta.json` keeps its field set.

## Acceptance criteria

- Given the edited test and the old refs, when the test runs, then the hash and byte-identity rows fail (red is
  journaled).
- Given the edited script, when `regen-parse-refs.sh` runs, then 4 refs and `_meta.json` are written, and a second
  run is byte-identical.
- Given base and new refs, when `d3.mjs` runs, then every difference is a layered key copied from the golden or a
  reorder of existing keys within one `layoutOptions` object with equal values. `_meta.json` differs only in
  `transform` and `strippedSha256`.
- Given the new refs, when `json-roundtrip.test.ts` and `test/graph-json` run, then all tests pass.
- Given gate 7's filter, then no ref outside `elk-parse` differs from the base.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (revert the commit).
