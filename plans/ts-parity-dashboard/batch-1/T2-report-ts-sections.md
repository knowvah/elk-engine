<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: the TS half of the parity report

Decisions: TP4, TP5 ([decisions.md](../decisions.md)). Agent: typescript-pro (sonnet). Read [agent-rules.md](../agent-rules.md)
first.

## Context

`tools/corpus/parity-report.ts` (318 lines) renders `docs/parity-report.md` from the local oracle sweep. Its `TS conformant`
column is the constant `n/a (no TS port yet)`. `docs-site/copy-reports.mjs` mirrors the report into `docs-site/parity.md` during
`docs:build`, and the page is in `TRANSLATABLE_EXCLUDES`. T1 writes the TS summary in the shape given by
[T1's interface contract](T1-sharded-compare.md#interface-contract). Code against that contract with your own fixtures; do not
wait for T1.

## Task

1. `renderReport(results, summary, census, context, ts?)`. With `ts` absent the output stays **byte-identical** to today's:
   the landed `test/corpus/parity-report.test.ts` asserts `n/a (no TS port yet)` and must pass unchanged (AD-13).
2. With `ts` given (a `TsReport` = the parsed summary plus the annotations), render the cells and sections of TP4
   ([decisions.md § TP4](../decisions.md#tp4-report-cells)):
   - the `TS conformant` cell;
   - a header line for the TS sweep;
   - a `## TS sweep` table whose first header cell is `algorithm (TS)`;
   - a `## TS findings` section, one bullet per finding, annotated from `ts-findings.json` or marked `unannotated`.

   An algorithm in the TS summary that is not in the oracle list is an error, like `groupByAlgorithm`. Do this in a new module
   (for example `tools/corpus/parity-report-ts.ts`) so that `parity-report.ts` stays below 500 lines.
3. `parseTsSummary(text)`: boundary validation of the T1 contract. Throw on the first missing or mistyped field, and when
   `counts` do not sum to `planned`. Also check that the TS summary's `elkCommit` and `modelsCommit` equal the oracle
   summary's; on a mismatch, throw and name both values.
4. `tools/corpus/ts-findings.json`: create it as `[]`. `parseFindings(text)` validates
   `{ caseId: string, issue: number, note: string }[]` and rejects a duplicate `caseId`.
5. CLI: `--ts-summary <file>` is required, both for `--write` and for the staleness check. Without it, exit 2 with a usage
   line. `ts-findings.json` is read from the repository.

## Write-set

`tools/corpus/parity-report.ts` (modify), new `tools/corpus/parity-report-ts.ts`, new `tools/corpus/ts-findings.json`, new
`test/corpus/parity-report-ts.test.ts`. The landed `test/corpus/parity-report.test.ts` is not edited.

## Read-set

`tools/corpus/parity-report.ts` (whole), `test/corpus/parity-report.test.ts:1-120` (fixtures, `tableRows`),
`docs/parity-report.md`, `docs-site/copy-reports.mjs`, [T1 interface contract](T1-sharded-compare.md#interface-contract).

## Interface contract

Consumes `TsSweepSummary` (from T1). Produces `ts-findings.json` (filled by T5 and T6):

```ts
interface FindingAnnotation { caseId: string; issue: number; note: string } // note: one line, ≤ 160 chars
```

## Acceptance criteria

- Given the landed test fixtures and no `ts`, when `renderReport` runs, then its output equals today's byte for byte (the
  landed test file passes unchanged).
- Given a TS summary in which `layered` has planned 4, ok 2, both-throw 1, mismatch 1, excluded 0, when the report renders,
  then the `layered` row's last cell is `3 / 4 (75.0%)`, and an algorithm absent from the summary shows
  `— (not in TS sweep)`.
- Given one finding with an annotation `{ issue: 79, note: "spore jitter" }` and one without, when the report renders, then
  `## TS findings` lists both in case-id order: the first ends with `#79: spore jitter`, the second with `unannotated`.
- Given a TS summary whose `elkCommit` differs from the oracle summary's, or whose counts do not sum to `planned`, when it is
  parsed, then it throws a message naming the field.
- Given `ts-findings.json` with a duplicate `caseId`, when it is parsed, then it throws naming the id.

## Quality bar

The new module reaches at least 90 % branches in a scoped coverage run. No blank table cell (the landed test's rule applies to
the new table too). Run typecheck, prettier and complexity.

**Observability:** N/A — no new observable operations (the report is the observable).
**Rollback:** reversible (tooling only).
