<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-evidence-gaps: decisions

Locked decisions AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) apply unchanged. AD-13 governs every row: a new
expected value comes from an oracle run, never from the port or by hand.

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended` on 2026-11-21 with nobody present. Each decision below records the options it
rejected and the evidence, so the maintainer can audit it. Evidence came from four read-only scoping passes and the
planner's own reads (file:line cited).

### D1

**Item 1: show `testValidNodeOrder` running on rows already recorded; do not vendor new ptolemy models.**

- Context: the 13 ptolemy rows are vacuous because their inputs have no edge leaving a WEST port or entering an EAST
  port of a side-fixed node (scan of the 9 vendored files under `test/golden/inputs/realworld/ptolemy/`, every level).
  `InvertedPortProcessor.java:122, :135` creates dummies only for such edges. `layered-order.json` already holds
  oracle-recorded rows ending at `INVERTED_PORT_PROCESSOR` that have them: `scenarios/InvertedPortProcessor/inverted-ports`,
  `…/long-edges`, `sites/InvertedPortProcessor/freePorts`, and probably `sites/HeadLabels/{longEdge, invertedPort/short,
  invertedPort/both, westOutput}` and the `models/ticket-*` and `models/north_south_ports-*` IPP rows
  (`src/alg/layered/intermediate/InvertedPortProcessor.test.ts:26-52` lists them; it compares their dumps with the oracle).
- Decision: T1 runs the ported `testValidNodeOrder` body on every row of that list, counts per row how many edges reach
  an assertion, and asserts the count is positive for each row whose recorded input has such an edge on a side-fixed
  node (the expected positivity is read from the row's recorded input, not from the port). The 13 ptolemy cases stay
  exactly as they are. The per-row counts are journaled.
- Rejected: (B) vendor one of the ~41 corpus ptolemy `.elkg` models with a WEST-output edge (e.g.
  `flattened/ptango_cookies`) and add it to `LayeredOrderVectors` — no script converts `.elkg` to the vendored JSON today
  (none found under `tools/`), so it adds tooling the issue does not ask for, and those 41 are an unverified static scan;
  (C) a new scenario row — the existing rows already do it.
- Consequence: "find" rows, as the issue allows. The ptolemy vacuity remains a property of the Java test's graph set and
  is journaled with the scan. If the maintainer wants a ptolemy row, that is a `follow-up` (T6 files it).

### D2

**Item 2: two `sites/HierarchicalPortDummySizeProcessor/*` rows in `LayeredPlacementVectors`, stopping at HPDS.**

- Context: `HierarchicalPortConstraintProcessor.java:251-292` creates one new dummy per original N/S external-port dummy
  per adjacent layer; a normal node with incoming edges from two NORTH external ports therefore gets two new N dummies in
  the previous layer. The current `scenarios/port-dummy-size/external-chain|external-fan` (`LayeredPlacementVectors.java:2345-2346`,
  builder `gExternal` `:2213-2228`) chain each port to its own node, one dummy per layer. The dump carries per-node
  `size` (hex doubles), so the widths `[0, delta]` (north) and `[delta, 0]` (south) become compared values.
- Decision: add at least `…/two-north` and `…/two-south` (two N, resp. two S, external ports feeding one node, FIXED_SIDE,
  an explicit `spacing.edgeEdgeBetweenLayers` other than the default) and one three-dummy row so `step` is applied twice.
  Use the existing site shape (`:2401-2416`). Before accepting a row, check its dump's `layers` holds two (three) N or S
  dummies in one layer.
- Rejected: the routing recorder (`LayeredRoutingVectors.java:2260`, same `gExternal`): HPDS is a placement-stop
  processor and the placement ref is where its rows already live.

### D3

**Item 3: per arm, a ladder: layout row → direct-call row → proof.**

1. A `sites/*` routing row whose graph reaches the arm through a whole routing step (preferred: proves reachability by
   layout). Scoping found `:220 if[1]` likely reachable (a segment whose span holds no free area because a critical
   conflict sits inside it; the `unreached.md:105` argument "a critical-cycle segment has a free area in its own span"
   does not follow from the code) and `:400 if[1]` reachable in doubles (e.g. threshold `fl(0.2·0.3)`, coordinates 3.9
   and 4.14 give `c − T < s`).
2. Else a `calls/HyperEdgeSegmentSplitter/<method>-<name>` row calling the private `useArea` /
   `computePositionToSplitAndUpdateFreeAreas` by reflection (accepted pattern: `unreached.md` S17 `calls/NubSpline/*`,
   `LayeredRoutingVectors.java:2521-2534, :2748-2753`), with a matching TS replay handler. The journal says the arm is
   reachable through the method's contract and whether layout reachability is open.
3. Else a proof in this mission's [unreached.md](unreached.md): mechanism, the arithmetic, and the search that failed
   (`:406 if[1]` needs `fl(c + T) > end` with `size/2 ≥ T`; scoping found no hit in ~3M decimal samples and an argument
   that it needs an exact half-ulp tie).

- The floating-point search is pure IEEE-754 `+ − * /`, identical on the JVM and V8, so it may run in TS scratch; only
  the oracle row is evidence.
- Rejected: proof-only for all three (two have concrete candidates); editing `plans/layered-edge-routing/unreached.md`
  (earlier plans are never rewritten; the correction is recorded here and in the roadmap revision).

### D4

**Item 4: a `scenarios/*` family in `LayeredPipelineVectors`, whole plan, in the existing ref.**

- Context: no row of `layered-pipeline.json` sets `portAlignment.*`; three `full/options/port-border-offset/*` rows set
  a uniform offset on one external-port node (`LayeredPipelineVectors.java:2519-2552`). The 7f README left "alignment,
  border offsets" as an open candidate (`plans/layered-pipeline/README.md:173-174`). Layered sizes nodes through
  `NodeDimensionCalculation` (`LabelAndNodeSizeProcessor.ts:51`), not `NodeMicroLayout`; both share
  `PortPlacementCalculator` (`alignPorts` BEGIN/CENTER/END/DISTRIBUTED/JUSTIFIED `:334-365`, `centerSinglePort`
  `:280-290`, border offsets `:148-151`, `:259-262`). `sc(cls, name, family, elk, target, null)` records the whole plan
  plus a dump (`:2621-2632`), and `LayeredPipelineVectors.test.ts:93-100` reads group counts from the ref.
- Decision: `scenarios/PortAlignment/*` and `scenarios/PortBorderOffset/*` on a fixed-size node with two ports per side
  (FIXED_SIDE): `portAlignment.default` = each of BEGIN, CENTER, END, JUSTIFIED, DISTRIBUTED; per-side overrides
  (`.north`, `.south`, `.east`, `.west`) for at least BEGIN, END, JUSTIFIED; one single-port side under JUSTIFIED and
  DISTRIBUTED (`centerSinglePort`); N and S ports of a regular node with positive and negative `port.borderOffset`, alone
  and with BEGIN/END. About 35 rows (~7.5 KB each).
- Rejected: a `full/options/port-alignment` family (it grows `ElkLayered.test.ts:51`'s hard-coded 199); a new ref file
  (a new launcher and replay for 35 rows); `node-micro-layout.json` (not on the layered path).

### D5

**Refs may change only by added rows.** Allowed: `layered-placement.json` (T2), `layered-routing.json` and/or
`layered-routing-steps.json` (T3), `layered-pipeline.json` (T4). For each, a scratch script compares the base and the new
file by row id: every base id present with a JSON-equal row, every new id under the task's prefixes, header differing
only in `rowCounts` (and fields a rerun legitimately restamps, e.g. a timestamp, each named in the journal). Each
regeneration is journaled with the oracle stamp (`8bca22f4` + 0001-0004; no patch change in this mission).

### D6

**Inventory growth is not an expected-value change.** A test list of row ids, or a count, that must grow only to include
rows this mission adds is updated in the same task and journaled (precedent: `plans/roadmap.md` 2026-11-02 "Row
inventories and site rows"). Changing an assertion about an existing row is AD-13: stop 3.

### D7

**No `src/` change is planned.** A TS mismatch on a new row is diagnosed (stop 2); a fix with a stated mechanism, at its
origin, inside the class the row targets, with the row as its test, is allowed and journaled.

### D8

**Landing:** one squashed commit, subject `test(layered): close four coverage-evidence gaps` (or `fix(layered): …` if a
D7 fix landed), footer `Refs: #49`.
