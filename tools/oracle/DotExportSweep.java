// SPDX-License-Identifier: EPL-2.0
// JVM driver of the DOT export sweep (mission graphviz-dot D6, T3; run in full by T12): for every elk-models .elkt, the
// oracle's DotExporter text under default properties and the oracle's parse of that text. It only CALLS ELK, EMF and Xtext
// (the calls of tools/vectors/DotExportVectors.java, profile "default"); it embeds no ELK implementation.
// Run (single-file source program, classpath of tools/vectors/dot-vectors.sh), always with the CoreOptions-only registry
// (G3, ORACLE_REGISTRY=core: the first statement of `run`):
//   java -cp <cp> DotExportSweep.java run <cases.tsv> <outDir>      cases.tsv: "<name>\t<input path>" per line
//   java -cp <cp> DotExportSweep.java summary <outDir> <elkCommit> <modelsCommit> <models>   summary.json on stdout
// Per model, under <outDir> (name = the model path minus ".elkt", "/" replaced by "__"):
//   <name>.dot          the text: ISerializer.serialize(model, SaveOptions.newBuilder().noValidation()) of the
//                       DotExporter target model, alone in a fresh XtextResource "output.graphviz_dot" (what
//                       GraphvizLayoutProvider.writeDotGraph saves, without its trailing '\n'), as UTF-8 bytes;
//   <name>.model.json   { errors: [{ line, message }], equal, model } of loading <name>.dot into a fresh XtextResource
//                       "input.graphviz_dot": model = M of DotExportVectors (null without a parse result), equal =
//                       EcoreUtil.equals(target model, parse result);
//   <name>.throws.json  { stage: load|transform|serialize|reparse, class, message } instead, when a stage threw.
// A model is done when <name>.dot or <name>.throws.json exists (each written last); `run` skips done models, so a run can
// be resumed. Files hold no timings or identity hashes ("@<hex>" in messages becomes "@<hash>"), so reruns are
// byte-identical.
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotStandaloneSetup;
import org.eclipse.elk.alg.graphviz.dot.dot.GraphvizModel;
import org.eclipse.elk.alg.graphviz.dot.transform.DotExporter;
import org.eclipse.elk.alg.graphviz.dot.transform.DotTransformationData;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.Enumerator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;

@SuppressWarnings("deprecation") // SaveOptions.Builder.noValidation is what GraphvizLayoutProvider calls
public class DotExportSweep {
    static final String DOT = ".dot", MODEL = ".model.json", THROWS = ".throws.json";
    static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]{4,}");

    public static void main(String[] args) throws IOException {
        switch (args.length == 0 ? "" : args[0]) {
            case "run" -> run(Path.of(args[1]), Path.of(args[2]));
            case "summary" -> System.out.print(summary(Path.of(args[1]), args[2], args[3], Integer.parseInt(args[4])));
            default -> throw new IllegalArgumentException("usage: DotExportSweep run <cases> <outDir> | summary ...");
        }
    }

    /** A sweep stage failed: the stage name and the exception. */
    static final class StageFailure extends Exception {
        final String stage;

        StageFailure(String stage, Throwable cause) {
            super(cause);
            this.stage = stage;
        }
    }

    static void run(Path cases, Path out) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        ElkGraphStandaloneSetup.doSetup();
        Sweeper sweeper = new Sweeper(new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration());
        Files.createDirectories(out);
        for (String line : Files.readAllLines(cases, StandardCharsets.UTF_8)) {
            if (line.isBlank()) {
                continue;
            }
            String[] parts = line.split("\t", 2);
            if (!Files.exists(out.resolve(parts[0] + DOT)) && !Files.exists(out.resolve(parts[0] + THROWS))) {
                sweeper.sweep(parts[0], Path.of(parts[1]), out);
            }
        }
    }

    /** One injector for all models. */
    static final class Sweeper {
        final Injector injector;
        final ISerializer serializer;

        Sweeper(Injector injector) {
            this.injector = injector;
            this.serializer = injector.getInstance(ISerializer.class);
        }

        void sweep(String name, Path file, Path out) throws IOException {
            try {
                ElkNode root = stage("load", () -> readElkt(file));
                DotTransformationData<ElkNode, GraphvizModel> data = new DotTransformationData<>();
                data.setSourceGraph(root);
                stage("transform", () -> {
                    new DotExporter().transform(data);
                    return null;
                });
                GraphvizModel model = data.getTargetGraphs().get(0);
                String text = stage("serialize", () -> serialize(model));
                Map<String, Object> reparse = stage("reparse", () -> reparse(text, model));
                write(out.resolve(name + MODEL), Json.text(reparse) + "\n");
                write(out.resolve(name + DOT), text);
            } catch (StageFailure f) {
                Throwable e = f.getCause();
                String message = e.getMessage() == null ? null : IDENTITY_HASH.matcher(e.getMessage()).replaceAll("@<hash>");
                Map<String, Object> failure = new LinkedHashMap<>();
                failure.put("stage", f.stage);
                failure.put("class", e.getClass().getName());
                failure.put("message", message);
                write(out.resolve(name + THROWS), Json.text(failure) + "\n");
            }
        }

        interface Body<T> {
            T get() throws Exception;
        }

        static <T> T stage(String name, Body<T> body) throws StageFailure {
            try {
                return body.get();
            } catch (Exception | StackOverflowError e) {
                throw new StageFailure(name, e);
            }
        }

        XtextResource resource(String uri) {
            return (XtextResource) injector.getInstance(XtextResourceSet.class).createResource(URI.createURI(uri));
        }

        String serialize(GraphvizModel model) {
            resource("output.graphviz_dot").getContents().add(model);
            return serializer.serialize(model, SaveOptions.newBuilder().noValidation().getOptions());
        }

        Map<String, Object> reparse(String text, GraphvizModel model) throws IOException {
            XtextResource resource = resource("input.graphviz_dot");
            resource.load(new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)), null);
            List<Object> errors = new ArrayList<>();
            for (Resource.Diagnostic d : resource.getErrors()) {
                Map<String, Object> error = new LinkedHashMap<>();
                error.put("line", d.getLine());
                error.put("message", d.getMessage());
                errors.add(error);
            }
            EObject parsed = resource.getParseResult() == null ? null : resource.getParseResult().getRootASTElement();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("errors", errors);
            m.put("equal", parsed != null && EcoreUtil.equals(model, parsed));
            m.put("model", dump(parsed));
            return m;
        }
    }

    // Mirrors tools/oracle/harness/ElkModelReader.readElkt (and so tools/oracle/ElktSweep.java).
    static ElkNode readElkt(Path file) throws IOException {
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        if (!resource.getErrors().isEmpty()) {
            throw new IllegalStateException(resource.getErrors().get(0).getMessage());
        }
        resource.load(Collections.emptyMap());
        return (ElkNode) resource.getContents().get(0);
    }

    static void write(Path path, String text) throws IOException {
        Files.writeString(path, text, StandardCharsets.UTF_8);
    }

    /** M of tools/vectors/DotExportVectors.java. */
    static Object dump(EObject o) {
        if (o == null) {
            return null;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("eClass", o.eClass().getName());
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
        return v instanceof Enumerator en ? en.getName() : v;
    }

    // ---- summary

    static final Pattern STAGE = Pattern.compile("^\\{\"stage\":\"([a-z]+)\"");

    /** The counts of summary.json. */
    static final class Counts {
        int ok, thrown, reparseErrors, unequal;
        final TreeMap<String, Integer> stages = new TreeMap<>();

        void add(Path f) throws IOException {
            String n = f.getFileName().toString();
            if (n.endsWith(MODEL)) {
                String text = Files.readString(f, StandardCharsets.UTF_8);
                ok++;
                reparseErrors += text.startsWith("{\"errors\":[]") ? 0 : 1;
                unequal += text.contains("\"equal\":true") ? 0 : 1;
            } else if (n.endsWith(THROWS)) {
                java.util.regex.Matcher stage = STAGE.matcher(Files.readString(f, StandardCharsets.UTF_8));
                thrown++;
                stages.merge(stage.find() ? stage.group(1) : "?", 1, Integer::sum);
            }
        }
    }

    static String summary(Path out, String elkCommit, String modelsCommit, int models) throws IOException {
        Counts c = new Counts();
        try (Stream<Path> s = Files.list(out)) {
            for (Path f : s.sorted().toList()) {
                c.add(f);
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("elkCommit", elkCommit);
        m.put("modelsCommit", modelsCommit);
        m.put("registry", "core");
        m.put("models", models);
        m.put("done", c.ok + c.thrown);
        m.put("ok", c.ok);
        m.put("throws", c.thrown);
        m.put("throwsByStage", c.stages);
        m.put("reparseWithErrors", c.reparseErrors);
        m.put("reparseUnequal", c.unequal);
        return Json.text(m) + "\n";
    }

    /** Compact JSON writer (the one of tools/vectors/ElktParseVectors.java). */
    static final class Json {
        static String text(Object v) {
            StringBuilder sb = new StringBuilder();
            write(sb, v);
            return sb.toString();
        }

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
