// SPDX-License-Identifier: EPL-2.0
// Helper 9 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the build of the file, its checks, the setup and the plan dump.
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import org.eclipse.elk.alg.layered.intermediate.DummySelfLoopProcessor;
import org.eclipse.elk.alg.layered.intermediate.IntermediateProcessorStrategy;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.testing.TestController;
import org.eclipse.elk.core.AbstractLayoutProvider;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;

abstract class LayeredLoopsVectorsBuild extends LayeredLoopsVectorsSites {

    // Building the file

    static final boolean MARKERS = System.getenv("LOOPS_MARKERS") != null;
    static final boolean DISCOVER = System.getenv("LOOPS_DISCOVER") != null;
    static final String FILTER = System.getenv("LOOPS_FILTER");
    static final String GROUPS = "full,models,scenarios,sites";

    static String fileText(Map<String, Integer> counts, List<Row> rows) {
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ");
        str(out, System.getProperty("java.version"));
        out.append(",\n  \"oracle\": \"").append(LayeredLoopsVectors.elkCommit()).append("\",\n  \"rowCounts\": {");
        int k = 0;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            out.append(k++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        out.append("},\n  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            out.append("    ").append(rows.get(i).json()).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        return out.append("  ]\n}\n").toString();
    }

    /** Every IntermediateProcessorStrategy member is in exactly one of the ported sets or the refusal categories. */
    static void checkClassification() {
        for (IntermediateProcessorStrategy m : IntermediateProcessorStrategy.values()) {
            int sets = (SEVEN_B.contains(m.name()) ? 1 : 0) + (SEVEN_C.contains(m.name()) ? 1 : 0) + (SEVEN_D.contains(m.name()) ? 1 : 0)
                    + (SEVEN_E.contains(m.name()) ? 1 : 0) + (SEVEN_F.contains(m.name()) ? 1 : 0) + (SEVEN_F2.contains(m.name()) ? 1 : 0)
                    + (SEVEN_G.contains(m.name()) ? 1 : 0) + (REFUSAL_CATEGORIES.containsKey(m.name()) ? 1 : 0);
            if (sets != 1) {
                throw new LayeredLoopsVectors.Bug("IntermediateProcessorStrategy." + m.name() + " is in " + sets + " of the ported sets and refusal categories");
            }
        }
    }

    static final Map<String, Long> BYTES = new TreeMap<>();
    /** Rows whose oracle run throws inside ELK (reported on stderr with the exception and its top frame, never recorded). */
    static final List<String> ORACLE_THROWS = new ArrayList<>();

    /** The first org.eclipse.elk frame of an exception thrown while ELK code runs (before any frame of this program), or null. */
    static StackTraceElement elkFrame(RuntimeException e) {
        if (e instanceof LayeredLoopsVectors.Bug) {
            return null;
        }
        for (StackTraceElement f : e.getStackTrace()) {
            if (f.getClassName().startsWith("LayeredLoopsVectors")) {
                return null;
            }
            if (f.getClassName().startsWith("org.eclipse.elk.")) {
                return f;
            }
        }
        return null;
    }

    /** Records every row; returns the output file text. */
    static String buildAll() {
        RAN.clear();
        REFUSED_BY_CATEGORY.clear();
        NOT_IN_PLAN.clear();
        FAMILIES.clear();
        BYTES.clear();
        ORACLE_THROWS.clear();
        buildProcessorNames();
        checkClassification();
        List<Spec> specs = new ArrayList<>();
        List<Spec> fulls = new ArrayList<>();
        modelSpecs(specs, fulls, modelFiles());
        scenarioSpecs(specs);
        siteSpecs(specs);
        specs.addAll(0, fulls);
        Set<String> ids = new HashSet<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String group : GROUPS.split(",")) {
            counts.put(group, 0);
        }
        List<Row> rows = new ArrayList<>();
        for (Spec s : specs) {
            if (!ids.add(s.id())) {
                throw new IllegalStateException("duplicate row id " + s.id());
            }
            if (FILTER != null && !s.id().contains(FILTER)) {
                continue;
            }
            if (TRACE) {
                System.err.println("row " + s.id());
            }
            if (MARKERS) {
                System.out.println("ROW " + s.id());
                System.out.flush();
            }
            try {
                rows.add(buildRow(s));
            } catch (LayeredLoopsVectors.Refusal r) {
                String category = REFUSAL_CATEGORIES.get(r.member);
                if (DISCOVER) {
                    System.err.println("DISCOVER refusal " + s.id() + " " + r.member + (category == null ? "  OUTSIDE 7g/7h" : ""));
                } else if (category == null) {
                    throw r;
                }
                REFUSED_BY_CATEGORY.merge(category == null ? "OUTSIDE 7g/7h" : category, 1, Integer::sum);
                continue;
            } catch (LayeredLoopsVectors.NotInPlan e) {
                if (!s.group().equals("models")) {
                    throw e;
                }
                NOT_IN_PLAN.merge(s.id().split("/")[3], 1, Integer::sum);
                continue;
            } catch (RuntimeException e) {
                StackTraceElement frame = elkFrame(e);
                if (frame == null) {
                    throw e;
                }
                ORACLE_THROWS.add(s.id() + " " + e.getClass().getName() + ": " + e.getMessage() + " at " + frame);
                continue;
            }
            counts.merge(s.group(), 1, Integer::sum);
            Row r = rows.get(rows.size() - 1);
            String[] p = r.id().split("/");
            BYTES.merge(p[0] + "/" + p[1], (long) r.json().length(), Long::sum);
            BYTES.merge("model " + (p[0].equals("full") ? p[2] : p[0].equals("models") ? p[1] : p[1] + "/" + p[2]), (long) r.json().length(), Long::sum);
        }
        if (FILTER == null) {
            checkCoverage();
        }
        System.err.println("max BFS_NODE_ORDER sources " + maxBfsSources);
        System.err.println("accepted refusals (7h): " + REFUSED_BY_CATEGORY.values().stream().mapToInt(Integer::intValue).sum() + " rows");
        REFUSED_BY_CATEGORY.forEach((k, n) -> System.err.println("accepted refusal category " + k + ": " + n + " rows"));
        NOT_IN_PLAN.forEach((k, n) -> System.err.println("stop not in the algorithm (skipped) " + n + " rows: " + k));
        ORACLE_THROWS.forEach(t -> System.err.println("ORACLE THROWS " + t));
        System.err.println("oracle throws: " + ORACLE_THROWS.size() + " rows");
        if (System.getenv("LOOPS_STATS") != null) {
            BYTES.forEach((kind, v) -> System.err.println("STATS " + v + " " + kind));
        }
        System.err.println("rows " + rows.size() + " " + counts);
        return fileText(counts, rows);
    }

    /** Every arm of this brief ran in a step row, two graphs per arm and direction; the Dummy op ran. */
    static void checkCoverage() {
        List<String> missing = new ArrayList<>();
        if (!RAN.contains("processor/DummySelfLoopProcessor")) {
            missing.add("processor/DummySelfLoopProcessor");
        }
        for (String m : SEVEN_G) {
            if (!RAN.contains(m)) {
                missing.add(m);
            }
            for (String d : ALL_DIRECTIONS) {
                if (FAMILIES.getOrDefault(m + "/" + d, 0) < 2) {
                    missing.add("two scenarios of " + m + " in direction " + d);
                }
            }
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("no step row covers " + missing);
        }
        System.err.println("skipped stops are listed above; row timeouts: 0 (a timeout stops the recording)");
    }

    static void setup(String vectorsDir) throws Exception {
        if (System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/layered-loops-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(), new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1"); // the seed properties of tools/oracle/run.sh (F4)
        System.setProperty("org.eclipse.elk.graph.util.identifierSeed", "1");
        ElkGraphStandaloneSetup.doSetup();
        REPO = vectorsDir == null ? null : Path.of(vectorsDir).toAbsolutePath().normalize().getParent().getParent();
        discoverProperties();
    }

    // --plan-dump (F8)

    static ElkNode loadAny(Path p) throws IOException {
        if (p.toString().endsWith(".json")) {
            return ElkGraphJson.forGraph(Files.readString(p, StandardCharsets.UTF_8)).toElk();
        }
        Resource r = new ResourceSetImpl().getResource(URI.createFileURI(p.toAbsolutePath().toString()), true);
        if (!r.getErrors().isEmpty() || r.getContents().isEmpty() || !(r.getContents().get(0) instanceof ElkNode)) {
            throw new IOException("cannot load " + p + ": " + r.getErrors());
        }
        ElkNode g = (ElkNode) r.getContents().get(0);
        dropUnresolvedOptions(g);
        return g;
    }

    static List<Path> expand(Path root, String rel) throws IOException {
        Path p = root.resolve(rel);
        List<Path> files = new ArrayList<>();
        if (Files.isDirectory(p)) {
            try (var walk = Files.walk(p)) {
                walk.filter(Files::isRegularFile).filter(f -> f.toString().endsWith(".elkt") || f.toString().endsWith(".json"))
                        .sorted().forEach(files::add);
            }
        } else {
            files.add(p);
        }
        List<Path> kept = new ArrayList<>();
        for (Path f : files) {
            String name = f.toString();
            if (name.endsWith(".elkt") && files.contains(Path.of(name.replaceAll("\\.elkt$", ".json")))) {
                continue; // ptolemy: the .json twin of the same model is read
            }
            kept.add(f);
        }
        return kept;
    }

    /** args: --plan-dump <vectorsDir> <modelsDir> <path or dir>... [-o CONSTANT=value]... (options set on every node with children). */
    static void planDump(String[] args) throws Exception {
        setup(args[1]);
        buildProcessorNames();
        Path models = Path.of(args[2]);
        List<String[]> opts = new ArrayList<>();
        List<String> paths = new ArrayList<>();
        for (int i = 3; i < args.length; i++) {
            if (args[i].equals("-o")) {
                if (i + 1 >= args.length) {
                    throw new IllegalArgumentException("-o needs a CONSTANT=value argument");
                }
                opts.add(args[++i].split("=", 2));
            } else {
                paths.add(args[i]);
            }
        }
        for (String rel : paths) {
            for (Path file : expand(models, rel)) {
                String name = models.relativize(file).toString();
                try {
                    ElkNode root = loadAny(file);
                    List<ElkNode> nodes = new ArrayList<>();
                    nodes.add(root);
                    for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
                        if (it.next() instanceof ElkNode n) {
                            nodes.add(n);
                        }
                    }
                    for (String[] o : opts) {
                        var data = LayoutMetaDataService.getInstance().getOptionData(pid(o[0]));
                        for (ElkNode n : nodes) {
                            if (!n.getChildren().isEmpty()) {
                                n.setProperty(data, data.parseValue(o[1]));
                            }
                        }
                    }
                    currentRow = name;
                    PlanRecorder recorder = new PlanRecorder();
                    TestController controller = new TestController(LayeredOptions.ALGORITHM_ID);
                    controller.addLayoutExecutionListener(recorder);
                    var pool = LayoutMetaDataService.getInstance().getAlgorithmData(LayeredOptions.ALGORITHM_ID).getInstancePool();
                    AbstractLayoutProvider provider = pool.fetch();
                    controller.install(provider);
                    pool.release(provider);
                    try {
                        new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
                    } finally {
                        controller.uninstall();
                    }
                    Set<String> refused = new TreeSet<>();
                    for (Map.Entry<String, Object> e : recorder.plans().entrySet()) {
                        List<?> names = (List<?>) e.getValue();
                        System.out.println("PLAN\t" + name + "\t" + e.getKey() + "\t" + String.join(",", names.stream().map(Object::toString).toList()));
                        names.stream().map(Object::toString).filter(n -> !allowed(n)).forEach(refused::add);
                    }
                    System.out.println("FILE\t" + name + "\t" + (refused.isEmpty() ? "-" : String.join(",", refused)));
                } catch (RuntimeException | IOException e) {
                    System.out.println("FILE\t" + name + "\tERROR " + e.getClass().getSimpleName() + ": " + String.valueOf(e.getMessage()).replace('\n', ' '));
                }
            }
        }
    }
}
