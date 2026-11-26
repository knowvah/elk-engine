// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, D4 and D6 of plans/graphviz-dot/decisions.md) for the Graphviz DOT
// parser: what org.eclipse.elk.alg.graphviz.dot (GraphvizDot.xtext, the generated InternalGraphvizDotParser, the value
// converters bound for the grammar) and Xtext 2.36.0 do at the pinned ELK commit when a DOT text is loaded exactly as
// GraphvizLayoutProvider.readDotGraph does: an XtextResource "input.graphviz_dot" created by the XtextResourceSet of
// new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration(), then resource.load(stream, null). This program
// only CALLS ELK and Xtext and records results; it embeds no ELK implementation.
// Run: tools/vectors/dot-vectors.sh <outDir>  (java -cp ... DotParseVectors.java <outDir> <tools/vectors dir>)
// The file carries no `oracle` stamp and this program never reads the pin (D7, issue #173: the landed fitness test
// test/architecture/elk-pin.fitness.test.ts freezes the number of recorders that stamp it). The script still refuses
// to run unless the oracle was built from tools/oracle/ELK_COMMIT.
// Inputs (bytes, loaded as they are; the resource decodes them):
//   <vectors dir>/dot-parse-scenarios/<family>-<what>.dot    id = file name minus ".dot", source "scenario".
//     Families: grammar-* (every rule and option of GraphvizDot.xtext), dotid-* (each DotID alternative in each
//     position), whitespace-* (CR, CRLF, mixed, BOM), comments-*, nonascii-*, graphviz-output-shape (hand-written
//     Graphviz output), err-syntax-* (parser and lexer errors, partial models).
//   <vectors dir>/dot-graphviz-output/*.dot (if the directory exists; other files ignored)   id = "fixture/<file name
//     minus .dot>", source "fixture": real Graphviz output (D6). Each list is sorted by file name (byte order).
// Diagnostic kind: an ISyntaxErrorMessageProvider subclass is bound over GraphvizDotRuntimeModule (Modules.override).
//   Its IValueConverterErrorContext overload returns the default message and issue data with the issue code
//   "dot.vectors.ValueConversion"; message text, line and node are untouched. kind = conversion for an
//   XtextSyntaxDiagnostic carrying that code, syntax otherwise. The grammar has no cross-references and no validator.
// Output <outDir>/graphviz-dot-parse.json, 2-space indent for the top level, one compact JSON case per line, trailing
// newline (non-ASCII and control characters as JSON u-escapes):
//   { jdk, arch, xtextVersion, rowCounts: { scenario, fixture }, cases: [case...] }   scenarios first, then fixtures.
//   case = { id, source, input, hasSyntaxErrors, contents, rootIsParseResult, diagnostics, model }
//     input = the file decoded as UTF-8 (a BOM stays as U+FEFF); hasSyntaxErrors = getParseResult().hasSyntaxErrors();
//     contents = resource.getContents().size(); rootIsParseResult = getContents().get(0) is the parse result's root
//     AST element (null when there are no contents).
//     diagnostics = [ { kind: syntax|conversion, severity: error|warning, line, lineEnd, column, offset, length,
//       message, javaClass } ], getErrors() then getWarnings(), each in list order; line/lineEnd/column = 1-based
//       Resource.Diagnostic / AbstractDiagnostic values, offset/length = UTF-16 offsets into the decoded text.
//       TS compares syntax diagnostics by presence and line only (D4); the other fields are recorded for reference.
//     model = null without contents, else the dump D of getContents().get(0):
//       D(object) = { eClass, <feature>: V... in eClass().getEAllStructuralFeatures() order, isSet: [feature names
//         whose eIsSet is true] }; V = eGet(feature): a String as is, a Boolean, null, an EMF enum as { enum: Java
//         constant name, name: getName(), literal: getLiteral(), value: getValue() }, a containment reference as D or
//         [D...] in list order. A non-containment reference or another value type fails the recording.
//       EMF reports eIsSet false for a feature at its default (null, false, the first enum literal, an empty list),
//       so an explicit `graph` keyword and an absent one cannot be told apart in the model.
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.Module;
import com.google.inject.util.Modules;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotRuntimeModule;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotStandaloneSetup;
import org.eclipse.emf.common.util.Enumerator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EReference;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.xtext.diagnostics.AbstractDiagnostic;
import org.eclipse.xtext.nodemodel.SyntaxErrorMessage;
import org.eclipse.xtext.parser.antlr.ISyntaxErrorMessageProvider;
import org.eclipse.xtext.parser.antlr.SyntaxErrorMessageProvider;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.resource.XtextSyntaxDiagnostic;

public class DotParseVectors {
    static final String CONVERSION_CODE = "dot.vectors.ValueConversion";
    static final String SCENARIO_DIR = "dot-parse-scenarios", FIXTURE_DIR = "dot-graphviz-output";
    static final String EXTENSION = ".dot", OUTPUT = "graphviz-dot-parse.json", RESOURCE_URI = "input.graphviz_dot";
    static final String SCENARIO = "scenario", FIXTURE = "fixture", ID = "id";

    public static void main(String[] args) throws IOException {
        Injector injector = new Setup().createInjectorAndDoEMFRegistration();
        List<Map<String, Object>> cases = new ArrayList<>();
        Map<String, Object> counts = new LinkedHashMap<>();
        for (String source : List.of(SCENARIO, FIXTURE)) {
            List<Path> files = dotFiles(Path.of(args[1], source.equals(SCENARIO) ? SCENARIO_DIR : FIXTURE_DIR));
            for (Path file : files) {
                cases.add(record(injector, file, source));
            }
            counts.put(source, files.size());
        }
        write(Path.of(args[0], OUTPUT), counts, cases);
    }

    /** The .dot files of {@code dir} sorted by name (byte order); none when the directory does not exist. */
    static List<Path> dotFiles(Path dir) throws IOException {
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(p -> p.getFileName().toString().endsWith(EXTENSION) && Files.isRegularFile(p))
                .sorted(Comparator.comparing(p -> p.getFileName().toString())).toList();
        }
    }

    /** The case id of a scenario or fixture file. */
    static String caseId(Path file, String source) {
        String name = file.getFileName().toString();
        String base = name.substring(0, name.length() - EXTENSION.length());
        return source.equals(FIXTURE) ? FIXTURE + "/" + base : base;
    }

    /** Loads {@code bytes} as GraphvizLayoutProvider.readDotGraph does. */
    static XtextResource load(Injector injector, byte[] bytes) throws IOException {
        XtextResource resource = (XtextResource) injector.getInstance(XtextResourceSet.class)
            .createResource(URI.createURI(RESOURCE_URI));
        resource.load(new ByteArrayInputStream(bytes), null);
        return resource;
    }

    static Map<String, Object> record(Injector injector, Path file, String source) throws IOException {
        byte[] bytes = Files.readAllBytes(file);
        XtextResource resource = load(injector, bytes);
        EObject root = resource.getContents().isEmpty() ? null : resource.getContents().get(0);
        Map<String, Object> c = obj(ID, caseId(file, source), "source", source,
            "input", new String(bytes, StandardCharsets.UTF_8));
        c.put("hasSyntaxErrors", resource.getParseResult().hasSyntaxErrors());
        c.put("contents", resource.getContents().size());
        c.put("rootIsParseResult", root == null ? null : root == resource.getParseResult().getRootASTElement());
        c.put("diagnostics", diagnostics(resource));
        c.put("model", root == null ? null : Dump.object(root));
        return c;
    }

    static List<Object> diagnostics(Resource resource) {
        List<Object> out = new ArrayList<>();
        resource.getErrors().forEach(d -> out.add(diagnostic(d, "error")));
        resource.getWarnings().forEach(d -> out.add(diagnostic(d, "warning")));
        return out;
    }

    static Map<String, Object> diagnostic(Resource.Diagnostic d, String severity) {
        boolean conversion = d instanceof XtextSyntaxDiagnostic s && CONVERSION_CODE.equals(s.getCode());
        Map<String, Object> m = obj("kind", conversion ? "conversion" : "syntax", "severity", severity,
            "line", d.getLine());
        AbstractDiagnostic a = (AbstractDiagnostic) d;
        m.put("lineEnd", a.getLineEnd());
        m.put("column", d.getColumn());
        m.put("offset", a.getOffset());
        m.put("length", a.getLength());
        m.put("message", d.getMessage());
        m.put("javaClass", d.getClass().getSimpleName());
        return m;
    }

    static void write(Path out, Map<String, Object> counts, List<Map<String, Object>> cases) throws IOException {
        Set<Object> ids = new HashSet<>();
        StringBuilder sb = new StringBuilder("{\n");
        sb.append("  \"jdk\": ");
        Json.write(sb, System.getProperty("java.version"));
        sb.append(",\n  \"arch\": ");
        Json.write(sb, System.getProperty("os.arch"));
        sb.append(",\n  \"xtextVersion\": ");
        Json.write(sb, xtextVersion());
        sb.append(",\n  \"rowCounts\": ");
        Json.write(sb, counts);
        sb.append(",\n  \"cases\": [\n");
        for (int i = 0; i < cases.size(); i++) {
            if (!ids.add(cases.get(i).get(ID))) {
                throw new IllegalStateException("duplicate id " + cases.get(i).get(ID));
            }
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
        // Key and value alternate, so i + 1 < length is the same bound as i < length; written out so the pair access
        // below is visibly in bounds.
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            m.put((String) keyValues[i], keyValues[i + 1]);
        }
        return m;
    }

    /** GraphvizDotStandaloneSetup with the tagging message provider bound over the runtime module. */
    static final class Setup extends GraphvizDotStandaloneSetup {
        @Override
        public Injector createInjector() {
            Module tagging = binder -> binder.bind(ISyntaxErrorMessageProvider.class).to(ConversionTagging.class);
            return Guice.createInjector(Modules.override(new GraphvizDotRuntimeModule()).with(tagging));
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

    /** Reflective dump of a DOT model (see the header). */
    static final class Dump {
        static Map<String, Object> object(EObject o) {
            Map<String, Object> m = obj("eClass", o.eClass().getName());
            List<Object> set = new ArrayList<>();
            for (EStructuralFeature f : o.eClass().getEAllStructuralFeatures()) {
                if (o.eIsSet(f)) {
                    set.add(f.getName());
                }
                m.put(f.getName(), value(f, o.eGet(f)));
            }
            m.put("isSet", set);
            return m;
        }

        private static Object value(EStructuralFeature f, Object v) {
            if (f instanceof EReference r && !r.isContainment()) {
                throw new IllegalStateException("non-containment reference " + f.getName());
            }
            if (v instanceof EObject e) {
                return object(e);
            }
            if (v instanceof List<?> l) {
                List<Object> out = new ArrayList<>();
                l.forEach(x -> out.add(object((EObject) x)));
                return out;
            }
            if (v instanceof Enumerator e) {
                return obj("enum", ((Enum<?>) e).name(), "name", e.getName(), "literal", e.getLiteral(),
                    "value", e.getValue());
            }
            if (v == null || v instanceof String || v instanceof Boolean) {
                return v;
            }
            throw new IllegalStateException("unexpected value " + v.getClass() + " of " + f.getName());
        }
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
