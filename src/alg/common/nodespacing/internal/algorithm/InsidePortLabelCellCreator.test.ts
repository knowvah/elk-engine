// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addLabel } from '../../../../../../test/helpers/cell-creator-fixtures.js';
import {
  addPort,
  contextOf,
  loadLayoutMetaData,
  nodeFixture,
} from '../../../../../../test/helpers/node-context-fixtures.js';
import { ElkMargin } from '../../../../../core/math/ElkMargin.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import type { ElkNode } from '../../../../../graph/ElkNode.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import { AtomicCell } from '../../cellsystem/AtomicCell.js';
import { ContainerArea } from '../../cellsystem/ContainerArea.js';
import type { NodeContext } from '../NodeContext.js';
import { InsidePortLabelCellCreator } from './InsidePortLabelCellCreator.js';
import { PortContextCreator } from './PortContextCreator.js';

const { NORTH, SOUTH, EAST, WEST } = PortSide;

beforeAll(loadLayoutMetaData);

function created(
  configure: (node: ElkNode, root: ElkNode) => void = () => {},
  ignoreInsidePortLabels = false,
): NodeContext {
  const context = contextOf(nodeFixture(configure));
  PortContextCreator.createPortContexts(context, ignoreInsidePortLabels);
  InsidePortLabelCellCreator.createInsidePortLabelCells(context);
  return context;
}

function padding(context: NodeContext, side: PortSide): number[] {
  const p = context.insidePortLabelCells.get(side)!.getPadding();
  return [p.top, p.right, p.bottom, p.left];
}

const insideLabels = (node: ElkNode) =>
  node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, EnumSet.of(PortLabelPlacement.INSIDE));

describe('cell creation', () => {
  it('places one atomic cell per side in the node container and middle row', () => {
    const context = created();
    const cell = (side: PortSide) => context.insidePortLabelCells.get(side);
    for (const side of [NORTH, SOUTH, EAST, WEST]) {
      expect(cell(side)).toBeInstanceOf(AtomicCell);
    }
    expect(context.nodeContainer.getCell(ContainerArea.BEGIN)).toBe(cell(NORTH));
    expect(context.nodeContainer.getCell(ContainerArea.END)).toBe(cell(SOUTH));
    expect(context.nodeContainerMiddleRow.getCell(ContainerArea.BEGIN)).toBe(cell(WEST));
    expect(context.nodeContainerMiddleRow.getCell(ContainerArea.END)).toBe(cell(EAST));
    expect(context.insidePortLabelCells.size).toBe(4);
  });
});

describe('north and south paddings', () => {
  it('uses the vertical port label spacing (default 1) as top padding north and bottom padding south', () => {
    const context = created();
    expect(padding(context, NORTH)).toEqual([1, 0, 0, 0]);
    expect(padding(context, SOUTH)).toEqual([0, 0, 1, 0]);
  });

  it('does not use a negative vertical port label spacing as padding', () => {
    const context = created((_node, root) => root.setProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL, -3));
    expect(padding(context, NORTH)).toEqual([0, 0, 0, 0]);
    expect(padding(context, SOUTH)).toEqual([0, 0, 0, 0]);
  });

  it('accepts a vertical spacing of zero', () => {
    const context = created((_node, root) => root.setProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL, 0));
    expect(padding(context, NORTH)).toEqual([0, 0, 0, 0]);
  });

  it('copies the left and right surrounding port margins; east and west get top and bottom', () => {
    const context = created((_node, root) =>
      root.setProperty(CoreOptions.SPACING_PORTS_SURROUNDING, new ElkMargin(2, 3, 4, 5)),
    );
    expect(padding(context, NORTH)).toEqual([1, 3, 0, 5]);
    expect(padding(context, SOUTH)).toEqual([0, 3, 1, 5]);
    expect(padding(context, EAST)).toEqual([2, 0, 4, 0]);
    expect(padding(context, WEST)).toEqual([2, 0, 4, 0]);
  });

  it('skips the margins if the node has no surrounding port margins', () => {
    const context = contextOf(nodeFixture());
    (context as { surroundingPortMargins: unknown }).surroundingPortMargins = null;
    PortContextCreator.createPortContexts(context, false);
    InsidePortLabelCellCreator.createInsidePortLabelCells(context);
    expect(padding(context, NORTH)).toEqual([1, 0, 0, 0]);
    expect(padding(context, EAST)).toEqual([0, 0, 0, 0]);
  });
});

describe('east and west widths due to inside labels', () => {
  const withLabels = (node: ElkNode, root: ElkNode) => {
    insideLabels(node);
    root.setProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL, 3);
    addLabel(addPort(node, EAST), 12, 5);
    addLabel(addPort(node, EAST), 7, 5);
    addLabel(addPort(node, WEST), 9, 5);
  };

  it('sizes the east and west cells to the widest label and pads the port side', () => {
    const context = created(withLabels);
    expect(padding(context, EAST)).toEqual([0, 3, 0, 0]);
    expect(padding(context, WEST)).toEqual([0, 0, 0, 3]);
    expect(context.insidePortLabelCells.get(EAST)!.getMinimumWidth()).toBe(15);
    expect(context.insidePortLabelCells.get(WEST)!.getMinimumWidth()).toBe(12);
  });

  it('adds no padding to a side without labels', () => {
    const context = created((node, root) => {
      insideLabels(node);
      root.setProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL, 3);
      addLabel(addPort(node, EAST), 12, 5);
      addPort(node, WEST);
    });
    expect(padding(context, EAST)).toEqual([0, 3, 0, 0]);
    expect(padding(context, WEST)).toEqual([0, 0, 0, 0]);
    expect(context.insidePortLabelCells.get(WEST)!.getMinimumWidth()).toBe(0);
  });

  it('adds no horizontal padding if the labels have no width', () => {
    const context = created((node) => {
      insideLabels(node);
      addLabel(addPort(node, EAST), 0, 5);
    });
    expect(padding(context, EAST)).toEqual([0, 0, 0, 0]);
  });

  it('ignores ports without a label cell', () => {
    const context = created((node) => {
      insideLabels(node);
      addLabel(addPort(node, EAST), 12, 5);
    }, true);
    expect(padding(context, EAST)).toEqual([0, 0, 0, 0]);
    expect(context.insidePortLabelCells.get(EAST)!.getMinimumWidth()).toBe(0);
  });

  it('does not size for outside port labels', () => {
    const context = created((node) => {
      addLabel(addPort(node, EAST), 12, 5);
    });
    expect(padding(context, EAST)).toEqual([0, 0, 0, 0]);
  });
});
