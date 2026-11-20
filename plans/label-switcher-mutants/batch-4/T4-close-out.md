<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/label-switcher-mutants/README.md` (mission summary at the end),
`plans/label-switcher-mutants/{mutants,decision-journal}.md`, `.agent-notes/label-switcher-mutants.md`,
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. Queue gates 1-7 (README "Quality gates"); journal each. Gate 7: `git diff --stat <base> -- test/golden/refs/`
   lists only `layered-labels.json`; rerun T2's append-only script against the final tree and journal it.
2. File `follow-up` issues (not `queue:ready`) for anything found outside #48, such as other `LabelDummySwitcher*`
   files that lack a mutation check, or a recorder helper gap.
3. Append `## Revision <date> (label-switcher-mutants)` to `plans/roadmap.md` in the form of earlier revisions:
   rows added, mutants killed/equivalent, the D1 superset reading, the ref change (append-only, `rowCounts.sites`),
   the `../elk` log check, issues filed, and that the § Revision 2026-11-06 follow-up "Five mutation survivors in
   `LabelDummySwitcherSpaceEfficient.ts`" is closed. Never edit an earlier line.
4. `.agent-notes/label-switcher-mutants.md` for anything novel (template of `~/.claude/rules/memory.md`). If nothing
   is novel, journal that.
5. Mission summary at the end of `README.md`; mark batches `[x]`. Squash per README "Landing"; journal the tag and the
   commit. Comment on #48 with the summary and the issues filed (do not close it).

## Acceptance criteria

- Given gates 1-7, when T4 ends, then all are green and journaled with their numbers (test counts, coverage four
  percentages, typedoc warning count, CodeQL result, ref diff stat).
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #48`, and the tag
  `label-switcher-mutants/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the squashed commit.
