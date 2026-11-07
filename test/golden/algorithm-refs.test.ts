// SPDX-License-Identifier: EPL-2.0
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isGoldenEntry, loadVariantNames, repoRoot } from '../corpus/corpus.js';
import type { GoldenEntry } from '../corpus/corpus.js';
import { compareLayout, formatDiffs } from './compare-json.js';
import { compareIdSets, geometryViolations } from './oracle-refs.test.js';

const GOLDEN_DIR = path.join(repoRoot(), 'test', 'golden');
const ALGORITHMS_FILE = path.join(GOLDEN_DIR, 'algorithms.json');
const REFS_DIR = path.join(GOLDEN_DIR, 'refs', 'elk-algorithms');
const INPUTS_DIR = path.join(GOLDEN_DIR, 'inputs');
const INPUTS_MANIFEST = path.join(INPUTS_DIR, 'manifest.json');
const CORPUS_MANIFEST = path.join(repoRoot(), 'test', 'corpus', 'manifest.json');
const ELK_COMMIT_FILE = path.join(repoRoot(), 'tools', 'oracle', 'ELK_COMMIT');
const META_FILE = '_meta.json';
const JSON_EXT = '.json';
const GENERATED_BY = 'tools/oracle/regen-goldens.sh';
const GOLDEN_ALGORITHMS = ['org.eclipse.elk.fixed', 'org.eclipse.elk.box', 'org.eclipse.elk.random'];
const SEEDED_VARIANT = 'random-seed-1';
const RANDOM_ALGORITHM = 'org.eclipse.elk.random';
/** fixed, box and random do not route: an edge with no input sections has none in the ref (not a defect). */
const NO_ROUTING_SUFFIX = '.sections';
const TICKET_INPUTS = [
  'tickets/core/457_boxLayouterIgnoresMinimumSize.elkt',
  'tickets/core/475_fixedLayoutWithLongLabels.elkt',
  'tickets/core/489_paddingAndMinSize_Large.elkt',
  'tickets/core/489_paddingAndMinSize_Small.elkt',
];
/**
 * Inputs of the layered phase vectors (mission 7b B5, `tools/vectors/LayeredPhaseVectors.java`): vendored with
 * SHA-256 rows so the recorder and `test/helpers/layered-phase-replay-rows.ts` pin them; they have no algorithm
 * golden (alg-common AC5: the list below pins the exact vendored set).
 */
const LAYERED_PHASE_INPUTS = [
  'tests/layered/layer_constraints/01.elkt',
  'tests/layered/layer_constraints/02.elkt',
  'tests/layered/layer_constraints/03.elkt',
  'tests/layered/layer_constraints/emptyLayerFirst.elkt',
  'tests/layered/layer_constraints/emptyLayerLast.elkt',
  'tests/layered/layer_constraints/emptyLayerMid.elkt',
  'tests/layered/partitioning/nonConsecutivePartitions.elkt',
  'tests/layered/partitioning/partitions01.elkt',
  'tests/layered/partitioning/partitions02.elkt',
  'tests/layered/partitioning/withEdgeLabels.elkt',
  'tickets/layered/600_outgoingEdgeInLastSeparateNode.elkt',
  'tickets/layered/656_brokenLayoutPartitions.elkt',
];
/**
 * Inputs of the layered order vectors (mission 7c T1, `tools/vectors/LayeredOrderVectors.java`): the models the ten
 * LayoutTestRunner tests of the crossing minimization name that the 7b set lacks, vendored byte-identical.
 */
const LAYERED_ORDER_INPUTS = [
  'tests/layered/north_south_ports/linear_segments_cycle.elkt',
  'tests/layered/north_south_ports/north_multiple.elkt',
  'tests/layered/north_south_ports/north_south_fixed_side.elkt',
  'tests/layered/north_south_ports/nsp1.elkt',
  'tests/layered/north_south_ports/nsp2.elkt',
  'tests/layered/north_south_ports/nsp3.elkt',
  'tests/layered/north_south_ports/south_multiple.elkt',
  'tests/layered/preserve_order/backwardsEdges.elkt',
  'tests/layered/preserve_order/dummyNodeNoConnectedNode.elkt',
  'tests/layered/preserve_order/dummyNodeNoConnectingNode2.elkt',
  'tests/layered/preserve_order/longConflictingExample.elkt',
  'tests/layered/preserve_order/noCrossings.elkt',
  'tests/layered/preserve_order/nodeBetweenDummies.elkt',
  'tests/layered/preserve_order/oneCrossing.elkt',
  'tests/layered/preserve_order/sameTargetTogether.elkt',
  'tests/layered/preserve_order/sameTargetTogether2.elkt',
  'tests/layered/preserve_order/simpleConflictingExample.elkt',
  'tests/layered/preserve_order/simpleLongEdges01.elkt',
  'tests/layered/preserve_order/simpleLongEdges02.elkt',
  'tests/layered/preserve_order/smallExample.elkt',
  'tests/layered/preserve_order/timedAutomaton.elkt',
  'tests/layered/preserve_order/timedAutomatonMoreEdges.elkt',
  'tickets/layered/528_nodeEdgeOverlap.elkt',
  'tickets/layered/528_violatedNodeOrder.elkt',
];

/**
 * Inputs of the layered placement vectors (mission 7d T1, `tools/vectors/LayeredPlacementVectors.java`): the 22 models
 * of the node placement LayoutTestRunner suite, vendored byte-identical.
 */
const LAYERED_PLACEMENT_INPUTS = [
  'tests/layered/node_placement/KIPRA-1426/demo2-KIPRA-1426.elkt',
  'tests/layered/node_placement/bk/classes/classes.elkt',
  'tests/layered/node_placement/bk/classes/classes_leftdown.elkt',
  'tests/layered/node_placement/bk/classes/classes_leftup.elkt',
  'tests/layered/node_placement/bk/classes/classes_rightdown.elkt',
  'tests/layered/node_placement/bk/classes/classes_rightup.elkt',
  'tests/layered/node_placement/bk/classes/classes_two_leftdown.elkt',
  'tests/layered/node_placement/bk/classes/classes_two_leftup.elkt',
  'tests/layered/node_placement/bk/classes/classes_two_rightdown.elkt',
  'tests/layered/node_placement/bk/classes/classes_two_rightdown_surrounded.elkt',
  'tests/layered/node_placement/bk/classes/classes_two_rightup.elkt',
  'tests/layered/node_placement/bk/classes/classes_two_samesize.elkt',
  'tests/layered/node_placement/bk/edge_length/edge_length_space_above.elkt',
  'tests/layered/node_placement/bk/edge_length/edge_length_space_below.elkt',
  'tests/layered/node_placement/bk/straightness/severalEdges.elkt',
  'tests/layered/node_placement/bk/straightness/straightEdgesLeft.elkt',
  'tests/layered/node_placement/bk/straightness/straightEdgesRight.elkt',
  'tests/layered/node_placement/compact/unbalanced.elkt',
  'tests/layered/node_placement/flexible_ports/graph01.elkt',
  'tests/layered/node_placement/flexible_ports/graph02.elkt',
  'tests/layered/node_placement/flexible_ports/graph03.elkt',
  'tests/layered/node_placement/flexible_ports/graph04.elkt',
];

/**
 * Inputs of the layered routing vectors (mission 7e T1, `tools/vectors/LayeredRoutingVectors.java`): the 29 models of
 * the splines, hyperedge merging and hierarchical ports LayoutTestRunner suites and the three routing tickets (726,
 * 341, 371), vendored byte-identical.
 */
const LAYERED_ROUTING_INPUTS = [
  'tests/layered/splines/hyperedges/hyperedges_1.elkt',
  'tests/layered/splines/hyperedges/hyperedges_2.elkt',
  'tests/layered/splines/north_south_ports_1.elkt',
  'tests/layered/splines/north_south_ports_2.elkt',
  'tests/layered/splines/north_south_ports_3.elkt',
  'tests/layered/splines/sloppy_curvature.elkt',
  'tests/layered/splines/sloppy_overlaps_1.elkt',
  'tests/layered/splines/sloppy_overlaps_2.elkt',
  'tests/layered/splines/sloppy_overlaps_3.elkt',
  'tests/layered/splines/three_edges_inverted_ports.elkt',
  'tests/layered/splines/three_edges_inverted_ports_2.elkt',
  'tests/layered/splines/three_nodes_two_edges.elkt',
  'tests/layered/hyperedge_merging/hyperedge_labels.elkt',
  'tests/layered/hyperedge_merging/hyperedges01.elkt',
  'tests/layered/hyperedge_merging/inverted_ports.elkt',
  'tests/layered/hyperedge_merging/north_south_ports_01.elkt',
  'tests/layered/hyperedge_merging/north_south_ports_02.elkt',
  'tests/layered/hyperedge_merging/north_south_ports_03.elkt',
  'tests/layered/hyperedge_merging/unequal_src_tgt.elkt',
  'tests/layered/hyperedge_merging/unequal_src_tgt_with_labels.elkt',
  'tests/layered/hierarchical_ports/hierarchy01.elkt',
  'tests/layered/hierarchical_ports/hierarchy02.elkt',
  'tests/layered/hierarchical_ports/hierarchy03.elkt',
  'tests/layered/hierarchical_ports/hierarchy04.elkt',
  'tests/layered/hierarchical_ports/hierarchy05.elkt',
  'tests/layered/hierarchical_ports/hierarchy06.elkt',
  'tests/layered/hierarchical_ports/hierarchy07.elkt',
  'tests/layered/hierarchical_ports/hierarchy08.elkt',
  'tests/layered/hierarchical_ports/hierarchy09.elkt',
  'tickets/layered/726_edgesMissingBendPoints.elkt',
  'tickets/layered/341_polylineUnnecessaryBendpoints.elkt',
  'tickets/layered/371_strangeSplineSpacing.elkt',
];

type Obj = Record<string, unknown>;

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function loadGolden(): GoldenEntry[] {
  const parsed = readJson(ALGORITHMS_FILE);
  if (!isObj(parsed) || !Array.isArray(parsed['golden'])) {
    throw new Error(`Invalid algorithms manifest: ${ALGORITHMS_FILE}`);
  }
  const entries: unknown[] = parsed['golden'];
  const bad = entries.findIndex((e) => !isGoldenEntry(e));
  if (bad >= 0) {
    throw new Error(`Golden entry ${bad} is invalid: ${ALGORITHMS_FILE}`);
  }
  return entries as GoldenEntry[]; // every element passed isGoldenEntry above
}

function loadRecordedHashes(): Record<string, string> {
  const parsed = readJson(INPUTS_MANIFEST);
  if (!isObj(parsed) || !isObj(parsed['files'])) {
    throw new Error(`Invalid inputs manifest: ${INPUTS_MANIFEST}`);
  }
  return parsed['files'] as Record<string, string>; // repo-controlled manifest, values are hex strings
}

function sha256(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function refIds(): string[] {
  return readdirSync(REFS_DIR)
    .filter((f) => f.endsWith(JSON_EXT) && f !== META_FILE)
    .map((f) => f.slice(0, -JSON_EXT.length));
}

const golden = loadGolden();
const goldenIds = golden.map((g) => g.id);
const hashes = loadRecordedHashes();

describe('algorithm golden manifest', () => {
  it('has unique ids', () => {
    expect(new Set(goldenIds).size).toBe(goldenIds.length);
  });

  it('retargets every entry to its own algorithm', () => {
    expect(golden.filter((g) => g.retarget !== g.algorithm).map((g) => g.id)).toEqual([]);
  });

  it('covers fixed, box and random with three entries each', () => {
    for (const algorithm of GOLDEN_ALGORITHMS) {
      expect(golden.filter((g) => g.algorithm === algorithm)).toHaveLength(3);
    }
  });

  it('prefixes each id with its algorithm suffix', () => {
    const wrong = golden.filter((g) => !g.id.startsWith(`${g.algorithm.split('.').pop() ?? ''}-`));
    expect(wrong.map((g) => g.id)).toEqual([]);
  });

  it('references only variants defined in variants.json', () => {
    const names = loadVariantNames();
    expect(golden.filter((g) => !names.includes(g.variant)).map((g) => g.id)).toEqual([]);
  });

  it('seeds every random entry and no other', () => {
    const seeded = golden.filter((g) => g.variant === SEEDED_VARIANT).map((g) => g.algorithm);
    expect(seeded).toEqual(golden.filter((g) => g.algorithm === RANDOM_ALGORITHM).map((g) => g.algorithm));
  });
});

describe('committed algorithm oracle refs', () => {
  it('has exactly one ref per manifest golden id', () => {
    expect(compareIdSets(goldenIds, refIds())).toEqual({ missing: [], extra: [] });
  });

  it.each(goldenIds)('%s parses and compares equal to itself', (id) => {
    const ref = readJson(path.join(REFS_DIR, `${id}${JSON_EXT}`));
    const result = compareLayout(ref, ref);
    expect(formatDiffs(result.diffs)).toBe('');
    expect(result.ok).toBe(true);
  });

  it.each(goldenIds)('%s has geometry on every node, port and label (edges are not routed)', (id) => {
    const ref = readJson(path.join(REFS_DIR, `${id}${JSON_EXT}`));
    expect(isObj(ref)).toBe(true);
    const violations = geometryViolations(ref as Obj).filter((v) => !v.endsWith(NO_ROUTING_SUFFIX));
    expect(violations).toEqual([]);
  });

  it('_meta.json records the pinned commits, patches and generator', () => {
    const meta = readJson(path.join(REFS_DIR, META_FILE));
    const corpus = readJson(CORPUS_MANIFEST) as Obj; // repo-controlled manifest
    expect(isObj(meta)).toBe(true);
    const m = meta as Obj;
    expect(m['modelsCommit']).toBe(corpus['commit']);
    expect(m['elkCommit']).toBe(readFileSync(ELK_COMMIT_FILE, 'utf8').trim());
    expect(m['generatedBy']).toBe(GENERATED_BY);
    expect(Array.isArray(m['patches']) && m['patches'].length > 0).toBe(true);
  });
});

/**
 * Inputs of the layered pipeline vectors (mission 7f T1, `tools/vectors/LayeredPipelineVectors.java`): the four layered golden ptolemy
 * models (their unflagged refs are `refs/elk/ptolemy-*`) and the 18 tickets of the issue suites allocated to 7f
 * (`plans/layered-pipeline/suite-allocation.md`), vendored byte-identical. The four models live under `pipeline/`, not
 * `realworld/`: `LayeredFrameworkVectors.java` walks `realworld/` and requires an exact match with its pinned table.
 */
const LAYERED_PIPELINE_INPUTS = [
  'pipeline/realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json',
  'pipeline/realworld/ptolemy/hierarchical/de_clockdrift_ClockDriftHierarchy.json',
  'pipeline/realworld/ptolemy/hierarchical/de_afdx_AFDXMulticastSimple.json',
  'pipeline/realworld/ptolemy/hierarchical/de_switch_CrossbarSwitch.json',
  'tickets/layered/143_smallVerticalEdgeSegmentSpacing.elkt',
  'tickets/layered/318_overlappingHorizontalEdgeSegments.elkt',
  'tickets/layered/405_differentPortLabelPositionsNSWEInside.elkt',
  'tickets/layered/405_differentPortLabelPositionsNSWEOutsideNextToPort.elkt',
  'tickets/layered/405_differentPortLabelPositionsTwoWestOutside.elkt',
  'tickets/layered/405_differentPortLabelPositionsNSWEOutside.elkt',
  'tickets/layered/405_differentPortLabelPositionsTwoWestOutsideNextToPort.elkt',
  'tickets/layered/447_hierarchicalPortAnchors.elkt',
  'tickets/layered/476_multiLabelInHorizontalLayout.elkt',
  'tickets/layered/476_multiLabelInVerticalLayout.elkt',
  'tickets/layered/502_collapsingCompoundNode.elkt',
  'tickets/layered/515_polylineOverNodeIncOut.elkt',
  'tickets/layered/515_polylineOverNodeIncoming.elkt',
  'tickets/layered/515_polylineOverNodeOutgoing.elkt',
  'tickets/layered/546_borderGaps.elkt',
  'tickets/layered/548_NPEWithInsideSelfLoops.elkt',
  'tickets/layered/587_polylineSplinesNPE.elkt',
  'tickets/layered/603_labelOverlaps.elkt',
  // the S1 suites of T12c, read only by those suites
  'tests/core/node_size/inside_port_labels.elkt',
  'tests/core/label_placement/port_labels/variants.elkt',
  'tests/core/label_placement/port_labels/next_to_port_if_possible_inside.elkt',
  'tests/core/label_placement/port_labels/next_to_port_if_possible_outside.elkt',
];

/**
 * Inputs of the layered label vectors (mission 7f2 T1, `tools/vectors/LayeredLabelsVectors.java`): every label- or comment-bearing
 * `.elkt` of `tests/layered`, `tickets/layered` and `examples` (the models the recorder's table lists) that no earlier recorder
 * vendored, byte-identical, including the inputs of the suites allocated to 7f2 (comment_boxes, labels_ordering, tickets 445, 471,
 * 541, 599, 905). They live under `labels/`, never under `realworld/` (`LayeredFrameworkVectors.java` walks that tree). The models
 * the earlier recorders vendored stay at their paths and are read from there.
 */
const LAYERED_LABELS_INPUTS = [
  'labels/examples/general/direction.elkt',
  'labels/examples/general/mixingDirection.elkt',
  'labels/examples/general/spacing/comments.elkt',
  'labels/examples/general/spacing/components.elkt',
  'labels/examples/general/spacing/nodesEdges.elkt',
  'labels/examples/general/spacing/padding.elkt',
  'labels/examples/general/spacing/ports.elkt',
  'labels/examples/general/spacing/portsSurrounding.elkt',
  'labels/examples/labels/nodeLabelPlacement.elkt',
  'labels/examples/labels/portLabelsMulti.elkt',
  'labels/examples/ports/allowNonFlowPortsToSwitchSides.elkt',
  'labels/examples/ports/portConstraints.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_circle.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_circle_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_hierarchy.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_hierarchyDirection.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_hierarchyDirection_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_hierarchy_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_motor.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_motor_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_nodeSizes.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_nodeSizes_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_separateComponents.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_separateComponents_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_simpleDirectionTest.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_simpleDirectionTest_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_snake.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_snake_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_sortingTask.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayeredLayout_sortingTask_pseudo_positions.elkt',
  'labels/examples/user-hints/interactive-constraints/interactiveLayereredLayout_layerConstraint.elkt',
  'labels/examples/user-hints/layered/horizontalOrder.elkt',
  'labels/examples/user-hints/layered/partitioning.elkt',
  'labels/examples/user-hints/layered/reverseEdge.elkt',
  'labels/examples/user-hints/layered/verticalOrder.elkt',
  'labels/examples/user-hints/model-order/modelOrderCrossingMinimization.elkt',
  'labels/examples/user-hints/model-order/modelOrderCycleBreaking.elkt',
  'labels/examples/user-hints/model-order/modelOrderNoCrossingMin.elkt',
  'labels/tests/layered/comment_boxes/multiple_comments.elkt',
  'labels/tests/layered/comment_boxes/multipler_comments.elkt',
  'labels/tests/layered/comment_boxes/single_comment_01.elkt',
  'labels/tests/layered/compaction_oned/hierarchical_ports/hports1.elkt',
  'labels/tests/layered/connected_components/compound01.elkt',
  'labels/tests/layered/connected_components/compound02.elkt',
  'labels/tests/layered/connected_components/compound03.elkt',
  'labels/tests/layered/connected_components/compound04.elkt',
  'labels/tests/layered/connected_components/compound05.elkt',
  'labels/tests/layered/connected_components/compound07.elkt',
  'labels/tests/layered/connected_components/flat01.elkt',
  'labels/tests/layered/cross_counting/north_multiple.elkt',
  'labels/tests/layered/cross_counting/north_south_fixed_side.elkt',
  'labels/tests/layered/cross_counting/south_multiple.elkt',
  'labels/tests/layered/edge_label_placement/edgeLabelSideSelection01.elkt',
  'labels/tests/layered/edge_label_placement/edgeLabelSideSelection02.elkt',
  'labels/tests/layered/edge_label_placement/edge__and_port_labels.elkt',
  'labels/tests/layered/edge_label_placement/edge_label_spacing.elkt',
  'labels/tests/layered/edge_label_placement/edge_labels.elkt',
  'labels/tests/layered/edge_label_placement/endLabelsWithPorts.elkt',
  'labels/tests/layered/edge_label_placement/headLabelMarginCalculation.elkt',
  'labels/tests/layered/edge_label_placement/labelStacking_down_down.elkt',
  'labels/tests/layered/edge_label_placement/labelStacking_down_up.elkt',
  'labels/tests/layered/edge_label_placement/labelStacking_left_down.elkt',
  'labels/tests/layered/edge_label_placement/labelStacking_left_up.elkt',
  'labels/tests/layered/edge_label_placement/labelStacking_right_down.elkt',
  'labels/tests/layered/edge_label_placement/labelStacking_right_up.elkt',
  'labels/tests/layered/edge_label_placement/labelStacking_up_down.elkt',
  'labels/tests/layered/edge_label_placement/labelStacking_up_up.elkt',
  'labels/tests/layered/edge_label_placement/layerSelection_center_01.elkt',
  'labels/tests/layered/edge_label_placement/layerSelection_center_02.elkt',
  'labels/tests/layered/edge_label_placement/layerSelection_median.elkt',
  'labels/tests/layered/edge_label_placement/layerSelection_widest.elkt',
  'labels/tests/layered/edge_label_placement/northSouthPorts_down_down_01.elkt',
  'labels/tests/layered/edge_label_placement/northSouthPorts_down_down_02.elkt',
  'labels/tests/layered/edge_label_placement/northSouthPorts_right_down_01.elkt',
  'labels/tests/layered/edge_label_placement/northSouthPorts_right_down_02.elkt',
  'labels/tests/layered/edge_label_placement/smartLabelSideSelection_right_01.elkt',
  'labels/tests/layered/interactive_layout/noDummyNodes.elkt',
  'labels/tests/layered/inverted_ports/east_input.elkt',
  'labels/tests/layered/inverted_ports/feedback_edge.elkt',
  'labels/tests/layered/inverted_ports/west_output.elkt',
  'labels/tests/layered/labels/edge_label_layer_selection/end_layers_01.elkt',
  'labels/tests/layered/labels/edge_label_side_selection/smart_01.elkt',
  'labels/tests/layered/labels/edge_label_side_selection/smart_02.elkt',
  'labels/tests/layered/labels/edge_label_side_selection/smart_03.elkt',
  'labels/tests/layered/labels/edge_label_side_selection/smart_04.elkt',
  'labels/tests/layered/labels/edge_label_side_selection/smart_05.elkt',
  'labels/tests/layered/labels/edge_label_side_selection/smart_06.elkt',
  'labels/tests/layered/labels_ordering/headLabels_multiPorts.elkt',
  'labels/tests/layered/labels_ordering/headLabels_singlePorts.elkt',
  'labels/tests/layered/labels_ordering/tailLabels_multiPorts.elkt',
  'labels/tests/layered/labels_ordering/tailLabels_singlePorts.elkt',
  'labels/tests/layered/node_label_placement/inside_placement.elkt',
  'labels/tests/layered/node_label_placement/inside_placement_hierarchicalNode.elkt',
  'labels/tests/layered/node_label_placement/outside_placement.elkt',
  'labels/tests/layered/node_label_placement/outside_placement_hpriority.elkt',
  'labels/tests/layered/node_label_placement/separate.elkt',
  'labels/tests/layered/port_label_placement/fixed_positions_01.elkt',
  'labels/tests/layered/port_label_placement/inside_compound_nodes_01.elkt',
  'labels/tests/layered/port_label_placement/inside_compound_nodes_02.elkt',
  'labels/tests/layered/port_label_placement/inside_compound_nodes_03.elkt',
  'labels/tests/layered/port_label_placement/inside_outside.elkt',
  'labels/tests/layered/port_label_placement/multilabels.elkt',
  'labels/tests/layered/port_label_placement/multilabels_compound.elkt',
  'labels/tests/layered/transform_direction/example.elkt',
  'labels/tickets/layered/082_unfortunateEdgeLabelSideSelection.elkt',
  'labels/tickets/layered/167_insidePortLabelsInHierarchicalGraphs.elkt',
  'labels/tickets/layered/182_minNodeSizeForHierarchicalNodes.elkt',
  'labels/tickets/layered/193_hierarchicalPortOverlaps.elkt',
  'labels/tickets/layered/213_componentsCompaction.elkt',
  'labels/tickets/layered/273_insideSelfLoopsWithLabels.elkt',
  'labels/tickets/layered/304_wrongMinimumNodeSize.elkt',
  'labels/tickets/layered/347_polylineOnEdgeLabels.elkt',
  'labels/tickets/layered/404_stackedCenterEdgeLabels.elkt',
  'labels/tickets/layered/405_differentPortPositionsUpDown.elkt',
  'labels/tickets/layered/439_bigNodeErrors.elkt',
  'labels/tickets/layered/445_feedbackEdgeTailLabel.elkt',
  'labels/tickets/layered/453_interactiveProblems.elkt',
  'labels/tickets/layered/471_verticalInlineLabelAlignment.elkt',
  'labels/tickets/layered/541_invertedComplexHeadLabels.elkt',
  'labels/tickets/layered/541_invertedSimpleHeadLabels.elkt',
  'labels/tickets/layered/599_unimportantPortIndex.elkt',
  'labels/tickets/layered/905_beginLabelAboveEdge.elkt',
  'labels/tickets/layered/905_beginLableBellowEdge.elkt',
];

describe('vendored inputs', () => {
  it('records the pinned models commit', () => {
    const parsed = readJson(INPUTS_MANIFEST) as Obj;
    const corpus = readJson(CORPUS_MANIFEST) as Obj;
    expect(parsed['commit']).toBe(corpus['commit']);
  });

  it('records every golden input, the four ticket models, the twelve layered phase inputs and the 24 layered order inputs and the 22 layered placement inputs and the 32 layered routing inputs and the 26 layered pipeline inputs and the 123 layered labels inputs, nothing else', () => {
    const expected = [...golden.map((g) => g.path), ...TICKET_INPUTS, ...LAYERED_PHASE_INPUTS, ...LAYERED_ORDER_INPUTS, ...LAYERED_PLACEMENT_INPUTS, ...LAYERED_ROUTING_INPUTS, ...LAYERED_PIPELINE_INPUTS, ...LAYERED_LABELS_INPUTS].sort();
    expect(Object.keys(hashes).sort()).toEqual(expected);
  });

  it.each(Object.keys(hashes))('%s matches its recorded sha-256', (rel) => {
    expect(sha256(path.join(INPUTS_DIR, rel))).toBe(hashes[rel]);
  });
});
