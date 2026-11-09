// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7f2 layered-labels, T1, G1, G2, G3, G5, G6, G9) for the label and comment family of
// org.eclipse.elk.alg.layered: LabelDummyInserter, LabelDummySwitcher, LabelDummyRemover, LabelSideSelector, EndLabelPreprocessor,
// EndLabelPostprocessor, LabelManagementProcessor (both arms), CommentPreprocessor, CommentNodeMarginCalculator, CommentPostprocessor,
// AlternatingLayerUnzipper, and (as whole-pipeline behaviour) InteractiveLayeredGraphVisitor, DotDebugUtil / JsonDebugUtil through
// DebugUtil. The Java is the spec; this program only CALLS ELK APIs (reflection where a member is private or protected) and records
// results; it embeds no ELK implementation. Expectations come from the oracle only.
// Run: tools/vectors/layered-labels-vectors.sh <outDir>   (java -cp ... LayeredLabelsVectors.java <outDir> <tools/vectors dir>)
// Plan dump (diagnosis): java -cp ... LayeredLabelsVectors.java --plan-dump <tools/vectors dir> <modelsDir> <path>... [-o CONSTANT=value]...
//   prints "PLAN <path> <level path> <member>,..." per hierarchy level (a directory path is expanded to its .elkt / .json files).
// Sweep (G7, T15): java -cp ... LayeredLabelsVectors.java --sweep <modelsDir> <outDir>   (writes <outDir>/results.jsonl)
//                  java -cp ... LayeredLabelsVectors.java --dump <case id> <modelsDir> <outDir>  (writes the canonical form of one case)
//   tools/oracle/labels-sweep.sh runs them (one process, constant identity hash). Cases over every .elkt of <modelsDir>/{tests/layered,
//   tickets/layered,examples} whose text matches label|comment (case-sensitive; a file the oracle cannot load is skipped and named on
//   stderr):  model/<model>/<variant>   <model> is the path under <modelsDir> without ".elkt"; variant is "default" (the file's own
//   options) or DIRECTION in RIGHT, LEFT, DOWN, UP set on the root; RecursiveGraphLayoutEngine over the whole model (loadAny: the loaded
//   graph has its unresolved LayoutOptionProxy values dropped, as the rows do). results.jsonl, one JSON object per case:
//     ok       { id, kind, model, target: null, variant, sha256 }   sha256 of the canonical form (UTF-8, compact, object keys sorted)
//     refused  { id, status: "refused", processor, category }       the first member of the WHOLE plan (or INCLUDE_CHILDREN /
//                                                                    COMPACTION_CONNECTED_COMPONENTS by option) in REFUSAL_CATEGORIES (G2);
//                                                                    a member outside them is printed on stderr (stop 5)
//     throws   { id, status: "throws", kind, model, target, variant, class, message }   simple class name of the exception
//     timeout  { id, status: "timeout" }                             not finished within CASE_TIMEOUT_SECONDS (20)
//   Canonical form (7f's elkDump): a tree of the laid-out ElkGraph (node id, box, labels, ports, children, contained edges: sections
//   with start, end and bend points, junction points, label boxes) where every x, y, width, height is the raw IEEE-754 bits of the double
//   as 16 lowercase hex digits. The no-flag recording path above is untouched by these modes.
//
// ORIGIN (B7: single-file launchers share no code): the core is copied from tools/vectors/LayeredLabelsVectors.java (7f, T1, itself
// copied from LayeredRoutingVectors.java, LayeredPlacementVectors.java and LayeredOrderVectors.java): the JSON helpers, the LGraph Dump,
// the C4 Encoder and decode, importGraph/normalise/Base/phaseDump, the step interpreter, Spec/execute/buildRow, strictNumbers/strictParse,
// the row timeout, levels(), planOfGraph/chainOf, the ELK JSON builders, PlanRecorder and runFull, the --plan-dump. The row format, the
// C4 values, the BFS guard, the re-run / build-twice / strict-parse / size checks are 7c's through 7f's (see their headers); what follows
// is what this recorder changes or adds. The 7f sites group and the pipeline cross-check are not copied; the sites group of this brief (T16) is below.
//
// Output: ONE file <outDir>/layered-labels.json (2-space top level, one compact JSON row per line, trailing newline, under 16 MiB):
//   { jdk, oracle, rowCounts: { full, models, scenarios, sites }, rows }      groups full, models, scenarios, sites
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable. input = { path, sha256 } (vendored
//   file) or { elk } (inline ELK JSON, the form every per-element option takes). Rows are built in memory in a fixed order, from lists and
//   LinkedHashMaps only, and the whole build runs twice and must agree byte for byte (the second run of the script is a cache hit).
//
// REFUSAL (G2): decided on the WHOLE plan of every level, never on a prefix, so no row is pinned. A row whose plan holds a member
//   outside the ported sets (SEVEN_B..SEVEN_F2, P1-P5) exits 1 naming the row, unless the member is in REFUSAL_CATEGORIES (7g: self loops,
//   wrapping, compaction; 7h: INCLUDE_CHILDREN, HIERARCHICAL_NODE_RESIZER): then the row is not recorded and counted per category on
//   stderr. INCLUDE_CHILDREN and COMPACTION_CONNECTED_COMPONENTS are also refused by option (refuseOptions). Anything else stops.
//
// Group full (F4), id full/<family>/<model>/<variant>: target null, steps null, prefix null, options = the FINAL option values applied
//   to the ROOT node before layout (C4 values), expected = { layout, plans } as in 7f (compact exported ELK JSON of the root after
//   new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor()); plans = { "<level path>": [member names] } captured in
//   the real run by a TestController listener). Families:
//     labels         every vendored label- or comment-bearing .elkt of tests/layered, tickets/layered and examples (the whole MODEL_TABLE
//                    of this recorder) whose whole plan is ported, default options. Variant "default".
//     label-options  a few label models x { edgeLabels.placement CENTER|HEAD|TAIL on every edge label (inline input), edgeLabelSideSelection
//                    each, centerEdgeLabelPlacementStrategy each, edgeLabels.inline x direction RIGHT|LEFT|DOWN|UP (inline input) }.
//     comments       the four comment-box models plus two inline graphs (comments on top and bottom, fixed-side ports). Variant "default".
//     unzipping      layerUnzipping.strategy ALTERNATING with each layerSplit (2, 3, 4), resetOnLongEdges true|false and
//                    minimizeEdgeLength true|false on inline graphs (node options live in the graph).
//     interactive    G5, two-run rows, see below. Variants name the graph and the direction.
//     issues         the inputs of the suites allocated to 7f2 with the options of their Java configurators (Issue445, 471, 541, 871, 905,
//                    656 partitions, 599 LabelSideSelectorTest ticket, and FX2's scenario as a full row).
//     logged         logging variants: expected additionally holds "logged" (see step op "logging").
//   INTERACTIVE ROWS (G5, family interactive): the Java protocol of J/InteractiveLayeredGraphVisitor: lay the root out with the recursive
//   engine (GENERATE_POSITION_AND_LAYER_IDS=true in options), export it ("layout1"), apply new InteractiveLayeredGraphVisitor().visit(root),
//   lay out again. expected = { layout1, layout, plans }; layout is the export after the SECOND run and plans are those of the second run.
//   LOGGED ROWS (family logged): the run uses new BasicProgressMonitor().withLogging(true); expected = { layout, plans, logged }.
//
// Group models, id models/<model>/<target or root>/<stop>/<variant> (7e's rows, stops of this brief): wherever a level's plan holds them
//   (default variant; ALTERNATING_LAYER_UNZIPPER, variant
//   "alternating", needs layerUnzipping.strategy ALTERNATING and considerModelOrder.strategy PREFER_EDGES); the models of the 59 formerly
//   pinned rows additionally get stop DIRECTION_PREPROCESSOR variants LEFT, DOWN, UP (the 57 layered-pipeline.json rows) and, for
//   partitioning-withEdgeLabels, stop P1 variants MODEL_ORDER/nodes-and-edges and MODEL_ORDER/prefer-edges (the 2 layered-phases.json
//   rows), so replays of the unpinned rows can be cross-checked against fresh oracle runs. Both label-management arms need a label
//   manager, which no vendored model can carry: they are scenarios only. A stop not in the plan skips the row (counted on stderr).
//   expected as 7e/7f (layers, layerless, hidden, edges, ports, changed, geometry, dump under ten nodes) with ONE addition in this
//   recorder: on the stops of this brief geometry also carries labels (path -> { pos }) as on the port-label stops, and a new key
//   geometry.labelSizes (label path -> [width, height] as raw IEEE hex) holding the sizes a label manager or the switcher may change.
//
// Group scenarios, id scenarios/<Class>/<name>[/<dir>...]: inline graphs (3-10 nodes) with the full step list derived from the assembled
//   plan as in 7f (importGraph, normalise, then every plan member in order up to the stop; runProcessor for an intermediate member,
//   runPhase for P1-P5; dump last), at least two graphs per processor and per direction RIGHT, LEFT, DOWN, UP.
//   NEW STEP OPS (JSON arrays like 7f's, G2/G5/G6):
//     ["labelManager", "<kind>"]  sets the label manager on the ROOT ElkNode (LabelManagementOptions.LABEL_MANAGER) BEFORE importGraph, the
//                    first step of the row; the import then copies it to the LGraph and the plan gains CENTER_LABEL_MANAGEMENT_PROCESSOR
//                    and END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR. Rows with a manager have a null target (the manager is on the root).
//                    kinds: "none"  the property is left unset (nothing is set);
//                           "shrink-width"  ILabelManager.manageLabelSize(Object label, double targetWidth): label is the ElkLabel origin
//                           (LabelManagementProcessor.java:229-231); if ((ElkLabel) label).getWidth() > targetWidth it returns
//                           new KVector(targetWidth, ((ElkLabel) label).getHeight()), otherwise null. It never mutates the label.
//     ["interactive"] a TERMINAL step (the last, after importGraph and normalise, no componentsSplit): runs
//                    new LayeredLayoutProvider().layout(<ElkNode importGraph read>, new BasicProgressMonitor()), exports the node as
//                    "layout1", applies new InteractiveLayeredGraphVisitor().visit(node), runs the provider again. expected = phaseDump of
//                    the imported (untouched) LGraph plus "layout1" and "layout" (the exports after run 1 and after run 2, compact JSON as
//                    CaseRunner.java:87-92). Graphs set GENERATE_POSITION_AND_LAYER_IDS in their layoutOptions.
//     ["logging"]    a TERMINAL step like "layout": runs new LayeredLayoutProvider().layout(node, new BasicProgressMonitor().withLogging(true)).
//                    expected = phaseDump of the imported LGraph plus "layout" (export) and "logged" =
//                    { tags: [string], dot: [string], json: [string] }: every graph the monitor tree logged, depth first (a monitor's own
//                    graphs before its sub-monitors', sub-monitors in creation order), one entry per logged DOT/JSON pair: tags[i] is the
//                    tag (slotIndex + "-" + name, or a debug tag) and dot[i] / json[i] the DOT and JSON strings logged under it
//                    (DebugUtil.java:49-61). More than one graph per format occurs in every run, hence arrays; the same shape holds for
//                    expected.logged of the logged full rows. G3: the JSON property lists follow the oracle's HashMap order, which the TS
//                    compares as unordered maps.
//   ["layout"] / ["layoutCancelled"] as in 7f remain available (the terminal layout step).
//   Scenario families: LabelDummyInserter, LabelDummySwitcher, LabelDummyRemover, LabelSideSelector, EndLabelPreprocessor,
//   EndLabelPostprocessor, EndLabelSorter (FX2: scenarios/EndLabelSorter/fx2/<dir>/{sorter,end}), CommentPreprocessor,
//   CommentNodeMarginCalculator, CommentPostprocessor, AlternatingLayerUnzipper, LabelManagementProcessor (kinds above), Layout (the
//   terminal steps: Logging, Interactive, LabelManager end to end).
//
// Group sites (T16), id sites/<Class>/<name>[/<variant>]: one step row per scenario (Sc1-Sc15) and hand-off (H1-H6) of
//   plans/layered-labels/unreached.md, recorded by the same step interpreter and the same ops as the scenarios (no new op): a dump after the
//   plan member that decides the branch (siteAndLayout adds <id>/layout, the whole layout), or a terminal step (interactive, logging,
//   layout). Every node and label is sized. Rows are appended after the scenarios, so no earlier row changes.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 so identity-hashed collections iterate in
//   insertion order (AD-10; up to 10 entries, then HashMap treeifies); main fails without it. The seed properties are those of
//   tools/oracle/run.sh (export and identifier seed 1) so exported ids agree with refs/elk (F4).
//
// Diagnosis aids (environment, output unchanged when unset): LABELS_FILTER=<text> builds only rows whose id contains the text (no coverage
//   check, one build); LABELS_DISCOVER=1 prints refusals and oracle throws instead of stopping; LABELS_MARKERS=1 writes "ROW <id>" to stdout
//   per row; PHASE_TRACE=1 one stderr line per row; LABELS_STATS=1 prints the bytes per row family and model; LABELS_CAP_MB=<n> raises the
//   size cap for a measuring run (never for the ref).
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
import org.eclipse.elk.alg.layered.InteractiveLayeredGraphVisitor;
import org.eclipse.elk.alg.layered.intermediate.LabelManagementProcessor;
import org.eclipse.elk.alg.layered.options.CenterEdgeLabelPlacementStrategy;
import org.eclipse.elk.alg.layered.options.EdgeLabelSideSelection;
import org.eclipse.elk.core.labels.ILabelManager;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.util.IElkProgressMonitor;
import org.eclipse.elk.core.util.LoggedGraph;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkLabel;

public class LayeredLabelsVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "layered-labels.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed", REPO_PREFIX = "repo:";
    static final String INPUTS = "test/golden/inputs/", LABEL_INPUTS = INPUTS + "labels/";
    static final int MAX_DEPTH = 8, FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = (System.getenv("LABELS_CAP_MB") == null ? 16L : parseLongArg("LABELS_CAP_MB", System.getenv("LABELS_CAP_MB"))) * 1024 * 1024; // LABELS_CAP_MB: diagnosis aid, the committed output stays under 16 MiB (G2)
    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING", P3 = "P3_NODE_ORDERING", P4 = "P4_NODE_PLACEMENT", P5 = "P5_EDGE_ROUTING";
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings", "splines.route.start"); // the spline route is recorded in geometry.splines (R3)
    /** The refusal categories G2 allows (the members the recorder refuses), with the owning mission. */
    static final Map<String, String> REFUSAL_CATEGORIES = new TreeMap<>();
    static {
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
    /** G1: the twelve arms of this brief (the two label management arms are one class, told apart by their center flag). */
    static final Set<String> SEVEN_F2 = Set.of("LABEL_DUMMY_INSERTER", "LABEL_DUMMY_SWITCHER", "LABEL_SIDE_SELECTOR", "END_LABEL_PREPROCESSOR",
            "CENTER_LABEL_MANAGEMENT_PROCESSOR", "END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR", "LABEL_DUMMY_REMOVER", "END_LABEL_POSTPROCESSOR",
            "COMMENT_PREPROCESSOR", "COMMENT_NODE_MARGIN_CALCULATOR", "COMMENT_POSTPROCESSOR", "ALTERNATING_LAYER_UNZIPPER");
    /** The routers a P5 stop can name (EdgeRouting.UNDEFINED shares the orthogonal router and is never recorded). */
    static final List<EdgeRouting> ROUTINGS = List.of(EdgeRouting.ORTHOGONAL, EdgeRouting.POLYLINE, EdgeRouting.SPLINES);
    /** N3 + G2: the stops whose rows carry the ports and labels geometry (besides rows with a flexible node); labelSizes only on SEVEN_F2. */
    static final Set<String> PORT_LABEL_STOPS = new HashSet<>(Set.of("LABEL_AND_NODE_SIZE_PROCESSOR", "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR"));
    static {
        PORT_LABEL_STOPS.addAll(SEVEN_F2);
    }

    // SHA-256 of every vendored input read, "<sha256>  repo:<path under the repo root>". Keep these lines: the shell
    // script parses them (grep for 64 hex digits, two spaces, "repo:"). The table is also the list of the labels family: every
    // entry is a label- or comment-bearing .elkt whose whole plan is ported; the model path is the part after inputs/ (and labels/).
    static final String MODEL_TABLE = """
f8fe9c713f00be1b6f7c65cabd5341b4693414dd606bc1ffd523153afbea9cd7  repo:test/golden/inputs/labels/examples/general/direction.elkt
dcf59f3b598347ec2a6a6580b982f17cc9552c1161fbd434ad1c8667772ae043  repo:test/golden/inputs/labels/examples/general/mixingDirection.elkt
07fdd4696496bec64efb6e8a03acd76cdf3bc4097076d798b7289ae0110d6e48  repo:test/golden/inputs/labels/examples/general/spacing/comments.elkt
cf712a4550f6ab3d454bb521b5caf0f127ed260afd33c97c8b5332a5739f8c9f  repo:test/golden/inputs/labels/examples/general/spacing/components.elkt
d9c81eb5627e733d853f53ed642da7591e80c175155d98d04641b689ea72f48e  repo:test/golden/inputs/labels/examples/general/spacing/nodesEdges.elkt
15821b8aa540d2fa07ba56db9bbe9e28aa2b4ea317170a832cd260507ce1dbc7  repo:test/golden/inputs/labels/examples/general/spacing/padding.elkt
1447f09b61f077cbdd6393cf6e36d7a60665b12069d4e9c437198cb48f556cc4  repo:test/golden/inputs/labels/examples/general/spacing/ports.elkt
28f4f95169919d1875bac4ef452d76e4ff36537ddde286bb277fabcb941eefc1  repo:test/golden/inputs/labels/examples/general/spacing/portsSurrounding.elkt
9cfe1ca0070944c68b6563d31e74bd5781ef330b936f983830a923d829adb843  repo:test/golden/inputs/labels/examples/labels/nodeLabelPlacement.elkt
317a6c6be33e8ccfa59d55927a26c6210a10c7095bfd2cca50aef81ca80d8d99  repo:test/golden/inputs/labels/examples/labels/portLabelsMulti.elkt
2b8534deb0494b77ac2d99cb7e08f01c6ae7a14b0e16d18176f52ea3e9ca6354  repo:test/golden/inputs/labels/examples/ports/allowNonFlowPortsToSwitchSides.elkt
d9dee71cecf2f570eb1f14eda4aa06b3c27fa80548e8960c71c1d403a2a0ed79  repo:test/golden/inputs/labels/examples/ports/portConstraints.elkt
3c911c0479023c4496a7da5686a967e42d680973621fede408941d3911b768d1  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_circle.elkt
d0614f1fa063f5dde22a64f49632a2313988715c15da2cada7d2c3aac7d205ff  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_circle_pseudo_positions.elkt
4e5f8375a352c0c4dd2863538c83403c521d787e3debfa0f9a027097621381b8  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_hierarchy.elkt
66e220947672ce63502610e36669d09865fb45fb54e67133f9d122e673184c6e  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_hierarchyDirection.elkt
0914686cfcf23e2e50d9a7d6cc612093ec5683fdf0319d19ee804c4e10e87352  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_hierarchyDirection_pseudo_positions.elkt
b0dd2d2d4ba5913438c472d5d451b05494adb637c2d02f50357d2290977bcd4d  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_hierarchy_pseudo_positions.elkt
6266159658d52376c8b42bd0506c935e9bbe51aa3ff619cdea32576479f0ba2e  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_motor.elkt
1b207e359e5b156c51084bb29ce1c0803c6e6aea49641494eb1006b610385b40  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_motor_pseudo_positions.elkt
003c11bfa5a2be05090ed1d50d39da8cefa6da2a6ce514a0108024927de77472  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_nodeSizes.elkt
a7d0221f06f414329eb298983f893e4bc9d3a5744338663a89fd43cb363e66ed  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_nodeSizes_pseudo_positions.elkt
6af2a3ee0147be6eb2a77b113bf53739b23d5b5987d9329f22f1bf63da116485  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_separateComponents.elkt
5d721201120ab2945b7eaa025e192e6e5ef8f606fbb23ef093ac38a8b8a9b762  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_separateComponents_pseudo_positions.elkt
9a6716e1af594096c6a18d21a47a92d34966f6e14507bce8707b36ffe7728823  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_simpleDirectionTest.elkt
aa1518f98cea2f282cab6154e028e3ed115a87ead9b3108582022cf8d86750fc  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_simpleDirectionTest_pseudo_positions.elkt
8c0b8d563e5f4cd4050ce584d378a8a347d240ff76afd8f880a8ad02f9ccca00  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_snake.elkt
b5174b5e66ba97a895fb6ce4cd92d41fcc3792070f4e4fa5ccd7c61d69d77f74  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_snake_pseudo_positions.elkt
9149e471eaf12a8d298d581aac78770ac8b29350ed8e8997df1464cb114e20ed  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_sortingTask.elkt
916a821f5ee5637ba147774eb7c8bc7cb684ec6f29120ae01a932bc3515026d3  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_sortingTask_pseudo_positions.elkt
ebfd9e6577819cbce11ed31eec1b1d2f879710caf99a00fa15844ab2f4faffa3  repo:test/golden/inputs/labels/examples/user-hints/interactive-constraints/interactiveLayereredLayout_layerConstraint.elkt
4d0556abd2173b8be9f032c75eeed9927ad716ba09738988408e3e173dcfde49  repo:test/golden/inputs/labels/examples/user-hints/layered/horizontalOrder.elkt
cc2052726f7e1b8c024adf99067b921714ade4f7e8f91f68d9a2306db291809f  repo:test/golden/inputs/labels/examples/user-hints/layered/partitioning.elkt
e8cb44327a8320774c0af6e0d896eddbb08299b8d100b7271b3e613315d0c0ac  repo:test/golden/inputs/labels/examples/user-hints/layered/reverseEdge.elkt
e97df1a72665572d5ad16e5a5d869305c9fc0ff8828a45bb73b61f4a2e236199  repo:test/golden/inputs/labels/examples/user-hints/layered/verticalOrder.elkt
49c2e9f16438f35e24b2e56e4871127254afd5e483a04e24f665434d0d5ca5da  repo:test/golden/inputs/labels/examples/user-hints/model-order/modelOrderCrossingMinimization.elkt
86a021885ec483a8dc02d9e904dc0bed023c3fa2769ae6e518af4a1e9ea1c298  repo:test/golden/inputs/labels/examples/user-hints/model-order/modelOrderCycleBreaking.elkt
c700ac17fe95eacebdd0609572479ebd4cede6d584f9487fc4e7e3021658955a  repo:test/golden/inputs/labels/examples/user-hints/model-order/modelOrderNoCrossingMin.elkt
64e70688cd41ed9999fd62406bd4753b06bb75516d4b054abcff7a2565bcca14  repo:test/golden/inputs/labels/tests/layered/comment_boxes/multiple_comments.elkt
633b7ffd09ac487fdaa0ef7e4c3800a849decd4b090a5ae90d51e706128efaa5  repo:test/golden/inputs/labels/tests/layered/comment_boxes/multipler_comments.elkt
8f6b33e5303d975dbf1433b276206e7478539c2167f1c4f023ec918d8a3125e6  repo:test/golden/inputs/labels/tests/layered/comment_boxes/single_comment_01.elkt
baf8158831ca83d2a057d68ebec643a1a285607c910ba9339f43d5042aafb88d  repo:test/golden/inputs/labels/tests/layered/compaction_oned/hierarchical_ports/hports1.elkt
62829d8cdad4d7f3723998ba212c7b121234bc739fff41dcdda4da1c3dbd32f4  repo:test/golden/inputs/labels/tests/layered/connected_components/compound01.elkt
35d6a522ae9b9423f72a5c9200072ba51563e4b520f6a24b7bb3e7c3158caad5  repo:test/golden/inputs/labels/tests/layered/connected_components/compound02.elkt
4b52133344f4a678ee6bf29c27c7fd9e1725a96a0474bd07b6c90d59d45af47a  repo:test/golden/inputs/labels/tests/layered/connected_components/compound03.elkt
a9ef14dea1e007f0189561caf7bf5311d36a82197dcafd98e469d68bf4aed2b8  repo:test/golden/inputs/labels/tests/layered/connected_components/compound04.elkt
42b04dabe75d53f85988c441c18254a22ab2a32fe50fbbd726963b36cc613ebd  repo:test/golden/inputs/labels/tests/layered/connected_components/compound05.elkt
ca7130b3755aecf5b8f157c004108c94dc9d933492428174c50173715e379efc  repo:test/golden/inputs/labels/tests/layered/connected_components/compound07.elkt
4df035d742bb5b5c2a587f66fbdcb185b7b0c9f806cf87e7daeb33b941100e2f  repo:test/golden/inputs/labels/tests/layered/connected_components/flat01.elkt
4ff9fb8ffcf511fd53f0f70cdadf0a7c09472f8a591909bba6a219449d84b0b9  repo:test/golden/inputs/labels/tests/layered/cross_counting/north_multiple.elkt
9e71518f0eb60b030632f88a484c5904020e64edb4eca067baed04483324705b  repo:test/golden/inputs/labels/tests/layered/cross_counting/north_south_fixed_side.elkt
9d876ee289fa35a70d1ca6651737f65fb1883a48325a4cff29d9fa2dc6f72afe  repo:test/golden/inputs/labels/tests/layered/cross_counting/south_multiple.elkt
dac3835fded3ed5aa17aae5ebaeb53216f5dfd43a31cdb5a7bedba50279a0f05  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/edgeLabelSideSelection01.elkt
6093ecf66d1b565ae44c37ee6f163e76c44e22965fadfa808ef65013673cf3e7  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/edgeLabelSideSelection02.elkt
20dd0cc580d17c61b55c696f0ead6cbb528342db31a14915b602f94c13bc0488  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/edge__and_port_labels.elkt
46e9280b73ba48bb8cc14b79daf2271d345893fad6c5a0e12fda67711f6cb721  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/edge_label_spacing.elkt
7fcff9717bed7943d8c21a364f99c51202d566496b57358ae6cfd254dd007208  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/edge_labels.elkt
a1743d8437e563330b6cb654e31f2f70c6eb2915f2ef20fe63588ebae838fcef  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/endLabelsWithPorts.elkt
2b72a52ad05bbb61956ceac48220453e6582622092074943a6505f935cf79aad  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/headLabelMarginCalculation.elkt
4c674697b43d7335e5a38c1db2d2566ce173fbfa2b51cad183a4d353e9256295  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/labelStacking_down_down.elkt
20cdbc16fa92b726cc624480f2ba7ef004e75d73a74214f7f5fe6cea94aee387  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/labelStacking_down_up.elkt
6fa8dc2ff800197952411c94d58b25fc1f58fdfdf59602218b3addc0ab3c9e93  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/labelStacking_left_down.elkt
04b5d38b8c2f1c62e7b4db52a9f894537c8f6200fca5280468e085fbaf2aad3d  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/labelStacking_left_up.elkt
bab10c2e2a8f4728d4afb3471e1bd324b40213f245196bc0ac0af66e4c84e34d  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/labelStacking_right_down.elkt
b4ef039d58504a30ed534728211aee9ab9bd8e8f32bbeeb2b2d947487acf325a  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/labelStacking_right_up.elkt
fdac45e7dd6355e37e7232d47b183fa616a163cf2aa4348a80fad46fe6e7d346  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/labelStacking_up_down.elkt
c0d48153e0077d5c5f9f4794e80fbdf11befcbc97db1bd2edb02a8837df1b05b  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/labelStacking_up_up.elkt
f0226eed0650fe91cbc3d37c7e254fe27e80af73774c72225abde405c8198717  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/layerSelection_center_01.elkt
b9595956f8dc90f22d76a278bb198bf9455c109b5b2f2bcbc9a6ec3d739f2cb6  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/layerSelection_center_02.elkt
020a1d1e7197e9def1245cfebb46e11414f30cfb6810f2941930256602b4a845  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/layerSelection_median.elkt
4e3e55532ca8e05dbda43076522012c248d3af7d5d2ca70ab4e582031afa6b42  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/layerSelection_widest.elkt
89fefdf679f401ffe0a737a8f5e93be13a54ad89062ff8c8938ddc4c19b219b7  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/northSouthPorts_down_down_01.elkt
0d7b4c04e7f49488ebf6f68850cee91961b7eaf806a5f711b8da8e98a6f75e16  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/northSouthPorts_down_down_02.elkt
94cb150ae33e3384917f65715da81b997a8664f9b647ce68985ce4da63dfb638  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/northSouthPorts_right_down_01.elkt
deae78e8d6a1287da03387182ee2f8dcbfd94160dee6c8992c244ba48f82b491  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/northSouthPorts_right_down_02.elkt
ed8f9f912a4bcdbb7d31f4e5967820dee2ef145e8138ea0ec32b5f4f28f10772  repo:test/golden/inputs/labels/tests/layered/edge_label_placement/smartLabelSideSelection_right_01.elkt
54f805e91b4ba81f92a1324fc9ce2db6fe3f702380d9f9ef0aaa3faf01dd48a7  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy01.elkt
5b3ae5cf66515bf5e887fd0387d224b5cffbeebdd26e4198c22703705d661d16  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy02.elkt
e045d4a2b33f34ca6e65b8c07c98664763e5023f53d30efe01c103891bdf8917  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy03.elkt
b981886540f076bbbbaf86da9f9c1f7dd93e7dbe892e5ed83a72607df5a9a22f  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy04.elkt
1abcb51dec791f318f70eca91f726b54a24e30de31e1305e871e084d0f8655d8  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy05.elkt
e7f7eb20b38abae18a895f2a68760ab1fe2b2f18a2a176f357addd60aa649d60  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy06.elkt
c22197cc932db3474680195595d21df9f117a785a96ea35085e76786f14af0a4  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy07.elkt
45c5cfdb7e94d58c8cc421953b714673f37751704b751df92e4dab8826e7791b  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy08.elkt
9f10bac68e7a679a8f491b686eb10368c6a25bf9ea30fe6115279487a133d439  repo:test/golden/inputs/tests/layered/hierarchical_ports/hierarchy09.elkt
e01f73a626343e3bdd04bc53df7a071aff002dffa9a1d2e7d187f258f26e6c18  repo:test/golden/inputs/tests/layered/hyperedge_merging/hyperedge_labels.elkt
e83d20235f71efdb5457912ce8ce511769bffa6aeec6b55028d560939102f9b2  repo:test/golden/inputs/tests/layered/hyperedge_merging/hyperedges01.elkt
c5a03df0bd66d97aa5366a95a92190beb9ad4cca41e178c18f364ce7afa8913f  repo:test/golden/inputs/tests/layered/hyperedge_merging/inverted_ports.elkt
9edf4186fc3b8dad415ff631fe8110b24aed8989c9b1658d9971e0fd7626a1c4  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_01.elkt
16a029cc17643b42dd5e0e79e64a6fe093ce343c5bff76742a6ac9b8dbd36dde  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_02.elkt
f1880960129542711274042d8979bb3c61e5d8c998635ce3d3425bca312aee66  repo:test/golden/inputs/tests/layered/hyperedge_merging/north_south_ports_03.elkt
4248ffd82104950274cf5cedb5db9da7eea69e60f91a03a6af0efd484e1767c1  repo:test/golden/inputs/tests/layered/hyperedge_merging/unequal_src_tgt_with_labels.elkt
598450e23d19a885f2f9fe8f6942b7c44984926f7ee29fc74de471fad043ed81  repo:test/golden/inputs/labels/tests/layered/interactive_layout/noDummyNodes.elkt
48cbce0d307a22e858c91582650891816384129508a074f57d5a04a8a210937d  repo:test/golden/inputs/labels/tests/layered/inverted_ports/east_input.elkt
564d02fa9b336a2a9984d1f3831f095ad005eeee49c895394703df4d1c04c3e8  repo:test/golden/inputs/labels/tests/layered/inverted_ports/feedback_edge.elkt
57a92d1b236067be12b7b5fd7c757974daf31ff6d3e18c5f7d0dd3da023611e3  repo:test/golden/inputs/labels/tests/layered/inverted_ports/west_output.elkt
feb43466e6023d910611c106730f836998cf1d03c9caefd8c4194e42b1c9ec56  repo:test/golden/inputs/labels/tests/layered/labels/edge_label_layer_selection/end_layers_01.elkt
04c84435e2a343d96b4dcc584eeba75bec70c590710dcbcd6c819a32401f8991  repo:test/golden/inputs/labels/tests/layered/labels/edge_label_side_selection/smart_01.elkt
49627fd0185744e8ce2eea3ce29727f278d57507b4dadc19713ee11a8ee5f722  repo:test/golden/inputs/labels/tests/layered/labels/edge_label_side_selection/smart_02.elkt
4cd87ba37096b3e6d50d572bbd009461ac12396836ca568553ed80a8d18d23ba  repo:test/golden/inputs/labels/tests/layered/labels/edge_label_side_selection/smart_03.elkt
b74915a8873b14e8e4528fe1142f4aa1a95cce0489d8818dd95d554cb4968683  repo:test/golden/inputs/labels/tests/layered/labels/edge_label_side_selection/smart_04.elkt
ded01a676328d8da57e7ee34d1bb6bfaf43ceba67d46a4f842ef1a6da6f2f756  repo:test/golden/inputs/labels/tests/layered/labels/edge_label_side_selection/smart_05.elkt
5d09887b3ca7da218bddc447c562389048eb2c10fb2e788b5b3aca4814450cfe  repo:test/golden/inputs/labels/tests/layered/labels/edge_label_side_selection/smart_06.elkt
073de0298d95b3bb1e5af7946a57fd4bb773cfffaf10c518a8060ae22dea31c9  repo:test/golden/inputs/labels/tests/layered/labels_ordering/headLabels_multiPorts.elkt
76a10a7444359e25845f0ff16bab4ba2b2a87d19df92485e3dbe11e24aa162a2  repo:test/golden/inputs/labels/tests/layered/labels_ordering/headLabels_singlePorts.elkt
60ad84dfb868a0ae4677ce088a76b1a72a4554d70a48f3d96a4c8b06d14f64de  repo:test/golden/inputs/labels/tests/layered/labels_ordering/tailLabels_multiPorts.elkt
b7e004ffd3cfa891428e90c3f08497aa3bbb2a61bf0568d6e7dda97ff782e268  repo:test/golden/inputs/labels/tests/layered/labels_ordering/tailLabels_singlePorts.elkt
5530ec8e29a2b0896b808710553be8995bf59b8a19f6ef828e541bb8b78e0e58  repo:test/golden/inputs/tests/layered/layer_constraints/01.elkt
e57cb83df7e22f534205c946a4ad6fa973ba7d341e35f8a8194101bf78c72489  repo:test/golden/inputs/tests/layered/layer_constraints/02.elkt
dc84df689d7c3293c530ccac2753a0914577c69d885a56f7d3083d1613289934  repo:test/golden/inputs/tests/layered/layer_constraints/03.elkt
ae6137803a218ea411dbe3314704aff8c7fd67dc43a3cdeb841af6e95fed9236  repo:test/golden/inputs/labels/tests/layered/node_label_placement/inside_placement.elkt
d9ac951d8f01435f980397ccdd685fce69673765ac11388773214ac5b22770c4  repo:test/golden/inputs/labels/tests/layered/node_label_placement/inside_placement_hierarchicalNode.elkt
43fd896a94b0a3da30ea9d32e81e71209496087c2186fbc158573dae821b681a  repo:test/golden/inputs/labels/tests/layered/node_label_placement/outside_placement.elkt
c2fbf66ed01475b45ce860b897325feaf7c2a3135f94510eb05cc0fbd0565283  repo:test/golden/inputs/labels/tests/layered/node_label_placement/outside_placement_hpriority.elkt
0818a14ecbc8c1310dc3090c5a58c13ab960a91de1bda27e51345d0fdc8155a8  repo:test/golden/inputs/labels/tests/layered/node_label_placement/separate.elkt
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
ddf662ba728c4e9aa0017bb2aae4cdba2046a84b68802cc00eeb17b0ed4fcea5  repo:test/golden/inputs/tests/layered/node_placement/flexible_ports/graph01.elkt
9805c6874b75676ae38e8d76e2c5fbf1fdfe12c2a2b34c629839bc4771b1ae1a  repo:test/golden/inputs/tests/layered/node_placement/flexible_ports/graph02.elkt
86c2766063c5b462152481a7266a8eca8e8e2963d700d93df01a08f5fea21503  repo:test/golden/inputs/tests/layered/node_placement/flexible_ports/graph03.elkt
18e620a3933acbcdd4de80ded312576a21044ee503160fe264027f282d32b520  repo:test/golden/inputs/tests/layered/node_placement/flexible_ports/graph04.elkt
54fa39aa17eb871544d36d743ca12fa7b668064e55a5863ee29311abe427bc7b  repo:test/golden/inputs/tests/layered/north_south_ports/linear_segments_cycle.elkt
5cbfc774350c48d3d677cf643335a71cd476e37c61dc17803878ac43fb364cac  repo:test/golden/inputs/tests/layered/north_south_ports/north_multiple.elkt
515476ac0db457970fa58d4aa7ddd4d1790ed55a2dd4f892606726e47e09df56  repo:test/golden/inputs/tests/layered/north_south_ports/north_south_fixed_side.elkt
6dfa3223529f29440b83936a5ad4b2ae72fa38067d4bc4a0597be28ad835b057  repo:test/golden/inputs/tests/layered/north_south_ports/nsp1.elkt
c8d37d331cb1dcb8f30b4ef6e01f569f5eb99a0e0a24d374af94ccb0c700f201  repo:test/golden/inputs/tests/layered/north_south_ports/nsp2.elkt
23f5113c5591be8dcd4218008c7758898ecfde192d47c75e6c69a140583f29d4  repo:test/golden/inputs/tests/layered/north_south_ports/nsp3.elkt
7e665de6111a648cd04e007d17f9be7c637a2da06a0bf1204f8184e06a488daf  repo:test/golden/inputs/tests/layered/north_south_ports/south_multiple.elkt
ae0de9a9f3062b7f13441a0c0d6b1bb1051cfa90059eb193d9f33df513737827  repo:test/golden/inputs/tests/layered/partitioning/withEdgeLabels.elkt
0f392abb8a5a65c5db6f9dcc5375c078b5c74eefac5e031007fcbf034198ee29  repo:test/golden/inputs/labels/tests/layered/port_label_placement/fixed_positions_01.elkt
9e2fc4996c51a290ea1bf387e6611005e557ca39dc1cdc7e57c92c2adc029ad0  repo:test/golden/inputs/labels/tests/layered/port_label_placement/inside_compound_nodes_01.elkt
ddcb2959f22bc902a1b258f70712eb5d36ad1d18bddddaefb4690c5ee3aa1335  repo:test/golden/inputs/labels/tests/layered/port_label_placement/inside_compound_nodes_02.elkt
5abf8be58fdd6a0633a22ba4a440427106174757c0532d4a9141e8cf3e5ee0f5  repo:test/golden/inputs/labels/tests/layered/port_label_placement/inside_compound_nodes_03.elkt
9c0de1fdbf47ad5cd0f41724df02ed88ce8805f1700efc0337eb558edfa4740f  repo:test/golden/inputs/labels/tests/layered/port_label_placement/inside_outside.elkt
fc736fb4ce5edbdd10acca1898e5c98eacc3222a41ed79c1756f7816c84b490e  repo:test/golden/inputs/labels/tests/layered/port_label_placement/multilabels.elkt
010ddc5751dc585338f62b96b2fb5210a6ace578864618ceb523e9afb4e955c1  repo:test/golden/inputs/labels/tests/layered/port_label_placement/multilabels_compound.elkt
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
c718a23790a94749412feb05f3cd83b64dd1e780dfd8fe3e627d7d04d53f65bc  repo:test/golden/inputs/labels/tests/layered/transform_direction/example.elkt
75011b0691d432edc14832409eed732adc7c777451b389d66880784e76da87b9  repo:test/golden/inputs/labels/tickets/layered/082_unfortunateEdgeLabelSideSelection.elkt
8c1c6df22cd4cfb74db60c609c1666b0cbadb41a1784dfaaa7dc7eb61a4eefb5  repo:test/golden/inputs/labels/tickets/layered/167_insidePortLabelsInHierarchicalGraphs.elkt
4ee9669fa5d1d3f1a5b2574da78313226005ffabc50924f3c348338c173a4d4f  repo:test/golden/inputs/labels/tickets/layered/182_minNodeSizeForHierarchicalNodes.elkt
f1cee9f5d9198c5c424d7e93f8bd054f63999e63e7f9e63469c27faae6655d55  repo:test/golden/inputs/labels/tickets/layered/193_hierarchicalPortOverlaps.elkt
ce2112306749ed9d9b72cb49551b4ee06693c35948bf80e08779451676dd57b3  repo:test/golden/inputs/labels/tickets/layered/213_componentsCompaction.elkt
fdf40c543b7543ce9711e3b62dfb87ac198ea223eb3a381b047e83491a6b02dd  repo:test/golden/inputs/labels/tickets/layered/273_insideSelfLoopsWithLabels.elkt
6a00beb3599da834f29ed66453d895e6997ac87caa310f1fc1d1ccfc5db9cbb2  repo:test/golden/inputs/labels/tickets/layered/304_wrongMinimumNodeSize.elkt
cf4c59312c391afc2d5929241611ba0ba0369ec684c197a906445450d3cbb189  repo:test/golden/inputs/labels/tickets/layered/347_polylineOnEdgeLabels.elkt
80ad492f5bb2685853b8ca69ac7b6b314db7f9e0c36394c0807ace930b81a5cc  repo:test/golden/inputs/labels/tickets/layered/404_stackedCenterEdgeLabels.elkt
dc161227ef2a2c14aa94abfe6547a13b7d4be29d04ef3683e138eaf95fa93447  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEInside.elkt
bd512d48fbb1c79f9bdda76b9cd79f1ef4f7025a5af81c7c98ce1724d73234cf  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEOutside.elkt
a8894790a9195e42af56b9f4dc8bd09cf4038088cb575e4af9325eeeabd530f9  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsNSWEOutsideNextToPort.elkt
486e3cce9622bee430555861e4801d6e8ffb9164a13104d787f4ce035d630d02  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsTwoWestOutside.elkt
b06e4fb015bc854868f443848ae387cb14b53ebdbb2f60629261be5653ae80d3  repo:test/golden/inputs/tickets/layered/405_differentPortLabelPositionsTwoWestOutsideNextToPort.elkt
61a55f7ce1a8e69e2120f38318c2885e5514e0bc3de9a079fc91eb47537fdd14  repo:test/golden/inputs/labels/tickets/layered/405_differentPortPositionsUpDown.elkt
463533d6c814cb8cbbf81816ac5637b480fc6bf8069e1682dfa148f62309b840  repo:test/golden/inputs/labels/tickets/layered/439_bigNodeErrors.elkt
5c846956d3e42398827c3690ff6dce8c328c939b00fa5e4ff6b109c8f21857c3  repo:test/golden/inputs/labels/tickets/layered/445_feedbackEdgeTailLabel.elkt
9c58471670bab4b6619ff10d37fe87f9c8cdcf93cc2d7e93cb51193651485a3f  repo:test/golden/inputs/labels/tickets/layered/453_interactiveProblems.elkt
5c90f06132e401b74a4f42af6000c1968d8195fd2905e05feb46b9258544ff12  repo:test/golden/inputs/labels/tickets/layered/471_verticalInlineLabelAlignment.elkt
0168a08422602fe54d653c4dba7a39efae1ec5e0dbf3114ece2a764f35db0245  repo:test/golden/inputs/tickets/layered/476_multiLabelInHorizontalLayout.elkt
a5f0238797cad0bfef2555230671ed7113ab0032687945184466058cf1fb1ff5  repo:test/golden/inputs/tickets/layered/476_multiLabelInVerticalLayout.elkt
a1559dcacce84f95f6ebe73267f54c36f9986744dc503bb59f0ed3670f5b6df0  repo:test/golden/inputs/labels/tickets/layered/541_invertedComplexHeadLabels.elkt
580c38f84d6d5569e3ded712dccba0c971eabb89d5c7b4400a56cb93e3873ede  repo:test/golden/inputs/labels/tickets/layered/541_invertedSimpleHeadLabels.elkt
8b844808120cf7ac879db7b2ff357b68804ff9912519d0fed12467a7a27a820a  repo:test/golden/inputs/tickets/layered/587_polylineSplinesNPE.elkt
49b3e8400512a32043b9f0ecbd212f7346681b7ad00d10820d65ad5552c0c326  repo:test/golden/inputs/labels/tickets/layered/599_unimportantPortIndex.elkt
7a304bed892ea00b2c53365fcb87045eb8767734c0829afd5df1ce87eb93a89a  repo:test/golden/inputs/tickets/layered/603_labelOverlaps.elkt
12730664b530411ee1fa7e064bfd8e4f91e16590ae80047ee11f8794a1d77609  repo:test/golden/inputs/labels/tickets/layered/905_beginLabelAboveEdge.elkt
cc6fd0cd2c52fa5287330c66b5eff8a5b58e2982ca2ed2d1336b226efbeca834  repo:test/golden/inputs/labels/tickets/layered/905_beginLableBellowEdge.elkt
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
                    items.sort(Comparator.comparing(LayeredLabelsVectors::json));
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
        if (c4 instanceof List<?> l) { return l.stream().map(LayeredLabelsVectors::decode).toList(); } // T11: a list value (the in-layer successor constraints)
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
                || SEVEN_F2.contains(name) || name.startsWith(P1 + "/") || name.startsWith(P2 + "/") || name.startsWith(P3 + "/")
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
        } else {
            throw new Bug("model " + model + " is outside tests/layered, tickets/layered and examples");
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
            if (model.startsWith("labels/")) {
                model = model.substring("labels/".length());
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

    /** The models of the 59 formerly pinned rows (G9, FX6, FX7): 15 preserve_order, partitioning, two hyperedge_merging, one comment model. */
    static final List<String> PINNED_MODELS = List.of("partitioning-withEdgeLabels", "hyperedge_merging-hyperedge_labels",
            "hyperedge_merging-unequal_src_tgt_with_labels", "node_placement-KIPRA-1426-demo2-KIPRA-1426",
            "preserve_order-backwardsEdges", "preserve_order-dummyNodeNoConnectedNode", "preserve_order-dummyNodeNoConnectingNode2",
            "preserve_order-longConflictingExample", "preserve_order-noCrossings", "preserve_order-nodeBetweenDummies",
            "preserve_order-oneCrossing", "preserve_order-sameTargetTogether", "preserve_order-sameTargetTogether2",
            "preserve_order-simpleConflictingExample", "preserve_order-simpleLongEdges01", "preserve_order-simpleLongEdges02",
            "preserve_order-smallExample", "preserve_order-timedAutomaton", "preserve_order-timedAutomatonMoreEdges");

    static final List<String> DIRECTIONS = List.of("LEFT", "DOWN", "UP");
    static final List<String> ALL_DIRECTIONS = List.of("RIGHT", "LEFT", "DOWN", "UP");
    static final String DPRE = "DIRECTION_PREPROCESSOR", ALU = "ALTERNATING_LAYER_UNZIPPER", ELS = "END_LABEL_SORTER";
    /** The stops of this brief a vendored level can have by default (the two label management arms need a manager: scenarios only). */
    static final List<String> LABEL_STOPS = List.of("LABEL_DUMMY_INSERTER", "COMMENT_PREPROCESSOR", "COMMENT_NODE_MARGIN_CALCULATOR",
            "END_LABEL_PREPROCESSOR", "LABEL_DUMMY_SWITCHER", "LABEL_SIDE_SELECTOR", "COMMENT_POSTPROCESSOR", "LABEL_DUMMY_REMOVER",
            "END_LABEL_POSTPROCESSOR");

    /** One candidate row of a level: stop, variant and the options of the variant. */
    record Cand(String stop, String variant, TreeMap<String, Object> options) { }

    static List<Cand> candidates(ModelFile f) {
        List<Cand> c = new ArrayList<>();
        for (String stop : LABEL_STOPS) {
            c.add(new Cand(stop, "default", opts()));
        }
        c.add(new Cand(ALU, "alternating", opts("LAYER_UNZIPPING_STRATEGY", E("LayerUnzippingStrategy", "ALTERNATING"),
                "CONSIDER_MODEL_ORDER_STRATEGY", E("OrderingStrategy", "PREFER_EDGES"))));
        if (PINNED_MODELS.contains(f.id)) {
            for (String d : DIRECTIONS) {
                c.add(new Cand(DPRE, d, opts("DIRECTION", E("Direction", d))));
            }
        }
        if (f.id.equals("partitioning-withEdgeLabels")) {
            for (String o : List.of("NODES_AND_EDGES", "PREFER_EDGES")) {
                c.add(new Cand("P1", "MODEL_ORDER/" + o.toLowerCase().replace('_', '-'), opts("CYCLE_BREAKING_STRATEGY",
                        E("CycleBreakingStrategy", "MODEL_ORDER"), "CONSIDER_MODEL_ORDER_STRATEGY", E("OrderingStrategy", o))));
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
    }

    static void modelSpecs(List<Spec> out, List<Spec> fulls, List<ModelFile> files) {
        for (ModelFile f : files) {
            for (Level lv : levels(f)) {
                stopRows(out, f, lv);
            }
        }
        fullSpecs(fulls, files);
    }

    // ELK JSON builders of this brief: labels, comments, unzipping, interactive

    static String lab(String text, int w, int h, String placement) {
        return "{\"text\":\"" + text + "\",\"width\":" + w + ",\"height\":" + h
                + (placement == null ? "" : ",\"layoutOptions\":{\"" + pid("EDGE_LABELS_PLACEMENT") + "\":\"" + placement + "\"}") + "}";
    }

    /** A label at a position (node labels: the CommentPreprocessor reads their y). */
    static String labAt(String text, int w, int h, int x, int y) {
        return "{\"text\":\"" + text + "\",\"width\":" + w + ",\"height\":" + h + ",\"x\":" + x + ",\"y\":" + y + "}";
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

    /** Center labels (or the given placement) on short and long edges: n0-n1, n1-n2 (two labels), n0-n2 (long), n2-n3. */
    static String gPlace(String ro, String placement) {
        return flat(ro, join(plain("n0"), kn("n1", 40, 30, null), plain("n2"), plain("n3")),
                join(edl("e0", "n0", "n1", lab("ab", 30, 12, placement)),
                        edl("e1", "n1", "n2", lab("cd", 24, 10, placement), lab("ef", 36, 10, placement)),
                        edl("e2", "n0", "n2", lab("long", 44, 14, placement)),
                        edl("e3", "n2", "n3", lab("gh", 20, 10, placement))));
    }

    /** End labels at nodes: tail, center and head labels, several labels of one placement on one edge. */
    static String gHeadTail(String ro) {
        return flat(ro, join(plain("n0"), plain("n1"), plain("n2"), plain("n3")),
                join(edl("e0", "n0", "n1", lab("t0", 20, 10, "TAIL"), lab("c0", 24, 10, "CENTER"), lab("h0", 20, 10, "HEAD")),
                        edl("e1", "n1", "n2", lab("t1", 26, 12, "TAIL"), lab("t1b", 18, 10, "TAIL")),
                        edl("e2", "n0", "n2", lab("h2", 22, 10, "HEAD")),
                        edl("e3", "n2", "n3", lab("h3", 30, 12, "HEAD"), lab("h3b", 14, 10, "HEAD"))));
    }

    /** A cycle: the back edge n2-n0 (center and tail labels) and n2-n1 (tail) are reversed by the cycle breaker. */
    static String gReversed(String ro) {
        return flat(ro, join(plain("n0"), plain("n1"), plain("n2")),
                join(edl("e0", "n0", "n1", lab("ab", 28, 10, "CENTER")), edl("e1", "n1", "n2", lab("bc", 24, 10, "HEAD")),
                        edl("e2", "n2", "n0", lab("back", 36, 12, "CENTER"), lab("bt", 20, 10, "TAIL")),
                        edl("e3", "n2", "n1", lab("bt2", 22, 10, "TAIL"))));
    }

    /** End labels at ports of each side (b has FIXED_SIDE ports W, E, N, S). */
    static String gPortLabels(String ro) {
        return flat(ro, join(plain("a"), pnode("b", FS, null, W_, E_, N_, S_), plain("c"), plain("d")),
                join(edl("e0", "a", "b.p0", lab("h0", 24, 10, "HEAD"), lab("t0", 20, 10, "TAIL")),
                        edl("e1", "b.p1", "c", lab("t1", 22, 10, "TAIL"), lab("h1", 26, 12, "HEAD")),
                        edl("e2", "a", "b.p2", lab("h2", 28, 10, "HEAD")),
                        edl("e3", "b.p3", "d", lab("t3", 24, 10, "TAIL")),
                        edl("e4", "a", "d", lab("m", 20, 10, "CENTER"))));
    }

    /** FX2: three parallel edges share the source port a.p0, the target node b and its port b.p0 (EndLabelSorter.java:160-177), plus a fourth to c. */
    static String gFx2(String ro) {
        return flat(ro, join(pnode("a", FS, null, E_), pnode("b", FS, null, W_), plain("c")),
                join(edl("e0", "a.p0", "b.p0", lab("h0", 30, 10, "HEAD"), lab("t0", 18, 10, "TAIL")),
                        edl("e1", "a.p0", "b.p0", lab("h1", 20, 14, "HEAD"), lab("t1", 26, 10, "TAIL"), lab("t1b", 10, 10, "TAIL")),
                        edl("e2", "a.p0", "b.p0", lab("h2", 24, 10, "HEAD"), lab("t2", 22, 12, "TAIL")),
                        edl("e3", "a.p0", "c", lab("h3", 20, 10, "HEAD"))));
    }

    /** Comment boxes on top and bottom (CommentPreprocessor.java:126-205): a (label above), b (label below: bottom first), box to node and node to box. */
    static String gCommentsFree(String ro) {
        return flat(ro, join(kn("a", 40, 30, labels(labAt("A", 20, 10, 5, 2))), kn("b", 40, 40, labels(labAt("B", 20, 10, 5, 28))),
                plain("c"), comment("k0", 40, 20, null), comment("k1", 50, 20, null), comment("k2", 40, 20, null),
                comment("k3", 30, 20, null), comment("k4", 36, 22, labels(lab("note", 30, 10, null)))),
                join(edl("e0", "a", "b"), edl("e1", "b", "c"), edl("c0", "k0", "a"), edl("c1", "k1", "a"), edl("c2", "k2", "b"),
                        edl("c3", "b", "k3"), edl("c4", "k4", "b")));
    }

    /** Nodes with isSideFixed() ports: b has a north port (onlyBottom), c a south port (onlyTop). */
    static String gCommentsFixed(String ro) {
        return flat(ro, join(plain("a"), pnode("b", FS, null, W_, E_, N_), pnode("c", FS, null, W_, S_), plain("d"), plain("e"),
                comment("k0", 40, 20, null), comment("k1", 40, 24, null), comment("k2", 36, 20, null), comment("k3", 44, 20, null)),
                join(edl("e0", "a", "b.p0"), edl("e1", "b.p1", "c.p0"), edl("e2", "d", "b.p2"), edl("e3", "c.p1", "e"),
                        edl("c0", "k0", "b"), edl("c1", "k1", "b"), edl("c2", "k2", "c"), edl("c3", "c", "k3")));
    }

    /** The graph of AlternatingLayerUnzipperTest: n0 -> children -> nf, n1 with options (layer split, reset, minimize); optional long edge n0 -> nf. */
    static String gUnzip(String ro, int children, boolean longEdge, String... n1Options) {
        List<String> kids = new ArrayList<>(List.of(plain("n0"), kn("n1", 30, 30, null, n1Options)));
        for (int i = 2; i <= children; i++) {
            kids.add(plain("n" + i));
        }
        kids.add(plain("nf"));
        List<String> edges = new ArrayList<>();
        for (int i = 1; i <= children; i++) {
            edges.add("n0>n" + i);
            edges.add("n" + i + ">nf");
        }
        if (longEdge) {
            edges.add("n0>nf");
        }
        return flat(ro + (ro.isEmpty() ? "" : ",") + ropts("LAYER_UNZIPPING_STRATEGY", "ALTERNATING", "CONSIDER_MODEL_ORDER_STRATEGY",
                "PREFER_EDGES"), String.join(",", kids), eds(edges.toArray(new String[0])));
    }

    /** Wide labels everywhere a label manager looks: center labels, end labels, node and port labels, a comment label (G6). */
    static String gManager(String ro) {
        return flat(ro, join(lnode("a", FS, 90, labels(labAt("Alpha node label", 200, 14, 0, 0)), E_, S_),
                lnode("b", FS, 90, labels(labAt("Bravo", 120, 14, 0, 0)), W_, N_), plain("c"),
                comment("k0", 40, 20, labels(lab("a wide comment label", 160, 10, null)))),
                join(edl("e0", "a.p0", "b.p0", lab("head", 130, 10, "HEAD"), lab("tail", 120, 10, "TAIL")),
                        edl("e1", "b", "c", lab("a center label that is wide", 160, 12, "CENTER")),
                        edl("e2", "a", "c", lab("a really wide long edge center label", 220, 14, "CENTER")),
                        edl("c0", "k0", "b")));
    }

    /** A second wide-label graph: two center labels on one edge and short end labels (some below the target width). */
    static String gManager2(String ro) {
        return flat(ro, join(lnode("a", FS, 30, labels(lab("n", 30, 10, null)), E_), plain("b"), plain("c")),
                join(edl("e0", "a.p0", "b", lab("short", 30, 10, "CENTER"), lab("a rather wide second center label", 150, 12, "CENTER")),
                        edl("e1", "b", "c", lab("tail", 40, 10, "TAIL"), lab("head", 140, 10, "HEAD")),
                        edl("e2", "a", "c", lab("also wide center label", 100, 10, "CENTER"))));
    }

    /** The graph of the interactive rows: n0 -> n1, n2 -> n3 -> n4, n5; node options per variant, root options ro. */
    static String gInteractive(String ro, Map<Integer, String[]> nodeOptions) {
        List<String> kids = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            String[] o = nodeOptions.get(i);
            kids.add(o == null ? plain("n" + i) : kn("n" + i, 30, 30, null, o));
        }
        return flat(ro + (ro.isEmpty() ? "" : ",") + ropts("GENERATE_POSITION_AND_LAYER_IDS", "true"), String.join(",", kids),
                eds("n0>n1", "n0>n2", "n1>n3", "n2>n3", "n3>n4", "n3>n5"));
    }

    // Group full: the families of this brief

    static Spec full(String family, String model, String variant, String path, String elk, TreeMap<String, Object> options, String mode) {
        return new Spec("full/" + family + "/" + model + "/" + variant, "full", path,
                path == null ? () -> ElkGraphJson.forGraph(elk).toElk() : null, null, options, null, null, mode);
    }

    static Spec full(String family, String model, String variant, String path, String elk, TreeMap<String, Object> options) {
        return full(family, model, variant, path, elk, options, null);
    }

    /** The model with the option set on every edge label (the option is a per-label one), as the inline ELK JSON the row replays. */
    static String withEdgeLabelOption(String rel, String constant, String value) {
        ElkNode g = loadFile(rel);
        var data = LayoutMetaDataService.getInstance().getOptionData(pid(constant));
        List<ElkLabel> edgeLabels = new ArrayList<>();
        for (TreeIterator<EObject> it = g.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkLabel l && l.eContainer() instanceof ElkEdge) {
                edgeLabels.add(l); // collected first: setting a property changes the contents
            }
        }
        edgeLabels.forEach(l -> l.setProperty(data, data.parseValue(value)));
        return export(g);
    }

    static final List<String> LABEL_OPTION_MODELS = List.of("edge_label_placement-edge_labels", "edge_label_placement-endLabelsWithPorts",
            "edge_label_placement-labelStacking_right_up", "edge_label_placement-smartLabelSideSelection_right_01",
            "ticket-905_beginLabelAboveEdge", "labels-edge_label_side_selection-smart_01");

    static void labelOptionSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : LABEL_OPTION_MODELS) {
            ModelFile f = model(files, id);
            for (String p : List.of("CENTER", "HEAD", "TAIL")) {
                out.add(full("label-options", f.id, "placement-" + p, null, withEdgeLabelOption(f.rel, "EDGE_LABELS_PLACEMENT", p), fopts()));
            }
            for (EdgeLabelSideSelection s : EdgeLabelSideSelection.values()) {
                out.add(full("label-options", f.id, "side-" + s.name(), f.rel, null,
                        fopts("EDGE_LABELS_SIDE_SELECTION", E("EdgeLabelSideSelection", s))));
            }
            for (CenterEdgeLabelPlacementStrategy c : CenterEdgeLabelPlacementStrategy.values()) {
                out.add(full("label-options", f.id, "center-" + c.name(), f.rel, null,
                        fopts("EDGE_LABELS_CENTER_LABEL_PLACEMENT_STRATEGY", E("CenterEdgeLabelPlacementStrategy", c))));
            }
            String inline = withEdgeLabelOption(f.rel, "EDGE_LABELS_INLINE", "true");
            for (String d : ALL_DIRECTIONS) {
                out.add(full("label-options", f.id, "inline-" + d, null, inline, fopts("DIRECTION", E("Direction", d))));
            }
        }
    }

    static void commentSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : List.of("comment_boxes-multiple_comments", "comment_boxes-multipler_comments", "comment_boxes-single_comment_01",
                "node_placement-KIPRA-1426-demo2-KIPRA-1426")) {
            out.add(full("comments", id, "default", model(files, id).rel, null, fopts()));
        }
        out.add(full("comments", "inline-top-bottom", "default", null, gCommentsFree(""), fopts()));
        out.add(full("comments", "inline-fixed-side", "default", null, gCommentsFixed(""), fopts()));
    }

    static final String LAYER_SPLIT = "LAYER_UNZIPPING_LAYER_SPLIT", RESET_LONG = "LAYER_UNZIPPING_RESET_ON_LONG_EDGES",
            MINIMIZE = "LAYER_UNZIPPING_MINIMIZE_EDGE_LENGTH";

    static void unzipSpecs(List<Spec> out) {
        for (int split : List.of(2, 3, 4)) {
            out.add(full("unzipping", "fan5", "split-" + split, null, gUnzip("", 5, false, LAYER_SPLIT, "" + split), fopts()));
            out.add(full("unzipping", "fan5-long", "split-" + split, null, gUnzip("", 5, true, LAYER_SPLIT, "" + split), fopts()));
        }
        for (boolean b : new boolean[] {true, false}) {
            out.add(full("unzipping", "fan4-long", "reset-" + b, null, gUnzip("", 4, true, LAYER_SPLIT, "2", RESET_LONG, "" + b), fopts()));
            out.add(full("unzipping", "fan4", "minimize-" + b, null, gUnzip("", 4, false, LAYER_SPLIT, "2", MINIMIZE, "" + b), fopts()));
            out.add(full("unzipping", "fan5-long", "minimize-" + b, null, gUnzip("", 5, true, LAYER_SPLIT, "3", MINIMIZE, "" + b), fopts()));
        }
    }

    /** The variants of the interactive rows (G5): node options by node index. LayerConstraint arms, choice constraints, position choices, chains. */
    static Map<String, Map<Integer, String[]>> interactiveVariants() {
        Map<String, Map<Integer, String[]>> v = new LinkedHashMap<>();
        v.put("none", Map.of());
        v.put("layer-first", Map.of(3, new String[] {"LAYERING_LAYER_CONSTRAINT", "FIRST"}));
        v.put("layer-last", Map.of(1, new String[] {"LAYERING_LAYER_CONSTRAINT", "LAST"}));
        v.put("layer-first-separate", Map.of(5, new String[] {"LAYERING_LAYER_CONSTRAINT", "FIRST_SEPARATE"}));
        v.put("layer-last-separate", Map.of(2, new String[] {"LAYERING_LAYER_CONSTRAINT", "LAST_SEPARATE"}));
        v.put("layer-choice", Map.of(4, new String[] {"LAYERING_LAYER_CHOICE_CONSTRAINT", "1"}));
        v.put("position-choice", Map.of(1, new String[] {"CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT", "0"},
                2, new String[] {"CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT", "1"}));
        v.put("position-choice-last-layer", Map.of(5, new String[] {"CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT", "0"}));
        v.put("chain-pred", Map.of(5, new String[] {"CROSSING_MINIMIZATION_IN_LAYER_PRED_OF", "n4"}));
        v.put("chain-succ", Map.of(4, new String[] {"CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF", "n5"}));
        v.put("chain-both-a", Map.of(1, new String[] {"CROSSING_MINIMIZATION_IN_LAYER_PRED_OF", "n2",
                "CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF", "n4"}));
        v.put("chain-both-b", Map.of(4, new String[] {"CROSSING_MINIMIZATION_IN_LAYER_PRED_OF", "n5",
                "CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF", "n2"}));
        v.put("chain-pair", Map.of(4, new String[] {"CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF", "n5"},
                5, new String[] {"CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF", "n1"}));
        v.put("layer-choice-and-chain", Map.of(5, new String[] {"LAYERING_LAYER_CHOICE_CONSTRAINT", "2",
                "CROSSING_MINIMIZATION_IN_LAYER_PRED_OF", "n4"}));
        return v;
    }

    static void interactiveSpecs(List<Spec> out) {
        for (Map.Entry<String, Map<Integer, String[]>> v : interactiveVariants().entrySet()) {
            for (String d : ALL_DIRECTIONS) {
                out.add(full("interactive", "graph6-" + v.getKey(), d, null, gInteractive(ropts("DIRECTION", d), v.getValue()),
                        fopts(), "interactive"));
            }
        }
    }

    /** Issue871Test: n1..n4 / n1..n3 with node labels n1.., feedback edges; padding 0, spacing 10 / 20, model order, no crossing min. */
    static String g871(boolean feedback, int nodes, String... edges) {
        String ro = ropts("DIRECTION", "RIGHT", "CYCLE_BREAKING_STRATEGY", "MODEL_ORDER", "CONSIDER_MODEL_ORDER_STRATEGY", "PREFER_EDGES",
                "CROSSING_MINIMIZATION_STRATEGY", "NONE", "CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE", "OFF", "PADDING",
                "[top=0.0,left=0.0,bottom=0.0,right=0.0]", "SPACING_NODE_NODE", "10.0", "SPACING_NODE_NODE_BETWEEN_LAYERS", "20.0")
                + (feedback ? "," + ropts("FEEDBACK_EDGES", "true") : "");
        List<String> kids = new ArrayList<>();
        for (int i = 1; i <= nodes; i++) {
            kids.add(kn("n" + i, 30, 30, "\"labels\":[{\"text\":\"n" + i + "\"}]"));
        }
        List<String> edgeJson = new ArrayList<>();
        for (int i = 0; i < edges.length; i++) {
            String[] parts = edges[i].split(":");
            String[] ends = parts[0].split(">");
            edgeJson.add(edl("e" + i, ends[0], ends[1], parts.length > 1 ? new String[] {"{\"text\":\"" + parts[1] + "\"}"} : new String[0]));
        }
        return flat(ro, String.join(",", kids), String.join(",", edgeJson));
    }

    static void issueSpecs(List<Spec> out, List<ModelFile> files) {
        for (ModelFile f : files) {
            String name = f.model.substring(f.model.lastIndexOf('/') + 1);
            if (name.startsWith("445_")) { // Issue445Test: the graph's padding is set to zero
                ElkNode g = loadFile(f.rel);
                g.setProperty(LayeredOptions.PADDING, new ElkPadding(0));
                out.add(full("issues", f.id, "padding-0", null, export(g), fopts()));
            } else if (name.startsWith("471_") || name.startsWith("541_") || name.startsWith("656_") || name.startsWith("905_")
                    || name.startsWith("599_")) { // Issue471Test, 541, PartitionTest, Issue905Test, LabelSideSelectorTest
                out.add(full("issues", f.id, "default", f.rel, null, fopts()));
            }
        }
        out.add(full("issues", "issue871-feedback-below", "default", null, g871(true, 4, "n1>n2", "n1>n3", "n2>n4", "n4>n3"), fopts()));
        out.add(full("issues", "issue871-feedback-basic", "default", null, g871(true, 3, "n1>n2", "n2>n3", "n3>n2"), fopts()));
        out.add(full("issues", "issue871-no-feedback", "default", null,
                g871(false, 4, "n1>n2:1", "n1>n4:2", "n2>n4", "n3>n2", "n3>n4"), fopts()));
        for (String d : ALL_DIRECTIONS) { // FX2 (G9): end labels on parallel edges sharing source port, target node and target port
            out.add(full("issues", "fx2-parallel-end-labels", d, null, gFx2(ropts("DIRECTION", d)), fopts()));
        }
    }

    static void loggedSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : List.of("comment_boxes-single_comment_01")) { // each logged row is about 290 kB (journaled trim)
            out.add(full("logged", id, "logging", model(files, id).rel, null, fopts(), "logging"));
        }
        out.add(full("logged", "inline-fx2", "logging-down", null, gFx2(ropts("DIRECTION", "DOWN")), fopts(), "logging"));
        out.add(full("logged", "inline-unzip", "logging", null, gUnzip("", 4, true, LAYER_SPLIT, "2"), fopts(), "logging"));
    }

    static void fullSpecs(List<Spec> out, List<ModelFile> files) {
        for (ModelFile f : files) {
            out.add(full("labels", f.id, "default", f.rel, null, fopts()));
        }
        labelOptionSpecs(out, files);
        commentSpecs(out, files);
        unzipSpecs(out);
        interactiveSpecs(out);
        issueSpecs(out, files);
        loggedSpecs(out, files);
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

    /** A terminal-step row: [labelManager,] importGraph, normalise, <op>. */
    static void terminal(String name, String elk, String op, boolean manager) {
        planOfGraph(elk, null, manager);
        List<Object> st = new ArrayList<>();
        if (manager) {
            st.add(S("labelManager", SHRINK));
        }
        st.add(imp(null));
        st.add(norm());
        st.add(S(op));
        add("scenarios/Layout/" + name, elk, st);
    }

    /** One scenario family: the stop, its class name (id prefix), the graphs (name -> builder of the root options -> ELK JSON). */
    record Family(String stop, String cls, String prefix, boolean manager, Map<String, java.util.function.UnaryOperator<String>> graphs) { }

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

    static List<Family> families() {
        java.util.function.UnaryOperator<String> center = ro -> gPlace(ro, "CENTER"), head = ro -> gPlace(ro, "HEAD"),
                tail = ro -> gPlace(ro, "TAIL"), headTail = ro -> gHeadTail(ro), reversed = ro -> gReversed(ro),
                ports = ro -> gPortLabels(ro), fx2 = ro -> gFx2(ro), cfree = ro -> gCommentsFree(ro), cfixed = ro -> gCommentsFixed(ro),
                m1 = ro -> gManager(ro), m2 = ro -> gManager2(ro);
        Map<String, java.util.function.UnaryOperator<String>> centerGraphs = graphs("center", center, "head", head, "tail", tail,
                "head-tail", headTail, "reversed", reversed);
        Map<String, java.util.function.UnaryOperator<String>> endGraphs = graphs("head-tail", headTail, "port-labels", ports, "fx2", fx2);
        Map<String, java.util.function.UnaryOperator<String>> commentGraphs = graphs("free", cfree, "fixed-side", cfixed);
        java.util.function.UnaryOperator<String> z1 = ro -> gUnzip(ro, 5, false, LAYER_SPLIT, "2"),
                z2 = ro -> gUnzip(ro, 5, true, LAYER_SPLIT, "3"),
                z3 = ro -> gUnzip(ro, 4, true, LAYER_SPLIT, "2", RESET_LONG, "false");
        Map<String, java.util.function.UnaryOperator<String>> unzipGraphs = graphs("fan5-split2", z1, "fan5-long-split3", z2,
                "fan4-long-noreset", z3);
        Map<String, java.util.function.UnaryOperator<String>> managerGraphs = graphs("wide", m1, "wide-mixed", m2);
        List<Family> f = new ArrayList<>();
        for (String stop : List.of("LABEL_DUMMY_INSERTER", "LABEL_DUMMY_SWITCHER", "LABEL_DUMMY_REMOVER")) {
            f.add(new Family(stop, camel(stop), "", false, centerGraphs));
        }
        f.add(new Family("LABEL_SIDE_SELECTOR", "LabelSideSelector", "", false, graphs("center", center, "head-tail", headTail,
                "reversed", reversed, "port-labels", ports, "fx2", fx2)));
        f.add(new Family("END_LABEL_PREPROCESSOR", "EndLabelPreprocessor", "", false, endGraphs));
        f.add(new Family("END_LABEL_POSTPROCESSOR", "EndLabelPostprocessor", "", false, endGraphs));
        f.add(new Family(ELS, "EndLabelSorter", "", false, endGraphs));
        for (String stop : List.of("COMMENT_PREPROCESSOR", "COMMENT_NODE_MARGIN_CALCULATOR", "COMMENT_POSTPROCESSOR")) {
            f.add(new Family(stop, camel(stop), "", false, commentGraphs));
        }
        f.add(new Family(ALU, "AlternatingLayerUnzipper", "", false, unzipGraphs));
        f.add(new Family("CENTER_LABEL_MANAGEMENT_PROCESSOR", "LabelManagementProcessor", "center/", true, managerGraphs));
        f.add(new Family("END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR", "LabelManagementProcessor", "end-node-port/", true, managerGraphs));
        return f;
    }

    static String camel(String constant) {
        StringBuilder sb = new StringBuilder();
        for (String part : constant.split("_")) {
            sb.append(part.charAt(0)).append(part.substring(1).toLowerCase());
        }
        return sb.toString();
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        for (Family fam : families()) {
            for (Map.Entry<String, java.util.function.UnaryOperator<String>> g : fam.graphs.entrySet()) {
                for (String d : ALL_DIRECTIONS) {
                    String elk = g.getValue().apply(ropts("DIRECTION", d));
                    String name = fam.prefix + g.getKey() + "/" + d;
                    sc(fam.cls, name, fam.stop + "/" + d, elk, fam.stop, fam.manager);
                    if (d.equals("RIGHT")) { // the whole chain once per graph (journaled trim: the ref stays well under 16 MiB)
                        sc(fam.cls, name + "/end", "end/" + fam.stop + "/" + d, elk, null, fam.manager);
                    }
                }
            }
        }
        // The label manager kind "none": nothing is set, the plan has no management arm.
        for (String d : List.of("RIGHT", "DOWN")) {
            String elk = gManager(ropts("DIRECTION", d));
            List<Object> st = chainOf(elk, null, null, false);
            st.add(0, S("labelManager", NO_MANAGER));
            st.add(dump());
            add("scenarios/LabelManagementProcessor/none/" + d, elk, st);
        }
        // The terminal steps (G2, G5, G6): logging, interactive, and a layout through a manager.
        // The logging rows hold every logged DOT and JSON graph (about 280 kB each): four rows, one direction per graph pair (journaled trim).
        terminal("logging/place-center/RIGHT", gPlace(ropts("DIRECTION", "RIGHT"), "CENTER"), "logging", false);
        terminal("logging/place-center/UP", gPlace(ropts("DIRECTION", "UP"), "CENTER"), "logging", false);
        terminal("logging/comments-free/DOWN", gCommentsFree(ropts("DIRECTION", "DOWN")), "logging", false);
        terminal("logging/fx2/LEFT", gFx2(ropts("DIRECTION", "LEFT")), "logging", false);
        for (String d : ALL_DIRECTIONS) {
            terminal("manager/wide/" + d, gManager(ropts("DIRECTION", d)), "layout", true);
        }
        for (Map.Entry<String, Map<Integer, String[]>> v : interactiveVariants().entrySet()) {
            for (String d : List.of("RIGHT", "DOWN")) {
                terminal("interactive/" + v.getKey() + "/" + d, gInteractive(ropts("DIRECTION", d), v.getValue()), "interactive", false);
            }
        }
    }

    // Group sites (T16): one step row per scenario of plans/layered-labels/unreached.md. Expectations come from the oracle only.

    static List<Spec> SITES;
    static final String LCC = "LAYERING_LAYER_CHOICE_CONSTRAINT", PCC = "CROSSING_MINIMIZATION_POSITION_CHOICE_CONSTRAINT",
            PRED = "CROSSING_MINIMIZATION_IN_LAYER_PRED_OF", SUCC = "CROSSING_MINIMIZATION_IN_LAYER_SUCC_OF",
            LC = "LAYERING_LAYER_CONSTRAINT", COMMENT_BOX = "COMMENT_BOX", CENTER_STRATEGY = "EDGE_LABELS_CENTER_LABEL_PLACEMENT_STRATEGY";

    /** sites/<id>: stop != null: the chain up to the stop and a dump; otherwise [labelManager,] importGraph, normalise, <terminal>. */
    static void site(String id, String elk, String stop, String terminal, boolean manager) {
        List<Object> st;
        if (stop != null) {
            st = chainOf(elk, null, stop, manager);
            st.add(dump());
        } else {
            planOfGraph(elk, null, manager);
            st = new ArrayList<>();
            if (manager) {
                st.add(S("labelManager", SHRINK));
            }
            st.add(imp(null));
            st.add(norm());
            st.add(S(terminal));
        }
        SITES.add(new Spec("sites/" + id, "sites", null, () -> ElkGraphJson.forGraph(elk).toElk(), null, new TreeMap<>(), null, st, null));
    }

    /** A site with a dump at the stop and, as <id>/layout, the whole layout. */
    static void siteAndLayout(String id, String elk, String stop) {
        site(id, elk, stop, null, false);
        site(id + "/layout", elk, null, "layout", false);
    }

    /** A node of 30 x 30 with layout options (constant, value, ...). */
    static String nd(String id, String... opts) {
        return kn(id, 30, 30, null, opts);
    }

    /** A graph of the interactive rows: the root asks for position and layer ids; direction null leaves it undefined. */
    static String gi(String direction, String nodes, String edges) {
        return flat((direction == null ? "" : ropts("DIRECTION", direction) + ",") + ropts("GENERATE_POSITION_AND_LAYER_IDS", "true"), nodes, edges);
    }

    static void interactiveSite(String id, String direction, String nodes, String edges) {
        site("InteractiveLayeredGraphVisitor/" + id, gi(direction, nodes, edges), null, "interactive", false);
    }

    /** A node with FIXED_SIDE ports on the given sides (ids <id>.p0 ...) and further options (constant, value, ...). */
    static String fixedNode(String id, String[] opts, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj(id, i, sides[i], null));
        }
        return nodeJson(id, null, ropts(Stream.concat(Stream.of("PORT_CONSTRAINTS", FS), Arrays.stream(opts)).toArray(String[]::new)),
                "\"ports\":[" + String.join(",", ports) + "]");
    }

    static String labelled(String id, String src, String tgt, int w) {
        return edl(id, src, tgt, lab("l" + id, w, 10, null));
    }

    static void siteSpecs(List<Spec> out) {
        SITES = out;
        // Sc1: the segment graph of LinearSegmentsNodePlacer, logged per component (two components: several segments, and one)
        site("JsonDebugUtil/segmentGraph", flat(ropts("NODE_PLACEMENT_STRATEGY", "LINEAR_SEGMENTS", "SEPARATE_CONNECTED_COMPONENTS", "true"),
                join(nd("a"), nd("b"), nd("c"), nd("d")), eds("a>b", "b>c", "a>c")), null, "logging", false);
        interactiveSites();
        commentSites();
        labelSites();
        handOffSites();
    }

    static void interactiveSites() {
        String r = "RIGHT", chain = eds("a>b", "b>c", "c>d");
        // Sc2
        interactiveSite("layerChoice/minusOne", r, join(nd("a"), nd("b"), nd("c"), nd("d", LCC, "-1")), chain);
        interactiveSite("layerChoice/all", r, join(nd("a", LCC, "0"), nd("b", LCC, "1"), nd("c", LCC, "1"), nd("d", LCC, "2")), chain);
        // Sc3: four unconnected nodes and a chain x > y
        String xy = eds("x>y");
        interactiveSite("layerRelative/succ", r, join(nd("a", LCC, "1", SUCC, "b"), nd("b"), nd("c"), nd("d"), nd("x"), nd("y")), xy);
        interactiveSite("layerRelative/targetRelative", r, join(nd("a", LCC, "1", PRED, "b"), nd("b", PRED, "c"), nd("c"), nd("d"), nd("x"),
                nd("y")), xy);
        interactiveSite("layerRelative/referencedChoice", r, join(nd("a", PRED, "b"), nd("b", LCC, "1"), nd("c"), nd("d"), nd("x"), nd("y")), xy);
        // Sc4
        String abc = eds("a>b", "b>c");
        interactiveSite("shift/existingLayer", r, join(nd("a", LCC, "0"), nd("b"), nd("c")), abc);
        interactiveSite("shift/ports", r, join(fixedNode("a", new String[] {LCC, "0"}, E_), fixedNode("b", new String[0], W_, E_),
                fixedNode("c", new String[0], W_)), join(edl("e0", "a.p0", "b.p0"), edl("e1", "b.p1", "c.p0")));
        // Sc5: one layer of unconnected nodes
        String none = "";
        interactiveSite("positionRelative/pred", r, join(nd("a", PCC, "0", PRED, "b"), nd("b", SUCC, "c"), nd("c"), nd("d"), nd("e")), none);
        interactiveSite("positionRelative/succ", r, join(nd("a", PCC, "2", SUCC, "b"), nd("b", PCC, "1"), nd("c"), nd("d"), nd("e")), none);
        interactiveSite("positionRelative/bothTargetChoice", r, join(nd("x", PRED, "y", SUCC, "z"), nd("y", PCC, "2"), nd("z"), nd("v"), nd("w")), none);
        interactiveSite("positionRelative/bothTargetPred", r, join(nd("x", PRED, "y", SUCC, "z"), nd("y", PRED, "w"), nd("z"), nd("w"), nd("v")), none);
        interactiveSite("positionRelative/oneTargetChoice", r, join(nd("a", PRED, "b"), nd("b", PCC, "1"), nd("c", SUCC, "d"), nd("d", PCC, "2"),
                nd("e")), none);
        // Sc6
        interactiveSite("circle/pred", r, join(nd("a", PRED, "b"), nd("b", PRED, "a"), nd("c")), none);
        interactiveSite("circle/succ", r, join(nd("a", SUCC, "b"), nd("b", SUCC, "a"), nd("c")), none);
        // Sc7: s has position choice 1
        interactiveSite("swap/unrelated", r, join(nd("s", PCC, "1"), nd("a"), nd("b"), nd("c")), none);
        interactiveSite("swap/chain", r, join(nd("s", PCC, "1"), nd("r", PRED, "u0"), nd("u0"), nd("u1"), nd("u2")), none);
        interactiveSite("swap/chainAtEnd", r, join(nd("s", PCC, "1"), nd("r", PRED, "u0"), nd("u0")), none);
        interactiveSite("swap/backward", r, join(nd("s", PCC, "2"), nd("x", PRED, "y"), nd("y", PRED, "z"), nd("z")), none);
        interactiveSite("swap/longChain", r, join(nd("s", PCC, "1"), nd("r", PRED, "u0"), nd("u0"), nd("v", SUCC, "w"), nd("w")), none);
        // Sc8: no direction on the root
        interactiveSite("undefinedDirection", null, join(nd("a"), nd("b"), nd("c")), eds("a>c", "b>c"));
    }

    static void commentSites() {
        // Sc9: a comment box with four oddly connected edges (two of them share a port with another edge)
        siteAndLayout("CommentPreprocessor/oddlyConnected", flat("", join(comment("c", 40, 20, null), pnode("a", FS, null, W_), nd("d"), nd("b"),
                pnode("e", FS, null, E_), nd("f"), nd("g")), join(edl("e0", "c", "a.p0"), edl("e1", "a.p0", "d"), edl("e2", "c", "b"),
                edl("e3", "e.p0", "c"), edl("e4", "f", "e.p0"), edl("e5", "g", "c"))), "COMMENT_PREPROCESSOR");
        // Sc10: the label sits at the top, so the bottom is favoured; the fourth box goes to the top
        String n10 = kn("n", 60, 60, labels(labAt("L", 20, 10, 0, 0)));
        siteAndLayout("CommentPreprocessor/fourBoxes", flat("", join(n10, comment("c0", 40, 20, null), comment("c1", 40, 20, null),
                comment("c2", 40, 20, null), comment("c3", 40, 20, null)), join(edl("e0", "c0", "n"), edl("e1", "c1", "n"), edl("e2", "c2", "n"),
                edl("e3", "c3", "n"))), "COMMENT_PREPROCESSOR");
        // Sc11: an idle explicit port on the box before the port of its edge
        String box = fixedNode("c", new String[] {COMMENT_BOX, "true"}, E_);
        site("CommentPostprocessor/idlePort", flat("", join(box, nd("n")), edl("e0", "c", "n")), null, "layout", false);
        // Sc14: attached comments of a node without a label, under a label manager
        site("LabelManagementProcessor/comments", flat("", join(nd("n"), comment("c1", 40, 20, labels(lab("a wide label of the first box", 160, 10, null))),
                comment("c2", 40, 20, labels(lab("a wide label of the second box", 180, 10, null))), comment("c3", 40, 20, null)),
                join(edl("e1", "c1", "n"), edl("e2", "c2", "n"), edl("e3", "c3", "n"))), null, "layout", true);
    }

    static void labelSites() {
        // Sc12: a negative thickness on an edge with a center label
        String thick = "{\"id\":\"e0\",\"sources\":[\"a\"],\"targets\":[\"b\"],\"layoutOptions\":{\"" + pid("EDGE_THICKNESS") + "\":\"-2\"},"
                + labels(lab("wide", 40, 10, null)) + "}";
        siteAndLayout("LabelDummyInserter/negativeThickness", flat("", join(nd("a"), nd("b")), thick), "LABEL_DUMMY_INSERTER");
        // Sc13: every label is wider than any layer; three of them span two or more layers
        String slim = ropts(CENTER_STRATEGY, "SPACE_EFFICIENT_LAYER");
        site("LabelDummySwitcher/spaceEfficient", flat(slim, join(kn("a", 20, 30, null), kn("b", 20, 30, null), kn("c", 20, 30, null),
                kn("d", 20, 30, null), kn("e", 20, 30, null)), join(edl("e0", "a", "b"), edl("e1", "b", "c"), edl("e2", "c", "d"), edl("e3", "d", "e"),
                labelled("e4", "a", "e", 100), labelled("e5", "a", "d", 80), labelled("e6", "b", "e", 60), labelled("e7", "c", "e", 90))),
                "LABEL_DUMMY_SWITCHER", null, false);
        // Sc15: layer splits 2, 3 and 4 in one layer: the minimum is taken
        site("AlternatingLayerUnzipper/mixedSplit", flat(ropts("LAYER_UNZIPPING_STRATEGY", "ALTERNATING", "CONSIDER_MODEL_ORDER_STRATEGY",
                "NODES_AND_EDGES"), join(nd("s"), nd("x", LAYER_SPLIT, "2"), nd("y", LAYER_SPLIT, "3"), nd("z", LAYER_SPLIT, "4")),
                eds("s>x", "s>y", "s>z")), ALU, null, false);
    }

    static void handOffSites() {
        // H1: label dummies in front of FIRST and behind LAST
        String h1 = flat("", join(nd("fs", LC, "FIRST_SEPARATE"), nd("f", LC, "FIRST"), nd("m"), nd("l", LC, "LAST"), nd("ls", LC, "LAST_SEPARATE")),
                join(labelled("e0", "fs", "f", 30), labelled("e1", "l", "ls", 30), edl("e2", "f", "m"), edl("e3", "m", "l")));
        siteAndLayout("LayerConstraintPostprocessor/labelLayers", h1, "LAYER_CONSTRAINT_POSTPROCESSOR");
        // H2
        String h2 = flat(ropts("LAYERING_STRATEGY", "BF_MODEL_ORDER"), join(nd("a"), nd("b"), nd("c")),
                join(labelled("e0", "a", "b", 30), labelled("e1", "b", "c", 30), labelled("e2", "a", "c", 30)));
        site("BreadthFirstModelOrderLayerer/labels", h2, P2 + "/BF_MODEL_ORDER", null, false);
        // H3
        String h3 = flat(ropts("LAYERING_STRATEGY", "DF_MODEL_ORDER"), join(nd("a"), nd("b"), nd("c"), nd("d"), nd("e")),
                join(labelled("e0", "a", "b", 30), labelled("e1", "c", "d", 30), labelled("e2", "d", "e", 30)));
        site("DepthFirstModelOrderLayerer/labels", h3, P2 + "/DF_MODEL_ORDER", null, false);
        // H4: model order node promotion over label layers
        for (String v : List.of("LEFT_TO_RIGHT", "RIGHT_TO_LEFT")) {
            String ro = ropts("LAYERING_NODE_PROMOTION_STRATEGY", "MODEL_ORDER_" + v);
            // all edges carry a center label: the layer after a candidate holds only label dummies; the two graphs found by a search
            // over random graphs (labels connected to the candidate with the far end more than 2 layers away, left to right and right to left)
            int[][] pairs = v.equals("LEFT_TO_RIGHT") ? new int[][] {{0, 5}, {1, 2}, {1, 3}, {2, 4}, {3, 5}, {4, 5}}
                    : new int[][] {{0, 1}, {0, 2}, {0, 5}, {1, 4}, {4, 6}, {5, 6}};
            List<String> kids = new ArrayList<>(), edgeJson = new ArrayList<>();
            for (int i = 0; i < (v.equals("LEFT_TO_RIGHT") ? 6 : 7); i++) {
                kids.add(nd("n" + i));
            }
            for (int i = 0; i < pairs.length; i++) {
                edgeJson.add(labelled("e" + i, "n" + pairs[i][0], "n" + pairs[i][1], 30));
            }
            site("NodePromotion/modelOrderLabels/" + v, flat(ro, String.join(",", kids), String.join(",", edgeJson)), "NODE_PROMOTION", null, false);
            // the unlabelled edges n0 > n3 and n2 > n3 keep the label layer after n0 from blocking; n1 has no model order (a normal node in the next layer)
            if (v.equals("LEFT_TO_RIGHT")) {
                String m1Edges = join(labelled("e0", "n0", "n1", 30), edl("e1", "n0", "n3"), edl("e2", "n2", "n3"));
                site("NodePromotion/modelOrderLabels/" + v + "/blocked", flat(ro, join(nd("n0"), nd("n1"), nd("n2"), nd("n3")), m1Edges),
                        "NODE_PROMOTION", null, false);
                site("NodePromotion/modelOrderLabels/" + v + "/noModelOrder", flat(ro, join(nd("n0"), nd("n1", "CONSIDER_MODEL_ORDER_NO_MODEL_ORDER", "true"),
                        nd("n2"), nd("n3")), m1Edges), "NODE_PROMOTION", null, false);
            }
        }
        // H5
        site("HyperedgeDummyMerger/labelledSameTarget", flat("", join(fixedNode("a", new String[0], E_), fixedNode("b", new String[0], E_),
                nd("m1"), nd("m2"), fixedNode("t", new String[0], W_)), join(labelled("e0", "a.p0", "t.p0", 30), labelled("e1", "b.p0", "t.p0", 30),
                edl("e2", "a", "m1"), edl("e5", "b", "m1"), edl("e3", "m1", "m2"), edl("e4", "m2", "t"))), "HYPEREDGE_DUMMY_MERGER", null, false);
        // H6
        siteAndLayout("SortByInputModelProcessor/northSouthInOut", flat(ropts("CONSIDER_MODEL_ORDER_STRATEGY", "NODES_AND_EDGES", "CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE", "0.5"),
                join(fixedNode("a", new String[0], N_), fixedNode("b", new String[0], N_), nd("c")), join(edl("e0", "a.p0", "b.p0"), edl("e1", "b.p0", "c"))),
                P3 + "/LAYER_SWEEP");
    }

    // Building the file

    static final boolean MARKERS = System.getenv("LABELS_MARKERS") != null;
    static final boolean DISCOVER = System.getenv("LABELS_DISCOVER") != null;
    static final String FILTER = System.getenv("LABELS_FILTER");
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
                    + (REFUSAL_CATEGORIES.containsKey(m.name()) ? 1 : 0);
            if (sets != 1) {
                throw new Bug("IntermediateProcessorStrategy." + m.name() + " is in " + sets + " of the ported sets and refusal categories");
            }
        }
    }

    static final Map<String, Long> BYTES = new TreeMap<>();

    /** Records every row; returns the output file text. */
    static String buildAll() {
        RAN.clear();
        REFUSED_BY_CATEGORY.clear();
        NOT_IN_PLAN.clear();
        FAMILIES.clear();
        BYTES.clear();
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
            } catch (NullPointerException | IndexOutOfBoundsException e) {
                if (DISCOVER) {
                    System.err.println("DISCOVER oracle throws " + s.id + " " + e.getClass().getSimpleName() + "@" + e.getStackTrace()[0]);
                    continue;
                }
                throw e;
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
        REFUSED_BY_CATEGORY.forEach((k, n) -> System.err.println("accepted refusal category " + k + ": " + n + " rows"));
        NOT_IN_PLAN.forEach((k, n) -> System.err.println("stop not in the algorithm (skipped) " + n + " rows: " + k));
        if (System.getenv("LABELS_STATS") != null) {
            BYTES.forEach((kind, v) -> System.err.println("STATS " + v + " " + kind));
        }
        System.err.println("rows " + rows.size() + " " + counts);
        return fileText(counts, rows);
    }

    /** Every arm of this brief ran in a step row, two graphs per arm and direction; the interactive and logged rows exist. */
    static void checkCoverage() {
        List<String> missing = new ArrayList<>();
        for (String m : SEVEN_F2) {
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
                    + "(tools/vectors/layered-labels-vectors.sh does)");
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

    // --sweep / --dump (T15, G7)

    static final long CASE_TIMEOUT_SECONDS = 20, CASE_STACK_BYTES = 64L * 1024 * 1024;
    static final String ELKT_EXTENSION = ".elkt", STATUS = "status", KIND_MODEL = "model", VARIANT_DEFAULT = "default";
    static final List<String> SWEEP_DIRS = List.of("tests/layered", "tickets/layered", "examples");
    static final List<String> SWEEP_VARIANTS = List.of(VARIANT_DEFAULT, "RIGHT", "LEFT", "DOWN", "UP");
    static final java.util.regex.Pattern LABEL_BEARING = java.util.regex.Pattern.compile("label|comment");

    /** One sweep case: the model (path under the models dir without ".elkt") and its variant (default, or a direction set on the root). */
    record SweepCase(String model, String variant) {
        String id() {
            return KIND_MODEL + "/" + model + "/" + variant;
        }
    }

    static ElkNode loadSweepModel(Path modelsDir, String model) throws IOException {
        return loadAny(modelsDir.resolve(model + ELKT_EXTENSION));
    }

    /** Every label- or comment-bearing .elkt of SWEEP_DIRS, sorted; one the oracle cannot load is skipped and named on stderr. */
    static List<String> sweepModels(Path modelsDir) throws IOException {
        List<String> models = new ArrayList<>();
        for (String dir : SWEEP_DIRS) {
            try (var files = Files.walk(modelsDir.resolve(dir))) {
                for (Path p : files.filter(f -> f.toString().endsWith(ELKT_EXTENSION)).sorted().toList()) {
                    if (LABEL_BEARING.matcher(Files.readString(p, StandardCharsets.UTF_8)).find()) {
                        models.add(modelsDir.relativize(p).toString().replace('\\', '/').replaceAll("\\.elkt$", ""));
                    }
                }
            }
        }
        Collections.sort(models);
        List<String> loadable = new ArrayList<>();
        for (String m : models) {
            try {
                loadSweepModel(modelsDir, m);
                loadable.add(m);
            } catch (RuntimeException | IOException e) {
                System.err.println("skipped model " + m + ": does not load (" + e.getClass().getSimpleName() + ")");
            }
        }
        return loadable;
    }

    static List<SweepCase> sweepCases(String model) {
        List<SweepCase> out = new ArrayList<>();
        SWEEP_VARIANTS.forEach(v -> out.add(new SweepCase(model, v)));
        return out;
    }

    static List<Object> box(org.eclipse.elk.graph.ElkShape s) {
        return List.of(hex(s.getX()), hex(s.getY()), hex(s.getWidth()), hex(s.getHeight()));
    }

    static List<Object> labelsOf(ElkGraphElement e) {
        List<Object> out = new ArrayList<>();
        e.getLabels().forEach(l -> out.add(box(l)));
        return out;
    }

    static List<Object> point(double x, double y) {
        return List.of(hex(x), hex(y));
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

    /** The whole model through the recursive engine; the whole plan of every level decides the refusal (G2). */
    static Map<String, Object> sweepCanonical(SweepCase c, Path modelsDir) throws IOException {
        ElkNode root = loadSweepModel(modelsDir, c.model());
        if (!c.variant().equals(VARIANT_DEFAULT)) {
            root.setProperty(CoreOptions.DIRECTION, org.eclipse.elk.core.options.Direction.valueOf(c.variant()));
        }
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
        for (Map.Entry<String, Object> e : recorder.plans().entrySet()) {
            for (Object name : (List<?>) e.getValue()) {
                if (!allowed((String) name)) {
                    throw new Refusal("case " + c.id() + " level " + e.getKey() + " names " + name, (String) name);
                }
            }
        }
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

    static void describe(Map<String, Object> m, SweepCase c) {
        m.put("kind", KIND_MODEL);
        m.put("model", c.model());
        m.put("target", null);
        m.put("variant", c.variant());
    }

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
        } catch (Refusal r) {
            m.put(STATUS, "refused");
            m.put("processor", r.member);
            m.put("category", REFUSAL_CATEGORIES.getOrDefault(r.member, "OUTSIDE G2"));
            if (!REFUSAL_CATEGORIES.containsKey(r.member)) {
                System.err.println("refusal OUTSIDE G2 (stop 5): " + c.id() + " " + r.member);
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
                for (SweepCase c : sweepCases(models.get(i))) {
                    Map<String, Object> m = sweepOutcome(c, modelsDir);
                    String status = String.valueOf(m.getOrDefault(STATUS, "ok"));
                    counts.merge(status, 1, Integer::sum);
                    if (status.equals("refused")) {
                        refusals.merge(m.get("category") + " " + m.get("processor"), 1, Integer::sum);
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
            if (!id.startsWith(KIND_MODEL + "/" + model + "/")) {
                continue;
            }
            for (SweepCase c : sweepCases(model)) {
                if (!c.id().equals(id)) {
                    continue;
                }
                Map<String, Object> dump;
                try {
                    dump = runCase(c, modelsDir);
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
