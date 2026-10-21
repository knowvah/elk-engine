// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13) for the ELK textual JSON (.elkj) WRITER: what Xtext's ISerializer does
// with an ElkGraph at the pinned ELK commit (generated AbstractElkGraphJsonSemanticSequencer + ELK's
// ElkGraphJsonSemanticSequencer, ElkGraphJsonTransientValueService, ElkGraphJsonSyntacticSequencer,
// ElkGraphJsonFormatter, the value converters, naming). This program only CALLS the serializer and the parser/exporter;
// it embeds no ELK or Xtext implementation.
// Run: tools/vectors/elkj-vectors.sh <outDir>  (java -cp ... ElkjWriteVectors.java <outDir> <tools/vectors dir> [<cacheDir>])
// Optional row cache (default off, then everything is recorded in-process):
//   <cacheDir>  each finished row is written to <cacheDir>/<sha256(id NUL text)>.json (text = the scenario file's bytes
//               decoded as UTF-8; "" for java-* rows) via a .tmp file moved atomically, and a row already there is read
//               back instead of recomputed ("cached <id>" on stderr). The caller salts the directory with everything the
//               row depends on besides its input (this program, the oracle jars, the JDK).
// Registry: first statement is LayoutMetaDataService.getInstance(new ClassLoader(null) { }) (CoreOptions only).
// Inputs, all under <vectorsDir>/elkj-write-scenarios/ (the file base name is the row id) plus the java scenarios below:
//   <family>-<what>.elkt  read like the oracle's ElkModelReader (ElkGraphStandaloneSetup + ResourceSetImpl).
//   <family>-<what>.json  ElkGraphJson.forGraph(text).toElk() (lenient import, as the oracle reads .json).
//   <family>-<what>.elkj  loaded through the .elkj language (fresh XtextResourceSet from the ElkGraphJsonStandaloneSetup
//                         injector, resource "synthetic:/in.elkj", EcoreUtil.resolveAll); any error is a harness fault.
//   java-<name>           built from the public ElkGraph API; see JAVA SCENARIOS (T15/T16 rebuild them in TS).
// Procedure per input: root -> EcoreUtil.copy(root) placed in a fresh XtextResource ("synthetic:/x.elkj" of a fresh
// XtextResourceSet from the ElkGraphJsonStandaloneSetup injector), then ISerializer.serialize(copy,
// SaveOptions.newBuilder().format().getOptions()) = formatted, and on another fresh copy ISerializer.serialize(copy) =
// unformatted, and on a third fresh copy XtextResource.save(out, Collections.EMPTY_MAP) (what ELK's own converter does)
// = saved. The serializer mutates proxy values, hence a fresh copy per call.
// Output <outDir>/graph-json-text-write.json, 2-space indent for the top level, one compact case per line, sorted by id,
// trailing newline:
//   { elkCommit, xtextVersion, registry: "core",
//     cases: [ { id, source: "elkt"|"json"|"elkj"|"java", formatted: S, unformatted: S,
//                [saveEqualsUnformatted: true|false|"error"],
//                reparse: { errors: <int>, json: <string>|null [, throws: E] } } ] }
//   S = the serializer output string exactly (JSON-escaped, newline style preserved) | { error: { cls, msg } }
//   E = { cls, msg }; cls = binary class name of the thrown Throwable, msg = its message with every identity hash
//       "@<hex>" replaced by "@<hash>". Error rows match by presence only but are recorded exactly.
//   saveEqualsUnformatted (only on the rows listed in SAVE_CHECKED): the bytes XtextResource.save(Collections.EMPTY_MAP) writes (UTF-8 decoded) equal
//       `unformatted`; "error" when the save threw or `unformatted` is an error.
//   reparse = the formatted text loaded again with the same setup (fresh XtextResourceSet, resource
//       "synthetic:/reparse.elkj", EcoreUtil.resolveAll, then errors = resource.getErrors().size(), syntax, conversion
//       and linking errors alike). json = ElkGraphJson export of the reparsed root with the oracle flags
//       (CaseRunner.export: omitLayout=false, omitZeroDimension=false, omitZeroPositions=false,
//       omitUnknownLayoutOptions=true, prettyPrint=true; exportSeed system property org.eclipse.elk.graph.json.exportSeed=1)
//       when errors == 0 and a root exists; null when the formatted output is an error, when errors > 0, or when the
//       load/export threw (then "throws" is present).
// Expected error rows (recorded, matched by presence): graphs with edge sections ("ElkEdge.sections violates the upper
// bound"), KVectorChain / List property values ("value is not allowed to have a value"), null property keys, the
// identifiers "id" / "children" (lexed as keyword tokens, "invalid STRING"), and elkj-property-values.elkj, whose quoted
// unknown keys keep their quotes in the parsed Property id, which PropertyKeyValueConverter.toString then rejects
// (elkj-property-values-bare.elkj is the same document with bare keys).
// JAVA SCENARIOS (cost note: the Xtext serializer does an uncached stack-pruning PDA search per emitted token, seconds
// per small graph, so every scenario is kept to a handful of elements and element-level features sit on the root,
// which uses the same grammar rule as every node). Common vocabulary: root R = ElkGraphUtil.createGraph() with
// identifier "g"; "node X" = ElkGraphUtil.createNode(parent) + setIdentifier("X"); "port"/"label"/"edge"/"section"/
// "bend point" likewise via ElkGraphUtil (createPort, createLabel(text, parent), createEdge(containingNode),
// createEdgeSection(edge), createBendPoint(section, x, y)). "put(k, v)" = element.getProperties().put(k, v) in the
// order listed (the entry list keeps insertion order). "prop(id)" = new Property<Object>(id), an unregistered key.
// Each row's `source` is just "java"; rebuild instructions:
//   java-node-without-identifier       R, then createNode(R) left without identifier.
//   java-port-without-identifier       R > node n > createPort(n) left without identifier.
//   java-label-without-text            R > node n > createLabel(n), identifier "l", text left null.
//   java-section-without-identifier    R > node a, node b, edge e (createEdge(R); sources a, targets b), two sections via
//                                      createEdgeSection(e): the first with identifier "s1", the second without
//                                      identifier and with startX=1, startY=2.
//   java-section-with-bend-points      R > node a, node b, edge e (a -> b), one section (identifier "s1") with startX=0,
//                                      startY=0, endX=30, endY=40, bend points (10,0) and (10,40).
//   java-edge-endpoint-outside-graph   R > node a; node z created with createGraph() + identifier "z" (no parent, outside
//                                      R); edge e (createEdge(R)): sources a, targets z.
//   java-edge-without-endpoints        R > createEdge(R) with identifier "e", no sources, no targets.
//   java-edge-without-identifier       R > node a, node b (ids "a" and "b"), edge e (a -> b) whose
//                                      identifier is then set to null.
//   java-edge-hyperedge                R > node a, b, c, d; edge e (createEdge(R)): sources a, b; targets c, d.
//   java-edge-port-endpoints           R > node a > port p, node b > port q; edge e (R): source p, target q.
//   java-edge-contained-in-child       R > node a > (nodes c, d), edge e created with createEdge(a): source c, target d.
//   java-edge-loop                     R > node a; edge e (R): source a, target a.
//   java-property-null-key             R: put(null, "v").
//   java-property-null-value           R: put(prop("my.custom"), null).
//   java-property-proxy-resolvable     R: put(CoreOptions.PRIORITY, new LayoutOptionProxy("5")).
//   java-property-key-keyword          R: put(prop("my.node.k"), "v").
//   java-property-value-<kind>         R: one property put(prop("p.v"), <value>) with value: doublebig 1.0E10 | doublenan NaN |
//                                      doubleinf +Infinity | stringnumspace " 5 " | stringquote "a\"b" | stringbackslash
//                                      "a\\b" | stringnewline "a\nb" | kvectorchain KVectorChain of (1,2),(3,4.5) | list
//                                      List.of("a", "b") | proxy new LayoutOptionProxy("5") | proxynull new
//                                      LayoutOptionProxy(null).
//   java-property-values-<group>       R: several properties, put(prop(key), value) in the order listed:
//                                      numbers: p.int 5, p.long 7L, p.float 1.5f, p.double3 3.0, p.double 1.5, p.doubleneg
//                                      -2.0, p.doublesmall 1.0E-5;
//                                      strings: p.string "abc", p.stringtrue "true", p.stringnull "null", p.stringnum "5",
//                                      p.stringnumexp "1e3", p.stringempty "", p.stringunicode "h\u00e9llo \u65e5\u672c";
//                                      misc: p.boolean true, p.enum Direction.DOWN, p.kvector new KVector(1.5, 2),
//                                      p.padding new ElkPadding(1, 2.5, 3, 4), p.margin new ElkMargin(1, 2.5, 3, 4),
//                                      p.enumset EnumSet.of(PORTS, NODE_LABELS), p.enumsetempty
//                                      EnumSet.noneOf(SizeConstraint.class), p.individual an IndividualSpacings with
//                                      setProperty(SPACING_NODE_NODE, 3.0).
//   java-property-known-main           R: put(DIRECTION, Direction.DOWN), put(PRIORITY, 5), put(PADDING, new ElkPadding(1,2,3,4)),
//                                      put(POSITION, new KVector(1.5,2)), put(NODE_SIZE_CONSTRAINTS, EnumSet.of(PORTS,
//                                      NODE_LABELS)), put(SPACING_NODE_NODE, 20.0), put(COMMENT_BOX, true).
//   java-property-known-<kind>         R: one registered key: spacingnodenodefrac SPACING_NODE_NODE=20.5 | algorithm ALGORITHM=
//                                      "layered" | junction JUNCTION_POINTS=KVectorChain (1,2),(3,4) | individual
//                                      SPACING_INDIVIDUAL=an IndividualSpacings with setProperty(SPACING_NODE_NODE, 3.0) |
//                                      nulldouble SPACING_NODE_NODE=null.
//   java-property-order                R: put(prop("z.last"), "z"), put(CoreOptions.PRIORITY, 1), put(prop("a.first"),
//                                      true), put(CoreOptions.DIRECTION, Direction.UP), put(prop("m.mid"), 2.5).
//   java-property-on-<element>         R > node n > port p, label l (createLabel("t", n), id "l") on n, edge e (R, n -> n);
//                                      the single property put(CoreOptions.PRIORITY, 1) lands on element = graph (R) | node
//                                      (n) | port (p) | label (l) | edge (e); the others carry none.
//   java-shape-<what>                  R with R.setX/Y/Width/Height as named: a x=5 | b y=5 | c width=5 | d height=5 |
//                                      fractional x=1.5, y=2.25, width=3.75, height=4.5 | intvalued x=3.0, y=4.0 | big
//                                      x=1.0E10, width=-1.0E10 | nan x=NaN | inf x=+Infinity, y=-Infinity | exp x=1.0E-5,
//                                      y=1.5E10 | negzero x=-0.0 | all 1,2,3,4 | zero x=y=width=height=0 | half-xzero
//                                      x=0, y=5 | half-ywzero width=0, height=5 | everywhere: R, a port p, a label l and a
//                                      child c of node n (R > n > p, l = createLabel("t", n), c) all get x=1,y=2,width=3,
//                                      height=4.
//   java-label-<what>                  R with label(s) via createLabel(text, parent) as named: text "t" on R | nested
//                                      "t" on R with child label "u" with child label "v" | many "a","b","c" on R |
//                                      specials text "q\"b\\n\nt\tu\u00e9\u0001" on R | empty text "" | spaces text
//                                      "  a  b  " | on-port (R > node n > port p, label "t" on p) | on-edge (R > nodes n, b,
//                                      edge e n -> b, label "t" on e).
//   java-id-<what>                     createGraph() whose identifier is set as named: specials "a\"b\\c\nd" | empty "" |
//                                      unicode "h\u00e9llo \u65e5\u672c" | keyword-id "id" | keyword-true "true" |
//                                      keyword-null "null" | keyword-children "children" | numeric "5" | dotted "a.b.c" |
//                                      spaces "a b" | none (identifier left null). java-id-duplicate-siblings: R > two
//                                      nodes both with identifier "n".
//   java-deep-nesting                  R > n1 > n2 > ... > n6 (each the only child of the previous).
//   java-empty-lists                   R > node n with nothing in children/ports/labels/edges/properties.
//   java-everything                    R(g) with x=1,y=2,width=3,height=4, put(PRIORITY, 1), put(DIRECTION, DOWN), label
//                                      "root"; node a (label "al", port p with label "pl" and put(PRIORITY, 2)) and node b;
//                                      edge e (p -> b) with label "el" and put(PRIORITY, 3).
import java.io.ByteArrayInputStream;
import java.lang.management.ManagementFactory;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import com.google.inject.Injector;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.math.KVectorChain;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.Direction;
import org.eclipse.elk.core.options.SizeConstraint;
import org.eclipse.elk.core.util.IndividualSpacings;
import org.eclipse.elk.core.util.internal.LayoutOptionProxy;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.json.text.ElkGraphJsonStandaloneSetup;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.elk.graph.util.ElkGraphUtil;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;

public class ElkjWriteVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    private static final String SCENARIOS = "elkj-write-scenarios", OUT_NAME = "graph-json-text-write.json";
    private static final String ELKT = ".elkt", JSON = ".json", ELKJ = ".elkj", JAVA_PREFIX = "java-";
    private static final String SYNTH = "synthetic:/x.elkj", REPARSE = "synthetic:/reparse.elkj";
    private static final String INPUT = "synthetic:/in.elkj";
    private static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");
    private static final int WORKERS = 8;
    private static final long NANOS_PER_MS = 1_000_000L;
    // Rows that also compare XtextResource.save(EMPTY_MAP) with `unformatted` (each check costs another serialisation).
    private static final Set<String> SAVE_CHECKED = Set.of("elkj-minimal", "java-property-order", "java-label-nested",
            "java-section-with-bend-points", "shape-both", "props-root-3");
    private static final String SAVE_ERROR = "\"error\"";

    private final Injector injector;

    private ElkjWriteVectors(Injector injector) {
        this.injector = injector;
    }

    public static void main(String[] args) throws Exception {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        // The .elkj setup does not register the ElkGraph EPackage; without this touch every load fails with
        // "Unresolved proxy http://www.eclipse.org/elk/ElkGraph#//ElkNode" (graphs built via ElkGraphFactory have it).
        ElkGraphPackage.eINSTANCE.getElkNode();
        Injector injector = new ElkGraphJsonStandaloneSetup().createInjectorAndDoEMFRegistration();
        ElkGraphStandaloneSetup.doSetup();
        ElkjWriteVectors reader = new ElkjWriteVectors(injector);
        Map<String, Supplier<Input>> inputs = new TreeMap<>();
        Map<String, String> texts = new TreeMap<>();
        boolean failed = false;
        Path dir = Path.of(args[1]).resolve(SCENARIOS);
        try (var files = Files.list(dir)) {
            for (Path file : files.sorted().toList()) {
                try {
                    reader.addFile(inputs, texts, file);
                } catch (IOException | RuntimeException e) {
                    System.err.println("scenario failed: " + file.getFileName() + ": " + e.getMessage());
                    failed = true;
                }
            }
        }
        JavaScenarios.table().forEach((id, builder) -> inputs.put(id, () -> new Input("java", builder.get())));
        if (failed) {
            throw new IOException("unreadable scenarios (see stderr)");
        }
        Path cacheDir = args.length > 2 ? Path.of(args[2]) : null;
        Map<String, String> cases = recordAll(inputs, texts, cacheDir);
        Files.writeString(Path.of(args[0]).resolve(OUT_NAME), document(cases), StandardCharsets.UTF_8);
    }

    private record Input(String source, ElkNode root) { }

    // Serialising is slow (Xtext's stack-pruning PDA search per token) and its caches are not thread safe, so each
    // worker thread owns an injector; rows are keyed by id, so the output does not depend on the schedule.
    // texts holds the scenario-file rows' input text (the cache key); java-* rows have none and key on "".
    private static Map<String, String> recordAll(Map<String, Supplier<Input>> inputs, Map<String, String> texts,
            Path cacheDir) throws Exception {
        if (cacheDir != null) {
            Files.createDirectories(cacheDir);
        }
        int threads = Math.max(1, Math.min(WORKERS, Runtime.getRuntime().availableProcessors()));
        ThreadLocal<ElkjWriteVectors> perThread = ThreadLocal.withInitial(
                () -> new ElkjWriteVectors(new ElkGraphJsonStandaloneSetup().createInjector()));
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            Map<String, Future<String>> futures = new TreeMap<>();
            inputs.forEach((id, input) -> futures.put(id, pool.submit(() -> {
                String key = sha256(id + "\0" + texts.getOrDefault(id, ""));
                Path cached = cacheDir == null ? null : cacheDir.resolve(key + ".json");
                if (cached != null && Files.exists(cached)) {
                    System.err.println("cached " + id);
                    return Files.readString(cached, StandardCharsets.UTF_8);
                }
                long start = System.nanoTime(), cpuStart = ManagementFactory.getThreadMXBean().getCurrentThreadCpuTime();
                Input in = input.get();
                String row = perThread.get().record(id, in.source, in.root);
                long cpu = ManagementFactory.getThreadMXBean().getCurrentThreadCpuTime() - cpuStart;
                if (cached != null) {
                    Path tmp = cacheDir.resolve(key + ".tmp");
                    Files.writeString(tmp, row, StandardCharsets.UTF_8);
                    Files.move(tmp, cached, StandardCopyOption.ATOMIC_MOVE);
                }
                System.err.println("done " + id + " " + (System.nanoTime() - start) / NANOS_PER_MS + " ms wall, "
                        + cpu / NANOS_PER_MS + " ms cpu");
                return row;
            })));
            Map<String, String> cases = new TreeMap<>();
            for (Map.Entry<String, Future<String>> e : futures.entrySet()) {
                cases.put(e.getKey(), e.getValue().get());
            }
            return cases;
        } finally {
            pool.shutdown();
        }
    }

    private static String document(Map<String, String> cases) {
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"xtextVersion\": \"").append(XTEXT_VERSION).append("\",\n");
        out.append("  \"registry\": \"core\",\n  \"cases\": [\n");
        out.append(String.join(",\n", cases.values())).append("\n  ]\n}\n");
        return out.toString();
    }

    private void addFile(Map<String, Supplier<Input>> inputs, Map<String, String> texts, Path file) throws IOException {
        String name = file.getFileName().toString();
        String ext = name.endsWith(ELKT) ? ELKT : name.endsWith(JSON) ? JSON : name.endsWith(ELKJ) ? ELKJ : null;
        if (ext == null) {
            throw new IOException("unexpected scenario file " + name);
        }
        String id = name.substring(0, name.length() - ext.length());
        ElkNode root = switch (ext) {
            case ELKT -> readElkt(file);
            case JSON -> ElkGraphJson.forGraph(Files.readString(file, StandardCharsets.UTF_8)).toElk();
            default -> readElkj(file);
        };
        inputs.put(id, () -> new Input(ext.substring(1), root));
        texts.put(id, new String(Files.readAllBytes(file), StandardCharsets.UTF_8));
    }

    private static String sha256(String s) {
        try {
            StringBuilder hex = new StringBuilder();
            for (byte b : MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
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

    private ElkNode readElkj(Path file) throws IOException {
        Resource resource = freshResource(INPUT);
        resource.load(new ByteArrayInputStream(Files.readAllBytes(file)), Collections.emptyMap());
        EcoreUtil.resolveAll(resource);
        if (!resource.getErrors().isEmpty()) {
            throw new IOException(file + ": " + resource.getErrors().get(0).getMessage());
        }
        return (ElkNode) resource.getContents().get(0);
    }

    private String record(String id, String source, ElkNode root) {
        Outcome formatted = serialize(root, true);
        Outcome unformatted = serialize(root, false);
        StringBuilder row = new StringBuilder("    {\"id\": ").append(quote(id));
        row.append(", \"source\": ").append(quote(source));
        row.append(", \"formatted\": ").append(formatted.json);
        row.append(", \"unformatted\": ").append(unformatted.json);
        if (SAVE_CHECKED.contains(id)) {
            row.append(", \"saveEqualsUnformatted\": ").append(saveComparison(root, unformatted.text));
        }
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

    private String saveComparison(ElkNode root, String unformatted) {
        if (unformatted == null) {
            return SAVE_ERROR;
        }
        try {
            Resource resource = freshResource(SYNTH);
            resource.getContents().add(EcoreUtil.copy(root));
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            resource.save(out, Collections.EMPTY_MAP);
            return String.valueOf(out.toString(StandardCharsets.UTF_8).equals(unformatted));
        } catch (Exception | StackOverflowError e) {
            return SAVE_ERROR;
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

    /** Graphs that no file reader can produce; each builder is documented in the header (JAVA SCENARIOS). */
    static final class JavaScenarios {
        private static final String PROP_KEY = "p.v";
        private static final String NODE_ID = "n";

        static Map<String, Supplier<ElkNode>> table() {
            Map<String, Supplier<ElkNode>> t = new TreeMap<>();
            structure(t);
            edges(t);
            nodeProperty(t);
            knownProperties(t);
            shapes(t);
            labels(t);
            identifiers(t);
            return t;
        }

        private static void structure(Map<String, Supplier<ElkNode>> t) {
            t.put(JAVA_PREFIX + "node-without-identifier", () -> { ElkNode r = root(); ElkGraphUtil.createNode(r); return r; });
            t.put(JAVA_PREFIX + "port-without-identifier", () -> { ElkNode r = root(); ElkGraphUtil.createPort(node(r)); return r; });
            t.put(JAVA_PREFIX + "label-without-text", () -> { ElkNode r = root(); ElkGraphUtil.createLabel(node(r)).setIdentifier("l"); return r; });
            t.put(JAVA_PREFIX + "deep-nesting", JavaScenarios::deepNesting);
            t.put(JAVA_PREFIX + "empty-lists", () -> { ElkNode r = root(); node(r); return r; });
            t.put(JAVA_PREFIX + "everything", JavaScenarios::everything);
            for (String el : List.of("graph", "node", "port", "label", "edge")) {
                t.put(JAVA_PREFIX + "property-on-" + el, () -> propertyOn(el));
            }
        }

        private static void edges(Map<String, Supplier<ElkNode>> t) {
            t.put(JAVA_PREFIX + "section-without-identifier", JavaScenarios::sectionWithoutIdentifier);
            t.put(JAVA_PREFIX + "section-with-bend-points", JavaScenarios::sectionWithBendPoints);
            t.put(JAVA_PREFIX + "edge-endpoint-outside-graph", JavaScenarios::endpointOutside);
            t.put(JAVA_PREFIX + "edge-without-endpoints", () -> { ElkNode r = root(); ElkGraphUtil.createEdge(r).setIdentifier("e"); return r; });
            t.put(JAVA_PREFIX + "edge-without-identifier", () -> {
                ElkNode r = root();
                ElkEdge e = twoNodeEdge(r, named(r, "a"));
                e.setIdentifier(null);
                return r;
            });
            t.put(JAVA_PREFIX + "edge-hyperedge", JavaScenarios::hyperedge);
            t.put(JAVA_PREFIX + "edge-port-endpoints", JavaScenarios::portEndpoints);
            t.put(JAVA_PREFIX + "edge-contained-in-child", JavaScenarios::containedInChild);
            t.put(JAVA_PREFIX + "edge-loop", () -> {
                ElkNode r = root();
                ElkNode a = ElkGraphUtil.createNode(r);
                a.setIdentifier("a");
                ElkEdge e = ElkGraphUtil.createEdge(r);
                e.setIdentifier("e");
                e.getSources().add(a);
                e.getTargets().add(a);
                return r;
            });
        }

        private static void nodeProperty(Map<String, Supplier<ElkNode>> t) {
            t.put(JAVA_PREFIX + "property-null-key", () -> withProperty(null, "v"));
            t.put(JAVA_PREFIX + "property-null-value", () -> withProperty(new Property<Object>("my.custom"), null));
            t.put(JAVA_PREFIX + "property-proxy-resolvable",
                    () -> withProperty(CoreOptions.PRIORITY, new LayoutOptionProxy("5")));
            t.put(JAVA_PREFIX + "property-key-keyword", () -> withProperty(new Property<Object>("my.node.k"), "v"));
            t.put(JAVA_PREFIX + "property-order", JavaScenarios::propertyOrder);
            Map<String, Supplier<Object>> singles = new LinkedHashMap<>();
            singles.put("doublebig", () -> 1.0E10);
            singles.put("doublenan", () -> Double.NaN);
            singles.put("doubleinf", () -> Double.POSITIVE_INFINITY);
            singles.put("stringnumspace", () -> " 5 ");
            singles.put("stringquote", () -> "a\"b");
            singles.put("stringbackslash", () -> "a\\b");
            singles.put("stringnewline", () -> "a\nb");
            singles.put("kvectorchain", () -> new KVectorChain(new KVector(1, 2), new KVector(3, 4.5)));
            singles.put("list", () -> List.of("a", "b"));
            singles.put("proxy", () -> new LayoutOptionProxy("5"));
            singles.put("proxynull", () -> new LayoutOptionProxy(null));
            singles.forEach((kind, value) -> t.put(JAVA_PREFIX + "property-value-" + kind,
                    () -> withProperty(new Property<Object>(PROP_KEY), value.get())));
            t.put(JAVA_PREFIX + "property-values-numbers", () -> withProperties("p.int", 5, "p.long", 7L, "p.float", 1.5f,
                    "p.double3", 3.0, "p.double", 1.5, "p.doubleneg", -2.0, "p.doublesmall", 1.0E-5));
            t.put(JAVA_PREFIX + "property-values-strings", () -> withProperties("p.string", "abc", "p.stringtrue", "true",
                    "p.stringnull", "null", "p.stringnum", "5", "p.stringnumexp", "1e3", "p.stringempty", "",
                    "p.stringunicode", "h\u00e9llo \u65e5\u672c"));
            t.put(JAVA_PREFIX + "property-values-misc", () -> withProperties("p.boolean", true, "p.enum", Direction.DOWN,
                    "p.kvector", new KVector(1.5, 2),
                    "p.padding", new ElkPadding(1, 2.5, 3, 4), "p.margin", new ElkMargin(1, 2.5, 3, 4),
                    "p.enumset", EnumSet.of(SizeConstraint.PORTS, SizeConstraint.NODE_LABELS),
                    "p.enumsetempty", EnumSet.noneOf(SizeConstraint.class),
                    "p.individual", individualSpacings()));
        }

        private static void knownProperties(Map<String, Supplier<ElkNode>> t) {
            t.put(JAVA_PREFIX + "property-known-main", () -> {
                ElkNode r = root();
                r.getProperties().put(CoreOptions.DIRECTION, Direction.DOWN);
                r.getProperties().put(CoreOptions.PRIORITY, 5);
                r.getProperties().put(CoreOptions.PADDING, new ElkPadding(1, 2, 3, 4));
                r.getProperties().put(CoreOptions.POSITION, new KVector(1.5, 2));
                r.getProperties().put(CoreOptions.NODE_SIZE_CONSTRAINTS,
                        EnumSet.of(SizeConstraint.PORTS, SizeConstraint.NODE_LABELS));
                r.getProperties().put(CoreOptions.SPACING_NODE_NODE, 20.0);
                r.getProperties().put(CoreOptions.COMMENT_BOX, true);
                return r;
            });
            t.put(JAVA_PREFIX + "property-known-spacingnodenodefrac", () -> withProperty(CoreOptions.SPACING_NODE_NODE, 20.5));
            t.put(JAVA_PREFIX + "property-known-algorithm", () -> withProperty(CoreOptions.ALGORITHM, "layered"));
            t.put(JAVA_PREFIX + "property-known-junction", () -> withProperty(CoreOptions.JUNCTION_POINTS,
                    new KVectorChain(new KVector(1, 2), new KVector(3, 4))));
            t.put(JAVA_PREFIX + "property-known-individual",
                    () -> withProperty(CoreOptions.SPACING_INDIVIDUAL, individualSpacings()));
            t.put(JAVA_PREFIX + "property-known-nulldouble", () -> withProperty(CoreOptions.SPACING_NODE_NODE, null));
        }

        private static void shapes(Map<String, Supplier<ElkNode>> t) {
            shape(t, "a", n -> n.setX(5));
            shape(t, "b", n -> n.setY(5));
            shape(t, "c", n -> n.setWidth(5));
            shape(t, "d", n -> n.setHeight(5));
            shape(t, "fractional", n -> { n.setX(1.5); n.setY(2.25); n.setWidth(3.75); n.setHeight(4.5); });
            shape(t, "intvalued", n -> { n.setX(3.0); n.setY(4.0); });
            shape(t, "big", n -> { n.setX(1.0E10); n.setWidth(-1.0E10); });
            shape(t, "nan", n -> n.setX(Double.NaN));
            shape(t, "inf", n -> { n.setX(Double.POSITIVE_INFINITY); n.setY(Double.NEGATIVE_INFINITY); });
            shape(t, "exp", n -> { n.setX(1.0E-5); n.setY(1.5E10); });
            shape(t, "negzero", n -> n.setX(-0.0));
            shape(t, "all", n -> { n.setX(1); n.setY(2); n.setWidth(3); n.setHeight(4); });
            shape(t, "zero", n -> { n.setX(0); n.setY(0); n.setWidth(0); n.setHeight(0); });
            shape(t, "half-xzero", n -> { n.setX(0); n.setY(5); });
            shape(t, "half-ywzero", n -> { n.setWidth(0); n.setHeight(5); });
            t.put(JAVA_PREFIX + "shape-everywhere", () -> {
                ElkNode r = root();
                ElkNode n = node(r);
                ElkPort p = ElkGraphUtil.createPort(n);
                p.setIdentifier("p");
                ElkLabel l = ElkGraphUtil.createLabel("t", n);
                l.setIdentifier("l");
                ElkNode child = ElkGraphUtil.createNode(n);
                child.setIdentifier("c");
                for (ElkShape s : List.of(r, p, l, child)) {
                    s.setX(1);
                    s.setY(2);
                    s.setWidth(3);
                    s.setHeight(4);
                }
                return r;
            });
        }

        private static void shape(Map<String, Supplier<ElkNode>> t, String what, java.util.function.Consumer<ElkNode> setup) {
            t.put(JAVA_PREFIX + "shape-" + what, () -> {
                ElkNode r = root();
                setup.accept(r);
                return r;
            });
        }

        private static void labels(Map<String, Supplier<ElkNode>> t) {
            t.put(JAVA_PREFIX + "label-text", () -> { ElkNode r = root(); ElkGraphUtil.createLabel("t", r); return r; });
            t.put(JAVA_PREFIX + "label-nested", () -> {
                ElkNode r = root();
                ElkLabel outer = ElkGraphUtil.createLabel("t", r);
                ElkLabel mid = ElkGraphUtil.createLabel("u", outer);
                ElkGraphUtil.createLabel("v", mid);
                return r;
            });
            t.put(JAVA_PREFIX + "label-many", () -> {
                ElkNode r = root();
                for (String s : List.of("a", "b", "c")) {
                    ElkGraphUtil.createLabel(s, r);
                }
                return r;
            });
            t.put(JAVA_PREFIX + "label-specials", () -> {
                ElkNode r = root();
                ElkGraphUtil.createLabel("q\"b\\n\nt\tu\u00e9\u0001", r);
                return r;
            });
            t.put(JAVA_PREFIX + "label-empty", () -> { ElkNode r = root(); ElkGraphUtil.createLabel("", r); return r; });
            t.put(JAVA_PREFIX + "label-spaces", () -> { ElkNode r = root(); ElkGraphUtil.createLabel("  a  b  ", r); return r; });
            t.put(JAVA_PREFIX + "label-on-port", () -> {
                ElkNode r = root();
                ElkPort p = ElkGraphUtil.createPort(node(r));
                p.setIdentifier("p");
                ElkGraphUtil.createLabel("t", p);
                return r;
            });
            t.put(JAVA_PREFIX + "label-on-edge", () -> {
                ElkNode r = root();
                ElkEdge e = twoNodeEdge(r, node(r));
                ElkGraphUtil.createLabel("t", e);
                return r;
            });
        }

        private static void identifiers(Map<String, Supplier<ElkNode>> t) {
            Map<String, String> ids = new LinkedHashMap<>();
            ids.put("specials", "a\"b\\c\nd");
            ids.put("empty", "");
            ids.put("unicode", "h\u00e9llo \u65e5\u672c");
            ids.put("keyword-id", "id");
            ids.put("keyword-true", "true");
            ids.put("keyword-null", "null");
            ids.put("keyword-children", "children");
            ids.put("numeric", "5");
            ids.put("dotted", "a.b.c");
            ids.put("spaces", "a b");
            ids.forEach((what, id) -> t.put(JAVA_PREFIX + "id-" + what, () -> {
                ElkNode r = ElkGraphUtil.createGraph();
                r.setIdentifier(id);
                return r;
            }));
            t.put(JAVA_PREFIX + "id-duplicate-siblings", () -> {
                ElkNode r = root();
                node(r);
                node(r);
                return r;
            });
            t.put(JAVA_PREFIX + "id-none", ElkGraphUtil::createGraph);
        }

        private static IndividualSpacings individualSpacings() {
            IndividualSpacings s = new IndividualSpacings();
            s.setProperty(CoreOptions.SPACING_NODE_NODE, 3.0);
            return s;
        }

        private static ElkNode root() {
            ElkNode root = ElkGraphUtil.createGraph();
            root.setIdentifier("g");
            return root;
        }

        private static ElkNode node(ElkNode parent) {
            ElkNode node = ElkGraphUtil.createNode(parent);
            node.setIdentifier(NODE_ID);
            return node;
        }

        private static ElkNode named(ElkNode parent, String id) {
            ElkNode node = ElkGraphUtil.createNode(parent);
            node.setIdentifier(id);
            return node;
        }

        private static ElkNode deepNesting() {
            ElkNode cur = root();
            ElkNode root = cur;
            for (int i = 1; i <= 6; i++) {
                cur = named(cur, "n" + i);
            }
            return root;
        }

        private static ElkNode everything() {
            ElkNode r = root();
            r.setX(1);
            r.setY(2);
            r.setWidth(3);
            r.setHeight(4);
            r.setProperty(CoreOptions.PRIORITY, 1);
            r.setProperty(CoreOptions.DIRECTION, Direction.DOWN);
            ElkGraphUtil.createLabel("root", r);
            ElkNode a = named(r, "a");
            ElkGraphUtil.createLabel("al", a);
            ElkPort p = ElkGraphUtil.createPort(a);
            p.setIdentifier("p");
            ElkGraphUtil.createLabel("pl", p);
            p.setProperty(CoreOptions.PRIORITY, 2);
            ElkNode b = named(r, "b");
            ElkEdge e = ElkGraphUtil.createEdge(r);
            e.setIdentifier("e");
            e.getSources().add(p);
            e.getTargets().add(b);
            ElkGraphUtil.createLabel("el", e);
            e.setProperty(CoreOptions.PRIORITY, 3);
            return r;
        }

        private static ElkNode propertyOn(String element) {
            ElkNode r = root();
            ElkNode n = node(r);
            ElkPort p = ElkGraphUtil.createPort(n);
            p.setIdentifier("p");
            ElkLabel l = ElkGraphUtil.createLabel("t", n);
            l.setIdentifier("l");
            ElkEdge e = ElkGraphUtil.createEdge(r);
            e.setIdentifier("e");
            e.getSources().add(n);
            e.getTargets().add(n);
            ElkGraphElement target = switch (element) {
                case "graph" -> r;
                case "node" -> n;
                case "port" -> p;
                case "label" -> l;
                default -> e;
            };
            target.setProperty(CoreOptions.PRIORITY, 1);
            return r;
        }

        private static ElkNode propertyOrder() {
            ElkNode r = root();
            ElkNode n = r;
            n.getProperties().put(new Property<Object>("z.last"), "z");
            n.getProperties().put(CoreOptions.PRIORITY, 1);
            n.getProperties().put(new Property<Object>("a.first"), true);
            n.getProperties().put(CoreOptions.DIRECTION, Direction.UP);
            n.getProperties().put(new Property<Object>("m.mid"), 2.5);
            return r;
        }

        private static ElkNode sectionWithoutIdentifier() {
            ElkNode root = root();
            ElkEdge edge = twoNodeEdge(root, named(root, "a"));
            ElkGraphUtil.createEdgeSection(edge).setIdentifier("s1");
            ElkEdgeSection second = ElkGraphUtil.createEdgeSection(edge);
            second.setStartX(1);
            second.setStartY(2);
            return root;
        }

        private static ElkNode sectionWithBendPoints() {
            ElkNode root = root();
            ElkEdge edge = twoNodeEdge(root, named(root, "a"));
            ElkEdgeSection s = ElkGraphUtil.createEdgeSection(edge);
            s.setIdentifier("s1");
            s.setStartX(0);
            s.setStartY(0);
            s.setEndX(30);
            s.setEndY(40);
            ElkGraphUtil.createBendPoint(s, 10, 0);
            ElkGraphUtil.createBendPoint(s, 10, 40);
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
            edge.getSources().add(named(root, "a"));
            edge.getTargets().add(outside);
            return root;
        }

        private static ElkNode hyperedge() {
            ElkNode r = root();
            ElkNode a = named(r, "a");
            ElkNode b = named(r, "b");
            ElkNode c = named(r, "c");
            ElkNode d = named(r, "d");
            ElkEdge e = ElkGraphUtil.createEdge(r);
            e.setIdentifier("e");
            e.getSources().add(a);
            e.getSources().add(b);
            e.getTargets().add(c);
            e.getTargets().add(d);
            return r;
        }

        private static ElkNode portEndpoints() {
            ElkNode r = root();
            ElkPort p = ElkGraphUtil.createPort(named(r, "a"));
            p.setIdentifier("p");
            ElkPort q = ElkGraphUtil.createPort(named(r, "b"));
            q.setIdentifier("q");
            ElkEdge e = ElkGraphUtil.createEdge(r);
            e.setIdentifier("e");
            e.getSources().add(p);
            e.getTargets().add(q);
            return r;
        }

        private static ElkNode containedInChild() {
            ElkNode r = root();
            ElkNode a = named(r, "a");
            ElkNode c = named(a, "c");
            ElkNode d = named(a, "d");
            ElkEdge e = ElkGraphUtil.createEdge(a);
            e.setIdentifier("e");
            e.getSources().add(c);
            e.getTargets().add(d);
            return r;
        }

        // Pairs of (String key id, value) put on R in argument order, each key a new Property<Object>(id).
        private static ElkNode withProperties(Object... idsAndValues) {
            if (idsAndValues.length % 2 != 0) {
                throw new IllegalArgumentException(
                        "withProperties needs id, value pairs; got " + idsAndValues.length + " arguments");
            }
            ElkNode root = root();
            for (int i = 0; i < idsAndValues.length; i += 2) {
                root.getProperties().put(new Property<Object>((String) idsAndValues[i]), idsAndValues[i + 1]);
            }
            return root;
        }

        private static ElkNode withProperty(IProperty<?> key, Object value) {
            ElkNode root = root();
            root.getProperties().put(key, value);
            return root;
        }
    }
}
