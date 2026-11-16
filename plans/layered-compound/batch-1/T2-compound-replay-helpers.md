<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Compound replay helpers

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T2): add layered compound replay helpers`
Scratch: `$TMPDIR/7h/T2/`.

## Context

Mission 7h, H2. The landed replay helpers (`test/helpers/layered-loops-replay-*.ts`, `layered-labels-replay-*.ts`,
`layered-pipeline-replay-*.ts`) replay flat rows: the full layout, or a per-level step prefix. A hierarchical `models` row needs
two more things. First, it runs `ElkLayered.doCompoundLayout` with a `TestController` (`src/core/testing/TestController.ts`;
`ElkLayered.setTestController`, `src/alg/layered/ElkLayered.ts:351`) and stops at the n-th `(graph, processor)` notification.
Second, it compares the **whole** `LGraph` tree from the root with `expected.tree`. Build these as new files that import the
landed helpers. Never edit a landed helper.

## Task

1. `test/helpers/layered-compound-replay-rows.ts`: the ref loader (`compoundRefPath`, the skip message when the ref is absent),
   row typing for the four groups, and enum registration (the `registerLoopsEnums` pattern).
2. `test/helpers/layered-compound-replay-stops.ts`: `runToStop(row)` imports the row's input as the recorder does, runs
   `doCompoundLayout`, counts `layoutProcessorFinished` notifications, and captures the tree at `expected.stop.index`. It checks
   that the level path and processor simple name at that index equal `expected.stop`, and records a mismatch as a diff, not a
   throw. Stopping is by capture: the run completes, and only the snapshot at the index is compared.
3. `test/helpers/layered-compound-replay-dump.ts`: the TS twin of T1's whole-tree dump (7f dump per graph plus `nestedGraph`,
   level path and `CROSS_HIERARCHY_MAP` in sorted order), field for field as T1's header documents it, compared at AD-4 with the
   landed comparator idioms.
4. Unit tests for the three helpers, using hand-built nested `LGraph`s: the dump's structure, stop counting over a stub processor
   list, and diff reporting. Assert structure only; no layout literal (L4).

## Write-set

`test/helpers/layered-compound-replay-{rows,stops,dump}.ts` and their `.test.ts` files.

## Read-set

T1's header contract (`batch-1/T1-compound-recorder.md` § Interface contract; once T1 lands, the recorder header);
`test/helpers/layered-loops-replay-rows.ts:56-110`, `layered-pipeline-replay-*.ts` (the dump and compare functions),
`src/alg/layered/ElkLayered.ts:103-260,340-380`, `src/core/testing/TestController.ts`, `decisions.md` H2, F16.

## Interface contract (consumed by T4–T9, T14)

`loadCompoundRows(): CompoundRow[]`, `runToStop(row): { diffs: string[] }`, `replayFull(row): { diffs: string[] }` (delegating
to the landed full-row replay with nested `plans`), `dumpTree(root: LGraph): unknown`, `compareTree(expected, actual): string[]`.

## Acceptance criteria

- Given a hand-built two-level `LGraph`, when dumped, then every graph appears once with its level path and nested link.
- Given a stub run of five notifications, when stopping at index 3, then the snapshot is the state after the fourth
  notification and a wrong processor name yields one diff.
- Given no ref file, when the loader runs, then tests skip with the landed skip-message form.

## Observability / Rollback

N/A — test helpers only. Reversible.
