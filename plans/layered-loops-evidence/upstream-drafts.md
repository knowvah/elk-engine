<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-loops-evidence: drafts for upstream (not filed)

Two behaviours of ELK at the pin (`8bca22f4`, oracle with patches 0001-0004) that this mission met while looking for
graphs. The port reproduces both (a `TypeError` where the Java throws; NaN where the Java gives NaN), so neither is a
port divergence. Nothing was filed upstream and nothing was written to `~/git/knowvah/elk`: the queue rules leave that to
the maintainer (the `needs-ruling` issue that points here). The repros were run with `tools/oracle/run.sh`; their files
are scratch (`$TMPDIR/layered-loops-evidence/upstream/`) and are reproduced below in full.

## 1. Spline routing with `layerUnzipping.strategy=ALTERNATING` throws a NullPointerException

**Repro** (`spline-unzipping-npe.elkt`):

```
algorithm: layered
elk.direction: RIGHT
elk.edgeRouting: SPLINES
elk.layered.layerUnzipping.strategy: ALTERNATING

node W {
    layout [ size: 30, 30 ]
    portConstraints: FIXED_SIDE
    port p0 {
        layout [ size: 4, 4 ]
        ^port.side: WEST
    }
}
node X { layout [ size: 30, 30 ] }
node T { layout [ size: 30, 30 ] }

edge W.p0 -> T
edge W -> X
edge X -> T
```

**Observed** (oracle): `java.lang.NullPointerException: Cannot assign field "sourcePort" because "segment" is null` at
`SplineEdgeRouter.getSplinePath(SplineEdgeRouter.java:956)`, called from `SplineEdgeRouter.process(SplineEdgeRouter.java:307)`.

**Expected**: a layout, or an `UnsupportedConfigurationException` that names the option combination.

**What was checked**

- The same graph lays out with `layerUnzipping.strategy=NONE` (root 168.0 × 66.5) and with `edgeRouting=ORTHOGONAL`
  (208.0 × 75.0). Without X (W.p0 → T alone) it lays out too: the edge is reversed, so there is no inverted port.
- State before the router (the plan run up to, not including, `SplineEdgeRouter`): five layers; W's WEST port has an
  edge to a long edge dummy in layer 1 while W is in layer 0 and the router's pair is (none, layer 0); a long edge dummy
  of layer 1 has an edge from its EAST port to a dummy in layer 0. Both meet the "Unhandled situation" comment of
  `clearThenFillMappings` (`SplineEdgeRouter.java:398-402`, `:445-449`): the edge is removed from `edgesRemainingLayer`
  but stays in `startEdges`, gets no `SplineSegment`, and `getSplinePath` dereferences the missing segment.
- Mechanism as read from the code, not yet traced step by step on the oracle: the spline router assumes that every edge
  joins adjacent layers or stays in its layer. `AlternatingLayerUnzipper` moves the nodes of a layer into sub-layers
  after the long edges were split, which breaks that assumption for the in-layer edges of an inverted port.
- History: `AlternatingLayerUnzipper` came with "2024-12-09 Layer Splitting Improvements (#1094)" (`95417f0a`), later
  changed by #1150 and #1170. No upstream issue was found for `getSplinePath` or for unzipping with splines
  (`gh search issues --repo eclipse-elk/elk`, 2026-11-21).

**Port**: `SplineEdgeRouter.sites.test.ts` pins the same throw site (a `TypeError` out of `getSplinePath`).

## 2. Components compaction returns NaN positions for a tiny bottom padding

**Repro** (`components-compaction-nan.elkt`):

```
algorithm: layered
elk.direction: RIGHT

node c {
    layout [ size: 200, 200 ]
    portConstraints: FIXED_SIDE
    elk.edgeRouting: ORTHOGONAL
    elk.layered.compaction.connectedComponents: true
    elk.padding: "[top=12,left=12,bottom=0.00004,right=12]"
    elk.spacing.componentComponent: 0
    port pS {
        layout [ size: 4, 0 ]
        ^port.side: SOUTH
    }
    port pW {
        layout [ size: 0, 0 ]
        ^port.side: WEST
    }
    node x {
        layout [ size: 30, 30 ]
        portConstraints: FIXED_SIDE
        port s {
            layout [ size: 4, 0 ]
            ^port.side: SOUTH
        }
    }
    node y { layout [ size: 20, 60 ] }
    edge c.pS -> x.s
    edge c.pW -> y
}
```

**Observed** (oracle): the layout completes, and the exported graph holds 24 `NaN` values (the positions of c's ports
and of x and y, and the edge sections).

**Expected**: finite coordinates.

**What was checked**

- The port gives NaN at the same places (the scratch row replays equal with the NaN-tolerant parse).
- A one-component variant (only `c.pS -> x`, x without a port) gives finite coordinates on the oracle.
- TS trace of this graph (the port agrees with the oracle on the output): the frame of the graph before compaction is
  finite ((−12, 0) to (70, 100.00004)) and the hull rectangles have finite sizes (20.5 × 1, 15.5 × 40.5, 14.5 × 30 for
  the SOUTH component, 20 × 60 for the WEST one; placeholders 1 × 0 and 0 × 1). After
  `OneDimensionalComponentsCompaction.compact` every hull rectangle and placeholder has x and y NaN, so the compacted
  graph size is NaN before the loop over the external edges (`ComponentsCompactor.java:148-171`). The NaN arises inside
  the one-dimensional compaction. **The mechanism is not traced further**: this draft is a symptom report. The next step
  is to instrument the oracle's compaction (the scanline constraints and the longest-path positions with a SOUTH
  placeholder of height 0 and a component spacing of 0).
- The input is contrived (a padding of 4e-5 and a component spacing of 0, found while searching for a graph that
  exercises `EPSILON` in `ComponentsCompactor`), so the practical weight is low. It may share a cause with the NaN of
  `tickets/layered/213_componentsCompaction` (a 0 × 0 compound node; `docs/conformance.md`).
- No upstream issue was found for NaN from components compaction (`gh search issues`, 2026-11-21).
