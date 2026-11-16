<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: the sweeps

Decisions: TP1, TP2, TP8 ([decisions.md](../decisions.md)). Run by the orchestrator, detached as the queue rules require.

## Steps

1. Check `uptime` (wait while the load is above 12). Then start the full oracle sweep:
   `nohup nice -n 10 bash -c 'JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2" tools/oracle/sweep.sh; echo "exit $?"' >"$TMPDIR/ts-parity-dashboard/oracle-sweep.log" 2>&1 &`.
   Poll at most every 9 minutes. Before it starts, journal the stale cache's counts (10,881 rows at planning). Afterwards,
   journal `summary.json`, the verdict counts per algorithm, and the per-algorithm differences from the committed
   `docs/parity-report.md` (expect changes from patch 0002, the new generated inputs and `hashCode=2`). Stop 7 applies.
2. TS sweep, sharded and detached:
   `nohup nice -n 10 bash -c 'npx tsx tools/corpus/ts-layout-compare.ts --out $TMPDIR/ts-parity-dashboard/ts-run-1.json; echo "exit $?"' >"$TMPDIR/ts-parity-dashboard/ts-run-1.log" 2>&1 &`
   (the defaults: every algorithm, `min(cpus, 8)` shards, 120 s per case). Exit 1 (findings) is expected. Journal the
   per-algorithm counts and the TS wall time.
3. Determinism: run the TS sweep a second time into `ts-run-2.json` and compare the `cases` categories of the two runs. Any
   case that changes outside `sporeOverlap`, `sporeCompaction` and `random` is stop 6. List the spore cases that change; the
   #79 four are expected.
4. Residuals: check in `ts-run-1.json` that the 7 cases of #68 item A (`retarget/mrtree/default/…/hierarchicalLayoutMixing`;
   `interactiveRectpacking_{hierarchy,oneBigNode}` under `mrtree`, `radial`, `vertiflex`) and the 6 of #71 item 2
   (`interactiveRectpacking_{hierarchy,oneBigNode}` under `force`, `stress`, `disco`) are `ok`. Stop 13 applies.
5. `ps`: no `tsx` or `java` child is left.

## Acceptance criteria

- Given the fresh oracle sweep, when it ends, then the log ends with `exit 0`, there is no `oracle-error`, and the `timeout`
  and parse-error counts are journaled (stop 7).
- Given the TS sweep, when it ends, then `ts-run-1.json` has one case for every planned case of every algorithm, and for each
  algorithm the counts sum to `planned`.
- Given two TS runs, when their `cases` are compared, then every changed case is a spore or `random` case, or it has been
  diagnosed under stop 6.
- Given the 13 residual case ids, when they are looked up in `ts-run-1.json`, then all 13 are `ok`.

**Observability:** the journal rows are the record. **Rollback:** nothing committed; the oracle cache is regenerable by script.
