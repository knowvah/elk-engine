// SPDX-License-Identifier: EPL-2.0
// Records how the JUnit test framework sizes labels (mission text-sizing-seam, decisions TX3, TX4, TX6, TX7). It sizes
// through the real org.eclipse.elk.alg.test TestConfiguration.apply (oracle patch 0003), never through a copy of it; the
// measurer is the one the system property org.eclipse.elk.alg.test.textMeasurer selects (the script passes it).
// Run: tools/vectors/label-sizing-vectors.sh (it builds the classpath and passes the arguments below).
//   java -cp <cp> -Dorg.eclipse.elk.alg.test.textMeasurer=fixed LabelSizingVectors.java vendored <repoRoot> <outDir>
//   java -cp <cp> -Dorg.eclipse.elk.alg.test.textMeasurer=fixed LabelSizingVectors.java corpus <repoRoot> <outDir> <modelsDir>
//   java -cp <cp>                                               LabelSizingVectors.java awt <repoRoot> <outDir>
// vendored -> <outDir>/label-sizing.json
//   { jdk, os, measurer, texts: [{ text, size: [w, h] }], models: [{ path, labels: [LABEL], layout | throws }] }
//   texts: every line of tools/vectors/label-sizing-texts.txt through TextMeasurer.fromSystemProperty().measure. The file
//     is UTF-8, one text per line; the escapes \n (line feed) and \\ (backslash) are the only ones, and no other backslash
//     sequence is allowed.
//   models: every .elkt under test/golden/inputs/labels/ and test/corpus/elkt-curated/, by sorted repo-relative path, that
//     parses to a graph with at least one ElkLabel. A model whose bytes repeat an earlier one (SHA-256) is skipped. The
//     graph is sized by TestConfiguration.fromTestClass(new TestClass(NoDefaults.class)).apply(new NoDefaults(), graph),
//     where NoDefaults has no @DefaultConfiguration (every default stays off, only ensureSensibleLabelSize acts), and is
//     then laid out by RecursiveGraphLayoutEngine with every in-scope algorithm registered (as the golden harness does).
//     layout = the ElkGraphJson export after layout (omitLayout false, omitZeroDimension false, omitZeroPositions false,
//     omitUnknownLayoutOptions true, compact), exportSeed 1. A layout that throws records
//     throws = "<class name>: <message>" instead.
// LABEL = { key, text, size: [w, h], preset } in eAllContents order of the root (the order ensureSensibleLabelSize visits).
//   size prints as Double.toString after apply. preset is true when the label already had a nonzero size or an empty text
//   before apply (its size is recorded as it was).
// LABEL KEY (a TypeScript test derives the same key from the same graph): key = <parentKey> "#" <label index>.
//   label index = the label's index in its parent's getLabels().
//   parentKey of a label whose parent is another label = the key of that parent label (a label of a label: "n1#0#0").
//   parentKey of a label on a node, port or edge = the element path of that element.
//   element path = "" for the root node (so a label of the root has the key "#0"); otherwise the path of its container
//   (the parent node; for an edge its containing node), then "/" (omitted when that path is empty), then the element's
//   segment. Segment = the element's identifier (getIdentifier(), JSON id or .elkt identifier) when it is not null and
//   not empty, else "@" followed by the element's index in its containment list (getChildren(), getPorts() or
//   getContainedEdges()). Examples: "n1/p2#0" (a label of port p2 of node n1), "n1/@0#1", "n1#0#0".
//   Identifiers are not escaped, so a model that reuses an identifier yields repeated keys; this recorder does not hide them.
// corpus -> <outDir>/label-sizing-corpus.json
//   { jdk, os, measurer, models: [{ id, source, labels: [LABEL] }], failures: [{ id, error }] }
//   every census model (<repoRoot>/test/corpus/census.json) with labels > 0 and parse "ok", read from
//   <modelsDir>/<id>.<source> (source = the census field: elkt or json); sizes only, no layout.
// awt -> <outDir>/awt-remeasure.json, the shape of layered-label-metrics.json { jdk, font, sizes: { "<text>": [w, h] } }
//   over every line of tools/vectors/layered-label-metrics-texts.txt (raw, no escapes), with the property unset (AWT).
// Numbers print as Double.toString; no timestamps and no absolute paths, so the output is deterministic.
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HexFormat;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Stream;
import org.eclipse.elk.alg.disco.options.DisCoMetaDataProvider;
import org.eclipse.elk.alg.force.options.ForceMetaDataProvider;
import org.eclipse.elk.alg.force.options.StressMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.mrtree.options.MrTreeMetaDataProvider;
import org.eclipse.elk.alg.radial.options.RadialMetaDataProvider;
import org.eclipse.elk.alg.rectpacking.options.RectPackingMetaDataProvider;
import org.eclipse.elk.alg.spore.options.SporeMetaDataProvider;
import org.eclipse.elk.alg.test.framework.config.TestConfiguration;
import org.eclipse.elk.alg.test.framework.config.TextMeasurer;
import org.eclipse.elk.alg.topdownpacking.options.TopdownpackingMetaDataProvider;
import org.eclipse.elk.alg.vertiflex.options.VertiFlexMetaDataProvider;
import org.eclipse.elk.alg.common.compaction.options.PolyominoOptions;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.ILayoutMetaDataProvider;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.junit.runners.model.TestClass;

public class LabelSizingVectors {
    /** Empty test class: no @DefaultConfiguration, so every default of TestConfiguration stays off. */
    public static class NoDefaults { }

    /** One label after sizing. */
    private record LabelRow(String key, String text, double width, double height, boolean preset) { }

    private static final String MODE_VENDORED = "vendored", MODE_CORPUS = "corpus", MODE_AWT = "awt";
    private static final String MEASURER_FIXED = "fixed", MEASURER_AWT = "awt";
    private static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed", SEED = "1";
    private static final String SOURCE_ELKT = "elkt", SOURCE_JSON = "json";
    private static final String TEXTS_FILE = "tools/vectors/label-sizing-texts.txt";
    private static final String METRICS_TEXTS_FILE = "tools/vectors/layered-label-metrics-texts.txt";
    private static final String CENSUS_FILE = "test/corpus/census.json";
    private static final List<String> VENDORED_DIRS = List.of("test/corpus/elkt-curated/", "test/golden/inputs/labels/");
    private static final String FONT_JSON = "{ \"name\": \"SansSerif\", \"style\": \"plain\", \"size\": 10 }";
    private static final String KEY_SEPARATOR = "#", PATH_SEPARATOR = "/", NO_ID_PREFIX = "@";
    private static final Gson GSON = new GsonBuilder().disableHtmlEscaping().create();
    private static boolean elktReady;

    public static void main(final String[] args) throws Throwable {
        if (args.length < 3) {
            throw new IllegalArgumentException("usage: LabelSizingVectors <vendored|corpus|awt> <repoRoot> <outDir> [modelsDir]");
        }
        Path root = Path.of(args[1]);
        Path out = Path.of(args[2]);
        Files.createDirectories(out);
        switch (args[0]) {
            case MODE_VENDORED -> requireMeasurer(MEASURER_FIXED, () -> vendored(root, out));
            case MODE_CORPUS -> requireMeasurer(MEASURER_FIXED, () -> corpus(root, out, Path.of(args[3])));
            case MODE_AWT -> requireMeasurer(null, () -> remeasureAwt(root, out));
            default -> throw new IllegalArgumentException("unknown mode " + args[0]);
        }
    }

    private interface Body {
        void run() throws Throwable;
    }

    private static void requireMeasurer(final String expected, final Body body) throws Throwable {
        String actual = System.getProperty(TextMeasurer.PROPERTY);
        if (expected == null ? actual != null : !expected.equals(actual)) {
            throw new IllegalStateException(TextMeasurer.PROPERTY + " must be " + (expected == null ? "unset" : expected) + ", is " + actual);
        }
        body.run();
    }

    // ---- shared helpers

    private static String quote(final String text) {
        return GSON.toJson(text);
    }

    private static String header() {
        String measurer = System.getProperty(TextMeasurer.PROPERTY, MEASURER_AWT);
        return "{\n  \"jdk\": " + quote(System.getProperty("java.version")) + ",\n  \"os\": "
                + quote(System.getProperty("os.name") + " " + System.getProperty("os.arch")) + ",\n  \"measurer\": "
                + quote(measurer) + ",\n";
    }

    private static String sizeJson(final double width, final double height) {
        return "[" + width + ", " + height + "]";
    }

    private static void write(final Path file, final String content) throws IOException {
        Files.writeString(file, content, StandardCharsets.UTF_8);
    }

    private static void registerAlgorithms() {
        LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new ILayoutMetaDataProvider[] {
            new CoreOptions(), new PolyominoOptions(), new DisCoMetaDataProvider(), new ForceMetaDataProvider(),
            new LayeredMetaDataProvider(), new MrTreeMetaDataProvider(), new RadialMetaDataProvider(),
            new RectPackingMetaDataProvider(), new SporeMetaDataProvider(), new StressMetaDataProvider(),
            new TopdownpackingMetaDataProvider(), new VertiFlexMetaDataProvider() });
    }

    // ---- loading

    private static ElkNode load(final Path file, final String source) throws IOException {
        if (SOURCE_JSON.equals(source)) {
            return ElkGraphJson.forGraph(Files.readString(file, StandardCharsets.UTF_8)).toElk();
        }
        if (!SOURCE_ELKT.equals(source)) {
            throw new IOException("unsupported source " + source);
        }
        if (!elktReady) {
            ElkGraphStandaloneSetup.doSetup();
            elktReady = true;
        }
        Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toAbsolutePath().toString()), true);
        if (!resource.getErrors().isEmpty()) {
            throw new IOException(resource.getErrors().get(0).getMessage());
        }
        if (resource.getContents().isEmpty() || !(resource.getContents().get(0) instanceof ElkNode node)) {
            throw new IOException("no ElkNode root");
        }
        return node;
    }

    // ---- sizing and keys

    private static List<ElkLabel> labelsOf(final ElkNode graph) {
        List<ElkLabel> labels = new ArrayList<>();
        graph.eAllContents().forEachRemaining(obj -> {
            if (obj instanceof ElkLabel label) {
                labels.add(label);
            }
        });
        return labels;
    }

    private static boolean isPreset(final ElkLabel label) {
        boolean emptyText = label.getText() == null || label.getText().isEmpty();
        return label.getWidth() != 0 || label.getHeight() != 0 || emptyText;
    }

    private static int indexOf(final EObject element) {
        EObject container = element.eContainer();
        return ((List<?>) container.eGet(element.eContainmentFeature())).indexOf(element);
    }

    private static String segment(final EObject element) {
        String id = ((ElkGraphElement) element).getIdentifier();
        return id != null && !id.isEmpty() ? id : NO_ID_PREFIX + indexOf(element);
    }

    private static String elementPath(final EObject element) {
        EObject container = element.eContainer();
        if (container == null) {
            return "";
        }
        String parent = elementPath(container);
        return (parent.isEmpty() ? "" : parent + PATH_SEPARATOR) + segment(element);
    }

    private static String labelKey(final ElkLabel label) {
        EObject parent = label.eContainer();
        String base = parent instanceof ElkLabel parentLabel ? labelKey(parentLabel) : elementPath(parent);
        return base + KEY_SEPARATOR + indexOf(label);
    }

    /** Sizes the graph through the real TestConfiguration.apply and returns every label's row. */
    private static List<LabelRow> sizeLabels(final ElkNode graph) throws Throwable {
        List<ElkLabel> labels = labelsOf(graph);
        List<Boolean> preset = new ArrayList<>();
        for (ElkLabel label : labels) {
            preset.add(isPreset(label));
        }
        TestConfiguration.fromTestClass(new TestClass(NoDefaults.class)).apply(new NoDefaults(), graph);
        List<LabelRow> rows = new ArrayList<>();
        for (int i = 0; i < labels.size(); i++) {
            ElkLabel label = labels.get(i);
            rows.add(new LabelRow(labelKey(label), label.getText(), label.getWidth(), label.getHeight(), preset.get(i)));
        }
        return rows;
    }

    private static String labelsJson(final List<LabelRow> rows, final String indent) {
        List<String> parts = new ArrayList<>();
        for (LabelRow row : rows) {
            parts.add(indent + "  { \"key\": " + quote(row.key()) + ", \"text\": " + quote(row.text()) + ", \"size\": "
                    + sizeJson(row.width(), row.height()) + ", \"preset\": " + row.preset() + " }");
        }
        return "[" + (parts.isEmpty() ? "" : "\n" + String.join(",\n", parts) + "\n" + indent) + "]";
    }

    // ---- vendored mode

    private static String layoutMember(final ElkNode graph) {
        try {
            new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
            return "\"layout\": " + ElkGraphJson.forGraph(graph).omitLayout(false).omitZeroDimension(false)
                    .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false).toJson();
        } catch (Exception | StackOverflowError e) {
            return "\"throws\": " + quote(e.getClass().getName() + ": " + e.getMessage());
        }
    }

    private static List<String> vendoredFiles(final Path root) throws IOException {
        List<String> files = new ArrayList<>();
        for (String dir : VENDORED_DIRS) {
            try (Stream<Path> walk = Files.walk(root.resolve(dir))) {
                walk.filter(Files::isRegularFile).filter(p -> p.toString().endsWith("." + SOURCE_ELKT))
                        .forEach(p -> files.add(root.relativize(p).toString().replace('\\', '/')));
            }
        }
        Collections.sort(files);
        return files;
    }

    private static String sha256(final Path file) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file)));
    }

    private static String unescape(final String line) {
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c != '\\') {
                text.append(c);
                continue;
            }
            char next = i + 1 < line.length() ? line.charAt(++i) : '?';
            if (next != 'n' && next != '\\') {
                throw new IllegalArgumentException("bad escape in text line: " + line);
            }
            text.append(next == 'n' ? '\n' : '\\');
        }
        return text.toString();
    }

    private static String textsJson(final Path file) throws IOException {
        TextMeasurer measurer = TextMeasurer.fromSystemProperty();
        List<String> rows = new ArrayList<>();
        for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            String text = unescape(line);
            KVector size = measurer.measure(text);
            rows.add("    { \"text\": " + quote(text) + ", \"size\": " + sizeJson(size.x, size.y) + " }");
        }
        return "  \"texts\": [\n" + String.join(",\n", rows) + "\n  ],\n";
    }

    /** Dedupe state and counts of one vendored run. */
    private static final class Tally {
        final Set<String> seen = new HashSet<>();
        final Map<String, Integer> labelBearing = new TreeMap<>();
        int duplicates;
        int unparsable;
    }

    private static String vendoredModel(final Path root, final String rel, final Tally tally) throws Throwable {
        ElkNode graph;
        try {
            graph = load(root.resolve(rel), SOURCE_ELKT);
        } catch (IOException | RuntimeException e) {
            tally.unparsable++;
            System.err.println("skipped (does not load): " + rel + ": " + e.getMessage());
            return null;
        }
        if (labelsOf(graph).isEmpty()) {
            return null;
        }
        tally.labelBearing.merge(VENDORED_DIRS.stream().filter(rel::startsWith).findFirst().orElseThrow(), 1, Integer::sum);
        if (!tally.seen.add(sha256(root.resolve(rel)))) {
            tally.duplicates++;
            return null;
        }
        List<LabelRow> rows = sizeLabels(graph);
        return "    { \"path\": " + quote(rel) + ",\n      \"labels\": " + labelsJson(rows, "      ") + ",\n      "
                + layoutMember(graph) + " }";
    }

    private static void vendored(final Path root, final Path out) throws Throwable {
        System.setProperty(SEED_PROPERTY, SEED);
        registerAlgorithms();
        Tally tally = new Tally();
        List<String> models = new ArrayList<>();
        for (String rel : vendoredFiles(root)) {
            String model = vendoredModel(root, rel, tally);
            if (model != null) {
                models.add(model);
            }
        }
        write(out.resolve("label-sizing.json"), header() + textsJson(root.resolve(TEXTS_FILE))
                + "  \"models\": [\n" + String.join(",\n", models) + "\n  ]\n}\n");
        System.out.println("vendored: label-bearing " + tally.labelBearing + ", duplicates " + tally.duplicates
                + ", unparsable " + tally.unparsable + ", recorded " + models.size());
    }

    // ---- corpus mode

    private static String corpusModel(final Path modelsDir, final JsonObject census, final List<String> failures,
            final int[] labelCount) {
        String id = census.get("id").getAsString();
        String source = census.get("source").getAsString();
        try {
            ElkNode graph = load(modelsDir.resolve(id + "." + source), source);
            List<LabelRow> rows = sizeLabels(graph);
            labelCount[0] += rows.size();
            return "    { \"id\": " + quote(id) + ", \"source\": " + quote(source) + ", \"labels\": " + labelsJson(rows, "      ")
                    + " }";
        } catch (Throwable e) {
            failures.add("    { \"id\": " + quote(id) + ", \"error\": " + quote(e.getClass().getName() + ": " + e.getMessage()) + " }");
            return null;
        }
    }

    private static boolean labelBearingAndParsed(final JsonObject model) {
        return model.get("labels").getAsInt() > 0 && "ok".equals(model.get("parse").getAsString());
    }

    private static void corpus(final Path root, final Path out, final Path modelsDir) throws IOException {
        registerAlgorithms();
        JsonElement census = JsonParser.parseString(Files.readString(root.resolve(CENSUS_FILE), StandardCharsets.UTF_8));
        List<String> models = new ArrayList<>(), failures = new ArrayList<>();
        Map<String, Integer> perSource = new TreeMap<>();
        int[] labels = {0};
        for (JsonElement element : census.getAsJsonObject().getAsJsonArray("models")) {
            JsonObject model = element.getAsJsonObject();
            if (!labelBearingAndParsed(model)) {
                continue;
            }
            String json = corpusModel(modelsDir, model, failures, labels);
            if (json != null) {
                models.add(json);
                perSource.merge(model.get("source").getAsString(), 1, Integer::sum);
            }
        }
        write(out.resolve("label-sizing-corpus.json"), header() + "  \"models\": [\n" + String.join(",\n", models)
                + "\n  ],\n  \"failures\": [" + (failures.isEmpty() ? "" : "\n" + String.join(",\n", failures) + "\n  ") + "]\n}\n");
        System.out.println("corpus: models " + models.size() + " " + perSource + ", failures " + failures.size() + ", label rows " + labels[0]);
        failures.forEach(System.out::println);
    }

    // ---- awt mode

    private static void remeasureAwt(final Path root, final Path out) throws IOException {
        TextMeasurer measurer = TextMeasurer.fromSystemProperty();
        List<String> rows = new ArrayList<>();
        for (String text : Files.readAllLines(root.resolve(METRICS_TEXTS_FILE), StandardCharsets.UTF_8)) {
            KVector size = measurer.measure(text);
            rows.add("    " + quote(text) + ": " + sizeJson(size.x, size.y));
        }
        write(out.resolve("awt-remeasure.json"), "{\n  \"jdk\": " + quote(System.getProperty("java.version"))
                + ",\n  \"font\": " + FONT_JSON + ",\n  \"sizes\": {\n" + String.join(",\n", rows) + "\n  }\n}\n");
        System.out.println("awt: re-measured " + rows.size() + " texts");
    }
}
