<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5: F5 ingest

Starts when the F5 oracle sweep has finished (`summary.json` written, the process exited) and batch 4 is done.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T11](T11-f5-ingest.md) | Run the TS sweep test against the fuller sweep; record indicators; D4 triage | orchestrator | see task | sweep, T10 | [ ] |
| T11b | D4 in-mission fix, only if T11 finds a qualifying divergence (spec written into the journal by T11) | per fix | the fix's files (must already be in some task's write-set) | T11 | [ ] |

## Launch

At mission start (README step 5), from the repo root on the mission branch:

```bash
mkdir -p "$ELK_ORACLE_DIR/sweep"
nohup nice -n 10 tools/oracle/elkj-sweep.sh --sample 40 --jobs 6 >"$ELK_ORACLE_DIR/sweep/elkj-f5.log" 2>&1 &
echo $!   # journal: command, start time, pid
```

No `--sample-max` (D2). The script resumes finished stages and chunks, so a restart after a crash reuses work
(stop 7 on a second failure). Liveness: the log or `$ELK_ORACLE_DIR/sweep/elkj/` changes within 60 min. The oracle
sweep reads only JVM inputs, so it can run while the TS code changes; the TS comparison runs at T11 against the
final code. Estimate 5–10 h (LOW).

Batch gate: README "Quality gates", then the final gate (README batch table, last row).
