// SPDX-License-Identifier: EPL-2.0
import { AlgorithmAssembler } from '../../core/alg/AlgorithmAssembler.js';
import { LayoutProcessorConfiguration } from '../../core/alg/LayoutProcessorConfiguration.js';
import { LabelManagementOptions } from '../../core/labels/LabelManagementOptions.js';
import { Direction } from '../../core/options/Direction.js';
import { EdgeRouting } from '../../core/options/EdgeRouting.js';
import { HierarchyHandling } from '../../core/options/HierarchyHandling.js';
import type { EnumSet } from '../../java/util/EnumSet.js';
import { Random } from '../../java/util/Random.js';
import type { LGraph } from './graph/LGraph.js';
import { LGraphUtil } from './graph/LGraphUtil.js';
import type { LNode } from './graph/LNode.js';
import { IntermediateProcessorStrategy } from './intermediate/IntermediateProcessorStrategy.js';
import { LayeredPhases } from './LayeredPhases.js';
import { CrossingMinimizationStrategy } from './options/CrossingMinimizationStrategy.js';
import { GraphCompactionStrategy } from './options/GraphCompactionStrategy.js';
import { GraphProperties } from './options/GraphProperties.js';
import { GreedySwitchType } from './options/GreedySwitchType.js';
import { InternalProperties } from './options/InternalProperties.js';
import { LayerUnzippingStrategy } from './options/LayerUnzippingStrategy.js';
import { LayeredOptions } from './options/LayeredOptions.js';
import { NodeFlexibility } from './options/NodeFlexibility.js';
import { NodePromotionStrategy } from './options/NodePromotionStrategy.js';
import { OrderingStrategy } from './options/OrderingStrategy.js';
import { Spacings } from './options/Spacings.js';
import { WrappingStrategy } from './options/WrappingStrategy.js';
import { EdgeRouterFactory } from './p5edges/EdgeRouterFactory.js';

type Configuration = LayoutProcessorConfiguration<LayeredPhases, LGraph>;

/** @see GraphConfigurator.java:92 the minimal spacing between edges, so edges won't overlap. */
const MIN_EDGE_SPACING = 2.0;
/** @see GraphConfigurator.java:118 a seed of 0 selects the clock-seeded `new Random()`. */
const CLOCK_SEED = 0;

/**
 * The configurator configures a graph in preparation for layout. This includes making sure that a given graph has
 * sensible properties set as well as assembling the phases and processors required to layout the graph. That list is
 * attached to the graph in its {@link InternalProperties.PROCESSORS} property.
 *
 * The three static configurations are built on first use (F10, E1 recipe): a module-level read of
 * `IntermediateProcessorStrategy` would run before that enum finishes evaluating.
 *
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/GraphConfigurator.java
 */
export class GraphConfigurator {
  static #baselineProcessingConfiguration: Configuration | undefined;
  static #labelManagementAdditions: Configuration | undefined;
  static #hierarchicalAdditions: Configuration | undefined;

  /**
   * Intermediate processing configuration for basic graphs.
   *
   * @see GraphConfigurator.java:60
   */
  private static get BASELINE_PROCESSING_CONFIGURATION(): Configuration {
    return (GraphConfigurator.#baselineProcessingConfiguration ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >()
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.INNERMOST_NODE_MARGIN_CALCULATOR)
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.LABEL_AND_NODE_SIZE_PROCESSOR)
      .addBefore(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR)
      .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.END_LABEL_SORTER));
  }

  /**
   * Intermediate processors for label management.
   *
   * @see GraphConfigurator.java:69
   */
  private static get LABEL_MANAGEMENT_ADDITIONS(): Configuration {
    return (GraphConfigurator.#labelManagementAdditions ??= LayoutProcessorConfiguration.create<LayeredPhases, LGraph>()
      .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.CENTER_LABEL_MANAGEMENT_PROCESSOR)
      .addBefore(
        LayeredPhases.P4_NODE_PLACEMENT,
        IntermediateProcessorStrategy.END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR,
      ));
  }

  /**
   * Intermediate processors for hierarchical layout, i.e. `HierarchyHandling.INCLUDE_CHILDREN`.
   *
   * @see GraphConfigurator.java:76
   */
  private static get HIERARCHICAL_ADDITIONS(): Configuration {
    return (GraphConfigurator.#hierarchicalAdditions ??= LayoutProcessorConfiguration.create<
      LayeredPhases,
      LGraph
    >().addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HIERARCHICAL_NODE_RESIZER));
  }

  /** The algorithm assembler we use to assemble our algorithm configurations. */
  private readonly algorithmAssembler: AlgorithmAssembler<LayeredPhases, LGraph> = AlgorithmAssembler.create<
    LayeredPhases,
    LGraph
  >(LayeredPhases);

  /**
   * Set special layout options for the layered graph.
   *
   * @param lgraph a new layered graph
   * @see GraphConfigurator.java:99
   */
  private configureGraphProperties(lgraph: LGraph): void {
    // check the bounds of some layout options (the Java comments the check out: TODO at GraphConfigurator.java:101)

    const edgeSpacing = lgraph.getProperty(LayeredOptions.SPACING_EDGE_EDGE);
    if (edgeSpacing < MIN_EDGE_SPACING) {
      // Make sure the resulting edge spacing is at least 2 in order to avoid overlapping edges.
      lgraph.setProperty(LayeredOptions.SPACING_EDGE_EDGE, MIN_EDGE_SPACING);
    }

    const direction = lgraph.getProperty(LayeredOptions.DIRECTION);
    if (direction === Direction.UNDEFINED) {
      lgraph.setProperty(LayeredOptions.DIRECTION, LGraphUtil.getDirection(lgraph));
    }

    // set the random number generator based on the random seed option
    const randomSeed = lgraph.getProperty(LayeredOptions.RANDOM_SEED);
    if (randomSeed === CLOCK_SEED) {
      lgraph.setProperty(InternalProperties.RANDOM, new Random());
    } else {
      lgraph.setProperty(InternalProperties.RANDOM, new Random(randomSeed));
    }

    // the option has no default: a graph that never set it answers null (an unboxing-free read in the Java)
    const favorStraightness = lgraph.getProperty(LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES) as boolean | null;
    if (favorStraightness === null || favorStraightness === undefined) {
      lgraph.setProperty(
        LayeredOptions.NODE_PLACEMENT_FAVOR_STRAIGHT_EDGES,
        lgraph.getProperty(LayeredOptions.EDGE_ROUTING) === EdgeRouting.ORTHOGONAL,
      );
    }

    // copy the port constraints to keep a list of original port constraints
    this.copyPortContraints(lgraph);

    // pre-calculate spacing information
    const spacings = new Spacings(lgraph);
    lgraph.setProperty(InternalProperties.SPACINGS, spacings);
  }

  /** @see GraphConfigurator.java:138 (the Java name keeps its typo `Contraints`). */
  private copyPortContraints(lgraph: LGraph): void {
    lgraph.getLayerlessNodes().forEach((lnode) => this.copyPortConstraints(lnode));
    lgraph
      .getLayers()
      .flatMap((layer) => layer.getNodes())
      .forEach((lnode) => this.copyPortConstraints(lnode));
  }

  /** @see GraphConfigurator.java:146 */
  private copyPortConstraints(node: LNode): void {
    const originalPortconstraints = node.getProperty(LayeredOptions.PORT_CONSTRAINTS);
    node.setProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS, originalPortconstraints);

    const nestedGraph = node.getNestedGraph();
    if (nestedGraph !== null) {
      this.copyPortContraints(nestedGraph);
    }
  }

  /**
   * Rebuilds the configuration to include all processors required to layout the given graph. The list of processors
   * is attached to the graph in the {@link InternalProperties.PROCESSORS} property.
   *
   * @param lgraph the graph to layout.
   * @see GraphConfigurator.java:165
   */
  prepareGraphForLayout(lgraph: LGraph): void {
    // Make sure the graph properties are sensible
    this.configureGraphProperties(lgraph);

    // Setup the algorithm assembler
    this.algorithmAssembler.reset();

    this.algorithmAssembler.setPhase(
      LayeredPhases.P1_CYCLE_BREAKING,
      lgraph.getProperty(LayeredOptions.CYCLE_BREAKING_STRATEGY),
    );
    this.algorithmAssembler.setPhase(LayeredPhases.P2_LAYERING, lgraph.getProperty(LayeredOptions.LAYERING_STRATEGY));
    this.algorithmAssembler.setPhase(
      LayeredPhases.P3_NODE_ORDERING,
      lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY),
    );
    this.algorithmAssembler.setPhase(
      LayeredPhases.P4_NODE_PLACEMENT,
      lgraph.getProperty(LayeredOptions.NODE_PLACEMENT_STRATEGY),
    );
    this.algorithmAssembler.setPhase(
      LayeredPhases.P5_EDGE_ROUTING,
      EdgeRouterFactory.factoryFor(lgraph.getProperty(LayeredOptions.EDGE_ROUTING)),
    );

    this.algorithmAssembler.addProcessorConfiguration(
      GraphConfigurator.getPhaseIndependentLayoutProcessorConfiguration(lgraph),
    );

    lgraph.setProperty(InternalProperties.PROCESSORS, this.algorithmAssembler.build(lgraph));
  }

  /**
   * Returns an intermediate processing configuration with processors not tied to specific phases. The Java body is
   * one method; here it runs the same branches in the same order, split into section helpers for the complexity
   * limits (`:200-342`).
   *
   * @param lgraph the layered graph to be processed. The configuration may vary depending on certain properties of
   *               the graph.
   * @return intermediate processing configuration.
   * @see GraphConfigurator.java:195
   */
  private static getPhaseIndependentLayoutProcessorConfiguration(lgraph: LGraph): Configuration {
    const graphProperties = lgraph.getProperty(InternalProperties.GRAPH_PROPERTIES);

    // Basic configuration
    const configuration = LayoutProcessorConfiguration.createFrom(GraphConfigurator.BASELINE_PROCESSING_CONFIGURATION);

    GraphConfigurator.addHierarchyPortAndLabelProcessors(lgraph, configuration);
    GraphConfigurator.addDirectionProcessors(lgraph, configuration);

    // Additional dependencies
    if (graphProperties.contains(GraphProperties.COMMENTS)) {
      configuration
        .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.COMMENT_PREPROCESSOR)
        .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.COMMENT_NODE_MARGIN_CALCULATOR)
        .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.COMMENT_POSTPROCESSOR);
    }

    GraphConfigurator.addPromotionPartitionAndCompaction(lgraph, graphProperties, configuration);
    GraphConfigurator.addCrossMinProcessors(lgraph, configuration);
    GraphConfigurator.addUnzippingAndWrapping(lgraph, configuration);

    if (lgraph.getProperty(LayeredOptions.CONSIDER_MODEL_ORDER_STRATEGY) !== OrderingStrategy.NONE) {
      configuration.addBefore(
        LayeredPhases.P3_NODE_ORDERING,
        IntermediateProcessorStrategy.SORT_BY_INPUT_ORDER_OF_MODEL,
      );
    }

    // The Java `anyMatch(n -> NodeFlexibility.getNodeFlexibility(n) != null)` is always true for a non-empty node
    // list (the graph default is NONE, never null; .agent-notes/layered-node-placement.md); the expression stays.
    if (
      lgraph
        .getLayerlessNodes()
        .some((n) => (NodeFlexibility.getNodeFlexibility(n) as NodeFlexibility | null) !== null) &&
      lgraph.hasProperty(LayeredOptions.NODE_PLACEMENT_NETWORK_SIMPLEX_NODE_FLEXIBILITY_RECOMPUTE_NODE_PLACEMENT)
    ) {
      configuration.addAfter(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.NODE_PLACEMENT_REPEATER);
    }

    return configuration;
  }

  /** `:204-231`: hierarchical additions, the port side processor slot, label management, constraints. */
  private static addHierarchyPortAndLabelProcessors(lgraph: LGraph, configuration: Configuration): void {
    // Hierarchical layout.
    //  Note that the recursive graph layout engine made sure that at this point
    //  'INCLUDE_CHILDREN' has been propagated to all parent nodes with 'INHERIT'.
    //  Thus, every lgraph of the hierarchical lgraph structure is configured with the following additions.
    const hierarchyHandling = lgraph.getProperty(LayeredOptions.HIERARCHY_HANDLING);
    if (hierarchyHandling === HierarchyHandling.INCLUDE_CHILDREN) {
      configuration.addAll(GraphConfigurator.HIERARCHICAL_ADDITIONS);
    }

    // Port side processor, put to first slot only if requested and routing is orthogonal
    if (lgraph.getProperty(LayeredOptions.FEEDBACK_EDGES)) {
      configuration.addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.PORT_SIDE_PROCESSOR);
    } else {
      configuration.addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.PORT_SIDE_PROCESSOR);
    }

    // If the graph has a label manager, so add label management additions
    if (lgraph.getProperty(LabelManagementOptions.LABEL_MANAGER) !== null) {
      configuration.addAll(GraphConfigurator.LABEL_MANAGEMENT_ADDITIONS);
    }

    // If the graph should be laid out interactively or you really want it,
    // add the layers and positions to the nodes.
    if (
      lgraph.getProperty(LayeredOptions.INTERACTIVE_LAYOUT) ||
      lgraph.getProperty(LayeredOptions.GENERATE_POSITION_AND_LAYER_IDS)
    ) {
      configuration.addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.CONSTRAINTS_POSTPROCESSOR);
    }
  }

  /** `:233-246`: graph transformations for unusual layout directions. */
  private static addDirectionProcessors(lgraph: LGraph, configuration: Configuration): void {
    const direction = lgraph.getProperty(LayeredOptions.DIRECTION);
    // This is either RIGHT or UNDEFINED, which is just mapped to RIGHT: no processors then
    if (direction === Direction.LEFT || direction === Direction.DOWN || direction === Direction.UP) {
      configuration
        .addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.DIRECTION_PREPROCESSOR)
        .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.DIRECTION_POSTPROCESSOR);
    }
  }

  /** `:257-282`: node promotion, partitions, post compaction, high degree nodes. */
  private static addPromotionPartitionAndCompaction(
    lgraph: LGraph,
    graphProperties: EnumSet<GraphProperties>,
    configuration: Configuration,
  ): void {
    // Node-Promotion application for reduction of dummy nodes after layering
    if (lgraph.getProperty(LayeredOptions.LAYERING_NODE_PROMOTION_STRATEGY) !== NodePromotionStrategy.NONE) {
      configuration.addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.NODE_PROMOTION);
    }

    // Preserve certain partitions during layering
    if (graphProperties.contains(GraphProperties.PARTITIONS)) {
      configuration.addBefore(LayeredPhases.P1_CYCLE_BREAKING, IntermediateProcessorStrategy.PARTITION_PREPROCESSOR);
      configuration.addBefore(LayeredPhases.P2_LAYERING, IntermediateProcessorStrategy.PARTITION_MIDPROCESSOR);
      configuration.addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.PARTITION_POSTPROCESSOR);
    }

    // Additional horizontal compaction depends on orthogonal edge routing
    if (
      lgraph.getProperty(LayeredOptions.COMPACTION_POST_COMPACTION_STRATEGY) !== GraphCompactionStrategy.NONE &&
      lgraph.getProperty(LayeredOptions.EDGE_ROUTING) !== EdgeRouting.POLYLINE
    ) {
      configuration.addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.HORIZONTAL_COMPACTOR);
    }

    // Move trees of high degree nodes to separate layers
    if (lgraph.getProperty(LayeredOptions.HIGH_DEGREE_NODES_TREATMENT)) {
      configuration.addBefore(
        LayeredPhases.P3_NODE_ORDERING,
        IntermediateProcessorStrategy.HIGH_DEGREE_NODE_LAYER_PROCESSOR,
      );
    }
  }

  /** `:284-305`: semi-interactive crossing minimization and the greedy switch. */
  private static addCrossMinProcessors(lgraph: LGraph, configuration: Configuration): void {
    // Introduce in-layer constraints to preserve the order of regular nodes
    if (lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_SEMI_INTERACTIVE)) {
      configuration.addBefore(
        LayeredPhases.P3_NODE_ORDERING,
        IntermediateProcessorStrategy.SEMI_INTERACTIVE_CROSSMIN_PROCESSOR,
      );
    }

    // Configure greedy switch
    //  Note that in the case of hierarchical layout, the configuration may further be adjusted by
    //  ElkLayered#reviewAndCorrectHierarchicalProcessors(...)
    if (GraphConfigurator.activateGreedySwitchFor(lgraph)) {
      let greedySwitchType: GreedySwitchType;
      if (GraphConfigurator.isHierarchicalLayout(lgraph)) {
        greedySwitchType = lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE);
      } else {
        greedySwitchType = lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE);
      }
      const internalGreedyType =
        greedySwitchType === GreedySwitchType.ONE_SIDED
          ? IntermediateProcessorStrategy.ONE_SIDED_GREEDY_SWITCH
          : IntermediateProcessorStrategy.TWO_SIDED_GREEDY_SWITCH;
      configuration.addBefore(LayeredPhases.P4_NODE_PLACEMENT, internalGreedyType);
    }
  }

  /** `:307-329`: layer unzipping and wrapping of graphs. */
  private static addUnzippingAndWrapping(lgraph: LGraph, configuration: Configuration): void {
    if (lgraph.getProperty(LayeredOptions.LAYER_UNZIPPING_STRATEGY) === LayerUnzippingStrategy.ALTERNATING) {
      configuration.addBefore(
        LayeredPhases.P4_NODE_PLACEMENT,
        IntermediateProcessorStrategy.ALTERNATING_LAYER_UNZIPPER,
      );
    }

    // Wrapping of graphs
    const wrapping = lgraph.getProperty(LayeredOptions.WRAPPING_STRATEGY);
    if (wrapping === WrappingStrategy.SINGLE_EDGE) {
      configuration.addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.SINGLE_EDGE_GRAPH_WRAPPER);
    } else if (wrapping === WrappingStrategy.MULTI_EDGE) {
      configuration
        .addBefore(LayeredPhases.P3_NODE_ORDERING, IntermediateProcessorStrategy.BREAKING_POINT_INSERTER)
        .addBefore(LayeredPhases.P4_NODE_PLACEMENT, IntermediateProcessorStrategy.BREAKING_POINT_PROCESSOR)
        .addAfter(LayeredPhases.P5_EDGE_ROUTING, IntermediateProcessorStrategy.BREAKING_POINT_REMOVER);
    }
    // default: OFF
  }

  /**
   * Greedy switch may be activated if the following holds.
   *
   * Hierarchical layout: the `CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE` is set to something different
   * than OFF.
   *
   * Non-hierarchical layout: no interactive crossing minimization is performed, the
   * `CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE` option is set to something different than OFF, and the
   * activationThreshold is larger than the graph's number of nodes (or '0').
   *
   * @return `true` if above condition holds, `false` otherwise.
   * @see GraphConfigurator.java:362
   */
  static activateGreedySwitchFor(lgraph: LGraph): boolean {
    // First, check the hierarchical case
    if (GraphConfigurator.isHierarchicalLayout(lgraph)) {
      // Note that we only activate it for the root in the hierarchical case and rely on
      // ElkLayered#reviewAndCorrectHierarchicalProcessors(...) to properly set it for the whole hierarchy.
      // Also, interactive crossing minimization is not allowed/applicable for hierarchical layout
      // (and thus doesn't have to be checked here).
      return (
        lgraph.getParentNode() === null &&
        lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_HIERARCHICAL_TYPE) !==
          GreedySwitchType.OFF
      );
    }

    // Second, if not hierarchical, check the slightly more complex non-hierarchical case
    const greedySwitchType = lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_TYPE);
    const interactiveCrossMin =
      lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_SEMI_INTERACTIVE) ||
      lgraph.getProperty(LayeredOptions.CROSSING_MINIMIZATION_STRATEGY) === CrossingMinimizationStrategy.INTERACTIVE;
    const activationThreshold = lgraph.getProperty(
      LayeredOptions.CROSSING_MINIMIZATION_GREEDY_SWITCH_ACTIVATION_THRESHOLD,
    );
    const graphSize = lgraph.getLayerlessNodes().length;

    return (
      !interactiveCrossMin &&
      greedySwitchType !== GreedySwitchType.OFF &&
      (activationThreshold === 0 || activationThreshold > graphSize)
    );
  }

  /** @see GraphConfigurator.java:389 */
  private static isHierarchicalLayout(lgraph: LGraph): boolean {
    return lgraph.getProperty(LayeredOptions.HIERARCHY_HANDLING) === HierarchyHandling.INCLUDE_CHILDREN;
  }
}
