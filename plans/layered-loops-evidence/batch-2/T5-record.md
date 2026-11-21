<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: add the rows to the loops recorder and regenerate the ref

## Context

The T1-T3 hand-backs give the candidate rows. [D2](../decisions.md#d2) fixes where they go and [D3](../decisions.md#d3)
how the ref may change. The recorder's cold run took 17-18 s at the last mission (`.agent-notes/vector-recorder-debts.md`).

## Task

1. Copy `test/golden/refs/java/layered-loops.json` to `$TMPDIR/layered-loops-evidence/refs-before/`. Write the D3
   id-keyed diff script there: base rows byte-equal as compact JSON, new ids only under the D2 prefixes, header
   differing only in `rowCounts.sites`.
2. Add `evidenceSites()` with every candidate row:
   - order: M1, the D7 rows, M2, then compaction and components;
   - a comment per row naming the mutant or the D7 combination and the Java line;
   - called last in the sites group list (`LayeredLoopsVectorsSites.java:93-99`).
   Apply D2's 500-line rule. If a new helper is needed, insert it into the superclass chain and update the "Helper n of
   10" headers; its name starts with `LayeredLoopsVectors`.
3. Check `uptime` (wait above 12). Run detached:
   `nohup nice -n 10 bash -c 'ELK_VECTORS_CACHE=off tools/vectors/layered-loops-vectors.sh "$TMPDIR/layered-loops-evidence/T5/out"; echo "exit $?"' > "$TMPDIR/layered-loops-evidence/T5/rec.log" 2>&1 &`.
   Then poll in waits of at most 9 minutes. Read the stderr lines `oracle throws: n rows` and `ORACLE THROWS …`. A new
   row that throws is not recorded: diagnose it, and drop it or fix the graph.
4. Run the D3 diff on the output. If it is clean, copy the output over the ref. Journal the oracle stamp, the runtime,
   the byte growth against the 250 KB budget, and each new row's size.
5. Check each row against its hand-back: the M1 `ports` split, the M2 cut indices, and the two one-sided loops of each
   D7 row. A row that does not show its intended property (for example, the oracle sorts differently than the port
   predicted) is a discrepancy: apply stop 2.
6. Replay: `npx vitest run src/alg/layered/LayeredLoopsSites.test.ts src/alg/layered/LayeredLoopsVectors.test.ts` with
   the nine sweep dirs set to `/nonexistent`. Every new row must match at the AD-4 bar; otherwise apply stop 2.
7. Commit: `test(layered): record oracle rows for the 7g survivors`.

## Write-set

`tools/vectors/LayeredLoopsVectors/LayeredLoopsVectorsSites.java`, and either a new
`tools/vectors/LayeredLoopsVectors/LayeredLoopsVectorsEvidence.java` plus `LayeredLoopsVectorsBuild.java:31` (the
`extends`) and the helper header comments of the 10 helpers and the entry file, or neither. Also
`test/golden/refs/java/layered-loops.json` (by script only). Scratch: `$TMPDIR/layered-loops-evidence/T5/`.

## Read-set

The T1-T3 hand-backs in the journal; `tools/vectors/LayeredLoopsVectors.java:1-120` (header, ORACLE THROWS, filters);
`tools/vectors/layered-loops-vectors.sh`; `LayeredLoopsVectorsSites.java`.

## Acceptance criteria

- Given the regenerated ref, when it is diffed by id against the base, then only the new `sites/*` rows and
  `rowCounts.sites` differ, and the growth is ≤ 250 KB.
- Given the replay suites, when they are run, then every new row matches with 0 mismatches.
- Given a second cold run of the recorder, when it is compared with the committed ref, then they are byte-identical
  (repeated in T9, gate 7).

## Observability

N/A: test evidence only.

## Rollback

Reversible: revert the recorder and the ref.
