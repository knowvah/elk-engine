<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent notes — text-follow-ups (mission 4d)

## Observation: the sweep tests' indicator lines need the verbose reporter

- **Context**: T11, reading `test/corpus/elkj-sweep.test.ts` results
- **Finding**: `npx vitest run test/corpus/elkj-sweep.test.ts` passes but prints none of the
  `elkj sweep: <indicator>=<n>/<total>` lines under the default reporter; add
  `--reporter=verbose --silent=false` to see them.
- **Impact**: a sweep ingest that reads only the default output has no counts to compare against the previous run.
- **Confidence**: High

## Observation: a new sweep overwrites the previous run's per-graph results

- **Context**: T11, comparing the F5 run's 7 `convert` failures with 4c's
- **Finding**: `tools/oracle/elkj-sweep.sh` writes `selection.tsv`, `results.jsonl`, `summary.json` and `timings/`
  into the same `$ELK_ORACLE_DIR/sweep/elkj/` directory each run, so 4c's per-graph results were gone; only the
  counts committed in `docs/conformance.md` and the 4c journal survived.
- **Impact**: copy the sweep directory aside before rerunning when a per-graph diff against the previous run is
  wanted.
- **Confidence**: High

## Observation: a `nohup … &` launch does not record the job's exit code

- **Context**: T10, F6 re-record launched detached
- **Finding**: the recorder log ended on its last `done` row with no exit status; completion had to be inferred
  from the output file (written only after every row). `elkj-vectors.sh` ends its log with `elkj-vectors exit <rc>`,
  which settles it directly.
- **Impact**: wrap detached JVM jobs so the log's last line is the exit code.
- **Confidence**: High
