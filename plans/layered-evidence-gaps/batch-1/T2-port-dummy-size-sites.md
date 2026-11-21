<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: HPDS rows with two and three N/S dummies in one layer

## Context

`HierarchicalPortDummySizeProcessor.ts:30-31` (`delta = 2 × spacing.edgeEdgeBetweenLayers`) and `:67-88` (`setWidths`:
`step = delta`, negated and started at `delta × (n − 1)` on the non-top-down side) only matter with two or more
`EXTERNAL_PORT` nodes of one N/S side in one layer. The placement ref's rows reaching HPDS
(`test/golden/refs/java/layered-placement.json`: four `models/*` rows, `scenarios/port-dummy-size/external-chain` and
`external-fan`) hold at most one. How to get two: [D2](../decisions.md#d2) (`HierarchicalPortConstraintProcessor.java:251-292`
creates one new dummy per original external-port dummy per adjacent layer).

## Task

1. In `tools/vectors/LayeredPlacementVectors.java`, add `sites/HierarchicalPortDummySizeProcessor/two-north`,
   `…/two-south` and `…/three-north` (or `three-south`) in the sites group (`:2401-2416` shape; stop `HPDS` constant
   `:1867`; flag `e` so `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR` runs). Graph: hierarchical node with FIXED_SIDE and
   `spacing.edgeEdgeBetweenLayers` set (e.g. 7), two (three) NORTH resp. SOUTH external ports each with an edge into one
   inner node, no port labels. Keep the recorder under 5,000 lines.
2. Regenerate: `tools/vectors/layered-placement-vectors.sh "$TMPDIR/layered-evidence-gaps/T2/out"` (detached, `nice -n 10`),
   then copy over `test/golden/refs/java/layered-placement.json`. Journal runtime and the oracle stamp.
3. Check each new row's dump: its `layers` holds two (three) N or S dummies in one layer, with widths that differ.
   Otherwise adjust the graph (stop 6 if no shape works).
4. Run the D5 diff: base rows JSON-equal, only the new ids added, `rowCounts.sites` +N.
5. Find the tests that replay `layered-placement.json` `sites/*` rows (`src/alg/layered/LayeredPlacementVectors.test.ts`,
   the HPDS class test if any, `grep -rn "sites/" src/alg/layered test/helpers | grep -i placement`). Add the ids to any
   inventory that pins site ids (D6). Run them.

## Write-set

`tools/vectors/LayeredPlacementVectors.java`, `test/golden/refs/java/layered-placement.json` (by script only), and the
inventory test file(s) found in step 5. Scratch `$TMPDIR/layered-evidence-gaps/T2/`.

## Read-set

`LayeredPlacementVectors.java:1-60` (header, dump format), `:1860-1870`, `:2200-2280`, `:2340-2420`;
`tools/vectors/layered-placement-vectors.sh`; `HierarchicalPortDummySizeProcessor.ts`;
`HierarchicalPortConstraintProcessor.java:197-340`; `plans/layered-node-placement/unreached.md:40-60` (site-row
conventions).

## Acceptance criteria

- Given the regenerated ref, when diffed by id against the base, then only the new `sites/HierarchicalPortDummySizeProcessor/*`
  rows and `rowCounts` differ.
- Given `two-north`, when its dump is read, then two north external-port dummies share a layer and their widths are
  `0` and `delta` in the oracle's order (resp. `delta`, `0` for south).
- Given the TS replay (`npx vitest run src/alg/layered/LayeredPlacementVectors.test.ts` and any inventory test), then
  every new row matches at the AD-4 bar.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: revert the recorder and the ref.
