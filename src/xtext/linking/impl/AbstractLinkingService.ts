// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { ICrossReferenceNode } from '../../nodemodel/ICrossReferenceNode.js';
import type { EReferenceInfo } from '../../scoping/EReferenceInfo.js';
import type { ILinkingService } from '../ILinkingService.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/AbstractLinkingService.java
 */
export abstract class AbstractLinkingService implements ILinkingService {
  abstract getLinkedObjects(context: EObject, reference: EReferenceInfo, node: ICrossReferenceNode): readonly EObject[];
}
