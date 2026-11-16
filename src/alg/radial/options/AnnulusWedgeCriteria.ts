// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { AnnulusWedgeByLeafs } from '../p1position/wedge/AnnulusWedgeByLeafs.js';
import { AnnulusWedgeByNodeSpace } from '../p1position/wedge/AnnulusWedgeByNodeSpace.js';
import type { IAnnulusWedgeCriteria } from '../p1position/wedge/IAnnulusWedgeCriteria.js';

/**
 * The list of possible wedge criteria.
 *
 * @see org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/options/AnnulusWedgeCriteria.java
 */
export class AnnulusWedgeCriteria {
  /** Create the wedge by the number of leaves a child has. */
  static readonly LEAF_NUMBER: AnnulusWedgeCriteria = new AnnulusWedgeCriteria('LEAF_NUMBER', 0);
  /** Create the wedge by the size a node requires. */
  static readonly NODE_SIZE: AnnulusWedgeCriteria = new AnnulusWedgeCriteria('NODE_SIZE', 1);

  static readonly #VALUES: readonly AnnulusWedgeCriteria[] = [
    AnnulusWedgeCriteria.LEAF_NUMBER,
    AnnulusWedgeCriteria.NODE_SIZE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly AnnulusWedgeCriteria[] {
    return AnnulusWedgeCriteria.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): AnnulusWedgeCriteria {
    const found = AnnulusWedgeCriteria.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(
        `No enum constant org.eclipse.elk.alg.radial.options.AnnulusWedgeCriteria.${name}`,
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

  compareTo(other: AnnulusWedgeCriteria): number {
    return this.#ordinal - other.#ordinal;
  }

  /** Instantiates the chosen strategy. */
  create(): IAnnulusWedgeCriteria {
    switch (this) {
      case AnnulusWedgeCriteria.LEAF_NUMBER:
        return new AnnulusWedgeByLeafs();
      case AnnulusWedgeCriteria.NODE_SIZE:
        return new AnnulusWedgeByNodeSpace();
      default:
        throw new IllegalArgumentException(`No implementation is available for the layout option ${this.toString()}`);
    }
  }
}
