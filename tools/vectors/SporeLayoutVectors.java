// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 8c alg-packing, T2, PK1, PK4, PK5, PK6) for org.eclipse.elk.alg.spore: what
// OverlapRemovalLayoutProvider (sporeOverlap) and ShrinkTreeLayoutProvider (sporeCompaction) do at the pinned ELK commit, stop by stop.
// This program only CALLS ELK APIs (and reads private state by reflection) and records results; it embeds no ELK implementation.
// Run: tools/vectors/spore-layout-vectors.sh <outDir>   (java -cp ... SporeLayoutVectors.java <outDir> <tools/vectors dir>)
// ORIGIN: the row format, the NS1 round trip, the NS6 hex doubles, the strictNumbers sanitiser, the throws shape with the first ELK
// frame, the identity-hash guard and the 16 MiB guard are copied from tools/vectors/DiscoVectors.java (single-file launchers share no
// code).
//
// ===== OUTPUT CONTRACT (everything a TypeScript replay needs; no need to read the recorder body) =====
// File <outDir>/spore-layout.json (2-space top level, ONE compact JSON row per line, trailing newline, strict JSON, under 16 MiB):
//   { jdk, oracle, seed, stopNames, rowCounts: { full, stops, throws, minst, jitter, objects }, tieSummary, optionCoverage, rows: [row...] }
//   row = { id, group, input, expected }, ids unique and stable: "<group>/<alg>/<shape>/<factor>" with alg in overlap | compaction
//   (minst rows add "/i<iteration>"; throws rows are "throws/<alg>/<name>").
//   input = the PREPARED graph (elk.algorithm and the factor applied) exported by ElkGraphJson.forGraph(root).omitLayout(false)
//     .omitZeroDimension(false).omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false) under the system properties
//     org.eclipse.elk.graph.json.exportSeed=1 and org.eclipse.elk.graph.util.identifierSeed=1, EMBEDDED as a JSON object (no bare
//     Infinity/NaN token occurs; strictNumbers would quote one). The root is the layout node and names elk.algorithm
//     (org.eclipse.elk.sporeOverlap or org.eclipse.elk.sporeCompaction). Every option is set on the root (all SPOrE options target
//     parents) except CoreOptions.MARGINS, which is set per child (and overwritten by NodeMarginCalculator, see the import stop).
//   How a row is run (a replay does the same): ElkGraphJson.forGraph(input).toElk(), then new RecursiveGraphLayoutEngine().layout(root,
//     monitor) with SporeMetaDataProvider + SporeCompactionOptions + SporeOverlapRemovalOptions, ForceMetaDataProvider + ForceOptions and
//     LayeredMetaDataProvider + LayeredOptions registered (underlyingLayoutAlgorithm names force, layered or an unknown id).
//
// Numbers: every double is 16 lowercase hex digits, Long.toHexString(Double.doubleToLongBits(d)) zero-padded; a NaN anywhere fails the
//   recording. Integers are JSON numbers. Points are [hexX, hexY]; boxes [x, y, w, h] in hex. Node indices i refer to Graph.vertices
//   (the children of the root in child order; the import stop lists their ids). A tree is nested [i, child, child, ...] in
//   Tree.children order; a leaf is [i].
//
// ELK DUMP (group full and the end stop): graph = { id, x, y, w, h } (the root), nodes / ports / labels = [ { id, x, y, w, h } ] in
//   traversal order (root labels and ports first; then each child, its labels, its ports each followed by its labels, its children),
//   edges = [ { id, sections: [ { start, end, bends: [point...] } ] } ] (the contained edges of each visited node, after its children).
//
// group full: expected = { algorithm, jitterNodes: 0, tieOrder: { calls, orderSensitive, treeified }, graph, nodes, ports, labels,
//   edges } after the engine run (jitterNodes: the jitter guard's count, see jitter). tieOrder summarises the NaiveMinST calls of
//   the run (see minst): calls = how many, orderSensitive / treeified = true when any call is (a mismatch in a row with
//   orderSensitive true can come from the edge order alone). PK6 chain rows (shape
//   chain2000): the sporeOverlap row is checked like every full row; for the sporeCompaction row the stepwise run (jitter guard,
//   tieOrder) stops after P2 and its end is compared engine-to-engine only, because DepthFirstCompaction is cubic in the path length
//   (about 27 s per run here); that row is built once, not twice.
//
// group stops: expected = { algorithm, jitterNodes: 0, tieOrder, stops: [ { step, ... } ... ] } recorded by driving the provider
//   body step by step (OverlapRemovalLayoutProvider.layout / ShrinkTreeLayoutProvider.layout + ShrinkTree.shrink repeated by the
//   recorder; the phases are the strategy enums' create() instances, run in the provider's order). The recorder fails the row
//   when the stepwise end dump differs from the engine run on a fresh import. STOP NAMES (fixed):
//   underlying   = { step, requested, applied, [ELK dump fields when applied] }: only when underlyingLayoutAlgorithm is set; the
//                  layout after the underlying provider ran (applied = false: the id resolved to no algorithm, nothing ran).
//   import       = { step, rootSelection, preferredRoot, costFunction, treeConstruction, compactionStrategy, orthogonal,
//                  spacingNodeNode, maxIterations, runScanline, jitterNodes: 0, root: i|null, nodes: [ { id, v, r, m } ] }: the
//                  options as ElkGraphImporter reads them (sporeOverlap: after the provider overwrote rootSelection, costFunction and
//                  treeConstruction; maxIterations/runScanline are null for sporeCompaction), root = index of Graph.preferredRoot,
//                  v = Node.originalVertex, r = Node.rect [x, y, w, h], m = the child's margins [t, r, b, l] after
//                  NodeMarginCalculator.
//   scanline     = { step, iteration, pairs: [[i, j]...], edges: [[i, j]...], capacity }: sporeOverlap with runScanline, per
//                  iteration: pairs = IOverlapHandler.handle(n1, n2) calls in call order (each adds new TEdge(n1.originalVertex,
//                  n2.originalVertex) to the ONE overlapEdges HashSet, cleared at the start of every iteration, clear keeps the
//                  capacity), edges = overlapEdges in iteration order after the sweep (TEdge u, v as node indices), capacity = the
//                  modelled table capacity. Empty edges = the provider breaks out of the loop here.
//   triangulation = { step, iteration, scanline, delaunay: [[i, j]...], edges: [[i, j]...], hash: { capacity, maxBin, maxEqualHash,
//                  treeified } }: after DelaunayTriangulationPhase. delaunay = BowyerWatsonTriangulation.triangulate(vertices) in
//                  iteration order; edges = Graph.tEdges in iteration order as handed to NaiveMinST (scanline true: overlapEdges after
//                  addAll(delaunay); false: the triangulation set itself, then edges == delaunay). hash: see minst.
//   tree         = { step, iteration, strategy, root, weights: [hex...], tree }: after the MinST/MaxST phase; weights = the cost
//                  NaiveMinST sees per edge of `edges` (MaxST: the negated cost), root = index of the root vertex, tree = Graph.tree.
//   grow         = { step, iteration, overlapsExisted, nodes: [[vx, vy, rx, ry]...] }: after GrowTreePhase (Node.vertex, Node.rect x/y;
//                  rect sizes never change).
//   update       = { step, iteration, vertices: [point...], mapSize }: after ElkGraphImporter.updateGraph (Node.originalVertex = the
//                  rect centre; mapSize = the importer's nodeMap size: below the node count when two centres collapsed).
//   compaction   = { step, ran, nodes: [[vx, vy, rx, ry]...] }: sporeCompaction after ShrinkTreeCompactionPhase (ran = false: at most one
//                  vertex, ShrinkTree.shrink skipped every phase and no triangulation/tree stop exists).
//   end          = { step, iterations, [ELK dump fields] }: after ElkGraphImporter.applyPositions (iterations = the overlap loop count,
//                  null for sporeCompaction).
//   Order: sporeOverlap: [underlying], import, then per iteration [scanline], triangulation, tree, grow, update, then end.
//          sporeCompaction: [underlying], import, [triangulation, tree], compaction, end.
//
// group minst (PK5): one row per NaiveMinST call: expected = { algorithm, jitterNodes: 0, iteration, scanline, strategy, rootIndex,
//   root: point, vertices: [point...], pairs: [[i, j]...], edges: [[u, v]...] (u, v = hex points, Graph.tEdges in iteration order
//   exactly as NaiveMinST.createSpanningTree receives it), weights, tree, reversedTree, orderSensitive, treeified, hash }.
//   reversedTree = the tree NaiveMinST builds from the same edges in REVERSED order (a LinkedHashSet), same root and cost;
//   orderSensitive = reversedTree != tree. hash = { capacity, maxBin, maxEqualHash, treeified } for the TEdge HashSets the order comes
//   from: maxBin = the largest bin (index (h ^ (h >>> 16)) & (capacity - 1)), maxEqualHash = the largest number of edges sharing one
//   hashCode. Scanline path: the overlapEdges history (handler adds, then addAll in delaunay order) is replayed on a list-bin model
//   (capacity 16, threshold 12, doubling when the size exceeds the threshold, a bin reaching 9 entries doubles the table below capacity
//   64 and is treeified at 64 or more; observed rules of src/java/util/JavaHashMap.ts), whose iteration order must equal the JVM's
//   unless treeified (else the recording fails); the delaunay set is classified too. Plain path: capacity = the smallest power of two >=
//   16 holding the set at load 0.75 whose bin indices are non-decreasing in the JVM's iteration order (an upper bound on every bin).
//   treeified = some bin held more than 8 edges at capacity >= 64: the order inside such a bin may depend on the JVM's tree bins (ties
//   by identity hash, .agent-notes/java-foundations.md), so such rows are classified, not trusted. Not classified: the TTriangle HashSet
//   inside BowyerWatsonTriangulation (its order shapes delaunay; the triangulation stop and TriangulationVectors replay it).
//   Overlap rows keep at most MINST_MAX_CALLS iterations per scenario.
//
// group throws: expected = { algorithm, jitterNodes: 0, throws: { class, message, frame } }: the engine run threw inside ELK. class
//   and message are those of the ROOT CAUSE; message = getMessage() or null (a JDK helpful NullPointerException message is JVM
//   text: compare class and frame); frame = the first (innermost) org.eclipse.elk frame of the root cause as "File.java:line". The
//   stepwise path must throw the same.
//
// group jitter (PK4): ElkGraphImporter.java:178 (shiftUntilUnique, :263-268) shifts a node centre by (random.nextDouble() - 0.5) * 0.001
//   while it equals a key already in the value-hashed nodeMap; random is seeded from randomSeed (default 1) since eclipse-elk/elk#1242
//   (it was an unseeded Math.random() before, and runsAgree false). Every planned row is first run through the importer alone (after any underlying layout) and the jitter
//   guard counts the vertices whose Node.originalVertex differs (Double.doubleToLongBits) from the child's x + width / 2, y + height / 2; full,
//   stops and minst rows must count 0 (a planned full row that counts more becomes a jitter row; a planned minst/throws row fails the
//   recording). expected = { algorithm, invariants: { nodeCount, jitterNodes, overlapFree, maxDisplacementBound, runs, runsAgree } }
//   over JITTER_RUNS engine runs (half on the re-imported input, half on the original): nodeCount = children; jitterNodes = vertices
//   the loop shifted; overlapFree (sporeOverlap; null for sporeCompaction) = no two final child boxes [x, x + w] x [y, y + h] intersect
//   by more than OVERLAP_EPS in both axes, the same in every run (else the recording fails); maxDisplacementBound = a bound computed
//   from the INPUT alone (a run-derived bound is not stable across recordings): 4 * sum over children in child order of (width +
//   height) + (children's bounding box width) + (bounding box height), in that order; the recording fails when a child's (x, y)
//   moved farther (Euclidean, Math.hypot) in any run; runsAgree = all runs gave the same ELK dump.
//
// group objects (T13b, appended after every other row; no graph): what the public JDK/ELK equality API returns for operands the
//   input describes. id "objects/<call>/<scenario>", alg none. input = { call, objects: { <name>: spec }, args: [name|null, name|null] }
//   with spec = { type: "KVector", x, y } | { type: "Double", bits } | { type: "TEdge", u: name, v: name } | { type: "TTriangle", a: name,
//   b: name, c: name } (doubles as the 16 hex digits of Double.doubleToLongBits, so NaN is canonical 7ff8000000000000; u, v, a, b, c name
//   other objects of the row). Each name is ONE object: two args (or two edge ends) with the same name are the same object, two names
//   are distinct objects even when their fields are equal; a Double is boxed once per name with Double.valueOf. call = "Objects.equals"
//   (Objects.equals(args[0], args[1])), "equals" (args[0].equals(args[1]); args[0] is never null) or "TTriangle.contains"
//   (((TTriangle) args[0]).contains((KVector) args[1])). expected = { result: boolean }. Scenarios: KVector with a NaN y, a NaN x,
//   both NaN, finite, and 0.0 vs -0.0; null operands; TTriangle.contains with a NaN vertex and a finite control; TEdge (NaN endpoint and
//   finite control) against itself, an edge over the same vertex objects (same and swapped order) and an edge over distinct equal
//   vertices; boxed Double (same box, distinct boxes; NaN, 0.0 vs -0.0, finite). The program only calls the API and records.
//
// OPTIONS (every value of tools/melk/sources/SPOrE.melk for both algorithms, PK2; optionCoverage counts rows per value and group, keyed
//   "<alg>:<option>"): factors applied one at a time to the base shapes (see overlapFactors, compactionFactors) plus combined rows.
//   debugMode rows write SVG files under user.home, which the recorder points at <outDir>/.spore-debug-home and deletes before writing
//   the output; every debugMode row must equal the same input without debugMode (checked).
//
// SCENARIOS: seeded java.util.Random (SEED, a seed per shape); integer coordinates where cost ties are wanted (grids), cos/sin
//   polygons with a centre node, random overlapping shapes with labels, ports, a port edge, a self loop and an edge head label (non-zero
//   margins), the corpus inputs test/corpus/generated/spore{Overlap,Compaction}-graph-small.json (all centres coincide: jitter), a
//   designed duplicate-centre graph, and a 2,000-node chain per algorithm (PK6; centres on a line, the tree is a path).
//
// Round trip (NS1): every row is run on the re-imported input (recorded) and on a freshly prepared original; the two must agree (jitter
//   rows: their invariants). Stability: every row is built twice from scratch and the two serialisations must be byte-identical (the
//   sporeCompaction chain row once). A run past its timeout stops the recording.
// Identity hashes: the script runs the JVM with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2; the program refuses to run without it
//   unless SPORE_UNPINNED=1 (an evidence run).
// Size guard: the output must stay under 16 MiB (MAX_BYTES).
import com.google.common.collect.Sets;
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
import java.util.stream.Stream;
import org.eclipse.elk.alg.common.BowyerWatsonTriangulation;
import org.eclipse.elk.alg.common.ICostFunction;
import org.eclipse.elk.alg.common.NaiveMinST;
import org.eclipse.elk.alg.common.TEdge;
import org.eclipse.elk.alg.common.TTriangle;
import org.eclipse.elk.alg.common.Tree;
import org.eclipse.elk.alg.common.spore.IOverlapHandler;
import org.eclipse.elk.alg.common.spore.InternalProperties;
import org.eclipse.elk.alg.common.spore.Node;
import org.eclipse.elk.alg.common.spore.ScanlineOverlapCheck;
import org.eclipse.elk.alg.common.utils.SVGImage;
import org.eclipse.elk.alg.force.options.ForceMetaDataProvider;
import org.eclipse.elk.alg.force.options.ForceOptions;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.spore.ElkGraphImporter;
import org.eclipse.elk.alg.spore.SPOrEPhases;
import org.eclipse.elk.alg.spore.graph.Graph;
import org.eclipse.elk.alg.spore.options.CompactionStrategy;
import org.eclipse.elk.alg.spore.options.OverlapRemovalStrategy;
import org.eclipse.elk.alg.spore.options.RootSelection;
import org.eclipse.elk.alg.spore.options.SpanningTreeCostFunction;
import org.eclipse.elk.alg.spore.options.SporeCompactionOptions;
import org.eclipse.elk.alg.spore.options.SporeMetaDataProvider;
import org.eclipse.elk.alg.spore.options.SporeOverlapRemovalOptions;
import org.eclipse.elk.alg.spore.options.StructureExtractionStrategy;
import org.eclipse.elk.alg.spore.options.TreeConstructionStrategy;
import org.eclipse.elk.core.AbstractLayoutProvider;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.alg.ILayoutPhase;
import org.eclipse.elk.core.data.LayoutAlgorithmData;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.ElkRectangle;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.EdgeLabelPlacement;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.core.util.ElkUtil;
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
import org.eclipse.elk.graph.util.ElkGraphUtil;

public class SporeLayoutVectors {
    /** The pinned ELK commit: the recorder script passes tools/oracle/ELK_COMMIT as -Delk.commit (issue #96). */
    static String elkCommit() {
        String commit = System.getProperty("elk.commit");
        if (commit == null || !commit.matches("[0-9a-f]{40}")) {
            throw new IllegalStateException("system property elk.commit is " + commit
                + ", not a 40-digit sha; run this recorder through its tools/vectors/*-vectors.sh script");
        }
        return commit;
    }

    static final String OUTPUT = "spore-layout.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String IDENTIFIER_SEED_PROPERTY = "org.eclipse.elk.graph.util.identifierSeed";
    static final String UNPINNED_ENV = "SPORE_UNPINNED";
    static final String DEBUG_HOME = ".spore-debug-home";
    static final String OVERLAP = SporeOverlapRemovalOptions.ALGORITHM_ID, COMPACTION = SporeCompactionOptions.ALGORITHM_ID;
    static final long SEED = 8301L;
    static final long MAX_BYTES = 16L * 1024 * 1024;
    static final int ROW_TIMEOUT_SECONDS = 120, CHAIN_TIMEOUT_SECONDS = 300;
    static final int JITTER_RUNS = 6, MINST_MAX_CALLS = 8, CHAIN_NODES = 2000;
    static final int TREEIFY_THRESHOLD = 8, MIN_TREEIFY_CAPACITY = 64, DEFAULT_CAPACITY = 16;
    static final double LOAD_FACTOR = 0.75, OVERLAP_EPS = 1e-9, DISPLACEMENT_FACTOR = 4;
    static final String FULL = "full", STOPS = "stops", THROWS = "throws", MINST = "minst", JITTER = "jitter";
    static final List<String> GROUPS = List.of(FULL, STOPS, THROWS, MINST, JITTER);
    /** The additive group (T13b): JDK/ELK equality semantics, no graph. Not part of GROUPS (coverage and tieSummary stay as they were). */
    static final String OBJECTS = "objects";
    static final List<String> ROW_GROUPS = List.of(FULL, STOPS, THROWS, MINST, JITTER, OBJECTS);
    static final String ROOT_ID = "root";
    static final double LABEL_CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0;
    static final String S_UNDERLYING = "underlying", S_IMPORT = "import", S_SCANLINE = "scanline", S_TRIANGULATION = "triangulation",
            S_TREE = "tree", S_GROW = "grow", S_UPDATE = "update", S_COMPACTION = "compaction", S_END = "end";
    static final List<String> STOP_NAMES = List.of(S_UNDERLYING, S_IMPORT, S_SCANLINE, S_TRIANGULATION, S_TREE, S_GROW, S_UPDATE,
            S_COMPACTION, S_END);
    static final String CORPUS_OVERLAP = "test/corpus/generated/sporeOverlap-graph-small.json";
    static final String CORPUS_COMPACTION = "test/corpus/generated/sporeCompaction-graph-small.json";
    static final String CORPUS_TABLE = """
            345285cee7667ac5fe9c21ee2a44d37766cb3408a2980d85f2a9c42e455be5bf  repo:test/corpus/generated/sporeOverlap-graph-small.json
            230ce9240857d0906e499c86f049d97f2beee9a2162ec1034a3c7e45a5410312  repo:test/corpus/generated/sporeCompaction-graph-small.json
            """;
    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");

    static final class Bug extends RuntimeException {
        Bug(String m) {
            super(m);
        }
    }

    record Row(String id, String group, String json, String alg, boolean orderSensitive, boolean treeified) { }

    record Factor(String id, Consumer<ElkNode> apply) { }

    /** A scenario: make builds the unprepared graph (no algorithm option); light = the sporeCompaction chain row (see build). */
    record Spec(String id, String alg, Supplier<ElkNode> make, boolean stops, List<Factor> factors, boolean light) {
        Spec(String id, String alg, Supplier<ElkNode> make, boolean stops, List<Factor> factors) {
            this(id, alg, make, stops, factors, false);
        }
    }

    /** One NaiveMinST call of a stepwise run. */
    record Minst(int iteration, boolean scanline, String json, boolean orderSensitive, boolean treeified) { }

    /** The outcome of an engine run: the ELK dump, or the throws body. */
    record Outcome(boolean threw, String body) { }

    static ExecutorService pool;
    static Path REPO;
    static final List<String> NOTES = new ArrayList<>();

    public static void main(String[] args) throws Exception {
        elkCommit(); // refuse before the first row is recorded, not at the stamp, when the pin was not passed
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        Path out = Path.of(args[0]).toAbsolutePath();
        Path debugHome = out.resolve(DEBUG_HOME);
        setup(debugHome);
        verifyCorpus();
        List<Row> rows = buildRows();
        deleteTree(debugHome);
        checkRequirements(rows);
        StringBuilder sb = new StringBuilder("{\n  \"jdk\": ");
        str(sb, System.getProperty("java.version"));
        sb.append(",\n  \"oracle\": \"").append(elkCommit()).append("\",\n  \"seed\": ").append(SEED);
        sb.append(",\n  \"stopNames\": ").append(list(STOP_NAMES.stream().map(SporeLayoutVectors::q).toList()));
        sb.append(",\n  \"rowCounts\": {");
        for (int g = 0; g < ROW_GROUPS.size(); g++) {
            String name = ROW_GROUPS.get(g);
            sb.append(g == 0 ? "" : ", ").append(q(name)).append(": ").append(rows.stream().filter(r -> r.group.equals(name)).count());
        }
        sb.append("},\n  \"tieSummary\": ").append(tieSummary(rows));
        sb.append(",\n  \"optionCoverage\": ").append(coverageJson()).append(",\n  \"rows\": [\n");
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
        System.err.println("rows " + rows.size() + " bytes " + bytes.length);
        System.err.println("tieSummary " + tieSummary(rows));
        for (String note : NOTES) {
            System.err.println(note);
        }
        System.err.println("optionCoverage " + coverageJson());
        pool.shutdownNow();
    }

    static void setup(Path debugHome) throws Exception {
        if (!"1".equals(System.getenv(UNPINNED_ENV))
                && System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/spore-layout-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new SporeMetaDataProvider(), new SporeCompactionOptions(), new SporeOverlapRemovalOptions(),
                new ForceMetaDataProvider(), new ForceOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty(IDENTIFIER_SEED_PROPERTY, "1");
        // ElkUtil.debugFolderPath writes under user.home; debugMode rows must stay inside the output directory
        deleteTree(debugHome);
        Files.createDirectories(debugHome);
        System.setProperty("user.home", debugHome.toString());
        pool = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "spore-row");
            t.setDaemon(true);
            return t;
        });
    }

    static void deleteTree(Path p) throws IOException {
        if (!Files.exists(p)) {
            return;
        }
        try (Stream<Path> s = Files.walk(p)) {
            for (Path q : s.sorted(Comparator.reverseOrder()).toList()) {
                Files.delete(q);
            }
        }
    }

    /** Runs the task on the worker thread; a run past the timeout ends the recording. */
    static <T> T timed(String what, int seconds, Callable<T> task) throws Exception {
        Future<T> f = pool.submit(task);
        try {
            return f.get(seconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            System.err.println("TIMEOUT " + what + " (" + seconds + " s)");
            System.exit(1);
            return null;
        } catch (ExecutionException e) {
            if (e.getCause() instanceof Exception ex) {
                throw ex;
            }
            if (e.getCause() instanceof Error er) {
                throw er;
            }
            throw e;
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Rows

    static List<Row> buildRows() throws Exception {
        List<Row> rows = new ArrayList<>();
        for (Spec s : fullSpecs()) {
            for (Factor f : s.factors) {
                rows.addAll(stable(s, f, FULL));
                if (s.stops) {
                    rows.addAll(stable(s, f, STOPS));
                }
            }
        }
        for (Spec s : throwsSpecs()) {
            rows.addAll(stable(s, s.factors.get(0), THROWS));
        }
        for (Spec s : minstSpecs()) {
            for (Factor f : s.factors) {
                rows.addAll(stable(s, f, MINST));
            }
        }
        for (Spec s : jitterSpecs()) {
            for (Factor f : s.factors) {
                List<Row> r = stable(s, f, FULL);
                if (!r.get(0).group.equals(JITTER)) {
                    throw new Bug("jitter scenario " + s.id + " did not reach the shiftUntilUnique loop");
                }
                rows.addAll(r);
            }
        }
        rows.addAll(objectsRows());
        rows.sort(Comparator.comparingInt(r -> ROW_GROUPS.indexOf(r.group)));
        return rows;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Group objects (T13b)

    /** One operand of an objects row: type KVector (x, y), Double (x) or TEdge (r0, r1) / TTriangle (r0, r1, r2) over named objects. */
    record Spec3(String type, double x, double y, String r0, String r1, String r2) { }

    static Spec3 kv(double x, double y) {
        return new Spec3("KVector", x, y, null, null, null);
    }

    static Spec3 dbl(double d) {
        return new Spec3("Double", d, 0, null, null, null);
    }

    static Spec3 edge(String u, String v) {
        return new Spec3("TEdge", 0, 0, u, v, null);
    }

    static Spec3 tri(String a, String b, String c) {
        return new Spec3("TTriangle", 0, 0, a, b, c);
    }

    static String bits(double d) {
        return "\"" + String.format("%016x", Double.doubleToLongBits(d)) + "\"";
    }

    static String specJson(Spec3 s) {
        return switch (s.type) {
            case "KVector" -> "{\"type\": \"KVector\", \"x\": " + bits(s.x) + ", \"y\": " + bits(s.y) + "}";
            case "Double" -> "{\"type\": \"Double\", \"bits\": " + bits(s.x) + "}";
            case "TEdge" -> "{\"type\": \"TEdge\", \"u\": " + q(s.r0) + ", \"v\": " + q(s.r1) + "}";
            default -> "{\"type\": \"TTriangle\", \"a\": " + q(s.r0) + ", \"b\": " + q(s.r1) + ", \"c\": " + q(s.r2) + "}";
        };
    }

    static Object instantiate(String name, Map<String, Spec3> specs, Map<String, Object> made) {
        Object done = made.get(name);
        if (done != null) {
            return done;
        }
        Spec3 s = specs.get(name);
        Object o = switch (s.type) {
            case "KVector" -> new KVector(s.x, s.y);
            case "Double" -> Double.valueOf(s.x);
            case "TEdge" -> new TEdge((KVector) instantiate(s.r0, specs, made), (KVector) instantiate(s.r1, specs, made));
            default -> new TTriangle((KVector) instantiate(s.r0, specs, made), (KVector) instantiate(s.r1, specs, made),
                    (KVector) instantiate(s.r2, specs, made));
        };
        made.put(name, o);
        return o;
    }

    static boolean callObjects(String call, Object a, Object b) {
        if (a == null && !call.equals("Objects.equals")) {
            throw new IllegalArgumentException(call + " needs a non-null receiver (only Objects.equals rows pass null)");
        }
        return switch (call) {
            case "Objects.equals" -> Objects.equals(a, b);
            case "equals" -> a.equals(b);
            default -> ((TTriangle) a).contains((KVector) b);
        };
    }

    static Row objectsRow(String call, String scenario, Map<String, Spec3> specs, String arg0, String arg1) {
        Map<String, Object> made = new HashMap<>();
        for (String name : specs.keySet()) {
            instantiate(name, specs, made);
        }
        boolean result = callObjects(call, arg0 == null ? null : made.get(arg0), arg1 == null ? null : made.get(arg1));
        StringBuilder in = new StringBuilder("{\"call\": " + q(call) + ", \"objects\": {");
        int i = 0;
        for (Map.Entry<String, Spec3> e : specs.entrySet()) {
            in.append(i++ == 0 ? "" : ", ").append(q(e.getKey())).append(": ").append(specJson(e.getValue()));
        }
        in.append("}, \"args\": [").append(arg0 == null ? "null" : q(arg0)).append(", ").append(arg1 == null ? "null" : q(arg1))
                .append("]}");
        String id = OBJECTS + "/" + call + "/" + scenario;
        return new Row(id, OBJECTS, rowJson(id, OBJECTS, in.toString(), "{\"result\": " + result + "}"), "none", false, false);
    }

    static Map<String, Spec3> specs(Object... nameSpecPairs) {
        if (nameSpecPairs.length % 2 != 0) {
            throw new IllegalArgumentException("specs() takes name/spec pairs, got " + nameSpecPairs.length + " arguments");
        }
        Map<String, Spec3> m = new LinkedHashMap<>();
        for (int i = 0; i < nameSpecPairs.length; i += 2) {
            m.put((String) nameSpecPairs[i], (Spec3) nameSpecPairs[i + 1]);
        }
        return m;
    }

    static List<Row> objectsRows() {
        List<Row> rows = new ArrayList<>();
        Object[][] vectors = {{"nanY", 1.5, Double.NaN}, {"nanX", Double.NaN, 1.5}, {"nanBoth", Double.NaN, Double.NaN},
                {"finite", 1.5, -2.5}};
        for (Object[] v : vectors) {
            Spec3 spec = kv((double) v[1], (double) v[2]);
            String sc = "kvector/" + v[0];
            for (String call : List.of("Objects.equals", "equals")) {
                rows.add(objectsRow(call, sc + "/same", specs("v", spec), "v", "v"));
                rows.add(objectsRow(call, sc + "/distinct", specs("v", spec, "w", spec), "v", "w"));
            }
        }
        for (String call : List.of("Objects.equals", "equals")) {
            rows.add(objectsRow(call, "kvector/zeroNegZero/distinct", specs("v", kv(0.0, 0.0), "w", kv(-0.0, 0.0)), "v", "w"));
        }
        Map<String, Spec3> one = specs("v", kv(1.5, -2.5));
        rows.add(objectsRow("Objects.equals", "null/nullNull", one, null, null));
        rows.add(objectsRow("Objects.equals", "null/nullVector", one, null, "v"));
        rows.add(objectsRow("Objects.equals", "null/vectorNull", one, "v", null));
        for (String t : List.of("nanTriangle", "finiteTriangle")) {
            double cx = t.equals("nanTriangle") ? Double.NaN : 2.0;
            Map<String, Spec3> m = specs("a", kv(0.0, 0.0), "b", kv(4.0, 0.0), "c", kv(cx, 3.0), "t", tri("a", "b", "c"),
                    "aCopy", kv(0.0, 0.0), "cCopy", kv(cx, 3.0), "other", kv(9.0, 9.0));
            rows.add(objectsRow("TTriangle.contains", t + "/sameVertexC", m, "t", "c"));
            rows.add(objectsRow("TTriangle.contains", t + "/distinctEqualC", m, "t", "cCopy"));
            rows.add(objectsRow("TTriangle.contains", t + "/sameVertexA", m, "t", "a"));
            rows.add(objectsRow("TTriangle.contains", t + "/distinctEqualA", m, "t", "aCopy"));
            rows.add(objectsRow("TTriangle.contains", t + "/unrelated", m, "t", "other"));
        }
        for (String t : List.of("nanEdge", "finiteEdge")) {
            double px = t.equals("nanEdge") ? Double.NaN : 1.0;
            Map<String, Spec3> m = specs("p", kv(px, 1.0), "q", kv(2.0, 2.0), "pCopy", kv(px, 1.0), "qCopy", kv(2.0, 2.0),
                    "e1", edge("p", "q"), "e2", edge("p", "q"), "swapped", edge("q", "p"), "copies", edge("pCopy", "qCopy"));
            for (String call : List.of("Objects.equals", "equals")) {
                rows.add(objectsRow(call, t + "/self", m, "e1", "e1"));
                rows.add(objectsRow(call, t + "/sameVertices", m, "e1", "e2"));
                rows.add(objectsRow(call, t + "/swappedVertices", m, "e1", "swapped"));
                rows.add(objectsRow(call, t + "/distinctEqualVertices", m, "e1", "copies"));
            }
        }
        Object[][] boxes = {{"nan", Double.NaN, Double.NaN}, {"zeroNegZero", 0.0, -0.0}, {"zeroZero", 0.0, 0.0},
                {"finite", 1.5, 1.5}};
        for (Object[] b : boxes) {
            for (String call : List.of("Objects.equals", "equals")) {
                rows.add(objectsRow(call, "double/" + b[0] + "/sameBox", specs("d", dbl((double) b[1])), "d", "d"));
                rows.add(objectsRow(call, "double/" + b[0] + "/distinctBoxes",
                        specs("d", dbl((double) b[1]), "e", dbl((double) b[2])), "d", "e"));
            }
        }
        return rows;
    }

    static String algShort(String alg) {
        return alg.equals(OVERLAP) ? "overlap" : "compaction";
    }

    static Supplier<ElkNode> prepare(Spec s, Factor f) {
        return () -> {
            ElkNode root = s.make.get();
            root.setProperty(CoreOptions.ALGORITHM, s.alg);
            f.apply.accept(root);
            return root;
        };
    }

    /** Builds a planned row twice from scratch (a light row once); the serialisations must agree. */
    static List<Row> stable(Spec s, Factor f, String group) throws Exception {
        String base = algShort(s.alg) + "/" + s.id + (group.equals(THROWS) ? "" : "/" + f.id);
        Supplier<ElkNode> prep = prepare(s, f);
        List<Row> a = build(base, group, s, prep, true);
        if (!s.light) {
            List<Row> b = build(base, group, s, prep, false);
            if (a.size() != b.size()) {
                throw new Bug("row " + base + " is not stable across two builds (row count)");
            }
            for (int i = 0; i < a.size(); i++) {
                if (!a.get(i).json.equals(b.get(i).json)) {
                    throw new Bug("row " + a.get(i).id + " is not stable across two builds:\n" + expectedOf(a.get(i).json) + "\n"
                            + expectedOf(b.get(i).json));
                }
            }
        }
        if (!group.equals(THROWS) && !group.equals(JITTER) && Boolean.TRUE.equals(debugFlag(prep.get()))) {
            checkDebugInvariant(base, group, s, prep, a);
        }
        return a;
    }

    static Boolean debugFlag(ElkNode root) {
        return root.hasProperty(CoreOptions.DEBUG_MODE) ? root.getProperty(CoreOptions.DEBUG_MODE) : null;
    }

    /** A debugMode row must record what the same input records without debugMode (debug output only writes SVG files). */
    static void checkDebugInvariant(String base, String group, Spec s, Supplier<ElkNode> prep, List<Row> rows) throws Exception {
        Supplier<ElkNode> plain = () -> {
            ElkNode r = prep.get();
            r.setProperty(CoreOptions.DEBUG_MODE, false);
            return r;
        };
        List<Row> b = build(base, group, s, plain, false);
        for (int i = 0; i < rows.size(); i++) {
            String e1 = expectedOf(rows.get(i).json), e2 = expectedOf(b.get(i).json);
            if (!e1.equals(e2)) {
                throw new Bug("row " + rows.get(i).id + ": debugMode changes the result");
            }
        }
    }

    static String expectedOf(String rowJson) {
        return rowJson.substring(rowJson.indexOf(", \"expected\": "));
    }

    static List<Row> build(String base, String group, Spec s, Supplier<ElkNode> prep, boolean record) throws Exception {
        String alg = s.alg;
        int timeout = s.light ? CHAIN_TIMEOUT_SECONDS : ROW_TIMEOUT_SECONDS;
        ElkNode original = prep.get();
        String input = export(original);
        boolean complete = !s.light; // light: the stepwise run stops after P2 (DepthFirstCompaction runs in the engine only)
        Step viaImport = timed(base, timeout, () -> stepRun(load(input), alg, complete));
        Step viaOriginal = timed(base, timeout, () -> stepRun(prep.get(), alg, complete));
        if (viaImport.jitterNodes != viaOriginal.jitterNodes) {
            throw new Bug("row " + base + ": the jitter guard differs between the re-imported and the original graph");
        }
        if (viaImport.jitterNodes > 0) {
            if (!group.equals(FULL) && !group.equals(STOPS)) {
                throw new Bug("row " + base + " is planned " + group + " but reached the shiftUntilUnique loop");
            }
            if (group.equals(STOPS)) {
                return List.of(); // the full twin of this scenario records the jitter row
            }
            if (record) {
                NOTES.add("jitter: " + base + " (" + viaImport.jitterNodes + " shifted vertices)");
                countCoverage(JITTER, alg, original);
            }
            return List.of(jitterRow(JITTER + "/" + base, alg, input, prep, viaImport.jitterNodes));
        }
        if (!viaImport.json().equals(viaOriginal.json())) {
            throw new Bug("round trip: row " + base + " differs between the re-imported and the original graph (stepwise):\n"
                    + viaImport.json() + "\n" + viaOriginal.json());
        }
        Outcome engineImport = timed(base, timeout, () -> engine(load(input)));
        Outcome engineOriginal = timed(base, timeout, () -> engine(prep.get()));
        if (!engineImport.equals(engineOriginal)) {
            throw new Bug("round trip: row " + base + " differs between the re-imported and the original graph:\n" + engineImport.body
                    + "\n" + engineOriginal.body);
        }
        if (group.equals(THROWS) != engineImport.threw) {
            throw new Bug("row " + base + (engineImport.threw ? " threw but is planned " + group + ": " + engineImport.body
                    : " is planned throws but ran"));
        }
        if (engineImport.threw) {
            if (viaImport.throwsBody == null || !viaImport.throwsBody.equals(engineImport.body)) {
                throw new Bug("row " + base + ": the stepwise path does not throw the same exception: " + viaImport.throwsBody + " vs "
                        + engineImport.body);
            }
        } else {
            if (viaImport.throwsBody != null) {
                throw new Bug("row " + base + ": the stepwise path threw " + viaImport.throwsBody);
            }
            if (complete && !viaImport.endBody.equals(engineImport.body)) {
                throw new Bug("row " + base + ": the stepwise run differs from the engine run:\n" + viaImport.endBody + "\n"
                        + engineImport.body);
            }
        }
        if (record) {
            countCoverage(group, alg, original);
        }
        String head = "{\"algorithm\": " + q(alg) + ", \"jitterNodes\": " + viaImport.jitterNodes + ", ";
        return switch (group) {
            case FULL -> List.of(row(FULL + "/" + base, FULL, input, head + "\"tieOrder\": " + viaImport.tieOrder() + ", "
                    + engineImport.body + "}", alg, viaImport));
            case STOPS -> List.of(row(STOPS + "/" + base, STOPS, input, head + "\"tieOrder\": " + viaImport.tieOrder() + ", \"stops\": "
                    + list(viaImport.stops) + "}", alg, viaImport));
            case THROWS -> List.of(row(THROWS + "/" + base, THROWS, input, head + engineImport.body + "}", alg, viaImport));
            default -> minstRows(base, input, head, viaImport);
        };
    }

    static Row row(String id, String group, String input, String expected, String alg, Step st) {
        boolean os = st != null && st.minst.stream().anyMatch(Minst::orderSensitive);
        boolean tf = st != null && st.minst.stream().anyMatch(Minst::treeified);
        return new Row(id, group, rowJson(id, group, input, expected), alg, os, tf);
    }

    static String rowJson(String id, String group, String input, String expected) {
        StringBuilder sb = new StringBuilder("{\"id\": ");
        str(sb, id);
        sb.append(", \"group\": \"").append(group).append("\", \"input\": ").append(input).append(", \"expected\": ").append(expected)
                .append('}');
        return sb.toString();
    }

    static List<Row> minstRows(String base, String input, String head, Step st) {
        if (st.minst.isEmpty()) {
            throw new Bug("minst scenario " + base + " made no NaiveMinST call");
        }
        List<Row> rows = new ArrayList<>();
        for (Minst m : st.minst.subList(0, Math.min(MINST_MAX_CALLS, st.minst.size()))) {
            String id = MINST + "/" + base + "/i" + m.iteration;
            String expected = head + m.json + "}";
            rows.add(new Row(id, MINST, rowJson(id, MINST, input, expected), st.alg, m.orderSensitive, m.treeified));
        }
        return rows;
    }

    static ElkNode load(String json) {
        return ElkGraphJson.forGraph(json).toElk();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Engine runs and throws

    static Outcome engine(ElkNode root) {
        try {
            new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
            return new Outcome(false, dumpBody(root));
        } catch (RuntimeException | StackOverflowError e) {
            return new Outcome(true, throwsBody(e));
        }
    }

    static String throwsBody(Throwable e) {
        Throwable cause = rootCause(e);
        StackTraceElement frame = elkFrame(cause);
        if (e instanceof Bug || frame == null) {
            throw e instanceof RuntimeException re ? re : new RuntimeException(e);
        }
        StringBuilder sb = new StringBuilder("\"throws\": {\"class\": ");
        str(sb, cause.getClass().getName());
        sb.append(", \"message\": ");
        str(sb, cause.getMessage());
        sb.append(", \"frame\": ");
        str(sb, frame.getFileName() + ":" + frame.getLineNumber());
        return sb.append('}').toString();
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
            if (f.getClassName().startsWith("SporeLayoutVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Reflection (the recorder is test code; the importer keeps nodeMap private)

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

    // ------------------------------------------------------------------------------------------------------------
    // The stepwise run

    static final class Step {
        final List<String> stops = new ArrayList<>();
        final List<Minst> minst = new ArrayList<>();
        final String alg;
        int jitterNodes;
        String endBody;
        String throwsBody;

        String json() {
            return throwsBody != null ? throwsBody : list(stops) + list(minst.stream().map(Minst::json).toList());
        }

        Step(String alg) {
            this.alg = alg;
        }

        String tieOrder() {
            boolean os = minst.stream().anyMatch(Minst::orderSensitive), tf = minst.stream().anyMatch(Minst::treeified);
            return "{\"calls\": " + minst.size() + ", \"orderSensitive\": " + os + ", \"treeified\": " + tf + "}";
        }
    }

    /** Node and vertex indices of the current Graph.vertices (identity). */
    static final class Idx {
        final IdentityHashMap<KVector, Integer> vertex = new IdentityHashMap<>();
        final IdentityHashMap<Node, Integer> node = new IdentityHashMap<>();
        final Graph graph;

        Idx(Graph g) {
            graph = g;
            for (int i = 0; i < g.vertices.size(); i++) {
                vertex.put(g.vertices.get(i).originalVertex, i);
                node.put(g.vertices.get(i), i);
            }
        }

        int v(KVector k) {
            Integer i = vertex.get(k);
            if (i == null) {
                throw new Bug("KVector " + k + " is no current Node.originalVertex");
            }
            return i;
        }

        int n(Node k) {
            Integer i = node.get(k);
            if (i == null) {
                throw new Bug("Node is not in Graph.vertices");
            }
            return i;
        }

        String pairs(Collection<TEdge> edges) {
            List<String> l = new ArrayList<>();
            for (TEdge e : edges) {
                l.add("[" + v(e.u) + ", " + v(e.v) + "]");
            }
            return list(l);
        }

        String vTree(Tree<KVector> t, int rootIdx) {
            StringBuilder sb = new StringBuilder("[").append(rootIdx);
            for (Tree<KVector> c : t.children) {
                sb.append(", ").append(vTree(c, v(c.node)));
            }
            return sb.append(']').toString();
        }

        String nTree(Tree<Node> t) {
            StringBuilder sb = new StringBuilder("[").append(n(t.node));
            for (Tree<Node> c : t.children) {
                sb.append(", ").append(nTree(c));
            }
            return sb.append(']').toString();
        }

        String nodes() {
            List<String> l = new ArrayList<>();
            for (Node n : graph.vertices) {
                l.add("[" + hex(n.vertex.x) + ", " + hex(n.vertex.y) + ", " + hex(n.rect.x) + ", " + hex(n.rect.y) + "]");
            }
            return list(l);
        }
    }

    static Step stepRun(ElkNode layout, String alg, boolean complete) {
        Step st = new Step(alg);
        try {
            if (alg.equals(OVERLAP)) {
                overlap(layout, st);
            } else {
                compaction(layout, st, complete);
            }
        } catch (RuntimeException | StackOverflowError e) {
            st.throwsBody = throwsBody(e);
        }
        return st;
    }

    /** OverlapRemovalLayoutProvider.layout, step by step. */
    static void overlap(ElkNode layout, Step st) {
        underlying(layout, st, SporeOverlapRemovalOptions.UNDERLYING_LAYOUT_ALGORITHM);
        layout.setProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION, RootSelection.CENTER_NODE);
        layout.setProperty(SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION, SpanningTreeCostFunction.INVERTED_OVERLAP);
        layout.setProperty(SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION, TreeConstructionStrategy.MINIMUM_SPANNING_TREE);
        int maxIterations = layout.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS);
        String debugOutputFile = null;
        if (layout.getProperty(SporeOverlapRemovalOptions.DEBUG_MODE)) {
            debugOutputFile = ElkUtil.debugFolderPath("spore") + "45scanlineOverlaps";
        }
        SVGImage svg = new SVGImage(debugOutputFile);
        Set<TEdge> overlapEdges = Sets.newHashSet();
        List<TEdge> added = new ArrayList<>();
        List<Node[]> calls = new ArrayList<>();
        IOverlapHandler overlapHandler = (n1, n2) -> {
            TEdge e = new TEdge(n1.originalVertex, n2.originalVertex);
            calls.add(new Node[] {n1, n2});
            added.add(e);
            overlapEdges.add(e);
        };
        ElkGraphImporter graphImporter = new ElkGraphImporter();
        Graph graph = graphImporter.importGraph(layout);
        st.jitterNodes = jitterCount(layout, graph);
        st.stops.add(importStop(layout, graph, true));
        HashModel model = new HashModel();
        boolean overlapsExisted = true;
        int iteration = 0;
        while (iteration < maxIterations && overlapsExisted) {
            boolean scanline = layout.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE);
            if (scanline) {
                overlapEdges.clear();
                model.clear();
                calls.clear();
                added.clear();
                new ScanlineOverlapCheck(overlapHandler, svg).sweep(graph.vertices);
                for (TEdge e : added) {
                    model.add(e);
                }
                st.stops.add(scanlineStop(graph, iteration, calls, overlapEdges, model));
                if (overlapEdges.isEmpty()) {
                    break; // don't bother if nothing overlaps
                }
                graph.tEdges = overlapEdges;
            }
            phases(graph, st, iteration, scanline ? model : null, OverlapRemovalStrategy.GROW_TREE.create());
            graphImporter.updateGraph(graph);
            st.stops.add(updateStop(graph, graphImporter, iteration));
            overlapsExisted = graph.getProperty(InternalProperties.OVERLAPS_EXISTED);
            iteration++;
        }
        graphImporter.applyPositions(graph);
        st.endBody = dumpBody(layout);
        st.stops.add("{\"step\": \"" + S_END + "\", \"iterations\": " + iteration + ", " + st.endBody + "}");
    }

    /** ShrinkTreeLayoutProvider.layout with ShrinkTree.shrink, step by step. */
    static void compaction(ElkNode layout, Step st, boolean complete) {
        underlying(layout, st, SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM);
        ElkGraphImporter graphImporter = new ElkGraphImporter();
        Graph graph = graphImporter.importGraph(layout);
        st.jitterNodes = jitterCount(layout, graph);
        st.stops.add(importStop(layout, graph, false));
        ILayoutPhase<SPOrEPhases, Graph> p3 = graph.compactionStrategy.create();
        boolean ran = graph.vertices.size() > 1;
        if (ran) {
            phases(graph, st, 0, null, complete ? p3 : null);
        }
        if (!complete) {
            return;
        }
        st.stops.add("{\"step\": \"" + S_COMPACTION + "\", \"ran\": " + ran + ", \"nodes\": " + new Idx(graph).nodes() + "}");
        graphImporter.applyPositions(graph);
        st.endBody = dumpBody(layout);
        st.stops.add("{\"step\": \"" + S_END + "\", \"iterations\": null, " + st.endBody + "}");
    }

    /** The provider's first block: an underlying layout algorithm, when set and known. */
    static void underlying(ElkNode layout, Step st, IProperty<String> option) {
        if (!layout.hasProperty(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM)) {
            return;
        }
        String requested = layout.getProperty(option);
        LayoutAlgorithmData lad = LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(requested);
        boolean applied = lad != null;
        if (applied) {
            AbstractLayoutProvider layoutProvider = lad.getInstancePool().fetch();
            BasicProgressMonitor monitor = new BasicProgressMonitor();
            monitor.begin("underlying", 1);
            layoutProvider.layout(layout, monitor.subTask(1));
        }
        st.stops.add("{\"step\": \"" + S_UNDERLYING + "\", \"requested\": " + q(requested) + ", \"applied\": " + applied
                + (applied ? ", " + dumpBody(layout) : "") + "}");
    }

    /** Vertices whose originalVertex is not the child's centre: the shiftUntilUnique loop of the import shifted them. Compared by
     * Double.doubleToLongBits, so a NaN equals a NaN whichever its sign bit (issue #72). */
    static int jitterCount(ElkNode layout, Graph graph) {
        int count = 0;
        for (int i = 0; i < graph.vertices.size(); i++) {
            ElkNode c = layout.getChildren().get(i);
            double cx = c.getX() + c.getWidth() / 2, cy = c.getY() + c.getHeight() / 2;
            KVector v = graph.vertices.get(i).originalVertex;
            if (Double.doubleToLongBits(cx) != Double.doubleToLongBits(v.x)
                    || Double.doubleToLongBits(cy) != Double.doubleToLongBits(v.y)) {
                count++;
            }
        }
        return count;
    }

    static String importStop(ElkNode layout, Graph graph, boolean overlap) {
        Idx idx = new Idx(graph);
        StringBuilder sb = new StringBuilder("{\"step\": \"" + S_IMPORT + "\"");
        sb.append(", \"rootSelection\": ").append(q(layout.getProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION).name()));
        sb.append(", \"preferredRoot\": ").append(q(layout.getProperty(SporeCompactionOptions.PROCESSING_ORDER_PREFERRED_ROOT)));
        sb.append(", \"costFunction\": ")
                .append(q(layout.getProperty(SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION).name()));
        sb.append(", \"treeConstruction\": ").append(q(graph.treeConstructionStrategy.name()));
        sb.append(", \"compactionStrategy\": ").append(q(graph.compactionStrategy.name()));
        sb.append(", \"orthogonal\": ").append(graph.orthogonalCompaction);
        sb.append(", \"spacingNodeNode\": ").append(hex(layout.getProperty(SporeCompactionOptions.SPACING_NODE_NODE)));
        sb.append(", \"maxIterations\": ").append(overlap ? layout.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS)
                : "null");
        sb.append(", \"runScanline\": ").append(overlap ? layout.getProperty(SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE)
                : "null");
        sb.append(", \"jitterNodes\": ").append(jitterCount(layout, graph));
        sb.append(", \"root\": ").append(graph.preferredRoot == null ? "null" : String.valueOf(idx.n(graph.preferredRoot)));
        List<String> nodes = new ArrayList<>();
        for (int i = 0; i < graph.vertices.size(); i++) {
            Node n = graph.vertices.get(i);
            ElkNode c = layout.getChildren().get(i);
            nodes.add("{\"id\": " + q(id(c)) + ", \"v\": " + point(n.originalVertex) + ", \"r\": " + box4(n.rect) + ", \"m\": "
                    + margin(c.getProperty(CoreOptions.MARGINS)) + "}");
        }
        return sb.append(", \"nodes\": ").append(list(nodes)).append('}').toString();
    }

    static String scanlineStop(Graph graph, int iteration, List<Node[]> calls, Set<TEdge> overlapEdges, HashModel model) {
        Idx idx = new Idx(graph);
        List<String> pairs = new ArrayList<>();
        for (Node[] c : calls) {
            pairs.add("[" + idx.n(c[0]) + ", " + idx.n(c[1]) + "]");
        }
        String actual = idx.pairs(overlapEdges);
        if (!model.treeified && !idx.pairs(model.order()).equals(actual)) {
            throw new Bug("the list-bin model does not reproduce the overlapEdges order after the sweep");
        }
        return "{\"step\": \"" + S_SCANLINE + "\", \"iteration\": " + iteration + ", \"pairs\": " + list(pairs) + ", \"edges\": "
                + actual + ", \"capacity\": " + model.cap + "}";
    }

    static String updateStop(Graph graph, ElkGraphImporter importer, int iteration) {
        List<String> v = new ArrayList<>();
        for (Node n : graph.vertices) {
            v.add(point(n.originalVertex));
        }
        Map<?, ?> nodeMap = getField(importer, ElkGraphImporter.class, "nodeMap");
        return "{\"step\": \"" + S_UPDATE + "\", \"iteration\": " + iteration + ", \"vertices\": " + list(v) + ", \"mapSize\": "
                + nodeMap.size() + "}";
    }

    /** P1 (Delaunay), P2 (graph.treeConstructionStrategy) and the given P3, with the minst capture in between. */
    static void phases(Graph graph, Step st, int iteration, HashModel model, ILayoutPhase<SPOrEPhases, Graph> p3) {
        Idx idx = new Idx(graph);
        List<KVector> vertices = new ArrayList<>();
        graph.vertices.forEach(v -> vertices.add(v.originalVertex));
        Set<TEdge> delaunay = BowyerWatsonTriangulation.triangulate(vertices, null);
        boolean scanline = model != null;
        StructureExtractionStrategy.DELAUNAY_TRIANGULATION.create().process(graph, new BasicProgressMonitor());
        String edges = idx.pairs(graph.tEdges);
        HashInfo delaunayInfo = HashInfo.classify(delaunay);
        HashInfo info;
        if (scanline) {
            for (TEdge e : delaunay) {
                model.add(e);
            }
            if (!model.treeified && !idx.pairs(model.order()).equals(edges)) {
                throw new Bug("the list-bin model does not reproduce the overlapEdges order after addAll");
            }
            info = model.info(graph.tEdges, delaunayInfo.treeified);
        } else {
            if (!idx.pairs(delaunay).equals(edges)) {
                throw new Bug("two triangulations of the same vertices iterate differently");
            }
            info = delaunayInfo;
        }
        st.stops.add("{\"step\": \"" + S_TRIANGULATION + "\", \"iteration\": " + iteration + ", \"scanline\": " + scanline
                + ", \"delaunay\": " + idx.pairs(delaunay) + ", \"edges\": " + edges + ", \"hash\": " + info.json() + "}");

        // the root and cost function the P2 phase hands to NaiveMinST (MinSTPhase.process / MaxSTPhase.process)
        boolean min = graph.treeConstructionStrategy == TreeConstructionStrategy.MINIMUM_SPANNING_TREE;
        Node rootNode = graph.preferredRoot != null ? graph.preferredRoot : graph.vertices.get(0);
        KVector root = min ? rootNode.originalVertex : rootNode.vertex;
        ICostFunction cost = min ? graph.costFunction : e -> -graph.costFunction.cost(e);
        int rootIdx = idx.n(rootNode);
        List<TEdge> order = new ArrayList<>(graph.tEdges);
        List<String> weights = new ArrayList<>();
        for (TEdge e : order) {
            weights.add(hex(cost.cost(e)));
        }
        String fwd = idx.vTree(NaiveMinST.createSpanningTree(graph.tEdges, root, cost), rootIdx);
        List<TEdge> reversed = new ArrayList<>(order);
        Collections.reverse(reversed);
        String rev = idx.vTree(NaiveMinST.createSpanningTree(new LinkedHashSet<>(reversed), root, cost), rootIdx);

        graph.treeConstructionStrategy.create().process(graph, new BasicProgressMonitor());
        String tree = idx.nTree(graph.tree);
        if (!tree.equals(fwd)) {
            throw new Bug("the P2 tree differs from NaiveMinST on the same edges: " + tree + " vs " + fwd);
        }
        st.stops.add("{\"step\": \"" + S_TREE + "\", \"iteration\": " + iteration + ", \"strategy\": "
                + q(graph.treeConstructionStrategy.name()) + ", \"root\": " + rootIdx + ", \"weights\": " + list(weights) + ", \"tree\": "
                + tree + "}");
        st.minst.add(minst(graph, idx, iteration, scanline, rootIdx, root, order, weights, tree, rev, info));

        if (p3 == null) {
            return;
        }
        p3.process(graph, new BasicProgressMonitor());
        if (p3 instanceof org.eclipse.elk.alg.spore.p3execution.GrowTreePhase) {
            st.stops.add("{\"step\": \"" + S_GROW + "\", \"iteration\": " + iteration + ", \"overlapsExisted\": "
                    + graph.getProperty(InternalProperties.OVERLAPS_EXISTED) + ", \"nodes\": " + idx.nodes() + "}");
        }
    }

    static Minst minst(Graph graph, Idx idx, int iteration, boolean scanline, int rootIdx, KVector root, List<TEdge> order,
            List<String> weights, String tree, String rev, HashInfo info) {
        List<String> vertices = new ArrayList<>();
        for (Node n : graph.vertices) {
            vertices.add(point(n.originalVertex));
        }
        List<String> edges = new ArrayList<>();
        for (TEdge e : order) {
            edges.add("[" + point(e.u) + ", " + point(e.v) + "]");
        }
        boolean orderSensitive = !tree.equals(rev);
        String json = "\"iteration\": " + iteration + ", \"scanline\": " + scanline + ", \"strategy\": "
                + q(graph.treeConstructionStrategy.name()) + ", \"rootIndex\": " + rootIdx + ", \"root\": " + point(root)
                + ", \"vertices\": " + list(vertices) + ", \"pairs\": " + idx.pairs(order) + ", \"edges\": " + list(edges)
                + ", \"weights\": " + list(weights) + ", \"tree\": " + tree + ", \"reversedTree\": " + rev + ", \"orderSensitive\": "
                + orderSensitive + ", \"treeified\": " + info.treeified + ", \"hash\": " + info.json();
        return new Minst(iteration, scanline, json, orderSensitive, info.treeified);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Hash bins (PK5; observed JDK rules as documented in src/java/util/JavaHashMap.ts, no JDK source)

    static int spread(int h) {
        return h ^ (h >>> 16);
    }

    record HashInfo(int capacity, int maxBin, int maxEqualHash, boolean treeified) {
        String json() {
            return "{\"capacity\": " + capacity + ", \"maxBin\": " + maxBin + ", \"maxEqualHash\": " + maxEqualHash + ", \"treeified\": "
                    + treeified + "}";
        }

        /** A set whose insertion history is unknown: the smallest capacity consistent with its iteration order bounds every bin. */
        static HashInfo classify(Set<TEdge> set) {
            List<Integer> hs = new ArrayList<>();
            for (TEdge e : set) {
                hs.add(spread(e.hashCode()));
            }
            int cap = DEFAULT_CAPACITY;
            while (cap * LOAD_FACTOR < hs.size()) {
                cap *= 2;
            }
            while (!monotone(hs, cap)) {
                cap *= 2;
                if (cap > (1 << 30)) {
                    throw new Bug("no capacity orders the set's iteration by bin index");
                }
            }
            int maxBin = maxBin(hs, cap);
            return new HashInfo(cap, maxBin, maxEqual(set), maxBin > TREEIFY_THRESHOLD && cap >= MIN_TREEIFY_CAPACITY);
        }

        static boolean monotone(List<Integer> hs, int cap) {
            for (int i = 1; i < hs.size(); i++) {
                if ((hs.get(i) & (cap - 1)) < (hs.get(i - 1) & (cap - 1))) {
                    return false;
                }
            }
            return true;
        }

        static int maxBin(List<Integer> hs, int cap) {
            Map<Integer, Integer> bins = new HashMap<>();
            int max = 0;
            for (int h : hs) {
                max = Math.max(max, bins.merge(h & (cap - 1), 1, Integer::sum));
            }
            return max;
        }

        static int maxEqual(Collection<TEdge> set) {
            Map<Integer, Integer> counts = new HashMap<>();
            int max = 0;
            for (TEdge e : set) {
                max = Math.max(max, counts.merge(e.hashCode(), 1, Integer::sum));
            }
            return max;
        }
    }

    /** A list-bin replay of one HashSet<TEdge> (Sets.newHashSet()): adds, clear (keeps capacity), iteration order. */
    static final class HashModel {
        final List<TEdge> entries = new ArrayList<>();
        int cap = DEFAULT_CAPACITY, threshold = (int) (DEFAULT_CAPACITY * (float) LOAD_FACTOR), maxBin;
        boolean treeified;

        void clear() {
            entries.clear();
            treeified = false;
            maxBin = 0;
        }

        void add(TEdge e) {
            for (TEdge x : entries) {
                if (x.equals(e)) {
                    return;
                }
            }
            entries.add(e);
            int h = spread(e.hashCode());
            int count = 0;
            for (TEdge x : entries) {
                if ((spread(x.hashCode()) & (cap - 1)) == (h & (cap - 1))) {
                    count++;
                }
            }
            maxBin = Math.max(maxBin, count);
            if (count > TREEIFY_THRESHOLD) {
                if (cap < MIN_TREEIFY_CAPACITY) {
                    resize();
                } else {
                    treeified = true;
                }
            }
            if (entries.size() > threshold) {
                resize();
            }
        }

        void resize() {
            cap *= 2;
            threshold *= 2;
        }

        List<TEdge> order() {
            List<TEdge> l = new ArrayList<>(entries);
            l.sort(Comparator.comparingInt(e -> spread(e.hashCode()) & (cap - 1)));
            return l;
        }

        HashInfo info(Set<TEdge> set, boolean delaunayTreeified) {
            return new HashInfo(cap, maxBin, HashInfo.maxEqual(set), treeified || delaunayTreeified);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Jitter rows (PK4)

    static Row jitterRow(String id, String alg, String input, Supplier<ElkNode> prep, int jitterNodes) throws Exception {
        List<String> dumps = new ArrayList<>();
        Boolean overlapFree = null;
        double maxDisp = 0;
        int nodeCount = -1;
        for (int k = 0; k < JITTER_RUNS; k++) {
            ElkNode root = k % 2 == 0 ? load(input) : prep.get();
            List<double[]> before = new ArrayList<>();
            for (ElkNode c : root.getChildren()) {
                before.add(new double[] {c.getX(), c.getY()});
            }
            Outcome o = timed(id, ROW_TIMEOUT_SECONDS, () -> engine(root));
            if (o.threw) {
                throw new Bug("jitter row " + id + " threw: " + o.body);
            }
            dumps.add(o.body);
            nodeCount = root.getChildren().size();
            for (int i = 0; i < nodeCount; i++) {
                ElkNode c = root.getChildren().get(i);
                maxDisp = Math.max(maxDisp, Math.hypot(c.getX() - before.get(i)[0], c.getY() - before.get(i)[1]));
            }
            if (alg.equals(OVERLAP)) {
                boolean free = overlapFree(root);
                if (overlapFree != null && overlapFree != free) {
                    throw new Bug("jitter row " + id + ": overlapFree differs between runs");
                }
                overlapFree = free;
            }
        }
        double bound = displacementBound(prep.get());
        if (maxDisp > bound) {
            throw new Bug("jitter row " + id + ": a child moved " + maxDisp + ", beyond the bound " + bound);
        }
        boolean agree = dumps.stream().distinct().count() == 1;
        String expected = "{\"algorithm\": " + q(alg) + ", \"invariants\": {\"nodeCount\": " + nodeCount + ", \"jitterNodes\": "
                + jitterNodes + ", \"overlapFree\": " + overlapFree + ", \"maxDisplacementBound\": " + hex(bound) + ", \"runs\": "
                + JITTER_RUNS + ", \"runsAgree\": " + agree + "}}";
        return new Row(id, JITTER, rowJson(id, JITTER, input, expected), alg, false, false);
    }

    /** DISPLACEMENT_FACTOR * the sum over children (child order) of width + height, plus the children's bounding box width + height. */
    static double displacementBound(ElkNode root) {
        double sum = 0, minX = Double.POSITIVE_INFINITY, minY = Double.POSITIVE_INFINITY, maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;
        for (ElkNode c : root.getChildren()) {
            sum += c.getWidth() + c.getHeight();
            minX = Math.min(minX, c.getX());
            minY = Math.min(minY, c.getY());
            maxX = Math.max(maxX, c.getX() + c.getWidth());
            maxY = Math.max(maxY, c.getY() + c.getHeight());
        }
        return DISPLACEMENT_FACTOR * sum + (maxX - minX) + (maxY - minY);
    }

    static boolean overlapFree(ElkNode root) {
        List<ElkNode> cs = root.getChildren();
        for (int i = 0; i < cs.size(); i++) {
            for (int j = i + 1; j < cs.size(); j++) {
                ElkNode a = cs.get(i), b = cs.get(j);
                double ox = Math.min(a.getX() + a.getWidth(), b.getX() + b.getWidth()) - Math.max(a.getX(), b.getX());
                double oy = Math.min(a.getY() + a.getHeight(), b.getY() + b.getHeight()) - Math.max(a.getY(), b.getY());
                if (ox > OVERLAP_EPS && oy > OVERLAP_EPS) {
                    return false;
                }
            }
        }
        return true;
    }

    // ------------------------------------------------------------------------------------------------------------
    // ELK dump

    static String dumpBody(ElkNode top) {
        Dump d = new Dump();
        d.run(top);
        return "\"graph\": " + d.graph + ", \"nodes\": " + list(d.nodes) + ", \"ports\": " + list(d.ports) + ", \"labels\": "
                + list(d.labels) + ", \"edges\": " + list(d.edges);
    }

    static final class Dump {
        String graph;
        final List<String> nodes = new ArrayList<>(), ports = new ArrayList<>(), labels = new ArrayList<>(), edges = new ArrayList<>();
        final Set<String> seen = new HashSet<>();

        void run(ElkNode top) {
            graph = box(unique(id(top)), top.getX(), top.getY(), top.getWidth(), top.getHeight());
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
                edges.add(sb.append("]}").toString());
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

    static String box4(ElkRectangle r) {
        return "[" + hex(r.x) + ", " + hex(r.y) + ", " + hex(r.width) + ", " + hex(r.height) + "]";
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

    static String list(Collection<String> items) {
        return "[" + String.join(", ", items) + "]";
    }

    // ------------------------------------------------------------------------------------------------------------
    // Coverage and requirements

    static final Map<String, Map<String, int[]>> COVERAGE = new TreeMap<>();

    static void countCoverage(String group, String alg, ElkNode g) {
        String a = algShort(alg) + ":";
        cover(a + "underlyingLayoutAlgorithm", g.hasProperty(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM)
                ? g.getProperty(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM) : "default", group);
        cover(a + "padding", g.hasProperty(CoreOptions.PADDING) ? "explicit" : "default", group);
        cover(a + "spacing.nodeNode", valueOf(g, SporeCompactionOptions.SPACING_NODE_NODE), group);
        cover(a + "structure.structureExtractionStrategy", valueOf(g, SporeCompactionOptions.STRUCTURE_STRUCTURE_EXTRACTION_STRATEGY),
                group);
        cover(a + "debugMode", valueOf(g, CoreOptions.DEBUG_MODE), group);
        boolean margins = false, decorated = false;
        for (ElkNode c : g.getChildren()) {
            margins |= c.hasProperty(CoreOptions.MARGINS);
            decorated |= !c.getLabels().isEmpty() || !c.getPorts().isEmpty();
        }
        cover(a + "margins", margins ? "explicit" : "default", group);
        cover(a + "nodeDecorations", decorated ? "labels/ports" : "none", group);
        if (alg.equals(OVERLAP)) {
            cover(a + "overlapRemoval.maxIterations", valueOf(g, SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS), group);
            cover(a + "overlapRemoval.runScanline", valueOf(g, SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE), group);
            return;
        }
        cover(a + "processingOrder.treeConstruction", valueOf(g, SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION), group);
        cover(a + "processingOrder.spanningTreeCostFunction",
                valueOf(g, SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION), group);
        cover(a + "processingOrder.preferredRoot", g.hasProperty(SporeCompactionOptions.PROCESSING_ORDER_PREFERRED_ROOT)
                ? "set" : "default", group);
        cover(a + "processingOrder.rootSelection", valueOf(g, SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION), group);
        cover(a + "compaction.compactionStrategy", valueOf(g, SporeCompactionOptions.COMPACTION_COMPACTION_STRATEGY), group);
        cover(a + "compaction.orthogonal", valueOf(g, SporeCompactionOptions.COMPACTION_ORTHOGONAL), group);
    }

    static String valueOf(ElkNode g, IProperty<?> p) {
        return g.hasProperty(p) ? String.valueOf(g.getProperty(p)) : "default";
    }

    static void cover(String option, String value, String group) {
        int[] c = COVERAGE.computeIfAbsent(option, k -> new TreeMap<>()).computeIfAbsent(value, k -> new int[GROUPS.size()]);
        c[GROUPS.indexOf(group)]++;
    }

    static String coverageJson() {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Map<String, int[]>> e : COVERAGE.entrySet()) {
            sb.append(i++ == 0 ? "" : ", ").append(q(e.getKey())).append(": {");
            int j = 0;
            for (Map.Entry<String, int[]> v : e.getValue().entrySet()) {
                sb.append(j++ == 0 ? "" : ", ").append(q(v.getKey())).append(": {");
                for (int g = 0; g < GROUPS.size(); g++) {
                    sb.append(g == 0 ? "" : ", ").append(q(GROUPS.get(g))).append(": ").append(v.getValue()[g]);
                }
                sb.append('}');
            }
            sb.append('}');
        }
        return sb.append('}').toString();
    }

    /** PK2 values every algorithm must exercise in a full row ("<alg>:<option>=<value>"). */
    static final List<String> REQUIRED_FULL = List.of(
            "overlap:underlyingLayoutAlgorithm=default", "overlap:underlyingLayoutAlgorithm=force",
            "overlap:underlyingLayoutAlgorithm=layered", "overlap:padding=explicit", "overlap:spacing.nodeNode=20.0",
            "overlap:structure.structureExtractionStrategy=DELAUNAY_TRIANGULATION", "overlap:debugMode=true",
            "overlap:overlapRemoval.maxIterations=1", "overlap:overlapRemoval.runScanline=false",
            "overlap:overlapRemoval.runScanline=true", "overlap:margins=explicit", "overlap:nodeDecorations=labels/ports",
            "compaction:underlyingLayoutAlgorithm=default", "compaction:underlyingLayoutAlgorithm=force",
            "compaction:underlyingLayoutAlgorithm=layered", "compaction:padding=explicit", "compaction:spacing.nodeNode=20.0",
            "compaction:structure.structureExtractionStrategy=DELAUNAY_TRIANGULATION", "compaction:debugMode=true",
            "compaction:margins=explicit", "compaction:nodeDecorations=labels/ports",
            "compaction:processingOrder.treeConstruction=MINIMUM_SPANNING_TREE",
            "compaction:processingOrder.treeConstruction=MAXIMUM_SPANNING_TREE",
            "compaction:processingOrder.spanningTreeCostFunction=CENTER_DISTANCE",
            "compaction:processingOrder.spanningTreeCostFunction=CIRCLE_UNDERLAP",
            "compaction:processingOrder.spanningTreeCostFunction=RECTANGLE_UNDERLAP",
            "compaction:processingOrder.spanningTreeCostFunction=INVERTED_OVERLAP",
            "compaction:processingOrder.spanningTreeCostFunction=MINIMUM_ROOT_DISTANCE",
            "compaction:processingOrder.preferredRoot=set", "compaction:processingOrder.rootSelection=FIXED",
            "compaction:processingOrder.rootSelection=CENTER_NODE", "compaction:compaction.compactionStrategy=DEPTH_FIRST",
            "compaction:compaction.orthogonal=true", "compaction:compaction.orthogonal=false");

    static void checkRequirements(List<Row> rows) {
        for (String req : REQUIRED_FULL) {
            String option = req.substring(0, req.indexOf('=')), value = req.substring(req.indexOf('=') + 1);
            int[] c = COVERAGE.getOrDefault(option, Map.of()).get(value);
            if (c == null || c[GROUPS.indexOf(FULL)] == 0) {
                throw new Bug("no full row exercises " + req);
            }
        }
        long os = rows.stream().filter(r -> r.group.equals(MINST) && r.orderSensitive).count();
        long osOverlapScan = rows.stream().filter(r -> r.group.equals(MINST) && r.orderSensitive && r.alg.equals(OVERLAP)
                && r.json.contains("\"scanline\": true") && !r.id.endsWith("/i0")).count();
        long osCompaction = rows.stream().filter(r -> r.group.equals(MINST) && r.orderSensitive && r.alg.equals(COMPACTION)).count();
        if (os < 10 || osOverlapScan == 0 || osCompaction == 0) {
            throw new Bug("minst: " + os + " orderSensitive rows (" + osOverlapScan + " overlap scanline at iteration >= 1, "
                    + osCompaction + " compaction); need >= 10 covering both algorithms and the scanline path");
        }
    }

    static String tieSummary(List<Row> rows) {
        StringBuilder sb = new StringBuilder("{");
        int i = 0;
        for (String g : GROUPS) {
            for (String alg : List.of(OVERLAP, COMPACTION)) {
                List<Row> rs = rows.stream().filter(r -> r.group.equals(g) && r.alg.equals(alg)).toList();
                sb.append(i++ == 0 ? "" : ", ").append(q(g + "/" + algShort(alg))).append(": {\"rows\": ").append(rs.size())
                        .append(", \"orderSensitive\": ").append(rs.stream().filter(Row::orderSensitive).count())
                        .append(", \"treeified\": ").append(rs.stream().filter(Row::treeified).count()).append('}');
            }
        }
        return sb.append('}').toString();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Factors (one at a time, PK2) applied to the root

    static Factor set(String id, IProperty<?> p, Object v) {
        @SuppressWarnings("unchecked")
        IProperty<Object> po = (IProperty<Object>) p;
        return new Factor(id, g -> g.setProperty(po, v));
    }

    static Factor both(String id, Factor a, Factor b) {
        return new Factor(id, g -> {
            a.apply.accept(g);
            b.apply.accept(g);
        });
    }

    static final Factor DEFAULT = new Factor("default", g -> { });
    static final List<Factor> DEFAULT_ONLY = List.of(DEFAULT);

    static List<Factor> sharedFactors(IProperty<String> underlying, IProperty<ElkPadding> padding, IProperty<Double> spacing,
            IProperty<StructureExtractionStrategy> structure, IProperty<Boolean> debug) {
        List<Factor> f = new ArrayList<>();
        f.add(DEFAULT);
        f.add(set("underlyingForce", underlying, "force"));
        f.add(set("underlyingLayered", underlying, "layered"));
        f.add(set("underlyingFullId", underlying, LayeredOptions.ALGORITHM_ID));
        f.add(set("underlyingUnknown", underlying, "org.example.none"));
        f.add(new Factor("padding", g -> g.setProperty(padding, new ElkPadding(3, 7, 11, 19))));
        f.add(set("spacing0", spacing, 0.0));
        f.add(set("spacing20", spacing, 20.0));
        f.add(set("structureDelaunay", structure, StructureExtractionStrategy.DELAUNAY_TRIANGULATION));
        f.add(set("debug", debug, true));
        f.add(new Factor("margins", g -> g.getChildren().forEach(c -> c.setProperty(CoreOptions.MARGINS, new ElkMargin(5, 6, 7, 8)))));
        return f;
    }

    static List<Factor> overlapFactors() {
        List<Factor> f = sharedFactors(SporeOverlapRemovalOptions.UNDERLYING_LAYOUT_ALGORITHM, SporeOverlapRemovalOptions.PADDING,
                SporeOverlapRemovalOptions.SPACING_NODE_NODE, SporeOverlapRemovalOptions.STRUCTURE_STRUCTURE_EXTRACTION_STRATEGY,
                SporeOverlapRemovalOptions.DEBUG_MODE);
        f.add(set("maxIter0", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS, 0));
        f.add(set("maxIter1", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS, 1));
        f.add(set("maxIter3", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS, 3));
        f.add(set("scanlineOff", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE, false));
        f.add(set("scanlineOn", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE, true));
        // options sporeOverlap does not support: the provider overwrites three of them, the importer reads the other two
        f.add(new Factor("compactionOptionsIgnored", g -> {
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION, SpanningTreeCostFunction.CENTER_DISTANCE);
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION, RootSelection.FIXED);
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION, TreeConstructionStrategy.MAXIMUM_SPANNING_TREE);
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_PREFERRED_ROOT, "n1");
            g.setProperty(SporeCompactionOptions.COMPACTION_ORTHOGONAL, true);
        }));
        f.add(both("scanlineOffMaxIter3", set("", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE, false),
                set("", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_MAX_ITERATIONS, 3)));
        return f;
    }

    static List<Factor> compactionFactors() {
        List<Factor> f = sharedFactors(SporeCompactionOptions.UNDERLYING_LAYOUT_ALGORITHM, SporeCompactionOptions.PADDING,
                SporeCompactionOptions.SPACING_NODE_NODE, SporeCompactionOptions.STRUCTURE_STRUCTURE_EXTRACTION_STRATEGY,
                SporeCompactionOptions.DEBUG_MODE);
        IProperty<TreeConstructionStrategy> tree = SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION;
        IProperty<SpanningTreeCostFunction> cost = SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION;
        IProperty<RootSelection> rootSel = SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION;
        IProperty<String> preferred = SporeCompactionOptions.PROCESSING_ORDER_PREFERRED_ROOT;
        f.add(set("treeMin", tree, TreeConstructionStrategy.MINIMUM_SPANNING_TREE));
        f.add(set("treeMax", tree, TreeConstructionStrategy.MAXIMUM_SPANNING_TREE));
        for (SpanningTreeCostFunction c : SpanningTreeCostFunction.values()) {
            f.add(set("cost" + c.name(), cost, c));
        }
        f.add(set("rootFixed", rootSel, RootSelection.FIXED));
        f.add(both("rootFixedPreferred", set("", rootSel, RootSelection.FIXED), set("", preferred, "n3")));
        f.add(both("rootFixedUnknown", set("", rootSel, RootSelection.FIXED), set("", preferred, "nope")));
        f.add(set("rootCenter", rootSel, RootSelection.CENTER_NODE));
        f.add(set("preferredIgnored", preferred, "n3"));
        f.add(set("compactionDepthFirst", SporeCompactionOptions.COMPACTION_COMPACTION_STRATEGY, CompactionStrategy.DEPTH_FIRST));
        f.add(set("orthogonal", SporeCompactionOptions.COMPACTION_ORTHOGONAL, true));
        f.add(set("orthogonalFalse", SporeCompactionOptions.COMPACTION_ORTHOGONAL, false));
        f.add(both("treeMaxCenterDistance", set("", tree, TreeConstructionStrategy.MAXIMUM_SPANNING_TREE),
                set("", cost, SpanningTreeCostFunction.CENTER_DISTANCE)));
        f.add(both("treeMaxMinRootDistance", set("", tree, TreeConstructionStrategy.MAXIMUM_SPANNING_TREE),
                set("", cost, SpanningTreeCostFunction.MINIMUM_ROOT_DISTANCE)));
        f.add(both("treeMaxOrthogonal", set("", tree, TreeConstructionStrategy.MAXIMUM_SPANNING_TREE),
                set("", SporeCompactionOptions.COMPACTION_ORTHOGONAL, true)));
        f.add(both("orthogonalRectangleUnderlap", set("", SporeCompactionOptions.COMPACTION_ORTHOGONAL, true),
                set("", cost, SpanningTreeCostFunction.RECTANGLE_UNDERLAP)));
        f.add(new Factor("rootFixedPreferredMinRootDistance", g -> {
            g.setProperty(rootSel, RootSelection.FIXED);
            g.setProperty(preferred, "n3");
            g.setProperty(cost, SpanningTreeCostFunction.MINIMUM_ROOT_DISTANCE);
        }));
        return f;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Scenarios

    static List<Spec> fullSpecs() {
        List<Spec> l = new ArrayList<>();
        List<Factor> ov = overlapFactors(), co = compactionFactors();
        l.add(new Spec("deco10", OVERLAP, () -> rand(101, 10, 90, true, 8), true, ov));
        l.add(new Spec("plain14", OVERLAP, () -> rand(102, 14, 120, false, 10), false, ov));
        l.add(new Spec("grid4", OVERLAP, () -> centred(grid(4, 4, 20, 30, 30, 10, 10)), true, DEFAULT_ONLY));
        l.add(new Spec("sparse8", OVERLAP, () -> rand(103, 8, 600, false, 6), true,
                List.of(DEFAULT, set("scanlineOff", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE, false))));
        l.add(new Spec("deco10", COMPACTION, () -> rand(101, 10, 90, true, 8), true, co));
        l.add(new Spec("sparse12", COMPACTION, () -> rand(104, 12, 700, false, 10), false, co));
        l.add(new Spec("grid4", COMPACTION, () -> centred(grid(4, 4, 60, 30, 30, 10, 10)), true, DEFAULT_ONLY));
        l.add(new Spec("overlapping14", COMPACTION, () -> rand(102, 14, 120, false, 10), true, DEFAULT_ONLY));
        for (String alg : List.of(OVERLAP, COMPACTION)) {
            l.add(new Spec("empty0", alg, SporeLayoutVectors::newRoot, false, DEFAULT_ONLY));
            l.add(new Spec("single1", alg, () -> single(), true, alg.equals(OVERLAP) ? List.of(DEFAULT,
                    set("scanlineOff", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE, false)) : DEFAULT_ONLY));
            l.add(new Spec("pair2", alg, () -> pair(), true, DEFAULT_ONLY));
            l.add(new Spec("chain" + CHAIN_NODES, alg, () -> chain(CHAIN_NODES, alg), false, DEFAULT_ONLY, alg.equals(COMPACTION)));
        }
        // MaxSTPhase.java:44-46 (mission 8c, T14b): the MAXIMUM_SPANNING_TREE root is vertices.get(0) when the FIXED preferred root names no
        // child (Graph.preferredRoot stays null); appended last so that the earlier rows, the seeds and their order do not change
        l.add(new Spec("maxRootUnknown", COMPACTION, () -> rand(105, 6, 300, false, 4), true, List.of(new Factor("treeMaxRootFixedUnknown", g -> {
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION, TreeConstructionStrategy.MAXIMUM_SPANNING_TREE);
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION, RootSelection.FIXED);
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_PREFERRED_ROOT, "nope");
        }))));
        // ElkGraphImporter.java:242-249 (eclipse-elk/elk#1244): overlap removal moves two nodes onto one rect centre, and updateGraph shifts
        // the second with shiftUntilUnique. Until e7eaea57 the scanline TreeSet rejected the second node of the pair in the next iteration
        // ("Invalid hitboxes for scanline overlap calculation."), and this scenario was the row throws/overlap/scanlineHitboxes (found by a
        // random search over small overlapping graphs). Re-planned as a full row with its stops; appended last so that the earlier rows, the
        // seeds and their order do not change
        l.add(new Spec("scanlineHitboxes", OVERLAP, SporeLayoutVectors::hitboxes, true, DEFAULT_ONLY));
        return l;
    }

    static List<Spec> throwsSpecs() {
        List<Spec> l = new ArrayList<>();
        for (String alg : List.of(OVERLAP, COMPACTION)) {
            l.add(new Spec("hyperedge", alg, SporeLayoutVectors::hyperedge, false, DEFAULT_ONLY));
        }
        // FIXED root with an id no child has: Graph.preferredRoot stays null and the MINIMUM_ROOT_DISTANCE cost dereferences it
        l.add(new Spec("minRootDistanceNoRoot", COMPACTION, () -> rand(105, 6, 300, false, 4), false, List.of(new Factor("", g -> {
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_ROOT_SELECTION, RootSelection.FIXED);
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_PREFERRED_ROOT, "nope");
            g.setProperty(SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION,
                    SpanningTreeCostFunction.MINIMUM_ROOT_DISTANCE);
        }))));
        return l;
    }

    static List<Spec> minstSpecs() {
        List<Spec> l = new ArrayList<>();
        List<Factor> co = new ArrayList<>();
        for (TreeConstructionStrategy t : TreeConstructionStrategy.values()) {
            for (SpanningTreeCostFunction c : SpanningTreeCostFunction.values()) {
                co.add(both(c.name() + "-" + t.name().substring(0, 3),
                        set("", SporeCompactionOptions.PROCESSING_ORDER_TREE_CONSTRUCTION, t),
                        set("", SporeCompactionOptions.PROCESSING_ORDER_SPANNING_TREE_COST_FUNCTION, c)));
            }
        }
        l.add(new Spec("gridC3", COMPACTION, () -> centred(grid(3, 3, 60, 30, 30, 10, 10)), false, co));
        l.add(new Spec("gridC4", COMPACTION, () -> centred(grid(4, 4, 50, 20, 20, 0, 0)), false, co));
        l.add(new Spec("polyC6", COMPACTION, () -> centred(polygon(6, 100, 20, true)), false, co));
        l.add(new Spec("polyC8", COMPACTION, () -> centred(polygon(8, 100, 20, true)), false, co));
        l.add(new Spec("polyC12", COMPACTION, () -> centred(polygon(12, 120, 16, true)), false, co));
        l.add(new Spec("randC9", COMPACTION, () -> rand(106, 9, 500, false, 0), false, co));
        List<Factor> ov = List.of(DEFAULT, set("scanlineOff", SporeOverlapRemovalOptions.OVERLAP_REMOVAL_RUN_SCANLINE, false));
        l.add(new Spec("gridO3", OVERLAP, () -> centred(grid(3, 3, 20, 30, 30, 10, 10)), false, ov));
        l.add(new Spec("gridO4", OVERLAP, () -> centred(grid(4, 4, 20, 30, 30, 10, 10)), false, ov));
        l.add(new Spec("gridO5", OVERLAP, () -> centred(grid(5, 5, 24, 30, 30, 0, 0)), false, ov));
        l.add(new Spec("polyO6", OVERLAP, () -> centred(polygon(6, 25, 30, true)), false, ov));
        l.add(new Spec("polyO8", OVERLAP, () -> centred(polygon(8, 30, 30, true)), false, ov));
        l.add(new Spec("randO12", OVERLAP, () -> rand(107, 12, 80, false, 0), false, ov));
        // shapes whose scanline path runs many iterations (the full rows' deco10 and plain14 shapes)
        l.add(new Spec("deco10", OVERLAP, () -> rand(101, 10, 90, true, 8), false, DEFAULT_ONLY));
        l.add(new Spec("plain14", OVERLAP, () -> rand(102, 14, 120, false, 10), false, DEFAULT_ONLY));
        l.add(new Spec("randO20", OVERLAP, () -> rand(108, 20, 100, false, 0), false, DEFAULT_ONLY));
        return l;
    }

    static List<Spec> jitterSpecs() {
        List<Spec> l = new ArrayList<>();
        l.add(new Spec("corpus", OVERLAP, () -> loadCorpus(CORPUS_OVERLAP), false, DEFAULT_ONLY));
        l.add(new Spec("corpus", COMPACTION, () -> loadCorpus(CORPUS_COMPACTION), false, DEFAULT_ONLY));
        l.add(new Spec("dup5", OVERLAP, SporeLayoutVectors::dup, false, DEFAULT_ONLY));
        l.add(new Spec("dup5", COMPACTION, SporeLayoutVectors::dup, false, DEFAULT_ONLY));
        return l;
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

    static ElkPort port(ElkNode n, String id, double x, double y, PortSide side) {
        ElkPort p = ElkGraphUtil.createPort(n);
        p.setIdentifier(id);
        p.setLocation(x, y);
        p.setDimensions(8, 8);
        p.setProperty(CoreOptions.PORT_SIDE, side);
        return p;
    }

    /** A simple edge with one section from the source's centre to the target's centre (relative to the root). */
    static ElkEdge edge(String id, ElkConnectableShape s, ElkConnectableShape t) {
        ElkEdge e = ElkGraphUtil.createSimpleEdge(s, t);
        e.setIdentifier(id);
        ElkEdgeSection sec = ElkGraphUtil.createEdgeSection(e);
        sec.setStartLocation(centreX(s), centreY(s));
        sec.setEndLocation(centreX(t), centreY(t));
        return e;
    }

    static double centreX(ElkConnectableShape s) {
        double off = s instanceof ElkPort p ? p.getParent().getX() : 0;
        return off + s.getX() + s.getWidth() / 2;
    }

    static double centreY(ElkConnectableShape s) {
        double off = s instanceof ElkPort p ? p.getParent().getY() : 0;
        return off + s.getY() + s.getHeight() / 2;
    }

    static final double[] WIDTHS = {20, 30, 40, 60};
    static final double[] HEIGHTS = {20, 30, 40};

    /**
     * n nodes at random integer positions in [0, box), sizes from WIDTHS x HEIGHTS, distinct centres; `edges` random node-to-node
     * edges. deco adds an outside label on every third node, an outside east port (with a port label) on nodes 1, 5, 9, ..., an edge
     * from port p1 to n2, a self loop on n0 and a HEAD label on the first edge (all of which give NodeMarginCalculator margins).
     */
    static ElkNode rand(long seed, int n, int box, boolean deco, int edges) {
        Random r = new Random(seed);
        ElkNode root = newRoot();
        Set<String> centres = new HashSet<>();
        List<ElkNode> nodes = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            double w, h, x, y;
            do {
                w = WIDTHS[r.nextInt(WIDTHS.length)];
                h = HEIGHTS[r.nextInt(HEIGHTS.length)];
                x = r.nextInt(box);
                y = r.nextInt(box);
            } while (!centres.add((x + w / 2) + ":" + (y + h / 2)));
            ElkNode c = node(root, "n" + i, x, y, w, h);
            nodes.add(c);
            if (deco && i % 3 == 0) {
                label(c, "l" + i, "L" + i, 0, -15);
            }
            if (deco && i % 4 == 1) {
                ElkPort p = port(c, "p" + i, w, h / 2 - 4, PortSide.EAST);
                label(p, "q" + i, "q", 9, 0);
            }
        }
        for (int k = 0; k < edges; k++) {
            int a = r.nextInt(n), b = r.nextInt(n - 1);
            edge("e" + k, nodes.get(a), nodes.get(b >= a ? b + 1 : b));
        }
        if (deco) {
            ElkEdge headed = root.getContainedEdges().get(0);
            ElkLabel hl = label(headed, "h0", "head", 0, 0);
            hl.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.HEAD);
            edge("ep", nodes.get(1).getPorts().get(0), nodes.get(2));
            edge("es", nodes.get(0), nodes.get(0));
        }
        return root;
    }

    /** cols x rows nodes of w x h at (ox + c * step, oy + r * step), row by row; integer coordinates keep cost ties exact. */
    static ElkNode grid(int cols, int rows, double step, double w, double h, double ox, double oy) {
        ElkNode root = newRoot();
        int i = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                node(root, "n" + i++, ox + c * step, oy + r * step, w, h);
            }
        }
        return root;
    }

    /** k nodes of size x size with centres on a circle of the given radius around (300, 300), plus a centre node when asked. */
    static ElkNode polygon(int k, double radius, double size, boolean centre) {
        ElkNode root = newRoot();
        int i = 0;
        if (centre) {
            node(root, "n" + i++, 300 - size / 2, 300 - size / 2, size, size);
        }
        for (int j = 0; j < k; j++) {
            double a = 2 * Math.PI * j / k;
            node(root, "n" + i++, 300 + radius * Math.cos(a) - size / 2, 300 + radius * Math.sin(a) - size / 2, size, size);
        }
        return root;
    }

    /** Sizes the root so its centre (CENTER_NODE root selection) is the centre of the children's bounding box. */
    static ElkNode centred(ElkNode root) {
        double minX = Double.POSITIVE_INFINITY, minY = Double.POSITIVE_INFINITY, maxX = Double.NEGATIVE_INFINITY;
        double maxY = Double.NEGATIVE_INFINITY;
        for (ElkNode c : root.getChildren()) {
            minX = Math.min(minX, c.getX());
            minY = Math.min(minY, c.getY());
            maxX = Math.max(maxX, c.getX() + c.getWidth());
            maxY = Math.max(maxY, c.getY() + c.getHeight());
        }
        root.setDimensions(minX + maxX, minY + maxY);
        return root;
    }

    static ElkNode single() {
        ElkNode root = newRoot();
        ElkNode a = node(root, "n0", 40, 30, 30, 20);
        label(a, "l0", "only", 0, -15);
        return root;
    }

    static ElkNode pair() {
        ElkNode root = newRoot();
        ElkNode a = node(root, "n0", 10, 10, 40, 30), b = node(root, "n1", 30, 20, 30, 30);
        edge("e0", a, b);
        return root;
    }

    /**
     * PK6: n nodes whose centres lie on the line y = c (Delaunay gives a path; the root nearest the origin is one end). sporeOverlap:
     * 10 x 10 nodes 8 apart (each overlaps its neighbours); sporeCompaction: 200 x 20 nodes 0.0625 apart (all rectangles touch, which
     * keeps DepthFirstCompaction's cubic walk in its cheap branch).
     */
    static ElkNode chain(int n, String alg) {
        ElkNode root = newRoot();
        boolean ov = alg.equals(OVERLAP);
        for (int i = 0; i < n; i++) {
            node(root, "n" + i, ov ? i * 8.0 : i * 0.0625, 0, ov ? 10 : 200, ov ? 10 : 20);
        }
        return root;
    }

    /** Five nodes; n1 and n3 share a centre (different sizes), so the importer's shiftUntilUnique loop shifts n3. */
    static ElkNode dup() {
        ElkNode root = newRoot();
        node(root, "n0", 0, 0, 30, 30);
        node(root, "n1", 50, 40, 40, 20);
        node(root, "n2", 120, 10, 20, 40);
        node(root, "n3", 60, 30, 20, 40);
        node(root, "n4", 20, 90, 30, 30);
        return root;
    }

    /** Three overlapping nodes whose overlap removal moves two rects onto one centre (updateGraph then shifts the second). */
    static ElkNode hitboxes() {
        ElkNode root = newRoot();
        node(root, "n0", 10, 10, 40, 30);
        node(root, "n1", 10, 0, 10, 20);
        node(root, "n2", 20, 5, 10, 30);
        return root;
    }

    /** Two sources: ElkGraphUtil.getSourceNode rejects a non-simple edge in ElkGraphImporter.applyPositions. */
    static ElkNode hyperedge() {
        ElkNode root = newRoot();
        ElkNode a = node(root, "n0", 20, 20, 40, 30), b = node(root, "n1", 120, 20, 40, 30), c = node(root, "n2", 70, 120, 40, 30);
        ElkEdge e = ElkGraphUtil.createHyperedge(List.of(a, b), List.of(c));
        e.setIdentifier("e0");
        ElkEdgeSection sec = ElkGraphUtil.createEdgeSection(e);
        sec.setStartLocation(40, 35);
        sec.setEndLocation(85, 135);
        return root;
    }

    static ElkNode loadCorpus(String file) {
        try {
            return ElkGraphJson.forGraph(Files.readString(REPO.resolve(file), StandardCharsets.UTF_8)).toElk();
        } catch (IOException e) {
            throw new Bug("cannot read " + file + ": " + e);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Export and JSON helpers

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

    /** 16 hex digits of Double.doubleToLongBits (raw bits; a NaN would be the canonical 7ff8000000000000, #72); the guard rejects a NaN. */
    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new IllegalStateException("NaN in a recorded value");
        }
        return "\"" + String.format("%016x", Double.doubleToLongBits(d)) + "\"";
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
