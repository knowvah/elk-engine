// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addPort, loadLayoutMetaData, nodeFixture } from '../../../test/helpers/node-context-fixtures.js';
import { CoreOptions } from '../../core/options/CoreOptions.js';
import { PortConstraints } from '../../core/options/PortConstraints.js';
import { PortSide } from '../../core/options/PortSide.js';
import { SizeConstraint } from '../../core/options/SizeConstraint.js';
import { ElkGraphAdapters } from '../../core/util/adapters/ElkGraphAdapters.js';
import { ElkPadding } from '../../core/math/ElkPadding.js';
import { KVector } from '../../core/math/KVector.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { NodeMicroLayout } from './NodeMicroLayout.js';

beforeAll(loadLayoutMetaData);

const MIN_WIDTH = 100;
const MIN_HEIGHT = 60;

/**
 * 40x30 node with MINIMUM_SIZE (100x60) and FIXED_ORDER ports (only then does `sortPortList` sort).
 */
function configure(node: ElkNode): void {
  node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.MINIMUM_SIZE));
  node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(MIN_WIDTH, MIN_HEIGHT));
  node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
}

describe('NodeMicroLayout', () => {
  it('forGraph(ElkNode) adapts the node and forGraph(adapter) uses the adapter as is', () => {
    const viaNode = nodeFixture(configure);
    const viaAdapter = nodeFixture(configure);
    NodeMicroLayout.forGraph(viaNode.root).execute();
    NodeMicroLayout.forGraph(ElkGraphAdapters.adapt(viaAdapter.root)).execute();
    expect([viaNode.node.getWidth(), viaNode.node.getHeight()]).toEqual([MIN_WIDTH, MIN_HEIGHT]);
    expect([viaAdapter.node.getWidth(), viaAdapter.node.getHeight()]).toEqual([MIN_WIDTH, MIN_HEIGHT]);
  });

  it('forGraph returns a new instance per call', () => {
    const { root } = nodeFixture(configure);
    expect(NodeMicroLayout.forGraph(root)).not.toBe(NodeMicroLayout.forGraph(root));
  });

  it('execute sorts the ports, then sizes the node, then computes the margins', () => {
    const { root, node } = nodeFixture((n) => {
      configure(n);
      n.setProperty(CoreOptions.PADDING, new ElkPadding(0));
      addPort(n, PortSide.WEST);
      addPort(n, PortSide.NORTH);
      addPort(n, PortSide.EAST);
    });
    NodeMicroLayout.forGraph(root).execute();
    // sort: NORTH, EAST, WEST (clockwise from the north side; WEST last)
    expect([...node.getPorts()].map((p) => p.getProperty(CoreOptions.PORT_SIDE))).toEqual([
      PortSide.NORTH,
      PortSide.EAST,
      PortSide.WEST,
    ]);
    // sizes: the minimum size
    expect([node.getWidth(), node.getHeight()]).toEqual([MIN_WIDTH, MIN_HEIGHT]);
    // margins: the EAST port is placed at x = node width and is 2 wide; the WEST port at x = -2
    const margins = node.getProperty(CoreOptions.MARGINS);
    expect([margins.top, margins.right, margins.bottom, margins.left]).toEqual([2, 2, 0, 2]);
  });
});
