// SPDX-License-Identifier: EPL-2.0
import * as Sets from '../../../../guava/Sets.js';
import * as JavaInteger from '../../../../java/lang/JavaInteger.js';
import type { Random } from '../../../../java/util/Random.js';
import type { HyperEdgeSegment } from './HyperEdgeSegment.js';
import type { HyperEdgeSegmentDependency } from './HyperEdgeSegmentDependency.js';
import { HyperEdgeSegmentDependencyDependencyType as DependencyType } from './HyperEdgeSegmentDependencyDependencyType.js';

/**
 * Finds a set of dependencies to remove or reverse to break cycles in the conflict graph of {@link HyperEdgeSegment}s
 * and {@link HyperEdgeSegmentDependency}s. What clients will do with these, exactly, will be up to them. The hope is to
 * return the minimum-weight set of dependencies such that their reversal or removal causes the graph to become acyclic.
 * Inspired by:
 *
 * - Eades, Lin, Smyth. A fast and effective heuristic for the feedback arc set problem. In _Information Processing
 *   Letters_, 1993.
 *
 * The Java private constructor (`assert false`, `HyperEdgeCycleDetector.java:43-44`: "no instance required") is
 * omitted: this class only holds static methods and is never instantiated.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/HyperEdgeCycleDetector.java
 */
export class HyperEdgeCycleDetector {
  /**
   * Finds a set of dependencies whose reversal or removal will make the graph acyclic. The method can concentrate on
   * critical dependencies only, or detect cycles among all dependencies. The latter assumes that there are no cycles
   * among critical dependencies left and will never return a critical dependency in the result. (doing so would cause
   * clients to reverse or remove critical dependencies, which is a big no-no, to put it eloquently!) This code also
   * assumes that only dependencies involved in non-critical two-cycles will have a weight of zero.
   *
   * @param segments list of hyper edge segments.
   * @param criticalOnly `true` if we should only detect cycles among critical dependencies.
   * @param random random number generator.
   * @returns list of dependencies whose removal or reversal will make the graph acyclic.
   * @see HyperEdgeCycleDetector.java:62
   */
  static detectCycles(
    segments: HyperEdgeSegment[],
    criticalOnly: boolean,
    random: Random,
  ): HyperEdgeSegmentDependency[] {
    const result: HyperEdgeSegmentDependency[] = [];

    const sources: HyperEdgeSegment[] = [];
    const sinks: HyperEdgeSegment[] = [];

    // initialize values for the algorithm
    HyperEdgeCycleDetector.initialize(segments, sources, sinks, criticalOnly);

    // assign marks to all nodes
    HyperEdgeCycleDetector.computeLinearOrderingMarks(segments, sources, sinks, criticalOnly, random);

    // process edges that point left: remove those of zero weight, reverse the others
    for (const source of segments) {
      for (const outDependency of source.getOutgoingSegmentDependencies()) {
        // Only consider critical dependencies, if required
        if (!criticalOnly || outDependency.getType() === DependencyType.CRITICAL) {
          if (source.mark > outDependency.getTarget()!.mark) {
            result.push(outDependency);
          }
        }
      }
    }

    return result;
  }

  /**
   * Initializes the mark, in weight and out weight of each hyper edge segment. Also adds all sources (segments without
   * incoming weight 0) and sinks (segments with outgoing weight 0) to their respective lists. Once this is complete,
   * all segments are marked from `-1` to `-segments.size()`.
   *
   * @see HyperEdgeCycleDetector.java:96
   */
  private static initialize(
    segments: HyperEdgeSegment[],
    sources: HyperEdgeSegment[],
    sinks: HyperEdgeSegment[],
    criticalOnly: boolean,
  ): void {
    let nextMark = -1;
    for (const segment of segments) {
      segment.mark = nextMark--;

      // Sum up the weights of our critical dependencies
      const criticalInWeight = HyperEdgeCycleDetector.sumWeights(segment.getIncomingSegmentDependencies(), true);
      const criticalOutWeight = HyperEdgeCycleDetector.sumWeights(segment.getOutgoingSegmentDependencies(), true);

      // If we're only considering critical dependencies, we'll ignore the others
      let inWeight = criticalInWeight;
      let outWeight = criticalOutWeight;

      if (!criticalOnly) {
        // Just sum up everything
        inWeight = HyperEdgeCycleDetector.sumWeights(segment.getIncomingSegmentDependencies(), false);
        outWeight = HyperEdgeCycleDetector.sumWeights(segment.getOutgoingSegmentDependencies(), false);
      }

      // Apply the weight
      segment.setInWeight(inWeight);
      segment.setCriticalInWeight(criticalInWeight);
      segment.setOutWeight(outWeight);
      segment.setCriticalOutWeight(criticalOutWeight);

      // Add the segment to either sources or sinks if the corresponding weight is zero
      if (outWeight === 0) {
        sinks.push(segment);
      } else if (inWeight === 0) {
        sources.push(segment);
      }
    }
  }

  /**
   * The Java `stream().filter(critical).mapToInt(getWeight).sum()` and `stream().mapToInt(getWeight).sum()` of
   * `initialize` (`:104-126`): the sum of the weights of the dependencies, restricted to the critical ones if asked.
   */
  private static sumWeights(dependencies: HyperEdgeSegmentDependency[], criticalOnly: boolean): number {
    return dependencies
      .filter((dep) => !criticalOnly || dep.getType() === DependencyType.CRITICAL)
      .reduce((sum, dep) => sum + dep.getWeight(), 0);
  }

  /**
   * Computes marks for all segments based on a linear ordering or the segments. Marks will be mutually different, and
   * sinks will have higher marks than sources.
   *
   * `unprocessed` is the `Sets.newTreeSet(segments)` snapshot (ordered by `mark`, ascending, so the last segment of the
   * list comes first); removals do not reorder it, and a removal by identity equals the Java removal by `mark` because
   * the marks of unprocessed segments are distinct and negative while processed ones are not (AD-10: ordered, iterated).
   *
   * @see HyperEdgeCycleDetector.java:148
   */
  private static computeLinearOrderingMarks(
    segments: HyperEdgeSegment[],
    sources: HyperEdgeSegment[],
    sinks: HyperEdgeSegment[],
    criticalOnly: boolean,
    random: Random,
  ): void {
    const unprocessed = Sets.newTreeSet(segments, (a, b) => a.compareTo(b));
    const maxSegments: HyperEdgeSegment[] = [];

    // We'll mark sinks with marks < markBase and sources with marks > markBase. Sink marks will later be offset to
    // be higher than the source marks, but this way, the sink marks will reflect the order in which the sinks were
    // discovered and added.
    const markBase = segments.length;
    let nextSinkMark = markBase - 1;
    let nextSourceMark = markBase + 1;

    while (unprocessed.size > 0) {
      nextSinkMark = HyperEdgeCycleDetector.processSinks(unprocessed, sources, sinks, nextSinkMark, criticalOnly);
      nextSourceMark = HyperEdgeCycleDetector.processSources(unprocessed, sources, sinks, nextSourceMark, criticalOnly);

      // If any segments are still unprocessed, they are neither source nor sink. Assemble the list of segments
      // with the highest out flow (out weight - in weight), to be placed among the sources. If we're looking at
      // both, critical and non-critical dependencies, we must be sure that critical dependencies will always
      // point rightwards; we thus stop immediately once we find one
      HyperEdgeCycleDetector.collectMaxOutflowSegments(unprocessed, maxSegments, criticalOnly);

      // If there are segments with maximal out flow, select one randomly; this might yield new sources and sinks
      if (maxSegments.length > 0) {
        const maxNode = maxSegments[random.nextInt(maxSegments.length)]!;
        unprocessed.delete(maxNode);
        maxNode.mark = nextSourceMark++;
        HyperEdgeCycleDetector.updateNeighbors(maxNode, sources, sinks, criticalOnly);
        maxSegments.length = 0;
      }
    }

    // shift ranks that are left of the mark base so that sinks now have higher marks than sources
    HyperEdgeCycleDetector.shiftMarks(segments, markBase);
  }

  /**
   * The first inner `while` loop of `computeLinearOrderingMarks` (`:163-168`): marks the sinks, in the order they were
   * discovered. Split from the Java method body (complexity limits); the mark counter is passed in and returned.
   *
   * @returns the next sink mark
   */
  private static processSinks(
    unprocessed: Set<HyperEdgeSegment>,
    sources: HyperEdgeSegment[],
    sinks: HyperEdgeSegment[],
    nextSinkMark: number,
    criticalOnly: boolean,
  ): number {
    while (sinks.length > 0) {
      const sink = sinks.shift()!;
      unprocessed.delete(sink);
      sink.mark = nextSinkMark--;
      HyperEdgeCycleDetector.updateNeighbors(sink, sources, sinks, criticalOnly);
    }
    return nextSinkMark;
  }

  /**
   * The second inner `while` loop of `computeLinearOrderingMarks` (`:170-175`): marks the sources. Split from the Java
   * method body (complexity limits); the mark counter is passed in and returned.
   *
   * @returns the next source mark
   */
  private static processSources(
    unprocessed: Set<HyperEdgeSegment>,
    sources: HyperEdgeSegment[],
    sinks: HyperEdgeSegment[],
    nextSourceMark: number,
    criticalOnly: boolean,
  ): number {
    while (sources.length > 0) {
      const source = sources.shift()!;
      unprocessed.delete(source);
      source.mark = nextSourceMark++;
      HyperEdgeCycleDetector.updateNeighbors(source, sources, sinks, criticalOnly);
    }
    return nextSourceMark;
  }

  /**
   * The last loop of `computeLinearOrderingMarks` (`:213-219`): shift the marks left of the mark base so that sinks now
   * have higher marks than sources. Split from the Java method body (complexity limits).
   */
  private static shiftMarks(segments: HyperEdgeSegment[], markBase: number): void {
    const shiftBase = segments.length + 1;
    for (const node of segments) {
      if (node.mark < markBase) {
        node.mark = node.mark + shiftBase;
      }
    }
  }

  /**
   * The `for` loop over the unprocessed segments of `computeLinearOrderingMarks` (`:181-201`): fills `maxSegments` with
   * the segments of maximal out flow, or with the first segment that still has an outgoing critical dependency and no
   * incoming one. Split from the Java method body (complexity limits); the statements and their order are unchanged.
   */
  private static collectMaxOutflowSegments(
    unprocessed: ReadonlySet<HyperEdgeSegment>,
    maxSegments: HyperEdgeSegment[],
    criticalOnly: boolean,
  ): void {
    let maxOutflow = JavaInteger.MIN_VALUE;
    for (const segment of unprocessed) {
      // If we're not only regarding critical dependencies, we must ensure that critical dependencies will
      // always point to the right to prevent them from being reversed later on. Thus, once we find a single
      // segment that still has an outgoing critical dependency and no incoming ones, we'll take that and
      // leave!
      if (!criticalOnly && segment.getCriticalOutWeight() > 0 && segment.getCriticalInWeight() <= 0) {
        maxSegments.length = 0;
        maxSegments.push(segment);
        break;
      }

      const outflow = segment.getOutWeight() - segment.getInWeight();
      if (outflow >= maxOutflow) {
        if (outflow > maxOutflow) {
          maxSegments.length = 0;
          maxOutflow = outflow;
        }
        maxSegments.push(segment);
      }
    }
  }

  /**
   * Updates in-weight and out-weight values of the neighbors of the given node, simulating its removal from the graph.
   * The sources and sinks lists are also updated.
   *
   * @param node node for which neighbors are updated
   * @param sources list of sources
   * @param sinks list of sinks
   * @param criticalOnly `true` if only critical dependencies should be taken into account.
   * @see HyperEdgeCycleDetector.java:235
   */
  private static updateNeighbors(
    node: HyperEdgeSegment,
    sources: HyperEdgeSegment[],
    sinks: HyperEdgeSegment[],
    criticalOnly: boolean,
  ): void {
    HyperEdgeCycleDetector.updateFollowingNodes(node, sources, criticalOnly);
    HyperEdgeCycleDetector.updatePrecedingNodes(node, sinks, criticalOnly);
  }

  /** The "process following nodes" loop of `updateNeighbors` (`:238-254`), split from the Java method body. */
  private static updateFollowingNodes(
    node: HyperEdgeSegment,
    sources: HyperEdgeSegment[],
    criticalOnly: boolean,
  ): void {
    for (const dep of node.getOutgoingSegmentDependencies()) {
      if (!criticalOnly || dep.getType() === DependencyType.CRITICAL) {
        const target = dep.getTarget()!;
        if (target.mark < 0 && dep.getWeight() > 0) {
          // Remove weight (and possibly critical weight) from the target
          target.setInWeight(target.getInWeight() - dep.getWeight());
          if (dep.getType() === DependencyType.CRITICAL) {
            target.setCriticalInWeight(target.getCriticalInWeight() - dep.getWeight());
          }

          if (target.getInWeight() <= 0 && target.getOutWeight() > 0) {
            sources.push(target);
          }
        }
      }
    }
  }

  /** The "process preceding nodes" loop of `updateNeighbors` (`:256-272`), split from the Java method body. */
  private static updatePrecedingNodes(node: HyperEdgeSegment, sinks: HyperEdgeSegment[], criticalOnly: boolean): void {
    for (const dep of node.getIncomingSegmentDependencies()) {
      if (!criticalOnly || dep.getType() === DependencyType.CRITICAL) {
        const source = dep.getSource()!;
        if (source.mark < 0 && dep.getWeight() > 0) {
          // Remove weight (and possibly critical weight) from the source
          source.setOutWeight(source.getOutWeight() - dep.getWeight());
          if (dep.getType() === DependencyType.CRITICAL) {
            source.setCriticalOutWeight(source.getCriticalOutWeight() - dep.getWeight());
          }

          if (source.getOutWeight() <= 0 && source.getInWeight() > 0) {
            sinks.push(source);
          }
        }
      }
    }
  }
}
