// SPDX-License-Identifier: EPL-2.0
import { PortSide } from '../../../../../core/options/PortSide.js';
import { devAssert } from '../../../../../java/lang/DevAssert.js';
import { InternalProperties } from '../../../options/InternalProperties.js';
import { LayeredOptions } from '../../../options/LayeredOptions.js';
import { SelfLoopDistributionStrategy } from '../../../options/SelfLoopDistributionStrategy.js';
import type { SelfHyperLoop } from '../SelfHyperLoop.js';
import type { SelfLoopHolder } from '../SelfLoopHolder.js';
import type { SelfLoopPort } from '../SelfLoopPort.js';
import { Target } from './PortSideAssignerTarget.js';

/**
 * Assigns free self loop ports to the northern or southern port side. How this is done exactly depends on the
 * {@link LayeredOptions.EDGE_ROUTING_SELF_LOOP_DISTRIBUTION self loop distribution strategy}. All this class will do is
 * assign port sides to hidden self loop ports. It will not make them visible again.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/loops/ordering/PortSideAssigner.java
 */
export class PortSideAssigner {
  /**
   * Assigns port sides to all hidden ports subject to the self loop distribution strategy. (Java's `assert`s at the
   * start and the end, and the `default: assert false` arm, are `devAssert` calls.)
   *
   * @see PortSideAssigner.java:39
   */
  assignPortSides(slHolder: SelfLoopHolder): void {
    devAssert(() => !slHolder.getLNode().getProperty(InternalProperties.ORIGINAL_PORT_CONSTRAINTS).isSideFixed());

    switch (slHolder.getLNode().getProperty(LayeredOptions.EDGE_ROUTING_SELF_LOOP_DISTRIBUTION)) {
      case SelfLoopDistributionStrategy.NORTH:
        this.assignToNorthSide(slHolder);
        break;

      case SelfLoopDistributionStrategy.NORTH_SOUTH:
        this.assignToNorthOrSouthSide(slHolder);
        break;

      case SelfLoopDistributionStrategy.EQUALLY:
        this.assignToAllSides(slHolder);
        break;

      default:
        devAssert(() => false);
    }

    devAssert(() => [...slHolder.getSLPortMap().keys()].every((lPort) => lPort.getSide() !== PortSide.UNDEFINED));
  }

  // North

  /**
   * Assigns all self loops to the northern side. The Java stream pipeline (`flatMap`, `map`, `forEach`) is a nested loop.
   *
   * @see PortSideAssigner.java:68
   */
  private assignToNorthSide(slHolder: SelfLoopHolder): void {
    for (const slLoop of slHolder.getSLHyperLoops()) {
      for (const slPort of this.hiddenSelfLoopPortStream(slLoop)) {
        slPort.getLPort().setSide(PortSide.NORTH);
      }
    }
  }

  // North, South

  /**
   * Distributes all self loops to the northern or southern sides.
   *
   * @see PortSideAssigner.java:81
   */
  private assignToNorthOrSouthSide(slHolder: SelfLoopHolder): void {
    // Self loops can consist of more than two ports. Instead of simply assigning an equal number of self loops to
    // both sides, we'd rather end up with a similar number of ports on both sides. This is what we're trying to
    // to here. If one side falls behind, we fill that up with ports until the other falls behind. Beware: greedy
    // algorithm ahead!
    let northPorts = 0;
    let southPorts = 0;

    for (const slLoop of slHolder.getSLHyperLoops()) {
      const slHiddenPorts = this.hiddenSelfLoopPortStream(slLoop);

      // Decide on a port side
      let newPortSide: PortSide | null = null;
      if (northPorts <= southPorts) {
        newPortSide = PortSide.NORTH;
        northPorts += slHiddenPorts.length;
      } else if (southPorts < northPorts) {
        newPortSide = PortSide.SOUTH;
        southPorts += slHiddenPorts.length;
      }

      // Assign the ports (Java `setSide(null)` throws NullPointerException, a TypeError here: unreachable, the two
      // conditions above are exhaustive)
      for (const slPort of slHiddenPorts) {
        slPort.getLPort().setSide(newPortSide as PortSide);
      }
    }
  }

  // Equal Distribution

  /**
   * Distributes self loops to all sides.
   *
   * @see PortSideAssigner.java:148
   */
  private assignToAllSides(slHolder: SelfLoopHolder): void {
    // Obtain a list of self hyper loops, ordered descendingly by the number of involved ports. This will later tend
    // to place hyper loops with many ports not across corners, but on a single side
    const slSortedLoops: SelfHyperLoop[] = [...slHolder.getSLHyperLoops()];
    slSortedLoops.sort((slLoop1, slLoop2) => slLoop2.getSLPorts().length - slLoop1.getSLPorts().length);

    // Iterate over our self loops and assign each to the next target
    const assignmentTargets = Target.values();
    let currLoop = 0;

    for (const slLoop of slSortedLoops) {
      const currTarget = assignmentTargets[currLoop % assignmentTargets.length]!;
      this.assignToTarget(slLoop, currTarget);

      currLoop++;
    }
  }

  /**
   * Assigns the given self loop to the given target.
   *
   * @see PortSideAssigner.java:170
   */
  private assignToTarget(slLoop: SelfHyperLoop, target: Target): void {
    // Gather the self loop's ports
    const slPorts = slLoop.getSLPorts();

    // If this is a corner target, we sort the list of ports by net flow: ports with more outgoing edges should end
    // up at the first side, while ports with more incoming edges should end up on the second side. This is an
    // attempt to have most edges point clockwise. If this is not a corner target, all ports will end up on the
    // same side anyway, so there's no need for us to sort anything
    if (target.isCornerTarget()) {
      // This will sort the port's original list, but that's okay since it doesn't have any particular order
      // prior to running the PortRestorer
      slPorts.sort((slPort1, slPort2) => slPort1.getLPort().getNetFlow() - slPort2.getLPort().getNetFlow());
    }

    // Assign the first half of the ports to the first side, and the second half to the second side. However, only
    // assign ports that have been hidden and can thus be freely assigned to a side. This could be done way more
    // intelligently, but hopefully bad cases won't be common enough to warrant more effort here.
    const secondHalfStartIndex = Math.trunc(slPorts.length / 2);

    for (let i = 0; i < secondHalfStartIndex; i++) {
      const slPort = slPorts[i]!;
      if (slPort.isHidden()) {
        slPort.getLPort().setSide(target.firstSide);
      }
    }

    for (let i = secondHalfStartIndex; i < slPorts.length; i++) {
      const slPort = slPorts[i]!;
      if (slPort.isHidden()) {
        slPort.getLPort().setSide(target.secondSide);
      }
    }
  }

  // Utilities

  /** The hidden ports of the loop (a Java `Stream`, materialized as an array). @see PortSideAssigner.java:209 */
  private hiddenSelfLoopPortStream(slLoop: SelfHyperLoop): SelfLoopPort[] {
    return slLoop.getSLPorts().filter((slPort) => slPort.isHidden());
  }
}
