<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: outcomes and docs

## Task

1. Append `## tree-recorder-gaps (#66), <date>` to `plans/alg-trees/unreached.md` (D6). It gets one table with a row per
   item: item, Java and TS site, outcome, row ids or proof, and evidence (journal row). A sentence names the earlier rows it
   supersedes: the `EadesRadial` and `RadialCompaction` `R` rows, the `EdgeRouter.java:368` row and the `NodeOrderer`
   priority 3 row. Do not edit any earlier line.
2. Append one closing row to `plans/alg-trees/decision-journal.md`: `| <date> | #66 | close | ... |`, naming the outcomes
   and the M-e issue.
3. Docs:
   - `docs/conformance.md` (the table near line 1832) and `docs/architecture/alg-trees.md` (the table near line 117): add the
     three new refs with rows, full, stops, throws and launcher. Add one sentence in alg-trees.md's paragraph after the table
     (near line 124) on why they are separate files (D1).
   - `docs/architecture/alg-trees.md` regen commands (near line 309): the comments name the new outputs.
   - `docs/architecture/elk-upgrade.md` § 7: the outputs column of the mrtree, radial and vertiflex scripts. Refresh the cold
     times if T6's run differs by more than 2 s.
   - Any outcome-2 or outcome-4 item that `docs/conformance.md` should list as an open gap goes in one bullet in its trees
     section.

## Write-set

`plans/alg-trees/unreached.md` (append only), `plans/alg-trees/decision-journal.md` (one row), `docs/conformance.md`,
`docs/architecture/alg-trees.md`, `docs/architecture/elk-upgrade.md`.

## Read-set

[items.md](../items.md) (filled), the batch 2 reports, the docs' tables at the lines named.

## Acceptance criteria

- Given the appended section, when `git diff <base> -- plans/alg-trees/unreached.md` is read, then it shows only added lines at the end.
- Given the doc tables, when compared with each new file's `rowCounts`, then the numbers agree.
- Given `npx vitest run test/docs`, when run, then it is green (the runbook test reads § 7).

## Quality bar

`npx prettier --check` on the changed Markdown. `npm run docs:build` runs in T6.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (docs only).
