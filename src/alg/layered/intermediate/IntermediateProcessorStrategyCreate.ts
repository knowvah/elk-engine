// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayerSweepCrossingMinimizer } from '../p3order/LayerSweepCrossingMinimizer.js';
import { LayerSweepCrossingMinimizerCrossMinType as CrossMinType } from '../p3order/LayerSweepCrossingMinimizerCrossMinType.js';
import { EdgeAndLayerConstraintEdgeReverser } from './EdgeAndLayerConstraintEdgeReverser.js';
import { FinalSplineBendpointsCalculator } from './FinalSplineBendpointsCalculator.js';
import { HierarchicalPortConstraintProcessor } from './HierarchicalPortConstraintProcessor.js';
import { HierarchicalPortDummySizeProcessor } from './HierarchicalPortDummySizeProcessor.js';
import { HierarchicalPortPositionProcessor } from './HierarchicalPortPositionProcessor.js';
import { HighDegreeNodeLayeringProcessor } from './HighDegreeNodeLayeringProcessor.js';
import { HyperedgeDummyMerger } from './HyperedgeDummyMerger.js';
import { InLayerConstraintProcessor } from './InLayerConstraintProcessor.js';
import { InnermostNodeMarginCalculator } from './InnermostNodeMarginCalculator.js';
import { InteractiveExternalPortPositioner } from './InteractiveExternalPortPositioner.js';
import type { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { InvertedPortProcessor } from './InvertedPortProcessor.js';
import { LabelAndNodeSizeProcessor } from './LabelAndNodeSizeProcessor.js';
import { LayerConstraintPostprocessor } from './LayerConstraintPostprocessor.js';
import { LayerConstraintPreprocessor } from './LayerConstraintPreprocessor.js';
import { LayerSizeAndGraphHeightCalculator } from './LayerSizeAndGraphHeightCalculator.js';
import { LongEdgeJoiner } from './LongEdgeJoiner.js';
import { LongEdgeSplitter } from './LongEdgeSplitter.js';
import { NodePlacementRepeater } from './NodePlacementRepeater.js';
import { NodePromotion } from './NodePromotion.js';
import { NorthSouthPortPostprocessor } from './NorthSouthPortPostprocessor.js';
import { NorthSouthPortPreprocessor } from './NorthSouthPortPreprocessor.js';
import { PartitionMidprocessor } from './PartitionMidprocessor.js';
import { PartitionPostprocessor } from './PartitionPostprocessor.js';
import { PartitionPreprocessor } from './PartitionPreprocessor.js';
import { PortListSorter } from './PortListSorter.js';
import { PortSideProcessor } from './PortSideProcessor.js';
import { ReversedEdgeRestorer } from './ReversedEdgeRestorer.js';
import { SemiInteractiveCrossMinProcessor } from './SemiInteractiveCrossMinProcessor.js';
import { SortByInputModelProcessor } from './SortByInputModelProcessor.js';

/**
 * Section of `IntermediateProcessorStrategy` (mission 7e decision R5, P1): the body of the Java `create()` switch.
 * The enum file keeps the constants and delegates here; this section imports the enum as a type only, so wiring an
 * arm never adds a runtime edge from the enum module to a processor class beyond the one the Java has.
 *
 * The Java switch is one 59-arm method; it is split here into a chain of switches, one per run of at most nine
 * members of the enum's own section order, to stay within the complexity limits. Each link switches on the
 * constant's `name()`, with the Java constant names as string literals. A member not handled by a link falls through
 * to the next; the last link holds the Java `default` arm.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/IntermediateProcessorStrategy.java
 */
export function createIntermediateProcessor(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  return createBeforePhase1(strategy);
}

/** Link 1 of 9 in the `create()` chain: before phase 1. */
function createBeforePhase1(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'DIRECTION_PREPROCESSOR':
      throw notPorted('GraphTransformer', '7f');
    case 'COMMENT_PREPROCESSOR':
      throw notPorted('CommentPreprocessor', '7f');
    case 'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER':
      return new EdgeAndLayerConstraintEdgeReverser();
    case 'INTERACTIVE_EXTERNAL_PORT_POSITIONER':
      return new InteractiveExternalPortPositioner();
    case 'PARTITION_PREPROCESSOR':
      return new PartitionPreprocessor();
    default:
      return createBeforePhase2(strategy);
  }
}

/** Link 2 of 9 in the `create()` chain: before phase 2. */
function createBeforePhase2(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'LABEL_DUMMY_INSERTER':
      throw notPorted('LabelDummyInserter', '7f');
    case 'SELF_LOOP_PREPROCESSOR':
      throw notPorted('SelfLoopPreProcessor', '7g');
    case 'LAYER_CONSTRAINT_PREPROCESSOR':
      return new LayerConstraintPreprocessor();
    case 'PARTITION_MIDPROCESSOR':
      return new PartitionMidprocessor();
    default:
      return createBeforePhase3(strategy);
  }
}

/** Link 3 of 9 in the `create()` chain: before phase 3. */
function createBeforePhase3(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'HIGH_DEGREE_NODE_LAYER_PROCESSOR':
      return new HighDegreeNodeLayeringProcessor();
    case 'NODE_PROMOTION':
      return new NodePromotion();
    case 'LAYER_CONSTRAINT_POSTPROCESSOR':
      return new LayerConstraintPostprocessor();
    case 'PARTITION_POSTPROCESSOR':
      return new PartitionPostprocessor();
    case 'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR':
      return new HierarchicalPortConstraintProcessor();
    case 'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR':
      return new SemiInteractiveCrossMinProcessor();
    case 'BREAKING_POINT_INSERTER':
      throw notPorted('BreakingPointInserter', '7g');
    case 'LONG_EDGE_SPLITTER':
      return new LongEdgeSplitter();
    case 'PORT_SIDE_PROCESSOR':
      return new PortSideProcessor();
    default:
      return createBeforePhase32(strategy);
  }
}

/** Link 4 of 9 in the `create()` chain: before phase 3 (continued). */
function createBeforePhase32(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'INVERTED_PORT_PROCESSOR':
      return new InvertedPortProcessor();
    case 'PORT_LIST_SORTER':
      return new PortListSorter();
    case 'SORT_BY_INPUT_ORDER_OF_MODEL':
      return new SortByInputModelProcessor();
    case 'NORTH_SOUTH_PORT_PREPROCESSOR':
      return new NorthSouthPortPreprocessor();
    default:
      return createBeforePhase4(strategy);
  }
}

/** Link 5 of 9 in the `create()` chain: before phase 4. */
function createBeforePhase4(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'BREAKING_POINT_PROCESSOR':
      throw notPorted('BreakingPointProcessor', '7g');
    case 'ONE_SIDED_GREEDY_SWITCH':
      return new LayerSweepCrossingMinimizer(CrossMinType.ONE_SIDED_GREEDY_SWITCH);
    case 'TWO_SIDED_GREEDY_SWITCH':
      return new LayerSweepCrossingMinimizer(CrossMinType.TWO_SIDED_GREEDY_SWITCH);
    case 'SELF_LOOP_PORT_RESTORER':
      throw notPorted('SelfLoopPortRestorer', '7g');
    case 'ALTERNATING_LAYER_UNZIPPER':
      throw notPorted('AlternatingLayerUnzipper', '7f');
    case 'SINGLE_EDGE_GRAPH_WRAPPER':
      throw notPorted('SingleEdgeGraphWrapper', '7g');
    case 'IN_LAYER_CONSTRAINT_PROCESSOR':
      return new InLayerConstraintProcessor();
    case 'END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR':
      throw notPorted('LabelManagementProcessor', '7f');
    case 'LABEL_AND_NODE_SIZE_PROCESSOR':
      return new LabelAndNodeSizeProcessor();
    default:
      return createBeforePhase42(strategy);
  }
}

/** Link 6 of 9 in the `create()` chain: before phase 4 (continued). */
function createBeforePhase42(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'INNERMOST_NODE_MARGIN_CALCULATOR':
      return new InnermostNodeMarginCalculator();
    case 'SELF_LOOP_ROUTER':
      throw notPorted('SelfLoopRouter', '7g');
    case 'COMMENT_NODE_MARGIN_CALCULATOR':
      throw notPorted('CommentNodeMarginCalculator', '7f');
    case 'END_LABEL_PREPROCESSOR':
      throw notPorted('EndLabelPreprocessor', '7f');
    case 'LABEL_DUMMY_SWITCHER':
      throw notPorted('LabelDummySwitcher', '7f');
    case 'CENTER_LABEL_MANAGEMENT_PROCESSOR':
      throw notPorted('LabelManagementProcessor', '7f');
    case 'LABEL_SIDE_SELECTOR':
      throw notPorted('LabelSideSelector', '7f');
    case 'HYPEREDGE_DUMMY_MERGER':
      return new HyperedgeDummyMerger();
    case 'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR':
      return new HierarchicalPortDummySizeProcessor();
    default:
      return createBeforePhase5(strategy);
  }
}

/** Link 7 of 9 in the `create()` chain: before phase 5. */
function createBeforePhase5(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'NODE_PLACEMENT_REPEATER':
      return new NodePlacementRepeater();
    case 'LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR':
      return new LayerSizeAndGraphHeightCalculator();
    case 'HIERARCHICAL_PORT_POSITION_PROCESSOR':
      return new HierarchicalPortPositionProcessor();
    default:
      return createAfterPhase5(strategy);
  }
}

/** Link 8 of 9 in the `create()` chain: after phase 5. */
function createAfterPhase5(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'CONSTRAINTS_POSTPROCESSOR':
      throw notPorted('ConstraintsPostprocessor', '7f');
    case 'COMMENT_POSTPROCESSOR':
      throw notPorted('CommentPostprocessor', '7f');
    case 'HYPERNODE_PROCESSOR':
      throw notPorted('HypernodesProcessor', '7f');
    case 'HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER':
      throw notPorted('HierarchicalPortOrthogonalEdgeRouter', '7f');
    case 'LONG_EDGE_JOINER':
      return new LongEdgeJoiner();
    case 'SELF_LOOP_POSTPROCESSOR':
      throw notPorted('SelfLoopPostProcessor', '7g');
    case 'BREAKING_POINT_REMOVER':
      throw notPorted('BreakingPointRemover', '7g');
    case 'NORTH_SOUTH_PORT_POSTPROCESSOR':
      return new NorthSouthPortPostprocessor();
    case 'HORIZONTAL_COMPACTOR':
      throw notPorted('HorizontalGraphCompactor', '7g');
    default:
      return createAfterPhase52(strategy);
  }
}

/** Link 9 of 9 in the `create()` chain: after phase 5 (continued). */
function createAfterPhase52(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph> {
  switch (strategy.name()) {
    case 'LABEL_DUMMY_REMOVER':
      throw notPorted('LabelDummyRemover', '7f');
    case 'FINAL_SPLINE_BENDPOINTS_CALCULATOR':
      return new FinalSplineBendpointsCalculator();
    case 'END_LABEL_SORTER':
      throw notPorted('EndLabelSorter', '7f');
    case 'REVERSED_EDGE_RESTORER':
      return new ReversedEdgeRestorer();
    case 'END_LABEL_POSTPROCESSOR':
      throw notPorted('EndLabelPostprocessor', '7f');
    case 'HIERARCHICAL_NODE_RESIZER':
      throw notPorted('HierarchicalNodeResizingProcessor', '7f');
    case 'DIRECTION_POSTPROCESSOR':
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
