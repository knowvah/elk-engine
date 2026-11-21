<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/overview-status/README.md` (mission summary at the end, batch status),
`plans/overview-status/decision-journal.md`, `.agent-notes/overview-status.md` (only if novel),
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. **Hand-off (D5).** Comment on #90 (do not close it, do not change its labels): when the surface lands in
   `src/index.ts`, one sentence per page goes stale. List the three English files and the 46 locale pages by
   path, with the English sentence verbatim from the T1 journal row. Also note that `guide/getting-started.md`'s
   notice ("has not accepted yet") has been false since the 2026-11-14 ruling and is #90 step 5. Journal the comment
   URL.
2. **Stale translations (D4).** Read #109 and #131 and any open `docs-site` issue. If none covers the stale hash of
   `conformance.md` and `guide/architecture.md` in all 23 locales (cause: the pin-move edits to the sha line in
   `docs/conformance.md` and `docs/architecture/overview.md` left `sourceHash` behind), file a `follow-up` issue
   (not `queue:ready`) with the status output and that cause. File any other defect found on the way the same way.
3. Queue gates 1-7 (README "Quality gates"); journal each result with its numbers. Gate 7 diff against the base must
   be empty.
4. Append `## Revision 2026-MM-DD (overview-status)` to `plans/roadmap.md` in the form of earlier revisions: what
   changed on the three English pages and the 46 locale pages, the D2 scope line (navigation left to #90), the
   #90 comment, issues filed, and that the docs-publish-prep follow-up #93 is done. Never edit an earlier line.
5. Write `.agent-notes/overview-status.md` (template of `~/.claude/rules/memory.md`) for anything novel (for
   example, how translation subagents behaved with Edit); if nothing, journal that.
6. Mission summary at the end of `README.md`; mark the batches `[x]`. Squash per README "Landing"; journal the tag
   and the commit. Comment on #93 with the summary and the issues filed (do not close it).

## Acceptance criteria

- Given gates 1-7, when T3 ends, then all are green and journaled with their numbers (coverage four percentages,
  test counts, typedoc warning count, CodeQL result, ref diff empty).
- Given #90, then it has a comment listing every #90-dependent sentence by path.
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #93`, and the tag
  `overview-status/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
