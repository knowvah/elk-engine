// SPDX-License-Identifier: EPL-2.0
// Helper 3 of 10 of the recorder tools/vectors/LayeredLoopsVectors.java (issue #50):
// the Base of a row and the phase dump (self loops, geometry, splines, changed).
// The helpers are one chain of superclasses in the order of the former single file. The header of the entry file
// says why, what a helper names without a qualifier, and how the program is built and run.

import java.util.*;
import org.eclipse.elk.alg.layered.graph.LEdge;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.LGraphElement;
import org.eclipse.elk.alg.layered.graph.LLabel;
import org.eclipse.elk.alg.layered.graph.LNode;
import org.eclipse.elk.alg.layered.graph.LPort;
import org.eclipse.elk.alg.layered.graph.Layer;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfHyperLoop;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfHyperLoopLabels;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopEdge;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopHolder;
import org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopPort;
import org.eclipse.elk.alg.layered.options.InternalProperties;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.layered.options.NodeFlexibility;
import org.eclipse.elk.alg.layered.p5edges.splines.SplineSegment;
import org.eclipse.elk.core.math.ElkRectangle;
import org.eclipse.elk.core.options.EdgeRouting;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.graph.properties.IProperty;

abstract class LayeredLoopsVectorsPhaseDump extends LayeredLoopsVectorsInputs {
    // Baseline and phase dump (B2)

    /** The imported LGraph, its fixed positional paths and the property baseline of "changed". */
    static final class Base {
        final LGraph graph;
        final Map<Object, String> paths;
        final List<LNode> nodes;
        final List<LPort> ports = new ArrayList<>();
        final List<LEdge> edges;
        final Map<String, LGraphElement> byPath = new HashMap<>();
        final Map<Object, Map<String, String>> props = new IdentityHashMap<>();
        /** N3: the stop of the row (a processor member or phase) and whether a baseline node was ever flexible. */
        String stop = "";
        boolean flexible;
        /** N3 presence rule: NodeFlexibility.getNodeFlexibility(n) != NONE (sticky: the repeater resets the options). */
        void noteFlexible() {
            for (LNode n : nodes) {
                if (n.getGraph() != null) {
                    NodeFlexibility nf = NodeFlexibility.getNodeFlexibility(n);
                    flexible |= nf != null && nf != NodeFlexibility.NONE;
                }
            }
        }
        Base(LGraph g) {
            graph = g;
            Dump d = new Dump(g, true);
            if (d.graphs.size() != 1) {
                throw new LayeredLoopsVectors.Bug("rows import flat graphs only; found " + d.graphs.size() + " graphs");
            }
            paths = d.paths;
            nodes = new ArrayList<>(d.nodeLists.get(g));
            edges = new ArrayList<>(d.edgeLists.get(g));
            nodes.forEach(n -> ports.addAll(n.getPorts()));
            byPath.put(paths.get(g), g);
            nodes.forEach(n -> byPath.put(paths.get(n), n));
            ports.forEach(p -> byPath.put(paths.get(p), p));
            edges.forEach(e -> byPath.put(paths.get(e), e));
            snapshot();
        }
        List<LGraphElement> elements() {
            List<LGraphElement> all = new ArrayList<>();
            all.add(graph);
            all.addAll(nodes);
            all.addAll(ports);
            all.addAll(edges);
            all.addAll(labels());
            return all;
        }
        List<LLabel> labels() { return paths.keySet().stream().filter(o -> o instanceof LLabel).map(o -> (LLabel) o).sorted(Comparator.comparing(paths::get)).toList(); } // T11: "changed" lists labels too (by path)
        /** Records the C4 value of every property of every baseline element (ignored ids left out). */
        void snapshot() {
            props.clear();
            Encoder enc = new Encoder(paths, true, false);
            for (LGraphElement e : elements()) {
                Map<String, String> m = new TreeMap<>();
                encodeProps(e, enc).forEach((k, v) -> m.put(k, json(v)));
                props.put(e, m);
            }
        }
        LGraphElement element(String path) {
            LGraphElement e = byPath.get(path);
            if (e == null) {
                throw new LayeredLoopsVectors.Bug("no baseline element at path " + path);
            }
            return e;
        }
    }

    static Map<String, Object> encodeProps(LGraphElement e, Encoder enc) {
        Map<String, Object> m = new TreeMap<>();
        for (Map.Entry<IProperty<?>, Object> entry : e.getAllProperties().entrySet()) {
            String id = entry.getKey().getId();
            if (!IGNORED_IDS.contains(id)) {
                m.put(id, enc.encode(entry.getValue(), 0));
            }
        }
        return m;
    }

    static String pathOf(Map<Object, String> paths, Object o) {
        String p = paths.get(o);
        if (p == null) {
            throw new LayeredLoopsVectors.Bug("element without a path: " + o);
        }
        return p;
    }

    static Map<String, Object> phaseDump(Base b) {
        LGraph g = b.graph;
        Dump cur = new Dump(g, true);
        Map<Object, String> paths = new IdentityHashMap<>(b.paths);
        List<LNode> nodes = new ArrayList<>(cur.nodeLists.get(g));
        Set<Object> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        seen.addAll(nodes);
        b.nodes.stream().filter(seen::add).forEach(nodes::add);
        int newNodes = 0, newPorts = 0, newEdges = 0;
        for (LNode n : nodes) {
            if (!paths.containsKey(n)) {
                paths.put(n, "new/n" + newNodes++);
            }
        }
        List<LPort> ports = new ArrayList<>();
        seen.clear();
        for (LNode n : nodes) {
            for (LPort p : n.getPorts()) {
                ports.add(p);
                seen.add(p);
                if (!paths.containsKey(p)) {
                    paths.put(p, "new/p" + newPorts++);
                }
            }
        }
        b.ports.stream().filter(seen::add).forEach(ports::add);
        List<LEdge> edges = new ArrayList<>(cur.edgeLists.get(g));
        seen.clear();
        seen.addAll(edges);
        b.edges.stream().filter(seen::add).forEach(edges::add);
        for (LNode n : nodes) {
            for (LPort p : n.getPorts()) {
                for (List<LEdge> list : List.of(p.getOutgoingEdges(), p.getIncomingEdges())) {
                    list.stream().filter(seen::add).forEach(edges::add);
                }
            }
        }
        for (LEdge e : edges) {
            if (!paths.containsKey(e)) {
                paths.put(e, "new/e" + newEdges++);
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        List<Object> layers = new ArrayList<>();
        for (Layer layer : g.getLayers()) {
            List<Object> inLayer = new ArrayList<>();
            layer.getNodes().forEach(n -> inLayer.add(pathOf(paths, n)));
            layers.add(inLayer);
        }
        m.put("layers", layers);
        List<Object> layerless = new ArrayList<>();
        g.getLayerlessNodes().forEach(n -> layerless.add(pathOf(paths, n)));
        m.put("layerless", layerless);
        List<Object> hidden = new ArrayList<>();
        if (g.hasProperty(InternalProperties.HIDDEN_NODES)) {
            g.getProperty(InternalProperties.HIDDEN_NODES).forEach(n -> hidden.add(pathOf(paths, n)));
        }
        m.put("hidden", hidden);
        List<Object> edgeRows = new ArrayList<>();
        for (LEdge e : edges) {
            Map<String, Object> em = new LinkedHashMap<>();
            em.put("path", pathOf(paths, e));
            em.put("src", e.getSource() == null ? null : pathOf(paths, e.getSource()));
            em.put("tgt", e.getTarget() == null ? null : pathOf(paths, e.getTarget()));
            em.put("reversed", e.getProperty(InternalProperties.REVERSED));
            edgeRows.add(em);
        }
        m.put("edges", edgeRows);
        Map<String, Object> portMap = new LinkedHashMap<>();
        for (LNode n : nodes) {
            List<Object> portPaths = new ArrayList<>();
            n.getPorts().forEach(p -> portPaths.add(pathOf(paths, p)));
            portMap.put(pathOf(paths, n), portPaths);
        }
        m.put("ports", portMap);
        m.put("changed", changed(b, paths, nodes, ports, edges));
        m.put("geometry", geometry(b, paths, nodes, ports, edges));
        Map<String, Object> selfLoops = selfLoops(paths, nodes);
        if (!selfLoops.isEmpty()) {
            m.put("selfLoops", selfLoops);
        }
        return m;
    }

    static List<Object> pathList(Map<Object, String> paths, Collection<? extends Object> elements) {
        List<Object> l = new ArrayList<>();
        elements.forEach(e -> l.add(pathOf(paths, e)));
        return l;
    }

    static List<Object> slots(int[] slots) {
        List<Object> l = new ArrayList<>();
        for (int v : slots) {
            l.add(v);
        }
        return l;
    }

    /** W3: the SelfLoopHolder of every node that has one, through its public accessors (node path -> holder summary, see the header). */
    static Map<String, Object> selfLoops(Map<Object, String> paths, List<LNode> nodes) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (LNode n : nodes) {
            if (!n.hasProperty(InternalProperties.SELF_LOOP_HOLDER)) {
                continue;
            }
            SelfLoopHolder holder = n.getProperty(InternalProperties.SELF_LOOP_HOLDER);
            Map<String, Object> h = new LinkedHashMap<>();
            h.put("portsHidden", holder.arePortsHidden());
            h.put("slotCounts", slots(holder.getRoutingSlotCount()));
            List<Object> ports = new ArrayList<>();
            for (SelfLoopPort slPort : holder.getSLPortMap().values()) {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("port", pathOf(paths, slPort.getLPort()));
                pm.put("hadOnlySelfLoops", slPort.hadOnlySelfLoops());
                pm.put("hidden", slPort.isHidden());
                ports.add(pm);
            }
            h.put("ports", ports);
            List<Object> loops = new ArrayList<>();
            for (SelfHyperLoop loop : holder.getSLHyperLoops()) {
                loops.add(selfHyperLoop(paths, loop));
            }
            h.put("loops", loops);
            result.put(pathOf(paths, n), h);
        }
        return result;
    }

    static Map<String, Object> selfHyperLoop(Map<Object, String> paths, SelfHyperLoop loop) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("type", loop.getSelfLoopType() == null ? null : loop.getSelfLoopType().name());
        m.put("ports", pathList(paths, loop.getSLPorts().stream().map(SelfLoopPort::getLPort).toList()));
        m.put("edges", pathList(paths, loop.getSLEdges().stream().map(SelfLoopEdge::getLEdge).toList()));
        m.put("occupiedSides", names(loop.getOccupiedPortSides()));
        List<Object> slot = new ArrayList<>();
        for (PortSide side : PortSide.values()) {
            slot.add(loop.getRoutingSlot(side));
        }
        m.put("slots", slot);
        m.put("leftmost", loop.getLeftmostPort() == null ? null : pathOf(paths, loop.getLeftmostPort().getLPort()));
        m.put("rightmost", loop.getRightmostPort() == null ? null : pathOf(paths, loop.getRightmostPort().getLPort()));
        SelfHyperLoopLabels labels = loop.getSLLabels();
        if (labels == null) {
            m.put("labels", null);
        } else {
            Map<String, Object> lm = new LinkedHashMap<>();
            lm.put("labels", pathList(paths, labels.getLLabels()));
            lm.put("side", labels.getSide() == null ? null : labels.getSide().name());
            lm.put("alignment", labels.getAlignment() == null ? null : labels.getAlignment().name());
            lm.put("size", pair(labels.getSize()));
            lm.put("position", pair(labels.getPosition()));
            lm.put("reference", labels.getAlignmentReferenceSLPort() == null ? null : pathOf(paths, labels.getAlignmentReferenceSLPort().getLPort()));
            m.put("labels", lm);
        }
        return m;
    }

    /** N3 + R3: node geometry for every node of the traversal, the layer sizes, (presence rule) port and label positions, on every row the
     * graph size and offset and the bend and junction points of every edge, and on a P5 SPLINES stop the spline routes. */
    static Map<String, Object> geometry(Base b, Map<Object, String> paths, List<LNode> nodes, List<LPort> ports, List<LEdge> edges) {
        Map<String, Object> geo = new LinkedHashMap<>();
        Map<String, Object> nodeMap = new LinkedHashMap<>();
        for (LNode n : nodes) {
            Map<String, Object> nm = new LinkedHashMap<>();
            nm.put("pos", pair(n.getPosition()));
            nm.put("size", pair(n.getSize()));
            nm.put("margin", margin(n.getMargin()));
            nodeMap.put(pathOf(paths, n), nm);
        }
        geo.put("nodes", nodeMap);
        List<Object> layerSizes = new ArrayList<>();
        for (Layer layer : b.graph.getLayers()) {
            layerSizes.add(pair(layer.getSize()));
        }
        geo.put("layers", layerSizes);
        if (b.flexible || PORT_LABEL_STOPS.contains(b.stop)) {
            Map<String, Object> portMap = new LinkedHashMap<>();
            ports.forEach(p -> portMap.put(pathOf(paths, p), single("pos", pair(p.getPosition()))));
            geo.put("ports", portMap);
            Map<String, Object> labelMap = new LinkedHashMap<>();
            b.labels().forEach(l -> labelMap.put(pathOf(paths, l), single("pos", pair(l.getPosition()))));
            geo.put("labels", labelMap);
        }
        if (SEVEN_F2.contains(b.stop)) { // G2: the sizes a label manager or the switcher may change
            Map<String, Object> sizes = new LinkedHashMap<>();
            b.labels().forEach(l -> sizes.put(pathOf(paths, l), pair(l.getSize())));
            geo.put("labelSizes", sizes);
        }
        Map<String, Object> graphMap = new LinkedHashMap<>();
        graphMap.put("size", pair(b.graph.getSize()));
        graphMap.put("offset", pair(b.graph.getOffset()));
        geo.put("graph", graphMap);
        Map<String, Object> edgeMap = new LinkedHashMap<>();
        for (LEdge e : edges) {
            Map<String, Object> em = new LinkedHashMap<>();
            List<Object> bends = new ArrayList<>();
            e.getBendPoints().forEach(p -> bends.add(pair(p)));
            em.put("bendPoints", bends);
            if (e.hasProperty(LayeredOptions.JUNCTION_POINTS)) {
                List<Object> junctions = new ArrayList<>();
                e.getProperty(LayeredOptions.JUNCTION_POINTS).forEach(p -> junctions.add(pair(p)));
                em.put("junctionPoints", junctions);
            }
            edgeMap.put(pathOf(paths, e), em);
        }
        geo.put("edges", edgeMap);
        if ((b.stop.equals("P5") || b.stop.equals(P5)) && b.graph.getProperty(LayeredOptions.EDGE_ROUTING) == EdgeRouting.SPLINES) {
            geo.put("splines", splines(paths, edges));
        }
        return geo;
    }

    /** R3: the chain and the route (SplineSegment fields, public) of every edge that starts a spline. */
    static Map<String, Object> splines(Map<Object, String> paths, List<LEdge> edges) {
        Map<String, Object> result = new LinkedHashMap<>();
        for (LEdge e : edges) {
            if (!e.hasProperty(InternalProperties.SPLINE_ROUTE_START)) {
                continue;
            }
            List<Object> chain = new ArrayList<>();
            e.getProperty(InternalProperties.SPLINE_EDGE_CHAIN).forEach(c -> chain.add(pathOf(paths, c)));
            List<Object> route = new ArrayList<>();
            for (SplineSegment s : e.getProperty(InternalProperties.SPLINE_ROUTE_START)) {
                Map<String, Object> sm = new LinkedHashMap<>();
                ElkRectangle box = s.boundingBox;
                sm.put("box", List.of(hex(box.x), hex(box.y), hex(box.width), hex(box.height)));
                sm.put("rank", s.rank);
                sm.put("isStraight", s.isStraight);
                sm.put("xDelta", hex(s.xDelta));
                sm.put("westOfInitialLayer", s.isWestOfInitialLayer);
                sm.put("centerControlPointY", hex(s.centerControlPointY));
                route.add(sm);
            }
            Map<String, Object> spline = new LinkedHashMap<>();
            spline.put("chain", chain);
            spline.put("route", route);
            result.put(pathOf(paths, e), spline);
        }
        return result;
    }

    static List<Object> changed(Base b, Map<Object, String> paths, List<LNode> nodes, List<LPort> ports, List<LEdge> edges) {
        List<LGraphElement> elements = new ArrayList<>();
        elements.add(b.graph);
        elements.addAll(nodes);
        elements.addAll(ports);
        elements.addAll(edges);
        elements.addAll(b.labels());
        Encoder enc = new Encoder(paths, true, false);
        List<Object> changed = new ArrayList<>();
        for (LGraphElement e : elements) {
            Map<String, Object> now = encodeProps(e, enc);
            Map<String, String> before = b.props.getOrDefault(e, Map.of());
            Map<String, Object> diff = new TreeMap<>();
            now.forEach((k, v) -> {
                if (!json(v).equals(before.get(k))) {
                    diff.put(k, v);
                }
            });
            before.keySet().stream().filter(k -> !now.containsKey(k)).forEach(k -> diff.put(k, null));
            if (!diff.isEmpty()) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("path", pathOf(paths, e));
                row.put("props", diff);
                changed.add(row);
            }
        }
        return changed;
    }
}
