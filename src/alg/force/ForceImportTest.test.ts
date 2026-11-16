// SPDX-License-Identifier: EPL-2.0
/*
 * Port of ForceImportTest (FD8): tests related to importing an ElkGraph into an FGraph. The Hamcrest
 * `assertThat(actual, is(expected))` on `int`s is `expect(actual).toBe(expected)`.
 *
 * @see org.eclipse.elk.alg.force.test/src/org/eclipse/elk/alg/force/test/ForceImportTest.java
 */
import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { ComponentsProcessor } from './ComponentsProcessor.js';
import { ElkGraphImporter } from './ElkGraphImporter.js';
import type { FGraph } from './graph/FGraph.js';
import { ForceOptions } from './options/ForceOptions.js';

function checkSimpleGraph(fGraph: FGraph): void {
  expect(fGraph.getNodes().length).toBe(3);
  expect(fGraph.getEdges().length).toBe(2);
  expect(fGraph.getLabels().length).toBe(2);
}

function createElkGraph(): ElkNode {
  const elkGraph = ElkGraphUtil.createGraph();
  const n1 = ElkGraphUtil.createNode(elkGraph);
  const n2 = ElkGraphUtil.createNode(elkGraph);
  const n3 = ElkGraphUtil.createNode(elkGraph);
  const edge = ElkGraphUtil.createSimpleEdge(n1, n2);
  ElkGraphUtil.createLabelWithText('test', edge);
  const edge2 = ElkGraphUtil.createSimpleEdge(n1, n3);
  ElkGraphUtil.createLabelWithText('test2', edge2);
  return elkGraph;
}

function createSimpleGraph(): FGraph {
  const importer = new ElkGraphImporter();
  return importer.importGraph(createElkGraph());
}

function createTwoComponentsGraph(): FGraph {
  const g1 = createElkGraph();
  const g2 = createElkGraph();
  const graph = ElkGraphUtil.createGraph();
  graph.getChildren().addAll(g1.getChildren());
  graph.getChildren().addAll(g2.getChildren());
  const importer = new ElkGraphImporter();
  return importer.importGraph(graph);
}

describe('ForceImportTest', () => {
  it('testImport: importing a simple graph', () => {
    const fGraph = createSimpleGraph();
    checkSimpleGraph(fGraph);
  });

  it('testSeparateConnectedComponents: connected components are split when desired', () => {
    const cp = new ComponentsProcessor();
    const graph = createTwoComponentsGraph();
    graph.setProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS, true);
    const graphs = cp.split(graph);
    expect(graphs.length).toBe(2);
    graphs.forEach((g) => {
      checkSimpleGraph(g);
    });
  });

  it('testDoNotSeparateConnectedComponents: a single FGraph is imported if components shall not be split', () => {
    const cp = new ComponentsProcessor();
    const graph = createTwoComponentsGraph();
    graph.setProperty(ForceOptions.SEPARATE_CONNECTED_COMPONENTS, false);
    const graphs = cp.split(graph);
    expect(graphs.length).toBe(1);

    const fGraph = graphs[0]!;
    expect(fGraph.getNodes().length).toBe(6);
    expect(fGraph.getEdges().length).toBe(4);
    expect(fGraph.getLabels().length).toBe(4);
  });
});
