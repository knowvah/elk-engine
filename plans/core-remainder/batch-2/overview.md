<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — AlgorithmAssembler, ElkSpacings, JDK shims, ElkMath 2

Every task depends on one batch-1 task, and their write-sets are disjoint, so all five run in parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T6 | `AlgorithmAssembler` + `AlgorithmAssemblerTest` | typescript-pro | src/core/alg/AlgorithmAssembler.ts, src/core/alg/AlgorithmAssemblerTest.test.ts | T4 | [x] |
| T7 | `ElkSpacings` + `SpacingConfigurationTest` | typescript-pro | src/core/util/ElkSpacings*.ts, src/core/alg/SpacingConfigurationTest.test.ts | T5 | [x] |
| T8 | `Rectangle2D` shim (R3) | typescript-pro | src/java/awt/geom/Rectangle2D.ts (+ test) | T2 | [x] |
| T9 | `JavaCharacter` + narrow `Pattern` shims + `JavaString.equalsIgnoreCase` (R2) | typescript-pro | src/java/lang/JavaCharacter.ts, src/java/util/regex/Pattern.ts, src/java/lang/JavaString.ts (+ tests) | T2 | [x] |
| T10 | ElkMath Bezier + Geometry sections, rest of `ElkMathTest` | typescript-pro | src/core/math/{ElkMath,ElkMathBezier,ElkMathGeometry}.ts, src/core/math/ElkMathTest.test.ts, src/core/math/ElkRectangle.test.ts (comment only) | T3 | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
