<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: the opt-in `javac` build and its launch sites

## Context

D1 and D2. Today `vector-cache.sh` runs `java -Delk.commit=… -cp "$cp" "$program" …` in three places (cache off,
`vc_run_whole`, `vc_run_rows`). `layered-loops-vectors.sh` `exec`s `java -cp "$cp" "$PROGRAM" "$@"` for `--sweep` and
`--dump`. `tools/oracle/loops-sweep.sh` runs `java -cp "$cp" "$PROGRAM" "$@"` (line 111) and stamps over `$PROGRAM`
(line 95).

After this task, a program with no sibling directory must launch with exactly today's argv. T5 proves that by the
cold refs.

## Write-set

- `tools/vectors/java-program.sh` (new; SPDX `#` header; sourced, not executed; `# shellcheck shell=bash`)
- `tools/vectors/vector-cache.sh` (salt + three launches + header comment)
- `tools/vectors/layered-loops-vectors.sh` (the `--sweep|--dump` exec; header line about the launch)
- `tools/oracle/loops-sweep.sh` (`run_program`, `compute_stamp`; sources the helper)
- `test/vectors/java-program.test.ts` (new)
- `decision-journal.md`

## Read-set

- `tools/vectors/vector-cache.sh` (all of it)
- `tools/vectors/layered-loops-vectors.sh`
- `tools/oracle/loops-sweep.sh:1-140`
- `test/architecture/oracle-build.test.ts:60-80`: the `spawnSync('bash', …)` pattern
- `test/architecture/elk-pin.fitness.test.ts`: `launchLines` / `passesPin`. The launch lines it scans must still pass
  `-Delk.commit`.
- `.agent-notes/vector-cache-and-key-line.md`: the `Picked up` banner

## Steps

1. **Before-side of the loops sweep (D6).**
   - At the untouched base, run `tools/oracle/loops-sweep.sh` without `--force` (load gate, `nice -n 10`).
   - It must print "fresh". If it does not, let it run at the base: that run is the before-side.
   - Copy `test/corpus/.loops-sweep/results.jsonl` to `$TMPDIR/pm50-before/loops.jsonl`, and journal its sha256 and
     line count.
2. **Test first.** `test/vectors/java-program.test.ts` sources the helper in `bash -c` with stub `java` and `javac`
   scripts first on `PATH` (each appends its argv to a log). It covers:
   - a single-file program: the launch argv is `java <opts> -cp <cp> <dir>/<P>.java <args>`, and `javac` is never
     called;
   - a program with a sibling dir holding `b/Z.java` and `A.java`: the source list is the entry, then `A.java`, then
     `b/Z.java`;
   - for that program, `javac` gets `-d <tmp>` and those sources, and `java` gets `<opts> -cp <tmp>:<cp> <P> <args>`;
   - the temp dir is gone after the launch returns, on success and on a non-zero `java` exit;
   - a `javac` failure returns non-zero and never calls `java`.
3. **Implement `java-program.sh`** (D1).
   - Pass `javac -encoding UTF-8 -proc:none -implicit:class`. Use no `-g`/`-O` flags, and no `--release`: the
     default source level of the JDK the launcher used.
   - Leave `JAVA_TOOL_OPTIONS` as inherited.
   - Return the program's exit status unchanged.
4. **`vector-cache.sh`** (D2).
   - Source the helper (`. "$VECTORS_DIR/java-program.sh"`).
   - The salt adds `f:` for each source after the entry, each preceded by `s:<repo-relative path>`, plus
     `f:$VC_JAVA_PROGRAM`. Keep the existing parts in their order.
   - The three launches go through the helper with the same `-Delk.commit=…` option and arguments.
   - Update the header's salt paragraph.
5. **Launch sites.** `layered-loops-vectors.sh` `--sweep|--dump` and `loops-sweep.sh` `run_program` launch through
   the helper. `compute_stamp` `cat`s every source the helper lists, in place of `$PROGRAM`.
6. **Quick check.** With the program still single-file, rerun `tools/vectors/layered-loops-vectors.sh` (it records
   on the new salt) into `$TMPDIR/pm50-t1`, and `cmp` the output with `test/golden/refs/java/layered-loops.json`.
   Journal the `cache:` line and the result.
7. `npx vitest run test/vectors test/architecture/elk-pin.fitness.test.ts test/architecture/oracle-build.test.ts`
   green. Then commit.

## Interface contracts (consumed by T4, T5)

- `tools/vectors/<P>/` exists if and only if `<P>` is multi-file.
- Sourcing `java-program.sh` defines `VC_JAVA_PROGRAM`, the helper's path, plus the list and launch functions.
- It expects nothing from the caller but `bash` and `PATH`.

## Acceptance criteria

- Given a single-file program, when it is launched through the helper, then the stub log shows exactly today's
  `java` argv and no `javac` call.
- Given a program with a sibling directory, when it is launched, then `javac` compiles the entry and every helper
  into a temp dir that no longer exists afterwards, and `java` runs the class by name with that dir first on the
  classpath.
- Given `layered-loops-vectors.sh` after T1, when it runs on the new salt, then its `layered-loops.json` is
  `cmp`-identical to the committed ref.
- Given the loops sweep at the base, then its before-side sha256 is journaled (or the run that produced it).

## Observability

N/A: tooling only. The evidence is the journal (`cache:` lines, `cmp` results, sha256 values).

## Rollback

Reversible: revert the commit. Cache entries under new salts are never pruned, and old ones become reachable again.
