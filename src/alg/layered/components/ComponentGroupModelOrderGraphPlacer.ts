// SPDX-License-Identifier: EPL-2.0
import { KVector } from '../../../core/math/KVector.js';
import { CoreOptions } from '../../../core/options/CoreOptions.js';
import { EdgeRouting } from '../../../core/options/EdgeRouting.js';
import { PortSide } from '../../../core/options/PortSide.js';
import { ClassCastException } from '../../../java/lang/ClassCastException.js';
import type { LGraph } from '../graph/LGraph.js';
import { LayeredOptions } from '../options/LayeredOptions.js';
import type { ComponentGroup } from './ComponentGroup.js';
import { ComponentGroupGraphPlacer } from './ComponentGroupGraphPlacer.js';
import { ModelOrderComponentGroup } from './ModelOrderComponentGroup.js';

/** The running vectors of `combine` (Java locals of the same names). */
interface PlacementState {
  readonly spaceBlockedBySouthEdges: KVector;
  readonly spaceBlockedByComponents: KVector;
  readonly offset: KVector;
  readonly maxSize: KVector;
}

/**
 * A component group placer that keeps the model order of the components: groups are placed one below the other
 * (horizontal layout direction) or side by side (vertical), so that components connected to the same side do not hit
 * each other's edges.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupModelOrderGraphPlacer.java
 */
export class ComponentGroupModelOrderGraphPlacer extends ComponentGroupGraphPlacer {
  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupModelOrderGraphPlacer.java:38 */
  override combine(components: LGraph[], target: LGraph): void {
    this.componentGroups.length = 0;
    // Java line 40 'assert !components.contains(target)' is omitted (dev-only check)
    target.getLayerlessNodes().length = 0;

    // Check if there are any components to be placed
    if (components.length === 0) {
      target.getSize().x = 0;
      target.getSize().y = 0;
      return;
    }

    // Set the graph properties
    const firstComponent = components[0]!;
    target.copyProperties(firstComponent);

    // Construct component groups
    for (const component of components) {
      this.addComponent(component);
    }

    // Place components in each group
    const componentSpacing = firstComponent.getProperty(LayeredOptions.SPACING_COMPONENT_COMPONENT);
    const maxSize = this.placeModelOrderGroups(target, componentSpacing);

    // Set the graph's new size (the component group sizes include additional spacing
    // on the right and bottom sides which we need to subtract at this point)
    target.getSize().x = maxSize.x - componentSpacing;
    target.getSize().y = maxSize.y - componentSpacing;

    // if compaction is desired, do so! (the Java comment reads "do so!cing;")
    if (
      firstComponent.getProperty(LayeredOptions.COMPACTION_CONNECTED_COMPONENTS) &&
      // the compaction only supports orthogonally routed edges
      firstComponent.getProperty(LayeredOptions.EDGE_ROUTING) === EdgeRouting.ORTHOGONAL
    ) {
      // The block is a verbatim copy of the one in ComponentGroupGraphPlacer.java:112-135, here lines 124-147
      this.compactComponents(components, target, componentSpacing);
    }

    // finally move the components to the combined graph
    for (const group of this.componentGroups) {
      this.moveGraphs(target, group.getComponents(), 0, 0);
    }
  }

  /**
   * The group placement loop of `combine` (split out for the complexity limits). Returns the maximal size of the
   * placed groups.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupModelOrderGraphPlacer.java:59
   */
  private placeModelOrderGroups(target: LGraph, componentSpacing: number): KVector {
    const state: PlacementState = {
      spaceBlockedBySouthEdges: new KVector(),
      spaceBlockedByComponents: new KVector(),
      offset: new KVector(),
      maxSize: new KVector(),
    };

    // In horizontal mode the next component is placed below the last one.
    // If it has a connection to NORTH, it has to be placed at an x-coordinate to not hit the other components.
    // Otherwise will be placed as far WEST as possible without potentially hitting SOUTH edges.
    for (const group of this.componentGroups) {
      this.placeGroup(group, target, state, componentSpacing);
    }
    return state.maxSize;
  }

  /**
   * The body of the group loop of `combine` (split out for the complexity limits; Java order kept).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupModelOrderGraphPlacer.java:62-115
   */
  private placeGroup(group: ComponentGroup, target: LGraph, state: PlacementState, componentSpacing: number): void {
    const { spaceBlockedBySouthEdges, spaceBlockedByComponents, offset } = state;
    // Place the components
    if (target.getProperty(CoreOptions.DIRECTION).isHorizontal()) {
      offset.x = spaceBlockedBySouthEdges.x;
      if (ComponentGroupModelOrderGraphPlacer.anyPortSideContains(group, PortSide.NORTH)) {
        offset.x = spaceBlockedByComponents.x;
      }
    } else if (target.getProperty(CoreOptions.DIRECTION).isVertical()) {
      offset.y = spaceBlockedBySouthEdges.y;
      if (ComponentGroupModelOrderGraphPlacer.anyPortSideContains(group, PortSide.WEST)) {
        offset.y = spaceBlockedByComponents.y;
      }
    }

    // Java casts the group to ModelOrderComponentGroup here: it only selects the inherited overload
    const groupSize = this.placeComponents(group, componentSpacing);
    this.offsetGraphs(group.getComponents(), offset.x, offset.y);

    if (target.getProperty(CoreOptions.DIRECTION).isHorizontal()) {
      this.advanceHorizontally(group, groupSize, state);
    } else if (target.getProperty(CoreOptions.DIRECTION).isVertical()) {
      this.advanceVertically(group, groupSize, state);
    }
  }

  /**
   * The horizontal branch after the placement in the group loop of `combine`.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupModelOrderGraphPlacer.java:92-102
   */
  private advanceHorizontally(group: ComponentGroup, groupSize: KVector, state: PlacementState): void {
    const { spaceBlockedBySouthEdges, spaceBlockedByComponents, offset, maxSize } = state;
    spaceBlockedByComponents.x = offset.x + groupSize.x;
    maxSize.x = Math.max(maxSize.x, spaceBlockedByComponents.x);
    if (ComponentGroupModelOrderGraphPlacer.anyPortSideContains(group, PortSide.SOUTH)) {
      spaceBlockedBySouthEdges.x = offset.x + groupSize.x;
    }
    spaceBlockedByComponents.y = offset.y + groupSize.y;
    offset.y = spaceBlockedByComponents.y;
    maxSize.y = Math.max(maxSize.y, offset.y);
  }

  /**
   * The vertical branch after the placement in the group loop of `combine`.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupModelOrderGraphPlacer.java:103-114
   */
  private advanceVertically(group: ComponentGroup, groupSize: KVector, state: PlacementState): void {
    const { spaceBlockedBySouthEdges, spaceBlockedByComponents, offset, maxSize } = state;
    spaceBlockedByComponents.y = offset.y + groupSize.y;
    maxSize.y = Math.max(maxSize.y, spaceBlockedByComponents.y);
    if (ComponentGroupModelOrderGraphPlacer.anyPortSideContains(group, PortSide.EAST)) {
      spaceBlockedBySouthEdges.y = offset.y + groupSize.y;
    }
    spaceBlockedByComponents.x = offset.x + groupSize.x;
    offset.x = spaceBlockedByComponents.x;
    maxSize.x = Math.max(maxSize.x, offset.x);
  }

  /**
   * The Java loops `for (Set<PortSide> side : group.getPortSides()) { if (side.contains(X)) { ...; break; } }`: the
   * body is the same assignment whichever key matches, so the iteration order of `getPortSides()` (a hash-ordered
   * `Multimap.keys()`) does not matter (AD-10).
   */
  private static anyPortSideContains(group: ComponentGroup, side: PortSide): boolean {
    for (const sides of group.getPortSides()) {
      if (sides.contains(side)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Adds the component to the last group if it fits there, or to a new group.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroupModelOrderGraphPlacer.java:162
   */
  protected override addComponent(component: LGraph): void {
    // Check if one of the existing component groups has some place left
    if (this.componentGroups.length > 0) {
      const group = this.componentGroups[this.componentGroups.length - 1];
      if (!(group instanceof ModelOrderComponentGroup)) {
        throw new ClassCastException('The last component group is not a ModelOrderComponentGroup');
      }
      if (group.add(component)) {
        return;
      }
    }

    // Create a new component group for the component
    this.componentGroups.push(new ModelOrderComponentGroup(component));
  }
}
