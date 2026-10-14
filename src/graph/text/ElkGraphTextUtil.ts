// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import type { LayoutAlgorithmData } from '../../core/data/LayoutAlgorithmData.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import type { ElkGraphElement } from '../ElkGraphElement.js';
import { isElkEdge } from '../ElkEdge.js';
import { isElkLabel } from '../ElkLabel.js';
import type { ElkNode } from '../ElkNode.js';
import { isElkNode } from '../ElkNode.js';
import { isElkPort } from '../ElkPort.js';

/** The node a label ends up at after climbing its parent labels (the nested `switch parent`). */
function nodeOfLabelParent(parent: ElkGraphElement | null): ElkNode | null {
  if (isElkNode(parent)) {
    return parent.getParent() ?? parent;
  } else if (isElkPort(parent)) {
    const node = parent.getParent();
    return node === null ? null : (node.getParent() ?? node);
  } else if (isElkEdge(parent)) {
    return parent.getContainingNode();
  }
  return null;
}

/** The node whose `algorithm` property is responsible for the element (the first `switch element`). */
function responsibleNode(element: ElkGraphElement): ElkNode | null {
  if (isElkNode(element)) {
    return element;
  } else if (isElkPort(element)) {
    const node = element.getParent();
    return node === null ? null : (node.getParent() ?? node);
  } else if (isElkEdge(element)) {
    return element.getContainingNode();
  } else if (isElkLabel(element)) {
    let parent = element.getParent();
    while (isElkLabel(parent)) {
      parent = parent.getParent();
    }
    return nodeOfLabelParent(parent);
  }
  return null;
}

/**
 * Utilities for the ELK Graph Text format (Java: a final class with a private constructor and static
 * methods, so a frozen object of functions).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphTextUtil.xtend
 */
export const ElkGraphTextUtil = {
  /**
   * Return the algorithm that is responsible for the layout of the given element. Note that this might be
   * ambiguous: e.g. a port of a composite node can be handled both by the algorithm that arranges that node
   * and the algorithm that arranges its container node. A `null` element, an element without a responsible
   * node and a node without an algorithm give `null` (Xtend falls off the end of the method).
   *
   * @param element the element, may be `null` (a `switch` on `null` matches nothing)
   * @returns the algorithm data, or `null`
   * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraphTextUtil.xtend
   */
  getAlgorithm(element: ElkGraphElement | null): LayoutAlgorithmData | null {
    const node = element === null ? null : responsibleNode(element);
    if (node !== null) {
      const algorithmId = node.getProperty(CoreOptions.ALGORITHM);
      if (algorithmId !== null && algorithmId !== undefined && algorithmId.length > 0) {
        return LayoutMetaDataService.getInstance().getAlgorithmDataBySuffix(algorithmId);
      }
    }
    return null;
  },
} as const;
