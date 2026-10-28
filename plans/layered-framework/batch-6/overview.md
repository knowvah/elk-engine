<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Replay-alone coverage map

One task in the main session (L4): measure what the oracle replays reach before any further unit test is written.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T9  | Per-class coverage of the replays alone; unreached branches and covering scenarios | main session | plans/layered-framework/unreached.md | T6, T7, T8 | [x] |

The batch is done when `unreached.md` lists every untaken branch with a scenario (or an unreachability note), and the
scenario count is at most about 15 (else stop 11).
