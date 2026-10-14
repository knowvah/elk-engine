// SPDX-License-Identifier: EPL-2.0
// JVM driver of the .elkt sweep (graph-text mission T23, G7, refinement 8): the oracle's validate and write outputs
// over many inputs, plus the two bookkeeping modes tools/oracle/elkt-sweep.sh needs. It only CALLS ELK/Xtext (the
// same calls as tools/vectors/ElktValidateVectors.java and ElktWriteVectors.java, whose procedures it follows); it
// embeds no ELK implementation. The `parse` cases run through tools/oracle/run.sh (the harness has that mode).
// Run (single-file source program, classpath of tools/vectors/elkt-vectors.sh), always with the CoreOptions-only
// registry (G3, C8: the first statement of validate/write):
//   java -cp <cp> ElktSweep.java validate <cases.tsv> <outDir>   one <id>.json per case: {"issues":[ISSUE]}
//   java -cp <cp> ElktSweep.java write    <cases.tsv> <outDir>   {"text":S,"reparse":{errors,json[,throws]}} | {"error":E}
//   java -cp <cp> ElktSweep.java merge <kind> <dir1> <results1> <dir2> <results2>   merged result lines on stdout
//   java -cp <cp> ElktSweep.java summary <results.jsonl> <elkCommit> <modelsCommit>  summary.json on stdout
// cases.tsv: one case per line, "<id>\t<input path>". Output file = id with "/" replaced by "__" plus ".json".
// ISSUE = {severity, message, line, code} in the validator's emission order (not sorted; D5 decides determinism).
// Result lines (stdout of validate/write): {"id","status":"ok|throws|oracle-error",["exception":{class,message}],"ms"}.
// Merged lines: {"id","kind","status":"ok|throws|nondeterministic|oracle-error|timeout"[,"exception"]} without "ms":
//   a case is nondeterministic when the two runs' result lines (minus ms) or output files differ.
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.regex.Pattern;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
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

public class ElktSweep {
    private static final String OK = "ok", THROWS = "throws", ORACLE_ERROR = "oracle-error";
    private static final String NONDETERMINISTIC = "nondeterministic";
    private static final String ID = "id", STATUS = "status", EXCEPTION = "exception", MS = "ms", KIND = "kind";
    private static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    private static final String SYNTH = "synthetic:/x.elkt", REPARSE = "synthetic:/reparse.elkt";
    private static final String ELKT = ".elkt", ID_SEPARATOR = "/", ID_REPLACEMENT = "__", OUTPUT_EXTENSION = ".json";
    private static final long NANOS_PER_MILLI = 1_000_000L;
    private static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");
    private static final Gson COMPACT = new GsonBuilder().disableHtmlEscaping().serializeNulls().create();
    private static final Gson PRETTY = new GsonBuilder().disableHtmlEscaping().setPrettyPrinting().create();

    /** One input: the case id and the model file. */
    private record Input(String id, Path file) { }

    /** A case body: reads its input, returns the JSON written to the case's output file. */
    private interface CaseBody {
        JsonObject run(Path file) throws IOException;
    }

    public static void main(String[] args) throws IOException {
        switch (args.length == 0 ? "" : args[0]) {
            case "validate" -> runCases(args, ElktSweep::validate);
            case "write" -> runCases(args, new Writer()::write);
            case "merge" -> merge(args);
            case "summary" -> System.out.println(summary(args));
            default -> throw new IllegalArgumentException("usage: ElktSweep validate|write <cases> <outDir> | merge ... | summary ...");
        }
    }

    // ---- driver

    private static void runCases(String[] args, CaseBody body) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        Path outDir = Path.of(args[2]);
        Files.createDirectories(outDir);
        for (Input input : inputs(Path.of(args[1]))) {
            System.out.println(COMPACT.toJson(runCase(input, body, outDir)));
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
        return id.replace(ID_SEPARATOR, ID_REPLACEMENT) + OUTPUT_EXTENSION;
    }

    private static void write(Path path, JsonObject json) throws IOException {
        Files.writeString(path, COMPACT.toJson(json) + "\n", StandardCharsets.UTF_8);
    }

    // ---- validate (ElktValidateVectors.record: IResourceValidator over the resource loaded from the file)

    private static JsonObject validate(Path file) {
        ElkGraphStandaloneSetup.doSetup();
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

    // ---- write (ElktWriteVectors.record: EcoreUtil.copy + ISerializer.serialize(format()), then the oracle's reparse)

    /** The writer needs one injector for all cases (ElktWriteVectors builds it once). */
    private static final class Writer {
        private final Injector injector = new ElkGraphStandaloneSetup().createInjectorAndDoEMFRegistration();

        JsonObject write(Path file) throws IOException {
            ElkNode root = file.getFileName().toString().endsWith(ELKT) ? readElkt(file)
                    : ElkGraphJson.forGraph(Files.readString(file, StandardCharsets.UTF_8)).toElk();
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
            try {
                resource.load(new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)), Collections.emptyMap());
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

    // Mirrors tools/oracle/harness/ElkModelReader.readElkt (and so ElktWriteVectors.readElkt).
    private static ElkNode readElkt(Path file) throws IOException {
        ElkGraphStandaloneSetup.doSetup();
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        if (!resource.getErrors().isEmpty()) {
            throw new IllegalStateException(resource.getErrors().get(0).getMessage());
        }
        resource.load(Collections.emptyMap());
        return (ElkNode) resource.getContents().get(0);
    }

    // Same flags as tools/oracle/harness/CaseRunner.export.
    private static String export(ElkNode graph) {
        return ElkGraphJson.forGraph(graph).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                .omitUnknownLayoutOptions(true).prettyPrint(true).toJson();
    }

    // ---- merge: two runs -> one result line per case (D5)

    /** One run of a mode: its output directory and its result lines by id (minus ms), in order. */
    private record Run(Path dir, Map<String, JsonObject> lines) { }

    private static void merge(String[] args) throws IOException {
        Run first = new Run(Path.of(args[2]), byId(Path.of(args[3])));
        Run second = new Run(Path.of(args[4]), byId(Path.of(args[5])));
        for (JsonObject line : first.lines().values()) {
            System.out.println(COMPACT.toJson(merged(args[1], line, first, second)));
        }
    }

    private static Map<String, JsonObject> byId(Path results) throws IOException {
        Map<String, JsonObject> lines = new LinkedHashMap<>();
        for (String line : Files.readAllLines(results, StandardCharsets.UTF_8)) {
            if (!line.isBlank()) {
                JsonObject json = JsonParser.parseString(line).getAsJsonObject();
                json.remove(MS);
                lines.put(json.get(ID).getAsString(), json);
            }
        }
        return lines;
    }

    private static JsonObject merged(String kind, JsonObject line, Run first, Run second) throws IOException {
        String id = line.get(ID).getAsString();
        String status = line.get(STATUS).getAsString();
        boolean stable = line.equals(second.lines().get(id)) && (!OK.equals(status) || sameOutput(first, second, id));
        JsonObject out = new JsonObject();
        out.addProperty(ID, id);
        out.addProperty(KIND, kind);
        out.addProperty(STATUS, stable ? status : NONDETERMINISTIC);
        if (stable && line.has(EXCEPTION)) {
            out.add(EXCEPTION, line.get(EXCEPTION));
        }
        return out;
    }

    private static boolean sameOutput(Run first, Run second, String id) throws IOException {
        return Arrays.equals(Files.readAllBytes(first.dir().resolve(outputName(id))),
                Files.readAllBytes(second.dir().resolve(outputName(id))));
    }

    // ---- summary

    private static String summary(String[] args) throws IOException {
        Map<String, Map<String, Integer>> counts = new TreeMap<>();
        for (String line : Files.readAllLines(Path.of(args[1]), StandardCharsets.UTF_8)) {
            if (!line.isBlank()) {
                JsonObject json = JsonParser.parseString(line).getAsJsonObject();
                count(counts, json.get(KIND).getAsString(), json.get(STATUS).getAsString());
            }
        }
        JsonObject out = new JsonObject();
        out.addProperty("elkCommit", args[2]);
        out.addProperty("modelsCommit", args[3]);
        out.addProperty("registry", "core");
        out.add("counts", PRETTY.toJsonTree(counts));
        return PRETTY.toJson((JsonElement) out);
    }

    private static void count(Map<String, Map<String, Integer>> counts, String kind, String status) {
        Map<String, Integer> kindCounts = counts.computeIfAbsent(kind, k -> new TreeMap<>(Map.of(OK, 0, THROWS, 0, NONDETERMINISTIC, 0)));
        kindCounts.merge(status, 1, Integer::sum);
    }
}
