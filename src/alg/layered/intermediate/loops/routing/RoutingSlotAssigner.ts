// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../../core/options/PortSide.js';
import * as Int32 from '../../../../../java/lang/Int32.js';
import type { LPort } from '../../../graph/LPort.js';
import { InternalProperties } from '../../../options/InternalProperties.js';
import { HyperEdgeSegment } from '../../../p5edges/orthogonal/HyperEdgeSegment.js';
import { HyperEdgeSegmentDependency } from '../../../p5edges/orthogonal/HyperEdgeSegmentDependency.js';
import { OrthogonalRoutingGenerator } from '../../../p5edges/orthogonal/OrthogonalRoutingGenerator.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/** Java `Integer.MAX_VALUE` and `Integer.MIN_VALUE`, the sentinels of the port index search (`:355-356`). */
const INT_MAX = 2147483647;
const INT_MIN = -2147483648;

/** The first and last index (port ID) of the regular ports on one port side. */
type PortIndexRange = { readonly min: number; readonly max: number };

/**
 * Assigns routing slots for each {@link SelfHyperLoop} for each of the port sides it spans. This is done such that it
 * tries to minimize the number of crossings between self loops that ensue. The crossing minimization is based on what
 * the {@link OrthogonalRoutingGenerator} does to order vertical segments of hyperedges.
 *
 * AD-10 (W6), one row per hashed container, none of them iterated: `slLoopToSegmentMap` (`:56`, `HashMap` keyed by the
 * identity-hashed `SelfHyperLoop`, read by `get` at `:204-205`, `:287`, `:327`) is a `Map`; `slLoopActivityOverPorts`
 * (`:58`, same key kind, read by `get` at `:262`, `:380`) is a `Map`; `slotsWithLabelConflicts` (`:403`, `HashSet<Integer>`,
 * read by `contains` at `:412`) is a `Set`, membership only.
 *
 * Deviations: `shiftTowardsNodeOnSide` is split into helpers (complexity limits), keeping the statement order. Java
 * `assert` (`:101`) is omitted. The `Queue<HyperEdgeSegment>` of `assignRawRoutingSlotsToSegments` is an array with a
 * read position (FIFO order unchanged).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/RoutingSlotAssigner.java
 */
export class RoutingSlotAssigner {
  /** Our segments that constitute our crossing graph. */
  private hyperEdgeSegments: HyperEdgeSegment[] | null = null;
  /** Map of segments created for the loops. */
  private slLoopToSegmentMap: Map<SelfHyperLoop, HyperEdgeSegment> | null = null;
  /** Maps each loop to an array indexed by port IDs and specifying whether the loops runs along the port. */
  private slLoopActivityOverPorts: Map<SelfHyperLoop, boolean[]> | null = null;

  /** Assigns routing slots to all self loops per port side they span. */
  assignRoutingSlots(slHolder: SelfLoopHolder): void {
    // To be able to check whether labels potentially overlap, we build an overlap matrix to be passed to subsequent
    // phases of the crossing graph
    const labelCrossingMatrix = this.computeLabelCrossingMatrix(slHolder);

    // We're using the orthogonal edge router's cycle breaker for this, so create the crossing graph for our loops
    this.createCrossingGraph(slHolder, labelCrossingMatrix);
    OrthogonalRoutingGenerator.breakNonCriticalCycles(
      this.hyperEdgeSegments!,
      slHolder.getLNode().getGraph()!.getProperty(InternalProperties.RANDOM),
    );

    // Assign routing slots based on the graph
    this.doAssignRoutingSlots(slHolder, labelCrossingMatrix);

    // Cleanup
    this.hyperEdgeSegments = null;
    this.slLoopToSegmentMap = null;
    this.slLoopActivityOverPorts = null;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Label Crossing Matrix

  /**
   * Computes a two-dimensional array with elements set to `true` if the labels with the corresponding IDs overlap.
   */
  private computeLabelCrossingMatrix(slHolder: SelfLoopHolder): boolean[][] {
    // We need to start by giving the labels proper IDs
    let labelID = 0;
    for (const slLoop of slHolder.getSLHyperLoops()) {
      const slLabels = slLoop.getSLLabels();
      if (slLabels !== null) {
        slLabels.id = labelID;
        labelID = Int32.add(labelID, 1);
      }
    }

    const crossingMatrix = Array.from({ length: labelID }, () => new Array<boolean>(labelID).fill(false));

    // Now check for each pair of labels whether or not they overlap
    const slLoops = slHolder.getSLHyperLoops();
    for (let sl1Idx = 0; sl1Idx < slLoops.length; sl1Idx++) {
      const slLoop1 = slLoops[sl1Idx]!;

      if (slLoop1.getSLLabels() !== null) {
        for (let sl2Idx = sl1Idx + 1; sl2Idx < slLoops.length; sl2Idx++) {
          const slLoop2 = slLoops[sl2Idx]!;

          if (slLoop2.getSLLabels() !== null) {
            const overlap = this.labelsOverlap(slLoop1, slLoop2);

            crossingMatrix[slLoop1.getSLLabels()!.id]![slLoop2.getSLLabels()!.id] = overlap;
            crossingMatrix[slLoop2.getSLLabels()!.id]![slLoop1.getSLLabels()!.id] = overlap;
          }
        }
      }
    }

    return crossingMatrix;
  }

  /**
   * Returns `true` if the labels of the two loops would overlap if the loops were assigned to the same routing slot.
   * (The Java overload `labelsOverlap(SelfHyperLoop, SelfHyperLoop)` of `:129`; the matrix lookup overload is
   * `labelsOverlapInMatrix`.)
   */
  private labelsOverlap(slLoop1: SelfHyperLoop, slLoop2: SelfHyperLoop): boolean {
    // (Java line 130 `assert slLoop1 != slLoop2` is omitted: assertions are off.)
    const slLabels1 = slLoop1.getSLLabels();
    const slLabels2 = slLoop2.getSLLabels();

    // There won't be overlaps unless both loops have labels
    if (slLabels1 === null || slLabels2 === null) {
      return false;
    }

    // The labels must be assigned to the same side, and that side (currently) needs to be either north or south
    if (
      slLabels1.getSide() !== slLabels2.getSide() ||
      slLabels1.getSide() === PortSide.EAST ||
      slLabels1.getSide() === PortSide.WEST
    ) {
      return false;
    }

    // Check if the labels overlap horizontally (remember that at this point, horizontal coordinates of north and
    // south labels have been set by the label placer)
    const start1 = slLabels1.getPosition().x;
    const end1 = start1 + slLabels1.getSize().x;
    const start2 = slLabels2.getPosition().x;
    const end2 = start2 + slLabels2.getSize().x;

    return start1 <= end2 && end1 >= start2;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Crossing Graph

  /**
   * Create the crossing graph by creating one {@link HyperEdgeSegment} for each {@link SelfHyperLoop} and computing
   * the proper dependencies between them.
   */
  private createCrossingGraph(slHolder: SelfLoopHolder, labelCrossingMatrix: boolean[][]): void {
    const slLoops = slHolder.getSLHyperLoops();

    // Create an edge segment for each loop
    this.hyperEdgeSegments = [];
    this.slLoopToSegmentMap = new Map();

    for (const slLoop of slLoops) {
      const segment = new HyperEdgeSegment(null);
      this.hyperEdgeSegments.push(segment);
      this.slLoopToSegmentMap.set(slLoop, segment);
    }

    // To be able to quickly count crossings later, we remember for each loop whether it's active at a given port
    // ID or not
    this.slLoopActivityOverPorts = new Map();
    this.computeLoopActivity(slHolder);

    // For each pair of hyper loops, determine the crossings for one segment routed above the other and vice versa.
    // Note that this will create dependencies between all pairs of self loops, even if they don't share ports. This
    // is intentional. It assigns unique routing slots to each segment, which ensures that there won't be any
    // collisions on sides without ports. The routing space will be compacted at a later step.
    for (let firstIdx = 0; firstIdx < slLoops.length - 1; firstIdx++) {
      const slLoop1 = slHolder.getSLHyperLoops()[firstIdx]!;
      for (let secondIdx = firstIdx + 1; secondIdx < slLoops.length; secondIdx++) {
        this.createDependencies(slLoop1, slHolder.getSLHyperLoops()[secondIdx]!, labelCrossingMatrix);
      }
    }
  }

  /**
   * Initializes {@link slLoopActivityOverPorts}. Each loop is mapped to an array indexed by port indices indicating
   * whether the loop runs along the given port or not.
   */
  private computeLoopActivity(slHolder: SelfLoopHolder): void {
    const slLoops = slHolder.getSLHyperLoops();
    const lPorts = slHolder.getLNode().getPorts();

    for (const slLoop of slLoops) {
      const loopActivity = new Array<boolean>(lPorts.length).fill(false);
      this.slLoopActivityOverPorts!.set(slLoop, loopActivity);

      // Run from the loop's start port to the end port, possibly wrapping around, and set everything to true
      // along the way
      let lPortIdx = Int32.sub(slLoop.getLeftmostPort()!.getLPort().id, 1);
      const lPortTargetIdx = slLoop.getRightmostPort()!.getLPort().id;

      while (lPortIdx !== lPortTargetIdx) {
        lPortIdx = Int32.rem(Int32.add(lPortIdx, 1), lPorts.length);
        loopActivity[lPortIdx] = true;
      }
    }
  }

  /**
   * Creates the necessary dependencies between the {@link SelfHyperLoop}s with the given indices. The lists must have
   * a one-to-one correspondence between loops and segments, that is, the i-th loop must be represented by the i-th
   * segment. The array says at which ports each loop is active.
   */
  private createDependencies(slLoop1: SelfHyperLoop, slLoop2: SelfHyperLoop, labelCrossingMatrix: boolean[][]): void {
    // Count the numbers of crossings that would ensue if placing to first segment above the second segment and
    // vice versa
    const firstAboveSecondCrossings = this.countCrossings(slLoop1, slLoop2);
    const secondAboveFirstCrossings = this.countCrossings(slLoop2, slLoop1);

    // Create dependencies
    const segment1 = this.slLoopToSegmentMap!.get(slLoop1)!;
    const segment2 = this.slLoopToSegmentMap!.get(slLoop2)!;

    if (firstAboveSecondCrossings < secondAboveFirstCrossings) {
      // The first loop should be above the second loop
      HyperEdgeSegmentDependency.createAndAddRegular(
        segment1,
        segment2,
        Int32.sub(secondAboveFirstCrossings, firstAboveSecondCrossings),
      );
    } else if (secondAboveFirstCrossings < firstAboveSecondCrossings) {
      // The second loop should be above the first loop
      HyperEdgeSegmentDependency.createAndAddRegular(
        segment2,
        segment1,
        Int32.sub(firstAboveSecondCrossings, secondAboveFirstCrossings),
      );
    } else if (firstAboveSecondCrossings !== 0 || this.labelsOverlapInMatrix(slLoop1, slLoop2, labelCrossingMatrix)) {
      // Either both orders cause the same number of crossings (and at least one), or the labels of the two loops
      // overlap and the loops must thus be forced onto different slots
      HyperEdgeSegmentDependency.createAndAddRegular(segment1, segment2, 0);
      HyperEdgeSegmentDependency.createAndAddRegular(segment2, segment1, 0);
    }
  }

  /**
   * Counts the number of crossings that result between a loop routed through a higher and a loop routed through a
   * lower routing slot. The crossings will happen where the upper loop connects to ports within the routing area
   * of the lower loop. That is, for each of the upper loop's ports, if the lower loop is active there, this will
   * cause a crossing.
   */
  private countCrossings(slUpperLoop: SelfHyperLoop, slLowerLoop: SelfHyperLoop): number {
    const lowerLoopActivity = this.slLoopActivityOverPorts!.get(slLowerLoop)!;
    let crossings = 0;

    for (const slPort of slUpperLoop.getSLPorts()) {
      if (lowerLoopActivity[slPort.getLPort().id]) {
        crossings = Int32.add(crossings, 1);
      }
    }

    return crossings;
  }

  /**
   * Looks at the label crossing matrix to determine whether the labels of the two loops overlap. (The Java overload
   * `labelsOverlap(SelfHyperLoop, SelfHyperLoop, boolean[][])` of `:222`.)
   */
  private labelsOverlapInMatrix(
    slLoop1: SelfHyperLoop,
    slLoop2: SelfHyperLoop,
    labelCrossingMatrix: boolean[][],
  ): boolean {
    if (slLoop1.getSLLabels() === null || slLoop2.getSLLabels() === null) {
      return false;
    }
    return labelCrossingMatrix[slLoop1.getSLLabels()!.id]![slLoop2.getSLLabels()!.id]!;
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Slot Assignment

  /** Based on the acyclic crossing graph, assign routing slots to all combinations of self loops and port sides. */
  private doAssignRoutingSlots(slHolder: SelfLoopHolder, labelCrossingMatrix: boolean[][]): void {
    // We first compute raw slots
    this.assignRawRoutingSlotsToSegments();

    // We assign raw routing slots, but try to compact the routing slot assignment afterwards (this might not
    // actually be necessary)
    this.assignRawRoutingSlotsToLoops(slHolder);
    this.shiftTowardsNode(slHolder, labelCrossingMatrix);
  }

  /**
   * This will assign routing slots to the segments as if the four port sides were completely dependent. However,
   * they are not. If the northern port side has 6 routing slots, that doesn't mean the eastern side will need 6 as
   * well.
   */
  private assignRawRoutingSlotsToSegments(): void {
    // The `LinkedList` queue: items are appended and polled from the front
    const sinks: HyperEdgeSegment[] = [];
    let polled = 0;

    // Fill our queue of sinks, which will ultimately end up being routed nearest to the node. While we go through
    // these, we also reset the in- and out weights to the number of incoming and outgoing dependencies
    for (const segment of this.hyperEdgeSegments!) {
      segment.setInWeight(segment.getIncomingSegmentDependencies().length);
      segment.setOutWeight(segment.getOutgoingSegmentDependencies().length);

      if (segment.getOutWeight() === 0) {
        segment.setRoutingSlot(0);
        sinks.push(segment);
      }
    }

    // Assign raw routing slots!
    while (polled < sinks.length) {
      const segment = sinks[polled++]!;
      const nextRoutingSlot = Int32.add(segment.getRoutingSlot(), 1);

      for (const inDependency of segment.getIncomingSegmentDependencies()) {
        const sourceSegment = inDependency.getSource()!;
        sourceSegment.setRoutingSlot(Math.max(sourceSegment.getRoutingSlot(), nextRoutingSlot));

        sourceSegment.setOutWeight(Int32.sub(sourceSegment.getOutWeight(), 1));
        if (sourceSegment.getOutWeight() === 0) {
          sinks.push(sourceSegment);
        }
      }
    }
  }

  /** Assigns the computed raw routing slots to each loop on each side the loop occupies. */
  private assignRawRoutingSlotsToLoops(slHolder: SelfLoopHolder): void {
    for (const slLoop of slHolder.getSLHyperLoops()) {
      const slot = this.slLoopToSegmentMap!.get(slLoop)!.getRoutingSlot();
      for (const portSide of slLoop.getOccupiedPortSides()) {
        slLoop.setRoutingSlot(portSide, slot);
      }
    }
  }

  /** Moves the self loops towards the node on each of the node's sides to avoid empty routing slots. */
  private shiftTowardsNode(slHolder: SelfLoopHolder, labelCrossingMatrix: boolean[][]): void {
    // For each port, this array specifies the next routing slot we can assign a self loop on that side to
    const nextFreeRoutingSlotAtPort = new Array<number>(slHolder.getLNode().getPorts().length).fill(0);

    this.shiftTowardsNodeOnSide(slHolder, PortSide.NORTH, nextFreeRoutingSlotAtPort, labelCrossingMatrix);
    this.shiftTowardsNodeOnSide(slHolder, PortSide.EAST, nextFreeRoutingSlotAtPort, labelCrossingMatrix);
    this.shiftTowardsNodeOnSide(slHolder, PortSide.SOUTH, nextFreeRoutingSlotAtPort, labelCrossingMatrix);
    this.shiftTowardsNodeOnSide(slHolder, PortSide.WEST, nextFreeRoutingSlotAtPort, labelCrossingMatrix);
  }

  private shiftTowardsNodeOnSide(
    slHolder: SelfLoopHolder,
    side: PortSide,
    nextFreeRoutingSlotAtPort: number[],
    labelCrossingMatrix: boolean[][],
  ): void {
    // We will iterate over the self loops that occupy that port side, sorted ascendingly by routing slot (a stable sort,
    // as the `Stream.sorted` of Java)
    const slLoops = slHolder
      .getSLHyperLoops()
      .filter((slLoop) => slLoop.getOccupiedPortSides().contains(side))
      .sort((sl1, sl2) => integerCompare(sl1.getRoutingSlot(side), sl2.getRoutingSlot(side)));

    // Find the indices of the first and last regular port on the port side
    const range = this.findPortIndexRange(slHolder.getLNode().getPorts(), side);

    if (range.min === INT_MAX) {
      // There are no ports on this side, so we simply assign the loops to consecutive slots starting with 0. We
      // won't cause label overlaps.
      for (let i = 0; i < slLoops.length; i++) {
        slLoops[i]!.setRoutingSlot(side, i);
      }
    } else {
      this.shiftLoopsOnSideWithPorts(slLoops, side, range, nextFreeRoutingSlotAtPort, labelCrossingMatrix);
    }
  }

  /** The port index search of `shiftTowardsNodeOnSide` (`:355-361`). */
  private findPortIndexRange(lPorts: LPort[], side: PortSide): PortIndexRange {
    let minLPortIndex = INT_MAX;
    let maxLPortIndex = INT_MIN;
    for (const lPort of lPorts) {
      if (lPort.getSide() === side) {
        minLPortIndex = Math.min(minLPortIndex, lPort.id);
        maxLPortIndex = Math.max(maxLPortIndex, lPort.id);
      }
    }
    return { min: minLPortIndex, max: maxLPortIndex };
  }

  /** The `else` branch of `shiftTowardsNodeOnSide` (`:371-419`): there are ports on this side. */
  private shiftLoopsOnSideWithPorts(
    slLoops: SelfHyperLoop[],
    side: PortSide,
    range: PortIndexRange,
    nextFreeRoutingSlotAtPort: number[],
    labelCrossingMatrix: boolean[][],
  ): void {
    const slotAssignedToLabel = new Array<number>(labelCrossingMatrix.length).fill(-1);

    // There are ports on this side. Find the lowest free slot across all ports our loop spans, and ensure that
    // no label our loop label conflicts with is assigned to that slot
    for (const slLoop of slLoops) {
      const activeAtPort = this.slLoopActivityOverPorts!.get(slLoop)!;
      let lowestAvailableSlot = this.lowestFreeSlotAcrossPorts(activeAtPort, range, nextFreeRoutingSlotAtPort);

      // If we have a label, it could be that we are in conflict with another label placed at the lowest
      // available slot. There might also be labels at higher slots. We thus need to assemble all slots
      // occupied by conflicting labels that have already been assigned to one and find the first
      // conflict-free slot
      if (slLoop.getSLLabels() !== null) {
        lowestAvailableSlot = this.firstConflictFreeSlot(
          slLoop.getSLLabels()!.id,
          lowestAvailableSlot,
          slotAssignedToLabel,
          labelCrossingMatrix,
        );
      }

      // Assign the loop to that routing slot and update out routing slot array
      slLoop.setRoutingSlot(side, lowestAvailableSlot);
      for (let portIndex = range.min; portIndex <= range.max; portIndex++) {
        if (activeAtPort[portIndex]) {
          nextFreeRoutingSlotAtPort[portIndex] = Int32.add(lowestAvailableSlot, 1);
        }
      }

      // If we have a label, update the label's routing slot
      if (slLoop.getSLLabels() !== null) {
        slotAssignedToLabel[slLoop.getSLLabels()!.id] = lowestAvailableSlot;
      }
    }
  }

  /** The first port scan of `shiftTowardsNodeOnSide` (`:379-385`): the lowest slot free at every port the loop spans. */
  private lowestFreeSlotAcrossPorts(
    activeAtPort: boolean[],
    range: PortIndexRange,
    nextFreeRoutingSlotAtPort: number[],
  ): number {
    let lowestAvailableSlot = 0;

    for (let portIndex = range.min; portIndex <= range.max; portIndex++) {
      if (activeAtPort[portIndex]) {
        lowestAvailableSlot = Math.max(lowestAvailableSlot, nextFreeRoutingSlotAtPort[portIndex]!);
      }
    }
    return lowestAvailableSlot;
  }

  /**
   * The label conflict search of `shiftTowardsNodeOnSide` (`:401-416`): the first slot, starting with the given lowest
   * available one, that no conflicting label occupies.
   */
  private firstConflictFreeSlot(
    ourLabelIdx: number,
    lowestAvailableSlot: number,
    slotAssignedToLabel: number[],
    labelCrossingMatrix: boolean[][],
  ): number {
    const slotsWithLabelConflicts = new Set<number>();

    for (let otherLabelIdx = 0; otherLabelIdx < labelCrossingMatrix.length; otherLabelIdx++) {
      if (labelCrossingMatrix[ourLabelIdx]![otherLabelIdx]) {
        slotsWithLabelConflicts.add(slotAssignedToLabel[otherLabelIdx]!);
      }
    }

    // Find the first slot (starting with out lowest available) that does not appear in the set
    let slot = lowestAvailableSlot;
    while (slotsWithLabelConflicts.has(slot)) {
      slot = Int32.add(slot, 1);
    }
    return slot;
  }
}
