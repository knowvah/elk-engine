<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4b — NorthSouthPortPreprocessor, HierarchicalPortConstraintProcessor, SemiInteractiveCrossMinProcessor, SortByInputModelProcessor

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4b): port the north-south, hierarchical-port, semi-interactive and model-order processors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7c (README), C2, C6, C7. These processors run between phase 2 and phase 3 in a default pipeline (1,378 Java
lines). Each is proven on the `scenarios/*` rows whose steps run it, with the class injected through
`createProcessor` (7b's batch-2 pattern: see `src/alg/layered/intermediate/LayerConstraintPreprocessor.test.ts`'s
`replay(row)`), before the enum arm exists (T8). Expectations come only from the rows and the Java (L4).

## Task

1. Port each class to `src/alg/layered/intermediate/<Class>.ts` with `@see`, Java method boundaries, section files
   (P1) or M15 files for nested types when the complexity limits require; dummies created by a processor keep the
   Java's creation order (their paths are `new/n<k>`, `new/p<k>`, `new/e<k>`).
2. C6: grep the Java for `==`/`!=` on boxed values and treat each site per E2a; journal in the hand-back.
3. C7: confirm or refute the recursion candidates in these files (`PortSideProcessor.process`,
   `HierarchicalPortConstraintProcessor.processEasternAndWesternPortDummies` are candidates; overloads are not
   recursion); a true recursion becomes an explicit-stack loop with a verbatim twin in the test and a 5,000-node case
   under `--pool=forks --execArgv=--jitless`.
4. Tests: one colocated `<Class>.test.ts` per class replaying every row whose last step runs the class
   (`compareOrder` and `compareOrderFullDump`), plus exception cases with the Java message where the Java throws.
   No hand-derived numeric or algorithmic expectation.
5. Any later-mission member a class references is an L1 staging question for the orchestrator (stop 4), never a stub.

## Write-set

`NorthSouthPortPreprocessor.ts`, `HierarchicalPortConstraintProcessor.ts`, `SemiInteractiveCrossMinProcessor.ts`, `SortByInputModelProcessor.ts`,  and their `.test.ts`; section/M15 files for them; `test/architecture/staged-classes.json` only under L1.

## Read-set

`J/intermediate/{NorthSouthPortPreprocessor,HierarchicalPortConstraintProcessor,SemiInteractiveCrossMinProcessor,SortByInputModelProcessor}.java`, `test/helpers/layered-order-replay-*.ts` and
`layered-phase-replay-ops.ts` (`Factories`), `src/alg/layered/graph/{LGraph,LNode,LPort,LEdge,Layer,LGraphUtil}.ts`,
`src/alg/layered/options/{InternalProperties,LayeredOptions}.ts`, `decisions.md` C2, C6, C7, the rows named
`scenarios/<Class>/*` and the `models/*` rows whose stop is the class.

## Acceptance criteria

- Given every row whose last step or prefix entry runs one of these classes, when replayed with the class injected,
  then `compareOrder` and (where a dump exists) `compareOrderFullDump` return `[]`.
- Given every Java `throw` in these classes, when provoked on a step-built graph, then the TS throws the Java-chain
  class with the Java message.
- Given a confirmed recursion, when run on a 5,000-node case under `--jitless`, then no overflow and the twin agrees.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
