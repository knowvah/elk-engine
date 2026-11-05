// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { addNode } from '../../../test/helpers/lgraph-builders.js';
import type { ILayoutProcessorFactory } from '../../core/alg/ILayoutProcessorFactory.js';
import type { LayoutProcessorConfiguration } from '../../core/alg/LayoutProcessorConfiguration.js';
import { LayoutMetaDataService } from '../../core/data/LayoutMetaDataService.js';
import type { ILabelManager } from '../../core/labels/ILabelManager.js';
import { LabelManagementOptions } from '../../core/labels/LabelManagementOptions.js';
import { Direction } from '../../core/options/Direction.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { HierarchyHandling } from '../../core/options/HierarchyHandling.js';
import { PortConstraints } from '../../core/options/PortConstraints.js';
import { Random } from '../../java/util/Random.js';
import { GraphConfigurator } from './GraphConfigurator.js';
import { LGraph } from './graph/LGraph.js';
import { LGraphUtil } from './graph/LGraphUtil.js';
import { IntermediateProcessorStrategy as Strategy } from './intermediate/IntermediateProcessorStrategy.js';
import { LayeredPhases } from './LayeredPhases.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { GraphCompactionStrategy } from './options/GraphCompactionStrategy.js';
import { GraphProperties } from './options/GraphProperties.js';
import { GreedySwitchType } from './options/GreedySwitchType.js';
import { InternalProperties } from './options/InternalProperties.js';
import { LayerUnzippingStrategy } from './options/LayerUnzippingStrategy.js';
import { LayeredOptions } from './options/LayeredOptions.js';
import { NodePlacementStrategy } from './options/NodePlacementStrategy.js';
import { NodePromotionStrategy } from './options/NodePromotionStrategy.js';
import { OrderingStrategy } from './options/OrderingStrategy.js';
import { WrappingStrategy } from './options/WrappingStrategy.js';

type Configuration = LayoutProcessorConfiguration<LayeredPhases, LGraph>;

/** The private static `getPhaseIndependentLayoutProcessorConfiguration`, which builds without creating processors. */
function configurationOf(graph: LGraph): Configuration {
  const configurator = GraphConfigurator as unknown as {
    getPhaseIndependentLayoutProcessorConfiguration(g: LGraph): Configuration;
  };
  return configurator.getPhaseIndependentLayoutProcessorConfiguration(graph);
}

const before = (c: Configuration, phase: LayeredPhases): Set<ILayoutProcessorFactory<LGraph>> =>
  c.processorsBefore(phase);
const after = (c: Configuration, phase: LayeredPhases): Set<ILayoutProcessorFactory<LGraph>> =>
  c.processorsAfter(phase);

const { P1_CYCLE_BREAKING: P1, P2_LAYERING: P2, P3_NODE_ORDERING: P3, P4_NODE_PLACEMENT: P4 } = LayeredPhases;
const { P5_EDGE_ROUTING: P5 } = LayeredPhases;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('GraphConfigurator.prepareGraphForLayout: property configuration (GraphConfigurator.java:99-136)', () => {
  const prepared = (setup: (g: LGraph) => void = () => undefined): LGraph => {
    const graph = new LGraph();
    addNode(graph);
    setup(graph);
    new GraphConfigurator().prepareGraphForLayout(graph);
    return graph;
  };

  it('raises an edge spacing below 2 to 2 and keeps a larger one', () => {
    expect(
      prepared((g) => g.setProperty(LayeredOptions.SPACING_EDGE_EDGE, 1)).getProperty(LayeredOptions.SPACING_EDGE_EDGE),
    ).toBe(2.0);
    expect(
      prepared((g) => g.setProperty(LayeredOptions.SPACING_EDGE_EDGE, 7.5)).getProperty(
        LayeredOptions.SPACING_EDGE_EDGE,
      ),
    ).toBe(7.5);
  });

  it('resolves an undefined direction through LGraphUtil.getDirection (twin)', () => {
    const graph = new LGraph();
    addNode(graph);
    graph.setProperty(LayeredOptions.DIRECTION, Direction.UNDEFINED);
    const expected = LGraphUtil.getDirection(graph);
    new GraphConfigurator().prepareGraphForLayout(graph);
    expect(graph.getProperty(LayeredOptions.DIRECTION)).toBe(expected);
  });

  it('seeds the random from a non-zero seed like new Random(seed) (twin)', () => {
    const SEED = 42;
    const graph = prepared((g) => g.setProperty(LayeredOptions.RANDOM_SEED, SEED));
    const twin = new Random(SEED);
    const random = graph.getProperty(InternalProperties.RANDOM);
    expect([random.nextInt(), random.nextDouble()]).toEqual([twin.nextInt(), twin.nextDouble()]);
  });

  it('gives seed 0 a clock-seeded Random (structural only)', () => {
    const graph = prepared((g) => g.setProperty(LayeredOptions.RANDOM_SEED, 0));
    expect(graph.getProperty(InternalProperties.RANDOM)).toBeInstanceOf(Random);
  });

  it('defaults favor-straight-edges to whether the routing is orthogonal, and keeps a set value', () => {
    const ortho = prepared((g) => g.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.ORTHOGONAL));
    expect(ortho.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES)).toBe(true);
    const poly = prepared((g) => g.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.POLYLINE));
    expect(poly.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES)).toBe(false);
    const set = prepared((g) => {
      g.setProperty(LayeredOptions.EDGE_ROUTING, EdgeRouting.POLYLINE);
      g.setProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES, true);
    });
    expect(set.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES)).toBe(true);
  });

  it('copies the port constraints of layerless, layered and nested-graph nodes', () => {
    const graph = new LGraph();
    const outer = addNode(graph);
    const nestedGraph = new LGraph();
    const inner = addNode(nestedGraph);
    outer.setNestedGraph(nestedGraph);
    outer.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_SIDE);
    inner.setProperty(LayeredOptions.PORT_CONSTRAINTS, PortConstraints.FIXED_ORDER);
    new GraphConfigurator().prepareGraphForLayout(graph);
    expect(outer.getProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_SIDE);
    expect(inner.getProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS)).toBe(PortConstraints.FIXED_ORDER);
  });

  it('attaches the assembled plan and the spacings', () => {
    const graph = prepared();
    expect(graph.getProperty(InternalProperties.PROCESSORS).length).toBeGreaterThan(0);
    expect(graph.getProperty(InternalProperties.SPACINGS)).not.toBeNull();
  });
});

describe('GraphConfigurator phase-independent processors (GraphConfigurator.java:195-342)', () => {
  const graphWith = (setup: (g: LGraph) => void): LGraph => {
    const graph = new LGraph();
    setup(graph);
    return graph;
  };
  const has = (set: Set<ILayoutProcessorFactory<LGraph>>, member: Strategy): boolean => set.has(member);

  it('holds the baseline processors', () => {
    const c = configurationOf(new LGraph());
    expect(has(before(c, P4), Strategy.INNERMOST_NODE_MARGIN_CALCULATOR)).toBe(true);
    expect(has(before(c, P4), Strategy.LABEL_AND_NODE_SIZE_PROCESSOR)).toBe(true);
    expect(has(before(c, P5), Strategy.LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR)).toBe(true);
    expect(has(after(c, P5), Strategy.END_LABEL_SORTER)).toBe(true);
  });

  it('leaves the shared baseline untouched by a graph-specific addition', () => {
    configurationOf(graphWith((g) => g.setProperty(LayeredOptions.INTERACTIVE_LAYOUT, true)));
    expect(has(after(configurationOf(new LGraph()), P5), Strategy.CONSTRAINTS_POSTPROCESSOR)).toBe(false);
  });

  it('adds the hierarchical node resizer under INCLUDE_CHILDREN only', () => {
    const on = configurationOf(
      graphWith((g) => g.setProperty(LayeredOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN)),
    );
    expect(has(after(on, P5), Strategy.HIERARCHICAL_NODE_RESIZER)).toBe(true);
    expect(has(after(configurationOf(new LGraph()), P5), Strategy.HIERARCHICAL_NODE_RESIZER)).toBe(false);
  });

  it('puts the port side processor before phase 3, or before phase 1 with feedback edges', () => {
    const plain = configurationOf(new LGraph());
    expect(has(before(plain, P3), Strategy.PORT_SIDE_PROCESSOR)).toBe(true);
    expect(has(before(plain, P1), Strategy.PORT_SIDE_PROCESSOR)).toBe(false);
    const feedback = configurationOf(graphWith((g) => g.setProperty(LayeredOptions.FEEDBACK_EDGES, true)));
    expect(has(before(feedback, P1), Strategy.PORT_SIDE_PROCESSOR)).toBe(true);
    expect(has(before(feedback, P3), Strategy.PORT_SIDE_PROCESSOR)).toBe(false);
  });

  it('adds label management with a label manager', () => {
    const c = configurationOf(
      graphWith((g) => g.setProperty(LabelManagementOptions.LABEL_MANAGER, {} as ILabelManager)),
    );
    expect(has(before(c, P4), Strategy.CENTER_LABEL_MANAGEMENT_PROCESSOR)).toBe(true);
    expect(has(before(c, P4), Strategy.END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR)).toBe(true);
    expect(has(before(configurationOf(new LGraph()), P4), Strategy.CENTER_LABEL_MANAGEMENT_PROCESSOR)).toBe(false);
  });

  it.each([
    ['INTERACTIVE_LAYOUT', LayeredOptions.INTERACTIVE_LAYOUT],
    ['GENERATE_POSITION_AND_LAYER_IDS', LayeredOptions.GENERATE_POSITION_AND_LAYER_IDS],
  ])('adds the constraints postprocessor for %s', (_name, property) => {
    const c = configurationOf(graphWith((g) => g.setProperty(property, true)));
    expect(has(after(c, P5), Strategy.CONSTRAINTS_POSTPROCESSOR)).toBe(true);
  });

  it.each([Direction.LEFT, Direction.DOWN, Direction.UP])('adds the direction transformers for %s', (direction) => {
    const c = configurationOf(graphWith((g) => g.setProperty(LayeredOptions.DIRECTION, direction)));
    expect(has(before(c, P1), Strategy.DIRECTION_PREPROCESSOR)).toBe(true);
    expect(has(after(c, P5), Strategy.DIRECTION_POSTPROCESSOR)).toBe(true);
  });

  it.each([Direction.RIGHT, Direction.UNDEFINED])('adds no direction transformer for %s', (direction) => {
    const c = configurationOf(graphWith((g) => g.setProperty(LayeredOptions.DIRECTION, direction)));
    expect(has(before(c, P1), Strategy.DIRECTION_PREPROCESSOR)).toBe(false);
    expect(has(after(c, P5), Strategy.DIRECTION_POSTPROCESSOR)).toBe(false);
  });

  it('adds the comment processors for comments', () => {
    const c = configurationOf(
      graphWith((g) => g.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.COMMENTS)),
    );
    expect(has(before(c, P1), Strategy.COMMENT_PREPROCESSOR)).toBe(true);
    expect(has(before(c, P4), Strategy.COMMENT_NODE_MARGIN_CALCULATOR)).toBe(true);
    expect(has(after(c, P5), Strategy.COMMENT_POSTPROCESSOR)).toBe(true);
  });

  it('adds node promotion for any strategy but NONE', () => {
    const c = configurationOf(
      graphWith((g) => g.setProperty(LayeredOptions.LAYERING_NODE_PROMOTION_STRATEGY, NodePromotionStrategy.NIKOLOV)),
    );
    expect(has(before(c, P3), Strategy.NODE_PROMOTION)).toBe(true);
    expect(has(before(configurationOf(new LGraph()), P3), Strategy.NODE_PROMOTION)).toBe(false);
  });

  it('adds the partition processors for partitions', () => {
    const c = configurationOf(
      graphWith((g) => g.getProperty(InternalProperties.GRAPH_PROPERTIES).add(GraphProperties.PARTITIONS)),
    );
    expect(has(before(c, P1), Strategy.PARTITION_PREPROCESSOR)).toBe(true);
    expect(has(before(c, P2), Strategy.PARTITION_MIDPROCESSOR)).toBe(true);
    expect(has(before(c, P3), Strategy.PARTITION_POSTPROCESSOR)).toBe(true);
  });

  it('adds the horizontal compactor only for post compaction without polyline routing', () => {
    const compaction = (routing: EdgeRouting, strategy: GraphCompactionStrategy): Configuration =>
      configurationOf(
        graphWith((g) => {
          g.setProperty(LayeredOptions.COMPACTION_POST_COMPACTION_STRATEGY, strategy);
          g.setProperty(LayeredOptions.EDGE_ROUTING, routing);
        }),
      );
    expect(
      has(after(compaction(EdgeRouting.ORTHOGONAL, GraphCompactionStrategy.LEFT), P5), Strategy.HORIZONTAL_COMPACTOR),
    ).toBe(true);
    expect(
      has(after(compaction(EdgeRouting.POLYLINE, GraphCompactionStrategy.LEFT), P5), Strategy.HORIZONTAL_COMPACTOR),
    ).toBe(false);
    expect(
      has(after(compaction(EdgeRouting.ORTHOGONAL, GraphCompactionStrategy.NONE), P5), Strategy.HORIZONTAL_COMPACTOR),
    ).toBe(false);
  });

  it('adds the high degree and semi-interactive processors on request', () => {
    const c = configurationOf(
      graphWith((g) => {
        g.setProperty(LayeredOptions.HIGH_DEGREE_NODES_TREATMENT, true);
        g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_SEMI_INTERACTIVE, true);
      }),
    );
    expect(has(before(c, P3), Strategy.HIGH_DEGREE_NODE_LAYER_PROCESSOR)).toBe(true);
    expect(has(before(c, P3), Strategy.SEMI_INTERACTIVE_CROSSMIN_PROCESSOR)).toBe(true);
  });

  it('picks the greedy switch member from the type of the active mode', () => {
    const flat = (type: GreedySwitchType): Configuration =>
      configurationOf(graphWith((g) => g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE, type)));
    expect(has(before(flat(GreedySwitchType.ONE_SIDED), P4), Strategy.ONE_SIDED_GREEDY_SWITCH)).toBe(true);
    expect(has(before(flat(GreedySwitchType.TWO_SIDED), P4), Strategy.TWO_SIDED_GREEDY_SWITCH)).toBe(true);
    expect(before(flat(GreedySwitchType.OFF), P4).has(Strategy.TWO_SIDED_GREEDY_SWITCH)).toBe(false);
    const hierarchical = configurationOf(
      graphWith((g) => {
        g.setProperty(LayeredOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
        g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE, GreedySwitchType.ONE_SIDED);
        g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE, GreedySwitchType.TWO_SIDED);
      }),
    );
    expect(has(before(hierarchical, P4), Strategy.ONE_SIDED_GREEDY_SWITCH)).toBe(true);
    expect(has(before(hierarchical, P4), Strategy.TWO_SIDED_GREEDY_SWITCH)).toBe(false);
  });

  it('adds the layer unzipper for ALTERNATING unzipping', () => {
    const c = configurationOf(
      graphWith((g) => g.setProperty(LayeredOptions.LAYER_UNZIPPING_STRATEGY, LayerUnzippingStrategy.ALTERNATING)),
    );
    expect(has(before(c, P4), Strategy.ALTERNATING_LAYER_UNZIPPER)).toBe(true);
  });

  it('adds the wrapping processors per strategy', () => {
    const wrapped = (strategy: WrappingStrategy): Configuration =>
      configurationOf(graphWith((g) => g.setProperty(LayeredOptions.WRAPPING_STRATEGY, strategy)));
    expect(has(before(wrapped(WrappingStrategy.SINGLE_EDGE), P4), Strategy.SINGLE_EDGE_GRAPH_WRAPPER)).toBe(true);
    const multi = wrapped(WrappingStrategy.MULTI_EDGE);
    expect(has(before(multi, P3), Strategy.BREAKING_POINT_INSERTER)).toBe(true);
    expect(has(before(multi, P4), Strategy.BREAKING_POINT_PROCESSOR)).toBe(true);
    expect(has(after(multi, P5), Strategy.BREAKING_POINT_REMOVER)).toBe(true);
    expect(has(before(wrapped(WrappingStrategy.OFF), P4), Strategy.SINGLE_EDGE_GRAPH_WRAPPER)).toBe(false);
  });

  it('sorts by model order unless the strategy is NONE', () => {
    const c = configurationOf(
      graphWith((g) => g.setProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY, OrderingStrategy.PREFER_EDGES)),
    );
    expect(has(before(c, P3), Strategy.SORT_BY_INPUT_ORDER_OF_MODEL)).toBe(true);
    expect(has(before(configurationOf(new LGraph()), P3), Strategy.SORT_BY_INPUT_ORDER_OF_MODEL)).toBe(false);
  });

  it('adds the node placement repeater for a node and an explicitly set recompute option', () => {
    const repeated = (withNode: boolean, withOption: boolean): boolean => {
      const graph = new LGraph();
      if (withNode) {
        addNode(graph);
      }
      if (withOption) {
        graph.setProperty(
          LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_RECOMPUTE_NODE_PLACEMENT,
          NodePlacementStrategy.SIMPLE,
        );
      }
      return has(after(configurationOf(graph), P4), Strategy.NODE_PLACEMENT_REPEATER);
    };
    expect([repeated(true, true), repeated(true, false), repeated(false, true)]).toEqual([true, false, false]);
  });
});

describe('GraphConfigurator.activateGreedySwitchFor (GraphConfigurator.java:362-387)', () => {
  const activation = (setup: (g: LGraph) => void, nodes = 0): boolean => {
    const graph = new LGraph();
    for (let i = 0; i < nodes; i++) {
      addNode(graph);
    }
    setup(graph);
    return GraphConfigurator.activateGreedySwitchFor(graph);
  };
  const hierarchical = (g: LGraph): void => {
    g.setProperty(LayeredOptions.HIERARCHY_HANDLING, HierarchyHandling.INCLUDE_CHILDREN);
  };

  it('hierarchical: the root with a hierarchical type but OFF', () => {
    expect(
      activation((g) => {
        hierarchical(g);
        g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE, GreedySwitchType.TWO_SIDED);
      }),
    ).toBe(true);
    expect(
      activation((g) => {
        hierarchical(g);
        g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE, GreedySwitchType.OFF);
      }),
    ).toBe(false);
  });

  it('hierarchical: never for a graph with a parent node', () => {
    expect(
      activation((g) => {
        hierarchical(g);
        g.setParentNode(addNode(new LGraph()));
      }),
    ).toBe(false);
  });

  it('flat: off for the OFF type, interactive minimization and semi-interactive minimization', () => {
    expect(
      activation((g) => g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE, GreedySwitchType.OFF)),
    ).toBe(false);
    expect(activation((g) => g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_SEMI_INTERACTIVE, true))).toBe(false);
    expect(
      activation((g) =>
        g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY, CrossingMinimizationStrategy.INTERACTIVE),
      ),
    ).toBe(false);
    expect(activation(() => undefined)).toBe(true);
  });

  it('flat: a threshold of 0 always activates, otherwise the threshold must exceed the node count', () => {
    const threshold = (value: number) => (g: LGraph) =>
      g.setProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_ACTIVATION_THRESHOLD, value);
    const NODES = 3;
    expect(activation(threshold(0), NODES)).toBe(true);
    expect(activation(threshold(NODES + 1), NODES)).toBe(true);
    expect(activation(threshold(NODES), NODES)).toBe(false);
    expect(activation(threshold(NODES - 1), NODES)).toBe(false);
  });
});
