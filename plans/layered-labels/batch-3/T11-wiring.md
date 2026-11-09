<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Wire the 12 arms, G11 assertions, unpin, entry points

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T11): wire the label arms and run labelled layouts`
`J` as README. Scratch: a private subdirectory `<scratchpad>/T11/`.

**Rules (F16).** Every behavioural literal is an oracle row, a twin comparison or, in a ported suite, the Java's own literal; a
hand-derived expectation is stop 3. A verbatim side-effect-free duplicate is collapsed with a comment naming the Java line;
everything else stays verbatim. The only changed assertions are G11's list; any other is stop 3.

## Context

Mission 7f2, G1, G9, G11, F1, F9, F10, FX5, FX6, FX7. 7f's driver (`ElkLayered`, `GraphConfigurator`) is landed and never edited:
it builds the whole plan first, so any plan naming a staged arm throws before the first processor (`.agent-notes/layered-pipeline.md`).
The 12 arms sit in `IntermediateProcessorStrategyCreate.ts` (`COMMENT_PREPROCESSOR :68`, `LABEL_DUMMY_INSERTER :84`,
`ALTERNATING_LAYER_UNZIPPER :150`, `:156`, `COMMENT_NODE_MARGIN_CALCULATOR :172`, `END_LABEL_PREPROCESSOR :174`,
`LABEL_DUMMY_SWITCHER :176`, `:178`, `LABEL_SIDE_SELECTOR :180`, `COMMENT_POSTPROCESSOR :210`, `LABEL_DUMMY_REMOVER :234`,
`END_LABEL_POSTPROCESSOR :242`; the two label-management arms construct `LabelManagementProcessor(true|false)` per
`J/intermediate/IntermediateProcessorStrategy.java`).

## Task

1. `IntermediateProcessorStrategyCreate.ts`: replace the 12 `notPorted(..., '7f2')` throws with `new <Class>(...)` exactly as
   `J/intermediate/IntermediateProcessorStrategy.java` constructs each (read the Java per arm, including the boolean of the
   two `LabelManagementProcessor` arms). Add the imports; the 7g and 7h throws stay.
2. **G11, each change journaled with old and new text, and no other:**
   - `IntermediateProcessorStrategy.test.ts`: the ARMS test: 12 arms move to ported, tally ported 37 to 49, pending 22 to 10
     (7g 9, 7h 1).
   - `test/architecture/staged-classes.json`: the two 7f2 rows (`DebugUtil.ts`, `LabelDummySwitcher.ts`) go; line 1 of those two files
     (`// @staged 7f2`) is removed in the same task (batch 2 kept it so the fitness test stayed green).
   - `ElkLayered.test.ts`: the comment-box test that pins `CommentPreprocessor is ported in mission 7f2` (`:132`) lays out for real.
   - `test/helpers/layered-site-replay.ts` (`FLAT_STAGE_MESSAGE`, `:208-210`, `:283-300`, `:321`),
     `src/alg/layered/LayeredLayoutProvider.test.ts` (`LABEL_STAGED_MESSAGE :17`, `:96`) and `LayeredSiteVectors.test.ts`
     (`:8-9`, `stagedMethod :26`): **FX5**: `site/provider/flat` and `site/provider/cancelled` compare their recorded layout;
     `include-children*` still expect the `CompoundGraphPreprocessor` throw naming 7h.
   - `test/helpers/layered-pipeline-pinned-rows.ts` and the two counts: `pins exactly the 58 models rows of FX7`
     (`LayeredPipelineVectors.test.ts:131`) becomes 1 (the 7g row `models/ptolemy-sinewaveoptimization/N1/…` stays),
     `pins exactly the 2 layered-phases.json rows of FX6` (`LayeredPipelineReplay.test.ts:143`) becomes 0.
3. **G9:** delete the 59 entries naming 7f2 (57 `layered-pipeline.json`, 2 `layered-phases.json`); every row then replays its
   recorded expectations through the landed replay tests. A mismatch is a port defect until shown otherwise; if it is not (a
   recorded expectation cannot be met for another reason), stop 19. Cross-check each row against T1's `models` row of the same
   model.
4. `test/architecture/layered-entry-points.fitness.test.ts`: append every new 7f2 class module that can be the first import in a
   fresh process (the 15 classes, nested-type files excluded); header names 7g as next (`:20`). Run it in a fresh process; a
   `ReferenceError` is stop 15 when the E1 recipe does not resolve it; an entry-order import is never the fix.
5. Check that `LayeredLayoutProvider.layout` now lays out a labelled, a commented and an unzipped graph, and that self loops,
   wrapping and compaction throw naming 7g, `INCLUDE_CHILDREN` 7h. `plans/layered-labels/decision-journal.md`: one row per G11 change.

## Write-set

`src/alg/layered/intermediate/{IntermediateProcessorStrategyCreate.ts,IntermediateProcessorStrategy.test.ts}`,
`src/alg/layered/{ElkLayered.test.ts,LayeredLayoutProvider.test.ts,LayeredSiteVectors.test.ts,LayeredPipelineVectors.test.ts,LayeredPipelineReplay.test.ts}`,
`test/helpers/{layered-site-replay.ts,layered-pipeline-pinned-rows.ts}`, `test/architecture/{staged-classes.json,layered-entry-points.fitness.test.ts}`,
line 1 of `src/alg/layered/DebugUtil.ts` and `src/alg/layered/intermediate/LabelDummySwitcher.ts`, `plans/layered-labels/decision-journal.md`.

## Read-set

`J/intermediate/IntermediateProcessorStrategy.java:60-260`, `IntermediateProcessorStrategyCreate.ts:60-250`,
`test/helpers/layered-pipeline-pinned-rows.ts` (whole, 59 entries), `test/architecture/staged-classes.fitness.test.ts:1-40`,
`.agent-notes/layered-pipeline.md` (staged arms, plan capture), `decisions.md` G1, G9, G11, F9, F10, FX5–FX7.

## Architecture decisions

G1 (12 arms), G9 (pins, FX5), G11 (the closed list of assertion changes), F1, F9, F10 (E1 recipe, entry points), FX5–FX7.

## Interface contract (consumed by T12–T17)

`IntermediateProcessorStrategy.valueOf(name).create()` returns the real class for the 12 arms; `staged-classes.json` holds no
7f2 row; `PINNED_PIPELINE_ROWS` holds only the 7g entry.

## Acceptance criteria

- Given the ARMS test, when run, then 49 arms are ported, 10 pending (7g 9, 7h 1).
- Given a fresh process, when each entry-point module is imported, then no `ReferenceError` and exit 0.
- Given the 59 formerly pinned rows, when replayed, then each equals its recorded expectation (AD-4).
- Given `site/provider/flat` and `cancelled`, when replayed, then they compare their recorded layout.
- Given `git diff`, when read, then the only changed assertions are G11's and the journal lists each old and new.

## Observability / Rollback

N/A — no new observable operations. Reversible.
