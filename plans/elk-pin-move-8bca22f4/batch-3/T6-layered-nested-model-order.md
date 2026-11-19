<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: layered nested model order check (eclipse-elk/elk#1241)

**Agent:** typescript-pro (sonnet), or the orchestrator. **Decisions:** D6, D9.

## Context

`ElkGraphImporter.java` (layered) at `8bca22f4` calls `ensureNoModelOrderStrategies(lnode, nestedGraph)` (`:377`) right
after `nestedGraph.setParentNode(lnode)`, and defines it at `:511-566` (Javadoc and body). It throws
`UnsupportedConfigurationException` when a nested graph under `INCLUDE_CHILDREN` sets:

- `MODEL_ORDER`, `GREEDY_MODEL_ORDER`, `SCC_CONNECTIVITY` or `SCC_NODE_TYPE` cycle breaking;
- `DFS_NODE_ORDER` or `BFS_NODE_ORDER` with the CB group order strategy `ENFORCED`;
- a `CONSIDER_MODEL_ORDER_STRATEGY` other than `NONE`;
- `CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER` with `LAYER_SWEEP`.

The current port reaches the cycle breakers and fails on the missing `MAX_MODEL_ORDER_NODES` (#84). The port site is
`src/alg/layered/graph/transform/ElkGraphImporterHierarchical.ts:126`. Already in the port:
`src/core/UnsupportedConfigurationException.ts`, `src/alg/layered/options/GroupOrderStrategy.ts`, and
`LNode.getDesignation` (`src/alg/layered/graph/LNode.ts:390`).

## Task

1. Port `test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/NestedModelOrderConfigurationTest.java`
   (new, 227 lines) as `src/alg/layered/NestedModelOrderConfigurationTest.test.ts`, every test with its expected message.
   It is red before the port.
2. Port the call and the method (D6): switch groups as in the Java, the `default:` arm, the message concatenation
   verbatim, and enum text through each enum's `toString` (the Java concatenates enum values). The two new imports have
   no TS effect beyond the `import` lines.
3. Run `src/alg/layered/graph/transform`, the new test, and `src/alg/layered` (the replay tests). No layered ref is
   expected to change unless T3 journaled one under #1241.
4. Renumber layered `ElkGraphImporter.java:N` references in `src/alg/layered/**`, `test/helpers/layered-*` and
   `tools/vectors/Layered*.java` comments past `:37`, `:45`, `:374` and `:507` (+1, +2, +3, +59; D9). Be careful: spore
   and force have their own `ElkGraphImporter.java`.

## Write-set

`src/alg/layered/graph/transform/ElkGraphImporterHierarchical.ts` (and `ElkGraphImporterModelOrder.ts` if D6's split is
needed); `src/alg/layered/NestedModelOrderConfigurationTest.test.ts`; line-reference comments in `src/alg/layered/**`,
`test/helpers/layered-*` and `tools/vectors/Layered*.java`.

## Read-set

`git -C ../elk diff e7eaea57 8bca22f4 -- plugins/org.eclipse.elk.alg.layered test/org.eclipse.elk.alg.layered.test`;
issue #84 (mechanism, minimal input); `ElkGraphImporterHierarchical.ts:100-150`.

## Acceptance criteria

- Given #84's minimal `.elkt` input (`hierarchyHandling: INCLUDE_CHILDREN`, nested `cycleBreaking.strategy:
  MODEL_ORDER`), when the port lays it out, then it throws `UnsupportedConfigurationException` with the Java's message
  for node `p`.
- Given every ported `NestedModelOrderConfigurationTest` case, when it runs, then it passes. The same cases with
  `SEPARATE_CHILDREN` lay out without throwing, as the Java test asserts.
- Given `src/alg/layered`, when the full layered suite runs, then it is green with no assertion change.

## Interface contracts

None consumed. Output for T7: the corpus case `native/layered/hierarchy-include/examples/user-hints/model-order/modelOrderCycleBreaking`
throws `UnsupportedConfigurationException` on both sides.

## Observability / rollback

N/A: no new observable operations. Reversible.
