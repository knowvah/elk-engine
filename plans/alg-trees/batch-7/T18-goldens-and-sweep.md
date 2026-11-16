<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — Goldens test and tree sweep

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T18): compare tree goldens and register trees in the sweep tool`
Scratch: `$TMPDIR/alg-trees/T18/` (the sweep output stays here; AD-5)

## Context

Mission 8a, TR2, TR5, TR6. T4 recorded `refs/elk-trees/` from `test/golden/trees.json` and `test/golden/trees-inputs/`. The comparison
precedent is `test/golden/layered-hierarchy-goldens.test.ts` with `compareLayout` (AD-4). `tools/corpus/ts-layout-compare.ts` takes
`--algorithms` and `--sweep-dir` (`:123,258`) but registers only the core providers.

## Task

1. `test/golden/tree-goldens.test.ts`: for every `trees.json` entry, import the input, register the three metadata providers, lay out
   with `RecursiveGraphLayoutEngine` as the oracle harness does (`test/helpers/graph-overlay.ts`, `graph-json-oracle.ts`), and compare
   with the ref at AD-4; also check the `_meta.json` stamp and that every ref has an entry.
2. Register `MrTreeMetaDataProvider`, `RadialMetaDataProvider`, `VertiFlexMetaDataProvider` in `ts-layout-compare.ts` (nothing else;
   row 9 registers the rest) and cover the registration in its test.
3. Run TR6: check `uptime`; for each algorithm
   `JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2" nice -n 10 tools/oracle/sweep.sh --filter /<alg>/ --out $TMPDIR/alg-trees/T18/sweep-<alg>`
   (detached, polled); then `npx tsx tools/corpus/ts-layout-compare.ts --algorithms <alg> --sweep-dir <dir> --out <json>`. Journal per
   algorithm the case count and each category. Diagnose every `mismatch`, `ts-only-throw` and `oracle-only-throw` (diagnosis mode;
   the stop rows of T1–T3 localise). T18 edits no `src/` file: it reports a port defect with its diagnosis to the orchestrator, who
   fixes it at origin in the owning file and journals it (stop 15). Identity-order or last-ulp cases are stop 14.

## Write-set

`test/golden/tree-goldens.test.ts`, `tools/corpus/ts-layout-compare.ts`, `test/corpus/ts-layout-compare.test.ts`.

## Read-set

`test/golden/{layered-hierarchy-goldens,algorithm-refs}.test.ts`, `test/golden/compare-json.ts`, `tools/corpus/ts-layout-compare.ts`,
`tools/oracle/sweep.sh` header, `docs/conformance.md` § Sweep, `decisions.md` TR2, TR6.

## Interface contract

None consumed later; the sweep numbers feed T20's summary.

## Acceptance criteria

- Given every `trees.json` entry, when laid out by TS, then it equals its ref within 1e-6 with ids and counts exact.
- Given the TR6 sweep, then the journal lists per algorithm: cases, ok, mismatch, both-throw, ts-only-throw, oracle-only-throw,
  excluded, timeouts; target 0 mismatch and 0 one-sided throws, each exception a `needs-ruling` issue with its mechanism.
- Given `ts-layout-compare.test.ts`, then it passes and asserts the three algorithms resolve.

## Observability / Rollback

N/A — no new observable operations. Reversible.
