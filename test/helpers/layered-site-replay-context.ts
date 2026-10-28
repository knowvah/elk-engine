// SPDX-License-Identifier: EPL-2.0
// The interpreter context of the layered site replay (tools/vectors/LayeredSiteVectors.java: Ctx, Encoder, Dump
// paths, exceptionOf): names <-> objects, auto naming ("x/<kind><k>"), step result encoding and the C4 property
// value encoder/decoder. A TS `number` is both a Java `int` and a `double`: an op that returns a Java `double`
// wraps it in {@link Dbl} (recorded as 16 hex digits), a plain `number` is an `int`.
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import {
  LEdgeAdapter,
  LGraphAdapter,
  LLabelAdapter,
  LNodeAdapter,
  LPortAdapter,
} from '../../src/alg/layered/graph/LGraphAdapters.js';
import { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { LLabel } from '../../src/alg/layered/graph/LLabel.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { LPort } from '../../src/alg/layered/graph/LPort.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { KVector } from '../../src/core/math/KVector.js';
import { KVectorChain } from '../../src/core/math/KVectorChain.js';
import { Spacing } from '../../src/core/math/Spacing.js';
import { IndividualSpacings } from '../../src/core/util/IndividualSpacings.js';
import { isElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import type { IPropertyHolder } from '../../src/graph/properties/IPropertyHolder.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';
import { encodeHex, decodeHex, type Hex } from './layered-framework-replay.js';
import { ENUM_TYPES, PROPS, type EnumClass, type EnumConstant } from './layered-site-replay-registry.js';

export type { Hex };

/** The first graph of a row without an ELK input, and the ELK root of a row with one. */
export const FIRST_GRAPH = 'g0';
export const ELK_ROOT = 'elk';
const AUTO = 'x/';
const MAX_DEPTH = 8;
const HASH_PATTERN = /@[0-9a-f]{3,}/g;
export const HASH_MARK = '@<hash>';

/** A replay (interpreter) error, never recorded as a row's expected exception. */
export class ReplayBug extends Error {}

/** A non-element result that gets a name (the step's label when it has none). */
export class Handle {
  constructor(readonly target: unknown) {}
}

/** A Java `double` result: recorded as 16 hex digits of its raw bits. */
export class Dbl {
  constructor(readonly value: number) {}
}

/** An already JSON-encoded result (raw ELK JSON, dumps, C4 values, plain lists and maps). */
export class Raw {
  constructor(readonly json: unknown) {}
}

export type Json = null | boolean | number | string | readonly Json[] | { readonly [key: string]: Json };
export type Dyn = Record<string, (...args: unknown[]) => unknown>;

/** Calls a method by name (the TS twin of a Java call on a type the interpreter picks at run time). */
export function dyn(target: unknown): Dyn {
  return target as Dyn;
}

export function isAdapter(o: unknown): boolean {
  return (
    o instanceof LGraphAdapter ||
    o instanceof LNodeAdapter ||
    o instanceof LPortAdapter ||
    o instanceof LLabelAdapter ||
    o instanceof LEdgeAdapter
  );
}

/** The adapted element (the Java reflects on the field "element"). */
export function adapted(adapter: unknown): unknown {
  return (adapter as { element: unknown }).element;
}

interface EnumLike {
  name(): string;
  ordinal(): number;
}

export function isEnumConstant(value: unknown): value is EnumLike & EnumConstant {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as EnumLike).name === 'function' &&
    typeof (value as EnumLike).ordinal === 'function'
  );
}

export const pair = (v: KVector): [Hex, Hex] => [encodeHex(v.x), encodeHex(v.y)];
export const quad = (s: Spacing): [Hex, Hex, Hex, Hex] => [
  encodeHex(s.top),
  encodeHex(s.right),
  encodeHex(s.bottom),
  encodeHex(s.left),
];

/** A scenario hex double. */
export function unhex(h: unknown): number {
  return decodeHex(h as Hex);
}

export function vector(value: unknown): KVector {
  const [x, y] = value as readonly [Hex, Hex];
  return new KVector(unhex(x), unhex(y));
}

/** Where Java dereferences null the port throws a `TypeError` (docs/conformance.md, 6b precedent; AD-16b and elkgraph-model D10, NPE -> TypeError: no shims for JVM errors nothing catches); AD-16 keeps the rest. */
const NULL_POINTER_EXCEPTION = 'NullPointerException';

/**
 * A thrown error as the recorder writes it: simple class name, message with object hashes masked. A JS `Error`
 * built without a message has no own `message` (Java: `getMessage()` is `null`); a `TypeError` is Java's NPE.
 */
export function exceptionOf(e: unknown): { exception: { class: string; message: string | null } } {
  const error = e as { name?: string; message?: unknown };
  const hasMessage = typeof e === 'object' && e !== null && Object.hasOwn(e, 'message');
  const message = hasMessage ? String(error.message).replace(HASH_PATTERN, HASH_MARK) : null;
  const name = e instanceof TypeError ? NULL_POINTER_EXCEPTION : (error.name ?? typeof e);
  return { exception: { class: name, message } };
}

function kindOf(o: unknown): string {
  if (o instanceof LGraph) {
    return 'g';
  } else if (o instanceof LNode) {
    return 'n';
  } else if (o instanceof LPort) {
    return 'p';
  } else if (o instanceof LEdge) {
    return 'e';
  }
  return o instanceof LLabel ? 'l' : o instanceof Layer ? 'layer' : 'o';
}

export class Ctx {
  /** The row's recorded `expected`: `enumInfo` replays the recorded zero-arg methods by name. */
  constructor(readonly recorded: Readonly<Record<string, unknown>>) {}

  readonly names = new Map<string, unknown>();
  readonly paths = new Map<object, string>();
  private readonly counters = new Map<string, number>();

  bind(o: unknown, name: string): string {
    const taken = this.names.get(name);
    if (taken !== undefined && taken !== o) {
      throw new ReplayBug(`name ${name} is already bound`);
    }
    const had = this.paths.get(o as object);
    if (had !== undefined && had !== name) {
      throw new ReplayBug(`object already named ${had}, cannot rename to ${name}`);
    }
    this.names.set(name, o);
    this.paths.set(o as object, name);
    return name;
  }

  bindAll(dumped: ReadonlyMap<object, string>): void {
    dumped.forEach((name, o) => this.bind(o, name));
  }

  get(name: string): unknown {
    const o = this.names.get(name);
    if (o === undefined) {
      throw new ReplayBug(`unknown name ${name}`);
    }
    return o;
  }

  /** The name of o; an object met for the first time is named x/<kind><k>, k counting the auto names of the kind. */
  pathOf(o: unknown): string {
    const known = this.paths.get(o as object);
    if (known !== undefined) {
      return known;
    }
    const kind = kindOf(o);
    let name: string;
    do {
      const k = this.counters.get(kind) ?? 0;
      this.counters.set(kind, k + 1);
      name = `${AUTO}${kind}${String(k)}`;
    } while (this.names.has(name));
    return this.bind(o, name);
  }

  /** The result of a step: a Handle, or the element a new<Class> op returns, is named by the step's label. */
  result(op: string, v: unknown, as: string | null): unknown {
    const target = v instanceof Handle ? v.target : v;
    const nameable = v instanceof Handle || (v instanceof LGraphElement && op.startsWith('new'));
    if (nameable && target !== null && target !== undefined && as !== null) {
      this.nameResult(target, as);
    }
    return this.value(v);
  }

  private nameResult(target: unknown, as: string): void {
    if (!this.paths.has(target as object)) {
      this.bind(target, as);
    } else if (!this.names.has(as)) {
      this.names.set(as, target);
    } else if (this.names.get(as) !== target) {
      throw new ReplayBug(`name ${as} is already bound`);
    }
  }

  /** A step result in the recorded encoding. */
  value(v: unknown): unknown {
    if (v === null || v === undefined || typeof v === 'boolean' || typeof v === 'string' || typeof v === 'number') {
      return v;
    }
    if (v instanceof Dbl) {
      return encodeHex(v.value);
    } else if (v instanceof Raw) {
      return v.json;
    } else if (v instanceof Handle) {
      return this.refOf(v.target);
    } else if (v instanceof LGraphElement) {
      return this.refOf(v);
    }
    return this.structured(v);
  }

  private structured(v: object): unknown {
    if (v instanceof KVector) {
      return pair(v);
    } else if (v instanceof Spacing) {
      return quad(v);
    } else if (isEnumConstant(v)) {
      return v.name();
    } else if (Symbol.iterator in v) {
      return [...(v as Iterable<unknown>)].map((x) => this.value(x));
    }
    return this.refOf(v);
  }

  refOf(o: unknown): unknown {
    if (o === null || o === undefined) {
      return null;
    }
    if (isAdapter(o)) {
      const adapter = this.pathOf(o);
      return { adapter, of: this.pathOf(adapted(o)) };
    }
    return this.pathOf(o);
  }

  // ---- property values (C4) ----

  /** A recorded C4 value (step argument) to the value it denotes. */
  decode(v: unknown): unknown {
    if (v === null || v === undefined) {
      return null;
    }
    if (Array.isArray(v)) {
      return v.map((x) => this.decode(x));
    }
    const m = v as Record<string, unknown>;
    if ('ref' in m) {
      return this.get(m.ref as string);
    }
    return this.decodeTagged(m);
  }

  private decodeTagged(m: Record<string, unknown>): unknown {
    switch (m.t) {
      case 'bool':
      case 'int':
      case 'string':
        return m.v;
      case 'double':
        return Number(m.v);
      case 'enum':
        return enumClass(m.c as string).valueOf(m.n as string);
      case 'set':
        return this.enumSet(m.c as string, m.items as readonly string[]);
      case 'chain':
        return new KVectorChain((m.v as readonly unknown[]).map(vector));
      case 'vector':
        return vector(m.v);
      case 'individualSpacings':
        return this.individualSpacings(m.v as Record<string, unknown>);
      default:
        throw new ReplayBug(`unknown value type ${String(m.t)}`);
    }
  }

  private enumSet(typeName: string, items: readonly string[]): unknown {
    const k = enumClass(typeName);
    const set = EnumSet.noneOf(k as never) as EnumSet<EnumConstant>;
    items.forEach((n) => set.add(k.valueOf(n)));
    return set;
  }

  private individualSpacings(v: Record<string, unknown>): IndividualSpacings {
    const spacings = new IndividualSpacings();
    for (const [id, x] of Object.entries(v)) {
      (spacings as IPropertyHolder).setProperty(property(id), this.decode(x));
    }
    return spacings;
  }

  // ---- property values (C4) encoder ----

  /** A TS property value in the C4 encoding (`Encoder.encode`, non-strict, element refs named by this context). */
  encode(v: unknown, depth: number): Json {
    if (v === null || v === undefined) {
      return null;
    }
    if (depth > MAX_DEPTH) {
      return { class: (v as object).constructor.name };
    }
    if (v instanceof LGraphElement) {
      return { ref: this.pathOf(v) };
    } else if (isElkGraphElement(v)) {
      return { elk: v.getIdentifier() };
    }
    return typeof v === 'object' ? this.encodeObject(v, depth) : this.encodeScalar(v);
  }

  private encodeScalar(v: unknown): Json {
    switch (typeof v) {
      case 'boolean':
        return { t: 'bool', v };
      case 'number':
        return { t: 'number', v };
      case 'string':
        return { t: 'string', v };
      default:
        return { class: typeof v };
    }
  }

  private encodeObject(v: object, depth: number): Json {
    if (isEnumConstant(v)) {
      return { t: 'enum', c: v.constructor.name, n: v.name() };
    } else if (v instanceof EnumSet) {
      const items = [...(v as EnumSet<EnumConstant>)];
      const c = items.length === 0 ? null : items[0]!.constructor.name;
      return { t: 'set', c, items: items.map((i) => i.name()) };
    } else if (v instanceof KVector) {
      return { t: 'obj', c: 'KVector', fields: { x: this.encode(v.x, depth + 1), y: this.encode(v.y, depth + 1) } };
    } else if (v instanceof Spacing) {
      return { t: 'obj', c: v.constructor.name, fields: this.spacingFields(v, depth) };
    } else if (Array.isArray(v) || v instanceof KVectorChain || v instanceof Set) {
      return this.collection(v as Iterable<unknown>, depth);
    }
    return { class: v.constructor.name };
  }

  private spacingFields(s: Spacing, depth: number): Record<string, Json> {
    return {
      top: this.encode(s.top, depth + 1),
      right: this.encode(s.right, depth + 1),
      bottom: this.encode(s.bottom, depth + 1),
      left: this.encode(s.left, depth + 1),
    };
  }

  private collection(c: Iterable<unknown>, depth: number): Json {
    const members = [...c];
    const isList = !(c instanceof Set);
    const refs = members.length > 0 && members.every((x) => x instanceof LGraphElement || isElkGraphElement(x));
    if (refs || (members.length === 0 && !isList)) {
      const items = members.map((x) => this.encode(x, depth + 1));
      return isList ? items : items.sort((a, b) => compareStrings(JSON.stringify(a), JSON.stringify(b)));
    }
    const name = c instanceof KVectorChain ? 'KVectorChain' : 'ArrayList';
    return { t: 'list', c: name, items: members.map((x) => this.encode(x, depth + 1)) };
  }
}

export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function enumClass(typeName: string): EnumClass {
  const k = ENUM_TYPES[typeName];
  if (k === undefined) {
    throw new ReplayBug(`unknown enum type ${typeName}`);
  }
  return k;
}

export function property(id: string): IProperty<unknown> {
  const p = PROPS.get(id);
  if (p === undefined) {
    throw new ReplayBug(`unknown property ${id}`);
  }
  return p;
}
