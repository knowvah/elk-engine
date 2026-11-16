// SPDX-License-Identifier: EPL-2.0
// Small hand-built trees for the unit tests of the radial utilities (the expectations of those tests are traced from the Java source
// line by line, or taken from recorded rows; this module only builds the graphs).
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';

/** A node of a tree to build: identifier, size and the children it has an edge to. */
export interface TreeSpec {
  readonly id: string;
  readonly width?: number;
  readonly height?: number;
  readonly children?: readonly TreeSpec[];
}

export interface BuiltTree {
  /** The surrounding graph node, whose children are every node of the tree in pre-order. */
  readonly graph: ElkNode;
  /** Every node by identifier. */
  readonly nodes: ReadonlyMap<string, ElkNode>;
}

/** Builds a tree: each node is a child of one graph node, each parent has an edge to each of its children (in list order). */
export function buildTree(root: TreeSpec): BuiltTree {
  const graph = ElkGraphUtil.createGraph();
  graph.setIdentifier('graph');
  const nodes = new Map<string, ElkNode>();
  const add = (spec: TreeSpec): ElkNode => {
    const node = ElkGraphUtil.createNode(graph);
    node.setIdentifier(spec.id);
    node.setDimensions(spec.width ?? 0, spec.height ?? 0);
    nodes.set(spec.id, node);
    for (const child of spec.children ?? []) {
      ElkGraphUtil.createSimpleEdge(node, add(child));
    }
    return node;
  };
  add(root);
  return { graph, nodes };
}

/** A node of a built tree; throws when the id is unknown. */
export function nodeOf(tree: BuiltTree, id: string): ElkNode {
  const node = tree.nodes.get(id);
  if (node === undefined) {
    throw new Error(`no node ${id}`);
  }
  return node;
}

/** Identifiers of nodes, in order. */
export const idsOf = (nodes: Iterable<ElkNode | null>): (string | null)[] =>
  [...nodes].map((n) => n?.getIdentifier() ?? null);
