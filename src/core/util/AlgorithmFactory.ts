// SPDX-License-Identifier: EPL-2.0
import type { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { IFactory } from './IFactory.js';

/**
 * A factory for layout provider instances; each created instance is initialized with the factory's parameter.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/AlgorithmFactory.java
 */
export class AlgorithmFactory implements IFactory<AbstractLayoutProvider> {
  /** The class for which instances shall be created. */
  readonly #clazz: new () => AbstractLayoutProvider;
  /** The parameter used for initialization of layout providers. */
  readonly #parameter: string | null;

  /**
   * Creates an instance factory for the given layout provider class, optionally initialized with a parameter.
   *
   * @param theclazz the class for which instances shall be created
   * @param theparameter the parameter used for initialization of layout providers
   */
  constructor(theclazz: new () => AbstractLayoutProvider, theparameter: string | null = null) {
    this.#clazz = theclazz;
    this.#parameter = theparameter;
  }

  create(): AbstractLayoutProvider {
    // AlgorithmFactory.java:52-58 wrap InstantiationException/IllegalAccessException in WrappedException;
    // a TypeScript constructor call cannot raise either, so there are no catch arms.
    const algorithm = new this.#clazz();
    // Java passes the null parameter through; AbstractLayoutProvider.initialize is typed string-only.
    algorithm.initialize(this.#parameter as string);
    return algorithm;
  }

  destroy(obj: AbstractLayoutProvider): void {
    obj.dispose();
  }
}
