// SPDX-License-Identifier: EPL-2.0
import { checkCast, isString } from '../../../java/lang/JavaCast.js';
import { JavaClass } from '../../../java/lang/JavaClass.js';
import type { INode } from '../../nodemodel/INode.js';
import type { IValueConverter } from '../IValueConverter.js';

/**
 * A value converter that delegates to the `EFactory` of an `EDataType`. The only data type ELK reaches
 * is `EString` (the datatype rule `QualifiedId`), whose factory conversion is the identity in both
 * directions (`EcoreFactoryImpl.createEStringFromString` / `convertEStringToString`); that is the only
 * case ported. The primitive-null branch (`dataType.getInstanceClass().isPrimitive()`) and the
 * exception wrapper cannot trigger for `EString` (a non-primitive identity conversion).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/EFactoryValueConverter.java
 */
export class EFactoryValueConverter implements IValueConverter<string> {
  toString(value: string | null): string {
    // EcoreFactoryImpl.convertEStringToString: `(String) instanceValue`
    return checkCast(value, isString, JavaClass.String.javaName) as string;
  }

  toValue(string: string | null, _node: INode | null): string | null {
    return string;
  }
}
