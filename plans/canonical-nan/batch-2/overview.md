<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: JVM encoders and TS encoders (parallel)

Two subagents with disjoint write-sets. Both read T1's audit table from the journal. The orchestrator reviews each diff,
runs the batch gates and commits each task separately.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-jvm-encoders.md) | Move every `raw` and `guarded` JVM site to `doubleToLongBits`; fix header comments | `claude` (sonnet) | `tools/vectors/*.java`, `tools/vectors/LayeredLoopsVectors/*.java` (the audited sites only) | T1 | [x] |
| [T3](T3-ts-encoders.md) | Shared `double-hex.ts` + test; move every `raw` TS site to it; one sign test per changed helper | `claude` (sonnet) | `test/helpers/double-hex.ts`, `.test.ts`, the audited TS files and their tests | T1 | [x] |

Batch gates (orchestrator, after both): `npm run typecheck`; `npx prettier --check` on the changed TS files;
`npm run complexity` (read the report); `npx vitest run` over every test file that imports a changed helper (find them with
`grep -rl` on the helper's module name) plus `test/helpers/double-hex.test.ts`. The JVM side is proven in T4 by rerunning
the recorders.

## Common rules (include in every subagent prompt)

- Work in `/Users/scottseely/git/knowvah/elk-engine-queue` on branch `chore/issue-queue`. Write only your task's
  write-set; report anything else you think needs a change instead of making it.
- Change only how a double becomes bits. Never change what a recorder computes, its rows, its guards, its output shape, or
  any expected value, vector or ref (AD-13: a test that passes only with a changed expectation is a stop; report it).
- Never read or copy OpenJDK source. Never write to `~/git/knowvah/elk`, `~/git/knowvah/elk-oracle` or `~/.claude`.
- Every new file carries `// SPDX-License-Identifier: EPL-2.0`. No magic strings: the canonical NaN literal lives in one
  place per side (D2).
- Do not commit, stash, push or run JVM recorders; the orchestrator does.
- Opus/sonnet scope discipline: implement the simplest reading of the task file; the audit table is the complete list.
- Return only the structured result: files changed with line ranges, tests added, commands run with their summary lines,
  open questions. No preamble, no trailing summary.
