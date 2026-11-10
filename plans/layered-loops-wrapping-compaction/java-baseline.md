<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline — the suites allocated to 7g (planning, 2026-11-10)

`MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <fqcn…>` on the oracle build (stamp: pin `8aaa3c14`, patches
`0001`, `0002`), `chore/issue-queue` `42339f3`, one JVM per class, `-XX:hashCode=2`. Prefix `org.eclipse.elk.alg.layered.`
omitted. The mission-start and mission-end runs of stop 18 cover these suites. The counts equal
`plans/layered-pipeline/suite-allocation.md`.

| Suite | runs | failures | Ported in |
| ----- | ---: | -------: | --------- |
| `compaction.CompactionTest` | 16 | 0 | T3 |
| `compaction.recthull.RectlinearConvexHullTest` | 2 | 0 | T4 |
| `intermediate.SelfLoopPreprocessorTest` | 5 | 0 | T14 |
| `intermediate.loops.SelfLoopHolderTest` | 3 | 0 | T5 |
| `intermediate.loops.routing.PolylineSelfLoopRouterTest` | 2 | 0 | T13 |
| `intermediate.loops.routing.RoutingDirectorTest` | 1 | 0 | T10 |
| `issues.Issue433Test` | 1 | 0 | T17 |
| `issues.Issue444Test` | 1 | 0 | T17 |
| `issues.Issue463Test` | 1 | 0 | T17 |
| `issues.Issue870Test` | 1 | 0 | T17 |

```bash
P=org.eclipse.elk.alg.layered
MODELS_REPO=$ELK_MODELS_DIR nice -n 10 bash tools/oracle/java-tests.sh $P.compaction.CompactionTest \
  $P.compaction.recthull.RectlinearConvexHullTest $P.intermediate.SelfLoopPreprocessorTest \
  $P.intermediate.loops.SelfLoopHolderTest $P.intermediate.loops.routing.PolylineSelfLoopRouterTest \
  $P.intermediate.loops.routing.RoutingDirectorTest $P.issues.Issue433Test $P.issues.Issue444Test \
  $P.issues.Issue463Test $P.issues.Issue870Test
```
