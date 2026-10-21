<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: per-row cache for `ElkjWriteVectors` (java-architect)

**Goal:** the write recorder accepts an optional `cacheDir` with the round-trip recorder's contract, so a warm
`elkj-vectors.sh` run skips its 40 minutes (C4, D1) without changing a byte of its output.

## Context

`tools/vectors/ElkjWriteVectors.java` records 126 rows (0.62 CPU-hours, 40 min wall in the 4d final gate) through
Xtext's slow serializer, one injector per worker thread. `tools/vectors/ElkjRoundTripVectors.java:179-215` already has
the per-row cache this task copies: key `sha256(id NUL text)`, file `<cacheDir>/<key>.json`, written to `<key>.tmp`
then `ATOMIC_MOVE`, `cached <id>` on a hit. The salt (recorder source, oracle, classpath, JDK) is the directory T3's
script passes, so the key itself stays code-independent (D1).

## Write-set

- `tools/vectors/ElkjWriteVectors.java` only

## Read-set

- `tools/vectors/ElkjWriteVectors.java:1-60` (header), `:180-245` (`main`, `recordAll`), `addFile` (input loading)
- `tools/vectors/ElkjRoundTripVectors.java:36-42` (cache header wording), `:100-125`, `:179-215`, `sha256` helper
- `decisions.md#d1`, `#d3`

## Interface contracts

**Produces (consumed by T3):** `java -cp <cp> ElkjWriteVectors.java <outDir> <vectorsDir> [<cacheDir>]`.
- Row key = `sha256(id + "\0" + inputText)`: `inputText` = the scenario file's bytes decoded as UTF-8 for
  `.elkt`/`.json`/`.elkj` rows; `""` for `java-*` rows.
- Row file = `<cacheDir>/<key>.json` holding the row string exactly as `record` returns it; written to `<key>.tmp`,
  then moved atomically.
- stderr: `cached <id>` on a hit; the existing `done <id> … ms wall, … ms cpu` on a recorded row.
- Without `cacheDir`: behaviour identical to today.

## Acceptance criteria

- Given no `cacheDir`, when the recorder runs, then it follows the same code path as before; the diff touches only
  argument parsing, the input-text plumbing for the key, the cache wrapper in `recordAll`, and the header comment.
- Given a `cacheDir` with a row file for an id, when the recorder runs, then that row is read from the file, not
  recomputed, and the assembled output is identical.
- Given a killed run, when it restarts with the same `cacheDir`, then only `.json` files are trusted (`.tmp` ignored).
- Given `javac -d "$TMPDIR/wv" -cp "<oracle classpath>" tools/vectors/ElkjWriteVectors.java`, then it compiles with 0
  errors (the classpath: `build_classpath` from `tools/vectors/elkj-vectors.sh`, sourced from a copy without its last
  line and with `ROOT` set to the repo, as the PR #15 check did). The full output check is T4's.

## Observability

N/A: no new observable operations (the stderr lines above are the run log).

## Rollback

Reversible: revert the commit; cache files outside the repo are inert.

## Commit

`feat(T2): cache elkj write-vector rows across runs`; body: D1, the key, and that the output is unchanged.
