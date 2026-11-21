<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java baseline — patched `ScanlineOverlapRemovalTest` (T1, 2026-11-20)

`nice -n 10 tools/oracle/java-tests.sh org.eclipse.elk.alg.spore.test.ScanlineOverlapRemovalTest` on the oracle rebuilt
with patch `0004` (one JVM, `-XX:hashCode=2`):

```
org.eclipse.elk.alg.spore.test.ScanlineOverlapRemovalTest runs=4 failures=0
```

Exit 0. The four tests are `scanlineTest`, `scanlineThreeOverlappingNodesTest` (both at the pin) and the two patch `0004`
adds, `scanlineOverlapBehindNarrowNodeTest` and `scanlineOverlapRightOfInsertedNodeTest`.

| Item | Value |
| ---- | ----- |
| Oracle commit | `8bca22f4afa3371562d2f702d59929818f7f7b71` |
| Oracle worktree HEAD | `4a87da18` (pin + `git am` of 0001-0004) |
| Patches (`oracle-build.json`) | `0001-graph.json-seedable-JsonExporter-id-collision-random.patch`, `0002-graph-seedable-GraphIdentifierGenerator-random.patch`, `0003-alg.test-pluggable-label-text-measurer.patch`, `0004-Report-all-overlaps-of-a-node-inserted-into-the-over.patch` |
| `builtAt` | `2026-11-21T05:47:58Z` |
| JDK | `openjdk version "21.0.1" 2023-10-17 LTS` |
| Platform | Darwin arm64 |

The expected sets of the two new tests, as the patched Java asserts them (the source of the ported assertions, AD-13):
`scanlineOverlapBehindNarrowNodeTest` → `a-b, a-c, a-p, c-p`; `scanlineOverlapRightOfInsertedNodeTest` → `a-c, a-p, c-p`.
