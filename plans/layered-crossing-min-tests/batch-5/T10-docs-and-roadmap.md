<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Docs, roadmap, notes, summary

**Agent:** main session · **Commit:** `docs(T10): record mission 7c-tests in the docs and roadmap`

Every document is append-or-extend, never rewrite (7c's T13 is the pattern).

## Task

1. `docs/conformance.md` § "alg.layered, part c" (`#alg-layered-ordering`): an "Evidence" bullet for the ported JUnit
   suites — fourteen suites, 211 tests, 280 runs, all passing on the oracle via `tools/oracle/java-tests.sh` and in
   TS; any T7 defect under "Divergences found during the mission, fixed at origin"; the two full-layout suites moved
   to 7f in its "open by design" list (replacing nothing; add a line).
2. `docs/architecture/alg-layered.md` § 9.5 (evidence table): a row for the JUnit suites; § 9.6 (runbook): the
   `java-tests.sh` command and its classpath failure mode. Stay under 500 lines (currently 457); if not, move § 9.6's
   table to a sibling file with a pointer.
3. `plans/roadmap.md` § "Revision <date> (layered-crossing-min-tests)", append-only: row 7c-tests done; T8's scope
   moves (root creator unported; `ConcreteSortByInputModelTest`, `AllowNonFlowPortsToSwitchSidesTest` → 7f);
   hand-offs: `test/helpers/TestGraphCreator.ts` for `BasicNodePlacementTest` (7d), `BasicEdgeRouterTest` (7e),
   `InLayerConstraintProcessorTest`, `Issue726Test`, `Issue734Test` (later rows; the 7g self-loop suites use their own
   `SelfLoopTestGraphCreator`); `java-tests.sh` for every later mission's JUnit baseline; the
   7c arms the suites reached (from `coverage.md`).
4. `.agent-notes/layered-crossing-min-tests.md`: the run's observations (memory template).
5. README "Mission summary": tasks, exit evidence (counts, coverage), decisions, any T7 fixes, gates, follow-ups.

## Acceptance criteria

- Given `npm run docs:build`, when run, then green; every count equals the baseline and `coverage.md`.
- Given the roadmap diff, when inspected, then only appended lines.

## Observability / Rollback

N/A. Reversible.
