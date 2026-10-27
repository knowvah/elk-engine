<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — alg-common-nodespacing (mission 6b, 2026-10-26)

Planning-time notes are in `alg-common-nodespacing-planning.md`.

## Observation: `NodeMicroLayout` rejects ports without a side

- **Context**: T1 recorder over the corpus and curated `.elkt` models.
- **Finding**: 10 of the 43 models declare ports without `port.side`. `NodeMicroLayout` throws
  `IllegalArgumentException` ("Label and node size calculator can only be used with ports that have port sides
  assigned.") before any placement, because layered normally assigns sides first.
- **Impact**: nodespacing evidence for ports comes from the `variants` and `sweep` groups. A later replay over
  layered output (7a) is where those models gain port coverage.
- **Confidence**: High

## Observation: ELK JSON export omits empty label identifiers

- **Context**: T1 round-trip export of `.elkt` models.
- **Finding**: `JsonExporter` writes a label `id` only when the identifier is non-empty. Unnamed labels re-import with
  a null identifier; the `.elkt` root exports as `n0`.
- **Impact**: any replay keyed by label id must accept null ids and match labels by traversal order.
- **Confidence**: High

## Observation: `setProperty` during `eAllContents()` throws in Java

- **Context**: T1 label sizing pass.
- **Finding**: setting a property on an element while iterating `eAllContents()` raises
  `ConcurrentModificationException` (the property map is part of the content tree). The recorder collects elements
  first.
- **Impact**: Java-side recorders that mutate while walking an ElkGraph must snapshot the iteration.
- **Confidence**: High

## Observation: `GridContainerCell` width passes overwrite earlier rows

- **Context**: T2 hand-derived expectations.
- **Finding**: non-tabular `applyWidthToColumn` loops over all rows of a column, so the END row pass sets every
  column's x and width; tabular mode mutates the shared `colWidths` array (gap additions) across the three row passes.
- **Impact**: faithful by construction; a "fix" would diverge from the oracle replay in T7.
- **Confidence**: High

## Observation: `ElkNodeAdapter.getPorts()` caches its list

- **Context**: T3 fixtures.
- **Finding**: the adapter builds its port list on the first call, so ports added to the `ElkNode` afterwards are
  invisible to it. Separately, `getIndividualOrInherited` on a node adapter reads the parent graph's property, not the
  node's own (set spacings on the root or via `SPACING_INDIVIDUAL`).
- **Impact**: tests and callers must create every port before adapting a node.
- **Confidence**: High

## Observation: nodespacing option defaults

- **Context**: T3 `NodeContext` option reads.
- **Finding**: `NODE_LABELS_PLACEMENT` defaults to `NodeLabelPlacement.fixed()` (empty set, so `UNDEFINED` location),
  `NODE_SIZE_OPTIONS` to `[DEFAULT_MINIMUM_SIZE]`, `PORT_LABELS_PLACEMENT` to `[OUTSIDE]`.
- **Impact**: node labels are ignored by the cell system unless a placement is set.
- **Confidence**: High

## Observation: node adapters list port edges as node edges

- **Context**: T5 `NodeMarginCalculator` tests.
- **Finding**: `ElkNodeAdapter.getOutgoingEdges/getIncomingEdges` delegate to `ElkGraphUtil.allOutgoingEdges/
allIncomingEdges`, which include edges attached to the node's ports. `NodeMarginCalculator` therefore processes a
  port edge's head/tail label twice: once relative to the port and once as if attached to the node.
- **Impact**: margins with port-edge labels are larger than the port-level box alone; faithful to Java.
- **Confidence**: High

## Observation: hand-derived nodespacing expectations keep missing the same rules

- **Context**: T2–T6 self-corrections, each flagged in the decision journal.
- **Finding**: every correction traced to one of: `ContainerCell.minWidth/HeightOfCell` returning 0 for a
  zero-content `AtomicCell` with padding; `spaceEfficientPortLabels` when a side has exactly 2 ports; the port-edge
  double processing above; and `NodeLabelLocation` placement sets that overlap (OUT_T_L vs OUT_L_T).
- **Impact**: when deriving expectations by hand for nodespacing (7a/8x JUnit ports), check these four rules first.
- **Confidence**: High

## Observation: the node-micro-layout replay never sets a port alignment

- **Context**: mission 6c T1, coverage of the three T4 port placement files under the 326-row replay alone.
- **Finding**: no landed row sets `portAlignment.*`, so every free placement runs DISTRIBUTED. The BEGIN/END/JUSTIFIED
  switch arms, the non-DISTRIBUTED size paths, `PORT_BORDER_OFFSET` on N/S ports, `FIXED_RATIO` with surrounding
  margins, and the next-to-port/fixed-label margin arms stay unreached (26 branches, 13 T4 scenarios to cover them).
  The TS also shares one helper for the Java's duplicated horizontal/vertical free-placement switches
  (`PortPlacementCalculator.java:167/343`, `175/351`, `188/364`), so each unreached TS arm stands for two Java sites.
- **Impact**: replay coverage alone does not vouch for port alignment or border offset behaviour. Later replays
  (layered output in 7a) or a targeted recorder have to set these options explicitly.
- **Confidence**: High
