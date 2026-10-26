<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `NetworkSimplex` and `NetworkSimplexTest`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port network simplex`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). `NetworkSimplex` (891 lines) is the layering and node-placement workhorse of layered (7a). T3
landed `NEdge`, `NNode` and `NGraph`; read them, and don't edit them (stop 1).

## Task
1. Port `J/networksimplex/NetworkSimplex.java`.
   - It is over 500 lines, so split it into a facade plus section modules (P1, M10): for example
     `NetworkSimplex.ts` plus `NetworkSimplex{FeasibleTree,CutValues,Normalize}.ts` along the Java sections. Keep Java
     order, names and side effects; sections never import the facade.
   - `treeEdges = Sets.newLinkedHashSetWithExpectedSize(…)` (`:241`) is insertion-ordered: use a `Set`.
   - Port every branch, including `withIterationLimit`, `withBalancing`, `withPreviousLayering` (if present), and the
     progress-monitor calls (`BasicProgressMonitor` is landed).
   - Integer arithmetic on layers and cut values goes through `Int32` where Java's `int` could wrap (P7). Journal
     where it cannot.
2. Port `JT/networksimplex/NetworkSimplexTest.java` to `src/alg/common/networksimplex/NetworkSimplexTest.test.ts`,
   with the exact Java expectations.
3. Add unit tests derived from the Java for the branches the JUnit cases miss: balancing, the iteration limit,
   already-feasible trees, disconnected inputs.

## Write-set
`src/alg/common/networksimplex/NetworkSimplex*.ts` (facade + sections), `NetworkSimplexTest.test.ts`, colocated unit
tests.

## Read-set
- `J/networksimplex/NetworkSimplex.java`, `JT/networksimplex/NetworkSimplexTest.java`.
- T3's `src/alg/common/networksimplex/{NEdge,NNode,NGraph}.ts`.
- `src/core/util/BasicProgressMonitor.ts`, `src/java/lang/Int32.ts`, `src/core/math/ElkMath.ts` (facade pattern).

## Interface contracts (outputs, consumed from 7a on)
- `NetworkSimplex.forGraph(graph): NetworkSimplex`, with the Java builder methods, and `execute(monitor)`.
  Names as Java.

## Acceptance criteria
- Given every `NetworkSimplexTest` case, when run, then it passes with the Java expectations.
- Given a graph whose initial tree is already feasible, when executed, then the layering follows the Java path,
  checked by a unit test from the source.
- Given `npm run complexity`, when run, then every `NetworkSimplex*` file and function is within the limits (stop 10
  otherwise).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
