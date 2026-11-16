<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline — alg-trees

Recorded at planning (2026-11-10, oracle stamp = `ELK_COMMIT` + patches 0001, 0002). Run at mission start and at mission end;
any difference is stop 16.

`tools/oracle/java-tests.sh` lists only the layered and alg test bundles (`:33`). Use a scratch copy (7f S1 / 7h precedent), never
an edit of the landed script:

```bash
mkdir -p "$TMPDIR/alg-trees"
sed -e 's/^TEST_BUNDLES=(org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test)/TEST_BUNDLES=(org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test org.eclipse.elk.alg.mrtree.test org.eclipse.elk.alg.radial.test)/' \
    -e "17s|.*|ROOT=\"$(pwd)\"|" tools/oracle/java-tests.sh > "$TMPDIR/alg-trees/java-tests.sh"
MODELS_REPO=$ELK_MODELS_DIR nice -n 10 bash "$TMPDIR/alg-trees/java-tests.sh" \
  org.eclipse.elk.alg.mrtree.test.MrTreeGraphSizeTest org.eclipse.elk.alg.radial.test.CenterOnRootTest
```

| Suite | Runs | Failures |
|-------|------|----------|
| `org.eclipse.elk.alg.mrtree.test.MrTreeGraphSizeTest` | 6 | 0 |
| `org.eclipse.elk.alg.radial.test.CenterOnRootTest` | 2 | 0 |

The compiled test classes exist at `$ELK_ORACLE_DIR/test/org.eclipse.elk.alg.{mrtree,radial}.test/target/classes`.
`alg.vertiflex` has no test bundle.
