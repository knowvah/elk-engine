// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { INode } from '../nodemodel/INode.js';
import type { EReferenceInfo } from '../scoping/EReferenceInfo.js';
import type { DiagnosticMessage } from './DiagnosticMessage.js';

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/diagnostics/IDiagnosticProducer.java
 */
export interface IDiagnosticProducer {
  addDiagnostic(message: DiagnosticMessage): void;

  getNode(): INode | null;

  setNode(node: INode | null): void;

  /** The Java feature parameter is an `EStructuralFeature`; the linker only passes references. */
  setTarget(object: EObject, feature: EReferenceInfo): void;
}
