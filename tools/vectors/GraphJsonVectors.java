// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, J4/J5/J8) for the ELK Graph JSON adapter: what
// org.eclipse.elk.graph.json does at the pinned ELK commit. Exercised: ElkGraphJson (ImportBuilder.lenient/toElk,
// ExportBuilder flags/toJson), JsonImporter, JsonExporter (seeded by oracle patch 0001), JsonAdapter,
// JsonMetaDataConverter, LayoutOptionData.parseValue; Gson 2.11.0 is only used by ELK itself. This program only
// CALLS ELK and records results; it embeds no ELK implementation.
// Run: tools/vectors/graph-json-vectors.sh <outDir>  (java -cp ... GraphJsonVectors.java <outDir> <scenarioDir> <gson>)
// Service: created with an isolated loader (CoreOptions only, as in MetaDataVectors.java); the importer/exporter use it.
// Inputs: <scenarioDir>/manifest.txt, one row per line, "#" comments:
//   import <fixture> [strict]            -> one import row; fixture file <scenarioDir>/<fixture>.json
//   export <fixture> <all|pairwise> [mod ...]
//        all = the 64 flag combinations, pairwise = 16 (strength-3 orthogonal array: l=p^s^z, u=s^z^d; it holds the
//        oracle combination 110001 and the builder defaults 011101). The fixture is imported (lenient), the mods are
//        applied, then it is exported. Mods: seed (system property org.eclipse.elk.graph.json.exportSeed=1 for the
//        row), clear=<nodes|ports|edges|sections>[@i,j] (identifier := null on all / the listed elements, counted in
//        pre-order: nodes root first, ports/edges/sections following that node order), unknown (Property
//        "my.unknown.option" = "v" on the root, and on the first child node / first edge when they exist), foreignTarget /
//        foreignSource (the first edge's targets/sources are replaced by a node outside the graph).
//   option <optionId> <valueInput>       -> optionText row (valueInput is the rest of the line, verbatim)
// Output <outDir>/graph-json.json, 2-space indent for the top level, one compact JSON row per line, trailing newline:
//   { elkCommit, gsonVersion, exportSeed: 1,
//     import:  [ { id, input, lenient, graph: G } | { id, input, lenient, throws } ],
//     export:  [ { id, input, mods: [string], flags: {prettyPrint, shortLayoutOptionKeys, omitZeroPositions,
//                  omitZeroDimension, omitLayout, omitUnknownLayoutOptions}, text } | { ..., throws } ],
//     optionText: [ { option, valueInput, text } ],   // text = String.valueOf(parseValue(valueInput)), the exporter's
//                                                     // p.value.toString; null when parseValue returned null (not set)
//     converter:  [ { kind: option|category|algorithm|unhandled|null, id, text } | { ..., throws } ] }
//   converter text = JsonMetaDataConverter.toJson(data).toString() (compact Gson JsonElement text).
//   Import row ids are "<fixture>" (lenient) or "<fixture>:strict"; export row ids "<fixture>[+mod...]/<flag bits>"
//   with the bits in the order of "flags" above. throws = { class (binary name), message, cause?: {class, message} }.
// G (canonical ElkGraph tree; doubles are Double.toString text, identifiers are strings or null):
//   node  = { identifier, x, y, width, height, properties, labels: [label], ports: [port], children: [node],
//             edges: [edge] }              // edges = node.getContainedEdges() (after updateContainment)
//   port  = { identifier, x, y, width, height, properties, labels }
//   label = { identifier, text, x, y, width, height, properties, labels }
//   edge  = { identifier, sources: [ref], targets: [ref], properties, labels, sections: [section] }
//   section = { identifier, startX, startY, endX, endY, bendPoints: [{x, y}], incomingShape: ref|null,
//             outgoingShape: ref|null, incomingSections: [identifier], outgoingSections: [identifier], properties }
//   ref = { kind: "node"|"port", id: identifier }
//   properties = [ { id, text } ] in getAllProperties() order, text = String.valueOf(value).
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.eclipse.elk.core.data.*;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.json.JsonMetaDataConverter;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.IPropertyHolder;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.util.ElkGraphUtil;

public class GraphJsonVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    private static final String ID = "id", INPUT = "input", THROWS = "throws", TEXT = "text", KIND = "kind";
    private static final String IDENTIFIER = "identifier", PROPERTIES = "properties", LABELS = "labels";
    private static final String MANIFEST = "manifest.txt", SEED_MOD = "seed", CLEAR_MOD = "clear=";
    private static final String[] FLAG_NAMES = {"prettyPrint", "shortLayoutOptionKeys", "omitZeroPositions",
        "omitZeroDimension", "omitLayout", "omitUnknownLayoutOptions"};

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        Path scenarios = Path.of(args[1]);
        List<Object> imports = new ArrayList<>(), exports = new ArrayList<>(), options = new ArrayList<>();
        for (String line : Files.readAllLines(scenarios.resolve(MANIFEST), StandardCharsets.UTF_8)) {
            if (!line.isBlank() && !line.startsWith("#")) {
                dispatch(scenarios, line, imports, exports, options);
            }
        }
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"gsonVersion\": \"").append(args[2]).append("\",\n  \"exportSeed\": 1,\n");
        rows(out, "import", imports, true);
        rows(out, "export", exports, true);
        rows(out, "optionText", options, true);
        rows(out, "converter", Converter.rows(), false);
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], "graph-json.json"), out.append("}\n"), StandardCharsets.UTF_8);
    }

    private static void dispatch(Path dir, String line, List<Object> imports, List<Object> exports,
        List<Object> options) throws IOException {
        String[] w = line.split(" ", 3);
        switch (w[0]) {
            case "import" -> imports.add(Rows.importRow(dir, w[1], w.length > 2 && w[2].equals("strict")));
            case "export" -> exports.addAll(Rows.exportRows(dir, w[1], w[2].split(" ")));
            case "option" -> options.add(Rows.optionRow(w[1], w[2]));
            default -> throw new IllegalStateException("bad manifest row: " + line);
        }
    }

    private static void rows(StringBuilder out, String key, List<Object> list, boolean more) {
        out.append("  \"").append(key).append("\": [\n");
        for (int i = 0; i < list.size(); i++) {
            out.append("    ");
            Json.write(out, list.get(i));
            out.append(i + 1 < list.size() ? ",\n" : "\n");
        }
        out.append(more ? "  ],\n" : "  ]\n");
    }

    static Map<String, Object> map() { return new LinkedHashMap<>(); }

    static Map<String, Object> thrown(Throwable t) {
        Map<String, Object> m = map();
        m.put("class", t.getClass().getName());
        m.put("message", t.getMessage());
        if (t.getCause() != null) {
            m.put("cause", thrown(t.getCause()));
        }
        return m;
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
                    default -> sb.append(c < ' ' ? String.format("\\u%04x", (int) c) : String.valueOf(c));
                }
            }
            sb.append('"');
        }
    }

    // ---- canonical ElkGraph tree ----
    static final class Canon {
        static Map<String, Object> node(ElkNode n) {
            Map<String, Object> m = shape(n, n.getIdentifier());
            m.put(PROPERTIES, props(n));
            m.put(LABELS, labels(n.getLabels()));
            List<Object> ports = new ArrayList<>(), children = new ArrayList<>(), edges = new ArrayList<>();
            for (ElkPort p : n.getPorts()) {
                Map<String, Object> pm = shape(p, p.getIdentifier());
                pm.put(PROPERTIES, props(p));
                pm.put(LABELS, labels(p.getLabels()));
                ports.add(pm);
            }
            for (ElkNode c : n.getChildren()) {
                children.add(node(c));
            }
            for (ElkEdge e : n.getContainedEdges()) {
                edges.add(edge(e));
            }
            m.put("ports", ports);
            m.put("children", children);
            m.put("edges", edges);
            return m;
        }

        static Map<String, Object> shape(ElkShape s, String identifier) {
            Map<String, Object> m = map();
            m.put(IDENTIFIER, identifier);
            m.put("x", Double.toString(s.getX()));
            m.put("y", Double.toString(s.getY()));
            m.put("width", Double.toString(s.getWidth()));
            m.put("height", Double.toString(s.getHeight()));
            return m;
        }

        static List<Object> labels(List<ElkLabel> labels) {
            List<Object> result = new ArrayList<>();
            for (ElkLabel l : labels) {
                Map<String, Object> m = map();
                m.put(IDENTIFIER, l.getIdentifier());
                m.put(TEXT, l.getText());
                m.putAll(shape(l, null));
                m.remove(IDENTIFIER);
                m.put(PROPERTIES, props(l));
                m.put(LABELS, labels(l.getLabels()));
                result.add(m);
            }
            return result;
        }

        static List<Object> props(IPropertyHolder holder) {
            List<Object> result = new ArrayList<>();
            for (Map.Entry<IProperty<?>, Object> e : holder.getAllProperties().entrySet()) {
                Map<String, Object> m = map();
                m.put(ID, e.getKey().getId());
                m.put(TEXT, String.valueOf(e.getValue()));
                result.add(m);
            }
            return result;
        }

        static Map<String, Object> edge(ElkEdge e) {
            Map<String, Object> m = map();
            m.put(IDENTIFIER, e.getIdentifier());
            List<Object> sources = new ArrayList<>(), targets = new ArrayList<>(), sections = new ArrayList<>();
            for (ElkConnectableShape s : e.getSources()) {
                sources.add(ref(s));
            }
            for (ElkConnectableShape t : e.getTargets()) {
                targets.add(ref(t));
            }
            for (ElkEdgeSection s : e.getSections()) {
                sections.add(section(s));
            }
            m.put("sources", sources);
            m.put("targets", targets);
            m.put(PROPERTIES, props(e));
            m.put(LABELS, labels(e.getLabels()));
            m.put("sections", sections);
            return m;
        }

        static Map<String, Object> section(ElkEdgeSection s) {
            Map<String, Object> m = map();
            m.put(IDENTIFIER, s.getIdentifier());
            m.put("startX", Double.toString(s.getStartX()));
            m.put("startY", Double.toString(s.getStartY()));
            m.put("endX", Double.toString(s.getEndX()));
            m.put("endY", Double.toString(s.getEndY()));
            List<Object> bends = new ArrayList<>();
            for (ElkBendPoint b : s.getBendPoints()) {
                Map<String, Object> bm = map();
                bm.put("x", Double.toString(b.getX()));
                bm.put("y", Double.toString(b.getY()));
                bends.add(bm);
            }
            m.put("bendPoints", bends);
            m.put("incomingShape", s.getIncomingShape() == null ? null : ref(s.getIncomingShape()));
            m.put("outgoingShape", s.getOutgoingShape() == null ? null : ref(s.getOutgoingShape()));
            m.put("incomingSections", sectionIds(s.getIncomingSections()));
            m.put("outgoingSections", sectionIds(s.getOutgoingSections()));
            m.put(PROPERTIES, props(s));
            return m;
        }

        static List<Object> sectionIds(List<ElkEdgeSection> sections) {
            List<Object> ids = new ArrayList<>();
            sections.forEach(s -> ids.add(s.getIdentifier()));
            return ids;
        }

        static Map<String, Object> ref(ElkConnectableShape s) {
            Map<String, Object> m = map();
            m.put(KIND, s instanceof ElkPort ? "port" : "node");
            m.put(ID, ((ElkGraphElement) s).getIdentifier());
            return m;
        }
    }

    // ---- import / export / option rows ----
    static final class Rows {
        static Map<String, Object> importRow(Path dir, String fixture, boolean strict) throws IOException {
            Map<String, Object> row = map();
            row.put(ID, strict ? fixture + ":strict" : fixture);
            row.put(INPUT, fixture + ".json");
            row.put("lenient", !strict);
            try {
                row.put("graph", Canon.node(load(dir, fixture, !strict)));
            } catch (Exception e) {
                row.put(THROWS, thrown(e));
            }
            return row;
        }

        static ElkNode load(Path dir, String fixture, boolean lenient) throws IOException {
            String text = Files.readString(dir.resolve(fixture + ".json"), StandardCharsets.UTF_8);
            return ElkGraphJson.forGraph(text).lenient(lenient).toElk();
        }

        static List<Object> exportRows(Path dir, String fixture, String[] words) throws IOException {
            List<String> mods = new ArrayList<>(Arrays.asList(words).subList(1, words.length));
            boolean all = words[0].equals("all");
            List<Object> rows = new ArrayList<>();
            for (int m = 0; m < (all ? 64 : 16); m++) {
                boolean[] f = all ? allFlags(m) : pairwiseFlags(m);
                rows.add(exportRow(dir, fixture, mods, f));
            }
            return rows;
        }

        static boolean[] allFlags(int m) {
            boolean[] f = new boolean[6];
            for (int i = 0; i < 6; i++) {
                f[i] = ((m >> (5 - i)) & 1) == 1;
            }
            return f;
        }

        static boolean[] pairwiseFlags(int m) {
            boolean p = (m & 8) != 0, s = (m & 4) != 0, z = (m & 2) != 0, d = (m & 1) != 0;
            return new boolean[] {p, s, z, d, p ^ s ^ z, s ^ z ^ d};
        }

        static Map<String, Object> exportRow(Path dir, String fixture, List<String> mods, boolean[] f)
            throws IOException {
            StringBuilder bits = new StringBuilder();
            Map<String, Object> flags = map();
            for (int i = 0; i < 6; i++) {
                bits.append(f[i] ? '1' : '0');
                flags.put(FLAG_NAMES[i], f[i]);
            }
            String tag = mods.isEmpty() ? "" : "+" + String.join("+", mods);
            Map<String, Object> row = map();
            row.put(ID, fixture + tag + "/" + bits);
            row.put(INPUT, fixture + ".json");
            row.put("mods", new ArrayList<Object>(mods));
            row.put("flags", flags);
            if (mods.contains(SEED_MOD)) {
                System.setProperty(SEED_PROPERTY, "1");
            } else {
                System.clearProperty(SEED_PROPERTY);
            }
            try {
                ElkNode root = load(dir, fixture, true);
                Mods.apply(root, mods);
                row.put(TEXT, export(root, f));
            } catch (Exception e) {
                row.put(THROWS, thrown(e));
            }
            return row;
        }

        static String export(ElkNode root, boolean[] f) {
            return ElkGraphJson.forGraph(root).prettyPrint(f[0]).shortLayoutOptionKeys(f[1])
                .omitZeroPositions(f[2]).omitZeroDimension(f[3]).omitLayout(f[4])
                .omitUnknownLayoutOptions(f[5]).toJson();
        }

        static Map<String, Object> optionRow(String optionId, String valueInput) {
            LayoutOptionData data = LayoutMetaDataService.getInstance().getOptionDataBySuffix(optionId);
            Object parsed = data.parseValue(valueInput);
            Map<String, Object> m = map();
            m.put("option", optionId);
            m.put("valueInput", valueInput);
            m.put(TEXT, parsed == null ? null : parsed.toString());
            return m;
        }
    }

    // ---- export fixtures' post-import edits ----
    static final class Mods {
        static void apply(ElkNode root, List<String> mods) {
            for (String mod : mods) {
                if (mod.startsWith(CLEAR_MOD)) {
                    clear(root, mod.substring(CLEAR_MOD.length()));
                } else if (mod.equals("unknown")) {
                    unknown(root);
                } else if (mod.equals("foreignTarget")) {
                    firstEdge(root).getTargets().set(0, ElkGraphUtil.createNode(null));
                } else if (mod.equals("foreignSource")) {
                    firstEdge(root).getSources().set(0, ElkGraphUtil.createNode(null));
                } else if (!mod.equals(SEED_MOD)) {
                    throw new IllegalStateException("bad mod: " + mod);
                }
            }
        }

        static List<ElkNode> preorder(ElkNode root) {
            List<ElkNode> nodes = new ArrayList<>();
            nodes.add(root);
            for (ElkNode c : root.getChildren()) {
                nodes.addAll(preorder(c));
            }
            return nodes;
        }

        static List<ElkEdge> edges(ElkNode root) {
            List<ElkEdge> edges = new ArrayList<>();
            for (ElkNode n : preorder(root)) {
                edges.addAll(n.getContainedEdges());
            }
            return edges;
        }

        static ElkEdge firstEdge(ElkNode root) { return edges(root).get(0); }

        static void unknown(ElkNode root) {
            Property<String> unknown = new Property<>("my.unknown.option");
            root.setProperty(unknown, "v");
            if (!root.getChildren().isEmpty()) {
                root.getChildren().get(0).setProperty(unknown, "v");
            }
            List<ElkEdge> edges = edges(root);
            if (!edges.isEmpty()) {
                edges.get(0).setProperty(unknown, "v");
            }
        }

        static void clear(ElkNode root, String spec) {
            String[] parts = spec.split("@");
            List<Object> elements = elements(root, parts[0]);
            Set<Integer> only = new HashSet<>();
            if (parts.length > 1) {
                for (String i : parts[1].split(",")) {
                    only.add(Integer.parseInt(i));
                }
            }
            for (int i = 0; i < elements.size(); i++) {
                if (parts.length == 1 || only.contains(i)) {
                    if (elements.get(i) instanceof ElkEdgeSection s) {
                        s.setIdentifier(null);
                    } else {
                        ((ElkGraphElement) elements.get(i)).setIdentifier(null);
                    }
                }
            }
        }

        static List<Object> elements(ElkNode root, String kind) {
            List<Object> result = new ArrayList<>();
            for (ElkNode n : preorder(root)) {
                if (kind.equals("nodes")) {
                    result.add(n);
                } else if (kind.equals("ports")) {
                    result.addAll(n.getPorts());
                }
            }
            for (ElkEdge e : edges(root)) {
                if (kind.equals("edges")) {
                    result.add(e);
                } else if (kind.equals("sections")) {
                    result.addAll(e.getSections());
                }
            }
            return result;
        }
    }

    // ---- JsonMetaDataConverter ----
    static final class Converter {
        static List<Object> rows() {
            LayoutMetaDataService svc = LayoutMetaDataService.getInstance();
            List<Object> rows = new ArrayList<>();
            for (LayoutOptionData o : svc.getOptionData()) {
                rows.add(row("option", o));
            }
            for (LayoutCategoryData c : svc.getCategoryData()) {
                rows.add(row("category", c));
            }
            for (LayoutAlgorithmData a : svc.getAlgorithmData()) {
                rows.add(row("algorithm", a));
            }
            rows.add(row("unhandled", new ILayoutMetaData() {
                public String getId() { return "custom.metadata"; }
                public String getName() { return "Custom"; }
                public String getDescription() { return "none of the three"; }
                @Override public String toString() { return "CustomMetaData"; }
            }));
            rows.add(row("null", null));
            return rows;
        }

        static Map<String, Object> row(String kind, ILayoutMetaData data) {
            Map<String, Object> m = map();
            m.put(KIND, kind);
            m.put(ID, data == null ? null : data.getId());
            try {
                m.put(TEXT, JsonMetaDataConverter.toJson(data).toString());
            } catch (Exception e) {
                m.put(THROWS, thrown(e));
            }
            return m;
        }
    }
}
