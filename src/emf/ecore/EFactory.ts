// SPDX-License-Identifier: EPL-2.0
import type { EDataType } from './EDataType.js';

/**
 * The datatype conversions of `EFactory` (decision D6); `createFromString` throws as the Java does.
 *
 * @see org.eclipse.emf.ecore.EFactory
 */
export interface EFactory {
  createFromString(eDataType: EDataType, literalValue: string | null): unknown;
  convertToString(eDataType: EDataType, instanceValue: unknown): string | null;
}
