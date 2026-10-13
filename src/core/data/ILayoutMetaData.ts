// SPDX-License-Identifier: EPL-2.0

/**
 * Interface for data holder classes that describe the layout infrastructure.
 * Implementing classes are used to store meta information and are accessed using
 * `LayoutMetaDataService`.
 *
 * `getName` and `getDescription` may return `null` (Java strings are nullable and generated
 * options without a label or description leave them unset).
 *
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/ILayoutMetaData.java
 */
export interface ILayoutMetaData {
  /**
   * Returns the identifier, that is a unique string used to look up the layout data instance.
   *
   * @returns the identifier
   */
  getId(): string;

  /**
   * Returns the name, that is a user-friendly title that can be displayed in user interfaces.
   * While the name should generally be short, longer text can be written in the description.
   * In contrast to the identifier, the name can be ambiguous.
   *
   * @returns the name
   */
  getName(): string | null;

  /**
   * Returns the description for display in user interfaces.
   *
   * @returns the description
   */
  getDescription(): string | null;
}
