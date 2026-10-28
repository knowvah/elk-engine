<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — `LayeredSpacings` and the portable `LayeredSpacingTest` cases

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T4): port layered spacings and its junit cases`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`; `S` = `src/alg/layered`.

## Context

Mission 7a (README). `LayeredSpacings` (139 lines) configures layered spacing values; its builder extends
`ElkSpacings.AbstractSpacingsBuilder` (`src/core/util/ElkSpacingsAbstractSpacingsBuilder.ts`). Roadmap follow-up:
`ELK_OPTION_TARGET_FILTER` never filters (verbatim Java), so do not assume target filtering. Its only 7a consumer is
`ElkGraphImporter` (T6).

## Task

1. Port `J/options/LayeredSpacings.java` to `S/options/LayeredSpacings.ts` (nested `LayeredSpacingsBuilder` per M15),
   with its colocated test for anything the JUnit cases below do not reach (Java-derived, non-numeric, or values the
   builder copies verbatim from its inputs).
2. Port `JT/LayeredSpacingTest.java` to `S/LayeredSpacingTest.test.ts`, unchanged, including its tolerance
   (`DOUBLE_EQ_EPSILON = 10e-5`) and `createSimpleGraph` (local to the test file):
   - `WithFactorAndValueTest.testDefaultFactorsProperlyOverwritten` as an `it.each` over the 12 parameters;
   - `SpacingOverrides`: its three tests;
   - `AfterLayoutTest` runs a layered layout: port it as `it.skip` with a comment naming S1 (7f) and the Java lines,
     so 7f un-skips it.

   `PlainJavaInitialization.initializePlainJavaLayout()` becomes the explicit layered registration (L5) in a
   `beforeAll`.

## Write-set

`S/options/LayeredSpacings{,.test}.ts` (+ M15 nested-type file), `S/LayeredSpacingTest.test.ts`.

## Read-set

`J/options/LayeredSpacings.java`, `JT/LayeredSpacingTest.java`, `src/core/util/ElkSpacings*.ts`,
`S/options/LayeredOptions.ts` (ids only), `decisions.md` L4, S1.

## Interface contract (consumed by T6)

`LayeredSpacings.withBaseValue(value)` returns a `LayeredSpacingsBuilder` with the Java methods
(`apply(graph|element)`, factor setters); names per the Java.

## Acceptance criteria

- Given the 12 parameterized cases and the three `SpacingOverrides` tests, when run, then they pass with the Java's
  assertions and tolerance unchanged.
- Given `AfterLayoutTest`, when inspected, then it is skipped with a comment naming S1/7f and the Java lines.
- Given `LayeredSpacingsBuilder`, when its factor map is read, then its keys are the Java's spacing options in the
  Java's insertion order, and it relies on the inherited `ELK_OPTION_TARGET_FILTER` unchanged (no target filtering
  of its own).

## Observability / Rollback

N/A — no new observable operations. Reversible: revert the commit.
