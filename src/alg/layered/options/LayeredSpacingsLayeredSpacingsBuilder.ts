// SPDX-License-Identifier: EPL-2.0
import type { IProperty } from '../../../graph/properties/IProperty.js';
import * as DoubleMath from '../../../guava/DoubleMath.js';
import { devAssert } from '../../../java/lang/DevAssert.js';
import { AbstractSpacingsBuilder } from '../../../core/util/ElkSpacings.js';
import { LayeredOptions } from './LayeredOptions.js';

/**
 * Spacing configuration builder implementation for spacing options defined in {@link LayeredOptions}.
 *
 * The Java static initializer's two `assert`s (LayeredSpacings.java:84-89: non-null base default, base default
 * different from 0) run where the lazy static `DEPENDENT_SPACING_OPTIONS` is first evaluated, which is the nearest
 * TS counterpart of class initialisation: `LayeredOptions` is part of an ESM import cycle, so nothing may touch it
 * earlier (`ElkCoreSpacingsBuilder` precedent).
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/LayeredSpacings.java
 */
export class LayeredSpacingsBuilder extends AbstractSpacingsBuilder<LayeredSpacingsBuilder> {
  /** See `AbstractSpacingsBuilder.baseSpacing` for details. A static getter (ESM cycle with `LayeredOptions`). */
  static get BASE_SPACING_OPTION(): IProperty<number> {
    return LayeredOptions.SPACING_NODE_NODE;
  }

  /** Cached `DEPENDENT_SPACING_OPTIONS` (a lazy static: `LayeredOptions` is part of an ESM import cycle). */
  private static dependentSpacingOptionsCache: IProperty<number>[] | null = null;

  private static dependentSpacingOptions(): IProperty<number>[] {
    if (LayeredSpacingsBuilder.dependentSpacingOptionsCache === null) {
      // Java static initializer (LayeredSpacings.java:84-89), run on the first evaluation of the lazy static.
      LayeredSpacingsBuilder.assertBaseSpacingDefault();
      LayeredSpacingsBuilder.dependentSpacingOptionsCache = [
        // Sorted alphabetically
        // First the ones inherited from CoreOptions (with possibly overridden default value)
        LayeredOptions.SPACING_COMPONENT_COMPONENT,
        LayeredOptions.SPACING_EDGE_EDGE,
        LayeredOptions.SPACING_EDGE_LABEL,
        LayeredOptions.SPACING_EDGE_NODE,
        LayeredOptions.SPACING_LABEL_LABEL,
        LayeredOptions.SPACING_LABEL_NODE,
        LayeredOptions.SPACING_LABEL_PORT_HORIZONTAL,
        LayeredOptions.SPACING_LABEL_PORT_VERTICAL,
        LayeredOptions.SPACING_NODE_SELF_LOOP,
        LayeredOptions.SPACING_PORT_PORT,
        // Introduced by LayeredOptions
        LayeredOptions.SPACING_EDGE_EDGE_BETWEEN_LAYERS,
        LayeredOptions.SPACING_EDGE_NODE_BETWEEN_LAYERS,
        LayeredOptions.SPACING_NODE_NODE_BETWEEN_LAYERS,
      ];
    }
    return LayeredSpacingsBuilder.dependentSpacingOptionsCache;
  }

  /** The two `assert`s of the Java static initializer (LayeredSpacings.java:84-89). */
  private static assertBaseSpacingDefault(): void {
    devAssert(
      () => LayeredSpacingsBuilder.BASE_SPACING_OPTION.getDefault() !== null,
      () => 'Base spacing default value must be non-null.',
    );
    // Avoid division by zero.
    devAssert(
      () =>
        !DoubleMath.fuzzyEquals(
          0.0,
          LayeredSpacingsBuilder.BASE_SPACING_OPTION.getDefault(),
          LayeredSpacingsBuilder.DOUBLE_EQ_EPSILON,
        ),
      () => 'Base spacing default value must be different from 0.0d.',
    );
  }

  /** Java: private constructor; only `LayeredSpacings.withBaseValue` creates instances. */
  constructor(d: number) {
    super(d);
  }

  protected thisT(): LayeredSpacingsBuilder {
    return this;
  }

  protected getBaseSpacingOption(): IProperty<number> {
    return LayeredSpacingsBuilder.BASE_SPACING_OPTION;
  }

  /**
   * Note that the super implementation is not simply amended here but completely replaced to properly use the
   * default values from {@link LayeredOptions} for layout options inherited from `CoreOptions`.
   */
  protected getDependendSpacingOptions(): Iterable<IProperty<number>> {
    return LayeredSpacingsBuilder.dependentSpacingOptions();
  }
}
