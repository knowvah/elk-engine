// SPDX-License-Identifier: EPL-2.0
import { ContentAlignment } from '../../core/options/ContentAlignment.js';
import { PortSide } from '../../core/options/PortSide.js';
import { SizeConstraint } from '../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../core/options/SizeOptions.js';
import { KVector } from '../../core/math/KVector.js';
import { DEFAULT_MIN_HEIGHT, DEFAULT_MIN_WIDTH } from '../../core/util/ElkUtil.js';
import type { LGraph } from './graph/LGraph.js';
import { NodeType } from './graph/LNodeNodeType.js';
import { GraphProperties } from './options/GraphProperties.js';
import { InternalProperties } from './options/InternalProperties.js';
import { LayeredOptions } from './options/LayeredOptions.js';

// Section of `ElkLayered` (graph postprocessing: size and external ports), split out for the 500-line file limit.

/**
 * Sets the size of the given graph such that size constraints are adhered to. Furthermore, the border spacing is
 * added to the graph size and the graph offset.
 *
 * @see ElkLayered.java:675
 */
export function resizeGraph(lgraph: LGraph): void {
  const sizeConstraint = lgraph.getProperty(LayeredOptions.NODE_SIZE_CONSTRAINTS);
  const sizeOptions = lgraph.getProperty(LayeredOptions.NODE_SIZE_OPTIONS);

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

  if (!lgraph.getProperty(LayeredOptions.NODE_SIZE_FIXED_GRAPH_SIZE)) {
    resizeGraphNoReallyIMeanIt(lgraph, calculatedSize, adjustedSize);
  }
}

/**
 * Applies a new effective size to a graph that previously had an old size calculated by the layout algorithm. This
 * method takes care of adjusting content alignments as well as external ports that would be misplaced if the new
 * size is larger than the old one.
 *
 * @see ElkLayered.java:720
 */
function resizeGraphNoReallyIMeanIt(lgraph: LGraph, oldSize: KVector, newSize: KVector): void {
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
    moveExternalPorts(lgraph, oldSize, newSize);
  }

  // Actually apply the new size
  const lPadding = lgraph.getPadding();
  lgraph.getSize().x = newSize.x - lPadding.left - lPadding.right;
  lgraph.getSize().y = newSize.y - lPadding.top - lPadding.bottom;
}

/** `:750-764`: iterate over the graph's nodes, looking for eastern / southern external ports. */
function moveExternalPorts(lgraph: LGraph, oldSize: KVector, newSize: KVector): void {
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
