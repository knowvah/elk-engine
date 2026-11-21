<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: docs

## Task

1. `docs/conformance.md`: update the row counts of `layered-placement.json`, `layered-routing*.json` and
   `layered-pipeline.json` where the page states them (grep the current counts first: placement `sites` 26, pipeline
   `scenarios` 93, total 1,239), and add one line per item under the layered sections saying what now proves it.
2. `docs/architecture/alg-layered-placement.md`: HPDS `delta`/`step` now proven by the new site rows (ids).
3. `docs/architecture/alg-layered-routing.md`: the three splitter arms' outcome (rung, rows or proof link to
   `plans/layered-evidence-gaps/unreached.md`).
4. `docs/architecture/alg-layered-pipeline.md`: the port-alignment and border-offset scenario family (matrix, ids); note
   that layered sizes nodes through `NodeDimensionCalculation`, not `NodeMicroLayout`.
5. Item 1 needs no docs change unless a page claims `InvertedPortProcessorTest` coverage; then say which rows exercise it.
6. Never edit an earlier mission's `plans/` file. `npm run docs:build` and `npx prettier --check` on the changed files.

## Write-set

The four docs above. Numbers come from the journal rows of T1-T4.

## Acceptance criteria

- Given the docs, when grepped for the old counts of the three refs, then none remain where a count changed.
- Given `npm run docs:build`, then exit 0; the typedoc warning count is journaled.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: revert the docs.
