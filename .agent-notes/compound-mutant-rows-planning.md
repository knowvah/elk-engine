<!-- SPDX-License-Identifier: EPL-2.0 -->

# compound-mutant-rows: planning observations (issue #60)

## Observation: the #60 requeue follows the #156 ruling

- **Context**: choosing the next queue issue on 2026-11-23.
- **Finding**: #60 was parked at 21:22Z on whether `DIFFERING_ROWS` (`LayeredCompoundTwins.test.ts:126-146`) may take
  its ids. The maintainer ruled #156 "Extend by the 10 ids above" at 21:46:34Z and requeued #60 at 21:46:58Z, as the
  parking comment asked. The brief reads this as option 1 (D1). The extension is a separate commit, so it can be
  vetoed.
- **Impact**: if the maintainer meant only #156's ten ids, revert the D1 commit(s) and withhold the selected rows.
- **Confidence**: Medium (inferred from the timeline, not a written ruling on #60)

## Observation: compound tests that read rows by position or filter

- **Context**: checking what new compound rows could break (AD-13).
- **Finding**: `rowCounts` is checked against the file, not pinned. `CompoundGraphPreprocessor.test.ts:15` takes the
  first models row whose stop is the preprocessor (`.find`). `ElkLayeredHierarchyAnchored.test.ts:41` filters the
  `edge_label_placement-hierarchy01/*/default` models rows. The only pinned id list over compound rows is
  `DIFFERING_ROWS`.
- **Impact**: new models rows must be appended after the existing ones and must not use those model ids.
- **Confidence**: High (from reading the files; #156's dry run found only `DIFFERING_ROWS` for compound sites rows)

## Observation: Java monitor work is a float

- **Context**: designing the K9 recorder aid.
- **Finding**: `BasicProgressMonitor.doBegin(String, float, boolean, int)` (`:237`) and `doSubTask(float, int)`
  (`:363`). The TS override points are at `src/core/util/BasicProgressMonitor.ts:162` and `:254`.
- **Impact**: record the work as an integral JSON number and fail on anything else, so that no float-to-text shim is
  needed.
- **Confidence**: High
