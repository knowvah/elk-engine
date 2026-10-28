<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Graph transform and transform replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the elkgraph to lgraph transform`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`;
`H` = `test/helpers`.

## Context

Mission 7a (README). `graph.transform` (2,215 lines) imports an ElkGraph into an LGraph (`ElkGraphImporter`, 1,282
lines) and writes the layout back (`ElkGraphLayoutTransferrer`, 800 lines). T1 recorded the oracle's import dump and
transfer result for 35 curated/ticket models, the realworld golden inputs and an option sweep (`transform` group).

- **Patterns:** `H/node-micro-layout-replay.ts` and `src/alg/common/NodeMicroLayoutVectors.test.ts` (row loading, hex
  doubles, AD-4 comparison, one `it` per row); `test/golden/compare-json.ts` for ELK JSON comparison;
  `src/graph/json/` importer/exporter (read only) to turn `input` into an ElkGraph and the result back into ELK JSON.
- `ElkGraphLayoutTransferrer` reads `LabelDummySwitcher.INCLUDE_LABEL` (`J/intermediate/LabelDummySwitcher.java:92-93`):
  a staged class (7f) with that property only.
- `ElkGraphImporter` has 3 identity-hash sites (AD-10): insertion order, one journal row each; a replay mismatch
  traced to one of them is stop 8.

## Task

1. Port `J/graph/transform/{IGraphTransformer,ElkGraphTransformer,ElkGraphImporter,ElkGraphLayoutTransferrer}.java`
   to `S/graph/transform/*.ts`: every branch, Java order; split at Java method or section boundaries (P1 facade)
   where the complexity limits demand (stop 10).
2. Add `S/intermediate/LabelDummySwitcher.ts` with the `@staged 7f` marker and `INCLUDE_LABEL` only; add its row to
   `test/architecture/staged-classes.json`.
3. **Replay helper** `H/layered-framework-replay.ts`: load `layered-framework.json` once; decode hex doubles; build
   the TS LGraph dump in the T1 format (positional paths, sorted property ids, C4 values, `{ref}`/`{elk}`/`{class}`
   markers) and compare with AD-4 (1e-6 numbers, exact otherwise); compare `expected.elk` via `compare-json.ts`.
   Exception rows expect the same Java exception class (AD-16) and message.
4. **Replay test** `S/graph/transform/LayeredFrameworkTransformVectors.test.ts`: one `it` per `transform` row,
   registering layered explicitly first (L5).
5. Unit tests for importer/transferrer behaviour not visible in the dump are **not** written here; T9 measures
   what the replay leaves unreached.

## Write-set

`S/graph/transform/*.ts` (+ section files), `S/graph/transform/LayeredFrameworkTransformVectors.test.ts`,
`S/intermediate/LabelDummySwitcher.ts`, `test/architecture/staged-classes.json`, `H/layered-framework-replay.ts`.

## Read-set

`J/graph/transform/*.java`; `J/intermediate/LabelDummySwitcher.java:85-95`; the T1 header of
`tools/vectors/LayeredFrameworkVectors.java` (dump format); `S/graph/*.ts`, `S/options/*.ts` (T2–T5 output);
`H/node-micro-layout-replay.ts`; `test/golden/compare-json.ts`; `decisions.md` L1, L3, L4, L5.

## Interface contract (consumed by T7, T8, T9)

`H/layered-framework-replay.ts` exports `loadLayeredFrameworkRows(group)`, `dumpLGraph(lgraph)`,
`compareLGraphDump(actual, expected)` and `importInput(row)` (ELK JSON → ElkGraph with layered registered). T7 and
T8 add their own comparison functions in their own test files; they do not edit the helper.

## Acceptance criteria

- Given every `transform` row, when replayed, then the LGraph dump and the transferred ELK JSON match at the AD-4 bar.
- Given an exception row, when replayed, then the same Java exception class and message are thrown.
- Given the 3 importer hash sites, when inspected, then each has an AD-10 journal row.
- Given the staged registry, when the fitness test runs, then `LabelDummySwitcher.ts` is listed with mission 7f.

## Observability / Rollback

N/A — no new observable operations. Reversible: revert the commit.
