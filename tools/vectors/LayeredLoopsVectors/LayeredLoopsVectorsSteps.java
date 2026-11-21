// SPDX-License-Identifier: EPL-2.0
// Helper 4 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the step interpreter, the processor names, the pipeline rows and buildRow.
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import com.google.gson.JsonParser;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.*;
import java.util.function.Supplier;
import org.eclipse.elk.alg.layered.ElkLayered;
import org.eclipse.elk.alg.layered.LayeredLayoutProvider;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.LNode;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
import org.eclipse.elk.alg.layered.intermediate.DummySelfLoopProcessor;
import org.eclipse.elk.alg.layered.intermediate.IntermediateProcessorStrategy;
import org.eclipse.elk.alg.layered.options.CrossingMinimizationStrategy;
import org.eclipse.elk.alg.layered.options.CycleBreakingStrategy;
import org.eclipse.elk.alg.layered.options.InternalProperties;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.layered.options.LayeringStrategy;
import org.eclipse.elk.alg.layered.options.NodePlacementStrategy;
import org.eclipse.elk.alg.layered.p3order.LayerSweepCrossingMinimizer;
import org.eclipse.elk.alg.layered.p5edges.EdgeRouterFactory;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.alg.layered.InteractiveLayeredGraphVisitor;
import org.eclipse.elk.alg.layered.intermediate.LabelManagementProcessor;
import org.eclipse.elk.core.util.IElkProgressMonitor;
import org.eclipse.elk.core.util.LoggedGraph;

abstract class LayeredLoopsVectorsSteps extends LayeredLoopsVectorsPhaseDump {
    // Step interpreter

    static final Set<String> RAN = new TreeSet<>();
    static final boolean TRACE = System.getenv("PHASE_TRACE") != null; // diagnosis aid: one stderr line per row

    static void normalise(LGraph g) {
        if (g.getProperty(LayeredOptions.RANDOM_SEED) == 0) {
            throw new LayeredLoopsVectors.Bug("random seed 0 (stop condition): the Random would be unseeded");
        }
        try {
            Class<?> k = Class.forName("org.eclipse.elk.alg.layered.GraphConfigurator");
            Constructor<?> c = k.getDeclaredConstructor();
            c.setAccessible(true);
            Method m = k.getDeclaredMethod("configureGraphProperties", LGraph.class);
            m.setAccessible(true);
            m.invoke(c.newInstance(), g);
        } catch (InvocationTargetException e) {
            throw new LayeredLoopsVectors.Bug("configureGraphProperties threw " + e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new LayeredLoopsVectors.Bug("cannot call GraphConfigurator: " + e);
        }
    }

    /** A monitor cancelled before the layout starts (a BasicProgressMonitor whose isCanceled is always true). */
    static final class CancelledMonitor extends BasicProgressMonitor {
        @Override
        public boolean isCanceled() {
            return true;
        }
    }

    static void collectLogged(IElkProgressMonitor m, List<LoggedGraph> out) {
        List<LoggedGraph> own = m.getLoggedGraphs();
        if (own != null) {
            out.addAll(own);
        }
        for (IElkProgressMonitor child : m.getSubMonitors()) {
            collectLogged(child, out);
        }
    }

    /** expected.logged: { tags, dot, json } over the monitor tree, depth first (see the header). */
    static Map<String, Object> logged(IElkProgressMonitor root) {
        List<LoggedGraph> graphs = new ArrayList<>();
        collectLogged(root, graphs);
        List<Object> tags = new ArrayList<>(), dot = new ArrayList<>(), json = new ArrayList<>(), jsonTags = new ArrayList<>();
        for (LoggedGraph g : graphs) {
            switch (g.getGraphType()) {
                case DOT -> {
                    tags.add(g.getTag());
                    dot.add(g.getGraph());
                }
                case JSON -> {
                    jsonTags.add(g.getTag());
                    json.add(g.getGraph());
                }
                default -> throw new LayeredLoopsVectors.Bug("row " + currentRow + ": a logged graph of type " + g.getGraphType());
            }
        }
        if (!tags.equals(jsonTags)) {
            throw new LayeredLoopsVectors.Bug("row " + currentRow + ": the logged DOT and JSON graphs do not pair up by tag");
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("tags", tags);
        m.put("dot", dot);
        m.put("json", json);
        return m;
    }

    /**
     * The expected of a terminal step (layout, layoutCancelled, interactive, logging): phaseDump(base) of the imported (untouched) LGraph and
     * the exports (as CaseRunner.java:87-92) of the ELK node after new LayeredLayoutProvider().layout(<the imported ELK node>, monitor):
     * "layout1" (interactive: after the first run), "layout" and "logged" (logging).
     */
    static Map<String, Object> terminalDump(String op, Base base, LGraph graph) {
        ElkNode node = (ElkNode) graph.getProperty(InternalProperties.ORIGIN);
        LayeredLayoutProvider provider = new LayeredLayoutProvider();
        Object layout1 = null;
        BasicProgressMonitor logging = op.equals("logging") ? new BasicProgressMonitor().withLogging(true) : null;
        switch (op) {
            case "interactive" -> {
                provider.layout(node, new BasicProgressMonitor());
                layout1 = new Raw(export(node));
                new InteractiveLayeredGraphVisitor().visit(node);
                provider.layout(node, new BasicProgressMonitor());
            }
            case "logging" -> provider.layout(node, logging);
            default -> provider.layout(node, op.equals("layoutCancelled") ? new CancelledMonitor() : new BasicProgressMonitor());
        }
        Map<String, Object> expected = phaseDump(base);
        if (layout1 != null) {
            expected.put("layout1", layout1);
        }
        expected.put("layout", new Raw(export(node)));
        if (logging != null) {
            expected.put("logged", logged(logging));
        }
        return expected;
    }

    record Result(Map<String, Object> expected, List<Object> prefix) { }

    @SuppressWarnings("unchecked")
    static Base CURRENT; // the Base of the step row being run (decode resolves {ref} paths against it)

    /** Sets the label manager of the kind on the root (G6); true if one was set. */
    static boolean labelManager(ElkNode root, String kind) {
        switch (kind) {
            case LayeredLoopsVectorsScenarios.NO_MANAGER:
                return false;
            case LayeredLoopsVectorsScenarios.SHRINK:
                root.setProperty(LabelManagementOptions.LABEL_MANAGER, new LayeredLoopsVectors.ShrinkWidthManager());
                return true;
            default:
                throw new LayeredLoopsVectors.Bug("unknown label manager kind " + kind);
        }
    }

    static Base need(Base base) {
        if (base == null) {
            throw new IllegalStateException("step ran before importGraph created the Base");
        }
        return base;
    }

    static double parseDoubleArg(String what, String s) {
        try {
            return Double.parseDouble(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(what + " is not a number: " + s, e);
        }
    }

    static long parseLongArg(String what, String s) {
        try {
            return Long.parseLong(s);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(what + " is not an integer: " + s, e);
        }
    }

    static void requirePairs(int length) {
        if (length % 2 != 0) {
            throw new IllegalArgumentException("key/value arguments come in pairs, got " + length);
        }
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> runSteps(ElkNode root, List<Object> steps) {
        LGraph graph = null;
        Base base = null;
        boolean managerOnRoot = false;
        Map<String, Object> expected = null;
        for (int i = 0; i < steps.size(); i++) {
            List<Object> s = (List<Object>) steps.get(i);
            String op = (String) s.get(0);
            if (expected != null) {
                throw new LayeredLoopsVectors.Bug("step after dump: " + op);
            }
            if (!op.equals("importGraph") && !op.equals("labelManager") && graph == null) {
                throw new LayeredLoopsVectors.Bug("step " + op + " before importGraph");
            }
            switch (op) {
                case "labelManager" -> {
                    if (i != 0) {
                        throw new LayeredLoopsVectors.Bug("labelManager is the first step, before importGraph");
                    }
                    managerOnRoot = labelManager(root, (String) s.get(1));
                }
                case "importGraph" -> {
                    if (managerOnRoot && s.get(1) != null) {
                        throw new LayeredLoopsVectors.Bug("a label manager is set on the root: the import target must be null");
                    }
                    graph = new ElkGraphTransformer().importGraph(importTarget(root, (String) s.get(1)));
                    base = CURRENT = new Base(graph);
                }
                case "normalise" -> {
                    normalise(graph);
                    need(base).snapshot();
                }
                case "setProperty" -> setProperty(need(base).element((String) s.get(1)), (String) s.get(2), s.get(3));
                case "runProcessor" -> {
                    runProcessor(graph, (String) s.get(1));
                    need(base).stop = (String) s.get(1);
                }
                case "processor" -> {
                    runOutsideProcessor(graph, (String) s.get(1));
                    need(base).stop = "processor/" + s.get(1);
                }
                case "runPhase" -> {
                    runPhase(graph, (String) s.get(1), (String) s.get(2));
                    need(base).stop = (String) s.get(1);
                }
                case "layout", "layoutCancelled", "interactive", "logging" -> {
                    if (i != steps.size() - 1) {
                        throw new LayeredLoopsVectors.Bug(op + " ends the row");
                    }
                    expected = terminalDump(op, base, graph);
                }
                case "dump" -> {
                    expected = phaseDump(base);
                    if (need(base).nodes.size() < FULL_DUMP_BELOW) {
                        expected.put("dump", new Dump(graph, true).dump());
                    }
                }
                default -> throw new LayeredLoopsVectors.Bug("unknown op " + op);
            }
            if (base != null && expected == null) {
                base.noteFlexible();
            }
        }
        if (expected == null) {
            throw new LayeredLoopsVectors.Bug("steps have no dump");
        }
        return expected;
    }

    /** W3: the step op "processor": runs the one processor no IntermediateProcessorStrategy member creates, by simple class name. */
    static void runOutsideProcessor(LGraph g, String simpleName) {
        if (!simpleName.equals("DummySelfLoopProcessor")) {
            throw new LayeredLoopsVectors.Bug("processor " + simpleName + " is not a processor outside the enum");
        }
        new DummySelfLoopProcessor().process(g, new BasicProgressMonitor());
        RAN.add("processor/" + simpleName);
    }

    static void runProcessor(LGraph g, String member) {
        if (!allowed(member)) {
            throw new LayeredLoopsVectors.Bug("processor " + member + " is outside the ported sets");
        }
        var processor = IntermediateProcessorStrategy.valueOf(member).create();
        processor.process(g, new BasicProgressMonitor());
        RAN.add(member);
    }

    /** BFSNodeOrderCycleBreaker.java:105-115: layerless nodes without incoming edges; > 10 breaks insertion order. */
    static void guardBfsSources(LGraph g) {
        int sources = 0;
        for (LNode n : g.getLayerlessNodes()) {
            if (!n.getIncomingEdges().iterator().hasNext()) {
                sources++;
            }
        }
        maxBfsSources = Math.max(maxBfsSources, sources);
        if (sources > MAX_HASH_ORDER_SOURCES) {
            throw new LayeredLoopsVectors.Refusal("row " + currentRow + ": BFS_NODE_ORDER has " + sources + " sources (> "
                    + MAX_HASH_ORDER_SOURCES + ": HashSet insertion order is lost under -XX:hashCode=2)",
                    "BFS_NODE_ORDER_SOURCES");
        }
    }

    static void runPhase(LGraph g, String phase, String strategy) {
        if (phase.equals("P1_CYCLE_BREAKING") && strategy.equals("BFS_NODE_ORDER")) {
            guardBfsSources(g);
        }
        switch (phase) {
            case "P1_CYCLE_BREAKING" -> CycleBreakingStrategy.valueOf(strategy).create().process(g, new BasicProgressMonitor());
            case "P2_LAYERING" -> LayeringStrategy.valueOf(strategy).create().process(g, new BasicProgressMonitor());
            case "P3_NODE_ORDERING" -> CrossingMinimizationStrategy.valueOf(strategy).create().process(g, new BasicProgressMonitor());
            case "P4_NODE_PLACEMENT" -> NodePlacementStrategy.valueOf(strategy).create().process(g, new BasicProgressMonitor());
            case P5 -> EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create().process(g, new BasicProgressMonitor());
            default -> throw new LayeredLoopsVectors.Bug("unknown phase " + phase);
        }
        RAN.add(phase + "/" + strategy);
    }

    // Pipeline rows (B1)

    static final Map<Class<?>, List<String>> PROCESSOR_NAMES = new HashMap<>();

    static void buildProcessorNames() {
        PROCESSOR_NAMES.clear();
        for (IntermediateProcessorStrategy s : IntermediateProcessorStrategy.values()) {
            if (s == IntermediateProcessorStrategy.ONE_SIDED_GREEDY_SWITCH
                    || s == IntermediateProcessorStrategy.TWO_SIDED_GREEDY_SWITCH) {
                continue; // LayerSweepCrossingMinimizer instances: named by nameOf through their CrossMinType
            }
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(s.name());
        }
        for (CycleBreakingStrategy s : CycleBreakingStrategy.values()) {
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(P1 + "/" + s.name());
        }
        for (LayeringStrategy s : LayeringStrategy.values()) {
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(P2 + "/" + s.name());
        }
        for (CrossingMinimizationStrategy s : CrossingMinimizationStrategy.values()) {
            if (s == CrossingMinimizationStrategy.INTERACTIVE || s == CrossingMinimizationStrategy.NONE) {
                PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(P3 + "/" + s.name());
            }
        }
        for (NodePlacementStrategy s : NodePlacementStrategy.values()) {
            PROCESSOR_NAMES.computeIfAbsent(s.create().getClass(), k -> new ArrayList<>()).add(P4 + "/" + s.name());
        }
        for (EdgeRouting r : ROUTINGS) {
            PROCESSOR_NAMES.computeIfAbsent(EdgeRouterFactory.factoryFor(r).create().getClass(), k -> new ArrayList<>())
                    .add(P5 + "/" + r.name());
        }
    }

    /** The CrossMinType of a LayerSweepCrossingMinimizer (private field, read by reflection). */
    static LayerSweepCrossingMinimizer.CrossMinType crossMinType(LayerSweepCrossingMinimizer s) {
        try {
            Field f = LayerSweepCrossingMinimizer.class.getDeclaredField("crossMinType");
            f.setAccessible(true);
            return (LayerSweepCrossingMinimizer.CrossMinType) f.get(s);
        } catch (ReflectiveOperationException e) {
            throw new LayeredLoopsVectors.Bug("cannot read LayerSweepCrossingMinimizer.crossMinType: " + e);
        }
    }

    /** The recorded name of a processor of the assembled algorithm: an IntermediateProcessorStrategy member, or "P<n>_<PHASE>/<STRATEGY>". The two
     * greedy switch arms and the LAYER_SWEEP / MEDIAN_LAYER_SWEEP phases are all LayerSweepCrossingMinimizer instances
     * (IntermediateProcessorStrategy.java:316-317, :361-362, CrossingMinimizationStrategy.java:67-71) told apart by their CrossMinType. */
    static String nameOf(Object processor) {
        if (processor instanceof LayerSweepCrossingMinimizer s) {
            return switch (crossMinType(s)) {
                case BARYCENTER -> P3 + "/LAYER_SWEEP";
                case MEDIAN -> P3 + "/MEDIAN_LAYER_SWEEP";
                case ONE_SIDED_GREEDY_SWITCH -> "ONE_SIDED_GREEDY_SWITCH";
                case TWO_SIDED_GREEDY_SWITCH -> "TWO_SIDED_GREEDY_SWITCH";
            };
        }
        if (processor instanceof LabelManagementProcessor p) {
            return centerLabels(p) ? "CENTER_LABEL_MANAGEMENT_PROCESSOR" : "END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR";
        }
        List<String> names = PROCESSOR_NAMES.get(processor.getClass());
        if (names == null && processor.getClass().getName().startsWith("org.eclipse.elk.alg.layered.compound.")) {
            return "INCLUDE_CHILDREN"; // CompoundGraphPre/Postprocessor: only doCompoundLayout notifies them (7h)
        }
        if (names == null) {
            return "UNNAMED/" + processor.getClass().getName(); // a P4/P5 phase or a later processor: never allowed
        }
        if (names.equals(List.of("DIRECTION_PREPROCESSOR", "DIRECTION_POSTPROCESSOR"))) {
            return names.get(0); // GraphTransformer: a stop never reaches the post-processor, the last processor of the plan
        }
        if (names.stream().allMatch(REFUSAL_CATEGORIES::containsKey)) {
            return names.get(0); // e.g. the two LabelManagementProcessor arms: any refused member names the level's refusal
        }
        if (names.size() != 1) {
            throw new LayeredLoopsVectors.Bug("row " + currentRow + ": processor class " + processor.getClass().getName() + " has names "
                    + names);
        }
        return names.get(0);
    }

    /** The center flag of a LabelManagementProcessor (private field, read by reflection): the two IntermediateProcessorStrategy arms. */
    static boolean centerLabels(LabelManagementProcessor p) {
        try {
            Field f = LabelManagementProcessor.class.getDeclaredField("centerLabels");
            f.setAccessible(true);
            return f.getBoolean(p);
        } catch (ReflectiveOperationException e) {
            throw new LayeredLoopsVectors.Bug("cannot read LabelManagementProcessor.centerLabels: " + e);
        }
    }

    /** The names of a plan, GraphTransformer by position (F4: DIRECTION_PREPROCESSOR first, DIRECTION_POSTPROCESSOR last). */
    static List<String> positionalNames(List<? extends Object> plan) {
        List<String> names = new ArrayList<>();
        int transformers = 0;
        for (Object p : plan) {
            String n = nameOf(p);
            if (n.equals("DIRECTION_PREPROCESSOR") && transformers++ > 0) {
                n = "DIRECTION_POSTPROCESSOR";
            }
            names.add(n);
        }
        return names;
    }

    static boolean allowed(String name) {
        return SEVEN_B.contains(name) || SEVEN_C.contains(name) || SEVEN_D.contains(name) || SEVEN_E.contains(name) || SEVEN_F.contains(name)
                || SEVEN_F2.contains(name) || SEVEN_G.contains(name) || name.startsWith(P1 + "/") || name.startsWith(P2 + "/") || name.startsWith(P3 + "/")
                || name.startsWith(P4 + "/") || name.startsWith(P5 + "/");
    }

    /** The name of the processor a row stops after: "P1", "P2", "P3" (the configured phase) or a processor member. */
    static String stopName(String stop, LGraph g) {
        return switch (stop) {
            case "P1" -> P1 + "/" + g.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY).name();
            case "P2" -> P2 + "/" + g.getProperty(LayeredOptions.LAYERING_STRATEGY).name();
            case "P3" -> P3 + "/" + g.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY).name();
            case "P4" -> P4 + "/" + g.getProperty(LayeredOptions.NODE_PLACEMENT_STRATEGY).name();
            case "P5" -> P5 + "/" + g.getProperty(LayeredOptions.EDGE_ROUTING).name();
            default -> IntermediateProcessorStrategy.valueOf(stop).name();
        };
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static Result runPipeline(Spec s, ElkNode root) {
        currentRow = s.id;
        ElkNode target = importTarget(root, s.target);
        s.options.forEach((id, c4) -> setProperty(target, id, c4));
        LGraph g = new ElkGraphTransformer().importGraph(target);
        Base base = new Base(g);
        if (g.getProperty(LayeredOptions.RANDOM_SEED) == 0) {
            throw new LayeredLoopsVectors.Bug("row " + s.id + ": random seed 0 (stop condition)");
        }
        ElkLayered layered = new ElkLayered();
        ElkLayered.TestExecutionState state = layered.prepareLayoutTest(g);
        if (state.getGraphs().size() != 1 || state.getGraphs().get(0) != g) {
            throw new LayeredLoopsVectors.Bug("row " + s.id + ": the graph was split into components");
        }
        base.snapshot();
        base.stop = s.stop;
        base.noteFlexible();
        var plan = layered.getLayoutTestConfiguration(state);
        String stop = stopName(s.stop, g);
        List<String> names = new ArrayList<>();
        int stopAt = -1;
        List<String> positional = positionalNames(plan);
        for (String name : positional) { // G2: the whole plan decides, never a prefix
            if (!allowed(name)) {
                throw new LayeredLoopsVectors.Refusal("row " + s.id + ": the plan names " + name + ", outside the ported sets", name);
            }
        }
        for (int i = 0; i < plan.size() && stopAt < 0; i++) {
            names.add(positional.get(i));
            stopAt = names.get(i).equals(stop) ? i : -1;
        }
        if (stopAt < 0) {
            throw new LayeredLoopsVectors.NotInPlan("row " + s.id + ": " + stop + " is not part of the algorithm " + names);
        }
        List<Object> prefix = new ArrayList<>(names.subList(0, stopAt + 1));
        for (int i = 0; i <= stopAt; i++) {
            if (names.get(i).equals(P1 + "/BFS_NODE_ORDER")) {
                guardBfsSources(g);
            }
            layered.runLayoutTestStep(state);
        }
        return new Result(phaseDump(base), prefix);
    }

    // Rows

    /** One row to record: a vendored input (path) or a prepared one (prepare); pipeline (stop) or step row (steps). */
    record Spec(String id, String group, String path, Supplier<ElkNode> prepare, String target,
            TreeMap<String, Object> options, String stop, List<Object> steps, String mode) { }

    record Row(String id, String group, String json) { }

    static final long ROW_TIMEOUT_SECONDS = 60;

    /** Runs the row in a daemon thread: an oracle loop that never ends stops the recording naming the row. */
    static Result execute(Spec s, ElkNode root, List<Object> parsedSteps) {
        java.util.concurrent.FutureTask<Result> task = new java.util.concurrent.FutureTask<>(() ->
                s.group.equals("full") ? LayeredLoopsVectorsBuilders.runFull(s, root)
                        : s.steps == null ? runPipeline(s, root) : new Result(runSteps(root, parsedSteps), null));
        currentRow = s.id;
        Thread t = new Thread(task, "row");
        t.setDaemon(true);
        t.start();
        try {
            return task.get(ROW_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            throw new LayeredLoopsVectors.Bug("row " + s.id + " does not finish within " + ROW_TIMEOUT_SECONDS + " s");
        } catch (java.util.concurrent.ExecutionException e) {
            if (e.getCause() instanceof RuntimeException r) {
                throw r;
            }
            throw new IllegalStateException("row " + s.id, e.getCause());
        } catch (InterruptedException e) {
            throw new IllegalStateException(e);
        }
    }

    @SuppressWarnings("unchecked")
    static Row buildRow(Spec s) {
        String stepsJson = s.steps == null ? null : json(s.steps);
        List<Object> parsed = stepsJson == null ? null : (List<Object>) fromJson(JsonParser.parseString(stepsJson));
        Supplier<ElkNode> load = s.path != null ? () -> loadFile(s.path) : s.prepare;
        String inputElk = null;
        Result first;
        Result second;
        if (s.path == null) {
            // Prepared inputs are recorded as the ELK JSON export they are replayed from: both runs start from a
            // fresh import of it (an .elkt edge has no id until the export gives it one, and ORIGIN would differ).
            inputElk = export(load.get());
            first = execute(s, ElkGraphJson.forGraph(inputElk).toElk(), parsed);
            second = execute(s, ElkGraphJson.forGraph(inputElk).toElk(), parsed);
        } else {
            first = execute(s, load.get(), parsed);
            second = execute(s, load.get(), parsed);
        }
        String a = json(first.expected) + json(first.prefix), b = json(second.expected) + json(second.prefix);
        if (!a.equals(b)) {
            throw new IllegalStateException("row " + s.id + " differs on re-import\n" + clip(a, b) + "\n" + clip(b, a));
        }
        Map<String, Object> input = new LinkedHashMap<>();
        if (s.path != null) {
            input.put("path", s.path);
            input.put("sha256", pinnedSha(s.path));
        } else {
            input.put("elk", new Raw(inputElk));
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", s.id);
        row.put("group", s.group);
        row.put("input", input);
        row.put("target", s.target);
        row.put("options", s.options);
        row.put("steps", stepsJson == null ? null : new Raw(stepsJson));
        row.put("prefix", first.prefix);
        row.put("expected", first.expected);
        return new Row(s.id, s.group, json(row));
    }

    static String clip(String s, String other) {
        int d = 0;
        while (d < s.length() && d < other.length() && s.charAt(d) == other.charAt(d)) {
            d++;
        }
        return "(at " + d + ") " + s.substring(Math.max(0, d - 200), Math.min(s.length(), d + 300));
    }
}
