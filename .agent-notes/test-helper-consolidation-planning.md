<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: test-helper-consolidation (issue #46, 2026-11-19)

## Observation: harness suites skip `@DefaultConfiguration`

- **Context**: Comparing `test/helpers/elkt-layout-harness.ts` with the Java of the three suites that use it.
- **Finding**: `Issue457Test`, `Issue489Test` (core.test) and `Issue475Test` (alg.common.test) carry `@DefaultConfiguration`
  in Java; `layoutElkt` never applies it, while `layout-test-runner.ts` does (`defaultConfiguration: true`).
  `tools/oracle/java-tests.sh` runs only `alg.layered.test` and `alg.test` classes (`TEST_BUNDLES`, line 33), so no JVM
  run of these three exists to compare with.
- **Impact**: Moving them to the runner may change their layouts; a failure there is a discrepancy, not a test edit.
- **Confidence**: High

## Observation: `Issue475Test.test.ts` has a port-added per-configuration check

- **Context**: Mapping the port's assertions onto the runner's one-check-per-experiment model.
- **Finding**: `testCompoundNodeSize(graph, expectFixed)` asserts each child's `NODE_SIZE_FIXED_GRAPH_SIZE` equals the
  configurator's value (not in the Java). The runner hands a check only the graph.
- **Impact**: Keeping that assertion needs a value carried from the configurator (D4); it relies on the runner realising
  an experiment inside its first check.
- **Confidence**: High

## Observation: factories bodies cluster

- **Context**: Grouping every `const <name>: Factories = {` body (whitespace collapsed) at `f5c2c889`.
- **Finding**: 176 objects; 25 groups of two or more hold 120; 56 occur once. Many carry `expect`/`throw` guards or
  inject a twin checker or stub, so a single broad factory would change behaviour.
- **Impact**: Only identical bodies move (D1).
- **Confidence**: High

## Observation: suite timeout under load

- **Context**: Baseline `vitest run` at load average ~100.
- **Finding**: `src/core/comments/NodeReferenceMatcher.test.ts` timed out at 5000 ms once; it passes 10/10 when run alone.
- **Impact**: Rerun a timed-out file alone before calling it a failure.
- **Confidence**: High
