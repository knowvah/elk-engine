<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12c — Anchored unit tests: the eight C2 processors and the enum

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12c): anchor processor tests on oracle order rows`

## Context

Mission 7c (README), C11, L4/X5, 6c D1. T9's `unreached.md` lists every branch of these classes the replays leave
untaken; T11 recorded `sites/*` rows per S scenario. Each colocated test gains cases whose literals equal a row, with
`// oracle: <row id>; <Java file:line>`; J items get structural cases from the Java (constants, exception classes
and messages, enum ordinals); U items get nothing. The generic replay (T8) stays the authority. 7b's T12a–c are the
pattern (`plans/layered-cycles-layers/decision-journal.md`, T12 rows).

## Task

1. For every S and J item of `unreached.md` (with its T11 corrections) in this task's files: load the row through
   T3's `loadOrderRows`, run it with the class injected (`runSteps`), assert the fields the branch decides with
   literals copied from the row (`layers`, `ports`, edge paths and `reversed`, `changed`; hex doubles decoded with
   `decodeHex`), one case per row, existing cases untouched. Where a case would only duplicate the generic replay,
   assert the specific field the branch decides (7a T11 rule).
2. No `src/` edit; a literal that disagrees with the port is a stop with the diagnosis artifact.
3. Directory coverage run (`--coverage.include` on these classes plus `LayeredOrderVectors.test.ts`): report the
   branch percentage per class and the U items behind any shortfall.

## Write-set

src/alg/layered/intermediate/{PortSideProcessor,PortListSorter,LongEdgeSplitter,InvertedPortProcessor,NorthSouthPortPreprocessor,HierarchicalPortConstraintProcessor,SemiInteractiveCrossMinProcessor,SortByInputModelProcessor,IntermediateProcessorStrategy}.test.ts (new cases only; existing cases untouched).

## Read-set

`plans/layered-crossing-min/unreached.md`, the rows named (read from the JSON by script), `test/helpers/layered-order-replay-*.ts`,
`test/helpers/layered-framework-replay.ts` (`decodeHex`), the Java lines cited.

## Acceptance criteria

- Given every S row for these files, when the suite runs, then a case cites it and passes.
- Given the directory coverage run, when read, then ≥ 90 % branches per class, the U list excepted.
- Given `git diff --stat`, when inspected, then only files in the write-set changed.

## Observability / Rollback

N/A. Reversible.
