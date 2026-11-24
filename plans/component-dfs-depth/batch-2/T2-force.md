<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: force `ComponentsProcessor.dfs`

**Agent:** `claude` (opus). **Budget:** 45 min. **Commit:** by the orchestrator, one.

## Context

`ComponentsProcessor.split` (`src/alg/force/ComponentsProcessor.ts:42-70`) runs a recursive `dfs` (`:109-141`, Java
`org.eclipse.elk.alg.force/src/org/eclipse/elk/alg/force/ComponentsProcessor.java:130-155`) whose depth is the length of the
longest path the search walks. Force and stress (`src/alg/force/stress/StressLayoutProvider.ts`) both call `split`. On a
16,000-node path the port overflows V8's default stack, where the oracle completes (#70).

The loop body has two recursive calls per edge, source side (`:146`) then target side (`:149`). It skips every edge
incident to `last` (`:141-144`) and pushes the edge and its labels after both calls (`:152-153`). A self-loop recurses into
neither end and is pushed once per incidence-list entry, which is twice. Parallel edges to `last` are all skipped. Keep all
of it.

## Task

1. Write `src/alg/force/ComponentsProcessor.explicit-stack.test.ts` (D4) with:
   - a verbatim recursive twin of `dfs`, installed on an instance in place of the private method through test-only access,
     and called through `split`;
   - at least 60 seeded `FGraph`s (`seededRandom`) that mix paths, cycles, trees, several components, isolated nodes,
     parallel edges in both directions, self-loops, edges back to the parent, and edges with 0-2 labels;
   - a check that `split` agrees on the components' order and, per component, on node, edge and label order and identity,
     on the renumbered `id`s, and on the copied properties;
   - a case where `SEPARATE_CONNECTED_COMPONENTS` is `false` that leaves `dfs` uncalled (a one-line guard that the
     twin swap is effective is enough);
   - a 20,000-node path, red before the conversion, with the twin tried (equal or `RangeError`);
   - a path of `MAX_STACK_DEPTH + 2` nodes where `split` throws `RangeError` with `STACK_OVERFLOW_MESSAGE` (D7).
2. Convert `dfs` (D3 force bullet, D7). The helpers stay in `ComponentsProcessor.ts`. Update the class JSDoc's sentence about
   `dfs` and the method JSDoc ("Recursive on the input depth, as in Java" no longer holds).
3. Steps 4 and 5 of the [batch overview](overview.md#the-steps-both-tasks).

## Read-set

`src/alg/force/ComponentsProcessor.ts`; the Java file above; `src/alg/force/graph/{FGraph,FNode,FEdge}.ts`;
`src/alg/mrtree/ComponentsProcessor.ts:1-60, 118-207`; `src/alg/mrtree/ComponentsProcessor.explicit-stack.test.ts`;
`src/java/lang/StackDepth.ts`; `src/java/util/LinkedList.ts` (iterator API); `test/helpers/spore-tree-fixtures.ts`
(`seededRandom`); `src/alg/force/ComponentsProcessor.test.ts` (landed cases, must stay green).

## Write-set

`src/alg/force/ComponentsProcessor.ts`, `src/alg/force/ComponentsProcessor.explicit-stack.test.ts`.

## Interface contracts

Output for T4: the converted `split` keeps its signature `split(graph: FGraph): FGraph[]`. The private `dfs` keeps
`(node, last, graph, visited, incidence): FGraph | null`.

## Acceptance criteria

- Given 60 or more seeded graphs, when `split` runs with the port and with the twin, then the components are equal in
  order, identity, ids, edges and labels.
- Given a 20,000-node path, when `split` runs on Node's default stack, then it returns one component of 20,000 nodes and
  19,999 edges in the twin's order. Before the conversion, the same test was red.
- Given a path of 100,002 nodes, when `split` runs, then it throws `RangeError('Maximum call stack size exceeded')`.
- Given the landed force and stress tests (`npx vitest run src/alg/force`), when run after the conversion, then all pass
  unchanged.

**Observability:** N/A. **Rollback:** Reversible (revert the file to its recursive form).
