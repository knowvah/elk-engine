// SPDX-License-Identifier: EPL-2.0

/**
 * A class object (Java `Class<?>`) of a class or enum ported to TypeScript: the constructor function that
 * identifies the class at run time. Typed as `Function` so that classes with a private constructor (every
 * ported enum) qualify; `ElkReflect`'s narrower `ClassObject` is still accepted where a `new ()` is needed.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ClassObject = Function;

/** The class object of a `java.lang` type that has no TypeScript class: `Boolean`, `Integer`, ... */
export interface JavaLangClass {
  readonly kind: 'java.lang';
  /** The fully qualified Java name, e.g. `java.lang.Double`. */
  readonly javaName: string;
  /** The Java simple name, e.g. `Double`. */
  readonly simpleName: string;
}

/** The class object of a Java interface: a TypeScript interface has no run-time value, so it gets a token. */
export interface JavaInterfaceToken {
  readonly kind: 'interface';
  /** The Java simple name, e.g. `ILabelManager`. */
  readonly simpleName: string;
}

/** Any value a Java `Class<?>` is represented by (see {@link simpleNameOf}). */
export type JavaClassRef = ClassObject | JavaLangClass | JavaInterfaceToken;

const JAVA_LANG_PACKAGE = 'java.lang';

function javaLang(simpleName: string): JavaLangClass {
  return { kind: 'java.lang', javaName: `${JAVA_LANG_PACKAGE}.${simpleName}`, simpleName };
}

/**
 * The class objects of the `java.lang` types that appear as the class of a layout option, plus
 * `Object`. Each carries its Java name.
 */
export const JavaClass: {
  readonly Boolean: JavaLangClass;
  readonly Integer: JavaLangClass;
  readonly Double: JavaLangClass;
  readonly Float: JavaLangClass;
  readonly String: JavaLangClass;
  readonly Object: JavaLangClass;
} = {
  Boolean: javaLang('Boolean'),
  Integer: javaLang('Integer'),
  Double: javaLang('Double'),
  Float: javaLang('Float'),
  String: javaLang('String'),
  Object: javaLang('Object'),
};

/**
 * Creates the class object token of a Java interface; the interface's file exports it next to the
 * interface of the same name (declaration merging).
 *
 * @param simpleName the Java simple name of the interface
 * @returns the token
 */
export function javaInterface(simpleName: string): JavaInterfaceToken {
  return { kind: 'interface', simpleName };
}

/**
 * Java `Class.getSimpleName()`: the name without package and without the enclosing class
 * (`PackingMode` for `BoxLayoutProvider.PackingMode`).
 *
 * @param c a class object
 * @returns the simple name
 */
export function simpleNameOf(c: JavaClassRef): string {
  return typeof c === 'function' ? c.name : c.simpleName;
}

/**
 * Java `Class.isEnum()` for a class object: a ported enum is a class with a static `values()`.
 *
 * @param c a class object
 * @returns whether `c` is an enumeration class
 */
export function isEnum(c: JavaClassRef): c is ClassObject & EnumClassObject {
  return typeof c === 'function' && typeof (c as Partial<EnumClassObject>).values === 'function';
}

/** A Java enum constant in this port (translation-rules 6.3). */
export interface JavaEnum {
  ordinal(): number;
  name(): string;
  toString(): string;
}

/** The static side of a ported enum. */
export interface EnumClassObject {
  values(): readonly JavaEnum[];
}

/**
 * Java `Class.getEnumConstants()` for an enumeration class.
 *
 * @param c an enumeration class
 * @returns the constants in declaration order
 */
export function getEnumConstants(c: ClassObject & EnumClassObject): readonly JavaEnum[] {
  return c.values();
}

/**
 * Java `IDataObject.class.isAssignableFrom(c)`. `IDataObject` is a TypeScript interface, so the check
 * is structural: `c` is a class whose prototype has a `parse` function.
 *
 * @param c a class object
 * @returns whether instances of `c` are data objects
 */
export function isAssignableToDataObject(c: JavaClassRef): boolean {
  if (typeof c !== 'function') {
    return false;
  }
  return typeof (c.prototype as { parse?: unknown } | undefined)?.parse === 'function';
}
