// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;

/** Runs one case: read (or generate) the model, overlay, optionally lay it out, write the JSON. */
final class CaseRunner {

    private static final String OUTPUT_EXTENSION = ".json";
    private static final String ELKJ_EXTENSION = ".elkj";
    private static final String ID_SEPARATOR = "/";
    private static final String ID_REPLACEMENT = "__";
    private static final long NANOS_PER_MILLI = 1_000_000L;

    private final Path outDir;
    private final ElkModelReader reader = new ElkModelReader();
    private final GrandomGenerator generator = new GrandomGenerator();
    private final GraphOverlay overlay;

    CaseRunner(final Path outDir, final GraphOverlay overlay) {
        this.outDir = outDir;
        this.overlay = overlay;
    }

    static String outputName(final String id) {
        return id.replace(ID_SEPARATOR, ID_REPLACEMENT) + OUTPUT_EXTENSION;
    }

    /** The {@code convert} output of a case. */
    Path elkjPath(final String id) {
        return outDir.resolve(id.replace(ID_SEPARATOR, ID_REPLACEMENT) + ELKJ_EXTENSION);
    }

    Path outputPath(final String id) {
        return outDir.resolve(outputName(id));
    }

    /** Runs one case; never throws. */
    CaseResult run(final CaseSpec spec) {
        long start = System.nanoTime();
        String status = CaseResult.OK;
        Throwable failure = null;
        try {
            ElkNode graph = load(spec);
            if (CaseSpec.MODE_CONVERT.equals(spec.mode())) {
                ElkjConverter.save(ElkjConverter.transform(graph), elkjPath(spec.id()));
                return new CaseResult(spec.id(), status, null, null,
                        (System.nanoTime() - start) / NANOS_PER_MILLI);
            }
            overlay.apply(graph, spec.algorithm(), spec.variant());
            if (CaseSpec.MODE_LAYOUT.equals(spec.mode())) {
                new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
            }
            write(outputPath(spec.id()), export(graph));
        } catch (IOException | OracleFault e) {
            status = CaseResult.ORACLE_ERROR;
            failure = e;
        } catch (Exception | StackOverflowError e) {
            status = CaseResult.THROWS;
            failure = e;
        }
        long ms = (System.nanoTime() - start) / NANOS_PER_MILLI;
        if (failure == null) {
            return new CaseResult(spec.id(), status, null, null, ms);
        }
        return new CaseResult(spec.id(), status, failure.getClass().getName(),
                CaseResult.normalizeMessage(failure.getMessage()), ms);
    }

    private ElkNode load(final CaseSpec spec) throws IOException {
        Path input = Paths.get(spec.input());
        return switch (spec.mode()) {
            case CaseSpec.MODE_GENERATE -> generator.generate(input);
            case CaseSpec.MODE_PARSE_ELKJ -> reader.readAsElkj(input);
            default -> reader.read(input);
        };
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
