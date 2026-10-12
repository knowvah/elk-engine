// SPDX-License-Identifier: EPL-2.0
import { EnumSet, type Ordinal } from '../../java/util/EnumSet.js';

/** Functional interface to specify a function that knows how to create a new instance of a particular class. */
export type NewInstanceFunction = () => unknown;

/** Functional interface to specify a function that knows how to clone a particular object. */
export type CloneFunction = (o: unknown) => unknown;

/** A class object (Java `Class<?>`): the constructor function that identifies the class at run time. */
export type ClassObject = abstract new (...args: never[]) => unknown;

// Registries are keyed by constructor function. They are `const` maps, not module-level mutable
// state in the sense of the module-globals fitness test: they only ever gain registrations.
const REGISTRY_NEW = new Map<object, NewInstanceFunction>();
// special treatment and no new instance function required for EnumSets, register clone here
// (the Java static block calls `registerClone`; `EnumSet`'s constructor is private here, so it
// cannot be passed as a `ClassObject` and the entry is seeded directly)
const REGISTRY_CLONE = new Map<object, CloneFunction>([[EnumSet, (es) => (es as EnumSet<Ordinal>).clone()]]);

/**
 * Register both a new instance function and a clone function for the passed `clazz`.
 *
 * Java's `clazz != null` guards are dropped: `clazz` is typed non-null here.
 */
function register(clazz: ClassObject, newFun: NewInstanceFunction | null, cloneFun: CloneFunction | null): void {
  if (newFun !== null) {
    REGISTRY_NEW.set(clazz, newFun);
  }
  if (cloneFun !== null) {
    REGISTRY_CLONE.set(clazz, cloneFun);
  }
}

/** Register a new instance function for the passed `clazz`. */
function registerNewInstance(clazz: ClassObject, newFun: NewInstanceFunction): void {
  register(clazz, newFun, null);
}

/** Register a clone function for the passed `clazz`. */
function registerClone(clazz: ClassObject, cloneFun: CloneFunction): void {
  register(clazz, null, cloneFun);
}

/**
 * If a {@link NewInstanceFunction} is registered for `clazz`, the function is called and the created instance
 * is returned.
 *
 * @return either a new instance of the requested class type or `null` if the class is unknown.
 */
function newInstance<T>(clazz: new () => T): T | null {
  const newFun = REGISTRY_NEW.get(clazz);
  if (newFun !== undefined) {
    // unchecked cast, as in Java: the registration is trusted to match its class
    return newFun() as T;
  } else {
    return null;
  }
}

/**
 * Clones the passed `clonee` if a {@link CloneFunction} is registered for `clonee`'s class.
 * Note that for {@link EnumSet}s an `instanceof` check is performed, for all other classes the
 * exact type has to be known. As in Java, a `null` or `undefined` `clonee` is a programmer error
 * and throws (`NullPointerException` there, `TypeError` here).
 *
 * @param clonee the object to clone
 * @return either a cloned version of `clonee` or `null` if `clonee`'s class is unknown.
 */
function clone<T>(clonee: T): T | null {
  // special treatment for EnumSets
  if (clonee instanceof EnumSet) {
    // the EnumSet entry is seeded above and never removed
    return (REGISTRY_CLONE.get(EnumSet) as CloneFunction)(clonee) as T;
  }

  const cloneFun = REGISTRY_CLONE.get((clonee as object).constructor);
  if (cloneFun !== undefined) {
    // unchecked cast, as in Java: the registration is trusted to match its class
    return cloneFun(clonee) as T;
  }
  return null;
}

/**
 * Port of the Java `instanceof Cloneable` test, which TypeScript cannot express. An object is
 * cloneable when it is an `Array`, `Set`, `Map` or {@link EnumSet}, has a `clone()` method, or
 * its class has a registered clone function (needed for `LinkedList` and `KVectorChain`, which
 * are `Cloneable` in Java but expose no `clone()` method here).
 */
function isCloneable(o: unknown): boolean {
  if (Array.isArray(o) || o instanceof Set || o instanceof Map || o instanceof EnumSet) {
    return true;
  }
  if (typeof o !== 'object' || o === null) {
    return false;
  }
  return typeof (o as { clone?: unknown }).clone === 'function' || REGISTRY_CLONE.has(o.constructor);
}

/**
 * Provides the means to register a new instance function and a clone function with class types. The functionality to
 * create new instances and clone objects of certain types is required by ELK's property mechanism. The rather
 * cumbersome solution to use this class is mandatory because we want to stay compatible with GWT which does not support
 * Java's reflection and clonable mechanisms. Otherwise using {@link Class#newInstance()} and retrieving a class's
 * `clone()` method via reflection would be enough.
 *
 * Special treatment is devoted to {@link EnumSet}s. To avoid having to register the concrete implementations of
 * {@link EnumSet}.
 *
 * ### Notes
 *
 * The class has to reside in the elk.graph plugin since it is used by the
 * {@link org.eclipse.elk.graph.properties.Property Property} class. The majority of necessary classes are
 * registered in the constructor of ELK's `LayoutMetaDataService`.
 *
 * The Java is a static utility class; this is the equivalent `const` object.
 *
 * @see org.eclipse.elk.graph/src/org/eclipse/elk/graph/util/ElkReflect.java
 */
export const ElkReflect: {
  readonly register: typeof register;
  readonly registerNewInstance: typeof registerNewInstance;
  readonly registerClone: typeof registerClone;
  readonly newInstance: typeof newInstance;
  readonly clone: typeof clone;
  readonly isCloneable: typeof isCloneable;
} = { register, registerNewInstance, registerClone, newInstance, clone, isCloneable };
