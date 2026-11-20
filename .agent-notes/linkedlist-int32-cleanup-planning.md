<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: linkedlist-int32-cleanup (issue #47, 2026-11-19)

## Observation: TypeScript 7 has no JS compiler API

- **Context**: Writing a type-aware scan for `LinkedList` receivers with `require('typescript')`.
- **Finding**: `node_modules/typescript` is 7.0.2 (native); `require('typescript')` fails with `MODULE_NOT_FOUND`
  (ESM package, no `createProgram`). LSP `findReferences` on `LinkedList.remove` returned only the declaration.
- **Impact**: Type-driven enumeration needs another route (Java-side enumeration, `rg`, ast-grep, LSP hover per site).
- **Confidence**: High

## Observation: known KVector value-equality sites are already handled

- **Context**: Grepping callers of equality methods in files that use `KVectorChain` / `LinkedList<KVector>`.
- **Finding**: `HypernodesProcessor.ts:24-35` has `removeEqual` (Java `HypernodesProcessor.java:178`); the junction
  point sets in `PolylineEdgeRouter.ts:194` and `BaseRoutingDirectionStrategy.ts:44` are value-hashed `JavaHashSet`s.
  No other hit in the grep; the grep misses receivers typed through `getProperty(...)`.
- **Impact**: T1 likely finds few or no `differs` rows for `KVector`; boxed-number lists (`NaN`, `-0.0`,
  `remove(int)` vs `remove(Object)`) are the less-explored part.
- **Confidence**: Medium (grep, not type-driven)

## Observation: some crossing accumulators are Java `double`

- **Context**: Reading `LayerSweepCrossingMinimizer.java:393-445` for D4.
- **Finding**: `:393` `int totalCrossings` (ported with `Int32.add`), but `:416` `double totalCrossings` adds an `int`
  count and a `double` model-order influence (`LayerSweepCrossingMinimizerCounting.ts:158`, bare `+` is correct). The
  thoroughness loops (`:195-230`) only compare.
- **Impact**: Converting by name or by file would be wrong; classify each site by the Java declared type.
- **Confidence**: High

## Observation: planning baseline at `8af2af35`

- **Context**: Phase 8 pre-flight, load ~6 falling.
- **Finding**: `format:check`, `typecheck`, `complexity` clean; full suite with the nine sweep dirs off: 1,172 files
  passed, 10 skipped; **49,293 passed, 93 skipped, 0 failed**, 123.7 s (fewer than dev-assert's 49,492 because
  `8af2af35` consolidated duplicated test helpers).
- **Impact**: The executor's "no existing test result changes" check compares against this count plus new tests.
- **Confidence**: High
