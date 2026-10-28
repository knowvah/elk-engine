// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { Direction } from '../../../core/options/Direction.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { LGraph } from './LGraph.js';
import type { LNode } from './LNode.js';

/**
 * The "Other Stuff" section of `LGraphUtil` (`:1095-1162`) as module functions; the ports and graph-properties
 * sections call `getDirection`, so it cannot live in the facade.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphUtil.java
 */

/**
 * `LGraph`-local implementation of `IndividualSpacings.getIndividualOrInherited(ElkNode, IProperty)`.
 *
 * @param node the node whose property value to return. If the property is not set as part of an
 *          `IndividualSpacings` object, we use the property value set on the graph the node is part of.
 * @param property the property whose value to return.
 * @return the property value.
 */
export function getIndividualOrInherited<T>(node: LNode, property: IProperty<T>): T | null {
  let result: T | null = null;

  if (node.hasProperty(CoreOptions.SPACING_INDIVIDUAL)) {
    const individualSpacings = node.getProperty(CoreOptions.SPACING_INDIVIDUAL);
    if (individualSpacings.hasProperty(property)) {
      result = individualSpacings.getProperty(property);
    }
  }

  // use the common value
  if (result === null && node.getGraph() !== null) {
    result = node.getGraph()!.getProperty(property);
  }

  return result;
}

/**
 * Determine the layout direction for the given graph. If the direction option is undefined, a suitable direction is
 * chosen depending on the aspect ratio.
 *
 * @param graph a layered graph
 * @return the layout direction to apply for the graph
 */
export function getDirection(graph: LGraph): Direction {
  const direction = graph.getProperty(LayeredOptions.DIRECTION);
  if (direction === Direction.UNDEFINED) {
    const aspectRatio = graph.getProperty(LayeredOptions.ASPECT_RATIO);
    if (aspectRatio >= 1) {
      // Default due to default value of the ASPECT_RATIO option for the algorithm
      return Direction.RIGHT;
    } else {
      return Direction.DOWN;
    }
  }
  return direction;
}

/**
 * Determines the minimal node order of an unlayered graph.
 *
 * @return model order or `Integer.MAX_VALUE` if no node with a model order could be found.
 */
export function getMinimalModelOrder(graph: LGraph): number {
  let order = JavaInteger.MAX_VALUE;
  for (const node of graph.getLayerlessNodes()) {
    if (node.hasProperty(InternalProperties.MODEL_ORDER)) {
      order = Math.min(order, node.getProperty(InternalProperties.MODEL_ORDER));
    }
  }
  return order;
}
