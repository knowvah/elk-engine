<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: shared `vector-cache.sh` (tooling-engineer)

**Goal:** `elkj-vectors.sh` and `elkt-vectors.sh` reuse earlier results whose inputs are byte-identical, through one
sourced helper, with every frozen ref unchanged (C4; D1, D3, D4).

## Context

Both scripts loop over `Elk{t,j}*Vectors.java` (sorted) and run each as a single-file Java program:
`java -cp "$cp" "$program" "$outDir" "$VECTORS_DIR"` (`tools/vectors/elkj-vectors.sh:85-102`). Cost in the 4d final
gate: `.elkt` all four ≈ 6 s; `.elkj` inverse/lexer/parse/validate ≈ 11 s, `ElkjRoundTripVectors` 3 h 06 min,
`ElkjWriteVectors` 40 min. Both slow recorders take an optional `cacheDir` (round-trip: existing; write: T2).

## Write-set

- `tools/vectors/vector-cache.sh` (new; sourced, not executed; SPDX `#` header; no `main`)
- `tools/vectors/elkj-vectors.sh`, `tools/vectors/elkt-vectors.sh`
- `tools/vectors/ElkjRoundTripVectors.java`: header comment only (lines 39-42: the cacheDir the script now passes and
  the salt); no code change

## Read-set

- `tools/vectors/elkj-vectors.sh` (all, 105 lines), `tools/vectors/elkt-vectors.sh` (all)
- `tools/vectors/ElkjRoundTripVectors.java:36-42`, `:100-125`; T2's contract in
  [../batch-1/T2-write-row-cache.md](../batch-1/T2-write-row-cache.md#interface-contracts)
- `decisions.md#d1`, `#d3`, `#d4`; README PF2, PF3

## Interface contracts

**Consumes:** `ElkjRoundTripVectors.java <outDir> <vectorsDir> [<cacheDir> [<idsFile>]]` and T2's
`ElkjWriteVectors.java <outDir> <vectorsDir> [<cacheDir>]`.

**Produces (consumed by T4, T5):**
- Directory `$ELK_ORACLE_DIR/vector-cache/<elkt|elkj>/<Program>/<salt>/`; per-row programs use `<…>/<salt>/rows/`
  as `cacheDir`; whole-program entries hold the output file plus a `.done` marker written last (PF3).
- `salt` = sha256 (via `node`) over the program source, the calling script, `vector-cache.sh`,
  `$ELK_ORACLE_DIR/oracle-build.json`, the classpath string, and `java -version 2>&1`.
- Whole-program key = salt + hash of every file under `tools/vectors/` and `test/corpus/elk{t,j}-curated/` (sorted
  relative paths and bytes). Per-row programs (`ElkjRoundTripVectors`, `ElkjWriteVectors`) use the salt only.
- stderr summary, one line per program: `cache: <Program> hit` | `cache: <Program> recorded` |
  `cache: <Program> rows <hit>/<recorded>` (counted from the recorder's `cached`/`done` lines) | `cache: off`.
- `ELK_VECTORS_CACHE=off`: no cache read or write, no `cacheDir` passed.
- Unchanged: `<script> <outDir>` usage, output files, `ELK{T,J}_VECTORS_LIST=1`, the oracle/Xtext version checks.

## Acceptance criteria

- Given an empty cache, when `elkt-vectors.sh` runs twice, then the first prints `recorded` and the second `hit` for
  all four programs, and both runs' four outputs are `cmp`-identical to `test/golden/refs/java/graph-text-*.json`.
- Given a byte change to any file under `tools/vectors/` (e.g. `touch` is not enough; append a byte to a temp copy of
  a scenario, then restore), when a whole-program entry is looked up, then it misses.
- Given `ELK_VECTORS_CACHE=off`, when either script runs, then no file under `$ELK_ORACLE_DIR/vector-cache/` is
  created or read (check mtimes/listing), and the recorders get no `cacheDir`.
- Given `ELKJ_VECTORS_LIST=1` / `ELKT_VECTORS_LIST=1`, then the output is unchanged.
- Given the `.elkj` cheap programs only (run `elkj-vectors.sh` with the two recorders' rows already cached is T4's job;
  here run the helper's salt/key functions directly), then two calls print the same salt, and editing a program file
  changes only that program's salt. `bash -n` passes on all three scripts under `/bin/bash` (3.2).

## Observability

The summary lines are the run log the gates journal (D3). No other instrumentation.

## Rollback

Reversible: revert the commit; `rm -rf "$ELK_ORACLE_DIR/vector-cache"` removes the cache.

## Commit

`feat(T3): cache vector-program results by salted input hash`; body: D1, D3, D4, and the cold/warm `.elkt` check.
