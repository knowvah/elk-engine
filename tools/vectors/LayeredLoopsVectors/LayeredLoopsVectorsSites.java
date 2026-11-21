// SPDX-License-Identifier: EPL-2.0
// Helper 8 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the rows of the group sites.
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import java.util.*;
import org.eclipse.elk.alg.layered.intermediate.DummySelfLoopProcessor;
import org.eclipse.elk.graph.json.ElkGraphJson;

abstract class LayeredLoopsVectorsSites extends LayeredLoopsVectorsScenarios {
    // Group sites (T20): one step row per scenario of plans/layered-loops-wrapping-compaction/unreached.md (Sc1-Sc34). Expectations come
    // from the oracle only; rows are appended after the scenarios, so no earlier row changes.

    static List<Spec> SITES;
    static final String RT = "RIGHT", SELF_ORDER = "EDGE_ROUTING_SELF_LOOP_ORDERING", SELF_DIST = "EDGE_ROUTING_SELF_LOOP_DISTRIBUTION",
            WRAP = "WRAPPING_STRATEGY", CUTTING = "WRAPPING_CUTTING_STRATEGY", VALIDIFY = "WRAPPING_VALIDIFY_STRATEGY", CUTS = "WRAPPING_CUTTING_CUTS",
            FORBIDDEN = "WRAPPING_VALIDIFY_FORBIDDEN_INDICES", POST = "COMPACTION_POST_COMPACTION_STRATEGY", ROUTING = "EDGE_ROUTING",
            SEPARATE = "SEPARATE_CONNECTED_COMPONENTS", PORT_CONS = "PORT_CONSTRAINTS", CONNECTED = "COMPACTION_CONNECTED_COMPONENTS";

    static void siteRow(String id, String elk, List<Object> st) {
        SITES.add(new Spec("sites/" + id, "sites", null, () -> ElkGraphJson.forGraph(elk).toElk(), null, new TreeMap<>(), null, st, null));
    }

    /** The chain up to the stop (null = the whole plan) with the setProperty steps after importGraph, and a dump. */
    @SafeVarargs
    static void stopSite(String id, String elk, String stop, boolean manager, List<Object>... sets) {
        List<Object> st = chainOf(elk, null, stop, manager);
        int at = manager ? 2 : 1;
        for (List<Object> s : sets) {
            st.add(at++, s);
        }
        st.add(dump());
        siteRow(id, elk, st);
    }

    /** importGraph (target), normalise and the terminal layout of the imported graph. */
    static void layoutSite(String id, String elk, String target) {
        planOfGraph(elk, target, false);
        siteRow(id, elk, steps(imp(target), norm(), S("layout")));
    }

    /** n nodes n0.. in a chain plus the extra edges (a>b specs). */
    static String gChain(String ro, int n, String... extra) {
        List<String> kids = new ArrayList<>(), edges = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            kids.add(plain("n" + i));
            if (i + 1 < n) {
                edges.add("n" + i + ">n" + (i + 1));
            }
        }
        edges.addAll(Arrays.asList(extra));
        return flat(ro, String.join(",", kids), eds(edges.toArray(new String[0])));
    }

    static String lo(String... kv) {
        return ropts(kv);
    }

    /** A label with its own layout options (constant, value, ...). */
    static String labO(String text, int w, int h, String... opts) {
        return "{\"text\":\"" + text + "\",\"width\":" + w + ",\"height\":" + h + ",\"layoutOptions\":{" + ropts(opts) + "}}";
    }

    /** Node a (80 x 80, the options) with ports of the given sides (null: no side) and the edges as ready JSON objects. */
    static String loopNode(String optsJson, String... sides) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj("a", i, sides[i], null));
        }
        return sz(nodeJson("a", null, optsJson, "\"ports\":[" + String.join(",", ports) + "]"), 80, 80);
    }

    /** Node a between n0 and n2 (edges n0>a.p0, a.p1>n2, ids e0, e1) with the loop edges (ids from e2); a bypass is not added. */
    static String gLoopA(String ro, String optsJson, String[] sides, String... loopEdges) {
        return flat(ro, join(plain("n0"), loopNode(optsJson, sides), plain("n2")), join(eds("n0>a.p0", "a.p1>n2"), String.join(",", loopEdges)));
    }

    static String le(int i, String src, String tgt, String... labels) {
        return edl("e" + i, src, tgt, labels);
    }

    static String pcFs() {
        return ropts(PORT_CONS, FS);
    }

    static String withOpts(String... kv) {
        return pcFs() + (kv.length == 0 ? "" : "," + ropts(kv));
    }

    static void siteSpecs(List<Spec> out) {
        SITES = out;
        wrapSites();
        breakingSites();
        loopLabelSites();
        loopOrderSites();
        dummySites();
        componentSites();
        compactorSites();
    }

    static List<Object> cuts(int... c) {
        return set("g0", CUTS, ints(c));
    }

    static void wrapSites() {
        String sw = lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", CUTTING, "MANUAL");
        // Sc1: nine layers, the layers of {p, q} and of n5 forbid a cut
        String path = flat(lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", CUTTING, "MANUAL", VALIDIFY, "LOOK_BACK"), join(plain("n0"), plain("n1"), plain("n2"),
                plain("n3"), plain("p"), plain("q"), plain("n5"), plain("n6"), plain("n7"), plain("n8")),
                eds("n0>n1", "n1>n2", "n2>n3", "n3>p", "n3>q", "p>n5", "q>n5", "n5>n6", "n6>n7", "n7>n8"));
        stopSite("SingleEdgeGraphWrapper/validifyLookBack/lower", path, SINGLE_EDGE_STOP, false, cuts(4));
        stopSite("SingleEdgeGraphWrapper/validifyLookBack/upper", path, SINGLE_EDGE_STOP, false, cuts(5));
        stopSite("SingleEdgeGraphWrapper/validifyLookBack/skip", path, SINGLE_EDGE_STOP, false, cuts(5, 5));
        // Sc2
        stopSite("SingleEdgeGraphWrapper/aspectAbove", gChain(lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", "ASPECT_RATIO", "20"), 8), SINGLE_EDGE_STOP, false);
        stopSite("SingleEdgeGraphWrapper/manualNoCuts", gChain(sw, 8), SINGLE_EDGE_STOP, false);
        // Sc3: forbidden indices outside 1..size-1
        for (String v : List.of("GREEDY", "LOOK_BACK")) {
            stopSite("GraphStats/forbiddenOutOfRange/" + (v.equals("GREEDY") ? "greedy" : "lookBack"),
                    gChain(lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", CUTTING, "MANUAL", VALIDIFY, v), 8), SINGLE_EDGE_STOP, false, cuts(3),
                    set("g0", FORBIDDEN, ints(0, 99)));
        }
        // Sc4: a NORTH port target in the chain
        String ns = flat(lo("DIRECTION", RT, WRAP, "SINGLE_EDGE", "ASPECT_RATIO", "0.3"), join(plain("a"),
                nodeJson("b", null, ropts(PORT_CONS, FS), "\"ports\":[" + pj("b", 0, N_, null) + "]"), plain("c"), plain("d"), plain("e"), plain("f"),
                plain("g"), plain("h")), eds("a>b", "b.p0>c", "c>d", "d>e", "e>f", "f>g", "g>h"));
        stopSite("GraphStats/northSouthHeight", ns, SINGLE_EDGE_STOP, false);
        // Sc11: a negative edge thickness
        stopSite("CuttingUtils/negativeThickness", gChain(sw, 8, "n2>n3:EDGE_THICKNESS=-2"), SINGLE_EDGE_STOP, false, cuts(3));
        // Sc5: an empty graph (components are not separated: an empty component list would skip every processor)
        for (String r : List.of("ORTHOGONAL", "POLYLINE", "SPLINES")) {
            String base = "{\"id\":\"root\",\"layoutOptions\":{" + lo(SEPARATE, "false", ROUTING, r);
            layoutSite("Empty/" + r + "/wrap", base + "," + ropts(WRAP, "SINGLE_EDGE") + "}}", null);
            if (!r.equals("POLYLINE")) {
                layoutSite("Empty/" + r + "/compact", base + "," + ropts(POST, "LEFT") + "}}", null);
            }
        }
    }

    static void breakingSites() {
        String mw = lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL");
        // Sc6: one layer
        stopSite("BreakingPointInserter/oneLayerImproveCuts", flat(mw, join(plain("a"), plain("b")), ""), "BREAKING_POINT_INSERTER", false, cuts(1));
        // Sc7: chained breaking points on one edge
        for (String r : List.of("ORTHOGONAL", "POLYLINE")) {
            String elk = gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", ROUTING, r, "WRAPPING_MULTI_EDGE_IMPROVE_WRAPPED_EDGES", "false"), 12, "n0>n11");
            stopSite("BreakingPointRemover/multiCutEdge/" + r, elk, null, false, cuts(3, 6));
        }
        // Sc8
        for (String on : List.of("true", "false")) {
            String elk = gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", "WRAPPING_MULTI_EDGE_IMPROVE_WRAPPED_EDGES", on), 9,
                    "n0>n8", "n1>n8");
            stopSite("BreakingPointProcessor/inLayerDummies/" + (on.equals("true") ? "improveOn" : "improveOff"), elk, "BREAKING_POINT_PROCESSOR", false, cuts(4));
        }
        // Sc9: two components that no cut crosses (interactive layering by position)
        String gap = flat(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", "LAYERING_STRATEGY", "INTERACTIVE", SEPARATE, "false",
                "CROSSING_MINIMIZATION_STRATEGY", "NONE"),
                join(at("a", 0, 0), at("b", 40, 0), at("c", 100, 60), at("d", 140, 60), at("e", 180, 60)), eds("a>b", "c>d", "d>e"));
        stopSite("BreakingPointProcessor/emptyBreakingLayer", gap, "BREAKING_POINT_PROCESSOR", false, cuts(2));
        // Sc10
        String sk = "n1>n6", sk2 = "n3>n9";
        stopSite("BreakingPointRemover/wrapSplinesPolyline/SPLINES", gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", ROUTING, "SPLINES"),
                12, sk, sk2), "FINAL_SPLINE_BENDPOINTS_CALCULATOR", false, cuts(3, 6, 9));
        stopSite("BreakingPointRemover/wrapSplinesPolyline/POLYLINE", gChain(lo("DIRECTION", RT, WRAP, "MULTI_EDGE", CUTTING, "MANUAL", ROUTING, "POLYLINE"),
                12, sk, sk2), "BREAKING_POINT_REMOVER", false, cuts(3, 6, 9));
    }

    static void loopLabelSites() {
        String ro = lo("DIRECTION", RT);
        String lab60 = labO("l", 60, 12, "EDGE_LABELS_INLINE", "true");
        // Sc12: four loops with an inline center label: {N,E,W}, {E,W}, {N,S}, {N,S,W}
        for (String d : List.of("RIGHT", "DOWN")) {
            String elk = gLoopA(lo("DIRECTION", d), pcFs(), sd(WEST, EAST, NORTH, EAST, WEST, EAST, WEST, NORTH, SOUTH, NORTH, SOUTH, WEST),
                    le(2, "a.p2", "a.p3", lab60), le(3, "a.p3", "a.p4"), le(4, "a.p5", "a.p6", lab60), le(5, "a.p7", "a.p8", lab60),
                    le(6, "a.p9", "a.p10", lab60), le(7, "a.p10", "a.p11"));
            stopSite("SelfLoopRouter/inlineLabels/" + d, elk, "SELF_LOOP_ROUTER", false);
        }
        // Sc13: a label manager that shrinks the wide labels: E-E (TOP), N-N (CENTER), N-E (LEFT), E-N (RIGHT)
        String wide = lab("w", 200, 12, null);
        String elk13 = gLoopA(ro, pcFs(), sd(WEST, EAST, EAST, EAST, NORTH, NORTH, NORTH, EAST, WEST, NORTH),
                le(2, "a.p2", "a.p3", wide), le(3, "a.p4", "a.p5", wide), le(4, "a.p6", "a.p7", wide), le(5, "a.p8", "a.p9", wide));
        stopSite("SelfLoopRouter/labelManager/shrink", elk13, "SELF_LOOP_ROUTER", true);
        // Sc14: two one-sided loops with labels on the south side, none on the north
        stopSite("LabelPlacer/sequencedSouthOnly", gLoopA(ro, withOpts(SELF_ORDER, "SEQUENCED"), sd(WEST, EAST, SOUTH, SOUTH, SOUTH, SOUTH),
                le(2, "a.p2", "a.p3", lab("s0", 30, 10, null)), le(3, "a.p4", "a.p5", lab("s1", 30, 10, null))), "SELF_LOOP_ROUTER", false);
        // Sc15: one FOUR_SIDES hyper loop with a center label; leftmost port on NORTH / not on NORTH
        String loop4 = join(le(0, "a.p0", "a.p1", lab("f", 30, 10, null)), le(1, "a.p1", "a.p2"), le(2, "a.p2", "a.p3"));
        stopSite("LabelPlacer/fourSidesLabel/northFirst", flat(ro, loopNode(pcFs(), NORTH, EAST, SOUTH, WEST), loop4), "SELF_LOOP_ROUTER", false);
        // a connected port on the east side moves the break of the loop away from the north side
        stopSite("LabelPlacer/fourSidesLabel/otherFirst", flat(ro, join(loopNode(pcFs(), NORTH, EAST, SOUTH, WEST, EAST), plain("m")),
                join(loop4, le(3, "m", "a.p4"))), "SELF_LOOP_ROUTER", false);
        // Sc16: a WEST loop with a center label
        stopSite("LabelPlacer/westLoopLabel", gLoopA(ro, pcFs(), sd(WEST, EAST, WEST, WEST), le(2, "a.p2", "a.p3", lab("w", 30, 10, null))),
                "SELF_LOOP_ROUTER", false);
        // Sc17: a labelled loop, then an unlabelled one, on the north side
        stopSite("RoutingSlotAssigner/labelledThenUnlabelled", gLoopA(ro, pcFs(), sd(WEST, EAST, NORTH, NORTH, NORTH, NORTH),
                le(2, "a.p2", "a.p3", lab("n", 30, 10, null)), le(3, "a.p4", "a.p5")), "SELF_LOOP_ROUTER", false);
    }

    static void loopOrderSites() {
        String ro = lo("DIRECTION", RT);
        // Sc18: three ports of one side with net flows -2, 1, 1
        stopSite("PortRestorer/splitIndex", gLoopA(ro, pcFs(), sd(WEST, EAST, EAST, EAST, EAST), le(2, "a.p2", "a.p3"), le(3, "a.p2", "a.p4")),
                "SELF_LOOP_PORT_RESTORER", false);
        // Sc19: two one-sided loops on one side, REVERSE_STACKED and SEQUENCED set on the node
        for (String o : List.of("REVERSE_STACKED", "SEQUENCED")) {
            stopSite("PortRestorer/reverseStacked/" + (o.equals("SEQUENCED") ? "sequenced" : "reverse"), gLoopA(ro, withOpts(SELF_ORDER, o),
                    sd(WEST, EAST, EAST, EAST, EAST, EAST), le(2, "a.p2", "a.p3"), le(3, "a.p4", "a.p5")), "SELF_LOOP_PORT_RESTORER", false);
        }
        // Sc20: one hyper loop over four free ports, p0 and p2 visible (they also carry an edge to a neighbour), p1 and p3 hidden
        for (String dist : List.of("EQUALLY", "NORTH_SOUTH")) {
            String elk = flat(ro, join(plain("n0"), loopNode(ropts(PORT_CONS, "FREE", SELF_DIST, dist), null, null, null, null), plain("n2")),
                    join(eds("n0>a.p0", "a.p2>n2"), le(2, "a.p0", "a.p1"), le(3, "a.p1", "a.p2"), le(4, "a.p2", "a.p3")));
            stopSite("PortSideAssigner/hiddenAndVisible/" + dist, elk, "SELF_LOOP_PORT_RESTORER", false);
        }
    }




    static void cyclicLoopSites() {
        // Sc21: three disjoint hyper loops over eleven ports (N N E E E E S S S W W; loops {3,10,4}, {5,8,0}, {7,2,1,9,6}) whose pairwise crossing
        // counts are intransitive (found by a random search on the oracle, checked on the dump): the router's dependency graph has a cycle of
        // positive weights and its cycle breaker draws from the random seed; the two seeds draw different ways round
        for (String seed : List.of("1", "4096")) {
            String elk = flat(lo("DIRECTION", RT, "RANDOM_SEED", seed), loopNode(pcFs(), NORTH, NORTH, EAST, EAST, EAST, EAST, SOUTH, SOUTH, SOUTH, WEST, WEST),
                    join(le(0, "a.p3", "a.p10"), le(1, "a.p10", "a.p4"), le(2, "a.p5", "a.p8"), le(3, "a.p8", "a.p0"), le(4, "a.p7", "a.p2"),
                            le(5, "a.p2", "a.p1"), le(6, "a.p1", "a.p9"), le(7, "a.p9", "a.p6")));
            stopSite("RoutingSlotAssigner/cyclicHyperLoops/seed" + seed, elk, "SELF_LOOP_ROUTER", false);
        }
        // four hyper loops with a cycle among the dependencies and segments of unequal out flow (found by the same search)
        stopSite("RoutingSlotAssigner/cyclicHyperLoops/loops4a/seed1", flat(lo("DIRECTION", RT, "RANDOM_SEED", "1"), loopNode(pcFs(), NORTH, NORTH, NORTH, NORTH, EAST, EAST, EAST, EAST, SOUTH, SOUTH, SOUTH, WEST, WEST, WEST),
                join(le(0, "a.p13", "a.p9"), le(1, "a.p9", "a.p8"), le(2, "a.p0", "a.p10"), le(3, "a.p10", "a.p1"), le(4, "a.p2", "a.p11"), le(5, "a.p11", "a.p7"), le(6, "a.p4", "a.p5"), le(7, "a.p5", "a.p12"), le(8, "a.p12", "a.p3"), le(9, "a.p3", "a.p6"))), "SELF_LOOP_ROUTER", false);
        // four hyper loops with a cycle among the dependencies and segments of unequal out flow (found by the same search)
        stopSite("RoutingSlotAssigner/cyclicHyperLoops/loops4b/seed1", flat(lo("DIRECTION", RT, "RANDOM_SEED", "1"), loopNode(pcFs(), NORTH, NORTH, EAST, EAST, EAST, EAST, EAST, SOUTH, SOUTH, SOUTH, WEST, WEST, WEST, WEST, WEST),
                join(le(0, "a.p2", "a.p4"), le(1, "a.p4", "a.p11"), le(2, "a.p14", "a.p3"), le(3, "a.p3", "a.p13"), le(4, "a.p8", "a.p6"), le(5, "a.p6", "a.p1"), le(6, "a.p5", "a.p9"), le(7, "a.p9", "a.p12"), le(8, "a.p12", "a.p10"), le(9, "a.p10", "a.p7"), le(10, "a.p7", "a.p0"))), "SELF_LOOP_ROUTER", false);
    }

    static void dummySites() {
        cyclicLoopSites();
        // Sc22: loops that stay for the P5 routers, POLYLINE and SPLINES
        for (String r : List.of("POLYLINE", "SPLINES")) {
            for (String pair : List.of("EAST-EAST", "WEST-WEST", "NORTH-EAST")) {
                String[] end = pair.split("-");
                String elk = gLoops(lo("DIRECTION", RT, ROUTING, r), lg(pair, FS, sd(WEST, EAST, end[0], end[1]), "a.p2>a.p3"))
                        .replace(plain("b"), sz(plain("b"), 200, 30)); // a layer wider than a: the polyline router bends the loop at the layer edge
                siteRow("DummySelfLoopProcessor/" + pair + "/RIGHT/end/" + r, elk, dummyChain(elk, true));
            }
        }
        // Sc23: a north (south) port dummy with two edges
        String north = flat(lo("DIRECTION", RT, ROUTING, "ORTHOGONAL"), join(plain("a"), plain("b"), plain("c"), pnode("n", FS, null, NORTH)), eds("a>n.p0", "b>n.p0", "n.p0>c"));
        String south = flat(lo("DIRECTION", RT, ROUTING, "ORTHOGONAL"), join(plain("a"), plain("c"), plain("d"), pnode("n", FS, null, SOUTH)), eds("n.p0>c", "n.p0>d", "a>n.p0"));
        stopSite("NorthSouthPortPostprocessor/multiPortDummy/north", north, "NORTH_SOUTH_PORT_POSTPROCESSOR", false);
        stopSite("NorthSouthPortPostprocessor/multiPortDummy/south", south, "NORTH_SOUTH_PORT_POSTPROCESSOR", false);
        // Sc24: a NORTH-NORTH loop dummy next to a head label
        String elk24 = flat(lo("DIRECTION", RT), join(plain("n0"), loopNode(pcFs(), WEST, EAST, NORTH, NORTH), plain("n2")),
                join(edl("e0", "n0", "a.p0", lab("h", 30, 12, "HEAD")), le(1, "a.p1", "n2"), le(2, "a.p2", "a.p3")));
        siteRow("EndLabelPreprocessor/sameSideLoopDummy", elk24, dummyChainTo(elk24, "END_LABEL_PREPROCESSOR"));
    }

    /** As dummyChain, but the chain stops after the plan member (the Dummy op is in front of the first north/south or P3 member). */
    static List<Object> dummyChainTo(String elk, String stop) {
        List<Object> st = dummyChain(elk, true);
        List<Object> out = new ArrayList<>();
        for (Object o : st) {
            out.add(o);
            if (o instanceof List<?> l && l.size() > 1 && l.get(0).equals("runProcessor") && l.get(1).equals(stop)) {
                break;
            }
        }
        out.add(dump());
        return out;
    }

    /** A compound node c (200 x 200, the inner options) with ports of the given sides, the children and the edges (a>b specs), in a root. */
    static String gComp(String ro, String innerOpts, String[] sides, String[] kids, String... edges) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pj("c", i, sides[i], null));
        }
        String c = "{\"id\":\"c\",\"width\":200,\"height\":200,\"layoutOptions\":{" + innerOpts + "},\"ports\":[" + String.join(",", ports)
                + "],\"children\":[" + String.join(",", kids) + "],\"edges\":[" + eds(edges) + "]}";
        return "{\"id\":\"root\",\"layoutOptions\":{" + ro + "},\"children\":[" + c + "]}";
    }

    /** gComp with a label on every port of c: with port labels INSIDE the ports become external ports without any edge. */
    static String gCompLabelled(String ro, String innerOpts, String[] sides, String[] kids) {
        List<String> ports = new ArrayList<>();
        for (int i = 0; i < sides.length; i++) {
            ports.add(pjl("c", i, sides[i], 18));
        }
        return "{\"id\":\"root\",\"layoutOptions\":{" + ro + "},\"children\":[{\"id\":\"c\",\"width\":200,\"height\":200,\"layoutOptions\":{" + innerOpts
                + "},\"ports\":[" + String.join(",", ports) + "],\"children\":[" + String.join(",", kids) + "]}]}";
    }

    static void componentSites() {
        String ro = lo("DIRECTION", RT);
        String inner = compactionInner();
        // Sc26: external ports without an edge (port labels INSIDE), next to one regular node
        String lonely = compactionInner("PORT_LABELS_PLACEMENT", "INSIDE");
        layoutSite("ComponentsCompactor/loneExternalPorts/fourSides", gCompLabelled(ro, lonely, sd(WEST, NORTH, EAST, SOUTH), new String[] {plain("x")}), "c");
        layoutSite("ComponentsCompactor/loneExternalPorts/northSouth", gCompLabelled(ro, lonely, sd(NORTH, SOUTH), new String[] {plain("x")}), "c");
        // Sc27: one component connected to the external ports of three sides
        layoutSite("ComponentsCompactor/threeSideExtension/ESW", gComp(ro, inner, sd(EAST, SOUTH, WEST), new String[] {plain("x")}, "c.p0>x", "x>c.p1", "c.p2>x"), "c");
        layoutSite("ComponentsCompactor/threeSideExtension/NSW", gComp(ro, inner, sd(NORTH, SOUTH, WEST), new String[] {plain("x")}, "c.p0>x", "x>c.p1", "c.p2>x"), "c");
    }

    static void compactorSites() {
        String ho = "HORIZONTAL_COMPACTOR";
        // Sc29: a comment box without an edge
        for (String st : List.of("LEFT", "EDGE_LENGTH")) {
            stopSite("HorizontalGraphCompactor/commentWithoutEdge/" + st, flat(lo("DIRECTION", RT, ROUTING, "ORTHOGONAL", POST, st),
                    join(plain("a"), plain("b"), comment("c", 40, 20, null)), eds("a>b")), ho, false);
        }
        // Sc30: a hyperedge with three sources and one target
        for (String st : List.of("LEFT_RIGHT_CONNECTION_LOCKING", "EDGE_LENGTH")) {
            stopSite("HorizontalGraphCompactor/hyperedgeFanIn/" + (st.equals("EDGE_LENGTH") ? "EDGE_LENGTH" : "LRCL"),
                    flat(lo("DIRECTION", RT, ROUTING, "ORTHOGONAL", POST, st), join(plain("a"), plain("b"), plain("c"), pnode("t", FS, null, WEST)),
                            eds("a>t.p0", "b>t.p0", "c>t.p0")), ho, false);
        }
        // Sc31: a labelled self loop under compaction
        for (String r : List.of("ORTHOGONAL", "SPLINES")) {
            stopSite("HorizontalGraphCompactor/selfLoopLabel/" + r, gLoops(lo("DIRECTION", RT, ROUTING, r, POST, "LEFT"),
                    labelled("lbl", sd(WEST, EAST, EAST, EAST), "a.p2>a.p3")), ho, false);
        }
        // Sc32: north and south external ports under compaction of the level of c
        for (String st : List.of("LEFT", "EDGE_LENGTH")) {
            layoutSite("HorizontalGraphCompactor/northSouthExternalPorts/" + st, gComp(lo("DIRECTION", RT),
                    lo(PORT_CONS, FS, ROUTING, "ORTHOGONAL", POST, st), sd(NORTH, EAST, SOUTH, WEST), new String[] {plain("k0"), plain("k1"), plain("k2"),
                            plain("k3")}, "c.p0>k0", "k1>c.p1", "c.p2>k2", "k3>c.p3"), "c");
        }
        // Sc33: inverted ports with an edge of two vertical segments
        String eo = lo("DIRECTION", RT, ROUTING, "ORTHOGONAL", POST, "EDGE_LENGTH");
        stopSite("HorizontalGraphCompactor/invertedPorts/west", flat(eo, join(pnode("a", FS, null, WEST), plain("b"), plain("c")),
                eds("a.p0>b", "a.p0>c")), ho, false);
        stopSite("HorizontalGraphCompactor/invertedPorts/east", flat(eo, join(plain("a"), pnode("b", FS, null, EAST), plain("c")),
                eds("a>b.p0", "c>b.p0")), ho, false);
        stopSite("HorizontalGraphCompactor/invertedPorts/both", flat(eo, join(pnode("a", FS, null, WEST), pnode("b", FS, null, EAST), plain("c")),
                eds("a.p0>b.p0", "a.p0>c")), ho, false);
        // an edge from a north port to an east input port: its vertical segment of the north port is in the group of the node itself
        stopSite("HorizontalGraphCompactor/invertedPorts/northToEast", flat(eo, join(pnode("a", FS, null, NORTH), pnode("b", FS, null, EAST), plain("c")),
                eds("a.p0>b.p0", "b>c")), ho, false);
    }
}
