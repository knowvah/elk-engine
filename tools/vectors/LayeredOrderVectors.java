// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7c, T1, C2-C4) for the org.eclipse.elk.alg.layered crossing
// minimization (p3order, p3order.counting), the greedy switch processors (intermediate.greedyswitch), the model order
// comparators (intermediate.preserveorder) and the eight processors a default pipeline runs between P2 and P3. The
// Java is the spec; this program only CALLS ELK APIs (reflection where a member is private) and records results; it
// embeds no ELK implementation.
// Run: tools/vectors/layered-order-vectors.sh <outDir>
//      (java -cp ... LayeredOrderVectors.java <outDir> <tools/vectors dir>)
//
// Output <outDir>/layered-order.json (2-space top level, one compact JSON row per line, trailing newline):
//   { jdk, oracle, rowCounts: { models, scenarios, sites }, rows: [row...] }
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable, rows are ordered
//   group "models", then "scenarios", then "sites" (T11: step rows for the branches the others leave untaken, see sites below).
//   The row kind is told by steps: null = pipeline row, else step row.
//
// input: { path, sha256 } = a vendored file under test/golden/inputs (repo-relative path, SHA-256 of its bytes; .json is
//   ELK JSON, .elkt the textual format) taken as is; or { elk: <ELK JSON object> } = the prepared graph exported by
//   ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
//   .omitUnknownLayoutOptions(true).prettyPrint(false) under system property org.eclipse.elk.graph.json.exportSeed=1,
//   embedded as a JSON OBJECT (not a string; Infinity/-Infinity/NaN tokens become the strings "Infinity", "-Infinity",
//   "NaN"). A prepared input is run from a fresh import of that export, both times (an .elkt edge has no id until the
//   export gives it one and ORIGIN would differ). The output is strict-parsed (Gson JsonReader, non-lenient).
// target: ELK id of the ElkNode whose DIRECT children are imported (flat import: no HierarchyHandling), or null for the
//   root. The row's graph is ElkGraphTransformer.importGraph(<that node>) (7a importGraph(targetId)). Hierarchy levels
//   with no edge in the imported LGraph are skipped by the recorder (journaled on stderr). Flat levels only (C3): a
//   nested LGraph stops the recording (the GraphInfoHolder child graphs, sweepInHierarchicalNodes and the hierarchical
//   greedy switch are U until 7h).
// options: C4 map { <property id>: <C4 value> } of pipeline rows, applied with setProperty to the ELK node that is
//   imported (target or root) after the input is loaded. It always holds org.eclipse.elk.separateConnectedComponents =
//   false (B3, ComponentsProcessor.split is 7h). RANDOM_SEED stays the default 1 (a seed of 0 stops the recording; the
//   scenarios group sets seeds 2 and 3 on some rows to reach the second ISweepPortDistributor, see below).
//   Step rows have options {} (their graph carries its options; the steps set the rest).
// prefix: pipeline rows: the ordered names of every processor of ElkLayered.getLayoutTestConfiguration that ran up to
//   and including the stop, each an IntermediateProcessorStrategy member name, "P1_CYCLE_BREAKING/<STRATEGY>",
//   "P2_LAYERING/<STRATEGY>" or "P3_NODE_ORDERING/<STRATEGY>" (CrossingMinimizationStrategy). The two greedy switch
//   arms and LAYER_SWEEP / MEDIAN_LAYER_SWEEP are all LayerSweepCrossingMinimizer instances
//   (IntermediateProcessorStrategy.java:316-317 and :361-362, CrossingMinimizationStrategy.java:67-71): they are told
//   apart by the private field crossMinType (read by reflection). Step rows: null.
//
// Pipeline rows (steps null): graph = import(target); state0 = after ElkLayered.prepareLayoutTest(lgraph)
//   (GraphConfigurator.configureGraphProperties + copyPortContraints + the assembled algorithm), then the plan is
//   walked with runLayoutTestStep up to and including the stop. Stops: "P1" / "P2" / "P3" = the configured phase
//   (the class CrossingMinimizationStrategy.create() returns for P3), else an IntermediateProcessorStrategy member
//   (the greedy switch members stop at the LayerSweepCrossingMinimizer instance of that type, after the P3 phase).
//   A stop the assembled algorithm does not contain (INVERTED_PORT_PROCESSOR without non-free ports,
//   NORTH_SOUTH_PORT_PREPROCESSOR without north/south ports, HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR without external
//   ports, a greedy switch above GraphConfigurator.activateGreedySwitchFor's node threshold) skips the row; the skips
//   are counted on stderr. REFUSAL RULE (B4, C2): a prefix naming anything that is not one of the ten 7b members
//   (EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER, LAYER_CONSTRAINT_PREPROCESSOR, LAYER_CONSTRAINT_POSTPROCESSOR,
//   REVERSED_EDGE_RESTORER, INTERACTIVE_EXTERNAL_PORT_POSITIONER, NODE_PROMOTION, HIGH_DEGREE_NODE_LAYER_PROCESSOR,
//   PARTITION_PREPROCESSOR, PARTITION_MIDPROCESSOR, PARTITION_POSTPROCESSOR), one of the ten 7c members (the eight
//   processors PORT_SIDE_PROCESSOR, PORT_LIST_SORTER, LONG_EDGE_SPLITTER, INVERTED_PORT_PROCESSOR,
//   NORTH_SOUTH_PORT_PREPROCESSOR, HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR, SEMI_INTERACTIVE_CROSSMIN_PROCESSOR,
//   SORT_BY_INPUT_ORDER_OF_MODEL and ONE_SIDED_GREEDY_SWITCH, TWO_SIDED_GREEDY_SWITCH) or a P1/P2/P3 phase makes the
//   recorder exit 1 naming the row. The check runs on the assembled plan BEFORE anything runs. A refusal is accepted
//   only for a models row listed in ACCEPTED_REFUSALS ("<model id>/<target or root>/<first refused member>") whose
//   member is one of C2's categories (LABEL_DUMMY_INSERTER = label dummies, COMMENT_PREPROCESSOR = comments,
//   DIRECTION_PREPROCESSOR = direction, SELF_LOOP_PREPROCESSOR = self loops, BREAKING_POINT_INSERTER = breaking
//   points); the rows of that level are then not recorded. Replay: normalise (below), then run the prefix in order.
//
// Step rows (steps = list of steps, each a JSON array whose first element is the op; paths are baseline paths):
//   ["importGraph", <target id | null>]   import the row's elk (input) as in "target" above; fixes the positional
//        paths (below); the dump baseline is the state right after this step until a "normalise" step.
//   ["normalise"]                         exactly GraphConfigurator.configureGraphProperties(lgraph) (it calls
//        copyPortContraints itself): edge-spacing clamp 2.0, DIRECTION via LGraphUtil.getDirection when UNDEFINED,
//        InternalProperties.RANDOM = new Random(seed) (seed 0 = recording stops), favor-straightness default, original
//        port constraints on every node, Spacings. The dump baseline becomes the state after this step.
//   ["setProperty", <path>, <property id>, <C4 value>]   element(path).setProperty(property, value); path of an LGraph,
//        LNode, LPort or LEdge; value decoded from C4 (bool, int, string, double, enum {t,c,n} with c the simple name of
//        an enum of org.eclipse.elk.alg.layered.options or org.eclipse.elk.core.options). Options the importer reads
//        (CONSIDER_MODEL_ORDER_STRATEGY sets MODEL_ORDER on nodes, ports and edges) belong in the ELK input, not here.
//   ["layers", [[<node path>...], ...]]   per inner list in order: layer = new Layer(g); g.getLayers().add(layer);
//        node.setLayer(layer) for each listed node in order (setLayer leaves g.getLayerlessNodes() untouched,
//        as LNode.setLayer does; every listed node therefore stays in layerless too); unlisted nodes stay layerless.
//   ["reverseEdge", <edge path>]          edge.reverse(lgraph, true)
//   ["runProcessor", "<MEMBER>"]          IntermediateProcessorStrategy.<MEMBER>.create().process(lgraph, monitor); the
//        member must be one of the ten 7b or the ten 7c members.
//   ["runPhase", "P1_CYCLE_BREAKING"|"P2_LAYERING"|"P3_NODE_ORDERING", "<STRATEGY>"]   CycleBreakingStrategy |
//        LayeringStrategy | CrossingMinimizationStrategy.<STRATEGY>.create().process(lgraph, monitor)
//   ["dump"]                              last step, exactly once: records expected (below)
//   An ELK or JDK exception thrown by a step stops the recording (no row records one).
//
// Positional paths (7a): fixed at import and NEVER recomputed when nodes move into layers: "g0" the LGraph, "g0/n3" the
//   4th node (layerless nodes in list order), "g0/n3/p1" a port, "g0/e2" an edge (per graph in the order node, port,
//   outgoing edge, then incoming edges not seen yet). Elements first met later (created by a processor) are named
//   "new/n<k>", "new/p<k>", "new/e<k>" with k counting per kind from 0 in the order the traversal below meets them.
//   Rows only ever import flat graphs (one LGraph, no nested graphs; anything else stops the recording).
//   Traversal (current state): nodes = the layerless nodes, then the nodes of the layers in layer order (7a dump
//   order), then baseline nodes not met (hidden ones); ports = per node in that order, its ports in list order;
//   edges = the 7a dump order of the current state (per node, port, outgoing then incoming not seen) and then
//   baseline edges not met (detached ones), then edges only reachable from a baseline node not met.
//
// expected (B2 + C3): { layers: [[node path]] (the root LGraph's layers in order), layerless: [node path],
//   hidden: [node path] (InternalProperties.HIDDEN_NODES, else []), edges: [{ path, src, tgt, reversed }] (one per edge
//   of the traversal, src/tgt = port paths or null when detached, reversed = InternalProperties.REVERSED),
//   ports: { "<node path>": ["<port path>", ...] } (every node of the traversal, layered or layerless, its ports in
//   list order after the stop: the crossing minimizer writes node and port orders back, SweepCopy.java:93-141;
//   port paths are positional paths of the current state, the same traversal as the dump),
//   changed: [{ path, props }] }.
//   changed: elements in traversal order (the LGraph "g0", nodes, ports, edges, T11: labels), those with at least one property whose
//   C4 value differs from the BASELINE: the state after the "normalise" step (step rows; the post-import state when
//   there is none) or after prepareLayoutTest (pipeline rows). props = { <property id>: <C4 value> } of the changed
//   or added properties, a removed one maps to null. Ids "processors", "random", "spacings" are ignored. A row with no
//   step after "normalise" has changed [].
//   Step rows with fewer than 10 imported nodes also store expected.dump = the full 7a dumpLGraph of the final state
//   ({ graphs: [...] }, T1 verbatim, positional paths recomputed from the final state: its numbering differs from the
//   phase dump's once nodes sit in layers).
//
// C4 values (7a): {t:"bool",v}, {t:"int",v}, {t:"string",v}, {t:"double",v:"<Double.toString>"}, {t:"enum",c,n},
//   {t:"set",c,items}, {t:"list",c,items}, {t:"obj",c,fields}, {ref:"<path>"} an LGraph element, {elk:"<id>"} an
//   ElkGraphElement, null. Doubles elsewhere (the full dump) are 16 lowercase hex digits of the raw bits.
//
// Rows. models/<model>/<target or root>/<stop>/<variant>: every vendored model at every hierarchy level with edges.
//   P3 x {LAYER_SWEEP, MEDIAN_LAYER_SWEEP, INTERACTIVE, NONE} with default options on every level; every processor stop
//   (the eight and ONE_/TWO_SIDED_GREEDY_SWITCH) on every level; on the three smallest flattened ptolemy models and
//   every vendored .elkt (the "variant set") also greedySwitch.type {ONE_SIDED, TWO_SIDED, OFF} x thoroughness {1, 7},
//   semiInteractive, considerModelOrder.strategy {PREFER_EDGES, NODES_AND_EDGES} with and without
//   crossingMinimization.forceNodeModelOrder, and hierarchicalSweepiness +1 / -1 on hierarchical levels.
//   INTERACTIVE rows and the semi-interactive rows take the model with seeded node positions: the configurator of the
//   Java layered tests (7b recorder's interactiveConfigurator: every node of the hierarchy, x or y 0 becomes
//   java.util.Random(0).nextInt(10000), in breadth-first order). BasicCrossingMinimizationTest has no configurator
//   for positions; InteractiveCrossingMinimizer reads the same node positions (InteractiveCrossingMinimizer.java:99-112).
//   SemiInteractiveCrossMinProcessor sorts by the position OPTION of a node (SemiInteractiveCrossMinProcessor.java:62-71),
//   not by its geometry: the semi-interactive rows also set POSITION = (x, y) on every node without one.
//   scenarios/<class>/<name>: inline graphs, steps importGraph, normalise, P1 GREEDY, P2 NETWORK_SIMPLEX (one row a
//   hand-placed layering), the processors a pipeline would run before the stop in IntermediateProcessorStrategy order,
//   the stop and a dump. The first draw of InternalProperties.RANDOM decides ISweepPortDistributor.create
//   (ISweepPortDistributor.java:55-62): seed 1 gives LayerTotalPortDistributor, seed 2 NodeRelativePortDistributor
//   (observed), hence the seed-2/-3 rows.
//
// Checks: every row runs twice from scratch (input re-loaded, or exported and re-imported for elk inputs) and must
//   agree; the whole file is built twice and must be byte-identical; the output is strict-parsed and stays under 16 MiB (raised from 5 MB on 2026-11-03);
//   the 4 CrossingMinimizationStrategy phases and the ten 7c members must each be run by some step row; every vendored
//   input is pinned in MODEL_TABLE (the shell script checks the same lines).
//
// Identity hashes: ELK iterates HashSet<LNode>/HashMap<LNode,...> in identity-hash order, which differs per run. The
//   script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 (every identity hash is the same, so such
//   collections iterate in insertion order, the AD-10 convention of the port) and main fails when the flag is missing.
//   Sets of more than 8 same-bucket entries treeify in a table of 64+ and then do not iterate in insertion order
//   (observed in 7b: insertion order holds for up to 10 entries). AUDIT of the 7c classes (flat levels): the identity-
//   hashed collections that are ITERATED are (a) ModelOrderBarycenterHeuristic.java:212,219,
//   ModelOrderNodeComparator.java:316,323 and ModelOrderPortComparator.java:389,396 (updateBiggerAndSmallerAssociations:
//   they union sets, the result does not depend on the iteration order); (b) SweepCopy.java:138 (updatePortOrder: a per-node sort,
//   order independent); (c) LayerSweepCrossingMinimizer.java:546,552 (graphsWhoseNodeOrderChanged, one GraphInfoHolder
//   on a flat level). HierarchicalPortConstraintProcessor.java:220-234, HyperedgeCrossingsCounter.java:216,
//   BetweenLayerEdgeTwoNodeCrossingsCounter.java:56-58, NorthSouthEdgeNeighbouringNodeCrossingsCounter.java:50,
//   SortByInputModelProcessor.java:110 and ModelOrderPortComparator's targetNodeModelOrder only get/put/contains;
//   ForsterConstraintResolver.java:72 is a LinkedHashMultimap, CrossingsCounter.java:337,354 are TreeSets (ordered by
//   comparator). No 7c class makes an observable decision from the iteration order of an identity-hashed
//   collection, so no row guard is needed (the 7b BFS guard stays for P1 BFS_NODE_ORDER, which no recorded row uses).
//
// Diagnosis aids (environment, output unchanged when unset): ORDER_FILTER=<text> builds only rows whose id contains the
//   text (no coverage check, one build); ORDER_DISCOVER=1 prints refusals instead of stopping; ORDER_MARKERS=1 writes a
//   "ROW <id>" line to stdout per row (class-load attribution with -Xlog:class+init:stdout); PHASE_TRACE=1 writes one
//   stderr line per row.
//
// Code copied from tools/vectors/LayeredPhaseVectors.java (mission 7b, itself copied from LayeredSiteVectors.java;
//   single-file launchers cannot share code, B7): the JSON helpers (Raw, json, write, hex, str), the LGraph Dump class,
//   the C4 Encoder and decode, importGraph/normalise/Base/phaseDump, the step interpreter, the row machinery
//   (Spec, execute, buildRow), strictNumbers and strictParse and the ELK JSON builders (gj, nodeJson, nds, eds, prt, flat,
//   hier). New: the P3 stop and prefix naming, the ports field, the order scenarios and the model rows of this mission.
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


public class LayeredOrderVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "layered-order.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String REPO_PREFIX = "repo:";
    static final String PTOLEMY = "test/golden/inputs/realworld/ptolemy/";
    static final String LAYERED_TESTS = "test/golden/inputs/tests/layered/";
    static final String TICKETS = "test/golden/inputs/tickets/layered/";
    static final int MAX_DEPTH = 8;
    static final int FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = 16L * 1024 * 1024;
    static final String BASE_GRAPH = "g0";
    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING", P3 = "P3_NODE_ORDERING";
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings");
    /**
     * Refusals (B4, C2) the recorder accepts, "<model id>/<target or root>/<member>": the level's imported graph makes
     * ElkLayered add a processor of a later mission (7f label dummies, comments, direction; 7g self loops, breaking
     * points) to the prefix, so its rows cannot be replayed by the 7b + 7c sets and are not recorded. The member is
     * the first refused processor of the prefix. Any other refusal exits 1.
     */
    static final Set<String> ACCEPTED_REFUSALS = Set.of(
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
            "ptolemy-sinewaveoptimization/N1/SELF_LOOP_PREPROCESSOR");
    /** The only refusal categories C2 allows (the members the recorder refuses). */
    static final Set<String> REFUSAL_CATEGORIES = Set.of("LABEL_DUMMY_INSERTER", "COMMENT_PREPROCESSOR",
            "DIRECTION_PREPROCESSOR", "SELF_LOOP_PREPROCESSOR", "BREAKING_POINT_INSERTER");
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
                    items.sort(Comparator.comparing(LayeredOrderVectors::json));
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
        if (c4 instanceof List<?> l) { return l.stream().map(LayeredOrderVectors::decode).toList(); } // T11: a list value (the in-layer successor constraints)
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
        return m;
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
                case "runProcessor" -> runProcessor(graph, (String) s.get(1));
                case "runPhase" -> runPhase(graph, (String) s.get(1), (String) s.get(2));
                case "dump" -> {
                    expected = phaseDump(base);
                    if (need(base).nodes.size() < FULL_DUMP_BELOW) {
                        expected.put("dump", new Dump(graph, true).dump());
                    }
                }
                default -> throw new Bug("unknown op " + op);
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
        if (!SEVEN_B.contains(member) && !SEVEN_C.contains(member)) {
            throw new Bug("processor " + member + " is outside the 7b and 7c sets");
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
        return SEVEN_B.contains(name) || SEVEN_C.contains(name) || name.startsWith(P1 + "/") || name.startsWith(P2 + "/")
                || name.startsWith(P3 + "/");
    }

    /** The name of the processor a row stops after: "P1", "P2", "P3" (the configured phase) or a processor member. */
    static String stopName(String stop, LGraph g) {
        return switch (stop) {
            case "P1" -> P1 + "/" + g.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY).name();
            case "P2" -> P2 + "/" + g.getProperty(LayeredOptions.LAYERING_STRATEGY).name();
            case "P3" -> P3 + "/" + g.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY).name();
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
                throw new Refusal("row " + s.id + ": prefix names " + name + ", outside the 7b and 7c sets", (String) name);
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

    static int parseIntArg(String what, String s) {
        try {
            return Integer.parseInt(s);
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

    /** A row whose input is the model with seeded node positions (INTERACTIVE and semi-interactive crossing minimization). */
    static Spec seeded(ModelFile f, String target, String stop, String variant, TreeMap<String, Object> options,
            CrossingMinimizationStrategy strategy, boolean positionOption) {
        Supplier<ElkNode> prepare = () -> {
            ElkNode root = loadFile(f.rel);
            interactiveConfigurator(root, LayeredOptions.CROSSING_MINIMIZATION_STRATEGY, strategy, SEED_MAX_POS);
            if (positionOption) {
                positionOptionFromGeometry(root);
            }
            return root;
        };
        return new Spec("models/" + f.id + "/" + levelName(target) + "/" + stop + "/" + variant, "models", null, prepare,
                target, options, stop, null);
    }

    static Map<String, Object> strategyOf(CrossingMinimizationStrategy s) {
        return E("CrossingMinimizationStrategy", s);
    }

    static TreeMap<String, Object> sweep(Object... kv) {
        Object[] all = new Object[kv.length + 2];
        all[0] = "CROSSING_MINIMIZATION_STRATEGY";
        all[1] = strategyOf(CrossingMinimizationStrategy.LAYER_SWEEP);
        System.arraycopy(kv, 0, all, 2, kv.length);
        return opts(all);
    }

    static void variantRows(List<Spec> out, ModelFile f, Level level, boolean hierarchical) {
        String t = level.target;
        String ls = "LAYER_SWEEP";
        for (GreedySwitchType g : GreedySwitchType.values()) {
            for (int thoroughness : new int[] {1, 7}) {
                out.add(pipeline(f, t, "P3", ls + "/greedy-" + g.name() + "-thoroughness-" + thoroughness,
                        sweep("CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE", E("GreedySwitchType", g), "THOROUGHNESS",
                                I(thoroughness))));
            }
        }
        out.add(seeded(f, t, "P3", ls + "/semi-interactive", sweep("CROSSING_MINIMIZATION_SEMI_INTERACTIVE", Z(true)),
                CrossingMinimizationStrategy.LAYER_SWEEP, true));
        for (OrderingStrategy o : List.of(OrderingStrategy.PREFER_EDGES, OrderingStrategy.NODES_AND_EDGES)) {
            out.add(pipeline(f, t, "P3", ls + "/model-order-" + o.name(),
                    sweep("CONSIDER_MODEL_ORDER_STRATEGY", E("OrderingStrategy", o))));
            out.add(pipeline(f, t, "P3", ls + "/model-order-" + o.name() + "-force-node-order",
                    sweep("CONSIDER_MODEL_ORDER_STRATEGY", E("OrderingStrategy", o),
                            "CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER", Z(true))));
        }
        if (hierarchical) {
            for (double sweepiness : new double[] {1, -1}) {
                out.add(pipeline(f, t, "P3", ls + "/hierarchical-sweepiness-" + (sweepiness > 0 ? "plus-1" : "minus-1"),
                        sweep("CROSSING_MINIMIZATION_HIERARCHICAL_SWEEPINESS", D(sweepiness))));
            }
        }
    }

    /** The processor stops of every level (ptolemy and .elkt alike): default options, or the option the processor needs. */
    static void processorStops(List<Spec> out, ModelFile f, Level level) {
        String t = level.target;
        // processor stops: the processors are in the algorithm only when the graph asks for them (NotInPlan rows are
        // skipped and counted): INVERTED_PORT_PROCESSOR needs NON_FREE_PORTS, NORTH_SOUTH_PORT_PREPROCESSOR
        // NORTH_SOUTH_PORTS, HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR EXTERNAL_PORTS (GraphConfigurator, the phases'
        // processor configurations).
        for (String p : List.of("PORT_SIDE_PROCESSOR", "PORT_LIST_SORTER", "LONG_EDGE_SPLITTER", "INVERTED_PORT_PROCESSOR",
                "NORTH_SOUTH_PORT_PREPROCESSOR", "HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR")) {
            out.add(pipeline(f, t, p, "default", sweep()));
        }
        out.add(seeded(f, t, "SEMI_INTERACTIVE_CROSSMIN_PROCESSOR", "semi-interactive",
                sweep("CROSSING_MINIMIZATION_SEMI_INTERACTIVE", Z(true)), CrossingMinimizationStrategy.LAYER_SWEEP, true));
        out.add(pipeline(f, t, "SORT_BY_INPUT_ORDER_OF_MODEL", "PREFER_EDGES",
                sweep("CONSIDER_MODEL_ORDER_STRATEGY", E("OrderingStrategy", OrderingStrategy.PREFER_EDGES))));
        for (GreedySwitchType g : List.of(GreedySwitchType.ONE_SIDED, GreedySwitchType.TWO_SIDED)) {
            out.add(pipeline(f, t, g.name() + "_GREEDY_SWITCH", "default",
                    sweep("CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE", E("GreedySwitchType", g))));
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
                for (CrossingMinimizationStrategy cm : CrossingMinimizationStrategy.values()) {
                    TreeMap<String, Object> o = opts("CROSSING_MINIMIZATION_STRATEGY", strategyOf(cm));
                    out.add(cm == CrossingMinimizationStrategy.INTERACTIVE ? seeded(f, lv.target, "P3", cm.name(), o, cm, false)
                            : pipeline(f, lv.target, "P3", cm.name(), o));
                }
                processorStops(out, f, lv);
                if (smallest.contains(f) || f.kind.equals(KIND_ELKT)) {
                    variantRows(out, f, lv, levels.get(f.id).size() > 1 || lv.target != null);
                }
            }
        }
    }

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

    // ------------------------------------------------------------------------------------------------------------
    // Group scenarios (C3): one inline graph per scenario, steps importGraph, normalise, P1 GREEDY, P2 NETWORK_SIMPLEX
    // (or a hand-placed layering), the processors a default pipeline runs before the stop in the order of
    // IntermediateProcessorStrategy (the observed prefix of a pipeline row: LONG_EDGE_SPLITTER, PORT_SIDE_PROCESSOR,
    // INVERTED_PORT_PROCESSOR, PORT_LIST_SORTER, NORTH_SOUTH_PORT_PREPROCESSOR), then the stop and a dump.

    /** A scenario under construction; done() registers it. */
    static final class Sc {
        final String id, elk;
        String target;
        final List<Object> st = new ArrayList<>();

        Sc(String id, String elk, String target) {
            this.id = id;
            this.elk = elk;
            this.target = target;
            st.add(imp(target));
        }

        /** Imports the direct children of the node with this id instead of the root. */
        Sc target(String t) {
            target = t;
            st.set(0, imp(t));
            return this;
        }

        Sc set(String path, String constant, Object c4) {
            st.add(LayeredOrderVectors.set(path, constant, c4));
            return this;
        }

        Sc seed(int seed) {
            return set("g0", "RANDOM_SEED", I(seed));
        }

        Sc norm() {
            st.add(LayeredOrderVectors.norm());
            return this;
        }

        /** normalise, then cycle breaking GREEDY and layering NETWORK_SIMPLEX. */
        Sc base() {
            st.add(LayeredOrderVectors.norm());
            st.add(phase(P1, "GREEDY"));
            st.add(phase(P2, "NETWORK_SIMPLEX"));
            return this;
        }

        /** Feedback edges: PORT_SIDE_PROCESSOR runs before P1 (GraphConfigurator.java:116-118), cycle breaking MODEL_ORDER. */
        Sc baseFeedback() {
            st.add(LayeredOrderVectors.norm());
            st.add(proc(PSP));
            st.add(phase(P1, "MODEL_ORDER"));
            st.add(phase(P2, "NETWORK_SIMPLEX"));
            return this;
        }

        Sc procs(String... members) {
            for (String m : members) {
                st.add(proc(m));
            }
            return this;
        }

        @SafeVarargs
        final Sc layers(List<String>... layers) {
            st.add(layersOf(layers));
            return this;
        }

        Sc p3(String strategy) {
            st.add(phase(P3, strategy));
            return this;
        }

        void done() {
            st.add(LayeredOrderVectors.dump());
            SCENARIOS.add(new Spec(id.startsWith("sites/") ? id : "scenarios/" + id, id.startsWith("sites/") ? "sites" : "scenarios", null, () -> ElkGraphJson.forGraph(elk).toElk(), target,
                    new TreeMap<>(), null, st));
        }
    }

    static Sc sc(String id, String elk) {
        return new Sc(id, elk, null);
    }

    static final String LES = "LONG_EDGE_SPLITTER", PSP = "PORT_SIDE_PROCESSOR", IPP = "INVERTED_PORT_PROCESSOR",
            PLS = "PORT_LIST_SORTER", NSP = "NORTH_SOUTH_PORT_PREPROCESSOR", HPC = "HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR",
            SIC = "SEMI_INTERACTIVE_CROSSMIN_PROCESSOR", SBI = "SORT_BY_INPUT_ORDER_OF_MODEL",
            OSG = "ONE_SIDED_GREEDY_SWITCH", TSG = "TWO_SIDED_GREEDY_SWITCH";
    static final String FS = "FIXED_SIDE", FO = "FIXED_ORDER", FP = "FIXED_POS", FR = "FIXED_RATIO";
    static final String E_ = "EAST", W_ = "WEST", N_ = "NORTH", S_ = "SOUTH";

    /** A port of node id: the id is <node>.p<index>; side may be null (no side given). */
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

    static final String CHAIN5_EXTRA = join(plain("a"), plain("b"), plain("c"), plain("d"), plain("e"));

    // ---- graphs ----

    /** Five chained nodes with three edges that span several layers. */
    static String longEdges() {
        return flat("", CHAIN5_EXTRA, eds("a>b", "b>c", "c>d", "d>e", "a>d", "a>e", "b>e"));
    }

    /** Two sources and two targets whose straight edges cross, plus a shared target. */
    static String crossing() {
        return flat("", join(plain("a"), plain("b"), plain("c"), plain("d"), plain("x")), eds("a>d", "b>c", "a>c", "b>d", "c>x", "d>x"));
    }

    /** A bigger layered graph with several crossings and long edges (ten nodes). */
    static String layered10() {
        return layered10("");
    }

    static String layered10(String rootOpts) {
        String kids = join(plain("a"), plain("b"), plain("c"), plain("d"), plain("e"), plain("f"), plain("g"), plain("h"),
                plain("i"), plain("j"));
        return flat(rootOpts, kids, eds("a>d", "a>e", "b>d", "b>f", "c>e", "c>f", "d>g", "d>h", "e>g", "e>i", "f>h", "f>i", "g>j",
                "h>j", "i>j", "a>g", "b>i", "c>h"));
    }

    /** Source a with a hyperedge-like port (p0 has three edges) and a second port; b, c, d, e targets. */
    static String hyper() {
        return flat("", join(pnode("a", FS, null, E_, E_), pnode("b", FS, null, W_), pnode("c", FS, null, W_, E_), plain("d"),
                plain("e")), eds("a.p0>b.p0", "a.p0>c.p0", "a.p0>e", "a.p1>d", "c.p1>e", "d>e"));
    }

    /** Fixed-side nodes with ports on every side and edges between them. */
    static String sides() {
        return flat("", join(pnode("a", FS, null, E_, E_, S_, N_), pnode("b", FS, null, W_, W_, E_, N_, S_),
                pnode("c", FS, null, W_, E_, N_), plain("d")),
                eds("a.p0>b.p0", "a.p1>c.p0", "a.p2>b.p4", "a.p3>c.p2", "b.p2>c.p0", "b.p3>d", "c.p1>d", "b.p1>d"));
    }

    /** North and south ports with edges to nodes in several layers (and the north port of b feeding c). */
    static String northSouth(String pc) {
        return flat("", join(plain("a"), pnode("b", pc, null, W_, N_, N_, S_, S_, E_), plain("c"), plain("d"), plain("e")),
                eds("a>b.p0", "a>b.p1", "b.p2>c", "b.p3>d", "a>b.p4", "b.p5>e", "c>e", "d>e", "a>e"));
    }

    /** a(p0 E) -> b(p0 E: inverted input), b(p1 W: inverted output) -> c, c -> b via the same inverted pair. */
    static String inverted() {
        return flat("", join(pnode("a", FS, null, E_, W_), pnode("b", FS, null, E_, W_, E_), plain("c"), plain("d")),
                eds("a.p0>b.p0", "b.p1>c", "c>d", "a.p0>b.p2", "b.p1>d", "d>a.p1"));
    }

    /** Many inverted ports (an input on an EAST port, an output on a WEST port): IPP leaves in-layer edges and dummies. */
    static String invertedMany() {
        return flat("", join(pnode("a", FS, null, E_, W_, E_), pnode("b", FS, null, E_, W_, E_, W_), pnode("c", FS, null, W_, E_, W_),
                pnode("d", FS, null, W_, E_, E_), pnode("e", FS, null, W_, W_), plain("f"), plain("g")),
                eds("a.p0>b.p0", "b.p1>c.p0", "c.p1>d.p2", "d.p0>e.p0", "a.p1>f", "f>b.p2", "b.p3>g", "g>e.p1", "a.p2>c.p2",
                        "c.p1>e.p0", "d.p1>g", "a.p0>d.p0"));
    }

    static String external(String pc, int portsPerSide) {
        List<String> ports = new ArrayList<>();
        String[] sideNames = {W_, E_, N_, S_};
        for (int i = 0; i < 4 * portsPerSide; i++) {
            String side = sideNames[i % 4];
            double x = side.equals(W_) ? 0 : side.equals(E_) ? 300 : 40 + 30 * i;
            double y = side.equals(N_) ? 0 : side.equals(S_) ? 200 : 20 + 25 * i;
            ports.add(pj("T", i, side, pc.equals(FP) || pc.equals(FR) ? new double[] {x, y} : null));
        }
        List<String> edges = new ArrayList<>();
        StringBuilder kids = new StringBuilder();
        int cs = 6;
        for (int i = 0; i < cs; i++) {
            kids.append(i == 0 ? "" : ",").append(at("c" + i, 50 + 40 * (i % 3), 40 + 35 * (i / 3)));
        }
        for (int i = 0; i < 4 * portsPerSide; i++) {
            String port = "T.p" + i;
            String c = "c" + (i % cs);
            edges.add(i % 4 == 0 || i % 4 == 2 ? port + ">" + c : c + ">" + port);
        }
        edges.add("c0>c3");
        edges.add("c1>c4");
        edges.add("c3>c5");
        edges.add("c2>c5");
        return hier(opt(), String.join(",", ports), kids.toString(), eds(edges.toArray(new String[0])))
                .replace("\"" + pid("PORT_CONSTRAINTS") + "\":\"FIXED_SIDE\"", "\"" + pid("PORT_CONSTRAINTS") + "\":\"" + pc + "\"");
    }

    /** Nodes with a geometry and the position option SemiInteractiveCrossMinProcessor sorts by. */
    /** A chain c0 -> c1 -> c2 -> c3 whose nodes are all connected to a north or south port of T (and to W/E ports). */
    static String externalChain(String pc) {
        String ports = join(pj("T", 0, W_, null), pj("T", 1, E_, null), pj("T", 2, N_, null), pj("T", 3, N_, null),
                pj("T", 4, S_, null), pj("T", 5, S_, null));
        String kids = join(at("c0", 40, 40), at("c1", 90, 40), at("c2", 140, 40), at("c3", 190, 40));
        return hier(opt(), ports, kids, eds("c0>c1", "c1>c2", "c2>c3", "T.p0>c0", "c3>T.p1", "T.p2>c1", "T.p3>c3", "c0>T.p4", "c2>T.p5"))
                .replace("\"" + pid("PORT_CONSTRAINTS") + "\":\"FIXED_SIDE\"", "\"" + pid("PORT_CONSTRAINTS") + "\":\"" + pc + "\"");
    }

    static String positioned(int n, int[][] edges, double[][] pos) {
        Map<Integer, String> o = new HashMap<>();
        for (int i = 0; i < n; i++) {
            o.put(i, "\"" + pid("POSITION") + "\":\"(" + pos[i][0] + "," + pos[i][1] + ")\"");
        }
        return gj("", n, pos, edges, o);
    }

    // ---- scenarios ----

    static void orderScenarios() {
        longEdgeSplitterScenarios();
        portScenarios();
        externalAndSemiScenarios();
        modelOrderScenarios();
        sweepScenarios();
        medianScenarios();
        interactiveAndNoneScenarios();
        greedyScenarios();
    }

    static void longEdgeSplitterScenarios() {
        sc("LongEdgeSplitter/long-edges", longEdges()).base().procs(LES).done();
        sc("LongEdgeSplitter/fixed-side-ports", hyper()).base().procs(LES).done();
    }

    static void portScenarios() {
        sc("PortSideProcessor/fixed-side", sides()).base().procs(LES, PSP).done();
        // FREE ports without a side: PortSideProcessor assigns EAST to outgoing and WEST to incoming edges.
        String free = flat("", join(nodeJson("a", null, null, "\"ports\":[" + pj("a", 0, null, null) + "," + pj("a", 1, null, null)
                + "]"), nodeJson("b", null, null, "\"ports\":[" + pj("b", 0, null, null) + "]"), plain("c")),
                eds("a.p0>b.p0", "a.p1>c", "b.p0>c"));
        sc("PortSideProcessor/free-ports", free).base().procs(LES, PSP).done();
        sc("PortSideProcessor/fixed-order-north-south", northSouth(FO)).base().procs(LES, PSP).done();
        sc("PortListSorter/fixed-order", flat("", join(pnode("a", FO, null, E_, W_, E_, N_, S_), pnode("b", FO, null, W_, E_, W_, S_),
                plain("c")), eds("a.p0>b.p0", "a.p2>c", "b.p1>c", "a.p1>c", "b.p2>a.p1", "a.p3>c"))).base().procs(LES, PSP, IPP, PLS).done();
        sc("PortListSorter/fixed-side", sides()).base().procs(LES, PSP, IPP, PLS).done();
        sc("InvertedPortProcessor/inverted-ports", inverted()).base().procs(LES, PSP, IPP).done();
        sc("InvertedPortProcessor/long-edges", flat("", join(pnode("a", FS, null, E_, W_), pnode("b", FS, null, E_, W_), plain("c"),
                plain("d"), plain("e")), eds("a.p0>b.p0", "b.p1>c", "c>d", "d>e", "a.p1>e", "a.p0>d", "e>b.p1")))
                        .base().procs(LES, PSP, IPP).done();
        sc("NorthSouthPortPreprocessor/north-south", northSouth(FS)).base().procs(LES, PSP, IPP, PLS, NSP).done();
        sc("NorthSouthPortPreprocessor/fixed-order", northSouth(FO)).base().procs(LES, PSP, IPP, PLS, NSP).done();
        sc("NorthSouthPortPreprocessor/long-edges", flat("", join(plain("a"), pnode("b", FS, null, W_, N_, S_, E_), plain("c"),
                plain("d"), pnode("e", FS, null, N_, W_, S_)), eds("a>b.p0", "b.p1>c", "b.p2>d", "c>e.p1", "d>e.p0", "a>d", "a>e.p2",
                        "b.p3>e.p1"))).base().procs(LES, PSP, IPP, PLS, NSP).done();
    }

    static void externalAndSemiScenarios() {
        for (String pc : List.of(FS, FO, FP)) {
            sc("HierarchicalPortConstraintProcessor/" + pc, external(pc, 1)).target("T").base().procs(HPC).done();
        }
        sc("HierarchicalPortConstraintProcessor/FIXED_RATIO", external(FR, 1)).target("T").base().procs(HPC).done();
        // north and south external ports whose nodes sit in several layers: dummies in each layer between
        sc("HierarchicalPortConstraintProcessor/north-south-chain", externalChain(FS)).target("T").base().procs(HPC).done();
        sc("HierarchicalPortConstraintProcessor/north-south-chain-order", externalChain(FO)).target("T").base().procs(HPC).done();
        sc("HierarchicalPortConstraintProcessor/fixed-order-two-per-side", external(FO, 2)).target("T").base().procs(HPC).done();
        double[][] pos = {{10, 40}, {10, 100}, {10, 10}, {120, 90}, {120, 20}, {240, 60}};
        int[][] edges = {{0, 3}, {1, 4}, {2, 3}, {0, 4}, {3, 5}, {4, 5}, {1, 5}};
        sc("SemiInteractiveCrossMinProcessor/positions", positioned(6, edges, pos))
                .set("g0", "CROSSING_MINIMIZATION_SEMI_INTERACTIVE", Z(true)).base().procs(SIC).done();
        sc("SemiInteractiveCrossMinProcessor/long-edges", positioned(7, new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {0, 3}, {3, 4},
                {0, 4}, {5, 4}, {6, 4}}, new double[][] {{10, 10}, {110, 80}, {110, 10}, {210, 40}, {310, 40}, {10, 200}, {10, 150}}))
                        .set("g0", "CROSSING_MINIMIZATION_SEMI_INTERACTIVE", Z(true)).base().procs(LES, SIC).done();
    }

    /** Root options as JSON members for the model order: the importer reads CONSIDER_MODEL_ORDER_STRATEGY (MODEL_ORDER). */
    static String moRoot(OrderingStrategy o, String... more) {
        String[] kv = new String[2 + more.length];
        kv[0] = "CONSIDER_MODEL_ORDER_STRATEGY";
        kv[1] = o.name();
        System.arraycopy(more, 0, kv, 2, more.length);
        return ropts(kv);
    }

    static void modelOrderScenarios() {
        for (OrderingStrategy o : List.of(OrderingStrategy.PREFER_EDGES, OrderingStrategy.NODES_AND_EDGES, OrderingStrategy.PREFER_NODES)) {
            sc("SortByInputModelProcessor/" + o.name(), flat(moRoot(o), join(pnode("a", FS, null, E_, E_), plain("b"), plain("c"),
                    plain("d"), plain("e"), plain("f")), eds("a.p0>c", "a.p1>b", "a.p0>d", "b>e", "c>e", "d>f", "a.p1>f", "c>f", "b>d")))
                            .base().procs(LES, PSP, IPP, PLS, SBI).done();
        }
        OrderingStrategy ne = OrderingStrategy.NODES_AND_EDGES;
        sc("SortByInputModelProcessor/port-model-order", flat(moRoot(ne, "CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER", "true"),
                join(pnode("a", FO, null, E_, E_, E_), pnode("b", FO, null, W_, W_), plain("c"), plain("d")),
                eds("a.p2>b.p0", "a.p0>c", "a.p1>d", "c>b.p1", "d>c", "a.p0>b.p1"))).base().procs(LES, PSP, IPP, PLS, SBI).done();
        // preserve_order/smallExample and a long-edge variant without their (7f) centre labels.
        sc("SortByInputModelProcessor/preserve-order-small", flat(moRoot(ne), join(plain("l0p0"), plain("l2p0"), plain("l2p1")),
                eds("l0p0>l2p0", "l0p0>l2p1"))).base().procs(LES, PSP, PLS, SBI).done();
        sc("SortByInputModelProcessor/preserve-order-long", flat(moRoot(ne), join(plain("a"), plain("b"), plain("c"), plain("d"),
                plain("e")), eds("a>b", "b>c", "c>d", "a>c", "a>d", "e>d", "e>b"))).base().procs(LES, PSP, PLS, SBI).done();
    }

    /** LAYER_SWEEP rows: the heuristics, distributors, counters and constraint resolver (P3 options reach them). */
    static void sweepScenarios() {
        String ls = "LAYER_SWEEP";
        sc("LayerSweep/crossing", crossing()).base().procs(LES, PSP, PLS).p3(ls).done();
        sc("LayerSweep/layered10", layered10()).base().procs(LES, PSP, PLS).p3(ls).done();
        sc("LayerSweep/layered10-seed-2", layered10()).seed(2).base().procs(LES, PSP, PLS).p3(ls).done();
        sc("LayerSweep/layered10-seed-3", layered10()).seed(3).base().procs(LES, PSP, PLS).p3(ls).done();
        sc("LayerSweep/hyperedge-ports", hyper()).base().procs(LES, PSP, IPP, PLS).p3(ls).done();
        sc("LayerSweep/hyperedge-ports-seed-2", hyper()).seed(2).base().procs(LES, PSP, IPP, PLS).p3(ls).done();
        sc("LayerSweep/ports-all-sides", sides()).base().procs(LES, PSP, IPP, PLS, NSP).p3(ls).done();
        sc("LayerSweep/north-south", northSouth(FS)).base().procs(LES, PSP, IPP, PLS, NSP).p3(ls).done();
        sc("LayerSweep/north-south-seed-2", northSouth(FS)).seed(2).base().procs(LES, PSP, IPP, PLS, NSP).p3(ls).done();
        sc("LayerSweep/inverted-ports", inverted()).base().procs(LES, PSP, IPP, PLS).p3(ls).done();
        sc("LayerSweep/long-edges", longEdges()).base().procs(LES, PSP, PLS).p3(ls).done();
        // in-layer edges: InvertedPortProcessor leaves in-layer connections (InvertedPortProcessor.java:63-72)
        sc("LayerSweep/in-layer-edges", invertedMany()).base().procs(LES, PSP, IPP, PLS).p3(ls).done();
        sc("LayerSweep/in-layer-edges-seed-2", invertedMany()).seed(2).base().procs(LES, PSP, IPP, PLS).p3(ls).done();
        // a hand-placed layering (the nodes stay in the layerless list as LNode.setLayer leaves them)
        sc("LayerSweep/hand-placed-layers", crossing()).norm().layers(L("g0/n0", "g0/n1"), L("g0/n2", "g0/n3"), L("g0/n4"))
                .procs(LES, PSP, PLS).p3(ls).done();
        // in-layer constraints from the semi-interactive processor, layout units from north/south ports
        double[][] pos = {{10, 40}, {10, 100}, {10, 10}, {120, 90}, {120, 20}, {240, 60}};
        sc("LayerSweep/semi-interactive", positioned(6, new int[][] {{0, 3}, {1, 4}, {2, 3}, {0, 4}, {3, 5}, {4, 5}, {1, 5}}, pos))
                .set("g0", "CROSSING_MINIMIZATION_SEMI_INTERACTIVE", Z(true)).base().procs(SIC, LES, PSP, PLS).p3(ls).done();
        sc("LayerSweep/semi-interactive-ns", positioned(6, new int[][] {{0, 3}, {1, 4}, {2, 3}, {0, 4}, {3, 5}, {4, 5}, {1, 5}}, pos))
                .set("g0", "CROSSING_MINIMIZATION_SEMI_INTERACTIVE", Z(true)).seed(2).base().procs(SIC, LES, PSP, PLS).p3(ls).done();
        // model order: ModelOrderBarycenterHeuristic (force node model order), CMGroupModelOrderCalculator, comparators
        String force = "CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER";
        for (OrderingStrategy o : List.of(OrderingStrategy.PREFER_EDGES, OrderingStrategy.NODES_AND_EDGES)) {
            sc("LayerSweep/model-order-" + o.name(), layered10(moRoot(o))).base().procs(LES, PSP, PLS, SBI).p3(ls).done();
            sc("LayerSweep/model-order-force-" + o.name(), layered10(moRoot(o))).set("g0", force, Z(true)).base()
                    .procs(LES, PSP, PLS, SBI).p3(ls).done();
        }
        OrderingStrategy ne = OrderingStrategy.NODES_AND_EDGES;
        sc("LayerSweep/model-order-port-model-order", flat(moRoot(ne, "CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER", "true"),
                join(pnode("a", FO, null, E_, E_, E_), pnode("b", FO, null, W_, W_, E_), pnode("c", FO, null, W_, E_), plain("d"),
                        plain("e")), eds("a.p2>b.p0", "a.p0>c.p0", "a.p1>d", "d>b.p1", "b.p2>e", "c.p1>e", "a.p0>e")))
                                .base().procs(LES, PSP, IPP, PLS, SBI).p3(ls).done();
        sc("LayerSweep/model-order-influence", layered10(moRoot(OrderingStrategy.PREFER_EDGES)))
                .set("g0", "CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE", D(0.001))
                .set("g0", "CONSIDER_MODEL_ORDER_CROSSING_COUNTER_PORT_INFLUENCE", D(0.001)).base().procs(LES, PSP, PLS, SBI).p3(ls).done();
        // long edge ordering strategies and enforced group model order (CMGroupModelOrderCalculator.java:30-50)
        for (String lo : List.of("DUMMY_NODE_OVER", "DUMMY_NODE_UNDER", "EQUAL")) {
            sc("LayerSweep/model-order-long-edge-" + lo, flat(moRoot(ne, "CONSIDER_MODEL_ORDER_LONG_EDGE_STRATEGY", lo), CHAIN5_EXTRA,
                    eds("a>b", "b>c", "c>d", "d>e", "a>d", "a>e", "b>e", "a>c"))).base().procs(LES, PSP, PLS, SBI).p3(ls).done();
        }
        String groups = moRoot(ne, "CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY", "ENFORCED");
        String grouped = flat(groups, nds("n", 8, null, null, opt("CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID", "1"),
                opt("CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID", "2"),
                opt("CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID", "1"),
                opt("CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID", "2")),
                eds("n0>n4", "n0>n5", "n1>n4", "n1>n6", "n2>n5", "n2>n7", "n3>n6", "n3>n7", "n0>n7", "n1>n7"));
        sc("LayerSweep/model-order-group-enforced", grouped).base().procs(LES, PSP, PLS, SBI).p3(ls).done();
        sc("LayerSweep/model-order-group-enforced-force", grouped).set("g0", force, Z(true)).base().procs(LES, PSP, PLS, SBI).p3(ls)
                .done();
        sc("SortByInputModelProcessor/group-enforced", grouped).base().procs(LES, PSP, PLS, SBI).done();
        // feedback edges with the model order cycle breaker (ModelOrderNodeComparator.java:441 feedback target nodes)
        String fb = flat(moRoot(ne, "FEEDBACK_EDGES", "true"), join(plain("a"), plain("b"), plain("c"), plain("d"), plain("e")),
                eds("a>b", "b>c", "c>d", "d>b", "c>e", "e>a", "d>e"));
        sc("LayerSweep/model-order-feedback-edges", fb).baseFeedback().procs(LES, PLS, SBI).p3(ls).done();
        sc("SortByInputModelProcessor/feedback-edges", fb).baseFeedback().procs(LES, PLS, SBI).done();
        // external ports on the imported level (hierarchical node T): the dummies stay in the sweep
        sc("LayerSweep/external-ports", external(FS, 1)).target("T").base().procs(HPC, LES, PSP, IPP, PLS, NSP).p3(ls).done();
        sc("LayerSweep/external-ports-chain", externalChain(FO)).target("T").base().procs(HPC, LES, PSP, IPP, PLS, NSP).p3(ls).done();
        // greedy switch types and thoroughness through the phase (GreedySwitchHeuristic as the crossing minimizer)
        for (GreedySwitchType g : List.of(GreedySwitchType.ONE_SIDED, GreedySwitchType.TWO_SIDED, GreedySwitchType.OFF)) {
            sc("LayerSweep/greedy-" + g.name(), layered10()).set("g0", "CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE",
                    E("GreedySwitchType", g)).set("g0", "THOROUGHNESS", I(1)).base().procs(LES, PSP, PLS).p3(ls).done();
        }
        sc("LayerSweep/thoroughness-1", layered10()).set("g0", "THOROUGHNESS", I(1)).base().procs(LES, PSP, PLS).p3(ls).done();
        sc("LayerSweep/fixed-order-ports", flat("", join(pnode("a", FO, null, E_, E_), pnode("b", FO, null, W_, W_, E_), pnode("c", FO,
                null, W_, W_), plain("d")), eds("a.p0>b.p1", "a.p1>b.p0", "a.p0>c.p0", "b.p2>c.p1", "a.p1>d", "d>c.p0")))
                        .base().procs(LES, PSP, IPP, PLS).p3(ls).done();
    }

    static void medianScenarios() {
        String m = "MEDIAN_LAYER_SWEEP";
        sc("MedianLayerSweep/crossing", crossing()).base().procs(LES, PSP, PLS).p3(m).done();
        sc("MedianLayerSweep/layered10", layered10()).base().procs(LES, PSP, PLS).p3(m).done();
        sc("MedianLayerSweep/hyperedge-ports", hyper()).base().procs(LES, PSP, IPP, PLS).p3(m).done();
        sc("MedianLayerSweep/north-south", northSouth(FS)).base().procs(LES, PSP, IPP, PLS, NSP).p3(m).done();
        sc("MedianLayerSweep/in-layer-edges", invertedMany()).base().procs(LES, PSP, IPP, PLS).p3(m).done();
        sc("MedianLayerSweep/external-ports", external(FS, 1)).target("T").base().procs(HPC, LES, PSP, IPP, PLS, NSP).p3(m).done();
        sc("MedianLayerSweep/seed-2", layered10()).seed(2).base().procs(LES, PSP, PLS).p3(m).done();
    }

    static void interactiveAndNoneScenarios() {
        double[][] pos = {{10, 40}, {10, 100}, {10, 10}, {120, 90}, {120, 20}, {240, 60}};
        int[][] edges = {{0, 3}, {1, 4}, {2, 3}, {0, 4}, {3, 5}, {4, 5}, {1, 5}};
        sc("Interactive/positions", positioned(6, edges, pos)).base().procs(LES).p3("INTERACTIVE").done();
        sc("Interactive/long-edges", positioned(7, new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {0, 3}, {3, 4}, {0, 4}, {5, 4}, {6, 4}},
                new double[][] {{10, 10}, {110, 80}, {110, 10}, {210, 40}, {310, 40}, {10, 200}, {10, 150}}))
                        .base().procs(LES).p3("INTERACTIVE").done();
        sc("Interactive/fixed-side-ports", hyper()).base().procs(LES, PSP, IPP, PLS).p3("INTERACTIVE").done();
        sc("None/crossing", crossing()).base().procs(LES, PSP, PLS).p3("NONE").done();
        sc("None/long-edges", longEdges()).base().procs(LES, PSP, PLS).p3("NONE").done();
        sc("None/external-ports", external(FS, 1)).target("T").base().procs(HPC, LES, PSP, IPP, PLS, NSP).p3("NONE").done();
        sc("Interactive/external-ports", externalChain(FS)).target("T").base().procs(HPC, LES, PSP, IPP, PLS, NSP).p3("INTERACTIVE").done();
        sc("None/north-south", northSouth(FS)).base().procs(LES, PSP, IPP, PLS, NSP).p3("NONE").done();
    }

    static void greedyScenarios() {
        for (String g : List.of(OSG, TSG)) {
            String c = g.equals(OSG) ? "OneSidedGreedySwitch/" : "TwoSidedGreedySwitch/";
            sc(c + "crossing", crossing()).base().procs(LES, PSP, PLS).p3("NONE").procs(g).done();
            sc(c + "layered10", layered10()).base().procs(LES, PSP, PLS).p3("NONE").procs(g).done();
            sc(c + "ports-all-sides", sides()).base().procs(LES, PSP, IPP, PLS, NSP).p3("NONE").procs(g).done();
            sc(c + "north-south", northSouth(FS)).base().procs(LES, PSP, IPP, PLS, NSP).p3("NONE").procs(g).done();
            sc(c + "in-layer-edges", invertedMany()).base().procs(LES, PSP, IPP, PLS).p3("NONE").procs(g).done();
        }
    }

    // ---- group sites (T11, C11): the branches the other rows leave untaken (plans/layered-crossing-min/unreached.md). Compact graph notation: nodes
    // "id[PC;SIDE[@x,y];..]@x,y{KEY=v;..}" (PC FS FO FP FR FREE; SIDE E W N S -; 30x30, T 300x200; "T[..]/c0 c1" nests children), edges "a.pI>b.pJ[:KEY=v]", options
    // "KEY=v;KEY=v" by constant name, macros @M.. below. Steps: base norm seed:N target:T pc:N:PC layers:0,1/2 ics:3>4,5 p3:NAME or a processor. A row is "id|root|nodes|edges|steps".
    static final String[][] MACROS = {{"@M", "CONSIDER_MODEL_ORDER_STRATEGY=NODES_AND_EDGES"}, {"@F", "CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER=true"}, {"@P", "CONSIDER_MODEL_ORDER_PORT_MODEL_ORDER=true"},
        {"@S", "base LES PSP IPP PLS SBI p3:LAYER_SWEEP"}, {"@G", "base LES PSP IPP PLS NSP p3:NONE"}, {"@L", "base LES PSP IPP PLS p3:LAYER_SWEEP"}, {"@N", "base LES PSP IPP PLS NSP p3:LAYER_SWEEP"},
        {"@I", "CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE=0.001;CONSIDER_MODEL_ORDER_CROSSING_COUNTER_PORT_INFLUENCE=0.001"}};
    static final java.util.regex.Pattern NODE = java.util.regex.Pattern.compile("(\\w+)(?:\\[([^\\]]*)\\])?(?:@([\\d.]+),([\\d.]+))?(?:\\{([^}]*)\\})?");
    static final Map<String, String> ABBR = Map.of("E", E_, "W", W_, "N", N_, "S", S_, "FS", FS, "FO", FO, "FP", FP, "FR", FR);
    static final Map<String, String> PROCS = Map.of("LES", LES, "PSP", PSP, "IPP", IPP, "PLS", PLS, "NSP", NSP, "HPC", HPC, "SIC", SIC, "SBI", SBI, "OSG", OSG, "TSG", TSG);
    static String[] kv(String o) { return o.isEmpty() ? new String[0] : o.split("[=;]"); }
    static double[] xy(String x, String y) { return x == null ? null : new double[] {parseDoubleArg("x", x), parseDoubleArg("y", y)}; }
    static String node(String t) {
        java.util.regex.Matcher m = NODE.matcher(t);
        if (!m.matches()) { throw new Bug("node " + t); }
        String id = m.group(1), o = m.group(5) == null ? "" : ropts(kv(m.group(5))), ports = null;
        if (m.group(2) != null) {
            String[] b = m.group(2).split(";", -1);
            List<String> ps = new ArrayList<>();
            o += b[0].isEmpty() ? "" : (o.isEmpty() ? "" : ",") + ropts("PORT_CONSTRAINTS", ABBR.getOrDefault(b[0], b[0]));
            for (int i = 1; i < b.length; i++) { String[] p = b[i].split("@"), q = p.length > 1 ? p[1].split(",") : new String[2]; ps.add(pj(id, i - 1, p[0].equals("-") ? null : ABBR.get(p[0]), xy(q[0], q[1]))); }
            ports = "\"ports\":[" + String.join(",", ps) + "]";
        }
        String n = nodeJson(id, xy(m.group(3), m.group(4)), o, ports);
        return id.equals("T") ? n.replace("\"width\":30,\"height\":30", "\"width\":300,\"height\":200") : n;
    }
    static String nodes(String s) { return String.join(",", Arrays.stream(s.split(" ")).filter(t -> !t.isEmpty()).map(LayeredOrderVectors::node).toList()); }
    /** A flat graph (raw: edge JSON) or, with "T[..]/kids" as nodes, the root holding the hierarchical node T. */
    static String gr(String root, String nodes, String edges, String... raw) {
        List<String> e = new ArrayList<>(edges.isEmpty() ? List.of() : List.of(eds(edges.split(" "))));
        e.addAll(Arrays.asList(raw));
        if (!nodes.contains("/")) { return flat(ropts(kv(root)), nodes(nodes), String.join(",", e)); }
        String n = node(nodes.split("/")[0]);
        return "{\"id\":\"root\",\"children\":[" + n.substring(0, n.length() - 1) + ",\"children\":[" + nodes(nodes.split("/")[1]) + "],\"edges\":[" + String.join(",", e) + "]}]}";
    }
    static String po(String elk, String port, String kv) { String h = "\"id\":\"" + port + "\",\"width\":4,\"height\":4,\"layoutOptions\":{"; return elk.replace(h, h + ropts(kv(kv)) + ","); } // adds options to a port
    /** An edge with a section (start, bend points, end as x, y, ...) or, without coordinates, with a HEAD and a TAIL label. */
    static String raw(String id, String s, String t, int... xy) {
        String b = "", l = "\"text\":\"L\",\"width\":10,\"height\":10,\"layoutOptions\":{\"" + pid("EDGE_LABELS_PLACEMENT") + "\":\"", h = "{\"id\":\"" + id + "\",\"sources\":[\"" + s + "\"],\"targets\":[\"" + t + "\"],";
        for (int i = 2; i < xy.length - 2; i += 2) { b += (i > 2 ? "," : "") + "{\"x\":" + xy[i] + ",\"y\":" + xy[i + 1] + "}"; }
        return h + (xy.length == 0 ? "\"labels\":[{\"id\":\"" + id + "h\"," + l + "HEAD\"}},{\"id\":\"" + id + "t\"," + l + "TAIL\"}}]}" : "\"sections\":[{\"id\":\"" + id + "s\",\"startPoint\":{\"x\":" + xy[0]
                + ",\"y\":" + xy[1] + "},\"bendPoints\":[" + b + "],\"endPoint\":{\"x\":" + xy[xy.length - 2] + ",\"y\":" + xy[xy.length - 1] + "}}]}");
    }
    static void row(String id, String elk, String steps) {
        Sc s = sc("sites/" + id, elk);
        for (String t : steps.split(" ")) {
            String[] a = t.split(":");
            switch (a[0]) {
                case "base" -> s.base(); case "norm" -> s.norm(); case "seed" -> s.seed(parseIntArg("seed", a[1])); case "target" -> s.target(a[1]); case "p3" -> s.p3(a[1]);
                case "pc" -> s.set("g0/n" + a[1], "PORT_CONSTRAINTS", E("PortConstraints", a[2]));
                case "layers" -> s.layers(Arrays.stream(a[1].split("/")).map(g -> Arrays.stream(g.split(",")).map(k -> "g0/n" + k).toList()).toArray(List[]::new));
                case "ics" -> s.set("g0/n" + a[1].split(">")[0], "IN_LAYER_SUCCESSOR_CONSTRAINTS", Arrays.stream(a[1].split(">")[1].split(",")).map(k -> (Object) single("ref", "g0/n" + k)).toList());
                default -> s.procs(PROCS.get(a[0]));
            }
        }
        s.done();
    }
    static void rows(String... table) {
        for (String r : table) { for (String[] m : MACROS) { r = r.replace(m[0], m[1]); } String[] f = r.split("\\|", -1); row(f[0], gr(f[1], f[2], f[3]), f[4]); }
    }
    static void siteScenarios() {
        String ic = " LES PSP PLS p3:LAYER_SWEEP", conn = "a b c d e f|a>e b>f c>d|seed:1 base ", ir = "CROSSING_MINIMIZATION_STRATEGY=INTERACTIVE", ik = "a@0,0 b@100,40 c@200,0 p q r s t u v"; // 10 nodes: no full dump (the TS dump has no KVectorChain encoder)
        String nsn = "a b[FS;W;N;N;S;S;E] c d e", nse = "a>b.p0 a>b.p1 b.p2>c b.p3>d a>b.p4 b.p5>e c>e d>e a>e", anc = "PORT_ANCHOR=(2.0,2.0)", pd = "ALLOW_NON_FLOW_PORTS_TO_SWITCH_SIDES=true;" + anc;
        String g1 = "{CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CROSSING_MINIMIZATION_ID=1}", g2 = g1.replace("=1", "=2"), sep = "{LAYERING_LAYER_CONSTRAINT=", lb = "base LES PSP IPP", xs = "base HPC LES PSP IPP PLS NSP p3:LAYER_SWEEP target:T";
        rows("LayerSweep/singleNode||a||norm layers:0 p3:LAYER_SWEEP", "LayerSweep/empty||||norm p3:LAYER_SWEEP", "InLayerConstraints/connected||" + conn + "ics:3>4 ics:4>5" + ic, "InLayerConstraints/cycle||" + conn + "ics:3>4 ics:4>3" + ic, "InLayerConstraints/selfReference||" + conn + "ics:3>3" + ic,
            "InLayerConstraints/equalBarycenters||a[FS;E] u v d e p q|a.p0>d a.p0>e u>p u>q v>p v>q|seed:1 base ics:4>3" + ic, "InLayerConstraints/interactive||a@0,0 d@100,50 e@100,50|a>d a>e|base ics:2>1 LES PSP PLS p3:INTERACTIVE", "ModelOrder/zeroCrossings/initial|@M;@I|a b c d|a>c b>d|@S",
            "ModelOrder/zeroCrossings/afterSweep|@M;@I;@F|a[FS;E;E;W] b[FS;W;E] c[FS;W;W] d[FS;W;W]|c.p0>d.p0 c.p1>a.p0 a.p1>c.p0 a.p1>c.p0 a.p0>b.p1|@S", "ModelOrder/separate|@M;@F|a" + sep + "FIRST_SEPARATE} b x y" + sep + "LAST_SEPARATE}|a>y b>x|@S",
            "ModelOrder/transitive/force|@M;@I;@F;THOROUGHNESS=7|s t a b c d e f g h|s>a s>c s>e s>g t>b t>d t>f t>h s>b t>a|@S", "ModelOrder/transitive/counting|@M;@I|s t a b c d e f g h|s>a s>c s>e s>g t>b t>d t>f t>h s>b t>a|@S", "ModelOrder/transitive/equalBarycenters|@M;@F|s t a b c|s>a s>b t>c|@S",
            "ModelOrder/transitive/groupOrder|@M;@F;CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CM_GROUP_ORDER_STRATEGY=ONLY_WITHIN_GROUP|n0" + g1 + " n1" + g1 + " n2" + g2 + " n3" + g2 + " n4 n5 n6 n7|n0>n4 n0>n5 n1>n5 n1>n6 n2>n6 n2>n7 n3>n4 n3>n7|@S",
            "ModelOrder/externalPorts||T[FS;W;W;E;E]{@M;@F}/c0@40,40 c1@40,100 c2@100,40 c3@100,100 c4@160,70|T.p0>c0 T.p1>c1 c0>c2 c1>c3 c2>c4 c3>c4 c4>T.p2 c3>T.p3|target:T base HPC LES PSP IPP PLS SBI NSP p3:LAYER_SWEEP",
            "ModelOrder/feedback/sameNode|@M;@F;@P|a[FS;E;W;E] b[FS;E;W;E;W] c[FS;W;E;W] d[FS;W;E;E] e[FS;W;W] f g|a.p0>b.p0 b.p1>c.p0 c.p1>d.p2 d.p0>e.p0 a.p1>f f>b.p2 b.p3>g g>e.p1 a.p2>c.p2 c.p1>e.p0 d.p1>g a.p0>d.p0|@S",
            "ModelOrder/feedback/mixed|@M;@I|a[FS;E;W] b[FS;W;W;W] c[FS;W;W;W] d[FS;E;W;E;W] e[FS;E;E]|b.p2>c.p2 a.p1>c.p1 d.p0>c.p0 d.p3>a.p1 a.p0>c.p1 b.p1>c.p2|@S", "ModelOrder/feedback/noEdgeOrder|@M;@F|a[FS;E;W] b[FS;E;W;E] c d|a.p0>b.p0 b.p1>c c>d a.p0>b.p2 b.p1>d d>a.p1|@S",
            "ModelOrder/ports/sameSource|@M|a[FS;E;E;E;E] b[FS;W;W;W;W]|a.p0>b.p3 a.p1>b.p1 a.p2>b.p0 a.p3>b.p2|@S", "ModelOrder/ports/sameTarget|@M|a[FO;E;E] b|a.p0>b a.p1>b|@S", "ModelOrder/ports/unconnected|@M;@P|a[FS;E;E;E;W;W;W;S;S;N;N] b[FS;W;W;W;S;S;N;N;E;E]|a.p0>b.p0 a.p1>b.p0 b.p8>a.p3|@S",
            "ModelOrder/ports/notPreviousLayer|@M;@P|a1 a2 b c[FS;W;W;W]|a1>b a2>b b>c.p0 a1>c.p1 a2>c.p2|base PSP IPP PLS SBI p3:LAYER_SWEEP", "ModelOrder/ports/notPreviousLayer/noPortModelOrder|@M|a1 a2 b c[FS;W;W;W]|a1>b a2>b b>c.p0 a1>c.p1 a2>c.p2|base PSP IPP PLS SBI p3:LAYER_SWEEP", "NorthSouth/selfLoops/greedyInLayer||a b[FS;W;E;E;W] c d|a>b.p0 a>c b.p1>d c>d b.p3>b.p2|@G OSG TSG", "NorthSouth/selfLoops/greedyPorts||a b[FS;W;E;E] c|a>b.p0 b.p1>b.p1 b.p2>c|@G TSG", "ModelOrder/portModelOrder|@M;@P|a[FS;E;E] b[FS;W;W]|a.p1>b.p0 a.p0>b.p1|@S", "ModelOrder/northSouth|@M|" + nsn + "|" + nse + "|base LES PSP IPP PLS SBI NSP p3:LAYER_SWEEP",
            "NorthSouth/inputRanks/seed1||a[FS;E;E] b[FS;N;N;S] c[FS;N] d|a.p0>b.p0 a.p1>b.p0 a.p1>b.p1 b.p2>c.p0 a.p0>d|seed:1 norm layers:0/1,2,3 PSP PLS p3:LAYER_SWEEP", "NorthSouth/inputRanks/seed2||a[FS;E;E] b[FS;N;N;S] c[FS;N] d|a.p0>b.p0 a.p1>b.p0 a.p1>b.p1 b.p2>c.p0 a.p0>d|seed:2 norm layers:0/1,2,3 PSP PLS p3:LAYER_SWEEP",
            "NorthSouth/selfLoops/sameSide||a b[FS;W;N;N;E] c d|a>b.p0 b.p3>c b.p1>b.p2 c>d|@N", "NorthSouth/selfLoops/northSouth||a b[FS;W;N;S;E] c d|a>b.p0 b.p3>c b.p1>b.p2 c>d|@N", "NorthSouth/selfLoops/inverted||a b[FS;E;W] c d|a>b.p0 b.p1>c b.p1>b.p0 c>d|@N",
            "NorthSouth/selfLoops/northEast||a b[FS;W;N;E] c d|a>b.p0 b.p2>c b.p1>b.p2 c>d|@N OSG", "Hyperedges/merge||a[FS;E;E;E] b[FS;E;E] c[FS;W;W;E;E] d[FS;W;W;E] e[FS;W;W;E] f[FS;W;W]|a.p0>c.p0 a.p0>c.p1 b.p0>c.p1 b.p0>d.p0 c.p2>e.p0 d.p1>e.p1|@L",
            "Hyperedges/mergeAcross||a[FS;E;E;E] c[FS;W;W] d[FS;W] e[FS;W]|a.p0>c.p0 a.p1>d.p0 a.p2>e.p0 a.p2>c.p0|@L", "Hyperedges/sameHyperedge||a[FS;E;E;E] b[FS;E;E] c[FS;W;W;E;E] d[FS;W;W;E] e[FS;W;W;E] f[FS;W;W]|a.p0>c.p0 a.p0>c.p0 a.p0>c.p1 b.p0>d.p0 b.p0>d.p1 c.p2>e.p0 c.p2>f.p0 c.p3>f.p1|@L",
            "Hyperedges/corners||a[FS;E;E;E] b[FS;E;E] c[FS;W;W;E;E] d[FS;W;W;E] e[FS;W;W;E] f[FS;W;W]|a.p0>c.p0 a.p0>c.p1 a.p1>c.p1 b.p0>c.p0 b.p0>d.p0 c.p2>e.p0 c.p2>e.p1 d.p1>e.p1 d.p1>f.p0|@L",
            "Hyperedges/westFirstLayer||a[FS;E;E;W] b[FS;E;E] c[FS;W;W;E;E] d[FS;W;W;E] e[FS;W;W;E] f[FS;W;W]|a.p0>c.p0 a.p0>d.p1 c.p2>e.p0 c.p2>f.p1 d.p2>e.p1 d.p2>f.p0 e.p0>a.p2|@L", "Hyperedges/neitherLayer||a[FS;E] b c|a.p0>b a.p0>c b>c|norm layers:0/1/2 PSP PLS p3:LAYER_SWEEP",
            "GreedySwitch/parallelEdges||a[FS;E;E] b[FS;E;E] c[FS;W;W] d[FS;W]|a.p0>d.p0 a.p0>c.p0 a.p0>c.p0 b.p0>c.p1 b.p1>c.p0 a.p1>c.p1 a.p1>c.p0|@G OSG TSG", "GreedySwitch/northSouthLongEdges||a b[FS;W;S;E] c d|a>b.p0 b.p2>c a>d c>d|@G OSG TSG", "LongEdgeSplitter/negativeThickness||a b c|a>b b>c a>c:EDGE_THICKNESS=-1|base LES",
            "PortListSorter/freePorts||a[FREE;E;W;E] b|a.p0>b a.p1>b|base LES PLS", "PortListSorter/portDegree|PORT_SORTING_STRATEGY=PORT_DEGREE|a[FS;E;E;W] b[FS;W;W;W;E]|a.p0>b.p0 a.p0>b.p1 a.p0>b.p2 b.p3>a.p1|base LES PSP PLS",
            "PortListSorter/fixedPosAllSides||a[FP;E@30,10;E@30,20;W@0,10;W@0,20;N@10,0;N@20,0;S@10,30;S@20,30] b|a.p0>b a.p1>b a.p2>b a.p3>b a.p4>b a.p5>b a.p6>b a.p7>b|base LES PSP PLS", "PortSideProcessor/undefinedSide||a[FREE;-] b|a.p0>b|base pc:0:FIXED_SIDE PSP",
            "InvertedPortProcessor/freePorts||a[FS;E;W] b[FS;E;W;E] c d|a.p0>b.p0 b.p1>c c>d a.p0>b.p2 b.p1>d d>a.p1|base LES IPP", "SemiInteractive/noConstraints|CROSSING_MINIMIZATION_SEMI_INTERACTIVE=true|a b c|a>b b>c|base SIC",
            "ExternalPorts/equalPositions||T[FP;W@0,50;W@0,50;E@300,80]/c0@40,40 c1@40,100 c2@120,70|T.p0>c0 T.p1>c1 c0>c2 c1>c2 c2>T.p2|" + xs, "ExternalPorts/northSouth||T[FS;W;E;N;S]/c0[FS;W;N;S;E]@40,40 c1@120,40|T.p0>c0.p0 c0.p3>c1 T.p2>c1 c1>T.p1 c0.p1>c1 c1>T.p3|" + xs,
            "ExternalPorts/normalNodeInLayer||T[FP;W@0,50;E@300,50]/c0 c1|T.p0>c1 c0>c1 c1>T.p1|target:T norm layers:2,0/3/1 HPC LES PSP IPP PLS NSP p3:LAYER_SWEEP", "ExternalPorts/newFirstLastLayer||T[FS;N;S]/c0 c1|T.p0>c0 c0>c1 c1>T.p1|target:T norm layers:2,1/0,3 HPC LES PSP IPP PLS NSP p3:LAYER_SWEEP",
            "Median/forwardFirst||a b c d x|a>d b>c a>c b>d c>x d>x|seed:4 base LES PSP PLS p3:MEDIAN_LAYER_SWEEP");
        row("Interactive/bendpoints/long", gr(ir, ik, "a>b b>c", raw("e2", "a", "c", 30, 15, 90, 10, 150, 60, 200, 15)), "base LES p3:INTERACTIVE");
        row("Interactive/bendpoints/reversed", gr(ir, ik, "", raw("e0", "a", "b", 30, 15, 60, 5, 90, 5, 100, 55), raw("e1", "b", "c", 130, 55, 160, 5, 190, 5, 200, 15), raw("e2", "c", "a", 200, 15, 150, 60, 90, 10, 30, 15)), "base LES p3:INTERACTIVE");
        row("Interactive/bendpoints/beyond", gr(ir, ik, "a>b b>c", raw("e2", "a", "c", 30, 15, 40, 50, 60, 50, 200, 15)), "base LES p3:INTERACTIVE");
        row("NorthSouth/portOptions/portAnchors", po(po(po(po(gr("", nsn, nse), "b.p1", anc), "b.p2", anc), "b.p3", anc), "b.p4", anc), "seed:1 base LES PSP IPP PLS NSP p3:LAYER_SWEEP");
        row("NorthSouth/portOptions/allowNonFlow", po(po(po(po(gr("", nsn, nse), "b.p1", pd), "b.p2", pd), "b.p3", pd), "b.p4", pd), "seed:2 base LES PSP IPP PLS NSP p3:LAYER_SWEEP");
        row("HeadLabels/longEdge", gr("", "a b c", "a>b b>c", raw("e2", "a", "c")), lb);
        row("HeadLabels/invertedPort/short", gr("", "a[FS;E;W] b", "", raw("e0", "b", "a.p0")), lb);
        row("HeadLabels/invertedPort/both", gr("", "a[FS;E;W] b c d", "b>c c>d d>a.p1", raw("e3", "b", "a.p0")), lb);
        row("HeadLabels/westOutput", gr("", "a[FS;E;W] b", "", raw("e0", "a.p1", "b")), lb);
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        orderScenarios();
        siteScenarios();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Sweep and dump modes (mission 7c, T10, B6): the breadth of the Java tests over every ptolemy model, hashed. The
    // recording path above and below is untouched; main branches here only when the first argument starts with "--".
    //   LayeredOrderVectors.java --sweep <modelsDir> <outDir>            writes <outDir>/results.jsonl
    //   LayeredOrderVectors.java --dump <case id> <modelsDir> <outDir>   writes the full row of one case
    // Every realworld/ptolemy/**.json under <modelsDir>, every level (an ElkNode with children, the root as null;
    // levels whose flat import has no edge are skipped and counted, as the recorder's levels() does), every
    // CrossingMinimizationStrategy (LAYER_SWEEP, MEDIAN_LAYER_SWEEP, INTERACTIVE, NONE; stop P3, default greedy switch,
    // thoroughness and cycle breaker) is one pipeline row built by runPipeline (the recording path, untouched): the
    // same options (incl. SEPARATE_CONNECTED_COMPONENTS=false), the same normalisation and expected shape. One line
    // per case, ids "<model>/<root|target>/P3/<STRATEGY>":
    //   {"id":..,"model":..,"target":<id|null>,"prefix":[...],"options":{...},"sha256":"<hex>"}
    //   sha256 = SHA-256 (UTF-8) of canonical(orderCanonical(expected)): "edges" and "changed" sorted by "path"
    //   (layers/layerless/hidden keep their order, "ports" is a map: its keys are sorted); every C4 value rewritten
    //   (recursively): {t:int|double} -> {t:"number", v:<16 hex digits of the raw bits as a double>}, {t:enum} -> c cut
    //   to the segment after the last '.' or '$', {t:set} -> likewise (an empty set: c null); then JSON with object
    //   keys sorted recursively, no whitespace, strings as JSON.stringify writes them. The TS twin is
    //   test/helpers/layered-order-sweep.ts (the 7b canonical form plus ports).
    //   {"id":..,"status":"refused","processor":"<member>"}   B4/C2 refusal (the first refused processor of the plan)
    //   {"id":..,"status":"throws","model","target","prefix":<planned prefix|null>,"options","class":"<simple name>",
    //    "message":".."}                                       the oracle throws
    //   {"id":..,"status":"timeout"}                           no result within CASE_TIMEOUT_SECONDS
    // Cases run one after another (runPipeline uses static state). INTERACTIVE cases run on the model as it is on
    // disk (the 7b convention): the recorder's seeded coordinate configurator belongs to the committed rows.
    static final class OrderSweep {
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

        /** The recorder's level rule: null (root), then every ElkNode with children and a unique id, in pre-order. */
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
                for (CrossingMinimizationStrategy cm : CrossingMinimizationStrategy.values()) {
                    out.add(new Case(model + "/" + levelName(t) + "/P3/" + cm.name(), model, t,
                            opts("CROSSING_MINIMIZATION_STRATEGY", strategyOf(cm))));
                }
            }
            return out;
        }

        /** Runs the case's pipeline row on a thread with a big stack; null when the timeout fires. */
        static Result run(Case c, String text) throws Throwable {
            Spec s = new Spec(c.id, "models", null, () -> load(text), c.target, c.options, "P3", null);
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
                m.put("sha256", sha256Hex(canonical(orderCanonical(r.expected))));
            } catch (Refusal r) {
                m.put("status", "refused");
                m.put("processor", r.member);
                if (!REFUSAL_CATEGORIES.contains(r.member)) {
                    System.err.println("refusal OUTSIDE C2: " + c.id + " " + r.member);
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

        /** The processors getLayoutTestConfiguration lists up to the P3 stop (null when even that throws). */
        static List<Object> planPrefix(Case c, String text) {
            try {
                ElkNode target = importTarget(load(text), c.target);
                c.options.forEach((id, c4) -> setProperty(target, id, c4));
                LGraph g = new ElkGraphTransformer().importGraph(target);
                ElkLayered layered = new ElkLayered();
                var plan = layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g));
                String stop = stopName("P3", g);
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

        /** The canonical form documented above. */
        @SuppressWarnings("unchecked")
        static Object orderCanonical(Map<String, Object> expected) {
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
    // Main

    /** Diagnosis aid: only rows whose id contains this text are built (no coverage check, no ref written under the name). */
    static final String FILTER = System.getenv("ORDER_FILTER");
    /** Diagnosis aid: one stdout marker line per row, for class-load attribution (-Xlog:class+load:stdout). */
    static final boolean MARKERS = System.getenv("ORDER_MARKERS") != null;
    /** Diagnosis aid: refusals are printed (and the rows skipped) instead of stopping the recording; nothing is written. */
    static final boolean DISCOVER = System.getenv("ORDER_DISCOVER") != null;

    static String buildAll() {
        RAN.clear();
        REFUSED_ROWS.clear();
        NOT_IN_PLAN.clear();
        buildProcessorNames();
        List<Spec> specs = new ArrayList<>();
        modelSpecs(specs);
        scenarioSpecs(specs);
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
                    System.err.println("DISCOVER refusal " + key + (REFUSAL_CATEGORIES.contains(r.member) ? "" : "  OUTSIDE C2"));
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
                String[] parts = s.id.split("/");
                NOT_IN_PLAN.merge(parts[3], 1, Integer::sum);
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
        System.err.println("rows " + rows.size() + " " + counts);
        return out.toString();
    }

    static void checkCoverage() {
        List<String> missing = new ArrayList<>();
        for (CrossingMinimizationStrategy s : CrossingMinimizationStrategy.values()) {
            if (!RAN.contains(P3 + "/" + s.name())) {
                missing.add(P3 + "/" + s.name());
            }
        }
        for (String m : SEVEN_C) {
            if (!RAN.contains(m)) {
                missing.add(m);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("no step row runs " + missing);
        }
    }

    public static void main(String[] args) throws Exception {
        // ELK keeps LNodes in HashSets/HashMaps: LNode has no hashCode, so the iteration order follows the identity
        // hash and changes from run to run. AD-10 ports such collections in insertion order, so the oracle runs with
        // a constant identity hash (-XX:hashCode=2, set by the script): every key lands in one bucket and iterates in
        // insertion order.
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/layered-order-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        if (args.length > 0 && args[0].startsWith("--")) {
            try {
                OrderSweep.main(args);
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
            if (FILTER == null || System.getenv("ORDER_TWICE") != null) {
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
