// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addPort, loadLayoutMetaData, nodeFixture } from '../../../../test/helpers/node-context-fixtures.js';
import { marginFixture } from '../../../../test/helpers/node-margin-fixtures.js';
import { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../core/options/SizeConstraint.js';
import type { ElkNode } from '../../../graph/ElkNode.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { NodeDimensionCalculation } from './NodeDimensionCalculation.js';
import { NodeMarginCalculator } from './NodeMarginCalculator.js';

beforeAll(loadLayoutMetaData);

type Margins = readonly [top: number, right: number, bottom: number, left: number];

const marginsOf = (node: ElkNode): Margins => {
  const margin = node.getProperty(CoreOptions.MARGINS);
  return [margin.top, margin.right, margin.bottom, margin.left];
};

describe('NodeDimensionCalculation', () => {
  it('calculateLabelAndNodeSizes sizes every child of the graph', () => {
    const { graph, node } = nodeFixture((n) => {
      n.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, EnumSet.of(SizeConstraint.MINIMUM_SIZE));
      n.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(100, 60));
    });
    NodeDimensionCalculation.calculateLabelAndNodeSizes(graph);
    expect([node.getWidth(), node.getHeight()]).toEqual([100, 60]);
  });

  it('calculateNodeMargins matches the fully included margin calculator (hand-derived in NodeMarginCalculator)', () => {
    const { graph, node, other } = marginFixture();
    NodeDimensionCalculation.calculateNodeMargins(graph);
    expect(marginsOf(node)).toEqual([25, 30, 21, 17]);
    expect(marginsOf(other)).toEqual([0, 0, 0, 304]);
  });

  it('getNodeMarginCalculator returns a fresh, configurable calculator per call', () => {
    const { graph, node } = marginFixture();
    const first = NodeDimensionCalculation.getNodeMarginCalculator(graph);
    const second = NodeDimensionCalculation.getNodeMarginCalculator(graph);
    expect(first).toBeInstanceOf(NodeMarginCalculator);
    expect(first).not.toBe(second);
    first.excludeLabels();
    first.process();
    // labels excluded: the node label's 25 on top shrinks to the 17 of the port labels
    expect(marginsOf(node)).toEqual([17, 30, 21, 17]);
    second.process();
    expect(marginsOf(node)).toEqual([25, 30, 21, 17]);
  });

  it('sortPortLists sorts the ports of every node clockwise when their order is fixed', () => {
    const { graph, node } = nodeFixture((n) => {
      n.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
      addPort(n, PortSide.WEST);
      addPort(n, PortSide.SOUTH);
      addPort(n, PortSide.NORTH);
      addPort(n, PortSide.EAST);
    });
    NodeDimensionCalculation.sortPortLists(graph);
    expect([...node.getPorts()].map((p) => p.getProperty(CoreOptions.PORT_SIDE))).toEqual([
      PortSide.NORTH,
      PortSide.EAST,
      PortSide.SOUTH,
      PortSide.WEST,
    ]);
  });

  it('sortPortLists leaves ports alone when their order is not fixed', () => {
    const { graph, node } = nodeFixture((n) => {
      addPort(n, PortSide.WEST);
      addPort(n, PortSide.NORTH);
    });
    NodeDimensionCalculation.sortPortLists(graph);
    expect([...node.getPorts()].map((p) => p.getProperty(CoreOptions.PORT_SIDE))).toEqual([
      PortSide.WEST,
      PortSide.NORTH,
    ]);
  });
});
