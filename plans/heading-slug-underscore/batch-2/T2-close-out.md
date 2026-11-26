<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/heading-slug-underscore/README.md` (mission summary at the end, batch
status), `plans/heading-slug-underscore/decision-journal.md`, `.agent-notes/heading-slug-underscore.md` (only if
novel), `tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. **D4 follow-up.** Re-run planning's sweep (every code point U+0020–U+2FFFF except surrogates, as `a<c>b`, through
   the final `headingSlug` rule and through github-slugger's `slug()`; scratch script under `$TMPDIR`). Journal the
   counts by Unicode category and direction. File one `follow-up` issue (not `queue:ready`): the remaining
   differences from github-slugger outside whitespace and Pc, with the counts, five examples per largest group, and
   the note that no landed heading holds any of them. Refs #94. File any other defect found on the way the same way.
2. Queue gates 1-7 (README "Quality gates"); journal each result with its numbers. Gate 7 diff against the base must
   be empty.
3. Append `## Revision 2026-MM-DD (heading-slug-underscore)` to `plans/roadmap.md` in the form of earlier
   revisions: the rule change, the one ruled expected-value change, the new rows, the empty id-inventory diff, part 1
   closed by ruling (no change), and the issues filed. Never edit an earlier line.
4. Write `.agent-notes/heading-slug-underscore.md` (template of `~/.claude/rules/memory.md`) for anything novel; if
   nothing, journal that. Correct `.agent-notes/docs-publish-prep.md`'s Medium-confidence observation only by a new
   entry in the new file (notes of other missions are not edited).
5. Mission summary at the end of `README.md`; mark both batches `[x]`. Squash per README "Landing"; journal the tag
   and the commit. Comment on #94 with the summary and the issues filed (do not close it).

## Acceptance criteria

- Given gates 1-7, when T2 ends, then all are green and journaled with their numbers (coverage four percentages,
  test counts, typedoc warning count, CodeQL result, ref diff empty).
- Given the D4 sweep, then one `follow-up` issue exists with its counts, and no code changed for it.
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #94`, and the tag
  `heading-slug-underscore/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
