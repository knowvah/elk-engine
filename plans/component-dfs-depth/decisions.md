<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: component-dfs-depth (issue #70)

These are locked for this mission. A contradiction found during execution is stop 6 ([stop-conditions.md](stop-conditions.md)).

## D0: the ruling this mission executes

The maintainer answered the "Ruling needed" comment on #70 (2026-11-21, covering #67, #70 and #76) on 2026-11-23: "yes, so
long as results stay the same." A recursion that overflows V8's default stack on an input the oracle lays out becomes an
explicit-stack loop. Each one is proven against a verbatim recursive reference, the AC6 recipe
(`plans/alg-common/decisions.md:90`). #67 executed the same ruling for the trees (`63fa9aa4`). In scope are force (with
stress, which runs the same `ComponentsProcessor`) and disco; #76 (spore) stays open.

## D1: the bar is the oracle's measured depth per algorithm

**Context.** #70 measured once: the oracle completes 16,000 and throws `StackOverflowError` at 100,000, and the port
overflows at 16,000. #67 found that the oracle's limit moves with JIT warm-up (`.agent-notes/tree-recursion-depth.md`). Once
`dfs` is a loop the port has no `dfs` depth limit below `MAX_STACK_DEPTH` (100,000), so a fixed number would not test
anything new.

**Decision.** T1 measures the oracle on a path, the T12 shape (`plans/alg-force-disco/decision-journal.md:71`): preset
`x = 20·i`, `y = 0`, nodes 10 × 10, edges `n_i -> n_{i+1}`. Force runs with `iterations = 1`; stress runs with
`interactive = true` and `iterationLimit = 1`; disco uses its defaults. The grid is 16,000, 24,000, 32,000, 48,000 and
64,000, in ascending order, in two cold JVM runs per algorithm. `D_oracle(alg)` is the highest depth completed in either
run. A heap exhaustion or timeout in the oracle is not a stack result: journal it, and that depth does not count. An
algorithm is **done** when the port, on Node's default stack with JIT, completes the path and the caterpillar at
`D_oracle(alg)` and both equal the oracle at 1e-6. If the oracle does not complete the caterpillar at that depth, the path
alone decides, and that is journaled.

**Rejected.**

- (a) #70's 16,000 as written. It was measured once and is below what the oracle may reach.
- (b) A grid up to 100,000. The oracle overflowed there in #70, and stress's all-pairs matrix (n² doubles, 80 GB at 100,000)
  passes the machine's 96 GB.

## D2: the sites, and any further site in probe order

**Decision.** The two sites #70 names are converted: `ComponentsProcessor.dfs` (`src/alg/force/ComponentsProcessor.ts:109`,
Java `ComponentsProcessor.java:130-155`) and `ElkGraphComponentsProcessor.dfs`
(`src/alg/disco/transform/ElkGraphComponentsProcessor.ts:267`, Java `ElkGraphComponentsProcessor.java:207-217`). A scan at
planning found no other self-recursive method in `src/alg/force` or `src/alg/disco`. If T4's probe overflows in a further
frame after both conversions, the innermost `src/alg/{force,disco}/` frame is the next site, converted the same way (D3, D4)
in T4. A frame outside the two bundles is stop 8.

## D3: the conversion recipe

**Decision.** Follow the mrtree `ComponentsProcessor.dfs` of #67 (`src/alg/mrtree/ComponentsProcessor.ts:118-207`), which
has the same two-call loop body:

- The method keeps its name, signature, return value and `@see`. Its body becomes a loop over an explicit stack of frames.
  One frame is one suspended Java activation on an unvisited node. An activation on a visited node returns at entry, with no
  frame, as the Java's `if` does. The JSDoc names the Java lines of the recursive calls and says "AC6 (#70): explicit stack,
  same visit and side-effect order".
- **Force:** the frame holds the node, `last`, the component and the live iterator over the node's incidence `LinkedList`.
  It also holds the current edge and its step: the `last` skip, the source call (`:146`), the target call (`:149`), then the
  edge and labels pushes (`:152-153`). The two calls are separate pushes in that order. A child's `last` is its frame
  parent's node. The component `null` → `new FGraph()` creation happens at the outermost entry only, as in the Java.
- **Disco:** the frame holds the node and the live iterator over its incidence `Set`. `visited.push` and `component.push`
  happen at entry. The `visited.includes` test happens per neighbour, at the moment the Java tests it, not when the neighbour
  is pushed. The static fields stay as they are.
- The incidence lists and sets are not modified while `dfs` runs, so live iterators are safe. State this proof in a comment,
  as the mrtree conversion does.
- Helpers for the frame steps may be extracted to meet the complexity limits (CCN 10, 30 NLOC). They stay in the same file.
- An exception thrown inside the search propagates from the same point. No catch is added.

## D4: the proof per site

**Decision.** Each site gets `<Class>.explicit-stack.test.ts` next to its source, in the #67 style:

1. A test-local verbatim recursive transcription of the Java method (the twin), reached through test-only access to the
   private method, as `src/alg/mrtree/ComponentsProcessor.explicit-stack.test.ts:15-60` does.
2. Equality through `split` between port and twin on at least 60 seeded graphs (`seededRandom` from
   `test/helpers/spore-tree-fixtures.ts`). Compare the component order, each component's node order, edge order and label
   order (force), the renumbered ids, and element identity. The mix must include paths, cycles, several components, isolated
   nodes, parallel edges, edges in both directions, self-loops and edges back to `last` (force). For disco it must include
   ports, edges between ports, and hierarchy-crossing or extension edges, as `computeIncidences` reads them.
3. A deep path of 20,000 nodes, above #70's 16,000 overflow, that completes. Try the twin there too: it is either equal or
   a `RangeError`, the B8 pattern (`DFSNodeOrderCycleBreaker.test.ts:209-224`). Write the deep case first. It must be red
   (overflow) before the conversion.
4. Force only: a path of `MAX_STACK_DEPTH + 2` nodes throws `RangeError` from `split` (D7). Disco: the same case if it runs
   in under 10 s, since `visited.includes` makes disco's search quadratic. Otherwise state in the test why it is omitted.
   Neither search can run without end, because each node opens at most one activation. Say so in the test, as the mrtree
   test does.

The landed replays (`force.json`, `stress.json`, `disco.json` through `src/alg/force` and `src/alg/disco`) must pass unchanged
after each conversion. That is the whole-pipeline proof at the recorded shapes.

## D5: whole-pipeline equality against the unconverted port

**Decision.** T1 runs the **unconverted** port (a `git archive` snapshot of the base) on the path and the caterpillar of
each algorithm at `D_oracle(alg)`, with a raised stack, and keeps the exported JSON as the reference. Use
`node --stack-size=<k>` with `k` below `ulimit -s` (8176 KB). If that is not enough, run `layoutToJson` in a
`worker_threads` `Worker` with `resourceLimits.stackSizeMb` raised. Raise the heap with `--max-old-space-size` where stress
needs it. After the conversions, the converted port on the default stack must produce **byte-identical** output. If the
unconverted port already differs from the oracle beyond 1e-6 at a depth, that divergence is pre-existing: stop 2.

**Rejected.** An oracle-only comparison. A 1e-6 tolerance would hide a reordered sum, and the ruling asks for the same
results.

## D6: the probe harness is scratch, journaled verbatim

**Decision.** `$TMPDIR/component-dfs-depth/probe/` starts as a copy of #67's harness, whose text is in
`plans/tree-recursion-depth/decision-journal.md` § Scratch harness: `gen.mts`, `ts-run.mts`, `compare.mts`, `ts.sh`,
`oracle.sh`, `grid.sh`. `gen.mts` gains `force`, `stress` and `disco` with the D1 options, the preset positions and the
caterpillar (a spine `s_i` with one leaf `l_i` each). T1 journals the changed scripts verbatim. Nothing is committed.

**Rejected.** A committed `tools/` probe. The issue asks for conversions, and #67 kept its probe scratch too.

## D7: the depth check

**Context.** #67 made every converted site call `checkStackDepth` (`src/java/lang/StackDepth.ts`, limit 100,000). That
includes the visited-mark mrtree `dfs` (`src/alg/mrtree/ComponentsProcessor.ts:204-207`), which can never run without end.
#167 asks the maintainer whether a fixed limit is the right model (Q1, Q2) and whether loops that stop on visited marks
should call it (Q3, naming #70).

**Decision.** Both sites call `checkStackDepth(stack.length)` after each frame push, as the mrtree `dfs` does. That keeps one
mechanism for every #67 and #70 site, so #167's answer applies to all of them at once. It also matches #70's record of the
oracle overflowing on a 100,000-node force path. T4 comments on #167 to name the two new call sites.

**Rejected.** No check, as the pre-#67 loops (`NetworkSimplex`, B8, F11, spore) have none. That would leave the two
component searches unlike the mrtree one in the same queue round, and it would pre-empt #167 Q3.

## D8: what does not change

No landed ref, golden or expected value changes. There is no oracle patch. Nothing changes outside the two source files,
their new tests, the docs, `plans/` and `.agent-notes/`, except a stop-8 or D2 site T4 converts (journaled).

## Auto-confirmed (unattended)

Planned 2026-11-24 by `/plan-mission --unattended next --branch chore/issue-queue`.

- **Selection.** `next` resolved to #70. #66 and #67 carry `queue:ready` with `queue:on-branch` (landed as `e30d1c5c` and
  `63fa9aa4`), so they were skipped as done. No open issue is `queue:planned`. #70 has no "Blocked by" line. It is labelled
  `follow-up` and `queue:ready` and carries the maintainer's ruling (D0). #167 (`needs-ruling`) does not block it, because
  D7 follows the landed call and changes no value.
- **D1** chose a measured grid per algorithm over #70's single 16,000 and over a grid to 100,000. Evidence: #70's table;
  #67's T1 rows (`plans/tree-recursion-depth/decision-journal.md:13-20`, the limit moves with warm-up); 96 GB RAM against
  stress's n² matrix.
- **D2** converts the two named sites. Evidence: the issue; a planning scan of `src/alg/{force,disco}` for self-calls found
  only these two.
- **D5** requires byte identity against the unconverted port. This is #67's reading of "results stay the same", which
  landed without objection.
- **D7** chose the landed `checkStackDepth` call over none. Evidence: `src/alg/mrtree/ComponentsProcessor.ts:204-207`;
  #167 Q3. Rejected: no check (it would diverge from the mrtree sibling and pre-empt the ruling).
- **Parallel T2/T3.** The bundles do not import each other, and the write-sets are disjoint. Rejected: serial (it gains
  nothing; it runs serial anyway if the session forces foreground subagents).
- **No `.claude/settings.autonomous.json`.** The queue driver supplies permissions, and the file is gitignored here.
