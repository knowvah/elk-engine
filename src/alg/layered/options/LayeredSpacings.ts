// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionDataTarget } from '../../../core/data/LayoutOptionDataTarget.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../../graph/properties/IPropertyHolder.js';
import { LEdge } from '../graph/LEdge.js';
import { LGraph } from '../graph/LGraph.js';
import { LLabel } from '../graph/LLabel.js';
import { LNode } from '../graph/LNode.js';
import { LPort } from '../graph/LPort.js';
import { LayeredSpacingsBuilder } from './LayeredSpacingsLayeredSpacingsBuilder.js';

export { LayeredSpacingsBuilder } from './LayeredSpacingsLayeredSpacingsBuilder.js';

/**
 * Utility class to conveniently configure core spacing values (`LayeredOptions.SPACING_*`) for a graph element or a
 * whole graph.
 *
 * The nested Java class `LayeredSpacingsBuilder` lives in `LayeredSpacingsLayeredSpacingsBuilder.ts` and is
 * re-exported here.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/options/LayeredSpacings.java
 */
export class LayeredSpacings {
  private constructor() {}

  /**
   * Start constructing a new spacing configurator with the passed `baseSpacing` as base value for all other
   * spacing options. By default the values for other spacing options `o` will be determined based on the ratio
   * between `ElkCoreSpacingsBuilder.BASE_SPACING_OPTION`'s default value and `o`'s default value.
   */
  static withBaseValue(baseSpacing: number): LayeredSpacingsBuilder {
    return new LayeredSpacingsBuilder(baseSpacing);
  }

  /** Mimics the behavior of `LayoutConfigurator.OPTION_TARGET_FILTER`, just for the {@link LGraph}. */
  static readonly OPTION_TARGET_FILTER = (e: IPropertyHolder, property: IProperty<unknown>): boolean => {
    const optionData = LayoutMetaDataService.getInstance().getOptionData(property.getId());
    if (optionData !== null) {
      const targets = optionData.getTargets();
      if (e instanceof LGraph) {
        return targets.contains(LayoutOptionDataTarget.NODES) || targets.contains(LayoutOptionDataTarget.PARENTS);
      } else if (e instanceof LNode) {
        return targets.contains(LayoutOptionDataTarget.NODES);
      } else if (e instanceof LEdge) {
        return targets.contains(LayoutOptionDataTarget.EDGES);
      } else if (e instanceof LPort) {
        return targets.contains(LayoutOptionDataTarget.PORTS);
      } else if (e instanceof LLabel) {
        return targets.contains(LayoutOptionDataTarget.LABELS);
      }
    }
    return true;
  };
}
