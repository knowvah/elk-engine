// SPDX-License-Identifier: EPL-2.0
import { Pair } from '../../../../core/util/Pair.js';
import * as Float32 from '../../../../java/lang/Float32.js';
import { LinkedList } from '../../../../java/util/LinkedList.js';
import type { LPort } from '../../graph/LPort.js';
import type { BaseRoutingDirectionStrategy } from './direction/BaseRoutingDirectionStrategy.js';
import type { HyperEdgeSegmentDependency } from './HyperEdgeSegmentDependency.js';

/**
 * Instances of this class represent the "trunk" of a hyper edge. In left-to-right layouts, this will be the vertical
 * segment of a hyperedge. Such a segment has a list of coordinates for each of its two sides that specifies where
 * incoming or outgoing connections enter and leave the segment, respectively (for horizontal layouts, this will be
 * horizontal edge segments that usually connect to ports). The range of coordinates spanned by a hyper edge segment
 * determines its extent, which can be requested by calling {@link getStartCoordinate} and {@link getEndCoordinate}.
 *
 * Whether coordinates refer to the x or y axis depends on the edge routing direction: for horizontal layouts, the edge
 * segment is vertical, which means that the coordinates are y coordinates.
 *
 * Hyperedge segments can be split by the {@link HyperEdgeSegmentSplitter} if they are part of a cyclic critical
 * dependency (that is, a sequence of edge segments that will cause edge overlaps with each other). Splitting an edge
 * segment will cause involved edges to take a longer detour, but will resolve edge overlaps. The segment keeps two
 * pieces of information about split segments: the new segment introduced to split the segment, and the segment that
 * originally caused the split.
 *
 * Instances of this class are comparable based on the value of {@link mark}. {@link hashCode} and {@link equals} are
 * implemented based on that value as well. That means, of course, that all of those methods only start making sense
 * once {@link mark} has a meaningful value.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/orthogonal/HyperEdgeSegment.java
 */
export class HyperEdgeSegment {
  /** routing strategy which will ultimately decide how edges will be routed. */
  private readonly routingStrategy: BaseRoutingDirectionStrategy | null;
  /** ports represented by this hypernode. */
  private readonly ports: LPort[] = [];

  /** mark value used for cycle breaking (to be accessed directly). */
  mark = 0;

  /** the routing slot determines the horizontal distance to the preceding layer. */
  private routingSlot = 0;

  /** start position of this edge segment (in horizontal layouts, this is the topmost y coordinate). */
  private startPosition = NaN;
  /** end position of this edge segment (in horizontal layouts, this is the bottommost y coordinate). */
  private endPosition = NaN;

  /** sorted list of coordinates where incoming connections enter this segment. */
  private readonly incomingConnectionCoordinates = new LinkedList<number>();
  /** sorted list of coordinates where outgoing connections leave this segment. */
  private readonly outgoingConnectionCoordinates = new LinkedList<number>();

  /** list of outgoing dependencies to other edge segments. */
  private readonly outgoingSegmentDependencies: HyperEdgeSegmentDependency[] = [];
  /** combined weight of all outgoing dependencies. */
  private outDepWeight = 0;
  /** combined weight of critical outgoing dependencies. */
  private criticalOutDepWeight = 0;
  /** list of incoming dependencies from other edge segments. */
  private readonly incomingSegmentDependencies: HyperEdgeSegmentDependency[] = [];
  /** combined weight of all incoming dependencies. */
  private inDepWeight = 0;
  /** combined weight of critical incoming dependencies. */
  private criticalInDepWeight = 0;

  /** if this segment is the result of a split segment, this is the other segment; otherwise it is `null`. */
  private splitPartner: HyperEdgeSegment | null = null;
  /** the segment that caused this segment to be split, if any (only set on one of the split partners). */
  private splitBy: HyperEdgeSegment | null = null;

  /**
   * Creates a new instance for the given routing strategy.
   *
   * @param routingStrategy the routing strategy. Only required if {@link addPortPositions} will be called to set this
   *   thing up.
   * @see HyperEdgeSegment.java:111
   */
  constructor(routingStrategy: BaseRoutingDirectionStrategy | null) {
    this.routingStrategy = routingStrategy;
  }

  /**
   * Adds the positions of the given port and all connected ports.
   *
   * The Java method calls itself for every connected port that has no segment yet (a depth-first walk over the ports
   * of one hyperedge). The walk is an explicit stack of the connected-port iterators here (mission 7e R8: no
   * recursion), which visits the ports and evaluates the `containsKey` test in the same order as the recursion does.
   *
   * @param port a port.
   * @param hyperEdgeSegmentMap map of ports to existing hyperedge segments.
   * @see HyperEdgeSegment.java:123
   */
  addPortPositions(port: LPort, hyperEdgeSegmentMap: Map<LPort, HyperEdgeSegment>): void {
    this.addPortPosition(port, hyperEdgeSegmentMap);

    // add connected ports
    const pending: Array<Iterator<LPort>> = [port.getConnectedPorts()[Symbol.iterator]()];
    while (pending.length > 0) {
      const next = pending[pending.length - 1]!.next();
      if (next.done === true) {
        pending.pop();
      } else if (!hyperEdgeSegmentMap.has(next.value)) {
        this.addPortPosition(next.value, hyperEdgeSegmentMap);
        pending.push(next.value.getConnectedPorts()[Symbol.iterator]());
      }
    }
  }

  /** The part of `addPortPositions` that precedes the loop over the connected ports (HyperEdgeSegment.java:124-136). */
  private addPortPosition(port: LPort, hyperEdgeSegmentMap: Map<LPort, HyperEdgeSegment>): void {
    hyperEdgeSegmentMap.set(port, this);
    this.ports.push(port);
    const portPos = this.routingStrategy!.getPortPositionOnHyperNode(port);

    // add the new port position to the respective list
    if (port.getSide() === this.routingStrategy!.getSourcePortSide()) {
      HyperEdgeSegment.insertSorted(this.incomingConnectionCoordinates, portPos);
    } else {
      HyperEdgeSegment.insertSorted(this.outgoingConnectionCoordinates, portPos);
    }

    // update start and end coordinates
    this.recomputeExtent();
  }

  /**
   * Inserts the value into the sorted list. The stored values are compared after narrowing to `float` (the Java reads
   * `listIter.next().floatValue()`), so a value that is not exactly representable as a float never equals the stored
   * double and is inserted again.
   *
   * @see HyperEdgeSegment.java:146
   */
  private static insertSorted(list: LinkedList<number>, value: number): void {
    const listIter = list.listIterator();
    while (listIter.hasNext()) {
      const next = Float32.fromDouble(listIter.next());
      if (next === value) {
        // an exactly equal value is already present in the list
        return;
      } else if (next > value) {
        listIter.previous();
        break;
      }
    }
    listIter.add(value);
  }

  /** Returns the ports incident to this segment. @see HyperEdgeSegment.java:167 */
  getPorts(): LPort[] {
    return this.ports;
  }

  /** Returns this segment's routing slot. @see HyperEdgeSegment.java:174 */
  getRoutingSlot(): number {
    return this.routingSlot;
  }

  /** Sets this segment's routing slot. @see HyperEdgeSegment.java:181 */
  setRoutingSlot(slot: number): void {
    this.routingSlot = slot;
  }

  /** Returns the coordinate where this segment begins. @see HyperEdgeSegment.java:188 */
  getStartCoordinate(): number {
    return this.startPosition;
  }

  /** Returns the coordinate where this segment ends. @see HyperEdgeSegment.java:195 */
  getEndCoordinate(): number {
    return this.endPosition;
  }

  /**
   * Returns the (sorted) list of coordinates where incoming connections enter this segment.
   *
   * @see HyperEdgeSegment.java:202
   */
  getIncomingConnectionCoordinates(): LinkedList<number> {
    return this.incomingConnectionCoordinates;
  }

  /**
   * Returns the (sorted) list of coordinates where outgoing connections leave this segment.
   *
   * @see HyperEdgeSegment.java:209
   */
  getOutgoingConnectionCoordinates(): LinkedList<number> {
    return this.outgoingConnectionCoordinates;
  }

  /** Return the outgoing dependencies to other hyper edge segments. @see HyperEdgeSegment.java:216 */
  getOutgoingSegmentDependencies(): HyperEdgeSegmentDependency[] {
    return this.outgoingSegmentDependencies;
  }

  /** Returns the combined weight of all outgoing dependencies. @see HyperEdgeSegment.java:223 */
  getOutWeight(): number {
    return this.outDepWeight;
  }

  /** Sets the combined weight of all outgoing dependencies. @see HyperEdgeSegment.java:230 */
  setOutWeight(outWeight: number): void {
    this.outDepWeight = outWeight;
  }

  /** Returns the combined weight of critical outgoing dependencies. @see HyperEdgeSegment.java:237 */
  getCriticalOutWeight(): number {
    return this.criticalOutDepWeight;
  }

  /** Sets the combined weight of critical outgoing dependencies. @see HyperEdgeSegment.java:244 */
  setCriticalOutWeight(outWeight: number): void {
    this.criticalOutDepWeight = outWeight;
  }

  /** Return the incoming dependencies from other hyper edge segments.. @see HyperEdgeSegment.java:251 */
  getIncomingSegmentDependencies(): HyperEdgeSegmentDependency[] {
    return this.incomingSegmentDependencies;
  }

  /** Returns the weight of incoming dependencies. @see HyperEdgeSegment.java:258 */
  getInWeight(): number {
    return this.inDepWeight;
  }

  /** Sets the weight of incoming dependencies. @see HyperEdgeSegment.java:265 */
  setInWeight(inWeight: number): void {
    this.inDepWeight = inWeight;
  }

  /** Returns the combined weight of critical incoming dependencies. @see HyperEdgeSegment.java:272 */
  getCriticalInWeight(): number {
    return this.criticalInDepWeight;
  }

  /** Sets the combined weight of critical incoming dependencies. @see HyperEdgeSegment.java:279 */
  setCriticalInWeight(inWeight: number): void {
    this.criticalInDepWeight = inWeight;
  }

  /**
   * Returns the split partner, that is, the other segment involved in splitting a segment into two, or `null` if this
   * segment was not split. The actual edge routing code will have to know about split partners to route edges
   * accordingly.
   *
   * @see HyperEdgeSegment.java:288
   */
  getSplitPartner(): HyperEdgeSegment | null {
    return this.splitPartner;
  }

  /**
   * Sets the split partner, that is, the other segment involved in splitting a segment into two.
   *
   * @see HyperEdgeSegment.java:295
   */
  setSplitPartner(splitPartner: HyperEdgeSegment | null): void {
    this.splitPartner = splitPartner;
  }

  /**
   * Returns the segment that caused this one to be split, if any. This is only set on one of the split partners.
   *
   * @see HyperEdgeSegment.java:302
   */
  getSplitBy(): HyperEdgeSegment | null {
    return this.splitBy;
  }

  /** Sets the segment that caused this one to be split, if any. @see HyperEdgeSegment.java:309 */
  setSplitBy(splitBy: HyperEdgeSegment | null): void {
    this.splitBy = splitBy;
  }

  /**
   * Convernience method which returns the size of this segment, which is its end coordinate minus its start
   * coordinate.
   *
   * @see HyperEdgeSegment.java:320
   */
  getLength(): number {
    return this.getEndCoordinate() - this.getStartCoordinate();
  }

  /** Checks whether this segment connects two or more ports. @see HyperEdgeSegment.java:327 */
  representsHyperedge(): boolean {
    return this.getIncomingConnectionCoordinates().size() + this.getOutgoingConnectionCoordinates().size() > 2;
  }

  /** Checks whether this segment was introduced while splitting another segment. @see HyperEdgeSegment.java:334 */
  isDummy(): boolean {
    return this.splitPartner !== null && this.splitBy === null;
  }

  /**
   * Recomputes the start and end coordinate based on incoming and outgoing connection coordinates. (The Java overloads
   * `recomputeExtent()` and the private `recomputeExtent(LinkedList)` are this method and {@link recomputeExtentOf}.)
   *
   * @see HyperEdgeSegment.java:341
   */
  recomputeExtent(): void {
    this.startPosition = NaN;
    this.endPosition = NaN;

    this.recomputeExtentOf(this.incomingConnectionCoordinates);
    this.recomputeExtentOf(this.outgoingConnectionCoordinates);
  }

  /** @see HyperEdgeSegment.java:349 */
  private recomputeExtentOf(positions: LinkedList<number>): void {
    // this code assumes that the positions are sorted ascendingly
    if (!positions.isEmpty()) {
      // set new start position
      if (Number.isNaN(this.startPosition)) {
        this.startPosition = positions.getFirst();
      } else {
        this.startPosition = Math.min(this.startPosition, positions.getFirst());
      }

      // set new end position
      if (Number.isNaN(this.endPosition)) {
        this.endPosition = positions.getLast();
      } else {
        this.endPosition = Math.max(this.endPosition, positions.getLast());
      }
    }
  }

  /**
   * Simulates what would happen during a split. The returned pair contains two new {@link HyperEdgeSegment}s: the
   * first simulates what would happen to this instance, and the second simulates the split partner. They are set up
   * with the appropriate incoming and outgoing connection coordinates, except for the linking segment, which this
   * method does not know about. The split partner property of each segment points to the other segment.
   *
   * @see HyperEdgeSegment.java:377
   */
  simulateSplit(): Pair<HyperEdgeSegment, HyperEdgeSegment> {
    const newSplit = new HyperEdgeSegment(this.routingStrategy);
    const newSplitPartner = new HyperEdgeSegment(this.routingStrategy);

    newSplit.incomingConnectionCoordinates.addAll(this.incomingConnectionCoordinates);
    newSplit.splitBy = this.splitBy;
    newSplit.splitPartner = newSplitPartner;
    newSplit.recomputeExtent();

    newSplitPartner.outgoingConnectionCoordinates.addAll(this.outgoingConnectionCoordinates);
    newSplitPartner.splitPartner = newSplit;
    newSplitPartner.recomputeExtent();

    return Pair.of(newSplit, newSplitPartner);
  }

  /**
   * Splits this segment into two and returns the new segment. The segments will be linked at the given position. This
   * segment will retain all incoming connection coordinates, but all of its outgoing connection coordinates will move
   * over to the new segment, to be replaced by the link between the two. This will completely clear all dependencies
   * since they may have become obsolete.
   *
   * @param splitPosition position to split the two segments.
   * @returns the new segment for convenience, although the two will be linked as split partners.
   * @see HyperEdgeSegment.java:403
   */
  splitAt(splitPosition: number): HyperEdgeSegment {
    const partner = new HyperEdgeSegment(this.routingStrategy);
    this.splitPartner = partner;
    partner.setSplitPartner(this);

    // Move all target positions over to the new segment
    partner.outgoingConnectionCoordinates.addAll(this.outgoingConnectionCoordinates);
    this.outgoingConnectionCoordinates.clear();

    // Link the two
    this.outgoingConnectionCoordinates.add(splitPosition);
    partner.incomingConnectionCoordinates.add(splitPosition);

    // Recompute their outer coordinates
    this.recomputeExtent();
    partner.recomputeExtent();

    // Clear dependencies so they can be regenerated later. We could try to be smart about updating them, but that
    // would be more complicated code, so this will do just fine
    while (this.incomingSegmentDependencies.length > 0) {
      this.incomingSegmentDependencies[0]!.remove();
    }

    while (this.outgoingSegmentDependencies.length > 0) {
      this.outgoingSegmentDependencies[0]!.remove();
    }

    return partner;
  }

  /** @see HyperEdgeSegment.java:436 */
  compareTo(other: HyperEdgeSegment): number {
    // marks are bounded by the segment count, so the int difference cannot wrap
    return this.mark - other.mark;
  }

  /** @see HyperEdgeSegment.java:441 */
  equals(object: unknown): boolean {
    if (object instanceof HyperEdgeSegment) {
      return this.mark === object.mark;
    }
    return false;
  }

  /** @see HyperEdgeSegment.java:450 */
  hashCode(): number {
    return this.mark;
  }

  /** @see HyperEdgeSegment.java:455 */
  toString(): string {
    let builder = '{';
    const portIter = this.ports[Symbol.iterator]();
    let current = portIter.next();
    while (current.done !== true) {
      const port = current.value;
      let name = port.getNode()!.getDesignation();
      if (name === null) {
        name = `n${String(port.getNode()!.getIndex())}`;
      }
      builder += name;
      current = portIter.next();
      if (current.done !== true) {
        builder += ',';
      }
    }
    builder += '}';
    return builder;
  }
}
