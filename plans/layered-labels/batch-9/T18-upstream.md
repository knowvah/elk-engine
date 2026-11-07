<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — Upstream fix branches and issue draft

**Agent:** main session · **Commit:** `docs(T18): journal the upstream fix branches`

## Context

Mission 7f2, G10, stop 22. User practice (2026-11-05): a defect the port copies gets a fix branch in a worktree of `../elk`, one
commit, left unsigned. Known candidates: (1) `J/intermediate/EndLabelSorter.java:194`, `this.labels.addAll(labels)` in the
`LabelGroup` constructor, which has no `labels` parameter, so it adds the (empty) field list to itself (7f's journal and roadmap cite `:206`, a comparator line; `:194` is verified at the pin,
`git -C ../elk show <pin>:<path>` with `tools/oracle/ELK_COMMIT`). (2) The `EndLabelSorter` group order: `createLabelGroups` (`:160-177`) collects groups from a
`HashMap<LEdge, LabelGroup>` (`:161`) and the later sort (`LABEL_GROUP_COMPARATOR`, `:200-`) is stable, so groups the comparator ties keep
`HashMap` iteration order. FX2's scenario (T1, T12) is the evidence: if it shows nondeterminism or a mismatch traced to this order
(stop 17), the fix is an insertion-ordered map. (3) `testEdgesPointTowardsNextLayers` (7b, T13c): an issue report once the pipeline
reproduces it. `.agent-notes/layered-pipeline.md` records that the checkout is ahead of the pin.

## Task

1. Read T12's journal (FX2) and T15's FX3-style measurement; decide which of (1), (2) get a branch. (1) always does.
2. For each branch: `git -C ../elk worktree add ../elk-<slug> -b fix/<slug> <base>` (`<base>` = the checkout's current `master` HEAD; never
   touch the `master` working tree); make the minimal change; one commit, `--author='Scott Seely <scott@seely.io>'` and
   `--signoff`, subject in ELK's message style (read `git -C ../elk log -20 --format=%s`), body saying what was wrong and why the change is
   behaviour-preserving (for (1): the statement was a no-op on an empty list; for (2): only tie order changes, now deterministic). No
   `-S`: unsigned. Verify with the same Maven invocation `tools/oracle/build.sh` uses, pointed at the worktree, and the
   `EndLabelSorterTest` run (`java-baseline.md`: 4 runs, 0 failures); if the build cannot run offline, say so in the journal.
3. Draft (never file) the issue report for `testEdgesPointTowardsNextLayers` if T13c reproduced it: title, ELK commit, the configuration
   (`layering.strategy` BF/DF model order), the failing models, the Java mechanism with `file:line`, and why the test never ran on these
   layerers (`.agent-notes/layered-cycles-layers.md:131-139`). If it did not reproduce, journal that and the evidence; no draft.
4. Journal in `decision-journal.md`: per branch the worktree path, branch name, commit subject, verification output, and the exact
   commands for the user: `git -C ../elk-<slug> commit --amend --no-edit -S` (to sign), `git -C ../elk-<slug> push <fork> fix/<slug>`,
   and opening the PR; the issue draft text. Hand them over; never run them.
5. Confirm `git -C ../elk status` shows the `master` checkout unchanged and nothing else outside this repo and the worktrees was created
   (stop 22 otherwise).

## Write-set

`plans/layered-labels/decision-journal.md`; local branches in `../elk` worktrees (outside the repository, as G10 allows).

## Read-set

`../elk` `J/intermediate/EndLabelSorter.java:150-220` (at the pin and at HEAD), `tools/oracle/ELK_COMMIT`, `tools/oracle/build.sh`, T12's
and T13c's and T15's journal rows, `.agent-notes/layered-cycles-layers.md:131-139`, `decisions.md` G10, stop 22.

## Architecture decisions

G10 (user practice; unsigned; pushes, PRs and issues are the user's), stop 22, AD-9 (never read OpenJDK).

## Interface contract

The journal's hand-over block is what the user runs; T19's summary links it.

## Acceptance criteria

- Given `git -C ../elk branch --list 'fix/*'`, when read, then each decided fix exists, one commit each, authored by Scott Seely with a
  sign-off trailer and no signature.
- Given `git -C ../elk status` on `master`, when read, then the checkout is unchanged.
- Given the journal, when read, then it holds the commands for the user and no command was run.
- Given stop 22, when audited, then nothing was pushed, opened or filed.

## Observability / Rollback

N/A — no new observable operations. Reversible: delete the worktrees and branches (`git -C ../elk worktree remove`, `branch -D`).
