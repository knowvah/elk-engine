<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — `AlgorithmAssembler`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port algorithm assembler`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). `AlgorithmAssembler` turns phase factories and processor configurations into the ordered list of
`ILayoutProcessor`s an algorithm runs. Missions 6 and 7 depend on its order being exact. Inputs are T4's types and
the `test/helpers/{TestPhases,TestProcessors}.ts` helpers.

## Task
1. Port `J/alg/AlgorithmAssembler.java`. It extends T4's `AbstractRandomListAccessor<ILayoutPhaseFactory<P, G>>`;
   `provideDefault()` returns `null`.
2. **`create(phaseEnum)`** takes the enum class side `{ values(): readonly P[] }` where Java takes `Class<P>` (P7).
   - `numberOfPhases` is `values().length`.
   - `configuredPhases` (an `EnumSet` in Java) becomes a structure that keeps ordinal semantics; only `size()` and
     `add` are used.
3. **`build`** (`:265-308`) keeps its exact order:
   1. The missing-phase check, with Java's message text.
   2. Phase instances by ordinal.
   3. Each non-null phase's configuration added to a fresh `LayoutProcessorConfiguration`, then
      `additionalProcessors`.
   4. For each phase: `processorsBefore(phase)` sorted by `processorComparator`, then the phase itself.
   5. Finally `processorsAfter(last phase)`.
4. **`retrieveProcessor`:** `cache` keys factories by identity (`Maps.newHashMap()`, `:153`) and is used for lookups
   only. A JS `Map` is fine; journal it (P2).
5. Keep the setters `withCaching`, `withFailOnMissingPhase`, `withProcessorComparator`, `clearCache` and `reset`, and
   `setPhase` (with its `configuredPhases.add`) and `addProcessorConfiguration`, all as in Java.
6. Port `JT/alg/AlgorithmAssemblerTest.java` (8 cases) to `src/core/alg/AlgorithmAssemblerTest.test.ts` with the
   exact Java expectations.

## Write-set
`src/core/alg/AlgorithmAssembler.ts`, `src/core/alg/AlgorithmAssemblerTest.test.ts`, colocated unit tests.

## Read-set
- `J/alg/AlgorithmAssembler.java`, `JT/alg/AlgorithmAssemblerTest.java`.
- T4's outputs: `src/core/alg/*.ts`, `src/core/util/AbstractRandomListAccessor.ts`,
  `test/helpers/{TestPhases,TestProcessors}.ts`.
- `src/java/util/EnumSet.ts`.
- `decisions.md#pre-made` (P2, P7).

## Interface contracts (outputs, consumed from mission 6 on)
- `AlgorithmAssembler.create<P, G>(phaseEnum: { values(): readonly P[] }): AlgorithmAssembler<P, G>`.
- `withCaching`, `withFailOnMissingPhase`, `withProcessorComparator`, `clearCache`, `reset`, `setPhase`,
  `addProcessorConfiguration`: each returns `this`.
- `build(graph: G): ILayoutProcessor<G>[]`.

## Acceptance criteria
- Given the 8 `AlgorithmAssemblerTest` cases, when run, then all pass with the Java expectations.
- Given caching on and two `build` calls, when the processors are compared, then the same instances are returned.
  With caching off, new instances are created.
- Given `withFailOnMissingPhase(true)` and a missing phase, when `build` runs, then `IllegalStateException` is thrown
  with Java's message.
- Given processors added before phase 2 in reverse ordinal order, when built, then they appear in ordinal order
  ahead of phase 2.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
