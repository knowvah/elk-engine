// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { IntermediateProcessorStrategy as Strategy } from './IntermediateProcessorStrategy.js';

const DECLARED = [
  'DIRECTION_PREPROCESSOR',
  'COMMENT_PREPROCESSOR',
  'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER',
  'INTERACTIVE_EXTERNAL_PORT_POSITIONER',
  'PARTITION_PREPROCESSOR',
  'LABEL_DUMMY_INSERTER',
  'SELF_LOOP_PREPROCESSOR',
  'LAYER_CONSTRAINT_PREPROCESSOR',
  'PARTITION_MIDPROCESSOR',
  'HIGH_DEGREE_NODE_LAYER_PROCESSOR',
  'NODE_PROMOTION',
  'LAYER_CONSTRAINT_POSTPROCESSOR',
  'PARTITION_POSTPROCESSOR',
  'HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR',
  'SEMI_INTERACTIVE_CROSSMIN_PROCESSOR',
  'BREAKING_POINT_INSERTER',
  'LONG_EDGE_SPLITTER',
  'PORT_SIDE_PROCESSOR',
  'INVERTED_PORT_PROCESSOR',
  'PORT_LIST_SORTER',
  'SORT_BY_INPUT_ORDER_OF_MODEL',
  'NORTH_SOUTH_PORT_PREPROCESSOR',
  'BREAKING_POINT_PROCESSOR',
  'ONE_SIDED_GREEDY_SWITCH',
  'TWO_SIDED_GREEDY_SWITCH',
  'SELF_LOOP_PORT_RESTORER',
  'ALTERNATING_LAYER_UNZIPPER',
  'SINGLE_EDGE_GRAPH_WRAPPER',
  'IN_LAYER_CONSTRAINT_PROCESSOR',
  'END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR',
  'LABEL_AND_NODE_SIZE_PROCESSOR',
  'INNERMOST_NODE_MARGIN_CALCULATOR',
  'SELF_LOOP_ROUTER',
  'COMMENT_NODE_MARGIN_CALCULATOR',
  'END_LABEL_PREPROCESSOR',
  'LABEL_DUMMY_SWITCHER',
  'CENTER_LABEL_MANAGEMENT_PROCESSOR',
  'LABEL_SIDE_SELECTOR',
  'HYPEREDGE_DUMMY_MERGER',
  'HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR',
  'NODE_PLACEMENT_REPEATER',
  'LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR',
  'HIERARCHICAL_PORT_POSITION_PROCESSOR',
  'CONSTRAINTS_POSTPROCESSOR',
  'COMMENT_POSTPROCESSOR',
  'HYPERNODE_PROCESSOR',
  'HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER',
  'LONG_EDGE_JOINER',
  'SELF_LOOP_POSTPROCESSOR',
  'BREAKING_POINT_REMOVER',
  'NORTH_SOUTH_PORT_POSTPROCESSOR',
  'HORIZONTAL_COMPACTOR',
  'LABEL_DUMMY_REMOVER',
  'FINAL_SPLINE_BENDPOINTS_CALCULATOR',
  'END_LABEL_SORTER',
  'REVERSED_EDGE_RESTORER',
  'END_LABEL_POSTPROCESSOR',
  'HIERARCHICAL_NODE_RESIZER',
  'DIRECTION_POSTPROCESSOR',
] as const;

type Name = (typeof DECLARED)[number];

/** Constant name to the class its `create()` arm will return, and the mission porting it (B9). */
const ARMS: Record<Name, [string, string]> = {
  DIRECTION_PREPROCESSOR: ['GraphTransformer', '7f'],
  COMMENT_PREPROCESSOR: ['CommentPreprocessor', '7f'],
  EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER: ['EdgeAndLayerConstraintEdgeReverser', '7b'],
  INTERACTIVE_EXTERNAL_PORT_POSITIONER: ['InteractiveExternalPortPositioner', '7b'],
  PARTITION_PREPROCESSOR: ['PartitionPreprocessor', '7b'],
  LABEL_DUMMY_INSERTER: ['LabelDummyInserter', '7f'],
  SELF_LOOP_PREPROCESSOR: ['SelfLoopPreProcessor', '7g'],
  LAYER_CONSTRAINT_PREPROCESSOR: ['LayerConstraintPreprocessor', '7b'],
  PARTITION_MIDPROCESSOR: ['PartitionMidprocessor', '7b'],
  HIGH_DEGREE_NODE_LAYER_PROCESSOR: ['HighDegreeNodeLayeringProcessor', '7b'],
  NODE_PROMOTION: ['NodePromotion', '7b'],
  LAYER_CONSTRAINT_POSTPROCESSOR: ['LayerConstraintPostprocessor', '7b'],
  PARTITION_POSTPROCESSOR: ['PartitionPostprocessor', '7b'],
  HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR: ['HierarchicalPortConstraintProcessor', '7f'],
  SEMI_INTERACTIVE_CROSSMIN_PROCESSOR: ['SemiInteractiveCrossMinProcessor', '7f'],
  BREAKING_POINT_INSERTER: ['BreakingPointInserter', '7g'],
  LONG_EDGE_SPLITTER: ['LongEdgeSplitter', '7f'],
  PORT_SIDE_PROCESSOR: ['PortSideProcessor', '7f'],
  INVERTED_PORT_PROCESSOR: ['InvertedPortProcessor', '7f'],
  PORT_LIST_SORTER: ['PortListSorter', '7f'],
  SORT_BY_INPUT_ORDER_OF_MODEL: ['SortByInputModelProcessor', '7f'],
  NORTH_SOUTH_PORT_PREPROCESSOR: ['NorthSouthPortPreprocessor', '7f'],
  BREAKING_POINT_PROCESSOR: ['BreakingPointProcessor', '7g'],
  ONE_SIDED_GREEDY_SWITCH: ['LayerSweepCrossingMinimizer', '7c'],
  TWO_SIDED_GREEDY_SWITCH: ['LayerSweepCrossingMinimizer', '7c'],
  SELF_LOOP_PORT_RESTORER: ['SelfLoopPortRestorer', '7g'],
  ALTERNATING_LAYER_UNZIPPER: ['AlternatingLayerUnzipper', '7f'],
  SINGLE_EDGE_GRAPH_WRAPPER: ['SingleEdgeGraphWrapper', '7g'],
  IN_LAYER_CONSTRAINT_PROCESSOR: ['InLayerConstraintProcessor', '7f'],
  END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR: ['LabelManagementProcessor', '7f'],
  LABEL_AND_NODE_SIZE_PROCESSOR: ['LabelAndNodeSizeProcessor', '7f'],
  INNERMOST_NODE_MARGIN_CALCULATOR: ['InnermostNodeMarginCalculator', '7f'],
  SELF_LOOP_ROUTER: ['SelfLoopRouter', '7g'],
  COMMENT_NODE_MARGIN_CALCULATOR: ['CommentNodeMarginCalculator', '7f'],
  END_LABEL_PREPROCESSOR: ['EndLabelPreprocessor', '7f'],
  LABEL_DUMMY_SWITCHER: ['LabelDummySwitcher', '7f'],
  CENTER_LABEL_MANAGEMENT_PROCESSOR: ['LabelManagementProcessor', '7f'],
  LABEL_SIDE_SELECTOR: ['LabelSideSelector', '7f'],
  HYPEREDGE_DUMMY_MERGER: ['HyperedgeDummyMerger', '7f'],
  HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR: ['HierarchicalPortDummySizeProcessor', '7f'],
  NODE_PLACEMENT_REPEATER: ['NodePlacementRepeater', '7f'],
  LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR: ['LayerSizeAndGraphHeightCalculator', '7f'],
  HIERARCHICAL_PORT_POSITION_PROCESSOR: ['HierarchicalPortPositionProcessor', '7f'],
  CONSTRAINTS_POSTPROCESSOR: ['ConstraintsPostprocessor', '7f'],
  COMMENT_POSTPROCESSOR: ['CommentPostprocessor', '7f'],
  HYPERNODE_PROCESSOR: ['HypernodesProcessor', '7f'],
  HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER: ['HierarchicalPortOrthogonalEdgeRouter', '7f'],
  LONG_EDGE_JOINER: ['LongEdgeJoiner', '7f'],
  SELF_LOOP_POSTPROCESSOR: ['SelfLoopPostProcessor', '7g'],
  BREAKING_POINT_REMOVER: ['BreakingPointRemover', '7g'],
  NORTH_SOUTH_PORT_POSTPROCESSOR: ['NorthSouthPortPostprocessor', '7f'],
  HORIZONTAL_COMPACTOR: ['HorizontalGraphCompactor', '7g'],
  LABEL_DUMMY_REMOVER: ['LabelDummyRemover', '7f'],
  FINAL_SPLINE_BENDPOINTS_CALCULATOR: ['FinalSplineBendpointsCalculator', '7f'],
  END_LABEL_SORTER: ['EndLabelSorter', '7f'],
  REVERSED_EDGE_RESTORER: ['ReversedEdgeRestorer', '7b'],
  END_LABEL_POSTPROCESSOR: ['EndLabelPostprocessor', '7f'],
  HIERARCHICAL_NODE_RESIZER: ['HierarchicalNodeResizingProcessor', '7f'],
  DIRECTION_POSTPROCESSOR: ['GraphTransformer', '7f'],
};

describe('IntermediateProcessorStrategy', () => {
  it('declares the 59 constants in Java order with matching ordinals and names', () => {
    expect(DECLARED).toHaveLength(59);
    expect(Strategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(Strategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(Strategy.values()[58]).toBe(Strategy.DIRECTION_POSTPROCESSOR);
  });

  it('toString is the name and compareTo orders by ordinal', () => {
    expect(Strategy.DIRECTION_POSTPROCESSOR.toString()).toBe('DIRECTION_POSTPROCESSOR');
    expect(Strategy.DIRECTION_POSTPROCESSOR.compareTo(Strategy.DIRECTION_PREPROCESSOR)).toBe(58);
    expect(Strategy.DIRECTION_PREPROCESSOR.compareTo(Strategy.DIRECTION_POSTPROCESSOR)).toBe(-58);
    expect(Strategy.DIRECTION_PREPROCESSOR.compareTo(Strategy.DIRECTION_PREPROCESSOR)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(Strategy.valueOf(name)).toBe(Strategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => Strategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => Strategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.intermediate.IntermediateProcessorStrategy.FOO',
    );
  });

  it.each(DECLARED)('create() of %s throws UnsupportedOperationException naming its class and mission', (name) => {
    const [className, mission] = ARMS[name];
    expect(() => Strategy[name].create()).toThrow(UnsupportedOperationException);
    expect(() => Strategy[name].create()).toThrow(
      new UnsupportedOperationException(`${className} is ported in mission ${mission}`),
    );
  });

  it('assigns the missions per B9 (10 in 7b, 2 in 7c, 9 in 7g, 38 in 7f)', () => {
    const tally = new Map<string, number>();
    for (const [, mission] of Object.values(ARMS)) tally.set(mission, (tally.get(mission) ?? 0) + 1);
    expect(Object.fromEntries(tally)).toEqual({ '7b': 10, '7c': 2, '7g': 9, '7f': 38 });
  });

  it('create() of an unknown strategy keeps the Java IllegalArgumentException text', () => {
    const unknown = { toString: () => 'FAKE' } as unknown as Strategy;
    expect(() => Strategy.prototype.create.call(unknown)).toThrow(IllegalArgumentException);
    expect(() => Strategy.prototype.create.call(unknown)).toThrow(
      'No implementation is available for the layout processor FAKE',
    );
  });
});
