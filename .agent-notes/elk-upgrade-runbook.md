<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: elk-upgrade-runbook (roadmap row 13, issue #44, 2026-11-14)

Planning-time notes are in `elk-upgrade-runbook-planning.md`. The runbook is `docs/architecture/elk-upgrade.md`.

## Observation: the commit stamp lives in 41 recorder constants, not only in `ELK_COMMIT`

- **Context**: T1, listing what a pin bump has to edit.
- **Finding**: 41 `tools/vectors/*Vectors.java` hold `ELK_COMMIT = "<sha>"`, and that constant is what a vector ref
  prints. Three more files stamp the commit and have their own writer: `tools/melk/sources/manifest.json`
  (`tools/melk/sync-sources.sh`), `test/architecture/bundle-deps.json` (`tools/bundle-deps.ts --write`) and
  `test/corpus/census.json` (`census.ts --write`). The golden `_meta.json` files take it from `oracle-build.json`.
- **Impact**: bumping `tools/oracle/ELK_COMMIT` alone re-records every vector ref with the old sha; the runbook's bump
  step edits the constants with one `sed`. Issue #96 proposes one source for the sha.
- **Confidence**: High

## Observation: a re-record at a new commit changes 57 files by one line each when the Java is unchanged

- **Context**: T3, the rehearsal against `b715fb10` (net `plugins/` diff: one description string).
- **Finding**: 44 vector refs, 10 golden `_meta.json`, the census, the `.melk` manifest and `bundle-deps.json` changed,
  one line each; rewriting the new sha back to the old one made all of them byte-equal to `HEAD`. The 16 refs of
  recorders that stamp no commit (`java-vectors.sh`, `CoreJdkVectors`, `GuavaVectors`, `gson`, label metrics, label
  sizing) did not change at all.
- **Impact**: "stamp-only" can be decided mechanically; any file the normalizing loop prints is content.
- **Confidence**: High

## Observation: cold recorders cost seconds, except `elkj`

- **Context**: T3, every recorder cold against a fresh oracle (each `cache:` line said `recorded`).
- **Finding**: 33 recorder scripts took between 1 s and 70 s each (the layered label, loops and force recorders are the
  slow ones); all of them, the eleven regen commands and the census took 17 minutes of wall time in one lane, load waits
  included. `regen-elkj-refs.sh` took 343 s. Only `elkj-vectors.sh` runs for hours: 4 h 23 min on a shared machine, 3 h
  09 min of it on one row of its round-trip program (`ptolemy_Trilateration_largest`). Among the sweeps only
  `elkj-sweep.sh` is long: 5 h 31 min of running time with `--jobs 6`; `phase-sweep.sh` and `elkt-sweep.sh` take 8
  minutes each, the other nine under a minute.
- **Impact**: planning a re-record: one long lane for `elkj`, everything else beside it. The planning note's "hours for
  every cold recorder" was wrong.
- **Confidence**: High

## Observation: two scripts were committed without the executable bit

- **Context**: T3, `tools/vectors/spore-layout-vectors.sh` ended with exit 126 when run by its path.
- **Finding**: `spore-layout-vectors.sh` and `tools/oracle/elkt-sweep.sh` had git mode `100644`; earlier uses ran them
  through `bash <script>`. Fixed (mode only); `test/docs/elk-upgrade-runbook.test.ts` now checks the bit on every
  vector, regen and sweep script. `tools/vectors/vector-cache.sh` stays `100644` on purpose: it is only sourced.
- **Impact**: a new script needs `chmod +x` before `git add`; the fitness test names one that lacks it.
- **Confidence**: High

## Observation: Tycho 4.0.13 builds on Maven 3.9.11; a `503` from `repo.eclipse.org` costs 3 minutes per file

- **Context**: T2, the scratch oracle build at `b715fb10` (Tycho 4.0.12 → 4.0.13 in `build/pom.xml`).
- **Finding**: the build passed unchanged (`MAVEN_SERIES` 3.9, patches 0001-0003 applied by `git am --3way`). It took
  916 s, of which about 12 minutes were Maven retrying four files of two missing Tycho plugins against the plugin
  repository `dash-licenses-releases` (`build/pom.xml:557-563`), which answered `503` with `retry-after: 60`, before
  falling back to Maven Central. The Maven JVM used 9.5 s of CPU in 9 min 43 s. Without the retries: about 3 minutes.
- **Impact**: a Maven JVM idle for minutes during the oracle build is probably there; check for fresh `*.lastUpdated`
  files under `org/eclipse/tycho/` in the local repository before suspecting Tycho.
- **Confidence**: High (timestamps and the `503` text in the `.lastUpdated` files; `curl` showed the header)

## Observation: a scratch Maven repository isolates `~/.m2` from an oracle build

- **Context**: T2, UP3.
- **Finding**: `cp -cR ~/.m2/repository <scratch>` (APFS clone, 2.4 s, no extra space) plus
  `MAVEN_ARGS=-Dmaven.repo.local=<scratch>` makes both Maven runs of `build.sh` resolve and install there; Tycho's p2
  cache lives inside the local repository and came along. `find ~/.m2 -newer <marker>` printed nothing after the build.
  `P2_BUNDLES` and `M2_REPO` point `run.sh`, the recorders and `java-tests.sh` at it.
- **Impact**: a second oracle at another commit can be built without replacing the `0.13.0-SNAPSHOT` jars the shared
  oracle's rebuild and the ELK fix worktrees resolve.
- **Confidence**: High

## Observation: the pinned oracle's sweep outputs are spread over three places

- **Context**: T4, comparing the new oracle's sweep results with the pinned oracle's.
- **Finding**: `results.jsonl` of the phase sweeps is gitignored and stays in whichever checkout ran the sweep: the
  queue worktree held only `.loops-sweep` and `.compound-sweep`, the main checkout the other seven; the corpus, `elkt`,
  `elkj` and label-sizing outputs are under `../elk-oracle/sweep/`. Every one of these files is free of timings (the
  json sweep's `ms` field excepted), so an unchanged oracle reproduces them byte for byte.
- **Impact**: a real pin move deletes the old oracle and with it the "before" side; the runbook copies the files first
  (section 5 step 1). A byte comparison of `results.jsonl` is the cheapest proof that a sweep did not change.
- **Confidence**: High

## Observation: vitest hides the sweeps' indicator lines in a non-interactive run

- **Context**: T4, the consumer tests of the sweeps, output redirected to a log.
- **Finding**: the tests print `elkt sweep: parse-equal=898/898 …` with `console.log`; the log held only the summary.
  With `--silent=false` the lines appear (`stdout | <file> > <test>` followed by the line).
- **Impact**: journal an indicator line from a run with `--silent=false`.
- **Confidence**: High (observed with vitest 5.0.3; the default that causes it was not looked up)

## Observation: which `sporeOverlap` cases look deterministic changed again, and the TS sweep shows it as a finding

- **Context**: T4, the corpus sweep against the new oracle compared case by case with the pinned oracle's last sweep.
- **Finding**: 5 of 18,930 verdicts differed, all `retarget/sporeOverlap/default/…`. The TS sweep reported
  `…/tests/layered/edge_label_placement/layerSelection_center_02` as an unannotated `mismatch`; 24 separate oracle runs
  of that case gave 22 distinct layouts on the new oracle and 19 on the pinned one. The jitter is
  `alg.spore/…/ElkGraphImporter.java:169`, identical at both commits (#79, #86).
- **Impact**: a `sporeOverlap` difference between two sweeps is not evidence of a Java change; the 24-run check on both
  oracles settles it in two minutes.
- **Confidence**: High

## Observation: `git worktree prune` in `../elk` would remove another session's registration

- **Context**: T2, reading `git -C ../elk worktree list` before adding the scratch oracle.
- **Finding**: the list held a `prunable` entry under `/private/tmp/claude-501/…` from another session. UP9's
  `worktree prune` would have dropped it; `worktree remove --force <scratch oracle>` alone reverses the rehearsal's
  write.
- **Impact**: never prune a shared repository's worktrees as cleanup; remove what you added, by path.
- **Confidence**: High

## Observation: checks that read the ELK checkout's `HEAD` cannot run while it is past the pin

- **Context**: T3, `tools/melk/sync-sources.sh` in the queue worktree and in the clone.
- **Finding**: `sync-sources.sh --check` dies with `ELK checkout is at b715fb10… but ELK_COMMIT pins 8aaa3c14…` in the
  queue worktree, although it reads every blob by commit id (`git show "$PINNED:<path>"`). In the clone, where the pin
  is `b715fb10`, it ran. The bundle-deps regeneration test has the same condition (#89).
- **Impact**: on this machine the vendored `.melk` check and the bundle-deps check are both skipped or failing until the
  pin moves or the scripts stop comparing `HEAD`.
- **Confidence**: High

## Observation: two corpus tests ignore `ELK_MODELS_DIR`

- **Context**: T3, `npm test` in a clone whose default `../../eclipse-elk/elk-models` does not exist.
- **Finding**: `test/corpus/census.test.ts:25` and `test/corpus/corpus.test.ts:41` call `resolveModelsDir({})`, so they
  try the default path only; six tests skipped in the clone although the variable was set. With a symlink at the default
  path both files pass (51 tests). Issue #98.
- **Impact**: a checkout that gets the corpus through the variable alone silently skips the census drift check; the
  runbook's rehearsal mode adds the symlink.
- **Confidence**: High

## Observation: pausing the `elkj` sweep is safe only between its timed kinds

- **Context**: T4, the sweep (six JVMs) started beside the `elkj` recorder; another repository's session then pushed the
  1-minute load past 100 in bursts.
- **Finding**: `SIGSTOP` and `SIGCONT` on the sweep's process group pause and resume it; its `convert` and `write`
  chunks have no per-case timeout (`-Delk.oracle.timeoutMs=0`), its `parse` chunks do, so a pause while a `parse` chunk
  runs could record a false `timeout`. Paused seven times between `convert` and `write` chunks for 101 minutes in all,
  the sweep's `results.jsonl` and all 1,883 output files came out byte-equal to the pinned run's.
- **Impact**: on a shared machine start the sweep alone, not beside the recorder; if it must be paused, check the
  running chunks' kinds first. The load check before a start says nothing about the next seven hours.
- **Confidence**: High

## Observation: a scripted edit that truncates a file is silent

- **Context**: T5, replacing one table cell of the runbook with a Python one-liner whose conditional expression returned
  the truncated string.
- **Finding**: the file went from 624 to 399 lines and the command printed nothing unusual; the line count printed by a
  later `grep -n` and `git status` showed it, and `git checkout -- <file>` restored the committed text.
- **Impact**: after a scripted edit of a long document compare the line count, or assert the edit with a regex
  substitution on the whole text rather than slicing.
- **Confidence**: High

## Observation: the signing rebase can rewrite the queue branch while a mission runs

- **Context**: T5, listing `<base>..HEAD` before the squash: 26 commits instead of 17.
- **Finding**: at 13:34 the branch was rebased onto `main` with every commit signed (`git reflog show chore/issue-queue`
  has the `rebase (finish)` line; `%G?` is `G` on the rewritten commits). The base named in the prompt, `13dcc881`, became
  `2605fe3c` (same tree, subject and date) and was no longer an ancestor of `HEAD`; the working tree did not change, and
  the driver's `refs/mission-base/44` kept the old id, against which it counts the landed commits.
- **Impact**: before the final squash run `git merge-base --is-ancestor <base> HEAD`. If it fails, the rewritten base is
  the commit with the same tree and subject; this mission squashed onto it, left the driver's ref alone, and ended with
  `MISSION: halted` naming the ref to repoint (the driver's own rule for a base that signing rewrote). Commit ids quoted
  in a journal before such a rebase are the pre-rebase ids.
- **Confidence**: High for the facts; the landing choice is this mission's reading of the driver's rule
