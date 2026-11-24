<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: the thickness and top-level resizer rows (I3, I6)

## Steps

1. **I6, sites first (D3).** Record the I6 graph as a scratch `sites` run row. Does its last-stop tree show the EAST
   dummy's x and the SOUTH dummy's y as moved by `moveExternalPorts`? Check on the oracle, and in TS with and without
   the call at `HierarchicalNodeResizingProcessor.ts:163`. If it does, land it in `EVIDENCE_ROWS` as
   `sites/HierarchicalNodeResizingProcessor/resizerTopLevelChild` and skip step 2 for I6.
2. **Models rows.** Add `evidenceModelSpecs(out)`, called after the last existing models spec (D2). It holds one
   inline spec for I3 (variant `thickness`) and, if step 1 did not land I6, one for I6 (variant
   `resizerTopLevelChild`). Record into scratch. Check the stop list of each run against the header's "The stops are
   exactly" (items 1-4).
   - For I6, the root's flat P3 sweep may appear as an extra stop. If the existing code records it and `runToStop`
     replays it, it lands as recorded.
   - Any change to `StopRecorder`, `stopProcessor` or `runToStop` is stop 1: I6 becomes a partial with a
     `needs-ruling` issue.
3. Regenerate the ref by script, copy it over, and run the D5 diff (models rows appended after the existing models
   rows; `rowCounts.models` and/or `.sites` changed).
4. `npx vitest run src/alg/layered/LayeredCompoundVectors.test.ts src/alg/layered/LayeredCompoundSites.test.ts
   src/alg/layered/compound/ src/alg/layered/intermediate/HierarchicalNodeResizingProcessor*.test.ts
   src/alg/layered/ElkLayeredHierarchyAnchored.test.ts`. Every test passes without edit. An edit needed elsewhere is
   stop 4.
5. Twins: as in T2 step 6. The I3 run's postprocessor stop is likely selected. Append only ids that pass the four
   checks, as a separate commit with its journal row.
6. Rerun the I3 and I6 mutants against the new ref and journal the outcomes.

## Write-set

`tools/vectors/LayeredCompoundVectors.java` (`evidenceModelSpecs` and its call, `EVIDENCE_ROWS` entry for I6, header
comment), `test/golden/refs/java/layered-compound.json` (by script), `src/alg/layered/LayeredCompoundTwins.test.ts`
(`DIFFERING_ROWS` append only), `test/helpers/layered-compound-site-arms.json` (if I6 is a sites row).

## Acceptance criteria

- Given the I3 row's stop 0, when replayed, then it equals the oracle, and the D15 mutant is killed.
- Given I6, when it lands, then the R29/R30/R34-R38 mutants are killed. If it cannot land, a `needs-ruling` issue
  names the stop-contract change.
- Given the D5 diff, then every existing row is byte-identical and in its order.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (drop the specs and re-record).
