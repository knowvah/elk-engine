// SPDX-License-Identifier: EPL-2.0
import { NodeContext } from '../../src/alg/common/nodespacing/internal/NodeContext.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import type { PortSide } from '../../src/core/options/PortSide.js';
import type { ElkGraphAdapter } from '../../src/core/util/adapters/ElkGraphAdaptersElkGraphAdapter.js';
import type { ElkNodeAdapter } from '../../src/core/util/adapters/ElkGraphAdaptersElkNodeAdapter.js';
import { ElkGraphAdapters } from '../../src/core/util/adapters/ElkGraphAdapters.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { ElkPort } from '../../src/graph/ElkPort.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';

/** A root graph with one child node of size 40x30, and the adapters for both. */
export interface NodeFixture {
  readonly root: ElkNode;
  readonly node: ElkNode;
  readonly graph: ElkGraphAdapter;
  readonly nodeAdapter: ElkNodeAdapter;
}

export const NODE_WIDTH = 40;
export const NODE_HEIGHT = 30;

/** Registers the layout metadata the option properties need; call from `beforeAll`. */
export function loadLayoutMetaData(): void {
  LayoutMetaDataService.getInstance();
}

/** Builds the fixture; `configure` runs on the node and root before they are adapted. */
export function nodeFixture(configure?: (node: ElkNode, root: ElkNode) => void): NodeFixture {
  const root = ElkGraphUtil.createGraph();
  const node = ElkGraphUtil.createNode(root);
  node.setDimensions(NODE_WIDTH, NODE_HEIGHT);
  configure?.(node, root);
  const graph = ElkGraphAdapters.adapt(root);
  const nodeAdapter = [...graph.getNodes()][0] as ElkNodeAdapter;
  return { root, node, graph, nodeAdapter };
}

/** Creates a 2x2 port on the given side at the given location. */
export function addPort(node: ElkNode, side: PortSide, x = 0, y = 0): ElkPort {
  const port = ElkGraphUtil.createPort(node);
  port.setProperty(CoreOptions.PORT_SIDE, side);
  port.setLocation(x, y);
  port.setDimensions(2, 2);
  return port;
}

/** A `NodeContext` for the fixture's node. */
export function contextOf(fixture: NodeFixture): NodeContext {
  return new NodeContext(fixture.graph, fixture.nodeAdapter);
}
