<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: spore-recursion-depth (issue #76)

These are locked for this mission. A contradiction found during execution is stop 6 ([stop-conditions.md](stop-conditions.md)).

## D0: the ruling this mission executes

The maintainer's "Ruling needed" comment on #76 (2026-11-21) covers #67, #70 and #76. The answer on #76 itself: "We should
make these explicit stack loops if we get the same output/results." The answer on #70 (2026-11-23) is the same: "yes, so long
as results stay the same." A recursion that overflows V8's default stack on an input the oracle lays out becomes an
explicit-stack loop proven against a verbatim recursive reference, the AC6 recipe (`plans/alg-common/decisions.md:90`). #67
(`05d24ea3`) and #70 (`9a1b08aa`) executed it. #76 is the last issue under the ruling.

## D1: the bar is the oracle's measured depth per algorithm, capped by time

**Context.** #76 measured the sites one at a time on synthetic path trees, in cold JVMs: the shallowest oracle limit is the two
`drawTree` walks (2,000 ok, 4,000 overflows). #67 and #70 found that a cold JVM understates the oracle's limit; a warm-up
ladder in one JVM raises it (`.agent-notes/component-dfs-depth.md`, first observation). `DepthFirstCompaction` is cubic on a
path: the 2,000-node compaction chain takes the oracle about 27 s and the port 72 s on a raised stack
(`plans/alg-packing/decision-journal.md:51, 59`).

**Decision.** The input is the recorder's chain (`tools/vectors/SporeLayoutVectors.java:1870-1877`): `n` nodes on `y = 0`;
`sporeOverlap` 10 × 10 nodes at `x = 8·i`, `sporeCompaction` 200 × 20 nodes at `x = 0.0625·i`. Delaunay gives a path, so the
spanning tree is `n` deep, the worst case for every site. Both algorithms keep their defaults. T1 measures the oracle per
algorithm in warm-up ladders: one JVM per ladder, ascending from 2,000 in steps of 1,000 to 2,000, two ladders per algorithm.
`D_oracle(alg)` is the deepest chain completed in any run, with the order of the cases recorded.

**Time cap.** T1 times the oracle and the unconverted port at 2,000 and 4,000 and fits the growth exponent per algorithm. A
depth enters the grid only if the port's estimated run at that depth is at most 90 minutes. If the cap, not the stack, ends
an algorithm's grid, `D_oracle(alg)` is the deepest capped depth the oracle completed, and that is journaled as a time bar,
not a stack bar. The method-level deep cases of D4 then carry the depth beyond it.

An algorithm is **done** when the converted port, on Node's default stack with JIT, completes the chain at `D_oracle(alg)`,
equals the oracle at 1e-6, and is byte-identical to the D5 reference.

**Rejected.**

- (a) #76's per-site numbers as the bar. They are cold-JVM numbers for isolated methods, not the depth of a real layout.
- (b) A grid without a time cap. At 16,000 the compaction chain would take the oracle about 4 h and the port about 10 h per
  run if the cubic fit holds.
- (c) A second shape (a caterpillar, as #67 and #70 used). Spore's tree comes from the geometry through Delaunay and the
  minimum spanning tree, so the shape cannot be set directly. The chain is the shape PK6 and the recorder use, and it is the
  deepest tree for `n` nodes. The twin tests cover the other shapes (`SHAPES` in `test/helpers/spore-tree-fixtures.ts`).

## D2: the sites

**Decision.** The six recursions #76 and PK6 name are converted:

| Site | Port | Java |
| ---- | ---- | ---- |
| `DepthFirstCompaction.getMinUnderlap` | `src/alg/common/spore/DepthFirstCompaction.ts:130` | `DepthFirstCompaction.java:123-136` |
| `DepthFirstCompaction.minUnderlapWithSubtree` | `:154` | `:138-171` |
| `DepthFirstCompaction.translateSubtree` | `:194` | `:173-176` |
| `DepthFirstCompaction.drawTree` | `:201` | `:181-195` |
| `GrowTreePhase.drawTree` | `src/alg/spore/p3execution/GrowTreePhase.ts:116` | `GrowTreePhase.java:108-114` |
| `MinSTPhase.addNode` (also run by `MaxSTPhase` through `convert`) | `src/alg/spore/p2processingorder/MinSTPhase.ts:89` | `MinSTPhase.java:90-96` |

The executor confirms each Java range with `grep -n` on the pinned source before citing it. A planning scan for self-calls in
`src/alg/spore` and `src/alg/common` found no other spore recursion except `ShrinkTreeCompactionPhase.draw`.

**`ShrinkTreeCompactionPhase.draw` stays verbatim.** It runs only when `org.eclipse.elk.debugMode` is set (`DEBUG_SVG`,
`src/alg/spore/ElkGraphImporter.ts:209`; `ShrinkTreeCompactionPhase.ts:32`). In debug mode the JVM writes one whole-tree SVG
file per compaction step, so no depth bar can be measured, and #76 does not list it (PK6 named it the one gated walk). The docs
say it is the one spore recursion left, and why.

If a T4 run overflows after the six conversions, the innermost `src/alg/{spore,common/spore}/` frame is the next site,
converted the same way (D3, D4) in T4. A frame elsewhere is stop 8.

## D3: the conversion recipe

**Decision.** Follow the PK6 loops in the same files (`compactTree`, `growAt`: a frame of the tree and its next child index)
and the #67 and #70 conversions:

- Each method keeps its name, signature, return value and `@see`. Its body becomes a loop over an explicit stack of frames, one
  frame per suspended Java activation. The JSDoc names the Java lines of the recursive call and says "AC6 (#76): explicit stack,
  same visit and side-effect order".
- **Pre-order walks** (`translateSubtree`, both `drawTree`s, `addNode`): the work the Java does before its loop runs when the
  frame opens. The work inside the loop before the recursive call (the edge `addLine`, red or blue against `mark`; `addNode`'s
  `new Tree` and `s.children.push`) runs when the parent frame advances to that child, then the child frame opens. Children in
  list order.
- **Value-returning walks** (`getMinUnderlap`, `minUnderlapWithSubtree`): the frame holds the tree, the running `minUnderlap`
  and the next child index. The child call receives the parent's running value as `currentMinUnderlap`, exactly as the Java
  passes it. On the child's return the parent applies `Math.min(minUnderlap, result)` with the Java's argument order.
  `getMinUnderlap`'s first statement calls `minUnderlapWithSubtree` as a plain call (it is a loop of its own after the
  conversion). The `c !== child` skip and `minUnderlapWithSubtree`'s `minUnderlap = 0; break` stay where the Java has them: the
  `break` ends that frame's loop and skips the recursive call for that child.
- The trees are not modified during any of the six walks (`translateSubtree` moves nodes, not `children`), so iterating by
  index is safe. State this in a comment, as `compactTree` does.
- Helpers may be extracted for the complexity limits (CCN 10, 30 NLOC, 5 parameters). They stay in the same file. An
  exception propagates from the same point; no catch is added.

## D4: the proof per site

**Decision.** In the #67 and PK6 style, per site:

1. A test-local verbatim recursive transcription of the Java method (the twin), reached through test-only access to the
   private member, as `DepthFirstCompaction.explicit-stack.test.ts:20-33` does.
2. Equality between port and twin on at least 60 seeded trees (`seededRandom` and `randomSpec` over all five `SHAPES` of
   `test/helpers/spore-tree-fixtures.ts`), plus edge cases: a single node, a star, `mark` on a leaf and on an inner child, and
   for `minUnderlapWithSubtree` touching rectangles on all four sides so that the `break` arm runs. Compare at raw bits
   (`doubleBits`) for returned values and node positions. For the `drawTree`s compare the SVG text of an enabled `SVGImage`
   (a non-null file name; the document from its private `buildDocument`, test-only access). For `translateSubtree` compare the
   call order of `Node.translate`. For `addNode` compare the tree structure and the `Node` identity of every position, also
   through `MaxSTPhase`.
3. A deep path of 20,000 nodes (above every oracle limit #76 measured) that completes at method level. Write it first: it must
   be red (`RangeError`) before the conversion. Run the twin there too: equal, or a `RangeError` (the B8 pattern,
   `DFSNodeOrderCycleBreaker.test.ts:209-224`).
4. A path of `MAX_STACK_DEPTH + 2` nodes throws `RangeError(STACK_OVERFLOW_MESSAGE)` (D7), if it runs in under 10 s; otherwise
   the test states why it is omitted. None of the six walks can run without end, because the trees are built acyclic by
   `addNode` from `NaiveMinST`'s output; say so in the test.

The existing `DepthFirstCompaction.explicit-stack.test.ts` and `GrowTreePhase.explicit-stack.test.ts` gain new `describe`
blocks. Their existing cases and assertions do not change (AD-13). `MinSTPhase.explicit-stack.test.ts` is new. If a file would
pass about 500 lines, a second file `<Class>.walks.explicit-stack.test.ts` is a push-forward.

The landed replays (`spore-layout.json`, `spore.json` through `src/alg/spore`, `src/alg/common/spore` and
`test/helpers/spore-*.test.ts`) must pass unchanged after each conversion.

## D5: whole-pipeline equality against the unconverted port

**Decision.** T1 runs the **unconverted** port (a `git archive` snapshot of the base) on the chain of each algorithm at
`D_oracle(alg)` with `node --stack-size=7000` (under `ulimit -s` 8176 KB; a `Worker` with `resourceLimits.stackSizeMb` if not
enough) and keeps the exported JSON as the reference. After the conversions, the converted port on the default stack must
produce **byte-identical** output. If the reference already differs from the oracle beyond 1e-6, the divergence is
pre-existing: stop 2.

**Rejected.** An oracle-only comparison. A 1e-6 tolerance would hide a reordered `Math.min` chain or translation, and the ruling
asks for the same results.

## D6: the probe harness is scratch, journaled verbatim

**Decision.** `$TMPDIR/spore-recursion-depth/probe/` starts as a copy of #70's harness, whose text is in
`plans/component-dfs-depth/decision-journal.md` § Scratch harness (from line 42; #67's base scripts are in
`plans/tree-recursion-depth/decision-journal.md` from line 41). `gen.mts` gains `sporeOverlap` and `sporeCompaction` with the
D1 chain. T1 journals the changed scripts verbatim. Nothing is committed.

**Rejected.** A committed `tools/` probe; #67 and #70 kept theirs scratch.

## D7: the depth check

**Context.** Every #67 and #70 conversion calls `checkStackDepth(stack.length)` after each frame push
(`src/java/lang/StackDepth.ts`, limit 100,000), including visited-mark searches that cannot run without end. The PK6 loops
`compactTree` and `growAt` predate #67 and have none. #167 (`queue:ready`, a ruling request) asks whether the fixed limit is the
right model (Q1, Q2) and whether loops that cannot run without end should call it (Q3, naming spore and #76).

**Decision.** The six new loops call `checkStackDepth(stack.length)` after each frame push, as every #67 and #70 site does.
`compactTree` and `growAt` are left as they are: whether earlier loops gain the check is #167 Q3. T4 comments on #167 naming the
six new call sites.

**Rejected.**

- (a) No check on the new loops. They would differ from every other loop of the same ruling, and #167's answer could no longer
  be applied to all of them at once.
- (b) Adding the check to `compactTree` and `growAt` too. That answers #167 Q3 before the maintainer does.

## D8: what does not change

No landed ref, golden, vector or expected value changes. There is no oracle patch and no `ELK_COMMIT` change. The flag-gated
`full/compaction/chain2000/default` row stays behind `SPORE_CHAIN_FULL`. Nothing changes outside the three source files, their
tests, `test/helpers/spore-tree-fixtures.ts` (additive builders only, if T2 needs them), the docs, `plans/` and
`.agent-notes/`, except a D2 site T4 converts (journaled).

## Auto-confirmed (unattended)

Planned 2026-11-24 by `/plan-mission --unattended next --branch chore/issue-queue`.

- **Selection.** `next` resolved to #76, the lowest-numbered open `queue:ready` issue. No open issue is `queue:planned`. None of
  the `queue:ready` issues carries `queue:on-branch` or a "Blocked by" line. #76 carries the maintainer's answer on the issue
  itself (D0). #167 does not block it: D7 follows the landed call and changes no value.
- **D1** chose warm-up ladders with a 90-minute time cap. Evidence: #76's table; the cold-against-warm findings of #67 and #70
  (`.agent-notes/tree-recursion-depth.md`, `.agent-notes/component-dfs-depth.md`); the cubic compaction cost
  (`plans/alg-packing/decision-journal.md:51, 59`). Rejected: per-site numbers, an uncapped grid, a second shape.
- **D2** converts the six named sites and keeps `ShrinkTreeCompactionPhase.draw`. Evidence: #76; PK6's journal row
  (`plans/alg-packing/decision-journal.md:59`, "only `ShrinkTreeCompactionPhase.draw` is gated by `DEBUG_SVG`"); a planning scan
  for self-calls. Rejected: converting `draw` too (no measurable bar in debug mode; outside the issue's list).
- **D5** requires byte identity against the unconverted port, #67's and #70's reading of "same output/results", which landed
  without objection.
- **D7** chose the landed `checkStackDepth` call on the new loops only. Evidence: every #67 and #70 site; #167 Q3.
- **Parallel T2/T3.** `DepthFirstCompaction` (alg.common) and `GrowTreePhase`/`MinSTPhase` (alg.spore) share no file;
  `test/helpers/spore-tree-fixtures.ts` belongs to T2 alone.
- **No `.claude/settings.autonomous.json`.** The queue driver supplies permissions.
