// SPDX-License-Identifier: EPL-2.0
// Unit cases of CrossingMatrixFiller (mission 7c, T7), counted by hand from CrossingMatrixFiller.java:53-78; the
// greedy-switch rows (GreedySwitchHeuristic.test.ts) prove the class on the oracle's graphs.
import { describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../../test/helpers/lgraph-builders.js';
import { PortSide } from '../../../../core/options/PortSide.js';
import { LGraph } from '../../graph/LGraph.js';
import type { LNode } from '../../graph/LNode.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { CrossingMatrixFiller } from './CrossingMatrixFiller.js';
import { SwitchDeciderCrossingCountSide as CrossingCountSide } from './SwitchDeciderCrossingCountSide.js';

/**
 * Layers [a, b] | [u, l] | [c, d]: the west edges b-u and a-l cross, the east edges u-d and l-c cross too. The node
 * ids of the free layer are 0 and 1, as the class requires.
 */
function threeLayers(): { order: LNode[][]; u: LNode; l: LNode } {
  const graph = new LGraph();
  const layers = [addLayer(graph), addLayer(graph), addLayer(graph)];
  const make = (
    layer: (typeof layers)[number],
    sides: PortSide[],
  ): { node: LNode; ports: ReturnType<typeof addPort>[] } => {
    const node = addNode(graph);
    node.setLayer(layer);
    const ports = sides.map((side) => addPort(node, side));
    node.cachePortSides();
    return { node, ports };
  };
  const a = make(layers[0]!, [PortSide.EAST]);
  const b = make(layers[0]!, [PortSide.EAST]);
  const u = make(layers[1]!, [PortSide.EAST, PortSide.WEST]);
  const l = make(layers[1]!, [PortSide.EAST, PortSide.WEST]);
  const c = make(layers[2]!, [PortSide.WEST]);
  const d = make(layers[2]!, [PortSide.WEST]);
  connect(b.ports[0]!, u.ports[1]!);
  connect(a.ports[0]!, l.ports[1]!);
  connect(u.ports[0]!, d.ports[0]!);
  connect(l.ports[0]!, c.ports[0]!);
  u.node.id = 0;
  l.node.id = 1;
  return {
    order: [
      [a.node, b.node],
      [u.node, l.node],
      [c.node, d.node],
    ],
    u: u.node,
    l: l.node,
  };
}

describe('CrossingMatrixFiller', () => {
  it('fills an entry on demand: the one-sided west count sees only the west crossing', () => {
    const { order, u, l } = threeLayers();
    const filler = new CrossingMatrixFiller(CrossMinType.ONE_SIDED_GREEDY_SWITCH, order, 1, CrossingCountSide.WEST);
    expect(filler.getCrossingMatrixEntry(u, l)).toBe(1);
    expect(filler.getCrossingMatrixEntry(l, u)).toBe(0);
  });

  it('the one-sided east count sees only the east crossing', () => {
    const { order, u, l } = threeLayers();
    const filler = new CrossingMatrixFiller(CrossMinType.ONE_SIDED_GREEDY_SWITCH, order, 1, CrossingCountSide.EAST);
    expect(filler.getCrossingMatrixEntry(u, l)).toBe(1);
    expect(filler.getCrossingMatrixEntry(l, u)).toBe(0);
  });

  it('the two-sided count adds both sides and ignores the direction', () => {
    const { order, u, l } = threeLayers();
    const filler = new CrossingMatrixFiller(CrossMinType.TWO_SIDED_GREEDY_SWITCH, order, 1, CrossingCountSide.WEST);
    expect(filler.getCrossingMatrixEntry(u, l)).toBe(2);
    expect(filler.getCrossingMatrixEntry(l, u)).toBe(0);
  });

  it('keeps a filled entry: the second request answers from the matrix of the first', () => {
    const { order, u, l } = threeLayers();
    const filler = new CrossingMatrixFiller(CrossMinType.TWO_SIDED_GREEDY_SWITCH, order, 1, CrossingCountSide.EAST);
    expect(filler.getCrossingMatrixEntry(l, u)).toBe(0);
    // removing the edges does not change what was filled (both directions were set by the first fill)
    l.getPorts().forEach((port) => [...port.getConnectedEdges()].forEach((edge) => edge.setSource(null)));
    expect(filler.getCrossingMatrixEntry(u, l)).toBe(2);
  });
});
