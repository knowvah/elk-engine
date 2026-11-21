// SPDX-License-Identifier: EPL-2.0
// Helper 7 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the rows of the group scenarios.
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import java.util.*;
import org.eclipse.elk.alg.layered.ElkLayered;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
import org.eclipse.elk.alg.layered.intermediate.DummySelfLoopProcessor;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;

abstract class LayeredLoopsVectorsScenarios extends LayeredLoopsVectorsModelRows {
    // Group scenarios

    static List<Spec> SCENARIOS;
    /** Scenario rows per "<stop>/<direction>"; the coverage check wants at least two graphs per processor and direction. */
    static final Map<String, Integer> FAMILIES = new TreeMap<>();
    static final String SHRINK = "shrink-width", NO_MANAGER = "none";

    /** The whole plan of the inline graph (a label manager set on its root first when manager is true), GraphTransformer by position. */
    static List<String> planOfGraph(String elk, String target, boolean manager) {
        ElkNode root = ElkGraphJson.forGraph(elk).toElk();
        if (manager) {
            root.setProperty(LabelManagementOptions.LABEL_MANAGER, new LayeredLoopsVectors.ShrinkWidthManager());
        }
        LGraph g = new ElkGraphTransformer().importGraph(importTarget(root, target));
        ElkLayered layered = new ElkLayered();
        List<String> plan = positionalNames(layered.getLayoutTestConfiguration(layered.prepareLayoutTest(g)));
        for (String name : plan) {
            if (!allowed(name)) { // G2: decided on the whole plan, also for scenarios
                throw new LayeredLoopsVectors.Bug("scenario plan names " + name + " outside the ported sets: " + plan);
            }
        }
        return plan;
    }

    /** [labelManager], importGraph, normalise, then the plan's members in order up to and including the stop (null = the whole plan). */
    static List<Object> chainOf(String elk, String target, String stop, boolean manager) {
        List<String> plan = planOfGraph(elk, target, manager);
        List<Object> st = new ArrayList<>();
        if (manager) {
            st.add(S("labelManager", SHRINK));
        }
        st.add(imp(target));
        st.add(norm());
        boolean hit = stop == null;
        for (String name : plan) {
            if (name.contains("/")) {
                String[] ph = name.split("/");
                st.add(phase(ph[0], ph[1]));
            } else {
                st.add(proc(name));
            }
            if (name.equals(stop)) {
                hit = true;
                break;
            }
        }
        if (!hit) {
            throw new LayeredLoopsVectors.Bug("scenario stop " + stop + " is not in the plan " + plan);
        }
        return st;
    }

    static void add(String id, String elk, List<Object> steps) {
        SCENARIOS.add(new Spec(id, "scenarios", null, () -> ElkGraphJson.forGraph(elk).toElk(), null, new TreeMap<>(), null, steps, null));
    }

    /** scenarios/<cls>/<name>: stop = a plan member name, or null for the whole plan; the family counts toward the coverage check. */
    static void sc(String cls, String name, String family, String elk, String stop, boolean manager) {
        List<String> plan = planOfGraph(elk, null, manager);
        String stopName = stop == null ? plan.get(plan.size() - 1) : stop;
        if (!plan.contains(stopName)) { // a graph without the stop's trigger (e.g. no center label): skipped and counted
            NOT_IN_PLAN.merge("scenario " + stopName, 1, Integer::sum);
            return;
        }
        List<Object> st = chainOf(elk, null, stopName, manager);
        st.add(dump());
        add("scenarios/" + cls + "/" + name, elk, st);
        FAMILIES.merge(family, 1, Integer::sum);
    }

    /** A builder of the root options -> ELK JSON (a lambda needs a functional target type). */
    static java.util.function.UnaryOperator<String> u(java.util.function.UnaryOperator<String> f) {
        return f;
    }

    /** Named graph builders (name -> builder of the root options -> ELK JSON), in insertion order. */
    static Map<String, java.util.function.UnaryOperator<String>> graphs(Object... nameAndBuilder) {
        Map<String, java.util.function.UnaryOperator<String>> m = new LinkedHashMap<>();
        requirePairs(nameAndBuilder.length);
        for (int i = 0; i + 1 < nameAndBuilder.length; i += 2) {
            @SuppressWarnings("unchecked")
            java.util.function.UnaryOperator<String> b = (java.util.function.UnaryOperator<String>) nameAndBuilder[i + 1];
            m.put((String) nameAndBuilder[i], b);
        }
        return m;
    }

    // Scenario graphs of this brief

    static final String NORTH = "NORTH", EAST = "EAST", SOUTH = "SOUTH", WEST = "WEST";

    /** A self loop graph: node a (80 x 80) with the ports of the given sides (null: no side) between n0 and n2, a bypass b, and the loops. */
    record LoopGraph(String name, String constraints, String[] sides, String[] loops, boolean labels) { }

    static LoopGraph lg(String name, String constraints, String[] sides, String... loops) {
        return new LoopGraph(name, constraints, sides, loops, false);
    }

    static LoopGraph labelled(String name, String[] sides, String... loops) {
        return new LoopGraph(name, FS, sides, loops, true);
    }

    static String[] sd(String... s) {
        return s;
    }

    /** The edge ids of the loops start at e4 (after n0>a.p0, a.p1>n2, n0>b, b>n2); a labelled loop carries a center, head and tail label. */
    static String gLoops(String ro, LoopGraph g) {
        List<String> edges = new ArrayList<>(List.of(eds("n0>a.p0", "a.p1>n2", "n0>b", "b>n2")));
        for (int i = 0; i < g.loops.length; i++) {
            String[] end = g.loops[i].split(">");
            edges.add(g.labels ? edl("e" + (4 + i), end[0], end[1], lab("c" + i, 30, 10, null), lab("h" + i, 20, 10, "HEAD"), lab("t" + i, 20, 10, "TAIL"))
                    : edsFrom(4 + i, g.loops[i]));
        }
        return flat(ro, join(plain("n0"), sz(pnode("a", g.constraints, null, g.sides), 80, 80), plain("n2"), plain("b")), String.join(",", edges));
    }

    /** The same with a label on every port of a (width 18). */
    static String gLoopsPortLabels(String ro, LoopGraph g) {
        String a = sz(lnode("a", g.constraints, 18, null, g.sides), 80, 80);
        return flat(ro, join(plain("n0"), a, plain("n2"), plain("b")), join(eds("n0>a.p0", "a.p1>n2", "n0>b", "b>n2"), edsFrom(4, g.loops)));
    }

    /** A graph that is one node with loops only, and one with two such nodes (loops on both, one edge between them). */
    static String gLoopsOnly(String ro, LoopGraph g, boolean twoNodes) {
        String a = sz(pnode("a", g.constraints, null, g.sides), 80, 80);
        if (!twoNodes) {
            return flat(ro, a, edsFrom(0, g.loops));
        }
        String b = sz(pnode("b", g.constraints, null, g.sides), 80, 80);
        List<String> edges = new ArrayList<>(List.of(eds("a.p0>b.p1")));
        for (int i = 0; i < g.loops.length; i++) {
            edges.add(edsFrom(1 + 2 * i, g.loops[i]));
            edges.add(edsFrom(2 + 2 * i, g.loops[i].replace("a.", "b.").replace(">a", ">b")));
        }
        return flat(ro, join(a, b), String.join(",", edges));
    }

    /** FIXED_POS ports at explicit positions (east and north side) with a loop between the two east ports and one north to east. */
    static String gLoopsFixedPos(String ro) {
        String ports = join(pj("a", 0, null, new double[] {0, 30}), pj("a", 1, null, new double[] {80, 30}), pj("a", 2, null, new double[] {80, 10}),
                pj("a", 3, null, new double[] {80, 55}), pj("a", 4, null, new double[] {30, 0}));
        String a = sz(nodeJson("a", null, ropts("PORT_CONSTRAINTS", FP), "\"ports\":[" + ports + "]"), 80, 80);
        return flat(ro, join(plain("n0"), a, plain("n2")), eds("n0>a.p0", "a.p1>n2", "a.p2>a.p3", "a.p4>a.p3"));
    }

    static final List<LoopGraph> PAIR_GRAPHS = List.of(lg("e-e", FS, sd(WEST, EAST, EAST, EAST), "a.p2>a.p3"),
            lg("w-w", FS, sd(WEST, EAST, WEST, WEST), "a.p2>a.p3"), lg("n-n", FS, sd(WEST, EAST, NORTH, NORTH), "a.p2>a.p3"),
            lg("s-s", FS, sd(WEST, EAST, SOUTH, SOUTH), "a.p2>a.p3"), lg("n-s", FS, sd(WEST, EAST, NORTH, SOUTH), "a.p2>a.p3"),
            lg("e-w", FS, sd(WEST, EAST, EAST, WEST), "a.p2>a.p3"), lg("same-port", FS, sd(WEST, EAST, EAST), "a.p2>a.p2"));
    static final List<LoopGraph> OTHER_GRAPHS = List.of(
            lg("hyper-e3", FS, sd(WEST, EAST, EAST, EAST, EAST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-nes", FS, sd(WEST, EAST, NORTH, EAST, SOUTH), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-w3", FS, sd(WEST, EAST, WEST, WEST, WEST), "a.p2>a.p3", "a.p4>a.p3"),
            lg("multi-e", FS, sd(WEST, EAST, EAST, EAST, EAST, EAST), "a.p2>a.p3", "a.p4>a.p5"),
            lg("nested-e", FS, sd(WEST, EAST, EAST, EAST, EAST, EAST), "a.p2>a.p5", "a.p3>a.p4"),
            lg("parallel", FS, sd(WEST, EAST, EAST, EAST), "a.p2>a.p3", "a.p3>a.p2"),
            lg("mixed-sides", FS, sd(WEST, EAST, NORTH, NORTH, SOUTH, SOUTH, EAST, EAST, WEST, WEST), "a.p2>a.p3", "a.p4>a.p5", "a.p6>a.p7",
                    "a.p8>a.p9"),
            lg("free", "FREE", sd(null, null, null, null), "a.p2>a.p3"),
            lg("free-hyper", "FREE", sd(null, null, null, null, null), "a.p2>a.p3", "a.p3>a.p4"),
            lg("fixed-order", "FIXED_ORDER", sd(WEST, EAST, EAST, EAST, NORTH, NORTH), "a.p2>a.p3", "a.p4>a.p5"),
            labelled("labels", sd(WEST, EAST, EAST, EAST), "a.p2>a.p3"), labelled("labels-ns", sd(WEST, EAST, NORTH, SOUTH), "a.p2>a.p3"),
            labelled("labels-hyper", sd(WEST, EAST, EAST, EAST, EAST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-nesw", FS, sd(WEST, EAST, NORTH, EAST, SOUTH, WEST), "a.p2>a.p3", "a.p3>a.p4", "a.p4>a.p5"));

    /** More loop shapes for the branches of PortRestorer (corner pairs, three sides with each side missing) and PortSideAssigner (shared port). */
    static final List<LoopGraph> EXTRA_GRAPHS = List.of(lg("n-e", FS, sd(WEST, EAST, NORTH, EAST), "a.p2>a.p3"),
            lg("e-s", FS, sd(WEST, EAST, EAST, SOUTH), "a.p2>a.p3"), lg("s-w", FS, sd(WEST, EAST, SOUTH, WEST), "a.p2>a.p3"),
            lg("w-n", FS, sd(WEST, EAST, WEST, NORTH), "a.p2>a.p3"),
            lg("hyper-esw", FS, sd(WEST, EAST, EAST, SOUTH, WEST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-nsw", FS, sd(WEST, EAST, NORTH, SOUTH, WEST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("hyper-new", FS, sd(WEST, EAST, NORTH, EAST, WEST), "a.p2>a.p3", "a.p3>a.p4"),
            lg("free-shared", "FREE", sd(null, null, null, null), "a.p0>a.p2", "a.p1>a.p3"));
    /** The other graphs whose whole plan is run once (the rest stop at the four self loop stops). */
    static final List<String> OTHER_WHOLE = List.of("hyper-nes", "free", "fixed-order", "labels", "labels-ns", "hyper-nesw", "mixed-sides");

    /** Eight loops (the first over three ports, 19 ports in all) on a node with FREE ports: EQUALLY visits all eight targets of PortSideAssigner. */
    static LoopGraph freeMany() {
        String[] sides = new String[19];
        List<String> loops = new ArrayList<>();
        loops.add("a.p2>a.p3");
        loops.add("a.p3>a.p4");
        for (int i = 0; i < 7; i++) {
            loops.add("a.p" + (5 + 2 * i) + ">a.p" + (6 + 2 * i));
        }
        return lg("free-many", "FREE", sides, loops.toArray(new String[0]));
    }

    static final List<String> SELF_LOOP_CLASSES = List.of("SelfLoopPreProcessor", "SelfLoopPortRestorer", "SelfLoopRouter", "SelfLoopPostProcessor");

    /** One graph in one direction (and routing) at the four self loop stops, plus the whole chain once per graph. */
    static void loopRows(String name, String routing, String d, java.util.function.Function<String, String> graph, boolean whole) {
        String ro = routing == null ? ropts("DIRECTION", d) : ropts("DIRECTION", d, "EDGE_ROUTING", routing);
        String elk = graph.apply(ro);
        String id = routing == null ? name : name + "-" + routing.toLowerCase();
        for (int i = 0; i < SELF_LOOP_STOPS.size(); i++) {
            sc(SELF_LOOP_CLASSES.get(i), id + "/" + d, SELF_LOOP_STOPS.get(i) + "/" + d, elk, SELF_LOOP_STOPS.get(i), false);
        }
        if (whole) {
            sc("SelfLoopPostProcessor", id + "/end/" + d, "end/" + d, elk, null, false);
        }
    }

    /** The pair graphs by direction: all in RIGHT, four in DOWN, three in LEFT and UP (every class and direction keeps two or more graphs). */
    static final Map<String, List<String>> PAIR_DIRECTIONS = new LinkedHashMap<>();
    static {
        PAIR_DIRECTIONS.put("RIGHT", List.of("e-e", "w-w", "n-n", "s-s", "n-s", "e-w", "same-port"));
        PAIR_DIRECTIONS.put("DOWN", List.of("e-e", "n-n", "n-s", "e-w"));
        PAIR_DIRECTIONS.put("LEFT", List.of("e-e", "n-s", "s-s"));
        PAIR_DIRECTIONS.put("UP", List.of("e-e", "n-s", "s-s"));
    }
    static final List<String> OTHER_DOWN = List.of("hyper-nes", "free", "fixed-order", "labels", "labels-ns");

    static void selfLoopScenarios() {
        for (LoopGraph g : PAIR_GRAPHS) {
            for (Map.Entry<String, List<String>> e : PAIR_DIRECTIONS.entrySet()) {
                if (e.getValue().contains(g.name)) {
                    loopRows(g.name, null, e.getKey(), ro -> gLoops(ro, g), e.getKey().equals("RIGHT"));
                }
            }
        }
        for (LoopGraph g : OTHER_GRAPHS) {
            loopRows(g.name, null, "RIGHT", ro -> gLoops(ro, g), OTHER_WHOLE.contains(g.name));
            if (OTHER_DOWN.contains(g.name)) {
                loopRows(g.name, null, "DOWN", ro -> gLoops(ro, g), false);
            }
        }
        for (LoopGraph g : EXTRA_GRAPHS) {
            loopRows(g.name, null, "RIGHT", ro -> gLoops(ro, g), false);
        }
        LoopGraph many = freeMany();
        for (String dist : SELF_LOOP_DISTRIBUTIONS) { // EQUALLY (all four stops), NORTH and NORTH_SOUTH (the router stop)
            String ro = ropts("DIRECTION", "RIGHT", "EDGE_ROUTING_SELF_LOOP_DISTRIBUTION", dist);
            for (int i = 0; i < SELF_LOOP_STOPS.size(); i++) {
                if (dist.equals("EQUALLY") || i == 2) {
                    sc(SELF_LOOP_CLASSES.get(i), many.name + "-dist-" + dist + "/RIGHT", SELF_LOOP_STOPS.get(i) + "/RIGHT", gLoops(ro, many),
                            SELF_LOOP_STOPS.get(i), false);
                }
            }
        }
        loopRows("port-labels", null, "RIGHT", ro -> gLoopsPortLabels(ro, PAIR_GRAPHS.get(0)), true);
        loopRows("port-labels-ns", null, "DOWN", ro -> gLoopsPortLabels(ro, PAIR_GRAPHS.get(4)), true);
        loopRows("fixed-pos", null, "RIGHT", ro -> gLoopsFixedPos(ro), true);
        loopRows("only-e-e", null, "RIGHT", ro -> gLoopsOnly(ro, PAIR_GRAPHS.get(0), false), true);
        loopRows("only-n-s", null, "DOWN", ro -> gLoopsOnly(ro, PAIR_GRAPHS.get(4), false), true);
        loopRows("two-nodes-e-e", null, "RIGHT", ro -> gLoopsOnly(ro, PAIR_GRAPHS.get(0), true), true);
        for (String r : List.of("POLYLINE", "SPLINES")) { // the routers: stops after the router and after the post-processor
            for (LoopGraph g : List.of(PAIR_GRAPHS.get(0), PAIR_GRAPHS.get(2), PAIR_GRAPHS.get(4), OTHER_GRAPHS.get(0), OTHER_GRAPHS.get(1),
                    OTHER_GRAPHS.get(10))) {
                String elk = gLoops(ropts("DIRECTION", "RIGHT", "EDGE_ROUTING", r), g);
                for (int i : new int[] {2, 3}) {
                    sc(SELF_LOOP_CLASSES.get(i), g.name + "-" + r.toLowerCase() + "/RIGHT", SELF_LOOP_STOPS.get(i) + "/RIGHT", elk,
                            SELF_LOOP_STOPS.get(i), false);
                }
            }
        }
        for (String dist : SELF_LOOP_DISTRIBUTIONS) { // the strategies of the option rows, on a stacked and a labelled graph
            for (String ord : SELF_LOOP_ORDERINGS) {
                for (LoopGraph g : List.of(OTHER_GRAPHS.get(3), OTHER_GRAPHS.get(12))) {
                    String ro = ropts("DIRECTION", "RIGHT", "EDGE_ROUTING_SELF_LOOP_DISTRIBUTION", dist, "EDGE_ROUTING_SELF_LOOP_ORDERING", ord);
                    String stop = SELF_LOOP_STOPS.get(2);
                    sc("SelfLoopRouter", g.name + "-dist-" + dist + "-ord-" + ord + "/RIGHT", stop + "/RIGHT", gLoops(ro, g), stop, false);
                }
            }
        }
    }

    // DummySelfLoopProcessor (W3): the processor op before NORTH_SOUTH_PORT_PREPROCESSOR (or the first P3 member), the plan without the self loop arms

    static final String[] SIDE_ORDER = {NORTH, EAST, SOUTH, WEST};

    /** importGraph, normalise, the plan's members without the SELF_LOOP arms, the Dummy op in its place; stops right after it or runs to the end. */
    static List<Object> dummyChain(String elk, boolean toEnd) {
        List<String> plan = planOfGraph(elk, null, false);
        List<Object> st = new ArrayList<>();
        st.add(imp(null));
        st.add(norm());
        boolean inserted = false;
        for (String name : plan) {
            if (SELF_LOOP_STOPS.contains(name)) {
                continue;
            }
            if (!inserted && (name.equals("NORTH_SOUTH_PORT_PREPROCESSOR") || name.startsWith(P3 + "/"))) {
                st.add(S("processor", "DummySelfLoopProcessor"));
                inserted = true;
                if (!toEnd) {
                    break;
                }
            }
            st.add(name.contains("/") ? phase(name.split("/")[0], name.split("/")[1]) : proc(name));
        }
        if (!inserted) {
            throw new LayeredLoopsVectors.Bug("no slot before phase 3 in the plan " + plan);
        }
        st.add(dump());
        return st;
    }

    static void dummyRow(String name, String elk) {
        add("scenarios/DummySelfLoopProcessor/" + name, elk, dummyChain(elk, false));
        add("scenarios/DummySelfLoopProcessor/" + name + "/end", elk, dummyChain(elk, true));
    }

    static void dummyScenarios() {
        for (String s : SIDE_ORDER) { // the 16 side pairs: reversal (N-W, S-W, S-N, E-N, E-S, E-W), dummy (E-W, W-E), nothing (the rest)
            for (String t : SIDE_ORDER) {
                dummyRow(s + "-" + t + "/RIGHT", gLoops(ropts("DIRECTION", "RIGHT"), lg(s + "-" + t, FS, sd(WEST, EAST, s, t), "a.p2>a.p3")));
            }
        }
        for (String pair : List.of("EAST-WEST", "WEST-EAST", "NORTH-SOUTH", "SOUTH-NORTH", "NORTH-WEST")) { // the sides rotate with the direction
            String[] end = pair.split("-");
            for (String d : DIRECTIONS) {
                dummyRow(pair + "/" + d, gLoops(ropts("DIRECTION", d), lg(pair, FS, sd(WEST, EAST, end[0], end[1]), "a.p2>a.p3")));
            }
        }
        // several loops on one node and layer (two dummies created in one layer), a hyper loop, loops on two nodes of different layers
        LoopGraph multi = lg("multi", FS, sd(WEST, EAST, WEST, EAST, EAST, WEST, NORTH, SOUTH, SOUTH, NORTH), "a.p2>a.p3", "a.p4>a.p5", "a.p6>a.p7",
                "a.p8>a.p9");
        for (String d : List.of("RIGHT", "DOWN")) {
            dummyRow("multi/" + d, gLoops(ropts("DIRECTION", d), multi));
        }
        dummyRow("hyper-ew/RIGHT", gLoops(ropts("DIRECTION", "RIGHT"), lg("hyper-ew", FS, sd(WEST, EAST, EAST, WEST, EAST), "a.p2>a.p3", "a.p3>a.p4")));
        dummyRow("two-nodes/RIGHT", gLoopsOnly(ropts("DIRECTION", "RIGHT"), lg("two", FS, sd(WEST, EAST, EAST, WEST), "a.p2>a.p3"), true));
    }

    // Wrapping

    /** The chain with a self loop on the fifth node. */
    static String gChainLoop(String ro) {
        StringBuilder kids = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            kids.append(i == 0 ? "" : ",").append(i == 4 ? pnode("n4", FS, null, WEST, EAST, EAST, EAST) : plain("n" + i));
        }
        String edges = eds("n0>n1", "n1>n2", "n2>n3", "n3>n4.p0", "n4.p1>n5", "n5>n6", "n6>n7", "n7>n8", "n8>n9", "n9>n10", "n10>n11", "n0>n6", "n2>n8");
        return flat(ro, kids.toString(), join(edges, edsFrom(13, "n4.p2>n4.p3")));
    }

    /** The chain with a center label on every second edge. */
    static String gChainLabels(String ro) {
        StringBuilder kids = new StringBuilder(), edges = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            kids.append(i == 0 ? "" : ",").append(plain("n" + i));
        }
        for (int i = 0; i < 11; i++) {
            edges.append(i == 0 ? "" : ",").append(i % 2 == 0 ? edl("e" + i, "n" + i, "n" + (i + 1), lab("l" + i, 24, 10, null))
                    : edsFrom(i, "n" + i + ">n" + (i + 1)));
        }
        return flat(ro, kids.toString(), edges + "," + edsFrom(11, "n0>n6", "n3>n9"));
    }

    /** The inline chain graphs have an empty root option list: put the row's root options in. */
    static String flatOf(String graph, String ro) {
        return graph.replace("\"layoutOptions\":{}", "\"layoutOptions\":{" + ro + "}");
    }

    static final Map<String, java.util.function.UnaryOperator<String>> WRAP_GRAPHS = graphs("chain", u(ro -> flatOf(CHAIN_GRAPH, ro)),
            "ladder", u(ro -> flatOf(LADDER_GRAPH, ro)), "chain-loop", u(ro -> gChainLoop(ro)), "chain-labels", u(ro -> gChainLabels(ro)));

    /** One wrapping scenario: the graph with the strategy and cutting; MANUAL carries its cuts as a setProperty step after importGraph. */
    static void wrapRow(String cls, String stop, String graph, String strategy, String cutting, String d, boolean whole) {
        String ro = ropts("DIRECTION", d, "WRAPPING_STRATEGY", strategy, "WRAPPING_CUTTING_STRATEGY", cutting);
        String elk = WRAP_GRAPHS.get(graph).apply(ro);
        List<String> plan = planOfGraph(elk, null, false);
        String stopName = whole ? plan.get(plan.size() - 1) : stop;
        List<Object> st = chainOf(elk, null, stopName, false);
        if (cutting.equals("MANUAL")) {
            st.add(1, set("g0", "WRAPPING_CUTTING_CUTS", MANUAL_CUTS));
        }
        st.add(dump());
        add("scenarios/" + cls + "/" + graph + "-" + cutting.toLowerCase() + "/" + d + (whole ? "/end" : ""), elk, st);
        FAMILIES.merge(stopName + "/" + d, 1, Integer::sum);
    }

    static void wrappingScenarios() {
        for (String graph : WRAP_GRAPHS.keySet()) {
            boolean main = graph.equals("chain") || graph.equals("ladder");
            for (String cutting : WRAPPING_CUTTINGS) {
                // every direction on the two main graphs with MSD; the other cuttings and graphs in RIGHT (and DOWN for the main graphs)
                List<String> dirs = !main ? List.of("RIGHT") : cutting.equals("MSD") ? ALL_DIRECTIONS : List.of("RIGHT");
                for (String d : dirs) {
                    for (String stop : MULTI_EDGE_STOPS) {
                        wrapRow(camel(stop), stop, graph, "MULTI_EDGE", cutting, d, false);
                    }
                    wrapRow(camel(SINGLE_EDGE_STOP), SINGLE_EDGE_STOP, graph, "SINGLE_EDGE", cutting, d, false);
                }
                if (main || cutting.equals("MSD")) {
                    wrapRow("BreakingPointRemover", null, graph, "MULTI_EDGE", cutting, "RIGHT", true);
                    wrapRow("SingleEdgeGraphWrapper", null, graph, "SINGLE_EDGE", cutting, "RIGHT", true);
                }
            }
        }
    }

    static String camel(String constant) {
        StringBuilder sb = new StringBuilder();
        for (String part : constant.split("_")) {
            sb.append(part.charAt(0)).append(part.substring(1).toLowerCase());
        }
        return sb.toString();
    }

    // Compaction

    /** Comment boxes (one above a node, one below, one attached to the first node) around a small DAG. */
    static String gCompComments(String ro) {
        return flat(ro, join(plain("n0"), plain("n1"), plain("n2"), plain("n3"), comment("c0", 40, 20, null), comment("c1", 40, 20, null),
                comment("c2", 30, 30, null)), eds("n0>n1", "n1>n2", "n0>n3", "n3>n2", "c0>n1", "n3>c1", "c2>n0"));
    }

    static String gCompNs(String ro) {
        return flat(ro, join(plain("n0"), pnode("a", FS, null, NORTH, SOUTH, WEST, EAST, NORTH), plain("n2"), pnode("b", FS, null, SOUTH, WEST, EAST), plain("n4")),
                eds("n0>a.p2", "a.p3>n2", "a.p0>b.p0", "b.p2>n4", "n2>b.p1", "a.p1>a.p4"));
    }

    static String gCompLabels(String ro) {
        return flat(ro, join(plain("n0"), plain("n1"), plain("n2"), plain("n3")),
                join(edl("e0", "n0", "n1", lab("a", 30, 10, null)), edl("e1", "n1", "n2", lab("b", 40, 10, "HEAD"), lab("c", 30, 12, "TAIL")),
                        edl("e2", "n0", "n3", lab("d", 20, 10, null)), edl("e3", "n3", "n2")));
    }

    static String gCompDag(String ro) {
        return gj(ro, 8, null, new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}, {3, 4}, {3, 5}, {4, 6}, {5, 6}, {0, 6}, {6, 7}, {1, 5}}, null);
    }

    static final Map<String, java.util.function.UnaryOperator<String>> COMPACTION_GRAPHS = graphs("dag", u(ro -> gCompDag(ro)), "comments",
            u(ro -> gCompComments(ro)), "ns-ports", u(ro -> gCompNs(ro)), "labels", u(ro -> gCompLabels(ro)));

    static void compactionRow(String graph, String strategy, String constraints, String routing, String d, boolean whole) {
        String ro = ropts("DIRECTION", d, "EDGE_ROUTING", routing, "COMPACTION_POST_COMPACTION_STRATEGY", strategy,
                "COMPACTION_POST_COMPACTION_CONSTRAINTS", constraints);
        String elk = COMPACTION_GRAPHS.get(graph).apply(ro);
        String id = graph + "-" + strategy.toLowerCase().replace('_', '-') + "-" + constraints.toLowerCase() + "-" + routing.toLowerCase();
        if (whole) {
            sc("HorizontalGraphCompactor", id + "/end/" + d, COMPACTOR_STOP + "/" + d, elk, null, false);
        } else {
            sc("HorizontalGraphCompactor", id + "/" + d, COMPACTOR_STOP + "/" + d, elk, COMPACTOR_STOP, false);
        }
    }

    static void compactionScenarios() {
        for (String graph : COMPACTION_GRAPHS.keySet()) {
            for (String d : ALL_DIRECTIONS) { // the two main strategies in every direction, the other constraints in RIGHT
                compactionRow(graph, "EDGE_LENGTH", "SCANLINE", "ORTHOGONAL", d, false);
                compactionRow(graph, "LEFT_RIGHT_CONNECTION_LOCKING", "QUADRATIC", "ORTHOGONAL", d, false);
            }
            compactionRow(graph, "EDGE_LENGTH", "QUADRATIC", "ORTHOGONAL", "RIGHT", false);
            compactionRow(graph, "LEFT_RIGHT_CONNECTION_LOCKING", "SCANLINE", "ORTHOGONAL", "RIGHT", false);
            for (String s : List.of("LEFT", "RIGHT", "LEFT_RIGHT_CONSTRAINT_LOCKING")) {
                compactionRow(graph, s, "SCANLINE", "ORTHOGONAL", "RIGHT", false);
                compactionRow(graph, s, "QUADRATIC", "ORTHOGONAL", "RIGHT", false);
            }
            compactionRow(graph, "EDGE_LENGTH", "SCANLINE", "SPLINES", "RIGHT", false);
            compactionRow(graph, "LEFT_RIGHT_CONNECTION_LOCKING", "QUADRATIC", "SPLINES", "RIGHT", false);
            compactionRow(graph, "EDGE_LENGTH", "SCANLINE", "ORTHOGONAL", "RIGHT", true);
        }
    }

    // Components compaction: a terminal layout step over the compound node "c" (its inner graph holds the components)

    static void componentRow(String name, String elk, String target) {
        planOfGraph(elk, target, false);
        List<Object> st = new ArrayList<>();
        st.add(imp(target));
        st.add(norm());
        st.add(S("layout"));
        add("scenarios/ComponentsCompactor/" + name, elk, st);
    }

    static void componentScenarios() {
        Map<String, String[]> sides = new LinkedHashMap<>();
        sides.put("four-sides", SIDES_4);
        sides.put("eight-ports", SIDES_8);
        sides.put("north-south", SIDES_NS);
        for (Map.Entry<String, String[]> e : sides.entrySet()) {
            for (String d : ALL_DIRECTIONS) {
                componentRow(e.getKey() + "/group/" + d, gExternal(ropts("DIRECTION", d), compactionInner("DIRECTION", d), e.getValue(), 2, true), "c");
                componentRow(e.getKey() + "/group-model-order/" + d, gExternal(ropts("DIRECTION", d),
                        compactionInner("DIRECTION", d, "CONSIDER_MODEL_ORDER_COMPONENTS", "GROUP_MODEL_ORDER"), e.getValue(), 2, false), "c");
            }
        }
        // the simple row placer: components of a flat graph, three routings, without and with a comment box
        for (String r : List.of("ORTHOGONAL", "POLYLINE", "SPLINES")) {
            String ro = ropts("EDGE_ROUTING", r, "COMPACTION_CONNECTED_COMPONENTS", "true");
            componentRow("flat-components/" + r, flat(ro, join(plain("a0"), plain("a1"), plain("b0"), plain("b1"), plain("b2"), plain("c0"),
                    plain("d0"), plain("d1")), eds("a0>a1", "b0>b1", "b1>b2", "b0>b2", "d0>d1")), null);
            componentRow("flat-comments/" + r, flat(ro, join(plain("a0"), plain("a1"), plain("b0"), comment("k", 40, 20, null), plain("c0")),
                    eds("a0>a1", "k>a1", "b0>c0")), null);
        }
    }

    static void scenarioSpecs(List<Spec> out) {
        SCENARIOS = out;
        selfLoopScenarios();
        dummyScenarios();
        wrappingScenarios();
        compactionScenarios();
        componentScenarios();
    }
}
