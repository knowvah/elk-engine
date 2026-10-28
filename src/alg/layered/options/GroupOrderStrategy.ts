// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/GroupOrderStrategy.java
 */
export class GroupOrderStrategy {
  static readonly ONLY_WITHIN_GROUP: GroupOrderStrategy = new GroupOrderStrategy('ONLY_WITHIN_GROUP', 0);
  static readonly MODEL_ORDER: GroupOrderStrategy = new GroupOrderStrategy('MODEL_ORDER', 1);
  static readonly ENFORCED: GroupOrderStrategy = new GroupOrderStrategy('ENFORCED', 2);

  static readonly #VALUES: readonly GroupOrderStrategy[] = [
    GroupOrderStrategy.ONLY_WITHIN_GROUP,
    GroupOrderStrategy.MODEL_ORDER,
    GroupOrderStrategy.ENFORCED,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly GroupOrderStrategy[] {
    return GroupOrderStrategy.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): GroupOrderStrategy {
    const found = GroupOrderStrategy.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.options.GroupOrderStrategy.${name}`,
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

  compareTo(other: GroupOrderStrategy): number {
    return this.#ordinal - other.#ordinal;
  }
}
