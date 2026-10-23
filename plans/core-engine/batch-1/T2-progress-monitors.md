<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — `BasicProgressMonitor`, `NullElkProgressMonitor`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T2): port basic and null progress monitors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
The engine and the tests run layouts with `new BasicProgressMonitor()`; `TopdownSizeApproximator` uses
`NullElkProgressMonitor`. The interface `src/core/util/IElkProgressMonitor.ts` exists (decision C8: debug folder is
`string | null`; the `logGraph` overloads are one method with an optional third parameter). M2: drop the
`elkjs-exclude` blocks (22 markers in `BasicProgressMonitor.java`, 2 in `NullElkProgressMonitor.java`) with a one-line
comment naming the Java lines. M3: `System.nanoTime()` → `performance.now()`, units converted so
`getExecutionTime()` returns what Java returns.

## Task
Port `J/util/BasicProgressMonitor.java` (629 lines; builder-style `withMaxHierarchyLevels`, `withLogging`,
`withLogPersistence`, `withExecutionTimeMeasurement`; `begin`/`doBegin`, `worked`/`internalWorked`/`doWorked`,
`done`/`doDone`, `subTask`/`doSubTask`, logs, logged graphs, execution time) and `J/util/NullElkProgressMonitor.java`.
Java collections: `LinkedList`/`ArrayList` → arrays or `src/java/util/LinkedList.ts` where Java's order semantics
matter; Guava `Strings` → `src/guava/Strings.ts`. Keep protected `do*` hooks (subclasses in later missions override
them). Port every non-excluded branch, including `maxLevels` and `UNKNOWN_WORK` handling.

## Write-set
`src/core/util/BasicProgressMonitor.ts`, `src/core/util/NullElkProgressMonitor.ts` (+ tests).

## Read-set
`J/util/BasicProgressMonitor.java`, `J/util/NullElkProgressMonitor.java`, `src/core/util/{IElkProgressMonitor,
LoggedGraph,IElkCancelIndicator}.ts`, `plans/core-metadata/decisions.md` (C8), `plans/core-engine/decisions.md#m2--elkjs-exclude`.

## Interface contracts (outputs)
`class BasicProgressMonitor implements IElkProgressMonitor` (Java constructors and `with*` builders returning
`this`), protected `doBegin/doWorked/doDone/doSubTask`; `class NullElkProgressMonitor implements IElkProgressMonitor`.
Consumed by T14, T16, T17, T18.

## Acceptance criteria
- Given `withExecutionTimeMeasurement(true)` and `performance.now` mocked to 1000 then 3500, when `begin`/`done` run,
  then `getExecutionTime()` equals the value Java computes for a 2.5 s span.
- Given `withLogging(true)`, when `log("a")` and `logGraph(g, "t")` run, then `getLogs()` is `["a"]`, the logged graph
  carries tag `"t"` and type ELK, and `getDebugFolder()` is `null`.
- Given a monitor with total work 10, when a `subTask(4)` is done, then the parent's completed work increases by 4 and
  `worked` after `done` has no effect (Java `isRunning` checks).
- Given `withMaxHierarchyLevels(1)`, when a sub-sub-task is requested, then the Java behaviour (no logging/timing
  below the limit) holds.
- `NullElkProgressMonitor`: `begin` returns true, `isCanceled` false, `subTask` returns a `NullElkProgressMonitor`,
  every getter returns the Java value.

## Observability / Rollback
N/A — the monitor is itself the in-memory observability surface; no new spans. Reversible: revert the commit.
