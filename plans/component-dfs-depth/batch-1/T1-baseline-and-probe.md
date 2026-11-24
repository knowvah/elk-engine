<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: probe harness and baseline measurements

**Agent:** orchestrator. **Budget:** 75 min wall (mostly the JVM grid). **Commit:** none (journal rows land with T4).

## Context

Issue #70's table was measured once by mission 8b's T12 with a scratch probe. Only its shape survives (journal row 71).
D1, D5 and D6 need recorded numbers, and #67's journaled harness covers most of the work.

## Task

1. Build the D6 harness under `$TMPDIR/component-dfs-depth/probe/` from the text in
   `plans/tree-recursion-depth/decision-journal.md` § Scratch harness:
   - `gen.mts <alg> <shape> <depth> <out.json>`: `alg` is `force`, `stress` or `disco`, and the root `algorithm` is
     `org.eclipse.elk.force`, `.stress` or `.disco`. Nodes are 10 × 10, with preset `x = 20·i`, `y = 0`. A path is
     `n0 -> n1 -> …`. A caterpillar is a spine `s_i` with one leaf `l_i` per spine node, each leaf at `y = 40`. Force sets
     `org.eclipse.elk.force.iterations = 1`; stress sets `org.eclipse.elk.interactive = true` and
     `org.eclipse.elk.stress.iterationLimit = 1`; disco keeps its defaults. Check the option ids against
     `src/alg/force/options/*Options.ts`. Ids are stable so runs compare.
   - `ts-run.mts`, `compare.mts`, `ts.sh`, `oracle.sh`, `grid.sh`: as journaled, with paths renamed. `ts-run.mts` already
     calls `layoutToJson`, which registers force, stress and disco (`tools/corpus/ts-layout-pipeline.ts:90-99`).
   - Smoke run: each algorithm on a 2,000 path, TS `ok`, oracle `ok`, `equal at 1e-6`.
2. Oracle grid (D1): two cold runs per algorithm on the path at 16,000, 24,000, 32,000, 48,000 and 64,000, ascending. Check
   `uptime` before each JVM and wait while it is above 12. Run under `nice -n 10`, detached and polled (queue rules). Record
   time and status per depth. A heap exhaustion or timeout is journaled as not a stack result (stop 2). Estimate the stress
   heap first (n² doubles), and push forward on dropping depths above 48 GB. Then run the caterpillar once at each
   `D_oracle(alg)`.
3. TS brackets on the unconverted port (default stack, JIT): the path at 4,000, 8,000, 12,000 and 16,000. Record the first
   overflow depth and the repeating `src/alg/` frame per algorithm, and compare them with #70's table. A difference is
   journaled, not a stop.
4. D5 references: `git archive <base> src tools test package.json tsconfig.json` into `$TMPDIR/component-dfs-depth/base` with
   `node_modules` linked. Run the path and the caterpillar of each algorithm at `D_oracle(alg)` with a raised stack (D5).
   Keep the outputs under `$TMPDIR/component-dfs-depth/ref/` with their `shasum`. Compare each with the oracle at 1e-6, the
   pre-existing divergence check of stop 2.
5. Journal: the changed harness scripts verbatim, both grid runs, the TS brackets, the D5 stack and heap settings and hashes,
   and the pre-existing-divergence result. Also journal
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.{force,disco} plugins/org.eclipse.elk.core`
   (empty at planning).
6. Mark batch 1 `[x]` in the README.

## Read-set

[decisions.md](../decisions.md) D1, D5, D6; `gh issue view 70 --comments`;
`plans/tree-recursion-depth/decision-journal.md` lines 9-20 and 41 to the end; `tools/oracle/run.sh:1-20`;
`tools/corpus/ts-layout-pipeline.ts:85-107`; `test/golden/compare-json.ts`; `.agent-notes/tree-recursion-depth.md`.

## Write-set

`plans/component-dfs-depth/decision-journal.md`, the README batch table and `$TMPDIR/component-dfs-depth/**`.

## Acceptance criteria

- Given two cold oracle runs, when T1 ends, then the journal holds `D_oracle` for force, stress and disco and the raw status
  of every depth.
- Given the base sha, when the TS brackets run, then each algorithm's first overflow depth and frame are journaled.
- Given the raised stack, when the unconverted port runs at `D_oracle`, then six reference outputs (3 algorithms × path and
  caterpillar) exist with hashes, each compared with the oracle at 1e-6, and the result is journaled.
- Given the harness, when T1 ends, then its changed text is in the journal and no harness file lies under the repository.

**Observability:** N/A. No new observable operations. **Rollback:** Reversible. Nothing is committed.
