// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../../../core/util/IElkProgressMonitor.js';
import { createArrayTable, type Table } from '../../../../../guava/Table.js';
import { ArrayListMultimap } from '../../../../../guava/ArrayListMultimap.js';
import type { ValueList } from '../../../../../guava/Multimap.js';
import { identity } from '../../../../../java/util/HashStrategy.js';
import { LayeredOptions } from '../../../options/LayeredOptions.js';
import { SelfLoopOrderingStrategy } from '../../../options/SelfLoopOrderingStrategy.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { SelfLoopType } from '../SelfLoopType.js';
import { AddMode } from './PortRestorerAddMode.js';
import { PortRestorerPortList } from './PortRestorerPortList.js';
import { PortSideArea } from './PortRestorerPortSideArea.js';

/** `Collections.reverse` over a live multimap value list (swaps through `get`/`set`, as the Java list algorithm does). */
function reverseList<V>(list: ValueList<V>): void {
  for (let i = 0, j = list.size - 1; i < j; i++, j--) {
    const tmp = list.get(i);
    list.set(i, list.get(j));
    list.set(j, tmp);
  }
}

/**
 * Restores hidden ports assuming fixed side port constraints.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/ordering/PortRestorer.java
 */
export class PortRestorer {
  /** {@link SelfHyperLoop}s indexed by {@link SelfLoopType}. */
  private slLoopsByType: ArrayListMultimap<SelfLoopType, SelfHyperLoop> | null = null;
  /** A table of all of the different areas around the node to place self loop ports. */
  private targetAreas: Table<PortSide, PortSideArea, SelfLoopPort[]> | null = null;

  // Different possible constellations of three-sided loops (Java static fields; read lazily so that importing this
  // module reads no PortSide constant)
  static #NES: PortSide[] | undefined;
  static #ESW: PortSide[] | undefined;
  static #SWN: PortSide[] | undefined;
  static #WNE: PortSide[] | undefined;

  private static get NES(): PortSide[] {
    return (PortRestorer.#NES ??= [PortSide.NORTH, PortSide.EAST, PortSide.SOUTH]);
  }
  private static get ESW(): PortSide[] {
    return (PortRestorer.#ESW ??= [PortSide.EAST, PortSide.SOUTH, PortSide.WEST]);
  }
  private static get SWN(): PortSide[] {
    return (PortRestorer.#SWN ??= [PortSide.SOUTH, PortSide.WEST, PortSide.NORTH]);
  }
  private static get WNE(): PortSide[] {
    return (PortRestorer.#WNE ??= [PortSide.WEST, PortSide.NORTH, PortSide.EAST]);
  }

  /**
   * Restores all previously hidden ports at proper locations. This will also reset all hiding-related properties of both
   * the {@link SelfLoopPort}s and the {@link SelfLoopHolder}. (`monitor` is unused, as in Java.)
   *
   * @see PortRestorer.java:58
   */
  restorePorts(slHolder: SelfLoopHolder, _monitor: IElkProgressMonitor): void {
    // Initialize all of the port lists we'll be working on before finally merging them into the node's list of
    // ports
    const targetAreas = this.initTargetAreas();

    // We distinguish different types of loops depending (mainly) on their number of port sides. They need to be
    // collected first
    this.slLoopsByType = this.gatherSelfLoopsByType(slHolder);

    // Now the loops have to be added in a certain order in an attempt to minimize edge crossings. This is not
    // exactly perfect since it doesn't take into account regular eastern / western ports that may be part of self
    // loops as well, but it's at least comparatively easy
    this.processOneSideLoops(slHolder.getLNode().getProperty(LayeredOptions.EDGE_ROUTING_SELF_LOOP_ORDERING));
    this.processTwoSideCornerLoops();
    this.processThreeSideLoops();
    this.processFourSideLoops();
    this.processTwoSideOpposingLoops();

    // Actually go ahead and add the ports to the real port list
    new PortRestorerPortList(targetAreas).restorePortList(slHolder);

    // We're not hiding any ports anymore (Java stream `values().stream().flatMap(...).forEach(...)`)
    for (const slPortList of targetAreas.values()) {
      for (const slPort of slPortList!) {
        slPort.setHidden(false);
      }
    }
    slHolder.setPortsHidden(false);

    // Reset
    this.slLoopsByType = null;
  }

  /**
   * Initializes our table of target areas. Once this method has finished, there is a port list for each combination of
   * port side and port side area in `targetAreas`. The Guava `ArrayTable` is the landed `createArrayTable`
   * (row-major over the two key lists; AD-10 row).
   *
   * @see PortRestorer.java:93
   */
  private initTargetAreas(): Table<PortSide, PortSideArea, SelfLoopPort[]> {
    // An array table is more efficient than other tables, but requires all row and column keys to be specified in
    // advance
    const targetAreas = createArrayTable<PortSide, PortSideArea, SelfLoopPort[]>(
      PortSide.values(),
      PortSideArea.values(),
    );
    this.targetAreas = targetAreas;

    for (const side of PortSide.values()) {
      for (const area of PortSideArea.values()) {
        targetAreas.put(side, area, []);
      }
    }
    return targetAreas;
  }

  // Self Loop Gathering

  /**
   * Gathers all of the self loops and distributes them by type. Key kind: identity-hashed enum constants, read only
   * through `get(type)`, never iterated (AD-10).
   *
   * @see PortRestorer.java:111
   */
  private gatherSelfLoopsByType(slHolder: SelfLoopHolder): ArrayListMultimap<SelfLoopType, SelfHyperLoop> {
    const loops = ArrayListMultimap.create<SelfLoopType, SelfHyperLoop>(
      identity<SelfLoopType>(),
      identity<SelfHyperLoop>(),
    );
    for (const slLoop of slHolder.getSLHyperLoops()) {
      loops.put(slLoop.getSelfLoopType()!, slLoop);
    }
    return loops;
  }

  /** The loops of one type (the Java `slLoopsByType.get(type)` live list view). */
  private loopsOfType(type: SelfLoopType): ValueList<SelfHyperLoop> {
    return this.slLoopsByType!.get(type);
  }

  // Self Loop Placement (One Side)

  /** @see PortRestorer.java:120 */
  private processOneSideLoops(ordering: SelfLoopOrderingStrategy): void {
    if (ordering === SelfLoopOrderingStrategy.REVERSE_STACKED) {
      reverseList(this.loopsOfType(SelfLoopType.ONE_SIDE));
    }
    for (const slLoop of this.loopsOfType(SelfLoopType.ONE_SIDE)) {
      // Obtain the port side
      const side = slLoop.getSLPorts()[0]!.getLPort().getSide();

      // We want ports with more outgoing edges to be to the left of ports with more incoming edges, so we need
      // a sorted list of ports
      const sortedPorts: SelfLoopPort[] = [...slLoop.getSLPorts()];
      sortedPorts.sort((slPort1, slPort2) => slPort1.getSLNetFlow() - slPort2.getSLNetFlow());

      this.placeOneSidePorts(sortedPorts, side, ordering);
    }
  }

  /** The `switch (ordering)` of the loop body of {@link processOneSideLoops} (Java `default: assert false` omitted). */
  private placeOneSidePorts(sortedPorts: SelfLoopPort[], side: PortSide, ordering: SelfLoopOrderingStrategy): void {
    switch (ordering) {
      case SelfLoopOrderingStrategy.SEQUENCED:
        // Simply add all ports according to our list
        this.addPortsToTargetArea(sortedPorts, side, PortSideArea.MIDDLE, AddMode.APPEND);
        break;
      case SelfLoopOrderingStrategy.REVERSE_STACKED:
      case SelfLoopOrderingStrategy.STACKED: {
        // Compute which ports we want to have in the first group and which in the second group
        const splitIndex = this.computePortListSplitIndex(sortedPorts);

        // Prepend the first group to the middle list, and append the second group to that same list
        this.addPortsToTargetArea(sortedPorts.slice(0, splitIndex), side, PortSideArea.MIDDLE, AddMode.PREPEND);
        this.addPortsToTargetArea(
          sortedPorts.slice(splitIndex, sortedPorts.length),
          side,
          PortSideArea.MIDDLE,
          AddMode.APPEND,
        );
        break;
      }
      default:
      // Java: assert false;
    }
  }

  /**
   * Given a port list sorted by net flow, this method computes a good split index. The split index splits the list of
   * ports in two halves, with the port at the split index being the start of the second half. That port is either the
   * first port with a positive net flow, the first port with a non-negative net flow, or the port at the center of the
   * list. What is will never be is the first port.
   *
   * @see PortRestorer.java:161
   */
  private computePortListSplitIndex(sortedPorts: SelfLoopPort[]): number {
    // Find index of the first port with a positive net flow
    let positiveNetFlowIndex = 0;
    for (; positiveNetFlowIndex < sortedPorts.length; positiveNetFlowIndex++) {
      if (sortedPorts[positiveNetFlowIndex]!.getSLNetFlow() > 0) {
        break;
      }
    }

    // If this is neither the first, nor the last port, return its index
    if (positiveNetFlowIndex > 0 && positiveNetFlowIndex < sortedPorts.length - 1) {
      return positiveNetFlowIndex;
    }

    // Find index of the first port with a non-negative net flow
    let nonNegativeNetFlowIndex = 0;
    for (; nonNegativeNetFlowIndex < sortedPorts.length; nonNegativeNetFlowIndex++) {
      if (sortedPorts[nonNegativeNetFlowIndex]!.getSLNetFlow() >= 0) {
        break;
      }
    }

    // If this is neither the first, nor the last port, return its index
    if (nonNegativeNetFlowIndex > 0 && nonNegativeNetFlowIndex < sortedPorts.length - 1) {
      return nonNegativeNetFlowIndex;
    }

    // We tried our best; simply return the center port's index
    return Math.trunc(sortedPorts.length / 2);
  }

  // Self Loop Placement (Two Sides)

  /** @see PortRestorer.java:195 */
  private processTwoSideCornerLoops(): void {
    for (const slLoop of this.loopsOfType(SelfLoopType.TWO_SIDES_CORNER)) {
      // Sort the port sides such that they follow a clockwise order
      const sides = PortRestorer.sortedTwoSideLoopPortSides(slLoop);

      // Add the ports to their target area
      this.addToTargetArea(slLoop, sides[0]!, PortSideArea.END, AddMode.PREPEND);
      this.addToTargetArea(slLoop, sides[1]!, PortSideArea.START, AddMode.APPEND);
    }
  }

  /** @see PortRestorer.java:206 */
  private processTwoSideOpposingLoops(): void {
    for (const slLoop of this.loopsOfType(SelfLoopType.TWO_SIDES_OPPOSING)) {
      // Sort the port sides such that they follow a clockwise order
      const sides = PortRestorer.sortedTwoSideLoopPortSides(slLoop);

      // We prepend to the start side's end area, and append to the target side's start area
      this.addToTargetArea(slLoop, sides[0]!, PortSideArea.END, AddMode.PREPEND);
      this.addToTargetArea(slLoop, sides[1]!, PortSideArea.START, AddMode.APPEND);
    }
  }

  /**
   * Returns the port sides spanned by a two-side self loop in a clockwise order. (Java `keySet().toArray(new PortSide[2])`
   * then `Arrays.sort`: the key set snapshot is sorted by ordinal; the `assert sides.length == 2` is omitted.)
   *
   * @see PortRestorer.java:220
   */
  static sortedTwoSideLoopPortSides(slLoop: SelfHyperLoop): PortSide[] {
    // Sort the port sides such that they follow a clockwise order
    const sides: PortSide[] = [...slLoop.getSLPortsBySide().keySet()];
    sides.sort((a, b) => a.compareTo(b));

    // NORTH and WEST are, of course, the exception and need to be switched...
    if (sides[0] === PortSide.NORTH && sides[1] === PortSide.WEST) {
      sides[0] = PortSide.WEST;
      sides[1] = PortSide.NORTH;
    }

    return sides;
  }

  // Self Loop Placement (Three Sides)

  /** @see PortRestorer.java:245 */
  private processThreeSideLoops(): void {
    for (const slLoop of this.loopsOfType(SelfLoopType.THREE_SIDES)) {
      // This array will yield the loop's start, middle, and end sides
      const sides = this.determineLoopConstellation(slLoop);

      // Prepend to the start area, append to the other areas
      this.addToTargetArea(slLoop, sides[0]!, PortSideArea.END, AddMode.PREPEND);
      this.addToTargetArea(slLoop, sides[1]!, PortSideArea.MIDDLE, AddMode.APPEND);
      this.addToTargetArea(slLoop, sides[2]!, PortSideArea.START, AddMode.APPEND);
    }
  }

  /** @see PortRestorer.java:257 */
  private determineLoopConstellation(slLoop: SelfHyperLoop): PortSide[] {
    const portSides = slLoop.getSLPortsBySide().keySet();

    if (!portSides.includes(PortSide.NORTH)) {
      return PortRestorer.ESW;
    } else if (!portSides.includes(PortSide.EAST)) {
      return PortRestorer.SWN;
    } else if (!portSides.includes(PortSide.SOUTH)) {
      return PortRestorer.WNE;
    } else if (!portSides.includes(PortSide.WEST)) {
      return PortRestorer.NES;
    } else {
      // Java: assert false; return null; (a three-sided loop lacks one side, so this arm is unreachable)
      return null as never;
    }
  }

  // Self Loop Placement (Four Sides)

  /** @see PortRestorer.java:277 */
  private processFourSideLoops(): void {
    for (const slLoop of this.loopsOfType(SelfLoopType.FOUR_SIDES)) {
      // Simply append to all port side's middle areas
      // Prepend to the start area, append to the other areas
      for (const side of slLoop.getSLPortsBySide().keySet()) {
        this.addToTargetArea(slLoop, side, PortSideArea.MIDDLE, AddMode.APPEND);
      }
    }
  }

  // Self Loop Placement (Utilities)

  /**
   * Adds ports of the given loop to one of our several target areas. (Java overload
   * `addToTargetArea(SelfHyperLoop, ...)`.)
   *
   * @see PortRestorer.java:303
   */
  private addToTargetArea(slLoop: SelfHyperLoop, portSide: PortSide, area: PortSideArea, addMode: AddMode): void {
    this.addPortsToTargetArea(slLoop.getSLPortsBySide(portSide), portSide, area, addMode);
  }

  /**
   * Adds a collection of ports to one of our several target areas. (Java overload
   * `addToTargetArea(Collection<SelfLoopPort>, ...)`, renamed because TypeScript cannot overload by parameter type.)
   *
   * @see PortRestorer.java:322
   */
  private addPortsToTargetArea(
    slPorts: Iterable<SelfLoopPort>,
    portSide: PortSide,
    area: PortSideArea,
    addMode: AddMode,
  ): void {
    // Gather those ports that are currently hidden (if they're not hidden, there's no point restoring them)
    const hiddenPorts: SelfLoopPort[] = [];
    for (const slPort of slPorts) {
      if (slPort.isHidden()) {
        hiddenPorts.push(slPort);
      }
    }

    hiddenPorts.reverse();
    const targetArea = this.targetAreas!.get(portSide, area)!;
    if (addMode === AddMode.PREPEND) {
      targetArea.splice(0, 0, ...hiddenPorts);
    } else {
      targetArea.push(...hiddenPorts);
    }
  }
}
