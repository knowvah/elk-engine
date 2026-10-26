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
import type { Cell } from '../../cellsystem/Cell.js';
import type { NodeContext } from '../NodeContext.js';
import { NodeLabelLocation } from '../NodeLabelLocation.js';
import { CellSystemConfigurator } from './CellSystemConfigurator.js';

const { NORTH, SOUTH, EAST, WEST } = PortSide;
const { PORTS, PORT_LABELS, NODE_LABELS, MINIMUM_SIZE } = SizeConstraint;
const { INSIDE, OUTSIDE, V_TOP, H_LEFT, H_CENTER } = NodeLabelPlacement;

beforeAll(loadLayoutMetaData);

/** `[width, height]` contribution flags of a cell. */
function flags(cell: Cell | null | undefined): [boolean, boolean] {
  return [cell!.isContributingToMinimumWidth(), cell!.isContributingToMinimumHeight()];
}

/** The flags of N, S, E, W inside port label cells and of the middle row, in that order. */
function portFlags(context: NodeContext): Array<[boolean, boolean]> {
  return [
    flags(context.insidePortLabelCells.get(NORTH)),
    flags(context.insidePortLabelCells.get(SOUTH)),
    flags(context.insidePortLabelCells.get(EAST)),
    flags(context.insidePortLabelCells.get(WEST)),
    flags(context.nodeContainerMiddleRow),
  ];
}

const NONE: [boolean, boolean] = [false, false];
const configured = (configure: (node: ElkNode) => void): NodeContext => {
  const context = cellSystemContext(configure);
  CellSystemConfigurator.configureCellSystemSizeContributions(context);
  return context;
};

describe('configureCellSystemSizeContributions', () => {
  it('changes nothing for a fixed size (empty size constraints)', () => {
    const context = configured((node) => {
      constrainNone(node);
      addLabel(node, 10, 4, EnumSet.of(INSIDE, V_TOP, H_LEFT));
    });
    expect(portFlags(context)).toEqual([NONE, NONE, NONE, NONE, NONE]);
    expect(flags(context.insideNodeLabelContainer)).toEqual(NONE);
  });

  it('changes nothing for PORT_LABELS alone', () => {
    const context = configured((node) => constrain(node, PORT_LABELS));
    expect(portFlags(context)).toEqual([NONE, NONE, NONE, NONE, NONE]);
  });

  describe('PORTS', () => {
    it('makes N and S contribute width, E and W height, and the middle row height for free port placement', () => {
      const context = configured((node) => constrain(node, PORTS));
      expect(portFlags(context)).toEqual([
        [true, false],
        [true, false],
        [false, true],
        [false, true],
        [false, true],
      ]);
    });

    for (const portConstraints of [PortConstraints.FIXED_RATIO, PortConstraints.FIXED_POS]) {
      it(`leaves E, W and the middle row without height for ${portConstraints.name()}`, () => {
        const context = configured((node) => {
          constrain(node, PORTS);
          node.setProperty(CoreOptions.PORT_CONSTRAINTS, portConstraints);
        });
        expect(portFlags(context)).toEqual([[true, false], [true, false], NONE, NONE, NONE]);
      });
    }

    it('treats FIXED_SIDE and FIXED_ORDER as free', () => {
      for (const portConstraints of [PortConstraints.FIXED_SIDE, PortConstraints.FIXED_ORDER]) {
        const context = configured((node) => {
          constrain(node, PORTS);
          node.setProperty(CoreOptions.PORT_CONSTRAINTS, portConstraints);
        });
        expect(flags(context.nodeContainerMiddleRow)).toEqual([false, true]);
      }
    });

    it('adds port label contributions with PORT_LABELS: N and S height, E and W width, middle row width', () => {
      const context = configured((node) => constrain(node, PORTS, PORT_LABELS));
      expect(portFlags(context)).toEqual([
        [true, true],
        [true, true],
        [true, true],
        [true, true],
        [true, true],
      ]);
    });

    it('adds port label contributions with fixed ports too, but no height for E, W and the middle row', () => {
      const context = configured((node) => {
        constrain(node, PORTS, PORT_LABELS);
        node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
      });
      expect(portFlags(context)).toEqual([
        [true, true],
        [true, true],
        [true, false],
        [true, false],
        [true, false],
      ]);
    });
  });

  describe('NODE_LABELS', () => {
    const withLabels = (overhang: boolean) => (node: ElkNode) => {
      constrain(node, NODE_LABELS);
      node.setProperty(
        CoreOptions.NODE_SIZE_OPTIONS,
        overhang ? EnumSet.of(SizeOptions.OUTSIDE_NODE_LABELS_OVERHANG) : EnumSet.noneOf(SizeOptions),
      );
      addLabel(node, 10, 4, EnumSet.of(INSIDE, V_TOP, H_LEFT));
      addLabel(node, 10, 4, EnumSet.of(OUTSIDE, V_TOP, H_CENTER));
    };

    it('makes the inside container, the middle row and all label cells contribute', () => {
      const context = configured(withLabels(false));
      expect(flags(context.insideNodeLabelContainer)).toEqual([true, true]);
      expect(flags(context.nodeContainerMiddleRow)).toEqual([true, true]);
      expect(flags(context.nodeLabelCells.get(NodeLabelLocation.IN_T_L))).toEqual([true, true]);
      expect(flags(context.nodeLabelCells.get(NodeLabelLocation.OUT_T_C))).toEqual([true, true]);
      expect(context.nodeLabelCells.size).toBe(2);
    });

    it('lets outside label cells overhang with OUTSIDE_NODE_LABELS_OVERHANG', () => {
      const context = configured(withLabels(true));
      expect(flags(context.nodeLabelCells.get(NodeLabelLocation.IN_T_L))).toEqual([true, true]);
      expect(flags(context.nodeLabelCells.get(NodeLabelLocation.OUT_T_C))).toEqual(NONE);
    });

    it('skips locations without a label cell', () => {
      const context = configured((node) => constrain(node, NODE_LABELS));
      expect(context.nodeLabelCells.size).toBe(0);
      expect(flags(context.insideNodeLabelContainer)).toEqual([true, true]);
    });
  });

  describe('MINIMUM_SIZE', () => {
    const accounting = (extra: SizeConstraint[]) => (node: ElkNode) => {
      constrain(node, MINIMUM_SIZE, ...extra);
      node.setProperty(
        CoreOptions.NODE_SIZE_OPTIONS,
        EnumSet.of(SizeOptions.MINIMUM_SIZE_ACCOUNTS_FOR_PADDING, SizeOptions.ASYMMETRICAL),
      );
      addLabel(node, 100, 10, EnumSet.of(INSIDE, V_TOP, H_LEFT));
    };

    /** Gives the label cell a flag of its own, and the center cell a 25x15 minimum size. */
    function prepare(context: NodeContext): void {
      context.nodeLabelCells.get(NodeLabelLocation.IN_T_L)!.setContributesToMinimumWidth(true);
      context.nodeLabelCells.get(NodeLabelLocation.IN_T_L)!.setContributesToMinimumHeight(true);
      context.insideNodeLabelContainer.setCenterCellMinimumSize(new KVector(25, 15));
    }

    it('does nothing without MINIMUM_SIZE_ACCOUNTS_FOR_PADDING', () => {
      const context = configured((node) => constrain(node, MINIMUM_SIZE));
      expect(flags(context.nodeContainerMiddleRow)).toEqual(NONE);
      expect(flags(context.insideNodeLabelContainer)).toEqual(NONE);
    });

    it('does nothing without MINIMUM_SIZE', () => {
      const context = configured((node) => {
        constrain(node, PORT_LABELS);
        node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.MINIMUM_SIZE_ACCOUNTS_FOR_PADDING));
      });
      expect(flags(context.nodeContainerMiddleRow)).toEqual(NONE);
    });

    it('makes the middle row contribute height only (the Java sets the height flag twice)', () => {
      const context = configured(accounting([]));
      expect(flags(context.nodeContainerMiddleRow)).toEqual([false, true]);
    });

    it('limits the inside label container to its center cell when node labels are not regarded', () => {
      const context = cellSystemContext(accounting([]));
      prepare(context);
      CellSystemConfigurator.configureCellSystemSizeContributions(context);
      expect(flags(context.insideNodeLabelContainer)).toEqual([true, true]);
      // only the center cell's minimum size (25) counts, plus the default node label padding (5 + 5)
      expect(context.insideNodeLabelContainer.getMinimumWidth()).toBe(35);
      expect(context.insideNodeLabelContainer.getMinimumHeight()).toBe(25);
    });

    it('keeps the label cells in play when node labels are regarded', () => {
      const context = cellSystemContext(accounting([NODE_LABELS]));
      prepare(context);
      CellSystemConfigurator.configureCellSystemSizeContributions(context);
      // BEGIN row: columns [100, 25 (center minimum), 0] = 125, plus padding 10; rows [10, 15, 0] = 25, plus 10
      expect(context.insideNodeLabelContainer.getMinimumWidth()).toBe(135);
      expect(context.insideNodeLabelContainer.getMinimumHeight()).toBe(35);
    });
  });
});

describe('updateVerticalInsidePortLabelCellPadding', () => {
  /** N cell: content height 10 + padding top 1 = 11; S: content 6 + padding bottom 1 = 7; spacing 4; node 3 / 2. */
  function context(portConstraints: PortConstraints, east: [number, number], west: [number, number]): NodeContext {
    const result = cellSystemContext((node, root) => {
      node.setProperty(CoreOptions.PORT_CONSTRAINTS, portConstraints);
      root.setProperty(CoreOptions.SPACING_LABEL_LABEL, 2);
    });
    result.insidePortLabelCells.get(NORTH)!.getMinimumContentAreaSize().y = 10;
    result.insidePortLabelCells.get(SOUTH)!.getMinimumContentAreaSize().y = 6;
    result.nodeContainer.getPadding().top = 3;
    result.nodeContainer.getPadding().bottom = 2;
    result.insidePortLabelCells.get(EAST)!.getPadding().set(east[0], 0, east[1], 0);
    result.insidePortLabelCells.get(WEST)!.getPadding().set(west[0], 0, west[1], 0);
    return result;
  }

  function paddings(c: NodeContext): number[] {
    return [EAST, WEST].flatMap((side) => {
      const p = c.insidePortLabelCells.get(side)!.getPadding();
      return [p.top, p.bottom];
    });
  }

  it('sets both cells to the larger required top and bottom padding (free ports)', () => {
    // topBorderOffset = 3 + 11 + 4 = 18; bottomBorderOffset = 2 + 7 + 4 = 13
    // top = max(0, 20 - 18, 25 - 18) = 7; bottom = max(0, 10 - 13, 15 - 13) = 2
    const c = context(PortConstraints.FREE, [20, 10], [25, 15]);
    CellSystemConfigurator.updateVerticalInsidePortLabelCellPadding(c);
    expect(paddings(c)).toEqual([7, 2, 7, 2]);
  });

  it('takes the east padding if it is the larger one', () => {
    // top = max(0, 30 - 18 = 12, 19 - 18 = 1) = 12; bottom = max(0, 20 - 13 = 7, 14 - 13 = 1) = 7
    const c = context(PortConstraints.FIXED_SIDE, [30, 20], [19, 14]);
    CellSystemConfigurator.updateVerticalInsidePortLabelCellPadding(c);
    expect(paddings(c)).toEqual([12, 7, 12, 7]);
  });

  it('never goes below zero', () => {
    const c = context(PortConstraints.UNDEFINED, [5, 5], [4, 4]);
    CellSystemConfigurator.updateVerticalInsidePortLabelCellPadding(c);
    expect(paddings(c)).toEqual([0, 0, 0, 0]);
  });

  for (const portConstraints of [PortConstraints.FIXED_RATIO, PortConstraints.FIXED_POS]) {
    it(`leaves the paddings alone for ${portConstraints.name()}`, () => {
      const c = context(portConstraints, [20, 10], [25, 15]);
      CellSystemConfigurator.updateVerticalInsidePortLabelCellPadding(c);
      expect(paddings(c)).toEqual([20, 10, 25, 15]);
    });
  }
});
