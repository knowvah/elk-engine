// SPDX-License-Identifier: EPL-2.0
import * as DoubleCompare from '../../../java/lang/DoubleCompare.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { LPort } from './LPort.js';

/**
 * A comparer for ports. Ports are sorted by side (north, east, south, west) in clockwise order, beginning at the top
 * left corner.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LGraphAdapters.java
 */
export class PortComparator {
  /** Java `Comparator<LPort>.compare`. */
  compare(port1: LPort, port2: LPort): number {
    const ordinalDifference = port1.getSide().ordinal() - port2.getSide().ordinal();

    // Sort by side first
    if (ordinalDifference !== 0) {
      return ordinalDifference;
    }

    // In case of equal sides, sort by port index property
    const index1 = port1.getProperty(LayeredOptions.PORT_INDEX) as number | null;
    const index2 = port2.getProperty(LayeredOptions.PORT_INDEX) as number | null;
    if (index1 !== null && index2 !== null) {
      const indexDifference = index1 - index2;
      if (indexDifference !== 0) {
        return indexDifference;
      }
    }

    // In case of equal index, sort by position
    return PortComparator.compareByPosition(port1, port2);
  }

  /** The `switch` of the Java `compare` (split out for the complexity limit). */
  private static compareByPosition(port1: LPort, port2: LPort): number {
    switch (port1.getSide()) {
      case PortSide.NORTH:
        // Compare x coordinates
        return DoubleCompare.compare(port1.getPosition().x, port2.getPosition().x);

      case PortSide.EAST:
        // Compare y coordinates
        return DoubleCompare.compare(port1.getPosition().y, port2.getPosition().y);

      case PortSide.SOUTH:
        // Compare x coordinates in reversed order
        return DoubleCompare.compare(port2.getPosition().x, port1.getPosition().x);

      case PortSide.WEST:
        // Compare y coordinates in reversed order
        return DoubleCompare.compare(port2.getPosition().y, port1.getPosition().y);

      default:
        // Port sides should not be undefined
        throw new IllegalStateException('Port side is undefined');
    }
  }
}

/**
 * A comparer for ports. Ports are sorted by side (north, east, south, west) in clockwise order, beginning at the top
 * left corner. (Java: `LGraphAdapters.DEFAULT_PORTLIST_SORTER`; defined here so that the node adapter need not
 * import the facade.)
 */
export const DEFAULT_PORTLIST_SORTER: PortComparator = new PortComparator();
