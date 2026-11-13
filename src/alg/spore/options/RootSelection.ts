// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * An enumeration of methods for selecting a root node when constructing a spanning tree.
 *
 * @see org.eclipse.elk.alg.spore/src/org/eclipse/elk/alg/spore/options/RootSelection.java
 */
export class RootSelection {
  /** A Node is manually selected by label as root. */
  static readonly FIXED: RootSelection = new RootSelection('FIXED', 0);
  /** The node most central to the drawing is selected as root. */
  static readonly CENTER_NODE: RootSelection = new RootSelection('CENTER_NODE', 1);

  static readonly #VALUES: readonly RootSelection[] = [RootSelection.FIXED, RootSelection.CENTER_NODE];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly RootSelection[] {
    return RootSelection.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): RootSelection {
    const found = RootSelection.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.spore.options.RootSelection.${name}`);
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

  compareTo(other: RootSelection): number {
    return this.#ordinal - other.#ordinal;
  }
}
