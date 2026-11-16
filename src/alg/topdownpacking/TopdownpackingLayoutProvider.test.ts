// SPDX-License-Identifier: EPL-2.0
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import '../../core/options/CoreOptions.js';
import { describe, expect, it } from 'vitest';
import { AbstractLayoutProvider } from '../../core/AbstractLayoutProvider.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { BasicProgressMonitor } from '../../core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { BottomRowEqualWhitespaceEliminator } from './BottomRowEqualWhitespaceEliminator.js';
import { GridElkNode } from './GridElkNode.js';
import { LeftRightTopDownNodePlacer } from './LeftRightTopDownNodePlacer.js';
import { NodeArrangementStrategy } from './NodeArrangementStrategy.js';
import { TopdownpackingLayoutProvider } from './TopdownpackingLayoutProvider.js';
import { WhitespaceEliminationStrategy } from './WhitespaceEliminationStrategy.js';
import { TopdownpackingOptions } from './options/TopdownpackingOptions.js';

function graphWith(count: number): ElkNode {
  // the service registers the ElkReflect cloners the padding default needs (Java: PlainJavaInitialization)
  LayoutMetaDataService.getInstance();
  const root = ElkGraphUtil.createGraph();
  for (let i = 0; i < count; i++) {
    ElkGraphUtil.createNode(root);
  }
  return root;
}

describe('TopdownpackingLayoutProvider', () => {
  it('is a layout provider with a size prediction (ITopdownLayoutProvider)', () => {
    const provider = new TopdownpackingLayoutProvider();
    expect(provider).toBeInstanceOf(AbstractLayoutProvider);
    expect(typeof provider.getPredictedGraphSize).toBe('function');
  });

  it('assembleAlgorithm builds the two phases in phase order from the configured strategies (:59-68)', () => {
    const graph = graphWith(1);
    graph.setProperty(
      TopdownpackingOptions.NODE_ARRANGEMENT_STRATEGY,
      NodeArrangementStrategy.LEFT_RIGHT_TOP_DOWN_NODE_PLACER,
    );
    graph.setProperty(
      TopdownpackingOptions.WHITESPACE_ELIMINATION_STRATEGY,
      WhitespaceEliminationStrategy.BOTTOM_ROW_EQUAL_WHITESPACE_ELIMINATOR,
    );
    const algorithm = new TopdownpackingLayoutProvider().assembleAlgorithm(new GridElkNode(graph));
    expect(algorithm).toHaveLength(2);
    expect(algorithm[0]).toBeInstanceOf(LeftRightTopDownNodePlacer);
    expect(algorithm[1]).toBeInstanceOf(BottomRowEqualWhitespaceEliminator);
  });

  it('getPredictedGraphSize is the size the node arrangement strategy predicts (:74-78)', () => {
    const graph = graphWith(5);
    const predicted = new TopdownpackingLayoutProvider().getPredictedGraphSize(graph);
    const direct = new LeftRightTopDownNodePlacer().getPredictedSize(graph);
    expect([predicted.x, predicted.y]).toEqual([direct.x, direct.y]);
  });

  it('layout runs one subtask per processor, wrapping the layout graph', () => {
    const graph = graphWith(3);
    const monitor = new BasicProgressMonitor();
    new TopdownpackingLayoutProvider().layout(graph, monitor);
    expect(monitor.getSubMonitors().map((sub) => sub.getTaskName())).toEqual([
      'Node placement',
      'Whitespace elimination',
    ]);
    expect(monitor.isRunning()).toBe(false);
  });
});
