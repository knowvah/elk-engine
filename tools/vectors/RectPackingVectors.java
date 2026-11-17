// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 8c alg-packing, T1, PK1, PK7) for org.eclipse.elk.alg.rectpacking: what
// RectPackingLayoutProvider.layout does at the pinned ELK commit, stop by stop. This program only CALLS ELK APIs (and reads private state
// by reflection) and records results; it embeds no ELK implementation.
// Run: tools/vectors/rectpacking-vectors.sh <outDir>   (java -cp ... RectPackingVectors.java <outDir> <tools/vectors dir>)
// ORIGIN: the row format, the NS1 round trip, the NS6 hex doubles, the strictNumbers sanitiser, the throws shape with the first ELK frame,
// the identity-hash guard and the 16 MiB guard are copied from tools/vectors/DiscoVectors.java (single-file launchers share no code).
//
// ===== OUTPUT CONTRACT (everything a TypeScript replay needs; no need to read the recorder body) =====
// File <outDir>/rectpacking.json (2-space top level, ONE compact JSON row per line, trailing newline, strict JSON, under 16 MiB):
//   { jdk, oracle, seed, rowCounts: { full, stops, throws, sort }, optionCoverage, stopCoverage, rows: [row...] }
//   row = { id, group, input, expected }, ids unique and stable: "<group>/<shape>/<factor>" (throws: "throws/<name>", sort: "sort/L<len>/v<k>").
//   group in full | stops | throws | sort.
//   input (full, stops, throws) = the PREPARED graph (algorithm option, factor applied) exported by ElkGraphJson.forGraph(root)
//     .omitLayout(false).omitZeroDimension(false).omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false) under system
//     properties org.eclipse.elk.graph.json.exportSeed=1 and org.eclipse.elk.graph.util.identifierSeed=1, EMBEDDED as a JSON object. A bare
//     Infinity/-Infinity/NaN token of the exporter becomes the string "Infinity"/"-Infinity"/"NaN". Every node, port and label has a unique
//     id. The graphs have no edges. The root and every node that has children carry elk.algorithm = org.eclipse.elk.rectpacking (the corpus
//     rows keep the model's own options).
//   How a row is run (a replay does the same): ElkGraphJson.forGraph(input).toElk(), then new RecursiveGraphLayoutEngine().layout(root,
//     monitor) with RectPackingMetaDataProvider + RectPackingOptions and LayeredMetaDataProvider + LayeredOptions registered. Rows whose
//     expected.mode is "provider" call new RectPackingLayoutProvider().layout(root, monitor) directly instead (the engine never calls a
//     provider for a graph without children; only throws/emptyGreedy uses it).
//   A scenario whose outcome decides its group (auto: the random rows, the edge rows and the corpus rows) is recorded under the group the
//     JVM produced: a run that throws is a throws row named "throws/<shape>" (no factor suffix) and gets no stops row.
//
// Numbers: every double is 16 lowercase hex digits, Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded; a NaN anywhere fails the
//   recording (+Infinity is 7ff0000000000000). Integers are JSON numbers. Ids are strings as exported. Points are [hexX, hexY].
//
// ELK DUMP (the state of one layout node's subtree; group full "expected" body and the "final" of a stops row):
//   graph  = { id, x, y, w, h }                      the layout node
//   nodes  = [ { id, x, y, w, h } ]                  ALL descendants in traversal order: each node, its labels, its ports (each followed by
//                                                    its labels), then its children recursively (labels and ports of the top node come first
//                                                    in their own lists); the order of the direct children is the order of the node list
//                                                    (reorderers change it)
//   ports, labels = [ { id, x, y, w, h } ]
//   extras = [ { id, currentPosition, priority } ]   for every descendant node on which RectPackingOptions.CURRENT_POSITION or
//                                                    CoreOptions.PRIORITY is set (hasProperty): int or null
//   group full: expected = { layoutNode: "root", mode, graph, nodes, ports, labels, extras } for the whole root after the run.
//   group throws: expected = { layoutNode, mode, throws: { class, message, frame } } class and message of the ROOT CAUSE; message =
//     getMessage() or null (a JDK helpful NullPointerException message is JVM text: compare class and frame); frame = the innermost
//     org.eclipse.elk frame "File.java:line". The stops path must throw the same (the recorder checks it).
//
// group stops: expected = { layoutNode, mode, graphs: [ { graph, processors, stops: [ stop... ] } ], flags, final }
//   One entry of graphs per graph on which RectPackingLayoutProvider ran its processor loop, in the order the loops started (bottom-up for
//   a hierarchy: the leaf layout nodes first, the root last). A graph that ran the BoxLayoutProvider fallback (tryBox with no stackable
//   triple) or has no children has NO entry (children then carry "priority" in the final dump's extras). processors = the simple class
//   names of the assembled processors in the order they ran. The stops are taken at the provider's own logGraph points (the recorder's
//   progress monitor has logging enabled; the dump is taken live, before ELK would copy the graph):
//     stop = { stop, state }   stop names, in this order, each present when it exists:
//       "begin"                           before the first processor (after the first NodeMicroLayout and the stackable check)
//       "after:NodeSizeReorderer"         (orderBySize)               children sorted by height descending (ECollections.sort)
//       "after:InteractiveNodeReorderer"  (interactive)               children re-ordered, CURRENT_POSITION set on every child
//       "after:MinSizePreProcessor"       always                      MIN_WIDTH, MIN_HEIGHT set
//       "after:GreedyWidthApproximator"   (strategy GREEDY)           positions from AreaApproximation, TARGET_WIDTH set, plus state.drawing
//       "after:TargetWidthWidthApproximator" (strategy TARGET_WIDTH)  TARGET_WIDTH set from the option
//       "after:MinSizePostProcessor"      always                      TARGET_WIDTH = max(TARGET_WIDTH, MIN_WIDTH) (it runs BEFORE p2)
//       "after:Compactor" | "after:SimplePlacement" | "after:NoPlacement"   p2: positions, ADDITIONAL_HEIGHT, DRAWING_*, ROWS (Compactor,
//                                         SimplePlacement), MIN/MAX_ROW_INCREASE/DECREASE (Compactor)
//       "after:EqualWhitespaceEliminator" | "after:ToAspectratioNodeExpander"   p3 (whiteSpaceElimination.strategy not NONE): expanded
//                                         nodes (ElkUtil.translate of their content), DRAWING_WIDTH/HEIGHT, ADDITIONAL_HEIGHT
//       "end"                             the provider's "Output" point: after content alignment, padding shift, graph resize and the
//                                         second NodeMicroLayout (node bounds, graph size, padding)
//   state = ELK DUMP fields (graph, nodes, ports, labels, extras) of the graph plus
//     props   = { additionalHeight, drawingHeight, drawingWidth, minHeight, minWidth, targetWidth, minRowIncrease, maxRowIncrease,
//                 minRowDecrease, maxRowDecrease }  InternalProperties as hex or null when not set (hasProperty)
//     padding = [t, r, b, l] hex: the explicit padding property the provider stored at its start, or null
//     rows    = null when InternalProperties.ROWS is not set, else the RectRow object graph of the property:
//         { listSize, rows: [ row ], blocks: [ block ], stacks: [ stack ] }
//         rows[0..listSize) is the ROWS list in order; further entries are rows only reachable as a block's parentRow (removed from the
//         list by the compaction). blocks and stacks are numbered by first sight (rows in order, each row's blocks then stacks, then
//         closure over block.parentRow, block.stack, stack.blocks). Indices refer to these tables.
//         row   = { y, width, height, spacing, potentialAdditionalWidth, blocks: [block idx] (RectRow.children), stacks: [stack idx] }
//         stack = { x, y, width, height, spacing, blocks: [block idx] }
//         block = { x, y, width, height, minWidth, minHeight, smallestRectWidth, smallestRectHeight, averageHeight, maxHeight, spacing,
//                   fixed, positionFixed, parentRow: row idx, stack: stack idx | null, children: [node id] (Block.children),
//                   rows: [ { x, y, width, height, spacing, rects: [node id] } ] (Block.rows, the BlockRow list) }
//     drawing = (only after GreedyWidthApproximator) the DrawingData AreaApproximation.approxBoundingBox returned, re-computed by the
//         recorder on the live graph (the processor discards it): { dar, drawingWidth, drawingHeight, scaleMeasure, area, aspectRatio,
//         placementOption (name), nextX, nextY }; the recorder fails when the re-run moves a node.
//   flags = counts of branch evidence seen in this run (also summed into stopCoverage): "proc:<Name>", "log:<tag>" (the compaction's
//     own logGraph points, counted but not dumped), "rows>1", "stacks>1", "blocksInStack>1", "blockRows>1", "detachedRows", "box".
//   final = the ELK DUMP of the layout node after the whole run.
//   The recorder fails the row when a plain run (no logging monitor) of a fresh import gives a different final dump.
//
// group sort (PK7): expected = { order: [index...] } | { throws: { class, message } }. input = { positions: [int...] }, the DESIRED_POSITION
//   of element i (a node with identifier "i" and RectPackingOptions.DESIRED_POSITION set, in an ArrayList). order = the identifiers, as
//   indices, of the list after Collections.sort(list, comparator) with the comparator copied verbatim from
//   InteractiveNodeReorderer.java:56-63 (equal positions return -1 in both directions). 640 rows: lengths 1-64 times 10 position shapes
//   (v0 all equal, v1-v2 two and three values, v3 range L/2, v4 range L, v5 ascending with duplicates, v6 descending with duplicates,
//   v7 sawtooth, v8 four values, v9 zero/one) drawn from seed SEED; 330 rows have length >= 32.
//
// OPTIONS (every option of tools/melk/sources/RectPacking.melk, one factor at a time, set at every level a reader reads it; optionCoverage
//   counts rows per value and group; the recorder fails when a required value has no full row): the graph options are set on every layout
//   node ("@graph"), the node options on every child of every layout node ("@nodes"; optionCoverage keys end in @nodes). Read on the
//   graph: aspectRatio, padding, spacing.nodeNode, nodeSize.fixedGraphSize, contentAlignment, omitNodeMicroLayout, trybox, orderBySize,
//   interactive, interactiveLayout, widthApproximation.*, packing.*, whiteSpaceElimination.strategy, nodeSize.minimum/constraints/options
//   (MinSizePreProcessor, ElkUtil.resizeNode). Read on a node: desiredPosition (hasProperty), inNewRow, currentPosition (written), and
//   nodeSize.*, nodeLabels.placement, portLabels.placement (NodeMicroLayout). interactiveLayout is read by nobody in the engine
//   (InteractiveRectPackingGraphVisitor is not applied by it).
//
// SCENARIOS (seeded java.util.Random, SEED = 8301): see shapes(). Bases mix9 (labels and ports), wide14, tall12, hier (compound
//   children, labels), eq5 (equal heights: tryBox falls back to BoxLayoutProvider), stk4, single1, two2; random rows rand<k> (80 full, the
//   first 24 also stops; hier gets stops rows for 8 factors only, STOPS_ONLY); edge rows; the three native corpus models (interactiveRectpacking_*, interactiveLayout_mixedHierarchy).
//
// Round trip (NS1): for each row the recorder (1) prepares the graph, (2) exports it to `input`, (3) re-imports `input` and runs it, which
//   is the recorded `expected`, and (4) also runs a freshly prepared original and fails the row if the two outputs differ. Stability: the
//   whole row is built twice from scratch and the two serialised rows must be byte-identical. A row that does not finish within
//   ROW_TIMEOUT_SECONDS stops the recording.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2; the program refuses to run without it
//   unless RECTPACKING_UNPINNED=1 (an evidence run). Size guard: the output must stay under 16 MiB (MAX_BYTES).
//
// Models table: SHA-256 of every corpus .elkt read, "<sha256>  repo:<path>" (vendored) or "<sha256>  models:<path under ELK_MODELS_DIR>"
//   (the models repository, read only; the script exports RECTPACKING_MODELS_DIR). The script checks the table before every run.
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.IOException;
import java.io.StringReader;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.rectpacking.RectPackingLayoutProvider;
import org.eclipse.elk.alg.rectpacking.options.InternalProperties;
import org.eclipse.elk.alg.rectpacking.options.OptimizationGoal;
import org.eclipse.elk.alg.rectpacking.options.RectPackingMetaDataProvider;
import org.eclipse.elk.alg.rectpacking.options.RectPackingOptions;
import org.eclipse.elk.alg.rectpacking.p1widthapproximation.AreaApproximation;
import org.eclipse.elk.alg.rectpacking.p1widthapproximation.WidthApproximationStrategy;
import org.eclipse.elk.alg.rectpacking.p2packing.PackingStrategy;
import org.eclipse.elk.alg.rectpacking.p3whitespaceelimination.WhiteSpaceEliminationStrategy;
import org.eclipse.elk.alg.rectpacking.util.Block;
import org.eclipse.elk.alg.rectpacking.util.BlockRow;
import org.eclipse.elk.alg.rectpacking.util.BlockStack;
import org.eclipse.elk.alg.rectpacking.util.DrawingData;
import org.eclipse.elk.alg.rectpacking.util.RectRow;
import org.eclipse.elk.core.AbstractLayoutProvider;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.ContentAlignment;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.NodeLabelPlacement;
import org.eclipse.elk.core.options.PortLabelPlacement;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.options.SizeConstraint;
import org.eclipse.elk.core.options.SizeOptions;
import org.eclipse.elk.core.util.BasicProgressMonitor;
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

public class RectPackingVectors {
    static final String ELK_COMMIT = "e7eaea5747f2e5187a7b83cfdc256b501ca00d3c";
    static final String OUTPUT = "rectpacking.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String IDENTIFIER_SEED_PROPERTY = "org.eclipse.elk.graph.util.identifierSeed";
    static final String UNPINNED_ENV = "RECTPACKING_UNPINNED";
    static final String MODELS_ENV = "RECTPACKING_MODELS_DIR";
    static final String ALGORITHM_ID = RectPackingOptions.ALGORITHM_ID;
    static final long SEED = 8301L;
    static final long MAX_BYTES = 16L * 1024 * 1024;
    static final int ROW_TIMEOUT_SECONDS = 60;
    static final String FULL = "full", STOPS = "stops", THROWS = "throws", SORT = "sort";
    static final List<String> GROUPS = List.of(FULL, STOPS, THROWS, SORT);
    static final String ROOT_ID = "root";
    static final String MODE_ENGINE = "engine", MODE_PROVIDER = "provider";
    static final double LABEL_CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0;
    static final double[] WIDTHS = {10, 20, 30, 45, 60, 90, 140, 220};
    static final double[] HEIGHTS = {10, 20, 30, 40, 50, 80, 120, 200};
    static final PortSide[] SIDES = {PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST};
    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");
    static final String MODELS_TABLE = """
            e10fb3d5b1ad4780a76ba6961703c2168da5f57e6c0a5d699dc325d9f15687e8  repo:test/corpus/elkt-curated/examples/user-hints/interactive-constraints/interactiveLayout_mixedHierarchy.elkt
            e59cf1fcbd18cc9ce948c840e7c745603f499dcc925c8a23261f7a88b512a308  repo:test/corpus/elkt-curated/examples/user-hints/interactive-constraints/interactiveRectpacking_oneBigNode.elkt
            a27fdd5dd3b0d171419dcfab7ba7b70bcfac65954b38ceecd7c5c53187980402  models:examples/user-hints/interactive-constraints/interactiveRectpacking_hierarchy.elkt
            """;
    static final Pattern BEFORE = Pattern.compile("(\\d+)-Before (\\w+)");
    static final Pattern FINISHED = Pattern.compile("\\d+-Finished");

    static final class Bug extends RuntimeException {
        Bug(String m) {
            super(m);
        }
    }

    record Row(String id, String group, String json) { }

    /** apply runs on every layout node (a node with children); stops: also recorded as a stops row; micro: only on bases with labels. */
    record Factor(String id, Consumer<ElkNode> apply, boolean micro, boolean stops) { }

    /** A scenario shape: make builds the unprepared graph. auto: the JVM outcome decides full or throws. keep: leave the algorithm options. */
    record Spec(String id, Supplier<ElkNode> make, boolean direct, boolean stops, boolean auto, boolean keep, boolean micro,
            List<Factor> factors) { }

    record Outcome(boolean threw, String json, Map<String, Integer> flags) { }

    static ExecutorService pool;
    static Path REPO;
    static final Map<String, Integer> STOP_FLAGS = new TreeMap<>();

    public static void main(String[] args) throws Exception {
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        setup();
        verifyModels();
        Path out = Path.of(args[0]);
        List<Row> rows = buildRows();
        rows.addAll(sortRows());
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String g : GROUPS) {
            counts.put(g, (int) rows.stream().filter(r -> r.group.equals(g)).count());
        }
        requireCoverage();
        StringBuilder sb = new StringBuilder("{\n  \"jdk\": ");
        str(sb, System.getProperty("java.version"));
        sb.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"seed\": ").append(SEED);
        sb.append(",\n  \"rowCounts\": {");
        int k = 0;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            sb.append(k++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        sb.append("},\n  \"optionCoverage\": ").append(coverageJson()).append(",\n  \"stopCoverage\": ")
                .append(flagsJson(STOP_FLAGS)).append(",\n  \"rows\": [\n");
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < rows.size(); i++) {
            if (!ids.add(rows.get(i).id)) {
                throw new Bug("duplicate row id " + rows.get(i).id);
            }
            sb.append("    ").append(rows.get(i).json).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        sb.append("  ]\n}\n");
        byte[] bytes = sb.toString().getBytes(StandardCharsets.UTF_8);
        if (bytes.length >= MAX_BYTES) {
            throw new Bug("output " + bytes.length + " bytes reaches the 16 MiB cap");
        }
        strictParse(sb.toString());
        Files.createDirectories(out);
        Files.write(out.resolve(OUTPUT), bytes);
        System.err.println("rows " + rows.size() + " " + counts + " bytes " + bytes.length);
        System.err.println("stopCoverage " + flagsJson(STOP_FLAGS));
        System.err.println("optionCoverage " + coverageJson());
        pool.shutdownNow();
    }

    static void setup() throws Exception {
        if (!"1".equals(System.getenv(UNPINNED_ENV))
                && System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/rectpacking-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new RectPackingMetaDataProvider(), new RectPackingOptions(),
                new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty(IDENTIFIER_SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        pool = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "rectpacking-row");
            t.setDaemon(true);
            return t;
        });
    }

    /** Runs the task on the worker thread; a run past the timeout ends the recording. */
    static <T> T timed(String what, Callable<T> task) throws Exception {
        Future<T> f = pool.submit(task);
        try {
            return f.get(ROW_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            System.err.println("TIMEOUT " + what + " (" + ROW_TIMEOUT_SECONDS + " s)");
            System.exit(1);
            return null;
        } catch (ExecutionException e) {
            if (e.getCause() instanceof Exception ex) {
                throw ex;
            }
            throw e;
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Rows

    static List<Row> buildRows() throws Exception {
        Random rnd = new Random(SEED);
        List<Row> rows = new ArrayList<>();
        for (Spec s : shapes(rnd)) {
            for (Factor f : s.factors) {
                if (f.micro && !s.micro) {
                    continue;
                }
                Supplier<ElkNode> prep = prepare(s, f);
                Row full = row(FULL + "/" + s.id + "/" + f.id, FULL, prep, s);
                rows.add(full);
                if (s.stops && f.stops && full.group.equals(FULL) && stopsWanted(s, f)) {
                    rows.add(row(STOPS + "/" + s.id + "/" + f.id, STOPS, prep, s));
                }
            }
        }
        for (Spec s : throwsSpecs()) {
            rows.add(row(THROWS + "/" + s.id, THROWS, prepare(s, s.factors.get(0)), s));
        }
        return rows;
    }

    /** The hierarchy dumps every compound node's loop at every stop (about 100 kB a row): only these factors get a stops row there. */
    static final Map<String, Set<String>> STOPS_ONLY = Map.of("hier", Set.of("default", "packingSIMPLE", "whitespaceEQUAL_BETWEEN_STRUCTURES",
            "iterations2", "interactiveDesiredTies", "orderBySize", "inNewRowThird", "targetWidth150"));

    static boolean stopsWanted(Spec s, Factor f) {
        Set<String> only = STOPS_ONLY.get(s.id);
        return only == null || only.contains(f.id);
    }

    static Supplier<ElkNode> prepare(Spec s, Factor f) {
        return () -> {
            ElkNode root = s.make.get();
            if (s.keep) {
                root.setProperty(CoreOptions.ALGORITHM, ALGORITHM_ID);
            } else {
                for (ElkNode l : layouts(root)) {
                    l.setProperty(CoreOptions.ALGORITHM, ALGORITHM_ID);
                }
                if (!root.hasProperty(CoreOptions.ALGORITHM)) {
                    root.setProperty(CoreOptions.ALGORITHM, ALGORITHM_ID);
                }
            }
            for (ElkNode l : layouts(root)) {
                f.apply.accept(l);
            }
            if (!root.hasProperty(CoreOptions.ALGORITHM)) {
                throw new Bug("root without algorithm");
            }
            return root;
        };
    }

    /** The root and every descendant that has children, pre-order. */
    static List<ElkNode> layouts(ElkNode root) {
        List<ElkNode> r = new ArrayList<>();
        collectLayouts(root, r);
        if (r.isEmpty()) {
            r.add(root);
        }
        return r;
    }

    static void collectLayouts(ElkNode n, List<ElkNode> out) {
        if (!n.getChildren().isEmpty()) {
            out.add(n);
            for (ElkNode c : n.getChildren()) {
                collectLayouts(c, out);
            }
        }
    }

    /** Builds one row twice from scratch; the second serialisation must equal the first. */
    static Row row(String id, String group, Supplier<ElkNode> prep, Spec spec) throws Exception {
        Row a = buildRow(id, group, prep, spec, true);
        Row b = buildRow(id, group, prep, spec, false);
        if (!a.json.equals(b.json)) {
            throw new Bug("row " + id + " is not stable across two builds");
        }
        return a;
    }

    static Row buildRow(String id, String group, Supplier<ElkNode> prep, Spec spec, boolean record) throws Exception {
        if (record && System.getenv("RECTPACKING_TRACE") != null) {
            System.err.println("TRACE ROW " + id);
        }
        ElkNode original = prep.get();
        String input = export(original);
        boolean stops = group.equals(STOPS);
        Outcome viaImport = timed(id, () -> run(ElkGraphJson.forGraph(input).toElk(), spec.direct, stops));
        Outcome viaOriginal = timed(id, () -> run(prep.get(), spec.direct, stops));
        if (viaImport.threw != viaOriginal.threw || !viaImport.json.equals(viaOriginal.json)) {
            throw new Bug("round trip: row " + id + " differs between the re-imported and the original graph:\n" + viaImport.json
                    + "\n" + viaOriginal.json);
        }
        String finalGroup = group;
        String finalId = id;
        if (spec.auto && group.equals(FULL) && viaImport.threw) {
            finalGroup = THROWS;
            finalId = THROWS + "/" + spec.id;
        }
        if (finalGroup.equals(THROWS) != viaImport.threw) {
            throw new Bug("row " + id + (viaImport.threw ? " threw but is planned " + group + ": " + viaImport.json
                    : " is planned throws but ran"));
        }
        if (record) {
            countCoverage(finalGroup, original);
        }
        if (viaImport.threw) {
            Outcome viaStops = timed(id, () -> run(ElkGraphJson.forGraph(input).toElk(), spec.direct, true));
            if (!viaStops.threw || !viaStops.json.equals(viaImport.json)) {
                throw new Bug("row " + id + ": the stops path does not throw the same exception: " + viaStops.json + " vs "
                        + viaImport.json);
            }
        } else if (record) {
            for (Map.Entry<String, Integer> e : viaImport.flags.entrySet()) {
                STOP_FLAGS.merge(e.getKey(), e.getValue(), Integer::sum);
            }
        }
        StringBuilder sb = new StringBuilder("{\"id\": ");
        str(sb, finalId);
        sb.append(", \"group\": \"").append(finalGroup).append("\", \"input\": ").append(input).append(", \"expected\": ")
                .append(viaImport.json).append('}');
        return new Row(finalId, finalGroup, sb.toString());
    }

    // ------------------------------------------------------------------------------------------------------------
    // Runs

    static Outcome run(ElkNode root, boolean direct, boolean stops) {
        String mode = direct ? MODE_PROVIDER : MODE_ENGINE;
        try {
            if (!stops) {
                drive(root, direct, new BasicProgressMonitor());
                return new Outcome(false, "{\"layoutNode\": \"" + ROOT_ID + "\", \"mode\": \"" + mode + "\", " + dumpBody(root) + "}",
                        Map.of());
            }
            return runStops(root, direct, mode);
        } catch (RuntimeException e) {
            Throwable cause = rootCause(e);
            StackTraceElement frame = elkFrame(cause);
            if (e instanceof Bug || frame == null) {
                throw e;
            }
            StringBuilder sb = new StringBuilder("{\"layoutNode\": \"" + ROOT_ID + "\", \"mode\": \"" + mode
                    + "\", \"throws\": {\"class\": ");
            str(sb, cause.getClass().getName());
            sb.append(", \"message\": ");
            str(sb, cause.getMessage());
            sb.append(", \"frame\": ");
            str(sb, frame.getFileName() + ":" + frame.getLineNumber());
            sb.append("}}");
            return new Outcome(true, sb.toString(), Map.of());
        }
    }

    static void drive(ElkNode root, boolean direct, org.eclipse.elk.core.util.IElkProgressMonitor monitor) {
        if (direct) {
            RectPackingLayoutProvider provider = new RectPackingLayoutProvider();
            provider.initialize("");
            provider.layout(root, monitor);
        } else {
            new RecursiveGraphLayoutEngine().layout(root, monitor);
        }
    }

    static Throwable rootCause(Throwable t) {
        Throwable c = t;
        while (c.getCause() != null && c.getCause() != c) {
            c = c.getCause();
        }
        return c;
    }

    /** The innermost org.eclipse.elk frame of the throwable (before any frame of this program), or null. */
    static StackTraceElement elkFrame(Throwable e) {
        for (StackTraceElement f : e.getStackTrace()) {
            if (f.getClassName().startsWith("RectPackingVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------------------------------------------------
    // The recording monitor

    /** A progress monitor with logging on that hands every logGraph(ElkNode, tag) of the provider loop to the recorder. */
    static final class Rec extends BasicProgressMonitor {
        final Recorder rec;

        Rec(Recorder rec) {
            this.rec = rec;
            withLogging(true);
        }

        @Override
        protected BasicProgressMonitor doSubTask(float work, int maxHierarchyLevels) {
            return new Rec(rec);
        }

        @Override
        public void logGraph(ElkNode graph, String tag) {
            rec.event(graph, tag);
        }
    }

    static final class Entry {
        final String graph;
        final List<String> processors = new ArrayList<>();
        final List<String> stops = new ArrayList<>();
        String last;

        Entry(String graph) {
            this.graph = graph;
        }
    }

    static final class Recorder {
        final Map<String, Entry> graphs = new LinkedHashMap<>();
        final Map<String, Integer> flags = new TreeMap<>();

        void event(ElkNode g, String tag) {
            Matcher m = BEFORE.matcher(tag);
            if (m.matches()) {
                Entry e = graphs.computeIfAbsent(id(g), Entry::new);
                int k = parseIntArg("processor index", m.group(1));
                String name = m.group(2);
                if (k != e.processors.size()) {
                    throw new Bug("processor index " + k + " out of order on " + e.graph);
                }
                e.stops.add(stop(k == 0 ? "begin" : "after:" + e.last, g, e.last));
                e.processors.add(name);
                e.last = name;
                flags.merge("proc:" + name, 1, Integer::sum);
            } else if (FINISHED.matcher(tag).matches()) {
                Entry e = graphs.get(id(g));
                e.stops.add(stop("after:" + e.last, g, e.last));
            } else if (tag.equals("Output")) {
                graphs.get(id(g)).stops.add(stop("end", g, null));
            } else {
                flags.merge("log:" + tag.replaceAll("\\d+", "N"), 1, Integer::sum);
            }
        }

        String stop(String name, ElkNode g, String previous) {
            return "{\"stop\": " + q(name) + ", \"state\": {" + stateBody(g, previous, flags) + "}}";
        }
    }

    static Outcome runStops(ElkNode root, boolean direct, String mode) {
        String inputJson = export(root);
        Recorder rec = new Recorder();
        drive(root, direct, new Rec(rec));
        String finalBody = dumpBody(root);
        ElkNode copy = ElkGraphJson.forGraph(inputJson).toElk();
        drive(copy, direct, new BasicProgressMonitor());
        if (!finalBody.equals(dumpBody(copy))) {
            throw new Bug("the recording run differs from a plain run:\n" + finalBody + "\n" + dumpBody(copy));
        }
        List<String> gs = new ArrayList<>();
        for (Entry e : rec.graphs.values()) {
            List<String> procs = new ArrayList<>();
            e.processors.forEach(p -> procs.add(q(p)));
            gs.add("{\"graph\": " + q(e.graph) + ", \"processors\": " + list(procs) + ", \"stops\": [\n" + String.join(",\n", e.stops)
                    + "\n]}");
        }
        if (rec.graphs.isEmpty()) {
            rec.flags.put("box", 1);
        }
        String json = "{\"layoutNode\": \"" + ROOT_ID + "\", \"mode\": \"" + mode + "\", \"graphs\": [\n" + String.join(",\n", gs)
                + "\n], \"flags\": " + flagsJson(rec.flags) + ", \"final\": {" + finalBody + "}}";
        return new Outcome(false, json.replace("\n", ""), rec.flags);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Dumps

    static String dumpBody(ElkNode top) {
        Dump d = new Dump();
        d.run(top);
        return d.body();
    }

    static final class Dump {
        String graph;
        final List<String> nodes = new ArrayList<>(), ports = new ArrayList<>(), labels = new ArrayList<>(), extras = new ArrayList<>();
        final Set<String> seen = new HashSet<>();

        void run(ElkNode top) {
            graph = box(unique(id(top)), top.getX(), top.getY(), top.getWidth(), top.getHeight());
            labels(top.getLabels());
            ports(top);
            visit(top);
        }

        String body() {
            return "\"graph\": " + graph + ", \"nodes\": " + list(nodes) + ", \"ports\": " + list(ports) + ", \"labels\": "
                    + list(labels) + ", \"extras\": " + list(extras);
        }

        String unique(String id) {
            if (!seen.add(id)) {
                throw new Bug("duplicate element id " + id);
            }
            return id;
        }

        void ports(ElkNode n) {
            for (ElkPort p : n.getPorts()) {
                String pid = unique(id(p));
                ports.add(box(pid, p.getX(), p.getY(), p.getWidth(), p.getHeight()));
                labels(p.getLabels());
            }
        }

        void visit(ElkNode parent) {
            if (!parent.getContainedEdges().isEmpty()) {
                throw new Bug("graphs with edges are not recorded: " + parent.getIdentifier());
            }
            for (ElkNode n : parent.getChildren()) {
                String nid = unique(id(n));
                nodes.add(box(nid, n.getX(), n.getY(), n.getWidth(), n.getHeight()));
                if (n.hasProperty(RectPackingOptions.CURRENT_POSITION) || n.hasProperty(CoreOptions.PRIORITY)) {
                    extras.add("{\"id\": " + q(nid) + ", \"currentPosition\": "
                            + (n.hasProperty(RectPackingOptions.CURRENT_POSITION) ? String.valueOf(n.getProperty(RectPackingOptions.CURRENT_POSITION))
                                    : "null")
                            + ", \"priority\": "
                            + (n.hasProperty(CoreOptions.PRIORITY) ? String.valueOf(n.getProperty(CoreOptions.PRIORITY)) : "null") + "}");
                }
                labels(n.getLabels());
                ports(n);
                visit(n);
            }
        }

        void labels(List<ElkLabel> ls) {
            for (ElkLabel l : ls) {
                String lid = unique(id(l));
                labels.add(box(lid, l.getX(), l.getY(), l.getWidth(), l.getHeight()));
                labels(l.getLabels());
            }
        }
    }

    static String stateBody(ElkNode g, String previous, Map<String, Integer> flags) {
        StringBuilder sb = new StringBuilder(dumpBody(g));
        sb.append(", \"props\": {\"additionalHeight\": ").append(dprop(g, InternalProperties.ADDITIONAL_HEIGHT))
                .append(", \"drawingHeight\": ").append(dprop(g, InternalProperties.DRAWING_HEIGHT))
                .append(", \"drawingWidth\": ").append(dprop(g, InternalProperties.DRAWING_WIDTH))
                .append(", \"minHeight\": ").append(dprop(g, InternalProperties.MIN_HEIGHT))
                .append(", \"minWidth\": ").append(dprop(g, InternalProperties.MIN_WIDTH))
                .append(", \"targetWidth\": ").append(dprop(g, InternalProperties.TARGET_WIDTH))
                .append(", \"minRowIncrease\": ").append(dprop(g, InternalProperties.MIN_ROW_INCREASE))
                .append(", \"maxRowIncrease\": ").append(dprop(g, InternalProperties.MAX_ROW_INCREASE))
                .append(", \"minRowDecrease\": ").append(dprop(g, InternalProperties.MIN_ROW_DECREASE))
                .append(", \"maxRowDecrease\": ").append(dprop(g, InternalProperties.MAX_ROW_DECREASE)).append('}');
        sb.append(", \"padding\": ").append(explicitPadding(g));
        sb.append(", \"rows\": ").append(g.hasProperty(InternalProperties.ROWS) ? rowsJson(g.getProperty(InternalProperties.ROWS), flags) : "null");
        if ("GreedyWidthApproximator".equals(previous)) {
            sb.append(", \"drawing\": ").append(drawingJson(g));
        }
        return sb.toString();
    }

    static String dprop(ElkNode g, IProperty<Double> p) {
        return g.hasProperty(p) ? hex(g.getProperty(p)) : "null";
    }

    /** The stored padding without getProperty (which would store a copy of the default on the element). */
    static String explicitPadding(ElkNode g) {
        for (Map.Entry<IProperty<?>, Object> e : g.getAllProperties().entrySet()) {
            if (e.getKey().getId().equals(CoreOptions.PADDING.getId())) {
                return e.getValue() instanceof ElkPadding p ? padding(p) : "null";
            }
        }
        return "null";
    }

    /** Re-runs the first iteration on the live graph (the Greedy processor discards its DrawingData); the nodes must not move. */
    static String drawingJson(ElkNode g) {
        List<ElkNode> rects = g.getChildren();
        long[] before = positions(rects);
        AreaApproximation a = new AreaApproximation(g.getProperty(RectPackingOptions.ASPECT_RATIO),
                g.getProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL),
                g.getProperty(RectPackingOptions.WIDTH_APPROXIMATION_LAST_PLACE_SHIFT));
        DrawingData d = a.approxBoundingBox(rects, g.getProperty(RectPackingOptions.SPACING_NODE_NODE),
                g.getProperty(RectPackingOptions.PADDING));
        if (!Arrays.equals(before, positions(rects))) {
            throw new Bug("the re-run of AreaApproximation moved a node of " + g.getIdentifier());
        }
        return "{\"dar\": " + hex(d.getDesiredAspectRatio()) + ", \"drawingWidth\": " + hex(d.getDrawingWidth())
                + ", \"drawingHeight\": " + hex(d.getDrawingHeight()) + ", \"scaleMeasure\": " + hex(d.getScaleMeasure())
                + ", \"area\": " + hex(d.getArea()) + ", \"aspectRatio\": " + hex(d.getAspectRatio()) + ", \"placementOption\": "
                + q(d.getPlacementOption().name()) + ", \"nextX\": " + hex(d.getNextXcoordinate()) + ", \"nextY\": "
                + hex(d.getNextYcoordinate()) + "}";
    }

    static long[] positions(List<ElkNode> rects) {
        long[] r = new long[rects.size() * 2];
        for (int i = 0; i < rects.size(); i++) {
            r[2 * i] = Double.doubleToRawLongBits(rects.get(i).getX());
            r[2 * i + 1] = Double.doubleToRawLongBits(rects.get(i).getY());
        }
        return r;
    }

    // ---- the RectRow object graph

    @SuppressWarnings("unchecked")
    static <T> T field(Object target, String name) {
        try {
            Field f = target.getClass().getDeclaredField(name);
            f.setAccessible(true);
            return (T) f.get(target);
        } catch (ReflectiveOperationException e) {
            throw new Bug("reflection " + target.getClass().getSimpleName() + "." + name + ": " + e);
        }
    }

    static <T> int register(T o, IdentityHashMap<T, Integer> idx, List<T> list) {
        Integer i = idx.get(o);
        if (i == null) {
            i = list.size();
            idx.put(o, i);
            list.add(o);
        }
        return i;
    }

    static String rowsJson(List<RectRow> rows, Map<String, Integer> flags) {
        List<RectRow> allRows = new ArrayList<>();
        IdentityHashMap<RectRow, Integer> ri = new IdentityHashMap<>();
        List<Block> blocks = new ArrayList<>();
        IdentityHashMap<Block, Integer> bi = new IdentityHashMap<>();
        List<BlockStack> stacks = new ArrayList<>();
        IdentityHashMap<BlockStack, Integer> si = new IdentityHashMap<>();
        for (RectRow r : rows) {
            register(r, ri, allRows);
        }
        int rp = 0, bp = 0, sp = 0;
        while (rp < allRows.size() || bp < blocks.size() || sp < stacks.size()) {
            while (rp < allRows.size()) {
                RectRow r = allRows.get(rp++);
                r.getChildren().forEach(b -> register(b, bi, blocks));
                r.getStacks().forEach(s -> register(s, si, stacks));
            }
            while (bp < blocks.size()) {
                Block b = blocks.get(bp++);
                register(b.getParentRow(), ri, allRows);
                if (b.getStack() != null) {
                    register(b.getStack(), si, stacks);
                }
            }
            while (sp < stacks.size()) {
                BlockStack s = stacks.get(sp++);
                s.getBlocks().forEach(b -> register(b, bi, blocks));
            }
        }
        List<String> rj = new ArrayList<>(), sj = new ArrayList<>(), bj = new ArrayList<>();
        for (RectRow r : allRows) {
            List<String> bl = new ArrayList<>(), st = new ArrayList<>();
            r.getChildren().forEach(b -> bl.add(String.valueOf(bi.get(b))));
            r.getStacks().forEach(s -> st.add(String.valueOf(si.get(s))));
            rj.add("{\"y\": " + hex(r.getY()) + ", \"width\": " + hex(r.getWidth()) + ", \"height\": " + hex(r.getHeight())
                    + ", \"spacing\": " + hex(field(r, "nodeNodeSpacing")) + ", \"potentialAdditionalWidth\": "
                    + hex(r.getPotentialAdditionalWidthToGetLastBlock()) + ", \"blocks\": " + list(bl) + ", \"stacks\": " + list(st)
                    + "}");
        }
        for (BlockStack s : stacks) {
            List<String> bl = new ArrayList<>();
            s.getBlocks().forEach(b -> bl.add(String.valueOf(bi.get(b))));
            if (s.getBlocks().size() > 1) {
                flags.merge("blocksInStack>1", 1, Integer::sum);
            }
            sj.add("{\"x\": " + hex(s.getX()) + ", \"y\": " + hex(s.getY()) + ", \"width\": " + hex(s.getWidth()) + ", \"height\": "
                    + hex(s.getHeight()) + ", \"spacing\": " + hex(field(s, "nodeNodeSpacing")) + ", \"blocks\": " + list(bl) + "}");
        }
        for (Block b : blocks) {
            bj.add(blockJson(b, ri, si));
            if (b.getRows().size() > 1) {
                flags.merge("blockRows>1", 1, Integer::sum);
            }
        }
        if (rows.size() > 1) {
            flags.merge("rows>1", 1, Integer::sum);
        }
        if (stacks.size() > 1) {
            flags.merge("stacks>1", 1, Integer::sum);
        }
        if (allRows.size() > rows.size()) {
            flags.merge("detachedRows", 1, Integer::sum);
        }
        return "{\"listSize\": " + rows.size() + ", \"rows\": " + list(rj) + ", \"blocks\": " + list(bj) + ", \"stacks\": " + list(sj)
                + "}";
    }

    static String blockJson(Block b, IdentityHashMap<RectRow, Integer> ri, IdentityHashMap<BlockStack, Integer> si) {
        List<String> ch = new ArrayList<>(), brs = new ArrayList<>();
        b.getChildren().forEach(n -> ch.add(q(id(n))));
        for (BlockRow r : b.getRows()) {
            List<String> rects = new ArrayList<>();
            r.getNodes().forEach(n -> rects.add(q(id(n))));
            brs.add("{\"x\": " + hex(r.getX()) + ", \"y\": " + hex(r.getY()) + ", \"width\": " + hex(r.getWidth()) + ", \"height\": "
                    + hex(r.getHeight()) + ", \"spacing\": " + hex(field(r, "nodeNodeSpacing")) + ", \"rects\": " + list(rects) + "}");
        }
        return "{\"x\": " + hex(b.getX()) + ", \"y\": " + hex(b.getY()) + ", \"width\": " + hex(b.getWidth()) + ", \"height\": "
                + hex(b.getHeight()) + ", \"minWidth\": " + hex(b.getMinWidth()) + ", \"minHeight\": " + hex(b.getMinHeight())
                + ", \"smallestRectWidth\": " + hex(b.getSmallestRectWidth()) + ", \"smallestRectHeight\": "
                + hex(b.getSmallestRectHeight()) + ", \"averageHeight\": " + hex(b.getAverageHeight()) + ", \"maxHeight\": "
                + hex(b.getMaxHeight()) + ", \"spacing\": " + hex(field(b, "nodeNodeSpacing")) + ", \"fixed\": " + b.isFixed()
                + ", \"positionFixed\": " + b.isPositionFixed() + ", \"parentRow\": " + ri.get(b.getParentRow()) + ", \"stack\": "
                + (b.getStack() == null ? "null" : String.valueOf(si.get(b.getStack()))) + ", \"children\": " + list(ch)
                + ", \"rows\": " + list(brs) + "}";
    }

    static String id(ElkGraphElement e) {
        String id = e.getIdentifier();
        if (id == null || id.isEmpty()) {
            throw new Bug("element without identifier: " + e);
        }
        return id;
    }

    static String box(String id, double x, double y, double w, double h) {
        return "{\"id\": " + q(id) + ", \"x\": " + hex(x) + ", \"y\": " + hex(y) + ", \"w\": " + hex(w) + ", \"h\": " + hex(h) + "}";
    }

    static String padding(ElkPadding p) {
        return "[" + hex(p.top) + ", " + hex(p.right) + ", " + hex(p.bottom) + ", " + hex(p.left) + "]";
    }

    static String list(Collection<String> items) {
        return "[" + String.join(", ", items) + "]";
    }

    // ------------------------------------------------------------------------------------------------------------
    // Coverage

    static final Map<String, Map<String, int[]>> COVERAGE = new TreeMap<>();

    record Opt(String name, IProperty<?> p) { }

    static final List<Opt> GRAPH_OPTS = List.of(new Opt("aspectRatio", RectPackingOptions.ASPECT_RATIO),
            new Opt("padding", RectPackingOptions.PADDING), new Opt("spacing.nodeNode", RectPackingOptions.SPACING_NODE_NODE),
            new Opt("nodeSize.fixedGraphSize", RectPackingOptions.NODE_SIZE_FIXED_GRAPH_SIZE),
            new Opt("contentAlignment", RectPackingOptions.CONTENT_ALIGNMENT),
            new Opt("nodeSize.constraints", RectPackingOptions.NODE_SIZE_CONSTRAINTS),
            new Opt("nodeSize.minimum", RectPackingOptions.NODE_SIZE_MINIMUM),
            new Opt("nodeSize.options", RectPackingOptions.NODE_SIZE_OPTIONS),
            new Opt("nodeLabels.placement", RectPackingOptions.NODE_LABELS_PLACEMENT),
            new Opt("omitNodeMicroLayout", RectPackingOptions.OMIT_NODE_MICRO_LAYOUT),
            new Opt("portLabels.placement", RectPackingOptions.PORT_LABELS_PLACEMENT),
            new Opt("widthApproximation.optimizationGoal", RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL),
            new Opt("widthApproximation.lastPlaceShift", RectPackingOptions.WIDTH_APPROXIMATION_LAST_PLACE_SHIFT),
            new Opt("widthApproximation.targetWidth", RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH),
            new Opt("widthApproximation.strategy", RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY),
            new Opt("packing.strategy", RectPackingOptions.PACKING_STRATEGY),
            new Opt("packing.compaction.rowHeightReevaluation", RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION),
            new Opt("packing.compaction.iterations", RectPackingOptions.PACKING_COMPACTION_ITERATIONS),
            new Opt("whiteSpaceElimination.strategy", RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY),
            new Opt("interactive", RectPackingOptions.INTERACTIVE), new Opt("interactiveLayout", RectPackingOptions.INTERACTIVE_LAYOUT),
            new Opt("trybox", RectPackingOptions.TRYBOX), new Opt("orderBySize", RectPackingOptions.ORDER_BY_SIZE));

    static final List<Opt> NODE_OPTS = List.of(new Opt("desiredPosition", RectPackingOptions.DESIRED_POSITION),
            new Opt("currentPosition", RectPackingOptions.CURRENT_POSITION), new Opt("inNewRow", RectPackingOptions.IN_NEW_ROW),
            new Opt("nodeSize.constraints", RectPackingOptions.NODE_SIZE_CONSTRAINTS),
            new Opt("nodeSize.minimum", RectPackingOptions.NODE_SIZE_MINIMUM),
            new Opt("nodeSize.options", RectPackingOptions.NODE_SIZE_OPTIONS),
            new Opt("nodeLabels.placement", RectPackingOptions.NODE_LABELS_PLACEMENT),
            new Opt("portLabels.placement", RectPackingOptions.PORT_LABELS_PLACEMENT));

    static void countCoverage(String group, ElkNode root) {
        for (ElkNode l : layouts(root)) {
            for (Opt o : GRAPH_OPTS) {
                cover(o.name, valueStr(l, o.p), group);
            }
            for (ElkNode c : l.getChildren()) {
                for (Opt o : NODE_OPTS) {
                    if (c.hasProperty(o.p)) {
                        cover(o.name + "@nodes", valueStr(c, o.p), group);
                    }
                }
            }
        }
    }

    static String valueStr(ElkNode n, IProperty<?> p) {
        return n.hasProperty(p) ? String.valueOf(n.getProperty(p)) : "unset";
    }

    static void cover(String option, String value, String group) {
        int[] c = COVERAGE.computeIfAbsent(option, k -> new TreeMap<>()).computeIfAbsent(value, k -> new int[GROUPS.size()]);
        c[GROUPS.indexOf(group)]++;
    }

    static int fullCount(String option, String value) {
        Map<String, int[]> m = COVERAGE.get(option);
        return m == null || m.get(value) == null ? 0 : m.get(value)[0];
    }

    /** Every enum or boolean value of RectPacking.melk (and every constant of the common enums) must be exercised by a full row. */
    static void requireCoverage() {
        List<String> missing = new ArrayList<>();
        Map<String, List<String>> need = new LinkedHashMap<>();
        need.put("widthApproximation.strategy", names(WidthApproximationStrategy.values()));
        need.put("widthApproximation.optimizationGoal", names(OptimizationGoal.values()));
        need.put("widthApproximation.lastPlaceShift", List.of("true", "false"));
        need.put("packing.strategy", names(PackingStrategy.values()));
        need.put("packing.compaction.rowHeightReevaluation", List.of("true", "false"));
        need.put("packing.compaction.iterations", List.of("1", "2", "3"));
        need.put("whiteSpaceElimination.strategy", names(WhiteSpaceEliminationStrategy.values()));
        need.put("trybox", List.of("true", "false"));
        need.put("orderBySize", List.of("true", "false"));
        need.put("interactive", List.of("true", "false"));
        need.put("interactiveLayout", List.of("true", "false"));
        need.put("nodeSize.fixedGraphSize", List.of("true", "false"));
        need.put("omitNodeMicroLayout", List.of("true", "false"));
        need.put("inNewRow@nodes", List.of("true", "false"));
        for (String suffix : List.of("", "@nodes")) {
            need.put("nodeSize.constraints" + suffix, singles(SizeConstraint.values()));
            need.put("nodeSize.options" + suffix, singles(SizeOptions.values()));
            need.put("nodeLabels.placement" + suffix, singles(NodeLabelPlacement.values()));
            need.put("portLabels.placement" + suffix, singles(PortLabelPlacement.values()));
        }
        need.put("contentAlignment", singles(ContentAlignment.values()));
        for (Map.Entry<String, List<String>> e : need.entrySet()) {
            for (String v : e.getValue()) {
                if (fullCount(e.getKey(), v) == 0) {
                    missing.add(e.getKey() + "=" + v);
                }
            }
        }
        for (String o : List.of("aspectRatio", "padding", "spacing.nodeNode", "widthApproximation.targetWidth", "nodeSize.minimum",
                "desiredPosition@nodes", "currentPosition@nodes", "nodeSize.minimum@nodes")) {
            Map<String, int[]> m = COVERAGE.get(o);
            long n = m == null ? 0 : m.entrySet().stream().filter(x -> !x.getKey().equals("unset") && x.getValue()[0] > 0).count();
            if (n == 0) {
                missing.add(o + " (a set value)");
            }
        }
        if (!missing.isEmpty()) {
            throw new Bug("option values without a full row: " + missing);
        }
    }

    static List<String> names(Enum<?>[] values) {
        List<String> r = new ArrayList<>();
        for (Enum<?> e : values) {
            r.add(e.name());
        }
        return r;
    }

    static List<String> singles(Enum<?>[] values) {
        List<String> r = new ArrayList<>();
        for (Enum<?> e : values) {
            r.add("[" + e.name() + "]");
        }
        return r;
    }

    static String coverageJson() {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Map<String, int[]>> e : COVERAGE.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append(q(e.getKey())).append(": {");
            int j = 0;
            for (Map.Entry<String, int[]> v : e.getValue().entrySet()) {
                int[] c = v.getValue();
                sb.append(j++ == 0 ? "" : ", ").append(q(v.getKey())).append(": {\"full\": ").append(c[0]).append(", \"stops\": ")
                        .append(c[1]).append(", \"throws\": ").append(c[2]).append('}');
            }
            sb.append('}');
        }
        return sb.append('}').toString();
    }

    static String flagsJson(Map<String, Integer> flags) {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Integer> e : flags.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append(q(e.getKey())).append(": ").append(e.getValue());
        }
        return sb.append('}').toString();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Factors (one at a time) applied to every layout node

    interface Kid {
        void on(ElkNode child, int index, int count);
    }

    static Consumer<ElkNode> kids(Kid k) {
        return g -> {
            int i = 0;
            int n = g.getChildren().size();
            for (ElkNode c : g.getChildren()) {
                k.on(c, i++, n);
            }
        };
    }

    static String tag(double d) {
        return String.valueOf(d).replace('.', '_').replace('-', 'm');
    }

    static void add(List<Factor> l, String id, boolean stops, boolean micro, Consumer<ElkNode> a) {
        l.add(new Factor(id, a, micro, stops));
    }

    static List<Factor> factors() {
        List<Factor> f = new ArrayList<>();
        add(f, "default", true, false, g -> { });
        // aspect ratio, padding, spacing, graph size
        for (double a : new double[] {0.5, 1.0, 1.3, 2.0, 3.7}) {
            add(f, "aspect" + tag(a), a == 0.5 || a == 2.0, false, g -> g.setProperty(RectPackingOptions.ASPECT_RATIO, a));
        }
        add(f, "padding0", false, false, g -> g.setProperty(RectPackingOptions.PADDING, new ElkPadding(0)));
        add(f, "padding2_7_11_13", true, false, g -> g.setProperty(RectPackingOptions.PADDING, new ElkPadding(2, 7, 11, 13)));
        for (double s : new double[] {0, 5, 30}) {
            add(f, "spacing" + tag(s), s == 0 || s == 30, false, g -> g.setProperty(RectPackingOptions.SPACING_NODE_NODE, s));
        }
        add(f, "fixedGraphSizeTrue", true, false, g -> g.setProperty(RectPackingOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true));
        add(f, "fixedGraphSizeFalse", false, false, g -> g.setProperty(RectPackingOptions.NODE_SIZE_FIXED_GRAPH_SIZE, false));
        // width approximation
        for (OptimizationGoal v : OptimizationGoal.values()) {
            add(f, "goal" + v.name(), true, false,
                    g -> g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL, v));
        }
        add(f, "lastPlaceShiftFalse", true, false,
                g -> g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_LAST_PLACE_SHIFT, false));
        add(f, "lastPlaceShiftTrue", false, false,
                g -> g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_LAST_PLACE_SHIFT, true));
        add(f, "strategyGreedy", false, false,
                g -> g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.GREEDY));
        for (double w : new double[] {5, 60, 150, 400}) {
            add(f, "targetWidth" + tag(w), w == 150, false, g -> {
                g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
                g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, w);
            });
        }
        add(f, "targetWidthIgnored150", false, false, g -> g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 150.0));
        // packing
        for (PackingStrategy v : PackingStrategy.values()) {
            add(f, "packing" + v.name(), true, false, g -> g.setProperty(RectPackingOptions.PACKING_STRATEGY, v));
        }
        add(f, "rowHeightReevaluationTrue", true, false,
                g -> g.setProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION, true));
        add(f, "rowHeightReevaluationFalse", false, false,
                g -> g.setProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION, false));
        for (int n : new int[] {0, 1, 2, 3, 6}) {
            add(f, "iterations" + n, n == 2 || n == 3, false, g -> g.setProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS, n));
        }
        // whitespace elimination
        for (WhiteSpaceEliminationStrategy v : WhiteSpaceEliminationStrategy.values()) {
            add(f, "whitespace" + v.name(), true, false, g -> g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, v));
        }
        // flags on the graph
        add(f, "trybox", true, false, g -> g.setProperty(RectPackingOptions.TRYBOX, true));
        add(f, "tryboxFalse", false, false, g -> g.setProperty(RectPackingOptions.TRYBOX, false));
        add(f, "orderBySize", true, false, g -> g.setProperty(RectPackingOptions.ORDER_BY_SIZE, true));
        add(f, "orderBySizeFalse", false, false, g -> g.setProperty(RectPackingOptions.ORDER_BY_SIZE, false));
        add(f, "interactive", true, false, g -> g.setProperty(RectPackingOptions.INTERACTIVE, true));
        add(f, "interactiveFalse", false, false, g -> g.setProperty(RectPackingOptions.INTERACTIVE, false));
        add(f, "interactiveLayout", true, false, g -> g.setProperty(RectPackingOptions.INTERACTIVE_LAYOUT, true));
        add(f, "interactiveLayoutFalse", false, false, g -> g.setProperty(RectPackingOptions.INTERACTIVE_LAYOUT, false));
        // node options
        add(f, "desiredTies", true, false, kids((c, i, n) -> c.setProperty(RectPackingOptions.DESIRED_POSITION, i % 3)));
        add(f, "interactiveDesiredTies", true, false, g -> {
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            kids((c, i, n) -> c.setProperty(RectPackingOptions.DESIRED_POSITION, i % 3)).accept(g);
        });
        add(f, "interactiveDesiredReverse", true, false, g -> {
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            kids((c, i, n) -> c.setProperty(RectPackingOptions.DESIRED_POSITION, n - 1 - i)).accept(g);
        });
        add(f, "interactiveDesiredBeyond", true, false, g -> {
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            kids((c, i, n) -> c.setProperty(RectPackingOptions.DESIRED_POSITION, 100 + i)).accept(g);
        });
        add(f, "interactiveDesiredSome", true, false, g -> {
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            kids((c, i, n) -> {
                if (i % 3 == 0) {
                    c.setProperty(RectPackingOptions.DESIRED_POSITION, (i / 3) % 2);
                }
            }).accept(g);
        });
        add(f, "interactiveDesiredZero", false, false, g -> {
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            kids((c, i, n) -> c.setProperty(RectPackingOptions.DESIRED_POSITION, 0)).accept(g);
        });
        add(f, "interactiveNoDesired", false, false, g -> g.setProperty(RectPackingOptions.INTERACTIVE, true));
        add(f, "desiredReverseNoInteractive", false, false,
                kids((c, i, n) -> c.setProperty(RectPackingOptions.DESIRED_POSITION, n - 1 - i)));
        add(f, "inNewRowThird", true, false, kids((c, i, n) -> c.setProperty(RectPackingOptions.IN_NEW_ROW, i % 3 == 2)));
        add(f, "inNewRowAll", false, false, kids((c, i, n) -> c.setProperty(RectPackingOptions.IN_NEW_ROW, true)));
        add(f, "inNewRowNone", false, false, kids((c, i, n) -> c.setProperty(RectPackingOptions.IN_NEW_ROW, false)));
        add(f, "currentPosition99", false, false, kids((c, i, n) -> c.setProperty(RectPackingOptions.CURRENT_POSITION, 99)));
        add(f, "interactiveCurrentPosition99", false, false, g -> {
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            kids((c, i, n) -> c.setProperty(RectPackingOptions.CURRENT_POSITION, 99)).accept(g);
        });
        // common options read by the micro layout and the size computation: at the graph and at the nodes
        add(f, "omitNodeMicroLayoutTrue", false, true, g -> g.setProperty(RectPackingOptions.OMIT_NODE_MICRO_LAYOUT, true));
        add(f, "omitNodeMicroLayoutFalse", false, true, g -> g.setProperty(RectPackingOptions.OMIT_NODE_MICRO_LAYOUT, false));
        micro(f);
        combined(f);
        return f;
    }

    static void micro(List<Factor> f) {
        for (ContentAlignment v : ContentAlignment.values()) {
            add(f, "contentAlignment" + v.name(), false, false, g -> g.setProperty(RectPackingOptions.CONTENT_ALIGNMENT, EnumSet.of(v)));
        }
        add(f, "contentAlignmentCenter", false, false, g -> g.setProperty(RectPackingOptions.CONTENT_ALIGNMENT,
                EnumSet.of(ContentAlignment.H_CENTER, ContentAlignment.V_CENTER)));
        add(f, "contentAlignmentRightBottom", false, false, g -> g.setProperty(RectPackingOptions.CONTENT_ALIGNMENT,
                EnumSet.of(ContentAlignment.H_RIGHT, ContentAlignment.V_BOTTOM)));
        for (SizeConstraint v : SizeConstraint.values()) {
            add(f, "constraints" + v.name() + "@graph", false, true,
                    g -> g.setProperty(RectPackingOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(v)));
            add(f, "constraints" + v.name() + "@nodes", false, true,
                    kids((c, i, n) -> c.setProperty(RectPackingOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(v))));
        }
        add(f, "constraintsAll@nodes", false, true,
                kids((c, i, n) -> c.setProperty(RectPackingOptions.NODE_SIZE_CONSTRAINTS, EnumSet.allOf(SizeConstraint.class))));
        add(f, "minimum@graph", false, true, g -> g.setProperty(RectPackingOptions.NODE_SIZE_MINIMUM, new KVector(400, 300)));
        add(f, "minimum@nodes", false, true,
                kids((c, i, n) -> c.setProperty(RectPackingOptions.NODE_SIZE_MINIMUM, new KVector(80, 60))));
        add(f, "minimumWithConstraint@graph", false, true, g -> {
            g.setProperty(RectPackingOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.MINIMUM_SIZE));
            g.setProperty(RectPackingOptions.NODE_SIZE_MINIMUM, new KVector(400, 300));
        });
        add(f, "minimumWithConstraintSmall@graph", false, true, g -> {
            g.setProperty(RectPackingOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.MINIMUM_SIZE));
            g.setProperty(RectPackingOptions.NODE_SIZE_MINIMUM, new KVector(10, 10));
        });
        add(f, "minimumWithConstraint@nodes", false, true, kids((c, i, n) -> {
            c.setProperty(RectPackingOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.MINIMUM_SIZE));
            c.setProperty(RectPackingOptions.NODE_SIZE_MINIMUM, new KVector(80, 60));
        }));
        for (SizeOptions v : SizeOptions.values()) {
            add(f, "sizeOptions" + v.name() + "@graph", false, true,
                    g -> g.setProperty(RectPackingOptions.NODE_SIZE_OPTIONS, EnumSet.of(v)));
            add(f, "sizeOptions" + v.name() + "@nodes", false, true,
                    kids((c, i, n) -> c.setProperty(RectPackingOptions.NODE_SIZE_OPTIONS, EnumSet.of(v))));
        }
        for (NodeLabelPlacement v : NodeLabelPlacement.values()) {
            add(f, "nodeLabels" + v.name() + "@graph", false, true,
                    g -> g.setProperty(RectPackingOptions.NODE_LABELS_PLACEMENT, EnumSet.of(v)));
            add(f, "nodeLabels" + v.name() + "@nodes", false, true,
                    kids((c, i, n) -> c.setProperty(RectPackingOptions.NODE_LABELS_PLACEMENT, EnumSet.of(v))));
        }
        for (PortLabelPlacement v : PortLabelPlacement.values()) {
            add(f, "portLabels" + v.name() + "@graph", false, true,
                    g -> g.setProperty(RectPackingOptions.PORT_LABELS_PLACEMENT, EnumSet.of(v)));
            add(f, "portLabels" + v.name() + "@nodes", false, true,
                    kids((c, i, n) -> c.setProperty(RectPackingOptions.PORT_LABELS_PLACEMENT, EnumSet.of(v))));
        }
        add(f, "microAll@nodes", false, true, kids((c, i, n) -> {
            c.setProperty(RectPackingOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORTS, SizeConstraint.PORT_LABELS,
                    SizeConstraint.NODE_LABELS, SizeConstraint.MINIMUM_SIZE));
            c.setProperty(RectPackingOptions.NODE_LABELS_PLACEMENT,
                    EnumSet.of(NodeLabelPlacement.INSIDE, NodeLabelPlacement.H_CENTER, NodeLabelPlacement.V_TOP));
            c.setProperty(RectPackingOptions.PORT_LABELS_PLACEMENT, EnumSet.of(PortLabelPlacement.OUTSIDE));
            c.setProperty(RectPackingOptions.NODE_SIZE_MINIMUM, new KVector(50, 40));
        }));
    }

    static void combined(List<Factor> f) {
        add(f, "comboSimpleEqual", true, false, g -> {
            g.setProperty(RectPackingOptions.PACKING_STRATEGY, PackingStrategy.SIMPLE);
            g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES);
        });
        add(f, "comboSimpleToAspect", false, false, g -> {
            g.setProperty(RectPackingOptions.PACKING_STRATEGY, PackingStrategy.SIMPLE);
            g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, WhiteSpaceEliminationStrategy.TO_ASPECT_RATIO);
            g.setProperty(RectPackingOptions.ASPECT_RATIO, 2.5);
        });
        add(f, "comboTargetIterationsToAspect", true, false, g -> {
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 120.0);
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS, 3);
            g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, WhiteSpaceEliminationStrategy.TO_ASPECT_RATIO);
        });
        add(f, "comboOrderInteractive", true, false, g -> {
            g.setProperty(RectPackingOptions.ORDER_BY_SIZE, true);
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            kids((c, i, n) -> {
                if (i % 2 == 0) {
                    c.setProperty(RectPackingOptions.DESIRED_POSITION, i % 4);
                }
            }).accept(g);
        });
        add(f, "comboAreaNoShiftEqual", true, false, g -> {
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL, OptimizationGoal.AREA_DRIVEN);
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_LAST_PLACE_SHIFT, false);
            g.setProperty(RectPackingOptions.ASPECT_RATIO, 2.0);
            g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES);
        });
        add(f, "comboAspectDrivenReeval", true, false, g -> {
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL, OptimizationGoal.ASPECT_RATIO_DRIVEN);
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION, true);
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS, 2);
        });
        add(f, "comboNewRowReevalIterations", false, false, g -> {
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION, true);
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS, 3);
            kids((c, i, n) -> c.setProperty(RectPackingOptions.IN_NEW_ROW, i % 4 == 3)).accept(g);
        });
        add(f, "comboTryboxOrder", false, false, g -> {
            g.setProperty(RectPackingOptions.TRYBOX, true);
            g.setProperty(RectPackingOptions.ORDER_BY_SIZE, true);
        });
        add(f, "comboWideSpacingPadding", false, false, g -> {
            g.setProperty(RectPackingOptions.SPACING_NODE_NODE, 30.0);
            g.setProperty(RectPackingOptions.PADDING, new ElkPadding(2, 7, 11, 13));
            g.setProperty(RectPackingOptions.ASPECT_RATIO, 0.5);
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS, 2);
        });
    }

    static List<Factor> pick(String... ids) {
        List<String> want = List.of(ids);
        List<Factor> r = new ArrayList<>();
        for (Factor x : factors()) {
            if (want.contains(x.id)) {
                r.add(x);
            }
        }
        if (r.size() != ids.length) {
            throw new Bug("pick: unknown factor in " + want);
        }
        return r;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Graph building helpers

    static ElkNode newRoot() {
        ElkNode root = ElkGraphUtil.createGraph();
        root.setIdentifier(ROOT_ID);
        return root;
    }

    static ElkNode node(ElkNode parent, String id, double w, double h) {
        ElkNode n = ElkGraphUtil.createNode(parent);
        n.setIdentifier(id);
        n.setLocation(0, 0);
        n.setDimensions(w, h);
        return n;
    }

    static ElkLabel label(ElkGraphElement owner, String id, String text, double x, double y) {
        ElkLabel l = ElkGraphUtil.createLabel(text, owner);
        l.setIdentifier(id);
        l.setLocation(x, y);
        l.setDimensions(LABEL_CHAR_WIDTH * text.length(), LABEL_HEIGHT);
        return l;
    }

    static ElkPort port(ElkNode n, String id, double x, double y, PortSide side) {
        ElkPort p = ElkGraphUtil.createPort(n);
        p.setIdentifier(id);
        p.setLocation(x, y);
        p.setDimensions(4, 4);
        p.setProperty(CoreOptions.PORT_SIDE, side);
        return p;
    }

    static double pick(Random r, double[] from) {
        return from[r.nextInt(from.length)];
    }

    /** Labels (0-2) and ports (0-3, some with a label) on a node. */
    static void decorate(ElkNode n, Random r) {
        int labels = r.nextInt(3);
        for (int l = 0; l < labels; l++) {
            label(n, n.getIdentifier() + "_l" + l, "Lbl" + "x".repeat(r.nextInt(6)), 2, 2);
        }
        int ports = r.nextInt(4);
        for (int q = 0; q < ports; q++) {
            PortSide side = SIDES[r.nextInt(4)];
            double along = r.nextInt(Math.max(1, (int) n.getWidth()));
            double x = side == PortSide.WEST ? -4 : side == PortSide.EAST ? n.getWidth() : along;
            double y = side == PortSide.NORTH ? -4 : side == PortSide.SOUTH ? n.getHeight() : Math.min(along, n.getHeight());
            ElkPort p = port(n, n.getIdentifier() + "_p" + q, x, y, side);
            if (r.nextBoolean()) {
                label(p, p.getIdentifier() + "_l", "P" + q, 0, 0);
            }
        }
    }

    /** Sizes: style 0 mixed, 1 mostly small with some big, 2 equal heights, 3 equal heights with every fifth node taller. */
    static void leaf(ElkNode parent, Random r, String id, int style, int i, boolean deco) {
        double w = pick(r, WIDTHS), h = pick(r, HEIGHTS);
        if (style == 1) {
            boolean big = r.nextInt(5) == 0;
            w = big ? 140 + r.nextInt(120) : 20 + r.nextInt(30);
            h = big ? 120 + r.nextInt(100) : 20 + r.nextInt(30);
        } else if (style == 2) {
            h = 40;
        } else if (style == 3) {
            h = i % 5 == 4 ? 120 : 50;
        }
        ElkNode n = node(parent, id, w, h);
        if (deco) {
            decorate(n, r);
        }
    }

    static ElkNode flat(long seed, int n, int style, boolean deco) {
        Random r = new Random(seed);
        ElkNode root = newRoot();
        for (int i = 0; i < n; i++) {
            leaf(root, r, "n" + i, style, i, deco);
        }
        return root;
    }

    static ElkNode compound(ElkNode parent, Random r, String id, int kids, boolean nested) {
        ElkNode c = node(parent, id, 0, 0);
        label(c, id + "_l", "Compound " + id, 2, 2);
        for (int i = 0; i < kids; i++) {
            if (nested && i == kids - 1) {
                compound(c, r, id + "_c", 2, false);
            } else {
                leaf(c, r, id + "_" + i, 0, i, i % 2 == 0);
            }
        }
        return c;
    }

    static ElkNode hier(long seed) {
        Random r = new Random(seed);
        ElkNode root = newRoot();
        compound(root, r, "a", 4, false);
        leaf(root, r, "b", 0, 1, false);
        compound(root, r, "c", 3, true);
        leaf(root, r, "d", 0, 3, true);
        leaf(root, r, "e", 0, 4, false);
        return root;
    }

    static ElkNode explicit(double[] ws, double[] hs) {
        ElkNode root = newRoot();
        for (int i = 0; i < ws.length; i++) {
            node(root, "n" + i, ws[i], hs[i]);
        }
        return root;
    }

    // ---- random rows

    static Consumer<ElkNode> randomOptions(long seed) {
        return g -> {
            Random r = new Random(seed);
            double[] aspects = {0.5, 1.0, 1.3, 2.0, 3.0};
            if (r.nextInt(4) > 0) {
                g.setProperty(RectPackingOptions.ASPECT_RATIO, aspects[r.nextInt(aspects.length)]);
            }
            OptimizationGoal[] goals = OptimizationGoal.values();
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL, goals[r.nextInt(goals.length)]);
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_LAST_PLACE_SHIFT, r.nextBoolean());
            if (r.nextInt(4) == 0) {
                g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
                g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 40.0 + r.nextInt(560));
            }
            int p = r.nextInt(8);
            PackingStrategy packing = p < 6 ? PackingStrategy.COMPACTION : p == 6 ? PackingStrategy.SIMPLE : PackingStrategy.NONE;
            g.setProperty(RectPackingOptions.PACKING_STRATEGY, packing);
            if (packing != PackingStrategy.NONE) {
                WhiteSpaceEliminationStrategy[] ws = WhiteSpaceEliminationStrategy.values();
                g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, ws[r.nextInt(ws.length)]);
            }
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION, r.nextInt(3) == 0);
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS, 1 + r.nextInt(4));
            g.setProperty(RectPackingOptions.SPACING_NODE_NODE, (double) new int[] {0, 5, 15, 25}[r.nextInt(4)]);
            if (r.nextInt(3) == 0) {
                g.setProperty(RectPackingOptions.PADDING, new ElkPadding(r.nextInt(10)));
            }
            g.setProperty(RectPackingOptions.ORDER_BY_SIZE, r.nextInt(4) == 0);
            g.setProperty(RectPackingOptions.TRYBOX, r.nextInt(5) == 0);
            boolean interactive = r.nextInt(4) == 0;
            g.setProperty(RectPackingOptions.INTERACTIVE, interactive);
            int n = g.getChildren().size();
            for (ElkNode c : g.getChildren()) {
                if (interactive && r.nextInt(3) == 0) {
                    c.setProperty(RectPackingOptions.DESIRED_POSITION, r.nextInt(n + 2));
                }
                if (r.nextInt(8) == 0) {
                    c.setProperty(RectPackingOptions.IN_NEW_ROW, true);
                }
            }
        };
    }

    static ElkNode zeroSized(int n) {
        ElkNode root = newRoot();
        for (int i = 0; i < n; i++) {
            node(root, "n" + i, 0, 0);
        }
        return root;
    }

    // ---- corpus

    static final Map<String, String> MODEL_SHA = new LinkedHashMap<>();

    static {
        for (String line : MODELS_TABLE.split("\n")) {
            String l = line.strip();
            if (!l.isEmpty()) {
                MODEL_SHA.put(l.substring(l.indexOf("  ") + 2).strip(), l.substring(0, l.indexOf("  ")));
            }
        }
    }

    static Path modelPath(String key) {
        if (key.startsWith("repo:")) {
            return REPO.resolve(key.substring(5));
        }
        String dir = System.getenv(MODELS_ENV);
        if (dir == null) {
            throw new Bug(MODELS_ENV + " is not set (tools/vectors/rectpacking-vectors.sh sets it)");
        }
        return Path.of(dir).resolve(key.substring("models:".length()));
    }

    static void verifyModels() throws Exception {
        for (Map.Entry<String, String> e : MODEL_SHA.entrySet()) {
            String actual = sha256(modelPath(e.getKey()));
            if (!actual.equals(e.getValue())) {
                throw new Bug("model " + e.getKey() + " has sha256 " + actual + ", the table says " + e.getValue());
            }
        }
    }

    static ElkNode loadModel(String key) {
        Resource r = new ResourceSetImpl().getResource(URI.createFileURI(modelPath(key).toAbsolutePath().toString()), true);
        if (!r.getErrors().isEmpty() || r.getContents().isEmpty() || !(r.getContents().get(0) instanceof ElkNode)) {
            throw new Bug("cannot load " + key + ": " + r.getErrors());
        }
        ElkNode g = (ElkNode) r.getContents().get(0);
        List<ElkGraphElement> elements = new ArrayList<>();
        elements.add(g);
        for (TreeIterator<EObject> it = g.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkGraphElement e) {
                elements.add(e);
            }
        }
        int counter = 0;
        for (ElkGraphElement e : elements) {
            List<IProperty<?>> unresolved = new ArrayList<>();
            for (Map.Entry<IProperty<?>, Object> entry : e.getProperties()) {
                if (entry.getValue() != null && entry.getValue().getClass().getSimpleName().equals("LayoutOptionProxy")) {
                    unresolved.add(entry.getKey());
                }
            }
            unresolved.forEach(k -> e.getProperties().removeKey(k));
            if (e.getIdentifier() == null || e.getIdentifier().isEmpty()) {
                e.setIdentifier(e.eClass().getName().toLowerCase() + counter++);
            }
        }
        return g;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Shapes

    static List<Spec> shapes(Random rnd) {
        List<Spec> l = new ArrayList<>();
        List<Factor> all = factors();
        List<Factor> alg = new ArrayList<>(all);
        alg.removeIf(x -> x.micro);
        long s1 = rnd.nextLong(), s2 = rnd.nextLong(), s3 = rnd.nextLong(), s4 = rnd.nextLong(), s5 = rnd.nextLong();
        l.add(new Spec("mix9", () -> flat(s1, 9, 0, true), false, true, false, false, true, all));
        l.add(new Spec("wide14", () -> flat(s2, 14, 1, false), false, true, false, false, false, alg));
        l.add(new Spec("tall12", () -> flat(s3, 12, 3, false), false, false, false, false, false, alg));
        l.add(new Spec("hier", () -> hier(s4), false, true, false, false, true, all));
        List<Factor> small = pick("default", "trybox", "orderBySize", "aspect2_0", "comboTargetIterationsToAspect", "interactiveDesiredTies");
        l.add(new Spec("eq5", () -> flat(s5, 5, 2, false), false, true, false, false, false, small));
        l.add(new Spec("stk4", () -> explicit(new double[] {30, 40, 30, 50}, new double[] {100, 20, 20, 30}), false, true, false, false,
                false, small));
        l.add(new Spec("single1", () -> explicit(new double[] {70}, new double[] {40}), false, true, false, false, false, small));
        l.add(new Spec("two2", () -> explicit(new double[] {70, 20}, new double[] {40, 90}), false, true, false, false, false, small));
        for (int k = 0; k < 80; k++) {
            long seed = rnd.nextLong();
            Random r = new Random(seed);
            int n = k < 24 ? 1 + r.nextInt(20) : 1 + r.nextInt(60);
            int style = r.nextInt(4);
            boolean deco = r.nextInt(3) == 0;
            long optSeed = r.nextLong();
            Factor fx = new Factor("random", randomOptions(optSeed), false, true);
            l.add(new Spec("rand" + k, () -> flat(seed, n, style, deco), false, k < 24, true, false, false, List.of(fx)));
        }
        edgeSpecs(l);
        for (String m : List.of("repo:test/corpus/elkt-curated/examples/user-hints/interactive-constraints/interactiveLayout_mixedHierarchy.elkt",
                "repo:test/corpus/elkt-curated/examples/user-hints/interactive-constraints/interactiveRectpacking_oneBigNode.elkt",
                "models:examples/user-hints/interactive-constraints/interactiveRectpacking_hierarchy.elkt")) {
            String name = m.substring(m.lastIndexOf('/') + 1, m.lastIndexOf('.'));
            l.add(new Spec("corpus/" + name, () -> loadModel(m), false, true, true, true, false, pick("default")));
        }
        armSpecs(l);
        return l;
    }

    /**
     * Arms of the p1/p2 code that no scenario above reaches (mission 8c, T14b; found by a seeded search of the port, issue #73 inputs
     * discarded). Appended after every other scenario: the random stream is not touched and the ids of the earlier rows do not change.
     * Each row's input is fixed (no Random).
     */
    static void armSpecs(List<Spec> l) {
        // AreaApproximation.java:157 and :98: findBestCandidate returns null when more than two options tie, the dereference throws (a throws row)
        arm(l, "noBestCandidate", new double[] {0, 0}, new double[] {0, 0}, g -> g.setProperty(RectPackingOptions.SPACING_NODE_NODE, 0.0));
        // AreaApproximation.java:235 (checkSpecialCases falls through to drawing1): the ties LPR/WDB and LPB/WDR
        Consumer<ElkNode> negative5 = g -> {
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL, OptimizationGoal.ASPECT_RATIO_DRIVEN);
            g.setProperty(RectPackingOptions.SPACING_NODE_NODE, -5.0);
        };
        arm(l, "tieLprWdb", new double[] {40, 10, 20}, new double[] {0, 0, 10}, negative5);
        arm(l, "tieLpbWdr", new double[] {0, 0, 10}, new double[] {20, 10, 10}, g -> {
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_OPTIMIZATION_GOAL, OptimizationGoal.ASPECT_RATIO_DRIVEN);
            g.setProperty(RectPackingOptions.SPACING_NODE_NODE, -2.0);
        });
        // Compaction.java:70: the block loop skips a fixed block
        arm(l, "fixedBlockSkip", new double[] {40, 20, 20, 10}, new double[] {20, 20, 10, 90},
                g -> g.setProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION, true));
        arm(l, "fixedBlockSkipSpaced", new double[] {20, 10, 10, 5}, new double[] {60, 40, 10, 150}, g -> {
            g.setProperty(RectPackingOptions.PACKING_COMPACTION_ROW_HEIGHT_REEVALUATION, true);
            g.setProperty(RectPackingOptions.SPACING_NODE_NODE, 5.0);
        });
        // Compaction.java:322-325: a block that placeBeside moved keeps its old parent row, so a later placeBelow takes the
        // wasFromNextRow arm while rows.size() <= nextRowIndex
        arm(l, "staleParentRow", new double[] {10, 10, 10, 20, 10}, new double[] {10, 10, 40, 10, 60}, g -> { });
        arm(l, "staleParentRowNoSpacing", new double[] {20, 20, 10, 10, 10}, new double[] {10, 10, 30, 10, 40},
                g -> g.setProperty(RectPackingOptions.SPACING_NODE_NODE, 0.0));
    }

    static void arm(List<Spec> l, String id, double[] ws, double[] hs, Consumer<ElkNode> apply) {
        l.add(new Spec("arm/" + id, () -> explicit(ws, hs), false, true, true, false, false, List.of(new Factor("default", apply, false, true))));
    }

    static void edgeSpecs(List<Spec> l) {
        Supplier<ElkNode> five = () -> flat(77L, 5, 0, false);
        edge(l, "zero2", () -> zeroSized(2), g -> { });
        edge(l, "zero4", () -> zeroSized(4), g -> { });
        edge(l, "zeroMixed", () -> {
            ElkNode r = zeroSized(2);
            node(r, "m0", 30, 30);
            node(r, "m1", 0, 20);
            return r;
        }, g -> { });
        edge(l, "negativeSpacing", five, g -> g.setProperty(RectPackingOptions.SPACING_NODE_NODE, -5.0));
        edge(l, "aspect0", five, g -> g.setProperty(RectPackingOptions.ASPECT_RATIO, 0.0));
        edge(l, "aspectNegative", five, g -> g.setProperty(RectPackingOptions.ASPECT_RATIO, -1.0));
        edge(l, "aspectHuge", five, g -> g.setProperty(RectPackingOptions.ASPECT_RATIO, 1e6));
        edge(l, "targetWidth0", five, g -> {
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 0.0);
        });
        edge(l, "targetWidthNegative", five, g -> {
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, -1.0);
        });
        edge(l, "targetWidthHuge", five, g -> {
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH);
            g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_TARGET_WIDTH, 1e9);
        });
        edge(l, "iterationsNegative", five, g -> g.setProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS, -2));
        edge(l, "iterations10", five, g -> g.setProperty(RectPackingOptions.PACKING_COMPACTION_ITERATIONS, 10));
        edge(l, "sameSizes", () -> explicit(new double[] {40, 40, 40, 40, 40, 40}, new double[] {40, 40, 40, 40, 40, 40}), g -> { });
        edge(l, "onlyNewRow", () -> explicit(new double[] {40, 40, 40}, new double[] {40, 40, 40}),
                kids((c, i, n) -> c.setProperty(RectPackingOptions.IN_NEW_ROW, true)));
        edge(l, "minHeightHuge", five, g -> {
            g.setProperty(RectPackingOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.MINIMUM_SIZE));
            g.setProperty(RectPackingOptions.NODE_SIZE_MINIMUM, new KVector(1000, 1000));
            g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES);
        });
    }

    static void edge(List<Spec> l, String id, Supplier<ElkNode> make, Consumer<ElkNode> apply) {
        l.add(new Spec("edge/" + id, make, false, true, true, false, false, List.of(new Factor("default", apply, false, true))));
    }

    static List<Spec> throwsSpecs() {
        List<Spec> l = new ArrayList<>();
        Supplier<ElkNode> five = () -> flat(77L, 5, 0, false);
        Consumer<ElkNode> none = g -> g.setProperty(RectPackingOptions.PACKING_STRATEGY, PackingStrategy.NONE);
        throwsSpec(l, "targetWidthMissing", five, false,
                g -> g.setProperty(RectPackingOptions.WIDTH_APPROXIMATION_STRATEGY, WidthApproximationStrategy.TARGET_WIDTH));
        throwsSpec(l, "equalWithoutRows", five, false, g -> {
            none.accept(g);
            g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, WhiteSpaceEliminationStrategy.EQUAL_BETWEEN_STRUCTURES);
        });
        throwsSpec(l, "toAspectWithoutRows", five, false, g -> {
            none.accept(g);
            g.setProperty(RectPackingOptions.WHITE_SPACE_ELIMINATION_STRATEGY, WhiteSpaceEliminationStrategy.TO_ASPECT_RATIO);
        });
        throwsSpec(l, "emptyGreedy", RectPackingVectors::newRoot, true, g -> { });
        throwsSpec(l, "desiredMinus1", five, false, g -> {
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            g.getChildren().get(2).setProperty(RectPackingOptions.DESIRED_POSITION, -1);
        });
        throwsSpec(l, "desiredMinus5", five, false, g -> {
            g.setProperty(RectPackingOptions.INTERACTIVE, true);
            g.getChildren().get(1).setProperty(RectPackingOptions.DESIRED_POSITION, -5);
        });
        return l;
    }

    static void throwsSpec(List<Spec> l, String id, Supplier<ElkNode> make, boolean direct, Consumer<ElkNode> apply) {
        l.add(new Spec(id, make, direct, false, false, false, false, List.of(new Factor("default", apply, false, false))));
    }

    // ------------------------------------------------------------------------------------------------------------
    // The sort group (PK7)

    static List<Row> sortRows() {
        Random rnd = new Random(SEED ^ 0x5017L);
        List<Row> rows = new ArrayList<>();
        for (int len = 1; len <= 64; len++) {
            for (int v = 0; v < 10; v++) {
                int[] pos = positions(len, v, rnd);
                String a = sortOutcome(pos);
                if (!a.equals(sortOutcome(pos))) {
                    throw new Bug("sort row L" + len + "/v" + v + " is not stable");
                }
                String id = SORT + "/L" + len + "/v" + v;
                StringBuilder sb = new StringBuilder("{\"id\": ");
                str(sb, id);
                sb.append(", \"group\": \"sort\", \"input\": {\"positions\": ").append(Arrays.toString(pos)).append("}, \"expected\": ")
                        .append(a).append('}');
                rows.add(new Row(id, SORT, sb.toString()));
            }
        }
        return rows;
    }

    static int[] positions(int len, int v, Random r) {
        int[] p = new int[len];
        for (int i = 0; i < len; i++) {
            p[i] = switch (v) {
                case 0 -> 3;
                case 1 -> r.nextInt(2) * 2;
                case 2 -> r.nextInt(3);
                case 3 -> r.nextInt(Math.max(1, len / 2));
                case 4 -> r.nextInt(len);
                case 5 -> i / 2;
                case 6 -> (len - i) / 3;
                case 7 -> i % 4;
                case 8 -> r.nextInt(4);
                default -> r.nextInt(2);
            };
        }
        return p;
    }

    static String sortOutcome(int[] pos) {
        List<ElkNode> fixedNodes = new ArrayList<>();
        for (int i = 0; i < pos.length; i++) {
            ElkNode n = ElkGraphUtil.createNode(null);
            n.setIdentifier(String.valueOf(i));
            n.setProperty(RectPackingOptions.DESIRED_POSITION, pos[i]);
            fixedNodes.add(n);
        }
        try {
            // verbatim from InteractiveNodeReorderer.java:56-63
            Collections.sort(fixedNodes, (a, b) -> {
                int positionA = a.getProperty(RectPackingOptions.DESIRED_POSITION);
                int positionB = b.getProperty(RectPackingOptions.DESIRED_POSITION);
                if (positionA == positionB) {
                    return -1;
                } else {
                    return Integer.compare(positionA, positionB);
                }
            });
        } catch (RuntimeException e) {
            StringBuilder sb = new StringBuilder("{\"throws\": {\"class\": ");
            str(sb, e.getClass().getName());
            sb.append(", \"message\": ");
            str(sb, e.getMessage());
            return sb.append("}}").toString();
        }
        List<String> order = new ArrayList<>();
        fixedNodes.forEach(n -> order.add(n.getIdentifier()));
        return "{\"order\": " + list(order) + "}";
    }

    // ------------------------------------------------------------------------------------------------------------
    // Export, JSON helpers

    static String export(ElkNode root) {
        return strictNumbers(ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false)
                .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false).toJson());
    }

    /** Gson's lenient writer emits non-finite doubles as bare tokens, which is not JSON: Infinity, -Infinity and NaN in
     * number-token positions become the strings "Infinity", "-Infinity" and "NaN". */
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

    /** Strict parse: bare NaN/Infinity, trailing garbage and malformed tokens fail. */
    static void strictParse(String json) throws IOException {
        JsonReader r = new JsonReader(new StringReader(json));
        r.skipValue();
        if (r.peek() != JsonToken.END_DOCUMENT) {
            throw new Bug("trailing content after the JSON document");
        }
    }

    static String sha256(Path p) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(p));
        StringBuilder sb = new StringBuilder();
        for (byte b : d) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new IllegalStateException("NaN in a recorded value");
        }
        return "\"" + String.format("%016x", Double.doubleToRawLongBits(d)) + "\"";
    }

    static String q(String s) {
        StringBuilder sb = new StringBuilder();
        str(sb, s);
        return sb.toString();
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

    /** {@link Integer#parseInt}, with a malformed value reported by name (GitHub Code Quality; f0481475 pattern). */
    static int parseIntArg(String what, String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(what + " is not an integer: " + s, e);
        }
    }
}
