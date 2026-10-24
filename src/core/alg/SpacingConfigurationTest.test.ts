// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { isElkNode } from '../../graph/ElkNode.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { LayoutMetaDataService } from '../data/LayoutMetaDataService.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { ElkSpacings, ElkCoreSpacingsBuilder } from '../util/ElkSpacings.js';
import { ElkUtil } from '../util/ElkUtil.js';
import type { IGraphElementVisitor } from '../util/IGraphElementVisitor.js';

/**
 * Test the utility class {@link ElkSpacings}, which allows to conveniently configure spacings for the overall graph.
 *
 * @see org.eclipse.elk.core.test/src/org/eclipse/elk/core/alg/SpacingConfigurationTest.java
 */

const DOUBLE_EQ_EPSILON = 10e-5;

beforeAll(() => {
  // PlainJavaInitialization.initializePlainJavaLayout()
  LayoutMetaDataService.unload();
  LayoutMetaDataService.getInstance();
});

/** Create a simple test graph: two sized nodes and an edge between them. */
function createSimpleGraph(): ElkNode {
  const graph = ElkGraphUtil.createGraph();

  const node1 = ElkGraphUtil.createNode(graph);
  node1.setWidth(30);
  node1.setHeight(30);

  const node2 = ElkGraphUtil.createNode(graph);
  node2.setWidth(30);
  node2.setHeight(30);

  ElkGraphUtil.createSimpleEdge(node1, node2);

  return graph;
}

function createAndConfigureTestGraph(configurator: IGraphElementVisitor): ElkNode {
  const simpleGraph = createSimpleGraph();
  ElkUtil.applyVisitors(simpleGraph, configurator);
  return simpleGraph;
}

/** assertEquals(expected, actual, DOUBLE_EQ_EPSILON) */
function expectNear(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(DOUBLE_EQ_EPSILON);
}

/** It's important to also check the root node here. */
function checkOptionValue(graph: ElkNode, option: IProperty<number>, value: number): void {
  let checked = 0;
  for (const e of ElkGraphUtil.propertiesSkippingIteratorFor(graph, true)) {
    if (isElkNode(e) && isElkGraphElement(e)) {
      expectNear((e as ElkGraphElement).getProperty(option), value);
      checked++;
    }
  }
  expect(checked).toBe(3);
}

describe('Basics', () => {
  it('testCreateVisitor', () => {
    const node = ElkGraphUtil.createNode(null);
    const visitor = ElkSpacings.withBaseValue(3.0).toVisitor();
    visitor.visit(node);
    expectNear(node.getProperty(ElkCoreSpacingsBuilder.BASE_SPACING_OPTION), 3.0);
  });

  it('testApplyTo', () => {
    const node = ElkGraphUtil.createNode(null);
    ElkSpacings.withBaseValue(3.0).apply(node);
    expectNear(node.getProperty(ElkCoreSpacingsBuilder.BASE_SPACING_OPTION), 3.0);
  });

  it('testSpacingWithNegativeFactor', () => {
    expect(() =>
      createAndConfigureTestGraph(
        ElkSpacings.withBaseValue(33.0).withFactor(CoreOptions.SPACING_EDGE_EDGE, -Number.MIN_VALUE).toVisitor(),
      ),
    ).toThrow(IllegalArgumentException);
  });

  it('testSpacingWithNegativeValue', () => {
    expect(() =>
      createAndConfigureTestGraph(
        ElkSpacings.withBaseValue(33.0).withValue(CoreOptions.SPACING_EDGE_EDGE, -Number.MIN_VALUE).toVisitor(),
      ),
    ).toThrow(IllegalArgumentException);
  });
});

/** Tests the basic functionality of `withFactor` and `withValue`. */
describe('WithFactorAndValueTest', () => {
  const options: [string, () => IProperty<number>][] = [
    ['SPACING_COMPONENT_COMPONENT', () => CoreOptions.SPACING_COMPONENT_COMPONENT],
    ['SPACING_EDGE_EDGE', () => CoreOptions.SPACING_EDGE_EDGE],
    ['SPACING_EDGE_LABEL', () => CoreOptions.SPACING_EDGE_LABEL],
    ['SPACING_EDGE_NODE', () => CoreOptions.SPACING_EDGE_NODE],
    ['SPACING_LABEL_LABEL', () => CoreOptions.SPACING_LABEL_LABEL],
    ['SPACING_LABEL_NODE', () => CoreOptions.SPACING_LABEL_NODE],
    ['SPACING_LABEL_PORT_HORIZONTAL', () => CoreOptions.SPACING_LABEL_PORT_HORIZONTAL],
    ['SPACING_LABEL_PORT_VERTICAL', () => CoreOptions.SPACING_LABEL_PORT_VERTICAL],
    ['SPACING_NODE_SELF_LOOP', () => CoreOptions.SPACING_NODE_SELF_LOOP],
    ['SPACING_PORT_PORT', () => CoreOptions.SPACING_PORT_PORT],
  ];

  describe.each(options)('%s', (_name, option) => {
    it('testDefaultFactors', () => {
      const optionToTest = option();
      const builder = ElkSpacings.withBaseValue(33.0);
      const value = builder.getFactors().get(optionToTest) as number;
      expectNear(value, optionToTest.getDefault() / ElkCoreSpacingsBuilder.BASE_SPACING_OPTION.getDefault());
    });

    it('testSpacingWithFactor', () => {
      const optionToTest = option();
      const graph = createAndConfigureTestGraph(
        ElkSpacings.withBaseValue(33.0).withFactor(optionToTest, 2.0).toVisitor(),
      );
      checkOptionValue(graph, optionToTest, 66.0);
    });

    it('testSpacingWithValue', () => {
      const optionToTest = option();
      const graph = createAndConfigureTestGraph(
        ElkSpacings.withBaseValue(33.0).withValue(optionToTest, 24.0).toVisitor(),
      );
      checkOptionValue(graph, optionToTest, 24.0);
    });

    it('testOverwriteIfRequested', () => {
      const optionToTest = option();
      const graph = createSimpleGraph();
      const firstChild = graph.getChildren().get(0);
      const secondChild = graph.getChildren().get(1);
      firstChild.setProperty(optionToTest, 22.0);
      ElkUtil.applyVisitors(
        graph,
        ElkSpacings.withBaseValue(1).withValue(optionToTest, 3).withOverwrite(true).toVisitor(),
      );
      expectNear(firstChild.getProperty(optionToTest), 3.0);
      expectNear(secondChild.getProperty(optionToTest), 3.0);
    });

    it('testDontOverwriteIfNotRequested', () => {
      const optionToTest = option();
      const graph = createSimpleGraph();
      const firstChild = graph.getChildren().get(0);
      const secondChild = graph.getChildren().get(1);
      firstChild.setProperty(optionToTest, 22.0);
      ElkUtil.applyVisitors(
        graph,
        ElkSpacings.withBaseValue(1).withValue(optionToTest, 3).withOverwrite(false).toVisitor(),
      );
      expectNear(firstChild.getProperty(optionToTest), 22.0);
      expectNear(secondChild.getProperty(optionToTest), 3.0);
    });
  });
});

/** Tests that trying to configure factors and values for non-spacing layout options is rejected. */
describe('InvalidOptionConfigurationTest', () => {
  const options: [string, () => IProperty<number>][] = [
    ['BASE_SPACING_OPTION', () => ElkCoreSpacingsBuilder.BASE_SPACING_OPTION],
    ['ASPECT_RATIO', () => CoreOptions.ASPECT_RATIO],
  ];

  describe.each(options)('%s', (_name, option) => {
    it('testSpacingWithFactor', () => {
      expect(() =>
        createAndConfigureTestGraph(ElkSpacings.withBaseValue(33.0).withFactor(option(), 2.0).toVisitor()),
      ).toThrow(IllegalArgumentException);
    });

    it('testSpacingWithValue', () => {
      expect(() =>
        createAndConfigureTestGraph(ElkSpacings.withBaseValue(33.0).withValue(option(), 24.0).toVisitor()),
      ).toThrow(IllegalArgumentException);
    });
  });
});
