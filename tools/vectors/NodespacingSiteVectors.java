// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 6c, D1-D7, E1-E3) for the scenarios of
// org.eclipse.elk.alg.common.nodespacing whose hand-derived TS expectations were corrected after a first failure in
// mission 6b (the five flagged sites), plus the scenarios that cover the T4 branches the 326-row node-micro-layout.json
// replay leaves unreached (plans/ad13-rederivation/t4-unreached.md). Every scenario is built by hand in Java (the same
// ElkGraphUtil graph and the same direct calls to the public nodespacing.internal classes as the TS tests make) and the
// result is recorded. This program only CALLS ELK APIs and records results; it embeds no ELK implementation.
// Run: tools/vectors/nodespacing-site-vectors.sh <outDir>
//      (java -cp ... NodespacingSiteVectors.java <outDir> <tools/vectors dir>)
//
// Output <outDir>/nodespacing-sites.json (2-space top level, one compact JSON row per line, trailing newline):
//   { jdk, oracle, rowCounts: { labelLocation, applyStuff, fixedRatioMargins, sidelessPortMargins, insideLabels,
//     allConstraints, collapsedContainers, t4 }, rows: [row...] }
//   row = { id, site, input, steps, expected }; ids are unique and stable, "<group>/<name>".
//   input    = the prepared graph exported by ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false)
//              .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false) (the NS1 flags of
//              NodeMicroLayoutVectors) under system property org.eclipse.elk.graph.json.exportSeed=1, embedded as JSON;
//              null for rows without a graph. The graph is root -> one child node (the node under test); some rows add
//              further nodes, edges and labels. Spacings are set on the root (node adapters inherit them from the parent).
//   steps    = ordered in-memory mutations applied to the NodeContext after construction (and after the site's
//              construction sequence below), identical in the recorder's replay and in the TS replay. Vocabulary:
//                {"op":"setMinimumContentAreaSize","cell":C,"args":[w,h]}   AtomicCell.setMinimumContentAreaSize(
//                                                                            new KVector(w, h), false)
//                {"op":"setContributes","cell":C,"args":[width,height]}      setContributesToMinimumWidth/Height; each
//                                                                            arg true | false | null (null = leave)
//                {"op":"setCellRectangle","cell":C,"args":[x,y,w,h]}        cell.getCellRectangle().setRect(x, y, w, h)
//                {"op":"setPortMargin","side":S,"index":i,"args":[t,r,b,l]} (E2) portMargin of the i-th port context
//                                                                            of side S (portContexts.get(S) iteration
//                                                                            order) set to top/right/bottom/left
//                {"op":"setPortRatio","side":S,"index":i,"args":[ratio]}    (E3) PortPlacementCalculator.
//                                                                            PORT_RATIO_OR_POSITION set on the ElkPort
//                                                                            of the i-th port context of side S (same
//                                                                            addressing). Needed because that property
//                                                                            is not a registered layout option, so
//                                                                            the JSON input cannot carry it. Nothing
//                                                                            reads it up to the point where steps run
//                                                                            (only the three port placement calculators
//                                                                            do) and the adapter reads it live from
//                                                                            the ElkPort (ElkGraphAdapters.java:128-135)
//              C = cell address: "nodeContainer" | "nodeContainerMiddleRow" | "insideNodeLabelContainer" |
//              "insidePortLabelCells.<SIDE>" | "outsideNodeLabelContainers.<SIDE>" | "nodeLabelCells.<LOCATION>".
//              S = NORTH | EAST | SOUTH | WEST. Doubles in args are 16-hex raw bits. Setting a ratio step is only used in
//              the six rows that have FIXED_RATIO ports; in the recorder's hand-built scenario the ratio is set on the
//              ElkPort before adaptation (as the TS fixture does), in the replay by the step.
//   expected = site-specific (below). Every double is 16 lowercase hex digits, String.format("%016x",
//              Double.doubleToRawLongBits(d)) (JavaVectors.hex convention; -0.0 is kept as 8000000000000000); a NaN
//              fails the recording.
//
// Harness per site. "node" = root.getChildren().get(0), "graph" = ElkGraphAdapters.adapt(root), "nodeAdapter" = the first
//   adapter of graph.getNodes(). All ports exist before adaptation. "context" = new NodeContext(graph, nodeAdapter).
//   base       context; PortContextCreator.createPortContexts(context, false)
//   placement  base; then put a fresh AtomicCell per side NORTH, EAST, SOUTH, WEST into context.insidePortLabelCells
//              (test/helpers/port-placement-fixtures.ts placementContext)
//   cellSystem base; NodeLabelCellCreator.createNodeLabelCells(context, false, true);
//              InsidePortLabelCellCreator.createInsidePortLabelCells(context)
//              (test/helpers/cell-creator-fixtures.ts cellSystemContext)
//   Port contexts iterate NORTH, EAST, SOUTH, WEST; NORTH/EAST ports by creation order, SOUTH/WEST ports in reverse
//   creation order (NodeContext.comparePortContexts). "layOut" = CellSystemConfigurator.
//   configureCellSystemSizeContributions(context); NodeSizeCalculator.setNodeWidth(context);
//   NodeSizeCalculator.setNodeHeight(context).
//
// Sites, scenarios and expected shapes (a pair [a,b] is two hex strings):
//   labelLocation (input null, steps []): NodeLabelLocation.fromNodeLabelPlacement(set).
//       labelLocation/out-l-t-set   {OUTSIDE, V_TOP, H_LEFT, H_PRIORITY}   mirrors NodeLabelLocation.test.ts:53 table row
//       labelLocation/unmatched     {OUTSIDE, H_LEFT, H_CENTER}            mirrors NodeLabelLocation.test.ts:146-150
//       expected { location: "<enum name>" }
//   applyStuff: harness base; steps; then context.nodeSize = (70, 60) and the i-th of context.portContexts.values()
//       gets portPosition (10 + i, 20 + i); NodeLabelAndSizeUtilities.applyStuff(context)
//       (NodeLabelAndSizeUtilities.test.ts:306-325). Graph: ports NORTH (1,1) then WEST (2,2), 2x2.
//       expected { nodeSize: [w, h] of the ElkNode, ports: [{ id, x, y }] } of the ElkPorts in portContexts iteration
//       order (the ElkPort of a context is node.getPorts().get(port.getVolatileId())). id is the exported identifier.
//   fixedRatioMargins: harness placement; steps; HorizontalPortPlacementSizeCalculator.
//       calculateHorizontalPortPlacementSize(context) (HorizontalPortPlacementSizeCalculator.test.ts:159-181; FIXED_RATIO,
//       OUTSIDE labels of 10x6 on NORTH ports, PORT_LABELS size constraint, spacing 2). fixedRatioMargins/two-ports is
//       the restored 2-port original (ratios 0.25, 0.75), fixedRatioMargins/three-ports the 3-port case (0.25, 0.5, 0.75).
//       expected { margins: [[left, right]...] of the NORTH port contexts in iteration order, size: NORTH cell
//       minimumContentAreaSize.x }
//   sidelessPortMargins: new NodeMarginCalculator via NodeDimensionCalculation.getNodeMarginCalculator(graph).process()
//       (NodeMarginCalculator.test.ts:116-129). expected { margins: [t, r, b, l] } = node.getProperty(MARGINS)
//   insideLabels: harness cellSystem; steps; layOut; then the single port context's label cell gets
//       setHorizontalAlignment(RIGHT), setVerticalAlignment(BOTTOM) and getCellRectangle().setRect(100, 200, 50, 20);
//       LabelPlacer.placeLabels(context) (LabelPlacer.test.ts:40-115). Node labels by creation order in node.getLabels():
//       0 north, 1 south, 2 west, 3 east, 4 insideTopLeft, 5 insideBottomRight. expected { labels: { insideTopLeft:
//       [x, y], insideBottomRight: [x, y], west: [x, y], east: [x, y] }, containers: { WEST: [x, y, w, h],
//       EAST: [x, y, w, h] } } (container = context.outsideNodeLabelContainers.get(side).getCellRectangle())
//   allConstraints: harness cellSystem; steps; layOut (NodeSizeCalculator.test.ts:143-170, everything(FREE); the
//       portCells are the steps). expected { size: [w, h] of context.nodeSize, north: [y, height] of
//       insidePortLabelCells.NORTH, middle: [y, height, width] of nodeContainerMiddleRow, south: [y, height] of
//       insidePortLabelCells.SOUTH }
//   collapsedContainers: harness cellSystem; steps; layOut; context.nodeSize = (50, 30); LabelPlacer.placeLabels(context)
//       (LabelPlacer.test.ts:146-200, oversized(true, false)). Node labels: 0 north, 1 west. expected { containers:
//       { NORTH: [x, y, w, h], WEST: [x, y, w, h] }, labels: { north: [x, y], west: [x, y] } }
//   t4.horizontalSize / t4.verticalSize: harness placement; steps; calculateHorizontalPortPlacementSize (side NORTH) or
//       calculateVerticalPortPlacementSize (side EAST). expected { side, size: cell minimumContentAreaSize x (NORTH) | y
//       (EAST), padding: [left, right] (NORTH) | [top, bottom] (EAST) of that cell, margins: [[a, b]...] of the side's
//       port contexts: [left, right] (NORTH) | [top, bottom] (EAST) }
//   t4.horizontalPlacement: harness placement; steps; calculateHorizontalPortPlacementSize; PortPlacementCalculator.
//       placeHorizontalPorts. expected { xs: { NORTH: [...], EAST: [...], SOUTH: [...], WEST: [...] }, ys: {...} } of
//       portPosition per side in iteration order. The steps are applied before the size calculator, which the TS test
//       runs first; the calculator never reads or writes a cell rectangle and, for the free ports of these rows, leaves
//       both paddings at the surrounding margins (0), so setCellRectangle(cell, 0, 0, width, 0) equals
//       sizeHorizontalCell (HorizontalPortPlacementSizeCalculator.java:230-246 sets padding to surroundingPortMargins).
//   t4.minSize (input null, steps []): HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing (package
//       private, called by reflection). expected { cases: [{ spacing, first, second, result }...] }.
//   The t4 rows are exactly those of t4-unreached.md "Scenarios for T2" (E1), ids t4/<name> with the proposed names;
//   a row's site is the harness group above because the T4 scenarios use four different harnesses.
//
// NS1 round trip (D2): for each row with a graph, (1) the scenario is built by hand and exported to `input`, (2) it is
//   built again, its ratios set on the ElkPorts and run with the steps without ratio steps (hand-built result),
//   (3) `input` is re-imported with ElkGraphJson.forGraph(String).toElk() and run with the full steps (the replay result,
//   which is the recorded `expected`). The row fails if the two results differ (identifiers are left out of that
//   comparison because the hand-built graph is unnamed). Stability: every row is built twice from scratch and the two
//   serialisations must be byte-identical.
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.lang.reflect.Method;
import java.util.*;
import java.util.function.Consumer;
import org.eclipse.elk.alg.common.nodespacing.NodeDimensionCalculation;
import org.eclipse.elk.alg.common.nodespacing.cellsystem.AtomicCell;
import org.eclipse.elk.alg.common.nodespacing.cellsystem.Cell;
import org.eclipse.elk.alg.common.nodespacing.cellsystem.HorizontalLabelAlignment;
import org.eclipse.elk.alg.common.nodespacing.cellsystem.VerticalLabelAlignment;
import org.eclipse.elk.alg.common.nodespacing.internal.NodeContext;
import org.eclipse.elk.alg.common.nodespacing.internal.NodeLabelLocation;
import org.eclipse.elk.alg.common.nodespacing.internal.PortContext;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.CellSystemConfigurator;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.HorizontalPortPlacementSizeCalculator;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.InsidePortLabelCellCreator;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.LabelPlacer;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.NodeLabelAndSizeUtilities;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.NodeLabelCellCreator;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.NodeSizeCalculator;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.PortContextCreator;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.PortPlacementCalculator;
import org.eclipse.elk.alg.common.nodespacing.internal.algorithm.VerticalPortPlacementSizeCalculator;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkRectangle;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.EdgeLabelPlacement;
import org.eclipse.elk.core.options.NodeLabelPlacement;
import org.eclipse.elk.core.options.PortAlignment;
import org.eclipse.elk.core.options.PortConstraints;
import org.eclipse.elk.core.options.PortLabelPlacement;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.options.SizeConstraint;
import org.eclipse.elk.core.options.SizeOptions;
import org.eclipse.elk.core.util.adapters.ElkGraphAdapters;
import org.eclipse.elk.core.util.adapters.GraphAdapters.GraphAdapter;
import org.eclipse.elk.core.util.adapters.GraphAdapters.NodeAdapter;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.ElkPort;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.util.ElkGraphUtil;

public class NodespacingSiteVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "nodespacing-sites.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final double NODE_WIDTH = 40.0, NODE_HEIGHT = 30.0, PORT_SIZE = 2.0;
    static final double PORT_PORT_SPACING = 10.0, CELL = 100.0;
    static final PortSide[] SIDES = {PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST};
    static final String[] ROW_GROUPS = {"labelLocation", "applyStuff", "fixedRatioMargins", "sidelessPortMargins",
        "insideLabels", "allConstraints", "collapsedContainers", "t4"};

    public static void main(String[] args) throws Exception {
        LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        System.setProperty(SEED_PROPERTY, "1");
        List<Row> rows = new ArrayList<>();
        for (Scenario s : scenarios()) {
            rows.add(stableRow(s));
        }
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String group : ROW_GROUPS) {
            counts.put(group, 0);
        }
        Set<String> ids = new HashSet<>();
        for (Row r : rows) {
            if (!ids.add(r.id)) {
                throw new IllegalStateException("duplicate row id " + r.id);
            }
            counts.merge(r.id.substring(0, r.id.indexOf('/')), 1, Integer::sum);
        }
        StringBuilder out = new StringBuilder("{\n  \"jdk\": ");
        str(out, System.getProperty("java.version"));
        out.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"rowCounts\": {");
        int k = 0;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            out.append(k++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        out.append("},\n  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            out.append("    ").append(rows.get(i).json).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        out.append("  ]\n}\n");
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), out, StandardCharsets.UTF_8);
        System.err.println("rows " + rows.size() + " " + counts);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Scenario model

    record Row(String id, String json) { }

    /** A step of the D7/E2/E3 vocabulary. */
    record Step(String op, String cell, PortSide side, int index, Boolean[] flags, double[] nums) {
        static Step minContent(String cell, double w, double h) {
            return new Step("setMinimumContentAreaSize", cell, null, 0, null, new double[] {w, h});
        }

        static Step rect(String cell, double x, double y, double w, double h) {
            return new Step("setCellRectangle", cell, null, 0, null, new double[] {x, y, w, h});
        }

        static Step margin(PortSide side, int index, double t, double r, double b, double l) {
            return new Step("setPortMargin", null, side, index, null, new double[] {t, r, b, l});
        }

        static Step ratio(PortSide side, int index, double ratio) {
            return new Step("setPortRatio", null, side, index, null, new double[] {ratio});
        }

        String json() {
            StringBuilder sb = new StringBuilder("{\"op\": \"").append(op).append('"');
            if (cell != null) {
                sb.append(", \"cell\": \"").append(cell).append('"');
            }
            if (side != null) {
                sb.append(", \"side\": \"").append(side.name()).append("\", \"index\": ").append(index);
            }
            sb.append(", \"args\": ");
            if (flags != null) {
                StringBuilder f = new StringBuilder("[");
                for (int i = 0; i < flags.length; i++) {
                    f.append(i == 0 ? "" : ", ").append(flags[i]);
                }
                sb.append(f).append(']');
            } else {
                sb.append(hexes(nums));
            }
            return sb.append('}').toString();
        }
    }

    /** A graph under construction: the root, its node under test and the ports by side in creation order. */
    static final class Built {
        final ElkNode root = ElkGraphUtil.createGraph();
        final ElkNode node = ElkGraphUtil.createNode(root);
        final EnumMap<PortSide, List<ElkPort>> ports = new EnumMap<>(PortSide.class);

        Built() {
            node.setDimensions(NODE_WIDTH, NODE_HEIGHT);
        }

        ElkPort addPort(PortSide side, double x, double y) {
            ElkPort port = ElkGraphUtil.createPort(node);
            port.setProperty(CoreOptions.PORT_SIDE, side);
            port.setLocation(x, y);
            port.setDimensions(PORT_SIZE, PORT_SIZE);
            ports.computeIfAbsent(side, s -> new ArrayList<>()).add(port);
            return port;
        }
    }

    /** Ratio of the index-th port created on a NORTH or EAST side (creation order equals iteration order there). */
    record Ratio(PortSide side, int index, double value) { }

    interface Harness {
        /** Runs the site on a graph (root with a node under test) and returns the expected JSON. */
        String run(ElkNode root, List<Step> steps, boolean ids) throws Exception;
    }

    /** `build` is null for rows without a graph (then `direct` produces the expected value). */
    record Scenario(String id, String site, java.util.function.Supplier<Built> build, List<Ratio> ratios,
            List<Step> steps, Harness harness, java.util.function.Supplier<String> direct) { }

    static Scenario graphRow(String id, String site, java.util.function.Supplier<Built> build, List<Ratio> ratios,
            List<Step> steps, Harness harness) {
        return new Scenario(id, site, build, ratios, steps, harness, null);
    }

    static Scenario plainRow(String id, String site, java.util.function.Supplier<String> direct) {
        return new Scenario(id, site, null, List.of(), List.of(), null, direct);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Rows, round trip, stability

    static Row stableRow(Scenario s) throws Exception {
        Row first = buildRow(s);
        Row second = buildRow(s);
        if (!first.json.equals(second.json)) {
            throw new IllegalStateException("row " + s.id + " is not stable across two recordings");
        }
        return first;
    }

    static Row buildRow(Scenario s) throws Exception {
        StringBuilder sb = new StringBuilder("{\"id\": ");
        str(sb, s.id);
        sb.append(", \"site\": ");
        str(sb, s.site);
        if (s.build == null) {
            sb.append(", \"input\": null, \"steps\": [], \"expected\": ").append(s.direct.get()).append('}');
            return new Row(s.id, sb.toString());
        }
        List<Step> replaySteps = new ArrayList<>();
        for (Ratio r : s.ratios) {
            replaySteps.add(Step.ratio(r.side, r.index, r.value));
        }
        replaySteps.addAll(s.steps);

        String input = export(s.build.get().root);
        String replay = s.harness.run(ElkGraphJson.forGraph(input).toElk(), replaySteps, true);
        Built hand = s.build.get();
        for (Ratio r : s.ratios) {
            if (r.side != PortSide.NORTH && r.side != PortSide.EAST) {
                throw new IllegalStateException("ratio index is creation order only on NORTH and EAST");
            }
            hand.ports.get(r.side).get(r.index).setProperty(PortPlacementCalculator.PORT_RATIO_OR_POSITION, r.value);
        }
        String original = s.harness.run(hand.root, s.steps, false);
        String replayNoIds = s.harness.run(ElkGraphJson.forGraph(input).toElk(), replaySteps, false);
        if (!original.equals(replayNoIds)) {
            throw new IllegalStateException("row " + s.id + ": result on the re-imported input plus steps differs from "
                    + "the hand-built scenario (round-trip self-check)\n re-imported: " + replayNoIds
                    + "\n hand-built:  " + original);
        }
        sb.append(", \"input\": ").append(input).append(", \"steps\": [");
        for (int i = 0; i < replaySteps.size(); i++) {
            sb.append(i == 0 ? "" : ", ").append(replaySteps.get(i).json());
        }
        sb.append("], \"expected\": ").append(replay).append('}');
        return new Row(s.id, sb.toString());
    }

    static String export(ElkNode root) {
        return ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                .omitUnknownLayoutOptions(true).prettyPrint(false).toJson();
    }

    // ------------------------------------------------------------------------------------------------------------
    // Contexts and steps

    static NodeContext baseContext(ElkNode root) {
        GraphAdapter<?> graph = ElkGraphAdapters.adapt(root);
        NodeAdapter<?> node = graph.getNodes().iterator().next();
        NodeContext context = new NodeContext(graph, node);
        PortContextCreator.createPortContexts(context, false);
        return context;
    }

    static NodeContext placementContext(ElkNode root) {
        NodeContext context = baseContext(root);
        for (PortSide side : SIDES) {
            context.insidePortLabelCells.put(side, new AtomicCell());
        }
        return context;
    }

    static NodeContext cellSystemContext(ElkNode root) {
        NodeContext context = baseContext(root);
        NodeLabelCellCreator.createNodeLabelCells(context, false, true);
        InsidePortLabelCellCreator.createInsidePortLabelCells(context);
        return context;
    }

    static void layOut(NodeContext context) {
        CellSystemConfigurator.configureCellSystemSizeContributions(context);
        NodeSizeCalculator.setNodeWidth(context);
        NodeSizeCalculator.setNodeHeight(context);
    }

    static Cell cell(NodeContext c, String address) {
        Cell found = switch (address) {
            case "nodeContainer" -> c.nodeContainer;
            case "nodeContainerMiddleRow" -> c.nodeContainerMiddleRow;
            case "insideNodeLabelContainer" -> c.insideNodeLabelContainer;
            default -> {
                int dot = address.indexOf('.');
                String key = address.substring(dot + 1);
                yield switch (address.substring(0, dot)) {
                    case "insidePortLabelCells" -> c.insidePortLabelCells.get(PortSide.valueOf(key));
                    case "outsideNodeLabelContainers" -> c.outsideNodeLabelContainers.get(PortSide.valueOf(key));
                    case "nodeLabelCells" -> c.nodeLabelCells.get(NodeLabelLocation.valueOf(key));
                    default -> null;
                };
            }
        };
        if (found == null) {
            throw new IllegalStateException("no cell " + address);
        }
        return found;
    }

    static PortContext portContext(NodeContext c, PortSide side, int index) {
        return new ArrayList<>(c.portContexts.get(side)).get(index);
    }

    static void applySteps(NodeContext c, ElkNode root, List<Step> steps) {
        for (Step s : steps) {
            switch (s.op) {
                case "setMinimumContentAreaSize" -> ((AtomicCell) cell(c, s.cell)).setMinimumContentAreaSize(
                        new KVector(s.nums[0], s.nums[1]), false);
                case "setContributes" -> {
                    if (s.flags[0] != null) {
                        cell(c, s.cell).setContributesToMinimumWidth(s.flags[0]);
                    }
                    if (s.flags[1] != null) {
                        cell(c, s.cell).setContributesToMinimumHeight(s.flags[1]);
                    }
                }
                case "setCellRectangle" -> cell(c, s.cell).getCellRectangle().setRect(s.nums[0], s.nums[1], s.nums[2],
                        s.nums[3]);
                case "setPortMargin" -> {
                    ElkMargin m = portContext(c, s.side, s.index).portMargin;
                    m.top = s.nums[0];
                    m.right = s.nums[1];
                    m.bottom = s.nums[2];
                    m.left = s.nums[3];
                }
                case "setPortRatio" -> root.getChildren().get(0).getPorts()
                        .get(portContext(c, s.side, s.index).port.getVolatileId())
                        .setProperty(PortPlacementCalculator.PORT_RATIO_OR_POSITION, s.nums[0]);
                default -> throw new IllegalStateException("unknown step " + s.op);
            }
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Fixtures (mirrors of the TS test helpers)

    /** One port of a placement fixture (test/helpers/port-placement-fixtures.ts PortSpec). */
    static final class PortSpec {
        final PortSide side;
        Double ratio, borderOffset;
        Consumer<ElkPort> configure = p -> { };

        PortSpec(PortSide side) {
            this.side = side;
        }

        PortSpec ratio(double r) {
            ratio = r;
            return this;
        }

        PortSpec offset(double o) {
            borderOffset = o;
            return this;
        }

        PortSpec with(Consumer<ElkPort> c) {
            configure = c;
            return this;
        }
    }

    static PortSpec port(PortSide side) {
        return new PortSpec(side);
    }

    static ElkLabel label(Object parent, double w, double h, double x, double y) {
        ElkLabel l = parent instanceof ElkNode n ? ElkGraphUtil.createLabel(n) : ElkGraphUtil.createLabel((ElkPort) parent);
        l.setDimensions(w, h);
        l.setLocation(x, y);
        return l;
    }

    /** HorizontalPortPlacementSizeCalculator.test.ts labelled(side, x): one 10x6 label at (x, 0). */
    static PortSpec labelledH(PortSide side, double x) {
        return port(side).with(p -> label(p, 10, 6, x, 0));
    }

    /** VerticalPortPlacementSizeCalculator.test.ts labelled(side, y, ...heights): 6xh labels at (0, y). */
    static PortSpec labelledV(PortSide side, double y, double... heights) {
        double[] hs = heights.length > 0 ? heights : new double[] {10};
        return port(side).with(p -> {
            for (double h : hs) {
                label(p, 6, h, 0, y);
            }
        });
    }

    static PortSpec sized(PortSide side, double w, double h) {
        return port(side).with(p -> label(p, w, h, 0, 0));
    }

    record Placement(PortConstraints constraints, PortAlignment alignment, ElkMargin surrounding,
            Consumer<Built> configure) { }

    static Placement placement(PortConstraints constraints, PortAlignment alignment, ElkMargin surrounding,
            Consumer<Built> configure) {
        return new Placement(constraints, alignment, surrounding, configure);
    }

    /** test/helpers/port-placement-fixtures.ts placementContext, as a graph; ratios are returned, not set. */
    static Built placementGraph(Placement p, List<PortSpec> specs) {
        Built b = new Built();
        b.root.setProperty(CoreOptions.SPACING_PORT_PORT, PORT_PORT_SPACING);
        b.root.setProperty(CoreOptions.SPACING_PORTS_SURROUNDING, p.surrounding == null ? new ElkMargin(0) : p.surrounding);
        if (p.constraints != null) {
            b.node.setProperty(CoreOptions.PORT_CONSTRAINTS, p.constraints);
        }
        b.node.setProperty(CoreOptions.PORT_ALIGNMENT_DEFAULT, p.alignment == null ? PortAlignment.DISTRIBUTED : p.alignment);
        for (PortSpec spec : specs) {
            ElkPort port = b.addPort(spec.side, 0, 0);
            if (spec.borderOffset != null) {
                port.setProperty(CoreOptions.PORT_BORDER_OFFSET, spec.borderOffset);
            }
            spec.configure.accept(port);
        }
        if (p.configure != null) {
            p.configure.accept(b);
        }
        return b;
    }

    static List<Ratio> ratiosOf(List<PortSpec> specs) {
        List<Ratio> ratios = new ArrayList<>();
        Map<PortSide, Integer> seen = new EnumMap<>(PortSide.class);
        for (PortSpec spec : specs) {
            int index = seen.merge(spec.side, 1, Integer::sum) - 1;
            if (spec.ratio != null) {
                ratios.add(new Ratio(spec.side, index, spec.ratio));
            }
        }
        return ratios;
    }

    /** labelSettings of the H test: spacing 2 on the root, PORT_LABELS, the placement, DEFAULT_MINIMUM_SIZE + options. */
    static Consumer<Built> labelSettingsH(EnumSet<PortLabelPlacement> placement, SizeOptions... options) {
        return b -> {
            b.root.setProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL, 2.0);
            b.node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORT_LABELS));
            b.node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, placement);
            b.node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, sizeOptions(options));
        };
    }

    /** labelSettings of the V test. */
    static Consumer<Built> labelSettingsV(EnumSet<PortLabelPlacement> placement, boolean treatAsGroup,
            SizeOptions... options) {
        return b -> {
            b.root.setProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL, 3.0);
            b.root.setProperty(CoreOptions.SPACING_LABEL_LABEL, 2.0);
            b.node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORT_LABELS));
            b.node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, placement);
            b.node.setProperty(CoreOptions.PORT_LABELS_TREAT_AS_GROUP, treatAsGroup);
            b.node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, sizeOptions(options));
        };
    }

    static EnumSet<SizeOptions> sizeOptions(SizeOptions... options) {
        EnumSet<SizeOptions> set = EnumSet.of(SizeOptions.DEFAULT_MINIMUM_SIZE);
        set.addAll(Arrays.asList(options));
        return set;
    }

    static EnumSet<PortLabelPlacement> plp(PortLabelPlacement... values) {
        EnumSet<PortLabelPlacement> set = EnumSet.noneOf(PortLabelPlacement.class);
        set.addAll(Arrays.asList(values));
        return set;
    }

    static EnumSet<NodeLabelPlacement> nlp(NodeLabelPlacement... values) {
        EnumSet<NodeLabelPlacement> set = EnumSet.noneOf(NodeLabelPlacement.class);
        set.addAll(Arrays.asList(values));
        return set;
    }

    /** test/helpers/cell-creator-fixtures.ts addLabel. */
    static ElkLabel addLabel(Object parent, double w, double h, EnumSet<NodeLabelPlacement> placement) {
        ElkLabel l = label(parent, w, h, 0, 0);
        if (placement != null) {
            l.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, placement);
        }
        return l;
    }

    static void constrain(ElkNode node, SizeConstraint... constraints) {
        EnumSet<SizeConstraint> set = EnumSet.noneOf(SizeConstraint.class);
        set.addAll(Arrays.asList(constraints));
        node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, set);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Scenarios

    static final NodeLabelPlacement INSIDE = NodeLabelPlacement.INSIDE, OUTSIDE = NodeLabelPlacement.OUTSIDE;
    static final PortSide NORTH = PortSide.NORTH, EAST = PortSide.EAST, SOUTH = PortSide.SOUTH, WEST = PortSide.WEST;
    static final PortAlignment BEGIN = PortAlignment.BEGIN;

    static List<Scenario> scenarios() {
        List<Scenario> all = new ArrayList<>();
        labelLocationRows(all);
        applyStuffRow(all);
        fixedRatioMarginRows(all);
        sidelessRow(all);
        insideLabelsRow(all);
        allConstraintsRow(all);
        collapsedRow(all);
        t4HorizontalSize(all);
        t4VerticalSize(all);
        t4Placement(all);
        t4MinSize(all);
        return all;
    }

    static void labelLocationRows(List<Scenario> all) {
        all.add(plainRow("labelLocation/out-l-t-set", "labelLocation", () -> location(nlp(OUTSIDE, NodeLabelPlacement.V_TOP,
                NodeLabelPlacement.H_LEFT, NodeLabelPlacement.H_PRIORITY))));
        all.add(plainRow("labelLocation/unmatched", "labelLocation", () -> location(nlp(OUTSIDE, NodeLabelPlacement.H_LEFT,
                NodeLabelPlacement.H_CENTER))));
    }

    static String location(EnumSet<NodeLabelPlacement> placement) {
        return "{\"location\": \"" + NodeLabelLocation.fromNodeLabelPlacement(placement).name() + "\"}";
    }

    static void applyStuffRow(List<Scenario> all) {
        all.add(graphRow("applyStuff/north-west", "applyStuff", () -> {
            Built b = new Built();
            b.addPort(NORTH, 1, 1);
            b.addPort(WEST, 2, 2);
            return b;
        }, List.of(), List.of(), (root, steps, ids) -> {
            NodeContext c = baseContext(root);
            applySteps(c, root, steps);
            c.nodeSize.x = 70;
            c.nodeSize.y = 60;
            int i = 0;
            for (PortContext pc : c.portContexts.values()) {
                pc.portPosition.set(10 + i, 20 + i);
                i++;
            }
            NodeLabelAndSizeUtilities.applyStuff(c);
            ElkNode node = root.getChildren().get(0);
            StringBuilder sb = new StringBuilder("{\"nodeSize\": ").append(hexes(node.getWidth(), node.getHeight()))
                    .append(", \"ports\": [");
            i = 0;
            for (PortContext pc : c.portContexts.values()) {
                ElkPort p = node.getPorts().get(pc.port.getVolatileId());
                sb.append(i++ == 0 ? "" : ", ").append('{');
                if (ids) {
                    sb.append("\"id\": ");
                    str(sb, p.getIdentifier());
                    sb.append(", ");
                }
                sb.append("\"x\": ").append(hex(p.getX())).append(", \"y\": ").append(hex(p.getY())).append('}');
            }
            return sb.append("]}").toString();
        }));
    }

    static void fixedRatioMarginRows(List<Scenario> all) {
        Placement p = placement(PortConstraints.FIXED_RATIO, null, null, labelSettingsH(plp(PortLabelPlacement.OUTSIDE)));
        List<PortSpec> two = List.of(labelledH(NORTH, 0).ratio(0.25), labelledH(NORTH, 0).ratio(0.75));
        List<PortSpec> three = List.of(labelledH(NORTH, 0).ratio(0.25), labelledH(NORTH, 0).ratio(0.5),
                labelledH(NORTH, 0).ratio(0.75));
        Harness h = (root, steps, ids) -> {
            NodeContext c = placementContext(root);
            applySteps(c, root, steps);
            HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(c);
            return "{\"margins\": " + marginsH(c) + ", \"size\": "
                    + hex(c.insidePortLabelCells.get(NORTH).getMinimumContentAreaSize().x) + "}";
        };
        all.add(graphRow("fixedRatioMargins/two-ports", "fixedRatioMargins", () -> placementGraph(p, two), ratiosOf(two),
                List.of(), h));
        all.add(graphRow("fixedRatioMargins/three-ports", "fixedRatioMargins", () -> placementGraph(p, three),
                ratiosOf(three), List.of(), h));
    }

    static String marginsH(NodeContext c) {
        StringBuilder sb = new StringBuilder("[");
        int i = 0;
        for (PortContext pc : c.portContexts.get(NORTH)) {
            sb.append(i++ == 0 ? "" : ", ").append(hexes(pc.portMargin.left, pc.portMargin.right));
        }
        return sb.append(']').toString();
    }

    static String marginsV(NodeContext c) {
        StringBuilder sb = new StringBuilder("[");
        int i = 0;
        for (PortContext pc : c.portContexts.get(EAST)) {
            sb.append(i++ == 0 ? "" : ", ").append(hexes(pc.portMargin.top, pc.portMargin.bottom));
        }
        return sb.append(']').toString();
    }

    static void sidelessRow(List<Scenario> all) {
        all.add(graphRow("sidelessPortMargins/undefined-side", "sidelessPortMargins", () -> {
            Built b = new Built();
            b.node.setLocation(0, 0);
            ElkPort port = b.addPort(PortSide.UNDEFINED, 10, 10);
            ElkNode other = ElkGraphUtil.createNode(b.root);
            ElkLabel l = ElkGraphUtil.createLabel(ElkGraphUtil.createSimpleEdge(port, other));
            l.setDimensions(100, 2);
            l.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.TAIL);
            b.root.setProperty(CoreOptions.SPACING_LABEL_NODE, 4.0);
            return b;
        }, List.of(), List.of(), (root, steps, ids) -> {
            GraphAdapter<?> graph = ElkGraphAdapters.adapt(root);
            NodeDimensionCalculation.getNodeMarginCalculator(graph).process();
            ElkMargin m = root.getChildren().get(0).getProperty(CoreOptions.MARGINS);
            return "{\"margins\": " + hexes(m.top, m.right, m.bottom, m.left) + "}";
        }));
    }

    static void insideLabelsRow(List<Scenario> all) {
        all.add(graphRow("insideLabels/fixed-size-node", "insideLabels", () -> {
            Built b = new Built();
            constrain(b.node);
            b.node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.ASYMMETRICAL));
            addLabel(b.node, 20, 12, nlp(OUTSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_CENTER));
            addLabel(b.node, 16, 8, nlp(OUTSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_LEFT));
            addLabel(b.node, 9, 14, nlp(OUTSIDE, NodeLabelPlacement.H_LEFT, NodeLabelPlacement.V_CENTER));
            addLabel(b.node, 6, 10, nlp(OUTSIDE, NodeLabelPlacement.H_RIGHT, NodeLabelPlacement.V_BOTTOM,
                    NodeLabelPlacement.H_PRIORITY));
            addLabel(b.node, 10, 5, nlp(INSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_LEFT));
            addLabel(b.node, 8, 6, nlp(INSIDE, NodeLabelPlacement.V_BOTTOM, NodeLabelPlacement.H_RIGHT));
            addLabel(b.addPort(NORTH, 0, 0), 5, 5, null);
            return b;
        }, List.of(), List.of(), (root, steps, ids) -> {
            NodeContext c = cellSystemContext(root);
            applySteps(c, root, steps);
            layOut(c);
            var portLabelCell = c.portContexts.values().iterator().next().portLabelCell;
            portLabelCell.setHorizontalAlignment(HorizontalLabelAlignment.RIGHT);
            portLabelCell.setVerticalAlignment(VerticalLabelAlignment.BOTTOM);
            portLabelCell.getCellRectangle().setRect(100, 200, 50, 20);
            LabelPlacer.placeLabels(c);
            List<ElkLabel> labels = root.getChildren().get(0).getLabels();
            return "{\"labels\": {\"insideTopLeft\": " + at(labels.get(4)) + ", \"insideBottomRight\": " + at(labels.get(5))
                    + ", \"west\": " + at(labels.get(2)) + ", \"east\": " + at(labels.get(3)) + "}, \"containers\": "
                    + containers(c, WEST, EAST) + "}";
        }));
    }

    static void allConstraintsRow(List<Scenario> all) {
        all.add(graphRow("allConstraints/free", "allConstraints", () -> {
            Built b = new Built();
            constrain(b.node, SizeConstraint.PORTS, SizeConstraint.PORT_LABELS, SizeConstraint.NODE_LABELS,
                    SizeConstraint.MINIMUM_SIZE);
            b.node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
            b.node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.ASYMMETRICAL));
            b.node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(100, 10));
            addLabel(b.node, 30, 10, nlp(INSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_LEFT));
            addLabel(b.node, 80, 12, nlp(OUTSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_CENTER));
            addLabel(b.node, 7, 50, nlp(OUTSIDE, NodeLabelPlacement.H_RIGHT, NodeLabelPlacement.V_CENTER));
            return b;
        }, List.of(), List.of(Step.minContent("insidePortLabelCells.NORTH", 60, 8),
                Step.minContent("insidePortLabelCells.EAST", 14, 70), Step.minContent("insidePortLabelCells.WEST", 6, 18)),
                (root, steps, ids) -> {
                    NodeContext c = cellSystemContext(root);
                    applySteps(c, root, steps);
                    layOut(c);
                    ElkRectangle north = c.insidePortLabelCells.get(NORTH).getCellRectangle();
                    ElkRectangle middle = c.nodeContainerMiddleRow.getCellRectangle();
                    ElkRectangle south = c.insidePortLabelCells.get(SOUTH).getCellRectangle();
                    return "{\"size\": " + hexes(c.nodeSize.x, c.nodeSize.y) + ", \"north\": " + hexes(north.y, north.height)
                            + ", \"middle\": " + hexes(middle.y, middle.height, middle.width) + ", \"south\": "
                            + hexes(south.y, south.height) + "}";
                }));
    }

    static void collapsedRow(List<Scenario> all) {
        all.add(graphRow("collapsedContainers/overhang-no-contribution", "collapsedContainers", () -> {
            Built b = new Built();
            constrain(b.node, SizeConstraint.NODE_LABELS);
            b.node.setProperty(CoreOptions.NODE_SIZE_OPTIONS,
                    EnumSet.of(SizeOptions.ASYMMETRICAL, SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG));
            addLabel(b.node, 80, 12, nlp(OUTSIDE, NodeLabelPlacement.V_TOP, NodeLabelPlacement.H_CENTER));
            addLabel(b.node, 9, 70, nlp(OUTSIDE, NodeLabelPlacement.H_LEFT, NodeLabelPlacement.V_CENTER));
            return b;
        }, List.of(), List.of(), (root, steps, ids) -> {
            NodeContext c = cellSystemContext(root);
            applySteps(c, root, steps);
            layOut(c);
            c.nodeSize.set(50, 30);
            LabelPlacer.placeLabels(c);
            List<ElkLabel> labels = root.getChildren().get(0).getLabels();
            return "{\"containers\": " + containers(c, NORTH, WEST) + ", \"labels\": {\"north\": " + at(labels.get(0))
                    + ", \"west\": " + at(labels.get(1)) + "}}";
        }));
    }

    static String at(ElkLabel l) {
        return hexes(l.getX(), l.getY());
    }

    static String containers(NodeContext c, PortSide... sides) {
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < sides.length; i++) {
            ElkRectangle r = c.outsideNodeLabelContainers.get(sides[i]).getCellRectangle();
            sb.append(i == 0 ? "" : ", ").append('"').append(sides[i].name()).append("\": ")
                    .append(hexes(r.x, r.y, r.width, r.height));
        }
        return sb.append('}').toString();
    }

    // --- T4 rows

    static final Harness H_SIZE = (root, steps, ids) -> {
        NodeContext c = placementContext(root);
        applySteps(c, root, steps);
        HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(c);
        AtomicCell cell = c.insidePortLabelCells.get(NORTH);
        return "{\"side\": \"NORTH\", \"size\": " + hex(cell.getMinimumContentAreaSize().x) + ", \"padding\": "
                + hexes(cell.getPadding().left, cell.getPadding().right) + ", \"margins\": " + marginsH(c) + "}";
    };

    static final Harness V_SIZE = (root, steps, ids) -> {
        NodeContext c = placementContext(root);
        applySteps(c, root, steps);
        VerticalPortPlacementSizeCalculator.calculateVerticalPortPlacementSize(c);
        AtomicCell cell = c.insidePortLabelCells.get(EAST);
        return "{\"side\": \"EAST\", \"size\": " + hex(cell.getMinimumContentAreaSize().y) + ", \"padding\": "
                + hexes(cell.getPadding().top, cell.getPadding().bottom) + ", \"margins\": " + marginsV(c) + "}";
    };

    static final Harness H_PLACE = (root, steps, ids) -> {
        NodeContext c = placementContext(root);
        applySteps(c, root, steps);
        HorizontalPortPlacementSizeCalculator.calculateHorizontalPortPlacementSize(c);
        PortPlacementCalculator.placeHorizontalPorts(c);
        StringBuilder xs = new StringBuilder("{"), ys = new StringBuilder("{");
        for (int i = 0; i < SIDES.length; i++) {
            StringBuilder x = new StringBuilder("["), y = new StringBuilder("[");
            int k = 0;
            for (PortContext pc : c.portContexts.get(SIDES[i])) {
                x.append(k == 0 ? "" : ", ").append(hex(pc.portPosition.x));
                y.append(k++ == 0 ? "" : ", ").append(hex(pc.portPosition.y));
            }
            xs.append(i == 0 ? "" : ", ").append('"').append(SIDES[i]).append("\": ").append(x).append(']');
            ys.append(i == 0 ? "" : ", ").append('"').append(SIDES[i]).append("\": ").append(y).append(']');
        }
        return "{\"xs\": " + xs + "}, \"ys\": " + ys + "}}";
    };

    static List<PortSpec> specs(PortSpec... specs) {
        return List.of(specs);
    }

    static Scenario t4(String name, String site, Placement p, List<PortSpec> specs, List<Step> steps, Harness h) {
        return graphRow("t4/" + name, site, () -> placementGraph(p, specs), ratiosOf(specs), steps, h);
    }

    static Consumer<Built> placementOf(PortLabelPlacement value) {
        return b -> b.node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, plp(value));
    }

    static void t4HorizontalSize(List<Scenario> all) {
        ElkMargin surrounding = new ElkMargin(0, 4, 0, 3);
        List<PortSpec> ratios = specs(port(NORTH).ratio(0.25), port(NORTH).ratio(0.75));
        all.add(t4("h-fixed-ratio-surrounding", "t4.horizontalSize",
                placement(PortConstraints.FIXED_RATIO, null, surrounding, null), ratios, List.of(), H_SIZE));
        all.add(t4("h-fixed-ratio-inside-end-margin", "t4.horizontalSize",
                placement(PortConstraints.FIXED_RATIO, null, surrounding, placementOf(PortLabelPlacement.INSIDE)), ratios,
                List.of(Step.margin(NORTH, 0, 0, 5, 0, 1), Step.margin(NORTH, 1, 0, 5, 0, 1)), H_SIZE));
        Placement uniform = placement(null, BEGIN, null, labelSettingsH(plp(PortLabelPlacement.OUTSIDE),
                SizeOptions.UNIFORM_PORT_SPACING));
        all.add(t4("h-uniform-unlabelled", "t4.horizontalSize", uniform,
                specs(port(NORTH), labelledH(NORTH, 0), port(NORTH)), List.of(), H_SIZE));
        Placement inside = placement(null, BEGIN, null, labelSettingsH(plp(PortLabelPlacement.INSIDE)));
        all.add(t4("h-narrow-next-to-port", "t4.horizontalSize", inside, specs(sized(NORTH, 1, 6)), List.of(), H_SIZE));
        Placement fixed = placement(null, BEGIN, null, labelSettingsH(plp()));
        all.add(t4("h-fixed-labels", "t4.horizontalSize", fixed, specs(labelledH(NORTH, -3), port(NORTH)), List.of(),
                H_SIZE));
    }

    static void t4VerticalSize(List<Scenario> all) {
        ElkMargin surrounding = new ElkMargin(3, 0, 4, 0);
        List<PortSpec> ratios = specs(port(EAST).ratio(0.25), port(EAST).ratio(0.75));
        all.add(t4("v-fixed-ratio-surrounding", "t4.verticalSize",
                placement(PortConstraints.FIXED_RATIO, null, surrounding, null), ratios, List.of(), V_SIZE));
        all.add(t4("v-fixed-ratio-inside-end-margin", "t4.verticalSize",
                placement(PortConstraints.FIXED_RATIO, null, surrounding, placementOf(PortLabelPlacement.INSIDE)), ratios,
                List.of(Step.margin(EAST, 0, 1, 0, 5, 0), Step.margin(EAST, 1, 1, 0, 5, 0)), V_SIZE));
        Placement inside = placement(null, BEGIN, null, labelSettingsV(plp(PortLabelPlacement.INSIDE), false));
        all.add(t4("v-short-next-to-port", "t4.verticalSize", inside, specs(sized(EAST, 6, 1)), List.of(), V_SIZE));
        Placement fixed = placement(null, BEGIN, null, labelSettingsV(plp(), false));
        all.add(t4("v-fixed-labels", "t4.verticalSize", fixed, specs(labelledV(EAST, -3), port(EAST)), List.of(), V_SIZE));
    }

    static List<Step> northRect() {
        return List.of(Step.rect("insidePortLabelCells.NORTH", 0, 0, CELL, 0));
    }

    static void t4Placement(List<Scenario> all) {
        Placement begin = placement(null, BEGIN, null, null);
        all.add(t4("p-border-offset", "t4.horizontalPlacement", begin,
                specs(port(NORTH).offset(3), port(SOUTH).offset(3)),
                List.of(Step.rect("insidePortLabelCells.NORTH", 0, 0, CELL, 0),
                        Step.rect("insidePortLabelCells.SOUTH", 0, 0, CELL, 0)), H_PLACE));
        Placement southEnd = placement(null, BEGIN, null, b -> b.node.setProperty(CoreOptions.PORT_ALIGNMENT_SOUTH,
                PortAlignment.END));
        all.add(t4("p-begin-end", "t4.horizontalPlacement", southEnd,
                specs(port(NORTH), port(NORTH), port(SOUTH), port(SOUTH)),
                List.of(Step.rect("insidePortLabelCells.NORTH", 0, 0, CELL, 0),
                        Step.rect("insidePortLabelCells.SOUTH", 0, 0, CELL, 0)), H_PLACE));
        Placement justified = placement(null, PortAlignment.JUSTIFIED, null, null);
        all.add(t4("p-justified-wide", "t4.horizontalPlacement", justified, specs(port(NORTH), port(NORTH), port(NORTH)),
                northRect(), H_PLACE));
        all.add(t4("p-justified-single", "t4.horizontalPlacement", justified, specs(port(NORTH)), northRect(), H_PLACE));
    }

    static void t4MinSize(List<Scenario> all) {
        all.add(plainRow("t4/min-size-tolerance", "t4.minSize", () -> {
            double[][] triples = {{12, 0.25, 0.75}, {6, 0, 1}, {12, 0.5, 0.5}, {12, 0.5, 0.505}, {5, 0, 0.01},
                {5, 0, 0.02}, {12, 0.5, 0.52}};
            try {
                Method m = HorizontalPortPlacementSizeCalculator.class.getDeclaredMethod(
                        "minSizeRequiredToRespectSpacing", double.class, double.class, double.class);
                m.setAccessible(true);
                StringBuilder sb = new StringBuilder("{\"cases\": [");
                for (int i = 0; i < triples.length; i++) {
                    double[] t = triples[i];
                    double result = (Double) m.invoke(null, t[0], t[1], t[2]);
                    sb.append(i == 0 ? "" : ", ").append("{\"spacing\": ").append(hex(t[0])).append(", \"first\": ")
                            .append(hex(t[1])).append(", \"second\": ").append(hex(t[2])).append(", \"result\": ")
                            .append(hex(result)).append('}');
                }
                return sb.append("]}").toString();
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException(e);
            }
        }));
    }

    // ------------------------------------------------------------------------------------------------------------
    // JSON helpers

    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new IllegalStateException("NaN in a recorded value");
        }
        return "\"" + String.format("%016x", Double.doubleToRawLongBits(d)) + "\"";
    }

    static String hexes(double... ds) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < ds.length; i++) {
            sb.append(i == 0 ? "" : ", ").append(hex(ds[i]));
        }
        return sb.append(']').toString();
    }

    static void str(StringBuilder sb, String s) {
        if (s == null) {
            sb.append("null");
            return;
        }
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char ch = s.charAt(i);
            switch (ch) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (ch < 0x20) {
                        sb.append(String.format("\\u%04x", (int) ch));
                    } else {
                        sb.append(ch);
                    }
                }
            }
        }
        sb.append('"');
    }
}
