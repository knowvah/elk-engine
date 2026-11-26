<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: `DepthFirstCompaction`, four walks

**Agent:** `claude` (opus). **Budget:** 50 min. **Commit:** by the orchestrator, one.

## Context

`DepthFirstCompaction.compact` (`src/alg/common/spore/DepthFirstCompaction.ts:43-49`) runs `debugOut` once, then the PK6 loop
`compactTree`, whose `removeUnderlap` calls per child: `getMinUnderlap(root, child, …)` over the whole tree, which calls
`minUnderlapWithSubtree` over the child's subtree at each node; `translateSubtree(child, …)`; and `debugOut(tree, child)`, which
calls `drawTree(root, …)` unconditionally (an `SVGImage` with a null file still records the elements). Java:
`org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/spore/DepthFirstCompaction.java`, `getMinUnderlap` `:123-136`,
`minUnderlapWithSubtree` `:138-171`, `translateSubtree` `:173-176`, `drawTree` `:181-195`. #76's oracle limits for isolated
sites (cold JVM): `drawTree` 2,000 ok, 4,000 overflows; `translateSubtree` 4,000 ok, 8,000 overflows; the two underlap walks
8,000 ok, 16,000 overflows. The port overflows at about 2,125, 2,468 and 3,437.

Details to keep:

- `getMinUnderlap` starts with `Math.min(currentMinUnderlap, minUnderlapWithSubtree(tree.node, child, currentMinUnderlap, v))`:
  the subtree walk receives `currentMinUnderlap`, not the running value. Children equal to `child` are skipped; each other child
  receives the running `minUnderlap`.
- `minUnderlapWithSubtree` per child: `touches` → if `wouldMoveIntoEachOther`, `minUnderlap = 0` and `break` (no recursive call
  for that child, no later children); otherwise `Math.min(minUnderlap, r.distance(c, v))`; then the recursive call with the
  running value, combined by `Math.min`.
- `drawTree`: `rects` rect and `centers` circle on entry; per child, the `edges` line red (dashed) when `c === mark`, blue
  otherwise, then the recursive call.

## Task

1. Add to `src/alg/common/spore/DepthFirstCompaction.explicit-stack.test.ts` one `describe` per site (D4): a verbatim recursive
   twin, at least 60 seeded trees over all `SHAPES` with `orthogonal` false and true where it matters, the edge cases of D4
   (touching rectangles on all four sides for the `break` arm), the 20,000-node deep case (red first) with the twin tried, and
   the `MAX_STACK_DEPTH + 2` case. Compare returned values at raw bits, `Node.translate` call order for `translateSubtree`, and
   the SVG document text for `drawTree` (an `SVGImage` with a non-null file name; its private `buildDocument`, test-only access).
2. Add one whole-`compact` case: on at least 60 seeded trees, `compact` with the four twins installed (`vi.spyOn` on the private
   statics) equals `compact` with the converted methods, at raw bits of every node and in the SVG text after the last
   `debugOut`.
3. Convert the four methods (D3, D7), one at a time, each with its JSDoc citing the Java lines and "AC6 (#76)". Update the
   class-level or method comments that say these walks are verbatim.
4. Steps 4 and 5 of the [batch overview](overview.md#the-steps-both-tasks).

## Read-set

`src/alg/common/spore/DepthFirstCompaction.ts`; the Java file above; `src/alg/common/spore/Node.ts`; `src/alg/common/Tree.ts`;
`src/alg/common/utils/SVGImage.ts`; `src/alg/common/spore/DepthFirstCompaction.explicit-stack.test.ts`;
`test/helpers/spore-tree-fixtures.ts`; `src/java/lang/StackDepth.ts`; `src/alg/mrtree/p3place/NodePlacer.ts` (a #67 loop with
value-carrying frames).

## Write-set

`src/alg/common/spore/DepthFirstCompaction.ts`, `src/alg/common/spore/DepthFirstCompaction.explicit-stack.test.ts`,
`test/helpers/spore-tree-fixtures.ts` (additive builders only; its own test must stay green).

## Interface contracts

None consumed by T3. For T4: `DepthFirstCompaction.compact(tree, orthogonal[, debugOutputFile])` keeps its signatures; the
four private statics keep their names and parameter lists (the PK6 test spies on `getMinUnderlap`, `translateSubtree` and
`debugOut` by name).

## Acceptance criteria

- Given 60 or more seeded trees per site, when the converted method and its twin run, then results, call order and SVG text
  are equal.
- Given touching rectangles on each of the four sides, when `minUnderlapWithSubtree` runs, then both forms return 0 and stop
  at the same child.
- Given a 20,000-node path, when each of the four walks runs on Node's default stack, then it completes (it was red before),
  and the twin is equal or throws `RangeError`.
- Given the landed spore and alg.common spore tests, when run after the conversion, then all pass unchanged, including the PK6
  cases of the same file.

**Observability:** N/A. **Rollback:** Reversible (revert the file to its recursive form).
