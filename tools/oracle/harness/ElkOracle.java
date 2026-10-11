// SPDX-License-Identifier: EPL-2.0
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

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
import org.eclipse.elk.core.data.ILayoutMetaDataProvider;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.CoreOptions;

import com.google.gson.JsonObject;

/**
 * Batch harness: reads ELK JSON or ELK text ({@code .elkt}) models, lays them
 * out with the recursive layout engine (or only parses them), and writes the
 * ELK JSON.
 *
 * <p>Two forms: {@code ElkOracle <outDir> <input>...} (layout, output named by
 * input basename) and {@code ElkOracle --cases <cases.jsonl> <outDir>} (one
 * JSON case per line, output named by id, one JSON result line per case on
 * stdout).
 */
public final class ElkOracle {

    private static final int EXIT_FAILURE = 1;
    private static final int MIN_POSITIONAL_ARGS = 2;
    private static final int CASES_ARGS = 3;
    private static final long NANOS_PER_MILLI = 1_000_000L;
    private static final String CASES_FLAG = "--cases";
    private static final String USAGE =
            "usage: ElkOracle <outDir> <input>... | ElkOracle --cases <cases.jsonl> <outDir>";

    private ElkOracle() {
    }

    /**
     * Entry point.
     *
     * @param args see the class comment
     */
    public static void main(final String[] args) throws IOException {
        boolean casesForm = args.length > 0 && CASES_FLAG.equals(args[0]);
        if (casesForm ? args.length != CASES_ARGS : args.length < MIN_POSITIONAL_ARGS) {
            System.err.println(USAGE);
            System.exit(EXIT_FAILURE);
        }
        long start = System.nanoTime();
        registerMetaDataProviders();
        int total;
        int failures;
        if (casesForm) {
            Path outDir = Paths.get(args[2]);
            Files.createDirectories(outDir);
            List<String> lines = Files.readAllLines(Paths.get(args[1]), StandardCharsets.UTF_8);
            total = lines.size();
            failures = runCases(lines, new CaseRunner(outDir));
        } else {
            Path outDir = Paths.get(args[0]);
            Files.createDirectories(outDir);
            total = args.length - 1;
            failures = runPositional(args, new CaseRunner(outDir));
        }
        long millis = (System.nanoTime() - start) / NANOS_PER_MILLI;
        System.err.println("ElkOracle: " + total + " input(s), " + failures
                + " failed, " + millis + " ms");
        System.exit(failures == 0 ? 0 : EXIT_FAILURE);
    }

    private static int runPositional(final String[] args, final CaseRunner runner) {
        int failures = 0;
        for (int i = 1; i < args.length; i++) {
            String name = Paths.get(args[i]).getFileName().toString();
            int dot = name.lastIndexOf('.');
            String id = dot > 0 ? name.substring(0, dot) : name;
            CaseResult result = runner.run(id, args[i], CaseRunner.MODE_LAYOUT);
            if (!CaseResult.OK.equals(result.status())) {
                System.err.println("ERROR " + args[i] + ": " + result.exceptionClass()
                        + ": " + result.message());
                failures++;
            }
        }
        return failures;
    }

    private static int runCases(final List<String> lines, final CaseRunner runner) {
        int failures = 0;
        for (String line : lines) {
            if (line.isBlank()) {
                continue;
            }
            CaseResult result;
            try {
                JsonObject c = CaseRunner.parseCase(line);
                result = runner.run(c.get("id").getAsString(), c.get("input").getAsString(),
                        c.get("mode").getAsString());
            } catch (RuntimeException e) {
                result = new CaseResult(line, CaseResult.ORACLE_ERROR, e.getClass().getName(),
                        e.getMessage(), 0L);
            }
            System.out.println(result.toJsonLine());
            failures += CaseResult.OK.equals(result.status()) ? 0 : 1;
        }
        return failures;
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
}
