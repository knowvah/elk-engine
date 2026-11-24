<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: tree-recursion-depth (issue #67)

Locked for this mission. A contradiction found during execution is stop 6 ([stop-conditions.md](stop-conditions.md)).

## D0: the ruling this mission executes

The maintainer answered the issue's "Ruling needed" comment (2026-11-21, covering #67, #70 and #76): "again, yes, so long as
results are the same." So a recursion that overflows V8's default stack, on an input the oracle lays out, becomes an
explicit-stack loop proven against a verbatim recursive reference: the AC6 recipe (`plans/alg-common/decisions.md:90`), as
`plans/alg-trees/decisions.md` TR7 already prescribes. Only the tree bundles are in scope; #70 (force, disco) and #76 (spore)
stay open.

## D1: the bar is the oracle's measured depth, per shape

**Context.** The issue's table brackets each overflow to 500 nodes (for example mrtree path: oracle 6,000-7,000, TS
3,000-3,500). JVM overflow depth moves a little between runs (JIT timing).

**Decision.** T1 re-measures, for the six shapes (path and caterpillar for mrtree, radial, vertiflex; default options), the
oracle's completing depth on a 500-step grid from 2,000 to 10,000, in two cold JVM runs. `D_oracle(shape)` is the highest
depth that completed in either run. A shape is **done** when the port, on Node's default stack with JIT, completes at
`D_oracle(shape)` and its layout equals the oracle's at the AD-4 bar (1e-6) there. Overflow is monotone in depth for these
shapes, so no other depth is required. `--jitless` is not part of the bar beyond the unit tests (D4): T19's 2,000-deep jitless
probe can only improve when stack use drops.

**Rejected.** (a) The issue's brackets as written: measured once, no record of the run. (b) "Never overflow below 10,000": the
oracle itself overflows there, so it exceeds what the ruling asks. (c) Convert every input-depth recursion up front: TR7 and
`plans/alg-trees/decisions.md:196` reject it; it would also touch about 30 methods the bar does not need.

## D2: convert in probe order, only what the bar needs

**Decision.** Each bundle track loops: probe the bundle's shapes at `D_oracle`; take the innermost `src/alg/<bundle>/` frame
of the `RangeError` stack as the next site; convert it (D3, D4); re-probe. A track ends when both of its shapes meet D1. A
site is converted only if a probe overflowed in it. [sites.md](sites.md) is the lead list from planning, not a to-do list.
Sites that the bar did not need, including option-gated ones the default-option shapes never reach (vertiflex
`recursiveBentlinePlacement`, the radial compactors and `extend`), stay verbatim and are listed in the close-out follow-up
issue (T6) with the option that reaches them.

**Rejected.** Probing option variants as well (e.g. vertiflex `BEND`): the issue's six shapes define done; the ruling covers
any input, but an open-ended option search has no end condition. The follow-up issue lets the maintainer queue it.

## D3: the conversion recipe

**Decision.** Per site, following the landed precedents (`src/alg/layered/p1cycles/DFSNodeOrderCycleBreaker.ts:19-200`, B8;
`src/alg/layered/components/ComponentsProcessor.ts`, F11; spore PK6):

- The method keeps its name, signature and `@see`. Its body becomes a loop over an explicit stack of frames; one frame is one
  suspended Java activation (node, loop position or live iterator, locals). A JSDoc line names the Java line of the recursive
  call and "AC6 (#67): explicit stack, same visit, side-effect and accumulation order".
- The visit order, every side effect, and every floating-point accumulation happen in the Java order (e.g.
  `calculateWedgeSpace` sums children left to right after each child's own sum; `secondWalk` visits the first child before the
  right sibling). An iterator the Java holds across the recursive call stays a live iterator in the frame, never a snapshot,
  unless the collection provably cannot change during the recursion (state the proof in a comment).
- Mutual or two-site recursion (`secondWalk`'s child and sibling calls, mrtree `ComponentsProcessor.dfs`'s two calls) keeps
  both call sites as separate frame pushes in the Java order.
- Helpers for the frame steps may be extracted to meet the complexity limits (CCN 10, 30 NLOC); they live in the same file
  unless it would pass 500 lines, then in a sibling file named `<Class><Topic>.ts`, as `RelativeXPlacer*.ts` already are.
- An exception thrown inside the recursion propagates from the same point (no catch is added).

## D4: the proof per site

**Decision.** Each converted site gets `src/alg/<bundle>/.../<Class>.explicit-stack.test.ts` (spore naming) with:

1. A test-local verbatim recursive transcription of the Java method (the twin), as `DFSNodeOrderCycleBreaker.test.ts:30-60`.
2. Equality of every observable effect (positions, properties written, lists and their order, return values, raw double bits
   via `doubleBits` where a double is produced) between port and twin on at least 40 seeded trees mixing path, caterpillar,
   star, binary and random shapes (`test/helpers/spore-tree-fixtures.ts` shapes or the bundle's own builders), plus every
   shape the bundle's landed replay already uses if it can be run at method level.
3. One deep case at 10,000 depth (or 3 x the old TS limit, whichever is larger) that completes without overflow, with the twin
   tried and either equal or a `RangeError` (the B8 pattern at `DFSNodeOrderCycleBreaker.test.ts:209-224`).

The landed replays (`radial*.json`, `vertiflex*.json`, `mrtree*.json`) must pass unchanged after every conversion: the
whole-pipeline proof at the recorded shapes.

## D5: whole-pipeline equality at depth, against the unconverted port

**Context.** "So long as results are the same" asks for the same results, not only oracle-close ones.

**Decision.** T1 runs the **unconverted** port (the base sha) on each shape at `D_oracle` with a raised stack
(`node --stack-size=<k>` under the OS limit of `ulimit -s`; T1 finds a `k` that completes) and keeps its exported JSON as the
reference. After the last conversion, the converted port on the default stack must produce **byte-identical** output for every
shape. The oracle comparison of D1 is separate. A shape where the unconverted port already differs from the oracle at
`D_oracle` (beyond 1e-6) has a pre-existing divergence: diagnosis mode, a `follow-up` issue, and the shape counts as done for
this mission if D5 byte identity holds (stop 2).

## D6: the probe harness is scratch, journaled verbatim

**Decision.** `$TMPDIR/tree-recursion-depth/probe/` holds the generator (path and caterpillar ELK JSON per algorithm and depth,
10 x 10 nodes, default options; caterpillar = a spine of N nodes each with one leaf), the oracle run
(`tools/oracle/run.sh --cases`, default `ELK_SWEEP_TIMEOUT_MS` raised as needed), and a TS runner that loads
`tools/corpus/ts-layout-pipeline.ts` `layoutToJson` in a fresh `node` process per case and reports `ok`, `overflow` (with the
innermost `src/alg/` frame of the `RangeError` stack) or `threw`. The comparison uses `test/golden/compare-json.ts`
`compareLayout`. Never committed; T1 pastes the scripts into the journal (the tree-recorder-gaps D8 precedent), so #70 and #76
can reuse them.

**Rejected.** A committed `tools/` probe: the issue asks for conversions, not a tool, and tools sit outside the coverage gate.

## D7: what does not change

No landed ref, golden or expected value changes; no oracle patch; no change outside `src/alg/{mrtree,radial,vertiflex}/**`
apart from docs, `plans/` and `.agent-notes/`. An overflow site outside the three bundles (core, graph, json, alg.common) is
stop 8.

## Auto-confirmed (unattended)

Planned 2026-11-23 by `/plan-mission --unattended next --branch chore/issue-queue`.

- **Selection.** `next` resolved to #67. #66 is the lowest-numbered issue labelled `queue:ready`, but it is also
  `queue:on-branch`: its mission landed as `e30d1c5c` and the `queue:ready` label was re-added at 2026-11-23T21:48Z after
  planning removed it, so it was skipped as done. #67 has no "Blocked by" line and carries the maintainer's ruling (D0).
- **D1** chose the measured per-shape oracle depth over the issue's brackets (unrecorded) and over a fixed 10,000 (beyond
  the oracle). Evidence: the issue table; `docs/conformance.md:1985-1986`; TR7.
- **D2** chose probe order over converting all ~30 inventoried recursions. Evidence: TR7 and its rejected option at
  `plans/alg-trees/decisions.md:196`; the inventory in [sites.md](sites.md).
- **D5** added byte identity against the unconverted port on a raised stack, the strongest reading of "results are the same".
  Rejected: oracle-only comparison (1e-6 tolerates a reordered sum).
- **D6** kept the probe scratch. Rejected: a committed tool (YAGNI; the T19 and #66 precedents are scratch).
- **Parallel tracks** (one per bundle) were chosen because the bundles do not import each other and their write-sets are
  disjoint; rejected: one serial track (about twice the wall time).
