// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import {
  addPort,
  contextOf,
  loadLayoutMetaData,
  nodeFixture,
} from '../../../../../../test/helpers/node-context-fixtures.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { ElkGraphUtil } from '../../../../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../../../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import type { NodeContext } from '../NodeContext.js';
import { PortContextCreator } from './PortContextCreator.js';

const { NORTH, EAST, SOUTH, WEST, UNDEFINED } = PortSide;

beforeAll(loadLayoutMetaData);

function idsOn(context: NodeContext, side: PortSide): number[] {
  return [...context.portContexts.get(side)].map((portContext) => portContext.port.getVolatileId());
}

describe('PortContextCreator.createPortContexts', () => {
  it('numbers ports in node order and sorts each side by the Java comparator', () => {
    const sides = [WEST, NORTH, SOUTH, EAST, NORTH, WEST, SOUTH, EAST];
    const fixture = nodeFixture((node) => sides.forEach((side) => addPort(node, side)));
    const context = contextOf(fixture);
    PortContextCreator.createPortContexts(context, false);
    expect(fixture.nodeAdapter.getPorts().map((port) => port.getVolatileId())).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(context.portContexts.keySet()).toEqual([NORTH, EAST, SOUTH, WEST]);
    expect(idsOn(context, NORTH)).toEqual([1, 4]);
    expect(idsOn(context, EAST)).toEqual([3, 7]);
    expect(idsOn(context, SOUTH)).toEqual([6, 2]);
    expect(idsOn(context, WEST)).toEqual([5, 0]);
  });

  it('keeps two ports on one side apart because their volatile ids differ', () => {
    const fixture = nodeFixture((node) => [NORTH, NORTH].forEach((side) => addPort(node, side)));
    const context = contextOf(fixture);
    PortContextCreator.createPortContexts(context, false);
    expect(context.portContexts.get(NORTH).size).toBe(2);
  });

  it('refuses ports without a side', () => {
    const fixture = nodeFixture((node) => addPort(node, UNDEFINED));
    const context = contextOf(fixture);
    expect(() => PortContextCreator.createPortContexts(context, false)).toThrow(IllegalArgumentException);
    expect(() => PortContextCreator.createPortContexts(context, false)).toThrowError(
      'Label and node size calculator can only be used with ports that have port sides assigned.',
    );
  });

  describe('port label cells', () => {
    function withLabels(placement: EnumSet<PortLabelPlacement>): NodeContext {
      const fixture = nodeFixture((node, root) => {
        root.setProperty(CoreOptions.SPACING_LABEL_LABEL, 4);
        node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, placement);
        const port = addPort(node, EAST);
        ElkGraphUtil.createLabel(port).setDimensions(30, 10);
        ElkGraphUtil.createLabel(port).setDimensions(50, 20);
        addPort(node, WEST);
      });
      return contextOf(fixture);
    }

    it('collects the labels of each port into a cell using the label-label spacing', () => {
      const context = withLabels(PortLabelPlacement.outside());
      PortContextCreator.createPortContexts(context, false);
      const withLabelsCell = [...context.portContexts.get(EAST)][0]!.portLabelCell!;
      expect([withLabelsCell.hasLabels(), withLabelsCell.getMinimumWidth(), withLabelsCell.getMinimumHeight()]).toEqual(
        [true, 50, 34],
      );
      const emptyCell = [...context.portContexts.get(WEST)][0]!.portLabelCell!;
      expect(emptyCell.hasLabels()).toBe(false);
    });

    it('creates no cell for fixed port labels', () => {
      const context = withLabels(PortLabelPlacement.fixed());
      PortContextCreator.createPortContexts(context, false);
      expect(context.portContexts.values().map((portContext) => portContext.portLabelCell)).toEqual([null, null]);
    });

    it('creates no cell for inside labels when told to ignore them, but one for outside labels', () => {
      const inside = withLabels(PortLabelPlacement.inside());
      PortContextCreator.createPortContexts(inside, true);
      expect(inside.portContexts.values().map((portContext) => portContext.portLabelCell)).toEqual([null, null]);
      const outside = withLabels(PortLabelPlacement.outside());
      PortContextCreator.createPortContexts(outside, true);
      expect(outside.portContexts.values().every((portContext) => portContext.portLabelCell !== null)).toBe(true);
    });

    it('creates cells for inside labels when not ignoring them', () => {
      const inside = withLabels(PortLabelPlacement.inside());
      PortContextCreator.createPortContexts(inside, false);
      expect(inside.portContexts.values().every((portContext) => portContext.portLabelCell !== null)).toBe(true);
    });
  });
});
