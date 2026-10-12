// SPDX-License-Identifier: EPL-2.0
import type { Ordinal } from '../../java/util/EnumSet.js';

// Java: the `@AdvancedPropertyValue` annotation (runtime retention, target FIELD). TypeScript has no
// field annotations, so enumeration constants are marked in this registry instead (decision D7).
const ADVANCED = new Set<Ordinal>();

/**
 * Annotates enumeration constants as being advanced values for properties.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/AdvancedPropertyValue.java
 */
export function markAdvanced(e: Ordinal): void {
  ADVANCED.add(e);
}

/**
 * Whether the enumeration constant is annotated as an advanced value for properties.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/AdvancedPropertyValue.java
 */
export function isAdvanced(e: Ordinal | null): boolean {
  return e !== null && ADVANCED.has(e);
}
