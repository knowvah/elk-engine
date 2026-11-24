// SPDX-License-Identifier: EPL-2.0
// Helper 1 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the constants, the JSON writer, the LGraph Dump and the C4 Encoder.
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.*;
import org.eclipse.elk.alg.layered.graph.LEdge;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.LGraphElement;
import org.eclipse.elk.alg.layered.graph.LLabel;
import org.eclipse.elk.alg.layered.graph.LNode;
import org.eclipse.elk.alg.layered.graph.LPort;
import org.eclipse.elk.alg.layered.graph.Layer;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopHolder;
import org.eclipse.elk.alg.layered.options.InternalProperties;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.properties.IProperty;

abstract class LayeredLoopsVectorsEncoding {
    static final String OUTPUT = "layered-loops.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed", REPO_PREFIX = "repo:";
    static final String INPUTS = "test/golden/inputs/";
    /** Directories under INPUTS that hold a copy of the models repository's layout; the model path is the part after them. */
    static final List<String> INPUT_ROOTS = List.of("labels/", "loops/", "pipeline/");
    static final int MAX_DEPTH = 8, FULL_DUMP_BELOW = 10;
    static final long MAX_BYTES = (System.getenv("LOOPS_CAP_MB") == null ? 16L : LayeredLoopsVectorsSteps.parseLongArg("LOOPS_CAP_MB", System.getenv("LOOPS_CAP_MB"))) * 1024 * 1024; // LOOPS_CAP_MB: diagnosis aid, the committed output stays under 16 MiB
    static final String P1 = "P1_CYCLE_BREAKING", P2 = "P2_LAYERING", P3 = "P3_NODE_ORDERING", P4 = "P4_NODE_PLACEMENT", P5 = "P5_EDGE_ROUTING";
    /** The SelfLoopHolder property: reflected, it is about one megabyte per node (a nested object graph), so it is recorded as expected.selfLoops. */
    static final String SELF_LOOP_HOLDER_ID = InternalProperties.SELF_LOOP_HOLDER.getId();
    static final Set<String> IGNORED_IDS = Set.of("processors", "random", "spacings", "splines.route.start", SELF_LOOP_HOLDER_ID); // the spline route is recorded in geometry.splines (R3), the holder in selfLoops (W3)
    /** The refusal categories W3 allows (the members the recorder refuses), with the owning mission: 7h only. */
    static final Map<String, String> REFUSAL_CATEGORIES = new TreeMap<>();
    static {
        REFUSAL_CATEGORIES.put("INCLUDE_CHILDREN", "nested graphs (7h)");
        REFUSAL_CATEGORIES.put("HIERARCHICAL_NODE_RESIZER", "nested graphs (7h)");
    }
    static final int MAX_HASH_ORDER_SOURCES = 10;
    static int maxBfsSources = 0;
    static volatile String currentRow = "?";
    static final Map<String, Integer> REFUSED_BY_CATEGORY = new TreeMap<>();
    static final Map<String, Integer> NOT_IN_PLAN = new TreeMap<>();
    static final Set<String> SEVEN_B = Set.of("EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER", "LAYER_CONSTRAINT_PREPROCESSOR",
            "LAYER_CONSTRAINT_POSTPROCESSOR", "REVERSED_EDGE_RESTORER", "INTERACTIVE_EXTERNAL_PORT_POSITIONER",
            "NODE_PROMOTION", "HIGH_DEGREE_NODE_LAYER_PROCESSOR", "PARTITION_PREPROCESSOR", "PARTITION_MIDPROCESSOR",
            "PARTITION_POSTPROCESSOR");
    /** C2: the eight processors a default pipeline runs between P2 and P3 plus the two greedy switch arms. */
    static final Set<String> SEVEN_C = Set.of("PORT_SIDE_PROCESSOR", "PORT_LIST_SORTER", "LONG_EDGE_SPLITTER",
            "INVERTED_PORT_PROCESSOR", "NORTH_SOUTH_PORT_PREPROCESSOR", "HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR",
            "SEMI_INTERACTIVE_CROSSMIN_PROCESSOR", "SORT_BY_INPUT_ORDER_OF_MODEL", "ONE_SIDED_GREEDY_SWITCH",
            "TWO_SIDED_GREEDY_SWITCH");
    /** N1: the five processors a P4 stop needs. */
    static final Set<String> SEVEN_D = Set.of("INNERMOST_NODE_MARGIN_CALCULATOR", "LABEL_AND_NODE_SIZE_PROCESSOR",
            "IN_LAYER_CONSTRAINT_PROCESSOR", "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR", "NODE_PLACEMENT_REPEATER");
    /** R1: the six processors around the edge routers (the P5 stops). */
    static final Set<String> SEVEN_E = Set.of("HYPEREDGE_DUMMY_MERGER", "HIERARCHICAL_PORT_POSITION_PROCESSOR",
            "LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR", "LONG_EDGE_JOINER", "NORTH_SOUTH_PORT_POSTPROCESSOR",
            "FINAL_SPLINE_BENDPOINTS_CALCULATOR");
    /** F1: the six processors of 7f (GraphTransformer is two arms). */
    static final Set<String> SEVEN_F = Set.of("DIRECTION_PREPROCESSOR", "DIRECTION_POSTPROCESSOR",
            "HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER", "END_LABEL_SORTER", "HYPERNODE_PROCESSOR", "CONSTRAINTS_POSTPROCESSOR");
    /** G1: the twelve arms of 7f2 (the two label management arms are one class, told apart by their center flag). */
    static final Set<String> SEVEN_F2 = Set.of("LABEL_DUMMY_INSERTER", "LABEL_DUMMY_SWITCHER", "LABEL_SIDE_SELECTOR", "END_LABEL_PREPROCESSOR",
            "CENTER_LABEL_MANAGEMENT_PROCESSOR", "END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR", "LABEL_DUMMY_REMOVER", "END_LABEL_POSTPROCESSOR",
            "COMMENT_PREPROCESSOR", "COMMENT_NODE_MARGIN_CALCULATOR", "COMMENT_POSTPROCESSOR", "ALTERNATING_LAYER_UNZIPPER");
    /** W3: the nine arms of this brief (7g). */
    static final List<String> SELF_LOOP_STOPS = List.of("SELF_LOOP_PREPROCESSOR", "SELF_LOOP_PORT_RESTORER", "SELF_LOOP_ROUTER",
            "SELF_LOOP_POSTPROCESSOR");
    static final List<String> MULTI_EDGE_STOPS = List.of("BREAKING_POINT_INSERTER", "BREAKING_POINT_PROCESSOR", "BREAKING_POINT_REMOVER");
    static final String SINGLE_EDGE_STOP = "SINGLE_EDGE_GRAPH_WRAPPER", COMPACTOR_STOP = "HORIZONTAL_COMPACTOR";
    static final Set<String> SEVEN_G = Set.of("SELF_LOOP_PREPROCESSOR", "SELF_LOOP_PORT_RESTORER", "SELF_LOOP_ROUTER",
            "SELF_LOOP_POSTPROCESSOR", "BREAKING_POINT_INSERTER", "BREAKING_POINT_PROCESSOR", "BREAKING_POINT_REMOVER",
            "SINGLE_EDGE_GRAPH_WRAPPER", "HORIZONTAL_COMPACTOR");
    /** The routers a P5 stop can name (EdgeRouting.UNDEFINED shares the orthogonal router and is never recorded). */
    static final List<EdgeRouting> ROUTINGS = List.of(EdgeRouting.ORTHOGONAL, EdgeRouting.POLYLINE, EdgeRouting.SPLINES);
    /** N3 + G2: the stops whose rows carry the ports and labels geometry (besides rows with a flexible node); labelSizes only on SEVEN_F2. */
    static final Set<String> PORT_LABEL_STOPS = new HashSet<>(Set.of("LABEL_AND_NODE_SIZE_PROCESSOR", "HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR"));
    static {
        PORT_LABEL_STOPS.addAll(SEVEN_F2);
        PORT_LABEL_STOPS.addAll(SEVEN_G); // the self loop, wrapping and compaction arms move ports and labels
    }

    // JSON helpers

    record Raw(String json) { }

    static String json(Object v) {
        StringBuilder sb = new StringBuilder();
        write(sb, v);
        return sb.toString();
    }

    static void write(StringBuilder sb, Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof Raw r) {
            sb.append(r.json);
        } else if (v instanceof String s) {
            str(sb, s);
        } else if (v instanceof Boolean || v instanceof Integer) {
            sb.append(v);
        } else if (v instanceof Map<?, ?> m) {
            sb.append('{');
            int i = 0;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                sb.append(i++ == 0 ? "" : ",");
                str(sb, (String) e.getKey());
                sb.append(':');
                write(sb, e.getValue());
            }
            sb.append('}');
        } else if (v instanceof List<?> l) {
            sb.append('[');
            for (int i = 0; i < l.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                write(sb, l.get(i));
            }
            sb.append(']');
        } else {
            throw new IllegalStateException("unwritable value of class " + v.getClass().getName());
        }
    }

    /** 16 hex digits of Double.doubleToLongBits (raw bits; a NaN would be the canonical 7ff8000000000000, #72); the guard rejects a NaN. */
    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new LayeredLoopsVectors.Bug("NaN in a recorded value");
        }
        return String.format("%016x", Double.doubleToLongBits(d));
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

    // LGraph dump

    static final class Dump {
        final Map<Object, String> paths = new IdentityHashMap<>();
        final List<LGraph> graphs = new ArrayList<>();
        final Map<LGraph, List<LNode>> nodeLists = new IdentityHashMap<>();
        final Map<LGraph, List<LEdge>> edgeLists = new IdentityHashMap<>();
        final Encoder enc;
        Dump(LGraph root, boolean elkIds) {
            enc = new Encoder(paths, elkIds, false);
            register(root);
            for (LGraph g : new ArrayList<>(graphs)) {
                registerEdges(g);
            }
        }
        private void register(LGraph g) {
            String gp = "g" + graphs.size();
            graphs.add(g);
            paths.put(g, gp);
            List<LNode> nodes = new ArrayList<>(g.getLayerlessNodes());
            Set<LNode> seen = Collections.newSetFromMap(new IdentityHashMap<>());
            seen.addAll(nodes);
            for (Layer layer : g.getLayers()) {
                paths.put(layer, gp + "/layer" + layer.getIndex());
                for (LNode n : layer.getNodes()) {
                    if (seen.add(n)) {
                        nodes.add(n);
                    }
                }
            }
            nodeLists.put(g, nodes);
            for (int i = 0; i < nodes.size(); i++) {
                LNode n = nodes.get(i);
                String np = gp + "/n" + i;
                paths.put(n, np);
                labelPaths(n.getLabels(), np);
                for (int j = 0; j < n.getPorts().size(); j++) {
                    LPort p = n.getPorts().get(j);
                    paths.put(p, np + "/p" + j);
                    labelPaths(p.getLabels(), np + "/p" + j);
                }
                if (n.getNestedGraph() != null) {
                    register(n.getNestedGraph());
                }
            }
        }
        private void labelPaths(List<LLabel> labels, String owner) {
            for (int i = 0; i < labels.size(); i++) {
                paths.put(labels.get(i), owner + "/l" + i);
            }
        }
        private void registerEdges(LGraph g) {
            List<LEdge> edges = new ArrayList<>();
            edgeLists.put(g, edges);
            String gp = paths.get(g);
            for (LNode n : nodeLists.get(g)) {
                for (LPort p : n.getPorts()) {
                    for (List<LEdge> list : List.of(p.getOutgoingEdges(), p.getIncomingEdges())) {
                        for (LEdge e : list) {
                            if (!paths.containsKey(e)) {
                                String ep = gp + "/e" + edges.size();
                                paths.put(e, ep);
                                edges.add(e);
                                labelPaths(e.getLabels(), ep);
                            }
                        }
                    }
                }
            }
        }
        Object dump() {
            List<Object> gs = new ArrayList<>();
            for (LGraph g : graphs) {
                gs.add(graph(g));
            }
            return single("graphs", gs);
        }
        private Object graph(LGraph g) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(g));
            m.put("size", pair(g.getSize()));
            m.put("padding", quad(g.getPadding().top, g.getPadding().right, g.getPadding().bottom, g.getPadding().left));
            m.put("offset", pair(g.getOffset()));
            m.put("properties", properties(g));
            List<Object> layerless = new ArrayList<>();
            for (LNode n : g.getLayerlessNodes()) {
                layerless.add(node(n));
            }
            m.put("layerlessNodes", layerless);
            List<Object> layers = new ArrayList<>();
            for (Layer layer : g.getLayers()) {
                List<Object> inLayer = new ArrayList<>();
                layer.getNodes().forEach(n -> inLayer.add(paths.get(n)));
                layers.add(inLayer);
            }
            m.put("layers", layers);
            List<Object> edges = new ArrayList<>();
            for (LEdge e : edgeLists.get(g)) {
                edges.add(edge(e));
            }
            m.put("edges", edges);
            return m;
        }
        private Object node(LNode n) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(n));
            m.put("type", n.getType().name());
            m.put("pos", pair(n.getPosition()));
            m.put("size", pair(n.getSize()));
            m.put("margin", margin(n.getMargin()));
            m.put("padding", quad(n.getPadding().top, n.getPadding().right, n.getPadding().bottom, n.getPadding().left));
            m.put("properties", properties(n));
            List<Object> ports = new ArrayList<>();
            n.getPorts().forEach(p -> ports.add(port(p)));
            m.put("ports", ports);
            m.put("labels", labels(n.getLabels()));
            m.put("nested", n.getNestedGraph() == null ? null : paths.get(n.getNestedGraph()));
            return m;
        }
        private Object port(LPort p) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(p));
            m.put("side", p.getSide().name());
            m.put("pos", pair(p.getPosition()));
            m.put("size", pair(p.getSize()));
            m.put("anchor", pair(p.getAnchor()));
            m.put("explicitAnchor", p.isExplicitlySuppliedPortAnchor());
            m.put("connectedToExternalNodes", p.isConnectedToExternalNodes());
            m.put("margin", margin(p.getMargin()));
            m.put("properties", properties(p));
            m.put("labels", labels(p.getLabels()));
            m.put("incoming", edgePaths(p.getIncomingEdges()));
            m.put("outgoing", edgePaths(p.getOutgoingEdges()));
            return m;
        }
        private List<Object> edgePaths(List<LEdge> edges) {
            List<Object> l = new ArrayList<>();
            edges.forEach(e -> l.add(paths.get(e)));
            return l;
        }
        private Object edge(LEdge e) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(e));
            m.put("source", e.getSource() == null ? null : paths.get(e.getSource()));
            m.put("target", e.getTarget() == null ? null : paths.get(e.getTarget()));
            List<Object> bends = new ArrayList<>();
            e.getBendPoints().forEach(b -> bends.add(pair(b)));
            m.put("bendPoints", bends);
            m.put("labels", labels(e.getLabels()));
            m.put("properties", properties(e));
            return m;
        }
        private List<Object> labels(List<LLabel> labels) {
            List<Object> l = new ArrayList<>();
            for (LLabel label : labels) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("path", paths.get(label));
                m.put("text", label.getText());
                m.put("pos", pair(label.getPosition()));
                m.put("size", pair(label.getSize()));
                m.put("properties", properties(label));
                l.add(m);
            }
            return l;
        }
        private Map<String, Object> properties(LGraphElement e) {
            Map<String, Object> m = new TreeMap<>();
            for (Map.Entry<IProperty<?>, Object> entry : e.getAllProperties().entrySet()) {
                if (!entry.getKey().getId().equals(InternalProperties.SPLINE_ROUTE_START.getId())
                        && !entry.getKey().getId().equals(SELF_LOOP_HOLDER_ID)) { // R3: see geometry.splines; W3: see expected.selfLoops
                    m.put(entry.getKey().getId(), enc.encode(entry.getValue(), 0));
                }
            }
            return m;
        }
    }

    static List<Object> pair(KVector v) {
        return List.of(hex(v.x), hex(v.y));
    }

    static List<Object> quad(double top, double right, double bottom, double left) {
        return List.of(hex(top), hex(right), hex(bottom), hex(left));
    }

    static List<Object> margin(ElkMargin m) {
        return quad(m.top, m.right, m.bottom, m.left);
    }

    static Map<String, Object> single(String key, Object value) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(key, value);
        return m;
    }
    // C4 value encoding (MetaDataVectors' table) extended with element references

    static final class Encoder {
        final Map<Object, String> paths;
        final boolean elkIds, strict;
        Encoder(Map<Object, String> paths, boolean elkIds, boolean strict) {
            this.paths = paths;
            this.elkIds = elkIds;
            this.strict = strict;
        }
        Object encode(Object v, int depth) {
            if (v == null) {
                return null;
            }
            if (depth > MAX_DEPTH) {
                return unencodable(v);
            }
            if (v instanceof LGraphElement e) {
                String p = paths.get(e);
                return p == null ? unencodable(v) : single("ref", p);
            }
            if (v instanceof ElkGraphElement e) {
                return single("elk", elkIds ? e.getIdentifier() : null);
            }
            if (v instanceof Boolean) {
                return scalar("bool", v);
            } else if (v instanceof Integer) {
                return scalar("int", v);
            } else if (v instanceof String) {
                return scalar("string", v);
            } else if (v instanceof Double || v instanceof Float) {
                return scalar("double", Double.toString(((Number) v).doubleValue()));
            }
            return composite(v, depth);
        }
        private Object composite(Object v, int depth) {
            if (v instanceof Enum<?> e) {
                Map<String, Object> m = tagged("enum", typeName(e.getDeclaringClass()));
                m.put("n", e.name());
                return m;
            } else if (v instanceof EnumSet<?> s) {
                Map<String, Object> m = tagged("set", typeName(enumSetElementClass(s)));
                m.put("items", names(s));
                return m;
            } else if (v instanceof Collection<?> c) {
                return collection(c, depth);
            } else if (v instanceof Class<?> k) {
                return tagged("class", k.getSimpleName());
            }
            return object(v, depth);
        }
        private Object collection(Collection<?> c, int depth) {
            boolean refs = !c.isEmpty()
                    && c.stream().allMatch(x -> x instanceof LGraphElement || x instanceof ElkGraphElement);
            boolean list = c instanceof List;
            if (refs || (c.isEmpty() && !list)) {
                List<Object> items = new ArrayList<>();
                c.forEach(i -> items.add(encode(i, depth + 1)));
                if (!list) {
                    items.sort(Comparator.comparing(LayeredLoopsVectors::json));
                }
                return items;
            }
            if (list) {
                Map<String, Object> m = tagged("list", c.getClass().getSimpleName());
                List<Object> items = new ArrayList<>();
                c.forEach(i -> items.add(encode(i, depth + 1)));
                m.put("items", items);
                return m;
            }
            return unencodable(c);
        }
        private Object object(Object v, int depth) {
            Class<?> k = v.getClass();
            if (k.isAnonymousClass() || k.isArray() || v instanceof Number || v instanceof Map || v instanceof Set
                    || v instanceof Character || (!strict && !k.getName().startsWith("org.eclipse.elk."))) {
                return unencodable(v);
            }
            Map<String, Object> m = tagged("obj", k.getSimpleName());
            Map<String, Object> fields = new LinkedHashMap<>();
            try {
                LinkedList<Class<?>> chain = new LinkedList<>();
                for (Class<?> c = k; c != null && c != Object.class; c = c.getSuperclass()) {
                    chain.addFirst(c);
                }
                for (Class<?> c : chain) {
                    for (Field f : c.getDeclaredFields()) {
                        if (!Modifier.isStatic(f.getModifiers()) && !f.isSynthetic()) {
                            f.setAccessible(true);
                            fields.put(f.getName(), encode(f.get(v), depth + 1));
                        }
                    }
                }
            } catch (ReflectiveOperationException | RuntimeException e) {
                if (strict) {
                    throw new IllegalStateException("unencodable value of class " + k.getName(), e);
                }
                return unencodable(v);
            }
            m.put("fields", fields);
            return m;
        }
        private Object unencodable(Object v) {
            if (strict) {
                throw new IllegalStateException("unencodable value of class " + v.getClass().getName());
            }
            return single("class", v.getClass().getName());
        }
    }

    static List<Object> names(Collection<? extends Enum<?>> values) {
        List<Object> result = new ArrayList<>();
        for (Enum<?> e : values) {
            result.add(e.name());
        }
        return result;
    }

    static Map<String, Object> scalar(String type, Object value) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", type);
        m.put("v", value);
        return m;
    }

    static Map<String, Object> tagged(String type, String className) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", type);
        m.put("c", className);
        return m;
    }

    static String typeName(Class<?> k) {
        return k.getEnclosingClass() == null ? k.getSimpleName() : typeName(k.getEnclosingClass()) + "." + k.getSimpleName();
    }

    // An empty EnumSet cannot name its element class; its complement is the full set, which can.
    static Class<?> enumSetElementClass(EnumSet<?> s) {
        EnumSet<?> source = s.isEmpty() ? EnumSet.complementOf(s) : s;
        return source.iterator().next().getDeclaringClass();
    }
}
