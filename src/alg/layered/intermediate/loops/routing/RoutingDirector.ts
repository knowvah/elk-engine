// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../../core/options/PortSide.js';
import { devAssert } from '../../../../../java/lang/DevAssert.js';
import * as Int32 from '../../../../../java/lang/Int32.js';
import { NoSuchElementException } from '../../../../../java/util/NoSuchElementException.js';
import type { LPort } from '../../../graph/LPort.js';
import { PortRestorer } from '../ordering/PortRestorer.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { SelfLoopType } from '../SelfLoopType.js';

/** Java `Integer.compare`. */
const integerCompare = (a: number, b: number): number => (a < b ? -1 : a === b ? 0 : 1);

/** A comparator for {@link SelfLoopPort}s based on the {@link LPort} IDs. */
const COMPARE_BY_ID = (slPort1: SelfLoopPort, slPort2: SelfLoopPort): number =>
  integerCompare(slPort1.getLPort().id, slPort2.getLPort().id);

/** The penalty an edge incurs for passing a port without any connections. */
const UNCONNECTED_PORT_PENALTY = 1;
/** The penalty an edge incurs for passing a port with connections. */
const CONNECTED_PORT_PENALTY = 3;

/**
 * Decides for each {@link SelfHyperLoop} which of its {@link SelfLoopPort}s is the leftmost and which is the rightmost
 * one. This effectively decides how the loop is routed around the node. How complex this is to determine depends on the
 * self loop types (see the method documentations for how we do so).
 *
 * Deviations: Java `assert` statements are `devAssert` calls. The `default` branch of the `switch` over the loop type
 * and of the missing-side `switch` (Java `assert false`) is unreachable; in the three-sided case it throws. `determineLoopRoutes` was split (`determineLoopRoute`) for the complexity limit.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/routing/RoutingDirector.java
 */
export class RoutingDirector {
  /**
   * The main data structure we use to compute penalties incurred by connecting two {@link SelfLoopPort}s. Each port
   * has an ID which we use to index into this array. The entry then specifies the penalty an edge that goes through
   * all the ports (from the top left port through the given port) would incur. We can compute penalties for edges
   * between ports with IDs `idLeft` and `idRight` would incur. If `idLeft < idRight`, we simply compute
   * `portPenalties[idRight - 1] - portPenalties[idLeft]`. If `idLeft > idRight`, we wrap around the top left corner,
   * thus resetting the port IDs back to zero. But that case is not hard either.
   */
  private portPenalties: number[] | null = null;

  /** Sets the leftmost and rightmost ports of each {@link SelfHyperLoop} in the given {@link SelfLoopHolder}. */
  determineLoopRoutes(slHolder: SelfLoopHolder): void {
    // Start by giving IDs to all ports according to their order in the port list
    this.assignPortIds(slHolder.getLNode().getPorts());
    this.sortHyperLoopPortLists(slHolder);

    // Now assign stuff! Preferrably, assign leftmost and rightmost ports...
    for (const slLoop of slHolder.getSLHyperLoops()) {
      this.determineLoopRoute(slLoop);

      // Setup the loop's set of occupied port sides
      this.computeOccupiedPortSides(slLoop);
    }

    this.portPenalties = null;
  }

  /** The `switch` of `determineLoopRoutes` (`:63-87`), split out for the complexity limit. */
  private determineLoopRoute(slLoop: SelfHyperLoop): void {
    const loopType = slLoop.getSelfLoopType();
    if (loopType === null) {
      // Java: `switch` on a null enum is a NullPointerException
      throw new TypeError('The self loop type of a hyper loop must be determined before routing.');
    }

    switch (loopType) {
      case SelfLoopType.ONE_SIDE:
        this.determineOneSideLoopRoutes(slLoop);
        break;

      case SelfLoopType.TWO_SIDES_CORNER:
        this.determineTwoSideCornerLoopRoutes(slLoop);
        break;

      case SelfLoopType.TWO_SIDES_OPPOSING:
        this.determineTwoSideOpposingLoopRoutes(slLoop);
        break;

      case SelfLoopType.THREE_SIDES:
        this.determineThreeSideLoopRoutes(slLoop);
        break;

      case SelfLoopType.FOUR_SIDES:
        this.determineFourSideLoopRoutes(slLoop);
        break;

      default:
        devAssert(() => false);
        break;
    }
  }

  private assignPortIds(lPorts: LPort[]): void {
    for (let i = 0; i < lPorts.length; i++) {
      lPorts[i]!.id = i;
    }
  }

  private sortHyperLoopPortLists(slHolder: SelfLoopHolder): void {
    for (const slLoop of slHolder.getSLHyperLoops()) {
      slLoop.getSLPorts().sort(COMPARE_BY_ID);
    }
  }

  private computeOccupiedPortSides(slLoop: SelfHyperLoop): void {
    let currPortSide = slLoop.getLeftmostPort()!.getLPort().getSide();
    const targetSide = slLoop.getRightmostPort()!.getLPort().getSide();

    while (currPortSide !== targetSide) {
      slLoop.getOccupiedPortSides().add(currPortSide);
      currPortSide = currPortSide.right();
    }

    slLoop.getOccupiedPortSides().add(currPortSide);
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Route Determination (One Side)

  /** One-sided self loops should always be routed within their one side, so that's easy. */
  private determineOneSideLoopRoutes(slLoop: SelfHyperLoop): void {
    const side = slLoop.getSLPorts()[0]!.getLPort().getSide();
    this.assignLeftmostRightmostPorts(slLoop, side, side);
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Route Determination (Two Sides, corner)

  /** Two-sided corner self loops are easy as well since we only want to span that corner. */
  private determineTwoSideCornerLoopRoutes(slLoop: SelfHyperLoop): void {
    const sides = PortRestorer.sortedTwoSideLoopPortSides(slLoop);
    this.assignLeftmostRightmostPorts(slLoop, sides[0]!, sides[1]!);
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Route Determination (One Side, opposing)

  /**
   * Opposing side loops have two ways to be routed. Those can be identified by the otherwise uninvolved port side the
   * loop is routed through. The exact routing we choose determines the number of edge crossings.
   */
  private determineTwoSideOpposingLoopRoutes(slLoop: SelfHyperLoop): void {
    const sides = PortRestorer.sortedTwoSideLoopPortSides(slLoop);
    devAssert(() => sides.length === 2);

    const slHolder = slLoop.getSLHolder();

    // We basically play through both possible options and use the one which has a lower penalty
    const option1LeftmostPort = this.lowestPortOnSide(slLoop, sides[0]!);
    const option1RightmostPort = this.highestPortOnSide(slLoop, sides[1]!);
    const option1Penalty = this.computeEdgePenalty(slHolder, option1LeftmostPort, option1RightmostPort);

    const option2LeftmostPort = this.lowestPortOnSide(slLoop, sides[1]!);
    const option2RightmostPort = this.highestPortOnSide(slLoop, sides[0]!);
    const option2Penalty = this.computeEdgePenalty(slHolder, option2LeftmostPort, option2RightmostPort);

    if (option1Penalty <= option2Penalty) {
      slLoop.setLeftmostPort(option1LeftmostPort);
      slLoop.setRightmostPort(option1RightmostPort);
    } else {
      slLoop.setLeftmostPort(option2LeftmostPort);
      slLoop.setRightmostPort(option2RightmostPort);
    }
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Route Determination (Three Sides)

  /** Three-sided self loops only have one possible way of being routed, so that's easy. */
  private determineThreeSideLoopRoutes(slLoop: SelfHyperLoop): void {
    let leftmostSide: PortSide;
    let rightmostSide: PortSide;

    // Determine the leftmost and rightmost of the three port sides (we cannot simply sort the port sides since
    // loops can span the WEST-NORTH corner)
    switch (this.computeMissingPortSide(slLoop)) {
      case PortSide.NORTH:
        leftmostSide = PortSide.EAST;
        rightmostSide = PortSide.WEST;
        break;

      case PortSide.EAST:
        leftmostSide = PortSide.SOUTH;
        rightmostSide = PortSide.NORTH;
        break;

      case PortSide.SOUTH:
        leftmostSide = PortSide.WEST;
        rightmostSide = PortSide.EAST;
        break;

      case PortSide.WEST:
        leftmostSide = PortSide.NORTH;
        rightmostSide = PortSide.SOUTH;
        break;

      default:
        // Java: then `lowestPortOnSide(slLoop, null)` fails; unreachable
        devAssert(() => false);
        throw new Error('A three-sided self loop has exactly one of the four sides missing.');
    }

    this.assignLeftmostRightmostPorts(slLoop, leftmostSide, rightmostSide);
  }

  private computeMissingPortSide(slLoop: SelfHyperLoop): PortSide {
    const sides = slLoop.getSLPortsBySide().keySet();

    // SUPPRESS CHECKSTYLE NEXT MagicNumber
    devAssert(() => sides.length === 3);
    devAssert(() => !sides.includes(PortSide.UNDEFINED));

    for (const side of PortSide.values()) {
      if (side !== PortSide.UNDEFINED && !sides.includes(side)) {
        return side;
      }
    }

    // This cannot happen
    devAssert(() => false);
    throw new Error('A three-sided self loop has exactly one of the four sides missing.');
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Route Determination (Four Sides)

  /**
   * For four-sided self loops, we have at least one port on every side. If we look at the list of ports, this means
   * that we want to insert a break between some pair of ports adjacent in that list: one will become the leftmost
   * port, and the other will become the rightmost port. What we want to do is find the pair of ports with the maximum
   * number of ports with external connections between them, since that will minimize the number of edge crossings our
   * routing will produce.
   */
  private determineFourSideLoopRoutes(slLoop: SelfHyperLoop): void {
    // The self loop ports are sorted by ID
    const sortedSLPorts = slLoop.getSLPorts();
    const slHolder = slLoop.getSLHolder();

    // Go through each pair of adjacent ports and find the one which incurs the highest penalty if we drew an edge
    // between them. That's the pair we want to split the loop at. We start with the uppermost port on the western
    // side and the leftmost on the northern side and then compare successive pairs against those two
    let worstLeftPort = sortedSLPorts[sortedSLPorts.length - 1]!;
    let worstRightPort = sortedSLPorts[0]!;
    let worstPenalty = this.computeEdgePenalty(slHolder, worstLeftPort, worstRightPort);

    for (let rightPortIndex = 1; rightPortIndex < sortedSLPorts.length; rightPortIndex++) {
      const currLeftPort = sortedSLPorts[rightPortIndex - 1]!;
      const currRightPort = sortedSLPorts[rightPortIndex]!;
      const currPenalty = this.computeEdgePenalty(slHolder, currLeftPort, currRightPort);

      if (currPenalty > worstPenalty) {
        worstLeftPort = currLeftPort;
        worstRightPort = currRightPort;
        worstPenalty = currPenalty;
      }
    }

    // Since we _don't_ want to draw the self loop between the left and right ports, we switch them here
    slLoop.setLeftmostPort(worstRightPort);
    slLoop.setRightmostPort(worstLeftPort);
  }

  // ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // Utility Methods

  /**
   * Assigns's the loop's leftmost and rightmost ports by taking the lowest-ID port on the given leftmost side and the
   * highest-ID port on the given rightmost side.
   */
  private assignLeftmostRightmostPorts(slLoop: SelfHyperLoop, leftmostSide: PortSide, rightmostSide: PortSide): void {
    slLoop.setLeftmostPort(this.lowestPortOnSide(slLoop, leftmostSide));
    slLoop.setRightmostPort(this.highestPortOnSide(slLoop, rightmostSide));
  }

  /** Returns the port with the lowest ID on the given side (`Stream.min(...).get()`). */
  private lowestPortOnSide(slLoop: SelfHyperLoop, side: PortSide): SelfLoopPort {
    let lowest: SelfLoopPort | null = null;
    for (const slPort of slLoop.getSLPortsBySide(side)) {
      if (lowest === null || COMPARE_BY_ID(lowest, slPort) > 0) {
        lowest = slPort;
      }
    }
    if (lowest === null) {
      throw new NoSuchElementException('No value present');
    }
    return lowest;
  }

  /** Returns the port with the highest ID on the given side (`Stream.max(...).get()`). */
  private highestPortOnSide(slLoop: SelfHyperLoop, side: PortSide): SelfLoopPort {
    let highest: SelfLoopPort | null = null;
    for (const slPort of slLoop.getSLPortsBySide(side)) {
      if (highest === null || COMPARE_BY_ID(highest, slPort) < 0) {
        highest = slPort;
      }
    }
    if (highest === null) {
      throw new NoSuchElementException('No value present');
    }
    return highest;
  }

  /** Computes the penalty incurred by an edge running from the leftmost port clockwise to the rightmost port. */
  private computeEdgePenalty(
    slHolder: SelfLoopHolder,
    leftmostPort: SelfLoopPort,
    rightmostPort: SelfLoopPort,
  ): number {
    // Compute penalties on demand
    this.portPenalties ??= this.computePenalties(slHolder);
    const penalties = this.portPenalties;

    const portCount = slHolder.getLNode().getPorts().length;

    const leftmostPortId = leftmostPort.getLPort().id;
    const rightmostPortId = rightmostPort.getLPort().id;
    let leftOfRightmostPortId = Int32.sub(rightmostPortId, 1);

    // We can have two cases here: either, leftmostPortId < rightmostPortId. Then leftOfRightmostPortId will be > 0
    // and we're happy. If leftmostPortId > rightmostPortId, it can happen that rightmostPortId == 0. Then we need
    // to adjust leftOfRightmostPortId to be a valid index
    if (leftOfRightmostPortId < 0) {
      leftOfRightmostPortId = Int32.sub(portCount, 1);
    }

    if (leftmostPortId <= leftOfRightmostPortId) {
      // This can be computed directly
      return Int32.sub(penalties[leftOfRightmostPortId]!, penalties[leftmostPortId]!);
    }
    // Our edge from the leftmost to the rightmost port would pass the top left corner, where indices reset to
    // zero. We need to split the result into a sum of partial results (from left to corner, from corner to
    // right)
    return Int32.add(
      Int32.sub(penalties[portCount - 1]!, penalties[leftmostPortId]!),
      penalties[leftOfRightmostPortId]!,
    );
  }

  /**
   * Computes accumulated port penalties and returns them (Java stores them in `portPenalties`). Connected and
   * unconnected ports incur different penalties. We could think about having self loop ports not incur a penalty since
   * their edges are not guaranteed to cross other self loop edges, but I leave that as future work.
   */
  private computePenalties(slHolder: SelfLoopHolder): number[] {
    // Simply iterate over the ports and add to the penalty sum
    const ports = slHolder.getLNode().getPorts();
    const penalties = new Array<number>(ports.length).fill(0);
    let penaltySum = 0;

    for (let i = 0; i < ports.length; i++) {
      const currPort = ports[i]!;
      if (currPort.getIncomingEdges().length === 0 && currPort.getOutgoingEdges().length === 0) {
        penaltySum = Int32.add(penaltySum, UNCONNECTED_PORT_PENALTY);
      } else {
        penaltySum = Int32.add(penaltySum, CONNECTED_PORT_PENALTY);
      }

      penalties[i] = penaltySum;
    }
    return penalties;
  }
}
