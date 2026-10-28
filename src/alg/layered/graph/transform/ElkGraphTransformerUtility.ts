// SPDX-License-Identifier: EPL-2.0
import * as Strings from '../../../../guava/Strings.js';
import { type ElkGraphElement, isElkGraphElement } from '../../../../graph/ElkGraphElement.js';
import { InternalProperties } from '../../options/InternalProperties.js';
import type { LGraphElement } from '../LGraphElement.js';

/**
 * The "Utility" section of `ElkGraphTransformer` (decision X1): module functions so that `LGraphElement` can name
 * its origin without importing the transformer, whose importer closes an ESM cycle back to `LGraph`.
 * `ElkGraphTransformer.getOriginIdentifier` delegates here; this module never imports the transformer.
 *
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/graph/transform/ElkGraphTransformer.java
 */

/**
 * Returns an identifier string for the original ElkGraph element.
 *
 * @param element an LGraph element
 * @return the original identifier, or `null` if none is defined
 */
export function getOriginIdentifier(element: LGraphElement): string | null {
  const origin = element.getProperty(InternalProperties.ORIGIN);
  if (isElkGraphElement(origin)) {
    return getIdentifier(origin);
  }
  return null;
}

function getIdentifier(element: ElkGraphElement): string | null {
  const id = element.getIdentifier();
  if (!Strings.isNullOrEmpty(id)) {
    const container = element.eContainer();
    if (isElkGraphElement(container)) {
      const parentId = getIdentifier(container);
      if (parentId !== null) {
        return `${parentId}.${id}`;
      }
    }
    return id;
  }
  return null;
}
