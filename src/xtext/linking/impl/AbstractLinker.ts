// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../../emf/ecore/EObject.js';
import type { IDiagnosticConsumer } from '../../diagnostics/IDiagnosticConsumer.js';
import type { ILinker } from '../ILinker.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/impl/AbstractLinker.java
 */
export abstract class AbstractLinker implements ILinker {
  abstract linkModel(model: EObject, diagnosticsConsumer: IDiagnosticConsumer): void;
}
