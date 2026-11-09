// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7d, T1, N1-N3) for the org.eclipse.elk.alg.layered node
// placement (p4nodes: SimpleNodePlacer, InteractiveNodePlacer, LinearSegmentsNodePlacer, NetworkSimplexPlacer;
// p4nodes.bk: BKNodePlacer and its helpers) and the five processors a P4 stop needs: InnermostNodeMarginCalculator,
// LabelAndNodeSizeProcessor, InLayerConstraintProcessor, HierarchicalPortDummySizeProcessor and NodePlacementRepeater.
// The Java is the spec; this program only CALLS ELK APIs (reflection where a member is private) and records results;
// it embeds no ELK implementation.
// Run: tools/vectors/layered-placement-vectors.sh <outDir>
//      (java -cp ... LayeredPlacementVectors.java <outDir> <tools/vectors dir>)
//
// ORIGIN (B7: single-file launchers cannot share code): the core of this recorder is copied from
// tools/vectors/LayeredOrderVectors.java (mission 7c, which was itself copied from LayeredPhaseVectors.java and
// LayeredSiteVectors.java), lines 1-1,926 there: the JSON helpers (Raw, json, write, hex, str), the LGraph Dump class,
// the C4 Encoder and decode, importGraph/normalise/Base/phaseDump, the step interpreter, the row machinery (Spec,
// execute, buildRow), strictNumbers and strictParse, the row timeout, the model file and level machinery, the 7b
// seeded-position configurator and the ELK JSON builders up to gj. The 7c scenario builders and its sweep mode are not
// copied (the sweep of this mission is N10, a later task). The row format, the positional paths, the C4 values, the
// refusal rule, the BFS guard and the re-run / build-twice / strict-parse / 5 MB checks are 7c's and are described in
// the header of LayeredOrderVectors.java; what follows is what this recorder adds or changes.
//
// Output <outDir>/layered-placement.json (2-space top level, one compact JSON row per line, trailing newline):
//   { jdk, oracle, rowCounts: { models, scenarios, sites }, rows: [row...] }
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable; groups in order
//   models, scenarios, sites. steps null = pipeline row, else step row. Flat levels only (C3): a nested LGraph, a row
//   with RANDOM_SEED 0 or an exception thrown by a step stops the recording.
//
// Stops (pipeline rows; ElkLayered.prepareLayoutTest, then the plan is walked with runLayoutTestStep):
//   "P1" / "P2" / "P3" / "P4" = the configured phase (for P4 the class NodePlacementStrategy.<S>.create() returns, named
//   "P4_NODE_PLACEMENT/<S>" in the prefix), else an IntermediateProcessorStrategy member. A stop the assembled plan does
//   not contain skips the row (counted on stderr): e.g. HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR without external ports,
//   NODE_PLACEMENT_REPEATER without GraphConfigurator.java:335-338 (a node has a flexibility and the graph HAS the
//   recomputeNodePlacement property, an IProperty<NodePlacementStrategy>, NodePlacementRepeater.java:46).
// Allowed prefix members: the 7b ten (SEVEN_B), the 7c ten (SEVEN_C), the 7d five (SEVEN_D: INNERMOST_NODE_MARGIN_CALCULATOR,
//   LABEL_AND_NODE_SIZE_PROCESSOR, IN_LAYER_CONSTRAINT_PROCESSOR, HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR,
//   NODE_PLACEMENT_REPEATER) and the P1-P4 phases. REFUSAL RULE (N1, amends C2): any other member makes the recorder
//   exit 1 naming the row, unless the row is a models row listed in ACCEPTED_REFUSALS ("<model>/<target or root>/<first
//   refused member>") whose member is one of REFUSAL_CATEGORIES (7c's five before-P3 members and the N1 list: labels,
//   COMMENT_NODE_MARGIN_CALCULATOR, ALTERNATING_LAYER_UNZIPPER (7f), HYPEREDGE_DUMMY_MERGER (7e), SELF_LOOP_PORT_RESTORER,
//   SELF_LOOP_ROUTER, SINGLE_EDGE_GRAPH_WRAPPER, BREAKING_POINT_PROCESSOR (7g)); the rows of that level are not recorded.
//   The step ops are 7c's; runProcessor accepts SEVEN_B, SEVEN_C and SEVEN_D members and runPhase also
//   "P4_NODE_PLACEMENT" with a NodePlacementStrategy.
//
// expected = 7c's order expected { layers, layerless, hidden, edges, ports, changed } (+ dump on step rows under ten
//   nodes, FULL_DUMP_BELOW) plus
//   geometry: { nodes: { "<node path>": { pos: [x, y], size: [w, h], margin: [top, right, bottom, left] } },
//               layers: [[w, h]], ports?: { "<port path>": { pos: [x, y] } }, labels?: { "<label path>": { pos: [x, y] } } }
//   all doubles as 16 hex digits of the raw bits. nodes = every node of the traversal (layered or layerless, hidden
//   baseline nodes last); layers = Layer.getSize() of the root LGraph's layers in layer order. ports and labels (N3
//   presence rule) are PRESENT only when the stop is LABEL_AND_NODE_SIZE_PROCESSOR or
//   HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR, or the imported graph holds a node with NodeFlexibility.getNodeFlexibility(n)
//   != NONE (NodeFlexibility.java:84); otherwise the keys are ABSENT, not empty. The stop of a step row is its last
//   runProcessor member, else its last runPhase; "holds a flexible node" is sticky over the steps (evaluated after the
//   import and after every step, so NodePlacementRepeater resetting the options does not hide it). Ports are every port
//   of the traversal (same order as expected.ports), labels the baseline LLabels (by path).
//
// Rows. models/<model>/<target or root>/<stop>/<variant>: every vendored model at every edge-bearing hierarchy level.
//   P4 x NodePlacementStrategy {SIMPLE, INTERACTIVE, LINEAR_SEGMENTS, BRANDES_KOEPF, NETWORK_SIMPLEX} at default options
//   (variant = the strategy name); the processor stops INNERMOST_NODE_MARGIN_CALCULATOR, LABEL_AND_NODE_SIZE_PROCESSOR,
//   IN_LAYER_CONSTRAINT_PROCESSOR, HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR (variant default); on the variant set (N2:
//   the three smallest flattened ptolemy models and every vendored .elkt; TRIMMED here, see below) also P4 with
//   bk.edgeStraightening {NONE, IMPROVE_STRAIGHTNESS} x bk.fixedAlignment {NONE, LEFTUP, LEFTDOWN,
//   RIGHTUP, RIGHTDOWN, BALANCED} (variant bk-<straightening>-<alignment>), favorStraightEdges = false for
//   BRANDES_KOEPF and NETWORK_SIMPLEX (the default is true: the router is ORTHOGONAL, GraphConfigurator.java:124-128),
//   linearSegments.deflectionDampening = 0.7 (default 0.3) for LINEAR_SEGMENTS, and networkSimplex.nodeFlexibility.default
//   {PORT_POSITION, NODE_SIZE_WHERE_SPACE_PERMITS, NODE_SIZE} (variant flex-<value>) each with
//   recomputeNodePlacement = NETWORK_SIMPLEX (flex-<value>-recompute; stops P4 and NODE_PLACEMENT_REPEATER).
//   TRIMMING (N3, 5 MB). The mandated rows (the five strategies and the processor stops on every level of the 77 .elkt
//   and 9 ptolemy models, ~3.5 MB, plus the scenarios, ~1.15 MB) leave ~0.5 MB; the variant families of the whole
//   variant set measured ~12 MB (BK matrix 4.3, flexibility 3.7, favorStraightEdges 0.7, deflection 0.4, per family
//   over the .elkt models too). The variant set is therefore the three ptolemy models plus VARIANT_EXTRA (two
//   flexible_ports models and one bk/classes model), all families kept on them; no other .elkt model has variant rows.
//   T11 (the site rows needed the headroom) restricted the BK matrix to BK_MATRIX_MODELS (ptolemy-producer and the bk/classes
//   model): the two flexible_ports models keep every other family but have no bk-<straightening>-<alignment> rows.
//   The scenarios group carries the full matrices (bk-matrix, flexibility, repeater) on small graphs.
//   INTERACTIVE rows take the model with the seeded node positions of the 7b / 7c configurator (every node of the
//   hierarchy, x or y 0 becomes java.util.Random(0).nextInt(10000), breadth-first; BasicNodePlacementTest has no
//   position configurator, its two INTERACTIVE_* constants are unused).
//   scenarios/<class>/<name>: inline graphs (the ELK JSON export, as in 7c), steps importGraph, normalise, P1 GREEDY,
//   P2 NETWORK_SIMPLEX, P3 LAYER_SWEEP, the before-P4 processors a pipeline runs in IntermediateProcessorStrategy order
//   (IntermediateProcessorStrategy.java:94-132), then runPhase P4_NODE_PLACEMENT <S> or runProcessor <X>, and a dump.
//   Scenario options live in the graph's layoutOptions (no setProperty step), so that PLACEMENT_CROSSCHECK=1 can run the
//   same graph as a pipeline row and compare layers, ports, edges and geometry with the step row (a scenario whose
//   chain is not the plan's is a recorder bug).
//   sites/<class>/<name>[/<variant>]: one step row per S scenario of plans/layered-node-placement/unreached.md (N11, T11),
//   built like the scenarios (siteScenarios). The chain of a site row may omit processors on purpose (documented at
//   siteScenarios): S1 omits HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR and TWO_SIDED_GREEDY_SWITCH (flag x), the P3 INTERACTIVE
//   rows omit the greedy switch the pipeline omits; PLACEMENT_CROSSCHECK=1 therefore only holds for the other site rows.
//
// Identity hashes: as in 7c, the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 so identity-
//   hashed collections iterate in insertion order (AD-10; up to 10 entries, then HashMap treeifies); main fails when
//   the flag is missing. AUDIT of the 7d classes (N7): BKCompactor.sinkNodes (a HashMap<LNode, ClassNode>) is
//   iterated at BKCompactor.java:341 and :378; both loops are order independent (the first seeds a longest-path queue
//   whose min/max fix point does not depend on the order, the second assigns one slot per node). BKNodePlacer.markedEdges,
//   ThresholdStrategy.blockFinished, NetworkSimplexPlacer.portMap and flexibleWhereSpacePermitsEdges are membership-only;
//   BKNodePlacer.getBlocks / getClasses use LinkedHashMap / LinkedHashSet. The 7b BFS guard stays for P1 BFS_NODE_ORDER,
//   which no recorded row uses.
//
// Diagnosis aids (environment, output unchanged when unset): PLACEMENT_FILTER=<text> builds only rows whose id contains
//   the text (no coverage check, one build); PLACEMENT_DISCOVER=1 prints refusals instead of stopping;
//   PLACEMENT_MARKERS=1 writes a "ROW <id>" line to stdout per row; PHASE_TRACE=1 one stderr line per row;
//   PLACEMENT_CROSSCHECK=1 verifies the scenario chains against the pipeline (see scenarios above); PLACEMENT_STATS=1
//   prints the bytes per row family; PLACEMENT_CAP_MB=<n> raises the size cap for a measuring run (never for the ref).
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
import org.eclipse.elk.alg.layered.options.EdgeStraighteningStrategy;
import org.eclipse.elk.alg.layered.options.FixedAlignment;
import org.eclipse.elk.alg.layered.options.NodeFlexibility;
import org.eclipse.elk.alg.layered.options.NodePlacementStrategy;
import org.eclipse.elk.alg.layered.options.NodePromotionStrategy;
import org.eclipse.elk.alg.layered.options.OrderingStrategy;
import org.eclipse.elk.alg.layered.p3order.LayerSweepCrossingMinimizer;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.core.util.IElkProgressMonitor;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.ElkPort;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;


public class LayeredPlacementVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "layered-placement.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String REPO_PREFIX = "repo:";
    static final String PTOLEMY = "test/golden/inputs/realworld/ptolemy/";
    static final String LAYERED_TESTS = "test/golden/inputs/tests/layered/";
    static final String TICKETS = "test/golden/inputs/tickets/layered/";
    static final int MAX_DEPTH = 8;
    static final int FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = (System.getenv("PLACEMENT_CAP_MB") == null ? 16L : parseLongArg("PLACEMENT_CAP_MB", System.getenv("PLACEMENT_CAP_MB"))) * 1024 * 1024; // PLACEMENT_CAP_MB: diagnosis aid, the committed output stays under 16 MiB (raised from 5 MB on 2026-11-03)
    static final String BASE_GRAPH = "g0";
    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING", P3 = "P3_NODE_ORDERING", P4 = "P4_NODE_PLACEMENT";
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings");
    /**
     * Refusals (N1, amends B4/C2) the recorder accepts, "<model id>/<target or root>/<member>": the level's imported graph
     * makes ElkLayered add a processor of a later mission (7e hyperedges, 7f label dummies, comments and label
     * processors, 7g self loops, wrapping and breaking points, direction) to the prefix, so its rows cannot be replayed
     * by the 7b, 7c and 7d sets and are not recorded. The member is the first refused processor of the prefix. Any other
     * refusal exits 1.
     */
    static final Set<String> ACCEPTED_REFUSALS = Set.of(
            "node_placement-KIPRA-1426-demo2-KIPRA-1426/root/COMMENT_PREPROCESSOR",
            "node_placement-bk-edge_length-edge_length_space_above/root/HYPEREDGE_DUMMY_MERGER",
            "node_placement-bk-edge_length-edge_length_space_below/root/HYPEREDGE_DUMMY_MERGER",
            "partitioning-withEdgeLabels/root/LABEL_DUMMY_INSERTER",
            "preserve_order-backwardsEdges/root/LABEL_DUMMY_INSERTER",
            "preserve_order-dummyNodeNoConnectedNode/root/LABEL_DUMMY_INSERTER",
            "preserve_order-dummyNodeNoConnectingNode2/root/LABEL_DUMMY_INSERTER",
            "preserve_order-longConflictingExample/root/LABEL_DUMMY_INSERTER",
            "preserve_order-noCrossings/root/LABEL_DUMMY_INSERTER",
            "preserve_order-nodeBetweenDummies/root/LABEL_DUMMY_INSERTER",
            "preserve_order-oneCrossing/root/LABEL_DUMMY_INSERTER",
            "preserve_order-sameTargetTogether/root/LABEL_DUMMY_INSERTER",
            "preserve_order-sameTargetTogether2/root/LABEL_DUMMY_INSERTER",
            "preserve_order-simpleConflictingExample/root/LABEL_DUMMY_INSERTER",
            "preserve_order-simpleLongEdges01/root/LABEL_DUMMY_INSERTER",
            "preserve_order-simpleLongEdges02/root/LABEL_DUMMY_INSERTER",
            "preserve_order-smallExample/root/LABEL_DUMMY_INSERTER",
            "preserve_order-timedAutomaton/root/LABEL_DUMMY_INSERTER",
            "preserve_order-timedAutomatonMoreEdges/root/LABEL_DUMMY_INSERTER",
            "ptolemy-checkexecutiontimeconstraints/N1/HYPEREDGE_DUMMY_MERGER",
            "ptolemy-checkexecutiontimeconstraints/root/HYPEREDGE_DUMMY_MERGER",
            "ptolemy-htvq4/root/HYPEREDGE_DUMMY_MERGER",
            "ptolemy-levelcrossingdetector/root/HYPEREDGE_DUMMY_MERGER",
            "ptolemy-multicoreexecution/root/HYPEREDGE_DUMMY_MERGER",
            "ptolemy-randomwalk/root/HYPEREDGE_DUMMY_MERGER",
            "ptolemy-router/root/HYPEREDGE_DUMMY_MERGER",
            "ptolemy-sinewaveoptimization/N1/SELF_LOOP_PREPROCESSOR",
            "ptolemy-sinewaveoptimization/N7/HYPEREDGE_DUMMY_MERGER",
            "ptolemy-thalesdynamicmodalmodelpn/root/HYPEREDGE_DUMMY_MERGER",
            "ticket-528-nodeEdgeOverlap/A/HYPEREDGE_DUMMY_MERGER",
            "ticket-528-violatedNodeOrder/root/HYPEREDGE_DUMMY_MERGER",
            "ticket-600/N1/HYPEREDGE_DUMMY_MERGER");
    /** The refusal categories N1 allows (the members the recorder refuses). */
    static final Set<String> REFUSAL_CATEGORIES = Set.of("LABEL_DUMMY_INSERTER", "COMMENT_PREPROCESSOR",
            "DIRECTION_PREPROCESSOR", "SELF_LOOP_PREPROCESSOR", "BREAKING_POINT_INSERTER", "LABEL_DUMMY_SWITCHER",
            "LABEL_SIDE_SELECTOR", "END_LABEL_PREPROCESSOR", "CENTER_LABEL_MANAGEMENT_PROCESSOR",
            "END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR", "COMMENT_NODE_MARGIN_CALCULATOR", "ALTERNATING_LAYER_UNZIPPER",
            "HYPEREDGE_DUMMY_MERGER", "SELF_LOOP_PORT_RESTORER", "SELF_LOOP_ROUTER", "SINGLE_EDGE_GRAPH_WRAPPER",
            "BREAKING_POINT_PROCESSOR");
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
""";

    // ------------------------------------------------------------------------------------------------------------
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
                m.put(entry.getKey().getId(), enc.encode(entry.getValue(), 0));
            }
            return m;
        }

        Object adapterNode(LNode n) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(n));
            m.put("size", pair(n.getSize()));
            m.put("margin", margin(n.getMargin()));
            m.put("padding", quad(n.getPadding().top, n.getPadding().right, n.getPadding().bottom, n.getPadding().left));
            List<Object> ports = new ArrayList<>();
            for (LPort p : n.getPorts()) {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("path", paths.get(p));
                pm.put("pos", pair(p.getPosition()));
                pm.put("size", pair(p.getSize()));
                pm.put("labels", geometries(p.getLabels()));
                ports.add(pm);
            }
            m.put("ports", ports);
            m.put("labels", geometries(n.getLabels()));
            return m;
        }

        private List<Object> geometries(List<LLabel> labels) {
            List<Object> l = new ArrayList<>();
            for (LLabel label : labels) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("path", paths.get(label));
                m.put("pos", pair(label.getPosition()));
                m.put("size", pair(label.getSize()));
                l.add(m);
            }
            return l;
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
    // ------------------------------------------------------------------------------------------------------------
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
                    items.sort(Comparator.comparing(LayeredPlacementVectors::json));
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
    // ------------------------------------------------------------------------------------------------------------
    // Steps


    // ------------------------------------------------------------------------------------------------------------
    // Properties and C4 decoding

    static final Map<String, IProperty<?>> BY_ID = new TreeMap<>();
    static final Map<String, IProperty<?>> BY_NAME = new TreeMap<>();
    static final String[] OPTION_PACKAGES = {"org.eclipse.elk.alg.layered.options.", "org.eclipse.elk.core.options."};

    static void discoverProperties() throws ReflectiveOperationException {
        for (Class<?> k : List.of(LayeredOptions.class, CoreOptions.class, InternalProperties.class,
                LabelManagementOptions.class)) {
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

    static Map<String, Object> I(int i) {
        return tv("int", i);
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
        if (c4 instanceof List<?> l) { return l.stream().map(LayeredPlacementVectors::decode).toList(); } // T11: a list value (the in-layer successor constraints)
        if (c4 instanceof Map<?, ?> r && r.containsKey("ref")) { return CURRENT.element((String) r.get("ref")); } // T11: {ref} = the LGraph element at that path
        if (!(c4 instanceof Map<?, ?> m)) {
            throw new Bug("cannot decode C4 value " + c4);
        }
        String t = (String) m.get("t");
        Object v = m.get("v");
        switch (t) {
            case "bool":
                return (Boolean) v;
            case "int":
                return ((Number) v).intValue();
            case "string":
                return (String) v;
            case "double":
                return parseDoubleArg("property value", (String) v);
            case "enum":
                for (String pkg : OPTION_PACKAGES) {
                    try {
                        return Enum.valueOf((Class<? extends Enum>) Class.forName(pkg + m.get("c")), (String) m.get("n"));
                    } catch (ClassNotFoundException e) {
                        // try the next package
                    }
                }
                throw new Bug("unknown enum type " + m.get("c"));
            default:
                throw new Bug("unsupported C4 type " + t);
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

    // ------------------------------------------------------------------------------------------------------------
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

    /**
     * Gson's lenient writer emits non-finite doubles as bare tokens, which is not JSON. In number-token positions
     * (after ':', ',' or '[', outside strings) Infinity, -Infinity and NaN become the strings "Infinity", "-Infinity"
     * and "NaN".
     */
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

    // ------------------------------------------------------------------------------------------------------------
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
        m.put("geometry", geometry(b, paths, nodes, ports));
        return m;
    }

    /** N3: node geometry for every node of the traversal, the layer sizes, and (presence rule) port and label positions. */
    static Map<String, Object> geometry(Base b, Map<Object, String> paths, List<LNode> nodes, List<LPort> ports) {
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
        return geo;
    }

    static List<Object> changed(Base b, Map<Object, String> paths, List<LNode> nodes, List<LPort> ports,
            List<LEdge> edges) {
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

    // ------------------------------------------------------------------------------------------------------------
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

    static Base need(Base base) {
        if (base == null) {
            throw new IllegalStateException("step ran before importGraph created the Base");
        }
        return base;
    }

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
                    need(base).snapshot();
                }
                case "setProperty" -> setProperty(need(base).element((String) s.get(1)), (String) s.get(2), s.get(3));
                case "layers" -> layers(graph, base, (List<Object>) s.get(1));
                case "reverseEdge" -> ((LEdge) need(base).element((String) s.get(1))).reverse(graph, true);
                case "runProcessor" -> {
                    runProcessor(graph, (String) s.get(1));
                    need(base).stop = (String) s.get(1);
                }
                case "runPhase" -> {
                    runPhase(graph, (String) s.get(1), (String) s.get(2));
                    need(base).stop = (String) s.get(1);
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
        if (!SEVEN_B.contains(member) && !SEVEN_C.contains(member) && !SEVEN_D.contains(member)) {
            throw new Bug("processor " + member + " is outside the 7b, 7c and 7d sets");
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
            default -> throw new Bug("unknown phase " + phase);
        }
        RAN.add(phase + "/" + strategy);
    }


    // ------------------------------------------------------------------------------------------------------------
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

    /**
     * The recorded name of a processor of the assembled algorithm: an IntermediateProcessorStrategy member, or
     * "P<n>_<PHASE>/<STRATEGY>". The two greedy switch arms and the LAYER_SWEEP / MEDIAN_LAYER_SWEEP phases are all
     * LayerSweepCrossingMinimizer instances (IntermediateProcessorStrategy.java:316-317, :361-362,
     * CrossingMinimizationStrategy.java:67-71) told apart by their CrossMinType.
     */
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
        if (names.size() != 1) {
            throw new Bug("row " + currentRow + ": processor class " + processor.getClass().getName() + " has names "
                    + names);
        }
        return names.get(0);
    }

    static boolean allowed(String name) {
        return SEVEN_B.contains(name) || SEVEN_C.contains(name) || SEVEN_D.contains(name) || name.startsWith(P1 + "/")
                || name.startsWith(P2 + "/") || name.startsWith(P3 + "/") || name.startsWith(P4 + "/");
    }

    /** The name of the processor a row stops after: "P1", "P2", "P3" (the configured phase) or a processor member. */
    static String stopName(String stop, LGraph g) {
        return switch (stop) {
            case "P1" -> P1 + "/" + g.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY).name();
            case "P2" -> P2 + "/" + g.getProperty(LayeredOptions.LAYERING_STRATEGY).name();
            case "P3" -> P3 + "/" + g.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY).name();
            case "P4" -> P4 + "/" + g.getProperty(LayeredOptions.NODE_PLACEMENT_STRATEGY).name();
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
                throw new Refusal("row " + s.id + ": prefix names " + name + ", outside the 7b, 7c and 7d sets", (String) name);
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

    // ------------------------------------------------------------------------------------------------------------
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


    // ------------------------------------------------------------------------------------------------------------
    // Group models (C3, B5)

    record ModelFile(String id, String rel, boolean flattened, String kind) { }

    static final String KIND_PTOLEMY = "ptolemy", KIND_ELKT = "elkt";

    /** The 22 vendored tests/layered/node_placement models (7d). */
    static final List<String> NODE_PLACEMENT_FILES = List.of(
            "KIPRA-1426/demo2-KIPRA-1426.elkt",
            "bk/classes/classes.elkt",
            "bk/classes/classes_leftdown.elkt",
            "bk/classes/classes_leftup.elkt",
            "bk/classes/classes_rightdown.elkt",
            "bk/classes/classes_rightup.elkt",
            "bk/classes/classes_two_leftdown.elkt",
            "bk/classes/classes_two_leftup.elkt",
            "bk/classes/classes_two_rightdown.elkt",
            "bk/classes/classes_two_rightdown_surrounded.elkt",
            "bk/classes/classes_two_rightup.elkt",
            "bk/classes/classes_two_samesize.elkt",
            "bk/edge_length/edge_length_space_above.elkt",
            "bk/edge_length/edge_length_space_below.elkt",
            "bk/straightness/severalEdges.elkt",
            "bk/straightness/straightEdgesLeft.elkt",
            "bk/straightness/straightEdgesRight.elkt",
            "compact/unbalanced.elkt",
            "flexible_ports/graph01.elkt",
            "flexible_ports/graph02.elkt",
            "flexible_ports/graph03.elkt",
            "flexible_ports/graph04.elkt");

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
            files.add(new ModelFile("layer_constraints-" + n, LAYERED_TESTS + "layer_constraints/" + n + ".elkt", false,
                    KIND_ELKT));
        }
        files.add(new ModelFile("ticket-600", TICKETS + "600_outgoingEdgeInLastSeparateNode.elkt", false, KIND_ELKT));
        for (String n : List.of("nonConsecutivePartitions", "partitions01", "partitions02", "withEdgeLabels")) {
            files.add(new ModelFile("partitioning-" + n, LAYERED_TESTS + "partitioning/" + n + ".elkt", false, KIND_ELKT));
        }
        files.add(new ModelFile("ticket-656", TICKETS + "656_brokenLayoutPartitions.elkt", false, KIND_ELKT));
        files.add(new ModelFile("ticket-528-nodeEdgeOverlap", TICKETS + "528_nodeEdgeOverlap.elkt", false, KIND_ELKT));
        files.add(new ModelFile("ticket-528-violatedNodeOrder", TICKETS + "528_violatedNodeOrder.elkt", false, KIND_ELKT));
        for (String n : List.of("linear_segments_cycle", "north_multiple", "north_south_fixed_side", "nsp1", "nsp2", "nsp3",
                "south_multiple")) {
            files.add(new ModelFile("north_south_ports-" + n, LAYERED_TESTS + "north_south_ports/" + n + ".elkt", false,
                    KIND_ELKT));
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

    /**
     * The seeded-position configurator of the Java layered tests (BasicLayerAssignmentTest / BasicCycleBreakerTest
     * style, copied from the 7b recorder's interactiveConfigurator): every node of the hierarchy gets the strategy and
     * a random coordinate (java.util.Random(0).nextInt(maxPos)) where x or y is 0. BasicCrossingMinimizationTest
     * has no such configurator; INTERACTIVE crossing minimization reads the same node positions
     * (InteractiveCrossingMinimizer.java:99-112), so the 7b rule applies (C4).
     */
    @SuppressWarnings({"unchecked", "rawtypes"})
    static void interactiveConfigurator(ElkNode graph, IProperty strategy, Object value, int maxPos) {
        Deque<ElkNode> queue = new LinkedList<>();
        queue.add(graph);
        Random rand = new Random(0);
        while (!queue.isEmpty()) {
            ElkNode node = queue.poll();
            queue.addAll(node.getChildren());
            node.setProperty(strategy, value);
            if (node.getX() == 0) {
                node.setX(rand.nextInt(maxPos));
            }
            if (node.getY() == 0) {
                node.setY(rand.nextInt(maxPos));
            }
        }
    }

    static final int SEED_MAX_POS = 10_000;

    /**
     * SemiInteractiveCrossMinProcessor sorts the nodes of a layer by the position OPTION of the node
     * (SemiInteractiveCrossMinProcessor.java:62-71, LayeredOptions.POSITION), not by its geometry: after the seeding,
     * every node without the option gets POSITION = (x, y) of its geometry.
     */
    static void positionOptionFromGeometry(ElkNode graph) {
        Deque<ElkNode> queue = new LinkedList<>(graph.getChildren());
        while (!queue.isEmpty()) {
            ElkNode node = queue.poll();
            queue.addAll(node.getChildren());
            if (!node.hasProperty(CoreOptions.POSITION)) {
                node.setProperty(CoreOptions.POSITION, new KVector(node.getX(), node.getY()));
            }
        }
    }

    static String levelName(String target) {
        return target == null ? "root" : target;
    }

    static Spec pipeline(ModelFile f, String target, String stop, String variant, TreeMap<String, Object> options) {
        return new Spec("models/" + f.id + "/" + levelName(target) + "/" + stop + "/" + variant, "models", f.rel, null, target,
                options, stop, null);
    }


    // ------------------------------------------------------------------------------------------------------------
    // Group models (N2): strategy rows, processor stops and the variant set

    static final String P4S = "P4";
    static final String ILC = "IN_LAYER_CONSTRAINT_PROCESSOR", LANS = "LABEL_AND_NODE_SIZE_PROCESSOR",
            INMC = "INNERMOST_NODE_MARGIN_CALCULATOR", HPDS = "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR",
            NPR = "NODE_PLACEMENT_REPEATER";
    static final String NODE_PLACEMENT_STRATEGY = "NODE_PLACEMENT_STRATEGY", BK_STRAIGHTENING = "NODE_PLACEMENT_BK_EDGE_STRAIGHTENING",
            BK_ALIGNMENT = "NODE_PLACEMENT_BK_FIXED_ALIGNMENT", FAVOR_STRAIGHT = "NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES",
            DEFLECTION = "NODE_PLACEMENT_LINEAR_SEGMENTS_DEFLECTION_DAMPENING",
            FLEX_DEFAULT = "NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT",
            FLEX_NODE = "NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY",
            FLEX_RECOMPUTE = "NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_RECOMPUTE_NODE_PLACEMENT";
    static final double DEFLECTION_NON_DEFAULT = 0.7;

    /** Options of a P4 row: the strategy plus pairs of (Java constant name, C4 value). */
    static TreeMap<String, Object> placement(NodePlacementStrategy s, Object... kv) {
        Object[] all = new Object[kv.length + 2];
        all[0] = NODE_PLACEMENT_STRATEGY;
        all[1] = E("NodePlacementStrategy", s);
        System.arraycopy(kv, 0, all, 2, kv.length);
        return opts(all);
    }

    /** A row whose input is the model with the seeded node positions (INTERACTIVE node placement, N2). */
    static Spec seeded(ModelFile f, String target, String variant) {
        Supplier<ElkNode> prepare = () -> {
            ElkNode root = loadFile(f.rel);
            interactiveConfigurator(root, LayeredOptions.NODE_PLACEMENT_STRATEGY, NodePlacementStrategy.INTERACTIVE,
                    SEED_MAX_POS);
            return root;
        };
        return new Spec("models/" + f.id + "/" + levelName(target) + "/" + P4S + "/" + variant, "models", null, prepare, target,
                placement(NodePlacementStrategy.INTERACTIVE), P4S, null);
    }

    static void variantRows(List<Spec> out, ModelFile f, Level level) {
        String t = level.target;
        for (EdgeStraighteningStrategy es : BK_MATRIX_MODELS.contains(f.id) ? EdgeStraighteningStrategy.values() : new EdgeStraighteningStrategy[0]) {
            for (FixedAlignment fa : FixedAlignment.values()) {
                out.add(pipeline(f, t, P4S, "bk-" + es.name() + "-" + fa.name(), placement(NodePlacementStrategy.BRANDES_KOEPF,
                        BK_STRAIGHTENING, E("EdgeStraighteningStrategy", es), BK_ALIGNMENT, E("FixedAlignment", fa))));
            }
        }
        for (NodePlacementStrategy s : List.of(NodePlacementStrategy.BRANDES_KOEPF, NodePlacementStrategy.NETWORK_SIMPLEX)) {
            out.add(pipeline(f, t, P4S, "favor-straight-edges-false-" + s.name(), placement(s, FAVOR_STRAIGHT, Z(false))));
        }
        out.add(pipeline(f, t, P4S, "deflection-dampening-0.7", placement(NodePlacementStrategy.LINEAR_SEGMENTS, DEFLECTION,
                D(DEFLECTION_NON_DEFAULT))));
        for (NodeFlexibility nf : NodeFlexibility.values()) {
            if (nf == NodeFlexibility.NONE) {
                continue;
            }
            out.add(pipeline(f, t, P4S, "flex-" + nf.name(), placement(NodePlacementStrategy.NETWORK_SIMPLEX, FLEX_DEFAULT,
                    E("NodeFlexibility", nf))));
            TreeMap<String, Object> recompute = placement(NodePlacementStrategy.NETWORK_SIMPLEX, FLEX_DEFAULT,
                    E("NodeFlexibility", nf), FLEX_RECOMPUTE, E("NodePlacementStrategy", NodePlacementStrategy.NETWORK_SIMPLEX));
            out.add(pipeline(f, t, P4S, "flex-" + nf.name() + "-recompute", recompute));
            out.add(pipeline(f, t, NPR, "flex-" + nf.name() + "-recompute", recompute));
        }
    }

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
                for (NodePlacementStrategy s : NodePlacementStrategy.values()) {
                    out.add(s == NodePlacementStrategy.INTERACTIVE ? seeded(f, lv.target, s.name())
                            : pipeline(f, lv.target, P4S, s.name(), placement(s)));
                }
                for (String p : List.of(INMC, LANS, ILC, HPDS)) {
                    out.add(pipeline(f, lv.target, p, "default", opts()));
                }
                if (smallest.contains(f) || VARIANT_EXTRA.contains(f.id)) {
                    variantRows(out, f, lv);
                }
            }
        }
    }

    /**
     * The variant set is the three smallest flattened ptolemy models plus these .elkt models. TRIMMING (N3, 5 MB): the
     * mandated rows (five strategies and the processor stops on every level of every model, plus the scenarios) take
     * about 4.7 MB; one variant level costs 20-95 KB, so the variant set was trimmed from "every vendored .elkt" to the
     * ptolemy models only, with the extras listed here (see the header: the BK matrix, favorStraightEdges, the
     * deflection dampening and the flexibility families each dropped for the other .elkt models).
     */
    /** TRIMMING (T11, 5 MB): the BK straightening x alignment matrix runs on these two variant models only (the site rows need the headroom). */
    static final Set<String> BK_MATRIX_MODELS = Set.of("ptolemy-producer", "node_placement-bk-classes-classes_leftdown");
    static final Set<String> VARIANT_EXTRA = Set.of("node_placement-flexible_ports-graph01", "node_placement-flexible_ports-graph03",
            "node_placement-bk-classes-classes_leftdown");

    // Group scenarios: ELK JSON builders

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
            sb.append(i == 0 ? "" : ",").append(nodeJson("n" + i, pos == null ? null : pos[i],
                    nodeOpts == null ? null : nodeOpts.get(i), null));
        }
        return sb.append("],\"edges\":[").append(edgesJson("e", edges)).append("]}").toString();
    }

    static List<Spec> SCENARIOS;

    static String nds(String prefix, int n, double[][] pos, double[][] sizes, String... o) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            String node = nodeJson(prefix + i, pos == null ? null : pos[i], i < o.length ? o[i] : null, null);
            out.add(sizes == null ? node : node.replace("\"width\":30,\"height\":30", "\"width\":" + sizes[i][0] + ",\"height\":" + sizes[i][1]));
        }
        return String.join(",", out);
    }

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

    static String prt(String id, String side) {
        return "{\"id\":\"" + id + "\",\"width\":4,\"height\":4,\"layoutOptions\":{\"" + pid("PORT_SIDE") + "\":\"" + side + "\"}}";
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

    // ------------------------------------------------------------------------------------------------------------
    // Group scenarios (N2): one inline graph per scenario

    static final String FS = "FIXED_SIDE";
    static final String E_ = "EAST", W_ = "WEST", N_ = "NORTH", S_ = "SOUTH";

    /** A node of the given size; xy and opts (pairs of Java constant, value) may be empty. */
    static String kn(String id, int w, int h, double[] xy, String extra, String... opts) {
        return sz(nodeJson(id, xy, opts.length == 0 ? null : ropts(opts), extra), w, h);
    }

    static String sz(String node, int w, int h) {
        return node.replace("\"width\":30,\"height\":30", "\"width\":" + w + ",\"height\":" + h);
    }

    /** A port with a label of the given width on a side. */
    static String pl(String id, String side, int labelWidth) {
        return prt(id, side).replace("}}", "}" + ",\"labels\":[{\"id\":\"" + id + "l\",\"text\":\"P\",\"width\":" + labelWidth
                + ",\"height\":10}]}");
    }

    static String lab(String id, int w, int h) {
        return "{\"id\":\"" + id + "\",\"text\":\"L\",\"width\":" + w + ",\"height\":" + h + "}";
    }

    static double[] xy(boolean pos, double x, double y) {
        return pos ? new double[] {x, y} : null;
    }

    /** Six nodes of different heights with long edges (dummies). */
    static String gLong(String ro, boolean pos) {
        String kids = join(kn("n0", 30, 30, xy(pos, 0, 40), null), kn("n1", 40, 60, xy(pos, 80, 10), null),
                kn("n2", 30, 20, xy(pos, 160, 70), null), kn("n3", 50, 30, xy(pos, 240, 5), null),
                kn("n4", 30, 80, xy(pos, 320, 50), null), kn("n5", 30, 30, xy(pos, 160, 20), null));
        return flat(ro, kids, eds("n0>n1", "n1>n2", "n2>n3", "n3>n4", "n0>n3", "n0>n4", "n1>n5", "n5>n4"));
    }

    /** A fan out and in with seven nodes of different heights and one long edge. */
    static String gFan(String ro, boolean pos) {
        String kids = join(kn("n0", 30, 20, xy(pos, 0, 60), null), kn("n1", 30, 50, xy(pos, 80, 0), null),
                kn("n2", 40, 30, xy(pos, 80, 90), null), kn("n3", 30, 40, xy(pos, 80, 170), null),
                kn("n4", 30, 60, xy(pos, 160, 70), null), kn("n5", 30, 25, xy(pos, 160, 160), null),
                kn("n6", 50, 35, xy(pos, 240, 80), null));
        return flat(ro, kids, eds("n0>n1", "n0>n2", "n0>n3", "n1>n4", "n2>n4", "n3>n4", "n2>n5", "n5>n6", "n4>n6", "n0>n6"));
    }

    /** Fixed-side nodes with port labels, node labels and size constraints (margins, label placement). */
    static String gPL(String ro, String nodeOpts, boolean labels) {
        String constraints = ropts("PORT_CONSTRAINTS", "FIXED_SIDE", "NODE_SIZE_CONSTRAINTS",
                "PORTS PORT_LABELS NODE_LABELS MINIMUM_SIZE", "NODE_SIZE_MINIMUM", "(70,40)", "NODE_LABELS_PLACEMENT",
                "H_CENTER V_TOP INSIDE", "PORT_LABELS_PLACEMENT", "OUTSIDE") + (nodeOpts.isEmpty() ? "" : "," + nodeOpts);
        int lw = labels ? 24 : 0;
        String[][] ports = {{"a", "EAST EAST EAST"}, {"b", "WEST EAST"}, {"c", "WEST WEST EAST"}, {"d", "WEST WEST"}};
        List<String> kids = new ArrayList<>();
        for (String[] p : ports) {
            List<String> ps = new ArrayList<>();
            String[] sides = p[1].split(" ");
            for (int i = 0; i < sides.length; i++) {
                ps.add(labels ? pl(p[0] + ".p" + i, sides[i], lw + 6 * i) : prt(p[0] + ".p" + i, sides[i]));
            }
            String extra = "\"ports\":[" + String.join(",", ps) + "]" + (labels ? ",\"labels\":[" + lab(p[0] + "n", 30, 12) + "]" : "");
            kids.add(kn(p[0], 60, 40, null, extra).replace("\"width\":60,\"height\":40", "\"width\":60,\"height\":40,\"layoutOptions\":{"
                    + constraints + "}"));
        }
        return flat(ro, String.join(",", kids), eds("a.p0>b.p0", "a.p1>c.p0", "b.p1>c.p1", "c.p2>d.p0", "a.p2>d.p1"));
    }

    /** One node fanning out over three ports into three nodes of different heights that join again (flexibility). */
    static String gFanPorts(String ro, String nodeOpts) {
        String opts = ropts("PORT_CONSTRAINTS", "FIXED_SIDE", "NODE_SIZE_CONSTRAINTS", "PORTS MINIMUM_SIZE", "NODE_SIZE_MINIMUM",
                "(50,50)") + (nodeOpts.isEmpty() ? "" : "," + nodeOpts);
        String kids = join(
                fixed(kn("s", 40, 50, null, "\"ports\":[" + join(prt("s.p0", "EAST"), prt("s.p1", "EAST"), prt("s.p2", "EAST")) + "]"), opts),
                fixed(kn("m0", 40, 30, null, "\"ports\":[" + join(prt("m0.p0", "WEST"), prt("m0.p1", "EAST")) + "]"), opts),
                fixed(kn("m1", 40, 70, null, "\"ports\":[" + join(prt("m1.p0", "WEST"), prt("m1.p1", "EAST")) + "]"), opts),
                fixed(kn("m2", 40, 20, null, "\"ports\":[" + join(prt("m2.p0", "WEST"), prt("m2.p1", "EAST")) + "]"), opts),
                fixed(kn("t", 40, 60, null, "\"ports\":[" + join(prt("t.p0", "WEST"), prt("t.p1", "WEST"), prt("t.p2", "WEST")) + "]"), opts));
        return flat(ro, kids, eds("s.p0>m0.p0", "s.p1>m1.p0", "s.p2>m2.p0", "m0.p1>t.p0", "m1.p1>t.p1", "m2.p1>t.p2"));
    }

    /** Adds the node options to a node JSON that has none. */
    static String fixed(String node, String opts) {
        return node.replaceFirst("\"height\":(\\d+)", "\"height\":$1,\"layoutOptions\":{" + opts + "}");
    }

    static String gNorthSouth(String ro) {
        return flat(ro, join(plain("a"), pnode("b", FS, null, W_, N_, N_, S_, S_, E_), plain("c"), plain("d"), plain("e")),
                eds("a>b.p0", "a>b.p1", "b.p2>c", "b.p3>d", "a>b.p4", "b.p5>e", "c>e", "d>e", "a>e"));
    }

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

    /** The chain of a scenario: normalise, P1 GREEDY, P2 NETWORK_SIMPLEX (with the 7b layer constraint processors a pipeline always runs around them), the processors up to the stop in plan order. */
    static List<Object> chain(String flags, String stop, String target) {
        List<Object> st = new ArrayList<>(List.of(imp(target), norm(), proc("EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER"),
                phase(P1, "GREEDY"), proc("LAYER_CONSTRAINT_PREPROCESSOR"), phase(P2, "NETWORK_SIMPLEX"),
                proc("LAYER_CONSTRAINT_POSTPROCESSOR")));
        List<String> pre = new ArrayList<>();
        if (flags.contains("e") && !flags.contains("x")) { // x: HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR and TWO_SIDED_GREEDY_SWITCH omitted (it replaces the N and S dummies, and their labels, by bare ones)
            pre.add("HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR");
        }
        pre.addAll(List.of("LONG_EDGE_SPLITTER", "PORT_SIDE_PROCESSOR"));
        if (flags.contains("i")) {
            pre.add("INVERTED_PORT_PROCESSOR");
        }
        if (!flags.contains("l")) { // l: free ports only (interactive rows): the interactive minimizer asks for the sorter only with NON_FREE_PORTS
            pre.add("PORT_LIST_SORTER");
        }
        if (flags.contains("n")) {
            pre.add("NORTH_SOUTH_PORT_PREPROCESSOR");
        }
        pre.forEach(m -> st.add(proc(m)));
        st.add(phase(P3, P3S));
        List<String> post = new ArrayList<>(List.of("TWO_SIDED_GREEDY_SWITCH", ILC, LANS, INMC));
        if (flags.contains("x") || P3S.equals("INTERACTIVE")) {
            post.remove(0); // no greedy switch after the interactive minimizer; x: the greedy switch throws (NullPointerException, BetweenLayerEdgeTwoNodeCrossingsCounter.java:283) on an un-replaced N/S dummy
        }
        if (flags.contains("e")) {
            post.add(HPDS);
        }
        for (String m : post) {
            st.add(proc(m));
            if (m.equals(stop)) {
                return st;
            }
        }
        if (!stop.startsWith(P4 + "/")) {
            throw new Bug("scenario stop " + stop + " is not in the chain");
        }
        st.add(phase(P4, stop.substring(P4.length() + 1)));
        return st;
    }

    static final Map<String, String[]> CROSS = new LinkedHashMap<>();
    static String grp = "scenarios", P3S = "LAYER_SWEEP"; // group of the rows scenario() registers; the P3 strategy of chain()

    /**
     * Registers scenarios/<id>. stop = "P4_NODE_PLACEMENT/<S>" (runPhase) or a processor member; "P4_NODE_PLACEMENT/<S>+NODE_PLACEMENT_REPEATER"
     * runs the placer and then the repeater. The graph holds the strategy as a root option (so the pipeline of the
     * cross check places the same way).
     */
    static void scenario(String id, String elk, String target, String flags, String stop) {
        String main = stop.contains("+") ? stop.substring(0, stop.indexOf('+')) : stop;
        List<Object> st = chain(flags, main, target);
        if (stop.contains("+")) {
            st.add(proc(NPR));
        }
        st.add(dump());
        SCENARIOS.add(new Spec(grp + "/" + id, grp, null, () -> ElkGraphJson.forGraph(elk).toElk(), target, new TreeMap<>(),
                null, st));
        CROSS.put(grp + "/" + id, new String[] {elk, target, stop.contains("+") ? NPR : main.startsWith(P4) ? P4S : main});
    }

    static String strat(NodePlacementStrategy s, String... more) {
        String[] all = new String[more.length + 2];
        all[0] = NODE_PLACEMENT_STRATEGY;
        all[1] = s.name();
        System.arraycopy(more, 0, all, 2, more.length);
        return ropts(all);
    }

    static String p4(NodePlacementStrategy s) {
        return P4 + "/" + s.name();
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        for (NodePlacementStrategy s : NodePlacementStrategy.values()) {
            String c = "p4-" + s.name().toLowerCase(Locale.ROOT), ro = strat(s);
            boolean pos = s == NodePlacementStrategy.INTERACTIVE;
            scenario(c + "/long-edges", gLong(ro, pos), null, "", p4(s));
            scenario(c + "/fan", gFan(ro, pos), null, "", p4(s));
            scenario(c + "/port-labels", gPL(ro, "", true), null, "", p4(s));
            scenario(c + "/north-south", gNorthSouth(ro), null, "n", p4(s));
            scenario(c + "/external-chain", gExternal(ro, true), "T", "e", p4(s));
        }
        NodePlacementStrategy bk = NodePlacementStrategy.BRANDES_KOEPF;
        for (EdgeStraighteningStrategy es : EdgeStraighteningStrategy.values()) {
            for (FixedAlignment fa : FixedAlignment.values()) {
                String ro = strat(bk, "NODE_PLACEMENT_BK_EDGE_STRAIGHTENING", es.name(), "NODE_PLACEMENT_BK_FIXED_ALIGNMENT", fa.name()),
                        n = es.name().toLowerCase(Locale.ROOT) + "-" + fa.name().toLowerCase(Locale.ROOT);
                scenario("bk-matrix/long-edges-" + n, gLong(ro, false), null, "", p4(bk));
                scenario("bk-matrix/fan-" + n, gFan(ro, false), null, "", p4(bk));
            }
        }
        scenario("bk-options/favor-straight-edges-false", gLong(strat(bk, "NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES", "false"), false), null, "", p4(bk));
        scenario("p4-linear_segments/deflection-dampening", gFan(strat(NodePlacementStrategy.LINEAR_SEGMENTS,
                "NODE_PLACEMENT_LINEAR_SEGMENTS_DEFLECTION_DAMPENING", "0.7"), false), null, "", p4(NodePlacementStrategy.LINEAR_SEGMENTS));
        NodePlacementStrategy ns = NodePlacementStrategy.NETWORK_SIMPLEX;
        for (NodeFlexibility nf : NodeFlexibility.values()) {
            if (nf == NodeFlexibility.NONE) {
                continue;
            }
            String v = nf.name(), c = nf.name().toLowerCase(Locale.ROOT), rec = "NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_RECOMPUTE_NODE_PLACEMENT";
            String graphDefault = strat(ns, "NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT", v),
                    recompute = strat(ns, "NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT", v, rec, "NETWORK_SIMPLEX"),
                    nodeLevel = ropts("NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY", v);
            scenario("flexibility/graph-default-ports-" + c, gPL(graphDefault, "", true), null, "", p4(ns));
            scenario("flexibility/graph-default-fan-" + c, gFanPorts(graphDefault, ""), null, "", p4(ns));
            scenario("flexibility/node-level-ports-" + c, gPL(strat(ns), nodeLevel, true), null, "", p4(ns));
            scenario("flexibility/node-level-fan-" + c, gFanPorts(strat(ns), nodeLevel), null, "", p4(ns));
            scenario("repeater/graph-default-ports-" + c, gPL(recompute, "", true), null, "", p4(ns) + "+" + NPR);
            scenario("repeater/graph-default-fan-" + c, gFanPorts(recompute, ""), null, "", p4(ns) + "+" + NPR);
            scenario("repeater/node-level-fan-" + c, gFanPorts(strat(ns, rec, "NETWORK_SIMPLEX"), nodeLevel), null, "", p4(ns) + "+" + NPR);
        }
        scenario("margin/port-labels", gPL(strat(ns), "", true), null, "", INMC);
        scenario("margin/ports-only", gPL(strat(ns), "", false), null, "", INMC);
        scenario("margin/fan-ports", gFanPorts(strat(ns), ""), null, "", INMC);
        scenario("margin/long-edges", gLong(strat(ns), false), null, "", INMC);
        scenario("label-size/port-labels", gPL(strat(ns), "", true), null, "", LANS);
        scenario("label-size/ports-only", gPL(strat(ns), "", false), null, "", LANS);
        scenario("label-size/fan-ports", gFanPorts(strat(ns), ""), null, "", LANS);
        scenario("in-layer/north-south", gNorthSouth(strat(ns)), null, "n", ILC);
        scenario("in-layer/sides", gSides(strat(ns)), null, "ni", ILC);
        scenario("in-layer/external-chain", gExternal(strat(ns), true), "T", "e", ILC);
        scenario("port-dummy-size/external-chain", gExternal(strat(ns), true), "T", "e", HPDS);
        scenario("port-dummy-size/external-fan", gExternal(strat(ns), false), "T", "e", HPDS);
        siteScenarios();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Group sites (N11, T11): one step row per S scenario of plans/layered-node-placement/unreached.md, recorded by the
    // same interpreter and chain as the scenarios. pn = a node with ports, g3 = source / middle / target, iscenario = a
    // scenario whose P3 phase is INTERACTIVE (the node and edge positions of the graph fix the order, so a crossing can
    // be forced where the layer sweep would avoid it; the chain then omits the greedy switch the pipeline omits too).
    // Chain flags beyond chain(): x = HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR and TWO_SIDED_GREEDY_SWITCH omitted (S1: the
    // processor replaces the N and S dummies, and their labels, by bare ones; the greedy switch then throws on a N/S dummy).

    static final String FIXED_ORDER = "FIXED_ORDER", NSC = "NODE_SIZE_CONSTRAINTS", NLP = "NODE_LABELS_PLACEMENT", PLP = "PORT_LABELS_PLACEMENT",
            WSP = "NODE_SIZE_WHERE_SPACE_PERMITS", LC = "LAYERING_LAYER_CONSTRAINT", CMS = "CROSSING_MINIMIZATION_STRATEGY", EXTRA = "ex";

    /** A w x h node with ports on the sides "E W N S ..." (ids <id>.p0..), port constraints pc, optional label JSON, options kv. */
    static String pn(String id, int w, int h, String pc, String lab, String sides, String... kv) {
        List<String> ps = new ArrayList<>();
        String[] sd = sides.split(" ");
        for (int i = 0; i < sd.length; i++) {
            ps.add(prt(id + ".p" + i, switch (sd[i]) { case "E" -> E_; case "W" -> W_; case "N" -> N_; default -> S_; }));
        }
        List<String> o = new ArrayList<>(List.of("PORT_CONSTRAINTS", pc));
        o.addAll(Arrays.asList(kv));
        return kn(id, w, h, null, "\"ports\":[" + String.join(",", ps) + "]" + (lab == null ? "" : ",\"labels\":[" + lab + "]"), o.toArray(new String[0]));
    }

    /** Source s (40x120), middle m (40x20) and target t (40x60) with the given port sides and edge spec. */
    static String g3(String ro, String sS, String mS, String tS, String lab, String edges, String... mkv) {
        return flat(ro, join(pn("s", 40, 120, FS, null, sS), pn("m", 40, 20, FS, lab, mS, mkv), pn("t", 40, 60, FS, null, tS)), eds(edges.split(" ")));
    }

    /** A node with a position and, optionally, a layer constraint. */
    static String pk(String id, double x, double y, String... lc) {
        return kn(id, 30, 30, xy(true, x, y), null, lc);
    }

    static void iscenario(String id, String elk, String stop, String flags) {
        P3S = "INTERACTIVE";
        scenario(id, elk, null, flags, stop);
        P3S = "LAYER_SWEEP";
    }

    /** A labelled port of T (at x, y: decorative under FIXED_SIDE); two labels when lw2 > 0. */
    static String lp(String id, String side, double x, double y, int lw, int lw2) {
        String port = pl(id, side, lw).replace("\"height\":4,", "\"height\":4,\"x\":" + x + ",\"y\":" + y + ",");
        return lw2 == 0 ? port : port.replace("}]}", "}," + lab(id + "m", lw2, 8) + "]}");
    }

    static String anch(String elk, String port, String anchor) {
        String h = "\"id\":\"" + port + "\",\"width\":4,\"height\":4,\"layoutOptions\":{";
        return elk.replace(h, h + ropts("PORT_ANCHOR", anchor) + ",");
    }

    static void siteScenarios() {
        grp = "sites";
        NodePlacementStrategy ls = NodePlacementStrategy.LINEAR_SEGMENTS, bk = NodePlacementStrategy.BRANDES_KOEPF,
                ns = NodePlacementStrategy.NETWORK_SIMPLEX, in = NodePlacementStrategy.INTERACTIVE;
        String lsr = strat(ls), bkr = strat(bk), nsr = strat(ns), next = " NEXT_TO_PORT_IF_POSSIBLE", ungrouped = "PORT_LABELS_TREAT_AS_GROUP";
        // S1: T has labelled external ports W0 E1 N2 (two labels) S4 (connected) and W5 E6 (unconnected)
        String ports = join(lp("T.p0", W_, 0, 60, 24, 0), lp("T.p1", E_, 300, 60, 30, 0), lp("T.p2", N_, 150, 0, 20, 16), lp("T.p4", S_, 150, 200, 18, 0),
                lp("T.p5", W_, 0, 140, 22, 0), lp("T.p6", E_, 300, 140, 26, 0));
        String[][] ext = {{"outside", "OUTSIDE"}, {"fixed", ""}, {"outsideNext", "OUTSIDE" + next}, {"insideNext", "INSIDE" + next},
            {"outsideNextUngrouped", "OUTSIDE" + next}, {"insideNextUngrouped", "INSIDE" + next}};
        for (String[] e : ext) {
            String ro = e[0].endsWith("Ungrouped") ? ropts(PLP, e[1], ungrouped, "false") : ropts(PLP, e[1]);
            scenario("LabelAndNodeSize/externalPortLabels/" + e[0], hier(ro, ports, join(at("c0", 40, 40), at("c1", 90, 40), at("c2", 140, 40)),
                    eds("T.p0>c0", "c0>c1", "c1>c2", "c2>T.p1", "T.p2>c1", "c0>T.p4")), "T", EXTRA, LANS);
        }
        // S2: the long edge n0>n2 gets a dummy whose position the interactive minimizer records
        iscenario("Interactive/originalDummyPosition", flat(strat(in, CMS, "INTERACTIVE"), join(pk("n0", 0, 40), pk("n1", 80, 10), pk("n2", 160, 40), pk("n3", 80, 100)),
                eds("n0>n1", "n1>n2", "n0>n2", "n0>n3", "n3>n2")), p4(in), "l");
        // S3: the dummies of a0>t0 and a1>t1 swap order between layers 1 and 2; the chain node m1 sits below (first in layer) or above (behind a normal node) them
        for (double my : new double[] {400, -300}) {
            iscenario("LinearSegments/dependencyCycle/" + (my > 0 ? "firstInLayer" : "behindNode"), flat(strat(ls, CMS, "INTERACTIVE"), join(pk("a0", 0, 0, LC, "FIRST"),
                    pk("a1", 0, 240, LC, "FIRST"), pk("m1", 100, my), pk("m2", 200, my), pk("t0", 300, 200), pk("t1", 300, -40)), eds("a0>t0", "a1>t1", "a0>m1", "m1>m2", "m2>t0", "m2>t1")), p4(ls), "l");
        }
        // S4/S8/S12: b has a normal WEST input and EAST output, an inverted EAST input (from d) and an inverted WEST output (to e)
        String inv = join(plain("a"), pn("b", 30, 60, FS, null, "W E E W"), plain("c"), plain("d"), plain("e")), invE = eds("a>b.p0", "b.p1>c", "d>b.p2", "b.p3>e");
        scenario("LinearSegments/invertedPorts", flat(lsr, inv, invE), null, "i", p4(ls));
        scenario("NetworkSimplex/inLayerEdges", flat(nsr, inv, invE), null, "i", p4(ns));
        scenario("BK/inLayerEdges", flat(bkr, inv, invE), null, "i", p4(bk));
        // S5/S13: c has two incoming and two outgoing edges, the first of each pair with the higher priority
        String g = join(plain("a"), plain("b"), plain("c"), plain("d"), plain("e")), q = ":PRIORITY_STRAIGHTNESS=", ed = eds("a>c" + q + 1, "b>c" + q + 0, "c>d" + q + 1, "c>e" + q + 0);
        scenario("LinearSegments/straightnessPriority", flat(lsr, g, ed), null, "", p4(ls));
        scenario("BK/straightnessPriority", flat(bkr, g, ed), null, "", p4(bk));
        // S6/S7/S9: flexible nodes
        scenario("NetworkSimplex/fractionalAnchor", anch(g3(nsr, "E E", "W W E", "W", null, "s.p0>m.p0 s.p1>m.p1 m.p2>t.p0", FLEX_NODE, "PORT_POSITION"), "m.p0", "(2.0,7.5)"), null, "", p4(ns));
        for (String[] l : new String[][] {{"bottom", "V_BOTTOM"}, {"center", "V_CENTER"}, {"top", "V_TOP"}}) {
            scenario("NetworkSimplex/flexibleLabels/" + l[0], g3(nsr, "E E", "W W E N S", "W", lab("m.l", 30, 10), "s.p0>m.p0 s.p1>m.p1 m.p2>t.p0",
                    FLEX_NODE, WSP, NSC, "PORTS NODE_LABELS MINIMUM_SIZE", NLP, "H_CENTER INSIDE " + l[1]), null, "", p4(ns));
        }
        scenario("NetworkSimplex/flexiblePorts/unconnected", g3(nsr, "E", "W E E N S", "W", null, "s.p0>m.p0 m.p1>t.p0", FLEX_NODE, "PORT_POSITION"), null, "", p4(ns));
        scenario("NetworkSimplex/flexiblePorts/overflow", g3(nsr, "E E E E", "W W W W E", "W", null, "s.p0>m.p0 s.p1>m.p1 s.p2>m.p2 s.p3>m.p3 m.p4>t.p0",
                FLEX_NODE, "PORT_POSITION"), null, "", p4(ns));
        scenario("NetworkSimplex/flexiblePorts/junctionPath", flat(nsr, join(plain("s"), kn("u", 30, 30, null, null, FLEX_NODE, WSP), plain("w"), plain("x"), plain("y"), plain("z")),
                eds("s>u", "u>w", "u>x", "x>y", "y>z")), null, "", p4(ns));
        // S8/S10 (interactive positions): a WEST output without the inverted-port dummies; the two-path u-c-v cut at its left end (the walk starts at the right junction); the 3-edge path through a long edge
        String ni = strat(ns, CMS, "INTERACTIVE");
        iscenario("NetworkSimplex/inLayerEdges/westOutput", flat(ni, join(pn("s", 30, 30, FS, null, "E"), pn("a", 30, 30, FS, null, "W W"), pn("b", 30, 30, FS, null, "W")),
                eds("s.p0>a.p0", "a.p1>b.p0")), p4(ns), "");
        iscenario("NetworkSimplex/twoPaths/crossingLeftEnd", flat(ni, join(pk("u", 0, 0), pk("u2", 0, 150), pk("x", 100, -100), pk("w", 100, 0), pk("c", 100, 200), pk("y", 100, 300),
                pk("v", 200, 50)), eds("u>c", "u>x", "u>y", "u2>w", "c>v")), p4(ns), "l");
        iscenario("NetworkSimplex/twoPaths/crossingLeftEnd/longEdge", flat(ni, join(pk("p", 0, 0, LC, "FIRST"), pk("r", 0, 100, LC, "FIRST"), pk("s", 100, -50), pk("c2", 200, -50),
                pk("c3", 300, -50), pk("q", 400, 40, LC, "LAST")), eds("p>q", "r>s", "s>c2", "c2>c3")), p4(ns), "l");
        // S11: the inner segment (long edge a>t) crosses the non-inner segment n1>n2
        iscenario("BK/type1Conflict", flat(strat(bk, CMS, "INTERACTIVE"), join(pk("a", 0, 0), pk("n1", 100, -100), pk("n2", 200, 100), pk("t", 300, 0)), eds("a>n1", "a>t", "n1>n2", "n2>t")), p4(bk), "l");
        // S14: found by a random search (seed 7, row 24): a block shifted down by the post-processing holds the last node of its layer (checkSpaceBelow)
        String[] o = {NSC, "PORTS PORT_LABELS NODE_LABELS MINIMUM_SIZE", NLP, "H_CENTER V_TOP INSIDE"};
        scenario("BK/infeasible/lastInLayer", flat(strat(bk, BK_ALIGNMENT, "BALANCED"), join(pn("n0", 30, 50, FS, null, "W", o), pn("n1", 30, 30, FS, lab("n1l", 40, 14), "N", o),
                pn("n2", 30, 80, FS, lab("n2l", 40, 14), "E", o), pn("n3", 30, 50, FS, lab("n3l", 40, 14), "E W E", o), pn("n4", 30, 10, FS, lab("n4l", 40, 14), "E", o),
                pn("n5", 30, 50, FS, lab("n5l", 40, 14), "N E S", o), pn("n6", 30, 200, FS, null, "W", o)),
                eds("n2.p0>n3.p0", "n5.p2>n0.p0", "n6.p0>n3.p2", "n5.p1>n1.p0")), null, "ni", p4(bk));
        grp = "scenarios";
    }

    /** PLACEMENT_CROSSCHECK=1: every scenario run as a pipeline row must give the step row's layers, ports and geometry. */
    @SuppressWarnings("unchecked")
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
                if (FILTER != null) {
                    System.err.println("pipeline prefix of " + s.id + ": " + r.prefix + "\nsteps " + json(s.steps));
                }
            } catch (RuntimeException e) {
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

    // ------------------------------------------------------------------------------------------------------------
    // Sweep and dump modes (mission 7d, T10, N10, B6): the breadth of the Java tests over every ptolemy model, hashed.
    // The recording path is untouched; main branches here only when the first argument starts with "--". The canonical
    // form, the line format and the diagnosis flow are 7c's (OrderSweep in tools/vectors/LayeredOrderVectors.java,
    // copied here: single-file launchers share no code), extended with N3's geometry.
    //   LayeredPlacementVectors.java --sweep <modelsDir> <outDir>            writes <outDir>/results.jsonl
    //   LayeredPlacementVectors.java --dump <case id> <modelsDir> <outDir>   writes the full row of one case
    // Every realworld/ptolemy/**.json under <modelsDir>, every level levels() would record (an ElkNode with children,
    // the root as null; levels whose flat import has no edge are skipped and counted), every NodePlacementStrategy
    // (SIMPLE, INTERACTIVE, LINEAR_SEGMENTS, BRANDES_KOEPF, NETWORK_SIMPLEX; stop P4, default options of the stop,
    // SEPARATE_CONNECTED_COMPONENTS=false) is one pipeline row built by runPipeline (the recording path, untouched).
    // One line per case, ids "<model>/<root|target>/P4/<STRATEGY>":
    //   {"id":..,"model":..,"target":<id|null>,"prefix":[...],"options":{...},"sha256":"<hex>"[,"geometryExtras":true]}
    //   sha256 = SHA-256 (UTF-8) of canonical(placementCanonical(expected)): "edges" and "changed" sorted by "path"
    //   (layers/layerless/hidden keep their order; "ports" and "geometry" are maps: their keys are sorted); every C4
    //   value rewritten (recursively): {t:int|double} -> {t:"number", v:<16 hex digits of the raw bits as a double>},
    //   {t:enum} -> c cut to the segment after the last '.' or '$', {t:set} -> likewise (an empty set: c null); the
    //   geometry's hex doubles are already canonical; then JSON with object keys sorted recursively, no whitespace,
    //   strings as JSON.stringify writes them. The TS twin is test/helpers/layered-placement-sweep.ts.
    //   geometryExtras is true on a case whose expected.geometry carries ports and labels (N3: a flexible node in the
    //   import; a P4 stop otherwise omits them): the TS side hashes ports and labels only then.
    //   {"id":..,"status":"refused","processor":"<member>"}   N1 refusal (the first refused processor of the plan)
    //   {"id":..,"status":"throws","model","target","prefix":<planned prefix|null>,"options","class":"<simple name>",
    //    "message":".."}                                       the oracle throws
    //   {"id":..,"status":"timeout"}                           no result within CASE_TIMEOUT_SECONDS
    // Cases run one after another (runPipeline uses static state). INTERACTIVE cases run on the model as it is on
    // disk (the 7b convention): the recorder's seeded coordinate configurator belongs to the committed rows.
    static final class PlacementSweep {
        static final long CASE_TIMEOUT_SECONDS = 20;
        static final long CASE_STACK_BYTES = 64L * 1024 * 1024;
        static final String PTOLEMY_DIR = "realworld/ptolemy";
        static final String JSON_EXTENSION = ".json";

        record Case(String id, String model, String target, TreeMap<String, Object> options) { }

        static ElkNode load(String text) {
            return ElkGraphJson.forGraph(text).toElk();
        }

        static List<String> modelIds(Path modelsDir) throws IOException {
            try (var files = Files.walk(modelsDir.resolve(PTOLEMY_DIR))) {
                return files.filter(p -> p.toString().endsWith(JSON_EXTENSION))
                        .map(p -> modelsDir.relativize(p).toString().replace('\\', '/'))
                        .map(s -> s.substring(0, s.length() - JSON_EXTENSION.length())).sorted().toList();
            }
        }

        /** The recorder's level rule (levels()): null (root), then every ElkNode with children and a unique id. */
        static List<String> targets(String text, String model) {
            List<String> targets = new ArrayList<>();
            targets.add(null);
            for (TreeIterator<EObject> it = load(text).eAllContents(); it.hasNext();) {
                if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                    if (n.getIdentifier() == null || targets.contains(n.getIdentifier())) {
                        System.err.println("skipped level of " + model + ": node id " + n.getIdentifier()
                                + " is missing or not unique");
                    } else {
                        targets.add(n.getIdentifier());
                    }
                }
            }
            return targets;
        }

        static List<Case> cases(String model, String text) {
            List<Case> out = new ArrayList<>();
            for (String t : targets(text, model)) {
                Base b = new Base(new ElkGraphTransformer().importGraph(importTarget(load(text), t)));
                if (b.edges.isEmpty()) {
                    System.err.println("skipped level " + model + " " + levelName(t) + " (no edges)");
                    continue;
                }
                for (NodePlacementStrategy s : NodePlacementStrategy.values()) {
                    out.add(new Case(model + "/" + levelName(t) + "/" + P4S + "/" + s.name(), model, t, placement(s)));
                }
            }
            return out;
        }

        /** Runs the case's pipeline row on a thread with a big stack; null when the timeout fires. */
        static Result run(Case c, String text) throws Throwable {
            Spec s = new Spec(c.id, "models", null, () -> load(text), c.target, c.options, P4S, null);
            java.util.concurrent.FutureTask<Result> task = new java.util.concurrent.FutureTask<>(
                    () -> runPipeline(s, s.prepare.get()));
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

        @SuppressWarnings("unchecked")
        static Map<String, Object> outcome(Case c, String text) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.id);
            try {
                Result r = run(c, text);
                if (r == null) {
                    m.put("status", "timeout");
                    return m;
                }
                m.put("model", c.model);
                m.put("target", c.target);
                m.put("prefix", r.prefix);
                m.put("options", c.options);
                m.put("sha256", sha256Hex(canonical(placementCanonical(r.expected))));
                if (((Map<String, Object>) r.expected.get("geometry")).containsKey("ports")) {
                    m.put("geometryExtras", true);
                }
            } catch (Refusal r) {
                m.put("status", "refused");
                m.put("processor", r.member);
                if (!REFUSAL_CATEGORIES.contains(r.member)) {
                    System.err.println("refusal OUTSIDE N1: " + c.id + " " + r.member);
                }
            } catch (Throwable e) {
                m.put("status", "throws");
                m.put("model", c.model);
                m.put("target", c.target);
                m.put("prefix", planPrefix(c, text));
                m.put("options", c.options);
                m.put("class", e.getClass().getSimpleName());
                m.put("message", String.valueOf(e.getMessage()));
            }
            return m;
        }

        /** The processors getLayoutTestConfiguration lists up to the P4 stop (null when even that throws). */
        static List<Object> planPrefix(Case c, String text) {
            try {
                ElkNode target = importTarget(load(text), c.target);
                c.options.forEach((id, c4) -> setProperty(target, id, c4));
                LGraph g = new ElkGraphTransformer().importGraph(target);
                ElkLayered layered = new ElkLayered();
                var plan = layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g));
                String stop = stopName(P4S, g);
                List<Object> prefix = new ArrayList<>();
                for (var p : plan) {
                    prefix.add(nameOf(p));
                    if (prefix.get(prefix.size() - 1).equals(stop)) {
                        return prefix;
                    }
                }
                return null;
            } catch (RuntimeException e) {
                return null;
            }
        }

        /** The canonical form documented above (7c's orderCanonical; geometry needs no extra step). */
        @SuppressWarnings("unchecked")
        static Object placementCanonical(Map<String, Object> expected) {
            Map<String, Object> copy = new LinkedHashMap<>(expected);
            for (String key : List.of("edges", "changed")) {
                List<Object> sorted = new ArrayList<>((List<Object>) expected.get(key));
                sorted.sort(Comparator.comparing(e -> (String) ((Map<String, Object>) e).get("path")));
                copy.put(key, sorted);
            }
            return c4Free(copy);
        }

        static String lastSegment(String name) {
            return name.substring(Math.max(name.lastIndexOf('.'), name.lastIndexOf('$')) + 1);
        }

        @SuppressWarnings("unchecked")
        static Object c4Free(Object v) {
            if (v instanceof List<?> l) {
                List<Object> out = new ArrayList<>();
                l.forEach(x -> out.add(c4Free(x)));
                return out;
            }
            if (!(v instanceof Map<?, ?>)) {
                return v;
            }
            Map<String, Object> m = (Map<String, Object>) v;
            Map<String, Object> out = new LinkedHashMap<>();
            Object tag = m.get("t");
            if ("int".equals(tag) || "double".equals(tag)) {
                Object x = m.get("v");
                double d = x instanceof Number n ? n.doubleValue() : parseDoubleArg("value", (String) x);
                out.put("t", "number");
                out.put("v", String.format("%016x", Double.doubleToRawLongBits(d)));
                return out;
            }
            m.forEach((k, x) -> out.put(k, c4Free(x)));
            if ("enum".equals(tag)) {
                out.put("c", lastSegment((String) m.get("c")));
            } else if ("set".equals(tag)) {
                out.put("c", ((List<?>) m.get("items")).isEmpty() ? null : lastSegment((String) m.get("c")));
            }
            return out;
        }

        static String sha256Hex(String s) {
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

        static String canonical(Object v) {
            StringBuilder sb = new StringBuilder();
            canonical(sb, v);
            return sb.toString();
        }

        static void canonical(StringBuilder sb, Object v) {
            if (v == null) {
                sb.append("null");
            } else if (v instanceof String s) {
                canonicalString(sb, s);
            } else if (v instanceof Boolean || v instanceof Integer) {
                sb.append(v);
            } else if (v instanceof Map<?, ?> m) {
                TreeMap<String, Object> sorted = new TreeMap<>();
                m.forEach((k, x) -> sorted.put((String) k, x));
                sb.append('{');
                int i = 0;
                for (Map.Entry<String, Object> e : sorted.entrySet()) {
                    sb.append(i++ == 0 ? "" : ",");
                    canonicalString(sb, e.getKey());
                    sb.append(':');
                    canonical(sb, e.getValue());
                }
                sb.append('}');
            } else if (v instanceof List<?> l) {
                sb.append('[');
                for (int i = 0; i < l.size(); i++) {
                    sb.append(i == 0 ? "" : ",");
                    canonical(sb, l.get(i));
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
                        } else if (Character.isHighSurrogate(ch) && i + 1 < s.length()
                                && Character.isLowSurrogate(s.charAt(i + 1))) {
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
            Map<String, Integer> counts = new TreeMap<>();
            List<String> models = modelIds(modelsDir);
            long start = System.currentTimeMillis();
            try (var out = Files.newBufferedWriter(outDir.resolve("results.jsonl"), StandardCharsets.UTF_8)) {
                for (int i = 0; i < models.size(); i++) {
                    String model = models.get(i);
                    String text = Files.readString(modelsDir.resolve(model + JSON_EXTENSION), StandardCharsets.UTF_8);
                    for (Case c : cases(model, text)) {
                        Map<String, Object> m = outcome(c, text);
                        counts.merge(String.valueOf(m.getOrDefault("status", "ok")), 1, Integer::sum);
                        out.write(json(m));
                        out.write('\n');
                    }
                    out.flush();
                    System.err.println("model " + (i + 1) + "/" + models.size() + " " + model + " "
                            + (System.currentTimeMillis() - start) / 1000 + " s " + counts);
                }
            }
            System.err.println("sweep done " + counts);
        }

        /** Writes the committed row format of one case: input = the model file inline. */
        static void dump(String id, Path modelsDir, Path outDir) throws Throwable {
            for (String model : modelIds(modelsDir)) {
                if (!id.startsWith(model + "/")) {
                    continue;
                }
                String text = Files.readString(modelsDir.resolve(model + JSON_EXTENSION), StandardCharsets.UTF_8);
                for (Case c : cases(model, text)) {
                    if (!c.id.equals(id)) {
                        continue;
                    }
                    Result r = run(c, text);
                    if (r == null) {
                        throw new Bug("case " + id + " times out");
                    }
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", c.id);
                    row.put("group", "models");
                    row.put("input", single("elk", new Raw(text)));
                    row.put("target", c.target);
                    row.put("options", c.options);
                    row.put("steps", null);
                    row.put("prefix", r.prefix);
                    row.put("expected", r.expected);
                    Files.createDirectories(outDir);
                    Path file = outDir.resolve(id.replace('/', '_') + ".json");
                    Files.writeString(file, json(row) + "\n", StandardCharsets.UTF_8);
                    System.err.println("wrote " + file);
                    return;
                }
            }
            throw new Bug("no sweep case has the id " + id);
        }

        static void main(String[] args) throws Throwable {
            buildProcessorNames();
            discoverProperties();
            if (args[0].equals("--sweep") && args.length == 3) {
                sweep(Path.of(args[1]), Path.of(args[2]));
            } else if (args[0].equals("--dump") && args.length == 4) {
                dump(args[1], Path.of(args[2]), Path.of(args[3]));
            } else {
                throw new IllegalArgumentException(
                        "usage: --sweep <modelsDir> <outDir> | --dump <case id> <modelsDir> <outDir>");
            }
            System.exit(0);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Build and main

    static final String FILTER = System.getenv("PLACEMENT_FILTER");
    static final boolean MARKERS = System.getenv("PLACEMENT_MARKERS") != null;
    static final boolean DISCOVER = System.getenv("PLACEMENT_DISCOVER") != null;
    static final boolean CROSSCHECK = System.getenv("PLACEMENT_CROSSCHECK") != null;

    static String buildAll() {
        RAN.clear();
        REFUSED_ROWS.clear();
        NOT_IN_PLAN.clear();
        buildProcessorNames();
        List<Spec> specs = new ArrayList<>();
        modelSpecs(specs);
        scenarioSpecs(specs);
        if (CROSSCHECK) {
            crossCheck(specs);
        }
        Set<String> ids = new HashSet<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("models", 0);
        counts.put("scenarios", 0);
        counts.put("sites", 0);
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
                    System.err.println("DISCOVER refusal " + key + (REFUSAL_CATEGORIES.contains(r.member) ? "" : "  OUTSIDE N1"));
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
            } catch (org.eclipse.elk.core.UnsupportedConfigurationException e) {
                if (!s.group.equals("models")) {
                    throw e;
                }
                // ELK rejects the configuration itself: a row records no exception.
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
        out.append("  ]\n}\n");
        if (System.getenv("PLACEMENT_STATS") != null) {
            Map<String, Long> bytes = new TreeMap<>();
            for (Row r : rows) {
                String[] p = r.id.split("/");
                bytes.merge(p.length > 4 ? p[3] + "/" + p[4].replaceAll("-.*", "") : p[0] + "/" + p[1], (long) r.json.length(), Long::sum);
                bytes.merge(p.length > 4 ? "model " + p[1] : "x", (long) r.json.length(), Long::sum);
            }
            bytes.forEach((kind, v) -> System.err.println("STATS " + v + " " + kind));
        }
        System.err.println("rows " + rows.size() + " " + counts);
        return out.toString();
    }

    /** N2 coverage: every NodePlacementStrategy and every 7d processor is run by some step row. */
    static void checkCoverage() {
        List<String> missing = new ArrayList<>();
        for (NodePlacementStrategy s : NodePlacementStrategy.values()) {
            if (!RAN.contains(P4 + "/" + s.name())) {
                missing.add(P4 + "/" + s.name());
            }
        }
        for (String m : SEVEN_D) {
            if (!RAN.contains(m)) {
                missing.add(m);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("no step row runs " + missing);
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
                    + "(tools/vectors/layered-placement-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        if (args.length > 0 && args[0].startsWith("--")) {
            try {
                PlacementSweep.main(args);
            } catch (Exception | Error e) {
                throw e;
            } catch (Throwable t) {
                throw new IllegalStateException(t);
            }
            return;
        }
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        discoverProperties();
        String text;
        try {
            text = buildAll();
            if (FILTER == null) {
                String again = buildAll();
                if (!text.equals(again)) {
                    throw new IllegalStateException("two builds differ\n" + clip(text, again) + "\n" + clip(again, text));
                }
            }
        } catch (Refusal r) {
            System.err.println("refused: " + r.getMessage());
            System.exit(1);
            return;
        }
        long bytes = text.getBytes(StandardCharsets.UTF_8).length;
        if (bytes > MAX_BYTES) {
            throw new IllegalStateException("output is " + bytes + " bytes, over the 16 MiB cap");
        }
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), text, StandardCharsets.UTF_8);
        strictParse(Path.of(args[0], OUTPUT));
        System.err.println("strict JSON parse ok, bytes " + bytes);
    }
}
