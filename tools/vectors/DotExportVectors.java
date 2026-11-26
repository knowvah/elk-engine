// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission graphviz-dot D2/D6/D10) for the ElkGraph-to-DOT transform of
// org.eclipse.elk.alg.graphviz.dot: DotExporter.transform and DotExporter.transferLayout at the pinned ELK commit. This
// program only CALLS ELK, EMF and Xtext and records results; it embeds no ELK implementation, except LayoutMimic, a
// verbatim copy of org.eclipse.elk.alg.graphviz.layouter.LayoutDotExporter (the layouter bundle is not in the oracle; its
// GraphvizMetaDataProvider options are re-declared in Gv with the ids and defaults of Graphviz.melk; algorithm-specific
// defaults the layout engine would apply are not applied).
// Run: tools/vectors/dot-vectors.sh <outDir>  (java -cp ... DotExportVectors.java <outDir> <tools/vectors dir>)
// A MULTI-FILE program (issue #50, tools/vectors/java-program.sh): this entry file plus tools/vectors/DotExportVectors/
//   (DotExportVectorsDumps <- DotExportVectorsMimic <- DotExportVectorsProfiles <- DotExportVectors, one superclass chain,
//   so a helper's members are named without a qualifier), split only for the 500-line file limit.
// The ref carries no `oracle` stamp and this program does not read the pin (D7, issue #173): the landed fitness test
// test/architecture/elk-pin.fitness.test.ts pins the number of stamping recorders. The script still refuses to run unless
// the oracle was built from tools/oracle/ELK_COMMIT.
// Registry: LayoutMetaDataService.getInstance(new ClassLoader(null) { }) first (CoreOptions only, G3, ORACLE_REGISTRY=core).
// Inputs: dot-export-scenarios/<scenario>.elkt, loaded as tools/oracle/harness/ElkModelReader.readElkt does (a fresh load per
//   row, since transform mutates the graph); dot-export-scenarios/layout/<name>.dot (hand-written laid-out DOT) and
//   dot-graphviz-output/<scenario>.<alg>.dot (real Graphviz output, see its README) for transferLayout.
// Profiles (PROFILES below; each row repeats what it set): exporter = DotExporter | SplineExporter (a subclass whose
//   transform sets the protected USE_SPLINES to true first) | LayoutMimic; data = properties set on the
//   DotTransformationData before transform; graph = properties set on the root ElkNode, edges = on every edge of the
//   graph (recursively, containment order), both before transform. Values are given as String.valueOf text.
// FILE: 2-space top level, one compact JSON row per line, trailing newline:
//   { jdk, arch, registry: "core", xtextVersion, rowCounts: { export, transfer }, rows: [row...] }
// ROW export   { id: "export/<scenario>/<profile>", family, scenario, profile, exporter, data, graph, edges,
//                text, formatted, model, source } | { ..., throws, source }
//   text      = ISerializer.serialize(model, SaveOptions.newBuilder().noValidation()) with the model alone in a fresh
//               XtextResource "output.graphviz_dot" of the GraphvizDotStandaloneSetup injector: what
//               GraphvizLayoutProvider.writeDotGraph saves (it then writes one '\n', which is not part of text);
//   formatted = the same with format(); a failed serialization gives null and textThrows / formattedThrows.
//   model     = the target GraphvizModel as M (below); source = the source graph after transform as G (below);
//   throws    = { class (binary name), message } when transform threw; source is then the graph as transform left it.
// ROW transfer { id: "transfer/<scenario>/<profile>/<layout name>", family, scenario, profile, exporter, data, graph, edges,
//                layout, parseErrors, transferred, source } (+ throws)
//   The layouter's sequence: transform, then the layout text (file `layout`, relative to tools/vectors) is loaded into a
//   fresh XtextResource "input.graphviz_dot"; parseErrors = [{ line, message }] of resource.getErrors(). With errors (or no
//   parse result, or no graph) the layouter throws GraphvizException: transferred = false, transferLayout is not called and
//   source is the graph after transform. Otherwise getTargetGraphs().set(0, parsed), transferLayout, transferred = true,
//   source = the graph after it as G; throws = { class, message } when transferLayout threw (source as it left it).
//   Exception messages are getMessage() with any "@<hex>" identity hash replaced by "@<hash>" (JDK-worded messages,
//   NullPointerException and ClassCastException, are JDK-version text: compare the class).
// G = test/helpers/elkt-canon.ts canonGraph: GraphJsonVectors' canonical tree (node = { identifier, x, y, width, height,
//   properties, labels, ports, children, edges }, label without identifier, edges = containedEdges, refs { kind, id },
//   section incoming/outgoingSections sorted) with every `properties` list sorted by id; property text = String.valueOf.
//   Every double is Double.toString text.
// M = { eClass, <every feature of eClass.getEAllStructuralFeatures() in that order>: value }; value = eGet(feature):
//   a String or null, a Boolean, an enum literal's getName() (GraphType graph|digraph, EdgeOperator directed|undirected,
//   AttributeType graph|node|edge), a contained object as M or null, a containment list as [M].
// Map iteration (D10): DotExporter never iterates a hash map. GRAPH_ELEMS (HashBiMap) and createAttributeMap's HashMap are
//   only read with get(); a repeated attribute name in an edge statement keeps the last value (HashMap.put), see
//   transfer/flat-basic/edge-ids/flat-basic-quirks. Nothing here depends on identity hashes.
import com.google.inject.Injector;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.eclipse.elk.alg.graphviz.dot.GraphvizDotStandaloneSetup;
import org.eclipse.elk.alg.graphviz.dot.dot.*;
import org.eclipse.elk.alg.graphviz.dot.transform.*;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.*;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.IPropertyHolder;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.Enumerator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.xtext.resource.SaveOptions;
import org.eclipse.xtext.resource.XtextResource;
import org.eclipse.xtext.resource.XtextResourceSet;
import org.eclipse.xtext.serializer.ISerializer;

@SuppressWarnings("deprecation") // SaveOptions.Builder.noValidation is what GraphvizLayoutProvider calls
public class DotExportVectors extends DotExportVectorsProfiles {
    public static void main(String[] args) throws IOException {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        ElkGraphStandaloneSetup.doSetup();
        Injector injector = new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration();
        Path vectors = Path.of(args[1]);
        Recorder recorder = new Recorder(injector, vectors);
        checkCases(vectors);
        List<Map<String, Object>> export = new ArrayList<>(), transfer = new ArrayList<>();
        for (Map.Entry<String, List<String>> e : EXPORT_CASES.entrySet()) {
            for (String profile : e.getValue()) {
                export.add(recorder.export(e.getKey(), profile));
            }
        }
        for (Transfer t : TRANSFERS) {
            transfer.add(recorder.transfer(t));
        }
        write(Path.of(args[0], OUTPUT), export, transfer);
    }

    static void checkCases(Path vectors) throws IOException {
        Set<String> files = new TreeSet<>();
        try (Stream<Path> s = Files.list(vectors.resolve(SCENARIOS))) {
            s.map(p -> p.getFileName().toString()).filter(n -> n.endsWith(ELKT))
                    .forEach(n -> files.add(n.substring(0, n.length() - ELKT.length())));
        }
        if (!files.equals(new TreeSet<>(EXPORT_CASES.keySet()))) {
            throw new IllegalStateException("scenario files " + files + " differ from EXPORT_CASES " + EXPORT_CASES.keySet());
        }
        for (List<String> profiles : EXPORT_CASES.values()) {
            for (String p : profiles) {
                Objects.requireNonNull(PROFILES.get(p), "unknown profile " + p);
            }
        }
    }

    static void write(Path out, List<Map<String, Object>> export, List<Map<String, Object>> transfer) throws IOException {
        StringBuilder sb = new StringBuilder("{\n");
        sb.append("  \"jdk\": ");
        Json.write(sb, System.getProperty("java.version"));
        sb.append(",\n  \"arch\": ");
        Json.write(sb, System.getProperty("os.arch"));
        sb.append(",\n  \"registry\": \"core\",\n  \"xtextVersion\": ");
        Json.write(sb, xtextVersion());
        sb.append(",\n  \"rowCounts\": ");
        Json.write(sb, obj("export", export.size(), "transfer", transfer.size()));
        sb.append(",\n  \"rows\": [\n");
        List<Map<String, Object>> rows = new ArrayList<>(export);
        rows.addAll(transfer);
        Set<Object> ids = new HashSet<>();
        for (int i = 0; i < rows.size(); i++) {
            if (!ids.add(rows.get(i).get("id"))) {
                throw new IllegalStateException("duplicate row id " + rows.get(i).get("id"));
            }
            sb.append("    ");
            Json.write(sb, rows.get(i));
            sb.append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        Files.createDirectories(out.getParent());
        Files.writeString(out, sb.append("  ]\n}\n"), StandardCharsets.UTF_8);
    }

    static String xtextVersion() {
        String location = XtextResource.class.getProtectionDomain().getCodeSource().getLocation().toString();
        Matcher m = Pattern.compile("org\\.eclipse\\.xtext/(\\d+\\.\\d+\\.\\d+)").matcher(location);
        if (!m.find()) {
            throw new IllegalStateException("cannot read the Xtext version from " + location);
        }
        return m.group(1);
    }

    /** Builds the rows. */
    static final class Recorder {
        final Injector injector;
        final ISerializer serializer;
        final Path vectors;

        Recorder(Injector injector, Path vectors) {
            this.injector = injector;
            this.serializer = injector.getInstance(ISerializer.class);
            this.vectors = vectors;
        }

        /** Mirrors tools/oracle/harness/ElkModelReader.readElkt. */
        ElkNode load(String scenario) throws IOException {
            Path file = vectors.resolve(SCENARIOS).resolve(scenario + ELKT).toAbsolutePath();
            Resource resource = new ResourceSetImpl().getResource(URI.createFileURI(file.toString()), true);
            if (!resource.getErrors().isEmpty()) {
                throw new IllegalStateException(scenario + ": " + resource.getErrors().get(0).getMessage());
            }
            return (ElkNode) resource.getContents().get(0);
        }

        Map<String, Object> head(String family, String id, String scenario, String profileName, Profile p) {
            return obj("id", id, "family", family, "scenario", scenario, "profile", profileName, "exporter", p.exporter(),
                    "data", propList(p.data()), "graph", propList(p.graph()), "edges", propList(p.edges()));
        }

        static List<Object> propList(Map<IProperty<?>, Object> props) {
            List<Object> out = new ArrayList<>();
            props.forEach((k, v) -> out.add(obj("id", k.getId(), "value", String.valueOf(v))));
            return out;
        }

        DotTransformationData<ElkNode, GraphvizModel> prepare(ElkNode root, Profile p) {
            p.graph().forEach((k, v) -> set(root, k, v));
            for (ElkEdge edge : edgesOf(root, new ArrayList<>())) {
                p.edges().forEach((k, v) -> set(edge, k, v));
            }
            DotTransformationData<ElkNode, GraphvizModel> data = new DotTransformationData<>();
            data.setSourceGraph(root);
            p.data().forEach((k, v) -> set(data, k, v));
            return data;
        }

        @SuppressWarnings("unchecked")
        static void set(IPropertyHolder holder, IProperty<?> key, Object value) {
            holder.setProperty((IProperty<Object>) key, value);
        }

        static List<ElkEdge> edgesOf(ElkNode node, List<ElkEdge> out) {
            out.addAll(node.getContainedEdges());
            node.getChildren().forEach(c -> edgesOf(c, out));
            return out;
        }

        static DotExporter exporter(String kind) {
            return switch (kind) {
                case DOT -> new DotExporter();
                case SPLINE -> new SplineExporter();
                case MIMIC -> new LayoutMimic();
                default -> throw new IllegalArgumentException(kind);
            };
        }

        Map<String, Object> export(String scenario, String profileName) throws IOException {
            Profile p = PROFILES.get(profileName);
            Map<String, Object> row = head("export", "export/" + scenario + "/" + profileName, scenario, profileName, p);
            ElkNode root = load(scenario);
            DotTransformationData<ElkNode, GraphvizModel> data = prepare(root, p);
            try {
                exporter(p.exporter()).transform(data);
            } catch (RuntimeException e) {
                row.put("throws", thrown(e));
                row.put("source", Canon.node(root));
                return row;
            }
            GraphvizModel model = data.getTargetGraphs().get(0);
            serialized(row, "text", () -> serialize(model, SaveOptions.newBuilder().noValidation().getOptions()));
            serialized(row, "formatted", () -> serialize(model, SaveOptions.newBuilder().format().noValidation().getOptions()));
            row.put("model", ModelDump.dump(model));
            row.put("source", Canon.node(root));
            return row;
        }

        static void serialized(Map<String, Object> row, String key, Supplier<String> text) {
            try {
                row.put(key, text.get());
            } catch (RuntimeException e) {
                row.put(key, null);
                row.put(key + "Throws", thrown(e));
            }
        }

        /** The model alone in a fresh XtextResource, as GraphvizLayoutProvider.writeDotGraph has it. */
        String serialize(GraphvizModel model, SaveOptions options) {
            XtextResource resource = (XtextResource) injector.getInstance(XtextResourceSet.class)
                    .createResource(URI.createURI("output.graphviz_dot"));
            resource.getContents().add(model);
            try {
                return serializer.serialize(model, options);
            } finally {
                resource.getContents().clear();
            }
        }

        Map<String, Object> transfer(Transfer t) throws IOException {
            Profile p = PROFILES.get(t.profile());
            String name = Path.of(t.layout()).getFileName().toString().replaceFirst("\\.dot$", "");
            String id = "transfer/" + t.scenario() + "/" + t.profile() + "/" + name;
            Map<String, Object> row = head("transfer", id, t.scenario(), t.profile(), p);
            row.put("layout", t.layout());
            ElkNode root = load(t.scenario());
            DotTransformationData<ElkNode, GraphvizModel> data = prepare(root, p);
            DotExporter exporter = exporter(p.exporter());
            exporter.transform(data);
            GraphvizModel parsed = parseLayout(t.layout(), row);
            if (parsed == null) {
                row.put("transferred", false);
                row.put("source", Canon.node(root));
                return row;
            }
            data.getTargetGraphs().set(0, parsed);
            row.put("transferred", true);
            try {
                exporter.transferLayout(data);
            } catch (RuntimeException e) {
                row.put("throws", thrown(e));
            }
            row.put("source", Canon.node(root));
            return row;
        }

        /** GraphvizLayoutProvider.readDotGraph on the file: puts parseErrors; null where the layouter would throw. */
        GraphvizModel parseLayout(String layout, Map<String, Object> row) throws IOException {
            XtextResource resource = (XtextResource) injector.getInstance(XtextResourceSet.class)
                    .createResource(URI.createURI("input.graphviz_dot"));
            resource.load(new ByteArrayInputStream(Files.readAllBytes(vectors.resolve(layout))), null);
            List<Object> errors = new ArrayList<>();
            resource.getErrors().forEach(d -> errors.add(obj("line", d.getLine(), "message", d.getMessage())));
            row.put("parseErrors", errors);
            GraphvizModel parsed = (GraphvizModel) resource.getParseResult().getRootASTElement();
            boolean usable = errors.isEmpty() && parsed != null && !parsed.getGraphs().isEmpty();
            return usable ? parsed : null;
        }
    }
}
