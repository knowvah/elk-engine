// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../../emf/ecore/EObject.js';
import { IllegalStateException } from '../../../../java/lang/IllegalStateException.js';
import type { IEObjectRegion } from '../IEObjectRegion.js';
import type { IFormattedResource } from '../ITextRegionAccess.js';
import type { ITextSegment } from '../ITextSegment.js';
import type { AbstractEObjectRegion } from './AbstractEObjectRegion.js';
import { AbstractRegionAccess } from './AbstractRegionAccess.js';
import { TextSegment } from './TextSegment.js';

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/regionaccess/internal/StringBasedRegionAccess.java */
export class StringBasedRegionAccess extends AbstractRegionAccess {
  // Map keeps insertion order and keys by identity, like Maps.newLinkedHashMap with identity-hashed EObjects
  private readonly eObjectToTokens = new Map<EObject, AbstractEObjectRegion>();
  private readonly resource: IFormattedResource;
  private root: AbstractEObjectRegion | null = null;
  private text = '';

  constructor(resource: IFormattedResource) {
    super();
    this.resource = resource;
  }

  /** Java protected `add`. */
  add(tokens: AbstractEObjectRegion): void {
    this.eObjectToTokens.set(tokens.getSemanticElement(), tokens);
  }

  /** Java protected `append`: appends and returns the offset of the appended text. */
  append(value: string): number {
    const length = this.text.length;
    this.text += value;
    return length;
  }

  getResource(): IFormattedResource {
    return this.resource;
  }

  regionForDocument(): ITextSegment {
    return new TextSegment(this, 0, this.text.length);
  }

  regionForEObject(obj: EObject): AbstractEObjectRegion | null {
    return this.eObjectToTokens.get(obj) ?? null;
  }

  regionForRootEObject(): IEObjectRegion {
    if (this.root === null) throw new IllegalStateException('the root region has not been set');
    return this.root;
  }

  setRootEObject(root: AbstractEObjectRegion): void {
    this.root = root;
  }

  textForOffset(offset: number, length: number): string {
    return this.text.substring(offset, offset + length);
  }

  hasSyntaxError(): boolean {
    return false;
  }
}
