<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: baseline, harness, mutant reconstruction

## Context

7h's T15 named the survivors only by id. Its table is gone, and its line numbers predate later commits. Each item's
evidence is "the new row kills the mutant", so the mutant must exist and survive at base first.

## Task

1. **Baseline.** If the base sha differs from `e30d1c5c`, rerun `npm run typecheck` and the full coverage run
   (detached, polls of at most 9 min). Otherwise reuse the planning baseline in the journal's `plan` row.
2. **Harness (D5).** Write `$TMPDIR/compound-mutant-rows/mutate.sh <file> <line> <from> <to> <test files…>`. It works
   in a detached scratch worktree, or copies and restores the file, applies a one-token change, runs the tests, and
   prints `killed` or `survived`. Then it checks `git diff --quiet -- src/` in the queue worktree. Prove it on one
   mutant the landed rows kill (for example, swap `PortType.INPUT` and `PortType.OUTPUT` at
   `CompoundGraphPreprocessorDummies.ts:152`). Journal the harness text and that check.
3. **Mutants.** For each item I1-I8, read the target arm in [items.md](../items.md). Write the one-token change that
   the item's graph is meant to tell apart, and mark it *reconstructed*. Run it against the D5 test set. Expected:
   `survived` for I1-I7 and `killed` for I8 (D7). A mutant already killed is outcome 5. Where an id stood for several
   operators (D14, the R group), keep every variant that survives.
4. **Sanity on the issue's graphs (TS only).** For I1, I2, I4 and I5, run each issue graph through the port with and
   without its mutant (a scratch vitest file under `$TMPDIR`, using `runRow` from
   `test/helpers/layered-compound-replay-run.ts`). Journal whether the final tree differs. A graph that does not
   differ needs tuning in T2, not a stop.
5. Fill in the Mutant column of [items.md](../items.md). Journal one `T1 | plan` row with the T2-T4 order and the
   optional I5 subagent (D8).

## Write-set

[items.md](../items.md), [decision-journal.md](../decision-journal.md). Scratch under `$TMPDIR/compound-mutant-rows/`.

## Read-set

`plans/layered-compound/decision-journal.md:171-178` (T15), `plans/layered-compound/unreached.md`,
`.agent-notes/tree-recorder-gaps.md` (the harness), `.agent-notes/layered-compound*.md`, the TS files of
[items.md](../items.md).

## Acceptance criteria

- Given the harness, when the proof mutant is applied, then it prints `killed`, and `git diff --quiet -- src/` holds
  afterwards.
- Given each item, when its reconstructed mutant runs against the D5 set at base, then the journal records the exact
  token change and `survived` or `killed`.
- Given T1's end, when `git status --short` runs, then only `plans/compound-mutant-rows/` differs.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (docs and scratch only).
