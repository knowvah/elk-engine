<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decision journal: component-dfs-depth (issue #70)

| Date | Task | Kind | Entry |
| ---- | ---- | ---- | ----- |
| 2026-11-24 | plan | baseline | Base `687ae7ba`, branch `chore/issue-queue`, tree clean apart from the brief. Planning ran the scoped baseline: `npm run typecheck` 0, `npm run format:check` 0, `npx vitest run src/alg/force src/alg/disco test/helpers/force-replay-dump.test.ts` 264 of 264 passed. The full gates 1-7 were green at `687ae7ba` and `63fa9aa4` (their commit bodies: coverage 1,212 files, 50,569 tests at `63fa9aa4`). Oracle `oracle-build.json`: `8bca22f4` + 0001-0004, built 2026-11-21T05:47:58Z. `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.{force,disco} plugins/org.eclipse.elk.core` is empty. Machine: 96 GB, 12 cores, `ulimit -s` 8176 KB, Node 26.3.1. |
| 2026-11-24 | plan | note | `next` resolved to #70. #66 and #67 carry `queue:ready` with `queue:on-branch`, so they were skipped as landed. The ruling for #70 is the maintainer's comment of 2026-11-23, "yes, so long as results stay the same" (D0). #167 (`needs-ruling`, the depth check) is related but does not block (D7). |
| 2026-11-24 | T1 | start | Brief committed as `825819ee` (`docs(plans): add component-dfs-depth mission brief`); squash base `687ae7bae04f665115682cd1470a523a61ea91e3` (named by the driver). Oracle `oracle-build.json`: `8bca22f4` + patches 0001-0004, built 2026-11-21T05:47:58Z, equal to `tools/oracle/ELK_COMMIT` and `tools/oracle/patches/`; no rebuild. `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.{force,disco} plugins/org.eclipse.elk.core` is empty. Node 26.3.1, `ulimit -s` 8176 KB, JVM 21.0.1 `ThreadStackSize` 2048 KB, `MaxHeapSize` 24 GiB (ergonomic). Baseline not rerun (base unchanged). |
| 2026-11-24 | T1 | plan | Execution plan (parallelism rule, autonomous): T1, T4, T5 by the orchestrator; T2 and T3 as two parallel foreground `claude` subagents (opus), write-sets disjoint per bundle, started once the harness smoke run passed and while the oracle grid ran detached; the orchestrator reviews and commits each site. Headless session, so both subagents ran in the foreground. |
| 2026-11-24 | T1 | harness | D6 harness built under `$TMPDIR/component-dfs-depth/probe/` as a copy of #67's (`$TMPDIR/tree-recursion-depth/probe/` still existed and equals the journaled text); the changed and new scripts are in the section [Scratch harness](#scratch-harness-d6) below. Smoke on 2,000-node paths: force TS `ok` 0.9 s, oracle `ok`, `equal at 1e-6`; stress TS `ok` 1.9 s, oracle `ok`, `equal at 1e-6`; disco TS `ok` 0.3 s, oracle `ok`, and one diff, `layoutOptions.debug.discoGraph` (`...DCGraph@71141838` against `[object Object]`). That is the classified options-only difference of issue #71 item 1 (`docs/conformance.md`, `tools/corpus/ts-layout-classify.ts:190-216`), not a finding of this mission: `compare.mts` now calls the sweep's own `neutraliseIdentity` on both sides before `compareLayout`, as the sweep and the goldens test do, and disco is then `equal at 1e-6`. Nothing of the harness is in the repository. |
| 2026-11-24 | T1 | measure | Oracle grid, D1 as written (`grid.sh run1` and `run2`: one cold JVM per algorithm, the path at 16,000, 24,000, 32,000, 48,000, 64,000 in ascending order, default heap, load at JVM start 3.3 to 9.4). **force:** `StackOverflowError` at all five depths in both runs (0.3 to 0.6 s each). **stress:** `StackOverflowError` at all five depths in both runs (0.3 to 0.9 s; the search runs before the n x n matrices are allocated, so no heap result arose). **disco:** run 1 and run 2 alike: 16,000, 24,000, 32,000 `ok` (1.0 to 1.4 s); 48,000 and 64,000 `StackOverflowError`. Raw rows: `$TMPDIR/component-dfs-depth/grid-fd.log`, `grid-2.log`. |
| 2026-11-24 | T1 | decision | **Stop 6 on D1, pushed forward (grid refinement, a listed push-forward).** D1 took #70's "the oracle completes 16,000" as a property of a cold JVM and put the grid's lowest depth there. A cold JVM does not lay out a 16,000-node force or stress path: it throws in `ComponentsProcessor.dfs` before the JIT has compiled the recursion, as #67 found for the trees (`.agent-notes/tree-recursion-depth.md`). #70's number came from a JVM that had already run shallower paths (T12 probed 2,000 first). D1's definition is kept (`D_oracle` is the highest depth the oracle completed in any run); the runs gain warm-up ladders, one JVM over ascending depths from 2,000. No write-set or expected value changes. |
| 2026-11-24 | T1 | measure | Oracle warm-up ladders (one cold JVM each, ascending, default heap). **force path:** `warm1` and `warm2` (2,000 to 16,000 step 2,000, then 20,000, 24,000, 32,000, 48,000, 64,000): `ok` through 16,000 (0.5 s to 14.8 s), `StackOverflowError` from 20,000 up, in both; `fine1` (2,000 to 24,000 step 1,000): `ok` through 16,000, `StackOverflowError` at 17,000 and every depth above. **stress path:** `warm1` (2,000 to 16,000 step 2,000, then 20,000, 24,000, 32,000; `ELK_SWEEP_TIMEOUT_MS=3600000`): `ok` through 16,000 (1.8 s at 2,000, 38 s at 8,000, 320 s at 16,000, about cubic), `StackOverflowError` at 20,000, 24,000, 32,000. **disco path:** `fine1` (16,000, 24,000, 32,000, 36,000, 40,000, 44,000, 48,000): 16,000 and 24,000 `ok`, 32,000 `StackOverflowError`, 36,000 and 40,000 `ok`, 44,000 and 48,000 `StackOverflowError`: not monotone, the same JIT effect. |
| 2026-11-24 | T1 | decision | **`D_oracle`: force 16,000, stress 16,000, disco 40,000** (the highest depth completed in any run). Force and stress agree with #70's single measurement; disco's bar is above D1's grid result (32,000 in both cold runs) because the refinement completed 40,000. One warm ladder was run for stress, not two (13 minutes of JVM each); its bar equals force's, whose three ladders agree, and both run the same `ComponentsProcessor.dfs`. Stress heap: `StressMajorization` holds two n x n `double` matrices (`StressMajorization.java:88, 94`), 16 n² bytes: 4.1 GB at 16,000 nodes, 16.4 GB at 32,000 (the caterpillar at 16,000), 36.9 GB at 48,000, 65.5 GB at 64,000. D1's estimate counted one matrix. No depth had to be dropped for the heap, because stress's stack limit (16,000) lies below every depth the 24 GiB default heap could not hold. |
| 2026-11-24 | T1 | measure | Oracle caterpillars at `D_oracle` (`SHAPE=caterpillar grid.sh cat1`, a warm ladder of caterpillars in one cold JVM). force: 2,000 to 16,000 step 2,000 all `ok` (1.2 s to 122 s). disco: 16,000, 24,000, 32,000, 36,000, 40,000 all `ok` (1.9 s to 5.6 s). stress (`oracle-mixed.sh scat1`): the n³ cost rules out a ladder of stress caterpillars (about 2.3 h), so the JVM is warmed with the force path ladder 2,000 to 16,000 (the same `ComponentsProcessor.dfs`, 43 s in all) and then runs the stress caterpillar at 16,000 (32,000 nodes); result in the T4 `evidence` row. |
| 2026-11-24 | T1 | measure | TS brackets, unconverted port (the base snapshot, `git archive 687ae7ba src tools test package.json tsconfig.json` into `$TMPDIR/component-dfs-depth/base` with `node_modules` linked), default stack, JIT, path. force: `ok` at 2,000 and 4,000 (2.9 s); `RangeError` at 6,000, 8,000, 12,000, 16,000, repeating frame `ComponentsProcessor.dfs` (`ComponentsProcessor.ts:131`, the target-side call). stress: `ok` at 2,000 and 3,000; `RangeError` at 4,000, 8,000, 12,000, 16,000, the same frame. disco: `ok` at 2,000, 4,000, 6,000; `RangeError` at 8,000, 12,000, 16,000, repeating frame `ElkGraphComponentsProcessor.dfs` (`ElkGraphComponentsProcessor.ts:274`). Against #70's table (TS completes 4,000 and overflows at 16,000 for all three): the brackets are narrower (first overflow at 6,000, 4,000 and 8,000), and stress overflows at 4,000 where #70 had it complete; the innermost frame at overflow varies (`dfs` itself, `FGraph.getNodes`, a label `push`). Journaled, not a stop. |
| 2026-11-24 | T1 | measure | D5 references: the unconverted port (base snapshot) at `D_oracle` with `node --stack-size=7000` (under `ulimit -s` 8176; no `Worker` was needed). sha1: disco path 40,000 `dbedf0e14c0f80a95bcdcbe61eb8e957fde74b59` (5.6 s), disco caterpillar 40,000 `bd8f8feb25c9bfc6eec3af1e9acfc0f60c00629a` (13 s), force path 16,000 `8e58d8943785dd2b371b79b7b54b86b1adccf7c2` (132 s), force caterpillar 16,000 `ed88f986a49cd53d9536beede9b018f4bc7407c7` (618 s, with `--max-old-space-size=16000`); also disco path 32,000 `5aa804bc249fa0af989206b498a756f643b25ac9`, the D1 grid's own result. Each equals the oracle's output at 1e-6 (`compare.mts` against `fine1`, `cat1`, `warm1`, `run1`); the force path is even byte-identical to the oracle's file in all three ladders. No pre-existing divergence: stop 2 does not apply to force or disco. The stress references are in the T4 `evidence` row. |
| 2026-11-24 | T1 | divergence | The first force caterpillar runs at 16,000 (32,000 nodes), base and converted alike, died after 5 s with `JavaScript heap out of memory` at V8's 4 GB default. **Mechanism:** `FGraph.calcAdjacency` allocates an n x n adjacency matrix; the port's rows are `number[]`, 8 bytes per element, so 32,000 nodes need 8.2 GB, where the Java's `int[n][n]` needs 4.1 GB inside the JVM's 24 GiB default heap. **Origin:** `src/alg/force/graph/FGraph.ts:104` (`FGraph.java:118`). **Causal chain:** the allocation precedes the layout and exceeds the default old space; the process aborts in `Array.from`. **Ruled out:** the stack (the native trace shows `Builtins_ArrayFrom` under the allocation, no `dfs` frame, and the same run completes with `--max-old-space-size=16000` on the default stack); the conversion (the base snapshot dies the same way). Not a stack result (D1, stop 2): both runs carry the heap flag, which T4 step 1 allows for stress and which is the same kind of setting. The stress path at 16,000 needs it too (two n x n matrices, 4.1 GB). The port's memory cost against the JVM's is in the close-out follow-up. |
| 2026-11-24 | T1 | gate | T1 acceptance: `D_oracle` per algorithm and the raw status of every depth journaled (two cold D1 runs and the ladders); TS brackets and frames journaled; references with hashes, each compared with the oracle (stress pending in T4, its runs take over an hour); harness text below; `git status` shows no harness file. Batch 1 `[x]`. T1 took about 30 minutes of wall time for force and disco; the stress runs continue in the background under T4. |
| 2026-11-24 | T2 | report | Force (subagent, opus, 4.4 of 45 minutes; commit `b4ade951`). `ComponentsProcessor.dfs` (`ComponentsProcessor.java:130-155`) is a loop over `DfsFrame`s (node, `last`, component, the live iterator over the incidence `LinkedList`, the current edge, a `DfsStep` of `SOURCE`, `TARGET`, `ADD`); `openDfs` is one activation's entry (mark, create the component only when `graph` is null, add the node, push, `checkStackDepth(stack.length)`), `nextDfsCall` runs the loop body to the next call; `DfsSearch` bundles `visited`, `incidence` and the stack for the 5-parameter limit. Name, signature, return value and `@see` unchanged; no catch. Test `ComponentsProcessor.explicit-stack.test.ts`: the verbatim twin installed on the instance and called through `split`; 60 seeded graphs (path, cycle, tree, forest, random; 1 to 30 nodes; random directions, parallel edges either way, self-loops, 0 to 2 labels, shuffled edge order) equal in component order, node, edge and label order and identity, renumbered ids and copied properties; a mix check; `SEPARATE_CONNECTED_COMPONENTS` false leaves `dfs` uncalled; the 20,000-node path was red before the conversion (`RangeError` at `ComponentsProcessor.ts:109`) and is green after, the twin overflows there (the B8 pattern); `MAX_STACK_DEPTH + 2` throws `RangeError(STACK_OVERFLOW_MESSAGE)` in 59 ms. `npx vitest run src/alg/force`: 19 files, 246 tests passed. `--jitless`: 64 of 64. Typecheck, prettier, complexity clean (the report's only lines are the two landed AST-only notes). Orchestrator's review: the loop read against the Java line by line; one assertion added to the deep case before the commit, read off the Java (nodes in path order, edges in reverse input order: `:139` adds the node on the way down, `:151` the edge on the way back); green. |
| 2026-11-24 | T3 | report | Disco (subagent, opus, 5 of 45 minutes; commit `7bace6a4`). `ElkGraphComponentsProcessor.dfs` (`ElkGraphComponentsProcessor.java:207-217`) is a loop over `DfsFrame`s (the node and the live iterator over its incidence `Set`, `null` when the node has no entry); `openDfs` pushes to `visited` and `component`, pushes the frame and calls `checkStackDepth(stack.length)`; `nextDfsCall` advances the iterator and runs `visited.includes` when the iterator reaches a neighbour, never at push time. Static fields, name, signature and `@see` unchanged; no catch. Test `ElkGraphComponentsProcessor.explicit-stack.test.ts`: the verbatim twin over the same static fields, swapped in with `vi.spyOn` and called through `split`; 80 seeded graphs (path, cycle, forest, dense, sparse; ports on 30 % of edge ends; self-loops, parallel edges, port-to-port edges, a port of the graph joining three children, child-to-graph, hierarchy-crossing and outside edges; a hyperedge every 8th seed), 70 complete and 10 throw the Java's `IllegalArgumentException` on both sides, equal in component order, node order and identity and the final `visited`; a triangle case whose order (`[a, b, c]`, read off the Java) a push-time test would get wrong; the 20,000-node path was red before (`RangeError`) and is green after in 0.3 s, the twin overflows there; `MAX_STACK_DEPTH + 2` throws in 2.6 s, so it is kept. `npx vitest run src/alg/disco`: 11 files, 151 tests passed. `--jitless`: 84 of 84. Typecheck, prettier, complexity clean. Orchestrator's review: the loop read against the Java; `npx vitest run src/alg/force src/alg/disco test/helpers/force-replay-dump.test.ts` 412 of 412 passed (264 at planning plus 148 new), the landed replays unchanged. |
| 2026-11-24 | T4 | evidence | Final runs on the converted port (commits `b4ade951`, `7bace6a4`), Node's default stack, through `ts.sh` (no stack flag; a heap flag where noted). **disco, 40,000:** path `ok` 5.9 s, caterpillar `ok` 13 s. **force, 16,000:** path `ok` 111 s, caterpillar `ok` 609 s (`--max-old-space-size=16000`). **stress, 16,000:** path `ok` 590 s (`--max-old-space-size=12000`). Each is `cmp`-identical to its D5 reference (stress path reference: base snapshot, `--stack-size=7000 --max-old-space-size=12000`, 584 s, sha1 `f6435561c1a0249a345076713f29ad386c7744f4`) and `equal at 1e-6` to the oracle's output (disco `fine1` and `cat1`, force `warm1` and `cat1`, stress `warm1`). Also disco path 32,000 (the D1 cold grid's depth): `ok` 4.4 s, `cmp`-identical, equal to `run1`. No run overflowed, so D2 names no further site and stop 8 did not fire. The oracle is faster at depth: force path 13 s, force caterpillar 122 s, stress path 320 s (close-out follow-up). |
| 2026-11-24 | T4 | evidence | Corpus sweep, converted against unconverted (`npx tsx tools/corpus/ts-layout-compare.ts --algorithms force,stress,disco --shards 4`, on the worktree and on the base snapshot with `ELK_MODELS_DIR` and `ELK_ORACLE_DIR` set; not asked by the brief, the #67 precedent): force 817 `ok`, 89 `both-throw`; stress 809 `ok`, 89 `both-throw`; disco 819 `ok`, 87 `both-throw`; 0 `mismatch`, 0 `ts-only-throw`, 0 `oracle-only-throw`, 0 `ts-aborted`, `findings=0`, on both sides. All 2,710 cases have the same category and detail before and after (`$TMPDIR/component-dfs-depth/sweep/{before,after}.json`). |
| 2026-11-24 | T4 | note | Java line ranges. The brief gives the force `dfs` as `ComponentsProcessor.java:130-155` and the disco one as `ElkGraphComponentsProcessor.java:207-217`; the methods end at `:157` and `:219` (`grep -n` on the pinned source). The new comments, test headers and docs say `130-157` and `207-219`; the T2 and T3 rows above keep the brief's numbers as the subagents reported them. D3's "edge and labels pushes (`:152-153`)" are `:151-152`. Comment-only edits after the two site commits, with the docs commit; `npx vitest run` of the two new files: 148 of 148. |
| 2026-11-24 | T5 | gate | Gate 4, first run, aborted by the orchestrator (not a result). `npm run coverage` was started detached at load 88 while the stress caterpillar runs and three other queue sessions (plantuml, dot) were running; the 1-minute load reached 237 on 12 cores. Four tests had failed when it was stopped: `src/alg/spore/ElkGraphImporter.test.ts` and `SporeLayoutVectors.test.ts` `full/overlap/chain2000/default` (61.3 s and 61.2 s, explicit 60 s timeout), `NetworkSimplexTest.test.ts` `testDeltas` (5.13 s, default 5 s) and `DiscoVectors.test.ts` "iterates the maps in the insertion order the oracle recorded" (5.06 s). **Mechanism:** wall-clock test timeouts under CPU oversubscription; each duration sits just above its timeout. **Origin:** vitest's per-test timeout (`testTimeout` default 5 s; the 60 s of the whole-ref loops). **Causal chain:** about 20 runnable processes per core stretch a 1 s test past 5 s. **Ruled out:** an assertion failure and this mission's change: the four files, rerun alone at load 40 to 75, pass (`NetworkSimplexTest` and `DiscoVectors` 15 of 15; the two spore files 475 passed, 1 skipped); none of the three other files imports force or disco code, and `DiscoVectors` passed in every bundle run. No timeout was raised. The run was killed (its own three processes, by pid) to give the CPU back; log `coverage-logs/coverage-20261124-004249-99367.log`. Gate 4 is rerun once the mission's own heavy runs have ended. |
| 2026-11-24 | T5 | gate | Gate 4, second run (detached, `nice -n 10`, started at load 33; the load rose to 171 during it, the other queue sessions again): exit 1, `coverage gate: test failures`; 1,214 files, 1,213 passed; 50,717 tests passed, 1 failed, 83 skipped; 1,113 s; log `coverage-logs/coverage-20261124-010749-14012.log`. The one failure: `test/corpus/phase-sweep.test.ts` "every case matches the oracle", `Error: Test timed out in 900000ms`, after it had printed `phase sweep: cases=32652 checked=15101 mismatches=0 throws-checked=1320`. **Mechanism:** the layered phase sweep took 1,086 s of wall time under the load and passed its explicit 900 s timeout; it has no mismatch. **Origin:** `test/corpus/phase-sweep.test.ts:94` (the timeout argument). **Causal chain:** the whole suite takes 634 to 762 s on a quieter machine (the two logs of 2026-11-23), so the sweep normally ends inside its limit; at 14 runnable processes per core it does not. **Ruled out:** this mission's change (the sweep is layered only; `alg.layered` imports neither force nor disco, and it reports 0 mismatches); a wrong result. The four timeouts of the first run did not recur. No timeout raised; a retry, not a fix (the 2-fix cap counts edits). The disco FD4 twin's timeout is issue #164 already. |
| 2026-11-24 | T5 | gate | Gate 4, third run (detached, `nice -n 10`, started at load 21, which rose to 203 within seven minutes): exit 1; 1,214 files, 1,212 passed; 50,716 tests passed, 2 failed, 83 skipped; 1,096 s; log `coverage-logs/coverage-20261124-012645-26908.log`. Both failures are the timeouts already diagnosed: `test/corpus/phase-sweep.test.ts` (`Test timed out in 900000ms`, 1,071 s, 0 mismatches printed) and `src/alg/spore/ElkGraphImporter.test.ts` `full/overlap/chain2000/default` (`Test timed out in 60000ms`, 61.3 s). An attribution of the processes above 5 % CPU during the burst: this mission's own vitest workers (12), its three stress-caterpillar runs (a JVM with a 17 GB heap and two node processes with 28 GB heaps, each with collector threads), and the test runs of two other queue sessions (plantuml 6, dot 5). **Decision:** no further retry while the mission's own long runs are alive; gate 4 is rerun after them, on a machine checked with `uptime` first. Nothing is changed to get green (AD-13: no timeout raised, no case skipped). |
| 2026-11-24 | T5 | gate | Gate 4, fourth run (detached, `nice -n 10`, started at load 35 after the mission's own probe runs had ended; the load reached 181): exit 1; 1,214 files, 1,210 passed; 50,714 tests passed, 4 failed, 83 skipped; 1,064 s; log `coverage-logs/coverage-20261124-020202-55376.log`. All four are `Test timed out` errors and all four were seen before: the phase sweep (900 s limit, 1,032 s), the spore `chain2000` row (60 s, 67 s), `NetworkSimplexTest` `testDeltas` and the disco FD4 twin (5 s, 5.4 s each). So the mission's own probe runs were not the cause. Measured with nothing of this mission running: `top` shows 7 % idle on 12 cores (8 performance, 4 efficiency), with five test workers of the dot-engine queue session at 100 % each and `nice` 0, and Spotlight's `mds` at 108 %. **Mechanism, refined:** the suite runs at `nice` 10 against other sessions' suites at `nice` 0 on a saturated machine, so its workers get the smaller share; the phase sweep, which its own header puts at about 5 minutes, takes 17 to 18. Yesterday's green runs (634 s and 762 s for the whole suite) met no such contention; a run of 2026-11-23 16:39 failed the same way (phase sweep 935 s, log `coverage-20261123-163956-90722.log`). **Decision:** the fifth run is started without `nice`, so that the suite competes at the priority its timeouts were set for. This departs from T5's `nohup nice -n 10` and from the template of the queue rules, whose load rule (wait above 12, `nice -n 10`) names JVM sweeps and recorders; journaled as a deviation. No timeout raised, no test touched. |
| 2026-11-24 | T5 | gate | Gate 4, fifth run (detached, no `nice`, started at load 42): exit 0, `coverage gate: ok`; 1,214 files passed; 50,718 tests passed, 83 skipped; 98.81 / 97.01 / 98.57 / 98.86 statements / branches / functions / lines; 718.6 s; log `coverage-logs/coverage-20261124-022046-70711.log`. Against the base (1,212 files, 50,570 tests, log `coverage-20261123-233920-33395.log`): two files and 148 tests more, the two `*.explicit-stack.test.ts` (64 and 84). The same tree as runs two to four (source unchanged since the comment edit before the first run), so the four runs before it failed on scheduling alone. |
| 2026-11-24 | T4 | evidence | Stress caterpillar. **At 16,000 (32,000 nodes):** converted port `ok` 4,671 s on the default stack (`--max-old-space-size=28000`), `cmp`-identical to the D5 reference (base snapshot, `--stack-size=7000 --max-old-space-size=28000`, 4,660 s, sha1 `bd2cbc7580ecb60a2cc5622311545e2665f5ba0c`). The oracle (`scat1`: warmed by the force path ladder, then the stress caterpillar, default heap) did not throw in the search and was ended by the probe's limit after 90 minutes of wall time (`"status":"timeout","ms":5400010`), about 62 minutes of CPU on a machine at load 20 to 240. A timeout is not a stack result (D1, stop 2). **At 8,000 (16,000 nodes), added as a depth the oracle finishes quickly:** oracle `ok` 497 s (`scat8`, warmed by the force path ladder to 8,000), converted port `ok` 507 s, reference `ok` 506 s (sha1 `1fe6ae7432bdcca03e187310152ca8032f62b95d`), `cmp`-identical, both `equal at 1e-6` to the oracle; the unconverted port on the default stack throws `RangeError` in `ComponentsProcessor.dfs` there. With the machine quiet again (load 7), the 16,000 case was started once more with a 3-hour limit (`scat2`); its result is in the next T4 row. |
| 2026-11-24 | T4 | docs | `docs/architecture/alg-force-disco.md`: § 5 keeps the T12 probe and its table as history and adds the ruling, the measured depths (cold and warmed), the two sites with their frames and test files, the result per algorithm, the sweep, the heap note and the depth check; the "maintainer's call" sentence is replaced; § 7's recursion row is replaced by one row for #170 and #167; the contents rows of § 5 and § 7 follow. `docs/conformance.md`: the AC6 bullet points at § 5, the FD7 bullet and the stack-depth bullet state the conversion and the result. `plans/alg-force-disco/decision-journal.md`: one closing row appended (`#70`, `close`). The translated `docs-site/` pages are out of scope (#133). |
| 2026-11-24 | T4 | issue | #167: comment naming the two new `checkStackDepth` call sites (`src/alg/force/ComponentsProcessor.ts:180`, `src/alg/disco/transform/ElkGraphComponentsProcessor.ts:302`), that both stop on visited marks, and the measured oracle depths (https://github.com/knowvah/elk-engine/issues/167#issuecomment-7125510184). Filed #170 (`follow-up`, not `queue:ready`): heap and time at depth (the force adjacency matrix at 8 bytes per element against the Java's 4, the two stress matrices against V8's 4 GB default, the port up to 8 times slower on the force shapes), with three questions. No `needs-ruling` issue: nothing waits on a ruling, and no algorithm is a partial. |
| 2026-11-24 | T4 | gate | T4 acceptance: six final runs `ok` on the default stack and byte-identical to their references; five equal the oracle at 1e-6, the stress caterpillar journaled with its oracle timeout and the 8,000 case (D1: the path decides); the docs no longer say the searches are verbatim or that TS overflows at 16,000; #167 carries the comment. Budget (stop 7): T1 and T4 together ran from 00:04 to 02:40 against 135 planned minutes, the stress shapes and the load being the difference; nothing was cut. |
| 2026-11-24 | T5 | gate | Queue gates on the final tree. 1 `npm run format:check`: exit 0, "All matched files use Prettier code style!". 2 `npm run typecheck`: exit 0. 3 `npm run complexity`: report read, no violation; its only lines are the two "measured by AST only" notes in `src/graph` (`ElkGraphReferences.ts:113`, `ElkGraphUtil.ts:172`), inside the limits and untouched. 4 `npm run coverage`: exit 0 in the fifth run (rows above); the docs, `plans/` and notes edited after it are covered by `npx vitest run test/docs test/architecture test/public-api test/release` (the suites that read those files): 25 files, 1,162 tests passed. 5 `npm run docs:build`: exit 0, "build complete". 6 `npm run codeql`: exit 0, "codeql: ok, every finding is accepted"; no new entry in `tools/codeql/accepted.json` (run on the final source; only Markdown changed after it). 7 `git diff --exit-code 687ae7ba -- test/golden/refs/`: exit 0, no ref touched; no recorder or regen input changed, so none was rerun. |
| 2026-11-24 | T5 | note | Write-set: everything written is inside the brief's table (the two sources, the two new tests, the two docs, the one 8b row, the roadmap section, the notes, this directory). No write outside the worktree except scratch under `$TMPDIR/component-dfs-depth/`, the oracle's own harness-class cache through `tools/oracle/run.sh`, and the two `gh` calls above. The corpus sweep read `~/git/knowvah/elk-oracle/sweep/` and wrote only its `--out` file under `$TMPDIR`. |
| 2026-11-24 | T4 | evidence | Stress caterpillar at 16,000, second oracle run (`oracle-mixed.sh scat2`, `ELK_SWEEP_TIMEOUT_MS=10800000`, started at load 6.7 and quiet throughout: the force path ladder 2,000 to 16,000 `ok`, then `{"id":"stress-caterpillar-16000","status":"ok","ms":4161413}`, 69 minutes). The converted port's output and the D5 reference (sha1 `bd2cbc75…`) are both `equal at 1e-6` to it. **All six shapes are done (D1, D5):** path and caterpillar of force (16,000), stress (16,000) and disco (40,000) complete on the default stack, equal the oracle at 1e-6 and are `cmp`-identical to the unconverted port on a raised stack. Stops 2, 3 and 8 do not apply. The `scat1` timeout was the probe's limit on a loaded machine. The docs, the roadmap section, the 8b closing row, the summary and the notes written an hour earlier for the timeout state were corrected to this result before the squash (commit after `3f4ccdf8`). |
| 2026-11-24 | T5 | gate | After the Markdown corrections of the last T4 row (no source or test file changed): `npm run format:check` exit 0; `npm run docs:build` exit 0, "build complete"; `npx vitest run test/docs test/architecture test/public-api test/release` 25 files, 1,162 tests passed; `git diff --exit-code 687ae7ba -- test/golden/refs/` exit 0. Gates 2, 3, 4 and 6 stand as journaled: `git diff 3f4ccdf8 --stat` names only `.md` files. |
| 2026-11-24 | T5 | close | Roadmap revision appended (`## Revision 2026-11-24 (component-dfs-depth)`); `.agent-notes/component-dfs-depth.md` written; README summary written; batches 1 to 3 `[x]`. Follow-up #170; comment on #167; no `needs-ruling`, no partial, no halt. Tag `component-dfs-depth/pre-squash` on the last per-task commit, then `git reset --soft 687ae7bae04f665115682cd1470a523a61ea91e3` and one commit, `Refs: #70`, no `Closes`, no attribution lines (queue rule). Not pushed. Per-task commits under the tag: `825819ee` brief, `b4ade951` force, `7bace6a4` disco, `73b91a9b` docs, `3f4ccdf8` close-out, `0a4a9495` the correction after the second oracle run, and two small commits after it (a tidy of the doc table and wrapping, and this row). |


## Scratch harness (D6)

Under `$TMPDIR/component-dfs-depth/probe/`; never committed. It is #67's harness
(`plans/tree-recursion-depth/decision-journal.md` § Scratch harness): `ts-run.mts`, `ts.sh` and `oracle.sh` are unchanged from
that text and not repeated here; the scripts below are changed or new. `REPO` is the checkout whose `src/` runs (default the
queue worktree); the D5 references set it to the `git archive` snapshot of the base under `$TMPDIR/component-dfs-depth/base`.
Outputs: `in/` (inputs), `oracle/<run>/`, `out-ts/` (converted port), `out-base/` (TS brackets), `ref/` (D5), `sweep/`.

### `gen.mts`

```ts
// gen.mts <alg> <shape> <depth> <out.json>: a deep path or caterpillar as ELK JSON (D6, component-dfs-depth).
// alg: force | stress | disco; shape: path | caterpillar. Nodes 10 x 10, preset x = 20*i, y = 0 (leaves y = 40).
// Options (D1, the T12 shape): force iterations = 1; stress interactive = true and iterationLimit = 1; disco defaults.
import { writeFileSync } from 'node:fs';

const [alg, shape, depthArg, out] = process.argv.slice(2);
const depth = Number(depthArg);
const OPTIONS: Record<string, Record<string, unknown>> = {
  force: { 'org.eclipse.elk.force.iterations': 1 },
  stress: { 'org.eclipse.elk.interactive': true, 'org.eclipse.elk.stress.iterationLimit': 1 },
  disco: {},
};
if (!(alg !== undefined && alg in OPTIONS) || !['path', 'caterpillar'].includes(shape ?? '')) {
  throw new Error('usage: gen.mts <force|stress|disco> <path|caterpillar> <depth> <out.json>');
}
if (!Number.isInteger(depth) || depth < 1 || out === undefined) throw new Error('bad depth or out');
const SIZE = 10;
const STEP = 20;
const LEAF_Y = 40;
const node = (id: string, x: number, y: number) => ({ id, x, y, width: SIZE, height: SIZE });
const edge = (id: string, s: string, t: string) => ({ id, sources: [s], targets: [t] });
const children: unknown[] = [];
const edges: unknown[] = [];
const spine = shape === 'path' ? 'n' : 's';
for (let i = 0; i < depth; i++) {
  children.push(node(`${spine}${String(i)}`, STEP * i, 0));
  if (i > 0) edges.push(edge(`e${String(i)}`, `${spine}${String(i - 1)}`, `${spine}${String(i)}`));
  if (shape === 'caterpillar') {
    children.push(node(`l${String(i)}`, STEP * i, LEAF_Y));
    edges.push(edge(`f${String(i)}`, `${spine}${String(i)}`, `l${String(i)}`));
  }
}
const layoutOptions = { 'elk.algorithm': `org.eclipse.elk.${alg}`, ...OPTIONS[alg] };
const graph = { id: 'root', layoutOptions, children, edges };
writeFileSync(out, JSON.stringify(graph) + '\n');
```

### `compare.mts`

```ts
// compare.mts <expected.json> <actual.json>: compareLayout at 1e-6 (AD-4); exit 1 on diffs. REPO = the checkout.
// Disco's `debug.discoGraph` identity toString is neutralised on both sides by the sweep's own `neutraliseIdentity`
// (ruling on #71 item 1, tools/corpus/ts-layout-classify.ts:190-216); everything else is compared in full.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [expectedPath, actualPath] = process.argv.slice(2);
const repo = process.env['REPO'];
if (expectedPath === undefined || actualPath === undefined || repo === undefined) throw new Error('usage: REPO=<checkout> compare.mts <expected> <actual>');
const cmp = (await import(pathToFileURL(path.join(repo, 'test/golden/compare-json.ts')).href)) as {
  compareLayout: (e: unknown, a: unknown) => { ok: boolean; diffs: unknown[] };
  formatDiffs: (d: unknown[]) => string;
};
const classify = (await import(pathToFileURL(path.join(repo, 'tools/corpus/ts-layout-classify.ts')).href)) as {
  neutraliseIdentity: (e: unknown, a: unknown) => void;
};
const expected: unknown = JSON.parse(readFileSync(expectedPath, 'utf8'));
const actual: unknown = JSON.parse(readFileSync(actualPath, 'utf8'));
classify.neutraliseIdentity(expected, actual);
const result = cmp.compareLayout(expected, actual);
if (result.ok) {
  console.log('equal at 1e-6');
} else {
  console.log(`${String(result.diffs.length)} diffs\n${cmp.formatDiffs(result.diffs).slice(0, 4000)}`);
  process.exit(1);
}
```

### `grid.sh`

```bash
#!/usr/bin/env bash
# grid.sh <runName> <alg> <depth>...: the D1 oracle grid for one algorithm, one cold JVM over the path at the listed
# depths in ascending order, waiting for a 1-minute load below 12 first. JAVA_TOOL_OPTIONS (heap) passes through.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
run="$1"; alg="$2"; shift 2
shape="${SHAPE:-path}"
while :; do
  l=$(uptime | sed 's/.*load averages: //' | cut -d' ' -f1)
  [ "$(echo "$l < 12" | bc)" = 1 ] && break
  sleep 20
done
echo "# $run $alg $shape load $(uptime | sed 's/.*load averages: //') heap ${JAVA_TOOL_OPTIONS:-default}"
bash "$HERE/oracle.sh" "$run" "$alg" "$shape" "$@"
echo "# rc $?"
```

### `oracle-mixed.sh`

```bash
#!/usr/bin/env bash
# oracle-mixed.sh <runName> <alg>:<shape>:<depth>...: one cold JVM lays out the listed cases in order (a warm-up ladder
# of one algorithm, then the case of another that shares its recursion), after waiting for a 1-minute load below 12.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$HOME/git/knowvah/elk-engine-queue}"
run="$1"; shift
out="$HERE/../oracle/$run"
mkdir -p "$HERE/../in" "$out"
cases="$out/mixed.cases.jsonl"
: >"$cases"
cd "$REPO"
for spec in "$@"; do
  IFS=: read -r alg shape depth <<<"$spec"
  in="$HERE/../in/$alg-$shape-$depth.json"
  [ -f "$in" ] || node --import tsx "$HERE/gen.mts" "$alg" "$shape" "$depth" "$in"
  printf '{"id":"%s-%s-%s","input":"%s","mode":"layout"}\n' "$alg" "$shape" "$depth" "$in" >>"$cases"
done
while :; do
  l=$(uptime | sed 's/.*load averages: //' | cut -d' ' -f1)
  [ "$(echo "$l < 12" | bc)" = 1 ] && break
  sleep 20
done
echo "# $run mixed load $(uptime | sed 's/.*load averages: //') heap ${JAVA_TOOL_OPTIONS:-default}"
ELK_SWEEP_TIMEOUT_MS="${ELK_SWEEP_TIMEOUT_MS:-1200000}" nice -n 10 bash tools/oracle/run.sh --cases "$cases" "$out" 2>/dev/null
echo "# rc $?"
```

### `ts-grid.sh`

```bash
#!/usr/bin/env bash
# ts-grid.sh <alg> <shape> <depth>...: the TS bracket on the default stack (REPO = the checkout whose src/ runs).
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
alg="$1"; shape="$2"; shift 2
for depth in "$@"; do
  bash "$HERE/ts.sh" "$alg" "$shape" "$depth"
done
```

### Runs

```bash
P=$TMPDIR/component-dfs-depth/probe; T=$TMPDIR/component-dfs-depth
# D1 as written: two cold JVMs per algorithm
for r in run1 run2; do for a in force disco stress; do bash $P/grid.sh $r $a 16000 24000 32000 48000 64000; done; done
# warm-up ladders (the refinement)
for r in warm1 warm2; do bash $P/grid.sh $r force 2000 4000 6000 8000 10000 12000 14000 16000 20000 24000 32000 48000 64000; done
bash $P/grid.sh fine1 force $(seq 2000 1000 24000)
bash $P/grid.sh fine1 disco 16000 24000 32000 36000 40000 44000 48000
ELK_SWEEP_TIMEOUT_MS=3600000 bash $P/grid.sh warm1 stress 2000 4000 6000 8000 10000 12000 14000 16000 20000 24000 32000
# caterpillars
SHAPE=caterpillar bash $P/grid.sh cat1 force $(seq 2000 2000 16000)
SHAPE=caterpillar bash $P/grid.sh cat1 disco 16000 24000 32000 36000 40000
ELK_SWEEP_TIMEOUT_MS=5400000 bash $P/oracle-mixed.sh scat1 force:path:{2000,4000,6000,8000,10000,12000,14000,16000} stress:caterpillar:16000
# TS brackets on the base snapshot
for a in force disco stress; do REPO=$T/base OUT=$T/out-base bash $P/ts-grid.sh $a path 4000 8000 12000 16000; done
# D5 references (base snapshot, raised stack) and the final runs (worktree, default stack)
REPO=$T/base OUT=$T/ref bash $P/ts.sh disco path 40000 --stack-size=7000        # likewise disco caterpillar 40000, force path 16000
REPO=$T/base OUT=$T/ref bash $P/ts.sh force caterpillar 16000 --stack-size=7000 --max-old-space-size=16000
REPO=$T/base OUT=$T/ref bash $P/ts.sh stress path 16000 --stack-size=7000 --max-old-space-size=12000
REPO=$T/base OUT=$T/ref bash $P/ts.sh stress caterpillar 16000 --stack-size=7000 --max-old-space-size=28000
bash $P/ts.sh disco path 40000                                                  # likewise disco caterpillar, force path
bash $P/ts.sh force caterpillar 16000 --max-old-space-size=16000
bash $P/ts.sh stress path 16000 --max-old-space-size=12000
bash $P/ts.sh stress caterpillar 16000 --max-old-space-size=28000
REPO=$PWD node --import tsx $P/compare.mts $T/oracle/<run>/<case>.json $T/out-ts/<case>.json   # and against ref/
cmp $T/ref/<case>.json $T/out-ts/<case>.json
```
