// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, mission 7a, T10, L4, X5, X6) for the org.eclipse.elk.alg.layered
// framework branches the oracle replays of mission 7a leave untaken (plans/layered-framework/unreached.md: scenario
// groups S1-S22). The Java is the spec; this program only CALLS ELK public APIs (and, where a member is not public,
// reflection on it) and records results; it embeds no ELK implementation.
// Run: tools/vectors/layered-site-vectors.sh <outDir>
//      (java -cp ... LayeredSiteVectors.java <outDir> <tools/vectors dir>)
//
// Output <outDir>/layered-sites.json (2-space top level, one compact JSON row per line, trailing newline):
//   { jdk, oracle, rowCounts: { "<site>": n }, rows: [row...] }
//   row = { id, site, input, steps, expected }; ids are "site/<group>/<name>", unique and stable. site = the 7a class
//   under test (rowCounts is keyed by it, its values sum to rows.length): LGraphUtil, Spacings, Tarjan, LGraphAdapters,
//   ElkGraphTransformer, ElkGraphLayoutTransferrer, LNode, LEdge, LPort, LGraph, LLabel, LayeredLayoutProvider,
//   IHierarchyAwareLayoutProcessor, enums, LayeredSpacings, NodeFlexibility.
//   input = the prepared ELK graph exported by ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false)
//   .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false) (the NS1 flags) under system property
//   org.eclipse.elk.graph.json.exportSeed=1, embedded as JSON, or null. With an input the interpreter starts with the
//   re-imported ELK root bound to the name "elk"; with null it starts with a new LGraph() bound to "g0".
//   steps = [ { op, on, args, as } ] (as omitted for a call whose result is not recorded), interpreted in order.
//   expected = { <as label>: value } in step order. A step that throws (an ELK or JDK exception, not an interpreter
//   error) records { "exception": { "class": "<simple name>", "message": "<message>" } } as its label's value and the
//   run continues; a message has its object hashes ("@" + 3 or more hex digits) masked as "@<hash>". Such a step has a
//   label. Doubles are 16 lowercase hex digits, String.format("%016x", Double.doubleToRawLongBits(d)) (-0.0 kept); a
//   NaN fails the recording. Enums, ids, names and class names are strings. A JVM-worded message (the "Cannot invoke
//   ..." helpful NullPointerException text, the "Index n out of bounds for length m" texts) is the JDK 21 text.
//
// Names. Every step addresses elements and objects by name. Elements imported by importGraph carry T1's positional
//   names ("g0" the first LGraph, "g0/n3" its 4th layerless node, "g0/n3/p1" a port, "g0/e2" an edge, "g0/n3/l0" a node
//   label, "g0/n3/p1/l0" a port label, "g0/e2/l0" an edge label; the nested graph of the first node having one is
//   "g1", and so on, see the LGraph dump below) and keep them when they move. A new<Class> op, or an op returning a
//   Handle (marked <h> below), names its new object by the step's label (an alias when the object already has a name).
//   Any other element met for the first time in a result is named "x/<kind><k>" (kind g, n, p, e, l, layer, o; k counts
//   the auto names of the kind from 0, skipping taken names), in the order results are produced. The ELK root is "elk".
//   Arguments are: names (strings) of elements/objects, null, hex doubles (the scenario author's doubles), ints,
//   booleans, enum constant names (PortSide, PortType, Direction, PortConstraints, LNode.NodeType), a point [hx, hy],
//   a list of names, or a C4 value (below). Statics have on = null; receivers are the "on" name.
//   Result encodings: a double 16-hex; a boolean/int/string as is; an enum its name; an element or object its name; an
//   adapter { "adapter": <name>, "of": <name of the adapted LGraph/LNode/LPort/LLabel/LEdge> }; a KVector a point
//   [hx, hy]; an ElkMargin/ElkPadding/LMargin/LPadding [top, right, bottom, left] hex; an Iterable/array a list of
//   encodings; getProperty and getIndividualOrDefault the C4 value (below); exportElk and dumpLGraph raw JSON.
//   Raw ELK JSON (input, exportElk results) is post-processed so the file is strict JSON: Gson's lenient writer emits
//   non-finite doubles as bare tokens, so in number-token positions (after ':', ',' or '[', outside strings) Infinity,
//   -Infinity and NaN become the strings "Infinity", "-Infinity" and "NaN". dumpLGraph and every other recorded double
//   are 16-hex raw bits and unaffected (Infinity is 7ff0000000000000). The run ends by strict-parsing the written file
//   (Gson JsonReader, default non-lenient mode) and fails if that does not succeed.
//
// C4 values (T1 / MetaDataVectors): {t:"bool",v}, {t:"int",v}, {t:"string",v}, {t:"double",v:"<Double.toString>"},
//   {t:"enum",c:"<Type>",n:"<NAME>"}, {t:"set",c:"<Type>",items:["<NAME>"]} (EnumSet), {t:"list",c:"<class>",items:[]},
//   {t:"obj",c:"<class>",fields:{}}, {ref:"<name>"} an LGraphElement, {elk:"<ELK id>"} an ElkGraphElement, a list of
//   those, null. Argument-only extensions (setProperty): {t:"chain",v:[[hx,hy]...]} a KVectorChain, {t:"vector",
//   v:[hx,hy]} a KVector, {t:"individualSpacings",v:{<property id>:<C4>}} an IndividualSpacings, a JSON list of C4
//   values (an ArrayList). Types of enums are the simple names of the option enums, "LNode.NodeType" for NodeType.
//   Properties are addressed by id (CoreOptions, LayeredOptions, InternalProperties, LabelManagementOptions,
//   LabelSide and LabelDummySwitcher fields; ids are equal when the properties are).
//
// Ops. Signature = the Java call; <h> marks a Handle result; "(x/y)" a receiver choice by type. Every new<Class> op
//   must have a label.
//   new<Class> (the label names the element): newLGraph() new LGraph(); newLNode(graph|null) new LNode(LGraph);
//     newLPort(); newLEdge(); newLLabel(text|null) new LLabel(String); newLLabelDefault() new LLabel();
//     newLayer(graph) new Layer(LGraph); newPropertyHolder() new MapPropertyHolder() <h>; newSpacings(graph)
//     new Spacings(LGraph) <h>; newTarjan([edges]) new Tarjan(List<LEdge>, List<Set<LNode>>, HashMap<LNode,Integer>)
//     with fresh lists <h>; newElkGraph() ElkGraphUtil.createGraph() <h>; newElkNode (on ElkNode parent)
//     ElkGraphUtil.createNode(ElkNode) <h>; newElkEdge (on parent) ElkGraphUtil.createEdge(ElkNode) <h>.
//   ELK helpers: elkSetIdentifier(id) setIdentifier; elkSetDimensions(w, h) setDimensions; elkAddSource(shape)
//     getSources().add; elkAddTarget(shape) getTargets().add; elkFind(id) the ElkGraphElement of the ELK root (on "elk")
//     whose getIdentifier() is id <h>.
//   Geometry (on an LGraph / LShape / Layer, or an adapter): setSize(x, y) getSize().x/y = (GraphElementAdapter.setSize);
//     setPosition(x, y) (LShape.getPosition(), GraphElementAdapter.setPosition); setOffset(x, y) LGraph.getOffset();
//     setAnchor(x, y) LPort.getAnchor(); setMargin(t, r, b, l) LNode/LPort.getMargin() (NodeAdapter/PortAdapter.setMargin);
//     setPadding(t, r, b, l) LNode/LGraph.getPadding() (NodeAdapter.setPadding); getSize, getPosition, getOffset,
//     getAnchor, getMargin, getPadding (the same getters, adapters included); getActualSize LGraph.getActualSize();
//     bendPointsAdd(x, y) LEdge.getBendPoints().add(new KVector(x, y)); getBendPoints() the KVectorChain.
//   Properties: setProperty(id, C4) IPropertyHolder.setProperty(IProperty, value); hasProperty(id) (holders and
//     adapters); getProperty(id) the C4 value (holders and adapters); getVolatileId(), setVolatileId(i) (adapters).
//   state(ids|null): an observable record of an element. LGraph { path, size, padding, offset, parentNode,
//     layerlessNodes, layers, properties }; LNode { path, type, pos, size, margin, padding, graph, layer, ports, labels,
//     nested, properties }; LPort { path, node, side, pos, size, anchor, explicitAnchor, connectedToExternalNodes,
//     margin, labels, incoming, outgoing, properties }; LEdge { path, source, target, bendPoints, labels, properties };
//     LLabel { path, text, pos, size, properties }; Layer { path, graph, size, nodes, properties }. properties = the
//     C4 values of the properties set on the element, keys sorted, restricted to the listed ids (null: all set ones).
//   toString() Object.toString; getDesignation() LGraphElement.getDesignation(); getText() LLabel/LabelAdapter.getText().
//   LGraph and Layer: layerlessAdd(node) getLayerlessNodes().add; layerlessRemove(node) ...remove (boolean);
//     layersAdd(layer) getLayers().add; getLayers(); getLayerlessNodes(); setParentNode(node|null); getParentNode();
//     getNodes() (GraphAdapter.getNodes / Layer.getNodes); getGraph() (Layer/NodeAdapter/LNode.getGraph);
//     layerlessAt(i) getLayerlessNodes().get(i) <h>; portAt(i) (on LNode) getPorts().get(i) <h>.
//   LNode: setLayer(layer|null) setLayer(Layer); setLayerAt(i, layer|null) setLayer(int, Layer); getLayer(); setType(t);
//     getType(); getPortsOfType(type) getPorts(PortType); getPortsOfSide(side) getPorts(PortSide);
//     getPortsOfTypeAndSide(type, side) getPorts(PortType, PortSide); cachePortSides(); getPortSideView(side) the
//     sublist; portSideViewGet(side, i); portSideViewSize(side); portSideViewSet(side, i, port) set (returns the old
//     port); getNestedGraph(); setNestedGraph(graph|null); isInlineEdgeLabel(); borderToContentAreaCoordinates(h, v);
//     getInteractiveReferencePoint() (a point or null).
//   Shared by type: getPorts() (LNode.getPorts / NodeAdapter.getPorts); getLabels() (LNode/LPort/LEdge/NodeAdapter/
//     PortAdapter/EdgeAdapter); labelsAdd(label) (LNode/LPort/LEdge); getIncomingEdges(), getOutgoingEdges() (LNode,
//     LPort, PortAdapter, NodeAdapter); getConnectedEdges() (LNode, LPort); getIndex() (LNode, LPort, Layer);
//     getSide() (LPort, PortAdapter, LabelAdapter).
//   LPort: setNode(node|null); getNode(); setSide(side|null); setExplicitlySuppliedPortAnchor(b);
//     isExplicitlySuppliedPortAnchor(); setConnectedToExternalNodes(b); isConnectedToExternalNodes();
//     getAbsoluteAnchor(); getName(); getDegree(); getNetFlow(); getPredecessorPorts(); getSuccessorPorts();
//     getConnectedPorts().
//   LEdge: setSource(port|null); setTarget(port|null); setTargetAndInsertAtIndex(port|null, i); getSource();
//     getTarget(); reverse(graph, adaptPorts); isSelfLoop(); isInLayerEdge(); getOtherPort(port) getOther(LPort);
//     getOtherNode(node) getOther(LNode).
//   LGraphUtil (static, on = null): LGraphUtil.resizeNode(node, size, movePorts, moveLabels); offsetGraph(graph, dx,
//     dy); offsetGraphs([graphs], dx, dy); placeNodesHorizontally(layer, xoffset); findMaxNonDummyNodeWidth(layer,
//     respectMargins); computeGraphProperties(graph); createPort(node, endpoint|null, type, graph) <h>;
//     provideCollectorPort(graph, node, type, side) <h> (null for PortType.UNDEFINED); initializePort(port,
//     constraints, direction, anchor|null); createExternalPortDummy(holder, constraints, side, netFlow, portNodeSize,
//     portPosition, portSize, direction, graph) <h> (holder is any IPropertyHolder, here an LPort); getExternalPortPosition(
//     graph, dummy, w, h); isDescendant(child, parent); changeCoordSystem(point, oldGraph, newGraph) (returns the
//     moved point); getIndividualOrInherited(node, id) (C4); getDirection(graph); getMinimalModelOrder(graph).
//   Spacings: getHorizontalSpacingNodes(n1, n2) / getVerticalSpacingNodes (LNode overloads); getHorizontalSpacingTypes(t1,
//     t2) / getVerticalSpacingTypes (NodeType overloads); getHorizontalSpacingElements(e1, e2) (the LGraphElement
//     overload); Spacings.getIndividualOrDefault(node, id) (C4); NodeFlexibility.getNodeFlexibility(node) (an enum name);
//     optionTargetFilter(id) LayeredSpacings.OPTION_TARGET_FILTER.apply(holder, property) (boolean).
//   Tarjan (on the newTarjan object): resetTarjan(graph); tarjan(graph); stronglyConnected(node);
//     tarjanComponents() the filled list of components (each a HashSet<LNode>, whose iteration order is identity-hash
//     dependent, so its members are sorted by name) in discovery order; tarjanComponentIds() the node -> component
//     index map as { name: index } sorted by name. Names sort with digit runs compared numerically.
//   LGraphAdapters (statics on = null, results <h>): LGraphAdapters.adaptGraph(graph) adapt(LGraph);
//     adaptGraphTransparent(graph, ns) adapt(LGraph, boolean); adaptGraphFiltered(graph, ns, comments, filter)
//     adapt(LGraph, boolean, boolean, Predicate) with filter "all" (n -> true), "normal" (type == NORMAL) or "none"
//     (n -> false); adaptNode(node, ns) adapt(LNode, boolean); adaptLabel(label) adapt(LLabel). On adapters:
//     adapterAt(what, i) the i-th adapter of getNodes / getPorts / getLabels / getIncomingEdges / getOutgoingEdges
//     (what = nodes, ports, labels, incoming, outgoing, edgeLabels) <h>; adapterItems(what) the whole list;
//     adapterElement() the adapted element (reflection on the field "element"); sortPortList() NodeAdapter.sortPortList();
//     isCompoundNode(); hasCompoundConnections(); LGraphAdapters.compare(port1, port2) DEFAULT_PORTLIST_SORTER.compare.
//     Adapters are cached by the Java adapters: repeated calls return the same adapter objects.
//   Transform (on "elk" unless noted): importGraph(targetId|null) new ElkGraphTransformer().importGraph(root or the node
//     whose identifier is targetId); the imported LGraphs, nodes, ports, edges and labels are named by T1's positional
//     scheme (above) and the LGraph is returned; dumpLGraph() (on g0) T1's whole-graph dump under system property
//     org.eclipse.elk.graph.json.exportSeed=1 (below); applyLayout() (on an LGraph) new ElkGraphTransformer().
//     applyLayout(lgraph); applyLayoutNonMutating() (on an LGraph) ElkGraphLayoutTransferrer.applyLayoutNonMutating(
//     lgraph) <h> (an ElkNode); exportElk() (on an ElkNode) the NS1 ELK JSON export, raw; getOriginIdentifier()
//     (on an LGraphElement) ElkGraphTransformer.getOriginIdentifier; layout("basic" | "cancelled") (on "elk")
//     new LayeredLayoutProvider().layout(root, monitor) with a BasicProgressMonitor, or one whose isCanceled() is
//     true; hierarchyAwareClasses() the sorted binary names of every class of the layered jar assignable to
//     IHierarchyAwareLayoutProcessor other than the interface; isHierarchyAware("LayeredLayoutProvider" |
//     "ElkLayered") instanceof IHierarchyAwareLayoutProcessor for a new instance.
//   enumInfo(binaryName): by reflection on an enum class, { class (simple name; "LNode.NodeType" for the nested one),
//     constants: [{ name, ordinal, toString }], valueOfMiss: the exception of valueOf("NO_SUCH_CONSTANT"),
//     compareTo: { firstToLast, lastToFirst, firstToFirst }, methods: { <name>: { <CONSTANT>: value } } } for every public
//     non-static method the enum class declares itself with no parameter (a value per constant) or one parameter of
//     its own type (a { <CONSTANT>: { <CONSTANT>: value } } matrix, NodeFlexibility.isAtLeast); the create() factories
//     of CycleBreakingStrategy, LayeringStrategy, CrossingMinimizationStrategy and NodePlacementStrategy are never
//     called (X, excluded).
//
// LGraph dump (dumpLGraph, T1 verbatim): { graphs: [graph] }, graphs in pre-order (root first, then the nested graph
//   of the first node that has one, recursively, then the next such node). Paths are positional ("g<k>", "g0/n3",
//   "g0/n3/p1", "g0/e2", "g0/n3/l0", "g0/n3/p1/l0", "g0/e2/l0"); nodes of a graph are numbered layerlessNodes first,
//   then any node found only in a layer; edges per graph in the order node, port, outgoing edge (then incoming edges not
//   seen yet).
//     graph = { path, size, padding, offset, properties, layerlessNodes: [node], layers: [[node path]], edges: [edge] }
//     node  = { path, type, pos, size, margin, padding, properties, ports: [port], labels: [label], nested: path|null }
//     port  = { path, side, pos, size, anchor, explicitAnchor, connectedToExternalNodes, margin, properties,
//               labels: [label], incoming: [edge path], outgoing: [edge path] }
//     edge  = { path, source, target, bendPoints: [[x, y]], labels: [label], properties }  (source/target: port paths)
//     label = { path, text, pos, size, properties }
//   size, pos, anchor, offset are [x, y]; margin, padding are [top, right, bottom, left]; all hex doubles.
//
// Groups (S1-S22 of unreached.md) and their rows; labels are listed with the shapes they record.
//   S1  site/lgraphutil/resizeNode/{free,fixed}-move-{none,ports,labels,both}: one node 40x30 (PORT_CONSTRAINTS FREE or
//       FIXED_POS), a port per side, six node labels; resizeNode(n1, (80, 60), movePorts, moveLabels). Labels: node (state with
//       NODE_SIZE_CONSTRAINTS), <port>.after, <label>.after (states).
//   S2  site/lgraphutil/coordinates/*: g0 (padding, offset) -> P (nested g1: padding, offset) -> Q (nested g2); A, B in g1, C in
//       g2; edges with bend points, one with junction points, labels. offsetGraph, offsetGraphs, isDescendant (booleans),
//       changeCoordSystem (points), actualSizeAndAnchors (getActualSize, getAbsoluteAnchor), borderToContentAreaCoordinates (4 flag
//       pairs), interactiveReferencePoint-{center,top-left} (getInteractiveReferencePoint of A and B).
//   S3  site/lgraphutil/layers/*: one layer; placeNodesHorizontally-{alignments,clamp-left,clamp-right,clamp-both} (node states
//       after), findMaxNonDummyNodeWidth (per DIRECTION, with and without margins).
//   S4  site/lgraphutil/graphProperties/{right,down,up,left,all-free,empty}: computeGraphProperties three times (fresh, again,
//       pre-filled set); recorded: g0 GRAPH_PROPERTIES and each node's PORT_CONSTRAINTS (getProperty).
//   S5  site/lgraphutil/ports/*: createPort-{free,merge-edges,hypernode}-no-endpoint (every direction x PortType),
//       createPort-with-endpoint-{sized,zero-size}, provideCollectorPort, initializePort-undefined-side-<direction>,
//       initializePort-undefined-side-explicit-anchor, initializePort-{zero-size,defined-side,border-offset-preset}; recorded: port states and GRAPH_PROPERTIES.
//   S6  site/lgraphutil/externalPorts/*: <side>-{implicit,explicit}-anchor-{negative,positive}-offset (FIXED_POS),
//       fixed-order-{index,no-index}-<side>, fixed-ratio-<side>, fixed-side-<side>, fixed-side-undefined,
//       free-<direction>-netflow-{positive,zero,negative}; recorded: dummy, dummyPort, holder states, position (the
//       returned point), dummy.moved.
//   S7  site/lgraphutil/other/{individualOrInherited,minimalModelOrder,direction}.
//   S8  site/spacings/{horizontal,vertical}-{nodes,node-types} (every filled cell of the precomputed tables, found by
//       reflection on the private arrays; node pairs plain/plain, individual/plain, plain/individual, individual/individual),
//       horizontal-elements (UnspecifiedSpacingException rows), individualOrDefault.
//   S9  site/tarjan/reversed-{none,2,2-4-8,0-1-2-...}, direct-visit; recorded per node TARJAN_ID, TARJAN_LOWLINK,
//       TARJAN_ON_STACK (suffix .reset .run .again .afterReset), edge IS_PART_OF_CYCLE, components, componentIds.
//   S10 site/lgraphAdapters/*: graph-adapter, graph-adapter-transparent, graph-adapter-filter-{all,normal,none}, node-adapters,
//       node-adapter-standalone, port-adapters-{plain,transparent}, label-and-edge-adapters, sortPortList, portComparator.
//       The graph is layered by steps (X4): layers L0, L1; N/S port dummy D (PORT_DUMMY), TOP/BOTTOM_COMMENTS.
//   S11 site/transform/externalPorts/*, S12 insideSelfLoops/*, S13 hierarchy/*, S14 misc/*: ELK JSON cases; steps
//       importGraph(target) as "graph", dumpLGraph as "lgraph", applyLayout, exportElk as "elk" => expected { graph:
//       "g0", lgraph, elk }. A case whose import throws (the exception is the label "graph"; no further step) records
//       only that. S14 also has steps-built rows (invalid-edge-no-source|target-{flat,hierarchical} on ELK objects built by steps,
//       apply-layout-without-origin) and target-offset (TARGET_OFFSET set on the first imported edge).
//   S15 site/transform/nonMutating/*: the non-throwing S11-S14 cases (and layered-<case>: the imported nodes of every LGraph
//       moved into one new layer per graph plus a LONG_EDGE dummy), curated-* (two curated models, see MODEL_TABLE),
//       lgraph-without-origins, target-offset; steps importGraph, applyLayoutNonMutating as "nm", exportElk(nm) as "elk".
//   S16 site/lnode/{setLayer,getPorts,edgeIterables,portSideView,getIndex,getGraph,isInlineEdgeLabel,strings}.
//   S17 site/ledge/{endpoints,reverse-{plain,adaptPorts}-collect-{none,input,output,both},reverse-unlinked,queries,strings}.
//   S18 site/lport/{setNode,setSide,edges,strings,absoluteAnchor}.
//   S19 site/strings/{lgraph,llabel,origin-identifiers-{root-id,empty-root-id},origin-set-by-steps,hierarchyAware} and
//       site/provider/{flat,include-children,cancelled,include-children-cancelled}: provider rows record the ELK JSON after
//       layout(...) (label "elk"); hierarchyAware records { classes, LayeredLayoutProvider, ElkLayered }.
//   S20 site/enums/<SimpleName>: 35 rows, the 32 option enums of org.eclipse.elk.alg.layered.options, LayeredPhases,
//       ComponentOrderingStrategy and NodeType (the brief's "35 option enums" counts these 35); label "enum" = enumInfo.
//   S21 site/layeredSpacings/targetFilter/{graph,node,edge,port,label,layer,plain}: optionTargetFilter over one option id
//       per distinct target set of the registered options (the smallest id) plus InternalProperties.ORIGIN (no option data).
//   S22 site/nodeFlexibility/{none,port-position,node-size-where-space-permits,node-size,graph-without-default}.
//   The U list (unreached.md) and the X factory arms get no rows. Group coverage, the cross-check printed at the end of
//   the run: every group has at least one row, every row belongs to a group, rowCounts sums to rows.length.
//
// Round trip and stability: for every row with an input (1) the prepared ELK graph is exported to input, (2) input is
//   re-imported with ElkGraphJson.forGraph(String).toElk() and the steps (re-read from their serialised JSON, so a replay
//   sees exactly what the file holds) run on it: that outcome is the recorded expected, (3) the steps also run on a freshly
//   prepared original and the row fails if its outcome differs byte for byte. The whole row is built twice from scratch
//   and the two serialisations must be byte-identical. The output must stay under 5 MB (L3).
//
// Code copied from tools/vectors/LayeredFrameworkVectors.java (single-file launchers cannot share code): lines 636-871 (the LGraph Dump
//   class, pair/quad/margin/single), lines 873-1020 (the C4 Encoder and its helpers; adapted: an optional `namer` hook
//   names an element on first encounter), lines 1139-1212 (Raw, json, write, hex, str; adapted: hex throws Bug on NaN).
//   Everything else is new. The program embeds no ELK implementation.
//
// Curated models (S15): the cache salt covers this source, not the two model files read, so their SHA-256 is pinned in
//   MODEL_TABLE below and tools/vectors/layered-site-vectors.sh checks the same lines before every run (warm or cold).
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.stream.Stream;
import org.eclipse.elk.alg.layered.ElkLayered;
import org.eclipse.elk.alg.layered.IHierarchyAwareLayoutProcessor;
import org.eclipse.elk.alg.layered.LayeredLayoutProvider;
import org.eclipse.elk.alg.layered.graph.LEdge;
import org.eclipse.elk.alg.layered.graph.LGraph;
import org.eclipse.elk.alg.layered.graph.LGraphAdapters;
import org.eclipse.elk.alg.layered.graph.LGraphElement;
import org.eclipse.elk.alg.layered.graph.LGraphUtil;
import org.eclipse.elk.alg.layered.graph.LLabel;
import org.eclipse.elk.alg.layered.graph.LNode;
import org.eclipse.elk.alg.layered.graph.LPort;
import org.eclipse.elk.alg.layered.graph.LShape;
import org.eclipse.elk.alg.layered.graph.Layer;
import org.eclipse.elk.alg.layered.graph.Tarjan;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphLayoutTransferrer;
import org.eclipse.elk.alg.layered.graph.transform.ElkGraphTransformer;
import org.eclipse.elk.alg.layered.options.InternalProperties;
import org.eclipse.elk.alg.layered.options.LayeredMetaDataProvider;
import org.eclipse.elk.alg.layered.options.LayeredOptions;
import org.eclipse.elk.alg.layered.options.LayeredSpacings;
import org.eclipse.elk.alg.layered.options.NodeFlexibility;
import org.eclipse.elk.alg.layered.options.Spacings;
import org.eclipse.elk.core.data.LayoutMetaDataService;
import org.eclipse.elk.core.data.LayoutOptionData;
import org.eclipse.elk.core.labels.LabelManagementOptions;
import org.eclipse.elk.core.math.ElkMargin;
import org.eclipse.elk.core.math.ElkPadding;
import org.eclipse.elk.core.math.KVector;
import org.eclipse.elk.core.math.KVectorChain;
import org.eclipse.elk.core.math.Spacing;
import org.eclipse.elk.core.options.CoreOptions;
import org.eclipse.elk.core.options.Direction;
import org.eclipse.elk.core.options.LabelSide;
import org.eclipse.elk.core.options.PortConstraints;
import org.eclipse.elk.core.options.PortSide;
import org.eclipse.elk.core.util.BasicProgressMonitor;
import org.eclipse.elk.core.util.IndividualSpacings;
import org.eclipse.elk.core.util.adapters.GraphAdapters.EdgeAdapter;
import org.eclipse.elk.core.util.adapters.GraphAdapters.GraphAdapter;
import org.eclipse.elk.core.util.adapters.GraphAdapters.GraphElementAdapter;
import org.eclipse.elk.core.util.adapters.GraphAdapters.LabelAdapter;
import org.eclipse.elk.core.util.adapters.GraphAdapters.NodeAdapter;
import org.eclipse.elk.core.util.adapters.GraphAdapters.PortAdapter;
import org.eclipse.elk.graph.ElkBendPoint;
import org.eclipse.elk.graph.ElkConnectableShape;
import org.eclipse.elk.graph.ElkEdge;
import org.eclipse.elk.graph.ElkEdgeSection;
import org.eclipse.elk.graph.ElkGraphElement;
import org.eclipse.elk.graph.ElkLabel;
import org.eclipse.elk.graph.ElkNode;
import org.eclipse.elk.graph.ElkPort;
import org.eclipse.elk.graph.json.ElkGraphJson;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.IPropertyHolder;
import org.eclipse.elk.graph.properties.MapPropertyHolder;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.text.ElkGraphStandaloneSetup;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.elk.core.util.IElkProgressMonitor;

public class LayeredSiteVectors {
    static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    static final String OUTPUT = "layered-sites.json";
    static final String SEED_PROPERTY = "org.eclipse.elk.graph.json.exportSeed";
    static final String REPO_PREFIX = "repo:";
    static final int MAX_DEPTH = 8;
    static final String ELK_ROOT = "elk", FIRST_GRAPH = "g0", AUTO = "x/";
    static final String NO_SUCH_CONSTANT = "NO_SUCH_CONSTANT";
    static final String HASH_MARK = "@<hash>";
    static final long MAX_BYTES = 5L * 1024 * 1024;

    // SHA-256 of every curated model read (group S15), "<sha256>  repo:<path under the repo root>". Keep these lines:
    // the shell script parses them.
    static final String MODEL_TABLE = """
9e2fc4996c51a290ea1bf387e6611005e557ca39dc1cdc7e57c92c2adc029ad0  repo:test/corpus/elkt-curated/tests/layered/port_label_placement/inside_compound_nodes_01.elkt
fdf40c543b7543ce9711e3b62dfb87ac198ea223eb3a381b047e83491a6b02dd  repo:test/corpus/elkt-curated/tickets/layered/273_insideSelfLoopsWithLabels.elkt
""";

    // ------------------------------------------------------------------------------------------------------------
    // JSON helpers

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
            throw new IllegalStateException("unwritable value of class " + v.getClass().getName());
        }
    }

    static String hex(double d) {
        if (Double.isNaN(d)) {
            throw new Bug("NaN in a recorded value");
        }
        return String.format("%016x", Double.doubleToRawLongBits(d));
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
    // ------------------------------------------------------------------------------------------------------------
    // LGraph dump

    static final class Dump {
        final Map<Object, String> paths = new IdentityHashMap<>();
        final List<LGraph> graphs = new ArrayList<>();
        final Map<LGraph, List<LNode>> nodeLists = new IdentityHashMap<>();
        final Map<LGraph, List<LEdge>> edgeLists = new IdentityHashMap<>();
        final Encoder enc;

        Dump(LGraph root, boolean elkIds) {
            enc = new Encoder(paths, elkIds, false);
            register(root);
            for (LGraph g : new ArrayList<>(graphs)) {
                registerEdges(g);
            }
        }

        private void register(LGraph g) {
            String gp = "g" + graphs.size();
            graphs.add(g);
            paths.put(g, gp);
            List<LNode> nodes = new ArrayList<>(g.getLayerlessNodes());
            Set<LNode> seen = Collections.newSetFromMap(new IdentityHashMap<>());
            seen.addAll(nodes);
            for (Layer layer : g.getLayers()) {
                paths.put(layer, gp + "/layer" + layer.getIndex());
                for (LNode n : layer.getNodes()) {
                    if (seen.add(n)) {
                        nodes.add(n);
                    }
                }
            }
            nodeLists.put(g, nodes);
            for (int i = 0; i < nodes.size(); i++) {
                LNode n = nodes.get(i);
                String np = gp + "/n" + i;
                paths.put(n, np);
                labelPaths(n.getLabels(), np);
                for (int j = 0; j < n.getPorts().size(); j++) {
                    LPort p = n.getPorts().get(j);
                    paths.put(p, np + "/p" + j);
                    labelPaths(p.getLabels(), np + "/p" + j);
                }
                if (n.getNestedGraph() != null) {
                    register(n.getNestedGraph());
                }
            }
        }

        private void labelPaths(List<LLabel> labels, String owner) {
            for (int i = 0; i < labels.size(); i++) {
                paths.put(labels.get(i), owner + "/l" + i);
            }
        }

        private void registerEdges(LGraph g) {
            List<LEdge> edges = new ArrayList<>();
            edgeLists.put(g, edges);
            String gp = paths.get(g);
            for (LNode n : nodeLists.get(g)) {
                for (LPort p : n.getPorts()) {
                    for (List<LEdge> list : List.of(p.getOutgoingEdges(), p.getIncomingEdges())) {
                        for (LEdge e : list) {
                            if (!paths.containsKey(e)) {
                                String ep = gp + "/e" + edges.size();
                                paths.put(e, ep);
                                edges.add(e);
                                labelPaths(e.getLabels(), ep);
                            }
                        }
                    }
                }
            }
        }

        Object dump() {
            List<Object> gs = new ArrayList<>();
            for (LGraph g : graphs) {
                gs.add(graph(g));
            }
            return single("graphs", gs);
        }

        private Object graph(LGraph g) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(g));
            m.put("size", pair(g.getSize()));
            m.put("padding", quad(g.getPadding().top, g.getPadding().right, g.getPadding().bottom, g.getPadding().left));
            m.put("offset", pair(g.getOffset()));
            m.put("properties", properties(g));
            List<Object> layerless = new ArrayList<>();
            for (LNode n : g.getLayerlessNodes()) {
                layerless.add(node(n));
            }
            m.put("layerlessNodes", layerless);
            List<Object> layers = new ArrayList<>();
            for (Layer layer : g.getLayers()) {
                List<Object> inLayer = new ArrayList<>();
                layer.getNodes().forEach(n -> inLayer.add(paths.get(n)));
                layers.add(inLayer);
            }
            m.put("layers", layers);
            List<Object> edges = new ArrayList<>();
            for (LEdge e : edgeLists.get(g)) {
                edges.add(edge(e));
            }
            m.put("edges", edges);
            return m;
        }

        private Object node(LNode n) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(n));
            m.put("type", n.getType().name());
            m.put("pos", pair(n.getPosition()));
            m.put("size", pair(n.getSize()));
            m.put("margin", margin(n.getMargin()));
            m.put("padding", quad(n.getPadding().top, n.getPadding().right, n.getPadding().bottom, n.getPadding().left));
            m.put("properties", properties(n));
            List<Object> ports = new ArrayList<>();
            n.getPorts().forEach(p -> ports.add(port(p)));
            m.put("ports", ports);
            m.put("labels", labels(n.getLabels()));
            m.put("nested", n.getNestedGraph() == null ? null : paths.get(n.getNestedGraph()));
            return m;
        }

        private Object port(LPort p) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(p));
            m.put("side", p.getSide().name());
            m.put("pos", pair(p.getPosition()));
            m.put("size", pair(p.getSize()));
            m.put("anchor", pair(p.getAnchor()));
            m.put("explicitAnchor", p.isExplicitlySuppliedPortAnchor());
            m.put("connectedToExternalNodes", p.isConnectedToExternalNodes());
            m.put("margin", margin(p.getMargin()));
            m.put("properties", properties(p));
            m.put("labels", labels(p.getLabels()));
            m.put("incoming", edgePaths(p.getIncomingEdges()));
            m.put("outgoing", edgePaths(p.getOutgoingEdges()));
            return m;
        }

        private List<Object> edgePaths(List<LEdge> edges) {
            List<Object> l = new ArrayList<>();
            edges.forEach(e -> l.add(paths.get(e)));
            return l;
        }

        private Object edge(LEdge e) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(e));
            m.put("source", e.getSource() == null ? null : paths.get(e.getSource()));
            m.put("target", e.getTarget() == null ? null : paths.get(e.getTarget()));
            List<Object> bends = new ArrayList<>();
            e.getBendPoints().forEach(b -> bends.add(pair(b)));
            m.put("bendPoints", bends);
            m.put("labels", labels(e.getLabels()));
            m.put("properties", properties(e));
            return m;
        }

        private List<Object> labels(List<LLabel> labels) {
            List<Object> l = new ArrayList<>();
            for (LLabel label : labels) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("path", paths.get(label));
                m.put("text", label.getText());
                m.put("pos", pair(label.getPosition()));
                m.put("size", pair(label.getSize()));
                m.put("properties", properties(label));
                l.add(m);
            }
            return l;
        }

        private Map<String, Object> properties(LGraphElement e) {
            Map<String, Object> m = new TreeMap<>();
            for (Map.Entry<IProperty<?>, Object> entry : e.getAllProperties().entrySet()) {
                m.put(entry.getKey().getId(), enc.encode(entry.getValue(), 0));
            }
            return m;
        }

        Object adapterNode(LNode n) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("path", paths.get(n));
            m.put("size", pair(n.getSize()));
            m.put("margin", margin(n.getMargin()));
            m.put("padding", quad(n.getPadding().top, n.getPadding().right, n.getPadding().bottom, n.getPadding().left));
            List<Object> ports = new ArrayList<>();
            for (LPort p : n.getPorts()) {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("path", paths.get(p));
                pm.put("pos", pair(p.getPosition()));
                pm.put("size", pair(p.getSize()));
                pm.put("labels", geometries(p.getLabels()));
                ports.add(pm);
            }
            m.put("ports", ports);
            m.put("labels", geometries(n.getLabels()));
            return m;
        }

        private List<Object> geometries(List<LLabel> labels) {
            List<Object> l = new ArrayList<>();
            for (LLabel label : labels) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("path", paths.get(label));
                m.put("pos", pair(label.getPosition()));
                m.put("size", pair(label.getSize()));
                l.add(m);
            }
            return l;
        }
    }

    static List<Object> pair(KVector v) {
        return List.of(hex(v.x), hex(v.y));
    }

    static List<Object> quad(double top, double right, double bottom, double left) {
        return List.of(hex(top), hex(right), hex(bottom), hex(left));
    }

    static List<Object> margin(ElkMargin m) {
        return quad(m.top, m.right, m.bottom, m.left);
    }

    static Map<String, Object> single(String key, Object value) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(key, value);
        return m;
    }
    // ------------------------------------------------------------------------------------------------------------
    // C4 value encoding (MetaDataVectors' table) extended with element references

    static final class Encoder {
        final Map<Object, String> paths;
        final boolean elkIds, strict;
        Function<Object, String> namer; // site recorder: names an element on first encounter (null: paths only)

        Encoder(Map<Object, String> paths, boolean elkIds, boolean strict) {
            this.paths = paths;
            this.elkIds = elkIds;
            this.strict = strict;
        }

        Object encode(Object v, int depth) {
            if (v == null) {
                return null;
            }
            if (depth > MAX_DEPTH) {
                return unencodable(v);
            }
            if (v instanceof LGraphElement e) {
                String p = namer == null ? paths.get(e) : namer.apply(e);
                return p == null ? unencodable(v) : single("ref", p);
            }
            if (v instanceof ElkGraphElement e) {
                return single("elk", elkIds ? e.getIdentifier() : null);
            }
            if (v instanceof Boolean) {
                return scalar("bool", v);
            } else if (v instanceof Integer) {
                return scalar("int", v);
            } else if (v instanceof String) {
                return scalar("string", v);
            } else if (v instanceof Double || v instanceof Float) {
                return scalar("double", Double.toString(((Number) v).doubleValue()));
            }
            return composite(v, depth);
        }

        private Object composite(Object v, int depth) {
            if (v instanceof Enum<?> e) {
                Map<String, Object> m = tagged("enum", typeName(e.getDeclaringClass()));
                m.put("n", e.name());
                return m;
            } else if (v instanceof EnumSet<?> s) {
                Map<String, Object> m = tagged("set", typeName(enumSetElementClass(s)));
                m.put("items", names(s));
                return m;
            } else if (v instanceof Collection<?> c) {
                return collection(c, depth);
            } else if (v instanceof Class<?> k) {
                return tagged("class", k.getSimpleName());
            }
            return object(v, depth);
        }

        private Object collection(Collection<?> c, int depth) {
            boolean refs = !c.isEmpty()
                    && c.stream().allMatch(x -> x instanceof LGraphElement || x instanceof ElkGraphElement);
            boolean list = c instanceof List;
            if (refs || (c.isEmpty() && !list)) {
                List<Object> items = new ArrayList<>();
                c.forEach(i -> items.add(encode(i, depth + 1)));
                if (!list) {
                    items.sort(Comparator.comparing(LayeredSiteVectors::json));
                }
                return items;
            }
            if (list) {
                Map<String, Object> m = tagged("list", c.getClass().getSimpleName());
                List<Object> items = new ArrayList<>();
                c.forEach(i -> items.add(encode(i, depth + 1)));
                m.put("items", items);
                return m;
            }
            return unencodable(c);
        }

        private Object object(Object v, int depth) {
            Class<?> k = v.getClass();
            if (k.isAnonymousClass() || k.isArray() || v instanceof Number || v instanceof Map || v instanceof Set
                    || v instanceof Character || (!strict && !k.getName().startsWith("org.eclipse.elk."))) {
                return unencodable(v);
            }
            Map<String, Object> m = tagged("obj", k.getSimpleName());
            Map<String, Object> fields = new LinkedHashMap<>();
            try {
                LinkedList<Class<?>> chain = new LinkedList<>();
                for (Class<?> c = k; c != null && c != Object.class; c = c.getSuperclass()) {
                    chain.addFirst(c);
                }
                for (Class<?> c : chain) {
                    for (Field f : c.getDeclaredFields()) {
                        if (!Modifier.isStatic(f.getModifiers()) && !f.isSynthetic()) {
                            f.setAccessible(true);
                            fields.put(f.getName(), encode(f.get(v), depth + 1));
                        }
                    }
                }
            } catch (ReflectiveOperationException | RuntimeException e) {
                if (strict) {
                    throw new IllegalStateException("unencodable value of class " + k.getName(), e);
                }
                return unencodable(v);
            }
            m.put("fields", fields);
            return m;
        }

        private Object unencodable(Object v) {
            if (strict) {
                throw new IllegalStateException("unencodable value of class " + v.getClass().getName());
            }
            return single("class", v.getClass().getName());
        }
    }

    static List<Object> names(Collection<? extends Enum<?>> values) {
        List<Object> result = new ArrayList<>();
        for (Enum<?> e : values) {
            result.add(e.name());
        }
        return result;
    }

    static Map<String, Object> scalar(String type, Object value) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", type);
        m.put("v", value);
        return m;
    }

    static Map<String, Object> tagged(String type, String className) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", type);
        m.put("c", className);
        return m;
    }

    static String typeName(Class<?> k) {
        return k.getEnclosingClass() == null ? k.getSimpleName() : typeName(k.getEnclosingClass()) + "." + k.getSimpleName();
    }

    // An empty EnumSet cannot name its element class; its complement is the full set, which can.
    static Class<?> enumSetElementClass(EnumSet<?> s) {
        EnumSet<?> source = s.isEmpty() ? EnumSet.complementOf(s) : s;
        return source.iterator().next().getDeclaringClass();
    }
    // ------------------------------------------------------------------------------------------------------------
    // Steps

    /** A scenario or interpreter bug: stops the recording; never recorded as a row's expected exception. */
    static final class Bug extends RuntimeException {
        Bug(String message) {
            super(message);
        }
    }

    /** A non-element result that gets a name (the step's label when it has none). */
    record Handle(Object target) { }

    record Step(String op, String on, List<Object> args, String as) {
        Map<String, Object> json() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("op", op);
            m.put("on", on);
            m.put("args", args);
            if (as != null) {
                m.put("as", as);
            }
            return m;
        }
    }

    /** Scenario author's step list; Double arguments become 16-hex raw bits, nested lists and maps likewise. */
    static final class B {
        final List<Step> steps = new ArrayList<>();

        /** A command: no label (it must not throw). */
        B c(String op, String on, Object... args) {
            steps.add(new Step(op, on, norm(Arrays.asList(args)), null));
            return this;
        }

        /** A query or creation: its result is recorded under the label (and names a new element). */
        B q(String as, String op, String on, Object... args) {
            steps.add(new Step(op, on, norm(Arrays.asList(args)), as));
            return this;
        }

        /** Creation of a named element: new<Class> with the name as label. */
        B mk(String name, String op, Object... args) {
            return q(name, op, null, args);
        }

        B all(B other) {
            steps.addAll(other.steps);
            return this;
        }

        /** A layerless node of the graph with a size. */
        B node(String name, String graph, double w, double h) {
            return mk(name, "newLNode", graph).c("layerlessAdd", graph, name).c("setSize", name, w, h);
        }

        /** A port of a node: size, position, then side (the side computes the default anchor from the size). */
        B port(String name, String node, String side, double x, double y, double w, double h) {
            return mk(name, "newLPort").c("setSize", name, w, h).c("setPosition", name, x, y).c("setNode", name, node)
                    .c("setSide", name, side);
        }

        /** A label of a node, port or edge with a position and a size. */
        B label(String name, String owner, String text, double x, double y, double w, double h) {
            return mk(name, "newLLabel", text).c("labelsAdd", owner, name).c("setPosition", name, x, y)
                    .c("setSize", name, w, h);
        }

        B edge(String name, String source, String target) {
            return mk(name, "newLEdge").c("setSource", name, source).c("setTarget", name, target);
        }

        B prop(String on, String id, Object c4) {
            return c("setProperty", on, id, c4);
        }

    }

    static List<Object> norm(List<?> in) {
        List<Object> out = new ArrayList<>();
        for (Object o : in) {
            out.add(normOne(o));
        }
        return out;
    }

    static Object normOne(Object o) {
        if (o instanceof Double d) {
            return hex(d);
        } else if (o instanceof List<?> l) {
            return norm(l);
        } else if (o instanceof Map<?, ?> m) {
            Map<String, Object> r = new LinkedHashMap<>();
            m.forEach((k, v) -> r.put((String) k, normOne(v)));
            return r;
        } else if (o instanceof Long || o instanceof Short || o instanceof Byte) {
            return ((Number) o).intValue();
        }
        return o;
    }

    static Object fromJson(JsonElement e) {
        if (e == null || e.isJsonNull()) {
            return null;
        } else if (e.isJsonPrimitive()) {
            JsonPrimitive p = e.getAsJsonPrimitive();
            if (p.isBoolean()) {
                return p.getAsBoolean();
            }
            return p.isNumber() ? (Object) p.getAsInt() : p.getAsString();
        } else if (e.isJsonArray()) {
            List<Object> l = new ArrayList<>();
            for (JsonElement x : e.getAsJsonArray()) {
                l.add(fromJson(x));
            }
            return l;
        }
        Map<String, Object> m = new LinkedHashMap<>();
        for (Map.Entry<String, JsonElement> x : e.getAsJsonObject().entrySet()) {
            m.put(x.getKey(), fromJson(x.getValue()));
        }
        return m;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Context: names

    static final String[] KINDS = {"g", "n", "p", "e", "l", "layer", "o"};

    static final class Ctx {
        final Map<String, Object> names = new LinkedHashMap<>();
        final Map<Object, String> paths = new IdentityHashMap<>();
        final Map<String, Integer> counters = new HashMap<>();
        final Encoder enc = new Encoder(paths, true, false);

        Ctx() {
            enc.namer = this::pathOf;
        }

        String bind(Object o, String name) {
            Object taken = names.get(name);
            if (taken != null && taken != o) {
                throw new Bug("name " + name + " is already bound");
            }
            String had = paths.get(o);
            if (had != null && !had.equals(name)) {
                throw new Bug("object already named " + had + ", cannot rename to " + name);
            }
            names.put(name, o);
            paths.put(o, name);
            return name;
        }

        void bindAll(Map<Object, String> dumped) {
            dumped.forEach(this::bind);
        }

        Object get(String name) {
            Object o = names.get(name);
            if (o == null) {
                throw new Bug("unknown name " + name);
            }
            return o;
        }

        <T> T as(Class<T> k, Object o, String what) {
            if (o != null && !k.isInstance(o)) {
                throw new Bug(what + " is a " + o.getClass().getName() + ", not a " + k.getSimpleName());
            }
            return k.cast(o);
        }

        static String kindOf(Object o) {
            if (o instanceof LGraph) {
                return "g";
            } else if (o instanceof LNode) {
                return "n";
            } else if (o instanceof LPort) {
                return "p";
            } else if (o instanceof LEdge) {
                return "e";
            } else if (o instanceof LLabel) {
                return "l";
            }
            return o instanceof Layer ? "layer" : "o";
        }

        /** The name of o; an object met for the first time is named x/<kind><k>, k counting the auto names of the kind. */
        String pathOf(Object o) {
            String p = paths.get(o);
            if (p != null) {
                return p;
            }
            String kind = kindOf(o);
            String name;
            do {
                int k = counters.merge(kind, 1, Integer::sum) - 1;
                name = AUTO + kind + k;
            } while (names.containsKey(name));
            return bind(o, name);
        }

        /** The result of a step: a Handle, or the element a new<Class> op returns, is named by the step's label (an alias when it already has a name). */
        Object result(String op, Object v, String as) {
            Object target = v instanceof Handle h ? h.target : v;
            boolean nameable = v instanceof Handle || (v instanceof LGraphElement && op.startsWith("new"));
            if (nameable && target != null && as != null) {
                if (!paths.containsKey(target)) {
                    bind(target, as);
                } else if (names.putIfAbsent(as, target) != null && names.get(as) != target) {
                    throw new Bug("name " + as + " is already bound");
                }
            }
            return value(v);
        }

        Object value(Object v) {
            if (v == null || v instanceof Boolean || v instanceof Integer || v instanceof String || v instanceof Raw
                    || v instanceof Long) {
                return v;
            } else if (v instanceof Double d) {
                return hex(d);
            } else if (v instanceof Enum<?> e) {
                return e.name();
            } else if (v instanceof Handle h) {
                return refOf(h.target);
            } else if (v instanceof LGraphElement) {
                return refOf(v);
            } else if (v instanceof KVector k) {
                return pair(k);
            } else if (v instanceof Spacing s) {
                return quad(s.top, s.right, s.bottom, s.left);
            } else if (v instanceof Map<?, ?> m) {
                Map<String, Object> r = new LinkedHashMap<>();
                m.forEach((k, x) -> r.put((String) k, value(x)));
                return r;
            } else if (v instanceof Iterable<?> it) {
                List<Object> r = new ArrayList<>();
                it.forEach(x -> r.add(value(x)));
                return r;
            } else if (v instanceof Object[] arr) {
                List<Object> r = new ArrayList<>();
                for (Object x : arr) {
                    r.add(value(x));
                }
                return r;
            }
            return refOf(v);
        }

        Object refOf(Object o) {
            if (o == null) {
                return null;
            }
            if (isAdapter(o)) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("adapter", pathOf(o));
                m.put("of", pathOf(adapted(o)));
                return m;
            }
            return pathOf(o);
        }

        // ---- property values ----

        Object decode(Object v) {
            if (v == null) {
                return null;
            }
            if (v instanceof List<?> l) {
                List<Object> r = new ArrayList<>();
                l.forEach(x -> r.add(decode(x)));
                return r;
            }
            Map<?, ?> m = (Map<?, ?>) v;
            if (m.containsKey("ref")) {
                return get((String) m.get("ref"));
            }
            String t = (String) m.get("t");
            switch (t) {
                case "bool", "int", "string":
                    return m.get("v");
                case "double":
                    return Double.valueOf((String) m.get("v"));
                case "enum":
                    return enumConstant((String) m.get("c"), (String) m.get("n"));
                case "set":
                    return enumSet((String) m.get("c"), (List<?>) m.get("items"));
                case "chain":
                    KVectorChain chain = new KVectorChain();
                    for (Object p : (List<?>) m.get("v")) {
                        chain.add(vector(p));
                    }
                    return chain;
                case "vector":
                    return vector(m.get("v"));
                case "individualSpacings":
                    IndividualSpacings spacings = new IndividualSpacings();
                    ((Map<?, ?>) m.get("v")).forEach((id, x) -> setProperty(spacings, (String) id, decode(x)));
                    return spacings;
                default:
                    throw new Bug("unknown value type " + t);
            }
        }

        @SuppressWarnings({"unchecked", "rawtypes"})
        Object enumSet(String typeName, List<?> items) {
            Class<?> k = enumClass(typeName);
            EnumSet set = EnumSet.noneOf((Class) k);
            for (Object n : items) {
                set.add(Enum.valueOf((Class) k, (String) n));
            }
            return set;
        }
    }

    static boolean isAdapter(Object o) {
        return o.getClass().getName().startsWith("org.eclipse.elk.alg.layered.graph.LGraphAdapters$")
                && !(o instanceof Comparator);
    }

    static Object adapted(Object adapter) {
        for (Class<?> k = adapter.getClass(); k != null; k = k.getSuperclass()) {
            try {
                Field f = k.getDeclaredField("element");
                f.setAccessible(true);
                return f.get(adapter);
            } catch (NoSuchFieldException e) {
                continue;
            } catch (IllegalAccessException e) {
                throw new Bug("cannot read the adapted element: " + e);
            }
        }
        throw new Bug("no element field on " + adapter.getClass().getName());
    }

    static KVector vector(Object pair) {
        List<?> l = (List<?>) pair;
        return new KVector(unhex((String) l.get(0)), unhex((String) l.get(1)));
    }

    static double unhex(String h) {
        return Double.longBitsToDouble(Long.parseUnsignedLong(h, 16));
    }

    // ------------------------------------------------------------------------------------------------------------
    // Classes, enums and properties known by name

    static final Map<String, Class<?>> ENUM_TYPES = new TreeMap<>();
    static final Map<String, IProperty<?>> PROPS = new TreeMap<>();

    static Class<?> enumClass(String typeName) {
        Class<?> k = ENUM_TYPES.get(typeName);
        if (k == null) {
            throw new Bug("unknown enum type " + typeName);
        }
        return k;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static Object enumConstant(String typeName, String name) {
        return Enum.valueOf((Class) enumClass(typeName), name);
    }

    static IProperty<?> property(String id) {
        IProperty<?> p = PROPS.get(id);
        if (p == null) {
            throw new Bug("unknown property " + id);
        }
        return p;
    }

    @SuppressWarnings("unchecked")
    static void setProperty(IPropertyHolder holder, String id, Object value) {
        holder.setProperty((IProperty<Object>) property(id), value);
    }

    static void discoverProperties() {
        for (Class<?> k : List.of(CoreOptions.class, LayeredOptions.class, InternalProperties.class,
                LabelManagementOptions.class, LabelSide.class,
                org.eclipse.elk.alg.layered.intermediate.LabelDummySwitcher.class)) {
            for (Field f : k.getFields()) {
                if (Modifier.isStatic(f.getModifiers()) && IProperty.class.isAssignableFrom(f.getType())) {
                    try {
                        IProperty<?> p = (IProperty<?>) f.get(null);
                        PROPS.putIfAbsent(p.getId(), p); // equal ids are equal properties (Property.equals)
                    } catch (IllegalAccessException e) {
                        throw new Bug("cannot read " + f);
                    }
                }
            }
        }
    }

    /** Binary names of every class in the jar holding anchor whose entry path starts with the prefix, sorted. */
    static List<String> classNames(Class<?> anchor, String prefix) throws IOException, URISyntaxException {
        Path jar = Path.of(anchor.getProtectionDomain().getCodeSource().getLocation().toURI());
        List<String> names = new ArrayList<>();
        try (JarFile jf = new JarFile(jar.toFile())) {
            for (JarEntry e : Collections.list(jf.entries())) {
                String n = e.getName();
                if (n.endsWith(".class") && n.startsWith(prefix) && !n.contains("module-info")) {
                    names.add(n.substring(0, n.length() - ".class".length()).replace('/', '.'));
                }
            }
        }
        Collections.sort(names);
        return names;
    }

    static Class<?> load(String binaryName) throws ClassNotFoundException {
        return Class.forName(binaryName, false, LayeredSiteVectors.class.getClassLoader());
    }

    static void discoverEnums() throws Exception {
        List<String> names = new ArrayList<>(classNames(LayeredOptions.class, "org/eclipse/elk/alg/layered/"));
        names.addAll(classNames(CoreOptions.class, "org/eclipse/elk/core/options/"));
        for (String n : names) {
            Class<?> k = load(n);
            if (k.isEnum()) {
                ENUM_TYPES.putIfAbsent(typeName(k), k);
            }
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Arguments, the op table and the interpreter loop

    interface Op {
        Object run(Args a) throws Exception;
    }

    static final Map<String, Op> OPS = new LinkedHashMap<>();

    static void op(String name, Op o) {
        if (OPS.put(name, o) != null) {
            throw new IllegalStateException("duplicate op " + name);
        }
    }

    static final class Args {
        final Ctx c;
        final String on;
        final List<Object> v;

        Args(Ctx c, String on, List<Object> v) {
            this.c = c;
            this.on = on;
            this.v = v;
        }

        Object raw(int i) {
            if (i >= v.size()) {
                throw new Bug("missing argument " + i);
            }
            return v.get(i);
        }

        boolean isNull(int i) {
            return i >= v.size() || v.get(i) == null;
        }

        String s(int i) {
            return (String) raw(i);
        }

        int i(int i) {
            return (Integer) raw(i);
        }

        boolean b(int i) {
            return (Boolean) raw(i);
        }

        double d(int i) {
            return unhex(s(i));
        }

        KVector vec(int i) {
            return isNull(i) ? null : vector(raw(i));
        }

        <T> T ref(int i, Class<T> k) {
            return isNull(i) ? null : c.as(k, c.get(s(i)), "argument " + i);
        }

        LGraph g(int i) {
            return ref(i, LGraph.class);
        }

        LNode n(int i) {
            return ref(i, LNode.class);
        }

        LPort p(int i) {
            return ref(i, LPort.class);
        }

        LEdge e(int i) {
            return ref(i, LEdge.class);
        }

        LLabel l(int i) {
            return ref(i, LLabel.class);
        }

        Layer y(int i) {
            return ref(i, Layer.class);
        }

        Object on() {
            if (on == null) {
                throw new Bug("step has no receiver");
            }
            return c.get(on);
        }

        <T> T on(Class<T> k) {
            return c.as(k, on(), "receiver " + on);
        }

        LGraph onG() {
            return on(LGraph.class);
        }

        LNode onN() {
            return on(LNode.class);
        }

        LPort onP() {
            return on(LPort.class);
        }

        LEdge onE() {
            return on(LEdge.class);
        }

        LLabel onL() {
            return on(LLabel.class);
        }

        Layer onY() {
            return on(Layer.class);
        }

        List<Object> list(int i) {
            @SuppressWarnings("unchecked")
            List<Object> l = (List<Object>) raw(i);
            return l;
        }

        List<LNode> nodes(int i) {
            List<LNode> r = new ArrayList<>();
            list(i).forEach(x -> r.add(c.as(LNode.class, c.get((String) x), "node list item")));
            return r;
        }

        List<LEdge> edges(int i) {
            List<LEdge> r = new ArrayList<>();
            list(i).forEach(x -> r.add(c.as(LEdge.class, c.get((String) x), "edge list item")));
            return r;
        }

        PortSide side(int i) {
            return isNull(i) ? null : PortSide.valueOf(s(i));
        }

        org.eclipse.elk.alg.layered.options.PortType type(int i) {
            return isNull(i) ? null : org.eclipse.elk.alg.layered.options.PortType.valueOf(s(i));
        }

        Direction direction(int i) {
            return Direction.valueOf(s(i));
        }

        PortConstraints constraints(int i) {
            return PortConstraints.valueOf(s(i));
        }

        LNode.NodeType nodeType(int i) {
            return LNode.NodeType.valueOf(s(i));
        }

        IProperty<?> prop(int i) {
            return property(s(i));
        }
    }

    /** Records an exception thrown by ELK or the JDK as {class, message}; the message's object hashes are masked. */
    static Map<String, Object> exceptionOf(Throwable t) {
        Throwable e = t;
        while ((e instanceof InvocationTargetException || e instanceof java.lang.reflect.UndeclaredThrowableException)
                && e.getCause() != null) {
            e = e.getCause();
        }
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("class", e.getClass().getSimpleName());
        x.put("message", e.getMessage() == null ? null : e.getMessage().replaceAll("@[0-9a-f]{3,}", HASH_MARK));
        return single("exception", x);
    }

    /**
     * Runs the (parsed) steps on a context that starts from the ELK root (named "elk"), or from a new LGraph named
     * g0 when elk is null; returns the label -> value map.
     */
    static Map<String, Object> run(ElkNode elk, List<Object> steps, String rowId) {
        Ctx c = new Ctx();
        if (elk == null) {
            c.bind(new LGraph(), FIRST_GRAPH);
        } else {
            c.bind(elk, ELK_ROOT);
        }
        Map<String, Object> expected = new LinkedHashMap<>();
        for (Object o : steps) {
            Map<?, ?> m = (Map<?, ?>) o;
            String name = (String) m.get("op"), on = (String) m.get("on"), as = (String) m.get("as");
            @SuppressWarnings("unchecked")
            List<Object> args = (List<Object>) m.get("args");
            Op op = OPS.get(name);
            if (op == null) {
                throw new Bug(rowId + ": unknown op " + name);
            }
            if (name.startsWith("new") && as == null) {
                throw new Bug(rowId + ": " + name + " needs a label (it names the element)");
            }
            Object value;
            try {
                value = c.result(name, op.run(new Args(c, on, args)), as);
            } catch (Bug b) {
                throw new Bug(rowId + " step " + name + " on " + on + ": " + b.getMessage());
            } catch (Exception | StackOverflowError e) {
                if (as == null) {
                    throw new Bug(rowId + ": step " + name + " on " + on + " threw " + e + " but has no label");
                }
                value = exceptionOf(e);
                if (System.getProperty("site.trace") != null) {
                    System.err.println("trace: " + rowId + " " + name + " on " + on + " -> " + e);
                }
            }
            if (as != null && expected.put(as, value) != null) {
                throw new Bug(rowId + ": label " + as + " used twice");
            }
        }
        return expected;
    }

    // ------------------------------------------------------------------------------------------------------------
    // Ops: construction, vectors and boxes, properties, state

    static void registerConstruction() {
        op("newLGraph", a -> new LGraph());
        op("newLNode", a -> new LNode(a.g(0)));
        op("newLPort", a -> new LPort());
        op("newLEdge", a -> new LEdge());
        op("newLLabel", a -> new LLabel(a.isNull(0) ? null : a.s(0)));
        op("newLLabelDefault", a -> new LLabel());
        op("newLayer", a -> new Layer(a.g(0)));
        op("newPropertyHolder", a -> new Handle(new MapPropertyHolder()));
    }

    static KVector sizeOf(Object o) {
        if (o instanceof LGraph g) {
            return g.getSize();
        } else if (o instanceof LShape s) {
            return s.getSize();
        } else if (o instanceof Layer l) {
            return l.getSize();
        } else if (o instanceof GraphElementAdapter<?> ad) {
            return ad.getSize();
        } else if (o instanceof GraphAdapter<?> ad) {
            return ad.getSize();
        }
        throw new Bug("no size on " + o.getClass().getName());
    }

    static KVector positionOf(Object o) {
        if (o instanceof LShape s) {
            return s.getPosition();
        } else if (o instanceof GraphElementAdapter<?> ad) {
            return ad.getPosition();
        } else if (o instanceof GraphAdapter<?> ad) {
            return ad.getPosition();
        }
        throw new Bug("no position on " + o.getClass().getName());
    }

    static Spacing marginOf(Object o) {
        if (o instanceof LNode n) {
            return n.getMargin();
        } else if (o instanceof LPort p) {
            return p.getMargin();
        }
        throw new Bug("no margin on " + o.getClass().getName());
    }

    static Spacing paddingOf(Object o) {
        if (o instanceof LNode n) {
            return n.getPadding();
        } else if (o instanceof LGraph g) {
            return g.getPadding();
        }
        throw new Bug("no padding on " + o.getClass().getName());
    }

    static void set(Spacing s, Args a) {
        s.top = a.d(0);
        s.right = a.d(1);
        s.bottom = a.d(2);
        s.left = a.d(3);
    }

    static void registerGeometry() {
        op("setSize", a -> {
            if (a.on() instanceof GraphElementAdapter<?> ad) {
                ad.setSize(new KVector(a.d(0), a.d(1)));
                return null;
            }
            KVector v = sizeOf(a.on());
            v.x = a.d(0);
            v.y = a.d(1);
            return null;
        });
        op("setPosition", a -> {
            if (a.on() instanceof GraphElementAdapter<?> ad) {
                ad.setPosition(new KVector(a.d(0), a.d(1)));
                return null;
            }
            KVector v = positionOf(a.on());
            v.x = a.d(0);
            v.y = a.d(1);
            return null;
        });
        op("setOffset", a -> {
            KVector v = a.onG().getOffset();
            v.x = a.d(0);
            v.y = a.d(1);
            return null;
        });
        op("setAnchor", a -> {
            KVector v = a.onP().getAnchor();
            v.x = a.d(0);
            v.y = a.d(1);
            return null;
        });
        op("setMargin", a -> {
            if (a.on() instanceof NodeAdapter<?> na) {
                na.setMargin(new ElkMargin(a.d(0), a.d(1), a.d(2), a.d(3)));
            } else if (a.on() instanceof PortAdapter<?> pa) {
                pa.setMargin(new ElkMargin(a.d(0), a.d(1), a.d(2), a.d(3)));
            } else {
                set(marginOf(a.on()), a);
            }
            return null;
        });
        op("setPadding", a -> {
            if (a.on() instanceof NodeAdapter<?> na) {
                na.setPadding(new ElkPadding(a.d(0), a.d(1), a.d(2), a.d(3)));
            } else {
                set(paddingOf(a.on()), a);
            }
            return null;
        });
        op("getSize", a -> sizeOf(a.on()));
        op("getPosition", a -> positionOf(a.on()));
        op("getOffset", a -> a.onG().getOffset());
        op("getAnchor", a -> a.onP().getAnchor());
        op("getMargin", a -> a.on() instanceof NodeAdapter<?> na ? na.getMargin()
                : a.on() instanceof PortAdapter<?> pa ? pa.getMargin() : marginOf(a.on()));
        op("getPadding", a -> a.on() instanceof NodeAdapter<?> na ? na.getPadding() : paddingOf(a.on()));
        op("getActualSize", a -> a.onG().getActualSize());
        op("bendPointsAdd", a -> {
            a.onE().getBendPoints().add(new KVector(a.d(0), a.d(1)));
            return null;
        });
        op("getBendPoints", a -> a.onE().getBendPoints());
    }

    @SuppressWarnings("unchecked")
    static void registerProperties() {
        op("setProperty", a -> {
            ((IPropertyHolder) a.on()).setProperty((IProperty<Object>) a.prop(0), a.c.decode(a.raw(1)));
            return null;
        });
        op("hasProperty", a -> a.on() instanceof GraphElementAdapter<?> ad ? ad.hasProperty(a.prop(0))
                : a.on() instanceof GraphAdapter<?> ga ? ga.hasProperty(a.prop(0))
                : ((IPropertyHolder) a.on()).hasProperty(a.prop(0)));
        op("getProperty", a -> new Raw(json(a.c.enc.encode(
                a.on() instanceof GraphElementAdapter<?> ad ? ad.getProperty(a.prop(0))
                : a.on() instanceof GraphAdapter<?> ga ? ga.getProperty(a.prop(0))
                : ((IPropertyHolder) a.on()).getProperty(a.prop(0)), 0))));
        op("getVolatileId", a -> a.on() instanceof GraphAdapter<?> ga ? ga.getVolatileId()
                : ((GraphElementAdapter<?>) a.on()).getVolatileId());
        op("setVolatileId", a -> {
            if (a.on() instanceof GraphAdapter<?> ga) {
                ga.setVolatileId(a.i(0));
            } else {
                ((GraphElementAdapter<?>) a.on()).setVolatileId(a.i(0));
            }
            return null;
        });
    }

    // ---- state: the observable fields of one element, named by this context ----

    static Object propsOf(Ctx c, LGraphElement e, Args a, int argIndex) {
        Set<String> only = null;
        if (!a.isNull(argIndex)) {
            only = new HashSet<>();
            for (Object id : a.list(argIndex)) {
                only.add((String) id);
            }
        }
        Map<String, Object> m = new TreeMap<>();
        for (Map.Entry<IProperty<?>, Object> entry : e.getAllProperties().entrySet()) {
            if (only == null || only.contains(entry.getKey().getId())) {
                m.put(entry.getKey().getId(), c.enc.encode(entry.getValue(), 0));
            }
        }
        return m;
    }

    static List<Object> names(Ctx c, Iterable<?> items) {
        List<Object> l = new ArrayList<>();
        for (Object x : items) {
            l.add(c.value(x));
        }
        return l;
    }

    static Object state(Args a) {
        Object o = a.on();
        Ctx c = a.c;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("path", c.pathOf(o));
        if (o instanceof LGraph g) {
            m.put("size", pair(g.getSize()));
            m.put("padding", c.value(g.getPadding()));
            m.put("offset", pair(g.getOffset()));
            m.put("parentNode", c.value(g.getParentNode()));
            m.put("layerlessNodes", names(c, g.getLayerlessNodes()));
            m.put("layers", names(c, g.getLayers()));
        } else if (o instanceof LNode n) {
            m.put("type", n.getType().name());
            m.put("pos", pair(n.getPosition()));
            m.put("size", pair(n.getSize()));
            m.put("margin", c.value(n.getMargin()));
            m.put("padding", c.value(n.getPadding()));
            m.put("graph", c.value(n.getGraph()));
            m.put("layer", c.value(n.getLayer()));
            m.put("ports", names(c, n.getPorts()));
            m.put("labels", names(c, n.getLabels()));
            m.put("nested", c.value(n.getNestedGraph()));
        } else if (o instanceof LPort p) {
            m.put("node", c.value(p.getNode()));
            m.put("side", p.getSide().name());
            m.put("pos", pair(p.getPosition()));
            m.put("size", pair(p.getSize()));
            m.put("anchor", pair(p.getAnchor()));
            m.put("explicitAnchor", p.isExplicitlySuppliedPortAnchor());
            m.put("connectedToExternalNodes", p.isConnectedToExternalNodes());
            m.put("margin", c.value(p.getMargin()));
            m.put("labels", names(c, p.getLabels()));
            m.put("incoming", names(c, p.getIncomingEdges()));
            m.put("outgoing", names(c, p.getOutgoingEdges()));
        } else if (o instanceof LEdge e) {
            m.put("source", c.value(e.getSource()));
            m.put("target", c.value(e.getTarget()));
            m.put("bendPoints", c.value(e.getBendPoints()));
            m.put("labels", names(c, e.getLabels()));
        } else if (o instanceof LLabel l) {
            m.put("text", l.getText());
            m.put("pos", pair(l.getPosition()));
            m.put("size", pair(l.getSize()));
        } else if (o instanceof Layer y) {
            m.put("graph", c.value(y.getGraph()));
            m.put("size", pair(y.getSize()));
            m.put("nodes", names(c, y.getNodes()));
        } else {
            throw new Bug("no state for " + o.getClass().getName());
        }
        m.put("properties", propsOf(c, (LGraphElement) o, a, 0));
        return m;
    }

    static void registerState() {
        op("state", LayeredSiteVectors::state);
        op("toString", a -> a.on().toString());
        op("getDesignation", a -> a.on(LGraphElement.class).getDesignation());
        op("getText", a -> a.on() instanceof LabelAdapter<?> la ? la.getText() : a.onL().getText());
    }

    // ------------------------------------------------------------------------------------------------------------
    // Ops: LGraph, Layer, LNode, LPort, LEdge

    static void registerGraphOps() {
        op("layerlessAdd", a -> {
            a.onG().getLayerlessNodes().add(a.n(0));
            return null;
        });
        op("layerlessRemove", a -> a.onG().getLayerlessNodes().remove(a.n(0)));
        op("layersAdd", a -> {
            a.onG().getLayers().add(a.y(0));
            return null;
        });
        op("getLayers", a -> a.onG().getLayers());
        op("getLayerlessNodes", a -> a.onG().getLayerlessNodes());
        op("setParentNode", a -> {
            a.onG().setParentNode(a.n(0));
            return null;
        });
        op("getParentNode", a -> a.onG().getParentNode());
        op("getNodes", a -> a.on() instanceof GraphAdapter<?> ga ? ga.getNodes() : a.onY().getNodes());
        op("getGraph", a -> a.on() instanceof Layer y ? (Object) y.getGraph()
                : a.on() instanceof NodeAdapter<?> na ? (Object) na.getGraph() : (Object) a.onN().getGraph());
        op("layerlessAt", a -> new Handle(a.onG().getLayerlessNodes().get(a.i(0))));
        op("portAt", a -> new Handle(a.onN().getPorts().get(a.i(0))));
    }

    static Object portList(Iterable<LPort> ports) {
        List<LPort> l = new ArrayList<>();
        ports.forEach(l::add);
        return l;
    }

    static void registerNodeOps() {
        op("setLayer", a -> {
            a.onN().setLayer(a.y(0));
            return null;
        });
        op("setLayerAt", a -> {
            a.onN().setLayer(a.i(0), a.y(1));
            return null;
        });
        op("getLayer", a -> a.onN().getLayer());
        op("setType", a -> {
            a.onN().setType(a.nodeType(0));
            return null;
        });
        op("getType", a -> a.onN().getType());
        op("getPortsOfType", a -> portList(a.onN().getPorts(a.type(0))));
        op("getPortsOfSide", a -> portList(a.onN().getPorts(a.side(0))));
        op("getPortsOfTypeAndSide", a -> portList(a.onN().getPorts(a.type(0), a.side(1))));
        op("cachePortSides", a -> {
            a.onN().cachePortSides();
            return null;
        });
        op("getPortSideView", a -> a.onN().getPortSideView(a.side(0)));
        op("portSideViewGet", a -> a.onN().getPortSideView(a.side(0)).get(a.i(1)));
        op("portSideViewSize", a -> a.onN().getPortSideView(a.side(0)).size());
        op("portSideViewSet", a -> a.onN().getPortSideView(a.side(0)).set(a.i(1), a.p(2)));
        op("getNestedGraph", a -> a.onN().getNestedGraph());
        op("setNestedGraph", a -> {
            a.onN().setNestedGraph(a.g(0));
            return null;
        });
        op("isInlineEdgeLabel", a -> a.onN().isInlineEdgeLabel());
        op("borderToContentAreaCoordinates", a -> {
            a.onN().borderToContentAreaCoordinates(a.b(0), a.b(1));
            return null;
        });
        op("getInteractiveReferencePoint", a -> a.onN().getInteractiveReferencePoint());
    }

    static void registerSharedOps() {
        op("getPorts", a -> a.on() instanceof NodeAdapter<?> na ? na.getPorts() : a.onN().getPorts());
        op("getLabels", a -> {
            Object o = a.on();
            if (o instanceof LNode n) {
                return n.getLabels();
            } else if (o instanceof LPort p) {
                return p.getLabels();
            } else if (o instanceof LEdge e) {
                return e.getLabels();
            } else if (o instanceof NodeAdapter<?> na) {
                return na.getLabels();
            } else if (o instanceof PortAdapter<?> pa) {
                return pa.getLabels();
            }
            return ((EdgeAdapter<?>) o).getLabels();
        });
        op("labelsAdd", a -> {
            Object o = a.on();
            if (o instanceof LNode n) {
                n.getLabels().add(a.l(0));
            } else if (o instanceof LPort p) {
                p.getLabels().add(a.l(0));
            } else {
                ((LEdge) o).getLabels().add(a.l(0));
            }
            return null;
        });
        op("getIncomingEdges", a -> {
            Object o = a.on();
            if (o instanceof LNode n) {
                return n.getIncomingEdges();
            } else if (o instanceof LPort p) {
                return p.getIncomingEdges();
            }
            return o instanceof PortAdapter<?> pa ? pa.getIncomingEdges() : ((NodeAdapter<?>) o).getIncomingEdges();
        });
        op("getOutgoingEdges", a -> {
            Object o = a.on();
            if (o instanceof LNode n) {
                return n.getOutgoingEdges();
            } else if (o instanceof LPort p) {
                return p.getOutgoingEdges();
            }
            return o instanceof PortAdapter<?> pa ? pa.getOutgoingEdges() : ((NodeAdapter<?>) o).getOutgoingEdges();
        });
        op("getConnectedEdges", a -> a.on() instanceof LNode n ? n.getConnectedEdges() : a.onP().getConnectedEdges());
        op("getIndex", a -> {
            Object o = a.on();
            return o instanceof LNode n ? n.getIndex() : o instanceof LPort p ? p.getIndex() : ((Layer) o).getIndex();
        });
        op("getSide", a -> a.on() instanceof LPort p ? p.getSide()
                : a.on() instanceof PortAdapter<?> pa ? pa.getSide() : ((LabelAdapter<?>) a.on()).getSide());
    }

    static void registerPortOps() {
        op("setNode", a -> {
            a.onP().setNode(a.n(0));
            return null;
        });
        op("getNode", a -> a.onP().getNode());
        op("setSide", a -> {
            a.onP().setSide(a.side(0));
            return null;
        });
        op("setExplicitlySuppliedPortAnchor", a -> {
            a.onP().setExplicitlySuppliedPortAnchor(a.b(0));
            return null;
        });
        op("isExplicitlySuppliedPortAnchor", a -> a.onP().isExplicitlySuppliedPortAnchor());
        op("setConnectedToExternalNodes", a -> {
            a.onP().setConnectedToExternalNodes(a.b(0));
            return null;
        });
        op("isConnectedToExternalNodes", a -> a.onP().isConnectedToExternalNodes());
        op("getAbsoluteAnchor", a -> a.onP().getAbsoluteAnchor());
        op("getName", a -> a.onP().getName());
        op("getDegree", a -> a.onP().getDegree());
        op("getNetFlow", a -> a.onP().getNetFlow());
        op("getPredecessorPorts", a -> a.onP().getPredecessorPorts());
        op("getSuccessorPorts", a -> a.onP().getSuccessorPorts());
        op("getConnectedPorts", a -> a.onP().getConnectedPorts());
    }

    static void registerEdgeOps() {
        op("setSource", a -> {
            a.onE().setSource(a.p(0));
            return null;
        });
        op("setTarget", a -> {
            a.onE().setTarget(a.p(0));
            return null;
        });
        op("setTargetAndInsertAtIndex", a -> {
            a.onE().setTargetAndInsertAtIndex(a.p(0), a.i(1));
            return null;
        });
        op("getSource", a -> a.onE().getSource());
        op("getTarget", a -> a.onE().getTarget());
        op("reverse", a -> {
            a.onE().reverse(a.g(0), a.b(1));
            return null;
        });
        op("isSelfLoop", a -> a.onE().isSelfLoop());
        op("isInLayerEdge", a -> a.onE().isInLayerEdge());
        op("getOtherPort", a -> a.onE().getOther(a.p(0)));
        op("getOtherNode", a -> a.onE().getOther(a.n(0)));
    }

    // ------------------------------------------------------------------------------------------------------------
    // Ops: LGraphUtil, Spacings, Tarjan, NodeFlexibility, LayeredSpacings

    static void registerUtilOps() {
        op("LGraphUtil.resizeNode", a -> {
            LGraphUtil.resizeNode(a.n(0), a.vec(1), a.b(2), a.b(3));
            return null;
        });
        op("LGraphUtil.offsetGraph", a -> {
            LGraphUtil.offsetGraph(a.g(0), a.d(1), a.d(2));
            return null;
        });
        op("LGraphUtil.offsetGraphs", a -> {
            List<LGraph> graphs = new ArrayList<>();
            a.list(0).forEach(x -> graphs.add(a.c.as(LGraph.class, a.c.get((String) x), "graph list item")));
            LGraphUtil.offsetGraphs(graphs, a.d(1), a.d(2));
            return null;
        });
        op("LGraphUtil.placeNodesHorizontally", a -> {
            LGraphUtil.placeNodesHorizontally(a.y(0), a.d(1));
            return null;
        });
        op("LGraphUtil.findMaxNonDummyNodeWidth", a -> LGraphUtil.findMaxNonDummyNodeWidth(a.y(0), a.b(1)));
        op("LGraphUtil.computeGraphProperties", a -> {
            LGraphUtil.computeGraphProperties(a.g(0));
            return null;
        });
        op("LGraphUtil.createPort", a -> new Handle(LGraphUtil.createPort(a.n(0), a.vec(1), a.type(2), a.g(3))));
        op("LGraphUtil.provideCollectorPort", a -> new Handle(
                LGraphUtil.provideCollectorPort(a.g(0), a.n(1), a.type(2), a.side(3))));
        op("LGraphUtil.initializePort", a -> {
            LGraphUtil.initializePort(a.p(0), a.constraints(1), a.direction(2), a.vec(3));
            return null;
        });
        op("LGraphUtil.createExternalPortDummy", a -> new Handle(LGraphUtil.createExternalPortDummy(
                a.ref(0, IPropertyHolder.class), a.constraints(1), a.side(2), a.i(3), a.vec(4), a.vec(5), a.vec(6),
                a.direction(7), a.g(8))));
        op("LGraphUtil.getExternalPortPosition", a -> LGraphUtil.getExternalPortPosition(a.g(0), a.n(1), a.d(2),
                a.d(3)));
        op("LGraphUtil.isDescendant", a -> LGraphUtil.isDescendant(a.n(0), a.n(1)));
        op("LGraphUtil.changeCoordSystem", a -> {
            KVector point = a.vec(0);
            LGraphUtil.changeCoordSystem(point, a.g(1), a.g(2));
            return point;
        });
        op("LGraphUtil.getIndividualOrInherited", a -> new Raw(json(a.c.enc.encode(
                LGraphUtil.getIndividualOrInherited(a.n(0), a.prop(1)), 0))));
        op("LGraphUtil.getDirection", a -> LGraphUtil.getDirection(a.g(0)));
        op("LGraphUtil.getMinimalModelOrder", a -> LGraphUtil.getMinimalModelOrder(a.g(0)));
    }

    static void registerSpacingOps() {
        op("newSpacings", a -> new Handle(new Spacings(a.g(0))));
        op("getHorizontalSpacingNodes", a -> a.on(Spacings.class).getHorizontalSpacing(a.n(0), a.n(1)));
        op("getHorizontalSpacingTypes", a -> a.on(Spacings.class).getHorizontalSpacing(a.nodeType(0), a.nodeType(1)));
        op("getHorizontalSpacingElements", a -> {
            LGraphElement e1 = a.ref(0, LGraphElement.class), e2 = a.ref(1, LGraphElement.class);
            return a.on(Spacings.class).getHorizontalSpacing(e1, e2);
        });
        op("getVerticalSpacingNodes", a -> a.on(Spacings.class).getVerticalSpacing(a.n(0), a.n(1)));
        op("getVerticalSpacingTypes", a -> a.on(Spacings.class).getVerticalSpacing(a.nodeType(0), a.nodeType(1)));
        op("Spacings.getIndividualOrDefault", a -> new Raw(json(a.c.enc.encode(
                Spacings.getIndividualOrDefault(a.n(0), a.prop(1)), 0))));
        op("NodeFlexibility.getNodeFlexibility", a -> NodeFlexibility.getNodeFlexibility(a.n(0)));
        op("optionTargetFilter", a -> LayeredSpacings.OPTION_TARGET_FILTER.apply(
                a.on(IPropertyHolder.class), a.prop(0)));
    }

    /** A Tarjan with the lists it fills, as SCCModelOrderCycleBreaker constructs it. */
    record TarjanBox(Tarjan tarjan, List<Set<LNode>> components, HashMap<LNode, Integer> componentIds) { }

    static int byName(String x, String y) {
        int i = 0, j = 0;
        while (i < x.length() && j < y.length()) {
            if (Character.isDigit(x.charAt(i)) && Character.isDigit(y.charAt(j))) {
                int ei = i, ej = j;
                while (ei < x.length() && Character.isDigit(x.charAt(ei))) {
                    ei++;
                }
                while (ej < y.length() && Character.isDigit(y.charAt(ej))) {
                    ej++;
                }
                int cmp = Long.compare(Long.parseLong(x.substring(i, ei)), Long.parseLong(y.substring(j, ej)));
                if (cmp != 0) {
                    return cmp;
                }
                i = ei;
                j = ej;
            } else {
                if (x.charAt(i) != y.charAt(j)) {
                    return Character.compare(x.charAt(i), y.charAt(j));
                }
                i++;
                j++;
            }
        }
        return Integer.compare(x.length() - i, y.length() - j);
    }

    static void registerTarjanOps() {
        op("newTarjan", a -> {
            List<LEdge> toReverse = a.edges(0);
            List<Set<LNode>> components = new ArrayList<>();
            HashMap<LNode, Integer> ids = new HashMap<>();
            return new Handle(new TarjanBox(new Tarjan(toReverse, components, ids), components, ids));
        });
        op("resetTarjan", a -> {
            a.on(TarjanBox.class).tarjan().resetTarjan(a.g(0));
            return null;
        });
        op("tarjan", a -> {
            a.on(TarjanBox.class).tarjan().tarjan(a.g(0));
            return null;
        });
        op("stronglyConnected", a -> {
            a.on(TarjanBox.class).tarjan().stronglyConnected(a.n(0));
            return null;
        });
        // components in discovery order; the members of a component (a HashSet) sorted by name
        op("tarjanComponents", a -> {
            List<Object> out = new ArrayList<>();
            for (Set<LNode> scc : a.on(TarjanBox.class).components()) {
                List<String> members = new ArrayList<>();
                scc.forEach(n -> members.add(a.c.pathOf(n)));
                members.sort(LayeredSiteVectors::byName);
                out.add(members);
            }
            return out;
        });
        op("tarjanComponentIds", a -> {
            Map<String, Object> out = new TreeMap<>(LayeredSiteVectors::byName);
            a.on(TarjanBox.class).componentIds().forEach((n, id) -> out.put(a.c.pathOf(n), id));
            return out;
        });
    }

    // ------------------------------------------------------------------------------------------------------------
    // Ops: LGraphAdapters

    static Predicate<LNode> nodeFilter(String name) {
        return switch (name) {
            case "all" -> n -> true;
            case "normal" -> n -> n.getType() == LNode.NodeType.NORMAL;
            case "none" -> n -> false;
            default -> throw new Bug("unknown node filter " + name);
        };
    }

    static Object listItem(Iterable<?> items, int index) {
        int i = 0;
        for (Object x : items) {
            if (i++ == index) {
                return x;
            }
        }
        throw new Bug("no item " + index);
    }

    static Iterable<?> adapterItems(Object adapter, String what) {
        return switch (what) {
            case "nodes" -> ((GraphAdapter<?>) adapter).getNodes();
            case "ports" -> ((NodeAdapter<?>) adapter).getPorts();
            case "labels" -> adapter instanceof NodeAdapter<?> na ? na.getLabels() : ((PortAdapter<?>) adapter).getLabels();
            case "incoming" -> ((PortAdapter<?>) adapter).getIncomingEdges();
            case "outgoing" -> ((PortAdapter<?>) adapter).getOutgoingEdges();
            case "edgeLabels" -> ((EdgeAdapter<?>) adapter).getLabels();
            default -> throw new Bug("unknown adapter list " + what);
        };
    }

    static void registerAdapterOps() {
        op("LGraphAdapters.adaptGraph", a -> new Handle(LGraphAdapters.adapt(a.g(0))));
        op("LGraphAdapters.adaptGraphTransparent", a -> new Handle(LGraphAdapters.adapt(a.g(0), a.b(1))));
        op("LGraphAdapters.adaptGraphFiltered", a -> new Handle(
                LGraphAdapters.adapt(a.g(0), a.b(1), a.b(2), nodeFilter(a.s(3)))));
        op("LGraphAdapters.adaptNode", a -> {
            NodeAdapter<?> adapter = LGraphAdapters.adapt(a.n(0), a.b(1));
            return new Handle(adapter);
        });
        op("LGraphAdapters.adaptLabel", a -> {
            LabelAdapter<?> adapter = LGraphAdapters.adapt(a.l(0));
            return new Handle(adapter);
        });
        op("adapterAt", a -> new Handle(listItem(adapterItems(a.on(), a.s(0)), a.i(1))));
        op("adapterItems", a -> adapterItems(a.on(), a.s(0)));
        op("adapterElement", a -> adapted(a.on()));
        op("sortPortList", a -> {
            a.on(NodeAdapter.class).sortPortList();
            return null;
        });
        op("isCompoundNode", a -> a.on(NodeAdapter.class).isCompoundNode());
        op("hasCompoundConnections", a -> a.on(PortAdapter.class).hasCompoundConnections());
        op("LGraphAdapters.compare", a -> LGraphAdapters.DEFAULT_PORTLIST_SORTER.compare(a.p(0), a.p(1)));
    }

    // ------------------------------------------------------------------------------------------------------------
    // Ops: ElkGraphTransformer, LayeredLayoutProvider, enums

    static ElkNode importTarget(ElkNode root, String target) {
        if (target == null) {
            return root;
        }
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            if (it.next() instanceof ElkNode n && target.equals(n.getIdentifier())) {
                return n;
            }
        }
        throw new Bug("import target " + target + " not found");
    }

    /** A monitor that reports itself cancelled. */
    static final class CancelledMonitor extends BasicProgressMonitor {
        @Override
        public boolean isCanceled() {
            return true;
        }
    }

    static void registerTransformOps() {
        op("importGraph", a -> {
            ElkNode root = a.on(ElkNode.class);
            LGraph graph = new ElkGraphTransformer().importGraph(importTarget(root, a.isNull(0) ? null : a.s(0)));
            a.c.bindAll(new Dump(graph, true).paths);
            return graph;
        });
        op("dumpLGraph", a -> new Raw(json(new Dump(a.onG(), true).dump())));
        op("applyLayout", a -> {
            new ElkGraphTransformer().applyLayout(a.onG());
            return null;
        });
        op("applyLayoutNonMutating", a -> new Handle(ElkGraphLayoutTransferrer.applyLayoutNonMutating(a.onG())));
        op("exportElk", a -> new Raw(export(a.on(ElkNode.class))));
        op("getOriginIdentifier", a -> ElkGraphTransformer.getOriginIdentifier(a.on(LGraphElement.class)));
        op("layout", a -> {
            IElkProgressMonitor monitor = a.s(0).equals("cancelled") ? new CancelledMonitor() : new BasicProgressMonitor();
            new LayeredLayoutProvider().layout(a.on(ElkNode.class), monitor);
            return null;
        });
        op("hierarchyAwareClasses", a -> {
            List<String> found = new ArrayList<>();
            for (String n : classNames(LayeredLayoutProvider.class, "org/eclipse/elk/alg/layered/")) {
                Class<?> k = load(n);
                if (k != IHierarchyAwareLayoutProcessor.class && IHierarchyAwareLayoutProcessor.class.isAssignableFrom(k)) {
                    found.add(n);
                }
            }
            return found;
        });
        op("isHierarchyAware", a -> switch (a.s(0)) {
            case "LayeredLayoutProvider" -> ((Object) new LayeredLayoutProvider()) instanceof IHierarchyAwareLayoutProcessor;
            case "ElkLayered" -> ((Object) new ElkLayered()) instanceof IHierarchyAwareLayoutProcessor;
            default -> throw new Bug("unknown class " + a.s(0));
        });
    }

    static Map<String, Object> exceptionValue(Throwable t) {
        @SuppressWarnings("unchecked")
        Map<String, Object> m = (Map<String, Object>) exceptionOf(t).get("exception");
        return m;
    }

    /** Constants, valueOf miss, compareTo and every public instance method of an enum class, by reflection. */
    static Object enumInfo(Args a) throws Exception {
        Class<?> k = load(a.s(0));
        Object[] constants = k.getEnumConstants();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("class", typeName(k));
        List<Object> list = new ArrayList<>();
        for (Object o : constants) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("name", ((Enum<?>) o).name());
            c.put("ordinal", ((Enum<?>) o).ordinal());
            c.put("toString", o.toString());
            list.add(c);
        }
        m.put("constants", list);
        m.put("valueOfMiss", valueOfMiss(k));
        m.put("compareTo", compareTo(constants));
        m.put("methods", enumMethods(a.c, k, constants));
        return m;
    }

    static Object valueOfMiss(Class<?> k) throws Exception {
        try {
            k.getMethod("valueOf", String.class).invoke(null, NO_SUCH_CONSTANT);
        } catch (InvocationTargetException e) {
            return exceptionValue(e.getCause());
        }
        throw new Bug(k.getName() + ".valueOf accepted " + NO_SUCH_CONSTANT);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    static Object compareTo(Object[] constants) {
        Comparable first = (Comparable) constants[0], last = (Comparable) constants[constants.length - 1];
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("firstToLast", first.compareTo(last));
        m.put("lastToFirst", last.compareTo(first));
        m.put("firstToFirst", first.compareTo(first));
        return m;
    }

    static Object callOn(Ctx c, Method m, Object target, Object... args) throws Exception {
        try {
            return c.value(m.invoke(target, args));
        } catch (InvocationTargetException e) {
            return exceptionValue(e.getCause());
        }
    }

    /** public, non-static methods the enum class declares itself: no parameter (a value per constant), or one parameter of the enum type (a constant x constant matrix); the create() factories are excluded. */
    static Object enumMethods(Ctx c, Class<?> k, Object[] constants) throws Exception {
        Map<String, Object> out = new TreeMap<>();
        for (Method m : k.getDeclaredMethods()) {
            if (!Modifier.isPublic(m.getModifiers()) || Modifier.isStatic(m.getModifiers()) || m.isSynthetic()
                    || m.getName().equals("create") || m.getReturnType() == void.class) {
                continue;
            }
            Map<String, Object> perConstant = new LinkedHashMap<>();
            for (Object o : constants) {
                if (m.getParameterCount() == 0) {
                    perConstant.put(((Enum<?>) o).name(), callOn(c, m, o));
                } else if (m.getParameterCount() == 1 && m.getParameterTypes()[0] == k) {
                    Map<String, Object> row = new LinkedHashMap<>();
                    for (Object arg : constants) {
                        row.put(((Enum<?>) arg).name(), callOn(c, m, o, arg));
                    }
                    perConstant.put(((Enum<?>) o).name(), row);
                } else {
                    throw new Bug("unhandled enum method " + m);
                }
            }
            out.put(m.getName(), perConstant);
        }
        return out;
    }

    /** The ELK graph elements a step builds or looks up (group S14 invalid edges, S19 origins). */
    static void registerElkOps() {
        op("newElkGraph", a -> new Handle(org.eclipse.elk.graph.util.ElkGraphUtil.createGraph()));
        op("newElkNode", a -> new Handle(org.eclipse.elk.graph.util.ElkGraphUtil.createNode(a.on(ElkNode.class))));
        op("newElkEdge", a -> new Handle(org.eclipse.elk.graph.util.ElkGraphUtil.createEdge(a.on(ElkNode.class))));
        op("elkSetIdentifier", a -> {
            a.on(ElkGraphElement.class).setIdentifier(a.s(0));
            return null;
        });
        op("elkSetDimensions", a -> {
            a.on(ElkNode.class).setDimensions(a.d(0), a.d(1));
            return null;
        });
        op("elkAddSource", a -> {
            a.on(ElkEdge.class).getSources().add(a.ref(0, ElkConnectableShape.class));
            return null;
        });
        op("elkAddTarget", a -> {
            a.on(ElkEdge.class).getTargets().add(a.ref(0, ElkConnectableShape.class));
            return null;
        });
        op("elkFind", a -> {
            ElkNode root = a.on(ElkNode.class);
            if (a.s(0).equals(root.getIdentifier())) {
                return new Handle(root);
            }
            for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
                if (it.next() instanceof ElkGraphElement e && a.s(0).equals(e.getIdentifier())) {
                    return new Handle(e);
                }
            }
            throw new Bug("no ELK element with identifier " + a.s(0));
        });
    }

    static void registerEnumOps() {
        op("enumInfo", LayeredSiteVectors::enumInfo);
    }

    // ------------------------------------------------------------------------------------------------------------
    // Rows: scenarios, round trip, stability

    record Row(String id, String site, String json) { }

    /** One scenario: the prepared ELK graph (null: none, the interpreter starts from a new LGraph g0) and its steps. */
    record Scn(String id, String site, Supplier<ElkNode> prepare, List<Step> steps) { }

    static final List<Scn> SCENARIOS = new ArrayList<>();

    static void add(String id, String site, Supplier<ElkNode> prepare, B steps) {
        SCENARIOS.add(new Scn(id, site, prepare, steps.steps));
    }

    static void add(String id, String site, B steps) {
        add(id, site, null, steps);
    }

    /** An ELK graph from ELK JSON text written with single quotes. */
    static Supplier<ElkNode> elkJson(String text) {
        return () -> ElkGraphJson.forGraph(text.replace('\'', '"')).toElk();
    }

    static String export(ElkNode root) {
        return strictNumbers(ElkGraphJson.forGraph(root).omitLayout(false).omitZeroDimension(false)
                .omitZeroPositions(false).omitUnknownLayoutOptions(true).prettyPrint(false).toJson());
    }

    /**
     * Gson's lenient writer emits non-finite doubles as bare tokens, which is not JSON. In number-token positions
     * (after ':', ',' or '[', outside strings) Infinity, -Infinity and NaN become the strings "Infinity", "-Infinity"
     * and "NaN".
     */
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

    static final List<String> NON_FINITE = List.of("-Infinity", "Infinity", "NaN");

    /** The written file must be strict JSON (Gson JsonReader in its default non-lenient mode) with nothing after the top-level value. */
    static void strictParse(Path file) throws IOException {
        try (java.io.Reader in = Files.newBufferedReader(file, StandardCharsets.UTF_8);
                com.google.gson.stream.JsonReader reader = new com.google.gson.stream.JsonReader(in)) {
            reader.skipValue();
            if (reader.peek() != com.google.gson.stream.JsonToken.END_DOCUMENT) {
                throw new IllegalStateException(file + " has content after the top-level JSON value");
            }
        }
    }

    static Row stableRow(Scn s) {
        Row first = buildRow(s);
        Row second = buildRow(s);
        if (!first.json.equals(second.json)) {
            throw new IllegalStateException("row " + s.id + " is not stable across two recordings\n"
                    + clip(first.json, second.json) + "\n" + clip(second.json, first.json));
        }
        return first;
    }

    /** The part of s around its first difference from other, so a failing self-check names what differs. */
    static String clip(String s, String other) {
        int d = 0;
        while (d < s.length() && d < other.length() && s.charAt(d) == other.charAt(d)) {
            d++;
        }
        int from = Math.max(0, d - 200);
        return "(at " + d + ") " + s.substring(from, Math.min(s.length(), d + 300));
    }

    @SuppressWarnings("unchecked")
    static Row buildRow(Scn s) {
        List<Object> stepMaps = new ArrayList<>();
        s.steps.forEach(st -> stepMaps.add(st.json()));
        String stepsJson = json(stepMaps);
        // the steps are interpreted from their serialised form, so a TS replay of the file sees exactly these
        List<Object> parsed = (List<Object>) fromJson(JsonParser.parseString(stepsJson));
        String input = null;
        Map<String, Object> expected;
        if (s.prepare == null) {
            expected = run(null, parsed, s.id);
        } else {
            input = export(s.prepare.get());
            Map<String, Object> original = run(s.prepare.get(), parsed, s.id);
            expected = run(ElkGraphJson.forGraph(input).toElk(), parsed, s.id);
            String a = json(original), b = json(expected);
            if (!a.equals(b)) {
                throw new IllegalStateException("row " + s.id + ": outcome on the re-imported input differs from the "
                        + "outcome on the prepared original (round-trip self-check)\n re-imported: " + clip(b, a)
                        + "\n original:    " + clip(a, b));
            }
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", s.id);
        row.put("site", s.site);
        row.put("input", input == null ? null : new Raw(input));
        row.put("steps", new Raw(stepsJson));
        row.put("expected", expected);
        return new Row(s.id, s.site, json(row));
    }

    // ------------------------------------------------------------------------------------------------------------
    // Groups and the cross-check

    /** Scenario group -> row id prefixes (unreached.md: S1-S15 Scenarios, S16-S22 Re-planning input). */
    static final Map<String, List<String>> GROUPS = new LinkedHashMap<>();

    static void groups() {
        GROUPS.put("S1", List.of("site/lgraphutil/resizeNode/"));
        GROUPS.put("S2", List.of("site/lgraphutil/coordinates/"));
        GROUPS.put("S3", List.of("site/lgraphutil/layers/"));
        GROUPS.put("S4", List.of("site/lgraphutil/graphProperties/"));
        GROUPS.put("S5", List.of("site/lgraphutil/ports/"));
        GROUPS.put("S6", List.of("site/lgraphutil/externalPorts/"));
        GROUPS.put("S7", List.of("site/lgraphutil/other/"));
        GROUPS.put("S8", List.of("site/spacings/"));
        GROUPS.put("S9", List.of("site/tarjan/"));
        GROUPS.put("S10", List.of("site/lgraphAdapters/"));
        GROUPS.put("S11", List.of("site/transform/externalPorts/"));
        GROUPS.put("S12", List.of("site/transform/insideSelfLoops/"));
        GROUPS.put("S13", List.of("site/transform/hierarchy/"));
        GROUPS.put("S14", List.of("site/transform/misc/"));
        GROUPS.put("S15", List.of("site/transform/nonMutating/"));
        GROUPS.put("S16", List.of("site/lnode/"));
        GROUPS.put("S17", List.of("site/ledge/"));
        GROUPS.put("S18", List.of("site/lport/"));
        GROUPS.put("S19", List.of("site/strings/", "site/provider/"));
        GROUPS.put("S20", List.of("site/enums/"));
        GROUPS.put("S21", List.of("site/layeredSpacings/targetFilter/"));
        GROUPS.put("S22", List.of("site/nodeFlexibility/"));
    }

    static void crossCheck(List<Row> rows, Map<String, Integer> counts) {
        Map<String, Integer> perGroup = new LinkedHashMap<>();
        GROUPS.keySet().forEach(g -> perGroup.put(g, 0));
        for (Row r : rows) {
            String group = GROUPS.entrySet().stream().filter(e -> e.getValue().stream().anyMatch(r.id::startsWith))
                    .map(Map.Entry::getKey).findFirst().orElse(null);
            if (group == null) {
                throw new IllegalStateException("row " + r.id + " belongs to no listed scenario group");
            }
            perGroup.merge(group, 1, Integer::sum);
        }
        List<String> empty = new ArrayList<>();
        perGroup.forEach((g, n) -> {
            if (n == 0) {
                empty.add(g);
            }
        });
        int sum = counts.values().stream().mapToInt(Integer::intValue).sum();
        if (!empty.isEmpty() || sum != rows.size()) {
            throw new IllegalStateException("cross-check failed: groups without rows " + empty + ", rowCounts sum " + sum
                    + " of " + rows.size() + " rows");
        }
        System.err.println("cross-check ok: rows per group " + perGroup + "; rowCounts sum " + sum + " = rows "
                + rows.size());
    }

    // ------------------------------------------------------------------------------------------------------------
    // Curated models (group S15)

    static String sha256(Path p) throws Exception {
        StringBuilder sb = new StringBuilder();
        for (byte b : MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(p))) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    static Path REPO;

    /** The curated model at repo-relative path rel, after checking it against MODEL_TABLE. */
    static ElkNode loadModel(String rel) throws Exception {
        String expected = null;
        for (String line : MODEL_TABLE.split("\n")) {
            String l = line.strip();
            if (l.endsWith(REPO_PREFIX + rel)) {
                expected = l.substring(0, l.indexOf("  "));
            }
        }
        Path p = REPO.resolve(rel);
        if (expected == null || !expected.equals(sha256(p))) {
            throw new IllegalStateException("model " + rel + " is unlisted or does not match the pinned table");
        }
        Resource r = new ResourceSetImpl().getResource(URI.createFileURI(p.toAbsolutePath().toString()), true);
        if (!r.getErrors().isEmpty() || r.getContents().isEmpty() || !(r.getContents().get(0) instanceof ElkNode)) {
            throw new IllegalStateException("cannot load " + p + ": " + r.getErrors());
        }
        return (ElkNode) r.getContents().get(0);
    }

    /** A model's ELK properties no registered provider knows are dropped, as the JSON export omits them. */
    static ElkNode curated(String rel, boolean includeChildren) {
        try {
            ElkNode g = loadModel(rel);
            List<ElkGraphElement> elements = new ArrayList<>();
            elements.add(g);
            for (TreeIterator<EObject> it = g.eAllContents(); it.hasNext();) {
                if (it.next() instanceof ElkGraphElement e) {
                    elements.add(e);
                }
            }
            for (ElkGraphElement e : elements) {
                List<IProperty<?>> unresolved = new ArrayList<>();
                for (Map.Entry<IProperty<?>, Object> entry : e.getProperties()) {
                    if (entry.getValue() != null && entry.getValue().getClass().getSimpleName().equals("LayoutOptionProxy")) {
                        unresolved.add(entry.getKey());
                    }
                }
                unresolved.forEach(key -> e.getProperties().removeKey(key));
            }
            if (includeChildren) {
                g.setProperty(CoreOptions.HIERARCHY_HANDLING, org.eclipse.elk.core.options.HierarchyHandling.INCLUDE_CHILDREN);
            }
            return g;
        } catch (Exception e) {
            throw new IllegalStateException("cannot prepare " + rel, e);
        }
    }

    // ------------------------------------------------------------------------------------------------------------
    // Main

    static void registerOps() {
        registerConstruction();
        registerGeometry();
        registerProperties();
        registerState();
        registerGraphOps();
        registerNodeOps();
        registerSharedOps();
        registerPortOps();
        registerEdgeOps();
        registerUtilOps();
        registerSpacingOps();
        registerTarjanOps();
        registerAdapterOps();
        registerTransformOps();
        registerElkOps();
        registerEnumOps();
    }

    public static void main(String[] args) throws Exception {
        LayoutMetaDataService svc = LayoutMetaDataService.getInstance(new ClassLoader(null) { });
        svc.registerLayoutMetaDataProviders(new LabelManagementOptions(), new LayeredMetaDataProvider(),
                new LayeredOptions());
        System.setProperty(SEED_PROPERTY, "1");
        ElkGraphStandaloneSetup.doSetup();
        REPO = Path.of(args[1]).toAbsolutePath().normalize().getParent().getParent();
        discoverProperties();
        discoverEnums();
        registerOps();
        groups();
        buildScenarios();

        List<Row> rows = new ArrayList<>();
        Set<String> ids = new HashSet<>();
        Map<String, Integer> counts = new TreeMap<>();
        for (Scn s : SCENARIOS) {
            if (!ids.add(s.id)) {
                throw new IllegalStateException("duplicate row id " + s.id);
            }
            rows.add(stableRow(s));
            counts.merge(s.site, 1, Integer::sum);
        }
        if (System.getProperty("site.skipCrossCheck") == null) {
            crossCheck(rows, counts);
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
        long bytes = out.toString().getBytes(StandardCharsets.UTF_8).length;
        if (bytes > MAX_BYTES) {
            throw new IllegalStateException("output is " + bytes + " bytes, over the 5 MB cap (L3)");
        }
        Files.createDirectories(Path.of(args[0]));
        Files.writeString(Path.of(args[0], OUTPUT), out, StandardCharsets.UTF_8);
        strictParse(Path.of(args[0], OUTPUT));
        System.err.println("strict JSON parse ok");
        System.err.println("rows " + rows.size() + " " + counts + " bytes " + bytes);
    }

    static void buildScenarios() throws Exception {
        s1();
        s2();
        s3();
        s4();
        s5();
        s6();
        s7();
        s8();
        s9();
        s10();
        transformRows();
        s16();
        s17();
        s18();
        s15();
        s19();
        s20();
        s21();
        s22();
    }
    // ------------------------------------------------------------------------------------------------------------
    // Scenario library: property ids, C4 argument values, small graph builders

    static String id(IProperty<?> p) {
        return p.getId();
    }

    static final String PORT_CONSTRAINTS = id(CoreOptions.PORT_CONSTRAINTS), DIRECTION = id(CoreOptions.DIRECTION),
            NODE_SIZE_CONSTRAINTS = id(CoreOptions.NODE_SIZE_CONSTRAINTS),
            EDGE_LABELS_PLACEMENT = id(CoreOptions.EDGE_LABELS_PLACEMENT), ALIGNMENT = id(CoreOptions.ALIGNMENT),
            COMMENT_BOX = id(CoreOptions.COMMENT_BOX), HYPERNODE = id(CoreOptions.HYPERNODE),
            MERGE_EDGES = id(LayeredOptions.MERGE_EDGES), ASPECT_RATIO = id(CoreOptions.ASPECT_RATIO),
            PORT_BORDER_OFFSET = id(CoreOptions.PORT_BORDER_OFFSET), PORT_ANCHOR = id(CoreOptions.PORT_ANCHOR),
            PORT_INDEX = id(CoreOptions.PORT_INDEX), PORT_SIDE = id(CoreOptions.PORT_SIDE),
            JUNCTION_POINTS = id(CoreOptions.JUNCTION_POINTS), SPACING_INDIVIDUAL = id(CoreOptions.SPACING_INDIVIDUAL),
            SPACING_NODE_NODE = id(CoreOptions.SPACING_NODE_NODE),
            INTERACTIVE_REFERENCE_POINT = id(LayeredOptions.INTERACTIVE_REFERENCE_POINT),
            EDGE_LABELS_INLINE = id(CoreOptions.EDGE_LABELS_INLINE),
            NODE_FLEXIBILITY = id(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY),
            NODE_FLEXIBILITY_DEFAULT = id(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_DEFAULT),
            GRAPH_PROPERTIES = id(InternalProperties.GRAPH_PROPERTIES), INPUT_COLLECT = id(InternalProperties.INPUT_COLLECT),
            OUTPUT_COLLECT = id(InternalProperties.OUTPUT_COLLECT), REVERSED = id(InternalProperties.REVERSED),
            PORT_DUMMY = id(InternalProperties.PORT_DUMMY), TOP_COMMENTS = id(InternalProperties.TOP_COMMENTS),
            BOTTOM_COMMENTS = id(InternalProperties.BOTTOM_COMMENTS), COMPOUND_NODE = id(InternalProperties.COMPOUND_NODE),
            INSIDE_CONNECTIONS = id(InternalProperties.INSIDE_CONNECTIONS),
            LABEL_SIDE = id(LabelSide.LABEL_SIDE), MODEL_ORDER = id(InternalProperties.MODEL_ORDER),
            REPRESENTED_LABELS = id(InternalProperties.REPRESENTED_LABELS),
            PORT_RATIO_OR_POSITION = id(InternalProperties.PORT_RATIO_OR_POSITION),
            EXT_PORT_SIDE = id(InternalProperties.EXT_PORT_SIDE), EXT_PORT_SIZE = id(InternalProperties.EXT_PORT_SIZE),
            TARJAN_ID = id(InternalProperties.TARJAN_ID), TARJAN_LOWLINK = id(InternalProperties.TARJAN_LOWLINK),
            TARJAN_ON_STACK = id(InternalProperties.TARJAN_ON_STACK),
            IS_PART_OF_CYCLE = id(InternalProperties.IS_PART_OF_CYCLE), ORIGIN = id(InternalProperties.ORIGIN);

    // C4 argument values (the encoding of the property values the dumps record)
    static Map<String, Object> tv(String t, Object v) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", t);
        m.put("v", v);
        return m;
    }

    static Map<String, Object> D(double d) {
        return tv("double", Double.toString(d));
    }

    static Map<String, Object> I(int i) {
        return tv("int", i);
    }

    static Map<String, Object> Z(boolean b) {
        return tv("bool", b);
    }

    static Map<String, Object> E(String type, String name) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", "enum");
        m.put("c", type);
        m.put("n", name);
        return m;
    }

    static Map<String, Object> SET(String type, String... names) {
        Map<String, Object> m = new TreeMap<>();
        m.put("t", "set");
        m.put("c", type);
        m.put("items", Arrays.asList(names));
        return m;
    }

    static Map<String, Object> ref(String name) {
        return single("ref", name);
    }

    static Map<String, Object> chain(double... xy) {
        List<Object> pts = new ArrayList<>();
        for (int i = 0; i < xy.length; i += 2) {
            pts.add(List.of(xy[i], xy[i + 1]));
        }
        return tv("chain", pts);
    }

    static Map<String, Object> individual(Map<String, Object> idToC4) {
        return tv("individualSpacings", idToC4);
    }

    static final String[] SIDES = {"NORTH", "EAST", "SOUTH", "WEST"};
    static final String[] ALL_SIDES = {"UNDEFINED", "NORTH", "EAST", "SOUTH", "WEST"};
    static final String[] DIRECTIONS = {"UNDEFINED", "LEFT", "RIGHT", "UP", "DOWN"};
    static final String[] PORT_TYPES = {"INPUT", "OUTPUT", "UNDEFINED"};
    static final String[] NODE_TYPES = {"NORMAL", "LONG_EDGE", "EXTERNAL_PORT", "NORTH_SOUTH_PORT", "LABEL",
        "BREAKING_POINT", "PLACEHOLDER", "NONSHIFTING_PLACEHOLDER"};

    static String lower(String s) {
        return s.toLowerCase(Locale.ROOT).replace('_', '-');
    }

    /** The state of an element with the listed properties (those among them that are set on it). */
    static B state(B b, String label, String on, String... propIds) {
        return b.q(label, "state", on, propIds.length == 0 ? List.of() : Arrays.asList(propIds));
    }

    /** The state of an element with every property set on it. */
    static B stateAll(B b, String label, String on) {
        return b.q(label, "state", on, (Object) null);
    }

    // ------------------------------------------------------------------------------------------------------------
    // S1-S3: LGraphUtil.resizeNode, coordinates, layers

    static final String PC = "PortConstraints", DIR = "Direction";

    static void s1() {
        for (String constraints : List.of("FREE", "FIXED_POS")) {
            for (boolean movePorts : new boolean[] {false, true}) {
                for (boolean moveLabels : new boolean[] {false, true}) {
                    String name = (constraints.equals("FREE") ? "free" : "fixed") + "-move-"
                            + (movePorts ? (moveLabels ? "both" : "ports") : (moveLabels ? "labels" : "none"));
                    add("site/lgraphutil/resizeNode/" + name, "LGraphUtil", resizeScenario(constraints, movePorts,
                            moveLabels));
                }
            }
        }
    }

    /** One node 40x30 with a port per side and six node labels around and inside it (every branch of the moves). */
    static B resizeScenario(String constraints, boolean movePorts, boolean moveLabels) {
        B b = new B();
        b.node("n1", "g0", 40, 30);
        b.prop("n1", PORT_CONSTRAINTS, E(PC, constraints));
        b.port("pN", "n1", "NORTH", 18, -4, 4, 4).port("pE", "n1", "EAST", 38, 13, 4, 4)
                .port("pS", "n1", "SOUTH", 18, 28, 4, 4).port("pW", "n1", "WEST", -2, 13, 4, 4);
        b.label("right", "n1", "right", 45, 5, 10, 10).label("below", "n1", "below", 5, 35, 10, 10)
                .label("inside", "n1", "inside", 15, 10, 10, 10).label("tiny", "n1", "tiny", 1, 1, 2, 2)
                .label("farNegY", "n1", "farNegY", 115, -35, 10, 10).label("farNegX", "n1", "farNegX", -45, 85, 10, 10);
        b.c("LGraphUtil.resizeNode", null, "n1", List.of(80.0, 60.0), movePorts, moveLabels);
        state(b, "node", "n1", NODE_SIZE_CONSTRAINTS);
        for (String p : List.of("pN", "pE", "pS", "pW")) {
            state(b, p + ".after", p);
        }
        for (String l : List.of("right", "below", "inside", "tiny", "farNegY", "farNegX")) {
            state(b, l + ".after", l);
        }
        return b;
    }

    /** g0 -> P (nested g1) -> Q (nested g2); nodes A, B in g1, C in g2; edges with bend points, junctions, labels. */
    static B coordinatesBase() {
        B b = new B();
        b.c("setPadding", "g0", 5.0, 6.0, 7.0, 8.0).c("setOffset", "g0", 3.0, 4.0).c("setSize", "g0", 300.0, 200.0);
        b.node("P", "g0", 80, 60).c("setPosition", "P", 100.0, 50.0);
        b.mk("g1", "newLGraph").c("setParentNode", "g1", "P").c("setNestedGraph", "P", "g1")
                .c("setPadding", "g1", 10.0, 11.0, 12.0, 13.0).c("setOffset", "g1", 1.0, 2.0)
                .c("setSize", "g1", 60.0, 40.0);
        b.mk("A", "newLNode", "g1").c("layerlessAdd", "g1", "A").c("setSize", "A", 20.0, 10.0)
                .c("setPosition", "A", 5.0, 6.0);
        b.mk("B", "newLNode", "g1").c("layerlessAdd", "g1", "B").c("setSize", "B", 20.0, 10.0)
                .c("setPosition", "B", 40.0, 30.0);
        b.node("Q", "g1", 30, 20).c("setPosition", "Q", 12.0, 14.0);
        b.mk("g2", "newLGraph").c("setParentNode", "g2", "Q").c("setNestedGraph", "Q", "g2")
                .c("setPadding", "g2", 1.0, 2.0, 3.0, 4.0).c("setOffset", "g2", 5.0, 6.0);
        b.mk("C", "newLNode", "g2").c("layerlessAdd", "g2", "C").c("setSize", "C", 8.0, 8.0)
                .c("setPosition", "C", 2.0, 3.0);
        b.port("Aout", "A", "EAST", 20, 3, 4, 4).port("Bin", "B", "WEST", -4, 3, 4, 4)
                .port("Bout", "B", "EAST", 20, 3, 4, 4).port("Cin", "C", "WEST", -4, 2, 4, 4);
        b.c("setAnchor", "Aout", 1.0, 2.0).c("setAnchor", "Bin", 3.0, 1.0);
        b.edge("e1", "Aout", "Bin").c("bendPointsAdd", "e1", 10.0, 10.0).c("bendPointsAdd", "e1", 20.0, 30.0)
                .prop("e1", JUNCTION_POINTS, chain(10.0, 10.0, 15.0, 20.0))
                .label("e1l", "e1", "edge", 11.0, 12.0, 5.0, 5.0);
        b.edge("e2", "Bout", "Cin").c("bendPointsAdd", "e2", 1.0, 1.0)
                .label("e2l", "e2", "second", 2.0, 3.0, 4.0, 4.0);
        return b;
    }

    static void s2() {
        B b = coordinatesBase();
        b.c("LGraphUtil.offsetGraph", null, "g1", 7.0, -3.0);
        for (String n : List.of("A", "B", "Q")) {
            state(b, n + ".after", n);
        }
        for (String e : List.of("e1", "e2")) {
            state(b, e + ".after", e, JUNCTION_POINTS);
        }
        state(b, "e1l.after", "e1l");
        state(b, "e2l.after", "e2l");
        add("site/lgraphutil/coordinates/offsetGraph", "LGraphUtil", b);

        b = coordinatesBase();
        b.c("LGraphUtil.offsetGraphs", null, List.of("g0", "g1", "g2"), 1.0, 2.0);
        for (String n : List.of("P", "A", "B", "Q", "C")) {
            state(b, n + ".after", n);
        }
        for (String e : List.of("e1", "e2")) {
            state(b, e + ".after", e, JUNCTION_POINTS);
        }
        add("site/lgraphutil/coordinates/offsetGraphs", "LGraphUtil", b);

        b = coordinatesBase();
        String[][] pairs = {{"C", "P"}, {"C", "Q"}, {"A", "Q"}, {"P", "P"}, {"P", "C"}, {"A", "P"}, {"C", "A"}};
        for (String[] p : pairs) {
            b.q("isDescendant." + p[0] + "." + p[1], "LGraphUtil.isDescendant", null, p[0], p[1]);
        }
        add("site/lgraphutil/coordinates/isDescendant", "LGraphUtil", b);

        b = coordinatesBase();
        String[][] systems = {{"g2", "g0"}, {"g0", "g2"}, {"g1", "g2"}, {"g2", "g1"}, {"g1", "g1"}, {"g0", "g1"},
            {"g1", "g0"}};
        for (String[] s : systems) {
            b.q("changeCoordSystem." + s[0] + "." + s[1], "LGraphUtil.changeCoordSystem", null,
                    List.of(10.0, 20.0), s[0], s[1]);
        }
        add("site/lgraphutil/coordinates/changeCoordSystem", "LGraphUtil", b);

        b = coordinatesBase();
        for (String g : List.of("g0", "g1", "g2")) {
            b.q("actualSize." + g, "getActualSize", g);
        }
        for (String p : List.of("Aout", "Bin", "Bout", "Cin")) {
            b.q("absoluteAnchor." + p, "getAbsoluteAnchor", p);
        }
        add("site/lgraphutil/coordinates/actualSizeAndAnchors", "LGraphUtil", b);

        b = coordinatesBase();
        boolean[][] flags = {{false, false}, {true, false}, {false, true}, {true, true}};
        for (int i = 0; i < flags.length; i++) {
            String n = "bn" + i;
            b.node(n, "g1", 10, 10).c("setPosition", n, 50.0, 60.0);
            b.c("borderToContentAreaCoordinates", n, flags[i][0], flags[i][1]);
            state(b, n + ".after", n);
        }
        b.node("bn.root", "g0", 10, 10).c("setPosition", "bn.root", 50.0, 60.0)
                .c("borderToContentAreaCoordinates", "bn.root", true, true);
        state(b, "bn.root.after", "bn.root");
        add("site/lgraphutil/coordinates/borderToContentAreaCoordinates", "LGraphUtil", b);

        for (String point : List.of("CENTER", "TOP_LEFT")) {
            b = coordinatesBase();
            b.prop("g1", INTERACTIVE_REFERENCE_POINT, E("InteractiveReferencePoint", point));
            b.q("reference.A", "getInteractiveReferencePoint", "A");
            b.q("reference.B", "getInteractiveReferencePoint", "B");
            add("site/lgraphutil/coordinates/interactiveReferencePoint-" + lower(point), "LNode", b);
        }
    }

    static B layerBase(double layerWidth) {
        B b = new B();
        b.mk("L", "newLayer", "g0").c("layersAdd", "g0", "L").c("setSize", "L", layerWidth, 100.0);
        return b;
    }

    /** A node in layer L with a width, margins (left, right), an alignment and numbers of in/out edge ports. */
    static void layerNode(B b, String name, double w, double left, double right, String alignment, int in, int out) {
        b.mk(name, "newLNode", "g0").c("setLayer", name, "L").c("setSize", name, w, 10.0)
                .c("setMargin", name, 0.0, right, 0.0, left);
        if (alignment != null) {
            b.prop(name, ALIGNMENT, E("Alignment", alignment));
        }
        for (int i = 0; i < in + out; i++) {
            String p = name + ".p" + i;
            b.mk(p, "newLPort").c("setNode", p, name).c("setSide", p, i < in ? "WEST" : "EAST");
            String other = name + ".o" + i, op = other + ".p";
            b.mk(other, "newLNode", "g0").mk(op, "newLPort").c("setNode", op, other);
            b.edge(name + ".e" + i, i < in ? op : p, i < in ? p : op);
        }
    }

    static void s3() {
        B b = layerBase(200);
        layerNode(b, "left", 40, 5, 7, "LEFT", 0, 0);
        layerNode(b, "right", 40, 5, 7, "RIGHT", 0, 0);
        layerNode(b, "center", 40, 5, 7, "CENTER", 0, 0);
        layerNode(b, "auto-out", 40, 0, 0, "AUTOMATIC", 1, 2);
        layerNode(b, "auto-in", 40, 0, 0, "AUTOMATIC", 2, 1);
        layerNode(b, "auto-none", 40, 0, 0, "AUTOMATIC", 0, 0);
        layerNode(b, "auto-default", 40, 0, 0, null, 1, 0);
        b.mk("dummy", "newLNode", "g0").c("setLayer", "dummy", "L").c("setType", "dummy", "LONG_EDGE")
                .c("setSize", "dummy", 5.0, 5.0);
        b.c("LGraphUtil.placeNodesHorizontally", null, "L", 10.0);
        for (String n : List.of("left", "right", "center", "auto-out", "auto-in", "auto-none", "auto-default", "dummy")) {
            state(b, n + ".after", n);
        }
        add("site/lgraphutil/layers/placeNodesHorizontally-alignments", "LGraphUtil", b);

        double[][] clamps = {{15, 0}, {0, 15}, {15, 15}};
        String[] names = {"clamp-left", "clamp-right", "clamp-both"};
        for (int i = 0; i < clamps.length; i++) {
            b = layerBase(100);
            layerNode(b, "wide", 80, clamps[i][0], clamps[i][1], "CENTER", 0, 0);
            layerNode(b, "narrow", 20, 0, 0, "LEFT", 0, 0);
            b.c("LGraphUtil.placeNodesHorizontally", null, "L", 0.0);
            state(b, "wide.after", "wide");
            state(b, "narrow.after", "narrow");
            add("site/lgraphutil/layers/placeNodesHorizontally-" + names[i], "LGraphUtil", b);
        }

        b = layerBase(100);
        layerNode(b, "a", 30, 2, 3, null, 0, 0);
        layerNode(b, "b", 50, 4, 5, null, 0, 0);
        b.mk("wideDummy", "newLNode", "g0").c("setLayer", "wideDummy", "L").c("setType", "wideDummy", "LONG_EDGE")
                .c("setSize", "wideDummy", 500.0, 5.0).c("setMargin", "wideDummy", 0.0, 9.0, 0.0, 9.0);
        for (String d : DIRECTIONS) {
            b.prop("g0", DIRECTION, E(DIR, d));
            b.q("max." + d + ".withMargins", "LGraphUtil.findMaxNonDummyNodeWidth", null, "L", true);
            b.q("max." + d + ".withoutMargins", "LGraphUtil.findMaxNonDummyNodeWidth", null, "L", false);
        }
        add("site/lgraphutil/layers/findMaxNonDummyNodeWidth", "LGraphUtil", b);
    }

    // ------------------------------------------------------------------------------------------------------------
    // S4-S5: computeGraphProperties, createPort, provideCollectorPort, initializePort

    static B graphPropertiesBase(String direction) {
        B b = new B();
        b.prop("g0", DIRECTION, E(DIR, direction));
        b.node("cmt", "g0", 10, 10).prop("cmt", COMMENT_BOX, Z(true));
        b.node("hyp", "g0", 10, 10).prop("hyp", HYPERNODE, Z(true));
        b.node("cmtHyp", "g0", 10, 10).prop("cmtHyp", COMMENT_BOX, Z(true)).prop("cmtHyp", HYPERNODE, Z(true));
        b.node("ext", "g0", 10, 10).c("setType", "ext", "EXTERNAL_PORT");
        b.node("undef", "g0", 10, 10);
        b.node("free", "g0", 10, 10).prop("free", PORT_CONSTRAINTS, E(PC, "FREE"));
        b.node("fixed", "g0", 10, 10).prop("fixed", PORT_CONSTRAINTS, E(PC, "FIXED_SIDE"));
        b.node("hub", "g0", 30, 30).node("t1", "g0", 10, 10).node("t2", "g0", 10, 10);
        b.port("hub.out", "hub", "EAST", 30, 10, 4, 4).port("t1.in", "t1", "WEST", -4, 3, 4, 4)
                .port("t2.in", "t2", "WEST", -4, 3, 4, 4);
        b.edge("h1", "hub.out", "t1.in").edge("h2", "hub.out", "t2.in");
        b.node("sides", "g0", 30, 30);
        b.port("s.n", "sides", "NORTH", 10, -4, 4, 4).port("s.e", "sides", "EAST", 30, 10, 4, 4)
                .port("s.s", "sides", "SOUTH", 10, 30, 4, 4).port("s.w", "sides", "WEST", -4, 10, 4, 4);
        b.node("loop", "g0", 30, 30);
        b.port("loop.out", "loop", "EAST", 30, 10, 4, 4).port("loop.in", "loop", "WEST", -4, 10, 4, 4);
        b.edge("selfLoop", "loop.out", "loop.in");
        String[] placements = {"CENTER", "HEAD", "TAIL"};
        for (int i = 0; i < placements.length; i++) {
            String l = "lab" + placements[i];
            b.label(l, "h1", placements[i], 0, 0, 5, 5).prop(l, EDGE_LABELS_PLACEMENT, E("EdgeLabelPlacement", placements[i]));
        }
        return b;
    }

    static void recordGraphProperties(B b, String suffix) {
        b.q("graphProperties." + suffix, "getProperty", "g0", GRAPH_PROPERTIES);
        for (String n : List.of("cmt", "hyp", "cmtHyp", "ext", "undef", "free", "fixed", "hub", "sides", "loop")) {
            b.q(n + ".portConstraints." + suffix, "getProperty", n, PORT_CONSTRAINTS);
        }
    }

    static void s4() {
        for (String direction : List.of("RIGHT", "DOWN", "UP", "LEFT")) {
            B b = graphPropertiesBase(direction);
            b.c("LGraphUtil.computeGraphProperties", null, "g0");
            recordGraphProperties(b, "first");
            b.c("LGraphUtil.computeGraphProperties", null, "g0");
            recordGraphProperties(b, "second");
            b.prop("g0", GRAPH_PROPERTIES, SET("GraphProperties", "HYPERNODES", "PARTITIONS", "NORTH_SOUTH_PORTS"));
            b.c("LGraphUtil.computeGraphProperties", null, "g0");
            recordGraphProperties(b, "prefilled");
            add("site/lgraphutil/graphProperties/" + lower(direction), "LGraphUtil", b);
        }
        B b = new B();
        b.node("a", "g0", 10, 10).prop("a", PORT_CONSTRAINTS, E(PC, "FREE"));
        b.c("LGraphUtil.computeGraphProperties", null, "g0");
        b.q("graphProperties", "getProperty", "g0", GRAPH_PROPERTIES);
        add("site/lgraphutil/graphProperties/all-free", "LGraphUtil", b);
        b = new B();
        b.c("LGraphUtil.computeGraphProperties", null, "g0");
        b.q("graphProperties", "getProperty", "g0", GRAPH_PROPERTIES);
        add("site/lgraphutil/graphProperties/empty", "LGraphUtil", b);
    }

    static B portBase(String constraints, boolean sized) {
        B b = new B();
        b.node("n", "g0", sized ? 40 : 0, sized ? 30 : 0).c("setPosition", "n", 10.0, 20.0);
        if (constraints != null) {
            b.prop("n", PORT_CONSTRAINTS, E(PC, constraints));
        }
        return b;
    }

    static void createPorts(B b, String tag, double[] endpoint, String graph, boolean collectorUndefined) {
        for (String type : List.of("INPUT", "OUTPUT", "UNDEFINED")) {
            String name = "port." + tag + "." + type;
            Object[] args = {"n", endpoint == null ? null : List.of(endpoint[0], endpoint[1]), type, graph};
            b.q(name, "LGraphUtil.createPort", null, args);
            if (!(collectorUndefined && type.equals("UNDEFINED"))) {
                stateAll(b, name + ".state", name);
            }
        }
        b.q("graphProperties." + tag, "getProperty", graph, GRAPH_PROPERTIES);
    }

    static void s5CreatePort() {
        Map<String, B> bases = new LinkedHashMap<>();
        bases.put("free", portBase("FREE", true));
        B merge = portBase("FREE", true).prop("g0", MERGE_EDGES, Z(true));
        merge.node("n2", "g0", 40, 30).prop("n2", PORT_CONSTRAINTS, E(PC, "FIXED_SIDE"));
        bases.put("merge-edges", merge);
        B hyper = portBase("FREE", true).prop("n", HYPERNODE, Z(true));
        hyper.node("n2", "g0", 40, 30).prop("n2", PORT_CONSTRAINTS, E(PC, "FIXED_ORDER")).prop("n2", HYPERNODE, Z(true));
        bases.put("hypernode", hyper);
        String[][] dirs = {{"LEFT", null}, {"RIGHT", null}, {"UP", null}, {"DOWN", null}, {"UNDEFINED", "1.6"},
            {"UNDEFINED", "0.5"}};
        for (Map.Entry<String, B> base : bases.entrySet()) {
            B b = base.getValue();
            for (String[] d : dirs) {
                String tag = d[0] + (d[1] == null ? "" : "-aspect-" + d[1]);
                b.prop("g0", DIRECTION, E(DIR, d[0]));
                if (d[1] != null) {
                    b.prop("g0", ASPECT_RATIO, D(Double.parseDouble(d[1])));
                }
                boolean collects = base.getKey().equals("merge-edges") || base.getKey().equals("hypernode");
                createPorts(b, tag, null, "g0", collects);
                if (collects) {
                    b.q("port2." + tag, "LGraphUtil.createPort", null, "n2", null, "OUTPUT", "g0");
                    stateAll(b, "port2." + tag + ".state", "port2." + tag);
                }
            }
            add("site/lgraphutil/ports/createPort-" + base.getKey() + "-no-endpoint", "LGraphUtil", b);
        }
        double[][] endpoints = {{12, 35}, {48, 35}, {30, 22}, {30, 48}, {30, 35}, {0, 0}, {100, 100}, {2, -50}};
        for (boolean sized : new boolean[] {true, false}) {
            B b = portBase("FIXED_POS", sized);
            for (String d : List.of("LEFT", "RIGHT", "UP", "DOWN")) {
                b.prop("g0", DIRECTION, E(DIR, d));
                for (int i = 0; i < endpoints.length; i++) {
                    String name = "port." + d + ".e" + i;
                    b.q(name, "LGraphUtil.createPort", null, "n", List.of(endpoints[i][0], endpoints[i][1]),
                            i % 2 == 0 ? "INPUT" : "OUTPUT", "g0");
                    state(b, name + ".state", name, PORT_BORDER_OFFSET);
                }
                b.q("graphProperties." + d, "getProperty", "g0", GRAPH_PROPERTIES);
            }
            add("site/lgraphutil/ports/createPort-with-endpoint-" + (sized ? "sized" : "zero-size"), "LGraphUtil", b);
        }
    }

    static void s5Collector() {
        B b = new B();
        for (String s : SIDES) {
            String n = "n" + s;
            b.node(n, "g0", 40, 30);
            b.q("in." + s, "LGraphUtil.provideCollectorPort", null, "g0", n, "INPUT", s);
            stateAll(b, "in." + s + ".state", "in." + s);
            b.q("in." + s + ".again", "LGraphUtil.provideCollectorPort", null, "g0", n, "INPUT", "SOUTH");
            b.q("out." + s, "LGraphUtil.provideCollectorPort", null, "g0", n, "OUTPUT", s);
            stateAll(b, "out." + s + ".state", "out." + s);
            b.q("out." + s + ".again", "LGraphUtil.provideCollectorPort", null, "g0", n, "OUTPUT", "NORTH");
        }
        b.node("nu", "g0", 40, 30);
        b.q("undefinedType", "LGraphUtil.provideCollectorPort", null, "g0", "nu", "UNDEFINED", "EAST");
        b.q("undefinedSide", "LGraphUtil.provideCollectorPort", null, "g0", "nu", "INPUT", "UNDEFINED");
        stateAll(b, "undefinedSide.state", "undefinedSide");
        add("site/lgraphutil/ports/provideCollectorPort", "LGraphUtil", b);
    }

    static final double[][] INIT_POSITIONS = {{-6, 10}, {44, 10}, {10, -8}, {10, 32}, {18, 13}, {30, 3}, {30, 20},
        {18, 22}, {0, 0}};

    static void s5Initialize() {
        for (String d : DIRECTIONS) {
            B b = portBase(null, true);
            int k = 0;
            for (String constraints : List.of("FREE", "FIXED_SIDE", "FIXED_RATIO")) {
                for (double[] pos : INIT_POSITIONS) {
                    String q = "q" + k++;
                    b.mk(q, "newLPort").c("setSize", q, 4.0, 4.0).c("setPosition", q, pos[0], pos[1]).c("setNode", q, "n");
                    b.c("LGraphUtil.initializePort", null, q, constraints, d, null);
                    state(b, q + ".after", q, PORT_BORDER_OFFSET, PORT_RATIO_OR_POSITION);
                }
            }
            add("site/lgraphutil/ports/initializePort-undefined-side-" + lower(d), "LGraphUtil", b);
        }
        B b = portBase(null, false);
        int k = 0;
        for (String constraints : List.of("FIXED_SIDE", "FIXED_RATIO")) {
            for (String side : ALL_SIDES) {
                String q = "q" + k++;
                b.mk(q, "newLPort").c("setSize", q, 4.0, 4.0).c("setPosition", q, 10.0, 10.0).c("setNode", q, "n");
                if (!side.equals("UNDEFINED")) {
                    b.c("setSide", q, side);
                }
                b.c("LGraphUtil.initializePort", null, q, constraints, "RIGHT", null);
                state(b, q + ".after", q, PORT_BORDER_OFFSET, PORT_RATIO_OR_POSITION);
            }
        }
        add("site/lgraphutil/ports/initializePort-zero-size", "LGraphUtil", b);

        b = portBase(null, true);
        k = 0;
        for (String constraints : List.of("FREE", "FIXED_SIDE", "FIXED_ORDER", "FIXED_RATIO", "FIXED_POS", "UNDEFINED")) {
            for (String side : SIDES) {
                for (boolean anchor : new boolean[] {false, true}) {
                    String q = "q" + k++;
                    b.mk(q, "newLPort").c("setSize", q, 4.0, 4.0).c("setPosition", q, 10.0, 12.0).c("setNode", q, "n")
                            .c("setSide", q, side);
                    b.c("LGraphUtil.initializePort", null, q, constraints, "RIGHT", anchor ? List.of(1.0, 2.0) : null);
                    state(b, q + ".after", q, PORT_RATIO_OR_POSITION);
                }
            }
        }
        add("site/lgraphutil/ports/initializePort-defined-side", "LGraphUtil", b);

        b = portBase(null, true);
        k = 0;
        for (String constraints : List.of("FREE", "FIXED_SIDE", "FIXED_RATIO")) {
            for (double[] pos : INIT_POSITIONS) {
                String q = "q" + k++;
                b.mk(q, "newLPort").c("setSize", q, 4.0, 4.0).c("setPosition", q, pos[0], pos[1]).c("setNode", q, "n");
                b.c("LGraphUtil.initializePort", null, q, constraints, "RIGHT", List.of(2.5, 1.5));
                state(b, q + ".after", q, PORT_BORDER_OFFSET, PORT_RATIO_OR_POSITION);
            }
        }
        add("site/lgraphutil/ports/initializePort-undefined-side-explicit-anchor", "LGraphUtil", b);

        b = portBase(null, true);
        for (boolean preset : new boolean[] {false, true}) {
            String q = "q" + preset;
            b.mk(q, "newLPort").c("setSize", q, 4.0, 4.0).c("setPosition", q, 44.0, 10.0).c("setNode", q, "n");
            if (preset) {
                b.prop(q, PORT_BORDER_OFFSET, D(7.0));
            }
            b.c("LGraphUtil.initializePort", null, q, "FIXED_SIDE", "RIGHT", null);
            state(b, q + ".after", q, PORT_BORDER_OFFSET);
        }
        add("site/lgraphutil/ports/initializePort-border-offset-preset", "LGraphUtil", b);
    }

    static void s5() {
        s5CreatePort();
        s5Collector();
        s5Initialize();
    }

    // ------------------------------------------------------------------------------------------------------------
    // S6-S9: external port dummies, other LGraphUtil members, Spacings, Tarjan

    static B externalBase() {
        B b = new B();
        b.c("setSize", "g0", 120.0, 90.0).c("setPadding", "g0", 5.0, 6.0, 7.0, 8.0).c("setOffset", "g0", 2.0, 3.0);
        b.mk("holder", "newLPort");
        return b;
    }

    /** Creates the dummy of a holder, then records it, its port and the position the graph reports for its side. */
    static void externalDummy(B b, String constraints, String side, int netFlow, String direction) {
        b.q("dummy", "LGraphUtil.createExternalPortDummy", null, "holder", constraints, side, netFlow,
                List.of(100.0, 80.0), List.of(7.0, 9.0), List.of(6.0, 4.0), direction, "g0");
        stateAll(b, "dummy.state", "dummy");
        b.q("dummyPort", "portAt", "dummy", 0);
        stateAll(b, "dummyPort.state", "dummyPort");
        b.c("setPosition", "dummy", 30.0, 40.0);
        b.q("position", "LGraphUtil.getExternalPortPosition", null, "g0", "dummy", 6.0, 4.0);
        state(b, "dummy.moved", "dummy", EXT_PORT_SIDE);
        stateAll(b, "holder.state", "holder");
    }

    static void s6() {
        for (String side : SIDES) {
            for (boolean explicit : new boolean[] {false, true}) {
                for (boolean negative : new boolean[] {true, false}) {
                    B b = externalBase();
                    b.prop("holder", PORT_BORDER_OFFSET, D(negative ? -4.0 : 3.0));
                    if (explicit) {
                        b.prop("holder", PORT_ANCHOR, tv("vector", List.of(1.5, 2.5)));
                    }
                    externalDummy(b, "FIXED_POS", side, 0, "RIGHT");
                    add("site/lgraphutil/externalPorts/" + lower(side) + "-" + (explicit ? "explicit" : "implicit")
                            + "-anchor-" + (negative ? "negative" : "positive") + "-offset", "LGraphUtil", b);
                }
            }
        }
        for (String side : SIDES) {
            B b = externalBase().prop("holder", PORT_INDEX, I(3));
            externalDummy(b, "FIXED_ORDER", side, 0, "RIGHT");
            add("site/lgraphutil/externalPorts/fixed-order-index-" + lower(side), "LGraphUtil", b);
            b = externalBase();
            externalDummy(b, "FIXED_ORDER", side, 0, "RIGHT");
            add("site/lgraphutil/externalPorts/fixed-order-no-index-" + lower(side), "LGraphUtil", b);
            b = externalBase();
            externalDummy(b, "FIXED_RATIO", side, 0, "RIGHT");
            add("site/lgraphutil/externalPorts/fixed-ratio-" + lower(side), "LGraphUtil", b);
            b = externalBase();
            externalDummy(b, "FIXED_SIDE", side, 0, "RIGHT");
            add("site/lgraphutil/externalPorts/fixed-side-" + lower(side), "LGraphUtil", b);
        }
        B b = externalBase();
        externalDummy(b, "FIXED_SIDE", "UNDEFINED", 0, "RIGHT");
        add("site/lgraphutil/externalPorts/fixed-side-undefined", "LGraphUtil", b);
        for (String direction : List.of("RIGHT", "LEFT", "UP", "DOWN", "UNDEFINED")) {
            for (int netFlow : new int[] {1, 0, -1}) {
                b = externalBase();
                externalDummy(b, netFlow == 0 ? "UNDEFINED" : "FREE", "UNDEFINED", netFlow, direction);
                add("site/lgraphutil/externalPorts/free-" + lower(direction) + "-netflow" + (netFlow < 0 ? "-negative" : netFlow == 0 ? "-zero" : "-positive"),
                        "LGraphUtil", b);
            }
        }
    }

    static void s7() {
        B b = new B();
        b.prop("g0", SPACING_NODE_NODE, D(20.0)).prop("g0", id(CoreOptions.SPACING_EDGE_NODE), D(21.0));
        b.node("plain", "g0", 10, 10);
        b.node("emptyIndividual", "g0", 10, 10).prop("emptyIndividual", SPACING_INDIVIDUAL, individual(new LinkedHashMap<>()));
        b.node("otherIndividual", "g0", 10, 10).prop("otherIndividual", SPACING_INDIVIDUAL,
                individual(Map.of(id(CoreOptions.SPACING_EDGE_NODE), D(7.0))));
        b.node("individual", "g0", 10, 10).prop("individual", SPACING_INDIVIDUAL,
                individual(Map.of(SPACING_NODE_NODE, D(5.0))));
        b.mk("loose", "newLNode", (Object) null);
        b.mk("looseIndividual", "newLNode", (Object) null).prop("looseIndividual", SPACING_INDIVIDUAL,
                individual(Map.of(SPACING_NODE_NODE, D(6.0))));
        b.mk("looseEmptyIndividual", "newLNode", (Object) null).prop("looseEmptyIndividual", SPACING_INDIVIDUAL,
                individual(new LinkedHashMap<>()));
        for (String n : List.of("plain", "emptyIndividual", "otherIndividual", "individual", "loose", "looseIndividual",
                "looseEmptyIndividual")) {
            b.q(n + ".nodeNode", "LGraphUtil.getIndividualOrInherited", null, n, SPACING_NODE_NODE);
        }
        add("site/lgraphutil/other/individualOrInherited", "LGraphUtil", b);

        b = new B();
        b.q("empty", "LGraphUtil.getMinimalModelOrder", null, "g0");
        b.node("a", "g0", 1, 1).node("b", "g0", 1, 1).node("c", "g0", 1, 1);
        b.q("noOrders", "LGraphUtil.getMinimalModelOrder", null, "g0");
        b.prop("a", MODEL_ORDER, I(5)).prop("c", MODEL_ORDER, I(2));
        b.q("withOrders", "LGraphUtil.getMinimalModelOrder", null, "g0");
        b.prop("b", MODEL_ORDER, I(9));
        b.q("withMore", "LGraphUtil.getMinimalModelOrder", null, "g0");
        add("site/lgraphutil/other/minimalModelOrder", "LGraphUtil", b);

        b = new B();
        b.q("rightByDefault", "LGraphUtil.getDirection", null, "g0");
        b.prop("g0", ASPECT_RATIO, D(0.5)).q("downByAspect", "LGraphUtil.getDirection", null, "g0");
        b.prop("g0", ASPECT_RATIO, D(1.0)).q("rightAtOne", "LGraphUtil.getDirection", null, "g0");
        b.prop("g0", DIRECTION, E(DIR, "UP")).q("up", "LGraphUtil.getDirection", null, "g0");
        add("site/lgraphutil/other/direction", "LGraphUtil", b);
    }

    // ---- S8: Spacings ----

    static final List<IProperty<Double>> SPACING_OPTIONS = List.of(LayeredOptions.SPACING_NODE_NODE,
            LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, LayeredOptions.SPACING_EDGE_NODE,
            LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS, LayeredOptions.SPACING_EDGE_EDGE,
            LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS, LayeredOptions.SPACING_LABEL_NODE,
            LayeredOptions.SPACING_PORT_PORT, LayeredOptions.SPACING_LABEL_PORT_VERTICAL,
            LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL);

    /** The (type, type) cells the precomputed table of a Spacings fills, by reflection on its private arrays. */
    static List<String[]> spacingCells(boolean horizontal) {
        try {
            Field f = Spacings.class.getDeclaredField(horizontal ? "nodeTypeSpacingOptionsHorizontal"
                    : "nodeTypeSpacingOptionsVertical");
            f.setAccessible(true);
            Object[][] table = (Object[][]) f.get(new Spacings(new LGraph()));
            List<String[]> cells = new ArrayList<>();
            LNode.NodeType[] types = LNode.NodeType.values();
            for (int i = 0; i < table.length; i++) {
                for (int j = 0; j < table.length; j++) {
                    if (table[i][j] != null) {
                        cells.add(new String[] {types[i].name(), types[j].name()});
                    }
                }
            }
            return cells;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("cannot read the spacing table", e);
        }
    }

    static B spacingsBase() {
        B b = new B();
        double v = 11;
        for (IProperty<Double> p : SPACING_OPTIONS) {
            b.prop("g0", id(p), D(v++));
        }
        for (String t : NODE_TYPES) {
            b.mk("t." + t, "newLNode", "g0").c("setType", "t." + t, t);
            b.mk("o." + t, "newLNode", "g0").c("setType", "o." + t, t);
            Map<String, Object> over = new LinkedHashMap<>();
            over.put(id(LayeredOptions.SPACING_NODE_NODE), D(101));
            over.put(id(LayeredOptions.SPACING_EDGE_EDGE), D(102));
            over.put(id(LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS), D(103));
            b.prop("o." + t, SPACING_INDIVIDUAL, individual(over));
        }
        b.mk("sp", "newSpacings", "g0");
        return b;
    }

    static void s8() {
        for (boolean horizontal : new boolean[] {true, false}) {
            String dir = horizontal ? "horizontal" : "vertical";
            B nodes = spacingsBase(), types = spacingsBase();
            for (String[] cell : spacingCells(horizontal)) {
                String key = cell[0] + "." + cell[1];
                String op = horizontal ? "getHorizontalSpacing" : "getVerticalSpacing";
                nodes.q("plain.plain." + key, op + "Nodes", "sp", "t." + cell[0], "t." + cell[1]);
                nodes.q("over.plain." + key, op + "Nodes", "sp", "o." + cell[0], "t." + cell[1]);
                nodes.q("plain.over." + key, op + "Nodes", "sp", "t." + cell[0], "o." + cell[1]);
                nodes.q("over.over." + key, op + "Nodes", "sp", "o." + cell[0], "o." + cell[1]);
                types.q(key, op + "Types", "sp", cell[0], cell[1]);
            }
            add("site/spacings/" + dir + "-nodes", "Spacings", nodes);
            add("site/spacings/" + dir + "-node-types", "Spacings", types);
        }
        B b = spacingsBase();
        b.node("n1", "g0", 1, 1).node("n2", "g0", 1, 1);
        b.mk("lbl", "newLLabel", "x");
        b.mk("holderPort", "newLPort");
        b.q("nodes", "getHorizontalSpacingElements", "sp", "n1", "n2");
        b.q("nodeAndLabel", "getHorizontalSpacingElements", "sp", "n1", "lbl");
        b.q("labelAndNode", "getHorizontalSpacingElements", "sp", "lbl", "n1");
        b.q("portAndPort", "getHorizontalSpacingElements", "sp", "holderPort", "holderPort");
        b.q("graphAndNode", "getHorizontalSpacingElements", "sp", "g0", "n1");
        add("site/spacings/horizontal-elements", "Spacings", b);

        b = spacingsBase();
        b.node("plain", "g0", 1, 1).node("withIndividual", "g0", 1, 1).node("emptyIndividual", "g0", 1, 1);
        b.prop("withIndividual", SPACING_INDIVIDUAL, individual(Map.of(SPACING_NODE_NODE, D(77.0))));
        b.prop("emptyIndividual", SPACING_INDIVIDUAL, individual(new LinkedHashMap<>()));
        for (String n : List.of("plain", "withIndividual", "emptyIndividual")) {
            b.q(n + ".nodeNode", "Spacings.getIndividualOrDefault", null, n, SPACING_NODE_NODE);
            b.q(n + ".edgeEdge", "Spacings.getIndividualOrDefault", null, n, id(LayeredOptions.SPACING_EDGE_EDGE));
        }
        add("site/spacings/individualOrDefault", "Spacings", b);
    }

    // ---- S9: Tarjan ----

    /** Nodes n0..n8 with the edges below; every edge gets an out port on its source and an in port on its target. */
    static B tarjanBase(int[][] edges) {
        B b = new B();
        for (int i = 0; i < 9; i++) {
            b.node("n" + i, "g0", 10, 10);
        }
        for (int i = 0; i < edges.length; i++) {
            b.mk("po" + i, "newLPort").c("setNode", "po" + i, "n" + edges[i][0]);
            b.mk("pi" + i, "newLPort").c("setNode", "pi" + i, "n" + edges[i][1]);
            b.edge("e" + i, "po" + i, "pi" + i);
        }
        return b;
    }

    static final int[][] TARJAN_EDGES = {{0, 1}, {1, 2}, {2, 0}, {2, 3}, {3, 4}, {4, 3}, {4, 5}, {5, 6}, {6, 6}, {7, 7},
        {1, 0}};

    static void recordTarjan(B b, String tag, int edgeCount) {
        for (int i = 0; i < 9; i++) {
            b.q("n" + i + ".id." + tag, "getProperty", "n" + i, TARJAN_ID);
            b.q("n" + i + ".lowlink." + tag, "getProperty", "n" + i, TARJAN_LOWLINK);
            b.q("n" + i + ".onStack." + tag, "getProperty", "n" + i, TARJAN_ON_STACK);
        }
        for (int i = 0; i < edgeCount; i++) {
            b.q("e" + i + ".cycle." + tag, "getProperty", "e" + i, IS_PART_OF_CYCLE);
        }
        b.q("components." + tag, "tarjanComponents", "t");
        b.q("componentIds." + tag, "tarjanComponentIds", "t");
    }

    static void s9() {
        List<List<Integer>> reversals = List.of(List.of(), List.of(2), List.of(2, 4, 8), List.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
        for (List<Integer> reversed : reversals) {
            B b = tarjanBase(TARJAN_EDGES);
            List<Object> names = new ArrayList<>();
            reversed.forEach(i -> names.add("e" + i));
            b.mk("t", "newTarjan", names);
            for (int i : reversed) {
                b.c("setProperty", "e" + i, IS_PART_OF_CYCLE, Z(true));
            }
            b.c("resetTarjan", "t", "g0");
            recordTarjan(b, "reset", TARJAN_EDGES.length);
            b.c("tarjan", "t", "g0");
            recordTarjan(b, "run", TARJAN_EDGES.length);
            b.c("tarjan", "t", "g0");
            recordTarjan(b, "again", TARJAN_EDGES.length);
            b.c("resetTarjan", "t", "g0");
            b.c("tarjan", "t", "g0");
            recordTarjan(b, "afterReset", TARJAN_EDGES.length);
            add("site/tarjan/reversed-" + (reversed.isEmpty() ? "none" : String.join("-", reversed.stream().map(String::valueOf).toList())),
                    "Tarjan", b);
        }
        B b = tarjanBase(TARJAN_EDGES);
        b.mk("t", "newTarjan", List.of());
        b.c("resetTarjan", "t", "g0");
        b.c("stronglyConnected", "t", "n0");
        recordTarjan(b, "fromN0", TARJAN_EDGES.length);
        b.c("stronglyConnected", "t", "n7");
        recordTarjan(b, "andN7", TARJAN_EDGES.length);
        add("site/tarjan/direct-visit", "Tarjan", b);
    }

    // ------------------------------------------------------------------------------------------------------------
    // S10: LGraphAdapters

    static final String[] A_PORTS = {"pn1", "pn2", "pe1", "pe2", "ps1", "ps2", "pw1", "pw2"};

    /** Two layers: L0 holds A (all sides, labels, comments), D (north/south port dummy); L1 holds B, X, Y. */
    static B adapterGraph() {
        B b = new B();
        b.mk("L0", "newLayer", "g0").c("layersAdd", "g0", "L0").mk("L1", "newLayer", "g0").c("layersAdd", "g0", "L1");
        b.mk("A", "newLNode", "g0").c("setLayer", "A", "L0").c("setSize", "A", 60.0, 40.0)
                .c("setMargin", "A", 1.0, 2.0, 3.0, 4.0).c("setPadding", "A", 5.0, 6.0, 7.0, 8.0);
        b.prop("A", COMPOUND_NODE, Z(true)).prop("A", PORT_CONSTRAINTS, E(PC, "FIXED_ORDER"));
        double[][] at = {{10, -8}, {30, -8}, {60, 10}, {60, 25}, {45, 40}, {15, 40}, {-8, 30}, {-8, 5}};
        String[] sides = {"NORTH", "NORTH", "EAST", "EAST", "SOUTH", "SOUTH", "WEST", "WEST"};
        String[] names = {"pn1", "pn2", "pe1", "pe2", "ps1", "ps2", "pw1", "pw2"};
        for (int i = 0; i < names.length; i++) {
            b.port(names[i], "A", sides[i], at[i][0], at[i][1], 8, 8);
            b.label(names[i] + ".l", names[i], "port " + names[i], 1.0 + i, 2.0, 20.0, 10.0);
        }
        b.prop("pw1", INSIDE_CONNECTIONS, Z(true));
        b.label("A.l", "A", "node A", 3.0, 4.0, 30.0, 12.0);
        b.prop("A.l", LABEL_SIDE, E("LabelSide", "ABOVE"));
        b.mk("D", "newLNode", "g0").c("setLayer", "D", "L0").c("setType", "D", "NORTH_SOUTH_PORT")
                .c("setSize", "D", 2.0, 2.0);
        b.port("D.in", "D", "WEST", 0, 0, 2, 2).port("D.out", "D", "EAST", 2, 0, 2, 2);
        b.prop("pn1", PORT_DUMMY, ref("D"));
        b.mk("B", "newLNode", "g0").c("setLayer", "B", "L1").c("setSize", "B", 30.0, 20.0);
        b.port("B.w", "B", "WEST", -4, 8, 4, 4).port("B.e", "B", "EAST", 30, 8, 4, 4);
        b.mk("X", "newLNode", "g0").c("setLayer", "X", "L1").c("setSize", "X", 10.0, 10.0);
        b.port("X.out", "X", "EAST", 10, 3, 4, 4).port("X.in", "X", "WEST", -4, 3, 4, 4);
        b.edge("eAB", "pe1", "B.w").label("eAB.l", "eAB", "edge", 2.0, 3.0, 25.0, 9.0)
                .prop("eAB.l", LABEL_SIDE, E("LabelSide", "BELOW"));
        b.edge("eXD", "X.out", "D.in").edge("eDX", "D.out", "X.in").edge("eBA", "B.e", "pw1");
        b.mk("C1", "newLNode", "g0").c("setSize", "C1", 20.0, 8.0).mk("C2", "newLNode", "g0").c("setSize", "C2", 21.0, 9.0)
                .mk("C3", "newLNode", "g0").c("setSize", "C3", 22.0, 10.0);
        b.prop("A", TOP_COMMENTS, List.of(ref("C1"), ref("C2"))).prop("A", BOTTOM_COMMENTS, List.of(ref("C3")));
        return b;
    }

    static void geometryOf(B b, String adapter, String tag) {
        b.q(tag + ".size", "getSize", adapter).q(tag + ".position", "getPosition", adapter)
                .q(tag + ".volatileId", "getVolatileId", adapter);
    }

    static void s10Graph() {
        B b = adapterGraph();
        b.q("ga", "LGraphAdapters.adaptGraph", null, "g0");
        for (int i = 0; i < 4; i++) {
            b.q("na" + i, "adapterAt", "ga", "nodes", i);
        }
        b.q("nodes", "adapterItems", "ga", "nodes");
        b.q("size", "getSize", "ga").c("setSize", "ga", 70.0, 50.0).q("size.after", "getSize", "ga")
                .q("graphSize.after", "getSize", "g0");
        b.q("volatileId", "getVolatileId", "ga").c("setVolatileId", "ga", 7).q("volatileId.after", "getVolatileId", "ga")
                .q("graphId.after", "getVolatileId", "ga");
        b.q("hasDirection", "hasProperty", "ga", DIRECTION).q("direction", "getProperty", "ga", DIRECTION);
        b.q("position", "getPosition", "ga").q("setPosition", "setPosition", "ga", 1.0, 2.0);
        add("site/lgraphAdapters/graph-adapter", "LGraphAdapters", b);

        b = adapterGraph();
        b.q("ga", "LGraphAdapters.adaptGraphTransparent", null, "g0", true);
        b.q("nodes", "adapterItems", "ga", "nodes");
        add("site/lgraphAdapters/graph-adapter-transparent", "LGraphAdapters", b);

        for (String filter : List.of("all", "normal", "none")) {
            b = adapterGraph();
            for (boolean ns : new boolean[] {false, true}) {
                for (boolean comments : new boolean[] {false, true}) {
                    String ga = "ga." + ns + "." + comments;
                    b.q(ga, "LGraphAdapters.adaptGraphFiltered", null, "g0", ns, comments, filter);
                    b.q(ga + ".nodes", "adapterItems", ga, "nodes");
                }
            }
            add("site/lgraphAdapters/graph-adapter-filter-" + filter, "LGraphAdapters", b);
        }
    }

    static void s10Nodes() {
        B b = adapterGraph();
        b.q("ga", "LGraphAdapters.adaptGraphFiltered", null, "g0", true, true, "all");
        String[] names = {"A", "C1", "C2", "C3", "D", "B", "X"};
        for (int i = 0; i < names.length; i++) {
            String na = "na" + i;
            b.q(na, "adapterAt", "ga", "nodes", i);
            b.q(na + ".element", "adapterElement", na);
            geometryOf(b, na, na);
            b.q(na + ".margin", "getMargin", na).q(na + ".padding", "getPadding", na)
                    .q(na + ".compound", "isCompoundNode", na).q(na + ".graph", "getGraph", na);
            b.q(na + ".ports", "adapterItems", na, "ports").q(na + ".labels", "adapterItems", na, "labels");
            b.q(na + ".incoming", "getIncomingEdges", na).q(na + ".outgoing", "getOutgoingEdges", na);
        }
        b.c("setSize", "na0", 80.0, 45.0).c("setPosition", "na0", 11.0, 12.0)
                .c("setMargin", "na0", 9.0, 8.0, 7.0, 6.0).c("setPadding", "na0", 1.0, 2.0, 3.0, 4.0)
                .c("setVolatileId", "na0", 42);
        stateAll(b, "A.after", "A");
        b.q("na0.hasProperty", "hasProperty", "na0", COMPOUND_NODE).q("na0.property", "getProperty", "na0", COMPOUND_NODE);
        add("site/lgraphAdapters/node-adapters", "LGraphAdapters", b);

        b = adapterGraph();
        b.q("standalone", "LGraphAdapters.adaptNode", null, "A", true).q("standalone.graph", "getGraph", "standalone");
        b.q("standalone.ports", "adapterItems", "standalone", "ports");
        b.q("plain", "LGraphAdapters.adaptNode", null, "B", false).q("plain.graph", "getGraph", "plain");
        add("site/lgraphAdapters/node-adapter-standalone", "LGraphAdapters", b);
    }

    static void s10Ports() {
        for (boolean ns : new boolean[] {false, true}) {
            B b = adapterGraph();
            b.q("ga", "LGraphAdapters.adaptGraphFiltered", null, "g0", ns, false, "all");
            for (int i = 0; i < 4; i++) {
                b.q("na" + i, "adapterAt", "ga", "nodes", i);
            }
            for (int i = 0; i < A_PORTS.length; i++) {
                String pa = "pa" + i;
                b.q(pa, "adapterAt", "na0", "ports", i);
                geometryOf(b, pa, pa);
                b.q(pa + ".side", "getSide", pa).q(pa + ".margin", "getMargin", pa)
                        .q(pa + ".compound", "hasCompoundConnections", pa);
                b.q(pa + ".labels", "adapterItems", pa, "labels");
                b.q(pa + ".incoming", "getIncomingEdges", pa).q(pa + ".outgoing", "getOutgoingEdges", pa);
            }
            b.c("setMargin", "pa0", 1.0, 2.0, 3.0, 4.0).c("setPosition", "pa0", 5.0, 6.0).c("setSize", "pa0", 7.0, 8.0);
            stateAll(b, "pn1.after", "pn1");
            b.q("dummyPort", "adapterAt", "na1", "ports", 0).q("dummyPort.incoming", "getIncomingEdges", "dummyPort")
                    .q("dummyPort.outgoing", "getOutgoingEdges", "dummyPort");
            b.q("pa0.labels.again", "adapterItems", "pa0", "labels").q("pa0.incoming.again", "getIncomingEdges", "pa0");
            add("site/lgraphAdapters/port-adapters-" + (ns ? "transparent" : "plain"), "LGraphAdapters", b);
        }
    }

    static void s10Labels() {
        B b = adapterGraph();
        b.q("ga", "LGraphAdapters.adaptGraphFiltered", null, "g0", false, false, "all");
        b.q("na0", "adapterAt", "ga", "nodes", 0).q("pa0", "adapterAt", "na0", "ports", 0)
                .q("pa2", "adapterAt", "na0", "ports", 2);
        b.q("nodeLabel", "adapterAt", "na0", "labels", 0).q("portLabel", "adapterAt", "pa0", "labels", 0);
        for (String l : List.of("nodeLabel", "portLabel")) {
            b.q(l + ".text", "getText", l).q(l + ".side", "getSide", l);
            geometryOf(b, l, l);
            b.q(l + ".element", "adapterElement", l);
        }
        b.c("setSize", "nodeLabel", 31.0, 13.0).c("setPosition", "nodeLabel", 4.0, 5.0);
        stateAll(b, "A.l.after", "A.l");
        b.q("loose", "LGraphAdapters.adaptLabel", null, "pn2.l").q("loose.text", "getText", "loose")
                .q("loose.side", "getSide", "loose").q("loose.hasSide", "hasProperty", "loose", LABEL_SIDE);
        b.q("edge", "adapterAt", "pa2", "outgoing", 0).q("edge.element", "adapterElement", "edge")
                .q("edge.labels", "adapterItems", "edge", "edgeLabels");
        b.q("edgeLabel", "adapterAt", "edge", "edgeLabels", 0).q("edgeLabel.text", "getText", "edgeLabel")
                .q("edgeLabel.side", "getSide", "edgeLabel");
        add("site/lgraphAdapters/label-and-edge-adapters", "LGraphAdapters", b);
    }

    static void s10Sort() {
        B b = new B();
        Object[][] ports = {{"s2", "SOUTH", 40.0, 0.0, null}, {"w2", "WEST", 0.0, 30.0, null},
            {"n1", "NORTH", 30.0, 0.0, null}, {"e1", "EAST", 0.0, 5.0, null}, {"s1", "SOUTH", 10.0, 0.0, null},
            {"e2", "EAST", 0.0, 20.0, null}, {"w1", "WEST", 0.0, 5.0, null}, {"n2", "NORTH", 5.0, 0.0, null},
            {"i1", "EAST", 0.0, 50.0, 1}, {"i0", "EAST", 0.0, 60.0, 0}, {"i1b", "EAST", 0.0, 10.0, 1}};
        for (String constraints : List.of("FIXED_ORDER", "FIXED_POS", "FREE", "FIXED_SIDE")) {
            String n = "S." + constraints;
            b.node(n, "g0", 50, 50).prop(n, PORT_CONSTRAINTS, E(PC, constraints));
            for (Object[] p : ports) {
                String name = n + "." + p[0];
                b.port(name, n, (String) p[1], (Double) p[2], (Double) p[3], 2, 2);
                if (p[4] != null) {
                    b.prop(name, PORT_INDEX, I((Integer) p[4]));
                }
            }
            b.q(n + ".adapter", "LGraphAdapters.adaptNode", null, n, false).c("sortPortList", n + ".adapter");
            b.q(n + ".order", "getPorts", n);
        }
        b.node("U", "g0", 50, 50).prop("U", PORT_CONSTRAINTS, E(PC, "FIXED_ORDER"));
        b.mk("u1", "newLPort").c("setNode", "u1", "U").mk("u2", "newLPort").c("setNode", "u2", "U");
        b.q("U.adapter", "LGraphAdapters.adaptNode", null, "U", false).q("U.sort", "sortPortList", "U.adapter");
        add("site/lgraphAdapters/sortPortList", "LGraphAdapters", b);
    }

    static void s10Compare() {
        B b = new B();
        b.node("n", "g0", 50, 50);
        Object[][] ports = {{"n1", "NORTH", 10.0, 0.0, null}, {"n2", "NORTH", 30.0, 0.0, null},
            {"e1", "EAST", 0.0, 10.0, null}, {"e2", "EAST", 0.0, 30.0, null}, {"s1", "SOUTH", 10.0, 0.0, null},
            {"s2", "SOUTH", 30.0, 0.0, null}, {"w1", "WEST", 0.0, 10.0, null}, {"w2", "WEST", 0.0, 30.0, null},
            {"i1", "EAST", 0.0, 50.0, 1}, {"i2", "EAST", 0.0, 5.0, 2}, {"i3", "EAST", 0.0, 7.0, 2}};
        for (Object[] p : ports) {
            b.port("c." + p[0], "n", (String) p[1], (Double) p[2], (Double) p[3], 2, 2);
            if (p[4] != null) {
                b.prop("c." + p[0], PORT_INDEX, I((Integer) p[4]));
            }
        }
        b.mk("c.u1", "newLPort").c("setNode", "c.u1", "n").mk("c.u2", "newLPort").c("setNode", "c.u2", "n");
        String[][] pairs = {{"n1", "n2"}, {"n2", "n1"}, {"n1", "n1"}, {"e1", "e2"}, {"e2", "e1"}, {"s1", "s2"},
            {"s2", "s1"}, {"w1", "w2"}, {"w2", "w1"}, {"n1", "e1"}, {"e1", "n1"}, {"w1", "s1"}, {"i1", "i2"},
            {"i2", "i1"}, {"i2", "i3"}, {"i1", "e1"}, {"e1", "i1"}, {"u1", "u2"}, {"u1", "n1"}, {"n1", "u1"}};
        for (String[] pr : pairs) {
            b.q("compare." + pr[0] + "." + pr[1], "LGraphAdapters.compare", null, "c." + pr[0], "c." + pr[1]);
        }
        add("site/lgraphAdapters/portComparator", "LGraphAdapters", b);
    }

    static void s10() {
        s10Graph();
        s10Nodes();
        s10Ports();
        s10Labels();
        s10Sort();
        s10Compare();
    }

    // ------------------------------------------------------------------------------------------------------------
    // S11-S15: ElkGraphImporter / ElkGraphLayoutTransferrer rows over ELK JSON

    // ---- ELK JSON text builders (single quotes become double quotes in elkJson) ----

    static String js(String s) {
        return "'" + s + "'";
    }

    static String obj(String... fields) {
        List<String> kept = new ArrayList<>();
        for (String f : fields) {
            if (f != null && !f.isEmpty()) {
                kept.add(f);
            }
        }
        return "{" + String.join(",", kept) + "}";
    }

    static String jid(String id) {
        return "'id':" + js(id);
    }

    static String dim(double w, double h) {
        return "'width':" + w + ",'height':" + h;
    }

    static String at(double x, double y) {
        return "'x':" + x + ",'y':" + y;
    }

    /** 'layoutOptions':{...} from (property or id, value) pairs; the values are strings. */
    static String lo(Object... kv) {
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < kv.length; i += 2) {
            String key = kv[i] instanceof IProperty<?> p ? p.getId() : (String) kv[i];
            parts.add(js(key) + ":" + js((String) kv[i + 1]));
        }
        return "'layoutOptions':{" + String.join(",", parts) + "}";
    }

    static String arr(String name, String... items) {
        List<String> kept = new ArrayList<>();
        for (String i : items) {
            if (!i.isEmpty()) {
                kept.add(i);
            }
        }
        return kept.isEmpty() ? "" : "'" + name + "':[" + String.join(",", kept) + "]";
    }

    static String port(String id, double x, double y, String side, String... more) {
        List<String> f = new ArrayList<>(List.of(jid(id), at(x, y), dim(6, 6)));
        if (side != null) {
            f.add(lo(CoreOptions.PORT_SIDE, side));
        }
        f.addAll(Arrays.asList(more));
        return obj(f.toArray(new String[0]));
    }

    static String label(String text, double x, double y, String... more) {
        List<String> f = new ArrayList<>(List.of("'text':" + js(text), at(x, y), dim(20, 8)));
        f.addAll(Arrays.asList(more));
        return obj(f.toArray(new String[0]));
    }

    static String edge(String id, String source, String target, String... more) {
        List<String> f = new ArrayList<>(List.of(jid(id), "'sources':[" + js(source) + "]", "'targets':[" + js(target) + "]"));
        f.addAll(Arrays.asList(more));
        return obj(f.toArray(new String[0]));
    }

    static String leaf(String id, double w, double h, String... more) {
        List<String> f = new ArrayList<>(List.of(jid(id), dim(w, h)));
        f.addAll(Arrays.asList(more));
        return obj(f.toArray(new String[0]));
    }

    record TransformCase(String id, String group, Supplier<ElkNode> prepare, String target) { }

    static final Map<String, TransformCase> CASES = new LinkedHashMap<>();

    /** Cases whose import throws (the row records the exception and stops there). */
    static final Set<String> IMPORT_THROWS = new HashSet<>();

    static void throwsAtImport(String group, String name) {
        IMPORT_THROWS.add("site/transform/" + group + "/" + name);
    }

    static void transformCase(String group, String name, String json, String target) {
        String id = "site/transform/" + group + "/" + name;
        CASES.put(id, new TransformCase(id, group, elkJson(json), target));
    }

    static void transformCase(String group, String name, Supplier<ElkNode> prepare, String target) {
        String id = "site/transform/" + group + "/" + name;
        CASES.put(id, new TransformCase(id, group, prepare, target));
    }

    /** import (optionally a nested target), dump the LGraph, transfer back, export the ELK graph. */
    static B transformSteps(String target, boolean importOnly) {
        B b = new B();
        b.q("graph", "importGraph", "elk", target);
        if (importOnly) {
            return b;
        }
        b.q("lgraph", "dumpLGraph", "g0");
        b.c("applyLayout", "g0");
        b.q("elk", "exportElk", "elk");
        return b;
    }

    // ---- S11: external ports ----

    /** The inner node's ports: edge votes, a port without edges, outside edges, self loops. */
    static String externalPortsJson(String constraints, String placement, boolean labels, boolean edges, boolean sides,
            boolean borderOffsets, String direction, boolean selfLoops) {
        String[][] ps = {{"pA", "200", "20", "EAST"}, {"pB", "0", "30", "WEST"}, {"pC", "200", "50", "EAST"},
            {"pD", "0", "0", "NORTH"}, {"pE", "0", "70", "WEST"}, {"pF", "60", "100", "SOUTH"},
            {"pS1", "30", "0", "NORTH"}, {"pS2", "30", "100", "SOUTH"}, {"pS3", "200", "80", "EAST"},
            {"pS4", "200", "90", "EAST"}};
        List<String> ports = new ArrayList<>();
        for (String[] p : ps) {
            List<String> more = new ArrayList<>();
            if (labels) {
                boolean extra = p[0].equals("pB") || p[0].equals("pE");
                more.add(arr("labels", label("lbl " + p[0], p[3].equals("WEST") ? -24 : 8, -1),
                        extra ? label("", 0, 0) : "", extra ? label("hidden " + p[0], 0, 0, lo(CoreOptions.NO_LAYOUT, "true")) : ""));
            }
            if (borderOffsets && p[0].equals("pA")) {
                more.add(lo(CoreOptions.PORT_BORDER_OFFSET, "-3.0"));
            }
            ports.add(port(p[0], Double.parseDouble(p[1]), Double.parseDouble(p[2]), sides ? p[3] : null,
                    more.toArray(new String[0])));
        }
        List<String> inside = new ArrayList<>(), outside = new ArrayList<>();
        if (edges) {
            inside.addAll(List.of(edge("eA", "c1", "pA"), edge("eB", "pB", "c2"), edge("eC1", "c1", "pC"),
                    edge("eC2", "pC", "c2")));
            outside.addAll(List.of(edge("eE", "ext1", "pE"), edge("eF", "pF", "ext2")));
            outside.addAll(List.of(
                    edge("loopIn", "pS1", "pS2", lo("org.eclipse.elk.insideSelfLoops.yo", "true")),
                    edge("loopOut", "pS3", "pS4")));
        }
        String innerOptions = direction == null
                ? lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", CoreOptions.PORT_CONSTRAINTS, constraints,
                        CoreOptions.PORT_LABELS_PLACEMENT, placement, "org.eclipse.elk.insideSelfLoops.activate", String.valueOf(selfLoops))
                : lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", CoreOptions.PORT_CONSTRAINTS, constraints,
                        CoreOptions.PORT_LABELS_PLACEMENT, placement, "org.eclipse.elk.insideSelfLoops.activate",
                        String.valueOf(selfLoops), CoreOptions.DIRECTION, direction);
        String inner = obj(jid("inner"), dim(200, 100), innerOptions, arr("ports", ports.toArray(new String[0])),
                arr("children", leaf("c1", 20, 20), leaf("c2", 20, 20)), arr("edges", inside.toArray(new String[0])));
        List<String> rootEdges = outside;
        return obj(jid("root"), lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN"),
                arr("children", inner, leaf("ext1", 20, 20), leaf("ext2", 20, 20)),
                arr("edges", rootEdges.toArray(new String[0])));
    }

    static void s11() {
        String[][] variants = {
            {"free-votes-inside-labels", "FREE", "INSIDE", "true", "true", "false", "false"},
            {"free-votes-outside-labels", "FREE", "OUTSIDE", "true", "true", "false", "false"},
            {"free-votes-fixed-labels", "FREE", "FIXED", "true", "true", "false", "false"},
            {"free-votes-no-labels", "FREE", "OUTSIDE", "false", "true", "false", "false"},
            {"fixed-side-outside-labels", "FIXED_SIDE", "OUTSIDE", "true", "true", "true", "false"},
            {"fixed-side-inside-labels-border-offset", "FIXED_SIDE", "INSIDE", "true", "true", "true", "true"},
            {"fixed-pos-labels", "FIXED_POS", "OUTSIDE", "true", "true", "true", "false"},
            {"undefined-constraints", "UNDEFINED", "OUTSIDE", "true", "true", "false", "false"},
            {"no-edges-inside-labels", "FREE", "INSIDE", "true", "false", "false", "false"},
            {"no-edges-outside-labels", "FREE", "OUTSIDE", "true", "false", "false", "false"},
            {"no-edges-no-labels", "FREE", "INSIDE", "false", "false", "false", "false"}};
        for (String[] v : variants) {
            transformCase("externalPorts", v[0], externalPortsJson(v[1], v[2], v[3].equals("true"),
                    v[4].equals("true"), v[5].equals("true"), v[6].equals("true"), null, true), "inner");
        }
        for (String direction : List.of("DOWN", "LEFT", "UP")) {
            transformCase("externalPorts", "free-votes-direction-" + lower(direction),
                    externalPortsJson("FREE", "OUTSIDE", true, true, false, false, direction, true), "inner");
        }
        transformCase("externalPorts", "self-loops-not-activated", externalPortsJson("FREE", "INSIDE", true, true, false,
                false, null, false), "inner");
        for (String[] fixed : new String[][] {{"fixed-placement-empty-outside-labels", "[]"},
            {"fixed-placement-next-to-port-outside-labels", "[NEXT_TO_PORT_IF_POSSIBLE]"}}) {
            transformCase("externalPorts", fixed[0], externalPortsJson("FIXED_SIDE", fixed[1], true, true, true, false,
                    null, true), "inner");
        }
    }

    // ---- S12: inside self loops ----

    static String insideSelfLoopsJson(String hostOptions, String rootOptions) {
        return insideSelfLoopsJson(hostOptions, rootOptions, false);
    }

    static String insideSelfLoopsJson(String hostOptions, String rootOptions, boolean nodeSelfLoop) {
        String host = obj(jid("host"), dim(80, 60), hostOptions,
                arr("ports", port("ha", 80, 10, "EAST"), port("hb", 0, 10, "WEST"), port("hc", 80, 40, "EAST")));
        String hostNoYo = obj(jid("plainHost"), dim(80, 60), lo("org.eclipse.elk.insideSelfLoops.activate", "true"),
                arr("ports", port("pa", 80, 10, "EAST"), port("pb", 0, 10, "WEST")));
        String dormant = leaf("dormant", 30, 30, lo("org.eclipse.elk.insideSelfLoops.activate", "false"));
        return obj(jid("root"), rootOptions, arr("children", host, hostNoYo, dormant, leaf("other", 30, 30)),
                arr("edges", edge("loopIn", "ha", "hb", lo("org.eclipse.elk.insideSelfLoops.yo", "true")),
                        edge("loopOut", "hc", "hb"), edge("plain", "other", "ha"), edge("toOther", "hc", "other"),
                        edge("nodeLoop", "pa", "pb"),
                        nodeSelfLoop ? edge("hostSelf", "host", "host", lo("org.eclipse.elk.insideSelfLoops.yo", "true")) : ""));
    }

    static void s12() {
        String active = lo("org.eclipse.elk.insideSelfLoops.activate", "true");
        transformCase("insideSelfLoops", "flat-target", insideSelfLoopsJson(active, ""), "host");
        transformCase("insideSelfLoops", "flat-root", insideSelfLoopsJson(active, ""), null);
        transformCase("insideSelfLoops", "flat-target-node-self-loop", insideSelfLoopsJson(active, "", true), "host");
        throwsAtImport("insideSelfLoops", "flat-target-node-self-loop");
        String include = lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN");
        transformCase("insideSelfLoops", "hierarchical-host-without-include-children", insideSelfLoopsJson(active, include), null);
        throwsAtImport("insideSelfLoops", "hierarchical-host-without-include-children");
        String hostInclude = lo("org.eclipse.elk.insideSelfLoops.activate", "true", CoreOptions.HIERARCHY_HANDLING,
                "INCLUDE_CHILDREN");
        transformCase("insideSelfLoops", "hierarchical-host-include-children", insideSelfLoopsJson(hostInclude, include),
                null);
        transformCase("insideSelfLoops", "model-order-nodes-and-edges", insideSelfLoopsJson(hostInclude,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY,
                        "NODES_AND_EDGES")), null);
        transformCase("insideSelfLoops", "model-order-cycle-breaking", insideSelfLoopsJson(hostInclude,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", LayeredOptions.CYCLE_BREAKING_STRATEGY,
                        "MODEL_ORDER")), null);
        transformCase("insideSelfLoops", "model-order-flat-target", insideSelfLoopsJson(active,
                lo(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, "PREFER_EDGES")), "host");
        transformCase("insideSelfLoops", "model-order-layering", insideSelfLoopsJson(hostInclude,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", LayeredOptions.LAYERING_STRATEGY,
                        "BF_MODEL_ORDER")), null);
    }

    // ---- S13: hierarchy ----

    static String hierarchyJson(String rootOptions, String aOptions, boolean cross) {
        return hierarchyJson(rootOptions, aOptions, cross, true);
    }

    static String hierarchyJson(String rootOptions, String aOptions, boolean cross, boolean descendantEdge) {
        String a1 = obj(jid("A1"), dim(40, 30), arr("ports", port("a1p", 40, 10, "EAST"), port("a1q", 0, 10, "WEST")));
        String a2x = leaf("A2x", 20, 20, arr("ports", port("a2xp", 20, 5, "EAST")));
        String a2 = obj(jid("A2"), dim(100, 60), arr("children", a2x, leaf("A2y", 20, 20)),
                arr("edges", edge("eIn", "A2x", "A2y")),
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN"));
        String a = obj(jid("A"), dim(300, 200), aOptions,
                arr("ports", port("aOut", 300, 20, "EAST"), port("aIn", 0, 20, "WEST")),
                arr("children", a1, a2),
                arr("edges", edge("eSib", "A1", "A2"), edge("eUp", "a1p", "aOut"), edge("eDown", "aIn", "a1q"),
                        edge("deepInA", "A1", "A2x"), descendantEdge ? edge("eSelfDesc", "A", "A1") : "",
                        descendantEdge ? edge("eAscend", "A1", "A") : ""));
        String b = obj(jid("B"), dim(40, 30), arr("ports", port("bIn", 0, 10, "WEST")));
        return obj(jid("root"), rootOptions, arr("children", a, b, leaf("C", 30, 30)),
                cross ? arr("edges", edge("x1", "A1", "B"), edge("x2", "a1p", "bIn"), edge("x3", "A2x", "C"),
                        edge("x4", "C", "A2y"), edge("x5", "a2xp", "B"), edge("far", "A1", "A2"))
                : arr("edges", edge("x6", "B", "C")));
    }

    static void s13() {
        String include = lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN");
        transformCase("hierarchy", "three-levels", hierarchyJson(include,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN"), true), null);
        transformCase("hierarchy", "three-levels-base-spacing", hierarchyJson(
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", LayeredOptions.SPACING_BASE_VALUE, "7.5"),
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", LayeredOptions.SPACING_BASE_VALUE, "9.0",
                        CoreOptions.DIRECTION, "DOWN"), true), null);
        transformCase("hierarchy", "three-levels-min-size", hierarchyJson(include,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", CoreOptions.NODE_SIZE_CONSTRAINTS,
                        "[PORTS, NODE_LABELS, MINIMUM_SIZE]", CoreOptions.NODE_SIZE_MINIMUM, "(150, 90)"), true), null);
        transformCase("hierarchy", "mixed-handling-cross-edges", hierarchyJson(include,
                lo(CoreOptions.HIERARCHY_HANDLING, "SEPARATE_CHILDREN"), true), null);
        throwsAtImport("hierarchy", "mixed-handling-cross-edges");
        transformCase("hierarchy", "mixed-handling", hierarchyJson(include,
                lo(CoreOptions.HIERARCHY_HANDLING, "SEPARATE_CHILDREN"), false), null);
        transformCase("hierarchy", "layered-algorithm-child", hierarchyJson(include,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", CoreOptions.ALGORITHM, "org.eclipse.elk.layered"),
                true), null);
        transformCase("hierarchy", "other-algorithm-child", hierarchyJson(include,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", CoreOptions.ALGORITHM, "org.eclipse.elk.box"),
                false), null);
        transformCase("hierarchy", "no-layout-child", hierarchyJson(include,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN", CoreOptions.NO_LAYOUT, "true"), false), null);
        throwsAtImport("hierarchy", "no-layout-child");
        transformCase("hierarchy", "nested-target", hierarchyJson(include,
                lo(CoreOptions.HIERARCHY_HANDLING, "INCLUDE_CHILDREN"), true, false), "A");
        transformCase("hierarchy", "flat-root", hierarchyJson("", "", false), null);
    }

    // ---- S14: miscellaneous importer and transferrer branches ----

    static void s14() {
        transformCase("misc", "undefined-port-side-fixed", obj(jid("root"), dim(100, 80),
                lo(CoreOptions.PORT_CONSTRAINTS, "FIXED_SIDE"),
                arr("ports", port("r1", -3, 20, null), port("r2", 98, 20, null), port("r3", 0, 0, null),
                        port("r4", 40, -3, null), port("r5", 40, 78, null)),
                arr("children", obj(jid("n"), dim(30, 30), lo(CoreOptions.PORT_CONSTRAINTS, "FIXED_SIDE"),
                        arr("ports", port("p1", -3, 10, null), port("p2", 28, 10, null), port("p3", 0, 0, null),
                                port("p4", 10, -3, null), port("p5", 10, 28, null))))), null);
        transformCase("misc", "undefined-port-side-zero-size-graph", obj(jid("root"), lo(CoreOptions.PORT_CONSTRAINTS,
                "FIXED_SIDE"), arr("ports", port("r1", 10, 10, null)), arr("children", leaf("n", 20, 20))), null);
        transformCase("misc", "undefined-port-side-free", obj(jid("root"), dim(100, 80),
                arr("ports", port("r1", -3, 20, null), port("r2", 98, 20, null)),
                arr("children", leaf("n", 20, 20))), null);
        transformCase("misc", "node-size-minimum-fixed-graph-size", obj(jid("root"), arr("children",
                obj(jid("host"), dim(80, 60), lo(CoreOptions.NODE_SIZE_CONSTRAINTS, "[MINIMUM_SIZE]",
                        CoreOptions.NODE_SIZE_MINIMUM, "(120, 90)", CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, "true"),
                        arr("children", leaf("c1", 20, 20), leaf("c2", 20, 20)),
                        arr("edges", edge("e1", "c1", "c2"))))), "host");
        transformCase("misc", "node-size-minimum-free-graph-size", obj(jid("root"), arr("children",
                obj(jid("host"), dim(80, 60), lo(CoreOptions.NODE_SIZE_CONSTRAINTS, "[PORT_LABELS, MINIMUM_SIZE]",
                        CoreOptions.NODE_SIZE_MINIMUM, "(120, 90)"),
                        arr("ports", port("hp", 80, 10, "EAST", arr("labels", label("host port", 8, 0)))),
                        arr("children", leaf("c1", 20, 20), leaf("c2", 20, 20)),
                        arr("edges", edge("e1", "c1", "c2"))))), "host");
        transformCase("misc", "bend-points-interactive", obj(jid("root"), lo(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY,
                "INTERACTIVE"), arr("children", leaf("a", 20, 20, at(0, 0)), leaf("b", 20, 20, at(100, 40)),
                leaf("c", 20, 20, at(200, 0))),
                arr("edges", edge("e1", "a", "b", "'sections':[{'id':'s1','startPoint':{'x':20,'y':10},'endPoint':{'x':100,'y':50},"
                                + "'bendPoints':[{'x':50,'y':10},{'x':50,'y':50}]}]",
                        "'junctionPoints':[{'x':50,'y':10}]"),
                        edge("e2", "b", "c", "'sections':[{'id':'s2','startPoint':{'x':120,'y':50},'endPoint':{'x':200,'y':10}}]"),
                        edge("e3", "a", "c", "'sections':[{'id':'s3','startPoint':{'x':20,'y':10},'endPoint':{'x':200,'y':10},"
                                + "'bendPoints':[{'x':100,'y':-20}]}]"))), null);
        transformCase("misc", "bend-points-node-placement-interactive", obj(jid("root"),
                lo(LayeredOptions.NODE_PLACEMENT_STRATEGY, "INTERACTIVE"), arr("children", leaf("a", 20, 20),
                        leaf("b", 20, 20, at(60, 0))), arr("edges", edge("e1", "a", "b",
                        "'sections':[{'id':'s1','startPoint':{'x':20,'y':10},'endPoint':{'x':60,'y':10},"
                                + "'bendPoints':[{'x':40,'y':0}]}]"))), null);
        transformCase("misc", "edge-with-section-fixed-side", obj(jid("root"), arr("children",
                obj(jid("a"), dim(40, 40), lo(CoreOptions.PORT_CONSTRAINTS, "FIXED_SIDE")),
                obj(jid("b"), dim(40, 40), at(100, 0), lo(CoreOptions.PORT_CONSTRAINTS, "FIXED_POS"))),
                arr("edges", edge("e1", "a", "b", "'sections':[{'id':'s1','startPoint':{'x':40,'y':10},'endPoint':{'x':100,'y':30}}]"),
                        edge("e2", "b", "a", "'sections':[{'id':'s2','startPoint':{'x':100,'y':35},'endPoint':{'x':40,'y':5}}]"))), null);
        transformCase("misc", "edge-with-section-descendant", obj(jid("root"), lo(CoreOptions.HIERARCHY_HANDLING,
                "INCLUDE_CHILDREN"), arr("children", obj(jid("host"), dim(100, 80), lo(CoreOptions.HIERARCHY_HANDLING,
                "INCLUDE_CHILDREN", CoreOptions.PORT_CONSTRAINTS, "FIXED_SIDE"), at(0, 0), arr("children",
                leaf("inner", 20, 20, at(30, 30))), arr("edges", edge("down", "host", "inner",
                "'sections':[{'id':'sd','startPoint':{'x':100,'y':40},'endPoint':{'x':30,'y':40}}]"))))), null);
        transformCase("misc", "edge-labels", obj(jid("root"), arr("children", leaf("a", 20, 20), leaf("b", 20, 20)),
                arr("edges", edge("e1", "a", "b", arr("labels", label("center", 0, 0,
                        lo(CoreOptions.EDGE_LABELS_PLACEMENT, "CENTER")),
                        label("head", 0, 0, lo(CoreOptions.EDGE_LABELS_PLACEMENT, "HEAD")),
                        label("tail", 0, 0, lo(CoreOptions.EDGE_LABELS_PLACEMENT, "TAIL")),
                        label("", 0, 0), label("hidden", 0, 0, lo(CoreOptions.NO_LAYOUT, "true")))))), null);
        transformCase("misc", "port-labels", obj(jid("root"), arr("children", obj(jid("n"), dim(40, 40),
                lo(CoreOptions.PORT_LABELS_PLACEMENT, "OUTSIDE"),
                arr("ports", port("p1", 40, 10, "EAST", arr("labels", label("one", 8, 0), label("", 0, 0),
                        label("hidden", 0, 0, lo(CoreOptions.NO_LAYOUT, "true")))),
                        port("p2", 0, 10, "WEST", arr("labels", label("two", -24, 0))),
                        port("p3", 10, 40, "SOUTH", lo(CoreOptions.NO_LAYOUT, "true")))))), null);
        transformCase("misc", "node-labels-and-placement", obj(jid("root"), arr("children",
                obj(jid("n"), dim(60, 40), lo(CoreOptions.NODE_LABELS_PLACEMENT, "[H_CENTER, V_TOP, INSIDE]"),
                        arr("labels", label("title", 0, 0), label("", 0, 0))),
                obj(jid("m"), dim(60, 40), at(100, 0), arr("labels", label("untouched", 0, 0))),
                obj(jid("k"), dim(60, 40), at(200, 0), lo(CoreOptions.NO_LAYOUT, "true")))), null);
        transformCase("misc", "parent-node-layout-flags", obj(jid("root"), arr("children", obj(jid("host"), dim(80, 60),
                lo(CoreOptions.NODE_SIZE_CONSTRAINTS, "[PORT_LABELS]", CoreOptions.NODE_SIZE_OPTIONS, "[COMPUTE_PADDING]",
                        CoreOptions.PADDING, "[top=3.0,left=4.0,bottom=5.0,right=6.0]"),
                arr("children", leaf("c1", 20, 20), leaf("c2", 20, 20)), arr("edges", edge("e1", "c1", "c2"))))), "host");
        transformCase("misc", "parent-node-layout-flags-root", obj(jid("root"), lo(CoreOptions.NODE_SIZE_CONSTRAINTS,
                "[NODE_LABELS]", CoreOptions.NODE_SIZE_OPTIONS, "[COMPUTE_PADDING]"),
                arr("children", leaf("c1", 20, 20), leaf("c2", 20, 20)), arr("edges", edge("e1", "c1", "c2"))), null);
        transformCase("misc", "splines-routing-and-target-offset", obj(jid("root"), lo(CoreOptions.EDGE_ROUTING, "SPLINES"),
                arr("children", leaf("a", 20, 20), leaf("b", 20, 20)), arr("edges", edge("e1", "a", "b"))), null);
        transformCase("misc", "network-simplex-flexibility", obj(jid("root"), lo(LayeredOptions.NODE_PLACEMENT_STRATEGY,
                "NETWORK_SIMPLEX"), arr("children", leaf("a", 20, 20, lo(
                        LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY, "NODE_SIZE")),
                leaf("b", 20, 20), leaf("c", 20, 20, lo(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY,
                        "NONE")))), null);
        transformCase("misc", "no-layout-edges", obj(jid("root"), arr("children", leaf("a", 20, 20), leaf("b", 20, 20),
                leaf("skip", 20, 20, lo(CoreOptions.NO_LAYOUT, "true"))),
                arr("edges", edge("e1", "a", "b"), edge("e2", "a", "b", lo(CoreOptions.NO_LAYOUT, "true")))), null);
        transformCase("misc", "no-layout-edge-to-skipped-node", obj(jid("root"), arr("children", leaf("a", 20, 20),
                leaf("skip", 20, 20, lo(CoreOptions.NO_LAYOUT, "true"))), arr("edges", edge("e3", "a", "skip"))), null);
        throwsAtImport("misc", "no-layout-edge-to-skipped-node");
        transformCase("misc", "no-layout-edges-hierarchical", obj(jid("root"), lo(CoreOptions.HIERARCHY_HANDLING,
                "INCLUDE_CHILDREN"), arr("children", leaf("a", 20, 20), leaf("b", 20, 20),
                leaf("skip", 20, 20, lo(CoreOptions.NO_LAYOUT, "true"))),
                arr("edges", edge("e1", "a", "b"), edge("e2", "a", "b", lo(CoreOptions.NO_LAYOUT, "true")),
                        edge("e3", "a", "skip"))), null);
        transformCase("misc", "lookup-miss-other-algorithm", obj(jid("root"), lo(CoreOptions.HIERARCHY_HANDLING,
                "INCLUDE_CHILDREN"), arr("children", leaf("a", 20, 20), obj(jid("box"), dim(60, 60),
                lo(CoreOptions.ALGORITHM, "org.eclipse.elk.box"), arr("children", leaf("inside", 20, 20)))),
                arr("edges", edge("e1", "a", "inside"))), null);
        transformCase("misc", "invalid-hyperedge-flat", obj(jid("root"), arr("children", leaf("a", 20, 20),
                leaf("b", 20, 20), leaf("c", 20, 20)), arr("edges", obj(jid("h"), "'sources':['a','b']", "'targets':['c']"))), null);
        transformCase("misc", "invalid-hyperedge-hierarchical", obj(jid("root"), lo(CoreOptions.HIERARCHY_HANDLING,
                "INCLUDE_CHILDREN"), arr("children", leaf("a", 20, 20), leaf("b", 20, 20), leaf("c", 20, 20)),
                arr("edges", obj(jid("h"), "'sources':['a','b']", "'targets':['c']"))), null);
    }

    static void importThrows() {
        for (String n : List.of("lookup-miss-other-algorithm", "invalid-hyperedge-flat", "invalid-hyperedge-hierarchical")) {
            throwsAtImport("misc", n);
        }
    }

    static void targetOffset() {
        Supplier<ElkNode> prepare = elkJson(obj(jid("root"), arr("children", leaf("a", 20, 20), leaf("b", 20, 20)),
                arr("edges", edge("e1", "a", "b"))));
        String edge = importedNames(prepare, null).stream().filter(n -> n.contains("/e")).findFirst().orElseThrow();
        B b = new B();
        b.q("graph", "importGraph", "elk", (Object) null);
        b.prop(edge, id(InternalProperties.TARGET_OFFSET), tv("vector", List.of(3.0, -2.0)));
        b.q("lgraph", "dumpLGraph", "g0");
        b.c("applyLayout", "g0");
        b.q("elk", "exportElk", "elk");
        add("site/transform/misc/target-offset", "ElkGraphTransformer", prepare, b);
        b = new B();
        b.q("graph", "importGraph", "elk", (Object) null);
        b.prop(edge, id(InternalProperties.TARGET_OFFSET), tv("vector", List.of(3.0, -2.0)));
        b.q("nm", "applyLayoutNonMutating", "g0").q("elk", "exportElk", "nm");
        add("site/transform/nonMutating/target-offset", "ElkGraphLayoutTransferrer", prepare, b);
    }

    static void originless() {
        B b = new B();
        b.node("n", "g0", 10, 10);
        b.c("applyLayout", "g0");
        stateAll(b, "graph.after", "g0");
        stateAll(b, "node.after", "n");
        add("site/transform/misc/apply-layout-without-origin", "ElkGraphTransformer", b);
    }

    static void invalidEdges() {
        for (String missing : List.of("source", "target")) {
            for (boolean hierarchical : new boolean[] {false, true}) {
                B b = new B();
                b.mk("elk", "newElkGraph").c("elkSetIdentifier", "elk", "root");
                if (hierarchical) {
                    b.prop("elk", id(CoreOptions.HIERARCHY_HANDLING), E("HierarchyHandling", "INCLUDE_CHILDREN"));
                }
                b.q("ka", "newElkNode", "elk").c("elkSetIdentifier", "ka", "a").c("elkSetDimensions", "ka", 20.0, 20.0);
                b.q("ke", "newElkEdge", "elk").c("elkSetIdentifier", "ke", "e");
                if (missing.equals("source")) {
                    b.c("elkAddTarget", "ke", "ka");
                } else {
                    b.c("elkAddSource", "ke", "ka");
                }
                b.q("graph", "importGraph", "elk", (Object) null);
                add("site/transform/misc/invalid-edge-no-" + missing + (hierarchical ? "-hierarchical" : "-flat"),
                        "ElkGraphTransformer", b);
            }
        }
    }

    static void transformRows() {
        s11();
        s12();
        s13();
        s14();
        importThrows();
        for (TransformCase c : CASES.values()) {
            add(c.id, "ElkGraphTransformer", c.prepare, transformSteps(c.target, IMPORT_THROWS.contains(c.id)));
        }
        invalidEdges();
        originless();
        targetOffset();
    }

    // ------------------------------------------------------------------------------------------------------------
    // S16-S18: LNode, LEdge, LPort bookkeeping

    static B layered2() {
        B b = new B();
        b.mk("L0", "newLayer", "g0").c("layersAdd", "g0", "L0").mk("L1", "newLayer", "g0").c("layersAdd", "g0", "L1");
        return b;
    }

    static void layerStates(B b, String tag) {
        b.q("L0." + tag, "state", "L0", List.of()).q("L1." + tag, "state", "L1", List.of());
    }

    static void s16SetLayer() {
        B b = layered2();
        b.mk("n", "newLNode", "g0").mk("m", "newLNode", "g0").mk("o", "newLNode", "g0");
        b.c("setLayer", "n", "L0");
        layerStates(b, "n.in.L0");
        b.q("n.index.L0", "getIndex", "n");
        b.c("setLayer", "n", "L1");
        layerStates(b, "n.in.L1");
        b.c("setLayer", "m", "L1").c("setLayer", "o", "L1");
        b.q("o.index", "getIndex", "o");
        b.c("setLayer", "n", "L1");
        layerStates(b, "n.again.L1");
        b.q("n.index.again", "getIndex", "n");
        b.c("setLayer", "n", (Object) null);
        layerStates(b, "n.null");
        b.q("n.layer", "getLayer", "n").q("n.index.null", "getIndex", "n");
        b.c("setLayerAt", "n", 0, "L1");
        layerStates(b, "n.at0");
        b.c("setLayerAt", "o", 0, "L0");
        layerStates(b, "o.moveAt0");
        b.c("setLayerAt", "m", 1, "L1");
        layerStates(b, "m.reinsertAt1");
        b.q("m.badIndexHigh", "setLayerAt", "m", 9, "L0");
        b.q("m.badIndexLow", "setLayerAt", "m", -1, "L0");
        layerStates(b, "after.bad");
        b.c("setLayerAt", "n", 7, null);
        layerStates(b, "n.toNull");
        b.q("n.layer.after", "getLayer", "n");
        add("site/lnode/setLayer", "LNode", b);
    }

    /** A node with, on every side, a port with an incoming edge, one with an outgoing edge, one with both, one with none. */
    static B portsMatrix() {
        B b = new B();
        b.node("n", "g0", 40, 40).node("far", "g0", 10, 10);
        b.mk("farOut", "newLPort").c("setNode", "farOut", "far").mk("farIn", "newLPort").c("setNode", "farIn", "far");
        for (String side : ALL_SIDES) {
            String s = side.toLowerCase(Locale.ROOT);
            for (String kind : List.of("in", "out", "both", "none")) {
                String p = "p." + s + "." + kind;
                b.mk(p, "newLPort").c("setNode", p, "n").c("setSide", p, side);
                if (kind.equals("in") || kind.equals("both")) {
                    b.edge("e." + s + "." + kind + ".in", "farOut", p);
                }
                if (kind.equals("out") || kind.equals("both")) {
                    b.edge("e." + s + "." + kind + ".out", p, "farIn");
                }
            }
        }
        return b;
    }

    static void s16Ports() {
        B b = portsMatrix();
        b.q("ports", "getPorts", "n");
        for (String type : PORT_TYPES) {
            b.q("type." + type, "getPortsOfType", "n", type);
        }
        for (String side : ALL_SIDES) {
            b.q("side." + side, "getPortsOfSide", "n", side);
        }
        for (String type : PORT_TYPES) {
            for (String side : ALL_SIDES) {
                b.q("typeSide." + type + "." + side, "getPortsOfTypeAndSide", "n", type, side);
            }
        }
        add("site/lnode/getPorts", "LNode", b);

        b = portsMatrix();
        b.q("incoming", "getIncomingEdges", "n").q("outgoing", "getOutgoingEdges", "n")
                .q("connected", "getConnectedEdges", "n");
        b.node("empty", "g0", 1, 1);
        b.q("empty.incoming", "getIncomingEdges", "empty").q("empty.outgoing", "getOutgoingEdges", "empty")
                .q("empty.connected", "getConnectedEdges", "empty");
        add("site/lnode/edgeIterables", "LNode", b);
    }

    static void s16View() {
        B b = new B();
        b.node("n", "g0", 40, 40);
        String[] sides = {"NORTH", "NORTH", "EAST", "SOUTH", "SOUTH", "SOUTH", "WEST"};
        for (int i = 0; i < sides.length; i++) {
            b.port("v" + i, "n", sides[i], 0, 0, 2, 2);
        }
        for (String side : ALL_SIDES) {
            b.q("before." + side, "getPortSideView", "n", side);
        }
        b.q("before.size.SOUTH", "portSideViewSize", "n", "SOUTH").q("before.get.SOUTH.1", "portSideViewGet", "n", "SOUTH", 1);
        b.c("cachePortSides", "n");
        for (String side : ALL_SIDES) {
            b.q("cached." + side, "getPortSideView", "n", side);
        }
        b.q("cached.get.NORTH.0", "portSideViewGet", "n", "NORTH", 0).q("cached.get.NORTH.2", "portSideViewGet", "n", "NORTH", 2)
                .q("cached.get.SOUTH.-1", "portSideViewGet", "n", "SOUTH", -1);
        b.q("set.SOUTH.0", "portSideViewSet", "n", "SOUTH", 0, "v6");
        b.q("ports.afterSet", "getPorts", "n");
        b.q("cached.SOUTH.afterSet", "getPortSideView", "n", "SOUTH");
        b.q("set.NORTH.1", "portSideViewSet", "n", "NORTH", 1, "v3");
        b.q("set.NORTH.5", "portSideViewSet", "n", "NORTH", 5, "v3");
        b.q("ports.afterSets", "getPorts", "n");
        b.node("one", "g0", 10, 10).port("one0", "one", "EAST", 0, 0, 1, 1).port("one1", "one", "EAST", 0, 0, 1, 1);
        b.q("one.EAST", "getPortSideView", "one", "EAST").q("one.NORTH", "getPortSideView", "one", "NORTH");
        b.c("cachePortSides", "one");
        b.q("one.cached.EAST", "getPortSideView", "one", "EAST").q("one.cached.WEST", "getPortSideView", "one", "WEST");
        b.node("none", "g0", 10, 10);
        for (String side : ALL_SIDES) {
            b.q("none." + side, "getPortSideView", "none", side);
        }
        b.c("cachePortSides", "none");
        for (String side : ALL_SIDES) {
            b.q("none.cached." + side, "getPortSideView", "none", side);
        }
        b.port("one2", "one", "WEST", 0, 0, 1, 1);
        b.q("one.stale.WEST", "getPortSideView", "one", "WEST").q("one.stale.EAST", "getPortSideView", "one", "EAST");
        add("site/lnode/portSideView", "LNode", b);
    }

    static void s16Misc() {
        B b = layered2();
        b.mk("n", "newLNode", "g0").mk("m", "newLNode", "g0");
        b.q("n.index.noLayer", "getIndex", "n");
        b.c("setLayer", "m", "L0").c("setLayer", "n", "L0");
        b.q("n.index", "getIndex", "n").q("m.index", "getIndex", "m");
        b.c("setLayer", "m", "L1");
        b.q("n.index.afterMove", "getIndex", "n").q("m.index.afterMove", "getIndex", "m");
        add("site/lnode/getIndex", "LNode", b);

        b = layered2();
        b.mk("loose", "newLNode", (Object) null);
        b.mk("withGraph", "newLNode", "g0");
        b.mk("g1", "newLGraph");
        b.mk("otherGraph", "newLNode", "g1");
        b.mk("layered", "newLNode", (Object) null).c("setLayer", "layered", "L0");
        b.mk("both", "newLNode", "g1").c("setLayer", "both", "L1");
        for (String n : List.of("loose", "withGraph", "otherGraph", "layered", "both")) {
            b.q(n + ".graph", "getGraph", n);
        }
        add("site/lnode/getGraph", "LNode", b);

        b = new B();
        b.node("normalWithLabels", "g0", 1, 1).node("labelAllInline", "g0", 1, 1).node("labelMixed", "g0", 1, 1)
                .node("labelNoneInline", "g0", 1, 1).node("labelEmpty", "g0", 1, 1);
        b.mk("inl1", "newLLabel", "a").prop("inl1", EDGE_LABELS_INLINE, Z(true));
        b.mk("inl2", "newLLabel", "b").prop("inl2", EDGE_LABELS_INLINE, Z(true));
        b.mk("out1", "newLLabel", "c");
        b.c("setType", "labelAllInline", "LABEL").prop("labelAllInline", REPRESENTED_LABELS, List.of(ref("inl1"), ref("inl2")));
        b.c("setType", "labelMixed", "LABEL").prop("labelMixed", REPRESENTED_LABELS, List.of(ref("inl1"), ref("out1")));
        b.c("setType", "labelNoneInline", "LABEL").prop("labelNoneInline", REPRESENTED_LABELS, List.of(ref("out1")));
        b.c("setType", "labelEmpty", "LABEL").prop("labelEmpty", REPRESENTED_LABELS, List.of());
        b.prop("normalWithLabels", REPRESENTED_LABELS, List.of(ref("inl1")));
        for (String n : List.of("normalWithLabels", "labelAllInline", "labelMixed", "labelNoneInline", "labelEmpty")) {
            b.q(n + ".inline", "isInlineEdgeLabel", n);
        }
        add("site/lnode/isInlineEdgeLabel", "LNode", b);

        b = layered2();
        for (String type : NODE_TYPES) {
            String n = "t." + type;
            b.mk(n, "newLNode", "g0").c("setType", n, type);
            b.q(n + ".type", "getType", n).q(n + ".toString.noLayer", "toString", n)
                    .q(n + ".designation.noLayer", "getDesignation", n);
            b.c("setLayer", n, "L0");
            b.q(n + ".toString", "toString", n).q(n + ".designation", "getDesignation", n);
        }
        b.mk("labelled", "newLNode", "g0").label("labelled.l", "labelled", "caption", 0, 0, 1, 1);
        b.q("labelled.toString", "toString", "labelled").q("labelled.designation", "getDesignation", "labelled");
        b.mk("emptyLabelled", "newLNode", "g0").label("emptyLabelled.l", "emptyLabelled", "", 0, 0, 1, 1);
        b.q("emptyLabelled.toString", "toString", "emptyLabelled");
        b.mk("nullLabelled", "newLNode", "g0").mk("nullLabel", "newLLabel", (Object) null).c("labelsAdd", "nullLabelled", "nullLabel");
        b.q("nullLabelled.toString", "toString", "nullLabelled");
        add("site/lnode/strings", "LNode", b);
    }

    static void s16() {
        s16SetLayer();
        s16Ports();
        s16View();
        s16Misc();
    }

    // ---- S17: LEdge ----

    static B edgeBase() {
        B b = layered2();
        b.node("a", "g0", 20, 20).node("b", "g0", 20, 20).node("c", "g0", 20, 20);
        b.c("setLayer", "a", "L0").c("setLayer", "b", "L1").c("setLayer", "c", "L1");
        b.port("a.out", "a", "EAST", 20, 5, 2, 2).port("a.in", "a", "WEST", 0, 5, 2, 2)
                .port("b.in", "b", "WEST", 0, 5, 2, 2).port("b.out", "b", "EAST", 20, 5, 2, 2)
                .port("c.in", "c", "WEST", 0, 5, 2, 2).port("c.out", "c", "EAST", 20, 5, 2, 2);
        return b;
    }

    static void portsOf(B b, String tag) {
        for (String p : List.of("a.out", "a.in", "b.in", "b.out", "c.in", "c.out")) {
            b.q(tag + "." + p + ".incoming", "getIncomingEdges", p).q(tag + "." + p + ".outgoing", "getOutgoingEdges", p);
        }
    }

    static void s17Endpoints() {
        B b = edgeBase();
        b.mk("e", "newLEdge");
        b.q("e.source0", "getSource", "e").q("e.target0", "getTarget", "e");
        b.c("setSource", "e", "a.out").c("setTarget", "e", "b.in");
        portsOf(b, "linked");
        b.c("setSource", "e", "c.out").c("setTarget", "e", "c.in");
        portsOf(b, "moved");
        b.c("setSource", "e", (Object) null).c("setTarget", "e", (Object) null);
        portsOf(b, "cleared");
        b.q("e.source1", "getSource", "e").q("e.target1", "getTarget", "e");
        b.c("setSource", "e", "a.out");
        b.mk("f", "newLEdge").c("setSource", "f", "a.out").c("setTarget", "f", "b.in");
        b.mk("g", "newLEdge").c("setSource", "g", "a.out").c("setTarget", "g", "b.in");
        b.c("setTargetAndInsertAtIndex", "e", "b.in", 0);
        portsOf(b, "insertedFirst");
        b.c("setTargetAndInsertAtIndex", "e", "b.in", 2);
        portsOf(b, "insertedLast");
        b.c("setTargetAndInsertAtIndex", "e", "c.in", 0);
        portsOf(b, "insertedElsewhere");
        b.q("insert.badIndex", "setTargetAndInsertAtIndex", "e", "b.in", 9);
        b.q("e.target.afterBad", "getTarget", "e");
        portsOf(b, "afterBad");
        b.c("setTargetAndInsertAtIndex", "e", null, 0);
        b.q("e.target.null", "getTarget", "e");
        portsOf(b, "insertNull");
        add("site/ledge/endpoints", "LEdge", b);
    }

    static void s17Reverse() {
        for (boolean adapt : new boolean[] {false, true}) {
            for (String collect : List.of("none", "input", "output", "both")) {
                B b = edgeBase();
                if (collect.equals("input") || collect.equals("both")) {
                    b.prop("b.in", INPUT_COLLECT, Z(true));
                }
                if (collect.equals("output") || collect.equals("both")) {
                    b.prop("a.out", OUTPUT_COLLECT, Z(true));
                }
                b.edge("e", "a.out", "b.in").c("bendPointsAdd", "e", 1.0, 2.0).c("bendPointsAdd", "e", 3.0, 4.0);
                b.label("lTail", "e", "tail", 0, 0, 1, 1).prop("lTail", EDGE_LABELS_PLACEMENT, E("EdgeLabelPlacement", "TAIL"));
                b.label("lHead", "e", "head", 0, 0, 1, 1).prop("lHead", EDGE_LABELS_PLACEMENT, E("EdgeLabelPlacement", "HEAD"));
                b.label("lCenter", "e", "center", 0, 0, 1, 1).prop("lCenter", EDGE_LABELS_PLACEMENT, E("EdgeLabelPlacement", "CENTER"));
                b.q("reverse1", "reverse", "e", "g0", adapt);
                state(b, "e.after1", "e", REVERSED);
                b.q("e.bendPoints1", "getBendPoints", "e");
                for (String l : List.of("lTail", "lHead", "lCenter")) {
                    state(b, l + ".after1", l, EDGE_LABELS_PLACEMENT);
                }
                stateAll(b, "a.after1", "a");
                stateAll(b, "b.after1", "b");
                b.q("reverse2", "reverse", "e", "g0", adapt);
                state(b, "e.after2", "e", REVERSED);
                b.q("e.bendPoints2", "getBendPoints", "e");
                stateAll(b, "a.after2", "a");
                stateAll(b, "b.after2", "b");
                add("site/ledge/reverse-" + (adapt ? "adaptPorts" : "plain") + "-collect-" + collect, "LEdge", b);
            }
        }
        B b = edgeBase();
        b.edge("e", "a.out", "b.in");
        b.mk("loose", "newLEdge");
        b.q("reverse.unlinked", "reverse", "loose", "g0", false);
        add("site/ledge/reverse-unlinked", "LEdge", b);
    }

    static void s17Queries() {
        B b = edgeBase();
        b.edge("e", "a.out", "b.in").edge("same", "b.out", "b.in").edge("sameLayer", "b.out", "c.in")
                .mk("noSource", "newLEdge").c("setTarget", "noSource", "b.in")
                .mk("noTarget", "newLEdge").c("setSource", "noTarget", "a.out")
                .mk("none", "newLEdge");
        b.node("layerless1", "g0", 1, 1).node("layerless2", "g0", 1, 1);
        b.mk("lp1", "newLPort").c("setNode", "lp1", "layerless1").mk("lp2", "newLPort").c("setNode", "lp2", "layerless2");
        b.edge("layerlessEdge", "lp1", "lp2");
        b.mk("orphanPort", "newLPort").edge("orphanLoop", "orphanPort", "orphanPort");
        for (String e : List.of("e", "same", "sameLayer", "noSource", "noTarget", "none", "layerlessEdge", "orphanLoop")) {
            b.q(e + ".isSelfLoop", "isSelfLoop", e);
        }
        for (String e : List.of("e", "same", "sameLayer", "layerlessEdge")) {
            b.q(e + ".isInLayerEdge", "isInLayerEdge", e);
        }
        b.q("e.other.source", "getOtherPort", "e", "a.out").q("e.other.target", "getOtherPort", "e", "b.in")
                .q("e.other.stranger", "getOtherPort", "e", "c.in").q("e.other.null", "getOtherPort", "e", (Object) null);
        b.q("e.otherNode.source", "getOtherNode", "e", "a").q("e.otherNode.target", "getOtherNode", "e", "b")
                .q("e.otherNode.stranger", "getOtherNode", "e", "c");
        add("site/ledge/queries", "LEdge", b);
    }

    static void s17Strings() {
        B b = edgeBase();
        b.edge("plain", "a.out", "b.in");
        b.edge("labelled", "a.out", "c.in").label("labelled.l", "labelled", "caption", 0, 0, 1, 1);
        b.edge("emptyLabel", "a.in", "c.in").label("emptyLabel.l", "emptyLabel", "", 0, 0, 1, 1);
        b.mk("loose", "newLEdge").mk("half", "newLEdge").c("setSource", "half", "a.out");
        b.label("a.out.l", "a.out", "port name", 0, 0, 1, 1);
        b.label("a.l", "a", "node name", 0, 0, 1, 1);
        for (String e : List.of("plain", "labelled", "emptyLabel", "loose", "half")) {
            b.q(e + ".toString", "toString", e).q(e + ".designation", "getDesignation", e);
        }
        add("site/ledge/strings", "LEdge", b);
    }

    static void s17() {
        s17Endpoints();
        s17Reverse();
        s17Queries();
        s17Strings();
    }

    // ---- S18: LPort ----

    static void s18() {
        B b = edgeBase();
        b.mk("p", "newLPort").c("setSize", "p", 4.0, 6.0);
        b.q("p.node0", "getNode", "p").q("p.index0", "getIndex", "p");
        b.c("setNode", "p", "a");
        b.q("p.node1", "getNode", "p").q("p.index1", "getIndex", "p");
        b.c("setNode", "p", "b");
        b.q("p.node2", "getNode", "p").q("p.index2", "getIndex", "p");
        stateAll(b, "a.ports", "a");
        b.c("setNode", "p", (Object) null);
        b.q("p.node3", "getNode", "p").q("p.index3", "getIndex", "p");
        add("site/lport/setNode", "LPort", b);

        b = edgeBase();
        b.mk("q", "newLPort").c("setSize", "q", 6.0, 10.0).c("setNode", "q", "a");
        for (String side : ALL_SIDES) {
            b.c("setSide", "q", side);
            b.q("q.side." + side, "getSide", "q").q("q.anchor." + side, "getAnchor", "q");
        }
        b.c("setExplicitlySuppliedPortAnchor", "q", true).c("setAnchor", "q", 1.0, 1.0);
        b.q("q.explicit", "isExplicitlySuppliedPortAnchor", "q");
        for (String side : SIDES) {
            b.c("setSide", "q", side);
            b.q("q.explicit.side." + side, "getSide", "q").q("q.explicit.anchor." + side, "getAnchor", "q");
        }
        b.q("q.nullSide", "setSide", "q", (Object) null);
        b.q("q.side.afterNull", "getSide", "q");
        add("site/lport/setSide", "LPort", b);

        b = edgeBase();
        b.edge("e1", "a.out", "b.in").edge("e2", "c.out", "a.out").edge("e3", "a.out", "c.in")
                .edge("e4", "b.out", "a.in");
        b.node("lonely", "g0", 1, 1).mk("lonelyPort", "newLPort").c("setNode", "lonelyPort", "lonely");
        b.mk("danglingIn", "newLEdge").c("setTarget", "danglingIn", "a.in");
        for (String p : List.of("a.out", "a.in", "b.in", "c.in", "lonelyPort")) {
            b.q(p + ".degree", "getDegree", p).q(p + ".netFlow", "getNetFlow", p);
            b.q(p + ".incoming", "getIncomingEdges", p).q(p + ".outgoing", "getOutgoingEdges", p)
                    .q(p + ".connectedEdges", "getConnectedEdges", p);
            b.q(p + ".predecessors", "getPredecessorPorts", p).q(p + ".successors", "getSuccessorPorts", p)
                    .q(p + ".connected", "getConnectedPorts", p);
            b.q(p + ".index", "getIndex", p);
        }
        b.q("a.in.connectedToExternal", "isConnectedToExternalNodes", "a.in").c("setConnectedToExternalNodes", "a.in", false)
                .q("a.in.connectedToExternal.after", "isConnectedToExternalNodes", "a.in");
        add("site/lport/edges", "LPort", b);

        b = edgeBase();
        b.edge("e1", "a.out", "b.in").edge("e2", "c.out", "b.in").edge("e3", "a.out", "c.in");
        b.mk("nameless", "newLPort").c("setNode", "nameless", "a");
        b.mk("named", "newLPort").c("setNode", "named", "a").label("named.l", "named", "label name", 0, 0, 1, 1);
        b.mk("emptyNamed", "newLPort").c("setNode", "emptyNamed", "a").label("emptyNamed.l", "emptyNamed", "", 0, 0, 1, 1);
        b.mk("free", "newLPort");
        b.mk("nullNamed", "newLPort").mk("nullLabel", "newLLabel", (Object) null).c("labelsAdd", "nullNamed", "nullLabel");
        for (String p : List.of("a.out", "a.in", "b.in", "c.in", "nameless", "named", "emptyNamed", "free", "nullNamed")) {
            b.q(p + ".name", "getName", p).q(p + ".designation", "getDesignation", p).q(p + ".toString", "toString", p);
        }
        b.label("a.l", "a", "node name", 0, 0, 1, 1);
        b.q("a.out.toString.named", "toString", "a.out");
        b.mk("loopPort", "newLPort").c("setNode", "loopPort", "a").edge("loop", "loopPort", "loopPort");
        b.q("loopPort.toString", "toString", "loopPort");
        add("site/lport/strings", "LPort", b);

        b = edgeBase();
        b.mk("p1", "newLPort").c("setSize", "p1", 4.0, 4.0).c("setPosition", "p1", 1.0, 2.0).c("setAnchor", "p1", 0.5, 0.25)
                .c("setNode", "p1", "a");
        b.c("setPosition", "a", 10.0, 20.0);
        b.q("p1.absoluteAnchor", "getAbsoluteAnchor", "p1");
        add("site/lport/absoluteAnchor", "LPort", b);
    }

    // ------------------------------------------------------------------------------------------------------------
    // S15: applyLayoutNonMutating

    /** Steps that move the layerless nodes of every imported graph into one new layer per graph, plus a long-edge dummy. */
    static B layeringSteps(Supplier<ElkNode> prepare, String target) {
        ElkNode root = ElkGraphJson.forGraph(export(prepare.get())).toElk();
        LGraph imported = new ElkGraphTransformer().importGraph(importTarget(root, target));
        Dump d = new Dump(imported, true);
        B b = new B();
        int k = 0;
        for (LGraph lg : d.graphs) {
            String gp = d.paths.get(lg), layer = "layer" + k, dummy = "dummy" + k;
            k++;
            b.mk(layer, "newLayer", gp).c("layersAdd", gp, layer);
            for (LNode n : d.nodeLists.get(lg)) {
                String np = d.paths.get(n);
                b.c("setLayer", np, layer).c("layerlessRemove", gp, np);
            }
            b.mk(dummy, "newLNode", gp).c("setType", dummy, "LONG_EDGE").c("setSize", dummy, 4.0, 4.0)
                    .c("setLayer", dummy, layer);
        }
        return b;
    }

    static B nonMutatingSteps(String target, B layering) {
        B b = new B();
        b.q("graph", "importGraph", "elk", target);
        if (layering != null) {
            b.all(layering);
        }
        b.q("nm", "applyLayoutNonMutating", "g0");
        b.q("elk", "exportElk", "nm");
        return b;
    }

    static final Set<String> LAYERED_VARIANTS = Set.of("externalPorts/free-votes-inside-labels",
            "externalPorts/fixed-side-outside-labels", "hierarchy/three-levels", "hierarchy/three-levels-min-size",
            "insideSelfLoops/hierarchical-host-include-children", "misc/edge-labels", "misc/port-labels",
            "misc/bend-points-interactive", "misc/parent-node-layout-flags-root", "misc/splines-routing-and-target-offset",
            "misc/network-simplex-flexibility");

    static void s15() {
        for (TransformCase c : CASES.values()) {
            if (IMPORT_THROWS.contains(c.id)) {
                continue;
            }
            String name = c.id.substring("site/transform/".length());
            add("site/transform/nonMutating/" + name.replace('/', '-'), "ElkGraphLayoutTransferrer", c.prepare,
                    nonMutatingSteps(c.target, null));
            if (LAYERED_VARIANTS.contains(name)) {
                add("site/transform/nonMutating/layered-" + name.replace('/', '-'), "ElkGraphLayoutTransferrer",
                        c.prepare, nonMutatingSteps(c.target, layeringSteps(c.prepare, c.target)));
            }
        }
        B bare = new B();
        bare.mk("L", "newLayer", "g0").c("layersAdd", "g0", "L");
        bare.mk("plain", "newLNode", "g0").c("setLayer", "plain", "L").c("setSize", "plain", 10.0, 10.0);
        bare.mk("longEdge", "newLNode", "g0").c("setType", "longEdge", "LONG_EDGE").c("setLayer", "longEdge", "L");
        bare.node("layerless", "g0", 5, 5);
        bare.q("nm", "applyLayoutNonMutating", "g0").q("elk", "exportElk", "nm");
        add("site/transform/nonMutating/lgraph-without-origins", "ElkGraphLayoutTransferrer", bare);
        Supplier<ElkNode> fixedLabels = elkJson(obj(jid("root"), arr("children", obj(jid("n"), dim(60, 40),
                lo(CoreOptions.PORT_LABELS_PLACEMENT, "[]"),
                arr("ports", port("pe", 60, 10, "EAST", arr("labels", label("east", 8, 0))),
                        port("pw", 0, 10, "WEST", arr("labels", label("west", -24, 0))),
                        port("pn", 20, 0, "NORTH", arr("labels", label("north", 0, -10))),
                        port("ps", 20, 40, "SOUTH", arr("labels", label("south", 0, 8))))), leaf("m", 20, 20)),
                arr("edges", edge("e1", "pe", "m"))));
        add("site/transform/nonMutating/port-labels-fixed-placement", "ElkGraphLayoutTransferrer", fixedLabels,
                nonMutatingSteps(null, null));
        String compound = "test/corpus/elkt-curated/tests/layered/port_label_placement/inside_compound_nodes_01.elkt";
        String loops = "test/corpus/elkt-curated/tickets/layered/273_insideSelfLoopsWithLabels.elkt";
        Supplier<ElkNode> compoundModel = () -> curated(compound, true), loopsModel = () -> curated(loops, false);
        add("site/transform/nonMutating/curated-inside-compound-nodes-01", "ElkGraphLayoutTransferrer", compoundModel,
                nonMutatingSteps(null, null));
        add("site/transform/nonMutating/layered-curated-inside-compound-nodes-01", "ElkGraphLayoutTransferrer",
                compoundModel, nonMutatingSteps(null, layeringSteps(compoundModel, null)));
        add("site/transform/nonMutating/curated-273-insideSelfLoopsWithLabels", "ElkGraphLayoutTransferrer", loopsModel,
                nonMutatingSteps(null, null));
        add("site/transform/nonMutating/layered-curated-273-insideSelfLoopsWithLabels", "ElkGraphLayoutTransferrer",
                loopsModel, nonMutatingSteps(null, layeringSteps(loopsModel, null)));
    }

    // ------------------------------------------------------------------------------------------------------------
    // S19: strings, origin identifiers, provider, hierarchy-aware processors

    /** toString and getDesignation of an element, and (with a non-null what) its origin identifier. */
    static void strings(B b, String name, String what) {
        b.q(name + ".toString", "toString", name).q(name + ".designation", "getDesignation", name);
        if (what != null) {
            b.q(name + ".origin", "getOriginIdentifier", name);
        }
    }

    static final String INCLUDE = "'layoutOptions':{'org.eclipse.elk.hierarchyHandling':'INCLUDE_CHILDREN'}";

    /** Ids at four nesting levels (root r, a, b, bb); labels with and without ids; an edge without ports. */
    static String originJson(String rootId) {
        return "{'id':'" + rootId + "'," + INCLUDE + ",'children':[{'id':'a'," + INCLUDE + ",'width':80,'height':60,"
                + "'labels':[{'text':'node a','width':20,'height':8}],"
                + "'ports':[{'id':'p','width':4,'height':4,'labels':[{'text':'port p','id':'pl','width':10,'height':6}]}],"
                + "'children':[{'id':'b'," + INCLUDE + ",'width':40,'height':30,'ports':[{'id':'q','width':2,'height':2}],"
                + "'labels':[{'id':'bl','text':'inner b','width':10,'height':6}],"
                + "'children':[{'id':'bb','width':10,'height':10,'ports':[{'id':'qq','width':2,'height':2,"
                + "'labels':[{'text':'deep','width':4,'height':4}]}]}]},{'id':'b2','width':10,'height':10}],"
                + "'edges':[{'id':'inner','sources':['b'],'targets':['b2'],"
                + "'labels':[{'text':'inner edge','id':'il','width':10,'height':6}]}]},"
                + "{'id':'c','width':10,'height':10}],"
                + "'edges':[{'id':'outer','sources':['a'],'targets':['c'],'labels':[{'text':'outer edge','width':10,'height':6}]},"
                + "{'id':'quiet','sources':['p'],'targets':['c']}]}";
    }

    /** Every name of the LGraph an import of the prepared graph (its target) produces, in natural name order. */
    static List<String> importedNames(Supplier<ElkNode> prepare, String target) {
        ElkNode root = ElkGraphJson.forGraph(export(prepare.get())).toElk();
        Dump d = new Dump(new ElkGraphTransformer().importGraph(importTarget(root, target)), true);
        List<String> names = new ArrayList<>(d.paths.values());
        names.sort(LayeredSiteVectors::byName);
        return names;
    }

    static void s19Origins() {
        for (String rootId : List.of("r", "")) {
            Supplier<ElkNode> prepare = elkJson(originJson(rootId));
            B b = new B();
            b.q("graph", "importGraph", "elk", (Object) null);
            for (String name : importedNames(prepare, null)) {
                strings(b, name, "origin");
            }
            add("site/strings/origin-identifiers-" + (rootId.isEmpty() ? "empty-root-id" : "root-id"), "ElkGraphTransformer",
                    prepare, b);
        }

        Supplier<ElkNode> prepare = elkJson(originJson("r"));
        B b = new B();
        b.q("graph", "importGraph", "elk", (Object) null);
        b.q("elkA", "elkFind", "elk", "a").q("elkP", "elkFind", "elk", "p").q("elkOuter", "elkFind", "elk", "outer")
                .q("elkQ", "elkFind", "elk", "q").q("elkRoot", "elkFind", "elk", "r");
        b.mk("withOriginNode", "newLNode", "g0").prop("withOriginNode", ORIGIN, ref("elkA"));
        b.mk("withOriginPort", "newLPort").prop("withOriginPort", ORIGIN, ref("elkP"));
        b.mk("withOriginEdge", "newLEdge").prop("withOriginEdge", ORIGIN, ref("elkOuter"));
        b.mk("emptyLabelWithOrigin", "newLLabelDefault").prop("emptyLabelWithOrigin", ORIGIN, ref("elkQ"));
        b.mk("textLabelWithOrigin", "newLLabel", "text wins").prop("textLabelWithOrigin", ORIGIN, ref("elkQ"));
        b.mk("nullTextLabelWithOrigin", "newLLabel", (Object) null).prop("nullTextLabelWithOrigin", ORIGIN, ref("elkA"));
        b.mk("graphWithOrigin", "newLGraph").prop("graphWithOrigin", ORIGIN, ref("elkRoot"));
        b.mk("nodeWithEmptyLabelAndOrigin", "newLNode", "g0").prop("nodeWithEmptyLabelAndOrigin", ORIGIN, ref("elkA"))
                .mk("emptyText", "newLLabelDefault").c("labelsAdd", "nodeWithEmptyLabelAndOrigin", "emptyText");
        b.mk("nodeWithLabel", "newLNode", "g0").prop("nodeWithLabel", ORIGIN, ref("elkA"))
                .mk("someText", "newLLabel", "caption").c("labelsAdd", "nodeWithLabel", "someText");
        b.mk("notElkOrigin", "newLNode", "g0").prop("notElkOrigin", ORIGIN, ref("withOriginNode"));
        b.mk("noOrigin", "newLNode", "g0");
        b.mk("portNoOrigin", "newLPort").mk("edgeNoOrigin", "newLEdge").mk("labelNoOrigin", "newLLabelDefault");
        for (String n : List.of("withOriginNode", "withOriginPort", "withOriginEdge", "emptyLabelWithOrigin",
                "textLabelWithOrigin", "nullTextLabelWithOrigin", "graphWithOrigin", "nodeWithEmptyLabelAndOrigin",
                "nodeWithLabel", "notElkOrigin", "noOrigin", "portNoOrigin", "edgeNoOrigin", "labelNoOrigin")) {
            strings(b, n, "origin");
        }
        add("site/strings/origin-set-by-steps", "ElkGraphTransformer", prepare, b);
    }

    static void s19Graph() {
        B b = layered2();
        b.q("empty", "toString", "g0");
        b.node("n1", "g0", 1, 1).node("n2", "g0", 1, 1);
        b.q("layerless", "toString", "g0");
        b.mk("loose", "newLNode", "g0").c("setLayer", "loose", "L0");
        b.q("both", "toString", "g0");
        b.c("layerlessRemove", "g0", "n1").c("layerlessRemove", "g0", "n2");
        b.q("layeredOnly", "toString", "g0");
        b.q("layer0", "toString", "L0").q("layer1", "toString", "L1");
        b.q("designation", "getDesignation", "g0").q("layerDesignation", "getDesignation", "L0");
        b.c("layersAdd", "g0", "L0");
        b.q("duplicateLayer", "toString", "g0");
        add("site/strings/lgraph", "LGraph", b);

        b = new B();
        b.mk("text", "newLLabel", "hello").mk("empty", "newLLabel", "").mk("defaultLabel", "newLLabelDefault")
                .mk("nullText", "newLLabel", (Object) null);
        for (String l : List.of("text", "empty", "defaultLabel", "nullText")) {
            b.q(l + ".text", "getText", l);
            strings(b, l, null);
        }
        add("site/strings/llabel", "LLabel", b);
    }

    static void s19Provider() {
        String flat = "{'id':'root','children':[{'id':'a','width':30,'height':20,'ports':[{'id':'ap','width':4,'height':4}]},"
                + "{'id':'b','width':30,'height':20},{'id':'c','width':30,'height':20}],"
                + "'edges':[{'id':'e1','sources':['ap'],'targets':['b']},{'id':'e2','sources':['b'],'targets':['c'],"
                + "'labels':[{'text':'lab','width':12,'height':6}]}]}";
        String nested = "{'id':'root'," + INCLUDE + ",'children':[{'id':'a','width':30,'height':20},"
                + "{'id':'g'," + INCLUDE + ",'children':[{'id':'g1','width':20,'height':20},{'id':'g2','width':20,'height':20}],"
                + "'edges':[{'id':'ge','sources':['g1'],'targets':['g2']}]}],"
                + "'edges':[{'id':'e1','sources':['a'],'targets':['g']}]}";
        for (String[] c : new String[][] {{"flat", flat, "basic"}, {"include-children", nested, "basic"},
            {"cancelled", flat, "cancelled"}, {"include-children-cancelled", nested, "cancelled"}}) {
            B b = new B();
            b.q("layout", "layout", "elk", c[2]);
            b.q("elk", "exportElk", "elk");
            add("site/provider/" + c[0], "LayeredLayoutProvider", elkJson(c[1]), b);
        }
        B b = new B();
        b.q("classes", "hierarchyAwareClasses", null);
        b.q("LayeredLayoutProvider", "isHierarchyAware", null, "LayeredLayoutProvider");
        b.q("ElkLayered", "isHierarchyAware", null, "ElkLayered");
        add("site/strings/hierarchyAware", "IHierarchyAwareLayoutProcessor", b);
    }

    static void s19() {
        s19Graph();
        s19Origins();
        s19Provider();
    }

    // ------------------------------------------------------------------------------------------------------------
    // S20-S22: enums, LayeredSpacings.OPTION_TARGET_FILTER, NodeFlexibility

    static void s20() throws Exception {
        List<Class<?>> enums = new ArrayList<>();
        for (String n : classNames(LayeredOptions.class, "org/eclipse/elk/alg/layered/options/")) {
            Class<?> k = load(n);
            if (k.isEnum() && k.getEnclosingClass() == null) {
                enums.add(k);
            }
        }
        enums.add(load("org.eclipse.elk.alg.layered.LayeredPhases"));
        enums.add(load("org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy"));
        enums.add(LNode.NodeType.class);
        for (Class<?> k : enums) {
            B b = new B();
            b.q("enum", "enumInfo", null, k.getName());
            add("site/enums/" + k.getSimpleName(), "enums", b);
        }
        System.err.println("enum rows " + enums.size());
    }

    static void s21() {
        Map<String, String> bySet = new TreeMap<>();
        for (LayoutOptionData o : LayoutMetaDataService.getInstance().getOptionData()) {
            if (PROPS.containsKey(o.getId())) {
                List<String> targets = new ArrayList<>();
                o.getTargets().forEach(t -> targets.add(t.name()));
                Collections.sort(targets);
                bySet.merge(String.join("+", targets), o.getId(), (x, y) -> x.compareTo(y) <= 0 ? x : y);
            }
        }
        List<String> ids = new ArrayList<>(bySet.values());
        ids.add(id(InternalProperties.ORIGIN));
        System.err.println("target sets " + bySet.keySet());
        String[] holders = {"graph", "node", "edge", "port", "label", "layer", "plain"};
        for (String h : holders) {
            B b = layered2();
            b.node("n", "g0", 1, 1).mk("p", "newLPort").mk("e", "newLEdge").mk("l", "newLLabelDefault")
                    .mk("plain", "newPropertyHolder");
            String on = switch (h) {
                case "graph" -> "g0";
                case "node" -> "n";
                case "edge" -> "e";
                case "port" -> "p";
                case "label" -> "l";
                case "layer" -> "L0";
                default -> "plain";
            };
            for (String id : ids) {
                b.q(id, "optionTargetFilter", on, id);
            }
            add("site/layeredSpacings/targetFilter/" + h, "LayeredSpacings", b);
        }
    }

    static void s22() {
        String nodeFlex = "NodeFlexibility";
        for (String c : List.of("NONE", "PORT_POSITION", "NODE_SIZE_WHERE_SPACE_PERMITS", "NODE_SIZE")) {
            B b = new B();
            b.node("nodeWith", "g0", 1, 1).prop("nodeWith", NODE_FLEXIBILITY, E(nodeFlex, c));
            b.node("nodeWithout", "g0", 1, 1);
            b.q("withOption", "NodeFlexibility.getNodeFlexibility", null, "nodeWith");
            b.q("withoutGraphUnset", "NodeFlexibility.getNodeFlexibility", null, "nodeWithout");
            b.prop("g0", NODE_FLEXIBILITY_DEFAULT, E(nodeFlex, c));
            b.q("withoutGraphDefault", "NodeFlexibility.getNodeFlexibility", null, "nodeWithout");
            b.q("withOptionGraphDefault", "NodeFlexibility.getNodeFlexibility", null, "nodeWith");
            add("site/nodeFlexibility/" + lower(c), "NodeFlexibility", b);
        }
        B b = new B();
        b.node("n", "g0", 1, 1);
        b.q("noGraphProperties", "NodeFlexibility.getNodeFlexibility", null, "n");
        b.mk("looseWith", "newLNode", (Object) null).prop("looseWith", NODE_FLEXIBILITY, E(nodeFlex, "PORT_POSITION"));
        b.q("looseWithOption", "NodeFlexibility.getNodeFlexibility", null, "looseWith");
        add("site/nodeFlexibility/graph-without-default", "NodeFlexibility", b);
    }

}
