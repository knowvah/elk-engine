// SPDX-License-Identifier: EPL-2.0
import type { ILayoutProcessor } from '../../../core/alg/ILayoutProcessor.js';
import { PortConstraints } from '../../../core/options/PortConstraints.js';
import { PortSide } from '../../../core/options/PortSide.js';
import type { IElkProgressMonitor } from '../../../core/util/IElkProgressMonitor.js';
import { Pair } from '../../../core/util/Pair.js';
import { compare as doubleCompare } from '../../../java/lang/DoubleCompare.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import * as Int32 from '../../../java/lang/Int32.js';
import type { LEdge } from '../graph/LEdge.js';
import type { LGraph } from '../graph/LGraph.js';
import type { LPort } from '../graph/LPort.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import { PortSortingStrategy } from '../options/PortSortingStrategy.js';

/** A Java `Comparator<LPort>`. */
type PortComparator = (p1: LPort, p2: LPort) => number;

/** A Java `Function<LPort, Iterable<LEdge>>`. */
type PortEdgesFunction = (p: LPort) => Iterable<LEdge>;

/**
 * Sorts the port lists of nodes with fixed port orders or fixed port positions. The node's list of ports is sorted
 * beginning at the leftmost northern port, going clockwise. This order of ports may be used during crossing
 * minimization for calculating port ranks.
 *
 * In case of `PortConstraints.FIXED_SIDE` the ports are order by side according to the order north - east - south -
 * west (and depending on the value of the `PortSortingStrategy` layout option). In case of
 * `PortConstraints.FIXED_ORDER` the side and `LayeredOptions.PORT_INDEX` are used if specified. Otherwise the order is
 * inferred from specified port positions. For `PortConstraints.FIXED_POS` solely the position of the ports determines
 * the order.
 *
 * Precondition: a layered graph. Postcondition: the port lists of nodes are sorted. Slots: before phase 3. Same-slot
 * dependencies: `NorthSouthPortPreprocessor`.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/PortListSorter.java
 */
export class PortListSorter implements ILayoutProcessor<LGraph> {
  process(layeredGraph: LGraph, monitor: IElkProgressMonitor): void {
    monitor.begin('Port order processing', 1);

    const pss = layeredGraph.getProperty(LayeredOptions.PORT_SORTING_STRATEGY);

    // Iterate through the nodes of all layers
    for (const layer of layeredGraph) {
      for (const node of layer) {
        const portConstraints = node.getProperty(LayeredOptions.PORT_CONSTRAINTS);
        const ports = node.getPorts();

        // We need to sort the port list according to port constraints
        if (portConstraints.isOrderFixed()) {
          // Collections.sort: in place, stable
          ports.sort(PortListSorter.CMP_COMBINED);
        } else if (portConstraints.isSideFixed()) {
          // by default try to preserve the input order
          ports.sort(PortListSorter.CMP_PORT_SIDE);
          this.#reverseWestAndSouthSide(ports);

          if (pss === PortSortingStrategy.PORT_DEGREE) {
            ports.sort(PortListSorter.CMP_PORT_DEGREE_EAST_WEST);
          }
        }
        node.cachePortSides();
      }
    }

    monitor.done();
  }

  #reverseWestAndSouthSide(ports: LPort[]): void {
    if (ports.length <= 1) {
      return;
    }

    const southIndices = this.#findPortSideRange(ports, PortSide.SOUTH);
    this.#reverse(ports, southIndices.getFirst()!, southIndices.getSecond()!);

    const westIndices = this.#findPortSideRange(ports, PortSide.WEST);
    this.#reverse(ports, westIndices.getFirst()!, westIndices.getSecond()!);
  }

  /**
   * Identifies indices `[i, j)` for the _pre-sorted_ list `ports` such that `i` is the first index of a port on the
   * given `side` and `j` is either an index of a port of a different side or equal to the list's size. If no ports are
   * on the given side, `i` and `j` will be equal.
   */
  #findPortSideRange(ports: LPort[], side: PortSide): Pair<number, number> {
    if (ports.length === 0) {
      return Pair.of(0, 0);
    }

    let currentSide = ports[0]!.getSide();
    let lowIdx = 0;
    const lb = side.ordinal();
    const hb = side.ordinal() + 1;

    while (lowIdx < ports.length - 1 && currentSide.ordinal() < lb) {
      lowIdx++;
      currentSide = ports[lowIdx]!.getSide();
    }
    let highIdx = lowIdx;
    while (highIdx < ports.length - 1 && currentSide.ordinal() < hb) {
      highIdx++;
      currentSide = ports[lowIdx]!.getSide();
    }

    return Pair.of(lowIdx, highIdx);
  }

  /**
   * Reverses the `ports` list between `lowerIdx` (inclusive) and `higherIdx` (exclusive). That is, given a sequence
   * `p_0, ..., p_i, ..., p_j, ..., p_n`, where `i` and `j` are the low and high index, respectively, the method alters
   * the list to `p_0, ..., p_j, p_{j-1}, ..., p_{i+1}, p_i, ..., p_n`.
   */
  #reverse(ports: LPort[], lowIdx: number, highIdx: number): void {
    if (highIdx <= lowIdx + 2) {
      return;
    }
    const n = Int32.div(highIdx - lowIdx, 2);
    for (let i = 0; i < n; ++i) {
      const tmp = ports[lowIdx + i]!;
      ports[lowIdx + i] = ports[highIdx - i - 1]!;
      ports[highIdx - i - 1] = tmp;
    }
  }

  static readonly #IN_EDGES: PortEdgesFunction = (p) => p.getIncomingEdges();
  static readonly #OUT_EDGES: PortEdgesFunction = (p) => p.getOutgoingEdges();

  /**
   * Comparator for sorting a node's ports according to the `PortSide`: north - east - south - west. The order for the
   * individual sides is not affected by this comparator. It can, however, be combined with other comparators.
   */
  static readonly CMP_PORT_SIDE: PortComparator = (p1, p2) => {
    // Sort by side first (if the comparison ends here, the ports were on different sides;
    // otherwise, the ports must be on the same side)
    const ordinalDifference = p1.getSide().ordinal() - p2.getSide().ordinal();
    if (ordinalDifference !== 0) {
      return ordinalDifference;
    }

    return 0;
  };

  /**
   * Comparator for sorting a node's ports such that on each the `PortSide.EAST` side ports are further separated based
   * on their out-degree (in the original input graph that is), and on the `PortSide.WEST` side based on their
   * in-degree. The comparator assumes that the ports are pre-sorted according to their sides (e.g. by using
   * `CMP_PORT_SIDE`).
   */
  static readonly CMP_PORT_DEGREE_EAST_WEST: PortComparator = (p1, p2) => {
    const ordinalDifference = p1.getSide().ordinal() - p2.getSide().ordinal();
    if (ordinalDifference !== 0) {
      return 0; // ports on different sides -- not our job
    }

    switch (p1.getSide()) {
      case PortSide.EAST:
        return (
          PortListSorter.#realDegree(p2, PortListSorter.#OUT_EDGES) -
          PortListSorter.#realDegree(p1, PortListSorter.#OUT_EDGES)
        );

      case PortSide.WEST:
        return (
          PortListSorter.#realDegree(p1, PortListSorter.#IN_EDGES) -
          PortListSorter.#realDegree(p2, PortListSorter.#IN_EDGES)
        );
    }

    return 0;
  };

  static #realDegree(p: LPort, edgesFun: PortEdgesFunction): number {
    let realDegree = 0;
    for (const e of edgesFun(p)) {
      if (!e.getProperty(InternalProperties.REVERSED)) {
        realDegree++;
      }
    }
    return realDegree;
  }

  /**
   * Comparator that handles the order of ports that lie on the same side when `PortConstraints` are
   * `PortConstraints.FIXED_ORDER` or `PortConstraints.FIXED_POS`. Note: The comparator exports the collection of ports
   * to be sorted according to their sides, which can be achieved by using `CMP_PORT_SIDE`.
   */
  static readonly CMP_FIXED_ORDER_AND_FIXED_POS: PortComparator = (p1, p2) => {
    const portConstraints = p1.getNode()!.getProperty(LayeredOptions.PORT_CONSTRAINTS);

    // Do nothing if not at least the port order is fixed or the ports are on different sides
    const ordinalDifference = p1.getSide().ordinal() - p2.getSide().ordinal();
    if (ordinalDifference !== 0 || !portConstraints.isOrderFixed()) {
      return 0;
    }

    // If the ports are on the same side and the node has FIXED_ORDER port constraints (that is,
    // the coordinates of the ports don't necessarily make sense), we check if the port index
    // has been explicitly set
    if (portConstraints === PortConstraints.FIXED_ORDER) {
      const indexDifference = PortListSorter.#compareByPortIndex(p1, p2);
      if (indexDifference !== 0) {
        return indexDifference;
      }
    }

    // In case of equal index (or FIXED_POS), sort by position
    return PortListSorter.#compareByPosition(p1, p2);
  };

  /** The `PORT_INDEX` block of `CMP_FIXED_ORDER_AND_FIXED_POS`: the index difference, 0 if unset or equal. */
  static #compareByPortIndex(p1: LPort, p2: LPort): number {
    // In case of equal sides, sort by port index property
    const index1 = p1.getProperty(LayeredOptions.PORT_INDEX) as number | null;
    const index2 = p2.getProperty(LayeredOptions.PORT_INDEX) as number | null;
    if (index1 !== null && index2 !== null) {
      return Int32.sub(index1, index2);
    }
    return 0;
  }

  /** The position switch of `CMP_FIXED_ORDER_AND_FIXED_POS`. */
  static #compareByPosition(p1: LPort, p2: LPort): number {
    switch (p1.getSide()) {
      case PortSide.NORTH:
        // Compare x coordinates
        return doubleCompare(p1.getPosition().x, p2.getPosition().x);

      case PortSide.EAST:
        // Compare y coordinates
        return doubleCompare(p1.getPosition().y, p2.getPosition().y);

      case PortSide.SOUTH:
        // Compare x coordinates in reversed order
        return doubleCompare(p2.getPosition().x, p1.getPosition().x);

      case PortSide.WEST:
        // Compare y coordinates in reversed order
        return doubleCompare(p2.getPosition().y, p1.getPosition().y);

      default:
        // Port sides should not be undefined
        throw new IllegalStateException('Port side is undefined');
    }
  }

  /**
   * Combination of `CMP_PORT_SIDE` and `CMP_FIXED_ORDER_AND_FIXED_POS`. Should be the go to comparator outside of the
   * `PortListSorter`. (Java: `CMP_PORT_SIDE.thenComparing(CMP_FIXED_ORDER_AND_FIXED_POS)`.)
   */
  static readonly CMP_COMBINED: PortComparator = (p1, p2) => {
    const result = PortListSorter.CMP_PORT_SIDE(p1, p2);
    return result !== 0 ? result : PortListSorter.CMP_FIXED_ORDER_AND_FIXED_POS(p1, p2);
  };
}
