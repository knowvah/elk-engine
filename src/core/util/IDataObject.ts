// SPDX-License-Identifier: EPL-2.0

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
