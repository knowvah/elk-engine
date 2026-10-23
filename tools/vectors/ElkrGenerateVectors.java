// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13) for the ELK random graph generator (org.eclipse.elk.core.debug.grandom,
// .elkr files) at the pinned ELK commit: ConfigurationParser, GeneratorOptions.RandVal and RandomGraphGenerator, run in the
// JVM exactly as the oracle harness does (tools/oracle/harness GrandomGenerator + CaseRunner.export). This program only
// CALLS ELK and records results; it embeds no ELK implementation.
// Run: tools/vectors/elkr-vectors.sh <outDir>   (java -cp ... ElkrGenerateVectors.java <outDir> <tools/vectors dir>)
// Registry: LayoutMetaDataService.getInstance(new ClassLoader(null) { }) first (CoreOptions only), as the oracle's core mode.
// Inputs: <vectors dir>/elkr-generate-scenarios/*.elkr, sorted by file name (id = file name minus ".elkr"). A file named
//   "unseeded-*" is an unseeded scenario; every other file is seeded and EVERY configuration in it must hold a seed (hard
//   error otherwise). "corpus-<name>.elkr" are byte copies of test/corpus/generated/<name>.elkr.
// Output <outDir>/grandom-generate.json, 2-space indent for the top level, one compact JSON row per line, trailing newline
//   (non-ASCII and control characters as u-escapes):
//   { elkCommit, xtextVersion, rows: [ row, ... ] }   rows = scenario rows in file-name order, then the randval rows.
//   input = the .elkr file text (UTF-8, as read).
//   seeded row   { id, input, kind: "seeded", configs: [ { options: [ {key, value} ], graphs: [ string ] } ] }
//     one entry per configuration, in file order. Each configuration gets its own `new RandomGraphGenerator(null)` and its
//     graphs come from `generate(Configuration)` (new Random(seed); one ConfigurationParser.parse; max(1, samples) graphs
//     from that Random). options are recorded from a SEPARATE parse with a fresh Random(seed) (parse draws from the Random
//     only for the amounts of `ports` flows), i.e. the state right after parse, before any graph is generated (generation
//     mutates the options: makeGraph sets HIERARCHY_CHANCE and CROSS_HIERARCHY_EDGES). Each graph is the root exported with
//     CaseRunner.export's flags (omitLayout(false), omitZeroDimension(false), omitZeroPositions(false),
//     omitUnknownLayoutOptions(true), prettyPrint(true)), the unnamed root named "root"; WITHOUT the trailing "\n" that
//     CaseRunner appends.
//     options = every public static IProperty field of GeneratorOptions in declaration order (reflection order), key = the
//     Java FIELD name (e.g. "NUMBER_OF_NODES"), value = options.getProperty(field):
//       enum -> its name() as a string (GraphType, EdgeDetermination, FileFormat, PortConstraints);
//       boolean -> true/false; Integer -> Integer.toString; Float -> Float.toString; Double -> Double.toString (JSON numbers,
//       Java text such as 0.05 or 1.0E10); String -> JSON string; null -> null (EXACT_RELATIVE_HIER default);
//       RandVal -> { min, max, mean, stddv, exact, kind } with the stored private fields (numbers as Double.toString;
//       "exact" is added to the five named in the brief because RandVal.exact stores its value there) and
//       kind = "exact" when useExact, "minMax" when useMinMax, else "gaussian" (RandVal.allNil() has both flags false and
//       is indistinguishable from gaussian(0,0): it consumes one nextGaussian per draw and yields 0).
//   unseeded row { id, input, kind: "unseeded", invariants: [ { config, graph, rootChildren, nodesPerLevel, edges, ports,
//     nodeLabels, portLabels, edgeLabels } ] }  one entry per generated graph in file order (config = configuration index,
//     graph = sample index within it). nodesPerLevel[d-1] = number of nodes at depth d below the root (d = 1 are the root's
//     children, so rootChildren = nodesPerLevel[0]); edges/ports/labels are totals over the whole containment tree
//     (edges counted via getContainedEdges of every node incl. the root). Label TEXTS are never recorded and no graph is
//     exported. Every scenario is generated twice and the program aborts unless both invariant lists are equal.
//   randval row  { id, seed, kind: "exact"|"minMax"|"gaussian", params, draws: { val, intVal, floatVal } }
//     params = { exact } | { min, max } | { mean, stddv } (Double.toString). draws.val / intVal / floatVal = 20 draws each of
//     RandVal.val(r) / intVal(r) / floatVal(r) from a fresh `new Random(seed)` per method; val as Double.toString, intVal as
//     int, floatVal as Float.toString. Rows (id: kind, seed, params):
//       randval-exact-7.5 exact 1 {7.5}; randval-exact-2.5 exact 2 {2.5} (intVal tie rounds up); randval-exact-0.3 exact 3
//       {0.3}; randval-exact-neg exact 4 {-3} (clamped to 0); randval-minmax-2-9 minMax 42 {2,9}; randval-minmax-0-1 minMax 7
//       {0,1}; randval-minmax-neg minMax 3 {-5,5} (negative draws clamp to 0); randval-minmax-same minMax 5 {4,4};
//       randval-gaussian-10-3 gaussian 5 {10,3}; randval-gaussian-1-5 gaussian 11 {1,5} (clamping); randval-gaussian-0-0
//       gaussian 6 {0,0} (the allNil behaviour); randval-gaussian-100-0.5 gaussian 12 {100,0.5}.
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.stream.Stream;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.debug.grandom.GRandomStandaloneSetup;
import org.eclipse.elk.core.debug.grandom.gRandom.Configuration;
import org.eclipse.elk.core.debug.grandom.gRandom.RandGraph;
import org.eclipse.elk.core.debug.grandom.generators.ConfigurationParser;
import org.eclipse.elk.core.debug.grandom.generators.GeneratorOptions;
import org.eclipse.elk.core.debug.grandom.generators.GeneratorOptions.RandVal;
import org.eclipse.elk.core.debug.grandom.generators.RandomGraphGenerator;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.ElkPort;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

public class ElkrGenerateVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String XTEXT_VERSION = "2.36.0";
    private static final String SCENARIOS = "elkr-generate-scenarios";
    private static final String EXTENSION = ".elkr";
    private static final String UNSEEDED_PREFIX = "unseeded-";
    private static final String ROOT_ID = "root";
    private static final String OUT = "grandom-generate.json";
    private static final int DRAWS = 20;

    /** A JSON number written verbatim (Java Float/Double.toString text). */
    record Raw(String text) {
        @Override
        public String toString() {
            return text;
        }
    }

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        GRandomStandaloneSetup.doSetup();
        List<Object> rows = new ArrayList<>();
        List<Path> files;
        try (Stream<Path> s = Files.list(Path.of(args[1], SCENARIOS))) {
            files = s.filter(p -> p.getFileName().toString().endsWith(EXTENSION)).sorted().toList();
        }
        for (Path file : files) {
            String name = file.getFileName().toString();
            String id = name.substring(0, name.length() - EXTENSION.length());
            String text = Files.readString(file, StandardCharsets.UTF_8);
            long start = System.nanoTime();
            List<Configuration> configs = load(file);
            rows.add(id.startsWith(UNSEEDED_PREFIX) ? unseeded(id, text, configs) : seeded(id, text, configs));
            System.err.println("generate " + id + ": " + (System.nanoTime() - start) / 1_000_000 + " ms");
        }
        rows.addAll(randvalRows());
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUT), render(rows), StandardCharsets.UTF_8);
    }

    private static String render(List<Object> rows) {
        StringBuilder out = new StringBuilder("{\n");
        out.append("  \"elkCommit\": \"").append(ELK_COMMIT).append("\",\n");
        out.append("  \"xtextVersion\": \"").append(XTEXT_VERSION).append("\",\n");
        out.append("  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            out.append("    ");
            Json.write(out, rows.get(i));
            out.append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        out.append("  ]\n}\n");
        return out.toString();
    }

    private static List<Configuration> load(Path file) {
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        if (!resource.getErrors().isEmpty()) {
            throw new IllegalStateException(file + ": " + resource.getErrors().get(0).getMessage());
        }
        if (resource.getContents().isEmpty() || !(resource.getContents().get(0) instanceof RandGraph root)) {
            throw new IllegalStateException(file + ": no RandGraph root");
        }
        return new ArrayList<>(root.getConfigs());
    }

    // ---- seeded ----
    private static Map<String, Object> seeded(String id, String text, List<Configuration> configs) {
        List<Object> out = new ArrayList<>();
        for (Configuration config : configs) {
            if (config.getSeed() == null) {
                throw new IllegalStateException(id + ": seeded scenario with a configuration without seed");
            }
            GeneratorOptions opts = ConfigurationParser.parse(config, new Random(config.getSeed()));
            List<Object> graphs = new ArrayList<>();
            for (ElkNode root : new RandomGraphGenerator(null).generate(config)) {
                if (root.getIdentifier() == null) {
                    root.setIdentifier(ROOT_ID);
                }
                graphs.add(export(root));
            }
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("options", options(opts));
            c.put("graphs", graphs);
            out.add(c);
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("input", text);
        m.put("kind", "seeded");
        m.put("configs", out);
        return m;
    }

    // Same flags as tools/oracle/harness CaseRunner.export.
    private static String export(ElkNode graph) {
        return ElkGraphJson.forGraph(graph)
                .omitLayout(false)
                .omitZeroDimension(false)
                .omitZeroPositions(false)
                .omitUnknownLayoutOptions(true)
                .prettyPrint(true)
                .toJson();
    }

    private static List<Object> options(GeneratorOptions opts) {
        List<Object> list = new ArrayList<>();
        try {
            for (Field f : GeneratorOptions.class.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers()) && IProperty.class.isAssignableFrom(f.getType())) {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("key", f.getName());
                    m.put("value", value(opts.getProperty((IProperty<?>) f.get(null))));
                    list.add(m);
                }
            }
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
        return list;
    }

    private static Object value(Object v) throws ReflectiveOperationException {
        if (v instanceof Enum<?> e) {
            return e.name();
        } else if (v instanceof Float || v instanceof Double) {
            return new Raw(v.toString());
        } else if (v instanceof RandVal r) {
            return randValue(r);
        } else if (v == null || v instanceof Boolean || v instanceof Integer || v instanceof String) {
            return v;
        }
        throw new IllegalStateException("unhandled option value " + v.getClass());
    }

    private static Map<String, Object> randValue(RandVal r) throws ReflectiveOperationException {
        Map<String, Object> m = new LinkedHashMap<>();
        for (String name : List.of("min", "max", "mean", "stddv", "exact")) {
            m.put(name, new Raw(Double.toString(field(r, name))));
        }
        m.put("kind", kind(r));
        return m;
    }

    private static double field(RandVal r, String name) throws ReflectiveOperationException {
        Field f = RandVal.class.getDeclaredField(name);
        f.setAccessible(true);
        return f.getDouble(r);
    }

    private static boolean flag(RandVal r, String name) throws ReflectiveOperationException {
        Field f = RandVal.class.getDeclaredField(name);
        f.setAccessible(true);
        return f.getBoolean(r);
    }

    private static String kind(RandVal r) throws ReflectiveOperationException {
        return flag(r, "useExact") ? "exact" : flag(r, "useMinMax") ? "minMax" : "gaussian";
    }

    // ---- unseeded ----
    private static Map<String, Object> unseeded(String id, String text, List<Configuration> configs) {
        List<Object> first = invariants(configs);
        List<Object> second = invariants(configs);
        if (!first.equals(second)) {
            throw new IllegalStateException(id + ": invariants differ between two runs: " + first + " vs " + second);
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("input", text);
        m.put("kind", "unseeded");
        m.put("invariants", first);
        return m;
    }

    private static List<Object> invariants(List<Configuration> configs) {
        List<Object> out = new ArrayList<>();
        for (int c = 0; c < configs.size(); c++) {
            List<ElkNode> roots = new RandomGraphGenerator(null).generate(configs.get(c));
            for (int g = 0; g < roots.size(); g++) {
                out.add(invariant(c, g, roots.get(g)));
            }
        }
        return out;
    }

    /** Totals over the containment tree: edges, ports, node labels, port labels, edge labels. */
    private static final class Totals {
        int edges;
        int ports;
        int nodeLabels;
        int portLabels;
        int edgeLabels;

        void add(ElkNode n) {
            edges += n.getContainedEdges().size();
            for (ElkEdge e : n.getContainedEdges()) {
                edgeLabels += e.getLabels().size();
            }
            ports += n.getPorts().size();
            nodeLabels += n.getLabels().size();
            for (ElkPort p : n.getPorts()) {
                portLabels += p.getLabels().size();
            }
        }
    }

    private static Map<String, Object> invariant(int config, int graph, ElkNode root) {
        List<Integer> levels = new ArrayList<>();
        Totals totals = new Totals();
        totals.add(root);
        List<ElkNode> level = new ArrayList<>(root.getChildren());
        while (!level.isEmpty()) {
            levels.add(level.size());
            List<ElkNode> next = new ArrayList<>();
            for (ElkNode n : level) {
                totals.add(n);
                next.addAll(n.getChildren());
            }
            level = next;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("config", config);
        m.put("graph", graph);
        m.put("rootChildren", root.getChildren().size());
        m.put("nodesPerLevel", levels);
        m.put("edges", totals.edges);
        m.put("ports", totals.ports);
        m.put("nodeLabels", totals.nodeLabels);
        m.put("portLabels", totals.portLabels);
        m.put("edgeLabels", totals.edgeLabels);
        return m;
    }

    // ---- randval ----
    private static List<Object> randvalRows() {
        List<Object> rows = new ArrayList<>();
        rows.add(randval("randval-exact-7.5", 1, "exact", Map.of("exact", 7.5), RandVal.exact(7.5)));
        rows.add(randval("randval-exact-2.5", 2, "exact", Map.of("exact", 2.5), RandVal.exact(2.5)));
        rows.add(randval("randval-exact-0.3", 3, "exact", Map.of("exact", 0.3), RandVal.exact(0.3)));
        rows.add(randval("randval-exact-neg", 4, "exact", Map.of("exact", -3.0), RandVal.exact(-3)));
        rows.add(randval("randval-minmax-2-9", 42, "minMax", minMax(2, 9), RandVal.minMax(2, 9)));
        rows.add(randval("randval-minmax-0-1", 7, "minMax", minMax(0, 1), RandVal.minMax(0, 1)));
        rows.add(randval("randval-minmax-neg", 3, "minMax", minMax(-5, 5), RandVal.minMax(-5, 5)));
        rows.add(randval("randval-minmax-same", 5, "minMax", minMax(4, 4), RandVal.minMax(4, 4)));
        rows.add(randval("randval-gaussian-10-3", 5, "gaussian", gaussian(10, 3), RandVal.gaussian(10, 3)));
        rows.add(randval("randval-gaussian-1-5", 11, "gaussian", gaussian(1, 5), RandVal.gaussian(1, 5)));
        rows.add(randval("randval-gaussian-0-0", 6, "gaussian", gaussian(0, 0), RandVal.gaussian(0, 0)));
        rows.add(randval("randval-gaussian-100-0.5", 12, "gaussian", gaussian(100, 0.5), RandVal.gaussian(100, 0.5)));
        return rows;
    }

    private static Map<String, Object> minMax(double min, double max) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("min", min);
        m.put("max", max);
        return m;
    }

    private static Map<String, Object> gaussian(double mean, double stddv) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("mean", mean);
        m.put("stddv", stddv);
        return m;
    }

    private static Map<String, Object> randval(String id, long seed, String kind, Map<String, ?> params, RandVal rv) {
        Map<String, Object> p = new LinkedHashMap<>();
        for (Map.Entry<String, ?> e : params.entrySet()) {
            p.put(e.getKey(), new Raw(e.getValue().toString()));
        }
        Map<String, Object> draws = new LinkedHashMap<>();
        draws.put("val", draws(seed, r -> new Raw(Double.toString(rv.val(r)))));
        draws.put("intVal", draws(seed, rv::intVal));
        draws.put("floatVal", draws(seed, r -> new Raw(Float.toString(rv.floatVal(r)))));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("seed", seed);
        m.put("kind", kind);
        m.put("params", p);
        m.put("draws", draws);
        return m;
    }

    /** DRAWS draws of one RandVal method from a fresh Random(seed). */
    private static List<Object> draws(long seed, java.util.function.Function<Random, Object> draw) {
        Random r = new Random(seed);
        List<Object> out = new ArrayList<>();
        for (int i = 0; i < DRAWS; i++) {
            out.add(draw.apply(r));
        }
        return out;
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
