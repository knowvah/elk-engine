// SPDX-License-Identifier: EPL-2.0
import type { ElkPort } from '../../../graph/ElkPort.js';
import * as DoubleCompare from '../../../java/lang/DoubleCompare.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { CoreOptions } from '../../options/CoreOptions.js';
import { PortSide } from '../../options/PortSide.js';

/**
 * A comparator for ports. Ports are sorted by side (north, east, south, west) in clockwise order,
 * beginning at the top left corner.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/adapters/ElkGraphAdapters.java
 */
export class PortComparator {
  /** Java `Comparator<ElkPort>.compare`. */
  compare(port1: ElkPort, port2: ElkPort): number {
    const ordinalDifference =
      port1.getProperty(CoreOptions.PORT_SIDE).ordinal() - port2.getProperty(CoreOptions.PORT_SIDE).ordinal();

    // Sort by side first
    if (ordinalDifference !== 0) {
      return ordinalDifference;
    }

    // In case of equal sides, sort by port index property
    const index1 = port1.getProperty(CoreOptions.PORT_INDEX) as number | null;
    const index2 = port2.getProperty(CoreOptions.PORT_INDEX) as number | null;
    if (index1 !== null && index2 !== null) {
      const indexDifference = index1 - index2;
      if (indexDifference !== 0) {
        return indexDifference;
      }
    }

    // In case of equal index, sort by position
    return PortComparator.compareByPosition(port1, port2);
  }

  private static compareByPosition(port1: ElkPort, port2: ElkPort): number {
    switch (port1.getProperty(CoreOptions.PORT_SIDE)) {
      case PortSide.NORTH:
        // Compare x coordinates
        return DoubleCompare.compare(port1.getX(), port2.getX());

      case PortSide.EAST:
        // Compare y coordinates
        return DoubleCompare.compare(port1.getY(), port2.getY());

      case PortSide.SOUTH:
        // Compare x coordinates in reversed order
        return DoubleCompare.compare(port2.getX(), port1.getX());

      case PortSide.WEST:
        // Compare y coordinates in reversed order
        return DoubleCompare.compare(port2.getY(), port1.getY());

      default:
        // Port sides should not be undefined
        throw new IllegalStateException('Port side is undefined');
    }
  }
}
