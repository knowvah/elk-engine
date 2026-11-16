// SPDX-License-Identifier: EPL-2.0
import {
  BasicProgressMonitor,
  CoreOptions,
  ElkGraphUtil,
  LayoutMetaDataService,
  MrTreeMetaDataProvider,
  MrTreeOptions,
  RecursiveGraphLayoutEngine,
} from '@knowvah/elk-engine';
import type { ElkNode } from '@knowvah/elk-engine';

function addNode(graph: ElkNode, id: string): ElkNode {
  const node = ElkGraphUtil.createNode(graph);
  node.setIdentifier(id);
  node.setDimensions(60, 30);
  return node;
}

/** Builds a six-node reporting tree for the Mr. Tree algorithm. Nothing is laid out yet. */
export function buildTree(): ElkNode {
  const graph = ElkGraphUtil.createGraph();
  graph.setIdentifier('root');
  graph.setProperty(CoreOptions.ALGORITHM, MrTreeOptions.ALGORITHM_ID);
  graph.setProperty(CoreOptions.SPACING_NODE_NODE, 30);

  const ceo = addNode(graph, 'ceo');
  const cto = addNode(graph, 'cto');
  const cfo = addNode(graph, 'cfo');
  const dev1 = addNode(graph, 'dev1');
  const dev2 = addNode(graph, 'dev2');
  const acct = addNode(graph, 'acct');
  ElkGraphUtil.createSimpleEdge(ceo, cto).setIdentifier('e1');
  ElkGraphUtil.createSimpleEdge(ceo, cfo).setIdentifier('e2');
  ElkGraphUtil.createSimpleEdge(cto, dev1).setIdentifier('e3');
  ElkGraphUtil.createSimpleEdge(cto, dev2).setIdentifier('e4');
  ElkGraphUtil.createSimpleEdge(cfo, acct).setIdentifier('e5');
  return graph;
}

/** Lays the tree out in place with Mr. Tree, an algorithm other than layered. */
export function layoutTree(): ElkNode {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new MrTreeMetaDataProvider());

  const graph = buildTree();
  new RecursiveGraphLayoutEngine().layout(graph, new BasicProgressMonitor());
  return graph;
}
