// SPDX-License-Identifier: EPL-2.0
import { checkCast, isNumber } from '../../../../java/lang/JavaCast.js';
import { JavaClass } from '../../../../java/lang/JavaClass.js';
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import * as JavaDouble from '../../../../java/lang/JavaDouble.js';
import * as JavaMath from '../../../../java/lang/JavaMath.js';
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import { AbstractValueConverter } from '../../../../xtext/conversion/impl/AbstractValueConverter.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import type { INode } from '../../../../xtext/nodemodel/INode.js';
import * as Strings from '../../../../xtext/util/Strings.js';

/**
 * Converts the `Number` datatype rule to and from a double. Integral values print as an `int` (saturating,
 * so `1e10` prints `2147483647` and `-0.0` prints `0`); `NaN` is not integral and prints as `NaN`. The
 * Xtend `Math.floor(value) == value` compiles to a primitive `double` compare (xtend-gen
 * `NumberValueConverter.java:30`), under which `NaN == NaN` is false.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/conversion/NumberValueConverter.xtend
 */
export class NumberValueConverter extends AbstractValueConverter<number> {
  toString(value: number | null): string {
    // the JVM bridge of toString(Double) casts the erased value first
    checkCast(value, isNumber, JavaClass.Double.javaName);
    if (value === null) {
      throw new ValueConverterException('Double value may not be null.', null, null);
    }
    if (Math.floor(value) === value) {
      return String(JavaMath.d2i(value));
    }
    return doubleToString(value);
  }

  toValue(string: string | null, node: INode | null): number {
    if (Strings.isEmpty(string)) {
      throw new ValueConverterException('Cannot convert empty string to a double value.', node, null);
    }
    try {
      return JavaDouble.parseDouble(string);
    } catch (e) {
      if (e instanceof NumberFormatException) {
        throw new ValueConverterException(`Cannot convert '${string}' to a double value.`, node, e);
      }
      throw e;
    }
  }
}
