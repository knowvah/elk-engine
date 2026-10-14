// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { IDiagnosticConsumer } from '../diagnostics/IDiagnosticConsumer.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/ILinker.java
 */
export interface ILinker {
  /**
   * Sets cross references in the passed object and its contents, using the cross-reference nodes the
   * parser recorded.
   *
   * @param model the root model of a resource
   * @param diagnosticsConsumer the consumer of linking diagnostics
   */
  linkModel(model: EObject, diagnosticsConsumer: IDiagnosticConsumer): void;
}
