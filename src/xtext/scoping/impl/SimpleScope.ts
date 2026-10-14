// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { hashable } from '../../../java/util/HashStrategy.js';
import { JavaHashSet } from '../../../java/util/JavaHashSet.js';
import * as Iterables from '../../../guava/Iterables.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import type { QualifiedName } from '../../naming/QualifiedName.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { IScope } from '../IScope.js';
import { AbstractScope } from './AbstractScope.js';

const NULL_DESCRIPTIONS_MESSAGE = 'descriptions may not be null';

/**
 * A scope over a given iterable of descriptions. Of the four Java constructors only the full
 * one is ported (the others default the parent to `NULLSCOPE` and have no caller).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/SimpleScope.java
 */
export class SimpleScope extends AbstractScope {
  private readonly descriptions: Iterable<IEObjectDescription>;
  /** Built on the first `isShadowed`; the keys of all local descriptions. */
  protected shadowingIndex: JavaHashSet<QualifiedName> | null = null;

  constructor(parent: IScope, descriptions: Iterable<IEObjectDescription>, ignoreCase: boolean = false) {
    super(parent, ignoreCase);
    // the Java null check; the type excludes null, JS callers may not
    if ((descriptions as Iterable<IEObjectDescription> | null) === null) {
      throw new IllegalArgumentException(NULL_DESCRIPTIONS_MESSAGE);
    }
    this.descriptions = descriptions;
  }

  protected override getAllLocalElements(): Iterable<IEObjectDescription> {
    return this.descriptions;
  }

  protected override getLocalElementsByEObject(object: EObject): Iterable<IEObjectDescription> {
    const localElements = this.getAllLocalElements();
    return Iterables.filter(localElements, (input) => {
      if (input.getEObjectOrProxy() === object) {
        return this.canBeFoundByNameAndShadowingKey(input, object);
      }
      return false;
    });
  }

  private canBeFoundByNameAndShadowingKey(input: IEObjectDescription, object: EObject): boolean {
    const lookUp = this.getLocalElementsByName(input.getName());
    const myShadowingKey = this.getShadowingKey(input);
    for (const other of lookUp) {
      if (myShadowingKey.equals(this.getShadowingKey(other))) {
        return other === input || other.getEObjectOrProxy() === object;
      }
    }
    return false;
  }

  /** The name, or its lower case when the scope ignores case. */
  protected getShadowingKey(description: IEObjectDescription): QualifiedName {
    if (this.isIgnoreCase()) {
      return description.getName().toLowerCase();
    }
    return description.getName();
  }

  override isShadowed(fromParent: IEObjectDescription): boolean {
    if (this.shadowingIndex === null) {
      this.shadowingIndex = new JavaHashSet<QualifiedName>(hashable<QualifiedName>());
      for (const local of this.getAllLocalElements()) {
        this.shadowingIndex.add(this.getShadowingKey(local));
      }
    }
    return this.shadowingIndex.contains(this.getShadowingKey(fromParent));
  }
}
