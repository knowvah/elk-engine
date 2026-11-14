// SPDX-License-Identifier: EPL-2.0
import {
  BasicProgressMonitor,
  CoreOptions,
  Direction,
  ElkGraphUtil,
  LayeredMetaDataProvider,
  LayeredOptions,
  LayoutMetaDataService,
  RecursiveGraphLayoutEngine,
} from '@knowvah/elk-engine';
import type { ElkNode } from '@knowvah/elk-engine';

function addNode(graph: ElkNode, id: string): ElkNode {
  const node = ElkGraphUtil.createNode(graph);
  node.setIdentifier(id);
  node.setDimensions(80, 40);
  return node;
}

/** Builds a four-node diamond with the ElkGraph factories. Nothing is laid out yet. */
export function buildGraph(): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  graph.setIdentifier('root');
  graph.setProperty(CoreOptions.ALGORITHM, LayeredOptions.ALGORITHM_ID);
  graph.setProperty(CoreOptions.DIRECTION, Direction.DOWN);

  const n1 = addNode(graph, 'n1');
  const n2 = addNode(graph, 'n2');
  const n3 = addNode(graph, 'n3');
  const n4 = addNode(graph, 'n4');
  ElkGraphUtil.createSimpleEdge(n1, n2).setIdentifier('e1');
  ElkGraphUtil.createSimpleEdge(n1, n3).setIdentifier('e2');
  ElkGraphUtil.createSimpleEdge(n2, n4).setIdentifier('e3');
  ElkGraphUtil.createSimpleEdge(n3, n4).setIdentifier('e4');
  return graph;
}

/** Lays the graph out in place: every node gets a position, every edge a routed section. */
export function buildAndLayout(): ElkNode {
  // The port has no ServiceLoader: register the provider of each algorithm you use, once.
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());

  const graph = buildGraph();
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return graph;
}
