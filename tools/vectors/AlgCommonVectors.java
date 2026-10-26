// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, AC3, P6) for org.eclipse.elk.alg.common: what the packages without
// Java tests do at the pinned ELK commit (Bowyer-Watson + NaiveMinST, polyomino packing, strip overlap removal and the
// spore helpers). The oracle is their only spec. This program only CALLS ELK public APIs and records results; it
// embeds no ELK implementation. Every input is generated here from a fixed seed (java.util.Random) and WRITTEN INTO the
// JSON, so the TypeScript replay never needs a Java Random.
// Run: tools/vectors/alg-common-vectors.sh <outDir>  (java -cp ... AlgCommonVectors.java <outDir> <tools/vectors dir>)
//
// Encoding: every double is 16 lowercase hex digits, Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded
// (JavaVectors.hex convention). A NaN anywhere fails the recording. Ints, booleans and names are plain JSON.
//
// Stability (stop 8): each scenario is run twice on freshly built objects (the second time through the other overloads
// where one exists); the two serialised rows must be identical or the recording fails.
//
// Output <outDir>/alg-common.json (2-space top level, one compact JSON row per scenario line, trailing newline):
//   { jdk, oracle, triangulation: [row...], polyomino: [row...], overlaps: [row...], spore: [row...] }
//
// SECTION triangulation  (BowyerWatsonTriangulation + NaiveMinST; V6-V8)
//   row = { name,
//           vertices: [[x,y]...]            input points in input order (hex doubles); all distinct, none -0.0
//           root: i                         index of the spanning-tree root vertex
//           edges: [[i,j]...]               triangulate(vertices, null) as a Set<TEdge>, in ITERATION order (V7);
//                                           i = index of TEdge.u, j = index of TEdge.v (vertices are referenced by index)
//           trees: { euclidean: T, constant: T }
//                                           NaiveMinST.createSpanningTree(edgeSet, vertices[root], cost) where the
//                                           edge set is the very Set returned by triangulate. T = nested
//                                           [vertexIndex, childT...] in child order (Tree.children order).
//                                           euclidean: cost(e) = e.u.distance(e.v); constant: cost(e) = 1.0 (maximises
//                                           ties, so the HashMap/HashSet iteration order (V8) is observable).
//           orderSensitive: { euclidean: bool, constant: bool }
//                                           true when the same cost over the same edges in REVERSED iteration order
//                                           (a LinkedHashSet) yields a different tree: the tree depends on the order.
//         }
//   A "degenerate" row whose triangulate call throws carries { name, vertices, root, error: "<ExceptionClass>" } and
//   no edges/trees/orderSensitive. Checked-equal inside the recorder: triangulate(v, null) vs triangulate(v);
//   createSpanningTree 3-argument vs 4-argument (null debug file).
//
// SECTION polyomino  (PolyominoCompactor.packPolyominoes)
//   row = { name,
//           input: { aspectRatio: hex, fill: bool,    Polyominoes(polys, aspectRatio, fill) constructor arguments
//                    polys: [ { w, h,                 Polyomino(w, h) cell width and height
//                               cells: [string...],   h strings of w chars, row y = 0..h-1 top to bottom, char x =
//                                                     column: '#' setBlocked(x,y), 'w' setWeaklyBlocked(x,y),
//                                                     '.' left empty. The state BEFORE the Polyominoes constructor
//                                                     (which may apply ProfileFill when fill is true).
//                               ext: [[dir,s,e]...]   addExtension(Direction.<dir>, s, e) in this order; dir is
//                                                     "NORTH"|"EAST"|"SOUTH"|"WEST" } ... ] },
//           options: { traversal, low, high },        TraversalStrategy / LowLevelSortingCriterion /
//                                                     HighLevelSortingCriterion constant names, set with
//                                                     holder.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY
//                                                     | POLYOMINO_LOW_LEVEL_SORT | POLYOMINO_HIGH_LEVEL_SORT, v)
//           result: { positions: [[x,y]...],          Polyomino.getX()/getY() after packing, in INPUT order
//                     order: [i...],                  input indices of holder.getPolyominoes() after packing (the
//                                                     sorted placement order)
//                     grid: [w,h],                    holder.getGrid().getWidth()/getHeight()
//                     filledBounds: [a,b,c,d] }       holder.getGrid().getFilledBounds() getFirst..getFourth
//           result = { error: "java.lang.IndexOutOfBoundsException" } instead when packPolyominoes throws: an
//                     extension area reaches outside the grid (PlanarGrid.weaklyIntersectsArea is not bounds tolerant).
//         }
//   Sorting ties (equal comparator keys) are resolved by List.sort's stability, not by identity hashes; they are
//   deterministic and are kept (small polyominoes tie a lot).
//
// SECTION overlaps  (RectangleStripOverlapRemover)
//   row = { name, direction: "UP"|"DOWN"|"LEFT"|"RIGHT", gap: [horizontal, vertical] (hex; withGap(h, v)),
//           start: hex (withStartCoordinate), strategy: "default" | "greedy",
//           rects: [[x,y,w,h]...] (hex; addRectangle(new ElkRectangle(x,y,w,h)) in this order),
//           result: [[x,y]...]    each added rectangle's x/y AFTER removeOverlaps(), in input order,
//           stripSize: hex }      the double returned by removeOverlaps()
//   strategy "default" = no withOverlapRemovalStrategy call (falls back to the greedy strategy); "greedy" =
//   withOverlapRemovalStrategy(new GreedyRectangleStripOverlapRemover()). Scenarios named tie-* deliberately contain
//   equal left x or equal right borders (stable sort / TreeSet comparator semantics, deterministic).
//
// SECTION spore  (ScanlineOverlapCheck, DepthFirstCompaction)
//   kind "scanline": row = { name, kind, input: { rects: [[x,y,w,h]...] (hex), vertices: [[cx,cy]...] (hex, node
//           centres x+w/2, y+h/2 computed here) }, result: { pairs: [[a,b]...] } }
//       new ScanlineOverlapCheck(handler, new SVGImage(null)).sweep(nodes) with nodes = new Node(vertex_i,
//       ElkRectangle(rect_i)) in input order; handler.handle(n1, n2) records [index(n1), index(n2)] in CALL order.
//   kind "dfc": row = { name, kind, input: { rects, vertices (as above), tree: nested [nodeIndex, childT...] in child
//           order, orthogonal: bool }, result: { nodes: [[vx,vy,rx,ry]...] } }
//       Tree<Node> built from the nested tree (root = tree head), DepthFirstCompaction.compact(tree, orthogonal);
//       result lists, per node in input order, vertex.x, vertex.y, rect.x, rect.y after compaction (rect width/height
//       never change). The 3-argument overload with a null debug file is run on a second fresh tree and must agree.
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;
import org.eclipse.elk.alg.common.BowyerWatsonTriangulation;
import org.eclipse.elk.alg.common.ICostFunction;
import org.eclipse.elk.alg.common.NaiveMinST;
import org.eclipse.elk.alg.common.TEdge;
import org.eclipse.elk.alg.common.Tree;
import org.eclipse.elk.alg.common.compaction.options.HighLevelSortingCriterion;
import org.eclipse.elk.alg.common.compaction.options.LowLevelSortingCriterion;
import org.eclipse.elk.alg.common.compaction.options.PolyominoOptions;
import org.eclipse.elk.alg.common.compaction.options.TraversalStrategy;
import org.eclipse.elk.alg.common.overlaps.GreedyRectangleStripOverlapRemover;
import org.eclipse.elk.alg.common.overlaps.RectangleStripOverlapRemover;
import org.eclipse.elk.alg.common.overlaps.RectangleStripOverlapRemover.OverlapRemovalDirection;
import org.eclipse.elk.alg.common.polyomino.PolyominoCompactor;
import org.eclipse.elk.alg.common.polyomino.structures.Direction;
import org.eclipse.elk.alg.common.polyomino.structures.Polyomino;
import org.eclipse.elk.alg.common.polyomino.structures.Polyominoes;
import org.eclipse.elk.alg.common.spore.DepthFirstCompaction;
import org.eclipse.elk.alg.common.spore.IOverlapHandler;
import org.eclipse.elk.alg.common.spore.Node;
import org.eclipse.elk.alg.common.spore.ScanlineOverlapCheck;
import org.eclipse.elk.alg.common.utils.SVGImage;
import org.eclipse.elk.core.math.ElkRectangle;
import org.eclipse.elk.core.math.KVector;

public class AlgCommonVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String OUTPUT = "alg-common.json";
    private static final int HEX_DIGITS = 16;
    private static final String NAME = "name";
    private static final String RECTS = "rects";
    private static final String VERTICES = "vertices";
    private static final String RESULT = "result";
    private static final String INPUT = "input";
    private static final String ROOT = "root";
    private static final String EUCLIDEAN = "euclidean";
    private static final String CONSTANT = "constant";
    private static final String KIND = "kind";
    private static final String ERROR = "error";
    private static final String DEFAULT_STRATEGY = "default";
    private static final String GREEDY_STRATEGY = "greedy";
    private static final double HALF = 2.0;
    private static final ICostFunction EUCLIDEAN_COST = e -> e.u.distance(e.v);
    private static final ICostFunction CONSTANT_COST = e -> 1.0;

    // Fixed seeds (one per generated input family; the inputs themselves are stored in the JSON).
    private static final long SEED_TRI_RANDOM = 7001L;
    private static final long SEED_POLY = 7101L;
    private static final long SEED_OVERLAPS = 7201L;
    private static final long SEED_SCANLINE = 7301L;
    private static final long SEED_DFC = 7401L;

    public static void main(String[] args) throws IOException {
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ");
        json(out, System.getProperty("java.version"));
        out.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\"");
        List<String> tri = triangulationRows();
        section(out, "triangulation", tri);
        section(out, "polyomino", polyominoRows());
        section(out, "overlaps", overlapRows());
        section(out, "spore", sporeRows());
        out.append("\n}\n");
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), out, StandardCharsets.UTF_8);
    }

    private static void section(StringBuilder out, String name, List<String> rows) {
        out.append(",\n  \"").append(name).append("\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            out.append("    ").append(rows.get(i)).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        out.append("  ]");
        System.err.println(name + ": " + rows.size() + " scenarios");
    }

    /** Runs a scenario twice on fresh objects; the two serialised rows must be identical (stop 8). */
    private static String twice(String name, Supplier<Map<String, Object>> run) {
        StringBuilder a = new StringBuilder();
        StringBuilder b = new StringBuilder();
        json(a, run.get());
        json(b, run.get());
        if (!a.toString().equals(b.toString())) {
            throw new IllegalStateException(name + ": two runs differ:\n" + a + "\n" + b);
        }
        return a.toString();
    }

    // ---- JSON ----

    private static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    private static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new IllegalStateException("NaN in a recorded value");
        }
        String s = Long.toHexString(Double.doubleToRawLongBits(d));
        return "0".repeat(HEX_DIGITS - s.length()) + s;
    }

    private static List<Object> hexes(double... ds) {
        List<Object> l = new ArrayList<>();
        for (double d : ds) {
            l.add(hex(d));
        }
        return l;
    }

    @SuppressWarnings("unchecked")
    private static void json(StringBuilder sb, Object o) {
        if (o instanceof String s) {
            sb.append('"');
            for (char c : s.toCharArray()) {
                if (c == '"' || c == '\\') {
                    sb.append('\\');
                }
                sb.append(c);
            }
            sb.append('"');
        } else if (o instanceof Map<?, ?> m) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<String, Object> e : ((Map<String, Object>) m).entrySet()) {
                sb.append(first ? "" : ",");
                first = false;
                json(sb, e.getKey());
                sb.append(':');
                json(sb, e.getValue());
            }
            sb.append('}');
        } else if (o instanceof List<?> l) {
            sb.append('[');
            for (int i = 0; i < l.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                json(sb, l.get(i));
            }
            sb.append(']');
        } else {
            sb.append(o);
        }
    }

    // ================= triangulation =================

    record TriSpec(String name, double[][] pts, int root) { }

    private static List<String> triangulationRows() {
        List<TriSpec> specs = new ArrayList<>();
        specs.add(new TriSpec("grid-2x2-cocircular", grid(2, 2, 40, 0, 0), 0));
        specs.add(new TriSpec("grid-3x3", grid(3, 3, 50, 0, 0), 0));
        specs.add(new TriSpec("grid-3x3-center-root", grid(3, 3, 50, 0, 0), 4));
        specs.add(new TriSpec("grid-4x4", grid(4, 4, 30, 10, 20), 0));
        specs.add(new TriSpec("grid-5x3-offset", grid(5, 3, 37.5, -100, 250), 7));
        specs.add(new TriSpec("grid-4x4-last-root", grid(4, 4, 64, 0, 0), 15));
        Random rnd = new Random(SEED_TRI_RANDOM);
        int[] sizes = {4, 5, 8, 13, 21, 34, 55};
        for (int n : sizes) {
            specs.add(new TriSpec("random-n" + n, randomPoints(rnd, n, 500), rnd.nextInt(n)));
        }
        specs.add(new TriSpec("random-n13-clustered", clustered(rnd, 13), 3));
        specs.add(new TriSpec("random-n21-row-heavy", rowHeavy(rnd, 21), 0));
        // degenerate inputs: whatever Java does (edges, or an exception) is the spec
        specs.add(new TriSpec("degenerate-one-point", new double[][] {{10, 10}}, 0));
        specs.add(new TriSpec("degenerate-two-points", new double[][] {{0, 0}, {30, 40}}, 1));
        specs.add(new TriSpec("degenerate-three-points", new double[][] {{0, 0}, {30, 0}, {10, 25}}, 2));
        specs.add(new TriSpec("degenerate-collinear-horizontal", new double[][] {{0, 5}, {10, 5}, {20, 5}, {35, 5}, {50, 5}}, 0));
        specs.add(new TriSpec("degenerate-collinear-vertical", new double[][] {{5, 0}, {5, 10}, {5, 20}, {5, 40}}, 2));
        specs.add(new TriSpec("degenerate-collinear-diagonal", new double[][] {{0, 0}, {10, 10}, {20, 20}, {30, 30}}, 0));
        specs.add(new TriSpec("degenerate-duplicates", new double[][] {{0, 0}, {40, 0}, {40, 0}, {20, 30}, {0, 0}}, 0));
        List<String> rows = new ArrayList<>();
        boolean sawConstantOrderSensitive = false;
        for (TriSpec s : specs) {
            String row = twice(s.name(), () -> triRun(s));
            sawConstantOrderSensitive |= row.contains("\"orderSensitive\":{\"euclidean\":true,\"constant\":true}")
                || row.contains("\"orderSensitive\":{\"euclidean\":false,\"constant\":true}");
            rows.add(row);
        }
        if (!sawConstantOrderSensitive) {
            throw new IllegalStateException("no triangulation scenario has an order-sensitive constant-cost tree");
        }
        return rows;
    }

    private static double[][] grid(int cols, int rows, double step, double ox, double oy) {
        double[][] p = new double[cols * rows][];
        int k = 0;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                p[k++] = new double[] {ox + c * step, oy + r * step};
            }
        }
        return p;
    }

    private static double[][] randomPoints(Random rnd, int n, double extent) {
        double[][] p = new double[n][];
        for (int i = 0; i < n; i++) {
            p[i] = new double[] {rnd.nextDouble() * extent, rnd.nextDouble() * extent};
        }
        return p;
    }

    /** Points in three tight clusters: many short edges and a few long ones. */
    private static double[][] clustered(Random rnd, int n) {
        double[][] centers = {{50, 50}, {400, 80}, {220, 380}};
        double[][] p = new double[n][];
        for (int i = 0; i < n; i++) {
            double[] c = centers[i % centers.length];
            p[i] = new double[] {c[0] + rnd.nextDouble() * 40, c[1] + rnd.nextDouble() * 40};
        }
        return p;
    }

    /** Few distinct rows (y snapped to multiples of 50) but continuous x: many near-collinear triples. */
    private static double[][] rowHeavy(Random rnd, int n) {
        double[][] p = new double[n][];
        for (int i = 0; i < n; i++) {
            p[i] = new double[] {rnd.nextDouble() * 600, 50.0 * rnd.nextInt(4)};
        }
        return p;
    }

    private static List<KVector> vectors(double[][] pts) {
        List<KVector> vs = new ArrayList<>();
        for (double[] p : pts) {
            vs.add(new KVector(p[0], p[1]));
        }
        return vs;
    }

    private static String key(KVector v) {
        return hex(v.x) + hex(v.y);
    }

    private static Map<String, Object> triRun(TriSpec s) {
        List<KVector> vs = vectors(s.pts());
        Map<String, Integer> index = new HashMap<>();
        List<Object> inputs = new ArrayList<>();
        for (int i = 0; i < vs.size(); i++) {
            index.putIfAbsent(key(vs.get(i)), i);
            inputs.add(hexes(vs.get(i).x, vs.get(i).y));
        }
        Map<String, Object> row = map(NAME, s.name(), VERTICES, inputs, ROOT, s.root());
        Set<TEdge> edges;
        try {
            edges = BowyerWatsonTriangulation.triangulate(vs, null);
        } catch (RuntimeException e) {
            row.put(ERROR, e.getClass().getName());
            return row;
        }
        List<Object> edgeList = edgeIndices(edges, index);
        if (!edgeList.equals(edgeIndices(BowyerWatsonTriangulation.triangulate(vectors(s.pts())), index))) {
            throw new IllegalStateException(s.name() + ": triangulate(v) differs from triangulate(v, null)");
        }
        KVector root = vs.get(s.root());
        Map<String, Object> trees = new LinkedHashMap<>();
        Map<String, Object> sensitive = new LinkedHashMap<>();
        for (Map.Entry<String, ICostFunction> cost : List.of(Map.entry(EUCLIDEAN, EUCLIDEAN_COST),
                Map.entry(CONSTANT, CONSTANT_COST))) {
            List<Object> tree = nest(NaiveMinST.createSpanningTree(edges, root, cost.getValue()), index);
            List<Object> viaFour = nest(NaiveMinST.createSpanningTree(edges, root, cost.getValue(), null), index);
            if (!tree.equals(viaFour)) {
                throw new IllegalStateException(s.name() + ": 3- and 4-argument createSpanningTree differ");
            }
            List<TEdge> reversed = new ArrayList<>(edges);
            Collections.reverse(reversed);
            List<Object> viaReversed = nest(
                NaiveMinST.createSpanningTree(new LinkedHashSet<>(reversed), root, cost.getValue()), index);
            trees.put(cost.getKey(), tree);
            sensitive.put(cost.getKey(), !tree.equals(viaReversed));
        }
        row.put("edges", edgeList);
        row.put("trees", trees);
        row.put("orderSensitive", sensitive);
        return row;
    }

    private static List<Object> edgeIndices(Set<TEdge> edges, Map<String, Integer> index) {
        List<Object> l = new ArrayList<>();
        for (TEdge e : edges) {
            l.add(List.of(index.get(key(e.u)), index.get(key(e.v))));
        }
        return l;
    }

    private static List<Object> nest(Tree<KVector> t, Map<String, Integer> index) {
        List<Object> l = new ArrayList<>();
        l.add(index.get(key(t.node)));
        for (Tree<KVector> c : t.children) {
            l.add(nest(c, index));
        }
        return l;
    }

    // ================= polyomino =================

    record PolySpec(int w, int h, String[] cells, List<Object> ext) { }

    private static List<String> polyominoRows() {
        TraversalStrategy[] traversals = TraversalStrategy.values();
        LowLevelSortingCriterion[] lows = LowLevelSortingCriterion.values();
        HighLevelSortingCriterion[] highs = HighLevelSortingCriterion.values();
        double[] aspects = {1.0, 2.5, 0.5, 1.0};
        boolean[] fills = {true, false, true, false};
        Random rnd = new Random(SEED_POLY);
        int[] counts = {6, 9, 12};
        List<String> rows = new ArrayList<>();
        for (int input = 0; input < counts.length; input++) {
            List<PolySpec> polys = new ArrayList<>();
            for (int i = 0; i < counts[input]; i++) {
                polys.add(randomPoly(rnd, input == 2));
            }
            int i = 0;
            for (TraversalStrategy t : traversals) {
                for (LowLevelSortingCriterion low : lows) {
                    for (HighLevelSortingCriterion high : highs) {
                        // every traversal sees all four (aspect, fill) variants: the 4 low x high combos are consecutive
                        int variant = (i + input) % aspects.length;
                        i++;
                        String name = "in" + input + "-" + t + "-" + low + "-" + high;
                        double aspect = aspects[variant];
                        boolean fill = fills[variant];
                        rows.add(twice(name, () -> polyRun(name, polys, aspect, fill, t, low, high)));
                    }
                }
            }
        }
        return rows;
    }

    private static PolySpec randomPoly(Random rnd, boolean withWeak) {
        int w = 1 + rnd.nextInt(6);
        int h = 1 + rnd.nextInt(6);
        char[][] c = new char[h][w];
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                double r = rnd.nextDouble();
                c[y][x] = r < 0.65 ? '#' : withWeak && r < 0.75 ? 'w' : '.';
            }
        }
        c[rnd.nextInt(h)][rnd.nextInt(w)] = '#';
        String[] rows = new String[h];
        for (int y = 0; y < h; y++) {
            rows[y] = new String(c[y]);
        }
        List<Object> ext = new ArrayList<>();
        int extCount = rnd.nextInt(4);
        for (int e = 0; e < extCount; e++) {
            Direction d = Direction.values()[rnd.nextInt(4)];
            int limit = (d == Direction.NORTH || d == Direction.SOUTH) ? w : h;
            int start = rnd.nextInt(limit);
            int end = start + rnd.nextInt(limit - start);
            ext.add(List.of(d.name(), start, end));
        }
        return new PolySpec(w, h, rows, ext);
    }

    private static Polyomino build(PolySpec s) {
        Polyomino p = new Polyomino(s.w(), s.h());
        for (int y = 0; y < s.h(); y++) {
            for (int x = 0; x < s.w(); x++) {
                char ch = s.cells()[y].charAt(x);
                if (ch == '#') {
                    p.setBlocked(x, y);
                } else if (ch == 'w') {
                    p.setWeaklyBlocked(x, y);
                }
            }
        }
        for (Object o : s.ext()) {
            List<?> e = (List<?>) o;
            p.addExtension(Direction.valueOf((String) e.get(0)), (Integer) e.get(1), (Integer) e.get(2));
        }
        return p;
    }

    private static Map<String, Object> polyRun(String name, List<PolySpec> specs, double aspect, boolean fill,
            TraversalStrategy t, LowLevelSortingCriterion low, HighLevelSortingCriterion high) {
        List<Polyomino> polys = new ArrayList<>();
        List<Object> inputPolys = new ArrayList<>();
        for (PolySpec s : specs) {
            polys.add(build(s));
            inputPolys.add(map("w", s.w(), "h", s.h(), "cells", Arrays.asList((Object[]) s.cells()), "ext", s.ext()));
        }
        Polyominoes<Polyomino> holder = new Polyominoes<>(polys, aspect, fill);
        holder.setProperty(PolyominoOptions.POLYOMINO_TRAVERSAL_STRATEGY, t);
        holder.setProperty(PolyominoOptions.POLYOMINO_LOW_LEVEL_SORT, low);
        holder.setProperty(PolyominoOptions.POLYOMINO_HIGH_LEVEL_SORT, high);
        Map<String, Object> head = map(NAME, name,
            INPUT, map("aspectRatio", hex(aspect), "fill", fill, "polys", inputPolys),
            "options", map("traversal", t.name(), "low", low.name(), "high", high.name()));
        try {
            new PolyominoCompactor().packPolyominoes(holder);
        } catch (IndexOutOfBoundsException e) {
            // a polyomino extension reaches outside the grid (weaklyIntersectsArea is not bounds tolerant): Java's spec
            head.put(RESULT, map(ERROR, e.getClass().getName()));
            return head;
        }
        Map<Polyomino, Integer> byIdentity = new IdentityHashMap<>();
        for (int i = 0; i < polys.size(); i++) {
            byIdentity.put(polys.get(i), i);
        }
        List<Object> positions = new ArrayList<>();
        for (Polyomino p : polys) {
            positions.add(List.of(p.getX(), p.getY()));
        }
        List<Object> order = new ArrayList<>();
        for (Polyomino p : holder.getPolyominoes()) {
            order.add(byIdentity.get(p));
        }
        var b = holder.getGrid().getFilledBounds();
        head.put(RESULT, map("positions", positions, "order", order,
            "grid", List.of(holder.getGrid().getWidth(), holder.getGrid().getHeight()),
            "filledBounds", List.of(b.getFirst(), b.getSecond(), b.getThird(), b.getFourth())));
        return head;
    }

    // ================= overlaps =================

    record OvSpec(String name, OverlapRemovalDirection dir, double gapH, double gapV, double start, String strategy,
        double[][] rects) { }

    private static List<String> overlapRows() {
        Random rnd = new Random(SEED_OVERLAPS);
        double[][] gaps = {{5, 5}, {0, 0}, {12.5, 3.25}, {2, 9}};
        double[] starts = {0, 100, -37.5, 250.25};
        int[] counts = {9, 14, 20};
        List<OvSpec> specs = new ArrayList<>();
        int combo = 0;
        for (int set = 0; set < counts.length; set++) {
            double[][] rects = randomRects(rnd, counts[set], 200, 120, 10, 60, 8, 40);
            for (OverlapRemovalDirection d : OverlapRemovalDirection.values()) {
                for (String strategy : new String[] {DEFAULT_STRATEGY, GREEDY_STRATEGY}) {
                    double[] gap = gaps[combo % gaps.length];
                    double start = starts[(combo / 2) % starts.length];
                    combo++;
                    specs.add(new OvSpec("set" + set + "-" + d + "-" + strategy, d, gap[0], gap[1], start, strategy,
                        rects));
                }
            }
        }
        // deterministic ties: equal left x (stable sort) and equal right borders (TreeSet comparator drops a node)
        double[][] equalLeft = {{0, 0, 30, 10}, {0, 5, 20, 12}, {0, 9, 40, 8}, {55, 2, 15, 20}, {50.5, 14, 30, 6}};
        double[][] equalRight = {{0, 0, 50, 10}, {10, 4, 40, 12}, {20, 8, 30, 9}, {70, 3, 25, 14}, {80, 6, 15, 7}};
        for (OverlapRemovalDirection d : OverlapRemovalDirection.values()) {
            specs.add(new OvSpec("tie-equal-left-" + d, d, 5, 5, 0, GREEDY_STRATEGY, equalLeft));
            specs.add(new OvSpec("tie-equal-right-" + d, d, 3, 4, 20, DEFAULT_STRATEGY, equalRight));
        }
        specs.add(new OvSpec("empty-DOWN", OverlapRemovalDirection.DOWN, 5, 5, 0, DEFAULT_STRATEGY, new double[0][]));
        specs.add(new OvSpec("single-LEFT", OverlapRemovalDirection.LEFT, 5, 5, 40, GREEDY_STRATEGY,
            new double[][] {{3, 7, 20, 11}}));
        List<String> rows = new ArrayList<>();
        for (OvSpec s : specs) {
            rows.add(twice(s.name(), () -> overlapRun(s)));
        }
        return rows;
    }

    private static double[][] randomRects(Random rnd, int n, double extX, double extY, double minW, double maxW,
            double minH, double maxH) {
        double[][] r = new double[n][];
        for (int i = 0; i < n; i++) {
            r[i] = new double[] {rnd.nextDouble() * extX, rnd.nextDouble() * extY,
                minW + rnd.nextDouble() * (maxW - minW), minH + rnd.nextDouble() * (maxH - minH)};
        }
        return r;
    }

    private static List<Object> rectList(double[][] rects) {
        List<Object> l = new ArrayList<>();
        for (double[] r : rects) {
            l.add(hexes(r));
        }
        return l;
    }

    private static Map<String, Object> overlapRun(OvSpec s) {
        RectangleStripOverlapRemover remover = RectangleStripOverlapRemover.createForDirection(s.dir())
            .withGap(s.gapH(), s.gapV()).withStartCoordinate(s.start());
        if (GREEDY_STRATEGY.equals(s.strategy())) {
            remover.withOverlapRemovalStrategy(new GreedyRectangleStripOverlapRemover());
        }
        List<ElkRectangle> added = new ArrayList<>();
        for (double[] r : s.rects()) {
            ElkRectangle rect = new ElkRectangle(r[0], r[1], r[2], r[3]);
            added.add(rect);
            remover.addRectangle(rect);
        }
        double stripSize = remover.removeOverlaps();
        List<Object> result = new ArrayList<>();
        for (ElkRectangle r : added) {
            result.add(hexes(r.x, r.y));
        }
        return map(NAME, s.name(), "direction", s.dir().name(), "gap", hexes(s.gapH(), s.gapV()),
            "start", hex(s.start()), "strategy", s.strategy(), RECTS, rectList(s.rects()), RESULT, result,
            "stripSize", hex(stripSize));
    }

    // ================= spore =================

    private static List<String> sporeRows() {
        List<String> rows = new ArrayList<>();
        Random rnd = new Random(SEED_SCANLINE);
        List<Map.Entry<String, double[][]>> scans = new ArrayList<>();
        for (int n : new int[] {6, 10, 16, 24}) {
            scans.add(Map.entry("scanline-random-n" + n, randomRects(rnd, n, 150, 150, 15, 60, 15, 60)));
        }
        scans.add(Map.entry("scanline-dense-n30", randomRects(rnd, 30, 80, 80, 20, 50, 20, 50)));
        scans.add(Map.entry("scanline-disjoint", new double[][] {{0, 0, 10, 10}, {20, 11, 10, 10}, {40, 22.5, 8, 6},
            {60, 31, 12, 12}}));
        // exact touching on x (area-zero overlap) with distinct y
        scans.add(Map.entry("scanline-touching-x", new double[][] {{0, 0, 10, 20}, {10, 1, 12, 20}, {22, 2.5, 8, 20},
            {30, 3.75, 9, 20}, {5, 40, 10, 5}}));
        // within the 1e-4 fuzziness: x overlap of 5e-5 counts as touching, 5e-3 as overlapping
        scans.add(Map.entry("scanline-fuzzy-x", new double[][] {{0, 0, 10, 20}, {9.99995, 1, 12, 20},
            {30, 2, 10, 20}, {39.995, 3, 10, 20}}));
        for (Map.Entry<String, double[][]> e : scans) {
            rows.add(twice(e.getKey(), () -> scanlineRun(e.getKey(), e.getValue())));
        }
        Random drnd = new Random(SEED_DFC);
        List<Map.Entry<String, double[][]>> dfcs = new ArrayList<>();
        dfcs.add(Map.entry("dfc-jitter-grid-n9", jitterGrid(drnd, 3, 3, 120)));
        dfcs.add(Map.entry("dfc-jitter-grid-n16", jitterGrid(drnd, 4, 4, 140)));
        dfcs.add(Map.entry("dfc-jitter-grid-n12-wide", jitterGrid(drnd, 6, 2, 100)));
        dfcs.add(Map.entry("dfc-touching-columns", touching()));
        dfcs.add(Map.entry("dfc-scattered-n10", scattered(drnd, 10)));
        for (Map.Entry<String, double[][]> e : dfcs) {
            for (boolean orthogonal : new boolean[] {false, true}) {
                String name = e.getKey() + (orthogonal ? "-orthogonal" : "-euclidean");
                rows.add(twice(name, () -> dfcRun(name, e.getValue(), orthogonal)));
            }
        }
        return rows;
    }

    /** Rectangles on a coarse grid, each shrunk and offset randomly inside its cell: pairwise disjoint. */
    private static double[][] jitterGrid(Random rnd, int cols, int rows, double cell) {
        double[][] r = new double[cols * rows][];
        int k = 0;
        for (int row = 0; row < rows; row++) {
            for (int c = 0; c < cols; c++) {
                double w = 0.3 * cell + rnd.nextDouble() * 0.5 * cell;
                double h = 0.3 * cell + rnd.nextDouble() * 0.5 * cell;
                double x = c * cell + rnd.nextDouble() * (cell - w);
                double y = row * cell + rnd.nextDouble() * (cell - h);
                r[k++] = new double[] {x, y, w, h};
            }
        }
        return r;
    }

    /** Columns of distinct integer widths and rows of distinct heights, laid out edge to edge (exactly touching). */
    private static double[][] touching() {
        double[] widths = {20, 26, 34, 17};
        double[] heights = {30, 22, 41};
        double[][] r = new double[widths.length * heights.length][];
        int k = 0;
        double y = 0;
        for (double h : heights) {
            double x = 0;
            for (double w : widths) {
                r[k++] = new double[] {x, y, w, h};
                x += w;
            }
            y += h;
        }
        return r;
    }

    private static double[][] scattered(Random rnd, int n) {
        double[][] r = new double[n][];
        for (int i = 0; i < n; i++) {
            double w = 10 + rnd.nextDouble() * 20;
            double h = 10 + rnd.nextDouble() * 20;
            // cells of 200 wide along a diagonal-ish strip keep the rectangles disjoint
            r[i] = new double[] {i * 70 + rnd.nextDouble() * 30, rnd.nextDouble() * 300, w, h};
        }
        return r;
    }

    private static double[][] centers(double[][] rects) {
        double[][] c = new double[rects.length][];
        for (int i = 0; i < rects.length; i++) {
            c[i] = new double[] {rects[i][0] + rects[i][2] / HALF, rects[i][1] + rects[i][3] / HALF};
        }
        return c;
    }

    private static List<Node> nodes(double[][] rects, double[][] centers) {
        List<Node> ns = new ArrayList<>();
        for (int i = 0; i < rects.length; i++) {
            ns.add(new Node(new KVector(centers[i][0], centers[i][1]),
                new ElkRectangle(rects[i][0], rects[i][1], rects[i][2], rects[i][3])));
        }
        return ns;
    }

    private static Map<String, Object> scanlineRun(String name, double[][] rects) {
        double[][] centers = centers(rects);
        List<Node> ns = nodes(rects, centers);
        Map<Node, Integer> index = new IdentityHashMap<>();
        for (int i = 0; i < ns.size(); i++) {
            index.put(ns.get(i), i);
        }
        List<Object> pairs = new ArrayList<>();
        IOverlapHandler handler = (n1, n2) -> pairs.add(List.of(index.get(n1), index.get(n2)));
        new ScanlineOverlapCheck(handler, new SVGImage(null)).sweep(ns);
        return map(NAME, name, KIND, "scanline", INPUT, map(RECTS, rectList(rects), VERTICES, rectList(centers)),
            RESULT, map("pairs", pairs));
    }

    /** Parent of node i (i &gt; 0) = the strictly nearest earlier node by centre distance (lowest index on ties). */
    private static int[] parents(double[][] centers) {
        int[] parent = new int[centers.length];
        for (int i = 1; i < centers.length; i++) {
            double best = Double.POSITIVE_INFINITY;
            for (int j = 0; j < i; j++) {
                double d = Math.hypot(centers[i][0] - centers[j][0], centers[i][1] - centers[j][1]);
                if (d < best) {
                    best = d;
                    parent[i] = j;
                }
            }
        }
        return parent;
    }

    private static List<Object> nested(int node, int[] parent) {
        List<Object> l = new ArrayList<>();
        l.add(node);
        for (int c = node + 1; c < parent.length; c++) {
            if (parent[c] == node) {
                l.add(nested(c, parent));
            }
        }
        return l;
    }

    private static Tree<Node> tree(int node, int[] parent, List<Node> ns) {
        Tree<Node> t = new Tree<>(ns.get(node));
        for (int c = node + 1; c < parent.length; c++) {
            if (parent[c] == node) {
                t.children.add(tree(c, parent, ns));
            }
        }
        return t;
    }

    private static List<Object> dfcNodes(List<Node> ns) {
        List<Object> l = new ArrayList<>();
        for (Node n : ns) {
            l.add(hexes(n.vertex.x, n.vertex.y, n.rect.x, n.rect.y));
        }
        return l;
    }

    private static Map<String, Object> dfcRun(String name, double[][] rects, boolean orthogonal) {
        double[][] centers = centers(rects);
        int[] parent = parents(centers);
        List<Node> ns = nodes(rects, centers);
        DepthFirstCompaction.compact(tree(0, parent, ns), orthogonal);
        List<Node> viaDebugOverload = nodes(rects, centers);
        DepthFirstCompaction.compact(tree(0, parent, viaDebugOverload), orthogonal, null);
        List<Object> result = dfcNodes(ns);
        if (!result.equals(dfcNodes(viaDebugOverload))) {
            throw new IllegalStateException(name + ": 2- and 3-argument compact differ");
        }
        return map(NAME, name, KIND, "dfc",
            INPUT, map(RECTS, rectList(rects), VERTICES, rectList(centers), "tree", nested(0, parent),
                "orthogonal", orthogonal),
            RESULT, map("nodes", result));
    }
}
