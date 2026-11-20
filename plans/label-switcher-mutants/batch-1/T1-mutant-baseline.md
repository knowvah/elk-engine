<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: mutant baseline and the layer-size check

## Context

7f2's survivors are lost by label (D1). This task makes the mutant set executable and finds out which mutants the
current rows already kill. It also checks D6's runtime fact so that equivalence claims rest on evidence. The class is
reached by exactly one row today (`sites/LabelDummySwitcher/spaceEfficient`, Sc13 in
`plans/layered-labels/unreached.md:92`: chain a→e of 20-wide nodes, labels 100/80/60 on long edges and 90 on a
one-dummy edge).

## Read-set

`src/alg/layered/intermediate/LabelDummySwitcherSpaceEfficient.ts`, `LabelDummySwitcher.ts:140-240`,
`LabelDummyInserter.ts:80-130` (the label dummy's width); Java `LabelDummySwitcher.java:140-240,407-560`,
`LabelDummyInserter.java`, `LGraphUtil.java:255-275`; `src/alg/layered/intermediate/LabelDummySwitcherSites.test.ts`;
`tools/vectors/LayeredLabelsVectors.java:2881-2930,3000-3012` (the `site` helper and Sc13); decisions D1, D2, D3, D6.

## Write-set

`plans/label-switcher-mutants/mutants.md` (the `baseline` column, any `M19+` rows),
`plans/label-switcher-mutants/decision-journal.md`. Scratch: `$TMPDIR/lsm-mutants/` (copy, driver, log) and
`$TMPDIR/lsm-probe/` (the oracle probe). Nothing in the worktree outside `plans/label-switcher-mutants/`.

## Steps

1. Build the scratch copy and driver (D3). Run the kill suite unmutated in the scratch copy: green, with the test
   count journaled.
2. For each M, apply its edit, run D2, record `killed (<first failing cases>)` or `survived`, and restore. Before the
   run, check that the restored file is byte-identical to the original (`cmp`).
3. Oracle probe (D6): a single-file `java` program on the oracle classpath (the jar list from
   `oracle-build.json`, as `layered-labels-vectors.sh` builds it), with a `LABEL_DUMMY_SWITCHER`-preceding
   processor, or a `LayoutProcessorConfiguration` hook, or a debug run with the stop. Feed it Sc13's graph plus one
   variant with a 0-wide center label, and print, at the processor's entry, every layer's `getSize().x`, every label
   dummy's `getSize().x`, `leftmostLayerId`/`rightmostLayerId` and `layerWidths`. Run it under `nice -n 10` after
   `uptime`. Journal the output summary. This is an oracle read, not a patch: no oracle source changes.
4. For each survivor: confirm or rewrite its `Hint` against the probe output and the Java, so that T2 has a concrete
   graph requirement. Classify M1, M5 and M11 (and any other) as `equivalent` candidates with the D6 argument drafted.
   T3 makes the final verdict.
5. Journal: baseline killed/survived counts, the survivor list, and whether the D6 fact holds.

## Interface contracts

To T2: `mutants.md` with `baseline` filled in, and for each survivor a `Hint` that names the graph property
(widths, spans, input order) a row needs. The probe's printout summary is in the journal.

## Acceptance criteria

- Given the unmutated scratch copy, when D2 runs, then it is green with the same test count as the worktree.
- Given each of M1-M18, when applied alone, then `mutants.md` records `killed (…)` or `survived` for it, and the
  restored file is byte-identical to the original.
- Given the oracle probe on Sc13's graph, when it runs, then the journal records each layer's `getSize().x` at
  `LABEL_DUMMY_SWITCHER` entry, and D6's fact is stated as shown or refuted.
- Given every survivor, then its `Hint` is confirmed or rewritten with a cite (Java line or probe output).

## Observability

N/A: no new observable operations. The scratch log is evidence, quoted in the journal.

## Rollback

Reversible: no worktree change except plan files.
