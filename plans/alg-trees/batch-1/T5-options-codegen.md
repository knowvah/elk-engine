<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Option codegen, enums, radial staging

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): generate tree algorithm options and stage radial factories`
Scratch: `$TMPDIR/alg-trees/T5/`

## Context

Mission 8a, TR4, TR5. `npm run melk:generate Tree Radial VertiFlex` already emits `src/alg/mrtree/options/{MrTreeOptions,MrTreeMetaDataProvider}.ts`,
`src/alg/radial/options/{RadialOptions,RadialMetaDataProvider}.ts` and `src/alg/vertiflex/options/{VertiFlexOptions,VertiFlexMetaDataProvider}.ts`
(dry run at planning); they import hand-ported enums that do not exist yet. `PENDING_TYPES` (`tools/melk/config.ts:11`) holds back
a provider's registration while its class is unported (X3: the options class is still emitted). The landed metadata vector
`test/golden/refs/java/metadata.json` already holds every `mrtree.*`, `radial.*`, `vertiflex.*` option.

## Task

1. Port the leaf enums whole with `@see`: `M/options/{OrderWeighting,TreeifyingOrder,EdgeRoutingMode,CompactionMode,GraphProperties}`,
   `V/EdgeRoutingStrategy`. Not `M/options/InternalProperties` (imports `TNode`: T6) nor `V/InternalProperties` (T8).
2. Port whole the radial factory enums of TR4 (`R/options/{AnnulusWedgeCriteria,CompactionStrategy,OverlapRemovalStrategy,RadialTranslationStrategy,SortingStrategy}`,
   `R/RadialLayoutPhases`, `R/intermediate/IntermediateProcessorStrategy`) and the seven radial interfaces; stage the 16 targets of
   TR4 (file at the Java path, `// @staged 8a` on line 2, public surface throwing the staged message, `staged-classes.json` row
   sorted by path). Widen `MARKER` in `test/architecture/staged-classes.fitness.test.ts` exactly as TR4 says.
3. Add the three providers to `PENDING_TYPES`; add enums to `NON_LEAF_DEFAULT_TYPES` where the import smoke needs lazy defaults;
   run `npm run melk:generate Tree Radial VertiFlex` and commit its output unedited.
4. Tests: one test file per bundle under `test/melk/` following `polyomino-options.test.ts`: the generated registrations equal the
   `metadata.json` rows for that bundle's options (ids, types, defaults, targets, groups); enum tests with ordinals and names from
   the Java; for each staged class, that it throws the staged message. Run the per-module import smoke
   (`npx tsx -e "import('./<file>')"`) over every new module.
5. `npm run melk:generate Core Labels Polyomino Layered` must leave `src/` byte-identical.

## Write-set

`src/alg/mrtree/options/{OrderWeighting,TreeifyingOrder,EdgeRoutingMode,CompactionMode,GraphProperties,MrTreeOptions,MrTreeMetaDataProvider}{,.test}.ts`,
`src/alg/radial/options/**`, `src/alg/radial/{RadialLayoutPhases,intermediate/IntermediateProcessorStrategy}{,.test}.ts`, the seven
radial interface files, the 16 staged files of TR4 (at their Java paths under `src/alg/radial/`), `src/alg/vertiflex/options/**`,
`src/alg/vertiflex/EdgeRoutingStrategy{,.test}.ts`, `tools/melk/config.ts`, `test/architecture/staged-classes.json`,
`test/architecture/staged-classes.fitness.test.ts` (the `MARKER` line and header comment only),
`test/melk/{mrtree,radial,vertiflex}-options.test.ts`.

## Read-set

`tools/melk/{config,generate,emit}.ts`, `test/melk/{polyomino-options,layered-options}.test.ts`, `test/melk/{helpers,recorder}.ts`,
`M/options/*.java`, `R/options/*.java`, `R/RadialLayoutPhases.java`, `R/intermediate/IntermediateProcessorStrategy.java`, the 7
interfaces, `V/EdgeRoutingStrategy.java`, `.agent-notes/layered-framework.md` (TDZ, held-back class), `decisions.md` TR4, TR5.

## Interface contract (consumed by T6–T17)

The generated `MrTreeOptions`, `RadialOptions`, `VertiFlexOptions` constants (Java names); the enums with Java names and ordinals;
each staged class's constructor and public methods with the Java signatures (porting tasks replace bodies in place).

## Acceptance criteria

- Given `metadata.json`, when the generated providers register into a recorder, then every `mrtree.*`, `radial.*`, `vertiflex.*`
  option matches (algorithms held back by `PENDING_TYPES` are asserted as held back).
- Given the staged fitness test, then all 16 staged files and rows agree and existing checks are unchanged.
- Given every new module as the entry, when imported alone, then no temporal-dead-zone error occurs.
- Given `melk:generate Core Labels Polyomino Layered`, then `git diff --exit-code src/` is clean.

## Observability / Rollback

N/A — no new observable operations. Reversible.
