<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline — the suites allocated to 7h (planning, 2026-11-10)

`MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <fqcn…>` on the oracle build (stamp: pin `8aaa3c14`, patches
`0001`, `0002`), `chore/issue-queue` `33ee4c9`, one JVM per class, `-XX:hashCode=2`. The prefix `org.eclipse.elk.alg.layered.`
is omitted. The mission-start and mission-end runs of stop 18 cover these suites. The counts equal
`plans/layered-pipeline/suite-allocation.md` and `plans/layered-pipeline/java-baseline.md:33-60`.

| Suite | runs | failures | Ported in | Note |
| ----- | ---: | -------: | --------- | ---- |
| `issues.Issue316Test` | 4 | 0 | T11 | 2 inputs × 2 methods |
| `issues.Issue455Test` | 2 | 0 | T11 | |
| `issues.Issue552Test` | 1 | 0 | T11 | also self loops (7g) |
| `issues.Issue596Test` | 1 | 0 | T11 | |
| `issues.Issue628Test` | 4 | 0 | T11 | 4 `@Configurator`s |
| `issues.Issue665Test` | 1 | 0 | T11 | its 1 input needs `elk.stress` (H13) |
| `issues.Issue700Test` | 4 | 0 | T11 | 2 of 4 inputs need `elk.stress` (H13) |
| `issues.Issue701Test` | 6 | 0 | T11 | |
| `issues.Issue734Test` | 3 | 0 | T11 | |

```bash
P=org.eclipse.elk.alg.layered.issues
MODELS_REPO=$ELK_MODELS_DIR nice -n 10 bash tools/oracle/java-tests.sh $P.Issue316Test $P.Issue455Test $P.Issue552Test \
  $P.Issue596Test $P.Issue628Test $P.Issue665Test $P.Issue700Test $P.Issue701Test $P.Issue734Test
```

## graph.json suites (H6)

`org.eclipse.elk.graph.json.test.{EdgeCoordsTest,LayoutOptionsTest,IndividualSpacingsTest}` are not in the landed script's
`TEST_BUNDLES` (`tools/oracle/java-tests.sh:33`). They run through a scratch copy under `$TMPDIR/7h/` with
`org.eclipse.elk.graph.json.test` added (7f S1 precedent). The executor records the mission-start counts here as their baseline,
in an appended row, and the mission-end run must equal them. At planning the compiled classes exist at
`$ELK_ORACLE_DIR/test/org.eclipse.elk.graph.json.test/target/classes` (`EdgeCoordsTest.class` present). The Xtend runtime
jars may be missing from `THIRD_PARTY`. If the copy cannot load a class, add the missing jar in the copy only. If it still cannot
load, that is stop 21 for those three suites only (`needs-ruling`).

| Suite (mission start, 2026-11-10) | runs | failures |
| --------------------------------- | ---: | -------: |
| `org.eclipse.elk.graph.json.test.EdgeCoordsTest` | 1 | 0 |
| `org.eclipse.elk.graph.json.test.LayoutOptionsTest` | 4 | 0 |
| `org.eclipse.elk.graph.json.test.IndividualSpacingsTest` | 3 | 0 |
