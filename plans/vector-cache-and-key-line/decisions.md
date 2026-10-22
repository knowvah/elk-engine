<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: vector-cache-and-key-line (mission 4e)

All approved by the user on 2026-10-21. AD-1…AD-16, the standing rules, G1–G8 and 4c's D1–D13 also apply.

| ID | Decision |
|----|----------|
| [D1](#d1) | Shared `tools/vectors/vector-cache.sh`; salted per-program cache; whole-program for cheap programs, per-row for the round-trip and write recorders |
| [D2](#d2) | No scheduling or concurrency changes |
| [D3](#d3) | A summary line per program; `ELK_VECTORS_CACHE=off` forces cold; warm proves refs == cache only |
| [D4](#d4) | Cache under `$ELK_ORACLE_DIR/vector-cache/`; no pruning |
| [D5](#d5) | F7 vectors: two `.elkt` validate scenarios; the lone-CR row must be red before the fix |
| [D6](#d6) | PF1 re-approved |
| [D7](#d7) | Branch, unsigned commits, user lands with a merge commit |

## D1: cache granularity and key {#d1}

- **Salt** per program = sha256 over: the program's source file, the calling script (`elk{t,j}-vectors.sh`) and
  `vector-cache.sh`, `$ELK_ORACLE_DIR/oracle-build.json`, the classpath jar list as built, and `java -version` output.
  Any recorder edit, oracle rebuild or JDK change makes a new salt, so nothing stale is reused.
- **Whole-program cache** (every `.elkt` program; `.elkj` inverse, lexer, parse, validate): key = salt + a hash of
  every file under `tools/vectors/` and `test/corpus/elk{t,j}-curated/`. A hit copies the cached output; a miss runs
  the program and stores its output. Coarse on purpose: a miss costs seconds, and no input can be left out.
- **Per-row cache** (`ElkjRoundTripVectors`, `ElkjWriteVectors`): the script passes
  `$ELK_ORACLE_DIR/vector-cache/elkj/<Program>/<salt>/rows/` as the recorder's `cacheDir`; each row is keyed by
  `sha256(id NUL inputText)` (the round-trip recorder's existing key; `java-*` write rows use an empty text). A new
  scenario records one row; the output is always reassembled by the recorder, sorted by id.
- Rejected: whole-program only (a new scenario under `elkj-parse-scenarios/` would re-record all 281 round-trip rows,
  3 h); per-row only (the cheap programs would get no cache, against the user's "add the cache" for `.elkt`).
- Hashing uses `node` (already required by the scripts), never `shasum`/`sha256sum`.

## D2: cold-run wall time {#d2}

No largest-first scheduling (the recorder's smallest-first order is documented), no concurrent recorders (16 threads
on 12 cores). Cold runs happen only when a recorder or the oracle changes; `ptolemy_Trilateration_largest` (1.6
CPU-hours in one serializer call) sets the floor either way.

## D3: gate visibility {#d3}

- Each program prints one line: `cache: <Program> hit` or `cache: <Program> recorded`; the per-row recorders print
  `cache: <Program> rows <hit>/<recorded>`.
- `ELK_VECTORS_CACHE=off` reads and writes no cache and passes no `cacheDir`.
- A warm run proves the refs equal the cached outputs; a cold run or a miss proves they equal the oracle. The final
  gate of a mission that changes `tools/vectors/` or the oracle runs cold (or relies on a cold run made after the last
  such change, as T4 here).

## D4: cache location {#d4}

`$ELK_ORACLE_DIR/vector-cache/<elkt|elkj>/<Program>/<salt>/` (outside the repo; `tools/` may read `ELK_ORACLE_DIR`).
Old salts stay (about 1 MB each); the runbook says `rm -rf "$ELK_ORACLE_DIR/vector-cache"` clears them. No new
environment variable besides `ELK_VECTORS_CACHE`.

## D5: F7 vectors {#d5}

Two new files in `tools/vectors/elkt-validate-scenarios/` (already `-text` in `.gitattributes`): one with a lone CR,
one with CRLF, each placing a property key after the break(s) that draws a validator issue anchored on
`ELK_PROPERTY_TO_VALUE_MAP_ENTRY__KEY` (e.g. `'<id>' is not a layout option.`,
`src/graph/text/validation/ElkGraphValidator.ts:161`). Recorded by `elkt-vectors.sh` only. Before the fix the lone-CR
row must fail on `line` (stop 5 otherwise); the CRLF row passes before and after.

## D6: count literals {#d6}

PF1 re-approved: `expect(...).toHaveLength(n)` literals that count `graph-text-validate.json` rows rise by exactly the
rows added; nothing else in a test changes.

## D7: branch and landing {#d7}

`feature/vector-cache-and-key-line` off `origin/main`; one unsigned commit per task; the user signs, pushes, opens the
PR and merges with a merge commit (the journal cites task ids).
