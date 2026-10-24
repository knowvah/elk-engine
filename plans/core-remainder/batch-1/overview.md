<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Util basics, JDK vectors, ElkMath 1, processor configuration, LayoutConfigurator

All five tasks depend only on `main`, and their write-sets are disjoint, so they run in parallel. T2 runs a JDK while
the others are only edited, so the orchestrator's gates wait until T2's recordings are done.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | `WrappedException`, `DefaultFactory`, `Triple`, `Quadruple` | typescript-pro | src/core/util/{WrappedException,DefaultFactory,Triple,Quadruple}.ts (+ tests), test/architecture/exception-hierarchy.fitness.test.ts | — | [x] |
| T2 | Pure-JDK vector recorder (R7): Rectangle2D, regex, Character | java-architect | tools/vectors/CoreJdkVectors.java, test/golden/refs/java/{awt,regex,character}.json | — | [x] |
| T3 | ElkMath facade + combinatorics + aggregates (R4, P1) | typescript-pro | src/core/math/{ElkMath,ElkMathCombinatorics,ElkMathAggregates}.ts, src/core/math/ElkMathTest.test.ts | — | [x] |
| T4 | `core.alg` processor configuration side | typescript-pro | src/core/util/AbstractRandomListAccessor.ts, src/core/alg/{ILayoutProcessorFactory,ILayoutPhaseFactory,ILayoutPhase,EnumBasedFactoryComparator,LayoutProcessorConfiguration}.ts, src/core/alg/LayoutProcessorConfigurationTest.test.ts, test/helpers/{TestPhases,TestProcessors}.ts (+ tests) | — | [x] |
| T5 | `LayoutConfigurator` | typescript-pro | src/core/LayoutConfigurator.ts, src/core/LayoutConfiguratorTest.test.ts | — | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
