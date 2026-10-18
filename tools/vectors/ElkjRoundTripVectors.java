// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13) for the ELK textual JSON (.elkj) ROUND TRIP: what Xtext's ISerializer
// does with a graph the oracle itself LOADED from a .elkj text, and what the oracle makes of the written text. This program
// only CALLS ELK and Xtext (load, EcoreUtil.copy, ISerializer, the exporter); it embeds no ELK or Xtext implementation.
// Run: tools/vectors/elkj-vectors.sh <outDir>
//   (java -cp ... ElkjRoundTripVectors.java <outDir> <tools/vectors dir> [<cacheDir> [<idsFile>]])
// Registry: first statement is LayoutMetaDataService.getInstance(new ClassLoader(null) { }) (CoreOptions only, D4).
// Inputs (id = what test/golden/elkj-roundtrip.test.ts calls the case):
//   curated/<id>    every file under <repo>/test/corpus/elkj-curated/ (tier-1 .elkj and tier-2 .json alike, all read as
//                   .elkj as ElkGraphJsonText.load does); id = path below the directory minus the extension.
//   scenario/<file> every <vectorsDir>/elkj-parse-scenarios/*.elkj; id = the file name including ".elkj".
// An input is kept when the oracle load (a fresh XtextResourceSet from the ElkGraphJsonStandaloneSetup injector, resource
// "synthetic:/in.elkj", Resource.load, NO resolveAll: linking is lazy, so an unresolved reference is not a load error)
// reports no resource error and yields an ElkNode root. The number of kept and skipped inputs goes to stderr.
// Per kept input, with the graph exactly as loaded:
//   loadErrors   resource.getErrors().size() after the load (0 for every kept input; recorded for the replay).
//   edgesBefore  per edge in model order (children recursively first, then the node's containedEdges; as the ElkjParseVectors
//                proxiesAtLoad order) the raw lists read without resolution (InternalEList.basicList):
//                { "sources": [isProxy, ...], "targets": [isProxy, ...] }.
//   formatted    serialize(EcoreUtil.copy(root) placed in a fresh XtextResource "synthetic:/x.elkj", SaveOptions.format()),
//                the exact string, or - instead of "formatted" - "error": { cls, msg }; cls = binary class name of the thrown
//                Throwable, msg its message with identity hashes "@<hex>" replaced by "@<hash>" and every file URI by
//                "file:<path>".
//   reparse      (only after a non-error output) the written text loaded again as T5 does: fresh XtextResourceSet, resource
//                "synthetic:/reparse.elkj", Resource.load, EcoreUtil.resolveAll, errors = resource.getErrors().size()
//                (syntax, conversion and linking alike), json = ElkGraphJson export of the reparsed root with the oracle flags
//                (omitLayout=false, omitZeroDimension=false, omitZeroPositions=false, omitUnknownLayoutOptions=true,
//                prettyPrint=true; system property org.eclipse.elk.graph.json.exportSeed=1) when errors == 0 and a root exists,
//                else null; "throws": { cls, msg } when the reload or export threw.
// Output <outDir>/graph-json-text-roundtrip.json, 2-space indent for the top level, one compact case per line, sorted by id,
// trailing newline: { elkCommit, xtextVersion, registry: "core", cases: [ { id, source: "curated"|"scenario", loadErrors,
//   edgesBefore, formatted | error, reparse } ] }
// Cost: the Xtext serializer does an uncached stack-pruning PDA search per token (30 to 1,100 CPU-seconds per corpus graph).
// Run with -XX:+UseSerialGC -Xmn3g -Xmx16g. One injector per worker thread (Xtext caches are not thread safe); inputs are loaded
// sequentially on the main thread; rows are keyed by id, so the output does not depend on the schedule.
// Encoding: strings are JSON; an unpaired UTF-16 surrogate is written as a JSON u-escape (it has no UTF-8 form). The written
// text is passed to the reparse as its UTF-8 bytes, where Java replaces an unpaired surrogate by '?'.
// Optional resumable mode (for hours-long runs; default off, then everything is recorded in-process):
//   <cacheDir>  each finished case is written to <cacheDir>/<sha256(id NUL text)>.json and a case already there is not
//               recomputed; a restarted run completes the missing ones.
//   <idsFile>   only the ids listed (one per line) are recorded, and only they are written to the output (staged runs).
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import com.google.inject.Injector;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.json.text.ElkGraphJsonStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EReference;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.emf.ecore.util.InternalEList;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;

public class ElkjRoundTripVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    private static final String OUT_NAME = "graph-json-text-roundtrip.json";
    private static final String CURATED_DIR = "../../test/corpus/elkj-curated", SCENARIO_DIR = "elkj-parse-scenarios";
    private static final String CURATED = "curated", SCENARIO = "scenario", ELKJ = ".elkj";
    private static final String INPUT = "synthetic:/in.elkj", SYNTH = "synthetic:/x.elkj", REPARSE = "synthetic:/reparse.elkj";
    private static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");
    private static final Pattern FILE_URI = Pattern.compile("file:[^\\s'\"]*");
    private static final int WORKERS = 8;
    private static final long NANOS_PER_MS = 1_000_000L;

    private final Injector injector;

    private ElkjRoundTripVectors(Injector injector) {
        this.injector = injector;
    }

    /** A loaded input: the graph as loaded and the parts of its row known before writing. */
    private record Input(String id, String source, String key, int loadErrors, String edgesBefore, ElkNode root,
            int size) { }

    public static void main(String[] args) throws Exception {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        // The .elkj setup does not register the ElkGraph EPackage; without this touch every load fails with
        // "Unresolved proxy http://www.eclipse.org/elk/ElkGraph#//ElkNode".
        ElkGraphPackage.eINSTANCE.getElkNode();
        Injector injector = new ElkGraphJsonStandaloneSetup().createInjectorAndDoEMFRegistration();
        ElkjRoundTripVectors loader = new ElkjRoundTripVectors(injector);
        Path vectors = Path.of(args[1]);
        Path cacheDir = args.length > 2 ? Path.of(args[2]) : null;
        Set<String> only = args.length > 3 ? new HashSet<>(Files.readAllLines(Path.of(args[3]))) : null;
        List<Input> inputs = new ArrayList<>();
        int[] skipped = {0};
        for (Object[] file : inputFiles(vectors)) {
            Input in = loader.load((String) file[0], (String) file[1], (Path) file[2]);
            if (in == null) {
                skipped[0]++;
            } else if (only == null || only.contains(in.id)) {
                inputs.add(in);
            }
        }
        System.err.println("kept " + inputs.size() + " skipped " + skipped[0]
                + (only == null ? "" : " (restricted to " + only.size() + " ids)"));
        // Smallest inputs first: progress shows early and the big graphs do not hold every worker (and the heap) at once.
        inputs.sort(Comparator.comparingInt(Input::size).thenComparing(Input::id));
        Map<String, String> rows = recordAll(inputs, cacheDir);
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0]).resolve(OUT_NAME), document(rows), StandardCharsets.UTF_8);
    }

    /** { id, source, path } for every curated file (recursive) and every scenario, sorted by id. */
    private static List<Object[]> inputFiles(Path vectors) throws IOException {
        List<Object[]> out = new ArrayList<>();
        Path curated = vectors.resolve(CURATED_DIR).normalize();
        try (Stream<Path> files = Files.walk(curated)) {
            for (Path f : files.filter(Files::isRegularFile).sorted().toList()) {
                String rel = curated.relativize(f).toString().replace('\\', '/');
                out.add(new Object[] {CURATED + "/" + rel.substring(0, rel.lastIndexOf('.')), CURATED, f});
            }
        }
        try (Stream<Path> files = Files.list(vectors.resolve(SCENARIO_DIR))) {
            for (Path f : files.filter(p -> p.getFileName().toString().endsWith(ELKJ)).sorted().toList()) {
                out.add(new Object[] {SCENARIO + "/" + f.getFileName(), SCENARIO, f});
            }
        }
        return out;
    }

    private Input load(String id, String source, Path file) throws IOException {
        byte[] bytes = Files.readAllBytes(file);
        Resource resource = freshResource(INPUT);
        try {
            resource.load(new ByteArrayInputStream(bytes), Collections.emptyMap());
        } catch (Exception e) {
            return null;
        }
        if (!resource.getErrors().isEmpty() || resource.getContents().isEmpty()
                || !(resource.getContents().get(0) instanceof ElkNode root)) {
            return null;
        }
        return new Input(id, source, sha256(id + "\0" + new String(bytes, StandardCharsets.UTF_8)), 0, edgesBefore(root), root,
                bytes.length);
    }

    private static String edgesBefore(ElkNode root) {
        List<String> edges = new ArrayList<>();
        collectEdges(root, edges);
        return "[" + String.join(", ", edges) + "]";
    }

    private static void collectEdges(ElkNode node, List<String> out) {
        node.getChildren().forEach(c -> collectEdges(c, out));
        for (ElkEdge e : node.getContainedEdges()) {
            out.add("{\"sources\": " + flags(e, ElkGraphPackage.Literals.ELK_EDGE__SOURCES) + ", \"targets\": "
                    + flags(e, ElkGraphPackage.Literals.ELK_EDGE__TARGETS) + "}");
        }
    }

    @SuppressWarnings("unchecked")
    private static String flags(ElkEdge edge, EReference reference) {
        List<EObject> raw = new ArrayList<>((List<EObject>) ((InternalEList<?>) edge.eGet(reference, false)).basicList());
        return "[" + String.join(", ", raw.stream().map(t -> String.valueOf(t.eIsProxy())).toList()) + "]";
    }

    private static Map<String, String> recordAll(List<Input> inputs, Path cacheDir) throws Exception {
        if (cacheDir != null) {
            Files.createDirectories(cacheDir);
        }
        int threads = Math.max(1, Math.min(WORKERS, Runtime.getRuntime().availableProcessors()));
        ThreadLocal<ElkjRoundTripVectors> perThread = ThreadLocal.withInitial(
                () -> new ElkjRoundTripVectors(new ElkGraphJsonStandaloneSetup().createInjector()));
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            Map<String, Future<String>> futures = new TreeMap<>();
            for (Input in : inputs) {
                futures.put(in.id, pool.submit(() -> {
                    Path cached = cacheDir == null ? null : cacheDir.resolve(in.key + ".json");
                    if (cached != null && Files.exists(cached)) {
                        System.err.println("cached " + in.id);
                        return Files.readString(cached, StandardCharsets.UTF_8);
                    }
                    long start = System.nanoTime(), cpuStart = ManagementFactory.getThreadMXBean().getCurrentThreadCpuTime();
                    String row = perThread.get().record(in);
                    long cpu = ManagementFactory.getThreadMXBean().getCurrentThreadCpuTime() - cpuStart;
                    if (cached != null) {
                        Path tmp = cacheDir.resolve(in.key + ".tmp");
                        Files.writeString(tmp, row, StandardCharsets.UTF_8);
                        Files.move(tmp, cached, java.nio.file.StandardCopyOption.ATOMIC_MOVE);
                    }
                    System.err.println("done " + in.id + " " + (System.nanoTime() - start) / NANOS_PER_MS + " ms wall, "
                            + cpu / NANOS_PER_MS + " ms cpu");
                    return row;
                }));
            }
            Map<String, String> rows = new TreeMap<>();
            for (Map.Entry<String, Future<String>> e : futures.entrySet()) {
                rows.put(e.getKey(), e.getValue().get());
            }
            return rows;
        } finally {
            pool.shutdown();
        }
    }

    private static String document(Map<String, String> rows) {
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"xtextVersion\": \"").append(XTEXT_VERSION).append("\",\n");
        out.append("  \"registry\": \"core\",\n  \"cases\": [\n");
        out.append(String.join(",\n", rows.values())).append("\n  ]\n}\n");
        return out.toString();
    }

    private String record(Input in) {
        StringBuilder row = new StringBuilder("    {\"id\": ").append(quote(in.id));
        row.append(", \"source\": ").append(quote(in.source));
        row.append(", \"loadErrors\": ").append(in.loadErrors);
        row.append(", \"edgesBefore\": ").append(in.edgesBefore);
        String text = null;
        try {
            EObject copy = EcoreUtil.copy(in.root);
            freshResource(SYNTH).getContents().add(copy);
            text = injector.getInstance(ISerializer.class).serialize(copy, SaveOptions.newBuilder().format().getOptions());
            row.append(", \"formatted\": ").append(quote(text));
        } catch (Exception | StackOverflowError e) {
            row.append(", \"error\": ").append(failure(e));
        }
        if (text != null) {
            row.append(", \"reparse\": ").append(reparse(text));
        }
        return row.append('}').toString();
    }

    private Resource freshResource(String uri) {
        Resource resource = injector.getInstance(XtextResourceSet.class).createResource(URI.createURI(uri));
        if (resource == null) {
            throw new IllegalStateException("no resource factory for " + uri);
        }
        return resource;
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
        String message = e.getMessage();
        if (message != null) {
            message = FILE_URI.matcher(IDENTITY_HASH.matcher(message).replaceAll("@<hash>")).replaceAll("file:<path>");
        }
        return "{\"cls\": " + quote(e.getClass().getName()) + ", \"msg\": " + (message == null ? "null" : quote(message)) + "}";
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

    /** An unpaired UTF-16 surrogate cannot be written as UTF-8; it is recorded as a JSON u-escape. */
    private static boolean loneSurrogate(String s, int i) {
        char c = s.charAt(i);
        if (Character.isHighSurrogate(c)) {
            return i + 1 >= s.length() || !Character.isLowSurrogate(s.charAt(i + 1));
        }
        return Character.isLowSurrogate(c) && (i == 0 || !Character.isHighSurrogate(s.charAt(i - 1)));
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
                default -> out.append(c < 0x20 || loneSurrogate(s, i) ? String.format("\\u%04x", (int) c) : String.valueOf(c));
            }
        }
        return out.append('"').toString();
    }
}
