// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/EdgeConstraint.java
 */
export class EdgeConstraint {
  static readonly NONE: EdgeConstraint = new EdgeConstraint('NONE', 0);
  static readonly INCOMING_ONLY: EdgeConstraint = new EdgeConstraint('INCOMING_ONLY', 1);
  static readonly OUTGOING_ONLY: EdgeConstraint = new EdgeConstraint('OUTGOING_ONLY', 2);

  static readonly #VALUES: readonly EdgeConstraint[] = [
    EdgeConstraint.NONE,
    EdgeConstraint.INCOMING_ONLY,
    EdgeConstraint.OUTGOING_ONLY,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly EdgeConstraint[] {
    return EdgeConstraint.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): EdgeConstraint {
    const found = EdgeConstraint.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.layered.options.EdgeConstraint.${name}`);
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

  compareTo(other: EdgeConstraint): number {
    return this.#ordinal - other.#ordinal;
  }
}
