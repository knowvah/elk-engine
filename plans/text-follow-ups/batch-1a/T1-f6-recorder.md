<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: F6 recorder reloads from the `String` (orchestrator)

**Goal:** `ElkjRoundTripVectors` stops turning lone surrogates into `?`, and the full re-record runs in the background
for T10 to ingest.

## Context

4c T16b1 recorded `test/golden/refs/java/graph-json-text-roundtrip.json` (281 rows). The recorder writes each graph
to a `String`, then reloads it through `text.getBytes(StandardCharsets.UTF_8)` (`tools/vectors/ElkjRoundTripVectors.java:257`),
which encodes a lone surrogate as `?`; the TS replay carries a transport shim for `input-lone-surrogate-escape`
(journal 4c T16b2). D3 makes the reload character-exact.

## Write-set

- `tools/vectors/ElkjRoundTripVectors.java`

## Read-set

- `tools/vectors/ElkjRoundTripVectors.java` (whole file; usage `[<cacheDir> [<idsFile>]]`)
- `tools/vectors/elkj-vectors.sh` (classpath, how one program is invoked)
- `plans/graph-json-text/decision-journal.md` rows T16b1/T16b2; `decisions.md#d3-f6-re-record`
- EMF `XtextResource.load(InputStream, Map)` alternatives: Xtext `XtextResource.reparse(String)` or a
  `URIConverter` over a `StringReader`; settle from the Xtext 2.36.0 source

## Steps and interface contract

1. Change only the reload path so the resource reads the exact `String` (no charset round trip). The SHA-256 line
   (`:285`) hashes for row identity and stays as is.
2. Scratch check: run the recorder on the first 20 ids into `$TMPDIR/f6-check` and diff each row against the
   committed ref.
3. Commit (`test(T1): reload elkj round-trip texts from the string`).
4. Launch the full re-record:
   `nohup nice -n 10 java … ElkjRoundTripVectors $ELK_ORACLE_DIR/rerecord/f6/out $ELK_ORACLE_DIR/rerecord/f6/cache >$ELK_ORACLE_DIR/rerecord/f6.log 2>&1 &`
   (the same classpath `elkj-vectors.sh` builds). Journal the command, start time and pid.

**Output (consumed by T10):** the new ref at `$ELK_ORACLE_DIR/rerecord/f6/out/graph-json-text-roundtrip.json`, and
the cache directory growing while it runs. Liveness check: the log or cache changes within 60 min (stop 7 on a
second failure; restart once, resuming from the cache).

## Acceptance criteria

- Given the recorder reloads from the `String`, when it runs on the first 20 ids, then every row except
  `input-lone-surrogate-escape` (if among them) is byte-identical to the committed ref (otherwise stop 8).
- Given the change is committed, when the full re-record starts, then the journal holds its command and pid and
  its cache grows over time.
- Given the commit, then `git show --name-only HEAD` lists only `tools/vectors/ElkjRoundTripVectors.java`.

## Observability

N/A: no new observable operations. Progress is the re-record's log and cache size.

## Rollback

Reversible: revert the commit; the committed ref is not touched until T10.
