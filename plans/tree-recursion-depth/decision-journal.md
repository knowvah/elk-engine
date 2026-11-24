<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decision journal: tree-recursion-depth (issue #67)

| Date | Task | Kind | Entry |
| ---- | ---- | ---- | ----- |
| 2026-11-23 | plan | baseline | Base `5782a87a`, branch `chore/issue-queue`, tree clean apart from the brief. `npm run format:check` 0, `npm run typecheck` 0, `npm run coverage` exit 0 (gate ok; 1,195 files passed; 49,611 tests passed, 83 skipped; 98.81 / 97.01 / 98.56 / 98.86 statements / branches / functions / lines; log `coverage-logs/coverage-20261123-194523-19579.log`), run at load 7-116 (another session). Oracle `oracle-build.json`: `8bca22f4` + 0001-0004, built 2026-11-21T05:47:58Z. |
| 2026-11-23 | plan | note | Selection: `next` resolved to #67. #66 is `queue:ready` and `queue:on-branch` (landed as `e30d1c5c`; the ready label was re-added at 21:48Z), so it was skipped as done. Ruling for #67: the maintainer's comment "again, yes, so long as results are the same" (D0). |
| 2026-11-23 | T1 | start | Brief committed as `9ad1a09d` (`docs(plans): add tree-recursion-depth mission brief`); squash base `5782a87adca0e884f531ce5004c7b49c15ad42c0` (named by the driver). Oracle `oracle-build.json`: `8bca22f4` + patches 0001-0004, built 2026-11-21T05:47:58Z, equal to `tools/oracle/ELK_COMMIT` and `tools/oracle/patches/`; no rebuild. `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.{mrtree,radial,vertiflex} plugins/org.eclipse.elk.core` is empty. Node 26.3.1, `ulimit -s` 8176 KB, JVM `ThreadStackSize` 2048 KB. Baseline not rerun (base unchanged). |
| 2026-11-23 | T1 | plan | Execution plan (parallelism rule, autonomous): T1 by the orchestrator; T3 and T4 as two parallel foreground `claude` subagents (opus, effort high) once their `D_oracle` was known; T2 as a third when the mrtree grid had a number; write-sets disjoint per bundle; the orchestrator commits. Headless session, so every subagent ran in the foreground. |
| 2026-11-23 | T1 | harness | D6 harness built under `$TMPDIR/tree-recursion-depth/probe/`; its text is in the section [Scratch harness](#scratch-harness-d6) below. Smoke: radial path 2,000, TS `ok`, oracle `ok`, `equal at 1e-6`. The scripts are `.mts`, because tsx compiles a `.ts` file outside a `type: module` package as CommonJS, where top-level `await` fails. Nothing of it is in the repository. |
| 2026-11-23 | T1 | deviation | Load rule. Every JVM run waited for a 1-minute load below 12 (`grid.sh`, and the later ceiling probes) and ran under `nice -n 10`. Node probes and the TS final runs did not wait: three other queue sessions (plantuml, graphviz) kept the load between 10 and 57 all evening, and their output is deterministic, so load changes only the times quoted. The queue rule names JVM sweeps and recorders; the brief's wider wording ("JVM and probe runs") was not kept. |
| 2026-11-23 | T1 | measure | Oracle grid, run 1 (`grid.sh run1`: one cold JVM per shape, depths 2,000 to 10,000 step 500 in ascending order, `ELK_SWEEP_TIMEOUT_MS=1200000`, load at JVM start 10.4 to 11.9). radial path: 2,000-10,000 all `ok` (0.9 s to 10.6 s); radial caterpillar: 2,000-10,000 all `ok` (1.6 s to 32 s); vertiflex path: 2,000-3,500 `ok`; 4,000, 4,500, 5,000 `StackOverflowError`; 5,500-10,000 `ok`; vertiflex caterpillar: 2,000-10,000 all `ok`; mrtree path: 2,000-10,000 all `ok` (2.7 s to 236 s); mrtree caterpillar: 2,000-10,000 all `ok` (5.6 s to 473 s). Raw rows: `$TMPDIR/tree-recursion-depth/grid.log`. |
| 2026-11-23 | T1 | measure | Oracle grid, run 2 (same script, a second set of cold JVMs, load at start 6.4 to 11.9). radial path: all `ok` (0.8 s to 12 s); radial caterpillar: all `ok` (1.3 s to 24 s); vertiflex path: 2,000-3,500 `ok`; 4,000-5,500 `StackOverflowError`; 6,000-10,000 `ok`; vertiflex caterpillar: 2,000-3,500 `ok`; 4,000 `StackOverflowError`; 4,500-10,000 `ok`; mrtree path: all `ok` (2.5 s to 218 s); mrtree caterpillar: all `ok` (4.5 s to 541 s). |
| 2026-11-23 | T1 | decision | **`D_oracle` = 10,000 for all six shapes** (D1: the highest depth completed in either run; 10,000 is the grid top). **Stop 6 on D1, pushed forward:** D1 says overflow is monotone in depth. It is not in a warm JVM: the vertiflex path throws at 4,000 to 5,500 and completes every depth above, because the JIT compiles the recursion after the first overflows and compiled frames are smaller. So the issue's brackets (oracle overflow at 3,500 to 7,000) were the limit of a colder JVM, not of the oracle. D1's definition is kept as written; only its monotonicity remark is wrong. The effect is a higher bar (10,000 everywhere), so more sites than the issue's candidates; the write-sets and every expected value are untouched. |
| 2026-11-23 | T1 | measure | TS brackets, unconverted port, default stack, JIT (`ts-grid.sh`; first non-`ok` depth and the repeating `src/alg/` frame): radial path `ok` to 2,500, overflow 3,000, `AnnulusWedgeByNodeSpace.calculateWedgeSpace` (`:23`); radial caterpillar `ok` to 4,500, overflow 5,000, same frame; vertiflex path `ok` to 3,500, overflow 4,000, `VertiFlexLayoutProvider.checkVerticalConstraintValidity` (`:160`); vertiflex caterpillar `ok` to 4,500, overflow 5,000, same frame; mrtree path `ok` to 3,000 (64 s), overflow 3,500, `LevelProcessor.setLevel` (`:62`); mrtree caterpillar `ok` to 2,500, overflow 3,000, `NodePlacer.secondWalk`. Against the issue's table: the depths agree within one step; the first sites differ for vertiflex (the issue named `recursiveStraightlinePlacement`) and the mrtree path (`DFSTreeifyer.dfs`); the radial and vertiflex caterpillars, which the issue had at or above the oracle, are below the new bar. Journaled, not a stop. |
| 2026-11-23 | T1 | measure | D5 references: the unconverted port from a snapshot of the base (`git archive 5782a87a src tools test package.json tsconfig.json` into `$TMPDIR/tree-recursion-depth/base`, `node_modules` linked), each shape at 10,000 with `node --stack-size=7000` (under `ulimit -s` 8176). sha1: radial path `9d321bbf8596c9190a6ba8eae9d7b4e6eafa8a5e`, radial caterpillar `3849b7fa446061ef1c5d0b70884cd13b12546d0c`, vertiflex path `cb213794b94ee7a31e9e8db918815d6a2741d9fc`, vertiflex caterpillar `945a0113827761840d73d9c2e0cacad941193488`, mrtree path `7838625543ec44ebeaef88dfd465516ef1ec2a50`, mrtree caterpillar `3127698bddb66695a3c049a1e87247a10b16da8b`. All six equal the oracle's run-1 output at 1e-6 (`compare.mts`): no pre-existing divergence, stop 2 does not apply. |
| 2026-11-23 | T1 | divergence | The first two mrtree reference runs died after 285 s and 416 s with `JavaScript heap out of memory` at the 4.4 GB default heap. **Mechanism:** every suspended frame of the recursive `FanProcessor.calculateFan` keeps its level's `locFanMap` alive, and the map of level k has k entries, so the live heap grows with D²/2 entries. **Origin:** base `src/alg/mrtree/intermediate/FanProcessor.ts:80-103`. **Causal chain:** at 10,000 levels about 5 x 10^7 entries are live at the deepest call; the heap limit is reached before the recursion returns. **Evidence:** at path 3,000 the base peaks at 1,661 MB RSS and the converted loop at 411 MB, with identical output; with `--max-old-space-size=48000` both references complete (path 2,239 s, caterpillar 3,842 s). **Ruled out:** the stack (`--stack-size=7000` holds: depth 1,000 on 600 KB is `ok`), a wrong result (equal to the oracle at 1e-6). The JVM holds the same maps and has the heap for them. Not a defect of the port; noted in #168. |
| 2026-11-23 | T1 | decision | Push-forward (probe refinement): site discovery for mrtree uses scaled probes, a shallow depth on a proportionally reduced stack (`ts.sh mrtree path 1500 --stack-size=140` is about depth 10,000 on the default 984 KB), because a real mrtree run at 10,000 takes 36 to 64 minutes. Interpreter frames are larger than optimised ones, so a scaled probe is the stricter of the two: at 600 on 197 KB it names `firstWalk`, at 700 `setLevel`. A site a scaled probe names counts as "a probe overflowed in it" (D2); the final evidence is still the real run at 10,000 with no node flags. |
| 2026-11-23 | T1 | measure | Oracle ceiling, for the depth limit below (vertiflex only, it is the fast one). A JVM started at 20,000: path 20,000 to 640,000 and caterpillar 20,000 to 320,000 all `StackOverflowError`. A JVM warmed through 2,000, 3,000, 6,000, 8,000, 10,000, 12,000: the path throws from 6,000 up (this warm-up order never recovers); the caterpillar completes 15,000 and throws at 20,000 to 80,000. So the oracle's limit depends on the order of the cases a JVM has seen, and the deepest tree it completed in any run is 15,000. #70 records the oracle completing a 16,000 force path and overflowing at 100,000. |
| 2026-11-23 | batch 1 | gate | T1 acceptance: `D_oracle` and raw statuses journaled (two runs); TS brackets and frames journaled; six references with hashes, each equal to the oracle; harness text below; `git status` shows no harness file. Batch 1 `[x]`. |
| 2026-11-23 | T3 | report | Radial track (subagent, 18 of 75 minutes; commit `dae79ea3`). Sites in probe order (`ts.sh radial <shape> 2000 --stack-size=190`, both shapes): `AnnulusWedgeByNodeSpace.calculateWedgeSpace` (frame stack; sums left to right after each child's value is final), `EadesRadial.positionNodes` (frame stack; `alpha += s * numberOfChildLeafs` after the child's subtree), `RadiusExtensionOverlapRemoval.extend` (tail call, a loop over the levels), `StraightLineEdgeRouter.routeEdges` (frame stack, live edge iterator). Each has a `*.explicit-stack.test.ts`: twin equality on 60 to 72 seeded trees at raw bits, a 15,000 deep case red before and green after. `--jitless`: `npx vitest run <4 files> --pool=forks --execArgv=--jitless`, 4 files passed. **sites.md corrected:** `extend` is not option-gated (`RadialLayoutProvider.java:89` always adds the processor). Left verbatim, no probe reached them: `getNumberOfLeaves`, `findRootOfNode`, `setIDForNodes`, `RadialCompaction.contract` (#166). |
| 2026-11-23 | T4 | report | Vertiflex track (subagent, 14 of 75 minutes; commit `0fc93546`). Sites in probe order (`ts.sh vertiflex <shape> 10000`): `VertiFlexLayoutProvider.checkVerticalConstraintValidity`, `NodeYPlacer.setYLevels`, `RelativeXPlacer.recursiveStraightlinePlacement` (child recursed into before it joins `children`; `size()` re-read per step; post-order block once the index reaches it), `AbsoluteXPlacer.findMinimalX` and `absoluteTreeCoords`, `StraightEdgeRouter.routeEdges`. Five test files, twin equality on 60 seeded trees in four modes (no constraints, valid, random with throws, model order), compared on the full `dumpVertiFlex`, property-key order, thrown class and message, return bits; 15,000 deep cases red then green. `--jitless`: `npx vitest run <5 files> --execArgv=--jitless`, 436 tests passed. Left verbatim: `recursiveBentlinePlacement`, `BendEdgeRouter.routeEdges` (`layoutStrategy` `BEND`, #166). |
| 2026-11-23 | T3, T4 | divergence | **Stop 6 on D3 (found by the orchestrator's review of the T3 report; diagnosed before any fix).** Symptom: the converted radial port hangs on `retarget/radial/default/tests/layered/transform_direction/example` (`ts-case.mts`, exit 124 after 60 s); the unconverted port throws `RangeError`, and the oracle sweep records `java.lang.StackOverflowError` for it. **Mechanism:** a successor structure with a cycle reachable from the root makes the Java recursion endless; the JVM and V8 end it by stack exhaustion; an explicit-stack loop pushes frames (or, for a tail loop, spins) without end. **Origin:** every converted loop, first met at `AnnulusWedgeByNodeSpace.calculateWedgeSpace` (radial) and `StraightEdgeRouter.routeEdges` (vertiflex, the only phase that follows port edges). **Causal chain:** `findRoot` accepts a graph with one node without incoming edges; the cycle is then walked for ever; nothing throws. **Extent:** 173 sweep cases (vertiflex 171, radial 2) and, for mrtree, the four `mrtree-extra.json` rows of `NodePlacer.java:341` (a node that is its own right sibling), whose replay requires a `RangeError` with a `NodePlacer` frame (AD-13: frozen). **Ruled out:** a wrong conversion order (the twins agree on every finite input); the oracle laying these inputs out (it throws); a test that could see it (a synchronous endless loop ignores vitest's timeout, and no landed radial or vertiflex test has a cyclic input). D3 ("an exception thrown inside the recursion propagates from the same point") did not foresee an error raised by the stack itself. |
| 2026-11-23 | T3, T4 | decision | Fix at the origin, one shared primitive because the cause is one (the loop has no stack limit) and the bundles do not import each other: `src/java/lang/StackDepth.ts`, `checkStackDepth(depth)` throws `RangeError('Maximum call stack size exceeded')` when `depth`, the number of activations the Java recursion would hold, exceeds `MAX_STACK_DEPTH`. Plain `RangeError` per AD-16b (a JVM error nothing catches). Written test-first (`StackDepth.test.ts`, commit `ea555fe4`). **Write-set:** `src/java/lang/` is outside D7's bundles; the mission prompt makes the write-set a plan, and the alternative, one copy per bundle, would repeat a constant three times. Rejected: detecting re-entry of an active node (no magic number, but it needs a per-site proof and does not fit the level recursions, whose argument is a list); leaving the sites recursive (the mission would convert nothing that can meet a cycle). The choice is the maintainer's to confirm: #167 (`needs-ruling`), which blocks nothing. |
| 2026-11-23 | T3b, T4b | report | Depth check retrofitted by two subagents (commit `511341e1`): `checkStackDepth(stack.length)` after each push in the four radial and six vertiflex sites, a level counter in `extend`. Each explicit-stack test gained an endless case (a→b, b→c, c→b; for `extend` a level that never empties), red first (hang or heap abort under an outer `timeout`), then port and verbatim twin both `RangeError`. Whole pipeline: both radial sweep rows and all 171 vertiflex rows throw `RangeError` (`$TMPDIR/tree-recursion-depth/t4b/results.txt`). |
| 2026-11-23 | T2 | report | Mrtree track (subagent, 85 of 135 minutes; commit `af912601`), with the depth check from the start. Sites in scaled-probe order (`frames.sh <shape> 1500 --stack-size=140`): `ComponentsProcessor.dfs` (two call sites as steps of one frame), `DFSTreeifyer.dfs`, `FanProcessor.calculateFan`, `LevelProcessor.setLevel`, `NeighborsProcessor.setNeighbors`, `LevelHeightProcessor.setNeighbors` (four tail calls, loops over the levels, iterations counted for the depth check), `NodePlacer.firstWalk`, `NodePlacer.secondWalk` (first child, then right sibling; the caller's frame stays during the sibling call, so the stack length is the Java depth). Seven test files, twin equality on 60 seeded trees each, 15,000 deep cases red then green, endless cases (a node that is its own child or its own right sibling) where one can exist; the two `dfs` sites stop on visited marks, stated in the tests. `--jitless`: 7 files, 500 tests passed. The landed replay with the `StackOverflowError` rows passes unchanged. Left verbatim, no probe named them: `NodeOrderer` (`weighting`), `OrderBalance`, `TreeUtil.depth`, `rootDistance`, `getSubtree`, `getLeftMost` (#166). `EdgeRouter.middleToMiddleEdgeRoute` is not a recursion. |
| 2026-11-23 | T2, T3 | note | AD-13, two self-corrections by the track agents in tests new to this mission, each before the test had ever been green and each re-derived from the Java, reviewed by the orchestrator: (1) radial `extend` deep case, logged-graph tag count `3*(N-1)-1 = 44,996`, not `3*(N-1)+2` (`RadiusExtensionOverlapRemoval.java:48-49` starts at the root's successors); (2) mrtree `NeighborsProcessor` deep case, a fixture that left node 1 isolated was fixed to the caterpillar its comment describes, and the left neighbours re-derived from `NeighborsProcessor.java:105-108` (`[null, null, 'n1', null, 'n3', null]`; the leaf's edge comes first, so each spine node's left neighbour is the previous level's leaf). No landed assertion, ref or vector changed. |
| 2026-11-23 | T6 | decision | `MAX_STACK_DEPTH` lowered from 1,000,000 to 100,000 (commit `ee1ecb95`). At 1,000,000 a cyclic vertiflex case took about 4 s and over 500 MB to throw (`StraightEdgeRouter.routeEdges` holds an edge list per frame), the tree sweep's vertiflex time went from 8 s to 733 s, and the landed `NodePlacer.test.ts` case of `NodePlacer.java:341` passed its 5 s timeout once under load (1.26 s alone). 100,000 lies above the deepest tree the oracle completed (15,000 on the 2 MB case thread, about 60,000 if scaled to an 8 MB main thread); the `NodePlacer` case now takes 0.13 s. No test names the value except `StackDepth.test.ts`, changed with it (a test of this mission, never landed). |
| 2026-11-23 | T6 | decision | Fixtures shared (commit `992acdad`): the track agents could not write `test/helpers/`, so the 16 new test files carried 5 to 7 copies of the seeded spec, graph builder and throw helpers per bundle. A subagent (sonnet) moved the identical ones to `test/helpers/{mrtree,radial,vertiflex}-tree-fixtures.ts`; helpers whose bodies differ per site stay local. Test counts before and after: mrtree 870, radial 1,183, vertiflex 723. Write-set note: `test/helpers/` is outside the brief's table; the repository's helper rule asks for it. |
| 2026-11-23 | T6 | evidence | Final evidence on the final source (depth limit 100,000), default stack, no node flags, depth 10,000 (`final2/run.sh`): vertiflex path `ok` 1.7 s, caterpillar `ok` 6.0 s, radial path `ok` 172 s, radial caterpillar `ok` 289 s; each `cmp`-identical to its D5 reference and `equal at 1e-6` to the oracle. mrtree path `ok` 2,164 s and caterpillar `ok` 3,257 s ran before the limit changed (source hashes `t2/final-src.sha` unchanged since): `cmp`-identical to the references (sha1 `78386255…`, `3127698b…`) and `equal at 1e-6` to the oracle; no activation chain of those runs is longer than 20,000, so the limit cannot have touched them, and at 2,500 on the final source both mrtree shapes are byte-identical to the unconverted port (path 33 s base and 36 s converted, caterpillar 56 s and 56 s). Stops 2 and 3 do not apply. All six shapes are **done** (D1, D5). |
| 2026-11-23 | T6 | evidence | Corpus sweep, tree algorithms, converted against unconverted (`npx tsx tools/corpus/ts-layout-compare.ts --algorithms mrtree,radial,vertiflex --shards 4`, on the worktree and on the base snapshot): mrtree 817 `ok`, 89 `both-throw`; radial 540 `ok`, 1 `mismatch` (the accepted last-ulp case of `tools/corpus/ts-findings.json`), 365 `both-throw`; vertiflex 352 `ok`, 553 `both-throw`, 1 excluded; 0 `ts-only-throw`, 0 `oracle-only-throw`, 0 `ts-aborted`. All 2,718 cases have the same category and detail on both sides. Rerun with the limit at 100,000 (`sweep/after2.json`): the same counts, 2,718 of 2,718 cases identical to the base; vertiflex TS time 69 s (733 s with the limit at 1,000,000; 8 s for the recursive port). |
| 2026-11-23 | T6 | decision | Stop 8 did not fire: no probe overflowed in a recursive method outside the three bundles (the leaf frames in `EcoreEMap`, `LinkedList` and `BasicEList` sit under a bundle's recursion). |
| 2026-11-23 | T6 | issue | Filed: #166 (`follow-up`): the recursions left verbatim, with the option that reaches each, and `TreeUtil.getLeftMost`, the only one default options reach. #167 (`needs-ruling`, with a "Ruling needed" comment): the depth check, fixed limit against cycle detection, the value, and the earlier explicit-stack sites. #168 (`follow-up`): the port is 6 to 26 times slower than the oracle at 10,000 deep; `calculateFan`'s heap. No shape is a partial. |
| 2026-11-23 | T5 | docs | `sites.md`: every row has an outcome. `docs/architecture/alg-trees.md` § 7: the converted sites and their tests, the result per shape, the depth check, what stays verbatim; § 8 row replaced. `docs/conformance.md`: the TR7 bullet, the stack-depth bullet, a pointer in the AC6 bullet. `plans/alg-trees/decision-journal.md`: one closing row appended. The translated `docs-site/` pages are out of scope. |
| 2026-11-23 | T6 | fix | Gate 6, first run: one finding, `js/redundant-operation` at `src/alg/radial/p1position/EadesRadial.explicit-stack.test.ts:57`, operands `currentRadius` and `currentRadius` identical. It is the verbatim twin's transcription of `EadesRadial.java:108` (`currentRadius / currentRadius + radius`, the precedence quirk TR9 keeps), the line `tools/codeql/accepted.json` already accepts for `EadesRadial.ts`. A twin must stay verbatim, so it is accepted, not fixed: new entry, fingerprint `cb11ad9ca16fd615:1`, reason "Java-faithful". Second run: `codeql: ok, every finding is accepted`. |
| 2026-11-23 | T6 | gate | Queue gates on the final tree. 1 `npm run format:check`: exit 0, "All matched files use Prettier code style!". 2 `npm run typecheck`: exit 0. 3 `npm run complexity`: report read, no violation; its only lines are the two "measured by AST only" notes in `src/graph` (`ElkGraphReferences.ts:113`, `ElkGraphUtil.ts:172`), both inside the limits and untouched by this mission. 4 `npm run coverage` (detached, `nice -n 10`, load 20 at start): exit 0, `coverage gate: ok`; 1,212 files passed; 50,569 tests passed, 83 skipped; 98.81 / 97.01 / 98.57 / 98.86 statements / branches / functions / lines (baseline 1,195 files, 49,611 tests, 98.81 / 97.01 / 98.56 / 98.86); log `coverage-logs/coverage-20261123-225608-98146.log`. 5 `npm run docs:build`: exit 0, "build complete". 6 `npm run codeql`: exit 0 after the entry above. 7 `git diff --exit-code 5782a87a -- test/golden/refs/`: exit 0, no ref touched; no recorder or regen input changed, so none was rerun. |
| 2026-11-23 | T6 | note | Write-set, as the mission prompt allows (a plan, not a limit), each journaled above: `src/java/lang/StackDepth.ts` and its test (the depth check), `test/helpers/{mrtree,radial,vertiflex}-tree-fixtures.ts` (shared fixtures), `tools/codeql/accepted.json` (one entry). Everything else is inside the brief's table. No write outside the worktree except scratch under `$TMPDIR/tree-recursion-depth/` and the oracle's own harness-class cache through `tools/oracle/run.sh`. |
| 2026-11-23 | T6 | close | Roadmap revision appended; `.agent-notes/tree-recursion-depth.md` written; README summary written. Tag `tree-recursion-depth/pre-squash` on the last per-task commit, then `git reset --soft 5782a87adca0e884f531ce5004c7b49c15ad42c0` and one commit, `Refs: #67`, no `Closes`, no attribution lines (queue rule). Not pushed. Per-task commits under the tag: `9ad1a09d` brief, `dae79ea3` radial, `0fc93546` vertiflex, `ea555fe4` depth check, `af912601` mrtree, `511341e1` radial and vertiflex depth checks, `992acdad` fixtures, `ee1ecb95` limit, `c9a444ce` records, and the close-out commit. |

## Scratch harness (D6)

Under `$TMPDIR/tree-recursion-depth/probe/`; never committed. `REPO` is the checkout whose `src/` runs (default the queue
worktree); the D5 references set it to a `git archive` snapshot of the base. Outputs: `in/` (inputs), `oracle/<run>/`,
`out-ts/`, `ref/` (D5), `final2/` (final evidence).

### `gen.mts`

```ts
// gen.ts <alg> <shape> <depth> <out.json>: a deep path or caterpillar as ELK JSON (D6).
// alg: mrtree | radial | vertiflex; shape: path | caterpillar. Nodes 10 x 10, default options.
import { writeFileSync } from 'node:fs';

const [alg, shape, depthArg, out] = process.argv.slice(2);
const depth = Number(depthArg);
if (!['mrtree', 'radial', 'vertiflex'].includes(alg ?? '') || !['path', 'caterpillar'].includes(shape ?? '')) {
  throw new Error('usage: gen.ts <mrtree|radial|vertiflex> <path|caterpillar> <depth> <out.json>');
}
if (!Number.isInteger(depth) || depth < 1 || out === undefined) throw new Error('bad depth or out');
const SIZE = 10;
const node = (id: string) => ({ id, width: SIZE, height: SIZE });
const edge = (id: string, s: string, t: string) => ({ id, sources: [s], targets: [t] });
const children: unknown[] = [];
const edges: unknown[] = [];
const spine = shape === 'path' ? 'n' : 's';
for (let i = 0; i < depth; i++) {
  children.push(node(`${spine}${String(i)}`));
  if (i > 0) edges.push(edge(`e${String(i)}`, `${spine}${String(i - 1)}`, `${spine}${String(i)}`));
  if (shape === 'caterpillar') {
    children.push(node(`l${String(i)}`));
    edges.push(edge(`f${String(i)}`, `${spine}${String(i)}`, `l${String(i)}`));
  }
}
const graph = { id: 'root', layoutOptions: { 'elk.algorithm': `org.eclipse.elk.${alg}` }, children, edges };
writeFileSync(out, JSON.stringify(graph) + '\n');
```

### `ts-run.mts`

```ts
// ts-run.ts <in.json> <out.json>: one case through the TS pipeline in this process (D6). REPO = the checkout to load.
// Prints one JSON line: {"status":"ok"|"overflow"|"threw","frame":...,"depthFrames":...,"ms":...}.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [input, output] = process.argv.slice(2);
const repo = process.env['REPO'];
if (input === undefined || output === undefined || repo === undefined) throw new Error('usage: REPO=<checkout> ts-run.ts <in.json> <out.json>');
Error.stackTraceLimit = 200;
const pipeline = (await import(pathToFileURL(path.join(repo, 'tools/corpus/ts-layout-pipeline.ts')).href)) as {
  layoutToJson: (text: string, source: string, row: unknown) => string;
};
const row = { caseId: path.basename(input), tier: 'native', algorithm: '', variant: 'default', modelId: input, verdict: 'ok', ms: 0 };
const start = performance.now();
let result: Record<string, unknown>;
try {
  const text = pipeline.layoutToJson(readFileSync(input, 'utf8'), 'json', row);
  writeFileSync(output, text.endsWith('\n') ? text : text + '\n');
  result = { status: 'ok' };
} catch (err) {
  const e = err as Error;
  const lines = (e.stack ?? '').split('\n').filter((l) => l.includes('    at '));
  const first = lines.find((l) => l.includes('/src/alg/')) ?? null;
  const outside = lines[0] ?? null;
  const isOverflow = e instanceof RangeError && /call stack/i.test(e.message);
  result = {
    status: isOverflow ? 'overflow' : 'threw',
    name: e.name,
    message: e.message.slice(0, 200),
    frame: first === null ? null : first.trim().replace(repo, ''),
    innermost: outside === null ? null : outside.trim().replace(repo, ''),
    top: lines.slice(0, 6).map((l) => l.trim().replace(repo, '')),
  };
}
result['ms'] = Math.round(performance.now() - start);
console.log(JSON.stringify(result));
```

### `compare.mts`

```ts
// compare.ts <expected.json> <actual.json>: compareLayout at 1e-6 (AD-4); exit 1 on diffs. REPO = the checkout.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [expected, actual] = process.argv.slice(2);
const repo = process.env['REPO'];
if (expected === undefined || actual === undefined || repo === undefined) throw new Error('usage: REPO=<checkout> compare.ts <expected> <actual>');
const cmp = (await import(pathToFileURL(path.join(repo, 'test/golden/compare-json.ts')).href)) as {
  compareLayout: (e: unknown, a: unknown) => { ok: boolean; diffs: unknown[] };
  formatDiffs: (d: unknown[]) => string;
};
const result = cmp.compareLayout(JSON.parse(readFileSync(expected, 'utf8')), JSON.parse(readFileSync(actual, 'utf8')));
if (result.ok) {
  console.log('equal at 1e-6');
} else {
  console.log(`${String(result.diffs.length)} diffs\n${cmp.formatDiffs(result.diffs)}`);
  process.exit(1);
}
```

### `ts-case.mts`

```ts
// ts-case.mts <model file> <algorithm id>: one retargeted corpus model through the TS pipeline (REPO = the checkout).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [input, algorithm] = process.argv.slice(2);
const repo = process.env['REPO'];
if (input === undefined || algorithm === undefined || repo === undefined) throw new Error('usage');
const pipeline = (await import(pathToFileURL(path.join(repo, 'tools/corpus/ts-layout-pipeline.ts')).href)) as {
  layoutToJson: (text: string, source: string, row: unknown) => string;
};
const row = { caseId: input, tier: 'retarget', algorithm, variant: 'default', modelId: input, verdict: 'ok', ms: 0 };
const start = performance.now();
try {
  const text = pipeline.layoutToJson(readFileSync(input, 'utf8'), input.endsWith('.elkt') ? 'elkt' : 'json', row);
  console.log(JSON.stringify({ status: 'ok', bytes: text.length, ms: Math.round(performance.now() - start) }));
} catch (err) {
  const e = err as Error;
  const lines = (e.stack ?? '').split('\n').filter((l) => l.includes('    at ')).slice(0, 4).map((l) => l.trim().replace(repo, ''));
  console.log(JSON.stringify({ status: 'threw', name: e.name, message: e.message.slice(0, 120), top: lines, ms: Math.round(performance.now() - start) }));
}
```

### `ts.sh`

```bash
#!/usr/bin/env bash
# ts.sh <alg> <shape> <depth> [node flags...]: generate the input if missing and run the TS pipeline in a fresh node.
# REPO (default: the queue worktree) is the checkout whose src/ runs; OUT (default out-ts) the output directory.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$HOME/git/knowvah/elk-engine-queue}"
OUT="${OUT:-$HERE/../out-ts}"
alg="$1"; shape="$2"; depth="$3"; shift 3
mkdir -p "$HERE/../in" "$OUT"
in="$HERE/../in/$alg-$shape-$depth.json"
cd "$REPO"
[ -f "$in" ] || node --import tsx "$HERE/gen.mts" "$alg" "$shape" "$depth" "$in"
printf '%s %s %s ' "$alg" "$shape" "$depth"
REPO="$REPO" nice -n 10 node --import tsx "$@" "$HERE/ts-run.mts" "$in" "$OUT/$alg-$shape-$depth.json"
```

### `oracle.sh`

```bash
#!/usr/bin/env bash
# oracle.sh <runName> <alg> <shape> <depth>...: one cold JVM lays out the listed depths of one shape, in order.
# Output: ../oracle/<runName>/<alg>-<shape>-<depth>.json and one result line per case on stdout.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$HOME/git/knowvah/elk-engine-queue}"
run="$1"; alg="$2"; shape="$3"; shift 3
out="$HERE/../oracle/$run"
mkdir -p "$HERE/../in" "$out"
cases="$out/$alg-$shape.cases.jsonl"
: >"$cases"
cd "$REPO"
for depth in "$@"; do
  in="$HERE/../in/$alg-$shape-$depth.json"
  [ -f "$in" ] || node --import tsx "$HERE/gen.mts" "$alg" "$shape" "$depth" "$in"
  printf '{"id":"%s-%s-%s","input":"%s","mode":"layout"}\n' "$alg" "$shape" "$depth" "$in" >>"$cases"
done
ELK_SWEEP_TIMEOUT_MS="${ELK_SWEEP_TIMEOUT_MS:-1200000}" nice -n 10 bash tools/oracle/run.sh --cases "$cases" "$out" 2>/dev/null
```

### `grid.sh`

```bash
#!/usr/bin/env bash
# grid.sh <runName>: the D1 oracle grid, one cold JVM per shape, depths 2000..10000 step 500, waiting for load < 12.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
run="$1"
depths=$(seq 2000 500 10000)
for alg in radial vertiflex mrtree; do
  for shape in path caterpillar; do
    while :; do
      l=$(uptime | sed 's/.*load averages: //' | cut -d' ' -f1)
      [ "$(echo "$l < 12" | bc)" = 1 ] && break
      sleep 20
    done
    echo "# $run $alg $shape load $(uptime | sed 's/.*load averages: //')"
    # shellcheck disable=SC2086
    bash "$HERE/oracle.sh" "$run" "$alg" "$shape" $depths
    echo "# rc $?"
  done
done
```

### `ts-grid.sh`

```bash
#!/usr/bin/env bash
# ts-grid.sh <alg> <shape> [maxDepth]: the TS bracket on the default stack; stops one depth after the first non-ok.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
alg="$1"; shape="$2"; max="${3:-10000}"; after=0
for depth in $(seq 2000 500 "$max"); do
  line="$(bash "$HERE/ts.sh" "$alg" "$shape" "$depth")"
  echo "$line"
  case "$line" in *'"status":"ok"'*) ;; *) after=$((after + 1)) ;; esac
  [ "$after" -ge 2 ] && break
done
```
