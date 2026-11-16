// SPDX-License-Identifier: EPL-2.0

/**
 * Java's auto-unboxing of a boxed `Integer`, `Double` or `Boolean` (`intValue()`, `doubleValue()`, `booleanValue()`): a
 * `null` box throws a `NullPointerException`, which the port raises as a `TypeError` (elkgraph-model D10). TypeScript would
 * instead coerce `null` to 0 in arithmetic and comparisons. The message follows the HotSpot helpful NullPointerException
 * text; `source` names the expression that produced the null.
 *
 * @param value the boxed value as read (a `getProperty` of a property whose default is null yields `null`)
 * @param method the unboxing method of the box type, e.g. `java.lang.Integer.intValue()`
 * @param source the null expression, e.g. `the return value of "ElkNode.getProperty(IProperty)"`
 * @see https://docs.oracle.com/javase/specs/jls/se21/html/jls-5.html#jls-5.1.8
 */
export function unbox<T extends number | boolean>(value: T | null | undefined, method: string, source: string): T {
  if (value === null || value === undefined) {
    throw new TypeError(`Cannot invoke "${method}" because ${source} is null`);
  }
  return value;
}

/** `Integer` unboxing of a `getProperty` result (`Integer.intValue()`). */
export const unboxInteger = (value: number | null | undefined, source: string): number =>
  unbox(value, 'java.lang.Integer.intValue()', source);

/** `Double` unboxing of a `getProperty` result (`Double.doubleValue()`). */
export const unboxDouble = (value: number | null | undefined, source: string): number =>
  unbox(value, 'java.lang.Double.doubleValue()', source);

/** `Boolean` unboxing of a `getProperty` result (`Boolean.booleanValue()`). */
export const unboxBoolean = (value: boolean | null | undefined, source: string): boolean =>
  unbox(value, 'java.lang.Boolean.booleanValue()', source);

/** The `source` text of a `getProperty` call, the form every unboxing site of the tree bundles uses. */
export const PROPERTY_RETURN_VALUE = (holder: string): string =>
  `the return value of "${holder}.getProperty(org.eclipse.elk.graph.properties.IProperty)"`;
