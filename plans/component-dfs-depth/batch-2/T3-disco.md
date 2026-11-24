<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: disco `ElkGraphComponentsProcessor.dfs`

**Agent:** `claude` (opus). **Budget:** 45 min. **Commit:** by the orchestrator, one.

## Context

`ElkGraphComponentsProcessor.split` (`src/alg/disco/transform/ElkGraphComponentsProcessor.ts:47-62`) fills static
`visited`, `incidenceMap` and `components` fields, then runs the recursive `dfs` (`:267-278`, Java
`org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphComponentsProcessor.java:207-217`). For each
neighbour in the node's incidence `Set`, `dfs` tests `visited.includes(node)` (the Java's `List.contains`, linear) and
recurses. A neighbour pushed earlier in the same loop can become visited by the time its turn comes. The test therefore
runs per neighbour, when the iterator reaches it, as in the Java. On a 16,000-node path the port overflows, where the oracle
completes (#70).

## Task

1. Write `src/alg/disco/transform/ElkGraphComponentsProcessor.explicit-stack.test.ts` (D4) with:
   - a verbatim recursive twin of `dfs` reading the same static fields, swapped in through test-only access, and called
     through `split`;
   - at least 60 seeded `ElkNode` graphs (`ElkGraphUtil` factories, `seededRandom`) that mix paths, cycles, several
     components and isolated nodes, edges in both directions, self-loops, edges between ports, hyperedges with several
     sources or targets, and edges that `computeIncidences` treats specially (`sameHierarchyLevel` false, inner neighbours
     of ports). Read `:73-260` for what it reads;
   - a check that `split` agrees on the components' order and on each component's node order and identity;
   - a 20,000-node path, red before the conversion, with the twin tried (equal or `RangeError`). Time it: the
     `visited.includes` scan is quadratic;
   - the `MAX_STACK_DEPTH + 2` path case (D7) if it runs in under 10 s. Otherwise a comment explains the omission.
2. Convert `dfs` (D3 disco bullet, D7). The helpers stay in `ElkGraphComponentsProcessor.ts`. Update the method JSDoc
   ("Naive recursive implementation"). Keep the Java's sentence and add the AC6 line.
3. Steps 4 and 5 of the [batch overview](overview.md#the-steps-both-tasks).

## Read-set

`src/alg/disco/transform/ElkGraphComponentsProcessor.ts`; the Java file above;
`src/alg/disco/transform/ElkGraphComponentsProcessor.test.ts` (landed cases, must stay green);
`src/alg/mrtree/ComponentsProcessor.ts:118-207`; `src/alg/mrtree/ComponentsProcessor.explicit-stack.test.ts`;
`src/java/lang/StackDepth.ts`; `test/helpers/spore-tree-fixtures.ts` (`seededRandom`); `src/graph/util/ElkGraphUtil.ts`.

## Write-set

`src/alg/disco/transform/ElkGraphComponentsProcessor.ts`,
`src/alg/disco/transform/ElkGraphComponentsProcessor.explicit-stack.test.ts`.

## Interface contracts

Output for T4: `static split(graph: ElkNode): ElkNode[][]` is unchanged. The private `static dfs(start, component): void` is
unchanged.

## Acceptance criteria

- Given 60 or more seeded graphs, when `split` runs with the port and with the twin, then the components are equal in order
  and node identity.
- Given a 20,000-node path, when `split` runs on Node's default stack, then it returns one component in the twin's node
  order. Before the conversion, the same test was red.
- Given the landed disco tests (`npx vitest run src/alg/disco`), when run after the conversion, then all pass unchanged.

**Observability:** N/A. **Rollback:** Reversible (revert the file to its recursive form).
