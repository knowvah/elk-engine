// SPDX-License-Identifier: EPL-2.0
// The built DOT models of DotWriteVectors.java (its header describes the families and how rows are recorded): helper
// source of that multi-file recorder program (tools/vectors/java-program.sh). Models are made with DotFactory.eINSTANCE
// only. No `oracle` stamp, no pin read (D7, issue #173).
import java.util.*;
import java.util.function.Supplier;
import org.eclipse.elk.alg.graphviz.dot.dot.*;

/** Table of built models: id -> fresh model supplier, in recording order. */
final class DotWriteModels {
    private DotWriteModels() { }

    static Map<String, Supplier<GraphvizModel>> table() {
        Map<String, Supplier<GraphvizModel>> t = new LinkedHashMap<>();
        Statements.add(t);
        Values.add(t);
        Nulls.add(t);
        Autowrap.add(t);
        Widths.add(t);
        return t;
    }

    // ---- model builders (DotFactory.eINSTANCE only) ----
    static final class B {
        static final DotFactory F = DotFactory.eINSTANCE;

        static GraphvizModel model(Graph... graphs) {
            GraphvizModel m = F.createGraphvizModel();
            m.getGraphs().addAll(List.of(graphs));
            return m;
        }

        /** Graph of type t (left unset when t is GRAPH, the EMF default), name (null: unset), statements. */
        static Graph graph(GraphType t, String name, Statement... statements) {
            Graph g = F.createGraph();
            if (t != GraphType.GRAPH) {
                g.setType(t);
            }
            g.setName(name);
            g.getStatements().addAll(List.of(statements));
            return g;
        }

        static Graph strict(Graph g) {
            g.setStrict(true);
            return g;
        }

        static GraphvizModel digraph(Statement... statements) {
            return model(graph(GraphType.DIGRAPH, "G", statements));
        }

        static Node node(String name, Port port) {
            Node n = F.createNode();
            n.setName(name);
            n.setPort(port);
            return n;
        }

        static Port port(String name, String compass) {
            Port p = F.createPort();
            p.setName(name);
            p.setCompass_pt(compass);
            return p;
        }

        static NodeStatement n(String name, Attribute... attributes) {
            return n(node(name, null), attributes);
        }

        static NodeStatement n(Node node, Attribute... attributes) {
            NodeStatement s = F.createNodeStatement();
            s.setNode(node);
            s.getAttributes().addAll(List.of(attributes));
            return s;
        }

        static Attribute a(String name, String value) {
            Attribute a = F.createAttribute();
            a.setName(name);
            a.setValue(value);
            return a;
        }

        static AttributeStatement as(AttributeType type, Attribute... attributes) {
            AttributeStatement s = F.createAttributeStatement();
            s.setType(type);
            s.getAttributes().addAll(List.of(attributes));
            return s;
        }

        static EdgeTarget to(EdgeOperator op, Node target) {
            EdgeTarget t = F.createEdgeTarget();
            t.setOperator(op);
            t.setTargetnode(target);
            return t;
        }

        static EdgeTarget toSub(EdgeOperator op, Subgraph target) {
            EdgeTarget t = F.createEdgeTarget();
            t.setOperator(op);
            t.setTargetSubgraph(target);
            return t;
        }

        static EdgeStatement e(Node source, List<Attribute> attributes, EdgeTarget... targets) {
            EdgeStatement s = F.createEdgeStatement();
            s.setSourceNode(source);
            s.getEdgeTargets().addAll(List.of(targets));
            s.getAttributes().addAll(attributes);
            return s;
        }

        /** a -> b with the given attributes. */
        static EdgeStatement arrow(String source, String target, Attribute... attributes) {
            return e(node(source, null), List.of(attributes), to(EdgeOperator.DIRECTED, node(target, null)));
        }

        static Subgraph sub(String name, Statement... statements) {
            Subgraph s = F.createSubgraph();
            s.setName(name);
            s.getStatements().addAll(List.of(statements));
            return s;
        }

        static String repeat(String unit, int times) {
            return unit.repeat(times);
        }

        /** count attributes "<prefix>NN" = value(NN). */
        static Attribute[] attrs(String prefix, int count, java.util.function.IntFunction<String> value) {
            Attribute[] out = new Attribute[count];
            for (int i = 0; i < count; i++) {
                out[i] = a(String.format("%s%02d", prefix, i), value.apply(i));
            }
            return out;
        }

        /** EdgeTarget variants the grammar cannot produce: no target, both targets, operator left unset. */
        static final class DotFactoryTargets {
            static EdgeTarget empty() {
                EdgeTarget t = F.createEdgeTarget();
                t.setOperator(EdgeOperator.UNDIRECTED);
                return t;
            }

            static EdgeTarget both() {
                EdgeTarget t = to(EdgeOperator.DIRECTED, node("b", null));
                t.setTargetSubgraph(sub(null, n("c")));
                return t;
            }

            static EdgeTarget operatorUnset() {
                EdgeTarget t = F.createEdgeTarget();
                t.setTargetnode(node("b", null));
                return t;
            }
        }
    }

    // ---- the built model table ----

    /** stmt/*: every statement kind and graph option. */
    static final class Statements {
        static void add(Map<String, Supplier<GraphvizModel>> t) {
            t.put("built/stmt/all-kinds", Statements::allKinds);
            t.put("built/stmt/strict-graph", () -> B.model(B.strict(B.graph(GraphType.GRAPH, "g", B.n("a")))));
            t.put("built/stmt/strict-digraph-unnamed", () -> B.model(B.strict(B.graph(GraphType.DIGRAPH, null))));
            t.put("built/stmt/unnamed-graph", () -> B.model(B.graph(GraphType.GRAPH, null, B.n("a"))));
            t.put("built/stmt/two-graphs", () -> B.model(B.graph(GraphType.GRAPH, "A", B.n("a")),
                B.graph(GraphType.DIGRAPH, "B", B.n("b"))));
            t.put("built/stmt/undirected-chain", () -> B.model(B.graph(GraphType.GRAPH, "g", B.e(B.node("a", null),
                List.of(), B.to(EdgeOperator.UNDIRECTED, B.node("b", null)),
                B.to(EdgeOperator.UNDIRECTED, B.node("c", null))))));
            t.put("built/stmt/mixed-operators", () -> B.digraph(B.e(B.node("a", null), List.of(),
                B.to(EdgeOperator.DIRECTED, B.node("b", null)), B.to(EdgeOperator.UNDIRECTED, B.node("c", null)))));
            t.put("built/stmt/edge-to-subgraphs", Statements::edgeToSubgraphs);
            t.put("built/stmt/ports", Statements::ports);
            t.put("built/stmt/nested-subgraphs", () -> B.digraph(B.sub("cluster_0", B.sub("cluster_1",
                B.sub(null, B.n("a"), B.arrow("a", "b")), B.n("c")), B.as(AttributeType.GRAPH, B.a("label", "x")))));
            t.put("built/stmt/attribute-types", () -> B.digraph(B.as(AttributeType.GRAPH, B.a("rankdir", "LR")),
                B.as(AttributeType.NODE, B.a("shape", "box"), B.a("fixedsize", "true")),
                B.as(AttributeType.EDGE, B.a("dir", "none"))));
            t.put("built/stmt/exporter-shape", Statements::exporterShape);
        }

        static GraphvizModel allKinds() {
            return B.digraph(B.as(AttributeType.GRAPH, B.a("rankdir", "LR")), B.as(AttributeType.NODE, B.a("shape", "box")),
                B.as(AttributeType.EDGE, B.a("dir", "none")), B.n("a"), B.n(B.node("a", B.port("p", "n"))),
                B.n("b", B.a("label", "\"B\""), B.a("width", "0.5")), B.arrow("a", "b"),
                B.e(B.node("a", null), List.of(), B.to(EdgeOperator.UNDIRECTED, B.node("b", null))), B.a("x", "y"),
                B.sub("cluster_0", B.n("c")), B.sub(null, B.n("d")),
                B.e(B.node("a", null), List.of(B.a("color", "red")), B.toSub(EdgeOperator.DIRECTED, B.sub(null, B.n("e")))));
        }

        static GraphvizModel edgeToSubgraphs() {
            return B.digraph(B.e(B.node("a", null), List.of(B.a("label", "\"chain\"")),
                B.toSub(EdgeOperator.DIRECTED, B.sub("s", B.n("b"), B.n("c"))),
                B.toSub(EdgeOperator.DIRECTED, B.sub(null, B.n("d"))), B.to(EdgeOperator.DIRECTED, B.node("e", null))));
        }

        static GraphvizModel ports() {
            return B.digraph(B.n(B.node("a", B.port("n", null))), B.n(B.node("a", B.port("p", "ne"))),
                B.n(B.node("a", B.port("\"port name\"", "s"))), B.n(B.node("a", B.port("1", "_"))),
                B.e(B.node("a", B.port("p", "c")), List.of(), B.to(EdgeOperator.DIRECTED, B.node("b", B.port("q", "sw")))));
        }

        static GraphvizModel exporterShape() {
            return B.digraph(B.as(AttributeType.GRAPH, B.a("compound", "true")),
                B.as(AttributeType.NODE, B.a("shape", "box"), B.a("fixedsize", "true")),
                B.as(AttributeType.EDGE, B.a("dir", "none")),
                B.n("node1", B.a("width", "\"0.4166666666666667\""), B.a("height", "\"0.2777777777777778\""),
                    B.a("label", "\"n1\"")),
                B.n("node2", B.a("width", "\"0.4166666666666667\""), B.a("height", "\"0.2777777777777778\"")),
                B.arrow("node1", "node2", B.a("comment", "\"e1\""), B.a("pos", "\"10.0,20.0 30.0,40.0\"")));
        }
    }

    /** value/<position>/<label>: one model per value in one position. */
    static final class Values {
        static final String[][] VALUES = {
            {"plain", "a"}, {"space", "a b"}, {"float", "1.5"}, {"negative-int", "-3"}, {"leading-zero", "007"},
            {"negative-zero", "-0"}, {"dot-float", ".5"}, {"trailing-dot", "1."}, {"quoted", "\"quoted\""},
            {"quoted-empty", "\"\""}, {"empty", ""}, {"keyword-node", "node"}, {"keyword-graph", "graph"},
            {"keyword-strict", "strict"}, {"keyword-subgraph", "subgraph"}, {"keyword-case", "Graph"},
            {"quoted-escaped-quote", "\"a\\\"b\""}, {"bare-quote", "a\"b"}, {"quoted-newline", "\"line\nbreak\""},
            {"bare-newline", "line\nbreak"}, {"caret", "^a"}, {"minus", "-"}, {"non-ascii", "café"},
            {"html", "<b>x</b>"}, {"unterminated", "\"open"}, {"semicolon", "a;b"}, {"equals", "a=b"}, {"brace", "{"},
            {"comment", "/* c */"}, {"hash", "# x"}, {"line-comment", "// x"}, {"hyphenated", "a-b"},
            {"arrow", "a->b"}, {"underscore", "_"}, {"tab", "a\tb"},
        };
        static final String[][] ID_VALUES = {
            {"plain", "cluster_0"}, {"compass", "ne"}, {"underscore", "_"}, {"keyword-node", "node"},
            {"keyword-subgraph", "subgraph"}, {"keyword-case", "Node"}, {"space", "a b"}, {"int", "1"},
            {"quoted", "\"q\""}, {"caret", "^x"}, {"empty", ""}, {"non-ascii", "café"},
        };

        static void add(Map<String, Supplier<GraphvizModel>> t) {
            for (String[] v : VALUES) {
                String x = v[1];
                t.put("built/value/graph-name/" + v[0], () -> B.model(B.graph(GraphType.DIGRAPH, x, B.n("a"))));
                t.put("built/value/node-name/" + v[0], () -> B.digraph(B.n(x)));
                t.put("built/value/port-name/" + v[0], () -> B.digraph(B.n(B.node("a", B.port(x, null)))));
                t.put("built/value/attribute-name/" + v[0], () -> B.digraph(B.n("a", B.a(x, "v"))));
                t.put("built/value/attribute-value/" + v[0], () -> B.digraph(B.n("a", B.a("label", x))));
                t.put("built/value/statement-value/" + v[0], () -> B.digraph(B.a("label", x)));
            }
            for (String[] v : ID_VALUES) {
                String x = v[1];
                t.put("built/value/subgraph-name/" + v[0], () -> B.digraph(B.sub(x, B.n("a"))));
                t.put("built/value/compass/" + v[0], () -> B.digraph(B.n(B.node("a", B.port("p", x)))));
            }
        }
    }

    /** null/*: null or unset features, empty lists. */
    static final class Nulls {
        static void add(Map<String, Supplier<GraphvizModel>> t) {
            t.put("built/null/empty-model", B::model);
            t.put("built/null/empty-graph", () -> B.model(B.graph(GraphType.GRAPH, null)));
            t.put("built/null/empty-digraph-named", () -> B.model(B.graph(GraphType.DIGRAPH, "G")));
            t.put("built/null/list-attribute-without-value", () -> B.digraph(B.n("a", B.a("fixedsize", null))));
            t.put("built/null/list-attributes-mixed-values", () -> B.digraph(B.n("a", B.a("x", null), B.a("y", "1"),
                B.a("z", null))));
            t.put("built/null/statement-attribute-without-value", () -> B.digraph(B.a("x", null)));
            t.put("built/null/attribute-without-name", () -> B.digraph(B.n("a", B.a(null, "v"))));
            t.put("built/null/statement-attribute-without-name", () -> B.digraph(B.a(null, "v")));
            t.put("built/null/node-without-name", () -> B.digraph(B.n((String) null)));
            t.put("built/null/node-statement-without-node", () -> B.digraph(B.n((Node) null)));
            t.put("built/null/port-without-compass", () -> B.digraph(B.n(B.node("a", B.port("p", null)))));
            t.put("built/null/port-without-name", () -> B.digraph(B.n(B.node("a", B.port(null, "n")))));
            t.put("built/null/subgraph-without-name", () -> B.digraph(B.sub(null, B.n("a"))));
            t.put("built/null/empty-subgraph", () -> B.digraph(B.sub(null)));
            t.put("built/null/empty-named-subgraph", () -> B.digraph(B.sub("s")));
            t.put("built/null/empty-attribute-statement", () -> B.digraph(B.as(AttributeType.NODE)));
            t.put("built/null/attribute-statement-type-unset", () -> B.digraph(B.as(null, B.a("x", "1"))));
            t.put("built/null/edge-without-targets", () -> B.digraph(B.e(B.node("a", null), List.of())));
            t.put("built/null/edge-without-source", () -> B.digraph(B.e(null, List.of(),
                B.to(EdgeOperator.DIRECTED, B.node("b", null)))));
            t.put("built/null/edge-target-empty", () -> B.digraph(B.e(B.node("a", null), List.of(),
                B.DotFactoryTargets.empty())));
            t.put("built/null/edge-target-both", () -> B.digraph(B.e(B.node("a", null), List.of(),
                B.DotFactoryTargets.both())));
            t.put("built/null/edge-operator-unset", () -> B.digraph(B.e(B.node("a", null), List.of(),
                B.DotFactoryTargets.operatorUnset())));
            t.put("built/null/bare-statement", () -> B.digraph(B.F.createStatement()));
        }
    }

    /** autowrap/*: single-line forms over 255 characters. */
    static final class Autowrap {
        static void add(Map<String, Supplier<GraphvizModel>> t) {
            t.put("built/autowrap/long-quoted-value-no-break", () -> B.digraph(B.n("a",
                B.a("label", "\"" + B.repeat("x", 300) + "\""))));
            t.put("built/autowrap/long-quoted-value-with-spaces", () -> B.digraph(B.n("a",
                B.a("label", "\"" + B.repeat("word ", 80).trim() + "\""))));
            t.put("built/autowrap/long-bare-value", () -> B.digraph(B.n("a", B.a("label", B.repeat("y", 300)))));
            t.put("built/autowrap/many-attributes", () -> B.digraph(B.n("a", B.attrs("attr", 40, i -> "value" + i))));
            t.put("built/autowrap/many-quoted-attributes", () -> B.digraph(B.n("a",
                B.attrs("k", 30, i -> "\"quoted value " + i + "\""))));
            addChains(t);
        }

        static void addChains(Map<String, Supplier<GraphvizModel>> t) {
            t.put("built/autowrap/long-edge-chain", () -> B.digraph(chain(80)));
            t.put("built/autowrap/edge-chain-with-attributes", () -> B.digraph(chain(30,
                B.attrs("e", 20, i -> "\"v" + i + "\""))));
            t.put("built/autowrap/nested-subgraphs", Autowrap::nested);
            t.put("built/autowrap/long-attribute-statement", () -> B.digraph(B.as(AttributeType.GRAPH,
                B.attrs("g", 40, i -> "\"" + i + "\""))));
            t.put("built/autowrap/long-graph-name", () -> B.model(B.graph(GraphType.DIGRAPH,
                "\"" + B.repeat("n", 300) + "\"", B.n("a"))));
            t.put("built/autowrap/two-long-tokens", () -> B.digraph(B.n(B.repeat("p", 200),
                B.a("label", "\"" + B.repeat("q", 200) + "\""))));
            t.put("built/autowrap/long-token-after-short", () -> B.digraph(B.n("a", B.a("w", "1"),
                B.a("label", "\"" + B.repeat("z", 260) + "\""), B.a("h", "2"))));
            t.put("built/autowrap/subgraph-chain-targets", Autowrap::subgraphTargets);
            t.put("built/autowrap/two-long-graphs", () -> B.model(
                B.graph(GraphType.DIGRAPH, "A", B.n("a", B.attrs("a", 30, i -> "x" + i))),
                B.graph(GraphType.GRAPH, "B", B.n("b", B.attrs("b", 30, i -> "y" + i)))));
            t.put("built/autowrap/exporter-edge-pos", Autowrap::exporterPos);
            t.put("built/autowrap/long-port-names", () -> B.digraph(B.e(B.node("a", B.port(B.repeat("s", 140), "n")),
                List.of(), B.to(EdgeOperator.DIRECTED, B.node("b", B.port(B.repeat("t", 140), "s"))))));
            t.put("built/autowrap/statement-attribute", () -> B.digraph(B.a("label", "\"" + B.repeat("w", 280) + "\"")));
            t.put("built/autowrap/three-wraps", () -> B.digraph(B.n("a", B.attrs("long_attribute_", 60, i -> "v" + i))));
        }

        static EdgeStatement chain(int length, Attribute... attributes) {
            EdgeTarget[] targets = new EdgeTarget[length - 1];
            for (int i = 1; i < length; i++) {
                targets[i - 1] = B.to(EdgeOperator.DIRECTED, B.node(String.format("n%02d", i), null));
            }
            return B.e(B.node("n00", null), List.of(attributes), targets);
        }

        static GraphvizModel nested() {
            Statement inner = B.n("deep", B.attrs("d", 30, i -> "\"" + i + "\""));
            for (int level = 4; level >= 0; level--) {
                inner = B.sub("cluster_" + level, B.n("n" + level, B.attrs("a", 25, i -> "v" + i)), inner);
            }
            return B.digraph(inner);
        }

        static GraphvizModel subgraphTargets() {
            EdgeTarget[] targets = new EdgeTarget[6];
            for (int i = 0; i < targets.length; i++) {
                Statement[] nodes = new Statement[8];
                for (int j = 0; j < nodes.length; j++) {
                    nodes[j] = B.n(String.format("node_%d_%d", i, j));
                }
                targets[i] = B.toSub(EdgeOperator.DIRECTED, B.sub(null, nodes));
            }
            return B.digraph(B.e(B.node("src", null), List.of(), targets));
        }

        static GraphvizModel exporterPos() {
            StringBuilder pos = new StringBuilder("\"");
            for (int i = 0; i < 40; i++) {
                pos.append(i == 0 ? "" : " ").append(10.5 + i * 3.25).append(',').append(20.0 + i * 7.125);
            }
            return B.digraph(B.arrow("node1", "node2", B.a("comment", "\"e1\""), B.a("pos", pos.append('"').toString())));
        }
    }

    /** width/<shape>/<k>: the same statement with a value of k 'x' characters, k over a range. */
    static final class Widths {
        static void add(Map<String, Supplier<GraphvizModel>> t) {
            for (int width = 228; width <= 250; width++) {
                int k = width;
                String x = "\"" + B.repeat("x", k) + "\"";
                t.put(String.format("built/width/node-label/%03d", k), () -> B.digraph(B.n("n", B.a("label", x))));
                t.put(String.format("built/width/statement-value/%03d", k), () -> B.digraph(B.a("label", x)));
                t.put(String.format("built/width/nested3/%03d", k), () -> B.digraph(B.sub("s1",
                    B.sub("s2", B.n("n", B.a("label", x))))));
                t.put(String.format("built/width/spaced/%03d", k), () -> B.digraph(B.n("n",
                    B.a("label", "\"" + spaced(k) + "\""))));
                t.put(String.format("built/width/two-attributes/%03d", k), () -> B.digraph(B.n("n",
                    B.a("a", B.repeat("x", k - 120)), B.a("b", B.repeat("y", 110)))));
            }
        }

        /** k characters: "x x x ..." (a space every other character). */
        static String spaced(int k) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < k; i++) {
                sb.append(i % 2 == 0 ? 'x' : ' ');
            }
            return sb.toString();
        }
    }
}
