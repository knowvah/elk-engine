// SPDX-License-Identifier: EPL-2.0
// `GraphTestUtils.allNodes`, `getChild` and `getPort` (alg.test `GraphTestUtils.java`), the navigation half the ported layout
// suites share; `haveOverlaps` is in `graph-test-utils.ts`.
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';

/** `GraphTestUtils.allNodes`: breadth-first, the list grows while it is walked. */
export function allNodes(graph: ElkNode, includeGraph: boolean): ElkNode[] {
  const nodes: ElkNode[] = includeGraph ? [graph] : [...graph.getChildren()];
  // The list's size can grow during each iteration and thus cannot be cached.
  for (let i = 0; i < nodes.length; i++) {
    nodes.push(...nodes[i]!.getChildren());
  }
  return nodes;
}

/** `GraphTestUtils.getChild`: follows the identifiers down from the parent; throws when one has no child. */
export function getChild(parent: ElkNode, ...childPath: string[]): ElkNode {
  let result: ElkNode | null = null;
  let currentParent = parent;
  for (const identifier of childPath) {
    result = null;
    for (const child of currentParent.getChildren()) {
      if (identifier === child.getIdentifier()) {
        result = child;
        break;
      }
    }
    if (result === null) {
      throw new Error(`The node "${currentParent.getIdentifier()}" has no child with identifier "${identifier}".`);
    }
    currentParent = result;
  }
  return result!;
}

/** `GraphTestUtils.getPort`: the port of the node with the identifier; throws when there is none. */
export function getPort(node: ElkNode, portId: string): ElkPort {
  for (const port of node.getPorts()) {
    if (portId === port.getIdentifier()) {
      return port;
    }
  }
  throw new Error(`The node "${node.getIdentifier()}" has no port with identifier "${portId}".`);
}
