<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: elk-upgrade-runbook (roadmap row 13, issue #44)

| ID | Decision (one line) |
| -- | ------------------- |
| UP1 | Rehearse against `b715fb10`, the upstream `master` tip and `../elk` HEAD at planning |
| UP2 | The rehearsal runs in a local `git clone` of the queue worktree under `$TMPDIR`, with `ELK_COMMIT` bumped there only |
| UP3 | The scratch Maven build uses its own local repository, an APFS clone of `~/.m2/repository`; `~/.m2` is never written |
| UP4 | The runbook is `docs/architecture/elk-upgrade.md`, made of commands only; no new driver script |
| UP5 | A fitness test keeps the runbook's script inventory equal to the recorder, regen and sweep scripts on disk |
| UP6 | Ref diffs are triaged after the commit stamp is normalized: stamp-only, content, or tool-side |
| UP7 | The rehearsal re-records every vector and golden, detached, with a 10-hour wall-clock cap on the re-record phase |
| UP8 | The pin does not move; the move to `b715fb10` goes to a `needs-ruling` issue with the evidence; no `src/` port |
| UP9 | Scratch state is removed at the end, including the scratch oracle's worktree registration in `../elk` |

## Auto-confirmed (unattended)

Every decision here was taken by the planner with no one present (`/plan-mission --unattended`, 2026-11-14). Each one lists
its rejected options and evidence so the maintainer can audit it. Planning facts are in
`.agent-notes/elk-upgrade-runbook-planning.md`.

### UP1 — Target commit {#up1}

- **Decision.** Rehearse against `b715fb10e90f3691fee1bd77a6c680247e8b2b0e` (2026-10-26, "Merge pull request #1209").
- **Evidence.** `git ls-remote origin master` returned `b715fb10`, which is also `../elk` HEAD, 22 commits past the pin.
  `git diff 8aaa3c14 b715fb10 --stat` covers only these files: `GraphFeature.java` (one space in the `COMPOUND`
  description, upstream PR #1202, which came from this project), `build/pom.xml` (Tycho 4.0.12 → 4.0.13), two CI
  workflows, `build/RELEASE.md` and the 0.12.1 release notes. The partition change #959 and its revert #1205 cancel out.
- **Rejected.** The 0.12.1 tag: a patch release on the 0.12 line, not a commit past the pin on `master`. Waiting for a
  larger upstream change: the issue asks for one rehearsal now, and a small delta still exercises every step of the runbook.
- **Consequence.** The expected result is a clean sweep, apart from the commit stamps (UP6). No ref is known to contain
  the `GraphFeature` text (searched for `levelsand` under `test/golden/refs`).

### UP2 — Rehearsal workspace {#up2}

- **Decision.** Run `git clone --no-hardlinks <queue worktree> "$TMPDIR/elk-upgrade-rehearsal/repo"` at the T1 commit,
  then `npm ci` there and write `b715fb10…` into the clone's `tools/oracle/ELK_COMMIT`. Every runbook command runs in the
  clone with `ELK_SOURCE_DIR=~/git/knowvah/elk`, `ELK_ORACLE_DIR="$TMPDIR/elk-upgrade-rehearsal/oracle"` and
  `ELK_MODELS_DIR=~/git/eclipse-elk/elk-models` set explicitly, because the clone's relative defaults point nowhere.
- **Why.** The rehearsal then runs the runbook literally, including the `ELK_COMMIT` bump, and `git diff` in the clone
  is the diff list. The clone writes only to `$TMPDIR`.
- **Rejected.** (a) Running in the queue worktree with overrides and reverting the refs afterwards: this risks committing
  changed refs and blurs AD-13. (b) Adding an `ELK_COMMIT` override variable to `build.sh`: it changes a shared tool, and
  the rehearsal would then use a path the real move does not use. (c) `git worktree add` from the queue worktree: it
  writes worktree metadata into the main checkout's `.git`, which the queue rules forbid.

### UP3 — Maven isolation {#up3}

- **Decision.** Run `cp -cR ~/.m2/repository "$TMPDIR/elk-upgrade-rehearsal/m2"` (an APFS clone; 806 MB at planning,
  598 GB free), then run `build.sh` with `MAVEN_ARGS="-Dmaven.repo.local=$TMPDIR/elk-upgrade-rehearsal/m2"`. The Maven
  3.9.11 launcher in `.tools/` passes `MAVEN_ARGS` before the CLI arguments (`bin/mvn:216`). For `run.sh` and
  `java-tests.sh`, set `P2_BUNDLES` and `M2_REPO` to the scratch repository.
- **Why.** `build.sh` runs `mvn install` twice, which would overwrite `~/.m2`'s `0.13.0-SNAPSHOT` jars. Those jars are what
  the shared oracle's rebuild and the elk fix worktrees resolve (memory: elk fix-branch test runs). `~/.m2` is also
  outside the queue's write list.
- **Rejected.** The shared `~/.m2`, for the reason above. `maven.repo.local.tail` (Maven 3.9 chained local repositories):
  untested with Tycho's p2 cache, so it is a second unknown in the critical path.
- **Check.** Before the build, write a marker with `touch "$TMPDIR/elk-upgrade-rehearsal/m2-marker"`. After the build,
  `find ~/.m2/repository -newer <marker> | head` must print nothing; journal it.

### UP4 — Runbook form and place {#up4}

- **Decision.** Put the runbook in `docs/architecture/elk-upgrade.md`, beside `parity-dashboard.md`, as numbered steps of
  copyable commands with exit-code meanings and measured costs. It links back to `parity-dashboard.md` § 7 rather than
  copying it. `tools/oracle/README.md` links to the runbook. Any link from a page the docs site includes (`overview.md`,
  `conformance.md`) must pass `docs:build` and `docs:linkcheck`, which go through `INCLUDE_SOURCE_DIR` and
  `CANONICAL_PAGES` in `docs-site/.vitepress/config.ts`.
- **Rejected.** A driver script such as `tools/oracle/upgrade.sh`. The steps need judgment between them (triage, rulings),
  and a script nobody else calls goes stale (YAGNI). If the rehearsal shows a command sequence that is error-prone by hand,
  journal it and file a `follow-up` issue.

### UP5 — Inventory fitness test {#up5}

- **Decision.** Add `test/docs/elk-upgrade-runbook.test.ts`. It requires every `tools/vectors/*-vectors.sh`,
  `tools/oracle/regen-*.sh` and `tools/oracle/*sweep*.sh` (12 sweep, 5 regen and 34 vector scripts at planning) to be
  named in the runbook. It also requires every script path the runbook names under `tools/` to exist.
- **Why.** The runbook is only right while it lists every recorder. A new recorder added by a later mission must fail a
  test, not wait for review (architecture rule: fitness functions).
- **Rejected.** A checklist in review only.

### UP6 — Ref-diff triage {#up6}

- **Decision.** In the clone, after re-recording, run `git diff --stat` for the raw diff. Then rewrite the new sha back to
  `8aaa3c14…` in the changed refs of a throwaway copy (`git diff --name-only | xargs sed`) and diff again for the content
  diff. Classify every changed file:
  - **stamp-only**: identical once the sha is normalized; at planning, 44 vector refs and 10 golden `_meta.json` carry it.
  - **content**: values differ. Run diagnosis mode against both oracles, then decide between "port Java diff" (a
    `follow-up` tied to the UP8 ruling) and an oracle-side change such as a tool or patch.
  - **tool-side**: a recorder or regen script failed or behaved differently, for example because the `b715fb10` build
    needs other flags. Diagnose it, and fix it in the queue worktree only if the fix is in this mission's write-set (T5).
- **Also.** Tests that compare a stamp with `ELK_COMMIT` (`census.test.ts:251`, `elkt-sweep.test.ts:88` and the
  golden-ref tests) are expected to pass in the clone only after the re-record. The runbook says so.

### UP7 — Re-record scope {#up7}

- **Decision.** Re-record everything in the clone: every vector script, every `regen-*.sh`, every golden set, the AWT
  remeasure and the generated graphs. Run them detached under `nice -n 10`, at most two JVM jobs at a time, and only while
  the 1-minute load is at or below 12. The re-record phase has a wall-clock cap of 10 hours. Record each script's wall
  time, which becomes the runbook's cost table.
- **Evidence.** Mission 4e measured a cold `elkj` run at 3 h 58 min, with `ptolemy_Trilateration_largest` alone taking
  2 h 47 min. The cache salt includes `oracle-build.json`, so a new oracle makes every recorder cold.
- **Rejected.** Impact-scoped re-recording, limited to recorders whose bundles the net diff touches: it would not prove
  a "clean sweep", and the issue asks for one.
- **Over the cap.** Journal the unfinished scripts with an impact note (which bundles they exercise against the net diff)
  and file one `follow-up` issue. That is a push-forward, not a halt (stop condition 8).

### UP8 — Pin, carve-out and Java diffs {#up8}

- **Decision.** `tools/oracle/ELK_COMMIT` stays `8aaa3c14`. T5 files a `needs-ruling` issue that proposes the move to
  `b715fb10`, with the triaged diff list, the cost table and the exact commands. It notes that the move regenerates the
  stamped refs, an AD-13 action that needs the maintainer. The `GraphFeature.COMPOUND` carve-out stays, because the pin
  still has the typo. The runbook and the issue note that a move to `b715fb10` or later removes the comment at
  `src/graph/properties/GraphFeature.ts:47` and the "upstream typos" entry in `docs/conformance.md`, and that the ported
  test's string then matches upstream.
- **Rejected.** Porting a Java diff into `src/` now: `src/` would no longer match the pinned oracle.

### UP9 — Cleanup {#up9}

- **Decision.** Once the evidence is journaled (counts, diff lists and timings in the journal, never only in `$TMPDIR`),
  run `git -C ~/git/knowvah/elk worktree remove --force "$TMPDIR/elk-upgrade-rehearsal/oracle"` and then
  `git -C ~/git/knowvah/elk worktree prune`. Then delete `$TMPDIR/elk-upgrade-rehearsal`. `git -C ../elk worktree list`
  must match its pre-mission output, which T2 journals.
- **Why.** `build.sh`'s `worktree add` is the queue rules' one allowed `../elk` write, and removing it only reverses that
  write. Leaving it would leave a dangling registration when `$TMPDIR` is cleaned.
