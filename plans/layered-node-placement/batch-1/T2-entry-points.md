<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — E1 preparation and the entry-point fitness test

**Agent:** orchestrator (main session) · **Commit:** `feat(T2): prepare the node placement entry points`

## Context

Mission 7d (README), N4 (7b's E1, 7c's C5). Wiring a strategy enum's arms closes the ESM cycle enum → phase class →
`LayeredOptions` → provider → transformer → enum. The recipe that held in 7b and 7c: the enum joins melk's
`NON_LEAF_DEFAULT_TYPES` and the provider is regenerated **before** any arm is wired, every phase class writes its
processor configuration as a cached static getter, and a fitness test imports each entry in a fresh process. The
test already names `NodePlacementStrategy` as the 7d entry in its header comment
(`test/architecture/layered-entry-points.fitness.test.ts:17-19`).

## Task

1. `tools/melk/config.ts`: add `'org.eclipse.elk.alg.layered.options.NodePlacementStrategy'` to `NON_LEAF_DEFAULT_TYPES`
   (`tools/melk/config.ts:21-26`, currently the three phase enums and `NodeFlexibility`).
2. `npm run melk:generate Core Labels Polyomino Layered`; only `src/alg/layered/options/LayeredMetaDataProvider.ts` may
   change (`git diff --stat src/core/options src/core/labels src/alg/common/compaction/options src/alg/layered/options`
   shows that file alone; S4).
3. `test/architecture/layered-entry-points.fitness.test.ts`: add `'src/alg/layered/options/NodePlacementStrategy.ts'` to
   `ENTRY_POINTS` (after `CrossingMinimizationStrategy.ts`); update the header comment to name 7e as the next entry.
4. `npx vitest run test/architecture test/melk`: green while every `NodePlacementStrategy` arm still throws
   (`src/alg/layered/options/NodePlacementStrategy.ts:85-93`).

## Write-set

`tools/melk/config.ts`, `src/alg/layered/options/LayeredMetaDataProvider.ts` (generated), `test/architecture/layered-entry-points.fitness.test.ts`.

## Read-set

`tools/melk/config.ts:1-40`, `test/architecture/layered-entry-points.fitness.test.ts`, `plans/layered-crossing-min/batch-1/T2-entry-points.md`
(the 7c precedent), `decisions.md` N4, `.agent-notes/layered-cycles-layers.md` (the enum-cycle observations).

## Architecture decisions

N4 (E1 first; no entry-order import; cached static getters are batch 2's duty).

## Interface contract (consumed by T5–T8)

`NodePlacementStrategy` is a melk non-leaf default type: the generated provider reads it lazily, so the placers'
`HIERARCHY_PROCESSING_ADDITIONS` getters and the T8 arms can import `IntermediateProcessorStrategy` without a
temporal dead zone. The fitness test is the gate T8 must keep green (stop 15).

## Acceptance criteria

- Given `npm run melk:generate` for the four bundles, when diffed, then only the layered provider changes.
- Given the fitness test with the new entry, when run before any arm is wired, then green.
- Given `npm run typecheck` and `npm run format:check`, when run, then clean.

## Observability / Rollback

N/A. Reversible: revert the commit.
