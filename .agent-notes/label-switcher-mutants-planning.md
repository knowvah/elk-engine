<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: label-switcher-mutants (issue #48, 2026-11-19)

## Observation: 7f2's mutant labels are not recoverable

- **Context**: Looking up A3, A6, A7, A9, A10 for #48.
- **Finding**: The labels appear only in `plans/layered-labels/decision-journal.md:91`; the T17a brief names no list
  and the scratch copy was not kept. `rg A10` over `plans/`, `tools/`, `test/` finds nothing else.
- **Impact**: Mutation checks whose survivors become follow-ups should keep the mutant table (site, edit) in the plan
  directory, not only labels in the journal. This mission's `mutants.md` does.
- **Confidence**: High

## Observation: `assignToWiderLayer` compares against `Layer.getSize()`, not `layerWidths`

- **Context**: Reading `LabelDummySwitcher.java:455-480` for the mutant hints.
- **Finding**: The trivial pass tests `layer.getSize().x >= dummyWidth`, while `findPotentiallyWidestLayer` reads the
  processor's `layerWidths` (max non-dummy node width, updated by `assignLayer`). Java writes layer sizes only in
  phase 4/5 (`LGraphUtil.java:267`, `SimpleNodePlacer.java:70,86`), so at `LABEL_DUMMY_SWITCHER` they are likely 0,
  and only labels of width ≤ 0 pass the trivial "wider layer" test.
- **Impact**: Mutants in `assignToWiderLayer` are killable only with 0-wide labels, or are equivalent; T1 must show
  the layer sizes on the oracle before anything relies on this.
- **Confidence**: Medium (reading, not instrumented)

## Observation: `findLargestUnassignedLabel` returns the last match, i.e. the narrowest

- **Context**: Same reading (`LabelDummySwitcher.java:508-515`).
- **Finding**: Despite its name, the loop keeps overwriting, so among the sorted (descending) unassigned labels it
  keeps the last, narrowest one that covers the layer. The port keeps this (`LabelDummySwitcherSpaceEfficient.ts:157-162`).
- **Impact**: A "first match" mutant (M18) is a real behaviour change; a graph with two unassigned labels of different
  widths on one layer discriminates it.
- **Confidence**: High

## Observation: the labels ref header is pinned by a literal

- **Context**: Phase 2 blast radius.
- **Finding**: `src/alg/layered/LayeredLabelsVectors.test.ts:123` asserts
  `rowCounts` `{ full: 399, models: 640, scenarios: 224, sites: 42 }`; the ref is 14,315,720 bytes under the
  recorder's 16 MiB cap.
- **Impact**: Any new labels row changes that literal; the brief names it (D4).
- **Confidence**: High

## Observation: planning baseline at `bc7250e5`

- **Context**: Phase 8 pre-flight (load ~5, falling from 36).
- **Finding**: `format:check`, `typecheck`, `complexity` clean; full suite with the nine sweep dirs off: 1,173 files
  passed, 10 skipped; **49,295 passed, 93 skipped, 0 failed**, 198.6 s; coverage 98.81 / 96.99 / 98.56 / 98.86.
- **Impact**: The executor's "no existing test result changes" check compares against this count plus new tests.
- **Confidence**: High
