// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import type { ILayoutProcessorFactory } from '../../../core/alg/ILayoutProcessorFactory.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from '../graph/LGraph.js';
import { EdgeAndLayerConstraintEdgeReverser } from './EdgeAndLayerConstraintEdgeReverser.js';
import { HighDegreeNodeLayeringProcessor } from './HighDegreeNodeLayeringProcessor.js';
import { InteractiveExternalPortPositioner } from './InteractiveExternalPortPositioner.js';
import { LayerConstraintPostprocessor } from './LayerConstraintPostprocessor.js';
import { LayerConstraintPreprocessor } from './LayerConstraintPreprocessor.js';
import { NodePromotion } from './NodePromotion.js';
import { PartitionMidprocessor } from './PartitionMidprocessor.js';
import { PartitionPostprocessor } from './PartitionPostprocessor.js';
import { PartitionPreprocessor } from './PartitionPreprocessor.js';
import { ReversedEdgeRestorer } from './ReversedEdgeRestorer.js';

/** Local alias that keeps the constant declarations within the line width. */
type Strategy = IntermediateProcessorStrategy;

/**
 * Definition of available intermediate layout processors for the layered layouter. This enumeration also serves as a
 * factory for intermediate layout processors.
 *
 * In this enumeration, intermediate layout processors are listed by the earliest slot in which they can sensibly be
 * used. The order in which they are listed is determined by the dependencies on other processors.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/IntermediateProcessorStrategy.java
 */
export class IntermediateProcessorStrategy implements ILayoutProcessorFactory<LGraph> {
  // Before Phase 1
  /** Transforms the graph to internally perform a left-to-right drawing. */
  static readonly DIRECTION_PREPROCESSOR: Strategy = new this('DIRECTION_PREPROCESSOR', 0);
  /** Removes some comment boxes to place them separately in a post-processor. */
  static readonly COMMENT_PREPROCESSOR: Strategy = new this('COMMENT_PREPROCESSOR', 1);
  /** Makes sure nodes with layer constraints have only incoming or only outgoing edges. */
  static readonly EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER: Strategy = new this(
    'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER',
    2,
  );
  /** If one of the phases is set to interactive mode, this processor positions external ports. */
  static readonly INTERACTIVE_EXTERNAL_PORT_POSITIONER: Strategy = new this('INTERACTIVE_EXTERNAL_PORT_POSITIONER', 3);
  /** Reverse edges that run from higher-index to lower-index partitions. */
  static readonly PARTITION_PREPROCESSOR: Strategy = new this('PARTITION_PREPROCESSOR', 4);
  // Before Phase 2
  /** Adds dummy nodes in edges where center labels are present. */
  static readonly LABEL_DUMMY_INSERTER: Strategy = new this('LABEL_DUMMY_INSERTER', 5);
  /** Takes care of self loop preprocessing. */
  static readonly SELF_LOOP_PREPROCESSOR: Strategy = new this('SELF_LOOP_PREPROCESSOR', 6);
  /** Hides `FIRST_SEPARATE` and `LAST_SEPARATE` nodes. */
  static readonly LAYER_CONSTRAINT_PREPROCESSOR: Strategy = new this('LAYER_CONSTRAINT_PREPROCESSOR', 7);
  /** Adds edges that force layering algorithms to respect layout partitions. */
  static readonly PARTITION_MIDPROCESSOR: Strategy = new this('PARTITION_MIDPROCESSOR', 8);
  // Before Phase 3
  /** Moves trees of high degree nodes to separate layers. */
  static readonly HIGH_DEGREE_NODE_LAYER_PROCESSOR: Strategy = new this('HIGH_DEGREE_NODE_LAYER_PROCESSOR', 9);
  /** Node-promotion for prettier graphs, especially algorithms like longest-path are prettified. */
  static readonly NODE_PROMOTION: Strategy = new this('NODE_PROMOTION', 10);
  /** Restores `FIRST_SEPARATE` and `LAST_SEPARATE` nodes and enforces layer constraints. */
  static readonly LAYER_CONSTRAINT_POSTPROCESSOR: Strategy = new this('LAYER_CONSTRAINT_POSTPROCESSOR', 11);
  /** Remove partition constraint edges. */
  static readonly PARTITION_POSTPROCESSOR: Strategy = new this('PARTITION_POSTPROCESSOR', 12);
  /** Handles northern and southern hierarchical ports. */
  static readonly HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR: Strategy = new this(
    'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR',
    13,
  );
  /** Adds successor constraints between regular nodes before crossing minimization. */
  static readonly SEMI_INTERACTIVE_CROSSMIN_PROCESSOR: Strategy = new this('SEMI_INTERACTIVE_CROSSMIN_PROCESSOR', 14);
  /** Inserts breaking points which are used to 'wrap' the graph after crossing minimization. */
  static readonly BREAKING_POINT_INSERTER: Strategy = new this('BREAKING_POINT_INSERTER', 15);
  /** Takes a layered graph and turns it into a properly layered graph. */
  static readonly LONG_EDGE_SPLITTER: Strategy = new this('LONG_EDGE_SPLITTER', 16);
  /** Makes sure nodes have at least fixed port sides. */
  static readonly PORT_SIDE_PROCESSOR: Strategy = new this('PORT_SIDE_PROCESSOR', 17);
  /** Takes a layered graph and inserts dummy nodes for edges connected to inverted ports. */
  static readonly INVERTED_PORT_PROCESSOR: Strategy = new this('INVERTED_PORT_PROCESSOR', 18);
  /** Orders the port lists of nodes with fixed port order. */
  static readonly PORT_LIST_SORTER: Strategy = new this('PORT_LIST_SORTER', 19);
  /** Sorts nodes and edges according to their order in the input model. */
  static readonly SORT_BY_INPUT_ORDER_OF_MODEL: Strategy = new this('SORT_BY_INPUT_ORDER_OF_MODEL', 20);
  /** Inserts dummy nodes to take care of northern and southern ports. */
  static readonly NORTH_SOUTH_PORT_PREPROCESSOR: Strategy = new this('NORTH_SOUTH_PORT_PREPROCESSOR', 21);
  // Before Phase 4
  /** Performs 'wrapping' of the graph, potentially executing improvement heuristics. */
  static readonly BREAKING_POINT_PROCESSOR: Strategy = new this('BREAKING_POINT_PROCESSOR', 22);
  /** Hierarchical one-sided greedy switch crossing reduction. */
  static readonly ONE_SIDED_GREEDY_SWITCH: Strategy = new this('ONE_SIDED_GREEDY_SWITCH', 23);
  /** Hierarchical two-sided greedy switch crossing reduction. */
  static readonly TWO_SIDED_GREEDY_SWITCH: Strategy = new this('TWO_SIDED_GREEDY_SWITCH', 24);
  /** Position self loops after phase 3. */
  static readonly SELF_LOOP_PORT_RESTORER: Strategy = new this('SELF_LOOP_PORT_RESTORER', 25);
  /** Unzips layers for compaction. */
  static readonly ALTERNATING_LAYER_UNZIPPER: Strategy = new this('ALTERNATING_LAYER_UNZIPPER', 26);
  /** Wraps graphs such that they better fit a given drawing area, allowing only a single edge per cut. */
  static readonly SINGLE_EDGE_GRAPH_WRAPPER: Strategy = new this('SINGLE_EDGE_GRAPH_WRAPPER', 27);
  /** Makes sure that in-layer constraints are handled. */
  static readonly IN_LAYER_CONSTRAINT_PROCESSOR: Strategy = new this('IN_LAYER_CONSTRAINT_PROCESSOR', 28);
  /** Manages edge end labels, node labels, and port labels. */
  static readonly END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR: Strategy = new this(
    'END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR',
    29,
  );
  /** Sets the positions of ports and labels, and sets the node sizes. */
  static readonly LABEL_AND_NODE_SIZE_PROCESSOR: Strategy = new this('LABEL_AND_NODE_SIZE_PROCESSOR', 30);
  /** Calculates the margins of nodes according to the sizes of ports and port labels. */
  static readonly INNERMOST_NODE_MARGIN_CALCULATOR: Strategy = new this('INNERMOST_NODE_MARGIN_CALCULATOR', 31);
  /** Calculate the bendpoints for the self-loop edges. */
  static readonly SELF_LOOP_ROUTER: Strategy = new this('SELF_LOOP_ROUTER', 32);
  /** Extends node margin by the space required for comment boxes. */
  static readonly COMMENT_NODE_MARGIN_CALCULATOR: Strategy = new this('COMMENT_NODE_MARGIN_CALCULATOR', 33);
  /** Place end labels of edges and extend node margins accordingly. */
  static readonly END_LABEL_PREPROCESSOR: Strategy = new this('END_LABEL_PREPROCESSOR', 34);
  /** Tries to switch the label dummy nodes which the middle most dummy node of a long edge. */
  static readonly LABEL_DUMMY_SWITCHER: Strategy = new this('LABEL_DUMMY_SWITCHER', 35);
  /** Tries to shorten edge center labels where necessary. */
  static readonly CENTER_LABEL_MANAGEMENT_PROCESSOR: Strategy = new this('CENTER_LABEL_MANAGEMENT_PROCESSOR', 36);
  /** Decides, on which side of an edge the edge labels should be placed. */
  static readonly LABEL_SIDE_SELECTOR: Strategy = new this('LABEL_SIDE_SELECTOR', 37);
  /** Merges long edge dummy nodes belonging to the same hyperedge. */
  static readonly HYPEREDGE_DUMMY_MERGER: Strategy = new this('HYPEREDGE_DUMMY_MERGER', 38);
  /** Adjusts the width of hierarchical port dummy nodes. */
  static readonly HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR: Strategy = new this(
    'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR',
    39,
  );
  // Before Phase 5
  static readonly NODE_PLACEMENT_REPEATER: Strategy = new this('NODE_PLACEMENT_REPEATER', 40);
  /** Calculate the size of layers and the graph's height and offset. */
  static readonly LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR: Strategy = new this(
    'LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR',
    41,
  );
  /** Fix coordinates of hierarchical port dummy nodes. */
  static readonly HIERARCHICAL_PORT_POSITION_PROCESSOR: Strategy = new this('HIERARCHICAL_PORT_POSITION_PROCESSOR', 42);
  // After Phase 5
  /** Adds the layer and positions that were computed to the nodes. */
  static readonly CONSTRAINTS_POSTPROCESSOR: Strategy = new this('CONSTRAINTS_POSTPROCESSOR', 43);
  /** Reinserts and places comment boxes that have been removed before. */
  static readonly COMMENT_POSTPROCESSOR: Strategy = new this('COMMENT_POSTPROCESSOR', 44);
  /** Moves hypernodes horizontally for better placement. */
  static readonly HYPERNODE_PROCESSOR: Strategy = new this('HYPERNODE_PROCESSOR', 45);
  /** Routes edges incident to hierarchical ports orthogonally. */
  static readonly HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER: Strategy = new this(
    'HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER',
    46,
  );
  /** Takes a properly layered graph and removes the dummy nodes due to proper layering. */
  static readonly LONG_EDGE_JOINER: Strategy = new this('LONG_EDGE_JOINER', 47);
  /** Add node position to the already routed self-loops. */
  static readonly SELF_LOOP_POSTPROCESSOR: Strategy = new this('SELF_LOOP_POSTPROCESSOR', 48);
  /** Removes the breaking points that were inserted for 'wrapping', derives edge routes correspondingly. */
  static readonly BREAKING_POINT_REMOVER: Strategy = new this('BREAKING_POINT_REMOVER', 49);
  /** Removes dummy nodes inserted by the north south side preprocessor and routes edges. */
  static readonly NORTH_SOUTH_PORT_POSTPROCESSOR: Strategy = new this('NORTH_SOUTH_PORT_POSTPROCESSOR', 50);
  /** Moves nodes and vertical edge segments in horizontal direction to close some gaps that are a result of the layering. */
  static readonly HORIZONTAL_COMPACTOR: Strategy = new this('HORIZONTAL_COMPACTOR', 51);
  /** Removes dummy nodes which were introduced for center labels. */
  static readonly LABEL_DUMMY_REMOVER: Strategy = new this('LABEL_DUMMY_REMOVER', 52);
  /** Processor that calculates final control points for splines as intended by the `SplineEdgeRouter`. */
  static readonly FINAL_SPLINE_BENDPOINTS_CALCULATOR: Strategy = new this('FINAL_SPLINE_BENDPOINTS_CALCULATOR', 53);
  /** Sorts multiple end labels to reflect the order of source or target nodes. */
  static readonly END_LABEL_SORTER: Strategy = new this('END_LABEL_SORTER', 54);
  /** Takes the reversed edges of a graph and restores their original direction. */
  static readonly REVERSED_EDGE_RESTORER: Strategy = new this('REVERSED_EDGE_RESTORER', 55);
  /** Assign correct coordinates to end labels. */
  static readonly END_LABEL_POSTPROCESSOR: Strategy = new this('END_LABEL_POSTPROCESSOR', 56);
  /** In hierarchical graphs, maps a child graph to its parent node. */
  static readonly HIERARCHICAL_NODE_RESIZER: Strategy = new this('HIERARCHICAL_NODE_RESIZER', 57);
  /** Transforms the internal left-to-right drawing back to the original direction. */
  static readonly DIRECTION_POSTPROCESSOR: Strategy = new this('DIRECTION_POSTPROCESSOR', 58);

  static readonly #VALUES: readonly IntermediateProcessorStrategy[] = [
    IntermediateProcessorStrategy.DIRECTION_PREPROCESSOR,
    IntermediateProcessorStrategy.COMMENT_PREPROCESSOR,
    IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER,
    IntermediateProcessorStrategy.INTERACTIVE_EXTERNAL_PORT_POSITIONER,
    IntermediateProcessorStrategy.PARTITION_PREPROCESSOR,
    IntermediateProcessorStrategy.LABEL_DUMMY_INSERTER,
    IntermediateProcessorStrategy.SELF_LOOP_PREPROCESSOR,
    IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR,
    IntermediateProcessorStrategy.PARTITION_MIDPROCESSOR,
    IntermediateProcessorStrategy.HIGH_DEGREE_NODE_LAYER_PROCESSOR,
    IntermediateProcessorStrategy.NODE_PROMOTION,
    IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR,
    IntermediateProcessorStrategy.PARTITION_POSTPROCESSOR,
    IntermediateProcessorStrategy.HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR,
    IntermediateProcessorStrategy.SEMI_INTERACTIVE_CROSSMIN_PROCESSOR,
    IntermediateProcessorStrategy.BREAKING_POINT_INSERTER,
    IntermediateProcessorStrategy.LONG_EDGE_SPLITTER,
    IntermediateProcessorStrategy.PORT_SIDE_PROCESSOR,
    IntermediateProcessorStrategy.INVERTED_PORT_PROCESSOR,
    IntermediateProcessorStrategy.PORT_LIST_SORTER,
    IntermediateProcessorStrategy.SORT_BY_INPUT_ORDER_OF_MODEL,
    IntermediateProcessorStrategy.NORTH_SOUTH_PORT_PREPROCESSOR,
    IntermediateProcessorStrategy.BREAKING_POINT_PROCESSOR,
    IntermediateProcessorStrategy.ONE_SIDED_GREEDY_SWITCH,
    IntermediateProcessorStrategy.TWO_SIDED_GREEDY_SWITCH,
    IntermediateProcessorStrategy.SELF_LOOP_PORT_RESTORER,
    IntermediateProcessorStrategy.ALTERNATING_LAYER_UNZIPPER,
    IntermediateProcessorStrategy.SINGLE_EDGE_GRAPH_WRAPPER,
    IntermediateProcessorStrategy.IN_LAYER_CONSTRAINT_PROCESSOR,
    IntermediateProcessorStrategy.END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR,
    IntermediateProcessorStrategy.LABEL_AND_NODE_SIZE_PROCESSOR,
    IntermediateProcessorStrategy.INNERMOST_NODE_MARGIN_CALCULATOR,
    IntermediateProcessorStrategy.SELF_LOOP_ROUTER,
    IntermediateProcessorStrategy.COMMENT_NODE_MARGIN_CALCULATOR,
    IntermediateProcessorStrategy.END_LABEL_PREPROCESSOR,
    IntermediateProcessorStrategy.LABEL_DUMMY_SWITCHER,
    IntermediateProcessorStrategy.CENTER_LABEL_MANAGEMENT_PROCESSOR,
    IntermediateProcessorStrategy.LABEL_SIDE_SELECTOR,
    IntermediateProcessorStrategy.HYPEREDGE_DUMMY_MERGER,
    IntermediateProcessorStrategy.HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR,
    IntermediateProcessorStrategy.NODE_PLACEMENT_REPEATER,
    IntermediateProcessorStrategy.LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR,
    IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR,
    IntermediateProcessorStrategy.CONSTRAINTS_POSTPROCESSOR,
    IntermediateProcessorStrategy.COMMENT_POSTPROCESSOR,
    IntermediateProcessorStrategy.HYPERNODE_PROCESSOR,
    IntermediateProcessorStrategy.HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER,
    IntermediateProcessorStrategy.LONG_EDGE_JOINER,
    IntermediateProcessorStrategy.SELF_LOOP_POSTPROCESSOR,
    IntermediateProcessorStrategy.BREAKING_POINT_REMOVER,
    IntermediateProcessorStrategy.NORTH_SOUTH_PORT_POSTPROCESSOR,
    IntermediateProcessorStrategy.HORIZONTAL_COMPACTOR,
    IntermediateProcessorStrategy.LABEL_DUMMY_REMOVER,
    IntermediateProcessorStrategy.FINAL_SPLINE_BENDPOINTS_CALCULATOR,
    IntermediateProcessorStrategy.END_LABEL_SORTER,
    IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER,
    IntermediateProcessorStrategy.END_LABEL_POSTPROCESSOR,
    IntermediateProcessorStrategy.HIERARCHICAL_NODE_RESIZER,
    IntermediateProcessorStrategy.DIRECTION_POSTPROCESSOR,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly IntermediateProcessorStrategy[] {
    return IntermediateProcessorStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): IntermediateProcessorStrategy {
    const found = IntermediateProcessorStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.intermediate.IntermediateProcessorStrategy.${name}`,
      );
    }
    return found;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  compareTo(other: IntermediateProcessorStrategy): number {
    return this.#ordinal - other.#ordinal;
  }

  /**
   * Creates an instance of the layout processor described by this instance. An arm whose class is ported returns a new
   * instance; until its mission (L1, B9) lands, every other arm throws `UnsupportedOperationException` naming the class
   * and the mission, with no import.
   *
   * The Java switch is one 59-arm method; it is split here into a chain of switches, one per run of at most nine
   * members of the enum's own section order, to stay within the complexity limits. A member not handled by a link
   * falls through to the next; the last link holds the Java `default` arm.
   */
  create(): ILayoutProcessor<LGraph> {
    return createBeforePhase1(this);
  }
}

/** Link 1 of 9 in the `create()` chain: before phase 1. */
function createBeforePhase1(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.DIRECTION_PREPROCESSOR:
      throw notPorted('GraphTransformer', '7f');
    case IntermediateProcessorStrategy.COMMENT_PREPROCESSOR:
      throw notPorted('CommentPreprocessor', '7f');
    case IntermediateProcessorStrategy.EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER:
      return new EdgeAndLayerConstraintEdgeReverser();
    case IntermediateProcessorStrategy.INTERACTIVE_EXTERNAL_PORT_POSITIONER:
      return new InteractiveExternalPortPositioner();
    case IntermediateProcessorStrategy.PARTITION_PREPROCESSOR:
      return new PartitionPreprocessor();
    default:
      return createBeforePhase2(strategy);
  }
}

/** Link 2 of 9 in the `create()` chain: before phase 2. */
function createBeforePhase2(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.LABEL_DUMMY_INSERTER:
      throw notPorted('LabelDummyInserter', '7f');
    case IntermediateProcessorStrategy.SELF_LOOP_PREPROCESSOR:
      throw notPorted('SelfLoopPreProcessor', '7g');
    case IntermediateProcessorStrategy.LAYER_CONSTRAINT_PREPROCESSOR:
      return new LayerConstraintPreprocessor();
    case IntermediateProcessorStrategy.PARTITION_MIDPROCESSOR:
      return new PartitionMidprocessor();
    default:
      return createBeforePhase3(strategy);
  }
}

/** Link 3 of 9 in the `create()` chain: before phase 3. */
function createBeforePhase3(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.HIGH_DEGREE_NODE_LAYER_PROCESSOR:
      return new HighDegreeNodeLayeringProcessor();
    case IntermediateProcessorStrategy.NODE_PROMOTION:
      return new NodePromotion();
    case IntermediateProcessorStrategy.LAYER_CONSTRAINT_POSTPROCESSOR:
      return new LayerConstraintPostprocessor();
    case IntermediateProcessorStrategy.PARTITION_POSTPROCESSOR:
      return new PartitionPostprocessor();
    case IntermediateProcessorStrategy.HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR:
      throw notPorted('HierarchicalPortConstraintProcessor', '7f');
    case IntermediateProcessorStrategy.SEMI_INTERACTIVE_CROSSMIN_PROCESSOR:
      throw notPorted('SemiInteractiveCrossMinProcessor', '7f');
    case IntermediateProcessorStrategy.BREAKING_POINT_INSERTER:
      throw notPorted('BreakingPointInserter', '7g');
    case IntermediateProcessorStrategy.LONG_EDGE_SPLITTER:
      throw notPorted('LongEdgeSplitter', '7f');
    case IntermediateProcessorStrategy.PORT_SIDE_PROCESSOR:
      throw notPorted('PortSideProcessor', '7f');
    default:
      return createBeforePhase32(strategy);
  }
}

/** Link 4 of 9 in the `create()` chain: before phase 3 (continued). */
function createBeforePhase32(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.INVERTED_PORT_PROCESSOR:
      throw notPorted('InvertedPortProcessor', '7f');
    case IntermediateProcessorStrategy.PORT_LIST_SORTER:
      throw notPorted('PortListSorter', '7f');
    case IntermediateProcessorStrategy.SORT_BY_INPUT_ORDER_OF_MODEL:
      throw notPorted('SortByInputModelProcessor', '7f');
    case IntermediateProcessorStrategy.NORTH_SOUTH_PORT_PREPROCESSOR:
      throw notPorted('NorthSouthPortPreprocessor', '7f');
    default:
      return createBeforePhase4(strategy);
  }
}

/** Link 5 of 9 in the `create()` chain: before phase 4. */
function createBeforePhase4(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.BREAKING_POINT_PROCESSOR:
      throw notPorted('BreakingPointProcessor', '7g');
    case IntermediateProcessorStrategy.ONE_SIDED_GREEDY_SWITCH:
      throw notPorted('LayerSweepCrossingMinimizer', '7c');
    case IntermediateProcessorStrategy.TWO_SIDED_GREEDY_SWITCH:
      throw notPorted('LayerSweepCrossingMinimizer', '7c');
    case IntermediateProcessorStrategy.SELF_LOOP_PORT_RESTORER:
      throw notPorted('SelfLoopPortRestorer', '7g');
    case IntermediateProcessorStrategy.ALTERNATING_LAYER_UNZIPPER:
      throw notPorted('AlternatingLayerUnzipper', '7f');
    case IntermediateProcessorStrategy.SINGLE_EDGE_GRAPH_WRAPPER:
      throw notPorted('SingleEdgeGraphWrapper', '7g');
    case IntermediateProcessorStrategy.IN_LAYER_CONSTRAINT_PROCESSOR:
      throw notPorted('InLayerConstraintProcessor', '7f');
    case IntermediateProcessorStrategy.END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR:
      throw notPorted('LabelManagementProcessor', '7f');
    case IntermediateProcessorStrategy.LABEL_AND_NODE_SIZE_PROCESSOR:
      throw notPorted('LabelAndNodeSizeProcessor', '7f');
    default:
      return createBeforePhase42(strategy);
  }
}

/** Link 6 of 9 in the `create()` chain: before phase 4 (continued). */
function createBeforePhase42(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.INNERMOST_NODE_MARGIN_CALCULATOR:
      throw notPorted('InnermostNodeMarginCalculator', '7f');
    case IntermediateProcessorStrategy.SELF_LOOP_ROUTER:
      throw notPorted('SelfLoopRouter', '7g');
    case IntermediateProcessorStrategy.COMMENT_NODE_MARGIN_CALCULATOR:
      throw notPorted('CommentNodeMarginCalculator', '7f');
    case IntermediateProcessorStrategy.END_LABEL_PREPROCESSOR:
      throw notPorted('EndLabelPreprocessor', '7f');
    case IntermediateProcessorStrategy.LABEL_DUMMY_SWITCHER:
      throw notPorted('LabelDummySwitcher', '7f');
    case IntermediateProcessorStrategy.CENTER_LABEL_MANAGEMENT_PROCESSOR:
      throw notPorted('LabelManagementProcessor', '7f');
    case IntermediateProcessorStrategy.LABEL_SIDE_SELECTOR:
      throw notPorted('LabelSideSelector', '7f');
    case IntermediateProcessorStrategy.HYPEREDGE_DUMMY_MERGER:
      throw notPorted('HyperedgeDummyMerger', '7f');
    case IntermediateProcessorStrategy.HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR:
      throw notPorted('HierarchicalPortDummySizeProcessor', '7f');
    default:
      return createBeforePhase5(strategy);
  }
}

/** Link 7 of 9 in the `create()` chain: before phase 5. */
function createBeforePhase5(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.NODE_PLACEMENT_REPEATER:
      throw notPorted('NodePlacementRepeater', '7f');
    case IntermediateProcessorStrategy.LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR:
      throw notPorted('LayerSizeAndGraphHeightCalculator', '7f');
    case IntermediateProcessorStrategy.HIERARCHICAL_PORT_POSITION_PROCESSOR:
      throw notPorted('HierarchicalPortPositionProcessor', '7f');
    default:
      return createAfterPhase5(strategy);
  }
}

/** Link 8 of 9 in the `create()` chain: after phase 5. */
function createAfterPhase5(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.CONSTRAINTS_POSTPROCESSOR:
      throw notPorted('ConstraintsPostprocessor', '7f');
    case IntermediateProcessorStrategy.COMMENT_POSTPROCESSOR:
      throw notPorted('CommentPostprocessor', '7f');
    case IntermediateProcessorStrategy.HYPERNODE_PROCESSOR:
      throw notPorted('HypernodesProcessor', '7f');
    case IntermediateProcessorStrategy.HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER:
      throw notPorted('HierarchicalPortOrthogonalEdgeRouter', '7f');
    case IntermediateProcessorStrategy.LONG_EDGE_JOINER:
      throw notPorted('LongEdgeJoiner', '7f');
    case IntermediateProcessorStrategy.SELF_LOOP_POSTPROCESSOR:
      throw notPorted('SelfLoopPostProcessor', '7g');
    case IntermediateProcessorStrategy.BREAKING_POINT_REMOVER:
      throw notPorted('BreakingPointRemover', '7g');
    case IntermediateProcessorStrategy.NORTH_SOUTH_PORT_POSTPROCESSOR:
      throw notPorted('NorthSouthPortPostprocessor', '7f');
    case IntermediateProcessorStrategy.HORIZONTAL_COMPACTOR:
      throw notPorted('HorizontalGraphCompactor', '7g');
    default:
      return createAfterPhase52(strategy);
  }
}

/** Link 9 of 9 in the `create()` chain: after phase 5 (continued). */
function createAfterPhase52(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy) {
    case IntermediateProcessorStrategy.LABEL_DUMMY_REMOVER:
      throw notPorted('LabelDummyRemover', '7f');
    case IntermediateProcessorStrategy.FINAL_SPLINE_BENDPOINTS_CALCULATOR:
      throw notPorted('FinalSplineBendpointsCalculator', '7f');
    case IntermediateProcessorStrategy.END_LABEL_SORTER:
      throw notPorted('EndLabelSorter', '7f');
    case IntermediateProcessorStrategy.REVERSED_EDGE_RESTORER:
      return new ReversedEdgeRestorer();
    case IntermediateProcessorStrategy.END_LABEL_POSTPROCESSOR:
      throw notPorted('EndLabelPostprocessor', '7f');
    case IntermediateProcessorStrategy.HIERARCHICAL_NODE_RESIZER:
      throw notPorted('HierarchicalNodeResizingProcessor', '7f');
    case IntermediateProcessorStrategy.DIRECTION_POSTPROCESSOR:
      throw notPorted('GraphTransformer', '7f');
    default:
      throw new IllegalArgumentException(
        `No implementation is available for the layout processor ${strategy.toString()}`,
      );
  }
}

/** The L1 placeholder for a `create()` arm whose class is not ported yet. */
function notPorted(className: string, mission: string): UnsupportedOperationException {
  return new UnsupportedOperationException(`${className} is ported in mission ${mission}`);
}
