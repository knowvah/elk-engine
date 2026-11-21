<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: close-out

## Write-set

- `docs/architecture/elk-upgrade.md` (§ 7: one paragraph on multi-file recorders and `java-program.sh`)
- `docs/architecture/alg-layered-loops.md:158` (the recorder is now multi-file)
- `docs/architecture/alg-layered.md:472`, only if it states that every recorder is single-file
- `plans/roadmap.md` (append `## Revision <date> (vector-recorder-debts)`; never edit an earlier line)
- `.agent-notes/vector-recorder-debts.md`
- `plans/vector-recorder-debts/README.md` (append `## Mission summary (<date>)`)
- `decision-journal.md`

`docs-site/` translated pages stay untouched.

## Steps

1. **Docs.**
   - The runbook says how a multi-file recorder is laid out and launched, and that a direct `java <P>.java` no longer
     works for one.
   - Run `npx vitest run test/docs`: `elk-upgrade-runbook.test.ts` must still find every program.
2. **Follow-up issue.** File it with `gh issue create --label follow-up`, title
   `cleanup: split the remaining multi-thousand-line recorders`. It lists the recorders over 1,800 lines (sizes at
   planning in `wc -l tools/vectors/*.java`), notes that the 13 unpinned scripts need an identity-hash check first,
   and names the shared `Dump` encoder as a candidate. Journal the number. File any other `follow-up` found on the way.
3. **Gates 1-7** as in the README. Journal each result: coverage numbers, the typedoc warning count, the CodeQL line.
   - A CodeQL finding in the split files is fixed in the helper file. Do not accept it.
   - The only exception is a finding in code moved verbatim that also fired on the original file; check against a
     base scan if one exists, and journal it.
4. **Roadmap revision.** Append the revision: what changed, the proof counts, decisions D1-D6, what was not done (D3
   rejected (a)), and the issues filed. Write the `.agent-notes` observations: the build's measured compile time, any
   split trap met, and the instrumentation table from T3.
5. **Landing** as the README says: tag `vector-recorder-debts/pre-squash`, `git reset --soft <base>`, one commit,
   `Refs: #50`. Run `git log --oneline -2` to show the base and the one commit.

## Acceptance criteria

- Given gates 1-7, then each is green and journaled with its numbers.
- Given the branch, then exactly one commit sits on the base, and the tag keeps the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A.

## Rollback

Reversible: the tag holds the pre-squash history. `git reset --soft` has not been pushed.
