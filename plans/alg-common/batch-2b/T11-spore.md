<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Spore helpers and replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T11): port spore overlap check and depth-first compaction`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). `alg.spore` (8x) uses these. There are no Java tests; T4's `spore` section is the evidence.
- T2 landed `TEdge`, `Tree`, `Utils`, `SVGImage`, `compaction/Scanline` and `spore/InternalProperties`.

## Task
1. Port `J/spore/{Node,IOverlapHandler,ScanlineOverlapCheck,DepthFirstCompaction}.java`, with nested classes
   (`ScanlineOverlapCheck`'s timestamp and handler types) in prefixed files (M15).
   - Every `/*d*/` `SVGImage` call stays verbatim (AC4).
   - `IOverlapHandler` is an interface. If it has defaults, it becomes an abstract class (R5).
   - `DepthFirstCompaction.compact` keeps both overloads (§6.5) and the traversal order.
   - `ScanlineOverlapCheck`'s active-set structure and sweep order are kept. Find out which Java collection it uses
     (`TreeSet` with a comparator?) and mirror the ordering semantics exactly; journal it.
2. **Replay** (`src/alg/common/spore/SporeVectors.test.ts`): for every `alg-common.json` `spore` scenario, rebuild the
   input as the recorder did.
   - For `scanline`, assert the recorded overlap pairs in **call order**.
   - For `dfc`, assert every node position bit-exactly.
   - On a mismatch, name the mechanism (stop 5).
3. Add unit tests from the Java for `Node` geometry helpers and the orthogonal vs non-orthogonal branches.

## Write-set
`src/alg/common/spore/{Node,IOverlapHandler,ScanlineOverlapCheck,DepthFirstCompaction}.ts` (+ prefixed nested files),
`src/alg/common/spore/SporeVectors.test.ts`, colocated unit tests.

## Read-set
- The four Java files; `J/compaction/Scanline.java`.
- T2's outputs; `test/golden/refs/java/alg-common.json` (`spore`) and the header of `AlgCommonVectors.java`.
- `src/java/util/` (any landed `TreeSet`-like shim; grep before writing one).

## Interface contracts (outputs, consumed by 8x)
- `new ScanlineOverlapCheck(handler, svg)`, `sweep(nodes)`. `IOverlapHandler.handle(n1, n2)` (Java signature).
- `DepthFirstCompaction.compact(tree, orthogonal, …)`. `Node` with its Java fields and methods.

## Acceptance criteria
- Given every `scanline` scenario, when replayed, then the overlap pairs and their order equal the JVM's.
- Given every `dfc` scenario, when replayed, then the node positions equal the JVM's bit for bit.
- Given `new SVGImage(null)`, when passed to `ScanlineOverlapCheck`, then the sweep result is unchanged and no file
  access happens.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
