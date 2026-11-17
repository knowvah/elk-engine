// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 8a alg-trees, T3, TR1-TR3) for org.eclipse.elk.alg.vertiflex: what
// VertiFlexLayoutProvider.layout does at the pinned ELK commit, step by step. The bundle has no JUnit tests, so the oracle is its
// behavioural spec. This program only CALLS ELK public APIs and records results; it embeds no ELK implementation.
// Run: tools/vectors/vertiflex-vectors.sh <outDir>   (java -cp ... VertiFlexVectors.java <outDir> <tools/vectors dir>)
// ORIGIN: the row format, the NS1 round trip, the NS4 label sizes, the NS6 hex doubles and the file layout are copied from
// tools/vectors/NodeMicroLayoutVectors.java; the strictNumbers sanitiser, the throws shape with the first ELK frame, the
// identity-hash guard and the 16 MiB guard from tools/vectors/LayeredCompoundVectors.java (B7: single-file launchers share no code).
//
// ===== OUTPUT CONTRACT (everything a TypeScript replay needs; no need to read the recorder body) =====
// File <outDir>/vertiflex.json (2-space top level, ONE compact JSON row per line, trailing newline, strict JSON, under 16 MiB):
//   { jdk, oracle, seed, rowCounts: { full, stops, throws }, optionCoverage, rows: [row...] }
//   row = { id, group, input, expected }, ids unique and stable: "<group>/<shape>/<factor>" (throws: "throws/<name>").
//   group in full | stops | throws. A scenario planned as full or stops whose run throws would be recorded as throws; none does.
//   input = the PREPARED graph (algorithm option, factor and NS4 label sizes applied) exported by ElkGraphJson.forGraph(root)
//     .omitLayout(false).omitZeroDimension(false).omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false)
//     under system properties org.eclipse.elk.graph.json.exportSeed=1 and org.eclipse.elk.graph.util.identifierSeed=1, EMBEDDED as a
//     JSON object. A bare Infinity/-Infinity/NaN token of the exporter (Gson writes one for a non-finite double; this ref has none)
//     is replaced by the string "Infinity"/"-Infinity"/"NaN" (a replay parses the input after the same substitution). The root has
//     layoutOptions org.eclipse.elk.algorithm = org.eclipse.elk.vertiflex. Node ids are "n<k>", edge ids "e<k>", labels, ports as
//     named below; every node, port, label and edge has a unique non-empty id. Every node has initial x, y, width, height (the
//     generated shapes start at non-zero positions so the reset of the provider shows).
//   How a row is run (a replay does the same): ElkGraphJson.forGraph(input).toElk(), then new RecursiveGraphLayoutEngine()
//     .layout(root, monitor) with the VertiFlex provider registered (VertiFlexMetaDataProvider + VertiFlexOptions). NodeMicroLayout
//     is part of the provider (unless omitNodeMicroLayout), so it is part of the run.
//
// Numbers: every double is 16 lowercase hex digits, Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded (JavaVectors.hex);
//   a NaN anywhere fails the recording. Integers are JSON numbers. Ids are strings as exported.
//
// DUMP (the same entry shapes in full and in stops); element lists are in traversal order: the root's children in model order (node
//   creation order), each node followed by nothing else in its own list; ports and labels have their own lists in the order
//   node, its labels, its ports (each port followed by its labels), then the children recursively; edges per containing node.
//   graph   = { id, x, y, w, h, padding: [top,right,bottom,left] }            the root ElkNode (padding = getProperty(PADDING))
//   node    = { id, x, y, w, h, margins: [t,r,b,l], padding: [t,r,b,l] }       margins = getProperty(CoreOptions.MARGINS)
//   port    = { id, x, y, w, h }
//   label   = { id, x, y, w, h }                                               labels of nodes, ports and edges
//   edge    = { id, sections: [ { start: [x,y], end: [x,y], bends: [[x,y]...] } ] }   sections in list order, [] when none
//   props   = [ { id, props: { NAME: value } } ]   the V/InternalProperties values that are SET (hasProperty) on a node or on the
//             graph, key = the Java constant name, in this order: LEFT_OUTLINE, RIGHT_OUTLINE (an OutlineNode chain as the list of
//             its points from the head following next: [[relativeX, absoluteY]...], hex pairs), OUTLINE_MAX_DEPTH, MIN_X, MAX_X,
//             MIN_Y, MAX_Y (hex), ROOT_NODE (the root node's id, on the graph), EDGE_BEND_HEIGHT (hex), NODE_MODEL_ORDER (integer).
//             An element with no property set has no entry.
//
// group full: expected = { graph, nodes, ports, labels, edges } = the dump of the graph after the engine run (all entries).
//
// group stops: expected = { steps: [name...], stops: [ { step, graph, nodes, ports, labels, edges, props } ... ] }, stops[i].step =
//   steps[i]. The steps of every row, in order (names are the simple class names of the processors):
//     Import             the re-imported graph before the run                                 (the only stop with every entry)
//     NodeMicroLayout    after NodeMicroLayout.forGraph(graph).execute() (state taken from a separate copy of the import; the
//                        recorder checks that its sizes, margins, ports and labels equal those of the Preamble stop). When the root has
//                        omitNodeMicroLayout = true the provider skips it and this stop equals Import (empty delta).
//     Preamble           what the provider does after the micro layout and before the phases: SPACING read, VertiFlexUtil.findRoot,
//                        ROOT_NODE set on the graph, every child setLocation(0, 0), checkVerticalConstraintValidity (throws
//                        UnsupportedConfigurationException, see throws), NODE_MODEL_ORDER set on every child in model order. Taken
//                        just before the first processor starts (the engine's sub monitor of the first processor is created).
//     NodeYPlacer        phase P1 (NodeYPlacerStrategy.SIMPLE_Y_PLACING)
//     RelativeXPlacer    phase P2 (RelativeXPlacerStrategy.SIMPLE_X_PLACING): outlines and relative x
//     AbsoluteXPlacer    phase P3 (AbsoluteXPlacerStrategy.ABSOLUTE_XPLACING)
//     StraightEdgeRouter | BendEdgeRouter   phase P4: StraightEdgeRouter when layoutStrategy = STRAIGHT (EdgerouterStrategy.DIRECT_ROUTING),
//                        BendEdgeRouter when BEND (BEND_ROUTING); the row's own steps array names the one that ran
//     SetGraphSize       VertiFlexLayoutProvider.setGraphSize (graph width/height from the nodes' extent + margins + padding), taken when
//                        the provider's monitor is done
//   DELTA ENCODING: the Import stop lists every entry. A later stop lists in graph (a single entry or null), nodes, ports, labels,
//   edges and props ONLY the entries (by id) whose serialised form differs from the same id's entry in the previous stop; an element
//   absent from a list is unchanged. A replay keeps the running state per id (applies each stop's entries over the previous state)
//   and compares its state after each of its own steps. The last stop's accumulated state equals the "full" dump of the same input
//   (recorder-checked on every row). A step that changes nothing has all lists empty and graph null; the recorder prints how many
//   rows change per step (below) and fails when a mandatory step never changes anything.
//
// group throws: expected = { throws: { class, message, frame } }: the engine run threw inside ELK. class = the exception's fully
//   qualified Java class name; message = getMessage() or null (a JDK helpful NullPointerException message names the failed access and is
//   JVM text: compare class and frame, not the message, for a NullPointerException); frame = the first org.eclipse.elk frame of the
//   stack as "File.java:line". The row's run-twice check covers it (the stops path must throw the same class, message and frame).
//   Throw paths of V/** an input can reach: UnsupportedConfigurationException at VertiFlexLayoutProvider.java:65 (no root: every node has an incoming
//   edge; an EMPTY graph never reaches the provider, the engine skips a root without children, so the check is only reachable by a
//   direct VertiFlexLayoutProvider.layout call and is not recorded), :72 (a child with more than one incoming edge: diamond, self loop), :151 (vertical constraint too
//   low for its ancestors: direct child, grandchild with an inherited minimum); ClassCastException at the (ElkNode) cast of an edge
//   target that is a port; NullPointerException in BendEdgeRouter (EDGE_BEND_HEIGHT unboxed for a node the placer never visited).
//   Unreachable by any input: the four IllegalArgumentException sites of the *Strategy.create() switches (exhaustive enums); the
//   bundle has no UnsupportedGraphException. An edge without a target (IndexOutOfBounds at getTargets().get(0)) cannot be exported
//   to ELK JSON round trip stable and is not recorded.
//
// OPTIONS (enumerated from V/VertiFlex.melk; optionCoverage in the file header counts rows per value and group):
//   verticalConstraint (double, nodes)       rows of the vc* shapes (unset on every other shape)
//   layoutStrategy (EdgeRoutingStrategy: STRAIGHT default, BEND)   factors strategyStraight (set explicitly), strategyBend; default rows
//   layerDistance (double, default 50.0)     factors layerDist10, layerDist120; default rows
//   considerNodeModelOrder (boolean, true)   factor orderFalse; default rows (true)
//   supports: spacing.nodeNode (core default 20)  factors spacing5, spacing40;  padding  factor padding;  omitNodeMicroLayout  factor
//   omitMicro (+ the marginsOmit shape with explicit margins);  margins  via node labels (labels shapes) and explicit (marginsOmit);
//   interactive, portConstraints, edgeLabels.inline  factors on the labPorts shape only (V/** never reads them; only the micro layout can).
//
// SCENARIOS (generator, seeded java.util.Random(SEED = 8101), consumed in the fixed order of shapes(); the whole build runs twice
//   and must agree byte for byte): shapes are trees given as logical parent arrays (node 0 the root) with node sizes from
//   WIDTHS x HEIGHTS, edges created in an order (default: by child index; shuffled for the model-order shapes), nodes created in
//   an order (default 0..n-1; permuted for the permuted shapes, so model order differs from the ids). Crossed shapes (flag crossed)
//   run once per factor of FACTORS (default, then one factor at a time: TR2); other shapes only as default. Each scenario is a
//   `full` row; the ones with at most STOPS_MAX_NODES nodes are also a `stops` row. Shapes: see shapes() (path, star, uneven star, binary,
//   comb, wide/narrow, random, deep random, single, forest, vertical constraints, shuffled model order, labels, ports, explicit margins,
//   port edges, and the generated corpus input test/corpus/generated/vertiflex-tree-small.json whose sha256 is pinned in CORPUS_TABLE).
//   Vertical constraints in the vc* shapes are valid by construction (>= the minimum the provider's check computes with a 40 buffer).
//
// EXTRA SCENARIOS (added after the TS replay found two unreached regions; every earlier row is unchanged and the new rows are APPENDED
//   after all earlier rows, after the throws rows, each shape's full row followed by its stops row (stops only up to STOPS_MAX_NODES
//   nodes), ids "<group>/<shape>/<factor>"; vcArm shapes and the _order shapes without an earlier root-only row also carry the
//   default and orderFalse (root only) factors as comparison baselines): RelativeXPlacer.java:197 reads considerNodeModelOrder from each tree NODE, not from the
//   root, so the !consider block (better-move-root, :197-249) needs the option on nodes. Shapes "<existing>_order" (comb5, wideNarrow,
//   rand12a, rand18a, vcSiblings, starU6, vcRand18, vcOverlap, vcSameY, vcMid, starShuf6: the existing trees, same sizes) and
//   "vcArm<k>" (random trees of 5..9 nodes with vertical constraints on ~70% of the nodes from Random(SEED + 3); children at different
//   y are what makes the arms differ), STRAIGHT, with factors nodeOrderFalseAll (root and every node false), nodeOrderFalseNodesOnly
//   (every node false, root default true: the sort of the children still considers model order) and nodeOrderFalseSome (odd-index
//   nodes false, the others and the root true: both arms of :197 in one layout). Shapes bendLeft0, bendLeft1 (a star whose middle
//   child is deep and whose right children are higher) and vcArm7/11/18/21 add the strategyBend factor to reach the left-pass branch
//   at RelativeXPlacer.java:355-356. Where each row reaches which arm is listed in the hand-back report of mission 8a T3 (traced
//   with a scratch copy of RelativeXPlacer printing the branch taken; the traced copy is never part of the recording).
//
// Round trip (NS1): for each row the recorder (1) prepares the graph, (2) exports it to `input`, (3) re-imports `input` and runs it, which
//   is the recorded `expected`, and (4) also runs a freshly prepared original and fails the row if the two outputs differ. Stability: the
//   whole row is built twice from scratch and the two serialised rows must be byte-identical. A row that does not finish within
//   ROW_TIMEOUT_SECONDS stops the recording (RelativeXPlacer.splitGroup has a loop that does not advance).
//
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 (TR3); the program refuses to run without
//   it unless VERTIFLEX_UNPINNED=1 (the TR3 evidence run: the script drops the flag and the recorder reports no guard).
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
import org.eclipse.elk.alg.common.NodeMicroLayout;
import org.eclipse.elk.alg.vertiflex.EdgeRoutingStrategy;
import org.eclipse.elk.alg.vertiflex.InternalProperties;
import org.eclipse.elk.alg.vertiflex.VertiFlexLayoutProvider;
import org.eclipse.elk.alg.vertiflex.options.VertiFlexMetaDataProvider;
import org.eclipse.elk.alg.vertiflex.options.VertiFlexOptions;
import org.eclipse.elk.alg.vertiflex.p2relative.OutlineNode;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.alg.ILayoutProcessor;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.NodeLabelPlacement;
import org.eclipse.elk.core.options.PortConstraints;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkBendPoint;
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

public class VertiFlexVectors {
    static final String ELK_COMMIT = "e7eaea5747f2e5187a7b83cfdc256b501ca00d3c";
    static final String OUTPUT = "vertiflex.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String IDENTIFIER_SEED_PROPERTY = "org.eclipse.elk.graph.util.identifierSeed";
    static final String UNPINNED_ENV = "VERTIFLEX_UNPINNED";
    static final String ALGORITHM_ID = "org.eclipse.elk.vertiflex";
    static final long SEED = 8101L;
    static final long MAX_BYTES = 16L * 1024 * 1024;
    static final int ROW_TIMEOUT_SECONDS = 30;
    static final int STOPS_MAX_NODES = 16;
    static final String FULL = "full", STOPS = "stops", THROWS = "throws";
    static final double LABEL_CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0, VC_BUFFER = 40.0;
    static final double[] WIDTHS = {20, 30, 40, 60, 90, 120};
    static final double[] HEIGHTS = {20, 30, 40, 50};
    static final String CORPUS_FILE = "test/corpus/generated/vertiflex-tree-small.json";
    static final String CORPUS_TABLE = """
            38ad780230038cc358efa1ded58f01e149a892e9b342526572dede73e8edb189  repo:test/corpus/generated/vertiflex-tree-small.json
            """;
    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");
    static final String STEP_IMPORT = "Import", STEP_MICRO = "NodeMicroLayout", STEP_PREAMBLE = "Preamble",
            STEP_SIZE = "SetGraphSize";
    static final List<String> MANDATORY_STEPS = List.of(STEP_MICRO, STEP_PREAMBLE, "NodeYPlacer", "RelativeXPlacer",
            "AbsoluteXPlacer", "StraightEdgeRouter", "BendEdgeRouter", STEP_SIZE);
    static final List<String> MUST_CHANGE = List.of(STEP_PREAMBLE, "NodeYPlacer", "RelativeXPlacer", "StraightEdgeRouter",
            "BendEdgeRouter", STEP_SIZE);

    static final class Bug extends RuntimeException {
        Bug(String m) {
            super(m);
        }
    }

    record Row(String id, String group, String json) { }

    record Factor(String id, Consumer<ElkNode> apply) { }

    /** A scenario shape: make builds the unprepared graph (no algorithm option, no label sizes). */
    record Shape(String id, Supplier<ElkNode> make, int nodes, List<Factor> factors) { }

    /** The outcome of one run: a thrown exception or the serialised expected value. */
    record Outcome(boolean threw, String json, Snap last, List<String> steps) { }

    static ExecutorService pool;
    static final Map<String, Integer> STEP_CHANGED = new TreeMap<>();
    static final Map<String, Integer> STEP_ROWS = new TreeMap<>();
    static final List<String> NOTES = new ArrayList<>();

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
        checkMandatory();
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
        sb.append("},\n  \"optionCoverage\": ").append(coverageJson()).append(",\n  \"rows\": [\n");
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
        for (String s : STEP_ROWS.keySet()) {
            System.err.println("step " + s + ": changes the state in " + STEP_CHANGED.getOrDefault(s, 0) + " of " + STEP_ROWS.get(s)
                    + " stops rows");
        }
        pool.shutdownNow();
    }

    static void setup() throws Exception {
        if (!"1".equals(System.getenv(UNPINNED_ENV))
                && System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/vertiflex-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new VertiFlexMetaDataProvider(), new VertiFlexOptions());
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty(IDENTIFIER_SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        pool = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "vertiflex-row");
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
        TREES.clear();
        List<Shape> shapes = shapes(rnd);
        List<Row> rows = new ArrayList<>();
        for (Shape s : shapes) {
            for (Factor f : s.factors) {
                Supplier<ElkNode> prep = prepare(s.make, f);
                rows.add(row(FULL + "/" + s.id + "/" + f.id, FULL, prep, record));
                if (s.nodes <= STOPS_MAX_NODES) {
                    rows.add(row(STOPS + "/" + s.id + "/" + f.id, STOPS, prep, record));
                }
            }
        }
        for (Object[] t : throwsScenarios()) {
            Supplier<ElkNode> prep = prepare((Supplier<ElkNode>) t[1], FACTORS.get(0));
            rows.add(row(THROWS + "/" + t[0], THROWS, prep, record));
        }
        for (Object[] t : throwsBendScenarios()) {
            Supplier<ElkNode> prep = prepare((Supplier<ElkNode>) t[1], FACTORS.get(0));
            Supplier<ElkNode> bend = () -> {
                ElkNode g = prep.get();
                g.setProperty(VertiFlexOptions.LAYOUT_STRATEGY, EdgeRoutingStrategy.BEND);
                return g;
            };
            rows.add(row(THROWS + "/" + t[0], THROWS, bend, record));
        }
        for (Shape s : extraShapes()) {
            for (Factor f : s.factors) {
                Supplier<ElkNode> prep = prepare(s.make, f);
                rows.add(row(FULL + "/" + s.id + "/" + f.id, FULL, prep, record));
                if (s.nodes <= STOPS_MAX_NODES) {
                    rows.add(row(STOPS + "/" + s.id + "/" + f.id, STOPS, prep, record));
                }
            }
        }
        return rows;
    }

    static Supplier<ElkNode> prepare(Supplier<ElkNode> make, Factor f) {
        return () -> {
            ElkNode g = make.get();
            g.setProperty(CoreOptions.ALGORITHM, ALGORITHM_ID);
            f.apply.accept(g);
            sizeLabels(g);
            return g;
        };
    }

    /** Builds one row twice from scratch; the second serialisation must equal the first. */
    static Row row(String id, String group, Supplier<ElkNode> prep, boolean record) throws Exception {
        Row a = buildRow(id, group, prep, record);
        Row b = buildRow(id, group, prep, false);
        if (!a.json.equals(b.json)) {
            throw new Bug("row " + id + " is not stable across two builds");
        }
        return a;
    }

    static Row buildRow(String id, String group, Supplier<ElkNode> prep, boolean record) throws Exception {
        if (record && System.getenv("VERTIFLEX_TRACE") != null) {
            System.err.println("TRACE ROW " + id);
        }
        ElkNode original = prep.get();
        String input = export(original);
        if (record) {
            countCoverage(group, original);
        }
        boolean stops = group.equals(STOPS);
        Outcome viaImport = timed(id, () -> run(ElkGraphJson.forGraph(input).toElk(), stops));
        Outcome viaOriginal = timed(id, () -> run(prep.get(), stops));
        if (viaImport.threw != viaOriginal.threw || !viaImport.json.equals(viaOriginal.json)) {
            throw new Bug("round trip: row " + id + " differs between the re-imported and the original graph:\n" + viaImport.json
                    + "\n" + viaOriginal.json);
        }
        if (group.equals(THROWS) != viaImport.threw) {
            throw new Bug("row " + id + (viaImport.threw ? " threw but is planned " + group : " is planned throws but ran: "
                    + viaImport.json));
        }
        if (viaImport.threw) {
            Outcome viaStops = timed(id, () -> run(ElkGraphJson.forGraph(input).toElk(), true));
            if (!viaStops.threw || !viaStops.json.equals(viaImport.json)) {
                throw new Bug("row " + id + ": the stops path does not throw the same exception");
            }
        } else if (stops) {
            Outcome full = timed(id, () -> run(ElkGraphJson.forGraph(input).toElk(), false));
            if (!full.json.equals(viaImport.last.fullJson())) {
                throw new Bug("row " + id + ": accumulated stops differ from the full run");
            }
            if (record) {
                accountSteps(viaImport, original);
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

    static Outcome run(ElkNode graph, boolean stops) {
        try {
            if (!stops) {
                new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
                Snap s = Snap.of(graph);
                return new Outcome(false, s.fullJson(), s, List.of());
            }
            return runStops(graph);
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
            return new Outcome(true, sb.toString(), null, List.of());
        }
    }

    /** The first org.eclipse.elk frame of an exception thrown while ELK code runs (before any frame of this program), or null. */
    static StackTraceElement elkFrame(RuntimeException e) {
        if (e instanceof Bug) {
            return null;
        }
        for (StackTraceElement f : e.getStackTrace()) {
            if (f.getClassName().startsWith("VertiFlexVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    /** Collects a stop at the three kinds of hooks of the engine's monitor tree: depth 2 monitors are the processors. */
    static final class Hook extends BasicProgressMonitor {
        final StopRecorder rec;
        final int depth;

        Hook(StopRecorder rec, int depth) {
            this.rec = rec;
            this.depth = depth;
        }

        @Override
        protected BasicProgressMonitor doSubTask(float work, int maxHierarchyLevels) {
            if (depth == 1) {
                rec.onProcessorStart();
            }
            return new Hook(rec, depth + 1);
        }

        @Override
        protected void doDone(boolean topInstance, int maxHierarchyLevels) {
            if (depth == 2) {
                rec.onProcessorDone();
            } else if (depth == 1) {
                rec.stop(STEP_SIZE);
            }
        }
    }

    static final class StopRecorder {
        final ElkNode graph;
        final List<String> processors;
        final List<String> steps = new ArrayList<>();
        final List<String> stopJson = new ArrayList<>();
        Snap prev = new Snap();
        Snap last, preambleSnap;
        int started, done;
        boolean preamble;

        StopRecorder(ElkNode graph, List<String> processors) {
            this.graph = graph;
            this.processors = processors;
        }

        void stop(String step) {
            Snap now = Snap.of(graph);
            stopJson.add(now.deltaJson(prev, step));
            steps.add(step);
            prev = now;
            last = now;
            if (step.equals(STEP_PREAMBLE)) {
                preambleSnap = now;
            }
        }

        void onProcessorStart() {
            if (!preamble) {
                preamble = true;
                stop(STEP_PREAMBLE);
            }
            started++;
        }

        void onProcessorDone() {
            if (done >= processors.size()) {
                throw new Bug("more processors than assembled");
            }
            stop(processors.get(done++));
        }
    }

    static Outcome runStops(ElkNode graph) {
        ElkNode probe = ElkGraphJson.forGraph(export(graph)).toElk();
        List<String> processors = new ArrayList<>();
        for (ILayoutProcessor<ElkNode> p : new VertiFlexLayoutProvider().assembleAlgorithm(probe)) {
            processors.add(p.getClass().getSimpleName());
        }
        StopRecorder rec = new StopRecorder(graph, processors);
        rec.stop(STEP_IMPORT);
        ElkNode micro = ElkGraphJson.forGraph(export(graph)).toElk();
        if (!micro.getProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT)) {
            NodeMicroLayout.forGraph(micro).execute();
        }
        Snap microSnap = Snap.of(micro);
        rec.stopJson.add(microSnap.deltaJson(rec.prev, STEP_MICRO));
        rec.steps.add(STEP_MICRO);
        rec.prev = microSnap;
        new RecursiveGraphLayoutEngine().layout(graph, new Hook(rec, 0));
        if (rec.done != processors.size() || rec.started != processors.size()) {
            throw new Bug("processors run " + rec.started + "/" + rec.done + " of " + processors);
        }
        int pre = rec.steps.indexOf(STEP_PREAMBLE);
        if (pre != 2) {
            throw new Bug("Preamble stop out of order: " + rec.steps);
        }
        if (!sameSizes(microSnap, rec.preambleSnap)) {
            throw new Bug("NodeMicroLayout stop disagrees with the Preamble stop on sizes, margins, ports or labels");
        }
        Snap fin = Snap.of(graph);
        if (!fin.fullJson().equals(rec.last.fullJson())) {
            throw new Bug("the engine changed the graph after the SetGraphSize stop");
        }
        StringBuilder sb = new StringBuilder("{\"steps\": [");
        for (int i = 0; i < rec.steps.size(); i++) {
            sb.append(i == 0 ? "" : ", ").append('"').append(rec.steps.get(i)).append('"');
        }
        sb.append("], \"stops\": [\n");
        for (int i = 0; i < rec.stopJson.size(); i++) {
            sb.append(rec.stopJson.get(i)).append(i + 1 < rec.stopJson.size() ? ",\n" : "\n");
        }
        sb.append("]}");
        return new Outcome(false, sb.toString().replace("\n", ""), rec.last, rec.steps);
    }

    /** Sizes, margins, ports and labels of the micro stop equal those of the preamble stop (positions of nodes differ). */
    static boolean sameSizes(Snap micro, Snap pre) {
        for (Map.Entry<String, String> e : micro.nodes.entrySet()) {
            String a = e.getValue(), b = pre.nodes.get(e.getKey());
            if (b == null || !tail(a).equals(tail(b))) {
                return false;
            }
        }
        return micro.ports.equals(pre.ports) && micro.labels.equals(pre.labels) && micro.graph.equals(pre.graph);
    }

    /** A node entry without its x and y: from the width on. */
    static String tail(String entry) {
        int i = entry.indexOf("\"w\"");
        return entry.substring(i < 0 ? 0 : i);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Snapshots and the dump

    /** The dump of a graph: serialised entries by id per kind, each in traversal order. */
    static final class Snap {
        Map<String, String> graph = new LinkedHashMap<>(), nodes = new LinkedHashMap<>(), ports = new LinkedHashMap<>(),
                labels = new LinkedHashMap<>(), edges = new LinkedHashMap<>(), props = new LinkedHashMap<>();
        final Set<String> seen = new HashSet<>();

        static Snap of(ElkNode root) {
            Snap s = new Snap();
            s.graph.put(s.unique(id(root)), "{\"id\": " + q(id(root)) + ", \"x\": " + hex(root.getX()) + ", \"y\": "
                    + hex(root.getY()) + ", \"w\": " + hex(root.getWidth()) + ", \"h\": " + hex(root.getHeight())
                    + ", \"padding\": " + padding(root.getProperty(CoreOptions.PADDING)) + "}");
            s.prop(root);
            s.visit(root);
            return s;
        }

        String unique(String id) {
            if (!seen.add(id)) {
                throw new Bug("duplicate element id " + id);
            }
            return id;
        }

        void visit(ElkNode parent) {
            for (ElkNode n : parent.getChildren()) {
                String id = unique(id(n));
                nodes.put(id, "{\"id\": " + q(id) + ", \"x\": " + hex(n.getX()) + ", \"y\": " + hex(n.getY()) + ", \"w\": "
                        + hex(n.getWidth()) + ", \"h\": " + hex(n.getHeight()) + ", \"margins\": "
                        + margin(n.getProperty(CoreOptions.MARGINS)) + ", \"padding\": "
                        + padding(n.getProperty(CoreOptions.PADDING)) + "}");
                prop(n);
                labels(n.getLabels());
                for (ElkPort p : n.getPorts()) {
                    String pid = unique(id(p));
                    ports.put(pid, box(pid, p.getX(), p.getY(), p.getWidth(), p.getHeight()));
                    labels(p.getLabels());
                }
                visit(n);
            }
            for (ElkEdge e : parent.getContainedEdges()) {
                String id = unique(id(e));
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
                edges.put(id, sb.append("]}").toString());
                labels(e.getLabels());
            }
        }

        void labels(List<ElkLabel> ls) {
            for (ElkLabel l : ls) {
                String id = unique(id(l));
                labels.put(id, box(id, l.getX(), l.getY(), l.getWidth(), l.getHeight()));
                labels(l.getLabels());
            }
        }

        void prop(ElkNode n) {
            StringBuilder sb = new StringBuilder();
            outline(sb, n, InternalProperties.LEFT_OUTLINE, "LEFT_OUTLINE");
            outline(sb, n, InternalProperties.RIGHT_OUTLINE, "RIGHT_OUTLINE");
            dbl(sb, n, InternalProperties.OUTLINE_MAX_DEPTH, "OUTLINE_MAX_DEPTH");
            dbl(sb, n, InternalProperties.MIN_X, "MIN_X");
            dbl(sb, n, InternalProperties.MAX_X, "MAX_X");
            dbl(sb, n, InternalProperties.MIN_Y, "MIN_Y");
            dbl(sb, n, InternalProperties.MAX_Y, "MAX_Y");
            if (n.hasProperty(InternalProperties.ROOT_NODE)) {
                ElkNode r = n.getProperty(InternalProperties.ROOT_NODE);
                sb.append(sb.length() == 0 ? "" : ", ").append("\"ROOT_NODE\": ").append(r == null ? "null" : q(id(r)));
            }
            dbl(sb, n, InternalProperties.EDGE_BEND_HEIGHT, "EDGE_BEND_HEIGHT");
            if (n.hasProperty(InternalProperties.NODE_MODEL_ORDER)) {
                sb.append(sb.length() == 0 ? "" : ", ").append("\"NODE_MODEL_ORDER\": ")
                        .append(n.getProperty(InternalProperties.NODE_MODEL_ORDER));
            }
            if (sb.length() > 0) {
                props.put(id(n), "{\"id\": " + q(id(n)) + ", \"props\": {" + sb + "}}");
            }
        }

        static void dbl(StringBuilder sb, ElkNode n, IProperty<Double> p, String name) {
            if (n.hasProperty(p)) {
                sb.append(sb.length() == 0 ? "" : ", ").append('"').append(name).append("\": ").append(hex(n.getProperty(p)));
            }
        }

        static void outline(StringBuilder sb, ElkNode n, IProperty<OutlineNode> p, String name) {
            if (!n.hasProperty(p)) {
                return;
            }
            sb.append(sb.length() == 0 ? "" : ", ").append('"').append(name).append("\": [");
            int i = 0;
            for (OutlineNode o = n.getProperty(p); o != null; o = o.getNext()) {
                if (i > 100000) {
                    throw new Bug("outline chain does not end");
                }
                sb.append(i++ == 0 ? "" : ", ").append(point(o.getRelativeX(), o.getAbsoluteY()));
            }
            sb.append(']');
        }

        /** The full dump (the group full expected value; also what the accumulated stops must equal). */
        String fullJson() {
            return "{\"graph\": " + graph.values().iterator().next() + ", \"nodes\": " + list(nodes.values()) + ", \"ports\": "
                    + list(ports.values()) + ", \"labels\": " + list(labels.values()) + ", \"edges\": " + list(edges.values())
                    + "}";
        }

        /** One stop: the entries that differ from the previous stop (all of them for the first). */
        String deltaJson(Snap prev, String step) {
            String g = graph.values().iterator().next();
            String pg = prev.graph.isEmpty() ? null : prev.graph.values().iterator().next();
            return "{\"step\": \"" + step + "\", \"graph\": " + (g.equals(pg) ? "null" : g) + ", \"nodes\": "
                    + changed(nodes, prev.nodes) + ", \"ports\": " + changed(ports, prev.ports) + ", \"labels\": "
                    + changed(labels, prev.labels) + ", \"edges\": " + changed(edges, prev.edges) + ", \"props\": "
                    + changed(props, prev.props) + "}";
        }

        int changeCount(Snap prev) {
            return count(nodes, prev.nodes) + count(ports, prev.ports) + count(labels, prev.labels) + count(edges, prev.edges)
                    + count(props, prev.props) + (graph.equals(prev.graph) ? 0 : 1);
        }

        static int count(Map<String, String> cur, Map<String, String> prev) {
            int n = 0;
            for (Map.Entry<String, String> e : cur.entrySet()) {
                n += e.getValue().equals(prev.get(e.getKey())) ? 0 : 1;
            }
            return n;
        }

        static String changed(Map<String, String> cur, Map<String, String> prev) {
            for (String k : prev.keySet()) {
                if (!cur.containsKey(k)) {
                    throw new Bug("element " + k + " disappeared between two stops");
                }
            }
            List<String> out = new ArrayList<>();
            for (Map.Entry<String, String> e : cur.entrySet()) {
                if (!e.getValue().equals(prev.get(e.getKey()))) {
                    out.add(e.getValue());
                }
            }
            return list(out);
        }

        static String list(Collection<String> items) {
            return "[" + String.join(", ", items) + "]";
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
    // Stop accounting

    static void accountSteps(Outcome o, ElkNode original) {
        // o.steps and per step change counts come from re-parsing the delta lists: a stop with all lists empty and graph null changes nothing
        String json = o.json;
        String[] stops = json.split("\\{\"step\": \"");
        boolean hasEdge = !original.getContainedEdges().isEmpty();
        for (int i = 1; i < stops.length; i++) {
            String s = stops[i];
            String step = s.substring(0, s.indexOf('"'));
            boolean empty = s.contains("\"graph\": null, \"nodes\": [], \"ports\": [], \"labels\": [], \"edges\": [], \"props\": []");
            STEP_ROWS.merge(step, 1, Integer::sum);
            if (!empty) {
                STEP_CHANGED.merge(step, 1, Integer::sum);
            } else if (hasEdge && original.getChildren().size() >= 2 && MUST_CHANGE.contains(step)) {
                throw new Bug("step " + step + " changed nothing on a row with edges: " + original.getChildren().size() + " nodes");
            }
        }
    }

    static void checkMandatory() {
        for (String s : MANDATORY_STEPS) {
            if (STEP_CHANGED.getOrDefault(s, 0) == 0) {
                throw new Bug("step " + s + " never changes the state in any stops row (recorder defect)");
            }
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Coverage

    static final Map<String, Map<String, int[]>> COVERAGE = new TreeMap<>();

    static void countCoverage(String group, ElkNode g) {
        cover("layoutStrategy", g.getProperty(VertiFlexOptions.LAYOUT_STRATEGY).name(), group);
        cover("considerNodeModelOrder", String.valueOf(g.getProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER)), group);
        cover("layerDistance", String.valueOf(g.getProperty(VertiFlexOptions.LAYER_DISTANCE)), group);
        cover("spacingNodeNode", String.valueOf(g.getProperty(CoreOptions.SPACING_NODE_NODE)), group);
        cover("omitNodeMicroLayout", String.valueOf(g.getProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT)), group);
        boolean vc = g.getChildren().stream().anyMatch(n -> n.hasProperty(VertiFlexOptions.VERTICAL_CONSTRAINT));
        cover("verticalConstraint", vc ? "set on some node" : "unset", group);
        cover("padding", g.hasProperty(CoreOptions.PADDING) ? "explicit" : "default", group);
        cover("interactive", String.valueOf(g.getProperty(CoreOptions.INTERACTIVE)), group);
        cover("portConstraints", g.getProperty(CoreOptions.PORT_CONSTRAINTS).name(), group);
        cover("edgeLabelsInline", String.valueOf(g.getProperty(CoreOptions.EDGE_LABELS_INLINE)), group);
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
                sb.append(j++ == 0 ? "" : ", ").append('"').append(v.getKey()).append("\": {\"full\": ").append(c[0])
                        .append(", \"stops\": ").append(c[1]).append(", \"throws\": ").append(c[2]).append('}');
            }
            sb.append('}');
        }
        return sb.append('}').toString();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Factors (one at a time, TR2)

    static final List<Factor> FACTORS = List.of(
            new Factor("default", g -> { }),
            new Factor("strategyStraight", g -> g.setProperty(VertiFlexOptions.LAYOUT_STRATEGY, EdgeRoutingStrategy.STRAIGHT)),
            new Factor("strategyBend", g -> g.setProperty(VertiFlexOptions.LAYOUT_STRATEGY, EdgeRoutingStrategy.BEND)),
            new Factor("orderFalse", g -> g.setProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER, false)),
            new Factor("layerDist10", g -> g.setProperty(VertiFlexOptions.LAYER_DISTANCE, 10.0)),
            new Factor("layerDist120", g -> g.setProperty(VertiFlexOptions.LAYER_DISTANCE, 120.0)),
            new Factor("spacing5", g -> g.setProperty(CoreOptions.SPACING_NODE_NODE, 5.0)),
            new Factor("spacing40", g -> g.setProperty(CoreOptions.SPACING_NODE_NODE, 40.0)),
            new Factor("padding", g -> g.setProperty(CoreOptions.PADDING, new ElkPadding(2, 7, 11, 13))),
            new Factor("omitMicro", g -> g.setProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT, true)));

    /** Extra factors of the labPorts shape: options only the micro layout can read. */
    static final List<Factor> DEFAULT_ONLY = List.of(FACTORS.get(0));

    static final List<Factor> MICRO_FACTORS = List.of(
            new Factor("interactive", g -> g.setProperty(CoreOptions.INTERACTIVE, true)),
            new Factor("portConstraintsFixedSide", g -> g.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE)),
            new Factor("edgeLabelsInline", g -> g.setProperty(CoreOptions.EDGE_LABELS_INLINE, true)));

    // ------------------------------------------------------------------------------------------------------------
    // Shapes

    /** A tree: logical parent array (parent[i] < i, -1 for a root), sizes, initial positions, vertical constraints, orders. */
    static final class Tree {
        int n;
        int[] parent;
        double[] w, h, x0, y0, vc;
        int[] nodeOrder, edgeOrder;
        boolean nodeLabels, edgeLabels, ports;
        Consumer<ElkNode> extra;
    }

    static Tree tree(Random rnd, int[] parent, double[] w, double[] h) {
        Tree t = new Tree();
        t.n = parent.length;
        t.parent = parent;
        t.w = w == null ? sizes(rnd, t.n, WIDTHS) : w;
        t.h = h == null ? sizes(rnd, t.n, HEIGHTS) : h;
        t.x0 = new double[t.n];
        t.y0 = new double[t.n];
        t.vc = new double[t.n];
        Arrays.fill(t.vc, Double.NaN);
        for (int i = 0; i < t.n; i++) {
            t.x0[i] = 1 + rnd.nextInt(200);
            t.y0[i] = 1 + rnd.nextInt(200);
        }
        t.nodeOrder = identity(t.n);
        List<Integer> edges = new ArrayList<>();
        for (int i = 0; i < t.n; i++) {
            if (parent[i] >= 0) {
                edges.add(i);
            }
        }
        t.edgeOrder = edges.stream().mapToInt(Integer::intValue).toArray();
        return t;
    }

    static double[] sizes(Random rnd, int n, double[] from) {
        double[] r = new double[n];
        for (int i = 0; i < n; i++) {
            r[i] = from[rnd.nextInt(from.length)];
        }
        return r;
    }

    static double[] constant(int n, double v) {
        double[] r = new double[n];
        Arrays.fill(r, v);
        return r;
    }

    static int[] identity(int n) {
        int[] r = new int[n];
        for (int i = 0; i < n; i++) {
            r[i] = i;
        }
        return r;
    }

    static void shuffle(Random rnd, int[] a) {
        for (int i = a.length - 1; i > 0; i--) {
            int j = rnd.nextInt(i + 1);
            int t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
    }

    static int[] star(int k) {
        int[] p = new int[k + 1];
        p[0] = -1;
        return p;
    }

    static int[] path(int n) {
        int[] p = new int[n];
        for (int i = 0; i < n; i++) {
            p[i] = i - 1;
        }
        return p;
    }

    static int[] binary(int depth) {
        int n = (1 << (depth + 1)) - 1;
        int[] p = new int[n];
        p[0] = -1;
        for (int i = 1; i < n; i++) {
            p[i] = (i - 1) / 2;
        }
        return p;
    }

    static int[] random(Random rnd, int n, int window) {
        int[] p = new int[n];
        p[0] = -1;
        for (int i = 1; i < n; i++) {
            p[i] = window <= 0 ? rnd.nextInt(i) : Math.max(0, i - 1 - rnd.nextInt(window));
        }
        return p;
    }

    /** Valid vertical constraints: each constrained node gets at least the minimum the provider's check computes (40 buffer). */
    static void constraints(Tree t, Random rnd, double prob, boolean rootToo) {
        double[] minAt = new double[t.n];
        for (int i = 0; i < t.n; i++) {
            double cur = t.parent[i] < 0 ? 0 : minAt[t.parent[i]];
            boolean has = t.parent[i] < 0 ? rootToo : rnd.nextDouble() < prob;
            if (has) {
                t.vc[i] = cur + rnd.nextInt(130);
            }
            double base = Double.isNaN(t.vc[i]) ? cur : t.vc[i];
            minAt[i] = base + t.h[i] + VC_BUFFER;
        }
    }

    static Supplier<ElkNode> maker(Tree t) {
        return () -> build(t);
    }

    static ElkNode build(Tree t) {
        ElkNode root = ElkGraphUtil.createGraph();
        root.setIdentifier("root");
        ElkNode[] nodes = new ElkNode[t.n];
        for (int k : t.nodeOrder) {
            ElkNode n = ElkGraphUtil.createNode(root);
            n.setIdentifier("n" + k);
            n.setDimensions(t.w[k], t.h[k]);
            n.setLocation(t.x0[k], t.y0[k]);
            if (!Double.isNaN(t.vc[k])) {
                n.setProperty(VertiFlexOptions.VERTICAL_CONSTRAINT, t.vc[k]);
            }
            nodes[k] = n;
        }
        int e = 0;
        for (int c : t.edgeOrder) {
            ElkEdge edge = ElkGraphUtil.createSimpleEdge(nodes[t.parent[c]], nodes[c]);
            edge.setIdentifier("e" + e++);
            if (t.edgeLabels) {
                ElkLabel l = ElkGraphUtil.createLabel("edge " + c, edge);
                l.setIdentifier("le" + c);
            }
        }
        for (int k = 0; k < t.n; k++) {
            if (t.nodeLabels) {
                ElkLabel l = ElkGraphUtil.createLabel("Node n" + k, nodes[k]);
                l.setIdentifier("ln" + k);
                nodes[k].setProperty(CoreOptions.NODE_LABELS_PLACEMENT, NodeLabelPlacement.outsideBottomCenter());
            }
            if (t.ports) {
                addPorts(nodes[k], k);
            }
        }
        if (t.extra != null) {
            t.extra.accept(root);
        }
        return root;
    }

    static void addPorts(ElkNode node, int k) {
        PortSide[] sides = {PortSide.SOUTH, PortSide.NORTH, PortSide.EAST};
        int count = k == 0 ? 3 : 1;
        for (int i = 0; i < count; i++) {
            ElkPort p = ElkGraphUtil.createPort(node);
            p.setIdentifier("p" + k + "_" + i);
            p.setDimensions(6, 6);
            p.setProperty(CoreOptions.PORT_SIDE, sides[(k + i) % sides.length]);
            ElkLabel l = ElkGraphUtil.createLabel("port " + k + "." + i, p);
            l.setIdentifier("lp" + k + "_" + i);
        }
    }

    static ElkNode loadCorpus() {
        try {
            Path repo = REPO;
            ElkNode g = ElkGraphJson.forGraph(Files.readString(repo.resolve(CORPUS_FILE), StandardCharsets.UTF_8)).toElk();
            return g;
        } catch (IOException e) {
            throw new Bug("cannot read " + CORPUS_FILE + ": " + e);
        }
    }

    static Path REPO;

    static List<Shape> shapes(Random rnd) throws Exception {
        verifyCorpus();
        List<Shape> out = new ArrayList<>();
        add(out, "single", tree(rnd, new int[] {-1}, null, null), false);
        add(out, "path3", tree(rnd, path(3), null, null), false);
        add(out, "path6", tree(rnd, path(6), null, null), false);
        add(out, "star2", tree(rnd, star(2), constant(3, 30), constant(3, 30)), false);
        add(out, "star3", tree(rnd, star(3), constant(4, 30), constant(4, 30)), false);
        add(out, "star4", tree(rnd, star(4), constant(5, 40), constant(5, 30)), true);
        add(out, "star5", tree(rnd, star(5), constant(6, 30), constant(6, 30)), false);
        add(out, "starU4", tree(rnd, star(4), null, null), false);
        add(out, "starU6", tree(rnd, star(6), null, null), true);
        add(out, "binary2", tree(rnd, binary(2), null, null), false);
        add(out, "binary3", tree(rnd, binary(3), null, null), true);
        add(out, "binary4", tree(rnd, binary(4), null, null), false);
        add(out, "comb5", tree(rnd, new int[] {-1, 0, 0, 1, 1, 3, 3, 5, 5}, null, null), true);
        add(out, "wideNarrow", tree(rnd, new int[] {-1, 0, 0, 1, 1, 1, 1, 1, 2, 8, 9, 10}, wideNarrowWidths(), null), true);
        add(out, "rand8a", tree(rnd, random(rnd, 8, 0), null, null), false);
        add(out, "rand8b", tree(rnd, random(rnd, 8, 0), null, null), false);
        add(out, "rand12a", tree(rnd, random(rnd, 12, 0), null, null), true);
        add(out, "rand18a", tree(rnd, random(rnd, 18, 0), null, null), true);
        add(out, "rand30a", tree(rnd, random(rnd, 30, 0), null, null), false);
        add(out, "rand40a", tree(rnd, random(rnd, 40, 0), null, null), false);
        add(out, "deep14", tree(rnd, random(rnd, 14, 2), null, null), false);
        add(out, "deep30", tree(rnd, random(rnd, 30, 3), null, null), false);
        addForest(out, rnd);
        addVertical(out, rnd);
        addModelOrder(out, rnd);
        addLabels(out, rnd);
        addSpecial(out, rnd);
        out.add(new Shape("corpus", VertiFlexVectors::loadCorpus, 15, FACTORS));
        return out;
    }

    static double[] wideNarrowWidths() {
        return new double[] {40, 120, 20, 90, 60, 120, 90, 60, 20, 20, 20, 20};
    }

    static final Map<String, Tree> TREES = new LinkedHashMap<>();

    static void add(List<Shape> out, String id, Tree t, boolean crossed) {
        TREES.put(id, t);
        out.add(new Shape(id, maker(t), t.n, crossed ? FACTORS : DEFAULT_ONLY));
    }

    static void addForest(List<Shape> out, Random rnd) {
        Tree t = tree(rnd, new int[] {-1, 0, 0, -1, 3, 3}, null, null);
        add(out, "forest2", t, false);
    }

    static void addVertical(List<Shape> out, Random rnd) {
        Tree mid = tree(rnd, path(4), null, null);
        mid.vc[2] = 400;
        add(out, "vcMid", mid, false);
        Tree sib = tree(rnd, star(4), constant(5, 40), null);
        sib.vc[2] = 150;
        sib.vc[3] = 100;
        sib.vc[4] = 150;
        add(out, "vcSiblings", sib, true);
        Tree same = tree(rnd, star(6), null, null);
        for (int i = 1; i <= 6; i++) {
            same.vc[i] = 120;
        }
        add(out, "vcSameY", same, false);
        Tree over = tree(rnd, new int[] {-1, 0, 0, 0, 1, 1, 4, 3}, new double[] {40, 60, 60, 60, 60, 60, 120, 60}, null);
        over.vc[3] = 260;
        over.vc[2] = 90;
        add(out, "vcOverlap", over, false);
        Tree rand = tree(rnd, random(rnd, 18, 0), null, null);
        constraints(rand, rnd, 0.4, false);
        add(out, "vcRand18", rand, true);
        Tree all = tree(rnd, binary(2), null, null);
        constraints(all, rnd, 1.1, true);
        add(out, "vcAll7", all, false);
        Tree r30 = tree(rnd, random(rnd, 30, 0), null, null);
        constraints(r30, rnd, 0.3, false);
        add(out, "vcRand30", r30, false);
    }

    static void addModelOrder(List<Shape> out, Random rnd) {
        Tree s6 = tree(rnd, star(6), null, null);
        shuffle(rnd, s6.edgeOrder);
        add(out, "starShuf6", s6, true);
        Tree s5 = tree(rnd, star(5), constant(6, 30), constant(6, 30));
        s5.edgeOrder = new int[] {5, 4, 3, 2, 1};
        add(out, "starRev5", s5, false);
        Tree perm = tree(rnd, random(rnd, 12, 0), null, null);
        shuffle(rnd, perm.edgeOrder);
        int[] order = identity(12);
        shuffle(rnd, order);
        // the root must stay findable by findRoot: any order works, it is the only node without incoming edges
        perm.nodeOrder = order;
        add(out, "permuted12", perm, false);
        Tree rootLast = tree(rnd, path(5), null, null);
        rootLast.nodeOrder = new int[] {4, 3, 2, 1, 0};
        add(out, "rootLast5", rootLast, false);
    }

    static void addLabels(List<Shape> out, Random rnd) {
        Tree lab = tree(rnd, new int[] {-1, 0, 0, 1, 1, 2}, null, null);
        lab.nodeLabels = true;
        lab.edgeLabels = true;
        add(out, "lab6", lab, true);
        Tree ports = tree(rnd, new int[] {-1, 0, 0, 1, 1}, null, null);
        ports.nodeLabels = true;
        ports.edgeLabels = true;
        ports.ports = true;
        List<Factor> fs = new ArrayList<>(DEFAULT_ONLY);
        fs.addAll(MICRO_FACTORS);
        out.add(new Shape("labPorts5", maker(ports), ports.n, fs));
    }

    static void addSpecial(List<Shape> out, Random rnd) {
        Tree margins = tree(rnd, new int[] {-1, 0, 0, 1, 1, 2, 2}, null, null);
        margins.extra = g -> {
            int i = 0;
            for (ElkNode n : g.getChildren()) {
                n.setProperty(CoreOptions.MARGINS, new ElkMargin(i % 3 * 4, 5 + i % 4 * 6, 7 + i % 2 * 9, 3 + i % 5 * 8));
                i++;
            }
            g.setProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT, true);
        };
        add(out, "marginsOmit7", margins, false);
        Tree portEdge = tree(rnd, new int[] {-1, 0, 0, -1}, null, null);
        portEdge.extra = g -> {
            ElkNode r = g.getChildren().get(0);
            ElkNode extra = g.getChildren().get(3);
            ElkPort p = ElkGraphUtil.createPort(r);
            p.setIdentifier("pr");
            p.setDimensions(6, 6);
            p.setProperty(CoreOptions.PORT_SIDE, PortSide.SOUTH);
            ElkEdge e = ElkGraphUtil.createSimpleEdge(p, extra);
            e.setIdentifier("ePort");
        };
        add(out, "portEdge4", portEdge, false);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Extra shapes (added after T8's finding; appended after every earlier row, earlier rows unchanged)

    /** The three ways of setting considerNodeModelOrder = false on tree nodes (RelativeXPlacer.java:197 reads it per node). */
    static final List<Factor> NODE_ORDER_FACTORS = List.of(
            new Factor("nodeOrderFalseAll", g -> {
                g.setProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER, false);
                allNodes(g, n -> n.setProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER, false));
            }),
            new Factor("nodeOrderFalseNodesOnly",
                    g -> allNodes(g, n -> n.setProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER, false))),
            new Factor("nodeOrderFalseSome", g -> {
                int i = 0;
                for (ElkNode n : g.getChildren()) {
                    if (i++ % 2 == 1) {
                        n.setProperty(VertiFlexOptions.CONSIDER_NODE_MODEL_ORDER, false);
                    }
                }
            }));

    static void allNodes(ElkNode g, Consumer<ElkNode> f) {
        for (ElkNode n : g.getChildren()) {
            f.accept(n);
        }
    }

    static List<Shape> extraShapes() {
        List<Shape> out = new ArrayList<>();
        for (String id : List.of("comb5", "wideNarrow", "rand12a", "rand18a", "vcSiblings", "starU6", "vcRand18", "vcOverlap",
                "vcSameY", "vcMid", "starShuf6")) {
            Tree t = TREES.get(id);
            List<Factor> fs = new ArrayList<>(NODE_ORDER_FACTORS);
            if (!CROSSED_BASE.contains(id)) {
                fs.add(FACTORS.get(3)); // orderFalse on the root only: the baseline the node variants are compared with
            }
            out.add(new Shape(id + "_order", maker(t), t.n, fs));
        }
        Random rnd = new Random(SEED + 3);
        for (int k = 0; k < ARM_CANDIDATES; k++) {
            int n = 5 + rnd.nextInt(5);
            Tree t = tree(rnd, random(rnd, n, rnd.nextInt(3)), null, null);
            constraints(t, rnd, 0.7, false);
            if (ARM_KEEP.contains(k)) {
                List<Factor> fs = new ArrayList<>(NODE_ORDER_FACTORS);
                fs.add(FACTORS.get(0));
                fs.add(FACTORS.get(3));
                if (BEND_LEFT_HITS.contains(k)) {
                    fs.add(FACTORS.get(2));
                }
                out.add(new Shape("vcArm" + k, maker(t), t.n, fs));
            }
        }
        Tree b0 = tree(rnd, star(3), new double[] {40, 60, 60, 60}, constant(4, 40));
        b0.vc[2] = 200;
        b0.vc[3] = 90;
        out.add(new Shape("bendLeft0", maker(b0), b0.n, List.of(FACTORS.get(2))));
        Tree b1 = tree(rnd, star(4), new double[] {40, 60, 60, 60, 60}, constant(5, 40));
        b1.vc[1] = 150;
        b1.vc[2] = 220;
        b1.vc[3] = 100;
        b1.vc[4] = 70;
        out.add(new Shape("bendLeft1", maker(b1), b1.n, List.of(FACTORS.get(2))));
        return out;
    }

    /** The 24 candidates are all generated (the seeded sequence must not shift); the kept ones were chosen with a traced copy of
     * RelativeXPlacer (scratch only): ARM_KEEP reach the RAISE or LOWER inner arm of the !considerNodeModelOrder block in at least
     * one of the three factor variants, BEND_LEFT_HITS reach the left pass "globalBendHeight < EDGE_BEND_HEIGHT" branch under BEND. */
    static final int ARM_CANDIDATES = 24;
    /** The earlier shapes that already have a root-only orderFalse row (their _order shapes need no extra baseline). */
    static final Set<String> CROSSED_BASE = Set.of("comb5", "wideNarrow", "rand12a", "rand18a", "vcSiblings", "starU6", "vcRand18",
            "starShuf6");
    static final Set<Integer> ARM_KEEP = Set.of(0, 2, 5, 7, 10, 11, 17, 18, 20, 21, 23);
    static final Set<Integer> BEND_LEFT_HITS = Set.of(7, 11, 18, 21);

    // ------------------------------------------------------------------------------------------------------------
    // Throws scenarios: { name, Supplier<ElkNode> }

    static List<Object[]> throwsScenarios() {
        Random rnd = new Random(SEED + 1);
        List<Object[]> l = new ArrayList<>();
        Tree cycle = tree(rnd, new int[] {-1, 0}, null, null);
        cycle.extra = g -> {
            ElkEdge e = ElkGraphUtil.createSimpleEdge(g.getChildren().get(1), g.getChildren().get(0));
            e.setIdentifier("eBack");
        };
        l.add(new Object[] {"cycleNoRoot", maker(cycle)});
        Tree diamond = tree(rnd, new int[] {-1, 0, 0, 1}, null, null);
        diamond.extra = g -> {
            ElkEdge e = ElkGraphUtil.createSimpleEdge(g.getChildren().get(2), g.getChildren().get(3));
            e.setIdentifier("eDiamond");
        };
        l.add(new Object[] {"diamondTwoParents", maker(diamond)});
        Tree loop = tree(rnd, new int[] {-1, 0}, null, null);
        loop.extra = g -> {
            ElkEdge e = ElkGraphUtil.createSimpleEdge(g.getChildren().get(1), g.getChildren().get(1));
            e.setIdentifier("eLoop");
        };
        l.add(new Object[] {"selfLoopChild", maker(loop)});
        Tree vcDirect = tree(rnd, new int[] {-1, 0, 0}, constant(3, 40), constant(3, 40));
        vcDirect.vc[1] = 10;
        l.add(new Object[] {"vcTooLowChild", maker(vcDirect)});
        Tree vcGrand = tree(rnd, path(3), constant(3, 40), constant(3, 40));
        vcGrand.vc[0] = 0;
        vcGrand.vc[1] = 100;
        vcGrand.vc[2] = 120;
        l.add(new Object[] {"vcTooLowGrandchild", maker(vcGrand)});
        Tree vcEdge = tree(rnd, path(2), constant(2, 40), constant(2, 40));
        vcEdge.vc[1] = 59;
        l.add(new Object[] {"vcJustBelowMinimum", maker(vcEdge)});
        Tree portTarget = tree(rnd, new int[] {-1, -1}, null, null);
        portTarget.extra = g -> {
            ElkNode b = g.getChildren().get(1);
            ElkPort p = ElkGraphUtil.createPort(b);
            p.setIdentifier("pb");
            p.setDimensions(6, 6);
            p.setProperty(CoreOptions.PORT_SIDE, PortSide.NORTH);
            ElkEdge e = ElkGraphUtil.createSimpleEdge(g.getChildren().get(0), p);
            e.setIdentifier("ePortTarget");
        };
        l.add(new Object[] {"edgeTargetsPort", maker(portTarget)});
        return l;
    }

    /** Throws scenarios prepared and then switched to BEND: the router reads EDGE_BEND_HEIGHT of a node the placer never visited. */
    static List<Object[]> throwsBendScenarios() {
        Random rnd = new Random(SEED + 2);
        Tree portEdge = tree(rnd, new int[] {-1, 0, 0, -1}, null, null);
        portEdge.extra = g -> {
            ElkNode r = g.getChildren().get(0);
            ElkNode extra = g.getChildren().get(3);
            ElkPort p = ElkGraphUtil.createPort(r);
            p.setIdentifier("pr");
            p.setDimensions(6, 6);
            p.setProperty(CoreOptions.PORT_SIDE, PortSide.SOUTH);
            ElkEdge e = ElkGraphUtil.createSimpleEdge(p, extra);
            e.setIdentifier("ePort");
        };
        List<Object[]> l = new ArrayList<>();
        l.add(new Object[] {"bendRouterPortEdgeNpe", maker(portEdge)});
        return l;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Export, labels, JSON helpers

    static void sizeLabels(ElkNode root) {
        List<ElkLabel> all = new ArrayList<>();
        collectLabels(root, all);
        for (ElkLabel l : all) {
            String text = l.getText();
            if (text != null && !text.isEmpty() && l.getWidth() == 0.0 && l.getHeight() == 0.0) {
                l.setWidth(LABEL_CHAR_WIDTH * text.length());
                l.setHeight(LABEL_HEIGHT);
            }
        }
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
