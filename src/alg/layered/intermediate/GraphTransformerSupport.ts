// SPDX-License-Identifier: EPL-2.0
import { neg } from '../../../java/lang/Int32.js';
import type { LPort } from '../graph/LPort.js';
import { LayeredOptions } from '../options/LayeredOptions.js';

/**
 * Reverse the port index. Shared by the mirror and transpose groups of `GraphTransformer`.
 * `-index` of an `int` is `Int32.neg` (no `-0`).
 *
 * @param port a port
 * @see org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/GraphTransformer.java:860
 */
export function reverseIndex(port: LPort): void {
  const index = port.getProperty(LayeredOptions.PORT_INDEX);
  // the property has no default: the Java `Integer` is null when unset
  if (index !== null) {
    port.setProperty(LayeredOptions.PORT_INDEX, neg(index));
  }
}
