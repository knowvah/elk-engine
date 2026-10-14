// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, G5/G7) for the ELK Text (.elkt) parser, linker and scoping: what
// org.eclipse.elk.graph.text (ElkGraphStandaloneSetup, ElkGraphLinker, ElkGraphScopeProvider, ElkGraphQualifiedNameProvider,
// the value converters) and Xtext 2.36.0 do at the pinned ELK commit when a file is loaded exactly as the oracle does
// (ElkModelReader.readElkt: doSetup(), ResourceSetImpl.getResource(fileURI, true)). This program only CALLS ELK and Xtext and
// records results; it embeds no ELK implementation.
// Run: tools/vectors/elkt-vectors.sh <outDir>  (java -cp ... ElktParseVectors.java <outDir> <tools/vectors dir>)
// Registry: LayoutMetaDataService.getInstance(new ClassLoader(null) { }) first (CoreOptions only, G3).
// Inputs: <vectors dir>/elkt-parse-scenarios/<family>-<what>.elkt (id = file name minus ".elkt"). Families: grammar-*
//   (every rule of ElkGraph.xtext), scope-* (endpoints, qualified names, outgoingSections), prop-* (PropertyKey and
//   PropertyValue converters), err-link-* (every linking site), err-conv-* (converter errors), err-syntax-* (parser/lexer).
// Reachable value-converter errors (kind conversion; XtextSyntaxDiagnostic from handleValueConverterException): Number
//   "Cannot convert empty string to a double value." (a missing number token, err-conv-number-*); STRING "Invalid escape
//   sequence (...)" and "Invalid unicode" (err-conv-string-*). Not reachable from source text: the Number
//   NumberFormatException (the lexer only yields tokens Double.valueOf accepts), PropertyKey's "empty string" error
//   (a missing key is a parser error, never a converter call), ID (never throws), PropertyValue (null/empty yield null;
//   a LayoutOptionData.parseValue failure leaves a LayoutOptionProxy, prop-known-*). An unclosed string is a lexer error
//   (kind syntax, err-syntax-string-*). The Property value converter does not unescape (prop-unknown-value-string-*).
// Diagnostic kind: a ISyntaxErrorMessageProvider subclass is bound over the runtime module (Modules.override). Its
//   IValueConverterErrorContext overload returns the default message and issue data with the issue code
//   "elkt.vectors.ValueConversion"; message text, line and node are untouched. kind = linking for
//   XtextLinkingDiagnostic, conversion for an XtextSyntaxDiagnostic carrying that code, syntax otherwise.
//   Linking is eager (ElkGraphLinker extends Linker): diagnostics exist right after load; nothing is resolved afterwards.
// Output <outDir>/graph-text-parse.json, 2-space indent for the top level, one compact JSON case per line, trailing newline:
//   { elkCommit, xtextVersion, registry: "core",
//     cases: [ { id, input, diagnostics, graph, properties, connections, json } ] }   // sorted by id
//   diagnostics = [ { kind: syntax|linking|conversion, severity: error|warning, message, line (1-based), javaClass } ],
//     getErrors() then getWarnings(), each in list order; javaClass = simple class name.
//   graph = null when the root is not an ElkNode, else the tree G of GraphJsonVectors without its "properties" key:
//     node  = { identifier, x, y, width, height, labels, ports, children, edges }   // edges = containedEdges
//     port  = { identifier, x, y, width, height, labels }
//     label = { identifier, text, x, y, width, height, labels }
//     edge  = { identifier, sources: [ref], targets: [ref], labels, sections: [section] }
//     section = { identifier, startX, startY, endX, endY, bendPoints: [{x, y}], incomingShape: ref|null,
//                 outgoingShape: ref|null, incomingSections: [identifier], outgoingSections: [identifier] }
//     doubles are Double.toString text. ref = { kind: node|port, id } or { unresolved: linkText } for an unresolved
//     proxy (also inside the identifier lists); the JVM linker leaves none (an unresolved or wrong-typed endpoint is
//     simply absent from the list), the branch only guards that observation. Reference lists are in list order, never
//     sorted; they are read without proxy resolution (InternalEList.basicList / eGet(ref, false)).
//   properties = [ { path, key, keyClass, valueClass, value } ] for every entry of getProperties() (the entry list, never
//     getAllProperties()) of every element, elements in model order: node, its labels, ports (each followed by its labels),
//     children (recursively), containedEdges (each: edge, its labels, its sections). path = containment path from the
//     root as feature[index] segments ("children[1]/containedEdges[0]/sections[0]"), "" for the root. key = getId(),
//     keyClass/valueClass = simple class names (an Enum is reported by its declaring class), value = String.valueOf,
//     a null value is JSON null with valueClass null.
//   connections = one entry per node, port, edge and section, same order and paths as properties:
//     node/port = { path, incomingEdges: [edgePath], outgoingEdges: [edgePath] }      // the opposites, in list order
//     edge      = { path, sources: [ref], targets: [ref] }
//     section   = { path, incomingShape: ref|null, outgoingShape: ref|null, incomingSections: [sectionPath],
//                   outgoingSections: [sectionPath] }
//     ref in connections = the element path the endpoint resolved to, or { unresolved: linkText }.
//   json = ElkGraphJson.forGraph(root) with the CaseRunner.export flags (omitLayout(false), omitZeroDimension(false),
//     omitZeroPositions(false), omitUnknownLayoutOptions(true), prettyPrint(true)) under system property
//     org.eclipse.elk.graph.json.exportSeed=1, or { throws: { cls, msg } } when the export fails; null without a graph.
// Determinism: nothing is iterated from an identity-hashed container; opposite lists are recorded in their list order.
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.Module;
import com.google.inject.util.Modules;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.BiConsumer;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import static org.eclipse.elk.graph.ElkGraphPackage.Literals.*;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.text.ElkGraphRuntimeModule;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EReference;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.InternalEList;
import org.eclipse.xtext.linking.impl.LinkingHelper;
import org.eclipse.xtext.linking.impl.XtextLinkingDiagnostic;
import org.eclipse.xtext.nodemodel.INode;
import org.eclipse.xtext.nodemodel.SyntaxErrorMessage;
import org.eclipse.xtext.nodemodel.util.NodeModelUtils;
import org.eclipse.xtext.parser.antlr.ISyntaxErrorMessageProvider;
import org.eclipse.xtext.parser.antlr.SyntaxErrorMessageProvider;
import org.eclipse.xtext.resource.XtextSyntaxDiagnostic;

public class ElktParseVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String CONVERSION_CODE = "elkt.vectors.ValueConversion";
    static final String SCENARIO_DIR = "elkt-parse-scenarios", EXTENSION = ".elkt", OUTPUT = "graph-text-parse.json";
    static final String PATH = "path", IDENTIFIER = "identifier", LABELS = "labels", UNRESOLVED = "unresolved";
    static final String INCOMING_SHAPE = "incomingShape", OUTGOING_SHAPE = "outgoingShape";
    static final String INCOMING_SECTIONS = "incomingSections", OUTGOING_SECTIONS = "outgoingSections";
    static final String SOURCES = "sources", TARGETS = "targets", ID = "id";

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        Injector injector = new Setup().createInjectorAndDoEMFRegistration();
        Recorder recorder = new Recorder(new Refs(injector.getInstance(LinkingHelper.class)));
        List<Map<String, Object>> cases = new ArrayList<>();
        for (Path file : scenarioFiles(Path.of(args[1], SCENARIO_DIR))) {
            cases.add(recorder.record(file));
        }
        if (!recorder.sawControlCharacter) {
            throw new IllegalStateException("no decoded control character in any label text: escapes were not decoded");
        }
        cases.sort(Comparator.comparing(c -> (String) c.get(ID)));
        write(Path.of(args[0], OUTPUT), cases);
    }

    static List<Path> scenarioFiles(Path dir) throws IOException {
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(p -> p.getFileName().toString().endsWith(EXTENSION)).sorted().toList();
        }
    }

    static void write(Path out, List<Map<String, Object>> cases) throws IOException {
        StringBuilder sb = new StringBuilder("{\n");
        sb.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        sb.append("  \"xtextVersion\": \"").append(xtextVersion()).append("\",\n");
        sb.append("  \"registry\": \"core\",\n  \"cases\": [\n");
        for (int i = 0; i < cases.size(); i++) {
            sb.append("    ");
            Json.write(sb, cases.get(i));
            sb.append(i + 1 < cases.size() ? ",\n" : "\n");
        }
        Files.createDirectories(out.getParent());
        Files.writeString(out, sb.append("  ]\n}\n"), StandardCharsets.UTF_8);
    }

    /** The version directory of the Xtext bundle jar on the classpath, e.g. 2.36.0. */
    static String xtextVersion() {
        String location = XtextSyntaxDiagnostic.class.getProtectionDomain().getCodeSource().getLocation().toString();
        Matcher m = Pattern.compile("org\\.eclipse\\.xtext/(\\d+\\.\\d+\\.\\d+)").matcher(location);
        if (!m.find()) {
            throw new IllegalStateException("cannot read the Xtext version from " + location);
        }
        return m.group(1);
    }

    /** Insertion-ordered object from alternating key, value arguments. */
    static Map<String, Object> obj(Object... keyValues) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            m.put((String) keyValues[i], keyValues[i + 1]);
        }
        return m;
    }

    /** ElkGraphStandaloneSetup with the tagging message provider bound over the runtime module. */
    static final class Setup extends ElkGraphStandaloneSetup {
        @Override
        public Injector createInjector() {
            Module tagging = binder -> binder.bind(ISyntaxErrorMessageProvider.class).to(ConversionTagging.class);
            return Guice.createInjector(Modules.override(new ElkGraphRuntimeModule()).with(tagging));
        }
    }

    /** Default messages everywhere; value-converter failures additionally carry CONVERSION_CODE. */
    public static class ConversionTagging extends SyntaxErrorMessageProvider {
        @Override
        public SyntaxErrorMessage getSyntaxErrorMessage(IValueConverterErrorContext context) {
            SyntaxErrorMessage m = super.getSyntaxErrorMessage(context);
            return new SyntaxErrorMessage(m.getMessage(), CONVERSION_CODE, m.getIssueData());
        }
    }

    /** Loads one scenario and records its case. */
    static final class Recorder {
        final Refs refs;
        boolean sawControlCharacter;

        Recorder(Refs refs) {
            this.refs = refs;
        }

        Map<String, Object> record(Path file) throws IOException {
            String name = file.getFileName().toString();
            Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
            EObject root = resource.getContents().isEmpty() ? null : resource.getContents().get(0);
            Map<String, Object> c = obj(ID, name.substring(0, name.length() - EXTENSION.length()), "input",
                    Files.readString(file, StandardCharsets.UTF_8), "diagnostics", diagnostics(resource));
            Graphs g = root instanceof ElkNode n ? new Graphs(refs, new Tree(n)) : null;
            c.put("graph", g == null ? null : g.node(g.tree.root));
            c.put("properties", g == null ? List.of() : g.properties());
            c.put("connections", g == null ? List.of() : g.connections());
            c.put("json", g == null ? null : export(g.tree.root));
            sawControlCharacter |= g != null && g.sawControlCharacter;
            return c;
        }

        static List<Object> diagnostics(Resource resource) {
            List<Object> out = new ArrayList<>();
            resource.getErrors().forEach(d -> out.add(diagnostic(d, "error")));
            resource.getWarnings().forEach(d -> out.add(diagnostic(d, "warning")));
            return out;
        }

        static Map<String, Object> diagnostic(Resource.Diagnostic d, String severity) {
            return obj("kind", kind(d), "severity", severity, "message", d.getMessage(), "line", d.getLine(),
                    "javaClass", d.getClass().getSimpleName());
        }

        static String kind(Resource.Diagnostic d) {
            if (d instanceof XtextLinkingDiagnostic) {
                return "linking";
            }
            boolean conversion = d instanceof XtextSyntaxDiagnostic s && CONVERSION_CODE.equals(s.getCode());
            return conversion ? "conversion" : "syntax";
        }

        static Object export(ElkNode root) {
            try {
                return ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                        .omitUnknownLayoutOptions(true).prettyPrint(true).toJson();
            } catch (Exception e) {
                return obj("throws", obj("cls", e.getClass().getName(), "msg", e.getMessage()));
            }
        }
    }

    /** One recorded element and its containment path. */
    record Item(String path, EObject element) { }

    /** Elements of the graph in the documented model order, with the containment path of each. */
    static final class Tree {
        final ElkNode root;
        final List<Item> items = new ArrayList<>();
        final Map<EObject, String> paths = new IdentityHashMap<>();

        Tree(ElkNode root) {
            this.root = root;
            node(root, "");
        }

        private void add(EObject element, String path) {
            items.add(new Item(path, element));
            paths.put(element, path);
        }

        private <T extends EObject> void each(List<T> list, String feature, String parent, BiConsumer<T, String> body) {
            for (int i = 0; i < list.size(); i++) {
                body.accept(list.get(i), (parent.isEmpty() ? "" : parent + "/") + feature + "[" + i + "]");
            }
        }

        private void labelsOf(ElkGraphElement owner, String path) {
            each(owner.getLabels(), LABELS, path, (label, p) -> {
                add(label, p);
                labelsOf(label, p);
            });
        }

        private void node(ElkNode node, String path) {
            add(node, path);
            labelsOf(node, path);
            each(node.getPorts(), "ports", path, (port, p) -> {
                add(port, p);
                labelsOf(port, p);
            });
            each(node.getChildren(), "children", path, this::node);
            each(node.getContainedEdges(), "containedEdges", path, this::edge);
        }

        private void edge(ElkEdge edge, String path) {
            add(edge, path);
            labelsOf(edge, path);
            each(edge.getSections(), "sections", path, this::add);
        }
    }

    /** Reads cross-references without resolving proxies and renders them. */
    static final class Refs {
        final LinkingHelper linkingHelper;

        Refs(LinkingHelper linkingHelper) {
            this.linkingHelper = linkingHelper;
        }

        @SuppressWarnings("unchecked")
        static List<EObject> raw(EObject owner, EReference reference) {
            Object value = owner.eGet(reference, false);
            if (value instanceof InternalEList<?> list) {
                return new ArrayList<>((List<EObject>) list.basicList());
            }
            return value == null ? List.of() : List.of((EObject) value);
        }

        String linkText(EObject owner, EReference reference, int index) {
            List<INode> nodes = NodeModelUtils.findNodesForFeature(owner, reference);
            return index < nodes.size() ? linkingHelper.getCrossRefNodeAsString(nodes.get(index), true) : "";
        }

        /** The rendered targets of one reference; render maps a resolved target, a proxy becomes {unresolved}. */
        List<Object> targets(EObject owner, EReference reference, Function<EObject, Object> render) {
            List<EObject> raw = raw(owner, reference);
            List<Object> out = new ArrayList<>();
            for (int i = 0; i < raw.size(); i++) {
                EObject t = raw.get(i);
                out.add(t.eIsProxy() ? obj(UNRESOLVED, linkText(owner, reference, i)) : render.apply(t));
            }
            return out;
        }

        /** A single-valued reference: null when unset. */
        Object single(EObject owner, EReference reference, Function<EObject, Object> render) {
            List<Object> all = targets(owner, reference, render);
            return all.isEmpty() ? null : all.get(0);
        }
    }

    /** Builds graph, properties and connections from a tree. */
    static final class Graphs {
        final Refs refs;
        final Tree tree;
        boolean sawControlCharacter;

        Graphs(Refs refs, Tree tree) {
            this.refs = refs;
            this.tree = tree;
        }

        static String d(double value) {
            return Double.toString(value);
        }

        Map<String, Object> shape(ElkGraphElement e, ElkShape s) {
            return obj(IDENTIFIER, e.getIdentifier(), "x", d(s.getX()), "y", d(s.getY()), "width", d(s.getWidth()),
                    "height", d(s.getHeight()));
        }

        List<Object> labels(ElkGraphElement owner) {
            List<Object> out = new ArrayList<>();
            for (ElkLabel l : owner.getLabels()) {
                String text = l.getText();
                sawControlCharacter |= text != null && text.chars().anyMatch(ch -> ch < ' ');
                Map<String, Object> m = shape(l, l);
                m.put("text", text);
                m.put(LABELS, labels(l));
                out.add(m);
            }
            return out;
        }

        Map<String, Object> node(ElkNode n) {
            Map<String, Object> m = shape(n, n);
            List<Object> ports = new ArrayList<>(), children = new ArrayList<>(), edges = new ArrayList<>();
            n.getPorts().forEach(p -> ports.add(port(p)));
            n.getChildren().forEach(c -> children.add(node(c)));
            n.getContainedEdges().forEach(e -> edges.add(edge(e)));
            m.put(LABELS, labels(n));
            m.put("ports", ports);
            m.put("children", children);
            m.put("edges", edges);
            return m;
        }

        Map<String, Object> port(ElkPort p) {
            Map<String, Object> m = shape(p, p);
            m.put(LABELS, labels(p));
            return m;
        }

        Object shapeRef(EObject target) {
            return obj("kind", target instanceof ElkPort ? "port" : "node", ID, ((ElkGraphElement) target).getIdentifier());
        }

        Map<String, Object> edge(ElkEdge e) {
            List<Object> sections = new ArrayList<>();
            e.getSections().forEach(s -> sections.add(section(s)));
            return obj(IDENTIFIER, e.getIdentifier(), SOURCES, refs.targets(e, ELK_EDGE__SOURCES, this::shapeRef),
                    TARGETS, refs.targets(e, ELK_EDGE__TARGETS, this::shapeRef), LABELS, labels(e), "sections", sections);
        }

        Map<String, Object> section(ElkEdgeSection s) {
            List<Object> bends = new ArrayList<>();
            s.getBendPoints().forEach(b -> bends.add(obj("x", d(b.getX()), "y", d(b.getY()))));
            Function<EObject, Object> ident = t -> ((ElkEdgeSection) t).getIdentifier();
            return obj(IDENTIFIER, s.getIdentifier(), "startX", d(s.getStartX()), "startY", d(s.getStartY()),
                    "endX", d(s.getEndX()), "endY", d(s.getEndY()), "bendPoints", bends,
                    INCOMING_SHAPE, refs.single(s, ELK_EDGE_SECTION__INCOMING_SHAPE, this::shapeRef),
                    OUTGOING_SHAPE, refs.single(s, ELK_EDGE_SECTION__OUTGOING_SHAPE, this::shapeRef),
                    INCOMING_SECTIONS, refs.targets(s, ELK_EDGE_SECTION__INCOMING_SECTIONS, ident),
                    OUTGOING_SECTIONS, refs.targets(s, ELK_EDGE_SECTION__OUTGOING_SECTIONS, ident));
        }

        List<Object> properties() {
            List<Object> out = new ArrayList<>();
            for (Item item : tree.items) {
                for (Map.Entry<IProperty<?>, Object> e : ((EMapPropertyHolder) item.element()).getProperties()) {
                    IProperty<?> key = e.getKey();
                    Object value = e.getValue();
                    out.add(obj(PATH, item.path(), "key", key == null ? null : key.getId(), "keyClass",
                            key == null ? null : key.getClass().getSimpleName(), "valueClass", valueClass(value),
                            "value", value == null ? null : String.valueOf(value)));
                }
            }
            return out;
        }

        static String valueClass(Object value) {
            if (value == null) {
                return null;
            }
            return value instanceof Enum<?> e ? e.getDeclaringClass().getSimpleName() : value.getClass().getSimpleName();
        }

        List<Object> connections() {
            List<Object> out = new ArrayList<>();
            for (Item item : tree.items) {
                EObject e = item.element();
                if (e instanceof ElkConnectableShape shape) {
                    out.add(obj(PATH, item.path(), "incomingEdges", pathsOf(shape.getIncomingEdges()), "outgoingEdges",
                            pathsOf(shape.getOutgoingEdges())));
                } else if (e instanceof ElkEdge edge) {
                    out.add(obj(PATH, item.path(), SOURCES, refs.targets(edge, ELK_EDGE__SOURCES, this::pathOf),
                            TARGETS, refs.targets(edge, ELK_EDGE__TARGETS, this::pathOf)));
                } else if (e instanceof ElkEdgeSection s) {
                    out.add(obj(PATH, item.path(), INCOMING_SHAPE, refs.single(s, ELK_EDGE_SECTION__INCOMING_SHAPE, this::pathOf),
                            OUTGOING_SHAPE, refs.single(s, ELK_EDGE_SECTION__OUTGOING_SHAPE, this::pathOf),
                            INCOMING_SECTIONS, refs.targets(s, ELK_EDGE_SECTION__INCOMING_SECTIONS, this::pathOf),
                            OUTGOING_SECTIONS, refs.targets(s, ELK_EDGE_SECTION__OUTGOING_SECTIONS, this::pathOf)));
                }
            }
            return out;
        }

        Object pathOf(EObject target) {
            return tree.paths.getOrDefault(target, "<outside the graph>");
        }

        List<Object> pathsOf(List<? extends EObject> list) {
            List<Object> out = new ArrayList<>();
            list.forEach(t -> out.add(pathOf(t)));
            return out;
        }
    }

    // ---- compact JSON writer ----
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

        private static void string(StringBuilder sb, String s) {
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
