// SPDX-License-Identifier: EPL-2.0
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { EdgeLabelPlacement } from '../../src/core/options/EdgeLabelPlacement.js';
import type { PortLabelPlacement } from '../../src/core/options/PortLabelPlacement.js';
import { PortSide } from '../../src/core/options/PortSide.js';
import type { ElkGraphAdapter } from '../../src/core/util/adapters/ElkGraphAdaptersElkGraphAdapter.js';
import type { ElkNodeAdapter } from '../../src/core/util/adapters/ElkGraphAdaptersElkNodeAdapter.js';
import { ElkGraphAdapters } from '../../src/core/util/adapters/ElkGraphAdapters.js';
import type { EnumSet } from '../../src/java/util/EnumSet.js';
import type { ElkConnectableShape } from '../../src/graph/ElkConnectableShape.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { addPort } from './node-context-fixtures.js';

/** Label spacing set on the root of every margin scenario. */
export const MARGIN_LABEL_SPACING = 4;

export interface MarginFixture {
  readonly root: ElkNode;
  /** 40x30 at (100, 50). */
  readonly node: ElkNode;
  /** 10x10 at (300, 300), the other end of every edge. */
  readonly other: ElkNode;
  readonly graph: ElkGraphAdapter;
  readonly nodeAdapter: ElkNodeAdapter;
  readonly otherAdapter: ElkNodeAdapter;
}

function labelledEdge(
  source: ElkConnectableShape,
  target: ElkConnectableShape,
  placement: EdgeLabelPlacement,
  width: number,
  height: number,
): void {
  const edge = ElkGraphUtil.createSimpleEdge(source, target);
  const label = ElkGraphUtil.createLabel(edge);
  label.setDimensions(width, height);
  label.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, placement);
}

function portWithLabel(
  node: ElkNode,
  side: PortSide,
  x: number,
  y: number,
  label?: readonly [number, number, number, number],
) {
  const port = addPort(node, side, x, y);
  if (label !== undefined) {
    const portLabel = ElkGraphUtil.createLabel(port);
    portLabel.setLocation(label[0], label[1]);
    portLabel.setDimensions(label[2], label[3]);
  }
  return port;
}

/**
 * A node at (100, 50), 40x30, with a node label at (5, -25) 20x10 and four ports (all 2x2): EAST (38, 10) with a
 * label (4, 0) 10x6; NORTH (20, -2) with a label (0, -14) 6x4; WEST (-2, 20) without label; SOUTH (10, 30) with a
 * label (0, 3) 8x6. Edge labels (head and tail; the second node `other` is the far end of every edge):
 *
 * - EAST, outgoing, TAIL 12x7; NORTH, incoming, HEAD 6x3; WEST, incoming, HEAD 7x3; SOUTH, outgoing, TAIL 5x5;
 * - at the node itself: incoming HEAD 8x5; outgoing with TAIL 9x4, plus a CENTER 200x3 and a HEAD 300x3 label that
 *   must be ignored for the node (but the HEAD one counts for `other`, whose incoming edge it is).
 */
export function marginFixture(portLabelsPlacement?: EnumSet<PortLabelPlacement>): MarginFixture {
  const root = ElkGraphUtil.createGraph();
  root.setProperty(CoreOptions.SPACING_LABEL_NODE, MARGIN_LABEL_SPACING);
  const node = ElkGraphUtil.createNode(root);
  node.setLocation(100, 50);
  node.setDimensions(40, 30);
  const other = ElkGraphUtil.createNode(root);
  other.setLocation(300, 300);
  other.setDimensions(10, 10);
  if (portLabelsPlacement !== undefined) {
    node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, portLabelsPlacement);
  }

  const nodeLabel = ElkGraphUtil.createLabel(node);
  nodeLabel.setLocation(5, -25);
  nodeLabel.setDimensions(20, 10);

  const east = portWithLabel(node, PortSide.EAST, 38, 10, [4, 0, 10, 6]);
  const north = portWithLabel(node, PortSide.NORTH, 20, -2, [0, -14, 6, 4]);
  const west = portWithLabel(node, PortSide.WEST, -2, 20);
  const south = portWithLabel(node, PortSide.SOUTH, 10, 30, [0, 3, 8, 6]);

  labelledEdge(east, other, EdgeLabelPlacement.TAIL, 12, 7);
  labelledEdge(other, north, EdgeLabelPlacement.HEAD, 6, 3);
  labelledEdge(other, west, EdgeLabelPlacement.HEAD, 7, 3);
  labelledEdge(south, other, EdgeLabelPlacement.TAIL, 5, 5);
  labelledEdge(other, node, EdgeLabelPlacement.HEAD, 8, 5);
  const direct = ElkGraphUtil.createSimpleEdge(node, other);
  for (const [placement, width, height] of [
    [EdgeLabelPlacement.TAIL, 9, 4],
    [EdgeLabelPlacement.CENTER, 200, 3],
    [EdgeLabelPlacement.HEAD, 300, 3],
  ] as const) {
    const label = ElkGraphUtil.createLabel(direct);
    label.setDimensions(width, height);
    label.setProperty(CoreOptions.EDGE_LABELS_PLACEMENT, placement);
  }

  const graph = ElkGraphAdapters.adapt(root);
  const [nodeAdapter, otherAdapter] = [...graph.getNodes()] as [ElkNodeAdapter, ElkNodeAdapter];
  return { root, node, other, graph, nodeAdapter, otherAdapter };
}
