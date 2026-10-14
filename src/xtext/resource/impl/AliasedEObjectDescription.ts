// SPDX-License-Identifier: EPL-2.0
import type { EClass } from '../../../emf/ecore/EClass.js';
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { QualifiedName } from '../../naming/QualifiedName.js';
import { AbstractEObjectDescription } from '../AbstractEObjectDescription.js';
import type { IEObjectDescription } from '../IEObjectDescription.js';

/**
 * A description under another name; everything else is the delegate's.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/resource/impl/AliasedEObjectDescription.java
 */
export class AliasedEObjectDescription extends AbstractEObjectDescription {
  constructor(
    private readonly alias: QualifiedName,
    private readonly delegate: IEObjectDescription,
  ) {
    super();
  }

  override getName(): QualifiedName {
    return this.alias;
  }

  override getQualifiedName(): QualifiedName {
    return this.delegate.getQualifiedName();
  }

  override getEObjectOrProxy(): EObject {
    return this.delegate.getEObjectOrProxy();
  }

  override getUserData(name: string): string | null {
    return this.delegate.getUserData(name);
  }

  override getUserDataKeys(): readonly string[] {
    return this.delegate.getUserDataKeys();
  }

  override getEClass(): EClass {
    return this.delegate.getEClass();
  }

  getAliasedEObjectDescription(): IEObjectDescription {
    return this.delegate;
  }
}
