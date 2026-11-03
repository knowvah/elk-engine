// SPDX-License-Identifier: EPL-2.0
import { add as int32Add, sub as int32Sub } from '../../../../java/lang/Int32.js';
import { ArrayListIterator } from '../../../../java/util/ListIterator.js';
import type { Random } from '../../../../java/util/Random.js';
import type { Layer } from '../../graph/Layer.js';
import type { SplineSegment } from './SplineSegment.js';

/** `Integer.MIN_VALUE`, the start value of the maximal outflow search (`SplineEdgeRouter.java:758`). */
const INTEGER_MIN_VALUE = -2147483648;

/**
 * The cycle breaking and the topological numbering of the spline segments, the two static phases of the router that
 * need no router state (`SplineEdgeRouter.java:696-928`), and, because the ranks decide how much room a pair of layers
 * needs, the slot count and the spacing computed from them (`SplineEdgeRouter.java:233-268,461-486`; moved out of the
 * facade by the 500-line file limit). A section of the facade `SplineEdgeRouter` (P1: a section never imports its
 * facade); the facade calls {@link breakCycles}, {@link topologicalNumbering}, {@link countSlots} and
 * {@link computeIncrement}.
 *
 * Containers (AD-10, R9): the Java `LinkedList`s `sources`, `sinks`, `rightwardTargets` are arrays used as queues
 * (`add` is `push`, `removeFirst`/`remove(0)` is `shift`); `unprocessed` is a `LinkedHashSet`, a `Set` here; none is
 * hash-ordered.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplineEdgeRouter.java:696
 */

/** Removes the first occurrence of an element (Java's `List.remove(Object)`, identity-equal elements here). */
function removeFirstOccurrence<T>(list: T[], element: T): void {
  const index = list.indexOf(element);
  if (index >= 0) {
    list.splice(index, 1);
  }
}

/**
 * The first loop of `breakCycles` (`:709-742`): gives every segment a negative mark, its in- and out-weights, and
 * queues the sinks and the sources.
 */
function initializeMarks(edges: SplineSegment[], sources: SplineSegment[], sinks: SplineSegment[]): void {
  let nextMark = -1;
  for (const edge of edges) {
    edge.mark = nextMark--;
    let inweight = 0;
    let outweight = 0;

    for (const dependency of edge.outgoing) {
      outweight += dependency.weight;
    }

    for (const dependency of edge.incoming) {
      inweight += dependency.weight;
    }

    edge.inweight = inweight;
    edge.outweight = outweight;

    if (outweight === 0) {
      sinks.push(edge);
    } else if (inweight === 0) {
      sources.push(edge);
    }
  }
}

/**
 * The search for the segments of maximal outflow among the unprocessed ones (`:758-767`): `maxEdges` is cleared when a
 * larger outflow is found and collects every segment of the maximal outflow.
 */
function collectMaxOutflowEdges(unprocessed: Set<SplineSegment>, maxEdges: SplineSegment[]): void {
  let maxOutflow = INTEGER_MIN_VALUE;
  for (const edge of unprocessed) {
    const outflow = int32Sub(edge.outweight, edge.inweight);
    if (outflow >= maxOutflow) {
      if (outflow > maxOutflow) {
        maxEdges.length = 0;
        maxOutflow = outflow;
      }
      maxEdges.push(edge);
    }
  }
}

/** The marks the assignment loop hands out: `nextLeft` upwards, `nextRight` downwards (`:746-748`). */
interface MarkCounters {
  nextLeft: number;
  nextRight: number;
}

/** The two inner loops of the mark assignment (`:752-762`): peel off the sinks, then the sources. */
function assignSinkAndSourceMarks(
  unprocessed: Set<SplineSegment>,
  counters: MarkCounters,
  sources: SplineSegment[],
  sinks: SplineSegment[],
): void {
  while (sinks.length > 0) {
    const sink = sinks.shift()!;
    unprocessed.delete(sink);
    sink.mark = counters.nextRight--;
    updateNeighbors(sink, sources, sinks);
  }

  while (sources.length > 0) {
    const source = sources.shift()!;
    unprocessed.delete(source);
    source.mark = counters.nextLeft++;
    updateNeighbors(source, sources, sinks);
  }
}

/** The mark assignment (`:744-782`): ignores dependencies of weight zero. */
function assignMarks(
  edges: SplineSegment[],
  sources: SplineSegment[],
  sinks: SplineSegment[],
  random: Random,
  markBase: number,
): void {
  const unprocessed = new Set<SplineSegment>(edges);
  const counters: MarkCounters = { nextLeft: markBase + 1, nextRight: markBase - 1 };
  const maxEdges: SplineSegment[] = [];

  while (unprocessed.size > 0) {
    assignSinkAndSourceMarks(unprocessed, counters, sources, sinks);
    collectMaxOutflowEdges(unprocessed, maxEdges);

    if (maxEdges.length > 0) {
      // if there are multiple SplineHyperEdges with maximal outflow, select one randomly
      const maxEdge = maxEdges[random.nextInt(maxEdges.length)]!;
      unprocessed.delete(maxEdge);
      maxEdge.mark = counters.nextLeft++;
      updateNeighbors(maxEdge, sources, sinks);
      maxEdges.length = 0;
    }
  }
}

/** The last loop of `breakCycles` (`:793-812`): removes the dependencies that point left if of weight zero, reverses the others. */
function reverseLeftPointingDependencies(edges: SplineSegment[]): void {
  for (const source of edges) {
    const depIter = new ArrayListIterator(source.outgoing);
    while (depIter.hasNext()) {
      const dependency = depIter.next();
      const target = dependency.target;

      if (source.mark > target.mark) {
        depIter.remove();
        removeFirstOccurrence(target.incoming, dependency);

        if (dependency.weight > 0) {
          dependency.source = target;
          target.outgoing.push(dependency);
          dependency.target = source;
          source.incoming.push(dependency);
        }
      }
    }
  }
}

/**
 * Breaks all cycles in the given hypernode structure by reversing or removing some dependencies. This implementation
 * assumes that the dependencies of zero weight are exactly the two-cycles of the hypernode structure. The one random
 * draw per cycle-breaking step comes from the graph's seeded `Random` (R7).
 *
 * The Java body is one method; here its four stages are functions of this file, in the Java order (complexity limits).
 *
 * @param edges list of hypernodes
 * @param random the graph's `InternalProperties.RANDOM`
 * @see SplineEdgeRouter.java:712
 */
export function breakCycles(edges: SplineSegment[], random: Random): void {
  const sources: SplineSegment[] = [];
  const sinks: SplineSegment[] = [];

  // initialize values for the algorithm
  initializeMarks(edges, sources, sinks);

  // assign marks to all nodes, ignore dependencies of weight zero
  const markBase = edges.length;
  assignMarks(edges, sources, sinks, random, markBase);

  // shift ranks that are left of the mark base
  const shiftBase = edges.length + 1;
  for (const edge of edges) {
    if (edge.mark < markBase) {
      edge.mark = int32Add(edge.mark, shiftBase);
    }
  }

  // process edges that point left: remove those of zero weight, reverse the others
  reverseLeftPointingDependencies(edges);
}

/** The loop over the following edges of `updateNeighbors` (`:827-834`). */
function updateFollowingEdges(edge: SplineSegment, sources: SplineSegment[]): void {
  for (const dep of edge.outgoing) {
    if (dep.target.mark < 0 && dep.weight > 0) {
      dep.target.inweight -= dep.weight;
      if (dep.target.inweight <= 0 && dep.target.outweight > 0) {
        sources.push(dep.target);
      }
    }
  }
}

/** The loop over the preceding edges of `updateNeighbors` (`:837-844`). */
function updatePrecedingEdges(edge: SplineSegment, sinks: SplineSegment[]): void {
  for (const dep of edge.incoming) {
    if (dep.source.mark < 0 && dep.weight > 0) {
      dep.source.outweight -= dep.weight;
      if (dep.source.outweight <= 0 && dep.source.inweight > 0) {
        sinks.push(dep.source);
      }
    }
  }
}

/**
 * Updates in-weight and out-weight values of the neighbors of the given node, simulating its removal from the graph.
 * The sources and sinks lists are also updated.
 *
 * @param edge node for which neighbors are updated
 * @param sources list of sources
 * @param sinks list of sinks
 * @see SplineEdgeRouter.java:824
 */
export function updateNeighbors(edge: SplineSegment, sources: SplineSegment[], sinks: SplineSegment[]): void {
  // process following edges
  updateFollowingEdges(edge, sources);

  // process preceding edges
  updatePrecedingEdges(edge, sinks);
}

/**
 * The first loop of `topologicalNumbering` (`:868-882`): resets the ranks, counts the dependencies and queues the
 * sources and the rightward targets, those that only connect westward ports.
 */
function collectSourcesAndTargets(
  edges: SplineSegment[],
  sources: SplineSegment[],
  rightwardTargets: SplineSegment[],
): void {
  for (const edge of edges) {
    edge.rank = 0;
    edge.inweight = edge.incoming.length;
    edge.outweight = edge.outgoing.length;

    if (edge.inweight === 0) {
      sources.push(edge);
    }

    if (edge.outweight === 0 && edge.leftPorts.size === 0) {
      rightwardTargets.push(edge);
    }
  }
}

/** The topological ranking loop (`:887-899`); returns the maximal rank assigned, `-1` if none. */
function assignRanks(sources: SplineSegment[]): number {
  let maxRank = -1;
  while (sources.length > 0) {
    const edge = sources.shift()!;
    for (const dep of edge.outgoing) {
      const target = dep.target;
      target.rank = Math.max(target.rank, int32Add(edge.rank, 1));
      maxRank = Math.max(maxRank, target.rank);

      target.inweight--;
      if (target.inweight === 0) {
        sources.push(target);
      }
    }
  }
  return maxRank;
}

/**
 * Moves the rightward targets as far right as possible (`:908-935`): all of them get the rightmost rank, the segments
 * with horizontal segments only pointing rightwards follow.
 */
function moveRightwardTargets(rightwardTargets: SplineSegment[], maxRank: number): void {
  // assign all target nodes with horizontal segments pointing to the right the rightmost rank
  for (const edge of rightwardTargets) {
    edge.rank = maxRank;
  }

  // let all other segments with horizontal segments pointing rightwards move as far right as possible
  while (rightwardTargets.length > 0) {
    const edge = rightwardTargets.shift()!;

    // The node only has connections to western ports
    for (const dep of edge.incoming) {
      const source = dep.source;
      if (source.leftPorts.size > 0) {
        continue;
      }

      source.rank = Math.min(source.rank, int32Sub(edge.rank, 1));

      source.outweight--;
      if (source.outweight === 0) {
        rightwardTargets.push(source);
      }
    }
  }
}

/**
 * Perform a topological numbering of the given SplineHyperEdges.
 *
 * @param edges list of SplineHyperEdge
 * @see SplineEdgeRouter.java:856
 */
export function topologicalNumbering(edges: SplineSegment[]): void {
  // determine sources, targets, incoming count and outgoing count; targets are only added to the list if they only
  // connect westward ports (that is, if all their horizontal segments point to the right)
  const sources: SplineSegment[] = [];
  const rightwardTargets: SplineSegment[] = [];
  collectSourcesAndTargets(edges, sources, rightwardTargets);

  // assign ranks using topological numbering
  const maxRank = assignRanks(sources);

  /* If we stopped here, hyper nodes that don't have any horizontal segments pointing leftward would be ranked just
   * like every other hyper node. This would move back edges too far away from their target node. To remedy that, we
   * move all hyper nodes with horizontal segments only pointing rightwards as far right as possible.
   */
  if (maxRank > -1) {
    moveRightwardTargets(rightwardTargets, maxRank);
  }
}

/** The spacings and the routing mode `SplineEdgeRouter.process` reads from the graph (`:192-202`). */
export interface RoutingSettings {
  readonly nodeNodeSpacing: number;
  readonly edgeNodeSpacing: number;
  readonly edgeEdgeSpacing: number;
  readonly sloppyRouting: boolean;
  readonly sloppyLayerSpacingFactor: number;
}

/** The pair of layers one iteration of `process` routes between; `null` is the missing layer before or after the graph. */
export interface LayerPair {
  readonly leftLayer: Layer | null;
  readonly rightLayer: Layer | null;
}

/**
 * `splineSegmentsLayer.stream().filter(e -> !e.isStraight).mapToInt(e -> e.rank + 1).max().orElse(0)` (`:233-235`):
 * the number of required slots for vertical segments. The `int` sum wraps through `Int32`, the empty stream gives `0`.
 */
export function countSlots(segments: readonly SplineSegment[]): number {
  let slotCount: number | null = null;
  for (const segment of segments) {
    if (!segment.isStraight) {
      const slots = int32Add(segment.rank, 1);
      slotCount = slotCount === null ? slots : Math.max(slotCount, slots);
    }
  }
  return slotCount ?? 0;
}

/**
 * For sloppy routing the idea is to limit the angle of vertical segments similar to what is done in the
 * `PolylineEdgeRouter`. Consequently, the computed spacing depends on the maximum vertical span of any edge between
 * `rightLayer` and the preceding layer.
 *
 * @see SplineEdgeRouter.java:461
 */
export function computeSloppySpacing(
  rightLayer: Layer,
  edgeEdgeSpacing: number,
  nodeNodeSpacing: number,
  sloppyLayerSpacingFactor: number,
): number {
  let maxVertDiff = 0.0;
  // Iterate over the layer's nodes
  for (const node of rightLayer) {
    // Calculate the maximal vertical span of output edges.
    let maxCurrInputYDiff = 0.0;
    for (const incomingEdge of node.getIncomingEdges()) {
      const sourcePos = incomingEdge.getSource()!.getAbsoluteAnchor().y;
      const targetPos = incomingEdge.getTarget()!.getAbsoluteAnchor().y;

      maxCurrInputYDiff = Math.max(maxCurrInputYDiff, Math.abs(targetPos - sourcePos));
    }
    maxVertDiff = Math.max(maxVertDiff, maxCurrInputYDiff);
  }

  // Determine where next layer should start based on the maximal vertical span of edges
  // between the two layers
  const layerSpacing = sloppyLayerSpacingFactor * Math.min(1.0, edgeEdgeSpacing / nodeNodeSpacing) * maxVertDiff;

  return layerSpacing;
}

/**
 * The increment of the horizontal position for `slotCount > 0` (`:250-268`): the space between each pair of edge
 * segments and between nodes and edges, enlarged by the sloppy spacing if asked for.
 */
export function computeIncrement(settings: RoutingSettings, pair: LayerPair, slotCount: number): number {
  // the space between each pair of edge segments, and between nodes and edges
  let increment = 0;
  if (pair.leftLayer !== null) {
    increment += settings.edgeNodeSpacing;
  }
  increment += (slotCount - 1) * settings.edgeEdgeSpacing;
  if (pair.rightLayer !== null) {
    increment += settings.edgeNodeSpacing;
  }

  // sloppy routing may want to reserve more space in-between a pair of layers
  if (settings.sloppyRouting && pair.rightLayer !== null) {
    increment = Math.max(
      increment,
      computeSloppySpacing(
        pair.rightLayer,
        settings.edgeEdgeSpacing,
        settings.nodeNodeSpacing,
        settings.sloppyLayerSpacingFactor,
      ),
    );
  }
  return increment;
}
