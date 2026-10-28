// SPDX-License-Identifier: EPL-2.0
import * as Strings from '../../../guava/Strings.js';
import { LShape } from './LShape.js';

/**
 * A label in the layered graph structure.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/LLabel.java
 */
export class LLabel extends LShape {
  /** text of the label. */
  private readonly text: string;

  /**
   * Creates a label; Java's no-argument constructor creates one with empty text.
   *
   * @param thetext text of the label
   */
  constructor(thetext = '') {
    super();
    this.text = thetext;
  }

  /** Returns the text of the label. */
  getText(): string {
    return this.text;
  }

  toString(): string {
    const designation = this.getDesignation();
    if (designation === null) {
      return 'label';
    } else {
      return `l_${designation}`;
    }
  }

  override getDesignation(): string | null {
    if (!Strings.isNullOrEmpty(this.text)) {
      return this.text;
    }
    return super.getDesignation();
  }
}
