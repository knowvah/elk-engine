// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { ICrossReferenceNode } from './ICrossReferenceNode.js';

/**
 * Port-local adapter standing for the node model: the cross-reference occurrences of one object.
 */
export interface INodeModel {
  /**
   * The cross-reference nodes of `obj` in source order across its features, or `null` when the object has
   * no node (the early return of `Linker.ensureLinked`).
   *
   * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/Linker.java:56-58
   */
  getCrossReferenceNodes(obj: EObject): readonly ICrossReferenceNode[] | null;
}
