// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import * as Iterables from '../../../guava/Iterables.js';
import { QualifiedName } from '../../naming/QualifiedName.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import { NULLSCOPE, type IScope } from '../IScope.js';
import { ParentIterable } from './AbstractScope.ParentIterable.js';

/** A source of a value, called when the value is first needed (Guice `Provider`). */
export type Provider<T> = () => T;

const NULL_PARENT_MESSAGE = 'parent may not be null. Use IScope.NULLSCOPE instead.';
const IGNORE_CASE_TAG = '[ignore case]';

/**
 * A scope with local elements and a parent, to which lookups fall through: names are found in
 * the local elements first, and parent elements a local element of the same name shadows are
 * dropped from the combined iterations. Laziness is part of the contract: the parent scope's
 * elements are not requested before the local ones are consumed.
 *
 * Reverse lookups by element compare by identity where the Java also compares resource URIs:
 * within one resource tree URIs are unique, so two descriptions with the same URI describe the
 * same Java object and the URI test adds nothing to `getEObjectOrProxy() === object`.
 *
 * Java "is a `Collection`" tests are `Array.isArray`: scopes return arrays exactly where the
 * Java returns lists.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/AbstractScope.java
 */
export abstract class AbstractScope implements IScope {
  private readonly ignoreCase: boolean;
  private readonly parent: IScope;

  protected constructor(parent: IScope, ignoreCase: boolean) {
    // the Java null check; the type excludes null, JS callers may not
    if ((parent as IScope | null) === null) {
      throw new IllegalArgumentException(NULL_PARENT_MESSAGE);
    }
    this.parent = parent;
    this.ignoreCase = ignoreCase;
  }

  getParent(): IScope {
    return this.parent;
  }

  isIgnoreCase(): boolean {
    return this.ignoreCase;
  }

  getSingleElement(name: QualifiedName): IEObjectDescription | null;
  getSingleElement(object: EObject): IEObjectDescription | null;
  getSingleElement(nameOrObject: QualifiedName | EObject): IEObjectDescription | null {
    return nameOrObject instanceof QualifiedName
      ? this.getSingleElementByName(nameOrObject)
      : this.getSingleElementByObject(nameOrObject);
  }

  protected getSingleElementByName(name: QualifiedName): IEObjectDescription | null {
    const result = this.getSingleLocalElementByName(name);
    if (result !== null) {
      return result;
    }
    return this.getParent().getSingleElement(name);
  }

  protected getSingleLocalElementByName(name: QualifiedName): IEObjectDescription | null {
    const result = this.getLocalElementsByName(name);
    const first = result[Symbol.iterator]().next();
    return first.done === true ? null : first.value;
  }

  getAllElements(): Iterable<IEObjectDescription> {
    const localElements = this.getAllLocalElements();
    const parentElements = this.getParentElements(() => this.getParent().getAllElements());
    return Iterables.concat(localElements, parentElements);
  }

  getElements(name: QualifiedName): Iterable<IEObjectDescription>;
  getElements(object: EObject): Iterable<IEObjectDescription>;
  getElements(nameOrObject: QualifiedName | EObject): Iterable<IEObjectDescription> {
    return nameOrObject instanceof QualifiedName
      ? this.getElementsByName(nameOrObject)
      : this.getElementsByObject(nameOrObject);
  }

  protected getElementsByName(name: QualifiedName): Iterable<IEObjectDescription> {
    const localElements = this.getLocalElementsByName(name);
    if (Array.isArray(localElements) && localElements.length === 0) {
      return this.getParent().getElements(name);
    }
    const parentElements = this.getParentElements(() => this.getParent().getElements(name));
    return Iterables.concat(localElements, parentElements);
  }

  protected getSingleElementByObject(object: EObject): IEObjectDescription | null {
    const first = this.getElementsByObject(object)[Symbol.iterator]().next();
    return first.done === true ? null : first.value;
  }

  protected getElementsByObject(object: EObject): Iterable<IEObjectDescription> {
    const localElements = this.getLocalElementsByEObject(object);
    const parentElements = this.getParentElements(() => this.getParent().getElements(object));
    return Iterables.concat(localElements, parentElements);
  }

  protected abstract getAllLocalElements(): Iterable<IEObjectDescription>;

  protected getLocalElementsByName(name: QualifiedName): Iterable<IEObjectDescription> {
    const localElements = this.getAllLocalElements();
    return Iterables.filter(localElements, (input) =>
      this.isIgnoreCase() ? name.equalsIgnoreCase(input.getName()) : name.equals(input.getName()),
    );
  }

  /** Java `getLocalElementsByEObject(EObject, URI)`; the URI is the identity, see the class comment. */
  protected getLocalElementsByEObject(object: EObject): Iterable<IEObjectDescription> {
    const localElements = this.getAllLocalElements();
    return Iterables.filter(localElements, (input) => {
      if (input.getEObjectOrProxy() === object) {
        return this.canBeFoundByName(input, object);
      }
      return false;
    });
  }

  private canBeFoundByName(input: IEObjectDescription, object: EObject): boolean {
    const lookUp = this.getSingleLocalElementByName(input.getName());
    if (lookUp !== null) {
      if (lookUp === input) {
        return true;
      }
      if (lookUp.getEObjectOrProxy() === object) {
        return true;
      }
    }
    return false;
  }

  protected getParentElements(provider: Provider<Iterable<IEObjectDescription>>): Iterable<IEObjectDescription> {
    if (this.getParent() === NULLSCOPE) {
      return [];
    }
    return new ParentIterable(this, provider);
  }

  /** Whether a local element hides `input`, an element of the parent scope. */
  isShadowed(input: IEObjectDescription): boolean {
    const localElements = this.getLocalElementsByName(input.getName());
    return !Iterables.isEmpty(localElements);
  }

  toString(): string {
    let parentString: string;
    try {
      parentString = this.getParent().toString();
    } catch (t) {
      parentString = t instanceof Error ? `${t.name} : ${t.message}` : String(t);
    }
    const tag = this.isIgnoreCase() ? IGNORE_CASE_TAG : '';
    return `${this.constructor.name}${tag}[${[...this.getAllLocalElements()].join(', ')}] -> ${parentString}`;
  }
}
