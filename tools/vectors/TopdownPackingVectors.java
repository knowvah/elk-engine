// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 8c alg-packing, T3, PK1, PK3) for org.eclipse.elk.alg.topdownpacking: what
// TopdownpackingLayoutProvider.layout does at the pinned ELK commit, step by step. This program only CALLS ELK APIs and records
// results; it embeds no ELK implementation.
// Run: tools/vectors/topdownpacking-vectors.sh <outDir>   (java -cp ... TopdownPackingVectors.java <outDir> <tools/vectors dir>)
// ORIGIN: the row format, the NS1 round trip, the NS6 hex doubles, the strictNumbers sanitiser, the throws shape with the first ELK
// frame, the identity-hash guard and the 16 MiB guard are copied from tools/vectors/DiscoVectors.java (single-file launchers share no
// code).
//
// ===== OUTPUT CONTRACT (everything a TypeScript replay needs; no need to read the recorder body) =====
// File <outDir>/topdownpacking.json (2-space top level, ONE compact JSON row per line, trailing newline, strict JSON, under 16 MiB):
//   { jdk, oracle, seed, rowCounts: { full, stops, predicted, throws }, optionCoverage, stopCoverage, rows: [row...] }
//   row = { id, group, input, expected }, ids unique and stable: "<group>/<shape>/<factor>" (throws: "throws/<name>").
//   group in full | stops | predicted | throws. A scenario planned as full, stops or predicted whose run throws is a recorder failure.
//   input = the PREPARED graph (algorithm option and factor applied) exported by ElkGraphJson.forGraph(root).omitLayout(false)
//     .omitZeroDimension(false).omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false) under system properties
//     org.eclipse.elk.graph.json.exportSeed=1 and org.eclipse.elk.graph.util.identifierSeed=1, EMBEDDED as a JSON object. A bare
//     Infinity/-Infinity/NaN token of the exporter is replaced by the string "Infinity"/"-Infinity"/"NaN". Every node and edge has
//     a unique id; no input has ports or labels (the dump fails on one). The LAYOUT NODE is always the root (id "root"); every row's
//     expected carries "layoutNode": "root". The root has elk.algorithm = org.eclipse.elk.topdownpacking, and so has every node with
//     children in the rows named *All* / twoLevel* / threeLevel* / throws (spec flag allNodes); in corpusRoot* only the root has it
//     (its compound children n8, n9 take the default algorithm, layered). All factor options are set on the layout node (root), the
//     level the Java reads them from (P/LeftRightTopDownNodePlacer.java:47-48,92-93, P/BottomRowEqualWhitespaceEliminator.java:46,
//     P/TopdownpackingLayoutProvider.java:63-66 all call GridElkNode.getProperty, which delegates to the wrapped layout node,
//     P/GridElkNode.java:447). Only the twoLevel* factor parallelOpts sets options on the root's children (parallel nodes).
//   How a row is run (a replay does the same): ElkGraphJson.forGraph(input).toElk(), then new RecursiveGraphLayoutEngine().layout(root,
//     monitor) with TopdownpackingMetaDataProvider + TopdownpackingOptions and LayeredMetaDataProvider + LayeredOptions registered
//     (the engine applies the LayoutAlgorithmResolver itself).
//
// Numbers: every double is 16 lowercase hex digits, Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded; a NaN anywhere fails
//   the recording (Infinity is recorded as its bits). Integers are JSON numbers. Ids are strings as exported. Boxes are
//   { id, x, y, w, h }, points [hexX, hexY].
//
// ELK DUMP (group full; the "end" stop):
//   graph = { id, x, y, w, h }                     the root
//   nodes = [ { id, x, y, w, h } ]                 every descendant, depth first in child-list order (children of a node follow it)
//   edges = [ { id, sections: [ { start, end, bends: [point...] } ], junctions: null | [point...] } ]  contained edges, parent first
//   group full: expected = { layoutNode, graph, nodes, edges } for the whole root after the engine run.
//
// group stops: expected = { layoutNode, steps: ["p1", "p2", "end"], stops: [ stop, stop, stop ] }, run on the root by driving
//   TopdownpackingLayoutProvider.layout step by step (provider body repeated by the recorder: new GridElkNode(root),
//   assembleAlgorithm, one process call per processor on the wrapper with a BasicProgressMonitor subtask). The recorder fails the row
//   when the stepwise end dump differs from a plain TopdownpackingLayoutProvider.layout on a fresh import, or when the graph box and
//   the direct children's boxes differ from RecursiveGraphLayoutEngine.layout on a fresh import (a childless root excepted: the
//   engine does not call the provider for it, so the full row n0 holds the untouched input boxes while the stops row n0 holds the
//   provider's work). Stop names are fixed:
//   p1  = { step: "p1", graph, rows, cols, cells, nodes }   after LeftRightTopDownNodePlacer.process (P1_NODE_ARRANGEMENT).
//         graph = the root box (P1 raised its size to the predicted size), rows/cols = GridElkNode.getRows()/getColumns() (the grid
//         size set by setGridSize), cells = one array per grid row: the REAL row list (GridElkNode.getRow(i), put INSERTS, P/GridElkNode
//         .java:73, so a row list grows past cols), each entry the child id or null; cells[i].length is the real list size. nodes = the
//         ELK DUMP node list (positions and sizes the placer set).
//   p2  = { step: "p2", graph, rows, cols, cells, nodes }   the same shape after BottomRowEqualWhitespaceEliminator.process
//         (P2_WHITESPACE_ELIMINATION); the grid is unchanged by it, node bounds and the root box are not.
//   end = { step: "end", graph, nodes, edges }   the ELK DUMP after the provider's last statement (progressMonitor.done()).
//
// group predicted: expected = { layoutNode, size: [hexX, hexY] }, TopdownpackingLayoutProvider.getPredictedGraphSize(root) on the
//   prepared graph before any layout (pure; the replay compares the KVector).
//
// group throws: expected = { layoutNode, throws: { class, message, frame } } for the two engine rows and
//   { layoutNode, setup: { cols, rows, puts: [[col, row, childId]...] }, call: { name, args: [int...] }, throws } for the rows that
//   drive GridElkNode or a phase directly. class and message are those of the ROOT CAUSE (message = getMessage() or null; a JDK
//   message such as ArrayList's "Index -1 out of bounds for length 2" is JVM text: compare class and frame); frame = the first
//   (innermost) org.eclipse.elk frame as "File.java:line".
//   Engine rows: throws/noNodeType (topdownLayout without a node type, RecursiveGraphLayoutEngine), throws/hierarchicalWithProvider
//   (a HIERARCHICAL_NODE child with children laid out by a topdown provider).
//   Direct rows: build the root from the input, wrap it (new GridElkNode(root)), call setGridSize(cols, rows) unless cols is null
//   (never called: the grid is uninitialised), put each child (by id) at [col, row], then call: put(col, row) puts the root's FIRST
//   child; get(col, row); getRow(row); getColumn(col); p2 = BottomRowEqualWhitespaceEliminator.process(wrapper, monitor).
//   throws/p2AllNullRow reaches the walk-back loop of P/BottomRowEqualWhitespaceEliminator.java:56-60 on a row that holds only nulls.
//
// OPTIONS (every option of tools/melk/sources/Topdownpacking.melk and the core options it supports; optionCoverage counts rows per
//   value and group; "default:" prefixes a value that is not set):
//   padding (default 12), spacing.nodeNode (default 20), topdown.hierarchicalNodeWidth (default 150),
//   topdown.hierarchicalNodeAspectRatio (default 1.414), topdownLayout (default false), topdown.nodeType (PARALLEL_NODE; the
//   algorithm's default), nodeArrangement.strategy and whitespaceElimination.strategy: each enum has ONE constant, so no non-default
//   value exists; the factor "strategies" sets the single value explicitly (the row proves an explicit set is read).
//
// SCENARIOS (seeded java.util.Random for the preset child geometry, seed SEED + n; the whole build runs twice and must agree byte for
//   byte): flat graphs "n<k>" of k = 0..40 leaf children with default options (full, stops, predicted); flat graphs of k in SIZES
//   (perfect squares and non-squares) with every factor of sizeFactors(); the corpus input test/corpus/generated/
//   topdownpacking-hierarchy-small.json as corpusAll (every compound node topdownpacking) and corpusRoot (children default);
//   twoLevel (ROOT_NODE root over three PARALLEL_NODE nodes with 2, 5, 3 leaves, topdownLayout through the engine, full +
//   predicted) and threeLevel.
//
// Round trip (NS1): for each row the recorder (1) prepares the graph, (2) exports it to `input`, (3) re-imports `input` and runs it,
//   which is the recorded `expected`, and (4) also runs a freshly prepared original and fails the row if the two outputs differ.
//   Stability: the whole row is built twice from scratch and the two serialised rows must be byte-identical.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2; the program refuses to run without it
//   unless TOPDOWNPACKING_UNPINNED=1 (an evidence run).
// Size guard: the output must stay under 16 MiB (MAX_BYTES).
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.IOException;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import java.util.function.Supplier;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.topdownpacking.BottomRowEqualWhitespaceEliminator;
import org.eclipse.elk.alg.topdownpacking.GridElkNode;
import org.eclipse.elk.alg.topdownpacking.LeftRightTopDownNodePlacer;
import org.eclipse.elk.alg.topdownpacking.NodeArrangementStrategy;
import org.eclipse.elk.alg.topdownpacking.TopdownpackingLayoutProvider;
import org.eclipse.elk.alg.topdownpacking.WhitespaceEliminationStrategy;
import org.eclipse.elk.alg.topdownpacking.options.TopdownpackingMetaDataProvider;
import org.eclipse.elk.alg.topdownpacking.options.TopdownpackingOptions;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.alg.ILayoutProcessor;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.TopdownNodeTypes;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkBendPoint;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkEdgeSection;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.elk.graph.util.ElkGraphUtil;

public class TopdownPackingVectors {
    static final String ELK_COMMIT = "e7eaea5747f2e5187a7b83cfdc256b501ca00d3c";
    static final String OUTPUT = "topdownpacking.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String IDENTIFIER_SEED_PROPERTY = "org.eclipse.elk.graph.util.identifierSeed";
    static final String UNPINNED_ENV = "TOPDOWNPACKING_UNPINNED";
    static final String ALGORITHM_ID = TopdownpackingOptions.ALGORITHM_ID;
    static final long SEED = 8301L;
    static final long MAX_BYTES = 16L * 1024 * 1024;
    static final int ROW_TIMEOUT_SECONDS = 60;
    static final int MAX_CHILDREN = 40;
    static final String FULL = "full", STOPS = "stops", PREDICTED = "predicted", THROWS = "throws";
    static final List<String> GROUPS = List.of(FULL, STOPS, PREDICTED, THROWS);
    static final String ROOT_ID = "root";
    static final double[] SIZES_XY = {0, 10, 25};
    static final double[] WIDTHS = {20, 30, 40, 60, 90};
    static final double[] HEIGHTS = {20, 30, 40, 50};
    static final int[] SIZES = {1, 2, 3, 4, 5, 7, 9, 10, 16, 17, 25};
    static final String CORPUS_FILE = "test/corpus/generated/topdownpacking-hierarchy-small.json";
    static final String CORPUS_TABLE = """
            e70fc0bb1cc4c039e051a59b1f0d7236e4832d0f10fd60b2e7055639d8c862c7  repo:test/corpus/generated/topdownpacking-hierarchy-small.json
            """;
    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");
    static final String S_P1 = "p1", S_P2 = "p2", S_END = "end";
    static final List<String> STEPS = List.of(S_P1, S_P2, S_END);
    static final String CALL_PUT = "put", CALL_GET = "get", CALL_ROW = "getRow", CALL_COLUMN = "getColumn", CALL_P2 = "p2";

    static final class Bug extends RuntimeException {
        Bug(String m) {
            super(m);
        }
    }

    record Row(String id, String group, String json) { }

    record Factor(String id, Consumer<ElkNode> apply) { }

    /** A direct GridElkNode / phase call: cols < 0 means setGridSize is never called. */
    record Op(int cols, int rows, int[][] puts, String call, int... args) { }

    /**
     * A scenario shape: make builds the unprepared graph (no algorithm option); allNodes puts the algorithm on every node with
     * children; op is non-null for the direct throws rows.
     */
    record Spec(String id, Supplier<ElkNode> make, boolean stops, boolean predicted, boolean allNodes, List<Factor> factors,
            Op op) { }

    /** The outcome of one run: a thrown exception or the serialised expected value, plus the branch flags of a stops run. */
    record Outcome(boolean threw, String json, Map<String, Integer> flags) { }

    static ExecutorService pool;
    static Path REPO;
    static final List<String> NOTES = new ArrayList<>();
    static final Map<String, Integer> STOP_FLAGS = new TreeMap<>();
    static final Factor PLAIN = new Factor("default", n -> { });
    static final List<Factor> DEFAULT_ONLY = List.of(PLAIN);

    public static void main(String[] args) throws Exception {
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        verifyCorpus();
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
        for (String g : GROUPS) {
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
                    + "(tools/vectors/topdownpacking-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new TopdownpackingMetaDataProvider(), new TopdownpackingOptions(),
                new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty(IDENTIFIER_SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        pool = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "topdownpacking-row");
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
        List<Row> rows = new ArrayList<>();
        for (Spec s : shapes()) {
            for (Factor f : s.factors) {
                Supplier<ElkNode> prep = prepare(s, f);
                rows.add(row(FULL + "/" + s.id + "/" + f.id, FULL, s, prep, record));
                if (s.stops) {
                    rows.add(row(STOPS + "/" + s.id + "/" + f.id, STOPS, s, prep, record));
                }
                if (s.predicted) {
                    rows.add(row(PREDICTED + "/" + s.id + "/" + f.id, PREDICTED, s, prep, record));
                }
            }
        }
        for (Spec s : throwsSpecs()) {
            rows.add(row(THROWS + "/" + s.id, THROWS, s, prepare(s, s.factors.get(0)), record));
        }
        return rows;
    }

    static Supplier<ElkNode> prepare(Spec s, Factor f) {
        return () -> {
            ElkNode root = s.make.get();
            root.setProperty(CoreOptions.ALGORITHM, ALGORITHM_ID);
            if (s.allNodes) {
                setAlgorithm(root);
            }
            f.apply.accept(root);
            return root;
        };
    }

    static void setAlgorithm(ElkNode n) {
        for (ElkNode c : n.getChildren()) {
            if (!c.getChildren().isEmpty()) {
                c.setProperty(CoreOptions.ALGORITHM, ALGORITHM_ID);
            }
            setAlgorithm(c);
        }
    }

    /** Builds one row twice from scratch; the second serialisation must equal the first. */
    static Row row(String id, String group, Spec s, Supplier<ElkNode> prep, boolean record) throws Exception {
        Row a = buildRow(id, group, s, prep, record);
        Row b = buildRow(id, group, s, prep, false);
        if (!a.json.equals(b.json)) {
            throw new Bug("row " + id + " is not stable across two builds");
        }
        return a;
    }

    static Row buildRow(String id, String group, Spec s, Supplier<ElkNode> prep, boolean record) throws Exception {
        if (record && System.getenv("TOPDOWNPACKING_TRACE") != null) {
            System.err.println("TRACE ROW " + id);
        }
        ElkNode original = prep.get();
        String input = export(original);
        if (record) {
            countCoverage(group, original);
        }
        Outcome viaImport = timed(id, () -> run(ElkGraphJson.forGraph(input).toElk(), s, group));
        Outcome viaOriginal = timed(id, () -> run(prep.get(), s, group));
        if (viaImport.threw != viaOriginal.threw || !viaImport.json.equals(viaOriginal.json)) {
            throw new Bug("round trip: row " + id + " differs between the re-imported and the original graph:\n" + viaImport.json
                    + "\n" + viaOriginal.json);
        }
        if (group.equals(THROWS) != viaImport.threw) {
            throw new Bug("row " + id + (viaImport.threw ? " threw but is planned " + group + ": " + viaImport.json
                    : " is planned throws but ran"));
        }
        if (record && !viaImport.threw) {
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

    static Outcome run(ElkNode root, Spec s, String group) {
        try {
            switch (group) {
                case STOPS:
                    return runStops(root);
                case PREDICTED:
                    KVector size = new TopdownpackingLayoutProvider().getPredictedGraphSize(root);
                    return new Outcome(false, "{\"layoutNode\": " + q(ROOT_ID) + ", \"size\": " + point(size) + "}", Map.of());
                default:
                    if (s.op != null) {
                        runOp(root, s.op);
                        return new Outcome(false, "{\"layoutNode\": " + q(ROOT_ID) + "}", Map.of());
                    }
                    new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
                    return new Outcome(false, fullJson(root), Map.of());
            }
        } catch (RuntimeException e) {
            Throwable cause = rootCause(e);
            StackTraceElement frame = elkFrame(cause);
            if (e instanceof Bug || frame == null) {
                throw e;
            }
            StringBuilder sb = new StringBuilder("{\"layoutNode\": " + q(ROOT_ID));
            if (s.op != null) {
                sb.append(", ").append(opJson(root, s.op));
            }
            sb.append(", \"throws\": {\"class\": ");
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
            if (f.getClassName().startsWith("TopdownPackingVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    static String fullJson(ElkNode root) {
        return "{\"layoutNode\": " + q(ROOT_ID) + ", " + dumpBody(root) + "}";
    }

    // ------------------------------------------------------------------------------------------------------------
    // Direct calls (throws rows)

    static void runOp(ElkNode root, Op op) {
        GridElkNode g = new GridElkNode(root);
        if (op.cols >= 0) {
            g.setGridSize(op.cols, op.rows);
        }
        for (int[] p : op.puts) {
            g.put(p[0], p[1], root.getChildren().get(p[2]));
        }
        switch (op.call) {
            case CALL_PUT -> g.put(op.args[0], op.args[1], root.getChildren().get(0));
            case CALL_GET -> g.get(op.args[0], op.args[1]);
            case CALL_ROW -> g.getRow(op.args[0]);
            case CALL_COLUMN -> g.getColumn(op.args[0]);
            case CALL_P2 -> new BottomRowEqualWhitespaceEliminator().process(g, new BasicProgressMonitor());
            default -> throw new Bug("unknown call " + op.call);
        }
    }

    static String opJson(ElkNode root, Op op) {
        StringBuilder sb = new StringBuilder("\"setup\": {\"cols\": ");
        sb.append(op.cols < 0 ? "null" : String.valueOf(op.cols)).append(", \"rows\": ").append(op.cols < 0 ? "null" : String.valueOf(op.rows))
                .append(", \"puts\": [");
        for (int i = 0; i < op.puts.length; i++) {
            int[] p = op.puts[i];
            sb.append(i == 0 ? "" : ", ").append('[').append(p[0]).append(", ").append(p[1]).append(", ")
                    .append(q(id(root.getChildren().get(p[2])))).append(']');
        }
        sb.append("]}, \"call\": {\"name\": ").append(q(op.call)).append(", \"args\": [");
        for (int i = 0; i < op.args.length; i++) {
            sb.append(i == 0 ? "" : ", ").append(op.args[i]);
        }
        return sb.append("]}").toString();
    }

    // ------------------------------------------------------------------------------------------------------------
    // The stepwise run

    static Outcome runStops(ElkNode root) {
        String inputJson = export(root);
        ElkNode direct = ElkGraphJson.forGraph(inputJson).toElk();
        new TopdownpackingLayoutProvider().layout(direct, new BasicProgressMonitor());
        ElkNode viaEngine = ElkGraphJson.forGraph(inputJson).toElk();
        new RecursiveGraphLayoutEngine().layout(viaEngine, new BasicProgressMonitor());

        Map<String, Integer> flags = new TreeMap<>();
        TopdownpackingLayoutProvider provider = new TopdownpackingLayoutProvider();
        GridElkNode wrapped = new GridElkNode(root);
        List<ILayoutProcessor<GridElkNode>> algorithm = provider.assembleAlgorithm(wrapped);
        if (algorithm.size() != 2 || !(algorithm.get(0) instanceof LeftRightTopDownNodePlacer)
                || !(algorithm.get(1) instanceof BottomRowEqualWhitespaceEliminator)) {
            throw new Bug("unexpected processor list " + algorithm);
        }
        BasicProgressMonitor monitor = new BasicProgressMonitor();
        monitor.begin("Topdown Packing", algorithm.size());
        algorithm.get(0).process(wrapped, monitor.subTask(1));
        String p1 = gridStop(S_P1, root, wrapped, flags);
        String before = nodesJson(root);
        boolean skipped = root.getWidth() == 0 || wrapped.getColumns() == 0;
        algorithm.get(1).process(wrapped, monitor.subTask(1));
        String p2 = gridStop(S_P2, root, wrapped, flags);
        monitor.done();
        String end = "{\"step\": \"" + S_END + "\", " + dumpBody(root) + "}";
        String after = nodesJson(root);
        flag(flags, "p2Skipped", skipped);
        flag(flags, "p2NodesChanged", !before.equals(after));
        flag(flags, "gridEmpty", wrapped.getColumns() == 0);
        if (!dumpBody(root).equals(dumpBody(direct))) {
            throw new Bug("stepwise end differs from TopdownpackingLayoutProvider.layout:\n" + dumpBody(root) + "\n" + dumpBody(direct));
        }
        // The engine skips a childless layout node (RecursiveGraphLayoutEngine.layoutRecursively: hasChildren): its result is the input.
        String expectedTop = root.getChildren().isEmpty() ? topLevel(ElkGraphJson.forGraph(inputJson).toElk()) : topLevel(root);
        if (!expectedTop.equals(topLevel(viaEngine))) {
            throw new Bug("stepwise end differs from the engine's result:\n" + expectedTop + "\n" + topLevel(viaEngine));
        }
        return new Outcome(false, "{\"layoutNode\": " + q(ROOT_ID) + ", \"steps\": [\"" + String.join("\", \"", STEPS)
                + "\"], \"stops\": [" + p1 + ", " + p2 + ", " + end + "]}", flags);
    }

    static String gridStop(String step, ElkNode root, GridElkNode g, Map<String, Integer> flags) {
        StringBuilder cells = new StringBuilder("[");
        for (int i = 0; i < g.getRows(); i++) {
            List<ElkNode> row = g.getRow(i);
            cells.append(i == 0 ? "" : ", ").append('[');
            for (int j = 0; j < row.size(); j++) {
                cells.append(j == 0 ? "" : ", ").append(row.get(j) == null ? "null" : q(id(row.get(j))));
            }
            cells.append(']');
            flag(flags, step + "RowLongerThanCols", row.size() > g.getColumns());
        }
        cells.append(']');
        return "{\"step\": \"" + step + "\", \"graph\": " + box(id(root), root.getX(), root.getY(), root.getWidth(), root.getHeight())
                + ", \"rows\": " + g.getRows() + ", \"cols\": " + g.getColumns() + ", \"cells\": " + cells + ", \"nodes\": "
                + nodesJson(root) + "}";
    }

    static void flag(Map<String, Integer> flags, String name, boolean on) {
        flags.merge(name + (on ? ":yes" : ":no"), 1, Integer::sum);
    }

    /** The root box and the direct children's boxes. */
    static String topLevel(ElkNode root) {
        List<String> l = new ArrayList<>();
        l.add(box(id(root), root.getX(), root.getY(), root.getWidth(), root.getHeight()));
        for (ElkNode c : root.getChildren()) {
            l.add(box(id(c), c.getX(), c.getY(), c.getWidth(), c.getHeight()));
        }
        return list(l);
    }

    // ------------------------------------------------------------------------------------------------------------
    // ELK dump

    static String dumpBody(ElkNode top) {
        Dump d = new Dump();
        d.visitTop(top);
        return "\"graph\": " + d.graph + ", \"nodes\": " + list(d.nodes) + ", \"edges\": " + list(d.edges);
    }

    static String nodesJson(ElkNode top) {
        Dump d = new Dump();
        d.visitTop(top);
        return list(d.nodes);
    }

    static final class Dump {
        String graph;
        final List<String> nodes = new ArrayList<>(), edges = new ArrayList<>();
        final Set<String> seen = new HashSet<>();

        void visitTop(ElkNode top) {
            graph = box(unique(id(top)), top.getX(), top.getY(), top.getWidth(), top.getHeight());
            visit(top);
        }

        String unique(String id) {
            if (!seen.add(id)) {
                throw new Bug("duplicate element id " + id);
            }
            return id;
        }

        void visit(ElkNode parent) {
            if (!parent.getPorts().isEmpty() || !parent.getLabels().isEmpty()) {
                throw new Bug("node " + id(parent) + " has ports or labels, which the dump does not record");
            }
            for (ElkNode n : parent.getChildren()) {
                nodes.add(box(unique(id(n)), n.getX(), n.getY(), n.getWidth(), n.getHeight()));
                visit(n);
            }
            for (ElkEdge e : parent.getContainedEdges()) {
                StringBuilder sb = new StringBuilder("{\"id\": " + q(unique(id(e))) + ", \"sections\": [");
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
                if (e.hasProperty(CoreOptions.JUNCTION_POINTS)) {
                    List<String> pts = new ArrayList<>();
                    for (KVector v : e.getProperty(CoreOptions.JUNCTION_POINTS)) {
                        pts.add(point(v));
                    }
                    sb.append(list(pts));
                } else {
                    sb.append("null");
                }
                edges.add(sb.append('}').toString());
                if (!e.getLabels().isEmpty()) {
                    throw new Bug("edge " + id(e) + " has labels, which the dump does not record");
                }
            }
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

    static String point(double x, double y) {
        return "[" + hex(x) + ", " + hex(y) + "]";
    }

    static String point(KVector v) {
        return point(v.x, v.y);
    }

    static String list(Collection<String> items) {
        return "[" + String.join(", ", items) + "]";
    }

    // ------------------------------------------------------------------------------------------------------------
    // Coverage

    static final Map<String, Map<String, int[]>> COVERAGE = new TreeMap<>();

    static void countCoverage(String group, ElkNode g) {
        cover("padding", valueOf(g, CoreOptions.PADDING), group);
        cover("spacing.nodeNode", valueOf(g, CoreOptions.SPACING_NODE_NODE), group);
        cover("topdown.hierarchicalNodeWidth", valueOf(g, CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH), group);
        cover("topdown.hierarchicalNodeAspectRatio", valueOf(g, CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO), group);
        cover("topdownLayout", valueOf(g, CoreOptions.TOPDOWN_LAYOUT), group);
        cover("topdown.nodeType", valueOf(g, CoreOptions.TOPDOWN_NODE_TYPE), group);
        cover("nodeArrangement.strategy", valueOf(g, TopdownpackingOptions.NODE_ARRANGEMENT_STRATEGY), group);
        cover("whitespaceElimination.strategy", valueOf(g, TopdownpackingOptions.WHITESPACE_ELIMINATION_STRATEGY), group);
    }

    /** Reads getAllProperties, never getProperty: ElkPadding's default is cloneable and getProperty would store a copy. */
    static String valueOf(ElkNode g, IProperty<?> p) {
        Object v = g.getAllProperties().get(p);
        return v == null ? "default" : String.valueOf(v);
    }

    static void cover(String option, String value, String group) {
        int[] c = COVERAGE.computeIfAbsent(option, k -> new TreeMap<>()).computeIfAbsent(value, k -> new int[GROUPS.size()]);
        c[GROUPS.indexOf(group)]++;
    }

    static String coverageJson() {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Map<String, int[]>> e : COVERAGE.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": {");
            int j = 0;
            for (Map.Entry<String, int[]> v : e.getValue().entrySet()) {
                int[] c = v.getValue();
                sb.append(j++ == 0 ? "" : ", ").append(q(v.getKey())).append(": {");
                for (int g = 0; g < GROUPS.size(); g++) {
                    sb.append(g == 0 ? "" : ", ").append('"').append(GROUPS.get(g)).append("\": ").append(c[g]);
                }
                sb.append('}');
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
    // Factors, applied to the layout node (the root)

    static Factor opt(String id, Consumer<ElkNode> apply) {
        return new Factor(id, apply);
    }

    static Consumer<ElkNode> width(double w) {
        return n -> n.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_WIDTH, w);
    }

    static Consumer<ElkNode> aspect(double a) {
        return n -> n.setProperty(CoreOptions.TOPDOWN_HIERARCHICAL_NODE_ASPECT_RATIO, a);
    }

    static Consumer<ElkNode> pad(double t, double r, double b, double l) {
        return n -> n.setProperty(CoreOptions.PADDING, new ElkPadding(t, r, b, l));
    }

    static Consumer<ElkNode> spacing(double s) {
        return n -> n.setProperty(CoreOptions.SPACING_NODE_NODE, s);
    }

    static Consumer<ElkNode> presize(double w, double h) {
        return n -> n.setDimensions(w, h);
    }

    static Consumer<ElkNode> strategies() {
        return n -> {
            n.setProperty(TopdownpackingOptions.NODE_ARRANGEMENT_STRATEGY, NodeArrangementStrategy.LEFT_RIGHT_TOP_DOWN_NODE_PLACER);
            n.setProperty(TopdownpackingOptions.WHITESPACE_ELIMINATION_STRATEGY,
                    WhitespaceEliminationStrategy.BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR);
        };
    }

    static Consumer<ElkNode> all(List<Consumer<ElkNode>> parts) {
        return n -> parts.forEach(p -> p.accept(n));
    }

    static Consumer<ElkNode> combined() {
        return all(List.of(width(45), aspect(1.5), pad(3, 4, 5, 6), spacing(3), presize(300, 220), strategies()));
    }

    static List<Factor> sizeFactors() {
        return List.of(PLAIN, opt("strategies", strategies()),
                opt("width80", width(80)), opt("width20", width(20)), opt("widthFrac", width(33.5)), opt("width0", width(0)),
                opt("aspect05", aspect(0.5)), opt("aspect2", aspect(2.0)), opt("aspect1", aspect(1.0)), opt("aspectNeg", aspect(-1.0)),
                opt("padAsym", pad(5, 13, 11, 7)), opt("pad0", pad(0, 0, 0, 0)),
                opt("space0", spacing(0)), opt("space75", spacing(7.5)), opt("space40", spacing(40)),
                opt("presizeBig", presize(400, 300)), opt("presizeSmall", presize(10, 10)),
                opt("presizeTall", presize(30, 500)), opt("presizeWide", presize(500, 30)),
                opt("topdownParallel", n -> {
                    n.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
                    n.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, TopdownNodeTypes.PARALLEL_NODE);
                }),
                opt("zeroAll", all(List.of(width(0), pad(0, 0, 0, 0), spacing(0)))),
                opt("combined", combined()));
    }

    static List<Factor> corpusFactors() {
        return List.of(PLAIN, opt("strategies", strategies()), opt("width80", width(80)), opt("aspect2", aspect(2.0)),
                opt("space75", spacing(7.5)), opt("padAsym", pad(5, 13, 11, 7)), opt("presizeBig", presize(400, 300)),
                opt("combined", combined()));
    }

    // ------------------------------------------------------------------------------------------------------------
    // Graphs

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

    /** k leaf children with seeded preset geometry (the algorithm overwrites it). */
    static ElkNode flat(int k) {
        Random r = new Random(SEED + k);
        ElkNode root = newRoot();
        for (int i = 0; i < k; i++) {
            node(root, "n" + i, pick(r, SIZES_XY), pick(r, SIZES_XY), pick(r, WIDTHS), pick(r, HEIGHTS));
        }
        return root;
    }

    static double pick(Random r, double[] from) {
        return from[r.nextInt(from.length)];
    }

    static void topdown(ElkNode n, TopdownNodeTypes type) {
        n.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
        n.setProperty(CoreOptions.TOPDOWN_NODE_TYPE, type);
    }

    /** A ROOT_NODE root over parallel nodes with the given leaf counts; a negative count adds one nested parallel node of -count leaves. */
    static ElkNode topdownGraph(int[] leaves, int nested) {
        Random r = new Random(SEED + 1000 + leaves.length);
        ElkNode root = newRoot();
        topdown(root, TopdownNodeTypes.ROOT_NODE);
        for (int i = 0; i < leaves.length; i++) {
            ElkNode p = node(root, "p" + i, 0, 0, 0, 0);
            topdown(p, TopdownNodeTypes.PARALLEL_NODE);
            for (int j = 0; j < leaves[i]; j++) {
                node(p, "p" + i + "l" + j, pick(r, SIZES_XY), pick(r, SIZES_XY), pick(r, WIDTHS), pick(r, HEIGHTS));
            }
            if (nested > 0 && i == 0) {
                ElkNode q = node(p, "p0q", 0, 0, 0, 0);
                topdown(q, TopdownNodeTypes.PARALLEL_NODE);
                for (int j = 0; j < nested; j++) {
                    node(q, "p0q" + j, 5, 5, pick(r, WIDTHS), pick(r, HEIGHTS));
                }
            }
        }
        return root;
    }

    static ElkNode loadCorpus() {
        try {
            return ElkGraphJson.forGraph(Files.readString(REPO.resolve(CORPUS_FILE), StandardCharsets.UTF_8)).toElk();
        } catch (IOException e) {
            throw new Bug("cannot read " + CORPUS_FILE + ": " + e);
        }
    }

    static List<Spec> shapes() {
        List<Spec> l = new ArrayList<>();
        Set<Integer> sized = new HashSet<>();
        for (int k : SIZES) {
            sized.add(k);
        }
        for (int k = 0; k <= MAX_CHILDREN; k++) {
            final int n = k;
            l.add(new Spec("n" + k, () -> flat(n), true, true, false, DEFAULT_ONLY, null));
            if (sized.contains(k)) {
                List<Factor> rest = new ArrayList<>(sizeFactors());
                rest.remove(0);
                l.add(new Spec("n" + k, () -> flat(n), true, true, false, rest, null));
            }
        }
        l.add(new Spec("corpusAll", TopdownPackingVectors::loadCorpus, true, true, true, corpusFactors(), null));
        l.add(new Spec("corpusRoot", TopdownPackingVectors::loadCorpus, true, true, false, corpusFactors(), null));
        List<Factor> two = List.of(PLAIN, opt("strategies", strategies()),
                opt("root60", all(List.of(width(60), aspect(2.0), spacing(5), pad(4, 4, 4, 4)))),
                opt("parallelOpts", n -> {
                    for (ElkNode c : n.getChildren()) {
                        width(30).accept(c);
                        aspect(1.0).accept(c);
                        spacing(2).accept(c);
                        pad(2, 2, 2, 2).accept(c);
                    }
                }));
        l.add(new Spec("twoLevel", () -> topdownGraph(new int[] {2, 5, 3}, 0), false, true, true, two, null));
        l.add(new Spec("threeLevel", () -> topdownGraph(new int[] {2, 3}, 4), false, true, true, two, null));
        return l;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Throw rows

    static List<Spec> throwsSpecs() {
        List<Spec> l = new ArrayList<>();
        l.add(new Spec("noNodeType", () -> {
            ElkNode root = flat(2);
            root.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
            return root;
        }, false, false, false, DEFAULT_ONLY, null));
        l.add(new Spec("hierarchicalWithProvider", () -> {
            ElkNode root = newRoot();
            topdown(root, TopdownNodeTypes.ROOT_NODE);
            ElkNode h = node(root, "h", 0, 0, 0, 0);
            topdown(h, TopdownNodeTypes.HIERARCHICAL_NODE);
            node(h, "h0", 0, 0, 30, 30);
            node(h, "h1", 0, 0, 30, 30);
            return root;
        }, false, false, true, DEFAULT_ONLY, null));
        int[][] none = {};
        l.add(direct("putColOob", 2, 2, none, CALL_PUT, 2, 0));
        l.add(direct("putRowOob", 2, 2, none, CALL_PUT, 0, 2));
        l.add(direct("putNegCol", 2, 2, none, CALL_PUT, -1, 0));
        l.add(direct("putNegRow", 2, 2, none, CALL_PUT, 0, -1));
        l.add(direct("putUninitialised", -1, 0, none, CALL_PUT, 0, 0));
        l.add(direct("getColOob", 2, 2, none, CALL_GET, 2, 0));
        l.add(direct("getRowOob", 2, 2, none, CALL_GET, 0, 2));
        l.add(direct("getNegCol", 2, 2, none, CALL_GET, -1, 0));
        l.add(direct("getUninitialised", -1, 0, none, CALL_GET, 0, 0));
        l.add(direct("getRowOobRow", 2, 2, none, CALL_ROW, 2));
        l.add(direct("getRowNegRow", 2, 2, none, CALL_ROW, -1));
        l.add(direct("getRowUninitialised", -1, 0, none, CALL_ROW, 0));
        l.add(direct("getColumnOobCol", 2, 2, none, CALL_COLUMN, 2));
        l.add(direct("getColumnNegCol", 2, 2, none, CALL_COLUMN, -1));
        l.add(direct("getColumnUninitialised", -1, 0, none, CALL_COLUMN, 0));
        l.add(direct("p2AllNullRow", 2, 2, new int[][] {{0, 0, 0}, {1, 0, 1}}, CALL_P2));
        return l;
    }

    /** A direct-call row: three 30x30 children on a 100x100 root (the whitespace phase needs a non-zero width). */
    static Spec direct(String id, int cols, int rows, int[][] puts, String call, int... args) {
        Supplier<ElkNode> make = () -> {
            ElkNode root = newRoot();
            root.setDimensions(100, 100);
            for (int i = 0; i < 3; i++) {
                node(root, "n" + i, 10 * i, 0, 30, 30);
            }
            return root;
        };
        return new Spec(id, make, false, false, false, DEFAULT_ONLY, new Op(cols, rows, puts, call, args));
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
            throw new IllegalStateException("NaN in a recorded value (row " + "see TOPDOWNPACKING_TRACE" + ")");
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
