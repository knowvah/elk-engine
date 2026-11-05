// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../core/options/PortSide.js';
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { SimpleRowGraphPlacer } from './SimpleRowGraphPlacer.js';

/**
 * A row placer that keeps the model order of the components and respects their external port sides.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderRowGraphPlacer.java
 */
export class ModelOrderRowGraphPlacer extends SimpleRowGraphPlacer {
  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderRowGraphPlacer.java:32 */
  override sortComponents(_components: LGraph[], _target: LGraph): void {
    // Does nothing since components are already sorted by model order
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderRowGraphPlacer.java:37 */
  override placeComponents(components: LGraph[], target: LGraph, maxRowWidth: number, componentSpacing: number): void {
    // Place nodes iteratively into rows while considering the model order.
    let xpos = 0;
    let ypos = 0;
    let highestBox = 0;
    let broadestRow = componentSpacing;
    let lastComponent: LGraph | null = null;
    let startXOfRow = 0;
    for (const graph of components) {
      const size = graph.getSize();
      const sides = graph.getProperty(InternalProperties.EXT_PORT_CONNECTIONS);
      if (ModelOrderRowGraphPlacer.needsNewRow(graph, lastComponent, xpos, maxRowWidth)) {
        // Components with NORTH connection are allowed to violate the width constrain.
        // Place the graph into the next row
        // Previous EAST ports require a new row.
        // A WEST port requires a new row.
        xpos = startXOfRow;
        ypos += highestBox + componentSpacing;
        highestBox = 0;
      }
      const offset = graph.getOffset();

      // North ports should be placed such that they don't intersect with prior components.
      xpos = sides.contains(PortSide.NORTH) ? broadestRow + componentSpacing : xpos;
      this.offsetGraph(graph, xpos + offset.x, ypos + offset.y);
      broadestRow = Math.max(broadestRow, xpos + size.x);

      // South ports block of everything below them.
      startXOfRow = sides.contains(PortSide.SOUTH)
        ? Math.max(startXOfRow, xpos + size.x + componentSpacing)
        : startXOfRow;
      offset.reset();
      highestBox = Math.max(highestBox, size.y);
      xpos += size.x + componentSpacing;
      lastComponent = graph;
    }

    target.getSize().x = broadestRow;
    target.getSize().y = ypos + highestBox;
  }

  /**
   * The row break condition of `placeComponents` (split out for the complexity limits). Components with NORTH
   * connection are allowed to violate the width constraint; previous EAST ports require a new row; a WEST port
   * requires a new row.
   */
  private static needsNewRow(graph: LGraph, lastComponent: LGraph | null, xpos: number, maxRowWidth: number): boolean {
    const size = graph.getSize();
    const sides = graph.getProperty(InternalProperties.EXT_PORT_CONNECTIONS);
    return (
      (xpos + size.x > maxRowWidth && !sides.contains(PortSide.NORTH)) ||
      (lastComponent !== null &&
        lastComponent.getProperty(InternalProperties.EXT_PORT_CONNECTIONS).contains(PortSide.EAST)) ||
      sides.contains(PortSide.WEST)
    );
  }
}
