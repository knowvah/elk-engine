// SPDX-License-Identifier: EPL-2.0

/**
 * The only `EClass` member the port reads (decision D4): the metamodel class name. EMF is
 * EPL-2.0 (decision D1).
 *
 * @see org.eclipse.emf.ecore.EClass
 */
export interface EClass {
  getName(): string;
}
