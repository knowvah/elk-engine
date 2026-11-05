// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addNode } from '../../../test/helpers/lgraph-builders.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { UnsupportedGraphException } from '../../core/UnsupportedGraphException.js';
import { collectAllGraphsBottomUp, reviewAndCorrectHierarchicalProcessors } from './ElkLayeredHierarchy.js';
import { LGraph } from './graph/LGraph.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { GreedySwitchType } from './options/GreedySwitchType.js';
import { LayeredOptions } from './options/LayeredOptions.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

/** A graph with one node per given nested graph; returns the nested graphs' owners' graph. */
function parentOf(...nested: LGraph[]): LGraph {
  const graph = new LGraph();
  for (const child of nested) {
    const node = addNode(graph);
    node.setNestedGraph(child);
    child.setParentNode(node);
  }
  return graph;
}

describe('collectAllGraphsBottomUp (ElkLayered.java:308-325)', () => {
  it('returns just the root for a flat graph', () => {
    const root = new LGraph();
    addNode(root);
    expect(collectAllGraphsBottomUp(root)).toEqual([root]);
  });

  it('puts every graph in front of the graphs collected before it, so the deepest comes first', () => {
    const leaf = new LGraph();
    const middle = parentOf(leaf);
    const root = parentOf(middle);
    const collected = collectAllGraphsBottomUp(root);
    expect(collected[0]).toBe(leaf);
    expect(collected[1]).toBe(middle);
    expect(collected[2]).toBe(root);
    expect(collected).toHaveLength(3);
  });

  it('visits siblings last-in-first-out and pushes each in front', () => {
    const first = new LGraph();
    const second = new LGraph();
    const root = parentOf(first, second);
    const collected = collectAllGraphsBottomUp(root);
    expect(collected[0]).toBe(second);
    expect(collected[1]).toBe(first);
    expect(collected[2]).toBe(root);
  });
});

describe('reviewAndCorrectHierarchicalProcessors (ElkLayered.java:336-354)', () => {
  it('copies the root hierarchical greedy switch type to every graph', () => {
    const root = new LGraph();
    const child = new LGraph();
    root.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE, GreedySwitchType.ONE_SIDED);
    child.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE, GreedySwitchType.TWO_SIDED);
    reviewAndCorrectHierarchicalProcessors(root, [child, root]);
    expect(child.getProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE)).toBe(
      GreedySwitchType.ONE_SIDED,
    );
  });

  it('rejects a child whose crossing minimization differs from the root', () => {
    const root = new LGraph();
    const child = new LGraph();
    child.setProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY, CrossingMinimizationStrategy.NONE);
    const thrown = (): void => reviewAndCorrectHierarchicalProcessors(root, [child, root]);
    expect(thrown).toThrow(UnsupportedGraphException);
    expect(thrown).toThrow(
      `The hierarchy aware processor NONE in child node ${child.toString()} is only allowed if the root node specifies the same hierarchical processor.`,
    );
  });
});
