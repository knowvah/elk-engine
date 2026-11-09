// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7f layered-pipeline, T1, F1, F3, F4, F8) for the org.eclipse.elk.alg.layered
// driver and its first full-pipeline users: ElkLayered, GraphConfigurator, the components package (ComponentsProcessor and the graph
// placers) and the six intermediate processors GraphTransformer (DIRECTION_PREPROCESSOR / DIRECTION_POSTPROCESSOR),
// HierarchicalPortOrthogonalEdgeRouter, EndLabelSorter, HypernodesProcessor and ConstraintsPostprocessor. The Java is the spec; this
// program only CALLS ELK APIs (reflection where a member is private or protected) and records results; it embeds no ELK implementation.
// Run: tools/vectors/layered-pipeline-vectors.sh <outDir>   (java -cp ... LayeredPipelineVectors.java <outDir> <tools/vectors dir>)
// Plan dump (F8): java -cp ... LayeredPipelineVectors.java --plan-dump <tools/vectors dir> <modelsDir> <path>... [-o CONSTANT=value]...
//   prints "PLAN <path> <level path> <member>,..." per hierarchy level (a directory path is expanded to its .elkt / .json files).
// Sweep (F6, T14): java -cp ... LayeredPipelineVectors.java --sweep <modelsDir> <outDir>   (writes <outDir>/results.jsonl)
//                  java -cp ... LayeredPipelineVectors.java --dump <case id> <modelsDir> <outDir>  (writes the canonical form of one case)
//   tools/oracle/pipeline-sweep.sh runs them. Cases over every realworld/ptolemy/**.json under <modelsDir> (default options, components on):
//     level/<model>/<root|target>/<ROUTING>   every edge-bearing level, ROUTING in ORTHOGONAL, POLYLINE, SPLINES: the level imported through
//                                             ElkGraphTransformer, new ElkLayered().doLayout, applyLayout (the LayeredLayoutProvider flow)
//     model/<model>/<DIRECTION>               the whole model, DIRECTION in RIGHT, LEFT, DOWN, UP on the root, RecursiveGraphLayoutEngine
//   <model> is the path under <modelsDir> without ".json"; <target> is the id of a node with children (ids missing or not unique are skipped).
//   results.jsonl, one JSON object per case:
//     ok       { id, kind, model, target, routing | direction, sha256 }   sha256 of the canonical form (UTF-8, compact, object keys sorted)
//     refused  { id, status: "refused", processor }                       the first member of the FULL plan outside the 7b-7f sets (a prefix
//                                                                         check would record cases the driver cannot build: F1 categories)
//     throws   { id, status: "throws", kind, model, target, routing | direction, class, message }   simple class name of the exception
//     timeout  { id, status: "timeout" }                                  not finished within CASE_TIMEOUT_SECONDS
//   Canonical form: a tree of the laid-out ElkGraph subtree (node, ports, labels, children, contained edges: sections with start, end and bend
//   points, junction points) where every x, y, width, height is the raw IEEE-754 bits of the double as 16 lowercase hex digits (-0.0 differs
//   from 0.0). Children, ports, labels, edges keep model order. The refusal rule, the 20 s limit and the one-thread-per-case isolation are
//   7e's (LayeredRoutingSweep.java).
//
// ORIGIN (B7: single-file launchers share no code): the core is copied from tools/vectors/LayeredRoutingVectors.java (7e, itself copied
// from LayeredPlacementVectors.java and LayeredOrderVectors.java), lines 1-1,857 there (JSON helpers, the LGraph Dump, the C4 Encoder
// and decode, importGraph/normalise/Base/phaseDump, the step interpreter, Spec/execute/buildRow, strictNumbers/strictParse, the row
// timeout, the model files and levels, pipeline(), the ELK JSON builders) plus the small builders eds/flat/hier/pj/pnode/plain/at/join
// and kn/sz/rr (7e lines 1,860-1,912 and 2,164-2,181). The row format, the C4 values, the refusal rule, the BFS guard and the re-run /
// build-twice / strict-parse / size checks are 7c's, 7d's and 7e's (see their headers); what follows is what this recorder adds.
//
// Output: ONE file <outDir>/layered-pipeline.json (2-space top level, one compact JSON row per line, trailing newline, under 16 MiB):
//   { jdk, oracle, rowCounts: { full, models, scenarios, sites }, rows }      groups full, models, scenarios, sites
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable. input = { path, sha256 } (vendored
//   file) or { elk } (inline ELK JSON). T1 recorded no sites rows (rowCounts.sites was 0); T15 added the sites group below.
//
// Group full (F4), id full/<family>/<model>/<variant>: target null, steps null, prefix null, options = the FINAL option values applied
//   to the ROOT node before layout (C4 values, as 7e), expected = { layout, plans }: layout = the exported ELK JSON of the root after
//   new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor()) exported as CaseRunner.java:87-92 (compact, non-finite
//   numbers as the strings "Infinity" / "-Infinity" / "NaN"); plans = { "<level path>": [member names] } in layout order, where a level
//   is every node with children and its path is the ELK ids from the root down joined by "/" (a missing id is the empty string, so the
//   root is "<root id>" and its child "inner" is "<root id>/inner"). The names are those of the processors ElkLayered ran on the level
//   (recorded by a TestController listener on the first component graph of the level): intermediate members by their
//   IntermediateProcessorStrategy name, GraphTransformer by position (DIRECTION_PREPROCESSOR first, DIRECTION_POSTPROCESSOR last, ticket
//   341), phases "<PHASE>/<STRATEGY>" ("P1_CYCLE_BREAKING/GREEDY", "P5_EDGE_ROUTING/ORTHOGONAL"). Options of an inner level live in the
//   inline graph's layoutOptions. Families: golden, model, routing-direction, components, options, issues.
//   A level whose plan names a member outside the ported sets (SEVEN_B..SEVEN_F, P1-P5), or whose options select INCLUDE_CHILDREN,
//   COMPACTION_CONNECTED_COMPONENTS=true or a random seed of 0, is a refusal (F1): exit 1 naming the row unless "<family>/<model>/
//   <first refused member>" is in ACCEPTED_REFUSALS and the member in REFUSAL_CATEGORIES; the row is not recorded and counted per
//   family and category on stderr. Option application for a row is by the Java constant name (pid) and decode(), so only bool, int,
//   string, double, enum, list and ref values occur.
//
// Group models, id models/<model>/<target or root>/<stop>/<variant> (7e's rows, stops of this brief): DIRECTION_PREPROCESSOR,
//   DIRECTION_POSTPROCESSOR (variants LEFT, DOWN, UP), HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER, END_LABEL_SORTER, HYPERNODE_PROCESSOR
//   (variant default), CONSTRAINTS_POSTPROCESSOR (variants interactive, position-ids) wherever the level's plan holds them, through
//   prepareLayoutTest / runLayoutTestStep with SEPARATE_CONNECTED_COMPONENTS=false (the earlier rows). A stop not in the plan skips
//   the row (counted). expected as 7e (layers, layerless, hidden, edges, ports, changed, geometry, dump under ten nodes). The names in
//   prefix follow the positional GraphTransformer rule above.
//
// Group scenarios, id scenarios/<Class>/<name>: inline graphs (3-10 nodes) with the full step list derived from the assembled plan:
//   importGraph, normalise, then every plan member in order (runProcessor for an intermediate member, runPhase for P1-P5; the step
//   interpreter runs the 7b-7f sets), cut after the stop, then dump. Options live in the graph's layoutOptions so PIPELINE_CROSSCHECK=1
//   can run each as a pipeline row. NEW STEP OPS (ComponentsProcessor, no arguments): ["componentsSplit"] runs
//   new ComponentsProcessor().split(graph) on the imported and normalised graph and keeps the processor and the component list; every
//   later runProcessor / runPhase step runs on EACH component in list order; as the LAST step it ends the row with
//   expected = { components: [{ nodes: [path], extPortConnections: [PortSide names, ordinal order], padding: Quad }] } (the component
//   list, in list order). ["componentsCombine"] (always the last step, after a componentsSplit) first moves every component's layered
//   nodes back to its layerless list and clears its layers (the end of ElkLayered.layout), then calls combine(components, graph) and
//   ends the row with expected = phaseDump of the target graph (layerless nodes, geometry, graph size, padding via geometry.graph).
//   Component rows are cross-checked (PIPELINE_CROSSCHECK) against ElkLayered.doLayout on a fresh import: geometry.nodes pos and size.
//
// Group sites (T15, F12; plans/layered-pipeline/unreached.md): step rows like scenarios, one per S scenario, ids sites/<Class>/<name>[/<variant>],
//   input graphs inline, options in the graph. Unlike a scenarios row, a sites row is refused (Bug) unless the FULL plan of its graph holds
//   only ported members (the driver builds the whole plan first), and every graph is free of edge labels, comments and self loops.
//   Rows: LayeredLayoutProvider/{flat,cancelled,cancelledOneComponent}, ElkLayered/resize/{noDefaultMinimum,defaultMinimum},
//   GraphTransformer/{rotation/<dir>/{pre,post},alignment/<dir>/<alignment>,layerConstraint/{FIRST,LAST},nodeLabelPlacement},
//   ComponentGroupGraphPlacer/{newGroup,rowWrap}, ComponentGroupModelOrderGraphPlacer/{vertical/<dir>/<side>,newGroup},
//   SimpleRowGraphPlacer/priority, HierarchicalPortOrthogonalEdgeRouter/portLabels/{inside,outside,neither},
//   HypernodesProcessor/{moreLeftEdges/{south,aboveAndBelow,trimmed},notShifted,bendChoice}.
//   NEW STEP OPS (T15), both without arguments, both the LAST step after importGraph and normalise (no componentsSplit):
//   ["layout"] runs new LayeredLayoutProvider().layout(<the ELK node importGraph read>, new BasicProgressMonitor());
//   ["layoutCancelled"] does the same with a monitor whose isCanceled() is always true. expected = phaseDump of the imported (untouched)
//   LGraph plus "layout": the ELK JSON export of that ELK node afterwards (as CaseRunner.java:87-92). Under a cancelled monitor the
//   multi-component flow returns at ElkLayered.java:154 and the provider skips applyLayout (LayeredLayoutProvider.java:64): the node keeps
//   its input coordinates. Replayed by test/helpers/layered-pipeline-replay-ops.ts (runPipelineSteps / pipelineDump / comparePipeline).
//
// Refusals: REFUSAL_CATEGORIES lists the members of F1 (labels and comments 7f2; self loops, wrapping, compaction 7g; INCLUDE_CHILDREN
//   and HIERARCHICAL_NODE_RESIZER 7h). A start-up check requires every IntermediateProcessorStrategy member to be in exactly one
//   of SEVEN_B..SEVEN_F or REFUSAL_CATEGORIES.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 so identity-hashed collections
//   iterate in insertion order (AD-10; up to 10 entries, then HashMap treeifies); main fails without it. The seed properties are
//   those of tools/oracle/run.sh (export and identifier seed 1) so exported ids agree with refs/elk (F4).
//
// Diagnosis aids (environment, output unchanged when unset): PIPELINE_FILTER=<text> builds only rows whose id contains the text (no
//   coverage check, one build); PIPELINE_DISCOVER=1 prints refusals and oracle throws instead of stopping; PIPELINE_MARKERS=1 writes
//   "ROW <id>" to stdout per row; PHASE_TRACE=1 one stderr line per row; PIPELINE_CROSSCHECK=1 verifies the scenario chains against
//   the pipeline (=v also prints each pipeline prefix and step list); PIPELINE_STATS=1 prints the bytes per row family and model;
//   PIPELINE_CAP_MB=<n> raises the size cap for a measuring run (never for the ref).
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

public class LayeredPipelineVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "layered-pipeline.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed", REPO_PREFIX = "repo:";
    static final String PTOLEMY = "test/golden/inputs/realworld/ptolemy/", LAYERED_TESTS = "test/golden/inputs/tests/layered/";
    static final String TICKETS = "test/golden/inputs/tickets/layered/";
    static final int MAX_DEPTH = 8, FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = (System.getenv("PIPELINE_CAP_MB") == null ? 16L : parseLongArg("PIPELINE_CAP_MB", System.getenv("PIPELINE_CAP_MB"))) * 1024 * 1024; // PIPELINE_CAP_MB: diagnosis aid, the committed output stays under 16 MiB (F3)
    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING", P3 = "P3_NODE_ORDERING", P4 = "P4_NODE_PLACEMENT", P5 = "P5_EDGE_ROUTING";
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings", "splines.route.start"); // T1: the spline route is recorded in geometry.splines (R3)
    /** Refusals (F1) the recorder accepts, "<family>/<model>/<member>" for full rows and "<model>/<target or root>/<member>" for models rows:
     * the level's plan names a member of a later mission (7f2 labels and comments, 7g self loops, wrapping and compaction, 7h nested
     * graphs), so the row cannot be replayed by the 7b-7f sets and is not recorded. Any other refusal exits 1. Found with
     * PIPELINE_DISCOVER=1. */
    static final Set<String> ACCEPTED_REFUSALS = Set.of(
//ACCEPTED_REFUSALS_BEGIN
            "hyperedge_merging-hyperedge_labels/root/LABEL_DUMMY_INSERTER",
            "hyperedge_merging-unequal_src_tgt_with_labels/root/LABEL_DUMMY_INSERTER",
            "model/hyperedge_merging-hyperedge_labels/LABEL_DUMMY_INSERTER",
            "model/hyperedge_merging-unequal_src_tgt_with_labels/LABEL_DUMMY_INSERTER",
            "model/node_placement-KIPRA-1426-demo2-KIPRA-1426/COMMENT_PREPROCESSOR",
            "model/partitioning-withEdgeLabels/LABEL_DUMMY_INSERTER",
            "model/preserve_order-backwardsEdges/LABEL_DUMMY_INSERTER",
            "model/preserve_order-dummyNodeNoConnectedNode/LABEL_DUMMY_INSERTER",
            "model/preserve_order-dummyNodeNoConnectingNode2/LABEL_DUMMY_INSERTER",
            "model/preserve_order-longConflictingExample/LABEL_DUMMY_INSERTER",
            "model/preserve_order-noCrossings/LABEL_DUMMY_INSERTER",
            "model/preserve_order-nodeBetweenDummies/LABEL_DUMMY_INSERTER",
            "model/preserve_order-oneCrossing/LABEL_DUMMY_INSERTER",
            "model/preserve_order-sameTargetTogether/LABEL_DUMMY_INSERTER",
            "model/preserve_order-sameTargetTogether2/LABEL_DUMMY_INSERTER",
            "model/preserve_order-simpleConflictingExample/LABEL_DUMMY_INSERTER",
            "model/preserve_order-simpleLongEdges01/LABEL_DUMMY_INSERTER",
            "model/preserve_order-simpleLongEdges02/LABEL_DUMMY_INSERTER",
            "model/preserve_order-smallExample/LABEL_DUMMY_INSERTER",
            "model/preserve_order-timedAutomaton/LABEL_DUMMY_INSERTER",
            "model/preserve_order-timedAutomatonMoreEdges/LABEL_DUMMY_INSERTER",
            "model/ptolemy-sinewaveoptimization/SELF_LOOP_PREPROCESSOR",
            "node_placement-KIPRA-1426-demo2-KIPRA-1426/root/COMMENT_PREPROCESSOR",
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
            "ptolemy-sinewaveoptimization/N1/SELF_LOOP_PREPROCESSOR",
            "");
//ACCEPTED_REFUSALS_END
    /** Rows on which the oracle itself throws a NullPointerException or ArrayIndexOutOfBoundsException for some stop,
     * "<model>/<target or root>/<exception>@<class of the top frame>" (models rows) or "<family>/<model>/<exception>@<class>" (full
     * rows): those rows are skipped (nothing to port) and counted on stderr. Found with PIPELINE_DISCOVER=1; anything else that throws
     * stops the recording. */
    static final Set<String> ORACLE_THROWS = Set.of(
//ORACLE_THROWS_BEGIN
            "");
//ORACLE_THROWS_END
    static final Map<String, Integer> ORACLE_THROWN = new TreeMap<>();
    /** The refusal categories F1 allows (the members the recorder refuses), with the owning mission. */
    static final Map<String, String> REFUSAL_CATEGORIES = new TreeMap<>();
    static {
        for (String m : List.of("LABEL_DUMMY_INSERTER", "LABEL_DUMMY_SWITCHER", "LABEL_SIDE_SELECTOR", "END_LABEL_PREPROCESSOR",
                "CENTER_LABEL_MANAGEMENT_PROCESSOR", "END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR", "LABEL_DUMMY_REMOVER",
                "END_LABEL_POSTPROCESSOR", "COMMENT_PREPROCESSOR", "COMMENT_NODE_MARGIN_CALCULATOR", "COMMENT_POSTPROCESSOR",
                "ALTERNATING_LAYER_UNZIPPER")) {
            REFUSAL_CATEGORIES.put(m, "labels and comments (7f2)");
        }
        for (String m : List.of("SELF_LOOP_PREPROCESSOR", "SELF_LOOP_PORT_RESTORER", "SELF_LOOP_ROUTER", "SELF_LOOP_POSTPROCESSOR",
                "BREAKING_POINT_INSERTER", "BREAKING_POINT_PROCESSOR", "BREAKING_POINT_REMOVER", "SINGLE_EDGE_GRAPH_WRAPPER",
                "HORIZONTAL_COMPACTOR", "COMPACTION_CONNECTED_COMPONENTS")) {
            REFUSAL_CATEGORIES.put(m, "self loops, wrapping, compaction (7g)");
        }
        REFUSAL_CATEGORIES.put("INCLUDE_CHILDREN", "nested graphs (7h)");
        REFUSAL_CATEGORIES.put("HIERARCHICAL_NODE_RESIZER", "nested graphs (7h)");
    }
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
    /** F1: the six processors of this brief (GraphTransformer is two arms). */
    static final Set<String> SEVEN_F = Set.of("DIRECTION_PREPROCESSOR", "DIRECTION_POSTPROCESSOR",
            "HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER", "END_LABEL_SORTER", "HYPERNODE_PROCESSOR", "CONSTRAINTS_POSTPROCESSOR");
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
a78212a04054c839dce3f947456062160c5d668370c43a0945e0e395d865c57b  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json
8d3f9d6477c3849c5406992c893b0d365cab19e225802d0442b47a3bb537c3c2  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_clockdrift_ClockDriftHierarchy.json
ce3418acfa52e7afca791ec96756021d02268d6996185bc588e974e00c702f70  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_afdx_AFDXMulticastSimple.json
7a3828beab03773ed1e6acac596c7ef2d7fc7038ce36af07da2ebcf69eaf04a7  repo:test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/de_switch_CrossbarSwitch.json
e901328551b183aa193ba86adfccc07977459489c244c78a6f8ada98f72d8a7b  repo:test/golden/inputs/tickets/layered/143_smallVerticalEdgeSegmentSpacing.elkt
b2c2889f39089a0152e9de47a60e5f4bb2294f6c7f5eb256fdf544d50abffea0  repo:test/golden/inputs/tickets/layered/318_overlappingHorizontalEdgeSegments.elkt
dc161227ef2a2c14aa94abfe6547a13b7d4be29d04ef3683e138eaf95fa93447  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEInside.elkt
a8894790a9195e42af56b9f4dc8bd09cf4038088cb575e4af9325eeeabd530f9  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEOutsideNextToPort.elkt
486e3cce9622bee430555861e4801d6e8ffb9164a13104d787f4ce035d630d02  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsTwoWestOutside.elkt
bd512d48fbb1c79f9bdda76b9cd79f1ef4f7025a5af81c7c98ce1724d73234cf  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEOutside.elkt
b06e4fb015bc854868f443848ae387cb14b53ebdbb2f60629261be5653ae80d3  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsTwoWestOutsideNextToPort.elkt
8817b32ed6b0a7f0ab01c9546bf81d733d4e65de55cd7eaa24fde6d8018d6064  repo:test/golden/inputs/tickets/layered/447_hierarchicalPortAnchors.elkt
0168a08422602fe54d653c4dba7a39efae1ec5e0dbf3114ece2a764f35db0245  repo:test/golden/inputs/tickets/layered/476_multiLabelInHorizontalLayout.elkt
a5f0238797cad0bfef2555230671ed7113ab0032687945184466058cf1fb1ff5  repo:test/golden/inputs/tickets/layered/476_multiLabelInVerticalLayout.elkt
c14fe72a9889eb35ddbbf6134391679206729bcd89184c4781518ae5e4ec2311  repo:test/golden/inputs/tickets/layered/502_collapsingCompoundNode.elkt
02586c2574a252fa52759d204d59cd0f7bcb7e161bafd375cf1300ce1edc5045  repo:test/golden/inputs/tickets/layered/515_polylineOverNodeIncOut.elkt
68af1ae7efa2fc9588116fcbbd471b1c256dd9032c275c943d0a3b3347e80c23  repo:test/golden/inputs/tickets/layered/515_polylineOverNodeIncoming.elkt
1b03298abf783664bfd5012481279ffff89c33fb32b4a682e40857c161ea6ad3  repo:test/golden/inputs/tickets/layered/515_polylineOverNodeOutgoing.elkt
84905b4ef127d0cac5e8f0bd9dc6bb87680f5ef672d2eb6f198f27c8dded7b41  repo:test/golden/inputs/tickets/layered/546_borderGaps.elkt
70cca7a742ac4d21271141cd7ddd6ed7a4532d84ec55ca531c5b84f04dfca9e1  repo:test/golden/inputs/tickets/layered/548_NPEWithInsideSelfLoops.elkt
8b844808120cf7ac879db7b2ff357b68804ff9912519d0fed12467a7a27a820a  repo:test/golden/inputs/tickets/layered/587_polylineSplinesNPE.elkt
7a304bed892ea00b2c53365fcb87045eb8767734c0829afd5df1ce87eb93a89a  repo:test/golden/inputs/tickets/layered/603_labelOverlaps.elkt
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
                    items.sort(Comparator.comparing(LayeredPipelineVectors::json));
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
        if (c4 instanceof List<?> l) { return l.stream().map(LayeredPipelineVectors::decode).toList(); } // T11: a list value (the in-layer successor constraints)
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
        ComponentsProcessor cproc = null;
        List<LGraph> comps = null;
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
                    for (LGraph target : comps == null ? List.of(graph) : comps) {
                        runProcessor(target, (String) s.get(1));
                    }
                    need(base).stop = (String) s.get(1);
                }
                case "runPhase" -> {
                    for (LGraph target : comps == null ? List.of(graph) : comps) {
                        runPhase(target, (String) s.get(1), (String) s.get(2));
                    }
                    need(base).stop = (String) s.get(1);
                }
                case "componentsSplit" -> {
                    if (comps != null) {
                        throw new Bug("componentsSplit twice");
                    }
                    cproc = new ComponentsProcessor();
                    comps = cproc.split(graph);
                    if (i == steps.size() - 1) {
                        expected = componentsDump(base, comps);
                    }
                }
                case "componentsCombine" -> {
                    if (comps == null || i != steps.size() - 1) {
                        throw new Bug("componentsCombine needs a componentsSplit before it and ends the row");
                    }
                    for (LGraph comp : comps) { // the end of ElkLayered.layout: the nodes leave the layers
                        for (Layer layer : comp) {
                            comp.getLayerlessNodes().addAll(layer.getNodes());
                            layer.getNodes().clear();
                        }
                        for (LNode node : comp.getLayerlessNodes()) {
                            node.setLayer(null);
                        }
                        comp.getLayers().clear();
                    }
                    cproc.combine(comps, graph);
                    expected = phaseDump(base);
                }
                case "layout", "layoutCancelled" -> {
                    if (i != steps.size() - 1 || comps != null) {
                        throw new Bug(op + " ends the row and takes no componentsSplit before it");
                    }
                    expected = layoutDump(base, graph, op.equals("layoutCancelled"));
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

    /** A monitor cancelled before the layout starts (a BasicProgressMonitor whose isCanceled is always true). */
    static final class CancelledMonitor extends BasicProgressMonitor {
        @Override
        public boolean isCanceled() {
            return true;
        }
    }

    /**
     * The expected of a terminal layout / layoutCancelled step: phaseDump(base) of the imported (untouched) LGraph and, under "layout", the
     * export (as CaseRunner.java:87-92) of the ELK graph after new LayeredLayoutProvider().layout(<the imported ELK node>, monitor).
     */
    static Map<String, Object> layoutDump(Base base, LGraph graph, boolean cancelled) {
        ElkNode node = (ElkNode) graph.getProperty(InternalProperties.ORIGIN);
        new LayeredLayoutProvider().layout(node, cancelled ? new CancelledMonitor() : new BasicProgressMonitor());
        Map<String, Object> expected = phaseDump(base);
        expected.put("layout", new Raw(export(node)));
        return expected;
    }

    /** The expected of a terminal componentsSplit: the component list in list order. */
    static Map<String, Object> componentsDump(Base base, List<LGraph> comps) {
        List<Object> list = new ArrayList<>();
        for (LGraph comp : comps) {
            Map<String, Object> m = new LinkedHashMap<>();
            List<Object> nodes = new ArrayList<>();
            comp.getLayerlessNodes().forEach(n -> nodes.add(pathOf(base.paths, n)));
            m.put("nodes", nodes);
            Set<PortSide> sides = comp.getProperty(InternalProperties.EXT_PORT_CONNECTIONS);
            m.put("extPortConnections", sides == null ? null : names(sides));
            m.put("padding", quad(comp.getPadding().top, comp.getPadding().right, comp.getPadding().bottom, comp.getPadding().left));
            list.add(m);
        }
        return single("components", list);
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
                && !SEVEN_E.contains(member) && !SEVEN_F.contains(member)) {
            throw new Bug("processor " + member + " is outside the 7b-7f sets");
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
        List<String> positional = positionalNames(plan);
        for (int i = 0; i < plan.size() && stopAt < 0; i++) {
            names.add(positional.get(i));
            stopAt = names.get(i).equals(stop) ? i : -1;
        }
        if (stopAt < 0) {
            throw new NotInPlan("row " + s.id + ": " + stop + " is not part of the algorithm " + names);
        }
        List<Object> prefix = new ArrayList<>(names.subList(0, stopAt + 1));
        for (Object name : prefix) {
            if (!allowed((String) name)) {
                throw new Refusal("row " + s.id + ": prefix names " + name + ", outside the 7b-7f sets", (String) name);
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

    /** Root options: the router plus pairs of (Java constant name, value string). */
    static String rr(EdgeRouting r, String... kv) {
        String[] all = new String[kv.length + 2];
        all[0] = "EDGE_ROUTING";
        all[1] = r.name();
        System.arraycopy(kv, 0, all, 2, kv.length);
        return ropts(all);
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

    /** F1 refusals by option: INCLUDE_CHILDREN, COMPACTION_CONNECTED_COMPONENTS=true; a random seed of 0 is stop 6. */
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
            if (Boolean.TRUE.equals(n.getProperty(LayeredOptions.COMPACTION_CONNECTED_COMPONENTS))) {
                throw new Refusal("row " + currentRow + ": COMPACTION_CONNECTED_COMPONENTS at " + levelPath(n),
                        "COMPACTION_CONNECTED_COMPONENTS");
            }
            if (!n.getChildren().isEmpty() && Integer.valueOf(0).equals(n.getProperty(LayeredOptions.RANDOM_SEED))) {
                throw new Bug("row " + currentRow + ": random seed 0 (stop condition) at " + levelPath(n));
            }
        }
    }

    /** A full row: options on the root, the recursive engine, the export and the plan of every level. */
    static Result runFull(Spec s, ElkNode root) {
        currentRow = s.id;
        s.options.forEach((id, c4) -> setProperty(root, id, c4));
        refuseOptions(root);
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
        Map<String, Object> plans = recorder.plans();
        for (Map.Entry<String, Object> e : plans.entrySet()) {
            for (Object name : (List<?>) e.getValue()) {
                if (!allowed((String) name)) {
                    throw new Refusal("row " + s.id + ": level " + e.getKey() + " names " + name + ", outside the 7b-7f sets", (String) name);
                }
            }
        }
        Map<String, Object> expected = new LinkedHashMap<>();
        expected.put("layout", new Raw(export(root)));
        expected.put("plans", plans);
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

    static Spec full(String family, String model, String variant, String path, String elk, TreeMap<String, Object> options) {
        return new Spec("full/" + family + "/" + model + "/" + variant, "full", path,
                path == null ? () -> ElkGraphJson.forGraph(elk).toElk() : null, null, options, null, null);
    }

    // Models and full rows: plan names, stops of this brief, families

    /** The names of the processors the assembled algorithm of the level holds (one import, nothing run), GraphTransformer by position. */
    static List<String> planNames(ModelFile f, String target, TreeMap<String, Object> options) {
        ElkNode t = importTarget(loadFile(f.rel), target);
        options.forEach((id, c4) -> setProperty(t, id, c4));
        LGraph g = new ElkGraphTransformer().importGraph(t);
        ElkLayered layered = new ElkLayered();
        return positionalNames(layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g)));
    }

    static final List<String> DIRECTIONS = List.of("LEFT", "DOWN", "UP");
    static final String HPOER = "HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER", ELS = "END_LABEL_SORTER", HNP = "HYPERNODE_PROCESSOR",
            CPP = "CONSTRAINTS_POSTPROCESSOR", DPRE = "DIRECTION_PREPROCESSOR", DPOST = "DIRECTION_POSTPROCESSOR";

    /** One candidate row of a level: stop, variant and the options of the variant. */
    record Cand(String stop, String variant, TreeMap<String, Object> options) { }

    static List<Cand> candidates(boolean broad) {
        List<Cand> c = new ArrayList<>();
        for (String d : DIRECTIONS) {
            if (broad || d.equals("DOWN")) {
                c.add(new Cand(DPRE, d, opts("DIRECTION", E("Direction", d))));
                c.add(new Cand(DPOST, d, opts("DIRECTION", E("Direction", d))));
            }
        }
        c.add(new Cand(HPOER, "default", opts()));
        c.add(new Cand(ELS, "default", opts()));
        c.add(new Cand(HNP, "default", opts()));
        if (broad) {
            c.add(new Cand(CPP, "interactive", opts("INTERACTIVE_LAYOUT", Z(true))));
        }
        c.add(new Cand(CPP, "position-ids", opts("GENERATE_POSITION_AND_LAYER_IDS", Z(true))));
        return c;
    }

    /** The rows of this brief's stops for one level (a stop outside the level's plan is skipped and counted). */
    static void stopRows(List<Spec> out, ModelFile f, Level lv, boolean broad) {
        Map<String, List<String>> plans = new HashMap<>();
        for (Cand c : candidates(broad)) {
            List<String> plan;
            try {
                plan = plans.computeIfAbsent(json(c.options), k -> planNames(f, lv.target, c.options));
            } catch (org.eclipse.elk.core.UnsupportedConfigurationException e) {
                continue; // the oracle refuses this level, as in 7e
            }
            if (plan.contains(c.stop)) {
                out.add(pipeline(f, lv.target, c.stop, c.variant, c.options));
            } else {
                NOT_IN_PLAN.merge(c.stop, 1, Integer::sum);
            }
        }
    }

    static final String[][] GOLDEN_FILES = {{"ptolemy-scrambler", "comm_scrambler_Scrambler"},
        {"ptolemy-clockdrift-hierarchy", "de_clockdrift_ClockDriftHierarchy"}, {"ptolemy-afdx-multicast", "de_afdx_AFDXMulticastSimple"},
        {"ptolemy-crossbar-switch", "de_switch_CrossbarSwitch"}};

    /** Inputs vendored for this brief (tickets of the issues family): repo-relative paths, see ISSUE_INPUTS. */
    static final List<String> ISSUE_INPUTS = List.of(
//ISSUE_INPUTS_BEGIN
            "test/golden/inputs/tickets/layered/143_smallVerticalEdgeSegmentSpacing.elkt",
            "test/golden/inputs/tickets/layered/318_overlappingHorizontalEdgeSegments.elkt",
            "test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEInside.elkt",
            "test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEOutsideNextToPort.elkt",
            "test/golden/inputs/tickets/layered/405_differentPortLabelPositionsTwoWestOutside.elkt",
            "test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEOutside.elkt",
            "test/golden/inputs/tickets/layered/405_differentPortLabelPositionsTwoWestOutsideNextToPort.elkt",
            "test/golden/inputs/tickets/layered/447_hierarchicalPortAnchors.elkt",
            "test/golden/inputs/tickets/layered/476_multiLabelInHorizontalLayout.elkt",
            "test/golden/inputs/tickets/layered/476_multiLabelInVerticalLayout.elkt",
            "test/golden/inputs/tickets/layered/502_collapsingCompoundNode.elkt",
            "test/golden/inputs/tickets/layered/515_polylineOverNodeIncOut.elkt",
            "test/golden/inputs/tickets/layered/515_polylineOverNodeIncoming.elkt",
            "test/golden/inputs/tickets/layered/515_polylineOverNodeOutgoing.elkt",
            "test/golden/inputs/tickets/layered/546_borderGaps.elkt",
            "test/golden/inputs/tickets/layered/548_NPEWithInsideSelfLoops.elkt",
            "test/golden/inputs/tickets/layered/587_polylineSplinesNPE.elkt",
            "test/golden/inputs/tickets/layered/603_labelOverlaps.elkt"
//ISSUE_INPUTS_END
            );

    static void modelSpecs(List<Spec> out, List<Spec> fulls) {
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
                stopRows(out, f, lv, !f.kind.equals(KIND_PTOLEMY) || smallest.contains(f));
            }
        }
        fullSpecs(fulls, files, smallest);
    }

    static void fullSpecs(List<Spec> out, List<ModelFile> files, List<ModelFile> smallest) {
        for (String[] g : GOLDEN_FILES) {
            // Under pipeline/, not realworld/: LayeredFrameworkVectors walks realworld/ and requires an exact match with its table.
            out.add(full("golden", g[0], "default", "test/golden/inputs/pipeline/realworld/ptolemy/hierarchical/" + g[1] + ".json",
                    null, fopts()));
        }
        for (ModelFile f : files) {
            out.add(full("model", f.id, "default", f.rel, null, fopts()));
        }
        for (ModelFile f : smallest) {
            for (EdgeRouting r : ROUTINGS) {
                for (String d : List.of("RIGHT", "LEFT", "DOWN", "UP")) {
                    out.add(full("routing-direction", f.id, r.name() + "-" + d, f.rel, null,
                            fopts("EDGE_ROUTING", E("EdgeRouting", r), "DIRECTION", E("Direction", d))));
                }
            }
        }
        componentSpecs(out);
        optionSpecs(out);
        issueSpecs(out);
    }

    /** The issues family (T1 step 3): the tickets of the suites allocated to this brief, with the options of their Java configurators:
     * Issue587Test sets the edge router on the root (three variants), Issue603Test sets NODE_LABELS_PLACEMENT insideTopCenter on the root's
     * children and Issue447Test sets size 10 and anchor (5, 5) on every port; the last two are per-element, so the row's input is the
     * configured graph as inline ELK JSON. */
    static void issueSpecs(List<Spec> out) {
        for (String rel : ISSUE_INPUTS) {
            String name = rel.substring(rel.lastIndexOf('/') + 1).replace(".elkt", "");
            if (name.startsWith("587_")) {
                for (EdgeRouting r : ROUTINGS) {
                    out.add(full("issues", name, "routing-" + r.name(), rel, null, fopts("EDGE_ROUTING", E("EdgeRouting", r))));
                }
            } else if (name.startsWith("603_")) {
                ElkNode g = loadFile(rel);
                var option = LayoutMetaDataService.getInstance().getOptionData(pid("NODE_LABELS_PLACEMENT"));
                for (ElkNode c : g.getChildren()) {
                    c.setProperty(option, option.parseValue("[H_CENTER, V_TOP, INSIDE]"));
                }
                out.add(full("issues", name, "node-labels-inside-top-center", null, export(g), fopts()));
            } else if (name.startsWith("447_")) {
                ElkNode g = loadFile(rel);
                List<ElkNode> nodes = new ArrayList<>();
                for (TreeIterator<EObject> it = g.eAllContents(); it.hasNext();) {
                    if (it.next() instanceof ElkNode n) {
                        nodes.add(n);
                    }
                }
                for (ElkNode n : nodes) {
                    for (org.eclipse.elk.graph.ElkPort port : n.getPorts()) {
                        port.setWidth(PORT_SIZE_447);
                        port.setHeight(PORT_SIZE_447);
                        port.setProperty(LayeredOptions.PORT_ANCHOR, new KVector(PORT_ANCHOR_447, PORT_ANCHOR_447));
                    }
                }
                out.add(full("issues", name, "port-size-10-anchor-5", null, export(g), fopts()));
            } else {
                out.add(full("issues", name, "default", rel, null, fopts()));
            }
        }
    }

    static final double PORT_SIZE_447 = 10, PORT_ANCHOR_447 = 5; // Issue447Test.java:60-61

    // Full rows: components and options families (inline graphs)

    /** T with the given ports, children and edges; the options tOpts (constant, value, ...) are T's own layout options. */
    static String hierT(String tOpts, String ports, String kids, String edges) {
        return "{\"id\":\"root\",\"children\":[{\"id\":\"T\",\"width\":300,\"height\":200,\"layoutOptions\":{" + tOpts
                + "},\"ports\":[" + ports + "],\"children\":[" + kids + "],\"edges\":[" + edges + "]}]}";
    }

    static String small(String id, int w, int h) {
        return kn(id, w, h, null);
    }

    /** Three (a, b, c) or five (a, b, c, d, e) components without external ports. */
    static String gCompsFlat(String ro, boolean five) {
        String kids = join(small("a0", 40, 20), small("a1", 30, 30), small("a2", 50, 20), small("b0", 30, 40), small("b1", 40, 25),
                small("c0", 60, 40));
        String edges = eds("a0>a1", "a1>a2", "b0>b1");
        if (five) {
            kids += "," + join(small("d0", 20, 20), small("k0", 35, 35), small("k1", 30, 20));
            edges += "," + edsFrom(3, "k0>k1");
        }
        return flat(ro, kids, edges);
    }

    /** T with external ports W, W, E, E (and N, S when all): components X (p0 to p2), Z (p1), V (p3), Y (inner only), U (N), Q (S). */
    static String gCompsExt(String tOpts, boolean all) {
        String ports = join(pj("T", 0, W_, null), pj("T", 1, W_, null), pj("T", 2, E_, null), pj("T", 3, E_, null))
                + (all ? "," + join(pj("T", 4, N_, null), pj("T", 5, S_, null)) : "");
        String kids = join(small("x0", 40, 20), small("x1", 30, 30), small("z0", 30, 20), small("v0", 40, 30), small("y0", 30, 30),
                small("y1", 40, 20)) + (all ? "," + join(small("u0", 30, 30), small("q0", 35, 25)) : "");
        String edges = eds("T.p0>x0", "x0>x1", "x1>T.p2", "T.p1>z0", "v0>T.p3", "y0>y1")
                + (all ? "," + edsFrom(6, "T.p4>u0", "q0>T.p5") : "");
        return hierT(tOpts, ports, kids, edges);
    }

    static void componentSpecs(List<Spec> out) {
        for (boolean four : new boolean[] {false, true}) {
            String name = four ? "flat-five" : "flat-three";
            String elk = gCompsFlat("", four);
            for (ComponentOrderingStrategy o : ComponentOrderingStrategy.values()) {
                out.add(full("components", name, "ordering-" + o.name(), null, elk,
                        fopts("CONSIDER_MODEL_ORDER_COMPONENTS", E("ComponentOrderingStrategy", o))));
            }
            out.add(full("components", name, "separate-false", null, elk, fopts("SEPARATE_CONNECTED_COMPONENTS", Z(false))));
        }
        for (boolean all : new boolean[] {false, true}) {
            String name = all ? "ext-all-sides" : "ext-west-east";
            for (ComponentOrderingStrategy o : ComponentOrderingStrategy.values()) {
                out.add(full("components", name, "ordering-" + o.name(), null,
                        gCompsExt(ropts("PORT_CONSTRAINTS", FS, "CONSIDER_MODEL_ORDER_COMPONENTS", o.name()), all), fopts()));
            }
            out.add(full("components", name, "separate-false", null,
                    gCompsExt(ropts("PORT_CONSTRAINTS", FS, "SEPARATE_CONNECTED_COMPONENTS", "false"), all), fopts()));
            out.add(full("components", name, "port-constraints-free", null,
                    gCompsExt(ropts("PORT_CONSTRAINTS", "FREE"), all), fopts()));
            out.add(full("components", name, "port-constraints-fixed-order", null,
                    gCompsExt(ropts("PORT_CONSTRAINTS", "FIXED_ORDER"), all), fopts()));
        }
    }

    static void optionSpecs(List<Spec> out) {
        String longG = gLongG(""), fan = gFanG(""), chain = gj("", 4, null, new int[][] {{0, 1}, {1, 2}, {2, 3}, {0, 2}, {0, 3}}, null);
        String feedback = gj("", 3, null, new int[][] {{0, 1}, {1, 2}, {2, 0}}, null);
        out.add(full("options", "feedback-edges", "ring", null, feedback, fopts("FEEDBACK_EDGES", Z(true))));
        out.add(full("options", "feedback-edges", "long-edges", null, longG, fopts("FEEDBACK_EDGES", Z(true))));
        String positioned = gj("", 5, new double[][] {{0, 0}, {120, 80}, {120, 10}, {240, 60}, {360, 30}},
                new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}}, null);
        out.add(full("options", "interactive-layout", "positioned", null, positioned, fopts("INTERACTIVE_LAYOUT", Z(true))));
        out.add(full("options", "interactive-layout", "unpositioned", null, chain, fopts("INTERACTIVE_LAYOUT", Z(true))));
        out.add(full("options", "position-and-layer-ids", "long-edges", null, longG, fopts("GENERATE_POSITION_AND_LAYER_IDS", Z(true))));
        out.add(full("options", "position-and-layer-ids", "fan", null, fan, fopts("GENERATE_POSITION_AND_LAYER_IDS", Z(true))));
        out.add(full("options", "hypernode", "fan-in-out", null, gHypernode(true, ""), fopts()));
        out.add(full("options", "hypernode", "more-incoming", null, gHypernode(false, ""), fopts()));
        for (int seed : new int[] {7, 42}) {
            out.add(full("options", "random-seed", "long-edges-" + seed, null, longG, fopts("RANDOM_SEED", tv("int", seed))));
            out.add(full("options", "random-seed", "fan-" + seed, null, fan, fopts("RANDOM_SEED", tv("int", seed))));
        }
        String[] hAlign = {"H_LEFT", "H_CENTER", "H_RIGHT"}, vAlign = {"V_TOP", "V_CENTER", "V_BOTTOM"};
        for (String h : hAlign) {
            for (String v : vAlign) {
                String ro = sizeOpts(h, v);
                out.add(full("options", "content-alignment", "flat-" + h + "-" + v, null, gLongG(ro), fopts()));
            }
        }
        for (String hv : List.of("H_RIGHT,V_BOTTOM", "H_CENTER,V_CENTER", "H_LEFT,V_TOP")) {
            String[] a = hv.split(",");
            out.add(full("options", "content-alignment", "external-ports-" + a[0] + "-" + a[1], null, gExtG(sizeOpts(a[0], a[1]), 0), fopts()));
        }
        out.add(full("options", "node-size", "minimum-without-constraint", null,
                gLongG(ropts("NODE_SIZE_MINIMUM", "(400,300)")), fopts()));
        out.add(full("options", "node-size", "minimum-default-size", null,
                gLongG(ropts("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_OPTIONS", "[DEFAULT_MINIMUM_SIZE]")), fopts()));
        out.add(full("options", "node-size", "fixed-graph-size", null,
                gLongG(ropts("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_MINIMUM", "(400,300)", "NODE_SIZE_FIXED_GRAPH_SIZE", "true")), fopts()));
        for (String pad : List.of("[top=0,left=0,bottom=0,right=0]", "[top=5,left=10,bottom=15,right=20]", "[top=40,left=1,bottom=2,right=3]")) {
            out.add(full("options", "padding", "flat-" + pad.replaceAll("[^0-9a-z]+", "-"), null, gLongG(ropts("PADDING", pad)), fopts()));
            out.add(full("options", "padding", "external-ports-" + pad.replaceAll("[^0-9a-z]+", "-"), null, gExtG(ropts("PADDING", pad), 0), fopts()));
        }
        for (int off : new int[] {0, 5, -5}) {
            out.add(full("options", "port-border-offset", "external-ports-" + off, null, gExtG("", off), fopts()));
        }
    }

    static String sizeOpts(String h, String v) {
        return ropts("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_MINIMUM", "(500,400)", "CONTENT_ALIGNMENT", "[" + h + ", " + v + "]");
    }

    /** Six nodes of different sizes with long edges (dummies). */
    static String gLongG(String ro) {
        String kids = join(kn("n0", 30, 30, null), kn("n1", 40, 60, null), kn("n2", 30, 20, null), kn("n3", 50, 30, null),
                kn("n4", 30, 80, null), kn("n5", 30, 30, null));
        return flat(ro, kids, eds("n0>n1", "n1>n2", "n2>n3", "n3>n4", "n0>n3", "n0>n4", "n1>n5", "n5>n4"));
    }

    /** A fan out and in with seven nodes of different sizes and one long edge. */
    static String gFanG(String ro) {
        String kids = join(kn("n0", 30, 20, null), kn("n1", 30, 50, null), kn("n2", 40, 30, null), kn("n3", 30, 40, null),
                kn("n4", 30, 60, null), kn("n5", 30, 25, null), kn("n6", 50, 35, null));
        return flat(ro, kids, eds("n0>n1", "n0>n2", "n0>n3", "n1>n4", "n2>n4", "n3>n4", "n2>n5", "n5>n6", "n4>n6", "n0>n6"));
    }

    /** A port with a border offset (0 = unset). */
    static String pjo(String node, int index, String side, int borderOffset) {
        String p = pj(node, index, side, null);
        return borderOffset == 0 ? p : p.replace("\"layoutOptions\":{", "\"layoutOptions\":{\"" + pid("PORT_BORDER_OFFSET") + "\":\"" + borderOffset + "\",");
    }

    /** T (own options tOpts, FIXED_SIDE) with external ports on every side, the imported level being T's. */
    static String gExtG(String tOpts, int borderOffset) {
        String ports = join(pjo("T", 0, W_, borderOffset), pjo("T", 1, E_, borderOffset), pjo("T", 2, N_, borderOffset),
                pjo("T", 3, N_, borderOffset), pjo("T", 4, S_, borderOffset), pjo("T", 5, S_, borderOffset));
        String kids = join(at("c0", 40, 40), at("c1", 90, 40), at("c2", 140, 40), at("c3", 190, 40));
        String edges = eds("c0>c1", "c1>c2", "c2>c3", "T.p0>c0", "c3>T.p1", "T.p2>c1", "T.p3>c3", "c0>T.p4", "c2>T.p5");
        return hierT(ropts("PORT_CONSTRAINTS", FS) + (tOpts.isEmpty() ? "" : "," + tOpts), ports, kids, edges);
    }

    /** A hypernode h (size 6): two sources and three sinks when outMore (it moves right), else three sources and two sinks (left). */
    static String gHypernode(boolean outMore, String ro) {
        String hn = kn("h", 6, 6, null, "HYPERNODE", "true");
        String kids = outMore ? join(kn("a", 30, 30, null), kn("b", 30, 50, null), hn, kn("d", 30, 30, null), kn("e", 30, 60, null),
                kn("g", 40, 30, null))
                : join(kn("a", 30, 30, null), kn("b", 30, 50, null), kn("c", 30, 40, null), hn, kn("d", 30, 30, null),
                        kn("e", 30, 60, null));
        String edges = outMore ? eds("a>h", "b>h", "h>d", "h>e", "h>g") : eds("a>h", "b>h", "c>h", "h>d", "h>e");
        return flat(rr(EdgeRouting.ORTHOGONAL) + (ro.isEmpty() ? "" : "," + ro), kids, edges);
    }

    static String rrs(EdgeRouting r) {
        return rr(r);
    }

    // Group scenarios (F1, step 5): inline graphs, the step list is the assembled plan cut at the stop

    static List<Spec> SCENARIOS;
    static final Map<String, String[]> CROSS = new LinkedHashMap<>();
    static final Map<String, String[]> COMP_CROSS = new LinkedHashMap<>();
    /** Scenario rows per family; the coverage check wants at least two per processor, direction and placer. */
    static final Map<String, Integer> FAMILIES = new TreeMap<>();

    static List<String> planOfGraph(String elk, String target) {
        ElkNode t = importTarget(ElkGraphJson.forGraph(elk).toElk(), target);
        LGraph g = new ElkGraphTransformer().importGraph(t);
        ElkLayered layered = new ElkLayered();
        return positionalNames(layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g)));
    }

    /** importGraph, normalise, [componentsSplit], then the plan's members in order up to and including the stop (null = the whole plan). */
    static List<Object> chainOf(String elk, String target, String stop, boolean components) {
        List<String> plan = planOfGraph(elk, target);
        List<Object> st = new ArrayList<>(List.of(imp(target), norm()));
        if (components) {
            st.add(S("componentsSplit"));
        }
        boolean hit = stop == null;
        for (String name : plan) {
            if (!allowed(name)) {
                throw new Bug("scenario plan names " + name + " outside the 7b-7f sets: " + plan);
            }
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

    static void add(String id, String elk, String target, List<Object> steps) {
        SCENARIOS.add(new Spec(id, "scenarios", null, () -> ElkGraphJson.forGraph(elk).toElk(), target, new TreeMap<>(), null, steps));
    }

    /** scenarios/<cls>/<name>: stop = a plan member name, or null for the whole plan; family counts toward the coverage check. */
    static void sc(String cls, String name, String family, String elk, String target, String stop) {
        List<String> plan = planOfGraph(elk, target);
        String stopName = stop == null ? plan.get(plan.size() - 1) : stop;
        List<Object> st = chainOf(elk, target, stopName, false);
        st.add(dump());
        String id = "scenarios/" + cls + "/" + name;
        add(id, elk, target, st);
        CROSS.put(id, new String[] {elk, target, stopName});
        FAMILIES.merge(family, 1, Integer::sum);
    }

    /** Two rows for a graph with several components: .../split (the component list) and .../combine (the target after combine). */
    static void scComp(String name, String family, String elk, String target) {
        List<Object> split = new ArrayList<>(List.of(imp(target), norm(), S("componentsSplit")));
        add("scenarios/ComponentsProcessor/" + name + "/split", elk, target, split);
        List<Object> combine = chainOf(elk, target, null, true);
        combine.add(S("componentsCombine"));
        String id = "scenarios/ComponentsProcessor/" + name + "/combine";
        add(id, elk, target, combine);
        COMP_CROSS.put(id, new String[] {elk, target});
        FAMILIES.merge(family, 1, Integer::sum);
    }

    static String gNorthSouthG(String ro) {
        return flat(ro, join(plain("a"), pnode("b", FS, null, W_, N_, N_, S_, S_, E_), plain("c"), plain("d"), plain("e")),
                eds("a>b.p0", "a>b.p1", "b.p2>c", "b.p3>d", "a>b.p4", "b.p5>e", "c>e", "d>e", "a>e"));
    }

    /** b has a normal WEST input and EAST output, an inverted EAST input (from d) and an inverted WEST output (to e). */
    static String gInLayerG(String ro) {
        return flat(ro, join(plain("a"), pnode("b", FS, null, W_, E_, E_, W_), plain("c"), plain("d"), plain("e")),
                eds("a>b.p0", "b.p1>c", "d>b.p2", "b.p3>e"));
    }

    static String pjl(String node, int index, String side) {
        return pj(node, index, side, null).replace("\"height\":4", "\"height\":4,\"labels\":[{\"text\":\"p" + index + "\",\"width\":14,\"height\":8}]");
    }

    static String lnode(String id, int w, int h, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pjl(id, i, sides[i]));
        }
        String opts = ropts("PORT_CONSTRAINTS", FS, "NODE_LABELS_PLACEMENT", "[H_CENTER, V_TOP, INSIDE]", "PORT_LABELS_PLACEMENT", "[OUTSIDE]",
                "NODE_SIZE_CONSTRAINTS", "[PORTS, PORT_LABELS, NODE_LABELS]");
        return sz(nodeJson(id, null, opts, "\"labels\":[{\"text\":\"" + id + "\",\"width\":24,\"height\":10}],\"ports\":[" + String.join(",", ports) + "]"), w, h);
    }

    /** Labels on nodes and ports (no edge labels): the label geometry is what GraphTransformer mirrors and transposes. */
    static String gLabelsG(String ro) {
        return flat(ro, join(lnode("n0", 40, 30, E_, S_), lnode("n1", 50, 40, W_, E_, N_), lnode("n2", 40, 30, W_, E_), lnode("n3", 40, 30, W_, N_)),
                eds("n0.p0>n1.p0", "n1.p1>n2.p0", "n2.p1>n3.p0", "n0.p1>n3.p1", "n1.p2>n2.p0"));
    }

    static String gLayerCons(String ro) {
        String kids = join(kn("n0", 30, 30, null, "LAYERING_LAYER_CONSTRAINT", "FIRST"), kn("n1", 40, 40, null, "LAYERING_LAYER_CONSTRAINT", "FIRST_SEPARATE"),
                kn("n2", 30, 20, null), kn("n3", 50, 30, null), kn("n4", 30, 50, null), kn("n5", 30, 30, null, "LAYERING_LAYER_CONSTRAINT", "LAST"),
                kn("n6", 30, 20, null, "LAYERING_LAYER_CONSTRAINT", "LAST_SEPARATE"));
        return flat(ro, kids, eds("n0>n2", "n1>n2", "n2>n3", "n2>n4", "n3>n5", "n4>n5", "n4>n6"));
    }

    /** Port constraints pc on T's external ports W, E, N, N, S, S (ratio and position values for FIXED_RATIO / FIXED_POS). */
    static String gExtPc(String pc, boolean chain, String extra) {
        String[] sides = {W_, E_, N_, N_, S_, S_};
        double[][] xy = {{0, 50}, {300, 60}, {80, 0}, {200, 0}, {90, 200}, {210, 200}};
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            String p = pj("T", i, sides[i], pc.equals(FP) ? xy[i] : null);
            ports.add(pc.equals("FIXED_RATIO") ? p.replace("\"layoutOptions\":{", "\"layoutOptions\":{\"" + pid("PORT_RATIO_OR_POSITION") + "\":\"" + (0.2 + 0.1 * i) + "\",") : p);
        }
        String kids = join(at("c0", 40, 40), at("c1", 90, 40), at("c2", 140, 40), at("c3", 190, 40));
        String edges = chain ? eds("c0>c1", "c1>c2", "c2>c3", "T.p0>c0", "c3>T.p1", "T.p2>c1", "T.p3>c3", "c0>T.p4", "c2>T.p5")
                : eds("T.p0>c0", "T.p2>c1", "c0>c2", "c1>c2", "c1>c3", "c2>T.p1", "c3>T.p4", "c0>T.p5");
        return hierT(ropts("PORT_CONSTRAINTS", pc) + (extra.isEmpty() ? "" : "," + extra), String.join(",", ports), kids, edges);
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        Map<String, java.util.function.UnaryOperator<String>> graphs = new LinkedHashMap<>();
        graphs.put("long-edges", ro -> gLongG(ro));
        graphs.put("north-south-ports", ro -> gNorthSouthG(ro));
        graphs.put("labels", ro -> gLabelsG(ro));
        graphs.put("layer-constraints", ro -> gLayerCons(ro));
        graphs.put("in-layer-edges", ro -> gInLayerG(ro));
        for (String d : DIRECTIONS) {
            for (Map.Entry<String, java.util.function.UnaryOperator<String>> g : graphs.entrySet()) {
                String elk = g.getValue().apply(ropts("DIRECTION", d));
                sc("GraphTransformer", d + "/" + g.getKey() + "/pre", "GraphTransformer/" + d, elk, null, DPRE);
                sc("GraphTransformer", d + "/" + g.getKey() + "/post", "GraphTransformer/" + d, elk, null, DPOST);
            }
        }
        for (String pc : List.of("FREE", FS, "FIXED_ORDER", "FIXED_RATIO", FP)) {
            for (boolean chain : new boolean[] {true, false}) {
                String elk = gExtPc(pc, chain, "");
                String name = pc + "/" + (chain ? "chain" : "fan");
                sc("HierarchicalPortOrthogonalEdgeRouter", name + "/router", "HPOER/" + pc, elk, "T", HPOER);
                sc("HierarchicalPortOrthogonalEdgeRouter", name + "/end", "HPOER/" + pc, elk, "T", null);
            }
        }
        for (String d : DIRECTIONS) {
            for (boolean chain : new boolean[] {true, false}) {
                String elk = gExtPc(FS, chain, ropts("DIRECTION", d));
                String name = "direction-" + d + "/" + (chain ? "chain" : "fan");
                sc("HierarchicalPortOrthogonalEdgeRouter", name + "/router", "HPOER/" + d, elk, "T", HPOER);
                sc("HierarchicalPortOrthogonalEdgeRouter", name + "/end", "HPOER/" + d, elk, "T", null);
            }
        }
        sc("HypernodesProcessor", "sinks-more", "HYPERNODE_PROCESSOR", gHypernode(true, ""), null, HNP);
        sc("HypernodesProcessor", "sources-more", "HYPERNODE_PROCESSOR", gHypernode(false, ""), null, HNP);
        sc("HypernodesProcessor", "wide-spacing", "HYPERNODE_PROCESSOR",
                gHypernode(true, ropts("SPACING_EDGE_EDGE_BETWEEN_LAYERS", "30", "SPACING_NODE_NODE_BETWEEN_LAYERS", "50")), null, HNP);
        String positioned = gj("", 5, new double[][] {{0, 0}, {120, 80}, {120, 10}, {240, 60}, {360, 30}},
                new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}}, null);
        String chain = gj("", 4, null, new int[][] {{0, 1}, {1, 2}, {2, 3}, {0, 2}, {0, 3}}, null);
        String ids = ropts("GENERATE_POSITION_AND_LAYER_IDS", "true");
        Map<String, String> idGraphs = new LinkedHashMap<>();
        idGraphs.put("long-edges", gLongG(ids));
        idGraphs.put("fan", gFanG(ids));
        idGraphs.put("chain", chain.replace("\"layoutOptions\":{}", "\"layoutOptions\":{" + ids + "}"));
        for (Map.Entry<String, String> g : idGraphs.entrySet()) {
            sc("ConstraintsPostprocessor", "position-ids/" + g.getKey(), "CONSTRAINTS_POSTPROCESSOR", g.getValue(), null, CPP);
        }
        sc("ConstraintsPostprocessor", "interactive/positioned", "CONSTRAINTS_POSTPROCESSOR",
                positioned.replace("\"layoutOptions\":{}", "\"layoutOptions\":{" + ropts("INTERACTIVE_LAYOUT", "true") + "}"), null, CPP);
        sc("ConstraintsPostprocessor", "interactive/chain", "CONSTRAINTS_POSTPROCESSOR",
                chain.replace("\"layoutOptions\":{}", "\"layoutOptions\":{" + ropts("INTERACTIVE_LAYOUT", "true") + "}"), null, CPP);
        sc("EndLabelSorter", "long-edges", "END_LABEL_SORTER", gLongG(""), null, ELS);
        sc("EndLabelSorter", "fan", "END_LABEL_SORTER", gFanG(""), null, ELS);
        sc("EndLabelSorter", "north-south-ports", "END_LABEL_SORTER", gNorthSouthG(""), null, ELS);
        String rows3 = gCompsFlat("", false), rows5 = gCompsFlat("", true);
        scComp("simple-row/three", "components/SimpleRowGraphPlacer", rows3, null);
        scComp("simple-row/five", "components/SimpleRowGraphPlacer", rows5, null);
        String mo = ropts("CONSIDER_MODEL_ORDER_COMPONENTS", "MODEL_ORDER");
        scComp("simple-row/model-order-sorted", "components/SimpleRowGraphPlacer", gCompsFlat(mo, true), null);
        scComp("group/west-east", "components/ComponentGroupGraphPlacer", gCompsExt(ropts("PORT_CONSTRAINTS", FS), false), "T");
        scComp("group/all-sides", "components/ComponentGroupGraphPlacer", gCompsExt(ropts("PORT_CONSTRAINTS", FS), true), "T");
        scComp("group/free-ports", "components/ComponentGroupGraphPlacer", gCompsExt(ropts("PORT_CONSTRAINTS", "FREE"), true), "T");
        for (String o : List.of("GROUP_MODEL_ORDER", "MODEL_ORDER")) {
            String fam = o.equals("MODEL_ORDER") ? "components/ModelOrderRowGraphPlacer" : "components/ComponentGroupModelOrderGraphPlacer";
            scComp(o.toLowerCase().replace('_', '-') + "/west-east", fam, gCompsExt(ropts("PORT_CONSTRAINTS", FS, "CONSIDER_MODEL_ORDER_COMPONENTS", o), false), "T");
            scComp(o.toLowerCase().replace('_', '-') + "/all-sides", fam, gCompsExt(ropts("PORT_CONSTRAINTS", FS, "CONSIDER_MODEL_ORDER_COMPONENTS", o), true), "T");
        }
    }

    // Group sites (T15, F12, plans/layered-pipeline/unreached.md): step rows recorded by the interpreter above, one per S scenario.

    /** A sites row. Unlike a scenarios row it checks the FULL plan of its graph against the ported sets: the driver builds the whole plan first. */
    static void site(List<Spec> out, String id, String elk, String target, List<Object> steps) {
        for (String name : planOfGraph(elk, target)) {
            if (!allowed(name)) {
                throw new Bug("sites row " + id + ": the full plan names " + name + ", outside the 7b-7f sets");
            }
        }
        out.add(new Spec(id, "sites", null, () -> ElkGraphJson.forGraph(elk).toElk(), target, new TreeMap<>(), null, steps));
    }

    /** importGraph, normalise, the plan up to and including the stop, dump. */
    static void siteStop(List<Spec> out, String id, String elk, String target, String stop) {
        List<Object> st = chainOf(elk, target, stop, false);
        st.add(dump());
        site(out, id, elk, target, st);
    }

    /** importGraph, normalise, componentsSplit, the whole plan on each component, componentsCombine. */
    static void siteCombine(List<Spec> out, String id, String elk, String target) {
        List<Object> st = chainOf(elk, target, null, true);
        st.add(S("componentsCombine"));
        site(out, id, elk, target, st);
    }

    /** importGraph, normalise, then the whole layout through LayeredLayoutProvider (monitor cancelled in advance when so). */
    static void siteLayout(List<Spec> out, String id, String elk, boolean cancelled) {
        site(out, id, elk, null, steps(imp(null), norm(), S(cancelled ? "layoutCancelled" : "layout")));
    }

    /** A hypernode of size 6x6 with FIXED_SIDE ports on the given sides (ids <id>.p0, <id>.p1). */
    static String hpn(String id, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj(id, i, sides[i], null));
        }
        return sz(nodeJson(id, null, ropts("PORT_CONSTRAINTS", FS, "HYPERNODE", "true"), "\"ports\":[" + String.join(",", ports) + "]"), 6, 6);
    }

    /** The node JSON with its width replaced (kn takes an int). */
    static String wide(String node, String width) {
        return node.replaceFirst("\"width\":[0-9.]+", "\"width\":" + width);
    }

    static String nodeLabel(String text) {
        return "\"labels\":[{\"text\":\"" + text + "\",\"width\":24,\"height\":10}]";
    }

    /** T (FIXED_SIDE, PORT_LABELS size constraint, the given PORT_LABELS_PLACEMENT value) with labelled ports W, E, N, N, S, S. */
    static String gExtLabelled(String placement) {
        String[] sides = {W_, E_, N_, N_, S_, S_};
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pjl("T", i, sides[i]));
        }
        String kids = join(at("c0", 40, 40), at("c1", 90, 40), at("c2", 140, 40), at("c3", 190, 40));
        String edges = eds("c0>c1", "c1>c2", "c2>c3", "T.p0>c0", "c3>T.p1", "T.p2>c1", "T.p3>c3", "c0>T.p4", "c2>T.p5");
        return hierT(ropts("PORT_CONSTRAINTS", FS, "NODE_SIZE_CONSTRAINTS", "[PORTS, PORT_LABELS]", "PORT_LABELS_PLACEMENT", placement),
                String.join(",", ports), kids, edges);
    }

    /**
     * T (FIXED_SIDE, LEFT) with a N port and a W port, where the child c0 or c2 has the SEPARATE layer constraint: LayerConstraintPreprocessor
     * hides it and, the N dummy's only edge being to it, gives the N dummy FIRST (c0 FIRST_SEPARATE, c0 > N port) or LAST (c2 LAST_SEPARATE,
     * N port > c2), which GraphTransformer mirrors at DIRECTION_POSTPROCESSOR.
     */
    static String gSeparate(boolean first) {
        String kids = join(kn("c0", 30, 20, null, first ? new String[] {"LAYERING_LAYER_CONSTRAINT", "FIRST_SEPARATE"} : new String[0]),
                small("c1", 30, 20), kn("c2", 30, 20, null, first ? new String[0] : new String[] {"LAYERING_LAYER_CONSTRAINT", "LAST_SEPARATE"}));
        String edges = first ? eds("c0>T.p0", "c0>c1", "c1>c2", "T.p1>c1") : eds("T.p0>c2", "c0>c1", "c1>c2", "T.p1>c1");
        return hierT(ropts("PORT_CONSTRAINTS", FS, "DIRECTION", "LEFT"), join(pj("T", 0, N_, null), pj("T", 1, W_, null)), kids, edges);
    }

    static void siteSpecs(List<Spec> out) {
        // Sc1-Sc3: the whole layout
        String flat = flat("", join(pnode("a", FS, null, E_), plain("b"), plain("c")), eds("a.p0>b", "b>c"));
        siteLayout(out, "sites/LayeredLayoutProvider/flat", flat, false);
        String apart = flat("", join(pnode("a", FS, new double[] {10, 20}, E_), nodeJson("b", new double[] {200, 30}, null, null),
                nodeJson("c", new double[] {400, 50}, null, null)), eds("a.p0>b"));
        siteLayout(out, "sites/LayeredLayoutProvider/cancelled", apart, true);
        siteLayout(out, "sites/LayeredLayoutProvider/cancelledOneComponent",
                flat("", join(pnode("a", FS, new double[] {10, 20}, E_), nodeJson("b", new double[] {200, 30}, null, null),
                        nodeJson("c", new double[] {400, 50}, null, null)), eds("a.p0>b", "b>c")), true);
        String tiny = flat(ropts("NODE_SIZE_CONSTRAINTS", "[MINIMUM_SIZE]", "NODE_SIZE_OPTIONS", "", "NODE_SIZE_MINIMUM", "(0,0)",
                "PADDING", "[top=0,left=0,bottom=0,right=0]", "SPACING_NODE_NODE_BETWEEN_LAYERS", "1", "SPACING_EDGE_NODE_BETWEEN_LAYERS", "1",
                "SPACING_EDGE_EDGE_BETWEEN_LAYERS", "1", "SPACING_NODE_NODE", "1"), join(kn("a", 2, 2, null), kn("b", 2, 2, null)), eds("a>b"));
        siteLayout(out, "sites/ElkLayered/resize/noDefaultMinimum", tiny, false);
        siteLayout(out, "sites/ElkLayered/resize/defaultMinimum", tiny.replace("\"" + pid("NODE_SIZE_OPTIONS") + "\":\"\"",
                "\"" + pid("NODE_SIZE_OPTIONS") + "\":\"[DEFAULT_MINIMUM_SIZE]\""), false);

        // Sc4: GraphTransformer under ROTATION
        for (String d : List.of("LEFT", "DOWN", "UP")) {
            String elk = gNorthSouthG(ropts("DIRECTION", d, "DIRECTION_CONGRUENCY", "ROTATION"));
            siteStop(out, "sites/GraphTransformer/rotation/" + d + "/pre", elk, null, DPRE);
            siteStop(out, "sites/GraphTransformer/rotation/" + d + "/post", elk, null, DPOST);
        }
        // Sc5: node alignment under mirroring and transposing
        for (String d : List.of("LEFT", "UP", "DOWN")) {
            for (String al : List.of("LEFT", "RIGHT", "TOP", "BOTTOM")) {
                String kids = join(kn("n0", 30, 30, null), kn("n1", 40, 30, null, "ALIGNMENT", al), kn("n2", 30, 40, null));
                siteStop(out, "sites/GraphTransformer/alignment/" + d + "/" + al, flat(ropts("DIRECTION", d), kids, eds("n0>n1", "n1>n2")), null, DPRE);
            }
        }
        // Sc6: layer constraint FIRST / LAST that LayerConstraintPreprocessor gave an external port dummy
        siteStop(out, "sites/GraphTransformer/layerConstraint/FIRST", gSeparate(true), "T", DPOST);
        siteStop(out, "sites/GraphTransformer/layerConstraint/LAST", gSeparate(false), "T", DPOST);
        // Sc7: node label placement holding only V_* flags (n0) and only H_* flags (n1)
        siteStop(out, "sites/GraphTransformer/nodeLabelPlacement", flat(ropts("DIRECTION", "DOWN"),
                join(kn("n0", 40, 30, nodeLabel("v"), "NODE_LABELS_PLACEMENT", "[V_TOP, INSIDE]", "NODE_SIZE_CONSTRAINTS", "[NODE_LABELS]"),
                        kn("n1", 40, 30, nodeLabel("h"), "NODE_LABELS_PLACEMENT", "[H_LEFT, INSIDE]", "NODE_SIZE_CONSTRAINTS", "[NODE_LABELS]"),
                        kn("n2", 30, 30, null)), eds("n0>n1", "n1>n2")), null, DPRE);

        // Sc8-Sc12: component placers
        String fs = ropts("PORT_CONSTRAINTS", FS);
        String groupPorts = join(pj("T", 0, W_, null), pj("T", 1, E_, null), pj("T", 2, N_, null), pj("T", 3, S_, null));
        siteCombine(out, "sites/ComponentGroupGraphPlacer/newGroup", hierT(fs, groupPorts,
                join(small("a0", 40, 20), small("b0", 30, 30), small("c0", 30, 20)),
                eds("T.p2>a0", "a0>T.p3", "T.p0>b0", "b0>T.p1")), "T");
        siteCombine(out, "sites/ComponentGroupGraphPlacer/rowWrap", hierT(fs, join(pj("T", 0, W_, null), pj("T", 1, E_, null)),
                join(small("x0", 40, 20), small("u0", 40, 20), small("u1", 40, 20), small("u2", 40, 20), small("u3", 40, 20)),
                eds("T.p0>x0", "x0>T.p1")), "T");
        String gmo = ropts("PORT_CONSTRAINTS", FS, "CONSIDER_MODEL_ORDER_COMPONENTS", "GROUP_MODEL_ORDER");
        for (String d : List.of("DOWN", "UP")) {
            String dir = gmo + "," + ropts("DIRECTION", d);
            siteCombine(out, "sites/ComponentGroupModelOrderGraphPlacer/vertical/" + d + "/WEST", hierT(dir,
                    join(pj("T", 0, W_, null), pj("T", 1, W_, null)),
                    join(small("y0", 30, 30), small("y1", 40, 20), small("z0", 30, 20), small("z1", 40, 20)),
                    eds("y0>y1", "T.p0>z0", "T.p1>z1")), "T");
            siteCombine(out, "sites/ComponentGroupModelOrderGraphPlacer/vertical/" + d + "/EAST", hierT(dir,
                    join(pj("T", 0, E_, null), pj("T", 1, E_, null)),
                    join(small("y0", 30, 30), small("y1", 40, 20), small("v0", 30, 20), small("v1", 40, 20)),
                    eds("y0>y1", "v0>T.p0", "v1>T.p1")), "T");
        }
        siteCombine(out, "sites/ComponentGroupModelOrderGraphPlacer/newGroup", hierT(gmo, groupPorts,
                join(small("a0", 40, 20), small("b0", 30, 30), small("c0", 30, 20)),
                eds("T.p2>a0", "a0>T.p3", "T.p0>b0", "b0>T.p1")), "T");
        siteCombine(out, "sites/SimpleRowGraphPlacer/priority", flat("", join(kn("a0", 40, 20, null, "PRIORITY", "1"),
                kn("b0", 30, 30, null, "PRIORITY", "5"), kn("c0", 50, 20, null, "PRIORITY", "3")), ""), null);


        // Sc14, Sc16, Sc17: HypernodesProcessor. A hypernode's ports are always FREE (ElkGraphImporter.java:961), so PortSideProcessor gives them
        // WEST / EAST sides only: Sc15 (a NORTH or SOUTH port) cannot be reached. The left branch starts from bendx = Integer.MAX_VALUE
        // (HypernodesProcessor.java:104), so it finds edges only for x beyond 2^31: the sources are 2.2e9 wide.
        String ortho = rr(EdgeRouting.ORTHOGONAL);
        String huge = "2200000000";
        String sink = kn("h", 6, 6, null, "HYPERNODE", "true");
        siteStop(out, "sites/HypernodesProcessor/moreLeftEdges/south", flat(ortho, join(wide(kn("a", 30, 30, null), huge),
                wide(kn("b", 30, 50, null), huge), sink), eds("a>h", "b>h")), null, HNP);
        siteStop(out, "sites/HypernodesProcessor/moreLeftEdges/aboveAndBelow", flat(ortho, join(wide(kn("a", 30, 20, null), huge),
                wide(kn("b", 30, 20, null), huge), wide(kn("c", 30, 20, null), huge), sink), eds("a>h", "b>h", "c>h")), null, HNP);
        // A moves right first and trims the first bend of A > B.p0; B (two WEST ports, so it moves left) then meets a one-bend edge
        String source = kn("A", 6, 6, null, "HYPERNODE", "true");
        siteStop(out, "sites/HypernodesProcessor/moreLeftEdges/trimmed", flat(ortho, join(source, wide(kn("z", 30, 30, null), huge),
                wide(kn("z2", 30, 80, null), huge), wide(kn("x", 30, 30, null), huge), wide(kn("y", 30, 50, null), huge),
                hpn("B", W_, W_)), eds("A>x", "A>y", "A>B.p0", "z>B.p1", "z2>B.p1")), null, HNP);
        siteStop(out, "sites/HypernodesProcessor/notShifted", flat(ortho, join(kn("a", 30, 30, null),
                wide(kn("h", 30, 30, null, "HYPERNODE", "true"), "200"), kn("d", 30, 30, null), kn("e", 30, 60, null)),
                eds("a>h", "h>d", "h>e")), null, HNP);
        // two EAST ports, whose hyperedges have different first bends; junction chains that hold another point first
        siteStop(out, "sites/HypernodesProcessor/bendChoice", flat(ortho, join(kn("a", 30, 30, null), hpn("h", E_, E_), kn("d", 30, 30, null),
                kn("e", 30, 60, null), kn("g", 30, 40, null), kn("k", 30, 20, null)),
                eds("a>h.p1", "h.p1>d", "h.p1>e", "h.p0>g", "h.p0>k")), null, HNP);

        // Sc13: HierarchicalPortOrthogonalEdgeRouter restoring labelled N/S external port dummies
        siteStop(out, "sites/HierarchicalPortOrthogonalEdgeRouter/portLabels/inside", gExtLabelled("[INSIDE]"), "T", HPOER);
        siteStop(out, "sites/HierarchicalPortOrthogonalEdgeRouter/portLabels/outside", gExtLabelled("[OUTSIDE]"), "T", HPOER);
        siteStop(out, "sites/HierarchicalPortOrthogonalEdgeRouter/portLabels/neither", gExtLabelled(""), "T", HPOER);
    }

    // Cross check (PIPELINE_CROSSCHECK): scenario chains against pipeline rows, component rows against ElkLayered.doLayout

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
                if ("v".equals(System.getenv("PIPELINE_CROSSCHECK"))) {
                    System.err.println("pipeline prefix of " + s.id + ": " + r.prefix + "\nsteps " + json(s.steps));
                }
            } catch (RuntimeException e) {
                if ("v".equals(System.getenv("PIPELINE_CROSSCHECK"))) {
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

    /** A component row's combined node geometry equals the node geometry after ElkLayered.doLayout on a fresh import. */
    @SuppressWarnings("unchecked")
    static void crossCheckComponents(List<Spec> specs) {
        for (Spec s : specs) {
            String[] c = COMP_CROSS.get(s.id);
            if (c == null || (FILTER != null && !s.id.contains(FILTER))) {
                continue;
            }
            String elk = export(ElkGraphJson.forGraph(c[0]).toElk());
            Map<String, Object> step = runSteps(ElkGraphJson.forGraph(elk).toElk(), s.steps);
            LGraph g = new ElkGraphTransformer().importGraph(importTarget(ElkGraphJson.forGraph(elk).toElk(), c[1]));
            Base base = new Base(g);
            new ElkLayered().doLayout(g, new BasicProgressMonitor());
            Map<String, Object> nodes = (Map<String, Object>) ((Map<String, Object>) step.get("geometry")).get("nodes");
            for (LNode n : base.nodes) {
                String path = base.paths.get(n);
                Map<String, Object> nm = (Map<String, Object>) nodes.get(path);
                String want = json(List.of(pair(n.getPosition()), pair(n.getSize())));
                String got = json(List.of(nm.get("pos"), nm.get("size")));
                if (!want.equals(got)) {
                    throw new Bug("component cross check " + s.id + ": node " + path + " differs: doLayout " + want + " steps " + got);
                }
            }
        }
        System.err.println("component cross check ok");
    }

    // Build and main

    static final String FILTER = System.getenv("PIPELINE_FILTER");
    static final boolean MARKERS = System.getenv("PIPELINE_MARKERS") != null;
    static final boolean DISCOVER = System.getenv("PIPELINE_DISCOVER") != null;
    static final boolean CROSSCHECK = System.getenv("PIPELINE_CROSSCHECK") != null;
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
                    + (SEVEN_E.contains(m.name()) ? 1 : 0) + (SEVEN_F.contains(m.name()) ? 1 : 0)
                    + (REFUSAL_CATEGORIES.containsKey(m.name()) ? 1 : 0);
            if (sets != 1) {
                throw new Bug("IntermediateProcessorStrategy." + m.name() + " is in " + sets + " of the ported sets and refusal categories");
            }
        }
    }

    static final Map<String, Integer> REFUSED_BY_FAMILY = new TreeMap<>();
    static final Map<String, Long> BYTES = new TreeMap<>();

    /** The key of a refusal or oracle throw: models rows "<model>/<level>", full rows "<family>/<model>" (ids split on "/"). */
    static String rowKey(Spec s) {
        String[] parts = s.id.split("/");
        return parts[1] + "/" + parts[2];
    }

    static boolean planned(Spec s) {
        return s.group.equals("models") || s.group.equals("full");
    }

    /** Records every row; returns the output file text. */
    static String buildAll() {
        RAN.clear();
        REFUSED_ROWS.clear();
        REFUSED_BY_FAMILY.clear();
        NOT_IN_PLAN.clear();
        ORACLE_THROWN.clear();
        FAMILIES.clear();
        CROSS.clear();
        COMP_CROSS.clear();
        BYTES.clear();
        buildProcessorNames();
        checkClassification();
        List<Spec> specs = new ArrayList<>();
        List<Spec> fulls = new ArrayList<>();
        modelSpecs(specs, fulls);
        scenarioSpecs(specs);
        siteSpecs(specs);
        specs.addAll(0, fulls);
        if (CROSSCHECK) {
            crossCheck(specs);
            crossCheckComponents(specs);
        }
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
                String key = rowKey(s) + "/" + r.member;
                if (DISCOVER) {
                    System.err.println("DISCOVER refusal " + key + (REFUSAL_CATEGORIES.containsKey(r.member) ? "" : "  OUTSIDE F1"));
                } else if (!planned(s) || !ACCEPTED_REFUSALS.contains(key) || !REFUSAL_CATEGORIES.containsKey(r.member)) {
                    throw r;
                }
                REFUSED_ROWS.merge(key, 1, Integer::sum);
                REFUSED_BY_FAMILY.merge(s.id.split("/")[s.group.equals("full") ? 1 : 0] + " | "
                        + REFUSAL_CATEGORIES.getOrDefault(r.member, "OUTSIDE F1"), 1, Integer::sum);
                continue;
            } catch (NotInPlan e) {
                if (!s.group.equals("models")) {
                    throw e;
                }
                NOT_IN_PLAN.merge(s.id.split("/")[3], 1, Integer::sum);
                continue;
            } catch (NullPointerException | ArrayIndexOutOfBoundsException e) {
                String key = rowKey(s) + "/" + e.getClass().getSimpleName() + "@"
                        + e.getStackTrace()[0].getClassName().replaceAll(".*[.$]", "");
                if (DISCOVER) {
                    System.err.println("DISCOVER oracle throws " + key);
                } else if (!planned(s) || !ORACLE_THROWS.contains(key)) {
                    throw e;
                }
                ORACLE_THROWN.merge(key, 1, Integer::sum);
                continue;
            } catch (org.eclipse.elk.core.UnsupportedConfigurationException e) {
                if (!planned(s)) {
                    throw e;
                }
                System.err.println("skipped row " + s.id + " (oracle throws UnsupportedConfigurationException: " + e.getMessage() + ")");
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
        REFUSED_ROWS.forEach((k, n) -> System.err.println("refused (accepted) " + n + " rows: " + k));
        REFUSED_BY_FAMILY.forEach((k, n) -> System.err.println("refusal category " + k + ": " + n + " rows"));
        NOT_IN_PLAN.forEach((k, n) -> System.err.println("stop not in the algorithm (skipped) " + n + " rows: " + k));
        ORACLE_THROWN.forEach((k, n) -> System.err.println("oracle throws (accepted, skipped) " + n + " rows: " + k));
        if (System.getenv("PIPELINE_STATS") != null) {
            BYTES.forEach((kind, v) -> System.err.println("STATS " + v + " " + kind));
        }
        System.err.println("rows " + rows.size() + " " + counts);
        return fileText(counts, rows);
    }

    /** F1/step 5 coverage: every processor of this brief ran in a step row; two scenarios per processor, direction, placer, constraint. */
    static void checkCoverage() {
        List<String> missing = new ArrayList<>();
        for (String m : SEVEN_F) {
            if (!RAN.contains(m)) {
                missing.add(m);
            }
        }
        for (String d : DIRECTIONS) {
            if (FAMILIES.getOrDefault("GraphTransformer/" + d, 0) < 2 || FAMILIES.getOrDefault("HPOER/" + d, 0) < 2) {
                missing.add("two scenarios of direction " + d);
            }
        }
        for (String pc : List.of("FREE", FS, "FIXED_ORDER", "FIXED_RATIO", FP)) {
            if (FAMILIES.getOrDefault("HPOER/" + pc, 0) < 2) {
                missing.add("two scenarios of HPOER " + pc);
            }
        }
        for (String f : List.of("HYPERNODE_PROCESSOR", "CONSTRAINTS_POSTPROCESSOR", "END_LABEL_SORTER", "components/SimpleRowGraphPlacer",
                "components/ComponentGroupGraphPlacer", "components/ComponentGroupModelOrderGraphPlacer", "components/ModelOrderRowGraphPlacer")) {
            if (FAMILIES.getOrDefault(f, 0) < 2) {
                missing.add("two scenarios of " + f);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("no step row covers " + missing);
        }
        System.err.println("skipped levels and stops are listed above; row timeouts: 0 (a timeout stops the recording)");
    }

    static void setup(String vectorsDir) throws Exception {
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/layered-pipeline-vectors.sh does)");
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

    // --sweep / --dump (F6, T14)

    static final long CASE_TIMEOUT_SECONDS = 20, CASE_STACK_BYTES = 64L * 1024 * 1024;
    static final String PTOLEMY_DIR = "realworld/ptolemy", JSON_EXTENSION = ".json", STATUS = "status", KIND_LEVEL = "level", KIND_MODEL = "model";
    static final List<String> MODEL_DIRECTIONS = List.of("RIGHT", "LEFT", "DOWN", "UP");

    /** One sweep case: kind, model, target (null: root) and the variant (a routing for levels, a direction for models). */
    record SweepCase(String kind, String model, String target, String variant) {
        String id() {
            return kind.equals(KIND_LEVEL) ? "level/" + model + "/" + levelName(target) + "/" + variant : "model/" + model + "/" + variant;
        }
    }

    static ElkNode loadText(String text) {
        return ElkGraphJson.forGraph(text).toElk();
    }

    static List<String> sweepModels(Path modelsDir) throws IOException {
        try (var files = Files.walk(modelsDir.resolve(PTOLEMY_DIR))) {
            return files.filter(p -> p.toString().endsWith(JSON_EXTENSION))
                    .map(p -> modelsDir.relativize(p).toString().replace('\\', '/'))
                    .map(f -> f.substring(0, f.length() - JSON_EXTENSION.length())).sorted().toList();
        }
    }

    /** Levels: null (root), then every ElkNode with children and a unique id (the recorder's levels() rule). */
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

    static List<SweepCase> sweepCases(String model, String text) {
        List<SweepCase> out = new ArrayList<>();
        for (String t : sweepTargets(text, model)) {
            if (new Base(new ElkGraphTransformer().importGraph(importTarget(loadText(text), t))).edges.isEmpty()) {
                System.err.println("skipped level " + model + " " + levelName(t) + " (no edges)");
                continue;
            }
            for (EdgeRouting r : ROUTINGS) {
                out.add(new SweepCase(KIND_LEVEL, model, t, r.name()));
            }
        }
        for (String d : MODEL_DIRECTIONS) {
            out.add(new SweepCase(KIND_MODEL, model, null, d));
        }
        return out;
    }

    static String hx(double d) {
        return String.format("%016x", Double.doubleToRawLongBits(d));
    }

    static List<Object> box(org.eclipse.elk.graph.ElkShape s) {
        return List.of(hx(s.getX()), hx(s.getY()), hx(s.getWidth()), hx(s.getHeight()));
    }

    static List<Object> labelsOf(ElkGraphElement e) {
        List<Object> out = new ArrayList<>();
        e.getLabels().forEach(l -> out.add(box(l)));
        return out;
    }

    static List<Object> point(double x, double y) {
        return List.of(hx(x), hx(y));
    }

    static Map<String, Object> edgeDump(org.eclipse.elk.graph.ElkEdge e) {
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

    /** The canonical tree of a laid-out ElkGraph subtree (see the header). */
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

    /** The plan of a level (nothing run): the first member outside the 7b-7f sets, or null. */
    static String firstRefused(List<String> plan) {
        return plan.stream().filter(name -> !allowed(name)).findFirst().orElse(null);
    }

    static Map<String, Object> levelCanonical(SweepCase c, String text) {
        ElkNode probe = importTarget(loadText(text), c.target());
        probe.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.valueOf(c.variant()));
        ElkLayered planner = new ElkLayered();
        String refused = firstRefused(positionalNames(planner.getLayoutTestConfiguration(
                planner.prepareLayoutTest(new ElkGraphTransformer().importGraph(probe)))));
        if (refused != null) {
            throw new Refusal("level " + c.id() + " names " + refused, refused);
        }
        ElkNode level = importTarget(loadText(text), c.target());
        level.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.valueOf(c.variant()));
        ElkGraphTransformer transformer = new ElkGraphTransformer();
        LGraph lgraph = transformer.importGraph(level);
        new ElkLayered().doLayout(lgraph, new BasicProgressMonitor().withMaxHierarchyLevels(0));
        transformer.applyLayout(lgraph);
        return elkDump(level);
    }

    static Map<String, Object> modelCanonical(SweepCase c, String text) {
        ElkNode root = loadText(text);
        root.setProperty(CoreOptions.DIRECTION, org.eclipse.elk.core.options.Direction.valueOf(c.variant()));
        refuseOptions(root);
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
        for (List<Object> plan : recorder.processors.values()) {
            String refused = firstRefused(positionalNames(plan));
            if (refused != null) {
                throw new Refusal("model " + c.id() + " names " + refused, refused);
            }
        }
        return elkDump(root);
    }

    /** Runs the case on a thread with a big stack; null when the timeout fires. */
    static Map<String, Object> runCase(SweepCase c, String text) throws Throwable {
        java.util.concurrent.FutureTask<Map<String, Object>> task = new java.util.concurrent.FutureTask<>(
                () -> {
                    currentRow = c.id();
                    return c.kind().equals(KIND_LEVEL) ? levelCanonical(c, text) : modelCanonical(c, text);
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
        m.put("kind", c.kind());
        m.put("model", c.model());
        m.put("target", c.target());
        m.put(c.kind().equals(KIND_LEVEL) ? "routing" : "direction", c.variant());
    }

    static Map<String, Object> sweepOutcome(SweepCase c, String text) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.id());
        try {
            Map<String, Object> dump = runCase(c, text);
            if (dump == null) {
                m.put(STATUS, "timeout");
                return m;
            }
            describe(m, c);
            m.put("sha256", sha256Text(canonicalText(dump)));
        } catch (Refusal r) {
            m.put(STATUS, "refused");
            m.put("processor", r.member);
            if (!REFUSAL_CATEGORIES.containsKey(r.member)) {
                System.err.println("refusal OUTSIDE F1: " + c.id() + " " + r.member);
            }
        } catch (Throwable e) {
            m.put(STATUS, "throws");
            describe(m, c);
            m.put("class", e.getClass().getSimpleName());
            m.put("message", String.valueOf(e.getMessage()));
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
        Map<String, Integer> counts = new TreeMap<>(), refusals = new TreeMap<>();
        List<String> models = sweepModels(modelsDir);
        long start = System.currentTimeMillis();
        try (var out = Files.newBufferedWriter(outDir.resolve("results.jsonl"), StandardCharsets.UTF_8)) {
            for (int i = 0; i < models.size(); i++) {
                String text = Files.readString(modelsDir.resolve(models.get(i) + JSON_EXTENSION), StandardCharsets.UTF_8);
                for (SweepCase c : sweepCases(models.get(i), text)) {
                    Map<String, Object> m = sweepOutcome(c, text);
                    String status = String.valueOf(m.getOrDefault(STATUS, "ok"));
                    counts.merge(c.kind() + " " + status, 1, Integer::sum);
                    if (status.equals("refused")) {
                        String member = (String) m.get("processor");
                        refusals.merge(c.kind() + " " + REFUSAL_CATEGORIES.getOrDefault(member, "OUTSIDE F1") + " " + member, 1, Integer::sum);
                    }
                    out.write(json(m));
                    out.write('\n');
                }
                out.flush();
                System.err.println("model " + (i + 1) + "/" + models.size() + " " + models.get(i) + " "
                        + (System.currentTimeMillis() - start) / 1000 + " s " + counts);
            }
        }
        System.err.println("sweep done " + counts + " in " + (System.currentTimeMillis() - start) / 1000 + " s");
        System.err.println("refusals " + refusals);
    }

    /** Writes the canonical form of one case (the text the hash is taken over) to <outDir>/<id with / as _>.json. */
    static void dump(String id, Path modelsDir, Path outDir) throws Throwable {
        for (String model : sweepModels(modelsDir)) {
            if (!id.startsWith(KIND_LEVEL + "/" + model + "/") && !id.startsWith(KIND_MODEL + "/" + model + "/")) {
                continue;
            }
            String text = Files.readString(modelsDir.resolve(model + JSON_EXTENSION), StandardCharsets.UTF_8);
            for (SweepCase c : sweepCases(model, text)) {
                if (!c.id().equals(id)) {
                    continue;
                }
                Map<String, Object> dump = runCase(c, text);
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
