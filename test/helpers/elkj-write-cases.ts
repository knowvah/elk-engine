// SPDX-License-Identifier: EPL-2.0
// Inputs of the T5 `.elkj` writer vectors (test/golden/refs/java/graph-json-text-write.json), shared by the serializer
// and formatter tests: `.elkt` scenarios via ElkGraphText.load, `.json` via ElkGraphJson, `.elkj` via
// ElkGraphJsonText.load, and the `java-*` graphs rebuilt from the JAVA SCENARIOS header of ElkjWriteVectors.java.
import { readFileSync } from 'node:fs';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { LayoutOptionData } from '../../src/core/data/LayoutOptionData.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { Direction } from '../../src/core/options/Direction.js';
import { SizeConstraint } from '../../src/core/options/SizeConstraint.js';
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { ElkPadding } from '../../src/core/math/ElkPadding.js';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { IndividualSpacings } from '../../src/core/util/IndividualSpacings.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import '../../src/graph/impl/ElkGraphFactoryImpl.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ElkGraphJsonText } from '../../src/graph/json/text/ElkGraphJsonText.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { Property } from '../../src/graph/properties/Property.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';

const SCENARIOS = new URL('../../tools/vectors/elkj-write-scenarios/', import.meta.url);

/** The recorded input kinds of a writer vector row. */
export type ElkjWriteSource = 'elkt' | 'json' | 'elkj' | 'java';

type Scenario = () => ElkNode;

function graph(): ElkNode {
  const root = ElkGraphUtil.createGraph();
  root.setIdentifier('g');
  return root;
}

function node(parent: ElkNode, id: string): ElkNode {
  const created = ElkGraphUtil.createNode(parent);
  created.setIdentifier(id);
  return created;
}

function port(parent: ElkNode, id: string): ElkNode {
  ElkGraphUtil.createPort(parent).setIdentifier(id);
  return parent;
}

/** `createEdge(container)` with identifier `e`, sources and targets as given. */
function edge(container: ElkNode, sources: ElkNode[], targets: ElkNode[]): ElkEdge {
  const created = ElkGraphUtil.createEdge(container);
  created.setIdentifier('e');
  sources.forEach((s) => created.getSources().add(s));
  targets.forEach((t) => created.getTargets().add(t));
  return created;
}

function prop(id: string): IProperty<unknown> {
  return new Property<unknown>(id);
}

function puts(owner: ElkGraphElement, entries: readonly (readonly [IProperty<unknown> | null, unknown])[]): void {
  entries.forEach(([key, value]) => owner.getProperties().put(key, value));
}

/** The root with the given properties, `put(k, v)` in the order listed. */
function withProperties(entries: readonly (readonly [IProperty<unknown> | null, unknown])[]): Scenario {
  return () => {
    const r = graph();
    puts(r, entries);
    return r;
  };
}

function withLabels(texts: readonly string[]): Scenario {
  return () => {
    const r = graph();
    texts.forEach((t) => ElkGraphUtil.createLabelWithText(t, r));
    return r;
  };
}

function withId(id: string | null): Scenario {
  return () => {
    const r = ElkGraphUtil.createGraph();
    r.setIdentifier(id);
    return r;
  };
}

function withShape(set: (shape: ElkShape) => void): Scenario {
  return () => {
    const r = graph();
    set(r);
    return r;
  };
}

function shape(x: number, y: number, width: number, height: number): (s: ElkShape) => void {
  return (s) => {
    s.setX(x);
    s.setY(y);
    s.setWidth(width);
    s.setHeight(height);
  };
}

/** R > node n > port p, label l (id "l") on n, edge e (R, n -> n); `put` lands on one of them. */
function onElement(target: 'graph' | 'node' | 'port' | 'label' | 'edge'): Scenario {
  return () => {
    const r = graph();
    const n = node(r, 'n');
    port(n, 'p');
    const label = ElkGraphUtil.createLabelWithText('t', n);
    label.setIdentifier('l');
    const e = edge(r, [n], [n]);
    const owners: Record<string, ElkGraphElement> = {
      graph: r,
      node: n,
      port: n.getPorts().get(0),
      label,
      edge: e,
    };
    (owners[target] as ElkGraphElement).getProperties().put(CoreOptions.PRIORITY, 1);
    return r;
  };
}

function sections(withBends: boolean): Scenario {
  return () => {
    const r = graph();
    const e = edge(r, [node(r, 'a')], [node(r, 'b')]);
    const first = ElkGraphUtil.createEdgeSection(e);
    first.setIdentifier('s1');
    if (withBends) {
      first.setStartLocation(0, 0);
      first.setEndLocation(30, 40);
      ElkGraphUtil.createBendPoint(first, 10, 0);
      ElkGraphUtil.createBendPoint(first, 10, 40);
    } else {
      ElkGraphUtil.createEdgeSection(e).setStartLocation(1, 2);
    }
    return r;
  };
}

/** R > nodes a, b, c, d for the hyperedge scenarios. */
function four(): [ElkNode, ElkNode, ElkNode, ElkNode, ElkNode] {
  const r = graph();
  return [r, node(r, 'a'), node(r, 'b'), node(r, 'c'), node(r, 'd')];
}

/** `setProperty(SPACING_NODE_NODE, 3.0)`: the registered option, whose DOUBLE type makes the value print as `3.0`. */
const SPACING_3 = (): IndividualSpacings => {
  const spacings = new IndividualSpacings();
  const option = LayoutMetaDataService.getInstance().getOptionData(CoreOptions.SPACING_NODE_NODE.getId());
  spacings.setProperty(option as LayoutOptionData, 3);
  return spacings;
};

const CHAIN_12_34 = (): KVectorChain => new KVectorChain(new KVector(1, 2), new KVector(3, 4));

const SCENARIO_GROUP_A: Readonly<Record<string, Scenario>> = {
  'java-node-without-identifier': () => {
    const r = graph();
    ElkGraphUtil.createNode(r);
    return r;
  },
  'java-port-without-identifier': () => {
    const r = graph();
    ElkGraphUtil.createPort(node(r, 'n'));
    return r;
  },
  'java-label-without-text': () => {
    const r = graph();
    ElkGraphUtil.createLabel(node(r, 'n')).setIdentifier('l');
    return r;
  },
  'java-section-without-identifier': sections(false),
  'java-section-with-bend-points': sections(true),
  // EcoreUtil.copy keeps no reference to an object outside the copied tree (the reference has an opposite)
  'java-edge-endpoint-outside-graph': () => {
    const r = graph();
    const a = node(r, 'a');
    const z = ElkGraphUtil.createGraph();
    z.setIdentifier('z');
    edge(r, [a], [z]).getTargets().remove(z);
    return r;
  },
  'java-edge-without-endpoints': () => {
    const r = graph();
    ElkGraphUtil.createEdge(r).setIdentifier('e');
    return r;
  },
  'java-edge-without-identifier': () => {
    const r = graph();
    edge(r, [node(r, 'a')], [node(r, 'b')]).setIdentifier(null);
    return r;
  },
  'java-edge-hyperedge': () => {
    const [r, a, b, c, d] = four();
    edge(r, [a, b], [c, d]);
    return r;
  },
  'java-edge-port-endpoints': () => {
    const r = graph();
    const a = node(r, 'a');
    const b = node(r, 'b');
    edge(
      r,
      [port(a, 'p').getPorts().get(0) as unknown as ElkNode],
      [port(b, 'q').getPorts().get(0) as unknown as ElkNode],
    );
    return r;
  },
  'java-edge-contained-in-child': () => {
    const r = graph();
    const a = node(r, 'a');
    edge(a, [node(a, 'c')], [node(a, 'd')]);
    return r;
  },
  'java-edge-loop': () => {
    const r = graph();
    const a = node(r, 'a');
    edge(r, [a], [a]);
    return r;
  },
  'java-deep-nesting': () => {
    const r = graph();
    ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'].reduce((parent, id) => node(parent, id), r);
    return r;
  },
  'java-empty-lists': () => {
    const r = graph();
    node(r, 'n');
    return r;
  },
  'java-everything': () => {
    const r = graph();
    shape(1, 2, 3, 4)(r);
    puts(r, [
      [CoreOptions.PRIORITY, 1],
      [CoreOptions.DIRECTION, Direction.DOWN],
    ]);
    ElkGraphUtil.createLabelWithText('root', r);
    const a = node(r, 'a');
    ElkGraphUtil.createLabelWithText('al', a);
    const p = port(a, 'p').getPorts().get(0);
    ElkGraphUtil.createLabelWithText('pl', p);
    p.getProperties().put(CoreOptions.PRIORITY, 2);
    const b = node(r, 'b');
    const e = edge(r, [p as unknown as ElkNode], [b]);
    ElkGraphUtil.createLabelWithText('el', e);
    e.getProperties().put(CoreOptions.PRIORITY, 3);
    return r;
  },
  'java-id-duplicate-siblings': () => {
    const r = graph();
    node(r, 'n');
    node(r, 'n');
    return r;
  },
  'java-label-nested': () => {
    const r = graph();
    const t = ElkGraphUtil.createLabelWithText('t', r);
    ElkGraphUtil.createLabelWithText('v', ElkGraphUtil.createLabelWithText('u', t));
    return r;
  },
  'java-label-on-port': () => {
    const r = graph();
    const n = node(r, 'n');
    ElkGraphUtil.createLabelWithText('t', port(n, 'p').getPorts().get(0));
    return r;
  },
  'java-label-on-edge': () => {
    const r = graph();
    const n = node(r, 'n');
    ElkGraphUtil.createLabelWithText('t', edge(r, [n], [node(r, 'b')]));
    return r;
  },
};

const IDS: Readonly<Record<string, string | null>> = {
  'java-id-specials': 'a"b\\c\nd',
  'java-id-empty': '',
  'java-id-unicode': 'héllo 日本',
  'java-id-keyword-id': 'id',
  'java-id-keyword-true': 'true',
  'java-id-keyword-null': 'null',
  'java-id-keyword-children': 'children',
  'java-id-numeric': '5',
  'java-id-dotted': 'a.b.c',
  'java-id-spaces': 'a b',
  'java-id-none': null,
};

const LABELS: Readonly<Record<string, readonly string[]>> = {
  'java-label-text': ['t'],
  'java-label-many': ['a', 'b', 'c'],
  'java-label-specials': ['q"b\\n\nt\tué\u0001'],
  'java-label-empty': [''],
  'java-label-spaces': ['  a  b  '],
};

const SHAPES: Readonly<Record<string, (s: ElkShape) => void>> = {
  'java-shape-a': (s) => s.setX(5),
  'java-shape-b': (s) => s.setY(5),
  'java-shape-c': (s) => s.setWidth(5),
  'java-shape-d': (s) => s.setHeight(5),
  'java-shape-fractional': shape(1.5, 2.25, 3.75, 4.5),
  'java-shape-intvalued': (s) => {
    s.setX(3);
    s.setY(4);
  },
  'java-shape-big': (s) => {
    s.setX(1e10);
    s.setWidth(-1e10);
  },
  'java-shape-nan': (s) => s.setX(Number.NaN),
  'java-shape-inf': (s) => {
    s.setX(Number.POSITIVE_INFINITY);
    s.setY(Number.NEGATIVE_INFINITY);
  },
  'java-shape-exp': (s) => {
    s.setX(1e-5);
    s.setY(1.5e10);
  },
  'java-shape-negzero': (s) => s.setX(-0),
  'java-shape-all': shape(1, 2, 3, 4),
  'java-shape-zero': shape(0, 0, 0, 0),
  'java-shape-half-xzero': (s) => {
    s.setX(0);
    s.setY(5);
  },
  'java-shape-half-ywzero': (s) => {
    s.setWidth(0);
    s.setHeight(5);
  },
};

const P = prop('p.v');

const PROPERTIES: Readonly<Record<string, Scenario>> = {
  'java-property-null-key': withProperties([[null, 'v']]),
  'java-property-null-value': withProperties([[prop('my.custom'), null]]),
  'java-property-proxy-resolvable': withProperties([[CoreOptions.PRIORITY, new LayoutOptionProxy('5')]]),
  'java-property-key-keyword': withProperties([[prop('my.node.k'), 'v']]),
  'java-property-value-doublebig': withProperties([[P, 1e10]]),
  'java-property-value-doublenan': withProperties([[P, Number.NaN]]),
  'java-property-value-doubleinf': withProperties([[P, Number.POSITIVE_INFINITY]]),
  'java-property-value-stringnumspace': withProperties([[P, ' 5 ']]),
  'java-property-value-stringquote': withProperties([[P, 'a"b']]),
  'java-property-value-stringbackslash': withProperties([[P, 'a\\b']]),
  'java-property-value-stringnewline': withProperties([[P, 'a\nb']]),
  'java-property-value-kvectorchain': withProperties([[P, new KVectorChain(new KVector(1, 2), new KVector(3, 4.5))]]),
  'java-property-value-list': withProperties([[P, ['a', 'b']]]),
  'java-property-value-proxy': withProperties([[P, new LayoutOptionProxy('5')]]),
  'java-property-value-proxynull': withProperties([[P, new LayoutOptionProxy(null)]]),
  'java-property-values-numbers': withProperties([
    [prop('p.int'), 5],
    [prop('p.long'), 7n],
    [prop('p.float'), 1.5],
    [prop('p.double3'), 3],
    [prop('p.double'), 1.5],
    [prop('p.doubleneg'), -2],
    [prop('p.doublesmall'), 1e-5],
  ]),
  'java-property-values-strings': withProperties([
    [prop('p.string'), 'abc'],
    [prop('p.stringtrue'), 'true'],
    [prop('p.stringnull'), 'null'],
    [prop('p.stringnum'), '5'],
    [prop('p.stringnumexp'), '1e3'],
    [prop('p.stringempty'), ''],
    [prop('p.stringunicode'), 'héllo 日本'],
  ]),
  'java-property-values-misc': withProperties([
    [prop('p.boolean'), true],
    [prop('p.enum'), Direction.DOWN],
    [prop('p.kvector'), new KVector(1.5, 2)],
    [prop('p.padding'), new ElkPadding(1, 2.5, 3, 4)],
    [prop('p.margin'), new ElkMargin(1, 2.5, 3, 4)],
    [prop('p.enumset'), EnumSet.of(SizeConstraint.PORTS, SizeConstraint.NODE_LABELS)],
    [prop('p.enumsetempty'), EnumSet.noneOf(SizeConstraint)],
    [prop('p.individual'), SPACING_3()],
  ]),
  'java-property-known-main': withProperties([
    [CoreOptions.DIRECTION, Direction.DOWN],
    [CoreOptions.PRIORITY, 5],
    [CoreOptions.PADDING, new ElkPadding(1, 2, 3, 4)],
    [CoreOptions.POSITION, new KVector(1.5, 2)],
    [CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.PORTS, SizeConstraint.NODE_LABELS)],
    [CoreOptions.SPACING_NODE_NODE, 20],
    [CoreOptions.COMMENT_BOX, true],
  ]),
  'java-property-known-spacingnodenodefrac': withProperties([[CoreOptions.SPACING_NODE_NODE, 20.5]]),
  'java-property-known-algorithm': withProperties([[CoreOptions.ALGORITHM, 'layered']]),
  'java-property-known-junction': withProperties([[CoreOptions.JUNCTION_POINTS, CHAIN_12_34()]]),
  'java-property-known-individual': withProperties([[CoreOptions.SPACING_INDIVIDUAL, SPACING_3()]]),
  'java-property-known-nulldouble': withProperties([[CoreOptions.SPACING_NODE_NODE, null]]),
  'java-property-order': withProperties([
    [prop('z.last'), 'z'],
    [CoreOptions.PRIORITY, 1],
    [prop('a.first'), true],
    [CoreOptions.DIRECTION, Direction.UP],
    [prop('m.mid'), 2.5],
  ]),
};

function derived(): Record<string, Scenario> {
  const result: Record<string, Scenario> = {};
  for (const [id, value] of Object.entries(IDS)) result[id] = withId(value);
  for (const [id, texts] of Object.entries(LABELS)) result[id] = withLabels(texts);
  for (const [id, set] of Object.entries(SHAPES)) result[id] = withShape(set);
  for (const target of ['graph', 'node', 'port', 'label', 'edge'] as const) {
    result[`java-property-on-${target}`] = onElement(target);
  }
  result['java-shape-everywhere'] = () => {
    const r = graph();
    const n = node(r, 'n');
    const c = node(n, 'c');
    const p = port(n, 'p').getPorts().get(0);
    const l = ElkGraphUtil.createLabelWithText('t', n);
    l.setIdentifier('l');
    [r, c, p, l].forEach((s) => shape(1, 2, 3, 4)(s));
    return r;
  };
  return result;
}

/** The T5 JAVA SCENARIOS, rebuilt through the public API (ElkjWriteVectors.java header). */
export const ELKJ_JAVA_SCENARIOS: Readonly<Record<string, Scenario>> = {
  ...SCENARIO_GROUP_A,
  ...PROPERTIES,
  ...derived(),
};

function scenario(file: string): string {
  return readFileSync(new URL(file, SCENARIOS), 'utf8');
}

/** Builds the input graph of a writer vector row. */
export function buildElkjWriteInput(source: ElkjWriteSource, id: string): ElkNode {
  switch (source) {
    case 'java':
      return (ELKJ_JAVA_SCENARIOS[id] as Scenario)();
    case 'json':
      return ElkGraphJson.forGraph(scenario(`${id}.json`)).toElk();
    case 'elkj':
      return ElkGraphJsonText.load(scenario(`${id}.elkj`)).root as ElkNode;
    case 'elkt':
      return ElkGraphText.load(scenario(`${id}.elkt`)).root as ElkNode;
  }
}
