// SPDX-License-Identifier: EPL-2.0
import * as DoubleCompare from '../../../../java/lang/DoubleCompare.js';
import { HyperEdgeSegment } from './HyperEdgeSegment.js';
import { HyperEdgeSegmentDependency } from './HyperEdgeSegmentDependency.js';
import { HyperEdgeSegmentSplitterAreaRating as AreaRating } from './HyperEdgeSegmentSplitterAreaRating.js';
import { HyperEdgeSegmentSplitterFreeArea as FreeArea } from './HyperEdgeSegmentSplitterFreeArea.js';
import type { OrthogonalRoutingGenerator } from './OrthogonalRoutingGenerator.js';
import { countCrossings } from './OrthogonalRoutingGeneratorConflicts.js';

/**
 * Responsible for splitting {@link HyperEdgeSegment}s in order to avoid overlaps. This class assumes that critical
 * dependency cycles have been found and that a set of critical dependencies whose removal will break those cycles has
 * been computed. These dependencies will determine the {@link HyperEdgeSegment}s that will be split.
 *
 * All throughout this code, the terminology will refer to the horizontal layout case.
 *
 * `countCrossings`, a static of `OrthogonalRoutingGenerator` in the Java, is imported from the generator's conflicts
 * section; the generator itself is a type-only import (it reaches this class at run time).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/HyperEdgeSegmentSplitter.java
 */
export class HyperEdgeSegmentSplitter {
  /** The routing generator that created us. */
  private readonly routingGenerator: OrthogonalRoutingGenerator;

  /**
   * Creates a new instance to be used by the given routing generator.
   *
   * @see HyperEdgeSegmentSplitter.java:44
   */
  constructor(routingGenerator: OrthogonalRoutingGenerator) {
    this.routingGenerator = routingGenerator;
  }

  /**
   * Breaks critical dependency cycles by resolving the given dependencies. For each dependency, we split one of the
   * involved {@link HyperEdgeSegment}s, which will result in modified dependencies and additional segments, which are
   * added to the given list of segments.
   *
   * @see HyperEdgeSegmentSplitter.java:53
   */
  splitSegments(
    dependenciesToResolve: HyperEdgeSegmentDependency[],
    segments: HyperEdgeSegment[],
    criticalConflictThreshold: number,
  ): void {
    // Only start preparations if there's going to be things to do
    if (dependenciesToResolve.length === 0) {
      return;
    }

    // Collect all relevant spaces between horizontal segments that are large enough to house another horizontal
    // segment without causing additional conflicts
    const freeAreas = this.findFreeAreas(segments, criticalConflictThreshold);

    // For each dependency, choose which segment to split
    const segmentsToSplit = this.decideWhichSegmentsToSplit(dependenciesToResolve);

    // Split the segments in order from smalles to largest. The smallest ones need to be split first since they
    // have fewer options for where to put their horizontal connecting segments.
    [...segmentsToSplit]
      .sort((hes1, hes2) => DoubleCompare.compare(hes1.getLength(), hes2.getLength()))
      .forEach((segment) => this.split(segment, segments, freeAreas, criticalConflictThreshold));
  }

  /**
   * Assembles the areas between horizontal segments that are large enough to allow another horizontal segment to slip
   * in.
   *
   * @see HyperEdgeSegmentSplitter.java:82
   */
  private findFreeAreas(segments: HyperEdgeSegment[], criticalConflictThreshold: number): FreeArea[] {
    const freeAreas: FreeArea[] = [];

    // Retrieve all positions where hyperedge segments connect to ports, and sort them (DoubleStream.sorted():
    // Double.compare order)
    const inCoordinates = segments.flatMap((s) => [...s.getIncomingConnectionCoordinates()]);
    const outCoordinates = segments.flatMap((s) => [...s.getOutgoingConnectionCoordinates()]);

    const sortedCoordinates = [...inCoordinates, ...outCoordinates].sort(DoubleCompare.compare);

    // Go through each pair of coordinates and create free areas for those that are at least twice the critical
    // threshold
    for (let i = 1; i < sortedCoordinates.length; i++) {
      if (sortedCoordinates[i]! - sortedCoordinates[i - 1]! >= 2 * criticalConflictThreshold) {
        freeAreas.push(
          new FreeArea(
            sortedCoordinates[i - 1]! + criticalConflictThreshold,
            sortedCoordinates[i]! - criticalConflictThreshold,
          ),
        );
      }
    }

    return freeAreas;
  }

  /**
   * Given a list of hyperedge dependencies, this method assembles a list of {@link HyperEdgeSegment}s which, if split,
   * will cause the critical cycles caused by the dependencies to be broken. The `LinkedHashSet` is an insertion-ordered
   * `Set` (AD-10: identity-hashed, iterated in insertion order).
   *
   * @see HyperEdgeSegmentSplitter.java:116
   */
  private decideWhichSegmentsToSplit(dependencies: HyperEdgeSegmentDependency[]): Set<HyperEdgeSegment> {
    // We want to be sure to have a stable iteration order, but we also want fast containment checks
    const segmentsToSplit = new Set<HyperEdgeSegment>();

    for (const dependency of dependencies) {
      const sourceSegment = dependency.getSource()!;
      const targetSegment = dependency.getTarget()!;

      // If either of the involved segments were already selected for splitting because of another dependency,
      // that's sufficient
      if (segmentsToSplit.has(sourceSegment) || segmentsToSplit.has(targetSegment)) {
        continue;
      }

      // One segment will be split, and the other one will be remembered to have caused the split. The latter
      // will have to stay between the two segments the former will be split into, or else we'll have overlaps
      // again
      let segmentToSplit = sourceSegment;
      let segmentCausingSplit = targetSegment;

      // This is perfectly fine unless the segment to split represents a hyperedge and the other does not. We
      // prefer splitting regular edges since hyperedges have a higher chance of causing additional crossings.
      // Note: the original code took the layout direction into account here. We may want to investigate at some
      // point whether that's necessary.
      if (sourceSegment.representsHyperedge() && !targetSegment.representsHyperedge()) {
        segmentToSplit = targetSegment;
        segmentCausingSplit = sourceSegment;
      }

      segmentsToSplit.add(segmentToSplit);
      segmentToSplit.setSplitBy(segmentCausingSplit);
    }

    return segmentsToSplit;
  }

  /**
   * Splits the given segment at the optimal position.
   *
   * @see HyperEdgeSegmentSplitter.java:160
   */
  private split(
    segment: HyperEdgeSegment,
    segments: HyperEdgeSegment[],
    freeAreas: FreeArea[],
    criticalConflictThreshold: number,
  ): void {
    // Split the segment at the best position and add the new segment to our list
    const splitPosition = this.computePositionToSplitAndUpdateFreeAreas(segment, freeAreas, criticalConflictThreshold);
    segments.push(segment.splitAt(splitPosition));

    // Update the dependencies to reflect the new situation
    this.updateDependencies(segment, segments);
  }

  /**
   * Adds all necessary dependencies for the given segment and its split partner. The segment was recently split, and
   * neither it nor its split partner have any dependencies beyond the critical ones.
   *
   * @see HyperEdgeSegmentSplitter.java:175
   */
  private updateDependencies(segment: HyperEdgeSegment, segments: HyperEdgeSegment[]): void {
    const splitCausingSegment = segment.getSplitBy()!;
    const splitPartner = segment.getSplitPartner()!;

    // The segment currently has no dependencies at all. We first need for the segments to be ordered like this:
    //    segment ---> split-causing segment ---> split partner
    HyperEdgeSegmentDependency.createAndAddCritical(segment, splitCausingSegment);
    HyperEdgeSegmentDependency.createAndAddCritical(splitCausingSegment, splitPartner);

    // Now we just need to re-introduce dependencies to other segments
    for (const otherSegment of segments) {
      // We already have our dependencies between our three segments involved in the conflict settled
      if (otherSegment !== splitCausingSegment && otherSegment !== segment && otherSegment !== splitPartner) {
        this.routingGenerator.createDependencyIfNecessary(otherSegment, segment);
        this.routingGenerator.createDependencyIfNecessary(otherSegment, splitPartner);
      }
    }
  }

  /**
   * Returns a hopefully good position to split the given segment at, and updates the list of free areas since an area
   * now either disappears or is split into two smaller areas.
   *
   * @see HyperEdgeSegmentSplitter.java:201
   */
  private computePositionToSplitAndUpdateFreeAreas(
    segment: HyperEdgeSegment,
    freeAreas: FreeArea[],
    criticalConflictThreshold: number,
  ): number {
    // We shall iterate over the available areas (which are sorted by ascending positions) and find the index of the
    // first and the last area we could use since they are in our segment's reach
    let firstPossibleAreaIndex = -1;
    let lastPossibleAreaIndex = -1;

    for (let i = 0; i < freeAreas.length; i++) {
      const currArea = freeAreas[i]!;

      if (currArea.startPosition > segment.getEndCoordinate()) {
        // We're past the possible areas, so stop
        break;
      } else if (currArea.endPosition >= segment.getStartCoordinate()) {
        // We've found a possible area; it might be the first
        if (firstPossibleAreaIndex < 0) {
          firstPossibleAreaIndex = i;
        }

        lastPossibleAreaIndex = i;
      }
    }

    // Determine the position to split the segment at
    let splitPosition = HyperEdgeSegmentSplitter.centerOfSegment(segment);

    if (firstPossibleAreaIndex >= 0) {
      // There are areas we can use
      const bestAreaIndex = this.chooseBestAreaIndex(segment, freeAreas, firstPossibleAreaIndex, lastPossibleAreaIndex);

      // We'll use the best area's centre and update the area list
      splitPosition = HyperEdgeSegmentSplitter.centerOfArea(freeAreas[bestAreaIndex]!);
      this.useArea(freeAreas, bestAreaIndex, criticalConflictThreshold);
    }

    return splitPosition;
  }

  /**
   * Finds the best area to use for splitting the given segment between the given two area indices (both inclusive).
   *
   * @see HyperEdgeSegmentSplitter.java:243
   */
  private chooseBestAreaIndex(
    segment: HyperEdgeSegment,
    freeAreas: FreeArea[],
    fromIndex: number,
    toIndex: number,
  ): number {
    let bestAreaIndex = fromIndex;

    if (fromIndex < toIndex) {
      // We have more areas to choose from, so rate them and find the best one. We need to simulate splitting the
      // segment so that we can count potential crossings
      const splitSegments = segment.simulateSplit();
      const splitSegment = splitSegments.getFirst()!;
      const splitPartner = splitSegments.getSecond()!;

      let bestArea = freeAreas[bestAreaIndex]!;
      let bestRating = this.rateArea(segment, splitSegment, splitPartner, bestArea);

      for (let i = fromIndex + 1; i <= toIndex; i++) {
        // Determine how good our current area is
        const currArea = freeAreas[i]!;
        const currRating = this.rateArea(segment, splitSegment, splitPartner, currArea);

        if (this.isBetter(currArea, currRating, bestArea, bestRating)) {
          bestArea = currArea;
          bestRating = currRating;
          bestAreaIndex = i;
        }
      }
    }

    return bestAreaIndex;
  }

  /**
   * Rates what would happen if the given split segments were connected through the given area.
   *
   * @see HyperEdgeSegmentSplitter.java:277
   */
  private rateArea(
    segment: HyperEdgeSegment,
    splitSegment: HyperEdgeSegment,
    splitPartner: HyperEdgeSegment,
    area: FreeArea,
  ): AreaRating {
    // The area's centre would be used to link the two split segments, so we need to add that to their incident
    // connections
    const areaCentre = HyperEdgeSegmentSplitter.centerOfArea(area);

    splitSegment.getOutgoingConnectionCoordinates().clear();
    splitSegment.getOutgoingConnectionCoordinates().add(areaCentre);

    splitPartner.getIncomingConnectionCoordinates().clear();
    splitPartner.getIncomingConnectionCoordinates().add(areaCentre);

    // We need to count the dependencies and crossings that the split partners would cause with the original
    // segments incident dependencies
    const rating = new AreaRating(0, 0);

    for (const dependency of segment.getIncomingSegmentDependencies()) {
      const otherSegment = dependency.getSource()!;

      this.updateConsideringBothOrderings(rating, splitSegment, otherSegment);
      this.updateConsideringBothOrderings(rating, splitPartner, otherSegment);
    }

    for (const dependency of segment.getOutgoingSegmentDependencies()) {
      const otherSegment = dependency.getTarget()!;

      this.updateConsideringBothOrderings(rating, splitSegment, otherSegment);
      this.updateConsideringBothOrderings(rating, splitPartner, otherSegment);
    }

    // There will be two additional dependencies: splitSegment --> splitBySegment --> splitPartner. The order
    // between the three will not change, so we only have to count crossings for this concrete order
    rating.dependencies += 2;

    rating.crossings += this.countCrossingsForSingleOrdering(splitSegment, segment.getSplitBy()!);
    rating.crossings += this.countCrossingsForSingleOrdering(segment.getSplitBy()!, splitPartner);

    return rating;
  }

  /**
   * Considers both orderings (s1 left of s2, and vice versa) and considers the number of crossings that would ensue.
   * Based on the crossings, determines the minimum number of dependencies and crossings we'd have to expect.
   *
   * @see HyperEdgeSegmentSplitter.java:322
   */
  private updateConsideringBothOrderings(rating: AreaRating, s1: HyperEdgeSegment, s2: HyperEdgeSegment): void {
    const crossingsS1LeftOfS2 = this.countCrossingsForSingleOrdering(s1, s2);
    const crossingsS2LeftOfS1 = this.countCrossingsForSingleOrdering(s2, s1);

    if (crossingsS1LeftOfS2 === crossingsS2LeftOfS1) {
      // If the crossings are the same, we're only interested if there are more than 0
      if (crossingsS1LeftOfS2 > 0) {
        // Both orderings generate the same number of crossings (more than 0), so we have a two-cycle
        rating.dependencies += 2;
        rating.crossings += crossingsS1LeftOfS2;
      }
    } else {
      // One order is better than the other, so there will be a single dependency
      rating.dependencies += 1;
      rating.crossings += Math.min(crossingsS1LeftOfS2, crossingsS2LeftOfS1);
    }
  }

  /**
   * Counts the number of crossings that would ensue between a left and a right segment.
   *
   * @see HyperEdgeSegmentSplitter.java:345
   */
  private countCrossingsForSingleOrdering(left: HyperEdgeSegment, right: HyperEdgeSegment): number {
    return (
      countCrossings(left.getOutgoingConnectionCoordinates(), right.getStartCoordinate(), right.getEndCoordinate()) +
      countCrossings(right.getIncomingConnectionCoordinates(), left.getStartCoordinate(), left.getEndCoordinate())
    );
  }

  /**
   * Determines whether the given area with the given rating is better than another.
   *
   * @see HyperEdgeSegmentSplitter.java:355
   */
  private isBetter(currArea: FreeArea, currRating: AreaRating, bestArea: FreeArea, bestRating: AreaRating): boolean {
    if (currRating.crossings < bestRating.crossings) {
      // First criterion: number of crossings
      return true;
    } else if (currRating.crossings === bestRating.crossings) {
      if (currRating.dependencies < bestRating.dependencies) {
        // Second criterion: number of dependencies
        return true;
      } else if (currRating.dependencies === bestRating.dependencies) {
        if (currArea.size > bestArea.size) {
          // Third criterion: size
          return true;
        }
      }
    }

    return false;
  }

  /**
   * When the given area is being used, it falls into two parts which may be usable themselves. This method does the
   * necessary bookkeeping.
   *
   * @see HyperEdgeSegmentSplitter.java:382
   */
  private useArea(freeAreas: FreeArea[], usedAreaIndex: number, criticalConflictThreshold: number): void {
    const oldArea = freeAreas[usedAreaIndex]!;
    freeAreas.splice(usedAreaIndex, 1);

    if (oldArea.size / 2 >= criticalConflictThreshold) {
      // We will probably insert new areas. Keep track of where to insert them
      let insertIndex = usedAreaIndex;

      // This area is large enough to split and still have enough space to the position we're now using for our
      // latest segment
      const oldAreaCentre = HyperEdgeSegmentSplitter.centerOfArea(oldArea);

      // Create the two new areas (and be doubly sure that double precision does not bite us)
      const newEnd1 = oldAreaCentre - criticalConflictThreshold;
      if (oldArea.startPosition <= oldAreaCentre - criticalConflictThreshold) {
        const newArea1 = new FreeArea(oldArea.startPosition, newEnd1);
        freeAreas.splice(insertIndex++, 0, newArea1);
      }

      const newStart2 = oldAreaCentre + criticalConflictThreshold;
      if (newStart2 <= oldArea.endPosition) {
        const newArea2 = new FreeArea(newStart2, oldArea.endPosition);
        freeAreas.splice(insertIndex, 0, newArea2);
      }
    }
  }

  /** `center(HyperEdgeSegment)` (the Java overloads `center` three times; HyperEdgeSegmentSplitter.java:411). */
  private static centerOfSegment(s: HyperEdgeSegment): number {
    return HyperEdgeSegmentSplitter.center(s.getStartCoordinate(), s.getEndCoordinate());
  }

  /** `center(FreeArea)` (HyperEdgeSegmentSplitter.java:415). */
  private static centerOfArea(a: FreeArea): number {
    return HyperEdgeSegmentSplitter.center(a.startPosition, a.endPosition);
  }

  /** `center(double, double)` (HyperEdgeSegmentSplitter.java:419). */
  private static center(p1: number, p2: number): number {
    return (p1 + p2) / 2;
  }
}
