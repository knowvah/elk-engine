// SPDX-License-Identifier: EPL-2.0
import * as Iterators from '../../../guava/Iterators.js';
import type { IEObjectDescription } from '../../resource/IEObjectDescription.js';
import type { AbstractScope, Provider } from './AbstractScope.js';

/**
 * The elements of the parent scope that no local element shadows. The parent's elements are
 * requested from the `provider` when the iteration starts, once, and filtered lazily.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/scoping/impl/AbstractScope.java (nested class `ParentIterable`)
 */
export class ParentIterable implements Iterable<IEObjectDescription> {
  private parentElements: Iterable<IEObjectDescription> | null = null;

  constructor(
    private readonly scope: AbstractScope,
    private readonly provider: Provider<Iterable<IEObjectDescription>>,
  ) {}

  [Symbol.iterator](): Iterator<IEObjectDescription> {
    this.parentElements ??= this.provider();
    const parentIterator = this.parentElements[Symbol.iterator]();
    return Iterators.filter(parentIterator, (input) => this.apply(input));
  }

  apply(input: IEObjectDescription): boolean {
    return !this.scope.isShadowed(input);
  }

  toString(): string {
    return `[${[...this].join(', ')}]`;
  }
}
