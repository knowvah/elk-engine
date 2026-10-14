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
import org.eclipse.elk.core.data.LayoutAlgorithmData;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.data.LayoutOptionData;
import org.eclipse.elk.core.options.CoreOptions;

import com.google.gson.JsonArray;

/**
 * Batch harness: reads ELK JSON or ELK text ({@code .elkt}) models, lays them
 * out with the recursive layout engine (or only parses them), and writes the
 * ELK JSON.
 *
 * <p>Three forms: {@code ElkOracle <outDir> <input>...} (layout, output named by
 * input basename), {@code ElkOracle --cases <cases.jsonl> <outDir>} (one JSON
 * case per line, output named by id, one JSON result line per case on stdout)
 * and {@code ElkOracle --list-algorithms}. Case mode {@code generate} reads a
 * random-graph config ({@code .elkr}) and writes the generated graph unlaid-out.
 * System properties set by run.sh: {@value #VARIANTS_PROPERTY} (variants.json path) and {@value #TIMEOUT_PROPERTY}
 * (per-case limit in ms, cases form only).
 */
public final class ElkOracle {

    /** Exit code after a timed-out case; run.sh restarts on the remaining cases. */
    static final int EXIT_TIMEOUT = 75;

    static final String VARIANTS_PROPERTY = "elk.oracle.variants";
    static final String TIMEOUT_PROPERTY = "elk.oracle.timeoutMs";
    /** Registry mode: {@code core} limits the option registry to CoreOptions; absent registers all. */
    static final String REGISTRY_PROPERTY = "elk.oracle.registry";
    static final String REGISTRY_CORE = "core";

    private static final int EXIT_FAILURE = 1;
    private static final int MIN_POSITIONAL_ARGS = 2;
    private static final int CASES_ARGS = 3;
    private static final long NANOS_PER_MILLI = 1_000_000L;
    private static final String CASES_FLAG = "--cases";
    private static final String LIST_FLAG = "--list-algorithms";
    private static final String LIST_OPTIONS_FLAG = "--list-options";
    private static final String USAGE = "usage: ElkOracle <outDir> <input>... | "
            + "ElkOracle --cases <cases.jsonl> <outDir> | ElkOracle --list-algorithms | "
            + "ElkOracle --list-options";

    private ElkOracle() {
    }

    /**
     * Entry point.
     *
     * @param args see the class comment
     */
    public static void main(final String[] args) throws IOException {
        boolean listForm = args.length == 1 && LIST_FLAG.equals(args[0]);
        boolean listOptionsForm = args.length == 1 && LIST_OPTIONS_FLAG.equals(args[0]);
        boolean casesForm = args.length > 0 && CASES_FLAG.equals(args[0]);
        boolean listing = listForm || listOptionsForm;
        if (!listing && (casesForm ? args.length != CASES_ARGS : args.length < MIN_POSITIONAL_ARGS)) {
            System.err.println(USAGE);
            System.exit(EXIT_FAILURE);
        }
        initRegistry();
        if (listForm) {
            listAlgorithms();
            return;
        }
        if (listOptionsForm) {
            listOptions();
            return;
        }
        runAndExit(args, casesForm);
    }

    /** Runs the cases or positional form, reports a summary on stderr, and exits. */
    private static void runAndExit(final String[] args, final boolean casesForm) throws IOException {
        long start = System.nanoTime();
        int total;
        int failures;
        if (casesForm) {
            Path outDir = Paths.get(args[2]);
            Files.createDirectories(outDir);
            List<String> lines = Files.readAllLines(Paths.get(args[1]), StandardCharsets.UTF_8);
            total = lines.size();
            failures = runCases(lines, newRunner(outDir), timeoutMs());
        } else {
            Path outDir = Paths.get(args[0]);
            Files.createDirectories(outDir);
            total = args.length - 1;
            failures = runPositional(args, newRunner(outDir));
        }
        long millis = (System.nanoTime() - start) / NANOS_PER_MILLI;
        System.err.println("ElkOracle: " + total + " input(s), " + failures
                + " failed, " + millis + " ms");
        System.exit(failures == 0 ? 0 : EXIT_FAILURE);
    }

    private static CaseRunner newRunner(final Path outDir) {
        String variants = System.getProperty(VARIANTS_PROPERTY);
        return new CaseRunner(outDir, new GraphOverlay(variants == null ? null : Paths.get(variants)));
    }

    private static long timeoutMs() {
        return Long.getLong(TIMEOUT_PROPERTY, 0L);
    }

    private static void listAlgorithms() {
        JsonArray ids = new JsonArray();
        LayoutMetaDataService.getInstance().getAlgorithmData().stream()
                .map(LayoutAlgorithmData::getId)
                .sorted()
                .forEach(ids::add);
        System.out.println(ids);
    }

    private static int runPositional(final String[] args, final CaseRunner runner) {
        int failures = 0;
        for (int i = 1; i < args.length; i++) {
            String name = Paths.get(args[i]).getFileName().toString();
            int dot = name.lastIndexOf('.');
            String id = dot > 0 ? name.substring(0, dot) : name;
            CaseResult result = runner.run(new CaseSpec(id, args[i], CaseSpec.MODE_LAYOUT, null, null));
            if (!CaseResult.OK.equals(result.status())) {
                System.err.println("ERROR " + args[i] + ": " + result.exceptionClass()
                        + ": " + result.message());
                failures++;
            }
        }
        return failures;
    }

    private static int runCases(final List<String> lines, final CaseRunner runner, final long limit) {
        TimedRunner timed = new TimedRunner(runner, limit);
        int failures = 0;
        for (String line : lines) {
            if (line.isBlank()) {
                continue;
            }
            CaseResult result;
            try {
                result = timed.run(CaseSpec.parse(line));
            } catch (RuntimeException e) {
                result = new CaseResult(line, CaseResult.ORACLE_ERROR, e.getClass().getName(),
                        CaseResult.normalizeMessage(e.getMessage()), 0L);
            }
            System.out.println(result.toJsonLine());
            if (CaseResult.TIMEOUT.equals(result.status())) {
                abandon(result.id(), limit, runner);
            }
            failures += CaseResult.OK.equals(result.status()) ? 0 : 1;
        }
        return failures;
    }

    /** Leaves the JVM after a timeout: the worker may still be running the case. */
    private static void abandon(final String id, final long limit, final CaseRunner runner) {
        System.err.println("ElkOracle: case " + id + " timed out after " + limit
                + " ms; exiting " + EXIT_TIMEOUT);
        System.out.flush();
        try {
            Files.deleteIfExists(runner.outputPath(id));
        } catch (IOException e) {
            System.err.println("ElkOracle: cannot remove output of " + id + ": " + e);
        }
        Runtime.getRuntime().halt(EXIT_TIMEOUT);
    }

    /**
     * Establishes the option registry. In {@code core} mode the singleton is created over a
     * parentless class loader (CoreOptions only, no ServiceLoader hits) before anything else
     * calls {@code getInstance()}, and the explicit provider registration is skipped.
     */
    private static void initRegistry() {
        String mode = System.getProperty(REGISTRY_PROPERTY);
        if (mode == null) {
            registerMetaDataProviders();
        } else if (REGISTRY_CORE.equals(mode)) {
            LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        } else {
            System.err.println("ElkOracle: unknown " + REGISTRY_PROPERTY + " value '" + mode
                    + "' (expected 'core' or unset)\n" + USAGE);
            System.exit(EXIT_FAILURE);
        }
    }

    private static void listOptions() {
        JsonArray ids = new JsonArray();
        LayoutMetaDataService.getInstance().getOptionData().stream()
                .map(LayoutOptionData::getId)
                .sorted()
                .forEach(ids::add);
        System.out.println(ids);
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
