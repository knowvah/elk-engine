<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `TestController`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the white-box test controller`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
`RecursiveGraphLayoutEngine.layout(graph, testController, monitor)` and `executeAlgorithm` call
`testController.targets(algorithmData)`, `install(provider)`, `uninstall()`. Later layered tests use the controller
to run processors before/after phases. T1 provides `IWhiteBoxTestable` and `ILayoutProcessor`.

## Task
Port `J/testing/TestController.java` (220 lines) with every branch: target algorithm id, install/uninstall on an
`IWhiteBoxTestable` provider (and the Java behaviour for a non-white-box provider), the processor/listener
collections (`LinkedHashSet` → `Set`, insertion order matches), notification methods. Tests from the Java source with
a test-local `IWhiteBoxTestable` provider.

## Write-set
`src/core/testing/TestController.ts` (+ test).

## Read-set
`J/testing/{TestController,IWhiteBoxTestable}.java`, `J/alg/ILayoutProcessor.java`, `src/core/AbstractLayoutProvider.ts`,
`src/core/data/LayoutAlgorithmData.ts` (symbols).

## Interface contracts (outputs)
`new TestController(targetAlgorithmId: string)`, `targets(algorithmData): boolean`, `install(provider)`,
`uninstall()`, plus the Java public API. Consumed by T16.

## Acceptance criteria
- Given a controller for `"x"` and algorithm data with id `"x"` / `"y"`, when `targets` runs, then true / false.
- Given a white-box provider, when `install` then `uninstall` run, then the provider received and lost the controller
  exactly as `TestController.java` does.
- Given a provider that is not white-box testable, when `install` runs, then the Java outcome (exception class and
  message, or no-op) is reproduced.

## Observability / Rollback
N/A. Reversible: revert the commit.
