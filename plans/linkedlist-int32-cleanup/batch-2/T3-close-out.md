<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/linkedlist-int32-cleanup/README.md` (mission summary at the end),
`plans/linkedlist-int32-cleanup/{audit,int32-sites,decision-journal}.md`, `.agent-notes/linkedlist-int32-cleanup.md`,
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. File `follow-up` issues (not `queue:ready`), each self-contained:
   - The same equality hazard on Java lists the port keeps as plain arrays (`Lists.newLinkedList`/`newArrayList`/
     `new ArrayList` → `[]`, then `includes`/`indexOf`/`splice(indexOf)`) for value-equal element types (D1's types).
   - A repo-wide audit of bare `+ - *` on Java `int` outside the three crossing-min directories (D4's scope).
   - Any defect found on the way.
2. Queue gates 1-7 (README "Quality gates"); journal each result. Gate 7 diff against the base must be empty.
3. Append `## Revision 2026-MM-DD (linkedlist-int32-cleanup)` to `plans/roadmap.md` in the form of earlier
   revisions: audit outcome (counts per verdict), sites converted/kept, issues filed, and that the follow-ups
   "`LinkedList.ts`'s header" (§ Revision 2026-11-05) and "crossing-count sums … plain `+`" (§ Revision 2026-10-30)
   are closed by this mission. Never edit an earlier line.
4. Write `.agent-notes/linkedlist-int32-cleanup.md` (template of `~/.claude/rules/memory.md`) for anything novel; if
   nothing, journal that.
5. Mission summary at the end of `README.md`. Squash per README "Landing"; journal the tag and the commit. Comment on
   #47 with the summary and the issues filed (do not close it).

## Acceptance criteria

- Given gates 1-7, when T3 ends, then all are green and journaled with their numbers (coverage four percentages,
  typedoc warning count, CodeQL result, ref diff empty).
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #47`, and the tag
  `linkedlist-int32-cleanup/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
