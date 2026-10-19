// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, D2 tier 3 and linking) for the ELK JSON text (.elkj) parser, linker and
// converters: what org.eclipse.elk.graph.json.text (ElkGraphJsonStandaloneSetup, ElkGraphJsonValueConverterService,
// ElkGraphJsonQualifiedNameProvider, ElkGraphJsonScopeProvider) and Xtext 2.36.0 do at the pinned ELK commit when a file
// is loaded as the oracle does (ElkModelReader.readAsElkj: doSetup(), a resource with a .elkj URI, load(InputStream)).
// This program only CALLS ELK and Xtext and records results; it embeds no ELK implementation.
// Run: tools/vectors/elkj-vectors.sh <outDir>  (java -cp ... ElkjParseVectors.java <outDir> <tools/vectors dir>)
// Registry: LayoutMetaDataService.getInstance(new ClassLoader(null) { }) first (CoreOptions only, D4).
// Inputs: <vectors dir>/elkj-parse-scenarios/<family>-<what>.elkj (id = file name minus ".elkj"). Families: lenient-*
//   (accepted lenient syntax), key-* (key spellings), shape-*, label-*, unknown-* (JsonMember), prop-* (PropertyKey and
//   PropertyValue converters), link-* (every linking site), err-syntax-*, err-conv-*.
// Linking is LAZY (D11): ElkGraphJsonRuntimeModule binds no ILinker, so LazyLinker applies: sources/targets are proxies
//   after load and resolve when read (LazyLinkingResource.getEObject); an unresolved reference then adds an
//   XtextLinkingDiagnostic to the resource. Every case is therefore loaded three times, so timing and order effects show:
//   resource 1: load, diagnosticsAtLoad, graph/properties (raw reads, no proxy resolution), proxiesAtLoad, links
//     (touches every reference in model order), diagnosticsAfterLinks, then EcoreUtil2.resolveLazyCrossReferences ->
//     diagnosticsAfterResolve (the list after both, so it holds what links added plus anything resolve added);
//   resource 2: load then ONLY resolveLazyCrossReferences -> diagnosticsAfterResolveOnly (order when nothing was touched);
//   resource 3: load then ONLY the export -> json, diagnosticsAfterExport (what the oracle's exporter surfaces).
// Output <outDir>/graph-json-text-parse.json, 2-space indent for the top level, one compact JSON case per line, trailing
// newline: { elkCommit, xtextVersion, registry: "core", cases: [ { id, input, diagnosticsAtLoad, graph, properties, links,
//   diagnosticsAfterResolve, json, diagnosticsAfterLinks, proxiesAtLoad, diagnosticsAfterResolveOnly,
//   diagnosticsAfterExport } ] }   // sorted by id
//   diagnostics = [ { kind: syntax|linking|conversion, severity: error|warning, message, line (1-based), javaClass } ],
//     getErrors() then getWarnings(), each in list order; javaClass = simple class name.
//   graph = null when the root is not an ElkNode, else the tree of ElktParseVectors without edge sources/targets:
//     node = { identifier, x, y, width, height, labels, ports, children, edges }  port = { identifier, x, y, width, height,
//     labels }  label = { identifier, text, x, y, width, height, labels }  edge = { identifier, labels, sections }
//     (sections stay empty: the grammar has no section syntax; each would be { identifier }). Doubles are Double.toString.
//   properties = [ { path, key, keyClass, valueClass, value } ] as ElktParseVectors (entry list of getProperties() of every
//     element in model order: node, labels, ports (+ labels), children recursively, containedEdges (edge, labels, sections)).
//   proxiesAtLoad = [ { path, sources: [uriFragment|null], targets: [...] } ] per edge in model order, read right after load
//     without resolution (InternalEList.basicList): the proxy URI fragment, or null for a non-proxy.
//   links = [ { path, sources: [ref], targets: [ref] } ] per edge in model order (list.get touches and so resolves);
//     ref = { kind (EClass name), id, path } for a resolved element ("<outside the graph>" when not in the tree) or
//     { proxy: true, uriFragment } for a reference that is still a proxy after access.
//   json = ElkGraphJson.forGraph(root) with the CaseRunner.export flags (omitLayout(false), omitZeroDimension(false),
//     omitZeroPositions(false), omitUnknownLayoutOptions(true), prettyPrint(true)) under system property
//     org.eclipse.elk.graph.json.exportSeed=1, or { throws: { cls, msg } } when the export fails; null without a graph.
//     An exception while loading is recorded as { throws: { cls, msg } } in diagnosticsAtLoad (all else null / empty).
// Determinism: nothing is iterated from an identity-hashed container.
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.Module;
import com.google.inject.util.Modules;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.BiConsumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import static org.eclipse.elk.graph.ElkGraphPackage.Literals.*;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.json.text.ElkGraphJsonRuntimeModule;
import org.eclipse.elk.graph.json.text.ElkGraphJsonStandaloneSetup;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.InternalEObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.InternalEList;
import org.eclipse.xtext.EcoreUtil2;
import org.eclipse.xtext.linking.impl.XtextLinkingDiagnostic;
import org.eclipse.xtext.nodemodel.SyntaxErrorMessage;
import org.eclipse.xtext.parser.antlr.ISyntaxErrorMessageProvider;
import org.eclipse.xtext.parser.antlr.SyntaxErrorMessageProvider;
import org.eclipse.xtext.resource.XtextSyntaxDiagnostic;
import org.eclipse.xtext.util.CancelIndicator;

public class ElkjParseVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String CONVERSION_CODE = "elkj.vectors.ValueConversion";
    static final String SCENARIO_DIR = "elkj-parse-scenarios", EXTENSION = ".elkj", OUTPUT = "graph-json-text-parse.json";
    static final String PATH = "path", IDENTIFIER = "identifier", LABELS = "labels", ID = "id";
    static final String SOURCES = "sources", TARGETS = "targets", OUTSIDE = "<outside the graph>";

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        // ElkGraphJsonStandaloneSetup does not register the ElkGraph EPackage: without this touch a load fails with
        // ParseException "Unresolved proxy http://www.eclipse.org/elk/ElkGraph#//ElkNode. Make sure the EPackage has been
        // registered." (the oracle has initialised the package by then: its graphs are built through ElkGraphFactory).
        ElkGraphPackage.eINSTANCE.getElkNode();
        new Setup().createInjectorAndDoEMFRegistration();
        Recorder recorder = new Recorder();
        List<Map<String, Object>> cases = new ArrayList<>();
        for (Path file : scenarioFiles(Path.of(args[1], SCENARIO_DIR))) {
            cases.add(recorder.record(file));
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
        if (keyValues.length % 2 != 0) {
            throw new IllegalArgumentException("obj needs key, value pairs; got " + keyValues.length + " arguments");
        }
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            m.put((String) keyValues[i], keyValues[i + 1]);
        }
        return m;
    }

    static Map<String, Object> thrown(Throwable e) {
        return obj("throws", obj("cls", e.getClass().getName(), "msg", e.getMessage()));
    }

    /** ElkGraphJsonStandaloneSetup with the tagging message provider bound over the runtime module. */
    static final class Setup extends ElkGraphJsonStandaloneSetup {
        @Override
        public Injector createInjector() {
            Module tagging = binder -> binder.bind(ISyntaxErrorMessageProvider.class).to(ConversionTagging.class);
            return Guice.createInjector(Modules.override(new ElkGraphJsonRuntimeModule()).with(tagging));
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

    /** One loaded scenario: the resource and its ElkNode root (null when there is none). */
    record Loaded(Resource resource, ElkNode root) { }

    /** Loads one scenario three ways and records its case. */
    static final class Recorder {
        Map<String, Object> record(Path file) throws IOException {
            String name = file.getFileName().toString();
            Map<String, Object> c = obj(ID, name.substring(0, name.length() - EXTENSION.length()), "input",
                    new String(Files.readAllBytes(file), StandardCharsets.UTF_8));
            Loaded first;
            try {
                first = load(file);
            } catch (IOException | RuntimeException e) {
                c.put("diagnosticsAtLoad", thrown(e));
                for (String key : List.of("graph", "links", "diagnosticsAfterResolve", "json", "diagnosticsAfterLinks",
                        "proxiesAtLoad", "diagnosticsAfterResolveOnly", "diagnosticsAfterExport")) {
                    c.put(key, null);
                }
                c.put("properties", List.of());
                return c;
            }
            c.put("diagnosticsAtLoad", diagnostics(first.resource()));
            Graphs g = first.root() == null ? null : new Graphs(new Tree(first.root()));
            c.put("graph", g == null ? null : g.node(g.tree.root));
            c.put("properties", g == null ? List.of() : g.properties());
            c.put("proxiesAtLoad", g == null ? List.of() : g.proxiesAtLoad());
            c.put("links", g == null ? List.of() : g.links());
            c.put("diagnosticsAfterLinks", diagnostics(first.resource()));
            EcoreUtil2.resolveLazyCrossReferences(first.resource(), CancelIndicator.NullImpl);
            c.put("diagnosticsAfterResolve", diagnostics(first.resource()));
            Loaded second = load(file);
            EcoreUtil2.resolveLazyCrossReferences(second.resource(), CancelIndicator.NullImpl);
            c.put("diagnosticsAfterResolveOnly", diagnostics(second.resource()));
            Loaded third = load(file);
            c.put("json", third.root() == null ? null : export(third.root()));
            c.put("diagnosticsAfterExport", diagnostics(third.resource()));
            return c;
        }

        /** The oracle's load (ElkModelReader.readAsElkj): a resource with a .elkj URI, load(InputStream). */
        static Loaded load(Path file) throws IOException {
            Resource resource = new ResourceSetImpl().createResource(URI.createFileURI(file.toAbsolutePath().toString()));
            try (InputStream in = Files.newInputStream(file)) {
                resource.load(in, Collections.emptyMap());
            }
            EObject root = resource.getContents().isEmpty() ? null : resource.getContents().get(0);
            return new Loaded(resource, root instanceof ElkNode n ? n : null);
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
                return thrown(e);
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

    /** Builds graph, properties, proxiesAtLoad and links from a tree. */
    static final class Graphs {
        final Tree tree;

        Graphs(Tree tree) {
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
                Map<String, Object> m = shape(l, l);
                m.put("text", l.getText());
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

        /** Without sources/targets: reading them would resolve the lazy references. */
        Map<String, Object> edge(ElkEdge e) {
            List<Object> sections = new ArrayList<>();
            e.getSections().forEach(s -> sections.add(obj(IDENTIFIER, s.getIdentifier())));
            return obj(IDENTIFIER, e.getIdentifier(), LABELS, labels(e), "sections", sections);
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

        @SuppressWarnings("unchecked")
        static List<EObject> raw(ElkEdge edge, org.eclipse.emf.ecore.EReference reference) {
            return new ArrayList<>((List<EObject>) ((InternalEList<?>) edge.eGet(reference, false)).basicList());
        }

        static String fragment(EObject target) {
            return target.eIsProxy() ? ((InternalEObject) target).eProxyURI().fragment() : null;
        }

        List<Object> proxiesAtLoad() {
            List<Object> out = new ArrayList<>();
            for (Item item : tree.items) {
                if (item.element() instanceof ElkEdge e) {
                    List<Object> sources = new ArrayList<>(), targets = new ArrayList<>();
                    raw(e, ELK_EDGE__SOURCES).forEach(t -> sources.add(fragment(t)));
                    raw(e, ELK_EDGE__TARGETS).forEach(t -> targets.add(fragment(t)));
                    out.add(obj(PATH, item.path(), SOURCES, sources, TARGETS, targets));
                }
            }
            return out;
        }

        List<Object> links() {
            List<Object> out = new ArrayList<>();
            for (Item item : tree.items) {
                if (item.element() instanceof ElkEdge e) {
                    List<Object> sources = new ArrayList<>(), targets = new ArrayList<>();
                    for (int i = 0; i < e.getSources().size(); i++) {
                        sources.add(link(e.getSources().get(i)));
                    }
                    for (int i = 0; i < e.getTargets().size(); i++) {
                        targets.add(link(e.getTargets().get(i)));
                    }
                    out.add(obj(PATH, item.path(), SOURCES, sources, TARGETS, targets));
                }
            }
            return out;
        }

        Object link(EObject target) {
            if (target.eIsProxy()) {
                return obj("proxy", true, "uriFragment", fragment(target));
            }
            return obj("kind", target.eClass().getName(), ID, ((ElkGraphElement) target).getIdentifier(), PATH,
                    tree.paths.getOrDefault(target, OUTSIDE));
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
