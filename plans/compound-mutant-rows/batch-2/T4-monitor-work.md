<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: the `worked` mode for K9 (I7)

## Steps

1. Read `BasicProgressMonitor.java:200-380` at the pin and `src/core/util/BasicProgressMonitor.ts:130-270`. Confirm
   that `doBegin` and `doSubTask` are protected override points on both sides with the D4 signatures. If not, stop 1.
2. **Test first.** In `test/helpers/layered-compound-replay-sites.test.ts`, add cases for the `worked` arm:
   - a hand-made row whose `expected.work` matches gives `[]`;
   - one whose work differs gives a diff naming the entry;
   - a row without `work` replays as before.
3. **Recorder.** Add mode `worked` to `runSiteLayout`, using `WorkRecorder` (D4). Add the row
   `{"ElkLayered/recursiveWork", "worked", <graph>}` to `EVIDENCE_ROWS`. Document the mode in the "Group sites" header
   beside `logged`.
4. **Replay.** Add the TS `WorkRecorder` subclass and the `worked` arm to `layered-compound-replay-sites.ts`. Keep
   `isSiteRunRow` true for the row, and `replaySiteRow`'s order: throws, logged, then run (with `work` compared when
   present).
5. Regenerate the ref, run the D5 diff, and run `LayeredCompoundSites.test.ts`,
   `layered-compound-replay-sites.test.ts` and the twins test. A twins hit is handled as T2 step 6.
6. Rerun the K9 mutant (`ElkLayered.ts:166`, for example `work` to `work + 1`, or as T1 rebuilt it) against the new
   ref. Expected: `killed`.

## Write-set

`tools/vectors/LayeredCompoundVectors.java` (`WorkRecorder`, mode `worked`, one `EVIDENCE_ROWS` entry, header),
`test/golden/refs/java/layered-compound.json` (by script), `test/helpers/layered-compound-replay-sites.ts`,
`test/helpers/layered-compound-replay-sites.test.ts`, `src/alg/layered/LayeredCompoundTwins.test.ts` (append only, if
needed).

## Acceptance criteria

- Given the `worked` row, when replayed, then `work` equals the oracle's entry by entry, and layout, plans, stops and
  tree match as for a run row.
- Given the K9 mutant, when run against the new ref, then `LayeredCompoundSites.test.ts` fails on the new row.
- Given every earlier `sites` row, when replayed, then the result is unchanged (no `work` key, so no comparison).
- Given coverage of `layered-compound-replay-sites.ts`, then the new arm is covered by step 2's cases.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (drop the mode and the row, and
re-record).
