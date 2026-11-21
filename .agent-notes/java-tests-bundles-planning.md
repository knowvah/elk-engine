<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: java-tests-bundles (issue #97, 2026-11-20)

## Observation: the ported JUnit list is 143 classes, eight of them Xtend

- **Context**: Recounting the issue's 124 with its own `git grep` at planning.
- **Finding**: The `.java` grep gives 135 (100 `alg.layered.test`, 35 in eleven other bundles); eight
  `graph.json.test` suites are cited as `src/…Test.xtend` (`EdgeCoordsTest`, `EdgesTest`, `ExportTest`, `GraphTest`,
  `IndividualSpacingsTest`, `LayoutOptionsTest`, `SectionsTest`, `TransferLayoutTest`). Their compiled classes sit in
  `target/classes` (Java sources in `xtend-gen/`) and run as plain JUnit 4. All citations are in `.ts` files.
- **Impact**: Any class list for the oracle must grep `Test\.(java|xtend)`; a `sed` with `|` as delimiter breaks on
  the `(java|xtend)` alternation, so use `#`.
- **Confidence**: High

## Observation: all thirteen test bundles share one classpath safely

- **Context**: A probe with a scratch copy of `java-tests.sh` carrying 13 bundles over the 43 non-layered classes.
- **Finding**: 278 runs, 0 failures, no extra third-party jar needed. No class or resource file occurs in two of the
  thirteen `target/classes` trees. `org.eclipse.elk.shared.test` is compiled but needs
  `org.eclipse.elk.alg.graphviz.layouter`, which is not an oracle jar, and nothing cites it.
- **Impact**: `TEST_BUNDLES` can list every cited bundle without shadowing; `THIRD_PARTY` (shared in spirit with
  `tools/vectors/label-sizing-vectors.sh`) need not change.
- **Confidence**: High (the 100 layered classes were not rerun at planning; T1 does that)
