// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, D2, D3 and D6 of plans/graphviz-dot/decisions.md) for the Graphviz DOT
// WRITER: what Xtext's ISerializer does with a DOT model at the pinned ELK commit through the injector of
// new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration(), so that GraphvizDotSerializer (maxLineWidth 255,
// formatUndefinedHiddenRegionsOnly = !formatting), GraphvizDotFormatter (autowrap on every hidden region), the generated
// semantic sequencer, GraphvizDotSyntacticSequencer and the value converters run (Xtext 2.36.0). This program only CALLS
// the serializer and the parser; it embeds no ELK or Xtext implementation.
// Run: tools/vectors/dot-vectors.sh <outDir>  (java -cp ... DotWriteVectors.java <outDir> <tools/vectors dir>)
// The file carries no `oracle` stamp and this program never reads the pin (D7, issue #173: the landed fitness test
// test/architecture/elk-pin.fitness.test.ts freezes the number of recorders that stamp it). The script still refuses
// to run unless the oracle was built from tools/oracle/ELK_COMMIT.
// Inputs:
//   <vectors dir>/dot-parse-scenarios/*.dot (source "scenario", id "parsed/<name>") and, if the directory exists,
//   <vectors dir>/dot-graphviz-output/*.dot (source "fixture", id "fixture/<name>"), each sorted by file name, loaded as
//   DotParseVectors does (XtextResource "input.graphviz_dot", resource.load(stream, null)). Only files that load with no
//   error and a root are rows; the others are listed in skipped (the parse ref records their diagnostics).
//   Built models (source "built", id "built/<family>/<name>"), made with DotFactory.eINSTANCE; see BUILT MODELS.
// Serialization forms (each on its own fresh load or fresh EcoreUtil.copy, so no call sees another's side effects):
//   F = serializer.serialize(m, SaveOptions.newBuilder().format().getOptions())
//   U = serializer.serialize(m, SaveOptions.newBuilder().getOptions())          (= SaveOptions.defaultOptions())
//   S = resource.save(out, SaveOptions.newBuilder().noValidation().getOptions().toOptionsMap()) on the resource holding
//       m, the bytes decoded as UTF-8: what GraphvizLayoutProvider.writeDotGraph sends to Graphviz (without the '\n'
//       it appends).
//   attached = m is the root of the loaded resource, still bound to its node model (parsed rows only): { F, U }.
//   detached = m is EcoreUtil.copy(root) added to a fresh resource "output.graphviz_dot" of a fresh XtextResourceSet,
//       so no node model exists (the form DotExporter produces and the TS port must match byte for byte): { F, U, S }.
//   Built models are serialized detached only.
// Output <outDir>/graphviz-dot-write.json, 2-space indent for the top level, one compact JSON row per line, trailing
// newline (non-ASCII and control characters as JSON u-escapes):
//   { jdk, arch, xtextVersion, maxLineWidth: 255, rowCounts: { scenario, fixture, built }, skipped: [id...],
//     rows: [row...] }   rows: parsed scenarios, then fixtures, then built models in table order.
//   row = { id, source, attached?: { formatted: T, unformatted: T, log? }, detached: { formatted: T, unformatted: T,
//           save: T, log? }, reparse: { formatted: R, unformatted: R } }
//   T = the output string exactly (newline style preserved) | { error: E }
//   E = { cls, msg }: cls = binary class name of the Throwable, msg = getMessage() with every identity hash "@<hex>"
//       replaced by "@<hash>" (null when absent).
//   log = present only when some form logged through log4j (Xtext's default LOGGING exception handler reports a
//       formatting conflict this way and keeps the first formatting): { <form>: [ { level, msg, thrown: [E...] } ] },
//       thrown = the logged Throwable and its causes, outermost first. The recorder's appender replaces every other.
//   R = the detached T loaded again as DotParseVectors does: { errors: resource.getErrors().size(), equal:
//       EcoreUtil.equals(reparsed root, the detached model) } | null when T is an error.
// BUILT MODELS (built by DotWriteVectors/DotWriteModels.java; the TS side rebuilds them from these descriptions; "g(T, name){...}" = Graph with type T (unset when
// T is GRAPH: EMF default), name, statements; strict only where written; N(x) = NodeStatement of Node name x without
// port; A(k, v) = Attribute name k, value v (in an attribute list: ListAttribute; as a statement: Attribute):
//   stmt/*      every statement kind; strict and unnamed graphs; edge operators; ports; subgraphs as edge targets.
//   value/<position>/<label>   one model per DotID value in one position (graph name, node name, port name, attribute
//               name, attribute value, statement attribute value) or ID value (subgraph name, compass point); the
//               values are VALUES below.
//   null/*      null or unset features and empty lists (see the table in nullModels()).
//   autowrap/*  statements whose single-line form exceeds 255 characters (see autowrapModels()).
//   width/<shape>/<k>  sweeps around the 255 boundary: the same statement with a value of k 'x' characters, k over
//               a range, so the first wrapping k is visible (see widthModels()).
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.Logger;
import org.apache.log4j.spi.LoggingEvent;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotStandaloneSetup;
import org.eclipse.elk.alg.graphviz.dot.dot.*;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;

public class DotWriteVectors {
    static final String SCENARIO_DIR = "dot-parse-scenarios", FIXTURE_DIR = "dot-graphviz-output";
    static final String EXTENSION = ".dot", OUTPUT = "graphviz-dot-write.json";
    static final String INPUT_URI = "input.graphviz_dot", OUTPUT_URI = "output.graphviz_dot";
    static final String SCENARIO = "scenario", FIXTURE = "fixture", BUILT = "built", ID = "id";
    static final String FORMATTED = "formatted", UNFORMATTED = "unformatted", SAVE = "save";
    static final int MAX_LINE_WIDTH = 255;
    static final Pattern IDENTITY_HASH = Pattern.compile("@[0-9a-f]+");

    private final Injector injector;

    DotWriteVectors(Injector injector) {
        this.injector = injector;
    }

    public static void main(String[] args) throws IOException {
        Capture.install();
        DotWriteVectors v = new DotWriteVectors(new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration());
        List<Map<String, Object>> rows = new ArrayList<>();
        List<Object> skipped = new ArrayList<>();
        Map<String, Object> counts = new LinkedHashMap<>();
        for (String source : List.of(SCENARIO, FIXTURE)) {
            int n = 0;
            for (Path file : dotFiles(Path.of(args[1], source.equals(SCENARIO) ? SCENARIO_DIR : FIXTURE_DIR))) {
                Map<String, Object> row = v.parsedRow(file, source);
                if (row == null) {
                    skipped.add(id(file, source));
                } else {
                    rows.add(row);
                    n++;
                }
            }
            counts.put(source, n);
        }
        Map<String, Supplier<GraphvizModel>> built = DotWriteModels.table();
        built.forEach((id, model) -> rows.add(v.builtRow(id, model.get())));
        counts.put(BUILT, built.size());
        write(Path.of(args[0], OUTPUT), counts, skipped, rows);
    }

    static List<Path> dotFiles(Path dir) throws IOException {
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(p -> p.getFileName().toString().endsWith(EXTENSION) && Files.isRegularFile(p))
                .sorted(Comparator.comparing(p -> p.getFileName().toString())).toList();
        }
    }

    static String id(Path file, String source) {
        String name = file.getFileName().toString();
        return (source.equals(FIXTURE) ? "fixture/" : "parsed/") + name.substring(0, name.length() - EXTENSION.length());
    }

    // ---- rows ----
    Map<String, Object> parsedRow(Path file, String source) throws IOException {
        byte[] bytes = Files.readAllBytes(file);
        XtextResource first = load(bytes);
        if (!first.getErrors().isEmpty() || first.getContents().isEmpty()) {
            return null;
        }
        Map<String, Object> attached = new LinkedHashMap<>(), log = new LinkedHashMap<>();
        logged(attached, log, FORMATTED, () -> serialize(first.getContents().get(0), true));
        EObject second = load(bytes).getContents().get(0);
        logged(attached, log, UNFORMATTED, () -> serialize(second, false));
        withLog(attached, log);
        Map<String, Object> row = obj(ID, id(file, source), "source", source, "attached", attached);
        detached(row, first.getContents().get(0));
        return row;
    }

    Map<String, Object> builtRow(String id, GraphvizModel model) {
        Map<String, Object> row = obj(ID, id, "source", BUILT);
        detached(row, model);
        return row;
    }

    private void detached(Map<String, Object> row, EObject model) {
        Map<String, Object> d = new LinkedHashMap<>(), log = new LinkedHashMap<>();
        logged(d, log, FORMATTED, () -> serialize(copy(model), true));
        logged(d, log, UNFORMATTED, () -> serialize(copy(model), false));
        logged(d, log, SAVE, () -> save(copy(model)));
        row.put("detached", withLog(d, log));
        Map<String, Object> reparse = new LinkedHashMap<>();
        reparse.put(FORMATTED, reparse(d.get(FORMATTED), model));
        reparse.put(UNFORMATTED, reparse(d.get(UNFORMATTED), model));
        row.put("reparse", reparse);
    }

    // ---- logged formatter problems ----
    /** Puts {@code call()} under {@code key} into {@code forms} and the events it logged (if any) into {@code log}. */
    static void logged(Map<String, Object> forms, Map<String, Object> log, String key, Supplier<Object> call) {
        Capture.EVENTS.clear();
        forms.put(key, call.get());
        if (!Capture.EVENTS.isEmpty()) {
            log.put(key, new ArrayList<>(Capture.EVENTS));
        }
    }

    static Map<String, Object> withLog(Map<String, Object> forms, Map<String, Object> log) {
        if (!log.isEmpty()) {
            forms.put("log", log);
        }
        return forms;
    }

    /** The only appender of the log4j root logger: records each event as { level, msg, thrown: [E of the chain] }. */
    static final class Capture extends AppenderSkeleton {
        static final List<Object> EVENTS = new ArrayList<>();

        static void install() {
            Logger.getRootLogger().removeAllAppenders();
            Logger.getRootLogger().addAppender(new Capture());
        }

        @Override
        protected void append(LoggingEvent event) {
            List<Object> chain = new ArrayList<>();
            Throwable t = event.getThrowableInformation() == null ? null : event.getThrowableInformation().getThrowable();
            for (; t != null; t = t.getCause()) {
                chain.add(error(t).get("error"));
            }
            EVENTS.add(obj("level", event.getLevel().toString(), "msg", event.getRenderedMessage(), "thrown", chain));
        }

        @Override
        public void close() { }

        @Override
        public boolean requiresLayout() { return false; }
    }

    // ---- Xtext calls ----
    XtextResource load(byte[] bytes) throws IOException {
        XtextResource r = (XtextResource) injector.getInstance(XtextResourceSet.class)
            .createResource(URI.createURI(INPUT_URI));
        r.load(new ByteArrayInputStream(bytes), null);
        return r;
    }

    /** A copy of {@code model} as the only content of a fresh resource of a fresh resource set. */
    EObject copy(EObject model) {
        EObject c = EcoreUtil.copy(model);
        Resource r = injector.getInstance(XtextResourceSet.class).createResource(URI.createURI(OUTPUT_URI));
        r.getContents().add(c);
        return c;
    }

    Object serialize(EObject m, boolean format) {
        try {
            ISerializer serializer = injector.getInstance(ISerializer.class);
            SaveOptions.Builder b = SaveOptions.newBuilder();
            return serializer.serialize(m, (format ? b.format() : b).getOptions());
        } catch (Exception | StackOverflowError e) {
            return error(e);
        }
    }

    Object save(EObject m) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            m.eResource().save(out, SaveOptions.newBuilder().noValidation().getOptions().toOptionsMap());
            return out.toString(StandardCharsets.UTF_8);
        } catch (Exception | StackOverflowError e) {
            return error(e);
        }
    }

    Object reparse(Object text, EObject model) {
        if (!(text instanceof String s)) {
            return null;
        }
        try {
            XtextResource r = load(s.getBytes(StandardCharsets.UTF_8));
            boolean equal = !r.getContents().isEmpty() && EcoreUtil.equals(r.getContents().get(0), model);
            return obj("errors", r.getErrors().size(), "equal", equal);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    static Map<String, Object> error(Throwable e) {
        String msg = e.getMessage() == null ? null : IDENTITY_HASH.matcher(e.getMessage()).replaceAll("@<hash>");
        return obj("error", obj("cls", e.getClass().getName(), "msg", msg));
    }

    // ---- output ----
    static void write(Path out, Map<String, Object> counts, List<Object> skipped, List<Map<String, Object>> rows)
            throws IOException {
        StringBuilder sb = new StringBuilder("{\n");
        header(sb, "jdk", System.getProperty("java.version"));
        header(sb, "arch", System.getProperty("os.arch"));
        header(sb, "xtextVersion", xtextVersion());
        header(sb, "maxLineWidth", MAX_LINE_WIDTH);
        header(sb, "rowCounts", counts);
        header(sb, "skipped", skipped);
        sb.append("  \"rows\": [\n");
        Set<Object> ids = new HashSet<>();
        for (int i = 0; i < rows.size(); i++) {
            if (!ids.add(rows.get(i).get(ID))) {
                throw new IllegalStateException("duplicate id " + rows.get(i).get(ID));
            }
            sb.append("    ");
            Json.write(sb, rows.get(i));
            sb.append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        Files.createDirectories(out.getParent());
        Files.writeString(out, sb.append("  ]\n}\n"), StandardCharsets.UTF_8);
    }

    private static void header(StringBuilder sb, String key, Object value) {
        sb.append("  \"").append(key).append("\": ");
        Json.write(sb, value);
        sb.append(",\n");
    }

    /** The version directory of the Xtext bundle jar on the classpath, e.g. 2.36.0. */
    static String xtextVersion() {
        String location = ISerializer.class.getProtectionDomain().getCodeSource().getLocation().toString();
        Matcher m = Pattern.compile("org\\.eclipse\\.xtext/(\\d+\\.\\d+\\.\\d+)").matcher(location);
        if (!m.find()) {
            throw new IllegalStateException("cannot read the Xtext version from " + location);
        }
        return m.group(1);
    }

    static Map<String, Object> obj(Object... keyValues) {
        Map<String, Object> m = new LinkedHashMap<>();
        // Key and value alternate, so i + 1 < length is the same bound as i < length; written out so the pair access
        // below is visibly in bounds.
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            m.put((String) keyValues[i], keyValues[i + 1]);
        }
        return m;
    }

    // ---- compact JSON writer (non-ASCII and control characters as u-escapes, so lone surrogates survive) ----
    static final class Json {
        static void write(StringBuilder sb, Object v) {
            if (v instanceof String s) {
                string(sb, s);
            } else if (v instanceof Map<?, ?> m) {
                object(sb, m);
            } else if (v instanceof List<?> l) {
                sb.append('[');
                for (int i = 0; i < l.size(); i++) {
                    sb.append(i == 0 ? "" : ",");
                    write(sb, l.get(i));
                }
                sb.append(']');
            } else if (v == null || v instanceof Boolean || v instanceof Integer) {
                sb.append(v);
            } else {
                throw new IllegalStateException("unexpected JSON value " + v.getClass());
            }
        }

        private static void object(StringBuilder sb, Map<?, ?> m) {
            sb.append('{');
            boolean first = true;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                sb.append(first ? "" : ",");
                first = false;
                string(sb, (String) e.getKey());
                sb.append(':');
                write(sb, e.getValue());
            }
            sb.append('}');
        }

        static void string(StringBuilder sb, String s) {
            sb.append('"');
            for (int i = 0; i < s.length(); i++) {
                char c = s.charAt(i);
                switch (c) {
                    case '"' -> sb.append("\\\"");
                    case '\\' -> sb.append("\\\\");
                    case '\n' -> sb.append("\\n");
                    case '\r' -> sb.append("\\r");
                    case '\t' -> sb.append("\\t");
                    default -> sb.append(c < ' ' || c > '~' ? String.format("\\u%04x", (int) c) : String.valueOf(c));
                }
            }
            sb.append('"');
        }
    }
}
