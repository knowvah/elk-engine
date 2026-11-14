<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: close-out

**Agent:** orchestrator. **Writes:** `plans/roadmap.md` (append only), `.agent-notes/text-sizing-seam.md`, the
`## Mission summary` of `plans/text-sizing-seam/README.md`, `plans/text-sizing-seam/decision-journal.md`.

## Steps

1. **End gates (queue gates 1-6)**, run alone after `uptime` and a `ps` check for orphaned vitest or tsx processes. Journal
   each result as a `gate` row:
   `npm run format:check`; `npm run typecheck`; `npm run complexity` (read the violations, not the exit code);
   `env $SWEEPS npm run coverage` (90/90/90/90; `$SWEEPS` as in the README); `npm run docs:build`; then the refs check:
   `git diff --stat <base> -- test/golden/refs/` must list only the nine `_meta.json` (TX8) and `java/label-sizing.json`
   (new). Rerun `label-sizing-vectors.sh` into scratch: the output must be byte-equal to the committed ref.
2. **Roadmap.** Append `## Revision <date> (text-sizing-seam)` to `plans/roadmap.md`, in the form of the earlier
   revisions: what row 10 delivered; the TX decisions in one line each; the evidence counts; the flags for the maintainer
   (TX5's `test/helpers/` location against § 4's old "in `src/`"; the TX3 "both"; #58's four texts still missing from the
   snapshot); `../elk` drift (T1's row); the issues filed. Never edit an earlier line.
3. **Notes.** Write `.agent-notes/text-sizing-seam.md` with only what is new, in the template of `~/.claude/rules/memory.md`:
   for example the only text measurement at the pin is in the test bundle; passing `-D` through `JAVA_TOOL_OPTIONS` to
   `java-tests.sh`; anything surprising about Tycho rebuilding a test bundle.
4. **Issue.** Comment on #41: the patch id, where the evidence is (the journal rows, the conformance section), and the
   decisions to audit (`decisions.md` § Auto-confirmed). Leave the labels to the driver.
5. **README summary.** Fill `## Mission summary` (tasks, exit items with their journal rows, decisions and deviations,
   flags, issues filed), as the row-9 brief did.
6. **Squash** (queue rules): `git tag text-sizing-seam/pre-squash`, `git reset --soft <base>`, then one commit through
   `git -c commit.gpgsign=false commit -F <file>`. Subject: `feat(oracle): text-sizing seam patch and ts measurer (10)`.
   The body says why (row 10, TX1, TX3), lines of 80 characters or fewer, footer `Refs: #41`, and no attribution lines (queue
   rules). Check `git log --oneline -2` and `git status` (clean).

## Acceptance criteria

- Given the end of the mission, when the gates run, then gates 1-6 pass and each is journaled.
- Given `plans/roadmap.md`, when it is diffed against the base, then the only change is the appended revision.
- Given the branch, when `git log <base>..HEAD` is read, then it shows exactly one commit, and the tag
  `text-sizing-seam/pre-squash` holds the task history.

**Observability:** N/A. **Rollback:** Reversible (the squash commit reverts as one).
