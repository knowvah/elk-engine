<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline — the suites allocated to 7f2 (planning, 2026-11-05)

`MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <fqcn…>` on the oracle build (`main` `22fcfcb`), one JVM per class,
`-XX:hashCode=2`. Prefix `org.eclipse.elk.alg.layered.` omitted. The mission-start and mission-end runs of stop 18 cover
these suites (and any suite T13 moves here).

| Suite | runs | failures |
| ----- | ---: | -------: |
| `intermediate.AlternatingLayerUnzipperTest` | 12 | 0 |
| `intermediate.CommentPostprocessorTest` | 3 | 0 |
| `intermediate.EndLabelSorterTest` | 4 | 0 |
| `intermediate.LabelDummyRemoverTest` | 550 | 0 |
| `intermediate.LabelSideSelectorTest` | 551 | 0 |
| `issues.Issue445Test` | 1 | 0 |
| `issues.Issue471Test` | 1 | 0 |
| `issues.Issue541Test` | 2 | 0 |
| `issues.Issue905Test` | 2 | 0 |
| `intermediate.PartitionTest` | 5 | 0 |
| `issues.Issue871Test` | 3 | 0 |

`Issue445Test` runs once (`plans/layered-pipeline/suite-allocation.md` lists 2; its own `java-baseline.md` had 1).
