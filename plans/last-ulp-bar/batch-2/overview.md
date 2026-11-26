<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: amendment text and mechanism vector (parallel)

Both tasks depend only on T1. Their write-sets are disjoint, so they may run as two subagents.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-amendment-text.md) | AD-4 amendment, `CLAUDE.md` clause, § 2 rule paragraph | `claude` (sonnet) or orchestrator | `plans/elk-engine-skeleton/decisions.md` (append), `CLAUDE.md`, `docs/conformance.md` § 2 policy bullet | T1 | [x] |
| [T3](T3-mechanism-vector.md) | `LastUlpVectors.java`, its script and the new ref | `claude` (sonnet) or orchestrator | `tools/vectors/LastUlpVectors.java`, `tools/vectors/last-ulp-vectors.sh`, `test/golden/refs/java/last-ulp.json` | T1 | [x] |

## Common rules (include in every subagent prompt)

- Work in `/Users/scottseely/git/knowvah/elk-engine-queue` on branch `chore/issue-queue`. Write only your write-set. Do
  not commit, push, stash or call `gh`; the orchestrator does.
- Never write `~/git/knowvah/elk`, `~/.claude`, any `src/` file or any existing ref. Never read OpenJDK source (AD-9).
- Every new file carries the SPDX header (`// SPDX-License-Identifier: EPL-2.0`, `#` for sh, `<!-- -->` for md).
- Run `npx prettier --check` on changed non-Java files. Before a JVM run check `uptime`; wait while above 12; use
  `nice -n 10`.
- Return only: files changed, commands run with exit codes, and anything the orchestrator must journal. No preamble.

Commit after each task: `docs(conformance): append the ad-4 last-ulp amendment` (T2),
`test(vectors): record hotspot math against strictmath for last-ulp entries` (T3).
