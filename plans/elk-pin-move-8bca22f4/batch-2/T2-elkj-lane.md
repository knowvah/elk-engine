<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: the `elkj` recorder lane

**Agent:** orchestrator. **Runbook:** § 7 (the `elkj` paragraph and command).

## Task

Once `uptime` is at or below 12, start `tools/vectors/elkj-vectors.sh test/golden/refs/java` detached, with
`JAVA_TOOL_OPTIONS="-XX:+UseSerialGC -Xmn3g -Xmx16g"`, under `nice -n 10`. Write its log to `$TMPDIR/elkj-vectors.log`,
with the exit code as the last line. Capture the pid with `$!`; do not use `pgrep -f`, which can match its own shell
(`.agent-notes/elk-pin-move-e7eaea57.md`). Watch the JVM's CPU time (`ps -o time= -p <pid>`), not its output: one row
runs for hours silently. The last move took 4 h 28 min cold. Do T3-T6 between polls (at most 9 minutes each). Never end a
turn while the job runs.

## Write-set

`test/golden/refs/java/graph-json-text-{lexer,parse,validate,write,inverse,roundtrip}.json` (through the script only).

## Acceptance criteria

- Given the job exits, when its log's last line is read, then it says `exit 0`.
- Given the six refs, when T3's normalizing loop runs over them, then each one is stamp-only. `graph.json.text` is not
  in the net diff, so content here is stop 4.

## Observability / rollback

N/A: no new observable operations; journal the wall time. Reversible.
