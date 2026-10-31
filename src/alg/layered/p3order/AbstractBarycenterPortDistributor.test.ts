// SPDX-License-Identifier: EPL-2.0
// Unit cases of AbstractBarycenterPortDistributor, LayerTotalPortDistributor and NodeRelativePortDistributor
// (mission 7c, T6). Graphs come from the pre-P3 steps of layered-order.json rows or the structural builders; the
// expectations are the Java formulas (rank ranges of the Javadoc, the barycenter rules of the comments, `float`
// arithmetic through the Float32 shim). The oracle port orders are proven by T7's replay of the sweep.
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../../../../test/corpus/corpus.js';
import { loadOrderRows } from '../../../../test/helpers/layered-order-replay-rows.js';
import { runSteps, type Factories } from '../../../../test/helpers/layered-phase-replay-ops.js';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import * as Float32 from '../../../java/lang/Float32.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { LPort } from '../graph/LPort.js';
import { InvertedPortProcessor } from '../intermediate/InvertedPortProcessor.js';
import { LongEdgeSplitter } from '../intermediate/LongEdgeSplitter.js';
import { PortListSorter } from '../intermediate/PortListSorter.js';
import { PortSideProcessor } from '../intermediate/PortSideProcessor.js';
import { CycleBreakingStrategy } from '../options/CycleBreakingStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LayeringStrategy } from '../options/LayeringStrategy.js';
import { PortType } from '../options/PortType.js';
import type { AbstractBarycenterPortDistributor } from './AbstractBarycenterPortDistributor.js';
import { init } from './counting/IInitializable.js';
import { LayerTotalPortDistributor } from './LayerTotalPortDistributor.js';
import { NodeRelativePortDistributor } from './NodeRelativePortDistributor.js';

const rows = loadOrderRows(`${repoRoot()}/test/golden/refs/java/layered-order.json`);

const factories: Factories = {
  createProcessor(name): ILayoutProcessor<LGraph> {
    switch (name) {
      case 'LONG_EDGE_SPLITTER':
        return new LongEdgeSplitter();
      case 'PORT_SIDE_PROCESSOR':
        return new PortSideProcessor();
      case 'INVERTED_PORT_PROCESSOR':
        return new InvertedPortProcessor();
      case 'PORT_LIST_SORTER':
        return new PortListSorter();
      default:
        throw new Error(`processor ${name} is not available to this test`);
    }
  },
  createPhase: (phase, strategy) =>
    phase === 'P1_CYCLE_BREAKING'
      ? CycleBreakingStrategy.valueOf(strategy).create()
      : LayeringStrategy.valueOf(strategy).create(),
};

/** The graph of a step row as it enters P3: the row's steps without the P3 phase and the dump. */
function preP3Order(id: string): LNode[][] {
  const row = rows.find((candidate) => candidate.id === id)!;
  const steps = row.steps!.filter(
    ([op, phase]) => op !== 'dump' && !(op === 'runPhase' && phase === 'P3_NODE_ORDERING'),
  );
  return runSteps({ ...row, steps }, factories).toNodeArray();
}

/** Numbers layers like `LayerSweepTypeDecider.initAtLayerLevel` and runs `IInitializable.init` on the distributor. */
function prepare<D extends AbstractBarycenterPortDistributor>(order: LNode[][], distributor: D): D {
  order.forEach((layer, l) => {
    layer[0]!.getLayer()!.id = l;
  });
  init([distributor], order);
  return distributor;
}

const layerTotal = (order: LNode[][]): LayerTotalPortDistributor =>
  prepare(order, new LayerTotalPortDistributor(order.length));
const nodeRelative = (order: LNode[][]): NodeRelativePortDistributor =>
  prepare(order, new NodeRelativePortDistributor(order.length));

/** The ports of a node that have edges of the direction, in port list order (the `getPorts(PortType)` filter). */
function portsOf(node: LNode, type: PortType): LPort[] {
  return node
    .getPorts()
    .filter((port) => (type === PortType.INPUT ? port.getIncomingEdges() : port.getOutgoingEdges()).length > 0);
}

const ROW_IDS = [
  'scenarios/LayerSweep/layered10',
  'scenarios/LayerSweep/hyperedge-ports',
  'scenarios/LayerSweep/inverted-ports',
  'scenarios/LayerSweep/in-layer-edges',
];

describe('AbstractBarycenterPortDistributor: initialisation', () => {
  it.each(ROW_IDS.map((id) => [id] as const))('numbers nodes and ports in traversal order on %s', (id) => {
    const order = preP3Order(id);
    const distributor = layerTotal(order);
    const ports = order.flat().flatMap((node) => node.getPorts());
    expect(ports.map((port) => port.id)).toEqual(ports.map((_, i) => i));
    expect(order.flatMap((layer) => layer.map((node) => node.id))).toEqual(
      order.flatMap((layer) => layer.map((_, n) => n)),
    );
    expect(distributor.getPortRanks().length).toBe(ports.length);
    expect(distributor.getPortRanks().every((rank) => rank === 0)).toBe(true);
  });
});

describe('LayerTotalPortDistributor: rank ranges of the Javadoc', () => {
  it.each(ROW_IDS.map((id) => [id] as const))(
    'ranks output ports 1..n behind the ranks of the earlier nodes on %s',
    (id) => {
      const order = preP3Order(id);
      const distributor = layerTotal(order);
      for (const layer of order) {
        distributor.calculatePortRanks(layer, PortType.OUTPUT);
        let rankSum = 0;
        for (const node of layer) {
          const outputs = portsOf(node, PortType.OUTPUT);
          expect(outputs.map((port) => distributor.getPortRanks()[port.id])).toEqual(
            outputs.map((_, j) => rankSum + j + 1),
          );
          rankSum += outputs.length;
        }
      }
    },
  );

  /** The Javadoc rule for input ports: north ports count down from `rankSum + northCount`, the others from `rankSum + n`. */
  function expectInputRanks(distributor: AbstractBarycenterPortDistributor, layer: LNode[]): void {
    distributor.calculatePortRanks(layer, PortType.INPUT);
    let rankSum = 0;
    for (const node of layer) {
      const inputs = portsOf(node, PortType.INPUT);
      const northCount = inputs.filter((port) => port.getSide() === PortSide.NORTH).length;
      let northPos = rankSum + northCount;
      let restPos = rankSum + inputs.length;
      const expected = inputs.map((port) => (port.getSide() === PortSide.NORTH ? northPos-- : restPos--));
      expect(inputs.map((port) => distributor.getPortRanks()[port.id])).toEqual(expected);
      rankSum += inputs.length;
    }
  }

  it.each(ROW_IDS.map((id) => [id] as const))('ranks input ports counting down from the input count on %s', (id) => {
    const order = preP3Order(id);
    const distributor = layerTotal(order);
    for (const layer of order) {
      expectInputRanks(distributor, layer);
    }
  });

  it('ranks north input ports separately from the other input ports of a node', () => {
    const graph = new LGraph();
    const left = addLayer(graph);
    const right = addLayer(graph);
    const source = addNode(graph);
    source.setLayer(left);
    const target = addNode(graph);
    target.setLayer(right);
    for (const side of [PortSide.NORTH, PortSide.WEST, PortSide.NORTH, PortSide.WEST]) {
      connect(addPort(source, PortSide.EAST), addPort(target, side));
    }
    const order = [[source], [target]];
    const distributor = layerTotal(order);
    expectInputRanks(distributor, [target]);
    expect(portsOf(target, PortType.INPUT).map((port) => port.getSide())).toEqual([
      PortSide.NORTH,
      PortSide.WEST,
      PortSide.NORTH,
      PortSide.WEST,
    ]);
  });

  it('rejects a port type that is neither input nor output', () => {
    const order = preP3Order('scenarios/LayerSweep/crossing');
    const distributor = layerTotal(order);
    expect(() => distributor.calculatePortRanks(order[0]!, PortType.UNDEFINED)).toThrow(IllegalArgumentException);
  });
});

describe('NodeRelativePortDistributor: every node owns the range [i, i+1]', () => {
  it.each(ROW_IDS.map((id) => [id] as const))(
    'ranks output ports at multiples of 1/(n+1) inside the node range on %s',
    (id) => {
      const order = preP3Order(id);
      const distributor = nodeRelative(order);
      for (const layer of order) {
        distributor.calculatePortRanks(layer, PortType.OUTPUT);
        layer.forEach((node, i) => {
          const outputs = portsOf(node, PortType.OUTPUT);
          const incr = Float32.div(1.0, outputs.length + 1);
          let pos = Float32.add(i, incr);
          const expected = outputs.map(() => {
            const value = pos;
            pos = Float32.add(pos, incr);
            return value;
          });
          expect(outputs.map((port) => distributor.getPortRanks()[port.id])).toEqual(expected);
          for (const rank of expected) {
            expect(rank).toBeGreaterThan(i);
            expect(rank).toBeLessThan(i + 1);
          }
        });
      }
    },
  );

  it.each(ROW_IDS.map((id) => [id] as const))('ranks input ports from the top of the node range on %s', (id) => {
    const order = preP3Order(id);
    const distributor = nodeRelative(order);
    for (const layer of order) {
      distributor.calculatePortRanks(layer, PortType.INPUT);
      layer.forEach((node, i) => {
        const inputs = portsOf(node, PortType.INPUT);
        const northCount = inputs.filter((port) => port.getSide() === PortSide.NORTH).length;
        const incr = Float32.div(1.0, inputs.length + 1);
        let northPos = Float32.add(i, Float32.mul(northCount, incr));
        let restPos = Float32.sub(Float32.add(i, 1), incr);
        const expected = inputs.map((port) => {
          const value = port.getSide() === PortSide.NORTH ? northPos : restPos;
          if (port.getSide() === PortSide.NORTH) {
            northPos = Float32.sub(northPos, incr);
          } else {
            restPos = Float32.sub(restPos, incr);
          }
          return value;
        });
        expect(inputs.map((port) => distributor.getPortRanks()[port.id])).toEqual(expected);
      });
    }
  });

  it('rejects a port type that is neither input nor output, naming the problem', () => {
    const order = preP3Order('scenarios/LayerSweep/crossing');
    const distributor = nodeRelative(order);
    expect(() => distributor.calculatePortRanks(order[0]!, PortType.UNDEFINED)).toThrow('Port type is undefined');
  });
});

describe('AbstractBarycenterPortDistributor: distributePortsWhileSweeping', () => {
  /**
   * A fixed layer of three nodes `a`, `b`, `c` (one east port each) and a free layer of node `x` with three west ports
   * fed by `c`, `a` and `b` in that port list order.
   */
  function fanIn(): { order: LNode[][]; x: LNode; ports: LPort[]; sources: LPort[] } {
    const graph = new LGraph();
    const fixed = addLayer(graph);
    const free = addLayer(graph);
    const sources = ['a', 'b', 'c'].map(() => {
      const node = addNode(graph);
      node.setLayer(fixed);
      return addPort(node, PortSide.EAST);
    });
    const x = addNode(graph);
    x.setLayer(free);
    const ports = [2, 0, 1].map((from) => {
      const port = addPort(x, PortSide.WEST);
      connect(sources[from]!, port);
      return port;
    });
    return { order: [sources.map((p) => p.getNode()!), [x]], x, ports, sources };
  }

  it('sorts the free ports of a forward sweep by the ranks of the ports they are fed from', () => {
    const { order, x, ports, sources } = fanIn();
    const distributor = nodeRelative(order);
    expect(distributor.distributePortsWhileSweeping(order, 1, true)).toBe(false);
    const ranks = distributor.getPortRanks();
    // incoming edges count negatively, so a port fed from a higher rank sorts earlier
    expect(x.getPorts()).toEqual(
      [...ports].sort(
        (p, q) => ranks[q.getIncomingEdges()[0]!.getSource()!.id]! - ranks[p.getIncomingEdges()[0]!.getSource()!.id]!,
      ),
    );
    expect(sources.map((port) => port.getNode()!.getPorts())).toEqual(sources.map((port) => [port]));
  });

  it('sorts the free ports of a backward sweep by the ranks of the ports they feed', () => {
    const graph = new LGraph();
    const free = addLayer(graph);
    const fixed = addLayer(graph);
    const targets = [0, 1, 2].map(() => {
      const node = addNode(graph);
      node.setLayer(fixed);
      return addPort(node, PortSide.WEST);
    });
    const x = addNode(graph);
    x.setLayer(free);
    const ports = [2, 0, 1].map((to) => {
      const port = addPort(x, PortSide.EAST);
      connect(port, targets[to]!);
      return port;
    });
    const order = [[x], targets.map((p) => p.getNode()!)];
    const distributor = layerTotal(order);
    expect(distributor.distributePortsWhileSweeping(order, 0, false)).toBe(false);
    // outgoing edges count positively: ascending by the rank of the target
    const ranks = distributor.getPortRanks();
    expect(x.getPorts()).toEqual(
      [...ports].sort(
        (p, q) => ranks[p.getOutgoingEdges()[0]!.getTarget()!.id]! - ranks[q.getOutgoingEdges()[0]!.getTarget()!.id]!,
      ),
    );
    expect(new Set(ports.map((port) => ranks[port.getOutgoingEdges()[0]!.getTarget()!.id])).size).toBe(3);
  });

  it('distributes the ports of the fixed layer on the opposed side, except for nodes with a nested graph', () => {
    const graph = new LGraph();
    const fixed = addLayer(graph);
    const free = addLayer(graph);
    const fixedNodes = [0, 1].map(() => {
      const node = addNode(graph);
      node.setLayer(fixed);
      return node;
    });
    const freeNodes = [0, 1].map(() => {
      const node = addNode(graph);
      node.setLayer(free);
      return node;
    });
    const eastPorts = fixedNodes.map((node) => [addPort(node, PortSide.EAST), addPort(node, PortSide.EAST)] as const);
    const westPorts = freeNodes.map((node) => addPort(node, PortSide.WEST));
    // each fixed node: its first port goes to the later free node, its second to the earlier one
    eastPorts.forEach(([first, second]) => {
      connect(first, westPorts[1]!);
      connect(second, westPorts[0]!);
    });
    fixedNodes[1]!.setNestedGraph(new LGraph());
    const order = [fixedNodes, freeNodes];
    const distributor = nodeRelative(order);
    distributor.distributePortsWhileSweeping(order, 1, true);
    expect(fixedNodes[0]!.getPorts()).toEqual([eastPorts[0]![1], eastPorts[0]![0]]);
    expect(fixedNodes[1]!.getPorts()).toEqual([eastPorts[1]![0], eastPorts[1]![1]]);
  });

  it('distributes the first layer of the sweep with the ranks at hand and leaves FIXED_ORDER nodes alone', () => {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const other = addLayer(graph);
    const helper = addNode(graph);
    helper.setLayer(other);
    const helperPorts = [addPort(helper, PortSide.EAST), addPort(helper, PortSide.EAST)];
    const make = (constraints: PortConstraints): { node: LNode; ports: LPort[] } => {
      const node = addNode(graph);
      node.setLayer(layer);
      node.setProperty(LayeredOptions.PORT_CONSTRAINTS, constraints);
      const ports = [addPort(node, PortSide.WEST), addPort(node, PortSide.WEST)];
      ports.forEach((port, i) => connect(helperPorts[i]!, port));
      return { node, ports };
    };
    const fixedOrder = make(PortConstraints.FIXED_ORDER);
    const free = make(PortConstraints.FIXED_SIDE);
    const order = [[fixedOrder.node, free.node], [helper]];
    const distributor = nodeRelative(order);
    // the first layer of a forward sweep is not ranked by the call: ranks left from an earlier call are used
    const ranks = distributor.getPortRanks();
    ranks[helperPorts[0]!.id] = 1;
    ranks[helperPorts[1]!.id] = 2;
    expect(distributor.distributePortsWhileSweeping(order, 0, true)).toBe(false);
    expect(fixedOrder.node.getPorts()).toEqual(fixedOrder.ports);
    // incoming edges count negatively: the port fed from the higher rank sorts first
    expect(free.node.getPorts()).toEqual([free.ports[1], free.ports[0]]);
    expect([ranks[helperPorts[0]!.id], ranks[helperPorts[1]!.id]]).toEqual([1, 2]);
  });

  /**
   * A layer of `up`, `x`, `down`: `x` has a regular port, fed from (west) or leading to (east) a port of another layer
   * whose rank is set to 5, and an in-layer port connected to `up` or `down`.
   */
  function inLayer(
    side: PortSide,
    towards: 'up' | 'down',
  ): { order: LNode[][]; x: LNode; regular: LPort; inLayerPort: LPort; ranks: Float32Array } {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const other = addLayer(graph);
    const [up, x, down] = [0, 1, 2].map(() => {
      const node = addNode(graph);
      node.setLayer(layer);
      return node;
    }) as [LNode, LNode, LNode];
    const outside = addNode(graph);
    outside.setLayer(other);
    const east = side === PortSide.EAST;
    const outsidePort = addPort(outside, east ? PortSide.WEST : PortSide.EAST);
    const regular = addPort(x, side);
    const inLayerPort = addPort(x, side);
    const neighbour = addPort(towards === 'up' ? up : down, east ? PortSide.WEST : PortSide.EAST);
    if (east) {
      connect(regular, outsidePort);
      connect(inLayerPort, neighbour);
    } else {
      connect(outsidePort, regular);
      connect(neighbour, inLayerPort);
    }
    const order = [layer.getNodes(), [outside]];
    const distributor = nodeRelative(order);
    expect(inLayerPort.id).toBeGreaterThan(regular.id);
    distributor.getPortRanks()[outsidePort.id] = 5;
    // a one-layer sweep: east ports of a backward sweep, west ports of a forward sweep, of the free layer only
    const sweep = [order[0]!];
    distributor.distributePortsWhileSweeping(sweep, 0, !east);
    return { order, x, regular, inLayerPort, ranks: distributor.getPortRanks() };
  }

  it.each([
    ['east port with its in-layer neighbour above', PortSide.EAST, 'up', 'inLayer first'],
    ['east port with its in-layer neighbour below', PortSide.EAST, 'down', 'regular first'],
    ['west port with its in-layer neighbour above', PortSide.WEST, 'up', 'regular first'],
    ['west port with its in-layer neighbour below', PortSide.WEST, 'down', 'inLayer first'],
  ] as const)('places the in-layer port of a %s on its side (%#)', (_name, side, towards, expected) => {
    const { x, regular, inLayerPort } = inLayer(side, towards);
    // the port list runs top to bottom on the east side and bottom to top on the west side (the comments of the Java)
    expect(x.getPorts()).toEqual(expected === 'inLayer first' ? [inLayerPort, regular] : [regular, inLayerPort]);
  });

  /** One layer holding `x` (with ports of the given sides) and the dummies of a north/south test. */
  function northSouth(side: PortSide): {
    order: LNode[][];
    x: LNode;
    ports: Record<'input' | 'output' | 'both', LPort>;
  } {
    const graph = new LGraph();
    const layer = addLayer(graph);
    const other = addLayer(graph);
    const outside = addNode(graph);
    outside.setLayer(other);
    const x = addNode(graph);
    x.setLayer(layer);
    const dummyFor = (kind: 'input' | 'output' | 'both'): LPort => {
      const port = addPort(x, side);
      const dummy = addNode(graph, NodeType.NORTH_SOUTH_PORT);
      dummy.setLayer(layer);
      port.setProperty(InternalProperties.PORT_DUMMY, dummy);
      const dummyPort = addPort(dummy, PortSide.WEST);
      dummyPort.setProperty(InternalProperties.ORIGIN, port);
      if (kind !== 'input') {
        connect(dummyPort, addPort(outside, PortSide.WEST));
      } else {
        connect(addPort(outside, PortSide.EAST), dummyPort);
      }
      if (kind === 'both') {
        // a port of the dummy is either an input or an output port: the Java takes the first output, so `both` needs
        // a second dummy port with the other direction
        const second = addPort(dummy, PortSide.EAST);
        second.setProperty(InternalProperties.ORIGIN, port);
        connect(addPort(outside, PortSide.EAST), second);
      }
      return port;
    };
    const ports = { input: dummyFor('input'), output: dummyFor('output'), both: dummyFor('both') };
    // a port without a dummy is skipped and keeps barycenter 0
    addPort(x, side);
    return { order: [layer.getNodes()], x, ports };
  }

  it('sorts northern ports: both directions, then input ports, then output ports', () => {
    const { order, x, ports } = northSouth(PortSide.NORTH);
    const distributor = nodeRelative(order);
    distributor.distributePortsWhileSweeping(order, 0, true);
    const named = (port: LPort): string => Object.entries(ports).find(([, p]) => p === port)?.[0] ?? 'plain';
    // a barycenter of exactly 0 sorts before every other value (the comparator's zero rule): both and the plain port
    // first, then the input port (negative), then the output port (positive)
    expect(x.getPorts().map(named)).toEqual(['both', 'plain', 'input', 'output']);
  });

  it('sorts southern ports: output ports, then both directions, then input ports', () => {
    const { order, x, ports } = northSouth(PortSide.SOUTH);
    const distributor = layerTotal(order);
    distributor.distributePortsWhileSweeping(order, 0, true);
    const named = (port: LPort): string => Object.entries(ports).find(([, p]) => p === port)?.[0] ?? 'plain';
    expect(x.getPorts().map(named)).toEqual(['plain', 'output', 'both', 'input']);
  });
});
