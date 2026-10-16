// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, D13 risk 2, T12h) for the INVERSE state of .elkj lazy linking: which
// connectable shapes hold which edges in outgoingEdges/incomingEdges after each way of touching the lazy references.
// This program only CALLS ELK, EMF and Xtext and records results; it embeds no ELK implementation. Setup is that of
// ElkjParseVectors (CoreOptions-only registry D4, ElkGraphPackage touch before the first load, tagging-free Setup,
// load as ElkModelReader.readAsElkj does: .elkj URI, load(InputStream)).
// Run: tools/vectors/elkj-vectors.sh <outDir>  (java -cp ... ElkjInverseVectors.java <outDir> <tools/vectors dir>)
// Inputs: every <vectors dir>/elkj-parse-scenarios/link-*.elkj plus lenient-elk-json-source-target and
//   lenient-plain-elk-json (id = file name minus ".elkj").
// Output <outDir>/graph-json-text-inverse.json, 2-space indent at the top level, one compact JSON case per line, trailing
// newline: { elkCommit, xtextVersion, registry: "core", cases: [ { id, input, afterLoad, afterAccess, afterResolve,
//   afterExport } ] } sorted by id. Each state is { shapes, edges, errors, throws } over its OWN fresh load:
//   afterLoad    load only, nothing touched;
//   afterAccess  every edge's sources then targets read through list.get(i) in model order (EcoreEList.resolve path);
//   afterResolve EcoreUtil2.resolveLazyCrossReferences(resource, NullImpl) only (LazyLinkingResource setUnique path);
//   afterExport  ElkGraphJson.forGraph(root) with the parse-vector export flags and exportSeed=1, result discarded;
//                `throws` = { cls, msg } when the export failed, else null (always null in the other three states).
// Raw reads (never resolving), by API:
//   shape outgoingEdges / incomingEdges : ((InternalEList) shape.eGet(ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES|INCOMING_EDGES,
//     false)).basicList()  - eGet(feature, resolve=false) returns the list; basicList() is the unresolved element view;
//   edge sources / targets              : ((InternalEList) edge.eGet(ELK_EDGE__SOURCES|TARGETS, false)).basicList();
//   proxy test                          : EObject.eIsProxy(); fragment = ((InternalEObject) x).eProxyURI().fragment().
// shapes = [ { path, id, kind, outgoingEdges, incomingEdges, outgoingPaths, incomingPaths } ] : every ElkNode and ElkPort
//   of the graph in model pre-order (node, its ports, its children recursively), then each proxy reachable from an edge's raw
//   sources/targets, in first-encounter order (edges in model order, sources before targets), as
//   { path: null, id: null, kind: "ElkNode", proxy: true, uriFragment, ... }. The proxies installed at load (read raw
//   right after load, before the state's action) are listed first and stay listed even when the action has replaced them
//   in the edge, so a replaced proxy's own inverse lists remain visible; proxies that only appear later follow. Proxies
//   are keyed by identity, so a proxy shared by two edges is listed once. outgoingEdges/incomingEdges = edge identifiers in LIST ORDER (null when an edge
//   has none); outgoingPaths/incomingPaths = the same entries as containment paths (edge identifiers can repeat or be
//   absent; paths cannot), "<outside the graph>" for an edge not contained in the root.
// edges = [ { path, id, sources, targets } ] per edge in model order; entries = { kind, id, path } for a resolved element
//   ("<outside the graph>" when not in the tree) or { proxy: true, uriFragment } for a proxy.
// errors = resource.getErrors() messages in list order, read after the state's action.
// A load exception makes every state { throws: { cls, msg } }.
// Determinism: nothing is iterated from an identity-hashed container (IdentityHashMap is only probed).
import com.google.inject.Guice;
import com.google.inject.Injector;
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
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EReference;
import org.eclipse.emf.ecore.InternalEObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.InternalEList;
import org.eclipse.xtext.EcoreUtil2;
import org.eclipse.xtext.resource.XtextSyntaxDiagnostic;
import org.eclipse.xtext.util.CancelIndicator;

public class ElkjInverseVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String SCENARIO_DIR = "elkj-parse-scenarios", EXTENSION = ".elkj", OUTPUT = "graph-json-text-inverse.json";
    static final String PATH = "path", ID = "id", LABELS = "labels", SOURCES = "sources", TARGETS = "targets";
    static final String OUTSIDE = "<outside the graph>", THROWS = "throws";
    static final Set<String> EXTRA_SCENARIOS = Set.of("lenient-elk-json-source-target", "lenient-plain-elk-json");
    static final String[] STATES = {"afterLoad", "afterAccess", "afterResolve", "afterExport"};

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        // See ElkjParseVectors: the ElkGraph EPackage must be initialised before the first load.
        ElkGraphPackage.eINSTANCE.getElkNode();
        new Setup().createInjectorAndDoEMFRegistration();
        List<Map<String, Object>> cases = new ArrayList<>();
        for (Path file : scenarioFiles(Path.of(args[1], SCENARIO_DIR))) {
            cases.add(record(file));
        }
        cases.sort(Comparator.comparing(c -> (String) c.get(ID)));
        write(Path.of(args[0], OUTPUT), cases);
    }

    static String scenarioId(Path p) {
        String name = p.getFileName().toString();
        return name.substring(0, name.length() - EXTENSION.length());
    }

    static List<Path> scenarioFiles(Path dir) throws IOException {
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(p -> p.getFileName().toString().endsWith(EXTENSION))
                    .filter(p -> scenarioId(p).startsWith("link-") || EXTRA_SCENARIOS.contains(scenarioId(p)))
                    .sorted().toList();
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

    static String xtextVersion() {
        String location = XtextSyntaxDiagnostic.class.getProtectionDomain().getCodeSource().getLocation().toString();
        Matcher m = Pattern.compile("org\\.eclipse\\.xtext/(\\d+\\.\\d+\\.\\d+)").matcher(location);
        if (!m.find()) {
            throw new IllegalStateException("cannot read the Xtext version from " + location);
        }
        return m.group(1);
    }

    static Map<String, Object> obj(Object... keyValues) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            m.put((String) keyValues[i], keyValues[i + 1]);
        }
        return m;
    }

    static Map<String, Object> thrown(Throwable e) {
        return obj(THROWS, obj("cls", e.getClass().getName(), "msg", e.getMessage()));
    }

    /** ElkGraphJsonStandaloneSetup over the plain runtime module (no tagging: diagnostics are not classified here). */
    static final class Setup extends ElkGraphJsonStandaloneSetup {
        @Override
        public Injector createInjector() {
            return Guice.createInjector(Modules.override(new ElkGraphJsonRuntimeModule()).with(binder -> { }));
        }
    }

    record Loaded(Resource resource, ElkNode root) { }

    static Loaded load(Path file) throws IOException {
        Resource resource = new ResourceSetImpl().createResource(URI.createFileURI(file.toAbsolutePath().toString()));
        try (InputStream in = Files.newInputStream(file)) {
            resource.load(in, Collections.emptyMap());
        }
        EObject root = resource.getContents().isEmpty() ? null : resource.getContents().get(0);
        return new Loaded(resource, root instanceof ElkNode n ? n : null);
    }

    static Map<String, Object> record(Path file) throws IOException {
        Map<String, Object> c = obj(ID, scenarioId(file), "input", Files.readString(file, StandardCharsets.UTF_8));
        for (String state : STATES) {
            try {
                c.put(state, state(file, state));
            } catch (IOException | RuntimeException e) {
                c.put(state, thrown(e));
            }
        }
        return c;
    }

    /** A fresh load, the state's action, then the raw snapshot. */
    static Map<String, Object> state(Path file, String state) throws IOException {
        Loaded l = load(file);
        Tree tree = l.root() == null ? null : new Tree(l.root());
        List<EObject> proxiesAtLoad = tree == null ? List.of() : tree.proxies(List.of());
        Object exportFailure = null;
        switch (state) {
            case "afterAccess" -> {
                if (tree != null) {
                    for (Item item : tree.items) {
                        if (item.element() instanceof ElkEdge e) {
                            for (int i = 0; i < e.getSources().size(); i++) {
                                e.getSources().get(i);
                            }
                            for (int i = 0; i < e.getTargets().size(); i++) {
                                e.getTargets().get(i);
                            }
                        }
                    }
                }
            }
            case "afterResolve" -> EcoreUtil2.resolveLazyCrossReferences(l.resource(), CancelIndicator.NullImpl);
            case "afterExport" -> {
                if (l.root() != null) {
                    try {
                        ElkGraphJson.forGraph(l.root()).omitLayout(false).omitZeroDimension(false)
                                .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(true).toJson();
                    } catch (Exception e) {
                        exportFailure = thrown(e).get(THROWS);
                    }
                }
            }
            default -> { }
        }
        List<Object> errors = new ArrayList<>();
        l.resource().getErrors().forEach(d -> errors.add(d.getMessage()));
        return obj("shapes", tree == null ? List.of() : tree.shapes(proxiesAtLoad), "edges", tree == null ? List.of() : tree.edges(),
                "errors", errors, THROWS, exportFailure);
    }

    record Item(String path, EObject element) { }

    /** Elements of the graph in model order (as ElkjParseVectors.Tree), with the raw-read snapshot builders. */
    static final class Tree {
        final List<Item> items = new ArrayList<>();
        final Map<EObject, String> paths = new IdentityHashMap<>();

        Tree(ElkNode root) {
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

        @SuppressWarnings("unchecked")
        static List<EObject> raw(EObject owner, EReference reference) {
            return new ArrayList<>((List<EObject>) ((InternalEList<?>) owner.eGet(reference, false)).basicList());
        }

        String edgeId(EObject edge) {
            return ((ElkEdge) edge).getIdentifier();
        }

        String edgePath(EObject edge) {
            return paths.getOrDefault(edge, OUTSIDE);
        }

        List<Object> ids(List<EObject> edges) {
            List<Object> out = new ArrayList<>();
            edges.forEach(e -> out.add(edgeId(e)));
            return out;
        }

        List<Object> pathsOf(List<EObject> edges) {
            List<Object> out = new ArrayList<>();
            edges.forEach(e -> out.add(edgePath(e)));
            return out;
        }

        Map<String, Object> shape(String path, EObject s) {
            List<EObject> out = raw(s, ELK_CONNECTABLE_SHAPE__OUTGOING_EDGES);
            List<EObject> in = raw(s, ELK_CONNECTABLE_SHAPE__INCOMING_EDGES);
            Map<String, Object> m = obj(PATH, path, ID, s.eIsProxy() ? null : ((ElkGraphElement) s).getIdentifier(),
                    "kind", s.eClass().getName());
            if (s.eIsProxy()) {
                m.put("proxy", true);
                m.put("uriFragment", fragment(s));
            }
            m.put("outgoingEdges", ids(out));
            m.put("incomingEdges", ids(in));
            m.put("outgoingPaths", pathsOf(out));
            m.put("incomingPaths", pathsOf(in));
            return m;
        }

        static String fragment(EObject target) {
            return ((InternalEObject) target).eProxyURI().fragment();
        }

        /** Proxies reachable from the edges' raw sources/targets, first-encounter order, after those in {@code known}. */
        List<EObject> proxies(List<EObject> known) {
            List<EObject> out = new ArrayList<>(known);
            Map<EObject, Boolean> seen = new IdentityHashMap<>();
            known.forEach(k -> seen.put(k, true));
            for (Item item : items) {
                if (item.element() instanceof ElkEdge e) {
                    for (EReference ref : List.of(ELK_EDGE__SOURCES, ELK_EDGE__TARGETS)) {
                        for (EObject t : raw(e, ref)) {
                            if (t.eIsProxy() && seen.put(t, true) == null) {
                                out.add(t);
                            }
                        }
                    }
                }
            }
            return out;
        }

        List<Object> shapes(List<EObject> proxiesAtLoad) {
            List<Object> out = new ArrayList<>();
            for (Item item : items) {
                if (item.element() instanceof ElkConnectableShape) {
                    out.add(shape(item.path(), item.element()));
                }
            }
            proxies(proxiesAtLoad).forEach(p -> out.add(shape(null, p)));
            return out;
        }

        List<Object> edges() {
            List<Object> out = new ArrayList<>();
            for (Item item : items) {
                if (item.element() instanceof ElkEdge e) {
                    List<Object> sources = new ArrayList<>(), targets = new ArrayList<>();
                    raw(e, ELK_EDGE__SOURCES).forEach(t -> sources.add(ref(t)));
                    raw(e, ELK_EDGE__TARGETS).forEach(t -> targets.add(ref(t)));
                    out.add(obj(PATH, item.path(), ID, e.getIdentifier(), SOURCES, sources, TARGETS, targets));
                }
            }
            return out;
        }

        Object ref(EObject target) {
            if (target.eIsProxy()) {
                return obj("proxy", true, "uriFragment", fragment(target));
            }
            return obj("kind", target.eClass().getName(), ID, ((ElkGraphElement) target).getIdentifier(), PATH,
                    paths.getOrDefault(target, OUTSIDE));
        }
    }

    // ---- compact JSON writer (as ElkjParseVectors) ----
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
