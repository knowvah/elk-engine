// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import * as Iterables from '../../guava/Iterables.js';
import { QualifiedName } from '../naming/QualifiedName.js';
import { EObjectDescription } from '../resource/EObjectDescription.js';
import type { IEObjectDescription } from '../resource/IEObjectDescription.js';
import { NULLSCOPE, type IScope } from './IScope.js';
import { SimpleScope } from './impl/SimpleScope.js';

/**
 * `SimpleAttributeResolver.NAME_RESOLVER` reads the `name` attribute of the object's class. The
 * ElkGraph metamodel has none (the naming attribute is `identifier`), so it never finds a name.
 */
const NAME_RESOLVER = (_from: EObject): string | null => null;

/**
 * `scopedElementsFor(elements, nameComputation)`: a description per element that has a name. The
 * result is lazy and recomputes (with new description objects) on every iteration, as the Guava
 * view of the Java does.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/Scopes.java
 */
export function scopedElementsFor<T extends EObject>(
  elements: Iterable<T>,
  nameComputation: (from: T) => QualifiedName | null = QualifiedName.wrapper(NAME_RESOLVER),
): Iterable<IEObjectDescription> {
  const transformed = Iterables.transform(elements, (from): IEObjectDescription | null => {
    const qualifiedName = nameComputation(from);
    if (qualifiedName !== null) {
      return new EObjectDescription(qualifiedName, from, null);
    }
    return null;
  });
  return Iterables.filter(transformed, (d): d is IEObjectDescription => d !== null) as Iterable<IEObjectDescription>;
}

/**
 * `scopeFor(elements, outer)` (names from the `name` attribute, so none for ElkGraph) and
 * `scopeFor(elements, nameComputation, outer)`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/Scopes.java
 */
export function scopeFor(elements: Iterable<EObject>, outer?: IScope): IScope;
export function scopeFor<T extends EObject>(
  elements: Iterable<T>,
  nameComputation: (from: T) => QualifiedName | null,
  outer: IScope,
): IScope;
export function scopeFor<T extends EObject>(
  elements: Iterable<T>,
  second: IScope | ((from: T) => QualifiedName | null) = NULLSCOPE,
  third: IScope = NULLSCOPE,
): IScope {
  if (typeof second === 'function') {
    return new SimpleScope(third, scopedElementsFor(elements, second));
  }
  return new SimpleScope(second, scopedElementsFor(elements));
}
