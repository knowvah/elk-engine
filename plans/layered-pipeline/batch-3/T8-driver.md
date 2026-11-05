<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `GraphConfigurator`, `ElkLayered`, six arms, F9 edits, entry points

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): port the layered driver and run the pipeline`
`J` as README. Scratch: a private subdirectory `<scratchpad>/T8/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal;
a hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line;
everything else stays verbatim.

## Context

Mission 7f, F2, F5, F9, F10, F11. `test/helpers/layered-phase-replay-normalise.ts` mirrors `configureGraphProperties` line by line
with Java citations: read it first, the port must agree with it and stop 20 applies if it cannot.

## Task

1. `src/alg/layered/GraphConfigurator.ts`: `J/GraphConfigurator.java` verbatim. `final class` with package visibility in Java; export
   it for the driver only. The three configurations are cached static getters (F10). `configureGraphProperties` (`:~98-135`, seed 0
   → unseeded `new Random()`, a structural test only, stop 6), `copyPortContraints`/`copyPortConstraints`, `prepareGraphForLayout`,
   `getPhaseIndependentLayoutProcessorConfiguration` (every branch in Java order: `feedbackEdges` moves `PORT_SIDE_PROCESSOR`
   before P1, direction arms name `DIRECTION_PREPROCESSOR` and `DIRECTION_POSTPROCESSOR`, the `anyMatch` plus `hasProperty` rule of
   `NODE_PLACEMENT_REPEATER`), `activateGreedySwitchFor` static, `isHierarchicalLayout`. Split at Java method and switch boundaries to meet
   the limits; `AlgorithmAssembler` is landed (`src/core/alg/AlgorithmAssembler.ts`).
2. `src/alg/layered/ElkLayered.ts` replaces the stage (F2): every member of `J/ElkLayered.java`, drop `// @staged` and the JSON row;
   `src/alg/layered/ElkLayeredTestExecutionState.ts` stays (M15); `compWork`, `monitorProgress` through `Float32`; `DebugUtil` calls behind
   `monitor.isLoggingEnabled()` as in Java (`:252,:267,:293,:606,:620`), `logDebugGraphSlot` is the mapped name; `Class<?>` arguments of
   `runLayoutTestUntil` become constructors compared by identity; the `instanceof IHierarchyAwareLayoutProcessor` test uses the landed brand helper.
3. `IntermediateProcessorStrategyCreate.ts`: wire this brief's six arms (`GraphTransformer(Mode.TO_INTERNAL_LTR … )` per `J/intermediate/IntermediateProcessorStrategy.java`,
   the Java's exact mode per arm). ARMS test: the six to ported (F9), ported 37, pending 22.
4. `test/architecture/layered-entry-points.fitness.test.ts`: append `ElkLayered.ts`, `GraphConfigurator.ts`,
   `components/ComponentsProcessor.ts`; header names 7f2 as next. Run in a fresh process; a `ReferenceError` is stop 15.
5. **F9, each journaled old and new:**
   - `src/alg/layered/ElkLayered.test.ts`: drop `throws the 7f message`; add driver tests from `full` rows.
   - `src/alg/layered/LayeredLayoutProvider.test.ts`: the two delegate cases assert delegation, spies pass through, with the flat
     case running and the `INCLUDE_CHILDREN` case throwing naming 7h; `imports a flat graph and hands it to the staged doLayout`
     and its `INCLUDE_CHILDREN` twin (`:92`, `:110`) replay `site/provider/flat` and `include-children` for real or to the 7h throw.
     `imports the graph before the staged layout test preparation` asserts real preparation.
   - `test/helpers/layered-site-replay.ts:208,280-300` and `src/alg/layered/LayeredSiteVectors.test.ts:7,25,63`: `site/provider/flat` and
     `cancelled` compare the recorded layout (the `isCanceled` arm re-anchored, 7a hand-off); `include-children*` expect the
     `CompoundGraphPreprocessor` throw naming 7h.
   - `IHierarchyAwareLayoutProcessor.test.ts:48` stays if `ElkLayered` still reports non-aware, which the Java says it does.
6. Structural tests: `activateGreedySwitchFor` truth table from the Java, seed 0 gets a `Random`, `SPACING_EDGE_EDGE` clamp, cancellation
   mid-plan returns early, `isLayoutTestFinished`, `runLayoutTestStep` throws `IllegalStateException` when finished.

## Write-set

`src/alg/layered/{ElkLayered,GraphConfigurator}*.ts` and tests, `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts`,
`src/alg/layered/intermediate/IntermediateProcessorStrategy.test.ts`, `src/alg/layered/LayeredLayoutProvider.test.ts`,
`src/alg/layered/LayeredSiteVectors.test.ts`, `test/helpers/layered-site-replay.ts`, `test/architecture/{staged-classes.json,layered-entry-points.fitness.test.ts}`,
`plans/layered-pipeline/decision-journal.md`.

## Read-set

`J/GraphConfigurator.java`, `J/ElkLayered.java`, `J/intermediate/IntermediateProcessorStrategy.java`, `test/helpers/layered-phase-replay-normalise.ts`,
`src/alg/layered/p4nodes/SimpleNodePlacer.ts:29-47`, `src/core/alg/AlgorithmAssembler.ts`, `src/core/testing/TestController.ts`, `src/alg/layered/ElkLayeredTestExecutionState.ts`,
`test/helpers/layered-site-replay.ts:100-125,205-210,278-300`, `decisions.md` F2, F5, F9–F11, F16.

## Interface contract (consumed by T9–T12)

`ElkLayered`'s Java API as F2 lists it; `GraphConfigurator.activateGreedySwitchFor` static; `prepareGraphForLayout(lgraph)` sets `InternalProperties.PROCESSORS`.

## Acceptance criteria

- Given a fresh process, when each entry-point module is imported, then no `ReferenceError` and exit 0.
- Given `site/provider/flat` and `cancelled`, when replayed, then they match; `include-children*` throw naming 7h.
- Given a graph with an edge label, a comment box or a self loop, when `provider.layout` runs, then the thrown message names 7f2 or 7g.
- Given the ARMS test, when run, then 37 arms are ported and the tally equals F1.
- Given `git diff`, when read, then the only changed assertions are F9's and the journal lists each.

## Observability / Rollback

N/A — no new observable operations. Reversible.
