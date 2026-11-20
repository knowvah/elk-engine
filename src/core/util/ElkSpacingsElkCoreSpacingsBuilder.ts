// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../graph/properties/IProperty.js';
import * as DoubleMath from '../../guava/DoubleMath.js';
import { devAssert } from '../../java/lang/DevAssert.js';
import { CoreOptions } from '../options/CoreOptions.js';
import { AbstractSpacingsBuilder } from './ElkSpacingsAbstractSpacingsBuilder.js';

/**
 * Spacing configuration builder implementation for spacing options defined in {@link CoreOptions}.
 *
 * The Java static initializer's two `assert`s (ElkSpacings.java:78-81: non-null base default, base default
 * different from 0) run where the lazy static `DEPENDENT_SPACING_OPTIONS` is first evaluated, which is the nearest
 * TS counterpart of class initialisation: `CoreOptions` is part of an ESM import cycle, so nothing may touch it
 * earlier.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkSpacings.java
 */
export class ElkCoreSpacingsBuilder extends AbstractSpacingsBuilder<ElkCoreSpacingsBuilder> {
  /** See `AbstractSpacingsBuilder.baseSpacing` for details. A cached static getter (ESM cycle with `CoreOptions`). */
  static get BASE_SPACING_OPTION(): IProperty<number> {
    return CoreOptions.SPACING_NODE_NODE;
  }

  /** Cached `DEPENDENT_SPACING_OPTIONS` (a lazy static: `CoreOptions` is part of an ESM import cycle). */
  private static dependentSpacingOptionsCache: IProperty<number>[] | null = null;

  private static dependentSpacingOptions(): IProperty<number>[] {
    if (ElkCoreSpacingsBuilder.dependentSpacingOptionsCache === null) {
      // Java static initializer (ElkSpacings.java:78-81), run on the first evaluation of the lazy static.
      ElkCoreSpacingsBuilder.assertBaseSpacingDefault();
      ElkCoreSpacingsBuilder.dependentSpacingOptionsCache = [
        // Sorted alphabetically
        CoreOptions.SPACING_COMPONENT_COMPONENT,
        CoreOptions.SPACING_EDGE_EDGE,
        CoreOptions.SPACING_EDGE_LABEL,
        CoreOptions.SPACING_EDGE_NODE,
        CoreOptions.SPACING_LABEL_LABEL,
        CoreOptions.SPACING_LABEL_NODE,
        CoreOptions.SPACING_LABEL_PORT_HORIZONTAL,
        CoreOptions.SPACING_LABEL_PORT_VERTICAL,
        CoreOptions.SPACING_NODE_SELF_LOOP,
        CoreOptions.SPACING_PORT_PORT,
      ];
    }
    return ElkCoreSpacingsBuilder.dependentSpacingOptionsCache;
  }

  /** The two `assert`s of the Java static initializer (ElkSpacings.java:78-81). */
  private static assertBaseSpacingDefault(): void {
    devAssert(
      () => ElkCoreSpacingsBuilder.BASE_SPACING_OPTION.getDefault() !== null,
      () => 'Base spacing default value must be non-null.',
    );
    // Avoid division by zero.
    devAssert(
      () =>
        !DoubleMath.fuzzyEquals(
          0.0,
          ElkCoreSpacingsBuilder.BASE_SPACING_OPTION.getDefault(),
          ElkCoreSpacingsBuilder.DOUBLE_EQ_EPSILON,
        ),
      () => 'Base spacing default value must be different from 0.0d.',
    );
  }

  /** Java: private constructor; only `ElkSpacings.withBaseValue` creates instances. */
  constructor(baseSpacing: number) {
    super(baseSpacing);
  }

  protected thisT(): ElkCoreSpacingsBuilder {
    return this;
  }

  protected getBaseSpacingOption(): IProperty<number> {
    return ElkCoreSpacingsBuilder.BASE_SPACING_OPTION;
  }

  protected getDependendSpacingOptions(): Iterable<IProperty<number>> {
    return ElkCoreSpacingsBuilder.dependentSpacingOptions();
  }
}
