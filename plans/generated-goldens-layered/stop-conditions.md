<!-- SPDX-License-Identifier: EPL-2.0 -->

# generated-goldens-layered: stop conditions and push-forward

A **halt** stops the mission with the question as the final line. A **partial** files a `needs-ruling` issue for the
exact part, leaves it as it is, and finishes the rest. Every stop caused by a discrepancy is journaled with the
diagnosis artifact: mechanism, origin `file:line`, causal chain, ruled out.

| # | Condition | Action |
| - | --------- | ------ |
| 1 | `oracle-build.json` does not name `8bca22f4` + 0001-0004 | Rebuild with `tools/oracle/build.sh` and journal it. If the rebuild fails twice, halt |
| 2 | A D5 regen writes any ref or `_meta.json` that differs from the committed (moved or remaining) file | Restore with `git checkout -- test/golden/refs/` (the renames stay staged), keep the regen output in scratch, and diagnose by instrumenting the oracle run (case order, input path, JVM flags). The ruling allows no re-record, so the refs stay as moved. Halt with the artifact, unless the cause is in the D2 script change itself: fix that (2 attempts) and rerun |
| 3 | The TS layout of a moved golden differs from its ref in the layered runner (it passed in the trees runner) | Diagnose the runner difference (registration, input file, overlay). A fix outside the two test files and the D2 inputs is a halt |
| 4 | Any test, vector or golden other than the two runners fails, or a test would need an expected value changed (AD-13) | Halt with the rows named |
| 5 | `git diff -M --stat <base> -- test/golden/refs/` shows anything but the three 100% renames | Halt. Restore it, journal the diff |
| 6 | A queue gate fails after 2 fix attempts on that check | Halt |
| 7 | A needed write lies outside the README's blast radius (another mission's `plans/` file, `~/.claude`, the main checkout, `~/git/knowvah/elk`, the oracle worktree other than through `tools/oracle/`) | Halt with the question |

## Push-forward (decide and journal)

- The wording of the notes in `layered.json`, of the comments, the docs and the journal rows.
- The shell form of D2's resolver (a helper function, an extra `write_cases` argument), as long as the 24 existing cases
  send the same files.
- Placement of the three new entries in `layered.json` (append at the end).
- Other stale mentions of the three old ids found outside `plans/` and the blast radius: list them in the journal and on
  the hand-back; edit only the files in the blast radius.
- Any `follow-up` met on the way (never `queue:ready`).
