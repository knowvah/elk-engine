// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { shl } from '../../java/lang/Int32.js';
import { hashCode as doubleHashCode, parseDouble } from '../../java/lang/JavaDouble.js';
import { NumberFormatException } from '../../java/lang/NumberFormatException.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { type IDataObject, javaSplit, javaTrim } from '../util/IDataObject.js';

/** Characters skipped in front of the key-value pairs by {@link Spacing.parse}. */
const LEADING_DELIMITERS = '([{"\' \t\r\n';
/** Characters skipped behind the key-value pairs by {@link Spacing.parse}. */
const TRAILING_DELIMITERS = ')]}"\' \t\r\n';
/** The pair separators of {@link Spacing.parse}: Java regex `,|;`. */
const PAIR_SEPARATORS = /,|;/;
/** The key-value separator of {@link Spacing.parse}: Java regex `=`. */
const KEY_VALUE_SEPARATOR = /=/;
/** A pair consists of a key and a value. */
const PAIR_PART_COUNT = 2;
/** Shift of the upper half in {@link Spacing.hashCode}. */
const HALF_WORD_BITS = 16;
/** Mask of the lower half in {@link Spacing.hashCode}. */
const HALF_WORD_MASK = 0xffff;

/** The keys of {@link Spacing.parse}. */
const KEY_TOP = 'top';
const KEY_LEFT = 'left';
const KEY_BOTTOM = 'bottom';
const KEY_RIGHT = 'right';

/**
 * Stores the spacing of an object in `double` precision.
 *
 * The `Cloneable` contract is the abstract {@link Spacing.clone}.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/math/Spacing.java
 */
export abstract class Spacing implements IDataObject {
  // Allow public fields in these utility classes.

  /** The spacing from the top. */
  top = 0.0;
  /** The spacing from the bottom. */
  bottom = 0.0;
  /** The spacing from the left. */
  left = 0.0;
  /** The spacing from the right. */
  right = 0.0;

  /**
   * Creates a new instance with all fields set to `0.0`, or initialized with the given values
   * (top, right, bottom, left).
   */
  protected constructor(...sides: [] | [top: number, right: number, bottom: number, left: number]) {
    if (sides.length === 4) {
      this.set(sides[0], sides[1], sides[2], sides[3]);
    }
  }

  /**
   * Sets all spacings to the ones of the given {@link Spacing} object, or all four spacings at once
   * (top, right, bottom, left).
   */
  set(spacing: Spacing): void;
  set(newTop: number, newRight: number, newBottom: number, newLeft: number): void;
  set(...args: [Spacing] | [number, number, number, number]): void {
    if (args.length === 1) {
      this.set(args[0].top, args[0].right, args[0].bottom, args[0].left);
    } else {
      this.top = args[0];
      this.right = args[1];
      this.bottom = args[2];
      this.left = args[3];
    }
  }

  /** @return the top */
  getTop(): number {
    return this.top;
  }

  /** @param top the top to set */
  setTop(top: number): void {
    this.top = top;
  }

  /** @return the right */
  getRight(): number {
    return this.right;
  }

  /** @param right the right to set */
  setRight(right: number): void {
    this.right = right;
  }

  /** @return the bottom */
  getBottom(): number {
    return this.bottom;
  }

  /** @param bottom the bottom to set */
  setBottom(bottom: number): void {
    this.bottom = bottom;
  }

  /** @return the left */
  getLeft(): number {
    return this.left;
  }

  /** @param left the left to set */
  setLeft(left: number): void {
    this.left = left;
  }

  /**
   * Sets both the left and the right spacing to the same value.
   *
   * @param val the new value.
   */
  setLeftRight(val: number): void {
    this.left = val;
    this.right = val;
  }

  /**
   * Sets both the top and the bottom spacing to the same value.
   *
   * @param val the new value.
   */
  setTopBottom(val: number): void {
    this.top = val;
    this.bottom = val;
  }

  /** @return the combined horizontal padding, i.e. {@link Spacing.getLeft} + {@link Spacing.getRight}. */
  getHorizontal(): number {
    return this.getLeft() + this.getRight();
  }

  /** @return the combined vertical padding, i.e. {@link Spacing.getTop} + {@link Spacing.getBottom}. */
  getVertical(): number {
    return this.getTop() + this.getBottom();
  }

  equals(obj: unknown): boolean {
    if (obj instanceof Spacing) {
      return this.top === obj.top && this.bottom === obj.bottom && this.left === obj.left && this.right === obj.right;
    } else {
      return false;
    }
  }

  hashCode(): number {
    // I don't care very much to define explicit constants for this calculation.
    let code1 = shl(doubleHashCode(this.left), HALF_WORD_BITS);
    code1 |= doubleHashCode(this.bottom) & HALF_WORD_MASK;

    let code2 = shl(doubleHashCode(this.right), HALF_WORD_BITS);
    code2 |= doubleHashCode(this.top) & HALF_WORD_MASK;

    return code1 ^ code2;
  }

  toString(): string {
    return (
      '[top=' +
      doubleToString(this.top) +
      ',left=' +
      doubleToString(this.left) +
      ',bottom=' +
      doubleToString(this.bottom) +
      ',right=' +
      doubleToString(this.right) +
      ']'
    );
  }

  /**
   * Split from the Java body (complexity limits): the trimming of the delimiters stays here, the
   * token loop is {@link Spacing.parseTokens}.
   */
  parse(string: string): void {
    let start = 0;
    while (start < string.length && isdelim(string.charAt(start), LEADING_DELIMITERS)) {
      start++;
    }
    let end = string.length;
    while (end > 0 && isdelim(string.charAt(end - 1), TRAILING_DELIMITERS)) {
      end--;
    }
    if (start < end) {
      this.parseTokens(javaSplit(string.substring(start, end), PAIR_SEPARATORS));
    }
  }

  /** The `try` block of the Java `parse`: applies the key-value pairs in order. */
  private parseTokens(tokens: string[]): void {
    try {
      for (const token of tokens) {
        const keyandvalue = javaSplit(token, KEY_VALUE_SEPARATOR);
        if (keyandvalue.length !== PAIR_PART_COUNT) {
          throw new IllegalArgumentException('Expecting a list of key-value pairs.');
        }
        const key = javaTrim(keyandvalue[0]);
        const value = parseDouble(javaTrim(keyandvalue[1]));
        if (key === KEY_TOP) {
          this.top = value;
        } else if (key === KEY_LEFT) {
          this.left = value;
        } else if (key === KEY_BOTTOM) {
          this.bottom = value;
        } else if (key === KEY_RIGHT) {
          this.right = value;
        }
      }
    } catch (exception) {
      if (exception instanceof NumberFormatException) {
        throw new IllegalArgumentException(
          'The given string contains parts that cannot be parsed as numbers.' + String(exception),
        );
      }
      throw exception;
    }
  }

  /**
   * Copy spacings values from another double valued spacings.
   *
   * @param other another spacings
   * @return this instance.
   */
  copy(other: Spacing): Spacing {
    this.left = other.left;
    this.right = other.right;
    this.top = other.top;
    this.bottom = other.bottom;
    return this;
  }

  /**
   * Adds spacings values from another double valued spacings.
   *
   * @param other another spacings.
   * @return this instance.
   */
  add(other: Spacing): Spacing {
    this.left += other.left;
    this.right += other.right;
    this.top += other.top;
    this.bottom += other.bottom;
    return this;
  }

  /** Return a new instance of the concrete class. */
  abstract clone(): Spacing;
}

/**
 * Determine whether the given character is a delimiter.
 *
 * @param c a character
 * @param delims a string of possible delimiters
 * @return true if `c` is one of the characters in `delims`
 */
function isdelim(c: string, delims: string): boolean {
  for (let i = 0; i < delims.length; i++) {
    if (c === delims.charAt(i)) {
      return true;
    }
  }
  return false;
}

/**
 * The `[top, right, bottom, left]` the constructors of {@link ElkMargin} and {@link ElkPadding}
 * pass to {@link Spacing}, resolved from the Java overloads: `()`, `(any)`, `(leftRight, topBottom)`,
 * `(top, right, bottom, left)` and `(other)`. Internal to the two subclasses.
 */
export function spacingSides(
  args: [] | [number] | [number, number] | [number, number, number, number] | [Spacing],
): [] | [number, number, number, number] {
  if (args.length === 0) {
    return [];
  }
  if (args.length === 1) {
    const [any] = args;
    return typeof any === 'number' ? [any, any, any, any] : [any.top, any.right, any.bottom, any.left];
  }
  if (args.length === 2) {
    const [leftRight, topBottom] = args;
    return [topBottom, leftRight, topBottom, leftRight];
  }
  return args;
}
