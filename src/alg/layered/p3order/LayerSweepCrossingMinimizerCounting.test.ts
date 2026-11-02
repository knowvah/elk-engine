// SPDX-License-Identifier: EPL-2.0
// Unit cases of the counting functions of LayerSweepCrossingMinimizer (java:334-448; mission 7c, T7), decided by hand
// from the Java. The model-order part of `countCurrentNumberOfCrossingsNodePortOrder` runs in the replay of
// `scenarios/LayerSweep/model-order-influence` and the other rows with a crossing-counter influence (see
// LayerSweepCrossingMinimizer.test.ts); the recursion into child graphs is U until 7h and is exercised through the
// hand-built nested graph of LayerSweepCrossingMinimizerSweep.test.ts.
import { beforeAll, describe, expect, it } from 'vitest';
import { addLayer, addNode, addPort, connect } from '../../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { EnumSet } from '../../../java/util/EnumSet.js';
import { Random } from '../../../java/util/Random.js';
import { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { GraphProperties } from '../options/GraphProperties.js';
import { GroupOrderStrategy } from '../options/GroupOrderStrategy.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { OrderingStrategy } from '../options/OrderingStrategy.js';
import { GraphInfoHolder } from './GraphInfoHolder.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from './LayerSweepCrossingMinimizerCrossMinType.js';
import {
  countCurrentNumberOfCrossings,
  countCurrentNumberOfCrossingsNodePortOrder,
  countModelOrderNodeChanges,
  countModelOrderPortChanges,
} from './LayerSweepCrossingMinimizerCounting.js';

beforeAll(() => LayoutMetaDataService.initElkReflect());

/** Layers [a, b] | [u, l] with the edges b-u and a-l (one crossing), or a-u and b-l (none). */
function twoLayers(crossed: boolean): { holder: GraphInfoHolder; order: LNode[][] } {
  const graph = new LGraph();
  graph.setProperty(InternalProperties.GRAPH_PROPERTIES, EnumSet.noneOf(GraphProperties));
  graph.setProperty(InternalProperties.RANDOM, new Random(1));
  const layers = [addLayer(graph), addLayer(graph)];
  const make = (layer: (typeof layers)[number], side: PortSide): { node: LNode; port: ReturnType<typeof addPort> } => {
    const node = addNode(graph);
    node.setLayer(layer);
    const port = addPort(node, side);
    node.cachePortSides();
    return { node, port };
  };
  const [a, b] = [make(layers[0]!, PortSide.EAST), make(layers[0]!, PortSide.EAST)];
  const [u, l] = [make(layers[1]!, PortSide.WEST), make(layers[1]!, PortSide.WEST)];
  // the port counter unboxes the MODEL_ORDER of every outgoing edge, as SortByInputModelProcessor leaves it
  connect(crossed ? b.port : a.port, u.port).setProperty(InternalProperties.MODEL_ORDER, 0);
  connect(crossed ? a.port : b.port, l.port).setProperty(InternalProperties.MODEL_ORDER, 1);
  return {
    holder: new GraphInfoHolder(graph, CrossMinType.MEDIAN, []),
    order: [
      [a.node, b.node],
      [u.node, l.node],
    ],
  };
}

describe('countCurrentNumberOfCrossings', () => {
  it('counts the one crossing of the crossed graph and none of the uncrossed one', () => {
    const crossed = twoLayers(true).holder;
    const uncrossed = twoLayers(false).holder;
    expect(countCurrentNumberOfCrossings([crossed], crossed)).toBe(1);
    expect(countCurrentNumberOfCrossings([uncrossed], uncrossed)).toBe(0);
  });
});

describe('countCurrentNumberOfCrossingsNodePortOrder', () => {
  it('equals the crossing count when no model order is considered (java:420-435)', () => {
    const { holder } = twoLayers(true);
    expect(holder.lGraph().getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY)).toBe(OrderingStrategy.NONE);
    expect(countCurrentNumberOfCrossingsNodePortOrder([holder], holder)).toBe(1);
  });

  it('adds nothing for nodes without a model order even when the strategy and the influences are set', () => {
    const { holder } = twoLayers(true);
    holder.lGraph().setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.NODES_AND_EDGES);
    holder.lGraph().setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_NODE_INFLUENCE, 0.5);
    holder.lGraph().setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_CROSSING_COUNTER_PORT_INFLUENCE, 0.25);
    expect(countCurrentNumberOfCrossingsNodePortOrder([holder], holder)).toBe(1);
  });
});

describe('countModelOrderNodeChanges and countModelOrderPortChanges', () => {
  it('count no node pair when no node has a model order (java:343-352: hasProperty gates the comparison)', () => {
    const { holder, order } = twoLayers(true);
    expect(
      countModelOrderNodeChanges(holder.lGraph(), order, OrderingStrategy.NODES_AND_EDGES, GroupOrderStrategy.ENFORCED),
    ).toBe(0);
  });

  it('count a pair of nodes that are out of model order once, per the comparator', () => {
    const { holder, order } = twoLayers(true);
    // layer 1 is [u, l]: u has the later model order, so (u, l) is wrong; the first layer is in order
    order[0]![0]!.setProperty(InternalProperties.MODEL_ORDER, 0);
    order[0]![1]!.setProperty(InternalProperties.MODEL_ORDER, 1);
    order[1]![0]!.setProperty(InternalProperties.MODEL_ORDER, 3);
    order[1]![1]!.setProperty(InternalProperties.MODEL_ORDER, 2);
    holder.lGraph().setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.NODES_AND_EDGES);
    expect(
      countModelOrderNodeChanges(
        holder.lGraph(),
        order,
        OrderingStrategy.NODES_AND_EDGES,
        GroupOrderStrategy.ONLY_WITHIN_GROUP,
      ),
    ).toBe(1);
  });

  it('count no port pair for nodes with a single port each', () => {
    const { holder, order } = twoLayers(true);
    expect(countModelOrderPortChanges(holder.lGraph(), order, GroupOrderStrategy.ENFORCED)).toBe(0);
  });
});
