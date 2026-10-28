// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, L3, L4) for the org.eclipse.elk.alg.layered framework: the ElkGraph ->
// LGraph import and the transfer back (ElkGraphTransformer), NodeDimensionCalculation over LGraphAdapters, and the layered
// metadata the oracle registers. The Java is the spec; this program only CALLS ELK public APIs and records results, it
// embeds no ELK implementation. Mission 7a (layered framework) replays these rows before any unit test is written.
// Run: tools/vectors/layered-framework-vectors.sh <outDir>
//      (java -cp ... LayeredFrameworkVectors.java <outDir> <tools/vectors dir>)
//
// Output <outDir>/layered-framework.json (2-space top level, one compact JSON row per line, trailing newline):
//   { jdk, oracle, rowCounts: { transform, adapters, metadata }, rows: [row...] }
//   row = { id, group, input, options, expected } | { id, group, input, options, exception: { class, message } }
//   id are unique and stable. input = the prepared graph exported by ElkGraphJson.forGraph(root).omitLayout(false)
//   .omitZeroDimension(false).omitZeroPositions(false).omitUnknownLayoutOptions(true) (compact; the NS1 flags of
//   NodeMicroLayoutVectors) under system property org.eclipse.elk.graph.json.exportSeed=1, embedded as JSON; null for
//   metadata. options = { <sweep factor>: <level> } for sweep rows (already present in input; for readability), else {}.
//   exception.class is the simple class name. Every double of a row is 16 lowercase hex digits,
//   Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded (JavaVectors.hex convention); enums and ids are strings.
//   A throwing import, transfer or adapter call is a row, never a failure; nothing partial is kept.
//
// Groups, in this order (the row ids are "<group>/<model id>" or "<group>/sweep-<NNN>"):
//   transform  expected = { lgraph, elk }. The input graph is imported with new ElkGraphTransformer().importGraph(root),
//              the LGraph is dumped (lgraph, format below), then applyLayout(lgraph) transfers it back and the ELK graph
//              is exported with the flags above (elk). Models, as written: test/corpus/elkt-curated/**/*.elkt (ids
//              "<path under elkt-curated>"), test/golden/inputs/tickets/core/*.elkt ("golden-tickets/core/<name>"), and
//              the realworld ELK JSON files of test/golden/inputs ("golden-inputs/<path under test/golden/inputs>", the
//              "golden-inputs/" prefix keeps them apart from the elkt files of the same name). A model with nested nodes
//              whose root does not request INCLUDE_CHILDREN also gets a row "<id>#include-children" with the root's
//              HIERARCHY_HANDLING set to INCLUDE_CHILDREN (the only mode that imports the compound structure; the default
//              imports one level per run). A pairwise sweep ("sweep-<NNN>", seed SWEEP_SEED, AETG-style greedy cover) over
//              7 synthetic graph shapes (2-6 nodes, ports, labels, one hierarchy level, external ports, self loops) and
//              the options the importer and transferrer read (LayeredOptions.* of ElkGraphImporter and
//              ElkGraphLayoutTransferrer); label sizes of sweep graphs follow the NS4 formula below.
//   adapters   expected = { nodes: [ { path, size, margin, padding, ports: [ { path, pos, size, labels: [ { path, pos,
//              size } ] } ], labels: [ { path, pos, size } ] } ] }. The graph is imported as above, then, for every LGraph
//              (pre-order) the two layered call sequences run verbatim:
//                NodeDimensionCalculation.calculateLabelAndNodeSizes(LGraphAdapters.adapt(g, true, true,
//                    n -> n.getType() == NodeType.NORMAL))               (LabelAndNodeSizeProcessor.process)
//                NodeDimensionCalculation.getNodeMarginCalculator(LGraphAdapters.adapt(g, false))
//                    .excludeEdgeHeadTailLabels().process()               (InnermostNodeMarginCalculator.process)
//              and every node of every graph (dump order) is listed. Before the sequences every graph's layerless
//              nodes are moved, in order, into one new layer (X4): LGraphAdapter.getNodes() walks layers only.
//              Models are the same files as transform, with the
//              labels sized (NS4 formula below), plus a pairwise sweep over port alignment (default and per side), N/S
//              and E/W PORT_BORDER_OFFSET, port constraints, node size constraints and options, node size minimum,
//              padding, port and node label placement, edge head/tail/center labels.
//   metadata   one row "metadata/service": expected = the LayoutMetaDataService state (options, categories, algorithms)
//              with core, labels and layered registered, in the MetaDataVectors service format and C4 value encoding.
//
// Label sizes (NS4): in sweep graphs and in the adapters models, every label whose text is non-empty and whose width and
//   height are both 0.0 gets width = 6.5 * text.length() (UTF-16 code units), height = 13.0 (exact binary doubles); the
//   transform models are used as written. Sizing happens before the export, so input carries the sizes.
//
// LGraph dump (expected.lgraph): { graphs: [graph] }, graphs in pre-order (root first, then the nested graph of the
//   first node that has one, recursively, then the next such node). Paths are positional: "g<k>" a graph (k = its index
//   in graphs), "g0/n3" its 4th node, "g0/n3/p1" a port, "g0/e2" an edge, "g0/n3/l0" a node label, "g0/n3/p1/l0" a port
//   label, "g0/e2/l0" an edge label. Nodes of a graph are numbered layerlessNodes first, then any node found only in a
//   layer; edges are numbered per graph in the order node, port, outgoing edge (then incoming edges not seen yet).
//     graph = { path, size, padding, offset, properties, layerlessNodes: [node], layers: [[node path]], edges: [edge] }
//     node  = { path, type, pos, size, margin, padding, properties, ports: [port], labels: [label], nested: path|null }
//     port  = { path, side, pos, size, anchor, explicitAnchor, connectedToExternalNodes, margin, properties,
//               labels: [label], incoming: [edge path], outgoing: [edge path] }
//     edge  = { path, source, target, bendPoints: [[x, y]], labels: [label], properties }  (source/target: port paths)
//     label = { path, text, pos, size, properties }
//   size, pos, anchor, offset are [x, y]; margin, padding are [top, right, bottom, left]; all hex doubles.
//   properties = { <property id>: value } (every property set on the element, keys sorted). value uses the C4 encoding
//   of MetaDataVectors ({t:bool|int|string|double|enum|set|list|class|obj}, a double as Double.toString); an LGraph
//   element is { "ref": "<path>" }, an ElkGraph element { "elk": "<ELK JSON id>" } (null when unnamed), a non-empty
//   collection (or any non-List collection) of those an array of them (non-List collections sorted by their JSON), and any
//   other value the encoding cannot express { "class": "<binary class name>" }.
//
// Round trip and stability: for every row (1) the prepared graph is exported to input, (2) input is re-imported with
//   ElkGraphJson.forGraph(String).toElk() and the scenario runs on the re-imported graph: that outcome is the recorded
//   expected, (3) the scenario also runs on a freshly prepared original and the row fails if the two differ in the
//   signature (the LGraph dump with the ELK ids blanked plus an id-free geometry listing of the transferred ELK graph for
//   transform, the expected value for adapters; an exception compares class and message). The whole row is built twice
//   from scratch and the two serialisations must be byte-identical.
//
// Model integrity: the cache salt covers this source, not the model files, so the SHA-256 of every model file read is
//   pinned in MODEL_TABLE below (tools/vectors/layered-framework-vectors.sh checks the same lines before every run, warm
//   or cold). A missing, changed or unlisted model fails the recording by name.
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.eclipse.elk.alg.common.nodespacing.NodeDimensionCalculation;
import org.eclipse.elk.alg.layered.graph.LEdge;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.LGraphAdapters;
import org.eclipse.elk.alg.layered.graph.LGraphElement;
import org.eclipse.elk.alg.layered.graph.LLabel;
import org.eclipse.elk.alg.layered.graph.LNode;
import org.eclipse.elk.alg.layered.graph.LPort;
import org.eclipse.elk.alg.layered.graph.Layer;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.core.data.LayoutAlgorithmData;
import org.eclipse.elk.core.data.LayoutCategoryData;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.data.LayoutOptionData;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.math.KVectorChain;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.Direction;
import org.eclipse.elk.core.options.EdgeLabelPlacement;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.core.options.HierarchyHandling;
import org.eclipse.elk.core.options.NodeLabelPlacement;
import org.eclipse.elk.core.options.PortAlignment;
import org.eclipse.elk.core.options.PortConstraints;
import org.eclipse.elk.core.options.PortLabelPlacement;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.options.SizeConstraint;
import org.eclipse.elk.core.options.SizeOptions;
import org.eclipse.elk.core.util.InstancePool;
import org.eclipse.elk.core.util.Pair;
import org.eclipse.elk.graph.ElkBendPoint;
import org.eclipse.elk.graph.ElkConnectableShape;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkEdgeSection;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.ElkPort;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.elk.graph.util.ElkGraphUtil;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

public class LayeredFrameworkVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "layered-framework.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String TRANSFORM = "transform", ADAPTERS = "adapters", METADATA = "metadata";
    static final String REPO_PREFIX = "repo:";
    static final String ELKT = ".elkt", JSON = ".json";
    static final String CURATED_DIR = "test/corpus/elkt-curated";
    static final String TICKETS_DIR = "test/golden/inputs/tickets/core";
    static final String INPUTS_DIR = "test/golden/inputs";
    static final String REALWORLD_DIR = "test/golden/inputs/realworld";
    static final String INCLUDE_CHILDREN_SUFFIX = "#include-children";
    static final double LABEL_CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0;
    static final long SWEEP_SEED = 7101L;
    static final int CANDIDATES = 40;
    static final String UNSET = "unset";
    static final double NODE_W = 60.0, NODE_H = 40.0, SMALL = 30.0, PORT_SIZE = 8.0;
    static final int MAX_DEPTH = 8;
    static final String PROXY_CLASS = "LayoutOptionProxy";

    // SHA-256 of every model file read, "<sha256>  repo:<path under the repo root>". Keep these lines: the shell script
    // parses them.
    static final String MODEL_TABLE = """
6582ac9f188f28848f21fbeebe41b4f91b446dcfa73829fe36fe8d9c089615c3  repo:test/corpus/elkt-curated/examples/general/spacing/labels.elkt
d9dee71cecf2f570eb1f14eda4aa06b3c27fa80548e8960c71c1d403a2a0ed79  repo:test/corpus/elkt-curated/examples/ports/portConstraints.elkt
d0614f1fa063f5dde22a64f49632a2313988715c15da2cada7d2c3aac7d205ff  repo:test/corpus/elkt-curated/examples/user-hints/interactive-constraints/interactiveLayeredLayout_circle_pseudo_positions.elkt
5d721201120ab2945b7eaa025e192e6e5ef8f606fbb23ef093ac38a8b8a9b762  repo:test/corpus/elkt-curated/examples/user-hints/interactive-constraints/interactiveLayeredLayout_separateComponents_pseudo_positions.elkt
e10fb3d5b1ad4780a76ba6961703c2168da5f57e6c0a5d699dc325d9f15687e8  repo:test/corpus/elkt-curated/examples/user-hints/interactive-constraints/interactiveLayout_mixedHierarchy.elkt
e59cf1fcbd18cc9ce948c840e7c745603f499dcc925c8a23261f7a88b512a308  repo:test/corpus/elkt-curated/examples/user-hints/interactive-constraints/interactiveRectpacking_oneBigNode.elkt
1115ad10f9c49251c0ef2408520997264a50677c708c4ccb9c22759ec1da4959  repo:test/corpus/elkt-curated/realworld/ptolemy/flattened/hlacerti_multidatatypes_producer.elkt
86ca9588e81c1b77cc52d5b23b26285004b692058e8f13fce3817fc13d1662d6  repo:test/corpus/elkt-curated/realworld/ptolemy/flattened/pthales_dynamic_ThalesDynamicModalModelPN.elkt
4e7f2d0509f9f48c680f2934351f2e79b576385ea3434000813bb1e6f9a3cd5a  repo:test/corpus/elkt-curated/realworld/ptolemy/hierarchical/hoc_threadedcomposite_MulticoreExecution.elkt
ebb1339dbcda3a711d35b25b6a64062ad45e4288a03b4a49b9a7d4438db9b5cf  repo:test/corpus/elkt-curated/realworld/ptolemy/hierarchical/pthales_illustrative_Illustrative.elkt
64e70688cd41ed9999fd62406bd4753b06bb75516d4b054abcff7a2565bcca14  repo:test/corpus/elkt-curated/tests/layered/comment_boxes/multiple_comments.elkt
40cd0886cd688d3f1843fe69010773ebabbadb3466c66d5060cc29519ee40127  repo:test/corpus/elkt-curated/tests/layered/compaction_oned/labels/edgeLabelAndSplines.elkt
8233fd2d987b2a50f3c0ebc7244dfde0523cbc25514b53d3e7bb88fa3c9c836c  repo:test/corpus/elkt-curated/tests/layered/compaction_oned/labels/edgeLabelSideSelection01.elkt
b8a46251666118ab7b698d8cda13f00d6ce92130518da7524a9e078b4a48d008  repo:test/corpus/elkt-curated/tests/layered/compaction_oned/nsport/south_port.elkt
744b7429099c8bd2e520d372cf50960ec6ed89363a273e7fe764bc8c687a1ae8  repo:test/corpus/elkt-curated/tests/layered/compaction_oned/selfloop/selfloop_spline.elkt
9723db23bcd61743612ecf9a6fc9efee9189a6f6e90b1701075ba52d8576f0ec  repo:test/corpus/elkt-curated/tests/layered/interactive_layout/firstLayer.elkt
5530ec8e29a2b0896b808710553be8995bf59b8a19f6ef828e541bb8b78e0e58  repo:test/corpus/elkt-curated/tests/layered/layer_constraints/01.elkt
0f392abb8a5a65c5db6f9dcc5375c078b5c74eefac5e031007fcbf034198ee29  repo:test/corpus/elkt-curated/tests/layered/port_label_placement/fixed_positions_01.elkt
9e2fc4996c51a290ea1bf387e6611005e557ca39dc1cdc7e57c92c2adc029ad0  repo:test/corpus/elkt-curated/tests/layered/port_label_placement/inside_compound_nodes_01.elkt
fcde69b053e5fa8b6fa07258d3643424e6138006bfe90bf41db1936fcf0ddcfc  repo:test/corpus/elkt-curated/tests/layered/preserve_order/timedAutomatonMoreEdges.elkt
aade476173d1f260bc0f10e2431e4e6e36965c93bd109933f8359745de161700  repo:test/corpus/elkt-curated/tests/layered/splines/hyperedges/hyperedges_1.elkt
c23b3734cbc37959dd513c9cb3a14eb4e63d890cd733fe3e11b80cbd36048b15  repo:test/corpus/elkt-curated/tests/layered/splines/sloppy_curvature.elkt
f2d38e581311ddb50e9a6c01216458810dad65da17632cc8b3cb8255af800906  repo:test/corpus/elkt-curated/tickets/core/245_surroundingPortSpace.elkt
86b826e4c23a0da3c5a9b683cf8692e1c8bdbc405996fe68ab10198ce0551f9d  repo:test/corpus/elkt-curated/tickets/core/457_boxLayouterIgnoresMinimumSize.elkt
fdf40c543b7543ce9711e3b62dfb87ac198ea223eb3a381b047e83491a6b02dd  repo:test/corpus/elkt-curated/tickets/layered/273_insideSelfLoopsWithLabels.elkt
1cde9aa9f0de00cf00918d6bcadda0dbfa3768695067a6f864062a3b20ab217a  repo:test/corpus/elkt-curated/tickets/layered/411_north_south_port_anchor_a.elkt
0168a08422602fe54d653c4dba7a39efae1ec5e0dbf3114ece2a764f35db0245  repo:test/corpus/elkt-curated/tickets/layered/476_multiLabelInHorizontalLayout.elkt
49b3e8400512a32043b9f0ecbd212f7346681b7ad00d10820d65ad5552c0c326  repo:test/corpus/elkt-curated/tickets/layered/599_unimportantPortIndex.elkt
8cc03ddf742f3fd654712eb63fbcc00435fdd5ae904891da3524c9f88c7ac778  repo:test/corpus/elkt-curated/tickets/layered/724_includeChildrenModelOrder.elkt
12730664b530411ee1fa7e064bfd8e4f91e16590ae80047ee11f8794a1d77609  repo:test/corpus/elkt-curated/tickets/layered/905_beginLabelAboveEdge.elkt
cc6fd0cd2c52fa5287330c66b5eff8a5b58e2982ca2ed2d1336b226efbeca834  repo:test/corpus/elkt-curated/tickets/layered/905_beginLableBellowEdge.elkt
83193114e73feb7aafee5bff340ec96aa7c9925244bd4d0db0861a44c7e7dc4a  repo:test/golden/inputs/realworld/ptolemy/flattened/continuous_levelcrossingdetector_LevelCrossingDetector.json
89c039382505a18941c9441f26c7f7ef654e1bccc649a413ba280ef2a942a0a5  repo:test/golden/inputs/realworld/ptolemy/flattened/ddf_randomwalk_RandomWalk.json
a047cb61956067337c91aa2d9aff3d86902817e3dcdf80a0c3c7552d31d998f1  repo:test/golden/inputs/realworld/ptolemy/flattened/de_router_Router.json
6f30f5a5f316c40eaf2536869477d40af063608a5243e63df6eb20742fbfd745  repo:test/golden/inputs/realworld/ptolemy/flattened/hlacerti_multidatatypes_producer.json
2c7d5115b347e663f35906eb3f5ecff3535405fa3c7d46373d9a33b567d4a5dc  repo:test/golden/inputs/realworld/ptolemy/flattened/pthales_dynamic_ThalesDynamicModalModelPN.json
2d1317aa12c8e43668a681b79af12002f3da3e35efd70b6e841153e7658a1381  repo:test/golden/inputs/realworld/ptolemy/hierarchical/de_compositeqm_CheckExecutionTimeConstraints.json
1cd5f7c806664cf80e1a7d1a81fe0a9b5c2d22d532367a46127f9bc19d932ca4  repo:test/golden/inputs/realworld/ptolemy/hierarchical/gt_sinewaveoptimization_SinewaveOptimization.json
55668b77428b4b4cf28704a02cf6953683b263222b6978e1602db80aacc6fde1  repo:test/golden/inputs/realworld/ptolemy/hierarchical/hoc_threadedcomposite_MulticoreExecution.json
438ef5a74dadd23bbe7faff63f012e03d99dc8f49477ca2341176b5d8de4d075  repo:test/golden/inputs/realworld/ptolemy/hierarchical/sdf_htvq_HTVQ4.json
86b826e4c23a0da3c5a9b683cf8692e1c8bdbc405996fe68ab10198ce0551f9d  repo:test/golden/inputs/tickets/core/457_boxLayouterIgnoresMinimumSize.elkt
f30fac5ebbe51ef8aef7f4624e9a64e7018df5ae89d75c88e2a32961e2a5fa77  repo:test/golden/inputs/tickets/core/475_fixedLayoutWithLongLabels.elkt
4299f2e7c6326a4f12caed4d554eeade88b33fe827ad02308ba269c0dd2d81e7  repo:test/golden/inputs/tickets/core/489_paddingAndMinSize_Large.elkt
8909ff92338b121c4aeb424942f2031705633ca8430d57d381da1e73ffae93c2  repo:test/golden/inputs/tickets/core/489_paddingAndMinSize_Small.elkt
""";

    public static void main(String[] args) throws Exception {
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(),
                new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        Path vectorsDir = Path.of(args[1]).toAbsolutePath().normalize();
        Path repo = vectorsDir.getParent().getParent();
        List<Model> models = discover(repo);
        verifyTable(repo, models);

        List<Row> rows = new ArrayList<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put(TRANSFORM, transformRows(rows, models));
        counts.put(ADAPTERS, adaptersRows(rows, models));
        counts.put(METADATA, metadataRow(rows, svc));

        Set<String> ids = new HashSet<>();
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ");
        str(out, System.getProperty("java.version"));
        out.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"rowCounts\": {");
        int k = 0;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            out.append(k++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        out.append("},\n  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            Row r = rows.get(i);
            if (!ids.add(r.id)) {
                throw new IllegalStateException("duplicate row id " + r.id);
            }
            out.append("    ").append(r.json).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        out.append("  ]\n}\n");
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), out, StandardCharsets.UTF_8);
        long throwing = rows.stream().filter(r -> r.threw).count();
        System.err.println("rows " + rows.size() + " " + counts + " throwing " + throwing + " bytes " + out.length());
    }

    // ------------------------------------------------------------------------------------------------------------
    // Models

    record Model(String id, String key, Path path, boolean json) { }

    record Row(String id, String json, boolean threw) { }

    static List<Model> discover(Path repo) throws IOException {
        List<Model> models = new ArrayList<>();
        for (Path p : files(repo.resolve(CURATED_DIR), ELKT)) {
            String rel = repo.relativize(p).toString().replace('\\', '/');
            models.add(new Model(rel.substring(CURATED_DIR.length() + 1, rel.length() - ELKT.length()), REPO_PREFIX + rel,
                    p, false));
        }
        for (Path p : files(repo.resolve(TICKETS_DIR), ELKT)) {
            String rel = repo.relativize(p).toString().replace('\\', '/');
            models.add(new Model("golden-tickets/core/" + p.getFileName().toString().replace(ELKT, ""),
                    REPO_PREFIX + rel, p, false));
        }
        for (Path p : files(repo.resolve(REALWORLD_DIR), JSON)) {
            String rel = repo.relativize(p).toString().replace('\\', '/');
            models.add(new Model("golden-inputs/" + rel.substring(INPUTS_DIR.length() + 1, rel.length() - JSON.length()),
                    REPO_PREFIX + rel, p, true));
        }
        return models;
    }

    static List<Path> files(Path dir, String extension) throws IOException {
        try (Stream<Path> s = Files.walk(dir)) {
            return s.filter(p -> p.getFileName().toString().endsWith(extension)).sorted(Comparator.comparing(
                    p -> p.toString().replace('\\', '/'))).toList();
        }
    }

    static void verifyTable(Path repo, List<Model> models) throws Exception {
        Map<String, String> table = new TreeMap<>();
        for (String line : MODEL_TABLE.split("\n")) {
            String l = line.strip();
            if (!l.isEmpty()) {
                table.put(l.substring(l.indexOf("  ") + 2), l.substring(0, l.indexOf("  ")));
            }
        }
        List<String> problems = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (Model m : models) {
            seen.add(m.key);
            String expected = table.get(m.key);
            if (expected == null) {
                problems.add("unlisted model " + m.key);
            } else if (!expected.equals(sha256(m.path))) {
                problems.add("changed model " + m.key);
            }
        }
        for (String key : table.keySet()) {
            if (!seen.contains(key)) {
                problems.add("missing model " + key + " (" + repo + ")");
            }
        }
        if (!problems.isEmpty()) {
            throw new IllegalStateException("model files do not match the pinned table: " + problems);
        }
    }

    static String sha256(Path p) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (byte b : MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(p))) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    static ElkNode load(Model m) throws IOException {
        if (m.json) {
            return ElkGraphJson.forGraph(Files.readString(m.path, StandardCharsets.UTF_8)).toElk();
        }
        Resource r = new ResourceSetImpl().getResource(URI.createFileURI(m.path.toAbsolutePath().toString()), true);
        if (!r.getErrors().isEmpty() || r.getContents().isEmpty() || !(r.getContents().get(0) instanceof ElkNode)) {
            throw new IllegalStateException("cannot load " + m.path + ": " + r.getErrors());
        }
        return (ElkNode) r.getContents().get(0);
    }

    /**
     * A model option whose id no registered provider knows is kept by the .elkt loader as a LayoutOptionProxy value; the
     * JSON export omits it (omitUnknownLayoutOptions), so input cannot carry it. It is removed from the prepared graph
     * so that the round-trip check compares what input does carry.
     */
    static void dropUnresolvedOptions(ElkNode root) {
        List<ElkGraphElement> elements = new ArrayList<>();
        elements.add(root);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkGraphElement e) {
                elements.add(e);
            }
        }
        for (ElkGraphElement e : elements) {
            List<IProperty<?>> unresolved = new ArrayList<>();
            for (Map.Entry<IProperty<?>, Object> entry : e.getProperties()) {
                if (entry.getValue() != null && entry.getValue().getClass().getSimpleName().equals(PROXY_CLASS)) {
                    unresolved.add(entry.getKey());
                }
            }
            unresolved.forEach(key -> e.getProperties().removeKey(key));
        }
    }

    static boolean hasNestedNodes(ElkNode root) {
        return root.getChildren().stream().anyMatch(c -> !c.getChildren().isEmpty());
    }

    static void sizeLabels(ElkNode root) {
        List<ElkLabel> labels = new ArrayList<>();
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkLabel l) {
                labels.add(l);
            }
        }
        for (ElkLabel l : labels) {
            String text = l.getText();
            if (text != null && !text.isEmpty() && l.getWidth() == 0.0 && l.getHeight() == 0.0) {
                l.setDimensions(LABEL_CHAR_WIDTH * text.length(), LABEL_HEIGHT);
            }
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Rows

    /** The graph to export and the identifier of the node to import (null: the root; see the header). */
    record Prepared(ElkNode root, String target) { }

    interface Prepare {
        Prepared get() throws Exception;
    }

    /** One scenario's outcome: expected (or exception) plus the id-free signature used by the round-trip check. */
    record Outcome(Object expected, Object exception, String signature) { }

    interface Scenario {
        Outcome run(ElkNode root, String target);
    }

    /** The node the scenario imports: the root, or the node with the row's target identifier. */
    static ElkNode importTarget(ElkNode root, String target) {
        if (target == null) {
            return root;
        }
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && target.equals(n.getIdentifier())) {
                return n;
            }
        }
        throw new IllegalStateException("import target " + target + " not found");
    }

    static Row stableRow(String id, String group, Map<String, Object> options, Prepare prepare, Scenario scenario)
            throws Exception {
        Row first = buildRow(id, group, options, prepare, scenario);
        Row second = buildRow(id, group, options, prepare, scenario);
        if (!first.json.equals(second.json)) {
            throw new IllegalStateException("row " + id + " is not stable across two recordings");
        }
        return first;
    }

    static Row buildRow(String id, String group, Map<String, Object> options, Prepare prepare, Scenario scenario)
            throws Exception {
        Prepared prepared = prepare.get();
        String input = export(prepared.root);
        Outcome expected = scenario.run(ElkGraphJson.forGraph(input).toElk(), prepared.target);
        Prepared again = prepare.get();
        Outcome original = scenario.run(again.root, again.target);
        if (!expected.signature.equals(original.signature)) {
            throw new IllegalStateException("row " + id + ": outcome on the re-imported input differs from the outcome on "
                    + "the prepared original (round-trip self-check)\n re-imported: " + clip(expected.signature, original.signature)
                    + "\n original:    " + clip(original.signature, expected.signature));
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("group", group);
        row.put("input", new Raw(input));
        row.put("options", options);
        if (prepared.target != null) {
            row.put("target", prepared.target);
        }
        if (expected.exception != null) {
            row.put("exception", expected.exception);
        } else {
            row.put("expected", expected.expected);
        }
        StringBuilder sb = new StringBuilder();
        write(sb, row);
        return new Row(id, sb.toString(), expected.exception != null);
    }

    /** The part of s around its first difference from other, so a failing self-check names what differs. */
    static String clip(String s, String other) {
        int d = 0;
        while (d < s.length() && d < other.length() && s.charAt(d) == other.charAt(d)) {
            d++;
        }
        int from = Math.max(0, d - 200);
        return "(at " + d + ") " + s.substring(from, Math.min(s.length(), d + 300));
    }

    static String export(ElkNode root) {
        return ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                .omitUnknownLayoutOptions(true).prettyPrint(false).toJson();
    }

    static Map<String, Object> exceptionOf(RuntimeException e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("class", e.getClass().getSimpleName());
        m.put("message", e.getMessage());
        return m;
    }

    static int modelRows(List<Row> rows, String group, List<Model> models, Scenario scenario, boolean size)
            throws Exception {
        int n = 0;
        for (Model m : models) {
            String id = group + "/" + m.id;
            rows.add(stableRow(id, group, new LinkedHashMap<>(), () -> prepareModel(m, size, false), scenario));
            n++;
            if (hasNestedNodes(load(m)) && load(m).getProperty(CoreOptions.HIERARCHY_HANDLING)
                    != HierarchyHandling.INCLUDE_CHILDREN) {
                Map<String, Object> options = new LinkedHashMap<>();
                options.put(CoreOptions.HIERARCHY_HANDLING.getId(), HierarchyHandling.INCLUDE_CHILDREN.name());
                rows.add(stableRow(id + INCLUDE_CHILDREN_SUFFIX, group, options, () -> prepareModel(m, size, true),
                        scenario));
                n++;
            }
        }
        return n;
    }

    static Prepared prepareModel(Model m, boolean size, boolean includeChildren) throws IOException {
        ElkNode g = load(m);
        dropUnresolvedOptions(g);
        if (includeChildren) {
            g.setProperty(CoreOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
        }
        if (size) {
            sizeLabels(g);
        }
        return new Prepared(g, null);
    }

    static int transformRows(List<Row> rows, List<Model> models) throws Exception {
        int n = modelRows(rows, TRANSFORM, models, LayeredFrameworkVectors::transformScenario, false);
        return n + sweepRows(rows, TRANSFORM, transformFactors(), LayeredFrameworkVectors::transformScenario);
    }

    static int adaptersRows(List<Row> rows, List<Model> models) throws Exception {
        int n = modelRows(rows, ADAPTERS, models, LayeredFrameworkVectors::adaptersScenario, true);
        return n + sweepRows(rows, ADAPTERS, adaptersFactors(), LayeredFrameworkVectors::adaptersScenario);
    }

    static int metadataRow(List<Row> rows, LayoutMetaDataService svc) {
        Map<String, Object> options = new LinkedHashMap<>();
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", "metadata/service");
        row.put("group", METADATA);
        row.put("input", null);
        row.put("options", options);
        row.put("expected", new MetaData(svc).service());
        StringBuilder sb = new StringBuilder();
        write(sb, row);
        StringBuilder again = new StringBuilder();
        row.put("expected", new MetaData(svc).service());
        write(again, row);
        if (!sb.toString().equals(again.toString())) {
            throw new IllegalStateException("metadata row is not stable across two recordings");
        }
        rows.add(new Row("metadata/service", sb.toString(), false));
        return 1;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Scenarios

    static Outcome transformScenario(ElkNode root, String target) {
        try {
            ElkGraphTransformer transformer = new ElkGraphTransformer();
            LGraph lgraph = transformer.importGraph(importTarget(root, target));
            Object dump = new Dump(lgraph, true).dump();
            String idFree = json(new Dump(lgraph, false).dump());
            transformer.applyLayout(lgraph);
            Map<String, Object> expected = new LinkedHashMap<>();
            expected.put("lgraph", dump);
            expected.put("elk", new Raw(export(root)));
            return new Outcome(expected, null, idFree + "|" + geometry(root));
        } catch (RuntimeException e) {
            return thrown(e);
        }
    }

    static Outcome thrown(RuntimeException e) {
        Map<String, Object> x = exceptionOf(e);
        return new Outcome(null, x, "throws " + x.get("class") + " " + x.get("message"));
    }

    static Outcome adaptersScenario(ElkNode root, String target) {
        try {
            LGraph lgraph = new ElkGraphTransformer().importGraph(importTarget(root, target));
            Dump dump = new Dump(lgraph, false);
            // X4: LGraphAdapter.getNodes() walks layers only (LGraphAdapters.java:278-280) and every imported node is
            // layerless, so each graph's nodes go into one layer first (paths and node order were fixed above).
            for (LGraph g : dump.graphs) {
                layerAll(g);
            }
            for (LGraph g : dump.graphs) {
                NodeDimensionCalculation.calculateLabelAndNodeSizes(LGraphAdapters.adapt(g, true, true,
                        n -> n.getType() == LNode.NodeType.NORMAL));
                NodeDimensionCalculation.getNodeMarginCalculator(LGraphAdapters.adapt(g, false))
                        .excludeEdgeHeadTailLabels().process();
            }
            List<Object> nodes = new ArrayList<>();
            for (LGraph g : dump.graphs) {
                for (LNode n : dump.nodeLists.get(g)) {
                    nodes.add(dump.adapterNode(n));
                }
            }
            Map<String, Object> expected = new LinkedHashMap<>();
            expected.put("nodes", nodes);
            return new Outcome(expected, null, json(expected));
        } catch (RuntimeException e) {
            return thrown(e);
        }
    }

    /**
     * X4: a new layer appended to the graph holding its layerless nodes in list order (Layer and LNode public API;
     * the layerless list itself is left as it is, which the adapters never read).
     */
    static void layerAll(LGraph g) {
        Layer layer = new Layer(g);
        g.getLayers().add(layer);
        for (LNode n : new ArrayList<>(g.getLayerlessNodes())) {
            n.setLayer(layer);
        }
    }

    /** Id-free listing of an ELK graph's geometry in tree order (nodes, ports, labels, edges, sections). */
    static String geometry(ElkNode root) {
        StringBuilder sb = new StringBuilder();
        geometry(sb, root);
        return sb.toString();
    }

    static void geometry(StringBuilder sb, ElkNode n) {
        sb.append(n.getX()).append(',').append(n.getY()).append(',').append(n.getWidth()).append(',')
                .append(n.getHeight()).append(';');
        for (ElkLabel l : n.getLabels()) {
            sb.append('l').append(l.getX()).append(',').append(l.getY()).append(',').append(l.getWidth()).append(',')
                    .append(l.getHeight()).append(';');
        }
        for (ElkPort p : n.getPorts()) {
            sb.append('p').append(p.getX()).append(',').append(p.getY()).append(';');
            for (ElkLabel l : p.getLabels()) {
                sb.append('l').append(l.getX()).append(',').append(l.getY()).append(';');
            }
        }
        for (ElkEdge e : n.getContainedEdges()) {
            for (ElkLabel l : e.getLabels()) {
                sb.append('l').append(l.getX()).append(',').append(l.getY()).append(';');
            }
            for (ElkEdgeSection s : e.getSections()) {
                sb.append('s').append(s.getStartX()).append(',').append(s.getStartY()).append(',').append(s.getEndX())
                        .append(',').append(s.getEndY());
                for (ElkBendPoint b : s.getBendPoints()) {
                    sb.append('b').append(b.getX()).append(',').append(b.getY());
                }
                sb.append(';');
            }
        }
        for (ElkNode c : n.getChildren()) {
            geometry(sb, c);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
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
                    items.sort(Comparator.comparing(LayeredFrameworkVectors::json));
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
    // Metadata service dump (MetaDataVectors' service format)

    static final class MetaData {
        final LayoutMetaDataService svc;
        final Encoder enc = new Encoder(new IdentityHashMap<>(), false, true);

        MetaData(LayoutMetaDataService svc) {
            this.svc = svc;
        }

        Map<String, Object> service() {
            Map<String, Object> result = new TreeMap<>();
            List<Object> options = new ArrayList<>();
            for (LayoutOptionData o : svc.getOptionData()) {
                Map<String, Object> m = option(o);
                m.put("dependencies", dependencies(o));
                options.add(m);
            }
            List<Object> categories = new ArrayList<>();
            for (LayoutCategoryData c : svc.getCategoryData()) {
                Map<String, Object> m = category(c);
                List<Object> ids = new ArrayList<>();
                c.getLayouters().forEach(a -> ids.add(a.getId()));
                m.put("layouters", ids);
                categories.add(m);
            }
            List<Object> algorithms = new ArrayList<>();
            for (LayoutAlgorithmData a : svc.getAlgorithmData()) {
                Map<String, Object> m = algorithm(a);
                m.put("knownOptions", knownOptions(a));
                algorithms.add(m);
            }
            result.put("options", options);
            result.put("categories", categories);
            result.put("algorithms", algorithms);
            return result;
        }

        private List<Object> dependencies(LayoutOptionData o) {
            List<Object> deps = new ArrayList<>();
            for (Pair<LayoutOptionData, Object> p : o.getDependencies()) {
                Map<String, Object> m = new TreeMap<>();
                m.put("target", p.getFirst().getId());
                m.put("value", enc.encode(p.getSecond(), 0));
                deps.add(m);
            }
            return deps;
        }

        private List<Object> knownOptions(LayoutAlgorithmData a) {
            List<Object> known = new ArrayList<>();
            for (String id : a.getKnownOptionIds()) {
                Map<String, Object> m = new TreeMap<>();
                m.put("id", id);
                m.put("default", enc.encode(a.getDefaultValue(id), 0));
                known.add(m);
            }
            return known;
        }

        private Map<String, Object> option(LayoutOptionData o) {
            Map<String, Object> m = new TreeMap<>();
            m.put("id", o.getId());
            m.put("group", o.getGroup());
            m.put("name", o.getName());
            m.put("description", o.getDescription());
            m.put("type", o.getType().name());
            m.put("optionClass", o.getOptionClass().getSimpleName());
            m.put("default", enc.encode(o.getDefault(), 0));
            m.put("lowerBound", enc.encode(bound(o.getLowerBound()), 0));
            m.put("upperBound", enc.encode(bound(o.getUpperBound()), 0));
            m.put("targets", names(o.getTargets()));
            m.put("visibility", o.getVisibility() == null ? null : o.getVisibility().name());
            m.put("legacyIds", o.getLegacyIds() == null ? null : Arrays.asList(o.getLegacyIds()));
            return m;
        }

        private Map<String, Object> category(LayoutCategoryData c) {
            Map<String, Object> m = new TreeMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            m.put("description", c.getDescription());
            return m;
        }

        private Map<String, Object> algorithm(LayoutAlgorithmData a) {
            Map<String, Object> m = new TreeMap<>();
            m.put("id", a.getId());
            m.put("name", a.getName());
            m.put("description", a.getDescription());
            m.put("category", a.getCategoryId());
            m.put("bundleName", a.getBundleName());
            m.put("definingBundleId", a.getDefiningBundleId());
            m.put("previewImagePath", a.getPreviewImagePath());
            m.put("supportedFeatures", names(a.getSupportedFeatures()));
            m.put("validatorClass", a.getValidatorClass() == null ? null : a.getValidatorClass().getSimpleName());
            m.put("factoryClass", factoryClass(a.getInstancePool()));
            return m;
        }

        private String factoryClass(InstancePool<?> pool) {
            try {
                Field f = InstancePool.class.getDeclaredField("factory");
                f.setAccessible(true);
                Object factory = f.get(pool);
                return factory == null ? null : factory.getClass().getName();
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("cannot read the provider factory class", e);
            }
        }

        private Object bound(Object b) {
            return b == Property.NEGATIVE_INFINITY || b == Property.POSITIVE_INFINITY ? null : b;
        }
    }

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
            throw new IllegalStateException("NaN in a recorded value");
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

    // ------------------------------------------------------------------------------------------------------------
    // Sweep: a graph shape plus option factors, covered pairwise

    /** The graph under construction: the ELK elements by kind, so a factor level can address them. */
    static final class Build {
        final ElkNode root = ElkGraphUtil.createGraph();
        final List<ElkNode> nodes = new ArrayList<>();
        final List<ElkPort> ports = new ArrayList<>();
        final List<ElkEdge> edges = new ArrayList<>();
        final List<ElkLabel> nodeLabels = new ArrayList<>(), portLabels = new ArrayList<>(), edgeLabels = new ArrayList<>();
        ElkNode graph;
        String target;

        Build() {
            root.setIdentifier("root");
        }

        /** The graph the importer receives: the root, or the host of a shape that needs a parent (external ports). */
        ElkNode graph() {
            return graph == null ? root : graph;
        }

        ElkNode node(ElkNode parent, String id, double w, double h) {
            ElkNode n = ElkGraphUtil.createNode(parent);
            n.setIdentifier(id);
            n.setDimensions(w, h);
            nodes.add(n);
            return n;
        }

        ElkPort port(ElkNode owner, String id, PortSide side, double x, double y) {
            ElkPort p = ElkGraphUtil.createPort(owner);
            p.setIdentifier(id);
            p.setDimensions(PORT_SIZE, PORT_SIZE);
            p.setLocation(x, y);
            if (side != null) {
                p.setProperty(CoreOptions.PORT_SIDE, side);
            }
            ports.add(p);
            return p;
        }

        ElkEdge edge(ElkConnectableShape source, ElkConnectableShape target) {
            ElkEdge e = ElkGraphUtil.createSimpleEdge(source, target);
            e.setIdentifier("e" + edges.size());
            edges.add(e);
            return e;
        }

        ElkLabel label(ElkGraphElement owner, String text) {
            ElkLabel l = ElkGraphUtil.createLabel(text, owner);
            l.setIdentifier(owner.getIdentifier() + "_l" + owner.getLabels().size());
            (owner instanceof ElkPort ? portLabels : owner instanceof ElkEdge ? edgeLabels : nodeLabels).add(l);
            return l;
        }

        ElkPort east(ElkNode n, String id) {
            return port(n, id, PortSide.EAST, n.getWidth(), 10);
        }

        ElkPort west(ElkNode n, String id) {
            return port(n, id, PortSide.WEST, -PORT_SIZE, 10);
        }
    }

    interface Targets {
        List<? extends ElkGraphElement> of(Build b);
    }

    static final Targets ROOT = b -> List.of(b.graph()), NODES = b -> b.nodes, PORTS = b -> b.ports, EDGES = b -> b.edges,
            NODE_LABELS = b -> b.nodeLabels, PORT_LABELS = b -> b.portLabels, EDGE_LABELS = b -> b.edgeLabels,
            ALL = b -> {
                List<ElkGraphElement> l = new ArrayList<>();
                l.add(b.graph());
                b.nodes.stream().filter(n -> n != b.graph()).forEach(l::add);
                return l;
            };

    record Level(String name, Consumer<Build> apply) { }

    record Factor(String name, List<Level> levels) { }

    static <T> Supplier<T> k(T constant) {
        return () -> constant;
    }

    static <T> Supplier<T> s(Supplier<T> fresh) {
        return fresh;
    }

    static <T> void put(Build b, Targets t, IProperty<T> p, Supplier<T> v) {
        for (ElkGraphElement e : t.of(b)) {
            e.setProperty(p, v.get());
        }
    }

    /** One option on one kind of element; pairs are level name, Supplier of the value; level 0 leaves it unset. */
    @SuppressWarnings("unchecked")
    static <T> Factor prop(String name, Targets t, IProperty<T> p, Object... pairs) {
        List<Level> levels = new ArrayList<>();
        levels.add(new Level(UNSET, b -> { }));
        for (int i = 0; i < pairs.length; i += 2) {
            Supplier<T> v = (Supplier<T>) pairs[i + 1];
            levels.add(new Level((String) pairs[i], b -> put(b, t, p, v)));
        }
        return new Factor(name, levels);
    }

    /** A factor whose levels set several options at once; the first level is "unset". */
    static Factor combo(String name, Object... pairs) {
        List<Level> levels = new ArrayList<>();
        levels.add(new Level(UNSET, b -> { }));
        for (int i = 0; i < pairs.length; i += 2) {
            @SuppressWarnings("unchecked")
            Consumer<Build> c = (Consumer<Build>) pairs[i + 1];
            levels.add(new Level((String) pairs[i], c));
        }
        return new Factor(name, levels);
    }

    static int sweepRows(List<Row> rows, String group, List<Factor> factors, Scenario scenario) throws Exception {
        int[] levels = factors.stream().mapToInt(f -> f.levels.size()).toArray();
        int n = 0;
        for (int[] pick : pairwise(levels, SWEEP_SEED)) {
            Map<String, Object> options = new LinkedHashMap<>();
            for (int i = 0; i < pick.length; i++) {
                Level level = factors.get(i).levels.get(pick[i]);
                if (!UNSET.equals(level.name)) {
                    options.put(factors.get(i).name, level.name);
                }
            }
            rows.add(stableRow(String.format("%s/sweep-%03d", group, n++), group, options, () -> {
                Build b = new Build();
                for (int i = 0; i < pick.length; i++) {
                    factors.get(i).levels.get(pick[i]).apply.accept(b);
                }
                sizeLabels(b.root);
                return new Prepared(b.root, b.target);
            }, scenario));
        }
        return n;
    }

    static Factor shapes(List<Consumer<Build>> shapes) {
        List<Level> levels = new ArrayList<>();
        for (int i = 0; i < shapes.size(); i++) {
            levels.add(new Level("shape" + i, shapes.get(i)));
        }
        return new Factor("shape", levels);
    }

    // ---- transform shapes: 2-6 nodes, ports, labels, one hierarchy level, external ports, self loops ----

    static List<Consumer<Build>> transformShapes() {
        return List.of(LayeredFrameworkVectors::shapePlain, LayeredFrameworkVectors::shapePorts,
                LayeredFrameworkVectors::shapeSelfLoops, LayeredFrameworkVectors::shapeCompound,
                LayeredFrameworkVectors::shapeComments, LayeredFrameworkVectors::shapeExternalPorts,
                LayeredFrameworkVectors::shapeChain, LayeredFrameworkVectors::shapeCrossing,
                LayeredFrameworkVectors::shapeHyperedge);
    }

    static void shapePlain(Build b) {
        ElkNode a = b.node(b.root, "a", NODE_W, NODE_H), c = b.node(b.root, "b", NODE_W, NODE_H);
        b.label(a, "A");
        b.edge(a, c);
    }

    static void shapePorts(Build b) {
        ElkNode n0 = b.node(b.root, "n0", NODE_W, NODE_H), n1 = b.node(b.root, "n1", NODE_W, NODE_H),
                n2 = b.node(b.root, "n2", NODE_W, NODE_H);
        ElkPort e0 = b.east(n0, "n0e"), w1 = b.west(n1, "n1w"), e1 = b.east(n1, "n1e"), w2 = b.west(n2, "n2w");
        ElkPort s1 = b.port(n1, "n1s", PortSide.SOUTH, 20, NODE_H);
        b.label(e0, "out");
        b.label(s1, "south");
        b.label(n1, "Node one");
        b.label(b.edge(e0, w1), "edge label");
        b.edge(e1, w2);
        b.edge(s1, n2);
    }

    static void shapeSelfLoops(Build b) {
        ElkNode n0 = b.node(b.root, "n0", NODE_W, NODE_H), n1 = b.node(b.root, "n1", NODE_W, NODE_H);
        ElkPort e0 = b.east(n0, "n0e"), w0 = b.west(n0, "n0w");
        b.label(b.edge(e0, w0), "loop");
        b.edge(n1, n1);
        b.edge(n0, n1);
        b.edge(n0, n1);
        b.label(n0, "Node zero");
    }

    static void shapeCompound(Build b) {
        ElkNode outer = b.node(b.root, "outer", SMALL, SMALL);
        ElkNode parent = b.node(b.root, "parent", 200, 150);
        ElkNode c1 = b.node(parent, "c1", SMALL, SMALL), c2 = b.node(parent, "c2", SMALL, SMALL);
        ElkPort pw = b.port(parent, "pw", PortSide.WEST, -PORT_SIZE, 20);
        b.label(parent, "Parent");
        b.label(pw, "in");
        b.edge(outer, parent);
        b.label(b.edge(c1, c2), "inner");
        b.edge(pw, c1);
    }

    /** Edges across hierarchy levels: imported only with INCLUDE_CHILDREN, otherwise Java throws (a row). */
    static void shapeCrossing(Build b) {
        ElkNode outer = b.node(b.root, "outer", SMALL, SMALL);
        ElkNode parent = b.node(b.root, "parent", 200, 150);
        ElkNode c1 = b.node(parent, "c1", SMALL, SMALL);
        ElkPort pw = b.port(parent, "pw", PortSide.WEST, -PORT_SIZE, 20);
        b.edge(outer, c1);
        b.edge(outer, pw);
        b.edge(pw, c1);
    }

    static void shapeComments(Build b) {
        ElkNode[] n = new ElkNode[5];
        for (int i = 0; i < n.length; i++) {
            n[i] = b.node(b.root, "n" + i, NODE_W, NODE_H);
        }
        ElkPort north = b.port(n[0], "n0n", PortSide.NORTH, 20, -PORT_SIZE);
        ElkPort south = b.port(n[1], "n1s", PortSide.SOUTH, 20, NODE_H);
        b.edge(north, n[2]);
        b.edge(n[3], south);
        b.edge(n[3], n[0]);
        b.edge(n[4], n[3]);
    }

    /** A hyperedge, which the importer rejects (a row); the options decide where it fails first. */
    static void shapeHyperedge(Build b) {
        ElkNode[] n = new ElkNode[3];
        for (int i = 0; i < n.length; i++) {
            n[i] = b.node(b.root, "n" + i, NODE_W, NODE_H);
        }
        ElkEdge hyper = ElkGraphUtil.createHyperedge(List.<ElkConnectableShape>of(n[0]),
                List.<ElkConnectableShape>of(n[1], n[2]));
        hyper.setIdentifier("e" + b.edges.size());
        b.edges.add(hyper);
    }

    /** The import target is the host node: only a graph with a parent can have external ports (the importer reads it). */
    static void shapeExternalPorts(Build b) {
        ElkNode before = b.node(b.root, "before", SMALL, SMALL), after = b.node(b.root, "after", SMALL, SMALL);
        ElkNode host = b.node(b.root, "host", 300, 200);
        b.graph = host;
        b.target = "host";
        ElkPort in = b.port(host, "hw", PortSide.WEST, -PORT_SIZE, 40), out = b.port(host, "he", PortSide.EAST, 300, 40);
        ElkNode c0 = b.node(host, "c0", NODE_W, NODE_H), c1 = b.node(host, "c1", 120, 90),
                c2 = b.node(host, "c2", NODE_W, NODE_H);
        ElkNode d = b.node(c1, "d", SMALL, SMALL);
        b.edge(before, in);
        b.edge(out, after);
        b.edge(in, c0);
        b.edge(c0, c1);
        b.edge(c1, c2);
        b.edge(c2, out);
        b.edge(c2, c2);
        b.label(b.edge(d, d), "dloop");
    }

    static void shapeChain(Build b) {
        ElkNode[] n = new ElkNode[6];
        ElkPort[] west = new ElkPort[6], east = new ElkPort[6];
        for (int i = 0; i < n.length; i++) {
            n[i] = b.node(b.root, "n" + i, NODE_W, NODE_H);
            west[i] = b.west(n[i], "n" + i + "w");
            east[i] = b.east(n[i], "n" + i + "e");
        }
        String[] kinds = {"head", "center", "tail"};
        for (int i = 0; i + 1 < n.length; i++) {
            ElkEdge e = b.edge(east[i], west[i + 1]);
            if (i < kinds.length) {
                b.label(e, kinds[i]);
            }
        }
        b.edge(east[0], west[5]);
        b.label(n[2], "middle");
    }

    // ---- transform factors: the options ElkGraphImporter and ElkGraphLayoutTransferrer read ----

    static List<Factor> transformFactors() {
        List<Factor> f = new ArrayList<>();
        f.add(shapes(transformShapes()));
        f.add(prop("DIRECTION", ROOT, LayeredOptions.DIRECTION, "RIGHT", k(Direction.RIGHT), "LEFT", k(Direction.LEFT),
                "DOWN", k(Direction.DOWN), "UP", k(Direction.UP)));
        f.add(prop("PORT_CONSTRAINTS", ALL, LayeredOptions.PORT_CONSTRAINTS, "FREE", k(PortConstraints.FREE),
                "FIXED_SIDE", k(PortConstraints.FIXED_SIDE), "FIXED_ORDER", k(PortConstraints.FIXED_ORDER),
                "FIXED_RATIO", k(PortConstraints.FIXED_RATIO), "FIXED_POS", k(PortConstraints.FIXED_POS)));
        f.add(prop("PORT_SIDE", PORTS, LayeredOptions.PORT_SIDE, "NORTH", k(PortSide.NORTH), "SOUTH", k(PortSide.SOUTH),
                "EAST", k(PortSide.EAST), "UNDEFINED", k(PortSide.UNDEFINED)));
        f.add(prop("PORT_ANCHOR", PORTS, LayeredOptions.PORT_ANCHOR, "origin", s(() -> new KVector(0, 0)), "inside",
                s(() -> new KVector(4, 3))));
        f.add(prop("PORT_BORDER_OFFSET", PORTS, LayeredOptions.PORT_BORDER_OFFSET, "0", k(0.0), "6", k(6.0), "-4",
                k(-4.0)));
        f.add(prop("HIERARCHY_HANDLING", ROOT, LayeredOptions.HIERARCHY_HANDLING, "INHERIT", k(HierarchyHandling.INHERIT),
                "INCLUDE_CHILDREN", k(HierarchyHandling.INCLUDE_CHILDREN), "SEPARATE_CHILDREN",
                k(HierarchyHandling.SEPARATE_CHILDREN)));
        f.add(combo("NO_LAYOUT", "isolated-node", (Consumer<Build>) b -> b.node(b.root, "iso", SMALL, SMALL)
                .setProperty(LayeredOptions.NO_LAYOUT, true), "edge", (Consumer<Build>) b -> put(b,
                b2 -> b2.edges.subList(0, 1), LayeredOptions.NO_LAYOUT, k(true)), "first-node", (Consumer<Build>) b -> put(
                b, b2 -> b2.nodes.subList(0, 1), LayeredOptions.NO_LAYOUT, k(true)), "all-nodes-false",
                (Consumer<Build>) b -> put(b, NODES, LayeredOptions.NO_LAYOUT, k(false))));
        f.add(combo("INSIDE_SELF_LOOPS", "activate", (Consumer<Build>) b -> put(b, NODES,
                LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE, k(true)), "activate+yo", (Consumer<Build>) b -> {
                    put(b, NODES, LayeredOptions.INSIDE_SELF_LOOPS_ACTIVATE, k(true));
                    put(b, EDGES, LayeredOptions.INSIDE_SELF_LOOPS_YO, k(true));
                }, "yo-only", (Consumer<Build>) b -> put(b, EDGES, LayeredOptions.INSIDE_SELF_LOOPS_YO, k(true))));
        f.add(combo("COMMENT_HYPERNODE", "comment-box", (Consumer<Build>) b -> put(b, b2 -> last(b2.nodes),
                LayeredOptions.COMMENT_BOX, k(true)), "hypernode", (Consumer<Build>) b -> put(b, b2 -> b2.nodes.subList(0,
                1), LayeredOptions.HYPERNODE, k(true)), "both", (Consumer<Build>) b -> {
                    put(b, b2 -> last(b2.nodes), LayeredOptions.COMMENT_BOX, k(true));
                    put(b, b2 -> b2.nodes.subList(0, 1), LayeredOptions.HYPERNODE, k(true));
                }));
        f.add(combo("PARTITIONING", "activate", (Consumer<Build>) b -> {
            put(b, ALL, LayeredOptions.PARTITIONING_ACTIVATE, k(true));
            for (int i = 0; i < b.nodes.size(); i++) {
                b.nodes.get(i).setProperty(LayeredOptions.PARTITIONING_PARTITION, i % 2);
            }
        }, "deactivate", (Consumer<Build>) b -> put(b, ALL, LayeredOptions.PARTITIONING_ACTIVATE, k(false))));
        f.add(prop("CONSIDER_MODEL_ORDER_STRATEGY", ROOT, LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, "NONE",
                k(org.eclipse.elk.alg.layered.options.OrderingStrategy.NONE), "NODES_AND_EDGES",
                k(org.eclipse.elk.alg.layered.options.OrderingStrategy.NODES_AND_EDGES), "PREFER_EDGES",
                k(org.eclipse.elk.alg.layered.options.OrderingStrategy.PREFER_EDGES), "PREFER_NODES",
                k(org.eclipse.elk.alg.layered.options.OrderingStrategy.PREFER_NODES)));
        f.add(prop("CONSIDER_MODEL_ORDER_COMPONENTS", ROOT, LayeredOptions.CONSIDER_MODEL_ORDER_COMPONENTS, "NONE",
                k(org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy.NONE), "INSIDE_PORT_SIDE_GROUPS",
                k(org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy.INSIDE_PORT_SIDE_GROUPS),
                "GROUP_MODEL_ORDER", k(org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy.GROUP_MODEL_ORDER),
                "MODEL_ORDER", k(org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy.MODEL_ORDER)));
        f.add(prop("CONSIDER_MODEL_ORDER_NO_MODEL_ORDER", ALL, LayeredOptions.CONSIDER_MODEL_ORDER_NO_MODEL_ORDER, "true",
                k(true), "false", k(false)));
        f.add(prop("EDGE_LABELS_PLACEMENT", EDGE_LABELS, LayeredOptions.EDGE_LABELS_PLACEMENT, "HEAD",
                k(EdgeLabelPlacement.HEAD), "TAIL", k(EdgeLabelPlacement.TAIL), "CENTER", k(EdgeLabelPlacement.CENTER)));
        f.add(prop("PORT_LABELS_PLACEMENT", ALL, LayeredOptions.PORT_LABELS_PLACEMENT, "empty",
                s(() -> EnumSet.noneOf(PortLabelPlacement.class)), "OUTSIDE", s(() -> EnumSet.of(PortLabelPlacement.OUTSIDE)),
                "INSIDE+NEXT_TO_PORT", s(() -> EnumSet.of(PortLabelPlacement.INSIDE,
                        PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE))));
        f.add(prop("NODE_LABELS_PLACEMENT", ALL, LayeredOptions.NODE_LABELS_PLACEMENT, "empty",
                s(() -> EnumSet.noneOf(NodeLabelPlacement.class)), "inside-top-center", s(() -> EnumSet.of(
                        NodeLabelPlacement.INSIDE, NodeLabelPlacement.H_CENTER, NodeLabelPlacement.V_TOP)),
                "outside-bottom-left", s(() -> EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.H_LEFT,
                        NodeLabelPlacement.V_BOTTOM))));
        f.add(prop("NODE_SIZE_CONSTRAINTS", ALL, LayeredOptions.NODE_SIZE_CONSTRAINTS, "empty",
                s(() -> EnumSet.noneOf(SizeConstraint.class)), "PORTS+NODE_LABELS", s(() -> EnumSet.of(
                        SizeConstraint.PORTS, SizeConstraint.NODE_LABELS)), "all", s(() -> EnumSet.allOf(
                        SizeConstraint.class))));
        f.add(combo("NODE_SIZE_EXTRAS", "options+minimum", (Consumer<Build>) b -> {
            put(b, ALL, LayeredOptions.NODE_SIZE_OPTIONS, s(() -> EnumSet.of(SizeOptions.DEFAULT_MINIMUM_SIZE)));
            put(b, ALL, LayeredOptions.NODE_SIZE_MINIMUM, s(() -> new KVector(60, 40)));
        }, "fixed-graph-size", (Consumer<Build>) b -> {
            put(b, ALL, LayeredOptions.NODE_SIZE_FIXED_GRAPH_SIZE, k(true));
            put(b, ALL, LayeredOptions.NODE_SIZE_MINIMUM, s(() -> new KVector(200, 150)));
        }, "all-options", (Consumer<Build>) b -> put(b, ALL, LayeredOptions.NODE_SIZE_OPTIONS, s(() -> EnumSet.allOf(
                SizeOptions.class)))));
        f.add(prop("PADDING", ALL, LayeredOptions.PADDING, "2,3,4,5", s(() -> new ElkPadding(2, 3, 4, 5)), "20,5,0,10",
                s(() -> new ElkPadding(20, 5, 0, 10))));
        f.add(prop("JUNCTION_POINTS", EDGES, LayeredOptions.JUNCTION_POINTS, "two", s(() -> {
            KVectorChain chain = new KVectorChain();
            chain.add(new KVector(1, 2));
            chain.add(new KVector(3, 4));
            return chain;
        })));
        f.add(prop("EDGE_ROUTING", ROOT, LayeredOptions.EDGE_ROUTING, "ORTHOGONAL", k(EdgeRouting.ORTHOGONAL), "POLYLINE",
                k(EdgeRouting.POLYLINE), "SPLINES", k(EdgeRouting.SPLINES)));
        f.add(combo("SPACINGS", "base-value", (Consumer<Build>) b -> put(b, ROOT, LayeredOptions.SPACING_BASE_VALUE,
                k(30.0)), "node-node+label-label", (Consumer<Build>) b -> {
                    put(b, ALL, LayeredOptions.SPACING_NODE_NODE, k(25.0));
                    put(b, ALL, LayeredOptions.SPACING_LABEL_LABEL, k(3.0));
                }, "label-port", (Consumer<Build>) b -> {
                    put(b, ALL, LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL, k(4.0));
                    put(b, ALL, LayeredOptions.SPACING_LABEL_PORT_VERTICAL, k(5.0));
                }, "base+explicit", (Consumer<Build>) b -> {
                    put(b, ROOT, LayeredOptions.SPACING_BASE_VALUE, k(20.0));
                    put(b, ROOT, LayeredOptions.SPACING_NODE_NODE, k(40.0));
                }));
        f.add(combo("INTERACTIVE_IDS", "layer+position", (Consumer<Build>) b -> {
            for (int i = 0; i < b.nodes.size(); i++) {
                b.nodes.get(i).setProperty(LayeredOptions.LAYERING_LAYER_ID, i % 3);
                b.nodes.get(i).setProperty(LayeredOptions.CROSSING_MINIMIZATION_POSITION_ID, i);
            }
        }));
        f.add(combo("STRATEGIES", "interactive", (Consumer<Build>) b -> {
            put(b, ROOT, LayeredOptions.CYCLE_BREAKING_STRATEGY,
                    k(org.eclipse.elk.alg.layered.options.CycleBreakingStrategy.INTERACTIVE));
            put(b, ROOT, LayeredOptions.LAYERING_STRATEGY, k(org.eclipse.elk.alg.layered.options.LayeringStrategy.INTERACTIVE));
            put(b, ROOT, LayeredOptions.CROSSING_MINIMIZATION_STRATEGY,
                    k(org.eclipse.elk.alg.layered.options.CrossingMinimizationStrategy.INTERACTIVE));
            put(b, ROOT, LayeredOptions.NODE_PLACEMENT_STRATEGY,
                    k(org.eclipse.elk.alg.layered.options.NodePlacementStrategy.INTERACTIVE));
        }, "model-order", (Consumer<Build>) b -> {
            put(b, ROOT, LayeredOptions.CYCLE_BREAKING_STRATEGY,
                    k(org.eclipse.elk.alg.layered.options.CycleBreakingStrategy.MODEL_ORDER));
            put(b, ROOT, LayeredOptions.CROSSING_MINIMIZATION_FORCE_NODE_MODEL_ORDER, k(true));
            put(b, ROOT, LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE, k(0.5));
            put(b, ROOT, LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_PORT_INFLUENCE, k(0.25));
        }, "promotion+algorithm", (Consumer<Build>) b -> {
            put(b, ROOT, LayeredOptions.LAYERING_NODE_PROMOTION_STRATEGY,
                    k(org.eclipse.elk.alg.layered.options.NodePromotionStrategy.NIKOLOV));
            put(b, ROOT, CoreOptions.ALGORITHM, k("org.eclipse.elk.layered"));
            put(b, NODES, LayeredOptions.CONSIDER_MODEL_ORDER_GROUP_MODEL_ORDER_CYCLE_BREAKING_ID, k(1));
        }));
        return f;
    }

    static List<ElkGraphElement> last(List<ElkNode> nodes) {
        return nodes.isEmpty() ? List.of() : List.of(nodes.get(nodes.size() - 1));
    }

    // ---- adapters shapes and factors: one node with ports per side, labels, optional second node and edge ----

    static final int[][] PORT_COUNTS = {{0, 0, 0, 0}, {1, 1, 1, 1}, {3, 3, 3, 3}, {0, 3, 0, 3}, {3, 0, 3, 0},
        {1, 0, 0, 0}, {0, 1, 3, 0}, {2, 1, 0, 2}};
    static final PortSide[] SIDES = {PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST};

    static List<Consumer<Build>> adapterShapes() {
        List<Consumer<Build>> shapes = new ArrayList<>();
        for (int[] counts : PORT_COUNTS) {
            shapes.add(b -> adapterShape(b, counts));
        }
        return shapes;
    }

    static void adapterShape(Build b, int[] counts) {
        ElkNode n = b.node(b.root, "n", NODE_W, NODE_H);
        for (int s = 0; s < SIDES.length; s++) {
            for (int i = 0; i < counts[s]; i++) {
                String name = SIDES[s].name().substring(0, 1) + i;
                double along = 10 + i * 20;
                ElkPort p = switch (SIDES[s]) {
                    case NORTH -> b.port(n, "n_p" + name, SIDES[s], along, -PORT_SIZE);
                    case SOUTH -> b.port(n, "n_p" + name, SIDES[s], along, NODE_H);
                    case EAST -> b.port(n, "n_p" + name, SIDES[s], NODE_W, along / 2);
                    default -> b.port(n, "n_p" + name, SIDES[s], -PORT_SIZE, along / 2);
                };
                b.label(p, "Port " + name);
            }
        }
    }

    static Consumer<Build> alignments(PortAlignment north, PortAlignment east, PortAlignment south, PortAlignment west) {
        return b -> {
            put(b, NODES, LayeredOptions.PORT_ALIGNMENT_NORTH, k(north));
            put(b, NODES, LayeredOptions.PORT_ALIGNMENT_EAST, k(east));
            put(b, NODES, LayeredOptions.PORT_ALIGNMENT_SOUTH, k(south));
            put(b, NODES, LayeredOptions.PORT_ALIGNMENT_WEST, k(west));
        };
    }

    static Consumer<Build> borderOffset(double northSouth, double eastWest) {
        return b -> {
            for (ElkPort p : b.ports) {
                PortSide side = p.getProperty(CoreOptions.PORT_SIDE);
                boolean ns = side == PortSide.NORTH || side == PortSide.SOUTH;
                p.setProperty(LayeredOptions.PORT_BORDER_OFFSET, ns ? northSouth : eastWest);
            }
        };
    }

    static Consumer<Build> edgeLabels(boolean headAndTail) {
        return b -> {
            ElkNode other = b.node(b.root, "m", SMALL, SMALL);
            ElkEdge e = b.edge(b.nodes.get(0), other);
            b.label(e, "center");
            if (headAndTail) {
                b.label(e, "head").setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.HEAD);
                b.label(e, "tail").setProperty(LayeredOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.TAIL);
            }
        };
    }

    static Consumer<Build> nodeLabels(int level) {
        return b -> {
            ElkNode n = b.nodes.get(0);
            switch (level) {
                case 0 -> b.label(n, "Node");
                case 1 -> b.label(n, "In").setProperty(LayeredOptions.NODE_LABELS_PLACEMENT, EnumSet.of(
                        NodeLabelPlacement.INSIDE, NodeLabelPlacement.H_LEFT, NodeLabelPlacement.V_TOP));
                case 2 -> b.label(n, "Outside node").setProperty(LayeredOptions.NODE_LABELS_PLACEMENT, EnumSet.of(
                        NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.H_CENTER, NodeLabelPlacement.V_TOP));
                default -> {
                    b.label(n, "Mid label").setProperty(LayeredOptions.NODE_LABELS_PLACEMENT, EnumSet.of(
                            NodeLabelPlacement.INSIDE, NodeLabelPlacement.H_CENTER, NodeLabelPlacement.V_CENTER));
                    b.label(n, "Out label").setProperty(LayeredOptions.NODE_LABELS_PLACEMENT, EnumSet.of(
                            NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.H_RIGHT, NodeLabelPlacement.V_BOTTOM));
                }
            }
        };
    }

    static List<Factor> adaptersFactors() {
        PortAlignment bg = PortAlignment.BEGIN, ce = PortAlignment.CENTER, en = PortAlignment.END,
                ju = PortAlignment.JUSTIFIED, di = PortAlignment.DISTRIBUTED;
        List<Factor> f = new ArrayList<>();
        f.add(shapes(adapterShapes()));
        f.add(combo("EDGE_LABELS", "center", edgeLabels(false), "head+tail+center", edgeLabels(true)));
        f.add(prop("PORT_ALIGNMENT_DEFAULT", NODES, LayeredOptions.PORT_ALIGNMENT_DEFAULT, "DISTRIBUTED", k(di),
                "JUSTIFIED", k(ju), "BEGIN", k(bg), "CENTER", k(ce), "END", k(en)));
        f.add(combo("PORT_ALIGNMENT_SIDES", "N=BEGIN,E=CENTER,S=END,W=JUSTIFIED", alignments(bg, ce, en, ju),
                "N=END,E=BEGIN,S=DISTRIBUTED,W=CENTER", alignments(en, bg, di, ce), "N=JUSTIFIED,E=END,S=BEGIN,W=BEGIN",
                alignments(ju, en, bg, bg), "N=CENTER,E=DISTRIBUTED,S=JUSTIFIED,W=END", alignments(ce, di, ju, en),
                "N=DISTRIBUTED,E=JUSTIFIED,S=CENTER,W=DISTRIBUTED", alignments(di, ju, ce, di),
                "N=BEGIN,E=BEGIN,S=BEGIN,W=BEGIN", alignments(bg, bg, bg, bg), "N=END,E=END,S=END,W=END",
                alignments(en, en, en, en)));
        f.add(combo("PORT_BORDER_OFFSET", "ns=0,ew=0", borderOffset(0, 0), "ns=5,ew=0", borderOffset(5, 0), "ns=0,ew=4",
                borderOffset(0, 4), "ns=-3,ew=-2", borderOffset(-3, -2), "ns=8,ew=6", borderOffset(8, 6)));
        f.add(prop("PORT_CONSTRAINTS", NODES, LayeredOptions.PORT_CONSTRAINTS, "FREE", k(PortConstraints.FREE),
                "FIXED_SIDE", k(PortConstraints.FIXED_SIDE), "FIXED_ORDER", k(PortConstraints.FIXED_ORDER), "FIXED_RATIO",
                k(PortConstraints.FIXED_RATIO), "FIXED_POS", k(PortConstraints.FIXED_POS)));
        f.add(prop("NODE_SIZE_CONSTRAINTS", NODES, LayeredOptions.NODE_SIZE_CONSTRAINTS, "empty",
                s(() -> EnumSet.noneOf(SizeConstraint.class)), "PORTS", s(() -> EnumSet.of(SizeConstraint.PORTS)),
                "PORTS+PORT_LABELS", s(() -> EnumSet.of(SizeConstraint.PORTS, SizeConstraint.PORT_LABELS)), "NODE_LABELS",
                s(() -> EnumSet.of(SizeConstraint.NODE_LABELS)), "MINIMUM_SIZE", s(() -> EnumSet.of(
                        SizeConstraint.MINIMUM_SIZE)), "PORTS+PORT_LABELS+NODE_LABELS", s(() -> EnumSet.of(
                        SizeConstraint.PORTS, SizeConstraint.PORT_LABELS, SizeConstraint.NODE_LABELS)), "all",
                s(() -> EnumSet.allOf(SizeConstraint.class))));
        f.add(prop("NODE_SIZE_OPTIONS", NODES, LayeredOptions.NODE_SIZE_OPTIONS, "DEFAULT_MINIMUM_SIZE+ACCOUNTS_FOR_PADDING",
                s(() -> EnumSet.of(SizeOptions.DEFAULT_MINIMUM_SIZE, SizeOptions.MINIMUM_SIZE_ACCOUNTS_FOR_PADDING)),
                "COMPUTE_PADDING", s(() -> EnumSet.of(SizeOptions.COMPUTE_PADDING)), "PORTS_OVERHANG", s(() -> EnumSet.of(
                        SizeOptions.PORTS_OVERHANG)), "OUTSIDE_NODE_LABELS_OVERHANG", s(() -> EnumSet.of(
                        SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG)), "all", s(() -> EnumSet.allOf(SizeOptions.class))));
        f.add(prop("PORT_LABELS_PLACEMENT", NODES, LayeredOptions.PORT_LABELS_PLACEMENT, "OUTSIDE", s(() -> EnumSet.of(
                PortLabelPlacement.OUTSIDE)), "INSIDE", s(() -> EnumSet.of(PortLabelPlacement.INSIDE)),
                "OUTSIDE+NEXT_TO_PORT", s(() -> EnumSet.of(PortLabelPlacement.OUTSIDE,
                        PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE)), "INSIDE+NEXT_TO_PORT", s(() -> EnumSet.of(
                        PortLabelPlacement.INSIDE, PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE)), "OUTSIDE+SAME_SIDE",
                s(() -> EnumSet.of(PortLabelPlacement.OUTSIDE, PortLabelPlacement.ALWAYS_SAME_SIDE)),
                "INSIDE+SPACE_EFFICIENT", s(() -> EnumSet.of(PortLabelPlacement.INSIDE,
                        PortLabelPlacement.SPACE_EFFICIENT))));
        f.add(combo("NODE_LABELS", "plain", nodeLabels(0), "inside-top-left", nodeLabels(1), "outside-top-center",
                nodeLabels(2), "inside-centre+outside-bottom-right", nodeLabels(3)));
        f.add(prop("NODE_SIZE_MINIMUM", NODES, LayeredOptions.NODE_SIZE_MINIMUM, "60x40", s(() -> new KVector(60, 40)),
                "200x150", s(() -> new KVector(200, 150))));
        f.add(prop("PADDING", NODES, LayeredOptions.PADDING, "2,3,4,5", s(() -> new ElkPadding(2, 3, 4, 5))));
        f.add(combo("PORT_LABEL_FLAGS", "next-to-port=true,group=false", (Consumer<Build>) b -> {
            put(b, NODES, LayeredOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE, k(true));
            put(b, NODES, LayeredOptions.PORT_LABELS_TREAT_AS_GROUP, k(false));
        }, "next-to-port=false,group=true", (Consumer<Build>) b -> {
            put(b, NODES, LayeredOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE, k(false));
            put(b, NODES, LayeredOptions.PORT_LABELS_TREAT_AS_GROUP, k(true));
        }));
        return f;
    }

    // ---- AETG-style greedy pairwise cover, deterministic for a seed; rows are level indices per factor ----

    static List<int[]> pairwise(int[] levels, long seed) {
        Random rnd = new Random(seed);
        int f = levels.length;
        boolean[][][][] unc = new boolean[f][f][][];
        int remaining = 0;
        for (int i = 0; i < f; i++) {
            for (int j = i + 1; j < f; j++) {
                unc[i][j] = new boolean[levels[i]][levels[j]];
                for (boolean[] row : unc[i][j]) {
                    Arrays.fill(row, true);
                }
                remaining += levels[i] * levels[j];
            }
        }
        List<int[]> design = new ArrayList<>();
        while (remaining > 0) {
            List<int[]> open = new ArrayList<>();
            for (int i = 0; i < f; i++) {
                for (int j = i + 1; j < f; j++) {
                    for (int a = 0; a < levels[i]; a++) {
                        for (int b = 0; b < levels[j]; b++) {
                            if (unc[i][j][a][b]) {
                                open.add(new int[] {i, j, a, b});
                            }
                        }
                    }
                }
            }
            int[] best = null;
            int bestGain = -1;
            for (int cand = 0; cand < CANDIDATES; cand++) {
                int[] seedPair = open.get(rnd.nextInt(open.size()));
                int[] row = new int[f];
                Arrays.fill(row, -1);
                row[seedPair[0]] = seedPair[2];
                row[seedPair[1]] = seedPair[3];
                List<Integer> order = new ArrayList<>();
                for (int i = 0; i < f; i++) {
                    if (row[i] < 0) {
                        order.add(i);
                    }
                }
                Collections.shuffle(order, rnd);
                for (int factor : order) {
                    row[factor] = bestLevel(unc, levels, row, factor, rnd);
                }
                int gain = gain(unc, row);
                if (gain > bestGain) {
                    bestGain = gain;
                    best = row;
                }
            }
            if (best == null) {
                throw new IllegalStateException("pairwise: no candidate row was evaluated");
            }
            for (int i = 0; i < f; i++) {
                for (int j = i + 1; j < f; j++) {
                    if (unc[i][j][best[i]][best[j]]) {
                        unc[i][j][best[i]][best[j]] = false;
                        remaining--;
                    }
                }
            }
            design.add(best);
        }
        return design;
    }

    static int bestLevel(boolean[][][][] unc, int[] levels, int[] row, int factor, Random rnd) {
        List<Integer> ties = new ArrayList<>();
        int bestGain = -1;
        for (int l = 0; l < levels[factor]; l++) {
            int gain = 0;
            for (int other = 0; other < row.length; other++) {
                if (other == factor || row[other] < 0) {
                    continue;
                }
                boolean open = other < factor ? unc[other][factor][row[other]][l] : unc[factor][other][l][row[other]];
                gain += open ? 1 : 0;
            }
            if (gain > bestGain) {
                bestGain = gain;
                ties.clear();
            }
            if (gain == bestGain) {
                ties.add(l);
            }
        }
        return ties.get(rnd.nextInt(ties.size()));
    }

    static int gain(boolean[][][][] unc, int[] row) {
        int g = 0;
        for (int i = 0; i < row.length; i++) {
            for (int j = i + 1; j < row.length; j++) {
                g += unc[i][j][row[i]][row[j]] ? 1 : 0;
            }
        }
        return g;
    }
}
