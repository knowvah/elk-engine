// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 8b alg-force-disco, T2, FD1, FD4) for org.eclipse.elk.alg.disco: what
// DisCoLayoutProvider.layout does at the pinned ELK commit, step by step. This program only CALLS ELK APIs (and reads private state by
// reflection) and records results; it embeds no ELK implementation.
// Run: tools/vectors/disco-vectors.sh <outDir>   (java -cp ... DiscoVectors.java <outDir> <tools/vectors dir>)
// ORIGIN: the row format, the NS1 round trip, the NS6 hex doubles, the strictNumbers sanitiser, the throws shape with the first ELK
// frame, the identity-hash guard and the 16 MiB guard are copied from tools/vectors/VertiFlexVectors.java (single-file launchers share
// no code).
//
// ===== OUTPUT CONTRACT (everything a TypeScript replay needs; no need to read the recorder body) =====
// File <outDir>/disco.json (2-space top level, ONE compact JSON row per line, trailing newline, strict JSON, under 16 MiB):
//   { jdk, oracle, seed, rowCounts: { full, stops, throws }, optionCoverage, stopCoverage, rows: [row...] }
//   row = { id, group, input, expected }, ids unique and stable: "<group>/<shape>/<factor>" (throws: "throws/<name>").
//   group in full | stops | throws. A scenario planned as full or stops whose run throws is a recorder failure.
//   input = the PREPARED graph (algorithm option, factor applied) exported by ElkGraphJson.forGraph(root).omitLayout(false)
//     .omitZeroDimension(false).omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false) under system properties
//     org.eclipse.elk.graph.json.exportSeed=1 and org.eclipse.elk.graph.util.identifierSeed=1, EMBEDDED as a JSON object. A bare
//     Infinity/-Infinity/NaN token of the exporter is replaced by the string "Infinity"/"-Infinity"/"NaN" (this ref has none). The root
//     has layoutOptions org.eclipse.elk.algorithm = org.eclipse.elk.disco. Every node, port, label and edge has a unique id; every edge
//     has exactly one section (start, bends, end; coordinates relative to the edge's containing node) unless the row is named
//     noSection*/corpus (an edge without a section: ElkGraphUtil.firstEdgeSection then creates one at (0,0)-(0,0), it does NOT throw).
//   LAYOUT NODE: the ElkNode DisCoLayoutProvider.layout receives. It is the root, except in the ext* shapes, whose root has ONE child
//     "g" (a compound node with its own ports and children) that is the layout node: parent-port edges need a layout node with a parent
//     (an edge from the ports of a parentless root throws a NullPointerException in ElkGraphComponentsProcessor, see throws). Both root
//     and g carry elk.algorithm = disco; the factor options (aspect ratio, sorts, ...) are set on the LAYOUT node only.
//   How a row is run (a replay does the same): ElkGraphJson.forGraph(input).toElk(), then new RecursiveGraphLayoutEngine().layout(root,
//     monitor) with PolyominoOptions, DisCoMetaDataProvider + DisCoOptions, ForceMetaDataProvider + ForceOptions and
//     LayeredMetaDataProvider + LayeredOptions registered (componentLayoutAlgorithm names force, layered or an unknown id).
//   Every row's expected carries "layoutNode": "<id>".
//
// Numbers: every double is 16 lowercase hex digits, Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded; a NaN anywhere fails
//   the recording. Integers are JSON numbers. Ids are strings as exported. Points are [hexX, hexY]; boxes [x, y, w, h] in hex.
//
// ELK DUMP (the shape of every ElkGraph snapshot: group full, the applyLayout stop and the split stop's afterComponentLayout):
//   graph  = { id, x, y, w, h }                         the top node of the dump (the root for full, the layout node for the stop)
//   nodes  = [ { id, x, y, w, h } ]                     descendants in traversal order: each node, its labels, its ports (each followed
//                                                       by its labels), then its children recursively; ports and labels of the top node
//                                                       come first in their own lists
//   ports, labels = [ { id, x, y, w, h } ]
//   edges  = [ { id, sections: [ { start, end, bends: [point...] } ], junctions: null | [point...] } ]   junctions = the
//            CoreOptions.JUNCTION_POINTS value when SET
//   debug  = [ { id, polys: n|null, comps: n|null, dims: point|null } ]  nodes with DEBUG_DISCO_POLYS / DEBUG_DISCO_GRAPH set (they are
//            programmatic options of the provider, absent from the exported JSON): polys = size of the polyomino list, comps/dims = the
//            DCGraph's component count and dimensions
//   group full: expected = { layoutNode, graph, nodes, ports, labels, edges, debug } for the whole root after the engine run.
//
// group stops: expected = { layoutNode, steps: [...], stops: [ { step, ... } ... ] }, the seven steps in this order, run on the layout
//   node by driving DisCoLayoutProvider.layout step by step (provider body repeated by the recorder; private compactor methods by
//   reflection). The recorder fails the row when the stepwise run's applyLayout dump differs from a plain DisCoLayoutProvider.layout on a
//   fresh import (and, for a root layout node, from the engine's result). Sets iterate by identity hash in the JVM: every list below
//   that comes from a hash set is sorted by a stable key, and no row encodes hash order. Under -XX:hashCode=2 the oracle's order is
//   insertion order anyway; the sorting makes the rows independent of it.
//   split   = { step, componentLayoutApplied: bool, afterComponentLayout: dump|null, components: [ { first, nodes, dfsOrder } ],
//               incidence: [ { id, adjacent } ] }
//             afterComponentLayout is the ElkGraph dump of the layout node AFTER the componentLayoutAlgorithm ran (the state split sees),
//             null when no component layout ran (the input is that state). components in ElkGraphComponentsProcessor.split order (the
//             order of the first node in the node list, not a set order); first = id of the DFS start node; nodes = the component's node
//             ids in node-list order; dfsOrder = the order the recursive dfs added them (adjacency sets iterate in hash order: this is the
//             one place set order shows, kept separately as asked); incidence = per node (node-list order) its adjacent node ids in
//             node-list order (ElkGraphComponentsProcessor.incidenceMap read by reflection).
//   import  = { step, componentSpacing, inset, dimensions: null, props: { optionId: value }, components: [ { index, first, id, offset,
//               minCorner, bounds: [w, h], elements: [ element ] } ] } = the DCGraph after ElkGraphTransformer.importGraph;
//             components in DCGraph order (= split order); element = { kind, ref, shape: [point...], bounds: [x, y, w, h],
//             parentCoords: point|null, extensions: [ { dir, offset: point, width } ] }, kind in node, nodeLabel, port, portLabel, edge,
//             extEdge (the contour of an extension edge with more than two points), edgeLabel; ref = the ElkGraph id the element was made
//             from (a 2-point extension edge has no element of its own: its extension hangs on the node element); elements sorted by
//             (kind order above, bounds minX, minY, width, height, ref), extensions by (direction ordinal NORTH..WEST, offset x, y, width);
//             props = every explicitly set property of the DCGraph (copied from the layout node), sorted by option id, doubles in hex,
//             enums by name, padding/margin as [t, r, b, l] hex.
//   cellSizes = { step, componentCount, componentBounds: [[w, h]...], recommendation, cellSizeX, cellSizeY, aspectRatio, fill,
//               upperBound }: computeCellSize's result, the grid parameters after the aspect-ratio scaling, the effective aspect ratio
//             (an unset aspectRatio reads null and takes the 1.0 arm) and the fill flag.
//   polys   = { step, polys: [ poly ] } the polyominoes after createPolyominoes (before ProfileFill and before the sorts), in component
//             order; poly = { component, id, x, y, w, h, centerX, centerY, cellSizeX, cellSizeY, offset: point, cells: [rle...],
//             extensions: [ { dir, offset, width } ] } (extension offset/width are the grid triple (second, third) of
//             Polyomino.getPolyominoExtensions, sorted by (direction ordinal, second, third); dir is the Direction name; the DCExtension
//             list order is hash derived, so it is sorted). cells = one string per grid row, run-length coded: "<count><char>" pairs
//             from the left, char "_" empty, "X" blocked, "w" weakly blocked ("12_3X1_").
//   pack    = { step, order: [component...], polys: [ poly ], grid: { w, h, centerX, centerY, cells }, filledBounds: [minX, minY, w, h] }
//             after packPolyominoes: polys in packed order (after both sorts), with x, y (grid position), id (set by the compactor), and
//             the cells AFTER ProfileFill when fill is set; grid = the final main grid; filledBounds = grid.getFilledBounds().
//   applyToDCGraph = { step, dimensions: point, components: [ { index, offset: point } ], polys: [ { component, id, x, y } ],
//             debugPolys: n } the DCGraph after applyToDCGraph (components in DCGraph order; polys in packed order).
//   applyLayout = { step, ...ELK dump of the layout node after transformer.applyLayout and the provider's debug properties }.
//
// group throws: expected = { layoutNode, throws: { class, message, frame } }: the engine run threw inside ELK. class and message are those
//   of the ROOT CAUSE (a parallel stream rethrows a copy whose stack trace is the caller's; the root cause keeps the original frame);
//   message = getMessage() or null (a JDK helpful NullPointerException message is JVM text: compare class and frame); frame = the first
//   (innermost) org.eclipse.elk frame of the root cause as "File.java:line". The stepwise path must throw the same. Rows:
//   throws/rootPortEdge (an edge from a port of a parentless layout node: NullPointerException, sameHierarchyLevel's getParent() is null,
//   ElkGraphComponentsProcessor.java:108), throws/hyperedge (IllegalArgumentException "Passed edge is not 'simple'." from
//   ElkGraphUtil.getSourceNode), throws/extOutOfGridWest and throws/extOutOfGridNorth (an extension whose last cell index equals the
//   polyomino's own size: IndexOutOfBoundsException from TwoBitGrid in DCPolyomino.addExtensionsToPoly -> PlanarGrid.weaklyBlockArea;
//   the lone 90x90 component gets l = 10 exactly), throws/negativeAspect (aspectRatio -1: negative grid height,
//   NegativeArraySizeException in TwoBitGrid.reinitialize). An edge WITHOUT a section does not throw (see noSection, corpus20).
//   PlanarGrid.weaklyIntersectsArea (the packing-phase out-of-grid throw of the alg.common rows) is not reached by any disco input found:
//   about 48,000 random ext graphs (2 to 8 components, one or two extensions each, every traversal strategy, both high-level sorts,
//   aspect ratios from 0.1 to 10) never threw.
//   The extBoundary*InRange rows are the same geometry one half unit short: no throw, but the component's cells are all empty (a cell
//   strictly inside the polygon or only touching its border is not marked), so Grid.getFilledBounds returns its sentinel values and
//   applyToDCGraph runs on wrapped 32-bit arithmetic (an Int32 overflow case).
//
// OPTIONS (every value of tools/melk/sources/{Disco,Polyomino}.melk, FD2; optionCoverage counts rows per value and group):
//   spacing.componentComponent (default 20), edge.thickness (read per EDGE, default 1.0), aspectRatio (default null = unset: the
//   compactor then uses 1.0; above 1, below 1, exactly 1), padding (default 12), polyomino.fill (true, false), polyomino.lowLevelSort (BY_SIZE, BY_SIZE_AND_SHAPE),
//   polyomino.highLevelSort (both values), polyomino.traversalStrategy (all nine), componentCompaction.strategy (POLYOMINO, the only
//   value), componentCompaction.componentLayoutAlgorithm (force, layered, the full id org.eclipse.elk.layered, an unknown id).
//   Each is a factor applied alone to the base graphs multi6 and ext, plus combined rows.
//
// SCENARIOS (seeded java.util.Random, seed SEED = 8201 for the master, a seed per shape drawn from it; the whole build runs twice and
//   must agree byte for byte): see shapes(). Component geometry is preset (node x/y/size, one section per edge with bends, labels on
//   nodes, ports and edges, ports with port labels, edges attached to ports); the ext shapes add the parent-port edges (incoming = from
//   a port of the layout node to a child, outgoing = from a child to a port), extensions on all four sides, extension edges with and
//   without bend points, two edges sharing one port (extShared, extSharedInOut: the order-observable adjustedPorts site, FD4) and
//   every row keeps at most 8 extension entries. The recorder prints to stderr, per ext row, the order in which the oracle iterated
//   incomingExtensionsMapping and outgoingExtensionsMapping (HashMap over identity-hashed ElkEdge keys: insertion order under the flag).
//
// Round trip (NS1): for each row the recorder (1) prepares the graph, (2) exports it to `input`, (3) re-imports `input` and runs it, which
//   is the recorded `expected`, and (4) also runs a freshly prepared original and fails the row if the two outputs differ. Stability: the
//   whole row is built twice from scratch and the two serialised rows must be byte-identical. A row that does not finish within
//   ROW_TIMEOUT_SECONDS stops the recording.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2; the program refuses to run without it
//   unless DISCO_UNPINNED=1 (an evidence run).
// Size guard: the output must stay under 16 MiB (MAX_BYTES).
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.IOException;
import java.io.StringReader;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import java.util.function.Supplier;
import org.eclipse.elk.alg.common.compaction.options.HighLevelSortingCriterion;
import org.eclipse.elk.alg.common.compaction.options.LowLevelSortingCriterion;
import org.eclipse.elk.alg.common.compaction.options.PolyominoOptions;
import org.eclipse.elk.alg.common.compaction.options.TraversalStrategy;
import org.eclipse.elk.alg.common.polyomino.structures.PlanarGrid;
import org.eclipse.elk.alg.common.polyomino.structures.Polyomino;
import org.eclipse.elk.alg.common.utils.UniqueTriple;
import org.eclipse.elk.alg.disco.DisCoLayoutProvider;
import org.eclipse.elk.alg.disco.DisCoPolyominoCompactor;
import org.eclipse.elk.alg.disco.graph.DCComponent;
import org.eclipse.elk.alg.disco.graph.DCDirection;
import org.eclipse.elk.alg.disco.graph.DCElement;
import org.eclipse.elk.alg.disco.graph.DCExtension;
import org.eclipse.elk.alg.disco.graph.DCGraph;
import org.eclipse.elk.alg.disco.options.CompactionStrategy;
import org.eclipse.elk.alg.disco.options.DisCoMetaDataProvider;
import org.eclipse.elk.alg.disco.options.DisCoOptions;
import org.eclipse.elk.alg.disco.structures.DCPolyomino;
import org.eclipse.elk.alg.disco.transform.ElkGraphComponentsProcessor;
import org.eclipse.elk.alg.disco.transform.ElkGraphTransformer;
import org.eclipse.elk.alg.force.options.ForceMetaDataProvider;
import org.eclipse.elk.alg.force.options.ForceOptions;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.core.AbstractLayoutProvider;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.LayoutAlgorithmData;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.ElkRectangle;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.math.KVectorChain;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.core.util.Quadruple;
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
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.elk.graph.util.ElkGraphUtil;

public class DiscoVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "disco.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String IDENTIFIER_SEED_PROPERTY = "org.eclipse.elk.graph.util.identifierSeed";
    static final String UNPINNED_ENV = "DISCO_UNPINNED";
    static final String ALGORITHM_ID = DisCoOptions.ALGORITHM_ID;
    static final long SEED = 8201L;
    static final long MAX_BYTES = 16L * 1024 * 1024;
    static final int ROW_TIMEOUT_SECONDS = 60;
    static final int MAX_EXTENSION_ENTRIES = 8;
    static final int STOPS_MAX_COMPONENTS = 10;
    static final String FULL = "full", STOPS = "stops", THROWS = "throws";
    static final String ROOT_ID = "root", GRAPH_ID = "g";
    static final double LABEL_CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0;
    static final double[] WIDTHS = {20, 30, 40, 60, 90};
    static final double[] HEIGHTS = {20, 30, 40, 50};
    static final String CORPUS_FILE = "test/corpus/generated/disco-components-small.json";
    static final String CORPUS_TABLE = """
            163bbecd8a3e733c5c910b8d6c1e5c463ce785ac585d20cbd6e8a8057a85a1aa  repo:test/corpus/generated/disco-components-small.json
            """;
    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");
    static final String S_SPLIT = "split", S_IMPORT = "import", S_CELL = "cellSizes", S_POLYS = "polys", S_PACK = "pack",
            S_APPLY_DC = "applyToDCGraph", S_APPLY = "applyLayout";
    static final List<String> STEPS = List.of(S_SPLIT, S_IMPORT, S_CELL, S_POLYS, S_PACK, S_APPLY_DC, S_APPLY);
    static final List<String> KINDS = List.of("node", "nodeLabel", "port", "portLabel", "edge", "extEdge", "edgeLabel");

    static final class Bug extends RuntimeException {
        Bug(String m) {
            super(m);
        }
    }

    record Row(String id, String group, String json) { }

    record Factor(String id, Consumer<ElkNode> apply) { }

    /** A scenario shape: make builds the unprepared graph (no algorithm option); layoutId names the layout node (null = root). */
    record Spec(String id, Supplier<ElkNode> make, String layoutId, boolean stops, List<Factor> factors) { }

    /** The outcome of one run: a thrown exception or the serialised expected value, plus the branch flags of a stops run. */
    record Outcome(boolean threw, String json, Map<String, Integer> flags) { }

    static ExecutorService pool;
    static Path REPO;
    static final List<String> NOTES = new ArrayList<>();
    static final Map<String, Integer> STOP_FLAGS = new TreeMap<>();
    static String CURRENT_ROW = "";

    public static void main(String[] args) throws Exception {
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        setup();
        Path out = Path.of(args[0]);
        List<Row> rows = buildRows(true);
        List<Row> again = buildRows(false);
        if (rows.size() != again.size()) {
            throw new Bug("row count differs between the two builds");
        }
        for (int i = 0; i < rows.size(); i++) {
            if (!rows.get(i).json.equals(again.get(i).json)) {
                throw new Bug("row " + rows.get(i).id + " differs between the two builds");
            }
        }
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String g : List.of(FULL, STOPS, THROWS)) {
            counts.put(g, (int) rows.stream().filter(r -> r.group.equals(g)).count());
        }
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
        for (String note : NOTES) {
            System.err.println(note);
        }
        System.err.println("stopCoverage " + flagsJson(STOP_FLAGS));
        System.err.println("optionCoverage " + coverageJson());
        pool.shutdownNow();
    }

    static void setup() throws Exception {
        if (!"1".equals(System.getenv(UNPINNED_ENV))
                && System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/disco-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new PolyominoOptions(), new DisCoMetaDataProvider(), new DisCoOptions(),
                new ForceMetaDataProvider(), new ForceOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty(IDENTIFIER_SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        pool = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "disco-row");
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

    static List<Row> buildRows(boolean record) throws Exception {
        Random rnd = new Random(SEED);
        List<Row> rows = new ArrayList<>();
        for (Spec s : shapes(rnd)) {
            for (Factor f : s.factors) {
                Supplier<ElkNode> prep = prepare(s, f);
                rows.add(row(FULL + "/" + s.id + "/" + f.id, FULL, prep, s.layoutId, record));
                if (s.stops) {
                    rows.add(row(STOPS + "/" + s.id + "/" + f.id, STOPS, prep, s.layoutId, record));
                }
            }
        }
        for (Spec s : throwsSpecs()) {
            rows.add(row(THROWS + "/" + s.id, THROWS, prepare(s, s.factors.get(0)), s.layoutId, record));
        }
        return rows;
    }

    static Supplier<ElkNode> prepare(Spec s, Factor f) {
        return () -> {
            ElkNode root = s.make.get();
            root.setProperty(CoreOptions.ALGORITHM, ALGORITHM_ID);
            ElkNode layout = layoutNode(root, s.layoutId);
            layout.setProperty(CoreOptions.ALGORITHM, ALGORITHM_ID);
            f.apply.accept(layout);
            return root;
        };
    }

    static ElkNode layoutNode(ElkNode root, String layoutId) {
        if (layoutId == null || layoutId.equals(ROOT_ID)) {
            return root;
        }
        ElkNode n = find(root, layoutId);
        if (n == null) {
            throw new Bug("no layout node " + layoutId);
        }
        return n;
    }

    static ElkNode find(ElkNode n, String id) {
        if (id.equals(n.getIdentifier())) {
            return n;
        }
        for (ElkNode c : n.getChildren()) {
            ElkNode r = find(c, id);
            if (r != null) {
                return r;
            }
        }
        return null;
    }

    /** Builds one row twice from scratch; the second serialisation must equal the first. */
    static Row row(String id, String group, Supplier<ElkNode> prep, String layoutId, boolean record) throws Exception {
        Row a = buildRow(id, group, prep, layoutId, record);
        Row b = buildRow(id, group, prep, layoutId, false);
        if (!a.json.equals(b.json)) {
            throw new Bug("row " + id + " is not stable across two builds");
        }
        return a;
    }

    static Row buildRow(String id, String group, Supplier<ElkNode> prep, String layoutId, boolean record) throws Exception {
        if (record && System.getenv("DISCO_TRACE") != null) {
            System.err.println("TRACE ROW " + id);
        }
        String lid = layoutId == null ? ROOT_ID : layoutId;
        CURRENT_ROW = id;
        ElkNode original = prep.get();
        String input = export(original);
        if (record) {
            countCoverage(group, layoutNode(original, layoutId));
        }
        boolean stops = group.equals(STOPS);
        Outcome viaImport = timed(id, () -> run(ElkGraphJson.forGraph(input).toElk(), lid, stops));
        Outcome viaOriginal = timed(id, () -> run(prep.get(), lid, stops));
        if (viaImport.threw != viaOriginal.threw || !viaImport.json.equals(viaOriginal.json)) {
            throw new Bug("round trip: row " + id + " differs between the re-imported and the original graph:\n" + viaImport.json
                    + "\n" + viaOriginal.json);
        }
        if (group.equals(THROWS) != viaImport.threw) {
            throw new Bug("row " + id + (viaImport.threw ? " threw but is planned " + group + ": " + viaImport.json
                    : " is planned throws but ran"));
        }
        if (viaImport.threw) {
            Outcome viaStops = timed(id, () -> run(ElkGraphJson.forGraph(input).toElk(), lid, true));
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
        str(sb, id);
        sb.append(", \"group\": \"").append(group).append("\", \"input\": ").append(input).append(", \"expected\": ")
                .append(viaImport.json).append('}');
        return new Row(id, group, sb.toString());
    }

    // ------------------------------------------------------------------------------------------------------------
    // Runs

    static Outcome run(ElkNode root, String layoutId, boolean stops) {
        try {
            if (!stops) {
                new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
                return new Outcome(false, fullJson(root, layoutId), Map.of());
            }
            return runStops(root, layoutId);
        } catch (RuntimeException e) {
            Throwable cause = rootCause(e);
            StackTraceElement frame = elkFrame(cause);
            if (e instanceof Bug || frame == null) {
                throw e;
            }
            StringBuilder sb = new StringBuilder("{\"layoutNode\": " + q(layoutId) + ", \"throws\": {\"class\": ");
            str(sb, cause.getClass().getName());
            sb.append(", \"message\": ");
            str(sb, cause.getMessage());
            sb.append(", \"frame\": ");
            str(sb, frame.getFileName() + ":" + frame.getLineNumber());
            sb.append("}}");
            return new Outcome(true, sb.toString(), Map.of());
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
            if (f.getClassName().startsWith("DiscoVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    static String fullJson(ElkNode root, String layoutId) {
        return "{\"layoutNode\": " + q(layoutId) + ", " + dumpBody(root) + "}";
    }

    // ------------------------------------------------------------------------------------------------------------
    // Reflection helpers (the recorder is test code; DisCoPolyominoCompactor, ElkGraphTransformer and the components processor keep
    // their state private)

    @SuppressWarnings("unchecked")
    static <T> T getField(Object target, Class<?> owner, String name) {
        try {
            var f = owner.getDeclaredField(name);
            f.setAccessible(true);
            return (T) f.get(target);
        } catch (ReflectiveOperationException e) {
            throw new Bug("reflection " + owner.getSimpleName() + "." + name + ": " + e);
        }
    }

    static void setField(Object target, Class<?> owner, String name, Object value) {
        try {
            var f = owner.getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new Bug("reflection " + owner.getSimpleName() + "." + name + ": " + e);
        }
    }

    @SuppressWarnings("unchecked")
    static <T> T call(Object target, String name, Object... args) {
        for (Method m : target.getClass().getDeclaredMethods()) {
            if (m.getName().equals(name) && m.getParameterCount() == args.length) {
                m.setAccessible(true);
                try {
                    return (T) m.invoke(target, args);
                } catch (InvocationTargetException e) {
                    if (e.getCause() instanceof RuntimeException re) {
                        throw re;
                    }
                    if (e.getCause() instanceof Error er) {
                        throw er;
                    }
                    throw new Bug("reflection call " + name + ": " + e.getCause());
                } catch (IllegalAccessException e) {
                    throw new Bug("reflection call " + name + ": " + e);
                }
            }
        }
        throw new Bug("no method " + name);
    }

    // ------------------------------------------------------------------------------------------------------------
    // The stepwise run

    static Outcome runStops(ElkNode root, String layoutId) {
        String inputJson = export(root);
        ElkNode layout = layoutNode(root, layoutId);
        Map<String, Integer> flags = new TreeMap<>();
        List<String> stops = new ArrayList<>();
        double spacing = layout.getProperty(DisCoOptions.SPACING_COMPONENT_COMPONENT);

        // component layout algorithm (the provider's first block)
        String afterComponentLayout = "null";
        boolean applied = false;
        if (layout.hasProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM)) {
            String requested = layout.getProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM);
            LayoutAlgorithmData lad = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(requested);
            if (lad != null) {
                AbstractLayoutProvider provider = lad.getInstancePool().fetch();
                BasicProgressMonitor monitor = new BasicProgressMonitor();
                monitor.begin("component layout", 1);
                provider.layout(layout, monitor.subTask(1));
                applied = true;
                afterComponentLayout = "{" + dumpBody(layout) + "}";
            }
        }
        flag(flags, "componentLayoutApplied", applied);

        // split
        List<List<ElkNode>> split = ElkGraphComponentsProcessor.split(layout);
        stops.add(splitStop(layout, split, applied, afterComponentLayout));

        // importGraph
        ElkGraphTransformer transformer = new ElkGraphTransformer(spacing);
        DCGraph dc = transformer.importGraph(layout);
        stops.add(importStop(dc, transformer, split, spacing, layoutId, flags));

        // compaction (POLYOMINO, the only CompactionStrategy)
        if (layout.getProperty(DisCoMetaDataProvider.COMPONENT_COMPACTION_STRATEGY) != CompactionStrategy.POLYOMINO) {
            throw new Bug("unexpected compaction strategy");
        }
        DisCoPolyominoCompactor compactor = new DisCoPolyominoCompactor();
        compact(compactor, dc, stops, flags);
        layout.setProperty(DisCoOptions.DEBUG_DISCO_POLYS, dc.getProperty(DisCoOptions.DEBUG_DISCO_POLYS));

        // applyLayout
        transformer.applyLayout();
        layout.setProperty(DisCoOptions.DEBUG_DISCO_GRAPH, dc);
        String applyBody = dumpBody(layout);
        stops.add("{\"step\": \"" + S_APPLY + "\", " + applyBody + "}");
        flag(flags, "applyLayout:ports", !layout.getPorts().isEmpty());

        // the stepwise run must equal a plain provider run on a fresh import
        ElkNode copy = ElkGraphJson.forGraph(inputJson).toElk();
        ElkNode copyLayout = layoutNode(copy, layoutId);
        new DisCoLayoutProvider().layout(copyLayout, new BasicProgressMonitor());
        if (!applyBody.equals(dumpBody(copyLayout))) {
            throw new Bug("the stepwise run differs from DisCoLayoutProvider.layout:\n" + applyBody + "\n" + dumpBody(copyLayout));
        }
        if (layoutId.equals(ROOT_ID)) {
            ElkNode engine = ElkGraphJson.forGraph(inputJson).toElk();
            new RecursiveGraphLayoutEngine().layout(engine, new BasicProgressMonitor());
            if (!applyBody.equals(dumpBody(engine))) {
                throw new Bug("the stepwise run differs from the engine run");
            }
        }
        for (String s : STEPS) {
            flags.put("stop:" + s, 1);
        }
        StringBuilder sb = new StringBuilder("{\"layoutNode\": " + q(layoutId) + ", \"steps\": [");
        for (int i = 0; i < STEPS.size(); i++) {
            sb.append(i == 0 ? "" : ", ").append('"').append(STEPS.get(i)).append('"');
        }
        sb.append("], \"stops\": [\n");
        for (int i = 0; i < stops.size(); i++) {
            sb.append(stops.get(i)).append(i + 1 < stops.size() ? ",\n" : "\n");
        }
        sb.append("]}");
        return new Outcome(false, sb.toString().replace("\n", ""), flags);
    }

    static void flag(Map<String, Integer> flags, String name, boolean on) {
        if (on) {
            flags.put(name, 1);
        }
    }

    static String splitStop(ElkNode layout, List<List<ElkNode>> split, boolean applied, String after) {
        Map<ElkNode, Set<ElkNode>> incidence = getField(null, ElkGraphComponentsProcessor.class, "incidenceMap");
        List<ElkNode> children = layout.getChildren();
        List<String> comps = new ArrayList<>();
        for (List<ElkNode> comp : split) {
            List<String> dfs = new ArrayList<>();
            for (ElkNode n : comp) {
                dfs.add(q(id(n)));
            }
            comps.add("{\"first\": " + q(id(comp.get(0))) + ", \"nodes\": " + list(idsInOrder(comp, children)) + ", \"dfsOrder\": "
                    + list(dfs) + "}");
        }
        List<String> inc = new ArrayList<>();
        for (ElkNode n : children) {
            inc.add("{\"id\": " + q(id(n)) + ", \"adjacent\": " + list(idsInOrder(incidence.get(n), children)) + "}");
        }
        return "{\"step\": \"" + S_SPLIT + "\", \"componentLayoutApplied\": " + applied + ", \"afterComponentLayout\": " + after
                + ", \"components\": " + list(comps) + ", \"incidence\": " + list(inc) + "}";
    }

    /** The quoted ids of the given nodes in the order of the node list (a stable order for a hash set). */
    static List<String> idsInOrder(Collection<ElkNode> subset, List<ElkNode> order) {
        List<String> r = new ArrayList<>();
        for (ElkNode n : order) {
            if (subset.contains(n)) {
                r.add(q(id(n)));
            }
        }
        return r;
    }

    // ---- import stop

    record Entry(String json, int rank, double[] b, String ref) { }

    record Cand(String kind, ElkGraphElement el, double x0, double y0, double w, double h) { }

    static int prio(ElkGraphElement e) {
        return e instanceof ElkNode ? 3 : e instanceof ElkEdge ? 2 : 1;
    }

    static String importStop(DCGraph dc, ElkGraphTransformer tr, List<List<ElkNode>> split, double cs, String layoutId,
            Map<String, Integer> flags) {
        Map<ElkGraphElement, DCElement> mapping = getField(tr, ElkGraphTransformer.class, "elementMapping");
        Map<ElkEdge, DCExtension> in = getField(tr, ElkGraphTransformer.class, "incomingExtensionsMapping");
        Map<ElkEdge, DCExtension> out = getField(tr, ElkGraphTransformer.class, "outgoingExtensionsMapping");
        if (in.size() + out.size() > MAX_EXTENSION_ENTRIES) {
            throw new Bug("more than " + MAX_EXTENSION_ENTRIES + " extension entries: " + (in.size() + out.size()));
        }
        if (!in.isEmpty() || !out.isEmpty()) {
            String note = "extension-map order " + CURRENT_ROW + " " + describeOrder(in, out);
            if (!NOTES.contains(note)) {
                NOTES.add(note);
            }
        }
        IdentityHashMap<DCElement, ElkGraphElement> ref = new IdentityHashMap<>();
        for (Map.Entry<ElkGraphElement, DCElement> e : mapping.entrySet()) {
            ElkGraphElement cur = ref.get(e.getValue());
            if (cur == null || prio(e.getKey()) > prio(cur)) {
                ref.put(e.getValue(), e.getKey());
            }
        }
        List<DCComponent> comps = new ArrayList<>(dc.getComponents());
        if (comps.size() != split.size()) {
            throw new Bug("component count differs from the split");
        }
        List<String> compJson = new ArrayList<>();
        Set<String> sharedPorts = new HashSet<>();
        Set<String> seenPorts = new HashSet<>();
        for (Map.Entry<ElkEdge, DCExtension> e : concat(in, out)) {
            ElkPort p = in.containsKey(e.getKey()) ? ElkGraphUtil.getSourcePort(e.getKey()) : ElkGraphUtil.getTargetPort(e.getKey());
            if (p != null && !seenPorts.add(id(p))) {
                sharedPorts.add(id(p));
            }
        }
        flag(flags, "sharedPort", !sharedPorts.isEmpty());
        for (int i = 0; i < comps.size(); i++) {
            DCComponent c = comps.get(i);
            List<Cand> cands = candidates(split.get(i), cs);
            boolean[] used = new boolean[cands.size()];
            List<Entry> entries = new ArrayList<>();
            for (DCElement el : c.getElements()) {
                entries.add(element(el, ref, in, out, cands, used, flags));
            }
            entries.sort((a, b) -> {
                int r = Integer.compare(a.rank, b.rank);
                for (int k = 0; r == 0 && k < a.b.length; k++) {
                    r = Double.compare(a.b[k], b.b[k]);
                }
                return r != 0 ? r : a.ref.compareTo(b.ref);
            });
            List<String> js = new ArrayList<>();
            for (Entry e : entries) {
                js.add(e.json);
            }
            KVector dims = c.getDimensionsOfBoundingRectangle();
            compJson.add("{\"index\": " + i + ", \"first\": " + q(id(split.get(i).get(0))) + ", \"id\": " + c.getId()
                    + ", \"offset\": " + point(c.getOffset()) + ", \"minCorner\": " + point(c.getMinCorner()) + ", \"bounds\": "
                    + point(dims) + ", \"elements\": " + list(js) + "}");
        }
        flag(flags, "components>1", comps.size() > 1);
        flag(flags, "components==1", comps.size() == 1);
        KVector dim = dc.getDimensions();
        return "{\"step\": \"" + S_IMPORT + "\", \"componentSpacing\": " + hex(cs) + ", \"inset\": " + hex(dc.getInset())
                + ", \"dimensions\": " + (dim == null ? "null" : point(dim)) + ", \"props\": " + propsJson(dc)
                + ", \"components\": " + list(compJson) + "}";
    }

    static List<Map.Entry<ElkEdge, DCExtension>> concat(Map<ElkEdge, DCExtension> a, Map<ElkEdge, DCExtension> b) {
        List<Map.Entry<ElkEdge, DCExtension>> r = new ArrayList<>(a.entrySet());
        r.addAll(b.entrySet());
        return r;
    }

    static String describeOrder(Map<ElkEdge, DCExtension> in, Map<ElkEdge, DCExtension> out) {
        List<String> a = new ArrayList<>(), b = new ArrayList<>();
        for (ElkEdge e : in.keySet()) {
            a.add(id(e));
        }
        for (ElkEdge e : out.keySet()) {
            b.add(id(e));
        }
        return "in=" + a + " out=" + b;
    }

    /** The shapes the transformer makes for node labels, ports and port labels (not kept in elementMapping), with the same arithmetic. */
    static List<Cand> candidates(List<ElkNode> nodes, double cs) {
        List<Cand> r = new ArrayList<>();
        for (ElkNode n : nodes) {
            double nx = n.getX(), ny = n.getY();
            for (ElkLabel l : n.getLabels()) {
                r.add(cand("nodeLabel", l, nx, ny, cs));
            }
            for (ElkPort p : n.getPorts()) {
                r.add(cand("port", p, nx, ny, cs));
                double px = p.getX() + nx, py = p.getY() + ny;
                for (ElkLabel l : p.getLabels()) {
                    r.add(cand("portLabel", l, px, py, cs));
                }
            }
        }
        return r;
    }

    static Cand cand(String kind, org.eclipse.elk.graph.ElkShape s, double ox, double oy, double cs) {
        double half = cs / 2;
        double x0 = s.getX() + ox - half;
        double y0 = s.getY() + oy - half;
        double x1 = x0 + s.getWidth() + cs;
        double y1 = y0 + s.getHeight() + cs;
        return new Cand(kind, (ElkGraphElement) s, x0, y0, x1 - x0, y1 - y0);
    }

    static Entry element(DCElement el, IdentityHashMap<DCElement, ElkGraphElement> ref, Map<ElkEdge, DCExtension> in,
            Map<ElkEdge, DCExtension> out, List<Cand> cands, boolean[] used, Map<String, Integer> flags) {
        ElkGraphElement src = ref.get(el);
        String kind, refId;
        if (src != null) {
            kind = src instanceof ElkNode ? "node" : src instanceof ElkEdge
                    ? (in.containsKey(src) || out.containsKey(src) ? "extEdge" : "edge") : "edgeLabel";
            refId = id(src);
        } else {
            kind = null;
            refId = null;
            ElkRectangle b = el.getBounds();
            for (int k = 0; k < cands.size() && kind == null; k++) {
                Cand c = cands.get(k);
                if (!used[k] && c.x0 == b.x && c.y0 == b.y && c.w == b.width && c.h == b.height) {
                    used[k] = true;
                    kind = c.kind;
                    refId = id(c.el);
                }
            }
            if (kind == null) {
                throw new Bug("cannot identify a DCElement with bounds " + b);
            }
        }
        flag(flags, "element:" + kind, true);
        ElkRectangle b = el.getBounds();
        List<String> shape = new ArrayList<>();
        // the polygon is private to DCElement; getCoords() flattens it to x0, y0, x1, y1, ...
        double[] coords = el.getCoords();
        for (int k = 0; k + 1 < coords.length; k += 2) {
            shape.add(point(coords[k], coords[k + 1]));
        }
        List<DCExtension> exts = new ArrayList<>(el.getExtensions());
        exts.sort((a, c) -> {
            int r = Integer.compare(a.getDirection().ordinal(), c.getDirection().ordinal());
            r = r != 0 ? r : Double.compare(a.getOffset().x, c.getOffset().x);
            r = r != 0 ? r : Double.compare(a.getOffset().y, c.getOffset().y);
            return r != 0 ? r : Double.compare(a.getWidth(), c.getWidth());
        });
        List<String> ej = new ArrayList<>();
        for (DCExtension e : exts) {
            ej.add("{\"dir\": \"" + e.getDirection().name() + "\", \"offset\": " + point(e.getOffset()) + ", \"width\": "
                    + hex(e.getWidth()) + "}");
            flag(flags, "ext:" + e.getDirection().name(), true);
        }
        flag(flags, "ext:onShapeOfEdge", kind.equals("extEdge") && !exts.isEmpty());
        flag(flags, "ext:onNode", kind.equals("node") && !exts.isEmpty());
        KVector pc = el.getParentcoords();
        String json = "{\"kind\": \"" + kind + "\", \"ref\": " + q(refId) + ", \"shape\": " + list(shape) + ", \"bounds\": "
                + box4(b.x, b.y, b.width, b.height) + ", \"parentCoords\": " + (pc == null ? "null" : point(pc))
                + ", \"extensions\": " + list(ej) + "}";
        return new Entry(json, KINDS.indexOf(kind), new double[] {b.x, b.y, b.width, b.height}, refId);
    }

    static String propsJson(DCGraph dc) {
        TreeMap<String, String> m = new TreeMap<>();
        for (Map.Entry<IProperty<?>, Object> e : dc.getAllProperties().entrySet()) {
            m.put(e.getKey().getId(), propValue(e.getValue()));
        }
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, String> e : m.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append(q(e.getKey())).append(": ").append(e.getValue());
        }
        return sb.append('}').toString();
    }

    static String propValue(Object v) {
        if (v == null) {
            return "null";
        } else if (v instanceof Double || v instanceof Float) {
            return hex(((Number) v).doubleValue());
        } else if (v instanceof Number || v instanceof Boolean) {
            return v.toString();
        } else if (v instanceof Enum<?> e) {
            return q(e.name());
        } else if (v instanceof String s) {
            return q(s);
        } else if (v instanceof ElkPadding p) {
            return padding(p);
        } else if (v instanceof ElkMargin m) {
            return margin(m);
        } else if (v instanceof KVectorChain c) {
            List<String> ps = new ArrayList<>();
            for (KVector k : c) {
                ps.add(point(k));
            }
            return list(ps);
        } else if (v instanceof KVector k) {
            return point(k);
        } else if (v instanceof Set<?> s) {
            List<String> names = new ArrayList<>();
            for (Object o : s) {
                names.add(o instanceof Enum<?> e ? e.name() : String.valueOf(o));
            }
            Collections.sort(names);
            List<String> qs = new ArrayList<>();
            for (String n : names) {
                qs.add(q(n));
            }
            return list(qs);
        }
        throw new Bug("unsupported property value " + v.getClass().getName());
    }

    // ---- compactor stops

    static void compact(DisCoPolyominoCompactor c, DCGraph dc, List<String> stops, Map<String, Integer> flags) {
        Class<?> k = DisCoPolyominoCompactor.class;
        // compact(): initialisation
        setField(c, k, "cmpGraph", dc);
        setField(c, k, "polys", new ArrayList<DCPolyomino>());
        double recommendation = call(c, "computeCellSize", dc);
        double cellX = recommendation, cellY = recommendation;
        boolean fill = dc.getProperty(PolyominoOptions.POLYOMINO_FILL);
        Double aspect = dc.getProperty(CoreOptions.ASPECT_RATIO);
        if (aspect == null) {
            aspect = 1.0;
        }
        if (aspect > 1.0) {
            cellX *= aspect;
        } else {
            cellY /= aspect;
        }
        setField(c, k, "gridCellSizeX", cellX);
        setField(c, k, "gridCellSizeY", cellY);
        setField(c, k, "fill", fill);
        setField(c, k, "aspectRatio", aspect);
        List<DCComponent> comps = new ArrayList<>(dc.getComponents());
        List<String> bounds = new ArrayList<>();
        for (DCComponent comp : comps) {
            bounds.add(point(comp.getDimensionsOfBoundingRectangle()));
        }
        double upper = getField(c, k, "upperBound");
        stops.add("{\"step\": \"" + S_CELL + "\", \"componentCount\": " + comps.size() + ", \"componentBounds\": " + list(bounds)
                + ", \"recommendation\": " + hex(recommendation) + ", \"cellSizeX\": " + hex(cellX) + ", \"cellSizeY\": " + hex(cellY)
                + ", \"aspectRatio\": " + hex(aspect) + ", \"fill\": " + fill + ", \"upperBound\": " + hex(upper) + "}");

        // 1.) createPolyominoes
        call(c, "createPolyominoes");
        List<DCPolyomino> polys = getField(c, k, "polys");
        for (DCPolyomino p : polys) {
            if (p.getCellSizeX() != cellX || p.getCellSizeY() != cellY) {
                throw new Bug("cell sizes of the polyomino differ from the recorder's replay of compact()");
            }
        }
        List<String> before = new ArrayList<>();
        List<String> beforeCells = new ArrayList<>();
        for (DCPolyomino p : polys) {
            String cells = rle(p).toString();
            beforeCells.add(cells);
            before.add(polyJson(p, comps.indexOf(p.getRepresentee()), flags));
        }
        stops.add("{\"step\": \"" + S_POLYS + "\", \"polys\": " + list(before) + "}");

        // 2.) packPolyominoes
        call(c, "packPolyominoes");
        polys = getField(c, k, "polys");
        PlanarGrid grid = getField(c, k, "grid");
        List<String> packed = new ArrayList<>();
        List<String> order = new ArrayList<>();
        boolean fillChanged = false;
        for (DCPolyomino p : polys) {
            int index = comps.indexOf(p.getRepresentee());
            order.add(String.valueOf(index));
            packed.add(polyJson(p, index, flags));
            fillChanged |= !rle(p).toString().equals(beforeCells.get(index));
        }
        flag(flags, "fillChangedCells", fillChanged);
        Quadruple<Integer, Integer, Integer, Integer> crop = grid.getFilledBounds();
        stops.add("{\"step\": \"" + S_PACK + "\", \"order\": " + list(order) + ", \"polys\": " + list(packed) + ", \"grid\": {\"w\": "
                + grid.getWidth() + ", \"h\": " + grid.getHeight() + ", \"centerX\": " + grid.getCenterX() + ", \"centerY\": "
                + grid.getCenterY() + ", \"cells\": " + rle(grid) + "}, \"filledBounds\": [" + crop.getFirst() + ", " + crop.getSecond()
                + ", " + crop.getThird() + ", " + crop.getFourth() + "]}");

        // 3.) applyToDCGraph, then the debug property compact() sets
        call(c, "applyToDCGraph");
        dc.setProperty(DisCoOptions.DEBUG_DISCO_POLYS, polys);
        List<String> offsets = new ArrayList<>();
        for (int i = 0; i < comps.size(); i++) {
            offsets.add("{\"index\": " + i + ", \"offset\": " + point(comps.get(i).getOffset()) + "}");
        }
        List<String> pos = new ArrayList<>();
        for (DCPolyomino p : polys) {
            pos.add("{\"component\": " + comps.indexOf(p.getRepresentee()) + ", \"id\": " + p.getId() + ", \"x\": " + p.getX()
                    + ", \"y\": " + p.getY() + "}");
        }
        stops.add("{\"step\": \"" + S_APPLY_DC + "\", \"dimensions\": " + point(dc.getDimensions()) + ", \"components\": "
                + list(offsets) + ", \"polys\": " + list(pos) + ", \"debugPolys\": " + polys.size() + "}");
    }

    static String polyJson(DCPolyomino p, int component, Map<String, Integer> flags) {
        List<UniqueTriple<org.eclipse.elk.alg.common.polyomino.structures.Direction, Integer, Integer>> exts =
                new ArrayList<>(((Polyomino) p).getPolyominoExtensions());
        exts.sort((a, b) -> {
            int r = Integer.compare(a.getFirst().ordinal(), b.getFirst().ordinal());
            r = r != 0 ? r : Integer.compare(a.getSecond(), b.getSecond());
            return r != 0 ? r : Integer.compare(a.getThird(), b.getThird());
        });
        List<String> ej = new ArrayList<>();
        for (var e : exts) {
            ej.add("{\"dir\": \"" + e.getFirst().name() + "\", \"offset\": " + e.getSecond() + ", \"width\": " + e.getThird() + "}");
        }
        flag(flags, "polyExtensions>0", !exts.isEmpty());
        return "{\"component\": " + component + ", \"id\": " + p.getId() + ", \"x\": " + p.getX() + ", \"y\": " + p.getY()
                + ", \"w\": " + p.getWidth() + ", \"h\": " + p.getHeight() + ", \"centerX\": " + p.getCenterX() + ", \"centerY\": "
                + p.getCenterY() + ", \"cellSizeX\": " + hex(p.getCellSizeX()) + ", \"cellSizeY\": " + hex(p.getCellSizeY())
                + ", \"offset\": " + point(p.getOffset()) + ", \"cells\": " + rle(p) + ", \"extensions\": " + list(ej) + "}";
    }

    /** One run-length coded string per grid row: "<count><char>" pairs, "_" empty, "X" blocked, "w" weakly blocked. */
    static RleRows rle(PlanarGrid g) {
        List<String> rows = new ArrayList<>();
        for (int y = 0; y < g.getHeight(); y++) {
            StringBuilder sb = new StringBuilder();
            char prev = 0;
            int run = 0;
            for (int x = 0; x < g.getWidth(); x++) {
                char ch = g.isEmpty(x, y) ? '_' : g.isBlocked(x, y) ? 'X' : g.isWeaklyBlocked(x, y) ? 'w' : '?';
                if (ch == '?') {
                    throw new Bug("grid cell in the fourth state");
                }
                if (ch == prev) {
                    run++;
                } else {
                    if (run > 0) {
                        sb.append(run).append(prev);
                    }
                    prev = ch;
                    run = 1;
                }
            }
            if (run > 0) {
                sb.append(run).append(prev);
            }
            rows.add(q(sb.toString()));
        }
        return new RleRows(rows);
    }

    record RleRows(List<String> rows) {
        @Override
        public String toString() {
            return list(rows);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // The ELK dump

    static String dumpBody(ElkNode top) {
        Dump d = new Dump();
        d.run(top);
        return "\"graph\": " + d.graph + ", \"nodes\": " + list(d.nodes) + ", \"ports\": " + list(d.ports) + ", \"labels\": "
                + list(d.labels) + ", \"edges\": " + list(d.edges) + ", \"debug\": " + list(d.debug);
    }

    static final class Dump {
        String graph;
        final List<String> nodes = new ArrayList<>(), ports = new ArrayList<>(), labels = new ArrayList<>(),
                edges = new ArrayList<>(), debug = new ArrayList<>();
        final Set<String> seen = new HashSet<>();

        void run(ElkNode top) {
            graph = box(unique(id(top)), top.getX(), top.getY(), top.getWidth(), top.getHeight());
            debug(top);
            labels(top.getLabels());
            ports(top);
            visit(top);
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
            for (ElkNode n : parent.getChildren()) {
                String nid = unique(id(n));
                nodes.add(box(nid, n.getX(), n.getY(), n.getWidth(), n.getHeight()));
                debug(n);
                labels(n.getLabels());
                ports(n);
                visit(n);
            }
            for (ElkEdge e : parent.getContainedEdges()) {
                String eid = unique(id(e));
                StringBuilder sb = new StringBuilder("{\"id\": " + q(eid) + ", \"sections\": [");
                int i = 0;
                for (ElkEdgeSection sec : e.getSections()) {
                    sb.append(i++ == 0 ? "" : ", ").append("{\"start\": ").append(point(sec.getStartX(), sec.getStartY()))
                            .append(", \"end\": ").append(point(sec.getEndX(), sec.getEndY())).append(", \"bends\": [");
                    int j = 0;
                    for (ElkBendPoint b : sec.getBendPoints()) {
                        sb.append(j++ == 0 ? "" : ", ").append(point(b.getX(), b.getY()));
                    }
                    sb.append("]}");
                }
                sb.append("], \"junctions\": ");
                sb.append(e.hasProperty(CoreOptions.JUNCTION_POINTS) ? propValue(e.getProperty(CoreOptions.JUNCTION_POINTS)) : "null");
                edges.add(sb.append('}').toString());
                labels(e.getLabels());
            }
        }

        void labels(List<ElkLabel> ls) {
            for (ElkLabel l : ls) {
                String lid = unique(id(l));
                labels.add(box(lid, l.getX(), l.getY(), l.getWidth(), l.getHeight()));
                labels(l.getLabels());
            }
        }

        void debug(ElkNode n) {
            boolean polys = n.hasProperty(DisCoOptions.DEBUG_DISCO_POLYS), graphSet = n.hasProperty(DisCoOptions.DEBUG_DISCO_GRAPH);
            if (!polys && !graphSet) {
                return;
            }
            String p = "null", c = "null", d = "null";
            if (polys) {
                p = String.valueOf(((List<?>) n.getProperty(DisCoOptions.DEBUG_DISCO_POLYS)).size());
            }
            if (graphSet) {
                DCGraph g = (DCGraph) n.getProperty(DisCoOptions.DEBUG_DISCO_GRAPH);
                c = String.valueOf(g.getComponents().size());
                d = g.getDimensions() == null ? "null" : point(g.getDimensions());
            }
            debug.add("{\"id\": " + q(id(n)) + ", \"polys\": " + p + ", \"comps\": " + c + ", \"dims\": " + d + "}");
        }
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

    static String box4(double x, double y, double w, double h) {
        return "[" + hex(x) + ", " + hex(y) + ", " + hex(w) + ", " + hex(h) + "]";
    }

    static String point(double x, double y) {
        return "[" + hex(x) + ", " + hex(y) + "]";
    }

    static String point(KVector v) {
        return point(v.x, v.y);
    }

    static String margin(ElkMargin m) {
        return "[" + hex(m.top) + ", " + hex(m.right) + ", " + hex(m.bottom) + ", " + hex(m.left) + "]";
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

    static void countCoverage(String group, ElkNode g) {
        cover("aspectRatio", valueOf(g, CoreOptions.ASPECT_RATIO), group);
        cover("polyomino.fill", valueOf(g, PolyominoOptions.POLYOMINO_FILL), group);
        cover("polyomino.lowLevelSort", valueOf(g, PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT), group);
        cover("polyomino.highLevelSort", valueOf(g, PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT), group);
        cover("polyomino.traversalStrategy", valueOf(g, PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY), group);
        cover("componentCompaction.strategy", valueOf(g, DisCoMetaDataProvider.COMPONENT_COMPACTION_STRATEGY), group);
        cover("componentCompaction.componentLayoutAlgorithm",
                g.hasProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM)
                        ? g.getProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM) : "unset", group);
        cover("spacing.componentComponent", valueOf(g, CoreOptions.SPACING_COMPONENT_COMPONENT), group);
        cover("padding", g.hasProperty(CoreOptions.PADDING) ? "explicit" : "default", group);
        Set<String> thick = new TreeSet<>();
        for (ElkEdge e : g.getContainedEdges()) {
            thick.add(e.hasProperty(CoreOptions.EDGE_THICKNESS) ? String.valueOf(e.getProperty(CoreOptions.EDGE_THICKNESS)) : "default");
        }
        cover("edge.thickness", thick.isEmpty() ? "no edges" : thick.size() == 1 ? thick.iterator().next() : "mixed " + thick, group);
    }

    static String valueOf(ElkNode g, IProperty<?> p) {
        return (g.hasProperty(p) ? "" : "default:") + g.getProperty(p);
    }

    static void cover(String option, String value, String group) {
        int[] c = COVERAGE.computeIfAbsent(option, k -> new TreeMap<>()).computeIfAbsent(value, k -> new int[3]);
        c[List.of(FULL, STOPS, THROWS).indexOf(group)]++;
    }

    static String coverageJson() {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Map<String, int[]>> e : COVERAGE.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": {");
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
    // Factors (one at a time, FD2) applied to the layout node

    static void allEdges(ElkNode layout, Consumer<ElkEdge> c) {
        for (ElkEdge e : layout.getContainedEdges()) {
            c.accept(e);
        }
    }

    static List<Factor> factors() {
        List<Factor> f = new ArrayList<>();
        f.add(new Factor("default", g -> { }));
        f.add(new Factor("spacing5", g -> g.setProperty(CoreOptions.SPACING_COMPONENT_COMPONENT, 5.0)));
        f.add(new Factor("spacing60", g -> g.setProperty(CoreOptions.SPACING_COMPONENT_COMPONENT, 60.0)));
        f.add(new Factor("thickness3", g -> allEdges(g, e -> e.setProperty(CoreOptions.EDGE_THICKNESS, 3.0))));
        f.add(new Factor("padding", g -> g.setProperty(CoreOptions.PADDING, new ElkPadding(2, 7, 11, 13))));
        f.add(new Factor("aspect2_5", g -> g.setProperty(CoreOptions.ASPECT_RATIO, 2.5)));
        f.add(new Factor("aspect0_4", g -> g.setProperty(CoreOptions.ASPECT_RATIO, 0.4)));
        f.add(new Factor("aspect1", g -> g.setProperty(CoreOptions.ASPECT_RATIO, 1.0)));
        f.add(new Factor("fillFalse", g -> g.setProperty(PolyominoOptions.POLYOMINO_FILL, false)));
        f.add(new Factor("fillTrue", g -> g.setProperty(PolyominoOptions.POLYOMINO_FILL, true)));
        for (LowLevelSortingCriterion v : LowLevelSortingCriterion.values()) {
            f.add(new Factor("low" + v.name(), g -> g.setProperty(PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT, v)));
        }
        for (HighLevelSortingCriterion v : HighLevelSortingCriterion.values()) {
            f.add(new Factor("high" + v.name(), g -> g.setProperty(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT, v)));
        }
        for (TraversalStrategy v : TraversalStrategy.values()) {
            f.add(new Factor("trav" + v.name(), g -> g.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY, v)));
        }
        f.add(new Factor("strategyPolyomino",
                g -> g.setProperty(DisCoMetaDataProvider.COMPONENT_COMPACTION_STRATEGY, CompactionStrategy.POLYOMINO)));
        f.add(new Factor("algForce", g -> g.setProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM, "force")));
        f.add(new Factor("algLayered", g -> g.setProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM, "layered")));
        f.add(new Factor("algLayeredFullId",
                g -> g.setProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM, LayeredOptions.ALGORITHM_ID)));
        f.add(new Factor("algUnknown", g -> g.setProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM, "nosuchalgo")));
        return f;
    }

    static final List<Factor> DEFAULT_ONLY = List.of(new Factor("default", g -> { }));

    /** Combined rows (a few factors at once); each is also crossed with the bases. */
    static List<Factor> combined() {
        return List.of(
                new Factor("combo1", g -> {
                    g.setProperty(CoreOptions.ASPECT_RATIO, 2.5);
                    g.setProperty(PolyominoOptions.POLYOMINO_FILL, false);
                    g.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY, TraversalStrategy.SPIRAL);
                    g.setProperty(PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT, LowLevelSortingCriterion.BY_SIZE);
                    g.setProperty(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT,
                            HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST);
                    g.setProperty(CoreOptions.SPACING_COMPONENT_COMPONENT, 5.0);
                }),
                new Factor("combo2", g -> {
                    g.setProperty(CoreOptions.ASPECT_RATIO, 0.4);
                    g.setProperty(CoreOptions.PADDING, new ElkPadding(2, 7, 11, 13));
                    g.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY, TraversalStrategy.MANHATTAN);
                    g.setProperty(CoreOptions.SPACING_COMPONENT_COMPONENT, 60.0);
                    allEdges(g, e -> e.setProperty(CoreOptions.EDGE_THICKNESS, 3.0));
                }),
                new Factor("combo3", g -> {
                    g.setProperty(CoreOptions.ASPECT_RATIO, 1.0);
                    g.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY, TraversalStrategy.QUADRANTS_JITTER);
                    g.setProperty(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT,
                            HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST);
                    g.setProperty(CoreOptions.SPACING_COMPONENT_COMPONENT, 0.0);
                    int[] k = {0};
                    allEdges(g, e -> e.setProperty(CoreOptions.EDGE_THICKNESS, 1.0 + (k[0]++ % 3) * 2.0));
                }),
                new Factor("comboForce", g -> {
                    g.setProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM, "force");
                    g.setProperty(CoreOptions.ASPECT_RATIO, 2.5);
                    g.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY, TraversalStrategy.LINE_BY_LINE);
                }),
                new Factor("comboLayered", g -> {
                    g.setProperty(DisCoOptions.COMPONENT_COMPACTION_COMPONENT_LAYOUT_ALGORITHM, "layered");
                    g.setProperty(CoreOptions.ASPECT_RATIO, 0.4);
                    g.setProperty(PolyominoOptions.POLYOMINO_FILL, false);
                }));
    }

    static List<Factor> crossed() {
        List<Factor> all = new ArrayList<>(factors());
        all.addAll(combined());
        return all;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Graph building helpers

    static ElkNode newRoot() {
        ElkNode root = ElkGraphUtil.createGraph();
        root.setIdentifier(ROOT_ID);
        return root;
    }

    static ElkNode node(ElkNode parent, String id, double x, double y, double w, double h) {
        ElkNode n = ElkGraphUtil.createNode(parent);
        n.setIdentifier(id);
        n.setLocation(x, y);
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

    static ElkPort port(ElkNode n, String id, double x, double y, double w, double h, PortSide side) {
        ElkPort p = ElkGraphUtil.createPort(n);
        p.setIdentifier(id);
        p.setLocation(x, y);
        p.setDimensions(w, h);
        p.setProperty(CoreOptions.PORT_SIDE, side);
        return p;
    }

    /** An edge with one section; pts = x0, y0, (bendX, bendY)*, x1, y1 relative to the edge's containing node. */
    static ElkEdge edge(String id, ElkConnectableShape s, ElkConnectableShape t, double... pts) {
        ElkEdge e = ElkGraphUtil.createSimpleEdge(s, t);
        e.setIdentifier(id);
        if (pts.length >= 4) {
            ElkEdgeSection sec = ElkGraphUtil.createEdgeSection(e);
            sec.setStartLocation(pts[0], pts[1]);
            for (int i = 2; i + 3 < pts.length; i += 2) {
                ElkGraphUtil.createBendPoint(sec, pts[i], pts[i + 1]);
            }
            sec.setEndLocation(pts[pts.length - 2], pts[pts.length - 1]);
        }
        return e;
    }

    static double pick(Random r, double[] from) {
        return from[r.nextInt(from.length)];
    }

    /** Adds one component: kind 0 single, 1 pair, 2 path of 3-4, 3 star of 4, 4 cycle of 3, 5 two nodes with a long bent edge. */
    static void component(ElkNode parent, Random r, int c, int kind, double ox, double oy, boolean deco) {
        int count = switch (kind) {
            case 0 -> 1;
            case 1, 5 -> 2;
            case 2 -> 3 + r.nextInt(2);
            case 3 -> 4;
            default -> 3;
        };
        ElkNode[] ns = new ElkNode[count];
        for (int k = 0; k < count; k++) {
            double w = pick(r, WIDTHS), h = pick(r, HEIGHTS);
            double x = kind == 3 ? (k == 0 ? ox + 110 : ox + (k - 1) * 110) : ox + k * 110 + r.nextInt(15);
            double y = kind == 3 ? (k == 0 ? oy : oy + 90) : oy + r.nextInt(40);
            ns[k] = node(parent, "c" + c + "n" + k, x, y, w, h);
            if (deco) {
                label(ns[k], "c" + c + "ln" + k, "N c" + c + "." + k, 0, h + 2);
            }
        }
        int[][] pairs = switch (kind) {
            case 1, 5 -> new int[][] {{0, 1}};
            case 2 -> count == 3 ? new int[][] {{0, 1}, {1, 2}} : new int[][] {{0, 1}, {1, 2}, {2, 3}};
            case 3 -> new int[][] {{0, 1}, {0, 2}, {0, 3}};
            case 4 -> new int[][] {{0, 1}, {1, 2}, {2, 0}};
            default -> new int[0][];
        };
        int ei = 0;
        for (int[] pr : pairs) {
            ElkNode a = ns[pr[0]], b = ns[pr[1]];
            ElkConnectableShape src = a;
            double sx = a.getX() + a.getWidth() / 2, sy = a.getY() + a.getHeight() / 2;
            if (deco && (kind == 3 || kind == 5)) {
                ElkPort p = port(a, "c" + c + "p" + ei, a.getWidth(), a.getHeight() / 2 - 3, 6, 6, PortSide.EAST);
                label(p, "c" + c + "lp" + ei, "p" + ei, 8, -2);
                src = p;
                sx = a.getX() + a.getWidth() + 3;
                sy = a.getY() + a.getHeight() / 2;
            }
            double ex = b.getX() + b.getWidth() / 2, ey = b.getY() + b.getHeight() / 2;
            ElkEdge e;
            boolean bend = kind == 4 && ei == 2 || kind == 5 || deco && ei % 2 == 1;
            if (kind == 5) {
                e = edge("c" + c + "e" + ei, src, b, sx, sy, sx + 20, sy - 25, ex - 20, ey - 25, ex, ey);
            } else if (bend) {
                e = edge("c" + c + "e" + ei, src, b, sx, sy, ex, sy, ex, ey);
            } else {
                e = edge("c" + c + "e" + ei, src, b, sx, sy, ex, ey);
            }
            if (deco && ei % 2 == 0) {
                label(e, "c" + c + "le" + ei, "e" + ei, (sx + ex) / 2, (sy + ey) / 2 - 14);
            }
            ei++;
        }
    }

    static ElkNode multi(long seed, int[] kinds, boolean[] deco, int cols, double step) {
        Random r = new Random(seed);
        ElkNode root = newRoot();
        for (int i = 0; i < kinds.length; i++) {
            component(root, r, i, kinds[i], (i % cols) * step + r.nextInt(40), (i / cols) * step + r.nextInt(40), deco[i]);
        }
        return root;
    }

    static int[] randomKinds(Random r, int n) {
        int[] k = new int[n];
        for (int i = 0; i < n; i++) {
            k[i] = r.nextInt(6);
        }
        return k;
    }

    static boolean[] randomDeco(Random r, int n) {
        boolean[] d = new boolean[n];
        for (int i = 0; i < n; i++) {
            d[i] = r.nextInt(3) == 0;
        }
        return d;
    }

    static boolean[] all(int n, boolean v) {
        boolean[] d = new boolean[n];
        Arrays.fill(d, v);
        return d;
    }

    // ------------------------------------------------------------------------------------------------------------
    // The ext shapes: layout node g (a child of the root) with ports and parent-port edges

    static final double G_X = 10, G_Y = 15, G_W = 420, G_H = 300, PORT_SIZE = 8;

    static ElkNode extRoot() {
        ElkNode root = newRoot();
        root.setDimensions(0, 0);
        return root;
    }

    static ElkNode extGraph(ElkNode root) {
        ElkNode g = node(root, GRAPH_ID, G_X, G_Y, G_W, G_H);
        label(g, "gl", "Compound g", 10, 5);
        return g;
    }

    /** A port of g on the given side, centred at the given coordinate along the side (just outside the border). */
    static ElkPort gPort(ElkNode g, String id, PortSide side, double along) {
        double half = PORT_SIZE / 2;
        return switch (side) {
            case WEST -> port(g, id, -PORT_SIZE, along - half, PORT_SIZE, PORT_SIZE, side);
            case EAST -> port(g, id, G_W, along - half, PORT_SIZE, PORT_SIZE, side);
            case NORTH -> port(g, id, along - half, -PORT_SIZE, PORT_SIZE, PORT_SIZE, side);
            default -> port(g, id, along - half, G_H, PORT_SIZE, PORT_SIZE, side);
        };
    }

    /**
     * An incoming (port to child) or outgoing (child to port) extension edge. The outer end is on g's border at `along`; the inner end
     * is the middle of the child's facing side; bend = an extra bend point two thirds of the way along the outer axis.
     */
    static ElkEdge extEdge(String id, boolean incoming, ElkPort p, ElkNode child, PortSide side, double along, boolean bend) {
        double cx = child.getX(), cy = child.getY(), cw = child.getWidth(), ch = child.getHeight();
        double ox, oy, ix, iy;
        switch (side) {
            case WEST -> { ox = 0; oy = along; ix = cx; iy = cy + ch / 2; }
            case EAST -> { ox = G_W; oy = along; ix = cx + cw; iy = cy + ch / 2; }
            case NORTH -> { ox = along; oy = 0; ix = cx + cw / 2; iy = cy; }
            default -> { ox = along; oy = G_H; ix = cx + cw / 2; iy = cy + ch; }
        }
        boolean horizontal = side == PortSide.WEST || side == PortSide.EAST;
        double bx = horizontal ? ox + (ix - ox) * 2 / 3 : ox, by = horizontal ? oy : oy + (iy - oy) * 2 / 3;
        double[] pts = bend ? new double[] {ox, oy, bx, by, ix, iy} : new double[] {ox, oy, ix, iy};
        if (!incoming) {
            double[] rev = new double[pts.length];
            // pts holds (x, y) pairs, so i + 1 < pts.length is the same bound as i < pts.length; written out so the
            // pair access below is visibly in bounds.
            for (int i = 0; i + 1 < pts.length; i += 2) {
                rev[i] = pts[pts.length - 2 - i];
                rev[i + 1] = pts[pts.length - 1 - i];
            }
            pts = rev;
        }
        return incoming ? edge(id, p, child, pts) : edge(id, child, p, pts);
    }

    /** The base ext graph: 4 extension entries (in west with a bend, out east, in north, out south) and plain components. */
    static ElkNode ext(long seed) {
        Random r = new Random(seed);
        ElkNode root = extRoot();
        ElkNode g = extGraph(root);
        ElkNode a = node(g, "ca", 60, 100, 40, 30);
        ElkNode b = node(g, "cb", 130, 105, 40, 30);
        ElkNode c = node(g, "cc", 200, 100, 40, 30);
        label(a, "lca", "node a", 0, 32);
        edge("eab", a, b, 100, 115, 130, 120);
        edge("ebc", b, c, 170, 120, 185, 130, 200, 115);
        ElkNode d = node(g, "cd", 180, 10, 50, 40);
        label(d, "lcd", "node d", 52, 0);
        ElkNode e = node(g, "ce", 150, 230, 60, 40);
        ElkNode f = node(g, "cf", 300, 150, 40, 30);
        ElkNode h = node(g, "ch", 360, 200, 30, 30);
        edge("efh", f, h, 320, 165, 320, 215, 360, 215);
        ElkNode i = node(g, "ci", 300, 30, 50 + r.nextInt(20), 40);
        ElkPort ip = port(i, "ip", i.getWidth(), 17, 6, 6, PortSide.EAST);
        label(ip, "lip", "ip", 8, -2);
        node(g, "cj", 20, 230, 40, 40);
        ElkPort pw = gPort(g, "pw", PortSide.WEST, 130);
        ElkPort pe = gPort(g, "pe", PortSide.EAST, 115);
        ElkPort pn = gPort(g, "pn", PortSide.NORTH, 205);
        ElkPort ps = gPort(g, "ps", PortSide.SOUTH, 180);
        extEdge("xinw", true, pw, a, PortSide.WEST, 130, true);
        extEdge("xoute", false, pe, c, PortSide.EAST, 125, false);
        extEdge("xinn", true, pn, d, PortSide.NORTH, 205, false);
        ElkEdge so = extEdge("xouts", false, ps, e, PortSide.SOUTH, 180, false);
        label(so, "lxouts", "to s", 182, 275);
        return root;
    }

    /** Two incoming edges at the west port pw (different start heights), one at north: the adjustedPorts site (FD4). */
    static ElkNode extShared() {
        ElkNode root = extRoot();
        ElkNode g = extGraph(root);
        ElkNode a = node(g, "ca", 60, 100, 40, 30);
        ElkNode k = node(g, "ck", 80, 200, 50, 30);
        ElkNode d = node(g, "cd", 180, 10, 50, 40);
        node(g, "ce", 300, 150, 40, 30);
        ElkPort pw = gPort(g, "pw", PortSide.WEST, 100);
        ElkPort pn = gPort(g, "pn", PortSide.NORTH, 205);
        extEdge("xin1", true, pw, a, PortSide.WEST, 100, false);
        extEdge("xin2", true, pw, k, PortSide.WEST, 210, false);
        extEdge("xinn", true, pn, d, PortSide.NORTH, 205, false);
        return root;
    }

    /** One incoming and one outgoing edge at the same west port (the first map iterated is the incoming one), plus a shared east port. */
    static ElkNode extSharedInOut() {
        ElkNode root = extRoot();
        ElkNode g = extGraph(root);
        ElkNode a = node(g, "ca", 60, 60, 40, 30);
        ElkNode c = node(g, "cc", 70, 180, 40, 30);
        ElkNode m = node(g, "cm", 250, 80, 40, 30);
        ElkNode n = node(g, "cn", 260, 190, 40, 30);
        ElkPort pw = gPort(g, "pw", PortSide.WEST, 95);
        ElkPort pe = gPort(g, "pe", PortSide.EAST, 120);
        extEdge("xin", true, pw, a, PortSide.WEST, 70, false);
        extEdge("xout", false, pw, c, PortSide.WEST, 190, true);
        extEdge("xout1", false, pe, m, PortSide.EAST, 100, false);
        extEdge("xout2", false, pe, n, PortSide.EAST, 205, false);
        return root;
    }

    /** All four sides, incoming and outgoing on each: 8 entries, 8 distinct ports. */
    static ElkNode extAllDirs() {
        ElkNode root = extRoot();
        ElkNode g = extGraph(root);
        PortSide[] sides = {PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST};
        // children: per side two nodes close to that side
        double[][][] spot = {
                {{50, 40}, {150, 50}}, // north
                {{340, 40}, {340, 110}}, // east
                {{50, 250}, {170, 240}}, // south
                {{20, 110}, {20, 190}}}; // west
        for (int s = 0; s < 4; s++) {
            PortSide side = sides[s];
            for (int k = 0; k < 2; k++) {
                double[] sp = spot[s][k];
                ElkNode child = node(g, "c" + side.name().charAt(0) + k, sp[0], sp[1], 40, 30);
                double a = side == PortSide.NORTH || side == PortSide.SOUTH ? sp[0] + 20 : sp[1] + 15;
                a += k == 0 ? -6 : 6;
                ElkPort p = gPort(g, "p" + side.name().charAt(0) + k, side, a);
                extEdge("x" + (k == 0 ? "in" : "out") + side.name().charAt(0), k == 0, p, child, side, a, s % 2 == 1 && k == 1);
            }
        }
        return root;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Shapes

    static List<Spec> shapes(Random rnd) throws Exception {
        verifyCorpus();
        List<Spec> out = new ArrayList<>();
        List<Factor> all = crossed();
        // bases crossed with every factor
        long s1 = rnd.nextLong();
        out.add(new Spec("multi6", () -> multi(s1, new int[] {0, 1, 2, 3, 4, 5}, new boolean[] {true, true, true, true, false, true}, 3,
                300), null, true, all));
        long extSeed = rnd.nextLong();
        out.add(new Spec("ext", () -> ext(extSeed), GRAPH_ID, true, all));
        // single-factor-free shapes (default only)
        long sSingle = rnd.nextLong();
        out.add(new Spec("single", () -> multi(sSingle, new int[] {0}, new boolean[] {true}, 1, 0), null, true, DEFAULT_ONLY));
        long s2 = rnd.nextLong();
        out.add(new Spec("twoNodes", () -> multi(s2, new int[] {0, 0}, new boolean[] {false, true}, 2, 200), null, true,
                DEFAULT_ONLY));
        long s3 = rnd.nextLong();
        out.add(new Spec("isolated12", () -> multi(s3, new int[12], all(12, false), 4, 160), null, true, DEFAULT_ONLY));
        rnd.nextLong(); // the identical8 seed: identical() uses none, but the draw keeps every later seed unchanged
        out.add(new Spec("identical8", () -> identical(), null, true, List.of(new Factor("default", g -> { }),
                new Factor("highCorner", g -> g.setProperty(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT,
                        HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST)),
                new Factor("lowBySize", g -> g.setProperty(PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT, LowLevelSortingCriterion.BY_SIZE)),
                new Factor("travSpiral", g -> g.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY, TraversalStrategy.SPIRAL)))));
        long s5 = rnd.nextLong();
        Random rr = new Random(s5);
        int[] k14 = randomKinds(rr, 14);
        boolean[] d14 = randomDeco(rr, 14);
        long m14 = rr.nextLong();
        out.add(new Spec("multi14", () -> multi(m14, k14, d14, 4, 320), null, false, List.of(new Factor("default", g -> { }),
                new Factor("aspect2_5", g -> g.setProperty(CoreOptions.ASPECT_RATIO, 2.5)),
                new Factor("aspect0_4", g -> g.setProperty(CoreOptions.ASPECT_RATIO, 0.4)))));
        int[] k25 = randomKinds(rr, 25);
        boolean[] d25 = randomDeco(rr, 25);
        long m25 = rr.nextLong();
        out.add(new Spec("multi25", () -> multi(m25, k25, d25, 5, 330), null, false, DEFAULT_ONLY));
        long s6 = rnd.nextLong();
        out.add(new Spec("bends", () -> bends(s6), null, true, List.of(new Factor("default", g -> { }),
                new Factor("thickness3", g -> allEdges(g, e -> e.setProperty(CoreOptions.EDGE_THICKNESS, 3.0))),
                new Factor("thickMixed", g -> {
                    int[] k = {0};
                    allEdges(g, e -> e.setProperty(CoreOptions.EDGE_THICKNESS, 1.0 + (k[0]++ % 4) * 2.5));
                }),
                new Factor("junctions", g -> allEdges(g, e -> {
                    if (e.getIdentifier().endsWith("0")) {
                        KVectorChain jp = new KVectorChain();
                        jp.add(new KVector(e.getSections().get(0).getStartX() + 10, e.getSections().get(0).getStartY() + 10));
                        jp.add(new KVector(e.getSections().get(0).getEndX() - 10, e.getSections().get(0).getEndY() + 10));
                        e.setProperty(CoreOptions.JUNCTION_POINTS, jp);
                    }
                })))));
        out.add(new Spec("extShared", DiscoVectors::extShared, GRAPH_ID, true, all.subList(0, 1)));
        out.add(new Spec("extSharedInOut", DiscoVectors::extSharedInOut, GRAPH_ID, true, all.subList(0, 1)));
        out.add(new Spec("extAllDirs", DiscoVectors::extAllDirs, GRAPH_ID, true, List.of(new Factor("default", g -> { }),
                new Factor("highCorner", g -> g.setProperty(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT,
                        HighLevelSortingCriterion.CORNER_CASES_THAN_SINGLE_SIDE_LAST)),
                new Factor("aspect2_5", g -> g.setProperty(CoreOptions.ASPECT_RATIO, 2.5)),
                new Factor("aspect0_4", g -> g.setProperty(CoreOptions.ASPECT_RATIO, 0.4)))));
        out.add(new Spec("extBoundaryWestInRange", () -> extBoundary(PortSide.WEST, 169.0), GRAPH_ID, true, DEFAULT_ONLY));
        out.add(new Spec("extBoundaryNorthInRange", () -> extBoundary(PortSide.NORTH, 219.0), GRAPH_ID, true, DEFAULT_ONLY));
        out.add(new Spec("corpus20", DiscoVectors::loadCorpus, null, true, List.of(new Factor("default", g -> { }),
                new Factor("aspect2_5", g -> g.setProperty(CoreOptions.ASPECT_RATIO, 2.5)))));
        out.add(new Spec("noSection", () -> noSection(), null, true, DEFAULT_ONLY));
        return out;
    }

    /** Eight identical single-node components (ties in every comparator: the stable sorts decide the order). */
    static ElkNode identical() {
        ElkNode root = newRoot();
        for (int i = 0; i < 8; i++) {
            ElkNode n = node(root, "n" + i, (i % 4) * 120, (i / 4) * 120, 40, 30);
            label(n, "ln" + i, "same", 0, 32);
        }
        return root;
    }

    /** Edges with several bends: collinear bends and a zero-length segment (the non-finite intersection arm of getContour), a self loop,
     * a back edge and a multi edge. */
    static ElkNode bends(long seed) {
        Random r = new Random(seed);
        ElkNode root = newRoot();
        ElkNode a = node(root, "a", 20, 20, 40, 30), b = node(root, "b", 200, 25, 40, 30), c = node(root, "c", 120, 140, 30, 30);
        edge("e0", a, b, 60, 35, 100, 35, 140, 35, 200, 40);
        edge("e1", b, c, 220, 55, 220, 55, 220, 100, 150, 155);
        edge("e2", c, a, 120, 155, 60, 200, 30, 120, 40, 50);
        edge("e3", a, a, 40, 20, 40, -10, 80, -10, 80, 35, 60, 35);
        edge("e4", a, b, 60, 40, 130, 70, 200, 45);
        ElkNode d = node(root, "d", 500, 30 + r.nextInt(20), 60, 40);
        ElkNode e = node(root, "e", 600, 200, 50, 40);
        edge("e5", d, e, 560, 50, 580, 50, 580, 140, 600, 140, 600, 220, 600, 220);
        node(root, "f", 450, 300, 30, 30);
        return root;
    }

    /** Components whose edges have no section at all (firstEdgeSection creates one at (0,0)-(0,0)). */
    static ElkNode noSection() {
        ElkNode root = newRoot();
        ElkNode a = node(root, "a", 20, 20, 40, 30), b = node(root, "b", 140, 60, 40, 30), c = node(root, "c", 300, 20, 30, 30);
        edge("e0", a, b);
        edge("e1", b, c);
        node(root, "d", 400, 100, 30, 30);
        return root;
    }

    static ElkNode loadCorpus() {
        try {
            return ElkGraphJson.forGraph(Files.readString(REPO.resolve(CORPUS_FILE), StandardCharsets.UTF_8)).toElk();
        } catch (IOException e) {
            throw new Bug("cannot read " + CORPUS_FILE + ": " + e);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Throw rows

    static List<Spec> throwsSpecs() {
        List<Spec> l = new ArrayList<>();
        l.add(new Spec("rootPortEdge", DiscoVectors::rootPortEdge, null, false, DEFAULT_ONLY));
        l.add(new Spec("hyperedge", DiscoVectors::hyperedge, null, false, DEFAULT_ONLY));
        l.add(new Spec("extOutOfGridWest", () -> extBoundary(PortSide.WEST, 169.5), GRAPH_ID, false, DEFAULT_ONLY));
        l.add(new Spec("extOutOfGridNorth", () -> extBoundary(PortSide.NORTH, 219.5), GRAPH_ID, false, DEFAULT_ONLY));
        l.add(new Spec("negativeAspect", () -> multi(11, new int[] {1, 2}, new boolean[] {false, false}, 2, 300), null, false,
                List.of(new Factor("negativeAspect", g -> g.setProperty(CoreOptions.ASPECT_RATIO, -1.0)))));
        return l;
    }

    /**
     * One 70x70 node alone in g with spacing 20 (a 90x90 component) and one extension edge whose far side ends exactly on the
     * component's border. computeCellSize gives l = 10 exactly for a lone 90x90 component, so pHeight (or pWidth) is 9 and the
     * extension's last cell index is 9: DCPolyomino.addExtensionsToPoly blocks one cell past the grid (weaklyBlockArea).
     * along = 169.5 (west, 100 + 69.5) or 219.5 (north, 150 + 69.5) is the exact case; one half unit less is the last in-range one.
     */
    static ElkNode extBoundary(PortSide side, double along) {
        ElkNode root = extRoot();
        ElkNode g = extGraph(root);
        ElkNode c = node(g, "c0", 150, 100, 70, 70);
        ElkPort p = gPort(g, "p0", side, along);
        if (side == PortSide.WEST) {
            edge("x0", p, c, 0, along, 150, along);
        } else {
            edge("x0", p, c, along, 0, along, 100);
        }
        return root;
    }

    /** A parent-port edge on a root without a parent: sameHierarchyLevel dereferences the parentless root's getParent(). */
    static ElkNode rootPortEdge() {
        ElkNode root = newRoot();
        root.setDimensions(200, 100);
        ElkPort p = port(root, "rp", -8, 40, 8, 8, PortSide.WEST);
        ElkNode a = node(root, "a", 60, 30, 40, 30);
        edge("e0", p, a, 0, 44, 60, 45);
        return root;
    }

    /** An edge with two sources: ElkGraphUtil.getSourceNode rejects a non-simple edge. */
    static ElkNode hyperedge() {
        ElkNode root = newRoot();
        ElkNode a = node(root, "a", 20, 20, 40, 30), b = node(root, "b", 120, 20, 40, 30), c = node(root, "c", 70, 120, 40, 30);
        ElkEdge e = ElkGraphUtil.createHyperedge(List.of(a, b), List.of(c));
        e.setIdentifier("e0");
        ElkEdgeSection sec = ElkGraphUtil.createEdgeSection(e);
        sec.setStartLocation(40, 35);
        sec.setEndLocation(85, 135);
        return root;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Export, labels, JSON helpers

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

    static void verifyCorpus() throws Exception {
        for (String line : CORPUS_TABLE.split("\n")) {
            String l = line.strip();
            if (l.isEmpty()) {
                continue;
            }
            String sha = l.substring(0, l.indexOf("  "));
            Path p = REPO.resolve(l.substring(l.indexOf("repo:") + 5));
            String actual = sha256(p);
            if (!actual.equals(sha)) {
                throw new Bug("model " + p + " has sha256 " + actual + ", the table says " + sha);
            }
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
}
