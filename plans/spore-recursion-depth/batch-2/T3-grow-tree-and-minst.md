<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: `GrowTreePhase.drawTree` and `MinSTPhase.addNode`

**Agent:** `claude` (opus). **Budget:** 45 min. **Commit:** by the orchestrator, one.

## Context

- `GrowTreePhase.debugOut` (`src/alg/spore/p3execution/GrowTreePhase.ts:97-107`) runs after every `growChild` and calls
  `drawTree(root, svg)` (`:116-122`, Java `org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p3execution/GrowTreePhase.java:108-114`)
  unconditionally: `n` rect on entry, then per child the `e` line and the recursive call. #76: port ~2,187, oracle 2,000 ok
  (cold). After PK6 it bounds the real `growAt` run.
- `MinSTPhase.convert` (`src/alg/spore/p2processingorder/MinSTPhase.ts:77-83`) calls `addNode` (`:89-95`, Java
  `org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/p2processingorder/MinSTPhase.java:90-96`), which per child of the
  vector tree creates `new Tree(nodeMap.get(tTree.node))`, appends it to `s.children`, then recurses. `MaxSTPhase` reaches it
  through `convert`. #76: port ~4,406, oracle 8,000 ok (cold).

## Task

1. Add to `src/alg/spore/p3execution/GrowTreePhase.explicit-stack.test.ts` a `describe` for `drawTree` (D4): a verbatim
   recursive twin, at least 60 seeded trees over all `SHAPES` from `test/helpers/spore-tree-fixtures.ts`, the SVG document text
   of an enabled `SVGImage` compared (private `buildDocument`, test-only access), a whole-`process`-style case where `growAt`
   with the twin `drawTree` equals the converted one in nodes at raw bits and the SVG text of the last `debugOut`, the
   20,000-node deep case (red first) with the twin tried, and the `MAX_STACK_DEPTH + 2` case.
2. Create `src/alg/spore/p2processingorder/MinSTPhase.explicit-stack.test.ts`: a verbatim recursive twin of `addNode`, at least
   60 seeded vector trees (paths, stars, random, binary, caterpillar; a test-local `Tree<KVector>` builder is fine), compared on
   tree structure and the identity of the `Node` at every position, through `convert` for `MinSTPhase` and `MaxSTPhase`; the
   20,000-node deep case (red first) with the twin tried; the `MAX_STACK_DEPTH + 2` case.
3. Convert both methods (D3, D7), each with its JSDoc citing the Java lines and "AC6 (#76)". `addNode` keeps the comment
   "Recursive function …" only as the Java's wording, followed by the AC6 note.
4. Steps 4 and 5 of the [batch overview](overview.md#the-steps-both-tasks).

## Read-set

The two sources and Java files above; `src/alg/spore/p2processingorder/MaxSTPhase.ts`; `src/alg/common/Tree.ts`;
`src/alg/common/utils/SVGImage.ts`; `src/alg/spore/p3execution/GrowTreePhase.explicit-stack.test.ts`;
`src/alg/spore/p2processingorder/MinSTPhase.test.ts`; `test/helpers/spore-tree-fixtures.ts` (read only);
`src/java/lang/StackDepth.ts`.

## Write-set

`src/alg/spore/p3execution/GrowTreePhase.ts`, `src/alg/spore/p3execution/GrowTreePhase.explicit-stack.test.ts`,
`src/alg/spore/p2processingorder/MinSTPhase.ts`, `src/alg/spore/p2processingorder/MinSTPhase.explicit-stack.test.ts`.

## Interface contracts

None consumed by T2. For T4: `GrowTreePhase.process` and `MinSTPhase.convert` keep their signatures; `drawTree` and `addNode`
keep their names and parameter lists.

## Acceptance criteria

- Given 60 or more seeded trees, when `drawTree` and its twin draw into enabled `SVGImage`s, then the documents are equal.
- Given 60 or more seeded vector trees, when `convert` runs with `addNode` and with its twin, through `MinSTPhase` and
  `MaxSTPhase`, then the trees are equal in structure and `Node` identity.
- Given a 20,000-node path, when each walk runs on Node's default stack, then it completes (it was red before), and the twin is
  equal or throws `RangeError`.
- Given the landed spore tests, when run after the conversion, then all pass unchanged, including the PK6 cases.

**Observability:** N/A. **Rollback:** Reversible (revert the files to their recursive form).
