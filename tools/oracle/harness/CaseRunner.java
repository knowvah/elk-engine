// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

/** Runs one case: read the model, optionally lay it out, write the JSON. */
final class CaseRunner {

    static final String MODE_LAYOUT = "layout";
    static final String MODE_PARSE = "parse";

    private static final String OUTPUT_EXTENSION = ".json";
    private static final String ID_SEPARATOR = "/";
    private static final String ID_REPLACEMENT = "__";
    private static final long NANOS_PER_MILLI = 1_000_000L;

    private final Path outDir;
    private final ElkModelReader reader = new ElkModelReader();

    CaseRunner(final Path outDir) {
        this.outDir = outDir;
    }

    /** Parses a case-file line; throws if it is not a valid case. */
    static JsonObject parseCase(final String line) {
        JsonObject json = JsonParser.parseString(line).getAsJsonObject();
        for (String key : List.of("id", "input", "mode")) {
            if (!json.has(key) || !json.get(key).isJsonPrimitive()) {
                throw new IllegalArgumentException("case lacks string field '" + key + "'");
            }
        }
        String mode = json.get("mode").getAsString();
        if (!MODE_LAYOUT.equals(mode) && !MODE_PARSE.equals(mode)) {
            throw new IllegalArgumentException("unknown mode '" + mode + "'");
        }
        return json;
    }

    static String outputName(final String id) {
        return id.replace(ID_SEPARATOR, ID_REPLACEMENT) + OUTPUT_EXTENSION;
    }

    /** Runs one case; never throws. */
    CaseResult run(final String id, final String input, final String mode) {
        long start = System.nanoTime();
        String status = CaseResult.OK;
        Throwable failure = null;
        try {
            ElkNode graph = reader.read(Paths.get(input));
            if (MODE_LAYOUT.equals(mode)) {
                new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
            }
            write(outDir.resolve(outputName(id)), export(graph));
        } catch (IOException e) {
            status = CaseResult.ORACLE_ERROR;
            failure = e;
        } catch (Exception | StackOverflowError e) {
            status = CaseResult.THROWS;
            failure = e;
        }
        long ms = (System.nanoTime() - start) / NANOS_PER_MILLI;
        if (failure == null) {
            return new CaseResult(id, status, null, null, ms);
        }
        return new CaseResult(id, status, failure.getClass().getName(), failure.getMessage(), ms);
    }

    static String export(final ElkNode graph) {
        return ElkGraphJson.forGraph(graph)
                .omitLayout(false)
                .omitZeroDimension(false)
                .omitZeroPositions(false)
                .omitUnknownLayoutOptions(true)
                .prettyPrint(true)
                .toJson();
    }

    private static void write(final Path path, final String json) throws IOException {
        Files.writeString(path, json + "\n", StandardCharsets.UTF_8);
    }
}
