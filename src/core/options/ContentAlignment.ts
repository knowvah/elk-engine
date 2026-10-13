// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { EnumSet } from '../../java/util/EnumSet.js';

/**
 * Alignment of content within a container, composed of a vertical and a horizontal part.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/options/ContentAlignment.java
 */
export class ContentAlignment {
  static readonly V_TOP: ContentAlignment = new ContentAlignment('V_TOP', 0);
  static readonly V_CENTER: ContentAlignment = new ContentAlignment('V_CENTER', 1);
  static readonly V_BOTTOM: ContentAlignment = new ContentAlignment('V_BOTTOM', 2);
  static readonly H_LEFT: ContentAlignment = new ContentAlignment('H_LEFT', 3);
  static readonly H_CENTER: ContentAlignment = new ContentAlignment('H_CENTER', 4);
  static readonly H_RIGHT: ContentAlignment = new ContentAlignment('H_RIGHT', 5);

  static readonly #VALUES: readonly ContentAlignment[] = [
    ContentAlignment.V_TOP,
    ContentAlignment.V_CENTER,
    ContentAlignment.V_BOTTOM,
    ContentAlignment.H_LEFT,
    ContentAlignment.H_CENTER,
    ContentAlignment.H_RIGHT,
  ];

  readonly #name: string;
  readonly #ordinal: number;

  private constructor(name: string, ordinal: number) {
    this.#name = name;
    this.#ordinal = ordinal;
  }

  /** The constants in declaration order. */
  static values(): readonly ContentAlignment[] {
    return ContentAlignment.#VALUES;
  }

  /** @throws IllegalArgumentException if no constant has the given name. */
  static valueOf(name: string): ContentAlignment {
    const found = ContentAlignment.#VALUES.find((constant) => constant.#name === name);
    if (found === undefined) {
      throw new IllegalArgumentException(`No enum constant org.eclipse.elk.core.options.ContentAlignment.${name}`);
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

  compareTo(other: ContentAlignment): number {
    return this.#ordinal - other.#ordinal;
  }

  /** @see ContentAlignment#centerCenter() */
  static centerCenter(): EnumSet<ContentAlignment> {
    return EnumSet.of(ContentAlignment.V_CENTER, ContentAlignment.H_CENTER);
  }

  /** @see ContentAlignment#topLeft() */
  static topLeft(): EnumSet<ContentAlignment> {
    return EnumSet.of(ContentAlignment.V_TOP, ContentAlignment.H_LEFT);
  }

  /** @see ContentAlignment#bottomRight() */
  static bottomRight(): EnumSet<ContentAlignment> {
    return EnumSet.of(ContentAlignment.V_BOTTOM, ContentAlignment.H_RIGHT);
  }

  /** @see ContentAlignment#topCenter() */
  static topCenter(): EnumSet<ContentAlignment> {
    return EnumSet.of(ContentAlignment.V_TOP, ContentAlignment.H_CENTER);
  }
}
