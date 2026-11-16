// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 8b alg-force-disco, T1, FD1, FD3) for the force and stress algorithms of
// org.eclipse.elk.alg.force: what ForceLayoutProvider.layout and StressLayoutProvider.layout do at the pinned ELK commit, step by
// step, plus Math.log (EadesModel.attractive). This program only CALLS ELK public APIs (and reads private state by reflection, it is
// test code) and records results; it embeds no ELK implementation.
// Run: tools/vectors/force-vectors.sh <outDir>   (java -cp ... ForceVectors.java <outDir> <tools/vectors dir>)
// ORIGIN: the row format, the NS1 round trip, the NS4 label sizes, the NS6 hex doubles, the strictNumbers sanitiser, the throws shape
// with the first ELK frame and the file layout are copied from tools/vectors/VertiFlexVectors.java (B7: single-file launchers share
// no code).
//
// ===== OUTPUT CONTRACT (everything a TypeScript replay needs; no need to read the recorder body) =====
// Files <outDir>/force.json (groups full, stops, throws, log) and <outDir>/stress.json (groups full, stops, throws), each: 2-space top
// level, ONE compact JSON row per line, trailing newline, strict JSON, under 16 MiB:
//   { jdk, oracle, seed, logSeed, rowCounts, optionCoverage, stopCoverage, branchCoverage, rows: [row...] }
//   row = { id, group, input, expected }, ids unique and stable: "<group>/<shape>/<factor>" (throws: "throws/<name>").
//   input = the PREPARED graph (algorithm option, factor and NS4 label sizes applied) exported by ElkGraphJson.forGraph(root)
//     .omitLayout(false).omitZeroDimension(false).omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false)
//     under the system properties org.eclipse.elk.graph.json.exportSeed=1 and org.eclipse.elk.graph.util.identifierSeed=1,
//     EMBEDDED as a JSON object; a bare Infinity/-Infinity/NaN token of the exporter (none is emitted by these inputs) would be
//     replaced by the string "Infinity"/"-Infinity"/"NaN". Every node, port, label and edge has a unique non-empty id: root "root",
//     nodes "n<k>", ports "p<k>_<j>", edges "e<k>", edge labels "le<k>_<m>", node labels "ln<k>", port labels "lp<k>_<j>"
//     (the corpus row keeps the ids of the corpus file). Every node that has children, and the root, carry elk.algorithm
//     (org.eclipse.elk.force | org.eclipse.elk.stress) and the factor's options at the level the option is read.
//   How a row is run (a replay does the same): ElkGraphJson.forGraph(input).toElk(), then new RecursiveGraphLayoutEngine()
//     .layout(root, monitor) with the force and stress providers registered (ForceMetaDataProvider, StressMetaDataProvider).
//
// Numbers: every double is 16 lowercase hex digits, Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded (JavaVectors.hex),
//   except NaN, which is always the canonical 7ff8000000000000 (a NaN payload is platform text; NaN rows exist on purpose: the
//   spacing.nodeNode = 0 factors blow the layout up to Infinity and NaN). Infinity is 7ff0000000000000, -Infinity fff0000000000000.
//   Integers are JSON numbers. Ids are strings as exported. Booleans are JSON booleans.
//
// group full: expected = ELK DUMP of the graph after the engine run:
//   { graph, nodes, ports, labels, edges }  elements in traversal order: the root's children in model order, each node followed by its
//   labels, its ports (each port followed by its labels), then its children recursively (lists are per kind, flat); edges per
//   containing node, each followed by its labels.
//   graph = { id, x, y, w, h, padding: [t,r,b,l], childArea: [w, h] | null }  childArea = CoreOptions.CHILD_AREA_WIDTH/HEIGHT (null
//           while the provider has not set them)
//   node  = { id, x, y, w, h, margins: [t,r,b,l], padding: [t,r,b,l], childArea?: [w, h] }   childArea only on a node with children
//   port, label = { id, x, y, w, h }
//   edge  = { id, sections: [ { start: [x,y], end: [x,y], bends: [[x,y]...] } ] }   [] when the importer skipped the edge
//
// group stops: expected = { steps: [name...], stops: [ { step, component, ...body } ... ] }, stops[i].step = steps[i], component = the
//   index of the component in the split list (null for a stop of the whole graph). Every stop carries the WHOLE state a later step reads
//   (no delta), so a replay can rebuild the "before" state of any step.
//   FORCE steps (Java order, ForceLayoutProvider.layout): import, split, then per component k: initialize, iteration1, iteration2,
//     iteration10, iterationLast (a checkpoint whose iteration count is never reached is absent; iterationLast is always present, with
//     "iteration" = the number of iterations the loop ran, which can be 0), then recombine, applyLayout.
//     import      { state }            after NodeMicroLayout (unless omitted) and ElkGraphImporter.importGraph, before setOptions
//     split       { model, randomPeek, components: [state...] }  after setOptions, updateModel and ComponentsProcessor.split;
//                 model = simple class name of the AbstractForceModel the provider chose; node ids are renumbered per component
//                 when more than one component exists
//     initialize  { iteration: 0, state, model: {...} }   after AbstractForceModel.initialize (and the subclass part): positions after
//                 the random draws (not interactive), bend points created, adjacency; model = every instance field of the concrete model
//                 plus dispBound (ints as numbers, doubles as hex): Eades maxIterations, repulsionFactor, springLength; Fruchterman-
//                 Reingold k, temperature, threshold
//     iteration<k>, iterationLast  { iteration: n, state, model }   after iteration n of the loop body of AbstractForceModel.layout
//                 (iterationDone, forces, bounded displacement applied and reset); the recorder drives that body by reflection in
//                 the Java's order and checks the final ELK state against an uninstrumented engine run of the same input (every
//                 force row, not only stops rows)
//     recombine   { components: [ { first, nodes, prio, bbUpLeft, bbLowRight } ... ], result: state }  components in the order after
//                 ComponentsProcessor.recombine sorted them (bbUpLeft/bbLowRight/prio are null/the unset default when the list has one
//                 component: recombine returns it untouched); result = the returned FGraph. NOTE (journal): with several components the
//                 result FGraph holds the nodes, edges and labels, but its own bendpoint list stays empty (moveGraph never fills it)
//     applyLayout { elk }              the ELK dump after ElkGraphImporter.applyLayout
//   STRESS steps (StressLayoutProvider.layout): forcePass (not interactive: ForceLayoutProvider.layout on the graph) or microLayout
//     (interactive; NodeMicroLayout unless omitted), both { elk }; import { state }; split { components: [state...] }; then per
//     component with more than one node k: initialize { state, stress: { dim, iterationLimit, epsilon, desiredEdgeLength, apsp, w } },
//     execute { state, stress: { dim, iterationLimit, epsilon, desiredEdgeLength } }, labelRefresh { state } (after every label of
//     the component refreshPosition); then recombine { components: [...], result }, applyLayout { elk }.
//     apsp and w are the n x n matrices indexed by FNode.id (w[i][i] is Infinity).
//   state = FGraph dump: { props, nodes, edges, labels, bends, adjacency }
//     props = { model, iterations, temperature, repulsion, spacing, aspectRatio, randomSeed, separate, interactive, prio, padding,
//               bbUpLeft, bbLowRight, randomPeek, + for stress rows dimension, iterationLimit, epsilon, desiredEdgeLength }
//       randomPeek = hex of nextLong() of a serialised COPY of the graph's java.util.Random (null before setOptions): a fingerprint of
//       the generator state, the original is not advanced.
//     node  = { id, name, label, pos, disp, size, prio, + fixed (stress) }   id = FNode.id, name = the ELK node id, label = FNode label
//     edge  = { name, src, tgt, srcId, tgtId, prio, power, labelSpacing, sp, tp, bends, + del (stress) }   src/tgt = ELK ids,
//             sp/tp = getSourcePoint/getTargetPoint, bends = positions of the edge's bendpoints, del = desiredEdgeLength or null
//     label = { name, text, edge, pos, disp, size, inline, prio }   edge = the ELK edge id
//     bends = the graph's bendpoint particles { edge, index, pos, disp, size, prio }
//     adjacency = int[][] (null before initialize)
//
// group throws: expected = { throws: { class, message, frame } } the engine run threw inside ELK; class = the fully qualified Java
//   class name; message = getMessage() or null; frame = the first org.eclipse.elk frame as "File.java:line". The stops path must throw
//   the same class, message and frame (the recorder checks).
//
// group log: rows { id, group: "log", input: "<hex of a double>", expected: "<hex of Math.log(input)>" }: 20,000 seeded inputs (the
//   first 10,000 in 0.01..20, the next 10,000 log-uniform in 1e-3..1e3) plus the named edge cases log/edge/<name> (zero, negZero,
//   minusOne, nan, posInf, negInf, minSubnormal, midSubnormal, maxSubnormal, one, justAboveOne, justBelowOne, minNormal, maxValue).
//   The recorder computes every value in three passes (cold, then after a JIT warm-up) and fails if they differ; it prints how many
//   differ from StrictMath.log.
//
// OPTIONS (enumerated from tools/melk/sources/{Force,Stress}.melk; optionCoverage counts rows per value and group):
//   force: model (both values), iterations, temperature, repulsion (Eades), repulsivePower (edges), spacing.nodeNode (incl. 0),
//     aspectRatio, randomSeed (never 0), separateConnectedComponents=false, padding, interactive, edgeLabels.inline (labels),
//     priority (nodes, edges, labels separately), spacing.edgeLabel (edges), omitNodeMicroLayout, nodeSize.fixedGraphSize.
//   stress: interactive, fixed (nodes), desiredEdgeLength (root, edges, mixed), dimension X, Y, XY, epsilon, iterationLimit,
//     edgeLabels.inline (labels, both values), omitNodeMicroLayout.
//   Reader levels (read from the Java): graph properties are copied from the ROOT (model, iterations, temperature, repulsion,
//   spacing.nodeNode, randomSeed, separateConnectedComponents, aspectRatio, interactive; padding and nodeSize.fixedGraphSize are read
//   from the root in applyLayout; stress dimension, epsilon, iterationLimit and desiredEdgeLength); node level: priority, stress fixed;
//   edge level: priority, repulsivePower, spacing.edgeLabel, stress desiredEdgeLength; label level: priority, edgeLabels.inline. Every
//   node with children is a layout parent and gets the root-level options too (the hierarchy shape).
//
// SCENARIOS (generator: seeded java.util.Random(SEED = 8201), consumed in the fixed order of shapes(); the whole build runs twice and
//   must agree byte for byte): shapes single, path5, star6, cycle6, k5, randA (10 nodes), randB (14), randC (24, full only), forest,
//   mixed, multi (multi-edges), loops (self-loops), ports, edgeLabels, nodeLabels, coincident (interactive, preset coincident
//   positions), hier (an edge between hierarchy levels, which the importer skips), rootPorts (an edge from a root port, which the
//   importer never visits), corpus (test/corpus/generated/force-graph-small.json, sha256 pinned in CORPUS_TABLE). Every shape runs
//   once per applicable factor (default, then one factor at a time); stress rows only for shapes up to 30 nodes. A shape has a
//   stops level: 2 = a stops row per factor, 1 = default factor only, 0 = none (stops rows are limited to 12 nodes for stress).
//   Throw rows: hyperedges (two targets, two sources). An edge without a target is not recordable: ELK JSON refuses to import it
//   ("An edge must have at least one source and one target"), so no row can carry it.
//
// Round trip (NS1): for each row the recorder (1) prepares the graph, (2) exports it to `input`, (3) re-imports `input` and runs it,
//   which is the recorded `expected`, and (4) also runs a freshly prepared original and fails the row if the two outputs differ.
//   Stability: the whole row is built twice from scratch and the two serialised rows must be byte-identical. A row that does not
//   finish within ROW_TIMEOUT_SECONDS stops the recording.
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 (TR3); the program refuses to run
//   without it. Size guard: each output must stay under 16 MiB (MAX_BYTES).
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.io.ObjectOutputStream;
import java.io.StringReader;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.function.Supplier;
import org.eclipse.elk.alg.common.NodeMicroLayout;
import org.eclipse.elk.alg.force.ComponentsProcessor;
import org.eclipse.elk.alg.force.ElkGraphImporter;
import org.eclipse.elk.alg.force.ForceLayoutProvider;
import org.eclipse.elk.alg.force.graph.FBendpoint;
import org.eclipse.elk.alg.force.graph.FEdge;
import org.eclipse.elk.alg.force.graph.FGraph;
import org.eclipse.elk.alg.force.graph.FLabel;
import org.eclipse.elk.alg.force.graph.FNode;
import org.eclipse.elk.alg.force.graph.FParticle;
import org.eclipse.elk.alg.force.model.AbstractForceModel;
import org.eclipse.elk.alg.force.options.ForceMetaDataProvider;
import org.eclipse.elk.alg.force.options.ForceModelStrategy;
import org.eclipse.elk.alg.force.options.ForceOptions;
import org.eclipse.elk.alg.force.options.InternalProperties;
import org.eclipse.elk.alg.force.options.StressMetaDataProvider;
import org.eclipse.elk.alg.force.options.StressOptions;
import org.eclipse.elk.alg.force.stress.StressMajorization;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.LayoutAlgorithmResolver;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.core.util.ElkUtil;
import org.eclipse.elk.core.util.IElkProgressMonitor;
import org.eclipse.elk.graph.ElkBendPoint;
import org.eclipse.elk.graph.ElkConnectableShape;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkEdgeSection;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.ElkPort;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.MapPropertyHolder;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.elk.graph.util.ElkGraphUtil;

public class ForceVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String IDENTIFIER_SEED_PROPERTY = "org.eclipse.elk.graph.util.identifierSeed";
    static final String FORCE_ID = "org.eclipse.elk.force", STRESS_ID = "org.eclipse.elk.stress";
    static final long SEED = 8201L, LOG_SEED = 8202L;
    static final long MAX_BYTES = 16L * 1024 * 1024;
    static final int ROW_TIMEOUT_SECONDS = 120;
    static final int STRESS_STOPS_MAX_NODES = 12, STRESS_MAX_NODES = 30;
    static final int LOG_HALF = 10_000;
    static final String NAN_HEX = "7ff8000000000000";
    static final String FULL = "full", STOPS = "stops", THROWS = "throws", LOG = "log";
    static final double LABEL_CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0;
    static final double[] WIDTHS = {20, 30, 40, 60, 90};
    static final double[] HEIGHTS = {20, 30, 40, 50};
    static final String CORPUS_FILE = "test/corpus/generated/force-graph-small.json";
    static final String CORPUS_TABLE = """
            3419cfd1505484568d7f0847c1949be0a765ab2b43d787845f825a1fa800d3b9  repo:test/corpus/generated/force-graph-small.json
            """;
    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");

    enum Kind {
        FORCE("force.json", FORCE_ID, List.of(FULL, STOPS, THROWS, LOG)),
        STRESS("stress.json", STRESS_ID, List.of(FULL, STOPS, THROWS));

        final String file, algorithm;
        final List<String> groups;

        Kind(String file, String algorithm, List<String> groups) {
            this.file = file;
            this.algorithm = algorithm;
            this.groups = groups;
        }
    }

    static final class Bug extends RuntimeException {
        Bug(String m) {
            super(m);
        }
    }

    record Row(String id, String group, String json) { }

    record Factor(String id, Predicate<ElkNode> applies, Consumer<ElkNode> apply) { }

    /** A scenario shape: make builds the unprepared graph (no label sizes, algorithm set by prepare). */
    record Shape(String id, Supplier<ElkNode> make, int nodes, int stopsLevel) { }

    /** The outcome of one run: a thrown exception or the serialised expected value; last = the ELK dump after the run. */
    record Outcome(boolean threw, String json, String last, Set<String> tags) { }

    static ExecutorService pool;
    static Path REPO;
    static final Map<String, Map<String, int[]>> COVERAGE = new TreeMap<>();
    static final Map<String, int[]> STOP_COVERAGE = new TreeMap<>();
    static final Map<String, Integer> BRANCHES = new TreeMap<>();
    static final List<String> NOTES = new ArrayList<>();

    public static void main(String[] args) throws Exception {
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        setup();
        Path out = Path.of(args[0]);
        Files.createDirectories(out);
        for (Kind kind : Kind.values()) {
            COVERAGE.clear();
            STOP_COVERAGE.clear();
            BRANCHES.clear();
            NOTES.clear();
            List<Row> rows = buildRows(kind, true);
            List<Row> again = buildRows(kind, false);
            if (rows.size() != again.size()) {
                throw new Bug("row count differs between the two builds");
            }
            for (int i = 0; i < rows.size(); i++) {
                if (!rows.get(i).json.equals(again.get(i).json)) {
                    throw new Bug("row " + rows.get(i).id + " differs between the two builds");
                }
            }
            if (kind == Kind.FORCE) {
                rows.addAll(logRows());
            }
            write(kind, rows, out);
        }
        pool.shutdownNow();
    }

    static void write(Kind kind, List<Row> rows, Path out) throws Exception {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String g : kind.groups) {
            counts.put(g, (int) rows.stream().filter(r -> r.group.equals(g)).count());
        }
        StringBuilder sb = new StringBuilder("{\n  \"jdk\": ");
        str(sb, System.getProperty("java.version"));
        sb.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"seed\": ").append(SEED);
        sb.append(",\n  \"logSeed\": ").append(LOG_SEED).append(",\n  \"rowCounts\": {");
        int k = 0;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            sb.append(k++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        sb.append("},\n  \"optionCoverage\": ").append(coverageJson()).append(",\n  \"stopCoverage\": ").append(stopCoverageJson())
                .append(",\n  \"branchCoverage\": ").append(branchJson()).append(",\n  \"rows\": [\n");
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
            throw new Bug(kind.file + " " + bytes.length + " bytes reaches the 16 MiB cap");
        }
        strictParse(sb.toString());
        Files.write(out.resolve(kind.file), bytes);
        System.err.println(kind.file + ": rows " + rows.size() + " " + counts + " bytes " + bytes.length);
        System.err.println("optionCoverage " + coverageJson());
        System.err.println("stopCoverage " + stopCoverageJson());
        System.err.println("branchCoverage " + branchJson());
        for (String note : NOTES) {
            System.err.println(note);
        }
    }

    static void setup() throws Exception {
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/force-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new ForceMetaDataProvider(), new StressMetaDataProvider());
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty(IDENTIFIER_SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        pool = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "force-row");
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

    static List<Row> buildRows(Kind kind, boolean record) throws Exception {
        Random rnd = new Random(SEED);
        List<Shape> shapes = shapes(rnd);
        List<Factor> factors = kind == Kind.FORCE ? forceFactors() : stressFactors();
        List<Row> rows = new ArrayList<>();
        for (Shape s : shapes) {
            if (kind == Kind.STRESS && s.nodes > STRESS_MAX_NODES) {
                continue;
            }
            int stopsLevel = kind == Kind.STRESS && s.nodes > STRESS_STOPS_MAX_NODES ? 0 : s.stopsLevel;
            boolean first = true;
            for (Factor f : factors) {
                if (!first && !f.applies.test(s.make.get())) {
                    continue;
                }
                Supplier<ElkNode> prep = prepare(kind, s.make, f);
                rows.add(row(kind, FULL + "/" + s.id + "/" + f.id, FULL, prep, record));
                if (stopsLevel == 2 || (stopsLevel == 1 && first)) {
                    rows.add(row(kind, STOPS + "/" + s.id + "/" + f.id, STOPS, prep, record));
                }
                first = false;
            }
        }
        for (Object[] t : throwsScenarios(kind)) {
            @SuppressWarnings("unchecked")
            Supplier<ElkNode> make = (Supplier<ElkNode>) t[1];
            rows.add(row(kind, THROWS + "/" + t[0], THROWS, prepare(kind, make, factors.get(0)), record));
        }
        return rows;
    }

    static Supplier<ElkNode> prepare(Kind kind, Supplier<ElkNode> make, Factor f) {
        return () -> {
            ElkNode g = make.get();
            for (ElkNode p : parents(g)) {
                p.setProperty(CoreOptions.ALGORITHM, kind.algorithm);
            }
            f.apply.accept(g);
            sizeLabels(g);
            return g;
        };
    }

    /** Builds one row twice from scratch; the second serialisation must equal the first. */
    static Row row(Kind kind, String id, String group, Supplier<ElkNode> prep, boolean record) throws Exception {
        Row a = buildRow(kind, id, group, prep, record);
        Row b = buildRow(kind, id, group, prep, false);
        if (!a.json.equals(b.json)) {
            throw new Bug("row " + id + " is not stable across two builds");
        }
        return a;
    }

    static Row buildRow(Kind kind, String id, String group, Supplier<ElkNode> prep, boolean record) throws Exception {
        try {
            return buildRowChecked(kind, id, group, prep, record);
        } catch (Bug b) {
            throw new Bug("row " + id + ": " + b.getMessage());
        }
    }

    static Row buildRowChecked(Kind kind, String id, String group, Supplier<ElkNode> prep, boolean record) throws Exception {
        if (record && System.getenv("FORCE_TRACE") != null) {
            System.err.println("TRACE ROW " + kind + " " + id);
        }
        ElkNode original = prep.get();
        String input = export(original);
        boolean stops = group.equals(STOPS);
        Outcome viaImport = timed(id, () -> run(kind, ElkGraphJson.forGraph(input).toElk(), stops));
        Outcome viaOriginal = timed(id, () -> run(kind, prep.get(), stops));
        if (viaImport.threw != viaOriginal.threw || !viaImport.json.equals(viaOriginal.json)) {
            throw new Bug("round trip: row " + id + " differs between the re-imported and the original graph:\n" + viaImport.json
                    + "\n" + viaOriginal.json);
        }
        if (group.equals(THROWS) != viaImport.threw) {
            throw new Bug("row " + id + (viaImport.threw ? " threw but is planned " + group : " is planned throws but ran: "
                    + viaImport.json));
        }
        Set<String> tags = viaImport.tags;
        if (viaImport.threw) {
            Outcome viaStops = timed(id, () -> run(kind, ElkGraphJson.forGraph(input).toElk(), true));
            if (!viaStops.threw || !viaStops.json.equals(viaImport.json)) {
                throw new Bug("row " + id + ": the stops path does not throw the same exception: " + viaStops.json);
            }
        } else if (!stops && isFlat(original)) {
            // the reflective drive must end bit-identical to the engine run (checked inside run), for every full row too
            Outcome drive = timed(id, () -> run(kind, ElkGraphJson.forGraph(input).toElk(), true));
            if (!drive.last.equals(viaImport.json)) {
                throw new Bug("row " + id + ": the reflective drive differs from the engine run");
            }
            tags = drive.tags;
        } else if (stops && !viaImport.last.equals(runFullDump(kind, input))) {
            throw new Bug("row " + id + ": the reflective drive differs from the engine run");
        }
        if (record) {
            countCoverage(kind, group, original);
            for (String t : tags) {
                BRANCHES.merge(group + ":" + t, 1, Integer::sum);
            }
            if (stops) {
                countStops(viaImport.json);
            }
        }
        StringBuilder sb = new StringBuilder("{\"id\": ");
        str(sb, id);
        sb.append(", \"group\": \"").append(group).append("\", \"input\": ").append(input).append(", \"expected\": ")
                .append(viaImport.json).append('}');
        return new Row(id, group, sb.toString());
    }

    static String runFullDump(Kind kind, String input) throws Exception {
        return timed("engine", () -> run(kind, ElkGraphJson.forGraph(input).toElk(), false).json);
    }

    static boolean isFlat(ElkNode g) {
        return g.getChildren().stream().allMatch(c -> c.getChildren().isEmpty());
    }

    // ------------------------------------------------------------------------------------------------------------
    // Runs

    static Outcome run(Kind kind, ElkNode graph, boolean stops) {
        try {
            if (!stops) {
                new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
                String d = elkDump(graph);
                return new Outcome(false, d, d, Set.of());
            }
            return kind == Kind.FORCE ? new Driver(graph).force() : new Driver(graph).stress();
        } catch (RuntimeException e) {
            StackTraceElement frame = elkFrame(e);
            if (frame == null) {
                throw e;
            }
            StringBuilder sb = new StringBuilder("{\"throws\": {\"class\": ");
            str(sb, e.getClass().getName());
            sb.append(", \"message\": ");
            str(sb, e.getMessage());
            sb.append(", \"frame\": ");
            str(sb, frame.getFileName() + ":" + frame.getLineNumber());
            sb.append("}}");
            return new Outcome(true, sb.toString(), null, Set.of());
        }
    }

    /** The first org.eclipse.elk frame of an exception thrown while ELK code runs (before any frame of this program), or null. */
    static StackTraceElement elkFrame(RuntimeException e) {
        if (e instanceof Bug) {
            return null;
        }
        for (StackTraceElement f : e.getStackTrace()) {
            if (f.getClassName().startsWith("ForceVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------------------------------------------------
    // The reflective drive of the providers

    static Object invoke(Method m, Object target, Object... args) {
        try {
            return m.invoke(target, args);
        } catch (InvocationTargetException e) {
            if (e.getCause() instanceof RuntimeException re) {
                throw re;
            }
            throw new Bug("checked exception from " + m + ": " + e.getCause());
        } catch (IllegalAccessException e) {
            throw new Bug("cannot call " + m + ": " + e);
        }
    }

    static Method method(Class<?> c, String name, Class<?>... types) {
        for (Class<?> k = c; k != null; k = k.getSuperclass()) {
            try {
                Method m = k.getDeclaredMethod(name, types);
                m.setAccessible(true);
                return m;
            } catch (NoSuchMethodException e) {
                // try the superclass
            }
        }
        throw new Bug("no method " + name + " in " + c);
    }

    static Object field(Object o, String name) {
        for (Class<?> k = o.getClass(); k != null; k = k.getSuperclass()) {
            try {
                Field f = k.getDeclaredField(name);
                f.setAccessible(true);
                return f.get(o);
            } catch (NoSuchFieldException e) {
                // try the superclass
            } catch (IllegalAccessException e) {
                throw new Bug("cannot read " + name + ": " + e);
            }
        }
        throw new Bug("no field " + name + " in " + o.getClass());
    }

    /** One drive of a provider: collects the stops in order. */
    static final class Driver {
        final ElkNode graph;
        final List<String> steps = new ArrayList<>();
        final List<String> stops = new ArrayList<>();
        final Set<String> tags = new TreeSet<>();

        Driver(ElkNode graph) {
            this.graph = graph;
        }

        void stop(String step, Integer component, String body) {
            steps.add(step);
            stops.add("{\"step\": \"" + step + "\", \"component\": " + (component == null ? "null" : component.toString()) + ", "
                    + body + "}");
        }

        Outcome finish() {
            StringBuilder sb = new StringBuilder("{\"steps\": [");
            for (int i = 0; i < steps.size(); i++) {
                sb.append(i == 0 ? "" : ", ").append('"').append(steps.get(i)).append('"');
            }
            sb.append("], \"stops\": [\n").append(String.join(",\n", stops)).append("\n]}");
            return new Outcome(false, sb.toString().replace("\n", ""), elkDump(graph), tags);
        }

        /** What RecursiveGraphLayoutEngine.layout does before any provider runs (RecursiveGraphLayoutEngine.java:105-106): the
         * LayoutAlgorithmResolver sets RESOLVED_ALGORITHM on every node. The property lookups of the providers see it: without
         * it a stress row ends with padding 12 instead of 50 (NodeMicroLayout writes the CoreOptions default 12 as an explicit
         * root padding where the engine's context yields 50). */
        void resolve() {
            ElkUtil.applyVisitors(graph, new LayoutAlgorithmResolver());
        }

        /** The engine run of a pristine copy of the input is the reference the drive must reproduce bit for bit. */
        void checkAgainstEngine(ElkNode pristine) {
            new RecursiveGraphLayoutEngine().layout(pristine, new BasicProgressMonitor());
            String expected = elkDump(pristine), actual = elkDump(graph);
            if (!expected.equals(actual)) {
                throw new Bug("the reflective drive ends differently from the engine run:\n" + actual + "\n" + expected);
            }
        }

        // ---- force: the body of ForceLayoutProvider.layout, one step at a time (F/ForceLayoutProvider.java:41-71)

        Outcome force() {
            ElkNode pristine = ElkGraphJson.forGraph(export(graph)).toElk();
            resolve();
            ForceLayoutProvider provider = new ForceLayoutProvider();
            if (!graph.getProperty(ForceOptions.OMIT_NODE_MICRO_LAYOUT)) {
                NodeMicroLayout.forGraph(graph).execute();
            }
            ElkGraphImporter importer = new ElkGraphImporter();
            FGraph fgraph = importer.importGraph(graph);
            stop("import", null, "\"state\": " + fdump(fgraph, false));
            invoke(method(ForceLayoutProvider.class, "setOptions", FGraph.class, ElkNode.class), provider, fgraph, graph);
            invoke(method(ForceLayoutProvider.class, "updateModel", ForceModelStrategy.class), provider,
                    fgraph.getProperty(ForceOptions.MODEL));
            AbstractForceModel model = (AbstractForceModel) field(provider, "forceModel");
            ComponentsProcessor processor = new ComponentsProcessor();
            List<FGraph> components = processor.split(fgraph);
            if (components.size() > 1) {
                tags.add("split>1");
            } else {
                tags.add("split=1");
            }
            List<String> parts = new ArrayList<>();
            for (FGraph c : components) {
                parts.add(fdump(c, false));
            }
            stop("split", null, "\"model\": " + q(model.getClass().getSimpleName()) + ", \"randomPeek\": "
                    + peek(fgraph.getProperty(InternalProperties.RANDOM)) + ", \"components\": [" + String.join(", ", parts) + "]");
            for (int k = 0; k < components.size(); k++) {
                forceComponent(model, components.get(k), k);
            }
            FGraph result = processor.recombine(components);
            tags.add(components.size() > 1 ? "recombine>1" : "recombine=1");
            stop("recombine", null, recombineBody(components, result, false));
            importer.applyLayout(result);
            stop("applyLayout", null, "\"elk\": " + elkDump(graph));
            checkAgainstEngine(pristine);
            return finish();
        }

        /** The loop body of AbstractForceModel.layout (F/model/AbstractForceModel.java:101-127), driven by reflection. */
        void forceComponent(AbstractForceModel model, FGraph comp, int k) {
            Method initialize = method(model.getClass(), "initialize", FGraph.class);
            Method more = method(model.getClass(), "moreIterations", int.class);
            Method done = method(model.getClass(), "iterationDone");
            Method calc = method(model.getClass(), "calcDisplacement", FParticle.class, FParticle.class);
            invoke(initialize, model, comp);
            stop("initialize", k, "\"iteration\": 0, \"state\": " + fdump(comp, false) + ", \"model\": " + modelDump(model));
            double dispBound = (Double) field(model, "dispBound");
            int iterations = 0;
            while ((Boolean) invoke(more, model, iterations)) {
                invoke(done, model);
                for (FParticle v : comp.getParticles()) {
                    for (FParticle u : comp.getParticles()) {
                        if (u != v) {
                            tagSamePosition(u, v);
                            KVector displacement = (KVector) invoke(calc, model, u, v);
                            if (displacement != null) {
                                v.getDisplacement().add(displacement);
                            }
                        }
                    }
                }
                for (FParticle v : comp.getParticles()) {
                    KVector d = v.getDisplacement();
                    d.bound(-dispBound, -dispBound, dispBound, dispBound);
                    v.getPosition().add(d);
                    d.reset();
                }
                iterations++;
                if (iterations == 1 || iterations == 2 || iterations == 10) {
                    stop("iteration" + iterations, k, iterationBody(model, comp, iterations));
                }
            }
            stop("iterationLast", k, iterationBody(model, comp, iterations));
            tags.add("iterations" + (iterations == 0 ? "=0" : iterations < 10 ? "<10" : ">=10"));
        }

        String iterationBody(AbstractForceModel model, FGraph comp, int iterations) {
            return "\"iteration\": " + iterations + ", \"state\": " + fdump(comp, false) + ", \"model\": " + modelDump(model);
        }

        /** Which arm of AbstractForceModel.avoidSamePosition (F/model/AbstractForceModel.java:174-201) the pair will take. */
        void tagSamePosition(FParticle u, FParticle v) {
            KVector pu = u.getPosition(), pv = v.getPosition();
            if (pu.x - pv.x == 0 && pu.y - pv.y == 0) {
                tags.add(u instanceof FBendpoint && v instanceof FBendpoint ? "avoidSamePosition:bendpoints"
                        : "avoidSamePosition:wiggle");
            }
        }

        // ---- stress: the body of StressLayoutProvider.layout (F/stress/StressLayoutProvider.java:46-85)

        Outcome stress() {
            ElkNode pristine = ElkGraphJson.forGraph(export(graph)).toElk();
            resolve();
            if (!graph.getProperty(StressOptions.INTERACTIVE)) {
                IElkProgressMonitor monitor = new BasicProgressMonitor();
                monitor.begin("ELK Stress", 1);
                new ForceLayoutProvider().layout(graph, monitor.subTask(1));
                stop("forcePass", null, "\"elk\": " + elkDump(graph));
            } else {
                if (!graph.getProperty(StressOptions.OMIT_NODE_MICRO_LAYOUT)) {
                    NodeMicroLayout.forGraph(graph).execute();
                }
                stop("microLayout", null, "\"elk\": " + elkDump(graph));
            }
            ElkGraphImporter importer = new ElkGraphImporter();
            FGraph fgraph = importer.importGraph(graph);
            stop("import", null, "\"state\": " + fdump(fgraph, true));
            ComponentsProcessor processor = new ComponentsProcessor();
            List<FGraph> components = processor.split(fgraph);
            tags.add(components.size() > 1 ? "split>1" : "split=1");
            List<String> parts = new ArrayList<>();
            for (FGraph c : components) {
                parts.add(fdump(c, true));
            }
            stop("split", null, "\"components\": [" + String.join(", ", parts) + "]");
            StressMajorization majorization = new StressMajorization();
            for (int k = 0; k < components.size(); k++) {
                FGraph sub = components.get(k);
                if (sub.getNodes().size() <= 1) {
                    tags.add("stress:skippedComponent");
                    continue;
                }
                majorization.initialize(sub);
                stop("initialize", k, "\"state\": " + fdump(sub, true) + ", \"stress\": " + stressDump(majorization, true));
                majorization.execute();
                stop("execute", k, "\"state\": " + fdump(sub, true) + ", \"stress\": " + stressDump(majorization, false));
                sub.getLabels().forEach(label -> label.refreshPosition());
                stop("labelRefresh", k, "\"state\": " + fdump(sub, true));
            }
            FGraph result = processor.recombine(components);
            tags.add(components.size() > 1 ? "recombine>1" : "recombine=1");
            stop("recombine", null, recombineBody(components, result, true));
            importer.applyLayout(result);
            stop("applyLayout", null, "\"elk\": " + elkDump(graph));
            checkAgainstEngine(pristine);
            return finish();
        }
    }

    static String recombineBody(List<FGraph> components, FGraph result, boolean stress) {
        List<String> parts = new ArrayList<>();
        for (FGraph c : components) {
            KVector ul = c.getProperty(InternalProperties.BB_UPLEFT), lr = c.getProperty(InternalProperties.BB_LOWRIGHT);
            parts.add("{\"first\": " + (c.getNodes().isEmpty() ? "null" : q(nameOf(c.getNodes().get(0)))) + ", \"nodes\": "
                    + c.getNodes().size() + ", \"prio\": " + c.getProperty(ForceOptions.PRIORITY) + ", \"bbUpLeft\": "
                    + (ul == null ? "null" : vec(ul)) + ", \"bbLowRight\": " + (lr == null ? "null" : vec(lr)) + "}");
        }
        return "\"components\": [" + String.join(", ", parts) + "], \"result\": " + fdump(result, stress);
    }

    // ------------------------------------------------------------------------------------------------------------
    // FGraph dumps

    static String nameOf(MapPropertyHolder p) {
        Object o = p.getProperty(InternalProperties.ORIGIN);
        return o instanceof ElkGraphElement e ? id(e) : "";
    }

    static String vec(KVector v) {
        return "[" + hex(v.x) + ", " + hex(v.y) + "]";
    }

    static String peek(Random r) throws RuntimeException {
        if (r == null) {
            return "null";
        }
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
                out.writeObject(r);
            }
            try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
                return "\"" + String.format("%016x", ((Random) in.readObject()).nextLong()) + "\"";
            }
        } catch (IOException | ClassNotFoundException e) {
            throw new Bug("cannot copy the random generator: " + e);
        }
    }

    static String fdump(FGraph g, boolean stress) {
        StringBuilder sb = new StringBuilder("{\"props\": ").append(propsDump(g, stress)).append(", \"nodes\": [");
        int i = 0;
        for (FNode n : g.getNodes()) {
            sb.append(i++ == 0 ? "" : ", ").append("{\"id\": ").append(n.id).append(", \"name\": ").append(q(nameOf(n)))
                    .append(", \"label\": ").append(q(n.getLabel())).append(", \"pos\": ").append(vec(n.getPosition()))
                    .append(", \"disp\": ").append(vec(n.getDisplacement())).append(", \"size\": ").append(vec(n.getSize()))
                    .append(", \"prio\": ").append(n.getProperty(ForceOptions.PRIORITY));
            if (stress) {
                sb.append(", \"fixed\": ").append(n.getProperty(StressOptions.FIXED));
            }
            sb.append('}');
        }
        sb.append("], \"edges\": [");
        i = 0;
        for (FEdge e : g.getEdges()) {
            sb.append(i++ == 0 ? "" : ", ").append(edgeDump(e, stress));
        }
        sb.append("], \"labels\": [");
        i = 0;
        for (FLabel l : g.getLabels()) {
            sb.append(i++ == 0 ? "" : ", ").append("{\"name\": ").append(q(nameOf(l))).append(", \"text\": ").append(q(l.getText()))
                    .append(", \"edge\": ").append(q(nameOf(l.getEdge()))).append(", \"pos\": ").append(vec(l.getPosition()))
                    .append(", \"disp\": ").append(vec(l.getDisplacement())).append(", \"size\": ").append(vec(l.getSize()))
                    .append(", \"inline\": ").append(l.getProperty(ForceOptions.EDGE_LABELS_INLINE)).append(", \"prio\": ")
                    .append(l.getProperty(ForceOptions.PRIORITY)).append('}');
        }
        sb.append("], \"bends\": [");
        i = 0;
        for (FBendpoint b : g.getBendpoints()) {
            sb.append(i++ == 0 ? "" : ", ").append("{\"edge\": ").append(q(nameOf(b.getEdge()))).append(", \"index\": ")
                    .append(b.getEdge().getBendpoints().indexOf(b)).append(", \"pos\": ").append(vec(b.getPosition()))
                    .append(", \"disp\": ").append(vec(b.getDisplacement())).append(", \"size\": ").append(vec(b.getSize()))
                    .append(", \"prio\": ").append(b.getProperty(ForceOptions.PRIORITY)).append('}');
        }
        sb.append("], \"adjacency\": ").append(adjacencyDump((int[][]) field(g, "adjacency"))).append('}');
        return sb.toString();
    }

    static String edgeDump(FEdge e, boolean stress) {
        StringBuilder sb = new StringBuilder("{\"name\": ").append(q(nameOf(e))).append(", \"src\": ")
                .append(q(nameOf(e.getSource()))).append(", \"tgt\": ").append(q(nameOf(e.getTarget()))).append(", \"srcId\": ")
                .append(e.getSource().id).append(", \"tgtId\": ").append(e.getTarget().id).append(", \"prio\": ")
                .append(e.getProperty(ForceOptions.PRIORITY)).append(", \"power\": ")
                .append(e.getProperty(ForceOptions.REPULSIVE_POWER)).append(", \"labelSpacing\": ")
                .append(hex(e.getProperty(ForceOptions.SPACING_EDGE_LABEL))).append(", \"sp\": ").append(vec(e.getSourcePoint()))
                .append(", \"tp\": ").append(vec(e.getTargetPoint())).append(", \"bends\": [");
        int i = 0;
        for (FBendpoint b : e.getBendpoints()) {
            sb.append(i++ == 0 ? "" : ", ").append(vec(b.getPosition()));
        }
        sb.append(']');
        if (stress) {
            sb.append(", \"del\": ").append(e.hasProperty(StressOptions.DESIRED_EDGE_LENGTH)
                    ? hex(e.getProperty(StressOptions.DESIRED_EDGE_LENGTH)) : "null");
        }
        return sb.append('}').toString();
    }

    static String adjacencyDump(int[][] a) {
        if (a == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) {
            sb.append(i == 0 ? "" : ", ").append(Arrays.toString(a[i]).replace(" ", ""));
        }
        return sb.append(']').toString();
    }

    static String propsDump(FGraph g, boolean stress) {
        KVector ul = g.getProperty(InternalProperties.BB_UPLEFT), lr = g.getProperty(InternalProperties.BB_LOWRIGHT);
        ElkPadding p = g.getAllProperties().get(ForceOptions.PADDING) != null
                ? (ElkPadding) g.getAllProperties().get(ForceOptions.PADDING) : ForceOptions.PADDING.getDefault();
        Integer seed = g.getProperty(ForceOptions.RANDOM_SEED);
        StringBuilder sb = new StringBuilder("{\"model\": ").append(q(g.getProperty(ForceOptions.MODEL).name()))
                .append(", \"iterations\": ").append(g.getProperty(ForceOptions.ITERATIONS)).append(", \"temperature\": ")
                .append(hex(g.getProperty(ForceOptions.TEMPERATURE))).append(", \"repulsion\": ")
                .append(hex(g.getProperty(ForceOptions.REPULSION))).append(", \"spacing\": ")
                .append(hex(g.getProperty(ForceOptions.SPACING_NODE_NODE))).append(", \"aspectRatio\": ")
                .append(hex(g.getProperty(ForceOptions.ASPECT_RATIO))).append(", \"randomSeed\": ").append(seed)
                .append(", \"separate\": ").append(g.getProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS))
                .append(", \"interactive\": ").append(g.getProperty(ForceOptions.INTERACTIVE)).append(", \"prio\": ")
                .append(g.getProperty(ForceOptions.PRIORITY)).append(", \"padding\": ").append(padding(p))
                .append(", \"bbUpLeft\": ").append(ul == null ? "null" : vec(ul)).append(", \"bbLowRight\": ")
                .append(lr == null ? "null" : vec(lr)).append(", \"randomPeek\": ")
                .append(peek(g.getProperty(InternalProperties.RANDOM)));
        if (stress) {
            sb.append(", \"dimension\": ").append(q(g.getProperty(StressOptions.DIMENSION).name())).append(", \"iterationLimit\": ")
                    .append(g.getProperty(StressOptions.ITERATION_LIMIT)).append(", \"epsilon\": ")
                    .append(hex(g.getProperty(StressOptions.EPSILON))).append(", \"desiredEdgeLength\": ")
                    .append(hex(g.getProperty(StressOptions.DESIRED_EDGE_LENGTH)));
        }
        return sb.append('}').toString();
    }

    /** Every instance field of the concrete model plus dispBound of AbstractForceModel. */
    static String modelDump(AbstractForceModel model) {
        TreeMap<String, String> values = new TreeMap<>();
        values.put("dispBound", hex((Double) field(model, "dispBound")));
        for (Field f : model.getClass().getDeclaredFields()) {
            if (Modifier.isStatic(f.getModifiers())) {
                continue;
            }
            Object v = field(model, f.getName());
            values.put(f.getName(), v instanceof Double d ? hex(d) : String.valueOf(v));
        }
        StringBuilder sb = new StringBuilder("{\"class\": ").append(q(model.getClass().getSimpleName()));
        values.forEach((k, v) -> sb.append(", \"").append(k).append("\": ").append(v));
        return sb.append('}').toString();
    }

    static String stressDump(StressMajorization m, boolean matrices) {
        StringBuilder sb = new StringBuilder("{\"dim\": ").append(q(((Enum<?>) field(m, "dim")).name()))
                .append(", \"iterationLimit\": ").append(field(m, "iterationLimit")).append(", \"epsilon\": ")
                .append(hex((Double) field(m, "epsilon"))).append(", \"desiredEdgeLength\": ")
                .append(hex((Double) field(m, "desiredEdgeLength")));
        if (matrices) {
            sb.append(", \"apsp\": ").append(matrix((double[][]) field(m, "apsp"))).append(", \"w\": ")
                    .append(matrix((double[][]) field(m, "w")));
        }
        return sb.append('}').toString();
    }

    static String matrix(double[][] a) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < a.length; i++) {
            sb.append(i == 0 ? "" : ", ").append('[');
            for (int j = 0; j < a[i].length; j++) {
                sb.append(j == 0 ? "" : ", ").append(hex(a[i][j]));
            }
            sb.append(']');
        }
        return sb.append(']').toString();
    }

    // ------------------------------------------------------------------------------------------------------------
    // ELK graph dump

    static String elkDump(ElkNode root) {
        List<String> nodes = new ArrayList<>(), ports = new ArrayList<>(), labels = new ArrayList<>(), edges = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        String g = "{\"id\": " + q(unique(seen, id(root))) + ", \"x\": " + hex(root.getX()) + ", \"y\": " + hex(root.getY())
                + ", \"w\": " + hex(root.getWidth()) + ", \"h\": " + hex(root.getHeight()) + ", \"padding\": "
                + padding(effective(root, CoreOptions.PADDING)) + ", \"childArea\": " + childArea(root) + "}";
        visit(root, seen, nodes, ports, labels, edges);
        return "{\"graph\": " + g + ", \"nodes\": [" + String.join(", ", nodes) + "], \"ports\": [" + String.join(", ", ports)
                + "], \"labels\": [" + String.join(", ", labels) + "], \"edges\": [" + String.join(", ", edges) + "]}";
    }

        /** The value of a property with a mutable default WITHOUT storing the default in the element. ElkGraphElement.getProperty
     * stores a copy of a cloneable default (ElkPadding, ElkMargin) the first time it is read, so a dump that read the root's
     * padding in the middle of a run changed what the importer read later (padding 12 instead of ForceOptions' 50). The dump is
     * therefore an observer that must not write: explicit value if set, else the property's default. */
    @SuppressWarnings("unchecked")
    static <T> T effective(ElkNode n, org.eclipse.elk.graph.properties.IProperty<T> p) {
        Object v = n.getAllProperties().get(p);
        return v != null ? (T) v : p.getDefault();
    }

    static String childArea(ElkNode n) {
        Double w = n.getProperty(CoreOptions.CHILD_AREA_WIDTH), h = n.getProperty(CoreOptions.CHILD_AREA_HEIGHT);
        return w == null || h == null ? "null" : "[" + hex(w) + ", " + hex(h) + "]";
    }

    static String unique(Set<String> seen, String id) {
        if (!seen.add(id)) {
            throw new Bug("duplicate element id " + id);
        }
        return id;
    }

    static void visit(ElkNode parent, Set<String> seen, List<String> nodes, List<String> ports, List<String> labels,
            List<String> edges) {
        for (ElkNode n : parent.getChildren()) {
            String id = unique(seen, id(n));
            nodes.add("{\"id\": " + q(id) + ", \"x\": " + hex(n.getX()) + ", \"y\": " + hex(n.getY()) + ", \"w\": "
                    + hex(n.getWidth()) + ", \"h\": " + hex(n.getHeight()) + ", \"margins\": "
                    + margin(effective(n, CoreOptions.MARGINS)) + ", \"padding\": " + padding(effective(n, CoreOptions.PADDING))
                    + (n.getChildren().isEmpty() ? "" : ", \"childArea\": " + childArea(n)) + "}");
            labels(n.getLabels(), seen, labels);
            for (ElkPort p : n.getPorts()) {
                String pid = unique(seen, id(p));
                ports.add(box(pid, p.getX(), p.getY(), p.getWidth(), p.getHeight()));
                labels(p.getLabels(), seen, labels);
            }
            visit(n, seen, nodes, ports, labels, edges);
        }
        for (ElkEdge e : parent.getContainedEdges()) {
            String id = unique(seen, id(e));
            StringBuilder sb = new StringBuilder("{\"id\": " + q(id) + ", \"sections\": [");
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
            edges.add(sb.append("]}").toString());
            labels(e.getLabels(), seen, labels);
        }
    }

    static void labels(List<ElkLabel> ls, Set<String> seen, List<String> out) {
        for (ElkLabel l : ls) {
            String id = unique(seen, id(l));
            out.add(box(id, l.getX(), l.getY(), l.getWidth(), l.getHeight()));
            labels(l.getLabels(), seen, out);
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

    static String margin(ElkMargin m) {
        return "[" + hex(m.top) + ", " + hex(m.right) + ", " + hex(m.bottom) + ", " + hex(m.left) + "]";
    }

    static String padding(ElkPadding p) {
        return "[" + hex(p.top) + ", " + hex(p.right) + ", " + hex(p.bottom) + ", " + hex(p.left) + "]";
    }

    // ------------------------------------------------------------------------------------------------------------
    // Coverage

    static void countCoverage(Kind kind, String group, ElkNode g) {
        List<ElkNode> parents = parents(g);
        if (kind == Kind.FORCE) {
            cover("model", g.getProperty(ForceOptions.MODEL).name(), group);
            cover("iterations", String.valueOf(g.getProperty(ForceOptions.ITERATIONS)), group);
            cover("temperature", String.valueOf(g.getProperty(ForceOptions.TEMPERATURE)), group);
            cover("repulsion", String.valueOf(g.getProperty(ForceOptions.REPULSION)), group);
            cover("spacingNodeNode", String.valueOf(g.getProperty(ForceOptions.SPACING_NODE_NODE)), group);
            cover("aspectRatio", String.valueOf(g.getProperty(ForceOptions.ASPECT_RATIO)), group);
            cover("randomSeed", String.valueOf(g.getProperty(ForceOptions.RANDOM_SEED)), group);
            cover("separateConnectedComponents", String.valueOf(g.getProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS)), group);
            cover("padding", g.hasProperty(ForceOptions.PADDING) ? "explicit" : "default", group);
            cover("interactive", String.valueOf(g.getProperty(ForceOptions.INTERACTIVE)), group);
            cover("fixedGraphSize", String.valueOf(g.getProperty(ForceOptions.NODE_SIZE_FIXED_GRAPH_SIZE)), group);
            cover("omitNodeMicroLayout", String.valueOf(g.getProperty(ForceOptions.OMIT_NODE_MICRO_LAYOUT)), group);
            int power = 0;
            for (ElkEdge e : allEdges(g)) {
                power = Math.max(power, e.getProperty(ForceOptions.REPULSIVE_POWER));
            }
            cover("repulsivePowerMax", String.valueOf(power), group);
            cover("priorityNodes", allNodes(g).stream().anyMatch(n -> n.hasProperty(ForceOptions.PRIORITY)) ? "set" : "unset", group);
            cover("priorityEdges", allEdges(g).stream().anyMatch(e -> e.hasProperty(ForceOptions.PRIORITY)) ? "set" : "unset", group);
            cover("priorityLabels", allLabels(g).stream().anyMatch(l -> l.hasProperty(ForceOptions.PRIORITY)) ? "set" : "unset",
                    group);
            cover("spacingEdgeLabel", allEdges(g).stream().anyMatch(e -> e.hasProperty(ForceOptions.SPACING_EDGE_LABEL)) ? "set"
                    : "unset", group);
            cover("edgeLabelsInline", labelInline(g), group);
            cover("hierarchyParents", String.valueOf(parents.size()), group);
        } else {
            cover("interactive", String.valueOf(g.getProperty(StressOptions.INTERACTIVE)), group);
            cover("omitNodeMicroLayout", String.valueOf(g.getProperty(StressOptions.OMIT_NODE_MICRO_LAYOUT)), group);
            cover("fixed", allNodes(g).stream().anyMatch(n -> n.getProperty(StressOptions.FIXED)) ? "some" : "none", group);
            cover("desiredEdgeLengthRoot", g.hasProperty(StressOptions.DESIRED_EDGE_LENGTH)
                    ? String.valueOf(g.getProperty(StressOptions.DESIRED_EDGE_LENGTH)) : "default", group);
            cover("desiredEdgeLengthEdges", allEdges(g).stream().anyMatch(e -> e.hasProperty(StressOptions.DESIRED_EDGE_LENGTH))
                    ? "set" : "unset", group);
            cover("dimension", g.getProperty(StressOptions.DIMENSION).name(), group);
            cover("epsilon", String.valueOf(g.getProperty(StressOptions.EPSILON)), group);
            cover("iterationLimit", String.valueOf(g.getProperty(StressOptions.ITERATION_LIMIT)), group);
            cover("edgeLabelsInline", labelInline(g), group);
            cover("forceModel", g.getProperty(ForceOptions.MODEL).name(), group);
        }
    }

    static String labelInline(ElkNode g) {
        List<ElkLabel> ls = allLabels(g);
        if (ls.isEmpty()) {
            return "no labels";
        }
        boolean any = ls.stream().anyMatch(l -> l.hasProperty(ForceOptions.EDGE_LABELS_INLINE));
        return any ? String.valueOf(ls.get(0).getProperty(ForceOptions.EDGE_LABELS_INLINE)) : "unset";
    }

    static void cover(String option, String value, String group) {
        int[] c = COVERAGE.computeIfAbsent(option, k -> new TreeMap<>()).computeIfAbsent(value, k -> new int[4]);
        c[List.of(FULL, STOPS, THROWS, LOG).indexOf(group)]++;
    }

    /** Counts the stop names of one stops row (the names inside "steps": [...]). */
    static void countStops(String json) {
        int a = json.indexOf("\"steps\": [") + "\"steps\": [".length();
        for (String s : json.substring(a, json.indexOf(']', a)).split(", ")) {
            STOP_COVERAGE.computeIfAbsent(s.replace("\"", ""), k -> new int[1])[0]++;
        }
    }

    static String coverageJson() {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Map<String, int[]>> e : COVERAGE.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": {");
            int j = 0;
            for (Map.Entry<String, int[]> v : e.getValue().entrySet()) {
                int[] c = v.getValue();
                sb.append(j++ == 0 ? "" : ", ").append('"').append(v.getKey()).append("\": {\"full\": ").append(c[0])
                        .append(", \"stops\": ").append(c[1]).append(", \"throws\": ").append(c[2]).append('}');
            }
            sb.append('}');
        }
        return sb.append('}').toString();
    }

    static String stopCoverageJson() {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, int[]> e : STOP_COVERAGE.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue()[0]);
        }
        return sb.append('}').toString();
    }

    static String branchJson() {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Integer> e : BRANCHES.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        return sb.append('}').toString();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Graph traversal helpers

    static List<ElkNode> parents(ElkNode root) {
        List<ElkNode> out = new ArrayList<>(List.of(root));
        for (ElkNode n : allNodes(root)) {
            if (!n.getChildren().isEmpty()) {
                out.add(n);
            }
        }
        return out;
    }

    static List<ElkNode> allNodes(ElkNode root) {
        List<ElkNode> out = new ArrayList<>();
        for (ElkNode c : root.getChildren()) {
            out.add(c);
            out.addAll(allNodes(c));
        }
        return out;
    }

    static List<ElkEdge> allEdges(ElkNode root) {
        List<ElkEdge> out = new ArrayList<>(root.getContainedEdges());
        for (ElkNode c : root.getChildren()) {
            out.addAll(allEdges(c));
        }
        return out;
    }

    static List<ElkLabel> allLabels(ElkNode root) {
        List<ElkLabel> out = new ArrayList<>();
        collectLabels(root, out);
        return out;
    }

    static void collectLabels(ElkNode node, List<ElkLabel> out) {
        out.addAll(node.getLabels());
        for (ElkPort p : node.getPorts()) {
            out.addAll(p.getLabels());
        }
        for (ElkEdge e : node.getContainedEdges()) {
            out.addAll(e.getLabels());
        }
        for (ElkNode c : node.getChildren()) {
            collectLabels(c, out);
        }
    }

    static void sizeLabels(ElkNode root) {
        for (ElkLabel l : allLabels(root)) {
            String text = l.getText();
            if (text != null && !text.isEmpty() && l.getWidth() == 0.0 && l.getHeight() == 0.0) {
                l.setWidth(LABEL_CHAR_WIDTH * text.length());
                l.setHeight(LABEL_HEIGHT);
            }
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Factors (one at a time)

    static final Predicate<ElkNode> ALWAYS = g -> true;
    static final Predicate<ElkNode> HAS_EDGES = g -> !allEdges(g).isEmpty();
    static final Predicate<ElkNode> HAS_LABELS = g -> !allLabels(g).isEmpty() && allLabels(g).stream().anyMatch(l -> l.eContainer()
            instanceof ElkEdge);

    /** repulsivePower needs edges and no pair of antiparallel edges: their single bend points coincide at the midpoint with
     * opposite directions, avoidSamePosition (AbstractForceModel.java:187) then moves by orthU + orthV = 0 forever (the
     * triedForBendPoints flag is local to the loop pass): the oracle never returns. Observed with a jstack at that line. */
    static final Predicate<ElkNode> BENDABLE = g -> {
        Set<String> seen = new HashSet<>();
        List<ElkEdge> edges = allEdges(g);
        for (ElkEdge e : edges) {
            ElkNode a = ElkGraphUtil.connectableShapeToNode(e.getSources().get(0));
            ElkNode b = ElkGraphUtil.connectableShapeToNode(e.getTargets().get(0));
            if (a != b && seen.contains(id(b) + "\0" + id(a))) {
                return false;
            }
            seen.add(id(a) + "\0" + id(b));
        }
        return !edges.isEmpty();
    };

    static Factor f(String id, Predicate<ElkNode> applies, Consumer<ElkNode> apply) {
        return new Factor(id, applies, apply);
    }

    static void onParents(ElkNode g, Consumer<ElkNode> c) {
        parents(g).forEach(c);
    }

    static void eades(ElkNode g) {
        onParents(g, p -> p.setProperty(ForceOptions.MODEL, ForceModelStrategy.EADES));
    }

    static List<Factor> forceFactors() {
        List<Factor> l = new ArrayList<>();
        l.add(f("default", ALWAYS, g -> { }));
        l.add(f("modelEades", ALWAYS, ForceVectors::eades));
        l.add(f("modelFR", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.MODEL, ForceModelStrategy.FRUCHTERMAN_REINGOLD))));
        l.add(f("iterations10", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.ITERATIONS, 10))));
        l.add(f("iterations1000", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.ITERATIONS, 1000))));
        l.add(f("iterations0", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.ITERATIONS, 0))));
        l.add(f("eadesIterations10", ALWAYS, g -> {
            eades(g);
            onParents(g, p -> p.setProperty(ForceOptions.ITERATIONS, 10));
        }));
        l.add(f("eadesIterations1000", ALWAYS, g -> {
            eades(g);
            onParents(g, p -> p.setProperty(ForceOptions.ITERATIONS, 1000));
        }));
        l.add(f("eadesIterations0", ALWAYS, g -> {
            eades(g);
            onParents(g, p -> p.setProperty(ForceOptions.ITERATIONS, 0));
        }));
        l.add(f("temperature0_01", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.TEMPERATURE, 0.01))));
        l.add(f("temperature0", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.TEMPERATURE, 0.0))));
        l.add(f("eadesRepulsion20", ALWAYS, g -> {
            eades(g);
            onParents(g, p -> p.setProperty(ForceOptions.REPULSION, 20.0));
        }));
        l.add(f("repulsivePower1", BENDABLE, g -> allEdges(g).forEach(e -> e.setProperty(ForceOptions.REPULSIVE_POWER, 1))));
        l.add(f("repulsivePower3", BENDABLE, g -> allEdges(g).forEach(e -> e.setProperty(ForceOptions.REPULSIVE_POWER, 3))));
        l.add(f("eadesRepulsivePower2", BENDABLE, g -> {
            eades(g);
            allEdges(g).forEach(e -> e.setProperty(ForceOptions.REPULSIVE_POWER, 2));
        }));
        l.add(f("spacing0", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.SPACING_NODE_NODE, 0.0))));
        l.add(f("spacing30", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.SPACING_NODE_NODE, 30.0))));
        l.add(f("eadesSpacing0", ALWAYS, g -> {
            eades(g);
            onParents(g, p -> p.setProperty(ForceOptions.SPACING_NODE_NODE, 0.0));
        }));
        l.add(f("eadesSpacing30", ALWAYS, g -> {
            eades(g);
            onParents(g, p -> p.setProperty(ForceOptions.SPACING_NODE_NODE, 30.0));
        }));
        l.add(f("aspectRatio0_5", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.ASPECT_RATIO, 0.5))));
        l.add(f("aspectRatio3", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.ASPECT_RATIO, 3.0))));
        l.add(f("randomSeed42", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.RANDOM_SEED, 42))));
        l.add(f("randomSeedNeg17", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.RANDOM_SEED, -17))));
        l.add(f("separateFalse", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS, false))));
        l.add(f("padding", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.PADDING, new ElkPadding(2, 7, 11, 13)))));
        l.add(f("interactive", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.INTERACTIVE, true))));
        l.add(f("fixedGraphSize", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true))));
        l.add(f("omitMicro", ALWAYS, g -> onParents(g, p -> p.setProperty(ForceOptions.OMIT_NODE_MICRO_LAYOUT, true))));
        l.add(f("edgeLabelsInline", HAS_LABELS, g -> allLabels(g).forEach(x -> x.setProperty(ForceOptions.EDGE_LABELS_INLINE, true))));
        l.add(f("eadesEdgeLabelsInline", HAS_LABELS, g -> {
            eades(g);
            allLabels(g).forEach(x -> x.setProperty(ForceOptions.EDGE_LABELS_INLINE, true));
        }));
        l.add(f("spacingEdgeLabel12", HAS_LABELS, g -> allEdges(g).forEach(e -> e.setProperty(ForceOptions.SPACING_EDGE_LABEL, 12.0))));
        l.add(f("priorityNodes", ALWAYS, g -> {
            int i = 0;
            for (ElkNode n : allNodes(g)) {
                n.setProperty(ForceOptions.PRIORITY, 1 + (i++ % 3));
            }
        }));
        l.add(f("priorityEdges", HAS_EDGES, g -> {
            int i = 0;
            for (ElkEdge e : allEdges(g)) {
                e.setProperty(ForceOptions.PRIORITY, 1 + 2 * (i++ % 2));
            }
        }));
        l.add(f("priorityLabels", HAS_LABELS, g -> {
            int i = 0;
            for (ElkLabel x : allLabels(g)) {
                x.setProperty(ForceOptions.PRIORITY, 1 + (i++ % 3));
            }
        }));
        return l;
    }

    static List<Factor> stressFactors() {
        List<Factor> l = new ArrayList<>();
        l.add(f("default", ALWAYS, g -> { }));
        l.add(f("interactive", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.INTERACTIVE, true))));
        l.add(f("fixedSome", ALWAYS, g -> fixedSome(g)));
        l.add(f("interactiveFixedSome", ALWAYS, g -> {
            onParents(g, p -> p.setProperty(StressOptions.INTERACTIVE, true));
            fixedSome(g);
        }));
        l.add(f("desiredEdgeLengthRoot", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.DESIRED_EDGE_LENGTH, 40.0))));
        l.add(f("desiredEdgeLengthEdges", HAS_EDGES, g -> {
            int i = 0;
            for (ElkEdge e : allEdges(g)) {
                e.setProperty(StressOptions.DESIRED_EDGE_LENGTH, 30.0 + (i++ * 7) % 50);
            }
        }));
        l.add(f("desiredEdgeLengthMixed", HAS_EDGES, g -> {
            onParents(g, p -> p.setProperty(StressOptions.DESIRED_EDGE_LENGTH, 40.0));
            int i = 0;
            for (ElkEdge e : allEdges(g)) {
                if (i++ % 2 == 0) {
                    e.setProperty(StressOptions.DESIRED_EDGE_LENGTH, 150.0);
                }
            }
        }));
        l.add(f("dimensionX", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.DIMENSION, StressMajorization.Dimension.X))));
        l.add(f("dimensionY", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.DIMENSION, StressMajorization.Dimension.Y))));
        l.add(f("dimensionXY", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.DIMENSION, StressMajorization.Dimension.XY))));
        l.add(f("interactiveDimensionX", ALWAYS, g -> {
            onParents(g, p -> p.setProperty(StressOptions.INTERACTIVE, true));
            onParents(g, p -> p.setProperty(StressOptions.DIMENSION, StressMajorization.Dimension.X));
        }));
        l.add(f("epsilon0_05", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.EPSILON, 0.05))));
        l.add(f("epsilon1e-5", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.EPSILON, 1e-5))));
        l.add(f("iterationLimit3", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.ITERATION_LIMIT, 3))));
        l.add(f("iterationLimit0", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.ITERATION_LIMIT, 0))));
        l.add(f("edgeLabelsInlineTrue", HAS_LABELS, g -> allLabels(g).forEach(x -> x.setProperty(StressOptions.EDGE_LABELS_INLINE, true))));
        l.add(f("edgeLabelsInlineFalse", HAS_LABELS, g -> allLabels(g).forEach(x -> x.setProperty(StressOptions.EDGE_LABELS_INLINE, false))));
        l.add(f("omitMicro", ALWAYS, g -> onParents(g, p -> p.setProperty(StressOptions.OMIT_NODE_MICRO_LAYOUT, true))));
        return l;
    }

    static void fixedSome(ElkNode g) {
        int i = 0;
        for (ElkNode n : allNodes(g)) {
            if (i++ % 2 == 0) {
                n.setProperty(StressOptions.FIXED, true);
            }
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Shapes

    /** A flat graph: sizes, initial positions, edges as {source, target, sourcePort, targetPort} (port -1 = the node). */
    static final class Spec {
        int n;
        double[] w, h, x, y;
        List<int[]> edges = new ArrayList<>();
        int[] edgeLabels = new int[0];
        boolean nodeLabels, interactive;
        int ports;
    }

    static Spec spec(Random rnd, int n, boolean uniform) {
        Spec s = new Spec();
        s.n = n;
        s.w = new double[n];
        s.h = new double[n];
        s.x = new double[n];
        s.y = new double[n];
        for (int i = 0; i < n; i++) {
            s.w[i] = uniform ? 30 : WIDTHS[rnd.nextInt(WIDTHS.length)];
        }
        for (int i = 0; i < n; i++) {
            s.h[i] = uniform ? 30 : HEIGHTS[rnd.nextInt(HEIGHTS.length)];
        }
        for (int i = 0; i < n; i++) {
            s.x[i] = 1 + rnd.nextInt(200);
        }
        for (int i = 0; i < n; i++) {
            s.y[i] = 1 + rnd.nextInt(200);
        }
        return s;
    }

    static void edge(Spec s, int a, int b) {
        s.edges.add(new int[] {a, b, -1, -1});
    }

    static void path(Spec s, int from, int count) {
        for (int i = from; i + 1 < from + count; i++) {
            edge(s, i, i + 1);
        }
    }

    /** A random connected graph on the nodes from..from+count-1: a random attachment tree plus extra distinct pairs. */
    static void connected(Random rnd, Spec s, int from, int count, int extra) {
        Set<Long> used = new HashSet<>();
        for (int i = 1; i < count; i++) {
            int j = rnd.nextInt(i);
            boolean forward = rnd.nextBoolean();
            edge(s, from + (forward ? j : i), from + (forward ? i : j));
            used.add(key(Math.min(i, j), Math.max(i, j)));
        }
        for (int t = 0; t < extra && count > 2; t++) {
            int a = rnd.nextInt(count), b = rnd.nextInt(count);
            if (a != b && used.add(key(Math.min(a, b), Math.max(a, b)))) {
                edge(s, from + a, from + b);
            }
        }
    }

    static long key(int a, int b) {
        return ((long) a << 32) | b;
    }

    static ElkNode newRoot() {
        ElkNode r = ElkGraphUtil.createGraph();
        r.setIdentifier("root");
        return r;
    }

    static ElkNode newNode(ElkNode parent, String id, double w, double h, double x, double y) {
        ElkNode n = ElkGraphUtil.createNode(parent);
        n.setIdentifier(id);
        n.setDimensions(w, h);
        n.setLocation(x, y);
        return n;
    }

    static ElkEdge newEdge(ElkConnectableShape a, ElkConnectableShape b, String id) {
        ElkEdge e = ElkGraphUtil.createSimpleEdge(a, b);
        e.setIdentifier(id);
        return e;
    }

    static ElkLabel newLabel(String text, ElkGraphElement owner, String id) {
        ElkLabel l = ElkGraphUtil.createLabel(text, owner);
        l.setIdentifier(id);
        return l;
    }

    static ElkNode build(Spec s) {
        ElkNode root = newRoot();
        ElkNode[] nodes = new ElkNode[s.n];
        ElkPort[][] ports = new ElkPort[s.n][s.ports];
        PortSide[] sides = {PortSide.EAST, PortSide.WEST, PortSide.NORTH, PortSide.SOUTH};
        for (int i = 0; i < s.n; i++) {
            nodes[i] = newNode(root, "n" + i, s.w[i], s.h[i], s.x[i], s.y[i]);
            if (s.nodeLabels) {
                newLabel("Node n" + i, nodes[i], "ln" + i);
            }
            for (int j = 0; j < s.ports; j++) {
                ElkPort p = ElkGraphUtil.createPort(nodes[i]);
                p.setIdentifier("p" + i + "_" + j);
                p.setDimensions(6, 6);
                p.setProperty(CoreOptions.PORT_SIDE, sides[(i + j) % sides.length]);
                newLabel("port " + i + "." + j, p, "lp" + i + "_" + j);
                ports[i][j] = p;
            }
        }
        for (int k = 0; k < s.edges.size(); k++) {
            int[] e = s.edges.get(k);
            ElkConnectableShape a = e[2] >= 0 ? ports[e[0]][e[2]] : nodes[e[0]];
            ElkConnectableShape b = e[3] >= 0 ? ports[e[1]][e[3]] : nodes[e[1]];
            ElkEdge edge = newEdge(a, b, "e" + k);
            for (int m = 0; k < s.edgeLabels.length && m < s.edgeLabels[k]; m++) {
                newLabel(m == 0 ? "edge " + k : "second label of edge " + k, edge, "le" + k + "_" + m);
            }
        }
        if (s.interactive) {
            root.setProperty(CoreOptions.INTERACTIVE, true);
        }
        return root;
    }

    static void add(List<Shape> out, String id, Spec s, int stopsLevel) {
        out.add(new Shape(id, () -> build(s), s.n, stopsLevel));
    }

    static List<Shape> shapes(Random rnd) throws Exception {
        verifyCorpus();
        List<Shape> out = new ArrayList<>();
        add(out, "single", spec(rnd, 1, false), 1);
        Spec path5 = spec(rnd, 5, true);
        path(path5, 0, 5);
        add(out, "path5", path5, 2);
        Spec star6 = spec(rnd, 6, false);
        for (int i = 1; i < 6; i++) {
            edge(star6, 0, i);
        }
        add(out, "star6", star6, 1);
        Spec cycle6 = spec(rnd, 6, false);
        path(cycle6, 0, 6);
        edge(cycle6, 5, 0);
        add(out, "cycle6", cycle6, 1);
        Spec k5 = spec(rnd, 5, false);
        for (int a = 0; a < 5; a++) {
            for (int b = a + 1; b < 5; b++) {
                edge(k5, a, b);
            }
        }
        add(out, "k5", k5, 1);
        Spec randA = spec(rnd, 10, false);
        connected(rnd, randA, 0, 10, 6);
        add(out, "randA", randA, 2);
        Spec randB = spec(rnd, 14, false);
        connected(rnd, randB, 0, 14, 8);
        add(out, "randB", randB, 0);
        Spec randC = spec(rnd, 24, false);
        connected(rnd, randC, 0, 24, 12);
        add(out, "randC", randC, 0);
        Spec forest = spec(rnd, 11, false);
        connected(rnd, forest, 0, 4, 0);
        connected(rnd, forest, 4, 3, 0);
        connected(rnd, forest, 7, 2, 0);
        add(out, "forest", forest, 2);
        Spec mixed = spec(rnd, 13, false);
        connected(rnd, mixed, 1, 2, 0);
        connected(rnd, mixed, 3, 3, 1);
        connected(rnd, mixed, 6, 7, 2);
        add(out, "mixed", mixed, 0);
        Spec multi = spec(rnd, 5, true);
        for (int[] e : new int[][] {{0, 1}, {0, 1}, {1, 2}, {2, 3}, {3, 4}, {2, 3}}) {
            edge(multi, e[0], e[1]);
        }
        add(out, "multi", multi, 2);
        Spec anti = spec(rnd, 4, true);
        for (int[] e : new int[][] {{0, 1}, {1, 0}, {1, 2}, {2, 3}}) {
            edge(anti, e[0], e[1]);
        }
        add(out, "antiparallel", anti, 1);
        Spec loops = spec(rnd, 5, true);
        path(loops, 0, 5);
        for (int[] e : new int[][] {{1, 1}, {3, 3}, {3, 3}}) {
            edge(loops, e[0], e[1]);
        }
        add(out, "loops", loops, 1);
        Spec ports = spec(rnd, 5, false);
        ports.ports = 2;
        ports.edges.add(new int[] {0, 1, 0, 1});
        ports.edges.add(new int[] {1, 2, -1, 0});
        ports.edges.add(new int[] {2, 3, 1, -1});
        ports.edges.add(new int[] {3, 4, 0, 1});
        ports.edges.add(new int[] {4, 0, -1, -1});
        add(out, "ports", ports, 1);
        Spec edgeLabels = spec(rnd, 5, false);
        path(edgeLabels, 0, 5);
        edge(edgeLabels, 0, 2);
        edgeLabels.edgeLabels = new int[] {2, 1, 0, 1, 0, 1};
        add(out, "edgeLabels", edgeLabels, 2);
        Spec nodeLabels = spec(rnd, 5, false);
        path(nodeLabels, 0, 5);
        nodeLabels.nodeLabels = true;
        add(out, "nodeLabels", nodeLabels, 1);
        Spec coincident = spec(rnd, 5, true);
        for (int i = 0; i < 5; i++) {
            coincident.x[i] = i < 3 ? 10 : 60;
            coincident.y[i] = 10;
        }
        path(coincident, 0, 5);
        coincident.interactive = true;
        add(out, "coincident", coincident, 2);
        out.add(new Shape("hier", ForceVectors::hierarchy, 5, 0));
        out.add(new Shape("rootPorts", ForceVectors::rootPorts, 3, 1));
        out.add(new Shape("corpus", ForceVectors::loadCorpus, 12, 1));
        return out;
    }

    /** root { A { g0, g1 } , B }: an edge A-B, an edge g0-g1 inside A and an edge B-g1 that crosses the hierarchy. */
    static ElkNode hierarchy() {
        ElkNode root = newRoot();
        ElkNode a = newNode(root, "n0", 0, 0, 5, 5);
        ElkNode g0 = newNode(a, "n1", 30, 30, 10, 10);
        ElkNode g1 = newNode(a, "n2", 40, 20, 80, 40);
        ElkNode b = newNode(root, "n3", 30, 30, 150, 20);
        newEdge(a, b, "e0");
        newEdge(g0, g1, "e1");
        newEdge(b, g1, "e2");
        newLabel("inner", g0, "ln1");
        return root;
    }

    /** root with a port; an edge from the root port to a child (never visited by the importer) and an edge between children. */
    static ElkNode rootPorts() {
        ElkNode root = newRoot();
        ElkPort rp = ElkGraphUtil.createPort(root);
        rp.setIdentifier("p0");
        rp.setDimensions(6, 6);
        ElkNode a = newNode(root, "n0", 30, 30, 10, 10);
        ElkNode b = newNode(root, "n1", 30, 30, 90, 40);
        newEdge(rp, a, "e0");
        newEdge(a, b, "e1");
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

    static List<Object[]> throwsScenarios(Kind kind) {
        List<Object[]> l = new ArrayList<>();
        l.add(new Object[] {"hyperedgeTargets", (Supplier<ElkNode>) () -> {
            ElkNode root = triple();
            root.getContainedEdges().get(0).getTargets().add(root.getChildren().get(2));
            return root;
        }});
        l.add(new Object[] {"hyperedgeSources", (Supplier<ElkNode>) () -> {
            ElkNode root = triple();
            root.getContainedEdges().get(0).getSources().add(root.getChildren().get(2));
            return root;
        }});
        if (kind == Kind.STRESS) {
            l.add(new Object[] {"hyperedgeTargetsInteractive", (Supplier<ElkNode>) () -> {
                ElkNode root = triple();
                root.getContainedEdges().get(0).getTargets().add(root.getChildren().get(2));
                root.setProperty(StressOptions.INTERACTIVE, true);
                return root;
            }});
        }
        return l;
    }

    /** Three nodes, one edge n0 -> n1. */
    static ElkNode triple() {
        ElkNode root = newRoot();
        ElkNode a = newNode(root, "n0", 30, 30, 10, 10);
        ElkNode b = newNode(root, "n1", 30, 30, 90, 40);
        newNode(root, "n2", 30, 30, 50, 90);
        newEdge(a, b, "e0");
        return root;
    }

    // ------------------------------------------------------------------------------------------------------------
    // The log group (FD3)

    static List<Row> logRows() {
        List<String> ids = new ArrayList<>();
        List<Double> xs = new ArrayList<>();
        Map<String, Double> edge = new LinkedHashMap<>();
        edge.put("zero", 0.0);
        edge.put("negZero", -0.0);
        edge.put("minusOne", -1.0);
        edge.put("nan", Double.NaN);
        edge.put("posInf", Double.POSITIVE_INFINITY);
        edge.put("negInf", Double.NEGATIVE_INFINITY);
        edge.put("minSubnormal", Double.MIN_VALUE);
        edge.put("midSubnormal", Double.longBitsToDouble(0x0000000100000001L));
        edge.put("maxSubnormal", Double.longBitsToDouble(0x000fffffffffffffL));
        edge.put("one", 1.0);
        edge.put("justAboveOne", Math.nextUp(1.0));
        edge.put("justBelowOne", Math.nextDown(1.0));
        edge.put("minNormal", Double.MIN_NORMAL);
        edge.put("maxValue", Double.MAX_VALUE);
        edge.forEach((name, v) -> {
            ids.add("log/edge/" + name);
            xs.add(v);
        });
        Random r = new Random(LOG_SEED);
        for (int i = 0; i < LOG_HALF; i++) {
            ids.add(String.format("log/s%05d", i));
            xs.add(0.01 + r.nextDouble() * 19.99);
        }
        for (int i = 0; i < LOG_HALF; i++) {
            ids.add(String.format("log/u%05d", i));
            xs.add(StrictMath.pow(10.0, -3.0 + 6.0 * r.nextDouble()));
        }
        double[] first = new double[xs.size()];
        for (int i = 0; i < first.length; i++) {
            first[i] = Math.log(xs.get(i));
        }
        double sink = 0;
        for (int pass = 0; pass < 2; pass++) { // JIT warm-up, then compare with the cold pass
            for (int i = 0; i < first.length; i++) {
                double y = Math.log(xs.get(i));
                sink += y;
                if (hex(y).equals(hex(first[i])) == false) {
                    throw new Bug("Math.log(" + xs.get(i) + ") differs between passes: " + hex(first[i]) + " vs " + hex(y));
                }
            }
        }
        int strictDiffs = 0;
        List<Row> rows = new ArrayList<>();
        for (int i = 0; i < first.length; i++) {
            if (!hex(StrictMath.log(xs.get(i))).equals(hex(first[i]))) {
                strictDiffs++;
            }
            rows.add(new Row(ids.get(i), LOG, "{\"id\": \"" + ids.get(i) + "\", \"group\": \"log\", \"input\": " + hex(xs.get(i))
                    + ", \"expected\": " + hex(first[i]) + "}"));
        }
        NOTES.add("log rows " + rows.size() + ", Math.log differs from StrictMath.log in " + strictDiffs + " (sink " + (sink != 0) + ")");
        return rows;
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

    /** 16 raw hex digits in quotes; NaN is the canonical 7ff8000000000000. */
    static String hex(double d) {
        return "\"" + (Double.isNaN(d) ? NAN_HEX : String.format("%016x", Double.doubleToRawLongBits(d))) + "\"";
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
