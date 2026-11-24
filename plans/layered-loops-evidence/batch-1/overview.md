<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: find the graphs and the proofs (scratch only)

Four independent searches. None writes a repository file. Each works in a private scratch copy
`$TMPDIR/layered-loops-evidence/<task>/` (`rsync -a --exclude .git --exclude coverage`, `node_modules` symlinked). Each
returns a hand-back: for every candidate row, the Java snippet for `evidenceSites()`, the row id, the stop, the TS
pre-screen result (which mutants change the replayed dump), and an estimated size; for every proof, the argument with
file:line. The orchestrator journals each hand-back.

| Task | Scope | Runs as | JVM |
| ---- | ----- | ------- | --- |
| [T1](T1-found-rows.md) | M1, M2, D7's four option rows (recipes known) | orchestrator or `typescript-pro` subagent (sonnet) | no |
| [T2](T2-compaction-search.md) | M3, M4, M5, M6 (open) | `debugger` or `typescript-pro` subagent (sonnet); D4 oracle probes by the orchestrator | probes only, orchestrator |
| [T3](T3-components-search.md) | M7-M9, M10 (open) | as T2 | probes only, orchestrator |
| [T4](T4-arm-proofs.md) | Sc28 proofs, the spline `:137` TS trace | `typescript-pro` subagent (sonnet); D5 oracle probe by the orchestrator | probe only, orchestrator |

Subagents never commit, never run the full suite or a JVM, and never write under the repository. Their prompt is the
task file plus D1-D4 of [decisions.md](../decisions.md) and the `.agent-notes/layered-loops-evidence-planning.md`
observations.

**Done when:** each task's hand-back is journaled (`evidence` rows). Every mutant has a candidate row, a proof
draft, or the stop-4 budget is spent on it.

**Commit:** none in this batch. The findings land through T5-T7.
