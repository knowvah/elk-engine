// SPDX-License-Identifier: EPL-2.0
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import * as JavaInteger from '../../../java/lang/JavaInteger.js';
import { ArrayListIterator } from '../../../java/util/ListIterator.js';
import { DebugUtil } from '../DebugUtil.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LNode } from '../graph/LNode.js';
import { NodeType } from '../graph/LNodeNodeType.js';
import type { Layer } from '../graph/Layer.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { LinearSegmentsNodePlacerLinearSegment as LinearSegment } from './LinearSegmentsNodePlacerLinearSegment.js';
import { INPUT_PRIO, OUTPUT_PRIO } from './LinearSegmentsNodePlacerProperties.js';

/*
 * The "Linear Segments Creation" section of `LinearSegmentsNodePlacer` (`:213-492`), as functions over their
 * parameters (the Java instance fields `linearSegments` and `spacings` are not used here; `sortLinearSegments` returns
 * the array the Java method also stores in the field). `sortLinearSegments` and `createDependencyGraphEdges` are split
 * at their Java comment sections for the complexity limits, in Java order.
 *
 * AD-10: `Lists` only, no hashed container. C6: `incomingCountList` holds ints used in arithmetic, never `==` on a box.
 */

/** The Java loop variable of `createDependencyGraphEdges`: the id the next split segment gets. */
interface SegmentIdCounter {
  nextLinearSegmentID: number;
}

/** The segment ordering graph `createDependencyGraphEdges` fills, with the id counter of its splits. */
interface DependencyGraph {
  readonly segmentList: LinearSegment[];
  readonly outgoingList: LinearSegment[][];
  readonly incomingCountList: number[];
  readonly counter: SegmentIdCounter;
}

/**
 * Sorts the linear segments of the given layered graph by finding a topological ordering in the corresponding segment
 * ordering graph.
 *
 * @param layeredGraph layered graph to process
 * @param monitor our progress monitor.
 * @return a sorted array of linear segments
 * @see LinearSegmentsNodePlacer.java:213
 */
export function sortLinearSegments(layeredGraph: LGraph, monitor: IElkProgressMonitor): LinearSegment[] {
  // set the identifier and input / output priority for all nodes
  setIdsAndPriorities(layeredGraph);

  // create linear segments for the layered graph, ignoring odd port side dummies
  const segmentList = createLinearSegments(layeredGraph);

  // create and initialize segment ordering graph
  const outgoingList: LinearSegment[][] = [];
  const incomingCountList: number[] = [];
  for (let i = 0; i < segmentList.length; i++) {
    outgoingList.push([]);
    incomingCountList.push(0);
  }

  // create edges for the segment ordering graph
  createDependencyGraphEdges(monitor, layeredGraph, segmentList, outgoingList, incomingCountList);

  // turn lists into arrays
  const segments = [...segmentList];
  const outgoing = [...outgoingList];
  const incomingCount = [...incomingCountList];

  // find a topological ordering of the segment ordering graph
  const newRanks = topologicalRanks(segments, outgoing, incomingCount);

  // apply the new ordering to the array of linear segments
  const linearSegments = new Array<LinearSegment>(segments.length);
  for (let i = 0; i < segments.length; i++) {
    // Java `assert outgoing[i].isEmpty()` omitted (dev-only assert, LinearSegmentsNodePlacer.java:292)
    const ls = segments[i]!;
    const rank = newRanks[i]!;
    linearSegments[rank] = ls;
    ls.id = rank;
    for (const node of ls.nodes) {
      node.id = rank;
    }
  }

  return linearSegments;
}

/** The first part of `sortLinearSegments` (Java comment "set the identifier and input / output priority"). */
function setIdsAndPriorities(layeredGraph: LGraph): void {
  for (const layer of layeredGraph) {
    for (const node of layer) {
      node.id = -1;
      let inprio = JavaInteger.MIN_VALUE;
      let outprio = JavaInteger.MIN_VALUE;
      for (const port of node.getPorts()) {
        for (const edge of port.getIncomingEdges()) {
          const prio = edge.getProperty(LayeredOptions.PRIORITY_STRAIGHTNESS);
          inprio = Math.max(inprio, prio);
        }
        for (const edge of port.getOutgoingEdges()) {
          const prio = edge.getProperty(LayeredOptions.PRIORITY_STRAIGHTNESS);
          outprio = Math.max(outprio, prio);
        }
      }
      node.setProperty(INPUT_PRIO, inprio);
      node.setProperty(OUTPUT_PRIO, outprio);
    }
  }
}

/** The second part of `sortLinearSegments` (Java comment "create linear segments for the layered graph"). */
function createLinearSegments(layeredGraph: LGraph): LinearSegment[] {
  const segmentList: LinearSegment[] = [];
  let nextLinearSegmentID = 0;
  for (const layer of layeredGraph) {
    for (const node of layer) {
      // Test for the node ID; calls to fillSegment(...) may have caused the node ID
      // to be != -1.
      if (node.id < 0) {
        const segment = new LinearSegment();
        segment.id = nextLinearSegmentID++;
        fillSegment(node, segment);
        segmentList.push(segment);
      }
    }
  }
  return segmentList;
}

/**
 * The third part of `sortLinearSegments` (Java comment "gather the sources ... find a topological ordering"): consumes
 * `outgoing` and `incomingCount`.
 *
 * @return the new rank of every segment, by segment id
 */
function topologicalRanks(segments: LinearSegment[], outgoing: LinearSegment[][], incomingCount: number[]): number[] {
  // gather the sources of the segment ordering graph
  let nextRank = 0;
  const noIncoming: LinearSegment[] = [];
  for (let i = 0; i < segments.length; i++) {
    if (incomingCount[i] === 0) {
      noIncoming.push(segments[i]!);
    }
  }

  // find a topological ordering of the segment ordering graph
  const newRanks = new Array<number>(segments.length).fill(0);
  while (noIncoming.length > 0) {
    const segment = noIncoming.shift()!;
    newRanks[segment.id] = nextRank++;

    while (outgoing[segment.id]!.length > 0) {
      const target = outgoing[segment.id]!.shift()!;
      incomingCount[target.id]!--;

      if (incomingCount[target.id] === 0) {
        noIncoming.push(target);
      }
    }
  }
  return newRanks;
}

/**
 * Fills the dependency graph with dependencies. If a dependency would introduce a cycle, the offending linear segment
 * is split into two linear segments.
 *
 * @param monitor our progress monitor.
 * @param layeredGraph the layered graph.
 * @param segmentList the list of segments. Updated to include the newly created linear segments.
 * @param outgoingList the lists of outgoing dependencies for each segment. This essentially encodes the edges of the
 *   dependency graph.
 * @param incomingCountList the number of incoming dependencies for each segment.
 * @see LinearSegmentsNodePlacer.java:340
 */
export function createDependencyGraphEdges(
  monitor: IElkProgressMonitor,
  layeredGraph: LGraph,
  segmentList: LinearSegment[],
  outgoingList: LinearSegment[][],
  incomingCountList: number[],
): void {
  /*
   * There's some <scaryVoice> faaaancy </scaryVoice> stuff going on here. Basically, we go through all the layers,
   * from left to right. In each layer, we go through all the nodes. For each node, we retrieve the linear segment it's
   * part of and add a dependency to the next node's linear segment. So far so good.
   *
   * This works perfectly fine as long as we assume that the relative order of linear segments doesn't change from one
   * layer to the next. However, since the introduction of north / south port dummies, it can. We now have to avoid
   * creating cycles in the dependency graph. This is done by remembering the indices of each linear segment in the
   * previous layer. When we encounter a segment x, we check if there is a segment y that came before x in the previous
   * layer. (that would introduce a cycle) If that's the case, we split x at the current layer, resulting in two
   * segments, x1 and x2, x2 starting at the current layer. Now, we proceed as usual, adding a dependency from x2 to y.
   * But we have avoided a cycle because y does not depend on x2, but on x1.
   */

  const deps: DependencyGraph = {
    segmentList,
    outgoingList,
    incomingCountList,
    counter: { nextLinearSegmentID: segmentList.length },
  };
  let layerIndex = 0;
  for (const layer of layeredGraph) {
    if (layer.getNodes().length === 0) {
      // Ignore empty layers (the Java `continue` skips `layerIndex++` too)
      continue;
    }

    addLayerDependencies(layer, layerIndex, deps);

    layerIndex++;
  }

  // Write debug output graph
  // elkjs-exclude-start
  if (monitor.isLoggingEnabled()) {
    DebugUtil.logDebugGraphSegments(monitor, layeredGraph, segmentList, outgoingList);
  }
  // elkjs-exclude-end
}

/** The body of the layer loop of `createDependencyGraphEdges`, for a non-empty layer. */
function addLayerDependencies(layer: Layer, layerIndex: number, deps: DependencyGraph): void {
  const { segmentList, outgoingList, incomingCountList } = deps;
  const nodeIter = new ArrayListIterator<LNode>(layer.getNodes());
  let indexInLayer = 0;

  // We carry the previous node with us for dependency management
  let previousNode: LNode | null = null;

  // Get the layer's first node
  let currentNode: LNode | null = nodeIter.next();

  while (currentNode !== null) {
    // Get the current node's segment, or the new segment if it has to be split to avoid a cycle
    const currentSegment = splitOnCycle(layer, indexInLayer, currentNode, previousNode, deps);

    // Now add a dependency to the next node, if any
    let nextNode: LNode | null = null;
    if (nodeIter.hasNext()) {
      nextNode = nodeIter.next();
      const nextSegment = segmentList[nextNode.id]!;

      outgoingList[currentNode.id]!.push(nextSegment);
      incomingCountList[nextNode.id] = incomingCountList[nextNode.id]! + 1;
    }

    // Update segment's layer information
    currentSegment.lastLayer = layerIndex;
    currentSegment.indexInLastLayer = indexInLayer++;

    // Cycle nodes
    previousNode = currentNode;
    currentNode = nextNode;
  }
}

/**
 * The first part of the node loop of `addLayerDependencies`: gets the current node's segment and checks for a cycle.
 *
 * Check if we have a cycle. That's the case if the following holds: - The current segment appeared in the previous
 * layer as well. - In the previous layer, we find a segment after the current segment that appears before the current
 * segment in the current layer. If so, we need to split the current linear segment.
 *
 * @return the segment of the current node after the split, if any
 */
function splitOnCycle(
  layer: Layer,
  indexInLayer: number,
  currentNode: LNode,
  previousNode: LNode | null,
  deps: DependencyGraph,
): LinearSegment {
  const currentSegment = deps.segmentList[currentNode.id]!;

  if (currentSegment.indexInLastLayer >= 0) {
    const cycleSegment = findCycleSegment(layer, indexInLayer, currentSegment, deps.segmentList);

    // If we have found a cycle segment, we need to split the current linear segment
    if (cycleSegment !== null) {
      return splitCurrentSegment(currentNode, previousNode, currentSegment, deps);
    }
  }
  return currentSegment;
}

/**
 * The inner search of `addLayerDependencies`: the first segment after the current node in the layer that appeared
 * after the current segment in the previous layer, or `null`.
 */
function findCycleSegment(
  layer: Layer,
  indexInLayer: number,
  currentSegment: LinearSegment,
  segmentList: LinearSegment[],
): LinearSegment | null {
  let cycleSegment: LinearSegment | null = null;
  const cycleNodesIter = new ArrayListIterator<LNode>(layer.getNodes(), indexInLayer + 1);
  while (cycleNodesIter.hasNext()) {
    const cycleNode = cycleNodesIter.next();
    cycleSegment = segmentList[cycleNode.id]!;

    if (
      cycleSegment.lastLayer === currentSegment.lastLayer &&
      cycleSegment.indexInLastLayer < currentSegment.indexInLastLayer
    ) {
      break;
    } else {
      cycleSegment = null;
    }
  }
  return cycleSegment;
}

/**
 * The `if (cycleSegment != null)` block of `addLayerDependencies`: splits the current segment at the current node.
 *
 * @return the new segment starting at the current node
 */
function splitCurrentSegment(
  currentNode: LNode,
  previousNode: LNode | null,
  currentSegment: LinearSegment,
  deps: DependencyGraph,
): LinearSegment {
  const { segmentList, outgoingList, incomingCountList, counter } = deps;
  // Update the current segment before it's split
  if (previousNode !== null) {
    incomingCountList[currentNode.id] = incomingCountList[currentNode.id]! - 1;
    removeEqual(outgoingList[previousNode.id]!, currentSegment);
  }

  const splitSegment = currentSegment.split(currentNode, counter.nextLinearSegmentID++);
  segmentList.push(splitSegment);
  outgoingList.push([]);

  if (previousNode !== null) {
    outgoingList[previousNode.id]!.push(splitSegment);
    incomingCountList.push(1);
  } else {
    incomingCountList.push(0);
  }
  return splitSegment;
}

/** Java `List.remove(Object)`: removes the first element that `equals` the segment (by id). */
function removeEqual(list: LinearSegment[], segment: LinearSegment): void {
  const index = list.findIndex((candidate) => segment.equals(candidate));
  if (index >= 0) {
    list.splice(index, 1);
  }
}

/**
 * Put a node into the given linear segment and check for following parts of a long edge.
 *
 * N6: the Java method recurses along a long edge's dummies (depth = layer count). A successful recursive call makes the
 * caller return `true` at once, so no frame has work left after the call; the recursion is a loop over the chain and
 * needs no stack. A recursive call that returns `false` (the target already has an id) has no side effect, so the
 * caller goes on with its next successor, which is the `continue` below.
 *
 * @param node the node to put into the linear segment
 * @param segment a linear segment
 * @return `true` if the given node was not already part of another segment and was thus added to the given segment.
 * @see LinearSegmentsNodePlacer.java:466
 */
export function fillSegment(node: LNode, segment: LinearSegment): boolean {
  if (node.id >= 0) {
    // The node is already part of another linear segment
    return false;
  }

  let current: LNode | null = node;
  while (current !== null) {
    // Add the node to the given linear segment
    current.id = segment.id;
    segment.nodes.push(current);
    const nodeType = current.getType();
    segment.nodeType = nodeType;

    current = isChainNodeType(nodeType) ? findUnfilledSuccessor(current) : null;
  }

  return true;
}

/** `nodeType == NodeType.LONG_EDGE || nodeType == NodeType.NORTH_SOUTH_PORT` of `fillSegment`. */
function isChainNodeType(nodeType: NodeType): boolean {
  return nodeType === NodeType.LONG_EDGE || nodeType === NodeType.NORTH_SOUTH_PORT;
}

/**
 * The scan of `fillSegment`: this is a LONG_EDGE or NORTH_SOUTH_PORT dummy; check if any of its successors are of one
 * of these types too and still without a segment. If so, we can form a linear segment with the first of them (not with
 * more than one, though).
 * Note 1: LONG_EDGES and NORTH_SOUTH_PORTs can share a common linear segment
 * Note 2: we must take care not to make a segment out of nodes that are in the same layer
 * Note 3: for BIG_NODEs also the first BIG_NODE_INITIAL which is no actual dummy node has to be considered here
 */
function findUnfilledSuccessor(node: LNode): LNode | null {
  for (const sourcePort of node.getPorts()) {
    for (const targetPort of sourcePort.getSuccessorPorts()) {
      const targetNode = targetPort.getNode()!;
      const targetNodeType = targetNode.getType();

      if (node.getLayer() !== targetNode.getLayer()) {
        // current no bignode and next node is LONG_EDGE and NORTH_SOUTH_PORT
        if (isChainNodeType(targetNodeType) && targetNode.id < 0) {
          return targetNode;
        }
      }
    }
  }
  return null;
}
