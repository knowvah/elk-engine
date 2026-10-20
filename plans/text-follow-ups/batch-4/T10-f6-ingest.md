<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10: F6 ingest (orchestrator)

**Goal:** the committed round-trip ref comes from the character-exact recorder, and the replay needs no transport.

## Write-set

- `test/golden/refs/java/graph-json-text-roundtrip.json` (copied from `$ELK_ORACLE_DIR/rerecord/f6/out/`, never edited)
- `test/golden/elkj-roundtrip.test.ts` (PF3: delete the transport and its comment; nothing else)
- `docs/conformance.md` (`:491-492` lone-surrogate paragraph; §8 round-trip numbers),
  `docs/architecture/elk-json-text.md` (round-trip evidence, recorder cost measured by T1's run)
- `plans/graph-json-text/follow-ups.md` (F6 Status only)

## Read-set

- T1's journal rows (command, start, pid); `$ELK_ORACLE_DIR/rerecord/f6.log`
- `decisions.md#d3-f6-re-record`, `#d4-divergences`
- `test/golden/elkj-roundtrip.test.ts` (the transport, its callers)

## Steps

1. Check the run: exit status 0 in the log, 281 rows.
2. Diff old vs new ref by row id (node, keys sorted). Expected: only `input-lone-surrogate-escape` differs.
   Any other changed row: diagnose under D4 (artifact in the journal); in-mission fix only per D4, else stop 10 or a
   new follow-up row.
3. Install the ref; delete the transport; run `npx vitest run test/golden/elkj-roundtrip.test.ts`.
4. Docs and the F6 status.

## Acceptance criteria

- Given the new ref, when diffed against the old one, then only `input-lone-surrogate-escape` differs (or every other
  difference has a D4 diagnosis in the journal).
- Given the transport is removed, when the round-trip replay runs, then 281/281 rows pass with the same class counts
  as 4c T16b2 (244 byte-equal, 37 errors, 27 endpoint drops) unless the journalled diff says otherwise.
- Given the docs, then the transport paragraph is replaced by the fix and the recorder's measured wall time.

## Observability / rollback

N/A. Reversible: revert restores the old ref and transport together.

## Commit

`test(T10): record elkj round trips without the utf-8 transport`; body cites F6, D3, the row diff.
