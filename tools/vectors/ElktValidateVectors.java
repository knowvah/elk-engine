// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, G5) for the ELK Graph Text validator: what Xtext's
// IResourceValidator reports for an .elkt document at the pinned ELK commit (ElkGraphValidator, the value
// converters' and linker's diagnostics folded in by ResourceValidatorImpl). This program only CALLS ELK/Xtext
// and records results; it embeds no ELK implementation.
// Run: tools/vectors/elkt-vectors.sh <outDir>  (java -cp ... ElktValidateVectors.java <outDir> <tools/vectors dir>)
// Registry: first statement establishes the CoreOptions-only registry (G3, C8). The algorithms fixed/box/random
// are still registered there but deferred in TS, so scenarios depending on them carry "deferred": "mission5".
// Inputs: <vectorsDir>/elkt-validate-scenarios/*.elkt, one case per file (case id = file name without ".elkt").
//   Directive comments (any position among the leading "//" lines):
//     // @covers <ElkGraphValidator.xtend line ranges, free text>   (required)
//     // @deferred mission5                                         (optional)
// Output <outDir>/graph-text-validate.json: 2-space indent at the top level, one compact case per line, cases
//   sorted by id (String order), trailing newline:
//   { elkCommit, xtextVersion, registry: "core", cases: [ CASE ] }
//   CASE = { id, input, covers, deferred?, issues: [ISSUE], mutations: [MUTATION] }
//        | { id, input, covers, deferred?, throws: {class, message} }   // validate() itself threw
//   input = the complete file text including the directive lines, so line numbers are those of the file.
//   ISSUE = { severity: "error"|"warning"|"info", message, line (1-based), code (String|null) }
//   Parser/linker diagnostics are folded in by ResourceValidatorImpl with their own codes (syntax errors carry
//   "org.eclipse.xtext.diagnostics.Diagnostic.Syntax"; G5: syntax messages match by presence only).
//   issues are SORTED by (line, severity, code ?? "", message), String order, null-free keys: the order in which
//   @Check methods run per object comes from Class.getDeclaredMethods and is unspecified. Raw emission order can be
//   dumped for comparison with -Delkt.validate.raw=<file> (not part of the ref).
//   MUTATION = { path, key, valueClassBefore, valueClassAfter }: a property entry (EMapPropertyHolder.getProperties
//   in document order) whose value class changed during validation, i.e. a LayoutOptionProxy replaced by its
//   resolved value (ElkGraphValidator.xtend:101). NOTE: always [] in the core registry: a proxy only survives
//   conversion when the option is unknown or the text unparseable, and validation re-resolves with the same option
//   and text; the only difference (legacy ids, LayoutMetaDataService.getOptionData) needs algorithm bundles that
//   register legacy ids (layered etc., missions 5/7). path = EcoreUtil relative URI fragment path from the root
//   ("" = root node, "/@children.0/@ports.1"); key = the property id; classes are binary class names.
// Branches of ElkGraphValidator.xtend that no .elkt document can reach in the core registry (the TS port keeps
// them; there is nothing to record). Each was probed while writing the scenarios:
//   - 82-83, 100-101 (proxy resolved during validation, entry.value = value): conversion and validation parse the
//     same text with the same option; the only difference is a legacy option id (getOptionData resolves legacy ids,
//     the converter's suffix lookup did not), and no core option has one. Scenario valueResolved-proxy-not-reachable
//     records the legacy-id attempt; "mutations" is [] in every case. Missions 5/7 (layered etc.) can reach it.
//   - 86-87 (STRING option left unresolved) and 96 without optionClass: STRING parses every text; every core
//     OBJECT/ENUM option has an optionClass.
//   - 106-107 / LayoutOptionValidator "does not match the type" and 111-112 (WARNING severity): parseValue only
//     yields correctly typed values and checkProperty only creates ERROR issues.
//   - "greater than the upper bound": no core option has a finite upper bound.
//   - 116 "value as String" ClassCastException: ALGORITHM is a STRING option.
//   - 143: getContainerOfType(ElkNode) of a graph element is never null.
//   - 216-218: the guard is always true (the grammar needs >= 1 source and target); findBestEdgeContainment's
//     0/1-incident-shape cases, its null result and "endpoints with no common container" cannot occur in one
//     resource; edges with unresolved endpoints produce no containment warning (scenario edgeContainer-unresolved).
//   - 233/242 text for an unresolved shape: proxies are skipped at 231/240 (scenario edgeSection-proxy-skipped).
// Property keys whose first segment is a keyword (port., edge., label., ...) need ^-escapes in .elkt (^port.side).
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.graph.EMapPropertyHolder;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.util.CancelIndicator;
import org.eclipse.xtext.validation.CheckMode;
import org.eclipse.xtext.validation.Issue;

public class ElktValidateVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String SCENARIOS = "elkt-validate-scenarios", EXTENSION = ".elkt";
    private static final String OUTPUT = "graph-text-validate.json", RAW_PROPERTY = "elkt.validate.raw";
    private static final Pattern COVERS = Pattern.compile("^//\\s*@covers\\s+(.+?)\\s*$");
    private static final Pattern DEFERRED = Pattern.compile("^//\\s*@deferred\\s+(\\S+)\\s*$");

    /** One property entry observed before validation: where it lives and what its value class was. */
    private record Entry(String path, String key, String valueClass) { }

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        ElkGraphStandaloneSetup.doSetup();
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

    private static Map<String, Object> record(final Path file, final StringBuilder raw) throws IOException {
        String name = file.getFileName().toString();
        String text = Files.readString(file, StandardCharsets.UTF_8);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", name.substring(0, name.length() - EXTENSION.length()));
        row.put("input", text);
        row.put("covers", directive(text, COVERS, name, true));
        String deferred = directive(text, DEFERRED, name, false);
        if (deferred != null) {
            row.put("deferred", deferred);
        }
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

    private static String directive(final String text, final Pattern pattern, final String name, final boolean required) {
        for (String line : text.split("\n", -1)) {
            Matcher m = pattern.matcher(line);
            if (m.matches()) {
                return m.group(1);
            }
        }
        if (required) {
            throw new IllegalStateException(name + ": missing directive " + pattern.pattern());
        }
        return null;
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
