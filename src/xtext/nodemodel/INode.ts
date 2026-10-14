// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';

/**
 * The minimal node-model view the value converters, parser and linker share. The parser task implements
 * it; `getStartLine` is the line of the node's first non-hidden leaf.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/nodemodel/INode.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/nodemodel/impl/AbstractNode.java:180-187
 */
export interface INode {
  getStartLine(): number;
  getText(): string;
  getSemanticElement(): EObject | null;
}
