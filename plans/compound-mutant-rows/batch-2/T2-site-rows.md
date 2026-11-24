<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: the `sites` run rows (I1, I2, I4, I5, conditional I8)

## Steps

1. Build each graph of I1, I2, I4 and I5 as an inline ELK JSON constant, in the style of `SITE_3`/`SITE_17`. Before
   recording, check on the oracle that it reaches the arm. Use a scratch `COMPOUND_FILTER=<id>` run of the recorder
   into `$TMPDIR/compound-mutant-rows/out/`, then a TS replay of that scratch row, with and without the T1 mutant. Tune
   the graph if needed (push-forward: journal both shapes).
2. Add the `EVIDENCE_ROWS` array and its loop at the end of `siteSpecs` (D2). Extend the "Group sites" header comment
   with the new ids and one line on what each targets. Edit nothing else in the recorder.
3. Regenerate by script, after an `uptime` check: `nice -n 10 bash tools/vectors/layered-compound-vectors.sh
   $TMPDIR/compound-mutant-rows/ref`. Copy the output over the ref. Run the D5 id-keyed diff (README). Journal the
   rows, the bytes, the SHA-256 and the oracle stamp.
4. `npx vitest run src/alg/layered/LayeredCompoundSites.test.ts src/alg/layered/LayeredCompoundVectors.test.ts`: every
   row passes. A failing new row is stop 2.
5. Add one entry per new row to `test/helpers/layered-compound-site-arms.json` with the arms it targets. Then
   `node tools/vectors/compound-site-arms.mjs <new ids>` must exit 0.
6. **Twins (D1).** Run `npx vitest run src/alg/layered/LayeredCompoundTwins.test.ts`. If it fails only on
   `post crossHierarchyMap.keySet() (:89)`, and only because new ids differ, append exactly those ids to
   `DIFFERING_ROWS` under a comment `// #60 (compound-mutant-rows): …`, and rerun. The four per-row checks must pass
   (stop 5). Commit this step **on its own**, with a journal row listing each id. Any other failure in that file is
   stop 4.
7. **Mutants.** Rerun each item's T1 mutants through the D5 set against the new ref. Record `killed` or `survived` in
   the journal.
8. I8, only if T1 found a survivor: one non-square-port `run` row, steps 1-7 (budget 30 min).

## Write-set

`tools/vectors/LayeredCompoundVectors.java` (new array, its loop, header comment),
`tools/vectors/layered-compound-vectors.sh` (comment only, if its row list is described there),
`test/golden/refs/java/layered-compound.json` (by script), `test/helpers/layered-compound-site-arms.json`,
`src/alg/layered/LayeredCompoundTwins.test.ts` (`DIFFERING_ROWS` append only).

## Acceptance criteria

- Given the regenerated ref, when the D5 diff runs, then only appended `sites` rows and `rowCounts.sites` differ.
- Given each new row, when `LayeredCompoundSites.test.ts` runs, then it replays at the AD-4 bar.
- Given the new rows, when `compound-site-arms.mjs` runs on them, then every named arm is taken.
- Given each item's mutant, when rerun against the new ref, then the journal records the outcome (`killed` for outcome 1).
- Given a second cold run (`ELK_VECTORS_CACHE=off`), when it finishes, then `cmp` with the committed ref exits 0.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (drop the array and re-record; revert
the list append).
