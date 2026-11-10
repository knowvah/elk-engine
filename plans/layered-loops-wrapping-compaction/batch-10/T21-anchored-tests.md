<!-- SPDX-License-Identifier: EPL-2.0 -->

# T21 — Anchored unit tests and mutation checks

**Agent:** test-automator (sonnet) · **Commit:** `test(T21): anchor the 7g classes to oracle rows`
Scratch: `$TMPDIR/7g/T21/`.

## Context

W14, F12 (7f2's T17a/b shape). Each anchored case cites `// oracle: <row id>; <Java file:line>` and takes every literal from that
row (L4). `.agent-notes/layered-labels.md`: `toEqual` on enum constants is vacuous (use `toBe`/`String()`).

## Task

1. Anchored cases for the branches the replay reaches only indirectly (one file per package: loops, ordering, routing, wrapping,
   intermediate compaction, compaction oned/components, `ComponentsCompactor`), so a regression names the class.
2. Mutation checks on the decisive branches (flip a comparison or drop a branch in a scratch copy; the anchored or replay test
   must fail); journal survivors with the row that would discriminate them, and file a `follow-up` issue if a new oracle graph
   is needed.
3. Coverage over the full suite ≥ 90/90/90/90 (stop 10), shortfalls journaled as U.

## Write-set

New `*Anchored.test.ts` files beside the 7g classes.

## Read-set

`unreached.md`, `layered-loops.json` rows by id, `src/alg/layered/components/ComponentsAnchored.test.ts` (shape).

## Acceptance criteria

- Given each anchored case, when read, then it names its row and Java line and invents no literal.
- Given `env $SWEEPS npm run coverage` (orchestrator), when run, then ≥ 90 on all four metrics.
- Given the mutation checks, when run, then survivors are journaled with their discriminating row or a `follow-up` issue.

## Observability / Rollback

N/A. Reversible.
