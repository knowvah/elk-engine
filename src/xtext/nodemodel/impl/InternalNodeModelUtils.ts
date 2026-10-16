// SPDX-License-Identifier: EPL-2.0

/**
 * The line-break arithmetic of Xtext's node model: the line of an offset, as every Xtext diagnostic reports it.
 * Only `computeLineBreaks` and the line part of `getLineAndColumn` are ported (columns have no consumer).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/nodemodel/impl/InternalNodeModelUtils.java
 */
export class InternalNodeModelUtils {
  private constructor() {}

  /**
   * Computes the line breaks in the given text and returns an array of offsets. A line break is either `\r\n`,
   * `\n`, or a single `\r`; the offset of a `\r\n` is that of the `\r`.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/nodemodel/impl/InternalNodeModelUtils.java:264-287
   */
  static computeLineBreaks(text: string): number[] {
    const result: number[] = [];
    const length = text.length;
    for (let i = 0; i < length; i++) {
      const ch = text.charAt(i);
      if (ch === '\r') {
        result.push(i);
        if (i + 1 < length && text.charAt(i + 1) === '\n') {
          i++;
        }
      } else if (ch === '\n') {
        result.push(i);
      }
    }
    return result;
  }

  /**
   * The 1-based line of `offset` (`0 <= offset <= text.length`), the line part of `getLineAndColumn`. `lineBreaks`
   * is the result of `computeLineBreaks(text)`.
   *
   * Where Java would throw `StringIndexOutOfBoundsException` (`text.charAt(offset)` for an offset at the end of a
   * text ending in `\r`), the character is treated as not being `\n`.
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/nodemodel/impl/InternalNodeModelUtils.java:161-241
   */
  static getLine(text: string, lineBreaks: readonly number[], offset: number): number {
    if (!Number.isInteger(offset) || offset < 0 || offset > text.length) {
      throw new RangeError(`Offset ${offset} is outside the text of length ${text.length}.`);
    }
    const idx = binarySearch(lineBreaks, offset);
    if (idx >= 0) {
      return idx + 1;
    }
    const insertionPoint = -(idx + 1);
    return InternalNodeModelUtils.#lineWithoutExactLineBreak(text, lineBreaks, insertionPoint, offset);
  }

  static #lineWithoutExactLineBreak(
    text: string,
    lineBreaks: readonly number[],
    insertionPoint: number,
    offset: number,
  ): number {
    if (insertionPoint === 0) {
      return 1;
    }
    const leftLineBreak = lineBreaks[insertionPoint - 1] as number;
    if (leftLineBreak + 1 === offset && text.charAt(leftLineBreak) === '\r' && text.charAt(offset) === '\n') {
      // windows line break, the offset belongs to the previous line
      return insertionPoint;
    }
    return insertionPoint + 1;
  }
}

/** `Arrays.binarySearch(int[], int)`: the index of `key`, else `-(insertion point) - 1`. */
function binarySearch(sorted: readonly number[], key: number): number {
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const value = sorted[mid] as number;
    if (value < key) {
      low = mid + 1;
    } else if (value > key) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
  return -(low + 1);
}
