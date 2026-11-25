// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission graphviz-dot D6/D10) for the DOT-to-ElkGraph transform of
// org.eclipse.elk.alg.graphviz.dot: DotImporter.transform and DotImporter.transferLayout at the pinned ELK commit. This
// program only CALLS ELK, EMF and Xtext and records results; it embeds no ELK implementation.
// Run: tools/vectors/dot-vectors.sh <outDir>  (java -cp ... DotImportVectors.java <outDir> <tools/vectors dir>)
// A MULTI-FILE program (issue #50, tools/vectors/java-program.sh): this entry file plus tools/vectors/DotImportVectors/
//   (DotImportVectorsDumps <- DotImportVectors, a superclass chain), split only for the 500-line file limit.
// The ref carries no `oracle` stamp and this program does not read the pin (D7, issue #173): the landed fitness test
// test/architecture/elk-pin.fitness.test.ts pins the number of stamping recorders. The script still refuses to run unless
// the oracle was built from tools/oracle/ELK_COMMIT.
// Registry: LayoutMetaDataService.getInstance(new ClassLoader(null) { }) first (CoreOptions only, G3).
// Inputs: dot-import-scenarios/<name>.dot, sorted by file name. Each is loaded as GraphvizLayoutProvider.readDotGraph loads
//   Graphviz output: XtextResource "input.graphviz_dot" of the GraphvizDotStandaloneSetup injector, resource.load(bytes,
//   null). transform runs on the parse result whatever the errors (Xtext's recovered model); no parse result, no rows
//   past parseErrors.
// FILE: 2-space top level, one compact JSON row per line, trailing newline:
//   { jdk, arch, registry: "core", xtextVersion, rowCounts: { import }, rows: [row...] }
// ROW { id: "import/<name>", input: "dot-import-scenarios/<name>.dot", parseErrors: [{ line, message }], parsed: bool,
//       graphs: [GRAPH], messages: [string], layout: [GRAPH], afterTransfer: { text, formatted, model } } (+ throws, the
//       transform's exception { class (binary name), message }, or transferThrows, transferLayout's; textThrows /
//       formattedThrows replace a failed serialization, text / formatted then null)
//   graphs   = every target ElkNode of DotImporter.transform (getTargetGraphs() order), right after transform;
//   messages = DotTransformationData.getMessages() after transform, in order;
//   layout   = the target graphs after the deterministic fake layout below, before transferLayout;
//   afterTransfer: after transferLayout, text / formatted = ISerializer.serialize(EcoreUtil.copy(sourceModel), options)
//     with the copy alone in a fresh XtextResource "output.graphviz_dot" (the D2 oracle contract: a semantic
//     serialization, no node model of the parse), options = SaveOptions.newBuilder().noValidation() / .format()
//     .noValidation(); model = the transferred source model itself as M. Exception messages: as in DotExportVectors.
// GRAPH = { graph: G, edges: [EDGE] }. G = test/helpers/elkt-canon.ts canonGraph of the target root (see
//   DotExportVectors.java; property lists sorted by id). DotImporter creates its edges with ElkGraphUtil.createEdge(null):
//   no edge is contained in a node, so G's `edges` lists are empty and the edges are listed apart:
//   EDGE = { path: "edges[<i>]", sources: [path], targets: [path], containingNode: path | null, properties, labels,
//            sections: [{ identifier, startX, startY, endX, endY, bendPoints: [{x, y}], properties }] } for every edge of ElkGraphUtil.allOutgoingEdges(n) of every node n in pre-order (the root, then
//   children recursively), deduplicated by identity; labels / sections / properties as in G. path = containment path from
//   the root, "" for the root, segments feature[index] joined by "/" ("children[1]/ports[0]").
//   Property text (G and EDGE): String.valueOf(value), except an EObject value (dotTransformer.statement,
//   dotTransformer.graph): "<EClass name>@<path in its GraphvizModel>" ("NodeStatement@graphs[0]/statements[3]",
//   "Graph@graphs[1]"), or "<EClass name>@detached" when it is not inside a GraphvizModel.
// M = DotExportVectors' model dump: { eClass, <eAllStructuralFeatures in order>: value }, enum literals by getName().
// Fake layout (deterministic; the TS side applies the same before its transferLayout): one counter k = 0, 1, 2, ... over
//   the target graphs in order; per graph, every node in pre-order (the root first): setLocation(10k + 0.5, 5k + 0.25),
//   setDimensions(20 + k, 10 + 0.5k), k++; then every EDGE in order: when k is even, a section from
//   ElkGraphUtil.createEdgeSection(edge) with setStartLocation(k, k + 1), setEndLocation(k + 2.5, k + 3) and one bend
//   point (k + 1.5, k + 0.75) (odd k: no section), k++; then each of the edge's labels: setLocation(k + 0.125, k + 0.5),
//   setDimensions(8, 4), k++. Ports and node labels are left as transform made them (transferLayout reads neither).
// Map iteration (D10): DotImporter never iterates a hash map. NODE_ID_MAP (HashMap<String, ElkNode>) and PORT_ID_MAP
//   (HashMap<Pair<ElkNode, String>, ElkPort>) are only read with get() and written with put(); element order follows the
//   statement order (rows import/many-ids, import/subgraphs). copyProperties iterates a MapPropertyHolder's HashMap, which
//   only fixes the insertion order of the target's property EMap; G sorts property lists, so no recorded value depends on
//   it.
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;
import java.util.stream.Stream;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotStandaloneSetup;
import org.eclipse.elk.alg.graphviz.dot.dot.GraphvizModel;
import org.eclipse.elk.alg.graphviz.dot.transform.DotImporter;
import org.eclipse.elk.alg.graphviz.dot.transform.DotTransformationData;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.util.ElkGraphUtil;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;

@SuppressWarnings("deprecation") // SaveOptions.Builder.noValidation is what GraphvizLayoutProvider calls
public class DotImportVectors extends DotImportVectorsDumps {
    static final String OUTPUT = "graphviz-dot-import.json", SCENARIOS = "dot-import-scenarios", DOT = ".dot";

    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        Injector injector = new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration();
        Recorder recorder = new Recorder(injector);
        List<Map<String, Object>> rows = new ArrayList<>();
        for (Path file : scenarioFiles(Path.of(args[1], SCENARIOS))) {
            rows.add(recorder.record(file));
        }
        write(Path.of(args[0], OUTPUT), rows);
    }

    static List<Path> scenarioFiles(Path dir) throws IOException {
        try (Stream<Path> s = Files.list(dir)) {
            return s.filter(p -> p.getFileName().toString().endsWith(DOT)).sorted().toList();
        }
    }

    static void write(Path out, List<Map<String, Object>> rows) throws IOException {
        StringBuilder sb = new StringBuilder("{\n");
        sb.append("  \"jdk\": ");
        Json.write(sb, System.getProperty("java.version"));
        sb.append(",\n  \"arch\": ");
        Json.write(sb, System.getProperty("os.arch"));
        sb.append(",\n  \"registry\": \"core\",\n  \"xtextVersion\": ");
        Json.write(sb, xtextVersion());
        sb.append(",\n  \"rowCounts\": ");
        Json.write(sb, obj("import", rows.size()));
        sb.append(",\n  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            sb.append("    ");
            Json.write(sb, rows.get(i));
            sb.append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        Files.createDirectories(out.getParent());
        Files.writeString(out, sb.append("  ]\n}\n"), StandardCharsets.UTF_8);
    }

    /** Builds one row per scenario file. */
    static final class Recorder {
        final Injector injector;
        final ISerializer serializer;

        Recorder(Injector injector) {
            this.injector = injector;
            this.serializer = injector.getInstance(ISerializer.class);
        }

        XtextResource resource(String uri) {
            return (XtextResource) injector.getInstance(XtextResourceSet.class).createResource(URI.createURI(uri));
        }

        Map<String, Object> record(Path file) throws IOException {
            String name = file.getFileName().toString();
            Map<String, Object> row = obj("id", "import/" + name.substring(0, name.length() - DOT.length()),
                    "input", SCENARIOS + "/" + name);
            XtextResource resource = resource("input.graphviz_dot");
            resource.load(new ByteArrayInputStream(Files.readAllBytes(file)), null);
            List<Object> errors = new ArrayList<>();
            resource.getErrors().forEach(d -> errors.add(obj("line", d.getLine(), "message", d.getMessage())));
            row.put("parseErrors", errors);
            GraphvizModel model = (GraphvizModel) resource.getParseResult().getRootASTElement();
            row.put("parsed", model != null);
            if (model != null) {
                transformAndTransfer(model, row);
            }
            return row;
        }

        void transformAndTransfer(GraphvizModel model, Map<String, Object> row) {
            DotTransformationData<GraphvizModel, ElkNode> data = new DotTransformationData<>();
            data.setSourceGraph(model);
            DotImporter importer = new DotImporter();
            try {
                importer.transform(data);
            } catch (RuntimeException e) {
                row.put("throws", thrown(e));
            }
            row.put("graphs", graphs(data.getTargetGraphs()));
            List<Object> messages = new ArrayList<>();
            data.getMessages().forEach(messages::add);
            row.put("messages", messages);
            if (row.containsKey("throws")) {
                return;
            }
            fakeLayout(data.getTargetGraphs());
            row.put("layout", graphs(data.getTargetGraphs()));
            Map<String, Object> after = new LinkedHashMap<>();
            try {
                importer.transferLayout(data);
            } catch (RuntimeException e) {
                row.put("transferThrows", thrown(e));
            }
            serialized(after, "text", () -> serialize(model, SaveOptions.newBuilder().noValidation().getOptions()));
            serialized(after, "formatted",
                    () -> serialize(model, SaveOptions.newBuilder().format().noValidation().getOptions()));
            after.put("model", ModelDump.dump(model));
            row.put("afterTransfer", after);
        }

        static List<Object> graphs(List<ElkNode> roots) {
            List<Object> out = new ArrayList<>();
            for (ElkNode root : roots) {
                Tree tree = new Tree(root);
                out.add(obj("graph", Canon.node(root), "edges", tree.edgeDumps()));
            }
            return out;
        }

        static void serialized(Map<String, Object> row, String key, Supplier<String> text) {
            try {
                row.put(key, text.get());
            } catch (RuntimeException e) {
                row.put(key, null);
                row.put(key + "Throws", thrown(e));
            }
        }

        String serialize(GraphvizModel model, SaveOptions options) {
            GraphvizModel copy = EcoreUtil.copy(model);
            resource("output.graphviz_dot").getContents().add(copy);
            return serializer.serialize(copy, options);
        }

        /** The fake layout of the header, one counter over all target graphs. */
        static void fakeLayout(List<ElkNode> roots) {
            int k = 0;
            for (ElkNode root : roots) {
                Tree tree = new Tree(root);
                for (ElkNode node : tree.nodes) {
                    node.setLocation(10.0 * k + 0.5, 5.0 * k + 0.25);
                    node.setDimensions(20.0 + k, 10.0 + 0.5 * k);
                    k++;
                }
                for (ElkEdge edge : tree.edges) {
                    if (k % 2 == 0) {
                        ElkEdgeSection section = ElkGraphUtil.createEdgeSection(edge);
                        section.setStartLocation(k, k + 1.0);
                        section.setEndLocation(k + 2.5, k + 3.0);
                        ElkGraphUtil.createBendPoint(section, k + 1.5, k + 0.75);
                    }
                    k++;
                    for (ElkLabel label : edge.getLabels()) {
                        label.setLocation(k + 0.125, k + 0.5);
                        label.setDimensions(8, 4);
                        k++;
                    }
                }
            }
        }
    }
}
