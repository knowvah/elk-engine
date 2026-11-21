<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/recorder-pin-source/README.md` (mission summary at the end, batch status),
`plans/recorder-pin-source/decision-journal.md`, `.agent-notes/recorder-pin-source.md`,
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. File `follow-up` issues (not `queue:ready`) for anything found on the way, for example the `Run:` header lines of
   `CoreJdkVectors.java` and `GuavaVectors.java`, which now duplicate the scripts (D3 left them on purpose).
2. Queue gates 1-7 (README "Quality gates"); journal each with its numbers. CodeQL scans the edited Java and shell:
   a finding on new code is fixed, not accepted, unless it is a proven false positive (journal the proof).
3. Append `## Revision 2026-MM-DD (recorder-pin-source)` to `plans/roadmap.md` in the form of earlier revisions: the
   pin now lives once under `tools/` (D1, D2), the fitness test, the two new scripts, the runbook changes, the cold
   proof (cache lines, `elkj` wall time, refs byte-identical, eight sweeps byte-equal, negative path), issues filed,
   and that #50 was left separate (D6). Never edit an earlier line.
4. Write `.agent-notes/recorder-pin-source.md` (template of `~/.claude/rules/memory.md`) for anything novel: at least
   whether the source edits moved any unpinned recorder's output (the identity-hash question, answered by evidence),
   and the measured cold times.
5. Mission summary at the end of `README.md`; mark all batches `[x]`. Squash per README "Landing"; journal the tag
   and the commit. Comment on #96 with the summary and the issues filed (do not close it; it closes when the branch
   merges).

## Acceptance criteria

- Given gates 1-7, when T4 ends, then all are green and journaled with their numbers (coverage four percentages,
  test counts, typedoc warning count, CodeQL result, gate-7 diff empty).
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #96`, and the tag
  `recorder-pin-source/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
