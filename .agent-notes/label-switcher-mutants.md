<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: label-switcher-mutants (issue #48, 2026-11-19)

Planning-time notes are in `label-switcher-mutants-planning.md`. Journal:
`plans/label-switcher-mutants/decision-journal.md`. The mutant table with verdicts and proofs is
`plans/label-switcher-mutants/mutants.md`.

## Observation: a layer's size is 0 when `LabelDummySwitcher` runs, for every input

- **Context**: T1, checking planning's reading before any equivalence proof relied on it.
- **Finding**: an oracle probe prints `getSize().x` 0.0 for every layer at the switcher's entry (five graphs). A javac
  tree pass over the pinned `alg.layered/src` finds 13 type-resolved calls of `Layer.getSize()`; only
  `LayerSizeAndGraphHeightCalculator.java:60,75` writes `x`, and it runs before P5 while the switcher runs before P4.
  So `assignToWiderLayer` (`LabelDummySwitcher.java:452-467`) succeeds exactly for a label dummy width ≤ 0, always at
  the first layer of the range.
- **Impact**: the "trivial fit" of `SPACE_EFFICIENT_LAYER` needs a 0-wide label to be reached. A mutant of its range
  end is equivalent (M5).
- **Confidence**: High

## Observation: in a vertical layout every `layerWidths` entry of the switcher starts at 0

- **Context**: T1, looking for inputs with all-zero potential widths (M10).
- **Finding**: `LGraphUtil.findMaxNonDummyNodeWidth` returns 0.0 when the direction is vertical
  (`LGraphUtil.java:316-318`), so `WIDEST_LAYER` and `SPACE_EFFICIENT_LAYER` see only label extents there. A label's
  extent along the layers is its original **height** (the graph is transposed before the inserter runs).
- **Impact**: a `DOWN` row reaches the "no layer has a positive potential width" arm without 0-wide nodes. Size the
  labels by height in such rows.
- **Confidence**: High (probe and the recorded row `sites/LabelDummySwitcher/spaceEfficient-vertical`)

## Observation: NaN reaches layered through a double option, not through JSON sizes, and no recorder can carry it

- **Context**: T1 and T2, mutant M11 (`widestLayerWidth = -1`), which differs from the Java only on a NaN potential.
- **Finding**: `JsonImporter.xtend:523-529` maps NaN and infinite sizes to 0, but an option value `"NaN"` parses:
  `spacing.labelLabel=NaN` with a vertical direction makes every label dummy NaN wide
  (`LabelDummyInserter.java:95,111`). The port agrees with the oracle on such a graph (scratch replay). Every recorder
  (20 files under `tools/vectors/`) stops with "NaN in a recorded value", so the row cannot be recorded (#123).
- **Impact**: a mutant that only NaN tells apart is neither killable by a row nor equivalent. Check `>`/`<` initial
  values and `Math.max` chains for this before calling a survivor equivalent.
- **Confidence**: High

## Observation: "equivalent on the one row" was wrong for seven of the survivors

- **Context**: the whole mission. 7f2 journaled five survivors in this file as equivalent on the one recorded row.
- **Finding**: with a kept table of 29 one-edit mutants, 10 survived the base suite; 7 died after two more oracle rows,
  2 are equivalent with a proof from the code, 1 is open (NaN). An exhaustive search over small abstract scenarios
  (the unmutated function against each mutated copy on stub infos, 2 s) predicted which mutants a graph can tell apart
  and found the smallest set of rows; the oracle probe then confirmed each graph in under 2 s.
- **Impact**: keep the mutant table (site and edit) in the plan directory, and treat "no row tells them apart" as a
  missing row until a proof exists. T17b's survivors have the same wording (#125).
- **Confidence**: High

## Observation: `unreached.md:153` lists one row for the class, but a full row reaches it too

- **Context**: T1 baseline; decision D2 assumed the site row was the only `SPACE_EFFICIENT_LAYER` evidence.
- **Finding**: `full/label-options/labels-edge_label_side_selection-smart_01/center-SPACE_EFFICIENT_LAYER` runs the
  strategy with 0-wide labels (the model's labels are unsized) and alone kills M7, M22 and M23.
- **Impact**: a kill suite for this class must include `LayeredLabelsVectors.test.ts` as a whole, not only its site
  rows.
- **Confidence**: High

## Observation: a 0-wide label dummy looks like a long-edge dummy by width in a site dump

- **Context**: T3, anchoring `sites/LabelDummySwitcher/spaceEfficient-fitsAndTies`.
- **Finding**: in `geometry.nodes` a 0-wide label dummy has size `[0, 14]` and a long-edge dummy `[0, 1]`; the T17a
  helper's `widthOf(path) > 0` filter would drop it. The `new/n<k>` paths follow the order of the dumped layers, not
  the order in which the dummies were created.
- **Impact**: identify label dummies in a dump by their recorded size pair, or by a spy on `assignLayer`.
- **Confidence**: Medium (three rows read)

## Observation: the labels ref's row counts are pinned by two literals

- **Context**: T4, gate 4.
- **Finding**: besides `src/alg/layered/LayeredLabelsVectors.test.ts:123` (the header), which planning named,
  `test/helpers/layered-labels-replay-rows.test.ts:96` asserts the same object from `countRows(loadLabelsRows())`.
  The helper test is not part of the label kill suite, so only the full suite shows it.
- **Impact**: a brief that appends rows to `layered-labels.json` must name both (AD-13). Before recording, grep the
  counts of the group that grows over `src/` and `test/`. This mission halted on it (#124) and resumed a day later on
  the maintainer's yes.
- **Confidence**: High
