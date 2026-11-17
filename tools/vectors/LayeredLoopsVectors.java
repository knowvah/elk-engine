// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7g layered-loops-wrapping-compaction, T1, W1, W3, W4, W7) for the self loop,
// wrapping and compaction family of org.eclipse.elk.alg.layered: SelfLoopPreProcessor, SelfLoopPortRestorer, SelfLoopRouter,
// SelfLoopPostProcessor (with intermediate/loops/**), DummySelfLoopProcessor, BreakingPointInserter, BreakingPointProcessor,
// BreakingPointRemover, SingleEdgeGraphWrapper (intermediate/wrapping/**), HorizontalGraphCompactor (intermediate/compaction/** and
// compaction/**) and ComponentsCompactor (components/**, reached through COMPACTION_CONNECTED_COMPONENTS). The Java is the spec; this
// program only CALLS ELK APIs (reflection where a member is private or protected) and records results; it embeds no ELK implementation.
// Expectations come from the oracle only, before any TypeScript of the mission exists.
// Run: tools/vectors/layered-loops-vectors.sh <outDir>   (java -cp ... LayeredLoopsVectors.java <outDir> <tools/vectors dir>)
// Plan dump (diagnosis): java -cp ... LayeredLoopsVectors.java --plan-dump <tools/vectors dir> <modelsDir> <path>... [-o CONSTANT=value]...
//   prints "PLAN <path> <level path> <member>,..." per hierarchy level (a directory path is expanded to its .elkt / .json files).
// Sweep (T19, W5): java -cp ... LayeredLoopsVectors.java --sweep <modelsDir> <outDir>   (writes <outDir>/results.jsonl; run from the repo root)
//                  java -cp ... LayeredLoopsVectors.java --dump <case id> <modelsDir> <outDir>  (writes the canonical form of one case)
//   tools/oracle/loops-sweep.sh runs them. Three parts, each case id prefixed by its part:
//     a/level/<model>/<root|target>/<ROUTING>, a/model/<model>/<DIRECTION>   the pipeline sweep's enumeration (LayeredPipelineVectors.java
//         --sweep, 7f T14, copied: every realworld/ptolemy/**.json, every edge-bearing level x ORTHOGONAL/POLYLINE/SPLINES through
//         ElkGraphTransformer + ElkLayered.doLayout, every whole model x RIGHT/LEFT/DOWN/UP through RecursiveGraphLayoutEngine)
//     b/model/<model>/<default|DIRECTION>   the label sweep's enumeration (LayeredLabelsVectors.java --sweep, 7f2 T15, copied: every
//         label- or comment-bearing .elkt of tests/layered, tickets/layered, examples)
//     c/model/<model with extension>/<option id>=<value>   an option family over tests/layered/{self_loops,compaction_oned,
//         connected_components}/**, the vendored test/golden/inputs/loops/** files (copies of corpus files, read from the models dir) and
//         every ptolemy .json: wrapping.strategy SINGLE_EDGE and MULTI_EDGE (default cutting), compaction.postCompaction.strategy
//         EDGE_LENGTH and LEFT_RIGHT_CONNECTION_LOCKING, set on every node with children (the root included)
//   Parts a and b keep a case only where the WHOLE plan of some level holds one of the nine arms (SEVEN_G) or a node has
//   compaction.connectedComponents on (the cases the pipeline and label sweeps refused); a case outside that scope is dropped and counted
//   on stderr. Refusals: 7h's categories only (REFUSAL_CATEGORIES), counted; any other member outside the ported sets stops the sweep
//   naming the case. results.jsonl, one JSON object per case, the line format of the labels sweep with `part` and `variant`:
//     ok       { id, part, kind, model, target, variant, sha256 }   sha256 of the canonical form (UTF-8, compact, object keys sorted)
//     refused  { id, part, status: "refused", processor, category }
//     throws   { id, status: "throws", part, kind, model, target, variant, class, message[, frame] }  frame: first ELK "File.java:line"
//     timeout  { id, status: "timeout" }                                not finished within CASE_TIMEOUT_SECONDS
//   Canonical form: as 7f's sweep (elkDump: boxes, labels, ports, children, contained edges, raw IEEE hex) with one change: every NaN
//   is the canonical NaN 7ff8000000000000 (rawHex), because the JVM's NaN sign bit is not reproducible between runs. The no-flag
//   recording path never calls the sweep.
//
// ORIGIN (B7: single-file launchers share no code): copied from tools/vectors/LayeredLabelsVectors.java (7f2, T1; itself copied from
// LayeredRoutingVectors.java, LayeredPlacementVectors.java and LayeredOrderVectors.java): the JSON helpers, the LGraph Dump, the C4
// Encoder and decode, importGraph/normalise/Base/phaseDump, the step interpreter, Spec/execute/buildRow, strictNumbers/strictParse, the
// row timeout, levels(), planOfGraph/chainOf, the ELK JSON builders, PlanRecorder and runFull, the --plan-dump and the sweep. The row
// format, the C4 values, the BFS guard, the re-run / build-twice / strict-parse / size checks are 7c's through 7f2's (see their headers).
// What this recorder changes or adds is listed below; the 7f2 families (labels, comments, unzipping, interactive, logged), the 7f2
// sites group and the label scenario builders are not copied. The step ops labelManager, interactive and logging, the "logged"
// terminal dump and the interactive/logging full modes stay in the interpreter (inherited, no row of this file uses them).
//
// Output: ONE file <outDir>/layered-loops.json (2-space top level, one compact JSON row per line, trailing newline, under 16 MiB):
//   { jdk, oracle, rowCounts: { full, models, scenarios, sites }, rows }      groups full, models, scenarios, sites (sites: T20)
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable. input = { path, sha256 } (vendored
//   file) or { elk } (inline ELK JSON). Rows are built in memory in a fixed order, from lists and LinkedHashMaps only, and the whole build
//   runs twice and must agree byte for byte (the second run of the script is a cache hit).
//
// REFUSAL (W3): decided on the WHOLE plan of every level, never on a prefix, so no row is pinned. A row whose plan holds an
//   IntermediateProcessorStrategy member outside the ported sets (SEVEN_B..SEVEN_F2, SEVEN_G, P1-P5) exits 1 naming the row, unless
//   the member is in REFUSAL_CATEGORIES (7h: INCLUDE_CHILDREN, HIERARCHICAL_NODE_RESIZER): then the row is not recorded and counted per
//   category on stderr ("accepted refusals (7h): n rows"). INCLUDE_CHILDREN is also refused by option (refuseOptions). The nine arms of
//   7g (SEVEN_G) are allowed, and the COMPACTION_CONNECTED_COMPONENTS option refusal of the labels recorder is lifted. This file's rows
//   hold no 7h plan, so the accepted count is 0.
//
// ORACLE THROWS: a row whose oracle run throws inside ELK (the first frame outside this program is an org.eclipse.elk frame) is not
//   recorded; the recorder prints "ORACLE THROWS <row id> <exception>: <message> at <first ELK frame>" and "oracle throws: n rows" on
//   stderr (the JDK 21 source launcher masks short-stack exceptions, so they are caught and printed inside the recorder). The rows are
//   deterministic: the second build throws the same rows. Every other exception stops the recording.
//
// Group full (F4), id full/<family>/<model>/<variant>: target null, steps null, prefix null, options = the FINAL option values applied
//   to the ROOT node before layout (C4 values; a hierarchical model has them baked into its inline input at every level that has
//   children, options = {}: 7f2's padding-0 precedent), expected = { layout, plans } as in 7f (compact exported ELK JSON of the root
//   after new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor()); plans = { "<level path>": [member names] }
//   captured in the real run). Families (model = the model id: tests/layered/<dir>/<name> -> "<dir>-<name>", tickets/layered/<name> ->
//   "ticket-<name>", realworld/ptolemy/**/<file> -> "ptolemy-<last token of the file name, lower case>"; inline graphs name themselves):
//     self-loops           31 models: 24 of the corpus (tests/layered/self_loops 6, compaction_oned/selfloop 3, the self loop tickets 079,
//                          128 x2, 302, 340, 360, 368, 403, 416, 418, 419, 433, 444, 463, 870), the pinned ptolemy sinewaveoptimization and
//                          six more vendored ptolemy self loop models (conwayrandom, eratosthenes, trafficlight, channelfaultmodel,
//                          brewery, trialmodule); variant "default" (the model's own options) and
//                          "<DIRECTION>-<ROUTING>" (direction RIGHT, LEFT, DOWN, UP x edgeRouting ORTHOGONAL, POLYLINE, SPLINES; nine
//                          models the whole grid, the others RIGHT x the three routings); and on self_loops-hyperLoops, -label,
//                          -fixedSide the variants "distribution-<D>-ordering-<O>" for every value of
//                          edgeRouting.selfLoopDistribution (EQUALLY, NORTH, NORTH_SOUTH) x selfLoopOrdering (STACKED,
//                          REVERSE_STACKED, SEQUENCED). SelfLoopPlacementStrategy has no option at the pin.
//     wrapping             variant "<WrappingStrategy>-<CuttingStrategy>-<ValidifyStrategy>" (SINGLE_EDGE, MULTI_EDGE x ARD, MSD,
//                          MANUAL (cuts [2, 4, 6]) x NO, GREEDY, LOOK_BACK (forbidden indices [3] unless NO)) on the long chains of the
//                          vendored inputs (preserve_order simpleLongEdges01, longConflictingExample, timedAutomaton), two ptolemy
//                          models (router, randomwalk) and the inline graphs chain12 and ladder16 (no corpus model sets
//                          wrapping); the variants multi-improve-cuts-off, multi-improve-wrapped-edges-off, multi-distance-penalty-0 / -8,
//                          multi-msd-freedom-0 / -3, multi-correction-0.5 / -2, single-correction-0.5 / -2 and
//                          single/multi-additional-edge-spacing-30 on simpleLongEdges01, chain12 and ladder16.
//     compaction           the compaction_oned models (12) x compaction.postCompaction.strategy (LEFT, RIGHT, LEFT_RIGHT_CONSTRAINT_LOCKING,
//                          LEFT_RIGHT_CONNECTION_LOCKING, EDGE_LENGTH) x postCompaction.constraints (SCANLINE, QUADRATIC; QUADRATIC only
//                          with the two main strategies) x edgeRouting (ORTHOGONAL, SPLINES, and POLYLINE with EDGE_LENGTH only: a
//                          POLYLINE plan holds no HORIZONTAL_COMPACTOR); variant "<strategy>-<constraints>-<routing>" lower case, and "default".
//     compaction-splines   W7: SPLINES with every strategy x constraints (as above) over tests/layered/splines/hyperedges/* and
//                          tests/layered/hyperedge_merging/*; variant "<strategy>-<constraints>" and "default".
//     components-compaction connected_components flat01 (SimpleRowGraphPlacer), all_four_port_sides and compound01..07
//                          (ComponentGroupGraphPlacer; "off", "on", "on-<DIRECTION>-<ROUTING>"), all_four_port_sides with
//                          considerModelOrder.components GROUP_MODEL_ORDER (ComponentGroupModelOrderGraphPlacer, variant
//                          "group-model-order-<DIRECTION>"), and four inline compound graphs with external ports on four sides, eight
//                          ports, north/south and east/west only plus free components ("inline-<name>": "compaction-<DIRECTION>",
//                          "group-model-order-<DIRECTION>", DIRECTION RIGHT and DOWN).
//     converted            W4: full/converted/labels/ticket-213_componentsCompaction: the input and (empty) options of the row
//                          full/labels/ticket-213_componentsCompaction/default that layered-labels.json refused.
//     issues               Issue433Test, Issue444Test, Issue463Test, Issue870Test: the ticket inputs, default configuration.
//
// Group models, id models/<model>/<target or root>/<stop>/<variant> (7e's rows; stops of this brief): the stops SELF_LOOP_PREPROCESSOR,
//   SELF_LOOP_PORT_RESTORER, SELF_LOOP_ROUTER, SELF_LOOP_POSTPROCESSOR (variant "default", and LEFT, DOWN, UP on self_loops-hyperLoops,
//   self_loops-south and ticket-418), SINGLE_EDGE_GRAPH_WRAPPER ("single-edge", "single-edge-msd"), BREAKING_POINT_INSERTER, _PROCESSOR,
//   _REMOVER ("multi-edge", "multi-edge-msd", "multi-edge-manual") on the five wrapping models (preserve_order simpleLongEdges01, longConflictingExample, timedAutomaton, ptolemy router, randomwalk), and HORIZONTAL_COMPACTOR ("default" and
//   "<strategy>-<constraints>" lower case) on the seven compaction models, for every level whose plan has the stop (a stop not in the
//   plan skips the row and is counted on stderr). The pinned row's model (W4): ptolemy-sinewaveoptimization level N1, EVERY member of
//   its plan as a stop (a phase as P1..P5), variant "DOWN" (the options of the pinned row: direction DOWN, no components split).
//   expected as 7e/7f (layers, layerless, hidden, edges, ports, changed, geometry, dump under ten nodes) with the changes below.
//
// Group scenarios, id scenarios/<Class>/<name>[/<dir>][/end]: inline graphs (3-16 nodes), importGraph, normalise, then every plan member
//   in order up to the stop (runProcessor for an intermediate member, runPhase for P1-P5), dump last; "/end" rows run the whole plan.
//     SelfLoopPreProcessor, SelfLoopPortRestorer, SelfLoopRouter, SelfLoopPostProcessor: node a (80 x 80) between n0 and n2 with a bypass b
//       and the loops: side pairs e-e, w-w, n-n, s-s, n-s, e-w, same-port (all four directions), hyper loops over three or more ports (east,
//       north/east/south, west), several and nested loops, parallel loops, mixed sides, FREE ports, FIXED_ORDER, FIXED_POS ports, loops with
//       center/head/tail labels, port labels, a node with only loops, two nodes with loops, POLYLINE and SPLINES routing, every
//       selfLoopDistribution x selfLoopOrdering value.
//     DummySelfLoopProcessor (W3): the 16 side pairs (N, E, S, W)^2 on one node in RIGHT, five pairs in LEFT, DOWN, UP, several loops in
//       one layer, a hyper loop, loops on two nodes. The plan WITHOUT the SELF_LOOP_* arms (they hide the self loops the processor works
//       on), the op ["processor", "DummySelfLoopProcessor"] in front of NORTH_SOUTH_PORT_PREPROCESSOR (or the first P3 member when the
//       plan has none: the Javadoc of NorthSouthPortPreprocessor.java:110-140 wants it before that processor), the row ends there
//       (<name>) or runs the rest of the plan (<name>/end; for north/south loops this reaches NorthSouthPortPostprocessor.processSelfLoop).
//     BreakingPointInserter, BreakingPointProcessor, BreakingPointRemover, SingleEdgeGraphWrapper: the graphs chain (12 nodes, three skip
//       edges), ladder (16 nodes), chain-loop (a self loop on the fifth node), chain-labels (center labels) with wrapping.strategy
//       MULTI_EDGE / SINGLE_EDGE and wrapping.cutting.strategy ARD, MSD, MANUAL (the cuts [2, 4, 6] as a setProperty step on g0 after
//       importGraph, since a List<Integer> option has no ELK JSON form); every direction on chain and ladder with MSD.
//     HorizontalGraphCompactor: the graphs dag, comments (comment boxes), ns-ports (north/south ports), labels with every strategy and
//       constraints, ORTHOGONAL and SPLINES, EDGE_LENGTH and LEFT_RIGHT_CONNECTION_LOCKING in all four directions.
//     ComponentsCompactor: terminal step ["layout"] over the compound node "c" (importGraph target "c") with compaction.connectedComponents,
//       external ports (four sides, eight ports, north/south), ComponentGroupGraphPlacer and ComponentGroupModelOrderGraphPlacer in
//       every direction; a flat graph with components under the SimpleRowGraphPlacer for the three routings.
//   STEP OPS (JSON arrays; the rows use importGraph, normalise, setProperty, runProcessor, runPhase, processor, layout, dump):
//     ["importGraph", target]  ["normalise"]  ["setProperty", path, id, C4 value]  ["runProcessor", member]  ["runPhase", phase, strategy]
//     ["layout"] (terminal: imported graph dump plus "layout", the export after a LayeredLayoutProvider run)  ["dump"] (terminal)
//     ["processor", "<SimpleClassName>"] (W3): runs ONE processor that no IntermediateProcessorStrategy member creates, with a fresh
//       BasicProgressMonitor, at its position in the step list; the only name is "DummySelfLoopProcessor" (any other is a recorder bug).
//
// What changes in a dump (every row, W3): (a) the property selfLoopHolder (InternalProperties.SELF_LOOP_HOLDER) is NOT recorded under
//   changed / dump properties (reflected, the nested SelfLoopHolder graph was about one megabyte per node); expected.selfLoops holds it
//   instead, present on a row only when a node has the property: { "<node path>": { portsHidden, slotCounts [routing slot count per
//   PortSide ordinal], ports: [{ port, hadOnlySelfLoops, hidden }] in SelfLoopHolder.getSLPortMap() order, loops: [{ type, ports,
//   edges (getSLEdges() order), occupiedSides, slots [getRoutingSlot per PortSide.values()], leftmost, rightmost, labels: null |
//   { labels, side, alignment, size, position, reference } }] } }, elements as paths of the row's path map (hidden ports and removed
//   edges keep their baseline paths). (b) geometry carries ports and labels for the nine stops of this brief (PORT_LABEL_STOPS).
//   Every other rule is the labels recorder's: breakingPoint.info and other ELK objects are reflected by the Encoder as before.
//
// Option values the TS replay registry needs (C4 enum types): WrappingStrategy (OFF, SINGLE_EDGE, MULTI_EDGE), CuttingStrategy (ARD, MSD,
//   MANUAL), ValidifyStrategy (NO, GREEDY, LOOK_BACK), GraphCompactionStrategy (NONE, LEFT, RIGHT, LEFT_RIGHT_CONSTRAINT_LOCKING,
//   LEFT_RIGHT_CONNECTION_LOCKING, EDGE_LENGTH), ConstraintCalculationStrategy (QUADRATIC, SCANLINE), SelfLoopDistributionStrategy
//   (EQUALLY, NORTH, NORTH_SOUTH), SelfLoopOrderingStrategy (STACKED, REVERSE_STACKED, SEQUENCED), ComponentOrderingStrategy (NONE,
//   MODEL_ORDER, GROUP_MODEL_ORDER), plus Direction and EdgeRouting. Non-enum options: wrapping.cutting.cuts and
//   wrapping.validify.forbiddenIndices (C4: a JSON array of {t:int,v}), wrapping.multiEdge.improveCuts / improveWrappedEdges (bool),
//   wrapping.multiEdge.distancePenalty, wrapping.correctionFactor, wrapping.additionalEdgeSpacing (double), wrapping.cutting.msd.freedom
//   (int), compaction.connectedComponents (bool).
//
// Size (journaled trims, LOOPS_STATS=1 prints the bytes per family): the unrestricted grid is about 70 MB. Trims, all of variants, never
//   of models: the SelfLoopHolder summary replaces the reflected holder; direction variants of the self loop stops on three models; the
//   wrapping grid on five models and two inline graphs; QUADRATIC constraints on the two main strategies; POLYLINE only with EDGE_LENGTH;
//   scenario directions as above.
//
// Group sites (T20), id sites/<Class>/<name>[/<variant>]: one step row per scenario of plans/layered-loops-wrapping-compaction/unreached.md
//   (Sc1-Sc34) that an oracle graph reaches, recorded by the same step interpreter and ops as the scenarios (no new op): the chain up to the
//   plan member that decides the arm (setProperty steps on g0 for the cuts and the forbidden indices) and a dump, or importGraph, normalise
//   and the terminal layout of the imported graph (nested level c: the import target). Rows are appended after the scenarios, so no earlier
//   row changes. Sc22 (the DummySelfLoopProcessor plan under POLYLINE and SPLINES) is recorded here too: sites/DummySelfLoopProcessor/...
//   Scenarios no graph reaches are not recorded (Sc25, Sc28, Sc34; arms of Sc12, Sc22, Sc26): the verdicts are in the T20 journal entry.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 so identity-hashed collections iterate in
//   insertion order (AD-10; up to 10 entries, then HashMap treeifies); main fails without it. The seed properties are those of
//   tools/oracle/run.sh (export and identifier seed 1) so exported ids agree with refs/elk (F4). No row sets a random seed of 0.
//
// Diagnosis aids (environment, output unchanged when unset): LOOPS_FILTER=<text> builds only rows whose id contains the text (no coverage
//   check, one build); LOOPS_DISCOVER=1 prints refusals instead of stopping; LOOPS_MARKERS=1 writes "ROW <id>" to stdout per row;
//   PHASE_TRACE=1 one stderr line per row; LOOPS_STATS=1 prints the bytes per row family and model; LOOPS_CAP_MB=<n> raises the size cap
//   for a measuring run (never for the ref).
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
import org.eclipse.elk.alg.layered.ElkLayered;
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
import org.eclipse.elk.alg.layered.intermediate.DummySelfLoopProcessor;
import org.eclipse.elk.alg.layered.intermediate.IntermediateProcessorStrategy;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfHyperLoop;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfHyperLoopLabels;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopEdge;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopHolder;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopPort;
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
import org.eclipse.elk.alg.layered.InteractiveLayeredGraphVisitor;
import org.eclipse.elk.alg.layered.intermediate.LabelManagementProcessor;
import org.eclipse.elk.alg.layered.options.CenterEdgeLabelPlacementStrategy;
import org.eclipse.elk.alg.layered.options.EdgeLabelSideSelection;
import org.eclipse.elk.core.labels.ILabelManager;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.util.IElkProgressMonitor;
import org.eclipse.elk.core.util.LoggedGraph;

public class LayeredLoopsVectors {
    static final String ELK_COMMIT = "e7eaea5747f2e5187a7b83cfdc256b501ca00d3c";
    static final String OUTPUT = "layered-loops.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed", REPO_PREFIX = "repo:";
    static final String INPUTS = "test/golden/inputs/";
    /** Directories under INPUTS that hold a copy of the models repository's layout; the model path is the part after them. */
    static final List<String> INPUT_ROOTS = List.of("labels/", "loops/", "pipeline/");
    static final int MAX_DEPTH = 8, FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = (System.getenv("LOOPS_CAP_MB") == null ? 16L : parseLongArg("LOOPS_CAP_MB", System.getenv("LOOPS_CAP_MB"))) * 1024 * 1024; // LOOPS_CAP_MB: diagnosis aid, the committed output stays under 16 MiB
    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING", P3 = "P3_NODE_ORDERING", P4 = "P4_NODE_PLACEMENT", P5 = "P5_EDGE_ROUTING";
    /** The SelfLoopHolder property: reflected, it is about one megabyte per node (a nested object graph), so it is recorded as expected.selfLoops. */
    static final String SELF_LOOP_HOLDER_ID = InternalProperties.SELF_LOOP_HOLDER.getId();
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings", "splines.route.start", SELF_LOOP_HOLDER_ID); // the spline route is recorded in geometry.splines (R3), the holder in selfLoops (W3)
    /** The refusal categories W3 allows (the members the recorder refuses), with the owning mission: 7h only. */
    static final Map<String, String> REFUSAL_CATEGORIES = new TreeMap<>();
    static {
        REFUSAL_CATEGORIES.put("INCLUDE_CHILDREN", "nested graphs (7h)");
        REFUSAL_CATEGORIES.put("HIERARCHICAL_NODE_RESIZER", "nested graphs (7h)");
    }
    static final int MAX_HASH_ORDER_SOURCES = 10;
    static int maxBfsSources = 0;
    static volatile String currentRow = "?";
    static final Map<String, Integer> REFUSED_BY_CATEGORY = new TreeMap<>();
    static final Map<String, Integer> NOT_IN_PLAN = new TreeMap<>();
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
    /** W3: the nine arms of this brief (7g). */
    static final List<String> SELF_LOOP_STOPS = List.of("SELF_LOOP_PREPROCESSOR", "SELF_LOOP_PORT_RESTORER", "SELF_LOOP_ROUTER",
            "SELF_LOOP_POSTPROCESSOR");
    static final List<String> MULTI_EDGE_STOPS = List.of("BREAKING_POINT_INSERTER", "BREAKING_POINT_PROCESSOR", "BREAKING_POINT_REMOVER");
    static final String SINGLE_EDGE_STOP = "SINGLE_EDGE_GRAPH_WRAPPER", COMPACTOR_STOP = "HORIZONTAL_COMPACTOR";
    static final Set<String> SEVEN_G = Set.of("SELF_LOOP_PREPROCESSOR", "SELF_LOOP_PORT_RESTORER", "SELF_LOOP_ROUTER",
            "SELF_LOOP_POSTPROCESSOR", "BREAKING_POINT_INSERTER", "BREAKING_POINT_PROCESSOR", "BREAKING_POINT_REMOVER",
            "SINGLE_EDGE_GRAPH_WRAPPER", "HORIZONTAL_COMPACTOR");
    /** The routers a P5 stop can name (EdgeRouting.UNDEFINED shares the orthogonal router and is never recorded). */
    static final List<EdgeRouting> ROUTINGS = List.of(EdgeRouting.ORTHOGONAL, EdgeRouting.POLYLINE, EdgeRouting.SPLINES);
    /** N3 + G2: the stops whose rows carry the ports and labels geometry (besides rows with a flexible node); labelSizes only on SEVEN_F2. */
    static final Set<String> PORT_LABEL_STOPS = new HashSet<>(Set.of("LABEL_AND_NODE_SIZE_PROCESSOR", "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR"));
    static {
        PORT_LABEL_STOPS.addAll(SEVEN_F2);
        PORT_LABEL_STOPS.addAll(SEVEN_G); // the self loop, wrapping and compaction arms move ports and labels
    }

    // SHA-256 of every vendored input read, "<sha256>  repo:<path under the repo root>". Keep these lines: the shell
    // script parses them (grep for 64 hex digits, two spaces, "repo:"). The table is the list of every model of this recorder: the
    // model path is the part after inputs/ (and after labels/, loops/ or pipeline/, the directories that mirror the models repository).
    static final String MODEL_TABLE = """
baf8158831ca83d2a057d68ebec643a1a285607c910ba9339f43d5042aafb88d  repo:test/golden/inputs/labels/tests/layered/compaction_oned/hierarchical_ports/hports1.elkt
62829d8cdad4d7f3723998ba212c7b121234bc739fff41dcdda4da1c3dbd32f4  repo:test/golden/inputs/labels/tests/layered/connected_components/compound01.elkt
35d6a522ae9b9423f72a5c9200072ba51563e4b520f6a24b7bb3e7c3158caad5  repo:test/golden/inputs/labels/tests/layered/connected_components/compound02.elkt
4b52133344f4a678ee6bf29c27c7fd9e1725a96a0474bd07b6c90d59d45af47a  repo:test/golden/inputs/labels/tests/layered/connected_components/compound03.elkt
a9ef14dea1e007f0189561caf7bf5311d36a82197dcafd98e469d68bf4aed2b8  repo:test/golden/inputs/labels/tests/layered/connected_components/compound04.elkt
42b04dabe75d53f85988c441c18254a22ab2a32fe50fbbd726963b36cc613ebd  repo:test/golden/inputs/labels/tests/layered/connected_components/compound05.elkt
ca7130b3755aecf5b8f157c004108c94dc9d933492428174c50173715e379efc  repo:test/golden/inputs/labels/tests/layered/connected_components/compound07.elkt
4df035d742bb5b5c2a587f66fbdcb185b7b0c9f806cf87e7daeb33b941100e2f  repo:test/golden/inputs/labels/tests/layered/connected_components/flat01.elkt
ce2112306749ed9d9b72cb49551b4ee06693c35948bf80e08779451676dd57b3  repo:test/golden/inputs/labels/tickets/layered/213_componentsCompaction.elkt
1c83d9a85faefc2aa1318d135f5ab1ba63086c425effd71a003c4a6f70e1209a  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/backtrack_trialmodule_TrialModule.json
6fc29196ccbb63de20413537ddf532c6a31017cee1f905ee95ca10a508e8a398  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ca_conwayrandom_ConwayRandom.json
24d7fda72c3b8161134d2eec4951263214aaf4d25dc922103f1c40886155da9c  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ddf_eratosthenes_Eratosthenes.json
1f100ccec0400a2efdda58a1debff09bce95c0253dbd256c67cc1c1401b804d1  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ptera_trafficlight_TrafficLight.json
03df4af8d24b6611becfb5125ea68ea022cc04b1a5797beeeb9f3a774989d474  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ptolemy_brewery_Brewery.json
25f09f4bea569580d312f48e22b75db3d02f47b2499cbf61e2e6ace6236c37a0  repo:test/golden/inputs/loops/realworld/ptolemy/flattened/ptolemy_probabilisticmodels_ChannelFaultModel.json
40cd0886cd688d3f1843fe69010773ebabbadb3466c66d5060cc29519ee40127  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/edgeLabelAndSplines.elkt
4857cd3fa71681d509839d9f366985938e5245530e09edc9991154739cba0372  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/edgeLabelShouldBeCentered.elkt
8233fd2d987b2a50f3c0ebc7244dfde0523cbc25514b53d3e7bb88fa3c9c836c  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/edgeLabelSideSelection01.elkt
0df3b9ca8d225d5330152566bf365c9dbd81d467a6e31be951560544198d31ec  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/labels1.elkt
eb9c06b9a4fecba16f3ecf41a2f2ebbf5599316d2a78fa3a948786182ab03e15  repo:test/golden/inputs/loops/tests/layered/compaction_oned/labels/labels2.elkt
b8a46251666118ab7b698d8cda13f00d6ce92130518da7524a9e078b4a48d008  repo:test/golden/inputs/loops/tests/layered/compaction_oned/nsport/south_port.elkt
43eec7ee4aac8fe2ec7db9952cda0635ffe9519b386e2bbd51547b7e82d250f3  repo:test/golden/inputs/loops/tests/layered/compaction_oned/selfloop/selfloop_crash.elkt
3b64c2454a6f2d7f09756cf37d7cb6e85389207d6edb0327eb468a38560fe740  repo:test/golden/inputs/loops/tests/layered/compaction_oned/selfloop/selfloop_orthogonal.elkt
744b7429099c8bd2e520d372cf50960ec6ed89363a273e7fe764bc8c687a1ae8  repo:test/golden/inputs/loops/tests/layered/compaction_oned/selfloop/selfloop_spline.elkt
07599a704c0c390f6cec7b24e9b94a33b23c2ed178baff4ada71713691a0d402  repo:test/golden/inputs/loops/tests/layered/compaction_oned/splines/moreThanOneStraightSegmentPath.elkt
71d29a43907866b2e4480e0f11950f44fa48f3b3ecf9883462f3ddc2810f8e64  repo:test/golden/inputs/loops/tests/layered/compaction_oned/splines/moreThanOneStraightSegmentPath2.elkt
ba76bdedc5fac17b21b421aa452eff2fcc2fc1025d2dc310e9de26836921fd55  repo:test/golden/inputs/loops/tests/layered/connected_components/all_four_port_sides.elkt
be4432e044af040bbf605122abce5191d1a8c32c0398f85afd72038118020b57  repo:test/golden/inputs/loops/tests/layered/connected_components/compound06.elkt
e01cbc88fe04dea7ba33f638117ac38a9d1f400f7b463d0a92b6efa9d7d22acf  repo:test/golden/inputs/loops/tests/layered/self_loops/fixedSide.elkt
98c95311b0338e544f0012a6b360ccc60481e42e1bf614053cb58cc3012034be  repo:test/golden/inputs/loops/tests/layered/self_loops/free.elkt
5562f0070f81eca2dbf3255e4fee7e31387cd81ee945d33344a9a53c0e4f8aa7  repo:test/golden/inputs/loops/tests/layered/self_loops/hyperLoops.elkt
bdcd7c2aec80ace521a0d1078b36415a819d48eb5c4264a07649a99ad5277b48  repo:test/golden/inputs/loops/tests/layered/self_loops/inside_outside.elkt
b35c1e4e70c564c6f7135c6cb33e30d4996ae65d45c7da22a0d7d0cb0b48ecfc  repo:test/golden/inputs/loops/tests/layered/self_loops/label.elkt
6ad82549e3f651ada0bb754de8a9145c15f6114144eafcbcca65ddb453e928c3  repo:test/golden/inputs/loops/tests/layered/self_loops/south.elkt
8a69ac97f5a8d58d666b0b4f01b128e7b8e5325a35e4439b6e7265f370d142a9  repo:test/golden/inputs/loops/tickets/layered/079_selfLoopLabels.elkt
2de0f2034ee94c7635100a46700be5b465626b25fc00a1df3144f7512919ad9a  repo:test/golden/inputs/loops/tickets/layered/128_selfLoopLabelSpacing_complex.elkt
d0b06deea3a57d8665abcbf46b54f327e2a2189aff20bf09fb4c3097fb5ce45e  repo:test/golden/inputs/loops/tickets/layered/128_selfLoopLabelSpacing_simple.elkt
173ce8736616ea3770ffd746f40d6c4b4a8007b3be7dc693b9317a090a9bee41  repo:test/golden/inputs/loops/tickets/layered/302_brokenSplineSelfLoops.elkt
bd51cb9da91baed348b762426050cceb4eac1271ff9fc6cab13960ab076af598  repo:test/golden/inputs/loops/tickets/layered/340_classCastExceptionGreedySwitch.elkt
87b2633a34d7ae5f53b74fb9f8e8cb67e528dafb888b56e695cb6a5002450290  repo:test/golden/inputs/loops/tickets/layered/360_badSelfLoopLabelPlacement.elkt
7bf41603ffa5b9fe675c50aac1cb1329757726473cb14f822016f1075d36a981  repo:test/golden/inputs/loops/tickets/layered/368_selfLoopLabelsIOOBE.elkt
fa2da4f4b9bebc51ba79d5685806a4f3037467c6f6966a7e235a43b41e7aed44  repo:test/golden/inputs/loops/tickets/layered/403_stackedSelfLoopLabels.elkt
5cfa58ad61b88a859f3ed3ce8667ef73956fc3867ec39fc130867974111ea403  repo:test/golden/inputs/loops/tickets/layered/416_longSelfLoops.elkt
34130b6eb753e8f34d3e4ee6041909bb0c38b98ea26cb6f2889077bbd2001d4d  repo:test/golden/inputs/loops/tickets/layered/418_northPortsWithSelfLoops.elkt
465a89b33d88582c7a467c5d82ae1888b8a2d3095691901998110394afad6df5  repo:test/golden/inputs/loops/tickets/layered/419_northSelfLoopsAndRegularEdges.elkt
42f217f05a54e953127635cace59551f6874b1fb3af89ba8e6779c7087fb4684  repo:test/golden/inputs/loops/tickets/layered/433_graphSizeWithSelfLoopLabel.elkt
1c96e4e624e5368ce72969e53c3ef0a65791b5164ce3c6cf6d32534fc0e05a1b  repo:test/golden/inputs/loops/tickets/layered/444_selfLoopsNPE.elkt
7bc67fe6cacec988481bc0ff3c4b67b6a89e17c04f637dc48bd4fcb0b28da83e  repo:test/golden/inputs/loops/tickets/layered/463_aioobe_with_self_loops.elkt
c8774eb4067211ee046580f881a339794ca64a14249c5b1b7a3d36214d6caf01  repo:test/golden/inputs/loops/tickets/layered/870_networkSimplexNodePlacer.elkt
a78212a04054c839dce3f947456062160c5d668370c43a0945e0e395d865c57b  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json
ce3418acfa52e7afca791ec96756021d02268d6996185bc588e974e00c702f70  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_afdx_AFDXMulticastSimple.json
8d3f9d6477c3849c5406992c893b0d365cab19e225802d0442b47a3bb537c3c2  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_clockdrift_ClockDriftHierarchy.json
7a3828beab03773ed1e6acac596c7ef2d7fc7038ce36af07da2ebcf69eaf04a7  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_switch_CrossbarSwitch.json
83193114e73feb7aafee5bff340ec96aa7c9925244bd4d0db0861a44c7e7dc4a  repo:test/golden/inputs/realworld/ptolemy/flattened/continuous_levelcrossingdetector_LevelCrossingDetector.json
89c039382505a18941c9441f26c7f7ef654e1bccc649a413ba280ef2a942a0a5  repo:test/golden/inputs/realworld/ptolemy/flattened/ddf_randomwalk_RandomWalk.json
a047cb61956067337c91aa2d9aff3d86902817e3dcdf80a0c3c7552d31d998f1  repo:test/golden/inputs/realworld/ptolemy/flattened/de_router_Router.json
6f30f5a5f316c40eaf2536869477d40af063608a5243e63df6eb20742fbfd745  repo:test/golden/inputs/realworld/ptolemy/flattened/hlacerti_multidatatypes_producer.json
2c7d5115b347e663f35906eb3f5ecff3535405fa3c7d46373d9a33b567d4a5dc  repo:test/golden/inputs/realworld/ptolemy/flattened/pthales_dynamic_ThalesDynamicModalModelPN.json
2d1317aa12c8e43668a681b79af12002f3da3e35efd70b6e841153e7658a1381  repo:test/golden/inputs/realworld/ptolemy/hierarchical/de_compositeqm_CheckExecutionTimeConstraints.json
1cd5f7c806664cf80e1a7d1a81fe0a9b5c2d22d532367a46127f9bc19d932ca4  repo:test/golden/inputs/realworld/ptolemy/hierarchical/gt_sinewaveoptimization_SinewaveOptimization.json
55668b77428b4b4cf28704a02cf6953683b263222b6978e1602db80aacc6fde1  repo:test/golden/inputs/realworld/ptolemy/hierarchical/hoc_threadedcomposite_MulticoreExecution.json
438ef5a74dadd23bbe7faff63f012e03d99dc8f49477ca2341176b5d8de4d075  repo:test/golden/inputs/realworld/ptolemy/hierarchical/sdf_htvq_HTVQ4.json
e01f73a626343e3bdd04bc53df7a071aff002dffa9a1d2e7d187f258f26e6c18  repo:test/golden/inputs/tests/layered/hyperedge_merging/hyperedge_labels.elkt
e83d20235f71efdb5457912ce8ce511769bffa6aeec6b55028d560939102f9b2  repo:test/golden/inputs/tests/layered/hyperedge_merging/hyperedges01.elkt
c5a03df0bd66d97aa5366a95a92190beb9ad4cca41e178c18f364ce7afa8913f  repo:test/golden/inputs/tests/layered/hyperedge_merging/inverted_ports.elkt
9edf4186fc3b8dad415ff631fe8110b24aed8989c9b1658d9971e0fd7626a1c4  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_01.elkt
16a029cc17643b42dd5e0e79e64a6fe093ce343c5bff76742a6ac9b8dbd36dde  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_02.elkt
f1880960129542711274042d8979bb3c61e5d8c998635ce3d3425bca312aee66  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_03.elkt
c8e464721526830bd48744a2b33c6ad9492dd16ee1991428152592607caa97fd  repo:test/golden/inputs/tests/layered/hyperedge_merging/unequal_src_tgt.elkt
4248ffd82104950274cf5cedb5db9da7eea69e60f91a03a6af0efd484e1767c1  repo:test/golden/inputs/tests/layered/hyperedge_merging/unequal_src_tgt_with_labels.elkt
46ec2d3ee84d7e6a34cc4639818c923f32bb9132a574a26553f17ecd3e327aab  repo:test/golden/inputs/tests/layered/preserve_order/longConflictingExample.elkt
6a079c8ed64b9ce9b9bc531517be6bb8cc86d759d4fe869ae291e74c9b5eb4f3  repo:test/golden/inputs/tests/layered/preserve_order/noCrossings.elkt
163d8b2d720cd453c48f12e7fc5715c1bea73523ddeaf6552fae438f13627a74  repo:test/golden/inputs/tests/layered/preserve_order/simpleLongEdges01.elkt
9be7c4c086ff3d4539116c99f27dc018d98040d2738c54ef893dd5099211e357  repo:test/golden/inputs/tests/layered/preserve_order/simpleLongEdges02.elkt
33e5d6d148f0bf7e02b654d1073351ee088005a75344b676552df267351d5ce3  repo:test/golden/inputs/tests/layered/preserve_order/timedAutomaton.elkt
fcde69b053e5fa8b6fa07258d3643424e6138006bfe90bf41db1936fcf0ddcfc  repo:test/golden/inputs/tests/layered/preserve_order/timedAutomatonMoreEdges.elkt
aade476173d1f260bc0f10e2431e4e6e36965c93bd109933f8359745de161700  repo:test/golden/inputs/tests/layered/splines/hyperedges/hyperedges_1.elkt
bf0f9655c77c6ca7e4672130cc39c2e7350120087f76e45683785458ebcbbb2b  repo:test/golden/inputs/tests/layered/splines/hyperedges/hyperedges_2.elkt
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
        Dump(LGraph root, boolean elkIds) {
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
                        && !entry.getKey().getId().equals(SELF_LOOP_HOLDER_ID)) { // R3: see geometry.splines; W3: see expected.selfLoops
                    m.put(entry.getKey().getId(), enc.encode(entry.getValue(), 0));
                }
            }
            return m;
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
                    items.sort(Comparator.comparing(LayeredLoopsVectors::json));
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
        if (c4 instanceof List<?> l) { return l.stream().map(LayeredLoopsVectors::decode).toList(); } // T11: a list value (the in-layer successor constraints)
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
        Object value = decode(c4);
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
        Map<String, Object> selfLoops = selfLoops(paths, nodes);
        if (!selfLoops.isEmpty()) {
            m.put("selfLoops", selfLoops);
        }
        return m;
    }

    static List<Object> pathList(Map<Object, String> paths, Collection<? extends Object> elements) {
        List<Object> l = new ArrayList<>();
        elements.forEach(e -> l.add(pathOf(paths, e)));
        return l;
    }

    static List<Object> slots(int[] slots) {
        List<Object> l = new ArrayList<>();
        for (int v : slots) {
            l.add(v);
        }
        return l;
    }

    /** W3: the SelfLoopHolder of every node that has one, through its public accessors (node path -> holder summary, see the header). */
    static Map<String, Object> selfLoops(Map<Object, String> paths, List<LNode> nodes) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (LNode n : nodes) {
            if (!n.hasProperty(InternalProperties.SELF_LOOP_HOLDER)) {
                continue;
            }
            SelfLoopHolder holder = n.getProperty(InternalProperties.SELF_LOOP_HOLDER);
            Map<String, Object> h = new LinkedHashMap<>();
            h.put("portsHidden", holder.arePortsHidden());
            h.put("slotCounts", slots(holder.getRoutingSlotCount()));
            List<Object> ports = new ArrayList<>();
            for (SelfLoopPort slPort : holder.getSLPortMap().values()) {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("port", pathOf(paths, slPort.getLPort()));
                pm.put("hadOnlySelfLoops", slPort.hadOnlySelfLoops());
                pm.put("hidden", slPort.isHidden());
                ports.add(pm);
            }
            h.put("ports", ports);
            List<Object> loops = new ArrayList<>();
            for (SelfHyperLoop loop : holder.getSLHyperLoops()) {
                loops.add(selfHyperLoop(paths, loop));
            }
            h.put("loops", loops);
            result.put(pathOf(paths, n), h);
        }
        return result;
    }

    static Map<String, Object> selfHyperLoop(Map<Object, String> paths, SelfHyperLoop loop) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", loop.getSelfLoopType() == null ? null : loop.getSelfLoopType().name());
        m.put("ports", pathList(paths, loop.getSLPorts().stream().map(SelfLoopPort::getLPort).toList()));
        m.put("edges", pathList(paths, loop.getSLEdges().stream().map(SelfLoopEdge::getLEdge).toList()));
        m.put("occupiedSides", names(loop.getOccupiedPortSides()));
        List<Object> slot = new ArrayList<>();
        for (PortSide side : PortSide.values()) {
            slot.add(loop.getRoutingSlot(side));
        }
        m.put("slots", slot);
        m.put("leftmost", loop.getLeftmostPort() == null ? null : pathOf(paths, loop.getLeftmostPort().getLPort()));
        m.put("rightmost", loop.getRightmostPort() == null ? null : pathOf(paths, loop.getRightmostPort().getLPort()));
        SelfHyperLoopLabels labels = loop.getSLLabels();
        if (labels == null) {
            m.put("labels", null);
        } else {
            Map<String, Object> lm = new LinkedHashMap<>();
            lm.put("labels", pathList(paths, labels.getLLabels()));
            lm.put("side", labels.getSide() == null ? null : labels.getSide().name());
            lm.put("alignment", labels.getAlignment() == null ? null : labels.getAlignment().name());
            lm.put("size", pair(labels.getSize()));
            lm.put("position", pair(labels.getPosition()));
            lm.put("reference", labels.getAlignmentReferenceSLPort() == null ? null : pathOf(paths, labels.getAlignmentReferenceSLPort().getLPort()));
            m.put("labels", lm);
        }
        return m;
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

    /** G6: the label manager of kind "shrink-width" (see the header): shrinks a wider label to the target width and keeps its height. */
    static final class ShrinkWidthManager implements ILabelManager {
        @Override
        public KVector manageLabelSize(final Object label, final double targetWidth) {
            ElkLabel l = (ElkLabel) label;
            return l.getWidth() > targetWidth ? new KVector(targetWidth, l.getHeight()) : null;
        }
    }

    /** A monitor cancelled before the layout starts (a BasicProgressMonitor whose isCanceled is always true). */
    static final class CancelledMonitor extends BasicProgressMonitor {
        @Override
        public boolean isCanceled() {
            return true;
        }
    }

    static void collectLogged(IElkProgressMonitor m, List<LoggedGraph> out) {
        List<LoggedGraph> own = m.getLoggedGraphs();
        if (own != null) {
            out.addAll(own);
        }
        for (IElkProgressMonitor child : m.getSubMonitors()) {
            collectLogged(child, out);
        }
    }

    /** expected.logged: { tags, dot, json } over the monitor tree, depth first (see the header). */
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

    /**
     * The expected of a terminal step (layout, layoutCancelled, interactive, logging): phaseDump(base) of the imported (untouched) LGraph and
     * the exports (as CaseRunner.java:87-92) of the ELK node after new LayeredLayoutProvider().layout(<the imported ELK node>, monitor):
     * "layout1" (interactive: after the first run), "layout" and "logged" (logging).
     */
    static Map<String, Object> terminalDump(String op, Base base, LGraph graph) {
        ElkNode node = (ElkNode) graph.getProperty(InternalProperties.ORIGIN);
        LayeredLayoutProvider provider = new LayeredLayoutProvider();
        Object layout1 = null;
        BasicProgressMonitor logging = op.equals("logging") ? new BasicProgressMonitor().withLogging(true) : null;
        switch (op) {
            case "interactive" -> {
                provider.layout(node, new BasicProgressMonitor());
                layout1 = new Raw(export(node));
                new InteractiveLayeredGraphVisitor().visit(node);
                provider.layout(node, new BasicProgressMonitor());
            }
            case "logging" -> provider.layout(node, logging);
            default -> provider.layout(node, op.equals("layoutCancelled") ? new CancelledMonitor() : new BasicProgressMonitor());
        }
        Map<String, Object> expected = phaseDump(base);
        if (layout1 != null) {
            expected.put("layout1", layout1);
        }
        expected.put("layout", new Raw(export(node)));
        if (logging != null) {
            expected.put("logged", logged(logging));
        }
        return expected;
    }

    record Result(Map<String, Object> expected, List<Object> prefix) { }

    @SuppressWarnings("unchecked")
    static Base CURRENT; // the Base of the step row being run (decode resolves {ref} paths against it)

    /** Sets the label manager of the kind on the root (G6); true if one was set. */
    static boolean labelManager(ElkNode root, String kind) {
        switch (kind) {
            case NO_MANAGER:
                return false;
            case SHRINK:
                root.setProperty(LabelManagementOptions.LABEL_MANAGER, new ShrinkWidthManager());
                return true;
            default:
                throw new Bug("unknown label manager kind " + kind);
        }
    }

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
        boolean managerOnRoot = false;
        Map<String, Object> expected = null;
        for (int i = 0; i < steps.size(); i++) {
            List<Object> s = (List<Object>) steps.get(i);
            String op = (String) s.get(0);
            if (expected != null) {
                throw new Bug("step after dump: " + op);
            }
            if (!op.equals("importGraph") && !op.equals("labelManager") && graph == null) {
                throw new Bug("step " + op + " before importGraph");
            }
            switch (op) {
                case "labelManager" -> {
                    if (i != 0) {
                        throw new Bug("labelManager is the first step, before importGraph");
                    }
                    managerOnRoot = labelManager(root, (String) s.get(1));
                }
                case "importGraph" -> {
                    if (managerOnRoot && s.get(1) != null) {
                        throw new Bug("a label manager is set on the root: the import target must be null");
                    }
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
                case "processor" -> {
                    runOutsideProcessor(graph, (String) s.get(1));
                    need(base).stop = "processor/" + s.get(1);
                }
                case "runPhase" -> {
                    runPhase(graph, (String) s.get(1), (String) s.get(2));
                    need(base).stop = (String) s.get(1);
                }
                case "layout", "layoutCancelled", "interactive", "logging" -> {
                    if (i != steps.size() - 1) {
                        throw new Bug(op + " ends the row");
                    }
                    expected = terminalDump(op, base, graph);
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

    /** W3: the step op "processor": runs the one processor no IntermediateProcessorStrategy member creates, by simple class name. */
    static void runOutsideProcessor(LGraph g, String simpleName) {
        if (!simpleName.equals("DummySelfLoopProcessor")) {
            throw new Bug("processor " + simpleName + " is not a processor outside the enum");
        }
        new DummySelfLoopProcessor().process(g, new BasicProgressMonitor());
        RAN.add("processor/" + simpleName);
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
        if (names == null && processor.getClass().getName().startsWith("org.eclipse.elk.alg.layered.compound.")) {
            return "INCLUDE_CHILDREN"; // CompoundGraphPre/Postprocessor: only doCompoundLayout notifies them (7h)
        }
        if (names == null) {
            return "UNNAMED/" + processor.getClass().getName(); // a P4/P5 phase or a later processor: never allowed
        }
        if (names.equals(List.of("DIRECTION_PREPROCESSOR", "DIRECTION_POSTPROCESSOR"))) {
            return names.get(0); // GraphTransformer: a stop never reaches the post-processor, the last processor of the plan
        }
        if (names.stream().allMatch(REFUSAL_CATEGORIES::containsKey)) {
            return names.get(0); // e.g. the two LabelManagementProcessor arms: any refused member names the level's refusal
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
                || SEVEN_F2.contains(name) || SEVEN_G.contains(name) || name.startsWith(P1 + "/") || name.startsWith(P2 + "/") || name.startsWith(P3 + "/")
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

    /** A processor stop the assembled algorithm of the row does not contain (a models row, skipped and counted). */
    static final class NotInPlan extends RuntimeException {
        NotInPlan(String message) {
            super(message);
        }
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static Result runPipeline(Spec s, ElkNode root) {
        currentRow = s.id;
        ElkNode target = importTarget(root, s.target);
        s.options.forEach((id, c4) -> setProperty(target, id, c4));
        LGraph g = new ElkGraphTransformer().importGraph(target);
        Base base = new Base(g);
        if (g.getProperty(LayeredOptions.RANDOM_SEED) == 0) {
            throw new Bug("row " + s.id + ": random seed 0 (stop condition)");
        }
        ElkLayered layered = new ElkLayered();
        ElkLayered.TestExecutionState state = layered.prepareLayoutTest(g);
        if (state.getGraphs().size() != 1 || state.getGraphs().get(0) != g) {
            throw new Bug("row " + s.id + ": the graph was split into components");
        }
        base.snapshot();
        base.stop = s.stop;
        base.noteFlexible();
        var plan = layered.getLayoutTestConfiguration(state);
        String stop = stopName(s.stop, g);
        List<String> names = new ArrayList<>();
        int stopAt = -1;
        List<String> positional = positionalNames(plan);
        for (String name : positional) { // G2: the whole plan decides, never a prefix
            if (!allowed(name)) {
                throw new Refusal("row " + s.id + ": the plan names " + name + ", outside the ported sets", name);
            }
        }
        for (int i = 0; i < plan.size() && stopAt < 0; i++) {
            names.add(positional.get(i));
            stopAt = names.get(i).equals(stop) ? i : -1;
        }
        if (stopAt < 0) {
            throw new NotInPlan("row " + s.id + ": " + stop + " is not part of the algorithm " + names);
        }
        List<Object> prefix = new ArrayList<>(names.subList(0, stopAt + 1));
        for (int i = 0; i <= stopAt; i++) {
            if (names.get(i).equals(P1 + "/BFS_NODE_ORDER")) {
                guardBfsSources(g);
            }
            layered.runLayoutTestStep(state);
        }
        return new Result(phaseDump(base), prefix);
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
                s.group.equals("full") ? runFull(s, root)
                        : s.steps == null ? runPipeline(s, root) : new Result(runSteps(root, parsedSteps), null));
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
    static Row buildRow(Spec s) {
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
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", s.id);
        row.put("group", s.group);
        row.put("input", input);
        row.put("target", s.target);
        row.put("options", s.options);
        row.put("steps", stepsJson == null ? null : new Raw(stepsJson));
        row.put("prefix", first.prefix);
        row.put("expected", first.expected);
        return new Row(s.id, s.group, json(row));
    }

    static String clip(String s, String other) {
        int d = 0;
        while (d < s.length() && d < other.length() && s.charAt(d) == other.charAt(d)) {
            d++;
        }
        return "(at " + d + ") " + s.substring(Math.max(0, d - 200), Math.min(s.length(), d + 300));
    }

    /** A hierarchy level: its target id (null = root) and the node and edge counts of its flat import. */
    record Level(String target, int nodes, int edges) { }

    /** Every level (an ElkNode with children, pre-order) of the file; levels without edges are skipped (stderr). */
    static List<Level> levels(ModelFile f) {
        ElkNode root = loadFile(f.rel);
        List<String> targets = new ArrayList<>();
        targets.add(null);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                if (n.getIdentifier() == null || targets.contains(n.getIdentifier())) {
                    throw new Bug(f.rel + ": node id " + n.getIdentifier() + " is missing or not unique");
                }
                targets.add(n.getIdentifier());
            }
        }
        List<Level> levels = new ArrayList<>();
        for (String t : targets) {
            Base b = new Base(new ElkGraphTransformer().importGraph(importTarget(loadFile(f.rel), t)));
            if (b.edges.isEmpty()) {
                System.err.println("skipped level " + f.id + " " + (t == null ? "root" : t) + " (no edges)");
            } else {
                levels.add(new Level(t, b.nodes.size(), b.edges.size()));
            }
        }
        return levels;
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

    /** Refusals by option: INCLUDE_CHILDREN (7h; COMPACTION_CONNECTED_COMPONENTS is accepted since 7g, W3); a random seed of 0 is a stop. */
    static void refuseOptions(ElkNode root) {
        List<ElkNode> nodes = new ArrayList<>();
        nodes.add(root);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n) {
                nodes.add(n);
            }
        }
        for (ElkNode n : nodes) {
            if (n.getProperty(CoreOptions.HIERARCHY_HANDLING) == HierarchyHandling.INCLUDE_CHILDREN) {
                throw new Refusal("row " + currentRow + ": INCLUDE_CHILDREN at " + levelPath(n), "INCLUDE_CHILDREN");
            }
            if (!n.getChildren().isEmpty() && Integer.valueOf(0).equals(n.getProperty(LayeredOptions.RANDOM_SEED))) {
                throw new Bug("row " + currentRow + ": random seed 0 (stop condition) at " + levelPath(n));
            }
        }
    }
    /** One recursive layout of root with the plans of every level recorded (as 7f's runFull); the whole plan decides the refusal (G2). */
    static Map<String, Object> layoutOnce(Spec s, ElkNode root, IElkProgressMonitor monitor) {
        PlanRecorder recorder = new PlanRecorder();
        TestController controller = new TestController(LayeredOptions.ALGORITHM_ID);
        controller.addLayoutExecutionListener(recorder);
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

    /** A full row: options on the root, the recursive engine, the export and the plan of every level; modes "interactive" and "logging". */
    static Result runFull(Spec s, ElkNode root) {
        currentRow = s.id;
        s.options.forEach((id, c4) -> setProperty(root, id, c4));
        refuseOptions(root);
        Map<String, Object> expected = new LinkedHashMap<>();
        BasicProgressMonitor monitor = new BasicProgressMonitor();
        if ("logging".equals(s.mode)) {
            monitor.withLogging(true);
        }
        Map<String, Object> plans = layoutOnce(s, root, monitor);
        if ("interactive".equals(s.mode)) { // G5: lay out, apply the visitor, lay out again
            expected.put("layout1", new Raw(export(root)));
            new InteractiveLayeredGraphVisitor().visit(root);
            plans = layoutOnce(s, root, new BasicProgressMonitor());
        }
        expected.put("layout", new Raw(export(root)));
        expected.put("plans", plans);
        if ("logging".equals(s.mode)) {
            expected.put("logged", logged(monitor));
        }
        return new Result(expected, null);
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

    /** The names of the processors the assembled algorithm of the level holds (one import, nothing run), GraphTransformer by position. */
    static List<String> planNames(ModelFile f, String target, TreeMap<String, Object> options) {
        ElkNode t = importTarget(loadFile(f.rel), target);
        options.forEach((id, c4) -> setProperty(t, id, c4));
        LGraph g = new ElkGraphTransformer().importGraph(t);
        ElkLayered layered = new ElkLayered();
        return positionalNames(layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g)));
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

    static final List<String> DIRECTIONS = List.of("LEFT", "DOWN", "UP");
    static final List<String> ALL_DIRECTIONS = List.of("RIGHT", "LEFT", "DOWN", "UP");
    static final String LAST_PHASE_MARK = "/";
    /** The model of the pinned row of layered-pipeline.json (W4): every stop of the plan of its level N1 gets a fresh row. */
    static final String PINNED_MODEL = "ptolemy-sinewaveoptimization", PINNED_TARGET = "N1", PINNED_VARIANT = "DOWN";
    /** Models whose self loop stops also get direction variants (the others: default only). */
    static final List<String> SELF_LOOP_DIRECTION_MODELS = List.of("self_loops-hyperLoops", "self_loops-south", "ticket-418_northPortsWithSelfLoops");
    /** Models of the wrapping stop rows and full rows: long chains of the vendored inputs, a ptolemy subset. */
    static final List<String> WRAP_MODELS = List.of("preserve_order-simpleLongEdges01", "preserve_order-longConflictingExample",
            "preserve_order-timedAutomaton", "ptolemy-router", "ptolemy-randomwalk");
    /** Models of the compaction stop rows: the compaction_oned models, the spline hyperedge models (W7), a components model. */
    static final List<String> COMPACT_MODELS = List.of("compaction_oned-labels-labels1", "compaction_oned-nsport-south_port",
            "compaction_oned-selfloop-selfloop_crash", "compaction_oned-selfloop-selfloop_spline",
            "compaction_oned-splines-moreThanOneStraightSegmentPath", "splines-hyperedges-hyperedges_1", "hyperedge_merging-north_south_ports_01");
    static final List<String> COMPACTION_STRATEGIES = List.of("LEFT", "RIGHT", "LEFT_RIGHT_CONSTRAINT_LOCKING",
            "LEFT_RIGHT_CONNECTION_LOCKING", "EDGE_LENGTH");
    static final List<String> COMPACTION_CONSTRAINTS = List.of("SCANLINE", "QUADRATIC");
    static final List<String> WRAPPING_CUTTINGS = List.of("ARD", "MSD", "MANUAL");
    static final List<String> WRAPPING_VALIDIFIES = List.of("NO", "GREEDY", "LOOK_BACK");
    static final List<String> WRAPPING_STRATEGIES = List.of("SINGLE_EDGE", "MULTI_EDGE");

    /** One candidate row of a level: stop, variant and the options of the variant. */
    record Cand(String stop, String variant, TreeMap<String, Object> options) { }

    /** The manual cut indices of the MANUAL cutting rows, and the layer indices validify must not cut at. */
    static List<Object> ints(int... values) {
        List<Object> l = new ArrayList<>();
        for (int v : values) {
            l.add(tv("int", v));
        }
        return l;
    }

    static final List<Object> MANUAL_CUTS = ints(2, 4, 6), FORBIDDEN_INDICES = ints(3);

    /** The options of a wrapping variant: strategy, cutting, validify; MANUAL cutting carries MANUAL_CUTS. */
    static Object[] wrapping(String strategy, String cutting, String validify) {
        List<Object> kv = new ArrayList<>(List.of("WRAPPING_STRATEGY", E("WrappingStrategy", strategy), "WRAPPING_CUTTING_STRATEGY",
                E("CuttingStrategy", cutting), "WRAPPING_VALIDIFY_STRATEGY", E("ValidifyStrategy", validify)));
        if (cutting.equals("MANUAL")) {
            kv.addAll(List.of("WRAPPING_CUTTING_CUTS", MANUAL_CUTS));
        }
        if (!validify.equals("NO")) {
            kv.addAll(List.of("WRAPPING_VALIDIFY_FORBIDDEN_INDICES", FORBIDDEN_INDICES));
        }
        return kv.toArray();
    }

    static Object[] compaction(String strategy, String constraints) {
        return new Object[] {"COMPACTION_POST_COMPACTION_STRATEGY", E("GraphCompactionStrategy", strategy),
            "COMPACTION_POST_COMPACTION_CONSTRAINTS", E("ConstraintCalculationStrategy", constraints)};
    }

    static List<Cand> candidates(ModelFile f) {
        List<Cand> c = new ArrayList<>();
        for (String stop : SELF_LOOP_STOPS) {
            c.add(new Cand(stop, "default", opts()));
            if (SELF_LOOP_DIRECTION_MODELS.contains(f.id)) {
                for (String d : DIRECTIONS) {
                    c.add(new Cand(stop, d, opts("DIRECTION", E("Direction", d))));
                }
            }
        }
        if (WRAP_MODELS.contains(f.id)) {
            c.add(new Cand(SINGLE_EDGE_STOP, "single-edge", opts(wrapping("SINGLE_EDGE", "ARD", "NO"))));
            c.add(new Cand(SINGLE_EDGE_STOP, "single-edge-msd", opts(wrapping("SINGLE_EDGE", "MSD", "GREEDY"))));
            for (String stop : MULTI_EDGE_STOPS) {
                c.add(new Cand(stop, "multi-edge", opts(wrapping("MULTI_EDGE", "ARD", "NO"))));
                c.add(new Cand(stop, "multi-edge-msd", opts(wrapping("MULTI_EDGE", "MSD", "GREEDY"))));
                c.add(new Cand(stop, "multi-edge-manual", opts(wrapping("MULTI_EDGE", "MANUAL", "LOOK_BACK"))));
            }
        }
        c.add(new Cand(COMPACTOR_STOP, "default", opts()));
        if (COMPACT_MODELS.contains(f.id)) {
            for (String s : COMPACTION_STRATEGIES) {
                for (String k : COMPACTION_CONSTRAINTS) {
                    if (k.equals("SCANLINE") || s.equals("EDGE_LENGTH") || s.equals("LEFT_RIGHT_CONNECTION_LOCKING")) {
                        c.add(new Cand(COMPACTOR_STOP, (s + "-" + k).toLowerCase().replace('_', '-'), opts(compaction(s, k))));
                    }
                }
            }
        }
        return c;
    }

    /** "P1".."P5" name the configured phase, whose plan names read "P<n>_<PHASE>/<STRATEGY>". */
    static boolean inPlan(List<String> plan, String stop) {
        String phase = switch (stop) {
            case "P1" -> P1;
            case "P2" -> P2;
            case "P3" -> P3;
            case "P4" -> P4;
            case "P5" -> P5;
            default -> null;
        };
        return plan.stream().anyMatch(n -> n.equals(stop) || (phase != null && n.startsWith(phase + "/")));
    }

    /** The pinned model's level: one row per member of the plan (a phase as "P<n>"), options as the pinned row (direction DOWN). */
    static void pinnedRows(List<Spec> out, ModelFile f, Level lv) {
        TreeMap<String, Object> options = opts("DIRECTION", E("Direction", PINNED_VARIANT));
        for (String name : planNames(f, lv.target, options)) {
            int slash = name.indexOf(LAST_PHASE_MARK);
            out.add(pipeline(f, lv.target, slash < 0 ? name : name.substring(0, 2), PINNED_VARIANT, options));
        }
    }

    /** The rows of this brief's stops for one level (a stop outside the level's plan is skipped and counted). */
    static void stopRows(List<Spec> out, ModelFile f, Level lv) {
        Map<String, List<String>> plans = new HashMap<>();
        for (Cand c : candidates(f)) {
            List<String> plan = plans.computeIfAbsent(json(c.options), k -> planNames(f, lv.target, c.options));
            if (inPlan(plan, c.stop)) {
                out.add(pipeline(f, lv.target, c.stop, c.variant, c.options));
            } else {
                NOT_IN_PLAN.merge(c.stop, 1, Integer::sum);
            }
        }
        if (f.id.equals(PINNED_MODEL) && PINNED_TARGET.equals(lv.target)) {
            pinnedRows(out, f, lv);
        }
    }

    static void modelSpecs(List<Spec> out, List<Spec> fulls, List<ModelFile> files) {
        for (ModelFile f : files) {
            for (Level lv : levels(f)) {
                stopRows(out, f, lv);
            }
        }
        fullSpecs(fulls, files);
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

    // Group full: the families of this brief

    static Spec full(String family, String model, String variant, String path, String elk, TreeMap<String, Object> options, String mode) {
        return new Spec("full/" + family + "/" + model + "/" + variant, "full", path,
                path == null ? () -> ElkGraphJson.forGraph(elk).toElk() : null, null, options, null, null, mode);
    }

    static Spec full(String family, String model, String variant, String path, String elk, TreeMap<String, Object> options) {
        return full(family, model, variant, path, elk, options, null);
    }

    /** Models of the self loop family (ids from modelId): the self loop models, the compaction_oned self loop models, the tickets, ptolemy. */
    static final List<String> SELF_LOOP_MODELS = List.of("self_loops-fixedSide", "self_loops-free", "self_loops-hyperLoops",
            "self_loops-inside_outside", "self_loops-label", "self_loops-south", "compaction_oned-selfloop-selfloop_crash",
            "compaction_oned-selfloop-selfloop_orthogonal", "compaction_oned-selfloop-selfloop_spline", "ticket-079_selfLoopLabels",
            "ticket-128_selfLoopLabelSpacing_complex", "ticket-128_selfLoopLabelSpacing_simple", "ticket-302_brokenSplineSelfLoops",
            "ticket-340_classCastExceptionGreedySwitch", "ticket-360_badSelfLoopLabelPlacement", "ticket-368_selfLoopLabelsIOOBE",
            "ticket-403_stackedSelfLoopLabels", "ticket-416_longSelfLoops", "ticket-418_northPortsWithSelfLoops",
            "ticket-419_northSelfLoopsAndRegularEdges", "ticket-433_graphSizeWithSelfLoopLabel", "ticket-444_selfLoopsNPE",
            "ticket-463_aioobe_with_self_loops", "ticket-870_networkSimplexNodePlacer", PINNED_MODEL, "ptolemy-conwayrandom",
            "ptolemy-eratosthenes", "ptolemy-trafficlight", "ptolemy-channelfaultmodel", "ptolemy-brewery", "ptolemy-trialmodule");
    /** Models of the self loop family that get the whole direction x routing grid (the others: default and RIGHT x each routing). */
    static final List<String> SELF_LOOP_GRID_MODELS = List.of("self_loops-fixedSide", "self_loops-free", "self_loops-hyperLoops",
            "self_loops-label", "self_loops-south", "compaction_oned-selfloop-selfloop_spline", "ticket-403_stackedSelfLoopLabels",
            "ticket-418_northPortsWithSelfLoops", "ticket-419_northSelfLoopsAndRegularEdges");
    static final List<String> SELF_LOOP_OPTION_MODELS = List.of("self_loops-hyperLoops", "self_loops-label", "self_loops-fixedSide");
    static final List<String> SELF_LOOP_DISTRIBUTIONS = List.of("EQUALLY", "NORTH", "NORTH_SOUTH");
    static final List<String> SELF_LOOP_ORDERINGS = List.of("STACKED", "REVERSE_STACKED", "SEQUENCED");

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

    static void selfLoopSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : SELF_LOOP_MODELS) {
            ModelFile f = model(files, id);
            boolean grid = SELF_LOOP_GRID_MODELS.contains(id);
            out.add(fullOn("self-loops", f, "default", fopts()));
            for (String d : ALL_DIRECTIONS) {
                for (EdgeRouting r : ROUTINGS) {
                    if (grid || d.equals("RIGHT")) {
                        out.add(fullOn("self-loops", f, d + "-" + r.name(), fopts("DIRECTION", E("Direction", d), "EDGE_ROUTING", E("EdgeRouting", r.name()))));
                    }
                }
            }
        }
        for (String id : SELF_LOOP_OPTION_MODELS) {
            for (String dist : SELF_LOOP_DISTRIBUTIONS) {
                for (String ord : SELF_LOOP_ORDERINGS) {
                    out.add(fullOn("self-loops", model(files, id), "distribution-" + dist + "-ordering-" + ord,
                            fopts("EDGE_ROUTING_SELF_LOOP_DISTRIBUTION", E("SelfLoopDistributionStrategy", dist),
                                    "EDGE_ROUTING_SELF_LOOP_ORDERING", E("SelfLoopOrderingStrategy", ord))));
                }
            }
        }
    }

    /** Long chains: 12 layers with skip edges, and a 16-node ladder (inline, nothing in the corpus sets a wrapping strategy). */
    static final String CHAIN_GRAPH = gj("", 12, null, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {4, 5}, {5, 6}, {6, 7}, {7, 8},
        {8, 9}, {9, 10}, {10, 11}, {0, 6}, {2, 8}, {5, 11}}, null);
    static final String LADDER_GRAPH = gj("", 16, null, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {4, 5}, {5, 6}, {6, 7},
        {8, 9}, {9, 10}, {10, 11}, {11, 12}, {12, 13}, {13, 14}, {14, 15}, {0, 9}, {2, 11}, {4, 13}, {6, 15}, {8, 1}, {10, 3}}, null);

    static void wrappingGrid(List<Spec> out, String name, String rel, String elk, boolean params) {
        for (String s : WRAPPING_STRATEGIES) {
            for (String c : WRAPPING_CUTTINGS) {
                for (String v : WRAPPING_VALIDIFIES) {
                    out.add(full("wrapping", name, s + "-" + c + "-" + v, rel, elk, fopts(wrapping(s, c, v))));
                }
            }
        }
        if (!params) {
            return;
        }
        Map<String, Object[]> variants = new LinkedHashMap<>();
        variants.put("multi-improve-cuts-off", cat(wrapping("MULTI_EDGE", "MSD", "GREEDY"), "WRAPPING_MULTI_EDGE_IMPROVE_CUTS", Z(false)));
        variants.put("multi-improve-wrapped-edges-off", cat(wrapping("MULTI_EDGE", "MSD", "GREEDY"), "WRAPPING_MULTI_EDGE_IMPROVE_WRAPPED_EDGES", Z(false)));
        variants.put("multi-distance-penalty-0", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_MULTI_EDGE_DISTANCE_PENALTY", D(0.0)));
        variants.put("multi-distance-penalty-8", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_MULTI_EDGE_DISTANCE_PENALTY", D(8.0)));
        variants.put("multi-msd-freedom-0", cat(wrapping("MULTI_EDGE", "MSD", "GREEDY"), "WRAPPING_CUTTING_MSD_FREEDOM", tv("int", 0)));
        variants.put("multi-msd-freedom-3", cat(wrapping("MULTI_EDGE", "MSD", "GREEDY"), "WRAPPING_CUTTING_MSD_FREEDOM", tv("int", 3)));
        variants.put("multi-correction-0.5", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_CORRECTION_FACTOR", D(0.5)));
        variants.put("multi-correction-2", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_CORRECTION_FACTOR", D(2.0)));
        variants.put("single-correction-0.5", cat(wrapping("SINGLE_EDGE", "ARD", "GREEDY"), "WRAPPING_CORRECTION_FACTOR", D(0.5)));
        variants.put("single-correction-2", cat(wrapping("SINGLE_EDGE", "MSD", "GREEDY"), "WRAPPING_CORRECTION_FACTOR", D(2.0)));
        variants.put("single-additional-edge-spacing-30", cat(wrapping("SINGLE_EDGE", "ARD", "GREEDY"), "WRAPPING_ADDITIONAL_EDGE_SPACING", D(30.0)));
        variants.put("multi-additional-edge-spacing-30", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_ADDITIONAL_EDGE_SPACING", D(30.0)));
        variants.forEach((v, kv) -> out.add(full("wrapping", name, v, rel, elk, fopts(kv))));
    }

    static Object[] cat(Object[] base, Object... more) {
        Object[] all = Arrays.copyOf(base, base.length + more.length);
        System.arraycopy(more, 0, all, base.length, more.length);
        return all;
    }

    static void wrappingSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : WRAP_MODELS) {
            ModelFile f = model(files, id);
            wrappingGrid(out, id, f.rel, null, id.equals("preserve_order-simpleLongEdges01"));
        }
        wrappingGrid(out, "chain12", null, CHAIN_GRAPH, true);
        wrappingGrid(out, "ladder16", null, LADDER_GRAPH, true);
    }

    static void compactionSpecs(List<Spec> out, List<ModelFile> files) {
        for (ModelFile f : files) {
            if (!f.id.startsWith("compaction_oned-")) {
                continue;
            }
            out.add(fullOn("compaction", f, "default", fopts()));
            for (String s : COMPACTION_STRATEGIES) {
                for (String k : COMPACTION_CONSTRAINTS) {
                    for (EdgeRouting r : ROUTINGS) {
                        if (!k.equals("SCANLINE") && !s.equals("EDGE_LENGTH") && !s.equals("LEFT_RIGHT_CONNECTION_LOCKING")) {
                            continue; // QUADRATIC constraints: the two main strategies (the models rows and scenarios cover the others)
                        }
                        if (r != EdgeRouting.POLYLINE || s.equals("EDGE_LENGTH")) { // POLYLINE plans hold no compactor: one strategy shows it
                            out.add(fullOn("compaction", f, (s + "-" + k + "-" + r.name()).toLowerCase().replace('_', '-'),
                                    fopts(cat(compaction(s, k), "EDGE_ROUTING", E("EdgeRouting", r.name())))));
                        }
                    }
                }
            }
        }
        for (ModelFile f : files) { // W7: SPLINES with a compaction strategy over the spline hyperedge models
            if (!f.id.startsWith("splines-hyperedges-") && !f.id.startsWith("hyperedge_merging-")) {
                continue;
            }
            out.add(fullOn("compaction-splines", f, "default", fopts()));
            for (String s : COMPACTION_STRATEGIES) {
                for (String k : COMPACTION_CONSTRAINTS) {
                    if (!k.equals("SCANLINE") && !s.equals("EDGE_LENGTH") && !s.equals("LEFT_RIGHT_CONNECTION_LOCKING")) {
                        continue;
                    }
                    out.add(fullOn("compaction-splines", f, (s + "-" + k).toLowerCase().replace('_', '-'),
                            fopts(cat(compaction(s, k), "EDGE_ROUTING", E("EdgeRouting", "SPLINES")))));
                }
            }
        }
    }

    /** A compound node "c" with ports on the given sides (c.p<i>), one child per port, each connected to its port, and extra free components. */
    static String gExternal(String rootOptions, String innerOptions, String[] sides, int isolated, boolean crossLinks) {
        List<String> ports = new ArrayList<>(), children = new ArrayList<>(), edges = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj("c", i, sides[i], null));
            children.add(plain("k" + i));
            edges.add(i % 2 == 0 ? "c.p" + i + ">k" + i : "k" + i + ">c.p" + i);
        }
        for (int i = 0; i < isolated; i++) {
            children.add(plain("f" + i));
            children.add(plain("g" + i));
            edges.add("f" + i + ">g" + i);
        }
        if (crossLinks && sides.length > 2) {
            edges.add("k0>k1");
        }
        String inner = "{\"id\":\"c\",\"width\":200,\"height\":200,\"layoutOptions\":{" + innerOptions + "},\"ports\":[" + String.join(",", ports)
                + "],\"children\":[" + String.join(",", children) + "],\"edges\":[" + eds(edges.toArray(new String[0])) + "]}";
        return "{\"id\":\"root\",\"layoutOptions\":{" + rootOptions + "},\"children\":[" + inner + "]}";
    }

    static final String[] SIDES_4 = {"NORTH", "EAST", "SOUTH", "WEST"};
    static final String[] SIDES_8 = {"NORTH", "NORTH", "EAST", "EAST", "SOUTH", "SOUTH", "WEST", "WEST"};
    static final String[] SIDES_NS = {"NORTH", "SOUTH", "NORTH", "SOUTH"};
    static final String[] SIDES_EW = {"EAST", "WEST", "EAST", "WEST"};

    /** The inner options of a components compaction row: compaction on, fixed port sides, orthogonal routing, the given extra pairs. */
    static String compactionInner(String... extra) {
        String[] base = {"COMPACTION_CONNECTED_COMPONENTS", "true", "PORT_CONSTRAINTS", FS, "EDGE_ROUTING", "ORTHOGONAL"};
        String[] all = Arrays.copyOf(base, base.length + extra.length);
        System.arraycopy(extra, 0, all, base.length, extra.length);
        return ropts(all);
    }

    static void componentsSpecs(List<Spec> out, List<ModelFile> files) {
        TreeMap<String, Object> on = fopts("COMPACTION_CONNECTED_COMPONENTS", Z(true));
        for (String id : List.of("connected_components-flat01", "connected_components-all_four_port_sides", "connected_components-compound01",
                "connected_components-compound02", "connected_components-compound03", "connected_components-compound04",
                "connected_components-compound05", "connected_components-compound06", "connected_components-compound07")) {
            ModelFile f = model(files, id);
            out.add(fullOn("components-compaction", f, "off", fopts()));
            out.add(fullOn("components-compaction", f, "on", on));
            for (EdgeRouting r : ROUTINGS) {
                for (String d : List.of("RIGHT", "DOWN")) {
                    out.add(fullOn("components-compaction", f, "on-" + d + "-" + r.name(),
                            fopts("COMPACTION_CONNECTED_COMPONENTS", Z(true), "DIRECTION", E("Direction", d), "EDGE_ROUTING", E("EdgeRouting", r.name()))));
                }
            }
        }
        ModelFile all4 = model(files, "connected_components-all_four_port_sides");
        for (String d : ALL_DIRECTIONS) { // the third placer: ComponentGroupModelOrderGraphPlacer
            out.add(fullOn("components-compaction", all4, "group-model-order-" + d, fopts("COMPACTION_CONNECTED_COMPONENTS", Z(true), "DIRECTION", E("Direction", d),
                    "CONSIDER_MODEL_ORDER_COMPONENTS", E("ComponentOrderingStrategy", "GROUP_MODEL_ORDER"))));
        }
        Map<String, String[]> ext = new LinkedHashMap<>();
        ext.put("four-sides", SIDES_4);
        ext.put("eight-ports", SIDES_8);
        ext.put("north-south", SIDES_NS);
        ext.put("east-west", SIDES_EW);
        for (Map.Entry<String, String[]> e : ext.entrySet()) {
            for (String d : List.of("RIGHT", "DOWN")) {
                String root = ropts("DIRECTION", d);
                out.add(full("components-compaction", "inline-" + e.getKey(), "compaction-" + d, null,
                        gExternal(root, compactionInner("DIRECTION", d), e.getValue(), 2, true), fopts()));
                out.add(full("components-compaction", "inline-" + e.getKey(), "group-model-order-" + d, null, gExternal(root,
                        compactionInner("DIRECTION", d, "CONSIDER_MODEL_ORDER_COMPONENTS", "GROUP_MODEL_ORDER"), e.getValue(), 2, false), fopts()));
            }
        }
    }

    static void convertedSpecs(List<Spec> out, List<ModelFile> files) {
        // W4: the refused row full/labels/ticket-213_componentsCompaction of layered-labels.json: the same input, no options
        out.add(full("converted", "labels", "ticket-213_componentsCompaction", model(files, "ticket-213_componentsCompaction").rel, null, fopts()));
    }

    static void issueSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : List.of("ticket-433_graphSizeWithSelfLoopLabel", "ticket-444_selfLoopsNPE", "ticket-463_aioobe_with_self_loops",
                "ticket-870_networkSimplexNodePlacer")) { // Issue433Test, Issue444Test, Issue463Test, Issue870Test: the default configuration
            out.add(full("issues", id, "default", model(files, id).rel, null, fopts()));
        }
    }

    static void fullSpecs(List<Spec> out, List<ModelFile> files) {
        selfLoopSpecs(out, files);
        wrappingSpecs(out, files);
        compactionSpecs(out, files);
        componentsSpecs(out, files);
        convertedSpecs(out, files);
        issueSpecs(out, files);
    }

    // Group scenarios

    static List<Spec> SCENARIOS;
    /** Scenario rows per "<stop>/<direction>"; the coverage check wants at least two graphs per processor and direction. */
    static final Map<String, Integer> FAMILIES = new TreeMap<>();
    static final String SHRINK = "shrink-width", NO_MANAGER = "none";

    /** The whole plan of the inline graph (a label manager set on its root first when manager is true), GraphTransformer by position. */
    static List<String> planOfGraph(String elk, String target, boolean manager) {
        ElkNode root = ElkGraphJson.forGraph(elk).toElk();
        if (manager) {
            root.setProperty(LabelManagementOptions.LABEL_MANAGER, new ShrinkWidthManager());
        }
        LGraph g = new ElkGraphTransformer().importGraph(importTarget(root, target));
        ElkLayered layered = new ElkLayered();
        List<String> plan = positionalNames(layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g)));
        for (String name : plan) {
            if (!allowed(name)) { // G2: decided on the whole plan, also for scenarios
                throw new Bug("scenario plan names " + name + " outside the ported sets: " + plan);
            }
        }
        return plan;
    }

    /** [labelManager], importGraph, normalise, then the plan's members in order up to and including the stop (null = the whole plan). */
    static List<Object> chainOf(String elk, String target, String stop, boolean manager) {
        List<String> plan = planOfGraph(elk, target, manager);
        List<Object> st = new ArrayList<>();
        if (manager) {
            st.add(S("labelManager", SHRINK));
        }
        st.add(imp(target));
        st.add(norm());
        boolean hit = stop == null;
        for (String name : plan) {
            if (name.contains("/")) {
                String[] ph = name.split("/");
                st.add(phase(ph[0], ph[1]));
            } else {
                st.add(proc(name));
            }
            if (name.equals(stop)) {
                hit = true;
                break;
            }
        }
        if (!hit) {
            throw new Bug("scenario stop " + stop + " is not in the plan " + plan);
        }
        return st;
    }

    static void add(String id, String elk, List<Object> steps) {
        SCENARIOS.add(new Spec(id, "scenarios", null, () -> ElkGraphJson.forGraph(elk).toElk(), null, new TreeMap<>(), null, steps, null));
    }

    /** scenarios/<cls>/<name>: stop = a plan member name, or null for the whole plan; the family counts toward the coverage check. */
    static void sc(String cls, String name, String family, String elk, String stop, boolean manager) {
        List<String> plan = planOfGraph(elk, null, manager);
        String stopName = stop == null ? plan.get(plan.size() - 1) : stop;
        if (!plan.contains(stopName)) { // a graph without the stop's trigger (e.g. no center label): skipped and counted
            NOT_IN_PLAN.merge("scenario " + stopName, 1, Integer::sum);
            return;
        }
        List<Object> st = chainOf(elk, null, stopName, manager);
        st.add(dump());
        add("scenarios/" + cls + "/" + name, elk, st);
        FAMILIES.merge(family, 1, Integer::sum);
    }

    /** A builder of the root options -> ELK JSON (a lambda needs a functional target type). */
    static java.util.function.UnaryOperator<String> u(java.util.function.UnaryOperator<String> f) {
        return f;
    }

    /** Named graph builders (name -> builder of the root options -> ELK JSON), in insertion order. */
    static Map<String, java.util.function.UnaryOperator<String>> graphs(Object... nameAndBuilder) {
        Map<String, java.util.function.UnaryOperator<String>> m = new LinkedHashMap<>();
        requirePairs(nameAndBuilder.length);
        for (int i = 0; i + 1 < nameAndBuilder.length; i += 2) {
            @SuppressWarnings("unchecked")
            java.util.function.UnaryOperator<String> b = (java.util.function.UnaryOperator<String>) nameAndBuilder[i + 1];
            m.put((String) nameAndBuilder[i], b);
        }
        return m;
    }

    // Scenario graphs of this brief

    static final String NORTH = "NORTH", EAST = "EAST", SOUTH = "SOUTH", WEST = "WEST";

    /** A self loop graph: node a (80 x 80) with the ports of the given sides (null: no side) between n0 and n2, a bypass b, and the loops. */
    record LoopGraph(String name, String constraints, String[] sides, String[] loops, boolean labels) { }

    static LoopGraph lg(String name, String constraints, String[] sides, String... loops) {
        return new LoopGraph(name, constraints, sides, loops, false);
    }

    static LoopGraph labelled(String name, String[] sides, String... loops) {
        return new LoopGraph(name, FS, sides, loops, true);
    }

    static String[] sd(String... s) {
        return s;
    }

    /** The edge ids of the loops start at e4 (after n0>a.p0, a.p1>n2, n0>b, b>n2); a labelled loop carries a center, head and tail label. */
    static String gLoops(String ro, LoopGraph g) {
        List<String> edges = new ArrayList<>(List.of(eds("n0>a.p0", "a.p1>n2", "n0>b", "b>n2")));
        for (int i = 0; i < g.loops.length; i++) {
            String[] end = g.loops[i].split(">");
            edges.add(g.labels ? edl("e" + (4 + i), end[0], end[1], lab("c" + i, 30, 10, null), lab("h" + i, 20, 10, "HEAD"), lab("t" + i, 20, 10, "TAIL"))
                    : edsFrom(4 + i, g.loops[i]));
        }
        return flat(ro, join(plain("n0"), sz(pnode("a", g.constraints, null, g.sides), 80, 80), plain("n2"), plain("b")), String.join(",", edges));
    }

    /** The same with a label on every port of a (width 18). */
    static String gLoopsPortLabels(String ro, LoopGraph g) {
        String a = sz(lnode("a", g.constraints, 18, null, g.sides), 80, 80);
        return flat(ro, join(plain("n0"), a, plain("n2"), plain("b")), join(eds("n0>a.p0", "a.p1>n2", "n0>b", "b>n2"), edsFrom(4, g.loops)));
    }

    /** A graph that is one node with loops only, and one with two such nodes (loops on both, one edge between them). */
    static String gLoopsOnly(String ro, LoopGraph g, boolean twoNodes) {
        String a = sz(pnode("a", g.constraints, null, g.sides), 80, 80);
        if (!twoNodes) {
            return flat(ro, a, edsFrom(0, g.loops));
        }
        String b = sz(pnode("b", g.constraints, null, g.sides), 80, 80);
        List<String> edges = new ArrayList<>(List.of(eds("a.p0>b.p1")));
        for (int i = 0; i < g.loops.length; i++) {
            edges.add(edsFrom(1 + 2 * i, g.loops[i]));
            edges.add(edsFrom(2 + 2 * i, g.loops[i].replace("a.", "b.").replace(">a", ">b")));
        }
        return flat(ro, join(a, b), String.join(",", edges));
    }

    /** FIXED_POS ports at explicit positions (east and north side) with a loop between the two east ports and one north to east. */
    static String gLoopsFixedPos(String ro) {
        String ports = join(pj("a", 0, null, new double[] {0, 30}), pj("a", 1, null, new double[] {80, 30}), pj("a", 2, null, new double[] {80, 10}),
                pj("a", 3, null, new double[] {80, 55}), pj("a", 4, null, new double[] {30, 0}));
        String a = sz(nodeJson("a", null, ropts("PORT_CONSTRAINTS", FP), "\"ports\":[" + ports + "]"), 80, 80);
        return flat(ro, join(plain("n0"), a, plain("n2")), eds("n0>a.p0", "a.p1>n2", "a.p2>a.p3", "a.p4>a.p3"));
    }

    static final List<LoopGraph> PAIR_GRAPHS = List.of(lg("e-e", FS, sd(WEST, EAST, EAST, EAST), "a.p2>a.p3"),
            lg("w-w", FS, sd(WEST, EAST, WEST, WEST), "a.p2>a.p3"), lg("n-n", FS, sd(WEST, EAST, NORTH, NORTH), "a.p2>a.p3"),
            lg("s-s", FS, sd(WEST, EAST, SOUTH, SOUTH), "a.p2>a.p3"), lg("n-s", FS, sd(WEST, EAST, NORTH, SOUTH), "a.p2>a.p3"),
            lg("e-w", FS, sd(WEST, EAST, EAST, WEST), "a.p2>a.p3"), lg("same-port", FS, sd(WEST, EAST, EAST), "a.p2>a.p2"));
    static final List<LoopGraph> OTHER_GRAPHS = List.of(
            lg("hyper-e3", FS, sd(WEST, EAST, EAST, EAST, EAST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-nes", FS, sd(WEST, EAST, NORTH, EAST, SOUTH), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-w3", FS, sd(WEST, EAST, WEST, WEST, WEST), "a.p2>a.p3", "a.p4>a.p3"),
            lg("multi-e", FS, sd(WEST, EAST, EAST, EAST, EAST, EAST), "a.p2>a.p3", "a.p4>a.p5"),
            lg("nested-e", FS, sd(WEST, EAST, EAST, EAST, EAST, EAST), "a.p2>a.p5", "a.p3>a.p4"),
            lg("parallel", FS, sd(WEST, EAST, EAST, EAST), "a.p2>a.p3", "a.p3>a.p2"),
            lg("mixed-sides", FS, sd(WEST, EAST, NORTH, NORTH, SOUTH, SOUTH, EAST, EAST, WEST, WEST), "a.p2>a.p3", "a.p4>a.p5", "a.p6>a.p7",
                    "a.p8>a.p9"),
            lg("free", "FREE", sd(null, null, null, null), "a.p2>a.p3"),
            lg("free-hyper", "FREE", sd(null, null, null, null, null), "a.p2>a.p3", "a.p3>a.p4"),
            lg("fixed-order", "FIXED_ORDER", sd(WEST, EAST, EAST, EAST, NORTH, NORTH), "a.p2>a.p3", "a.p4>a.p5"),
            labelled("labels", sd(WEST, EAST, EAST, EAST), "a.p2>a.p3"), labelled("labels-ns", sd(WEST, EAST, NORTH, SOUTH), "a.p2>a.p3"),
            labelled("labels-hyper", sd(WEST, EAST, EAST, EAST, EAST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-nesw", FS, sd(WEST, EAST, NORTH, EAST, SOUTH, WEST), "a.p2>a.p3", "a.p3>a.p4", "a.p4>a.p5"));

    /** More loop shapes for the branches of PortRestorer (corner pairs, three sides with each side missing) and PortSideAssigner (shared port). */
    static final List<LoopGraph> EXTRA_GRAPHS = List.of(lg("n-e", FS, sd(WEST, EAST, NORTH, EAST), "a.p2>a.p3"),
            lg("e-s", FS, sd(WEST, EAST, EAST, SOUTH), "a.p2>a.p3"), lg("s-w", FS, sd(WEST, EAST, SOUTH, WEST), "a.p2>a.p3"),
            lg("w-n", FS, sd(WEST, EAST, WEST, NORTH), "a.p2>a.p3"),
            lg("hyper-esw", FS, sd(WEST, EAST, EAST, SOUTH, WEST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-nsw", FS, sd(WEST, EAST, NORTH, SOUTH, WEST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-new", FS, sd(WEST, EAST, NORTH, EAST, WEST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("free-shared", "FREE", sd(null, null, null, null), "a.p0>a.p2", "a.p1>a.p3"));
    /** The other graphs whose whole plan is run once (the rest stop at the four self loop stops). */
    static final List<String> OTHER_WHOLE = List.of("hyper-nes", "free", "fixed-order", "labels", "labels-ns", "hyper-nesw", "mixed-sides");

    /** Eight loops (the first over three ports, 19 ports in all) on a node with FREE ports: EQUALLY visits all eight targets of PortSideAssigner. */
    static LoopGraph freeMany() {
        String[] sides = new String[19];
        List<String> loops = new ArrayList<>();
        loops.add("a.p2>a.p3");
        loops.add("a.p3>a.p4");
        for (int i = 0; i < 7; i++) {
            loops.add("a.p" + (5 + 2 * i) + ">a.p" + (6 + 2 * i));
        }
        return lg("free-many", "FREE", sides, loops.toArray(new String[0]));
    }

    static final List<String> SELF_LOOP_CLASSES = List.of("SelfLoopPreProcessor", "SelfLoopPortRestorer", "SelfLoopRouter", "SelfLoopPostProcessor");

    /** One graph in one direction (and routing) at the four self loop stops, plus the whole chain once per graph. */
    static void loopRows(String name, String routing, String d, java.util.function.Function<String, String> graph, boolean whole) {
        String ro = routing == null ? ropts("DIRECTION", d) : ropts("DIRECTION", d, "EDGE_ROUTING", routing);
        String elk = graph.apply(ro);
        String id = routing == null ? name : name + "-" + routing.toLowerCase();
        for (int i = 0; i < SELF_LOOP_STOPS.size(); i++) {
            sc(SELF_LOOP_CLASSES.get(i), id + "/" + d, SELF_LOOP_STOPS.get(i) + "/" + d, elk, SELF_LOOP_STOPS.get(i), false);
        }
        if (whole) {
            sc("SelfLoopPostProcessor", id + "/end/" + d, "end/" + d, elk, null, false);
        }
    }

    /** The pair graphs by direction: all in RIGHT, four in DOWN, three in LEFT and UP (every class and direction keeps two or more graphs). */
    static final Map<String, List<String>> PAIR_DIRECTIONS = new LinkedHashMap<>();
    static {
        PAIR_DIRECTIONS.put("RIGHT", List.of("e-e", "w-w", "n-n", "s-s", "n-s", "e-w", "same-port"));
        PAIR_DIRECTIONS.put("DOWN", List.of("e-e", "n-n", "n-s", "e-w"));
        PAIR_DIRECTIONS.put("LEFT", List.of("e-e", "n-s", "s-s"));
        PAIR_DIRECTIONS.put("UP", List.of("e-e", "n-s", "s-s"));
    }
    static final List<String> OTHER_DOWN = List.of("hyper-nes", "free", "fixed-order", "labels", "labels-ns");

    static void selfLoopScenarios() {
        for (LoopGraph g : PAIR_GRAPHS) {
            for (Map.Entry<String, List<String>> e : PAIR_DIRECTIONS.entrySet()) {
                if (e.getValue().contains(g.name)) {
                    loopRows(g.name, null, e.getKey(), ro -> gLoops(ro, g), e.getKey().equals("RIGHT"));
                }
            }
        }
        for (LoopGraph g : OTHER_GRAPHS) {
            loopRows(g.name, null, "RIGHT", ro -> gLoops(ro, g), OTHER_WHOLE.contains(g.name));
            if (OTHER_DOWN.contains(g.name)) {
                loopRows(g.name, null, "DOWN", ro -> gLoops(ro, g), false);
            }
        }
        for (LoopGraph g : EXTRA_GRAPHS) {
            loopRows(g.name, null, "RIGHT", ro -> gLoops(ro, g), false);
        }
        LoopGraph many = freeMany();
        for (String dist : SELF_LOOP_DISTRIBUTIONS) { // EQUALLY (all four stops), NORTH and NORTH_SOUTH (the router stop)
            String ro = ropts("DIRECTION", "RIGHT", "EDGE_ROUTING_SELF_LOOP_DISTRIBUTION", dist);
            for (int i = 0; i < SELF_LOOP_STOPS.size(); i++) {
                if (dist.equals("EQUALLY") || i == 2) {
                    sc(SELF_LOOP_CLASSES.get(i), many.name + "-dist-" + dist + "/RIGHT", SELF_LOOP_STOPS.get(i) + "/RIGHT", gLoops(ro, many),
                            SELF_LOOP_STOPS.get(i), false);
                }
            }
        }
        loopRows("port-labels", null, "RIGHT", ro -> gLoopsPortLabels(ro, PAIR_GRAPHS.get(0)), true);
        loopRows("port-labels-ns", null, "DOWN", ro -> gLoopsPortLabels(ro, PAIR_GRAPHS.get(4)), true);
        loopRows("fixed-pos", null, "RIGHT", ro -> gLoopsFixedPos(ro), true);
        loopRows("only-e-e", null, "RIGHT", ro -> gLoopsOnly(ro, PAIR_GRAPHS.get(0), false), true);
        loopRows("only-n-s", null, "DOWN", ro -> gLoopsOnly(ro, PAIR_GRAPHS.get(4), false), true);
        loopRows("two-nodes-e-e", null, "RIGHT", ro -> gLoopsOnly(ro, PAIR_GRAPHS.get(0), true), true);
        for (String r : List.of("POLYLINE", "SPLINES")) { // the routers: stops after the router and after the post-processor
            for (LoopGraph g : List.of(PAIR_GRAPHS.get(0), PAIR_GRAPHS.get(2), PAIR_GRAPHS.get(4), OTHER_GRAPHS.get(0), OTHER_GRAPHS.get(1),
                    OTHER_GRAPHS.get(10))) {
                String elk = gLoops(ropts("DIRECTION", "RIGHT", "EDGE_ROUTING", r), g);
                for (int i : new int[] {2, 3}) {
                    sc(SELF_LOOP_CLASSES.get(i), g.name + "-" + r.toLowerCase() + "/RIGHT", SELF_LOOP_STOPS.get(i) + "/RIGHT", elk,
                            SELF_LOOP_STOPS.get(i), false);
                }
            }
        }
        for (String dist : SELF_LOOP_DISTRIBUTIONS) { // the strategies of the option rows, on a stacked and a labelled graph
            for (String ord : SELF_LOOP_ORDERINGS) {
                for (LoopGraph g : List.of(OTHER_GRAPHS.get(3), OTHER_GRAPHS.get(12))) {
                    String ro = ropts("DIRECTION", "RIGHT", "EDGE_ROUTING_SELF_LOOP_DISTRIBUTION", dist, "EDGE_ROUTING_SELF_LOOP_ORDERING", ord);
                    String stop = SELF_LOOP_STOPS.get(2);
                    sc("SelfLoopRouter", g.name + "-dist-" + dist + "-ord-" + ord + "/RIGHT", stop + "/RIGHT", gLoops(ro, g), stop, false);
                }
            }
        }
    }

    // DummySelfLoopProcessor (W3): the processor op before NORTH_SOUTH_PORT_PREPROCESSOR (or the first P3 member), the plan without the self loop arms

    static final String[] SIDE_ORDER = {NORTH, EAST, SOUTH, WEST};

    /** importGraph, normalise, the plan's members without the SELF_LOOP arms, the Dummy op in its place; stops right after it or runs to the end. */
    static List<Object> dummyChain(String elk, boolean toEnd) {
        List<String> plan = planOfGraph(elk, null, false);
        List<Object> st = new ArrayList<>();
        st.add(imp(null));
        st.add(norm());
        boolean inserted = false;
        for (String name : plan) {
            if (SELF_LOOP_STOPS.contains(name)) {
                continue;
            }
            if (!inserted && (name.equals("NORTH_SOUTH_PORT_PREPROCESSOR") || name.startsWith(P3 + "/"))) {
                st.add(S("processor", "DummySelfLoopProcessor"));
                inserted = true;
                if (!toEnd) {
                    break;
                }
            }
            st.add(name.contains("/") ? phase(name.split("/")[0], name.split("/")[1]) : proc(name));
        }
        if (!inserted) {
            throw new Bug("no slot before phase 3 in the plan " + plan);
        }
        st.add(dump());
        return st;
    }

    static void dummyRow(String name, String elk) {
        add("scenarios/DummySelfLoopProcessor/" + name, elk, dummyChain(elk, false));
        add("scenarios/DummySelfLoopProcessor/" + name + "/end", elk, dummyChain(elk, true));
    }

    static void dummyScenarios() {
        for (String s : SIDE_ORDER) { // the 16 side pairs: reversal (N-W, S-W, S-N, E-N, E-S, E-W), dummy (E-W, W-E), nothing (the rest)
            for (String t : SIDE_ORDER) {
                dummyRow(s + "-" + t + "/RIGHT", gLoops(ropts("DIRECTION", "RIGHT"), lg(s + "-" + t, FS, sd(WEST, EAST, s, t), "a.p2>a.p3")));
            }
        }
        for (String pair : List.of("EAST-WEST", "WEST-EAST", "NORTH-SOUTH", "SOUTH-NORTH", "NORTH-WEST")) { // the sides rotate with the direction
            String[] end = pair.split("-");
            for (String d : DIRECTIONS) {
                dummyRow(pair + "/" + d, gLoops(ropts("DIRECTION", d), lg(pair, FS, sd(WEST, EAST, end[0], end[1]), "a.p2>a.p3")));
            }
        }
        // several loops on one node and layer (two dummies created in one layer), a hyper loop, loops on two nodes of different layers
        LoopGraph multi = lg("multi", FS, sd(WEST, EAST, WEST, EAST, EAST, WEST, NORTH, SOUTH, SOUTH, NORTH), "a.p2>a.p3", "a.p4>a.p5", "a.p6>a.p7",
                "a.p8>a.p9");
        for (String d : List.of("RIGHT", "DOWN")) {
            dummyRow("multi/" + d, gLoops(ropts("DIRECTION", d), multi));
        }
        dummyRow("hyper-ew/RIGHT", gLoops(ropts("DIRECTION", "RIGHT"), lg("hyper-ew", FS, sd(WEST, EAST, EAST, WEST, EAST), "a.p2>a.p3", "a.p3>a.p4")));
        dummyRow("two-nodes/RIGHT", gLoopsOnly(ropts("DIRECTION", "RIGHT"), lg("two", FS, sd(WEST, EAST, EAST, WEST), "a.p2>a.p3"), true));
    }

    // Wrapping

    /** The chain with a self loop on the fifth node. */
    static String gChainLoop(String ro) {
        StringBuilder kids = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            kids.append(i == 0 ? "" : ",").append(i == 4 ? pnode("n4", FS, null, WEST, EAST, EAST, EAST) : plain("n" + i));
        }
        String edges = eds("n0>n1", "n1>n2", "n2>n3", "n3>n4.p0", "n4.p1>n5", "n5>n6", "n6>n7", "n7>n8", "n8>n9", "n9>n10", "n10>n11", "n0>n6", "n2>n8");
        return flat(ro, kids.toString(), join(edges, edsFrom(13, "n4.p2>n4.p3")));
    }

    /** The chain with a center label on every second edge. */
    static String gChainLabels(String ro) {
        StringBuilder kids = new StringBuilder(), edges = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            kids.append(i == 0 ? "" : ",").append(plain("n" + i));
        }
        for (int i = 0; i < 11; i++) {
            edges.append(i == 0 ? "" : ",").append(i % 2 == 0 ? edl("e" + i, "n" + i, "n" + (i + 1), lab("l" + i, 24, 10, null))
                    : edsFrom(i, "n" + i + ">n" + (i + 1)));
        }
        return flat(ro, kids.toString(), edges + "," + edsFrom(11, "n0>n6", "n3>n9"));
    }

    /** The inline chain graphs have an empty root option list: put the row's root options in. */
    static String flatOf(String graph, String ro) {
        return graph.replace("\"layoutOptions\":{}", "\"layoutOptions\":{" + ro + "}");
    }

    static final Map<String, java.util.function.UnaryOperator<String>> WRAP_GRAPHS = graphs("chain", u(ro -> flatOf(CHAIN_GRAPH, ro)),
            "ladder", u(ro -> flatOf(LADDER_GRAPH, ro)), "chain-loop", u(ro -> gChainLoop(ro)), "chain-labels", u(ro -> gChainLabels(ro)));

    /** One wrapping scenario: the graph with the strategy and cutting; MANUAL carries its cuts as a setProperty step after importGraph. */
    static void wrapRow(String cls, String stop, String graph, String strategy, String cutting, String d, boolean whole) {
        String ro = ropts("DIRECTION", d, "WRAPPING_STRATEGY", strategy, "WRAPPING_CUTTING_STRATEGY", cutting);
        String elk = WRAP_GRAPHS.get(graph).apply(ro);
        List<String> plan = planOfGraph(elk, null, false);
        String stopName = whole ? plan.get(plan.size() - 1) : stop;
        List<Object> st = chainOf(elk, null, stopName, false);
        if (cutting.equals("MANUAL")) {
            st.add(1, set("g0", "WRAPPING_CUTTING_CUTS", MANUAL_CUTS));
        }
        st.add(dump());
        add("scenarios/" + cls + "/" + graph + "-" + cutting.toLowerCase() + "/" + d + (whole ? "/end" : ""), elk, st);
        FAMILIES.merge(stopName + "/" + d, 1, Integer::sum);
    }

    static void wrappingScenarios() {
        for (String graph : WRAP_GRAPHS.keySet()) {
            boolean main = graph.equals("chain") || graph.equals("ladder");
            for (String cutting : WRAPPING_CUTTINGS) {
                // every direction on the two main graphs with MSD; the other cuttings and graphs in RIGHT (and DOWN for the main graphs)
                List<String> dirs = !main ? List.of("RIGHT") : cutting.equals("MSD") ? ALL_DIRECTIONS : List.of("RIGHT");
                for (String d : dirs) {
                    for (String stop : MULTI_EDGE_STOPS) {
                        wrapRow(camel(stop), stop, graph, "MULTI_EDGE", cutting, d, false);
                    }
                    wrapRow(camel(SINGLE_EDGE_STOP), SINGLE_EDGE_STOP, graph, "SINGLE_EDGE", cutting, d, false);
                }
                if (main || cutting.equals("MSD")) {
                    wrapRow("BreakingPointRemover", null, graph, "MULTI_EDGE", cutting, "RIGHT", true);
                    wrapRow("SingleEdgeGraphWrapper", null, graph, "SINGLE_EDGE", cutting, "RIGHT", true);
                }
            }
        }
    }

    static String camel(String constant) {
        StringBuilder sb = new StringBuilder();
        for (String part : constant.split("_")) {
            sb.append(part.charAt(0)).append(part.substring(1).toLowerCase());
        }
        return sb.toString();
    }

    // Compaction

    /** Comment boxes (one above a node, one below, one attached to the first node) around a small DAG. */
    static String gCompComments(String ro) {
        return flat(ro, join(plain("n0"), plain("n1"), plain("n2"), plain("n3"), comment("c0", 40, 20, null), comment("c1", 40, 20, null),
                comment("c2", 30, 30, null)), eds("n0>n1", "n1>n2", "n0>n3", "n3>n2", "c0>n1", "n3>c1", "c2>n0"));
    }

    static String gCompNs(String ro) {
        return flat(ro, join(plain("n0"), pnode("a", FS, null, NORTH, SOUTH, WEST, EAST, NORTH), plain("n2"), pnode("b", FS, null, SOUTH, WEST, EAST), plain("n4")),
                eds("n0>a.p2", "a.p3>n2", "a.p0>b.p0", "b.p2>n4", "n2>b.p1", "a.p1>a.p4"));
    }

    static String gCompLabels(String ro) {
        return flat(ro, join(plain("n0"), plain("n1"), plain("n2"), plain("n3")),
                join(edl("e0", "n0", "n1", lab("a", 30, 10, null)), edl("e1", "n1", "n2", lab("b", 40, 10, "HEAD"), lab("c", 30, 12, "TAIL")),
                        edl("e2", "n0", "n3", lab("d", 20, 10, null)), edl("e3", "n3", "n2")));
    }

    static String gCompDag(String ro) {
        return gj(ro, 8, null, new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}, {3, 5}, {4, 6}, {5, 6}, {0, 6}, {6, 7}, {1, 5}}, null);
    }

    static final Map<String, java.util.function.UnaryOperator<String>> COMPACTION_GRAPHS = graphs("dag", u(ro -> gCompDag(ro)), "comments",
            u(ro -> gCompComments(ro)), "ns-ports", u(ro -> gCompNs(ro)), "labels", u(ro -> gCompLabels(ro)));

    static void compactionRow(String graph, String strategy, String constraints, String routing, String d, boolean whole) {
        String ro = ropts("DIRECTION", d, "EDGE_ROUTING", routing, "COMPACTION_POST_COMPACTION_STRATEGY", strategy,
                "COMPACTION_POST_COMPACTION_CONSTRAINTS", constraints);
        String elk = COMPACTION_GRAPHS.get(graph).apply(ro);
        String id = graph + "-" + strategy.toLowerCase().replace('_', '-') + "-" + constraints.toLowerCase() + "-" + routing.toLowerCase();
        if (whole) {
            sc("HorizontalGraphCompactor", id + "/end/" + d, COMPACTOR_STOP + "/" + d, elk, null, false);
        } else {
            sc("HorizontalGraphCompactor", id + "/" + d, COMPACTOR_STOP + "/" + d, elk, COMPACTOR_STOP, false);
        }
    }

    static void compactionScenarios() {
        for (String graph : COMPACTION_GRAPHS.keySet()) {
            for (String d : ALL_DIRECTIONS) { // the two main strategies in every direction, the other constraints in RIGHT
                compactionRow(graph, "EDGE_LENGTH", "SCANLINE", "ORTHOGONAL", d, false);
                compactionRow(graph, "LEFT_RIGHT_CONNECTION_LOCKING", "QUADRATIC", "ORTHOGONAL", d, false);
            }
            compactionRow(graph, "EDGE_LENGTH", "QUADRATIC", "ORTHOGONAL", "RIGHT", false);
            compactionRow(graph, "LEFT_RIGHT_CONNECTION_LOCKING", "SCANLINE", "ORTHOGONAL", "RIGHT", false);
            for (String s : List.of("LEFT", "RIGHT", "LEFT_RIGHT_CONSTRAINT_LOCKING")) {
                compactionRow(graph, s, "SCANLINE", "ORTHOGONAL", "RIGHT", false);
                compactionRow(graph, s, "QUADRATIC", "ORTHOGONAL", "RIGHT", false);
            }
            compactionRow(graph, "EDGE_LENGTH", "SCANLINE", "SPLINES", "RIGHT", false);
            compactionRow(graph, "LEFT_RIGHT_CONNECTION_LOCKING", "QUADRATIC", "SPLINES", "RIGHT", false);
            compactionRow(graph, "EDGE_LENGTH", "SCANLINE", "ORTHOGONAL", "RIGHT", true);
        }
    }

    // Components compaction: a terminal layout step over the compound node "c" (its inner graph holds the components)

    static void componentRow(String name, String elk, String target) {
        planOfGraph(elk, target, false);
        List<Object> st = new ArrayList<>();
        st.add(imp(target));
        st.add(norm());
        st.add(S("layout"));
        add("scenarios/ComponentsCompactor/" + name, elk, st);
    }

    static void componentScenarios() {
        Map<String, String[]> sides = new LinkedHashMap<>();
        sides.put("four-sides", SIDES_4);
        sides.put("eight-ports", SIDES_8);
        sides.put("north-south", SIDES_NS);
        for (Map.Entry<String, String[]> e : sides.entrySet()) {
            for (String d : ALL_DIRECTIONS) {
                componentRow(e.getKey() + "/group/" + d, gExternal(ropts("DIRECTION", d), compactionInner("DIRECTION", d), e.getValue(), 2, true), "c");
                componentRow(e.getKey() + "/group-model-order/" + d, gExternal(ropts("DIRECTION", d),
                        compactionInner("DIRECTION", d, "CONSIDER_MODEL_ORDER_COMPONENTS", "GROUP_MODEL_ORDER"), e.getValue(), 2, false), "c");
            }
        }
        // the simple row placer: components of a flat graph, three routings, without and with a comment box
        for (String r : List.of("ORTHOGONAL", "POLYLINE", "SPLINES")) {
            String ro = ropts("EDGE_ROUTING", r, "COMPACTION_CONNECTED_COMPONENTS", "true");
            componentRow("flat-components/" + r, flat(ro, join(plain("a0"), plain("a1"), plain("b0"), plain("b1"), plain("b2"), plain("c0"),
                    plain("d0"), plain("d1")), eds("a0>a1", "b0>b1", "b1>b2", "b0>b2", "d0>d1")), null);
            componentRow("flat-comments/" + r, flat(ro, join(plain("a0"), plain("a1"), plain("b0"), comment("k", 40, 20, null), plain("c0")),
                    eds("a0>a1", "k>a1", "b0>c0")), null);
        }
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        selfLoopScenarios();
        dummyScenarios();
        wrappingScenarios();
        compactionScenarios();
        componentScenarios();
    }

    // Group sites (T20): one step row per scenario of plans/layered-loops-wrapping-compaction/unreached.md (Sc1-Sc34). Expectations come
    // from the oracle only; rows are appended after the scenarios, so no earlier row changes.

    static List<Spec> SITES;
    static final String RT = "RIGHT", SELF_ORDER = "EDGE_ROUTING_SELF_LOOP_ORDERING", SELF_DIST = "EDGE_ROUTING_SELF_LOOP_DISTRIBUTION",
            WRAP = "WRAPPING_STRATEGY", CUTTING = "WRAPPING_CUTTING_STRATEGY", VALIDIFY = "WRAPPING_VALIDIFY_STRATEGY", CUTS = "WRAPPING_CUTTING_CUTS",
            FORBIDDEN = "WRAPPING_VALIDIFY_FORBIDDEN_INDICES", POST = "COMPACTION_POST_COMPACTION_STRATEGY", ROUTING = "EDGE_ROUTING",
            SEPARATE = "SEPARATE_CONNECTED_COMPONENTS", PORT_CONS = "PORT_CONSTRAINTS", CONNECTED = "COMPACTION_CONNECTED_COMPONENTS";

    static void siteRow(String id, String elk, List<Object> st) {
        SITES.add(new Spec("sites/" + id, "sites", null, () -> ElkGraphJson.forGraph(elk).toElk(), null, new TreeMap<>(), null, st, null));
    }

    /** The chain up to the stop (null = the whole plan) with the setProperty steps after importGraph, and a dump. */
    @SafeVarargs
    static void stopSite(String id, String elk, String stop, boolean manager, List<Object>... sets) {
        List<Object> st = chainOf(elk, null, stop, manager);
        int at = manager ? 2 : 1;
        for (List<Object> s : sets) {
            st.add(at++, s);
        }
        st.add(dump());
        siteRow(id, elk, st);
    }

    /** importGraph (target), normalise and the terminal layout of the imported graph. */
    static void layoutSite(String id, String elk, String target) {
        planOfGraph(elk, target, false);
        siteRow(id, elk, steps(imp(target), norm(), S("layout")));
    }

    /** n nodes n0.. in a chain plus the extra edges (a>b specs). */
    static String gChain(String ro, int n, String... extra) {
        List<String> kids = new ArrayList<>(), edges = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            kids.add(plain("n" + i));
            if (i + 1 < n) {
                edges.add("n" + i + ">n" + (i + 1));
            }
        }
        edges.addAll(Arrays.asList(extra));
        return flat(ro, String.join(",", kids), eds(edges.toArray(new String[0])));
    }

    static String lo(String... kv) {
        return ropts(kv);
    }

    /** A label with its own layout options (constant, value, ...). */
    static String labO(String text, int w, int h, String... opts) {
        return "{\"text\":\"" + text + "\",\"width\":" + w + ",\"height\":" + h + ",\"layoutOptions\":{" + ropts(opts) + "}}";
    }

    /** Node a (80 x 80, the options) with ports of the given sides (null: no side) and the edges as ready JSON objects. */
    static String loopNode(String optsJson, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj("a", i, sides[i], null));
        }
        return sz(nodeJson("a", null, optsJson, "\"ports\":[" + String.join(",", ports) + "]"), 80, 80);
    }

    /** Node a between n0 and n2 (edges n0>a.p0, a.p1>n2, ids e0, e1) with the loop edges (ids from e2); a bypass is not added. */
    static String gLoopA(String ro, String optsJson, String[] sides, String... loopEdges) {
        return flat(ro, join(plain("n0"), loopNode(optsJson, sides), plain("n2")), join(eds("n0>a.p0", "a.p1>n2"), String.join(",", loopEdges)));
    }

    static String le(int i, String src, String tgt, String... labels) {
        return edl("e" + i, src, tgt, labels);
    }

    static String pcFs() {
        return ropts(PORT_CONS, FS);
    }

    static String withOpts(String... kv) {
        return pcFs() + (kv.length == 0 ? "" : "," + ropts(kv));
    }

    static void siteSpecs(List<Spec> out) {
        SITES = out;
        wrapSites();
        breakingSites();
        loopLabelSites();
        loopOrderSites();
        dummySites();
        componentSites();
        compactorSites();
    }

    static List<Object> cuts(int... c) {
        return set("g0", CUTS, ints(c));
    }

    static void wrapSites() {
        String sw = lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", CUTTING, "MANUAL");
        // Sc1: nine layers, the layers of {p, q} and of n5 forbid a cut
        String path = flat(lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", CUTTING, "MANUAL", VALIDIFY, "LOOK_BACK"), join(plain("n0"), plain("n1"), plain("n2"),
                plain("n3"), plain("p"), plain("q"), plain("n5"), plain("n6"), plain("n7"), plain("n8")),
                eds("n0>n1", "n1>n2", "n2>n3", "n3>p", "n3>q", "p>n5", "q>n5", "n5>n6", "n6>n7", "n7>n8"));
        stopSite("SingleEdgeGraphWrapper/validifyLookBack/lower", path, SINGLE_EDGE_STOP, false, cuts(4));
        stopSite("SingleEdgeGraphWrapper/validifyLookBack/upper", path, SINGLE_EDGE_STOP, false, cuts(5));
        stopSite("SingleEdgeGraphWrapper/validifyLookBack/skip", path, SINGLE_EDGE_STOP, false, cuts(5, 5));
        // Sc2
        stopSite("SingleEdgeGraphWrapper/aspectAbove", gChain(lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", "ASPECT_RATIO", "20"), 8), SINGLE_EDGE_STOP, false);
        stopSite("SingleEdgeGraphWrapper/manualNoCuts", gChain(sw, 8), SINGLE_EDGE_STOP, false);
        // Sc3: forbidden indices outside 1..size-1
        for (String v : List.of("GREEDY", "LOOK_BACK")) {
            stopSite("GraphStats/forbiddenOutOfRange/" + (v.equals("GREEDY") ? "greedy" : "lookBack"),
                    gChain(lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", CUTTING, "MANUAL", VALIDIFY, v), 8), SINGLE_EDGE_STOP, false, cuts(3),
                    set("g0", FORBIDDEN, ints(0, 99)));
        }
        // Sc4: a NORTH port target in the chain
        String ns = flat(lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", "ASPECT_RATIO", "0.3"), join(plain("a"),
                nodeJson("b", null, ropts(PORT_CONS, FS), "\"ports\":[" + pj("b", 0, N_, null) + "]"), plain("c"), plain("d"), plain("e"), plain("f"),
                plain("g"), plain("h")), eds("a>b", "b.p0>c", "c>d", "d>e", "e>f", "f>g", "g>h"));
        stopSite("GraphStats/northSouthHeight", ns, SINGLE_EDGE_STOP, false);
        // Sc11: a negative edge thickness
        stopSite("CuttingUtils/negativeThickness", gChain(sw, 8, "n2>n3:EDGE_THICKNESS=-2"), SINGLE_EDGE_STOP, false, cuts(3));
        // Sc5: an empty graph (components are not separated: an empty component list would skip every processor)
        for (String r : List.of("ORTHOGONAL", "POLYLINE", "SPLINES")) {
            String base = "{\"id\":\"root\",\"layoutOptions\":{" + lo(SEPARATE, "false", ROUTING, r);
            layoutSite("Empty/" + r + "/wrap", base + "," + ropts(WRAP, "SINGLE_EDGE") + "}}", null);
            if (!r.equals("POLYLINE")) {
                layoutSite("Empty/" + r + "/compact", base + "," + ropts(POST, "LEFT") + "}}", null);
            }
        }
    }

    static void breakingSites() {
        String mw = lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL");
        // Sc6: one layer
        stopSite("BreakingPointInserter/oneLayerImproveCuts", flat(mw, join(plain("a"), plain("b")), ""), "BREAKING_POINT_INSERTER", false, cuts(1));
        // Sc7: chained breaking points on one edge
        for (String r : List.of("ORTHOGONAL", "POLYLINE")) {
            String elk = gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", ROUTING, r, "WRAPPING_MULTI_EDGE_IMPROVE_WRAPPED_EDGES", "false"), 12, "n0>n11");
            stopSite("BreakingPointRemover/multiCutEdge/" + r, elk, null, false, cuts(3, 6));
        }
        // Sc8
        for (String on : List.of("true", "false")) {
            String elk = gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", "WRAPPING_MULTI_EDGE_IMPROVE_WRAPPED_EDGES", on), 9,
                    "n0>n8", "n1>n8");
            stopSite("BreakingPointProcessor/inLayerDummies/" + (on.equals("true") ? "improveOn" : "improveOff"), elk, "BREAKING_POINT_PROCESSOR", false, cuts(4));
        }
        // Sc9: two components that no cut crosses (interactive layering by position)
        String gap = flat(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", "LAYERING_STRATEGY", "INTERACTIVE", SEPARATE, "false",
                "CROSSING_MINIMIZATION_STRATEGY", "NONE"),
                join(at("a", 0, 0), at("b", 40, 0), at("c", 100, 60), at("d", 140, 60), at("e", 180, 60)), eds("a>b", "c>d", "d>e"));
        stopSite("BreakingPointProcessor/emptyBreakingLayer", gap, "BREAKING_POINT_PROCESSOR", false, cuts(2));
        // Sc10
        String sk = "n1>n6", sk2 = "n3>n9";
        stopSite("BreakingPointRemover/wrapSplinesPolyline/SPLINES", gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", ROUTING, "SPLINES"),
                12, sk, sk2), "FINAL_SPLINE_BENDPOINTS_CALCULATOR", false, cuts(3, 6, 9));
        stopSite("BreakingPointRemover/wrapSplinesPolyline/POLYLINE", gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", ROUTING, "POLYLINE"),
                12, sk, sk2), "BREAKING_POINT_REMOVER", false, cuts(3, 6, 9));
    }

    static void loopLabelSites() {
        String ro = lo("DIRECTION", RT);
        String lab60 = labO("l", 60, 12, "EDGE_LABELS_INLINE", "true");
        // Sc12: four loops with an inline center label: {N,E,W}, {E,W}, {N,S}, {N,S,W}
        for (String d : List.of("RIGHT", "DOWN")) {
            String elk = gLoopA(lo("DIRECTION", d), pcFs(), sd(WEST, EAST, NORTH, EAST, WEST, EAST, WEST, NORTH, SOUTH, NORTH, SOUTH, WEST),
                    le(2, "a.p2", "a.p3", lab60), le(3, "a.p3", "a.p4"), le(4, "a.p5", "a.p6", lab60), le(5, "a.p7", "a.p8", lab60),
                    le(6, "a.p9", "a.p10", lab60), le(7, "a.p10", "a.p11"));
            stopSite("SelfLoopRouter/inlineLabels/" + d, elk, "SELF_LOOP_ROUTER", false);
        }
        // Sc13: a label manager that shrinks the wide labels: E-E (TOP), N-N (CENTER), N-E (LEFT), E-N (RIGHT)
        String wide = lab("w", 200, 12, null);
        String elk13 = gLoopA(ro, pcFs(), sd(WEST, EAST, EAST, EAST, NORTH, NORTH, NORTH, EAST, WEST, NORTH),
                le(2, "a.p2", "a.p3", wide), le(3, "a.p4", "a.p5", wide), le(4, "a.p6", "a.p7", wide), le(5, "a.p8", "a.p9", wide));
        stopSite("SelfLoopRouter/labelManager/shrink", elk13, "SELF_LOOP_ROUTER", true);
        // Sc14: two one-sided loops with labels on the south side, none on the north
        stopSite("LabelPlacer/sequencedSouthOnly", gLoopA(ro, withOpts(SELF_ORDER, "SEQUENCED"), sd(WEST, EAST, SOUTH, SOUTH, SOUTH, SOUTH),
                le(2, "a.p2", "a.p3", lab("s0", 30, 10, null)), le(3, "a.p4", "a.p5", lab("s1", 30, 10, null))), "SELF_LOOP_ROUTER", false);
        // Sc15: one FOUR_SIDES hyper loop with a center label; leftmost port on NORTH / not on NORTH
        String loop4 = join(le(0, "a.p0", "a.p1", lab("f", 30, 10, null)), le(1, "a.p1", "a.p2"), le(2, "a.p2", "a.p3"));
        stopSite("LabelPlacer/fourSidesLabel/northFirst", flat(ro, loopNode(pcFs(), NORTH, EAST, SOUTH, WEST), loop4), "SELF_LOOP_ROUTER", false);
        // a connected port on the east side moves the break of the loop away from the north side
        stopSite("LabelPlacer/fourSidesLabel/otherFirst", flat(ro, join(loopNode(pcFs(), NORTH, EAST, SOUTH, WEST, EAST), plain("m")),
                join(loop4, le(3, "m", "a.p4"))), "SELF_LOOP_ROUTER", false);
        // Sc16: a WEST loop with a center label
        stopSite("LabelPlacer/westLoopLabel", gLoopA(ro, pcFs(), sd(WEST, EAST, WEST, WEST), le(2, "a.p2", "a.p3", lab("w", 30, 10, null))),
                "SELF_LOOP_ROUTER", false);
        // Sc17: a labelled loop, then an unlabelled one, on the north side
        stopSite("RoutingSlotAssigner/labelledThenUnlabelled", gLoopA(ro, pcFs(), sd(WEST, EAST, NORTH, NORTH, NORTH, NORTH),
                le(2, "a.p2", "a.p3", lab("n", 30, 10, null)), le(3, "a.p4", "a.p5")), "SELF_LOOP_ROUTER", false);
    }

    static void loopOrderSites() {
        String ro = lo("DIRECTION", RT);
        // Sc18: three ports of one side with net flows -2, 1, 1
        stopSite("PortRestorer/splitIndex", gLoopA(ro, pcFs(), sd(WEST, EAST, EAST, EAST, EAST), le(2, "a.p2", "a.p3"), le(3, "a.p2", "a.p4")),
                "SELF_LOOP_PORT_RESTORER", false);
        // Sc19: two one-sided loops on one side, REVERSE_STACKED and SEQUENCED set on the node
        for (String o : List.of("REVERSE_STACKED", "SEQUENCED")) {
            stopSite("PortRestorer/reverseStacked/" + (o.equals("SEQUENCED") ? "sequenced" : "reverse"), gLoopA(ro, withOpts(SELF_ORDER, o),
                    sd(WEST, EAST, EAST, EAST, EAST, EAST), le(2, "a.p2", "a.p3"), le(3, "a.p4", "a.p5")), "SELF_LOOP_PORT_RESTORER", false);
        }
        // Sc20: one hyper loop over four free ports, p0 and p2 visible (they also carry an edge to a neighbour), p1 and p3 hidden
        for (String dist : List.of("EQUALLY", "NORTH_SOUTH")) {
            String elk = flat(ro, join(plain("n0"), loopNode(ropts(PORT_CONS, "FREE", SELF_DIST, dist), null, null, null, null), plain("n2")),
                    join(eds("n0>a.p0", "a.p2>n2"), le(2, "a.p0", "a.p1"), le(3, "a.p1", "a.p2"), le(4, "a.p2", "a.p3")));
            stopSite("PortSideAssigner/hiddenAndVisible/" + dist, elk, "SELF_LOOP_PORT_RESTORER", false);
        }
    }




    static void cyclicLoopSites() {
        // Sc21: three disjoint hyper loops over eleven ports (N N E E E E S S S W W; loops {3,10,4}, {5,8,0}, {7,2,1,9,6}) whose pairwise crossing
        // counts are intransitive (found by a random search on the oracle, checked on the dump): the router's dependency graph has a cycle of
        // positive weights and its cycle breaker draws from the random seed; the two seeds draw different ways round
        for (String seed : List.of("1", "4096")) {
            String elk = flat(lo("DIRECTION", RT, "RANDOM_SEED", seed), loopNode(pcFs(), NORTH, NORTH, EAST, EAST, EAST, EAST, SOUTH, SOUTH, SOUTH, WEST, WEST),
                    join(le(0, "a.p3", "a.p10"), le(1, "a.p10", "a.p4"), le(2, "a.p5", "a.p8"), le(3, "a.p8", "a.p0"), le(4, "a.p7", "a.p2"),
                            le(5, "a.p2", "a.p1"), le(6, "a.p1", "a.p9"), le(7, "a.p9", "a.p6")));
            stopSite("RoutingSlotAssigner/cyclicHyperLoops/seed" + seed, elk, "SELF_LOOP_ROUTER", false);
        }
        // four hyper loops with a cycle among the dependencies and segments of unequal out flow (found by the same search)
        stopSite("RoutingSlotAssigner/cyclicHyperLoops/loops4a/seed1", flat(lo("DIRECTION", RT, "RANDOM_SEED", "1"), loopNode(pcFs(), NORTH, NORTH, NORTH, NORTH, EAST, EAST, EAST, EAST, SOUTH, SOUTH, SOUTH, WEST, WEST, WEST),
                join(le(0, "a.p13", "a.p9"), le(1, "a.p9", "a.p8"), le(2, "a.p0", "a.p10"), le(3, "a.p10", "a.p1"), le(4, "a.p2", "a.p11"), le(5, "a.p11", "a.p7"), le(6, "a.p4", "a.p5"), le(7, "a.p5", "a.p12"), le(8, "a.p12", "a.p3"), le(9, "a.p3", "a.p6"))), "SELF_LOOP_ROUTER", false);
        // four hyper loops with a cycle among the dependencies and segments of unequal out flow (found by the same search)
        stopSite("RoutingSlotAssigner/cyclicHyperLoops/loops4b/seed1", flat(lo("DIRECTION", RT, "RANDOM_SEED", "1"), loopNode(pcFs(), NORTH, NORTH, EAST, EAST, EAST, EAST, EAST, SOUTH, SOUTH, SOUTH, WEST, WEST, WEST, WEST, WEST),
                join(le(0, "a.p2", "a.p4"), le(1, "a.p4", "a.p11"), le(2, "a.p14", "a.p3"), le(3, "a.p3", "a.p13"), le(4, "a.p8", "a.p6"), le(5, "a.p6", "a.p1"), le(6, "a.p5", "a.p9"), le(7, "a.p9", "a.p12"), le(8, "a.p12", "a.p10"), le(9, "a.p10", "a.p7"), le(10, "a.p7", "a.p0"))), "SELF_LOOP_ROUTER", false);
    }

    static void dummySites() {
        cyclicLoopSites();
        // Sc22: loops that stay for the P5 routers, POLYLINE and SPLINES
        for (String r : List.of("POLYLINE", "SPLINES")) {
            for (String pair : List.of("EAST-EAST", "WEST-WEST", "NORTH-EAST")) {
                String[] end = pair.split("-");
                String elk = gLoops(lo("DIRECTION", RT, ROUTING, r), lg(pair, FS, sd(WEST, EAST, end[0], end[1]), "a.p2>a.p3"))
                        .replace(plain("b"), sz(plain("b"), 200, 30)); // a layer wider than a: the polyline router bends the loop at the layer edge
                siteRow("DummySelfLoopProcessor/" + pair + "/RIGHT/end/" + r, elk, dummyChain(elk, true));
            }
        }
        // Sc23: a north (south) port dummy with two edges
        String north = flat(lo("DIRECTION", RT, ROUTING, "ORTHOGONAL"), join(plain("a"), plain("b"), plain("c"), pnode("n", FS, null, NORTH)), eds("a>n.p0", "b>n.p0", "n.p0>c"));
        String south = flat(lo("DIRECTION", RT, ROUTING, "ORTHOGONAL"), join(plain("a"), plain("c"), plain("d"), pnode("n", FS, null, SOUTH)), eds("n.p0>c", "n.p0>d", "a>n.p0"));
        stopSite("NorthSouthPortPostprocessor/multiPortDummy/north", north, "NORTH_SOUTH_PORT_POSTPROCESSOR", false);
        stopSite("NorthSouthPortPostprocessor/multiPortDummy/south", south, "NORTH_SOUTH_PORT_POSTPROCESSOR", false);
        // Sc24: a NORTH-NORTH loop dummy next to a head label
        String elk24 = flat(lo("DIRECTION", RT), join(plain("n0"), loopNode(pcFs(), WEST, EAST, NORTH, NORTH), plain("n2")),
                join(edl("e0", "n0", "a.p0", lab("h", 30, 12, "HEAD")), le(1, "a.p1", "n2"), le(2, "a.p2", "a.p3")));
        siteRow("EndLabelPreprocessor/sameSideLoopDummy", elk24, dummyChainTo(elk24, "END_LABEL_PREPROCESSOR"));
    }

    /** As dummyChain, but the chain stops after the plan member (the Dummy op is in front of the first north/south or P3 member). */
    static List<Object> dummyChainTo(String elk, String stop) {
        List<Object> st = dummyChain(elk, true);
        List<Object> out = new ArrayList<>();
        for (Object o : st) {
            out.add(o);
            if (o instanceof List<?> l && l.size() > 1 && l.get(0).equals("runProcessor") && l.get(1).equals(stop)) {
                break;
            }
        }
        out.add(dump());
        return out;
    }

    /** A compound node c (200 x 200, the inner options) with ports of the given sides, the children and the edges (a>b specs), in a root. */
    static String gComp(String ro, String innerOpts, String[] sides, String[] kids, String... edges) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj("c", i, sides[i], null));
        }
        String c = "{\"id\":\"c\",\"width\":200,\"height\":200,\"layoutOptions\":{" + innerOpts + "},\"ports\":[" + String.join(",", ports)
                + "],\"children\":[" + String.join(",", kids) + "],\"edges\":[" + eds(edges) + "]}";
        return "{\"id\":\"root\",\"layoutOptions\":{" + ro + "},\"children\":[" + c + "]}";
    }

    /** gComp with a label on every port of c: with port labels INSIDE the ports become external ports without any edge. */
    static String gCompLabelled(String ro, String innerOpts, String[] sides, String[] kids) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pjl("c", i, sides[i], 18));
        }
        return "{\"id\":\"root\",\"layoutOptions\":{" + ro + "},\"children\":[{\"id\":\"c\",\"width\":200,\"height\":200,\"layoutOptions\":{" + innerOpts
                + "},\"ports\":[" + String.join(",", ports) + "],\"children\":[" + String.join(",", kids) + "]}]}";
    }

    static void componentSites() {
        String ro = lo("DIRECTION", RT);
        String inner = compactionInner();
        // Sc26: external ports without an edge (port labels INSIDE), next to one regular node
        String lonely = compactionInner("PORT_LABELS_PLACEMENT", "INSIDE");
        layoutSite("ComponentsCompactor/loneExternalPorts/fourSides", gCompLabelled(ro, lonely, sd(WEST, NORTH, EAST, SOUTH), new String[] {plain("x")}), "c");
        layoutSite("ComponentsCompactor/loneExternalPorts/northSouth", gCompLabelled(ro, lonely, sd(NORTH, SOUTH), new String[] {plain("x")}), "c");
        // Sc27: one component connected to the external ports of three sides
        layoutSite("ComponentsCompactor/threeSideExtension/ESW", gComp(ro, inner, sd(EAST, SOUTH, WEST), new String[] {plain("x")}, "c.p0>x", "x>c.p1", "c.p2>x"), "c");
        layoutSite("ComponentsCompactor/threeSideExtension/NSW", gComp(ro, inner, sd(NORTH, SOUTH, WEST), new String[] {plain("x")}, "c.p0>x", "x>c.p1", "c.p2>x"), "c");
    }

    static void compactorSites() {
        String ho = "HORIZONTAL_COMPACTOR";
        // Sc29: a comment box without an edge
        for (String st : List.of("LEFT", "EDGE_LENGTH")) {
            stopSite("HorizontalGraphCompactor/commentWithoutEdge/" + st, flat(lo("DIRECTION", RT, ROUTING, "ORTHOGONAL", POST, st),
                    join(plain("a"), plain("b"), comment("c", 40, 20, null)), eds("a>b")), ho, false);
        }
        // Sc30: a hyperedge with three sources and one target
        for (String st : List.of("LEFT_RIGHT_CONNECTION_LOCKING", "EDGE_LENGTH")) {
            stopSite("HorizontalGraphCompactor/hyperedgeFanIn/" + (st.equals("EDGE_LENGTH") ? "EDGE_LENGTH" : "LRCL"),
                    flat(lo("DIRECTION", RT, ROUTING, "ORTHOGONAL", POST, st), join(plain("a"), plain("b"), plain("c"), pnode("t", FS, null, WEST)),
                            eds("a>t.p0", "b>t.p0", "c>t.p0")), ho, false);
        }
        // Sc31: a labelled self loop under compaction
        for (String r : List.of("ORTHOGONAL", "SPLINES")) {
            stopSite("HorizontalGraphCompactor/selfLoopLabel/" + r, gLoops(lo("DIRECTION", RT, ROUTING, r, POST, "LEFT"),
                    labelled("lbl", sd(WEST, EAST, EAST, EAST), "a.p2>a.p3")), ho, false);
        }
        // Sc32: north and south external ports under compaction of the level of c
        for (String st : List.of("LEFT", "EDGE_LENGTH")) {
            layoutSite("HorizontalGraphCompactor/northSouthExternalPorts/" + st, gComp(lo("DIRECTION", RT),
                    lo(PORT_CONS, FS, ROUTING, "ORTHOGONAL", POST, st), sd(NORTH, EAST, SOUTH, WEST), new String[] {plain("k0"), plain("k1"), plain("k2"),
                            plain("k3")}, "c.p0>k0", "k1>c.p1", "c.p2>k2", "k3>c.p3"), "c");
        }
        // Sc33: inverted ports with an edge of two vertical segments
        String eo = lo("DIRECTION", RT, ROUTING, "ORTHOGONAL", POST, "EDGE_LENGTH");
        stopSite("HorizontalGraphCompactor/invertedPorts/west", flat(eo, join(pnode("a", FS, null, WEST), plain("b"), plain("c")),
                eds("a.p0>b", "a.p0>c")), ho, false);
        stopSite("HorizontalGraphCompactor/invertedPorts/east", flat(eo, join(plain("a"), pnode("b", FS, null, EAST), plain("c")),
                eds("a>b.p0", "c>b.p0")), ho, false);
        stopSite("HorizontalGraphCompactor/invertedPorts/both", flat(eo, join(pnode("a", FS, null, WEST), pnode("b", FS, null, EAST), plain("c")),
                eds("a.p0>b.p0", "a.p0>c")), ho, false);
        // an edge from a north port to an east input port: its vertical segment of the north port is in the group of the node itself
        stopSite("HorizontalGraphCompactor/invertedPorts/northToEast", flat(eo, join(pnode("a", FS, null, NORTH), pnode("b", FS, null, EAST), plain("c")),
                eds("a.p0>b.p0", "b>c")), ho, false);
    }


    // Building the file

    static final boolean MARKERS = System.getenv("LOOPS_MARKERS") != null;
    static final boolean DISCOVER = System.getenv("LOOPS_DISCOVER") != null;
    static final String FILTER = System.getenv("LOOPS_FILTER");
    static final String GROUPS = "full,models,scenarios,sites";

    static String fileText(Map<String, Integer> counts, List<Row> rows) {
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ");
        str(out, System.getProperty("java.version"));
        out.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"rowCounts\": {");
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

    /** Every IntermediateProcessorStrategy member is in exactly one of the ported sets or the refusal categories. */
    static void checkClassification() {
        for (IntermediateProcessorStrategy m : IntermediateProcessorStrategy.values()) {
            int sets = (SEVEN_B.contains(m.name()) ? 1 : 0) + (SEVEN_C.contains(m.name()) ? 1 : 0) + (SEVEN_D.contains(m.name()) ? 1 : 0)
                    + (SEVEN_E.contains(m.name()) ? 1 : 0) + (SEVEN_F.contains(m.name()) ? 1 : 0) + (SEVEN_F2.contains(m.name()) ? 1 : 0)
                    + (SEVEN_G.contains(m.name()) ? 1 : 0) + (REFUSAL_CATEGORIES.containsKey(m.name()) ? 1 : 0);
            if (sets != 1) {
                throw new Bug("IntermediateProcessorStrategy." + m.name() + " is in " + sets + " of the ported sets and refusal categories");
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
            if (f.getClassName().startsWith("LayeredLoopsVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    /** Records every row; returns the output file text. */
    static String buildAll() {
        RAN.clear();
        REFUSED_BY_CATEGORY.clear();
        NOT_IN_PLAN.clear();
        FAMILIES.clear();
        BYTES.clear();
        ORACLE_THROWS.clear();
        buildProcessorNames();
        checkClassification();
        List<Spec> specs = new ArrayList<>();
        List<Spec> fulls = new ArrayList<>();
        modelSpecs(specs, fulls, modelFiles());
        scenarioSpecs(specs);
        siteSpecs(specs);
        specs.addAll(0, fulls);
        Set<String> ids = new HashSet<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String group : GROUPS.split(",")) {
            counts.put(group, 0);
        }
        List<Row> rows = new ArrayList<>();
        for (Spec s : specs) {
            if (!ids.add(s.id)) {
                throw new IllegalStateException("duplicate row id " + s.id);
            }
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
            try {
                rows.add(buildRow(s));
            } catch (Refusal r) {
                String category = REFUSAL_CATEGORIES.get(r.member);
                if (DISCOVER) {
                    System.err.println("DISCOVER refusal " + s.id + " " + r.member + (category == null ? "  OUTSIDE 7g/7h" : ""));
                } else if (category == null) {
                    throw r;
                }
                REFUSED_BY_CATEGORY.merge(category == null ? "OUTSIDE 7g/7h" : category, 1, Integer::sum);
                continue;
            } catch (NotInPlan e) {
                if (!s.group.equals("models")) {
                    throw e;
                }
                NOT_IN_PLAN.merge(s.id.split("/")[3], 1, Integer::sum);
                continue;
            } catch (RuntimeException e) {
                StackTraceElement frame = elkFrame(e);
                if (frame == null) {
                    throw e;
                }
                ORACLE_THROWS.add(s.id + " " + e.getClass().getName() + ": " + e.getMessage() + " at " + frame);
                continue;
            }
            counts.merge(s.group, 1, Integer::sum);
            Row r = rows.get(rows.size() - 1);
            String[] p = r.id.split("/");
            BYTES.merge(p[0] + "/" + p[1], (long) r.json.length(), Long::sum);
            BYTES.merge("model " + (p[0].equals("full") ? p[2] : p[0].equals("models") ? p[1] : p[1] + "/" + p[2]), (long) r.json.length(), Long::sum);
        }
        if (FILTER == null) {
            checkCoverage();
        }
        System.err.println("max BFS_NODE_ORDER sources " + maxBfsSources);
        System.err.println("accepted refusals (7h): " + REFUSED_BY_CATEGORY.values().stream().mapToInt(Integer::intValue).sum() + " rows");
        REFUSED_BY_CATEGORY.forEach((k, n) -> System.err.println("accepted refusal category " + k + ": " + n + " rows"));
        NOT_IN_PLAN.forEach((k, n) -> System.err.println("stop not in the algorithm (skipped) " + n + " rows: " + k));
        ORACLE_THROWS.forEach(t -> System.err.println("ORACLE THROWS " + t));
        System.err.println("oracle throws: " + ORACLE_THROWS.size() + " rows");
        if (System.getenv("LOOPS_STATS") != null) {
            BYTES.forEach((kind, v) -> System.err.println("STATS " + v + " " + kind));
        }
        System.err.println("rows " + rows.size() + " " + counts);
        return fileText(counts, rows);
    }

    /** Every arm of this brief ran in a step row, two graphs per arm and direction; the Dummy op ran. */
    static void checkCoverage() {
        List<String> missing = new ArrayList<>();
        if (!RAN.contains("processor/DummySelfLoopProcessor")) {
            missing.add("processor/DummySelfLoopProcessor");
        }
        for (String m : SEVEN_G) {
            if (!RAN.contains(m)) {
                missing.add(m);
            }
            for (String d : ALL_DIRECTIONS) {
                if (FAMILIES.getOrDefault(m + "/" + d, 0) < 2) {
                    missing.add("two scenarios of " + m + " in direction " + d);
                }
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("no step row covers " + missing);
        }
        System.err.println("skipped stops are listed above; row timeouts: 0 (a timeout stops the recording)");
    }

    static void setup(String vectorsDir) throws Exception {
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/layered-loops-vectors.sh does)");
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

    // --sweep / --dump (T19, W5)

    static final long CASE_TIMEOUT_SECONDS = 20, CASE_STACK_BYTES = 64L * 1024 * 1024;
    static final String ELKT_EXTENSION = ".elkt", JSON_EXTENSION = ".json", STATUS = "status", KIND_LEVEL = "level", KIND_MODEL = "model";
    static final String VARIANT_DEFAULT = "default", PART_A = "a", PART_B = "b", PART_C = "c", PTOLEMY_DIR = "realworld/ptolemy";
    /** Part (b), the label sweep's enumeration (LayeredLabelsVectors.java --sweep, 7f2 T15): the directories, the variants, the filter. */
    static final List<String> SWEEP_DIRS = List.of("tests/layered", "tickets/layered", "examples");
    static final List<String> SWEEP_VARIANTS = List.of(VARIANT_DEFAULT, "RIGHT", "LEFT", "DOWN", "UP");
    static final java.util.regex.Pattern LABEL_BEARING = java.util.regex.Pattern.compile("label|comment");
    /** Part (a), the pipeline sweep's enumeration (LayeredPipelineVectors.java --sweep, 7f T14): the directions of a whole-model case. */
    static final List<String> MODEL_DIRECTIONS = List.of("RIGHT", "LEFT", "DOWN", "UP");
    /** Part (c): the corpus directories of the option family (the vendored test/golden/inputs/loops/** files are copies of corpus files). */
    static final List<String> OPTION_MODEL_DIRS = List.of("tests/layered/self_loops", "tests/layered/compaction_oned", "tests/layered/connected_components");
    static final String VENDORED_LOOPS = INPUTS + "loops";

    /**
     * One sweep case. Part (a): kind "level" (model = path under the models dir without ".json", target = level node id or null for the
     * root, variant = an EdgeRouting) or "model" (variant = a Direction on the root). Part (b): kind "model", model without ".elkt",
     * variant "default" or a Direction on the root. Part (c): kind "model", model WITH its extension, variant "<option id>=<value>" set on
     * every node with children (the root included).
     */
    record SweepCase(String part, String kind, String model, String target, String variant) {
        String id() {
            if (part.equals(PART_A) && kind.equals(KIND_LEVEL)) {
                return part + "/" + kind + "/" + model + "/" + levelName(target) + "/" + variant;
            }
            return part + "/" + kind + "/" + model + "/" + variant;
        }

        String file() {
            return model + (part.equals(PART_A) ? JSON_EXTENSION : part.equals(PART_B) ? ELKT_EXTENSION : "");
        }
    }

    /** A case outside the sweep's scope (W5: the whole plan of no level holds one of the nine arms and no connectedComponents option is on). */
    static final class OutOfScope extends RuntimeException {
        OutOfScope(String reason) {
            super(reason, null, false, false);
        }
    }

    /** A property setting of the option family. */
    record Setting(IProperty<Object> property, Object value) {
        String variant() {
            return property.getId() + "=" + ((Enum<?>) value).name();
        }
    }

    @SuppressWarnings("unchecked")
    static Setting setting(IProperty<?> property, Object value) {
        return new Setting((IProperty<Object>) property, value);
    }

    /** Part (c)'s options: wrapping.strategy at default cutting, and the two post compaction strategies the vectors do not spread over models. */
    static List<Setting> optionFamily() {
        return List.of(setting(LayeredOptions.WRAPPING_STRATEGY, WrappingStrategy.SINGLE_EDGE),
                setting(LayeredOptions.WRAPPING_STRATEGY, WrappingStrategy.MULTI_EDGE),
                setting(LayeredOptions.COMPACTION_POST_COMPACTION_STRATEGY, GraphCompactionStrategy.EDGE_LENGTH),
                setting(LayeredOptions.COMPACTION_POST_COMPACTION_STRATEGY, GraphCompactionStrategy.LEFT_RIGHT_CONNECTION_LOCKING));
    }

    static Setting settingOf(String variant) {
        return optionFamily().stream().filter(s -> s.variant().equals(variant)).findFirst()
                .orElseThrow(() -> new Bug("no option family member " + variant));
    }

    static ElkNode loadText(String text) {
        return ElkGraphJson.forGraph(text).toElk();
    }

    static ElkNode loadSweepModel(Path modelsDir, SweepCase c) throws IOException {
        return loadAny(modelsDir.resolve(c.file()));
    }

    /** The relative paths (to base, '/'-separated, without the extension when stripExtension) of the files of dir ending in an extension. */
    static List<String> filesUnder(Path base, Path dir, List<String> extensions, boolean stripExtension) throws IOException {
        try (var files = Files.walk(dir)) {
            return files.filter(Files::isRegularFile).filter(p -> extensions.stream().anyMatch(e -> p.toString().endsWith(e)))
                    .map(p -> base.relativize(p).toString().replace('\\', '/'))
                    .map(f -> stripExtension ? f.substring(0, f.lastIndexOf('.')) : f).sorted().toList();
        }
    }

    /** Part (a): every realworld/ptolemy/**.json (the pipeline sweep's models), without the extension. */
    static List<String> ptolemyModels(Path modelsDir) throws IOException {
        return filesUnder(modelsDir, modelsDir.resolve(PTOLEMY_DIR), List.of(JSON_EXTENSION), true);
    }

    /** Whether the models directory holds the model: a model the oracle cannot load is skipped and named on stderr (as the labels sweep). */
    static boolean loadable(Path modelsDir, String file) throws IOException {
        try {
            loadAny(modelsDir.resolve(file));
            return true;
        } catch (RuntimeException | IOException e) {
            System.err.println("skipped model " + file + ": does not load (" + e.getClass().getSimpleName() + ")");
            return false;
        }
    }

    /** Part (b): every label- or comment-bearing .elkt of SWEEP_DIRS, sorted, without the extension (the labels sweep's models). */
    static List<String> sweepModels(Path modelsDir, boolean checkLoad) throws IOException {
        List<String> models = new ArrayList<>();
        for (String dir : SWEEP_DIRS) {
            for (String m : filesUnder(modelsDir, modelsDir.resolve(dir), List.of(ELKT_EXTENSION), true)) {
                if (LABEL_BEARING.matcher(Files.readString(modelsDir.resolve(m + ELKT_EXTENSION), StandardCharsets.UTF_8)).find()) {
                    models.add(m);
                }
            }
        }
        Collections.sort(models);
        List<String> kept = new ArrayList<>();
        for (String m : models) {
            if (!checkLoad || loadable(modelsDir, m + ELKT_EXTENSION)) {
                kept.add(m);
            }
        }
        return kept;
    }

    /**
     * Part (c): the corpus directories of OPTION_MODEL_DIRS, the vendored test/golden/inputs/loops files (copies of corpus files, read from the
     * models directory, which must hold them) and every ptolemy .json, with the extension, sorted.
     */
    static List<String> optionModels(Path modelsDir, boolean checkLoad) throws IOException {
        TreeSet<String> files = new TreeSet<>();
        for (String dir : OPTION_MODEL_DIRS) {
            files.addAll(filesUnder(modelsDir, modelsDir.resolve(dir), List.of(ELKT_EXTENSION), false));
        }
        Path vendored = REPO.resolve(VENDORED_LOOPS);
        for (String f : filesUnder(vendored, vendored, List.of(ELKT_EXTENSION, JSON_EXTENSION), false)) {
            if (!Files.isRegularFile(modelsDir.resolve(f))) {
                throw new Bug("vendored " + VENDORED_LOOPS + "/" + f + " has no counterpart in the models directory");
            }
            files.add(f);
        }
        files.addAll(filesUnder(modelsDir, modelsDir.resolve(PTOLEMY_DIR), List.of(JSON_EXTENSION), false));
        List<String> kept = new ArrayList<>();
        for (String f : files) {
            if (!checkLoad || loadable(modelsDir, f)) {
                kept.add(f);
            }
        }
        return kept;
    }

    /** Levels of part (a): null (root), then every ElkNode with children and a unique id (the pipeline sweep's rule). */
    static List<String> sweepTargets(String text, String model) {
        List<String> targets = new ArrayList<>();
        targets.add(null);
        for (TreeIterator<EObject> it = loadText(text).eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                if (n.getIdentifier() == null || targets.contains(n.getIdentifier())) {
                    System.err.println("skipped level of " + model + ": node id " + n.getIdentifier() + " is missing or not unique");
                } else {
                    targets.add(n.getIdentifier());
                }
            }
        }
        return targets;
    }

    /** Part (a): the pipeline sweep's cases of one ptolemy model: every edge-bearing level x the routings, the whole model x the directions. */
    static List<SweepCase> pipelineCases(String model, String text) {
        List<SweepCase> out = new ArrayList<>();
        for (String t : sweepTargets(text, model)) {
            if (new Base(new ElkGraphTransformer().importGraph(importTarget(loadText(text), t))).edges.isEmpty()) {
                System.err.println("skipped level " + model + " " + levelName(t) + " (no edges)");
                continue;
            }
            for (EdgeRouting r : ROUTINGS) {
                out.add(new SweepCase(PART_A, KIND_LEVEL, model, t, r.name()));
            }
        }
        for (String d : MODEL_DIRECTIONS) {
            out.add(new SweepCase(PART_A, KIND_MODEL, model, null, d));
        }
        return out;
    }

    /** The models of a part (checkLoad: skip and name the ones the oracle cannot load; the dump mode keeps them to find its case). */
    static List<String> modelsOf(String part, Path modelsDir, boolean checkLoad) throws IOException {
        return switch (part) {
            case PART_A -> ptolemyModels(modelsDir);
            case PART_B -> sweepModels(modelsDir, checkLoad);
            case PART_C -> optionModels(modelsDir, checkLoad);
            default -> throw new Bug("no sweep part " + part);
        };
    }

    /** The cases of one model of a part. */
    static List<SweepCase> casesOf(String part, String model, Path modelsDir) throws IOException {
        List<SweepCase> out = new ArrayList<>();
        switch (part) {
            case PART_A -> out.addAll(pipelineCases(model, Files.readString(modelsDir.resolve(model + JSON_EXTENSION), StandardCharsets.UTF_8)));
            case PART_B -> SWEEP_VARIANTS.forEach(v -> out.add(new SweepCase(PART_B, KIND_MODEL, model, null, v)));
            default -> optionFamily().forEach(s -> out.add(new SweepCase(PART_C, KIND_MODEL, model, null, s.variant())));
        }
        return out;
    }

    /** The IEEE-754 bits of a double as 16 lowercase hex digits (the pipeline sweep's hx), with every NaN as the one canonical NaN
     * 7ff8000000000000 (Double.doubleToLongBits): a NaN is a value of the sweep, but the sign bit of a NaN the JVM computes differs
     * between the interpreter and compiled code, so the raw bits of one case changed from run to run (journal, T19). Every other
     * value keeps its raw bits. */
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

    /** Every ElkNode of the tree, the root first. */
    static List<ElkNode> nodesOf(ElkNode root) {
        List<ElkNode> nodes = new ArrayList<>();
        nodes.add(root);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n) {
                nodes.add(n);
            }
        }
        return nodes;
    }

    /** Scope (W5): the whole plan of some level holds one of the nine arms, or a node has COMPACTION_CONNECTED_COMPONENTS on. */
    static boolean inScope(List<List<String>> plans, List<ElkNode> nodes) {
        return plans.stream().anyMatch(plan -> plan.stream().anyMatch(SEVEN_G::contains))
                || nodes.stream().anyMatch(n -> n.getProperty(LayeredOptions.COMPACTION_CONNECTED_COMPONENTS));
    }

    /** The first member of the plans outside the ported sets (7h's categories, or a stop of the sweep), as a Refusal. */
    static void refuseUnported(SweepCase c, List<List<String>> plans) {
        for (List<String> plan : plans) {
            for (String name : plan) {
                if (!allowed(name)) {
                    throw new Refusal("case " + c.id() + " names " + name, name);
                }
            }
        }
    }

    /** A level of part (a): the pipeline sweep's flow (import the level, ElkLayered.doLayout, applyLayout), the plan checked first. */
    static Map<String, Object> levelCanonical(SweepCase c, Path modelsDir, boolean scoped) throws IOException {
        ElkNode probe = importTarget(loadSweepModel(modelsDir, c), c.target());
        probe.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.valueOf(c.variant()));
        ElkLayered planner = new ElkLayered();
        List<List<String>> plans = List.of(positionalNames(planner.getLayoutTestConfiguration(
                planner.prepareLayoutTest(new ElkGraphTransformer().importGraph(probe)))));
        if (scoped && !inScope(plans, List.of(probe))) {
            throw new OutOfScope("no arm in the plan");
        }
        refuseUnported(c, plans);
        ElkNode level = importTarget(loadSweepModel(modelsDir, c), c.target());
        level.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.valueOf(c.variant()));
        ElkGraphTransformer transformer = new ElkGraphTransformer();
        LGraph lgraph = transformer.importGraph(level);
        new ElkLayered().doLayout(lgraph, new BasicProgressMonitor().withMaxHierarchyLevels(0));
        transformer.applyLayout(lgraph);
        return elkDump(level);
    }

    /** The options of the case on the model: a direction on the root (parts a, b), or the option family member on every level (part c). */
    static void configure(SweepCase c, ElkNode root) {
        if (c.part().equals(PART_C)) {
            Setting s = settingOf(c.variant());
            for (ElkNode n : nodesOf(root)) {
                if (n == root || !n.getChildren().isEmpty()) {
                    n.setProperty(s.property(), s.value());
                }
            }
        } else if (!c.variant().equals(VARIANT_DEFAULT)) {
            root.setProperty(CoreOptions.DIRECTION, org.eclipse.elk.core.options.Direction.valueOf(c.variant()));
        }
    }

    /** The whole model through the recursive engine; the whole plan of every level decides scope and refusal (G2). */
    static Map<String, Object> modelCanonical(SweepCase c, Path modelsDir, boolean scoped) throws IOException {
        ElkNode root = loadSweepModel(modelsDir, c);
        configure(c, root);
        boolean sieved = scoped && !c.part().equals(PART_C);
        try {
            refuseOptions(root);
        } catch (Refusal r) { // INCLUDE_CHILDREN: the plan is never built, so only a connectedComponents option can put the case in scope
            if (sieved && !inScope(List.of(), nodesOf(root))) {
                throw new OutOfScope("refused by option before any plan (" + r.member + ")");
            }
            throw r;
        }
        PlanRecorder recorder = new PlanRecorder();
        TestController controller = new TestController(LayeredOptions.ALGORITHM_ID);
        controller.addLayoutExecutionListener(recorder);
        var pool = LayoutMetaDataService.getInstance().getAlgorithmData(LayeredOptions.ALGORITHM_ID).getInstancePool();
        AbstractLayoutProvider provider = pool.fetch();
        controller.install(provider);
        pool.release(provider);
        List<List<String>> plans = new ArrayList<>();
        try {
            new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
        } catch (RuntimeException | Error e) { // a throw is in scope when the plans recorded up to it hold an arm (none: no layered level ran)
            recorder.processors.values().forEach(plan -> plans.add(positionalNames(plan)));
            if (sieved && !inScope(plans, nodesOf(root))) {
                throw new OutOfScope("threw before the plans held an arm (" + e.getClass().getSimpleName() + ")");
            }
            throw e;
        } finally {
            controller.uninstall();
        }
        recorder.processors.values().forEach(plan -> plans.add(positionalNames(plan)));
        if (sieved && !inScope(plans, nodesOf(root))) {
            throw new OutOfScope("no arm in the plans");
        }
        refuseUnported(c, plans);
        return elkDump(root);
    }

    /** Runs the case on a thread with a big stack; null when the timeout fires. */
    static Map<String, Object> runCase(SweepCase c, Path modelsDir, boolean scoped) throws Throwable {
        java.util.concurrent.FutureTask<Map<String, Object>> task = new java.util.concurrent.FutureTask<>(() -> {
            currentRow = c.id();
            return c.kind().equals(KIND_LEVEL) ? levelCanonical(c, modelsDir, scoped) : modelCanonical(c, modelsDir, scoped);
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

    static void describe(Map<String, Object> m, SweepCase c) {
        m.put("part", c.part());
        m.put("kind", c.kind());
        m.put("model", c.model());
        m.put("target", c.target());
        m.put("variant", c.variant());
    }

    /** The first org.eclipse.elk frame of a throwable as "File.java:line", or null (Errors and exceptions thrown outside ELK have none). */
    static String elkFrameOf(Throwable e) {
        StackTraceElement f = e instanceof RuntimeException re ? elkFrame(re) : null;
        return f == null ? null : f.getFileName() + ":" + f.getLineNumber();
    }

    /** One line of the sweep, or a STATUS_OUT_OF_SCOPE map (not written) for a case outside scope. A refusal outside 7h's categories stops the sweep naming the case. */
    static final String STATUS_OUT_OF_SCOPE = "out-of-scope";
    /** Diagnosis aid: LOOPS_SWEEP_ONLY=<regex> runs only the sweep cases whose id contains a match (the stamp of loops-sweep.sh does not cover it: rerun with --force). */
    /** Diagnosis aid: LOOPS_SWEEP_DUMP_DIR=<dir> also writes the canonical form of every ok sweep case whose id matches LOOPS_SWEEP_DUMP_MATCH (default all) there. */
    static final String SWEEP_DUMP_DIR = System.getenv("LOOPS_SWEEP_DUMP_DIR");
    static final java.util.regex.Pattern SWEEP_DUMP_MATCH = java.util.regex.Pattern.compile(System.getenv().getOrDefault("LOOPS_SWEEP_DUMP_MATCH", ""));
    static final java.util.regex.Pattern SWEEP_ONLY = System.getenv("LOOPS_SWEEP_ONLY") == null ? null : java.util.regex.Pattern.compile(System.getenv("LOOPS_SWEEP_ONLY"));

    static Map<String, Object> sweepOutcome(SweepCase c, Path modelsDir) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.id());
        try {
            Map<String, Object> dump = runCase(c, modelsDir, true);
            if (dump == null) {
                m.put(STATUS, "timeout");
                return m;
            }
            describe(m, c);
            m.put("sha256", sha256Text(canonicalText(dump)));
            if (SWEEP_DUMP_DIR != null && SWEEP_DUMP_MATCH.matcher(c.id()).find()) {
                Files.createDirectories(Path.of(SWEEP_DUMP_DIR));
                Files.writeString(Path.of(SWEEP_DUMP_DIR, c.id().replace('/', '_') + ".json"), canonicalText(dump) + "\n", StandardCharsets.UTF_8);
            }
        } catch (OutOfScope s) {
            m.put(STATUS, STATUS_OUT_OF_SCOPE);
            m.put("reason", s.getMessage());
            return m;
        } catch (Refusal r) {
            if (!REFUSAL_CATEGORIES.containsKey(r.member)) {
                throw new Bug("refusal outside 7h (stop): " + c.id() + " names " + r.member);
            }
            m.put(STATUS, "refused");
            m.put("part", c.part());
            m.put("processor", r.member);
            m.put("category", REFUSAL_CATEGORIES.get(r.member));
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

    /** Counters of a sweep, keyed by part: statuses, cases outside scope, refusals per category, throws per class and ELK frame. */
    static final class SweepStats {
        final Map<String, Integer> counts = new TreeMap<>(), outOfScope = new TreeMap<>(), refusals = new TreeMap<>(), throwsBy = new TreeMap<>();

        void add(SweepCase c, Map<String, Object> m) {
            String status = String.valueOf(m.getOrDefault(STATUS, "ok"));
            if (status.equals(STATUS_OUT_OF_SCOPE)) {
                outOfScope.merge(c.part() + " " + m.get("reason"), 1, Integer::sum);
                return;
            }
            counts.merge(c.part() + " " + status, 1, Integer::sum);
            if (status.equals("refused")) {
                refusals.merge(c.part() + " " + m.get("category") + " " + m.get("processor"), 1, Integer::sum);
            } else if (status.equals("throws")) {
                throwsBy.merge(c.part() + " " + m.get("class") + " " + m.get("frame"), 1, Integer::sum);
            }
        }
    }

    static void sweep(Path modelsDir, Path outDir) throws IOException {
        Files.createDirectories(outDir);
        SweepStats stats = new SweepStats();
        long start = System.currentTimeMillis();
        try (var out = Files.newBufferedWriter(outDir.resolve("results.jsonl"), StandardCharsets.UTF_8)) {
            for (String part : List.of(PART_A, PART_B, PART_C)) {
                List<SweepCase> cases = new ArrayList<>();
                for (String model : modelsOf(part, modelsDir, true)) {
                    cases.addAll(casesOf(part, model, modelsDir));
                }
                System.err.println("part " + part + ": " + cases.size() + " candidate cases");
                for (int i = 0; i < cases.size(); i++) {
                    if (SWEEP_ONLY != null && !SWEEP_ONLY.matcher(cases.get(i).id()).find()) {
                        continue;
                    }
                    Map<String, Object> m = sweepOutcome(cases.get(i), modelsDir);
                    stats.add(cases.get(i), m);
                    if (!STATUS_OUT_OF_SCOPE.equals(m.get(STATUS))) {
                        out.write(json(m));
                        out.write('\n');
                    }
                    if ((i + 1) % 250 == 0 || i + 1 == cases.size()) {
                        out.flush();
                        System.err.println("part " + part + " " + (i + 1) + "/" + cases.size() + " " + (System.currentTimeMillis() - start) / 1000 + " s "
                                + stats.counts);
                    }
                }
            }
        }
        System.err.println("sweep done " + stats.counts + " in " + (System.currentTimeMillis() - start) / 1000 + " s");
        System.err.println("out of scope (dropped) " + stats.outOfScope);
        System.err.println("refusals " + stats.refusals);
        System.err.println("throws " + stats.throwsBy);
    }

    /** Writes the canonical form of one case (the text the hash is taken over) to <outDir>/<id with / as _>.json. */
    static void dump(String id, Path modelsDir, Path outDir) throws Throwable {
        String part = id.substring(0, 1);
        for (String model : modelsOf(part, modelsDir, false)) {
            if (!id.startsWith(part + "/" + KIND_MODEL + "/" + model + "/") && !id.startsWith(part + "/" + KIND_LEVEL + "/" + model + "/")) {
                continue;
            }
            for (SweepCase c : casesOf(part, model, modelsDir)) {
                if (!c.id().equals(id)) {
                    continue;
                }
                Map<String, Object> dump;
                try {
                    dump = runCase(c, modelsDir, false);
                } catch (Refusal r) {
                    System.err.println("case " + id + " is refused: " + r.getMessage());
                    System.exit(1);
                    return;
                }
                if (dump == null) {
                    throw new Bug("case " + id + " times out");
                }
                Files.createDirectories(outDir);
                Path file = outDir.resolve(id.replace('/', '_') + ".json");
                Files.writeString(file, canonicalText(dump) + "\n", StandardCharsets.UTF_8);
                System.err.println("wrote " + file);
                return;
            }
        }
        throw new Bug("no sweep case has the id " + id);
    }

    static void sweepMain(String[] args) throws Throwable {
        setup(null);
        REPO = Path.of("").toAbsolutePath().normalize(); // part (c) reads the vendored file list under the repository root
        if (!Files.isDirectory(REPO.resolve(VENDORED_LOOPS))) {
            throw new IllegalStateException("run from the repository root (no " + VENDORED_LOOPS + " under " + REPO + ")");
        }
        buildProcessorNames();
        if (args.length == 3 && args[0].equals("--sweep")) {
            sweep(Path.of(args[1]), Path.of(args[2]));
        } else if (args.length == 4 && args[0].equals("--dump")) {
            dump(args[1], Path.of(args[2]), Path.of(args[3]));
        } else {
            throw new IllegalArgumentException("usage: --sweep <modelsDir> <outDir> | --dump <case id> <modelsDir> <outDir>");
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
        setup(args[1]);
        String file;
        try {
            file = buildAll();
            if (FILTER == null) {
                String again = buildAll();
                if (!file.equals(again)) {
                    throw new IllegalStateException("two builds differ\n" + clip(file, again) + "\n" + clip(again, file));
                }
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

