<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — `compaction/options` enums and `PolyominoOptions` codegen (P3)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T1): port polyomino option enums and generate polyomino options`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). `Polyomino.melk` is vendored in `tools/melk/sources/` and declares
`metadataClass options.PolyominoOptions` with three enum-typed options. `PolyominoCompactor` (T12) reads them; disco
(8a) registers them later.
- `tools/melk/config.ts` `PENDING_TYPES` is already empty.
- Emission is chosen by the bundle names passed to `generate`. `DEFAULT_BUNDLES = ['Core', 'Labels']` is pinned by
  `test/melk/emit.test.ts:110-119`: never change it (stop 6).

## Task
1. Port `J/compaction/options/{TraversalStrategy,LowLevelSortingCriterion,HighLevelSortingCriterion}.java` as TS enum
   classes with `ordinal()`, `name()`, `compareTo()` and static `values()`/`valueOf()`. Follow
   `src/core/options/Alignment.ts`.
2. Generate `src/alg/common/compaction/options/PolyominoOptions.ts` with `npm run melk:generate Polyomino`.
   - If the generator cannot place an `alg.common` class or resolve the enums, the minimal generator change is in this
     task's write-set (`tools/melk/*.ts`, with tests). It must not change the output for `Core` or `Labels`.
   - Check that every existing generated file is byte-identical after running the generator for `Core`, `Labels` and
     `Polyomino` (stop 6).
   - Constants are cached static getters where they read another options class (M12/M16 ESM-cycle rule).
3. Add `test/melk/polyomino-options.test.ts`:
   - generating `Polyomino` with `write: false` equals the committed file (freshness);
   - every option id, default and target equals the `.melk` source;
   - importing `PolyominoOptions` first, before `CoreOptions`, throws no TDZ error.

## Write-set
- `src/alg/common/compaction/options/{TraversalStrategy,LowLevelSortingCriterion,HighLevelSortingCriterion,PolyominoOptions}.ts`
- colocated tests
- `tools/melk/*.ts`, only if generation needs it, with tests
- `test/melk/polyomino-options.test.ts`

## Read-set
- The three Java enums and `tools/melk/sources/Polyomino.melk`.
- `tools/melk/{generate,config,emit,model-ported}.ts`, `test/melk/emit.test.ts:100-140`.
- A landed generated file, e.g. `src/core/options/FixedLayouterOptions.ts`.
- `src/core/options/Alignment.ts`.
- `plans/core-engine/decisions.md` (M12, M16).

## Interface contracts (outputs, consumed by T12)
- `TraversalStrategy`, `LowLevelSortingCriterion`, `HighLevelSortingCriterion`: enum classes with Java constant names.
- `PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY`, `POLYOMINO_LOW_LEVEL_SORT`, `POLYOMINO_HIGH_LEVEL_SORT` and
  `POLYOMINO_FILL`, named as the generator emits them.

## Acceptance criteria
- Given the generator run for `Core`, `Labels` and `Polyomino`, when `git status` runs, then only
  `PolyominoOptions.ts` is new, and no landed generated file changed.
- Given `PolyominoOptions`, when its options are read, then the ids, defaults and targets equal `Polyomino.melk`.
- Given a fresh module graph that imports `PolyominoOptions` first, when it loads, then no `ReferenceError` occurs.
- Given `test/melk/emit.test.ts`, when run, then it passes unchanged.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
