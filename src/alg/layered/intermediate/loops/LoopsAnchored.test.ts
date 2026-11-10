// SPDX-License-Identifier: EPL-2.0
// Anchored cases for the self loop model and the five self loop processors (mission 7g, T21a, W14/F12): `SelfHyperLoop`,
// `SelfLoopType`, `SelfLoopHolder`, `SelfLoopPort`, `SelfLoopEdge`, `SelfLoopPreProcessor`, `SelfLoopPortRestorer`,
// `SelfLoopRouter`, `SelfLoopPostProcessor` and `DummySelfLoopProcessor`. Every case replays one row of
// test/golden/refs/java/layered-loops.json through the real classes, then asserts a class-level fact against the value the
// row records. No literal is typed here: types, ports, edges, layers and coordinates come from the row (coordinates compare
// at AD-4, 1e-6); enum constants compare by name.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InteractiveLayeredGraphVisitor } from '../../InteractiveLayeredGraphVisitor.js';
import { ComponentsProcessor } from '../../components/ComponentsProcessor.js';
import { LEdge } from '../../graph/LEdge.js';
import type { LGraph } from '../../graph/LGraph.js';
import type { LLabel } from '../../graph/LLabel.js';
import type { LNode } from '../../graph/LNode.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import { LayeredOptions } from '../../options/LayeredOptions.js';
import { decodeHex, registerLayered } from '../../../../../test/helpers/layered-framework-replay.js';
import { labelsDump, type LabelsExpected } from '../../../../../test/helpers/layered-labels-replay-dump.js';
import { withLoopsLabelManager } from '../../../../../test/helpers/layered-loops-replay-manager.js';
import {
  registerStepProcessor,
  runLoopsRow,
  strategyFactories,
  unregisterStepProcessor,
} from '../../../../../test/helpers/layered-loops-replay-ops.js';
import {
  isStopRow,
  loadLoopsRows,
  registerLoopsEnums,
  type PipelineStopRow,
} from '../../../../../test/helpers/layered-loops-replay-rows.js';
import { installWrappingEncoding, withListOptions } from '../../../../../test/helpers/layered-loops-replay-wrapping.js';
import { contextOf, elementAt } from '../../../../../test/helpers/layered-phase-replay-dump.js';
import { DummySelfLoopProcessor } from '../DummySelfLoopProcessor.js';
import type { SelfLoopHolder } from './SelfLoopHolder.js';

const AD4_TOLERANCE = 1e-6;

type Hex = string;
type HexPair = readonly [Hex, Hex];

interface LoopRow {
  readonly type: string | null;
  readonly ports: readonly string[];
  readonly edges: readonly string[];
  readonly occupiedSides: readonly string[];
  readonly leftmost: string | null;
  readonly rightmost: string | null;
  readonly labels: { readonly side: string | null } | null;
}

interface HolderRow {
  readonly portsHidden: boolean;
  readonly slotCounts: readonly number[];
  readonly ports: readonly { readonly port: string; readonly hadOnlySelfLoops: boolean; readonly hidden: boolean }[];
  readonly loops: readonly LoopRow[];
}

interface ChangedEntry {
  readonly path: string;
  readonly props: Readonly<Record<string, { readonly ref?: string; readonly n?: string }>>;
}

interface Expected {
  readonly changed: readonly ChangedEntry[];
  readonly layers: readonly (readonly string[])[];
  readonly edges: readonly {
    readonly path: string;
    readonly src: string | null;
    readonly tgt: string | null;
    readonly reversed: boolean;
  }[];
  readonly ports: Readonly<Record<string, readonly string[]>>;
  readonly selfLoops: Readonly<Record<string, HolderRow>>;
  readonly geometry: {
    readonly edges: Readonly<Record<string, { readonly bendPoints: readonly HexPair[] }>>;
    readonly labels: Readonly<Record<string, { readonly pos: HexPair }>>;
  };
}

const rows = new Map(
  loadLoopsRows()
    .filter(isStopRow)
    .map((row) => [row.id, row] as const),
);

interface Replayed {
  readonly graph: LGraph;
  readonly expected: Expected;
}

function replay(id: string): Replayed {
  const row = rows.get(id);
  if (row === undefined) {
    throw new Error(`no row ${id}`);
  }
  registerLayered();
  registerLoopsEnums();
  installWrappingEncoding();
  const env = {
    factories: strategyFactories,
    components: new ComponentsProcessor(),
    createInteractiveVisitor: () => new InteractiveLayeredGraphVisitor(),
  };
  const result = withLoopsLabelManager(withListOptions(row) as PipelineStopRow, (stepRow) => runLoopsRow(stepRow, env));
  // names the elements a processor created (`new/n<k>`, `new/e<k>`) in the order the recorder named them
  labelsDump(result, row.expected as unknown as LabelsExpected);
  return { graph: result.graph, expected: row.expected as unknown as Expected };
}

const pathOf = (replayed: Replayed, element: object): string => {
  const path = contextOf(replayed.graph).paths.get(element);
  if (path === undefined) {
    throw new Error('element without a path');
  }
  return path;
};

const nodeOf = (replayed: Replayed, node: string): LNode => elementAt(replayed.graph, node) as LNode;

const holderOf = (replayed: Replayed, node: string): SelfLoopHolder =>
  nodeOf(replayed, node).getProperty(InternalProperties.SELF_LOOP_HOLDER);

const portOrder = (replayed: Replayed, node: string): string[] =>
  nodeOf(replayed, node)
    .getPorts()
    .map((port) => pathOf(replayed, port));

const near = (actual: number, expected: number): void => {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(AD4_TOLERANCE);
};

/** `[source path, target path]` of an edge as the graph holds it now (`null` for a detached end). */
function ends(replayed: Replayed, edge: string): [string | null, string | null] {
  const lEdge = elementAt(replayed.graph, edge) as LEdge;
  const source = lEdge.getSource();
  const target = lEdge.getTarget();
  return [source === null ? null : pathOf(replayed, source), target === null ? null : pathOf(replayed, target)];
}

/** Every edge of the row: the ends and the `REVERSED` flag the graph holds equal the recording. */
function expectEdgesAsRecorded(replayed: Replayed): void {
  for (const recorded of replayed.expected.edges) {
    expect(ends(replayed, recorded.path)).toEqual([recorded.src, recorded.tgt]);
    const lEdge = elementAt(replayed.graph, recorded.path) as LEdge;
    expect(lEdge.getProperty(InternalProperties.REVERSED)).toBe(recorded.reversed);
  }
}

/** The layers as the graph holds them, by node path. */
const layersOf = (replayed: Replayed): string[][] =>
  replayed.graph.getLayers().map((layer) => layer.getNodes().map((node) => pathOf(replayed, node)));

/** The path of the dummy the processor made for a loop: its long-edge source and target ports sit on one node. */
function loopDummyPath(replayed: Replayed): string {
  const found = layersOf(replayed)
    .flat()
    .filter((path) => path.startsWith('new/n'))
    .filter((path) => {
      const dummy = elementAt(replayed.graph, path) as LNode;
      return (
        dummy.getProperty(InternalProperties.LONG_EDGE_SOURCE)?.getNode() ===
        dummy.getProperty(InternalProperties.LONG_EDGE_TARGET)?.getNode()
      );
    });
  expect(found).toHaveLength(1);
  return found[0]!;
}

describe('SelfHyperLoop and SelfLoopType', () => {
  // oracle: sites/SelfLoopRouter/inlineLabels/RIGHT; SelfHyperLoop.java:90-103 (computePortsPerSide), SelfLoopType.java:41-100
  // (fromPortSides): a three-sided and an opposing loop get their type, ports, edges, occupied sides and extreme ports
  it('computes type, ports, edges, occupied sides and extreme ports of each loop as recorded', () => {
    const replayed = replay('sites/SelfLoopRouter/inlineLabels/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const loops = holderOf(replayed, 'g0/n1').getSLHyperLoops();
    expect(loops).toHaveLength(recorded.loops.length);
    loops.forEach((loop, i) => {
      const row = recorded.loops[i]!;
      expect(String(loop.getSelfLoopType())).toBe(row.type);
      expect(loop.getSLPorts().map((slPort) => pathOf(replayed, slPort.getLPort()))).toEqual(row.ports);
      expect([...loop.getSLEdges()].map((slEdge) => pathOf(replayed, slEdge.getLEdge()))).toEqual(row.edges);
      expect([...loop.getOccupiedPortSides()].map((side) => side.name())).toEqual(row.occupiedSides);
      expect(pathOf(replayed, loop.getLeftmostPort()!.getLPort())).toBe(row.leftmost);
      expect(pathOf(replayed, loop.getRightmostPort()!.getLPort())).toBe(row.rightmost);
    });
  });

  // oracle: sites/LabelPlacer/fourSidesLabel/northFirst; SelfLoopType.java:41-100: the loop over ports on all four sides
  it('types a loop with ports on all four sides as the recorded type', () => {
    const replayed = replay('sites/LabelPlacer/fourSidesLabel/northFirst');
    const recorded = replayed.expected.selfLoops['g0/n0']!.loops[0]!;
    const loop = holderOf(replayed, 'g0/n0').getSLHyperLoops()[0]!;
    expect(String(loop.getSelfLoopType())).toBe(recorded.type);
    expect(loop.getOccupiedPortSides().size()).toBe(recorded.occupiedSides.length);
  });

  // oracle: sites/SelfLoopRouter/labelManager/shrink; SelfLoopType.java:41-100: a one-sided loop and a corner loop
  it('types one-sided and corner loops as recorded', () => {
    const replayed = replay('sites/SelfLoopRouter/labelManager/shrink');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const types = holderOf(replayed, 'g0/n1')
      .getSLHyperLoops()
      .map((loop) => String(loop.getSelfLoopType()));
    expect(types).toEqual(recorded.loops.map((loop) => loop.type));
    expect(new Set(types).size).toBeGreaterThan(1);
  });
});

describe('SelfLoopHolder, SelfLoopPort and SelfLoopEdge', () => {
  // oracle: sites/SelfLoopRouter/inlineLabels/RIGHT; SelfLoopHolder.java:208 (portsHidden), getRoutingSlotCount, SelfLoopPort
  // hadOnlySelfLoops: the holder lists its ports in the recorded order and counts the slots per side
  it('keeps the port map order, the hidden flags and the slot counts of the recording', () => {
    const replayed = replay('sites/SelfLoopRouter/inlineLabels/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const holder = holderOf(replayed, 'g0/n1');
    const slPorts = [...holder.getSLPortMap().values()];
    expect(slPorts.map((slPort) => pathOf(replayed, slPort.getLPort()))).toEqual(
      recorded.ports.map((port) => port.port),
    );
    expect(slPorts.map((slPort) => slPort.hadOnlySelfLoops())).toEqual(
      recorded.ports.map((port) => port.hadOnlySelfLoops),
    );
    expect(slPorts.map((slPort) => slPort.isHidden())).toEqual(recorded.ports.map((port) => port.hidden));
    expect(holder.arePortsHidden()).toBe(recorded.portsHidden);
    expect([...holder.getRoutingSlotCount()]).toEqual(recorded.slotCounts);
  });

  // oracle: sites/SelfLoopRouter/inlineLabels/RIGHT; SelfLoopEdge.java getLabelSide / getSLHyperLoop: every edge of a loop
  // answers the label side of its loop's labels
  it('answers the label side of the loop for each of its edges', () => {
    const replayed = replay('sites/SelfLoopRouter/inlineLabels/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    holderOf(replayed, 'g0/n1')
      .getSLHyperLoops()
      .forEach((loop, i) => {
        for (const slEdge of loop.getSLEdges()) {
          expect(slEdge.getSLHyperLoop()).toBe(loop);
          expect(slEdge.getLabelSide()!.name()).toBe(recorded.loops[i]!.labels!.side);
        }
      });
  });
});

describe('SelfLoopPreProcessor', () => {
  // oracle: scenarios/SelfLoopPreProcessor/free/RIGHT; SelfLoopPreProcessor.java:79 (hideSelfLoop), :88-115 (hidePorts): the
  // loop edge is detached from both ports and the loop-only ports leave the node
  it('detaches the loop edge and hides the loop-only ports of a FREE node', () => {
    const replayed = replay('scenarios/SelfLoopPreProcessor/free/RIGHT');
    expectEdgesAsRecorded(replayed);
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const holder = holderOf(replayed, 'g0/n1');
    expect(holder.arePortsHidden()).toBe(recorded.portsHidden);
    expect(recorded.portsHidden).toBe(true);
    expect([...holder.getSLPortMap().values()].map((slPort) => slPort.isHidden())).toEqual(
      recorded.ports.map((port) => port.hidden),
    );
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
  });

  // oracle: scenarios/SelfLoopPreProcessor/fixed-order/RIGHT; SelfLoopPreProcessor.java:88-105: with a fixed port order no
  // port is hidden, the loop edges are still detached
  it('hides no port of a fixed-order node', () => {
    const replayed = replay('scenarios/SelfLoopPreProcessor/fixed-order/RIGHT');
    expectEdgesAsRecorded(replayed);
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    expect(holderOf(replayed, 'g0/n1').arePortsHidden()).toBe(recorded.portsHidden);
    expect(recorded.portsHidden).toBe(false);
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
  });

  // oracle: scenarios/SelfLoopPreProcessor/hyper-nes/RIGHT; SelfLoopPreProcessor.java:69-77 (hideSelfLoops): both edges of a
  // hyper loop are detached
  it('detaches every edge of a hyper loop', () => {
    const replayed = replay('scenarios/SelfLoopPreProcessor/hyper-nes/RIGHT');
    expectEdgesAsRecorded(replayed);
    const detached = replayed.expected.edges.filter((edge) => edge.src === null).map((edge) => edge.path);
    expect(detached.sort()).toEqual([...replayed.expected.selfLoops['g0/n1']!.loops[0]!.edges].sort());
  });
});

describe('SelfLoopPortRestorer', () => {
  // oracle: scenarios/SelfLoopPortRestorer/e-e/RIGHT; SelfLoopPortRestorer.java:62-92 (processNode): the ports are back, the
  // loop types are computed, the edges stay detached
  it('restores the ports of a fixed-side node and computes the loop types', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/e-e/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const holder = holderOf(replayed, 'g0/n1');
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
    expect(holder.arePortsHidden()).toBe(recorded.portsHidden);
    expect(holder.getSLHyperLoops().map((loop) => String(loop.getSelfLoopType()))).toEqual(
      recorded.loops.map((loop) => loop.type),
    );
    expect(ends(replayed, 'g0/e3')).toEqual([null, null]);
  });

  // oracle: scenarios/SelfLoopPortRestorer/free/RIGHT; SelfLoopPortRestorer.java:64-75: hidden ports of a FREE node are
  // assigned a side first, then restored and unhidden
  it('unhides the ports of a FREE node it restores', () => {
    const replayed = replay('scenarios/SelfLoopPortRestorer/free/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const holder = holderOf(replayed, 'g0/n1');
    expect(holder.arePortsHidden()).toBe(false);
    expect([...holder.getSLPortMap().values()].map((slPort) => slPort.isHidden())).toEqual(
      recorded.ports.map((port) => port.hidden),
    );
    expect(portOrder(replayed, 'g0/n1')).toEqual(replayed.expected.ports['g0/n1']);
  });
});

describe('SelfLoopRouter', () => {
  // oracle: scenarios/SelfLoopRouter/n-s/RIGHT; SelfLoopRouter.java:62-72 (process) and :87-98 (processNode): direction,
  // labels, slots and routing run in that order and leave the recorded slot counts and occupied sides
  it('leaves the recorded slot counts and occupied sides on the node', () => {
    const replayed = replay('scenarios/SelfLoopRouter/n-s/RIGHT');
    const recorded = replayed.expected.selfLoops['g0/n1']!;
    const holder = holderOf(replayed, 'g0/n1');
    expect([...holder.getRoutingSlotCount()]).toEqual(recorded.slotCounts);
    holder.getSLHyperLoops().forEach((loop, i) => {
      expect([...loop.getOccupiedPortSides()].map((side) => side.name())).toEqual(recorded.loops[i]!.occupiedSides);
    });
  });
});

describe('SelfLoopPostProcessor', () => {
  // oracle: scenarios/SelfLoopPostProcessor/e-e/RIGHT; SelfLoopPostProcessor.java:70-76 (restoreEdge): the edge is back at its
  // ports and its bend points are shifted by the node position
  it('restores the loop edge to its ports and offsets its bend points by the node position', () => {
    const replayed = replay('scenarios/SelfLoopPostProcessor/e-e/RIGHT');
    expectEdgesAsRecorded(replayed);
    const actual = [...(elementAt(replayed.graph, 'g0/e3') as LEdge).getBendPoints()];
    const recorded = replayed.expected.geometry.edges['g0/e3']!.bendPoints;
    expect(actual).toHaveLength(recorded.length);
    recorded.forEach(([x, y], i) => {
      near(actual[i]!.x, decodeHex(x));
      near(actual[i]!.y, decodeHex(y));
    });
    expect(nodeOf(replayed, 'g0/n1').getPosition().x).toBeGreaterThan(0);
  });

  // oracle: scenarios/SelfLoopPostProcessor/labels/RIGHT; SelfLoopPostProcessor.java:60-67 (processNode): the labels of a
  // loop are placed relative to the node position
  it('places the loop labels at the recorded positions', () => {
    const replayed = replay('scenarios/SelfLoopPostProcessor/labels/RIGHT');
    for (const [path, recorded] of Object.entries(replayed.expected.geometry.labels)) {
      const label = elementAt(replayed.graph, path) as LLabel;
      near(label.getPosition().x, decodeHex(recorded.pos[0]));
      near(label.getPosition().y, decodeHex(recorded.pos[1]));
    }
    expect(Object.keys(replayed.expected.geometry.labels).length).toBeGreaterThan(0);
  });
});

describe('DummySelfLoopProcessor', () => {
  const PROCESSOR_NAME = 'DummySelfLoopProcessor';
  beforeAll(() => {
    registerStepProcessor(PROCESSOR_NAME, () => new DummySelfLoopProcessor());
  });
  afterAll(() => {
    unregisterStepProcessor(PROCESSOR_NAME);
  });

  // oracle: scenarios/DummySelfLoopProcessor/NORTH-NORTH/RIGHT; DummySelfLoopProcessor.java:100-130 (the cases that need no
  // work): no edge is reversed and no dummy is created
  it('leaves a north to north loop alone', () => {
    const replayed = replay('scenarios/DummySelfLoopProcessor/NORTH-NORTH/RIGHT');
    expectEdgesAsRecorded(replayed);
    expect(layersOf(replayed)).toEqual(replayed.expected.layers);
    expect(
      layersOf(replayed)
        .flat()
        .some((path) => path.startsWith('new/')),
    ).toBe(false);
  });

  // oracle: scenarios/DummySelfLoopProcessor/{EAST-NORTH,SOUTH-NORTH,NORTH-WEST}/RIGHT; DummySelfLoopProcessor.java:111-122:
  // the reversal arms reverse the edge and create no dummy
  it.each(['EAST-NORTH', 'SOUTH-NORTH', 'NORTH-WEST'])('reverses a %s loop without a dummy', (pair) => {
    const replayed = replay(`scenarios/DummySelfLoopProcessor/${pair}/RIGHT`);
    expectEdgesAsRecorded(replayed);
    expect(replayed.expected.edges.some((edge) => edge.reversed)).toBe(true);
    expect(layersOf(replayed)).toEqual(replayed.expected.layers);
    expect(
      layersOf(replayed)
        .flat()
        .some((path) => path.startsWith('new/')),
    ).toBe(false);
  });

  // oracle: scenarios/DummySelfLoopProcessor/EAST-WEST/RIGHT; DummySelfLoopProcessor.java:122-130,155-190 (createDummy): the
  // loop is reversed and a long-edge dummy with two edges is put into the layer of the node
  it('reverses an east to west loop and routes it through a long-edge dummy', () => {
    const replayed = replay('scenarios/DummySelfLoopProcessor/EAST-WEST/RIGHT');
    expectEdgesAsRecorded(replayed);
    expect(layersOf(replayed)).toEqual(replayed.expected.layers);
    const dummyPaths = layersOf(replayed)
      .flat()
      .filter((path) => path.startsWith('new/'));
    expect(dummyPaths).toHaveLength(1);
    const dummy = elementAt(replayed.graph, dummyPaths[0]!) as LNode;
    expect(dummy.getPorts()).toHaveLength(2);
    expect(String(dummy.getType())).toBe('LONG_EDGE');
  });

  // oracle: scenarios/DummySelfLoopProcessor/WEST-EAST/RIGHT; DummySelfLoopProcessor.java:128-130: west to east keeps the
  // direction and still gets a dummy
  it('gives a west to east loop a dummy without reversing it', () => {
    const replayed = replay('scenarios/DummySelfLoopProcessor/WEST-EAST/RIGHT');
    expectEdgesAsRecorded(replayed);
    expect(layersOf(replayed)).toEqual(replayed.expected.layers);
    expect(
      layersOf(replayed)
        .flat()
        .filter((path) => path.startsWith('new/')),
    ).toHaveLength(1);
    expect(replayed.expected.edges.some((edge) => edge.reversed)).toBe(false);
  });

  // oracle: scenarios/DummySelfLoopProcessor/multi/RIGHT; DummySelfLoopProcessor.java:70-90: the dummies of one layer are
  // collected and added after the layer's nodes were visited
  it('adds the dummies of several loops after the nodes of the layer', () => {
    const replayed = replay('scenarios/DummySelfLoopProcessor/multi/RIGHT');
    expectEdgesAsRecorded(replayed);
    const layers = layersOf(replayed);
    expect(layers).toEqual(replayed.expected.layers);
    const middle = layers.find((layer) => layer.some((path) => path.startsWith('new/')))!;
    const firstDummy = middle.findIndex((path) => path.startsWith('new/'));
    expect(middle.slice(firstDummy).every((path) => path.startsWith('new/'))).toBe(true);
    expect(middle.filter((path) => path.startsWith('new/'))).toHaveLength(2);
  });

  // oracle: scenarios/DummySelfLoopProcessor/EAST-WEST/RIGHT (new/n0 in `changed`); DummySelfLoopProcessor.java:155-190
  // (createDummy): the dummy remembers the loop edge as origin, the swapped ports as long-edge source and target, and has
  // fixed port positions
  it('creates the dummy with the recorded origin, long-edge ends and port constraints', () => {
    const replayed = replay('scenarios/DummySelfLoopProcessor/EAST-WEST/RIGHT');
    const dummyPath = loopDummyPath(replayed);
    const recorded = replayed.expected.changed.find((entry) => entry.path === dummyPath)!.props;
    const dummy = elementAt(replayed.graph, dummyPath) as LNode;
    expect(pathOf(replayed, dummy.getProperty(InternalProperties.ORIGIN) as object)).toBe(recorded['origin']!.ref);
    expect(pathOf(replayed, dummy.getProperty(InternalProperties.LONG_EDGE_SOURCE)!)).toBe(
      recorded['longEdgeSource']!.ref,
    );
    expect(pathOf(replayed, dummy.getProperty(InternalProperties.LONG_EDGE_TARGET)!)).toBe(
      recorded['longEdgeTarget']!.ref,
    );
    expect(dummy.getProperty(LayeredOptions.PORT_CONSTRAINTS).name()).toBe(
      recorded['org.eclipse.elk.portConstraints']!.n,
    );
  });

  // oracle: scenarios/DummySelfLoopProcessor/EAST-WEST/LEFT (`changed` of the dummy edges); DummySelfLoopProcessor.java:
  // 180-190: the edge from the dummy to the target does not inherit the junction points of the loop edge
  it('copies the loop edge properties to the dummy edge but not its junction points', () => {
    const replayed = replay('scenarios/DummySelfLoopProcessor/EAST-WEST/LEFT');
    const junctionKey = LayeredOptions.JUNCTION_POINTS.getId();
    const dummyPath = loopDummyPath(replayed);
    const dummy = elementAt(replayed.graph, dummyPath) as LNode;
    const edges = dummy.getPorts().flatMap((port) => [...port.getConnectedEdges()]);
    expect(edges).toHaveLength(2);
    const hasJunctions = edges.map((edge) => edge.hasProperty(LayeredOptions.JUNCTION_POINTS));
    edges.forEach((edge, i) => {
      const recorded = replayed.expected.changed.find((entry) => entry.path === pathOf(replayed, edge))!;
      expect(junctionKey in recorded.props).toBe(hasJunctions[i]);
    });
    expect(hasJunctions).toContain(false);
  });
});
