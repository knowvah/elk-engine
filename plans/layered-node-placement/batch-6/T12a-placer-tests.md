<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12a — Anchored unit tests: placers and processors

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12a): anchor node placer and processor tests on oracle placement rows`

## Context

Mission 7d (README), N11, L4/X5, 6c D1. T9's `unreached.md` (with the T11 corrections) lists every branch of these
classes the replays leave untaken; T11 recorded `sites/*` rows per S scenario. Each colocated test gains cases whose
literals equal a row, with `// oracle: <row id>; <Java file:line>`; J items get structural cases from the Java
(constants, exception classes and messages, enum ordinals, the recursion twins' loop arms); U items get nothing. The
generic replay (T8) stays the authority. 7c's T12a–c are the pattern (`plans/layered-crossing-min/batch-8/`, and the
journal's T12 rows).

## Task

1. For every S and J item of `unreached.md` in this task's files (`SimpleNodePlacer`, `InteractiveNodePlacer`,
   `LinearSegmentsNodePlacer*`, `NetworkSimplexPlacer*`, the five processors): load the row through T3's
   `loadPlacementRows`, run it with the class injected (`runSteps` with a factories object local to the file; T8's
   may be copied, `test/helpers/` is outside the write-set), assert the fields the branch decides with literals
   copied from the row (`geometry.nodes[path]` position, size and margin, `geometry.layers`, `ports`, `layers`,
   `changed`; hex doubles decoded with `decodeHex` from `test/helpers/layered-framework-replay.ts`), one case per
   row, existing cases untouched. Where a case would only duplicate the generic replay, assert the specific field the
   branch decides (7a T11 rule). Coordinates compare at AD-4 (`toBeCloseTo` at 1e-6 or the helper's comparator),
   everything else exactly.
2. No `src/` non-test edit; a literal that disagrees with the port is a stop with the diagnosis artifact (mechanism,
   origin `file:line`, causal chain, ruled out).
3. Directory coverage run (`--coverage.include` on these classes plus `LayeredPlacementVectors.test.ts`): report the
   branch percentage per class and the U items behind any shortfall.

## Write-set

`src/alg/layered/p4nodes/*.test.ts` except `bk/**` and `BasicNodePlacementTest.test.ts`;
`src/alg/layered/intermediate/{InnermostNodeMarginCalculator,LabelAndNodeSizeProcessor,InLayerConstraintProcessor,
HierarchicalPortDummySizeProcessor,NodePlacementRepeater}.test.ts` (new cases only; existing cases untouched).

## Read-set

`plans/layered-node-placement/unreached.md`, the rows named (read from the JSON by script into `<scratch>/T12a`),
`test/helpers/layered-placement-replay-*.ts`, `test/helpers/layered-framework-replay.ts` (`decodeHex`),
`src/alg/layered/LayeredPlacementVectors.test.ts` (factories), the Java lines cited, `decisions.md` N3, N11.

## Architecture decisions relevant

N3 (AD-4 on coordinates), N11 (anchor S and J only), N6 (twin arms are J: a case per loop shape from the twin tests
of T5/T7, no new scenario), N9 (the agent rule: no assertion the Java lacks applies to the ported suite, not to
anchored cases, which cite a row instead).

## Interface contract

None consumed downstream; T13 reads the hand-back's per-class coverage table.

## Acceptance criteria

- Given every S row for these files, when the suite runs, then a case cites it and passes.
- Given the directory coverage run, when read, then ≥ 90 % branches per class, the U list excepted.
- Given `git diff --stat`, when inspected, then only files in the write-set changed.

## Observability / Rollback

N/A. Reversible.
