<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: vector-recorder-debts (issue #50)

Locked for this mission. A contradiction found during execution is stop 5 ([stop-conditions.md](stop-conditions.md)).

## D1: an opt-in `javac` build beside the single-file launcher

**Context.**

- The reference platform is JDK 21.0.1 (memory `jvm-reference-platform`: never re-record elsewhere). Its source
  launcher runs one file. The multi-file source launcher (JEP 458) arrived in JDK 22.
- The launcher compiles inside the recording JVM. For a recorder that does not pin `-XX:hashCode=2`, javac's
  allocations shift the identity-hash sequence. `.agent-notes/recorder-identity-hash.md` found that a `javac` +
  `java -cp` run did not reproduce `collections.json` before that script was pinned.
- 13 scripts are still unpinned (`.agent-notes/recorder-pin-source.md`).

**Decision.**

- A new sourced helper, `tools/vectors/java-program.sh`, decides how a program runs. A program
  `tools/vectors/<P>.java` with a sibling directory `tools/vectors/<P>/` is multi-file: `javac` compiles `<P>.java`
  plus every `*.java` under `<P>/` into a fresh `mktemp -d` directory under `$TMPDIR`, removed on exit, and
  `java -cp <classes>:<cp> <P> <args>` runs it.
- Without the directory, the command line is exactly today's `java [-D…] -cp <cp> <P>.java <args>`.
- `javac` runs in the caller's environment, so a pinned script's `JAVA_TOOL_OPTIONS` reaches it as it reached the
  launcher's compile.
- The helper exposes two functions, named at the executor's discretion:
  - one that lists a program's sources in a fixed order: the entry first, then helpers in `LC_ALL=C` sorted path order;
  - one that launches the program with extra JVM options and arguments.

**Rejected.**

- (a) Moving every recorder to `javac`: it exposes the 13 unpinned scripts to the identity-hash shift for no benefit.
- (b) JDK 22+: it would mean leaving the reference platform.
- (c) A compiled-class cache under `$ELK_ORACLE_DIR`: `ELK_VECTORS_CACHE=off` must touch no cache, and a compile
  takes seconds.

**Consequences.** Single-file recorders run byte-for-byte as before. A split recorder started directly with the
launcher fails to compile, loudly, so no fitness test is added for it.

## D2: salts and stamps cover every source of a program

**Context.** `vc_salt` hashes `f:<program>`, the calling script, `vector-cache.sh`, `oracle-build.json`, the classpath
and `java -version`. `loops-sweep.sh`'s stamp `cat`s `oracle-build.json` and `$PROGRAM`.

**Decision.**

- `vc_salt` hashes each of the program's sources (helper list order, each framed with its repo-relative path) and
  `java-program.sh`.
- `vc_run_whole`, `vc_run_rows` and the cache-off path launch through the helper.
- `layered-loops-vectors.sh` (`--sweep` and `--dump`) and `tools/oracle/loops-sweep.sh` (`run_program` and
  `compute_stamp`) do the same.
- The other seven sweep scripts and every other `*-vectors.sh` stay unedited.

**Consequences.**

- Every salt changes once, so all 26 scripts that source `vector-cache.sh` record afresh, the `elkj` lane included
  (about 4 h). The issue demands that cold proof anyway.
- The rows of the two row programs key on the salt alone, so later `tools/vectors/` edits (T3, T4) leave them warm.
  Whole-program entries also key on the inputs digest of `tools/vectors/` and miss again; they are cheap.

## D3: split one recorder, `LayeredLoopsVectors`, as the proof

**Context.** "So they can be split" needs evidence that a split recorder reproduces a real ref.
`LayeredLoopsVectors.java` is the largest pinned recorder:

- 4,571 lines (the runbook gives a 5,000-line limit);
- `-XX:hashCode=2`, so allocation order cannot move its output;
- 22 s cold;
- it is the only recorder with all three launch paths: `vc_run`, `--sweep`/`--dump`, and its own sweep script.

`LayeredSiteVectors.java` (4,752) is unpinned.

**Decision.**

- Split `LayeredLoopsVectors.java` by pure moves: no logic, literal, iteration-order or output change.
- The entry file keeps its path, header, `main`, `elkCommit()` and the SHA-256 model table that `check_models` greps.
- Helpers go under `tools/vectors/LayeredLoopsVectors/`, in the default package (package-private access unchanged).
  Each file stays under 1,000 lines where a class boundary allows; journal any exception.
- **Any class whose binary name can reach output stays nested in `LayeredLoopsVectors`.**
  - At planning, `test/golden/refs/java/layered-loops.json` holds `LayeredLoopsVectors$ShrinkWidthManager` once.
  - Re-grep the ref and `results.jsonl` for `LayeredLoopsVectors$` before moving anything.
  - Keep the exception classes (`Bug`, `Refusal`, `NotInPlan`, `OutOfScope`) nested too: their names reach stderr and
    the sweep's `throws` rows.

**Rejected.**

- (a) Splitting all the 1,800+ line recorders: about ten files, ten diverged `Dump` copies and two unpinned recorders.
  It is a separate mission, filed as a `follow-up` (T6).
- (b) Splitting none: it gives no proof that the build reproduces a ref.

## D4: the melk recorder takes list element types from the `.melk` model

**Context.**

- `RecordingRegistry.encodeNumber` throws without an INT or DOUBLE option type.
- The `.melk` sources declare the type (`List<Integer>`; `test/melk/model-options.test.ts` maps
  `java.util.List<Integer>` to `OBJECT`/`List`).
- The Java dump encodes each item through `MetaDataVectors.encode`: an `Integer` gives `{t:"int"}`.

**Decision.**

- `RecorderNames` gains an optional map from option id to list element number kind. Its default is derived, like
  `nestedClasses`, from the parsed vendored `.melk` sources: `List<Integer>` gives `INT`, `List<Double>` gives `DOUBLE`.
- `shapeOf` uses it when the option type is not INT or DOUBLE.
- `test/melk/recorder.ts` gains tests first (TDD): a `List<Integer>` default encodes as `int` items, a `List<Double>`
  default as `double` items, and an unknown list still throws.
- **The two melk tests change shape; no oracle expectation changes.**
  - The `cmEnforcedGroupOrders` registerOption and addOptionSupport records join the `diffCalls` comparison with
    the unfiltered dump.
  - The assertions `unencodable` equal to `[ENFORCED_GROUP_ORDERS]` and `unencodableSupports` equal to `[…]` become
    `[]`. They assert a tool's limit, not ELK behaviour.
  - The separate "registers the List<Integer> default … with the dump items" test may stay (it also asserts the
    frozen default).
- **Exclusions of the id for another reason stay.** `layered-registry.test.ts:122-142` also excludes the id from the
  framework service dump. Keep any such exclusion that exists for a reason other than this recorder; journal which
  stayed and why.

**Evidence that this is not an AD-13 STOP.** The issue (maintainer-authored) names "both melk tests check that record
separately" as the debt to remove. Every dump value those tests compared before is still compared, and the
`cmEnforcedGroupOrders` records are now compared too. T2 proves this with a mutation: a wrong default item must fail
the full comparison.

## D5: the TS dump encodes `KVectorChain` as the recorder does

**Context.**

- In `test/helpers/layered-framework-replay.ts`, `encodeObject` encodes arrays and `KVector`. The port's
  `KVectorChain`, a `LinkedList`, falls through to `{ class }`.
- The recorder writes `{t:"list", c:"KVectorChain", items:[{t:"obj", c:"KVector", fields:{x, y}}…]}`.
- The TS comparator does not compare a list's `c` (header comment, lines 11-13).

**Decision.**

- Add a `KVectorChain` arm before the array arm, with the recorder's shape and `c: 'KVectorChain'`, under the same
  depth rule.
- Then instrument `dumpWithPropertyValues` across the suites that import it: count patched values by class.
  - If nothing is patched any more, delete `test/helpers/layered-site-replay-dump.ts` and point its importers at
    `dumpLGraph`. The 10 importers are listed in T3.
  - Otherwise keep it, narrowed to what it still patches, and journal the classes and counts.
- A comment-only edit of `LayeredOrderVectors.java:2491` ("the TS dump has no KVectorChain encoder") is allowed in
  T3. Do not change that row's recording.

## D6: proof: every cached recorder cold, the loops sweep byte-equal

**Decision.**

- Before T1, record the loops sweep's before-side (T1 step 1).
- After T1, start the `elkj` lane in the runbook's form.
- After T4, run each of the other 25 `vc_run` scripts once, one at a time, under the load gate. Every `cache:` line
  must be `recorded` or `rows 0/n`, never `hit` before its first post-T1 run.
- Run `loops-sweep.sh` without `--force` (its stamp changed), `cmp` the result with the before-side, and run the
  loops consumer test on the real sweep dir.
- Gate 7 must be empty.
- The 10 scripts that do not source `vector-cache.sh` are unchanged. They are not rerun; journal why.

## Auto-confirmed (unattended)

Recorded 2026-11-21 by `/plan-mission --unattended next --branch chore/issue-queue`. The source is issue #50, the
lowest-numbered `queue:ready` issue with no `Blocked by`. No `queue:planned` issue was open.

| Decision | Chosen                              | Rejected                                    | Evidence                                                                                                                |
| -------- | ----------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D1       | opt-in javac by sibling dir         | javac for all; JDK 22 launcher; class cache | `.agent-notes/recorder-identity-hash.md` (javac + `-cp` moved an unpinned ref); `java -version` 21.0.1                  |
| D2       | salt over all sources; cold once    | leave `vector-cache.sh` alone               | `vc_salt` reads `f:$3` (a file); the issue requires the cold proof                                                      |
| D3       | split `LayeredLoopsVectors` only    | split all; split none                       | pinned, 22 s, three launch paths; the ref holds `LayeredLoopsVectors$ShrinkWidthManager`                                |
| D4       | element kind from the `.melk` model | keep the exclusion                          | `recorder.ts` `encodeNumber`; issue text names the separate check as the debt                                           |
| D5       | `KVectorChain` arm in `dumpLGraph`  | keep the patch module                       | `layered-site-replay-dump.ts:2-5`; refs hold 9,893 list-encoded chains, 0 `{class}`                                     |
| D6       | changed-salt run of the 26 scripts  | warm run                                    | precedent `plans/recorder-pin-source` T3                                                                                |

Not irreversible: everything is tooling and test code, and refs must end unchanged. No published API or data contract
changes.
