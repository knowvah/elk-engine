// SPDX-License-Identifier: EPL-2.0
import type { ILayoutMetaData } from './ILayoutMetaData.js';

/**
 * Provider for meta data of layout algorithms and layout options.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/ILayoutMetaDataProvider.java
 */
export interface ILayoutMetaDataProvider {
  /**
   * Apply this provider by registering all contained meta data into the given registry instance.
   */
  apply(registry: ILayoutMetaDataProvider.Registry): void;
}

// The nested `Registry` interface (C3): a type-only namespace, no run-time value.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ILayoutMetaDataProvider {
  /**
   * Registry for layout meta data.
   *
   * @see org.eclipse.elk.core/src/org/eclipse/elk/core/data/ILayoutMetaDataProvider.java
   */
  export interface Registry {
    /**
     * Register a layout algorithm, a layout option or a layout category. The three Java overloads
     * `register(LayoutAlgorithmData)`, `register(LayoutOptionData)` and
     * `register(LayoutCategoryData)` are one signature that implementations dispatch by
     * `instanceof` (translation-rules 6.5); the three classes are typed through
     * {@link ILayoutMetaData} until `LayoutAlgorithmData` and `LayoutCategoryData` are ported.
     */
    register(data: ILayoutMetaData): void;

    /**
     * Specify a dependency between two layout options. The source option must be made visible in the UI
     * only if the target option is set to the specified value. If no value is given, the requirement for
     * the target option is to be non-null and non-empty.
     *
     * @param sourceOption the dependent layout option id
     * @param targetOption the option id for which to check the required value
     * @param requiredValue a value to require for the target option, or `null`
     */
    addDependency(sourceOption: string, targetOption: string, requiredValue: unknown): void;

    /**
     * Specify support of a layout algorithm for the given layout option.
     *
     * @param algorithm a layout algorithm id
     * @param option the option id for which to add support
     * @param defaultValue the default value applied by the algorithm, or `null`
     */
    addOptionSupport(algorithm: string, option: string, defaultValue: unknown): void;
  }
}
