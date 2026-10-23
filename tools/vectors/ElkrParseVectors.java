// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13) for the random-graph text (.elkr) parser: what the Xtext language
// org.eclipse.elk.core.debug.grandom (GRandomStandaloneSetup, the generated InternalGRandomParser, the default value
// converters for INT/STRING and the ecore EIntegerObject/EDoubleObject conversions) and Xtext 2.36.0 do at the pinned ELK
// commit when a file is loaded as a resource (doSetup(), ResourceSetImpl.getResource(fileURI, true)). This program only
// CALLS ELK and Xtext and records results; it embeds no ELK implementation. The grammar has no cross-references, so
// there is no linking stage and no linking diagnostic.
// Run: tools/vectors/elkr-vectors.sh <outDir>  (java -cp ... ElkrParseVectors.java <outDir> <tools/vectors dir>)
// Inputs: <vectors dir>/elkr-parse-scenarios/<family>-<what>.elkr (id = file name minus ".elkr"), read as UTF-8 bytes
//   exactly (CRLF and lone CR are preserved: offsets and lines are observable). Rows sorted by id.
// Diagnostic kind: a ISyntaxErrorMessageProvider subclass is bound over the runtime module (Modules.override). Its
//   IValueConverterErrorContext overload returns the default message and issue data with the issue code
//   "elkr.vectors.ValueConversion"; message text, offset, length and line are untouched. A resource error is a
//   "conversionError" when it is an XtextSyntaxDiagnostic carrying that code (Xtext raises these only from
//   handleValueConverterException: the value converter threw), else a "syntaxError" (parser and lexer errors, code
//   org.eclipse.xtext.diagnostics.Diagnostic.Syntax). Recorded as Xtext reports it; nothing is interpreted.
// Output <outDir>/grandom-parse.json, 2-space indent for the top level, one compact JSON row per line, trailing newline
//   (non-ASCII and control characters are written as JSON u-escapes):
//   { elkCommit, xtextVersion, cases: [ ROW ] }
//   ROW = { id, input, syntaxErrors: [DIAG], conversionErrors: [DIAG], model }
//   DIAG = { message, line, offset, length }: resource.getErrors() order within each list; line = the diagnostic's
//     getLine() (Xtext counts lines by the node model, not by ANTLR), offset/length in UTF-16 code units.
//   model = OBJ | null (null when the resource has no root). Recorded for every row, syntax errors or not (the
//     TS side compares it presence-only when syntax errors exist, D2).
//   OBJ = { class: EClass name, features: [ { name, value, isSet? } ] }, features in eAllStructuralFeatures order,
//     every feature listed (unset ones too, with their EMF default). isSet (eIsSet) is present only for unsettable
//     features (the GRandom ecore has none, so it never appears; the reader must still allow it).
//     value: null (unset reference/object attribute) | OBJ (single containment) | [OBJ...] (many containment) |
//     "literal" (enum: EEnumLiteral.getLiteral(), e.g. "bipartite graphs") | JSON string (EString; EDoubleObject and
//     EFloatObject as the Java Double.toString / Float.toString text, e.g. "2.0", "1.0E10") | JSON number (int types) |
//     JSON boolean (primitive boolean flags: false when unset).
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.Module;
import com.google.inject.util.Modules;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.elk.core.debug.grandom.GRandomRuntimeModule;
import org.eclipse.elk.core.debug.grandom.GRandomStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EAttribute;
import org.eclipse.emf.ecore.EEnumLiteral;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.xtext.diagnostics.AbstractDiagnostic;
import org.eclipse.xtext.nodemodel.SyntaxErrorMessage;
import org.eclipse.xtext.parser.antlr.ISyntaxErrorMessageProvider;
import org.eclipse.xtext.parser.antlr.SyntaxErrorMessageProvider;
import org.eclipse.xtext.resource.XtextSyntaxDiagnostic;

public class ElkrParseVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String CONVERSION_CODE = "elkr.vectors.ValueConversion";
    static final String SCENARIO_DIR = "elkr-parse-scenarios", EXTENSION = ".elkr", OUTPUT = "grandom-parse.json";

    public static void main(String[] args) throws IOException {
        new Setup().createInjectorAndDoEMFRegistration();
        List<Map<String, Object>> cases = new ArrayList<>();
        for (Path file : scenarioFiles(Path.of(args[1], SCENARIO_DIR))) {
            cases.add(record(file));
        }
        cases.sort(Comparator.comparing(c -> (String) c.get("id")));
        write(Path.of(args[0], OUTPUT), cases);
    }

    static List<Path> scenarioFiles(Path dir) throws IOException {
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(p -> p.getFileName().toString().endsWith(EXTENSION)).sorted().toList();
        }
    }

    static Map<String, Object> record(Path file) throws IOException {
        String name = file.getFileName().toString();
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        if (!resource.getWarnings().isEmpty()) {
            throw new IllegalStateException(name + ": unexpected warnings " + resource.getWarnings());
        }
        List<Object> syntax = new ArrayList<>(), conversion = new ArrayList<>();
        for (Resource.Diagnostic d : resource.getErrors()) {
            boolean conv = d instanceof XtextSyntaxDiagnostic s && CONVERSION_CODE.equals(s.getCode());
            (conv ? conversion : syntax).add(diagnostic((AbstractDiagnostic) d));
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", name.substring(0, name.length() - EXTENSION.length()));
        row.put("input", Files.readString(file, StandardCharsets.UTF_8));
        row.put("syntaxErrors", syntax);
        row.put("conversionErrors", conversion);
        row.put("model", resource.getContents().isEmpty() ? null : dump(resource.getContents().get(0)));
        return row;
    }

    static Map<String, Object> diagnostic(AbstractDiagnostic d) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("message", d.getMessage());
        m.put("line", d.getLine());
        m.put("offset", d.getOffset());
        m.put("length", d.getLength());
        return m;
    }

    static Map<String, Object> dump(EObject o) {
        List<Object> features = new ArrayList<>();
        for (EStructuralFeature f : o.eClass().getEAllStructuralFeatures()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", f.getName());
            m.put("value", value(o, f));
            if (f.isUnsettable()) {
                m.put("isSet", o.eIsSet(f));
            }
            features.add(m);
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("class", o.eClass().getName());
        m.put("features", features);
        return m;
    }

    static Object value(EObject o, EStructuralFeature f) {
        Object v = o.eGet(f);
        if (v instanceof List<?> l) {
            List<Object> out = new ArrayList<>();
            l.forEach(e -> out.add(scalar(f, e)));
            return out;
        }
        return scalar(f, v);
    }

    static Object scalar(EStructuralFeature f, Object v) {
        if (v == null) {
            return null;
        }
        if (v instanceof EObject e) {
            return dump(e);
        }
        if (f instanceof EAttribute && v instanceof org.eclipse.emf.common.util.Enumerator en) {
            return en instanceof EEnumLiteral l ? l.getLiteral() : en.getLiteral();
        }
        if (v instanceof Double || v instanceof Float) {
            return v.toString();
        }
        if (v instanceof String || v instanceof Integer || v instanceof Boolean) {
            return v;
        }
        throw new IllegalStateException("unexpected value " + v.getClass() + " of " + f.getName());
    }

    static void write(Path out, List<Map<String, Object>> cases) throws IOException {
        StringBuilder sb = new StringBuilder("{\n");
        sb.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        sb.append("  \"xtextVersion\": \"").append(xtextVersion()).append("\",\n");
        sb.append("  \"cases\": [\n");
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

    /** GRandomStandaloneSetup with the tagging message provider bound over the runtime module. */
    static final class Setup extends GRandomStandaloneSetup {
        @Override
        public Injector createInjector() {
            Module tagging = binder -> binder.bind(ISyntaxErrorMessageProvider.class).to(ConversionTagging.class);
            return Guice.createInjector(Modules.override(new GRandomRuntimeModule()).with(tagging));
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

    // ---- compact JSON writer ----
    static final class Json {
        static void write(StringBuilder sb, Object v) {
            if (v == null) {
                sb.append("null");
            } else if (v instanceof String s) {
                string(sb, s);
            } else if (v instanceof Map<?, ?> m) {
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
            } else if (v instanceof List<?> l) {
                sb.append('[');
                for (int i = 0; i < l.size(); i++) {
                    sb.append(i == 0 ? "" : ",");
                    write(sb, l.get(i));
                }
                sb.append(']');
            } else {
                sb.append(v);
            }
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
