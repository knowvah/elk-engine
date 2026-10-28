// SPDX-License-Identifier: EPL-2.0
import { InternalProperties } from '../options/InternalProperties.js';
import type { LEdge } from './LEdge.js';
import type { LGraph } from './LGraph.js';
import type { LNode } from './LNode.js';

/** One suspended activation of the Java recursive method `stronglyConnected(v)` (AC6: explicit work stack). */
interface TarjanFrame {
  readonly v: LNode;
  /** The lazily advanced iteration over `v.getConnectedEdges()` (Java's enhanced `for` loop). */
  readonly edges: Iterator<LEdge>;
}

/**
 * Tarjan implementation to be used during layered layout.
 *
 * AC6: the Java recursion in `stronglyConnected` grows with the longest path of the graph, so it is replaced by an
 * explicit work stack that reproduces the visit and side-effect order of the recursion.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/Tarjan.java
 */
export class Tarjan {
  private readonly edgesToBeReversed: LEdge[];
  private index = 0;
  protected stronglyConnectedComponents: Set<LNode>[]; // FIXME Why no ordered set here? this is bad
  private stack: LNode[] = [];
  /** Java `HashMap<LNode, Integer>` keyed by identity-hashed nodes: AD-10, a `Map` in insertion order. */
  private readonly nodeToSCCID: Map<LNode, number>;

  constructor(edgesToBeReversed: LEdge[], stronglyConnectedComponents: Set<LNode>[], nodeToSCCID: Map<LNode, number>) {
    this.edgesToBeReversed = edgesToBeReversed;
    this.stronglyConnectedComponents = stronglyConnectedComponents;
    this.nodeToSCCID = nodeToSCCID;
  }

  tarjan(graph: LGraph): void {
    this.index = 0;
    this.stack = [];
    for (const node of graph.getLayerlessNodes()) {
      if (node.getProperty(InternalProperties.TARJAN_ID) === -1) {
        this.stronglyConnected(node);
        this.stack.length = 0;
      }
    }
  }

  stronglyConnected(v: LNode): void {
    const frames: TarjanFrame[] = [this.enter(v)];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1]!;
      const next = frame.edges.next();
      if (next.done === true) {
        this.leave(frame.v);
        frames.pop();
        const parent = frames[frames.length - 1];
        if (parent !== undefined) {
          // the code following the Java recursive call: lowlink = min(lowlink, target.lowlink)
          Tarjan.lowerLowlink(parent.v, frame.v.getProperty(InternalProperties.TARJAN_LOWLINK));
        }
        continue;
      }
      const target = this.visitEdge(frame.v, next.value);
      if (target !== null) {
        frames.push(this.enter(target));
      }
    }
  }

  /** The start of the Java method `stronglyConnected(v)`, up to the edge loop. */
  private enter(v: LNode): TarjanFrame {
    v.setProperty(InternalProperties.TARJAN_ID, this.index);
    v.setProperty(InternalProperties.TARJAN_LOWLINK, this.index);
    this.index++;
    this.stack.push(v);
    v.setProperty(InternalProperties.TARJAN_ON_STACK, true);
    return { v, edges: v.getConnectedEdges()[Symbol.iterator]() };
  }

  /**
   * One iteration of the Java edge loop. Returns the target to recurse into, or `null` if the iteration finished
   * without recursion.
   */
  private visitEdge(v: LNode, edge: LEdge): LNode | null {
    if (edge.getSource()!.getNode() !== v && !this.edgesToBeReversed.includes(edge)) {
      return null;
    }
    if (edge.getSource()!.getNode() === v && this.edgesToBeReversed.includes(edge)) {
      return null;
    }
    let target: LNode;
    if (edge.getTarget()!.getNode() === v) {
      target = edge.getSource()!.getNode()!;
    } else {
      target = edge.getTarget()!.getNode()!;
    }
    if (target.getProperty(InternalProperties.TARJAN_ID) === -1) {
      return target;
    } else if (target.getProperty(InternalProperties.TARJAN_ON_STACK)) {
      Tarjan.lowerLowlink(v, target.getProperty(InternalProperties.TARJAN_ID));
    }
    return null;
  }

  private static lowerLowlink(v: LNode, candidate: number): void {
    v.setProperty(
      InternalProperties.TARJAN_LOWLINK,
      Math.min(v.getProperty(InternalProperties.TARJAN_LOWLINK), candidate),
    );
  }

  /** The Java code after the edge loop: pop the component if `v` is its root. */
  private leave(v: LNode): void {
    if (v.getProperty(InternalProperties.TARJAN_LOWLINK) === v.getProperty(InternalProperties.TARJAN_ID)) {
      const sCC = new Set<LNode>(); // Java HashSet of identity-hashed nodes: AD-10, insertion order
      let n: LNode;
      do {
        n = this.stack.pop()!;
        n.setProperty(InternalProperties.TARJAN_ON_STACK, false);
        sCC.add(n);
      } while (v !== n);
      if (sCC.size > 1) {
        const index = this.stronglyConnectedComponents.length;
        this.stronglyConnectedComponents.push(sCC);
        for (const node of sCC) {
          this.nodeToSCCID.set(node, index);
        }
      }
    }
  }

  resetTarjan(graph: LGraph): void {
    for (const n of graph.getLayerlessNodes()) {
      n.setProperty(InternalProperties.TARJAN_ON_STACK, false);
      n.setProperty(InternalProperties.TARJAN_LOWLINK, -1);
      n.setProperty(InternalProperties.TARJAN_ID, -1);
      this.stack.length = 0;
      for (const e of n.getConnectedEdges()) {
        e.setProperty(InternalProperties.IS_PART_OF_CYCLE, false);
      }
    }
  }
}
