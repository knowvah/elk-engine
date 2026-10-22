<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent notes — vector-cache-and-key-line (mission 4e)

## Observation: `JAVA_TOOL_OPTIONS` leaks into `java -version` output

- **Context**: T3 salt over `java -version` (JDK identity) for `tools/vectors/vector-cache.sh`
- **Finding**: with `JAVA_TOOL_OPTIONS` set, the JVM prints `Picked up JAVA_TOOL_OPTIONS: <flags>` to stderr on every
  launch, including `java -version`. Hashing the raw output made the salt depend on heap/GC flags, so a run with
  different flags missed the whole cache (hours for the round-trip recorder). The salt now drops `^Picked up ` lines.
- **Impact**: any fingerprint built from JVM output must filter that banner; any stderr parser of a JVM program sees
  it as the first line.
- **Confidence**: High

## Observation: the vector cache's first fill and the long-row stall heuristic

- **Context**: T4 cold `elkj-vectors.sh` (2026-10-21)
- **Finding**: a cold run took 3 h 58 min wall at `nice 10` with serial GC; `ptolemy_Trilateration_largest` alone
  took 2 h 47 min wall, so a "60 min without a new `done` row" watcher fires falsely on that last row. Watching the
  recorder JVM's accumulated CPU time (`ps -o time=`) tells a hang from a long row. Warm: 5 s; one evicted row per
  recorder: 21 s.
- **Impact**: watchers for long JVM jobs should test CPU-time progress, not output progress; a warm run is the normal
  gate cost now, and a recorder, script, oracle or JDK change makes the next run cold.
- **Confidence**: High

## Observation: `.elkt` CRLF already counted once before F7

- **Context**: T1 `checkPropertyKey-line-crlf` scenario
- **Finding**: before routing `#parsePropertyKey` through `cursor.lineOf`, the CRLF row already passed (ANTLR's LF
  count equals the node-model count when every break is CRLF); only the lone-CR row was red (port 2/2, oracle 3/5).
- **Impact**: a line-number vector must contain a lone CR to observe a token-line vs node-model-line defect.
- **Confidence**: High
