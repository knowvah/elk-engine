// SPDX-License-Identifier: EPL-2.0
// ORIGIN: input rows, hex doubles, NS1 round trip and NS4 label sizes copied in shape from tools/vectors/NodeMicroLayoutVectors.java;
//         step stops, throws rows (first ELK frame), Infinity sanitising, strict parse and the 16 MiB guard copied in shape from
//         tools/vectors/LayeredCompoundVectors.java (mission 8a, T2, TR1-TR3, AD-13).
//
// Generates frozen JVM reference vectors (AD-13, TR1-TR3) for org.eclipse.elk.alg.radial at the pinned ELK commit: the steps of
// RadialLayoutProvider.layout and the result of RecursiveGraphLayoutEngine for designed tree scenarios. The package has no
// runnable Java tests, so the oracle is its behavioural spec. This program only CALLS ELK APIs (and reads the private
// RadialLayoutProvider.assembleAlgorithm by reflection to learn the processor names) and records results; it embeds no ELK algorithm.
// Run: tools/vectors/radial-vectors.sh <outDir>   (java -cp ... RadialVectors.java <outDir> <tools/vectors dir>, JVM flags
//      -XX:+UnlockExperimentalVMOptions -XX:hashCode=2). Landed copy: test/golden/refs/java/radial.json.
//      Re-record: run the script into a scratch dir (ELK_VECTORS_CACHE=off for a cold run), then copy radial.json over the ref and
//      journal the regeneration. Environment: RADIAL_UNPINNED=1 (set by `radial-vectors.sh --unpinned`) skips the identity-hash
//      check and every self-check: the TR3 evidence run, never committed.
//
// FILE: 2-space top level, one compact JSON row per line, trailing newline, strict JSON (Gson JsonReader), under 16 MiB:
//   { jdk, oracle, seed, rowCounts: { full, stops, throws }, i30: [ { id, treeified, levels: [ { size, parents } ] } ], rows: [row...] }
//   seed = 8301 (java.util.Random seeds of the scenario generator are 8301 + a constant per scenario, all nonzero).
//   i30 lists the rows whose next-level node set (RadialUtil.getNextLevelNodeSet, the identity-hashed HashSet of
//   RadiusExtensionOverlapRemoval.extend, I30) holds nodes of several parents; levels = one entry per recursion level >= 2 with the
//   set size and the number of distinct tree parents of its members; treeified = some set has >= 11 nodes (under hashCode=2 all
//   identity hashes are 1, so the bin of such a set is treeified by HashMap and iterates in tree order, not insertion order: a
//   TS replay compares those rows classified, not exactly; the sets of every other row iterate in insertion order, AD-10).
//
// ROW: { id, group, input, expected }; ids are unique, "<group>/<scenario id>" (throws rows drop the "throws/" of the scenario id).
//   group = full | stops | throws.
//   input = the PREPARED graph exported by ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false)
//           .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false) under exportSeed=1, embedded as JSON, bare
//           Infinity/-Infinity/NaN tokens mapped to strings (none occurs). Every element has an explicit identifier: root "root",
//           nodes "n<i>" (i = creation order), inner nodes "n<i>_c<k>", edges "e<j>", ports "n<i>t"/"n<i>f", labels "l<i>".
//           The root carries layoutOptions org.eclipse.elk.algorithm = org.eclipse.elk.radial and the scenario's options.
//   full    = the result of new RecursiveGraphLayoutEngine().layout(reimported input, new BasicProgressMonitor()) (NodeMicroLayout
//             included, as the provider calls it): a DUMP (below) with all seven sections.
//   stops   = { stops: [ stop... ] }: the state after each step of RadialLayoutProvider.layout, steps in this order (a step that
//             does not run for the row has no stop):
//       1 NodeMicroLayout   NodeMicroLayout.forGraph(root).execute(), present unless CoreOptions.OMIT_NODE_MICRO_LAYOUT is true
//       2 RootAndRadius     after RadialUtil.findRoot -> ROOT_NODE, and radius = RadialOptions.RADIUS, or if 0 the diameter of the largest
//                           node (RadialUtil.findLargestNodeInGraph), stored back as RADIUS (RadialLayoutProvider.java:50-63)
//       then the assembled processors, in assembly order, each named by its Java simple class name:
//       3 EadesRadial (phase 1) always; 4 RadiusExtensionOverlapRemoval always; 5 GeneralCompactor iff compactor != NONE;
//       6 GeneralRotator iff rotate; 7 CalculateGraphSize always; 8 StraightLineEdgeRouter (phase 2) always;
//       9 EdgeAngleCalculator iff outgoingEdgeAngles. (Order = IntermediateProcessorStrategy placement: OVERLAP_REMOVAL, COMPACTION,
//       ROTATION, GRAPH_SIZE_CALCULATION before P2_EDGE_ROUTING, OUTGOING_EDGE_ANGLES after; recorded from the real list.)
//     The recorder runs step 1 itself and then the real provider.layout with OMIT_NODE_MICRO_LAYOUT temporarily true (restored after),
//     so steps 2-9 are the provider's own code; a monitor dumps the graph each time the provider starts a processor and when it ends.
//     stop = { step, nodes, edges, props } and, in the FIRST stop of the row only, also { ports, labels, margins, padding }; the
//     recorder asserts those four sections are identical in every later stop and in the engine result (nothing after the micro layout
//     touches them). Row-level assertions at recording: RootAndRadius, EadesRadial, CalculateGraphSize change the state (and
//     StraightLineEdgeRouter when the graph has routed edges); steps named in a scenario's expect list change it; every step changes the
//     state in some row; each compactor changes it in some row. The final stop equals the engine result of the same input
//     (nodes, edges, props, ports, labels, margins, padding), or both throw the same class, message and frame.
//   throws  = { throws: { class, message, frame, step }, stops: [ stop... ] }: the provider run threw; stops = the stops completed
//             before the throw (same shapes as above). class = fully qualified Java class name; message = getMessage() (for a
//             NullPointerException it is the JVM's helpful message: compare class and frame, not message); frame = first
//             org.eclipse.elk frame of the stack as "File.java:line"; step = the step that was running (RootAndRadius covers
//             findRoot/radius code before the first processor; NodeMicroLayout the micro layout). Where the recursive engine
//             also throws it is the same class, message and frame (checked); the empty graph does not throw in the engine.
//
// DUMP (stop sections and full): every double is a 16-hex-digit lowercase string, Long.toHexString(Double.doubleToRawLongBits(d))
//   zero-padded (a NaN anywhere fails the recording); ids as exported (strings); all lists are in the traversal order below.
//   Traversal: nodes in pre-order (the root first, then each child in list order, recursing into inner children); ports of the
//   nodes in that order; labels: for every node in that order its node labels (nested labels after their owner), then its ports'
//   labels, then, again over the nodes in order, the labels of each contained edge (none in this file); edges: for each node in
//   order its getContainedEdges() in list order, only those with at least one section.
//   nodes   [ [id, x, y, width, height] ... ]            the root included (first entry)
//   edges   [ [id, [ [startX, startY, endX, endY, [ [bendX, bendY] ... ]] ... sections ]] ... ]
//   props   [ [elementId, name, value] ... ]             only properties that are SET (hasProperty) on the element, nodes in the
//                                                        traversal order, names in this order per element:
//             root            ROOT_NODE of R/InternalProperties (value: id of the node), set on the root graph
//             radius          RadialOptions.RADIUS (hex), set on the root graph (input value or the step-2 value)
//             orderId         RadialOptions.ORDER_ID (number): input values, and PolarCoordinateSorter writes it on every node it visits
//             targetAngle     RadialOptions.ROTATION_TARGET_ANGLE (hex): input value on the root, EdgeAngleCalculator sets it on targets
//             childAreaWidth, childAreaHeight   CoreOptions.CHILD_AREA_WIDTH/HEIGHT (hex), set by CalculateGraphSize on the root graph
//             position        CoreOptions.POSITION as [x, y] hex: the INPUT option (not the layout position) the polar sorter and the
//                             two *_BY_POSITION optimisations read; CrossingMinimizationPosition mutates the KVector in place
//                             (position.x += rootX), so it changes during EadesRadial (the stop after EadesRadial shows the result)
//   ports   [ [id, x, y, width, height] ... ]   labels [ [id, x, y, width, height] ... ]
//   margins, padding   [ [top, right, bottom, left] ... ] one per node in the traversal order (CoreOptions.MARGINS / PADDING by
//                      getProperty, so an unset option reads its default)
//
// NS1 round trip: for each row the recorder (1) builds the scenario graph, (2) exports it to `input`, (3) re-imports `input` with
//   ElkGraphJson.forGraph(String).toElk() and runs the step driver (and, when the row has an engine run, the engine) on the re-imported
//   graph: that is the recorded `expected`, (4) builds the scenario again and runs the same drivers on that original graph and fails
//   the row if the serialised results differ (every row, every driver). The whole file is built twice in one JVM and the two outputs
//   must be byte-identical; the identity hash must be constant (-XX:hashCode=2) or the program refuses to run.
// NS4 label sizes: AWT metrics are unusable; every label gets width = 6.5 * text.length(), height = 13.0 at creation.
//
// SCENARIOS (a Spec has an id, a graph builder, modes FULL|STOPS|THROWS and expect/i30 flags; ids are "<family>/<name>"):
//   shapes/*   default options: single, two, path6, path12-wide (mixed sizes), star5, star12-sym, binary3-sym, binary4-sym,
//              caterpillar, unbalanced, four seeded random trees (seeds 8401..8404, mixed sizes, spacing 30), one uniform random
//              tree (8410), forest-nontree and diamond-nontree (not trees, they lay out), ports (an edge into a port of n5 is a tree
//              edge; an edge out of a port of n2 is skipped by getSuccessors and the router). full + stops.
//   corpus/*   test/corpus/generated/radial-tree-small.json (15 nodes, 14 edges; sha256 pinned in the table above): default; and
//              wedge compaction + polar sorter (nodes given position options, seed 8306). full + stops.
//   matrix/*   one factor at a time on four probes with their own base options, <probe>/<variant>: probe wide = root + 3 children with
//              3, 4, 2 children (mixed sizes, seed 8312, spacing 60); rand = random tree of 13 (seed 8313, spacing 25); unbal =
//              unbalanced chain-and-bush (36x24 nodes); star = root + 11 leaves (mixed sizes, spacing 10). The next-level sets of every
//              matrix probe have fewer than 11 nodes (recorder check), so their iteration order is insertion order.
//              Variants: compactor-radial, compactor-wedge, compactor-{radial,wedge}-step{5,12} (compactionStepSize, which requires a
//              compactor), sorter-polar (nodes get position options, seed 8378), sorter-id (orderId = a permutation, seed 8378),
//              wedge-leafs, optim-edge-length, optim-edge-length-pos and optim-crossing-pos (nodes get position options, seed 8378),
//              rotate-0 (targetAngle 0), rotate-a1 (1.0), rotate-a-2.5, rotate-wedge-a0.7 (computeAdditionalWedgeSpace), rotate-wedge-a0,
//              edge-angles, center-on-root, radius50, radius120.5, omit-micro, padding, fixed-graph-size, spacing5. Defaults (NONE,
//              NODE_SIZE, NONE, rotate false, ...) are covered by the default rows of shapes/ and corpus/.
//              Symmetric rows (ties likely in fuzzyCompare / equal angles): shapes/*-sym and matrix/binary3-sym/*-sym (the factors that
//              compare angles or positions, positions seed 8380; sorter-id-sym orderIds seed 8379). Three two-factor mixes (matrix/*/mix-*).
//   i30/*      I30 designs, overlap removal always on (it has no off switch): next-level sets of 9 nodes from 2-4 parents with node
//              spacing 70-90 so the levels overlap (three-parents-3x3, four-parents-mixed, three-parents-chain, two-parents-chain,
//              three-parents-polar, three-parents-id, three-parents-wedge-compaction, three-parents-radial-compaction) and two with sets
//              of 12 and more (four-parents-big-12, rand-chain-big: treeified bins). The recorder requires the overlap step to change
//              the state in each i30 row.
//   labels/*   node labels and size constraints so the micro layout resizes nodes and sets margins: inside-grow, outside-margins,
//              outside-omit-micro, inside-grow-compact. full + stops.
//   hier/*     stops only (the engine would lay out the inner levels with another algorithm): nodes with inner children and a
//              contained edge to them; getSuccessors skips targets that are children, the router skips hierarchical edges.
//   throws/*   ring3, ring-with-leaf, self-loop, empty (the engine does not throw), ring3-omit-micro (no root: IllegalArgumentException
//              "The given graph is not a tree!"), polar-without-position and the two optimisations *_BY_POSITION without position
//              options (NullPointerException, ELK reads a property that has no default), wedge-single-node (rotate with
//              computeAdditionalWedgeSpace on a root without edges: index out of bounds in AngleRotation), ports-without-side
//              (NodeMicroLayout rejects ports without a side), hier-root-edge-angles (EdgeAngleCalculator reads the section of a
//              hierarchical edge).
//
// Hazards for a replay: Math.atan2/sin/cos/acos/sqrt feed discrete decisions (fuzzyCompare in the sorter, the overlap loops), so a
//   last-ulp JVM-vs-V8 difference can flip a row; the -sym rows are the likeliest. EadesRadial computes tau = 2 * Math.acos(r / r + radius)
//   (a precedence quirk): acos of a value above 1 is NaN, so `tau < maxAlpha - minAlpha` is always false (no NaN is recorded).
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Supplier;
import org.eclipse.elk.alg.common.NodeMicroLayout;
import org.eclipse.elk.alg.radial.InternalProperties;
import org.eclipse.elk.alg.radial.RadialLayoutProvider;
import org.eclipse.elk.alg.radial.RadialUtil;
import org.eclipse.elk.alg.radial.options.AnnulusWedgeCriteria;
import org.eclipse.elk.alg.radial.options.CompactionStrategy;
import org.eclipse.elk.alg.radial.options.RadialMetaDataProvider;
import org.eclipse.elk.alg.radial.options.RadialOptions;
import org.eclipse.elk.alg.radial.options.RadialTranslationStrategy;
import org.eclipse.elk.alg.radial.options.SortingStrategy;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.alg.ILayoutProcessor;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.NodeLabelPlacement;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.options.SizeConstraint;
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
import org.eclipse.elk.graph.util.ElkGraphUtil;

public class RadialVectors {
    static final String ELK_COMMIT = "e7eaea5747f2e5187a7b83cfdc256b501ca00d3c";
    static final String OUTPUT = "radial.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String UNPINNED_ENV = "RADIAL_UNPINNED";
    static final String RADIAL_ALGORITHM = "org.eclipse.elk.radial";
    static final long SEED = 8301L;
    static final long MAX_BYTES = 16L * 1024 * 1024;
    static final int FULL = 1, STOPS = 2, THROWS = 4;
    static final String G_FULL = "full", G_STOPS = "stops", G_THROWS = "throws";
    static final String S_MICRO = "NodeMicroLayout", S_ROOT = "RootAndRadius", S_EADES = "EadesRadial",
            S_OVERLAP = "RadiusExtensionOverlapRemoval", S_COMPACT = "GeneralCompactor", S_ROTATE = "GeneralRotator",
            S_SIZE = "CalculateGraphSize", S_ROUTER = "StraightLineEdgeRouter", S_ANGLES = "EdgeAngleCalculator";
    static final List<String> ALL_STEPS = List.of(S_MICRO, S_ROOT, S_EADES, S_OVERLAP, S_COMPACT, S_ROTATE, S_SIZE, S_ROUTER,
            S_ANGLES);
    static final double CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0;
    static final int TREEIFY_SET_SIZE = 11;
    static final String CORPUS_FILE = "test/corpus/generated/radial-tree-small.json";
    // SHA-256 of every repository file read, "<sha256>  repo:<path>" (tools/vectors/radial-vectors.sh checks the same lines).
    //   83561ade20e06f2f74d3d5489649921789a7e4e3445a0f05d084447d6a930d9d  repo:test/corpus/generated/radial-tree-small.json
    static Path REPO;
    static boolean unpinned;

    /** A recorder failure (never an oracle throw). */
    static final class Bug extends RuntimeException {
        Bug(String m) {
            super(m);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // JSON helpers

    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new Bug("NaN in a recorded value");
        }
        return "\"" + String.format("%016x", Double.doubleToRawLongBits(d)) + "\"";
    }

    static String str(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder sb = new StringBuilder("\"");
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
        return sb.append('"').toString();
    }

    static String join(List<String> items) {
        return "[" + String.join(",", items) + "]";
    }

    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");

    /** Gson's lenient writer emits non-finite doubles as bare tokens, which is not JSON. In number-token positions (after ':', ',' or '['
     * outside strings) Infinity, -Infinity and NaN become the strings "Infinity", "-Infinity" and "NaN". */
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

    static void strictParse(Path file) throws IOException {
        try (java.io.Reader in = Files.newBufferedReader(file, StandardCharsets.UTF_8);
                com.google.gson.stream.JsonReader reader = new com.google.gson.stream.JsonReader(in)) {
            reader.skipValue();
            if (reader.peek() != com.google.gson.stream.JsonToken.END_DOCUMENT) {
                throw new IllegalStateException(file + " has content after the top-level JSON value");
            }
        }
    }

    static String export(ElkNode root) {
        return strictNumbers(ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false)
                .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false).toJson());
    }

    static ElkNode reimport(String json) {
        return ElkGraphJson.forGraph(json).toElk();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Shapes: node sizes, tree parents and the few non-tree extras; built into ElkGraphs by build()

    static final class Shape {
        final List<double[]> size = new ArrayList<>();
        final List<Integer> parent = new ArrayList<>();
        final Map<Integer, String> label = new TreeMap<>();
        final Map<Integer, Integer> orderId = new TreeMap<>();
        final List<int[]> extra = new ArrayList<>(); // plain edges {from, to} beyond the tree edges
        final List<int[]> toPort = new ArrayList<>(); // edge from node `from` to a new port of node `to`
        final List<int[]> fromPort = new ArrayList<>(); // edge from a new port of node `from` to node `to`
        final Map<Integer, Integer> inner = new TreeMap<>(); // node -> inner children (contained edge node -> first, chain after)
        final Map<Integer, double[]> position = new TreeMap<>(); // the position option (read by the polar sorter), not the layout position
        boolean portsWithoutSide;

        int add(double w, double h, int par) {
            size.add(new double[] {w, h});
            parent.add(par);
            return size.size() - 1;
        }

        int n() {
            return size.size();
        }

        Shape resize(double w, double h) {
            size.replaceAll(s -> new double[] {w, h});
            return this;
        }

        Shape mixSizes(long seed) {
            Random rnd = new Random(seed);
            double[] ws = {20, 30, 40, 50, 60}, hs = {20, 24, 30, 40};
            for (int i = 0; i < n(); i++) {
                size.set(i, new double[] {ws[rnd.nextInt(ws.length)], hs[rnd.nextInt(hs.length)]});
            }
            return this;
        }

        Shape orderIds(long seed) {
            List<Integer> ids = new ArrayList<>();
            for (int i = 0; i < n(); i++) {
                ids.add(i);
            }
            Collections.shuffle(ids, new Random(seed));
            for (int i = 0; i < n(); i++) {
                orderId.put(i, ids.get(i));
            }
            return this;
        }

        Shape positions(long seed) {
            Random rnd = new Random(seed);
            for (int i = 0; i < n(); i++) {
                position.put(i, new double[] {rnd.nextInt(401) - 200 + 0.5, rnd.nextInt(401) - 200 + 0.25});
            }
            return this;
        }

        Shape labels(String prefix) {
            for (int i = 0; i < n(); i++) {
                label.put(i, prefix + i + (i % 2 == 0 ? "" : "-longer"));
            }
            return this;
        }
    }

    static Shape tree(int... parents) {
        Shape s = new Shape();
        for (int p : parents) {
            s.add(30, 30, p);
        }
        return s;
    }

    static Shape path(int n) {
        Shape s = new Shape();
        for (int i = 0; i < n; i++) {
            s.add(30, 30, i - 1);
        }
        return s;
    }

    static Shape star(int leaves) {
        Shape s = new Shape();
        s.add(30, 30, -1);
        for (int i = 0; i < leaves; i++) {
            s.add(30, 30, 0);
        }
        return s;
    }

    static Shape binary(int depth) {
        Shape s = new Shape();
        for (int i = 0; i < (1 << (depth + 1)) - 1; i++) {
            s.add(30, 30, i == 0 ? -1 : (i - 1) / 2);
        }
        return s;
    }

    /** Root, children.length first-level nodes, children[i] children below the i-th; chain adds one child under every second-level node. */
    static Shape multi(int[] children, int chain) {
        Shape s = new Shape();
        s.add(30, 30, -1);
        for (int i = 0; i < children.length; i++) {
            s.add(30, 30, 0);
        }
        List<Integer> second = new ArrayList<>();
        for (int i = 0; i < children.length; i++) {
            for (int c = 0; c < children[i]; c++) {
                second.add(s.add(30, 30, 1 + i));
            }
        }
        List<Integer> level = second;
        for (int k = 0; k < chain; k++) {
            List<Integer> next = new ArrayList<>();
            for (int p : level) {
                next.add(s.add(30, 30, p));
            }
            level = next;
        }
        return s;
    }

    static Shape random(int n, long seed) {
        Random rnd = new Random(seed);
        Shape s = new Shape();
        s.add(30, 30, -1);
        for (int i = 1; i < n; i++) {
            s.add(30, 30, rnd.nextBoolean() ? Math.max(0, i - 1 - rnd.nextInt(3)) : rnd.nextInt(i));
        }
        return s;
    }

    static Shape caterpillar(int spine, int legs) {
        Shape s = new Shape();
        for (int i = 0; i < spine; i++) {
            s.add(30, 30, i - 1);
        }
        for (int i = 0; i < spine; i++) {
            for (int l = 0; l < legs; l++) {
                s.add(30, 30, i);
            }
        }
        return s;
    }

    /** A chain of six with a side leaf at the third node and a bush of four at the end. */
    static Shape unbalanced() {
        Shape s = path(6);
        s.add(30, 30, 2);
        for (int i = 0; i < 4; i++) {
            s.add(30, 30, 5);
        }
        return s.resize(36, 24);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Building graphs

    static final class Opt {
        final IProperty<Object> prop;
        final Object value;

        @SuppressWarnings("unchecked")
        Opt(IProperty<?> prop, Object value) {
            this.prop = (IProperty<Object>) prop;
            this.value = value;
        }
    }

    static List<Opt> opts(Object... kv) {
        if (kv.length % 2 != 0) {
            throw new IllegalArgumentException("opts() takes key/value pairs, got " + kv.length + " arguments");
        }
        List<Opt> l = new ArrayList<>();
        for (int i = 0; i < kv.length; i += 2) {
            l.add(new Opt((IProperty<?>) kv[i], kv[i + 1]));
        }
        return l;
    }

    static List<Opt> plus(List<Opt> a, List<Opt> b) {
        List<Opt> l = new ArrayList<>(a);
        l.addAll(b);
        return l;
    }

    static ElkNode build(Shape s, List<Opt> rootOpts, List<Opt> nodeOpts) {
        ElkNode root = ElkGraphUtil.createGraph();
        root.setIdentifier("root");
        root.setProperty(CoreOptions.ALGORITHM, RADIAL_ALGORITHM);
        List<ElkNode> nodes = new ArrayList<>();
        for (int i = 0; i < s.n(); i++) {
            ElkNode n = ElkGraphUtil.createNode(root);
            n.setIdentifier("n" + i);
            n.setDimensions(s.size.get(i)[0], s.size.get(i)[1]);
            if (s.orderId.containsKey(i)) {
                n.setProperty(RadialOptions.ORDER_ID, s.orderId.get(i));
            }
            if (s.position.containsKey(i)) {
                n.setProperty(CoreOptions.POSITION, new KVector(s.position.get(i)[0], s.position.get(i)[1]));
            }
            if (s.label.containsKey(i)) {
                String text = s.label.get(i);
                ElkLabel l = ElkGraphUtil.createLabel(text, n);
                l.setIdentifier("l" + i);
                l.setDimensions(CHAR_WIDTH * text.length(), LABEL_HEIGHT); // NS4
            }
            for (Opt o : nodeOpts) {
                n.setProperty(o.prop, o.value);
            }
            nodes.add(n);
        }
        int edge = 0;
        for (int i = 0; i < s.n(); i++) {
            if (s.parent.get(i) >= 0) {
                edge(root, "e" + edge++, nodes.get(s.parent.get(i)), nodes.get(i));
            }
        }
        for (int[] e : s.extra) {
            edge(root, "e" + edge++, nodes.get(e[0]), nodes.get(e[1]));
        }
        for (int[] e : s.toPort) {
            edge(root, "e" + edge++, nodes.get(e[0]), port(nodes.get(e[1]), e[1] + "t", PortSide.WEST, s.portsWithoutSide));
        }
        for (int[] e : s.fromPort) {
            edge(root, "e" + edge++, port(nodes.get(e[0]), e[0] + "f", PortSide.EAST, s.portsWithoutSide), nodes.get(e[1]));
        }
        for (Map.Entry<Integer, Integer> in : s.inner.entrySet()) {
            ElkNode owner = nodes.get(in.getKey());
            ElkNode previous = null;
            for (int k = 0; k < in.getValue(); k++) {
                ElkNode child = ElkGraphUtil.createNode(owner);
                child.setIdentifier("n" + in.getKey() + "_c" + k);
                child.setDimensions(20, 20);
                ElkNode from = previous == null ? owner : previous;
                edge(previous == null ? owner : owner, "e" + edge++, from, child);
                previous = child;
            }
        }
        for (Opt o : rootOpts) {
            root.setProperty(o.prop, o.value);
        }
        return root;
    }

    static ElkPort port(ElkNode node, String id, PortSide side, boolean withoutSide) {
        ElkPort p = ElkGraphUtil.createPort(node);
        p.setIdentifier("n" + id);
        p.setDimensions(6, 6);
        if (!withoutSide) {
            p.setProperty(CoreOptions.PORT_SIDE, side);
        }
        return p;
    }

    static void edge(ElkNode container, String id, org.eclipse.elk.graph.ElkConnectableShape from,
            org.eclipse.elk.graph.ElkConnectableShape to) {
        ElkEdge e = ElkGraphUtil.createEdge(container);
        e.setIdentifier(id);
        e.getSources().add(from);
        e.getTargets().add(to);
    }

    static ElkNode corpus(List<Opt> rootOpts, boolean positions) {
        try {
            ElkNode root = reimport(Files.readString(REPO.resolve(CORPUS_FILE), StandardCharsets.UTF_8));
            root.setProperty(CoreOptions.ALGORITHM, RADIAL_ALGORITHM);
            if (positions) {
                Random rnd = new Random(SEED + 5);
                for (ElkNode n : root.getChildren()) {
                    n.setProperty(CoreOptions.POSITION, new KVector(rnd.nextInt(401) - 200 + 0.5, rnd.nextInt(401) - 200 + 0.25));
                }
            }
            for (Opt o : rootOpts) {
                root.setProperty(o.prop, o.value);
            }
            return root;
        } catch (IOException e) {
            throw new Bug("cannot read " + CORPUS_FILE + ": " + e);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Dumps

    static final Object[][] PROPS = {{"root", InternalProperties.ROOT_NODE}, {"radius", RadialOptions.RADIUS},
        {"orderId", RadialOptions.ORDER_ID}, {"targetAngle", RadialOptions.ROTATION_TARGET_ANGLE},
        {"childAreaWidth", CoreOptions.CHILD_AREA_WIDTH}, {"childAreaHeight", CoreOptions.CHILD_AREA_HEIGHT},
        {"position", CoreOptions.POSITION}};
    static final List<String> FIXED = List.of("ports", "labels", "margins", "padding");

    static void collect(ElkNode n, List<ElkNode> out) {
        out.add(n);
        for (ElkNode c : n.getChildren()) {
            collect(c, out);
        }
    }

    static String shape(String id, double x, double y, double w, double h) {
        return "[" + str(id) + "," + hex(x) + "," + hex(y) + "," + hex(w) + "," + hex(h) + "]";
    }

    static void labelsOf(List<ElkLabel> labels, List<String> out) {
        for (ElkLabel l : labels) {
            out.add(shape(l.getIdentifier(), l.getX(), l.getY(), l.getWidth(), l.getHeight()));
            labelsOf(l.getLabels(), out);
        }
    }

    /** The sections of one dump: nodes, edges, props (changing) and ports, labels, margins, padding (fixed after the micro layout). */
    static Map<String, String> dump(ElkNode root) {
        List<ElkNode> nodes = new ArrayList<>();
        collect(root, nodes);
        List<String> nodeL = new ArrayList<>(), portL = new ArrayList<>(), labelL = new ArrayList<>(), edgeL = new ArrayList<>(),
                propL = new ArrayList<>(), marginL = new ArrayList<>(), paddingL = new ArrayList<>();
        for (ElkNode n : nodes) {
            nodeL.add(shape(n.getIdentifier(), n.getX(), n.getY(), n.getWidth(), n.getHeight()));
            ElkMargin m = n.getProperty(CoreOptions.MARGINS);
            marginL.add("[" + hex(m.top) + "," + hex(m.right) + "," + hex(m.bottom) + "," + hex(m.left) + "]");
            ElkPadding p = n.getProperty(CoreOptions.PADDING);
            paddingL.add("[" + hex(p.top) + "," + hex(p.right) + "," + hex(p.bottom) + "," + hex(p.left) + "]");
            for (Object[] pr : PROPS) {
                @SuppressWarnings("unchecked")
                IProperty<Object> prop = (IProperty<Object>) pr[1];
                if (n.hasProperty(prop)) {
                    Object v = n.getProperty(prop);
                    String val = v instanceof ElkNode en ? str(en.getIdentifier()) : v instanceof Double d ? hex(d)
                            : v instanceof KVector kv ? "[" + hex(kv.x) + "," + hex(kv.y) + "]" : String.valueOf(v);
                    propL.add("[" + str(n.getIdentifier()) + "," + str((String) pr[0]) + "," + val + "]");
                }
            }
        }
        for (ElkNode n : nodes) {
            labelsOf(n.getLabels(), labelL);
            for (ElkPort p : n.getPorts()) {
                portL.add(shape(p.getIdentifier(), p.getX(), p.getY(), p.getWidth(), p.getHeight()));
                labelsOf(p.getLabels(), labelL);
            }
        }
        for (ElkNode n : nodes) {
            for (ElkEdge e : n.getContainedEdges()) {
                labelsOf(e.getLabels(), labelL);
                if (!e.getSections().isEmpty()) {
                    List<String> secs = new ArrayList<>();
                    for (ElkEdgeSection s : e.getSections()) {
                        List<String> bends = new ArrayList<>();
                        for (ElkBendPoint b : s.getBendPoints()) {
                            bends.add("[" + hex(b.getX()) + "," + hex(b.getY()) + "]");
                        }
                        secs.add("[" + hex(s.getStartX()) + "," + hex(s.getStartY()) + "," + hex(s.getEndX()) + "," + hex(s.getEndY())
                                + "," + join(bends) + "]");
                    }
                    edgeL.add("[" + str(e.getIdentifier()) + "," + join(secs) + "]");
                }
            }
        }
        Map<String, String> d = new LinkedHashMap<>();
        d.put("nodes", join(nodeL));
        d.put("edges", join(edgeL));
        d.put("props", join(propL));
        d.put("ports", join(portL));
        d.put("labels", join(labelL));
        d.put("margins", join(marginL));
        d.put("padding", join(paddingL));
        return d;
    }

    static String json(Map<String, String> d, boolean withFixed) {
        StringBuilder sb = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, String> e : d.entrySet()) {
            if (!withFixed && FIXED.contains(e.getKey())) {
                continue;
            }
            sb.append(first ? "" : ",").append(str(e.getKey())).append(':').append(e.getValue());
            first = false;
        }
        return sb.append('}').toString();
    }

    static boolean sameFixed(Map<String, String> a, Map<String, String> b) {
        for (String k : FIXED) {
            if (!a.get(k).equals(b.get(k))) {
                return false;
            }
        }
        return true;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Runs

    static final class Thrown {
        String cls, message, frame, step;

        String json() {
            return "{\"class\":" + str(cls) + ",\"message\":" + str(message) + ",\"frame\":" + str(frame) + ",\"step\":" + str(step) + "}";
        }

        boolean sameAs(Thrown o) {
            return cls.equals(o.cls) && Objects.equals(message, o.message) && Objects.equals(frame, o.frame);
        }
    }

    static final class Run {
        final List<String> steps = new ArrayList<>();
        final List<Map<String, String>> dumps = new ArrayList<>();
        Map<String, String> initial;
        Thrown thrown;
        List<String> processors;

        String serialise() {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < steps.size(); i++) {
                sb.append(steps.get(i)).append(json(dumps.get(i), true)).append('\n');
            }
            return sb + (thrown == null ? "" : thrown.json());
        }

        String expected(boolean throwsRow) {
            List<String> stops = new ArrayList<>();
            for (int i = 0; i < steps.size(); i++) {
                String body = json(dumps.get(i), i == 0);
                stops.add("{\"step\":" + str(steps.get(i)) + "," + body.substring(1));
            }
            return "{" + (throwsRow ? "\"throws\":" + thrown.json() + "," : "") + "\"stops\":" + join(stops) + "}";
        }

        boolean changed(int i) {
            return !dumps.get(i).equals(i == 0 ? initial : dumps.get(i - 1));
        }
    }

    static StackTraceElement elkFrame(Throwable e) {
        for (StackTraceElement f : e.getStackTrace()) {
            if (f.getClassName().startsWith("RadialVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    static Thrown thrown(RuntimeException e, String step) {
        if (e instanceof Bug) {
            throw e;
        }
        StackTraceElement f = elkFrame(e);
        if (f == null) {
            throw new Bug("exception outside ELK code: " + e);
        }
        Thrown t = new Thrown();
        t.cls = e.getClass().getName();
        t.message = e.getMessage();
        t.frame = f.getFileName() + ":" + f.getLineNumber();
        t.step = step;
        return t;
    }

    /** Dumps the graph when a processor is about to start (after the previous step) and when the provider is done. */
    static final class HookMonitor extends BasicProgressMonitor {
        final Runnable hook;

        HookMonitor(Runnable hook) {
            this.hook = hook;
        }

        @Override
        protected BasicProgressMonitor doSubTask(float work, int maxHierarchyLevels) {
            hook.run();
            return super.doSubTask(work, maxHierarchyLevels);
        }

        @Override
        protected void doDone(boolean topInstance, int maxHierarchyLevels) {
            hook.run();
        }
    }

    @SuppressWarnings("unchecked")
    static List<String> processorNames(RadialLayoutProvider provider, ElkNode graph) {
        try {
            java.lang.reflect.Method m = RadialLayoutProvider.class.getDeclaredMethod("assembleAlgorithm", ElkNode.class);
            m.setAccessible(true);
            List<String> names = new ArrayList<>();
            for (ILayoutProcessor<ElkNode> p : (List<ILayoutProcessor<ElkNode>>) m.invoke(provider, graph)) {
                names.add(p.getClass().getSimpleName());
            }
            return names;
        } catch (ReflectiveOperationException e) {
            throw new Bug("assembleAlgorithm: " + e);
        }
    }

    /** The provider's steps: the micro layout (run here, the provider then skips it), then RadialLayoutProvider.layout with a stop at every
     * processor boundary (see the header). */
    static Run runStops(ElkNode root) {
        Run run = new Run();
        run.initial = dump(root);
        RadialLayoutProvider provider = new RadialLayoutProvider();
        boolean omit = root.getProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT);
        boolean hadOmit = root.hasProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT);
        List<String> names = new ArrayList<>();
        if (!omit) {
            names.add(S_MICRO);
        }
        names.add(S_ROOT);
        try {
            run.processors = processorNames(provider, root);
            names.addAll(run.processors);
            if (!omit) {
                NodeMicroLayout.forGraph(root).execute();
                run.steps.add(S_MICRO);
                run.dumps.add(dump(root));
            }
        } catch (RuntimeException e) {
            run.thrown = thrown(e, S_MICRO);
            return run;
        }
        root.setProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT, true);
        try {
            HookMonitor monitor = new HookMonitor(() -> {
                run.steps.add(names.get(run.steps.size()));
                run.dumps.add(dump(root));
            });
            provider.layout(root, monitor);
        } catch (RuntimeException e) {
            if (run.steps.size() >= names.size()) {
                throw new Bug("throw after the last step: " + e);
            }
            run.thrown = thrown(e, names.get(run.steps.size()));
        } finally {
            root.setProperty(CoreOptions.OMIT_NODE_MICRO_LAYOUT, hadOmit ? omit : null);
        }
        return run;
    }

    /** Result of the recursive engine: a dump or a throw. */
    static final class Engine {
        Map<String, String> dump;
        Thrown thrown;

        String serialise() {
            return dump != null ? json(dump, true) : thrown.json();
        }
    }

    static Engine runEngine(ElkNode root) {
        Engine r = new Engine();
        try {
            new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
            r.dump = dump(root);
        } catch (RuntimeException e) {
            r.thrown = thrown(e, null);
        }
        return r;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Scenarios

    static final class Spec {
        final String id;
        final Supplier<ElkNode> graph;
        final int modes;
        final List<String> expect = new ArrayList<>(); // steps that must change state in this row
        boolean engine = true; // also run the recursive engine and compare it with the stops run
        boolean i30; // the row is an I30 design: the overlap removal step must change state

        Spec(String id, Supplier<ElkNode> graph, int modes) {
            this.id = id;
            this.graph = graph;
            this.modes = modes;
        }

        Spec expect(String... steps) {
            expect.addAll(List.of(steps));
            return this;
        }

        Spec noEngine() {
            engine = false;
            return this;
        }

        Spec i30() {
            i30 = true;
            expect.add(S_OVERLAP);
            return this;
        }
    }

    static final List<Spec> SPECS = new ArrayList<>();

    static Spec add(String id, Supplier<Shape> shape, List<Opt> rootOpts, int modes) {
        return add(id, shape, rootOpts, List.of(), modes);
    }

    static Spec add(String id, Supplier<Shape> shape, List<Opt> rootOpts, List<Opt> nodeOpts, int modes) {
        Spec s = new Spec(id, () -> build(shape.get(), rootOpts, nodeOpts), modes);
        SPECS.add(s);
        return s;
    }

    static final int BOTH = FULL | STOPS;
    static final List<Opt> NONE = List.of();

    static void shapeFamily() {
        add("shapes/single", () -> path(1), NONE, BOTH);
        add("shapes/two", () -> path(2), NONE, BOTH);
        add("shapes/path6", () -> path(6), NONE, BOTH);
        add("shapes/path12-wide", () -> path(12).mixSizes(21), NONE, BOTH);
        add("shapes/star5", () -> star(5).mixSizes(22), NONE, BOTH);
        add("shapes/star12-sym", () -> star(12), NONE, BOTH);
        add("shapes/binary3-sym", () -> binary(3), NONE, BOTH);
        add("shapes/binary4-sym", () -> binary(4), NONE, BOTH);
        add("shapes/caterpillar", () -> caterpillar(4, 2).mixSizes(23), NONE, BOTH);
        add("shapes/unbalanced", RadialVectors::unbalanced, NONE, BOTH);
        for (int k = 0; k < 4; k++) {
            long seed = SEED + 100 + k;
            int n = 8 + 3 * k;
            add("shapes/random" + n + "-s" + seed, () -> random(n, seed).mixSizes(seed), opts(CoreOptions.SPACING_NODE_NODE, 30.0), BOTH);
        }
        add("shapes/random-uniform-s8410", () -> random(14, SEED + 109), NONE, BOTH);
        add("shapes/forest-nontree", () -> {
            Shape s = tree(-1, 0, 0, 1);
            s.add(30, 30, -1);
            s.add(30, 30, 4);
            return s.mixSizes(24);
        }, NONE, BOTH);
        add("shapes/diamond-nontree", () -> {
            Shape s = tree(-1, 0, 0, 1);
            s.extra.add(new int[] {2, 3});
            return s;
        }, NONE, BOTH);
        add("shapes/ports", () -> {
            Shape s = tree(-1, 0, 0, 1, 1);
            s.add(30, 30, -1); // n5: reached by an edge from n1 into its port
            s.add(30, 30, -1); // n6: only the target of an edge from a port of n2 (never a tree successor)
            s.toPort.add(new int[] {1, 5});
            s.fromPort.add(new int[] {2, 6});
            return s;
        }, NONE, BOTH);
    }

    static void corpusFamily() {
        SPECS.add(new Spec("corpus/radial-tree-small/default", () -> corpus(NONE, false), BOTH));
        SPECS.add(new Spec("corpus/radial-tree-small/wedge-polar", () -> corpus(opts(RadialOptions.COMPACTOR,
                CompactionStrategy.WEDGE_COMPACTION, RadialOptions.SORTER, SortingStrategy.POLAR_COORDINATE), true), BOTH));
    }

    // Option matrix: one factor at a time on probe shapes (each probe carries its own base options, e.g. a node spacing that makes
    // the levels overlap).

    static final class Probe {
        final String name;
        final Supplier<Shape> shape;
        final List<Opt> base;

        Probe(String name, Supplier<Shape> shape, List<Opt> base) {
            this.name = name;
            this.shape = shape;
            this.base = base;
        }
    }

    static final class Variant {
        final String name;
        final List<Opt> opts;
        final boolean orderIds, positions;
        final String[] expect;

        Variant(String name, List<Opt> opts, boolean orderIds, boolean positions, String... expect) {
            this.name = name;
            this.opts = opts;
            this.orderIds = orderIds;
            this.positions = positions;
            this.expect = expect;
        }
    }

    static Variant v(String name, List<Opt> opts, String... expect) {
        return new Variant(name, opts, false, false, expect);
    }

    static List<Probe> probes() {
        return List.of(
                new Probe("wide", () -> multi(new int[] {3, 4, 2}, 0).mixSizes(SEED + 11), opts(CoreOptions.SPACING_NODE_NODE, 60.0)),
                new Probe("rand", () -> random(13, SEED + 12).mixSizes(SEED + 12), opts(CoreOptions.SPACING_NODE_NODE, 25.0)),
                new Probe("unbal", RadialVectors::unbalanced, NONE),
                new Probe("star", () -> star(11).mixSizes(SEED + 14), opts(CoreOptions.SPACING_NODE_NODE, 10.0)));
    }

    static List<Variant> variants() {
        List<Variant> l = new ArrayList<>();
        l.add(v("compactor-radial", opts(RadialOptions.COMPACTOR, CompactionStrategy.RADIAL_COMPACTION)));
        l.add(v("compactor-wedge", opts(RadialOptions.COMPACTOR, CompactionStrategy.WEDGE_COMPACTION)));
        for (int step : new int[] {5, 12}) {
            l.add(v("compactor-radial-step" + step, opts(RadialOptions.COMPACTOR, CompactionStrategy.RADIAL_COMPACTION,
                    RadialOptions.COMPACTION_STEP_SIZE, step)));
            l.add(v("compactor-wedge-step" + step, opts(RadialOptions.COMPACTOR, CompactionStrategy.WEDGE_COMPACTION,
                    RadialOptions.COMPACTION_STEP_SIZE, step)));
        }
        l.add(new Variant("sorter-polar", opts(RadialOptions.SORTER, SortingStrategy.POLAR_COORDINATE), false, true));
        l.add(new Variant("sorter-id", opts(RadialOptions.SORTER, SortingStrategy.ID), true, false));
        l.add(v("wedge-leafs", opts(RadialOptions.WEDGE_CRITERIA, AnnulusWedgeCriteria.LEAF_NUMBER)));
        l.add(v("optim-edge-length", opts(RadialOptions.OPTIMIZATION_CRITERIA, RadialTranslationStrategy.EDGE_LENGTH)));
        l.add(new Variant("optim-edge-length-pos", opts(RadialOptions.OPTIMIZATION_CRITERIA, RadialTranslationStrategy.EDGE_LENGTH_BY_POSITION),
                false, true));
        l.add(new Variant("optim-crossing-pos", opts(RadialOptions.OPTIMIZATION_CRITERIA,
                RadialTranslationStrategy.CROSSING_MINIMIZATION_BY_POSITION), false, true));
        l.add(v("rotate-0", opts(RadialOptions.ROTATE, true)));
        l.add(v("rotate-a1", opts(RadialOptions.ROTATE, true, RadialOptions.ROTATION_TARGET_ANGLE, 1.0), S_ROTATE));
        l.add(v("rotate-a-2.5", opts(RadialOptions.ROTATE, true, RadialOptions.ROTATION_TARGET_ANGLE, -2.5), S_ROTATE));
        l.add(v("rotate-wedge-a0.7", opts(RadialOptions.ROTATE, true, RadialOptions.ROTATION_TARGET_ANGLE, 0.7,
                RadialOptions.ROTATION_COMPUTE_ADDITIONAL_WEDGE_SPACE, true), S_ROTATE));
        l.add(v("rotate-wedge-a0", opts(RadialOptions.ROTATE, true, RadialOptions.ROTATION_COMPUTE_ADDITIONAL_WEDGE_SPACE, true),
                S_ROTATE));
        l.add(v("edge-angles", opts(RadialOptions.ROTATION_OUTGOING_EDGE_ANGLES, true), S_ANGLES));
        l.add(v("center-on-root", opts(RadialOptions.CENTER_ON_ROOT, true)));
        l.add(v("radius50", opts(RadialOptions.RADIUS, 50.0)));
        l.add(v("radius120.5", opts(RadialOptions.RADIUS, 120.5)));
        l.add(v("omit-micro", opts(CoreOptions.OMIT_NODE_MICRO_LAYOUT, true)));
        l.add(v("padding", opts(CoreOptions.PADDING, new ElkPadding(10, 20, 30, 40))));
        l.add(v("fixed-graph-size", opts(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true)));
        l.add(v("spacing5", opts(CoreOptions.SPACING_NODE_NODE, 5.0)));
        return l;
    }

    static Supplier<Shape> withExtras(Supplier<Shape> base, Variant va, long seed) {
        return () -> {
            Shape s = base.get();
            if (va.orderIds) {
                s.orderIds(seed);
            }
            if (va.positions) {
                s.positions(seed);
            }
            return s;
        };
    }

    static void matrixFamily() {
        for (Probe p : probes()) {
            for (Variant va : variants()) {
                Supplier<Shape> shape = withExtras(p.shape, va, SEED + 77);
                add("matrix/" + p.name + "/" + va.name, shape, plus(p.base, va.opts), BOTH).expect(va.expect);
            }
        }
        // Symmetric positions (fuzzyCompare ties are likely): kept to the factors that compare angles or positions.
        Supplier<Shape> sym = () -> binary(3);
        for (Variant va : variants()) {
            if (List.of("compactor-radial", "compactor-wedge", "sorter-polar", "wedge-leafs", "optim-edge-length",
                    "optim-edge-length-pos", "optim-crossing-pos", "rotate-a1", "center-on-root", "edge-angles").contains(va.name)) {
                add("matrix/binary3-sym/" + va.name + "-sym", withExtras(sym, va, SEED + 79), va.opts, BOTH).expect(va.expect);
            }
        }
        add("matrix/binary3-sym/sorter-id-sym", () -> binary(3).orderIds(SEED + 78), opts(RadialOptions.SORTER, SortingStrategy.ID),
                BOTH);
        // Two factors where one needs the other, and a few mixes.
        add("matrix/wide/mix-polar-wedge-optim", () -> probes().get(0).shape.get().positions(SEED + 80), plus(probes().get(0).base, opts(RadialOptions.SORTER,
                SortingStrategy.POLAR_COORDINATE, RadialOptions.COMPACTOR, CompactionStrategy.WEDGE_COMPACTION,
                RadialOptions.OPTIMIZATION_CRITERIA, RadialTranslationStrategy.EDGE_LENGTH)), BOTH);
        add("matrix/rand/mix-radial-rotate-angles", probes().get(1).shape, plus(probes().get(1).base, opts(RadialOptions.COMPACTOR,
                CompactionStrategy.RADIAL_COMPACTION, RadialOptions.ROTATE, true, RadialOptions.ROTATION_TARGET_ANGLE, 2.0,
                RadialOptions.ROTATION_OUTGOING_EDGE_ANGLES, true)), BOTH);
        add("matrix/unbal/mix-leafs-center-radius", probes().get(2).shape, opts(RadialOptions.WEDGE_CRITERIA,
                AnnulusWedgeCriteria.LEAF_NUMBER, RadialOptions.CENTER_ON_ROOT, true, RadialOptions.RADIUS, 70.0), BOTH);
    }

    // I30 (TR3): the next-level node set of RadialUtil.getNextLevelNodeSet holds nodes of several parents and the overlap removal is on.

    static void i30Family() {
        List<Opt> spacing90 = opts(CoreOptions.SPACING_NODE_NODE, 90.0), spacing70 = opts(CoreOptions.SPACING_NODE_NODE, 70.0);
        add("i30/three-parents-3x3", () -> multi(new int[] {3, 3, 3}, 0).resize(40, 30), spacing90, BOTH).i30();
        add("i30/four-parents-mixed", () -> multi(new int[] {2, 3, 2, 2}, 0).mixSizes(SEED + 31), spacing70, BOTH).i30();
        add("i30/three-parents-chain", () -> multi(new int[] {2, 3, 3}, 1).resize(40, 30), opts(CoreOptions.SPACING_NODE_NODE, 80.0),
                BOTH).i30();
        add("i30/two-parents-chain", () -> multi(new int[] {4, 5}, 1).mixSizes(SEED + 32), spacing70, BOTH).i30();
        add("i30/three-parents-polar", () -> multi(new int[] {3, 3, 3}, 0).resize(40, 30).positions(SEED + 35), plus(spacing90,
                opts(RadialOptions.SORTER, SortingStrategy.POLAR_COORDINATE)), BOTH).i30();
        add("i30/three-parents-id", () -> multi(new int[] {3, 3, 3}, 0).resize(40, 30).orderIds(SEED + 33), plus(spacing90,
                opts(RadialOptions.SORTER, SortingStrategy.ID)), BOTH).i30();
        add("i30/three-parents-wedge-compaction", () -> multi(new int[] {3, 3, 3}, 0).resize(40, 30), plus(spacing90,
                opts(RadialOptions.COMPACTOR, CompactionStrategy.WEDGE_COMPACTION)), BOTH).i30();
        add("i30/three-parents-radial-compaction", () -> multi(new int[] {3, 3, 3}, 0).resize(40, 30), plus(spacing90,
                opts(RadialOptions.COMPACTOR, CompactionStrategy.RADIAL_COMPACTION)), BOTH).i30();
        add("i30/four-parents-big-12", () -> multi(new int[] {3, 3, 3, 3}, 0).resize(40, 30), spacing90, BOTH).i30();
        add("i30/rand-chain-big", () -> multi(new int[] {4, 4, 4}, 1).mixSizes(SEED + 34), spacing70, BOTH).i30();
    }

    static List<Opt> labelOpts(EnumSet<NodeLabelPlacement> placement, EnumSet<SizeConstraint> constraints) {
        return opts(CoreOptions.NODE_LABELS_PLACEMENT, placement, CoreOptions.NODE_SIZE_CONSTRAINTS, constraints);
    }

    static void labelFamily() {
        Supplier<Shape> s = () -> binary(2).resize(24, 20).labels("lab");
        add("labels/inside-grow", s, NONE, labelOpts(NodeLabelPlacement.insideCenter(), EnumSet.of(SizeConstraint.NODE_LABELS,
                SizeConstraint.MINIMUM_SIZE)), BOTH).expect(S_MICRO);
        add("labels/outside-margins", s, NONE, labelOpts(NodeLabelPlacement.outsideBottomCenter(), EnumSet.noneOf(SizeConstraint.class)),
                BOTH).expect(S_MICRO);
        add("labels/outside-omit-micro", s, opts(CoreOptions.OMIT_NODE_MICRO_LAYOUT, true), labelOpts(
                NodeLabelPlacement.outsideBottomCenter(), EnumSet.noneOf(SizeConstraint.class)), BOTH);
        add("labels/inside-grow-compact", s, opts(RadialOptions.COMPACTOR, CompactionStrategy.RADIAL_COMPACTION), labelOpts(
                NodeLabelPlacement.insideTopLeft(), EnumSet.of(SizeConstraint.NODE_LABELS)), BOTH).expect(S_MICRO);
    }

    // Rows that must throw (group throws): the stops run records the stops before the throw.

    static void throwsFamily() {
        add("throws/ring3", () -> {
            Shape s = tree(-1, 0, 1);
            s.extra.add(new int[] {2, 0});
            return s;
        }, NONE, THROWS);
        add("throws/ring-with-leaf", () -> {
            Shape s = tree(-1, 0, 1, 1);
            s.extra.add(new int[] {2, 0});
            return s;
        }, NONE, THROWS);
        add("throws/self-loop", () -> {
            Shape s = path(1);
            s.extra.add(new int[] {0, 0});
            return s;
        }, NONE, THROWS);
        add("throws/polar-without-position", () -> star(3), opts(RadialOptions.SORTER, SortingStrategy.POLAR_COORDINATE), THROWS);
        add("throws/optim-edge-length-pos-without-position", () -> star(3), opts(RadialOptions.OPTIMIZATION_CRITERIA,
                RadialTranslationStrategy.EDGE_LENGTH_BY_POSITION), THROWS);
        add("throws/optim-crossing-pos-without-position", () -> star(3), opts(RadialOptions.OPTIMIZATION_CRITERIA,
                RadialTranslationStrategy.CROSSING_MINIMIZATION_BY_POSITION), THROWS);
        add("throws/empty", () -> new Shape(), NONE, THROWS).noEngine();
        add("throws/wedge-single-node", () -> path(1), opts(RadialOptions.ROTATE, true,
                RadialOptions.ROTATION_COMPUTE_ADDITIONAL_WEDGE_SPACE, true), THROWS);
        add("throws/ports-without-side", () -> {
            Shape s = tree(-1, 0, 0);
            s.toPort.add(new int[] {1, 2});
            s.portsWithoutSide = true;
            return s;
        }, NONE, THROWS);
        add("throws/ring3-omit-micro", () -> {
            Shape s = tree(-1, 0, 1);
            s.extra.add(new int[] {2, 0});
            return s;
        }, opts(CoreOptions.OMIT_NODE_MICRO_LAYOUT, true), THROWS);
    }

    // Hierarchical edges: stops only (the recursive engine would lay out the inner levels with another algorithm).

    static void hierFamily() {
        add("hier/leaf-inner", () -> {
            Shape s = tree(-1, 0, 0, 1);
            s.inner.put(2, 2);
            return s;
        }, NONE, STOPS).noEngine();
        add("hier/root-inner", () -> {
            Shape s = tree(-1, 0, 0);
            s.inner.put(0, 1);
            return s;
        }, NONE, STOPS).noEngine();
        add("throws/hier-root-edge-angles", () -> {
            Shape s = tree(-1, 0, 0);
            s.inner.put(0, 1);
            return s;
        }, opts(RadialOptions.ROTATION_OUTGOING_EDGE_ANGLES, true), THROWS).noEngine();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Recording

    static final class Row {
        final String id, group, json;

        Row(String id, String group, String json) {
            this.id = id;
            this.group = group;
            this.json = json;
        }
    }

    static final Map<String, int[]> CHANGES = new TreeMap<>(); // step -> {rows run, rows changed}
    static final Map<String, int[]> OPTION_ROWS = new TreeMap<>(); // "option=value" -> rows per group {full, stops, throws}
    static final List<String> I30_ROWS = new ArrayList<>();
    static final List<String> I30_JSON = new ArrayList<>();
    static final Map<String, Integer> GROUP_COUNT = new LinkedHashMap<>();
    static final Map<String, String> MARKED = new LinkedHashMap<>();

    static void need(boolean ok, String msg) {
        if (!ok) {
            throw new Bug(msg);
        }
    }

    static void tallyOptions(ElkNode root, String group) {
        Object[][] radial = {{"compactor", RadialOptions.COMPACTOR}, {"sorter", RadialOptions.SORTER},
            {"wedgeCriteria", RadialOptions.WEDGE_CRITERIA}, {"optimizationCriteria", RadialOptions.OPTIMIZATION_CRITERIA},
            {"rotate", RadialOptions.ROTATE}, {"computeAdditionalWedgeSpace", RadialOptions.ROTATION_COMPUTE_ADDITIONAL_WEDGE_SPACE},
            {"outgoingEdgeAngles", RadialOptions.ROTATION_OUTGOING_EDGE_ANGLES}, {"centerOnRoot", RadialOptions.CENTER_ON_ROOT},
            {"omitNodeMicroLayout", CoreOptions.OMIT_NODE_MICRO_LAYOUT}};
        List<String> keys = new ArrayList<>();
        for (Object[] o : radial) {
            keys.add(o[0] + "=" + root.getProperty((IProperty<?>) o[1]));
        }
        double angle = root.getProperty(RadialOptions.ROTATION_TARGET_ANGLE);
        keys.add("targetAngle=" + (angle == 0 ? "default" : "set"));
        keys.add("radius=" + (root.getProperty(RadialOptions.RADIUS) == 0 ? "default" : "set"));
        keys.add("compactionStepSize=" + (root.getProperty(RadialOptions.COMPACTION_STEP_SIZE) == 1 ? "default" : "set"));
        for (ElkNode n : root.getChildren()) {
            if (n.hasProperty(RadialOptions.ORDER_ID)) {
                keys.add("orderId=set,sorter=" + root.getProperty(RadialOptions.SORTER));
                break;
            }
        }
        for (String k : keys) {
            OPTION_ROWS.computeIfAbsent(k, x -> new int[3])[group.equals(G_FULL) ? 0 : group.equals(G_STOPS) ? 1 : 2]++;
        }
    }

    static void tallyChanges(Spec spec, Run run, ElkNode original) {
        Set<String> changed = new HashSet<>();
        for (int i = 0; i < run.steps.size(); i++) {
            String step = run.steps.get(i);
            String key = step.equals(S_COMPACT) ? step + "[" + original.getProperty(RadialOptions.COMPACTOR) + "]" : step;
            int[] c = CHANGES.computeIfAbsent(key, x -> new int[2]);
            c[0]++;
            if (run.changed(i)) {
                c[1]++;
                changed.add(run.steps.get(i));
            }
        }
        List<String> must = new ArrayList<>(spec.expect);
        if (run.thrown == null) {
            must.addAll(List.of(S_ROOT, S_EADES, S_SIZE));
            boolean edges = false;
            for (ElkNode n : original.getChildren()) {
                edges |= !n.getOutgoingEdges().isEmpty();
            }
            if (edges && !run.dumps.get(run.dumps.size() - 1).get("edges").equals("[]")) {
                must.add(S_ROUTER);
            }
        }
        for (String m : must) {
            need(changed.contains(m), "row " + spec.id + ": step " + m + " did not change the state (a recorder defect or a wrong scenario)");
        }
    }

    static void levelsOf(Spec spec, ElkNode graph) {
        ElkNode root = RadialUtil.findRoot(graph);
        if (root == null) {
            return;
        }
        List<ElkNode> level = RadialUtil.getSuccessors(root);
        List<String> levels = new ArrayList<>();
        boolean several = false, treeify = false;
        int guard = 0;
        while (!level.isEmpty() && guard++ < 64) {
            Set<ElkNode> next = RadialUtil.getNextLevelNodeSet(level);
            Set<ElkNode> parents = new HashSet<>();
            for (ElkNode n : next) {
                parents.add(RadialUtil.getTreeParent(n));
            }
            if (!next.isEmpty()) {
                levels.add("{\"size\":" + next.size() + ",\"parents\":" + parents.size() + "}");
                several |= parents.size() >= 2 && next.size() >= 2;
                treeify |= next.size() >= TREEIFY_SET_SIZE;
            }
            level = new ArrayList<>(next);
        }
        if (several) {
            I30_ROWS.add(spec.id + (treeify ? " [set >= " + TREEIFY_SET_SIZE + ": treeified bin under hashCode=2]" : ""));
            I30_JSON.add("{\"id\":" + str(spec.id) + ",\"treeified\":" + treeify + ",\"levels\":" + join(levels) + "}");
        }
        if (spec.id.startsWith("matrix/")) {
            need(!treeify, "matrix probe " + spec.id + " has a next-level set of " + TREEIFY_SET_SIZE + " or more nodes");
        }
    }

    static List<Row> record(Spec spec) {
        ElkNode original = spec.graph.get();
        String input = export(original);
        ElkNode reimported = reimport(input);
        Run run = runStops(reimported);
        boolean throwsRow = (spec.modes & THROWS) != 0;
        need((run.thrown != null) == throwsRow, "row " + spec.id + (throwsRow ? " did not throw" : " threw " + (run.thrown == null ? "" : run.thrown.json())));
        Engine engine = null;
        if (spec.engine) {
            engine = runEngine(reimport(input));
        }
        if (!unpinned) {
            // NS1 round trip: the run on a fresh original graph equals the run on the re-imported input, for both drivers.
            Run again = runStops(spec.graph.get());
            need(again.serialise().equals(run.serialise()), "round trip differs for " + spec.id + "\n" + again.serialise() + "\n" + run.serialise());
            if (engine != null) {
                need(runEngine(spec.graph.get()).serialise().equals(engine.serialise()), "engine round trip differs for " + spec.id);
            }
        }
        if (engine != null && !unpinned) { // unpinned, two runs of one graph may legitimately differ (I30)
            crossCheck(spec, run, engine);
        }
        tallyChanges(spec, run, reimported);
        tallyOptions(original, throwsRow ? G_THROWS : G_STOPS);
        if (run.thrown == null) {
            levelsOf(spec, reimport(input));
        }
        List<Row> rows = new ArrayList<>();
        if (throwsRow) {
            rows.add(row(G_THROWS, spec, input, run.expected(true)));
            return rows;
        }
        if ((spec.modes & FULL) != 0) {
            need(engine != null && engine.dump != null, "full row " + spec.id + " needs an engine run");
            tallyOptions(original, G_FULL);
            rows.add(row(G_FULL, spec, input, json(engine.dump, true)));
        }
        if ((spec.modes & STOPS) != 0) {
            rows.add(row(G_STOPS, spec, input, run.expected(false)));
        }
        return rows;
    }

    /** The stops run must agree with the recursive engine: same final dump, or the same throw. */
    static void crossCheck(Spec spec, Run run, Engine engine) {
        if (run.thrown != null) {
            need(engine.thrown != null && engine.thrown.sameAs(run.thrown), "engine and stops disagree on the throw of " + spec.id);
            return;
        }
        need(engine.dump != null, "engine threw for " + spec.id + ": " + (engine.thrown == null ? "" : engine.thrown.json()));
        Map<String, String> last = run.dumps.get(run.dumps.size() - 1);
        for (String k : List.of("nodes", "edges", "props", "ports", "labels", "margins", "padding")) {
            need(last.get(k).equals(engine.dump.get(k)), "engine and stops disagree on " + k + " of " + spec.id);
        }
        for (int i = 1; i < run.dumps.size(); i++) {
            need(sameFixed(run.dumps.get(0), run.dumps.get(i)), "ports/labels/margins/padding change after the first stop in " + spec.id);
        }
    }

    static Row row(String group, Spec spec, String input, String expected) {
        String id = group + "/" + (spec.id.startsWith("throws/") ? spec.id.substring("throws/".length()) : spec.id);
        GROUP_COUNT.merge(group, 1, Integer::sum);
        return new Row(id, group, "{\"id\":" + str(id) + ",\"group\":" + str(group) + ",\"input\":" + input + ",\"expected\":" + expected + "}");
    }

    static String buildAll() {
        SPECS.clear();
        CHANGES.clear();
        OPTION_ROWS.clear();
        I30_ROWS.clear();
        I30_JSON.clear();
        GROUP_COUNT.clear();
        shapeFamily();
        corpusFamily();
        matrixFamily();
        i30Family();
        labelFamily();
        hierFamily();
        throwsFamily();
        List<Row> rows = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (Spec s : SPECS) {
            for (Row r : record(s)) {
                need(ids.add(r.id), "duplicate row id " + r.id);
                rows.add(r);
            }
        }
        checkCoverage();
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ").append(str(System.getProperty("java.version")));
        out.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"seed\": ").append(SEED);
        out.append(",\n  \"rowCounts\": {");
        int k = 0;
        for (String g : List.of(G_FULL, G_STOPS, G_THROWS)) {
            out.append(k++ == 0 ? "" : ", ").append(str(g)).append(": ").append(GROUP_COUNT.getOrDefault(g, 0));
        }
        out.append("},\n  \"i30\": ").append(join(I30_JSON)).append(",\n  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            out.append("    ").append(rows.get(i).json).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        return out.append("  ]\n}\n").toString();
    }

    static final List<String> REQUIRED_OPTION_VALUES = List.of("compactor=NONE", "compactor=RADIAL_COMPACTION",
            "compactor=WEDGE_COMPACTION", "sorter=NONE", "sorter=POLAR_COORDINATE", "sorter=ID", "wedgeCriteria=NODE_SIZE",
            "wedgeCriteria=LEAF_NUMBER", "optimizationCriteria=NONE", "optimizationCriteria=EDGE_LENGTH",
            "optimizationCriteria=EDGE_LENGTH_BY_POSITION", "optimizationCriteria=CROSSING_MINIMIZATION_BY_POSITION", "rotate=true",
            "rotate=false", "targetAngle=set", "computeAdditionalWedgeSpace=true", "outgoingEdgeAngles=true", "centerOnRoot=true",
            "radius=set", "compactionStepSize=set", "orderId=set,sorter=ID", "omitNodeMicroLayout=true");

    static void checkCoverage() {
        for (String k : REQUIRED_OPTION_VALUES) {
            need(OPTION_ROWS.containsKey(k), "no row covers " + k);
        }
        for (String g : List.of(G_FULL, G_STOPS, G_THROWS)) {
            need(GROUP_COUNT.getOrDefault(g, 0) > 0, "no row in group " + g);
        }
        int[] wedge = CHANGES.get(S_COMPACT + "[" + CompactionStrategy.WEDGE_COMPACTION + "]");
        need(wedge != null && wedge[1] > 0, "WEDGE_COMPACTION never changed the state in any row");
        for (String step : ALL_STEPS) {
            int[] c = step.equals(S_COMPACT) ? CHANGES.get(S_COMPACT + "[" + CompactionStrategy.RADIAL_COMPACTION + "]") : CHANGES.get(step);
            need(c != null && c[1] > 0, "step " + step + " never changed the state in any row");
        }
    }

    static void report(String file) {
        System.err.println("rows per group: " + GROUP_COUNT + ", bytes " + file.getBytes(StandardCharsets.UTF_8).length);
        CHANGES.forEach((k, c) -> System.err.println("step " + k + ": run in " + c[0] + " stops, changed the state in " + c[1]));
        OPTION_ROWS.forEach((k, c) -> System.err.println("option " + k + ": full " + c[0] + ", stops " + c[1] + ", throws " + c[2]));
        System.err.println("I30 rows (next-level set with nodes of several parents): " + I30_ROWS.size());
        I30_ROWS.forEach(r -> System.err.println("  i30 " + r));
    }

    static void verifyTable() throws Exception {
        String src = Files.readString(REPO.resolve("tools/vectors/RadialVectors.java"), StandardCharsets.UTF_8);
        for (String line : src.split("\n")) {
            String t = line.trim();
            if (t.startsWith("//   ") && t.contains("  repo:")) {
                String[] p = t.substring(2).trim().split("\\s+");
                String path = p[1].substring("repo:".length());
                String actual = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(REPO.resolve(path))));
                need(actual.equals(p[0]), "file changed: " + path);
            }
        }
    }

    public static void main(String[] args) throws Exception {
        unpinned = System.getenv(UNPINNED_ENV) != null;
        if (!unpinned && System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/radial-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new RadialMetaDataProvider(), new org.eclipse.elk.alg.radial.options.RadialOptions());
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty("org.eclipse.elk.graph.util.identifierSeed", "1");
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        verifyTable();
        String file = buildAll();
        if (!unpinned) {
            String again = buildAll();
            if (!file.equals(again)) {
                throw new IllegalStateException("two builds differ");
            }
        }
        report(file);
        long bytes = file.getBytes(StandardCharsets.UTF_8).length;
        if (bytes > MAX_BYTES) {
            throw new IllegalStateException(OUTPUT + " is " + bytes + " bytes, over the 16 MiB cap");
        }
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), file, StandardCharsets.UTF_8);
        strictParse(Path.of(args[0], OUTPUT));
        System.err.println("strict JSON parse ok, " + OUTPUT + " bytes " + bytes);
    }
}
