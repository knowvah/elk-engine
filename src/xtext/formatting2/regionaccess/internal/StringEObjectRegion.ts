// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { AbstractEObjectRegion } from './AbstractEObjectRegion.js';
import type { StringBasedRegionAccess } from './StringBasedRegionAccess.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/StringEObjectRegion.java */
export class StringEObjectRegion extends AbstractEObjectRegion {
  constructor(access: StringBasedRegionAccess, grammarElement: string, semanticElement: EObject) {
    super(access, grammarElement, semanticElement);
  }
}
