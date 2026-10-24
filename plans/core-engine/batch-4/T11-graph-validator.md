<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — `GraphValidator` + `GraphValidatorTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T11): port the core graph validator`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
`GraphValidator` (161 lines) checks basic structure and delegates to an algorithm-specific validator built from
`LayoutAlgorithmData.getValidatorClass()` (`:128-146`). The cache `Map<LayoutAlgorithmData, …>` is identity-keyed →
TS `Map` (AD-10). Java instantiates by reflection and wraps failures in
`RuntimeException("Failed to instantiate validator for " + id, ex)`; keep the message (AD-16:
`src/java/lang/RuntimeException.ts`). Check how `validatorClass` is typed in `src/core/data/LayoutAlgorithmData.ts`
(constructor reference) and construct through it.

## Task
Port `J/validation/GraphValidator.java` (`visit`, `checkEdge`/section checks and messages exactly as Java,
`getValidator`, `getIssues`). Port `GraphValidatorTest` (2 cases) verbatim; it builds algorithm data with
`AlgorithmFactory` and resolves with `LayoutAlgorithmResolver`. Add Java-derived tests for the remaining branches.

## Write-set
`src/core/validation/GraphValidator.ts` (+ test).

## Read-set
`J/validation/GraphValidator.java`;
`$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/validation/GraphValidatorTest.java`;
`src/core/validation/{GraphIssue,IValidatingGraphElementVisitor,LayoutOptionValidator}.ts`;
`src/core/data/LayoutAlgorithmData.ts` (validator class field); `src/core/util/AlgorithmFactory.ts`.

## Interface contracts (outputs)
`class GraphValidator implements IValidatingGraphElementVisitor` (`visit`, `getIssues(): GraphIssue[]`). No later
task in 5a consumes it directly (the engine does not import it); it completes `core.validation`.

## Acceptance criteria
- Both `GraphValidatorTest` cases pass verbatim.
- Given an edge whose section is missing its source/target, when validated, then the issue message and severity equal
  the Java text.
- Given an algorithm whose validator class throws on construction, when validated, then a `RuntimeException` with
  `Failed to instantiate validator for <id>` and the cause.
- Given the same algorithm visited twice, when validated, then the validator is instantiated once (cache).

## Observability / Rollback
N/A. Reversible: revert the commit.
