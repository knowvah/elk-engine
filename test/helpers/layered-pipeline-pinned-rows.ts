// SPDX-License-Identifier: EPL-2.0
// Rows pinned to the throw of a later mission's stage (decisions FX6, FX7, user, mission 7f). The recorders check only a row's
// prefix for ported members, while the real driver builds the whole plan first (`AlgorithmAssembler.build`), so these rows throw at
// plan build until the named mission wires the arm. The refs stay frozen: 7f2 and 7g delete their entries and the rows then replay
// their recorded expectations.

const LABEL_DUMMY_INSERTER_7F2 = 'LabelDummyInserter is ported in mission 7f2';
const COMMENT_PREPROCESSOR_7F2 = 'CommentPreprocessor is ported in mission 7f2';
const SELF_LOOP_PREPROCESSOR_7G = 'SelfLoopPreProcessor is ported in mission 7g';

/** The rows of `layered-pipeline.json` (FX7). */
export const PINNED_PIPELINE_ROWS: ReadonlyMap<string, string> = new Map<string, string>([
  ['models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN', SELF_LOOP_PREPROCESSOR_7G],
  ['models/hyperedge_merging-hyperedge_labels/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/hyperedge_merging-hyperedge_labels/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/hyperedge_merging-hyperedge_labels/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/hyperedge_merging-unequal_src_tgt_with_labels/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/hyperedge_merging-unequal_src_tgt_with_labels/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/hyperedge_merging-unequal_src_tgt_with_labels/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/partitioning-withEdgeLabels/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/partitioning-withEdgeLabels/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/partitioning-withEdgeLabels/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-backwardsEdges/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-backwardsEdges/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-backwardsEdges/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-dummyNodeNoConnectedNode/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-dummyNodeNoConnectedNode/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-dummyNodeNoConnectedNode/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-dummyNodeNoConnectingNode2/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-dummyNodeNoConnectingNode2/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-dummyNodeNoConnectingNode2/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-longConflictingExample/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-longConflictingExample/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-longConflictingExample/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-noCrossings/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-noCrossings/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-noCrossings/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-nodeBetweenDummies/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-nodeBetweenDummies/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-nodeBetweenDummies/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-oneCrossing/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-oneCrossing/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-oneCrossing/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-sameTargetTogether/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-sameTargetTogether/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-sameTargetTogether/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-sameTargetTogether2/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-sameTargetTogether2/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-sameTargetTogether2/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleConflictingExample/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleConflictingExample/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleConflictingExample/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleLongEdges01/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleLongEdges01/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleLongEdges01/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleLongEdges02/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleLongEdges02/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-simpleLongEdges02/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-smallExample/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-smallExample/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-smallExample/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-timedAutomaton/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-timedAutomaton/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-timedAutomaton/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-timedAutomatonMoreEdges/root/DIRECTION_PREPROCESSOR/DOWN', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-timedAutomatonMoreEdges/root/DIRECTION_PREPROCESSOR/LEFT', LABEL_DUMMY_INSERTER_7F2],
  ['models/preserve_order-timedAutomatonMoreEdges/root/DIRECTION_PREPROCESSOR/UP', LABEL_DUMMY_INSERTER_7F2],
  ['models/node_placement-KIPRA-1426-demo2-KIPRA-1426/root/DIRECTION_PREPROCESSOR/DOWN', COMMENT_PREPROCESSOR_7F2],
  ['models/node_placement-KIPRA-1426-demo2-KIPRA-1426/root/DIRECTION_PREPROCESSOR/LEFT', COMMENT_PREPROCESSOR_7F2],
  ['models/node_placement-KIPRA-1426-demo2-KIPRA-1426/root/DIRECTION_PREPROCESSOR/UP', COMMENT_PREPROCESSOR_7F2],
]);

/** The rows of `layered-phases.json` (FX6). */
export const PINNED_PHASE_ROWS: ReadonlyMap<string, string> = new Map<string, string>([
  ['models/partitioning-withEdgeLabels/root/P1/MODEL_ORDER/nodes-and-edges', LABEL_DUMMY_INSERTER_7F2],
  ['models/partitioning-withEdgeLabels/root/P1/MODEL_ORDER/prefer-edges', LABEL_DUMMY_INSERTER_7F2],
]);
