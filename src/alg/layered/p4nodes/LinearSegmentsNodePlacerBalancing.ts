// SPDX-License-Identifier: EPL-2.0
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { Spacings } from '../options/Spacings.js';
import type { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './LinearSegmentsNodePlacerLinearSegment.js';
import { LinearSegmentsNodePlacerMode as Mode } from './LinearSegmentsNodePlacerMode.js';
import { INPUT_PRIO, OUTPUT_PRIO } from './LinearSegmentsNodePlacerProperties.js';

/*
 * The "Balanced Placement" section of `LinearSegmentsNodePlacer` (`:565-755`), as functions over the sorted segment
 * array and the spacings (the Java instance fields). `balancePlacement` and `calcDeflection` are split at their Java
 * statement groups for the complexity limits, in Java order; the loop variables of `balancePlacement` live in a
 * `BalancingState` record because the split-out mode update assigns four of them.
 *
 * AD-10: arrays only. C6: priorities are ints compared with `>=` and `Math.max`, never `==` on a box.
 */

/** factor for threshold after which balancing is aborted. */
const THRESHOLD_FACTOR = 20.0;
/** the minimal number of iterations in pendulum mode. */
const PENDULUM_ITERS = 4;
/** the number of additional iterations after the abort condition was met. */
const FINAL_ITERS = 3;
/**
 * Factor for threshold within which node overlapping is detected. This factor should reflect the epsilon used in the
 * `NodePlacerTest`.
 */
const OVERLAP_DETECT = 0.0001;

/** The local variables `pendulumIters`, `finalIters`, `ready`, `mode` and `lastTotalDeflection` of `balancePlacement`. */
interface BalancingState {
  pendulumIters: number;
  finalIters: number;
  ready: boolean;
  mode: Mode;
  lastTotalDeflection: number;
}

/**
 * Balance the initial placement by force-based movement of regions. First perform _pendulum_ iterations, where only one
 * direction of edges is considered, then _rubber_ iterations, where both incoming and outgoing edges are considered.
 * In each iteration first determine the _deflection_ of each linear segment, i.e. the optimal position delta that leads
 * to a balanced placement with respect to its adjacent segments. Then merge regions that touch each other, building
 * mean values of the involved deflections, and finally apply the resulting deflection values to all segments. The
 * iterations stop when no further improvement is done.
 *
 * @param layeredGraph a layered graph
 * @see LinearSegmentsNodePlacer.java:581
 */
export function balancePlacement(layeredGraph: LGraph, linearSegments: LinearSegment[], spacings: Spacings): void {
  const deflectionDampening = layeredGraph.getProperty(
    LayeredOptions.NODE_PLACEMENT_LINEAR_SEGMENTS_DEFLECTION_DAMPENING,
  );

  // Determine a suitable number of pendulum iterations
  const thoroughness = layeredGraph.getProperty(LayeredOptions.THOROUGHNESS);
  const threshold = THRESHOLD_FACTOR / thoroughness;

  // Iterate the balancing
  const state: BalancingState = {
    pendulumIters: PENDULUM_ITERS,
    finalIters: FINAL_ITERS,
    ready: false,
    mode: Mode.FORW_PENDULUM,
    lastTotalDeflection: JavaInteger.MAX_VALUE,
  };
  do {
    // Calculate force for every linear segment
    const incoming = state.mode !== Mode.BACKW_PENDULUM;
    const outgoing = state.mode !== Mode.FORW_PENDULUM;
    const totalDeflection = calcDeflections(linearSegments, incoming, outgoing, deflectionDampening);

    // Merge linear segments to form regions
    let merged: boolean;
    do {
      merged = mergeRegions(layeredGraph, linearSegments, spacings);
    } while (merged);

    // Move the nodes according to the deflection value of their region
    moveToRegionDeflection(linearSegments);

    // Update the balancing mode
    if (state.mode === Mode.FORW_PENDULUM || state.mode === Mode.BACKW_PENDULUM) {
      updatePendulumMode(state, totalDeflection, thoroughness);
    } else {
      updateRubberMode(state, totalDeflection, threshold);
    }
  } while (!(state.ready && state.finalIters <= 0));
}

/** The loop "Calculate force for every linear segment" of `balancePlacement`; returns the `totalDeflection`. */
function calcDeflections(
  linearSegments: LinearSegment[],
  incoming: boolean,
  outgoing: boolean,
  deflectionDampening: number,
): number {
  let totalDeflection = 0;
  for (const segment of linearSegments) {
    segment.refSegment = null;
    calcDeflection(segment, incoming, outgoing, deflectionDampening, linearSegments);
    totalDeflection += Math.abs(segment.deflection);
  }
  return totalDeflection;
}

/** The loop "Move the nodes according to the deflection value of their region" of `balancePlacement`. */
function moveToRegionDeflection(linearSegments: LinearSegment[]): void {
  for (const segment of linearSegments) {
    const deflection = segment.region().deflection;
    if (deflection !== 0) {
      for (const node of segment.nodes) {
        node.getPosition().y += deflection;
      }
    }
  }
}

/** The pendulum branch of "Update the balancing mode" in `balancePlacement`. */
function updatePendulumMode(state: BalancingState, totalDeflection: number, thoroughness: number): void {
  state.pendulumIters--;
  if (
    state.pendulumIters <= 0 &&
    (totalDeflection < state.lastTotalDeflection || -state.pendulumIters > thoroughness)
  ) {
    state.mode = Mode.RUBBER;
    state.lastTotalDeflection = JavaInteger.MAX_VALUE;
  } else if (state.mode === Mode.FORW_PENDULUM) {
    state.mode = Mode.BACKW_PENDULUM;
    state.lastTotalDeflection = totalDeflection;
  } else {
    state.mode = Mode.FORW_PENDULUM;
    state.lastTotalDeflection = totalDeflection;
  }
}

/** The rubber branch of "Update the balancing mode" in `balancePlacement`. */
function updateRubberMode(state: BalancingState, totalDeflection: number, threshold: number): void {
  state.ready = totalDeflection >= state.lastTotalDeflection || state.lastTotalDeflection - totalDeflection < threshold;
  state.lastTotalDeflection = totalDeflection;
  if (state.ready) {
    state.finalIters--;
  }
}

/**
 * Calculate the force acting on the given linear segment. The force is stored in the segment's deflection field.
 *
 * @param segment the linear segment whose force is to be calculated
 * @param incoming whether incoming edges should be considered
 * @param outgoing whether outgoing edges should be considered
 * @param deflectionDampening factor by which deflections are dampened
 * @see LinearSegmentsNodePlacer.java:677
 */
export function calcDeflection(
  segment: LinearSegment,
  incoming: boolean,
  outgoing: boolean,
  deflectionDampening: number,
  linearSegments: LinearSegment[],
): void {
  let segmentDeflection = 0;
  let nodeWeightSum = 0;
  for (const node of segment.nodes) {
    const forces = calcNodeForces(segment, node, incoming, outgoing, linearSegments);

    // Avoid division by zero
    if (forces.edgeWeightSum > 0) {
      segmentDeflection += forces.nodeDeflection / forces.edgeWeightSum;
      nodeWeightSum++;
    }
  }
  if (nodeWeightSum > 0) {
    segment.deflection = (deflectionDampening * segmentDeflection) / nodeWeightSum;
    segment.weight = nodeWeightSum;
  } else {
    segment.deflection = 0;
    segment.weight = 0;
  }
}

/** The body of `calcDeflection`' node loop up to "Avoid division by zero": the forces of one node's edges. */
function calcNodeForces(
  segment: LinearSegment,
  node: LNode,
  incoming: boolean,
  outgoing: boolean,
  linearSegments: LinearSegment[],
): NodeForces {
  const inputPrio = incoming ? node.getProperty(INPUT_PRIO) : JavaInteger.MIN_VALUE;
  const outputPrio = outgoing ? node.getProperty(OUTPUT_PRIO) : JavaInteger.MIN_VALUE;
  const minPrio = Math.max(inputPrio, outputPrio);

  // Calculate force for every port/edge
  const forces = new NodeForces(segment, minPrio, linearSegments);
  for (const port of node.getPorts()) {
    const portpos = node.getPosition().y + port.getPosition().y + port.getAnchor().y;
    if (outgoing) {
      for (const edge of port.getOutgoingEdges()) {
        forces.addEdge(edge, edge.getTarget()!, portpos);
      }
    }

    if (incoming) {
      for (const edge of port.getIncomingEdges()) {
        forces.addEdge(edge, edge.getSource()!, portpos);
      }
    }
  }
  return forces;
}

/**
 * The Java locals `nodeDeflection` and `edgeWeightSum` of `calcDeflection`'s node loop, with the loop's read-only
 * context (`segment`, `minPrio`, `linearSegments`).
 */
class NodeForces {
  nodeDeflection = 0;
  edgeWeightSum = 0;

  constructor(
    private readonly segment: LinearSegment,
    private readonly minPrio: number,
    private readonly linearSegments: LinearSegment[],
  ) {}

  /**
   * The body of the two edge loops of `calcDeflection` (identical for outgoing and incoming edges up to `otherPort`):
   * adds the force the edge contributes, unless the edge is inside the segment or loses on priority.
   */
  addEdge(edge: LEdge, otherPort: LPort, portpos: number): void {
    const otherNode = otherPort.getNode()!;
    if (this.segment !== this.linearSegments[otherNode.id]) {
      const otherPrio = Math.max(otherNode.getProperty(INPUT_PRIO), otherNode.getProperty(OUTPUT_PRIO));
      const prio = edge.getProperty(LayeredOptions.PRIORITY_STRAIGHTNESS);
      if (prio >= this.minPrio && prio >= otherPrio) {
        this.nodeDeflection +=
          otherNode.getPosition().y + otherPort.getPosition().y + otherPort.getAnchor().y - portpos;
        this.edgeWeightSum++;
      }
    }
  }
}

/**
 * Merge regions by testing whether they would overlap after applying the deflection.
 *
 * @param layeredGraph the layered graph
 * @return true if any two regions have been merged
 * @see LinearSegmentsNodePlacer.java:766
 */
export function mergeRegions(layeredGraph: LGraph, linearSegments: LinearSegment[], spacings: Spacings): boolean {
  let changed = false;
  const nodeSpacing = layeredGraph.getProperty(LayeredOptions.SPACING_NODE_NODE);
  const threshold = OVERLAP_DETECT * nodeSpacing;
  for (const layer of layeredGraph) {
    const nodeIter = new ArrayListIterator<LNode>(layer.getNodes());

    // Get the first node
    let node1 = nodeIter.next();
    let region1 = linearSegments[node1.id]!.region();

    // While there are still nodes following the current node
    while (nodeIter.hasNext()) {
      // Test whether nodes have different regions
      const node2 = nodeIter.next();
      const region2 = linearSegments[node2.id]!.region();

      if (
        region1 !== region2 &&
        mergeIfOverlapping({ node: node1, region: region1 }, { node: node2, region: region2 }, threshold, spacings)
      ) {
        changed = true;
      }

      node1 = node2;
      region1 = region2;
    }
  }
  return changed;
}

/** A node of `mergeRegions` with the region (`node1`/`region1`, `node2`/`region2`) of its segment. */
interface RegionNode {
  readonly node: LNode;
  readonly region: LinearSegment;
}

/**
 * The body of the `if (region1 != region2)` block of `mergeRegions`.
 *
 * @return whether the first region was merged under the second
 */
function mergeIfOverlapping(first: RegionNode, second: RegionNode, threshold: number, spacings: Spacings): boolean {
  const { node: node1, region: region1 } = first;
  const { node: node2, region: region2 } = second;
  // Calculate how much space is allowed between the nodes
  const spacing = spacings.getVerticalSpacing(node1, node2);

  const node1Extent =
    node1.getPosition().y + node1.getSize().y + node1.getMargin().bottom + region1.deflection + spacing;
  const node2Extent = node2.getPosition().y - node2.getMargin().top + region2.deflection;

  // Test if the nodes are overlapping
  if (node1Extent > node2Extent + threshold) {
    // Merge the first region under the second top level segment
    const weightSum = region1.weight + region2.weight;
    // Java `assert weightSum > 0` omitted (dev-only assert, LinearSegmentsNodePlacer.java:798)
    region2.deflection = (region2.weight * region2.deflection + region1.weight * region1.deflection) / weightSum;
    region2.weight = weightSum;
    region1.refSegment = region2;
    return true;
  }
  return false;
}
