<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Loops replay helpers and the `processor` op twin

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T2): add loops replay helpers and the processor step op`
Scratch: `$TMPDIR/7g/T2/`.

## Context

W3, W6, W7. T16 replays every `layered-loops.json` row through the real pipeline; T19's sweep and T20's site rows reuse the same
loaders. 7f2's helpers are the pattern and stay unedited: `test/helpers/layered-labels-replay-{rows,ops,logged}.ts` wrap
`runPipelineSteps`, because 7f's `STEP_ARITY` is a closed record (`.agent-notes/layered-labels.md`, "7f's step interpreter has no
extension point").

## Task

1. `test/helpers/layered-loops-replay-rows.ts`: load `test/golden/refs/java/layered-loops.json` (lazily; absent file → a clear
   skip until T1 lands), list rows by group and family, and compare a row with the landed comparators (7f2's
   `compareLabels`-style for label stops, 7f's layout comparator for `full`), including the formerly pinned row's fresh
   cross-check rows (W4).
2. `test/helpers/layered-loops-replay-ops.ts`: the `processor <SimpleClassName>` op (W3): a registry from simple class name to a
   factory, filled by the caller (T14 registers `DummySelfLoopProcessor`), run at the op's position in the step list with a
   `BasicProgressMonitor`. A **twin hook** for W6/W7, test-side only (7f2 precedent: `src/alg/layered/intermediate/EndLabelPreprocessor.test.ts:68` rebuilds the map reversed): a named hook runs before a given processor and rebuilds the container it names in reverse order (or wraps the processor), then the row is replayed again. No production seam is added to `src/`.
2a. **Class injection before wiring:** `models` and `scenarios` rows replay through the landed injected `Factories` (`test/helpers/layered-phase-replay-ops.ts:4,51,128`), so a port task (T7, T11, T12, T14) can stand its ported class in for a 7g arm that still throws at plan build until T15 (W13). Expose `factoriesWith(overrides: Record<string, () => ILayoutProcessor<LGraph>>)`.
3. Tests for both helpers against the landed 7f2 rows and against hand-built row objects (no oracle literal invented: a test
   asserts the helper's own behaviour, e.g. it reports a mismatch for a perturbed row).

## Write-set

`test/helpers/layered-loops-replay-rows.ts`, `test/helpers/layered-loops-replay-ops.ts`, their `.test.ts` files.

## Read-set

`test/helpers/layered-labels-replay-rows.ts`, `layered-labels-replay-ops.ts`, `layered-pipeline-replay-rows.ts`,
`layered-pipeline-replay-ops.ts`, `layered-labels-replay-{dump,full}.ts`, `src/alg/layered/LayeredLabelsVectors.test.ts`, `src/alg/layered/intermediate/EndLabelPreprocessor.test.ts:60-90` (how a vectors test uses them), T1's header
contract, `decisions.md` W3, W6, W7.

## Interface contract (consumed by T14, T16, T19, T20, T21)

`loadLoopsRows(group?: string): LoopsRow[]`, `replayLoopsRow(row, opts?: { twins?: readonly string[] }): Mismatch[]`,
`registerStepProcessor(name: string, factory: () => ILayoutProcessor<LGraph>): void`. Names may change; the journal records the
final ones.

## Acceptance criteria

- Given the landed `layered-labels.json`, when its rows are run through the new loaders' comparator, then every row reports no
  mismatch (the helpers add nothing that disagrees with 7f2's).
- Given a row with a perturbed coordinate (2e-6), when compared, then a mismatch naming the element and field is reported.
- Given a step list with `processor Foo` and a registered factory, when replayed, then the factory's processor runs at that
  position; an unregistered name throws naming it.
- Given no `layered-loops.json`, when the helpers load, then the dependent suites skip with a message naming T1.

## Observability / Rollback

N/A — test helpers only. Reversible.
