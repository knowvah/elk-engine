// SPDX-License-Identifier: EPL-2.0
// Step arguments and the positional paths of the layered site replay (tools/vectors/LayeredSiteVectors.java: Args,
// Dump.register/registerEdges).
import type { Direction } from '../../src/core/options/Direction.js';
import { Direction as DirectionEnum } from '../../src/core/options/Direction.js';
import { PortConstraints } from '../../src/core/options/PortConstraints.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import { KVector } from '../../src/core/math/KVector.js';
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { PortType } from '../../src/alg/layered/options/PortType.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { ReplayBug, property, unhex, vector, type Ctx } from './layered-site-replay-context.js';

type Constructor<T> = abstract new (...args: never[]) => T;

/** One step's receiver name and arguments, with the typed accessors of the Java `Args`. */
export class Args {
  constructor(
    readonly c: Ctx,
    readonly on: string | null,
    readonly v: readonly unknown[],
    readonly label: string | null = null,
  ) {}

  raw(i: number): unknown {
    if (i >= this.v.length) {
      throw new ReplayBug(`missing argument ${String(i)}`);
    }
    return this.v[i];
  }

  isNull(i: number): boolean {
    return i >= this.v.length || this.v[i] === null;
  }

  s(i: number): string {
    return this.raw(i) as string;
  }

  i(i: number): number {
    return this.raw(i) as number;
  }

  b(i: number): boolean {
    return this.raw(i) as boolean;
  }

  d(i: number): number {
    return unhex(this.s(i));
  }

  vec(i: number): KVector | null {
    return this.isNull(i) ? null : vector(this.raw(i));
  }

  list(i: number): readonly unknown[] {
    return this.raw(i) as readonly unknown[];
  }

  /** The named object of argument i, checked to be a `k`; null when the argument is null. */
  ref<T>(i: number, k: Constructor<T>): T | null {
    return this.isNull(i) ? null : this.cast(k, this.c.get(this.s(i)), `argument ${String(i)}`);
  }

  cast<T>(k: Constructor<T>, o: unknown, what: string): T {
    if (!(o instanceof k)) {
      throw new ReplayBug(`${what} is not a ${k.name}`);
    }
    return o;
  }

  g(i: number): LGraph {
    return this.ref(i, LGraph) as LGraph;
  }

  n(i: number): LNode {
    return this.ref(i, LNode) as LNode;
  }

  p(i: number): LPort {
    return this.ref(i, LPort) as LPort;
  }

  e(i: number): LEdge {
    return this.ref(i, LEdge) as LEdge;
  }

  l(i: number): LLabel {
    return this.ref(i, LLabel) as LLabel;
  }

  y(i: number): Layer {
    return this.ref(i, Layer) as Layer;
  }

  /** The nullable forms: the Java passes `null` through. */
  gOrNull(i: number): LGraph | null {
    return this.ref(i, LGraph);
  }

  nOrNull(i: number): LNode | null {
    return this.ref(i, LNode);
  }

  pOrNull(i: number): LPort | null {
    return this.ref(i, LPort);
  }

  yOrNull(i: number): Layer | null {
    return this.ref(i, Layer);
  }

  nodes(i: number): LNode[] {
    return this.list(i).map((x) => this.cast(LNode, this.c.get(x as string), 'node list item'));
  }

  edges(i: number): LEdge[] {
    return this.list(i).map((x) => this.cast(LEdge, this.c.get(x as string), 'edge list item'));
  }

  side(i: number): PortSide | null {
    return this.isNull(i) ? null : PortSide.valueOf(this.s(i));
  }

  type(i: number): PortType | null {
    return this.isNull(i) ? null : PortType.valueOf(this.s(i));
  }

  direction(i: number): Direction {
    return DirectionEnum.valueOf(this.s(i));
  }

  constraints(i: number): PortConstraints {
    return PortConstraints.valueOf(this.s(i));
  }

  nodeType(i: number): NodeType {
    return NodeType.valueOf(this.s(i));
  }

  prop(i: number): IProperty<unknown> {
    return property(this.s(i));
  }

  /** The receiver as a named object. */
  onObject(): unknown {
    if (this.on === null) {
      throw new ReplayBug('step has no receiver');
    }
    return this.c.get(this.on);
  }

  onAs<T>(k: Constructor<T>): T {
    return this.cast(k, this.onObject(), `receiver ${String(this.on)}`);
  }

  onG(): LGraph {
    return this.onAs(LGraph);
  }

  onN(): LNode {
    return this.onAs(LNode);
  }

  onP(): LPort {
    return this.onAs(LPort);
  }

  onE(): LEdge {
    return this.onAs(LEdge);
  }

  onL(): LLabel {
    return this.onAs(LLabel);
  }

  onY(): Layer {
    return this.onAs(Layer);
  }
}

/** One op of the dispatch table: the TS twin of a Java `Op` lambda (a void op returns `null`). */
export type Op = (a: Args) => unknown;

// ---------------------------------------------------------------------------------------------------------------
// Positional paths (Dump.register / registerEdges): "g<k>", "g0/n3", "g0/n3/p1", "g0/e2", labels "<owner>/l<i>"

class PathAssigner {
  readonly paths = new Map<object, string>();
  private readonly graphs: LGraph[] = [];
  private readonly nodeLists = new Map<LGraph, LNode[]>();

  constructor(root: LGraph) {
    this.register(root);
    for (const g of [...this.graphs]) {
      this.registerEdges(g);
    }
  }

  private labelPaths(labels: readonly LLabel[], owner: string): void {
    labels.forEach((label, i) => this.paths.set(label, `${owner}/l${String(i)}`));
  }

  private register(g: LGraph): void {
    const gp = `g${String(this.graphs.length)}`;
    this.graphs.push(g);
    this.paths.set(g, gp);
    const nodes = [...g.getLayerlessNodes()];
    const seen = new Set<LNode>(nodes);
    for (const layer of g.getLayers()) {
      this.paths.set(layer, `${gp}/layer${String(layer.getIndex())}`);
      for (const n of layer.getNodes()) {
        if (!seen.has(n)) {
          seen.add(n);
          nodes.push(n);
        }
      }
    }
    this.nodeLists.set(g, nodes);
    nodes.forEach((n, i) => this.registerNode(n, `${gp}/n${String(i)}`));
  }

  private registerNode(n: LNode, np: string): void {
    this.paths.set(n, np);
    this.labelPaths(n.getLabels(), np);
    n.getPorts().forEach((p, j) => {
      this.paths.set(p, `${np}/p${String(j)}`);
      this.labelPaths(p.getLabels(), `${np}/p${String(j)}`);
    });
    const nested = n.getNestedGraph();
    if (nested !== null) {
      this.register(nested);
    }
  }

  private registerEdges(g: LGraph): void {
    const gp = this.paths.get(g) as string;
    let count = 0;
    for (const n of this.nodeLists.get(g) as LNode[]) {
      for (const p of n.getPorts()) {
        for (const e of [...p.getOutgoingEdges(), ...p.getIncomingEdges()]) {
          if (!this.paths.has(e)) {
            const ep = `${gp}/e${String(count++)}`;
            this.paths.set(e, ep);
            this.labelPaths(e.getLabels(), ep);
          }
        }
      }
    }
  }
}

/** The positional name of every element of an LGraph (and its nested graphs, pre-order), as the recorder's Dump. */
export function assignPaths(root: LGraph): ReadonlyMap<object, string> {
  return new PathAssigner(root).paths;
}
