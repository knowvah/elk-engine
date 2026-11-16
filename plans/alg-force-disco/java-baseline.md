<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline — alg-force-disco

Recorded at planning (2026-11-11, oracle stamp = `ELK_COMMIT` + patches 0001, 0002). Run at mission start and at mission end;
any difference is stop 16.

`tools/oracle/java-tests.sh` lists only the layered and alg test bundles. Use a scratch copy (8a precedent), never an edit of the
landed script:

```bash
mkdir -p "$TMPDIR/alg-force-disco"
sed -e 's/^TEST_BUNDLES=(org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test)/TEST_BUNDLES=(org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test org.eclipse.elk.alg.force.test org.eclipse.elk.alg.disco.test)/' \
    -e "17s|.*|ROOT=\"$(pwd)\"|" tools/oracle/java-tests.sh > "$TMPDIR/alg-force-disco/java-tests.sh"
MODELS_REPO=$ELK_MODELS_DIR nice -n 10 bash "$TMPDIR/alg-force-disco/java-tests.sh" \
  org.eclipse.elk.alg.force.test.ForceImportTest org.eclipse.elk.alg.disco.test.TwoBitGridTest
```

| Suite | Runs | Failures |
|-------|------|----------|
| `org.eclipse.elk.alg.force.test.ForceImportTest` | 3 | 0 |
| `org.eclipse.elk.alg.disco.test.TwoBitGridTest` | 3 | 0 |
