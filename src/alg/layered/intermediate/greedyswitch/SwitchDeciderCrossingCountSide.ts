// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';

/**
 * The side on which to count crossings for the one-sided SwitchDecider. Java's nested
 * `SwitchDecider.CrossingCountSide` (M15 file naming).
 *
 * @author alan
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/greedyswitch/SwitchDecider.java:253
 */
export class SwitchDeciderCrossingCountSide {
  /** Consider crossings to the west of the free layer. */
  static readonly WEST: SwitchDeciderCrossingCountSide = new SwitchDeciderCrossingCountSide('WEST', 0);
  /** Consider crossings to the east of the free layer. */
  static readonly EAST: SwitchDeciderCrossingCountSide = new SwitchDeciderCrossingCountSide('EAST', 1);

  static readonly #VALUES: readonly SwitchDeciderCrossingCountSide[] = [
    SwitchDeciderCrossingCountSide.WEST,
    SwitchDeciderCrossingCountSide.EAST,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly SwitchDeciderCrossingCountSide[] {
    return SwitchDeciderCrossingCountSide.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): SwitchDeciderCrossingCountSide {
    const found = SwitchDeciderCrossingCountSide.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.layered.intermediate.greedyswitch.SwitchDecider.CrossingCountSide.${name}`,
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
}
