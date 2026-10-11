// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.eclipse.elk.alg.common.compaction.options.PolyominoOptions;
import org.eclipse.elk.alg.disco.options.DisCoMetaDataProvider;
import org.eclipse.elk.alg.force.options.ForceMetaDataProvider;
import org.eclipse.elk.alg.force.options.StressMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.mrtree.options.MrTreeMetaDataProvider;
import org.eclipse.elk.alg.radial.options.RadialMetaDataProvider;
import org.eclipse.elk.alg.rectpacking.options.RectPackingMetaDataProvider;
import org.eclipse.elk.alg.spore.options.SporeMetaDataProvider;
import org.eclipse.elk.alg.topdownpacking.options.TopdownpackingMetaDataProvider;
import org.eclipse.elk.alg.vertiflex.options.VertiFlexMetaDataProvider;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.ILayoutMetaDataProvider;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;

/**
 * Batch layout harness: reads ELK JSON graphs, lays them out with the
 * recursive layout engine, and writes the laid-out ELK JSON.
 */
public final class ElkOracle {

    private static final int EXIT_FAILURE = 1;
    private static final int MIN_ARGS = 2;
    private static final String OUTPUT_EXTENSION = ".json";

    private ElkOracle() {
    }

    /**
     * Usage: ElkOracle outDir input.json...
     *
     * @param args the output directory followed by the input files
     */
    public static void main(final String[] args) throws IOException {
        if (args.length < MIN_ARGS) {
            System.err.println("usage: ElkOracle <outDir> <input.json>...");
            System.exit(EXIT_FAILURE);
        }
        long start = System.nanoTime();
        Path outDir = Paths.get(args[0]);
        Files.createDirectories(outDir);
        registerMetaDataProviders();
        int failures = 0;
        for (int i = 1; i < args.length; i++) {
            failures += processOne(args[i], outDir) ? 0 : 1;
        }
        long millis = (System.nanoTime() - start) / 1_000_000L;
        System.err.println("ElkOracle: " + (args.length - 1) + " input(s), " + failures
                + " failed, " + millis + " ms");
        System.exit(failures == 0 ? 0 : EXIT_FAILURE);
    }

    private static void registerMetaDataProviders() {
        LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(
                new ILayoutMetaDataProvider[] {
                    new CoreOptions(),
                    new PolyominoOptions(),
                    new DisCoMetaDataProvider(),
                    new ForceMetaDataProvider(),
                    new LayeredMetaDataProvider(),
                    new MrTreeMetaDataProvider(),
                    new RadialMetaDataProvider(),
                    new RectPackingMetaDataProvider(),
                    new SporeMetaDataProvider(),
                    new StressMetaDataProvider(),
                    new TopdownpackingMetaDataProvider(),
                    new VertiFlexMetaDataProvider()
                });
    }

    private static boolean processOne(final String input, final Path outDir) {
        try {
            Path inPath = Paths.get(input);
            String json = layout(Files.readString(inPath, StandardCharsets.UTF_8));
            Files.writeString(outDir.resolve(outputName(inPath)), json + "\n",
                    StandardCharsets.UTF_8);
            return true;
        } catch (Exception | StackOverflowError e) {
            System.err.println("ERROR " + input + ": " + e);
            return false;
        }
    }

    private static String layout(final String text) {
        ElkNode graph = ElkGraphJson.forGraph(text).toElk();
        new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
        return ElkGraphJson.forGraph(graph)
                .omitLayout(false)
                .omitZeroDimension(false)
                .omitZeroPositions(false)
                .omitUnknownLayoutOptions(true)
                .prettyPrint(true)
                .toJson();
    }

    private static String outputName(final Path input) {
        String name = input.getFileName().toString();
        int dot = name.lastIndexOf('.');
        return (dot > 0 ? name.substring(0, dot) : name) + OUTPUT_EXTENSION;
    }
}
