<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decision Journal — grandom

Cite task ids (T1…T15), never commit SHAs: the user signs the branch by rebase at mission end (D9).

| When | Task | Type | Entry |
|------|------|------|-------|
| 2026-10-22 | Start | decision | Branch `feature/grandom` created from `main` at `9f081f0`; brief committed. T4/T5 have no T1 dependency, but they stay in batch 2: launching them during batch 1 would put uncommitted `src/` files into the batch-1 gate run. |
| 2026-10-22 | T1 | decision | Case format `lex <id> <escaped text>` with explicit ids (`<family>-<nnn>`, `corpus-<name>`); classpath unchanged (the oracle jar list already holds the grandom jar); `vector-cache.sh` untouched. 433 rows, 26 with `lexError`. Determinism: cold `/tmp/a`, cache hit `/tmp/b`, `ELK_VECTORS_CACHE=off /tmp/c` all `cmp`-identical to the committed ref. Plain `shellcheck` shows only SC1091 (same as `elkt-vectors.sh`); `-x` clean. |
| 2026-10-22 | B1 | gate | First coverage run invalid: run concurrently with `regen-elkt-refs.sh`, `regen-elkj-refs.sh` and `elkr-vectors.sh` at load average 140; 11 failures, all `Test timed out` (5 s default; the 360 s elkt sweep), 658 s wall vs 155 s baseline. Not a code defect; rerun alone counts as the retry. Lesson: never run coverage concurrently with the JVM gates. |
| 2026-10-22 | B1 | gate | Rerun alone (external load still ~75–110 from other sessions' node processes): format:check 0, typecheck 0, complexity clean (0 violations), coverage 0 (307 files, 17,340 passed + 68 skipped; 99.38/97.95/99.38/99.41; 270 s wall under that load — compare at similar load, stop 12), `regen-elkt-refs.sh && regen-elkj-refs.sh` + `git diff --exit-code test/golden/refs/ test/corpus/` clean, `elkr-vectors.sh` cache hit and `grandom-lexer.json` `cmp` ok. T1 commit = exactly its write-set (6 files). Notes: `.agent-notes/grandom.md`. |
