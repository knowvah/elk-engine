// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/components/ComponentOrderingStrategy.java
 */
export class ComponentOrderingStrategy {
  static readonly NONE: ComponentOrderingStrategy = new ComponentOrderingStrategy('NONE', 0);
  static readonly INSIDE_PORT_SIDE_GROUPS: ComponentOrderingStrategy = new ComponentOrderingStrategy(
    'INSIDE_PORT_SIDE_GROUPS',
    1,
  );
  static readonly GROUP_MODEL_ORDER: ComponentOrderingStrategy = new ComponentOrderingStrategy('GROUP_MODEL_ORDER', 2);
  static readonly MODEL_ORDER: ComponentOrderingStrategy = new ComponentOrderingStrategy('MODEL_ORDER', 3);

  static readonly #VALUES: readonly ComponentOrderingStrategy[] = [
    ComponentOrderingStrategy.NONE,
    ComponentOrderingStrategy.INSIDE_PORT_SIDE_GROUPS,
    ComponentOrderingStrategy.GROUP_MODEL_ORDER,
    ComponentOrderingStrategy.MODEL_ORDER,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly ComponentOrderingStrategy[] {
    return ComponentOrderingStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): ComponentOrderingStrategy {
    const found = ComponentOrderingStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.components.ComponentOrderingStrategy.${name}`,
      );
    }
    return found;
  }

  ordinal(): number {
    return this.#ordinal;
  }

  name(): string {
    return this.#name;
  }

  toString(): string {
    return this.#name;
  }

  compareTo(other: ComponentOrderingStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
