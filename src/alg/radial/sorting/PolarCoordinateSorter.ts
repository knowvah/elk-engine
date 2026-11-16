// SPDX-License-Identifier: EPL-2.0
import type { ElkNode } from '../../../graph/ElkNode.js';
import { RadialOptions } from '../options/RadialOptions.js';
import { RadialUtil } from '../RadialUtil.js';
import { IDSorter } from './IDSorter.js';
import type { IRadialSorter } from './IRadialSorter.js';

/**
 * The polar coordinate sorter takes a list of nodes and sort them according to their polar coordinates relative to
 * their parents. Sublists of nodes with the same parent (which are not comparable by coordinates) stay in the same
 * order as in the original list.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/sorting/PolarCoordinateSorter.java
 */
export class PolarCoordinateSorter implements IRadialSorter {
  private static readonly DEGREE_45 = 0.25 * Math.PI;
  private static readonly DEGREE_90 = 0.5 * Math.PI;
  private static readonly DEGREE_135 = 0.75 * Math.PI;
  private static readonly DEGREE_225 = 1.25 * Math.PI;
  private static readonly DEGREE_270 = 1.5 * Math.PI;
  private static readonly DEGREE_315 = 1.75 * Math.PI;

  private readonly compRight = RadialUtil.createPolarComparator(0, 0);
  private readonly compLeft = RadialUtil.createPolarComparator(Math.PI, 0);
  private readonly compTop = RadialUtil.createPolarComparator(PolarCoordinateSorter.DEGREE_270, 0);
  private readonly compBottom = RadialUtil.createPolarComparator(PolarCoordinateSorter.DEGREE_90, 0);
  private idSorter: IDSorter | null = null;

  /**
   * Initialize the sorter by sorting them with the polar coordinater and then assigning
   * {@link RadialOptions.ORDER_ID}.
   *
   * @param root The root node.
   */
  initialize(root: ElkNode): void {
    this.idSorter = new IDSorter();
    const successors = RadialUtil.getSuccessors(root);
    // sort the first layer, the sorting starts at degree 0 the first polar coordinate position, which is on the
    // right of the circle.
    successors.sort(this.compRight);
    this.setIDForNodes(successors, 0);
  }

  /**
   * Iterates over the whole graph and assign an order id to each node, depending on its position in the list sorted
   * by polar coordinates.
   *
   * @param nodes
   * @param idOffset
   */
  private setIDForNodes(nodes: ElkNode[], idOffset: number): number {
    let id = idOffset;
    let nextLayerId = 0;
    for (const node of nodes) {
      node.setProperty(RadialOptions.ORDER_ID, id++);
      const nodeSuccessors = RadialUtil.getSuccessors(node);
      let arc = Math.atan2(node.getY() + node.getHeight() / 2, node.getX() + node.getWidth() / 2);
      arc += arc < 0 ? 2 * Math.PI : 0;

      // node is right of parent node
      if (arc < PolarCoordinateSorter.DEGREE_45 || arc > PolarCoordinateSorter.DEGREE_315) {
        nodeSuccessors.sort(this.compLeft);
      } else if (arc <= PolarCoordinateSorter.DEGREE_315 && arc > PolarCoordinateSorter.DEGREE_225) {
        // node is below parent node
        nodeSuccessors.sort(this.compTop);
      } else if (arc <= PolarCoordinateSorter.DEGREE_225 && arc > PolarCoordinateSorter.DEGREE_135) {
        // node is left
        nodeSuccessors.sort(this.compRight);
      } else if (arc <= PolarCoordinateSorter.DEGREE_135) {
        // node is top
        nodeSuccessors.sort(this.compBottom);
      }

      nextLayerId = this.setIDForNodes(nodeSuccessors, nextLayerId);
    }
    return id;
  }

  sort(nodes: ElkNode[]): void {
    if (nodes.length !== 0) {
      if (this.idSorter === null) {
        const root = RadialUtil.findRootOfNode(nodes[0] as ElkNode);
        this.initialize(root);
      }
      (this.idSorter as IDSorter).sort(nodes);
    }
  }
}
