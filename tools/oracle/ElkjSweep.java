// SPDX-License-Identifier: EPL-2.0
// JVM driver of the .elkj sweep (graph-json-text mission T17, D2 as amended 2026-10-16): the oracle's validate and write
// outputs over many inputs, plus the bookkeeping modes tools/oracle/elkj-sweep.sh needs. It only CALLS ELK/Xtext (the same
// calls as tools/vectors/ElkjValidateVectors.java and ElkjWriteVectors.java, whose procedures it follows); it embeds no
// ELK implementation. The `convert`, `parse` and `parse-elkj` cases run through tools/oracle/run.sh (the harness has those
// modes). Run (single-file source program, classpath of tools/oracle/elkj-sweep.sh), always with the CoreOptions-only
// registry (G3, D4: the first statement of every case-running mode):
//   java -cp <cp> ElkjSweep.java validate <cases.tsv> <outDir>             one <id>.json per case: {"issues":[ISSUE]}
//   java -cp <cp> ElkjSweep.java write    <cases.tsv> <outDir> [threads]   {"text":S,"reparse":{errors,json[,throws]}} | {"error":E}
//   java -cp <cp> ElkjSweep.java duplicates <cases.tsv>                    ids whose graph repeats an identifier, one per line
//   java -cp <cp> ElkjSweep.java merge <kind> <ext> <dir1> <results1> <dir2|-> <results2|->   merged lines on stdout
//   java -cp <cp> ElkjSweep.java summary <results.jsonl> <elkCommit> <modelsCommit>            summary.json on stdout
// cases.tsv: one case per line, "<id>\t<input path>". Output file = id with "/" replaced by "__" plus ".json".
//   validate: the input is an .elkj file. write / duplicates: an .elkt (ELK text) or .json (ELK JSON) graph.
// ISSUE = {severity, message, line, code} in the validator's emission order (not sorted).
// Result lines (stdout of validate/write): {"id","status":"ok|throws|oracle-error",["exception":{class,message}],"ms"}.
// `write` runs the cases on <threads> workers (default 8): Xtext's serializer caches are not thread safe, so each worker
// owns an injector (the ElkjWriteVectors pattern); the graphs are read on the calling thread first. Result lines come in
// completion order; merge sorts by id. Only the formatted text is recorded (unformatted == formatted, T5).
// Merged lines: {"id","kind","status":"ok|throws|nondeterministic|oracle-error|timeout"[,"exception"],"runs":1|2}:
//   a case with a second run is nondeterministic when the two runs' result lines (minus ms) or output files differ;
//   a case without one (second dir "-" or no line) keeps its first run's status with "runs":1. An exception message is
//   compared with the directory of each file URI replaced (Xtext names the output file, and each run has its own directory).
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.regex.Pattern;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkGraphPackage;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.json.text.ElkGraphJsonStandaloneSetup;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;
import org.eclipse.xtext.util.CancelIndicator;
import org.eclipse.xtext.validation.CheckMode;
import org.eclipse.xtext.validation.Issue;

public class ElkjSweep {
    private static final String OK = "ok", THROWS = "throws", ORACLE_ERROR = "oracle-error";
    private static final String NONDETERMINISTIC = "nondeterministic";
    private static final String ID = "id", STATUS = "status", EXCEPTION = "exception", MS = "ms", KIND = "kind", RUNS = "runs";
    private static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    private static final String SYNTH = "synthetic:/x.elkj", REPARSE = "synthetic:/reparse.elkj";
    private static final String ELKT = ".elkt", NO_SECOND_RUN = "-";
    private static final String ID_SEPARATOR = "/", ID_REPLACEMENT = "__", JSON_EXTENSION = ".json";
    private static final int DEFAULT_THREADS = 8;
    private static final long NANOS_PER_MILLI = 1_000_000L;
    private static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");
    /** The directory part of a file URI: Xtext's serializer errors name the output file, and each run has its own directory. */
    private static final Pattern FILE_URI_DIRECTORY = Pattern.compile("file:/\\S*/");
    private static final Gson COMPACT = new GsonBuilder().disableHtmlEscaping().serializeNulls().create();
    private static final Gson PRETTY = new GsonBuilder().disableHtmlEscaping().setPrettyPrinting().create();

    /** One input: the case id and the model file. */
    private record Input(String id, Path file) { }

    /** A case body: reads its input, returns the JSON written to the case's output file. */
    private interface CaseBody {
        JsonObject run(Path file) throws IOException;
    }

    public static void main(String[] args) throws Exception {
        switch (args.length == 0 ? "" : args[0]) {
            case "validate" -> runSequential(args);
            case "write" -> runWrite(args);
            case "duplicates" -> duplicates(args);
            case "merge" -> merge(args);
            case "summary" -> System.out.println(summary(args));
            default -> throw new IllegalArgumentException(
                    "usage: ElkjSweep validate|write <cases> <outDir> | duplicates <cases> | merge ... | summary ...");
        }
    }

    // ---- setup (the .elkj standalone setup does not register the ElkGraph EPackage: touch it first, T1/T2 notes)

    private static void setup() {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphPackage.eINSTANCE.getElkNode();
        ElkGraphJsonStandaloneSetup.doSetup();
    }

    // ---- driver

    private static void runSequential(String[] args) throws IOException {
        setup();
        Path outDir = Path.of(args[2]);
        Files.createDirectories(outDir);
        for (Input input : inputs(Path.of(args[1]))) {
            System.out.println(COMPACT.toJson(runCase(input, ElkjSweep::validate, outDir)));
        }
    }

    private static List<Input> inputs(Path casesFile) throws IOException {
        List<Input> inputs = new ArrayList<>();
        for (String line : Files.readAllLines(casesFile, StandardCharsets.UTF_8)) {
            if (!line.isBlank()) {
                String[] parts = line.split("\t", 2);
                inputs.add(new Input(parts[0], Path.of(parts[1])));
            }
        }
        return inputs;
    }

    private static JsonObject runCase(Input input, CaseBody body, Path outDir) {
        long start = System.nanoTime();
        JsonObject result = new JsonObject();
        result.addProperty(ID, input.id());
        try {
            write(outDir.resolve(outputName(input.id())), body.run(input.file()));
            result.addProperty(STATUS, OK);
        } catch (IOException e) {
            fail(result, ORACLE_ERROR, e);
        } catch (Exception | StackOverflowError e) {
            fail(result, THROWS, e);
        }
        result.addProperty(MS, (System.nanoTime() - start) / NANOS_PER_MILLI);
        return result;
    }

    private static void fail(JsonObject result, String status, Throwable e) {
        result.addProperty(STATUS, status);
        result.add(EXCEPTION, failure(e));
    }

    private static JsonObject failure(Throwable e) {
        JsonObject failure = new JsonObject();
        failure.addProperty("class", e.getClass().getName());
        failure.addProperty("message", e.getMessage() == null ? null : IDENTITY_HASH.matcher(e.getMessage()).replaceAll("@<hash>"));
        return failure;
    }

    static String outputName(String id) {
        return id.replace(ID_SEPARATOR, ID_REPLACEMENT) + JSON_EXTENSION;
    }

    private static void write(Path path, JsonObject json) throws IOException {
        Files.writeString(path, COMPACT.toJson(json) + "\n", StandardCharsets.UTF_8);
    }

    // ---- validate (ElkjValidateVectors.record: IResourceValidator over the resource loaded from the file)

    private static JsonObject validate(Path file) {
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        List<Issue> issues = ((XtextResource) resource).getResourceServiceProvider().getResourceValidator()
                .validate(resource, CheckMode.ALL, CancelIndicator.NullImpl);
        JsonArray rows = new JsonArray();
        for (Issue issue : issues) {
            JsonObject row = new JsonObject();
            row.addProperty("severity", issue.getSeverity().name().toLowerCase(Locale.ROOT));
            row.addProperty("message", issue.getMessage());
            row.addProperty("line", issue.getLineNumber());
            row.addProperty("code", issue.getCode());
            rows.add(row);
        }
        JsonObject out = new JsonObject();
        out.add("issues", rows);
        return out;
    }

    // ---- source graphs (the oracle's ElkModelReader: .elkt through the .elkt language, .json through ElkGraphJson)

    private static ElkNode readGraph(Path file) throws IOException {
        if (!file.getFileName().toString().endsWith(ELKT)) {
            return ElkGraphJson.forGraph(Files.readString(file, StandardCharsets.UTF_8)).toElk();
        }
        ElkGraphStandaloneSetup.doSetup();
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        if (!resource.getErrors().isEmpty()) {
            throw new IllegalStateException(resource.getErrors().get(0).getMessage());
        }
        resource.load(Collections.emptyMap());
        return (ElkNode) resource.getContents().get(0);
    }

    // ---- duplicates: the graphs whose identifiers repeat (where GraphIdentifierGenerator's seeded Random matters, D12)

    private static void duplicates(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        for (Input input : inputs(Path.of(args[1]))) {
            ElkNode root = readGraph(input.file());
            Set<String> seen = new HashSet<>();
            boolean repeats = false;
            for (Iterator<EObject> it = EcoreUtil.getAllContents(List.of(root)); it.hasNext();) {
                if (it.next() instanceof ElkGraphElement element && element.getIdentifier() != null) {
                    repeats |= !seen.add(element.getIdentifier());
                }
            }
            if (repeats) {
                System.out.println(input.id());
            }
        }
    }

    // ---- write (ElkjWriteVectors.record: EcoreUtil.copy + ISerializer.serialize(format()), then the oracle's reparse)

    private static void runWrite(String[] args) throws Exception {
        setup();
        ElkGraphStandaloneSetup.doSetup();
        new ElkGraphJsonStandaloneSetup().createInjectorAndDoEMFRegistration();
        Path outDir = Path.of(args[2]);
        Files.createDirectories(outDir);
        int threads = args.length > 3 ? Integer.parseInt(args[3]) : DEFAULT_THREADS;
        Map<Input, Object> graphs = new LinkedHashMap<>();
        for (Input input : inputs(Path.of(args[1]))) {
            graphs.put(input, readOrFailure(input.file()));
        }
        ThreadLocal<Writer> perThread = ThreadLocal.withInitial(() -> new Writer(new ElkGraphJsonStandaloneSetup().createInjector()));
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            List<Future<?>> futures = new ArrayList<>();
            graphs.forEach((input, graph) -> futures.add(pool.submit(() -> writeCase(input, graph, perThread.get(), outDir))));
            for (Future<?> future : futures) {
                future.get();
            }
        } finally {
            pool.shutdown();
        }
    }

    /** The graph of a file, or the exception that stopped the reading (reported as the case's oracle-error). */
    private static Object readOrFailure(Path file) {
        try {
            return readGraph(file);
        } catch (Exception e) {
            return e;
        }
    }

    private static void writeCase(Input input, Object graph, Writer writer, Path outDir) {
        CaseBody body = file -> {
            if (graph instanceof Exception e) {
                throw new IOException("cannot read " + input.id() + ": " + e, e);
            }
            return writer.write((ElkNode) graph);
        };
        JsonObject result = runCase(input, body, outDir);
        synchronized (ElkjSweep.class) {
            System.out.println(COMPACT.toJson(result));
            System.out.flush();
        }
    }

    /** One worker's serializer: the injector is per worker (its caches are not thread safe). */
    private static final class Writer {
        private final Injector injector;

        Writer(Injector injector) {
            this.injector = injector;
        }

        JsonObject write(ElkNode root) {
            JsonObject out = new JsonObject();
            String text;
            try {
                text = serialize(root);
            } catch (Exception | StackOverflowError e) {
                out.add("error", failure(e));
                return out;
            }
            out.addProperty("text", text);
            out.add("reparse", reparse(text));
            return out;
        }

        private String serialize(ElkNode root) {
            EObject copy = EcoreUtil.copy(root);
            fresh(SYNTH).getContents().add(copy);
            return injector.getInstance(ISerializer.class).serialize(copy, SaveOptions.newBuilder().format().getOptions());
        }

        private Resource fresh(String uri) {
            Resource resource = injector.getInstance(XtextResourceSet.class).createResource(URI.createURI(uri));
            if (resource == null) {
                throw new IllegalStateException("no resource factory for " + uri);
            }
            return resource;
        }

        private JsonObject reparse(String text) {
            Resource resource = fresh(REPARSE);
            JsonObject out = new JsonObject();
            try (InputStream in = new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8))) {
                resource.load(in, Collections.emptyMap());
                EcoreUtil.resolveAll(resource);
                int errors = resource.getErrors().size();
                out.addProperty("errors", errors);
                boolean exportable = errors == 0 && !resource.getContents().isEmpty();
                out.addProperty("json", exportable ? export((ElkNode) resource.getContents().get(0)) : null);
            } catch (Exception | StackOverflowError e) {
                out.addProperty("errors", resource.getErrors().size());
                out.addProperty("json", (String) null);
                out.add("throws", failure(e));
            }
            return out;
        }
    }

    // Same flags as tools/oracle/harness/CaseRunner.export.
    private static String export(ElkNode graph) {
        return ElkGraphJson.forGraph(graph).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                .omitUnknownLayoutOptions(true).prettyPrint(true).toJson();
    }

    // ---- merge: up to two runs -> one result line per case (D5)

    /** One run of a mode: its output directory and its result lines by id (minus ms). */
    private record Run(Path dir, Map<String, JsonObject> lines) { }

    private static void merge(String[] args) throws IOException {
        String kind = args[1], extension = args[2];
        Run first = new Run(Path.of(args[3]), byId(Path.of(args[4])));
        boolean doubled = !NO_SECOND_RUN.equals(args[5]);
        Run second = doubled ? new Run(Path.of(args[5]), byId(Path.of(args[6]))) : null;
        for (Map.Entry<String, JsonObject> line : new TreeMap<>(first.lines()).entrySet()) {
            System.out.println(COMPACT.toJson(merged(kind, extension, line.getValue(), first, second)));
        }
    }

    private static Map<String, JsonObject> byId(Path results) throws IOException {
        Map<String, JsonObject> lines = new LinkedHashMap<>();
        for (String line : Files.readAllLines(results, StandardCharsets.UTF_8)) {
            if (!line.isBlank()) {
                JsonObject json = JsonParser.parseString(line).getAsJsonObject();
                json.remove(MS);
                normalizeFileUris(json);
                lines.put(json.get(ID).getAsString(), json);
            }
        }
        return lines;
    }

    /** Replaces the directory of every file URI in the exception message, so two runs in two directories compare equal. */
    private static void normalizeFileUris(JsonObject line) {
        if (line.has(EXCEPTION) && !line.get(EXCEPTION).getAsJsonObject().get("message").isJsonNull()) {
            JsonObject exception = line.get(EXCEPTION).getAsJsonObject();
            exception.addProperty("message", FILE_URI_DIRECTORY.matcher(exception.get("message").getAsString()).replaceAll("file:<outDir>/"));
        }
    }

    private static JsonObject merged(String kind, String extension, JsonObject line, Run first, Run second) throws IOException {
        String id = line.get(ID).getAsString();
        String status = line.get(STATUS).getAsString();
        boolean twice = second != null && second.lines().containsKey(id);
        boolean stable = !twice || (line.equals(second.lines().get(id))
                && (!OK.equals(status) || sameOutput(first, second, extension, id)));
        JsonObject out = new JsonObject();
        out.addProperty(ID, id);
        out.addProperty(KIND, kind);
        out.addProperty(STATUS, stable ? status : NONDETERMINISTIC);
        if (stable && line.has(EXCEPTION)) {
            out.add(EXCEPTION, line.get(EXCEPTION));
        }
        out.addProperty(RUNS, twice ? 2 : 1);
        return out;
    }

    private static boolean sameOutput(Run first, Run second, String extension, String id) throws IOException {
        String name = id.replace(ID_SEPARATOR, ID_REPLACEMENT) + extension;
        Path a = first.dir().resolve(name), b = second.dir().resolve(name);
        return Files.exists(a) == Files.exists(b) && (!Files.exists(a) || Arrays.equals(Files.readAllBytes(a), Files.readAllBytes(b)));
    }

    // ---- summary

    private static String summary(String[] args) throws IOException {
        Map<String, Map<String, Integer>> counts = new TreeMap<>();
        for (String line : Files.readAllLines(Path.of(args[1]), StandardCharsets.UTF_8)) {
            if (!line.isBlank()) {
                JsonObject json = JsonParser.parseString(line).getAsJsonObject();
                count(counts, json.get(KIND).getAsString(), json.get(STATUS).getAsString());
                count(counts, json.get(KIND).getAsString(), "runs" + json.get(RUNS).getAsInt());
            }
        }
        JsonObject out = new JsonObject();
        out.addProperty("elkCommit", args[2]);
        out.addProperty("modelsCommit", args[3]);
        out.addProperty("registry", "core");
        out.add("counts", PRETTY.toJsonTree(counts));
        return PRETTY.toJson((JsonElement) out);
    }

    private static void count(Map<String, Map<String, Integer>> counts, String kind, String key) {
        counts.computeIfAbsent(kind, k -> new TreeMap<>()).merge(key, 1, Integer::sum);
    }
}
