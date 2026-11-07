// SPDX-License-Identifier: EPL-2.0
import { identityHashCode } from '../../java/lang/IdentityHashCode.js';
import { toString as doubleToString } from '../../java/lang/DoubleToString.js';
import { JavaHashMap } from '../../java/util/JavaHashMap.js';
import { JavaHashSet } from '../../java/util/JavaHashSet.js';
import { LinkedList } from '../../java/util/LinkedList.js';

/**
 * The Java `Object.toString()` emulation behind `JsonDebugUtil.getValueRepresentation` (`JsonDebugUtil.java:611`,
 * decision G3a). The Java concatenates `value.toString()` of arbitrary property values; a TypeScript value must
 * produce the string Java would:
 *
 * - a class with a ported `toString` (enums by name, `KVector`, `ElkPadding`, `LNode`, `LPort`, `LEdge`,
 *   `LayoutAlgorithmData`, ...) uses it;
 * - `List`, `Set` and `Map` forms (`[a, b]`, `{k=v, ...}`) are built in iteration order (AbstractCollection and
 *   AbstractMap `toString`), elements converted by the same rules;
 * - a class without a Java `toString` prints `<fully qualified Java class name>@<hex identity hash>`
 *   (`Object.toString()`: `getClass().getName() + "@" + Integer.toHexString(hashCode())`, here the shim's
 *   `identityHashCode`).
 *
 * A `number` has no int/double distinction in JavaScript: the caller says (`isDouble`) for a top-level value, nested
 * numbers are `Integer` when they are int32 and `Double` otherwise (the only nested numbers in layered's properties are
 * ints, `Map<LNode, Integer>` for example).
 *
 * @see JsonDebugUtil.java:611
 */

/** The fully qualified Java names of classes without a `toString` override that occur as property values. */
const JAVA_CLASS_NAMES: Readonly<Record<string, string>> = {
  Random: 'java.util.Random',
  Spacings: 'org.eclipse.elk.alg.layered.options.Spacings',
  LabelCell: 'org.eclipse.elk.alg.common.nodespacing.cellsystem.LabelCell',
};

const HEX_RADIX = 16;
const NULL_TEXT = 'null';

/** Java `Object.toString()` for a value whose class has no `toString` override. */
function objectToString(value: object): string {
  const name = value.constructor.name;
  // an unlisted class keeps its simple name (the Java name is not known to the port)
  return `${JAVA_CLASS_NAMES[name] ?? name}@${identityHashCode(value).toString(HEX_RADIX)}`;
}

const isInt32 = (value: number): boolean => Number.isInteger(value) && (value | 0) === value;

function numberToString(value: number, isDouble: boolean): string {
  return isDouble || !isInt32(value) ? doubleToString(value) : String(value);
}

function joinEntries(entries: Iterable<[unknown, unknown]>): string {
  return `{${[...entries].map(([k, v]) => `${javaToString(k)}=${javaToString(v)}`).join(', ')}}`;
}

function collectionToString(elements: Iterable<unknown>): string {
  return `[${[...elements].map((element) => javaToString(element)).join(', ')}]`;
}

/** A Java collection or map of the port (container types without a `toString` of their own), or `undefined`. */
function containerToString(value: object): string | undefined {
  if (value instanceof Map || value instanceof JavaHashMap) {
    return joinEntries(value as Iterable<[unknown, unknown]>);
  }
  if (Array.isArray(value) || value instanceof Set || value instanceof JavaHashSet) {
    return collectionToString(value as Iterable<unknown>);
  }
  return undefined;
}

const hasOwnToString = (value: object): boolean => value.toString !== Object.prototype.toString;

/** A `LinkedList` prints as `AbstractCollection` unless a subclass overrides `toString` (`KVectorChain` does). */
function listToString(value: object): string | undefined {
  return value instanceof LinkedList && !hasOwnToString(value)
    ? collectionToString(value as Iterable<unknown>)
    : undefined;
}

/**
 * The string Java's `String.valueOf(value)` gives for a property value (`"null"` for `null`: nested elements may be
 * null; the top-level caller guards the Java NPE).
 *
 * @param value the value
 * @param isDouble whether a top-level `number` is a Java `Double`
 */
export function javaToString(value: unknown, isDouble = false): string {
  if (value === null || value === undefined) {
    return NULL_TEXT;
  }
  if (typeof value === 'number') {
    return numberToString(value, isDouble);
  }
  if (typeof value !== 'object') {
    return String(value);
  }
  return (
    containerToString(value) ??
    (hasOwnToString(value) ? value.toString() : (listToString(value) ?? objectToString(value)))
  );
}
