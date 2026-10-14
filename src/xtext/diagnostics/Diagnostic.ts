// SPDX-License-Identifier: EPL-2.0
import type { INode } from '../nodemodel/INode.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/Diagnostic.java:32 */
export const SYNTAX_DIAGNOSTIC = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/Diagnostic.java:37 */
export const SYNTAX_DIAGNOSTIC_WITH_RANGE = 'org.eclipse.xtext.diagnostics.Diagnostic.Syntax.Range';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/Diagnostic.java:47 */
export const LINKING_DIAGNOSTIC = 'org.eclipse.xtext.diagnostics.Diagnostic.Linking';

/**
 * A diagnostic that knows about the region in the document. Of the Java interface (which extends
 * `Resource.Diagnostic`) the members the port can serve are kept: the message, the start line and the
 * offset and length of the region. Column and end-line/column members need `NodeModelUtils`, which has no
 * counterpart here (no node model is built).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/Diagnostic.java
 */
export interface Diagnostic {
  getMessage(): string | null;
  /** Line `1` is the first line of a document; `-1` without a node. */
  getLine(): number;
  getOffset(): number;
  getLength(): number;
}

/**
 * A node that also reports its text region. Port-local extension of {@link INode}: the T7 node view has
 * no offset or length, and `AbstractDiagnostic` reads them from the node when the parser provides them.
 */
export interface IRegionNode extends INode {
  getOffset(): number;
  getLength(): number;
}

/** Whether `node` can report its text region. */
export function isRegionNode(node: INode): node is IRegionNode {
  const candidate = node as Partial<IRegionNode>;
  return typeof candidate.getOffset === 'function' && typeof candidate.getLength === 'function';
}
