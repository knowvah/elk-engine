// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { EXTERNAL_PORT_ROWS } from '../../../../test/helpers/lgraph-site-external-tables.js';
import { xy } from '../../../../test/helpers/lgraph-site-shapes.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../core/math/KVector.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EdgeConstraint } from '../options/EdgeConstraint.js';
import { InLayerConstraint } from '../options/InLayerConstraint.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayerConstraint } from '../options/LayerConstraint.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LGraph } from './LGraph.js';
import {
  createExternalPortDummy,
  type ExternalPortDummyArgs,
  getExternalPortPosition,
} from './LGraphUtilExternalPorts.js';
import { LNode } from './LNode.js';
import { NodeType } from './LNodeNodeType.js';
import { LPort } from './LPort.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

const PORT_WIDTH = 4;
const PORT_HEIGHT = 6;

function args(overrides: Partial<ExternalPortDummyArgs> = {}): ExternalPortDummyArgs {
  return {
    propertyHolder: new LPort(),
    portConstraints: PortConstraints.FIXED_SIDE,
    portSide: PortSide.WEST,
    netFlow: 0,
    portNodeSize: new KVector(1, 1),
    portPosition: new KVector(),
    portSize: new KVector(PORT_WIDTH, PORT_HEIGHT),
    layoutDirection: Direction.RIGHT,
    layeredGraph: new LGraph(),
    ...overrides,
  };
}

describe('createExternalPortDummy: common structure', () => {
  it('creates an external-port dummy in the graph with a single port and fixed port positions', () => {
    const graph = new LGraph();
    const dummy = createExternalPortDummy(args({ layeredGraph: graph }));
    expect(dummy.getType()).toBe(NodeType.EXTERNAL_PORT);
    expect(dummy.getGraph()).toBe(graph);
    expect(graph.getLayerlessNodes()).toEqual([]);
    expect(dummy.getPorts().length).toBe(1);
    expect(dummy.getPorts()[0]!.getNode()).toBe(dummy);
    expect(dummy.getProperty(LayeredOptions.PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_POS);
  });

  it('remembers the external port size and side, and copies the border offset', () => {
    const holder = new LPort();
    holder.setProperty(LayeredOptions.PORT_BORDER_OFFSET, -3);
    const dummy = createExternalPortDummy(args({ propertyHolder: holder, portSide: PortSide.NORTH }));
    const size = dummy.getProperty(InternalProperties.EXT_PORT_SIZE);
    expect([size.x, size.y]).toEqual([PORT_WIDTH, PORT_HEIGHT]);
    expect(dummy.getProperty(InternalProperties.EXT_PORT_SIDE)).toBe(PortSide.NORTH);
    expect(dummy.getProperty(LayeredOptions.PORT_BORDER_OFFSET)).toBe(-3);
  });

  it('leaves the port side of a fixed-side holder alone', () => {
    const holder = new LPort();
    createExternalPortDummy(args({ propertyHolder: holder }));
    expect(holder.getAllProperties().containsKey(LayeredOptions.PORT_SIDE)).toBe(false);
  });
});

describe('createExternalPortDummy: side-specific properties', () => {
  it('WEST: first-separate layer, outgoing-only edges, the port on the east side, dummy height from the port', () => {
    const dummy = createExternalPortDummy(args({ portSide: PortSide.WEST }));
    expect(dummy.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)).toBe(LayerConstraint.FIRST_SEPARATE);
    expect(dummy.getProperty(InternalProperties.EDGE_CONSTRAINT)).toBe(EdgeConstraint.OUTGOING_ONLY);
    expect(dummy.getPorts()[0]!.getSide()).toBe(PortSide.EAST);
    expect(dummy.getSize().y).toBe(PORT_HEIGHT);
    expect(dummy.getProperty(InternalProperties.EXT_PORT_SIDE)).toBe(PortSide.WEST);
  });

  it('EAST: last-separate layer, incoming-only edges, the port on the west side, dummy height from the port', () => {
    const dummy = createExternalPortDummy(args({ portSide: PortSide.EAST }));
    expect(dummy.getProperty(LayeredOptions.LAYERING_LAYER_CONSTRAINT)).toBe(LayerConstraint.LAST_SEPARATE);
    expect(dummy.getProperty(InternalProperties.EDGE_CONSTRAINT)).toBe(EdgeConstraint.INCOMING_ONLY);
    expect(dummy.getPorts()[0]!.getSide()).toBe(PortSide.WEST);
    expect(dummy.getSize().y).toBe(PORT_HEIGHT);
  });

  it('NORTH: top in-layer constraint, the port on the south side, dummy width from the port', () => {
    const dummy = createExternalPortDummy(args({ portSide: PortSide.NORTH }));
    expect(dummy.getProperty(InternalProperties.IN_LAYER_CONSTRAINT)).toBe(InLayerConstraint.TOP);
    expect(dummy.getProperty(InternalProperties.EDGE_CONSTRAINT)).toBe(EdgeConstraint.NONE);
    expect(dummy.getPorts()[0]!.getSide()).toBe(PortSide.SOUTH);
    expect(dummy.getSize().x).toBe(PORT_WIDTH);
  });

  it('SOUTH: bottom in-layer constraint, the port on the north side, dummy width from the port', () => {
    const dummy = createExternalPortDummy(args({ portSide: PortSide.SOUTH }));
    expect(dummy.getProperty(InternalProperties.IN_LAYER_CONSTRAINT)).toBe(InLayerConstraint.BOTTOM);
    expect(dummy.getPorts()[0]!.getSide()).toBe(PortSide.NORTH);
    expect(dummy.getSize().x).toBe(PORT_WIDTH);
  });

  it('sets no layer or in-layer constraint for a side that is not WEST/EAST/NORTH/SOUTH', () => {
    const dummy = createExternalPortDummy(args({ portSide: PortSide.UNDEFINED }));
    expect(dummy.getAllProperties().containsKey(LayeredOptions.LAYERING_LAYER_CONSTRAINT)).toBe(false);
    expect(dummy.getAllProperties().containsKey(InternalProperties.IN_LAYER_CONSTRAINT)).toBe(false);
    expect(dummy.getPorts()[0]!.getSide()).toBe(PortSide.UNDEFINED);
  });

  it('a negative border offset gives the dummy an extent in the direction of the border', () => {
    for (const [side, extent] of [
      [PortSide.WEST, 'x'],
      [PortSide.EAST, 'x'],
      [PortSide.NORTH, 'y'],
      [PortSide.SOUTH, 'y'],
    ] as const) {
      const withOffset = new LPort();
      withOffset.setProperty(LayeredOptions.PORT_BORDER_OFFSET, -5);
      const dummy = createExternalPortDummy(args({ propertyHolder: withOffset, portSide: side }));
      expect(dummy.getSize()[extent]).toBeGreaterThan(0);
      const without = createExternalPortDummy(args({ portSide: side }));
      expect(without.getSize()[extent]).toBe(0);
    }
  });
});

describe('createExternalPortDummy: anchors', () => {
  it('remembers the anchor on the dummy and positions the dummy port with it', () => {
    const dummy = createExternalPortDummy(args({ portSide: PortSide.EAST }));
    const anchor = dummy.getProperty(LayeredOptions.PORT_ANCHOR);
    const dummyPort = dummy.getPorts()[0]!;
    expect([dummyPort.getPosition().x, dummyPort.getPosition().y]).toEqual([anchor.x, anchor.y]);
    expect(dummyPort.getPosition()).not.toBe(anchor);
  });

  it('uses an explicit PORT_ANCHOR of the holder', () => {
    const holder = new LPort();
    holder.setProperty(LayeredOptions.PORT_ANCHOR, new KVector(1, 2));
    const dummy = createExternalPortDummy(args({ propertyHolder: holder, portSide: PortSide.SOUTH }));
    // the SOUTH arm only touches the y coordinate when the anchor is not explicit
    const anchor = dummy.getProperty(LayeredOptions.PORT_ANCHOR);
    expect([anchor.x, anchor.y]).toEqual([1, 2]);
  });
});

describe('createExternalPortDummy: explicit anchors', () => {
  function withExplicitAnchor(side: PortSide): KVector {
    const holder = new LPort();
    holder.setProperty(LayeredOptions.PORT_ANCHOR, new KVector(1, 2));
    const dummy = createExternalPortDummy(args({ propertyHolder: holder, portSide: side }));
    return dummy.getProperty(LayeredOptions.PORT_ANCHOR);
  }

  it('applies an explicit anchor as given on EAST and SOUTH', () => {
    for (const side of [PortSide.EAST, PortSide.SOUTH]) {
      const anchor = withExplicitAnchor(side);
      expect([anchor.x, anchor.y]).toEqual([1, 2]);
    }
  });

  it('keeps the other coordinate of an explicit anchor on WEST (y) and NORTH (x)', () => {
    expect(withExplicitAnchor(PortSide.WEST).y).toBe(2);
    expect(withExplicitAnchor(PortSide.NORTH).x).toBe(1);
  });
});

describe('createExternalPortDummy: free port constraints', () => {
  it('sets PORT_SIDE on the holder from the layout direction and net flow', () => {
    const cases: [Direction, number, PortSide][] = [
      [Direction.RIGHT, 0, PortSide.fromDirection(Direction.RIGHT)],
      [Direction.RIGHT, 2, PortSide.fromDirection(Direction.RIGHT)],
      [Direction.RIGHT, -1, PortSide.fromDirection(Direction.RIGHT).opposed()],
      [Direction.DOWN, 1, PortSide.fromDirection(Direction.DOWN)],
      [Direction.DOWN, -1, PortSide.fromDirection(Direction.DOWN).opposed()],
    ];
    for (const [direction, netFlow, expected] of cases) {
      const holder = new LPort();
      const dummy = createExternalPortDummy(
        args({
          propertyHolder: holder,
          portConstraints: PortConstraints.FREE,
          portSide: PortSide.UNDEFINED,
          netFlow,
          layoutDirection: direction,
        }),
      );
      expect(holder.getProperty(LayeredOptions.PORT_SIDE)).toBe(expected);
      expect(dummy.getProperty(InternalProperties.EXT_PORT_SIDE)).toBe(expected);
    }
  });
});

describe('createExternalPortDummy: order information', () => {
  function ordered(overrides: Partial<ExternalPortDummyArgs>): LNode {
    return createExternalPortDummy(args(overrides));
  }

  it('stores no ratio-or-position when the order is not fixed', () => {
    const dummy = ordered({ portConstraints: PortConstraints.FIXED_SIDE });
    expect(dummy.getAllProperties().containsKey(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(false);
  });

  it('stores the explicit port index for fixed order, positive on NORTH/EAST and negative on SOUTH/WEST', () => {
    const index = 3;
    for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST]) {
      const holder = new LPort();
      holder.setProperty(LayeredOptions.PORT_INDEX, index);
      const dummy = ordered({ propertyHolder: holder, portConstraints: PortConstraints.FIXED_ORDER, portSide: side });
      const stored = dummy.getProperty(InternalProperties.PORT_RATIO_OR_POSITION);
      if (side === PortSide.NORTH || side === PortSide.EAST) {
        expect(stored).toBe(index);
      } else {
        expect(stored).toBe(-index);
      }
    }
  });

  it('stores the port position for fixed order without an index, y on WEST/EAST and x on NORTH/SOUTH', () => {
    const position = new KVector(11, 22);
    for (const side of [PortSide.WEST, PortSide.EAST]) {
      const dummy = ordered({ portConstraints: PortConstraints.FIXED_ORDER, portSide: side, portPosition: position });
      expect(dummy.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(22);
    }
    for (const side of [PortSide.NORTH, PortSide.SOUTH]) {
      const dummy = ordered({ portConstraints: PortConstraints.FIXED_ORDER, portSide: side, portPosition: position });
      expect(dummy.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(11);
    }
  });

  it('stores the position for fixed position', () => {
    const position = new KVector(11, 22);
    const dummy = ordered({
      portConstraints: PortConstraints.FIXED_POS,
      portSide: PortSide.EAST,
      portPosition: position,
    });
    expect(dummy.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(22);
  });

  it('with fixed ratio the position is divided by the node size (a unit-size node leaves it unchanged)', () => {
    const position = new KVector(11, 22);
    const unit = new KVector(1, 1);
    const east = ordered({
      portConstraints: PortConstraints.FIXED_RATIO,
      portSide: PortSide.EAST,
      portPosition: position,
      portNodeSize: unit,
    });
    expect(east.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(22);
    const north = ordered({
      portConstraints: PortConstraints.FIXED_RATIO,
      portSide: PortSide.NORTH,
      portPosition: position,
      portNodeSize: unit,
    });
    expect(north.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(11);
  });

  it('an index is ignored unless the constraints are exactly FIXED_ORDER', () => {
    const holder = new LPort();
    holder.setProperty(LayeredOptions.PORT_INDEX, 3);
    const dummy = ordered({
      propertyHolder: holder,
      portConstraints: PortConstraints.FIXED_POS,
      portSide: PortSide.EAST,
      portPosition: new KVector(0, 22),
    });
    expect(dummy.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)).toBe(22);
  });
});

describe('getExternalPortPosition', () => {
  function positioned(side: PortSide): { graph: LGraph; dummy: LNode } {
    const graph = new LGraph();
    const dummy = addNode(graph, NodeType.EXTERNAL_PORT);
    dummy.setProperty(InternalProperties.EXT_PORT_SIDE, side);
    return { graph, dummy };
  }

  it('is the origin for an all-zero graph and dummy, on every side', () => {
    for (const side of [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH, PortSide.WEST, PortSide.UNDEFINED]) {
      const { graph, dummy } = positioned(side);
      const position = getExternalPortPosition(graph, dummy, 0, 0);
      expect([Math.abs(position.x), Math.abs(position.y)]).toEqual([0, 0]);
      expect([Math.abs(dummy.getPosition().x), Math.abs(dummy.getPosition().y)]).toEqual([0, 0]);
    }
  });

  it('returns a new vector, not the dummy position', () => {
    const { graph, dummy } = positioned(PortSide.UNDEFINED);
    expect(getExternalPortPosition(graph, dummy, 0, 0)).not.toBe(dummy.getPosition());
  });

  it('only moves the dummy coordinate perpendicular to the side', () => {
    const lonely = (side: PortSide): { graph: LGraph; dummy: LNode } => {
      const state = positioned(side);
      state.graph.getSize().x = 50;
      state.graph.getSize().y = 60;
      state.dummy.getPosition().x = 7;
      state.dummy.getPosition().y = 8;
      return state;
    };
    const north = lonely(PortSide.NORTH);
    getExternalPortPosition(north.graph, north.dummy, 0, 0);
    expect(north.dummy.getPosition().x).toBe(7);
    const west = lonely(PortSide.WEST);
    getExternalPortPosition(west.graph, west.dummy, 0, 0);
    expect(west.dummy.getPosition().y).toBe(8);
    const south = lonely(PortSide.SOUTH);
    getExternalPortPosition(south.graph, south.dummy, 0, 0);
    expect(south.dummy.getPosition().x).toBe(7);
    const east = lonely(PortSide.EAST);
    getExternalPortPosition(east.graph, east.dummy, 0, 0);
    expect(east.dummy.getPosition().y).toBe(8);
  });
});

describe('createExternalPortDummy and getExternalPortPosition (oracle rows)', () => {
  /** The scenario every `site/lgraphutil/externalPorts/*` row shares: see test/helpers/lgraph-site-external-tables.ts. */
  function runRow(name: string): { dummy: LNode; position: KVector } {
    const { input } = EXTERNAL_PORT_ROWS[name]!;
    const graph = new LGraph();
    graph.getSize().x = 120;
    graph.getSize().y = 90;
    graph.getPadding().set(5, 6, 7, 8);
    graph.getOffset().x = 2;
    graph.getOffset().y = 3;
    const holder = new LPort();
    if (input.holderOffset !== undefined) {
      holder.setProperty(LayeredOptions.PORT_BORDER_OFFSET, input.holderOffset);
    }
    if (input.holderAnchor !== undefined) {
      holder.setProperty(LayeredOptions.PORT_ANCHOR, new KVector(input.holderAnchor[0], input.holderAnchor[1]));
    }
    if (input.holderIndex !== undefined) {
      holder.setProperty(LayeredOptions.PORT_INDEX, input.holderIndex);
    }
    const dummy = createExternalPortDummy({
      propertyHolder: holder,
      portConstraints: PortConstraints.valueOf(input.constraints),
      portSide: PortSide.valueOf(input.side),
      netFlow: input.netFlow,
      portNodeSize: new KVector(100, 80),
      portPosition: new KVector(7, 9),
      portSize: new KVector(6, 4),
      layoutDirection: Direction.valueOf(input.direction),
      layeredGraph: graph,
    });
    dummy.getPosition().x = 30;
    dummy.getPosition().y = 40;
    return { dummy, position: getExternalPortPosition(graph, dummy, 6, 4) };
  }

  function optional<T>(holder: LNode, property: IProperty<T>): T | null {
    return holder.hasProperty(property) ? holder.getProperty(property) : null;
  }

  // oracle: site/lgraphutil/externalPorts/{north,east,south,west}-{implicit,explicit}-anchor-{negative,positive}-offset,
  // fixed-order-{index,no-index}-*, fixed-ratio-*, fixed-side-*, fixed-side-undefined,
  // free-{right,left,up,down,undefined}-netflow-{positive,zero,negative}; LGraphUtil.java:800-1030
  it.each(Object.keys(EXTERNAL_PORT_ROWS))('site/lgraphutil/externalPorts/%s', (name) => {
    const { expect: want } = EXTERNAL_PORT_ROWS[name]!;
    const { dummy, position } = runRow(name);
    expect(dummy.getType()).toBe(NodeType.EXTERNAL_PORT);
    expect(xy(dummy.getSize())).toEqual([...want.size]);
    expect(dummy.getProperty(InternalProperties.EXT_PORT_SIDE).name()).toBe(want.externalPortSide);
    expect(optional(dummy, InternalProperties.IN_LAYER_CONSTRAINT)?.name() ?? null).toBe(want.inLayerConstraint);
    expect(optional(dummy, LayeredOptions.LAYERING_LAYER_CONSTRAINT)?.name() ?? null).toBe(want.layerConstraint);
    expect(optional(dummy, InternalProperties.EDGE_CONSTRAINT)?.name() ?? null).toBe(want.edgeConstraint);
    expect(xy(dummy.getProperty(LayeredOptions.PORT_ANCHOR))).toEqual([...want.anchor]);
    expect(dummy.getProperty(LayeredOptions.PORT_BORDER_OFFSET)).toBe(want.borderOffset);
    expect(optional(dummy, InternalProperties.PORT_RATIO_OR_POSITION)).toBe(want.ratioOrPosition);
    const port = dummy.getPorts()[0]!;
    expect([port.getSide().name(), ...xy(port.getPosition())]).toEqual([...want.port]);
    expect(xy(position)).toEqual([...want.position]);
    expect(xy(dummy.getPosition())).toEqual([...want.moved]);
  });
});
