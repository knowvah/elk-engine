<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Replay every row

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T12): replay the layered label vectors`
`J` as README. Scratch: a private subdirectory `<scratchpad>/T12/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A fix goes to the mechanism's origin, not to the symptom. Never loosen a tolerance, delete a
case, re-record a row or touch a helper to get green (stop 3).

## Context

Mission 7f2, G2, G3, G4, G9, F4, F14. 7f's `LayeredPipelineVectors.test.ts` and `LayeredPipelineReplay.test.ts` are the
pattern: load the ref, replay each group, compare at the AD-4 bar (ids, counts, edge-section topology, bend-point counts and
non-numerics exact, numbers within 1e-6). T1's ref has `full`, `models`, `scenarios` (and `sites` from T16, 0 rows now); T2's
loader, op twins and comparator are the interpreter; T11 wired the arms. `.agent-notes/layered-pipeline.md` § "a plan must be
captured during the real run" applies to `expected.plans`.

## Task

1. `src/alg/layered/LayeredLabelsVectors.test.ts`: one `describe` per group; one case per row id, titles equal ids (so
   `vitest -t '<row id>$'` works; `-t` matches titles only).
   - `full`: run through `LayeredLayoutProvider.layout` with the real `RecursiveGraphLayoutEngine`, capture the plans in the
     real run, compare `expected.layout` and `expected.plans`; rows with `expected.logged` run with logging enabled and compare
     through `compareLogged` (DOT exact, JSON per G3).
   - `models` and `scenarios`: `prepareLayoutTest`, `runLayoutTestStep` per the row's `prefix` and `steps`, T2's ops
     (`labelManager`, `interactive`, `logging` included), compare `expected` and `geometry`.
2. Assert `rowCounts` equal the ref's group sizes, ids unique, and that no row names a 7g or 7h member (the recorder refused them).
3. The FX2 scenario (end labels on parallel edges sharing source port, target node and target port) has its own title and must equal
   the oracle; a mismatch is stop 17 (hash-order), never a tolerance.
4. For every failing row: instrument first (dump the TS and the oracle at the row's stops, `LABELS_*` aids of T1), find where the
   TS first departs from the oracle, and write the diagnosis artifact into `decision-journal.md` (mechanism, origin `file:line`,
   causal chain, ruled out). Fix in the 7f2 class at the origin (the write-set), a spread-out fix over several sites means the
   root was not found. A mechanism in a landed file outside the write-set is stop 1 or 17.
5. Time: `npx vitest run src/alg/layered/LayeredLabelsVectors.test.ts` alone at the quietest load available, journaled; over 30 s is
   stop 11 (timed gates under foreign load: check `uptime`, rerun a timeout-only failure at normal load).
6. The test imports T2's helpers by path; it never edits them.

## Write-set

`src/alg/layered/LayeredLabelsVectors.test.ts`; fixes at origin in `src/alg/layered/intermediate/{LabelDummyInserter,LabelDummyRemover,
LabelDummySwitcher*,LabelSideSelector,LabelManagementProcessor,EndLabelPreprocessor,EndLabelPostprocessor,CommentPreprocessor,
CommentNodeMarginCalculator,CommentPostprocessor}*.ts`, `src/alg/layered/intermediate/unzipping/**`,
`src/alg/layered/{DotDebugUtil,JsonDebugUtil,DebugUtil,InteractiveLayeredGraphVisitor}*.ts`, `plans/layered-labels/decision-journal.md`.

## Read-set

`src/alg/layered/LayeredPipelineVectors.test.ts:1-130` (structure only), `test/helpers/layered-labels-replay-*.ts`,
`test/helpers/layered-pipeline-replay-ops.ts`, `test/golden/compare-json.ts`, `decisions.md` G2–G4, G9, F4, F14, F16,
`~/.claude/rules/diagnosis.md`.

## Architecture decisions

G2 (row groups), G3 (debug JSON comparator), G4 (END_LABELS order, reversal twin is T6's), G9 (FX2), F4 (the bar), F14 (budget).

## Interface contract

None downstream except T15 and T16, which reuse the interpreter, and T13's runner users, which rely on the classes being correct.

## Acceptance criteria

- Given every `full`, `models` and `scenarios` row, when replayed, then each passes at the AD-4 bar.
- Given a `logged` row, when compared, then DOT is exact and JSON differs at most in property order.
- Given FX2's parallel-edge scenario, when replayed, then it equals the oracle row.
- Given the file run alone, when timed, then it takes at most 30 s.
- Given a divergence fixed in this task, when the journal is read, then it holds the four-part diagnosis artifact.

## Observability / Rollback

N/A — no new observable operations. Reversible.
