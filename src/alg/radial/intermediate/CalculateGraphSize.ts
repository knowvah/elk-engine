// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { InternalProperties } from '../InternalProperties.js';
import { RadialOptions } from '../options/RadialOptions.js';

/**
 * Calculates the size of the graph and shifts the nodes such that all coordinates are positive.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/CalculateGraphSize.java
 */
export class CalculateGraphSize implements ILayoutProcessor<ElkNode> {
  /** Shift the nodes such that each nodes has x and y coordinates bigger 0. */
  process(graph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Calculate Graph Size', 1);
    progressMonitor.logGraph(graph, 'Before');
    // calculate the offset from border spacing and node distribution
    const [minXPos, minYPos, maxXPos, maxYPos] = CalculateGraphSize.nodeBounds(graph);

    const padding = graph.getProperty(CoreOptions.PADDING);
    const offset = new KVector(minXPos - padding.getLeft(), minYPos - padding.getTop());

    let width = maxXPos - minXPos + padding.getHorizontal();
    let height = maxYPos - minYPos + padding.getVertical();

    if (graph.getProperty(RadialOptions.CENTER_ON_ROOT)) {
      [width, height] = CalculateGraphSize.centerOnRoot(graph, offset, width, height);
    }

    // process the nodes
    for (const node of graph.getChildren()) {
      // set the node position
      node.setX(node.getX() - offset.x);
      node.setY(node.getY() - offset.y);
    }

    // set up the graph
    if (!graph.getProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
      graph.setWidth(width);
      graph.setHeight(height);
    }

    // store child area info
    graph.setProperty(CoreOptions.CHILD_AREA_WIDTH, width - padding.getHorizontal());
    graph.setProperty(CoreOptions.CHILD_AREA_HEIGHT, height - padding.getVertical());
    progressMonitor.logGraph(graph, 'After');
  }

  /**
   * The bounds `[minX, minY, maxX, maxY]` of the children including their margins (the first loop of `process`, split off for the
   * complexity limits).
   */
  private static nodeBounds(graph: ElkNode): [number, number, number, number] {
    let minXPos = Number.MAX_VALUE;
    let minYPos = Number.MAX_VALUE;
    // Double.MIN_VALUE is the smallest positive double, not the most negative (kept, CalculateGraphSize.java:40)
    let maxXPos = Number.MIN_VALUE;
    let maxYPos = Number.MIN_VALUE;

    for (const node of graph.getChildren()) {
      const posX = node.getX();
      const posY = node.getY();
      const width = node.getWidth();
      const height = node.getHeight();
      const margins = node.getProperty(CoreOptions.MARGINS);

      minXPos = Math.min(minXPos, posX - margins.left);
      minYPos = Math.min(minYPos, posY - margins.top);
      maxXPos = Math.max(maxXPos, posX + width + margins.right);
      maxYPos = Math.max(maxYPos, posY + height + margins.bottom);
    }
    return [minXPos, minYPos, maxXPos, maxYPos];
  }

  /**
   * The `CENTER_ON_ROOT` block of `process` (split off for the complexity limits): grows `width` and `height` so the root is
   * centered, moving `offset` in place, and returns `[width, height]`.
   */
  private static centerOnRoot(graph: ElkNode, offset: KVector, width: number, height: number): [number, number] {
    const root = graph.getProperty(InternalProperties.ROOT_NODE) as ElkNode;
    const rootMargins = root.getProperty(CoreOptions.MARGINS);
    // calculate the current midpoint of the root, taking into account the defined margins and the already
    // calculated offset necessary to shift the graph into the positive quadrant of the coordinate system
    const rootX = root.getX() + root.getWidth() / 2 + (rootMargins.left + rootMargins.right) / 2 - offset.x;
    const rootY = root.getY() + root.getHeight() / 2 + (rootMargins.top + rootMargins.bottom) / 2 - offset.y;

    const dx = width - rootX;
    const dy = height - rootY;

    if (dx < width / 2) {
      // need to add additional space on the left
      const additionalX = dx - rootX;
      width += additionalX;
      offset.x -= additionalX;
    } else {
      // add addtional space on the right
      const additionalX = rootX - dx;
      width += additionalX;
    }

    if (dy < height / 2) {
      //need to add additional space on the top
      const additionalY = dy - rootY;
      height += additionalY;
      offset.y -= additionalY;
    } else {
      // add addtional space on the bottom
      const additionalY = rootY - dy;
      height += additionalY;
    }
    return [width, height];
  }
}
