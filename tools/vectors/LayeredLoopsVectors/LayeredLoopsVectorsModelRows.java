// SPDX-License-Identifier: EPL-2.0
// Helper 6 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the rows of the groups models and full.
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import java.util.*;
import org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy;
import org.eclipse.elk.alg.layered.options.WrappingStrategy;
import org.eclipse.elk.alg.layered.options.GraphCompactionStrategy;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.ecore.EObject;

abstract class LayeredLoopsVectorsModelRows extends LayeredLoopsVectorsBuilders {
    static final List<String> DIRECTIONS = List.of("LEFT", "DOWN", "UP");
    static final List<String> ALL_DIRECTIONS = List.of("RIGHT", "LEFT", "DOWN", "UP");
    static final String LAST_PHASE_MARK = "/";
    /** The model of the pinned row of layered-pipeline.json (W4): every stop of the plan of its level N1 gets a fresh row. */
    static final String PINNED_MODEL = "ptolemy-sinewaveoptimization", PINNED_TARGET = "N1", PINNED_VARIANT = "DOWN";
    /** Models whose self loop stops also get direction variants (the others: default only). */
    static final List<String> SELF_LOOP_DIRECTION_MODELS = List.of("self_loops-hyperLoops", "self_loops-south", "ticket-418_northPortsWithSelfLoops");
    /** Models of the wrapping stop rows and full rows: long chains of the vendored inputs, a ptolemy subset. */
    static final List<String> WRAP_MODELS = List.of("preserve_order-simpleLongEdges01", "preserve_order-longConflictingExample",
            "preserve_order-timedAutomaton", "ptolemy-router", "ptolemy-randomwalk");
    /** Models of the compaction stop rows: the compaction_oned models, the spline hyperedge models (W7), a components model. */
    static final List<String> COMPACT_MODELS = List.of("compaction_oned-labels-labels1", "compaction_oned-nsport-south_port",
            "compaction_oned-selfloop-selfloop_crash", "compaction_oned-selfloop-selfloop_spline",
            "compaction_oned-splines-moreThanOneStraightSegmentPath", "splines-hyperedges-hyperedges_1", "hyperedge_merging-north_south_ports_01");
    static final List<String> COMPACTION_STRATEGIES = List.of("LEFT", "RIGHT", "LEFT_RIGHT_CONSTRAINT_LOCKING",
            "LEFT_RIGHT_CONNECTION_LOCKING", "EDGE_LENGTH");
    static final List<String> COMPACTION_CONSTRAINTS = List.of("SCANLINE", "QUADRATIC");
    static final List<String> WRAPPING_CUTTINGS = List.of("ARD", "MSD", "MANUAL");
    static final List<String> WRAPPING_VALIDIFIES = List.of("NO", "GREEDY", "LOOK_BACK");
    static final List<String> WRAPPING_STRATEGIES = List.of("SINGLE_EDGE", "MULTI_EDGE");

    /** One candidate row of a level: stop, variant and the options of the variant. */
    record Cand(String stop, String variant, TreeMap<String, Object> options) { }

    /** The manual cut indices of the MANUAL cutting rows, and the layer indices validify must not cut at. */
    static List<Object> ints(int... values) {
        List<Object> l = new ArrayList<>();
        for (int v : values) {
            l.add(tv("int", v));
        }
        return l;
    }

    static final List<Object> MANUAL_CUTS = ints(2, 4, 6), FORBIDDEN_INDICES = ints(3);

    /** The options of a wrapping variant: strategy, cutting, validify; MANUAL cutting carries MANUAL_CUTS. */
    static Object[] wrapping(String strategy, String cutting, String validify) {
        List<Object> kv = new ArrayList<>(List.of("WRAPPING_STRATEGY", E("WrappingStrategy", strategy), "WRAPPING_CUTTING_STRATEGY",
                E("CuttingStrategy", cutting), "WRAPPING_VALIDIFY_STRATEGY", E("ValidifyStrategy", validify)));
        if (cutting.equals("MANUAL")) {
            kv.addAll(List.of("WRAPPING_CUTTING_CUTS", MANUAL_CUTS));
        }
        if (!validify.equals("NO")) {
            kv.addAll(List.of("WRAPPING_VALIDIFY_FORBIDDEN_INDICES", FORBIDDEN_INDICES));
        }
        return kv.toArray();
    }

    static Object[] compaction(String strategy, String constraints) {
        return new Object[] {"COMPACTION_POST_COMPACTION_STRATEGY", E("GraphCompactionStrategy", strategy),
            "COMPACTION_POST_COMPACTION_CONSTRAINTS", E("ConstraintCalculationStrategy", constraints)};
    }

    static List<Cand> candidates(ModelFile f) {
        List<Cand> c = new ArrayList<>();
        for (String stop : SELF_LOOP_STOPS) {
            c.add(new Cand(stop, "default", opts()));
            if (SELF_LOOP_DIRECTION_MODELS.contains(f.id())) {
                for (String d : DIRECTIONS) {
                    c.add(new Cand(stop, d, opts("DIRECTION", E("Direction", d))));
                }
            }
        }
        if (WRAP_MODELS.contains(f.id())) {
            c.add(new Cand(SINGLE_EDGE_STOP, "single-edge", opts(wrapping("SINGLE_EDGE", "ARD", "NO"))));
            c.add(new Cand(SINGLE_EDGE_STOP, "single-edge-msd", opts(wrapping("SINGLE_EDGE", "MSD", "GREEDY"))));
            for (String stop : MULTI_EDGE_STOPS) {
                c.add(new Cand(stop, "multi-edge", opts(wrapping("MULTI_EDGE", "ARD", "NO"))));
                c.add(new Cand(stop, "multi-edge-msd", opts(wrapping("MULTI_EDGE", "MSD", "GREEDY"))));
                c.add(new Cand(stop, "multi-edge-manual", opts(wrapping("MULTI_EDGE", "MANUAL", "LOOK_BACK"))));
            }
        }
        c.add(new Cand(COMPACTOR_STOP, "default", opts()));
        if (COMPACT_MODELS.contains(f.id())) {
            for (String s : COMPACTION_STRATEGIES) {
                for (String k : COMPACTION_CONSTRAINTS) {
                    if (k.equals("SCANLINE") || s.equals("EDGE_LENGTH") || s.equals("LEFT_RIGHT_CONNECTION_LOCKING")) {
                        c.add(new Cand(COMPACTOR_STOP, (s + "-" + k).toLowerCase().replace('_', '-'), opts(compaction(s, k))));
                    }
                }
            }
        }
        return c;
    }

    /** "P1".."P5" name the configured phase, whose plan names read "P<n>_<PHASE>/<STRATEGY>". */
    static boolean inPlan(List<String> plan, String stop) {
        String phase = switch (stop) {
            case "P1" -> P1;
            case "P2" -> P2;
            case "P3" -> P3;
            case "P4" -> P4;
            case "P5" -> P5;
            default -> null;
        };
        return plan.stream().anyMatch(n -> n.equals(stop) || (phase != null && n.startsWith(phase + "/")));
    }

    /** The pinned model's level: one row per member of the plan (a phase as "P<n>"), options as the pinned row (direction DOWN). */
    static void pinnedRows(List<Spec> out, ModelFile f, Level lv) {
        TreeMap<String, Object> options = opts("DIRECTION", E("Direction", PINNED_VARIANT));
        for (String name : planNames(f, lv.target(), options)) {
            int slash = name.indexOf(LAST_PHASE_MARK);
            out.add(pipeline(f, lv.target(), slash < 0 ? name : name.substring(0, 2), PINNED_VARIANT, options));
        }
    }

    /** The rows of this brief's stops for one level (a stop outside the level's plan is skipped and counted). */
    static void stopRows(List<Spec> out, ModelFile f, Level lv) {
        Map<String, List<String>> plans = new HashMap<>();
        for (Cand c : candidates(f)) {
            List<String> plan = plans.computeIfAbsent(json(c.options), k -> planNames(f, lv.target(), c.options));
            if (inPlan(plan, c.stop)) {
                out.add(pipeline(f, lv.target(), c.stop, c.variant, c.options));
            } else {
                NOT_IN_PLAN.merge(c.stop, 1, Integer::sum);
            }
        }
        if (f.id().equals(PINNED_MODEL) && PINNED_TARGET.equals(lv.target())) {
            pinnedRows(out, f, lv);
        }
    }

    static void modelSpecs(List<Spec> out, List<Spec> fulls, List<ModelFile> files) {
        for (ModelFile f : files) {
            for (Level lv : levels(f)) {
                stopRows(out, f, lv);
            }
        }
        fullSpecs(fulls, files);
    }

    // ELK JSON builders of this brief: labels and comment boxes

    static String lab(String text, int w, int h, String placement) {
        return "{\"text\":\"" + text + "\",\"width\":" + w + ",\"height\":" + h
                + (placement == null ? "" : ",\"layoutOptions\":{\"" + pid("EDGE_LABELS_PLACEMENT") + "\":\"" + placement + "\"}") + "}";
    }

    static String labels(String... labels) {
        return "\"labels\":[" + String.join(",", labels) + "]";
    }

    static String edl(String id, String src, String tgt, String... labels) {
        return "{\"id\":\"" + id + "\",\"sources\":[\"" + src + "\"],\"targets\":[\"" + tgt + "\"]"
                + (labels.length == 0 ? "" : "," + labels(labels)) + "}";
    }

    /** A port (see pj) with a label of the given width. */
    static String pjl(String node, int index, String side, int labelWidth) {
        return pj(node, index, side, null).replace("\"height\":4", "\"height\":4," + labels(lab("p" + index, labelWidth, 8, null)));
    }

    /** A node with ports of the given sides and a label per port; pc may be null. */
    static String lnode(String id, String pc, int labelWidth, String extra, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pjl(id, i, sides[i], labelWidth));
        }
        return nodeJson(id, null, pc == null ? null : ropts("PORT_CONSTRAINTS", pc),
                "\"ports\":[" + String.join(",", ports) + "]" + (extra == null ? "" : "," + extra));
    }

    static String comment(String id, int w, int h, String extra) {
        return kn(id, w, h, extra, "COMMENT_BOX", "true");
    }

    // Group full: the families of this brief

    static Spec full(String family, String model, String variant, String path, String elk, TreeMap<String, Object> options, String mode) {
        return new Spec("full/" + family + "/" + model + "/" + variant, "full", path,
                path == null ? () -> ElkGraphJson.forGraph(elk).toElk() : null, null, options, null, null, mode);
    }

    static Spec full(String family, String model, String variant, String path, String elk, TreeMap<String, Object> options) {
        return full(family, model, variant, path, elk, options, null);
    }

    /** Models of the self loop family (ids from modelId): the self loop models, the compaction_oned self loop models, the tickets, ptolemy. */
    static final List<String> SELF_LOOP_MODELS = List.of("self_loops-fixedSide", "self_loops-free", "self_loops-hyperLoops",
            "self_loops-inside_outside", "self_loops-label", "self_loops-south", "compaction_oned-selfloop-selfloop_crash",
            "compaction_oned-selfloop-selfloop_orthogonal", "compaction_oned-selfloop-selfloop_spline", "ticket-079_selfLoopLabels",
            "ticket-128_selfLoopLabelSpacing_complex", "ticket-128_selfLoopLabelSpacing_simple", "ticket-302_brokenSplineSelfLoops",
            "ticket-340_classCastExceptionGreedySwitch", "ticket-360_badSelfLoopLabelPlacement", "ticket-368_selfLoopLabelsIOOBE",
            "ticket-403_stackedSelfLoopLabels", "ticket-416_longSelfLoops", "ticket-418_northPortsWithSelfLoops",
            "ticket-419_northSelfLoopsAndRegularEdges", "ticket-433_graphSizeWithSelfLoopLabel", "ticket-444_selfLoopsNPE",
            "ticket-463_aioobe_with_self_loops", "ticket-870_networkSimplexNodePlacer", PINNED_MODEL, "ptolemy-conwayrandom",
            "ptolemy-eratosthenes", "ptolemy-trafficlight", "ptolemy-channelfaultmodel", "ptolemy-brewery", "ptolemy-trialmodule");
    /** Models of the self loop family that get the whole direction x routing grid (the others: default and RIGHT x each routing). */
    static final List<String> SELF_LOOP_GRID_MODELS = List.of("self_loops-fixedSide", "self_loops-free", "self_loops-hyperLoops",
            "self_loops-label", "self_loops-south", "compaction_oned-selfloop-selfloop_spline", "ticket-403_stackedSelfLoopLabels",
            "ticket-418_northPortsWithSelfLoops", "ticket-419_northSelfLoopsAndRegularEdges");
    static final List<String> SELF_LOOP_OPTION_MODELS = List.of("self_loops-hyperLoops", "self_loops-label", "self_loops-fixedSide");
    static final List<String> SELF_LOOP_DISTRIBUTIONS = List.of("EQUALLY", "NORTH", "NORTH_SOUTH");
    static final List<String> SELF_LOOP_ORDERINGS = List.of("STACKED", "REVERSE_STACKED", "SEQUENCED");

    /** A model whose levels below the root have children of their own needs its options on every such level: the options are then
     * baked into the inline input (the precedent: 7f2's padding-0 issue row); a flat model takes them on its root. */
    static boolean hierarchical(ElkNode root) {
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                return true;
            }
        }
        return false;
    }

    static String withLevelOptions(String rel, TreeMap<String, Object> options) {
        ElkNode g = loadFile(rel);
        List<ElkNode> levels = new ArrayList<>();
        levels.add(g);
        for (TreeIterator<EObject> it = g.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && !n.getChildren().isEmpty()) {
                levels.add(n);
            }
        }
        for (ElkNode n : levels) {
            options.forEach((id, c4) -> setProperty(n, id, c4));
        }
        return export(g);
    }

    /** A full row over a vendored model; options reach every level of a hierarchical model through its inline input. */
    static Spec fullOn(String family, ModelFile f, String variant, TreeMap<String, Object> options) {
        if (hierarchical(loadFile(f.rel()))) {
            return full(family, f.id(), variant, null, withLevelOptions(f.rel(), options), fopts());
        }
        return full(family, f.id(), variant, f.rel(), null, options);
    }

    static void selfLoopSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : SELF_LOOP_MODELS) {
            ModelFile f = model(files, id);
            boolean grid = SELF_LOOP_GRID_MODELS.contains(id);
            out.add(fullOn("self-loops", f, "default", fopts()));
            for (String d : ALL_DIRECTIONS) {
                for (EdgeRouting r : ROUTINGS) {
                    if (grid || d.equals("RIGHT")) {
                        out.add(fullOn("self-loops", f, d + "-" + r.name(), fopts("DIRECTION", E("Direction", d), "EDGE_ROUTING", E("EdgeRouting", r.name()))));
                    }
                }
            }
        }
        for (String id : SELF_LOOP_OPTION_MODELS) {
            for (String dist : SELF_LOOP_DISTRIBUTIONS) {
                for (String ord : SELF_LOOP_ORDERINGS) {
                    out.add(fullOn("self-loops", model(files, id), "distribution-" + dist + "-ordering-" + ord,
                            fopts("EDGE_ROUTING_SELF_LOOP_DISTRIBUTION", E("SelfLoopDistributionStrategy", dist),
                                    "EDGE_ROUTING_SELF_LOOP_ORDERING", E("SelfLoopOrderingStrategy", ord))));
                }
            }
        }
    }

    /** Long chains: 12 layers with skip edges, and a 16-node ladder (inline, nothing in the corpus sets a wrapping strategy). */
    static final String CHAIN_GRAPH = gj("", 12, null, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {4, 5}, {5, 6}, {6, 7}, {7, 8},
        {8, 9}, {9, 10}, {10, 11}, {0, 6}, {2, 8}, {5, 11}}, null);
    static final String LADDER_GRAPH = gj("", 16, null, new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {4, 5}, {5, 6}, {6, 7},
        {8, 9}, {9, 10}, {10, 11}, {11, 12}, {12, 13}, {13, 14}, {14, 15}, {0, 9}, {2, 11}, {4, 13}, {6, 15}, {8, 1}, {10, 3}}, null);

    static void wrappingGrid(List<Spec> out, String name, String rel, String elk, boolean params) {
        for (String s : WRAPPING_STRATEGIES) {
            for (String c : WRAPPING_CUTTINGS) {
                for (String v : WRAPPING_VALIDIFIES) {
                    out.add(full("wrapping", name, s + "-" + c + "-" + v, rel, elk, fopts(wrapping(s, c, v))));
                }
            }
        }
        if (!params) {
            return;
        }
        Map<String, Object[]> variants = new LinkedHashMap<>();
        variants.put("multi-improve-cuts-off", cat(wrapping("MULTI_EDGE", "MSD", "GREEDY"), "WRAPPING_MULTI_EDGE_IMPROVE_CUTS", Z(false)));
        variants.put("multi-improve-wrapped-edges-off", cat(wrapping("MULTI_EDGE", "MSD", "GREEDY"), "WRAPPING_MULTI_EDGE_IMPROVE_WRAPPED_EDGES", Z(false)));
        variants.put("multi-distance-penalty-0", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_MULTI_EDGE_DISTANCE_PENALTY", D(0.0)));
        variants.put("multi-distance-penalty-8", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_MULTI_EDGE_DISTANCE_PENALTY", D(8.0)));
        variants.put("multi-msd-freedom-0", cat(wrapping("MULTI_EDGE", "MSD", "GREEDY"), "WRAPPING_CUTTING_MSD_FREEDOM", tv("int", 0)));
        variants.put("multi-msd-freedom-3", cat(wrapping("MULTI_EDGE", "MSD", "GREEDY"), "WRAPPING_CUTTING_MSD_FREEDOM", tv("int", 3)));
        variants.put("multi-correction-0.5", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_CORRECTION_FACTOR", D(0.5)));
        variants.put("multi-correction-2", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_CORRECTION_FACTOR", D(2.0)));
        variants.put("single-correction-0.5", cat(wrapping("SINGLE_EDGE", "ARD", "GREEDY"), "WRAPPING_CORRECTION_FACTOR", D(0.5)));
        variants.put("single-correction-2", cat(wrapping("SINGLE_EDGE", "MSD", "GREEDY"), "WRAPPING_CORRECTION_FACTOR", D(2.0)));
        variants.put("single-additional-edge-spacing-30", cat(wrapping("SINGLE_EDGE", "ARD", "GREEDY"), "WRAPPING_ADDITIONAL_EDGE_SPACING", D(30.0)));
        variants.put("multi-additional-edge-spacing-30", cat(wrapping("MULTI_EDGE", "ARD", "GREEDY"), "WRAPPING_ADDITIONAL_EDGE_SPACING", D(30.0)));
        variants.forEach((v, kv) -> out.add(full("wrapping", name, v, rel, elk, fopts(kv))));
    }

    static Object[] cat(Object[] base, Object... more) {
        Object[] all = Arrays.copyOf(base, base.length + more.length);
        System.arraycopy(more, 0, all, base.length, more.length);
        return all;
    }

    static void wrappingSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : WRAP_MODELS) {
            ModelFile f = model(files, id);
            wrappingGrid(out, id, f.rel(), null, id.equals("preserve_order-simpleLongEdges01"));
        }
        wrappingGrid(out, "chain12", null, CHAIN_GRAPH, true);
        wrappingGrid(out, "ladder16", null, LADDER_GRAPH, true);
    }

    static void compactionSpecs(List<Spec> out, List<ModelFile> files) {
        for (ModelFile f : files) {
            if (!f.id().startsWith("compaction_oned-")) {
                continue;
            }
            out.add(fullOn("compaction", f, "default", fopts()));
            for (String s : COMPACTION_STRATEGIES) {
                for (String k : COMPACTION_CONSTRAINTS) {
                    for (EdgeRouting r : ROUTINGS) {
                        if (!k.equals("SCANLINE") && !s.equals("EDGE_LENGTH") && !s.equals("LEFT_RIGHT_CONNECTION_LOCKING")) {
                            continue; // QUADRATIC constraints: the two main strategies (the models rows and scenarios cover the others)
                        }
                        if (r != EdgeRouting.POLYLINE || s.equals("EDGE_LENGTH")) { // POLYLINE plans hold no compactor: one strategy shows it
                            out.add(fullOn("compaction", f, (s + "-" + k + "-" + r.name()).toLowerCase().replace('_', '-'),
                                    fopts(cat(compaction(s, k), "EDGE_ROUTING", E("EdgeRouting", r.name())))));
                        }
                    }
                }
            }
        }
        for (ModelFile f : files) { // W7: SPLINES with a compaction strategy over the spline hyperedge models
            if (!f.id().startsWith("splines-hyperedges-") && !f.id().startsWith("hyperedge_merging-")) {
                continue;
            }
            out.add(fullOn("compaction-splines", f, "default", fopts()));
            for (String s : COMPACTION_STRATEGIES) {
                for (String k : COMPACTION_CONSTRAINTS) {
                    if (!k.equals("SCANLINE") && !s.equals("EDGE_LENGTH") && !s.equals("LEFT_RIGHT_CONNECTION_LOCKING")) {
                        continue;
                    }
                    out.add(fullOn("compaction-splines", f, (s + "-" + k).toLowerCase().replace('_', '-'),
                            fopts(cat(compaction(s, k), "EDGE_ROUTING", E("EdgeRouting", "SPLINES")))));
                }
            }
        }
    }

    /** A compound node "c" with ports on the given sides (c.p<i>), one child per port, each connected to its port, and extra free components. */
    static String gExternal(String rootOptions, String innerOptions, String[] sides, int isolated, boolean crossLinks) {
        List<String> ports = new ArrayList<>(), children = new ArrayList<>(), edges = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj("c", i, sides[i], null));
            children.add(plain("k" + i));
            edges.add(i % 2 == 0 ? "c.p" + i + ">k" + i : "k" + i + ">c.p" + i);
        }
        for (int i = 0; i < isolated; i++) {
            children.add(plain("f" + i));
            children.add(plain("g" + i));
            edges.add("f" + i + ">g" + i);
        }
        if (crossLinks && sides.length > 2) {
            edges.add("k0>k1");
        }
        String inner = "{\"id\":\"c\",\"width\":200,\"height\":200,\"layoutOptions\":{" + innerOptions + "},\"ports\":[" + String.join(",", ports)
                + "],\"children\":[" + String.join(",", children) + "],\"edges\":[" + eds(edges.toArray(new String[0])) + "]}";
        return "{\"id\":\"root\",\"layoutOptions\":{" + rootOptions + "},\"children\":[" + inner + "]}";
    }

    static final String[] SIDES_4 = {"NORTH", "EAST", "SOUTH", "WEST"};
    static final String[] SIDES_8 = {"NORTH", "NORTH", "EAST", "EAST", "SOUTH", "SOUTH", "WEST", "WEST"};
    static final String[] SIDES_NS = {"NORTH", "SOUTH", "NORTH", "SOUTH"};
    static final String[] SIDES_EW = {"EAST", "WEST", "EAST", "WEST"};

    /** The inner options of a components compaction row: compaction on, fixed port sides, orthogonal routing, the given extra pairs. */
    static String compactionInner(String... extra) {
        String[] base = {"COMPACTION_CONNECTED_COMPONENTS", "true", "PORT_CONSTRAINTS", FS, "EDGE_ROUTING", "ORTHOGONAL"};
        String[] all = Arrays.copyOf(base, base.length + extra.length);
        System.arraycopy(extra, 0, all, base.length, extra.length);
        return ropts(all);
    }

    static void componentsSpecs(List<Spec> out, List<ModelFile> files) {
        TreeMap<String, Object> on = fopts("COMPACTION_CONNECTED_COMPONENTS", Z(true));
        for (String id : List.of("connected_components-flat01", "connected_components-all_four_port_sides", "connected_components-compound01",
                "connected_components-compound02", "connected_components-compound03", "connected_components-compound04",
                "connected_components-compound05", "connected_components-compound06", "connected_components-compound07")) {
            ModelFile f = model(files, id);
            out.add(fullOn("components-compaction", f, "off", fopts()));
            out.add(fullOn("components-compaction", f, "on", on));
            for (EdgeRouting r : ROUTINGS) {
                for (String d : List.of("RIGHT", "DOWN")) {
                    out.add(fullOn("components-compaction", f, "on-" + d + "-" + r.name(),
                            fopts("COMPACTION_CONNECTED_COMPONENTS", Z(true), "DIRECTION", E("Direction", d), "EDGE_ROUTING", E("EdgeRouting", r.name()))));
                }
            }
        }
        ModelFile all4 = model(files, "connected_components-all_four_port_sides");
        for (String d : ALL_DIRECTIONS) { // the third placer: ComponentGroupModelOrderGraphPlacer
            out.add(fullOn("components-compaction", all4, "group-model-order-" + d, fopts("COMPACTION_CONNECTED_COMPONENTS", Z(true), "DIRECTION", E("Direction", d),
                    "CONSIDER_MODEL_ORDER_COMPONENTS", E("ComponentOrderingStrategy", "GROUP_MODEL_ORDER"))));
        }
        Map<String, String[]> ext = new LinkedHashMap<>();
        ext.put("four-sides", SIDES_4);
        ext.put("eight-ports", SIDES_8);
        ext.put("north-south", SIDES_NS);
        ext.put("east-west", SIDES_EW);
        for (Map.Entry<String, String[]> e : ext.entrySet()) {
            for (String d : List.of("RIGHT", "DOWN")) {
                String root = ropts("DIRECTION", d);
                out.add(full("components-compaction", "inline-" + e.getKey(), "compaction-" + d, null,
                        gExternal(root, compactionInner("DIRECTION", d), e.getValue(), 2, true), fopts()));
                out.add(full("components-compaction", "inline-" + e.getKey(), "group-model-order-" + d, null, gExternal(root,
                        compactionInner("DIRECTION", d, "CONSIDER_MODEL_ORDER_COMPONENTS", "GROUP_MODEL_ORDER"), e.getValue(), 2, false), fopts()));
            }
        }
    }

    static void convertedSpecs(List<Spec> out, List<ModelFile> files) {
        // W4: the refused row full/labels/ticket-213_componentsCompaction of layered-labels.json: the same input, no options
        out.add(full("converted", "labels", "ticket-213_componentsCompaction", model(files, "ticket-213_componentsCompaction").rel(), null, fopts()));
    }

    static void issueSpecs(List<Spec> out, List<ModelFile> files) {
        for (String id : List.of("ticket-433_graphSizeWithSelfLoopLabel", "ticket-444_selfLoopsNPE", "ticket-463_aioobe_with_self_loops",
                "ticket-870_networkSimplexNodePlacer")) { // Issue433Test, Issue444Test, Issue463Test, Issue870Test: the default configuration
            out.add(full("issues", id, "default", model(files, id).rel(), null, fopts()));
        }
    }

    static void fullSpecs(List<Spec> out, List<ModelFile> files) {
        selfLoopSpecs(out, files);
        wrappingSpecs(out, files);
        compactionSpecs(out, files);
        componentsSpecs(out, files);
        convertedSpecs(out, files);
        issueSpecs(out, files);
    }
}
