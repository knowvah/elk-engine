// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7b, T1, B1-B9) for the org.eclipse.elk.alg.layered cycle
// breakers (p1cycles), layerers (p2layers) and the ten 7b intermediate processors. The Java is the spec; this program
// only CALLS ELK APIs (reflection where a member is private) and records results; it embeds no ELK implementation.
// Run: tools/vectors/layered-phase-vectors.sh <outDir>
//      (java -cp ... LayeredPhaseVectors.java <outDir> <tools/vectors dir>)
//
// Output <outDir>/layered-phases.json (2-space top level, one compact JSON row per line, trailing newline):
//   { jdk, oracle, rowCounts: { models, scenarios, sites }, rows: [row...] }
//   row = { id, group, input, target, options, steps, prefix, expected }; ids are unique and stable, rows are ordered
//   group "models", then "scenarios", then "sites" (T11: the branches the generic replay leaves untaken).
//   The row kind is told by steps: null = pipeline row, else step row.
//
// input: { path, sha256 } = a vendored file under test/golden/inputs (repo-relative path, SHA-256 of its bytes; .json is
//   ELK JSON, .elkt the textual format) taken as is; or { elk: <ELK JSON object> } = the prepared graph exported by
//   ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
//   .omitUnknownLayoutOptions(true).prettyPrint(false) under system property org.eclipse.elk.graph.json.exportSeed=1,
//   embedded as a JSON OBJECT (not a string; Infinity/-Infinity/NaN tokens become the strings "Infinity", "-Infinity",
//   "NaN"). The output is strict-parsed (Gson JsonReader, non-lenient).
// target: ELK id of the ElkNode whose DIRECT children are imported (flat import: no HierarchyHandling), or null for the
//   root. The row's graph is ElkGraphTransformer.importGraph(<that node>) (7a importGraph(targetId)). Hierarchy levels
//   with no edge in the imported LGraph are skipped by the recorder (journaled on stderr).
// options: C4 map { <property id>: <C4 value> } of pipeline rows, applied with setProperty to the ELK node that is
//   imported (target or root) after the input is loaded. It always holds org.eclipse.elk.separateConnectedComponents =
//   false (B3, ComponentsProcessor.split is 7h). RANDOM_SEED stays the default 1 (a seed of 0 stops the recording).
//   Step rows have options {} (their graph carries its options; the steps set the rest).
// prefix: pipeline rows: the ordered names of every processor of ElkLayered.getLayoutTestConfiguration that ran up to
//   and including the stop, each an IntermediateProcessorStrategy member name, "P1_CYCLE_BREAKING/<STRATEGY>" or
//   "P2_LAYERING/<STRATEGY>". Step rows: null.
//
// Pipeline rows (steps null): graph = import(target); state0 = after ElkLayered.prepareLayoutTest(lgraph)
//   (GraphConfigurator.configureGraphProperties + copyPortContraints + the assembled algorithm), then
//   runLayoutTestUntil(<class of the stop>, true, state). Stops: P1 = the cycle breaker, P2 = the layerer, else an
//   IntermediateProcessorStrategy member. REFUSAL RULE (B4): a prefix naming anything that is not one of the ten 7b
//   members (EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER, LAYER_CONSTRAINT_PREPROCESSOR, LAYER_CONSTRAINT_POSTPROCESSOR,
//   REVERSED_EDGE_RESTORER, INTERACTIVE_EXTERNAL_PORT_POSITIONER, NODE_PROMOTION, HIGH_DEGREE_NODE_LAYER_PROCESSOR,
//   PARTITION_PREPROCESSOR, PARTITION_MIDPROCESSOR, PARTITION_POSTPROCESSOR) or a P1/P2 phase makes the recorder exit 1
//   naming the row. Replay: normalise (below), then run the prefix entries in order.
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
//        an enum of org.eclipse.elk.alg.layered.options or org.eclipse.elk.core.options).
//   ["layers", [[<node path>...], ...]]   per inner list in order: layer = new Layer(g); g.getLayers().add(layer);
//        node.setLayer(layer) for each listed node in order (setLayer leaves g.getLayerlessNodes() untouched,
//        as LNode.setLayer does; every listed node therefore stays in layerless too); unlisted nodes stay layerless.
//   ["reverseEdge", <edge path>]          edge.reverse(lgraph, true)
//   ["runProcessor", "<MEMBER>"]          IntermediateProcessorStrategy.<MEMBER>.create().process(lgraph, monitor); the
//        member must be one of the ten 7b members.
//   ["runPhase", "P1_CYCLE_BREAKING"|"P2_LAYERING", "<STRATEGY>"]   CycleBreakingStrategy|LayeringStrategy.<STRATEGY>
//        .create().process(lgraph, monitor)
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
// expected (B2): { layers: [[node path]] (the root LGraph's layers in order), layerless: [node path],
//   hidden: [node path] (InternalProperties.HIDDEN_NODES, else []), edges: [{ path, src, tgt, reversed }] (one per edge
//   of the traversal, src/tgt = port paths or null when detached, reversed = InternalProperties.REVERSED),
//   changed: [{ path, props }] }.
//   changed: elements in traversal order (the LGraph "g0", nodes, ports, edges), those with at least one property whose
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
// Checks: every row runs twice from scratch (input re-loaded, or exported and re-imported for elk inputs) and must
//   agree; the whole file is built twice and must be byte-identical; the output is strict-parsed and stays under 5 MB;
//   the 29 phases and processors of the 7b set must each be run by some step row (the 30th class, GroupModelOrderCalculator,
//   is run by ModelOrderCycleBreaker, and SCCModelOrderCycleBreaker by its two subclasses); every vendored input is
//   pinned in MODEL_TABLE (the shell script checks the same lines).
//
// Identity hashes: ELK iterates HashSet<LNode>/HashMap<LNode,...> in identity-hash order, which differs per run (e.g.
//   BFSNodeOrderCycleBreaker.sources decides which edges are reversed). The script runs the JVM with
//   -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 (every identity hash is the same, so such collections iterate in
//   insertion order, the AD-10 convention of the port) and main fails when the flag is missing. Sets of more than 8
//   same-bucket entries treeify in a table of 64+ and then do not iterate in insertion order (observed: insertion order
//   holds for up to 10 entries). Among the 7b classes only BFSNodeOrderCycleBreaker iterates such a collection (its
//   sources set, BFSNodeOrderCycleBreaker.java:105-115 fills it with the layerless nodes that have no incoming edge).
//   GUARD: for every row whose prefix or steps run P1_CYCLE_BREAKING/BFS_NODE_ORDER the recorder counts those sources on
//   the LGraph state immediately before that phase runs and REFUSES the row (exit 1 naming row and count, unless an
//   ACCEPTED_REFUSALS entry "<model>/<target>/BFS_NODE_ORDER_SOURCES" exists) when the count exceeds 10.
//
// Code copied from tools/vectors/LayeredSiteVectors.java (single-file launchers cannot share code, B7): the JSON
//   helpers (Raw, json, write, hex, str), the LGraph Dump class with pair/quad/margin/single, the C4 Encoder (without
//   the namer hook), strictNumbers and strictParse. Everything else is new.
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
import org.eclipse.elk.alg.layered.options.CycleBreakingStrategy;
import org.eclipse.elk.alg.layered.options.InternalProperties;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.layered.options.LayeringStrategy;
import org.eclipse.elk.alg.layered.options.NodePromotionStrategy;
import org.eclipse.elk.alg.layered.options.OrderingStrategy;
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

public class LayeredPhaseVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "layered-phases.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String REPO_PREFIX = "repo:";
    static final String PTOLEMY = "test/golden/inputs/realworld/ptolemy/";
    static final String LAYERED_TESTS = "test/golden/inputs/tests/layered/";
    static final String TICKETS = "test/golden/inputs/tickets/layered/";
    static final int MAX_DEPTH = 8;
    static final int FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = 5L * 1024 * 1024;
    static final String BASE_GRAPH = "g0";
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings");
    /**
     * Refusals (B4) the recorder accepts, "<model id>/<target or root>/<member>": the level's imported graph makes
     * ElkLayered add a processor of a later mission (7g self loops, 7f label dummies) to the prefix, so its rows
     * cannot be replayed by the 7b set and are not recorded. Any other refusal exits 1.
     */
    static final Set<String> ACCEPTED_REFUSALS = Set.of(
            "ptolemy-sinewaveoptimization/N1/SELF_LOOP_PREPROCESSOR",
            "partitioning-withEdgeLabels/root/LABEL_DUMMY_INSERTER");
    static final int MAX_HASH_ORDER_SOURCES = 10;
    static int maxBfsSources = 0;
    static volatile String currentRow = "?";
    static final Map<String, Integer> REFUSED_ROWS = new TreeMap<>();
    static final Set<String> SEVEN_B = Set.of("EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER", "LAYER_CONSTRAINT_PREPROCESSOR",
            "LAYER_CONSTRAINT_POSTPROCESSOR", "REVERSED_EDGE_RESTORER", "INTERACTIVE_EXTERNAL_PORT_POSITIONER",
            "NODE_PROMOTION", "HIGH_DEGREE_NODE_LAYER_PROCESSOR", "PARTITION_PREPROCESSOR", "PARTITION_MIDPROCESSOR",
            "PARTITION_POSTPROCESSOR");

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
                    items.sort(Comparator.comparing(LayeredPhaseVectors::json));
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
                return Double.parseDouble((String) v);
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
            return all;
        }

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
                    base = new Base(graph);
                }
                case "normalise" -> {
                    normalise(graph);
                    base.snapshot();
                }
                case "setProperty" -> setProperty(base.element((String) s.get(1)), (String) s.get(2), s.get(3));
                case "layers" -> layers(graph, base, (List<Object>) s.get(1));
                case "reverseEdge" -> ((LEdge) base.element((String) s.get(1))).reverse(graph, true);
                case "runProcessor" -> runProcessor(graph, (String) s.get(1));
                case "runPhase" -> runPhase(graph, (String) s.get(1), (String) s.get(2));
                case "dump" -> {
                    expected = phaseDump(base);
                    if (base.nodes.size() < FULL_DUMP_BELOW) {
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
        if (!SEVEN_B.contains(member)) {
            throw new Bug("processor " + member + " is outside the 7b set");
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
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(s.name());
        }
        for (CycleBreakingStrategy s : CycleBreakingStrategy.values()) {
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>())
                    .add("P1_CYCLE_BREAKING/" + s.name());
        }
        for (LayeringStrategy s : LayeringStrategy.values()) {
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>())
                    .add("P2_LAYERING/" + s.name());
        }
    }

    static Class<?> stopClass(String stop, LGraph g) {
        return switch (stop) {
            case "P1" -> g.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY).create().getClass();
            case "P2" -> g.getProperty(LayeredOptions.LAYERING_STRATEGY).create().getClass();
            default -> IntermediateProcessorStrategy.valueOf(stop).create().getClass();
        };
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
        Class<?> stop = stopClass(s.stop, g);
        var plan = layered.getLayoutTestConfiguration(state);
        int bfs = -1, stopAt = -1;
        for (int i = 0; i < plan.size() && stopAt < 0; i++) {
            Class<?> k = plan.get(i).getClass();
            bfs = k == org.eclipse.elk.alg.layered.p1cycles.BFSNodeOrderCycleBreaker.class ? i : bfs;
            stopAt = k == stop ? i : stopAt;
        }
        if (bfs > 0 && bfs <= stopAt) {
            layered.runLayoutTestUntil((Class) plan.get(bfs - 1).getClass(), true, state);
            guardBfsSources(g);
        }
        layered.runLayoutTestUntil((Class) stop, true, state);
        var algorithm = layered.getLayoutTestConfiguration(state);
        List<Object> prefix = new ArrayList<>();
        for (int i = 0; i < state.getStep(); i++) {
            Class<?> k = algorithm.get(i).getClass();
            List<String> names = PROCESSOR_NAMES.get(k);
            if (names == null || names.size() != 1) {
                throw new Bug("row " + s.id + ": processor class " + k.getName() + " has names " + names);
            }
            String name = names.get(0);
            if (!SEVEN_B.contains(name) && !name.startsWith("P1_CYCLE_BREAKING/") && !name.startsWith("P2_LAYERING/")) {
                throw new Refusal("row " + s.id + ": prefix names " + name + ", outside the 7b set", name);
            }
            prefix.add(name);
        }
        if (state.getStep() == 0 || algorithm.get(state.getStep() - 1).getClass() != stop) {
            throw new Bug("row " + s.id + ": the stop " + s.stop + " is not part of the algorithm");
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
        Result first = execute(s, load.get(), parsed);
        Result second;
        if (s.path == null) {
            inputElk = export(load.get());
            second = execute(s, ElkGraphJson.forGraph(inputElk).toElk(), parsed);
        } else {
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
    // Group models (B1, B5)

    record ModelFile(String id, String rel, boolean flattened, String kind) { }

    static final String KIND_PTOLEMY = "ptolemy", KIND_LAYER = "layer", KIND_PARTITION = "partition";

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
                    KIND_LAYER));
        }
        files.add(new ModelFile("ticket-600", TICKETS + "600_outgoingEdgeInLastSeparateNode.elkt", false, KIND_LAYER));
        for (String n : List.of("nonConsecutivePartitions", "partitions01", "partitions02", "withEdgeLabels")) {
            files.add(new ModelFile("partitioning-" + n, LAYERED_TESTS + "partitioning/" + n + ".elkt", false,
                    KIND_PARTITION));
        }
        files.add(new ModelFile("ticket-656", TICKETS + "656_brokenLayoutPartitions.elkt", false, KIND_PARTITION));
        return files;
    }

    /** A hierarchy level: its target id (null = root) and the node and edge counts of its flat import. */
    record Level(String target, int nodes, int edges, boolean zeroHeight) { }

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
                boolean zero = b.nodes.stream().anyMatch(n -> n.getType() == LNode.NodeType.NORMAL && n.getSize().y <= 0);
                levels.add(new Level(t, b.nodes.size(), b.edges.size(), zero));
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

    static Spec pipeline(ModelFile f, String target, String token, String strategy, String variant, String stop,
            TreeMap<String, Object> options) {
        String id = "models/" + f.id + "/" + (target == null ? "root" : target) + "/" + token + "/" + strategy
                + (variant == null ? "" : "/" + variant);
        return new Spec(id, "models", f.rel, null, target, options, stop, null);
    }

    static Spec interactivePipeline(ModelFile f, String target, boolean cycleBreaking) {
        String token = cycleBreaking ? "P1" : "P2";
        Spec s = pipeline(f, target, token, "INTERACTIVE", null, token,
                cycleBreaking ? opts("CYCLE_BREAKING_STRATEGY", E("CycleBreakingStrategy", "INTERACTIVE"))
                        : opts("LAYERING_STRATEGY", E("LayeringStrategy", "INTERACTIVE")));
        Supplier<ElkNode> prepare = () -> {
            ElkNode root = loadFile(f.rel);
            if (cycleBreaking) {
                interactiveConfigurator(root, LayeredOptions.CYCLE_BREAKING_STRATEGY, CycleBreakingStrategy.INTERACTIVE, 100);
            } else {
                interactiveConfigurator(root, LayeredOptions.LAYERING_STRATEGY, LayeringStrategy.INTERACTIVE, 10_000);
            }
            return root;
        };
        return new Spec(s.id, s.group, null, prepare, s.target, s.options, s.stop, null);
    }

    static void layererRows(List<Spec> out, ModelFile f, Level level, String token, String stop, String variant) {
        String target = level.target;
        for (LayeringStrategy ls : LayeringStrategy.values()) {
            if (ls == LayeringStrategy.STRETCH_WIDTH && level.zeroHeight) {
                // StretchWidthLayerer.computeNormalizedSize divides by the minimum NORMAL node height before it is
                // clamped to 1 (StretchWidthLayerer.java:149 vs :151): a zero-height node gives Infinity, conditionGoUp()
                // is always true and the reset branch (maxWidth++) never ends. The Java tests avoid it through
                // @DefaultConfiguration node sizes, which B5 does not reproduce: the row is not recorded.
                System.err.println("skipped row " + f.id + " " + (target == null ? "root" : target) + " " + token
                        + "/STRETCH_WIDTH (zero-height node, oracle does not terminate)");
                continue;
            }
            if (ls == LayeringStrategy.INTERACTIVE) {
                Spec s = interactivePipeline(f, target, false);
                out.add(new Spec(s.id.replace("/P2/INTERACTIVE", "/" + token + "/INTERACTIVE"), s.group, null, s.prepare,
                        s.target, s.options, stop, null));
            } else {
                out.add(pipeline(f, target, token, ls.name(), variant, stop, opts("LAYERING_STRATEGY", E("LayeringStrategy", ls))));
            }
        }
    }

    static void variantRows(List<Spec> out, ModelFile f, String target) {
        for (NodePromotionStrategy p : NodePromotionStrategy.values()) {
            if (p != NodePromotionStrategy.NONE) {
                out.add(pipeline(f, target, "NODE_PROMOTION", "LONGEST_PATH", p.name(), "NODE_PROMOTION",
                        opts("LAYERING_STRATEGY", E("LayeringStrategy", "LONGEST_PATH"), "LAYERING_NODE_PROMOTION_STRATEGY",
                                E("NodePromotionStrategy", p))));
            }
        }
        String hdn = "HIGH_DEGREE_NODE_LAYER_PROCESSOR";
        out.add(pipeline(f, target, hdn, "NETWORK_SIMPLEX", "treatment", hdn, opts("HIGH_DEGREE_NODES_TREATMENT", Z(true))));
        out.add(pipeline(f, target, hdn, "NETWORK_SIMPLEX", "treatment-threshold-3", hdn,
                opts("HIGH_DEGREE_NODES_TREATMENT", Z(true), "HIGH_DEGREE_NODES_THRESHOLD", I(3))));
        for (String ls : List.of("BF_MODEL_ORDER", "DF_MODEL_ORDER")) {
            out.add(pipeline(f, target, "P2", ls, "cb-model-order", "P2",
                    opts("CYCLE_BREAKING_STRATEGY", E("CycleBreakingStrategy", "MODEL_ORDER"), "LAYERING_STRATEGY",
                            E("LayeringStrategy", ls))));
        }
        for (OrderingStrategy o : List.of(OrderingStrategy.PREFER_EDGES, OrderingStrategy.NODES_AND_EDGES)) {
            out.add(pipeline(f, target, "P1", "MODEL_ORDER", o == OrderingStrategy.PREFER_EDGES ? "prefer-edges" : "nodes-and-edges",
                    "P1", opts("CYCLE_BREAKING_STRATEGY", E("CycleBreakingStrategy", "MODEL_ORDER"),
                            "CONSIDER_MODEL_ORDER_STRATEGY", E("OrderingStrategy", o))));
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
        for (ModelFile f : files) {
            for (Level lv : levels.get(f.id)) {
                String t = lv.target;
                boolean ptolemy = f.kind.equals(KIND_PTOLEMY);
                if (ptolemy) {
                    for (CycleBreakingStrategy cb : CycleBreakingStrategy.values()) {
                        out.add(cb == CycleBreakingStrategy.INTERACTIVE ? interactivePipeline(f, t, true)
                                : pipeline(f, t, "P1", cb.name(), null, "P1", opts("CYCLE_BREAKING_STRATEGY", E("CycleBreakingStrategy", cb))));
                    }
                    layererRows(out, f, lv, "P2", "P2", null);
                } else if (f.id.equals("ticket-600")) {
                    out.add(pipeline(f, t, "P1", "DEPTH_FIRST", null, "P1", opts()));
                }
                if (f.kind.equals(KIND_LAYER)) {
                    layererRows(out, f, lv, "LAYER_CONSTRAINT_POSTPROCESSOR", "LAYER_CONSTRAINT_POSTPROCESSOR", null);
                } else if (f.kind.equals(KIND_PARTITION)) {
                    layererRows(out, f, lv, "PARTITION_POSTPROCESSOR", "PARTITION_POSTPROCESSOR", null);
                }
                if (smallest.contains(f) || !ptolemy) {
                    variantRows(out, f, t);
                }
            }
        }
    }

    // ------------------------------------------------------------------------------------------------------------
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
            sb.append(i == 0 ? "" : ",").append(nodeJson("n" + i, pos == null ? null : pos[i],
                    nodeOpts == null ? null : nodeOpts.get(i), null));
        }
        return sb.append("],\"edges\":[").append(edgesJson("e", edges)).append("]}").toString();
    }

    static String gj(String rootOpts, int n, int[][] edges) {
        return gj(rootOpts, n, null, edges, null);
    }

    static int[][] chain(int n, int... extra) {
        int extraEdges = extra.length / 2;
        int[][] e = new int[n - 1 + extraEdges][];
        for (int i = 0; i < n - 1; i++) {
            e[i] = new int[] {i, i + 1};
        }
        for (int i = 0; i < extraEdges; i++) {
            e[n - 1 + i] = new int[] {extra[2 * i], extra[2 * i + 1]};
        }
        return e;
    }

    static double[][] line(int n, double dx, double dy) {
        double[][] p = new double[n][];
        for (int i = 0; i < n; i++) {
            p[i] = new double[] {10 + i * dx, 10 + (i % 3) * dy};
        }
        return p;
    }

    /** Baseline path of the ELK element of the given kind ("node", "edge") and id after importing the target. */
    static String bp(String elk, String target, String kind, String id) {
        LGraph g = new ElkGraphTransformer().importGraph(importTarget(ElkGraphJson.forGraph(elk).toElk(), target));
        Base b = new Base(g);
        List<String> found = new ArrayList<>();
        List<? extends LGraphElement> pool = kind.equals("node") ? b.nodes : b.edges;
        for (LGraphElement e : pool) {
            if (e.getProperty(InternalProperties.ORIGIN) instanceof ElkGraphElement o && id.equals(o.getIdentifier())) {
                found.add(b.paths.get(e));
            }
        }
        if (found.size() != 1) {
            throw new Bug("element " + kind + " " + id + " resolves to " + found);
        }
        return found.get(0);
    }

    static List<Spec> SCENARIOS;

    @SafeVarargs
    static void scn(String id, String elk, List<Object>... stepList) {
        List<Object> st = steps(stepList);
        String target = (String) ((List<?>) st.get(0)).get(1);
        SCENARIOS.add(new Spec("scenarios/" + id, "scenarios", null, () -> ElkGraphJson.forGraph(elk).toElk(), target,
                new TreeMap<>(), null, st));
    }

    static void pipelineScn(String id, String elk, String stop) {
        SCENARIOS.add(new Spec("scenarios/" + id, "scenarios", null, () -> ElkGraphJson.forGraph(elk).toElk(), null,
                opts(), stop, null));
    }

    static final int[][] CYC = {{0, 1}, {0, 1}, {1, 2}, {2, 0}, {2, 3}, {3, 4}, {4, 1}, {5, 5}, {3, 5}};
    static final int[][] TIE = {{0, 1}, {1, 0}, {2, 3}, {3, 2}};
    static final int[][] DAG7 = {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}, {0, 4}, {4, 5}, {2, 6}};
    static final double[][] POS6 = {{10, 10}, {110, 40}, {210, 10}, {110, 120}, {10, 90}, {260, 70}};
    static final double[][] POS7 = {{10, 10}, {110, 10}, {110, 80}, {210, 40}, {310, 40}, {410, 40}, {210, 120}};
    static final double[][] POS4 = {{10, 10}, {80, 10}, {10, 90}, {80, 90}};

    static void breakerScenarios() {
        for (CycleBreakingStrategy cb : CycleBreakingStrategy.values()) {
            String cls = cb.create().getClass().getSimpleName();
            boolean inter = cb == CycleBreakingStrategy.INTERACTIVE;
            String o = ropts("CYCLE_BREAKING_STRATEGY", cb.name());
            List<Object> run = phase("P1_CYCLE_BREAKING", cb.name());
            scn(cls + "/cycle", gj(o, 6, inter ? POS6 : null, CYC, null), imp(null), norm(), run, dump());
            scn(cls + "/chain", gj(o, 13, inter ? line(13, 40, 25) : null, chain(13, 12, 0), null), imp(null), norm(), run, dump());
            if (cb == CycleBreakingStrategy.GREEDY) {
                scn(cls + "/tie", gj(o, 4, TIE), imp(null), norm(), run, dump());
            }
            if (cb == CycleBreakingStrategy.MODEL_ORDER || cb == CycleBreakingStrategy.GREEDY_MODEL_ORDER
                    || cb == CycleBreakingStrategy.SCC_CONNECTIVITY || cb == CycleBreakingStrategy.SCC_NODE_TYPE) {
                Map<Integer, String> groups = new HashMap<>();
                for (int i = 0; i < 6; i++) {
                    groups.put(i, "\"" + pid("CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID") + "\":\"" + (i < 3 ? 1 : 2) + "\"");
                }
                scn(cls + "/enforced-groups", gj(o, 6, null, CYC, groups), imp(null), norm(),
                        set("g0", "CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY", E("GroupOrderStrategy", "ENFORCED")),
                        set("g0/n0", "LAYERING_LAYER_CONSTRAINT", E("LayerConstraint", "FIRST_SEPARATE")),
                        set("g0/n2", "LAYERING_LAYER_CONSTRAINT", E("LayerConstraint", "FIRST")),
                        set("g0/n4", "LAYERING_LAYER_CONSTRAINT", E("LayerConstraint", "LAST")),
                        set("g0/n5", "LAYERING_LAYER_CONSTRAINT", E("LayerConstraint", "LAST_SEPARATE")), run, dump());
            }
        }
    }

    static void layererScenarios() {
        for (LayeringStrategy ls : LayeringStrategy.values()) {
            String cls = ls.create().getClass().getSimpleName();
            boolean inter = ls == LayeringStrategy.INTERACTIVE;
            String o = ropts("LAYERING_STRATEGY", ls.name());
            List<Object> run = phase("P2_LAYERING", ls.name());
            scn(cls + "/dag", gj(o, 7, inter ? POS7 : null, DAG7, null), imp(null), norm(), run, dump());
            scn(cls + "/chain", gj(o, 14, inter ? line(14, 50, 30) : null, chain(14), null), imp(null), norm(), run, dump());
        }
    }

    static List<Object> constraint(String path, String value) {
        return set(path, "LAYERING_LAYER_CONSTRAINT", E("LayerConstraint", value));
    }

    static void reverserScenarios() {
        String m = "EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER";
        String a = gj("", 6, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {0, 5}, {5, 3}, {4, 1}});
        scn("EdgeAndLayerConstraintEdgeReverser/first-last", a, imp(null), norm(), constraint("g0/n1", "FIRST"),
                constraint("g0/n4", "LAST"), constraint("g0/n5", "FIRST_SEPARATE"), proc(m), dump());
        scn("EdgeAndLayerConstraintEdgeReverser/last-separate", a, imp(null), norm(), constraint("g0/n3", "LAST_SEPARATE"),
                constraint("g0/n2", "FIRST"), proc(m), dump());
        String f = feedbackNodeJson();
        scn("EdgeAndLayerConstraintEdgeReverser/feedback-node", f, imp(null), norm(), proc(m), dump());
        String f2 = feedbackNodeJson();
        scn("EdgeAndLayerConstraintEdgeReverser/feedback-node-blocked", f2, imp(null), norm(),
                constraint(bp(f2, null, "node", "b"), "LAST"), proc(m), dump());
    }

    /** a -> f(EAST in) ... f(WEST out) -> b with FIXED_SIDE ports: f is a feedback node. */
    static String feedbackNodeJson() {
        return "{\"id\":\"root\",\"children\":["
                + nodeJson("a", null, null, null)
                + "," + nodeJson("f", null, ropts("PORT_CONSTRAINTS", "FIXED_SIDE"),
                        "\"ports\":[{\"id\":\"fe\",\"width\":4,\"height\":4,\"layoutOptions\":{\"" + pid("PORT_SIDE")
                                + "\":\"EAST\"}},{\"id\":\"fw\",\"width\":4,\"height\":4,\"layoutOptions\":{\"" + pid("PORT_SIDE")
                                + "\":\"WEST\"}}]")
                + "," + nodeJson("b", null, null, null) + "],\"edges\":["
                + "{\"id\":\"e0\",\"sources\":[\"a\"],\"targets\":[\"fe\"]},{\"id\":\"e1\",\"sources\":[\"fw\"],\"targets\":[\"b\"]}]}";
    }

    static void layerConstraintScenarios() {
        String pre = "LAYER_CONSTRAINT_PREPROCESSOR", post = "LAYER_CONSTRAINT_POSTPROCESSOR";
        String a = gj("", 7, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {4, 5}, {0, 6}});
        scn("LayerConstraintPreprocessor/separate", a, imp(null), norm(), constraint("g0/n0", "FIRST_SEPARATE"),
                constraint("g0/n5", "LAST_SEPARATE"), proc(pre), dump());
        scn("LayerConstraintPreprocessor/none", a, imp(null), norm(), proc(pre), dump());
        String b = gj("", 6, new int[][] {{0, 2}, {2, 3}, {4, 3}, {0, 5}});
        scn("LayerConstraintPostprocessor/first-last", b, imp(null), norm(), constraint("g0/n4", "FIRST"),
                constraint("g0/n5", "LAST"), layersOf(L("g0/n0"), L("g0/n2", "g0/n4", "g0/n5"), L("g0/n3")), proc(post), dump());
        String c = gj("", 6, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 5}, {4, 3}});
        scn("LayerConstraintPostprocessor/separate", c, imp(null), norm(), constraint("g0/n0", "FIRST_SEPARATE"),
                constraint("g0/n5", "LAST_SEPARATE"), constraint("g0/n4", "FIRST"), proc(pre),
                layersOf(L("g0/n1"), L("g0/n2", "g0/n4"), L("g0/n3")), proc(post), dump());
        scn("LayerConstraintPostprocessor/empty-layer", c, imp(null), norm(), constraint("g0/n4", "FIRST"),
                layersOf(L("g0/n0"), L("g0/n4"), L("g0/n1"), L("g0/n2"), L("g0/n3", "g0/n5")), proc(post), dump());
    }

    static void restorerScenarios() {
        String m = "REVERSED_EDGE_RESTORER";
        String a = gj("", 5, chain(5, 4, 0, 3, 1));
        scn("ReversedEdgeRestorer/back-edges", a, imp(null), norm(),
                layersOf(L("g0/n0"), L("g0/n1"), L("g0/n2"), L("g0/n3"), L("g0/n4")),
                S("reverseEdge", bp(a, null, "edge", "e4")), S("reverseEdge", bp(a, null, "edge", "e5")), proc(m), dump());
        scn("ReversedEdgeRestorer/none-reversed", a, imp(null), norm(),
                layersOf(L("g0/n0"), L("g0/n1"), L("g0/n2"), L("g0/n3"), L("g0/n4")), proc(m), dump());
    }

    static String externalPortsJson() {
        String side = pid("PORT_SIDE");
        String port = "{\"id\":\"%s\",\"width\":4,\"height\":4,\"layoutOptions\":{\"" + side + "\":\"%s\"}}";
        return "{\"id\":\"root\",\"children\":[{\"id\":\"N\",\"width\":300,\"height\":200,\"layoutOptions\":{\""
                + pid("PORT_CONSTRAINTS") + "\":\"FIXED_SIDE\"},\"ports\":["
                + String.format(port, "pw", "WEST") + "," + String.format(port, "pe", "EAST") + ","
                + String.format(port, "pn", "NORTH") + "," + String.format(port, "ps", "SOUTH") + "],\"children\":["
                + nodeJson("c0", new double[] {50, 40}, null, null) + "," + nodeJson("c1", new double[] {150, 90}, null, null)
                + "," + nodeJson("c2", new double[] {100, 20}, null, null) + "," + nodeJson("c3", new double[] {120, 150}, null, null)
                + "],\"edges\":[{\"id\":\"i0\",\"sources\":[\"pw\"],\"targets\":[\"c0\"]},{\"id\":\"i1\",\"sources\":[\"c1\"],"
                + "\"targets\":[\"pe\"]},{\"id\":\"i2\",\"sources\":[\"pn\"],\"targets\":[\"c2\"]},{\"id\":\"i3\",\"sources\":"
                + "[\"c3\"],\"targets\":[\"ps\"]},{\"id\":\"i4\",\"sources\":[\"c0\"],\"targets\":[\"c1\"]}]}]}";
    }

    static void positionerScenarios() {
        String m = "INTERACTIVE_EXTERNAL_PORT_POSITIONER";
        String x = externalPortsJson();
        scn("InteractiveExternalPortPositioner/four-sides", x, imp("N"), norm(), proc(m), dump());
        scn("InteractiveExternalPortPositioner/no-external-ports", gj("", 3, new int[][] {{0, 1}, {1, 2}}), imp(null), norm(),
                proc(m), dump());
    }

    /**
     * NodePromotion moves a node that has incoming edges towards its predecessors when that removes dummy nodes: n5
     * (child of n0) and n6 (child of n1) sit late in the hand-built layering and are promotable.
     */
    static void promotionScenarios() {
        String m = "NODE_PROMOTION";
        int[][] edges = {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {0, 5}, {1, 6}};
        String strategy = "LAYERING_NODE_PROMOTION_STRATEGY";
        for (NodePromotionStrategy p : NodePromotionStrategy.values()) {
            if (p == NodePromotionStrategy.NONE) {
                continue;
            }
            String elk = gj(ropts("LAYERING_NODE_PROMOTION_STRATEGY", p.name()), 7, edges);
            scn("NodePromotion/" + p.name(), elk, imp(null), norm(), set("g0", strategy, E("NodePromotionStrategy", p)),
                    layersOf(L("g0/n0"), L("g0/n1"), L("g0/n2"), L("g0/n3", "g0/n5"), L("g0/n4", "g0/n6")), proc(m), dump());
        }
        String elk = gj("", 13, chain(12, 0, 12));
        scn("NodePromotion/chain", elk, imp(null), norm(),
                set("g0", strategy, E("NodePromotionStrategy", NodePromotionStrategy.NIKOLOV)),
                layersOf(L("g0/n0"), L("g0/n1"), L("g0/n2"), L("g0/n3"), L("g0/n4"), L("g0/n5"), L("g0/n6"), L("g0/n7"),
                        L("g0/n8"), L("g0/n9"), L("g0/n10"), L("g0/n11", "g0/n12")), proc(m), dump());
    }

    static void highDegreeScenarios() {
        String m = "HIGH_DEGREE_NODE_LAYER_PROCESSOR";
        String elk = gj("", 8, new int[][] {{0, 1}, {0, 2}, {0, 3}, {0, 4}, {0, 5}, {1, 6}, {2, 6}, {6, 7}});
        for (int[] cfg : new int[][] {{3, 1}, {3, 3}, {8, 2}}) {
            scn("HighDegreeNodeLayeringProcessor/threshold" + cfg[0] + "-height" + cfg[1], elk, imp(null), norm(),
                    set("g0", "HIGH_DEGREE_NODES_TREATMENT", Z(true)), set("g0", "HIGH_DEGREE_NODES_THRESHOLD", I(cfg[0])),
                    set("g0", "HIGH_DEGREE_NODES_TREE_HEIGHT", I(cfg[1])),
                    layersOf(L("g0/n0"), L("g0/n1", "g0/n2", "g0/n3", "g0/n4", "g0/n5"), L("g0/n6"), L("g0/n7")), proc(m), dump());
        }
    }

    static void partitionScenarios() {
        String elk = gj("", 5, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {0, 3}});
        int[] part = {2, 0, 1, 0, 2};
        List<List<Object>> sets = new ArrayList<>();
        for (int i = 0; i < part.length; i++) {
            sets.add(set("g0/n" + i, "PARTITIONING_PARTITION", I(part[i])));
        }
        @SuppressWarnings("unchecked")
        List<Object>[] setArr = sets.toArray(new List[0]);
        scn("PartitionPreprocessor/three-partitions", elk, concat(steps(imp(null), norm()), setArr, steps(proc("PARTITION_PREPROCESSOR"), dump())));
        scn("PartitionMidprocessor/three-partitions", elk, concat(steps(imp(null), norm()), setArr, steps(proc("PARTITION_MIDPROCESSOR"), dump())));
        scn("PartitionPostprocessor/three-partitions", elk, concat(steps(imp(null), norm()), setArr, steps(proc("PARTITION_MIDPROCESSOR"),
                layersOf(L("g0/n1", "g0/n3"), L("g0/n2"), L("g0/n0", "g0/n4")), proc("PARTITION_POSTPROCESSOR"), dump())));
    }

    static void scn(String id, String elk, List<Object> stepList) {
        List<Object> st = stepList;
        String target = (String) ((List<?>) st.get(0)).get(1);
        SCENARIOS.add(new Spec("scenarios/" + id, "scenarios", null, () -> ElkGraphJson.forGraph(elk).toElk(), target,
                new TreeMap<>(), null, st));
    }

    static List<Object> concat(List<Object> a, List<Object>[] b, List<Object> c) {
        List<Object> r = new ArrayList<>(a);
        r.addAll(Arrays.asList(b));
        r.addAll(c);
        return r;
    }

    // ModelOrderLayerAssignmentTest (JT/p2layers/ModelOrderLayerAssignmentTest.java:47-450) and Issue871Test
    // (JT/issues/Issue871Test.java:49-178): the hand-built graphs as pipeline rows.

    static String labelled(String optsJson, int n, int[][] edges, String[] edgeLabels) {
        StringBuilder sb = new StringBuilder("{\"id\":\"root\",\"layoutOptions\":{" + optsJson + "},\"children\":[");
        for (int i = 0; i < n; i++) {
            sb.append(i == 0 ? "" : ",").append(nodeJson("n" + (i + 1), null, null, "\"labels\":[{\"text\":\"n" + (i + 1) + "\"}]"));
        }
        sb.append("],\"edges\":[");
        for (int i = 0; i < edges.length; i++) {
            sb.append(i == 0 ? "" : ",").append("{\"id\":\"e").append(i).append("\",\"sources\":[\"n").append(edges[i][0] + 1)
                    .append("\"],\"targets\":[\"n").append(edges[i][1] + 1).append("\"]");
            if (edgeLabels != null && edgeLabels[i] != null) {
                sb.append(",\"labels\":[{\"text\":\"").append(edgeLabels[i]).append("\"}]");
            }
            sb.append('}');
        }
        return sb.append("]}").toString();
    }

    static void handBuilt() {
        String base = "\"" + pid("ALGORITHM") + "\":\"org.eclipse.elk.layered\",\"" + pid("DIRECTION") + "\":\"RIGHT\",\""
                + pid("CONSIDER_MODEL_ORDER_STRATEGY") + "\":\"PREFER_EDGES\",\"" + pid("PADDING") + "\":\"[top=0,left=0,bottom=0,right=0]\",\""
                + pid("SPACING_NODE_NODE") + "\":\"10\",\"" + pid("SPACING_NODE_NODE_BETWEEN_LAYERS") + "\":\"20\"";
        String fwd = base + "," + ropts("LAYERING_STRATEGY", "LONGEST_PATH_SOURCE", "LAYERING_NODE_PROMOTION_STRATEGY", "MODEL_ORDER_LEFT_TO_RIGHT");
        String bwd = base + "," + ropts("LAYERING_STRATEGY", "LONGEST_PATH", "LAYERING_NODE_PROMOTION_STRATEGY", "MODEL_ORDER_RIGHT_TO_LEFT");
        String t = "ModelOrderLayerAssignmentTest/";
        pipelineScn(t + "testForwardPromotionDisregardsEdgeLength",
                labelled(fwd, 5, new int[][] {{0, 1}, {0, 3}, {0, 3}, {1, 2}, {2, 4}, {3, 4}}, null), "NODE_PROMOTION");
        pipelineScn(t + "testBackwardPromotionDisregardsEdgeLength",
                labelled(bwd, 5, new int[][] {{0, 1}, {0, 2}, {1, 4}, {1, 4}, {2, 3}, {3, 4}}, null), "NODE_PROMOTION");
        pipelineScn(t + "testForwardPromotionMoreNodes",
                labelled(fwd, 6, new int[][] {{0, 1}, {0, 3}, {0, 3}, {0, 4}, {1, 2}, {2, 5}, {3, 5}, {4, 5}}, null), "NODE_PROMOTION");
        pipelineScn(t + "testBackwardPromotionMoreNodes",
                labelled(bwd, 6, new int[][] {{0, 1}, {0, 2}, {0, 3}, {1, 5}, {1, 5}, {2, 5}, {3, 4}, {4, 5}}, null), "NODE_PROMOTION");
        pipelineScn(t + "testForwardPromotionNoEndNode",
                labelled(fwd, 4, new int[][] {{0, 1}, {0, 3}, {0, 3}, {1, 2}}, null), "NODE_PROMOTION");
        pipelineScn(t + "testBackwardPromotionNoEndNode",
                labelled(bwd, 4, new int[][] {{0, 3}, {0, 3}, {1, 2}, {2, 3}}, null), "NODE_PROMOTION");
        pipelineScn(t + "testBackwardPromotionNoEndNode2",
                labelled(bwd, 4, new int[][] {{0, 1}, {0, 2}, {2, 3}}, null), "NODE_PROMOTION");
        // Issue871Test sets FEEDBACK_EDGES=true, which adds PORT_SIDE_PROCESSOR before P1 (7f, outside the 7b set, B4
        // refusal): the three rows are recorded with the default (false); the cycle breaking and layering are unaffected.
        // The two edge labels of testNoFeedbackEdgesStillWorking are left out for the same reason (they add
        // LABEL_DUMMY_INSERTER to the prefix).
        String i871 = base + "," + ropts("CYCLE_BREAKING_STRATEGY", "MODEL_ORDER", "CROSSING_MINIMIZATION_STRATEGY", "NONE",
                "CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE", "OFF");
        String u = "Issue871Test/";
        pipelineScn(u + "testFeedbackEdgeBelow", labelled(i871, 4, new int[][] {{0, 1}, {0, 2}, {1, 3}, {3, 2}}, null), "P2");
        pipelineScn(u + "testFeedbackEdgeBasic", labelled(i871, 3, new int[][] {{0, 1}, {1, 2}, {2, 1}}, null), "P2");
        pipelineScn(u + "testNoFeedbackEdgesStillWorking", labelled(i871, 4, new int[][] {{0, 1}, {0, 3}, {1, 3}, {2, 1}, {2, 3}},
                null), "P2");
    }

    // ------------------------------------------------------------------------------------------------------------
    // Group sites (mission 7b, T11): one oracle step scenario per group of 7b branches the generic replay leaves untaken
    // (plans/layered-cycles-layers/unreached.md, S1-S16). Same interpreter and row shape as the scenarios group.

    @SafeVarargs
    static void site(String id, String elk, List<Object>... stepList) {
        List<Object> st = steps(stepList);
        SCENARIOS.add(new Spec("sites/" + id, "sites", null, () -> ElkGraphJson.forGraph(elk).toElk(), (String) ((List<?>) st.get(0)).get(1),
                new TreeMap<>(), null, st));
    }

    /** n nodes prefix0..; sizes[i] = {w, h} (default 30x30), pos[i] = {x, y} or null, o[i] = option members or null. */
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

    static final String CB_ID = "CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID";
    static String moNodesAndEdges() {
        return ropts("CONSIDER_MODEL_ORDER_STRATEGY", "NODES_AND_EDGES");
    }

    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING";

    /** The graph element paths by id: node and edge paths of the imported target. */
    static String np(String elk, String target, String id) {
        return bp(elk, target, "node", id);
    }

    static void siteScenarios() {
        s1GroupModelOrder();
        s2to3Breakers();
        s4ExternalPortLayerers();
        s5to9Layerers();
        s10HighDegree();
        s11to13LayerConstraints();
        s14to16Intermediate();
    }

    /**
     * S1: ten children in cycles with enforced group model order (BFS/DFS_NODE_ORDER, GREEDY_MODEL_ORDER, SCC_*), the
     * component {pw dummy, c6, pe dummy} holding two external port dummies without MODEL_ORDER.
     */
    static void s1GroupModelOrder() {
        int[] groups = {1, 2, 2, 0, 2, 0, 0, 0, 0, 0};
        String[] o = new String[groups.length];
        for (int i = 0; i < o.length; i++) {
            o[i] = ropts(CB_ID, "" + groups[i]);
        }
        String tOpts = moNodesAndEdges() + "," + ropts("CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_GROUP_ORDER_STRATEGY", "ENFORCED",
                "CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_PREFERRED_SOURCE_ID", "1",
                "CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CB_PREFERRED_TARGET_ID", "2");
        String prio = ":PRIORITY_DIRECTION=3";
        String elk = hier(tOpts, prt("pw", "WEST") + "," + prt("pe", "EAST"), nds("c", 10, null, null, o),
                eds("c9>c0", "c0>c1", "c1>c2", "c2>c0", "c3>c4", "c4>c3", "c5>c7", "c7>c5", "c4>c5", "c3>c5", "pw>c6" + prio, "c6>pw",
                        "pe>c6" + prio, "c6>pe", "c1>c3", "c2>c8", "c7>c8", "c6>c8"));
        for (String s : List.of("BFS_NODE_ORDER", "DFS_NODE_ORDER", "GREEDY_MODEL_ORDER", "SCC_NODE_TYPE", "SCC_CONNECTIVITY")) {
            site("GroupModelOrder/cycleBreakers/" + s, elk, imp("T"), norm(), phase(P1, s), dump());
        }
    }

    /** S2 (negative PRIORITY_DIRECTION) and S3 (an interactive cycle among nodes at the same x). */
    static void s2to3Breakers() {
        String cycle = flat("", nds("n", 3, null, null), eds("n0>n1:PRIORITY_DIRECTION=2", "n1>n2:PRIORITY_DIRECTION=-1", "n2>n0"));
        site("GreedyCycleBreaker/negativePriority", cycle, imp(null), norm(), phase(P1, "GREEDY"), dump());
        double[][] pos = {{10, 10}, {50, 10}, {50, 60}, {90, 10}};
        String inter = flat("", nds("n", 4, pos, null), eds("n0>n1", "n1>n2", "n2>n1", "n1>n3", "n3>n0"));
        site("InteractiveCycleBreaker/pathCycle", inter, imp(null), norm(), phase(P1, "INTERACTIVE"), dump());
    }

    /** S4: a hierarchical target (WEST and EAST ports, seven children in a DAG with a long edge) under the model order layerers. */
    static void s4ExternalPortLayerers() {
        String elk = hier(moNodesAndEdges(), prt("pw", "WEST") + "," + prt("pe", "EAST"), nds("c", 7, null, null),
                eds("c0>c1", "c0>c2", "c1>c3", "c2>c3", "c3>c4", "c0>c4", "c2>c5", "pw>c0", "c4>pe", "c6>c3"));
        for (String l : List.of("BF_MODEL_ORDER", "DF_MODEL_ORDER", "MIN_WIDTH", "STRETCH_WIDTH")) {
            site("ModelOrderLayerers/externalPorts/" + l, elk, imp("T"), norm(), phase(P2, l), dump());
        }
        String[][] promotion = {{"MODEL_ORDER_LEFT_TO_RIGHT", "LONGEST_PATH_SOURCE"}, {"MODEL_ORDER_RIGHT_TO_LEFT", "LONGEST_PATH"}};
        for (String[] p : promotion) {
            site("ModelOrderLayerers/externalPorts/NODE_PROMOTION_" + p[0], elk, imp("T"), norm(),
                    set("g0", "LAYERING_NODE_PROMOTION_STRATEGY", E("NodePromotionStrategy", p[0])), phase(P2, p[1]),
                    proc("NODE_PROMOTION"), dump());
        }
    }

    /** S5-S9: tie breaks, empty graph, interactive spans, self-loops, MinWidth ranges. */
    static void s5to9Layerers() {
        String topo = flat("", nds("n", 6, null, null), eds("n0>n2", "n1>n2", "n0>n3", "n1>n3", "n1>n4", "n2>n5"));
        site("CoffmanGrahamLayerer/topoTies", topo, imp(null), norm(), phase(P2, "COFFMAN_GRAHAM"), dump());
        String empty = "{\"id\":\"root\",\"children\":[{\"id\":\"T\",\"width\":100,\"height\":100}]}";
        for (String l : List.of("COFFMAN_GRAHAM", "STRETCH_WIDTH", "NETWORK_SIMPLEX")) {
            site("Layerers/emptyGraph/" + l, empty, imp("T"), norm(), phase(P2, l), dump());
        }
        site("Layerers/emptyGraph/LAYER_CONSTRAINT_POSTPROCESSOR", empty, imp("T"), norm(), proc("LAYER_CONSTRAINT_POSTPROCESSOR"), dump());
        double[][] pos = {{10, 10}, {60, 60}, {35, 110}, {200, 10}, {300, 10}};
        String spans = flat("", nds("n", 5, pos, null), eds("n0>n3", "n1>n3", "n2>n3", "n3>n4", "n4>n4"));
        site("InteractiveLayerer/spansAndSelfLoop", spans, imp(null), norm(), phase(P2, "INTERACTIVE"), dump());
        String loop = flat("", nds("n", 4, null, null), eds("n0>n1", "n1>n2", "n2>n3", "n1>n1"));
        for (String l : List.of("LONGEST_PATH", "LONGEST_PATH_SOURCE", "NETWORK_SIMPLEX", "MIN_WIDTH")) {
            site("Layerers/selfLoop/" + l, loop, imp(null), norm(), phase(P2, l), dump());
        }
        double[][] sizes = {{30, 30}, {30, 20}, {30, 40}, {30, 60}, {30, 25}, {30, 35}, {30, 50}, {30, 30}, {30, 45}};
        String ranges = flat("", nds("n", 9, null, sizes), eds("n0>n1", "n0>n2", "n0>n3", "n0>n4", "n1>n5", "n2>n5", "n3>n6", "n4>n6",
                "n5>n7", "n6>n7", "n0>n7", "n7>n8"));
        String ubw = "LAYERING_MIN_WIDTH_UPPER_BOUND_ON_WIDTH", comp = "LAYERING_MIN_WIDTH_UPPER_LAYER_ESTIMATION_SCALING_FACTOR";
        site("MinWidthLayerer/ranges/negative", ranges, imp(null), norm(), set("g0", ubw, I(-1)), set("g0", comp, I(-1)),
                phase(P2, "MIN_WIDTH"), dump());
        site("MinWidthLayerer/ranges/exact", ranges, imp(null), norm(), set("g0", ubw, I(1)), set("g0", comp, I(1)),
                phase(P2, "MIN_WIDTH"), dump());
    }

    /** S10: a hub with an incoming tree of height 3, an outgoing tree of height 2 and a self-loop. */
    static void s10HighDegree() {
        String elk = flat("", nds("n", 7, null, null),
                eds("n1>n0", "n2>n1", "n3>n2", "n0>n4", "n4>n5", "n0>n6", "n0>n0"));
        for (int h : new int[] {0, 1}) {
            site("HighDegreeNodeLayeringProcessor/treeHeight/h" + h, elk, imp(null), norm(),
                    set("g0", "HIGH_DEGREE_NODES_TREATMENT", Z(true)), set("g0", "HIGH_DEGREE_NODES_THRESHOLD", I(3)),
                    set("g0", "HIGH_DEGREE_NODES_TREE_HEIGHT", I(h)), phase(P2, "LONGEST_PATH"),
                    proc("HIGH_DEGREE_NODE_LAYER_PROCESSOR"), dump());
        }
    }

    /** S11-S13: external port positions on every side, separate-layer connection kinds, ports wired to each other. */
    static void s11to13LayerConstraints() {
        double[][] pos = {{50, 40}, {150, 90}, {100, 20}, {120, 150}};
        String sides = hier("", prt("pw", "WEST") + "," + prt("pe", "EAST") + "," + prt("pn", "NORTH") + "," + prt("ps", "SOUTH")
                + "," + prt("pw2", "WEST") + "," + prt("pe2", "EAST") + "," + prt("pn2", "NORTH"), nds("c", 4, pos, null), eds("pw>c0", "c1>pe", "pn>c2", "c3>ps", "c0>c1"));
        String positioner = "INTERACTIVE_EXTERNAL_PORT_POSITIONER";
        site("InteractiveExternalPortPositioner/sides", sides, imp("T"), norm(), proc(positioner), dump());
        // a dummy without FIRST_SEPARATE/LAST_SEPARATE and without an in-layer constraint is left where it is
        site("InteractiveExternalPortPositioner/noConstraint", sides, imp("T"), norm(),
                constraint(np(sides, "T", "pw2"), "NONE"), proc(positioner), dump());
        // n0 LS1, n1 FS1, n2 LS2, n3 FS2, n4 FIRST, n5 A, n6 B, n7 A2 (only FS1), n8 B2 (only LS1)
        String fs = ropts("LAYERING_LAYER_CONSTRAINT", "FIRST_SEPARATE"), ls = ropts("LAYERING_LAYER_CONSTRAINT", "LAST_SEPARATE");
        String sep = flat("", nds("n", 9, null, null, ls, fs, ls, fs, ropts("LAYERING_LAYER_CONSTRAINT", "FIRST")),
                eds("n1>n5", "n3>n5", "n5>n2", "n6>n0", "n1>n6", "n6>n2", "n1>n0", "n3>n4", "n1>n7", "n8>n0", "n8>n2"));
        String pre = "LAYER_CONSTRAINT_PREPROCESSOR", post = "LAYER_CONSTRAINT_POSTPROCESSOR";
        site("LayerConstraint/separateConnections/preprocess", sep, imp(null), norm(), proc(pre), dump());
        site("LayerConstraint/separateConnections/postprocess", sep, imp(null), norm(), proc(pre), phase(P2, "NETWORK_SIMPLEX"),
                proc(post), dump());
        site("LayerConstraint/separateConnections/noLastSeparate", sep, imp(null), norm(), constraint("g0/n0", "NONE"),
                constraint("g0/n2", "NONE"), proc(pre), phase(P2, "NETWORK_SIMPLEX"), proc(post), dump());
        // the dummies are hidden in port order: pw1 (FIRST_SEPARATE) first drops its incoming edge from pe2, then pe1
        // (LAST_SEPARATE) its outgoing edge to pw2, so each acceptable-edge check sees its edge
        String direct = hier(ropts("INSIDE_SELF_LOOPS_ACTIVATE", "true"), prt("pw1", "WEST") + "," + prt("pe1", "EAST") + ","
                + prt("pe2", "EAST") + "," + prt("pw2", "WEST") + "," + prt("pn", "NORTH"), nds("c", 1, null, null),
                eds("pe2>pw1:INSIDE_SELF_LOOPS_YO=true", "pe1>pw2:INSIDE_SELF_LOOPS_YO=true", "pn>c0"));
        site("LayerConstraintPreprocessor/externalPortEdges", direct, imp("T"), norm(), proc(pre), dump());
    }

    /** S14-S16: partitions without ids, transitive partition reversals, a feedback node under layer constraints. */
    static void s14to16Intermediate() {
        String none = flat(ropts("PARTITIONING_ACTIVATE", "true"), nds("n", 3, null, null), eds("n0>n1", "n1>n2"));
        site("Partition/none", none, imp(null), norm(), proc("PARTITION_PREPROCESSOR"), phase(P1, "GREEDY"),
                proc("PARTITION_MIDPROCESSOR"), dump());
        String[] part = {ropts("PARTITIONING_PARTITION", "2"), null, ropts("PARTITIONING_PARTITION", "1"), ropts("PARTITIONING_PARTITION", "1"), null};
        String trans = flat(ropts("PARTITIONING_ACTIVATE", "true"), nds("n", 5, null, null, part),
                eds("n0>n1", "n1>n2", "n0>n2:PRIORITY_DIRECTION=3", "n3>n4", "n3>n4", "n4>n1"));
        site("PartitionPreprocessor/transitive", trans, imp(null), norm(), proc("PARTITION_PREPROCESSOR"), dump());
        String fixed = ropts("PORT_CONSTRAINTS", "FIXED_SIDE");
        String ports = "\"ports\":[{\"id\":\"fe\",\"width\":4,\"height\":4,\"layoutOptions\":{\"" + pid("PORT_SIDE")
                + "\":\"EAST\"}},{\"id\":\"fw\",\"width\":4,\"height\":4,\"layoutOptions\":{\"" + pid("PORT_SIDE") + "\":\"WEST\"}}]";
        String kids = nodeJson("a", null, ropts("LAYERING_LAYER_CONSTRAINT", "FIRST"), null) + "," + nodeJson("f", null, fixed, ports) + ","
                + nodeJson("b", null, null, null) + "," + nodeJson("l", null, ropts("LAYERING_LAYER_CONSTRAINT", "LAST"), null) + ","
                + nodeJson("x", null, null, null);
        String feedback = flat("", kids, eds("a>fe", "fw>b", "b>l", "x>l"));
        String rev = "EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER";
        site("EdgeAndLayerConstraintEdgeReverser/feedbackNode/reversedEdge", feedback, imp(null), norm(),
                S("reverseEdge", bp(feedback, null, "edge", "e2")), proc(rev), dump());
        site("EdgeAndLayerConstraintEdgeReverser/feedbackNode/plain", feedback, imp(null), norm(), proc(rev), dump());
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        breakerScenarios();
        layererScenarios();
        reverserScenarios();
        layerConstraintScenarios();
        restorerScenarios();
        positionerScenarios();
        promotionScenarios();
        highDegreeScenarios();
        partitionScenarios();
        handBuilt();
        siteScenarios();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Sweep and dump modes (mission 7b, T10, B6): the breadth of the Java tests over every ptolemy model, hashed.
    //   LayeredPhaseVectors.java --sweep <modelsDir> <outDir>        writes <outDir>/results.jsonl
    //   LayeredPhaseVectors.java --dump <case id> <modelsDir> <outDir>   writes the full row of one case
    // Every realworld/ptolemy/**/*.json under <modelsDir>, every level (an ElkNode with children, the root as null),
    // every CycleBreakingStrategy (stop P1) and every LayeringStrategy (stop P2, default cycle breaker) is one B1
    // pipeline row built by runPipeline (the recording path above, untouched): the same options (incl.
    // SEPARATE_CONNECTED_COMPONENTS=false), the same normalisation and expected shape, no dump. One line per case:
    //   {"id":"<model>/<root|target>/<P1|P2>/<STRATEGY>","model":"<model>","target":<id|null>,"prefix":[...],
    //    "options":{...},"sha256":"<hex>"}   sha256 = SHA-256 (UTF-8) of phaseCanonical(expected), see below
    //   canonical form of expected: "edges" and "changed" sorted by "path" (layers/layerless/hidden keep their order);
    //   every C4 value rewritten (recursively): {t:int|double} -> {t:"number", v:<16 hex digits of the raw bits of the
    //   value as a double>}, {t:enum} -> c cut to the segment after the last '.' or '$', {t:set} -> likewise (an empty
    //   set has no class: c null); then JSON with object keys sorted recursively, no whitespace, strings escaped as
    //   JSON.stringify does. The TS twin is test/helpers/layered-phase-sweep.ts (the TS number type cannot tell
    //   int from double, nor does it know nested class names).
    //   {"id":...,"status":"refused","processor":"<name>"}       B4 refusal, or BFS_NODE_ORDER_SOURCES (the guard)
    //   {"id":...,"status":"throws","class":"<simple name>","message":"..."}   the oracle throws
    //   {"id":...,"status":"timeout"}                            no result within CASE_TIMEOUT_SECONDS, or STRETCH_WIDTH
    //        over a level with a zero-height NORMAL node (never terminates, StretchWidthLayerer.java:149; recorded
    //        without running it so no spinning thread is left behind: "reason" says so)
    // Cases run one after another (runPipeline uses static state). INTERACTIVE cases run on the model as it is: the
    // recorder's seeded coordinate configurator belongs to the committed rows, not to files read from disk.
    static final class PhaseSweep {
        static final long CASE_TIMEOUT_SECONDS = 20;
        static final long CASE_STACK_BYTES = 64L * 1024 * 1024;
        static final String RESULTS = "results.jsonl";
        static final String PTOLEMY_DIR = "realworld/ptolemy";
        static final String ROOT_TARGET = "root";
        static final String P1 = "P1", P2 = "P2";

        record Case(String id, String model, String target, String stop, String strategy, TreeMap<String, Object> options,
                boolean knownHang) { }

        static List<String> modelIds(Path modelsDir) throws IOException {
            try (var files = Files.walk(modelsDir.resolve(PTOLEMY_DIR))) {
                return files.filter(p -> p.toString().endsWith(".json"))
                        .map(p -> modelsDir.relativize(p).toString().replace('\\', '/'))
                        .map(s -> s.substring(0, s.length() - ".json".length())).sorted().toList();
            }
        }

        static ElkNode load(String text) {
            return ElkGraphJson.forGraph(text).toElk();
        }

        /** Level targets in pre-order: null (root) then every ElkNode with children and a unique id. */
        static List<String> targets(String text, String model) {
            ElkNode root = load(text);
            List<String> targets = new ArrayList<>();
            targets.add(null);
            for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
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

        /** True when the level's flat import has a NORMAL node of height 0 (the recorder's zeroHeight, :1476). */
        static boolean zeroHeight(String text, String target) {
            try {
                LGraph g = new ElkGraphTransformer().importGraph(importTarget(load(text), target));
                return g.getLayerlessNodes().stream()
                        .anyMatch(n -> n.getType() == LNode.NodeType.NORMAL && n.getSize().y <= 0);
            } catch (RuntimeException e) {
                return false;
            }
        }

        static List<Case> cases(String model, String text) {
            List<Case> out = new ArrayList<>();
            for (String t : targets(text, model)) {
                boolean zero = zeroHeight(text, t);
                for (CycleBreakingStrategy cb : CycleBreakingStrategy.values()) {
                    out.add(newCase(model, t, P1, cb.name(), opts("CYCLE_BREAKING_STRATEGY", E("CycleBreakingStrategy", cb)),
                            false));
                }
                for (LayeringStrategy ls : LayeringStrategy.values()) {
                    out.add(newCase(model, t, P2, ls.name(), opts("LAYERING_STRATEGY", E("LayeringStrategy", ls)),
                            ls == LayeringStrategy.STRETCH_WIDTH && zero));
                }
            }
            return out;
        }

        static Case newCase(String model, String target, String stop, String strategy, TreeMap<String, Object> options,
                boolean knownHang) {
            String id = model + "/" + (target == null ? ROOT_TARGET : target) + "/" + stop + "/" + strategy;
            return new Case(id, model, target, stop, strategy, options, knownHang);
        }

        /** Runs the case's pipeline row on a thread with a big stack; null when the timeout fires. */
        static Result run(Case c, String text) throws Throwable {
            Spec s = new Spec(c.id, "models", null, () -> load(text), c.target, c.options, c.stop, null);
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

        static Map<String, Object> line(Case c) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", c.id);
            return m;
        }

        static Map<String, Object> outcome(Case c, String text) {
            Map<String, Object> m = line(c);
            if (c.knownHang) {
                m.put("status", "timeout");
                m.put("reason", "zero-height NORMAL node: StretchWidthLayerer.java:149 never terminates");
                return m;
            }
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
                m.put("sha256", sha256Hex(canonical(phaseCanonical(r.expected))));
            } catch (Refusal r) {
                m.put("status", "refused");
                m.put("processor", r.member);
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

        static final String C4_TAG = "t";

        /** The canonical form documented above: sorted "edges"/"changed", C4 values rewritten. */
        @SuppressWarnings("unchecked")
        static Object phaseCanonical(Map<String, Object> expected) {
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

        static String bitsOf(double d) {
            return String.format("%016x", Double.doubleToRawLongBits(d));
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
            Object tag = m.get(C4_TAG);
            if ("int".equals(tag) || "double".equals(tag)) {
                Object x = m.get("v");
                double d = x instanceof Number n ? n.doubleValue() : Double.parseDouble((String) x);
                out.put(C4_TAG, "number");
                out.put("v", bitsOf(d));
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

        /** The processors getLayoutTestConfiguration lists up to the stop (null when even that throws). */
        static List<Object> planPrefix(Case c, String text) {
            try {
                ElkNode target = importTarget(load(text), c.target);
                c.options.forEach((id, c4) -> setProperty(target, id, c4));
                LGraph g = new ElkGraphTransformer().importGraph(target);
                ElkLayered layered = new ElkLayered();
                ElkLayered.TestExecutionState state = layered.prepareLayoutTest(g);
                Class<?> stop = stopClass(c.stop, g);
                List<Object> prefix = new ArrayList<>();
                for (var p : layered.getLayoutTestConfiguration(state)) {
                    List<String> names = PROCESSOR_NAMES.get(p.getClass());
                    prefix.add(names == null || names.isEmpty() ? p.getClass().getSimpleName() : names.get(0));
                    if (p.getClass() == stop) {
                        return prefix;
                    }
                }
                return null;
            } catch (RuntimeException e) {
                return null;
            }
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
            try (var out = Files.newBufferedWriter(outDir.resolve(RESULTS), StandardCharsets.UTF_8)) {
                for (int i = 0; i < models.size(); i++) {
                    String model = models.get(i);
                    String text = Files.readString(modelsDir.resolve(model + ".json"), StandardCharsets.UTF_8);
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
                String text = Files.readString(modelsDir.resolve(model + ".json"), StandardCharsets.UTF_8);
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

        static void main(String[] args) throws Exception {
            try {
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
            } catch (Exception | Error e) {
                throw e;
            } catch (Throwable t) {
                throw new IllegalStateException(t);
            }
            System.exit(0);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Main

    static String buildAll() {
        RAN.clear();
        REFUSED_ROWS.clear();
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
            if (TRACE) {
                System.err.println("row " + s.id);
            }
            try {
                rows.add(buildRow(s));
            } catch (Refusal r) {
                String[] parts = s.id.split("/");
                String key = parts[1] + "/" + parts[2] + "/" + r.member;
                if (!s.group.equals("models") || !ACCEPTED_REFUSALS.contains(key)) {
                    throw r;
                }
                REFUSED_ROWS.merge(key, 1, Integer::sum);
                continue;
            } catch (org.eclipse.elk.core.UnsupportedConfigurationException e) {
                if (!s.group.equals("models")) {
                    throw e;
                }
                // ELK rejects the configuration itself (e.g. InteractiveLayerer has no edge reverser, so a FIRST node
                // with an incoming edge throws in LayerConstraintPostprocessor): a row records no exception.
                System.err.println("skipped row " + s.id.substring("models/".length()) + " (oracle throws "
                        + "UnsupportedConfigurationException: " + e.getMessage() + ")");
                continue;
            }
            counts.merge(s.group, 1, Integer::sum);
        }
        checkCoverage();
        System.err.println("max BFS_NODE_ORDER sources " + maxBfsSources);
        REFUSED_ROWS.forEach((k, n) -> System.err.println("refused (accepted) " + n + " rows: " + k));
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
        for (CycleBreakingStrategy s : CycleBreakingStrategy.values()) {
            if (!RAN.contains("P1_CYCLE_BREAKING/" + s.name())) {
                missing.add("P1_CYCLE_BREAKING/" + s.name());
            }
        }
        for (LayeringStrategy s : LayeringStrategy.values()) {
            if (!RAN.contains("P2_LAYERING/" + s.name())) {
                missing.add("P2_LAYERING/" + s.name());
            }
        }
        for (String m : SEVEN_B) {
            if (!RAN.contains(m)) {
                missing.add(m);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("no step row runs " + missing);
        }
    }

    public static void main(String[] args) throws Exception {
        // ELK keeps LNodes in HashSets/HashMaps (BFSNodeOrderCycleBreaker.sources, ...): LNode has no hashCode, so the
        // iteration order follows the identity hash and changes from run to run. AD-10 ports such collections in
        // insertion order, so the oracle runs with a constant identity hash (-XX:hashCode=2, set by the script): every
        // key lands in one bucket and iterates in insertion order.
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/layered-phase-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        if (args.length > 0 && args[0].startsWith("--")) {
            PhaseSweep.main(args);
            return;
        }
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        discoverProperties();
        String text;
        try {
            text = buildAll();
            String again = buildAll();
            if (!text.equals(again)) {
                throw new IllegalStateException("two builds differ\n" + clip(text, again) + "\n" + clip(again, text));
            }
        } catch (Refusal r) {
            System.err.println("refused: " + r.getMessage());
            System.exit(1);
            return;
        }
        long bytes = text.getBytes(StandardCharsets.UTF_8).length;
        if (bytes > MAX_BYTES) {
            throw new IllegalStateException("output is " + bytes + " bytes, over the 5 MB cap");
        }
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), text, StandardCharsets.UTF_8);
        strictParse(Path.of(args[0], OUTPUT));
        System.err.println("strict JSON parse ok, bytes " + bytes);
    }
}
