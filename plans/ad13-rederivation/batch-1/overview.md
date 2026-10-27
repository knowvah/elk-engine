<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Map the T4 branches the replay leaves unreached

One short task, run by the main session. Its output decides how many extra scenarios T2 records (D3).

| ID  | Description                                                 | Agent        | Writes                                   | Depends On | Done |
| --- | ----------------------------------------------------------- | ------------ | ---------------------------------------- | ---------- | ---- |
| T1  | Coverage of the three T4 files under the 326-row replay alone | main session | plans/ad13-rederivation/t4-unreached.md | —          | [x]  |

The batch is done when `t4-unreached.md` lists every unreached branch with its covering T4 test (or "unreachable from
any input"), and the count is ≤ 10 (otherwise stop 8).
