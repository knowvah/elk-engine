<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — ad13-rederivation, mission 6c (locked 2026-10-26)

The user approved all of these during planning, as recommended. They amend, and never rewrite, AD-1…AD-16, the
standing rules, AC1–AC6/P1–P7 and NS1–NS6/Q1–Q6/U1.

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Each re-derived expectation is anchored twice: the asserted value comes from an oracle row in `nodespacing-sites.json`; the test comment names the Java mechanism (`file:line`) that produces it. Unit-test literals stay literals, annotated with the row id; the replay test is the authority                                                             |
| D2  | The recorder builds each scenario by hand in Java (same `ElkGraphUtil` graph and the same direct calls to the `public` internal classes). Each row stores the exported input graph (ELK JSON, the NS1 flags) plus a `steps` list for in-memory mutations; the TS replay consumes rows generically, so a fixture transcription error fails the replay       |
| D3  | The T4 "implementation before tests" concern is covered by oracle rows for exactly the T4 scenarios whose branches the 326-row `node-micro-layout.json` replay leaves uncovered, measured by running that replay alone with coverage on the three T4 files                                                                                                 |
| D4  | Invalid original premise (T2's set is OUT_L_T's own; T4's two ports trip `spaceEfficientPortLabels`): keep the corrected case **and** restore the original input as its own case asserting the oracle value. Wrong original value, valid premise (T3, T5, T6): the case stays, pinned to an oracle row, comment rewritten with the Java mechanism         |
| D5  | A real divergence is diagnosed per `rules/diagnosis.md` and fixed at its origin; the fix is journaled. A fix that changes any landed vector or golden (`node-micro-layout.json` included) is an AD-13 stop for the user                                                                                                                                      |
| D6  | `feature/ad13-rederivation` from `main`; at most 3 commits at landing; unsigned, the user signs                                                                                                                                                                                                                                                             |
| D7  | Row: `{ id, site, input, steps, expected }`; header `{ jdk, oracle, rowCounts }`; doubles as 16-hex raw bits; TS compares numbers within 1e-6 (AD-4) and everything else exactly. `steps` vocabulary: `setMinimumContentAreaSize(cell, w, h)`, `setContributes(cell, width?, height?)`, `setCellRectangle(cell, x, y, w, h)`; `cell` addresses a `NodeContext` field |

## Baseline

Recorded at planning (Phase 8) on `main` at `51e7235`; see the baseline row in [decision-journal.md](decision-journal.md).
Stop 9 compares a later run at similar load.

## Execution decisions (user, during the run; append-only)

| ID  | Date | Decision |
| --- | ---- | -------- |
| E1  | 2026-10-27 | Stop 8 resolved: T2 records all 13 T1 scenarios plus the optional `t4/min-size-tolerance` row (14 `t4` rows); the "about 10" cap does not apply to this mission |
| E2  | 2026-10-27 | D7 `steps` vocabulary gains `setPortMargin(side, index, top, right, bottom, left)`: sets `portMargin` of the `index`-th port context (iteration order) on `side`. Used only by `t4/h-fixed-ratio-inside-end-margin` and `t4/v-fixed-ratio-inside-end-margin` |
| E3  | 2026-10-27 | D7 `steps` vocabulary gains `setPortRatio(side, index, ratio)`: sets `PortPlacementCalculator.PORT_RATIO_OR_POSITION` on the port of the `index`-th port context (iteration order) on `side`, applied after `NodeContext` construction like every other step. Needed because the property is registered by no MELK provider, so ELK JSON drops it (`JsonImporter.xtend:462-469`). Used by the six `FIXED_RATIO` rows |
