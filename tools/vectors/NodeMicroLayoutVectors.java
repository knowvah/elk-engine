// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, NS1-NS6, P6) for org.eclipse.elk.alg.common.nodespacing: what
// NodeMicroLayout (sortPortLists, calculateLabelAndNodeSizes, calculateNodeMargins) does at the pinned ELK commit. The
// package has no runnable Java tests (its 4 JUnit files need layered), so the oracle is its behavioural spec. This
// program only CALLS ELK public APIs and records results; it embeds no ELK implementation.
// Run: tools/vectors/node-micro-layout-vectors.sh <outDir>
//      (java -cp ... NodeMicroLayoutVectors.java <outDir> <tools/vectors dir>; env ELK_MODELS_DIR, set by the script)
//
// Output <outDir>/node-micro-layout.json (2-space top level, one compact JSON row per line, trailing newline):
//   { jdk, oracle, labelSize, rowCounts: { corpus, curated, variants, sweep }, rows: [row...] }
//   row = { id, group, labels: "raw"|"sized", input, expected }
//   id are unique and stable: "<group>/<model path without .elkt>#raw|#sized" for corpus and curated,
//   "variants/<west|east|north|south>#sized", "sweep/<NNN>#sized".
//   input    = the PREPARED graph (label sizing and scenario configuration applied) exported by
//              ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
//              .omitUnknownLayoutOptions(true) (the flags of ElktParseVectors.Recorder.export; compact instead of
//              prettyPrint(true)) under system property org.eclipse.elk.graph.json.exportSeed=1, embedded as JSON.
//   expected = { nodes: [{id,x,y,w,h,margins:[t,r,b,l],padding:[t,r,b,l]}], ports: [{id,x,y}],
//                labels: [{id,x,y,w,h}] }  or  { throws: { class, message } } (class = simple class name).
//              Every double is 16 lowercase hex digits, Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded
//              (JavaVectors.hex convention); a NaN anywhere fails the recording. margins = CoreOptions.MARGINS,
//              padding = CoreOptions.PADDING (getProperty, so an unset option reads as its default), as top/right/
//              bottom/left. Each element carries its identifier as exported (the re-imported graph's identifier);
//              an unnamed label is exported without id and carries JSON null.
//
// Traversal order (the three lists are each in this order): node, its labels, its ports (each followed by its labels),
//   then its children recursively. A label is followed by its own nested labels, recursively. Edges and their labels
//   are not listed (NodeMicroLayout never places them; they influence the recorded margins only).
//
// NS3 hierarchy: the graph is visited in post-order; NodeMicroLayout.forGraph(node).execute() runs on every node that
//   has children, after all of its descendants. The root is such a node when it has children. A run that throws
//   (RuntimeException) is recorded as the throws form; nothing partial is kept. Java assertions are disabled (the
//   source launcher runs without -ea), so the three assert sites of the package never fire.
//
// NS1 round trip: for each row the recorder (1) prepares the graph, (2) exports it to `input`, (3) re-imports `input`
//   with ElkGraphJson.forGraph(String).toElk() and runs the micro layout on the re-imported graph, which is the recorded
//   `expected`, and (4) also runs on a freshly prepared original and fails the row if the two outputs differ (compared
//   without identifiers, since the original may be unnamed; throws compare class and message). Stability: the whole row
//   is built twice from scratch (fresh graphs) and the two serialised rows must be byte-identical.
//
// Groups (NS2), in this order, each model/scenario in the sorted order given:
//   corpus   $ELK_MODELS_DIR/tests/core/{node_size,label_placement}/**/*.elkt (8 files), as written.
//   curated  test/corpus/elkt-curated/**/*.elkt (31), then test/golden/inputs/tickets/core/*.elkt (4; ids
//            "curated/golden-tickets/core/<name>"), as written.
//            corpus and curated rows are recorded twice per model: "#raw" (sizes as written) then "#sized" (NS4).
//   variants label_placement/port_labels/variants.elkt with CoreOptions.PORT_SIDE set on every port, the configuration of
//            PortLabelPlacementVariantsTest.configuratorFor (the option id equals LayeredOptions.PORT_SIDE). Rows west,
//            east (active providers) and north, south (providers commented out upstream; the oracle shows whatever Java
//            does). Always sized.
//   sweep    synthetic: root with one node "n" (40x30). Always sized. 11 factors, covered pairwise (see PAIRWISE).
//
// NS4 label sizes: AWT font metrics are platform-dependent and unusable. In "sized" rows every label of any owner
//   (node, port, edge, label) whose text is non-empty and whose width and height are both 0.0 gets
//   width = 6.5 * text.length() (UTF-16 code units), height = 13.0 (both exact binary doubles). Labels with an explicit
//   size keep it. Sizing happens before the export, so `input` carries the sizes.
//
// PAIRWISE (sweep design, seed 6101): factors and levels, in factor order (a null level leaves the option unset):
//   0 NODE_SIZE_CONSTRAINTS  all 16 subsets of {PORTS, PORT_LABELS, NODE_LABELS, MINIMUM_SIZE} by bit mask 0..15
//   1 NODE_SIZE_OPTIONS      null, {}, each of the 9 options alone, all 9, 2 fixed pair/triple sets (14 levels)
//   2 PORT_CONSTRAINTS       the 6 values
//   3 PORT_LABELS_PLACEMENT  null, {}, 9 sets of INSIDE/OUTSIDE x NEXT_TO_PORT_IF_POSSIBLE / ALWAYS_SAME_SIDE /
//                            ALWAYS_OTHER_SAME_SIDE / SPACE_EFFICIENT that Java accepts (11 levels)
//   4 NODE_LABELS_PLACEMENT  node level: null, {}, 8 sets of INSIDE/OUTSIDE x H_*/V_*/H_PRIORITY, 1 set without
//                            INSIDE/OUTSIDE (11 levels)
//   5 node shape             ports per side (N,E,S,W) from {0,1,3}: 10 fixed tuples; every port has size 8x8, its side
//                            as PORT_SIDE, PORT_INDEX in creation order (N,E,S,W), one label "Port <side><i>" and a
//                            position at the node border (so FIXED_POS has input)
//   6 node labels            none | one "Node" | one outside label | three labels (inside TL, inside centre, outside
//                            BR; per-label NODE_LABELS_PLACEMENT overrides) (4 levels)
//   7 PADDING                unset | (2,3,4,5) | (20,5,0,10) as top,right,bottom,left (3)
//   8 NODE_SIZE_MINIMUM      unset | (60,40) | (200,150) (3)
//   9 PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE   unset | true | false (3)
//  10 PORT_LABELS_TREAT_AS_GROUP             unset | true | false (3)
//   Rows come from an AETG-style greedy cover (random seed pair, 40 candidates per row, java.util.Random(6101)) and are
//   numbered in generation order. Placements Java rejects (INSIDE together with OUTSIDE, for ports and for node labels)
//   are kept out of the cover, so that every valid pair is exercised by a row that does not throw; three extra rows
//   overlay one rejected placement each (two port, one node) on design rows spread evenly over the design, and are
//   recorded as throws rows. Throws rows of the corpus and curated groups are the models as written (see below).
//
// Model integrity: the cache salt covers this source, not $ELK_MODELS_DIR or test/golden/inputs, so the SHA-256 of every
//   model file read is pinned in MODEL_TABLE below (tools/vectors/node-micro-layout-vectors.sh checks the same lines
//   before every run, warm or cold). A missing, changed or unlisted model fails the recording by name.
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.stream.Stream;
import org.eclipse.elk.alg.common.NodeMicroLayout;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.NodeLabelPlacement;
import org.eclipse.elk.core.options.PortConstraints;
import org.eclipse.elk.core.options.PortLabelPlacement;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.options.SizeConstraint;
import org.eclipse.elk.core.options.SizeOptions;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.ElkPort;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.elk.graph.util.ElkGraphUtil;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

public class NodeMicroLayoutVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "node-micro-layout.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String MODELS_ENV = "ELK_MODELS_DIR";
    static final String DEFAULT_MODELS = "../../eclipse-elk/elk-models";
    static final String EXTENSION = ".elkt";
    static final String RAW = "raw", SIZED = "sized";
    static final String CORPUS = "corpus", CURATED = "curated", VARIANTS = "variants", SWEEP = "sweep";
    static final String MODELS_PREFIX = "models:", REPO_PREFIX = "repo:";
    static final String[] CORPUS_DIRS = {"tests/core/node_size", "tests/core/label_placement"};
    static final String CURATED_DIR = "test/corpus/elkt-curated";
    static final String TICKETS_DIR = "test/golden/inputs/tickets/core";
    static final String VARIANTS_MODEL = "tests/core/label_placement/port_labels/variants.elkt";
    static final double LABEL_CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0;
    static final String LABEL_SIZE_FORMULA = "width = 6.5 * text.length(), height = 13.0, applied to every label with "
            + "non-empty text and width = height = 0.0; explicit sizes are kept";
    static final long SWEEP_SEED = 6101L;
    static final int CANDIDATES = 40;
    static final double NODE_WIDTH = 40.0, NODE_HEIGHT = 30.0, PORT_SIZE = 8.0, PORT_STEP = 20.0, PORT_SIDE_STEP = 10.0;
    static final int[][] SHAPES = {{0, 0, 0, 0}, {1, 1, 1, 1}, {3, 3, 3, 3}, {0, 3, 0, 3}, {3, 0, 3, 0}, {1, 0, 0, 0},
        {0, 0, 0, 1}, {0, 1, 3, 0}, {3, 1, 0, 1}, {1, 3, 1, 0}};
    static final PortSide[] SHAPE_SIDES = {PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST};

    // SHA-256 of every model file read, "<sha256>  models:<path under ELK_MODELS_DIR>" or "<sha256>  repo:<path under
    // the repo root>". Keep these lines: the shell script parses them.
    static final String MODEL_TABLE = """
0edfbce37888a3fc748826fe3bd8cc297f090e397ff3c66af43395b9fbae610d  models:tests/core/label_placement/node_labels/insideNodeLabels_01.elkt
cbed8f65761ef3736c3d9f7ac87fe3c44eb4128333609234f79cd07871d4e06f  models:tests/core/label_placement/node_labels/variants.elkt
5e25c9f9cd1bc3f5f3d3fdcc31449c7b0273d24538030ef2bf5fae99716cb067  models:tests/core/label_placement/port_labels/next_to_port_if_possible_inside.elkt
dc3fabd0bebad04db14fbcb226ca835eafa313ca22c20face05bb74d818023e1  models:tests/core/label_placement/port_labels/next_to_port_if_possible_outside.elkt
6fdab94e598cbc06e1c9a1c79cb119f76dada0ec09b2a8ac971db48b66192595  models:tests/core/label_placement/port_labels/treat_as_group_inside.elkt
5ec8e899f7be201e63f8318f17d7e2b6e7c7dd350ffabf29e3096864e62d873c  models:tests/core/label_placement/port_labels/treat_as_group_outside.elkt
b1431e5fd5fe0dd833e3175cba1f5f852d2427b47012e3a66fa9cbabbfa28d60  models:tests/core/label_placement/port_labels/variants.elkt
85acf81004f1a420bf221aeb73e54821205031552aab455edcac9952127821f5  models:tests/core/node_size/inside_port_labels.elkt
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
86b826e4c23a0da3c5a9b683cf8692e1c8bdbc405996fe68ab10198ce0551f9d  repo:test/golden/inputs/tickets/core/457_boxLayouterIgnoresMinimumSize.elkt
f30fac5ebbe51ef8aef7f4624e9a64e7018df5ae89d75c88e2a32961e2a5fa77  repo:test/golden/inputs/tickets/core/475_fixedLayoutWithLongLabels.elkt
4299f2e7c6326a4f12caed4d554eeade88b33fe827ad02308ba269c0dd2d81e7  repo:test/golden/inputs/tickets/core/489_paddingAndMinSize_Large.elkt
8909ff92338b121c4aeb424942f2031705633ca8430d57d381da1e73ffae93c2  repo:test/golden/inputs/tickets/core/489_paddingAndMinSize_Small.elkt
""";

    public static void main(String[] args) throws Exception {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        Path vectorsDir = Path.of(args[1]).toAbsolutePath().normalize();
        Path repo = vectorsDir.getParent().getParent();
        String env = System.getenv(MODELS_ENV);
        Path models = (env == null || env.isBlank() ? repo.resolve(DEFAULT_MODELS) : Path.of(env)).toAbsolutePath()
                .normalize();
        List<Model> corpus = new ArrayList<>(), curated = new ArrayList<>();
        discover(models, repo, corpus, curated);
        verifyTable(models, repo, corpus, curated);

        List<Row> rows = new ArrayList<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put(CORPUS, modelRows(rows, CORPUS, corpus));
        counts.put(CURATED, modelRows(rows, CURATED, curated));
        counts.put(VARIANTS, variantRows(rows, models.resolve(VARIANTS_MODEL)));
        counts.put(SWEEP, sweepRows(rows));

        Set<String> ids = new HashSet<>();
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ");
        str(out, System.getProperty("java.version"));
        out.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"labelSize\": ");
        str(out, LABEL_SIZE_FORMULA);
        out.append(",\n  \"rowCounts\": {");
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
        System.err.println("rows " + rows.size() + " " + counts + " throwing " + throwing);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Models

    record Model(String id, String key, Path path) { }

    record Row(String id, String json, boolean threw) { }

    static void discover(Path models, Path repo, List<Model> corpus, List<Model> curated) throws IOException {
        List<String> missing = new ArrayList<>();
        for (String dir : CORPUS_DIRS) {
            if (!Files.isDirectory(models.resolve(dir))) {
                missing.add(MODELS_PREFIX + dir);
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("model directory missing under " + models + ": " + missing);
        }
        for (String dir : CORPUS_DIRS) {
            for (Path p : files(models.resolve(dir))) {
                String rel = models.relativize(p).toString().replace('\\', '/');
                corpus.add(new Model(CORPUS + "/" + rel.substring("tests/core/".length(), rel.length() - EXTENSION.length()),
                        MODELS_PREFIX + rel, p));
            }
        }
        for (Path p : files(repo.resolve(CURATED_DIR))) {
            String rel = repo.relativize(p).toString().replace('\\', '/');
            curated.add(new Model(CURATED + "/" + rel.substring(CURATED_DIR.length() + 1, rel.length() - EXTENSION.length()),
                    REPO_PREFIX + rel, p));
        }
        for (Path p : files(repo.resolve(TICKETS_DIR))) {
            String rel = repo.relativize(p).toString().replace('\\', '/');
            curated.add(new Model(CURATED + "/golden-tickets/core/" + p.getFileName().toString().replace(EXTENSION, ""),
                    REPO_PREFIX + rel, p));
        }
    }

    static List<Path> files(Path dir) throws IOException {
        try (Stream<Path> s = Files.walk(dir)) {
            return s.filter(p -> p.getFileName().toString().endsWith(EXTENSION)).sorted(Comparator.comparing(
                    p -> p.toString().replace('\\', '/'))).toList();
        }
    }

    static void verifyTable(Path models, Path repo, List<Model> corpus, List<Model> curated) throws Exception {
        Map<String, String> table = new TreeMap<>();
        for (String line : MODEL_TABLE.split("\n")) {
            String l = line.strip();
            if (!l.isEmpty()) {
                table.put(l.substring(l.indexOf("  ") + 2), l.substring(0, l.indexOf("  ")));
            }
        }
        List<String> problems = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (Model m : concat(corpus, curated)) {
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
                problems.add("missing model " + key + " (" + (key.startsWith(MODELS_PREFIX) ? models : repo) + ")");
            }
        }
        if (!problems.isEmpty()) {
            throw new IllegalStateException("model files do not match the pinned table: " + problems);
        }
    }

    static List<Model> concat(List<Model> a, List<Model> b) {
        List<Model> all = new ArrayList<>(a);
        all.addAll(b);
        return all;
    }

    static String sha256(Path p) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (byte b : MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(p))) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Groups

    /** Appends raw and sized rows per model; returns the number of rows added. */
    static int modelRows(List<Row> rows, String group, List<Model> models) throws Exception {
        int n = 0;
        for (Model m : models) {
            for (boolean sized : new boolean[] {false, true}) {
                rows.add(stableRow(m.id + "#" + (sized ? SIZED : RAW), group, sized ? SIZED : RAW, () -> {
                    ElkNode g = load(m.path);
                    if (sized) {
                        sizeLabels(g);
                    }
                    return g;
                }));
                n++;
            }
        }
        return n;
    }

    static int variantRows(List<Row> rows, Path file) throws Exception {
        PortSide[] sides = {PortSide.WEST, PortSide.EAST, PortSide.NORTH, PortSide.SOUTH};
        for (PortSide side : sides) {
            String id = VARIANTS + "/" + side.name().toLowerCase(Locale.ROOT) + "#" + SIZED;
            rows.add(stableRow(id, VARIANTS, SIZED, () -> {
                ElkNode g = load(file);
                // setProperty edits the contained property map, so collect before changing (ConcurrentModification).
                List<ElkPort> ports = new ArrayList<>();
                for (TreeIterator<EObject> it = g.eAllContents(); it.hasNext();) {
                    if (it.next() instanceof ElkPort port) {
                        ports.add(port);
                    }
                }
                ports.forEach(port -> port.setProperty(CoreOptions.PORT_SIDE, side));
                sizeLabels(g);
                return g;
            }));
        }
        return sides.length;
    }

    static ElkNode load(Path file) {
        Resource r = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        if (!r.getErrors().isEmpty() || r.getContents().isEmpty() || !(r.getContents().get(0) instanceof ElkNode)) {
            throw new IllegalStateException("cannot load " + file + ": " + r.getErrors());
        }
        return (ElkNode) r.getContents().get(0);
    }

    static void sizeLabels(ElkNode root) {
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkLabel l) {
                sizeLabel(l);
            }
        }
    }

    static void sizeLabel(ElkLabel l) {
        String text = l.getText();
        if (text != null && !text.isEmpty() && l.getWidth() == 0.0 && l.getHeight() == 0.0) {
            l.setDimensions(LABEL_CHAR_WIDTH * text.length(), LABEL_HEIGHT);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Rows

    interface Prepare {
        ElkNode get() throws Exception;
    }

    /** Builds the row twice from scratch and fails unless both serialisations are identical (stability). */
    static Row stableRow(String id, String group, String labels, Prepare prepare) throws Exception {
        Row first = buildRow(id, group, labels, prepare);
        Row second = buildRow(id, group, labels, prepare);
        if (!first.json.equals(second.json)) {
            throw new IllegalStateException("row " + id + " is not stable across two recordings");
        }
        return first;
    }

    static Row buildRow(String id, String group, String labels, Prepare prepare) throws Exception {
        String input = export(prepare.get());
        Result expected = run(ElkGraphJson.forGraph(input).toElk());
        expected.requireNodeAndPortIds(id);
        Result original = run(prepare.get());
        if (!expected.sameValuesAs(original)) {
            throw new IllegalStateException("row " + id + ": output on the re-imported input differs from the output on the "
                    + "prepared original (round-trip self-check)\n re-imported: " + expected.describe()
                    + "\n original:    " + original.describe());
        }
        StringBuilder sb = new StringBuilder("{\"id\": ");
        str(sb, id);
        sb.append(", \"group\": \"").append(group).append("\", \"labels\": \"").append(labels).append("\", \"input\": ")
                .append(input).append(", \"expected\": ");
        expected.write(sb);
        sb.append('}');
        return new Row(id, sb.toString(), expected.thrownClass != null);
    }

    static String export(ElkNode root) {
        return ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                .omitUnknownLayoutOptions(true).prettyPrint(false).toJson();
    }

    /** NS3: post-order, NodeMicroLayout on every node with children. */
    static void micro(ElkNode node) {
        for (ElkNode child : node.getChildren()) {
            micro(child);
        }
        if (!node.getChildren().isEmpty()) {
            NodeMicroLayout.forGraph(node).execute();
        }
    }

    record Elem(String id, String body) { }

    static final class Result {
        final List<Elem> nodes = new ArrayList<>(), ports = new ArrayList<>(), labels = new ArrayList<>();
        String thrownClass, thrownMessage;

        String values() {
            if (thrownClass != null) {
                return "throws " + thrownClass + " " + thrownMessage;
            }
            StringBuilder sb = new StringBuilder();
            for (List<Elem> list : List.of(nodes, ports, labels)) {
                sb.append('|');
                list.forEach(e -> sb.append(e.body).append(';'));
            }
            return sb.toString();
        }

        boolean sameValuesAs(Result other) {
            return values().equals(other.values());
        }

        /** Nodes and ports are always exported with an id; only labels may lack one. */
        void requireNodeAndPortIds(String rowId) {
            for (List<Elem> list : List.of(nodes, ports)) {
                for (Elem e : list) {
                    if (e.id == null) {
                        throw new IllegalStateException("row " + rowId + ": an element has no identifier after import");
                    }
                }
            }
        }

        String describe() {
            return values();
        }

        void write(StringBuilder sb) {
            if (thrownClass != null) {
                sb.append("{\"throws\": {\"class\": ");
                str(sb, thrownClass);
                sb.append(", \"message\": ");
                str(sb, thrownMessage);
                sb.append("}}");
                return;
            }
            sb.append("{\"nodes\": ");
            list(sb, nodes);
            sb.append(", \"ports\": ");
            list(sb, ports);
            sb.append(", \"labels\": ");
            list(sb, labels);
            sb.append('}');
        }

        private static void list(StringBuilder sb, List<Elem> elems) {
            sb.append('[');
            for (int i = 0; i < elems.size(); i++) {
                sb.append(i == 0 ? "" : ", ").append("{\"id\": ");
                str(sb, elems.get(i).id);
                sb.append(", ").append(elems.get(i).body).append('}');
            }
            sb.append(']');
        }
    }

    static Result run(ElkNode root) {
        Result r = new Result();
        try {
            micro(root);
        } catch (RuntimeException e) {
            r.thrownClass = e.getClass().getSimpleName();
            r.thrownMessage = e.getMessage();
            return r;
        }
        collect(root, r);
        return r;
    }

    static void collect(ElkNode node, Result r) {
        ElkMargin m = node.getProperty(CoreOptions.MARGINS);
        ElkPadding p = node.getProperty(CoreOptions.PADDING);
        r.nodes.add(new Elem(id(node), "\"x\": " + hex(node.getX()) + ", \"y\": " + hex(node.getY()) + ", \"w\": "
                + hex(node.getWidth()) + ", \"h\": " + hex(node.getHeight()) + ", \"margins\": "
                + hexes(m.top, m.right, m.bottom, m.left) + ", \"padding\": " + hexes(p.top, p.right, p.bottom, p.left)));
        collectLabels(node.getLabels(), r);
        for (ElkPort port : node.getPorts()) {
            r.ports.add(new Elem(id(port), "\"x\": " + hex(port.getX()) + ", \"y\": " + hex(port.getY())));
            collectLabels(port.getLabels(), r);
        }
        for (ElkNode child : node.getChildren()) {
            collect(child, r);
        }
    }

    static void collectLabels(List<ElkLabel> labels, Result r) {
        for (ElkLabel l : labels) {
            r.labels.add(new Elem(id(l), "\"x\": " + hex(l.getX()) + ", \"y\": " + hex(l.getY()) + ", \"w\": "
                    + hex(l.getWidth()) + ", \"h\": " + hex(l.getHeight())));
            collectLabels(l.getLabels(), r);
        }
    }

    /** The identifier as exported; JsonExporter writes a label id only when non-empty, so a label may carry null. */
    static String id(ElkGraphElement e) {
        return e.getIdentifier();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Sweep

    static final int F_SIZE_CONSTRAINTS = 0, F_SIZE_OPTIONS = 1, F_PORT_CONSTRAINTS = 2, F_PORT_LABELS = 3,
            F_NODE_LABELS_PLACEMENT = 4, F_SHAPE = 5, F_NODE_LABELS = 6, F_PADDING = 7, F_MIN_SIZE = 8, F_NEXT_TO_PORT = 9,
            F_TREAT_AS_GROUP = 10;

    static final List<EnumSet<SizeOptions>> SIZE_OPTION_LEVELS = sizeOptionLevels();
    static final List<EnumSet<PortLabelPlacement>> PORT_LABEL_LEVELS = portLabelLevels();
    static final List<EnumSet<NodeLabelPlacement>> NODE_LABEL_LEVELS = nodeLabelLevels();
    static final double[][] PADDINGS = {null, {2, 3, 4, 5}, {20, 5, 0, 10}};
    static final double[][] MIN_SIZES = {null, {60, 40}, {200, 150}};
    static final Boolean[] BOOLEANS = {null, Boolean.TRUE, Boolean.FALSE};
    static final int NODE_LABEL_LEVEL_COUNT = 4;

    static List<EnumSet<SizeOptions>> sizeOptionLevels() {
        List<EnumSet<SizeOptions>> l = new ArrayList<>();
        l.add(null);
        l.add(EnumSet.noneOf(SizeOptions.class));
        for (SizeOptions o : SizeOptions.values()) {
            l.add(EnumSet.of(o));
        }
        l.add(EnumSet.allOf(SizeOptions.class));
        l.add(EnumSet.of(SizeOptions.DEFAULT_MINIMUM_SIZE, SizeOptions.MINIMUM_SIZE_ACCOUNTS_FOR_PADDING));
        l.add(EnumSet.of(SizeOptions.COMPUTE_PADDING, SizeOptions.PORTS_OVERHANG, SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG));
        return l;
    }

    static List<EnumSet<PortLabelPlacement>> portLabelLevels() {
        PortLabelPlacement in = PortLabelPlacement.INSIDE, out = PortLabelPlacement.OUTSIDE;
        PortLabelPlacement next = PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE, same = PortLabelPlacement.ALWAYS_SAME_SIDE,
                other = PortLabelPlacement.ALWAYS_OTHER_SAME_SIDE, eff = PortLabelPlacement.SPACE_EFFICIENT;
        List<EnumSet<PortLabelPlacement>> l = new ArrayList<>();
        l.add(null);
        l.add(EnumSet.noneOf(PortLabelPlacement.class));
        l.add(EnumSet.of(out));
        l.add(EnumSet.of(in));
        l.add(EnumSet.of(out, next));
        l.add(EnumSet.of(in, next));
        l.add(EnumSet.of(out, same));
        l.add(EnumSet.of(out, other));
        l.add(EnumSet.of(out, eff));
        l.add(EnumSet.of(in, eff));
        l.add(EnumSet.of(in, same));
        return l;
    }

    /** Contradictory port label placements Java rejects; each is overlaid on one design row (see sweepRows). */
    static List<EnumSet<PortLabelPlacement>> invalidPortLabelLevels() {
        return List.of(EnumSet.of(PortLabelPlacement.INSIDE, PortLabelPlacement.OUTSIDE),
                EnumSet.of(PortLabelPlacement.INSIDE, PortLabelPlacement.OUTSIDE, PortLabelPlacement.ALWAYS_SAME_SIDE,
                        PortLabelPlacement.SPACE_EFFICIENT));
    }

    static List<EnumSet<NodeLabelPlacement>> nodeLabelLevels() {
        NodeLabelPlacement in = NodeLabelPlacement.INSIDE, out = NodeLabelPlacement.OUTSIDE;
        NodeLabelPlacement hl = NodeLabelPlacement.H_LEFT, hc = NodeLabelPlacement.H_CENTER, hr = NodeLabelPlacement.H_RIGHT;
        NodeLabelPlacement vt = NodeLabelPlacement.V_TOP, vc = NodeLabelPlacement.V_CENTER, vb = NodeLabelPlacement.V_BOTTOM;
        List<EnumSet<NodeLabelPlacement>> l = new ArrayList<>();
        l.add(null);
        l.add(EnumSet.noneOf(NodeLabelPlacement.class));
        l.add(EnumSet.of(in, hl, vt));
        l.add(EnumSet.of(in, hc, vc));
        l.add(EnumSet.of(in, hr, vb));
        l.add(EnumSet.of(out, hc, vt));
        l.add(EnumSet.of(out, hl, vb));
        l.add(EnumSet.of(out, hr, vc));
        l.add(EnumSet.of(in, hc, vt, NodeLabelPlacement.H_PRIORITY));
        l.add(EnumSet.of(in, hl, vc));
        l.add(EnumSet.of(hc));
        return l;
    }

    /** Node label placement with INSIDE and OUTSIDE together, which Java rejects. */
    static EnumSet<NodeLabelPlacement> invalidNodeLabelLevel() {
        return EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.H_CENTER);
    }

    static int sweepRows(List<Row> rows) throws Exception {
        int[] levels = new int[11];
        levels[F_SIZE_CONSTRAINTS] = 16;
        levels[F_SIZE_OPTIONS] = SIZE_OPTION_LEVELS.size();
        levels[F_PORT_CONSTRAINTS] = PortConstraints.values().length;
        levels[F_PORT_LABELS] = PORT_LABEL_LEVELS.size();
        levels[F_NODE_LABELS_PLACEMENT] = NODE_LABEL_LEVELS.size();
        levels[F_SHAPE] = SHAPES.length;
        levels[F_NODE_LABELS] = NODE_LABEL_LEVEL_COUNT;
        levels[F_PADDING] = PADDINGS.length;
        levels[F_MIN_SIZE] = MIN_SIZES.length;
        levels[F_NEXT_TO_PORT] = BOOLEANS.length;
        levels[F_TREAT_AS_GROUP] = BOOLEANS.length;
        List<int[]> design = pairwise(levels, SWEEP_SEED);
        int n = 0;
        for (int[] row : design) {
            String id = String.format("%s/%03d#%s", SWEEP, n, SIZED);
            rows.add(stableRow(id, SWEEP, SIZED, () -> sweepGraph(row, null, null)));
            n++;
        }
        // Rejected placements, each overlaid on a design row spread evenly over the design.
        int invalids = invalidPortLabelLevels().size() + 1;
        for (int k = 0; k < invalids; k++) {
            int[] row = design.get((k + 1) * design.size() / (invalids + 1));
            EnumSet<PortLabelPlacement> port = k < invalidPortLabelLevels().size() ? invalidPortLabelLevels().get(k) : null;
            EnumSet<NodeLabelPlacement> node = port == null ? invalidNodeLabelLevel() : null;
            String id = String.format("%s/%03d#%s", SWEEP, n, SIZED);
            rows.add(stableRow(id, SWEEP, SIZED, () -> sweepGraph(row, port, node)));
            n++;
        }
        return n;
    }

    static <T extends Enum<T>> void set(ElkGraphElement e, IProperty<EnumSet<T>> p, EnumSet<T> value) {
        if (value != null) {
            e.setProperty(p, EnumSet.copyOf(value.isEmpty() ? EnumSet.noneOf(elementType(value)) : value));
        }
    }

    @SuppressWarnings("unchecked")
    static <T extends Enum<T>> Class<T> elementType(EnumSet<T> empty) {
        // An empty EnumSet has no element-type accessor; the callers only pass the three option enums.
        Object any = empty;
        if (any instanceof EnumSet<?> s && s.isEmpty()) {
            return (Class<T>) EMPTY_TYPES.get(s);
        }
        throw new IllegalStateException("not an empty enum set");
    }

    /** Identity map from each empty level set to its enum class (EnumSet hides the class of an empty set). */
    static final Map<EnumSet<?>, Class<?>> EMPTY_TYPES = new IdentityHashMap<>();

    static {
        for (EnumSet<SizeOptions> s : SIZE_OPTION_LEVELS) {
            if (s != null && s.isEmpty()) {
                EMPTY_TYPES.put(s, SizeOptions.class);
            }
        }
        for (EnumSet<PortLabelPlacement> s : PORT_LABEL_LEVELS) {
            if (s != null && s.isEmpty()) {
                EMPTY_TYPES.put(s, PortLabelPlacement.class);
            }
        }
        for (EnumSet<NodeLabelPlacement> s : NODE_LABEL_LEVELS) {
            if (s != null && s.isEmpty()) {
                EMPTY_TYPES.put(s, NodeLabelPlacement.class);
            }
        }
    }

    static ElkNode sweepGraph(int[] c, EnumSet<PortLabelPlacement> invalidPort, EnumSet<NodeLabelPlacement> invalidNode) {
        ElkNode root = ElkGraphUtil.createGraph();
        root.setIdentifier("root");
        ElkNode node = ElkGraphUtil.createNode(root);
        node.setIdentifier("n");
        node.setDimensions(NODE_WIDTH, NODE_HEIGHT);
        EnumSet<SizeConstraint> constraints = EnumSet.noneOf(SizeConstraint.class);
        SizeConstraint[] all = {SizeConstraint.PORTS, SizeConstraint.PORT_LABELS, SizeConstraint.NODE_LABELS,
            SizeConstraint.MINIMUM_SIZE};
        for (int b = 0; b < all.length; b++) {
            if ((c[F_SIZE_CONSTRAINTS] & (1 << b)) != 0) {
                constraints.add(all[b]);
            }
        }
        node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, constraints);
        set(node, CoreOptions.NODE_SIZE_OPTIONS, SIZE_OPTION_LEVELS.get(c[F_SIZE_OPTIONS]));
        node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.values()[c[F_PORT_CONSTRAINTS]]);
        set(node, CoreOptions.PORT_LABELS_PLACEMENT, invalidPort != null ? invalidPort : PORT_LABEL_LEVELS.get(c[F_PORT_LABELS]));
        set(node, CoreOptions.NODE_LABELS_PLACEMENT,
                invalidNode != null ? invalidNode : NODE_LABEL_LEVELS.get(c[F_NODE_LABELS_PLACEMENT]));
        double[] pad = PADDINGS[c[F_PADDING]];
        if (pad != null) {
            node.setProperty(CoreOptions.PADDING, new ElkPadding(pad[0], pad[1], pad[2], pad[3]));
        }
        double[] min = MIN_SIZES[c[F_MIN_SIZE]];
        if (min != null) {
            node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(min[0], min[1]));
        }
        if (BOOLEANS[c[F_NEXT_TO_PORT]] != null) {
            node.setProperty(CoreOptions.PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE, BOOLEANS[c[F_NEXT_TO_PORT]]);
        }
        if (BOOLEANS[c[F_TREAT_AS_GROUP]] != null) {
            node.setProperty(CoreOptions.PORT_LABELS_TREAT_AS_GROUP, BOOLEANS[c[F_TREAT_AS_GROUP]]);
        }
        nodeLabels(node, c[F_NODE_LABELS]);
        ports(node, SHAPES[c[F_SHAPE]]);
        sizeLabels(root);
        return root;
    }

    static void nodeLabels(ElkNode node, int level) {
        switch (level) {
            case 1 -> label(node, "Node", "n_l0", null);
            case 2 -> label(node, "Outside node", "n_l0", EnumSet.of(NodeLabelPlacement.OUTSIDE,
                    NodeLabelPlacement.H_CENTER, NodeLabelPlacement.V_TOP));
            case 3 -> {
                label(node, "In", "n_l0", EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.H_LEFT,
                        NodeLabelPlacement.V_TOP));
                label(node, "Mid label", "n_l1", EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.H_CENTER,
                        NodeLabelPlacement.V_CENTER));
                label(node, "Out label", "n_l2", EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.H_RIGHT,
                        NodeLabelPlacement.V_BOTTOM));
            }
            default -> { }
        }
    }

    static void label(ElkGraphElement owner, String text, String ident, EnumSet<NodeLabelPlacement> placement) {
        ElkLabel l = ElkGraphUtil.createLabel(text, owner);
        l.setIdentifier(ident);
        if (placement != null) {
            l.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, placement);
        }
    }

    static void ports(ElkNode node, int[] perSide) {
        int index = 0;
        for (int s = 0; s < SHAPE_SIDES.length; s++) {
            PortSide side = SHAPE_SIDES[s];
            for (int i = 0; i < perSide[s]; i++) {
                ElkPort p = ElkGraphUtil.createPort(node);
                String name = side.name().substring(0, 1) + i;
                p.setIdentifier("n_p" + name);
                p.setDimensions(PORT_SIZE, PORT_SIZE);
                p.setProperty(CoreOptions.PORT_SIDE, side);
                p.setProperty(CoreOptions.PORT_INDEX, index++);
                switch (side) {
                    case NORTH -> p.setLocation(10 + i * PORT_STEP, -PORT_SIZE);
                    case SOUTH -> p.setLocation(10 + i * PORT_STEP, NODE_HEIGHT);
                    case EAST -> p.setLocation(NODE_WIDTH, 5 + i * PORT_SIDE_STEP);
                    default -> p.setLocation(-PORT_SIZE, 5 + i * PORT_SIDE_STEP);
                }
                label(p, "Port " + name, "n_p" + name + "_l0", null);
            }
        }
    }

    /** AETG-style greedy pairwise cover, deterministic for a seed. Rows are level indices per factor. */
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
                // Unreachable: CANDIDATES > 0 and gain >= 0 > -1, so the first candidate is always taken. Stated for
                // the static analyser; draws nothing from rnd, so the recording is unchanged.
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

    // ------------------------------------------------------------------------------------------------------------
    // JSON helpers

    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new IllegalStateException("NaN in a recorded value");
        }
        return "\"" + String.format("%016x", Double.doubleToRawLongBits(d)) + "\"";
    }

    static String hexes(double... ds) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < ds.length; i++) {
            sb.append(i == 0 ? "" : ", ").append(hex(ds[i]));
        }
        return sb.append(']').toString();
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
}
