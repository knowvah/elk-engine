// SPDX-License-Identifier: EPL-2.0
import type { EObject } from '../../emf/ecore/EObject.js';
import type { DiagnosticMessage } from '../diagnostics/DiagnosticMessage.js';
import type { EReferenceInfo } from '../scoping/EReferenceInfo.js';
import type { IllegalNodeException } from './impl/IllegalNodeException.js';

/**
 * What a message provider reads about the reference being linked. `getReference` is `null` only for the
 * illegal-cross-reference message, where Java passes a `null` `EReference`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/ILinkingDiagnosticMessageProvider.java:30-36
 */
export interface ILinkingDiagnosticContext {
  getContext(): EObject;
  getReference(): EReferenceInfo | null;
  /** @throws IllegalNodeException when the link text cannot be converted */
  getLinkText(): string | null;
}

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/ILinkingDiagnosticMessageProvider.java
 */
export interface ILinkingDiagnosticMessageProvider {
  /** The error message for the unresolved cross link, or `null` if an unresolved reference is fine. */
  getUnresolvedProxyMessage(context: ILinkingDiagnosticContext): DiagnosticMessage | null;
}

/**
 * @see org.eclipse.xtext/src/org/eclipse/xtext/linking/ILinkingDiagnosticMessageProvider.java:38-47
 */
export interface ILinkingDiagnosticMessageProviderExtended extends ILinkingDiagnosticMessageProvider {
  getIllegalNodeMessage(context: ILinkingDiagnosticContext, ex: IllegalNodeException): DiagnosticMessage;

  /** `reference` stands for the Java `CrossReference` grammar element: the name of its feature. */
  getIllegalCrossReferenceMessage(context: ILinkingDiagnosticContext, reference: string): DiagnosticMessage;

  getViolatedBoundsConstraintMessage(context: ILinkingDiagnosticContext, size: number): DiagnosticMessage;

  getViolatedUniqueConstraintMessage(context: ILinkingDiagnosticContext): DiagnosticMessage;
}
