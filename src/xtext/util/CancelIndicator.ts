// SPDX-License-Identifier: EPL-2.0

/**
 * What `LazyLinkingResource.resolveLazyCrossReferences` reads from a `CancelIndicator`.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/CancelIndicator.java
 */
export interface CancelIndicator {
  isCanceled(): boolean;
}

/**
 * `CancelIndicator.NullImpl`: never canceled.
 *
 * @see org.eclipse.xtext.util/src/org/eclipse/xtext/util/CancelIndicator.java
 */
export const NULL_CANCEL_INDICATOR: CancelIndicator = { isCanceled: (): boolean => false };
