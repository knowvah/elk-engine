<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — alg-common-nodespacing, mission 6b (locked 2026-10-26)

The user approved all of these during planning, as recommended. They amend, and never rewrite, AD-1…AD-16, the earlier
missions' decisions and AC1–AC6/P1–P7 (`plans/alg-common/decisions.md`). They refine AC2.

| ID | Decision |
|----|----------|
| NS1 | Inputs are stored in the vector JSON as ELK JSON (the AC3 pattern); TS replays them through the ported `ElkGraphJson` importer. Nothing is vendored |
| NS2 | Scenarios: (i) the 8 `tests/core/{node_size,label_placement}` models, (ii) the 31 curated models and the 4 vendored tickets, (iii) the `PortLabelPlacementVariantsTest` configurations, (iv) a synthetic option sweep |
| NS3 | `NodeMicroLayout` is applied bottom-up to every node with children; every level is recorded |
| NS4 | 0×0 labels get a fixed size computed from their text; each model row is recorded twice, `raw` and `sized` |
| NS5 | The 3 `assert` sites are kept as comments (the KVector precedent); the §6.8 helper stays a follow-up |
| NS6 | Recorded per node: x, y, width, height, `MARGINS` and `PADDING`; per port: x, y; per label: x, y, width, height. Model order. Numbers within 1e-6 (AD-4); ids, counts and exceptions exactly |
| Q1–Q6 | Pre-made rules carried over from 6a and standing decisions ([below](#pre-made)) |

## NS1 — Inputs stored in the JSON

The deferred tests' models live in `$ELK_MODELS_DIR`, which CI does not have. The recorder loads each model at record
time and applies the scenario configuration, NS4 label sizing included. It then exports the **prepared input graph** with
`ElkGraphJson.forGraph(root)` (the flags of `ElktParseVectors.java:224-225`: layout kept, zero dimensions and positions
kept, unknown options omitted). The JSON goes into the row.

- **Round-trip self-check:** the recorder re-imports that JSON, runs the scenario on the re-imported graph, and records
  *those* outputs. It also runs on the original graph and fails the row if the two outputs differ (stop 6). The
  recorded expectation therefore comes from exactly the graph TS will import.
- **Replay:** TS does `ElkGraphJson.forGraph(json).toElk()` (or the ported import entry point) and runs the same NS3
  pass.
- **Rejected:** vendoring the 8 models (the AC5 pattern). Every scenario configuration would have to exist twice, in
  Java and in TS.

## NS2 — Scenario groups

| Group | Source | Configuration |
|-------|--------|---------------|
| `corpus` | `$ELK_MODELS_DIR/tests/core/node_size/*.elkt`, `.../label_placement/**/*.elkt` (8 files) | as written |
| `curated` | `test/corpus/elkt-curated/**` (31) + `test/golden/inputs/tickets/core/*.elkt` (4) | as written |
| `variants` | `label_placement/port_labels/variants.elkt` | `PortLabelPlacementVariantsTest` providers: `PORT_SIDE` per port × each active `@ConfiguratorProvider` |
| `sweep` | built in the recorder from a seeded spec | `NODE_SIZE_CONSTRAINTS` subsets × `NODE_SIZE_OPTIONS` subsets × `PORT_CONSTRAINTS` × `PORT_LABELS_PLACEMENT` sets × `NODE_LABELS_PLACEMENT` sets × node shapes (0/1/3 ports per side, inside and outside labels, padding, min size). A few hundred rows. Combinations Java rejects are recorded as `{throws}` rows |

The `variants` group mirrors the Java providers' *configuration* only: the deferred tests' layered layout is not run.

## NS3 — Hierarchy

`NodeMicroLayout.forGraph(g).execute()` works on one level (`J/NodeMicroLayout.java:44-64`). The harness, in both the
recorder and the replay, visits the graph in post-order: for every node that has children, it runs `NodeMicroLayout`
on that node after all of its descendants. This matches the bottom-up order of the recursive layout engine. The harness
is test code, identical on both sides, and is not ported logic.

## NS4 — Label sizes

The Java test framework sizes labels with AWT font metrics (`TestConfiguration.computeLabelSize`), which depend on the
platform. That is unusable as an oracle. The recorder gives each 0×0 label with text a fixed size from a formula of its
own: width from the character count, a fixed height. The formula is documented in the recorder header. Labels with
explicit sizes are kept. Every `corpus`/`curated` model is recorded twice: `raw` (sizes as written) and `sized`. The
`variants` and `sweep` groups are always `sized`.

## NS5 — Asserts

`N/internal/NodeContext.java:277` (`assert false`), `N/internal/algorithm/HorizontalPortPlacementSizeCalculator.java:212`
(`assert secondRatio >= firstRatio`) and `N/internal/algorithm/PortLabelPlacementCalculator.java:208` (`assert false`)
stay as comments naming the Java line, as `src/core/math/KVector.ts` does. No `default: break` or other non-Java branch
is added. The `devAssert` helper (translation rules §6.8) stays a roadmap follow-up.

## NS6 — Recorded fields and comparison

- **Rows:** each row is `{ id, group, labels: "raw"|"sized", input, expected }`.
- **`expected`:** either `{ nodes, ports, labels }` or `{ throws: { class, message } }`.
  - Elements are listed in model traversal order: node, its labels, its ports (each followed by its labels), then its
    children.
  - Each element carries its identifier as exported.
- **Doubles:** 16-hex raw bits (the `JavaVectors.hex` convention), so the recording is exact.
- **Margins and padding:** `CoreOptions.MARGINS`/`PADDING` values, written as top/right/bottom/left.
- **TS comparison:** numbers within absolute 1e-6 (AD-4); identifiers, element counts and exception class and message
  exactly.

## Pre-made

| ID | Rule | Source |
|----|------|--------|
| Q1 | `src/alg/common/nodespacing/**` mirrors the Java packages. `StripContainerCell.Strip` goes to `StripContainerCellStrip.ts` (M15). Classes over 500 lines or past the complexity limits become section modules behind a facade (`NetworkSimplex` pattern), with sections never importing their facade | AD-7, M10, M15, P1 |
| Q2 | `EnumMap`/`EnumSet` sites (`N/internal/NodeContext.java:121-125`, `N/internal/NodeLabelLocation.java:42-310`, `N/internal/algorithm/NodeLabelAndSizeUtilities.java:248`) use the landed ordinal-ordered shims: `Maps.newEnumMap` (`src/guava/Maps.ts:113`) and `EnumSet.of`
(`src/java/util/EnumSet.ts:61`). `NodeContext.portContexts` (`:102`) is `TreeMultimap.create(…)` from `src/guava/TreeMultimap.ts` with the Java comparators ported verbatim | AD-10 |
| Q3 | `PortContext` ↔ `NodeContext` import each other: use `import type` where only types are needed, or the M12 cached-getter pattern, never a reordered constructor | M12 |
| Q4 | `UnsupportedConfigurationException` comes from `src/core/UnsupportedConfigurationException.ts`; messages verbatim | AD-16 |
| Q5 | Java `int` arithmetic, where it appears, goes through `Int32`; `Math.max`/`Math.min` map directly (exact); `ElkMath.maxd` and `DoubleMath.fuzzyEquals` use the landed helpers | translation rules |
| Q6 | The 4 nodespacing JUnit files stay deferred to 7a/8x (P5). Recorders write new files only and are never regenerated to get green (P6) | P5, P6, AD-13 |

## Baseline

Recorded at planning (Phase 8, 2026-10-26) on `main` at `cf1d964` (the PR #20 merge commit). See the Phase 8 entry in
[decision-journal.md](decision-journal.md) for the measured `npm test` time, file and test counts, and load. Stop 11
compares a later run at similar load.

## Execution decisions (user, during the run; append-only)

| ID | Date | Decision |
|----|------|----------|
| U1 | 2026-10-26 | Land as 5 commits, one per batch (T1+T2, T3, T4–T6, T7, T8 + plan files), instead of the README's 4 groups. Still ≤ 5 commits, task ids in each body |
