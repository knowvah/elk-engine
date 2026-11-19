// SPDX-License-Identifier: EPL-2.0
// ORIGIN: tools/vectors/MrTreeVectors.java (output envelope, strict parse) and the mission 8a T12/T15 scratch probes (OrderBalanceProbe, EdgeRouterProbe).
// Generates frozen JVM reference vectors (AD-5, AD-13, mission 8a T15 follow-up) for org.eclipse.elk.alg.mrtree units that the whole-pipeline
// ref (mrtree.json) cannot reach, at the pinned ELK commit. This program only CALLS ELK and JDK APIs and records results; it embeds no ELK
// implementation. Run: tools/vectors/mrtree-unit-vectors.sh <outDir> (writes <outDir>/mrtree-units.json; the landed copy is
// test/golden/refs/java/mrtree-units.json). The program itself runs as `java -cp <oracle jars + third party> MrTreeUnitVectors.java
// <outDir> <tools/vectors dir>` under -XX:+UnlockExperimentalVMOptions -XX:hashCode=2. It reads no input file: every scenario comes from
// java.util.Random with the non-zero seeds recorded in the file header, so a cold run reproduces the ref byte-identically.
//
// ======================================================= OUTPUT CONTRACT =======================================================
// File: 2-space top level, one compact JSON row per line, trailing newline, strict JSON (parsed back with Gson's non-lenient reader):
//   { jdk, oracle, seeds: {edgeRouter, orderBalance, average}, rowCounts: {edgeRouter, cyrusBeck, orderBalance, average}, rows: [row...] }
// row = { id, group, input, expected }; ids are unique, "<group>/<family>/<name>". Doubles that are RESULTS are 16 lowercase hex digits
// (Long.toHexString(Double.doubleToRawLongBits(d)) zero padded, written H below); scenario inputs of the graph groups are integers
// written as JSON numbers.
//
// ---- groups edgeRouter and cyrusBeck ------------------------------------------------------------------------------------
//   input = a hand-built TGraph description:
//     { name, mode: EdgeRoutingMode name, direction: Direction name, spacing, texture, bounds: [xmin, xmax, ymin, ymax],
//       nodes: [ { label, x, y, w, h, level, levelMin, levelMax, ascension, root? } ], edges: [ [sourceIndex, targetIndex] ] }
//   The graph is built exactly as follows: TGraph props EDGE_ROUTING_MODE = mode, DIRECTION = direction, SPACING_EDGE_NODE = spacing,
//   EDGE_END_TEXTURE_LENGTH = texture, InternalProperties.GRAPH_XMIN/XMAX/YMIN/YMAX = bounds; node i = new TNode(i, graph, label) with
//   position (x, y), size (w, h), TREE_LEVEL = level, LEVELMIN, LEVELMAX, COMPACT_LEVEL_ASCENSION = ascension, ROOT = true when root;
//   edge = new TEdge(source, target) added to the source's outgoing list, the target's incoming list and the graph's edge list, in
//   the order given; graph node order = node order.
//   edgeRouter: `new EdgeRouter().process(graph, new NullElkProgressMonitor())`.
//   cyrusBeck: the private method EdgeRouter.cyrusBeck(TGraph), called by reflection. It has NO caller at the pin (EdgeRouter.process
//   never selects it), so no pipeline row can reach it; this group is its only evidence.
//   expected = { error: null | the fully qualified exception class name (an exception thrown by the run),
//                bends: [ per edge in input order: [ [x: H, y: H] ... ] ] }  (bends is the edge's bend points after the run, also
//                recorded when the run threw)
//
// ---- group orderBalance -------------------------------------------------------------------------------------------------
//   OrderBalance is referenced by nothing at the pin (TreeLayoutPhases.P2_NODE_ORDERING creates NodeOrderer). input = { parents:
//   [int per node; parents[0] unused], weighting: OrderWeighting name }: nodes n0..n(k-1) (TNode(i, graph, "n<i>")) in one graph with
//   MrTreeOptions.WEIGHTING = weighting, node i (i >= 1) added as child of node parents[i] (TNode.addChild), then the oracle's own
//   RootProcessor, FanProcessor, LevelProcessor, NeighborsProcessor, then OrderBalance.process, all with NullElkProgressMonitor.
//   expected = { props: [ [FAN, DESCENDANTS, LEFTNEIGHBOR index, RIGHTNEIGHBOR index] per node (-1 = null), read after the four
//                processors and before OrderBalance ],
//                out: [ [target index of each outgoing edge, in order] per node after OrderBalance ],
//                reset: whether LEFTNEIGHBOR, RIGHTNEIGHBOR, LEFTSIBLING and RIGHTSIBLING are null on every node afterwards }
//   Trees: Random(orderBalance seed), 6 trees of 8-21 nodes, parent = max(0, i - 1 - nextInt(win)), win = 2 + nextInt(5), each with
//   the weightings FAN, DESCENDANTS, MODEL_ORDER (18 rows).
//
// ---- group average ------------------------------------------------------------------------------------------------------
//   `tGraph.getNodes().stream().map(...).mapToDouble(Double::doubleValue).average().getAsDouble()` as EdgeRouter.java:313-315 and
//   328-330 call it: a sequential stream over a java.util.LinkedList<Double>, boxed with map, then mapToDouble. input = [H ...] (1 to 40
//   values; infinities and NaNs appear in some rows; raw bits), expected = H of the result. Inputs are designed to separate summation
//   algorithms: mixed magnitudes (1e-8 .. 1e16), mixed signs, cancellation patterns such as [1e16, 1, -1e16, 1] in every order,
//   repeated 0.1 and other inexact decimals, near-cancelling pairs, large and small integers, half-integers (node centres), and
//   non-finite values.
//
// Re-record: tools/vectors/mrtree-unit-vectors.sh <outDir>; ELK_VECTORS_CACHE=off runs cold. The cache salt covers this source, the
// script and the oracle build.
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.io.Reader;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.IdentityHashMap;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import org.eclipse.elk.alg.mrtree.graph.TEdge;
import org.eclipse.elk.alg.mrtree.graph.TGraph;
import org.eclipse.elk.alg.mrtree.graph.TNode;
import org.eclipse.elk.alg.mrtree.intermediate.FanProcessor;
import org.eclipse.elk.alg.mrtree.intermediate.LevelProcessor;
import org.eclipse.elk.alg.mrtree.intermediate.NeighborsProcessor;
import org.eclipse.elk.alg.mrtree.intermediate.RootProcessor;
import org.eclipse.elk.alg.mrtree.options.EdgeRoutingMode;
import org.eclipse.elk.alg.mrtree.options.InternalProperties;
import org.eclipse.elk.alg.mrtree.options.MrTreeOptions;
import org.eclipse.elk.alg.mrtree.options.OrderWeighting;
import org.eclipse.elk.alg.mrtree.p2order.OrderBalance;
import org.eclipse.elk.alg.mrtree.p4route.EdgeRouter;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.Direction;
import org.eclipse.elk.core.util.NullElkProgressMonitor;

public class MrTreeUnitVectors {
    static final String ELK_COMMIT = "8bca22f4afa3371562d2f702d59929818f7f7b71";
    static final long EDGE_ROUTER_SEED = 8161L;
    static final long ORDER_BALANCE_SEED = 12L;
    static final long AVERAGE_SEED = 8163L;
    static final String OUTPUT = "mrtree-units.json";
    static final int MAX_BYTES = 4 * 1024 * 1024;
    static final String[] DIRS = {"UP", "DOWN", "LEFT", "RIGHT", "UNDEFINED"};

    static Random rnd;

    // ----------------------------------------------------------------------------------------------------- helpers
    static int randInt(int lo, int hi) {
        return lo + (int) Math.floor(rnd.nextDouble() * (hi - lo + 1));
    }

    static <T> T pick(T[] xs) {
        return xs[randInt(0, xs.length - 1)];
    }

    static int pickInt(int... xs) {
        return xs[randInt(0, xs.length - 1)];
    }

    static String hex(double d) {
        return String.format("%016x", Double.doubleToRawLongBits(d));
    }

    static double unhex(String s) {
        return Double.longBitsToDouble(Long.parseUnsignedLong(s, 16));
    }

    static JsonArray ints(int... xs) {
        JsonArray a = new JsonArray();
        for (int x : xs) {
            a.add(x);
        }
        return a;
    }

    static JsonObject row(String id, String group, JsonElement input, JsonObject expected) {
        JsonObject r = new JsonObject();
        r.addProperty("id", id);
        r.addProperty("group", group);
        r.add("input", input);
        r.add("expected", expected);
        return r;
    }

    // ------------------------------------------------------------------------------------------ scenario generators
    static JsonObject node(String label, int x, int y, int w, int h, int level, int levelMin, int levelMax,
            boolean ascension, boolean root) {
        JsonObject n = new JsonObject();
        n.addProperty("label", label);
        n.addProperty("x", x);
        n.addProperty("y", y);
        n.addProperty("w", w);
        n.addProperty("h", h);
        n.addProperty("level", level);
        n.addProperty("levelMin", levelMin);
        n.addProperty("levelMax", levelMax);
        n.addProperty("ascension", ascension);
        if (root) {
            n.addProperty("root", true);
        }
        return n;
    }

    static JsonObject scenario(String name, String mode, String direction, int spacing, int texture, int[] bounds,
            List<JsonObject> nodes, List<int[]> edges) {
        JsonObject s = new JsonObject();
        s.addProperty("name", name);
        s.addProperty("mode", mode);
        s.addProperty("direction", direction);
        s.addProperty("spacing", spacing);
        s.addProperty("texture", texture);
        s.add("bounds", ints(bounds));
        JsonArray ns = new JsonArray();
        for (JsonObject n : nodes) {
            ns.add(n);
        }
        s.add("nodes", ns);
        JsonArray es = new JsonArray();
        for (int[] e : edges) {
            es.add(ints(e[0], e[1]));
        }
        s.add("edges", es);
        return s;
    }

    static int[] jitteredBounds(List<JsonObject> nodes) {
        int xmin = Integer.MAX_VALUE, ymin = Integer.MAX_VALUE, xmax = Integer.MIN_VALUE, ymax = Integer.MIN_VALUE;
        for (JsonObject n : nodes) {
            int x = n.get("x").getAsInt(), y = n.get("y").getAsInt();
            xmin = Math.min(xmin, x);
            ymin = Math.min(ymin, y);
            xmax = Math.max(xmax, x + n.get("w").getAsInt());
            ymax = Math.max(ymax, y + n.get("h").getAsInt());
        }
        int a = jit(), b = jit(), c = jit(), d = jit();
        return new int[] {xmin + a, xmax - b, ymin + c, ymax - d};
    }

    static int jit() {
        return rnd.nextDouble() < 0.6 ? randInt(0, 70) : 0;
    }

    static boolean horizontal(String direction) {
        return direction.equals("LEFT") || direction.equals("RIGHT");
    }

    static JsonObject buildTree(String name, String mode, String direction, double pCycle, double pSkip, double pSame,
            boolean superRoot, boolean noRoot) {
        boolean horiz = horizontal(direction);
        int nLevels = randInt(2, 5);
        int n = randInt(4, 9);
        int[] levelOf = new int[n];
        for (int i = 0; i < n; i++) {
            levelOf[i] = i == 0 ? 0 : randInt(0, nLevels);
        }
        Map<Integer, Integer> perLevel = new LinkedHashMap<>();
        Map<Integer, int[]> extent = new LinkedHashMap<>();
        List<JsonObject> nodes = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            int level = levelOf[i];
            int k = perLevel.getOrDefault(level, 0);
            perLevel.put(level, k + 1);
            int w = randInt(10, 40), h = randInt(10, 40);
            int along = level * 90 + randInt(0, 8);
            int across = k * 70 + randInt(0, 30) + (rnd.nextDouble() < 0.3 ? randInt(0, 80) : 0);
            int x = horiz ? along : across, y = horiz ? across : along;
            nodes.add(node("n" + i, x, y, w, h, level, 0, 0, false, false));
            int a = horiz ? x : y, b = horiz ? x + w : y + h;
            int[] ext = extent.get(level);
            extent.put(level, ext == null ? new int[] {a, b} : new int[] {Math.min(ext[0], a), Math.max(ext[1], b)});
        }
        for (JsonObject nd : nodes) {
            int[] ext = extent.get(nd.get("level").getAsInt());
            nd.addProperty("levelMin", ext[0]);
            nd.addProperty("levelMax", ext[1]);
            nd.addProperty("ascension", rnd.nextDouble() < 0.15);
        }
        if (!noRoot) {
            nodes.get(0).addProperty("root", true);
        }
        if (superRoot) {
            nodes.add(node("SUPER_ROOT", 0, 0, 0, 0, 0, 0, 0, false, false));
        }
        List<int[]> edges = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (int i = 1; i < n; i++) {
            List<Integer> cands = new ArrayList<>();
            for (int j = 0; j < n; j++) {
                if (levelOf[j] < levelOf[i]) {
                    cands.add(j);
                }
            }
            if (!cands.isEmpty()) {
                addEdge(edges, seen, cands.get(randInt(0, cands.size() - 1)), i);
            }
        }
        for (int r = randInt(2, 7); r > 0; r--) {
            int s = randInt(0, n - 1), t = randInt(0, n - 1);
            int diff = levelOf[t] - levelOf[s];
            if (diff > 1 && rnd.nextDouble() < pSkip) {
                addEdge(edges, seen, s, t);
            } else if (diff < 0 && rnd.nextDouble() < pCycle) {
                addEdge(edges, seen, s, t);
            } else if (diff == 0 && rnd.nextDouble() < pSame) {
                addEdge(edges, seen, s, t);
            } else if (diff == 1 && rnd.nextDouble() < 0.5) {
                addEdge(edges, seen, s, t);
            }
        }
        if (superRoot) {
            edges.add(new int[] {n, 0});
        }
        for (int i = edges.size() - 1; i > 0; i--) {
            int j = randInt(0, i);
            int[] tmp = edges.get(i);
            edges.set(i, edges.get(j));
            edges.set(j, tmp);
        }
        int[] bounds = jitteredBounds(nodes);
        int spacing = pickInt(3, 5, 8, 12);
        int texture = pickInt(0, 0, 6, 15, 30);
        return scenario(name, mode, direction, spacing, texture, bounds, nodes, edges);
    }

    static void addEdge(List<int[]> edges, Set<String> seen, int s, int t) {
        if (s == t || !seen.add(s + ">" + t)) {
            return;
        }
        edges.add(new int[] {s, t});
    }

    static JsonObject buildGap(String name, String direction) {
        boolean horiz = horizontal(direction);
        List<JsonObject> nodes = new ArrayList<>();
        Map<Integer, int[]> extent = new LinkedHashMap<>();
        int target = randInt(2, 3);
        int src = place(nodes, extent, horiz, "n0", 0, randInt(0, 120));
        List<int[]> edges = new ArrayList<>();
        List<Integer> mids = new ArrayList<>();
        for (int level = 1; level < target; level++) {
            for (int k = randInt(0, 3); k > 0; k--) {
                mids.add(place(nodes, extent, horiz, "m" + level + "_" + k, level, randInt(-40, 200)));
            }
        }
        List<Integer> tgts = new ArrayList<>();
        for (int k = randInt(1, 3); k > 0; k--) {
            tgts.add(place(nodes, extent, horiz, "t" + k, target, randInt(-40, 200)));
        }
        List<Integer> srcs = new ArrayList<>();
        srcs.add(src);
        if (rnd.nextDouble() < 0.5) {
            srcs.add(place(nodes, extent, horiz, "n1", 0, randInt(0, 200)));
        }
        for (int t : tgts) {
            for (int s : srcs) {
                if (rnd.nextDouble() < 0.8) {
                    edges.add(new int[] {s, t});
                }
            }
        }
        if (edges.isEmpty()) {
            edges.add(new int[] {src, tgts.get(0)});
        }
        for (int m : mids) {
            if (rnd.nextDouble() < 0.5) {
                edges.add(new int[] {src, m});
            }
        }
        for (JsonObject nd : nodes) {
            int[] ext = extent.get(nd.get("level").getAsInt());
            nd.addProperty("levelMin", ext[0]);
            nd.addProperty("levelMax", ext[1]);
        }
        nodes.get(0).addProperty("root", true);
        int[] bounds = jitteredBounds(nodes);
        int spacing = pickInt(3, 5, 8);
        int texture = pickInt(0, 6, 15);
        return scenario(name, "AVOID_OVERLAP", direction, spacing, texture, bounds, nodes, edges);
    }

    static int place(List<JsonObject> nodes, Map<Integer, int[]> extent, boolean horiz, String label, int level,
            int across) {
        int w = randInt(10, 30), h = randInt(10, 30);
        int along = level * 80 + randInt(0, 6);
        int x = horiz ? along : across, y = horiz ? across : along;
        nodes.add(node(label, x, y, w, h, level, 0, 0, false, false));
        int a = horiz ? x : y, b = horiz ? x + w : y + h;
        int[] ext = extent.get(level);
        extent.put(level, ext == null ? new int[] {a, b} : new int[] {Math.min(ext[0], a), Math.max(ext[1], b)});
        return nodes.size() - 1;
    }

    /** The scenarios of both graph groups, in a fixed order; the cyrusBeck ones carry a `cyrus` marker the caller strips. */
    static List<JsonObject> scenarios() {
        rnd = new Random(EDGE_ROUTER_SEED);
        List<JsonObject> out = new ArrayList<>();
        int idx = 0;
        for (String d : DIRS) {
            for (int r = 0; r < 40; r++) {
                out.add(buildTree("avoid/" + d + "/" + idx++, "AVOID_OVERLAP", d, 0.8, 0.9, 0.5, r % 6 == 5, false));
            }
        }
        for (String d : DIRS) {
            for (int r = 0; r < 40; r++) {
                out.add(buildGap("gap/" + d + "/" + idx++, d));
            }
        }
        for (String d : DIRS) {
            out.add(buildTree("mtm/" + d + "/" + idx++, "MIDDLE_TO_MIDDLE", d, 0.8, 0.9, 0.5, false, false));
            out.add(buildTree("none/" + d + "/" + idx++, "NONE", d, 0.8, 0.9, 0.5, false, false));
        }
        out.add(buildTree("avoid/noRoot/" + idx++, "AVOID_OVERLAP", "DOWN", 0.8, 0.9, 0.5, false, true));
        out.add(scenario("avoid/edgeless", "AVOID_OVERLAP", "DOWN", 5, 0, new int[] {0, 10, 0, 10},
                List.of(node("n0", 0, 0, 10, 10, 0, 0, 10, false, true)), List.of()));
        out.add(scenario("avoid/empty", "AVOID_OVERLAP", "DOWN", 5, 0, new int[] {0, 0, 0, 0}, List.of(), List.of()));
        // end-point arms with an edge that has no bend points yet (an ascension source skips its start points)
        out.add(hand("hand/nobend/LEFT", "LEFT", List.of(hn("n0", 100, 50, 0, 0, 0, true, true), hn("n1", 20, 50, 1, 0, 0, false, false))));
        out.add(hand("hand/nobend/RIGHT", "RIGHT", List.of(hn("n0", 20, 50, 0, 1000, 1000, true, true), hn("n1", 100, 50, 1, 1000, 1000, false, false))));
        out.add(hand("hand/nobend/UP", "UP", List.of(hn("n0", 50, 100, 0, 0, 0, true, true), hn("n1", 50, 20, 1, 0, 0, false, false))));
        out.add(hand("hand/nobend/DOWN", "DOWN", List.of(hn("n0", 50, 20, 0, 1000, 1000, true, true), hn("n1", 50, 100, 1, 1000, 1000, false, false))));
        // n1 (level 1, ascension) -> n0 (level 0): levelDiff < 0 but not against the direction, so no start bend points exist
        int[][] pos = {{50, 100, 50, 20}, {50, 100, 50, 20}, {50, 20, 50, 100}, {20, 50, 100, 50}, {100, 50, 20, 50}};
        String[] cd = {"DOWN", "UNDEFINED", "UP", "LEFT", "RIGHT"};
        for (int i = 0; i < cd.length; i++) {
            JsonObject s = hand("hand/cycle-nobend/" + cd[i], cd[i], List.of(
                    hn("n0", pos[i][0], pos[i][1], 0, 0, 0, false, true), hn("n1", pos[i][2], pos[i][3], 1, 0, 0, true, false)),
                    List.of(new int[] {1, 0}));
            out.add(s);
        }
        // cyrusBeck: random small graphs, then vertical / horizontal / zero-delta / diagonal segments through a third node
        for (int r = 0; r < 40; r++) {
            JsonObject s = buildTree("cyrus/" + idx++, "AVOID_OVERLAP", pick(DIRS), 0.5, 0.5, 0.5, false, false);
            s.addProperty("cyrus", true);
            out.add(s);
        }
        out.add(cyr("cyrus/vertical", List.of(cn("n0", 10, 0, 20, true), cn("n1", 10, 100, 20, false), cn("n2", 12, 50, 20, false)), new int[] {0, 1}));
        out.add(cyr("cyrus/horizontal", List.of(cn("n0", 0, 10, 20, true), cn("n1", 100, 10, 20, false), cn("n2", 50, 12, 20, false)), new int[] {0, 1}));
        out.add(cyr("cyrus/self", List.of(cn("n0", 10, 10, 20, true)), new int[] {0, 0}));
        out.add(cyr("cyrus/diagonal", List.of(cn("n0", 0, 0, 20, true), cn("n1", 100, 100, 20, false), cn("n2", 40, 40, 30, false)), new int[] {0, 1}));
        // a source labelled "n8" against a node labelled "n6" reaches the debugging probe at EdgeRouter.java:643
        out.add(cyr("cyrus/probe-n8", List.of(cn("n8", 0, 0, 20, true), cn("n1", 100, 0, 20, false), cn("n6", 40, 0, 20, false)), new int[] {0, 1}));
        out.add(cyr("cyrus/diagonal-up", List.of(cn("n0", 0, 100, 20, true), cn("n1", 100, 0, 20, false), cn("n2", 40, 40, 30, false)), new int[] {0, 1}));
        return out;
    }

    static JsonObject hn(String label, int x, int y, int level, int levelMin, int levelMax, boolean ascension, boolean root) {
        return node(label, x, y, 20, 20, level, levelMin, levelMax, ascension, root);
    }

    static JsonObject hand(String name, String direction, List<JsonObject> nodes) {
        return hand(name, direction, nodes, List.of(new int[] {0, 1}));
    }

    static JsonObject hand(String name, String direction, List<JsonObject> nodes, List<int[]> edges) {
        return scenario(name, "AVOID_OVERLAP", direction, 5, 6, new int[] {0, 200, 0, 200}, nodes, edges);
    }

    static JsonObject cn(String label, int x, int y, int size, boolean root) {
        return node(label, x, y, size, size, 0, 0, 0, false, root);
    }

    static JsonObject cyr(String name, List<JsonObject> nodes, int[] edge) {
        JsonObject s = scenario(name, "AVOID_OVERLAP", "DOWN", 5, 0, new int[] {0, 100, 0, 100}, nodes, List.of(edge));
        s.addProperty("cyrus", true);
        return s;
    }

    // ---------------------------------------------------------------------------------------------- graph groups
    static JsonObject runScenario(JsonObject sc, boolean cyrus) throws Exception {
        TGraph g = new TGraph();
        g.setProperty(MrTreeOptions.EDGE_ROUTING_MODE, EdgeRoutingMode.valueOf(sc.get("mode").getAsString()));
        g.setProperty(MrTreeOptions.DIRECTION, Direction.valueOf(sc.get("direction").getAsString()));
        g.setProperty(MrTreeOptions.SPACING_EDGE_NODE, sc.get("spacing").getAsDouble());
        g.setProperty(MrTreeOptions.EDGE_END_TEXTURE_LENGTH, sc.get("texture").getAsDouble());
        JsonArray b = sc.getAsJsonArray("bounds");
        g.setProperty(InternalProperties.GRAPH_XMIN, b.get(0).getAsDouble());
        g.setProperty(InternalProperties.GRAPH_XMAX, b.get(1).getAsDouble());
        g.setProperty(InternalProperties.GRAPH_YMIN, b.get(2).getAsDouble());
        g.setProperty(InternalProperties.GRAPH_YMAX, b.get(3).getAsDouble());
        List<TNode> nodes = new ArrayList<>();
        int id = 0;
        for (JsonElement ne : sc.getAsJsonArray("nodes")) {
            JsonObject nd = ne.getAsJsonObject();
            TNode n = new TNode(id++, g, nd.get("label").getAsString());
            n.getPosition().x = nd.get("x").getAsDouble();
            n.getPosition().y = nd.get("y").getAsDouble();
            n.getSize().x = nd.get("w").getAsDouble();
            n.getSize().y = nd.get("h").getAsDouble();
            n.setProperty(MrTreeOptions.TREE_LEVEL, nd.get("level").getAsInt());
            n.setProperty(InternalProperties.LEVELMIN, nd.get("levelMin").getAsDouble());
            n.setProperty(InternalProperties.LEVELMAX, nd.get("levelMax").getAsDouble());
            n.setProperty(InternalProperties.COMPACT_LEVEL_ASCENSION, nd.get("ascension").getAsBoolean());
            if (nd.has("root") && nd.get("root").getAsBoolean()) {
                n.setProperty(InternalProperties.ROOT, true);
            }
            g.getNodes().add(n);
            nodes.add(n);
        }
        List<TEdge> edges = new ArrayList<>();
        for (JsonElement ee : sc.getAsJsonArray("edges")) {
            JsonArray p = ee.getAsJsonArray();
            TEdge e = new TEdge(nodes.get(p.get(0).getAsInt()), nodes.get(p.get(1).getAsInt()));
            e.getSource().getOutgoingEdges().add(e);
            e.getTarget().getIncomingEdges().add(e);
            g.getEdges().add(e);
            edges.add(e);
        }
        String error = null;
        try {
            if (cyrus) {
                Method m = EdgeRouter.class.getDeclaredMethod("cyrusBeck", TGraph.class);
                m.setAccessible(true);
                try {
                    m.invoke(new EdgeRouter(), g);
                } catch (InvocationTargetException ite) {
                    throw (Exception) ite.getCause();
                }
            } else {
                new EdgeRouter().process(g, new NullElkProgressMonitor());
            }
        } catch (Exception ex) {
            error = ex.getClass().getName();
        }
        JsonObject expected = new JsonObject();
        expected.addProperty("error", error);
        JsonArray es = new JsonArray();
        for (TEdge e : edges) {
            JsonArray bp = new JsonArray();
            for (KVector v : e.getBendPoints()) {
                JsonArray pt = new JsonArray();
                pt.add(hex(v.x));
                pt.add(hex(v.y));
                bp.add(pt);
            }
            es.add(bp);
        }
        expected.add("bends", es);
        return expected;
    }

    // ------------------------------------------------------------------------------------------------ orderBalance
    static String idx(TNode n, Map<TNode, Integer> m) {
        return n == null ? "-1" : String.valueOf(m.get(n));
    }

    /** {@link Integer#parseInt}, with a malformed value reported by name (a neighbour missing from the index map). */
    static int parseIntArg(String what, String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(what + " is not an integer: " + s, e);
        }
    }

    static List<JsonObject> orderBalanceRows() {
        Random r = new Random(ORDER_BALANCE_SEED);
        List<JsonObject> rows = new ArrayList<>();
        for (int t = 0; t < 6; t++) {
            int n = 8 + r.nextInt(14);
            int win = 2 + r.nextInt(5);
            int[] parent = new int[n];
            for (int i = 1; i < n; i++) {
                parent[i] = Math.max(0, i - 1 - r.nextInt(win));
            }
            for (OrderWeighting w : new OrderWeighting[] {OrderWeighting.FAN, OrderWeighting.DESCENDANTS, OrderWeighting.MODEL_ORDER}) {
                TGraph g = new TGraph();
                g.setProperty(MrTreeOptions.WEIGHTING, w);
                TNode[] nodes = new TNode[n];
                Map<TNode, Integer> m = new IdentityHashMap<>();
                for (int i = 0; i < n; i++) {
                    nodes[i] = new TNode(i, g, "n" + i);
                    g.getNodes().add(nodes[i]);
                    m.put(nodes[i], i);
                }
                for (int i = 1; i < n; i++) {
                    nodes[parent[i]].addChild(nodes[i]);
                }
                NullElkProgressMonitor mon = new NullElkProgressMonitor();
                new RootProcessor().process(g, mon);
                new FanProcessor().process(g, mon);
                new LevelProcessor().process(g, mon);
                new NeighborsProcessor().process(g, mon);
                JsonArray props = new JsonArray();
                for (int i = 0; i < n; i++) {
                    TNode x = nodes[i];
                    props.add(ints(x.getProperty(InternalProperties.FAN), x.getProperty(InternalProperties.DESCENDANTS),
                            parseIntArg("left neighbour index", idx(x.getProperty(InternalProperties.LEFTNEIGHBOR), m)),
                            parseIntArg("right neighbour index", idx(x.getProperty(InternalProperties.RIGHTNEIGHBOR), m))));
                }
                new OrderBalance().process(g, mon);
                JsonArray out = new JsonArray();
                for (int i = 0; i < n; i++) {
                    JsonArray targets = new JsonArray();
                    for (TEdge e : nodes[i].getOutgoingEdges()) {
                        targets.add(m.get(e.getTarget()));
                    }
                    out.add(targets);
                }
                boolean reset = true;
                for (TNode x : nodes) {
                    reset &= x.getProperty(InternalProperties.LEFTNEIGHBOR) == null
                            && x.getProperty(InternalProperties.RIGHTNEIGHBOR) == null
                            && x.getProperty(InternalProperties.LEFTSIBLING) == null
                            && x.getProperty(InternalProperties.RIGHTSIBLING) == null;
                }
                JsonObject input = new JsonObject();
                input.add("parents", ints(parent));
                input.addProperty("weighting", w.name());
                JsonObject expected = new JsonObject();
                expected.add("props", props);
                expected.add("out", out);
                expected.addProperty("reset", reset);
                rows.add(row("orderBalance/tree" + t + "/" + w.name(), "orderBalance", input, expected));
            }
        }
        return rows;
    }

    // --------------------------------------------------------------------------------------------------- average
    static double mixed() {
        double mantissa = 1 + 9 * rnd.nextDouble();
        double v = mantissa * Math.pow(10, randInt(-8, 16));
        return rnd.nextBoolean() ? v : -v;
    }

    static double[] averageInput(int kind) {
        int n;
        double[] v;
        switch (kind) {
            case 0: // mixed magnitudes and signs
                n = randInt(1, 40);
                v = new double[n];
                for (int i = 0; i < n; i++) {
                    v[i] = mixed();
                }
                return v;
            case 1: { // cancellation: big, smalls and -big in a random order
                double big = pickDouble(1e16, 1e15, 9007199254740992.0, 4503599627370496.0, 1e12, 3e16);
                int smalls = randInt(1, 6);
                n = 2 + smalls;
                v = new double[n];
                v[0] = big;
                v[1] = -big;
                for (int i = 0; i < smalls; i++) {
                    v[2 + i] = pickDouble(1, 1, 0.5, 0.1, 3, 1e-3, 7);
                }
                shuffle(v);
                return v;
            }
            case 2: { // repeated inexact decimals
                n = randInt(1, 40);
                v = new double[n];
                double x = pickDouble(0.1, 0.7, 0.3, 1e-8, 33.3, 12.35, 1 / 3.0, 0.2);
                for (int i = 0; i < n; i++) {
                    v[i] = x;
                }
                return v;
            }
            case 3: { // near-cancelling pairs with small residues
                int pairs = randInt(1, 12);
                v = new double[2 * pairs + randInt(0, 3)];
                for (int i = 0; i < pairs; i++) {
                    double x = mixed();
                    v[2 * i] = x;
                    v[2 * i + 1] = -x * (1 + (rnd.nextBoolean() ? 1 : -1) * 1e-9 * rnd.nextDouble());
                }
                for (int i = 2 * pairs; i < v.length; i++) {
                    v[i] = mixed();
                }
                shuffle(v);
                return v;
            }
            case 4: { // node centres: integers and half-integers
                n = randInt(1, 40);
                v = new double[n];
                for (int i = 0; i < n; i++) {
                    v[i] = (randInt(-2000, 20000)) / 2.0;
                }
                return v;
            }
            case 5: { // many identical large values plus one tiny (sum beyond 2^53 growth)
                n = randInt(2, 40);
                v = new double[n];
                double big = pickDouble(1e16, 9007199254740993.0, 1e15, 2e16);
                for (int i = 0; i < n; i++) {
                    v[i] = rnd.nextDouble() < 0.85 ? big : pickDouble(1, 0.1, 3, 1e-8);
                }
                return v;
            }
            default: { // non-finite values among finite ones
                n = randInt(1, 12);
                v = new double[n];
                for (int i = 0; i < n; i++) {
                    v[i] = rnd.nextDouble() < 0.3
                            ? pickDouble(Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, Double.NaN, Double.MAX_VALUE, -Double.MAX_VALUE, Double.MIN_VALUE)
                            : mixed();
                }
                return v;
            }
        }
    }

    static double pickDouble(double... xs) {
        return xs[randInt(0, xs.length - 1)];
    }

    static void shuffle(double[] v) {
        for (int i = v.length - 1; i > 0; i--) {
            int j = randInt(0, i);
            double t = v[i];
            v[i] = v[j];
            v[j] = t;
        }
    }

    static List<JsonObject> averageRows() {
        rnd = new Random(AVERAGE_SEED);
        List<JsonObject> rows = new ArrayList<>();
        int[] perKind = {500, 450, 250, 350, 250, 250, 120};
        String[] names = {"mixed", "cancel", "repeat", "pairs", "centres", "big", "nonfinite"};
        for (int kind = 0; kind < perKind.length; kind++) {
            for (int c = 0; c < perKind[kind]; c++) {
                double[] v = averageInput(kind);
                // exactly the call shape of EdgeRouter.java:313-315: a sequential stream over a LinkedList<Double>
                LinkedList<Double> list = new LinkedList<>();
                for (double d : v) {
                    list.add(d);
                }
                double result = list.stream().map(x -> x).mapToDouble(Double::doubleValue).average().getAsDouble();
                JsonArray input = new JsonArray();
                for (double d : v) {
                    input.add(hex(d));
                }
                JsonObject expected = new JsonObject();
                expected.addProperty("bits", hex(result));
                rows.add(row("average/" + names[kind] + "/" + c, "average", input, expected));
            }
        }
        return rows;
    }

    // ------------------------------------------------------------------------------------------------------ main
    static void strictParse(Path file) throws IOException {
        try (Reader in = Files.newBufferedReader(file, StandardCharsets.UTF_8);
                com.google.gson.stream.JsonReader reader = new com.google.gson.stream.JsonReader(in)) {
            JsonParser.parseReader(reader);
        }
    }

    public static void main(String[] args) throws Exception {
        Path out = Path.of(args[0]);
        List<JsonObject> rows = new ArrayList<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("edgeRouter", 0);
        counts.put("cyrusBeck", 0);
        counts.put("orderBalance", 0);
        counts.put("average", 0);
        for (JsonObject sc : scenarios()) {
            boolean cyrus = sc.has("cyrus");
            sc.remove("cyrus");
            String group = cyrus ? "cyrusBeck" : "edgeRouter";
            JsonObject expected = runScenario(sc, cyrus);
            String name = sc.get("name").getAsString();
            rows.add(row(group + "/" + name, group, sc, expected));
            counts.merge(group, 1, Integer::sum);
        }
        for (JsonObject r : orderBalanceRows()) {
            rows.add(r);
            counts.merge("orderBalance", 1, Integer::sum);
        }
        for (JsonObject r : averageRows()) {
            rows.add(r);
            counts.merge("average", 1, Integer::sum);
        }
        Set<String> ids = new HashSet<>();
        for (JsonObject r : rows) {
            if (!ids.add(r.get("id").getAsString())) {
                throw new IllegalStateException("duplicate row id " + r.get("id").getAsString());
            }
        }
        StringBuilder text = new StringBuilder("{\n  \"jdk\": \"").append(System.getProperty("java.version")).append("\",\n");
        text.append("  \"oracle\": \"").append(ELK_COMMIT).append("\",\n");
        text.append("  \"seeds\": {\"edgeRouter\": ").append(EDGE_ROUTER_SEED).append(", \"orderBalance\": ").append(ORDER_BALANCE_SEED)
                .append(", \"average\": ").append(AVERAGE_SEED).append("},\n  \"rowCounts\": {");
        int k = 0;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            text.append(k++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        text.append("},\n  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            text.append("    ").append(rows.get(i).toString()).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        text.append("  ]\n}\n");
        byte[] bytes = text.toString().getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BYTES) {
            throw new IllegalStateException("output is " + bytes.length + " bytes, over the 4 MiB cap");
        }
        Path file = out.resolve(OUTPUT);
        Files.write(file, bytes);
        strictParse(file);
        System.err.println("rows: " + counts + ", bytes: " + bytes.length);
    }
}
