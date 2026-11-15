<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: rehearsal — vectors and goldens; sweeps, suites and site checks

Both tasks run in the clone against the scratch oracle, from the orchestrator. T3 is long (UP7: cold recorders, with a
10-hour cap). Start it first, detached, and do T4's short steps while it runs, keeping at most two JVM jobs at a time and
the 1-minute load at or below 12. Neither task writes the queue worktree except the journal.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T3 | [Re-record vectors and goldens; metadata diff; TS suite in the clone](T3-vectors-goldens.md) | orchestrator | clone refs, journal | T2 | [x] |
| T4 | [Sweeps, ported Java suites, repo-wide checks](T4-sweeps-suites.md) | orchestrator | scratch oracle sweep dirs, clone `docs-site` output, journal | T2 | [x] |

The two tasks write disjoint paths in the clone: T3 writes `test/golden/refs/**` and `src/**` (only through
`melk:generate`), while T4 writes `$R/oracle/sweep/**`, `$R/oracle/census/**` and build output. T4's TS sweep reads
nothing T3 writes.
