// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13) for the ELK Graph JSON Text (.elkj) validator: what Xtext's
// IResourceValidator reports for an .elkj document at the pinned ELK commit. ElkGraphJsonValidator.xtend is an
// empty template, so everything reported comes from the Xtext pipeline itself: syntax and value-converter
// diagnostics, the (lazy, D11) linker's diagnostics, and the EMF EObjectValidator constraints. No
// LayoutOptionValidator checks run for .elkj (unlike .elkt): an invalid or unknown option yields no issue.
// This program only CALLS ELK/Xtext and records results; it embeds no ELK implementation.
// Run: tools/vectors/elkj-vectors.sh <outDir>  (java -cp ... ElkjValidateVectors.java <outDir> <tools/vectors dir>)
// Registry: first statement establishes the CoreOptions-only registry (D4).
// Inputs: <vectorsDir>/elkj-validate-scenarios/*.elkj, one case per file (case id = file name without ".elkj").
//   Directive comment (JSON comments are legal: the grammar inherits the Terminals comment rules):
//     // @covers <free text>   (required)
// Output <outDir>/graph-json-text-validate.json: 2-space indent at the top level, one compact case per line, cases
//   sorted by id (String order), trailing newline:
//   { elkCommit, xtextVersion, registry: "core", cases: [ CASE ] }
//   CASE = { id, input, covers, issues: [ISSUE], mutations: [MUTATION] }
//        | { id, input, covers, throws: {class, message} }   // validate() itself threw
//   input = the complete file text including the directive line, so line numbers are those of the file.
//   ISSUE = { severity: "error"|"warning"|"info", message, line (1-based), code (String|null), stage }
//   stage = the pipeline stage that reported the issue, derived from its code:
//     "syntax"  code starts with org.eclipse.xtext.diagnostics.Diagnostic.Syntax (parser errors, and the
//               value converters' ValueConverterException, which carry Syntax.Range); G5: presence-only messages
//     "linking" code org.eclipse.xtext.diagnostics.Diagnostic.Linking (unresolved/ambiguous reference)
//     "emf"     code starts with org.eclipse.emf.ecore. (EObjectValidator constraints, e.g. .14 map-key collision)
//     "check"   any other code, including null: declarative @Check methods (none exist for .elkj)
//   issues are SORTED by (line, severity, code ?? "", message), String order: the order in which checks run per
//   object is unspecified. Raw emission order can be dumped for comparison with -Delkj.validate.raw=<file>
//   (not part of the ref).
//   MUTATION = { path, key, valueClassBefore, valueClassAfter }: a property entry whose value class changed
//   during validation (a LayoutOptionProxy replaced by its resolved value); expected [] for .elkj.
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.graph.ElkGraphPackage;
import org.eclipse.elk.graph.EMapPropertyHolder;
import org.eclipse.elk.graph.json.text.ElkGraphJsonStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.util.CancelIndicator;
import org.eclipse.xtext.validation.CheckMode;
import org.eclipse.xtext.validation.Issue;

public class ElkjValidateVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String SCENARIOS = "elkj-validate-scenarios", EXTENSION = ".elkj";
    private static final String OUTPUT = "graph-json-text-validate.json", RAW_PROPERTY = "elkj.validate.raw";
    private static final Pattern COVERS = Pattern.compile("^//\\s*@covers\\s+(.+?)\\s*$");

    /** One property entry observed before validation: where it lives and what its value class was. */
    private record Entry(String path, String key, String valueClass) { }

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        // The grammar imports http://www.eclipse.org/elk/ElkGraph; outside OSGi nothing else initialises the package
        // (the .elkj setup does not, unlike the .elkt one), so the parse fails with "Unresolved proxy" without this.
        ElkGraphPackage.eINSTANCE.getName();
        ElkGraphJsonStandaloneSetup.doSetup();
        Path dir = Path.of(args[1]).resolve(SCENARIOS);
        List<Path> files = scenarioFiles(dir);
        StringBuilder raw = new StringBuilder();
        List<Map<String, Object>> cases = new ArrayList<>();
        for (Path file : files) {
            cases.add(record(file, raw));
        }
        cases.sort(Comparator.comparing(c -> (String) c.get("id")));
        Files.writeString(Path.of(args[0]).resolve(OUTPUT), render(cases), StandardCharsets.UTF_8);
        String rawFile = System.getProperty(RAW_PROPERTY);
        if (rawFile != null) {
            Files.writeString(Path.of(rawFile), raw.toString(), StandardCharsets.UTF_8);
        }
    }

    private static List<Path> scenarioFiles(final Path dir) throws IOException {
        try (var stream = Files.list(dir)) {
            return stream.filter(p -> p.getFileName().toString().endsWith(EXTENSION)).sorted().toList();
        }
    }

    private static Map<String, Object> record(final Path file, final StringBuilder raw)
            throws IOException {
        String name = file.getFileName().toString();
        String text = Files.readString(file, StandardCharsets.UTF_8);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", name.substring(0, name.length() - EXTENSION.length()));
        row.put("input", text);
        row.put("covers", directive(text, COVERS, name));
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        List<Entry> before = snapshot(resource);
        try {
            List<Issue> issues = ((XtextResource) resource).getResourceServiceProvider().getResourceValidator()
                    .validate(resource, CheckMode.ALL, CancelIndicator.NullImpl);
            raw.append("== ").append(row.get("id")).append('\n');
            issues.forEach(i -> raw.append(issueKey(i)).append('\n'));
            row.put("issues", issueRows(issues));
            row.put("mutations", mutations(before, snapshot(resource)));
        } catch (RuntimeException e) {
            row.put("throws", throwable(e));
        }
        return row;
    }

    private static String directive(final String text, final Pattern pattern, final String name) {
        for (String line : text.split("\n", -1)) {
            Matcher m = pattern.matcher(line);
            if (m.matches()) {
                return m.group(1);
            }
        }
        throw new IllegalStateException(name + ": missing directive " + pattern.pattern());
    }

    private static List<Entry> snapshot(final Resource resource) {
        List<Entry> entries = new ArrayList<>();
        for (Iterator<EObject> it = resource.getAllContents(); it.hasNext();) {
            if (it.next() instanceof EMapPropertyHolder holder) {
                String path = EcoreUtil.getRelativeURIFragmentPath(null, holder);
                holder.getProperties().forEach(e -> entries.add(new Entry(path, e.getKey().getId(), className(e.getValue()))));
            }
        }
        return entries;
    }

    private static String className(final Object value) {
        return value == null ? "null" : value.getClass().getName();
    }

    private static List<Object> mutations(final List<Entry> before, final List<Entry> after) {
        List<Object> rows = new ArrayList<>();
        for (int i = 0; i < before.size(); i++) {
            Entry b = before.get(i), a = after.get(i);
            if (!b.valueClass().equals(a.valueClass())) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("path", b.path());
                row.put("key", b.key());
                row.put("valueClassBefore", b.valueClass());
                row.put("valueClassAfter", a.valueClass());
                rows.add(row);
            }
        }
        return rows;
    }

    private static Map<String, Object> throwable(final Throwable e) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("class", e.getClass().getName());
        row.put("message", e.getMessage());
        return row;
    }

    private static String issueKey(final Issue issue) {
        return issue.getLineNumber() + "|" + issue.getSeverity().name().toLowerCase(Locale.ROOT) + "|"
                + issue.getCode() + "|" + issue.getMessage();
    }

    private static String stage(final String code) {
        if (code == null) {
            return "check";
        } else if (code.startsWith("org.eclipse.xtext.diagnostics.Diagnostic.Syntax")) {
            return "syntax";
        } else if (code.equals("org.eclipse.xtext.diagnostics.Diagnostic.Linking")) {
            return "linking";
        } else if (code.startsWith("org.eclipse.emf.ecore.")) {
            return "emf";
        }
        return "check";
    }

    private static List<Object> issueRows(final List<Issue> issues) {
        Comparator<Issue> order = Comparator.comparing((Issue i) -> i.getLineNumber(), Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(i -> i.getSeverity().name().toLowerCase(Locale.ROOT))
                .thenComparing(i -> i.getCode() == null ? "" : i.getCode())
                .thenComparing(Issue::getMessage);
        List<Object> rows = new ArrayList<>();
        for (Issue issue : issues.stream().sorted(order).toList()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("severity", issue.getSeverity().name().toLowerCase(Locale.ROOT));
            row.put("message", issue.getMessage());
            row.put("line", issue.getLineNumber());
            row.put("code", issue.getCode());
            row.put("stage", stage(issue.getCode()));
            rows.add(row);
        }
        return rows;
    }

    private static String render(final List<Map<String, Object>> cases) {
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"xtextVersion\": \"").append(XTEXT_VERSION).append("\",\n");
        out.append("  \"registry\": \"core\",\n  \"cases\": [\n");
        for (int i = 0; i < cases.size(); i++) {
            out.append("    ");
            json(out, cases.get(i));
            out.append(i + 1 < cases.size() ? ",\n" : "\n");
        }
        return out.append("  ]\n}\n").toString();
    }

    private static void json(final StringBuilder out, final Object value) {
        if (value == null) {
            out.append("null");
        } else if (value instanceof String s) {
            string(out, s);
        } else if (value instanceof Map<?, ?> map) {
            joined(out, '{', '}', map.entrySet().iterator(), e -> {
                string(out, (String) e.getKey());
                out.append(':');
                json(out, e.getValue());
            });
        } else if (value instanceof List<?> list) {
            joined(out, '[', ']', list.iterator(), v -> json(out, v));
        } else {
            out.append(value);
        }
    }

    private static <T> void joined(final StringBuilder out, final char open, final char close, final Iterator<T> it,
            final java.util.function.Consumer<T> each) {
        out.append(open);
        while (it.hasNext()) {
            each.accept(it.next());
            if (it.hasNext()) {
                out.append(',');
            }
        }
        out.append(close);
    }

    private static void string(final StringBuilder out, final String s) {
        out.append('"');
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < ' ') {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        out.append('"');
    }
}
