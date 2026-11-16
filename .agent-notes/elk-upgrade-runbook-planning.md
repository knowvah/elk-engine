<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: elk-upgrade-runbook (issue #44, 2026-11-14)

## Observation: the net ELK delta past the pin is one prose fix and a Tycho bump

- **Context**: `git -C ../elk diff 8aaa3c14 b715fb10 --stat` while planning #44.
- **Finding**: `b715fb10` (`../elk` HEAD = `origin/master` by `git ls-remote`) is 22 commits past the pin. Net changes:
  `GraphFeature.java` (one space; the port already carries the corrected text under the prose carve-out),
  `build/pom.xml` Tycho 4.0.12 → 4.0.13, CI workflows, `build/RELEASE.md`, release notes. #959 and its revert #1205 cancel.
  No ref under `test/golden/refs` contains the uncorrected text (`levelsand`).
- **Impact**: a rehearsal against `b715fb10` should be a clean sweep apart from commit stamps.
- **Confidence**: High

## Observation: 54 committed refs stamp the ELK commit

- **Context**: grep of `test/golden/refs` for `8aaa3c14`.
- **Finding**: 44 of 60 files under `refs/java/` and 10 golden `_meta.json` carry the sha. Tests compare stamps with
  `tools/oracle/ELK_COMMIT` (`test/corpus/census.test.ts:251`, `test/corpus/elkt-sweep.test.ts:88`, golden-ref tests).
- **Impact**: bumping `ELK_COMMIT` without re-recording turns those tests red. A real move regenerates them (AD-13 ruling).
- **Confidence**: High (grep counts); Medium on the exact set of stamp-checking tests

## Observation: build.sh installs into ~/.m2

- **Context**: reading `tools/oracle/build.sh:104-110`.
- **Finding**: both Maven runs use `install`, so building another ELK commit overwrites `~/.m2`'s `0.13.0-SNAPSHOT`.
  The Maven 3.9.11 launcher in `.tools/` honours `MAVEN_ARGS` (`bin/mvn:26,216`), so `-Dmaven.repo.local=<scratch>` needs
  no script change. `run.sh` and `java-tests.sh` read third-party jars from `P2_BUNDLES` and `M2_REPO`.
- **Impact**: any scratch oracle build must redirect the local repository (UP3).
- **Confidence**: High (source read); the Tycho behaviour with a cloned local repository is unverified until T2

## Observation: sizes and counts at planning

- **Context**: `du` and `ls` while planning.
- **Finding**: `~/.m2/repository` 806 MB (p2 241 MB); `../elk-oracle` 2.0 GB; `node_modules` 302 MB; 598 GB free.
  34 `tools/vectors/*-vectors.sh`, 5 `tools/oracle/regen-*.sh`, 12 `tools/oracle/*sweep*.sh`. Baseline gates on
  `13dcc881`: format, typecheck and complexity exit 0; coverage failed twice on the #87 intermittent alone
  (`ts-layout-shards.test.ts:173` and `:204`, load 17-30) and passed on the third run (98.92/96.99/98.84/98.92, 49,541
  tests; `coverage-logs/coverage-20261114-120523-68702.log`).
- **Impact**: sizing for T2/T3; the UP5 test's expected inventory.
- **Confidence**: High
