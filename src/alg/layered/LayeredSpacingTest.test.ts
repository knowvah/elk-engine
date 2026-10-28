// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import { ElkUtil } from '../../core/util/ElkUtil.js';
import type { IGraphElementVisitor } from '../../core/util/IGraphElementVisitor.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import { Property } from '../../graph/properties/Property.js';
import { ElkGraphUtil } from '../../graph/util/ElkGraphUtil.js';
import { LayeredMetaDataProvider } from './options/LayeredMetaDataProvider.js';
import { LayeredOptions } from './options/LayeredOptions.js';
import { LayeredSpacings } from './options/LayeredSpacings.js';

/**
 * Tests adjustments by {@link LayeredSpacings} to `ElkSpacings`. For instance, whether layered's potentially
 * overwritten default values are considered properly.
 *
 * @see org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/LayeredSpacingTest.java
 */

// Java: `PlainJavaInitialization.initializePlainJavaLayout()` in a static initializer; here the explicit layered
// registration (L5).
beforeAll(() => {
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new LayeredMetaDataProvider());
});

const DOUBLE_EQ_EPSILON = 10e-5;

function assertEquals(expected: number, actual: number, delta: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(delta);
}

// Java lines 57-61; used only by AfterLayoutTest (skipped), kept for the 7f un-skip.
function createAndConfigureTestGraph(configurator: IGraphElementVisitor): ElkNode {
  const simpleGraph = createSimpleGraph();
  ElkUtil.applyVisitors(simpleGraph, configurator);
  return simpleGraph;
}

/**
 * Create a simple test graph. The graph has at least two nodes and an edge, the nodes have predefined sizes with
 * fixed size constraint, but neither nodes nor edges have predefined coordinates, i.e. they are all set to (0,0).
 * The graph size is initially 0 as well.
 */
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

describe('LayeredSpacingTest', () => {
  describe('WithFactorAndValueTest', () => {
    const parameters: IProperty<number>[] = [
      LayeredOptions.SPACING_EDGE_EDGE,
      LayeredOptions.SPACING_EDGE_LABEL,
      LayeredOptions.SPACING_EDGE_NODE,
      LayeredOptions.SPACING_LABEL_LABEL,
      LayeredOptions.SPACING_LABEL_NODE,
      LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL,
      LayeredOptions.SPACING_LABEL_PORT_VERTICAL,
      LayeredOptions.SPACING_NODE_SELF_LOOP,
      LayeredOptions.SPACING_PORT_PORT,
      //
      LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS,
      LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS,
      LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS,
    ];

    /**
     * Check that in the (potentially overwritten) default values of the layered options and not the core options
     * are used.
     */
    it.each(parameters.map((p) => [p.getId(), p] as const))(
      'testDefaultFactorsProperlyOverwritten[%s]',
      (_id, optionToTest) => {
        const builder = LayeredSpacings.withBaseValue(33.0);
        const value = builder.getFactors().get(optionToTest) as number;
        assertEquals(
          optionToTest.getDefault() / LayeredOptions.SPACING_NODE_NODE.getDefault(),
          value,
          DOUBLE_EQ_EPSILON,
        );
      },
    );
  });

  /**
   * Tests that the spacing values have actually properly been regarded in the final drawing.
   *
   * TODO only SPACING_NODE_NODE_BETWEEN_LAYERS is tested so far - add tests for the others!
   */
  describe('AfterLayoutTest', () => {
    // S1 (decisions.md): runs a layered layout (LayeredLayoutProvider, Java lines 116-117); no pipeline exists
    // until mission 7f, which un-skips this test. Java lines 109-125.
    it.skip('testSpacingNodeNodeBetweenLayers', () => {
      const graph = createAndConfigureTestGraph(
        LayeredSpacings.withBaseValue(33.0)
          .withFactor(LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS, 2.0)
          .toVisitor(),
      );

      // layoutProvider = new LayeredLayoutProvider(); layoutProvider.layout(graph, new BasicProgressMonitor());

      for (const edge of graph.getContainedEdges()) {
        const source = ElkGraphUtil.getSourceNode(edge) as ElkNode;
        const spacingNodeNodeBetweenLayers =
          (ElkGraphUtil.getTargetNode(edge) as ElkNode).getX() - (source.getX() + source.getWidth());
        assertEquals(66, spacingNodeNodeBetweenLayers, DOUBLE_EQ_EPSILON);
      }
    });
  });

  /**
   * As described in #104 there is a conceptual problem with spacings default values. Code that is implemented
   * independent of the layout algorithm (such as node label placement code) is not aware of the default values that,
   * for instance, the layered algorithm specifies. It can only access the layout options via the `CoreOptions`.
   *
   * However, as soon as a spacing configuration is applied to a graph, spacing values should have been set
   * explicitly. Thus, the problem with the default values must not occur in that case.
   */
  describe('SpacingOverrides', () => {
    // Lazy: LayeredOptions is part of an ESM import cycle (see LayeredSpacingsBuilder).
    const propertyWithDifferentDefault = (): IProperty<number> =>
      Property.withDefault(LayeredOptions.SPACING_EDGE_NODE, LayeredOptions.SPACING_EDGE_NODE.getDefault() + 3.0);

    it('testExtractsCorrectDefaultForLayeredProperty', () => {
      const node = createSimpleGraph();
      const snn = node.getProperty(LayeredOptions.SPACING_EDGE_NODE);
      assertEquals(LayeredOptions.SPACING_EDGE_NODE.getDefault(), snn, DOUBLE_EQ_EPSILON);
      // Note that after the 'getProperty' call the default value is actually _set_ on the node
    });

    it('testExtractsCorrectDefaultForInheritingProperty', () => {
      const node = createSimpleGraph();
      const sne = node.getProperty(propertyWithDifferentDefault());
      assertEquals(LayeredOptions.SPACING_EDGE_NODE.getDefault() + 3.0, sne, DOUBLE_EQ_EPSILON);
      // Note that after the 'getProperty' call the default value is actually _set_ on the node
    });

    it('testExtractsCorrectDefaultValueAfterSpacingConfiguration', () => {
      const node = createSimpleGraph();
      const builder = LayeredSpacings.withBaseValue(35.0);
      builder.apply(node);

      expect(node.hasProperty(LayeredOptions.SPACING_EDGE_NODE)).toBe(true);
      const expected = 35.0 * (builder.getFactors().get(LayeredOptions.SPACING_EDGE_NODE) as number);
      assertEquals(expected, node.getProperty(propertyWithDifferentDefault()), DOUBLE_EQ_EPSILON);
      assertEquals(expected, node.getProperty(LayeredOptions.SPACING_EDGE_NODE), DOUBLE_EQ_EPSILON);
    });
  });
});
