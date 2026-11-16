<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: scratch setup and oracle build at `b715fb10`

## Context

UP1-UP3 and UP9. The rehearsal must leave `../elk` (apart from the temporary worktree registration), `../elk-oracle`,
`~/.m2` and the queue worktree's refs untouched. Measured at planning: `~/.m2/repository` holds 806 MB (p2 241 MB), the
shared oracle 2.0 GB, `node_modules` 302 MB, and 598 GB are free.

## Task

Follow runbook sections 3-5 and 14 as written. Journal every command that fails as written and its correction (T5 folds
these into the runbook).

1. Journal the pre-state: `git -C ~/git/knowvah/elk worktree list`, `git -C ~/git/knowvah/elk status --short | head`,
   and the `../elk-oracle/oracle-build.json` stamp.
2. Net-diff triage (section 3) of `8aaa3c14..b715fb10`: journal one row per changed path with its class. Planning
   expects `GraphFeature.java` (prose; the port already carries the corrected string, `docs/conformance.md:159`),
   `build/pom.xml` (Tycho 4.0.13), CI and docs files (out of scope), and no test-bundle change. Also journal the
   deferred-bundle check (no change in `alg.libavoid` or `alg.graphviz.*`, so no ADR revisit).
3. Clone (UP2): `git clone --no-hardlinks "$PWD" "$R/repo"` with `R=$TMPDIR/elk-upgrade-rehearsal`; check out the T1
   commit; run `npm ci`; write the full `b715fb10e90f3691fee1bd77a6c680247e8b2b0e` into `$R/repo/tools/oracle/ELK_COMMIT`.
   Write the env block into `$R/env.sh`, which T3 and T4 source: `ELK_SOURCE_DIR`, `ELK_ORACLE_DIR=$R/oracle`,
   `ELK_MODELS_DIR`, `ELK_MVN=<queue>/.tools/apache-maven-3.9.11/bin/mvn`,
   `MAVEN_ARGS=-Dmaven.repo.local=$R/m2`, `P2_BUNDLES=$R/m2/p2/osgi/bundle` and `M2_REPO=$R/m2`.
4. Scratch Maven repository (UP3): run `cp -cR ~/.m2/repository "$R/m2"`, then `touch "$R/m2-marker"`.
5. Build (sections 4-5): check `uptime` (≤ 12), then from `$R/repo` run `. "$R/env.sh"; nice -n 10 tools/oracle/build.sh`,
   detached, with the log in `$TMPDIR`. Journal the wall time, whether `git am --3way` applied 0001-0003, the Tycho
   version used, and the exit code.
6. Check: `$R/oracle/oracle-build.json` names `b715fb10…` and patches 0001-0003; `find ~/.m2/repository -newer "$R/m2-marker" | head`
   prints nothing; `../elk-oracle/oracle-build.json` is unchanged; `git -C ~/git/knowvah/elk status --short` equals the
   pre-state.
7. Smoke test: `tools/oracle/run.sh --list-algorithms` from the clone against the scratch oracle equals the same command
   against the shared oracle, run from the queue worktree. Journal both.

## Write-set

`$TMPDIR/elk-upgrade-rehearsal/**` (clone, `m2`, `oracle`, `env.sh`, marker); `plans/elk-upgrade-runbook/decision-journal.md`.
`build.sh` adds the worktree metadata in `../elk` (the queue rules' exception; UP9 removes it).

## Read-set

`docs/architecture/elk-upgrade.md` §§ 3-5, 14; `tools/oracle/build.sh`; `tools/oracle/README.md`; `decisions.md#up1`,
`#up2`, `#up3`, `#up9`; `stop-conditions.md` items 1, 3 and 4.

## Interface contracts

T3 and T4 consume `$R/env.sh`, the clone at `$R/repo` with the bumped `ELK_COMMIT`, and the scratch oracle at `$R/oracle`
with a valid `oracle-build.json`. Journal the absolute value of `$R`.

## Acceptance criteria

- Given the scratch env, when `build.sh` runs, then it exits 0 and `oracle-build.json` names `b715fb10…` and patches
  0001-0003.
- Given the marker, when the build ends, then `find ~/.m2/repository -newer <marker>` prints nothing.
- Given `../elk` and `../elk-oracle`, when T2 ends, then `git status` in `../elk` and the shared stamp equal their journaled
  pre-state, and `worktree list` differs only by the scratch oracle.
- Given both oracles, when `--list-algorithms` runs, then both print the same array.

## Quality bar

Every number and command result is journaled. The rehearsal's findings must survive the deletion of `$TMPDIR`.

## Observability requirements

N/A — scratch tooling run; journal rows are the record.

## Rollback notes

Reversible: UP9 removes the worktree registration and deletes `$R`. If T2 halts, still run the UP9 cleanup before
ending, and journal it.
