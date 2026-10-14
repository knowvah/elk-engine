// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, G1/G2) for the ELK text (.elkt) WRITER: what Xtext's ISerializer does
// with an ElkGraph at the pinned ELK commit (generated AbstractElkGraphSemanticSequencer + ELK's ElkGraphSemanticSequencer,
// ElkGraphTransientValueService, ElkGraphSyntacticSequencer, ElkGraphFormatter, value converters, naming). This program
// only CALLS the serializer and the parser/exporter; it embeds no ELK or Xtext implementation.
// Run: tools/vectors/elkt-vectors.sh <outDir>  (java -cp ... ElktWriteVectors.java <outDir> <tools/vectors dir>)
// Registry: first statement is LayoutMetaDataService.getInstance(new ClassLoader(null) { }) (CoreOptions only, G3/C8).
// Inputs, all under <vectorsDir>/elkt-write-scenarios/ (the file base name is the row id) plus the java scenarios below:
//   <family>-<what>.elkt  read like the oracle's ElkModelReader (ElkGraphStandaloneSetup.doSetup + ResourceSetImpl);
//                         comments / blank lines vanish because the node model is dropped by EcoreUtil.copy.
//   <family>-<what>.json  ElkGraphJson.forGraph(text).toElk() (lenient import, as the oracle reads .json).
//   java-<name>           built from the public ElkGraph API; see JAVA SCENARIOS (T22 rebuilds them in TS).
// Procedure per input: root -> EcoreUtil.copy(root) placed in a fresh XtextResource ("synthetic:/x.elkt" of a fresh
// XtextResourceSet from the ElkGraphStandaloneSetup injector), then ISerializer.serialize(copy,
// SaveOptions.newBuilder().format().getOptions()) = formatted, and on another fresh copy ISerializer.serialize(copy) =
// unformatted (the serializer mutates proxy values, hence a fresh copy per call).
// Output <outDir>/graph-text-write.json, 2-space indent for the top level, one compact case per line, sorted by id,
// trailing newline:
//   { elkCommit, xtextVersion, registry: "core",
//     cases: [ { id, source: "elkt"|"json"|"java", formatted: S, unformatted: S,
//                reparse: { errors: <int>, json: <string>|null [, throws: E] } } ] }
//   S = the serializer output string exactly (JSON-escaped, newline style preserved) | { error: { cls, msg } }
//   E = { cls, msg }; cls = binary class name of the thrown Throwable, msg = its message with every identity hash
//       "@<hex>" replaced by "@<hash>". Error rows match by presence only (G2) but are recorded exactly.
//   reparse = the formatted text loaded again with the same setup (fresh XtextResourceSet, resource
//       "synthetic:/reparse.elkt", EcoreUtil.resolveAll, then errors = resource.getErrors().size(), syntax, conversion
//       and linking errors alike). json = ElkGraphJson export of the reparsed root with the oracle flags
//       (CaseRunner.export: omitLayout=false, omitZeroDimension=false, omitZeroPositions=false,
//       omitUnknownLayoutOptions=true, prettyPrint=true; exportSeed system property org.eclipse.elk.graph.json.exportSeed=1)
//       when errors == 0 and a root exists; null when the formatted output is an error, when errors > 0, or when the
//       load/export threw (then "throws" is present).
// JAVA SCENARIOS (ids java-<name>; root R = ElkGraphUtil.createGraph() with identifier "g" unless stated; "node X" =
// ElkGraphUtil.createNode(parent) + setIdentifier("X"); "port"/"label"/"edge"/"section" likewise via ElkGraphUtil):
//   java-node-without-identifier       R, then createNode(R) left without identifier.
//   java-port-without-identifier       R > node n > createPort(n) left without identifier.
//   java-label-without-text            R > node n > createLabel(n), identifier "l", text left null.
//   java-section-without-identifier    R > node a, node b, edge e (createEdge(R); sources a, targets b), two sections via
//                                      createEdgeSection(e): the first with identifier "s1", the second without
//                                      identifier and with startX=1, startY=2.
//   java-edge-endpoint-outside-graph   R > node a; node z created with createGraph() + identifier "z" (no parent, outside
//                                      R); edge e (createEdge(R)): sources a, targets z.
//   java-edge-without-endpoints        R > createEdge(R) with identifier "e", no sources, no targets.
//   java-property-null-key             R > node n; n.getProperties().put(null, "v").
//   java-property-null-value           R > node n; n.getProperties().put(new Property<Object>("my.custom"), null).
//   java-property-proxy-resolvable     R > node n; n.getProperties().put(CoreOptions.PRIORITY, new LayoutOptionProxy("5")).
//   java-property-key-keyword         R > node n; n.getProperties().put(new Property<Object>("my.node.k"), "v").
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import com.google.inject.Injector;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.util.internal.LayoutOptionProxy;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.elk.graph.util.ElkGraphUtil;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;
import org.eclipse.xtext.resource.SaveOptions;

public class ElktWriteVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    private static final String SCENARIOS = "elkt-write-scenarios", OUT_NAME = "graph-text-write.json";
    private static final String ELKT = ".elkt", JSON = ".json", JAVA_PREFIX = "java-";
    private static final String SYNTH = "synthetic:/x.elkt", REPARSE = "synthetic:/reparse.elkt";
    private static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");

    private final Injector injector;

    private ElktWriteVectors(Injector injector) {
        this.injector = injector;
    }

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        Injector injector = new ElkGraphStandaloneSetup().createInjectorAndDoEMFRegistration();
        ElktWriteVectors vectors = new ElktWriteVectors(injector);
        Map<String, String> cases = new TreeMap<>();
        boolean failed = false;
        Path dir = Path.of(args[1]).resolve(SCENARIOS);
        try (var files = Files.list(dir)) {
            for (Path file : files.sorted().toList()) {
                try {
                    vectors.addFile(cases, file);
                } catch (IOException | RuntimeException e) {
                    System.err.println("scenario failed: " + e.getMessage());
                    failed = true;
                }
            }
        }
        JavaScenarios.table().forEach((id, builder) -> cases.put(id, vectors.record(id, "java", builder.get())));
        if (failed) {
            throw new IOException("unreadable scenarios (see stderr)");
        }
        Files.writeString(Path.of(args[0]).resolve(OUT_NAME), document(cases), StandardCharsets.UTF_8);
    }

    private static String document(Map<String, String> cases) {
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"xtextVersion\": \"").append(XTEXT_VERSION).append("\",\n");
        out.append("  \"registry\": \"core\",\n  \"cases\": [\n");
        out.append(String.join(",\n", cases.values())).append("\n  ]\n}\n");
        return out.toString();
    }

    private void addFile(Map<String, String> cases, Path file) throws IOException {
        String name = file.getFileName().toString();
        boolean elkt = name.endsWith(ELKT);
        if (!elkt && !name.endsWith(JSON)) {
            throw new IOException("unexpected scenario file " + name);
        }
        String id = name.substring(0, name.length() - (elkt ? ELKT.length() : JSON.length()));
        ElkNode root = elkt ? readElkt(file) : ElkGraphJson.forGraph(Files.readString(file, StandardCharsets.UTF_8)).toElk();
        cases.put(id, record(id, elkt ? "elkt" : "json", root));
    }

    // Mirrors tools/oracle/harness/ElkModelReader.readElkt.
    private static ElkNode readElkt(Path file) throws IOException {
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        if (!resource.getErrors().isEmpty()) {
            throw new IOException(file + ": " + resource.getErrors().get(0).getMessage());
        }
        resource.load(Collections.emptyMap());
        return (ElkNode) resource.getContents().get(0);
    }

    private String record(String id, String source, ElkNode root) {
        Outcome formatted = serialize(root, true);
        Outcome unformatted = serialize(root, false);
        StringBuilder row = new StringBuilder("    {\"id\": ").append(quote(id));
        row.append(", \"source\": ").append(quote(source));
        row.append(", \"formatted\": ").append(formatted.json);
        row.append(", \"unformatted\": ").append(unformatted.json);
        row.append(", \"reparse\": ").append(formatted.text == null ? reparseOfError() : reparse(formatted.text));
        return row.append('}').toString();
    }

    private record Outcome(String text, String json) { }

    private Outcome serialize(ElkNode root, boolean format) {
        try {
            EObject copy = EcoreUtil.copy(root);
            freshResource(SYNTH).getContents().add(copy);
            ISerializer serializer = injector.getInstance(ISerializer.class);
            String text = format ? serializer.serialize(copy, SaveOptions.newBuilder().format().getOptions())
                    : serializer.serialize(copy);
            return new Outcome(text, quote(text));
        } catch (Exception | StackOverflowError e) {
            return new Outcome(null, "{\"error\": " + failure(e) + "}");
        }
    }

    private Resource freshResource(String uri) {
        Resource resource = injector.getInstance(XtextResourceSet.class).createResource(URI.createURI(uri));
        if (resource == null) {
            throw new IllegalStateException("no resource factory for " + uri);
        }
        return resource;
    }

    private static String reparseOfError() {
        return "{\"errors\": 0, \"json\": null}";
    }

    private String reparse(String text) {
        Resource resource = freshResource(REPARSE);
        try {
            resource.load(new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)), Collections.emptyMap());
            EcoreUtil.resolveAll(resource);
            int errors = resource.getErrors().size();
            boolean exportable = errors == 0 && !resource.getContents().isEmpty();
            String json = exportable ? quote(export((ElkNode) resource.getContents().get(0))) : "null";
            return "{\"errors\": " + errors + ", \"json\": " + json + "}";
        } catch (Exception | StackOverflowError e) {
            return "{\"errors\": " + resource.getErrors().size() + ", \"json\": null, \"throws\": " + failure(e) + "}";
        }
    }

    // Same flags as tools/oracle/harness/CaseRunner.export.
    private static String export(ElkNode graph) {
        return ElkGraphJson.forGraph(graph).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                .omitUnknownLayoutOptions(true).prettyPrint(true).toJson();
    }

    private static String failure(Throwable e) {
        String message = e.getMessage() == null ? null : IDENTITY_HASH.matcher(e.getMessage()).replaceAll("@<hash>");
        return "{\"cls\": " + quote(e.getClass().getName()) + ", \"msg\": " + (message == null ? "null" : quote(message)) + "}";
    }

    private static String quote(String s) {
        StringBuilder out = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> out.append(c < 0x20 ? String.format("\\u%04x", (int) c) : String.valueOf(c));
            }
        }
        return out.append('"').toString();
    }

    /** Graphs that no file reader can produce; each builder is a small method (see JAVA SCENARIOS above). */
    static final class JavaScenarios {
        static Map<String, Supplier<ElkNode>> table() {
            Map<String, Supplier<ElkNode>> t = new TreeMap<>();
            t.put(JAVA_PREFIX + "node-without-identifier", () -> { ElkNode r = root(); ElkGraphUtil.createNode(r); return r; });
            t.put(JAVA_PREFIX + "port-without-identifier", JavaScenarios::portWithoutIdentifier);
            t.put(JAVA_PREFIX + "label-without-text", JavaScenarios::labelWithoutText);
            t.put(JAVA_PREFIX + "section-without-identifier", JavaScenarios::sectionWithoutIdentifier);
            t.put(JAVA_PREFIX + "edge-endpoint-outside-graph", JavaScenarios::endpointOutside);
            t.put(JAVA_PREFIX + "edge-without-endpoints", JavaScenarios::edgeWithoutEndpoints);
            t.put(JAVA_PREFIX + "property-null-key", () -> withProperty(null, "v"));
            t.put(JAVA_PREFIX + "property-null-value", () -> withProperty(new Property<Object>("my.custom"), null));
            t.put(JAVA_PREFIX + "property-proxy-resolvable",
                    () -> withProperty(CoreOptions.PRIORITY, new LayoutOptionProxy("5")));
            t.put(JAVA_PREFIX + "property-key-keyword", () -> withProperty(new Property<Object>("my.node.k"), "v"));
            return t;
        }

        private static ElkNode portWithoutIdentifier() {
            ElkNode root = root();
            ElkGraphUtil.createPort(node(root));
            return root;
        }

        private static ElkNode root() {
            ElkNode root = ElkGraphUtil.createGraph();
            root.setIdentifier("g");
            return root;
        }

        private static ElkNode node(ElkNode parent) {
            ElkNode node = ElkGraphUtil.createNode(parent);
            node.setIdentifier("n");
            return node;
        }

        private static ElkNode labelWithoutText() {
            ElkNode root = root();
            ElkGraphUtil.createLabel(node(root)).setIdentifier("l");
            return root;
        }

        private static ElkNode sectionWithoutIdentifier() {
            ElkNode root = root();
            ElkEdge edge = twoNodeEdge(root, node(root));
            ElkGraphUtil.createEdgeSection(edge).setIdentifier("s1");
            ElkEdgeSection second = ElkGraphUtil.createEdgeSection(edge);
            second.setStartX(1);
            second.setStartY(2);
            return root;
        }

        private static ElkEdge twoNodeEdge(ElkNode root, ElkNode a) {
            ElkNode b = ElkGraphUtil.createNode(root);
            b.setIdentifier("b");
            ElkEdge edge = ElkGraphUtil.createEdge(root);
            edge.setIdentifier("e");
            edge.getSources().add(a);
            edge.getTargets().add(b);
            return edge;
        }

        private static ElkNode endpointOutside() {
            ElkNode root = root();
            ElkNode outside = ElkGraphUtil.createGraph();
            outside.setIdentifier("z");
            ElkEdge edge = ElkGraphUtil.createEdge(root);
            edge.setIdentifier("e");
            edge.getSources().add(node(root));
            edge.getTargets().add(outside);
            return root;
        }

        private static ElkNode edgeWithoutEndpoints() {
            ElkNode root = root();
            ElkGraphUtil.createEdge(root).setIdentifier("e");
            return root;
        }

        private static ElkNode withProperty(org.eclipse.elk.graph.properties.IProperty<?> key, Object value) {
            ElkNode root = root();
            node(root).getProperties().put(key, value);
            return root;
        }
    }
}
