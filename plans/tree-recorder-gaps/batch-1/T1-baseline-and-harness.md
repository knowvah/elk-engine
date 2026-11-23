<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: baseline, mutant reconstruction, harness, M-e issue

## Context

8a's T19 named the survivors and unreached arms, but not every operator (R-d, V-a). Its line numbers predate later commits.
Batch 2 needs a fixed "before" picture to prove that each new row adds evidence.

## Task

1. **Harness (D8).** Write `$TMPDIR/tree-recorder-gaps/mutate.sh` and test it on one one-token mutant the landed
   replays kill. M13 of the T19 journal row (`MultiLevelEdgeNodeNodeGap.ts`, killed by `MrTreeVectors.test.ts`) is the
   lead. Journal the harness text and that check.
2. **Mutants.** For R-c, R-d, V-a, V-b, M-c and M-d: find the current line, state the exact one-token change, and run it
   against the bundle's landed replay tests:
   - radial: `src/alg/radial/RadialVectors.test.ts`;
   - vertiflex: `src/alg/vertiflex/VertiFlexVectors.test.ts` and `p2relative/RelativeXPlacerReplay.test.ts`;
   - mrtree: `src/alg/mrtree/MrTreeVectors.test.ts`, `intermediate/CompactionProcessor.test.ts`, `intermediate/FanProcessor.test.ts`,
     `p4route/EdgeRouter.vectors.test.ts`.

   Each should survive. For R-d, try each `<` of line 18 and keep the ones that survive. For V-b the T11 row names
   `> 0.5`. A mutant that is already killed is journaled, and its item is outcome 1 by existing evidence (no new row).
3. **Arms.** For R-a, R-b, M-a and M-b: run the bundle's landed replay tests alone with scoped coverage
   (`--coverage.include='src/alg/<bundle>/**'`, the T19 commands in `plans/alg-trees/unreached.md`) and record whether the
   arm is taken. For M-a, run the stops replay alone (filter `-t 'stops'`) to list the gap arms only full rows reach. Journal
   the exact arm list. It becomes T4's target.
4. **M-e.** File the D5 issue: `gh issue create --label needs-ruling`. Use the title
   `trees: may the mrtree stop dump carry in-edge order and DIRECTION (re-record two refs, lower the frozen 27)`. The body
   follows the fork issue standard (memory `fork-issue-standard`): what, where (`MrTreeVectors.java` dump, `mrtree-replay-state.ts`,
   `mrtree-replay-dump.test.ts:62`), why it is a ruling (AD-13), and the proposed proof (strip the new keys, then byte-equal).
   Add a "Ruling needed:" question comment (memory `label-decisions-needs-ruling`). Put the number in [items.md](../items.md)
   and the README.
5. Fill [items.md](../items.md)'s TS lines and exact mutants. Journal one `T1 | plan` row with the batch 2 spawn plan.

## Write-set

[items.md](../items.md), [decision-journal.md](../decision-journal.md), the README's M-e mention. Scratch under `$TMPDIR`.

## Read-set

`plans/alg-trees/unreached.md`, `plans/alg-trees/decision-journal.md:85-99`, the TS files named in [items.md](../items.md),
`.agent-notes/alg-trees.md` (the kill timer).

## Acceptance criteria

- Given the harness, when M11 is applied, then it prints `killed` and `git diff --quiet src/` holds afterwards.
- Given each mutant item, when run against the landed replays, then the journal records `survived` (or `killed`, which ends the
  item) with the exact token change.
- Given each arm item, when the landed replays run with scoped coverage, then the journal records taken or not taken per arm.
- Given M-e, when T1 ends, then a `needs-ruling` issue exists with the question comment, and its number is in the brief.

## Quality bar

No tracked file changes outside the write-set (`git status --short` shows only `plans/tree-recorder-gaps/`).

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (docs and scratch only).
