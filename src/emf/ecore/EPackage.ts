// SPDX-License-Identifier: EPL-2.0
import type { EFactory } from './EFactory.js';

/**
 * The only `EPackage` member the port reads (decision D6): the factory that converts datatype
 * literals.
 *
 * @see org.eclipse.emf.ecore.EPackage
 */
export interface EPackage {
  getEFactoryInstance(): EFactory;
}
