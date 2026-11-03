// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7e, T1, T13, R1-R3, R7, R12) for the org.eclipse.elk.alg.layered edge
// routing (p5edges: OrthogonalEdgeRouter, PolylineEdgeRouter, SplineEdgeRouter and their helpers, EdgeRouterFactory) and the six
// processors around it: HyperedgeDummyMerger, HierarchicalPortPositionProcessor, LayerSizeAndGraphHeightCalculator,
// LongEdgeJoiner, NorthSouthPortPostprocessor and FinalSplineBendpointsCalculator. The Java is the spec; this program only CALLS
// ELK APIs (reflection where a member is private or protected) and records results; it embeds no ELK implementation.
// Run: tools/vectors/layered-routing-vectors.sh <outDir>   (java -cp ... LayeredRoutingVectors.java <outDir> <tools/vectors dir>)
//
// ORIGIN (B7: single-file launchers share no code): the core is copied from tools/vectors/LayeredPlacementVectors.java (7d, itself
// copied from LayeredOrderVectors.java, 7c), lines 1-1,822 there (JSON helpers, the LGraph Dump, the C4 Encoder and decode,
// importGraph/normalise/Base/phaseDump, the step interpreter, Spec/execute/buildRow, strictNumbers/strictParse, the row timeout,
// the model files and levels, pipeline()) and 1,926-2,075 (the ELK JSON builders). Not copied: the 7d variant and scenario
// builders, its sites, its sweep and the 7b seeded-position configurator (no INTERACTIVE pipeline row is recorded here). The row
// format, the C4 values, the refusal rule, the BFS guard and the re-run / build-twice / strict-parse / size checks are 7c's and
// 7d's (see their headers); what follows is what this recorder adds or changes.
//
// Output: two files in <outDir> (2-space top level, one compact JSON row per line, trailing newline, each under 5 MiB):
//   layered-routing.json        { jdk, oracle, rowCounts: { models }, rows }                         group models
//   layered-routing-steps.json  { jdk, oracle, rowCounts: { scenarios, sites, calls }, rows }       groups scenarios, sites, calls
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable across both files. steps null
//   = pipeline row, else step row. Flat levels only (C3): a nested LGraph, RANDOM_SEED 0 or an exception thrown by a step stops
//   the recording.
//
// Stops (pipeline rows; ElkLayered.prepareLayoutTest, then the plan is walked with runLayoutTestStep): "P1".."P5" = the configured
//   phase (P4: the class NodePlacementStrategy.<S>.create() returns, "P4_NODE_PLACEMENT/<S>" in the prefix; P5: the class
//   EdgeRouterFactory.factoryFor(r).create() returns, "P5_EDGE_ROUTING/<ROUTING>"), else an IntermediateProcessorStrategy member.
//   A stop the plan does not contain skips the row (counted on stderr): HYPEREDGE_DUMMY_MERGER without a hyperedge,
//   FINAL_SPLINE_BENDPOINTS_CALCULATOR under ORTHOGONAL. Allowed prefix members: the 7b ten (SEVEN_B), 7c ten (SEVEN_C), 7d five
//   (SEVEN_D), 7e six (SEVEN_E: HYPEREDGE_DUMMY_MERGER, HIERARCHICAL_PORT_POSITION_PROCESSOR, LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR,
//   LONG_EDGE_JOINER, NORTH_SOUTH_PORT_POSTPROCESSOR, FINAL_SPLINE_BENDPOINTS_CALCULATOR) and P1-P5. REFUSAL RULE (R1, amends N1):
//   any other member makes the recorder exit 1 naming the row, unless the row is a models row listed in ACCEPTED_REFUSALS
//   ("<model>/<target or root>/<first refused member>") whose member is in REFUSAL_CATEGORIES (7d's list without
//   HYPEREDGE_DUMMY_MERGER, plus for a plan reaching after P5 the 7f members HYPERNODE_PROCESSOR,
//   HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER, CONSTRAINTS_POSTPROCESSOR, COMMENT_POSTPROCESSOR, LABEL_DUMMY_REMOVER,
//   END_LABEL_POSTPROCESSOR, END_LABEL_SORTER, HIERARCHICAL_NODE_RESIZER and the 7g members SELF_LOOP_POSTPROCESSOR,
//   BREAKING_POINT_REMOVER, HORIZONTAL_COMPACTOR); the rows of that stop are not recorded. The step ops are 7c's; runProcessor
//   accepts SEVEN_B..SEVEN_E members, runPhase also "P5_EDGE_ROUTING" with an EdgeRouting name, plus ["call", "<Class>.<method>", <arg>...].
//
// expected = 7d's { layers, layerless, hidden, edges, ports, changed } (+ dump on step rows under ten nodes) plus geometry (N3, R3;
//   doubles as 16 hex digits of the raw bits): { nodes: { "<node path>": { pos, size, margin } }, layers: [[w, h]], ports?, labels?
//   (only for the stops LABEL_AND_NODE_SIZE_PROCESSOR and HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR or a graph with a flexible node),
//   graph: { size: [w, h], offset: [x, y] }, edges: { "<edge path>": { bendPoints: [[x, y]], junctionPoints?: [[x, y]] } } (every edge
//   of the traversal, in the order of expected.edges; junctionPoints only when LayeredOptions.JUNCTION_POINTS is set),
//   splines?: { "<start edge path>": { chain: ["<edge path>"], route: [{ box: [x, y, w, h], rank, isStraight, xDelta,
//   westOfInitialLayer, centerControlPointY }] } } } on a P5 stop whose router is SPLINES: for every edge with SPLINE_ROUTE_START
//   the SPLINE_EDGE_CHAIN and the SplineSegment fields (J/p5edges/splines/SplineSegment.java). splines.route.start (SplineSegments,
//   unencodable) is left out of "changed" and of the full dump (IGNORED_IDS, Dump.properties); splines.edgeChain stays.
//
// Rows. models/<model>/<target or root>/<stop>/<variant>: every vendored model (the 77 .elkt and 9 ptolemy models of 7d, the 29
//   vendored splines / hyperedge_merging / hierarchical_ports models, tickets 726, 341, 371) at every edge-bearing level. Stops:
//   LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR, HIERARCHICAL_PORT_POSITION_PROCESSOR, HYPEREDGE_DUMMY_MERGER (variant default); P5 and
//   NORTH_SOUTH_PORT_POSTPROCESSOR x EdgeRouting (variant = the routing name); LONG_EDGE_JOINER (ORTHOGONAL),
//   FINAL_SPLINE_BENDPOINTS_CALCULATOR (SPLINES); P4 (BRANDES_KOEPF) on the levels whose plan holds HYPEREDGE_DUMMY_MERGER (the
//   levels 7d refused). Variant families (VARIANT_MODELS only), variant = <ROUTING>-<family>: unnecessary-bendpoints (ORTHOGONAL:
//   P5, LEJ); sloppy, sloppy-0.6 (splines.mode=SLOPPY x layerSpacingFactor {default, 0.6}: P5, FSBC); sloped-edge-zone-0.0
//   (POLYLINE: P5); merge-edges (ORTHOGONAL: P5, HDM, LEJ); edge-edge-17, edge-node-14 (ORTHOGONAL, SPLINES: P5, FSBC) and
//   node-node-32 (all three: P5, FSBC for SPLINES); feedback-edges (all three: P5). Oracle limits: (1) hierarchical_ports-
//   hierarchy03..07 and 09 / Compound throw a NullPointerException in BetweenLayerEdgeTwoNodeCrossingsCounter$AdjacencyList under
//   POLYLINE and SPLINES (only the orthogonal router adds HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR): ORACLE_THROWS lists them and
//   their rows are skipped; (2) SplineEdgeRouter throws in SplineSegment.anchorY on north / south external ports without
//   NORTH_SOUTH_PORT_POSTPROCESSOR, so the spline external-port scenarios use west / east ports only.
//   scenarios/<class>/<name>: inline graphs (the ELK JSON export), steps importGraph, normalise, P1 GREEDY, P2 NETWORK_SIMPLEX,
//   P3 LAYER_SWEEP, the before-P4 and before-P5 processors in IntermediateProcessorStrategy order, P4 BRANDES_KOEPF, P5 <R>, the
//   after-P5 processors to the stop, dump. Options live in the graph's layoutOptions so ROUTING_CROSSCHECK=1 can run each as a
//   pipeline row and compare layers, ports, edges and geometry. External ports stop at HIERARCHICAL_PORT_POSITION_PROCESSOR or P5
//   (HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER is 7f).
//   sites/<Class>/<name>[/<variant>] (T13, R12): one step row per S scenario of plans/layered-edge-routing/unreached.md, chain-forced
//   where the pipeline cannot reach the branch: plan A (the orthogonal plan under the INTERACTIVE minimizer and placer, explicit
//   x / y), no SELF_LOOP_PREPROCESSOR, HYPEREDGE_DUMMY_MERGER inside a SPLINES plan, a processor on an empty Layer, the
//   compaction option without the 7g compactor. Not cross-checked against a pipeline row.
//   calls/<Class>/<name>: ["importGraph", null] then ["call", "<Class>.<method>", <arg>...] on the inline graph (classes of
//   J/p5edges/splines). Args: ["port"|"node", "<path>"], ["double", Hex], ["boolean", b], ["int", n], ["enum", "<Type>.<NAME>"]
//   (org.eclipse.elk.core.options), ["vector", Hex, Hex], ["vectors", [[Hex, Hex]]], ["rectangle", Hex top, right, bottom, left],
//   ["nubs", clamped, dim, [[Hex, Hex]]] (a new NubSpline). An instance method's first argument is the receiver; a static
//   method wins over an instance method of the same name; a void method returns its receiver. expected = { result: { type,
//   value } }: double (Hex), boolean, vector (HexPair, null for parallel lines), rectangle (HexQuad top, right, bottom, left; also
//   an ElkMargin), nubs ({ controlPoints, knotVector, dim, outerBox, firstLabelPosition? (NubsSelfLoop only) }).
//
// TRIMMING (R2, 5 MiB): the untrimmed set measured 11.4 MB, over the cap of layered-routing.json. Applied in R2's order: (1) the
//   variant families run on VARIANT_MODELS (4 models); (2) the ptolemy P5 POLYLINE / SPLINES rows and the SPLINES FSBC result of
//   ptolemy levels outside the trim set (the three smallest flattened ptolemy models plus VARIANT_MODELS) are not recorded; (3)
//   LONG_EDGE_JOINER is recorded on the trim set only. See routingRows and VARIANT_MODELS.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 so identity-hashed collections
//   iterate in insertion order (AD-10; up to 10 entries, then HashMap treeifies); main fails without it. R7:
//   HyperEdgeCycleDetector and SplineEdgeRouter.breakCycles draw from the graph's seeded java.util.Random (seed 1, whole prefix
//   replayed; a sites row may set RANDOM_SEED, never 0).
//
// Diagnosis aids (environment, output unchanged when unset): ROUTING_FILTER=<text> builds only rows whose id contains the text (no
//   coverage check, one build); ROUTING_DISCOVER=1 prints refusals instead of stopping; ROUTING_MARKERS=1 writes "ROW <id>" to
//   stdout per row; PHASE_TRACE=1 one stderr line per row; ROUTING_CROSSCHECK=1 verifies the scenario chains against the pipeline
//   (=v also prints each pipeline prefix and step list); ROUTING_STATS=1 prints the bytes per row family; ROUTING_CAP_MB=<n> raises
//   the size cap for a measuring run (never for the ref).
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
import org.eclipse.elk.alg.layered.ElkLayered;
import org.eclipse.elk.alg.layered.graph.LEdge;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.LGraphElement;
import org.eclipse.elk.alg.layered.graph.LLabel;
import org.eclipse.elk.alg.layered.graph.LNode;
import org.eclipse.elk.alg.layered.graph.LPort;
import org.eclipse.elk.alg.layered.graph.Layer;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
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
import org.eclipse.elk.alg.layered.p3order.LayerSweepCrossingMinimizer;
import org.eclipse.elk.alg.layered.p5edges.EdgeRouterFactory;
import org.eclipse.elk.alg.layered.p5edges.splines.NubSpline;
import org.eclipse.elk.alg.layered.p5edges.splines.NubsSelfLoop;
import org.eclipse.elk.alg.layered.p5edges.splines.Rectangle;
import org.eclipse.elk.alg.layered.p5edges.splines.SplineSegment;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkRectangle;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

public class LayeredRoutingVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT_MODELS = "layered-routing.json", OUTPUT_STEPS = "layered-routing-steps.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed", REPO_PREFIX = "repo:";
    static final String PTOLEMY = "test/golden/inputs/realworld/ptolemy/", LAYERED_TESTS = "test/golden/inputs/tests/layered/";
    static final String TICKETS = "test/golden/inputs/tickets/layered/";
    static final int MAX_DEPTH = 8, FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = (System.getenv("ROUTING_CAP_MB") == null ? 5L : Long.parseLong(System.getenv("ROUTING_CAP_MB"))) * 1024 * 1024; // ROUTING_CAP_MB: diagnosis aid, the committed output stays under 5 MB
    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING", P3 = "P3_NODE_ORDERING", P4 = "P4_NODE_PLACEMENT", P5 = "P5_EDGE_ROUTING";
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings", "splines.route.start"); // T1: the spline route is recorded in geometry.splines (R3)
    /** Refusals (R1, amends N1/C2) the recorder accepts, "<model id>/<target or root>/<member>": the level's graph makes ElkLayered add a
     * processor of a later mission (7f labels, comments, hypernodes, the hierarchical orthogonal router; 7g self loops, wrapping, breaking
     * points, compaction), so the rows of that stop cannot be replayed by the 7b-7e sets and are not recorded. Any other refusal exits 1. */
    static final Set<String> ACCEPTED_REFUSALS = Set.of( "hyperedge_merging-hyperedge_labels/root/LABEL_DUMMY_INSERTER",
            "hyperedge_merging-unequal_src_tgt_with_labels/root/LABEL_DUMMY_INSERTER",
            "node_placement-KIPRA-1426-demo2-KIPRA-1426/root/COMMENT_PREPROCESSOR", "partitioning-withEdgeLabels/root/LABEL_DUMMY_INSERTER",
            "preserve_order-backwardsEdges/root/LABEL_DUMMY_INSERTER", "preserve_order-dummyNodeNoConnectedNode/root/LABEL_DUMMY_INSERTER",
            "preserve_order-dummyNodeNoConnectingNode2/root/LABEL_DUMMY_INSERTER",
            "preserve_order-longConflictingExample/root/LABEL_DUMMY_INSERTER", "preserve_order-noCrossings/root/LABEL_DUMMY_INSERTER",
            "preserve_order-nodeBetweenDummies/root/LABEL_DUMMY_INSERTER", "preserve_order-oneCrossing/root/LABEL_DUMMY_INSERTER",
            "preserve_order-sameTargetTogether/root/LABEL_DUMMY_INSERTER", "preserve_order-sameTargetTogether2/root/LABEL_DUMMY_INSERTER",
            "preserve_order-simpleConflictingExample/root/LABEL_DUMMY_INSERTER",
            "preserve_order-simpleLongEdges01/root/LABEL_DUMMY_INSERTER", "preserve_order-simpleLongEdges02/root/LABEL_DUMMY_INSERTER",
            "preserve_order-smallExample/root/LABEL_DUMMY_INSERTER", "preserve_order-timedAutomaton/root/LABEL_DUMMY_INSERTER",
            "preserve_order-timedAutomatonMoreEdges/root/LABEL_DUMMY_INSERTER", "ptolemy-sinewaveoptimization/N1/SELF_LOOP_PREPROCESSOR",
            "ticket-341/root/DIRECTION_PREPROCESSOR", "ticket-371/N1/HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER",
            "ticket-528-nodeEdgeOverlap/A/HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER",
            "");
    /** Levels on which the oracle itself throws a NullPointerException or ArrayIndexOutOfBoundsException for some stop,
     * "<model>/<target or root>/<exception>@<class of the top frame>": those rows are skipped (nothing to port) and counted on stderr.
     * Found with ROUTING_DISCOVER=1; anything else that throws stops the recording. */
    static final Set<String> ORACLE_THROWS = Set.of( "hierarchical_ports-hierarchy03/Compound/NullPointerException@AdjacencyList",
            "hierarchical_ports-hierarchy04/Compound/NullPointerException@AdjacencyList",
            "hierarchical_ports-hierarchy05/Compound/NullPointerException@AdjacencyList",
            "hierarchical_ports-hierarchy06/Compound/NullPointerException@AdjacencyList",
            "hierarchical_ports-hierarchy07/Compound/NullPointerException@AdjacencyList",
            "hierarchical_ports-hierarchy09/Compound/NullPointerException@AdjacencyList",
            "");
    static final Map<String, Integer> ORACLE_THROWN = new TreeMap<>();
    /** The refusal categories R1 allows (the members the recorder refuses). */
    static final Set<String> REFUSAL_CATEGORIES = Set.of("LABEL_DUMMY_INSERTER", "COMMENT_PREPROCESSOR",
            "DIRECTION_PREPROCESSOR", "SELF_LOOP_PREPROCESSOR", "BREAKING_POINT_INSERTER", "LABEL_DUMMY_SWITCHER",
            "LABEL_SIDE_SELECTOR", "END_LABEL_PREPROCESSOR", "CENTER_LABEL_MANAGEMENT_PROCESSOR",
            "END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR", "COMMENT_NODE_MARGIN_CALCULATOR", "ALTERNATING_LAYER_UNZIPPER",
            "SELF_LOOP_PORT_RESTORER", "SELF_LOOP_ROUTER", "SINGLE_EDGE_GRAPH_WRAPPER", "BREAKING_POINT_PROCESSOR",
            "HYPERNODE_PROCESSOR", "HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER", "CONSTRAINTS_POSTPROCESSOR",
            "COMMENT_POSTPROCESSOR", "LABEL_DUMMY_REMOVER", "END_LABEL_POSTPROCESSOR", "END_LABEL_SORTER",
            "HIERARCHICAL_NODE_RESIZER", "SELF_LOOP_POSTPROCESSOR", "BREAKING_POINT_REMOVER", "HORIZONTAL_COMPACTOR");
    static final int MAX_HASH_ORDER_SOURCES = 10;
    static int maxBfsSources = 0;
    static volatile String currentRow = "?";
    static final Map<String, Integer> REFUSED_ROWS = new TreeMap<>();
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
    /** The routers a P5 stop can name (EdgeRouting.UNDEFINED shares the orthogonal router and is never recorded). */
    static final List<EdgeRouting> ROUTINGS = List.of(EdgeRouting.ORTHOGONAL, EdgeRouting.POLYLINE, EdgeRouting.SPLINES);
    /** N3: the stops whose rows carry the ports and labels geometry (besides rows with a flexible node). */
    static final Set<String> PORT_LABEL_STOPS = Set.of("LABEL_AND_NODE_SIZE_PROCESSOR", "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR");

    // SHA-256 of every vendored input read, "<sha256>  repo:<path under the repo root>". Keep these lines: the shell
    // script parses them (grep for 64 hex digits, two spaces, "repo:").
    static final String MODEL_TABLE = """
83193114e73feb7aafee5bff340ec96aa7c9925244bd4d0db0861a44c7e7dc4a  repo:test/golden/inputs/realworld/ptolemy/flattened/continuous_levelcrossingdetector_LevelCrossingDetector.json
89c039382505a18941c9441f26c7f7ef654e1bccc649a413ba280ef2a942a0a5  repo:test/golden/inputs/realworld/ptolemy/flattened/ddf_randomwalk_RandomWalk.json
a047cb61956067337c91aa2d9aff3d86902817e3dcdf80a0c3c7552d31d998f1  repo:test/golden/inputs/realworld/ptolemy/flattened/de_router_Router.json
6f30f5a5f316c40eaf2536869477d40af063608a5243e63df6eb20742fbfd745  repo:test/golden/inputs/realworld/ptolemy/flattened/hlacerti_multidatatypes_producer.json
2c7d5115b347e663f35906eb3f5ecff3535405fa3c7d46373d9a33b567d4a5dc  repo:test/golden/inputs/realworld/ptolemy/flattened/pthales_dynamic_ThalesDynamicModalModelPN.json
2d1317aa12c8e43668a681b79af12002f3da3e35efd70b6e841153e7658a1381  repo:test/golden/inputs/realworld/ptolemy/hierarchical/de_compositeqm_CheckExecutionTimeConstraints.json
1cd5f7c806664cf80e1a7d1a81fe0a9b5c2d22d532367a46127f9bc19d932ca4  repo:test/golden/inputs/realworld/ptolemy/hierarchical/gt_sinewaveoptimization_SinewaveOptimization.json
55668b77428b4b4cf28704a02cf6953683b263222b6978e1602db80aacc6fde1  repo:test/golden/inputs/realworld/ptolemy/hierarchical/hoc_threadedcomposite_MulticoreExecution.json
438ef5a74dadd23bbe7faff63f012e03d99dc8f49477ca2341176b5d8de4d075  repo:test/golden/inputs/realworld/ptolemy/hierarchical/sdf_htvq_HTVQ4.json
5530ec8e29a2b0896b808710553be8995bf59b8a19f6ef828e541bb8b78e0e58  repo:test/golden/inputs/tests/layered/layer_constraints/01.elkt
e57cb83df7e22f534205c946a4ad6fa973ba7d341e35f8a8194101bf78c72489  repo:test/golden/inputs/tests/layered/layer_constraints/02.elkt
dc84df689d7c3293c530ccac2753a0914577c69d885a56f7d3083d1613289934  repo:test/golden/inputs/tests/layered/layer_constraints/03.elkt
347f8a322f2b2a0fbcef82cc75eaf5467e0ec91c191881b28ce24a0a7c93dff3  repo:test/golden/inputs/tests/layered/layer_constraints/emptyLayerFirst.elkt
746847a957c1e493475edd3ee2fa2f39c6a31f23c7cd35ed569b5fa9f495f500  repo:test/golden/inputs/tests/layered/layer_constraints/emptyLayerLast.elkt
18e2209e4ce99b946095bd7f50249e0c69e85abea1693aca5f4390c2ecb6c4e4  repo:test/golden/inputs/tests/layered/layer_constraints/emptyLayerMid.elkt
10d848f79e99defdcefc60e271fe26071f684b1e4ef5a8611f6cfbd37abbe686  repo:test/golden/inputs/tests/layered/partitioning/nonConsecutivePartitions.elkt
2320d22a074fdac2c18c1e4467cd31b351fd5bd069e2ce261cda8c5a1e98f173  repo:test/golden/inputs/tests/layered/partitioning/partitions01.elkt
011a0dde94a5b8ccdb1914576f024f1c06af94ad75d08e25e4414be6dddc66e5  repo:test/golden/inputs/tests/layered/partitioning/partitions02.elkt
ae0de9a9f3062b7f13441a0c0d6b1bb1051cfa90059eb193d9f33df513737827  repo:test/golden/inputs/tests/layered/partitioning/withEdgeLabels.elkt
e503b6a0ed9e45f0ee0d1a34249e75f415e25123fc19252cdffcb5ccb513caa0  repo:test/golden/inputs/tickets/layered/600_outgoingEdgeInLastSeparateNode.elkt
ee4ec399f7ce5e214a35267e7712c4ed8cd0f9e60a52774a3925181cdfe8445e  repo:test/golden/inputs/tickets/layered/656_brokenLayoutPartitions.elkt
54fa39aa17eb871544d36d743ca12fa7b668064e55a5863ee29311abe427bc7b  repo:test/golden/inputs/tests/layered/north_south_ports/linear_segments_cycle.elkt
5cbfc774350c48d3d677cf643335a71cd476e37c61dc17803878ac43fb364cac  repo:test/golden/inputs/tests/layered/north_south_ports/north_multiple.elkt
515476ac0db457970fa58d4aa7ddd4d1790ed55a2dd4f892606726e47e09df56  repo:test/golden/inputs/tests/layered/north_south_ports/north_south_fixed_side.elkt
6dfa3223529f29440b83936a5ad4b2ae72fa38067d4bc4a0597be28ad835b057  repo:test/golden/inputs/tests/layered/north_south_ports/nsp1.elkt
c8d37d331cb1dcb8f30b4ef6e01f569f5eb99a0e0a24d374af94ccb0c700f201  repo:test/golden/inputs/tests/layered/north_south_ports/nsp2.elkt
23f5113c5591be8dcd4218008c7758898ecfde192d47c75e6c69a140583f29d4  repo:test/golden/inputs/tests/layered/north_south_ports/nsp3.elkt
7e665de6111a648cd04e007d17f9be7c637a2da06a0bf1204f8184e06a488daf  repo:test/golden/inputs/tests/layered/north_south_ports/south_multiple.elkt
e48602ae7a512092aa6728fca48bd901a6d626009d13f7962fb38f3817d0ceb8  repo:test/golden/inputs/tests/layered/preserve_order/backwardsEdges.elkt
9fbedbea860b936de04c8febba57cc542e5804a27744c506ed36450d817f1644  repo:test/golden/inputs/tests/layered/preserve_order/dummyNodeNoConnectedNode.elkt
808a9e4c6ec8d3af7048032a052a71100d92beb15751969de29a4a13e37b4d3b  repo:test/golden/inputs/tests/layered/preserve_order/dummyNodeNoConnectingNode2.elkt
46ec2d3ee84d7e6a34cc4639818c923f32bb9132a574a26553f17ecd3e327aab  repo:test/golden/inputs/tests/layered/preserve_order/longConflictingExample.elkt
6a079c8ed64b9ce9b9bc531517be6bb8cc86d759d4fe869ae291e74c9b5eb4f3  repo:test/golden/inputs/tests/layered/preserve_order/noCrossings.elkt
47ea601308b398a14a2f766a5a5906a4961964e2ebcd9cdafa6b352234e0af4d  repo:test/golden/inputs/tests/layered/preserve_order/nodeBetweenDummies.elkt
fdff34dac5a0f11d37d55c1adb2b153ed88cc6f6f0bc400262ab302c8e403b36  repo:test/golden/inputs/tests/layered/preserve_order/oneCrossing.elkt
af5c1bb6e6816779a232faabf7963073ec27c3ffa8d1a004b37858893082e8bf  repo:test/golden/inputs/tests/layered/preserve_order/sameTargetTogether.elkt
e9894ed5bad47cf33cddd18b8b87c8ca33b179e0a9e7a901033c12ad19adcecf  repo:test/golden/inputs/tests/layered/preserve_order/sameTargetTogether2.elkt
1423ea2923e8a8763cd5d33a92369af6a07ef04d85f9185ee97d1e08ac13d5f4  repo:test/golden/inputs/tests/layered/preserve_order/simpleConflictingExample.elkt
163d8b2d720cd453c48f12e7fc5715c1bea73523ddeaf6552fae438f13627a74  repo:test/golden/inputs/tests/layered/preserve_order/simpleLongEdges01.elkt
9be7c4c086ff3d4539116c99f27dc018d98040d2738c54ef893dd5099211e357  repo:test/golden/inputs/tests/layered/preserve_order/simpleLongEdges02.elkt
28c9219069dda2414d60e1b1ed77f0828f849dd6d6a8230e86aff3171520b7d7  repo:test/golden/inputs/tests/layered/preserve_order/smallExample.elkt
33e5d6d148f0bf7e02b654d1073351ee088005a75344b676552df267351d5ce3  repo:test/golden/inputs/tests/layered/preserve_order/timedAutomaton.elkt
fcde69b053e5fa8b6fa07258d3643424e6138006bfe90bf41db1936fcf0ddcfc  repo:test/golden/inputs/tests/layered/preserve_order/timedAutomatonMoreEdges.elkt
cb807106bcc45392159b3639411327ff7d42f0de23c379d8247e5d769c68e747  repo:test/golden/inputs/tickets/layered/528_nodeEdgeOverlap.elkt
3a9699d4b375f33a855e4794e6f748bc1d7b94d878edf4367bb1ee10d02d61be  repo:test/golden/inputs/tickets/layered/528_violatedNodeOrder.elkt
11e57b3dbb88a7968ce211b07484101530a59b6d01919f8f49e4e5fb8b5f8d5a  repo:test/golden/inputs/tests/layered/node_placement/KIPRA-1426/demo2-KIPRA-1426.elkt
ce56042d3822f6005fe5ec921640a1fa4b1d8d7551c6760e0d082327db9b217b  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes.elkt
b4885404f944a94bafd304b2ce8d6f7a7fae0ac7fe9c0bb72eebaaec010cacb3  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_leftdown.elkt
bff69695a38518f2c4a9f0d98d0e8eae9551b3d90f334bf8a1039e6d890d66e5  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_leftup.elkt
2e64f1fe32a8add72011b3cf92a2c691ee0a3235b69eb271b7c7f4e4e7230f51  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_rightdown.elkt
368d28cfaa56f70f76c74e2be36f79fdaf15393984af54f25f5079dfd3bc4b43  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_rightup.elkt
50a0abc641690538d2fbe289a858ceb50b187a0d54e66aa47a76f60d869bcf65  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_two_leftdown.elkt
554b32c93715698ebd6948d44d2b4d41fc7129790801941e10f58992bf884078  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_two_leftup.elkt
99fa3463df3fc100a4b20d444fa158d040670467c40c0d01025f105bb571caa0  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_two_rightdown.elkt
a3bbeb05168f5745b0f419bf790459727ecec8d3685471b450a5f57952338d03  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_two_rightdown_surrounded.elkt
091457ba4f7f65a99a2b5945f79a6f88357bbc78d177a717cd8aea0d95a80236  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_two_rightup.elkt
53f391e4e755fd906b84039e3e6233a3d897892ba075e1c522835491f6662fc2  repo:test/golden/inputs/tests/layered/node_placement/bk/classes/classes_two_samesize.elkt
f136aaa3f9cb3a6146d6aa1f842118f4f9bc4d1242f07a1b19da7d9254edfb16  repo:test/golden/inputs/tests/layered/node_placement/bk/edge_length/edge_length_space_above.elkt
193fa033e842f958d42da5eb2422c5bd62686c7ddece8762fddf563c451fbe52  repo:test/golden/inputs/tests/layered/node_placement/bk/edge_length/edge_length_space_below.elkt
c5176397e31726c0cbb6a29f708a069ed05e777da4b013aa78c84829c440e791  repo:test/golden/inputs/tests/layered/node_placement/bk/straightness/severalEdges.elkt
51a0be8090e5a84512ee6ede561d5ce876cf65298ff2ce88c7002ce1fedc03c6  repo:test/golden/inputs/tests/layered/node_placement/bk/straightness/straightEdgesLeft.elkt
d72927aed7e64d1ad121fc9f0328a6273dae3ed4bb58e0c5d8784c7c5f904db0  repo:test/golden/inputs/tests/layered/node_placement/bk/straightness/straightEdgesRight.elkt
15b6783cd840b6c6083f4c40a75677149295faf9ff11f7889922fe2fcd2a0b0a  repo:test/golden/inputs/tests/layered/node_placement/compact/unbalanced.elkt
ddf662ba728c4e9aa0017bb2aae4cdba2046a84b68802cc00eeb17b0ed4fcea5  repo:test/golden/inputs/tests/layered/node_placement/flexible_ports/graph01.elkt
9805c6874b75676ae38e8d76e2c5fbf1fdfe12c2a2b34c629839bc4771b1ae1a  repo:test/golden/inputs/tests/layered/node_placement/flexible_ports/graph02.elkt
86c2766063c5b462152481a7266a8eca8e8e2963d700d93df01a08f5fea21503  repo:test/golden/inputs/tests/layered/node_placement/flexible_ports/graph03.elkt
18e620a3933acbcdd4de80ded312576a21044ee503160fe264027f282d32b520  repo:test/golden/inputs/tests/layered/node_placement/flexible_ports/graph04.elkt
aade476173d1f260bc0f10e2431e4e6e36965c93bd109933f8359745de161700  repo:test/golden/inputs/tests/layered/splines/hyperedges/hyperedges_1.elkt
bf0f9655c77c6ca7e4672130cc39c2e7350120087f76e45683785458ebcbbb2b  repo:test/golden/inputs/tests/layered/splines/hyperedges/hyperedges_2.elkt
19e14f74debbe22f136598ba19b17bd479190aedcfdb497ee6413f20e3176b06  repo:test/golden/inputs/tests/layered/splines/north_south_ports_1.elkt
d8f2babf9c9817671be41c07ced82c630799743d8aba4af7785c7a025ce2402b  repo:test/golden/inputs/tests/layered/splines/north_south_ports_2.elkt
6739421b92db33516e0685119959cbc27d49c5b7f99c23abe7cf257fe69e1a97  repo:test/golden/inputs/tests/layered/splines/north_south_ports_3.elkt
c23b3734cbc37959dd513c9cb3a14eb4e63d890cd733fe3e11b80cbd36048b15  repo:test/golden/inputs/tests/layered/splines/sloppy_curvature.elkt
9efe73ba64f952ac9ff337f92f6ec12b0e0890971c0ac5bf15b79c8a691dc825  repo:test/golden/inputs/tests/layered/splines/sloppy_overlaps_1.elkt
cbee772a79738d47f1dff2e61debb90f815f498eeca81cf63e612656316553ff  repo:test/golden/inputs/tests/layered/splines/sloppy_overlaps_2.elkt
957c3893836c304c2d445d03059ba568e883c2a13dafacf8a69f166d4210070d  repo:test/golden/inputs/tests/layered/splines/sloppy_overlaps_3.elkt
b67edd77f88df7a59f20389366571cc00ad0b23412c580ee5da769bfd4b49880  repo:test/golden/inputs/tests/layered/splines/three_edges_inverted_ports.elkt
1ff2732de9c49769ffc0573db73e043e2d6c6c793516d56416f951df4d2853c7  repo:test/golden/inputs/tests/layered/splines/three_edges_inverted_ports_2.elkt
421d2368842e982f4880db09816e89bc3eda2beb532b036ce023f6002134d5f3  repo:test/golden/inputs/tests/layered/splines/three_nodes_two_edges.elkt
e01f73a626343e3bdd04bc53df7a071aff002dffa9a1d2e7d187f258f26e6c18  repo:test/golden/inputs/tests/layered/hyperedge_merging/hyperedge_labels.elkt
e83d20235f71efdb5457912ce8ce511769bffa6aeec6b55028d560939102f9b2  repo:test/golden/inputs/tests/layered/hyperedge_merging/hyperedges01.elkt
c5a03df0bd66d97aa5366a95a92190beb9ad4cca41e178c18f364ce7afa8913f  repo:test/golden/inputs/tests/layered/hyperedge_merging/inverted_ports.elkt
9edf4186fc3b8dad415ff631fe8110b24aed8989c9b1658d9971e0fd7626a1c4  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_01.elkt
16a029cc17643b42dd5e0e79e64a6fe093ce343c5bff76742a6ac9b8dbd36dde  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_02.elkt
f1880960129542711274042d8979bb3c61e5d8c998635ce3d3425bca312aee66  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_03.elkt
c8e464721526830bd48744a2b33c6ad9492dd16ee1991428152592607caa97fd  repo:test/golden/inputs/tests/layered/hyperedge_merging/unequal_src_tgt.elkt
4248ffd82104950274cf5cedb5db9da7eea69e60f91a03a6af0efd484e1767c1  repo:test/golden/inputs/tests/layered/hyperedge_merging/unequal_src_tgt_with_labels.elkt
54f805e91b4ba81f92a1324fc9ce2db6fe3f702380d9f9ef0aaa3faf01dd48a7  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy01.elkt
5b3ae5cf66515bf5e887fd0387d224b5cffbeebdd26e4198c22703705d661d16  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy02.elkt
e045d4a2b33f34ca6e65b8c07c98664763e5023f53d30efe01c103891bdf8917  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy03.elkt
b981886540f076bbbbaf86da9f9c1f7dd93e7dbe892e5ed83a72607df5a9a22f  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy04.elkt
1abcb51dec791f318f70eca91f726b54a24e30de31e1305e871e084d0f8655d8  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy05.elkt
e7f7eb20b38abae18a895f2a68760ab1fe2b2f18a2a176f357addd60aa649d60  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy06.elkt
c22197cc932db3474680195595d21df9f117a785a96ea35085e76786f14af0a4  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy07.elkt
45c5cfdb7e94d58c8cc421953b714673f37751704b751df92e4dab8826e7791b  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy08.elkt
9f10bac68e7a679a8f491b686eb10368c6a25bf9ea30fe6115279487a133d439  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy09.elkt
a292b6dc5bef896d5bd99c5032ba0abf5404bccd1d42557283ee6b9c4a375a8d  repo:test/golden/inputs/tickets/layered/726_edgesMissingBendPoints.elkt
b6ced8d3f6be2d7f744b6d3496d6c76167ba6ba91b2d7ab9992e5bbc160db031  repo:test/golden/inputs/tickets/layered/341_polylineUnnecessaryBendpoints.elkt
3747d468648de232fdab359c91e3a43270cc3ca51a380707b3069c8559174b4b  repo:test/golden/inputs/tickets/layered/371_strangeSplineSpacing.elkt
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
                if (!entry.getKey().getId().equals(InternalProperties.SPLINE_ROUTE_START.getId())) { // R3: see geometry.splines
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
                    items.sort(Comparator.comparing(LayeredRoutingVectors::json));
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
    static final String[] OPTION_PACKAGES = {"org.eclipse.elk.alg.layered.options.", "org.eclipse.elk.core.options."};

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
        if (c4 instanceof List<?> l) { return l.stream().map(LayeredRoutingVectors::decode).toList(); } // T11: a list value (the in-layer successor constraints)
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
            case "double": return Double.parseDouble((String) v);
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

    record Result(Map<String, Object> expected, List<Object> prefix) { }

    @SuppressWarnings("unchecked")
    static Base CURRENT; // the Base of the step row being run (decode resolves {ref} paths against it)
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
                    base.snapshot();
                }
                case "setProperty" -> setProperty(base.element((String) s.get(1)), (String) s.get(2), s.get(3));
                case "layers" -> layers(graph, base, (List<Object>) s.get(1));
                case "reverseEdge" -> ((LEdge) base.element((String) s.get(1))).reverse(graph, true);
                case "runProcessor" -> {
                    runProcessor(graph, (String) s.get(1));
                    base.stop = (String) s.get(1);
                }
                case "runPhase" -> {
                    runPhase(graph, (String) s.get(1), (String) s.get(2));
                    base.stop = (String) s.get(1);
                }
                case "call" -> expected = single("result", call(base, s));
                case "dump" -> {
                    expected = phaseDump(base);
                    if (base.nodes.size() < FULL_DUMP_BELOW) {
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

    @SuppressWarnings("unchecked")
    static void layers(LGraph g, Base base, List<Object> spec) {
        for (Object inner : spec) {
            Layer layer = new Layer(g);
            g.getLayers().add(layer);
            for (Object path : (List<Object>) inner) {
                LNode n = (LNode) base.element((String) path);
                if (!g.getLayerlessNodes().contains(n)) {
                    throw new Bug("node " + path + " is not layerless");
                }
                n.setLayer(layer);
            }
        }
    }

    static void runProcessor(LGraph g, String member) {
        if (!SEVEN_B.contains(member) && !SEVEN_C.contains(member) && !SEVEN_D.contains(member)
                && !SEVEN_E.contains(member)) {
            throw new Bug("processor " + member + " is outside the 7b, 7c, 7d and 7e sets");
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
        List<String> names = PROCESSOR_NAMES.get(processor.getClass());
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

    static boolean allowed(String name) {
        return SEVEN_B.contains(name) || SEVEN_C.contains(name) || SEVEN_D.contains(name) || SEVEN_E.contains(name)
                || name.startsWith(P1 + "/") || name.startsWith(P2 + "/") || name.startsWith(P3 + "/")
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
        for (int i = 0; i < plan.size() && stopAt < 0; i++) {
            names.add(nameOf(plan.get(i)));
            stopAt = names.get(i).equals(stop) ? i : -1;
        }
        if (stopAt < 0) {
            throw new NotInPlan("row " + s.id + ": " + stop + " is not part of the algorithm " + names);
        }
        List<Object> prefix = new ArrayList<>(names.subList(0, stopAt + 1));
        for (Object name : prefix) {
            if (!allowed((String) name)) {
                throw new Refusal("row " + s.id + ": prefix names " + name + ", outside the 7b, 7c, 7d and 7e sets", (String) name);
            }
        }
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
            TreeMap<String, Object> options, String stop, List<Object> steps) { }

    record Row(String id, String group, String json) { }

    static final long ROW_TIMEOUT_SECONDS = 60;

    /** Runs the row in a daemon thread: an oracle loop that never ends stops the recording naming the row. */
    static Result execute(Spec s, ElkNode root, List<Object> parsedSteps) {
        java.util.concurrent.FutureTask<Result> task = new java.util.concurrent.FutureTask<>(() ->
                s.steps == null ? runPipeline(s, root) : new Result(runSteps(root, parsedSteps), null));
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

    // Group models (C3, B5)

    record ModelFile(String id, String rel, boolean flattened, String kind) { }

    static final String KIND_PTOLEMY = "ptolemy", KIND_ELKT = "elkt";

    /** The 22 vendored tests/layered/node_placement models (7d). */
    static final List<String> NODE_PLACEMENT_FILES = List.of(
            "KIPRA-1426/demo2-KIPRA-1426.elkt", "bk/classes/classes.elkt", "bk/classes/classes_leftdown.elkt",
            "bk/classes/classes_leftup.elkt", "bk/classes/classes_rightdown.elkt", "bk/classes/classes_rightup.elkt",
            "bk/classes/classes_two_leftdown.elkt", "bk/classes/classes_two_leftup.elkt",
            "bk/classes/classes_two_rightdown.elkt", "bk/classes/classes_two_rightdown_surrounded.elkt",
            "bk/classes/classes_two_rightup.elkt", "bk/classes/classes_two_samesize.elkt",
            "bk/edge_length/edge_length_space_above.elkt", "bk/edge_length/edge_length_space_below.elkt",
            "bk/straightness/severalEdges.elkt", "bk/straightness/straightEdgesLeft.elkt",
            "bk/straightness/straightEdgesRight.elkt", "compact/unbalanced.elkt", "flexible_ports/graph01.elkt",
            "flexible_ports/graph02.elkt", "flexible_ports/graph03.elkt", "flexible_ports/graph04.elkt");

    /** The 29 vendored tests/layered/{splines,hyperedge_merging,hierarchical_ports} models (7e). */
    static final List<String> ROUTING_FILES = List.of( "splines/hyperedges/hyperedges_1.elkt", "splines/hyperedges/hyperedges_2.elkt",
            "splines/north_south_ports_1.elkt", "splines/north_south_ports_2.elkt",
            "splines/north_south_ports_3.elkt", "splines/sloppy_curvature.elkt", "splines/sloppy_overlaps_1.elkt",
            "splines/sloppy_overlaps_2.elkt", "splines/sloppy_overlaps_3.elkt",
            "splines/three_edges_inverted_ports.elkt", "splines/three_edges_inverted_ports_2.elkt",
            "splines/three_nodes_two_edges.elkt", "hyperedge_merging/hyperedge_labels.elkt",
            "hyperedge_merging/hyperedges01.elkt", "hyperedge_merging/inverted_ports.elkt",
            "hyperedge_merging/north_south_ports_01.elkt", "hyperedge_merging/north_south_ports_02.elkt",
            "hyperedge_merging/north_south_ports_03.elkt", "hyperedge_merging/unequal_src_tgt.elkt",
            "hyperedge_merging/unequal_src_tgt_with_labels.elkt", "hierarchical_ports/hierarchy01.elkt",
            "hierarchical_ports/hierarchy02.elkt", "hierarchical_ports/hierarchy03.elkt",
            "hierarchical_ports/hierarchy04.elkt", "hierarchical_ports/hierarchy05.elkt",
            "hierarchical_ports/hierarchy06.elkt", "hierarchical_ports/hierarchy07.elkt",
            "hierarchical_ports/hierarchy08.elkt", "hierarchical_ports/hierarchy09.elkt");

    static List<ModelFile> modelFiles() {
        List<ModelFile> files = new ArrayList<>();
        String[][] ptolemy = {
            {"hierarchical/de_compositeqm_CheckExecutionTimeConstraints.json", "checkexecutiontimeconstraints"},
            {"hierarchical/gt_sinewaveoptimization_SinewaveOptimization.json", "sinewaveoptimization"},
            {"hierarchical/hoc_threadedcomposite_MulticoreExecution.json", "multicoreexecution"},
            {"hierarchical/sdf_htvq_HTVQ4.json", "htvq4"},
            {"flattened/continuous_levelcrossingdetector_LevelCrossingDetector.json", "levelcrossingdetector"},
            {"flattened/ddf_randomwalk_RandomWalk.json", "randomwalk"},
            {"flattened/de_router_Router.json", "router"},
            {"flattened/hlacerti_multidatatypes_producer.json", "producer"},
            {"flattened/pthales_dynamic_ThalesDynamicModalModelPN.json", "thalesdynamicmodalmodelpn"}};
        for (String[] p : ptolemy) {
            files.add(new ModelFile("ptolemy-" + p[1], PTOLEMY + p[0], p[0].startsWith("flattened/"), KIND_PTOLEMY));
        }
        for (String n : List.of("01", "02", "03", "emptyLayerFirst", "emptyLayerLast", "emptyLayerMid")) {
            files.add(new ModelFile("layer_constraints-" + n, LAYERED_TESTS + "layer_constraints/" + n + ".elkt", false, KIND_ELKT));
        }
        files.add(new ModelFile("ticket-600", TICKETS + "600_outgoingEdgeInLastSeparateNode.elkt", false, KIND_ELKT));
        for (String n : List.of("nonConsecutivePartitions", "partitions01", "partitions02", "withEdgeLabels")) {
            files.add(new ModelFile("partitioning-" + n, LAYERED_TESTS + "partitioning/" + n + ".elkt", false, KIND_ELKT));
        }
        files.add(new ModelFile("ticket-656", TICKETS + "656_brokenLayoutPartitions.elkt", false, KIND_ELKT));
        files.add(new ModelFile("ticket-528-nodeEdgeOverlap", TICKETS + "528_nodeEdgeOverlap.elkt", false, KIND_ELKT));
        files.add(new ModelFile("ticket-528-violatedNodeOrder", TICKETS + "528_violatedNodeOrder.elkt", false, KIND_ELKT));
        for (String n : List.of("linear_segments_cycle", "north_multiple", "north_south_fixed_side", "nsp1", "nsp2", "nsp3", "south_multiple")) {
            files.add(new ModelFile("north_south_ports-" + n, LAYERED_TESTS + "north_south_ports/" + n + ".elkt", false, KIND_ELKT));
        }
        for (String n : List.of("backwardsEdges", "dummyNodeNoConnectedNode", "dummyNodeNoConnectingNode2",
                "longConflictingExample", "noCrossings", "nodeBetweenDummies", "oneCrossing", "sameTargetTogether",
                "sameTargetTogether2", "simpleConflictingExample", "simpleLongEdges01", "simpleLongEdges02", "smallExample",
                "timedAutomaton", "timedAutomatonMoreEdges")) {
            files.add(new ModelFile("preserve_order-" + n, LAYERED_TESTS + "preserve_order/" + n + ".elkt", false, KIND_ELKT));
        }
        for (String n : NODE_PLACEMENT_FILES) {
            files.add(new ModelFile("node_placement-" + n.replace('/', '-').replace(".elkt", ""),
                    LAYERED_TESTS + "node_placement/" + n, false, KIND_ELKT));
        }
        for (String n : ROUTING_FILES) {
            files.add(new ModelFile(n.replace('/', '-').replace(".elkt", ""), LAYERED_TESTS + n, false, KIND_ELKT));
        }
        for (String n : List.of("726_edgesMissingBendPoints", "341_polylineUnnecessaryBendpoints", "371_strangeSplineSpacing")) {
            files.add(new ModelFile("ticket-" + n.substring(0, 3), TICKETS + n + ".elkt", false, KIND_ELKT));
        }
        return files;
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
        for (int i = 0; i < kv.length; i += 2) {
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
        return new Spec("models/" + f.id + "/" + levelName(target) + "/" + stop + "/" + variant, "models", f.rel, null, target, options, stop, null);
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

    @SafeVarargs
    static List<Object> layersOf(List<String>... layers) {
        List<Object> spec = new ArrayList<>();
        for (List<String> l : layers) {
            spec.add(new ArrayList<Object>(l));
        }
        return S("layers", spec);
    }

    static List<String> L(String... paths) {
        return Arrays.asList(paths);
    }

    /** Root layout options as JSON members: constant name, value string, ... */
    static String ropts(String... kv) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < kv.length; i += 2) {
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

    static List<Spec> SCENARIOS;

    /** Edges e0..: "a>b" or "a>b:CONSTANT=value" (one option). */
    static String eds(String... spec) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < spec.length; i++) {
            String[] opt = spec[i].split(":"), end = opt[0].split(">");
            out.add("{\"id\":\"e" + i + "\",\"sources\":[\"" + end[0] + "\"],\"targets\":[\"" + end[1] + "\"]"
                    + (opt.length > 1 ? ",\"layoutOptions\":{" + ropts(opt[1].split("=")) + "}" : "") + "}");
        }
        return String.join(",", out);
    }

    static String flat(String rootOpts, String kids, String edges) {
        return "{\"id\":\"root\",\"layoutOptions\":{" + rootOpts + "},\"children\":[" + kids + "],\"edges\":[" + edges + "]}";
    }

    /** Root with one hierarchical node T (FIXED_SIDE ports; tOpts hold the options of the imported target). */
    static String hier(String tOpts, String ports, String kids, String edges) {
        return "{\"id\":\"root\",\"children\":[{\"id\":\"T\",\"width\":300,\"height\":200,\"layoutOptions\":{"
                + ropts("PORT_CONSTRAINTS", "FIXED_SIDE") + (tOpts.isEmpty() ? "" : "," + tOpts) + "},\"ports\":[" + ports
                + "],\"children\":[" + kids + "],\"edges\":[" + edges + "]}]}";
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

    static String opt(String... kv) {
        return ropts(kv);
    }

    // Calls (R12): a step row whose last step is ["call", "<Class>.<method>", <arg>...]

    static final String SPLINES_PACKAGE = "org.eclipse.elk.alg.layered.p5edges.splines.";
    /** Every Class.method a call row ran (the coverage check lists the methods the brief names). */
    static final Set<String> CALLED = new TreeSet<>();

    static double dbl(Object hex) {
        return Double.longBitsToDouble(Long.parseUnsignedLong((String) hex, 16));
    }

    @SuppressWarnings("unchecked")
    static List<KVector> vectors(Object pairs) {
        List<KVector> list = new ArrayList<>();
        for (Object p : (List<Object>) pairs) {
            list.add(new KVector(dbl(((List<Object>) p).get(0)), dbl(((List<Object>) p).get(1))));
        }
        return list;
    }

    /** Args: port/node path, double (hex), boolean, int, enum "<Type>.<NAME>", vector (hex x, y), vectors, rectangle (hex top, right, bottom, left), nubs (clamped, dim, vectors). */
    @SuppressWarnings({"unchecked", "rawtypes"})
    static Object callArg(Base base, List<Object> a) {
        return switch ((String) a.get(0)) {
            case "port", "node" -> base.element((String) a.get(1));
            case "double" -> dbl(a.get(1));
            case "boolean", "int" -> a.get(1);
            case "enum" -> {
                String[] parts = ((String) a.get(1)).split("\\.");
                try {
                    yield Enum.valueOf((Class<? extends Enum>) Class.forName("org.eclipse.elk.core.options." + parts[0]), parts[1]);
                } catch (ClassNotFoundException e) {
                    throw new Bug("unknown enum type " + parts[0]);
                }
            }
            case "vector" -> new KVector(dbl(a.get(1)), dbl(a.get(2)));
            case "vectors" -> vectors(a.get(1));
            case "rectangle" -> new Rectangle(dbl(a.get(4)), dbl(a.get(1)), dbl(a.get(2)), dbl(a.get(3)));
            case "nubs" -> new NubSpline((Boolean) a.get(1), (Integer) a.get(2), vectors(a.get(3)));
            default -> throw new Bug("unknown call argument kind " + a.get(0));
        };
    }

    static boolean fits(Class<?>[] params, Object[] args) {
        for (int i = 0; i < params.length; i++) {
            Class<?> p = params[i];
            boolean ok = p == double.class ? args[i] instanceof Double : p == int.class ? args[i] instanceof Integer
                    : p == boolean.class ? args[i] instanceof Boolean : p.isInstance(args[i]);
            if (!ok) {
                return false;
            }
        }
        return true;
    }

    /** Runs the call step; an instance method's first argument is the receiver, a void method returns it. */
    @SuppressWarnings("unchecked")
    static Object call(Base base, List<Object> step) {
        String[] name = ((String) step.get(1)).split("\\.");
        List<Object> args = new ArrayList<>();
        for (Object a : step.subList(2, step.size())) {
            args.add(callArg(base, (List<Object>) a));
        }
        try {
            for (boolean wantStatic : new boolean[] {true, false}) {
                for (Class<?> c = Class.forName(SPLINES_PACKAGE + name[0]); c != null; c = c.getSuperclass()) {
                    for (Method m : c.getDeclaredMethods()) {
                        boolean stat = Modifier.isStatic(m.getModifiers());
                        Object[] callArgs = (stat ? args : args.subList(Math.min(1, args.size()), args.size())).toArray();
                        if (stat == wantStatic && m.getName().equals(name[1]) && !m.isSynthetic()
                                && m.getParameterCount() == callArgs.length && fits(m.getParameterTypes(), callArgs)) {
                            m.setAccessible(true);
                            Object receiver = stat ? null : args.get(0);
                            Object r = m.invoke(receiver, callArgs);
                            CALLED.add(step.get(1).toString());
                            return result(m.getReturnType() == void.class ? receiver : r);
                        }
                    }
                }
            }
        } catch (InvocationTargetException e) {
            throw new Bug("call " + step.get(1) + " threw " + e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new Bug("cannot call " + step.get(1) + ": " + e);
        }
        throw new Bug("no method matches " + step.get(1) + " with " + args.size() + " arguments");
    }

    static Map<String, Object> typed(String type, Object value) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", type);
        m.put("value", value);
        return m;
    }

    static List<Object> rect(Rectangle r) {
        return quad(r.getTop(), r.getRight(), r.getBottom(), r.getLeft());
    }

    /** expected.result = { type, value }: double, boolean, vector (null: parallel lines), rectangle (also an ElkMargin), nubs. */
    static Map<String, Object> result(Object r) {
        if (r instanceof Double d) {
            return typed("double", hex(d));
        } else if (r instanceof Boolean z) {
            return typed("boolean", z);
        } else if (r == null || r instanceof KVector) {
            return typed("vector", r == null ? null : pair((KVector) r));
        } else if (r instanceof Rectangle rc) {
            return typed("rectangle", rect(rc));
        } else if (r instanceof ElkMargin mg) {
            return typed("rectangle", margin(mg)); // top, right, bottom, left, as Rectangle stores them
        } else if (r instanceof NubSpline n) {
            Map<String, Object> v = new LinkedHashMap<>();
            List<Object> cps = new ArrayList<>();
            n.getControlPoints().forEach(p -> cps.add(pair(p)));
            List<Object> knots = new ArrayList<>();
            n.getKnotVector().forEach(k -> knots.add(hex(k)));
            v.put("controlPoints", cps);
            v.put("knotVector", knots);
            v.put("dim", n.getDim());
            v.put("outerBox", n.getOuterBox() == null ? null : rect(n.getOuterBox()));
            if (n instanceof NubsSelfLoop s) {
                v.put("firstLabelPosition", pair(s.getFirstLabelPosition()));
            }
            return typed("nubs", v);
        }
        throw new Bug("unsupported call result of class " + r.getClass().getName());
    }

    // Group models (R2): P5 stops, the six processors and the variant set

    static final String P4S = "P4", P5S = "P5";
    static final String LSGHC = "LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR", HPPP = "HIERARCHICAL_PORT_POSITION_PROCESSOR",
            HDM = "HYPEREDGE_DUMMY_MERGER", LEJ = "LONG_EDGE_JOINER", NSPP = "NORTH_SOUTH_PORT_POSTPROCESSOR",
            FSBC = "FINAL_SPLINE_BENDPOINTS_CALCULATOR", ILC = "IN_LAYER_CONSTRAINT_PROCESSOR",
            LANS = "LABEL_AND_NODE_SIZE_PROCESSOR", INMC = "INNERMOST_NODE_MARGIN_CALCULATOR",
            HPDS = "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR";
    static final String EDGE_ROUTING = "EDGE_ROUTING", SPLINES_MODE = "EDGE_ROUTING_SPLINES_MODE",
            SLOPPY_FACTOR = "EDGE_ROUTING_SPLINES_SLOPPY_LAYER_SPACING_FACTOR",
            SLOPED_ZONE = "EDGE_ROUTING_POLYLINE_SLOPED_EDGE_ZONE_WIDTH", UNNECESSARY = "UNNECESSARY_BENDPOINTS",
            MERGE_EDGES = "MERGE_EDGES", FEEDBACK = "FEEDBACK_EDGES", EDGE_EDGE = "SPACING_EDGE_EDGE_BETWEEN_LAYERS",
            EDGE_NODE = "SPACING_EDGE_NODE_BETWEEN_LAYERS", NODE_NODE = "SPACING_NODE_NODE_BETWEEN_LAYERS";
    /** Non-default values (defaults: sloppy factor 0.8, spacings 10 / 10 / 20, sloped zone 2.0). */
    static final double SLOPPY_NON_DEFAULT = 0.6, SLOPED_ZONE_NON_DEFAULT = 0.0, EE_NON_DEFAULT = 17, EN_NON_DEFAULT = 14, NN_NON_DEFAULT = 32;

    /** Options of a row: the edge router plus pairs of (Java constant name, C4 value). */
    static TreeMap<String, Object> routing(EdgeRouting r, Object... kv) {
        Object[] all = new Object[kv.length + 2];
        all[0] = EDGE_ROUTING;
        all[1] = E("EdgeRouting", r);
        System.arraycopy(kv, 0, all, 2, kv.length);
        return opts(all);
    }

    /** The names of the processors the assembled algorithm of the level holds (one import, nothing run). */
    static List<String> planNames(ModelFile f, String target, TreeMap<String, Object> options) {
        ElkNode t = importTarget(loadFile(f.rel), target);
        options.forEach((id, c4) -> setProperty(t, id, c4));
        LGraph g = new ElkGraphTransformer().importGraph(t);
        ElkLayered layered = new ElkLayered();
        List<String> names = new ArrayList<>();
        layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g)).forEach(p -> names.add(nameOf(p)));
        return names;
    }

    /** The stops of every level: LSGHC, P5 and the post-P5 processors per router, HPPP, HDM and (hyperedge levels) P4. TRIMMING (R2): ptolemy levels
     * outside the trim set record P5 POLYLINE / SPLINES (and the SPLINES result FINAL_SPLINE_BENDPOINTS_CALCULATOR) and LONG_EDGE_JOINER only inside it. */
    static void routingRows(List<Spec> out, ModelFile f, Level lv, boolean hyperedges, boolean inTrimSet) {
        String t = lv.target;
        boolean full = inTrimSet || !f.kind.equals(KIND_PTOLEMY);
        out.add(pipeline(f, t, LSGHC, "default", opts()));
        for (EdgeRouting r : ROUTINGS) {
            if (full || r == EdgeRouting.ORTHOGONAL) {
                out.add(pipeline(f, t, P5S, r.name(), routing(r)));
            }
            out.add(pipeline(f, t, NSPP, r.name(), routing(r)));
        }
        if (inTrimSet) {
            out.add(pipeline(f, t, LEJ, "ORTHOGONAL", routing(EdgeRouting.ORTHOGONAL)));
        }
        if (full) {
            out.add(pipeline(f, t, FSBC, "SPLINES", routing(EdgeRouting.SPLINES)));
        }
        out.add(pipeline(f, t, HPPP, "default", opts()));
        out.add(pipeline(f, t, HDM, "default", opts()));
        if (hyperedges) {
            out.add(pipeline(f, t, P4S, "BRANDES_KOEPF", opts()));
        }
    }

    static void p5(List<Spec> out, ModelFile f, String t, EdgeRouting r, String variant, TreeMap<String, Object> o, String... more) {
        out.add(pipeline(f, t, P5S, r.name() + "-" + variant, o));
        for (String stop : more) {
            out.add(pipeline(f, t, stop, r.name() + "-" + variant, o));
        }
    }

    /** The variant families of R2 (one non-default value each) on a variant-set level. */
    static void variantRows(List<Spec> out, ModelFile f, Level lv) {
        String t = lv.target;
        EdgeRouting ortho = EdgeRouting.ORTHOGONAL, poly = EdgeRouting.POLYLINE, spl = EdgeRouting.SPLINES;
        p5(out, f, t, ortho, "unnecessary-bendpoints", routing(ortho, UNNECESSARY, Z(true)), LEJ);
        Object sloppy = E("SplineRoutingMode", SplineRoutingMode.SLOPPY);
        p5(out, f, t, spl, "sloppy", routing(spl, SPLINES_MODE, sloppy), FSBC);
        p5(out, f, t, spl, "sloppy-0.6", routing(spl, SPLINES_MODE, sloppy, SLOPPY_FACTOR, D(SLOPPY_NON_DEFAULT)), FSBC);
        p5(out, f, t, poly, "sloped-edge-zone-0.0", routing(poly, SLOPED_ZONE, D(SLOPED_ZONE_NON_DEFAULT)));
        p5(out, f, t, ortho, "merge-edges", routing(ortho, MERGE_EDGES, Z(true)), HDM, LEJ);
        p5(out, f, t, ortho, "edge-edge-17", routing(ortho, EDGE_EDGE, D(EE_NON_DEFAULT)));
        p5(out, f, t, spl, "edge-edge-17", routing(spl, EDGE_EDGE, D(EE_NON_DEFAULT)), FSBC);
        p5(out, f, t, ortho, "edge-node-14", routing(ortho, EDGE_NODE, D(EN_NON_DEFAULT)));
        p5(out, f, t, spl, "edge-node-14", routing(spl, EDGE_NODE, D(EN_NON_DEFAULT)), FSBC);
        for (EdgeRouting r : ROUTINGS) {
            p5(out, f, t, r, "node-node-32", routing(r, NODE_NODE, D(NN_NON_DEFAULT)), r == spl ? new String[] {FSBC} : new String[0]);
            p5(out, f, t, r, "feedback-edges", routing(r, FEEDBACK, Z(true)));
        }
    }

    /** TRIMMING (R2, 5 MiB): the variant families (variantRows) run on these models only; the three smallest flattened ptolemy models join them as the
     * "trim set" of the ptolemy P5 POLYLINE / SPLINES and LONG_EDGE_JOINER rows. The untrimmed variant set (the three smallest ptolemy models and
     * the 32 vendored 7e models) measured 6.0 MB of variant rows on top of 5.4 MB of stop rows (journal: T1). */
    static final Set<String> VARIANT_MODELS = Set.of("ptolemy-producer", "splines-sloppy_curvature", "ticket-371", "hyperedge_merging-north_south_ports_01");

    static void modelSpecs(List<Spec> out) {
        List<ModelFile> files = modelFiles();
        Map<String, List<Level>> levels = new LinkedHashMap<>();
        for (ModelFile f : files) {
            levels.put(f.id, levels(f));
        }
        List<ModelFile> smallest = files.stream().filter(f -> f.flattened).sorted(Comparator
                .comparingInt((ModelFile f) -> levels.get(f.id).stream().mapToInt(Level::nodes).sum())
                .thenComparingInt(f -> levels.get(f.id).stream().mapToInt(Level::edges).sum())
                .thenComparing(ModelFile::rel)).limit(3).toList();
        System.err.println("smallest flattened models " + smallest.stream().map(ModelFile::id).toList());
        for (ModelFile f : files) {
            for (Level lv : levels.get(f.id)) {
                boolean hyperedges;
                try {
                    hyperedges = planNames(f, lv.target, opts()).contains(HDM);
                } catch (org.eclipse.elk.core.UnsupportedConfigurationException e) {
                    hyperedges = false; // the rows of this level are skipped with the same message
                }
                routingRows(out, f, lv, hyperedges, smallest.contains(f) || VARIANT_MODELS.contains(f.id));
                if (VARIANT_MODELS.contains(f.id)) {
                    variantRows(out, f, lv);
                }
            }
        }
    }

    // Group scenarios (R2): one inline graph per scenario; steps follow the plan of a pipeline row

    static final String FS = "FIXED_SIDE", FP = "FIXED_POS", E_ = "EAST", W_ = "WEST", N_ = "NORTH", S_ = "SOUTH";

    static String kn(String id, int w, int h, String extra, String... opts) {
        return sz(nodeJson(id, null, opts.length == 0 ? null : ropts(opts), extra), w, h);
    }

    static String sz(String node, int w, int h) {
        return node.replace("\"width\":30,\"height\":30", "\"width\":" + w + ",\"height\":" + h);
    }

    /** Root options: the router plus pairs of (Java constant name, value string). */
    static String rr(EdgeRouting r, String... kv) {
        String[] all = new String[kv.length + 2];
        all[0] = EDGE_ROUTING;
        all[1] = r.name();
        System.arraycopy(kv, 0, all, 2, kv.length);
        return ropts(all);
    }

    /** Six nodes of different sizes with long edges (dummies). */
    static String gLong(String ro) {
        String kids = join(kn("n0", 30, 30, null), kn("n1", 40, 60, null), kn("n2", 30, 20, null), kn("n3", 50, 30, null),
                kn("n4", 30, 80, null), kn("n5", 30, 30, null));
        return flat(ro, kids, eds("n0>n1", "n1>n2", "n2>n3", "n3>n4", "n0>n3", "n0>n4", "n1>n5", "n5>n4"));
    }

    /** A fan out and in with seven nodes of different sizes and one long edge. */
    static String gFan(String ro) {
        String kids = join(kn("n0", 30, 20, null), kn("n1", 30, 50, null), kn("n2", 40, 30, null), kn("n3", 30, 40, null),
                kn("n4", 30, 60, null), kn("n5", 30, 25, null), kn("n6", 50, 35, null));
        return flat(ro, kids, eds("n0>n1", "n0>n2", "n0>n3", "n1>n4", "n2>n4", "n3>n4", "n2>n5", "n5>n6", "n4>n6", "n0>n6"));
    }

    /** One node with fixed-side ports on every side: north and south ports, with edges to and from all of them. */
    static String gNorthSouth(String ro) {
        return flat(ro, join(plain("a"), pnode("b", FS, null, W_, N_, N_, S_, S_, E_), plain("c"), plain("d"), plain("e")),
                eds("a>b.p0", "a>b.p1", "b.p2>c", "b.p3>d", "a>b.p4", "b.p5>e", "c>e", "d>e", "a>e"));
    }

    /** Fixed-side nodes whose edges leave and enter on the wrong side (inverted ports) and on the north and south sides. */
    static String gSides(String ro) {
        return flat(ro, join(pnode("a", FS, null, E_, E_, S_, N_), pnode("b", FS, null, W_, W_, E_, N_, S_),
                pnode("c", FS, null, W_, E_, N_), plain("d")),
                eds("a.p0>b.p0", "a.p1>c.p0", "a.p2>b.p4", "a.p3>c.p2", "b.p3>d", "c.p1>d", "b.p1>d"));
    }

    /** The hierarchical node T with external ports on every side (the imported level is T). */
    static String gExternal(String ro, boolean chain) {
        String ports = join(pj("T", 0, W_, null), pj("T", 1, E_, null), pj("T", 2, N_, null), pj("T", 3, N_, null),
                pj("T", 4, S_, null), pj("T", 5, S_, null));
        String kids = join(at("c0", 40, 40), at("c1", 90, 40), at("c2", 140, 40), at("c3", 190, 40));
        String edges = chain ? eds("c0>c1", "c1>c2", "c2>c3", "T.p0>c0", "c3>T.p1", "T.p2>c1", "T.p3>c3", "c0>T.p4", "c2>T.p5")
                : eds("T.p0>c0", "T.p2>c1", "c0>c2", "c1>c2", "c1>c3", "c2>T.p1", "c3>T.p4", "c0>T.p5");
        return hier(ro, ports, kids, edges);
    }

    /** External ports on the west and east sides only: SplineSegment.anchorY reads the north / south port coordinate NorthSouthPortPostprocessor
     * sets (SplineSegment.java:247), which the plan lacks when the only north / south ports are external (a NullPointerException). */
    static String gExternalWE(String ro) {
        String ports = join(pj("T", 0, W_, null), pj("T", 1, W_, null), pj("T", 2, E_, null), pj("T", 3, E_, null));
        String kids = join(at("c0", 40, 40), at("c1", 90, 40), at("c2", 140, 40), at("c3", 190, 40));
        return hier(ro, ports, kids, eds("T.p0>c0", "T.p1>c1", "c0>c2", "c1>c2", "c2>c3", "c2>T.p2", "c3>T.p3"));
    }

    static String gChain(String ro) {
        return gj(ro, 4, null, new int[][] {{0, 1}, {1, 2}, {2, 3}, {0, 2}, {0, 3}}, null);
    }

    static String gFeedback(String ro) {
        return gj(ro, 3, null, new int[][] {{0, 1}, {1, 2}, {2, 0}}, null);
    }

    /** Port a.p0 fans out over three edges (and one long edge) and e.p0 collects them: hyperedges at both ends. */
    static String gHyper(String ro) {
        return flat(ro, join(pnode("a", FS, null, E_), plain("b"), plain("c"), plain("d"), pnode("e", FS, null, W_)),
                eds("a.p0>b", "a.p0>c", "a.p0>d", "b>e.p0", "c>e.p0", "d>e.p0", "a.p0>e.p0"));
    }

    /** b has a normal WEST input and EAST output, an inverted EAST input (from d) and an inverted WEST output (to e). */
    static String gInLayer(String ro) {
        return flat(ro, join(plain("a"), pnode("b", FS, null, W_, E_, E_, W_), plain("c"), plain("d"), plain("e")),
                eds("a>b.p0", "b.p1>c", "d>b.p2", "b.p3>e"));
    }

    static String gNoEdges(String ro) {
        return flat(ro, join(plain("a"), plain("b")), "");
    }

    static String gNoNodes(String ro) {
        return flat(ro, "", "");
    }

    static String gSizes(String ro) {
        return flat(ro, join(kn("n0", 40, 90, null), kn("n1", 30, 20, null), kn("n2", 30, 60, null), kn("n3", 50, 30, null),
                kn("n4", 30, 40, null)), eds("n0>n1", "n0>n2", "n1>n3", "n2>n3", "n0>n3", "n3>n4", "n0>n4"));
    }

    /** The chain of a scenario: normalise, P1 GREEDY, P2 NETWORK_SIMPLEX (with the 7b layer constraint processors a pipeline always runs around
     * them), the processors up to the stop in plan order. Flags: h = hyperedges, i = inverted (non-free) ports, n = north / south ports,
     * e = external ports, f = feedback edges. stop = a processor member, "P4" or "P5". */
    static List<Object> chain(String flags, EdgeRouting r, String stop, String target) {
        boolean splines = r == EdgeRouting.SPLINES, north = flags.contains("n");
        List<Object> st = new ArrayList<>(List.of(imp(target), norm(), proc("EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER")));
        if (flags.contains("f")) { // feedbackEdges: the port sides are fixed before cycle breaking (GraphConfigurator.java:214)
            st.add(proc("PORT_SIDE_PROCESSOR"));
        }
        st.addAll(List.of(phase(P1, "GREEDY"), proc("LAYER_CONSTRAINT_PREPROCESSOR"), phase(P2, "NETWORK_SIMPLEX"),
                proc("LAYER_CONSTRAINT_POSTPROCESSOR")));
        List<String> pre = new ArrayList<>();
        if (flags.contains("e") && r == EdgeRouting.ORTHOGONAL) { // only the orthogonal router adds the hierarchical port processors
            pre.add("HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR");
        }
        pre.add("LONG_EDGE_SPLITTER");
        if (!flags.contains("f")) {
            pre.add("PORT_SIDE_PROCESSOR");
        }
        if (r != EdgeRouting.ORTHOGONAL || flags.matches(".*[hinf].*")) {
            pre.add("INVERTED_PORT_PROCESSOR");
        }
        pre.add("PORT_LIST_SORTER");
        if (north) {
            pre.add("NORTH_SOUTH_PORT_PREPROCESSOR");
        }
        pre.forEach(m -> st.add(proc(m)));
        st.add(phase(P3, "LAYER_SWEEP"));
        List<String> post = new ArrayList<>(List.of("TWO_SIDED_GREEDY_SWITCH", ILC, LANS, INMC));
        if (flags.contains("h") && r == EdgeRouting.ORTHOGONAL) {
            post.add(HDM);
        }
        if (flags.contains("e") && r == EdgeRouting.ORTHOGONAL) {
            post.add(HPDS);
        }
        post.forEach(m -> st.add(proc(m)));
        st.add(phase(P4, "BRANDES_KOEPF"));
        List<String> before = new ArrayList<>(List.of(LSGHC));
        if (flags.contains("e")) {
            before.add(HPPP);
        }
        if (splines && north) {
            before.add(NSPP);
        }
        before.forEach(m -> st.add(proc(m)));
        st.add(phase(P5, r.name()));
        List<String> after = new ArrayList<>(List.of(LEJ));
        if (!splines && north) {
            after.add(NSPP);
        }
        if (splines) {
            after.add(FSBC);
        }
        after.forEach(m -> st.add(proc(m)));
        return cut(st, stop);
    }

    /** The steps up to and including the stop. */
    static List<Object> cut(List<Object> st, String stop) {
        for (int i = 0; i < st.size(); i++) {
            @SuppressWarnings("unchecked")
            List<Object> s = (List<Object>) st.get(i);
            boolean hit = stop.equals("P4") ? s.get(0).equals("runPhase") && s.get(1).equals(P4)
                    : stop.equals("P5") ? s.get(0).equals("runPhase") && s.get(1).equals(P5)
                    : s.get(0).equals("runProcessor") && s.get(1).equals(stop);
            if (hit) {
                return new ArrayList<>(st.subList(0, i + 1));
            }
        }
        throw new Bug("scenario stop " + stop + " is not in the chain");
    }

    static final Map<String, String[]> CROSS = new LinkedHashMap<>();
    /** Scenario rows per family (router, option family, special graph): the coverage check wants at least two each. */
    static final Map<String, Integer> FAMILIES = new TreeMap<>();

    /** Registers scenarios/<cls>/<name>; the graph holds its options as root options (the cross check replays it as a pipeline row). */
    static void sc(String cls, String name, String family, String elk, String target, String flags, EdgeRouting r, String stop) {
        String id = "scenarios/" + cls + "/" + name;
        List<Object> st = chain(flags, r, stop, target);
        st.add(dump());
        SCENARIOS.add(new Spec(id, "scenarios", null, () -> ElkGraphJson.forGraph(elk).toElk(), target, new TreeMap<>(), null, st));
        CROSS.put(id, new String[] {elk, target, stop});
        FAMILIES.merge(family, 1, Integer::sum);
    }

    static final Map<EdgeRouting, String> ROUTER_CLASS = Map.of(EdgeRouting.ORTHOGONAL, "OrthogonalEdgeRouter",
            EdgeRouting.POLYLINE, "PolylineEdgeRouter", EdgeRouting.SPLINES, "SplineEdgeRouter");

    /** A graph builder taking root options. */
    interface Graph {
        String build(String rootOptions);
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        Map<String, Graph> graphs = new LinkedHashMap<>();
        graphs.put("long-edges", ro -> gLong(ro));
        graphs.put("fan", ro -> gFan(ro));
        graphs.put("chain", ro -> gChain(ro));
        graphs.put("sizes", ro -> gSizes(ro));
        for (EdgeRouting r : ROUTINGS) {
            String cls = ROUTER_CLASS.get(r), fam = "router-" + r.name();
            for (Map.Entry<String, Graph> g : graphs.entrySet()) {
                sc(cls, g.getKey(), fam, g.getValue().build(rr(r)), null, "", r, "P5");
            }
            sc(cls, "hyperedges", fam, gHyper(rr(r)), null, "h", r, "P5");
            sc(cls, "north-south-ports", fam, gNorthSouth(rr(r)), null, "n", r, "P5");
            sc(cls, "inverted-ports", fam, gSides(rr(r)), null, "in", r, "P5");
            sc(cls, "external-ports", fam, r == EdgeRouting.ORTHOGONAL ? gExternal(rr(r), true) : gExternalWE(rr(r)), "T", "e", r, "P5");
            sc(cls, "in-layer-edges", fam, gInLayer(rr(r)), null, "i", r, "P5");
            sc(cls, "no-edges", fam, gNoEdges(rr(r)), null, "", r, "P5");
            sc(cls, "no-layers", fam, gNoNodes(rr(r)), null, "", r, "P5");
            sc(cls, "feedback-edges", "feedbackEdges", gFeedback(rr(r, FEEDBACK, "true")), null, "f", r, "P5");
            sc(cls, "feedback-edges-sizes", "feedbackEdges", gSizes(rr(r, FEEDBACK, "true")), null, "f", r, "P5");
            sc("NorthSouthPortPostprocessor", r.name() + "/north-south-ports", "NORTH_SOUTH_PORT_POSTPROCESSOR", gNorthSouth(rr(r)), null, "n", r, NSPP);
            sc("NorthSouthPortPostprocessor", r.name() + "/inverted-ports", "NORTH_SOUTH_PORT_POSTPROCESSOR", gSides(rr(r)), null, "in", r, NSPP);
        }
        EdgeRouting ortho = EdgeRouting.ORTHOGONAL, poly = EdgeRouting.POLYLINE, spl = EdgeRouting.SPLINES;
        for (Map.Entry<String, Graph> g : graphs.entrySet()) {
            sc("LayerSizeAndGraphHeightCalculator", g.getKey(), "LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR", g.getValue().build(rr(ortho)), null, "", ortho, LSGHC);
            sc("LongEdgeJoiner", g.getKey(), "LONG_EDGE_JOINER", g.getValue().build(rr(ortho)), null, "", ortho, LEJ);
            sc("FinalSplineBendpointsCalculator", g.getKey(), "FINAL_SPLINE_BENDPOINTS_CALCULATOR", g.getValue().build(rr(spl)), null, "", spl, FSBC);
        }
        sc("FinalSplineBendpointsCalculator", "hyperedges", "FINAL_SPLINE_BENDPOINTS_CALCULATOR", gHyper(rr(spl)), null, "h", spl, FSBC);
        sc("FinalSplineBendpointsCalculator", "north-south-ports", "FINAL_SPLINE_BENDPOINTS_CALCULATOR", gNorthSouth(rr(spl)), null, "n", spl, FSBC);
        sc("LongEdgeJoiner", "hyperedges", "LONG_EDGE_JOINER", gHyper(rr(ortho)), null, "h", ortho, LEJ);
        sc("HierarchicalPortPositionProcessor", "external-chain", "HIERARCHICAL_PORT_POSITION_PROCESSOR", gExternal(rr(ortho), true), "T", "e", ortho, HPPP);
        sc("HierarchicalPortPositionProcessor", "external-fan", "HIERARCHICAL_PORT_POSITION_PROCESSOR", gExternal(rr(ortho), false), "T", "e", ortho, HPPP);
        sc("HierarchicalPortPositionProcessor", "external-chain-splines", "HIERARCHICAL_PORT_POSITION_PROCESSOR", gExternalWE(rr(spl)), "T", "e", spl, HPPP);
        sc("HyperedgeDummyMerger", "hyperedges", "HYPEREDGE_DUMMY_MERGER", gHyper(rr(ortho)), null, "h", ortho, HDM);
        sc("HyperedgeDummyMerger", "merge-edges-fan", "HYPEREDGE_DUMMY_MERGER", gFan(rr(ortho, MERGE_EDGES, "true")), null, "h", ortho, HDM);
        sc("HyperedgeDummyMerger", "merge-edges-hyperedges", "HYPEREDGE_DUMMY_MERGER", gHyper(rr(ortho, MERGE_EDGES, "true")), null, "h", ortho, HDM);
        for (String n : List.of("long-edges", "fan")) {
            Graph g = graphs.get(n);
            sc("OrthogonalEdgeRouter", "unnecessary-bendpoints/" + n, "unnecessaryBendpoints", g.build(rr(ortho, UNNECESSARY, "true")), null, "", ortho, "P5");
            sc("SplineEdgeRouter", "sloppy/" + n, "splines.mode.sloppy", g.build(rr(spl, SPLINES_MODE, "SLOPPY")), null, "", spl, "P5");
            sc("SplineEdgeRouter", "sloppy-0.6/" + n, "splines.sloppy.layerSpacingFactor", g.build(rr(spl, SPLINES_MODE, "SLOPPY", SLOPPY_FACTOR, "0.6")), null, "", spl, "P5");
            sc("FinalSplineBendpointsCalculator", "sloppy/" + n, "splines.mode.sloppy", g.build(rr(spl, SPLINES_MODE, "SLOPPY")), null, "", spl, FSBC);
            sc("PolylineEdgeRouter", "sloped-edge-zone-0.0/" + n, "polyline.slopedEdgeZoneWidth", g.build(rr(poly, SLOPED_ZONE, "0.0")), null, "", poly, "P5");
            for (EdgeRouting r : ROUTINGS) {
                sc(ROUTER_CLASS.get(r), "edge-edge-17/" + n, "spacing.edgeEdgeBetweenLayers", g.build(rr(r, EDGE_EDGE, "17")), null, "", r, "P5");
                sc(ROUTER_CLASS.get(r), "edge-node-14/" + n, "spacing.edgeNodeBetweenLayers", g.build(rr(r, EDGE_NODE, "14")), null, "", r, "P5");
                sc(ROUTER_CLASS.get(r), "node-node-32/" + n, "spacing.nodeNodeBetweenLayers", g.build(rr(r, NODE_NODE, "32")), null, "", r, "P5");
            }
        }
    }

    // Group calls (R12): NubsSelfLoop, SplinesMath, Rectangle and NubSpline entry points the routers' rows leave untaken

    static final String[] SIDES = {N_, E_, S_, W_};
    static final double MARGIN = 20, PORT = 4;
    static final String CALL_NODE = "g0/n0", CALL_P0 = "g0/n0/p0", CALL_P1 = "g0/n0/p1";

    /** One node w x h with FIXED_POS ports p0 and p1 on the given sides (ports of one side sit at a quarter and three quarters). */
    static String callGraph(int w, int h, String side0, String side1) {
        String ports = join(callPort(0, w, h, side0, side0.equals(side1) ? 1 : 3), callPort(1, w, h, side1, side0.equals(side1) ? 3 : 1));
        String node = sz(nodeJson("n", null, ropts("PORT_CONSTRAINTS", FP), "\"ports\":[" + ports + "]"), w, h);
        return flat("", node, "");
    }

    /** Port i at the border position (quarter / 2 quarters / three quarters of the side) on the side. */
    static String callPort(int i, int w, int h, String side, int quarter) {
        double[] xy = switch (side) {
            case N_ -> new double[] {w * quarter / 4.0, -PORT};
            case S_ -> new double[] {w * quarter / 4.0, h};
            case W_ -> new double[] {-PORT, h * quarter / 4.0};
            default -> new double[] {w, h * quarter / 4.0};
        };
        return pj("n", i, side, xy);
    }

    /** The point MARGIN outside the centre of the port on its side. */
    static List<Object> outer(int w, int h, String side, int quarter) {
        double x = side.equals(W_) ? -MARGIN : side.equals(E_) ? w + MARGIN : w * quarter / 4.0 + PORT / 2;
        double y = side.equals(N_) ? -MARGIN : side.equals(S_) ? h + MARGIN : h * quarter / 4.0 + PORT / 2;
        return vec(x, y);
    }

    static List<Object> vec(double x, double y) {
        return S("vector", hex(x), hex(y));
    }

    static List<Object> dv(double d) {
        return S("double", hex(d));
    }

    static List<Object> port(String path) {
        return S("port", path);
    }

    static List<Object> en(String type, String name) {
        return S("enum", type + "." + name);
    }

    static List<Object> pts(double... xy) {
        List<Object> l = new ArrayList<>();
        for (int i = 0; i < xy.length; i += 2) {
            l.add(S(hex(xy[i]), hex(xy[i + 1])));
        }
        return l;
    }

    static List<Object> rc(double top, double right, double bottom, double left) {
        return S("rectangle", hex(top), hex(right), hex(bottom), hex(left));
    }

    static List<Object> nubs(boolean clamped, int dim, double... xy) {
        return S("nubs", clamped, dim, pts(xy));
    }

    /** calls/<cls>/<method>-<name>: importGraph of the inline graph, the pre steps, then the call. */
    @SafeVarargs
    static void callRow(List<Spec> out, String cls, String method, String name, String elk, List<Object>... args) {
        callAfter(out, cls, method, name, elk, List.of(), args);
    }

    @SafeVarargs
    static void callAfter(List<Spec> out, String cls, String method, String name, String elk, List<List<Object>> pre, List<Object>... args) {
        List<Object> callStep = S("call", cls + "." + method);
        callStep.addAll(Arrays.asList(args));
        List<List<Object>> st = new ArrayList<>(List.of(imp(null)));
        st.addAll(pre);
        st.add(callStep);
        out.add(new Spec("calls/" + cls + "/" + method + "-" + name, "calls", null, () -> ElkGraphJson.forGraph(elk).toElk(), null,
                new TreeMap<>(), null, new ArrayList<Object>(st)));
    }

    /** One node 100 x 60 with a port on every side, each further outside than the last (margins 4, 8, 12, 16 after the margin calculator). */
    static String marginGraph() {
        String ports = join(pj("n", 0, N_, new double[] {48, -4}), pj("n", 1, E_, new double[] {104, 28}),
                pj("n", 2, S_, new double[] {48, 68}), pj("n", 3, W_, new double[] {-16, 28}));
        return flat("", sz(nodeJson("n", null, ropts("PORT_CONSTRAINTS", FP), "\"ports\":[" + ports + "]"), 100, 60), "");
    }

    static String lowerSide(String side) {
        return side.toLowerCase(Locale.ROOT);
    }

    static void callSpecs(List<Spec> out) {
        int[][] sizes = {{100, 60}, {240, 140}};
        for (int[] sz : sizes) {
            int w = sz[0], h = sz[1];
            String size = w + "x" + h;
            for (int a = 0; a < 4; a++) {
                String sa = SIDES[a], next = SIDES[(a + 1) % 4];
                String sideElk = callGraph(w, h, sa, sa);
                String suffix = lowerSide(sa) + "-" + size;
                callRow(out, "NubsSelfLoop", "createSideSelfLoop", "side-" + suffix, sideElk, port(CALL_P0), port(CALL_P1), dv(15));
                callRow(out, "NubsSelfLoop", "createCornerSelfLoop", "corner-" + suffix, callGraph(w, h, sa, next), port(CALL_P0),
                        port(CALL_P1), dv(12), dv(18));
                // across (two corners), three sides (three corners), four sides (a full ring back to the side)
                for (int corners = 2; corners <= 4; corners++) {
                    String target = SIDES[(a + corners) % 4];
                    List<Object> ring = new ArrayList<>();
                    double[][] c = {{w + MARGIN, -MARGIN}, {w + MARGIN, h + MARGIN}, {-MARGIN, h + MARGIN}, {-MARGIN, -MARGIN}};
                    for (int k = 0; k < corners; k++) {
                        ring.add(S(hex(c[(a + k) % 4][0]), hex(c[(a + k) % 4][1])));
                    }
                    int tq = target.equals(sa) ? 3 : 1, sq = target.equals(sa) ? 1 : 3;
                    String method = corners == 2 ? "createAcrossSelfLoop" : corners == 3 ? "createThreeSideSelfLoop" : "createFourSideSelfLoop";
                    String kind = corners == 2 ? "across" : corners == 3 ? "three-side" : "four-side";
                    callRow(out, "NubsSelfLoop", method, kind + "-" + suffix, callGraph(w, h, sa, target), port(CALL_P0), port(CALL_P1),
                            outer(w, h, sa, sq), S("vectors", ring), outer(w, h, target, tq));
                }
            }
        }
        String g = callGraph(100, 60, N_, S_);
        double[][] lines = {{0, 0, 10, 10, 0, 10, 10, 0}, {0, 0, 10, 0, 0, 5, 10, 5}, {1, 2, 4, 8, -3, 5, 9, -7}};
        for (int i = 0; i < lines.length; i++) {
            double[] l = lines[i];
            callRow(out, "SplinesMath", "intersect", "points-" + i, g, vec(l[0], l[1]), vec(l[2], l[3]), vec(l[4], l[5]), vec(l[6], l[7]));
        }
        double[][] dirs = {{0, 0, 20, 10, 0.5, 2.5}, {5, 5, 25, -15, 0.0, 1.5707963267948966}, {-4, 7, 12, 3, 3.0, 4.5}};
        for (int i = 0; i < dirs.length; i++) {
            double[] d = dirs[i];
            callRow(out, "SplinesMath", "intersect", "directions-" + i, g, vec(d[0], d[1]), vec(d[2], d[3]), dv(d[4]), dv(d[5]));
        }
        double[][] angles = {{1, 0, 0, 1}, {3, 4, -3, 4}, {2, 1, 2, 1}};
        for (int i = 0; i < angles.length; i++) {
            double[] v = angles[i];
            callRow(out, "SplinesMath", "innerAngle", "vectors-" + i, g, vec(v[0], v[1]), vec(v[2], v[3]));
        }
        double[][] dirPairs = {{0.5, 2.0}, {3.0, 0.25}, {1.0, 1.0}};
        for (int i = 0; i < dirPairs.length; i++) {
            callRow(out, "SplinesMath", "innerAngle", "directions-" + i, g, dv(dirPairs[i][0]), dv(dirPairs[i][1]));
        }
        double[][] orth = {{0.0, 5, 3}, {1.5707963267948966, 2, 6}, {0.0, -4, 1}, {3.141592653589793, 7, -2}};
        for (int i = 0; i < orth.length; i++) {
            callRow(out, "SplinesMath", "lengthToOrthogonal", "case-" + i, g, dv(orth[i][0]), vec(orth[i][1], orth[i][2]));
        }
        for (String side : List.of(N_, E_, S_, W_, "UNDEFINED")) {
            callRow(out, "SplinesMath", "portSideToDirection", lowerSide(side), g, en("PortSide", side));
        }
        for (String side : SIDES) {
            callRow(out, "SplinesMath", "distPortToNodeEdge", lowerSide(side) + "-p0", g, port(CALL_P0), en("PortSide", side));
            callRow(out, "SplinesMath", "distPortToNodeEdge", lowerSide(side) + "-p1", g, port(CALL_P1), en("PortSide", side));
            callAfter(out, "SplinesMath", "getMarginOnPortSide", lowerSide(side), marginGraph(),
                    List.of(norm(), layersOf(L(CALL_NODE)), proc(INMC)), S("node", CALL_NODE), en("PortSide", side));
        }
        callRow(out, "SplinesMath", "distPortToNodeEdge", "undefined", g, port(CALL_P0), en("PortSide", "UNDEFINED"));
        callAfter(out, "SplinesMath", "getMarginOnPortSide", "undefined", marginGraph(),
                List.of(norm(), layersOf(L(CALL_NODE)), proc(INMC)), S("node", CALL_NODE), en("PortSide", "UNDEFINED"));
        int[][] ints = {{5, 3, 8}, {5, 8, 3}, {2, 3, 8}, {3, 3, 8}, {9, 3, 8}};
        for (int i = 0; i < ints.length; i++) {
            callRow(out, "SplinesMath", "isBetween", "int-" + i, g, S("int", ints[i][0]), S("int", ints[i][1]), S("int", ints[i][2]));
        }
        double[][] doubles = {{5, 3, 8}, {5, 8, 3}, {2, 3, 8}, {3.0000001, 3, 8}, {8, 3, 8}, {9.5, 8, 3}};
        for (int i = 0; i < doubles.length; i++) {
            callRow(out, "SplinesMath", "isBetween", "double-" + i, g, dv(doubles[i][0]), dv(doubles[i][1]), dv(doubles[i][2]));
        }
        double[][] rects = {{0, 10, 20, 0}, {-5, 8, 12, -3}, {3, 3, 3, 3}};
        for (int i = 0; i < rects.length; i++) {
            double[] r = rects[i];
            callRow(out, "Rectangle", "union", "vector-" + i, g, rc(r[0], r[1], r[2], r[3]), vec(15 - 9 * i, -7 + 12 * i));
            callRow(out, "Rectangle", "union", "rectangles-" + i, g, rc(r[0], r[1], r[2], r[3]), rc(r[0] + 2, r[1] + 9, r[2] + 4, r[3] - 5));
            callRow(out, "Rectangle", "enlarge", "case-" + i, g, rc(r[0], r[1], r[2], r[3]), dv(2.5 * (i + 1)));
            callRow(out, "Rectangle", "toNodeMargins", "case-" + i, g, rc(r[0] - 6, r[1] + 7, r[2] + 8, r[3] - 9), S("node", CALL_NODE));
        }
        for (String side : List.of(N_, E_, S_, W_, "UNDEFINED")) {
            callRow(out, "Rectangle", "getFromPortSide", lowerSide(side), g, rc(-2, 14, 9, -6), en("PortSide", side));
        }
        double[][] chains = {{0, 0, 10, 0, 20, 10, 30, 10, 40, 0}, {0, 0, 5, 20, 15, 25, 30, 5, 45, -10, 60, 15, 80, 0},
            {0, 10, 12, 30, 24, 0, 36, 30, 48, 0, 60, 30}};
        for (int i = 0; i < chains.length; i++) {
            callRow(out, "NubSpline", "generateDerivedNUBS", "chain-" + i, g, nubs(true, 3, chains[i]));
            callRow(out, "NubSpline", "generateInvertedNUBS", "chain-" + i, g, nubs(true, 3, chains[i]));
            callRow(out, "NubSpline", "toBezier", "chain-" + i, g, nubs(true, 3, chains[i]));
            for (double t : new double[] {0.0, 0.5, 1.0}) {
                callRow(out, "NubSpline", "getPointOnCurve", "chain-" + i + "-t" + t, g, nubs(true, 3, chains[i]), dv(t));
            }
        }
        callRow(out, "NubSpline", "generateDerivedNUBS", "unclamped", g, nubs(false, 3, chains[0]));
        callRow(out, "NubSpline", "toBezier", "unclamped", g, nubs(false, 3, chains[1]));
    }

    // Group sites and the T13 calls (R12): one row per scenario of plans/layered-edge-routing/unreached.md. The carriers are
    // chain-forced like 7c S13 / 7d S12 (no SELF_LOOP_PREPROCESSOR, the interactive plan A, a processor outside its plan).

    /** Plan A: the plan of a router under the interactive minimizer and placer (explicit x / y fix the order and the coordinates). */
    @SuppressWarnings("unchecked")
    static List<Object> planA(EdgeRouting r, String stop) {
        List<Object> st = chain("", r, stop, null);
        st.removeIf(s -> ((List<Object>) s).contains("TWO_SIDED_GREEDY_SWITCH"));
        st.stream().map(s -> (List<Object>) s).filter(s -> s.get(0).equals("runPhase") && (s.get(1).equals(P3) || s.get(1).equals(P4)))
                .forEach(s -> s.set(2, "INTERACTIVE"));
        return st;
    }

    static void site(List<Spec> out, String id, String elk, String target, List<Object> st) {
        st.add(dump());
        out.add(new Spec("sites/" + id, "sites", null, () -> ElkGraphJson.forGraph(elk).toElk(), target, new TreeMap<>(), null, st));
    }

    /** The two-column carriers: nodes "id@y/h" (x 0 left, 100 right; a trailing p adds one FIXED_SIDE port), edges "a>b". */
    static String og(String ro, String left, String right, String edges) {
        List<String> kids = new ArrayList<>();
        for (int col = 0; col < 2; col++) {
            for (String t : (col == 0 ? left : right).split(" ")) {
                boolean p = t.endsWith("p");
                String[] a = t.substring(0, t.length() - (p ? 1 : 0)).split("[@/]");
                double[] xy = {100 * col, Double.parseDouble(a[1])};
                kids.add(sz(p ? pnode(a[0], FS, xy, col == 0 ? E_ : W_) : nodeJson(a[0], xy, null, null), 30, Integer.parseInt(a[2])));
            }
        }
        return flat(ro, String.join(",", kids), eds(edges.split(" ")));
    }

    /** S9: the external-chain graph with explicit port positions under the constraint (ports W E N N S S, or N and S only plus a normal node at each end). */
    static String gFixed(String pc, boolean ns) {
        double[][] xy = {{-4, 60}, {300, 140}, {100, -4}, {200, -4}, {100, 200}, {200, 200}};
        String[] sides = {W_, E_, N_, N_, S_, S_};
        List<String> ports = new ArrayList<>();
        for (int i = ns ? 2 : 0; i < 6; i += ns ? 3 : 1) {
            ports.add(pj("T", ports.size(), sides[i], xy[i]));
        }
        String kids = join(at("c0", 40, 40), at("c1", 90, 40), at("c2", 140, 40), at("c3", 190, 40)) + (ns ? "," + join(at("s0", 0, 40), at("t0", 240, 40)) : "");
        String edges = ns ? eds("T.p0>c0", "s0>c0", "c0>c1", "c1>c2", "c2>c3", "c3>T.p1", "c3>t0")
                : eds("c0>c1", "c1>c2", "c2>c3", "T.p0>c0", "c3>T.p1", "T.p2>c1", "T.p3>c3", "c0>T.p4", "c2>T.p5");
        return hier(rr(EdgeRouting.ORTHOGONAL), String.join(",", ports), kids, edges).replace("\"FIXED_SIDE\"", "\"" + pc + "\"");
    }

    static void siteSpecs(List<Spec> out) {
        EdgeRouting ortho = EdgeRouting.ORTHOGONAL, spl = EdgeRouting.SPLINES;
        java.util.function.BiFunction<String, double[], String> b4 = (id, yh) -> sz(pnode(id, FS, new double[] {100, yh[0]}, W_, E_, E_, W_), 30, (int) yh[1]);
        String[][] a = {
            {"OrthogonalRoutingGenerator/crossedPair", "a@0/30 b@50/30", "c@0/30 d@50/30", "a>d b>c"},
            {"HyperEdgeSegmentSplitter/twoCycles", "L0@0/30 L1@50/30 L2@200/30 L3@250/30", "R0@0/30 R1@50/30 R2@200/30 R3@250/30", "L0>R1 L1>R0 L2>R3 L3>R2"},
            {"HyperEdgeCycleDetector/criticalOutNoCriticalIn", "a0@40/30 a1@160/30", "b0@40/30 b1@170/10", "a0>b1 a1>b1 a1>b0"},
            {"HyperEdgeSegmentSplitter/hyperedgeSplitsRegular", "a0@5/20 a1@80/30p", "b0@-5/50p b1@75/50p b2@165/30p", "a0>b1.p0 a1.p0>b0.p0 a1.p0>b2.p0"},
            {"HyperEdgeSegmentSplitter/areaRatingFewerDependencies", "a0@45/40 a1@260/10", "b0@40/50 b1@140/50p b2@210/10 b3@240/50p", "a0>b1.p0 a0>b3.p0 a1>b0 a0>b2"},
            {"HyperEdgeSegmentSplitter/areaRatingFewerCrossings", "a0@100/30p a1@150/30p a2@250/30", "b0@100/30p b1@155/20p b2@200/30p b3@255/20p",
                "a0.p0>b1.p0 a1.p0>b0.p0 a1.p0>b2.p0 a2>b1.p0 a2>b2.p0 a0.p0>b3.p0"},
            {"HyperEdgeSegmentSplitter/denseCycles", "a0@-5/40 a1@50/30p a2@100/30p a3@155/20p", "b0@0/40 b1@65/10p b2@115/10p b3@155/30 b4@255/30",
                "a0>b0 a0>b1.p0 a0>b2.p0 a0>b3 a1.p0>b2.p0 a1.p0>b3 a2.p0>b1.p0 a3.p0>b0 a3.p0>b1.p0 a2.p0>b4"},
            // S15: a positive-weight dependency cycle between four spline segments (uniform4), and a draw between two equal outflows (tie; seeds 1 and 4096 pick differently)
            {"SplineEdgeRouter/dependencyCycle/uniform4", "l0@0/20 l1@40/20 l2@80/20 l3@120/20", "r0@0/20 r1@40/20 r2@80/20 r3@120/20", "l0>r3 l1>r2 l2>r0 l3>r1"},
            {"SplineEdgeRouter/dependencyCycle/tie/seed1", "l0@0/20 l1@200/20 l2@240/20 l3@280/20", "r0@80/20 r1@200/20 r2@240/20 r3@320/20", "l0>r2 l1>r3 l2>r0 l3>r1"},
            {"SplineEdgeRouter/dependencyCycle/tie/seed4096", "l0@0/20 l1@200/20 l2@240/20 l3@280/20", "r0@80/20 r1@200/20 r2@240/20 r3@320/20", "l0>r2 l1>r3 l2>r0 l3>r1"}};
        for (String[] r : a) {
            boolean spline = r[0].startsWith("Spline");
            String seed = r[0].contains("/seed") ? r[0].substring(r[0].indexOf("/seed") + 5) : "";
            site(out, r[0], og(spline ? seed.isEmpty() ? rr(spl) : rr(spl, "RANDOM_SEED", seed) : rr(ortho), r[1], r[2], r[3]), null, planA(spline ? spl : ortho, "P5"));
        }
        // Sc3: one source port feeding two FIXED_POS WEST ports at the same offset
        String fp = ropts("PORT_CONSTRAINTS", FP), r0 = "\"ports\":[" + pj("R0", 1, W_, new double[] {-4, 8}) + "," + pj("R0", 2, W_, new double[] {-4, 8}) + "]";
        site(out, "HyperEdgeSegment/equalPortPositions", flat(rr(ortho), join(nodeJson("L0", new double[] {0, 0}, fp, "\"ports\":[" + pj("L0", 0, E_, new double[] {30, 13}) + "]"),
                nodeJson("R0", new double[] {100, 60}, fp, r0)), eds("L0.p0>R0.p1", "L0.p0>R0.p2")), null, planA(ortho, "P5"));
        // S16: two in-layer segments without a left port (the WEST outputs of b2 and b3); one has two outgoing dependencies
        site(out, "SplineEdgeRouter/rightwardNesting", flat(rr(spl), join(b4.apply("b2", new double[] {160, 60}), at("a2", 0, 0), at("e2", 0, 260), b4.apply("b3", new double[] {210, 40}), at("a3", 0, 40), at("e3", 0, 110)),
                eds("a2>b2.p0", "b2.p3>e2", "a3>b3.p0", "b3.p3>e3")), null, planA(spl, "P5"));
        // S9-S11: hierarchical port positions and empty layers
        for (String[] v : new String[][] {{"fixedPos", FP}, {"fixedRatio", "FIXED_RATIO"}, {"northSouth", FP}}) {
            site(out, "HierarchicalPortPosition/fixedCoordinates/" + v[0], gFixed(v[1], v[0].equals("northSouth")), "T", chain("e", ortho, HPPP, "T"));
        }
        site(out, "HierarchicalPortPosition/emptyGraph", hier("", "", "", ""), "T", steps(imp("T"), norm(), proc(HPPP)));
        for (String m : new String[] {LSGHC, HDM}) {
            site(out, "EmptyLayer/" + (m.equals(HDM) ? "merger" : "layerSize"), flat(rr(ortho), join(plain("a"), plain("b")), eds("a>b")), null,
                    steps(imp(null), norm(), layersOf(L("g0/n0"), L(), L("g0/n1")), proc(m)));
        }
        // S12: parallel long edges sharing both ports; the merger runs outside the SPLINES plan (after INNERMOST_NODE_MARGIN_CALCULATOR)
        String hm = flat(rr(spl, MERGE_EDGES, "true"), join(pnode("a", FS, null, E_), plain("m"), pnode("x", FS, null, W_)), eds("a.p0>m", "m>x.p0", "a.p0>x.p0", "a.p0>x.p0"));
        for (String stop : new String[] {INMC, FSBC}) {
            List<Object> st = chain("h", spl, stop, null);
            st.add(st.indexOf(proc(INMC)) + 1, proc(HDM));
            site(out, "HyperedgeMerger/parallelLongEdges/" + (stop.equals(INMC) ? "merger" : "splines"), hm, null, st);
        }
        // S13: SELF_LOOP_PREPROCESSOR is not in the plan: b keeps an east-east loop (its layer is wider than b), d a north-north loop
        for (EdgeRouting r : ROUTINGS) {
            site(out, "SelfLoop/" + r.name().toLowerCase(Locale.ROOT), flat(rr(r), join(plain("a"), pnode("b", FS, null, E_, E_), sz(plain("w"), 100, 30), plain("c"), pnode("d", FS, null, N_, N_)),
                    eds("a>b", "a>w", "b>c", "w>c", "c>d", "b.p0>b.p1", "d.p0>d.p1")), null, chain("n", r, r == spl ? "P5" : NSPP, null));
        }
        // S14: the compaction arms of FinalSplineBendpointsCalculator read the option only
        String ro = rr(spl, SPLINES_MODE, "SLOPPY", "COMPACTION_POST_COMPACTION_STRATEGY", "LEFT");
        site(out, "FinalSplineBendpoints/compaction/near", gLong(ro), null, chain("", spl, FSBC, null));
        site(out, "FinalSplineBendpoints/compaction/far", gFan(ro), null, chain("", spl, FSBC, null));
    }

    /** calls/<id>: importGraph of the inline graph, then the call. */
    @SafeVarargs
    static void cx(List<Spec> out, String id, String call, String elk, List<Object>... args) {
        List<Object> c = S("call", call);
        c.addAll(Arrays.asList(args));
        out.add(new Spec("calls/" + id, "calls", null, () -> ElkGraphJson.forGraph(elk).toElk(), null, new TreeMap<>(), null, steps(imp(null), c)));
    }

    static void moreCalls(List<Spec> out) {
        String g = callGraph(100, 60, N_, S_);
        // S17: the four extreme-point statics on four control polygons (maxRecursion 10; 1 and 0 on a few)
        double[][] polys = {{0, 80, 30, 40, 60, 10, 40, 30, 80, 70, 120, 90}, {100, 0, 60, 30, 20, 60, 40, 40, 80, 20, 120, 10},
            {0, 0, 10, 10, 10, 10, 30, 5, 50, 30, 60, 40}, {0, 0, 10, 10, 20, 25, 30, 40, 50, 60, 60, 90}};
        String[] ext = {"getFirstVerticalPoint", "getLastVerticalPoint", "getFirstHorizontalPoint", "getLastHorizontalPoint"};
        List<int[]> runs = new ArrayList<>(List.of(new int[] {0, 0, 1}, new int[] {0, 0, 0}, new int[] {3, 1, 1}, new int[] {1, 2, 0}));
        for (int m = 0; m < 4; m++) {
            for (int p = 0; p < (m % 3 == 0 ? 4 : 3); p++) {
                runs.add(new int[] {m, p, 10});
            }
        }
        runs.forEach(r -> cx(out, "NubSpline/extremePoints/" + ext[r[0]] + "-p" + (r[1] + 1) + "-r" + r[2], "NubSpline." + ext[r[0]], g, nubs(true, 3, polys[r[1]]),
                dv(1e-3), S("int", r[2])));
        cx(out, "NubSpline/extremePoints/getPointOnCurve-p1-modify", "NubSpline.getPointOnCurve", g, nubs(true, 3, polys[0]), dv(0.5), S("boolean", true));
        // S18: paddings, an unclamped insertion and the nice curve
        double[][] pad = {{10, 5}, {0, 0, 10, 5}, {0, 0, 10, 5, 20, 0}};
        for (int k = 0; k < 3; k++) {
            cx(out, "NubSpline/construction/padded-" + (k + 1) + "pt", "NubSpline.toBezier", g, nubs(true, 3, pad[k]));
        }
        cx(out, "NubSpline/construction/getPointOnCurve-unclamped", "NubSpline.getPointOnCurve", g, nubs(false, 3, 0, 0, 5, 20, 15, 25, 30, 5, 45, -10, 60, 15, 80, 0), dv(0.45));
        cx(out, "NubSpline/construction/niceCurve", "NubSpline.generateNiceCurve", g);
        // S19: Rectangle extents (a node at 12, 7 of size 44 x 26 against a disjoint, a containing and an overlapping rectangle)
        String gn = flat("", sz(nodeJson("n", new double[] {12, 7}, null, null), 44, 26), "");
        double[][] with = {{100, 200, 140, 150}, {0, 100, 60, 0}, {-5, 30, 20, -8}}, rects = {{0, 10, 20, 0}, {-5, 8, 12, -3}, {3, 3, 3, 3}};
        for (int i = 0; i < 3; i++) {
            double[] u = with[i], r = rects[i];
            cx(out, "Rectangle/extents/union-node-" + i, "Rectangle.union", gn, rc(u[0], u[1], u[2], u[3]), S("node", CALL_NODE));
            cx(out, "Rectangle/extents/getHeight-" + i, "Rectangle.getHeight", g, rc(r[0], r[1], r[2], r[3]));
            cx(out, "Rectangle/extents/getWidth-" + i, "Rectangle.getWidth", g, rc(r[0], r[1], r[2], r[3]));
        }
        // S20: corner self loops on ports whose side is UNDEFINED (no port.side, free constraints); the second row gives the source a NORTH side
        for (String north : new String[] {"", "-northTarget"}) {
            String ports = join(pj("n", 0, north.isEmpty() ? null : N_, new double[] {100, 15}), pj("n", 1, null, new double[] {100, 45}));
            cx(out, "NubsSelfLoop/createCornerSelfLoop-undefined" + north, "NubsSelfLoop.createCornerSelfLoop",
                    flat("", sz(nodeJson("n", null, null, "\"ports\":[" + ports + "]"), 100, 60), ""), port(CALL_P0), port(CALL_P1), dv(12), dv(18));
        }
    }

    // Cross check: every scenario replayed as a pipeline row must reproduce the step row (ROUTING_CROSSCHECK=1)

    static void crossCheck(List<Spec> specs) {
        for (Spec s : specs) {
            String[] c = CROSS.get(s.id);
            if (c == null || (FILTER != null && !s.id.contains(FILTER))) {
                continue;
            }
            String elk = export(ElkGraphJson.forGraph(c[0]).toElk());
            Spec pipe = new Spec(s.id, "scenarios", null, null, c[1], opts(), c[2], null);
            Map<String, Object> step;
            Map<String, Object> pipeline;
            try {
                step = runSteps(ElkGraphJson.forGraph(elk).toElk(), s.steps);
                Result r = runPipeline(pipe, ElkGraphJson.forGraph(elk).toElk());
                pipeline = r.expected;
                if ("v".equals(System.getenv("ROUTING_CROSSCHECK"))) {
                    System.err.println("pipeline prefix of " + s.id + ": " + r.prefix + "\nsteps " + json(s.steps));
                }
            } catch (RuntimeException e) {
                if ("v".equals(System.getenv("ROUTING_CROSSCHECK"))) {
                    e.printStackTrace();
                }
                throw new Bug("cross check " + s.id + ": " + e);
            }
            for (String key : List.of("layers", "layerless", "ports", "edges", "geometry")) {
                String a = json(step.get(key)), b = json(pipeline.get(key));
                if (!a.equals(b)) {
                    throw new Bug("cross check " + s.id + ": " + key + " differs\n" + clip(a, b) + "\n" + clip(b, a));
                }
            }
        }
        System.err.println("cross check ok");
    }

    // Build and main

    static final String FILTER = System.getenv("ROUTING_FILTER");
    static final boolean MARKERS = System.getenv("ROUTING_MARKERS") != null;
    static final boolean DISCOVER = System.getenv("ROUTING_DISCOVER") != null;
    static final boolean CROSSCHECK = System.getenv("ROUTING_CROSSCHECK") != null;

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

    /** Records every row; returns the two output files by name. */
    static Map<String, String> buildAll() {
        RAN.clear();
        CALLED.clear();
        REFUSED_ROWS.clear();
        NOT_IN_PLAN.clear();
        ORACLE_THROWN.clear();
        FAMILIES.clear();
        CROSS.clear();
        buildProcessorNames();
        List<Spec> specs = new ArrayList<>();
        modelSpecs(specs);
        scenarioSpecs(specs);
        siteSpecs(specs);
        callSpecs(specs);
        moreCalls(specs);
        if (CROSSCHECK) {
            crossCheck(specs);
        }
        Set<String> ids = new HashSet<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String group : List.of("models", "scenarios", "sites", "calls")) {
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
                String[] parts = s.id.split("/");
                String key = parts[1] + "/" + parts[2] + "/" + r.member;
                if (DISCOVER) {
                    System.err.println("DISCOVER refusal " + key + (REFUSAL_CATEGORIES.contains(r.member) ? "" : "  OUTSIDE R1"));
                } else if (!s.group.equals("models") || !ACCEPTED_REFUSALS.contains(key)
                        || !REFUSAL_CATEGORIES.contains(r.member)) {
                    throw r;
                }
                REFUSED_ROWS.merge(key, 1, Integer::sum);
                continue;
            } catch (NotInPlan e) {
                if (!s.group.equals("models")) {
                    throw e;
                }
                NOT_IN_PLAN.merge(s.id.split("/")[3], 1, Integer::sum);
                continue;
            } catch (NullPointerException | ArrayIndexOutOfBoundsException e) {
                // The oracle itself throws (no result to port): only the levels listed in ORACLE_THROWS are skipped.
                String[] parts = s.id.split("/");
                String key = parts[1] + "/" + parts[2] + "/" + e.getClass().getSimpleName() + "@"
                        + e.getStackTrace()[0].getClassName().replaceAll(".*[.$]", "");
                if (DISCOVER) {
                    System.err.println("DISCOVER oracle throws " + key);
                } else if (!s.group.equals("models") || !ORACLE_THROWS.contains(key)) {
                    throw e;
                }
                ORACLE_THROWN.merge(key, 1, Integer::sum);
                continue;
            } catch (org.eclipse.elk.core.UnsupportedConfigurationException e) {
                if (!s.group.equals("models")) {
                    throw e;
                }
                System.err.println("skipped row " + s.id.substring("models/".length()) + " (oracle throws "
                        + "UnsupportedConfigurationException: " + e.getMessage() + ")");
                continue;
            }
            counts.merge(s.group, 1, Integer::sum);
        }
        if (FILTER == null) {
            checkCoverage();
        }
        System.err.println("max BFS_NODE_ORDER sources " + maxBfsSources);
        REFUSED_ROWS.forEach((k, n) -> System.err.println("refused (accepted) " + n + " rows: " + k));
        NOT_IN_PLAN.forEach((k, n) -> System.err.println("stop not in the algorithm (skipped) " + n + " rows: " + k));
        ORACLE_THROWN.forEach((k, n) -> System.err.println("oracle throws (accepted, skipped) " + n + " rows: " + k));
        List<Row> models = rows.stream().filter(r -> r.group.equals("models")).toList();
        List<Row> steps = rows.stream().filter(r -> !r.group.equals("models")).toList();
        if (System.getenv("ROUTING_STATS") != null) {
            Map<String, Long> bytes = new TreeMap<>();
            for (Row r : rows) {
                String[] p = r.id.split("/");
                bytes.merge(p.length > 4 ? p[3] + "/" + p[4].replaceAll("-.*", "") : p[0] + "/" + p[1], (long) r.json.length(), Long::sum);
                bytes.merge(p.length > 4 ? "model " + p[1] : "x", (long) r.json.length(), Long::sum);
                bytes.merge(p.length > 4 ? "variant " + (p[4].contains("-") ? p[4].substring(p[4].indexOf('-') + 1) : "base") : "x", (long) r.json.length(), Long::sum);
            }
            bytes.forEach((kind, v) -> System.err.println("STATS " + v + " " + kind));
        }
        System.err.println("rows " + rows.size() + " " + counts);
        Map<String, Integer> modelCounts = new LinkedHashMap<>(), stepCounts = new LinkedHashMap<>();
        modelCounts.put("models", counts.get("models"));
        stepCounts.put("scenarios", counts.get("scenarios"));
        stepCounts.put("sites", counts.get("sites"));
        stepCounts.put("calls", counts.get("calls"));
        Map<String, String> files = new LinkedHashMap<>();
        files.put(OUTPUT_MODELS, fileText(modelCounts, models));
        files.put(OUTPUT_STEPS, fileText(stepCounts, steps));
        return files;
    }

    /** R2 coverage: every router, option family and 7e processor has a scenario row; every named method has a call row. */
    static void checkCoverage() {
        List<String> missing = new ArrayList<>();
        for (EdgeRouting r : ROUTINGS) {
            if (!RAN.contains(P5 + "/" + r.name())) {
                missing.add(P5 + "/" + r.name());
            }
            if (FAMILIES.getOrDefault("router-" + r.name(), 0) < 2) {
                missing.add("two scenarios of router-" + r.name());
            }
        }
        for (String m : SEVEN_E) {
            if (!RAN.contains(m) || FAMILIES.getOrDefault(m, 0) < 2) {
                missing.add(m);
            }
        }
        for (String family : List.of("unnecessaryBendpoints", "splines.mode.sloppy", "splines.sloppy.layerSpacingFactor",
                "polyline.slopedEdgeZoneWidth", "spacing.edgeEdgeBetweenLayers", "spacing.edgeNodeBetweenLayers",
                "spacing.nodeNodeBetweenLayers", "feedbackEdges")) {
            if (FAMILIES.getOrDefault(family, 0) < 2) {
                missing.add("two scenarios of " + family);
            }
        }
        for (String m : List.of("NubsSelfLoop.createSideSelfLoop", "NubsSelfLoop.createCornerSelfLoop",
                "NubsSelfLoop.createAcrossSelfLoop", "NubsSelfLoop.createThreeSideSelfLoop", "NubsSelfLoop.createFourSideSelfLoop",
                "SplinesMath.intersect", "SplinesMath.innerAngle", "SplinesMath.lengthToOrthogonal", "SplinesMath.portSideToDirection",
                "SplinesMath.distPortToNodeEdge", "SplinesMath.isBetween", "SplinesMath.getMarginOnPortSide", "Rectangle.union",
                "Rectangle.enlarge", "Rectangle.getFromPortSide", "Rectangle.toNodeMargins", "NubSpline.getPointOnCurve",
                "NubSpline.generateDerivedNUBS", "NubSpline.generateInvertedNUBS", "NubSpline.toBezier")) {
            if (!CALLED.contains(m)) {
                missing.add(m);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("no step row covers " + missing);
        }
        System.err.println("skipped levels and stops are listed above; row timeouts: 0 (a timeout stops the recording)");
    }

    public static void main(String[] args) throws Exception {
        // ELK keeps LNodes in HashSets/HashMaps: LNode has no hashCode, so the iteration order follows the identity
        // hash and changes from run to run. AD-10 ports such collections in insertion order, so the oracle runs with
        // a constant identity hash (-XX:hashCode=2, set by the script): every key lands in one bucket and iterates in
        // insertion order.
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/layered-routing-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        discoverProperties();
        Map<String, String> files;
        try {
            files = buildAll();
            if (FILTER == null) {
                Map<String, String> again = buildAll();
                if (!files.equals(again)) {
                    for (String name : files.keySet()) {
                        if (!files.get(name).equals(again.get(name))) {
                            throw new IllegalStateException("two builds differ in " + name + "\n" + clip(files.get(name), again.get(name))
                                    + "\n" + clip(again.get(name), files.get(name)));
                        }
                    }
                }
            }
        } catch (Refusal r) {
            System.err.println("refused: " + r.getMessage());
            System.exit(1);
            return;
        }
        Files.createDirectories(Path.of(args[0]));
        for (Map.Entry<String, String> f : files.entrySet()) {
            long bytes = f.getValue().getBytes(StandardCharsets.UTF_8).length;
            if (bytes > MAX_BYTES) {
                throw new IllegalStateException(f.getKey() + " is " + bytes + " bytes, over the 5 MB cap");
            }
            Files.writeString(Path.of(args[0], f.getKey()), f.getValue(), StandardCharsets.UTF_8);
            strictParse(Path.of(args[0], f.getKey()));
            System.err.println("strict JSON parse ok, " + f.getKey() + " bytes " + bytes);
        }
    }
}
