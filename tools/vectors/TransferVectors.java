// SPDX-License-Identifier: EPL-2.0
// Records JVM reference replays for JsonImporter.transferLayout (AD-13, J6): the layout algorithms are not
// ported yet, so the JVM imports each scenario, lays it out and transfers the layout back; this file records
// (a) the post-layout geometry of every element and (b) the JSON text transferLayout wrote. A TS test applies
// (a) to its own imported graph, calls transferLayout and must reproduce (b) byte for byte.
// Exercised: ELK org.eclipse.elk.graph.json -- ElkGraphJson.forGraph(JsonObject).rememberImporter,
// JsonImporter.transferLayout; core -- RecursiveGraphLayoutEngine, BasicProgressMonitor, LayoutMetaDataService;
// graph -- ElkGraphUtil, EMF eAllContents. This program only CALLS ELK and records results.
// Run: tools/vectors/transfer-vectors.sh <outDir>  (java -cp ... TransferVectors.java <outDir> <scenarioDir>)
// Cases: <scenarioDir>/cases.txt (format in its header); inputs are the scenario files, parsed with
// JsonParser.parseString exactly as the Xtend tests do.
// Output: {elkCommit, gsonVersion, cases: [{name, input, algorithm, seed, geometry, transferredText}]}.
//   algorithm -- the algorithm option of the imported root (null when the input names none);
//   seed -- randomSeed forced on the imported root (null when none);
//   transferredText -- new Gson().toJson(<input JsonObject>) after transferLayout (compact Gson text);
//   geometry.shapes -- key -> {x,y,width,height}. Keys: root = its identifier, child node = parentKey/id,
//     port = nodeKey/portId, node/port label = ownerKey#index, edge label = "edge:" + edgeId + "#index";
//   geometry.edges -- edgeId -> {container (key of the edge's containing node after layout),
//     junctionPoints ([[x,y]] or null when the option is unset), sections: [in list order]} where a section is
//     {importedId (identifier of this very section object right after import, by identity, else null),
//     identifier, start, end, bends, incomingShape/outgoingShape (shape keys or null),
//     incomingSections/outgoingSections (indices into this edge's section list)}.
// Every double is its Double.toString text (a JSON string) so no precision is lost. A layout failure is
// recorded as "throws": {class, message} in place of geometry/transferredText.
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import com.google.gson.GsonBuilder;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.math.KVectorChain;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.RandomLayouterOptions;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.core.util.Maybe;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.json.JsonImporter;
import org.eclipse.emf.ecore.EObject;

public class TransferVectors {
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String GSON_VERSION = "2.11.0";
    private static final String OUT_NAME = "graph-json-transfer.json";
    private static final String CASES_FILE = "cases.txt";
    private static final String SEED_KEY = "seed", PROPERTIES = "properties";

    public static void main(final String[] args) throws IOException {
        if (args.length != 2) {
            throw new IllegalArgumentException("usage: TransferVectors.java <outDir> <scenarioDir>");
        }
        LayoutMetaDataService.getInstance();
        Path scenarios = Path.of(args[1]);
        JsonArray cases = new JsonArray();
        for (String line : Files.readAllLines(scenarios.resolve(CASES_FILE), StandardCharsets.UTF_8)) {
            if (!line.isBlank() && !line.startsWith("#")) {
                cases.add(runCase(scenarios, line.trim().split("\\s+")));
            }
        }
        JsonObject out = new JsonObject();
        out.addProperty("elkCommit", ELK_COMMIT);
        out.addProperty("gsonVersion", GSON_VERSION);
        out.add("cases", cases);
        Files.createDirectories(Path.of(args[0]));
        String text = new GsonBuilder().setPrettyPrinting().serializeNulls().disableHtmlEscaping().create().toJson(out);
        Files.writeString(Path.of(args[0], OUT_NAME), text + "\n", StandardCharsets.UTF_8);
    }

    private static JsonObject runCase(final Path dir, final String[] tokens) throws IOException {
        JsonObject input = JsonParser.parseString(Files.readString(dir.resolve(tokens[1]))).getAsJsonObject();
        Integer seed = applyOverrides(input, Arrays.copyOfRange(tokens, 2, tokens.length));
        Maybe<JsonImporter> importer = new Maybe<>();
        ElkNode root = ElkGraphJson.forGraph(input).rememberImporter(importer).toElk();
        if (seed != null) {
            root.setProperty(RandomLayouterOptions.RANDOM_SEED, seed);
        }
        Map<ElkEdgeSection, String> imported = importedSections(root);
        JsonObject result = new JsonObject();
        result.addProperty("name", tokens[0]);
        result.addProperty("input", tokens[1]);
        result.addProperty("algorithm", root.getProperty(CoreOptions.ALGORITHM));
        result.addProperty(SEED_KEY, seed);
        try {
            new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
            result.add("geometry", geometry(root, imported));
            importer.get().transferLayout(root);
            result.addProperty("transferredText", new Gson().toJson(input));
        } catch (RuntimeException e) {
            JsonObject thrown = new JsonObject();
            thrown.addProperty("class", e.getClass().getName());
            thrown.addProperty("message", e.getMessage());
            result.add("throws", thrown);
        }
        return result;
    }

    /** Adds key=value tokens to the root "properties"; returns the seed token, if any. */
    private static Integer applyOverrides(final JsonObject input, final String[] tokens) {
        Integer seed = null;
        for (String token : tokens) {
            String[] kv = token.split("=", 2);
            if (SEED_KEY.equals(kv[0])) {
                seed = Integer.valueOf(kv[1]);
                continue;
            }
            if (!input.has(PROPERTIES)) {
                input.add(PROPERTIES, new JsonObject());
            }
            input.getAsJsonObject(PROPERTIES).addProperty(kv[0], kv[1]);
        }
        return seed;
    }

    private static Map<ElkEdgeSection, String> importedSections(final ElkNode root) {
        Map<ElkEdgeSection, String> map = new IdentityHashMap<>();
        for (Iterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkEdgeSection s) {
                map.put(s, s.getIdentifier());
            }
        }
        return map;
    }

    // ---- geometry ----

    private static JsonObject geometry(final ElkNode root, final Map<ElkEdgeSection, String> imported) {
        Map<ElkShape, String> keys = new IdentityHashMap<>();
        JsonObject shapes = new JsonObject();
        recordNode(root, root.getIdentifier(), keys, shapes);
        JsonObject edges = new JsonObject();
        for (Iterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkEdge edge) {
                recordEdgeLabels(edge, shapes);
                edges.add(edge.getIdentifier(), edgeJson(edge, keys, imported));
            }
        }
        JsonObject geometry = new JsonObject();
        geometry.add("shapes", shapes);
        geometry.add("edges", edges);
        return geometry;
    }

    private static void recordNode(final ElkNode node, final String key, final Map<ElkShape, String> keys,
            final JsonObject shapes) {
        recordShape(node, key, keys, shapes);
        recordLabels(node.getLabels(), key, shapes);
        for (ElkPort port : node.getPorts()) {
            String portKey = key + "/" + port.getIdentifier();
            recordShape(port, portKey, keys, shapes);
            recordLabels(port.getLabels(), portKey, shapes);
        }
        for (ElkNode child : node.getChildren()) {
            recordNode(child, key + "/" + child.getIdentifier(), keys, shapes);
        }
    }

    private static void recordShape(final ElkShape shape, final String key, final Map<ElkShape, String> keys,
            final JsonObject shapes) {
        keys.put(shape, key);
        shapes.add(key, box(shape));
    }

    private static void recordLabels(final List<ElkLabel> labels, final String ownerKey, final JsonObject shapes) {
        for (int i = 0; i < labels.size(); i++) {
            shapes.add(ownerKey + "#" + i, box(labels.get(i)));
        }
    }

    private static void recordEdgeLabels(final ElkEdge edge, final JsonObject shapes) {
        recordLabels(edge.getLabels(), "edge:" + edge.getIdentifier(), shapes);
    }

    private static JsonObject box(final ElkShape shape) {
        JsonObject o = new JsonObject();
        o.add("x", num(shape.getX()));
        o.add("y", num(shape.getY()));
        o.add("width", num(shape.getWidth()));
        o.add("height", num(shape.getHeight()));
        return o;
    }

    private static JsonObject edgeJson(final ElkEdge edge, final Map<ElkShape, String> keys,
            final Map<ElkEdgeSection, String> imported) {
        JsonObject o = new JsonObject();
        o.addProperty("container", keys.get(edge.getContainingNode()));
        o.add("junctionPoints", junctionPoints(edge));
        JsonArray sections = new JsonArray();
        for (ElkEdgeSection s : edge.getSections()) {
            sections.add(sectionJson(edge, s, keys, imported));
        }
        o.add("sections", sections);
        return o;
    }

    private static JsonElement junctionPoints(final ElkEdge edge) {
        if (!edge.hasProperty(CoreOptions.JUNCTION_POINTS)) {
            return com.google.gson.JsonNull.INSTANCE;
        }
        return points(edge.getProperty(CoreOptions.JUNCTION_POINTS));
    }

    private static JsonObject sectionJson(final ElkEdge edge, final ElkEdgeSection s,
            final Map<ElkShape, String> keys, final Map<ElkEdgeSection, String> imported) {
        JsonObject o = new JsonObject();
        o.addProperty("importedId", imported.get(s));
        o.addProperty("identifier", s.getIdentifier());
        o.add("start", point(s.getStartX(), s.getStartY()));
        o.add("end", point(s.getEndX(), s.getEndY()));
        KVectorChain bends = new KVectorChain();
        s.getBendPoints().forEach(b -> bends.add(new KVector(b.getX(), b.getY())));
        o.add("bends", points(bends));
        o.addProperty("incomingShape", keys.get(s.getIncomingShape()));
        o.addProperty("outgoingShape", keys.get(s.getOutgoingShape()));
        o.add("incomingSections", indices(edge, s.getIncomingSections()));
        o.add("outgoingSections", indices(edge, s.getOutgoingSections()));
        return o;
    }

    private static JsonArray indices(final ElkEdge edge, final List<ElkEdgeSection> sections) {
        JsonArray a = new JsonArray();
        for (ElkEdgeSection s : sections) {
            a.add(edge.getSections().indexOf(s));
        }
        return a;
    }

    private static JsonArray points(final KVectorChain chain) {
        JsonArray a = new JsonArray();
        for (KVector v : chain) {
            a.add(point(v.x, v.y));
        }
        return a;
    }

    private static JsonArray point(final double x, final double y) {
        JsonArray a = new JsonArray();
        a.add(num(x));
        a.add(num(y));
        return a;
    }

    private static JsonPrimitive num(final double d) {
        return new JsonPrimitive(Double.toString(d));
    }
}
