<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: triage of the TS sweep findings

Decisions: TP5, TP6 ([decisions.md](../decisions.md)); stops 5, 6, 14, 15, 16. Agent: debugger (opus), or one per algorithm
family. Read [agent-rules.md](../agent-rules.md) first.

## Context

`$TMPDIR/ts-parity-dashboard/ts-run-1.json` (from T4) lists every case whose category is `mismatch`, `ts-only-throw`,
`oracle-only-throw` or `ts-aborted`, with its first differences. The oracle outputs are in
`$ELK_ORACLE_DIR/sweep/<elk>-<models>/run-a/`. To re-run a single case in the oracle, use
`tools/oracle/run.sh --cases <file> <outdir>`; in TS, use
`npx tsx tools/corpus/ts-layout-compare.ts --filter <caseId> --shards 1`. Known families at planning:

- the #79 four (`sporeOverlap`, coincident centres): expected to flicker. Annotate them `#79` and do nothing else;
- the 8c sweep reported 0 deterministic findings for rectpacking, topdownpacking and sporeCompaction;
- the 8b sweep reported 0 for force, stress and disco after the #71 neutralisation;
- planning probe (the old comparison tool, sequential, over the stale 10,881-row cache; 2 min): 2 findings only.
  `native/layered/hierarchy-include/examples/user-hints/model-order/modelOrderCycleBreaking` is `oracle-only-throw`: the oracle
  throws `NullPointerException`, TS lays it out. It is undocumented, so diagnose it first.
  `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2` is an options-only `childAreaHeight` last-ulp mismatch, the
  known `Math.sin` case (`docs/conformance.md:1708`, #68 B; its 0.01 px audit is #74). Annotate it with #68;
- mission 5's 497 `fixed`/`box`/`random` options-only mismatches were expected to close once layered and the other providers
  were registered (`docs/conformance.md` § Core layouts). Check that they did.

## Task

For each reported case, or each group of cases with one mechanism:

1. Find where the TS run first departs from the oracle (instrument the oracle with a scratch harness under `$TMPDIR`; dump the
   values). Write the artifact: mechanism, origin `file:line`, causal chain, ruled out.
2. Choose the outcome under TP6:
   - (a) the defect is in tooling (overlay, export, classification): describe the fix for T6;
   - (b) a landed `src/` defect within stop 15's bound: describe the fix and the oracle-derived test for T6;
   - (c) a landed defect beyond that bound: `gh issue create --label follow-up` with the artifact;
   - (d) an upstream defect or a platform `Math.*` difference: `gh issue create --label needs-ruling`;
   - (e) oracle nondeterminism (spore jitter, unseeded `random`): annotate it, and add evidence to #79 if it is a spore case.
3. Annotate each case in `tools/corpus/ts-findings.json` (`{ caseId, issue, note }`). Cases closed by an (a) or (b) fix get no
   annotation; they must come out `ok` in T6's rerun.

## Write-set

`tools/corpus/ts-findings.json` (the orchestrator merges, if T5 is fanned out), scratch under
`$TMPDIR/ts-parity-dashboard/T5/`, and GitHub issues. No `src/` or `tools/` code: fixes belong to T6.

## Read-set

`ts-run-1.json` (the findings only), the oracle outputs of those cases, the TS modules on each case's path, the matching
`docs/conformance.md` sections, `tools/corpus/ts-layout-compare.ts` and its helpers.

## Acceptance criteria

- Given every reported case of `ts-run-1.json`, when T5 ends, then each one has either an annotation in `ts-findings.json` or a
  journaled (a)/(b) fix description, and each group of cases has its artifact in the journal (a `divergence` or `fix` row).
- Given an (a)/(b) description, when it is written, then it names the origin `file:line` and the expected value's source (the
  oracle output file).
- Given more than 10 distinct mechanisms in landed ports, or more than 200 unannotated cases, then stop 5 applies.
- Given an issue filed under (c) or (d), when it is created, then it names the case ids, the artifact, and this mission.

**Observability:** N/A. **Rollback:** reversible (an annotations file and issues).
