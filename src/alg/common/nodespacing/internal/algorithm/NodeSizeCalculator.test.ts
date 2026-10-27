// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import {
  addLabel,
  cellSystemContext,
  constrain,
  constrainNone,
} from '../../../../../../test/helpers/cell-creator-fixtures.js';
import { loadLayoutMetaData } from '../../../../../../test/helpers/node-context-fixtures.js';
import { KVector } from '../../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { NodeLabelPlacement } from '../../../../../core/options/NodeLabelPlacement.js';
import { PortConstraints } from '../../../../../core/options/PortConstraints.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { ElkNode } from '../../../../../graph/ElkNode.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import type { NodeContext } from '../NodeContext.js';
import { CellSystemConfigurator } from './CellSystemConfigurator.js';
import { NodeLabelAndSizeUtilities } from './NodeLabelAndSizeUtilities.js';
import { NodeSizeCalculator } from './NodeSizeCalculator.js';

const { NORTH, SOUTH, EAST, WEST } = PortSide;
const { PORTS, PORT_LABELS, NODE_LABELS, MINIMUM_SIZE } = SizeConstraint;
const { INSIDE, OUTSIDE, V_TOP, H_LEFT, H_CENTER, V_CENTER, H_RIGHT } = NodeLabelPlacement;

beforeAll(loadLayoutMetaData);

function minimum(width: number, height: number): (node: ElkNode) => void {
  return (node) => node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(width, height));
}

/** Builds the cell system for a node, lets `tweak` adjust it, and runs the configurator and both size passes. */
function sized(configure: (node: ElkNode, root: ElkNode) => void, tweak: (context: NodeContext) => void = () => {}) {
  const context = cellSystemContext(configure);
  tweak(context);
  CellSystemConfigurator.configureCellSystemSizeContributions(context);
  NodeSizeCalculator.setNodeWidth(context);
  NodeSizeCalculator.setNodeHeight(context);
  return context;
}

function size(context: NodeContext): number[] {
  return [context.nodeSize.x, context.nodeSize.y];
}

describe('size constraints', () => {
  it('keeps the current size for {}', () => {
    const context = sized(constrainNone);
    expect(size(context)).toEqual([40, 30]);
    const rect = context.nodeContainer.getCellRectangle();
    expect([rect.x, rect.y, rect.width, rect.height]).toEqual([0, 0, 40, 30]);
  });

  it('keeps the current size for {PORT_LABELS}', () => {
    expect(size(sized((node) => constrain(node, PORT_LABELS)))).toEqual([40, 30]);
  });

  it('resets the node container origin', () => {
    const context = cellSystemContext(constrainNone);
    context.nodeContainer.getCellRectangle().x = 7;
    context.nodeContainer.getCellRectangle().y = 9;
    NodeSizeCalculator.setNodeWidth(context);
    NodeSizeCalculator.setNodeHeight(context);
    const rect = context.nodeContainer.getCellRectangle();
    expect([rect.x, rect.y]).toEqual([0, 0]);
  });

  it('uses the minimum size for {MINIMUM_SIZE}, with an empty cell system', () => {
    const context = sized((node) => {
      constrain(node, MINIMUM_SIZE);
      minimum(100, 60)(node);
    });
    expect(size(context)).toEqual([100, 60]);
    const rect = context.nodeContainer.getCellRectangle();
    expect([rect.width, rect.height]).toEqual([100, 60]);
  });

  it('lets the middle row contribute only height when the minimum size accounts for padding', () => {
    // The Java sets the middle row's height flag twice, so the width stays 0 (CellSystemConfigurator.java:121-122).
    // The center cell's minimum size 100x60 plus the label padding 5 + 5: height 70.
    const context = sized(
      (node) => {
        constrain(node, MINIMUM_SIZE);
        minimum(100, 60)(node);
        node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.MINIMUM_SIZE_ACCOUNTS_FOR_PADDING));
      },
      (c) => NodeLabelAndSizeUtilities.setupMinimumClientAreaSize(c),
    );
    expect(size(context)).toEqual([0, 70]);
  });

  describe('{PORTS}', () => {
    const portsNode = (portConstraints: PortConstraints) => (node: ElkNode) => {
      constrain(node, PORTS);
      node.setProperty(CoreOptions.PORT_CONSTRAINTS, portConstraints);
    };
    const portCells = (c: NodeContext) => {
      c.insidePortLabelCells.get(NORTH)!.getMinimumContentAreaSize().x = 50;
      c.insidePortLabelCells.get(EAST)!.getMinimumContentAreaSize().y = 20;
      c.insidePortLabelCells.get(WEST)!.getMinimumContentAreaSize().y = 35;
    };

    it('takes the width from the northern cell and the height from the taller of east and west (free)', () => {
      expect(size(sized(portsNode(PortConstraints.FREE), portCells))).toEqual([50, 35]);
    });

    it('applies the east and west heights manually for fixed port positions', () => {
      expect(size(sized(portsNode(PortConstraints.FIXED_POS), portCells))).toEqual([50, 35]);
    });

    it('applies the east and west heights manually for fixed port ratios', () => {
      expect(size(sized(portsNode(PortConstraints.FIXED_RATIO), portCells))).toEqual([50, 35]);
    });
  });

  describe('{NODE_LABELS}', () => {
    const labelled = (overhang: boolean) => (node: ElkNode) => {
      constrain(node, NODE_LABELS);
      node.setProperty(
        CoreOptions.NODE_SIZE_OPTIONS,
        overhang
          ? EnumSet.of(SizeOptions.ASYMMETRICAL, SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG)
          : EnumSet.of(SizeOptions.ASYMMETRICAL),
      );
      addLabel(node, 30, 10, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      addLabel(node, 80, 12, EnumSet.of(OUTSIDE, V_TOP, H_CENTER));
      addLabel(node, 7, 50, EnumSet.of(OUTSIDE, H_RIGHT, V_CENTER));
    };

    // inside container: 30 + 10 wide, 10 + 10 high; outside north 80 wide, outside east 50 high
    it('includes outside node labels in the node size', () => {
      expect(size(sized(labelled(false)))).toEqual([80, 50]);
    });

    it('leaves outside node labels out when they overhang', () => {
      expect(size(sized(labelled(true)))).toEqual([40, 20]);
    });
  });

  describe('{PORTS, PORT_LABELS, NODE_LABELS, MINIMUM_SIZE}', () => {
    const everything = (portConstraints: PortConstraints) => (node: ElkNode) => {
      constrain(node, PORTS, PORT_LABELS, NODE_LABELS, MINIMUM_SIZE);
      node.setProperty(CoreOptions.PORT_CONSTRAINTS, portConstraints);
      node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.ASYMMETRICAL));
      minimum(100, 10)(node);
      addLabel(node, 30, 10, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      addLabel(node, 80, 12, EnumSet.of(OUTSIDE, V_TOP, H_CENTER));
      addLabel(node, 7, 50, EnumSet.of(OUTSIDE, H_RIGHT, V_CENTER));
    };
    const portCells = (c: NodeContext) => {
      c.insidePortLabelCells.get(NORTH)!.getMinimumContentAreaSize().set(60, 8);
      c.insidePortLabelCells.get(EAST)!.getMinimumContentAreaSize().set(14, 70);
      c.insidePortLabelCells.get(WEST)!.getMinimumContentAreaSize().set(6, 18);
    };

    it('combines all contributions for free port placement', () => {
      // Oracle row allConstraints/free. width: ports 60, north label 80, minimum 100; height: 9 (north) + 70 (east) + 0
      // (the south cell has a zero-height content area, so ContainerCell.minHeightOfCell returns 0 although its padding
      // would give a non-zero getMinimumHeight: ContainerCell.java:92-96, AtomicCell.java:79-82) = 79; the south cell
      // thus starts at y 79 with height 0.
      const context = sized(everything(PortConstraints.FREE), portCells);
      expect(size(context)).toEqual([100, 79]);
      const rect = (cell: { getCellRectangle(): { y: number; height: number } }) => [
        cell.getCellRectangle().y,
        cell.getCellRectangle().height,
      ];
      expect(rect(context.insidePortLabelCells.get(NORTH)!)).toEqual([0, 9]);
      expect(rect(context.nodeContainerMiddleRow)).toEqual([9, 70]);
      expect(rect(context.insidePortLabelCells.get(SOUTH)!)).toEqual([79, 0]);
      expect(context.nodeContainerMiddleRow.getCellRectangle().width).toBe(100);
    });

    it('adds the east and west heights by hand for fixed port positions', () => {
      // cell system: 9 + 20 + 0 = 29; east labels 50; then the east cell's 70
      expect(size(sized(everything(PortConstraints.FIXED_POS), portCells))).toEqual([100, 70]);
    });
  });
});

describe('graph-level options', () => {
  const minimumTen = (node: ElkNode) => {
    constrain(node, MINIMUM_SIZE);
    minimum(10, 10)(node);
  };

  it('shrinks the node to the computed size by default', () => {
    expect(size(sized(minimumTen))).toEqual([10, 10]);
  });

  it('never shrinks below the current size with NODE_SIZE_FIXED_GRAPH_SIZE, but sizes the cell system', () => {
    const context = sized((node, root) => {
      minimumTen(node);
      root.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    });
    expect(size(context)).toEqual([40, 30]);
    const rect = context.nodeContainer.getCellRectangle();
    expect([rect.width, rect.height]).toEqual([10, 10]);
  });

  it('grows with NODE_SIZE_FIXED_GRAPH_SIZE if the computed size is larger', () => {
    const context = sized((node, root) => {
      constrain(node, MINIMUM_SIZE);
      minimum(100, 60)(node);
      root.setProperty(CoreOptions.NODE_SIZE_FIXED_GRAPH_SIZE, true);
    });
    expect(size(context)).toEqual([100, 60]);
  });

  it('starts from the current size in top-down layout', () => {
    const context = sized((node) => {
      minimumTen(node);
      node.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
    });
    expect(size(context)).toEqual([40, 30]);
  });
});
