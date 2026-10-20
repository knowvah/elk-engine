// SPDX-License-Identifier: EPL-2.0
import type { EPackage } from './EPackage.js';

/**
 * The only `EDataType` members the port reads (decision D6): the datatype name and its package,
 * the path `DefaultTerminalConverter` takes to the factory.
 *
 * @see org.eclipse.emf.ecore.EDataType
 */
export interface EDataType {
  getName(): string;
  getEPackage(): EPackage;
}
