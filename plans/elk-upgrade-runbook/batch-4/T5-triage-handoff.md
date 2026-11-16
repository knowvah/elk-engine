<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: triage list, runbook update, rulings, cleanup, gates, squash

## Context

The rehearsal's evidence is in the journal (T2-T4). T5 turns it into the "done when" deliverables: a committed runbook
corrected by the rehearsal, a triaged diff list (or "clean sweep"), and the maintainer hand-off for the real pin move
(UP8).

## Task

1. **Triaged diff list.** Journal one `finding` row that summarizes the rehearsal: the net Java diff classes (T2); the ref
   diff, raw against normalized, with a class per file (T3); the sweep, suite and check comparison (T4); and the verdict,
   "clean sweep" or "triaged diff list (n items)". Every item names its class and its next step.
2. **Runbook corrections.** Fold every command the rehearsal proved wrong into `docs/architecture/elk-upgrade.md`, with
   before and after journaled. Fill the cost table from T3's measured wall times, and add a "Last rehearsal" line (date,
   pin → target, verdict, journal path). Rerun the UP5 test, `docs:build` and `docs:linkcheck`.
3. **Rulings and follow-ups.** File one `needs-ruling` issue: "pin: move ELK_COMMIT to b715fb10". Its body holds the
   triaged list, the cost table, the runbook path, the AD-13 note (the stamped refs regenerate), the `GraphFeature`
   carve-out closing (UP8), and the AD-2 and CLAUDE.md pin lines to update. File a `follow-up` issue for each defect
   found on the way, and for the UP7 cap if it hit. Journal the issue numbers.
4. **Cleanup (UP9).** Confirm no rehearsal process is running. Run
   `git -C ~/git/knowvah/elk worktree remove --force "$R/oracle"` and `git -C ~/git/knowvah/elk worktree prune`, then
   `rm -rf "$R"`. Journal `git -C ~/git/knowvah/elk worktree list` and `status --short` equal to T2's pre-state.
5. **Roadmap and notes.** Append `## Revision <date> (elk-upgrade-runbook)` to `plans/roadmap.md` in the earlier
   revisions' form: source, outcome, deviations, follow-ups, flags for the maintainer. Never edit an earlier line. Write
   `.agent-notes/elk-upgrade-runbook.md` for anything novel, for example Tycho 4.0.13 behaviour, the scratch Maven repo,
   or measured cold costs.
6. **Gates.** Run queue gates 1-6 on the queue worktree (README § Quality gates) and journal each result. Then fill in the
   README "Mission summary", in the form of `plans/docs-publish-prep/README.md`.
7. **Squash.** Tag `elk-upgrade-runbook/pre-squash`, run `git reset --soft <base>`, and make one commit (README §
   Landing) with footer `Refs: #44`. Comment on #44 with the outcome and the ruling issue number.

## Write-set

`docs/architecture/elk-upgrade.md`, `test/docs/elk-upgrade-runbook.test.ts` (only if the runbook's inventory format
changes), `plans/roadmap.md` (append only), `plans/elk-upgrade-runbook/README.md` (batch boxes, summary),
`plans/elk-upgrade-runbook/decision-journal.md` and `.agent-notes/elk-upgrade-runbook.md` (create). A tool fix found in
T3 or T4 may touch its script under `tools/` only with a diagnosis artifact and a journal row; otherwise it goes to a
`follow-up` issue.

## Read-set

The journal; `docs/architecture/elk-upgrade.md`; `plans/roadmap.md:1800-1892` (the latest revision's form);
`plans/docs-publish-prep/README.md` "Mission summary"; `decisions.md#up8`, `#up9`.

## Interface contracts

Input: T3's and T4's journal rows (see their contracts). Output: the issue numbers and the final verdict line, which the
squash commit body quotes.

## Acceptance criteria

- Given the journal, when T5 ends, then one `finding` row gives the verdict, and every item in it has a class and a next
  step.
- Given the runbook, when it is read, then its cost table holds measured wall times and a "Last rehearsal" line, and the
  UP5 test passes.
- Given `../elk`, when cleanup ends, then `worktree list` and `status --short` equal T2's pre-state, and `$R` does not
  exist.
- Given the queue worktree, when the gates run, then gates 1-6 pass and `git diff --exit-code <base> -- test/golden/refs/`
  is empty.
- Given the branch, when the mission ends, then there is exactly one commit on the base, the pre-squash tag exists, and
  #44 has a comment naming the ruling issue.

## Quality bar

The summary claims only what journal rows prove; every claim cites its row (task and kind).

## Observability requirements

N/A.

## Rollback notes

Reversible: one commit that adds docs, a test, a README link, a roadmap revision and notes. The scratch state is already
gone.
