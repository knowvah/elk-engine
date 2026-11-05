// SPDX-License-Identifier: EPL-2.0
import type { LGraph } from '../graph/LGraph.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { ComponentGroup } from './ComponentGroup.js';
import { buildConstraintTable, constraintsFor, type ConstraintTable } from './ComponentGroupSides.js';
import { MODEL_ORDER_CONSTRAINT_ROWS } from './ModelOrderComponentGroupConstraintRows.js';

/**
 * A component group that keeps the order of its components, for the model order component placer. Components can only
 * be added if their external port connections do not conflict, also considering the model order.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderComponentGroup.java
 */
export class ModelOrderComponentGroup extends ComponentGroup {
  static #MODEL_ORDER_CONSTRAINTS: ConstraintTable | undefined;

  /**
   * Update constraints map with all constraints that occur if the key is inserted in a component group with the value
   * already in it. This contains only additional sides to the CONSTRAINTS of the super class. A lookup table built on
   * first use, as `ComponentGroup.CONSTRAINTS` (F10, F11).
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderComponentGroup.java:56
   */
  protected static get MODEL_ORDER_CONSTRAINTS(): ConstraintTable {
    return (ModelOrderComponentGroup.#MODEL_ORDER_CONSTRAINTS ??= buildConstraintTable(MODEL_ORDER_CONSTRAINT_ROWS));
  }

  /** The components in the order they were added (Java `Lists.newLinkedList()`). */
  private readonly componentOrder: LGraph[] = [];

  /**
   * Creates a model order component group, empty or with the given component. The component is added twice to the
   * component order, by `add` and by the constructor, as in Java.
   *
   * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderComponentGroup.java:205
   */
  constructor(component?: LGraph) {
    super();
    if (component !== undefined) {
      this.add(component);
      this.getComponentOrder().push(component);
    }
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderComponentGroup.java:222 */
  override add(component: LGraph): boolean {
    if (this.canAdd(component)) {
      this.components.put(component.getProperty(InternalProperties.EXT_PORT_CONNECTIONS), component);
      this.getComponentOrder().push(component);
      return true;
    } else {
      return false;
    }
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderComponentGroup.java:241 */
  protected override canAdd(component: LGraph): boolean {
    // Check if we have a component with incompatible external port sides
    const candidateSides = component.getProperty(InternalProperties.EXT_PORT_CONNECTIONS);
    const constraints = constraintsFor(ComponentGroup.CONSTRAINTS, candidateSides);
    const modelOrderConstraints = constraintsFor(ModelOrderComponentGroup.MODEL_ORDER_CONSTRAINTS, candidateSides);

    for (const constraint of constraints) {
      if (!this.components.get(constraint).isEmpty()) {
        // A component with a conflicting external port side combination exists
        return false;
      }
    }

    for (const constraint of modelOrderConstraints) {
      if (!this.components.get(constraint).isEmpty()) {
        // A component with a conflicting external port side combination exists considering model order
        return false;
      }
    }

    // We haven't found any conflicting components
    return true;
  }

  /** @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ModelOrderComponentGroup.java:267 */
  getComponentOrder(): LGraph[] {
    return this.componentOrder;
  }
}
