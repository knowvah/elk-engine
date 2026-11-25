// SPDX-License-Identifier: EPL-2.0
import * as DoubleToString from '../../../../java/lang/DoubleToString.js';
import * as JavaFloat from '../../../../java/lang/JavaFloat.js';
import type { Attribute } from '../dot/Attribute.js';
import { DotFactory } from '../dot/DotFactory.js';

/**
 * The attribute helpers of `DotExporter`: the four `createAttribute` overloads (public statics of the class, which
 * exposes them as `createAttribute`, `createAttributeInt`, `createAttributeFloat` and `createAttributeDouble`, since
 * `int`, `float` and `double` cannot be told apart at run time, translation rule 6.5) and the private static
 * `createString`. Split off `DotExporter.ts` for the 500-line limit; the edge label part uses them too.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */

/**
 * Create an attribute with given name and value for the Dot graph.
 *
 * @param name name of the attribute
 * @param value value of the attribute
 * @returns instance of a Dot attribute
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */
export function createAttribute(name: string, value: string | null): Attribute {
  const attribute = DotFactory.eINSTANCE.createAttribute();
  attribute.setName(name);
  attribute.setValue(value);
  return attribute;
}

/**
 * Create an attribute with given name and integer value for the Dot graph (Java `createAttribute(String, int)`):
 * `"\"" + value + "\""` with `Integer.toString`.
 *
 * @param name name of the attribute
 * @param value value of the attribute, a Java `int`
 * @returns instance of a Dot attribute
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */
export function createAttributeInt(name: string, value: number): Attribute {
  const attribute = DotFactory.eINSTANCE.createAttribute();
  attribute.setName(name);
  attribute.setValue(`"${String(value)}"`);
  return attribute;
}

/**
 * Create an attribute with given name and float value for the Dot graph (Java `createAttribute(String, float)`):
 * `"\"" + value + "\""` with `Float.toString`. No caller in this bundle.
 *
 * @param name name of the attribute
 * @param value value of the attribute, a Java `float`
 * @returns instance of a Dot attribute
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */
export function createAttributeFloat(name: string, value: number): Attribute {
  const attribute = DotFactory.eINSTANCE.createAttribute();
  attribute.setName(name);
  attribute.setValue(`"${JavaFloat.toString(value)}"`);
  return attribute;
}

/**
 * Create an attribute with given name and float value for the Dot graph (Java `createAttribute(String, double)`):
 * `"\"" + value + "\""` with `Double.toString`.
 *
 * @param name name of the attribute
 * @param value value of the attribute
 * @returns instance of a Dot attribute
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */
export function createAttributeDouble(name: string, value: number): Attribute {
  const attribute = DotFactory.eINSTANCE.createAttribute();
  attribute.setName(name);
  attribute.setValue(`"${DoubleToString.toString(value)}"`);
  return attribute;
}

/** first character that is not replaced by underscore. */
const MIN_OUT_CHAR = 32;
/** last character that is not replaced by underscore. */
const MAX_OUT_CHAR = 126;
const QUOTE = 0x22;
const BACKSLASH = 0x5c;
const NEWLINE = 0x0a;

/**
 * Creates a properly parseable string by adding the escape character '\\' wherever needed and replacing illegal
 * characters. Each UTF-16 code unit is a Java `char`.
 *
 * @param label a label string from the KGraph structure
 * @returns string to be used in the Graphviz model
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/transform/DotExporter.java
 */
export function createString(label: string): string {
  // prefix the label with an underscore to prevent it from being equal to
  // a keyword
  let escapeBuffer = '"';
  for (let i = 0; i < label.length; i++) {
    const c = label.charCodeAt(i);
    if (c === QUOTE || c === BACKSLASH || c > MAX_OUT_CHAR) {
      escapeBuffer += '_';
    } else if (c === NEWLINE) {
      escapeBuffer += '\\n';
    } else if (c >= MIN_OUT_CHAR) {
      escapeBuffer += label.charAt(i);
    }
  }
  escapeBuffer += '"';
  return escapeBuffer;
}
