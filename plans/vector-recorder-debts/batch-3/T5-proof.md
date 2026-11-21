<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: proof

## Context

D6. T1 changed `vector-cache.sh`, which is in every salt. So each of the 26 scripts that source it records afresh on
its first run after T1.

The 10 scripts that do not source it are left alone: `core-jdk`, `graph-json`, `guava`, `graph`, `gson`, `java`,
`label-sizing`, `layered-label-metrics`, `metadata` and `transfer` (`-vectors.sh`). Their programs and scripts are
unchanged, so journal that and do not rerun them.

Cold times are in runbook § 7.1.

## Write-set

- `test/golden/refs/java/` (in place)
- `test/corpus/.loops-sweep/` (gitignored)
- the vector cache, through the scripts
- `$TMPDIR/pm50-*`
- `decision-journal.md`

## Read-set

- Runbook `docs/architecture/elk-upgrade.md` § 7 and § 7.1
- `decisions.md` D6
- Stop conditions 3, 4, 8 and 9
- `.agent-notes/recorder-pin-source.md`: load gate and timings

## Steps

1. Check that `git status --porcelain` is clean apart from the journal, and that
   `git diff --exit-code <base> -- test/golden/refs/` is empty. Set `REFS=test/golden/refs/java`.
2. **The `elkj` lane, right after T1's commit.**
   - Gate the 1-minute load below 12 in a loop. Then run the runbook § 7 command:
     `JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -Xmn3g -Xmx16g" nohup nice -n 10 bash -c 'tools/vectors/elkj-vectors.sh test/golden/refs/java; echo "exit $?"' >"$TMPDIR/pm50-elkj.log" 2>&1 &`
   - Journal the pid and the start time.
   - Poll with foreground waits of at most 9 minutes, doing other work between polls. Never end a turn while it runs.
3. **After T4, the other 25 `vc_run` scripts**, one at a time beside the lane (load gate, `nice -n 10`). They are
   `grep -l vector-cache.sh tools/vectors/*-vectors.sh` minus `elkj-vectors.sh` (25 at planning).
   - Journal each script's `cache:` lines and wall time, then `git diff --stat "$REFS"`.
   - `layered-loops` must show `recorded` (its source changed in T4).
   - A `hit` is allowed only for a script already run after its last input change. Say so in the journal row.
4. **Loops sweep.**
   - Run `tools/oracle/loops-sweep.sh`, no `--force`. It must run, not report "fresh".
   - `cmp test/corpus/.loops-sweep/results.jsonl "$TMPDIR/pm50-before/loops.jsonl"`.
   - Then run `npx vitest run --silent=false test/corpus/loops-sweep.test.ts` on the real dir, and journal its
     indicator line.
5. **When the lane ends.** Its log's last line is `exit 0`. Journal the `cache:` lines (`rows 0/281` and `rows 0/126`
   at planning counts for the two row programs, `recorded` for the others) and the wall time. Then rerun
   `tools/vectors/elkj-vectors.sh "$REFS"` once (expect warm rows and recorded whole programs, because the inputs
   digest moved in T3/T4), and journal it.
6. **Final.** `git diff --exit-code <base> -- test/golden/refs/` and `git status --porcelain test/golden/refs/` are
   both empty. Journal both.

## Acceptance criteria

- Given each of the 26 `vc` scripts' first run after T1, then none prints `hit`, and the refs are byte-identical
  afterwards.
- Given the split `LayeredLoopsVectors`, then `layered-loops.json` is unchanged and the loops sweep `results.jsonl`
  is `cmp`-equal to its before-side.
- Given the lane log, then its last line is `exit 0`.

## Observability

N/A: tooling only. The evidence is the journal.

## Rollback

Reversible: `git checkout -- test/golden/refs/` restores the refs if a run is interrupted. Old cache salts are kept.
