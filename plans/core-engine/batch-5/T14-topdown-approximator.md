<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — `TopdownSizeApproximator{,Util}`; `PENDING_TYPES` emptied

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T14): port the topdown size approximator and empty pending types`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Last link of the codegen chain. `TopdownSizeApproximator` is a Java enum whose constants have bodies
(`COUNT_CHILDREN`, `LOOKAHEAD_LAYOUT`, `FIXED_INTEGER_RATIO_BOXES`, `LAYOUT_NEXT_LEVEL`) implementing
`src/core/options/ITopdownSizeApproximator.ts`; port per `docs/translation-rules.md` §6.3 (class + static readonly
instances in declaration order, `ordinal()`, `values()`, `valueOf`). `LOOKAHEAD_LAYOUT` copies the graph
(`Map<ElkNode, ElkNode>`, identity → `Map`) and runs a provider from the instance pool with
`NullElkProgressMonitor`; `LAYOUT_NEXT_LEVEL` sets `FixedLayouterOptions.ALGORITHM_ID` and resolves with
`LayoutAlgorithmResolver`. Emptying `PENDING_TYPES` releases the last held-back registration
(`topdown.sizeCategories` → `topdown.sizeApproximator` dependency) and lets `CoreOptions` reference the enum.

## Task
1. Port `J/options/TopdownSizeApproximator.java` (228) and `J/options/TopdownSizeApproximatorUtil.java` (109).
2. Remove `TopdownSizeApproximator` from `PENDING_TYPES` (the list is now `[]`); `npm run melk:generate`; commit the
   regenerated `CoreOptions.ts`.
3. Tripwires (M9): `PENDING_TYPES` assertion states `[]`; the C1 mechanism tests keep their test-local list; the live
   registry comparison expects no held-back calls; `JsonMetaDataConverter.test.ts` no longer has deferred rows
   (`MISSION5_PROVIDERS` may now be empty — removing the scaffolding entirely is T18's job; here only make it pass).
   Journal each edit with T14.
4. Tests from the Java source for each constant (graph sizes, size categories, multipliers).

## Write-set
`src/core/options/{TopdownSizeApproximator,TopdownSizeApproximatorUtil}.ts` (+ tests), `tools/melk/config.ts`,
`src/core/options/CoreOptions.ts` (generated only), `test/melk/**`, `src/graph/json/JsonMetaDataConverter.test.ts`.

## Read-set
The two Java files; `src/core/options/{ITopdownSizeApproximator,TopdownNodeTypes}.ts`; `src/core/util/{ElkUtil,
NullElkProgressMonitor,InstancePool}.ts`; `src/core/data/LayoutAlgorithmResolver.ts`; `docs/translation-rules.md` §6.3;
T8's codegen read-set.

## Interface contracts (outputs)
`TopdownSizeApproximator.COUNT_CHILDREN | LOOKAHEAD_LAYOUT | FIXED_INTEGER_RATIO_BOXES | LAYOUT_NEXT_LEVEL`
(`getSize(node): KVector`); `TopdownSizeApproximatorUtil.getSizeCategoryMultiplier`, `getGraphSize`. Consumed by T16.

## Acceptance criteria
- Given a node with 3 children and the Java defaults, when `COUNT_CHILDREN.getSize` runs, then the Java size.
- Given `LAYOUT_NEXT_LEVEL` on a node with two children, when run, then the node's algorithm is fixed, the provider
  ran with a `NullElkProgressMonitor`, and the returned size equals the Java computation.
- Given `npm run melk:generate`, then the full TS registry equals the JVM core-only metadata dump with nothing held back.
- `PENDING_TYPES` is `[]` and the README after-batch-5 grep passes.

## Observability / Rollback
N/A. Reversible: revert the commit.
