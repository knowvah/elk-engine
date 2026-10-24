// SPDX-License-Identifier: EPL-2.0
/**
 * `ElkUtil` default layout settings: `configureDefaultsRecursively`, the three `configureWithDefaultValues`
 * overloads and the private `ensureLabel` (M10 section module of `ElkUtil.ts`).
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
import { isElkEdge } from '../../graph/ElkEdge.js';
import type { ElkEdge } from '../../graph/ElkEdge.js';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import type { ElkPort } from '../../graph/ElkPort.js';
import { isElkPort } from '../../graph/ElkPort.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { isNullOrEmpty } from '../../guava/Strings.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { EdgeLabelPlacement } from '../options/EdgeLabelPlacement.js';
import { NodeLabelPlacement } from '../options/NodeLabelPlacement.js';
import { SizeConstraint } from '../options/SizeConstraint.js';
import { DEFAULT_MIN_HEIGHT, DEFAULT_MIN_WIDTH } from './ElkUtilSizing.js';

/** Java `* 2 * 2` / `/ 2 / 2`: the factor between the minimal size and a default node (port) size. */
const SIZE_STEP = 2;

/**
 * If the element does not already own a label, a label is created based on the element's identifier.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function ensureLabel(klge: ElkGraphElement): void {
  if (klge.getLabels().isEmpty()) {
    if (!isNullOrEmpty(klge.getIdentifier())) {
      const label = ElkGraphUtil.createLabel(klge);
      label.setText(klge.getIdentifier());
    }
  }
}

/**
 * Adds some default values to the passed node. This includes a reasonable size, a label based on the node's
 * identifier and a inside center node label placement.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function configureNodeWithDefaultValues(node: ElkNode): void {
  // Make sure the node has a size if the size constraints are fixed
  const sc = node.getProperty(CoreOptions.NODE_SIZE_CONSTRAINTS);

  if (sc.equals(SizeConstraint.fixed()) && node.getWidth() === 0 && node.getHeight() === 0) {
    node.setWidth(DEFAULT_MIN_WIDTH * SIZE_STEP * SIZE_STEP);
    node.setHeight(DEFAULT_MIN_HEIGHT * SIZE_STEP * SIZE_STEP);
  }

  // label
  ensureLabel(node);

  const nlp = node.getProperty(CoreOptions.NODE_LABELS_PLACEMENT);
  if (nlp.equals(NodeLabelPlacement.fixed())) {
    node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, NodeLabelPlacement.insideCenter());
  }
}

/**
 * Adds some default values to the passed port. This includes a reasonable size and a label based on the port's
 * identifier.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function configurePortWithDefaultValues(port: ElkPort): void {
  if (port.getWidth() === 0 && port.getHeight() === 0) {
    port.setWidth(DEFAULT_MIN_WIDTH / SIZE_STEP / SIZE_STEP);
    port.setHeight(DEFAULT_MIN_HEIGHT / SIZE_STEP / SIZE_STEP);
  }

  ensureLabel(port);
}

/**
 * Configures the `EdgeLabelPlacement` of the passed edge to be center of the edge.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
function configureEdgeWithDefaultValues(edge: ElkEdge): void {
  if (!edge.hasProperty(CoreOptions.EDGE_LABELS_PLACEMENT)) {
    edge.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, EdgeLabelPlacement.CENTER);
  }
}

/**
 * The three Java overloads of `configureWithDefaultValues`: node, port and edge.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function configureWithDefaultValues(element: ElkNode | ElkPort | ElkEdge): void {
  if (isElkNode(element)) {
    configureNodeWithDefaultValues(element);
  } else if (isElkPort(element)) {
    configurePortWithDefaultValues(element);
  } else {
    configureEdgeWithDefaultValues(element);
  }
}

/**
 * Recursively configures default values for all child elements of the passed graph. This includes node, ports,
 * and edges.
 *
 * Note that it is **not** checked whether the defaults flag is set on the graph.
 *
 * @param graph the graph to configure.
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkUtil.java
 */
export function configureDefaultsRecursively(graph: ElkNode): void {
  for (const kge of graph.eAllContents()) {
    if (!isElkGraphElement(kge)) {
      continue;
    }
    if (isElkNode(kge) || isElkPort(kge) || isElkEdge(kge)) {
      configureWithDefaultValues(kge);
    }
  }
}
