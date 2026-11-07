<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17a — Anchored unit tests: label classes

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T17a): anchor label class tests on oracle rows`
Scratch: a private subdirectory `<scratchpad>/T17a/`.

**Rules (F16).** Every behavioural literal is an oracle row or a twin comparison; a hand-derived expectation is stop 3.

## Context

Mission 7f2, G12, F12, 6c D1. 7f's T16a is the pattern (`plans/layered-pipeline/batch-9/T16a-components-driver-tests.md`). Each colocated
test gains cases whose literals equal a row, with `// oracle: <row id>; <Java file:line>`; J items get structural cases from the Java; U
items get nothing. Classes: `LabelDummyInserter`, `LabelDummyRemover`, `LabelDummySwitcher` (+ its `LabelDummyInfo`), `LabelSideSelector`,
`LabelManagementProcessor`, `EndLabelPreprocessor`, `EndLabelPostprocessor`. A scratch copy for mutation needs copies of `test/helpers` and
`test/corpus`, not symlinks (`.agent-notes/layered-edge-routing.md`).

## Task

1. For every S and J item of `unreached.md` in this task's classes: load the row through T2's loader, run it with the real classes, assert
   the field the branch decides with literals copied from the row, one case per row, existing cases untouched. Coordinates compare at AD-4,
   everything else exactly. The `sites/*` rows of T16 and the `scenarios/*` rows of T1 are the sources.
2. G4's reversal twin (T6) stays; add the cases for `EndLabelPreprocessor` branches that only the end-label side rows reach
   (`placeLabels` per `PortSide`, the `getLabelSide` ABOVE arms at `J/intermediate/EndLabelPreprocessor.java:285,305,325,345`).
3. No `src/` non-test edit; a literal that disagrees with the port is a stop with the diagnosis artifact (mechanism, origin, causal chain,
   ruled out).
4. Mutation check in a scratch copy for at least three anchored branches per class group (inserter/remover/switcher; side selector and
   management; end labels); a row whose fields do not discriminate its arm gets a structural twin on internal state (with row literals).
5. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>` clean.

## Write-set

`src/alg/layered/intermediate/{LabelDummyInserter,LabelDummyRemover,LabelDummySwitcher,LabelSideSelector,LabelManagementProcessor,
EndLabelPreprocessor,EndLabelPostprocessor}*.test.ts`.

## Read-set

`plans/layered-labels/unreached.md`, the rows by id (`test/golden/refs/java/layered-labels.json`), the Java per branch,
`test/helpers/layered-labels-replay-*.ts`, `decisions.md` G4, G12, F12, F16.

## Interface contract

None downstream.

## Acceptance criteria

- Given every S and J item here, when run, then a case cites its row or Java line and passes.
- Given three flipped branches per class group in a scratch copy, when run, then the matching case fails.
- Given the classes' coverage, when measured, then shortfalls are U-explained (stop 10 otherwise).

## Observability / Rollback

N/A — no new observable operations. Reversible.
