<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Progress monitor interfaces + `LoggedGraph`

**Agent:** typescript-pro · **Commit:** `feat(T4): add the progress monitor interfaces and loggedgraph`

## Context
`AbstractLayoutProvider.layout(ElkNode, IElkProgressMonitor)` (T10) needs the monitor interface,
which references `LoggedGraph` (`logGraph(Object, String, LoggedGraph.Type)`,
`getLoggedGraphs(): List<LoggedGraph>`). `LoggedGraph.Type` stays inside `LoggedGraph.ts` (C3).

## Task
TDD. Port `IElkCancelIndicator`, `IElkProgressMonitor` (`getDebugFolder(): string | null`, C8), and
`LoggedGraph` with its nested `Type` enum (`ELK`, `JSON`, `DOT`, `SVG`, file extensions). Port the
**JVM** behaviour of the `elkjs-exclude` parts:
- `isTypeCompatible`: `ELK` accepts an `ElkNode` (use the mission-2 type guard), the others accept a
  `string`. `checkTypeCompatibility` throws `ClassCastException("Type " + <Java class name> +
  " incompatible for " + name())`; Java class names: `java.lang.String` for strings,
  `org.eclipse.elk.graph.impl.<X>Impl` for model objects (pattern in
  `src/emf/ecore/impl/BasicEObjectImpl.ts:9`), anything else journaled.
- `serialize()` for `ELK`: XMI persistence is not ported (roadmap: `core.util.persistence` out of
  scope), so the Java's own fallback applies — return `"Unexpected problem serializing ELK Graph."`.
  Other types return `String(graph)` per `graph.toString()`.
Add the `ClassCastException` shim in the `src/java/lang` exception style.

## Write-set
`src/core/util/{IElkCancelIndicator,IElkProgressMonitor,LoggedGraph}.ts`,
`src/java/lang/ClassCastException.ts`, `LoggedGraph.test.ts`, `ClassCastException.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/util/{IElkCancelIndicator,IElkProgressMonitor,LoggedGraph}.java`
- `src/java/lang/IllegalStateException.ts` (exception shim shape)
- `src/graph/ElkNode.ts` (type guard), `src/emf/ecore/impl/BasicEObjectImpl.ts:1-20`
- `docs/translation-rules.md` §6.7 (exceptions)

## Interface contract (consumed by T10)
`interface IElkProgressMonitor` with every Java method (`begin`, `done`, `subTask`, `worked`,
`isCanceled`, `isRunning`, `getTaskName`, `getSubMonitors`, `getParentMonitor`, `getExecutionTime`,
`logGraph`, `getLoggedGraphs`, `getDebugFolder`, `isLoggingEnabled`, `isLogPersistent`, … — exactly
the Java set); `class LoggedGraph { static readonly Type; constructor(graph, tag, graphType); getGraph(); getGraphType(); getTag(); serialize() }`.

## Acceptance criteria
- Given `new LoggedGraph("x", "t", Type.ELK)`, then it throws `ClassCastException` with message
  `Type java.lang.String incompatible for ELK`.
- Given an `ElkNode` and `Type.ELK`, then construction succeeds and `serialize()` returns
  `Unexpected problem serializing ELK Graph.`
- Given `"digraph{}"` and `Type.DOT`, then `serialize()` returns `digraph{}` and
  `getGraphType().getFileExtension()` is `dot`.
- Given `Type.values()`, then `ELK, JSON, DOT, SVG` in order.

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC; `@see` on every class; the `string | null`
divergence noted in the `getDebugFolder` doc comment.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No progress monitor implementation (`BasicProgressMonitor`, `NullElkProgressMonitor`: mission 5).
