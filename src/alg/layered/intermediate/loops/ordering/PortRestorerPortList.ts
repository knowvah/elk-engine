// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../../core/options/PortSide.js';
import type { Table } from '../../../../../guava/Table.js';
import { devAssert } from '../../../../../java/lang/DevAssert.js';
import { EnumSet } from '../../../../../java/util/EnumSet.js';
import type { LNode } from '../../../graph/LNode.js';
import type { LPort } from '../../../graph/LPort.js';
import { InternalProperties } from '../../../options/InternalProperties.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { PortSideArea } from './PortRestorerPortSideArea.js';

/** A Java `Predicate<LPort>`. */
type LPortPredicate = (lPort: LPort) => boolean;

/**
 * The "Port Restoring" section of `PortRestorer` (`PortRestorer.java:339-482`), split into its own file by the 500-line
 * limit: it merges the target areas into the node's port list. `PortRestorer` creates one instance per
 * `restorePorts` call, holding the target-area table (the Java field `targetAreas`).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/ordering/PortRestorer.java
 */
export class PortRestorerPortList {
  constructor(private readonly targetAreas: Table<PortSide, PortSideArea, SelfLoopPort[]>) {}

  /**
   * Builds the node's new port list from the target areas and the old ports. (Java private overload
   * `restorePorts(SelfLoopHolder)`, renamed because the public overload shares its name; the Java `assert`s at the end
   * are `devAssert` calls.)
   *
   * @see PortRestorer.java:342
   */
  restorePortList(slHolder: SelfLoopHolder): void {
    // We're building up a new port list and replace the old one once we're finished. That's more efficient than
    // continually inserting ports into the middle of the existing list.
    const lNode = slHolder.getLNode();

    // We'll add the old ports in bursts and always remember where the next burst starts
    const oldPortList: LPort[] = [...lNode.getPorts()];
    let nextOldPortIndex = 0;

    const newPortList = lNode.getPorts();
    newPortList.length = 0;

    // Go over the target areas and add them in between the regular ports
    nextOldPortIndex = this.restoreNorthPorts(lNode, oldPortList, nextOldPortIndex, newPortList);
    nextOldPortIndex = this.restoreEastPorts(lNode, oldPortList, nextOldPortIndex, newPortList);
    nextOldPortIndex = this.restoreSouthPorts(lNode, oldPortList, nextOldPortIndex, newPortList);
    this.restoreWestPorts(lNode, oldPortList, nextOldPortIndex, newPortList);

    devAssert(() => newPortList.length >= oldPortList.length && newPortList.length >= slHolder.getSLPortMap().size);
    devAssert(() => !slHolder.arePortsHidden() || newPortList.length > oldPortList.length);
  }

  /** The north block of {@link restorePortList} (Java lines 353-368). */
  private restoreNorthPorts(lNode: LNode, oldPortList: LPort[], from: number, newPortList: LPort[]): number {
    let next = from;
    this.addAll(this.targetAreas.get(PortSide.NORTH, PortSideArea.START)!, lNode);
    next = this.addAllThat(
      oldPortList,
      next,
      (lPort) => lPort.getSide() === PortSide.NORTH && this.isNorthSouthPortWithWestOrWestEastConnections(lPort),
      newPortList,
    );
    this.addAll(this.targetAreas.get(PortSide.NORTH, PortSideArea.MIDDLE)!, lNode);
    next = this.addAllThat(oldPortList, next, (lPort) => lPort.getSide() === PortSide.NORTH, newPortList);
    this.addAll(this.targetAreas.get(PortSide.NORTH, PortSideArea.END)!, lNode);
    return next;
  }

  /** The east block of {@link restorePortList} (Java lines 370-378). */
  private restoreEastPorts(lNode: LNode, oldPortList: LPort[], from: number, newPortList: LPort[]): number {
    this.addAll(this.targetAreas.get(PortSide.EAST, PortSideArea.START)!, lNode);
    this.addAll(this.targetAreas.get(PortSide.EAST, PortSideArea.MIDDLE)!, lNode);
    const next = this.addAllThat(oldPortList, from, (lPort) => lPort.getSide() === PortSide.EAST, newPortList);
    this.addAll(this.targetAreas.get(PortSide.EAST, PortSideArea.END)!, lNode);
    return next;
  }

  /** The south block of {@link restorePortList} (Java lines 380-396). */
  private restoreSouthPorts(lNode: LNode, oldPortList: LPort[], from: number, newPortList: LPort[]): number {
    let next = from;
    this.addAll(this.targetAreas.get(PortSide.SOUTH, PortSideArea.START)!, lNode);
    next = this.addAllThat(
      oldPortList,
      next,
      (lPort) => lPort.getSide() === PortSide.SOUTH && this.isNorthSouthPortWithEastConnections(lPort),
      newPortList,
    );
    this.addAll(this.targetAreas.get(PortSide.SOUTH, PortSideArea.MIDDLE)!, lNode);
    next = this.addAllThat(oldPortList, next, (lPort) => lPort.getSide() === PortSide.SOUTH, newPortList);
    this.addAll(this.targetAreas.get(PortSide.SOUTH, PortSideArea.END)!, lNode);
    return next;
  }

  /** The west block of {@link restorePortList} (Java lines 398-406); its final index is unused, as in Java. */
  private restoreWestPorts(lNode: LNode, oldPortList: LPort[], from: number, newPortList: LPort[]): void {
    this.addAll(this.targetAreas.get(PortSide.WEST, PortSideArea.START)!, lNode);
    this.addAllThat(oldPortList, from, (lPort) => lPort.getSide() === PortSide.WEST, newPortList);
    this.addAll(this.targetAreas.get(PortSide.WEST, PortSideArea.MIDDLE)!, lNode);
    this.addAll(this.targetAreas.get(PortSide.WEST, PortSideArea.END)!, lNode);
  }

  /**
   * Adds the {@link LPort}s of all of the {@link SelfLoopPort}s to the given node. It does so by calling
   * {@link LPort.setNode}, which will automatically add them to the node's port list.
   *
   * @see PortRestorer.java:409
   */
  private addAll(slPorts: SelfLoopPort[], lNode: LNode): void {
    for (const slPort of slPorts) {
      slPort.getLPort().setNode(lNode);
    }
  }

  /**
   * Adds all ports from the list to the target list that satisfy the given predicate. This method starts at a given
   * index and does its thing until it finds the first port that does not satisfy the predicate anymore. That port's
   * index is then returned and can be used as the next start index.
   *
   * @returns index of the first port that does not satisfy the predicate.
   * @see PortRestorer.java:430
   */
  private addAllThat(lPorts: LPort[], fromIndex: number, condition: LPortPredicate, target: LPort[]): number {
    for (let i = fromIndex; i < lPorts.length; i++) {
      // If this port is valid, add it to the list
      const lPort = lPorts[i]!;

      if (condition(lPort)) {
        target.push(lPort);
      } else {
        return i;
      }
    }

    return lPorts.length;
  }

  /**
   * Checks whether the given port is a north / south port that has connections to the west, with optional additional
   * connections to the east. (Java returns `westConnections || (westConnections && eastConnections)`, which is
   * `westConnections`: collapsed per the CodeQL rule; the side-effect-free `contains(EAST)` is dropped with it.)
   *
   * @see PortRestorer.java:451
   */
  private isNorthSouthPortWithWestOrWestEastConnections(lPort: LPort): boolean {
    const connections = this.northSouthPortConnectionSides(lPort);
    const westConnections = connections.contains(PortSide.WEST);

    return westConnections;
  }

  /**
   * Checks whether the given port is a north / south port that only has connections to the east.
   *
   * @see PortRestorer.java:462
   */
  private isNorthSouthPortWithEastConnections(lPort: LPort): boolean {
    const connections = this.northSouthPortConnectionSides(lPort);
    return connections.contains(PortSide.EAST);
  }

  /**
   * Gathers the sides to which the given north / south port has connections. (Java `EnumSet`: the landed shim; only
   * `contains` reads it, AD-10 row.)
   *
   * @see PortRestorer.java:470
   */
  private northSouthPortConnectionSides(lPort: LPort): EnumSet<PortSide> {
    const connectionSides = EnumSet.noneOf(PortSide);

    const portDummy = lPort.getProperty(InternalProperties.PORT_DUMMY);
    if (portDummy !== null && portDummy !== undefined) {
      for (const dummyLPort of portDummy.getPorts()) {
        if (dummyLPort.getProperty(InternalProperties.ORIGIN) === lPort) {
          // This dummy port was indeed created for our original port
          if (dummyLPort.getConnectedEdges()[Symbol.iterator]().next().done !== true) {
            // The port has incident edges!
            connectionSides.add(dummyLPort.getSide());
          }
        }
      }
    }

    return connectionSides;
  }
}
