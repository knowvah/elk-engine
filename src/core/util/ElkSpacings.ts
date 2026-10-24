// SPDX-License-Identifier: EPL-2.0
import { ElkCoreSpacingsBuilder } from './ElkSpacingsElkCoreSpacingsBuilder.js';

export { AbstractSpacingsBuilder } from './ElkSpacingsAbstractSpacingsBuilder.js';
export { ElkCoreSpacingsBuilder } from './ElkSpacingsElkCoreSpacingsBuilder.js';

/**
 * Utility class to conveniently configure core spacing values (`CoreOptions.SPACING_*`) for a graph element or a
 * whole graph.
 *
 * Note that individual layout algorithms may specify additional spacing values and may hence provide their own
 * utility class to configure those spacings. For layered this is definitely the case (`LayeredSpacings`).
 *
 * The nested Java classes `ElkCoreSpacingsBuilder` and `AbstractSpacingsBuilder` live in prefixed files
 * (`ElkSpacings*Builder.ts`) and are re-exported here.
 *
 * @see org.eclipse.elk.core/src/org/eclipse/elk/core/util/ElkSpacings.java
 */
export class ElkSpacings {
  private constructor() {}

  /**
   * Start constructing a new spacing configurator with the passed `baseSpacing` as base value for all other
   * spacing options. By default the values for other spacing options `o` will be determined based on the ratio
   * between {@link ElkCoreSpacingsBuilder.BASE_SPACING_OPTION}'s default value and `o`'s default value.
   */
  static withBaseValue(baseSpacing: number): ElkCoreSpacingsBuilder {
    return new ElkCoreSpacingsBuilder(baseSpacing);
  }
}
