// SPDX-License-Identifier: EPL-2.0
import type { Diagnostic } from './Diagnostic.js';

/**
 * The sink validators add their diagnostics to. EMF's `addAll`/`merge` are not reached.
 *
 * @see org.eclipse.emf.common/src/org/eclipse/emf/common/util/DiagnosticChain.java
 */
export interface DiagnosticChain {
  add(diagnostic: Diagnostic): void;
}
