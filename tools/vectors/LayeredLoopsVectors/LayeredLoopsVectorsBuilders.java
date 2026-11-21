// SPDX-License-Identifier: EPL-2.0
// Helper 5 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the levels, the step and ELK JSON builders, PlanRecorder and the full runs.
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import java.util.*;
import org.eclipse.elk.alg.layered.ElkLayered;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
import org.eclipse.elk.alg.layered.options.InternalProperties;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.alg.ILayoutProcessor;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.options.HierarchyHandling;
import org.eclipse.elk.core.testing.TestController;
import org.eclipse.elk.core.AbstractLayoutProvider;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.elk.alg.layered.InteractiveLayeredGraphVisitor;
import org.eclipse.elk.core.util.IElkProgressMonitor;

abstract class LayeredLoopsVectorsBuilders extends LayeredLoopsVectorsSteps {
    /** A hierarchy level: its target id (null = root) and the node and edge counts of its flat import. */
    record Level(String target, int nodes, int edges) { }

    /** Every level (an ElkNode with children, pre-order) of the file; levels without edges are skipped (stderr). */
    static List<Level> levels(ModelFile f) {
        ElkNode root = loadFile(f.rel);
        List<String> targets = new ArrayList<>();
        targets.add(null);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                if (n.getIdentifier() == null || targets.contains(n.getIdentifier())) {
                    throw new LayeredLoopsVectors.Bug(f.rel + ": node id " + n.getIdentifier() + " is missing or not unique");
                }
                targets.add(n.getIdentifier());
            }
        }
        List<Level> levels = new ArrayList<>();
        for (String t : targets) {
            Base b = new Base(new ElkGraphTransformer().importGraph(importTarget(loadFile(f.rel), t)));
            if (b.edges.isEmpty()) {
                System.err.println("skipped level " + f.id + " " + (t == null ? "root" : t) + " (no edges)");
            } else {
                levels.add(new Level(t, b.nodes.size(), b.edges.size()));
            }
        }
        return levels;
    }

    static TreeMap<String, Object> opts(Object... kv) {
        TreeMap<String, Object> m = new TreeMap<>();
        m.put(pid("SEPARATE_CONNECTED_COMPONENTS"), Z(false));
        requirePairs(kv.length);
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(pid((String) kv[i]), kv[i + 1]);
        }
        return m;
    }

    static Map<String, Object> D(double d) {
        return tv("double", Double.toString(d));
    }

    static String levelName(String target) {
        return target == null ? "root" : target;
    }

    static Spec pipeline(ModelFile f, String target, String stop, String variant, TreeMap<String, Object> options) {
        return new Spec("models/" + f.id + "/" + levelName(target) + "/" + stop + "/" + variant, "models", f.rel, null, target, options, stop, null, null);
    }

    static List<Object> S(Object... a) {
        return new ArrayList<>(Arrays.asList(a));
    }

    @SafeVarargs
    static List<Object> steps(List<Object>... s) {
        return new ArrayList<>(Arrays.asList(s));
    }

    static List<Object> imp(String target) {
        return S("importGraph", target);
    }

    static List<Object> norm() {
        return S("normalise");
    }

    static List<Object> dump() {
        return S("dump");
    }

    static List<Object> set(String path, String constant, Object c4) {
        return S("setProperty", path, pid(constant), c4);
    }

    static List<Object> phase(String phase, String strategy) {
        return S("runPhase", phase, strategy);
    }

    static List<Object> proc(String member) {
        return S("runProcessor", member);
    }

    /** Root layout options as JSON members: constant name, value string, ... */
    static String ropts(String... kv) {
        StringBuilder sb = new StringBuilder();
        requirePairs(kv.length);
        for (int i = 0; i + 1 < kv.length; i += 2) {
            sb.append(sb.length() == 0 ? "" : ",").append('"').append(pid(kv[i])).append("\":\"").append(kv[i + 1]).append('"');
        }
        return sb.toString();
    }

    static String nodeJson(String id, double[] pos, String optsJson, String extra) {
        return "{\"id\":\"" + id + "\",\"width\":30,\"height\":30"
                + (pos == null ? "" : ",\"x\":" + pos[0] + ",\"y\":" + pos[1])
                + (optsJson == null || optsJson.isEmpty() ? "" : ",\"layoutOptions\":{" + optsJson + "}")
                + (extra == null ? "" : "," + extra) + "}";
    }

    static String edgesJson(String idPrefix, int[][] edges) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < edges.length; i++) {
            sb.append(i == 0 ? "" : ",").append("{\"id\":\"").append(idPrefix).append(i).append("\",\"sources\":[\"n")
                    .append(edges[i][0]).append("\"],\"targets\":[\"n").append(edges[i][1]).append("\"]}");
        }
        return sb.toString();
    }

    /** A flat graph: root options, n nodes n0.., optional positions, edges e0.. between n<a> and n<b>. */
    static String gj(String rootOpts, int n, double[][] pos, int[][] edges, Map<Integer, String> nodeOpts) {
        StringBuilder sb = new StringBuilder("{\"id\":\"root\",\"layoutOptions\":{" + rootOpts + "},\"children\":[");
        for (int i = 0; i < n; i++) {
            sb.append(i == 0 ? "" : ",").append(nodeJson("n" + i, pos == null ? null : pos[i], nodeOpts == null ? null : nodeOpts.get(i), null));
        }
        return sb.append("],\"edges\":[").append(edgesJson("e", edges)).append("]}").toString();
    }


    // Builders copied from LayeredRoutingVectors.java (7e lines 1,860-1,912 and 2,164-2,181)

    /** Edges e0..: "a>b" or "a>b:CONSTANT=value" (one option). */
    static String eds(String... spec) {
        return edsFrom(0, spec);
    }

    /** Like eds with edge ids e<first>, e<first+1>, ... */
    static String edsFrom(int first, String... spec) {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < spec.length; i++) {
            String[] opt = spec[i].split(":"), end = opt[0].split(">");
            out.add("{\"id\":\"e" + (first + i) + "\",\"sources\":[\"" + end[0] + "\"],\"targets\":[\"" + end[1] + "\"]"
                    + (opt.length > 1 ? ",\"layoutOptions\":{" + ropts(opt[1].split("=")) + "}" : "") + "}");
        }
        return String.join(",", out);
    }

    static String flat(String rootOpts, String kids, String edges) {
        return "{\"id\":\"root\",\"layoutOptions\":{" + rootOpts + "},\"children\":[" + kids + "],\"edges\":[" + edges + "]}";
    }

    static String pj(String node, int index, String side, double[] xy) {
        return "{\"id\":\"" + node + ".p" + index + "\",\"width\":4,\"height\":4"
                + (xy == null ? "" : ",\"x\":" + xy[0] + ",\"y\":" + xy[1]) + ",\"layoutOptions\":{"
                + (side == null ? "" : "\"" + pid("PORT_SIDE") + "\":\"" + side + "\",") + "\"" + pid("PORT_INDEX") + "\":\""
                + index + "\"}}";
    }

    /** A node with ports of the given sides (ids <id>.p0, <id>.p1, ...); pc and pos may be null. */
    static String pnode(String id, String pc, double[] pos, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj(id, i, sides[i], null));
        }
        return nodeJson(id, pos, pc == null ? null : ropts("PORT_CONSTRAINTS", pc), "\"ports\":[" + String.join(",", ports) + "]");
    }

    static String plain(String id) {
        return nodeJson(id, null, null, null);
    }

    static String at(String id, double x, double y) {
        return nodeJson(id, new double[] {x, y}, null, null);
    }

    static String join(String... parts) {
        return String.join(",", parts);
    }

    static final String FS = "FIXED_SIDE", FP = "FIXED_POS", E_ = "EAST", W_ = "WEST", N_ = "NORTH", S_ = "SOUTH";

    static String kn(String id, int w, int h, String extra, String... opts) {
        return sz(nodeJson(id, null, opts.length == 0 ? null : ropts(opts), extra), w, h);
    }

    static String sz(String node, int w, int h) {
        return node.replace("\"width\":30,\"height\":30", "\"width\":" + w + ",\"height\":" + h);
    }


    // Group full (F4): the whole recursive layout and the plan of every level

    /** The level path of an ELK node: the ids from the root down joined by "/", a missing id as the empty string. */
    static String levelPath(ElkNode n) {
        LinkedList<String> ids = new LinkedList<>();
        for (ElkNode c = n; c != null; c = c.getParent()) {
            ids.addFirst(c.getIdentifier() == null ? "" : c.getIdentifier());
        }
        return String.join("/", ids);
    }

    /** Records the processors ElkLayered runs on every level (the first component graph of the level), in order. */
    static final class PlanRecorder implements TestController.ILayoutExecutionListener {
        final Map<ElkNode, List<Object>> processors = new LinkedHashMap<>();
        final Map<ElkNode, LGraph> first = new IdentityHashMap<>();

        @Override
        public void layoutProcessorReady(ILayoutProcessor<?> processor, Object graph, boolean isRoot) {
            LGraph g = (LGraph) graph;
            if (!(g.getProperty(InternalProperties.ORIGIN) instanceof ElkNode level)) {
                throw new LayeredLoopsVectors.Bug("row " + currentRow + ": a laid-out graph without an ElkNode origin");
            }
            LGraph owner = first.computeIfAbsent(level, k -> g);
            if (owner == g) {
                processors.computeIfAbsent(level, k -> new ArrayList<>()).add(processor);
            }
        }

        @Override
        public void layoutProcessorFinished(ILayoutProcessor<?> processor, Object graph, boolean isRoot) {
            // nothing to record
        }

        /** level path -> positional member names (F4), in layout order. */
        Map<String, Object> plans() {
            Map<String, Object> plans = new LinkedHashMap<>();
            for (Map.Entry<ElkNode, List<Object>> e : processors.entrySet()) {
                if (plans.put(levelPath(e.getKey()), new ArrayList<Object>(positionalNames(e.getValue()))) != null) {
                    throw new LayeredLoopsVectors.Bug("row " + currentRow + ": level path " + levelPath(e.getKey()) + " is not unique");
                }
            }
            return plans;
        }
    }

    /** Refusals by option: INCLUDE_CHILDREN (7h; COMPACTION_CONNECTED_COMPONENTS is accepted since 7g, W3); a random seed of 0 is a stop. */
    static void refuseOptions(ElkNode root) {
        List<ElkNode> nodes = new ArrayList<>();
        nodes.add(root);
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n) {
                nodes.add(n);
            }
        }
        for (ElkNode n : nodes) {
            if (n.getProperty(CoreOptions.HIERARCHY_HANDLING) == HierarchyHandling.INCLUDE_CHILDREN) {
                throw new LayeredLoopsVectors.Refusal("row " + currentRow + ": INCLUDE_CHILDREN at " + levelPath(n), "INCLUDE_CHILDREN");
            }
            if (!n.getChildren().isEmpty() && Integer.valueOf(0).equals(n.getProperty(LayeredOptions.RANDOM_SEED))) {
                throw new LayeredLoopsVectors.Bug("row " + currentRow + ": random seed 0 (stop condition) at " + levelPath(n));
            }
        }
    }
    /** One recursive layout of root with the plans of every level recorded (as 7f's runFull); the whole plan decides the refusal (G2). */
    static Map<String, Object> layoutOnce(Spec s, ElkNode root, IElkProgressMonitor monitor) {
        PlanRecorder recorder = new PlanRecorder();
        TestController controller = new TestController(LayeredOptions.ALGORITHM_ID);
        controller.addLayoutExecutionListener(recorder);
        var pool = LayoutMetaDataService.getInstance().getAlgorithmData(LayeredOptions.ALGORITHM_ID).getInstancePool();
        AbstractLayoutProvider provider = pool.fetch();
        controller.install(provider);
        pool.release(provider);
        try {
            new RecursiveGraphLayoutEngine().layout(root, monitor);
        } finally {
            controller.uninstall();
        }
        Map<String, Object> plans = recorder.plans();
        for (Map.Entry<String, Object> e : plans.entrySet()) {
            for (Object name : (List<?>) e.getValue()) {
                if (!allowed((String) name)) {
                    throw new LayeredLoopsVectors.Refusal("row " + s.id() + ": level " + e.getKey() + " names " + name + ", outside the ported sets", (String) name);
                }
            }
        }
        return plans;
    }

    /** A full row: options on the root, the recursive engine, the export and the plan of every level; modes "interactive" and "logging". */
    static Result runFull(Spec s, ElkNode root) {
        currentRow = s.id();
        s.options().forEach((id, c4) -> setProperty(root, id, c4));
        refuseOptions(root);
        Map<String, Object> expected = new LinkedHashMap<>();
        BasicProgressMonitor monitor = new BasicProgressMonitor();
        if ("logging".equals(s.mode())) {
            monitor.withLogging(true);
        }
        Map<String, Object> plans = layoutOnce(s, root, monitor);
        if ("interactive".equals(s.mode())) { // G5: lay out, apply the visitor, lay out again
            expected.put("layout1", new Raw(export(root)));
            new InteractiveLayeredGraphVisitor().visit(root);
            plans = layoutOnce(s, root, new BasicProgressMonitor());
        }
        expected.put("layout", new Raw(export(root)));
        expected.put("plans", plans);
        if ("logging".equals(s.mode())) {
            expected.put("logged", logged(monitor));
        }
        return new Result(expected, null);
    }

    /** Options of a full row: pairs of (Java constant name, C4 value); no default is added (components stay on). */
    static TreeMap<String, Object> fopts(Object... kv) {
        TreeMap<String, Object> m = new TreeMap<>();
        requirePairs(kv.length);
        for (int i = 0; i + 1 < kv.length; i += 2) {
            m.put(pid((String) kv[i]), kv[i + 1]);
        }
        return m;
    }

    /** The names of the processors the assembled algorithm of the level holds (one import, nothing run), GraphTransformer by position. */
    static List<String> planNames(ModelFile f, String target, TreeMap<String, Object> options) {
        ElkNode t = importTarget(loadFile(f.rel), target);
        options.forEach((id, c4) -> setProperty(t, id, c4));
        LGraph g = new ElkGraphTransformer().importGraph(t);
        ElkLayered layered = new ElkLayered();
        return positionalNames(layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g)));
    }

    // Model files: the table is the list (every entry is a label- or comment-bearing model of the labels family)

    /** rel = repo-relative path of the vendored file; model = its path in the models repository (after inputs/ and labels/). */
    record ModelFile(String id, String rel, String model) { }

    /** The id of a model: tests/layered/<dir>/<name>.elkt -> "<dir>-<name>", tickets -> "ticket-<name>", examples -> "examples-<dir>-<name>". */
    static String modelId(String model) {
        String id;
        if (model.startsWith("tests/layered/")) {
            id = model.substring("tests/layered/".length());
        } else if (model.startsWith("tickets/layered/")) {
            id = "ticket-" + model.substring("tickets/layered/".length());
        } else if (model.startsWith("examples/")) {
            id = model;
        } else if (model.startsWith("realworld/ptolemy/")) { // ptolemy-<last token of the file name, lower case>, as the pipeline recorder
            String name = model.substring(model.lastIndexOf('/') + 1).replaceAll("\\.json$", "");
            return "ptolemy-" + name.substring(name.lastIndexOf('_') + 1).toLowerCase();
        } else {
            throw new LayeredLoopsVectors.Bug("model " + model + " is outside tests/layered, tickets/layered, examples and realworld/ptolemy");
        }
        return id.replace('/', '-').replaceAll("\\.elkt$", "");
    }

    static List<ModelFile> modelFiles() {
        List<ModelFile> files = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        for (String line : LayeredLoopsVectors.MODEL_TABLE.split("\n")) {
            String l = line.strip();
            if (l.isEmpty()) {
                continue;
            }
            String rel = l.substring(l.indexOf(REPO_PREFIX) + REPO_PREFIX.length());
            String model = rel.substring(INPUTS.length());
            for (String root : INPUT_ROOTS) {
                if (model.startsWith(root)) {
                    model = model.substring(root.length());
                    break;
                }
            }
            ModelFile f = new ModelFile(modelId(model), rel, model);
            if (!ids.add(f.id)) {
                throw new LayeredLoopsVectors.Bug("two models have the id " + f.id);
            }
            files.add(f);
        }
        return files;
    }

    static ModelFile model(List<ModelFile> files, String id) {
        return files.stream().filter(f -> f.id.equals(id)).findFirst().orElseThrow(() -> new LayeredLoopsVectors.Bug("no model with the id " + id));
    }
}
