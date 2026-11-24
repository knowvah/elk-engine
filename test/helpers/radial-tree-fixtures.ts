// SPDX-License-Identifier: EPL-2.0
// Fixtures shared by the explicit-stack proofs of the radial phases (mission tree-recursion-depth, #67): the caterpillar tree
// of the depth cases and the raw-bit dump of node locations.
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { doubleBits } from './spore-tree-fixtures.js';

/** A caterpillar: a spine of `spine` nodes, each with one leaf, every node 3 x 4. */
export function buildCaterpillar(spine: number): { spineNodes: ElkNode[]; leaves: ElkNode[] } {
  const graph = ElkGraphUtil.createGraph();
  const spineNodes: ElkNode[] = [];
  const leaves: ElkNode[] = [];
  for (let i = 0; i < spine; i++) {
    const node = ElkGraphUtil.createNode(graph);
    node.setDimensions(3, 4);
    const leaf = ElkGraphUtil.createNode(graph);
    leaf.setDimensions(3, 4);
    ElkGraphUtil.createSimpleEdge(node, leaf);
    if (i > 0) {
      ElkGraphUtil.createSimpleEdge(spineNodes[i - 1]!, node);
    }
    spineNodes.push(node);
    leaves.push(leaf);
  }
  return { spineNodes, leaves };
}

/** The raw bits of every node's location. */
export const bitsOf = (nodes: readonly ElkNode[]): string[] =>
  nodes.map((n) => `${doubleBits(n.getX())} ${doubleBits(n.getY())}`);
