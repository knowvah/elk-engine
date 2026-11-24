<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9: gates, roadmap revision, notes, squash

## Steps

1. Queue gates 1-7, each journaled with its numbers:
   1. `npm run format:check`
   2. `npm run typecheck`
   3. `npm run complexity`: read the report, not the exit code. The new `tools/arm-search/*.ts` files must add no
      violation.
   4. `npm run coverage`: 90/90/90/90, full suite.
   5. `npm run docs:build`
   6. `npm run codeql`: every finding must be accepted in `tools/codeql/accepted.json` with a reason. Fix findings in
      `tools/arm-search/` rather than accepting them; journal any new entry.
   7. Run `git diff --exit-code <base> -- test/golden/refs/ ':!test/golden/refs/java/layered-order.json'
      ':!test/golden/refs/java/layered-compound.json'`; it must be clean. The two named refs differ only as the D5
      diffs of T5/T6 showed. Rerun both recorders cold into scratch and `cmp` them with the committed refs. No other
      recorder's input changed: say so per recorder in the journal.
2. Append `## Revision 2026-11-<dd> (layered-arm-search)` to `plans/roadmap.md`, as earlier revisions do: the outcome
   counts, the row ids, and the issues filed. Edit no earlier line.
3. Write `.agent-notes/layered-arm-search.md` for anything novel (for example, which instrumentation found what, or a
   tolerance window), or record "no novel discoveries".
4. Fill in this brief's README "Mission summary" and mark every batch `[x]`.
5. Comment on #59 with the outcome counts and a link to the new `unreached.md` section. Leave the labels alone: the
   driver swaps `queue:planned` for `queue:on-branch`.
6. Squash: `git tag layered-arm-search/pre-squash`, `git reset --soft <base>`, then one commit with
   `git -c commit.gpgsign=false commit -F <file>`. The message follows the README § Landing. Never push. End with the
   driver's outcome line.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all are green and journaled.
- Given `git log <base>..HEAD`, then exactly one commit exists, with `Refs: #59`.
- Given the ref diff against the base, then only `layered-order.json` and `layered-compound.json` change, by appended
  rows.

## Observability

N/A.

## Rollback

Reversible: the pre-squash tag keeps the per-task history.
