// SPDX-License-Identifier: EPL-2.0
// Helper 10 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the --sweep and --dump modes.
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import org.eclipse.elk.alg.layered.ElkLayered;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.layered.options.WrappingStrategy;
import org.eclipse.elk.alg.layered.options.GraphCompactionStrategy;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.testing.TestController;
import org.eclipse.elk.core.AbstractLayoutProvider;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.ecore.EObject;

abstract class LayeredLoopsVectorsSweep extends LayeredLoopsVectorsBuild {
    // --sweep / --dump (T19, W5)

    static final long CASE_TIMEOUT_SECONDS = 20, CASE_STACK_BYTES = 64L * 1024 * 1024;
    static final String ELKT_EXTENSION = ".elkt", JSON_EXTENSION = ".json", STATUS = "status", KIND_LEVEL = "level", KIND_MODEL = "model";
    static final String VARIANT_DEFAULT = "default", PART_A = "a", PART_B = "b", PART_C = "c", PTOLEMY_DIR = "realworld/ptolemy";
    /** Part (b), the label sweep's enumeration (LayeredLabelsVectors.java --sweep, 7f2 T15): the directories, the variants, the filter. */
    static final List<String> SWEEP_DIRS = List.of("tests/layered", "tickets/layered", "examples");
    static final List<String> SWEEP_VARIANTS = List.of(VARIANT_DEFAULT, "RIGHT", "LEFT", "DOWN", "UP");
    static final java.util.regex.Pattern LABEL_BEARING = java.util.regex.Pattern.compile("label|comment");
    /** Part (a), the pipeline sweep's enumeration (LayeredPipelineVectors.java --sweep, 7f T14): the directions of a whole-model case. */
    static final List<String> MODEL_DIRECTIONS = List.of("RIGHT", "LEFT", "DOWN", "UP");
    /** Part (c): the corpus directories of the option family (the vendored test/golden/inputs/loops/** files are copies of corpus files). */
    static final List<String> OPTION_MODEL_DIRS = List.of("tests/layered/self_loops", "tests/layered/compaction_oned", "tests/layered/connected_components");
    static final String VENDORED_LOOPS = INPUTS + "loops";

    /**
     * One sweep case. Part (a): kind "level" (model = path under the models dir without ".json", target = level node id or null for the
     * root, variant = an EdgeRouting) or "model" (variant = a Direction on the root). Part (b): kind "model", model without ".elkt",
     * variant "default" or a Direction on the root. Part (c): kind "model", model WITH its extension, variant "<option id>=<value>" set on
     * every node with children (the root included).
     */
    record SweepCase(String part, String kind, String model, String target, String variant) {
        String id() {
            if (part.equals(PART_A) && kind.equals(KIND_LEVEL)) {
                return part + "/" + kind + "/" + model + "/" + levelName(target) + "/" + variant;
            }
            return part + "/" + kind + "/" + model + "/" + variant;
        }

        String file() {
            return model + (part.equals(PART_A) ? JSON_EXTENSION : part.equals(PART_B) ? ELKT_EXTENSION : "");
        }
    }

    /** A property setting of the option family. */
    record Setting(IProperty<Object> property, Object value) {
        String variant() {
            return property.getId() + "=" + ((Enum<?>) value).name();
        }
    }

    @SuppressWarnings("unchecked")
    static Setting setting(IProperty<?> property, Object value) {
        return new Setting((IProperty<Object>) property, value);
    }

    /** Part (c)'s options: wrapping.strategy at default cutting, and the two post compaction strategies the vectors do not spread over models. */
    static List<Setting> optionFamily() {
        return List.of(setting(LayeredOptions.WRAPPING_STRATEGY, WrappingStrategy.SINGLE_EDGE),
                setting(LayeredOptions.WRAPPING_STRATEGY, WrappingStrategy.MULTI_EDGE),
                setting(LayeredOptions.COMPACTION_POST_COMPACTION_STRATEGY, GraphCompactionStrategy.EDGE_LENGTH),
                setting(LayeredOptions.COMPACTION_POST_COMPACTION_STRATEGY, GraphCompactionStrategy.LEFT_RIGHT_CONNECTION_LOCKING));
    }

    static Setting settingOf(String variant) {
        return optionFamily().stream().filter(s -> s.variant().equals(variant)).findFirst()
                .orElseThrow(() -> new LayeredLoopsVectors.Bug("no option family member " + variant));
    }

    static ElkNode loadText(String text) {
        return ElkGraphJson.forGraph(text).toElk();
    }

    static ElkNode loadSweepModel(Path modelsDir, SweepCase c) throws IOException {
        return loadAny(modelsDir.resolve(c.file()));
    }

    /** The relative paths (to base, '/'-separated, without the extension when stripExtension) of the files of dir ending in an extension. */
    static List<String> filesUnder(Path base, Path dir, List<String> extensions, boolean stripExtension) throws IOException {
        try (var files = Files.walk(dir)) {
            return files.filter(Files::isRegularFile).filter(p -> extensions.stream().anyMatch(e -> p.toString().endsWith(e)))
                    .map(p -> base.relativize(p).toString().replace('\\', '/'))
                    .map(f -> stripExtension ? f.substring(0, f.lastIndexOf('.')) : f).sorted().toList();
        }
    }

    /** Part (a): every realworld/ptolemy/**.json (the pipeline sweep's models), without the extension. */
    static List<String> ptolemyModels(Path modelsDir) throws IOException {
        return filesUnder(modelsDir, modelsDir.resolve(PTOLEMY_DIR), List.of(JSON_EXTENSION), true);
    }

    /** Whether the models directory holds the model: a model the oracle cannot load is skipped and named on stderr (as the labels sweep). */
    static boolean loadable(Path modelsDir, String file) throws IOException {
        try {
            loadAny(modelsDir.resolve(file));
            return true;
        } catch (RuntimeException | IOException e) {
            System.err.println("skipped model " + file + ": does not load (" + e.getClass().getSimpleName() + ")");
            return false;
        }
    }

    /** Part (b): every label- or comment-bearing .elkt of SWEEP_DIRS, sorted, without the extension (the labels sweep's models). */
    static List<String> sweepModels(Path modelsDir, boolean checkLoad) throws IOException {
        List<String> models = new ArrayList<>();
        for (String dir : SWEEP_DIRS) {
            for (String m : filesUnder(modelsDir, modelsDir.resolve(dir), List.of(ELKT_EXTENSION), true)) {
                if (LABEL_BEARING.matcher(Files.readString(modelsDir.resolve(m + ELKT_EXTENSION), StandardCharsets.UTF_8)).find()) {
                    models.add(m);
                }
            }
        }
        Collections.sort(models);
        List<String> kept = new ArrayList<>();
        for (String m : models) {
            if (!checkLoad || loadable(modelsDir, m + ELKT_EXTENSION)) {
                kept.add(m);
            }
        }
        return kept;
    }

    /**
     * Part (c): the corpus directories of OPTION_MODEL_DIRS, the vendored test/golden/inputs/loops files (copies of corpus files, read from the
     * models directory, which must hold them) and every ptolemy .json, with the extension, sorted.
     */
    static List<String> optionModels(Path modelsDir, boolean checkLoad) throws IOException {
        TreeSet<String> files = new TreeSet<>();
        for (String dir : OPTION_MODEL_DIRS) {
            files.addAll(filesUnder(modelsDir, modelsDir.resolve(dir), List.of(ELKT_EXTENSION), false));
        }
        Path vendored = REPO.resolve(VENDORED_LOOPS);
        for (String f : filesUnder(vendored, vendored, List.of(ELKT_EXTENSION, JSON_EXTENSION), false)) {
            if (!Files.isRegularFile(modelsDir.resolve(f))) {
                throw new LayeredLoopsVectors.Bug("vendored " + VENDORED_LOOPS + "/" + f + " has no counterpart in the models directory");
            }
            files.add(f);
        }
        files.addAll(filesUnder(modelsDir, modelsDir.resolve(PTOLEMY_DIR), List.of(JSON_EXTENSION), false));
        List<String> kept = new ArrayList<>();
        for (String f : files) {
            if (!checkLoad || loadable(modelsDir, f)) {
                kept.add(f);
            }
        }
        return kept;
    }

    /** Levels of part (a): null (root), then every ElkNode with children and a unique id (the pipeline sweep's rule). */
    static List<String> sweepTargets(String text, String model) {
        List<String> targets = new ArrayList<>();
        targets.add(null);
        for (TreeIterator<EObject> it = loadText(text).eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                if (n.getIdentifier() == null || targets.contains(n.getIdentifier())) {
                    System.err.println("skipped level of " + model + ": node id " + n.getIdentifier() + " is missing or not unique");
                } else {
                    targets.add(n.getIdentifier());
                }
            }
        }
        return targets;
    }

    /** Part (a): the pipeline sweep's cases of one ptolemy model: every edge-bearing level x the routings, the whole model x the directions. */
    static List<SweepCase> pipelineCases(String model, String text) {
        List<SweepCase> out = new ArrayList<>();
        for (String t : sweepTargets(text, model)) {
            if (new Base(new ElkGraphTransformer().importGraph(importTarget(loadText(text), t))).edges.isEmpty()) {
                System.err.println("skipped level " + model + " " + levelName(t) + " (no edges)");
                continue;
            }
            for (EdgeRouting r : ROUTINGS) {
                out.add(new SweepCase(PART_A, KIND_LEVEL, model, t, r.name()));
            }
        }
        for (String d : MODEL_DIRECTIONS) {
            out.add(new SweepCase(PART_A, KIND_MODEL, model, null, d));
        }
        return out;
    }

    /** The models of a part (checkLoad: skip and name the ones the oracle cannot load; the dump mode keeps them to find its case). */
    static List<String> modelsOf(String part, Path modelsDir, boolean checkLoad) throws IOException {
        return switch (part) {
            case PART_A -> ptolemyModels(modelsDir);
            case PART_B -> sweepModels(modelsDir, checkLoad);
            case PART_C -> optionModels(modelsDir, checkLoad);
            default -> throw new LayeredLoopsVectors.Bug("no sweep part " + part);
        };
    }

    /** The cases of one model of a part. */
    static List<SweepCase> casesOf(String part, String model, Path modelsDir) throws IOException {
        List<SweepCase> out = new ArrayList<>();
        switch (part) {
            case PART_A -> out.addAll(pipelineCases(model, Files.readString(modelsDir.resolve(model + JSON_EXTENSION), StandardCharsets.UTF_8)));
            case PART_B -> SWEEP_VARIANTS.forEach(v -> out.add(new SweepCase(PART_B, KIND_MODEL, model, null, v)));
            default -> optionFamily().forEach(s -> out.add(new SweepCase(PART_C, KIND_MODEL, model, null, s.variant())));
        }
        return out;
    }

    /** The IEEE-754 bits of a double as 16 lowercase hex digits (the pipeline sweep's hx), with every NaN as the one canonical NaN
     * 7ff8000000000000 (Double.doubleToLongBits): a NaN is a value of the sweep, but the sign bit of a NaN the JVM computes differs
     * between the interpreter and compiled code, so the raw bits of one case changed from run to run (journal, T19). Every other
     * value keeps its raw bits. */
    static String rawHex(double d) {
        return String.format("%016x", Double.doubleToLongBits(d));
    }

    static List<Object> box(org.eclipse.elk.graph.ElkShape s) {
        return List.of(rawHex(s.getX()), rawHex(s.getY()), rawHex(s.getWidth()), rawHex(s.getHeight()));
    }

    static List<Object> labelsOf(ElkGraphElement e) {
        List<Object> out = new ArrayList<>();
        e.getLabels().forEach(l -> out.add(box(l)));
        return out;
    }

    static List<Object> point(double x, double y) {
        return List.of(rawHex(x), rawHex(y));
    }

    static Map<String, Object> edgeDump(ElkEdge e) {
        Map<String, Object> m = new TreeMap<>();
        m.put("id", e.getIdentifier());
        List<Object> sections = new ArrayList<>();
        e.getSections().forEach(sec -> {
            Map<String, Object> s = new TreeMap<>();
            s.put("start", point(sec.getStartX(), sec.getStartY()));
            s.put("end", point(sec.getEndX(), sec.getEndY()));
            List<Object> bends = new ArrayList<>();
            sec.getBendPoints().forEach(b -> bends.add(point(b.getX(), b.getY())));
            s.put("bends", bends);
            sections.add(s);
        });
        m.put("sections", sections);
        List<Object> junctions = new ArrayList<>();
        e.getProperty(CoreOptions.JUNCTION_POINTS).forEach(v -> junctions.add(point(v.x, v.y)));
        m.put("junctions", junctions);
        m.put("labels", labelsOf(e));
        return m;
    }

    /** The canonical tree of a laid-out ElkGraph subtree (7f's elkDump): ids, boxes, labels, ports, children, contained edges. */
    static Map<String, Object> elkDump(ElkNode n) {
        Map<String, Object> m = new TreeMap<>();
        m.put("id", n.getIdentifier());
        m.put("box", box(n));
        m.put("labels", labelsOf(n));
        List<Object> ports = new ArrayList<>();
        n.getPorts().forEach(p -> {
            Map<String, Object> pm = new TreeMap<>();
            pm.put("id", p.getIdentifier());
            pm.put("box", box(p));
            pm.put("labels", labelsOf(p));
            ports.add(pm);
        });
        m.put("ports", ports);
        List<Object> children = new ArrayList<>();
        n.getChildren().forEach(c -> children.add(elkDump(c)));
        m.put("children", children);
        List<Object> edges = new ArrayList<>();
        n.getContainedEdges().forEach(e -> edges.add(edgeDump(e)));
        m.put("edges", edges);
        return m;
    }

    /** Every ElkNode of the tree, the root first. */
    static List<ElkNode> nodesOf(ElkNode root) {
        List<ElkNode> nodes = new ArrayList<>();
        nodes.add(root);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n) {
                nodes.add(n);
            }
        }
        return nodes;
    }

    /** Scope (W5): the whole plan of some level holds one of the nine arms, or a node has COMPACTION_CONNECTED_COMPONENTS on. */
    static boolean inScope(List<List<String>> plans, List<ElkNode> nodes) {
        return plans.stream().anyMatch(plan -> plan.stream().anyMatch(SEVEN_G::contains))
                || nodes.stream().anyMatch(n -> n.getProperty(LayeredOptions.COMPACTION_CONNECTED_COMPONENTS));
    }

    /** The first member of the plans outside the ported sets (7h's categories, or a stop of the sweep), as a Refusal. */
    static void refuseUnported(SweepCase c, List<List<String>> plans) {
        for (List<String> plan : plans) {
            for (String name : plan) {
                if (!allowed(name)) {
                    throw new LayeredLoopsVectors.Refusal("case " + c.id() + " names " + name, name);
                }
            }
        }
    }

    /** A level of part (a): the pipeline sweep's flow (import the level, ElkLayered.doLayout, applyLayout), the plan checked first. */
    static Map<String, Object> levelCanonical(SweepCase c, Path modelsDir, boolean scoped) throws IOException {
        ElkNode probe = importTarget(loadSweepModel(modelsDir, c), c.target());
        probe.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.valueOf(c.variant()));
        ElkLayered planner = new ElkLayered();
        List<List<String>> plans = List.of(positionalNames(planner.getLayoutTestConfiguration(
                planner.prepareLayoutTest(new ElkGraphTransformer().importGraph(probe)))));
        if (scoped && !inScope(plans, List.of(probe))) {
            throw new LayeredLoopsVectors.OutOfScope("no arm in the plan");
        }
        refuseUnported(c, plans);
        ElkNode level = importTarget(loadSweepModel(modelsDir, c), c.target());
        level.setProperty(CoreOptions.EDGE_ROUTING, EdgeRouting.valueOf(c.variant()));
        ElkGraphTransformer transformer = new ElkGraphTransformer();
        LGraph lgraph = transformer.importGraph(level);
        new ElkLayered().doLayout(lgraph, new BasicProgressMonitor().withMaxHierarchyLevels(0));
        transformer.applyLayout(lgraph);
        return elkDump(level);
    }

    /** The options of the case on the model: a direction on the root (parts a, b), or the option family member on every level (part c). */
    static void configure(SweepCase c, ElkNode root) {
        if (c.part().equals(PART_C)) {
            Setting s = settingOf(c.variant());
            for (ElkNode n : nodesOf(root)) {
                if (n == root || !n.getChildren().isEmpty()) {
                    n.setProperty(s.property(), s.value());
                }
            }
        } else if (!c.variant().equals(VARIANT_DEFAULT)) {
            root.setProperty(CoreOptions.DIRECTION, org.eclipse.elk.core.options.Direction.valueOf(c.variant()));
        }
    }

    /** The whole model through the recursive engine; the whole plan of every level decides scope and refusal (G2). */
    static Map<String, Object> modelCanonical(SweepCase c, Path modelsDir, boolean scoped) throws IOException {
        ElkNode root = loadSweepModel(modelsDir, c);
        configure(c, root);
        boolean sieved = scoped && !c.part().equals(PART_C);
        try {
            refuseOptions(root);
        } catch (LayeredLoopsVectors.Refusal r) { // INCLUDE_CHILDREN: the plan is never built, so only a connectedComponents option can put the case in scope
            if (sieved && !inScope(List.of(), nodesOf(root))) {
                throw new LayeredLoopsVectors.OutOfScope("refused by option before any plan (" + r.member + ")");
            }
            throw r;
        }
        PlanRecorder recorder = new PlanRecorder();
        TestController controller = new TestController(LayeredOptions.ALGORITHM_ID);
        controller.addLayoutExecutionListener(recorder);
        var pool = LayoutMetaDataService.getInstance().getAlgorithmData(LayeredOptions.ALGORITHM_ID).getInstancePool();
        AbstractLayoutProvider provider = pool.fetch();
        controller.install(provider);
        pool.release(provider);
        List<List<String>> plans = new ArrayList<>();
        try {
            new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
        } catch (RuntimeException | Error e) { // a throw is in scope when the plans recorded up to it hold an arm (none: no layered level ran)
            recorder.processors.values().forEach(plan -> plans.add(positionalNames(plan)));
            if (sieved && !inScope(plans, nodesOf(root))) {
                throw new LayeredLoopsVectors.OutOfScope("threw before the plans held an arm (" + e.getClass().getSimpleName() + ")");
            }
            throw e;
        } finally {
            controller.uninstall();
        }
        recorder.processors.values().forEach(plan -> plans.add(positionalNames(plan)));
        if (sieved && !inScope(plans, nodesOf(root))) {
            throw new LayeredLoopsVectors.OutOfScope("no arm in the plans");
        }
        refuseUnported(c, plans);
        return elkDump(root);
    }

    /** Runs the case on a thread with a big stack; null when the timeout fires. */
    static Map<String, Object> runCase(SweepCase c, Path modelsDir, boolean scoped) throws Throwable {
        java.util.concurrent.FutureTask<Map<String, Object>> task = new java.util.concurrent.FutureTask<>(() -> {
            currentRow = c.id();
            return c.kind().equals(KIND_LEVEL) ? levelCanonical(c, modelsDir, scoped) : modelCanonical(c, modelsDir, scoped);
        });
        Thread t = new Thread(null, task, "case", CASE_STACK_BYTES);
        t.setDaemon(true);
        t.start();
        try {
            return task.get(CASE_TIMEOUT_SECONDS, java.util.concurrent.TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            t.interrupt();
            return null;
        } catch (java.util.concurrent.ExecutionException e) {
            throw e.getCause();
        }
    }

    static void describe(Map<String, Object> m, SweepCase c) {
        m.put("part", c.part());
        m.put("kind", c.kind());
        m.put("model", c.model());
        m.put("target", c.target());
        m.put("variant", c.variant());
    }

    /** The first org.eclipse.elk frame of a throwable as "File.java:line", or null (Errors and exceptions thrown outside ELK have none). */
    static String elkFrameOf(Throwable e) {
        StackTraceElement f = e instanceof RuntimeException re ? elkFrame(re) : null;
        return f == null ? null : f.getFileName() + ":" + f.getLineNumber();
    }

    /** One line of the sweep, or a STATUS_OUT_OF_SCOPE map (not written) for a case outside scope. A refusal outside 7h's categories stops the sweep naming the case. */
    static final String STATUS_OUT_OF_SCOPE = "out-of-scope";
    /** Diagnosis aid: LOOPS_SWEEP_ONLY=<regex> runs only the sweep cases whose id contains a match (the stamp of loops-sweep.sh does not cover it: rerun with --force). */
    /** Diagnosis aid: LOOPS_SWEEP_DUMP_DIR=<dir> also writes the canonical form of every ok sweep case whose id matches LOOPS_SWEEP_DUMP_MATCH (default all) there. */
    static final String SWEEP_DUMP_DIR = System.getenv("LOOPS_SWEEP_DUMP_DIR");
    static final java.util.regex.Pattern SWEEP_DUMP_MATCH = java.util.regex.Pattern.compile(System.getenv().getOrDefault("LOOPS_SWEEP_DUMP_MATCH", ""));
    static final java.util.regex.Pattern SWEEP_ONLY = System.getenv("LOOPS_SWEEP_ONLY") == null ? null : java.util.regex.Pattern.compile(System.getenv("LOOPS_SWEEP_ONLY"));

    static Map<String, Object> sweepOutcome(SweepCase c, Path modelsDir) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.id());
        try {
            Map<String, Object> dump = runCase(c, modelsDir, true);
            if (dump == null) {
                m.put(STATUS, "timeout");
                return m;
            }
            describe(m, c);
            m.put("sha256", sha256Text(canonicalText(dump)));
            if (SWEEP_DUMP_DIR != null && SWEEP_DUMP_MATCH.matcher(c.id()).find()) {
                Files.createDirectories(Path.of(SWEEP_DUMP_DIR));
                Files.writeString(Path.of(SWEEP_DUMP_DIR, c.id().replace('/', '_') + ".json"), canonicalText(dump) + "\n", StandardCharsets.UTF_8);
            }
        } catch (LayeredLoopsVectors.OutOfScope s) {
            m.put(STATUS, STATUS_OUT_OF_SCOPE);
            m.put("reason", s.getMessage());
            return m;
        } catch (LayeredLoopsVectors.Refusal r) {
            if (!REFUSAL_CATEGORIES.containsKey(r.member)) {
                throw new LayeredLoopsVectors.Bug("refusal outside 7h (stop): " + c.id() + " names " + r.member);
            }
            m.put(STATUS, "refused");
            m.put("part", c.part());
            m.put("processor", r.member);
            m.put("category", REFUSAL_CATEGORIES.get(r.member));
        } catch (Throwable e) {
            m.put(STATUS, "throws");
            describe(m, c);
            m.put("class", e.getClass().getSimpleName());
            m.put("message", String.valueOf(e.getMessage()));
            String frame = elkFrameOf(e);
            if (frame != null) {
                m.put("frame", frame);
            }
            System.err.println("ORACLE THROWS " + c.id() + " " + e.getClass().getSimpleName() + ": " + e.getMessage() + " at " + frame);
        }
        return m;
    }

    static String sha256Text(String s) {
        try {
            StringBuilder sb = new StringBuilder();
            for (byte b : MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8))) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String canonicalText(Object v) {
        StringBuilder sb = new StringBuilder();
        canonicalInto(sb, v);
        return sb.toString();
    }

    /** Compact JSON as JSON.stringify writes it, object keys sorted (the TS side: layered-phase-sweep.ts canonical). */
    static void canonicalInto(StringBuilder sb, Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof String s) {
            canonicalString(sb, s);
        } else if (v instanceof Map<?, ?> m) {
            TreeMap<String, Object> sorted = new TreeMap<>();
            m.forEach((k, x) -> sorted.put((String) k, x));
            sb.append('{');
            int i = 0;
            for (Map.Entry<String, Object> e : sorted.entrySet()) {
                sb.append(i++ == 0 ? "" : ",");
                canonicalString(sb, e.getKey());
                sb.append(':');
                canonicalInto(sb, e.getValue());
            }
            sb.append('}');
        } else if (v instanceof List<?> l) {
            sb.append('[');
            for (int i = 0; i < l.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                canonicalInto(sb, l.get(i));
            }
            sb.append(']');
        } else {
            throw new LayeredLoopsVectors.Bug("uncanonical value of class " + v.getClass().getName());
        }
    }

    /** A JSON string literal as JSON.stringify writes it (well-formed: a lone surrogate becomes \\udxxx). */
    static void canonicalString(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (ch < 0x20) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else if (Character.isHighSurrogate(ch) && i + 1 < s.length() && Character.isLowSurrogate(s.charAt(i + 1))) {
                        sb.append(ch).append(s.charAt(++i));
                    } else if (Character.isSurrogate(ch)) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else {
                        sb.append(ch);
                    }
                }
            }
        }
        sb.append('"');
    }

    /** Counters of a sweep, keyed by part: statuses, cases outside scope, refusals per category, throws per class and ELK frame. */
    static final class SweepStats {
        final Map<String, Integer> counts = new TreeMap<>(), outOfScope = new TreeMap<>(), refusals = new TreeMap<>(), throwsBy = new TreeMap<>();

        void add(SweepCase c, Map<String, Object> m) {
            String status = String.valueOf(m.getOrDefault(STATUS, "ok"));
            if (status.equals(STATUS_OUT_OF_SCOPE)) {
                outOfScope.merge(c.part() + " " + m.get("reason"), 1, Integer::sum);
                return;
            }
            counts.merge(c.part() + " " + status, 1, Integer::sum);
            if (status.equals("refused")) {
                refusals.merge(c.part() + " " + m.get("category") + " " + m.get("processor"), 1, Integer::sum);
            } else if (status.equals("throws")) {
                throwsBy.merge(c.part() + " " + m.get("class") + " " + m.get("frame"), 1, Integer::sum);
            }
        }
    }

    static void sweep(Path modelsDir, Path outDir) throws IOException {
        Files.createDirectories(outDir);
        SweepStats stats = new SweepStats();
        long start = System.currentTimeMillis();
        try (var out = Files.newBufferedWriter(outDir.resolve("results.jsonl"), StandardCharsets.UTF_8)) {
            for (String part : List.of(PART_A, PART_B, PART_C)) {
                List<SweepCase> cases = new ArrayList<>();
                for (String model : modelsOf(part, modelsDir, true)) {
                    cases.addAll(casesOf(part, model, modelsDir));
                }
                System.err.println("part " + part + ": " + cases.size() + " candidate cases");
                for (int i = 0; i < cases.size(); i++) {
                    if (SWEEP_ONLY != null && !SWEEP_ONLY.matcher(cases.get(i).id()).find()) {
                        continue;
                    }
                    Map<String, Object> m = sweepOutcome(cases.get(i), modelsDir);
                    stats.add(cases.get(i), m);
                    if (!STATUS_OUT_OF_SCOPE.equals(m.get(STATUS))) {
                        out.write(json(m));
                        out.write('\n');
                    }
                    if ((i + 1) % 250 == 0 || i + 1 == cases.size()) {
                        out.flush();
                        System.err.println("part " + part + " " + (i + 1) + "/" + cases.size() + " " + (System.currentTimeMillis() - start) / 1000 + " s "
                                + stats.counts);
                    }
                }
            }
        }
        System.err.println("sweep done " + stats.counts + " in " + (System.currentTimeMillis() - start) / 1000 + " s");
        System.err.println("out of scope (dropped) " + stats.outOfScope);
        System.err.println("refusals " + stats.refusals);
        System.err.println("throws " + stats.throwsBy);
    }

    /** Writes the canonical form of one case (the text the hash is taken over) to <outDir>/<id with / as _>.json. */
    static void dump(String id, Path modelsDir, Path outDir) throws Throwable {
        String part = id.substring(0, 1);
        for (String model : modelsOf(part, modelsDir, false)) {
            if (!id.startsWith(part + "/" + KIND_MODEL + "/" + model + "/") && !id.startsWith(part + "/" + KIND_LEVEL + "/" + model + "/")) {
                continue;
            }
            for (SweepCase c : casesOf(part, model, modelsDir)) {
                if (!c.id().equals(id)) {
                    continue;
                }
                Map<String, Object> dump;
                try {
                    dump = runCase(c, modelsDir, false);
                } catch (LayeredLoopsVectors.Refusal r) {
                    System.err.println("case " + id + " is refused: " + r.getMessage());
                    System.exit(1);
                    return;
                }
                if (dump == null) {
                    throw new LayeredLoopsVectors.Bug("case " + id + " times out");
                }
                Files.createDirectories(outDir);
                Path file = outDir.resolve(id.replace('/', '_') + ".json");
                Files.writeString(file, canonicalText(dump) + "\n", StandardCharsets.UTF_8);
                System.err.println("wrote " + file);
                return;
            }
        }
        throw new LayeredLoopsVectors.Bug("no sweep case has the id " + id);
    }

    static void sweepMain(String[] args) throws Throwable {
        setup(null);
        REPO = Path.of("").toAbsolutePath().normalize(); // part (c) reads the vendored file list under the repository root
        if (!Files.isDirectory(REPO.resolve(VENDORED_LOOPS))) {
            throw new IllegalStateException("run from the repository root (no " + VENDORED_LOOPS + " under " + REPO + ")");
        }
        buildProcessorNames();
        if (args.length == 3 && args[0].equals("--sweep")) {
            sweep(Path.of(args[1]), Path.of(args[2]));
        } else if (args.length == 4 && args[0].equals("--dump")) {
            dump(args[1], Path.of(args[2]), Path.of(args[3]));
        } else {
            throw new IllegalArgumentException("usage: --sweep <modelsDir> <outDir> | --dump <case id> <modelsDir> <outDir>");
        }
        System.exit(0);
    }
}
