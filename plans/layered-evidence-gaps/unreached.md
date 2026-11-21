<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-evidence-gaps: arm outcomes (item 3) and corrections

Filled by T3. One row per arm: the rung of [D3](decisions.md#d3) that closed it, the row ids, the evidence the arm is
taken on the oracle, or the proof. Earlier missions' `unreached.md` files are not edited; where this file corrects one, it
says so here.

| Arm | Earlier classification | Rung | Rows / proof | Evidence |
| --- | ---------------------- | ---- | ------------ | -------- |
| `HyperEdgeSegmentSplitter.ts:220 if[1]` (Java `:228` else) | U, Medium (`plans/layered-edge-routing/unreached.md:105`) | 1 (layout row) | `sites/HyperEdgeSegmentSplitter/noFreeArea/unbounded`, `…/noFreeArea/finite`, `…/noFreeArea/consumed`; also taken by `…/areaStartRounding/consumed` and `…/areaEndRounding/consumed` | jdb on the oracle JVM, per recording of the row: line 226 minus line 230 = 1, 1, 1 (and 2, 2 on the two rounding rows). The split position in the recorded bend points is the centre of the segment (42.5 of 15..70; 17.5 of 15..20; 62 of 12..112) |
| `HyperEdgeSegmentSplitter.ts:400 if[1]` (Java `:398` else) | U, Medium (`…/unreached.md:114`) | 1 (layout row) | `sites/HyperEdgeSegmentSplitter/areaStartRounding/single`, `…/areaStartRounding/consumed` | jdb: line 390 reached once, line 399 never, line 405 once. On `consumed` the recorded bend points depend on the arm: with a first new area a later split would sit at about 88.05; the oracle has splits at 120.69999999999999 (three) and 153.35 only |
| `HyperEdgeSegmentSplitter.ts:406 if[1]` (Java `:404` else) | U, Medium (`…/unreached.md:114`) | 1 (layout row, negative coordinates) | `sites/HyperEdgeSegmentSplitter/areaEndRounding/single`, `…/areaEndRounding/consumed` | jdb: line 390 once, line 399 once, line 405 never. On `consumed` the recorded splits are −153.35, −120.7 and −120.69999999999999 (two); a second new area would put one at about −88.05 |

All seven rows are plan-A step rows (ORTHOGONAL, the interactive minimizer and placer, FIXED_POS ports on two 30 × 400
nodes: a segment coordinate is the port's y + 2) in `test/golden/refs/java/layered-routing-steps.json`, recorded on
`8bca22f4` + 0001-0004. The port replays each at the AD-4 bar with no `src/` change, and the generic routing replay now
takes all 24 branches of `HyperEdgeSegmentSplitter.ts`. `src/alg/layered/p5edges/orthogonal/HyperEdgeSegmentSplitter.sites.test.ts`
pins the oracle's per-line counts and split positions.

## How the oracle evidence was taken

`jdb` attached to the recorder's JVM (`-agentlib:jdwp`, appended through `JAVA_TOOL_OPTIONS`, which
`layered-routing-vectors.sh` honours) with breakpoints on the unmodified oracle class at
`HyperEdgeSegmentSplitter.java:226` (every split), `:230` (an area is used), `:385` (`useArea`), `:390` (the size test
holds), `:399` (first new area), `:405` (second new area); one run per row with `ROUTING_FILTER` and
`ELK_VECTORS_CACHE=off`. The recorder runs every row twice, so each count below is half of the breakpoint hits
(scratch `$TMPDIR/layered-evidence-gaps/T3/jdbarms.py`, summary `jdb-summary.txt`):

| Row | `:226` | `:230` | `:385` | `:390` | `:399` | `:405` |
| --- | ------ | ------ | ------ | ------ | ------ | ------ |
| `noFreeArea/unbounded` | 1 | 0 | 0 | 0 | 0 | 0 |
| `noFreeArea/finite` | 1 | 0 | 0 | 0 | 0 | 0 |
| `noFreeArea/consumed` | 4 | 3 | 3 | 1 | 1 | 1 |
| `areaStartRounding/single` | 1 | 1 | 1 | 1 | 0 | 1 |
| `areaStartRounding/consumed` | 4 | 2 | 2 | 1 | 0 | 1 |
| `areaEndRounding/single` | 1 | 1 | 1 | 1 | 1 | 0 |
| `areaEndRounding/consumed` | 4 | 2 | 2 | 1 | 1 | 0 |

Controls: the five earlier splitter rows (`twoCycles`, `hyperedgeSplitsRegular`, `areaRatingFewerDependencies`,
`areaRatingFewerCrossings`, `denseCycles`) reach none of the three else arms (`:226` = `:230`, `:390` = `:399` = `:405`).

## Mechanisms

**`:228` else (no free area in reach).** `T = 0.2 × m`, where `m` is the smallest difference between two distinct
incoming coordinates or two distinct outgoing coordinates (`OrthogonalRoutingGenerator.java:176, :248-270`). A free area
is a gap of at least `2T` between neighbours in the combined sorted list (`HyperEdgeSegmentSplitter.java:98-103`), and
only a gap inside the segment's span is in reach (`:212-221`). Between two distinct incoming (or two distinct outgoing)
coordinates there is always a gap of at least `0.5 m ≥ 2T`, so a segment without an area in its span has one incoming
coordinate `a` and one outgoing coordinate `b`. For it to carry a critical dependency in each direction
(`countConflicts`, `OrthogonalRoutingGenerator.java:401-405`), another segment must have an incoming coordinate within
`T` of `b` and one must have an outgoing coordinate within `T` of `a`; any incoming coordinate other than `a` itself is
at least `m` from `a`, so those coordinates are exactly `a` and exactly `b`. Hence:

- two different segments with exactly equal incoming and exactly equal outgoing coordinates and `|b − a| < T`
  (`finite`), which includes the case of no other distinct coordinate, where `m` is `Double.MAX_VALUE` and no gap is
  an area (`unbounded`); or
- the areas of the span were used up by earlier splits of the same run (`consumed`: three identical critical 2-cycles,
  one area, four splits). The construction again uses exactly equal coordinates in one list; whether consumption can
  empty a span without them is open (not found in about 820,000 random two-column graphs, no proof).

Equal coordinates need two ports at the same y in one layer, which FIXED_POS ports (or port anchors) give.

**`:398` and `:404` else (a new area dropped by rounding).** Both sit under `oldArea.size / 2 >= T` (`:388`). In exact
arithmetic that test implies both conditions; they fail only when the area is exactly (to the ulp) `4T` wide and the
rounding of `(start + end) / 2 ∓ T` falls outside the area. The rows use a critical 2-cycle with incoming coordinates
`55.4` and `218.64999999999998` and outgoing coordinates `186` and `22.750000000000004`: `m = 163.24999999999997`,
`T = 32.65`, the area `[88.05, 153.35]`, its centre `120.69999999999999`, and `fl(centre − T) = 88.04999999999998`, one
ulp below the start. Negating every coordinate mirrors the arithmetic onto the end of the area (`:404`). The
coordinates are ulp-crafted (5 hits in 98 million sampled 2-cycles), not short decimals.

## Open points (journaled, not blocking)

- `:404` else with only non-negative coordinates: not constructed. In the 2-cycle family it would need an exact
  half-ulp tie with an odd end, and the end is `fl(y − T)`, which that tie rounds to even; outside that family a
  boundary area never won `chooseBestAreaIndex` in 150,000 sampled graphs. The row therefore uses negative y
  coordinates (ports above the top of their node), which the importer and the interactive placer keep bit-exact.
- Both arms in one `useArea` call: none exists for a non-negative start (the rounding error of the centre would have to
  be both at least and less than a quarter ulp of the end); 38 million sampled triples found none.
- Rung 2 (`calls/HyperEdgeSegmentSplitter/useArea-*`) was not needed and is not recorded.

## Corrections to earlier records

- `plans/layered-edge-routing/unreached.md:31` says "two Medium-confidence splitter arms"; `:226` and the rows list three.
- `plans/layered-edge-routing/unreached.md:105` argues that "by construction a critical-cycle segment has a free area in
  its own span, so it could arise only after an earlier split consumed it". The first half does not hold: two segments
  that share both coordinates form a critical 2-cycle whose span holds no gap of `2T` (`noFreeArea/unbounded`,
  `noFreeArea/finite`). The second half (consumption) is real and now recorded (`noFreeArea/consumed`).
- `plans/layered-edge-routing/unreached.md:114` ("reachable only through a 1-ulp rounding gap") holds; both arms are now
  constructed and recorded. The three arms move from U (Medium) to S; that file is not edited.
