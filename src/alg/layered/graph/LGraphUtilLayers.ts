// SPDX-License-Identifier: EPL-2.0
import { Alignment } from '../../../core/options/Alignment.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { Layer } from './Layer.js';
import type { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';

/**
 * The "Layer Things" section of `LGraphUtil` (`:212-333`) as module functions behind the facade. The `alignment`
 * switch of `placeNodesHorizontally` is the private helper {@link alignmentRatio} (complexity limits).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphUtil.java
 */

/**
 * Determines a horizontal placement for all nodes of a layer. The size of the layer is assumed to be already set to
 * the maximal width of the contained nodes (usually done during node placement).
 *
 * @param layer the layer in which to place the nodes
 * @param xoffset horizontal offset for layer placement
 */
export function placeNodesHorizontally(layer: Layer, xoffset: number): void {
  // determine maximal left and right margin
  let maxLeftMargin = 0;
  let maxRightMargin = 0;
  for (const node of layer.getNodes()) {
    maxLeftMargin = Math.max(maxLeftMargin, node.getMargin().left);
    maxRightMargin = Math.max(maxRightMargin, node.getMargin().right);
  }

  for (const node of layer.getNodes()) {
    const ratio = alignmentRatio(node);

    // align nodes to the layer's maximal margin
    const size = layer.getSize();
    const nodeSize = node.getSize().x;
    let xpos = (size.x - nodeSize) * ratio;
    if (ratio > 0.5) {
      xpos -= maxRightMargin * 2 * (ratio - 0.5);
    } else if (ratio < 0.5) {
      xpos += maxLeftMargin * 2 * (0.5 - ratio);
    }

    // consider the node's individual margin
    const leftMargin = node.getMargin().left;
    if (xpos < leftMargin) {
      xpos = leftMargin;
    }
    const rightMargin = node.getMargin().right;
    if (xpos > size.x - rightMargin - nodeSize) {
      xpos = size.x - rightMargin - nodeSize;
    }

    node.getPosition().x = xoffset + xpos;
  }
}

/** The `switch (alignment)` of {@link placeNodesHorizontally}. */
function alignmentRatio(node: LNode): number {
  const alignment = node.getProperty(LayeredOptions.ALIGNMENT);
  switch (alignment) {
    case Alignment.LEFT:
      return 0.0;
    case Alignment.RIGHT:
      return 1.0;
    case Alignment.CENTER:
      return 0.5;
    default: {
      // determine the number of input and output ports for the node
      let inports = 0;
      let outports = 0;
      for (const port of node.getPorts()) {
        if (port.getIncomingEdges().length !== 0) {
          inports++;
        }

        if (port.getOutgoingEdges().length !== 0) {
          outports++;
        }
      }

      // calculate node placement based on the port numbers
      if (inports + outports === 0) {
        return 0.5;
      } else {
        return outports / (inports + outports);
      }
    }
  }
}

/**
 * Finds the maximum width of non-dummy nodes in the given layer.
 *
 * If the graph is laid out in a vertical direction, the maximum non-dummy node width doesn't mean anything since the
 * labels are narrow, but very high. So in that case, `0.0` is returned.
 *
 * When calling the function prior to node margin calculation, the node margins are unknown/invalid. One may set the
 * `respectNodeMargins` flag accordingly. It would seem that the solution is to execute label management after node
 * margin calculation. But there's a chicken-and-egg problem right there: if we execute node margin calculation first,
 * it won't know about shortened edge end labels and port labels. If we execute label management first, it won't
 * include node margins in the space usable for center edge labels. Damn!
 *
 * @param layer the layer to iterate over.
 * @param respectNodeMargins whether to include node margins in width calculation.
 * @return the maximum width of non-dummy nodes. If there are none or the layout direction is vertical, `0.0` is
 *         returned.
 */
export function findMaxNonDummyNodeWidth(layer: Layer, respectNodeMargins: boolean): number {
  if (layer.getGraph().getProperty(LayeredOptions.DIRECTION).isVertical()) {
    return 0.0;
  }

  let maxWidth = 0.0;

  for (const node of layer) {
    if (node.getType() === NodeType.NORMAL) {
      let width = node.getSize().x;
      if (respectNodeMargins) {
        width += node.getMargin().left + node.getMargin().right;
      }
      maxWidth = Math.max(maxWidth, width);
    }
  }

  return maxWidth;
}
