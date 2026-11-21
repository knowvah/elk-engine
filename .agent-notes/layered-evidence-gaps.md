<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: layered-evidence-gaps (issue #49, 2026-11-21)

Planning-time notes are in `layered-evidence-gaps-planning.md`. Journal: `plans/layered-evidence-gaps/decision-journal.md`.
Arm outcomes: `plans/layered-evidence-gaps/unreached.md`.

## Observation: jdb counts branch arms on the unmodified oracle

- **Context**: T3 needed evidence that three `HyperEdgeSegmentSplitter` arms are taken on the JVM, not only in the port.
- **Finding**: the oracle jars carry line and local-variable tables. A recorder script appends to `JAVA_TOOL_OPTIONS`, so
  `JAVA_TOOL_OPTIONS='-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=localhost:<port>'` with
  `ELK_VECTORS_CACHE=off` and the recorder's `*_FILTER=<row>` starts one suspended JVM; `jdb -attach localhost:<port>`
  (started without that variable) takes `stop at <class>:<line>` before the class loads. The driver must send `cont` only
  after each `Breakpoint hit:` line: commands piped in at once are consumed while the VM runs ("Nothing suspended").
  The recorder runs every row twice, so hits are double. Lines to use come from `javap -l -p` on the class.
- **Impact**: an arm's reachability on the oracle can be measured per row without a patch, a rebuild or a scratch copy
  of the class. No JaCoCo agent is in `~/.m2`.
- **Confidence**: High (12 rows measured, the counts match the port's)

## Observation: equal port coordinates break the splitter's "an area in its own span" assumption

- **Context**: T3, `HyperEdgeSegmentSplitter.ts:220 if[1]`, classed unreachable at Medium confidence by 7e.
- **Finding**: the critical threshold is 0.2 × the smallest difference between two distinct incoming or two distinct
  outgoing coordinates, and `distinct()` drops exact duplicates. Two segments with exactly equal incoming and equal
  outgoing coordinates (two FIXED_POS ports at one y per layer) form a critical 2-cycle with no free area; with no
  other coordinate the threshold is `0.2 × Double.MAX_VALUE`. Three identical cycles use up a single area.
- **Impact**: coincident ports are valid input and take paths random graphs never reach (150,000 random graphs did not).
  A search for rare routing arms should include duplicated coordinates.
- **Confidence**: High

## Observation: a whole-plan pipeline row records no port position

- **Context**: T4, checking that port alignment rows differ.
- **Finding**: in `layered-pipeline.json` (and the placement and routing refs) `geometry.ports` is written only when the
  stop is `LABEL_AND_NODE_SIZE_PROCESSOR` or `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR`, or the graph holds a flexible
  node. At the end of the plan a port shows only through bend points and node margins, and the under-ten-nodes `dump`
  of such a row lists node paths and edges, not ports.
- **Impact**: evidence about port placement needs a row that stops at `LABEL_AND_NODE_SIZE_PROCESSOR` (the
  `scenarios/Port*/…/ports` rows), next to the whole-plan row.
- **Confidence**: High

## Observation: layered's declared port alignment default is not the effective one

- **Context**: T4, the per-side rows.
- **Finding**: `Layered.melk:144` declares `portAlignment.default = JUSTIFIED`, but `NodeContext.getPortAlignment`
  (`NodeContext.java:205-240`) reads the `CoreOptions` properties, so an unset alignment is DISTRIBUTED. The oracle rows
  show it (`scenarios/PortAlignment/north/BEGIN/ports`: east ports at y 24 and 52, the DISTRIBUTED placement) and the
  port agrees. Filed as #142.
- **Impact**: expect DISTRIBUTED, not JUSTIFIED, when predicting port positions of a layered node without the option.
- **Confidence**: High

## Observation: a negative port border offset moves the ports of the other sides

- **Context**: T4, `scenarios/PortBorderOffset/north-south/minus5/ports`.
- **Finding**: with `port.borderOffset` −5 on the north and south ports (they sit 5 inside the node), the east and west
  ports move from y 24 / 52 to 25.67 / 50.33: the inset ports reduce the space the other sides distribute over.
- **Impact**: a border offset on one side is not local to that side on a fixed-size node.
- **Confidence**: Medium (observed on the oracle and matched by the port; the mechanism was not traced)

## Observation: a site chain that omits PORT_SIDE_PROCESSOR is outside the Java invariant tests

- **Context**: T1, `InvertedPortProcessorTest.testValidNodeOrder` on `sites/InvertedPortProcessor/freePorts`.
- **Finding**: every real plan runs `PORT_SIDE_PROCESSOR` before P3 (`GraphConfigurator.java:214-218`); a `sites/*`
  chain may leave it out to probe a branch. On such a row a free-port node can keep an EAST input (a reversed edge),
  which `InvertedPortProcessor` skips, so the Java test's assertion fails on the oracle's own recorded state.
- **Impact**: when running a ported JUnit invariant over step rows, select rows whose chain is plan-shaped.
- **Confidence**: High

## Observation: a comment-only edit can delete code when it replaces a span between two anchors

- **Context**: T6 gate 7, the pipeline recorder failed to compile after a "comment-only" commit.
- **Finding**: the javadoc being rewritten was followed by a helper method and then by the method it described; the
  replacement ran from the javadoc's start to the second method and removed the helper. The single-file recorders are
  compiled only when run.
- **Impact**: after any edit to a recorder, run it (a `*_FILTER` run takes seconds) before committing.
- **Confidence**: High
