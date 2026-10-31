// SPDX-License-Identifier: EPL-2.0
import type { LEdge } from '../../graph/LEdge.js';
import type { LNode } from '../../graph/LNode.js';

/**
 * The six Java parameters of `initAtEdgeLevel` as one rest tuple (the five-parameter limit): `l` layer index, `n` node
 * index, `p` port index, `e` edge index, `edge` edge, `nodeOrder` current node order for each layer. Callers and
 * implementers keep the positional Java call shape; an implementer destructures the tuple.
 */
export type InitAtEdgeLevelArgs = readonly [
  l: number,
  n: number,
  p: number,
  e: number,
  edge: LEdge,
  nodeOrder: LNode[][],
];

/**
 * Implement this interface to declare that data needs to be initialized before running the
 * `LayerSweepCrossingMinimizer`. We iterate through layers, nodes, ports and edges in the input order.
 *
 * The Java default methods are optional members: a missing hook is the Java no-op default.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p3order/counting/IInitializable.java
 */
export interface IInitializable {
  /**
   * Initialize anything needed at layer level.
   *
   * @param l layer index.
   * @param nodeOrder current node order for each layer.
   * @see IInitializable.java:73
   */
  initAtLayerLevel?(l: number, nodeOrder: LNode[][]): void;

  /**
   * Initialize anything needed at node level.
   *
   * @see IInitializable.java:86
   */
  initAtNodeLevel?(l: number, n: number, nodeOrder: LNode[][]): void;

  /**
   * Initialize anything needed at port level.
   *
   * @see IInitializable.java:101
   */
  initAtPortLevel?(l: number, n: number, p: number, nodeOrder: LNode[][]): void;

  /**
   * Initialize anything needed at edge level.
   *
   * @see IInitializable.java:120
   */
  initAtEdgeLevel?(l: number, n: number, p: number, e: number, edge: LEdge, nodeOrder: LNode[][]): void;

  /**
   * Finish initialization.
   *
   * @see IInitializable.java:127
   */
  initAfterTraversal?(): void;
}

/**
 * Traverse graph and on each level call the respective methods for a list of initializable objects.
 *
 * Java `IInitializable.init` (a static interface method).
 *
 * @param initializables The objects to be initialized
 * @see IInitializable.java:36
 */
export function init(initializables: IInitializable[], order: LNode[][]): void {
  for (let l = 0; l < order.length; l++) {
    for (const i of initializables) {
      i.initAtLayerLevel?.(l, order);
    }
    for (let n = 0; n < order[l]!.length; n++) {
      for (const i of initializables) {
        i.initAtNodeLevel?.(l, n, order);
      }
      const ports = order[l]![n]!.getPorts();
      for (let p = 0; p < ports.length; p++) {
        for (const i of initializables) {
          i.initAtPortLevel?.(l, n, p, order);
        }
        const port = ports[p]!;
        let e = 0;
        for (const edge of port.getConnectedEdges()) {
          for (const i of initializables) {
            i.initAtEdgeLevel?.(l, n, p, e++, edge, order);
          }
        }
      }
    }
  }
  for (const i of initializables) {
    i.initAfterTraversal?.();
  }
}
