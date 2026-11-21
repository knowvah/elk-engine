<!-- SPDX-License-Identifier: EPL-2.0 -->

# spore-scanline-0004: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue naming the
exact part, leaves that part as it is, and finishes the rest. Every stop is journaled with the diagnosis artifact
(mechanism, origin `file:line`, causal chain, ruled out) where a discrepancy caused it.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | `gh pr view 1247 -R eclipse-elk/elk` shows a head other than `1bf1da95…`, or the PR closed unmerged (at start or before the squash) | Halt; file `needs-ruling` (issue boundary). Do not refresh or drop the patch. Merged at `1bf1da95` is not a stop: journal it (the pin move is a later mission) |
| 2 | Patched `ScanlineOverlapRemovalTest` on the oracle is not 4 runs, 0 failures; or the patch does not apply with `git am --3way`; or `build.sh` fails twice | Halt |
| 3 | A ref outside [decisions.md#d4](decisions.md#d4) changes, or a D4 ref changes outside its allowed part (a `sporeCompaction` row, a non-scanline `alg-common` row, a non-`patches` `_meta.json` field) | Halt; restore the unexplained refs from HEAD in the journal's evidence, never commit them |
| 4 | The per-class jar diff (D3) shows a changed class other than `ScanlineOverlapCheck*` in alg.common and the spore test bundle | Halt (the oracle is not what the patch says) |
| 5 | After T3, the TS port does not reproduce a regenerated row, golden or the two new tests | Diagnosis mode (instrument the oracle and the port, find the first divergence). A fix with a stated mechanism inside the T3 write-set: proceed. No mechanism after 2 fix attempts: halt |
| 6 | A hand-written test's assertion can pass only with a new expected value (AD-13, D8) | File `needs-ruling` naming the test and its rows; leave the assertion unchanged; finish T4-T5; then halt before the squash (gate 4 cannot go green while it fails) |
| 7 | Sweep (T4): a `sporeOverlap` verdict other than `ok` / `both-throw`, or a TS `mismatch`, not explained by the #79 flicker (coincident centres; conformance § 2 "Known flicker") | Diagnosis mode; unexplained after instrumentation: partial (`needs-ruling` naming the case ids) |
| 8 | A needed write outside the write-sets, or to `~/git/knowvah/elk`, `elk-fixes`, `~/.claude`, the main checkout | Halt with the question |
| 9 | A queue gate fails after 2 fix attempts on that check | Halt |
| 10 | `../elk` has a commit past the pin over the three bundles | Not a stop: journal it (queue rule) |

## Push-forward (decide and journal)

- The patch file name format-patch writes; wording of the TS comment and the docs prose.
- Whether T3 / T5 run as subagents or in the orchestrator.
- Ordering of regen scripts inside T2; reruns of a recorder after a tool failure that is not a ref change.
- A typedoc warning count change caused only by unrelated docs: journal, continue.
- Filing `follow-up` issues for defects found on the way (never `queue:ready`).
