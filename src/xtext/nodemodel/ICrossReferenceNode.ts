// SPDX-License-Identifier: EPL-2.0
import type { INode } from './INode.js';

/**
 * One cross-reference occurrence, as the linker reads it from the parser's node model. Port-local
 * adapter (no Java counterpart): it lets the parser and the linker be written without importing each other.
 */
export interface ICrossReferenceNode extends INode {
  /** The called rule of the reference, `QualifiedId` or `ID`. */
  readonly ruleName: string;
  /** The name of the feature the reference is assigned to. */
  readonly feature: string;
  /** The value index within the owner's feature. */
  readonly index: number;
}
