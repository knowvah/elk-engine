// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import { parseDouble } from '../../../java/lang/JavaDouble.js';
import { valueOf as integerValueOf } from '../../../java/lang/JavaInteger.js';
import type { EDataType } from '../EDataType.js';
import type { EFactory } from '../EFactory.js';

/** Names of the Ecore datatypes the grammars reach (decision D6). */
export const EINT_NAME = 'EInt';
export const EDOUBLE_NAME = 'EDouble';
export const ESTRING_NAME = 'EString';

function invalidClassifier(eDataType: EDataType): IllegalArgumentException {
  return new IllegalArgumentException(`The datatype '${eDataType.getName()}' is not a valid classifier`);
}

/**
 * The `EInt`, `EDouble` and `EString` arms of the Ecore factory (decision D6); the Java switches on
 * the classifier id, which the minimal `EDataType` replaces with the datatype name.
 *
 * @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl
 */
export class EcoreFactoryImpl implements EFactory {
  /** @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl#createFromString(EDataType, String) */
  createFromString(eDataType: EDataType, literalValue: string | null): unknown {
    switch (eDataType.getName()) {
      case EDOUBLE_NAME:
        return this.createEDoubleFromString(eDataType, literalValue);
      case EINT_NAME:
        return this.createEIntFromString(eDataType, literalValue);
      case ESTRING_NAME:
        return this.createEStringFromString(eDataType, literalValue);
      default:
        throw invalidClassifier(eDataType);
    }
  }

  /** @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl#convertToString(EDataType, Object) */
  convertToString(eDataType: EDataType, instanceValue: unknown): string | null {
    switch (eDataType.getName()) {
      case EDOUBLE_NAME:
        return this.convertEDoubleToString(eDataType, instanceValue);
      case EINT_NAME:
        return this.convertEIntToString(eDataType, instanceValue);
      case ESTRING_NAME:
        return this.convertEStringToString(eDataType, instanceValue);
      default:
        throw invalidClassifier(eDataType);
    }
  }

  /** @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl#createEStringFromString(EDataType, String) */
  createEStringFromString(_metaObject: EDataType, initialValue: string | null): string | null {
    return initialValue;
  }

  /** @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl#convertEStringToString(EDataType, Object) */
  convertEStringToString(_metaObject: EDataType, instanceValue: unknown): string | null {
    return instanceValue as string | null; // Java `(String) instanceValue`; EString values are strings
  }

  /** @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl#createEIntFromString(EDataType, String) */
  createEIntFromString(_metaObject: EDataType, initialValue: string | null): number | null {
    return initialValue === null ? null : integerValueOf(initialValue);
  }

  /** @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl#convertEIntToString(EDataType, Object) */
  convertEIntToString(_metaObject: EDataType, instanceValue: unknown): string | null {
    return instanceValue === null ? null : String(instanceValue);
  }

  /** @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl#createEDoubleFromString(EDataType, String) */
  createEDoubleFromString(_metaObject: EDataType, initialValue: string | null): number | null {
    return initialValue === null ? null : parseDouble(initialValue);
  }

  /** @see org.eclipse.emf.ecore.impl.EcoreFactoryImpl#convertEDoubleToString(EDataType, Object) */
  convertEDoubleToString(_metaObject: EDataType, instanceValue: unknown): string | null {
    return instanceValue === null ? null : doubleToString(instanceValue as number); // Double.toString
  }
}
