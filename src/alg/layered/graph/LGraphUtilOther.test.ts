// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addNode } from '../../../../test/helpers/lgraph-builders.js';
import { Direction } from '../../../core/options/Direction.js';
import { IndividualSpacings } from '../../../core/util/IndividualSpacings.js';
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LGraph } from './LGraph.js';
import { getDirection, getIndividualOrInherited, getMinimalModelOrder } from './LGraphUtilOther.js';
import { LNode } from './LNode.js';

beforeAll(() => {
  LayoutMetaDataService.getInstance();
});

const GRAPH_SPACING = 11;
const INDIVIDUAL_SPACING = 22;

describe('getIndividualOrInherited', () => {
  it('returns the value set on the graph when the node has no individual spacings', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.SPACING_NODE_NODE, GRAPH_SPACING);
    const node = addNode(graph);
    expect(getIndividualOrInherited(node, LayeredOptions.SPACING_NODE_NODE)).toBe(GRAPH_SPACING);
  });

  it('returns the individual value when the node sets that property', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.SPACING_NODE_NODE, GRAPH_SPACING);
    const node = addNode(graph);
    const individual = new IndividualSpacings();
    individual.setProperty(LayeredOptions.SPACING_NODE_NODE, INDIVIDUAL_SPACING);
    node.setProperty(LayeredOptions.SPACING_INDIVIDUAL, individual);
    expect(getIndividualOrInherited(node, LayeredOptions.SPACING_NODE_NODE)).toBe(INDIVIDUAL_SPACING);
  });

  it('falls back to the graph for a property the individual spacings do not set', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.SPACING_EDGE_NODE, GRAPH_SPACING);
    const node = addNode(graph);
    const individual = new IndividualSpacings();
    individual.setProperty(LayeredOptions.SPACING_NODE_NODE, INDIVIDUAL_SPACING);
    node.setProperty(LayeredOptions.SPACING_INDIVIDUAL, individual);
    expect(getIndividualOrInherited(node, LayeredOptions.SPACING_EDGE_NODE)).toBe(GRAPH_SPACING);
  });

  it('is null when nothing is set and the node has no graph', () => {
    expect(getIndividualOrInherited(new LNode(null), LayeredOptions.SPACING_NODE_NODE)).toBeNull();
  });
});

describe('getDirection', () => {
  it('returns an explicitly set direction unchanged', () => {
    for (const direction of [Direction.RIGHT, Direction.LEFT, Direction.DOWN, Direction.UP]) {
      const graph = new LGraph();
      graph.setProperty(LayeredOptions.DIRECTION, direction);
      graph.setProperty(LayeredOptions.ASPECT_RATIO, 0.1);
      expect(getDirection(graph)).toBe(direction);
    }
  });

  it('chooses RIGHT for an undefined direction and an aspect ratio of at least 1', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.DIRECTION, Direction.UNDEFINED);
    graph.setProperty(LayeredOptions.ASPECT_RATIO, 1);
    expect(getDirection(graph)).toBe(Direction.RIGHT);
    graph.setProperty(LayeredOptions.ASPECT_RATIO, 3);
    expect(getDirection(graph)).toBe(Direction.RIGHT);
  });

  it('chooses DOWN for an undefined direction and an aspect ratio below 1', () => {
    const graph = new LGraph();
    graph.setProperty(LayeredOptions.DIRECTION, Direction.UNDEFINED);
    graph.setProperty(LayeredOptions.ASPECT_RATIO, 0.5);
    expect(getDirection(graph)).toBe(Direction.DOWN);
  });
});

describe('getMinimalModelOrder', () => {
  it('is Integer.MAX_VALUE for a graph without model orders', () => {
    const graph = new LGraph();
    expect(getMinimalModelOrder(graph)).toBe(JavaInteger.MAX_VALUE);
    addNode(graph);
    expect(getMinimalModelOrder(graph)).toBe(JavaInteger.MAX_VALUE);
  });

  it('is the smallest model order among the nodes that have one', () => {
    const graph = new LGraph();
    for (const order of [5, 3, 8]) {
      addNode(graph).setProperty(InternalProperties.MODEL_ORDER, order);
    }
    addNode(graph);
    expect(getMinimalModelOrder(graph)).toBe(3);
  });
});
