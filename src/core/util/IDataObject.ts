// SPDX-License-Identifier: EPL-2.0

/** Code units up to and including this one are stripped by `String.trim`. */
const TRIM_LIMIT = 0x20;

/**
 * An interface for data types, which should be serializable using {@link IDataObject.toString} and
 * parsable using {@link IDataObject.parse}. The default constructor must always be
 * accessible and create an instance with default content.
 *
 * `Serializable` is dropped (no Java serialization in the port); `toString` is declared because the
 * Java `Object.toString` is part of the contract the Javadoc describes.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/IDataObject.java
 */
export interface IDataObject {
  /**
   * Parse the given string and set the content of this data object.
   *
   * @param string a string
   * @throws IllegalArgumentException if the string does not have the expected format
   */
  parse(string: string): void;

  toString(): string;
}

/**
 * `String.split(regex)` for a regex without a zero-width match: when the input contains a match,
 * trailing empty strings are removed (leading and inner ones are kept); when it contains none, the
 * result is the input itself. JS `split` differs only in keeping the trailing empty strings.
 *
 * Internal parse helper shared by the `parse` implementations of the `core.math` classes; it
 * belongs with the `java.lang.String` shims and moves to `src/java/lang/JavaString.ts` when that
 * file is next opened for a task that owns it.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#split(java.lang.String)
 */
export function javaSplit(input: string, pattern: RegExp): string[] {
  const parts = input.split(pattern);
  if (parts.length === 1) {
    return parts;
  }
  let size = parts.length;
  while (size > 0 && parts[size - 1] === '') {
    size--;
  }
  return parts.slice(0, size);
}

/**
 * `String.trim`: strips code units up to U+0020 from both ends (JS `trim` also strips Unicode
 * whitespace above U+0020 and leaves control characters below it).
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/String.html#trim()
 */
export function javaTrim(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && s.charCodeAt(start) <= TRIM_LIMIT) {
    start++;
  }
  while (end > start && s.charCodeAt(end - 1) <= TRIM_LIMIT) {
    end--;
  }
  return s.slice(start, end);
}
