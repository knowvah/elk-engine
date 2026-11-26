// SPDX-License-Identifier: EPL-2.0
// The ElkGraph dumps of tools/vectors/DotImportVectors.java (helper DotImportVectorsDumps.java): GRAPH = { graph: G,
// edges: [EDGE] } for every target graph of DotImporter, with the recorder's property text (String.valueOf of the
// Java value; an EObject value as "<EClass name>@<path in its GraphvizModel>" or "<EClass name>@detached").
import type { DotEObject } from '../../src/alg/graphviz/dot/dot/DotPackage.js';
import * as DoubleToString from '../../src/java/lang/DoubleToString.js';
import * as JavaFloat from '../../src/java/lang/JavaFloat.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkEdgeSection } from '../../src/graph/ElkEdgeSection.js';
import type { ElkLabel } from '../../src/graph/ElkLabel.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkShape } from '../../src/graph/ElkShape.js';
import type { IPropertyHolder } from '../../src/graph/properties/IPropertyHolder.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';

/**
 * The Java box type of every numeric property value DotImporter sets, by property id: TS numbers carry no box type,
 * and `String.valueOf` prints a `Float` through `Float.toString`, a `Double` through `Double.toString` and an
 * `Integer` plainly (DotImporter.java:76-78, 250-254, 260, 299, 302).
 */
const NUMBER_TEXT: Readonly<Record<string, (v: number) => string>> = {
  'dotTransformer.defWidth': JavaFloat.toString,
  'dotTransformer.defHeight': JavaFloat.toString,
  'org.eclipse.elk.spacing.nodeNode': DoubleToString.toString,
  'org.eclipse.elk.priority': String,
  'org.eclipse.elk.randomSeed': String,
};

const GRAPHVIZ_MODEL = 'GraphvizModel';

function isDotEObject(value: unknown): value is DotEObject {
  return typeof value === 'object' && value !== null && typeof (value as Partial<DotEObject>).eGet === 'function';
}

/** `feature[index]` (or `feature` for a single-valued one) of `o` inside its container. */
function segment(container: DotEObject, o: DotEObject): string {
  for (const feature of container.eClass().getEAllStructuralFeatures()) {
    if (!feature.isContainment) continue;
    const value = container.eGet(feature.featureID, true, true);
    if (value === o) return feature.name;
    if (typeof value === 'object' && value !== null && Symbol.iterator in value) {
      const index = [...(value as Iterable<unknown>)].indexOf(o);
      if (index >= 0) return `${feature.name}[${index}]`;
    }
  }
  throw new Error(`no containment feature holds ${o.eClass().getName()}`);
}

/** `Canon.modelPath`: the segments from the GraphvizModel down to `o`, or `detached`. */
function modelPath(o: DotEObject): string {
  const segments: string[] = [];
  let e = o;
  for (let c = e.eContainer() as DotEObject | null; c !== null; c = e.eContainer() as DotEObject | null) {
    segments.unshift(segment(c, e));
    e = c;
  }
  return e.eClass().getName() === GRAPHVIZ_MODEL ? segments.join('/') : 'detached';
}

/** `Canon.text`: the recorded text of one property value. */
export function propertyText(id: string, value: unknown): string {
  if (isDotEObject(value)) return `${value.eClass().getName()}@${modelPath(value)}`;
  if (typeof value === 'number') {
    const text = NUMBER_TEXT[id];
    if (text === undefined) throw new Error(`no Java box type known for numeric property ${id}`);
    return text(value);
  }
  return String(value);
}

/** `Canon.props`: the properties sorted by id. */
export function props(holder: IPropertyHolder): unknown[] {
  return [...holder.getAllProperties()]
    .map(([key, value]) => ({ id: key.getId(), text: propertyText(key.getId(), value) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

const d = DoubleToString.toString;

function shape(s: ElkShape & { getIdentifier(): string | null }): Record<string, unknown> {
  return {
    identifier: s.getIdentifier(),
    x: d(s.getX()),
    y: d(s.getY()),
    width: d(s.getWidth()),
    height: d(s.getHeight()),
  };
}

function labels(list: Iterable<ElkLabel>): unknown[] {
  return [...list].map((l) => ({
    text: l.getText(),
    x: d(l.getX()),
    y: d(l.getY()),
    width: d(l.getWidth()),
    height: d(l.getHeight()),
    properties: props(l),
    labels: labels(l.getLabels()),
  }));
}

/** `Canon.node`: G of one node. */
export function canonNode(n: ElkNode): unknown {
  return {
    ...shape(n),
    properties: props(n),
    labels: labels(n.getLabels()),
    ports: [...n.getPorts()].map((p) => ({ ...shape(p), properties: props(p), labels: labels(p.getLabels()) })),
    children: [...n.getChildren()].map(canonNode),
    edges: [...n.getContainedEdges()].map((e) => e.getIdentifier()),
  };
}

function section(s: ElkEdgeSection): unknown {
  return {
    identifier: s.getIdentifier(),
    startX: d(s.getStartX()),
    startY: d(s.getStartY()),
    endX: d(s.getEndX()),
    endY: d(s.getEndY()),
    bendPoints: [...s.getBendPoints()].map((b) => ({ x: d(b.getX()), y: d(b.getY()) })),
    properties: props(s),
  };
}

/** `Tree`: the nodes of a target graph in pre-order with their paths, and its edges in EDGE order. */
export class Tree {
  readonly nodes: ElkNode[] = [];
  readonly edges: ElkEdge[] = [];
  readonly #paths = new Map<object, string>();

  constructor(root: ElkNode) {
    this.#node(root, '');
    const seen = new Set<ElkEdge>();
    for (const n of this.nodes) {
      for (const e of ElkGraphUtil.allOutgoingEdges(n)) {
        if (seen.has(e)) continue;
        seen.add(e);
        this.edges.push(e);
        this.#paths.set(e, `edges[${this.edges.length - 1}]`);
      }
    }
  }

  static #child(parent: string, feature: string, index: number): string {
    return `${parent === '' ? '' : `${parent}/`}${feature}[${index}]`;
  }

  #node(n: ElkNode, path: string): void {
    this.nodes.push(n);
    this.#paths.set(n, path);
    [...n.getPorts()].forEach((p, i) => this.#paths.set(p, Tree.#child(path, 'ports', i)));
    [...n.getChildren()].forEach((c, i) => this.#node(c, Tree.#child(path, 'children', i)));
  }

  pathOf(o: object): string {
    return this.#paths.get(o) ?? '<outside the graph>';
  }

  edgeDumps(): unknown[] {
    return this.edges.map((e) => {
      const container = e.getContainingNode();
      return {
        path: this.pathOf(e),
        sources: [...e.getSources()].map((s) => this.pathOf(s)),
        targets: [...e.getTargets()].map((t) => this.pathOf(t)),
        containingNode: container === null ? null : this.pathOf(container),
        properties: props(e),
        labels: labels(e.getLabels()),
        sections: [...e.getSections()].map(section),
      };
    });
  }
}

/** `Recorder.graphs`: GRAPH of every target graph. */
export function graphsDump(roots: readonly ElkNode[]): unknown[] {
  return roots.map((root) => ({ graph: canonNode(root), edges: new Tree(root).edgeDumps() }));
}
