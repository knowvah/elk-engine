// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../core/options/PortSide.js';
import { ArrayListMultimap } from '../../../../guava/ArrayListMultimap.js';
import type { Multimap } from '../../../../guava/Multimap.js';
import type { HashStrategy } from '../../../../java/util/HashStrategy.js';
import { EnumSet } from '../../../../java/util/EnumSet.js';
import { identity } from '../../../../java/util/HashStrategy.js';
import { SelfHyperLoopLabels } from './SelfHyperLoopLabels.js';
import type { SelfLoopEdge } from './SelfLoopEdge.js';
import type { SelfLoopHolder } from './SelfLoopHolder.js';
import type { SelfLoopPort } from './SelfLoopPort.js';
import { SelfLoopType } from './SelfLoopType.js';

/**
 * The key protocol of `slPortsBySide` (a Guava `HashMap` keyed by the identity-hashed `PortSide` constants). The oracle JVM
 * runs with `-XX:hashCode=2`, where every identity hash is 1 (AD-10, W6): all keys share one bin and iterate in insertion
 * order, which a constant hash reproduces in the `JavaHashMap` behind the multimap.
 */
const INSERTION_ORDER_SIDES: HashStrategy<PortSide> = { hash: () => 1, equals: (a, b) => a === b };

/**
 * A self loop hyperedge consisting of at least one self loop edge.
 *
 * Since a self hyper loop may connect more than two ports, it is a relevant question how exactly the involved edges are
 * routed to connect them. The edges will later appear as one trunk which runs around the node, with little branches
 * establishing the actual connections to the ports involved. Thus, it is only required to remember the outermost ports
 * that limit the trunk. We remember the left and right boundary of the trunk: the trunk will leave the leftmost port
 * rightwards and approach the rightmost port from the left. The leftmost and rightmost ports are computed after the
 * port order has been established. Routing slots are computed thereafter as well.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/SelfHyperLoop.java
 */
export class SelfHyperLoop {
  // Structural properties

  /** The {@link SelfLoopHolder} which owns this instance. */
  private readonly slHolder: SelfLoopHolder;
  /** List of ports that belong to this hyper loop. */
  private readonly slPorts: SelfLoopPort[] = [];
  /** Set of edges that belong to this instance (Java `HashSet`: insertion order, see `.agent-notes`/W6 `ad10`). */
  private readonly slEdges = new Set<SelfLoopEdge>();
  /** This hyper loop's labels. */
  private slLabels: SelfHyperLoopLabels | null = null;

  // Routing properties (will be filled with values as self loop placement progresses)

  /** This self loop's loop type. Determined once port sides have been assigned. */
  private selfLoopType: SelfLoopType | null = null;
  /** List of ports per port side. */
  private slPortsBySide: ArrayListMultimap<PortSide, SelfLoopPort> | null = null;
  /** The hyper loop trunk's leftmost port. Computed after initialization. */
  private leftmostPort: SelfLoopPort | null = null;
  /** The hyper loop trunk's rightmost port. Computed after initialization. */
  private rightmostPort: SelfLoopPort | null = null;
  /** The set of port sides this loop is routed along. */
  private readonly occupiedPortSides: EnumSet<PortSide> = EnumSet.noneOf(PortSide);
  /** The routing slot we're assigned to on each side. Indexed by port side ordinals. */
  private readonly routingSlot: number[] = new Array<number>(PortSide.values().length).fill(0);

  // Creation

  /**
   * Creates a new instance owned by the given {@link SelfLoopHolder}. (Package-private in Java; public here.)
   *
   * @see SelfHyperLoop.java:81
   */
  constructor(slHolder: SelfLoopHolder) {
    this.slHolder = slHolder;
  }

  /**
   * Fills our `slPortsBySide` multimap and determines this self loop's type. This method is called by `PortRestorer`
   * right before it gets to work since it has to know which ports are on which side. (Java line 91
   * `assert slPortsBySide == null` and line 98 `assert portSide != PortSide.UNDEFINED` are omitted: assertions are off.)
   *
   * @see SelfHyperLoop.java:90
   */
  computePortsPerSide(): void {
    // Remember ports for each side
    const bySide = ArrayListMultimap.create<PortSide, SelfLoopPort>(
      INSERTION_ORDER_SIDES,
      identity<SelfLoopPort>(),
      PortSide.values().length,
      this.slPorts.length,
    );
    this.slPortsBySide = bySide;
    for (const slPort of this.slPorts) {
      const portSide = slPort.getLPort().getSide();

      bySide.put(portSide, slPort);
    }

    // Determine this self loop's loop type
    this.selfLoopType = SelfLoopType.fromPortSides(new Set(bySide.keySet()));
  }

  // Accessors

  /** Returns the {@link SelfLoopHolder} which owns this instance. */
  getSLHolder(): SelfLoopHolder {
    return this.slHolder;
  }

  /**
   * Adds the given edge to this instance and sets everything up accordingly, unless the edge was already part of this
   * instance.
   */
  addSelfLoopEdge(slEdge: SelfLoopEdge): void {
    if (!this.slEdges.has(slEdge)) {
      this.slEdges.add(slEdge);
      slEdge.setSLHyperLoop(this);

      const slSource = slEdge.getSLSource();
      if (!this.slPorts.includes(slSource)) {
        this.slPorts.push(slSource);
      }

      const slTarget = slEdge.getSLTarget();
      if (!this.slPorts.includes(slTarget)) {
        this.slPorts.push(slTarget);
      }

      // Check if we need to take care of any edge labels
      const lLabels = slEdge.getLEdge().getLabels();
      if (lLabels.length > 0) {
        if (this.slLabels === null) {
          this.slLabels = new SelfHyperLoopLabels(this);
        }

        this.slLabels.addLLabels(lLabels);
      }
    }
  }

  /**
   * Returns the list of ports connected by this hyper loop. Once the `RoutingDirector` has run, this list will be sorted
   * according to the `LNode`'s list of `LPort`s.
   */
  getSLPorts(): SelfLoopPort[] {
    return this.slPorts;
  }

  /** Returns the list of edges that belong to this instance. */
  getSLEdges(): Set<SelfLoopEdge> {
    return this.slEdges;
  }

  /** Returns the self loop labels, if any. Can be `null`. */
  getSLLabels(): SelfHyperLoopLabels | null {
    return this.slLabels;
  }

  /** Returns the loop's self loop type. */
  getSelfLoopType(): SelfLoopType | null {
    return this.selfLoopType;
  }

  /** Returns a map of port sides mapped to ports on that side. */
  getSLPortsBySide(): Multimap<PortSide, SelfLoopPort>;
  /** Returns the loop's ports on the given side. */
  getSLPortsBySide(portSide: PortSide): Iterable<SelfLoopPort>;
  getSLPortsBySide(portSide?: PortSide): Multimap<PortSide, SelfLoopPort> | Iterable<SelfLoopPort> {
    return portSide === undefined ? this.slPortsBySide! : this.slPortsBySide!.get(portSide);
  }

  /** Returns whether the loop has ports on the given side. */
  hasSLPortsOnSide(portSide: PortSide): boolean {
    return this.slPortsBySide!.containsKey(portSide);
  }

  /** Returns the hyper loop's leftmost port. See the class description for more details. */
  getLeftmostPort(): SelfLoopPort | null {
    return this.leftmostPort;
  }

  /** Sets the hyper loop's leftmost port. See the class description for more details. */
  setLeftmostPort(leftmostPort: SelfLoopPort | null): void {
    this.leftmostPort = leftmostPort;
  }

  /** Returns the hyper loop's rightmost port. See the class description for more details. */
  getRightmostPort(): SelfLoopPort | null {
    return this.rightmostPort;
  }

  /** Sets the hyper loop's rightmost port. See the class description for more details. */
  setRightmostPort(rightmostPort: SelfLoopPort | null): void {
    this.rightmostPort = rightmostPort;
  }

  /** Returns the set of port sides this loop is routed along. */
  getOccupiedPortSides(): EnumSet<PortSide> {
    return this.occupiedPortSides;
  }

  /** Returns the routing slot this loop should occupy on the given port side. */
  getRoutingSlot(portSide: PortSide): number {
    return this.routingSlot[portSide.ordinal()]!;
  }

  /**
   * Sets which routing slot this loop should occupy on the given port side. Also updates the number of routing slots
   * kept by the {@link SelfLoopHolder}.
   */
  setRoutingSlot(portSide: PortSide, slot: number): void {
    this.routingSlot[portSide.ordinal()] = slot;

    const slotCount = this.slHolder.getRoutingSlotCount();
    slotCount[portSide.ordinal()] = Math.max(slotCount[portSide.ordinal()]!, slot + 1);
  }
}
