// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7h layered-compound, T1, H2, H3, H5, H13) for the compound graph layout of
// org.eclipse.elk.alg.layered: CompoundGraphPreprocessor, CompoundGraphPostprocessor (with CrossHierarchyEdge and its comparator),
// HierarchicalNodeResizingProcessor, and the hierarchical driver ElkLayered.doCompoundLayout / hierarchicalLayout that interleaves the
// levels. The Java is the spec; this program only CALLS ELK APIs (reflection where a member is package-private) and records results; it
// embeds no ELK implementation. Expectations come from the oracle only, before any TypeScript of the mission exists.
// Run: tools/vectors/layered-compound-vectors.sh <outDir>   (java -cp ... LayeredCompoundVectors.java <outDir> <tools/vectors dir>)
// Plan dump (diagnosis): java -cp ... LayeredCompoundVectors.java --plan-dump <tools/vectors dir> <modelsDir> <path>... [-o CONSTANT=value]...
//   prints "PLAN <path> <level path> <member>,..." per hierarchy level (a directory path is expanded to its .elkt / .json files).
// Sweep (T13, H5): java -cp ... LayeredCompoundVectors.java --sweep <modelsDir> <outDir> | --dump <case id>... <modelsDir> <outDir> (from the repo
// root; tools/oracle/compound-sweep.sh runs them). Cases and line format: the header of the "--sweep / --dump" section above main.
//
// ORIGIN (B7: single-file launchers share no code): the logged-graph capture of Group sites is copied from LayeredLabelsVectors.java
// (7f2, T1: collectLogged, logged); the rest is copied from tools/vectors/LayeredLoopsVectors.java (7g, T1; itself copied from
// LayeredLabelsVectors, LayeredRoutingVectors, LayeredPlacementVectors and LayeredOrderVectors): the JSON helpers, the LGraph Dump, the C4
// Encoder and decode, importGraph/normalise/Base/phaseDump and the flat step interpreter (ops importGraph, normalise, setProperty,
// runProcessor, runPhase, layout, dump: no row of this file uses them yet, T14 may), Spec/execute/buildRows, strictNumbers/strictParse, the
// row timeout, PlanRecorder, the ELK JSON builders, the --plan-dump. The row format, the C4 values, the BFS guard, the re-run /
// build-twice / strict-parse / size checks are 7c's through 7g's (see their headers).
// NOT copied from the 7g file, to leave room for T13 (sweep, ~600 lines) and T14 (sites, ~400): the loops, wrapping, compaction and
// components families and scenarios, the self loop sites, the SelfLoopHolder summary (expected.selfLoops) and the "processor" step op, the
// 7e pipeline stop rows (runPipeline, levels), the label manager / interactive / logging / layoutCancelled ops and the "logged" dump, the
// refusal categories (no category remains: every IntermediateProcessorStrategy member is allowed, see SEVEN_H), the sweep.
//
// Output: ONE file <outDir>/layered-compound.json (2-space top level, one compact JSON row per line, trailing newline, under 16 MiB):
//   { jdk, oracle, rowCounts: { full, models, scenarios, sites }, rows }
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable. input = { path, sha256 } (vendored
//   file under test/golden/inputs, the sha256 in MODEL_TABLE) or { elk } (inline ELK JSON object: a prepared graph, recorded as the export
//   it is replayed from). target = null, steps = null, prefix = null on every row of this recorder. options = the option values applied
//   to the ROOT ElkNode after loading the input and before the layout: a map from option id to a C4 value, or null (a null value REMOVES
//   the property, i.e. setProperty(prop, null)); {} when the input carries its options. C4 values: { t: "bool"|"int"|"string"|"double", v }
//   (a double's v is its Double.toString text), { t: "enum", c: <simple class name, from org.eclipse.elk.core.options or
//   org.eclipse.elk.alg.layered.options>, n: <member> }; the enum classes used here are HierarchyHandling, Direction, EdgeRouting,
//   GreedySwitchType. Rows are built in memory in a fixed order, from lists and LinkedHashMaps only, and the whole build runs twice and
//   must agree byte for byte (the second run of the script is a cache hit). Every row is also run twice from a fresh import.
//
// How every row is run (full, models, scenarios): load the input, apply options to the root, check that no level has random seed 0,
//   then new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor()) with a TestController installed on the layered provider
//   (the engine resolves the hierarchy handling of INHERIT nodes and hands the root to LayeredLayoutProvider, which calls
//   ElkLayered.doCompoundLayout when the root is INCLUDE_CHILDREN). Seed properties are those of tools/oracle/run.sh (export and
//   identifier seed 1) so exported ids agree with refs/elk. A TS replay does the same through its engine and its test controller.
//
// Plans: expected.plans = { "<level path>": [member names] } captured by the controller in the real run (the first graph of a level; the
//   processors it was notified of, in order). Names are F4's: an IntermediateProcessorStrategy member name, "P<n>_<PHASE>/<STRATEGY>" for a
//   phase, GraphTransformer by position (DIRECTION_PREPROCESSOR first, DIRECTION_POSTPROCESSOR last), and, new in this file, the
//   simple class names "CompoundGraphPreprocessor" and "CompoundGraphPostprocessor" (not enum members: ElkLayered constructs them
//   directly, no enum in between; doCompoundLayout notifies them on the root graph). Hence the root level of a compound run starts with
//   CompoundGraphPreprocessor and ends with CompoundGraphPostprocessor. A nested level's list lacks the hierarchy aware processors
//   (the P3 layer sweep and the hierarchical greedy switch): hierarchicalLayout skips them on a nested graph without notifying, the
//   root runs them for every level. The level path is the ids of the ElkNodes from the root down joined by "/", a missing id as "" (so an
//   .elkt root without an identifier has the path "" and its child "o" the path "/o"; an inline input exported by this recorder has
//   ids on all nodes). A level path must be unique within a row.
//
// Group full (F4), id full/<family>/<model>/<variant>: expected = { layout, plans }; layout = compact exported ELK JSON of the root after the
//   engine run (as 7f: omitLayout false, omitZeroDimension false, omitZeroPositions false, unknown options omitted, non-finite numbers
//   as strings). model = the model id: tests/layered/<dir>/<name> -> "<dir>-<name>", tickets/layered/<name> -> "ticket-<name>",
//   examples/<dir>/<name> -> "examples-<dir>-<name>", realworld/ptolemy/**/<file> -> "ptolemy-<last token of the file name, lower case>";
//   inline graphs name themselves. A hierarchical model whose options vary (direction, routing) has them baked into its inline input on
//   every level that has children (options = {}, the 7f2 padding-0 precedent), except where noted. Families:
//     issues            the inputs of the nine suites Issue316, 455, 552, 596, 628, 665, 700, 701, 734 without H13's stress inputs (665 and
//                       hierarchicalLayoutMixing/588: out of scope), variant "default" (the suites' default configuration); Issue628Test's four
//                       @Configurators on the root of 628_hierarchyAwareLayoutProcessor as options: "hierarchical-two-sided"
//                       (crossingMinimization.greedySwitchHierarchical.type TWO_SIDED), "hierarchical-unset" (the same option null),
//                       "switch-two-sided" and "switch-unset" (crossingMinimization.greedySwitch.type); JG/EdgeCoordsTest.xtend's graph, verbatim
//                       ("edgecoords/default"; shapeCoords and edgeCoords only change the JSON import and export, not the layout).
//     include-children  the 20 inputs of tests/layered, tickets/layered and examples that set INCLUDE_CHILDREN (23 at the pin, minus 588, 665 and
//                       examples/hierarchy/hierarchicalLayoutMixing which use elk.stress, H13): variant "default" (the file's own options) and
//                       "<DIRECTION>-<ROUTING>" for DIRECTION RIGHT, LEFT, DOWN, UP x edgeRouting ORTHOGONAL, POLYLINE, SPLINES, baked in.
//     ptolemy-include   12 ptolemy hierarchical models (the four of test/golden/inputs/pipeline and eight vendored under compound/), each with
//                       hierarchyHandling INCLUDE_CHILDREN at the root only (row options) and the direction (variant RIGHT, LEFT, DOWN, UP)
//                       baked into every level that has children: the direction x mode cells H4's goldens leave out.
//     hierarchy-aware   inline graphs deep3 (a, c1{p, c2{q, c3{z, w}}}, five edges across the borders) and siblings: variants "sweepiness-<-1|0|0.1|1>"
//                       (crossingMinimization.hierarchicalSweepiness), "greedy-hierarchical-<off|one-sided|two-sided>", "include-below-root"
//                       (INCLUDE_CHILDREN on c1 only: mixed handling), "separate-below-include" (SEPARATE_CHILDREN on c1 under an INCLUDE_CHILDREN
//                       root); "child-strategy-median" (a child with another crossingMinimization.strategy: reviewAndCorrectHierarchicalProcessors
//                       throws UnsupportedGraphException, an oracle throw row, not recorded, T14 records it as a site).
//     resizer           HierarchicalNodeResizingProcessor on an inline compound node c (a, b, c{x, y} with two ports): variants constraints-<set>
//                       (nodeSize.constraints [], [PORTS], [NODE_LABELS], [PORT_LABELS], [MINIMUM_SIZE], two combinations, all with
//                       nodeSize.minimum (220, 160)), minimum-size-default (DEFAULT_MINIMUM_SIZE), minimum-size-down, content-alignment-*,
//                       padding-*, fixed-graph-size (nodeSize.fixedGraphSize), port-constraints-<free|fixed-side|fixed-order|fixed-pos> on the
//                       compound node, single-child and no-children (a node whose children array is empty is an ordinary node).
//
// Group models (H2), id models/<model>/<n>-<level path>-<SimpleClassName>/<variant>: one row per hierarchical STOP of one engine run.
//   The id embeds the level path verbatim, so it can hold more than four "/" separated segments (the variant is always the last one;
//   read expected.stop.levelPath, not the id). Models and variants: ticket-455_longHierarchicalEdges "default", "DOWN" (direction baked into
//   every level), "greedy-hierarchical-one-sided" and "greedy-hierarchical-two-sided" (crossingMinimization.greedySwitchHierarchical.type on
//   the root: one more stop each) and "median-sweep" (crossingMinimization.strategy MEDIAN_LAYER_SWEEP baked into every level);
//   edge_label_placement-hierarchy01 "default" and "DOWN"; ticket-552_hierarchySelfLoopPorts, ticket-160_externalPortDummyNullPointer and
//   ptolemy-clockdrifthierarchy "default" (the ptolemy model gets INCLUDE_CHILDREN at the root through options).
//   WHEN a stop fires: ElkLayered notifies its TestController around every (graph, processor) pair through notifyProcessorReady /
//   notifyProcessorFinished (the Root variants when the graph has no parent node). doCompoundLayout notifies the two compound processors
//   directly: ready, process, finished on the ROOT graph, the preprocessor before hierarchicalLayout and the postprocessor after it.
//   hierarchicalLayout notifies every processor it runs; a hierarchy aware processor (a LayerSweepCrossingMinimizer: the P3 sweep and the
//   hierarchical greedy switch arm) runs, and is notified, on the root only, after every nested graph has reached it and paused; then the
//   nested graphs resume, deepest level first, and the root last. A stop is the state right AFTER such a "finished" notification, in
//   run order, numbered from 0 (index). The stops are exactly:
//     1. CompoundGraphPreprocessor on the root (always index 0: a TS replay finds this moment right after compoundGraphPreprocessor.process
//        returns in doCompoundLayout, before hierarchicalLayout starts);
//     2. every hierarchy aware processor on the root, in plan order: "P3_NODE_ORDERING/LAYER_SWEEP" (or MEDIAN_LAYER_SWEEP), then
//        "ONE_SIDED_GREEDY_SWITCH" / "TWO_SIDED_GREEDY_SWITCH" when the root's plan has the hierarchical greedy switch (both are the class
//        LayerSweepCrossingMinimizer: tell them apart by stop.processor);
//     3. HIERARCHICAL_NODE_RESIZER on every graph, nested graphs deepest first, the ROOT's last (the root run is a superset of H2's "each
//        nested graph" wording: the processor also resizes the root graph, and nothing else observes that);
//     4. CompoundGraphPostprocessor on the root (the last stop: a TS replay finds it right after compoundGraphPostprocessor.process returns,
//        at the end of doCompoundLayout).
//   Nothing is selected from a plan: an engine run that makes no compound layout is a recorder bug (stops "skipped: 0" on stderr).
//   expected = { stop, tree }.
//     stop = { index: int, levelPath: <level path of the graph the processor ran on>, processor: <positional name as in plans: a member name,
//              "P3_NODE_ORDERING/LAYER_SWEEP", ..., "CompoundGraphPreprocessor", "CompoundGraphPostprocessor">, className: <Java simple class
//              name of the processor> }.
//     tree  = the WHOLE LGraph tree from the root graph at that moment (found from the notified graph by following getParentNode().getGraph()):
//              { graphs: [graph], crossHierarchyMap: null | [mapEntry] }.
//     graphs: depth-first pre-order, root first: the graph of a node is registered right after the node itself while the nodes of the
//       owning graph are walked, before the owner's next node. Paths: the graph "g<k>" (k = its position in `graphs`).
//       A graph's node list = its layerless nodes in order, then the nodes that only sit in a layer (layer by layer): node paths
//       "g<k>/n<i>" in that list order, port "g<k>/n<i>/p<j>" (index in the node's port list), node label "<node>/l<i>", port label
//       "<port>/l<i>", layer "g<k>/layer<n>", edge "g<k>/e<m>" (m = order of first meeting while walking the node list and, per node, its
//       ports in order, each port's outgoing edges then incoming edges; an edge of two graphs belongs to the first graph that meets it), edge
//       label "<edge>/l<i>".
//     graph = { path, levelPath: <the level path of its ORIGIN ElkNode>, size: [x, y], padding: [top, right, bottom, left], offset: [x, y],
//               properties, layerlessNodes: [node], layers: [[node path]], layerNodes: [node], edges: [edge] }  (all numbers are hex:
//               see below). layerNodes = the nodes that only sit in a layer, as node objects, layer by layer in the layers' node order (the
//               order of their paths), so that a stop after the layering observes laid-out nodes; a tree dump only (the 7f dump has none).
//     node  = { path, type: <LNode.NodeType name>, pos, size, margin: [top, right, bottom, left], padding, properties, ports: [port],
//               labels: [label], nested: null | <path of the nested graph in `graphs`> }. `nested` is the per-node nested graph link
//               (LNode.getNestedGraph(), what H2 calls nestedGraph).
//     port  = { path, side: <PortSide name>, pos, size, anchor, explicitAnchor, connectedToExternalNodes, margin, properties, labels,
//               incoming: [edge path], outgoing: [edge path] }.
//     edge  = { path, source: <port path or null>, target: <port path or null>, bendPoints: [[x, y]], labels, properties }; a null end is a
//               port outside the tree.   label = { path, text, pos, size, properties }.
//     Numbers (pos, size, margin, padding, offset, bend points): each double is its raw IEEE bits as 16 lower-case hex digits
//       (Double.doubleToRawLongBits); a NaN in a recorded value stops the recording.
//     properties = { "<option or internal id>": C4 }, sorted by id, all properties of the element EXCEPT the ids processors, random,
//       spacings, splines.route.start, the SelfLoopHolder, org.eclipse.elk.resolvedAlgorithm (a reflected provider pool) and
//       crossHierarchyMap (listed apart). C4 for a reference: { ref: <path> } for an LGraph element that is in the tree, { class: <Java class
//       name> } for one that is not (an element that left the graph, e.g. an original edge), { elk: <identifier or null> } for an ElkGraph
//       element (ORIGIN); an opaque object { class: <name> }; doubles as { t: "double", v: <Double.toString> }; sets { t: "set", c, items };
//       lists { t: "list", c, items }; a set or collection of references a sorted array of refs; other ELK objects { t: "obj", c, fields }.
//     mapEntry = { origEdge, segments: [{ edge, graph, type }] }: the CROSS_HIERARCHY_MAP property of the root graph (a HashMultimap<LEdge,
//       CrossHierarchyEdge>), one entry per key in the map's iteration order (insertion order under -XX:hashCode=2, H3), the values of a key
//       in the order of a stable sort with CrossHierarchyEdgeComparator(root graph) over the values' own iteration order (insertion order;
//       the TS twin reverses that order to show comparator ties). origEdge = the path of the original LEdge when it is in the tree, else
//       "orig/<k>" (k = the key's position in the list); edge = the path of CrossHierarchyEdge.getEdge() when in the tree, else
//       "seg/<k>/<i>" (i = position in the sorted values); graph = the path of CrossHierarchyEdge.getGraph(); type = PortType name
//       (INPUT, OUTPUT, UNDEFINED). Null when the property is not set (never after the first stop).
//   The row's input and options are those of a full row; the stops of one run share them.
//
// Group scenarios, id scenarios/<Class>/<name>/<direction>: inline compound graphs of 3 to 12 nodes run as above (INCLUDE_CHILDREN set in the
//   graph at the root; children inherit it), in all four directions RIGHT, LEFT, DOWN, UP for parent-to-child, child-to-parent, both,
//   siblings, deep-mixed and ns-through, in RIGHT and DOWN for every other name. expected =
//   { layout, plans, stops: <number of stops>, tree: <the tree dump at the LAST stop, after CompoundGraphPostprocessor> }. Classes name the
//   Java class the graph aims at (they select rows, they are not a filter of what the run executes). CompoundGraphPreprocessor: parent-to-child,
//   child-to-parent, both, siblings, siblings-reverse, deep-in-long, deep-out-long, deep-in-short, deep-mixed, deep-between-levels (cross-hierarchy
//   edges parent to child, child to parent, between children of sibling compounds, three levels, short and long), ports-<free|fixed-side|
//   fixed-order> (external ports of the compound node), ns-out, ns-in, ns-through (north/south hierarchical ports, with POLYLINE and SPLINES
//   variants: the routing strategies of H8 (3)). CompoundGraphPostprocessor: edge-labels-<center|head|tail|all>, edge-labels-deep
//   (moveLabelsAndRemoveOriginalEdges, copyLabelsBack), comment-inside, comment-on-compound, edge-labels-inside, junctions-out, junctions-in
//   (orthogonal hyperedges across a border: clearJunctionPoints, copyJunctionPoints), routing-<polyline|splines>-<both|deep>. ElkLayered:
//   inside-self-loop, inside-self-loop-label, inside-self-loop-ports (insideSelfLoops.activate on the compound node, .yo on the edge) and
//   compound-self-loop-<plain|label|ports> (ordinary self loops on a compound node, SelfLoopPreProcessor.java:55,90,100).
//
// Group sites (T14, H2, H8, H12, F12 shape), id sites/<Class>/<name>[/<variant>]: inline compound graphs (input = { elk }, options = {})
//   and one vendored file, one row per scenario of plans/layered-compound/unreached.md (Sc1..Sc16, ids as the document names them) plus the
//   throw rows below. Appended after the scenarios, so no row of the other groups changes. A site row is one whole engine run, recorded as a
//   scenarios row (the run, the checks and the TestController are those of "Group scenarios"); the row's shape tells the three kinds apart:
//     run      expected = { layout, plans, stops, tree } exactly as a scenarios row (INCLUDE_CHILDREN in the graph; no hierarchical stop of
//              its own: the stops are observed, not selected). The TS replay of a scenarios row replays it.
//     logged   (Sc15, sites/JsonDebugUtil/loggedCompound) as run, with the engine run under new BasicProgressMonitor().withLogging(true);
//              expected additionally holds logged = { tags: [string], dot: [string], json: [string] } (copied from LayeredLabelsVectors:
//              collectLogged / logged): every graph the monitor tree logged, depth first (a monitor's own graphs before its sub-monitors',
//              sub-monitors in creation order), one entry per DOT/JSON pair, tags[i] = slotIndex + "-" + name. A JSON text is compared as
//              the landed labels twin does (test/helpers/layered-labels-replay-logged.ts: textual line comparison, never JSON.parse; the
//              identity hash of every object is "@1" under -XX:hashCode=2, normalizeIdentityHashes). What the compound graph adds to the
//              text: the property "crossHierarchyMap" of every logged ROOT graph (HashMultimap.toString: "{<key>=[<value>, <value>], ...}",
//              the entries in insertion order, the values of a key in the multimap's own order, here NOT the comparator order of the tree
//              dump) with, per value, CrossHierarchyEdge.toString() = "<PortType>:<LEdge.toString()>" (e.g. "OUTPUT:e_root.c.e1
//              0[n_root.c.d.x] -> 0[n(external_port)_0]"; LEdge.toString is "e_<origin id> " followed by the source and target as
//              "<port index>[<node toString>]"); a nested graph is written by JsonDebugUtil as the "children" of its node (no separate entry).
//     throws   expected = { throws: { class, message, frame } }: the oracle run threw inside ELK (the first frame outside this program is
//              an org.eclipse.elk frame, as ORACLE THROWS below). class = the exception's fully qualified Java class name; message =
//              getMessage() or null (a JDK 21 helpful NullPointerException message names the failed access and is JVM text: compare the
//              class and frame, not the message, for a NullPointerException); frame = the first org.eclipse.elk frame as "File.java:line".
//              The row's run-twice check covers it (the second run must throw the same class, message and frame). There is no layout, no
//              plans, no tree: a replay must throw from the corresponding TS site.
//   Rows (kind): Sc1..Sc8 and Sc10..Sc16 as run (Sc15 logged); Sc9 sites/ElkLayered/childStrategyThrow throws (UnsupportedGraphException,
//   ElkLayered.java:344); sites/SplineSegment/anchorYWithoutPortCoordinate/{DOWN,UP} throws (ticket 040 with direction and SPLINES baked
//   into every level that has children; NullPointerException, SplineSegment.java:247); sites/ElkGraphImporter/selfLoopInCompoundNode throws
//   (input = { path, sha256 } of tickets/layered/425_selfLoopInCompoundNode.elkt loaded from the file with its own options;
//   NullPointerException, ElkGraphImporter.java:1205); sites/CompoundGraphPreprocessor/hierarchicalPortFIXED_RATIO throws and
//   .../hierarchicalPortFIXED_POS runs (a compound node c, port p without an explicit side at (0, 13), edges a -> p outside and p -> x
//   inside, direction RIGHT, INCLUDE_CHILDREN; the oracle decides which, see the row). A throw outside a row of kind throws is an oracle
//   throw (the row is not recorded).
//
// ORACLE THROWS: a row whose oracle run throws inside ELK (the first frame outside this program is an org.eclipse.elk frame) is not
//   recorded; the recorder prints "ORACLE THROWS <row id> <exception>: <message> at <first ELK frame>" and "oracle throws: n rows" on stderr
//   (the JDK 21 source launcher masks short-stack exceptions, so they are caught and printed inside the recorder). The rows are
//   deterministic: the second build throws the same rows. Every other exception stops the recording.
//
// REFUSAL: a plan member outside the ported sets (an IntermediateProcessorStrategy member outside SEVEN_B..SEVEN_H, P1-P5, or a processor
//   class this file cannot name) exits 1 naming the row. No refusal category remains and INCLUDE_CHILDREN is not refused by option.
//
// OUT OF SCOPE (H13): a model whose hierarchy names an algorithm the classpath does not register (elk.stress) is skipped and counted on
//   stderr ("out of scope (algorithm): n"), never recorded. tickets/layered/588, 665 and examples/hierarchy/hierarchicalLayoutMixing are
//   never vendored; when COMPOUND_MODELS_DIR names the models repository (the script sets it if the directory exists) the program audits on
//   stderr that every INCLUDE_CHILDREN file of tests/layered, tickets/layered and examples is vendored (in MODEL_TABLE) or out of scope,
//   and fails on any other (a new input would otherwise be missed). The audit reads outside the cache key and changes no output.
//
// Size (journaled, COMPOUND_STATS=1 prints the bytes and rows per family): no family needed a trim; the whole ref stays well under 16 MiB.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 so identity-hashed collections iterate in
//   insertion order (AD-10, H3; up to 10 entries, then HashMap treeifies); main fails without it. The crossHierarchyMap, the dummyNodeMap and
//   the postprocessor's dummyEdges are the identity-hashed containers of this brief (H3).
//
// Diagnosis aids (environment, output unchanged when unset): COMPOUND_FILTER=<text> builds only rows whose id contains the text (no coverage
//   check, one build); COMPOUND_MARKERS=1 writes "ROW <id>" to stdout per row; PHASE_TRACE=1 one stderr line per row; COMPOUND_STATS=1
//   prints the bytes and rows per family; COMPOUND_CAP_MB=<n> raises the size cap for a measuring run (never for the ref).
//   A filtered run must not populate the cache: run it with ELK_VECTORS_CACHE=off.
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Stream;
import com.google.common.collect.Multimap;
import org.eclipse.elk.alg.layered.ElkLayered;
import org.eclipse.elk.alg.layered.IHierarchyAwareLayoutProcessor;
import org.eclipse.elk.alg.layered.LayeredLayoutProvider;
import org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy;
import org.eclipse.elk.alg.layered.components.ComponentsProcessor;
import org.eclipse.elk.alg.layered.graph.LEdge;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.LGraphElement;
import org.eclipse.elk.alg.layered.graph.LLabel;
import org.eclipse.elk.alg.layered.graph.LNode;
import org.eclipse.elk.alg.layered.graph.LPort;
import org.eclipse.elk.alg.layered.graph.Layer;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
import org.eclipse.elk.alg.layered.compound.CrossHierarchyEdge;
import org.eclipse.elk.alg.layered.intermediate.HierarchicalNodeResizingProcessor;
import org.eclipse.elk.alg.layered.intermediate.IntermediateProcessorStrategy;
import org.eclipse.elk.alg.layered.options.CrossingMinimizationStrategy;
import org.eclipse.elk.alg.layered.options.CycleBreakingStrategy;
import org.eclipse.elk.alg.layered.options.GreedySwitchType;
import org.eclipse.elk.alg.layered.options.InternalProperties;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.layered.options.LayeringStrategy;
import org.eclipse.elk.alg.layered.options.NodeFlexibility;
import org.eclipse.elk.alg.layered.options.NodePlacementStrategy;
import org.eclipse.elk.alg.layered.options.SplineRoutingMode;
import org.eclipse.elk.alg.layered.options.WrappingStrategy;
import org.eclipse.elk.alg.layered.options.GraphCompactionStrategy;
import org.eclipse.elk.alg.layered.p3order.LayerSweepCrossingMinimizer;
import org.eclipse.elk.alg.layered.p5edges.EdgeRouterFactory;
import org.eclipse.elk.alg.layered.p5edges.splines.NubSpline;
import org.eclipse.elk.alg.layered.p5edges.splines.NubsSelfLoop;
import org.eclipse.elk.alg.layered.p5edges.splines.Rectangle;
import org.eclipse.elk.alg.layered.p5edges.splines.SplineSegment;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.alg.ILayoutProcessor;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.HierarchyHandling;
import org.eclipse.elk.core.testing.TestController;
import org.eclipse.elk.core.AbstractLayoutProvider;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkRectangle;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.elk.alg.layered.intermediate.LabelManagementProcessor;
import org.eclipse.elk.alg.layered.options.CenterEdgeLabelPlacementStrategy;
import org.eclipse.elk.alg.layered.options.EdgeLabelSideSelection;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.util.IElkProgressMonitor;
import org.eclipse.elk.core.util.LoggedGraph;

public class LayeredCompoundVectors {
    /** The pinned ELK commit: the recorder script passes tools/oracle/ELK_COMMIT as -Delk.commit (issue #96). */
    static String elkCommit() {
        String commit = System.getProperty("elk.commit");
        if (commit == null || !commit.matches("[0-9a-f]{40}")) {
            throw new IllegalStateException("system property elk.commit is " + commit
                + ", not a 40-digit sha; run this recorder through its tools/vectors/*-vectors.sh script");
        }
        return commit;
    }

    static final String OUTPUT = "layered-compound.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed", REPO_PREFIX = "repo:";
    static final String INPUTS = "test/golden/inputs/";
    /** Directories under INPUTS that hold a copy of the models repository's layout; the model path is the part after them. */
    static final List<String> INPUT_ROOTS = List.of("compound/", "pipeline/");
    static final int MAX_DEPTH = 8, FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = (System.getenv("COMPOUND_CAP_MB") == null ? 16L : parseLongArg("COMPOUND_CAP_MB", System.getenv("COMPOUND_CAP_MB"))) * 1024 * 1024; // COMPOUND_CAP_MB: diagnosis aid, the committed output stays under 16 MiB
    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING", P3 = "P3_NODE_ORDERING", P4 = "P4_NODE_PLACEMENT", P5 = "P5_EDGE_ROUTING";
    /** The SelfLoopHolder property: reflected, it is about one megabyte per node (a nested object graph), so no row of this recorder dumps it. */
    static final String SELF_LOOP_HOLDER_ID = InternalProperties.SELF_LOOP_HOLDER.getId();
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings", "splines.route.start", SELF_LOOP_HOLDER_ID); // the spline route is recorded in geometry.splines (R3)
    /** The properties a tree dump leaves out: IGNORED_IDS, the engine-resolved algorithm (a reflected provider pool) and the cross hierarchy map (see treeDump). */
    static final Set<String> TREE_IGNORED_IDS = new HashSet<>(IGNORED_IDS);
    static {
        TREE_IGNORED_IDS.add(CoreOptions.RESOLVED_ALGORITHM.getId());
        TREE_IGNORED_IDS.add(InternalProperties.CROSS_HIERARCHY_MAP.getId());
    }
    static final int MAX_HASH_ORDER_SOURCES = 10;
    static int maxBfsSources = 0;
    static volatile String currentRow = "?";
    static final Set<String> SEVEN_B = Set.of("EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER", "LAYER_CONSTRAINT_PREPROCESSOR",
            "LAYER_CONSTRAINT_POSTPROCESSOR", "REVERSED_EDGE_RESTORER", "INTERACTIVE_EXTERNAL_PORT_POSITIONER",
            "NODE_PROMOTION", "HIGH_DEGREE_NODE_LAYER_PROCESSOR", "PARTITION_PREPROCESSOR", "PARTITION_MIDPROCESSOR",
            "PARTITION_POSTPROCESSOR");
    /** C2: the eight processors a default pipeline runs between P2 and P3 plus the two greedy switch arms. */
    static final Set<String> SEVEN_C = Set.of("PORT_SIDE_PROCESSOR", "PORT_LIST_SORTER", "LONG_EDGE_SPLITTER",
            "INVERTED_PORT_PROCESSOR", "NORTH_SOUTH_PORT_PREPROCESSOR", "HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR",
            "SEMI_INTERACTIVE_CROSSMIN_PROCESSOR", "SORT_BY_INPUT_ORDER_OF_MODEL", "ONE_SIDED_GREEDY_SWITCH",
            "TWO_SIDED_GREEDY_SWITCH");
    /** N1: the five processors a P4 stop needs. */
    static final Set<String> SEVEN_D = Set.of("INNERMOST_NODE_MARGIN_CALCULATOR", "LABEL_AND_NODE_SIZE_PROCESSOR",
            "IN_LAYER_CONSTRAINT_PROCESSOR", "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR", "NODE_PLACEMENT_REPEATER");
    /** R1: the six processors around the edge routers (the P5 stops). */
    static final Set<String> SEVEN_E = Set.of("HYPEREDGE_DUMMY_MERGER", "HIERARCHICAL_PORT_POSITION_PROCESSOR",
            "LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR", "LONG_EDGE_JOINER", "NORTH_SOUTH_PORT_POSTPROCESSOR",
            "FINAL_SPLINE_BENDPOINTS_CALCULATOR");
    /** F1: the six processors of 7f (GraphTransformer is two arms). */
    static final Set<String> SEVEN_F = Set.of("DIRECTION_PREPROCESSOR", "DIRECTION_POSTPROCESSOR",
            "HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER", "END_LABEL_SORTER", "HYPERNODE_PROCESSOR", "CONSTRAINTS_POSTPROCESSOR");
    /** G1: the twelve arms of 7f2 (the two label management arms are one class, told apart by their center flag). */
    static final Set<String> SEVEN_F2 = Set.of("LABEL_DUMMY_INSERTER", "LABEL_DUMMY_SWITCHER", "LABEL_SIDE_SELECTOR", "END_LABEL_PREPROCESSOR",
            "CENTER_LABEL_MANAGEMENT_PROCESSOR", "END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR", "LABEL_DUMMY_REMOVER", "END_LABEL_POSTPROCESSOR",
            "COMMENT_PREPROCESSOR", "COMMENT_NODE_MARGIN_CALCULATOR", "COMMENT_POSTPROCESSOR", "ALTERNATING_LAYER_UNZIPPER");
    /** 7g: the nine arms of the self loop, wrapping and compaction family. */
    static final Set<String> SEVEN_G = Set.of("SELF_LOOP_PREPROCESSOR", "SELF_LOOP_PORT_RESTORER", "SELF_LOOP_ROUTER",
            "SELF_LOOP_POSTPROCESSOR", "BREAKING_POINT_INSERTER", "BREAKING_POINT_PROCESSOR", "BREAKING_POINT_REMOVER",
            "SINGLE_EDGE_GRAPH_WRAPPER", "HORIZONTAL_COMPACTOR");
    /** 7h: the one pending arm. The two compound processors are not enum members: ElkLayered constructs them directly. */
    static final Set<String> SEVEN_H = Set.of("HIERARCHICAL_NODE_RESIZER");
    static final String COMPOUND_PRE = "CompoundGraphPreprocessor", COMPOUND_POST = "CompoundGraphPostprocessor";
    static final Set<String> COMPOUND_PROCESSORS = Set.of(COMPOUND_PRE, COMPOUND_POST);
    /** The routers a P5 stop can name (EdgeRouting.UNDEFINED shares the orthogonal router and is never recorded). */
    static final List<EdgeRouting> ROUTINGS = List.of(EdgeRouting.ORTHOGONAL, EdgeRouting.POLYLINE, EdgeRouting.SPLINES);
    /** N3 + G2: the stops whose rows carry the ports and labels geometry (besides rows with a flexible node); labelSizes only on SEVEN_F2. */
    static final Set<String> PORT_LABEL_STOPS = new HashSet<>(Set.of("LABEL_AND_NODE_SIZE_PROCESSOR", "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR"));
    static {
        PORT_LABEL_STOPS.addAll(SEVEN_F2);
        PORT_LABEL_STOPS.addAll(SEVEN_G); // the self loop, wrapping and compaction arms move ports and labels
        PORT_LABEL_STOPS.addAll(SEVEN_H); // the resizer places the external ports of the compound node
    }


    // SHA-256 of every vendored input read, "<sha256>  repo:<path under the repo root>". Keep these lines: the shell
    // script parses them (grep for 64 hex digits, two spaces, "repo:"). The table is the list of every model of this recorder: the
    // model path is the part after inputs/ (and after compound/ or pipeline/, the directories that mirror the models repository).
    static final String MODEL_TABLE = """
2a8c92c4bc09ec6df71b05b2103ece4abb752d2cc29a38dcb30fa425e975f91d  repo:test/golden/inputs/compound/examples/hierarchy/hierarchicalEdges.elkt
27e70b2d7ffa62bb0a2395601d2c1767af82ed9d344d11da3ba1a1e96016d5f3  repo:test/golden/inputs/compound/realworld/ptolemy/hierarchical/continuous_squarewave_SquareWave.json
8a94078c57c919e216dd3458de32f15f8a690563e8d9c2017e96be8189b751af  repo:test/golden/inputs/compound/realworld/ptolemy/hierarchical/ddf_ifthenelse_IfThenElseFSM.json
afc265ab78822e7138a8fb951b83f0cc4ae808b03b06452195cffbedfb1c90e7  repo:test/golden/inputs/compound/realworld/ptolemy/hierarchical/de_clockdrift_ClockDrift.json
224fd8fb507eeb6c6c1a15d351cf5db66d7f6517d045b28ab5662d7c7a7ca244  repo:test/golden/inputs/compound/realworld/ptolemy/hierarchical/de_ptidesmergetomultiframe_PtidesMergeToMultiFrame.json
facf21d1c587b9f15b834459b4cb01ce4cd6206c688fa88becb22971a0a17596  repo:test/golden/inputs/compound/realworld/ptolemy/hierarchical/ptera_carwash_CarWashDE.json
2e23cc9f65202c00b4634a1864eff8a8183ce2ab5d2fb47f47ad77ee763445f2  repo:test/golden/inputs/compound/realworld/ptolemy/hierarchical/ptides_actuatorpattern_ActuatorPattern.json
ec9850fbc2745563f905a4e0d1451b3290f1b810219aa73828de7256ad838100  repo:test/golden/inputs/compound/realworld/ptolemy/hierarchical/ptolemy_robot_RandomWalkIntruder.json
1c4d0de140c5b38c55570bb175b2c5dfa3100fb0720efb0528eb6ae0ae1f4d86  repo:test/golden/inputs/compound/realworld/ptolemy/hierarchical/wireless_personalareanetwork_BluetoothNodes.json
4236b093561e2d4030cc727c25887d73e1f6ff6d8b6b4a8d6bd4a3feacc1b31d  repo:test/golden/inputs/compound/tests/layered/edge_label_placement/hierarchy01.elkt
7cff0e561ce5a2506fbc50537738c27807768f45328f7b2170dd3b81884b4724  repo:test/golden/inputs/compound/tests/layered/edge_label_placement/hierarchy_center_edge_label_problem.elkt
5f6f2c283523c1c4d2e9776d50ef0a446f42c21c0cf018e6f5601463e4c10851  repo:test/golden/inputs/compound/tickets/layered/040_includeChildrenWithFixedOrder.elkt
ff71c3d8969ca744b878002eebcf386315825928ae67d9f052da7e937bbf1cf2  repo:test/golden/inputs/compound/tickets/layered/155_greedySwitchFails.elkt
04e4043f52ed96d92828d348df81f836cfd21d324bd900ecd470b5374eb88f5c  repo:test/golden/inputs/compound/tickets/layered/160_externalPortDummyNullPointer.elkt
a907f7a43910365c7edba50d0d88be4b5e01407fbd60fa54ce95629d5953ef4b  repo:test/golden/inputs/compound/tickets/layered/288_selfLoopsCauseNPE_a.elkt
70de5a62f64e234d1e0857d83fdff377d240277957f18df1b89030456562307e  repo:test/golden/inputs/compound/tickets/layered/288_selfLoopsCauseNPE_b.elkt
2d7c720bb3d222326f1e1efc811c731ce1434e4e46028e5a61e4dedda2d926d4  repo:test/golden/inputs/compound/tickets/layered/316_wrongGraphSizeWithIncludeChildren.elkt
c4a5e11912141ca16097c194e25e3241a15a2f83db04116863c9e66bc42f8085  repo:test/golden/inputs/compound/tickets/layered/316_wrongGraphSizeWithIncludeChildren2.elkt
866425e365b9fa39aa61d676f5c6305a7ebdf149ae60845dabac35c6789b34f8  repo:test/golden/inputs/compound/tickets/layered/352_selfLoopNPEorAIOOBE.elkt
3b24acef4aca227321b20e57b843a5c33baedbc150ba4d39bc0b79809b1a039d  repo:test/golden/inputs/compound/tickets/layered/425_selfLoopInCompoundNode.elkt
8d4d6c32f364d7762fd33da6e7598f63ebfb348afe751a653b7697c86c062f4d  repo:test/golden/inputs/compound/tickets/layered/455_longHierarchicalEdges.elkt
7bd86bdbb96289ae9f65925f3182df723c69f9b4804f9f2bf9b26d8083d59c8b  repo:test/golden/inputs/compound/tickets/layered/455_shortHierarchicalEdges.elkt
83d376646bc17240ca3415a35b7ee1ae7bcd95562dea6ca053493bad27bdfad1  repo:test/golden/inputs/compound/tickets/layered/552_hierarchySelfLoopPorts.elkt
c67c945ce57f50d328a5c97db584ea7d6db5e044e960f447b1a738bf63084547  repo:test/golden/inputs/compound/tickets/layered/596_outsideHierarchicalPortLabels.elkt
1e21879f181703feefddb887a761465a49d27e92b212f328f3c6c2c0488ef216  repo:test/golden/inputs/compound/tickets/layered/628_hierarchyAwareLayoutProcessor.elkt
7637117cf3f93f0ac31519458436bb69821b132adb42de27726b52a7b6071ab6  repo:test/golden/inputs/compound/tickets/layered/700_brokenHierarchyHandling.elkt
264c396d5ce65a2d92c9239506ef2cc14040e89d94eb22b66b929965c013729f  repo:test/golden/inputs/compound/tickets/layered/701_portLabels.elkt
8cc03ddf742f3fd654712eb63fbcc00435fdd5ae904891da3524c9f88c7ac778  repo:test/golden/inputs/compound/tickets/layered/724_includeChildrenModelOrder.elkt
ab3e2cb9b71b47ae2437c6ee00bd32d7aedae8cc3e75f114a34609c2669a8ecf  repo:test/golden/inputs/compound/tickets/layered/734_nodeEdgeSpacingFlat.elkt
880730e2c8bfd68ba4f0f170e4ab81fd0aec10750c544e836cf524a3398cc77f  repo:test/golden/inputs/compound/tickets/layered/734_nodeEdgeSpacingFlatMoreComplex.elkt
f561f2fd1ec30158e71d9fd076376fc20a7fa1ac0acffb8463160897af54e1e3  repo:test/golden/inputs/compound/tickets/layered/734_nodeEdgeSpacingHierarchical.elkt
a78212a04054c839dce3f947456062160c5d668370c43a0945e0e395d865c57b  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json
ce3418acfa52e7afca791ec96756021d02268d6996185bc588e974e00c702f70  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_afdx_AFDXMulticastSimple.json
8d3f9d6477c3849c5406992c893b0d365cab19e225802d0442b47a3bb537c3c2  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_clockdrift_ClockDriftHierarchy.json
7a3828beab03773ed1e6acac596c7ef2d7fc7038ce36af07da2ebcf69eaf04a7  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_switch_CrossbarSwitch.json
""";


    // JSON helpers

    record Raw(String json) { }

    static String json(Object v) {
        StringBuilder sb = new StringBuilder();
        write(sb, v);
        return sb.toString();
    }

    static void write(StringBuilder sb, Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof Raw r) {
            sb.append(r.json);
        } else if (v instanceof String s) {
            str(sb, s);
        } else if (v instanceof Boolean || v instanceof Integer) {
            sb.append(v);
        } else if (v instanceof Map<?, ?> m) {
            sb.append('{');
            int i = 0;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                sb.append(i++ == 0 ? "" : ",");
                str(sb, (String) e.getKey());
                sb.append(':');
                write(sb, e.getValue());
            }
            sb.append('}');
        } else if (v instanceof List<?> l) {
            sb.append('[');
            for (int i = 0; i < l.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                write(sb, l.get(i));
            }
            sb.append(']');
        } else {
            throw new IllegalStateException("unwritable value of class " + v.getClass().getName());
        }
    }

    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new Bug("NaN in a recorded value");
        }
        return String.format("%016x", Double.doubleToRawLongBits(d));
    }

    static void str(StringBuilder sb, String s) {
        if (s == null) {
            sb.append("null");
            return;
        }
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (ch < 0x20) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else {
                        sb.append(ch);
                    }
                }
            }
        }
        sb.append('"');
    }

    /** A recorder or scenario bug: stops the recording. */
    static final class Bug extends RuntimeException {
        Bug(String message) {
            super(message);
        }
    }

    /** A pipeline row whose prefix names a processor outside the 7b set (exit 1, B4). */
    static final class Refusal extends RuntimeException {
        final String member;
        Refusal(String message, String member) {
            super(message);
            this.member = member;
        }
    }

    // LGraph dump

    static final class Dump {
        final Map<Object, String> paths = new IdentityHashMap<>();
        final List<LGraph> graphs = new ArrayList<>();
        final Map<LGraph, List<LNode>> nodeLists = new IdentityHashMap<>();
        final Map<LGraph, List<LEdge>> edgeLists = new IdentityHashMap<>();
        final Encoder enc;
        /** tree = a whole-tree dump of a compound run (see treeDump): graphs carry their level path, the properties leave out the ignored ids. */
        final boolean tree;
        Dump(LGraph root, boolean elkIds) {
            this(root, elkIds, false);
        }
        Dump(LGraph root, boolean elkIds, boolean tree) {
            this.tree = tree;
            enc = new Encoder(paths, elkIds, false);
            register(root);
            for (LGraph g : new ArrayList<>(graphs)) {
                registerEdges(g);
            }
        }
        private void register(LGraph g) {
            String gp = "g" + graphs.size();
            graphs.add(g);
            paths.put(g, gp);
            List<LNode> nodes = new ArrayList<>(g.getLayerlessNodes());
            Set<LNode> seen = Collections.newSetFromMap(new IdentityHashMap<>());
            seen.addAll(nodes);
            for (Layer layer : g.getLayers()) {
                paths.put(layer, gp + "/layer" + layer.getIndex());
                for (LNode n : layer.getNodes()) {
                    if (seen.add(n)) {
                        nodes.add(n);
                    }
                }
            }
            nodeLists.put(g, nodes);
            for (int i = 0; i < nodes.size(); i++) {
                LNode n = nodes.get(i);
                String np = gp + "/n" + i;
                paths.put(n, np);
                labelPaths(n.getLabels(), np);
                for (int j = 0; j < n.getPorts().size(); j++) {
                    LPort p = n.getPorts().get(j);
                    paths.put(p, np + "/p" + j);
                    labelPaths(p.getLabels(), np + "/p" + j);
                }
                if (n.getNestedGraph() != null) {
                    register(n.getNestedGraph());
                }
            }
        }
        private void labelPaths(List<LLabel> labels, String owner) {
            for (int i = 0; i < labels.size(); i++) {
                paths.put(labels.get(i), owner + "/l" + i);
            }
        }
        private void registerEdges(LGraph g) {
            List<LEdge> edges = new ArrayList<>();
            edgeLists.put(g, edges);
            String gp = paths.get(g);
            for (LNode n : nodeLists.get(g)) {
                for (LPort p : n.getPorts()) {
                    for (List<LEdge> list : List.of(p.getOutgoingEdges(), p.getIncomingEdges())) {
                        for (LEdge e : list) {
                            if (!paths.containsKey(e)) {
                                String ep = gp + "/e" + edges.size();
                                paths.put(e, ep);
                                edges.add(e);
                                labelPaths(e.getLabels(), ep);
                            }
                        }
                    }
                }
            }
        }
        /** The tree dump: { graphs: as dump(), crossHierarchyMap }, see the header (group models). */
        Object treeDump() {
            Map<String, Object> m = new LinkedHashMap<>();
            List<Object> gs = new ArrayList<>();
            for (LGraph g : graphs) {
                gs.add(graph(g));
            }
            m.put("graphs", gs);
            m.put("crossHierarchyMap", crossHierarchyMap());
            return m;
        }
        /** The CROSS_HIERARCHY_MAP of the root graph as a list, keys in the map's iteration order, the values of a key sorted by the comparator. */
        private Object crossHierarchyMap() {
            LGraph root = graphs.get(0);
            Multimap<LEdge, CrossHierarchyEdge> map = root.getProperty(InternalProperties.CROSS_HIERARCHY_MAP);
            if (map == null) {
                return null;
            }
            Comparator<CrossHierarchyEdge> sorted = crossHierarchyComparator(root);
            List<Object> out = new ArrayList<>();
            int k = 0;
            for (Map.Entry<LEdge, Collection<CrossHierarchyEdge>> entry : map.asMap().entrySet()) {
                List<CrossHierarchyEdge> values = new ArrayList<>(entry.getValue());
                values.sort(sorted);
                List<Object> segments = new ArrayList<>();
                for (int i = 0; i < values.size(); i++) {
                    Map<String, Object> seg = new LinkedHashMap<>();
                    seg.put("edge", paths.getOrDefault(values.get(i).getEdge(), "seg/" + k + "/" + i));
                    seg.put("graph", pathOf(paths, values.get(i).getGraph()));
                    seg.put("type", values.get(i).getType().name());
                    segments.add(seg);
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("origEdge", paths.getOrDefault(entry.getKey(), "orig/" + k));
                row.put("segments", segments);
                out.add(row);
                k++;
            }
            return out;
        }
        Object dump() {
            List<Object> gs = new ArrayList<>();
            for (LGraph g : graphs) {
                gs.add(graph(g));
            }
            return single("graphs", gs);
        }
        private Object graph(LGraph g) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(g));
            if (tree) {
                m.put("levelPath", levelPathOf(g));
            }
            m.put("size", pair(g.getSize()));
            m.put("padding", quad(g.getPadding().top, g.getPadding().right, g.getPadding().bottom, g.getPadding().left));
            m.put("offset", pair(g.getOffset()));
            m.put("properties", properties(g));
            List<Object> layerless = new ArrayList<>();
            for (LNode n : g.getLayerlessNodes()) {
                layerless.add(node(n));
            }
            m.put("layerlessNodes", layerless);
            List<Object> layers = new ArrayList<>();
            for (Layer layer : g.getLayers()) {
                List<Object> inLayer = new ArrayList<>();
                layer.getNodes().forEach(n -> inLayer.add(paths.get(n)));
                layers.add(inLayer);
            }
            m.put("layers", layers);
            if (tree) {
                // The nodes that only sit in a layer, as node objects, in path order (layer by layer): without them a stop after the
                // layering would not observe a laid-out node's position, size, ports or labels (the 7f dump lists their paths only).
                List<Object> layerNodes = new ArrayList<>();
                for (Layer layer : g.getLayers()) {
                    layer.getNodes().forEach(n -> layerNodes.add(node(n)));
                }
                m.put("layerNodes", layerNodes);
            }
            List<Object> edges = new ArrayList<>();
            for (LEdge e : edgeLists.get(g)) {
                edges.add(edge(e));
            }
            m.put("edges", edges);
            return m;
        }
        private Object node(LNode n) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(n));
            m.put("type", n.getType().name());
            m.put("pos", pair(n.getPosition()));
            m.put("size", pair(n.getSize()));
            m.put("margin", margin(n.getMargin()));
            m.put("padding", quad(n.getPadding().top, n.getPadding().right, n.getPadding().bottom, n.getPadding().left));
            m.put("properties", properties(n));
            List<Object> ports = new ArrayList<>();
            n.getPorts().forEach(p -> ports.add(port(p)));
            m.put("ports", ports);
            m.put("labels", labels(n.getLabels()));
            m.put("nested", n.getNestedGraph() == null ? null : paths.get(n.getNestedGraph()));
            return m;
        }
        private Object port(LPort p) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(p));
            m.put("side", p.getSide().name());
            m.put("pos", pair(p.getPosition()));
            m.put("size", pair(p.getSize()));
            m.put("anchor", pair(p.getAnchor()));
            m.put("explicitAnchor", p.isExplicitlySuppliedPortAnchor());
            m.put("connectedToExternalNodes", p.isConnectedToExternalNodes());
            m.put("margin", margin(p.getMargin()));
            m.put("properties", properties(p));
            m.put("labels", labels(p.getLabels()));
            m.put("incoming", edgePaths(p.getIncomingEdges()));
            m.put("outgoing", edgePaths(p.getOutgoingEdges()));
            return m;
        }
        private List<Object> edgePaths(List<LEdge> edges) {
            List<Object> l = new ArrayList<>();
            edges.forEach(e -> l.add(paths.get(e)));
            return l;
        }
        private Object edge(LEdge e) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(e));
            m.put("source", e.getSource() == null ? null : paths.get(e.getSource()));
            m.put("target", e.getTarget() == null ? null : paths.get(e.getTarget()));
            List<Object> bends = new ArrayList<>();
            e.getBendPoints().forEach(b -> bends.add(pair(b)));
            m.put("bendPoints", bends);
            m.put("labels", labels(e.getLabels()));
            m.put("properties", properties(e));
            return m;
        }
        private List<Object> labels(List<LLabel> labels) {
            List<Object> l = new ArrayList<>();
            for (LLabel label : labels) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("path", paths.get(label));
                m.put("text", label.getText());
                m.put("pos", pair(label.getPosition()));
                m.put("size", pair(label.getSize()));
                m.put("properties", properties(label));
                l.add(m);
            }
            return l;
        }
        private Map<String, Object> properties(LGraphElement e) {
            Map<String, Object> m = new TreeMap<>();
            for (Map.Entry<IProperty<?>, Object> entry : e.getAllProperties().entrySet()) {
                if (!entry.getKey().getId().equals(InternalProperties.SPLINE_ROUTE_START.getId())
                        && !entry.getKey().getId().equals(SELF_LOOP_HOLDER_ID) // R3: see geometry.splines; the holder is never dumped
                        && !(tree && TREE_IGNORED_IDS.contains(entry.getKey().getId()))) {
                    m.put(entry.getKey().getId(), enc.encode(entry.getValue(), 0));
                }
            }
            return m;
        }
    }

    /** The level path of a graph: that of the ElkNode it was imported from (the root graph: the root node). */
    static String levelPathOf(LGraph g) {
        if (!(g.getProperty(InternalProperties.ORIGIN) instanceof ElkNode n)) {
            throw new Bug("row " + currentRow + ": a graph without an ElkNode origin");
        }
        return levelPath(n);
    }

    /** CrossHierarchyEdgeComparator (package-private, CompoundGraphPreprocessor.java:258 and CompoundGraphPostprocessor.java:93) for the root. */
    @SuppressWarnings("unchecked")
    static Comparator<CrossHierarchyEdge> crossHierarchyComparator(LGraph root) {
        try {
            Constructor<?> c = Class.forName("org.eclipse.elk.alg.layered.compound.CrossHierarchyEdgeComparator").getDeclaredConstructor(LGraph.class);
            c.setAccessible(true);
            return (Comparator<CrossHierarchyEdge>) c.newInstance(root);
        } catch (ReflectiveOperationException e) {
            throw new Bug("cannot create the CrossHierarchyEdgeComparator: " + e);
        }
    }

    static List<Object> pair(KVector v) {
        return List.of(hex(v.x), hex(v.y));
    }

    static List<Object> quad(double top, double right, double bottom, double left) {
        return List.of(hex(top), hex(right), hex(bottom), hex(left));
    }

    static List<Object> margin(ElkMargin m) {
        return quad(m.top, m.right, m.bottom, m.left);
    }

    static Map<String, Object> single(String key, Object value) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(key, value);
        return m;
    }
    // C4 value encoding (MetaDataVectors' table) extended with element references

    static final class Encoder {
        final Map<Object, String> paths;
        final boolean elkIds, strict;
        Encoder(Map<Object, String> paths, boolean elkIds, boolean strict) {
            this.paths = paths;
            this.elkIds = elkIds;
            this.strict = strict;
        }
        Object encode(Object v, int depth) {
            if (v == null) {
                return null;
            }
            if (depth > MAX_DEPTH) {
                return unencodable(v);
            }
            if (v instanceof LGraphElement e) {
                String p = paths.get(e);
                return p == null ? unencodable(v) : single("ref", p);
            }
            if (v instanceof ElkGraphElement e) {
                return single("elk", elkIds ? e.getIdentifier() : null);
            }
            if (v instanceof Boolean) {
                return scalar("bool", v);
            } else if (v instanceof Integer) {
                return scalar("int", v);
            } else if (v instanceof String) {
                return scalar("string", v);
            } else if (v instanceof Double || v instanceof Float) {
                return scalar("double", Double.toString(((Number) v).doubleValue()));
            }
            return composite(v, depth);
        }
        private Object composite(Object v, int depth) {
            if (v instanceof Enum<?> e) {
                Map<String, Object> m = tagged("enum", typeName(e.getDeclaringClass()));
                m.put("n", e.name());
                return m;
            } else if (v instanceof EnumSet<?> s) {
                Map<String, Object> m = tagged("set", typeName(enumSetElementClass(s)));
                m.put("items", names(s));
                return m;
            } else if (v instanceof Collection<?> c) {
                return collection(c, depth);
            } else if (v instanceof Class<?> k) {
                return tagged("class", k.getSimpleName());
            }
            return object(v, depth);
        }
        private Object collection(Collection<?> c, int depth) {
            boolean refs = !c.isEmpty()
                    && c.stream().allMatch(x -> x instanceof LGraphElement || x instanceof ElkGraphElement);
            boolean list = c instanceof List;
            if (refs || (c.isEmpty() && !list)) {
                List<Object> items = new ArrayList<>();
                c.forEach(i -> items.add(encode(i, depth + 1)));
                if (!list) {
                    items.sort(Comparator.comparing(LayeredCompoundVectors::json));
                }
                return items;
            }
            if (list) {
                Map<String, Object> m = tagged("list", c.getClass().getSimpleName());
                List<Object> items = new ArrayList<>();
                c.forEach(i -> items.add(encode(i, depth + 1)));
                m.put("items", items);
                return m;
            }
            return unencodable(c);
        }
        private Object object(Object v, int depth) {
            Class<?> k = v.getClass();
            if (k.isAnonymousClass() || k.isArray() || v instanceof Number || v instanceof Map || v instanceof Set
                    || v instanceof Character || (!strict && !k.getName().startsWith("org.eclipse.elk."))) {
                return unencodable(v);
            }
            Map<String, Object> m = tagged("obj", k.getSimpleName());
            Map<String, Object> fields = new LinkedHashMap<>();
            try {
                LinkedList<Class<?>> chain = new LinkedList<>();
                for (Class<?> c = k; c != null && c != Object.class; c = c.getSuperclass()) {
                    chain.addFirst(c);
                }
                for (Class<?> c : chain) {
                    for (Field f : c.getDeclaredFields()) {
                        if (!Modifier.isStatic(f.getModifiers()) && !f.isSynthetic()) {
                            f.setAccessible(true);
                            fields.put(f.getName(), encode(f.get(v), depth + 1));
                        }
                    }
                }
            } catch (ReflectiveOperationException | RuntimeException e) {
                if (strict) {
                    throw new IllegalStateException("unencodable value of class " + k.getName(), e);
                }
                return unencodable(v);
            }
            m.put("fields", fields);
            return m;
        }
        private Object unencodable(Object v) {
            if (strict) {
                throw new IllegalStateException("unencodable value of class " + v.getClass().getName());
            }
            return single("class", v.getClass().getName());
        }
    }

    static List<Object> names(Collection<? extends Enum<?>> values) {
        List<Object> result = new ArrayList<>();
        for (Enum<?> e : values) {
            result.add(e.name());
        }
        return result;
    }

    static Map<String, Object> scalar(String type, Object value) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", type);
        m.put("v", value);
        return m;
    }

    static Map<String, Object> tagged(String type, String className) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", type);
        m.put("c", className);
        return m;
    }

    static String typeName(Class<?> k) {
        return k.getEnclosingClass() == null ? k.getSimpleName() : typeName(k.getEnclosingClass()) + "." + k.getSimpleName();
    }

    // An empty EnumSet cannot name its element class; its complement is the full set, which can.
    static Class<?> enumSetElementClass(EnumSet<?> s) {
        EnumSet<?> source = s.isEmpty() ? EnumSet.complementOf(s) : s;
        return source.iterator().next().getDeclaringClass();
    }
    // Steps

    // Properties and C4 decoding

    static final Map<String, IProperty<?>> BY_ID = new TreeMap<>();
    static final Map<String, IProperty<?>> BY_NAME = new TreeMap<>();
    static final String[] OPTION_PACKAGES = {"org.eclipse.elk.alg.layered.options.", "org.eclipse.elk.core.options.",
            "org.eclipse.elk.alg.layered.components."}; // the last one: ComponentOrderingStrategy

    static void discoverProperties() throws ReflectiveOperationException {
        for (Class<?> k : List.of(LayeredOptions.class, CoreOptions.class, InternalProperties.class, LabelManagementOptions.class)) {
            for (Field f : k.getFields()) {
                if (Modifier.isStatic(f.getModifiers()) && IProperty.class.isAssignableFrom(f.getType())) {
                    IProperty<?> p = (IProperty<?>) f.get(null);
                    BY_ID.putIfAbsent(p.getId(), p);
                    BY_NAME.putIfAbsent(f.getName(), p);
                }
            }
        }
    }

    static IProperty<?> propertyById(String id) {
        IProperty<?> p = BY_ID.get(id);
        if (p == null) {
            throw new Bug("unknown property id " + id);
        }
        return p;
    }

    /** The id of the property declared under the Java constant name (LayeredOptions, CoreOptions, InternalProperties). */
    static String pid(String constant) {
        IProperty<?> p = BY_NAME.get(constant);
        if (p == null) {
            throw new Bug("unknown property constant " + constant);
        }
        return p.getId();
    }

    static Map<String, Object> tv(String t, Object v) {
        return scalar(t, v);
    }

    static Map<String, Object> Z(boolean b) {
        return tv("bool", b);
    }

    static Map<String, Object> E(String type, Enum<?> value) {
        Map<String, Object> m = tagged("enum", type);
        m.put("n", value.name());
        return m;
    }

    static Map<String, Object> E(String type, String name) {
        Map<String, Object> m = tagged("enum", type);
        m.put("n", name);
        return m;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static Object decode(Object c4) {
        if (c4 instanceof List<?> l) { return l.stream().map(LayeredCompoundVectors::decode).toList(); } // T11: a list value (the in-layer successor constraints)
        if (c4 instanceof Map<?, ?> r && r.containsKey("ref")) { return CURRENT.element((String) r.get("ref")); } // T11: {ref} = the LGraph element at that path
        if (!(c4 instanceof Map<?, ?> m)) {
            throw new Bug("cannot decode C4 value " + c4);
        }
        String t = (String) m.get("t");
        Object v = m.get("v");
        switch (t) {
            case "bool": return (Boolean) v;
            case "int": return ((Number) v).intValue();
            case "string": return (String) v;
            case "double": return parseDoubleArg("property value", (String) v);
            case "enum": for (String pkg : OPTION_PACKAGES) {
                    try {
                        return Enum.valueOf((Class<? extends Enum>) Class.forName(pkg + m.get("c")), (String) m.get("n"));
                    } catch (ClassNotFoundException e) {
                        // try the next package
                    }
                }
                throw new Bug("unknown enum type " + m.get("c"));
            default: throw new Bug("unsupported C4 type " + t);
        }
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static void setProperty(Object holder, String id, Object c4) {
        IProperty p = propertyById(id);
        Object value = c4 == null ? null : decode(c4); // a null C4 value removes the property (setProperty(prop, null))
        if (holder instanceof LGraphElement e) {
            e.setProperty(p, value);
        } else if (holder instanceof ElkGraphElement e) {
            e.setProperty(p, value);
        } else {
            throw new Bug("not a property holder: " + holder);
        }
    }

    /** Gson tree to plain Java: objects LinkedHashMap, arrays ArrayList, whole numbers Integer. */
    static Object fromJson(JsonElement e) {
        if (e.isJsonNull()) {
            return null;
        } else if (e.isJsonObject()) {
            Map<String, Object> m = new LinkedHashMap<>();
            for (Map.Entry<String, JsonElement> en : e.getAsJsonObject().entrySet()) {
                m.put(en.getKey(), fromJson(en.getValue()));
            }
            return m;
        } else if (e.isJsonArray()) {
            List<Object> l = new ArrayList<>();
            for (JsonElement x : e.getAsJsonArray()) {
                l.add(fromJson(x));
            }
            return l;
        }
        JsonPrimitive p = e.getAsJsonPrimitive();
        if (p.isBoolean()) {
            return p.getAsBoolean();
        } else if (p.isNumber()) {
            return p.getAsInt();
        }
        return p.getAsString();
    }

    // Inputs

    static Path REPO;

    static String sha256(Path p) throws IOException {
        try {
            StringBuilder sb = new StringBuilder();
            for (byte b : MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(p))) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String pinnedSha(String rel) {
        for (String line : MODEL_TABLE.split("\n")) {
            String l = line.strip();
            if (l.endsWith("  " + REPO_PREFIX + rel)) {
                return l.substring(0, l.indexOf("  "));
            }
        }
        throw new Bug("input " + rel + " is not in MODEL_TABLE");
    }

    /** The vendored file at repo-relative path rel, after checking it against MODEL_TABLE. */
    static ElkNode loadFile(String rel) {
        try {
            Path p = REPO.resolve(rel);
            if (!pinnedSha(rel).equals(sha256(p))) {
                throw new Bug("input " + rel + " does not match its pinned SHA-256");
            }
            if (rel.endsWith(".json")) {
                return ElkGraphJson.forGraph(Files.readString(p, StandardCharsets.UTF_8)).toElk();
            }
            Resource r = new ResourceSetImpl().getResource(URI.createFileURI(p.toAbsolutePath().toString()), true);
            if (!r.getErrors().isEmpty() || r.getContents().isEmpty() || !(r.getContents().get(0) instanceof ElkNode)) {
                throw new Bug("cannot load " + p + ": " + r.getErrors());
            }
            ElkNode g = (ElkNode) r.getContents().get(0);
            dropUnresolvedOptions(g);
            return g;
        } catch (IOException e) {
            throw new Bug("cannot read " + rel + ": " + e);
        }
    }

    /** Options no registered provider knows stay lazy proxies; they are dropped, as the JSON export omits them. */
    static void dropUnresolvedOptions(ElkNode g) {
        List<ElkGraphElement> elements = new ArrayList<>();
        elements.add(g);
        for (TreeIterator<EObject> it = g.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkGraphElement e) {
                elements.add(e);
            }
        }
        for (ElkGraphElement e : elements) {
            List<IProperty<?>> unresolved = new ArrayList<>();
            for (Map.Entry<IProperty<?>, Object> entry : e.getProperties()) {
                if (entry.getValue() != null && entry.getValue().getClass().getSimpleName().equals("LayoutOptionProxy")) {
                    unresolved.add(entry.getKey());
                }
            }
            unresolved.forEach(key -> e.getProperties().removeKey(key));
        }
    }

    static ElkNode importTarget(ElkNode root, String target) {
        if (target == null) {
            return root;
        }
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && target.equals(n.getIdentifier())) {
                return n;
            }
        }
        throw new Bug("import target " + target + " not found");
    }

    static String export(ElkNode root) {
        return strictNumbers(ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false)
                .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false).toJson());
    }

    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");

    /** Gson's lenient writer emits non-finite doubles as bare tokens, which is not JSON. In number-token positions (after ':', ',' or '[',
     * outside strings) Infinity, -Infinity and NaN become the strings "Infinity", "-Infinity" and "NaN". */
    static String strictNumbers(String json) {
        StringBuilder out = new StringBuilder(json.length() + 16);
        boolean inString = false;
        for (int i = 0; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (inString) {
                out.append(ch);
                if (ch == '\\') {
                    out.append(json.charAt(++i));
                } else if (ch == '"') {
                    inString = false;
                }
            } else if (ch == '"') {
                inString = true;
                out.append(ch);
            } else if (ch == ':' || ch == ',' || ch == '[') {
                out.append(ch);
                int j = i + 1;
                while (j < json.length() && Character.isWhitespace(json.charAt(j))) {
                    out.append(json.charAt(j++));
                }
                i = j - 1;
                for (String t : NON_FINITE) {
                    if (json.startsWith(t, j) && !Character.isLetterOrDigit(json.charAt(j + t.length()))) {
                        out.append('"').append(t).append('"');
                        i = j + t.length() - 1;
                        break;
                    }
                }
            } else {
                out.append(ch);
            }
        }
        return out.toString();
    }

    /** The written file must be strict JSON (Gson JsonReader in its default non-lenient mode) with nothing after it. */
    static void strictParse(Path file) throws IOException {
        try (java.io.Reader in = Files.newBufferedReader(file, StandardCharsets.UTF_8);
                com.google.gson.stream.JsonReader reader = new com.google.gson.stream.JsonReader(in)) {
            reader.skipValue();
            if (reader.peek() != com.google.gson.stream.JsonToken.END_DOCUMENT) {
                throw new IllegalStateException(file + " has content after the top-level JSON value");
            }
        }
    }

    // Baseline and phase dump (B2)

    /** The imported LGraph, its fixed positional paths and the property baseline of "changed". */
    static final class Base {
        final LGraph graph;
        final Map<Object, String> paths;
        final List<LNode> nodes;
        final List<LPort> ports = new ArrayList<>();
        final List<LEdge> edges;
        final Map<String, LGraphElement> byPath = new HashMap<>();
        final Map<Object, Map<String, String>> props = new IdentityHashMap<>();
        /** N3: the stop of the row (a processor member or phase) and whether a baseline node was ever flexible. */
        String stop = "";
        boolean flexible;
        /** N3 presence rule: NodeFlexibility.getNodeFlexibility(n) != NONE (sticky: the repeater resets the options). */
        void noteFlexible() {
            for (LNode n : nodes) {
                if (n.getGraph() != null) {
                    NodeFlexibility nf = NodeFlexibility.getNodeFlexibility(n);
                    flexible |= nf != null && nf != NodeFlexibility.NONE;
                }
            }
        }
        Base(LGraph g) {
            graph = g;
            Dump d = new Dump(g, true);
            if (d.graphs.size() != 1) {
                throw new Bug("rows import flat graphs only; found " + d.graphs.size() + " graphs");
            }
            paths = d.paths;
            nodes = new ArrayList<>(d.nodeLists.get(g));
            edges = new ArrayList<>(d.edgeLists.get(g));
            nodes.forEach(n -> ports.addAll(n.getPorts()));
            byPath.put(paths.get(g), g);
            nodes.forEach(n -> byPath.put(paths.get(n), n));
            ports.forEach(p -> byPath.put(paths.get(p), p));
            edges.forEach(e -> byPath.put(paths.get(e), e));
            snapshot();
        }
        List<LGraphElement> elements() {
            List<LGraphElement> all = new ArrayList<>();
            all.add(graph);
            all.addAll(nodes);
            all.addAll(ports);
            all.addAll(edges);
            all.addAll(labels());
            return all;
        }
        List<LLabel> labels() { return paths.keySet().stream().filter(o -> o instanceof LLabel).map(o -> (LLabel) o).sorted(Comparator.comparing(paths::get)).toList(); } // T11: "changed" lists labels too (by path)
        /** Records the C4 value of every property of every baseline element (ignored ids left out). */
        void snapshot() {
            props.clear();
            Encoder enc = new Encoder(paths, true, false);
            for (LGraphElement e : elements()) {
                Map<String, String> m = new TreeMap<>();
                encodeProps(e, enc).forEach((k, v) -> m.put(k, json(v)));
                props.put(e, m);
            }
        }
        LGraphElement element(String path) {
            LGraphElement e = byPath.get(path);
            if (e == null) {
                throw new Bug("no baseline element at path " + path);
            }
            return e;
        }
    }

    static Map<String, Object> encodeProps(LGraphElement e, Encoder enc) {
        Map<String, Object> m = new TreeMap<>();
        for (Map.Entry<IProperty<?>, Object> entry : e.getAllProperties().entrySet()) {
            String id = entry.getKey().getId();
            if (!IGNORED_IDS.contains(id)) {
                m.put(id, enc.encode(entry.getValue(), 0));
            }
        }
        return m;
    }

    static String pathOf(Map<Object, String> paths, Object o) {
        String p = paths.get(o);
        if (p == null) {
            throw new Bug("element without a path: " + o);
        }
        return p;
    }

    static Map<String, Object> phaseDump(Base b) {
        LGraph g = b.graph;
        Dump cur = new Dump(g, true);
        Map<Object, String> paths = new IdentityHashMap<>(b.paths);
        List<LNode> nodes = new ArrayList<>(cur.nodeLists.get(g));
        Set<Object> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        seen.addAll(nodes);
        b.nodes.stream().filter(seen::add).forEach(nodes::add);
        int newNodes = 0, newPorts = 0, newEdges = 0;
        for (LNode n : nodes) {
            if (!paths.containsKey(n)) {
                paths.put(n, "new/n" + newNodes++);
            }
        }
        List<LPort> ports = new ArrayList<>();
        seen.clear();
        for (LNode n : nodes) {
            for (LPort p : n.getPorts()) {
                ports.add(p);
                seen.add(p);
                if (!paths.containsKey(p)) {
                    paths.put(p, "new/p" + newPorts++);
                }
            }
        }
        b.ports.stream().filter(seen::add).forEach(ports::add);
        List<LEdge> edges = new ArrayList<>(cur.edgeLists.get(g));
        seen.clear();
        seen.addAll(edges);
        b.edges.stream().filter(seen::add).forEach(edges::add);
        for (LNode n : nodes) {
            for (LPort p : n.getPorts()) {
                for (List<LEdge> list : List.of(p.getOutgoingEdges(), p.getIncomingEdges())) {
                    list.stream().filter(seen::add).forEach(edges::add);
                }
            }
        }
        for (LEdge e : edges) {
            if (!paths.containsKey(e)) {
                paths.put(e, "new/e" + newEdges++);
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        List<Object> layers = new ArrayList<>();
        for (Layer layer : g.getLayers()) {
            List<Object> inLayer = new ArrayList<>();
            layer.getNodes().forEach(n -> inLayer.add(pathOf(paths, n)));
            layers.add(inLayer);
        }
        m.put("layers", layers);
        List<Object> layerless = new ArrayList<>();
        g.getLayerlessNodes().forEach(n -> layerless.add(pathOf(paths, n)));
        m.put("layerless", layerless);
        List<Object> hidden = new ArrayList<>();
        if (g.hasProperty(InternalProperties.HIDDEN_NODES)) {
            g.getProperty(InternalProperties.HIDDEN_NODES).forEach(n -> hidden.add(pathOf(paths, n)));
        }
        m.put("hidden", hidden);
        List<Object> edgeRows = new ArrayList<>();
        for (LEdge e : edges) {
            Map<String, Object> em = new LinkedHashMap<>();
            em.put("path", pathOf(paths, e));
            em.put("src", e.getSource() == null ? null : pathOf(paths, e.getSource()));
            em.put("tgt", e.getTarget() == null ? null : pathOf(paths, e.getTarget()));
            em.put("reversed", e.getProperty(InternalProperties.REVERSED));
            edgeRows.add(em);
        }
        m.put("edges", edgeRows);
        Map<String, Object> portMap = new LinkedHashMap<>();
        for (LNode n : nodes) {
            List<Object> portPaths = new ArrayList<>();
            n.getPorts().forEach(p -> portPaths.add(pathOf(paths, p)));
            portMap.put(pathOf(paths, n), portPaths);
        }
        m.put("ports", portMap);
        m.put("changed", changed(b, paths, nodes, ports, edges));
        m.put("geometry", geometry(b, paths, nodes, ports, edges));
        return m;
    }

    static List<Object> pathList(Map<Object, String> paths, Collection<? extends Object> elements) {
        List<Object> l = new ArrayList<>();
        elements.forEach(e -> l.add(pathOf(paths, e)));
        return l;
    }

    /** N3 + R3: node geometry for every node of the traversal, the layer sizes, (presence rule) port and label positions, on every row the
     * graph size and offset and the bend and junction points of every edge, and on a P5 SPLINES stop the spline routes. */
    static Map<String, Object> geometry(Base b, Map<Object, String> paths, List<LNode> nodes, List<LPort> ports, List<LEdge> edges) {
        Map<String, Object> geo = new LinkedHashMap<>();
        Map<String, Object> nodeMap = new LinkedHashMap<>();
        for (LNode n : nodes) {
            Map<String, Object> nm = new LinkedHashMap<>();
            nm.put("pos", pair(n.getPosition()));
            nm.put("size", pair(n.getSize()));
            nm.put("margin", margin(n.getMargin()));
            nodeMap.put(pathOf(paths, n), nm);
        }
        geo.put("nodes", nodeMap);
        List<Object> layerSizes = new ArrayList<>();
        for (Layer layer : b.graph.getLayers()) {
            layerSizes.add(pair(layer.getSize()));
        }
        geo.put("layers", layerSizes);
        if (b.flexible || PORT_LABEL_STOPS.contains(b.stop)) {
            Map<String, Object> portMap = new LinkedHashMap<>();
            ports.forEach(p -> portMap.put(pathOf(paths, p), single("pos", pair(p.getPosition()))));
            geo.put("ports", portMap);
            Map<String, Object> labelMap = new LinkedHashMap<>();
            b.labels().forEach(l -> labelMap.put(pathOf(paths, l), single("pos", pair(l.getPosition()))));
            geo.put("labels", labelMap);
        }
        if (SEVEN_F2.contains(b.stop)) { // G2: the sizes a label manager or the switcher may change
            Map<String, Object> sizes = new LinkedHashMap<>();
            b.labels().forEach(l -> sizes.put(pathOf(paths, l), pair(l.getSize())));
            geo.put("labelSizes", sizes);
        }
        Map<String, Object> graphMap = new LinkedHashMap<>();
        graphMap.put("size", pair(b.graph.getSize()));
        graphMap.put("offset", pair(b.graph.getOffset()));
        geo.put("graph", graphMap);
        Map<String, Object> edgeMap = new LinkedHashMap<>();
        for (LEdge e : edges) {
            Map<String, Object> em = new LinkedHashMap<>();
            List<Object> bends = new ArrayList<>();
            e.getBendPoints().forEach(p -> bends.add(pair(p)));
            em.put("bendPoints", bends);
            if (e.hasProperty(LayeredOptions.JUNCTION_POINTS)) {
                List<Object> junctions = new ArrayList<>();
                e.getProperty(LayeredOptions.JUNCTION_POINTS).forEach(p -> junctions.add(pair(p)));
                em.put("junctionPoints", junctions);
            }
            edgeMap.put(pathOf(paths, e), em);
        }
        geo.put("edges", edgeMap);
        if ((b.stop.equals("P5") || b.stop.equals(P5)) && b.graph.getProperty(LayeredOptions.EDGE_ROUTING) == EdgeRouting.SPLINES) {
            geo.put("splines", splines(paths, edges));
        }
        return geo;
    }

    /** R3: the chain and the route (SplineSegment fields, public) of every edge that starts a spline. */
    static Map<String, Object> splines(Map<Object, String> paths, List<LEdge> edges) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (LEdge e : edges) {
            if (!e.hasProperty(InternalProperties.SPLINE_ROUTE_START)) {
                continue;
            }
            List<Object> chain = new ArrayList<>();
            e.getProperty(InternalProperties.SPLINE_EDGE_CHAIN).forEach(c -> chain.add(pathOf(paths, c)));
            List<Object> route = new ArrayList<>();
            for (SplineSegment s : e.getProperty(InternalProperties.SPLINE_ROUTE_START)) {
                Map<String, Object> sm = new LinkedHashMap<>();
                ElkRectangle box = s.boundingBox;
                sm.put("box", List.of(hex(box.x), hex(box.y), hex(box.width), hex(box.height)));
                sm.put("rank", s.rank);
                sm.put("isStraight", s.isStraight);
                sm.put("xDelta", hex(s.xDelta));
                sm.put("westOfInitialLayer", s.isWestOfInitialLayer);
                sm.put("centerControlPointY", hex(s.centerControlPointY));
                route.add(sm);
            }
            Map<String, Object> spline = new LinkedHashMap<>();
            spline.put("chain", chain);
            spline.put("route", route);
            result.put(pathOf(paths, e), spline);
        }
        return result;
    }

    static List<Object> changed(Base b, Map<Object, String> paths, List<LNode> nodes, List<LPort> ports, List<LEdge> edges) {
        List<LGraphElement> elements = new ArrayList<>();
        elements.add(b.graph);
        elements.addAll(nodes);
        elements.addAll(ports);
        elements.addAll(edges);
        elements.addAll(b.labels());
        Encoder enc = new Encoder(paths, true, false);
        List<Object> changed = new ArrayList<>();
        for (LGraphElement e : elements) {
            Map<String, Object> now = encodeProps(e, enc);
            Map<String, String> before = b.props.getOrDefault(e, Map.of());
            Map<String, Object> diff = new TreeMap<>();
            now.forEach((k, v) -> {
                if (!json(v).equals(before.get(k))) {
                    diff.put(k, v);
                }
            });
            before.keySet().stream().filter(k -> !now.containsKey(k)).forEach(k -> diff.put(k, null));
            if (!diff.isEmpty()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("path", pathOf(paths, e));
                row.put("props", diff);
                changed.add(row);
            }
        }
        return changed;
    }

    // Step interpreter

    static final Set<String> RAN = new TreeSet<>();
    static final boolean TRACE = System.getenv("PHASE_TRACE") != null; // diagnosis aid: one stderr line per row

    static void normalise(LGraph g) {
        if (g.getProperty(LayeredOptions.RANDOM_SEED) == 0) {
            throw new Bug("random seed 0 (stop condition): the Random would be unseeded");
        }
        try {
            Class<?> k = Class.forName("org.eclipse.elk.alg.layered.GraphConfigurator");
            Constructor<?> c = k.getDeclaredConstructor();
            c.setAccessible(true);
            Method m = k.getDeclaredMethod("configureGraphProperties", LGraph.class);
            m.setAccessible(true);
            m.invoke(c.newInstance(), g);
        } catch (InvocationTargetException e) {
            throw new Bug("configureGraphProperties threw " + e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new Bug("cannot call GraphConfigurator: " + e);
        }
    }

    /**
     * The expected of the terminal step "layout": phaseDump(base) of the imported (untouched) LGraph and the export (as CaseRunner.java:87-92)
     * of the ELK node after new LayeredLayoutProvider().layout(<the imported ELK node>, monitor) as "layout".
     */
    static Map<String, Object> terminalDump(Base base, LGraph graph) {
        ElkNode node = (ElkNode) graph.getProperty(InternalProperties.ORIGIN);
        new LayeredLayoutProvider().layout(node, new BasicProgressMonitor());
        Map<String, Object> expected = phaseDump(base);
        expected.put("layout", new Raw(export(node)));
        return expected;
    }

    record Result(Map<String, Object> expected, List<Object> prefix) { }

    @SuppressWarnings("unchecked")
    static Base CURRENT; // the Base of the step row being run (decode resolves {ref} paths against it)

    static Base need(Base base) {
        if (base == null) {
            throw new IllegalStateException("step ran before importGraph created the Base");
        }
        return base;
    }

    static double parseDoubleArg(String what, String s) {
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(what + " is not a number: " + s, e);
        }
    }

    static long parseLongArg(String what, String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(what + " is not an integer: " + s, e);
        }
    }

    static void requirePairs(int length) {
        if (length % 2 != 0) {
            throw new IllegalArgumentException("key/value arguments come in pairs, got " + length);
        }
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> runSteps(ElkNode root, List<Object> steps) {
        LGraph graph = null;
        Base base = null;
        Map<String, Object> expected = null;
        for (int i = 0; i < steps.size(); i++) {
            List<Object> s = (List<Object>) steps.get(i);
            String op = (String) s.get(0);
            if (expected != null) {
                throw new Bug("step after dump: " + op);
            }
            if (!op.equals("importGraph") && graph == null) {
                throw new Bug("step " + op + " before importGraph");
            }
            switch (op) {
                case "importGraph" -> {
                    graph = new ElkGraphTransformer().importGraph(importTarget(root, (String) s.get(1)));
                    base = CURRENT = new Base(graph);
                }
                case "normalise" -> {
                    normalise(graph);
                    need(base).snapshot();
                }
                case "setProperty" -> setProperty(need(base).element((String) s.get(1)), (String) s.get(2), s.get(3));
                case "runProcessor" -> {
                    runProcessor(graph, (String) s.get(1));
                    need(base).stop = (String) s.get(1);
                }
                case "runPhase" -> {
                    runPhase(graph, (String) s.get(1), (String) s.get(2));
                    need(base).stop = (String) s.get(1);
                }
                case "layout" -> {
                    if (i != steps.size() - 1) {
                        throw new Bug(op + " ends the row");
                    }
                    expected = terminalDump(base, graph);
                }
                case "dump" -> {
                    expected = phaseDump(base);
                    if (need(base).nodes.size() < FULL_DUMP_BELOW) {
                        expected.put("dump", new Dump(graph, true).dump());
                    }
                }
                default -> throw new Bug("unknown op " + op);
            }
            if (base != null && expected == null) {
                base.noteFlexible();
            }
        }
        if (expected == null) {
            throw new Bug("steps have no dump");
        }
        return expected;
    }

    static void runProcessor(LGraph g, String member) {
        if (!allowed(member)) {
            throw new Bug("processor " + member + " is outside the ported sets");
        }
        var processor = IntermediateProcessorStrategy.valueOf(member).create();
        processor.process(g, new BasicProgressMonitor());
        RAN.add(member);
    }

    /** BFSNodeOrderCycleBreaker.java:105-115: layerless nodes without incoming edges; > 10 breaks insertion order. */
    static void guardBfsSources(LGraph g) {
        int sources = 0;
        for (LNode n : g.getLayerlessNodes()) {
            if (!n.getIncomingEdges().iterator().hasNext()) {
                sources++;
            }
        }
        maxBfsSources = Math.max(maxBfsSources, sources);
        if (sources > MAX_HASH_ORDER_SOURCES) {
            throw new Refusal("row " + currentRow + ": BFS_NODE_ORDER has " + sources + " sources (> "
                    + MAX_HASH_ORDER_SOURCES + ": HashSet insertion order is lost under -XX:hashCode=2)",
                    "BFS_NODE_ORDER_SOURCES");
        }
    }

    static void runPhase(LGraph g, String phase, String strategy) {
        if (phase.equals("P1_CYCLE_BREAKING") && strategy.equals("BFS_NODE_ORDER")) {
            guardBfsSources(g);
        }
        switch (phase) {
            case "P1_CYCLE_BREAKING" -> CycleBreakingStrategy.valueOf(strategy).create().process(g, new BasicProgressMonitor());
            case "P2_LAYERING" -> LayeringStrategy.valueOf(strategy).create().process(g, new BasicProgressMonitor());
            case "P3_NODE_ORDERING" -> CrossingMinimizationStrategy.valueOf(strategy).create().process(g, new BasicProgressMonitor());
            case "P4_NODE_PLACEMENT" -> NodePlacementStrategy.valueOf(strategy).create().process(g, new BasicProgressMonitor());
            case P5 -> EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create().process(g, new BasicProgressMonitor());
            default -> throw new Bug("unknown phase " + phase);
        }
        RAN.add(phase + "/" + strategy);
    }

    // Pipeline rows (B1)

    static final Map<Class<?>, List<String>> PROCESSOR_NAMES = new HashMap<>();

    static void buildProcessorNames() {
        PROCESSOR_NAMES.clear();
        for (IntermediateProcessorStrategy s : IntermediateProcessorStrategy.values()) {
            if (s == IntermediateProcessorStrategy.ONE_SIDED_GREEDY_SWITCH
                    || s == IntermediateProcessorStrategy.TWO_SIDED_GREEDY_SWITCH) {
                continue; // LayerSweepCrossingMinimizer instances: named by nameOf through their CrossMinType
            }
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(s.name());
        }
        for (CycleBreakingStrategy s : CycleBreakingStrategy.values()) {
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(P1 + "/" + s.name());
        }
        for (LayeringStrategy s : LayeringStrategy.values()) {
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(P2 + "/" + s.name());
        }
        for (CrossingMinimizationStrategy s : CrossingMinimizationStrategy.values()) {
            if (s == CrossingMinimizationStrategy.INTERACTIVE || s == CrossingMinimizationStrategy.NONE) {
                PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(P3 + "/" + s.name());
            }
        }
        for (NodePlacementStrategy s : NodePlacementStrategy.values()) {
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(P4 + "/" + s.name());
        }
        for (EdgeRouting r : ROUTINGS) {
            PROCESSOR_NAMES.computeIfAbsent(EdgeRouterFactory.factoryFor(r).create().getClass(), k -> new ArrayList<>())
                    .add(P5 + "/" + r.name());
        }
    }

    /** The CrossMinType of a LayerSweepCrossingMinimizer (private field, read by reflection). */
    static LayerSweepCrossingMinimizer.CrossMinType crossMinType(LayerSweepCrossingMinimizer s) {
        try {
            Field f = LayerSweepCrossingMinimizer.class.getDeclaredField("crossMinType");
            f.setAccessible(true);
            return (LayerSweepCrossingMinimizer.CrossMinType) f.get(s);
        } catch (ReflectiveOperationException e) {
            throw new Bug("cannot read LayerSweepCrossingMinimizer.crossMinType: " + e);
        }
    }

    /** The recorded name of a processor of the assembled algorithm: an IntermediateProcessorStrategy member, or "P<n>_<PHASE>/<STRATEGY>". The two
     * greedy switch arms and the LAYER_SWEEP / MEDIAN_LAYER_SWEEP phases are all LayerSweepCrossingMinimizer instances
     * (IntermediateProcessorStrategy.java:316-317, :361-362, CrossingMinimizationStrategy.java:67-71) told apart by their CrossMinType. */
    static String nameOf(Object processor) {
        if (processor instanceof LayerSweepCrossingMinimizer s) {
            return switch (crossMinType(s)) {
                case BARYCENTER -> P3 + "/LAYER_SWEEP";
                case MEDIAN -> P3 + "/MEDIAN_LAYER_SWEEP";
                case ONE_SIDED_GREEDY_SWITCH -> "ONE_SIDED_GREEDY_SWITCH";
                case TWO_SIDED_GREEDY_SWITCH -> "TWO_SIDED_GREEDY_SWITCH";
            };
        }
        if (processor instanceof LabelManagementProcessor p) {
            return centerLabels(p) ? "CENTER_LABEL_MANAGEMENT_PROCESSOR" : "END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR";
        }
        List<String> names = PROCESSOR_NAMES.get(processor.getClass());
        if (names == null && COMPOUND_PROCESSORS.contains(processor.getClass().getSimpleName())) {
            return processor.getClass().getSimpleName(); // not enum members: ElkLayered constructs them and doCompoundLayout notifies them
        }
        if (names == null) {
            return "UNNAMED/" + processor.getClass().getName(); // a P4/P5 phase or a later processor: never allowed
        }
        if (names.equals(List.of("DIRECTION_PREPROCESSOR", "DIRECTION_POSTPROCESSOR"))) {
            return names.get(0); // GraphTransformer: a stop never reaches the post-processor, the last processor of the plan
        }
        if (names.size() != 1) {
            throw new Bug("row " + currentRow + ": processor class " + processor.getClass().getName() + " has names "
                    + names);
        }
        return names.get(0);
    }

    /** The center flag of a LabelManagementProcessor (private field, read by reflection): the two IntermediateProcessorStrategy arms. */
    static boolean centerLabels(LabelManagementProcessor p) {
        try {
            Field f = LabelManagementProcessor.class.getDeclaredField("centerLabels");
            f.setAccessible(true);
            return f.getBoolean(p);
        } catch (ReflectiveOperationException e) {
            throw new Bug("cannot read LabelManagementProcessor.centerLabels: " + e);
        }
    }

    /** The names of a plan, GraphTransformer by position (F4: DIRECTION_PREPROCESSOR first, DIRECTION_POSTPROCESSOR last). */
    static List<String> positionalNames(List<? extends Object> plan) {
        List<String> names = new ArrayList<>();
        int transformers = 0;
        for (Object p : plan) {
            String n = nameOf(p);
            if (n.equals("DIRECTION_PREPROCESSOR") && transformers++ > 0) {
                n = "DIRECTION_POSTPROCESSOR";
            }
            names.add(n);
        }
        return names;
    }

    static boolean allowed(String name) {
        return SEVEN_B.contains(name) || SEVEN_C.contains(name) || SEVEN_D.contains(name) || SEVEN_E.contains(name) || SEVEN_F.contains(name)
                || SEVEN_F2.contains(name) || SEVEN_G.contains(name) || SEVEN_H.contains(name) || COMPOUND_PROCESSORS.contains(name) || name.startsWith(P1 + "/") || name.startsWith(P2 + "/") || name.startsWith(P3 + "/")
                || name.startsWith(P4 + "/") || name.startsWith(P5 + "/");
    }

    /** The name of the processor a row stops after: "P1", "P2", "P3" (the configured phase) or a processor member. */
    static String stopName(String stop, LGraph g) {
        return switch (stop) {
            case "P1" -> P1 + "/" + g.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY).name();
            case "P2" -> P2 + "/" + g.getProperty(LayeredOptions.LAYERING_STRATEGY).name();
            case "P3" -> P3 + "/" + g.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY).name();
            case "P4" -> P4 + "/" + g.getProperty(LayeredOptions.NODE_PLACEMENT_STRATEGY).name();
            case "P5" -> P5 + "/" + g.getProperty(LayeredOptions.EDGE_ROUTING).name();
            default -> IntermediateProcessorStrategy.valueOf(stop).name();
        };
    }

    // Rows

    /** One row to record: a vendored input (path) or a prepared one (prepare); pipeline (stop) or step row (steps). */
    record Spec(String id, String group, String path, Supplier<ElkNode> prepare, String target,
            TreeMap<String, Object> options, String stop, List<Object> steps, String mode) { }

    record Row(String id, String group, String json) { }

    static final long ROW_TIMEOUT_SECONDS = 60;

    /** Runs the row in a daemon thread: an oracle loop that never ends stops the recording naming the row. */
    static Result execute(Spec s, ElkNode root, List<Object> parsedSteps) {
        java.util.concurrent.FutureTask<Result> task = new java.util.concurrent.FutureTask<>(() ->
                switch (s.group) {
                    case "full" -> runFull(s, root);
                    case "models" -> runModels(s, root);
                    case "scenarios" -> s.steps == null ? runScenario(s, root) : new Result(runSteps(root, parsedSteps), null);
                    case "sites" -> runSite(s, root);
                    default -> new Result(runSteps(root, parsedSteps), null);
                });
        currentRow = s.id;
        Thread t = new Thread(task, "row");
        t.setDaemon(true);
        t.start();
        try {
            return task.get(ROW_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            throw new Bug("row " + s.id + " does not finish within " + ROW_TIMEOUT_SECONDS + " s");
        } catch (java.util.concurrent.ExecutionException e) {
            if (e.getCause() instanceof RuntimeException r) {
                throw r;
            }
            throw new IllegalStateException("row " + s.id, e.getCause());
        } catch (InterruptedException e) {
            throw new IllegalStateException(e);
        }
    }

    @SuppressWarnings("unchecked")
    static List<Row> buildRows(Spec s) {
        String stepsJson = s.steps == null ? null : json(s.steps);
        List<Object> parsed = stepsJson == null ? null : (List<Object>) fromJson(JsonParser.parseString(stepsJson));
        Supplier<ElkNode> load = s.path != null ? () -> loadFile(s.path) : s.prepare;
        String inputElk = null;
        Result first;
        Result second;
        if (s.path == null) {
            // Prepared inputs are recorded as the ELK JSON export they are replayed from: both runs start from a
            // fresh import of it (an .elkt edge has no id until the export gives it one, and ORIGIN would differ).
            inputElk = export(load.get());
            first = execute(s, ElkGraphJson.forGraph(inputElk).toElk(), parsed);
            second = execute(s, ElkGraphJson.forGraph(inputElk).toElk(), parsed);
        } else {
            first = execute(s, load.get(), parsed);
            second = execute(s, load.get(), parsed);
        }
        String a = json(first.expected) + json(first.prefix), b = json(second.expected) + json(second.prefix);
        if (!a.equals(b)) {
            throw new IllegalStateException("row " + s.id + " differs on re-import\n" + clip(a, b) + "\n" + clip(b, a));
        }
        Map<String, Object> input = new LinkedHashMap<>();
        if (s.path != null) {
            input.put("path", s.path);
            input.put("sha256", pinnedSha(s.path));
        } else {
            input.put("elk", new Raw(inputElk));
        }
        if (s.group.equals("models")) {
            return stopRows(s, first, input);
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", s.id);
        row.put("group", s.group);
        row.put("input", input);
        row.put("target", s.target);
        row.put("options", s.options);
        row.put("steps", stepsJson == null ? null : new Raw(stepsJson));
        row.put("prefix", first.prefix);
        row.put("expected", first.expected);
        return List.of(new Row(s.id, s.group, json(row)));
    }

    static String clip(String s, String other) {
        int d = 0;
        while (d < s.length() && d < other.length() && s.charAt(d) == other.charAt(d)) {
            d++;
        }
        return "(at " + d + ") " + s.substring(Math.max(0, d - 200), Math.min(s.length(), d + 300));
    }

    static TreeMap<String, Object> opts(Object... kv) {
        TreeMap<String, Object> m = new TreeMap<>();
        m.put(pid("SEPARATE_CONNECTED_COMPONENTS"), Z(false));
        requirePairs(kv.length);
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(pid((String) kv[i]), kv[i + 1]);
        }
        return m;
    }

    static Map<String, Object> D(double d) {
        return tv("double", Double.toString(d));
    }

    static String levelName(String target) {
        return target == null ? "root" : target;
    }

    static Spec pipeline(ModelFile f, String target, String stop, String variant, TreeMap<String, Object> options) {
        return new Spec("models/" + f.id + "/" + levelName(target) + "/" + stop + "/" + variant, "models", f.rel, null, target, options, stop, null, null);
    }

    static List<Object> S(Object... a) {
        return new ArrayList<>(Arrays.asList(a));
    }

    @SafeVarargs
    static List<Object> steps(List<Object>... s) {
        return new ArrayList<>(Arrays.asList(s));
    }

    static List<Object> imp(String target) {
        return S("importGraph", target);
    }

    static List<Object> norm() {
        return S("normalise");
    }

    static List<Object> dump() {
        return S("dump");
    }

    static List<Object> set(String path, String constant, Object c4) {
        return S("setProperty", path, pid(constant), c4);
    }

    static List<Object> phase(String phase, String strategy) {
        return S("runPhase", phase, strategy);
    }

    static List<Object> proc(String member) {
        return S("runProcessor", member);
    }

    /** Root layout options as JSON members: constant name, value string, ... */
    static String ropts(String... kv) {
        StringBuilder sb = new StringBuilder();
        requirePairs(kv.length);
        for (int i = 0; i + 1 < kv.length; i += 2) {
            sb.append(sb.length() == 0 ? "" : ",").append('"').append(pid(kv[i])).append("\":\"").append(kv[i + 1]).append('"');
        }
        return sb.toString();
    }

    static String nodeJson(String id, double[] pos, String optsJson, String extra) {
        return "{\"id\":\"" + id + "\",\"width\":30,\"height\":30"
                + (pos == null ? "" : ",\"x\":" + pos[0] + ",\"y\":" + pos[1])
                + (optsJson == null || optsJson.isEmpty() ? "" : ",\"layoutOptions\":{" + optsJson + "}")
                + (extra == null ? "" : "," + extra) + "}";
    }

    static String edgesJson(String idPrefix, int[][] edges) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < edges.length; i++) {
            sb.append(i == 0 ? "" : ",").append("{\"id\":\"").append(idPrefix).append(i).append("\",\"sources\":[\"n")
                    .append(edges[i][0]).append("\"],\"targets\":[\"n").append(edges[i][1]).append("\"]}");
        }
        return sb.toString();
    }

    /** A flat graph: root options, n nodes n0.., optional positions, edges e0.. between n<a> and n<b>. */
    static String gj(String rootOpts, int n, double[][] pos, int[][] edges, Map<Integer, String> nodeOpts) {
        StringBuilder sb = new StringBuilder("{\"id\":\"root\",\"layoutOptions\":{" + rootOpts + "},\"children\":[");
        for (int i = 0; i < n; i++) {
            sb.append(i == 0 ? "" : ",").append(nodeJson("n" + i, pos == null ? null : pos[i], nodeOpts == null ? null : nodeOpts.get(i), null));
        }
        return sb.append("],\"edges\":[").append(edgesJson("e", edges)).append("]}").toString();
    }


    // Builders copied from LayeredRoutingVectors.java (7e lines 1,860-1,912 and 2,164-2,181)

    /** Edges e0..: "a>b" or "a>b:CONSTANT=value" (one option). */
    static String eds(String... spec) {
        return edsFrom(0, spec);
    }

    /** Like eds with edge ids e<first>, e<first+1>, ... */
    static String edsFrom(int first, String... spec) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < spec.length; i++) {
            String[] opt = spec[i].split(":"), end = opt[0].split(">");
            out.add("{\"id\":\"e" + (first + i) + "\",\"sources\":[\"" + end[0] + "\"],\"targets\":[\"" + end[1] + "\"]"
                    + (opt.length > 1 ? ",\"layoutOptions\":{" + ropts(opt[1].split("=")) + "}" : "") + "}");
        }
        return String.join(",", out);
    }

    static String flat(String rootOpts, String kids, String edges) {
        return "{\"id\":\"root\",\"layoutOptions\":{" + rootOpts + "},\"children\":[" + kids + "],\"edges\":[" + edges + "]}";
    }

    static String pj(String node, int index, String side, double[] xy) {
        return "{\"id\":\"" + node + ".p" + index + "\",\"width\":4,\"height\":4"
                + (xy == null ? "" : ",\"x\":" + xy[0] + ",\"y\":" + xy[1]) + ",\"layoutOptions\":{"
                + (side == null ? "" : "\"" + pid("PORT_SIDE") + "\":\"" + side + "\",") + "\"" + pid("PORT_INDEX") + "\":\""
                + index + "\"}}";
    }

    /** A node with ports of the given sides (ids <id>.p0, <id>.p1, ...); pc and pos may be null. */
    static String pnode(String id, String pc, double[] pos, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj(id, i, sides[i], null));
        }
        return nodeJson(id, pos, pc == null ? null : ropts("PORT_CONSTRAINTS", pc), "\"ports\":[" + String.join(",", ports) + "]");
    }

    static String plain(String id) {
        return nodeJson(id, null, null, null);
    }

    static String at(String id, double x, double y) {
        return nodeJson(id, new double[] {x, y}, null, null);
    }

    static String join(String... parts) {
        return String.join(",", parts);
    }

    static final String FS = "FIXED_SIDE", FP = "FIXED_POS", E_ = "EAST", W_ = "WEST", N_ = "NORTH", S_ = "SOUTH";

    static String kn(String id, int w, int h, String extra, String... opts) {
        return sz(nodeJson(id, null, opts.length == 0 ? null : ropts(opts), extra), w, h);
    }

    static String sz(String node, int w, int h) {
        return node.replace("\"width\":30,\"height\":30", "\"width\":" + w + ",\"height\":" + h);
    }


    // Group full (F4): the whole recursive layout and the plan of every level

    /** The level path of an ELK node: the ids from the root down joined by "/", a missing id as the empty string. */
    static String levelPath(ElkNode n) {
        LinkedList<String> ids = new LinkedList<>();
        for (ElkNode c = n; c != null; c = c.getParent()) {
            ids.addFirst(c.getIdentifier() == null ? "" : c.getIdentifier());
        }
        return String.join("/", ids);
    }

    /** Records the processors ElkLayered runs on every level (the first component graph of the level), in order. */
    static final class PlanRecorder implements TestController.ILayoutExecutionListener {
        final Map<ElkNode, List<Object>> processors = new LinkedHashMap<>();
        final Map<ElkNode, LGraph> first = new IdentityHashMap<>();

        @Override
        public void layoutProcessorReady(ILayoutProcessor<?> processor, Object graph, boolean isRoot) {
            LGraph g = (LGraph) graph;
            if (!(g.getProperty(InternalProperties.ORIGIN) instanceof ElkNode level)) {
                throw new Bug("row " + currentRow + ": a laid-out graph without an ElkNode origin");
            }
            LGraph owner = first.computeIfAbsent(level, k -> g);
            if (owner == g) {
                processors.computeIfAbsent(level, k -> new ArrayList<>()).add(processor);
            }
        }

        @Override
        public void layoutProcessorFinished(ILayoutProcessor<?> processor, Object graph, boolean isRoot) {
            // nothing to record
        }

        /** level path -> positional member names (F4), in layout order. */
        Map<String, Object> plans() {
            Map<String, Object> plans = new LinkedHashMap<>();
            for (Map.Entry<ElkNode, List<Object>> e : processors.entrySet()) {
                if (plans.put(levelPath(e.getKey()), new ArrayList<Object>(positionalNames(e.getValue()))) != null) {
                    throw new Bug("row " + currentRow + ": level path " + levelPath(e.getKey()) + " is not unique");
                }
            }
            return plans;
        }
    }

    /** Options of a full row: pairs of (Java constant name, C4 value); no default is added (components stay on). */
    static TreeMap<String, Object> fopts(Object... kv) {
        TreeMap<String, Object> m = new TreeMap<>();
        requirePairs(kv.length);
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(pid((String) kv[i]), kv[i + 1]);
        }
        return m;
    }

    // Model files: the table is the list (every entry is a label- or comment-bearing model of the labels family)

    /** rel = repo-relative path of the vendored file; model = its path in the models repository (after inputs/ and labels/). */
    record ModelFile(String id, String rel, String model) { }

    /** The id of a model: tests/layered/<dir>/<name>.elkt -> "<dir>-<name>", tickets -> "ticket-<name>", examples -> "examples-<dir>-<name>". */
    static String modelId(String model) {
        String id;
        if (model.startsWith("tests/layered/")) {
            id = model.substring("tests/layered/".length());
        } else if (model.startsWith("tickets/layered/")) {
            id = "ticket-" + model.substring("tickets/layered/".length());
        } else if (model.startsWith("examples/")) {
            id = model;
        } else if (model.startsWith("realworld/ptolemy/")) { // ptolemy-<last token of the file name, lower case>, as the pipeline recorder
            String name = model.substring(model.lastIndexOf('/') + 1).replaceAll("\\.json$", "");
            return "ptolemy-" + name.substring(name.lastIndexOf('_') + 1).toLowerCase();
        } else {
            throw new Bug("model " + model + " is outside tests/layered, tickets/layered, examples and realworld/ptolemy");
        }
        return id.replace('/', '-').replaceAll("\\.elkt$", "");
    }

    static List<ModelFile> modelFiles() {
        List<ModelFile> files = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (String line : MODEL_TABLE.split("\n")) {
            String l = line.strip();
            if (l.isEmpty()) {
                continue;
            }
            String rel = l.substring(l.indexOf(REPO_PREFIX) + REPO_PREFIX.length());
            String model = rel.substring(INPUTS.length());
            for (String root : INPUT_ROOTS) {
                if (model.startsWith(root)) {
                    model = model.substring(root.length());
                    break;
                }
            }
            ModelFile f = new ModelFile(modelId(model), rel, model);
            if (!ids.add(f.id)) {
                throw new Bug("two models have the id " + f.id);
            }
            files.add(f);
        }
        return files;
    }

    static ModelFile model(List<ModelFile> files, String id) {
        return files.stream().filter(f -> f.id.equals(id)).findFirst().orElseThrow(() -> new Bug("no model with the id " + id));
    }

    // ELK JSON builders of this brief: labels and comment boxes

    static String lab(String text, int w, int h, String placement) {
        return "{\"text\":\"" + text + "\",\"width\":" + w + ",\"height\":" + h
                + (placement == null ? "" : ",\"layoutOptions\":{\"" + pid("EDGE_LABELS_PLACEMENT") + "\":\"" + placement + "\"}") + "}";
    }

    static String labels(String... labels) {
        return "\"labels\":[" + String.join(",", labels) + "]";
    }

    static String edl(String id, String src, String tgt, String... labels) {
        return "{\"id\":\"" + id + "\",\"sources\":[\"" + src + "\"],\"targets\":[\"" + tgt + "\"]"
                + (labels.length == 0 ? "" : "," + labels(labels)) + "}";
    }

    /** A port (see pj) with a label of the given width. */
    static String pjl(String node, int index, String side, int labelWidth) {
        return pj(node, index, side, null).replace("\"height\":4", "\"height\":4," + labels(lab("p" + index, labelWidth, 8, null)));
    }

    /** A node with ports of the given sides and a label per port; pc may be null. */
    static String lnode(String id, String pc, int labelWidth, String extra, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pjl(id, i, sides[i], labelWidth));
        }
        return nodeJson(id, null, pc == null ? null : ropts("PORT_CONSTRAINTS", pc),
                "\"ports\":[" + String.join(",", ports) + "]" + (extra == null ? "" : "," + extra));
    }

    static String comment(String id, int w, int h, String extra) {
        return kn(id, w, h, extra, "COMMENT_BOX", "true");
    }

    static Spec full(String family, String model, String variant, String path, String elk, TreeMap<String, Object> options) {
        return new Spec("full/" + family + "/" + model + "/" + variant, "full", path,
                path == null ? () -> ElkGraphJson.forGraph(elk).toElk() : null, null, options, null, null, null);
    }

    /** A model whose levels below the root have children of their own needs its options on every such level: the options are then
     * baked into the inline input (the precedent: 7f2's padding-0 issue row); a flat model takes them on its root. */
    static boolean hierarchical(ElkNode root) {
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                return true;
            }
        }
        return false;
    }

    static String withLevelOptions(String rel, TreeMap<String, Object> options) {
        ElkNode g = loadFile(rel);
        List<ElkNode> levels = new ArrayList<>();
        levels.add(g);
        for (TreeIterator<EObject> it = g.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                levels.add(n);
            }
        }
        for (ElkNode n : levels) {
            options.forEach((id, c4) -> setProperty(n, id, c4));
        }
        return export(g);
    }

    /** A full row over a vendored model; options reach every level of a hierarchical model through its inline input. */
    static Spec fullOn(String family, ModelFile f, String variant, TreeMap<String, Object> options) {
        if (hierarchical(loadFile(f.rel))) {
            return full(family, f.id, variant, null, withLevelOptions(f.rel, options), fopts());
        }
        return full(family, f.id, variant, f.rel, null, options);
    }

    static String fileText(Map<String, Integer> counts, List<Row> rows) {
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ");
        str(out, System.getProperty("java.version"));
        out.append(",\n  \"oracle\": \"").append(elkCommit()).append("\",\n  \"rowCounts\": {");
        int k = 0;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            out.append(k++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        out.append("},\n  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            out.append("    ").append(rows.get(i).json).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        return out.append("  ]\n}\n").toString();
    }

    /** Every IntermediateProcessorStrategy member is in exactly one of the ported sets (7h makes the sets cover the whole enum). */
    static void checkClassification() {
        for (IntermediateProcessorStrategy m : IntermediateProcessorStrategy.values()) {
            int sets = (SEVEN_B.contains(m.name()) ? 1 : 0) + (SEVEN_C.contains(m.name()) ? 1 : 0) + (SEVEN_D.contains(m.name()) ? 1 : 0)
                    + (SEVEN_E.contains(m.name()) ? 1 : 0) + (SEVEN_F.contains(m.name()) ? 1 : 0) + (SEVEN_F2.contains(m.name()) ? 1 : 0)
                    + (SEVEN_G.contains(m.name()) ? 1 : 0) + (SEVEN_H.contains(m.name()) ? 1 : 0);
            if (sets != 1) {
                throw new Bug("IntermediateProcessorStrategy." + m.name() + " is in " + sets + " of the ported sets");
            }
        }
    }

    static final Map<String, Long> BYTES = new TreeMap<>();
    /** Rows whose oracle run throws inside ELK (reported on stderr with the exception and its top frame, never recorded). */
    static final List<String> ORACLE_THROWS = new ArrayList<>();

    /** The first org.eclipse.elk frame of an exception thrown while ELK code runs (before any frame of this program), or null. */
    static StackTraceElement elkFrame(RuntimeException e) {
        if (e instanceof Bug) {
            return null;
        }
        for (StackTraceElement f : e.getStackTrace()) {
            if (f.getClassName().startsWith("LayeredCompoundVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    // Group full and the compound groups: one engine run per row

    /** Listens for the hierarchical stops of one engine run (H2) and dumps the whole LGraph tree at each. See the header, "Group models". */
    static final class StopRecorder implements TestController.ILayoutExecutionListener {
        final List<Map<String, Object>> stops = new ArrayList<>();

        @Override
        public void layoutProcessorReady(ILayoutProcessor<?> processor, Object graph, boolean isRoot) {
            // a stop is the state AFTER a processor
        }

        @Override
        public void layoutProcessorFinished(ILayoutProcessor<?> processor, Object graph, boolean isRoot) {
            String name = stopProcessor(processor, isRoot);
            if (name == null) {
                return;
            }
            LGraph g = (LGraph) graph;
            LGraph root = g;
            while (root.getParentNode() != null) {
                root = root.getParentNode().getGraph();
            }
            Map<String, Object> stop = new LinkedHashMap<>();
            stop.put("index", stops.size());
            stop.put("levelPath", levelPathOf(g));
            stop.put("processor", name);
            stop.put("className", processor.getClass().getSimpleName());
            Map<String, Object> expected = new LinkedHashMap<>();
            expected.put("stop", stop);
            expected.put("tree", new Dump(root, true, true).treeDump());
            stops.add(expected);
        }
    }

    /** The recorded name of the processor of a stop (see the header), or null when a notification is no stop. */
    static String stopProcessor(ILayoutProcessor<?> processor, boolean isRoot) {
        String simple = processor.getClass().getSimpleName();
        if (COMPOUND_PROCESSORS.contains(simple)) {
            return simple; // constructed by ElkLayered itself, notified on the root graph by doCompoundLayout
        }
        if (processor instanceof IHierarchyAwareLayoutProcessor && isRoot) {
            return nameOf(processor); // skipped (and not notified) on a nested graph until the root has run it
        }
        if (processor instanceof HierarchicalNodeResizingProcessor) {
            return nameOf(processor);
        }
        return null;
    }

    /** One recursive layout of root with the plans of every level recorded (as 7f's runFull); the whole plan decides the refusal (G2). */
    static Map<String, Object> layoutOnce(Spec s, ElkNode root, IElkProgressMonitor monitor, TestController.ILayoutExecutionListener... extra) {
        PlanRecorder recorder = new PlanRecorder();
        TestController controller = new TestController(LayeredOptions.ALGORITHM_ID);
        controller.addLayoutExecutionListener(recorder);
        for (TestController.ILayoutExecutionListener l : extra) {
            controller.addLayoutExecutionListener(l);
        }
        var pool = LayoutMetaDataService.getInstance().getAlgorithmData(LayeredOptions.ALGORITHM_ID).getInstancePool();
        AbstractLayoutProvider provider = pool.fetch();
        controller.install(provider);
        pool.release(provider);
        try {
            new RecursiveGraphLayoutEngine().layout(root, monitor);
        } finally {
            controller.uninstall();
        }
        Map<String, Object> plans = recorder.plans();
        for (Map.Entry<String, Object> e : plans.entrySet()) {
            for (Object name : (List<?>) e.getValue()) {
                if (!allowed((String) name)) {
                    throw new Refusal("row " + s.id + ": level " + e.getKey() + " names " + name + ", outside the ported sets", (String) name);
                }
            }
        }
        return plans;
    }

    /** A random seed of 0 would make the layout unrepeatable (stop condition). */
    static void checkSeeds(ElkNode root) {
        List<ElkNode> nodes = new ArrayList<>();
        nodes.add(root);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n) {
                nodes.add(n);
            }
        }
        for (ElkNode n : nodes) {
            if (!n.getChildren().isEmpty() && Integer.valueOf(0).equals(n.getProperty(LayeredOptions.RANDOM_SEED))) {
                throw new Bug("row " + currentRow + ": random seed 0 (stop condition) at " + levelPath(n));
            }
        }
    }

    /** A full row: options on the root, the recursive engine, the export and the plan of every level. */
    static Result runFull(Spec s, ElkNode root) {
        currentRow = s.id;
        s.options.forEach((id, c4) -> setProperty(root, id, c4));
        checkSeeds(root);
        Map<String, Object> plans = layoutOnce(s, root, new BasicProgressMonitor());
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("layout", new Raw(export(root)));
        expected.put("plans", plans);
        return new Result(expected, null);
    }

    /** A models run: the whole engine run with the stops recorded; the result holds every stop's expected under "stops". */
    static Result runModels(Spec s, ElkNode root) {
        currentRow = s.id;
        s.options.forEach((id, c4) -> setProperty(root, id, c4));
        checkSeeds(root);
        StopRecorder recorder = new StopRecorder();
        layoutOnce(s, root, new BasicProgressMonitor(), recorder);
        if (recorder.stops.isEmpty()) {
            throw new Bug("row " + s.id + ": the run made no compound layout (no hierarchical stop)");
        }
        return new Result(single("stops", recorder.stops), null);
    }

    /** A scenario run: as a full row, plus the number of stops and the tree dump at the last stop (after the CompoundGraphPostprocessor). */
    static Result runScenario(Spec s, ElkNode root) {
        currentRow = s.id;
        s.options.forEach((id, c4) -> setProperty(root, id, c4));
        checkSeeds(root);
        StopRecorder recorder = new StopRecorder();
        Map<String, Object> plans = layoutOnce(s, root, new BasicProgressMonitor(), recorder);
        if (recorder.stops.isEmpty()) {
            throw new Bug("row " + s.id + ": the run made no compound layout (no hierarchical stop)");
        }
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("layout", new Raw(export(root)));
        expected.put("plans", plans);
        expected.put("stops", recorder.stops.size());
        expected.put("tree", recorder.stops.get(recorder.stops.size() - 1).get("tree"));
        return new Result(expected, null);
    }

    // Models that are out of scope: a hierarchy that names an algorithm the recorder classpath does not register (elk.stress, H13)

    static int outOfScope = 0;

    static List<ElkNode> allNodes(ElkNode root) {
        List<ElkNode> nodes = new ArrayList<>();
        nodes.add(root);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n) {
                nodes.add(n);
            }
        }
        return nodes;
    }

    static boolean usesUnregisteredAlgorithm(ElkNode root) {
        for (ElkNode n : allNodes(root)) {
            String algorithm = n.hasProperty(CoreOptions.ALGORITHM) ? n.getProperty(CoreOptions.ALGORITHM) : null;
            if (algorithm != null && LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(algorithm) == null) {
                return true;
            }
        }
        return false;
    }

    /** True when the vendored model is recordable; otherwise it is counted as out of scope (stderr) and every row of it is skipped. */
    static boolean inScope(ModelFile f) {
        if (usesUnregisteredAlgorithm(loadFile(f.rel))) {
            outOfScope++;
            System.err.println("out of scope (algorithm) model: " + f.model);
            return false;
        }
        return true;
    }

    /** Stderr-only audit (COMPOUND_MODELS_DIR, set by the script when the models repository is present): every file of tests/layered,
     * tickets/layered and examples that sets INCLUDE_CHILDREN is either vendored (in MODEL_TABLE) or out of scope; any other is a Bug. */
    static void auditModelsDir() throws IOException {
        String dir = System.getenv("COMPOUND_MODELS_DIR");
        if (dir == null) {
            System.err.println("audit: COMPOUND_MODELS_DIR is not set, the include-children inputs were not compared with the models repository");
            return;
        }
        Path models = Path.of(dir);
        Set<String> vendored = new HashSet<>();
        modelFiles().forEach(f -> vendored.add(f.model));
        int stress = 0, covered = 0;
        for (String d : List.of("tests/layered", "tickets/layered", "examples")) {
            try (Stream<Path> walk = Files.walk(models.resolve(d))) {
                for (Path p : walk.filter(Files::isRegularFile).filter(f -> f.toString().endsWith(".elkt") || f.toString().endsWith(".json")).sorted().toList()) {
                    if (!Files.readString(p, StandardCharsets.UTF_8).contains("INCLUDE_CHILDREN")) {
                        continue;
                    }
                    String rel = models.relativize(p).toString();
                    if (vendored.contains(rel)) {
                        covered++;
                    } else if (usesUnregisteredAlgorithm(loadAny(p))) {
                        stress++;
                        System.err.println("out of scope (algorithm) model: " + rel);
                    } else {
                        throw new Bug("INCLUDE_CHILDREN input " + rel + " is neither vendored nor out of scope");
                    }
                }
            }
        }
        System.err.println("audit: " + covered + " vendored INCLUDE_CHILDREN inputs, " + stress + " out of scope");
        System.err.println("out of scope (algorithm): " + (outOfScope + stress));
    }

    // Group full: the families of this brief

    static final List<String> ALL_DIRECTIONS = List.of("RIGHT", "LEFT", "DOWN", "UP");
    static final List<String> ROUTINGS_ALL = List.of("ORTHOGONAL", "POLYLINE", "SPLINES");
    static final String INCLUDE_CHILDREN = "INCLUDE_CHILDREN";

    static Map<String, Object> direction(String d) {
        return E("Direction", d);
    }

    static Map<String, Object> routing(String r) {
        return E("EdgeRouting", r);
    }

    static final Map<String, Object> HANDLING_INCLUDE = E("HierarchyHandling", INCLUDE_CHILDREN);

    /** Issue316Test, 455, 552, 596, 628 (four @Configurators), 700, 701, 734 (665 and the stress inputs of 700: H13) and EdgeCoordsTest. */
    static final List<String> ISSUE_MODELS = List.of("ticket-316_wrongGraphSizeWithIncludeChildren", "ticket-316_wrongGraphSizeWithIncludeChildren2",
            "ticket-455_longHierarchicalEdges", "ticket-455_shortHierarchicalEdges", "ticket-552_hierarchySelfLoopPorts",
            "ticket-596_outsideHierarchicalPortLabels", "ticket-628_hierarchyAwareLayoutProcessor", "ticket-700_brokenHierarchyHandling",
            "examples-hierarchy-hierarchicalEdges", "ticket-701_portLabels", "ticket-734_nodeEdgeSpacingFlat",
            "ticket-734_nodeEdgeSpacingFlatMoreComplex", "ticket-734_nodeEdgeSpacingHierarchical");

    /** JG/EdgeCoordsTest.xtend: the graph of the test, verbatim (the shapeCoords and edgeCoords options only change the JSON import and export). */
    static final String EDGE_COORDS_GRAPH = """
{"id":"root","properties":{"algorithm":"layered","org.eclipse.elk.hierarchyHandling":"INCLUDE_CHILDREN"},"children":[
{"id":"A","children":[{"id":"x","width":50,"height":90},{"id":"B","labels":[{"text":"B","width":10,"height":12}],
"ports":[{"id":"p","width":10,"height":10,"labels":[{"text":"p","width":10,"height":12}]}],
"children":[{"id":"y","width":50,"height":90},{"id":"z","width":50,"height":90}],
"edges":[{"id":"e1","sources":["y"],"targets":["z"]},{"id":"e2","sources":["x"],"targets":["z"],"labels":[{"text":"e2","width":20,"height":12}]},
{"id":"e3","sources":["x"],"targets":["p"]},{"id":"e4","sources":["p"],"targets":["y"]}]}]}]}""";

    static void issueSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : ISSUE_MODELS) {
            ModelFile f = model(files, id);
            if (!inScope(f)) {
                continue;
            }
            if (id.startsWith("ticket-628")) { // Issue628Test: the four @Configurators on the root; null removes the property
                String hier = "CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE", flat = "CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE";
                Map<String, Object> two = E("GreedySwitchType", "TWO_SIDED");
                out.add(full("issues", id, "hierarchical-two-sided", f.rel, null, fopts(hier, two)));
                out.add(full("issues", id, "hierarchical-unset", f.rel, null, fopts(hier, null)));
                out.add(full("issues", id, "switch-two-sided", f.rel, null, fopts(flat, two)));
                out.add(full("issues", id, "switch-unset", f.rel, null, fopts(flat, null)));
            } else {
                out.add(full("issues", id, "default", f.rel, null, fopts()));
            }
        }
        out.add(full("issues", "edgecoords", "default", null, EDGE_COORDS_GRAPH, fopts()));
    }

    /** The inputs that set INCLUDE_CHILDREN (23 at the pin, 20 once the three elk.stress inputs are out of scope). */
    static final List<String> INCLUDE_CHILDREN_MODELS = List.of("examples-hierarchy-hierarchicalEdges", "edge_label_placement-hierarchy01",
            "edge_label_placement-hierarchy_center_edge_label_problem", "ticket-040_includeChildrenWithFixedOrder", "ticket-155_greedySwitchFails",
            "ticket-160_externalPortDummyNullPointer", "ticket-288_selfLoopsCauseNPE_a", "ticket-288_selfLoopsCauseNPE_b",
            "ticket-316_wrongGraphSizeWithIncludeChildren", "ticket-316_wrongGraphSizeWithIncludeChildren2", "ticket-352_selfLoopNPEorAIOOBE",
            "ticket-425_selfLoopInCompoundNode", "ticket-455_longHierarchicalEdges", "ticket-552_hierarchySelfLoopPorts",
            "ticket-596_outsideHierarchicalPortLabels", "ticket-628_hierarchyAwareLayoutProcessor", "ticket-700_brokenHierarchyHandling",
            "ticket-701_portLabels", "ticket-724_includeChildrenModelOrder", "ticket-734_nodeEdgeSpacingHierarchical");

    /** The model's own options ("default"), then every direction x every edge routing (no trim of the routing axis: the ref stays under 16 MiB). */
    static void includeChildrenSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : INCLUDE_CHILDREN_MODELS) {
            ModelFile f = model(files, id);
            if (!inScope(f)) {
                continue;
            }
            out.add(full("include-children", id, "default", f.rel, null, fopts()));
            for (String d : ALL_DIRECTIONS) {
                for (String r : ROUTINGS_ALL) {
                    out.add(fullOn("include-children", f, d + "-" + r, fopts("DIRECTION", direction(d), "EDGE_ROUTING", routing(r))));
                }
            }
        }
    }

    /** The four pipeline models of 7f and eight more ptolemy hierarchical models with edges that cross a hierarchy border. */
    static final List<String> PTOLEMY_MODELS = List.of("ptolemy-scrambler", "ptolemy-afdxmulticastsimple", "ptolemy-clockdrifthierarchy",
            "ptolemy-crossbarswitch", "ptolemy-actuatorpattern", "ptolemy-randomwalkintruder", "ptolemy-carwashde", "ptolemy-ifthenelsefsm",
            "ptolemy-squarewave", "ptolemy-bluetoothnodes", "ptolemy-ptidesmergetomultiframe", "ptolemy-clockdrift");

    /** INCLUDE_CHILDREN on the root (row options) and the direction on every level that has children (inline input, as the 7f2 precedent). */
    static void ptolemySpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : PTOLEMY_MODELS) {
            ModelFile f = model(files, id);
            if (!inScope(f)) {
                continue;
            }
            for (String d : ALL_DIRECTIONS) {
                String elk = withLevelOptions(f.rel, fopts("DIRECTION", direction(d)));
                out.add(full("ptolemy-include", id, d, null, elk, fopts("HIERARCHY_HANDLING", HANDLING_INCLUDE)));
            }
        }
    }

    // ELK JSON builders of the compound graphs

    /** Root options of a compound graph: INCLUDE_CHILDREN, the direction and more (constant, value) pairs. */
    static String H(String d, String... more) {
        List<String> kv = new ArrayList<>(List.of("HIERARCHY_HANDLING", INCLUDE_CHILDREN, "DIRECTION", d));
        kv.addAll(Arrays.asList(more));
        return ropts(kv.toArray(new String[0]));
    }

    /** Options of a node or an edge from (constant, value) pairs; empty when there are none. */
    static String O(String... kv) {
        return kv.length == 0 ? "" : ropts(kv);
    }

    /** A compound node: options (O), ports, children and edges (all JSON members, possibly empty). */
    static String cn(String id, String opts, String ports, String kids, String edges) {
        return "{\"id\":\"" + id + "\",\"width\":30,\"height\":30" + (opts.isEmpty() ? "" : ",\"layoutOptions\":{" + opts + "}")
                + (ports.isEmpty() ? "" : ",\"ports\":[" + ports + "]") + ",\"children\":[" + kids + "],\"edges\":[" + edges + "]}";
    }

    /** An edge with options (O) and further JSON members (labels). */
    static String ed(String id, String src, String tgt, String opts, String extra) {
        return "{\"id\":\"" + id + "\",\"sources\":[\"" + src + "\"],\"targets\":[\"" + tgt + "\"]"
                + (opts.isEmpty() ? "" : ",\"layoutOptions\":{" + opts + "}") + (extra.isEmpty() ? "" : "," + extra) + "}";
    }

    static String ed(String id, String src, String tgt) {
        return ed(id, src, tgt, "", "");
    }

    static String sizedPort(String node, int index, String side, double[] xy) {
        return pj(node, index, side, xy);
    }

    /** One compound node c{x, y; x>y} between a and b (the shape S1 of the scenarios); the root edges are given. */
    static String s1(String d, String rootEdges, String cOpts, String cPorts, String... rootMore) {
        String c = cn("c", cOpts, cPorts, join(plain("x"), plain("y")), ed("ec", "x", "y"));
        return flat(H(d, rootMore), join(plain("a"), plain("b"), c), rootEdges);
    }

    /** Two sibling compound nodes c1{x1, y1}, c2{x2, y2} (S2). */
    static String s2(String d, String rootEdges, String... rootMore) {
        String c1 = cn("c1", "", "", join(plain("x1"), plain("y1")), ed("ec1", "x1", "y1"));
        String c2 = cn("c2", "", "", join(plain("x2"), plain("y2")), ed("ec2", "x2", "y2"));
        return flat(H(d, rootMore), join(c1, c2), rootEdges);
    }

    /** Three levels: a, c1{p, c2{q, c3{z, w}}} (S3) with the edges of every level given; options on c1 and root. */
    static String s3(String d, String rootEdges, String c1Edges, String c2Edges, String c1Opts, String... rootMore) {
        String c3 = cn("c3", "", "", join(plain("z"), plain("w")), ed("ec3", "z", "w"));
        String c2 = cn("c2", "", "", join(plain("q"), c3), c2Edges);
        String c1 = cn("c1", c1Opts, "", join(plain("p"), c2), c1Edges);
        return flat(H(d, rootMore), join(plain("a"), c1), rootEdges);
    }

    static final String S3_MIXED_ROOT = join(ed("r1", "a", "z"), ed("r2", "w", "a")), S3_MIXED_C1 = join(ed("m1", "p", "w"), ed("m2", "q", "p")),
            S3_MIXED_C2 = ed("m3", "q", "z");

    static String s3Mixed(String d, String c1Opts, String... rootMore) {
        return s3(d, S3_MIXED_ROOT, S3_MIXED_C1, S3_MIXED_C2, c1Opts, rootMore);
    }

    static final String BOTH_EDGES = join(ed("e1", "a", "x"), ed("e2", "y", "b"), ed("e3", "a", "b"));

    /** The hierarchy-aware family: sweepiness, the hierarchical greedy switch, a different child strategy (throws) and mixed handling. */
    static void hierarchyAwareSpecs(List<Spec> out) {
        Map<String, java.util.function.Function<String, String>> graphs = new LinkedHashMap<>();
        graphs.put("deep3", opt -> s3Mixed("RIGHT", "", opt.isEmpty() ? new String[0] : opt.split("=")));
        graphs.put("siblings", opt -> s2("RIGHT", join(ed("e1", "y1", "x2"), ed("e2", "x1", "y2")), opt.isEmpty() ? new String[0] : opt.split("=")));
        for (Map.Entry<String, java.util.function.Function<String, String>> g : graphs.entrySet()) {
            String name = g.getKey();
            for (String sweep : List.of("-1", "0", "0.1", "1")) {
                out.add(full("hierarchy-aware", name, "sweepiness-" + sweep, null, g.getValue().apply("CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS=" + sweep), fopts()));
            }
            for (GreedySwitchType t : GreedySwitchType.values()) {
                out.add(full("hierarchy-aware", name, "greedy-hierarchical-" + t.name().toLowerCase(Locale.ROOT).replace('_', '-'), null,
                        g.getValue().apply("CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE=" + t.name()), fopts()));
            }
        }
        // a child with another crossing minimization strategy: reviewAndCorrectHierarchicalProcessors throws (an oracle throw row, not recorded)
        out.add(full("hierarchy-aware", "deep3", "child-strategy-median", null,
                s3Mixed("RIGHT", O("CROSSING_MINIMIZATION_STRATEGY", "MEDIAN_LAYER_SWEEP")), fopts()));
        // INCLUDE_CHILDREN set below the root only: the root separates its children, c1 includes its descendants (mixed handling)
        String c3 = cn("c3", "", "", join(plain("z"), plain("w")), ed("ec3", "z", "w"));
        String c2 = cn("c2", "", "", join(plain("q"), c3), join(ed("m3", "q", "z")));
        String c1 = cn("c1", O("HIERARCHY_HANDLING", INCLUDE_CHILDREN), "", join(plain("p"), c2), join(ed("m1", "p", "w"), ed("m2", "q", "p")));
        out.add(full("hierarchy-aware", "deep3", "include-below-root", null,
                flat(ropts("DIRECTION", "RIGHT"), join(plain("a"), c1), ""), fopts()));
        // the opposite: INCLUDE_CHILDREN on the root, and c1 stops the hierarchy handling with SEPARATE_CHILDREN
        String c2s = cn("c2", "", "", join(plain("q"), plain("w")), ed("m3", "q", "w"));
        String c1s = cn("c1", O("HIERARCHY_HANDLING", "SEPARATE_CHILDREN"), "", join(plain("p"), c2s), "");
        out.add(full("hierarchy-aware", "deep3", "separate-below-include", null,
                flat(H("RIGHT"), join(plain("a"), c1s), ed("r1", "a", "c1")), fopts()));
    }

    /** A compound node c with the given options and ports between a and b: a>c.p0, inside c.p0>x, x>y, y>c.p1, c.p1>b; a label on c. */
    static String resizerGraph(String d, String cOpts, String cPorts, String kids) {
        String c = cn("c", cOpts, cPorts, kids, join(ed("ec", "x", "y"), ed("ep0", "c.p0", "x"), ed("ep1", "y", "c.p1")))
                .replace("\"children\"", labels(lab("C", 24, 12, null)) + ",\"children\"");
        return flat(H(d), join(plain("a"), plain("b"), c), join(ed("e1", "a", "c.p0"), ed("e2", "c.p1", "b")));
    }

    static String resizerPorts(String side0, String side1, double[] xy0, double[] xy1) {
        return join(sizedPort("c", 0, side0, xy0), sizedPort("c", 1, side1, xy1));
    }

    /** Compound node resizing (HierarchicalNodeResizingProcessor): size constraints, minimum size, padding, fixed graph size, port constraints. */
    static void resizerSpecs(List<Spec> out) {
        String kids = join(plain("x"), plain("y"));
        String ports = resizerPorts("WEST", "EAST", null, null);
        String[] constraints = {"[]", "[PORTS]", "[NODE_LABELS]", "[PORT_LABELS]", "[MINIMUM_SIZE]", "[PORTS, NODE_LABELS, PORT_LABELS]",
            "[PORTS, NODE_LABELS, PORT_LABELS, MINIMUM_SIZE]"};
        for (String sc : constraints) {
            String variant = "constraints-" + sc.replaceAll("[\\[\\] ,]+", "-").toLowerCase(Locale.ROOT).replaceAll("^-|-$", "");
            out.add(full("resizer", "compound", variant.equals("constraints-") ? "constraints-none" : variant, null,
                    resizerGraph("RIGHT", O("NODE_SIZE_CONSTRAINTS", sc, "NODE_SIZE_MINIMUM", "(220, 160)"), ports, kids), fopts()));
        }
        out.add(full("resizer", "compound", "minimum-size-default", null, resizerGraph("RIGHT",
                O("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_OPTIONS", "[DEFAULT_MINIMUM_SIZE]"), ports, kids), fopts()));
        out.add(full("resizer", "compound", "minimum-size-down", null, resizerGraph("DOWN",
                O("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_MINIMUM", "(220, 160)"), ports, kids), fopts()));
        for (String align : List.of("[H_CENTER, V_CENTER]", "[H_RIGHT, V_BOTTOM]", "[H_LEFT, V_TOP]")) {
            out.add(full("resizer", "compound", "content-alignment-" + align.replaceAll("[\\[\\] ,]+", "-").toLowerCase(Locale.ROOT).replaceAll("^-|-$", ""), null,
                    resizerGraph("RIGHT", O("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_MINIMUM", "(220, 160)", "CONTENT_ALIGNMENT", align), ports, kids), fopts()));
        }
        for (String pad : List.of("[top=20,left=30,bottom=10,right=40]", "[top=0,left=0,bottom=0,right=0]")) {
            out.add(full("resizer", "compound", "padding-" + pad.replaceAll("[^0-9a-z]+", "-").replaceAll("^-|-$", ""), null,
                    resizerGraph("RIGHT", O("PADDING", pad), ports, kids), fopts()));
        }
        out.add(full("resizer", "compound", "fixed-graph-size", null, resizerGraph("RIGHT",
                O("NODE_SIZE_FIXED_GRAPH_SIZE", "true", "NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_MINIMUM", "(220, 160)"), ports, kids), fopts()));
        for (String pc : List.of("FREE", "FIXED_SIDE", "FIXED_ORDER", "FIXED_POS")) {
            boolean free = pc.equals("FREE"), pos = pc.equals("FIXED_POS");
            String pcPorts = resizerPorts(free ? null : "WEST", free ? null : "EAST", pos ? new double[] {0, 20} : null, pos ? new double[] {60, 30} : null);
            out.add(full("resizer", "compound", "port-constraints-" + pc.toLowerCase(Locale.ROOT).replace('_', '-'), null,
                    resizerGraph("RIGHT", O("PORT_CONSTRAINTS", pc), pcPorts, kids), fopts()));
        }
        // empty compound nodes: a compound node with a single child and no edge, and a node whose "children" array is empty (an ordinary node)
        String lone = cn("c", O("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_MINIMUM", "(220, 160)"), "", plain("x"), "");
        out.add(full("resizer", "compound", "single-child", null, flat(H("RIGHT"), join(plain("a"), lone), ed("e1", "a", "c")), fopts()));
        String bare = cn("c", O("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_MINIMUM", "(220, 160)"), "", "", "");
        out.add(full("resizer", "compound", "no-children", null, flat(H("RIGHT"), join(plain("a"), bare, cn("d", "", "", plain("x"), "")), join(ed("e1", "a", "c"), ed("e2", "c", "d"))), fopts()));
    }

    static void fullSpecs(List<Spec> out, List<ModelFile> files) {
        issueSpecs(out, files);
        includeChildrenSpecs(out, files);
        ptolemySpecs(out, files);
        hierarchyAwareSpecs(out);
        resizerSpecs(out);
    }

    // Group models: the stops of a doCompoundLayout run on a handful of small vendored models

    /** Models of the stop rows; the first two also run in direction DOWN. ptolemy-clockdrifthierarchy gets INCLUDE_CHILDREN on its root. */
    static final List<String> STOP_MODELS = List.of("ticket-455_longHierarchicalEdges", "edge_label_placement-hierarchy01",
            "ticket-552_hierarchySelfLoopPorts", "ticket-160_externalPortDummyNullPointer", "ptolemy-clockdrifthierarchy");
    static final int STOP_MODELS_WITH_DOWN = 2;

    /** A models spec: stop = the model id, mode = the variant (the row ids are built per stop in stopRows). The options of `baked` (null: none)
     * are set on every level that has children, in the inline input; `options` go on the root through the row. */
    static Spec modelSpec(ModelFile f, String variant, TreeMap<String, Object> options, TreeMap<String, Object> baked) {
        String id = "models/" + f.id + "/" + variant;
        if (baked != null) {
            return new Spec(id, "models", null, () -> ElkGraphJson.forGraph(withLevelOptions(f.rel, baked)).toElk(), null, options, f.id, null, variant);
        }
        return new Spec(id, "models", f.rel, null, null, options, f.id, null, variant);
    }

    static final String GREEDY_HIERARCHICAL = "CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE";

    static void modelSpecs(List<Spec> out, List<ModelFile> files) {
        for (int i = 0; i < STOP_MODELS.size(); i++) {
            ModelFile f = model(files, STOP_MODELS.get(i));
            if (!inScope(f)) {
                continue;
            }
            TreeMap<String, Object> own = f.id.startsWith("ptolemy-") ? fopts("HIERARCHY_HANDLING", HANDLING_INCLUDE) : fopts();
            out.add(modelSpec(f, "default", own, null));
            if (i < STOP_MODELS_WITH_DOWN) {
                out.add(modelSpec(f, "DOWN", own, fopts("DIRECTION", direction("DOWN"))));
            }
            if (i == 0) { // the hierarchical greedy switch arms (one more stop each) and the other hierarchy aware sweep
                for (String type : List.of("ONE_SIDED", "TWO_SIDED")) {
                    out.add(modelSpec(f, "greedy-hierarchical-" + type.toLowerCase(Locale.ROOT).replace('_', '-'),
                            fopts(GREEDY_HIERARCHICAL, E("GreedySwitchType", type)), null));
                }
                out.add(modelSpec(f, "median-sweep", own, fopts("CROSSING_MINIMIZATION_STRATEGY", E("CrossingMinimizationStrategy", "MEDIAN_LAYER_SWEEP"))));
            }
        }
    }

    // Group scenarios: inline compound graphs run through doCompoundLayout

    static List<Spec> SCENARIOS;

    static void scenario(String cls, String name, String dir, String elk) {
        SCENARIOS.add(new Spec("scenarios/" + cls + "/" + name + (dir == null ? "" : "/" + dir), "scenarios", null,
                () -> ElkGraphJson.forGraph(elk).toElk(), null, new TreeMap<>(), null, null, null));
    }

    static void forDirections(String cls, String name, List<String> dirs, java.util.function.Function<String, String> graph) {
        for (String d : dirs) {
            scenario(cls, name, d, graph.apply(d));
        }
    }

    static final List<String> TWO = List.of("RIGHT", "DOWN");

    /** Cross-hierarchy edges: parent to child, child to parent, between children of sibling compounds, three levels, short and long. */
    static void edgeScenarios() {
        String cls = "CompoundGraphPreprocessor";
        forDirections(cls, "parent-to-child", ALL_DIRECTIONS, d -> s1(d, ed("e1", "a", "x"), "", ""));
        forDirections(cls, "child-to-parent", ALL_DIRECTIONS, d -> s1(d, ed("e1", "y", "b"), "", ""));
        forDirections(cls, "both", ALL_DIRECTIONS, d -> s1(d, BOTH_EDGES, "", ""));
        forDirections(cls, "siblings", ALL_DIRECTIONS, d -> s2(d, join(ed("e1", "y1", "x2"), ed("e2", "x1", "y2"))));
        forDirections(cls, "siblings-reverse", TWO, d -> s2(d, join(ed("e1", "x2", "y1"), ed("e2", "y2", "x1"))));
        forDirections(cls, "deep-in-long", TWO, d -> s3(d, ed("r1", "a", "z"), "", "", ""));
        forDirections(cls, "deep-out-long", TWO, d -> s3(d, ed("r1", "w", "a"), "", "", ""));
        forDirections(cls, "deep-in-short", TWO, d -> s3(d, ed("r1", "a", "p"), ed("m2", "q", "p"), "", ""));
        forDirections(cls, "deep-mixed", ALL_DIRECTIONS, d -> s3Mixed(d, ""));
        forDirections(cls, "deep-between-levels", TWO, d -> s3(d, "", join(ed("m1", "p", "w")), join(ed("m3", "z", "q")), ""));
    }

    static String cPorts(String s0, String s1) {
        return join(pj("c", 0, s0, null), pj("c", 1, s1, null));
    }

    /** External ports of a compound node: port constraints FREE, FIXED_SIDE, FIXED_ORDER; north/south ports for the routing strategies. */
    static void portScenarios() {
        String cls = "CompoundGraphPreprocessor";
        String inEdges = join(ed("e1", "a", "c.p0"), ed("e2", "c.p1", "b"));
        for (String pc : List.of("FREE", "FIXED_SIDE", "FIXED_ORDER")) {
            boolean free = pc.equals("FREE");
            String ports = cPorts(free ? null : "WEST", free ? null : "EAST");
            forDirections(cls, "ports-" + pc.toLowerCase(Locale.ROOT).replace('_', '-'), TWO,
                    d -> flat(H(d), join(plain("a"), plain("b"), cn("c", O("PORT_CONSTRAINTS", pc), ports,
                            join(plain("x"), plain("y")), join(ed("ec", "x", "y"), ed("i0", "c.p0", "x"), ed("i1", "y", "c.p1")))), inEdges));
        }
        String ns = cPorts("NORTH", "SOUTH");
        String nsOpts = O("PORT_CONSTRAINTS", "FIXED_SIDE");
        String kids = join(plain("x"), plain("y"));
        forDirections(cls, "ns-out", TWO, d -> flat(H(d), join(plain("a"), plain("b"), cn("c", nsOpts, ns, kids,
                join(ed("i0", "x", "c.p0"), ed("i1", "y", "c.p1")))), join(ed("e1", "c.p0", "a"), ed("e2", "c.p1", "b"))));
        forDirections(cls, "ns-in", TWO, d -> flat(H(d), join(plain("a"), plain("b"), cn("c", nsOpts, ns, kids,
                join(ed("i0", "c.p0", "x"), ed("i1", "c.p1", "y")))), join(ed("e1", "a", "c.p0"), ed("e2", "b", "c.p1"))));
        java.util.function.BiFunction<String, String[], String> through = (d, more) -> flat(H(d, more), join(plain("a"), plain("b"),
                cn("c", nsOpts, ns, kids, join(ed("i0", "c.p0", "x"), ed("ec", "x", "y"), ed("i1", "y", "c.p1")))),
                join(ed("e1", "a", "c.p0"), ed("e2", "c.p1", "b")));
        forDirections(cls, "ns-through", ALL_DIRECTIONS, d -> through.apply(d, new String[0]));
        for (String r : List.of("POLYLINE", "SPLINES")) {
            forDirections(cls, "ns-through-" + r.toLowerCase(Locale.ROOT), TWO, d -> through.apply(d, new String[] {"EDGE_ROUTING", r}));
        }
    }

    static String insideLoopGraph(String d, String loopOpts, String loopExtra, String cPorts, String loopSrc, String loopTgt) {
        String c = cn("c", O("INSIDE_SELF_LOOPS_ACTIVATE", "true", "PORT_CONSTRAINTS", "FIXED_SIDE"), cPorts, join(plain("x"), plain("y")), ed("ec", "x", "y"));
        return flat(H(d), join(plain("a"), c), join(ed("e1", "a", "c"), ed("loop", loopSrc, loopTgt, loopOpts, loopExtra)));
    }

    /** Inside self loops (insideSelfLoops.activate on the compound node, .yo on the edge) and ordinary self loops on a compound node. */
    static void loopScenarios() {
        String cls = "ElkLayered";
        String yo = O("INSIDE_SELF_LOOPS_YO", "true");
        forDirections(cls, "inside-self-loop", TWO, d -> insideLoopGraph(d, yo, "", "", "c", "c"));
        forDirections(cls, "inside-self-loop-label", TWO, d -> insideLoopGraph(d, yo, labels(lab("loop", 30, 12, "CENTER")), "", "c", "c"));
        forDirections(cls, "inside-self-loop-ports", TWO, d -> insideLoopGraph(d, yo, "", cPorts("WEST", "EAST"), "c.p0", "c.p1"));
        for (String variant : List.of("plain", "label", "ports")) {
            String opts = O("PORT_CONSTRAINTS", "FIXED_SIDE");
            String extra = variant.equals("label") ? labels(lab("loop", 30, 12, "CENTER")) : "";
            String ports = variant.equals("ports") ? cPorts("EAST", "EAST") : "";
            String src = variant.equals("ports") ? "c.p0" : "c", tgt = variant.equals("ports") ? "c.p1" : "c";
            forDirections(cls, "compound-self-loop-" + variant, TWO, d -> flat(H(d), join(plain("a"), plain("b"),
                    cn("c", opts, ports, join(plain("x"), plain("y")), ed("ec", "x", "y"))),
                    join(ed("e1", "a", "c"), ed("e2", "c", "b"), ed("loop", src, tgt, "", extra))));
        }
    }

    /** Labels on hierarchical edges (moveLabelsAndRemoveOriginalEdges, copyLabelsBack), comments and edge labels inside compound nodes. */
    static void labelScenarios() {
        String cls = "CompoundGraphPostprocessor";
        String center = labels(lab("center", 40, 12, "CENTER")), head = labels(lab("head", 30, 12, "HEAD")), tail = labels(lab("tail", 30, 12, "TAIL"));
        String all = labels(lab("center", 40, 12, "CENTER"), lab("head", 30, 12, "HEAD"), lab("tail", 30, 12, "TAIL"));
        String[][] kinds = {{"center", center}, {"head", head}, {"tail", tail}, {"all", all}};
        for (String[] k : kinds) {
            forDirections(cls, "edge-labels-" + k[0], TWO, d -> s1(d, join(ed("e1", "a", "x", "", k[1]), ed("e2", "y", "b", "", k[1])), "", ""));
        }
        forDirections(cls, "edge-labels-deep", TWO, d -> s3(d, ed("r1", "a", "z", "", all), "", "", ""));
        String inner = join(plain("x"), plain("y"), comment("k", 40, 20, null));
        forDirections(cls, "comment-inside", TWO, d -> flat(H(d), join(plain("a"), cn("c", "", "", inner, join(ed("ec", "x", "y", "", center), ed("kx", "k", "x")))),
                ed("e1", "a", "x")));
        forDirections(cls, "comment-on-compound", TWO, d -> flat(H(d), join(plain("a"), comment("k", 40, 20, null),
                cn("c", "", "", join(plain("x"), plain("y")), ed("ec", "x", "y", "", center))), join(ed("e1", "a", "c"), ed("kc", "k", "c"))));
        forDirections(cls, "edge-labels-inside", TWO, d -> flat(H(d), join(plain("a"),
                cn("c", "", "", join(plain("x"), plain("y"), plain("z")), join(ed("ec", "x", "y", "", all), ed("ez", "y", "z", "", head)))), ed("e1", "a", "x")));
    }

    /** Junction points on orthogonal hyperedges that cross a compound border; POLYLINE and SPLINES with cross-hierarchy edges. */
    static void junctionAndRoutingScenarios() {
        String cls = "CompoundGraphPostprocessor";
        String kids = join(plain("x"), plain("y"));
        forDirections(cls, "junctions-out", TWO, d -> flat(H(d), join(pnode("a", "FIXED_SIDE", null, "EAST"), plain("b"),
                cn("c", "", "", kids, ed("ec", "x", "y"))), join(ed("e1", "a.p0", "x"), ed("e2", "a.p0", "y"), ed("e3", "a.p0", "b"))));
        forDirections(cls, "junctions-in", TWO, d -> flat(H(d), join(plain("a"), pnode("b", "FIXED_SIDE", null, "WEST"),
                cn("c", "", "", kids, ed("ec", "x", "y"))), join(ed("e1", "x", "b.p0"), ed("e2", "y", "b.p0"), ed("e3", "a", "b.p0"))));
        for (String r : List.of("POLYLINE", "SPLINES")) {
            String rt = r.toLowerCase(Locale.ROOT);
            forDirections(cls, "routing-" + rt + "-both", TWO, d -> s1(d, BOTH_EDGES, "", "", "EDGE_ROUTING", r));
            forDirections(cls, "routing-" + rt + "-deep", TWO, d -> s3Mixed(d, "", "EDGE_ROUTING", r));
        }
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        edgeScenarios();
        portScenarios();
        loopScenarios();
        labelScenarios();
        junctionAndRoutingScenarios();
    }

    // Group sites (T14, H2, H8, H12, F12 shape): one row per scenario of plans/layered-compound/unreached.md (see the header)

    static final String SITE_0 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"pn","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"NORTH"},"labels":[{"text":"lp","width":20,"height":10}]}],"edges":[{"id":"ei","sources":["pn"],"targets":["x"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["pn"]}]}""";
    static final String SITE_1 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"insideSelfLoops.activate":"true","portConstraints":"FIXED_SIDE"},"ports":[{"id":"p1","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}},{"id":"p2","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}},{"id":"p3","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"ei1","sources":["p1"],"targets":["x"]},{"id":"ei2","sources":["x"],"targets":["p3"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["p1"]},{"id":"e2","sources":["p2"],"targets":["b"]},{"id":"e3","sources":["p1"],"targets":["p3"],"layoutOptions":{"insideSelfLoops.yo":"true"}},{"id":"e4","sources":["p1"],"targets":["p2"]},{"id":"e5","sources":["p2"],"targets":["p3"]}]}""";
    static final String SITE_2 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"portConstraints":"FIXED_SIDE"}}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["x"],"targets":["b"]}]}""";
    static final String SITE_3 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"b1","x":0,"y":0,"width":30,"height":30},{"id":"b2","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"d","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30,"ports":[{"id":"xp","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}}]}]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["xp"],"targets":["b1"]},{"id":"e2","sources":["xp"],"targets":["b2"]}]}""";
    static final String SITE_4 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"d","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30}]}],"ports":[{"id":"cp","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}},{"id":"cq","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["x"],"targets":["cp"]},{"id":"e2","sources":["y"],"targets":["cp"]},{"id":"e3","sources":["cq"],"targets":["x"]},{"id":"e4","sources":["cq"],"targets":["y"]},{"id":"e5","sources":["a"],"targets":["cq"]}]}""";
    static final String SITE_5 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30}],"edges":[{"id":"ei","sources":["x"],"targets":["y"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN","unnecessaryBendpoints":"true"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]},{"id":"e2","sources":["y"],"targets":["b"]}]}""";
    static final String SITE_6 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30}],"edges":[{"id":"ei","sources":["x"],"targets":["y"]}]}],"layoutOptions":{"elk.direction":"DOWN","hierarchyHandling":"INCLUDE_CHILDREN","unnecessaryBendpoints":"true"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]},{"id":"e2","sources":["y"],"targets":["b"]}]}""";
    static final String SITE_7 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"nodeSize.constraints":"[PORTS]","nodeSize.options":"[DEFAULT_MINIMUM_SIZE]"}}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]}]}""";
    static final String SITE_8 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"nodeSize.constraints":"[MINIMUM_SIZE]","nodeSize.options":"[]","nodeSize.minimum":"(200, 150)"}}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]}]}""";
    static final String SITE_9 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"d","x":0,"y":0,"width":30,"height":30},{"id":"f","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30},{"id":"z","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"w1","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}},{"id":"w2","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}},{"id":"e1","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}},{"id":"e2","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"i1","sources":["w1"],"targets":["y"]},{"id":"i2","sources":["w2"],"targets":["x"]},{"id":"i3","sources":["x"],"targets":["e1"]},{"id":"i4","sources":["y"],"targets":["e2"]},{"id":"i5","sources":["x"],"targets":["z"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN","crossingMinimization.strategy":"NONE","greedySwitchHierarchical.type":"TWO_SIDED"},"edges":[{"id":"o1","sources":["a"],"targets":["w1"]},{"id":"o2","sources":["b"],"targets":["w2"]},{"id":"o3","sources":["e1"],"targets":["d"]},{"id":"o4","sources":["e2"],"targets":["f"]}]}""";
    static final String SITE_10 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"d","x":0,"y":0,"width":30,"height":30},{"id":"f","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30},{"id":"z","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"w1","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}},{"id":"w2","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}},{"id":"e1","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}},{"id":"e2","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"i1","sources":["w1"],"targets":["y"]},{"id":"i2","sources":["w2"],"targets":["x"]},{"id":"i3","sources":["x"],"targets":["e1"]},{"id":"i4","sources":["y"],"targets":["e2"]},{"id":"i5","sources":["x"],"targets":["z"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN","considerModelOrder.strategy":"NODES_AND_EDGES","considerModelOrder.crossingCounterNodeInfluence":"0.5"},"edges":[{"id":"o1","sources":["a"],"targets":["w1"]},{"id":"o2","sources":["b"],"targets":["w2"]},{"id":"o3","sources":["e1"],"targets":["d"]},{"id":"o4","sources":["e2"],"targets":["f"]}]}""";
    static final String SITE_11 = """
{"id":"root","children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c1","children":[{"id":"p","x":0,"y":0,"width":30,"height":30},{"id":"c2","children":[{"id":"q","x":0,"y":0,"width":30,"height":30},{"id":"c3","children":[{"id":"z","x":0,"y":0,"width":30,"height":30},{"id":"w","x":0,"y":0,"width":30,"height":30}],"x":0,"y":0,"width":30,"height":30,"edges":[{"id":"ec3","sources":["z"],"targets":["w"]}]}],"x":0,"y":0,"width":30,"height":30,"edges":[{"id":"m3","sources":["q"],"targets":["z"]}]}],"x":0,"y":0,"width":30,"height":30,"edges":[{"id":"m1","sources":["p"],"targets":["w"]},{"id":"m2","sources":["q"],"targets":["p"]}]}],"layoutOptions":{"elk.direction":"RIGHT","crossingMinimization.hierarchicalSweepiness":"0.1","hierarchyHandling":"INCLUDE_CHILDREN","considerModelOrder.strategy":"NODES_AND_EDGES","considerModelOrder.crossingCounterNodeInfluence":"0.5"},"x":0,"y":0,"width":0,"height":0,"edges":[{"id":"r1","sources":["a"],"targets":["z"]},{"id":"r2","sources":["w"],"targets":["a"]}]}""";
    static final String SITE_12 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"cm","x":0,"y":0,"width":30,"height":20,"layoutOptions":{"commentBox":"true"}},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"p1","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}},{"id":"pc","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"ei1","sources":["p1"],"targets":["x"]},{"id":"ei2","sources":["x"],"targets":["y"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["p1"]},{"id":"ec","sources":["cm"],"targets":["pc"]}]}""";
    static final String SITE_13 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"cm","x":0,"y":0,"width":30,"height":20,"layoutOptions":{"commentBox":"true"}},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"portConstraints":"FIXED_SIDE"},"ports":[{"id":"p1","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}},{"id":"pc","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}},{"id":"p2","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}}],"edges":[{"id":"ei1","sources":["p1"],"targets":["x"]},{"id":"ei2","sources":["x"],"targets":["y"]},{"id":"ei3","sources":["y"],"targets":["p2"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["p1"]},{"id":"ec","sources":["cm"],"targets":["pc"]},{"id":"e2","sources":["p2"],"targets":["b"]}]}""";
    static final String SITE_14 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"b","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"nodePlacement.favorStraightEdges":"false","highDegreeNodes.treatment":"true","spacing.edgeEdge":"1","nodePlacement.networkSimplex.nodeFlexibility.default":"NODE_SIZE","nodePlacement.networkSimplex.nodeFlexibility.recomputeNodePlacement":"BRANDES_KOEPF"},"edges":[{"id":"ei","sources":["x"],"targets":["y"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN","spacing.edgeEdge":"1"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]},{"id":"e2","sources":["y"],"targets":["b"]}]}""";
    static final String SITE_15 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"insideSelfLoops.activate":"true","portConstraints":"FIXED_SIDE"},"ports":[{"id":"pn","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"NORTH"}}],"edges":[{"id":"i1","sources":["pn"],"targets":["x"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["pn"]},{"id":"loop","sources":["pn"],"targets":["pn"],"layoutOptions":{"insideSelfLoops.yo":"true"}}]}""";
    static final String SITE_16 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"insideSelfLoops.activate":"true","portConstraints":"FIXED_SIDE"},"ports":[{"id":"pn","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"SOUTH"}}],"edges":[{"id":"i1","sources":["pn"],"targets":["x"]}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["pn"]},{"id":"loop","sources":["pn"],"targets":["pn"],"layoutOptions":{"insideSelfLoops.yo":"true"}}]}""";
    static final String SITE_17 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"d","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30},{"id":"y","x":0,"y":0,"width":30,"height":30}]}],"ports":[{"id":"cp","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"EAST"}},{"id":"cq","x":0,"y":0,"width":4,"height":4,"layoutOptions":{"port.side":"WEST"}}]}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["x"],"targets":["cp"]},{"id":"e2","sources":["y"],"targets":["cp"]},{"id":"e3","sources":["cq"],"targets":["x"]},{"id":"e4","sources":["cq"],"targets":["y"]},{"id":"e5","sources":["a"],"targets":["cq"]}]}""";
    static final String SITE_18 = """
{"id":"root","x":0,"y":0,"width":0,"height":0,"children":[{"id":"a","x":0,"y":0,"width":30,"height":30},{"id":"c","x":0,"y":0,"width":30,"height":30,"children":[{"id":"x","x":0,"y":0,"width":30,"height":30}],"layoutOptions":{"nodeSize.fixedGraphSize":"true","nodeSize.constraints":"[MINIMUM_SIZE]","nodeSize.minimum":"(200, 150)"}}],"layoutOptions":{"elk.direction":"RIGHT","hierarchyHandling":"INCLUDE_CHILDREN"},"edges":[{"id":"e1","sources":["a"],"targets":["x"]}]}""";

    static final String[][] SITE_ROWS = {
        {"CompoundGraphPreprocessor/portLabelNorth", "run", SITE_0},
        {"CompoundGraphPreprocessor/insideSelfLoopFlow", "run", SITE_1},
        {"CompoundGraphPreprocessor/fixedSideOut", "run", SITE_2},
        {"CompoundGraphPreprocessor/deepOutMerged", "run", SITE_3},
        {"CompoundGraphPreprocessor/deepToParentPort", "run", SITE_4},
        {"CompoundGraphPostprocessor/unnecessaryBendpoints/RIGHT", "run", SITE_5},
        {"CompoundGraphPostprocessor/unnecessaryBendpoints/DOWN", "run", SITE_6},
        {"HierarchicalNodeResizingProcessor/defaultMinimum", "run", SITE_7},
        {"HierarchicalNodeResizingProcessor/minimumWithoutDefault", "run", SITE_8},
        {"ElkLayered/childStrategyThrow", "throws", SITE_9},
        {"LayerSweepCrossingMinimizer/modelOrderCounterTopDown", "run", SITE_10},
        {"LayerSweepCrossingMinimizer/modelOrderCounterBottomUp", "run", SITE_11},
        {"CommentPreprocessor/hierarchicalPortDummy/lone", "run", SITE_12},
        {"CommentPreprocessor/hierarchicalPortDummy/shared", "run", SITE_13},
        {"GraphConfigurator/levelOptions", "run", SITE_14},
        {"OrthogonalEdgeRouter/extPortSelfLoop/north", "run", SITE_15},
        {"OrthogonalEdgeRouter/extPortSelfLoop/south", "run", SITE_16},
        {"JsonDebugUtil/loggedCompound", "logged", SITE_17},
        {"HierarchicalNodeResizingProcessor/fixedGraphSize", "run", SITE_18}
    };

    /** The smallest of the three inputs of the hierarchical SPLINES throw (tickets 040, 160, 701; SplineSegment.java:247, the "ORACLE THROWS" of
     * the T1 recording). A probe of all three, both directions, threw the same exception from the same frame, so one input is recorded. */
    static final List<String> SPLINE_THROW_MODELS = List.of("ticket-040_includeChildrenWithFixedOrder");

    /** A compound node c whose port p (no explicit side: the importer derives it from the position) has a cross-hierarchy edge on both sides. */
    static String fixedPortGraph(String portConstraints) {
        return "{\"id\":\"root\",\"children\":[{\"id\":\"a\",\"width\":30,\"height\":30},{\"id\":\"c\",\"width\":30,\"height\":30,"
                + "\"children\":[{\"id\":\"x\",\"width\":30,\"height\":30}],\"layoutOptions\":{\"portConstraints\":\"" + portConstraints + "\"},"
                + "\"ports\":[{\"id\":\"p\",\"x\":0,\"y\":13,\"width\":4,\"height\":4}],"
                + "\"edges\":[{\"id\":\"ei\",\"sources\":[\"p\"],\"targets\":[\"x\"]}]}],"
                + "\"layoutOptions\":{\"elk.direction\":\"RIGHT\",\"hierarchyHandling\":\"INCLUDE_CHILDREN\"},"
                + "\"edges\":[{\"id\":\"e1\",\"sources\":[\"a\"],\"targets\":[\"p\"]}]}";
    }

    static void site(List<Spec> out, String id, String mode, String path, String elk) {
        out.add(new Spec("sites/" + id, "sites", path, path == null ? () -> ElkGraphJson.forGraph(elk).toElk() : null, null,
                new TreeMap<>(), null, null, mode));
    }

    static void siteSpecs(List<Spec> out, List<ModelFile> files) {
        for (String[] r : SITE_ROWS) {
            site(out, r[0], r[1], null, r[2]);
        }
        for (String m : SPLINE_THROW_MODELS) {
            for (String d : List.of("DOWN", "UP")) {
                String elk = withLevelOptions(model(files, m).rel, fopts("DIRECTION", direction(d), "EDGE_ROUTING", routing("SPLINES")));
                site(out, "SplineSegment/anchorYWithoutPortCoordinate/" + d, "throws", null, elk);
            }
        }
        site(out, "ElkGraphImporter/selfLoopInCompoundNode", "throws", model(files, "ticket-425_selfLoopInCompoundNode").rel, null);
        for (String pc : List.of("FIXED_RATIO", "FIXED_POS")) {
            site(out, "CompoundGraphPreprocessor/hierarchicalPort" + pc, "either", null, fixedPortGraph(pc));
        }
    }

    /** A sites row: modes "run" (the engine run completes), "logged" (as run, under a monitor with logging on), "throws" (the run throws
     * inside ELK: expected = { throws }) and "either" (records whichever happens). A throw outside "throws" / "either" is an oracle throw
     * (the row is not recorded, as in the other groups). */
    static Result runSite(Spec s, ElkNode root) {
        try {
            Result r = runSiteLayout(s, root);
            if (s.mode.equals("throws")) {
                throw new Bug("row " + s.id + ": the oracle run completes, a throw row is expected");
            }
            return r;
        } catch (RuntimeException e) {
            StackTraceElement frame = elkFrame(e);
            if (frame == null || !(s.mode.equals("throws") || s.mode.equals("either"))) {
                throw e;
            }
            Map<String, Object> thrown = new LinkedHashMap<>();
            thrown.put("class", e.getClass().getName());
            thrown.put("message", e.getMessage());
            thrown.put("frame", frame.getFileName() + ":" + frame.getLineNumber());
            return new Result(single("throws", thrown), null);
        }
    }

    /** As runScenario, with a logging monitor in mode "logged" and expected.logged added. */
    static Result runSiteLayout(Spec s, ElkNode root) {
        currentRow = s.id;
        s.options.forEach((id, c4) -> setProperty(root, id, c4));
        checkSeeds(root);
        BasicProgressMonitor monitor = new BasicProgressMonitor();
        if (s.mode.equals("logged")) {
            monitor.withLogging(true);
        }
        StopRecorder recorder = new StopRecorder();
        Map<String, Object> plans = layoutOnce(s, root, monitor, recorder);
        if (recorder.stops.isEmpty()) {
            throw new Bug("row " + s.id + ": the run made no compound layout (no hierarchical stop)");
        }
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("layout", new Raw(export(root)));
        expected.put("plans", plans);
        expected.put("stops", recorder.stops.size());
        expected.put("tree", recorder.stops.get(recorder.stops.size() - 1).get("tree"));
        if (s.mode.equals("logged")) {
            expected.put("logged", logged(monitor));
        }
        return new Result(expected, null);
    }

    // The logged graphs of a monitor tree: copied from tools/vectors/LayeredLabelsVectors.java (7f2, T1: collectLogged, logged)

    static void collectLogged(IElkProgressMonitor m, List<LoggedGraph> out) {
        List<LoggedGraph> own = m.getLoggedGraphs();
        if (own != null) {
            out.addAll(own);
        }
        for (IElkProgressMonitor child : m.getSubMonitors()) {
            collectLogged(child, out);
        }
    }

    /** expected.logged: { tags, dot, json } over the monitor tree, depth first (see the header, "Group sites"). */
    static Map<String, Object> logged(IElkProgressMonitor root) {
        List<LoggedGraph> graphs = new ArrayList<>();
        collectLogged(root, graphs);
        List<Object> tags = new ArrayList<>(), dot = new ArrayList<>(), json = new ArrayList<>(), jsonTags = new ArrayList<>();
        for (LoggedGraph g : graphs) {
            switch (g.getGraphType()) {
                case DOT -> {
                    tags.add(g.getTag());
                    dot.add(g.getGraph());
                }
                case JSON -> {
                    jsonTags.add(g.getTag());
                    json.add(g.getGraph());
                }
                default -> throw new Bug("row " + currentRow + ": a logged graph of type " + g.getGraphType());
            }
        }
        if (!tags.equals(jsonTags)) {
            throw new Bug("row " + currentRow + ": the logged DOT and JSON graphs do not pair up by tag");
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tags", tags);
        m.put("dot", dot);
        m.put("json", json);
        return m;
    }

    // Building the file

    static final boolean MARKERS = System.getenv("COMPOUND_MARKERS") != null;
    static final String FILTER = System.getenv("COMPOUND_FILTER");
    static final String GROUPS = "full,models,scenarios,sites";
    static final Map<String, Integer> FAMILY_ROWS = new TreeMap<>();
    static final Set<String> STOP_KINDS = new TreeSet<>();

    /** The rows of a models spec: one per stop, id models/<model>/<n>-<level path>-<SimpleClassName>/<variant> (spec.stop = model, spec.mode = variant). */
    @SuppressWarnings("unchecked")
    static List<Row> stopRows(Spec s, Result first, Map<String, Object> input) {
        List<Row> rows = new ArrayList<>();
        for (Object o : (List<Object>) first.expected.get("stops")) {
            Map<String, Object> expected = (Map<String, Object>) o;
            Map<String, Object> stop = (Map<String, Object>) expected.get("stop");
            String id = "models/" + s.stop + "/" + stop.get("index") + "-" + stop.get("levelPath") + "-" + stop.get("className") + "/" + s.mode;
            STOP_KINDS.add((String) stop.get("processor"));
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", id);
            m.put("group", "models");
            m.put("input", input);
            m.put("target", null);
            m.put("options", s.options);
            m.put("steps", null);
            m.put("prefix", null);
            m.put("expected", expected);
            rows.add(new Row(id, "models", json(m)));
        }
        return rows;
    }

    /** Records every row; returns the output file text. */
    static String buildAll() {
        RAN.clear();
        BYTES.clear();
        FAMILY_ROWS.clear();
        STOP_KINDS.clear();
        ORACLE_THROWS.clear();
        outOfScope = 0;
        buildProcessorNames();
        checkClassification();
        List<ModelFile> files = modelFiles();
        List<Spec> specs = new ArrayList<>();
        fullSpecs(specs, files);
        modelSpecs(specs, files);
        scenarioSpecs(specs);
        siteSpecs(specs, files);
        Set<String> ids = new HashSet<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String group : GROUPS.split(",")) {
            counts.put(group, 0);
        }
        List<Row> rows = new ArrayList<>();
        for (Spec s : specs) {
            if (FILTER != null && !s.id.contains(FILTER)) {
                continue;
            }
            if (TRACE) {
                System.err.println("row " + s.id);
            }
            if (MARKERS) {
                System.out.println("ROW " + s.id);
                System.out.flush();
            }
            List<Row> built;
            try {
                built = buildRows(s);
            } catch (Refusal r) {
                throw r;
            } catch (RuntimeException e) {
                StackTraceElement frame = elkFrame(e);
                if (frame == null) {
                    throw e;
                }
                ORACLE_THROWS.add(s.id + " " + e.getClass().getName() + ": " + e.getMessage() + " at " + frame);
                continue;
            }
            for (Row r : built) {
                if (!ids.add(r.id)) {
                    throw new IllegalStateException("duplicate row id " + r.id);
                }
                rows.add(r);
                counts.merge(r.group, 1, Integer::sum);
                String[] p = r.id.split("/");
                String family = p[0].equals("full") ? "full/" + p[1] : p[0].equals("scenarios") ? "scenarios/" + p[1] : p[0].equals("sites") ? "sites" : "models";
                FAMILY_ROWS.merge(family, 1, Integer::sum);
                BYTES.merge(family, (long) r.json.length(), Long::sum);
            }
        }
        if (FILTER == null) {
            checkCoverage();
        }
        System.err.println("skipped stops: 0 (a models row is one stop of a real run; nothing is selected from a plan)");
        System.err.println("out of scope (algorithm): " + outOfScope);
        ORACLE_THROWS.forEach(t -> System.err.println("ORACLE THROWS " + t));
        System.err.println("oracle throws: " + ORACLE_THROWS.size() + " rows");
        if (System.getenv("COMPOUND_STATS") != null) {
            BYTES.forEach((kind, v) -> System.err.println("STATS " + v + " " + kind + " rows " + FAMILY_ROWS.get(kind)));
        }
        System.err.println("rows " + rows.size() + " " + counts);
        return fileText(counts, rows);
    }

    /** Every family recorded rows, and the stops of the four kinds (H2) all occurred. */
    static void checkCoverage() {
        List<String> missing = new ArrayList<>();
        for (String family : List.of("full/issues", "full/include-children", "full/ptolemy-include", "full/hierarchy-aware", "full/resizer", "models")) {
            if (FAMILY_ROWS.getOrDefault(family, 0) == 0) {
                missing.add("rows of " + family);
            }
        }
        for (String kind : List.of(COMPOUND_PRE, COMPOUND_POST, "HIERARCHICAL_NODE_RESIZER")) {
            if (!STOP_KINDS.contains(kind)) {
                missing.add("a stop of " + kind);
            }
        }
        for (String kind : List.of(P3 + "/LAYER_SWEEP", P3 + "/MEDIAN_LAYER_SWEEP", "ONE_SIDED_GREEDY_SWITCH", "TWO_SIDED_GREEDY_SWITCH")) {
            if (!STOP_KINDS.contains(kind)) {
                missing.add("a stop of " + kind);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("no row covers " + missing);
        }
        System.err.println("row timeouts: 0 (a timeout stops the recording)");
    }


    static void setup(String vectorsDir) throws Exception {
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/layered-compound-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1"); // the seed properties of tools/oracle/run.sh (F4)
        System.setProperty("org.eclipse.elk.graph.util.identifierSeed", "1");
        ElkGraphStandaloneSetup.doSetup();
        REPO = vectorsDir == null ? null : Path.of(vectorsDir).toAbsolutePath().normalize().getParent().getParent();
        discoverProperties();
    }

    // --plan-dump (F8)

    static ElkNode loadAny(Path p) throws IOException {
        if (p.toString().endsWith(".json")) {
            return ElkGraphJson.forGraph(Files.readString(p, StandardCharsets.UTF_8)).toElk();
        }
        Resource r = new ResourceSetImpl().getResource(URI.createFileURI(p.toAbsolutePath().toString()), true);
        if (!r.getErrors().isEmpty() || r.getContents().isEmpty() || !(r.getContents().get(0) instanceof ElkNode)) {
            throw new IOException("cannot load " + p + ": " + r.getErrors());
        }
        ElkNode g = (ElkNode) r.getContents().get(0);
        dropUnresolvedOptions(g);
        return g;
    }

    static List<Path> expand(Path root, String rel) throws IOException {
        Path p = root.resolve(rel);
        List<Path> files = new ArrayList<>();
        if (Files.isDirectory(p)) {
            try (var walk = Files.walk(p)) {
                walk.filter(Files::isRegularFile).filter(f -> f.toString().endsWith(".elkt") || f.toString().endsWith(".json"))
                        .sorted().forEach(files::add);
            }
        } else {
            files.add(p);
        }
        List<Path> kept = new ArrayList<>();
        for (Path f : files) {
            String name = f.toString();
            if (name.endsWith(".elkt") && files.contains(Path.of(name.replaceAll("\\.elkt$", ".json")))) {
                continue; // ptolemy: the .json twin of the same model is read
            }
            kept.add(f);
        }
        return kept;
    }

    /** args: --plan-dump <vectorsDir> <modelsDir> <path or dir>... [-o CONSTANT=value]... (options set on every node with children). */
    static void planDump(String[] args) throws Exception {
        setup(args[1]);
        buildProcessorNames();
        Path models = Path.of(args[2]);
        List<String[]> opts = new ArrayList<>();
        List<String> paths = new ArrayList<>();
        for (int i = 3; i < args.length; i++) {
            if (args[i].equals("-o")) {
                if (i + 1 >= args.length) {
                    throw new IllegalArgumentException("-o needs a CONSTANT=value argument");
                }
                opts.add(args[++i].split("=", 2));
            } else {
                paths.add(args[i]);
            }
        }
        for (String rel : paths) {
            for (Path file : expand(models, rel)) {
                String name = models.relativize(file).toString();
                try {
                    ElkNode root = loadAny(file);
                    List<ElkNode> nodes = new ArrayList<>();
                    nodes.add(root);
                    for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
                        if (it.next() instanceof ElkNode n) {
                            nodes.add(n);
                        }
                    }
                    for (String[] o : opts) {
                        var data = LayoutMetaDataService.getInstance().getOptionData(pid(o[0]));
                        for (ElkNode n : nodes) {
                            if (!n.getChildren().isEmpty()) {
                                n.setProperty(data, data.parseValue(o[1]));
                            }
                        }
                    }
                    currentRow = name;
                    PlanRecorder recorder = new PlanRecorder();
                    TestController controller = new TestController(LayeredOptions.ALGORITHM_ID);
                    controller.addLayoutExecutionListener(recorder);
                    var pool = LayoutMetaDataService.getInstance().getAlgorithmData(LayeredOptions.ALGORITHM_ID).getInstancePool();
                    AbstractLayoutProvider provider = pool.fetch();
                    controller.install(provider);
                    pool.release(provider);
                    try {
                        new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
                    } finally {
                        controller.uninstall();
                    }
                    Set<String> refused = new TreeSet<>();
                    for (Map.Entry<String, Object> e : recorder.plans().entrySet()) {
                        List<?> names = (List<?>) e.getValue();
                        System.out.println("PLAN\t" + name + "\t" + e.getKey() + "\t" + String.join(",", names.stream().map(Object::toString).toList()));
                        names.stream().map(Object::toString).filter(n -> !allowed(n)).forEach(refused::add);
                    }
                    System.out.println("FILE\t" + name + "\t" + (refused.isEmpty() ? "-" : String.join(",", refused)));
                } catch (RuntimeException | IOException e) {
                    System.out.println("FILE\t" + name + "\tERROR " + e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage()).replace('\n', ' '));
                }
            }
        }
    }

    // --sweep / --dump (T13, H5)
    // ORIGIN: the shape of LayeredLoopsVectors.java --sweep/--dump (7g, T19, W5; part (a) is the enumeration of LayeredLabelsVectors.java
    // --sweep, 7f2 T15). Cases, each id "<part>/model/<model with its extension>/<variant>", variant "default" or a Direction set on the ROOT only:
    //   a  the label sweep's models (every .elkt of SWEEP_DIRS whose text matches label|comment) kept where the text holds INCLUDE_CHILDREN
    //      (expected 10 models, 50 cases) x default and the four directions
    //   b  every .elkt/.json of SWEEP_DIRS whose text holds INCLUDE_CHILDREN (a subset of them is also part a's) x the same five variants
    //   c  every realworld/ptolemy/hierarchical/*.json x the four directions, with hierarchyHandling INCLUDE_CHILDREN set on the root (no file of
    //      the directory sets it itself: 0 of 256 hold the text; the ptolemy-include family of the rows applies it as an option the same way)
    // A model with a node whose algorithm is not registered (elk.stress) is out of scope, counted per part, never written. No refusal category
    // remains: a Refusal (or Bug) stops the sweep naming the case. results.jsonl, one object per case: { id, part, model, variant, sha256 } |
    // { ..., status: "throws", class, message, frame? } | { id, status: "timeout" }. Canonical form: the 7g one (raw IEEE hex, NaN canonical).

    static final long CASE_TIMEOUT_SECONDS = 20, CASE_STACK_BYTES = 64L * 1024 * 1024;
    static final String STATUS = "status", VARIANT_DEFAULT = "default", PART_A = "a", PART_B = "b", PART_C = "c";
    static final String ELKT_EXTENSION = ".elkt", JSON_EXTENSION = ".json", PTOLEMY_HIERARCHICAL = "realworld/ptolemy/hierarchical";
    static final List<String> SWEEP_DIRS = List.of("tests/layered", "tickets/layered", "examples");
    static final List<String> SWEEP_VARIANTS = List.of(VARIANT_DEFAULT, "RIGHT", "LEFT", "DOWN", "UP");
    static final java.util.regex.Pattern LABEL_BEARING = java.util.regex.Pattern.compile("label|comment");

    record SweepCase(String part, String model, String variant) {
        String id() {
            return part + "/model/" + model + "/" + variant;
        }
    }

    /** The files of dir (relative to base, '/'-separated) with one of the extensions, sorted. */
    static List<String> filesUnder(Path base, Path dir, List<String> extensions) throws IOException {
        try (Stream<Path> files = Files.walk(dir)) {
            return files.filter(Files::isRegularFile).filter(p -> extensions.stream().anyMatch(e -> p.toString().endsWith(e)))
                    .map(p -> base.relativize(p).toString().replace('\\', '/')).sorted().toList();
        }
    }

    /** The models of a part: loadable ones in order, with the ones using an unregistered algorithm counted in OUT_OF_SCOPE. */
    static List<String> candidateFiles(String part, Path modelsDir) throws IOException {
        List<String> files = new ArrayList<>();
        if (part.equals(PART_C)) {
            files.addAll(filesUnder(modelsDir, modelsDir.resolve(PTOLEMY_HIERARCHICAL), List.of(JSON_EXTENSION)));
        } else {
            for (String dir : SWEEP_DIRS) {
                files.addAll(filesUnder(modelsDir, modelsDir.resolve(dir), part.equals(PART_A) ? List.of(ELKT_EXTENSION) : List.of(ELKT_EXTENSION, JSON_EXTENSION)));
            }
        }
        Collections.sort(files);
        List<String> kept = new ArrayList<>();
        for (String f : files) {
            String text = Files.readString(modelsDir.resolve(f), StandardCharsets.UTF_8);
            if (!part.equals(PART_C) && (!text.contains(INCLUDE_CHILDREN) || part.equals(PART_A) && !LABEL_BEARING.matcher(text).find())) {
                continue;
            }
            ElkNode root;
            try {
                root = loadAny(modelsDir.resolve(f));
            } catch (RuntimeException | IOException e) {
                throw new Bug("sweep input " + f + " does not load: " + e); // a stop, not a skip (the labels sweep skipped silently-ish)
            }
            if (usesUnregisteredAlgorithm(root)) {
                OUT_OF_SCOPE.merge(part, 1, Integer::sum);
                System.err.println("out of scope (algorithm) part " + part + ": " + f);
                continue;
            }
            kept.add(f);
        }
        return kept;
    }

    static final Map<String, Integer> OUT_OF_SCOPE = new TreeMap<>();

    static List<SweepCase> casesOf(String part, Path modelsDir) throws IOException {
        List<SweepCase> out = new ArrayList<>();
        for (String model : candidateFiles(part, modelsDir)) {
            for (String v : part.equals(PART_C) ? SWEEP_VARIANTS.subList(1, SWEEP_VARIANTS.size()) : SWEEP_VARIANTS) {
                out.add(new SweepCase(part, model, v));
            }
        }
        return out;
    }

    /** The IEEE-754 bits as 16 hex digits with every NaN canonical (Double.doubleToLongBits): the sign bit of a computed NaN is not reproducible (7g, T19). */
    static String rawHex(double d) {
        return String.format("%016x", Double.doubleToLongBits(d));
    }

    static List<Object> box(org.eclipse.elk.graph.ElkShape s) {
        return List.of(rawHex(s.getX()), rawHex(s.getY()), rawHex(s.getWidth()), rawHex(s.getHeight()));
    }

    static List<Object> labelsOf(ElkGraphElement e) {
        List<Object> out = new ArrayList<>();
        e.getLabels().forEach(l -> out.add(box(l)));
        return out;
    }

    static List<Object> point(double x, double y) {
        return List.of(rawHex(x), rawHex(y));
    }

    static Map<String, Object> edgeDump(ElkEdge e) {
        Map<String, Object> m = new TreeMap<>();
        m.put("id", e.getIdentifier());
        List<Object> sections = new ArrayList<>();
        e.getSections().forEach(sec -> {
            Map<String, Object> s = new TreeMap<>();
            s.put("start", point(sec.getStartX(), sec.getStartY()));
            s.put("end", point(sec.getEndX(), sec.getEndY()));
            List<Object> bends = new ArrayList<>();
            sec.getBendPoints().forEach(b -> bends.add(point(b.getX(), b.getY())));
            s.put("bends", bends);
            sections.add(s);
        });
        m.put("sections", sections);
        List<Object> junctions = new ArrayList<>();
        e.getProperty(CoreOptions.JUNCTION_POINTS).forEach(v -> junctions.add(point(v.x, v.y)));
        m.put("junctions", junctions);
        m.put("labels", labelsOf(e));
        return m;
    }

    /** The canonical tree of a laid-out ElkGraph subtree (7f's elkDump): ids, boxes, labels, ports, children, contained edges. */
    static Map<String, Object> elkDump(ElkNode n) {
        Map<String, Object> m = new TreeMap<>();
        m.put("id", n.getIdentifier());
        m.put("box", box(n));
        m.put("labels", labelsOf(n));
        List<Object> ports = new ArrayList<>();
        n.getPorts().forEach(p -> {
            Map<String, Object> pm = new TreeMap<>();
            pm.put("id", p.getIdentifier());
            pm.put("box", box(p));
            pm.put("labels", labelsOf(p));
            ports.add(pm);
        });
        m.put("ports", ports);
        List<Object> children = new ArrayList<>();
        n.getChildren().forEach(c -> children.add(elkDump(c)));
        m.put("children", children);
        List<Object> edges = new ArrayList<>();
        n.getContainedEdges().forEach(e -> edges.add(edgeDump(e)));
        m.put("edges", edges);
        return m;
    }

    /** The whole model through the recursive engine, a Direction set on the root for a variant other than default. */
    static Map<String, Object> sweepCanonical(SweepCase c, Path modelsDir) throws IOException {
        ElkNode root = loadAny(modelsDir.resolve(c.model()));
        if (c.part().equals(PART_C)) {
            root.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
        }
        if (!c.variant().equals(VARIANT_DEFAULT)) {
            root.setProperty(CoreOptions.DIRECTION, org.eclipse.elk.core.options.Direction.valueOf(c.variant()));
        }
        new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
        return elkDump(root);
    }

    /** Runs the case on a thread with a big stack; null when the timeout fires. */
    static Map<String, Object> runCase(SweepCase c, Path modelsDir) throws Throwable {
        java.util.concurrent.FutureTask<Map<String, Object>> task = new java.util.concurrent.FutureTask<>(() -> {
            currentRow = c.id();
            return sweepCanonical(c, modelsDir);
        });
        Thread t = new Thread(null, task, "case", CASE_STACK_BYTES);
        t.setDaemon(true);
        t.start();
        try {
            return task.get(CASE_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            t.interrupt();
            return null;
        } catch (java.util.concurrent.ExecutionException e) {
            throw e.getCause();
        }
    }

    /** The first org.eclipse.elk frame of a throwable as "File.java:line", or null (Errors and exceptions thrown outside ELK have none). */
    static String elkFrameOf(Throwable e) {
        StackTraceElement f = e instanceof RuntimeException re ? elkFrame(re) : null;
        return f == null ? null : f.getFileName() + ":" + f.getLineNumber();
    }

    static void describe(Map<String, Object> m, SweepCase c) {
        m.put("part", c.part());
        m.put("model", c.model());
        m.put("variant", c.variant());
    }

    /** Diagnosis aids (the stamp of compound-sweep.sh does not cover them: run --force after a run that set one). COMPOUND_SWEEP_ONLY=<regex>
     * runs only the cases whose id contains a match; COMPOUND_SWEEP_DUMP_DIR=<dir> writes the canonical form of every ok case there. */
    static final java.util.regex.Pattern SWEEP_ONLY = System.getenv("COMPOUND_SWEEP_ONLY") == null ? null : java.util.regex.Pattern.compile(System.getenv("COMPOUND_SWEEP_ONLY"));
    static final String SWEEP_DUMP_DIR = System.getenv("COMPOUND_SWEEP_DUMP_DIR");

    static Map<String, Object> sweepOutcome(SweepCase c, Path modelsDir) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.id());
        try {
            Map<String, Object> dump = runCase(c, modelsDir);
            if (dump == null) {
                m.put(STATUS, "timeout");
                return m;
            }
            describe(m, c);
            m.put("sha256", sha256Text(canonicalText(dump)));
            if (SWEEP_DUMP_DIR != null) {
                Files.createDirectories(Path.of(SWEEP_DUMP_DIR));
                Files.writeString(Path.of(SWEEP_DUMP_DIR, c.id().replace('/', '_') + ".json"), canonicalText(dump) + "\n", StandardCharsets.UTF_8);
            }
        } catch (Refusal | Bug r) {
            throw new Bug("sweep stops at " + c.id() + ": " + r);
        } catch (Throwable e) {
            m.put(STATUS, "throws");
            describe(m, c);
            m.put("class", e.getClass().getSimpleName());
            m.put("message", String.valueOf(e.getMessage()));
            String frame = elkFrameOf(e);
            if (frame != null) {
                m.put("frame", frame);
            }
            System.err.println("ORACLE THROWS " + c.id() + " " + e.getClass().getSimpleName() + ": " + e.getMessage() + " at " + frame);
        }
        return m;
    }

    static String sha256Text(String s) {
        try {
            StringBuilder sb = new StringBuilder();
            for (byte b : MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String canonicalText(Object v) {
        StringBuilder sb = new StringBuilder();
        canonicalInto(sb, v);
        return sb.toString();
    }

    /** Compact JSON as JSON.stringify writes it, object keys sorted (the TS side: layered-phase-sweep.ts canonical). */
    static void canonicalInto(StringBuilder sb, Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof String s) {
            canonicalString(sb, s);
        } else if (v instanceof Map<?, ?> m) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            m.forEach((k, x) -> sorted.put((String) k, x));
            sb.append('{');
            int i = 0;
            for (Map.Entry<String, Object> e : sorted.entrySet()) {
                sb.append(i++ == 0 ? "" : ",");
                canonicalString(sb, e.getKey());
                sb.append(':');
                canonicalInto(sb, e.getValue());
            }
            sb.append('}');
        } else if (v instanceof List<?> l) {
            sb.append('[');
            for (int i = 0; i < l.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                canonicalInto(sb, l.get(i));
            }
            sb.append(']');
        } else {
            throw new Bug("uncanonical value of class " + v.getClass().getName());
        }
    }

    /** A JSON string literal as JSON.stringify writes it (well-formed: a lone surrogate becomes \\udxxx). */
    static void canonicalString(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (ch < 0x20) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else if (Character.isHighSurrogate(ch) && i + 1 < s.length() && Character.isLowSurrogate(s.charAt(i + 1))) {
                        sb.append(ch).append(s.charAt(++i));
                    } else if (Character.isSurrogate(ch)) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else {
                        sb.append(ch);
                    }
                }
            }
        }
        sb.append('"');
    }

    static void sweep(Path modelsDir, Path outDir) throws IOException {
        Files.createDirectories(outDir);
        Map<String, Integer> counts = new TreeMap<>(), enumerated = new TreeMap<>(), throwsBy = new TreeMap<>();
        long start = System.currentTimeMillis();
        try (var out = Files.newBufferedWriter(outDir.resolve("results.jsonl"), StandardCharsets.UTF_8)) {
            for (String part : List.of(PART_A, PART_B, PART_C)) {
                List<SweepCase> cases = casesOf(part, modelsDir);
                enumerated.put(part, cases.size());
                System.err.println("part " + part + ": " + cases.size() + " cases, out of scope models " + OUT_OF_SCOPE.getOrDefault(part, 0));
                for (SweepCase c : cases) {
                    if (SWEEP_ONLY != null && !SWEEP_ONLY.matcher(c.id()).find()) {
                        continue;
                    }
                    Map<String, Object> m = sweepOutcome(c, modelsDir);
                    String status = String.valueOf(m.getOrDefault(STATUS, "ok"));
                    counts.merge(part + " " + status, 1, Integer::sum);
                    if (status.equals("throws")) {
                        throwsBy.merge(part + " " + m.get("class") + " " + m.get("frame"), 1, Integer::sum);
                    }
                    out.write(json(m));
                    out.write('\n');
                    out.flush();
                }
            }
        }
        System.err.println("sweep done " + counts + " in " + (System.currentTimeMillis() - start) / 1000 + " s");
        System.err.println("enumerated " + enumerated + " out of scope models " + OUT_OF_SCOPE);
        System.err.println("throws " + throwsBy);
    }

    /** Writes the canonical form of one case (the text the hash is taken over) to <outDir>/<id with / as _>.json. */
    static void dumpCase(String id, Path modelsDir, Path outDir) throws Throwable {
        for (SweepCase c : casesOf(id.substring(0, 1), modelsDir)) {
            if (!c.id().equals(id)) {
                continue;
            }
            Map<String, Object> dump = runCase(c, modelsDir);
            if (dump == null) {
                throw new Bug("case " + id + " times out");
            }
            Files.createDirectories(outDir);
            Path file = outDir.resolve(id.replace('/', '_') + ".json");
            Files.writeString(file, canonicalText(dump) + "\n", StandardCharsets.UTF_8);
            System.err.println("wrote " + file);
            return;
        }
        throw new Bug("no sweep case has the id " + id);
    }

    static void sweepMain(String[] args) throws Throwable {
        setup(null);
        buildProcessorNames();
        if (args.length == 3 && args[0].equals("--sweep")) {
            sweep(Path.of(args[1]), Path.of(args[2]));
        } else if (args.length >= 4 && args[0].equals("--dump")) {
            for (int i = 1; i < args.length - 2; i++) {
                dumpCase(args[i], Path.of(args[args.length - 2]), Path.of(args[args.length - 1]));
            }
        } else {
            throw new IllegalArgumentException("usage: --sweep <modelsDir> <outDir> | --dump <case id>... <modelsDir> <outDir>");
        }
        System.exit(0);
    }

    public static void main(String[] args) throws Exception {
        if (args.length > 0 && (args[0].equals("--sweep") || args[0].equals("--dump"))) {
            try {
                sweepMain(args);
            } catch (Exception | Error e) {
                throw e;
            } catch (Throwable t) {
                throw new IllegalStateException(t);
            }
            return;
        }
        if (args.length > 0 && args[0].equals("--plan-dump")) {
            planDump(args);
            return;
        }
        elkCommit(); // refuse before the first row is recorded, not at the stamp, when the pin was not passed
        setup(args[1]);
        String file;
        try {
            file = buildAll();
            if (FILTER == null) {
                String again = buildAll();
                if (!file.equals(again)) {
                    throw new IllegalStateException("two builds differ\n" + clip(file, again) + "\n" + clip(again, file));
                }
                auditModelsDir();
            }
        } catch (Refusal r) {
            System.err.println("refused: " + r.getMessage());
            System.exit(1);
            return;
        }
        Files.createDirectories(Path.of(args[0]));
        long bytes = file.getBytes(StandardCharsets.UTF_8).length;
        if (bytes > MAX_BYTES) {
            throw new IllegalStateException(OUTPUT + " is " + bytes + " bytes, over the 16 MiB cap");
        }
        Files.writeString(Path.of(args[0], OUTPUT), file, StandardCharsets.UTF_8);
        strictParse(Path.of(args[0], OUTPUT));
        System.err.println("strict JSON parse ok, " + OUTPUT + " bytes " + bytes);
    }
}
