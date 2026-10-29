<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — The five layering-adjacent processors

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port node promotion, high-degree and partition processors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7b (README), SC1. `GraphConfigurator` adds these between P1 and P3 by option
(`J/GraphConfigurator.java:258-283`): `NODE_PROMOTION` before P3, `HIGH_DEGREE_NODE_LAYER_PROCESSOR` before P3,
`PARTITION_PREPROCESSOR` before P1, `PARTITION_MIDPROCESSOR` before P2, `PARTITION_POSTPROCESSOR` before P3. Same
porting rules as T4.

## Task

1. Tests first per class on the `scenarios/<Class>/*` rows (pre-states built by `layers`/`setProperty` steps), as T4.
2. Port `NodePromotion` (752 lines → facade + section files at the Java section comments, P1 pattern; nested
   `Promotion…` types per M15), `HighDegreeNodeLayeringProcessor` (385), `PartitionPreprocessor` (155),
   `PartitionMidprocessor` (121; the created ports and edges keep the Java creation order, the dump names them
   `new/p<k>`, `new/e<k>`), `PartitionPostprocessor` (69).
3. B8: `NodePromotion.promoteNode` (`:629`) and `HighDegreeNodeLayeringProcessor.degree` (`:268`) become explicit-stack
   loops with verbatim twins and a deep case under `--jitless`.
4. `NodePromotionStrategy` arms: all 10 values must be reachable through the processor's `switch`; percentage
   strategies use the Java integer arithmetic (`Int32` where the Java is `int`).

## Write-set

`S/intermediate/{NodePromotion,NodePromotion*,HighDegreeNodeLayeringProcessor,PartitionPreprocessor,PartitionMidprocessor,PartitionPostprocessor}.ts`
and their `.test.ts`; `test/architecture/staged-classes.json` only under L1.

## Read-set

The five Java files; `S/graph/*.ts` (API), `S/options/{InternalProperties,LayeredOptions,NodePromotionStrategy,
GraphProperties}.ts`, `src/java/lang/Int32.ts`, `test/helpers/layered-phase-replay-*.ts`, `decisions.md` B8, SC1.

## Interface contract (consumed by T8)

As T4: no-argument constructors, `process(graph, monitor)`.

## Acceptance criteria

- Given every `scenarios/<Class>/*` row, when replayed with the class injected, then no diff, including the 9
  non-NONE promotion strategies.
- Given `promoteNode` and `degree`, when run on the rows and a deep case, then loop equals twin, no overflow.
- Given gates (typecheck, complexity, prettier), when run, then clean; no file over 500 lines.

## Observability / Rollback

N/A. Reversible.
