// SPDX-License-Identifier: EPL-2.0
// Generates frozen JVM reference vectors (AD-13, D2/D4/D9/D10) for the ElkGraph model: the EMF behaviour of
// org.eclipse.elk.graph at the pinned ELK commit (unique live lists, inverse references, containment moves,
// property-map order, eAllContents order, toString, exceptions). Exercised: ELK org.eclipse.elk.graph --
// ElkGraphUtil, GraphIdentifierGenerator, ElkNode, ElkPort, ElkLabel, ElkEdge, ElkEdgeSection, ElkBendPoint,
// EMapPropertyHolder, properties.Property; EMF -- EList (add, add(int), set, remove, remove(int), move(int,int),
// move(int,E), clear), EObject.eContainer/eAllContents/eGet, ECollections.sort. This program only CALLS
// ELK/EMF and records results; it embeds no ELK or EMF implementation.
// Run: tools/vectors/graph-vectors.sh <outDir>  (java -cp ... GraphVectors.java <outDir> <scenarios>)
// Scenarios: tools/vectors/graph-scenarios.txt, fixed text (no randomness). "scenario <name>" opens a scenario;
// every other non-blank, non-# line is one step "op arg,arg,...". Arguments split on ","; "~" is null; an empty
// token is the empty string (an empty list for list-typed args). Types: element id (default), :s string, :i int,
// :d double, :b boolean, :l space-separated ids; a trailing "?" marks an optional argument, omitted from the
// step when absent (createLabel without text calls createLabel(parent); createBendPoint without x,y calls
// createBendPoint(section)). Script op "listMoveElement" is recorded as op "listMove" with an "element"
// argument (EList.move(int, E)); "listMove" with a "from" argument is EList.move(int, int).
// Output: {jdk, elkCommit, scenarios: [{name, steps: [step]}]}. A step holds "op", its arguments by
// name, "result" when the op returns a value (elements as ids), "throws" ({class: simple name,
// message}) when it threw, then the snapshot taken after the step:
//   state        -- every element created so far, in creation order: {class (eClass name), container
//                   (eContainer id | null), per-class scalars, lists (ids), toString (ElkNode, ElkPort,
//                   ElkEdge, ElkLabel, and any proxy; the identity hash "@<hex>" of a proxy's EMF toString,
//                   also inside an edge's endpoint list, is stripped, D5; null otherwise, D10)};
//   allContents  -- eAllContents() ids for every node and every other element with contents; property-map
//                   entries appear as "<holderId>#<propertyId>"; null when the walk revisits an element
//                   (EList.add into a containment list skips the recursion check, so cycles are possible);
//   propertyKeys -- property ids per holder with >= 1 property, in entry-list order;
//   properties   -- [[propertyId, value], ...] per such holder (all values are strings).
// Scalars: node/port identifier,x,y,width,height; label identifier,text,x,y,width,height; edge
// identifier; section identifier,startX,startY,endX,endY,incomingShape,outgoingShape; bend point x,y.
// Naming rule: a section returned by an op that the script never created (firstEdgeSection on an edge
// without sections) is named "<edgeId>.s<n>", n counting from 1 per edge.
// sortChildren = ECollections.sort(node.getChildren(), identifier descending by String.compareTo).
// generateIdentifiers = GraphIdentifierGenerator.forGraph(g).assertValid().assertExists().execute();
// assertUnique is never called (it draws from an unseeded Random).
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.function.Consumer;
import java.util.function.Function;
import org.eclipse.elk.graph.*;
import org.eclipse.elk.graph.properties.IProperty;
import org.eclipse.elk.graph.properties.IPropertyHolder;
import org.eclipse.elk.graph.properties.Property;
import org.eclipse.elk.graph.util.ElkGraphUtil;
import org.eclipse.elk.graph.util.GraphIdentifierGenerator;
import org.eclipse.emf.common.util.ECollections;
import org.eclipse.emf.common.util.EList;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.common.util.TreeIterator;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.EStructuralFeature;
import org.eclipse.emf.ecore.InternalEObject;

public class GraphVectors {
    private static final String JDK = System.getProperty("java.version");
    private static final String ELK_COMMIT = "8aaa3c145c2a18a38aabbc725aa3791ddc517a76";
    private static final String NULL_TOKEN = "~", ARG_SEP = ",", LIST_SEP = " ", SCENARIO = "scenario ";
    private static final String COMMENT = "#", ENTRY_CLASS = "ElkPropertyToValueMapEntry";
    private static final String PROXY_HASH = "@[0-9a-f]+(?= \\(eProxyURI: )";
    private static final Object VOID = new Object();
    private static final int FLAT_DEPTH = 6, HEX_RADIX = 16, HEX_WIDTH = 4;
    private static final Map<String, Op> OPS = new HashMap<>();
    private static final String[] SHAPE = {"identifier", "x", "y", "width", "height"};
    private static final Map<String, String[]> SCALARS = Map.of("ElkNode", SHAPE, "ElkPort", SHAPE,
        "ElkLabel", new String[] {"identifier", "text", "x", "y", "width", "height"},
        "ElkEdge", new String[] {"identifier"},
        "ElkEdgeSection", new String[] {"identifier", "startX", "startY", "endX", "endY", "incomingShape", "outgoingShape"},
        "ElkBendPoint", new String[] {"x", "y"}, ENTRY_CLASS, new String[] {});
    private static final Map<String, String[]> LISTS = Map.of(
        "ElkNode", new String[] {"labels", "ports", "children", "containedEdges", "outgoingEdges", "incomingEdges"},
        "ElkPort", new String[] {"labels", "outgoingEdges", "incomingEdges"},
        "ElkLabel", new String[] {"labels"},
        "ElkEdge", new String[] {"labels", "sources", "targets", "sections"},
        "ElkEdgeSection", new String[] {"bendPoints", "outgoingSections", "incomingSections"},
        "ElkBendPoint", new String[] {}, ENTRY_CLASS, new String[] {});
    private static final Set<String> WITH_TO_STRING = Set.of("ElkNode", "ElkPort", "ElkEdge", "ElkLabel");
    private static final Comparator<ElkNode> BY_IDENTIFIER_DESC = (x, y) -> y.getIdentifier().compareTo(x.getIdentifier());

    static {
        creationOps(); setterOps(); listOps(); propertyOps(); queryOps();
    }

    public static void main(String[] args) throws IOException {
        Path dir = Path.of(args[0]);
        Files.createDirectories(dir);
        List<Object> scenarios = new ArrayList<>();
        for (Map.Entry<String, List<String>> s : readScenarios(Path.of(args[1])).entrySet()) {
            scenarios.add(map("name", s.getKey(), "steps", runScenario(s.getValue())));
        }
        Map<String, Object> root = map("jdk", JDK, "elkCommit", ELK_COMMIT, "scenarios", scenarios);
        Files.writeString(dir.resolve("graph.json"), render(root, 0) + "\n", StandardCharsets.UTF_8);
    }

    private static Map<String, List<String>> readScenarios(Path file) throws IOException {
        Map<String, List<String>> out = new LinkedHashMap<>();
        List<String> steps = null;
        for (String raw : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            String line = raw.strip();
            if (line.startsWith(SCENARIO)) {
                steps = new ArrayList<>();
                if (out.put(line.substring(SCENARIO.length()), steps) != null) {
                    throw new AssertionError("duplicate scenario " + line);
                }
            } else if (!line.isEmpty() && !line.startsWith(COMMENT)) {
                Objects.requireNonNull(steps, "step before the first scenario").add(line);
            }
        }
        return out;
    }

    // ---- op table ----

    private record Op(String name, String[] args, Function<Args, Object> action) {}

    private static void def(String key, String name, String args, Function<Args, Object> action) {
        OPS.put(key, new Op(name, args.split(ARG_SEP), action));
    }

    private static void make(String name, String args, Function<Args, EObject> create) {
        def(name, name, args, a -> a.ctx.add(a.str("id"), create.apply(a)));
    }

    private static void eff(String name, String args, Consumer<Args> effect) {
        def(name, name, args, a -> run(effect, a));
    }

    private static void qry(String name, String args, Function<Args, Object> query) { def(name, name, args, query); }
    private static Object run(Consumer<Args> effect, Args a) {
        effect.accept(a);
        return VOID;
    }
    private static void creationOps() {
        make("createGraph", "id", a -> ElkGraphUtil.createGraph());
        make("createNode", "id,parent", a -> ElkGraphUtil.createNode(a.node("parent")));
        make("createPort", "id,parent", a -> ElkGraphUtil.createPort(a.node("parent")));
        make("createLabel", "id,parent,text:s?", GraphVectors::createLabel);
        make("createEdge", "id,containingNode", a -> ElkGraphUtil.createEdge(a.node("containingNode")));
        make("createSimpleEdge", "id,source,target",
            a -> ElkGraphUtil.createSimpleEdge(a.shape("source"), a.shape("target")));
        make("createHyperedge", "id,sources:l,targets:l",
            a -> ElkGraphUtil.createHyperedge(a.shapes("sources"), a.shapes("targets")));
        make("createEdgeSection", "id,edge", a -> ElkGraphUtil.createEdgeSection(a.edge("edge")));
        make("createBendPoint", "id,section,x:d?,y:d?", GraphVectors::createBendPoint);
        make("createPropertyEntry", "id",
            a -> ElkGraphFactory.eINSTANCE.create(ElkGraphPackage.Literals.ELK_PROPERTY_TO_VALUE_MAP_ENTRY));
    }

    private static void setterOps() {
        eff("setParent", "element,parent", GraphVectors::setParent);
        eff("setContainingNode", "edge,node", a -> a.edge("edge").setContainingNode(a.node("node")));
        eff("setIdentifier", "element,identifier:s", GraphVectors::setIdentifier);
        eff("setText", "label,text:s", a -> a.as("label", ElkLabel.class).setText(a.str("text")));
        eff("setLocation", "shape,x:d,y:d", a -> a.as("shape", ElkShape.class).setLocation(a.d("x"), a.d("y")));
        eff("setDimensions", "shape,width:d,height:d",
            a -> a.as("shape", ElkShape.class).setDimensions(a.d("width"), a.d("height")));
        eff("setStartLocation", "section,x:d,y:d", a -> a.section("section").setStartLocation(a.d("x"), a.d("y")));
        eff("setEndLocation", "section,x:d,y:d", a -> a.section("section").setEndLocation(a.d("x"), a.d("y")));
        eff("setIncomingShape", "section,shape", a -> a.section("section").setIncomingShape(a.shape("shape")));
        eff("setOutgoingShape", "section,shape", a -> a.section("section").setOutgoingShape(a.shape("shape")));
        eff("setProxyUri", "element,uri:s", a -> ((InternalEObject) a.el("element")).eSetProxyURI(URI.createURI(a.str("uri"))));
    }

    private static void listOps() {
        String owned = "owner,feature:s,";
        qry("listAdd", owned + "element", a -> a.list().add(a.el("element")));
        eff("listAddAt", owned + "index:i,element", a -> a.list().add(a.i("index"), a.el("element")));
        qry("listSet", owned + "index:i,element", a -> a.list().set(a.i("index"), a.el("element")));
        qry("listRemove", owned + "element", a -> a.list().remove(a.el("element")));
        qry("listRemoveAt", owned + "index:i", a -> a.list().remove(a.i("index")));
        qry("listMove", owned + "to:i,from:i", a -> a.list().move(a.i("to"), a.i("from")));
        def("listMoveElement", "listMove", owned + "to:i,element",
            a -> run(b -> b.list().move(b.i("to"), b.el("element")), a));
        eff("listClear", "owner,feature:s", a -> a.list().clear());
    }

    private static void propertyOps() {
        eff("setProperty", "holder,key:s,value:s", a -> a.holder("holder").setProperty(prop(a.str("key")), a.str("value")));
        eff("removeProperty", "holder,key:s", a -> a.holder("holder").setProperty(prop(a.str("key")), null));
        eff("copyProperties", "holder,source", a -> a.holder("holder").copyProperties(a.holder("source")));
        eff("sortChildren", "node", a -> ECollections.sort(a.node("node").getChildren(), BY_IDENTIFIER_DESC));
    }

    private static void queryOps() {
        eff("updateContainment", "edge", a -> ElkGraphUtil.updateContainment(a.edge("edge")));
        qry("findBestEdgeContainment", "edge", a -> ElkGraphUtil.findBestEdgeContainment(a.edge("edge")));
        qry("containingGraph", "element", a -> ElkGraphUtil.containingGraph(a.as("element", ElkGraphElement.class)));
        qry("findLowestCommonAncestor", "node1,node2",
            a -> ElkGraphUtil.findLowestCommonAncestor(a.node("node1"), a.node("node2")));
        qry("isDescendant", "child,ancestor", a -> ElkGraphUtil.isDescendant(a.node("child"), a.node("ancestor")));
        qry("elementLabeledBy", "label", a -> ElkGraphUtil.elementLabeledBy(a.as("label", ElkLabel.class)));
        qry("isHyperedge", "edge", a -> a.edge("edge").isHyperedge());
        qry("isHierarchical", "edge", a -> a.edge("edge").isHierarchical());
        qry("isSelfloop", "edge", a -> a.edge("edge").isSelfloop());
        qry("isConnected", "edge", a -> a.edge("edge").isConnected());
        qry("firstEdgeSection", "edge,reset:b,removeOthers:b",
            a -> ElkGraphUtil.firstEdgeSection(a.edge("edge"), a.b("reset"), a.b("removeOthers")));
        eff("generateIdentifiers", "graph",
            a -> GraphIdentifierGenerator.forGraph(a.node("graph")).assertValid().assertExists().execute());
    }

    private static EObject createLabel(Args a) {
        ElkGraphElement parent = a.as("parent", ElkGraphElement.class);
        return a.has("text") ? ElkGraphUtil.createLabel(a.str("text"), parent) : ElkGraphUtil.createLabel(parent);
    }

    private static EObject createBendPoint(Args a) {
        ElkEdgeSection section = a.section("section");
        return a.has("x") ? ElkGraphUtil.createBendPoint(section, a.d("x"), a.d("y"))
            : ElkGraphUtil.createBendPoint(section);
    }

    private static void setParent(Args a) {
        EObject child = a.el("element");
        if (child instanceof ElkNode n) {
            n.setParent(a.node("parent"));
        } else if (child instanceof ElkPort p) {
            p.setParent(a.node("parent"));
        } else if (child instanceof ElkLabel l) {
            l.setParent(a.as("parent", ElkGraphElement.class));
        } else {
            a.section("element").setParent(a.edge("parent"));
        }
    }

    private static void setIdentifier(Args a) {
        if (a.el("element") instanceof ElkGraphElement e) {
            e.setIdentifier(a.str("identifier"));
        } else {
            a.section("element").setIdentifier(a.str("identifier"));
        }
    }

    private static Property<String> prop(String id) { return new Property<>(id); }

    // ---- interpreter ----

    /** Script ids of one scenario, both directions; ids are never reused. AssertionError = script bug. */
    private static final class Ctx {
        final Map<String, EObject> byId = new LinkedHashMap<>();
        final Map<EObject, String> ids = new IdentityHashMap<>();
        final Map<String, Integer> autoNamed = new HashMap<>();
        Object add(String id, EObject o) {
            if (byId.containsKey(id) || ids.containsKey(o)) {
                throw new AssertionError("id reused: " + id);
            }
            byId.put(id, o);
            ids.put(o, id);
            return VOID;
        }
        EObject obj(String id) {
            EObject o = id == null ? null : byId.get(id);
            if (id != null && o == null) {
                throw new AssertionError("unknown id " + id);
            }
            return o;
        }
        String id(EObject o) {
            String id = o == null ? null : ids.get(o);
            if (o != null && id == null) {
                throw new AssertionError("unnamed element " + o.eClass().getName());
            }
            return id;
        }
        /** Names an unknown section returned by an op: "<edgeId>.s<n>". */
        String name(EObject o) {
            if (o instanceof ElkEdgeSection && !ids.containsKey(o)) {
                String edge = id(o.eContainer());
                add(edge + ".s" + autoNamed.merge(edge, 1, Integer::sum), o);
            }
            return id(o);
        }
    }

    /** Bound arguments of one step, in spec order; recorded verbatim. */
    private static final class Args {
        final Ctx ctx;
        final Map<String, Object> values = new LinkedHashMap<>();
        Args(Ctx ctx) { this.ctx = ctx; }
        boolean has(String k) { return values.containsKey(k); }
        String str(String k) { return (String) values.get(k); }
        int i(String k) { return (Integer) values.get(k); }
        double d(String k) { return (Double) values.get(k); }
        boolean b(String k) { return (Boolean) values.get(k); }
        EObject el(String k) { return ctx.obj(str(k)); }
        ElkNode node(String k) { return as(k, ElkNode.class); }
        ElkEdge edge(String k) { return as(k, ElkEdge.class); }
        ElkEdgeSection section(String k) { return as(k, ElkEdgeSection.class); }
        ElkConnectableShape shape(String k) { return as(k, ElkConnectableShape.class); }
        IPropertyHolder holder(String k) { return as(k, EMapPropertyHolder.class); }
        <T> T as(String k, Class<T> type) {
            EObject o = el(k);
            if (o != null && !type.isInstance(o)) {
                throw new AssertionError(k + " is not a " + type.getSimpleName());
            }
            return type.cast(o);
        }
        List<ElkConnectableShape> shapes(String k) {
            List<ElkConnectableShape> out = new ArrayList<>();
            for (Object id : (List<?>) values.get(k)) {
                out.add(ElkConnectableShape.class.cast(ctx.obj((String) id)));
            }
            return out;
        }
        @SuppressWarnings("unchecked")
        EList<Object> list() {
            EObject owner = el("owner");
            return (EList<Object>) owner.eGet(feature(owner, str("feature")));
        }
    }

    private static EStructuralFeature feature(EObject o, String name) {
        EStructuralFeature f = o.eClass().getEStructuralFeature(name);
        if (f == null) {
            throw new AssertionError(o.eClass().getName() + " has no feature " + name);
        }
        return f;
    }

    private static List<Object> runScenario(List<String> script) {
        Ctx ctx = new Ctx();
        List<Object> steps = new ArrayList<>();
        for (String step : script) {
            steps.add(runStep(ctx, step));
        }
        return steps;
    }

    private static Map<String, Object> runStep(Ctx ctx, String text) {
        int space = text.indexOf(' ');
        Op op = OPS.get(space >= 0 ? text.substring(0, space) : text);
        if (op == null) {
            throw new AssertionError("unknown op in " + text);
        }
        Args a = bind(ctx, op, space >= 0 ? text.substring(space + 1).split(ARG_SEP, -1) : new String[0]);
        Map<String, Object> step = map("op", op.name());
        step.putAll(a.values);
        try {
            Object result = op.action().apply(a);
            if (result != VOID) {
                step.put("result", result instanceof EObject o ? ctx.name(o) : result);
            }
        } catch (RuntimeException e) {
            step.put("throws", map("class", e.getClass().getSimpleName(), "message", e.getMessage()));
        }
        snapshot(ctx, step);
        return step;
    }

    private static Args bind(Ctx ctx, Op op, String[] tokens) {
        Args a = new Args(ctx);
        String[] specs = op.args();
        if (tokens.length > specs.length) {
            throw new AssertionError("too many arguments for " + op.name());
        }
        for (int i = 0; i < specs.length; i++) {
            boolean optional = specs[i].endsWith("?");
            String[] spec = specs[i].replace("?", "").split(":");
            if (i >= tokens.length && !optional) {
                throw new AssertionError("missing " + spec[0] + " for " + op.name());
            } else if (tokens.length > i) {
                a.values.put(spec[0], parse(spec.length > 1 ? spec[1] : "", tokens[i]));
            }
        }
        return a;
    }

    private static Object parse(String type, String token) {
        if (NULL_TOKEN.equals(token)) {
            return null;
        }
        try {
            return switch (type) {
                case "i" -> Integer.valueOf(token);
                case "d" -> Double.valueOf(token);
                case "b" -> Boolean.valueOf(token);
                case "l" -> token.isEmpty() ? List.of() : Arrays.asList(token.split(LIST_SEP));
                default -> token;
            };
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("bad :" + type + " literal in scenario: " + token, e);
        }
    }

    // ---- snapshot ----

    private static void snapshot(Ctx ctx, Map<String, Object> step) {
        Map<String, Object> state = new LinkedHashMap<>(), contents = new LinkedHashMap<>();
        Map<String, Object> keys = new LinkedHashMap<>(), props = new LinkedHashMap<>();
        for (Map.Entry<String, EObject> e : ctx.byId.entrySet()) {
            EObject o = e.getValue();
            state.put(e.getKey(), record(ctx, o));
            if (o instanceof ElkNode || !o.eContents().isEmpty()) {
                contents.put(e.getKey(), allContents(ctx, o));
            }
            if (o instanceof EMapPropertyHolder h && !h.getProperties().isEmpty()) {
                keys.put(e.getKey(), properties(h, false));
                props.put(e.getKey(), properties(h, true));
            }
        }
        step.putAll(map("state", state, "allContents", contents, "propertyKeys", keys, "properties", props));
    }

    private static Map<String, Object> record(Ctx ctx, EObject o) {
        String cls = o.eClass().getName();
        Map<String, Object> r = map("class", cls, "container", ctx.id(o.eContainer()));
        for (String f : SCALARS.get(cls)) {
            r.put(f, value(ctx, o.eGet(feature(o, f))));
        }
        Map<String, Object> lists = new LinkedHashMap<>();
        for (String f : LISTS.get(cls)) {
            lists.put(f, value(ctx, o.eGet(feature(o, f))));
        }
        r.put("lists", lists);
        r.put("toString", o.eIsProxy() || WITH_TO_STRING.contains(cls) ? o.toString().replaceAll(PROXY_HASH, "") : null);
        return r;
    }

    private static Object value(Ctx ctx, Object v) {
        if (v instanceof List<?> l) {
            List<Object> out = new ArrayList<>();
            for (Object x : l) {
                out.add(ctx.id((EObject) x));
            }
            return out;
        }
        return v instanceof EObject o ? ctx.id(o) : v;
    }

    /** eAllContents() ids; null when the walk revisits an element (a containment cycle: it never ends). */
    private static List<Object> allContents(Ctx ctx, EObject root) {
        List<Object> out = new ArrayList<>();
        Set<EObject> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        for (TreeIterator<EObject> it = root.eAllContents(); it.hasNext();) {
            EObject o = it.next();
            if (!seen.add(o)) {
                return null;
            }
            out.add(ENTRY_CLASS.equals(o.eClass().getName()) ? entryId(ctx, o) : ctx.id(o));
        }
        return out;
    }
    private static String entryId(Ctx ctx, EObject entry) {
        return ctx.id(entry.eContainer()) + "#" + ((IProperty<?>) ((Map.Entry<?, ?>) entry).getKey()).getId();
    }

    /** Property ids (or [id, value] pairs) of a holder, in entry-list order. */
    private static List<Object> properties(EMapPropertyHolder h, boolean withValues) {
        List<Object> out = new ArrayList<>();
        for (Map.Entry<IProperty<?>, Object> e : h.getProperties()) {
            String id = e.getKey().getId();
            out.add(withValues ? Arrays.asList(id, e.getValue()) : id);
        }
        return out;
    }

    // ---- JSON writer: maps and lists of maps multi-line above FLAT_DEPTH; everything else on one line ----

    private static String render(Object o, int depth) {
        if (o instanceof Map<?, ?> m) {
            List<String> parts = new ArrayList<>();
            for (Map.Entry<?, ?> e : m.entrySet()) {
                parts.add(quote((String) e.getKey()) + ": " + render(e.getValue(), depth + 1));
            }
            return join(parts, "{", "}", FLAT_DEPTH > depth, depth);
        } else if (o instanceof List<?> l) {
            boolean multi = FLAT_DEPTH > depth && l.stream().anyMatch(Map.class::isInstance);
            return join(l.stream().map(x -> render(x, depth + 1)).toList(), "[", "]", multi, depth);
        }
        return o instanceof String s ? quote(s) : String.valueOf(o);
    }

    private static String join(List<String> parts, String open, String close, boolean lines, int depth) {
        if (parts.isEmpty()) {
            return open + close;
        }
        String pad = "  ".repeat(depth + 1);
        return lines ? open + "\n" + pad + String.join(",\n" + pad, parts) + "\n" + "  ".repeat(depth) + close
            : open + String.join(", ", parts) + close;
    }

    private static String quote(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char ch : s.toCharArray()) {
            if (ch == '"' || ch == '\\') {
                b.append('\\').append(ch);
            } else if (' ' > ch) {
                String hex = Integer.toString(ch, HEX_RADIX);
                b.append("\\u").append("0".repeat(HEX_WIDTH - hex.length())).append(hex);
            } else {
                b.append(ch);
            }
        }
        return b.append('"').toString();
    }

    private static Map<String, Object> map(Object... kv) {
        if ((kv.length & 1) != 0) { throw new IllegalArgumentException("map() takes key/value pairs, got " + kv.length); }
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) {
            m.put((String) kv[i], kv[i + 1]);
        }
        return m;
    }
}
