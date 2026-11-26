<!-- SPDX-License-Identifier: EPL-2.0 -->

# self-loop-assert-arms: planning observations (issue #115)

## Observation: a Java switch on a null enum throws before default; a TS switch does not

- **Context**: planning #115, row 105 (`RoutingDirector.determineThreeSideLoopRoutes`, a `switch` on
  `computeMissingPortSide(slLoop)`).
- **Finding**: Java compiles an enum `switch` to a lookup through `ordinal()`, so a null selector throws
  `NullPointerException` at the `switch`, and no arm runs. A TS `switch (null)` matches no `case` and runs `default`. When
  a ported `default` arm stops throwing, a null selector then takes a path the Java never takes.
- **Impact**: a port of an enum `switch` whose selector can be null needs an explicit null dereference before the
  `switch` (D10 `TypeError`) wherever the `default` arm does not throw.
- **Confidence**: High (Java Language Specification: a `switch` on a null reference throws NPE; TS semantics).

## Observation: array reads by ordinal precede the self-loop router's switches

- **Context**: rows 96, 99 and 100 (`OrthogonalSelfLoopRouter.placeLabels`, `getBaseVector`).
- **Finding**: both methods read `routingSlotPositions[side.ordinal()][routingSlot]` before switching on the side
  (`OrthogonalSelfLoopRouter.java:145`, `:429`). For `UNDEFINED` with an empty row, the JVM throws
  `ArrayIndexOutOfBoundsException` before the `default` arm runs, and JS reads `undefined`.
- **Impact**: a unit test of these arms must give the `UNDEFINED` row an entry, or its expected value is not the Java's.
- **Confidence**: High (Java read at the pin `8bca22f4`).
