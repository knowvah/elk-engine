// SPDX-License-Identifier: EPL-2.0
import type { EDataType } from './EDataType.js';
import type { EFactory } from './EFactory.js';
import type { EPackage } from './EPackage.js';
import { EcoreFactoryImpl, EDOUBLE_NAME, EINT_NAME, ESTRING_NAME } from './impl/EcoreFactoryImpl.js';

const FACTORY: EFactory = new EcoreFactoryImpl();

const PACKAGE: EPackage = { getEFactoryInstance: (): EFactory => FACTORY };

function dataType(name: string): EDataType {
  return { getName: (): string => name, getEPackage: (): EPackage => PACKAGE };
}

/** The Ecore datatype literals the grammars reach (decision D6). */
export interface EcorePackageLiterals {
  readonly EINT: EDataType;
  readonly EDOUBLE: EDataType;
  readonly ESTRING: EDataType;
}

/** @see org.eclipse.emf.ecore.EcorePackage.Literals */
export const Literals: EcorePackageLiterals = {
  EINT: dataType(EINT_NAME),
  EDOUBLE: dataType(EDOUBLE_NAME),
  ESTRING: dataType(ESTRING_NAME),
};

/** The Ecore package (`EcorePackage.eINSTANCE`); only its factory is reachable. */
export const eINSTANCE: EPackage = PACKAGE;
