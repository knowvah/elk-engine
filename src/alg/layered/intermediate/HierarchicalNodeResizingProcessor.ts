// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { KVector } from '../../../core/math/KVector.js';
import { ContentAlignment } from '../../../core/options/ContentAlignment.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../core/options/SizeOptions.js';
import { DEFAULT_MIN_HEIGHT, DEFAULT_MIN_WIDTH } from '../../../core/util/ElkUtil.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import type { LGraph } from '../graph/LGraph.js';
import { LGraphUtil } from '../graph/LGraphUtil.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import { LPort } from '../graph/LPort.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * This processor resizes a child graph to fit the parent node. It must be run as the last non-hierarchical processor in
 * a hierarchical graph.
 *
 * Precondition: graph with layout completed. Postcondition: graph is resized to fit parent node. Slots: after phase 5.
 *
 * `resizeGraph` and `resizeGraphNoReallyIMeanIt` are this class's own copy of `ElkLayered`'s methods of the same names
 * (`ElkLayeredResize.ts`): the copy has no `NODE_SIZE_FIXED_GRAPH_SIZE` guard and is deliberately not shared.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/HierarchicalNodeResizingProcessor.java
 */
export class HierarchicalNodeResizingProcessor implements ILayoutProcessor<LGraph> {
  /** @see HierarchicalNodeResizingProcessor.java:53 */
  process(graph: LGraph, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin('Resize child graph to fit parent.', 1);
    for (const layer of graph) {
      graph.getLayerlessNodes().push(...layer.getNodes());
      layer.getNodes().length = 0;
    }
    for (const node of graph.getLayerlessNodes()) {
      node.setLayer(null);
    }
    graph.getLayers().length = 0;
    this.resizeGraph(graph);
    if (this.isNested(graph)) {
      this.graphLayoutToNode(graph.getParentNode()!, graph);
    }
    progressMonitor.done();
  }

  /**
   * Transfer the layout of the given graph to the given associated node.
   *
   * @see HierarchicalNodeResizingProcessor.java:79
   */
  private graphLayoutToNode(node: LNode, lgraph: LGraph): void {
    // Process external ports
    for (const childNode of lgraph.getLayerlessNodes()) {
      const origin: unknown = childNode.getProperty(InternalProperties.ORIGIN);
      if (origin instanceof LPort) {
        const port = origin;
        const portPosition = LGraphUtil.getExternalPortPosition(lgraph, childNode, port.getSize().x, port.getSize().y);
        port.getPosition().x = portPosition.x;
        port.getPosition().y = portPosition.y;
        port.setSide(childNode.getProperty(InternalProperties.EXT_PORT_SIDE));
      }
    }

    // Setup the parent node
    const actualGraphSize = lgraph.getActualSize();
    if (lgraph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS)) {
      // Ports have positions assigned
      node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
      node.getGraph()!.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.NON_FREE_PORTS);
      LGraphUtil.resizeNode(node, actualGraphSize, false, true);
    } else {
      // Ports have not been positioned yet - leave this for next layouter
      LGraphUtil.resizeNode(node, actualGraphSize, true, true);
    }
  }

  /** @see HierarchicalNodeResizingProcessor.java:109 */
  private isNested(graph: LGraph): boolean {
    return graph.getParentNode() !== null;
  }

  // Graph Postprocessing (Size and External Ports)

  /**
   * Sets the size of the given graph such that size constraints are adhered to. Furthermore, the padding is added to
   * the graph size and the graph offset. Afterwards, the border spacing property is reset to 0.
   *
   * Note: This method doesn't care about labels of compound nodes since those labels are not attached to the graph.
   *
   * @see HierarchicalNodeResizingProcessor.java:132
   */
  private resizeGraph(lgraph: LGraph): void {
    const sizeConstraint = lgraph.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS);
    const sizeOptions = lgraph.getProperty(LayeredOptions.NODE_SIZE_OPTIONS);

    // getActualSize() used to take the border spacing (what is now included in the padding) into account, which is
    // why by this point it had to be cleared since it had already been applied to the offset and the graph size. It
    // currently does not take the padding into account anymore, but if it does, it needs to be cleared again
    const calculatedSize = lgraph.getActualSize();
    const adjustedSize = new KVector(calculatedSize);

    // calculate the new size
    if (sizeConstraint.contains(SizeConstraint.MINIMUM_SIZE)) {
      const minSize = lgraph.getProperty(LayeredOptions.NODE_SIZE_MINIMUM);

      // if minimum width or height are not set, maybe default to default values
      if (sizeOptions.contains(SizeOptions.DEFAULT_MINIMUM_SIZE)) {
        if (minSize.x <= 0) {
          minSize.x = DEFAULT_MIN_WIDTH;
        }

        if (minSize.y <= 0) {
          minSize.y = DEFAULT_MIN_HEIGHT;
        }
      }

      // apply new size including border spacing
      adjustedSize.x = Math.max(calculatedSize.x, minSize.x);
      adjustedSize.y = Math.max(calculatedSize.y, minSize.y);
    }

    this.resizeGraphNoReallyIMeanIt(lgraph, calculatedSize, adjustedSize);
  }

  /**
   * Applies a new effective size to a graph that previously had an old size calculated by the layout algorithm. This
   * method takes care of adjusting content alignments as well as external ports that would be misplaced if the new
   * size is larger than the old one.
   *
   * @see HierarchicalNodeResizingProcessor.java:178
   */
  private resizeGraphNoReallyIMeanIt(lgraph: LGraph, oldSize: KVector, newSize: KVector): void {
    // obey to specified alignment constraints
    const contentAlignment = lgraph.getProperty(LayeredOptions.CONTENT_ALIGNMENT);

    // horizontal alignment (F11: `/ 2f` is a double division by 2, the float operand being exact)
    if (newSize.x > oldSize.x) {
      if (contentAlignment.contains(ContentAlignment.H_CENTER)) {
        lgraph.getOffset().x += (newSize.x - oldSize.x) / 2;
      } else if (contentAlignment.contains(ContentAlignment.H_RIGHT)) {
        lgraph.getOffset().x += newSize.x - oldSize.x;
      }
    }

    // vertical alignment
    if (newSize.y > oldSize.y) {
      if (contentAlignment.contains(ContentAlignment.V_CENTER)) {
        lgraph.getOffset().y += (newSize.y - oldSize.y) / 2;
      } else if (contentAlignment.contains(ContentAlignment.V_BOTTOM)) {
        lgraph.getOffset().y += newSize.y - oldSize.y;
      }
    }

    // correct the position of eastern and southern hierarchical ports, if necessary
    if (
      lgraph.getProperty(InternalProperties.GRAPH_PROPERTIES).contains(GraphProperties.EXTERNAL_PORTS) &&
      (newSize.x > oldSize.x || newSize.y > oldSize.y)
    ) {
      this.moveExternalPorts(lgraph, oldSize, newSize);
    }

    // Actually apply the new size
    const padding = lgraph.getPadding();
    lgraph.getSize().x = newSize.x - padding.left - padding.right;
    lgraph.getSize().y = newSize.y - padding.top - padding.bottom;
  }

  /**
   * The `for` loop of {@link resizeGraphNoReallyIMeanIt} (`:207-220`), split out only for the 30 NLOC function limit.
   */
  private moveExternalPorts(lgraph: LGraph, oldSize: KVector, newSize: KVector): void {
    // iterate over the graph's nodes, looking for eastern / southern external ports
    // (at this point, the graph's nodes are not divided into layers anymore)
    for (const node of lgraph.getLayerlessNodes()) {
      // we're only looking for external port dummies
      if (node.getType() === NodeType.EXTERNAL_PORT) {
        // check which side the external port is on
        const extPortSide = node.getProperty(InternalProperties.EXT_PORT_SIDE);
        if (extPortSide === PortSide.EAST) {
          node.getPosition().x += newSize.x - oldSize.x;
        } else if (extPortSide === PortSide.SOUTH) {
          node.getPosition().y += newSize.y - oldSize.y;
        }
      }
    }
  }
}
