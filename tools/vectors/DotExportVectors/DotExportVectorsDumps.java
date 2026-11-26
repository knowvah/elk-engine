// SPDX-License-Identifier: EPL-2.0
// Helper 1 of 3 of the recorder tools/vectors/DotExportVectors.java: constants, the JSON writer and the dumps (G and M).
// The helpers are one chain of superclasses (Dumps <- Mimic <- Profiles <- the entry class); the header of the entry
// file documents the program, its inputs and the ref.
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotStandaloneSetup;
import org.eclipse.elk.alg.graphviz.dot.dot.*;
import org.eclipse.elk.alg.graphviz.dot.transform.*;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.*;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.IPropertyHolder;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.Enumerator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;

@SuppressWarnings("deprecation")
class DotExportVectorsDumps {
    static final String OUTPUT = "graphviz-dot-export.json", SCENARIOS = "dot-export-scenarios", ELKT = ".elkt";
    static final String FIXTURES = "dot-graphviz-output", LAYOUTS = SCENARIOS + "/layout";
    static final String DOT = "DotExporter", SPLINE = "SplineExporter", MIMIC = "LayoutMimic";
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

    /** M: reflective dump of a DOT model object. */
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

    /** G: test/helpers/elkt-canon.ts canonGraph. */
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
            n.getContainedEdges().forEach(e -> edges.add(edge(e)));
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
            holder.getAllProperties().forEach((k, v) -> sorted.put(k.getId(), String.valueOf(v)));
            List<Object> out = new ArrayList<>();
            sorted.forEach((k, v) -> out.add(obj("id", k, "text", v)));
            return out;
        }

        static Object ref(ElkConnectableShape s) {
            return obj("kind", s instanceof ElkPort ? "port" : "node", "id", ((ElkGraphElement) s).getIdentifier());
        }

        static Map<String, Object> edge(ElkEdge e) {
            List<Object> sources = new ArrayList<>(), targets = new ArrayList<>(), sections = new ArrayList<>();
            e.getSources().forEach(s -> sources.add(ref(s)));
            e.getTargets().forEach(t -> targets.add(ref(t)));
            e.getSections().forEach(s -> sections.add(section(s)));
            return obj("identifier", e.getIdentifier(), "sources", sources, "targets", targets, "properties", props(e),
                    "labels", labels(e.getLabels()), "sections", sections);
        }

        static Map<String, Object> section(ElkEdgeSection s) {
            List<Object> bends = new ArrayList<>();
            s.getBendPoints().forEach(b -> bends.add(obj("x", d(b.getX()), "y", d(b.getY()))));
            return obj("identifier", s.getIdentifier(), "startX", d(s.getStartX()), "startY", d(s.getStartY()),
                    "endX", d(s.getEndX()), "endY", d(s.getEndY()), "bendPoints", bends,
                    "incomingShape", s.getIncomingShape() == null ? null : ref(s.getIncomingShape()),
                    "outgoingShape", s.getOutgoingShape() == null ? null : ref(s.getOutgoingShape()),
                    "incomingSections", ids(s.getIncomingSections()), "outgoingSections", ids(s.getOutgoingSections()),
                    "properties", props(s));
        }

        static List<Object> ids(List<ElkEdgeSection> sections) {
            List<String> out = new ArrayList<>();
            sections.forEach(s -> out.add(s.getIdentifier()));
            out.sort(Comparator.nullsFirst(Comparator.naturalOrder()));
            return new ArrayList<>(out);
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
