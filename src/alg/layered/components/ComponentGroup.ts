// SPDX-License-Identifier: EPL-2.0
import type { PortSide } from '../../../core/options/PortSide.js';
import type { ValueCollection } from '../../../guava/Multimap.js';
import { ArrayListMultimap } from '../../../guava/ArrayListMultimap.js';
import { identity } from '../../../java/util/HashStrategy.js';
import type { EnumSet } from '../../../java/util/EnumSet.js';
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { COMPONENT_GROUP_CONSTRAINT_ROWS } from './ComponentGroupConstraintRows.js';
import {
  buildConstraintTable,
  constraintsFor,
  SIDE_SET_STRATEGY,
  toSideSet,
  type ConstraintTable,
  type PortSideSet,
} from './ComponentGroupSides.js';

/**
 * A component group is a set of connected components that can be placed in a single group, because their external port
 * connections do not conflict. Used by the component group placers.
 *
 * @author cds
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroup.java
 */
export class ComponentGroup {
  static #CONSTRAINTS: ConstraintTable | undefined;

  /**
   * External port connection constraints: the key may not share a group with any of its values. Java builds the
   * `HashMultimap` in a static initializer and only calls `get` on it (F11), so this is a lookup table built on first use
   * (F10).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroup.java:96
   */
  protected static get CONSTRAINTS(): ConstraintTable {
    return (ComponentGroup.#CONSTRAINTS ??= buildConstraintTable(COMPONENT_GROUP_CONSTRAINT_ROWS));
  }

  /** The components of the group by the external port sides they connect to (insertion order per key). */
  protected components: ArrayListMultimap<EnumSet<PortSide>, LGraph> = ArrayListMultimap.create(
    SIDE_SET_STRATEGY,
    identity<LGraph>(),
  );

  /**
   * Creates a component group, empty or with the given component.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroup.java:191
   */
  constructor(component?: LGraph) {
    if (component !== undefined) {
      this.add(component);
    }
  }

  /**
   * Adds the given component to this group if it is compatible with the components already in there.
   *
   * @return `true` if the component was added, `false` otherwise
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroup.java:217
   */
  add(component: LGraph): boolean {
    if (this.canAdd(component)) {
      this.components.put(component.getProperty(InternalProperties.EXT_PORT_CONNECTIONS), component);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Checks whether the given component can be added to this group.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroup.java:235
   */
  protected canAdd(component: LGraph): boolean {
    // Check if we have a component with incompatible external port sides
    const candidateSides = component.getProperty(InternalProperties.EXT_PORT_CONNECTIONS);
    const constraints = constraintsFor(ComponentGroup.CONSTRAINTS, candidateSides);

    for (const constraint of constraints) {
      if (!this.components.get(constraint).isEmpty()) {
        // A component with a conflicting external port side combination exists
        return false;
      }
    }

    // We haven't found any conflicting components
    return true;
  }

  /**
   * Returns the external port side combinations of the components in this group, one entry per component (Guava
   * `Multimap.keys()`, a multiset); callers only search it for a side.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroup.java:256
   */
  getPortSides(): EnumSet<PortSide>[] {
    return this.components.keys();
  }

  /**
   * Returns all components of this group, or only the ones with the given external port side combination.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentGroup.java:265
   */
  getComponents(): LGraph[];
  getComponents(connections: PortSideSet): ValueCollection<LGraph>;
  getComponents(connections?: PortSideSet): LGraph[] | ValueCollection<LGraph> {
    if (connections === undefined) {
      return this.components.values();
    }
    return this.components.get(toSideSet(connections));
  }
}
