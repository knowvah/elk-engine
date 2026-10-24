// SPDX-License-Identifier: EPL-2.0
import type { ElkGraphElement } from '../../graph/ElkGraphElement.js';
import { isElkGraphElement } from '../../graph/ElkGraphElement.js';
import type { IProperty } from '../../graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../graph/properties/IPropertyHolder.js';
import { PROPERTY } from '../../graph/properties/MapPropertyHolder.js';
import * as DoubleMath from '../../guava/DoubleMath.js';
import * as ImmutableMap from '../../guava/ImmutableMap.js';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { JavaHashMap } from '../../java/util/JavaHashMap.js';
import type { IPropertyHolderOptionFilter } from '../LayoutConfigurator.js';
import { LayoutConfigurator } from '../LayoutConfigurator.js';
import type { IGraphElementVisitor } from './IGraphElementVisitor.js';

/**
 * An abstract builder to be extended to cater for the needs of individual layout algorithms when it comes to layout
 * options only they are aware of.
 *
 * `T` is the class of the inheriting builder itself. `factorMap` is a `JavaHashMap` with the `IProperty` hash
 * strategy (inventory row V2): `getFactors` and `build` iterate it in JVM `HashMap` order.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkSpacings.java
 */
export abstract class AbstractSpacingsBuilder<T extends AbstractSpacingsBuilder<T>> {
  /**
   * Delegates to {@link LayoutConfigurator.OPTION_TARGET_FILTER} if the holder is an {@link ElkGraphElement},
   * otherwise returns true.
   *
   * Required here since the base spacing builder class should not restrict itself to {@link ElkGraphElement}s
   * only and thus allows configuration for arbitrary {@link IPropertyHolder}s.
   *
   * Upstream oddity kept verbatim: the Java tests `property instanceof ElkGraphElement` (the *property*, not the
   * holder), which is never true, so the delegation never happens.
   */
  static readonly ELK_OPTION_TARGET_FILTER: IPropertyHolderOptionFilter = {
    accept: (holder, property) => {
      if (isElkGraphElement(property)) {
        return LayoutConfigurator.OPTION_TARGET_FILTER.accept(holder as ElkGraphElement, property);
      } else {
        return true;
      }
    },
  };

  /** Constant for fuzzy double comparisons. Upstream `10e-5` is `1e-4`; kept verbatim. */
  protected static readonly DOUBLE_EQ_EPSILON: number = 10e-5;

  // Internal builder configuration elements

  /**
   * The spacing layout option that shall serve as reference when deriving spacing values for all other spacing
   * layout options. In other words the ratio between this option's default value and a user-specified base
   * value for a "general spacings" yields a factor to be used for the other spacing layout option default values.
   */
  private readonly baseSpacing: number;
  /** Whether the resulting configurator shall overwrite existing spacing option values. */
  private overwrite = false;
  /** Filters to be applied by the resulting configurator. Elements specified directly here are always applied. */
  private readonly filters: IPropertyHolderOptionFilter[] = [AbstractSpacingsBuilder.ELK_OPTION_TARGET_FILTER];

  /**
   * Internal mapping of dependent layout options to factors that must be applied to those option's default
   * values when setting the spacing value for a concrete node.
   */
  private readonly factorMap: JavaHashMap<IProperty<number>, number> = new JavaHashMap<IProperty<number>, number>(
    PROPERTY,
  );

  /** Constructs a new builder and computes the initial factors based on the passed based value. */
  protected constructor(theBaseSpacing: number) {
    this.baseSpacing = theBaseSpacing;

    // Put the base spacing option in the map as well to allow iterating all options by using this map
    this.factorMap.put(this.getBaseSpacingOption(), 1.0);

    // Initially, and by default, set all factors to the ratio given by default values set in the Core.melk
    for (const option of this.getDependendSpacingOptions()) {
      const factor =
        this.getBaseSpacingOption().getDefault() !== null && option.getDefault() !== null
          ? option.getDefault() / this.getBaseSpacingOption().getDefault()
          : 1.0;
      this.factorMap.put(option, factor);
    }
  }

  // Protected

  /**
   * @return a spacing option that shall serve as the basis for the configuration, i.e. it will serve as basis to
   *         compute factors to be applied to other spacing values.
   */
  protected abstract getBaseSpacingOption(): IProperty<number>;

  /** @return a list of spacing options that shall be affected by the specified base value. */
  protected abstract getDependendSpacingOptions(): Iterable<IProperty<number>>;

  /** @return the filters that shall be applied during configuration. */
  protected getFilters(): IPropertyHolderOptionFilter[] {
    return this.filters;
  }

  /** @return type of the implementing class. */
  protected abstract thisT(): T;

  /** @return the factor to be used for `value` relative to the specified base spacing. */
  protected computeFactor(value: number): number {
    return value / this.baseSpacing;
  }

  // Public API

  /** @return an immutable map of the currently configured factors, in `factorMap` iteration order. */
  getFactors(): ReadonlyMap<IProperty<number>, number> {
    return ImmutableMap.copyOf(this.factorMap);
  }

  /**
   * Configure the `factor` to use for `spacingOption` relative to the configured base value.
   *
   * @return this instance.
   */
  withFactor(spacingOption: IProperty<number>, factor: number): T {
    if (!this.factorMap.containsKey(spacingOption)) {
      throw new IllegalArgumentException(`'${spacingOption.getId()}' is not a configurable spacing option.`);
    }
    if (factor < 0.0) {
      throw new IllegalArgumentException(`The factor for '${spacingOption.getId()}' must not be negative (${factor}).`);
    }
    if (spacingOption.getId() === this.getBaseSpacingOption().getId()) {
      throw new IllegalArgumentException(
        `'${spacingOption.getId()}' is the base spacing option not allowed to use with 'withFactor'.`,
      );
    }
    this.factorMap.put(spacingOption, factor);
    return this.thisT();
  }

  /**
   * Configure the `value` to use for `spacingOption` relative to the configured base value.
   *
   * @return this instance.
   */
  withValue(spacingOption: IProperty<number>, value: number): T {
    if (!this.factorMap.containsKey(spacingOption)) {
      throw new IllegalArgumentException(`'${spacingOption.getId()}' is not a configurable spacing option.`);
    }
    if (value < 0.0) {
      throw new IllegalArgumentException(`The value for '${spacingOption.getId()}' must not be negative (${value}).`);
    }
    if (spacingOption.getId() === this.getBaseSpacingOption().getId()) {
      throw new IllegalArgumentException(
        `'${spacingOption.getId()}' is the base spacing option not allowed to use with 'withValue'.`,
      );
    }
    this.factorMap.put(spacingOption, this.computeFactor(value));
    return this.thisT();
  }

  /**
   * If `shallOverwrite` is set to false, existing spacing option values will not be overwritten when configuring
   * an element.
   *
   * @return this instance.
   */
  withOverwrite(shallOverwrite: boolean): T {
    this.overwrite = shallOverwrite;
    return this.thisT();
  }

  /**
   * @return a function accepting a {@link IPropertyHolder} and applying the assembled spacing configuration to it
   *         when called.
   */
  build(): (holder: IPropertyHolder) => void {
    if (!this.overwrite) {
      this.filters.push(LayoutConfigurator.NO_OVERWRITE_HOLDER);
    }

    // Early exit if we are not allowed to overwrite any options and if the specified base matches the default
    // values anyway
    if (
      !this.overwrite &&
      DoubleMath.fuzzyEquals(
        this.baseSpacing,
        this.getBaseSpacingOption().getDefault(),
        AbstractSpacingsBuilder.DOUBLE_EQ_EPSILON,
      )
    ) {
      return () => {};
    }

    return (element) => {
      // Set each spacing option's value based on the computed factors. Remember that the base value option
      // is included in the map. Only apply to graph elements:
      //  - that actually support this option
      //  - for which the option has not been set so far
      for (const p of this.factorMap.keys()) {
        if (this.filters.every((filter) => filter.accept(element, p))) {
          element.setProperty(p, (this.factorMap.get(p) as number) * this.baseSpacing);
        }
      }
    };
  }

  /**
   * Apply the built configuration to the passed `holder`. Note that no hierarchy is traversed. Use an
   * {@link IGraphElementVisitor} returned by {@link toVisitor} for that.
   */
  apply(holder: IPropertyHolder): void {
    this.build()(holder);
  }

  /** @return a new {@link IGraphElementVisitor} that applies the built configuration to each node it visits. */
  toVisitor(): IGraphElementVisitor {
    const consumer = this.build();
    return { visit: (e) => consumer(e) };
  }
}
