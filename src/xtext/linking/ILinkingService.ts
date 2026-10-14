// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { ICrossReferenceNode } from '../nodemodel/ICrossReferenceNode.js';
import type { EReferenceInfo } from '../scoping/EReferenceInfo.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/ILinkingService.java
 */
export interface ILinkingService {
  /**
   * Returns all objects referenced by the link text of `node` in `context`, without setting the reference.
   *
   * @throws IllegalNodeException when the node's text cannot be converted
   */
  getLinkedObjects(context: EObject, reference: EReferenceInfo, node: ICrossReferenceNode): readonly EObject[];
}
