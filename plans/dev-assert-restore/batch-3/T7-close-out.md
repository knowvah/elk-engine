<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: docs, inventory, gates, close-out, squash

## Write-set

- `docs/translation-rules.md` (§ 6.8 "Outcome" paragraph, `:505-508` at planning), `docs/conformance.md` (`:951-954`,
  `:1072-1075`), `docs/architecture/alg-layered.md` (`:79-81`), and any other line `grep -rn "#112\|#113" docs` shows
  calling one of the ten sites pending; docs-site i18n hashes if `docs:build` rewrites them
- `plans/dev-assert/inventory.md` (append only, D8)
- `plans/dev-assert-restore/{README.md,decision-journal.md}`, `plans/roadmap.md` (append
  `## Revision <date> (dev-assert-restore)`; never edit an earlier line), `.agent-notes/dev-assert-restore.md`

## Steps

1. Docs: the restored sites are `devAssert` calls, with the tests' steps run with assertions off (#127). New totals
   for § 6.8 (at planning, after #45's post-landing fix: 122 restored, 6 restored before a kept throw, 15 comments;
   after #127: 132, 6, 5 — recount from the inventory plus its superseding sections, do not trust these numbers). Say
   what still stays a comment and why (#4, #5, #114: knowvah/elk#27, #28; `ThresholdStrategy` `:395`, `:403`: #128).
2. Inventory section per D8; journal row.
3. Leftover grep: `grep -rn "Not a devAssert yet" src` lists only the five that stay (#4, #5, #114, `ThresholdStrategy`
   ×2); `grep -rn "function withAssertions" src test` has one hit (`test/helpers/with-assertions.ts`).
4. Queue gates 1-7 from the README, each journaled with its exit code and figures (coverage four numbers vs the base;
   typedoc warnings vs the base; CodeQL accepted set: a new finding is fixed or accepted with a journaled reason;
   `git diff --exit-code <base> -- test/golden/refs/` empty).
5. Issues: `needs-ruling` for stops 3-7, `follow-up` for defects found; none `queue:ready`.
6. Roadmap revision (sites restored, the predicate and its count, wraps by family, new tests, sweeps, issues);
   `.agent-notes/dev-assert-restore.md` for anything novel (e.g. the stack-census method for locating wrap points);
   mission summary at the end of the README; tick the batch table. `npx prettier --check` on every touched doc.
7. Squash per the README's Landing section; comment on #127 (and #112, #113, #119) with the commit sha, the sites
   restored, the #32 count, and any issue filed.

## Acceptance criteria

- Given gates 1-7, when run on the finished tree, then each exits 0 and is journaled.
- Given the docs, when grepped for the ten sites, then none is described as a pending comment unless stop 4 put it back.
- Given the branch, when T7 ends, then one commit on the base carries the mission and the tag
  `dev-assert-restore/pre-squash` holds the per-task history.

## Observability / rollback

N/A — test code and docs. Reversible (revert the one commit).
