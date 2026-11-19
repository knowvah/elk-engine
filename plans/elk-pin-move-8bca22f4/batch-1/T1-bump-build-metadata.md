<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: preconditions, bump, oracle build, metadata

**Agent:** orchestrator (JVM, oracle, `~/.m2`). **Runbook:** `docs/architecture/elk-upgrade.md` §§ 2-6, 7.2.

## Context

The maintainer has already done three things. `../elk` is fast-forwarded to `8bca22f4` (it also shows ` M .gitignore`
and `?? .idea/`, which are not ours). The "before" side is saved to `B=~/git/knowvah/elk-upgrade-before/e7eaea57`, with
twelve sweep `*.jsonl` files, `label-sizing-corpus.json`, `elkt-tree/`, `elkj-tree/`, `java-tests.txt`,
`ported-classes.txt` and `ported-suites.txt`. The old `../elk-oracle` is removed. So skip runbook § 5 steps 1 and 4, and
never run `worktree remove` or `prune`.

## Task

1. **§ 2 preconditions.** Run `uptime`, `uname -sm` (Darwin arm64), `java -version` (21.0.1) and
   `"$ELK_MVN" -v` (3.9.11). Check that `$ELK_MODELS_DIR` HEAD equals `test/corpus/manifest.json`, that `git status`
   is clean apart from the committed brief, and that there is enough disk. Set the § 2 variables with
   `NEW=8bca22f4afa3371562d2f702d59929818f7f7b71` and `B` as above (not `$TMPDIR`). Journal every value.
2. **§ 3 and § 4 triage.** Run the `log`, `diff --stat` and `--name-status` commands and journal their output. Confirm
   the net diff equals #104's table: 6 main files, 5 test files, and no `MANIFEST.MF`, `build/` or deferred path.
   Confirm that no patch file is touched (`log … -- <patch paths>` prints nothing). Journal
   `git -C ../elk log --oneline e7eaea57..HEAD` (queue rule).
3. **§ 7.2 TX1 re-proof** at `$NEW`. Exactly one hit, `TestConfiguration.java`, is expected. Anything else is stop 3.
4. **§ 5 steps 2, 3, 5.** Write the pin file, run the `sed` over the recorder constants (`git grep -c "$OLD" -- tools/vectors`
   prints nothing), then run `nice -n 10 tools/oracle/build.sh`. `oracle-build.json` must name `$NEW`, patches
   0001-0003 and JDK 21.0.1. Journal the wall time and the stamp. `build.sh` replaces the `0.13.0-SNAPSHOT` jars in
   `~/.m2`; #104 says the knowvah/elk queue is idle.
5. **§ 6 metadata.** Run `tools/melk/sync-sources.sh` (`../elk` HEAD is `$NEW`, so the #89 condition does not fire),
   `tools/vectors/metadata-vectors.sh "$REFS"`, `npm run melk:generate`, then `npx vitest run test/melk`. Run
   `npx tsx tools/bundle-deps.ts --write`: the only diff is `elkCommit`.
6. **Review the generated `src/` diff against the two `.melk` hunks.** Expected: `SporeOverlapRemovalOptions` and
   `SporeCompactionOptions` gain `RANDOM_SEED` with default 1, the spore metadata provider registers it for both
   algorithms, and `layerId`/`positionId` lose the output flag and gain the new description sentence. Anything more is
   stop 8. Check whether any TS code branches on an option's output flag (`git grep` the generated flag name in `src/`
   outside `options/`) and journal the answer.

## Write-set

`tools/oracle/ELK_COMMIT`; the `ELK_COMMIT` constant of 41 `tools/vectors/*Vectors.java`; `tools/melk/sources/**`;
`test/golden/refs/java/metadata.json`; the files `npm run melk:generate` rewrites; `test/architecture/bundle-deps.json`.
The oracle at `../elk-oracle` (through `build.sh` only).

## Read-set

The runbook §§ 2-7.2; `tools/oracle/README.md`; `docs/architecture/melk-codegen.md` § 6;
`git -C ../elk diff e7eaea57 8bca22f4 -- '*.melk'`.

## Acceptance criteria

- Given the bump, when `git grep -c e7eaea57 -- tools/vectors tools/oracle/ELK_COMMIT` runs, then it prints nothing.
- Given `build.sh` exits 0, when `oracle-build.json` is read, then it names `8bca22f4…`, patches 0001-0003 and 21.0.1.
- Given `melk:generate`, when `git diff --stat src/` is read, then only the generated spore and layered option files
  change, as in step 6. `npx vitest run test/melk` passes.
- Given `metadata-vectors.sh`, when `metadata.json` is diffed, then beyond the stamp only the `randomSeed` rows of the
  two spore algorithms and the `layerId`/`positionId` rows change.

## Interface contracts

Output for T3-T7: a built oracle whose stamp equals the pin. Output for T5: `SporeCompactionOptions.RANDOM_SEED` (an
integer property, default 1).

## Observability

N/A: no new observable operations. Journal the build's wall time for runbook § 13 step 5.

## Rollback

Reversible: revert the commit and rebuild the oracle at `e7eaea57`.
