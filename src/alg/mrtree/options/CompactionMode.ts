// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';

/**
 * Compaction modes of the mrtree algorithm.
 *
 * @see org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/options/CompactionMode.java
 */
export class CompactionMode {
  /** No Compaction. */
  static readonly NONE: CompactionMode = new CompactionMode('NONE', 0);
  /** One dimensional Compaction that preserves the spacings between levels. */
  static readonly LEVEL_PRESERVING: CompactionMode = new CompactionMode('LEVEL_PRESERVING', 1);
  /** One dimensional Compaction that does not preserve the spacings between levels. WARNING: Do not use with EdgeRoutingMode AvoidOverlap. */
  static readonly AGGRESSIVE: CompactionMode = new CompactionMode('AGGRESSIVE', 2);

  static readonly #VALUES: readonly CompactionMode[] = [
    CompactionMode.NONE,
    CompactionMode.LEVEL_PRESERVING,
    CompactionMode.AGGRESSIVE,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly CompactionMode[] {
    return CompactionMode.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): CompactionMode {
    const found = CompactionMode.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.alg.mrtree.options.CompactionMode.${name}`);
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

  compareTo(other: CompactionMode): number {
    return this.#ordinal - other.#ordinal;
  }
}
