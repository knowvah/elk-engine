<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: cold proof

## Context

D5. Every script whose program, own text or `vector-cache.sh` changed runs cold into `test/golden/refs/java`, and the
refs must not move a byte. Since T1/T2 edited `tools/vectors/`, every cache entry misses (inputs digest and salts);
the lines prove it. Cold times from the last move (runbook § 7.1): all short recorders together about 5 minutes,
`elkj-vectors.sh` 4 h 23 min to 4 h 49 min.

## Write-set

`test/golden/refs/java/` (in place; must end byte-identical to the base), the gitignored sweep dirs, the vector cache
through the scripts, `$TMPDIR/pm96-*`, `decision-journal.md`.

## Read-set

Runbook `docs/architecture/elk-upgrade.md` §§ 7, 7.1, 9; T0's journal rows; `decisions.md` D5; stop conditions 3, 4,
8, 9; `.agent-notes/elk-pin-move-8bca22f4.md` (load observation).

## Steps

1. `git status --porcelain` clean apart from the journal; `git diff --exit-code <base> -- test/golden/refs/` empty.
   `REFS=test/golden/refs/java`.
2. **Long lane first.** `uptime` below 12, then exactly the runbook § 7 command (`JAVA_TOOL_OPTIONS="-XX:+UseSerialGC
   -Xmn3g -Xmx16g" nohup nice -n 10 bash -c 'tools/vectors/elkj-vectors.sh test/golden/refs/java; echo "exit $?"'
   >"$TMPDIR/elkj-vectors.log" 2>&1 &`). Journal the pid and start time. Poll with foreground waits of at most 9
   minutes (`timeout 540 bash -c 'while kill -0 <pid> 2>/dev/null; do sleep 20; done'`), doing steps 3-7 between
   polls. Never end a turn while it runs.
3. **Short recorders**, one at a time beside the lane (load below 12, `nice -n 10`): the 29 other scripts T1 touched
   or whose program T1 edited: the four direct scripts, `elkt-vectors.sh`, `elkr-vectors.sh`, and the 23 other
   `vc_run` scripts of § 7.1 (`label-sizing-vectors.sh` is not one: its program and script are unchanged and it does
   not source `vector-cache.sh`). Journal each script's `cache:` lines (all `recorded` / `rows 0/n`, or `off`) and
   wall time, then `git diff --stat "$REFS"` after each. Unchanged scripts (`java-vectors.sh`, `gson-vectors.sh`,
   `label-sizing-vectors.sh`, `layered-label-metrics-vectors.sh`) are not rerun; journal why (no input changed).
4. **Negative path** (D5): build `MetaDataVectors.java`'s classpath as `metadata-vectors.sh` does (source nothing;
   copy the `build_classpath` logic into a `$TMPDIR` helper or print it with a temporary `echo` you do not commit),
   then (a) `java -cp "$cp" tools/vectors/MetaDataVectors.java "$TMPDIR/pm96-neg"`: non-zero exit, the D2 message,
   `$TMPDIR/pm96-neg` holds no `metadata.json`; (b) the same with `-Delk.commit=$(printf 'a%.0s' {1..40})`: the
   written `metadata.json` has that `elkCommit`, and differs from the ref in that one line only (`diff`).
5. **Sweeps** (D5), after step 3, one at a time beside the lane: the eight scripts of T0, no `--force` (each must
   report that it ran, not "fresh": its stamp hashes the edited program). `cmp` each `results.jsonl` with
   `$TMPDIR/pm96-before/<name>.jsonl` (or compare sha256 with T0's journal row).
6. Consumer tests with the real sweep dirs: `npx vitest run --silent=false test/corpus/{compound,labels,loops,order,phase,pipeline,placement,routing}-sweep.test.ts`;
   journal each indicator line.
7. When the lane ends: its log's last line is `exit 0`; journal the `cache:` lines (`rows 0/<n>` for the two row
   programs, `recorded` for the others) and the wall time.
8. Final: `git diff --exit-code <base> -- test/golden/refs/` empty and `git status --porcelain test/golden/refs/`
   empty. Journal both.

## Acceptance criteria

- Given every script of step 3 and the lane, when each finishes cold (no `hit`), then `git diff --exit-code
  test/golden/refs/` is empty and no untracked file appears under it.
- Given `MetaDataVectors.java` run without `-Delk.commit`, then it exits non-zero with the D2 message and writes no
  file; with a foreign 40-hex value, the stamp equals that value and nothing else differs from the ref.
- Given the eight sweeps rerun after T1, then each `results.jsonl` is byte-equal to its T0 before-side (or the
  comparison is journaled void per stop 4).
- Given the `elkj` log, then its last line is `exit 0` and it shows no cache hit.

## Observability

N/A: tooling only. The evidence is the journal: `cache:` lines, wall times, diff results, sha256 values.

## Rollback

Reversible: refs end where they began (`git checkout -- test/golden/refs/` restores them if a run is interrupted);
the vector cache gains entries under new salts, old ones are never pruned.
