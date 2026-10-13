// SPDX-License-Identifier: EPL-2.0
import * as JavaInteger from '../../src/java/lang/JavaInteger.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';
import type { Expr, LiteralExpr } from './ast.js';
import { ModelError, UnportedClassError } from './model-errors.js';
import {
  PORTED_ENUMS,
  callNoArgFactory,
  callNumberFactory,
  construct,
  isNumberFactory,
  encodeNative,
  isPortedClass,
  type NamedConstant,
  type PortedEnumClass,
} from './model-ported.js';
import { isEnumType, isKnownType, simpleName, type ValueKind } from './model-types.js';
import { encodeDouble, encodeInt, type EncodedValue } from './model-value.js';

/** The simple names an import list makes available, mapped to their qualified names. */
export type ImportScope = ReadonlyMap<string, string>;

/** What the evaluated value is assigned to: decides numeric widening and the element class of an `EnumSet`. */
export interface ValueTarget {
  readonly kind: ValueKind;
  readonly elementClass: string | null;
}

/** Class of the list a `#[...]` literal compiles to (`Collections.unmodifiableList(...)` in the Xbase output). */
const LIST_LITERAL_CLASS = 'UnmodifiableRandomAccessList';
const NAME_SEPARATOR = '.';
const ENUM_CONSTANT = /^[A-Z][A-Z0-9_]*$/;
const MAX_INT32_MAGNITUDE = 2147483648;

type JavaNumberType = 'int' | 'long' | 'float' | 'double';

/** A numeric value still waiting for the type it is assigned to. */
interface NumberValue {
  readonly k: 'num';
  readonly n: number;
  readonly jt: JavaNumberType;
}

interface EnumValue {
  readonly k: 'enum';
  readonly encoded: EncodedValue;
  /** The ported constant, or null when the enum is evaluated symbolically. */
  readonly constant: NamedConstant | null;
  readonly className: string;
}

interface ClassValue {
  readonly k: 'class';
  readonly name: string;
  readonly ported: PortedEnumClass | null;
}

type Evaluated =
  | NumberValue
  | EnumValue
  | ClassValue
  | { readonly k: 'value'; readonly value: EncodedValue }
  | { readonly k: 'native'; readonly value: unknown };

/** `import a.b.C` and `import a.b.C.D` make `C` and `D` available; the keyword escape `^` is dropped. */
export function buildImportScope(imports: readonly string[]): ImportScope {
  const scope = new Map<string, string>();
  for (const raw of imports) {
    const qualified = raw.replaceAll('^', '');
    scope.set(simpleName(qualified), qualified);
  }
  return scope;
}

/**
 * The class path of a referenced type relative to its package: the first capitalized segment of the import and
 * everything after it (`BoxLayoutProvider.PackingMode`), or the path as written when the type is not imported.
 */
export function classPath(typePath: readonly string[], scope: ImportScope): string {
  const first = typePath[0];
  const imported = first === undefined ? undefined : scope.get(first);
  if (imported === undefined) {
    return typePath.join(NAME_SEPARATOR);
  }
  const segments = imported.split(NAME_SEPARATOR);
  const start = segments.findIndex((segment) => /^[A-Z]/.test(segment));
  return [...segments.slice(Math.max(start, 0)), ...typePath.slice(1)].join(NAME_SEPARATOR);
}

/**
 * Evaluates an expression the way the generated Java would compute it for a value of the given target and encodes the
 * result. Widening rules (each follows the Java assignment conversions of the generated constant):
 * an `int` literal assigned to a `double` or `float` option is widened; an `Nf` literal is rounded to `float` first
 * and then widened to `double`; a plain or `Nd` decimal is a `double`; an `int` target accepts only `int` values.
 */
export function evaluate(expr: Expr, scope: ImportScope, target: ValueTarget): EncodedValue {
  return finalize(evaluateRaw(expr, scope), target);
}

function evaluateRaw(expr: Expr, scope: ImportScope): Evaluated {
  switch (expr.kind) {
    case 'literal':
      return evaluateLiteral(expr);
    case 'null':
      return { k: 'value', value: null };
    case 'unary':
      return negate(evaluateRaw(expr.operand, scope));
    case 'ref':
      return evaluateRef(expr.segments, scope);
    case 'new':
      return evaluateNew(simpleName(expr.type.name), expr.args, scope);
    case 'call':
      return evaluateCall(expr.receiver, expr.name, expr.args, scope);
    case 'list':
      return {
        k: 'value',
        value: {
          t: 'list',
          c: LIST_LITERAL_CLASS,
          items: expr.elements.map((element) => evaluate(element, scope, OTHER_TARGET)),
        },
      };
  }
}

const OTHER_TARGET: ValueTarget = { kind: 'other', elementClass: null };

function evaluateLiteral(literal: LiteralExpr): Evaluated {
  if (literal.type === 'boolean') {
    return { k: 'value', value: { t: 'bool', v: literal.raw === 'true' } };
  }
  if (literal.type === 'string') {
    return { k: 'value', value: { t: 'string', v: literal.raw } };
  }
  const n = Number(literal.raw.replaceAll('_', ''));
  if (Number.isNaN(n)) {
    throw new ModelError(`number literal '${literal.raw}' is not a number`);
  }
  return numberOf(n, literal);
}

function numberOf(n: number, literal: LiteralExpr): Evaluated {
  switch (literal.suffix) {
    case 'f':
      return { k: 'num', n: Math.fround(n), jt: 'float' };
    case 'd':
      return { k: 'num', n, jt: 'double' };
    case 'l':
      return { k: 'num', n, jt: 'long' };
    case null:
      return { k: 'num', n, jt: literal.type === 'int' ? 'int' : 'double' };
  }
}

function negate(operand: Evaluated): Evaluated {
  if (operand.k !== 'num') {
    throw new ModelError('unary minus needs a number');
  }
  return { k: 'num', n: operand.jt === 'int' || operand.jt === 'long' ? 0 - operand.n : -operand.n, jt: operand.jt };
}

function evaluateRef(segments: readonly string[], scope: ImportScope): Evaluated {
  const text = segments.join(NAME_SEPARATOR);
  if (text === 'Integer.MAX_VALUE') {
    return { k: 'num', n: JavaInteger.MAX_VALUE, jt: 'int' };
  }
  if (text === 'Integer.MIN_VALUE') {
    return { k: 'num', n: JavaInteger.MIN_VALUE, jt: 'int' };
  }
  const member = segments[segments.length - 1];
  const typePath = segments.slice(0, -1);
  if (member === undefined) {
    throw new ModelError('empty reference');
  }
  if (typePath.length === 0) {
    return classValue(member);
  }
  return ENUM_CONSTANT.test(member)
    ? enumConstant(typePath, member, scope)
    : staticFeature(`${simpleName(typePath.join(NAME_SEPARATOR))}.${member}`, text);
}

function classValue(name: string): Evaluated {
  const ported = PORTED_ENUMS.get(name) ?? null;
  if (ported === null) {
    throw new UnportedClassError(name, `the class literal '${name}'`);
  }
  return { k: 'class', name, ported };
}

function enumConstant(typePath: readonly string[], member: string, scope: ImportScope): Evaluated {
  const className = simpleName(typePath.join(NAME_SEPARATOR));
  if (!isEnumType(className)) {
    throw new UnportedClassError(className, `the constant '${member}'`);
  }
  const encoded: EncodedValue = { t: 'enum', c: classPath(typePath, scope), n: member };
  const constant = PORTED_ENUMS.get(className)?.valueOf(member) ?? null;
  return { k: 'enum', encoded, constant, className };
}

function staticFeature(key: string, text: string): Evaluated {
  const value = callNoArgFactory(key);
  if (value === undefined) {
    throw unresolved(key.slice(0, key.indexOf(NAME_SEPARATOR)), `'${text}'`);
  }
  return { k: 'native', value };
}

function unresolved(className: string, what: string): ModelError {
  return isKnownType(className) || isPortedClass(className)
    ? new UnportedClassError(className, what)
    : new ModelError(`${what} refers to the unknown class '${className}' (add it to model-types.ts)`);
}

function evaluateNew(className: string, args: readonly Expr[], scope: ImportScope): Evaluated {
  const value = construct(
    className,
    args.map((arg) => numberArgument(arg, scope)),
  );
  if (value === undefined) {
    throw unresolved(className, `'new ${className}(...)'`);
  }
  return { k: 'native', value };
}

function numberArgument(arg: Expr, scope: ImportScope): number {
  const evaluated = evaluateRaw(arg, scope);
  if (evaluated.k !== 'num') {
    throw new ModelError('a constructor or factory argument must be a number');
  }
  return evaluated.n;
}

function evaluateCall(receiver: readonly string[], name: string, args: readonly Expr[], scope: ImportScope): Evaluated {
  const className = simpleName(receiver.join(NAME_SEPARATOR));
  const key = `${className}.${name}`;
  if (key === 'EnumSet.of') {
    return { k: 'native', value: enumSetOf(args, scope) };
  }
  if (key === 'EnumSet.noneOf') {
    return { k: 'native', value: enumSetNoneOf(args, scope) };
  }
  const value =
    args.length === 0 && !isNumberFactory(key)
      ? callNoArgFactory(key)
      : callNumberFactory(key, numberArgument(onlyArgument(args), scope));
  if (value === undefined) {
    throw unresolved(className, `'${key}(...)'`);
  }
  return { k: 'native', value };
}

function onlyArgument(args: readonly Expr[]): Expr {
  const [first, ...rest] = args;
  if (first === undefined || rest.length > 0) {
    throw new ModelError('a static factory call takes exactly one number');
  }
  return first;
}

function enumSetOf(args: readonly Expr[], scope: ImportScope): unknown {
  const constants = args.map((arg) => {
    const evaluated = evaluateRaw(arg, scope);
    if (evaluated.k !== 'enum') {
      throw new ModelError('EnumSet.of needs enum constants');
    }
    if (evaluated.constant === null) {
      throw new UnportedClassError(evaluated.className, 'an EnumSet element');
    }
    return evaluated.constant;
  });
  const [first, ...rest] = constants;
  if (first === undefined) {
    throw new ModelError('EnumSet.of needs at least one constant');
  }
  return EnumSet.of(first, ...rest);
}

function enumSetNoneOf(args: readonly Expr[], scope: ImportScope): unknown {
  const evaluated = args.length === 1 ? evaluateRaw(onlyArgument(args), scope) : undefined;
  if (evaluated?.k !== 'class' || evaluated.ported === null) {
    throw new ModelError('EnumSet.noneOf needs a ported enum class literal');
  }
  return EnumSet.noneOf(evaluated.ported);
}

function finalize(evaluated: Evaluated, target: ValueTarget): EncodedValue {
  switch (evaluated.k) {
    case 'num':
      return finalizeNumber(evaluated, target.kind);
    case 'enum':
      return evaluated.encoded;
    case 'class':
      return { t: 'class', c: evaluated.name };
    case 'native':
      return encodeNative(evaluated.value, target.elementClass);
    case 'value':
      return checkValue(evaluated.value, target.kind);
  }
}

/** The value tags a target kind accepts; a kind that is not listed accepts any value. */
const ACCEPTED_TAGS: Readonly<Partial<Record<ValueKind, readonly string[]>>> = {
  boolean: ['bool'],
  string: ['string'],
  int: [],
  double: [],
  float: [],
};

function checkValue(value: EncodedValue, kind: ValueKind): EncodedValue {
  const accepted = ACCEPTED_TAGS[kind];
  if (value !== null && accepted !== undefined && !accepted.includes(value.t)) {
    throw new ModelError(`a ${value.t} value cannot be assigned to a ${kind} target`);
  }
  return value;
}

function finalizeNumber(value: NumberValue, kind: ValueKind): EncodedValue {
  const { n, jt } = value;
  if (jt === 'long') {
    throw new ModelError('long values have no encoding in the generator');
  }
  switch (kind) {
    case 'int':
      return finalizeInt(value);
    case 'double':
      return encodeDouble(n);
    case 'float':
      return encodeDouble(narrowToFloat(value));
    case 'other':
      return jt === 'int' ? finalizeInt(value) : encodeDouble(n);
    default:
      throw new ModelError(`a number cannot be assigned to a ${kind} target`);
  }
}

function finalizeInt(value: NumberValue): EncodedValue {
  if (value.jt !== 'int' || Math.abs(value.n) > MAX_INT32_MAGNITUDE || value.n === MAX_INT32_MAGNITUDE) {
    throw new ModelError(`${value.jt} value ${String(value.n)} cannot be assigned to an int target`);
  }
  return encodeInt(value.n);
}

function narrowToFloat(value: NumberValue): number {
  if (value.jt === 'double') {
    throw new ModelError('a double value cannot be assigned to a float target without a cast');
  }
  return Math.fround(value.n);
}

/**
 * The fully qualified name of a class written as `typePath` in a file: through the imports, as written when it starts
 * with a package segment, else in the given default package (the package of the generated class).
 */
export function qualifiedClassName(typePath: readonly string[], scope: ImportScope, defaultPackage: string): string {
  const first = typePath[0];
  const imported = first === undefined ? undefined : scope.get(first);
  if (imported !== undefined) {
    return [imported, ...typePath.slice(1)].join(NAME_SEPARATOR);
  }
  return /^[a-z]/.test(first ?? '')
    ? typePath.join(NAME_SEPARATOR)
    : [defaultPackage, ...typePath].join(NAME_SEPARATOR);
}
