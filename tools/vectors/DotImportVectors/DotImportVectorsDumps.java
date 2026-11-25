// SPDX-License-Identifier: EPL-2.0
// Helper 1 of 1 of the recorder tools/vectors/DotImportVectors.java: the JSON writer, the element tree with its paths, and
// the dumps (G, EDGE and M). The header of the entry file documents the program, its inputs and the ref.
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.properties.IPropertyHolder;
import org.eclipse.elk.graph.util.ElkGraphUtil;
import org.eclipse.emf.common.util.Enumerator;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.xtext.resource.XtextResource;

class DotImportVectorsDumps {
    static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]{4,}");

    /** Insertion-ordered object from alternating key, value arguments. */
    static Map<String, Object> obj(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        // Key and value alternate, so i + 1 < length is the same bound as i < length; written out so the pair access
        // below is visibly in bounds.
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }

    static Map<String, Object> thrown(Throwable e) {
        String message = e.getMessage() == null ? null : IDENTITY_HASH.matcher(e.getMessage()).replaceAll("@<hash>");
        return obj("class", e.getClass().getName(), "message", message);
    }

    static String xtextVersion() {
        String location = XtextResource.class.getProtectionDomain().getCodeSource().getLocation().toString();
        Matcher m = Pattern.compile("org\\.eclipse\\.xtext/(\\d+\\.\\d+\\.\\d+)").matcher(location);
        if (!m.find()) {
            throw new IllegalStateException("cannot read the Xtext version from " + location);
        }
        return m.group(1);
    }

    /** The nodes of a target graph in pre-order with their paths, and its edges in EDGE order. */
    static final class Tree {
        final List<ElkNode> nodes = new ArrayList<>();
        final List<ElkEdge> edges = new ArrayList<>();
        final Map<EObject, String> paths = new IdentityHashMap<>();

        Tree(ElkNode root) {
            node(root, "");
            Set<ElkEdge> seen = Collections.newSetFromMap(new IdentityHashMap<>());
            for (ElkNode n : nodes) {
                for (ElkEdge e : ElkGraphUtil.allOutgoingEdges(n)) {
                    if (seen.add(e)) {
                        edges.add(e);
                        paths.put(e, "edges[" + (edges.size() - 1) + "]");
                    }
                }
            }
        }

        private static String child(String parent, String feature, int index) {
            return (parent.isEmpty() ? "" : parent + "/") + feature + "[" + index + "]";
        }

        private void node(ElkNode n, String path) {
            nodes.add(n);
            paths.put(n, path);
            for (int i = 0; i < n.getPorts().size(); i++) {
                paths.put(n.getPorts().get(i), child(path, "ports", i));
            }
            for (int i = 0; i < n.getChildren().size(); i++) {
                node(n.getChildren().get(i), child(path, "children", i));
            }
        }

        String pathOf(EObject o) {
            return paths.getOrDefault(o, "<outside the graph>");
        }

        List<Object> edgeDumps() {
            List<Object> out = new ArrayList<>();
            for (ElkEdge e : edges) {
                List<Object> sources = new ArrayList<>(), targets = new ArrayList<>(), sections = new ArrayList<>();
                e.getSources().forEach(s -> sources.add(pathOf(s)));
                e.getTargets().forEach(t -> targets.add(pathOf(t)));
                e.getSections().forEach(s -> sections.add(Canon.section(s)));
                ElkNode container = e.getContainingNode();
                out.add(obj("path", pathOf(e), "sources", sources, "targets", targets, "containingNode",
                        container == null ? null : pathOf(container), "properties", Canon.props(e),
                        "labels", Canon.labels(e.getLabels()), "sections", sections));
            }
            return out;
        }
    }

    /** M: reflective dump of a DOT model object (DotExportVectors' ModelDump). */
    static final class ModelDump {
        static Object dump(EObject o) {
            if (o == null) {
                return null;
            }
            Map<String, Object> m = obj("eClass", o.eClass().getName());
            for (EStructuralFeature f : o.eClass().getEAllStructuralFeatures()) {
                m.put(f.getName(), value(o.eGet(f)));
            }
            return m;
        }

        static Object value(Object v) {
            if (v instanceof EObject e) {
                return dump(e);
            }
            if (v instanceof List<?> list) {
                List<Object> out = new ArrayList<>();
                list.forEach(x -> out.add(value(x)));
                return out;
            }
            if (v instanceof Enumerator en) {
                return en.getName();
            }
            return v;
        }
    }

    /** G: test/helpers/elkt-canon.ts canonGraph, with the EObject property text of the entry header. */
    static final class Canon {
        static Map<String, Object> node(ElkNode n) {
            Map<String, Object> m = shape(n);
            m.put("properties", props(n));
            m.put("labels", labels(n.getLabels()));
            List<Object> ports = new ArrayList<>(), children = new ArrayList<>(), edges = new ArrayList<>();
            for (ElkPort p : n.getPorts()) {
                Map<String, Object> pm = shape(p);
                pm.put("properties", props(p));
                pm.put("labels", labels(p.getLabels()));
                ports.add(pm);
            }
            n.getChildren().forEach(c -> children.add(node(c)));
            n.getContainedEdges().forEach(e -> edges.add(e.getIdentifier()));
            m.put("ports", ports);
            m.put("children", children);
            m.put("edges", edges);
            return m;
        }

        static Map<String, Object> shape(ElkShape s) {
            return obj("identifier", ((ElkGraphElement) s).getIdentifier(), "x", d(s.getX()), "y", d(s.getY()),
                    "width", d(s.getWidth()), "height", d(s.getHeight()));
        }

        static String d(double v) {
            return Double.toString(v);
        }

        static List<Object> labels(List<ElkLabel> labels) {
            List<Object> out = new ArrayList<>();
            for (ElkLabel l : labels) {
                Map<String, Object> m = obj("text", l.getText(), "x", d(l.getX()), "y", d(l.getY()), "width",
                        d(l.getWidth()), "height", d(l.getHeight()));
                m.put("properties", props(l));
                m.put("labels", labels(l.getLabels()));
                out.add(m);
            }
            return out;
        }

        static List<Object> props(IPropertyHolder holder) {
            TreeMap<String, String> sorted = new TreeMap<>();
            holder.getAllProperties().forEach((k, v) -> sorted.put(k.getId(), text(v)));
            List<Object> out = new ArrayList<>();
            sorted.forEach((k, v) -> out.add(obj("id", k, "text", v)));
            return out;
        }

        static String text(Object v) {
            return v instanceof EObject o ? o.eClass().getName() + "@" + modelPath(o) : String.valueOf(v);
        }

        /** feature[index] segments from the GraphvizModel down to o, or "detached". */
        static String modelPath(EObject o) {
            Deque<String> segments = new ArrayDeque<>();
            EObject e = o;
            while (e.eContainer() != null) {
                EStructuralFeature f = e.eContainingFeature();
                Object value = e.eContainer().eGet(f);
                segments.addFirst(f.getName() + (f.isMany() ? "[" + ((List<?>) value).indexOf(e) + "]" : ""));
                e = e.eContainer();
            }
            return e.eClass().getName().equals("GraphvizModel") ? String.join("/", segments) : "detached";
        }

        static Map<String, Object> section(ElkEdgeSection s) {
            List<Object> bends = new ArrayList<>();
            s.getBendPoints().forEach(b -> bends.add(obj("x", d(b.getX()), "y", d(b.getY()))));
            return obj("identifier", s.getIdentifier(), "startX", d(s.getStartX()), "startY", d(s.getStartY()),
                    "endX", d(s.getEndX()), "endY", d(s.getEndY()), "bendPoints", bends, "properties", props(s));
        }
    }

    /** Compact JSON writer (the one of ElktParseVectors). */
    static final class Json {
        static void write(StringBuilder sb, Object v) {
            if (v == null) {
                sb.append("null");
            } else if (v instanceof Map<?, ?> m) {
                sb.append('{');
                int i = 0;
                for (Map.Entry<?, ?> e : m.entrySet()) {
                    sb.append(i++ == 0 ? "" : ",");
                    string(sb, e.getKey().toString());
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
            } else if (v instanceof Number || v instanceof Boolean) {
                sb.append(v);
            } else {
                string(sb, v.toString());
            }
        }

        static void string(StringBuilder sb, String s) {
            sb.append('"');
            for (char c : s.toCharArray()) {
                switch (c) {
                    case '"' -> sb.append("\\\"");
                    case '\\' -> sb.append("\\\\");
                    case '\n' -> sb.append("\\n");
                    case '\r' -> sb.append("\\r");
                    case '\t' -> sb.append("\\t");
                    default -> sb.append(c < ' ' || Character.isSurrogate(c) ? String.format("\\u%04x", (int) c) : String.valueOf(c));
                }
            }
            sb.append('"');
        }
    }
}
