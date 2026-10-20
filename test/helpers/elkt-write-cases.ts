// SPDX-License-Identifier: EPL-2.0
// Inputs of the T5 writer vectors (test/golden/refs/java/graph-text-write.json), shared by the serializer,
// formatter and ElkGraphText tests: `.elkt` scenarios via ElkGraphText.load, `.json` via ElkGraphJson, and the
// `java-*` graphs rebuilt from the ElktWriteVectors.java header.
import { readFileSync } from 'node:fs';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { LayoutOptionProxy } from '../../src/core/util/internal/LayoutOptionProxy.js';
import type { BasicEList } from '../../src/emf/common/util/BasicEList.js';
import type { EList } from '../../src/emf/common/util/EList.js';
import '../../src/graph/impl/ElkGraphFactoryImpl.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { Property } from '../../src/graph/properties/Property.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { ElkGraphSerializationError } from '../../src/graph/text/serializer/ElkGraphSerializationError.js';
import { IndexOutOfBoundsException } from '../../src/java/lang/IndexOutOfBoundsException.js';

const SCENARIOS = new URL('../../tools/vectors/elkt-write-scenarios/', import.meta.url);

/** The recorded input kinds of a writer vector row. */
export type WriteSource = 'elkt' | 'json' | 'java';

function scenario(file: string): string {
  return readFileSync(new URL(file, SCENARIOS), 'utf8');
}

/** The T5 JAVA SCENARIOS, rebuilt through the public API (ElktWriteVectors.java header). */
export const JAVA_SCENARIOS: Readonly<Record<string, () => ElkNode>> = {
  'java-node-without-identifier': () => {
    const r = graph();
    ElkGraphUtil.createNode(r);
    return r;
  },
  'java-port-without-identifier': () => {
    const n = node(graph(), 'n');
    ElkGraphUtil.createPort(n);
    return n.getParent() as ElkNode;
  },
  'java-label-without-text': () => {
    const n = node(graph(), 'n');
    ElkGraphUtil.createLabel(n).setIdentifier('l');
    return n.getParent() as ElkNode;
  },
  'java-section-without-identifier': () => {
    const r = graph();
    const edge = connect(r, node(r, 'a'), node(r, 'b'));
    ElkGraphUtil.createEdgeSection(edge).setIdentifier('s1');
    ElkGraphUtil.createEdgeSection(edge).setStartLocation(1, 2);
    return r;
  },
  'java-edge-endpoint-outside-graph': () => {
    const r = graph();
    const z = ElkGraphUtil.createGraph();
    z.setIdentifier('z');
    connect(r, node(r, 'a'), z);
    return r;
  },
  'java-edge-without-endpoints': () => {
    const r = graph();
    ElkGraphUtil.createEdge(r).setIdentifier('e');
    return r;
  },
  'java-property-null-key': () => withProperty(null, 'v'),
  'java-property-null-value': () => withProperty(new Property<unknown>('my.custom'), null),
  'java-property-proxy-resolvable': () => withProperty(CoreOptions.PRIORITY, new LayoutOptionProxy('5')),
  'java-property-key-keyword': () => withProperty(new Property<unknown>('my.node.k'), 'v'),
  'java-edge-repeated-source': () => repeatedEndpoint(true),
  'java-edge-repeated-target': () => repeatedEndpoint(false),
  'java-section-repeated-outgoing': () => {
    const r = graph();
    const edge = connect(r, node(r, 'a'), node(r, 'b'));
    const s1 = ElkGraphUtil.createEdgeSection(edge);
    s1.setIdentifier('s1');
    const s2 = ElkGraphUtil.createEdgeSection(edge);
    s2.setIdentifier('s2');
    addTwice(s1.getOutgoingSections(), s2);
    return r;
  },
};

/**
 * `((InternalEList) list).addUnique(element)` twice: the repeated reference a lazily linked `.elkj` load can produce
 * (F3); the `.elkt` linker rejects one.
 */
function addTwice<T>(list: EList<T>, element: T): void {
  (list as BasicEList<T>).addUnique(element);
  (list as BasicEList<T>).addUnique(element);
}

function repeatedEndpoint(source: boolean): ElkNode {
  const r = graph();
  const a = node(r, 'a');
  const b = node(r, 'b');
  const edge = ElkGraphUtil.createEdge(r);
  edge.setIdentifier('e');
  if (source) {
    addTwice(edge.getSources(), a);
    edge.getTargets().add(b);
  } else {
    edge.getSources().add(a);
    addTwice(edge.getTargets(), b);
  }
  return r;
}

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

function connect(container: ElkNode, source: ElkNode, target: ElkNode): ElkEdge {
  const edge = ElkGraphUtil.createEdge(container);
  edge.setIdentifier('e');
  edge.getSources().add(source);
  edge.getTargets().add(target);
  return edge;
}

function withProperty(key: IProperty<unknown> | null, value: unknown): ElkNode {
  const root = graph();
  node(root, 'n').getProperties().put(key, value);
  return root;
}

/** Builds the input graph of a writer vector row. */
export function buildWriteInput(source: WriteSource, id: string): ElkNode {
  if (source === 'java') return (JAVA_SCENARIOS[id] as () => ElkNode)();
  if (source === 'json') return ElkGraphJson.forGraph(scenario(`${id}.json`)).toElk();
  return ElkGraphText.load(scenario(`${id}.elkt`)).root as ElkNode;
}

/**
 * The TS class of a recorded writer error by its JVM `cls`: Xtext's serializer reports a `RuntimeException`
 * (`ElkGraphSerializationError`), `EcoreUtil.copy` an `IndexOutOfBoundsException` for a repeated reference (F3).
 */
const RECORDED_ERROR_CLASSES: ReadonlyMap<string, abstract new (...args: never[]) => Error> = new Map<
  string,
  abstract new (...args: never[]) => Error
>([
  ['java.lang.RuntimeException', ElkGraphSerializationError],
  ['java.lang.IndexOutOfBoundsException', IndexOutOfBoundsException],
]);

/** The TS class a writer row recorded as `cls` must throw; an unmapped class fails the test. */
export function recordedErrorClass(cls: string): abstract new (...args: never[]) => Error {
  const mapped = RECORDED_ERROR_CLASSES.get(cls);
  if (mapped === undefined) throw new Error(`no TS class for the recorded writer error ${cls}`);
  return mapped;
}
