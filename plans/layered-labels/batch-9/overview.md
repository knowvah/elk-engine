<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 9 — Upstream fix branches

One task, **serial**, orchestrator only (no agent: it touches `../elk`, which only the main session handles). T18 applies G10: defects
or oddities of ELK that the port copies get a fix branch in a `git -C ../elk worktree add` worktree, unsigned, one commit authored and
signed off by `Scott Seely <scott@seely.io>`; an issue report is drafted for 7b's `testEdgesPointTowardsNextLayers` if T13c reproduced
it. The executor never signs, pushes, opens a PR, files an issue or creates anything else outside this repository (stop 22); the
commands are handed to the user.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T18 | Upstream fix branches and issue draft, G10 ([brief](T18-upstream.md)) | orchestrator (main session) | plans/layered-labels/decision-journal.md; local branches of worktrees under `../elk` (outside the repo, G10) | T12, T13c, T15 | [x] |

The `../elk` `master` checkout stays untouched (`git -C ../elk status` is the same before and after). The batch is done when the
journal holds the branch names, commit subjects, the verification and the handed-over commands, and the README's "Landing" commands
are unchanged.
