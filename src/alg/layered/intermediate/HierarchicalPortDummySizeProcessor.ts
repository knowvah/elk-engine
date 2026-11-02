// SPDX-License-Identifier: EPL-2.0
import { Alignment } from '../../../core/options/Alignment.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as Lists from '../../../guava/Lists.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Sets the width of hierarchical port dummies and sets the layer alignment of North/South port dummies to Center.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HierarchicalPortDummySizeProcessor.java
 */
export class HierarchicalPortDummySizeProcessor implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Hierarchical port dummy size processing', 1);

    const northernDummies: LNode[] = Lists.newArrayList();
    const southernDummies: LNode[] = Lists.newArrayList();

    // Calculate the width difference (this assumes CENTER node alignment)
    //  The idea behind this is that ports are stacked on top of each other at the center of the
    //  node. By iteratively increasing their size by twice the edgeEdge spacing between layers,
    //  vertical edge segments are spaced by that amount since the edge's anchor will either
    //  be the very first or very last point of the port.
    const edgeSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS);
    const delta = edgeSpacing * 2;

    // Iterate through the layers
    for (const layer of layeredGraph) {
      northernDummies.length = 0;
      southernDummies.length = 0;

      // Collect northern and southern hierarchical port dummies
      for (const node of layer) {
        if (node.getType() === NodeType.EXTERNAL_PORT) {
          const side = node.getProperty(InternalProperties.EXT_PORT_SIDE);

          if (side === PortSide.NORTH) {
            northernDummies.push(node);
          } else if (side === PortSide.SOUTH) {
            southernDummies.push(node);
          }
        }
      }

      // Set widths
      this.#setWidths(northernDummies, true, delta);
      this.#setWidths(southernDummies, false, delta);
    }

    monitor.done();
  }

  /**
   * Sets the widths of the given list of nodes and sets their layer alignment properly.
   *
   * @param nodes the list of nodes.
   * @param topDown `true` if the nodes should widen with increasing index, `false` if it should be the other way
   *   round.
   * @param delta the width difference from one node to the next.
   */
  #setWidths(nodes: readonly LNode[], topDown: boolean, delta: number): void {
    let currentWidth = 0.0;
    let step = delta;

    if (!topDown) {
      // Start with the widest node, decreasing node size
      currentWidth = delta * (nodes.length - 1);
      step *= -1.0;
    }

    for (const node of nodes) {
      node.setProperty(LayeredOptions.ALIGNMENT, Alignment.CENTER);
      node.getSize().x = currentWidth;

      // Move eastern ports to the node's right border
      for (const port of node.getPorts(PortSide.EAST)) {
        port.getPosition().x = currentWidth;
      }

      currentWidth += step;
    }
  }
}
