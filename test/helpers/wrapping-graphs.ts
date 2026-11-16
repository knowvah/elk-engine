// SPDX-License-Identifier: EPL-2.0
import type { LGraph as LGraphType } from '../../src/alg/layered/graph/LGraph.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { Random } from '../../src/java/util/Random.js';
import { addLayer, addNode, addPort, connect } from './lgraph-builders.js';
import { PortSide } from '../../src/core/options/PortSide.js';

/** Upper bounds of the generated shapes (generator parameters, not expectations). */
const MAX_LAYERS = 6;
const MAX_NODES_PER_LAYER = 4;
const MAX_EXTENT = 40;
const MAX_MARGIN = 5;

/**
 * A layered graph with seeded pseudo-random layer counts, node counts, node sizes and margins and one edge between each
 * node and a node of the previous layer. The generator only supplies inputs: tests compare the port with a twin
 * transcription of the Java, never with numbers read off this graph by hand.
 */
export function randomLayeredGraph(seed: number): LGraphType {
  const rnd = new Random(seed);
  const graph = new LGraph();
  const layerCount = 1 + rnd.nextInt(MAX_LAYERS);
  let previous: LNode[] = [];
  for (let l = 0; l < layerCount; l++) {
    const layer = addLayer(graph);
    const current: LNode[] = [];
    const nodeCount = 1 + rnd.nextInt(MAX_NODES_PER_LAYER);
    for (let k = 0; k < nodeCount; k++) {
      const node = addNode(graph, NodeType.NORMAL);
      graph.getLayerlessNodes().pop();
      node.setLayer(layer);
      node.getSize().x = rnd.nextDouble() * MAX_EXTENT;
      node.getSize().y = rnd.nextDouble() * MAX_EXTENT;
      const margin = node.getMargin();
      margin.top = rnd.nextDouble() * MAX_MARGIN;
      margin.bottom = rnd.nextDouble() * MAX_MARGIN;
      margin.left = rnd.nextDouble() * MAX_MARGIN;
      margin.right = rnd.nextDouble() * MAX_MARGIN;
      if (previous.length > 0) {
        const source = previous[rnd.nextInt(previous.length)]!;
        connect(addPort(source, PortSide.EAST), addPort(node, PortSide.WEST));
      }
      current.push(node);
    }
    previous = current;
  }
  return graph;
}
