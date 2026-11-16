// SPDX-License-Identifier: EPL-2.0
// ORIGIN: tools/vectors/NodeMicroLayoutVectors.java (ELK JSON input rows, round-trip self-check, hex doubles, throws rows) and
//         tools/vectors/LayeredCompoundVectors.java (step stops, first-ELK-frame throws shape, strict-JSON sanitiser, 16 MiB guard).
// Generates frozen JVM reference vectors (AD-13, TR1-TR3, mission 8a T1) for org.eclipse.elk.alg.mrtree at the pinned ELK commit.
// This program only CALLS ELK APIs and records results; it embeds no ELK implementation. It is the ONLY source of expectations for
// the TypeScript port of alg.mrtree. Run: tools/vectors/mrtree-vectors.sh <outDir>  (writes <outDir>/mrtree.json and <outDir>/mrtree-extra.json;
// the landed copies are test/golden/refs/java/mrtree.json and mrtree-extra.json). The program itself is run as `java -cp <oracle jars + third party> MrTreeVectors.java <outDir>
// <tools/vectors dir>` under -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 (it refuses to run without the pin unless
// MRTREE_UNPINNED=1, a diagnosis aid used for the TR3 evidence run; never for the ref).
//
// ======================================================= OUTPUT CONTRACT =======================================================
// File: 2-space top level, one compact JSON row per line, trailing newline, strict JSON (parsed back with Gson's non-lenient reader):
//   { jdk, oracle, seeds: {shapes, random}, rowCounts: { full, stops, throws }, rows: [row...] }
// row = { id, group: "full"|"stops"|"throws", input, expected }; ids are unique, stable, "<group>/<family>/<name>".
//   input = the scenario graph exported by ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false)
//           .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false) under system property
//           org.eclipse.elk.graph.json.exportSeed=1 (and org.eclipse.elk.graph.util.identifierSeed=1), embedded as a JSON object. It
//           carries "org.eclipse.elk.algorithm": "org.eclipse.elk.mrtree" and every option the scenario sets (root options and per-node
//           org.eclipse.elk.mrtree.positionConstraint / org.eclipse.elk.priority). A bare Infinity/NaN token of the exporter would be
//           mapped to the strings "Infinity"/"-Infinity"/"NaN" (none occurs in this file; the recorder fails if the mapping changes
//           the text). Every element has an identifier ("root", "n<i>", "e<i>", labels "l<i>").
//   Round trip (every row): the recorder builds the graph, exports it to `input`, re-imports `input` with
//   ElkGraphJson.forGraph(String).toElk() and runs the row on the re-imported graph (the recorded `expected`); it also runs a freshly
//   built original graph and a second re-import and FAILS the recording unless all three serialised results are byte-identical
//   (a throws row: same class, message and frame). A TS replay re-imports `input` with the ported importer.
// Doubles are 16 lowercase hex digits, Long.toHexString(Double.doubleToRawLongBits(d)) zero-padded (a NaN fails the recording);
//   written below as H. Ints are JSON numbers, booleans JSON booleans.
//
// ---- group full ----------------------------------------------------------------------------------------------------------
//   Run: RecursiveGraphLayoutEngine.layout(root, BasicProgressMonitor) on the re-imported root, mrtree registered through
//   MrTreeMetaDataProvider + MrTreeOptions (NodeMicroLayout runs inside TreeLayoutProvider.layout).
//   expected = { graph: { w: H, h: H, childAreaWidth: H|null, childAreaHeight: H|null },  // root width/height, CoreOptions.CHILD_AREA_*
//                                                       // (no default: null when the engine skipped the graph, as for a root without children)
//                nodes:  [ { id, x: H, y: H, w: H, h: H, margins: [t,r,b,l] (H), padding: [t,r,b,l] (H) } ],
//                edges:  [ { id, sections: [ { start: [H,H], end: [H,H], bends: [[H,H]...] } ] } ],
//                labels: [ { id, x: H, y: H, w: H, h: H } ] }
//   nodes lists the root FIRST (its x/y are its own), then the children in model order; margins/padding are getProperty on
//   CoreOptions.MARGINS / CoreOptions.PADDING (unset reads as the default); edges are the edges of the root in model order (the
//   container is the root; all scenarios are flat); sections is the list of the edge's ElkEdgeSections (empty when none);
//   labels are the labels of every node in the nodes order (a label's x/y are relative to its node).
//
// ---- group stops ---------------------------------------------------------------------------------------------------------
//   Replays TreeLayoutProvider.layout (M/TreeLayoutProvider.java:49-88) step by step on the re-imported root, observing the TGraph
//   after each step. NodeMicroLayout.forGraph(root).execute() runs first (it is not a stop; scenario nodes have no ports, so it
//   changes only margins) unless OMIT_NODE_MICRO_LAYOUT. MrTree.updateModules(graph) (private) is invoked by reflection per component
//   and the private `algorithm` list is read; each processor/phase of that list is executed with NullElkProgressMonitor, in list order
//   (MrTree.layout, M/MrTree.java:179-199). Per component the list can differ by option (e.g. COMPACTION_PROC, DIRECTION_PROC).
//   expected = { stops: [ stop... ] }, stop = { step, comp, graphs: [ G... ], elk?: ELK }, in this order:
//     1. step "ElkGraphImporter.importGraph"  comp -1  graphs [the imported TGraph]
//     2. step "ComponentsProcessor.split"     comp -1  graphs [every component, in component order] (ids renumbered per component
//                                                       when there is more than one; with separateConnectedComponents=false: [the graph])
//     3. for each component c in split order (0-based), these 15 steps in this order (the same list for every row of this file:
//        MrTree.updateModules yields it for every option set; steps that have nothing to do for an option still produce a stop):
//          DFSTreeifyer, RootProcessor, FanProcessor, LevelProcessor, NodeOrderer, NeighborsProcessor, LevelHeightProcessor,
//          NodePlacer, DirectionProcessor, NodePositionProcessor, CompactionProcessor, LevelCoordinatesProcessor,
//          GraphBoundsProcessor, Untreeifyer, EdgeRouter
//        step = the processor's Java simple class name, comp = c, graphs = [that component's TGraph]. A replay builds its own list
//        through the ported assembler and compares step names too.
//     4. step "ComponentsProcessor.pack"      comp -1  graphs [the packed TGraph] (pack sorts the component list in place; with one
//                                                       component it returns that component after applyPaddingAndNormalizePositions)
//     5. step "ElkGraphImporter.applyLayout"  comp -1  graphs [] elk: ELK where ELK = { graph: {w,h,childAreaWidth,childAreaHeight},
//                                                       nodes: [ {id,x,y,w,h} ], edges: [ {id, sections: [...]} ] } (as group full
//                                                       without margins/padding/labels)
//   A step that throws ends the stop list: expected then also carries throwsAt (the step name of the list above that threw,
//   or "MrTree.updateModules" / "NodeMicroLayout") and throws = { class, message, frame } (shape of group throws below); the stop of
//   the throwing step is not recorded. Stops recorded before the throw are complete. Such a row keeps group "stops"
//   (e.g. edgeRoutingMode=NONE with an edge throws in ElkGraphImporter.applyLayout after the EdgeRouter stop).
//   G (a TGraph dump) = { props: P, nodes: [ NODE... ], edges: [ EDGE... ] } with nodes/edges in TGraph.getNodes()/getEdges() order. A component's edge list repeats an edge that has two endpoints
//   in it (ComponentsProcessor.dfs adds each incident edge once per node): the dump keeps the repeats, so edge refs are not unique there.
//   NODE = { ref, id, label, x: H, y: H, w: H, h: H, parent, children: [ref...], props: P }
//     ref    stable node key within one graph dump: the ElkNode identifier when the TNode has an ElkNode ORIGIN, else its label
//            ("DUMMY_ROOT" / "SUPER_ROOT", the dummy nodes of RootProcessor, which also carry TNode.id 0). A TS replay derives it the
//            same way (origin identifier, else label). Duplicate refs in one dump fail the recording.
//     id     the TNode.id int at that moment (the importer assigns the index among the root's children; ComponentsProcessor.split
//            renumbers per component when >1 component; DFSTreeifyer.init renumbers 0..n-1 in graph order; dummies are created with 0).
//     label  TNode.getLabel() ("" for a node without label; the first label text otherwise)
//     x,y,w,h TShape position (the node CENTRE, as the importer sets it) and size
//     parent ref of getParent() (source of the first incoming edge) or null
//     children refs of the targets of the outgoing edges, in outgoing-edge order (the incoming and outgoing edge lists
//            themselves are not dumped: edge order is the graph's edge list order, child order is `children`)
//   EDGE = { ref, source, target, bends: [[H,H]...], props: P }
//     ref   the ElkEdge identifier when the TEdge has an ElkEdge ORIGIN, else "d:<source ref>><target ref>" (dummy edges of
//           TNode.addChild); source/target are node refs
//   P (properties) = object of the properties that are SET (MapPropertyHolder.getAllProperties) among: every InternalProperties
//     field (key = the Java field name, e.g. ROOT, FAN, LEVELHEIGHT, REMOVABLE_EDGES), plus MrTreeOptions.TREE_LEVEL ("TREE_LEVEL"),
//     POSITION_CONSTRAINT ("POSITION_CONSTRAINT") and PRIORITY ("PRIORITY"; pack writes it on the component graphs). Values:
//     Integer -> number, Boolean -> boolean, Double -> H, String -> string, TNode -> node ref, TEdge -> edge ref,
//     KVector -> [H,H], ORIGIN -> the origin element's identifier, List<..> -> array of the above (REMOVABLE_EDGES,
//     COMPACT_CONSTRAINTS). RANDOM and any other type fail the recording (none is set at the pin).
//   Dumps are snapshots taken immediately after each step (strings), so no later mutation leaks into an earlier stop.
//
// ---- group throws --------------------------------------------------------------------------------------------------------
//   A scenario whose engine run (as group full) throws is recorded here instead of as a full row (its stops twin keeps group
//   stops with throwsAt, see above). expected = { throws: { class, message, frame } }, class the exception's fully qualified
//   Java class name, message its getMessage() (null -> JSON null; compare class and frame, not the message, for a
//   NullPointerException: helpful NPE texts are JVM-specific), frame the first org.eclipse.elk frame of the stack trace as
//   "File.java:line" (null when none). For java.lang.StackOverflowError (an Error, not an Exception; message null) the top frame
//   varies from run to run, so frame is the MOST FREQUENT org.eclipse.elk frame of the captured trace, i.e. the line of the
//   recursive call. The row's three runs (original and two re-imports) must throw alike. Throws recorded in mrtree.json (all
//   oracle behaviour, none invented): a graph with an edge and edgeRoutingMode=NONE (no bend points) makes
//   ElkUtil.applyVectorChain throw IllegalArgumentException from ElkGraphImporter.applyLayout (ElkUtil.java:938, 9 rows);
//   BFS treeifying leaves a node with two parents and FanProcessor.java:128 then throws StringIndexOutOfBoundsException (2 rows)
//   or NodePlacer.java:219 throws NullPointerException (1 row). A graph without children is skipped by the engine (a full row
//   with childAreaWidth null) but its provider replay throws NullPointerException in ElkGraphImporter.applyLayout (stops row).
//   mrtree.json has NO StackOverflowError row; mrtree-extra.json has (BFS: NeighborsProcessor makes the two-parent node its own
//   RIGHTSIBLING, NodePlacer.secondWalk follows RIGHTSIBLING forever, NodePlacer.java:341). Some BFS inputs never terminate
//   (an endless loop in NodePlacer.apportion, no exception): they cannot be recorded and are not in either file.
//
// ======================================================= mrtree-extra.json =======================================================
// A second file written by the same run (same header fields, same row and dump contract as above; own seeds 8201 (shapes) and 8202
// (reserved: the extra file uses no `rand` batch), cap 8 MiB). It records code paths the main file's rows do not reach, found with a
// branch-coverage agent over the oracle jars (a diagnosis tool, never part of a recording). Row ids "<group>/<family>/<shape>[/<options>]".
// Option keys added to those of the main file: debugMode, interactive, omitNodeMicroLayout, and direction "UNSET" (not written: the
// default; NodePlacer.java:101-104 maps an unset or UNDEFINED direction to DOWN, so the UNDEFINED arms of CompactionProcessor and
// DirectionProcessor are unreachable). Seeded shapes xshape(kind, seed, n): tree|deep|dag|cyc|star|forest with node sizes w 10..120,
// h 10..80 from java.util.Random(seed); xconstrain(shape, pcSeed) adds positionConstraint -1..n+2 and priority 0..2 (Random(pcSeed)).
// Families: avoid (cyc40907n12, dag36834n11+pc19554, deep937n7 x four directions x compaction x edgeEndTextureLength 0/40, AVOID_OVERLAP:
//   multi-level edges, gaps before the first node, after the last node and between nodes, side counters, cycle-inducing edges, steep
//   end pieces), m2m (MIDDLE_TO_MIDDLE x four directions), cycle (cycPar: back edges, two of them parallel: TreeUtil.getAll*Edges drop
//   an edge whose toString equals an earlier one's, so the second parallel back edge gets no start bend point), multi (fwdMany: several
//   forward edges through one gap), compaction (tree19788n9+pc6533, deep937n7, dag36834n11+pc19554 x five directions x AVOID_OVERLAP and
//   MIDDLE_TO_MIDDLE (the aggressive path); edgeless6 with NONE; the NONE-with-edges throws row), spacing0 (spacing.nodeNode=0: nodes
//   share a projection while their sweep intervals touch, the comparator-equal case of CompactionProcessor's TreeSet), orderer
//   (positionConstraint stars for NodeOrderer priorities 1-4: duplicates at the top and bottom of a level, two out-of-bound values, mixed
//   constrained and unconstrained siblings, a permutation whose value reaches the shrinking inBound size, two sibling groups), debug
//   (debugMode with DESCENDANTS/FAN/CONSTRAINT; forestDebug: four components with different priority sums so ComponentsProcessor.pack
//   logs differing property values to stderr), fan (fans of 11, 12 and 100 children, DESCENDANTS and FAN: FanProcessor id widths 2 and 3),
//   bfs (searchOrder=BFS on a diamond and seeded DAGs: rows that complete and rows that throw), labels (TNode labels the router keys on:
//   "n11", "SUPER_ROOT", and two nodes with the same label text), omitMicro (omitNodeMicroLayout=true), interactive (the option is
//   read by no mrtree code; InteractiveMrTreeGraphVisitor is referenced by no registration or caller, so the engine never applies it),
//   deepLevel (a 135-level spine; a same-level non-tree edge at level 130 (deepHigh) or at level 21 (deepLow): TreeUtil.java:115-116 and
//   163-164 compare two boxed Integer TREE_LEVELs with != , so above the Integer cache (127) a same-level edge counts as a level change).
// Not reached by any row (argued dead by the invariant named; random search over several thousand seeded graphs and options found no
// counter-example, a proof is not claimed for CompactionProcessor.java:108 and 166): NodePlacer.java:202,285,292,320; NodeOrderer.java:177-184 (the ascending sort puts
//   leaves first, so `leaves` is empty whenever `inners` is not), 223.1T, 235.2T, 242.1T, 263.2T; EdgeRouter.java:267-268 and 277-278
//   (a gap before the first node needs the interpolated coordinate below the global minimum), 604-704 (private cyrusBeck, never called);
//   CompactionProcessor.java:78,110,315 (UNDEFINED direction), 108, 166, 291-292, 308; MultiLevelEdgeNodeNodeGap.java:150.2T;
//   ElkGraphImporter.toNodeBorder and most of TreeUtil (no caller); OrderBalance (no caller); MrTree.java:175-176 and 193-194 (the
//   monitor is never null or cancelled through the provider); FanProcessor 55,109-112; LevelHeightProcessor/NeighborsProcessor/
//   NodePositionProcessor empty-graph arms; LevelProcessor.java:51; RootProcessor assert; ComponentsProcessor.java:90 (separate is
//   never null).
//
// =================================================== SCENARIO GENERATOR ===================================================
// Seeds: shapes use java.util.Random(8101) consumed in the fixed order of buildShapes(); the `rand` batch uses Random(8102) consumed
// in the fixed order of randomRows(). Both seeds are non-zero and recorded in the file header. Option values per family:
//   default      every shape with no option set (algorithm only)
//   weighting    MODEL_ORDER, DESCENDANTS, FAN, CONSTRAINT  (x4: random12, unbalanced13, forest, fan11, dag10)
//   posConstraint positionConstraint on nodes (values 0,1,2,0,5; 99 out-of-range) x weighting CONSTRAINT / MODEL_ORDER
//   searchOrder  DFS, BFS  (x2: cyclic3, cyclicRand, roots3, dag10, multilevel)
//   routing      NONE, MIDDLE_TO_MIDDLE, AVOID_OVERLAP  (x3: multilevel, random12, unbalanced13; NONE completes only on edgeless isolated4)
//   compaction   true (random12, unbalanced13, multilevel, fan11, forest, dag10)
//   direction    UP, DOWN, LEFT, RIGHT (x4: random12, forest, multilevel)
//   separate     separateConnectedComponents=false (forest, roots3, cyclic3, emptyGraph)
//   texture      edgeEndTextureLength 0 and 15 (random12, multilevel)
//   aspect       aspectRatio 0.5, 3.0, 10.0 with the forests (forest5, forest)
//   spacing      spacing.nodeNode=33, spacing.edgeNode=9, padding=(5,7,9,11), forest priorities (forest, random12)
//   labeled      node labels sized by NS4 (6.5*length x 13) with and without nodeSize.constraints = {NODE_LABELS, MINIMUM_SIZE}
//   combined     random12 with several factors together
//   corpus       test/corpus/generated/mrtree-tree-small.json (default, compaction, weighting FAN)
//   rand         20 seeded random graphs (tree, DAG, cyclic, forest) with random option picks
// Shapes (buildShapes): single, pair, path6, star6, fan9/fan10/fan11/fan12/fan100 (a root with k leaves: FanProcessor digit width
//   floor(log10(level size))+1 grows at 10 and 100), binary15, random12 (random tree), unbalanced13, forest (4 trees + isolated nodes,
//   priorities), forest5, diamond, dag10 (random DAG with skip edges), multilevel (skip edges for MultiLevelEdgeNodeNodeGap),
//   cyclic3 (cycle with tail and back edges), cyclicRand (random digraph with cycles and several roots), roots3 (three roots with
//   shared children), selfloop, isolated4, emptyGraph (no children), labeled. Initial node positions are a deterministic function of
//   the index so the import stop carries distinct values.
//
// Identity hashes (TR3): the observable hashed containers of the bundle are value-hashed (String and IProperty keys); the
//   identity-hashed ones (ElkGraphImporter.elemMap, CompactionProcessor.cand) are lookup-only. The pin makes any other dependence
//   deterministic. The file is recorded without the pin once for evidence (MRTREE_UNPINNED=1) and the differing row ids journalled.
//
// Re-record: tools/vectors/mrtree-vectors.sh <outDir>; ELK_VECTORS_CACHE=off runs cold. The cache salt covers this source, the script
//   and the oracle build; the generated corpus input read from test/corpus/generated is pinned in INPUT_TABLE (the script checks it).
//   MRTREE_ONLY=<row id substring> records only those rows, MRTREE_FILE=main|extra writes one file, MRTREE_CAP_MB raises the extra
//   cap, MRTREE_HITS=<file> appends per row the branch-coverage agent's hits (never for a ref); MRTREE_TRACE=<substring> prints each stop's node
//   children on stderr. MRTREE_STATS=1 prints on stderr, per step name, how often a stop differs from the preceding stop of the same component.
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Supplier;
import org.eclipse.elk.alg.common.NodeMicroLayout;
import org.eclipse.elk.alg.mrtree.ComponentsProcessor;
import org.eclipse.elk.alg.mrtree.ElkGraphImporter;
import org.eclipse.elk.alg.mrtree.MrTree;
import org.eclipse.elk.alg.mrtree.graph.TEdge;
import org.eclipse.elk.alg.mrtree.graph.TGraph;
import org.eclipse.elk.alg.mrtree.graph.TNode;
import org.eclipse.elk.alg.mrtree.options.EdgeRoutingMode;
import org.eclipse.elk.alg.mrtree.options.InternalProperties;
import org.eclipse.elk.alg.mrtree.options.MrTreeMetaDataProvider;
import org.eclipse.elk.alg.mrtree.options.MrTreeOptions;
import org.eclipse.elk.alg.mrtree.options.OrderWeighting;
import org.eclipse.elk.alg.mrtree.options.TreeifyingOrder;
import org.eclipse.elk.core.RecursiveGraphLayoutEngine;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.Direction;
import org.eclipse.elk.core.options.NodeLabelPlacement;
import org.eclipse.elk.core.options.SizeConstraint;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.core.util.IElkProgressMonitor;
import org.eclipse.elk.core.util.NullElkProgressMonitor;
import org.eclipse.elk.graph.ElkBendPoint;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkEdgeSection;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.util.ElkGraphUtil;

public class MrTreeVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "mrtree.json", EXTRA_OUTPUT = "mrtree-extra.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String CORPUS_INPUT = "test/corpus/generated/mrtree-tree-small.json";
    static final long SHAPE_SEED = 8101L, RANDOM_SEED = 8102L, EXTRA_SHAPE_SEED = 8201L, EXTRA_RANDOM_SEED = 8202L;
    static final long MAX_BYTES = 16L * 1024 * 1024, EXTRA_MAX_BYTES = (System.getenv("MRTREE_CAP_MB") == null ? 8L : Long.parseLong(System.getenv("MRTREE_CAP_MB"))) * 1024 * 1024;
    static final String FULL = "full", STOPS = "stops", THROWS = "throws";
    static final double LABEL_CHAR_WIDTH = 6.5, LABEL_HEIGHT = 13.0;
    static final String ELK_PACKAGE = "org.eclipse.elk.";
    static final int ROOT_COMP = -1;

    // SHA-256 of every repo input file read, "<sha256>  repo:<path under the repo root>". Keep these lines: the shell script parses them.
    static final String INPUT_TABLE = """
d002e5a2eac3086de326c108f6582caa66356ffcc2e707ad7faf59778d92df49  repo:test/corpus/generated/mrtree-tree-small.json
""";

    // ---------------------------------------------------------------------------------------------------- JSON writing

    record Raw(String json) { }

    static String json(Object v) {
        StringBuilder sb = new StringBuilder();
        write(sb, v);
        return sb.toString();
    }

    static void write(StringBuilder sb, Object v) {
        if (v == null) {
            sb.append("null");
        } else if (v instanceof Raw r) {
            sb.append(r.json);
        } else if (v instanceof String s) {
            str(sb, s);
        } else if (v instanceof Boolean || v instanceof Integer) {
            sb.append(v);
        } else if (v instanceof Map<?, ?> m) {
            sb.append('{');
            int i = 0;
            for (Map.Entry<?, ?> e : m.entrySet()) {
                sb.append(i++ == 0 ? "" : ",");
                str(sb, (String) e.getKey());
                sb.append(':');
                write(sb, e.getValue());
            }
            sb.append('}');
        } else if (v instanceof List<?> l) {
            sb.append('[');
            for (int i = 0; i < l.size(); i++) {
                sb.append(i == 0 ? "" : ",");
                write(sb, l.get(i));
            }
            sb.append(']');
        } else {
            throw new Bug("unwritable value of class " + v.getClass().getName());
        }
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

    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new Bug("NaN in a recorded value");
        }
        return String.format("%016x", Double.doubleToRawLongBits(d));
    }

    /** CHILD_AREA_* has no default: JSON null when the layout never set it (the engine skips a graph without children). */
    static String hexOrNull(Double d) {
        return d == null ? null : hex(d);
    }

    static List<Object> hexPair(double x, double y) {
        return List.of(hex(x), hex(y));
    }

    /** A recorder or scenario bug: stops the recording. */
    static final class Bug extends RuntimeException {
        Bug(String message) {
            super(message);
        }
    }

    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");

    /** Gson's lenient writer emits non-finite doubles as bare tokens. In number-token positions they become strings. */
    static String strictNumbers(String json) {
        StringBuilder out = new StringBuilder(json.length() + 16);
        boolean inString = false;
        for (int i = 0; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (inString) {
                out.append(ch);
                if (ch == '\\') {
                    out.append(json.charAt(++i));
                } else if (ch == '"') {
                    inString = false;
                }
            } else if (ch == '"') {
                inString = true;
                out.append(ch);
            } else if (ch == ':' || ch == ',' || ch == '[') {
                out.append(ch);
                int j = i + 1;
                while (j < json.length() && Character.isWhitespace(json.charAt(j))) {
                    out.append(json.charAt(j++));
                }
                i = j - 1;
                for (String t : NON_FINITE) {
                    if (json.startsWith(t, j) && !Character.isLetterOrDigit(json.charAt(j + t.length()))) {
                        out.append('"').append(t).append('"');
                        i = j + t.length() - 1;
                        break;
                    }
                }
            } else {
                out.append(ch);
            }
        }
        return out.toString();
    }

    static void strictParse(Path file) throws IOException {
        try (java.io.Reader in = Files.newBufferedReader(file, StandardCharsets.UTF_8);
                com.google.gson.stream.JsonReader reader = new com.google.gson.stream.JsonReader(in)) {
            reader.skipValue();
            if (reader.peek() != com.google.gson.stream.JsonToken.END_DOCUMENT) {
                throw new IllegalStateException(file + " has content after the top-level JSON value");
            }
        }
    }

    // --------------------------------------------------------------------------------------------------- scenario model

    record N(String id, double w, double h, Integer posConstraint, Integer priority, String label) {
        N(String id, double w, double h) {
            this(id, w, h, null, null, null);
        }
    }

    record E(String id, String s, String t) { }

    record Shape(String name, List<N> nodes, List<E> edges) { }

    /** One option assignment, applied to the root by key (see applyOption). */
    record Opt(String key, Object value) { }

    record Scen(String id, String group, Supplier<ElkNode> build) { }

    static ElkNode build(Shape s, List<Opt> opts) {
        ElkNode root = ElkGraphUtil.createGraph();
        root.setIdentifier("root");
        root.setProperty(CoreOptions.ALGORITHM, MrTreeOptions.ALGORITHM_ID);
        Map<String, ElkNode> byId = new HashMap<>();
        int idx = 0;
        for (N n : s.nodes()) {
            ElkNode node = ElkGraphUtil.createNode(root);
            node.setIdentifier(n.id());
            node.setDimensions(n.w(), n.h());
            node.setLocation((idx * 17) % 90, (idx * 13) % 70);
            idx++;
            if (n.posConstraint() != null) {
                node.setProperty(MrTreeOptions.POSITION_CONSTRAINT, n.posConstraint());
            }
            if (n.priority() != null) {
                node.setProperty(MrTreeOptions.PRIORITY, n.priority());
            }
            if (n.label() != null) {
                ElkLabel l = ElkGraphUtil.createLabel(n.label(), node);
                l.setIdentifier("l" + (idx - 1));
                l.setDimensions(LABEL_CHAR_WIDTH * n.label().length(), LABEL_HEIGHT);
            }
            byId.put(n.id(), node);
        }
        for (E e : s.edges()) {
            ElkEdge edge = ElkGraphUtil.createSimpleEdge(byId.get(e.s()), byId.get(e.t()));
            edge.setIdentifier(e.id());
        }
        for (Opt o : opts) {
            applyOption(root, o);
        }
        return root;
    }

    static void applyOption(ElkNode root, Opt o) {
        Object v = o.value();
        switch (o.key()) {
            case "weighting" -> root.setProperty(MrTreeOptions.WEIGHTING, OrderWeighting.valueOf((String) v));
            case "searchOrder" -> root.setProperty(MrTreeOptions.SEARCH_ORDER, TreeifyingOrder.valueOf((String) v));
            case "edgeRoutingMode" -> root.setProperty(MrTreeOptions.EDGE_ROUTING_MODE, EdgeRoutingMode.valueOf((String) v));
            case "compaction" -> root.setProperty(MrTreeOptions.COMPACTION, (Boolean) v);
            case "direction" -> root.setProperty(MrTreeOptions.DIRECTION, Direction.valueOf((String) v));
            case "separateConnectedComponents" -> root.setProperty(MrTreeOptions.SEPARATE_CONNECTED_COMPONENTS, (Boolean) v);
            case "edgeEndTextureLength" -> root.setProperty(MrTreeOptions.EDGE_END_TEXTURE_LENGTH, (Double) v);
            case "aspectRatio" -> root.setProperty(MrTreeOptions.ASPECT_RATIO, (Double) v);
            case "spacingNodeNode" -> root.setProperty(MrTreeOptions.SPACING_NODE_NODE, (Double) v);
            case "spacingEdgeNode" -> root.setProperty(MrTreeOptions.SPACING_EDGE_NODE, (Double) v);
            case "padding" -> {
                double[] p = (double[]) v;
                root.setProperty(MrTreeOptions.PADDING, new ElkPadding(p[0], p[1], p[2], p[3]));
            }
            case "omitNodeMicroLayout" -> root.setProperty(MrTreeOptions.OMIT_NODE_MICRO_LAYOUT, (Boolean) v);
            case "debugMode" -> root.setProperty(MrTreeOptions.DEBUG_MODE, (Boolean) v);
            case "interactive" -> root.setProperty(MrTreeOptions.INTERACTIVE, (Boolean) v);
            case "nodeLabelSizing" -> {
                root.setProperty(MrTreeOptions.NODE_SIZE_CONSTRAINTS,
                        EnumSet.of(SizeConstraint.NODE_LABELS, SizeConstraint.MINIMUM_SIZE));
                root.setProperty(MrTreeOptions.NODE_SIZE_MINIMUM, new KVector(30, 20));
                root.setProperty(MrTreeOptions.NODE_LABELS_PLACEMENT, NodeLabelPlacement.insideCenter());
            }
            default -> throw new Bug("unknown option key " + o.key());
        }
    }

    static List<Opt> opts(Object... kv) {
        if (kv.length % 2 != 0) {
            throw new IllegalArgumentException("opts() takes key/value pairs, got " + kv.length + " arguments");
        }
        List<Opt> l = new ArrayList<>();
        for (int i = 0; i < kv.length; i += 2) {
            l.add(new Opt((String) kv[i], kv[i + 1]));
        }
        return l;
    }

    static String optionText(List<Opt> opts) {
        StringBuilder sb = new StringBuilder();
        for (Opt o : opts) {
            sb.append(sb.length() == 0 ? "" : "+").append(o.key()).append('=')
                    .append(o.value() instanceof double[] a ? Arrays.toString(a) : String.valueOf(o.value()));
        }
        return sb.toString();
    }

    // ------------------------------------------------------------------------------------------------------- shapes

    static List<N> nodes(int n, Random r) {
        List<N> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            l.add(new N("n" + i, 20 + r.nextInt(51), 15 + r.nextInt(31)));
        }
        return l;
    }

    static List<N> uniform(int n, double w, double h) {
        List<N> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            l.add(new N("n" + i, w, h));
        }
        return l;
    }

    static Shape shape(String name, List<N> nodes, int[][] edges) {
        List<E> es = new ArrayList<>();
        for (int[] e : edges) {
            es.add(new E("e" + es.size(), "n" + e[0], "n" + e[1]));
        }
        return new Shape(name, nodes, es);
    }

    static int[][] edgesOf(List<int[]> l) {
        return l.toArray(new int[0][]);
    }

    static Shape randomTree(String name, int n, Random r) {
        List<int[]> es = new ArrayList<>();
        for (int i = 1; i < n; i++) {
            es.add(new int[] {r.nextInt(i), i});
        }
        return shape(name, nodes(n, r), edgesOf(es));
    }

    static Shape fan(int k, Random r) {
        List<int[]> es = new ArrayList<>();
        for (int i = 1; i <= k; i++) {
            es.add(new int[] {0, i});
        }
        return shape("fan" + k, nodes(k + 1, r), edgesOf(es));
    }

    static Shape randomDag(String name, int n, int extra, Random r) {
        List<int[]> es = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        for (int i = 1; i < n; i++) {
            int p = r.nextInt(i);
            es.add(new int[] {p, i});
            seen.add((long) p * 1000 + i);
        }
        for (int k = 0, tries = 0; k < extra && tries < 100; tries++) {
            int a = r.nextInt(n - 1), b = a + 1 + r.nextInt(n - 1 - a);
            if (seen.add((long) a * 1000 + b)) {
                es.add(new int[] {a, b});
                k++;
            }
        }
        return shape(name, nodes(n, r), edgesOf(es));
    }

    static Shape randomDigraph(String name, int n, int m, Random r) {
        List<int[]> es = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        for (int k = 0, tries = 0; k < m && tries < 200; tries++) {
            int a = r.nextInt(n), b = r.nextInt(n);
            if (a != b && seen.add((long) a * 1000 + b)) {
                es.add(new int[] {a, b});
                k++;
            }
        }
        return shape(name, nodes(n, r), edgesOf(es));
    }

    /** Disjoint union of shapes under fresh ids n0.. ; priorities[i] (when non-null) is given to every node of part i. */
    static Shape forest(String name, List<Shape> parts, int[] priorities) {
        List<N> ns = new ArrayList<>();
        List<E> es = new ArrayList<>();
        for (int p = 0; p < parts.size(); p++) {
            Map<String, String> ren = new HashMap<>();
            for (N n : parts.get(p).nodes()) {
                String id = "n" + ns.size();
                ren.put(n.id(), id);
                ns.add(new N(id, n.w(), n.h(), null, priorities == null || priorities[p] == 0 ? null : priorities[p], null));
            }
            for (E e : parts.get(p).edges()) {
                es.add(new E("e" + es.size(), ren.get(e.s()), ren.get(e.t())));
            }
        }
        return new Shape(name, ns, es);
    }

    static Shape withPositions(Shape s, int[][] idxValue) {
        List<N> ns = new ArrayList<>(s.nodes());
        for (int[] iv : idxValue) {
            N n = ns.get(iv[0]);
            ns.set(iv[0], new N(n.id(), n.w(), n.h(), iv[1], n.priority(), n.label()));
        }
        return new Shape(s.name(), ns, s.edges());
    }

    static Map<String, Shape> buildShapes() {
        Random r = new Random(SHAPE_SEED);
        Map<String, Shape> m = new LinkedHashMap<>();
        List<Shape> all = new ArrayList<>();
        all.add(shape("single", nodes(1, r), new int[][] {}));
        all.add(shape("pair", nodes(2, r), new int[][] {{0, 1}}));
        all.add(shape("path6", nodes(6, r), new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {4, 5}}));
        all.add(fan(6, r));
        for (int k : new int[] {9, 10, 11, 12, 100}) {
            all.add(fan(k, r));
        }
        all.add(shape("binary15", nodes(15, r), new int[][] {{0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 5}, {2, 6}, {3, 7}, {3, 8},
            {4, 9}, {4, 10}, {5, 11}, {5, 12}, {6, 13}, {6, 14}}));
        all.add(randomTree("random12", 12, r));
        all.add(shape("unbalanced13", nodes(13, r), new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {0, 5}, {0, 6}, {0, 7}, {1, 8},
            {2, 9}, {2, 10}, {4, 11}, {4, 12}}));
        List<Shape> parts = List.of(randomTree("a", 5, r), shape("b", nodes(4, r), new int[][] {{0, 1}, {1, 2}, {2, 3}}),
                fan(3, r), shape("c", nodes(1, r), new int[][] {}));
        all.add(forest("forest", parts, new int[] {0, 2, 0, 5}));
        all.add(forest("forest5", List.of(randomTree("a", 4, r), randomTree("b", 3, r), randomTree("c", 2, r),
                randomTree("d", 2, r), shape("e", nodes(1, r), new int[][] {})), null));
        all.add(shape("diamond", nodes(4, r), new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}}));
        all.add(randomDag("dag10", 10, 4, r));
        all.add(shape("multilevel", nodes(9, r), new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4}, {0, 2}, {0, 4}, {1, 4}, {0, 5},
            {5, 6}, {5, 7}, {7, 8}, {0, 8}}));
        all.add(shape("cyclic3", nodes(6, r), new int[][] {{0, 1}, {1, 2}, {2, 0}, {2, 3}, {3, 1}, {3, 4}, {4, 5}, {5, 3}}));
        all.add(randomDigraph("cyclicRand", 9, 14, r));
        all.add(shape("roots3", nodes(9, r), new int[][] {{0, 3}, {1, 3}, {1, 4}, {2, 4}, {2, 5}, {3, 6}, {4, 6}, {4, 7},
            {5, 8}, {0, 1}}));
        all.add(shape("selfloop", nodes(3, r), new int[][] {{0, 0}, {0, 1}, {1, 2}, {2, 2}}));
        all.add(shape("isolated4", nodes(4, r), new int[][] {}));
        all.add(shape("emptyGraph", List.of(), new int[][] {}));
        List<N> lab = new ArrayList<>();
        String[] texts = {"root", "alpha", "b", "gamma gamma", "delta", "e"};
        for (int i = 0; i < 6; i++) {
            lab.add(new N("n" + i, 40 + 10 * (i % 3), 30, null, null, texts[i]));
        }
        all.add(shape("labeled", lab, new int[][] {{0, 1}, {0, 2}, {1, 3}, {1, 4}, {2, 5}}));
        for (Shape s : all) {
            if (m.put(s.name(), s) != null) {
                throw new Bug("duplicate shape " + s.name());
            }
        }
        return m;
    }

    // -------------------------------------------------------------------------------------------------- scenario plan

    static final String[] WEIGHTINGS = {"MODEL_ORDER", "DESCENDANTS", "FAN", "CONSTRAINT"};
    static final String[] SEARCH = {"DFS", "BFS"};
    static final String[] ROUTING = {"NONE", "MIDDLE_TO_MIDDLE", "AVOID_OVERLAP"};
    static final String[] DIRECTIONS = {"UP", "DOWN", "LEFT", "RIGHT"};

    static final class Plan {
        final Map<String, Shape> shapes;
        final List<Scen> scens = new ArrayList<>();

        Plan(Map<String, Shape> shapes) {
            this.shapes = shapes;
        }

        final Set<String> ids = new HashSet<>();

        void add(String family, String group, Shape s, List<Opt> o) {
            String name = s.name() + (o.isEmpty() ? "" : "/" + optionText(o));
            String id = group + "/" + family + "/" + name;
            if (!ids.add(id)) {
                throw new Bug("duplicate row id " + id);
            }
            scens.add(new Scen(id, group, () -> build(s, o)));
        }

        /** full row always; stops row too when stops is true. */
        void both(String family, boolean stops, Shape s, List<Opt> o) {
            add(family, FULL, s, o);
            if (stops) {
                add(family, STOPS, s, o);
            }
        }

        Shape sh(String name) {
            Shape s = shapes.get(name);
            if (s == null) {
                throw new Bug("no shape " + name);
            }
            return s;
        }

        void each(String family, String key, String[] values, String[] stopsOn, String... fullOnly) {
            for (String v : values) {
                for (String n : stopsOn) {
                    both(family, true, sh(n), opts(key, v));
                }
                for (String n : fullOnly) {
                    both(family, false, sh(n), opts(key, v));
                }
            }
        }
    }

    static final Set<String> NO_DEFAULT_STOPS = Set.of("fan9", "fan11", "fan12", "fan100", "star6", "binary15", "random12", "unbalanced13", "dag10",
            "cyclic3", "cyclicRand", "roots3", "multilevel");

    /** One-factor rows: full for every value x shape; stops only where stopsOn names "shape" or "shape=value". */
    static void factor(Plan p, String family, String key, String[] values, List<String> shapes, Set<String> stopsOn) {
        for (String v : values) {
            for (String n : shapes) {
                boolean st = stopsOn.contains(n) || stopsOn.contains(n + "=" + v);
                p.both(family, st, p.sh(n), opts(key, v));
            }
        }
    }

    static Plan plan() {
        Plan p = new Plan(buildShapes());
        for (Shape s : p.shapes.values()) {
            p.both("default", !NO_DEFAULT_STOPS.contains(s.name()), s, opts());
        }
        factor(p, "weighting", "weighting", WEIGHTINGS, List.of("random12", "unbalanced13", "forest", "fan11", "dag10"),
                Set.of("random12", "unbalanced13=DESCENDANTS", "unbalanced13=CONSTRAINT", "forest=FAN"));
        Shape constrained = renamed(withPositions(p.sh("random12"), new int[][] {{3, 0}, {4, 1}, {5, 2}, {6, 0}, {7, 5}}),
                "random12pc");
        Shape constrainedB = renamed(withPositions(p.sh("unbalanced13"), new int[][] {{5, 0}, {6, 0}, {7, 1}, {8, 2}, {9, 0}}),
                "unbalanced13pc");
        Shape outOfRange = renamed(withPositions(p.sh("random12"), new int[][] {{3, 99}, {4, 1}, {1, 7}}), "random12pcRange");
        for (String w : new String[] {"CONSTRAINT", "MODEL_ORDER"}) {
            p.both("posConstraint", true, constrained, opts("weighting", w));
            p.both("posConstraint", false, constrainedB, opts("weighting", w));
        }
        p.both("posConstraint", false, outOfRange, opts("weighting", "CONSTRAINT"));
        factor(p, "searchOrder", "searchOrder", SEARCH, List.of("cyclic3", "cyclicRand", "roots3", "multilevel", "dag10"),
                Set.of("cyclic3", "cyclicRand", "roots3"));
        factor(p, "routing", "edgeRoutingMode", ROUTING, List.of("multilevel", "random12", "unbalanced13"), Set.of("multilevel"));
        for (String n : new String[] {"random12", "multilevel", "forest"}) {
            p.both("compaction", true, p.sh(n), opts("compaction", true));
        }
        for (String n : new String[] {"unbalanced13", "fan11", "dag10"}) {
            p.both("compaction", false, p.sh(n), opts("compaction", true));
        }
        factor(p, "direction", "direction", DIRECTIONS, List.of("random12", "forest", "multilevel"),
                Set.of("random12"));
        for (String n : new String[] {"forest", "roots3", "emptyGraph"}) {
            p.both("separate", true, p.sh(n), opts("separateConnectedComponents", false));
        }
        p.both("separate", false, p.sh("cyclic3"), opts("separateConnectedComponents", false));
        p.both("routing", true, p.sh("isolated4"), opts("edgeRoutingMode", "NONE")); // NONE completes only without edges
        for (double t : new double[] {0.0, 15.0}) {
            p.both("texture", false, p.sh("random12"), opts("edgeEndTextureLength", t));
            p.both("texture", true, p.sh("multilevel"), opts("edgeEndTextureLength", t));
        }
        for (double a : new double[] {0.5, 3.0, 10.0}) {
            p.both("aspect", a != 3.0, p.sh("forest5"), opts("aspectRatio", a));
            p.both("aspect", false, p.sh("forest"), opts("aspectRatio", a));
        }
        for (String n : new String[] {"forest", "random12"}) {
            boolean st = n.equals("forest");
            p.both("spacing", st, p.sh(n), opts("spacingNodeNode", 33.0));
            p.both("spacing", false, p.sh(n), opts("spacingEdgeNode", 9.0));
            p.both("spacing", st, p.sh(n), opts("padding", new double[] {5, 7, 9, 11}));
        }
        p.both("labeled", true, p.sh("labeled"), opts("nodeLabelSizing", true));
        p.both("combined", true, p.sh("random12"), opts("direction", "LEFT", "compaction", true, "searchOrder", "BFS",
                "edgeRoutingMode", "AVOID_OVERLAP", "weighting", "DESCENDANTS"));
        p.both("combined", false, p.sh("multilevel"), opts("direction", "DOWN", "compaction", true, "searchOrder", "BFS",
                "edgeRoutingMode", "MIDDLE_TO_MIDDLE", "weighting", "FAN"));
        p.both("combined", false, p.sh("forest"), opts("direction", "UP", "compaction", true, "weighting", "DESCENDANTS",
                "aspectRatio", 0.7, "separateConnectedComponents", true));
        corpusRows(p);
        randomRows(p);
        return p;
    }

    // ------------------------------------------------------------------------------------------ extra file plan

    static final String[] DIR5 = {"UNSET", "UP", "DOWN", "LEFT", "RIGHT"};
    static final String AVOID = "AVOID_OVERLAP", M2M = "MIDDLE_TO_MIDDLE";

    static Shape withLabels(Shape s, String name, Map<Integer, String> labels) {
        List<N> ns = new ArrayList<>(s.nodes());
        for (Map.Entry<Integer, String> e : labels.entrySet()) {
            N n = ns.get(e.getKey());
            ns.set(e.getKey(), new N(n.id(), n.w(), n.h(), n.posConstraint(), n.priority(), e.getValue()));
        }
        return new Shape(name, ns, s.edges());
    }

    /** Root n0 with children n1..nk whose positionConstraint values are given (a level of k siblings for NodeOrderer). */
    static Shape constraintStar(String name, int... constraints) {
        List<N> ns = new ArrayList<>();
        List<E> es = new ArrayList<>();
        ns.add(new N("n0", 40, 30));
        for (int i = 0; i < constraints.length; i++) {
            ns.add(new N("n" + (i + 1), 30 + 5 * (i % 3), 20, constraints[i] == -1 ? null : constraints[i], null, null));
            es.add(new E("e" + i, "n0", "n" + (i + 1)));
        }
        return new Shape(name, ns, es);
    }

    /** Root n0, two children each with three children; the grandchildren carry the given constraints (two sibling groups). */
    static Shape constraintTwoLevel(String name, int[] left, int[] right) {
        List<N> ns = new ArrayList<>(List.of(new N("n0", 40, 30), new N("n1", 40, 30), new N("n2", 40, 30)));
        List<E> es = new ArrayList<>(List.of(new E("e0", "n0", "n1"), new E("e1", "n0", "n2")));
        int[][] groups = {left, right};
        for (int g = 0; g < 2; g++) {
            for (int c : groups[g]) {
                String id = "n" + ns.size();
                ns.add(new N(id, 24 + 4 * (ns.size() % 3), 18, c == -1 ? null : c, null, null));
                es.add(new E("e" + es.size(), "n" + (g + 1), id));
            }
        }
        return new Shape(name, ns, es);
    }

    /** A spine of `levels` nodes; a node pair under spine[at] (c1 first) and, when cross, the same-level edge c2 -> c1. */
    static Shape deepSpine(String name, int levels, int crossAt, int decoyAt) {
        List<N> ns = new ArrayList<>();
        List<E> es = new ArrayList<>();
        for (int i = 0; i < levels; i++) {
            ns.add(new N("s" + i, 20, 20));
            if (i > 0) {
                es.add(new E("e" + es.size(), "s" + (i - 1), "s" + i));
            }
        }
        for (int[] pair : new int[][] {{crossAt, 1}, {decoyAt, 0}}) {
            String a = "p" + pair[0] + "a", b = "p" + pair[0] + "b";
            ns.add(new N(a, 20, 20));
            ns.add(new N(b, 20, 20));
            es.add(new E("e" + es.size(), "s" + pair[0], a));
            es.add(new E("e" + es.size(), "s" + pair[0], b));
            if (pair[1] == 1) {
                es.add(new E("e" + es.size(), b, a));
            }
        }
        return new Shape(name, ns, es);
    }

    static List<Opt> o(Object... kv) {
        return opts(kv);
    }

    static Plan extraPlan() {
        Plan p = new Plan(new LinkedHashMap<>());
        Shape r1 = xshape("cyc", 40907, 12);
        Shape r2 = xconstrain(xshape("dag", 36834, 11), 19554);
        Shape r3 = xshape("deep", 937, 7);
        Shape t1 = xconstrain(xshape("tree", 19788, 9), 6533);
        extraRouting(p, r1, r2, r3);
        extraCompaction(p, r2, r3, t1);
        extraOrderer(p, r3, t1);
        extraFans(p);
        extraBfs(p);
        extraMisc(p, r3);
        return p;
    }

    /** AVOID_OVERLAP and MIDDLE_TO_MIDDLE x the four directions; multi-level, side-counter, cycle-inducing, steep-end rows. */
    static void extraRouting(Plan p, Shape r1, Shape r2, Shape r3) {
        for (Shape s : List.of(r1, r2, r3)) {
            for (String d : DIRECTIONS) {
                for (boolean comp : new boolean[] {false, true}) {
                    for (double tex : new double[] {0.0, 40.0}) {
                        boolean st = (s == r1 && !comp && tex == 40.0 && (d.equals("LEFT") || d.equals("RIGHT"))) || (s == r3 && comp && tex == 0.0);
                        p.both("avoid", st, s, o("direction", d, "compaction", comp, "edgeRoutingMode", AVOID,
                                "edgeEndTextureLength", tex, "weighting", "CONSTRAINT"));
                    }
                }
            }
        }
        for (Shape s : List.of(r1, r3)) {
            for (String d : DIRECTIONS) {
                p.both("m2m", s == r3, s, o("direction", d, "edgeRoutingMode", M2M));
            }
        }
        // cycle-inducing edges: a tree with back edges, two of them parallel (the second has no start bends in DOWN)
        Shape cyc = shape("cycPar", xsizes(6, new Random(EXTRA_SHAPE_SEED)), new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 4},
            {3, 0}, {3, 0}, {4, 2}, {3, 5}, {5, 1}});
        for (String d : DIRECTIONS) {
            for (double tex : new double[] {0.0, 15.0}) {
                p.both("cycle", tex == 15.0, cyc, o("direction", d, "edgeRoutingMode", AVOID, "edgeEndTextureLength", tex));
            }
        }
        // several multi-level edges through one gap: a spine with forward edges
        Shape fwd = shape("fwdMany", xsizes(8, new Random(EXTRA_SHAPE_SEED + 1)), new int[][] {{0, 1}, {1, 2}, {2, 3}, {3, 4},
            {0, 5}, {5, 6}, {6, 7}, {0, 3}, {0, 4}, {1, 4}, {1, 3}, {5, 7}, {0, 7}});
        for (String d : DIRECTIONS) {
            p.both("multi", d.equals("UP"), fwd, o("direction", d, "edgeRoutingMode", AVOID,
                    "edgeEndTextureLength", 40.0));
        }
    }

    /** compaction=true x direction (unset = DOWN, NodePlacer maps UNDEFINED to DOWN) x routing. */
    static void extraCompaction(Plan p, Shape r2, Shape r3, Shape t1) {
        for (Shape s : List.of(t1, r3, r2)) {
            for (String d : DIR5) {
                for (String routing : new String[] {AVOID, M2M}) {
                    List<Opt> o = new ArrayList<>(o("compaction", true, "edgeRoutingMode", routing));
                    if (!d.equals("UNSET")) {
                        o.add(new Opt("direction", d));
                    }
                    p.both("compaction", s == t1 || (s == r3 && routing.equals(AVOID))
                        || (s == r2 && routing.equals(AVOID) && (d.equals("LEFT") || d.equals("RIGHT"))), s, o);
                }
            }
        }
        Shape edgeless = shape("edgeless6", xsizes(6, new Random(EXTRA_SHAPE_SEED + 2)), new int[][] {});
        for (String d : new String[] {"UNSET", "UP", "LEFT"}) {
            List<Opt> o = new ArrayList<>(o("compaction", true, "edgeRoutingMode", "NONE"));
            if (!d.equals("UNSET")) {
                o.add(new Opt("direction", d));
            }
            p.both("compaction", true, edgeless, o);
        }
        p.both("compaction", true, t1, o("compaction", true, "edgeRoutingMode", "NONE")); // throws: an edge with NONE
        for (Shape s : List.of(t1, r3)) {
            for (String d : new String[] {"DOWN", "RIGHT"}) {
                p.both("spacing0", s == t1, s, o("compaction", true, "direction", d, "spacingNodeNode", 0.0, "edgeRoutingMode", AVOID));
            }
        }
    }

    static void extraOrderer(Plan p, Shape r3, Shape t1) {
        List<Opt> con = o("weighting", "CONSTRAINT");
        p.both("orderer", true, constraintStar("starDupHigh", 4, 4, 4, 4, 4), con);
        p.both("orderer", true, constraintStar("starDupLow", 0, 0, 0, 0, 0), con);
        p.both("orderer", true, constraintStar("starTwoOutOfBound", 1, 1, 3, 3, 9, 12), con);
        p.both("orderer", true, constraintStar("starMixed", 2, -1, 0, -1, 2, -1), con);
        p.both("orderer", true, constraintStar("starPermute", 2, 0, 1), con);
        p.both("orderer", true, constraintStar("starRangeEdge", 3, 3, -1, 7, 7, 1), con);
        p.both("orderer", true, constraintTwoLevel("twoLevel", new int[] {1, 1, 1}, new int[] {5, 0, 0}), con);
        for (String w : new String[] {"DESCENDANTS", "FAN", "CONSTRAINT"}) {
            p.both("debug", true, r3, o("weighting", w, "debugMode", true));
            p.both("debug", false, t1, o("weighting", w, "debugMode", true));
        }
    }

    static void extraFans(Plan p) {
        for (int k : new int[] {11, 12, 100}) {
            Shape f = fan(k, new Random(EXTRA_SHAPE_SEED + k));
            for (String w : new String[] {"DESCENDANTS", "FAN"}) {
                p.both("fan", true, f, o("weighting", w));
            }
        }
    }

    /** BFS leaves a node with two parents: rows that complete, and rows that throw (class and frame as recorded). */
    static void extraBfs(Plan p) {
        List<Opt> bfs = o("searchOrder", "BFS");
        Shape diamond = shape("diamond", xsizes(4, new Random(EXTRA_SHAPE_SEED + 3)), new int[][] {{0, 1}, {0, 2}, {1, 3}, {2, 3}});
        for (Shape s : List.of(diamond, xshape("dag", 2, 4), xshape("dag", 5, 4), xshape("cyc", 3, 4), xshape("cyc", 108, 8),
                xshape("dag", 1, 4), xshape("dag", 1, 5), xshape("cyc", 79, 7))) {
            p.both("bfs", true, s, bfs);
        }
        p.both("bfs", false, xshape("dag", 2, 4), o("searchOrder", "BFS", "direction", "RIGHT", "edgeRoutingMode", AVOID));
    }

    static void extraMisc(Plan p, Shape r3) {
        // forest of four components with different priority sums, debugMode: ComponentsProcessor.pack property merge logging
        Random r = new Random(EXTRA_SHAPE_SEED + 4);
        Shape forest = forest("forestDebug", List.of(randomTree("a", 4, r), randomTree("b", 3, r), randomTree("c", 3, r),
                randomTree("d", 2, r)), new int[] {1, 3, 0, 2});
        p.both("debug", true, forest, o("debugMode", true));
        p.both("debug", false, forest, o("debugMode", true, "separateConnectedComponents", false));
        // labels the router and compaction key on: "n11", "SUPER_ROOT", and two nodes with the same label text
        Shape tree6 = shape("tree6", xsizes(6, new Random(EXTRA_SHAPE_SEED + 5)), new int[][] {{0, 1}, {0, 2}, {1, 3}, {1, 4},
            {2, 5}, {0, 4}});
        List<Opt> avoid = o("edgeRoutingMode", AVOID, "compaction", true);
        p.both("labels", true, withLabels(tree6, "labelN11", Map.of(3, "n11")), avoid);
        p.both("labels", true, withLabels(tree6, "labelSuperRoot", Map.of(2, "SUPER_ROOT")), avoid);
        p.both("labels", true, withLabels(tree6, "labelDuplicate", Map.of(1, "x", 2, "x")), avoid);
        p.both("omitMicro", true, withLabels(tree6, "labelOmit", Map.of(0, "root", 3, "leaf")),
                o("omitNodeMicroLayout", true, "nodeLabelSizing", true));
        p.both("omitMicro", true, withLabels(tree6, "labelSized", Map.of(0, "root", 3, "leaf")), o("nodeLabelSizing", true));
        // interactive is read by no mrtree code (InteractiveMrTreeGraphVisitor is never applied): the option is inert
        p.both("interactive", false, r3, o("interactive", true));
        p.both("interactive", false, r3, o());
        // boxed Integer reference comparison of TREE_LEVEL (TreeUtil.getAllIncomingEdges / getAllOutgoingEdges)
        p.both("deepLevel", false, deepSpine("deepHigh", 135, 129, 20), o("edgeRoutingMode", AVOID));
        p.both("deepLevel", false, deepSpine("deepLow", 135, 20, 129), o("edgeRoutingMode", AVOID));
    }

    // ----------------------------------------------------------------------------- extra file: seeded shapes

    static List<N> xsizes(int n, Random r) {
        List<N> l = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            l.add(new N("n" + i, 10 + r.nextInt(111), 10 + r.nextInt(71)));
        }
        return l;
    }

    /** Seeded shape of the extra file: kind tree|deep|dag|cyc|star|forest, n nodes of mixed sizes (w 10..120, h 10..80). */
    static Shape xshape(String kind, long seed, int n) {
        Random r = new Random(seed);
        List<int[]> es = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        switch (kind) {
            case "star" -> {
                for (int i = 1; i < n; i++) {
                    es.add(new int[] {r.nextInt(3) == 0 ? r.nextInt(i) : 0, i});
                }
            }
            case "forest" -> {
                int c = 2 + r.nextInt(4);
                for (int i = c; i < n; i++) {
                    es.add(new int[] {r.nextInt(i), i});
                }
            }
            case "tree" -> {
                for (int i = 1; i < n; i++) {
                    es.add(new int[] {r.nextInt(i), i});
                }
            }
            case "deep" -> {
                for (int i = 1; i < n; i++) {
                    es.add(new int[] {r.nextInt(4) == 0 ? r.nextInt(i) : i - 1, i});
                }
            }
            case "dag", "cyc" -> {
                for (int i = 1; i < n; i++) {
                    int p = r.nextInt(i);
                    es.add(new int[] {p, i});
                    seen.add((long) p * 1000 + i);
                }
                for (int k = 0, t = 0; k < 2 + n / 3 && t < 200; t++) {
                    int a = kind.equals("dag") ? r.nextInt(n - 1) : r.nextInt(n);
                    int b = kind.equals("dag") ? a + 1 + r.nextInt(n - 1 - a) : r.nextInt(n);
                    if (a != b && seen.add((long) a * 1000 + b)) {
                        es.add(new int[] {a, b});
                        k++;
                    }
                }
            }
            default -> throw new Bug("unknown shape kind " + kind);
        }
        return shape(kind + seed + "n" + n, xsizes(n, r), edgesOf(es));
    }

    /** Gives about half the nodes a positionConstraint in [-1, n+2] and a third of those a priority 0..2 (seeded). */
    static Shape xconstrain(Shape s, long pcSeed) {
        Random r = new Random(pcSeed);
        int n = s.nodes().size();
        List<N> ns = new ArrayList<>(s.nodes());
        for (int i = 0; i < n; i++) {
            if (r.nextInt(2) == 0) {
                N x = ns.get(i);
                ns.set(i, new N(x.id(), x.w(), x.h(), r.nextInt(n + 4) - 1, r.nextInt(3) == 0 ? Integer.valueOf(r.nextInt(3)) : null,
                        null));
            }
        }
        return new Shape(s.name() + "pc" + pcSeed, ns, s.edges());
    }

    static Shape renamed(Shape s, String name) {
        return new Shape(name, s.nodes(), s.edges());
    }

    static ElkNode loadCorpus(Path repo, List<Opt> o) {
        try {
            ElkNode g = ElkGraphJson.forGraph(Files.readString(repo.resolve(CORPUS_INPUT), StandardCharsets.UTF_8)).toElk();
            g.setProperty(CoreOptions.ALGORITHM, MrTreeOptions.ALGORITHM_ID);
            for (Opt x : o) {
                applyOption(g, x);
            }
            return g;
        } catch (IOException e) {
            throw new Bug("cannot read " + CORPUS_INPUT + ": " + e);
        }
    }

    static Path REPO;

    static void corpusRows(Plan p) {
        List<List<Opt>> variants = List.of(opts(), opts("compaction", true), opts("weighting", "FAN"));
        for (List<Opt> o : variants) {
            boolean withStops = o.isEmpty();
            String name = "mrtree-tree-small" + (o.isEmpty() ? "" : "/" + optionText(o));
            for (String g : withStops ? new String[] {FULL, STOPS} : new String[] {FULL}) {
                String id = g + "/corpus/" + name;
                p.ids.add(id);
                p.scens.add(new Scen(id, g, () -> loadCorpus(REPO, o)));
            }
        }
    }

    static void randomRows(Plan p) {
        Random r = new Random(RANDOM_SEED);
        for (int i = 0; i < 20; i++) {
            int n = 4 + r.nextInt(13);
            String name = String.format("rand%02d", i);
            Shape s = switch (i % 4) {
                case 0 -> randomTree(name, n, r);
                case 1 -> randomDag(name, Math.max(n, 5), 2 + r.nextInt(4), r);
                case 2 -> randomDigraph(name, n, n + r.nextInt(n), r);
                default -> forest(name, List.of(randomTree("a", 2 + r.nextInt(5), r), randomTree("b", 1 + r.nextInt(4), r),
                        shape("c", nodes(1, r), new int[][] {})), new int[] {r.nextInt(3), r.nextInt(3), 0});
            };
            List<Opt> o = new ArrayList<>();
            o.add(new Opt("weighting", WEIGHTINGS[r.nextInt(4)]));
            o.add(new Opt("searchOrder", SEARCH[r.nextInt(2)]));
            o.add(new Opt("edgeRoutingMode", ROUTING[r.nextInt(3)]));
            o.add(new Opt("compaction", r.nextBoolean()));
            o.add(new Opt("direction", r.nextInt(5) == 4 ? "UNDEFINED" : DIRECTIONS[r.nextInt(4)]));
            o.add(new Opt("edgeEndTextureLength", new double[] {7.0, 0.0, 12.5}[r.nextInt(3)]));
            o.add(new Opt("separateConnectedComponents", r.nextInt(4) != 0));
            Shape named = new Shape(name, s.nodes(), s.edges());
            p.both("rand", i % 5 == 0, named, o);
        }
    }

    // ----------------------------------------------------------------------------------------------- engine set-up

    static void setup(String vectorsDir) {
        if (System.getenv("MRTREE_UNPINNED") == null
                && System.identityHashCode(new Object()) != System.identityHashCode(new Object())) {
            throw new IllegalStateException("run with -XX:+UnlockExperimentalVMOptions -XX:hashCode=2 "
                    + "(tools/vectors/mrtree-vectors.sh does)");
        }
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new MrTreeMetaDataProvider(), new MrTreeOptions());
        System.setProperty(SEED_PROPERTY, "1");
        System.setProperty("org.eclipse.elk.graph.util.identifierSeed", "1");
        REPO = Path.of(vectorsDir).toAbsolutePath().normalize().getParent().getParent();
    }

    static String export(ElkNode root) {
        return ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false).omitZeroPositions(false)
                .omitUnknownLayoutOptions(true).prettyPrint(false).toJson();
    }

    static ElkNode importJson(String text) {
        return ElkGraphJson.forGraph(text).toElk();
    }

    // ----------------------------------------------------------------------------------------------------- dumps

    static final Map<IProperty<?>, String> PROP_NAMES = new IdentityHashMap<>();
    static final List<IProperty<?>> PROP_ORDER = new ArrayList<>();

    static void initProps() {
        try {
            List<Field> fs = new ArrayList<>(Arrays.asList(InternalProperties.class.getDeclaredFields()));
            fs.sort(Comparator.comparing(Field::getName));
            for (Field f : fs) {
                if (IProperty.class.isAssignableFrom(f.getType())) {
                    IProperty<?> pr = (IProperty<?>) f.get(null);
                    PROP_NAMES.put(pr, f.getName());
                    PROP_ORDER.add(pr);
                }
            }
        } catch (IllegalAccessException e) {
            throw new Bug("cannot read InternalProperties: " + e);
        }
        for (Map.Entry<String, IProperty<?>> e : new TreeMap<>(Map.<String, IProperty<?>>of("POSITION_CONSTRAINT",
                MrTreeOptions.POSITION_CONSTRAINT, "PRIORITY", MrTreeOptions.PRIORITY, "TREE_LEVEL", MrTreeOptions.TREE_LEVEL))
                .entrySet()) {
            PROP_NAMES.put(e.getValue(), e.getKey());
            PROP_ORDER.add(e.getValue());
        }
    }

    static String nodeRef(TNode n) {
        Object o = n.getProperty(InternalProperties.ORIGIN);
        if (o instanceof ElkNode e) {
            return e.getIdentifier();
        }
        return n.getLabel();
    }

    static String edgeRef(TEdge e) {
        Object o = e.getProperty(InternalProperties.ORIGIN);
        if (o instanceof ElkEdge x) {
            return x.getIdentifier();
        }
        return "d:" + nodeRef(e.getSource()) + ">" + nodeRef(e.getTarget());
    }

    static Object enc(Object v) {
        if (v instanceof Integer || v instanceof Boolean || v instanceof String) {
            return v;
        } else if (v instanceof Double d) {
            return hex(d);
        } else if (v instanceof TNode n) {
            return nodeRef(n);
        } else if (v instanceof TEdge e) {
            return edgeRef(e);
        } else if (v instanceof KVector k) {
            return hexPair(k.x, k.y);
        } else if (v instanceof ElkNode e) {
            return e.getIdentifier();
        } else if (v instanceof ElkEdge e) {
            return e.getIdentifier();
        } else if (v instanceof Collection<?> c) {
            List<Object> l = new ArrayList<>();
            for (Object x : c) {
                l.add(enc(x));
            }
            return l;
        }
        throw new Bug("unencodable property value of class " + (v == null ? "null" : v.getClass().getName()));
    }

    static Map<String, Object> props(org.eclipse.elk.graph.properties.MapPropertyHolder h) {
        Map<String, Object> m = new LinkedHashMap<>();
        Map<IProperty<?>, Object> all = h.getAllProperties();
        for (IProperty<?> p : PROP_ORDER) {
            if (all.containsKey(p)) {
                m.put(PROP_NAMES.get(p), enc(all.get(p)));
            }
        }
        return m;
    }

    static List<Object> refs(Iterable<TNode> ns) {
        List<Object> l = new ArrayList<>();
        for (TNode n : ns) {
            l.add(nodeRef(n));
        }
        return l;
    }

    static Map<String, Object> dumpNode(TNode n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ref", nodeRef(n));
        m.put("id", n.id);
        m.put("label", n.getLabel());
        m.put("x", hex(n.getPosition().x));
        m.put("y", hex(n.getPosition().y));
        m.put("w", hex(n.getSize().x));
        m.put("h", hex(n.getSize().y));
        TNode parent = n.getParent();
        m.put("parent", parent == null ? null : nodeRef(parent));
        m.put("children", refs(n.getChildren()));
        m.put("props", props(n));
        return m;
    }

    static Map<String, Object> dumpEdge(TEdge e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ref", edgeRef(e));
        m.put("source", nodeRef(e.getSource()));
        m.put("target", nodeRef(e.getTarget()));
        List<Object> bends = new ArrayList<>();
        for (KVector k : e.getBendPoints()) {
            bends.add(hexPair(k.x, k.y));
        }
        m.put("bends", bends);
        m.put("props", props(e));
        return m;
    }

    static Map<String, Object> dumpGraph(TGraph g) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("props", props(g));
        Set<String> seen = new HashSet<>();
        List<Object> ns = new ArrayList<>();
        for (TNode n : g.getNodes()) {
            if (!seen.add(nodeRef(n))) {
                throw new Bug("duplicate node ref " + nodeRef(n));
            }
            ns.add(dumpNode(n));
        }
        // ComponentsProcessor.dfs adds an edge once per incident node, so a component's edge list repeats edges (kept as is)
        List<Object> es = new ArrayList<>();
        for (TEdge e : g.getEdges()) {
            es.add(dumpEdge(e));
        }
        m.put("nodes", ns);
        m.put("edges", es);
        return m;
    }

    static List<Object> four(double a, double b, double c, double d) {
        return List.of(hex(a), hex(b), hex(c), hex(d));
    }

    /** The ELK graph after a run; micro = margins, padding and labels (group full). */
    static Map<String, Object> dumpElk(ElkNode root, boolean micro) {
        Map<String, Object> m = new LinkedHashMap<>();
        Map<String, Object> g = new LinkedHashMap<>();
        g.put("w", hex(root.getWidth()));
        g.put("h", hex(root.getHeight()));
        g.put("childAreaWidth", hexOrNull(root.getProperty(CoreOptions.CHILD_AREA_WIDTH)));
        g.put("childAreaHeight", hexOrNull(root.getProperty(CoreOptions.CHILD_AREA_HEIGHT)));
        m.put("graph", g);
        List<ElkNode> all = new ArrayList<>();
        all.add(root);
        all.addAll(root.getChildren());
        List<Object> ns = new ArrayList<>(), es = new ArrayList<>(), ls = new ArrayList<>();
        for (ElkNode n : all) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("id", n.getIdentifier());
            o.put("x", hex(n.getX()));
            o.put("y", hex(n.getY()));
            o.put("w", hex(n.getWidth()));
            o.put("h", hex(n.getHeight()));
            if (micro) {
                ElkMargin mg = n.getProperty(CoreOptions.MARGINS);
                ElkPadding pd = n.getProperty(CoreOptions.PADDING);
                o.put("margins", four(mg.top, mg.right, mg.bottom, mg.left));
                o.put("padding", four(pd.top, pd.right, pd.bottom, pd.left));
                for (ElkLabel l : n.getLabels()) {
                    Map<String, Object> lo = new LinkedHashMap<>();
                    lo.put("id", l.getIdentifier());
                    lo.put("x", hex(l.getX()));
                    lo.put("y", hex(l.getY()));
                    lo.put("w", hex(l.getWidth()));
                    lo.put("h", hex(l.getHeight()));
                    ls.add(lo);
                }
            }
            ns.add(o);
        }
        for (ElkEdge e : root.getContainedEdges()) {
            Map<String, Object> o = new LinkedHashMap<>();
            o.put("id", e.getIdentifier());
            List<Object> secs = new ArrayList<>();
            for (ElkEdgeSection s : e.getSections()) {
                Map<String, Object> so = new LinkedHashMap<>();
                so.put("start", hexPair(s.getStartX(), s.getStartY()));
                so.put("end", hexPair(s.getEndX(), s.getEndY()));
                List<Object> bs = new ArrayList<>();
                for (ElkBendPoint b : s.getBendPoints()) {
                    bs.add(hexPair(b.getX(), b.getY()));
                }
                so.put("bends", bs);
                secs.add(so);
            }
            o.put("sections", secs);
            es.add(o);
        }
        m.put("nodes", ns);
        m.put("edges", es);
        if (micro) {
            m.put("labels", ls);
        }
        return m;
    }

    // ----------------------------------------------------------------------------------------------------- runs

    record Thrown(String cls, String message, String frame) { }

    /** The first org.eclipse.elk frame; for a StackOverflowError (whose top frame varies run to run) the most frequent one. */
    static String elkFrame(Throwable e) {
        if (e instanceof StackOverflowError) {
            Map<String, Integer> counts = new TreeMap<>();
            for (StackTraceElement f : e.getStackTrace()) {
                if (f.getClassName().startsWith(ELK_PACKAGE)) {
                    counts.merge(f.getFileName() + ":" + f.getLineNumber(), 1, Integer::sum);
                }
            }
            return counts.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
        }
        for (StackTraceElement f : e.getStackTrace()) {
            if (f.getClassName().startsWith("MrTreeVectors")) {
                return null;
            }
            if (f.getClassName().startsWith(ELK_PACKAGE)) {
                return f.getFileName() + ":" + f.getLineNumber();
            }
        }
        return null;
    }

    static Thrown thrown(Throwable e) {
        if (e instanceof Bug b) {
            throw b;
        }
        if (TRACE != null && currentRow.contains(TRACE)) {
            e.printStackTrace();
        }
        return new Thrown(e.getClass().getName(), e.getMessage(), elkFrame(e));
    }

    static Object thrownMap(Thrown t) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("class", t.cls());
        m.put("message", t.message());
        m.put("frame", t.frame());
        return Map.of("throws", m);
    }

    /** Result of one run: the expected object or a Thrown. */
    static Object runFull(ElkNode root) {
        try {
            new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
            return dumpElk(root, true);
        } catch (RuntimeException | StackOverflowError e) {
            return thrown(e);
        }
    }

    static final Method UPDATE_MODULES;
    static final Field ALGORITHM;

    static {
        try {
            UPDATE_MODULES = MrTree.class.getDeclaredMethod("updateModules", TGraph.class);
            UPDATE_MODULES.setAccessible(true);
            ALGORITHM = MrTree.class.getDeclaredField("algorithm");
            ALGORITHM.setAccessible(true);
        } catch (ReflectiveOperationException e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    /** Diagnosis aid: MRTREE_TRACE=<row id substring> prints every stop's step and node children on stderr. */
    static final String TRACE = System.getenv("MRTREE_TRACE");
    static String currentRow = "";

    static void trace(String step, List<Object> graphs) {
        if (TRACE == null || !currentRow.contains(TRACE)) {
            return;
        }
        System.err.println("TRACE " + currentRow + " " + step);
        for (Object g : graphs) {
            for (Object n : (List<?>) ((Map<?, ?>) g).get("nodes")) {
                Map<?, ?> m = (Map<?, ?>) n;
                System.err.println("   " + m.get("ref") + " id=" + m.get("id") + " parent=" + m.get("parent") + " children="
                        + m.get("children") + " rs="
                        + ((Map<?, ?>) m.get("props")).get("RIGHTSIBLING") + " ls=" + ((Map<?, ?>) m.get("props")).get("LEFTSIBLING"));
            }
        }
    }

    static Map<String, Object> stop(String step, int comp, List<Object> graphs, Object elk) {
        trace(step, graphs);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("step", step);
        m.put("comp", comp);
        m.put("graphs", graphs);
        if (elk != null) {
            m.put("elk", elk);
        }
        return m;
    }

    static List<Object> one(TGraph g) {
        List<Object> l = new ArrayList<>();
        l.add(dumpGraph(g));
        return l;
    }

    /** Mirrors TreeLayoutProvider.layout (M/TreeLayoutProvider.java:49-88), observing after each step. A throw ends the stop list;
     * the row keeps the stops so far plus throws and throwsAt (the step that threw). */
    static Object runStops(ElkNode root) {
        List<Object> stops = new ArrayList<>();
        String[] step = {"NodeMicroLayout"};
        Thrown t = null;
        try {
            stopsBody(root, stops, step);
        } catch (java.lang.reflect.InvocationTargetException e) {
            if (e.getCause() instanceof RuntimeException || e.getCause() instanceof StackOverflowError) {
                t = thrown(e.getCause());
            } else {
                throw new Bug("step failed: " + e.getCause());
            }
        } catch (ReflectiveOperationException e) {
            throw new Bug("reflection: " + e);
        } catch (RuntimeException | StackOverflowError e) {
            t = thrown(e);
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("stops", stops);
        if (t != null) {
            m.put("throwsAt", step[0]);
            m.put("throws", ((Map<?, ?>) thrownMap(t)).get("throws"));
        }
        return m;
    }

    @SuppressWarnings("unchecked")
    static void stopsBody(ElkNode root, List<Object> stops, String[] step)
            throws ReflectiveOperationException {
        if (!root.getProperty(MrTreeOptions.OMIT_NODE_MICRO_LAYOUT)) {
            NodeMicroLayout.forGraph(root).execute();
        }
        step[0] = "ElkGraphImporter.importGraph";
        ElkGraphImporter importer = new ElkGraphImporter();
        TGraph tGraph = importer.importGraph(root);
        stops.add(stop(step[0], ROOT_COMP, one(tGraph), null));
        step[0] = "ComponentsProcessor.split";
        ComponentsProcessor cp = new ComponentsProcessor();
        List<TGraph> comps = cp.split(tGraph);
        List<Object> compDumps = new ArrayList<>();
        for (TGraph c : comps) {
            compDumps.add(dumpGraph(c));
        }
        stops.add(stop(step[0], ROOT_COMP, compDumps, null));
        MrTree mrTree = new MrTree();
        for (int c = 0; c < comps.size(); c++) {
            TGraph comp = comps.get(c);
            step[0] = "MrTree.updateModules";
            UPDATE_MODULES.invoke(mrTree, comp);
            List<org.eclipse.elk.core.alg.ILayoutProcessor<TGraph>> algorithm =
                    (List<org.eclipse.elk.core.alg.ILayoutProcessor<TGraph>>) ALGORITHM.get(mrTree);
            for (org.eclipse.elk.core.alg.ILayoutProcessor<TGraph> proc : algorithm) {
                step[0] = proc.getClass().getSimpleName();
                IElkProgressMonitor pm = new NullElkProgressMonitor();
                proc.process(comp, pm);
                stops.add(stop(step[0], c, one(comp), null));
            }
        }
        step[0] = "ComponentsProcessor.pack";
        TGraph packed = cp.pack(comps);
        stops.add(stop(step[0], ROOT_COMP, one(packed), null));
        step[0] = "ElkGraphImporter.applyLayout";
        importer.applyLayout(packed);
        stops.add(stop(step[0], ROOT_COMP, new ArrayList<>(), dumpElk(root, false)));
    }

    static Object run(String group, ElkNode root) {
        return group.equals(STOPS) ? runStops(root) : runFull(root);
    }

    static String resultJson(Object r) {
        return json(r instanceof Thrown t ? thrownMap(t) : r);
    }

    static final Map<String, int[]> STATS = new TreeMap<>();
    static final List<String> NO_CHANGE_ROWS = new ArrayList<>();

    /** Per step name: how often a stop's graph differs from the previous stop of the same component. */
    @SuppressWarnings("unchecked")
    static void stats(String rowId, Object result) {
        Map<String, String> last = new HashMap<>();
        String first = null, packed = null;
        List<?> splitGraphs = null;
        for (Object o : (List<Object>) ((Map<String, Object>) result).get("stops")) {
            Map<String, Object> s = (Map<String, Object>) o;
            String step = (String) s.get("step");
            String key = String.valueOf(s.get("comp"));
            String cur = json(s.get("graphs")) + (s.containsKey("elk") ? json(s.get("elk")) : "");
            int[] c = STATS.computeIfAbsent(step, k -> new int[2]);
            if (step.equals("ComponentsProcessor.split")) {
                splitGraphs = (List<?>) s.get("graphs");
            }
            if (!last.containsKey(key) && !key.equals("-1") && splitGraphs != null) {
                last.put(key, json(List.of(splitGraphs.get(Integer.parseInt(key)))));
            }
            if (last.containsKey(key)) {
                c[1]++;
                if (!last.get(key).equals(cur)) {
                    c[0]++;
                }
            }
            last.put(key, cur);
            if (first == null) {
                first = cur;
            }
            if (step.equals("ComponentsProcessor.pack")) {
                packed = cur;
            }
        }
        if (packed != null && first.equals(packed)) {
            throw new Bug("row " + rowId + ": the pack stop equals the import stop (no per-step change recorded)");
        }
    }

    // ---------------------------------------------------------------------------------------------------- rows

    record Row(String id, String group, String json, boolean thrown) { }

    static Row record(Scen sc) {
        currentRow = sc.id();
        String raw = export(sc.build().get());
        String input = strictNumbers(raw);
        if (!input.equals(raw)) {
            throw new Bug("row " + sc.id() + ": the exporter wrote a non-finite number");
        }
        Object expected = run(sc.group(), importJson(input));
        Object original = run(sc.group(), sc.build().get());
        Object again = run(sc.group(), importJson(input));
        String e = resultJson(expected);
        if (!e.equals(resultJson(original))) {
            throw new Bug("row " + sc.id() + ": the re-imported run differs from the original-graph run");
        }
        if (!e.equals(resultJson(again))) {
            throw new Bug("row " + sc.id() + ": two re-imported runs differ");
        }
        boolean isThrown = expected instanceof Thrown;
        String group = sc.group();
        String id = sc.id();
        if (isThrown && !group.equals(THROWS)) {
            // the oracle throws on this input: the row is recorded in group throws (a stops row of it duplicates the full row)
            System.err.println("ORACLE THROWS " + id + " " + expected);
            group = THROWS;
            id = THROWS + id.substring(id.indexOf('/'));
        } else if (!isThrown && group.equals(THROWS)) {
            throw new Bug("row " + id + ": group throws but the oracle run completed");
        }
        if (group.equals(STOPS)) {
            stats(id, expected);
        }
        StringBuilder sb = new StringBuilder("{\"id\":");
        str(sb, id);
        sb.append(",\"group\":\"").append(group).append("\",\"input\":").append(input).append(",\"expected\":").append(e)
                .append('}');
        return new Row(id, group, sb.toString(), isThrown);
    }

    static void checkTable(Path repo) throws Exception {
        for (String line : INPUT_TABLE.strip().split("\n")) {
            String[] parts = line.trim().split("\\s+");
            Path file = repo.resolve(parts[1].substring("repo:".length()));
            byte[] bytes = Files.readAllBytes(file);
            String sha = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
            if (!sha.equals(parts[0])) {
                throw new Bug("input " + file + " changed: " + sha);
            }
        }
    }

    /** The branch-coverage agent's hit set when a diagnosis run loads one (never in a recording), else null. */
    @SuppressWarnings("unchecked")
    static Set<String> agentHits() {
        try {
            return (Set<String>) Class.forName("CovAgent").getField("HITS").get(null);
        } catch (ReflectiveOperationException e) {
            return null;
        }
    }

    static final String HITS_FILE = System.getenv("MRTREE_HITS");

    static void logHits(String file, String rowId) throws IOException {
        Set<String> hits = agentHits();
        if (HITS_FILE != null && hits != null) {
            Files.writeString(Path.of(HITS_FILE), file + "\t" + rowId + "\t" + String.join(",", new TreeSet<>(hits)) + "\n",
                    StandardCharsets.UTF_8, java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
        }
    }

    /** Records every scenario of a plan and writes one ref file. */
    static void writeFile(Path out, String fileName, Plan plan, long shapeSeed, long randomSeed, long maxBytes) throws IOException {
        List<Row> rows = new ArrayList<>();
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String g : List.of(FULL, STOPS, THROWS)) {
            counts.put(g, 0);
        }
        String only = System.getenv("MRTREE_ONLY");
        Set<String> written = new HashSet<>();
        for (Scen sc : plan.scens) {
            if (only != null && !sc.id().contains(only)) {
                continue;
            }
            Set<String> hits = agentHits();
            if (hits != null && HITS_FILE != null) {
                hits.clear();
            }
            Row r;
            try {
                r = record(sc);
            } catch (StackOverflowError e) {
                throw new Bug("row " + sc.id() + " overflowed the stack");
            }
            logHits(fileName, r.id());
            if (!written.add(r.id())) {
                continue; // the stops twin of a row that throws
            }
            rows.add(r);
            counts.merge(r.group(), 1, Integer::sum);
        }
        StringBuilder fileText = new StringBuilder("{\n  \"jdk\": ");
        str(fileText, System.getProperty("java.version"));
        fileText.append(",\n  \"oracle\": \"").append(ELK_COMMIT).append("\",\n  \"seeds\": {\"shapes\": ").append(shapeSeed)
                .append(", \"random\": ").append(randomSeed).append("},\n  \"rowCounts\": {");
        int k = 0;
        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            fileText.append(k++ == 0 ? "" : ", ").append('"').append(e.getKey()).append("\": ").append(e.getValue());
        }
        fileText.append("},\n  \"rows\": [\n");
        for (int i = 0; i < rows.size(); i++) {
            fileText.append("    ").append(rows.get(i).json()).append(i + 1 < rows.size() ? ",\n" : "\n");
        }
        fileText.append("  ]\n}\n");
        byte[] bytes = fileText.toString().getBytes(StandardCharsets.UTF_8);
        if (bytes.length > maxBytes) {
            throw new Bug(fileName + " is " + bytes.length + " bytes, over the " + maxBytes + " byte cap");
        }
        Path file = out.resolve(fileName);
        Files.write(file, bytes);
        strictParse(file);
        System.err.println(fileName + " rows: " + counts + ", bytes: " + bytes.length);
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            throw new IllegalArgumentException("usage: MrTreeVectors.java <outDir> <tools/vectors dir>");
        }
        setup(args[1]);
        initProps();
        checkTable(REPO);
        Path out = Path.of(args[0]);
        Files.createDirectories(out);
        String which = System.getenv("MRTREE_FILE");
        if (which == null || which.equals("main")) {
            writeFile(out, OUTPUT, plan(), SHAPE_SEED, RANDOM_SEED, MAX_BYTES);
        }
        if (which == null || which.equals("extra")) {
            writeFile(out, EXTRA_OUTPUT, extraPlan(), EXTRA_SHAPE_SEED, EXTRA_RANDOM_SEED, EXTRA_MAX_BYTES);
        }
        if (System.getenv("MRTREE_STATS") != null) {
            for (Map.Entry<String, int[]> e : STATS.entrySet()) {
                System.err.println("stats " + e.getKey() + " changed " + e.getValue()[0] + " of " + e.getValue()[1]);
            }
        }
    }
}
