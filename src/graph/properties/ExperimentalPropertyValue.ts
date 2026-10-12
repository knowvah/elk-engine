// SPDX-License-Identifier: EPL-2.0
import type { Ordinal } from '../../java/util/EnumSet.js';

// Java: the `@ExperimentalPropertyValue` annotation (runtime retention, target FIELD). TypeScript has no
// field annotations, so enumeration constants are marked in this registry instead (decision D7).
const EXPERIMENTAL = new Set<Ordinal>();

/**
 * Annotates enumeration constants as being experimental values for properties.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/ExperimentalPropertyValue.java
 */
export function markExperimental(e: Ordinal): void {
  EXPERIMENTAL.add(e);
}

/**
 * Whether the enumeration constant is annotated as an experimental value for properties.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/properties/ExperimentalPropertyValue.java
 */
export function isExperimental(e: Ordinal | null): boolean {
  return e !== null && EXPERIMENTAL.has(e);
}
