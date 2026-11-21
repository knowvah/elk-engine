<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/models-dir-env/README.md` (mission summary at the end, batch status),
`plans/models-dir-env/decision-journal.md`, `.agent-notes/models-dir-env.md`, `tools/codeql/accepted.json` (only for
an accepted finding, journaled).

## Steps

1. File `follow-up` issues (not `queue:ready`) for anything found on the way.
2. Queue gates 1-7 (README "Quality gates"), with `ELK_MODELS_DIR` unset; journal each with its numbers. Coverage
   test counts should equal the base's (no test added or removed). At planning: the last mission's coverage run
   (sweep dirs off) recorded 1,178 files, 49,337 passed, 93 skipped; a plain `npm test` on `6307bf36` (sweep dirs
   on) gave 1,187 files passed and 1 skipped, 49,347 tests passed, 84 skipped. A different skip count is stop
   condition 4.
3. Append `## Revision 2026-MM-DD (models-dir-env)` to `plans/roadmap.md` in the form of earlier revisions: the two
   call sites (D1), the proof (clone red/green counts, the negative run), the runbook step removed (D3), that roadmap
   tool-side row 6 is fixed on the branch (without editing that row, D4), issues filed, gates. Never edit an earlier
   line.
4. Write `.agent-notes/models-dir-env.md` (template of `~/.claude/rules/memory.md`) for anything novel, for example
   what the scratch-clone layout needed to run vitest; if nothing is novel, say so in the journal.
5. Mission summary at the end of `README.md`; mark both batches `[x]`. Squash per README "Landing"; journal the tag
   and the commit. Comment on #98 with the summary and any issues filed (do not close it; it closes when the branch
   merges).

## Acceptance criteria

- Given gates 1-7, when T2 ends, then all are green and journaled with their numbers (coverage four percentages,
  test counts, typedoc warning count, CodeQL result, gate-7 diff empty).
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #98`, and the tag
  `models-dir-env/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
