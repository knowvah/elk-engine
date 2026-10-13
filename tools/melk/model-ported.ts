// SPDX-License-Identifier: EPL-2.0
import { ElkMargin } from '../../src/core/math/ElkMargin.js';
import { ElkPadding } from '../../src/core/math/ElkPadding.js';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { ContentAlignment } from '../../src/core/options/ContentAlignment.js';
import { NodeLabelPlacement } from '../../src/core/options/NodeLabelPlacement.js';
import { PortLabelPlacement } from '../../src/core/options/PortLabelPlacement.js';
import { SizeConstraint } from '../../src/core/options/SizeConstraint.js';
import { SizeOptions } from '../../src/core/options/SizeOptions.js';
import { ExclusiveBounds } from '../../src/core/util/ExclusiveBounds.js';
import { EnumSet, type Ordinal } from '../../src/java/util/EnumSet.js';
import { ModelError } from './model-errors.js';
import { encodeDouble, type EncodedValue } from './model-value.js';

/** A constant of a ported enum. */
export interface NamedConstant extends Ordinal {
  name(): string;
}

/** A ported enum class: the constants by name, in declaration order. */
export interface PortedEnumClass {
  values(): readonly NamedConstant[];
  valueOf(name: string): NamedConstant;
}

/**
 * The enums of `src/` whose constants a `.melk` expression may put into an `EnumSet`. Every other enum is evaluated
 * symbolically (its constant is only named in the dump).
 */
export const PORTED_ENUMS: ReadonlyMap<string, PortedEnumClass> = new Map<string, PortedEnumClass>([
  ['ContentAlignment', ContentAlignment],
  ['NodeLabelPlacement', NodeLabelPlacement],
  ['PortLabelPlacement', PortLabelPlacement],
  ['SizeConstraint', SizeConstraint],
  ['SizeOptions', SizeOptions],
]);

/** Constructors of ported classes, called with the evaluated numeric arguments. */
type PortedConstructor = new (...args: never[]) => unknown;

const PORTED_CONSTRUCTORS: ReadonlyMap<string, PortedConstructor> = new Map<string, PortedConstructor>([
  ['ElkMargin', ElkMargin],
  ['ElkPadding', ElkPadding],
  ['KVector', KVector],
  ['KVectorChain', KVectorChain],
]);

/** Static factories of ported classes that take only numbers; the key is `Class.method`. */
const NUMBER_FACTORIES: ReadonlyMap<string, (x: number) => unknown> = new Map<string, (x: number) => unknown>([
  ['ExclusiveBounds.greaterThan', (x) => ExclusiveBounds.greaterThan(x)],
  ['ExclusiveBounds.lessThan', (x) => ExclusiveBounds.lessThan(x)],
]);

/** Argument-free static factories of ported classes (also written without parentheses); key `Class.method`. */
const NO_ARG_FACTORIES: ReadonlyMap<string, () => unknown> = new Map<string, () => unknown>([
  ['ContentAlignment.topLeft', () => ContentAlignment.topLeft()],
  ['NodeLabelPlacement.fixed', () => NodeLabelPlacement.fixed()],
  ['PortLabelPlacement.outside', () => PortLabelPlacement.outside()],
]);

/** True when a ported class with this simple name provides constructors, factories or constants. */
export function isPortedClass(name: string): boolean {
  return (
    PORTED_ENUMS.has(name) ||
    PORTED_CONSTRUCTORS.has(name) ||
    [...NUMBER_FACTORIES.keys(), ...NO_ARG_FACTORIES.keys()].some((key) => key.startsWith(`${name}.`))
  );
}

/** Calls `new Class(...numbers)` of a ported class, or returns `undefined` when the class is not in the table. */
export function construct(className: string, args: readonly number[]): unknown {
  const ctor = PORTED_CONSTRUCTORS.get(className);
  return ctor === undefined ? undefined : Reflect.construct(ctor, args);
}

/** True when `Class.method` is a static factory that takes one number. */
export function isNumberFactory(key: string): boolean {
  return NUMBER_FACTORIES.has(key);
}

/** Calls `Class.method(number)` of a ported class, or returns `undefined` when it is not in the table. */
export function callNumberFactory(key: string, arg: number): unknown {
  return NUMBER_FACTORIES.get(key)?.(arg);
}

/** Calls the argument-free `Class.method()` of a ported class, or returns `undefined` when it is not in the table. */
export function callNoArgFactory(key: string): unknown {
  return NO_ARG_FACTORIES.get(key)?.();
}

function encodeFields(source: object, names: readonly string[]): Record<string, EncodedValue> {
  const fields: Record<string, EncodedValue> = {};
  for (const name of names) {
    const value: unknown = Reflect.get(source, name);
    if (typeof value !== 'number') {
      throw new ModelError(`field '${name}' of ${source.constructor.name} is not a number`);
    }
    fields[name] = encodeDouble(value);
  }
  return fields;
}

const SPACING_FIELDS = ['top', 'bottom', 'left', 'right'];

function encodeObject(value: unknown): EncodedValue | undefined {
  if (value instanceof ElkPadding) {
    return { t: 'obj', c: 'ElkPadding', fields: encodeFields(value, SPACING_FIELDS) };
  }
  if (value instanceof ElkMargin) {
    return { t: 'obj', c: 'ElkMargin', fields: encodeFields(value, SPACING_FIELDS) };
  }
  if (value instanceof KVector) {
    return { t: 'obj', c: 'KVector', fields: encodeFields(value, ['x', 'y']) };
  }
  if (value instanceof ExclusiveBounds.ExclusiveLowerBound) {
    return { t: 'obj', c: 'ExclusiveLowerBound', fields: encodeFields(value, ['exclusiveLowerBound']) };
  }
  if (value instanceof ExclusiveBounds.ExclusiveUpperBound) {
    return { t: 'obj', c: 'ExclusiveUpperBound', fields: encodeFields(value, ['exclusiveUpperBound']) };
  }
  return undefined;
}

/**
 * Encodes a value computed by a ported class into the C4 form. The element class of an `EnumSet` is not recoverable
 * from the set (it may be empty), so the caller passes the option's declared element class.
 *
 * @throws ModelError when the value has no row in the C4 table (stop condition 6).
 */
export function encodeNative(value: unknown, elementClass: string | null): EncodedValue {
  if (value instanceof EnumSet) {
    if (elementClass === null) {
      throw new ModelError('an EnumSet value needs an option of type EnumSet<E> to name its element class');
    }
    const items = [...(value as EnumSet<NamedConstant>)].map((constant) => constant.name());
    return { t: 'set', c: elementClass, items };
  }
  if (value instanceof KVectorChain) {
    return { t: 'list', c: 'KVectorChain', items: [...value].map((vector) => encodeNative(vector, null)) };
  }
  const encoded = encodeObject(value);
  if (encoded === undefined) {
    throw new ModelError('a value computed by a ported class has no row in the C4 encoding');
  }
  return encoded;
}
