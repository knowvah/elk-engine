// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  addPort,
  contextOf,
  loadLayoutMetaData,
  nodeFixture,
} from '../../../../../test/helpers/node-context-fixtures.js';
import { ElkMargin } from '../../../../core/math/ElkMargin.js';
import { ElkPadding } from '../../../../core/math/ElkPadding.js';
import { CoreOptions } from '../../../../core/options/CoreOptions.js';
import { NodeLabelPlacement } from '../../../../core/options/NodeLabelPlacement.js';
import { PortAlignment } from '../../../../core/options/PortAlignment.js';
import { PortConstraints } from '../../../../core/options/PortConstraints.js';
import { PortLabelPlacement } from '../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../core/options/SizeOptions.js';
import { UnsupportedConfigurationException } from '../../../../core/UnsupportedConfigurationException.js';
import { IndividualSpacings } from '../../../../core/util/IndividualSpacings.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { ContainerArea } from '../cellsystem/ContainerArea.js';
import { NodeContext } from './NodeContext.js';
import { PortContext } from './PortContext.js';

const { NORTH, EAST, SOUTH, WEST, UNDEFINED } = PortSide;

beforeAll(loadLayoutMetaData);

describe('NodeContext construction defaults', () => {
  it('copies the node and its size', () => {
    const fixture = nodeFixture();
    const context = contextOf(fixture);
    expect(context.node).toBe(fixture.nodeAdapter);
    expect([context.nodeSize.x, context.nodeSize.y]).toEqual([NODE_WIDTH, NODE_HEIGHT]);
    context.nodeSize.x = 99;
    expect(fixture.node.getWidth()).toBe(NODE_WIDTH);
  });

  it('reads the default option values', () => {
    const context = contextOf(nodeFixture());
    expect(context.topdownLayout).toBe(false);
    expect(context.treatAsCompoundNode).toBe(false);
    expect(context.sizeConstraints.isEmpty()).toBe(true);
    expect(String(context.sizeOptions)).toBe('[DEFAULT_MINIMUM_SIZE]');
    expect(context.portConstraints).toBe(PortConstraints.UNDEFINED);
    expect(String(context.portLabelsPlacement)).toBe('[OUTSIDE]');
    expect(context.portLabelsTreatAsGroup).toBe(true);
    expect(context.nodeLabelPlacement.isEmpty()).toBe(true);
    expect(context.nodeLabelsPadding).toEqual(new ElkPadding(5));
    expect(context.nodeLabelSpacing).toBe(5);
    expect(context.labelLabelSpacing).toBe(0);
    expect(context.labelCellSpacing).toBe(0);
    expect(context.portPortSpacing).toBe(10);
    expect(context.portLabelSpacingHorizontal).toBe(1);
    expect(context.portLabelSpacingVertical).toBe(1);
    expect(context.surroundingPortMargins).toEqual(new ElkMargin(0));
  });

  it('creates the main cells and leaves the others empty', () => {
    const context = contextOf(nodeFixture());
    expect(context.nodeContainer.getCell(ContainerArea.CENTER)).toBe(context.nodeContainerMiddleRow);
    expect(context.insidePortLabelCells.size).toBe(0);
    expect(context.outsideNodeLabelContainers.size).toBe(0);
    expect(context.nodeLabelCells.size).toBe(0);
    expect(context.portContexts.isEmpty()).toBe(true);
  });
});

describe('NodeContext construction with explicit values', () => {
  it('reads the flags and enum options set on the node', () => {
    const context = contextOf(
      nodeFixture((node) => {
        node.setProperty(CoreOptions.TOPDOWN_LAYOUT, true);
        node.setProperty(
          CoreOptions.NODE_SIZE_CONSTRAINTS,
          EnumSet.of(SizeConstraint.PORTS, SizeConstraint.MINIMUM_SIZE),
        );
        node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(SizeOptions.ASYMMETRICAL));
        node.setProperty(CoreOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
        node.setProperty(
          CoreOptions.PORT_LABELS_PLACEMENT,
          EnumSet.of(PortLabelPlacement.INSIDE, PortLabelPlacement.NEXT_TO_PORT_IF_POSSIBLE),
        );
        node.setProperty(CoreOptions.PORT_LABELS_TREAT_AS_GROUP, false);
        node.setProperty(CoreOptions.NODE_LABELS_PLACEMENT, NodeLabelPlacement.insideTopLeft());
      }),
    );
    expect(context.topdownLayout).toBe(true);
    expect(String(context.sizeConstraints)).toBe('[PORTS, MINIMUM_SIZE]');
    expect(String(context.sizeOptions)).toBe('[ASYMMETRICAL]');
    expect(context.portConstraints).toBe(PortConstraints.FIXED_ORDER);
    expect(String(context.portLabelsPlacement)).toBe('[INSIDE, NEXT_TO_PORT_IF_POSSIBLE]');
    expect(context.portLabelsTreatAsGroup).toBe(false);
    expect(String(context.nodeLabelPlacement)).toBe('[H_LEFT, V_TOP, INSIDE]');
  });

  it('treats a node with children as compound', () => {
    const context = contextOf(nodeFixture((node) => ElkGraphUtil.createNode(node)));
    expect(context.treatAsCompoundNode).toBe(true);
  });

  it('treats a childless node with inside self loops as compound', () => {
    const context = contextOf(nodeFixture((node) => node.setProperty(CoreOptions.INSIDE_SELF_LOOPS_ACTIVATE, true)));
    expect(context.treatAsCompoundNode).toBe(true);
  });

  it('inherits spacings from the parent graph and doubles the label spacing for the cell spacing', () => {
    const context = contextOf(
      nodeFixture((_node, root) => {
        root.setProperty(CoreOptions.SPACING_LABEL_NODE, 7);
        root.setProperty(CoreOptions.SPACING_LABEL_LABEL, 3);
        root.setProperty(CoreOptions.SPACING_PORT_PORT, 12);
        root.setProperty(CoreOptions.SPACING_LABEL_PORT_HORIZONTAL, 4);
        root.setProperty(CoreOptions.SPACING_LABEL_PORT_VERTICAL, 6);
        root.setProperty(CoreOptions.NODE_LABELS_PADDING, new ElkPadding(1, 2, 3, 4));
        root.setProperty(CoreOptions.SPACING_PORTS_SURROUNDING, new ElkMargin(8));
      }),
    );
    expect(context.nodeLabelSpacing).toBe(7);
    expect(context.labelLabelSpacing).toBe(3);
    expect(context.labelCellSpacing).toBe(6);
    expect(context.portPortSpacing).toBe(12);
    expect(context.portLabelSpacingHorizontal).toBe(4);
    expect(context.portLabelSpacingVertical).toBe(6);
    expect(context.nodeLabelsPadding).toEqual(new ElkPadding(1, 2, 3, 4));
    expect(context.surroundingPortMargins).toEqual(new ElkMargin(8));
  });

  it('prefers the node individual spacings over the parent graph', () => {
    const context = contextOf(
      nodeFixture((node, root) => {
        root.setProperty(CoreOptions.SPACING_PORT_PORT, 12);
        const individual = new IndividualSpacings();
        individual.setProperty(CoreOptions.SPACING_PORT_PORT, 21);
        node.setProperty(CoreOptions.SPACING_INDIVIDUAL, individual);
      }),
    );
    expect(context.portPortSpacing).toBe(21);
  });
});

describe('NodeContext validation', () => {
  it('rejects an invalid port label placement with the set in the message', () => {
    const fixture = nodeFixture((node) =>
      node.setProperty(
        CoreOptions.PORT_LABELS_PLACEMENT,
        EnumSet.of(PortLabelPlacement.INSIDE, PortLabelPlacement.OUTSIDE),
      ),
    );
    expect(() => contextOf(fixture)).toThrowError(
      new UnsupportedConfigurationException('Invalid port label placement: [OUTSIDE, INSIDE]'),
    );
    expect(() => contextOf(fixture)).toThrow(UnsupportedConfigurationException);
  });

  it('rejects an invalid node label placement with the set in the message', () => {
    const fixture = nodeFixture((node) =>
      node.setProperty(
        CoreOptions.NODE_LABELS_PLACEMENT,
        EnumSet.of(NodeLabelPlacement.OUTSIDE, NodeLabelPlacement.INSIDE),
      ),
    );
    expect(() => contextOf(fixture)).toThrowError('Invalid node label placement: [INSIDE, OUTSIDE]');
    expect(() => contextOf(fixture)).toThrow(UnsupportedConfigurationException);
  });
});

describe('NodeContext.applyNodeSize', () => {
  it('writes the context size to the node and not before', () => {
    const fixture = nodeFixture();
    const context = contextOf(fixture);
    context.nodeSize.x = 55;
    context.nodeSize.y = 66;
    expect(fixture.node.getWidth()).toBe(NODE_WIDTH);
    context.applyNodeSize();
    expect([fixture.node.getWidth(), fixture.node.getHeight()]).toEqual([55, 66]);
  });
});

describe('NodeContext.getPortAlignment', () => {
  it('falls back to the default alignment when no side-specific alignment is set', () => {
    const context = contextOf(nodeFixture());
    for (const side of [NORTH, SOUTH, EAST, WEST]) {
      expect(context.getPortAlignment(side)).toBe(PortAlignment.DISTRIBUTED);
    }
  });

  it('returns the configured default alignment for sides without their own', () => {
    const context = contextOf(
      nodeFixture((node) => node.setProperty(CoreOptions.PORT_ALIGNMENT_DEFAULT, PortAlignment.END)),
    );
    expect(context.getPortAlignment(NORTH)).toBe(PortAlignment.END);
    expect(context.getPortAlignment(UNDEFINED)).toBe(PortAlignment.END);
  });

  it('returns the side-specific alignment for each side', () => {
    const context = contextOf(
      nodeFixture((node) => {
        node.setProperty(CoreOptions.PORT_ALIGNMENT_DEFAULT, PortAlignment.END);
        node.setProperty(CoreOptions.PORT_ALIGNMENT_NORTH, PortAlignment.BEGIN);
        node.setProperty(CoreOptions.PORT_ALIGNMENT_SOUTH, PortAlignment.CENTER);
        node.setProperty(CoreOptions.PORT_ALIGNMENT_EAST, PortAlignment.JUSTIFIED);
        node.setProperty(CoreOptions.PORT_ALIGNMENT_WEST, PortAlignment.BEGIN);
      }),
    );
    expect(context.getPortAlignment(NORTH)).toBe(PortAlignment.BEGIN);
    expect(context.getPortAlignment(SOUTH)).toBe(PortAlignment.CENTER);
    expect(context.getPortAlignment(EAST)).toBe(PortAlignment.JUSTIFIED);
    expect(context.getPortAlignment(WEST)).toBe(PortAlignment.BEGIN);
  });
});

describe('NodeContext comparators', () => {
  it('compares port sides by ordinal with Integer.compare results', () => {
    expect(NodeContext.comparePortSides(NORTH, SOUTH)).toBe(-1);
    expect(NodeContext.comparePortSides(WEST, EAST)).toBe(1);
    expect(NodeContext.comparePortSides(EAST, EAST)).toBe(0);
  });

  /** Port contexts for ports with the given sides and volatile ids. */
  function contextsFor(...specs: Array<[PortSide, number]>): { context: NodeContext; ports: PortContext[] } {
    const fixture = nodeFixture((node) => specs.forEach(([side]) => addPort(node, side)));
    const context = contextOf(fixture);
    const ports = [...fixture.nodeAdapter.getPorts()].map((port, index) => {
      port.setVolatileId(specs[index]![1]);
      return new PortContext(context, port);
    });
    return { context, ports };
  }

  it('orders different sides by side ordinal whatever the volatile ids', () => {
    const { ports } = contextsFor([EAST, 0], [NORTH, 9]);
    expect(NodeContext.comparePortContexts(ports[0]!, ports[1]!)).toBe(1);
    expect(NodeContext.comparePortContexts(ports[1]!, ports[0]!)).toBe(-1);
  });

  it('orders northern and eastern ports by ascending volatile id', () => {
    for (const side of [NORTH, EAST]) {
      const { ports } = contextsFor([side, 2], [side, 5], [side, 2]);
      expect(NodeContext.comparePortContexts(ports[0]!, ports[1]!)).toBe(-1);
      expect(NodeContext.comparePortContexts(ports[1]!, ports[0]!)).toBe(1);
      expect(NodeContext.comparePortContexts(ports[0]!, ports[2]!)).toBe(0);
    }
  });

  it('orders southern and western ports by descending volatile id', () => {
    for (const side of [SOUTH, WEST]) {
      const { ports } = contextsFor([side, 2], [side, 5], [side, 2]);
      expect(NodeContext.comparePortContexts(ports[0]!, ports[1]!)).toBe(1);
      expect(NodeContext.comparePortContexts(ports[1]!, ports[0]!)).toBe(-1);
      expect(NodeContext.comparePortContexts(ports[0]!, ports[2]!)).toBe(0);
    }
  });

  it('returns 0 for two ports without a side (the Java default arm, assert false at :277)', () => {
    const { ports } = contextsFor([UNDEFINED, 1], [UNDEFINED, 2]);
    expect(NodeContext.comparePortContexts(ports[0]!, ports[1]!)).toBe(0);
  });
});

describe('NodeContext.portContexts', () => {
  const ids = (context: NodeContext, side: PortSide): number[] =>
    [...context.portContexts.get(side)].map((pc) => pc.port.getVolatileId());

  it('sorts keys by side and values per side, ascending for north and east, descending for south and west', () => {
    const shuffled: Array<[PortSide, number]> = [
      [WEST, 3],
      [NORTH, 7],
      [SOUTH, 1],
      [EAST, 4],
      [NORTH, 2],
      [WEST, 8],
      [SOUTH, 6],
      [EAST, 0],
    ];
    const fixture = nodeFixture((node) => shuffled.forEach(([side]) => addPort(node, side)));
    const context = contextOf(fixture);
    fixture.nodeAdapter.getPorts().forEach((portAdapter, index) => {
      const [side, id] = shuffled[index]!;
      portAdapter.setVolatileId(id);
      context.portContexts.put(side, new PortContext(context, portAdapter));
    });
    expect(context.portContexts.keySet()).toEqual([NORTH, EAST, SOUTH, WEST]);
    expect(ids(context, NORTH)).toEqual([2, 7]);
    expect(ids(context, EAST)).toEqual([0, 4]);
    expect(ids(context, SOUTH)).toEqual([6, 1]);
    expect(ids(context, WEST)).toEqual([8, 3]);
  });

  it('collapses two ports with equal volatile ids on one side into one context (TreeSet semantics)', () => {
    const fixture = nodeFixture((node) => [NORTH, NORTH].forEach((side) => addPort(node, side)));
    const context = contextOf(fixture);
    const [first, second] = fixture.nodeAdapter.getPorts();
    first!.setVolatileId(4);
    second!.setVolatileId(4);
    const firstContext = new PortContext(context, first!);
    expect(context.portContexts.put(NORTH, firstContext)).toBe(true);
    expect(context.portContexts.put(NORTH, new PortContext(context, second!))).toBe(false);
    expect(context.portContexts.get(NORTH).size).toBe(1);
    expect([...context.portContexts.get(NORTH)][0]).toBe(firstContext);
  });
});
