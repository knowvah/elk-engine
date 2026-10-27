<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Targeted oracle recorder `NodespacingSiteVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T2): record nodespacing site vectors from the oracle`
`N` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing`;
`S` = `src/alg/common/nodespacing`; `H` = `test/helpers`.

## Context

Mission 6c (README). Five mission-6b tests had their hand-derived expectations corrected after a first failure. This
recorder rebuilds each of those scenarios in Java against the oracle and records what the Java produces, so the TS
tests can assert oracle values (D1). All `nodespacing.internal*` classes are `public` (OSGi `x-internal` only), so a
plain-classpath launcher can call them directly.

- **Patterns, read first:** `tools/vectors/NodeMicroLayoutVectors.java` (header layout, classpath, `hex`, the NS1
  export flags, round trip, twice-run stability, one `cache:` line) and `tools/vectors/node-micro-layout-vectors.sh`.
- **Never edit** `tools/vectors/vector-cache.sh`, `JavaVectors.java`, any landed `test/golden/refs/java/*`, or
  `test/helpers/*-fixtures.ts`. Do not run the other recorder scripts (they would go cold).
- Mirror the TS fixtures exactly: node 40×30 (`H/node-context-fixtures.ts:21-22`), ports 2×2 at the given positions
  (`H/port-placement-fixtures.ts:20`, `addPort` `:41`), spacings set on the root graph (node adapters inherit
  spacings from the parent), `loadLayoutMetaData` ≙ ELK's registered defaults. Read each fixture's lines before
  mirroring it; the values below are a guide, the fixture is the spec.

## Task

1. **`tools/vectors/NodespacingSiteVectors.java`:** JDK 21 single-file launcher; classpath as `node-micro-layout-vectors.sh`
   (alg.common, core, graph, graph.json jars + third-party bundles). Header: SPDX, one paragraph per site, the row
   format (D7), the `steps` vocabulary, the round-trip and stability checks.
2. **Row format (D7):** `{ id, site, input, steps, expected }`; `input` = the prepared graph exported with
   `ElkGraphJson.forGraph(root)` and the NS1 flags (compact); `steps` = ordered in-memory mutations applied to the
   `NodeContext` after construction, from `setMinimumContentAreaSize(cell, w, h)`, `setContributes(cell, width?,
   height?)`, `setCellRectangle(cell, x, y, w, h)` where `cell` is `insidePortLabelCells.NORTH`,
   `outsideNodeLabelContainers.WEST`, `nodeContainerMiddleRow`, … ; `expected` is site-specific (below). Doubles are
   16-hex raw bits; enum values and identifiers are strings.
3. **Sites and scenarios** (one row each unless noted; ids `<site>/<name>`):

   | Site                  | Mirrors                                                                                                           | Java calls                                                                                                      | `expected`                                                                   |
   | --------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
   | `labelLocation` (2)   | `S/internal/NodeLabelLocation.test.ts:146-150`: sets `{OUTSIDE, V_TOP, H_LEFT, H_PRIORITY}` (restored) and `{OUTSIDE, H_LEFT, H_CENTER}` | `NodeLabelLocation.fromNodeLabelPlacement(EnumSet)`                                                            | `{ location: "<name>" }` (no graph: `input` is `null`)                       |
   | `applyStuff`          | `S/internal/algorithm/NodeLabelAndSizeUtilities.test.ts:306-325`                                                   | `NodeContext` + `PortContextCreator.createPortContexts`, set the positions the test sets, `applyStuff`           | `{ nodeSize: [w,h], ports: [{id, x, y}] }` in `portContexts` iteration order |
   | `fixedRatioMargins` (2) | `S/internal/algorithm/HorizontalPortPlacementSizeCalculator.test.ts:159-181` with 3 ports; the **restored 2-port** case (ratios 0.25, 0.75, `labelled(NORTH)`, `FIXED_RATIO`, `labelSettings(OUTSIDE)`) | `calculateHorizontalPortPlacementSize`                                                                           | `{ margins: [[left,right]…] (iteration order), size: w }`                     |
   | `sidelessPortMargins` | `S/NodeMarginCalculator.test.ts:116-129`                                                                           | `new NodeMarginCalculator(graph).process()`                                                                      | `{ margins: [t,r,b,l] }`                                                     |
   | `insideLabels`        | `S/internal/algorithm/LabelPlacer.test.ts:40-115` (`beforeAll` fixture at `:58-95`)                                | the test's call sequence (cells, configure, sizes, layout, `LabelPlacer.placeLabels`)                          | `{ labels: {insideTopLeft:[x,y], insideBottomRight:[x,y], west:[x,y], east:[x,y]}, containers: {WEST:[x,y,w,h], EAST:[…]} }` |
   | `allConstraints`      | `S/internal/algorithm/NodeSizeCalculator.test.ts:143-170` (`everything(FREE)`, `portCells` as `steps`)             | the test's sequence through `setNodeWidth`/`setNodeHeight`                                                      | `{ size: [w,h], north: [y,h], middle: [y,h,w], south: [y,h] }`               |
   | `collapsedContainers` | `S/internal/algorithm/LabelPlacer.test.ts:146-200` (`oversized(true, false)`)                                      | as the test                                                                                                     | `{ containers: {NORTH:[…], WEST:[…]}, labels: {north:[x,y], west:[x,y]} }`   |
   | `t4/<name>`           | every row of `plans/ad13-rederivation/t4-unreached.md`                                                            | the covering T4 test's calls                                                                                    | the values that test asserts                                                 |

4. **Round trip (NS1, D2):** for each row with a graph, re-import `input`, replay `steps`, run the calls, and fail the
   row if the result differs from the hand-built scenario's. **Stability:** build every row twice from scratch; fail on
   any byte difference.
5. **`tools/vectors/nodespacing-site-vectors.sh`:** the `node-micro-layout-vectors.sh` structure, cache namespace
   `nodespacing-sites`, writes `test/golden/refs/java/nodespacing-sites.json`, `shellcheck -x` clean. No model
   directory is read (nothing to pin).
6. Run the script twice: byte-identical, second run a cache hit.

## Write-set

`tools/vectors/{NodespacingSiteVectors.java,nodespacing-site-vectors.sh}`, `test/golden/refs/java/nodespacing-sites.json`.

## Read-set

- The TS tests and fixtures named in §3 (read the exact line ranges; the fixture is the spec).
- `N/internal/{NodeContext,PortContext}.java`, `N/internal/algorithm/{PortContextCreator,NodeLabelAndSizeUtilities,HorizontalPortPlacementSizeCalculator,LabelPlacer,NodeSizeCalculator,CellSystemConfigurator,NodeLabelCellCreator,InsidePortLabelCellCreator}.java`,
  `N/NodeMarginCalculator.java`, `N/internal/NodeLabelLocation.java:371-440` (API surface only).
- `tools/vectors/{NodeMicroLayoutVectors.java,node-micro-layout-vectors.sh,vector-cache.sh}` (read only).
- `plans/ad13-rederivation/t4-unreached.md`; `decisions.md` D2, D7.

## Interface contract (output, consumed by T3a, T3b)

```json
{ "jdk": "...", "oracle": "<commit>", "rowCounts": { "labelLocation": 2, "applyStuff": 1, "fixedRatioMargins": 2,
  "sidelessPortMargins": 1, "insideLabels": 1, "allConstraints": 1, "collapsedContainers": 1, "t4": n },
  "rows": [ { "id": "fixedRatioMargins/two-ports", "site": "fixedRatioMargins",
              "input": { /* ELK JSON */ } | null,
              "steps": [ { "op": "setMinimumContentAreaSize", "cell": "insidePortLabelCells.NORTH", "args": ["<hex>", "<hex>"] } ],
              "expected": { /* site-specific, hex doubles */ } } ] }
```

Row ids are unique and stable. The `expected` shapes per site are fixed in §3 and documented in the header.

## Acceptance criteria

- Given two consecutive runs, when compared, then the JSON is byte-identical and the second prints a cache hit.
- Given every row with a graph, when its `input` is re-imported and its `steps` replayed, then the result equals the
  hand-built scenario's (otherwise the run fails).
- Given `fixedRatioMargins/two-ports`, when inspected, then the first port's right margin is 0 (the
  `spaceEfficientPortLabels` rule, `HorizontalPortPlacementSizeCalculator.java:276-277, :305`).
- Given `labelLocation/out-l-t-set`, when inspected, then `location` is `OUT_L_T`, and `labelLocation/unmatched` is
  `UNDEFINED`.
- Given `git status`, when inspected, then no landed file under `test/golden/refs/` changed.

## Observability / Rollback

N/A — test tooling. Reversible: revert the commit.
