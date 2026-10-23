// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13) for the random-graph text (.elkr) validator: what Xtext's
// IResourceValidator reports for a .elkr document at the pinned ELK commit (GRandomValidator, with the parser's
// syntax and value-conversion diagnostics folded in by ResourceValidatorImpl). This program only CALLS ELK/Xtext and
// records results; it embeds no ELK implementation. The grammar has no cross-references, so no linking issues exist.
// Run: tools/vectors/elkr-vectors.sh <outDir>  (java -cp ... ElkrValidateVectors.java <outDir> <tools/vectors dir>)
// Inputs: <vectors dir>/elkr-validate-scenarios/*.elkr, one row per file (id = file name minus ".elkr"), read as UTF-8
//   bytes exactly (CR and CRLF preserved).
// Validation: doSetup(), ResourceSetImpl.getResource(fileURI, true), then the resource service provider's
//   IResourceValidator.validate(resource, CheckMode.ALL, CancelIndicator.NullImpl).
// Feature: Xtext's Issue carries no feature. An IDiagnosticConverter subclass bound over the runtime module
//   (Modules.override) wraps the acceptor of convertValidatorDiagnostic and notes the FeatureBasedDiagnostic feature name of
//   every issue it forwards (identity map issue -> feature); parser/lexer issues (convertResourceDiagnostic) and
//   issues without a feature get null.
// Output <outDir>/grandom-validate.json, 2-space indent for the top level, one compact JSON row per line, trailing
//   newline (non-ASCII and control characters are written as JSON u-escapes):
//   { elkCommit, xtextVersion, cases: [ ROW ] }       // sorted by id
//   ROW = { id, input, issues: [ISSUE] }
//   ISSUE = { severity: "error"|"warning"|"info", code (String|null), message, line (1-based), offset, length,
//             feature (EStructuralFeature name|null) }
//   Syntax issues carry code "org.eclipse.xtext.diagnostics.Diagnostic.Syntax" (value-conversion failures too: Xtext
//   gives them the same code here); validator errors have code null. issues are SORTED by (line, offset, severity,
//   code ?? "", message), String order: the order in which @Check methods run is unspecified, so the raw order is not
//   part of the ref. Recorded as the JVM produces it; nothing is interpreted.
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
import org.eclipse.emf.common.util.Diagnostic;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextSyntaxDiagnostic;
import org.eclipse.xtext.util.CancelIndicator;
import org.eclipse.xtext.util.IAcceptor;
import org.eclipse.xtext.validation.CheckMode;
import org.eclipse.xtext.validation.DiagnosticConverterImpl;
import org.eclipse.xtext.validation.FeatureBasedDiagnostic;
import org.eclipse.xtext.validation.IDiagnosticConverter;
import org.eclipse.xtext.validation.Issue;

public class ElkrValidateVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String SCENARIOS = "elkr-validate-scenarios", EXTENSION = ".elkr", OUTPUT = "grandom-validate.json";
    /** Issue -> feature name, filled by the capturing converter during one validate call. */
    private static final Map<Issue, String> FEATURES = new IdentityHashMap<>();

    public static void main(String[] args) throws IOException {
        new Setup().createInjectorAndDoEMFRegistration();
        List<Map<String, Object>> cases = new ArrayList<>();
        try (Stream<Path> s = Files.list(Path.of(args[1]).resolve(SCENARIOS))) {
            for (Path file : s.filter(p -> p.getFileName().toString().endsWith(EXTENSION)).sorted().toList()) {
                cases.add(record(file));
            }
        }
        cases.sort(Comparator.comparing(c -> (String) c.get("id")));
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0]).resolve(OUTPUT), render(cases), StandardCharsets.UTF_8);
    }

    private static Map<String, Object> record(Path file) throws IOException {
        String name = file.getFileName().toString();
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        FEATURES.clear();
        List<Issue> issues = ((XtextResource) resource).getResourceServiceProvider().getResourceValidator()
                .validate(resource, CheckMode.ALL, CancelIndicator.NullImpl);
        Comparator<Issue> order = Comparator.comparing((Issue i) -> i.getLineNumber())
                .thenComparing(i -> i.getOffset())
                .thenComparing(i -> i.getSeverity().name().toLowerCase(Locale.ROOT))
                .thenComparing(i -> i.getCode() == null ? "" : i.getCode())
                .thenComparing(Issue::getMessage);
        List<Object> rows = new ArrayList<>();
        for (Issue issue : issues.stream().sorted(order).toList()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("severity", issue.getSeverity().name().toLowerCase(Locale.ROOT));
            m.put("code", issue.getCode());
            m.put("message", issue.getMessage());
            m.put("line", issue.getLineNumber());
            m.put("offset", issue.getOffset());
            m.put("length", issue.getLength());
            m.put("feature", FEATURES.get(issue));
            rows.add(m);
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", name.substring(0, name.length() - EXTENSION.length()));
        row.put("input", Files.readString(file, StandardCharsets.UTF_8));
        row.put("issues", rows);
        return row;
    }

    /** The version directory of the Xtext bundle jar on the classpath, e.g. 2.36.0. */
    private static String xtextVersion() {
        String location = XtextSyntaxDiagnostic.class.getProtectionDomain().getCodeSource().getLocation().toString();
        Matcher m = Pattern.compile("org\\.eclipse\\.xtext/(\\d+\\.\\d+\\.\\d+)").matcher(location);
        if (!m.find()) {
            throw new IllegalStateException("cannot read the Xtext version from " + location);
        }
        return m.group(1);
    }

    /** GRandomStandaloneSetup with the feature-capturing diagnostic converter bound over the runtime module. */
    static final class Setup extends GRandomStandaloneSetup {
        @Override
        public Injector createInjector() {
            Module capture = binder -> binder.bind(IDiagnosticConverter.class).to(FeatureCapturing.class);
            return Guice.createInjector(Modules.override(new GRandomRuntimeModule()).with(capture));
        }
    }

    /** Default conversion; additionally remembers the feature name of each forwarded validator issue. */
    public static class FeatureCapturing extends DiagnosticConverterImpl {
        @Override
        public void convertValidatorDiagnostic(Diagnostic diagnostic, IAcceptor<Issue> acceptor) {
            super.convertValidatorDiagnostic(diagnostic, issue -> {
                if (diagnostic instanceof FeatureBasedDiagnostic f && f.getFeature() != null) {
                    FEATURES.put(issue, f.getFeature().getName());
                }
                acceptor.accept(issue);
            });
        }
    }

    private static String render(List<Map<String, Object>> cases) {
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"xtextVersion\": \"").append(xtextVersion()).append("\",\n");
        out.append("  \"cases\": [\n");
        for (int i = 0; i < cases.size(); i++) {
            out.append("    ");
            json(out, cases.get(i));
            out.append(i + 1 < cases.size() ? ",\n" : "\n");
        }
        return out.append("  ]\n}\n").toString();
    }

    private static void json(StringBuilder sb, Object v) {
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
                json(sb, e.getValue());
            }
            sb.append('}');
        } else if (v instanceof List<?> l) {
            sb.append('[');
            for (int i = 0; i < l.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                json(sb, l.get(i));
            }
            sb.append(']');
        } else {
            sb.append(v);
        }
    }

    private static void string(StringBuilder sb, String s) {
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
