// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import {
  NODE_HEIGHT,
  addPort,
  contextOf,
  loadLayoutMetaData,
  nodeFixture,
} from '../../../../../../test/helpers/node-context-fixtures.js';
import { KVector } from '../../../../../core/math/KVector.js';
import { CoreOptions } from '../../../../../core/options/CoreOptions.js';
import { PortLabelPlacement } from '../../../../../core/options/PortLabelPlacement.js';
import { PortSide } from '../../../../../core/options/PortSide.js';
import { SizeConstraint } from '../../../../../core/options/SizeConstraint.js';
import { SizeOptions } from '../../../../../core/options/SizeOptions.js';
import type { ElkNode } from '../../../../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../../../../graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import { AtomicCell } from '../../cellsystem/AtomicCell.js';
import { ContainerArea } from '../../cellsystem/ContainerArea.js';
import { GridContainerCell } from '../../cellsystem/GridContainerCell.js';
import type { NodeContext } from '../NodeContext.js';
import { NodeLabelAndSizeUtilities } from './NodeLabelAndSizeUtilities.js';
import { PortContextCreator } from './PortContextCreator.js';

const { NORTH, EAST, SOUTH, WEST } = PortSide;
const { MINIMUM_SIZE, PORTS, PORT_LABELS } = SizeConstraint;
const { DEFAULT_MINIMUM_SIZE, MINIMUM_SIZE_ACCOUNTS_FOR_PADDING, COMPUTE_PADDING, ASYMMETRICAL } = SizeOptions;

beforeAll(loadLayoutMetaData);

/** A context for a node configured by `configure`, with port contexts already created. */
function context(configure: (node: ElkNode) => void = () => {}): NodeContext {
  const result = contextOf(nodeFixture(configure));
  PortContextCreator.createPortContexts(result, false);
  return result;
}

function minimum(width: number, height: number): (node: ElkNode) => void {
  return (node) => node.setProperty(CoreOptions.NODE_SIZE_MINIMUM, new KVector(width, height));
}

function vector(v: KVector | null): number[] | null {
  return v === null ? null : [v.x, v.y];
}

describe('minimum size', () => {
  it('returns the configured minimum without regard for constraints, as a copy', () => {
    const c = context((node) => {
      minimum(30, 25)(node);
      node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.noneOf(SizeOptions));
    });
    const size = NodeLabelAndSizeUtilities.getMinimumNodeOrClientAreaSize(c);
    expect(vector(size)).toEqual([30, 25]);
    size.x = 1;
    expect(vector(NodeLabelAndSizeUtilities.getMinimumNodeOrClientAreaSize(c))).toEqual([30, 25]);
  });

  it('reverts non-positive components to the default minimum size when DEFAULT_MINIMUM_SIZE is set', () => {
    const withDefault = (width: number, height: number) =>
      vector(
        NodeLabelAndSizeUtilities.getMinimumNodeOrClientAreaSize(
          context((node) => {
            minimum(width, height)(node);
            node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(DEFAULT_MINIMUM_SIZE));
          }),
        ),
      );
    expect(withDefault(0, 25)).toEqual([20, 25]);
    expect(withDefault(30, -1)).toEqual([30, 20]);
    expect(withDefault(0, 0)).toEqual([20, 20]);
    expect(withDefault(30, 25)).toEqual([30, 25]);
  });

  it('keeps zero components without DEFAULT_MINIMUM_SIZE', () => {
    const c = context((node) => {
      minimum(0, 25)(node);
      node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.noneOf(SizeOptions));
    });
    expect(vector(NodeLabelAndSizeUtilities.getMinimumNodeOrClientAreaSize(c))).toEqual([0, 25]);
  });

  /** Context with MINIMUM_SIZE (or not) and the ACCOUNTS_FOR_PADDING option (or not). */
  function sized(constrained: boolean, accounts: boolean): NodeContext {
    return context((node) => {
      minimum(30, 25)(node);
      node.setProperty(
        CoreOptions.NODE_SIZE_CONSTRAINTS,
        constrained ? EnumSet.of(MINIMUM_SIZE) : EnumSet.noneOf(SizeConstraint),
      );
      node.setProperty(
        CoreOptions.NODE_SIZE_OPTIONS,
        accounts ? EnumSet.of(MINIMUM_SIZE_ACCOUNTS_FOR_PADDING) : EnumSet.noneOf(SizeOptions),
      );
    });
  }

  it('getMinimumNodeSize applies only with MINIMUM_SIZE and without ACCOUNTS_FOR_PADDING', () => {
    expect(vector(NodeLabelAndSizeUtilities.getMinimumNodeSize(sized(true, false)))).toEqual([30, 25]);
    expect(NodeLabelAndSizeUtilities.getMinimumNodeSize(sized(true, true))).toBeNull();
    expect(NodeLabelAndSizeUtilities.getMinimumNodeSize(sized(false, false))).toBeNull();
    expect(NodeLabelAndSizeUtilities.getMinimumNodeSize(sized(false, true))).toBeNull();
  });

  it('getMinimumClientAreaSize applies only with MINIMUM_SIZE and ACCOUNTS_FOR_PADDING', () => {
    expect(vector(NodeLabelAndSizeUtilities.getMinimumClientAreaSize(sized(true, true)))).toEqual([30, 25]);
    expect(NodeLabelAndSizeUtilities.getMinimumClientAreaSize(sized(true, false))).toBeNull();
    expect(NodeLabelAndSizeUtilities.getMinimumClientAreaSize(sized(false, true))).toBeNull();
    expect(NodeLabelAndSizeUtilities.getMinimumClientAreaSize(sized(false, false))).toBeNull();
  });

  it('setupMinimumClientAreaSize sets the center cell minimum size only when there is one', () => {
    const configured = sized(true, true);
    configured.insideNodeLabelContainer = new GridContainerCell(false, true, 0);
    configured.insideNodeLabelContainer.setOnlyCenterCellContributesToMinimumSize(true);
    NodeLabelAndSizeUtilities.setupMinimumClientAreaSize(configured);
    expect([
      configured.insideNodeLabelContainer.getMinimumWidth(),
      configured.insideNodeLabelContainer.getMinimumHeight(),
    ]).toEqual([30, 25]);

    const unconfigured = sized(true, false);
    unconfigured.insideNodeLabelContainer = new GridContainerCell(false, true, 0);
    unconfigured.insideNodeLabelContainer.setOnlyCenterCellContributesToMinimumSize(true);
    NodeLabelAndSizeUtilities.setupMinimumClientAreaSize(unconfigured);
    expect(unconfigured.insideNodeLabelContainer.getMinimumWidth()).toBe(0);
  });
});

describe('NodeLabelAndSizeUtilities.areSizeConstraintsFixed', () => {
  const fixed = (constraints: EnumSet<SizeConstraint>) =>
    NodeLabelAndSizeUtilities.areSizeConstraintsFixed(
      context((node) => node.setProperty(CoreOptions.NODE_SIZE_CONSTRAINTS, constraints)),
    );

  it('is true for no constraints and for PORT_LABELS alone', () => {
    expect(fixed(EnumSet.noneOf(SizeConstraint))).toBe(true);
    expect(fixed(EnumSet.of(PORT_LABELS))).toBe(true);
  });

  it('is false for any other constraints', () => {
    expect(fixed(EnumSet.of(PORTS))).toBe(false);
    expect(fixed(EnumSet.of(PORTS, PORT_LABELS))).toBe(false);
  });
});

describe('NodeLabelAndSizeUtilities.isFirstOutsidePortLabelPlacedDifferently', () => {
  function placed(placement: EnumSet<PortLabelPlacement>, eastPorts: number, side: PortSide = EAST): boolean {
    const c = context((node) => {
      node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, placement);
      for (let i = 0; i < eastPorts; i++) {
        addPort(node, EAST);
      }
    });
    return NodeLabelAndSizeUtilities.isFirstOutsidePortLabelPlacedDifferently(c, side);
  }
  const { OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE, ALWAYS_SAME_SIDE, SPACE_EFFICIENT } = PortLabelPlacement;

  it('is false for fewer than two ports', () => {
    expect(placed(EnumSet.of(OUTSIDE), 0)).toBe(false);
    expect(placed(EnumSet.of(OUTSIDE), 1)).toBe(false);
    expect(placed(EnumSet.of(OUTSIDE), 2, WEST)).toBe(false);
  });

  it('is true for exactly two ports whose labels are not next to them', () => {
    expect(placed(EnumSet.of(OUTSIDE), 2)).toBe(true);
  });

  it('is false for two ports when ALWAYS_SAME_SIDE is set', () => {
    expect(placed(EnumSet.of(OUTSIDE, ALWAYS_SAME_SIDE), 2)).toBe(false);
  });

  it('is false for two ports whose first label is placed next to it', () => {
    expect(placed(EnumSet.of(OUTSIDE, NEXT_TO_PORT_IF_POSSIBLE), 2)).toBe(false);
  });

  it('needs SPACE_EFFICIENT for three or more ports', () => {
    expect(placed(EnumSet.of(OUTSIDE), 3)).toBe(false);
    expect(placed(EnumSet.of(OUTSIDE, SPACE_EFFICIENT), 3)).toBe(true);
  });
});

describe('NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset', () => {
  function paddingOf(c: NodeContext): number[] {
    const { top, right, bottom, left } = c.nodeContainer.getPadding();
    return [top, right, bottom, left];
  }

  function offsetPorts(offsets: Array<[PortSide, number | null]>): NodeContext {
    return context((node) =>
      offsets.forEach(([side, offset]) => {
        const port = addPort(node, side);
        if (offset !== null) {
          port.setProperty(CoreOptions.PORT_BORDER_OFFSET, offset);
        }
      }),
    );
  }

  it('widens the padding on each side by the inward extent of ports with negative border offset', () => {
    const c = offsetPorts([
      [NORTH, -5],
      [SOUTH, -7],
      [EAST, -3],
      [WEST, -9],
      [NORTH, -2],
    ]);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(c);
    expect(paddingOf(c)).toEqual([5, 3, 7, 9]);
  });

  it('ignores ports with non-negative or unset border offsets', () => {
    const c = offsetPorts([
      [NORTH, 4],
      [SOUTH, 0],
      [EAST, null],
      [WEST, null],
    ]);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(c);
    expect(paddingOf(c)).toEqual([0, 0, 0, 0]);
  });

  /** One port with one label of size 10x6 at the given position, fixed port labels. */
  function fixedLabel(side: PortSide, x: number, y: number, offset: number | null, asymmetrical = false): NodeContext {
    return context((node) => {
      node.setProperty(CoreOptions.PORT_LABELS_PLACEMENT, PortLabelPlacement.fixed());
      if (asymmetrical) {
        node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(ASYMMETRICAL));
      }
      const port = addPort(node, side);
      if (offset !== null) {
        port.setProperty(CoreOptions.PORT_BORDER_OFFSET, offset);
      }
      const label = ElkGraphUtil.createLabel(port);
      label.setDimensions(10, 6);
      label.setLocation(x, y);
    });
  }

  it('makes room for the inside part of fixed labels and mirrors it when symmetric', () => {
    const north = fixedLabel(NORTH, 0, 1, null);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(north);
    expect(paddingOf(north)).toEqual([5, 0, 5, 0]);

    const south = fixedLabel(SOUTH, 0, -4, null);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(south);
    expect(paddingOf(south)).toEqual([4, 0, 4, 0]);

    const east = fixedLabel(EAST, -6, 0, null);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(east);
    expect(paddingOf(east)).toEqual([0, 6, 0, 6]);

    const west = fixedLabel(WEST, 1, 0, null);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(west);
    expect(paddingOf(west)).toEqual([0, 9, 0, 9]);
  });

  it('does not mirror the inside part of fixed labels when asymmetrical', () => {
    const north = fixedLabel(NORTH, 0, 1, null, true);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(north);
    expect(paddingOf(north)).toEqual([5, 0, 0, 0]);

    const south = fixedLabel(SOUTH, 0, -4, null, true);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(south);
    expect(paddingOf(south)).toEqual([0, 0, 4, 0]);

    const east = fixedLabel(EAST, -6, 0, null, true);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(east);
    expect(paddingOf(east)).toEqual([0, 6, 0, 0]);

    const west = fixedLabel(WEST, 1, 0, null, true);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(west);
    expect(paddingOf(west)).toEqual([0, 0, 0, 9]);
  });

  it('leaves the padding alone for fixed labels that lie outside the node', () => {
    const north = fixedLabel(NORTH, 0, -8, null);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(north);
    expect(paddingOf(north)).toEqual([0, 0, 0, 0]);
  });

  it('combines the border offset with the mirrored fixed label part', () => {
    const north = fixedLabel(NORTH, 0, 1, -3);
    NodeLabelAndSizeUtilities.setupNodePaddingForPortsWithOffset(north);
    expect(paddingOf(north)).toEqual([8, 0, 5, 0]);
  });
});

describe('NodeLabelAndSizeUtilities port and node application', () => {
  it('offsets southern ports by the node height and leaves other sides alone', () => {
    const c = context((node) => {
      addPort(node, SOUTH, 1, 0);
      addPort(node, SOUTH, 2, 5);
      addPort(node, NORTH, 3, 0);
    });
    NodeLabelAndSizeUtilities.offsetSouthernPortsByNodeSize(c);
    const positions = (side: PortSide) =>
      [...c.portContexts.get(side)].map((pc) => [pc.portPosition.x, pc.portPosition.y]);
    expect(positions(SOUTH)).toEqual([
      [2, 5 + NODE_HEIGHT],
      [1, NODE_HEIGHT],
    ]);
    expect(positions(NORTH)).toEqual([[3, 0]]);
  });

  it('applyStuff writes the node size and every port position', () => {
    const fixture = nodeFixture((node) => {
      addPort(node, NORTH, 1, 1);
      addPort(node, WEST, 2, 2);
    });
    const c = contextOf(fixture);
    PortContextCreator.createPortContexts(c, false);
    c.nodeSize.x = 70;
    c.nodeSize.y = 60;
    c.portContexts.values().forEach((pc, index) => pc.portPosition.set(10 + index, 20 + index));
    NodeLabelAndSizeUtilities.applyStuff(c);
    expect([fixture.node.getWidth(), fixture.node.getHeight()]).toEqual([70, 60]);
    // Oracle row applyStuff/north-west: ports [[10,20],[11,21]] in creation order. The NORTH port is created first and
    // portContexts iterates NORTH before WEST (NodeContext.java:250-252 orders sides by ordinal), so the NORTH
    // port gets index 0 (10, 20) and the WEST port index 1 (11, 21); applyStuff writes every context's position
    // (NodeLabelAndSizeUtilities.java:183-186).
    expect([...fixture.node.getPorts()].map((port) => [port.getX(), port.getY()])).toEqual([
      [10, 20],
      [11, 21],
    ]);
  });
});

describe('NodeLabelAndSizeUtilities.setNodePadding', () => {
  function computed(withOption: boolean): NodeContext {
    const c = context((node) => {
      if (withOption) {
        node.setProperty(CoreOptions.NODE_SIZE_OPTIONS, EnumSet.of(COMPUTE_PADDING));
      }
    });
    const grid = new GridContainerCell(false, true, 0);
    const center = new AtomicCell();
    center.setMinimumContentAreaSize(new KVector(1, 1), false);
    grid.setCell(ContainerArea.CENTER, ContainerArea.CENTER, center);
    grid.getCellRectangle().setRect(5, 6, 70, 50);
    grid.layoutChildrenHorizontally();
    grid.layoutChildrenVertically();
    c.insideNodeLabelContainer = grid;
    c.nodeContainer.getCellRectangle().setRect(0, 0, 100, 80);
    return c;
  }

  it('does nothing without COMPUTE_PADDING', () => {
    const c = computed(false);
    NodeLabelAndSizeUtilities.setNodePadding(c);
    expect(c.node.hasProperty(CoreOptions.PADDING)).toBe(false);
  });

  it('stores the distances between the node rectangle and the client area as the node padding', () => {
    const c = computed(true);
    NodeLabelAndSizeUtilities.setNodePadding(c);
    const padding = c.node.getPadding();
    expect([padding.top, padding.right, padding.bottom, padding.left]).toEqual([6, 25, 24, 5]);
  });
});
