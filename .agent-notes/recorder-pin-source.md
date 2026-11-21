<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: recorder-pin-source (issue #96, 2026-11-20)

Planning-time notes are in `recorder-pin-source-planning.md`. Journal: `plans/recorder-pin-source/decision-journal.md`.

## Observation: editing the 13 unpinned recorder scripts' programs moved no ref

- **Context**: the cold proof after each of the 41 stamping recorders gained a method (`elkCommit()`) and, in 38 of
  them, a new first statement of the vector path. Thirteen scripts do not pin `-XX:hashCode=2` (`alg-common`,
  `comment`, `elkt`, `elkj`, `elkr`, `graph`, `graph-json`, `metadata`, `transfer`, `node-micro-layout`,
  `nodespacing-site`, `layered-framework`, `layered-site`), and the single-file launcher compiles in the recording
  JVM, which is how `collections.json` once followed the text of `JavaVectors.java` (`recorder-identity-hash.md`).
- **Finding**: every ref of those 13 scripts (24 files) was re-recorded cold from the edited source and is
  byte-identical to the committed one. So is every ref of the pinned scripts.
- **Impact**: a code edit to one of these recorders is not, by itself, a ref change. The evidence covers these edits
  (one method, one statement); it is not a proof that no row of them reads an identity hash. Rerun cold and `cmp`
  after any recorder edit, as before.
- **Confidence**: High (for the edits made)

## Observation: `AlgCommonVectors.java` does not compile under `-XX:hashCode=2`

- **Context**: a harness that started every stamping recorder without `-Delk.commit` passed
  `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2` to all of them, because three recorders test the flag first.
- **Finding**: with the flag, the single-file launcher rejects `AlgCommonVectors.java` at the enhanced `for` over
  `List.of(Map.entry(EUCLIDEAN, EUCLIDEAN_COST), …)`: `incompatible types: Entry<Object,Object> cannot be converted to
Entry<String,ICostFunction>`. Without the flag the same source on the same classpath compiles. The base source
  (`f69bbe41`) fails the same way, so the edit of this mission is not the cause; the script's own classpath fails the
  same way, so the classpath is not either. Why javac's inference changes with a constant identity hash was not
  traced. `alg-common-vectors.sh` does not pin the flag, so nothing is affected today.
- **Impact**: pinning the flag for this script through `JAVA_TOOL_OPTIONS` would stop it at compile time. A pin there
  needs a compile step outside the recording JVM, or explicit type witnesses on that expression (a recorder edit).
- **Confidence**: High (three controlled runs)

## Observation: one superset classpath starts 40 of the 41 stamping recorders

- **Context**: the same harness.
- **Finding**: every oracle jar of `oracle-build.json` plus the newest p2 jar of every bundle any
  `tools/vectors/*-vectors.sh` lists compiles and starts 40 of the 41 stamping recorders under `-XX:hashCode=2`, with
  `<outDir> tools/vectors` as arguments (`AlgCommonVectors` is the exception above; it was started on its own
  script's classpath without the flag). Each stops at its first statement when the property is missing, within a few
  seconds (compile included), about a minute for all 41.
- **Impact**: a cheap way to check a change that touches every recorder's start-up before any long run.
- **Confidence**: High

## Observation: the load gate has to be a test, not a printed value

- **Context**: starting the `elkj` lane.
- **Finding**: `uptime && nohup …` printed a 1-minute load of 14.9 and started the lane anyway. The later runs went
  through a loop that polls until the load is below 12. The phase sweep, started at 10.7, took the load to 124 by
  itself (one JVM at 800 % CPU for 8 minutes), as `elk-pin-move-8bca22f4.md` warned; its `results.jsonl`, 595 `timeout`
  rows included, was still byte-identical to the one recorded two days earlier.
- **Impact**: gate with `while [ "$(echo "$(load) >= 12" | bc)" -eq 1 ]; do sleep 15; done`, and start the phase
  sweep last, with nothing else waiting on a quiet machine.
- **Confidence**: High

## Observation: measured cold times (reference platform, beside the `elkj` lane)

- **Context**: T3, every script under `nice -n 10`, one at a time.
- **Finding**: the 29 short recorder scripts took 6 min 17 s of recorder wall time in total (longest: `spore-layout`
  67 s, `layered-labels` 58 s, `layered-loops` 49 s, `force` 47 s); with the load gate's waits the batch took 28
  minutes on a machine shared with two other sessions. The eight sweeps took 12 min 48 s of sweep time (phase 479 s,
  the other seven 10 s to 78 s). The `elkj` lane took 4 h 03 min (`ElkjRoundTripVectors` 3 h 22 min for 281 rows,
  `ElkjWriteVectors` 41 min for 126 rows), against 4 h 23 min and 4 h 49 min in the last two moves.
- **Impact**: the short recorders and the sweeps fit inside the first half hour of the `elkj` lane; the lane decides
  the mission's length.
- **Confidence**: High
