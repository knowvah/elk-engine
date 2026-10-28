// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { nodeAt, portAt, xy } from '../../../../test/helpers/lgraph-site-shapes.js';
import {
  BORDER_OFFSET_PRESET_CASES,
  DEFINED_SIDE_CASES,
  EXPLICIT_ANCHOR_CASES,
  INITIALIZE_NODE,
  UNDEFINED_SIDE_DOWN_CASES,
  UNDEFINED_SIDE_LEFT_CASES,
  UNDEFINED_SIDE_RIGHT_CASES,
  UNDEFINED_SIDE_UNDEFINED_CASES,
  UNDEFINED_SIDE_UP_CASES,
  ZERO_SIZE_CASES,
  type InitializePortCase,
} from '../../../../test/helpers/lgraph-site-port-tables.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { KVector } from '../../../core/math/KVector.js';
import { Direction } from '../../../core/options/Direction.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortType } from '../options/PortType.js';
import { LGraph } from './LGraph.js';
import { createPort, initializePort, provideCollectorPort } from './LGraphUtilPorts.js';
import { LPort } from './LPort.js';

/**
 * Cases anchored on the `site/lgraphutil/ports/*` rows of test/golden/refs/java/layered-sites.json (JVM oracle, T10).
 * The scenarios are built here with the TS API; the literals (and, for initializePort, the case tables of
 * test/helpers/lgraph-site-port-tables.ts) are the row values.
 */
beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

/** A layout direction setting of the createPort rows: DIRECTION and, for UNDEFINED, ASPECT_RATIO. */
type DirectionSetting = readonly [Direction, number | null];

const SETTINGS: DirectionSetting[] = [
  [Direction.LEFT, null],
  [Direction.RIGHT, null],
  [Direction.UP, null],
  [Direction.DOWN, null],
  [Direction.UNDEFINED, 1.6],
  [Direction.UNDEFINED, 0.5],
];

function applySetting(graph: LGraph, [direction, aspect]: DirectionSetting): void {
  graph.setProperty(LayeredOptions.DIRECTION, direction);
  if (aspect !== null) {
    graph.setProperty(LayeredOptions.ASPECT_RATIO, aspect);
  }
}

function sideNames(ports: readonly (LPort | null)[]): (string | null)[] {
  return ports.map((p) => (p === null ? null : p.getSide().name()));
}

function flagNames(graph: LGraph): string[] {
  return [...graph.getProperty(InternalProperties.GRAPH_PROPERTIES)].map((p) => p.name());
}

describe('createPort without end point (oracle rows)', () => {
  // INPUT, OUTPUT and UNDEFINED port sides per setting; every port sits at the origin with no size
  const FREE_SIDES: [string, string, string][] = [
    ['EAST', 'WEST', 'EAST'],
    ['WEST', 'EAST', 'WEST'],
    ['SOUTH', 'NORTH', 'SOUTH'],
    ['NORTH', 'SOUTH', 'NORTH'],
    ['WEST', 'EAST', 'WEST'],
    ['NORTH', 'SOUTH', 'NORTH'],
  ];

  // oracle: site/lgraphutil/ports/createPort-free-no-endpoint; LGraphUtil.java:439-480
  it('free ports get the side of the direction: input against, output along it', () => {
    const graph = new LGraph();
    const node = nodeAt(graph, 10, 20, 40, 30);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
    SETTINGS.forEach((setting, i) => {
      applySetting(graph, setting);
      const ports = [PortType.INPUT, PortType.OUTPUT, PortType.UNDEFINED].map((t) => createPort(node, null, t, graph));
      expect(sideNames(ports)).toEqual(FREE_SIDES[i]);
      expect(ports.map((p) => xy(p.getPosition()))).toEqual([
        [0, 0],
        [0, 0],
        [0, 0],
      ]);
      expect(flagNames(graph)).toEqual([]);
    });
  });

  const COLLECTOR_N2_SIDES = ['WEST', 'EAST', 'NORTH', 'SOUTH', 'EAST', 'SOUTH'];

  // the merged collector ports of n are created in the first setting (LEFT) and found again afterwards
  function checkCollectors(graph: LGraph, node: ReturnType<typeof nodeAt>, other: ReturnType<typeof nodeAt>): void {
    let first: (LPort | null)[] = [];
    SETTINGS.forEach((setting, i) => {
      applySetting(graph, setting);
      const ports = [PortType.INPUT, PortType.OUTPUT, PortType.UNDEFINED].map((t) => createPort(node, null, t, graph));
      const sided = createPort(other, null, PortType.OUTPUT, graph);
      if (i === 0) {
        first = ports;
        expect(sideNames(ports)).toEqual(['EAST', 'WEST', null]);
        expect(ports.slice(0, 2).map((p) => xy(p!.getPosition()))).toEqual([
          [40, 15],
          [0, 15],
        ]);
        expect(ports[0]!.getProperty(InternalProperties.INPUT_COLLECT)).toBe(true);
        expect(ports[1]!.getProperty(InternalProperties.OUTPUT_COLLECT)).toBe(true);
      } else {
        expect(ports[0]).toBe(first[0]);
        expect(ports[1]).toBe(first[1]);
        expect(ports[2]).toBeNull();
      }
      expect([sided.getSide().name(), xy(sided.getPosition())]).toEqual([COLLECTOR_N2_SIDES[i], [0, 0]]);
      expect(flagNames(graph)).toEqual([]);
    });
  }

  // oracle: site/lgraphutil/ports/createPort-merge-edges-no-endpoint; LGraphUtil.java:439-450
  it('with MERGE_EDGES a free node gets reusable collector ports, a side-fixed node ordinary ones', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.MERGE_EDGES, true);
    const node = nodeAt(graph, 10, 20, 40, 30);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
    const other = nodeAt(graph, 0, 0, 40, 30);
    other.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
    checkCollectors(graph, node, other);
  });

  // oracle: site/lgraphutil/ports/createPort-hypernode-no-endpoint; LGraphUtil.java:439-450
  it('a free hypernode gets reusable collector ports, a side-fixed hypernode ordinary ones', () => {
    const graph = new LGraph();
    const node = nodeAt(graph, 10, 20, 40, 30);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FREE);
    node.setProperty(LayeredOptions.HYPERNODE, true);
    const other = nodeAt(graph, 0, 0, 40, 30);
    other.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    other.setProperty(LayeredOptions.HYPERNODE, true);
    checkCollectors(graph, node, other);
  });
});

describe('createPort with an end point (oracle rows)', () => {
  const END_POINTS: [number, number][] = [
    [12, 35],
    [48, 35],
    [30, 22],
    [30, 48],
    [30, 35],
    [0, 0],
    [100, 100],
    [2, -50],
  ];

  function createAll(size: [number, number]): { sides: string[]; positions: number[][]; flags: string[][] } {
    const graph = new LGraph();
    const node = nodeAt(graph, 10, 20, ...size);
    node.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_POS);
    const result: ReturnType<typeof createAll> = { sides: [], positions: [], flags: [] };
    for (const direction of [Direction.LEFT, Direction.RIGHT, Direction.UP, Direction.DOWN]) {
      graph.setProperty(LayeredOptions.DIRECTION, direction);
      END_POINTS.forEach(([x, y], i) => {
        const port = createPort(node, new KVector(x, y), i % 2 === 0 ? PortType.INPUT : PortType.OUTPUT, graph);
        result.sides.push(port.getSide().name());
        result.positions.push(xy(port.getPosition()));
      });
      result.flags.push(flagNames(graph));
    }
    return result;
  }

  // oracle: site/lgraphutil/ports/createPort-with-endpoint-sized; LGraphUtil.java:450-480 (calcPortSide, calcPortOffset)
  it('a 40x30 node at (10, 20) derives side and position from each end point, for all four directions', () => {
    const sides = ['WEST', 'EAST', 'NORTH', 'SOUTH', 'WEST', 'WEST', 'EAST', 'WEST'];
    const positions = [
      [2, 15],
      [38, 15],
      [20, 2],
      [20, 28],
      [20, 15],
      [0, 0],
      [40, 30],
      [0, 0],
    ];
    const result = createAll([40, 30]);
    expect(result.sides).toEqual([...sides, ...sides, ...sides, ...sides]);
    expect(result.positions).toEqual([...positions, ...positions, ...positions, ...positions]);
    expect(result.flags).toEqual([
      ['NORTH_SOUTH_PORTS'],
      ['NORTH_SOUTH_PORTS'],
      ['NORTH_SOUTH_PORTS'],
      ['NORTH_SOUTH_PORTS'],
    ]);
  });

  // oracle: site/lgraphutil/ports/createPort-with-endpoint-zero-size; LGraphUtil.java:450-480
  it('a zero-size node leaves every port side UNDEFINED at the origin and raises no flag', () => {
    const result = createAll([0, 0]);
    expect(result.sides).toEqual(Array<string>(32).fill('UNDEFINED'));
    expect(result.positions).toEqual(Array.from({ length: 32 }, () => [0, 0]));
    expect(result.flags).toEqual([[], [], [], []]);
  });
});

describe('provideCollectorPort (oracle row)', () => {
  // oracle: site/lgraphutil/ports/provideCollectorPort; LGraphUtil.java:615-650
  it.each([
    [PortSide.NORTH, [20, 0]],
    [PortSide.EAST, [40, 15]],
    [PortSide.SOUTH, [20, 30]],
    [PortSide.WEST, [0, 15]],
  ] as const)('creates input and output collectors on %s at the border centre and finds them again', (side, centre) => {
    const graph = new LGraph();
    const node = nodeAt(graph, 0, 0, 40, 30);
    const input = provideCollectorPort(graph, node, PortType.INPUT, side)!;
    // a later request with another side returns the existing port
    expect(provideCollectorPort(graph, node, PortType.INPUT, PortSide.SOUTH)).toBe(input);
    const output = provideCollectorPort(graph, node, PortType.OUTPUT, side)!;
    expect(provideCollectorPort(graph, node, PortType.OUTPUT, PortSide.NORTH)).toBe(output);
    expect([input.getSide(), xy(input.getPosition()), input.getProperty(InternalProperties.INPUT_COLLECT)]).toEqual([
      side,
      [...centre],
      true,
    ]);
    expect([output.getSide(), xy(output.getPosition()), output.getProperty(InternalProperties.OUTPUT_COLLECT)]).toEqual(
      [side, [...centre], true],
    );
    expect(node.getPorts()).toEqual([input, output]);
  });

  it('returns null for PortType.UNDEFINED and sets an UNDEFINED side at the origin', () => {
    const graph = new LGraph();
    const node = nodeAt(graph, 0, 0, 40, 30);
    expect(provideCollectorPort(graph, node, PortType.UNDEFINED, PortSide.EAST)).toBeNull();
    const port = provideCollectorPort(graph, node, PortType.INPUT, PortSide.UNDEFINED)!;
    expect([port.getSide(), xy(port.getPosition())]).toEqual([PortSide.UNDEFINED, [0, 0]]);
    expect(port.getProperty(InternalProperties.INPUT_COLLECT)).toBe(true);
  });
});

/** Runs each case on a fresh port of the shared node and compares the recorded state. */
function expectInitializeCases(cases: readonly InitializePortCase[], nodeSize: readonly [number, number]): void {
  const graph = new LGraph();
  const node = nodeAt(graph, INITIALIZE_NODE.pos[0], INITIALIZE_NODE.pos[1], nodeSize[0], nodeSize[1]);
  const results = cases.map((c) => {
    const [width, height] = c.size ?? [4, 4];
    const port = portAt(node, PortSide.UNDEFINED, c.at[0], c.at[1], width, height);
    if (c.side !== undefined) {
      port.setSide(PortSide.valueOf(c.side));
    }
    if (c.offset !== undefined) {
      port.setProperty(LayeredOptions.PORT_BORDER_OFFSET, c.offset);
    }
    const anchor = c.anchor === undefined ? null : new KVector(c.anchor[0], c.anchor[1]);
    initializePort(port, PortConstraints.valueOf(c.c), Direction.valueOf(c.d), anchor);
    return port;
  });
  const actual = results.map((p) => [
    p.getSide().name(),
    xy(p.getAnchor()),
    p.hasProperty(LayeredOptions.PORT_BORDER_OFFSET) ? p.getProperty(LayeredOptions.PORT_BORDER_OFFSET) : null,
    p.hasProperty(InternalProperties.PORT_RATIO_OR_POSITION)
      ? p.getProperty(InternalProperties.PORT_RATIO_OR_POSITION)
      : null,
    ...(p.isExplicitlySuppliedPortAnchor() ? [true] : []),
  ]);
  expect(actual).toEqual(cases.map((c) => c.out.map((v) => (Array.isArray(v) ? [...v] : v))));
}

describe('initializePort (oracle rows)', () => {
  // oracle: site/lgraphutil/ports/initializePort-undefined-side-{undefined,left,right,up,down}; LGraphUtil.java:662-697
  it.each([
    ['undefined', UNDEFINED_SIDE_UNDEFINED_CASES],
    ['left', UNDEFINED_SIDE_LEFT_CASES],
    ['right', UNDEFINED_SIDE_RIGHT_CASES],
    ['up', UNDEFINED_SIDE_UP_CASES],
    ['down', UNDEFINED_SIDE_DOWN_CASES],
  ] as const)(
    'derives side, border offset, ratio and anchor of undefined-side ports for direction %s',
    (_name, cases) => {
      expectInitializeCases(cases, INITIALIZE_NODE.size);
    },
  );

  // oracle: site/lgraphutil/ports/initializePort-zero-size; LGraphUtil.java:677-698 (the ratio of a zero-size node is 0)
  it('a zero-size node gives ratio 0 and keeps UNDEFINED sides undefined', () => {
    expectInitializeCases(ZERO_SIZE_CASES, [0, 0]);
  });

  // oracle: site/lgraphutil/ports/initializePort-defined-side; LGraphUtil.java:662-697
  it('ports with a defined side keep it, with ratio and explicit anchors as recorded', () => {
    expectInitializeCases(DEFINED_SIDE_CASES, INITIALIZE_NODE.size);
  });

  // oracle: site/lgraphutil/ports/initializePort-undefined-side-explicit-anchor; LGraphUtil.java:704-713
  it('an explicit anchor is kept and flagged for every constraint and port position', () => {
    expectInitializeCases(EXPLICIT_ANCHOR_CASES, INITIALIZE_NODE.size);
  });

  // oracle: site/lgraphutil/ports/initializePort-border-offset-preset; LGraphUtil.java:669-675
  it('a preset PORT_BORDER_OFFSET is not recomputed', () => {
    expectInitializeCases(BORDER_OFFSET_PRESET_CASES, INITIALIZE_NODE.size);
  });
});
