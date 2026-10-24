// SPDX-License-Identifier: EPL-2.0
import type { IFactory } from './IFactory.js';

/**
 * A default factory that creates instances of a given class by its no-argument constructor. The Java `Class` is a
 * constructor function (P7). Java's catch of `InstantiationException` / `IllegalAccessException`
 * (DefaultFactory.java:40-45) wraps them in a `WrappedException`; a TypeScript constructor call cannot raise either,
 * so there are no catch arms (as in `AlgorithmFactory`).
 *
 * @param <T> type of instances that are created by this factory
 * @author msp
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/DefaultFactory.java
 */
export class DefaultFactory<T> implements IFactory<T> {
  /** the class for which instances shall be created. */
  private readonly clazz: new () => T;

  /**
   * Creates an instance factory for the given class.
   *
   * @param theclazz the class for which instances shall be created
   */
  constructor(theclazz: new () => T) {
    this.clazz = theclazz;
  }

  create(): T {
    return new this.clazz();
  }

  destroy(_obj: T): void {
    // do nothing by default, override in subclasses
  }
}
