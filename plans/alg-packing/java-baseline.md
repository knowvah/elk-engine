<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline — alg-packing

Recorded at planning (2026-11-13, oracle stamp = `ELK_COMMIT` + patches 0001, 0002; compiled test bundles present under
`$ELK_ORACLE_DIR/test/org.eclipse.elk.alg.{rectpacking,spore,topdown}.test/target/classes`). Run at mission start and at mission
end; any difference is stop 16.

`tools/oracle/java-tests.sh` lists only the layered and alg test bundles. Use a scratch copy (8a, 8b precedent), never an edit of
the landed script:

```bash
mkdir -p "$TMPDIR/alg-packing"
sed -e 's/^TEST_BUNDLES=(org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test)/TEST_BUNDLES=(org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test org.eclipse.elk.alg.rectpacking.test org.eclipse.elk.alg.spore.test org.eclipse.elk.alg.topdown.test)/' \
    -e "17s|.*|ROOT=\"$(pwd)\"|" tools/oracle/java-tests.sh > "$TMPDIR/alg-packing/java-tests.sh"
MODELS_REPO=$ELK_MODELS_DIR nice -n 10 bash "$TMPDIR/alg-packing/java-tests.sh" \
  org.eclipse.elk.alg.rectpacking.CompactionTest org.eclipse.elk.alg.rectpacking.PaddingTest \
  org.eclipse.elk.alg.rectpacking.issues.Issue583Test \
  org.eclipse.elk.alg.spore.test.UtilsTest org.eclipse.elk.alg.spore.test.ScanlineOverlapRemovalTest \
  org.eclipse.elk.alg.topdown.test.TopdownPackingTest org.eclipse.elk.alg.topdown.test.TopdownLayoutTest \
  org.eclipse.elk.alg.topdown.layered.test.PortPlacementCalculationTest
```

| Suite | Runs | Failures |
|-------|------|----------|
| `org.eclipse.elk.alg.rectpacking.CompactionTest` | 10 | 0 |
| `org.eclipse.elk.alg.rectpacking.PaddingTest` | 4 | 0 |
| `org.eclipse.elk.alg.rectpacking.issues.Issue583Test` | 1 | 0 |
| `org.eclipse.elk.alg.spore.test.UtilsTest` | 3 | 0 |
| `org.eclipse.elk.alg.spore.test.ScanlineOverlapRemovalTest` | 1 | 0 |
| `org.eclipse.elk.alg.topdown.test.TopdownPackingTest` | 4 | 0 |
| `org.eclipse.elk.alg.topdown.test.TopdownLayoutTest` | 5 | 0 |
| `org.eclipse.elk.alg.topdown.layered.test.PortPlacementCalculationTest` | 2 | 0 |
