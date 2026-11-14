<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: regenerated report and docs

Decisions: TP3, TP4, TP7 ([decisions.md](../decisions.md)); stops 11 and 12. The orchestrator runs the generator; the agent
(technical-writer, sonnet) writes the prose. Read [agent-rules.md](../agent-rules.md) first.

## Task

1. Orchestrator: `npx tsx tools/corpus/parity-report.ts --write --ts-summary $TMPDIR/ts-parity-dashboard/ts-final.json`, then
   run the same command without `--write` and check that it exits 0. Run `npm run docs:build` and check that
   `docs-site/parity.md` contains `## TS sweep` and `## TS findings`.
2. `docs/conformance.md`: add a section `## TS corpus sweep (roadmap row 9) {#ts-corpus-sweep}` after § Rectpacking, spore and
   topdownpacking. It holds:
   - the per-algorithm table from `ts-final.json`;
   - what each category means, `ts-aborted` included;
   - the residual re-runs (#68 A, #71 item 2);
   - the findings by mechanism, with their issues;
   - the reproduce commands (oracle sweep with `hashCode=2`, sharded TS sweep, report).

   Under § Core layouts, append one dated paragraph that gives the new `fixed`/`box`/`random` counts and states whether the
   options-only mismatches closed. Change no earlier line.
3. `docs/architecture/parity-dashboard.md` (new): data flow (oracle sweep → TS sweep → summary → report → site), the runner
   design (shards, the per-case kill, the child protocol), the summary contract, the annotation file, and the runbook. Use
   PlantUML only: reuse [../diagrams/data-flow.md](../diagrams/data-flow.md). Add one row for it to the table of
   `docs/architecture/overview.md`, and one sentence at the end of its state paragraph.

## Write-set

`docs/parity-report.md` (generated), `docs/conformance.md` (additions only), new `docs/architecture/parity-dashboard.md`,
`docs/architecture/overview.md` (one table row and one sentence).

## Acceptance criteria

- Given `ts-final.json`, when the report is regenerated, then the check without `--write` exits 0, and every algorithm row's
  `TS conformant` cell is a fraction (no `n/a`).
- Given `npm run docs:build`, when it runs, then it succeeds, and `docs-site/parity.md` contains both TS sections.
- Given `git diff docs/conformance.md docs/architecture/overview.md`, then it shows only added lines, apart from the one
  overview sentence.
- Given the counts in the conformance section, when they are compared with `ts-final.json`, then they are equal.

**Observability:** the report is the dashboard. **Rollback:** reversible.
