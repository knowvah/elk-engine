// SPDX-License-Identifier: EPL-2.0
import type { DotEObject } from '../../src/alg/graphviz/dot/dot/DotPackage.js';

/** An EMF enum value as `DotParseVectors` records it. */
export interface DumpedEnum {
  readonly enum: string;
  readonly name: string;
  readonly literal: string;
  readonly value: number;
}

/** A feature value of the dump: a string, a boolean, null, an enum, a contained object or a list of them. */
export type DumpedValue = string | boolean | null | DumpedEnum | DumpedObject | readonly DumpedObject[];

/**
 * The dump `D(object)` of `tools/vectors/DotParseVectors.java`: `eClass`, every feature of
 * `eClass().getEAllStructuralFeatures()` under its name, and `isSet`, the names of the features whose `eIsSet` is
 * true, in feature order.
 */
export interface DumpedObject {
  readonly eClass: string;
  readonly isSet: readonly string[];
  readonly [feature: string]: DumpedValue | readonly string[];
}

interface DotEnumerator {
  name(): string;
  getName(): string;
  getLiteral(): string;
  getValue(): number;
}

function isEnumerator(value: object): value is DotEnumerator {
  return typeof (value as Partial<DotEnumerator>).getLiteral === 'function';
}

function isIterable(value: object): value is Iterable<DotEObject> {
  return Symbol.iterator in value;
}

function dumpContainment(value: unknown): DumpedValue {
  if (value === null) return null;
  if (isIterable(value as object)) return [...(value as Iterable<DotEObject>)].map(dumpObject);
  return dumpObject(value as DotEObject);
}

function dumpAttribute(value: unknown, feature: string): DumpedValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'object' && isEnumerator(value)) {
    return { enum: value.name(), name: value.getName(), literal: value.getLiteral(), value: value.getValue() };
  }
  // the recorder fails on any other value type
  throw new Error(`unexpected value of feature ${feature}: ${String(value)}`);
}

function dumpObject(object: DotEObject): DumpedObject {
  const dump: Record<string, DumpedValue | readonly string[]> = { eClass: object.eClass().getName() };
  const isSet: string[] = [];
  for (const feature of object.eClass().getEAllStructuralFeatures()) {
    const value = object.eGet(feature.featureID, true, true);
    dump[feature.name] = feature.isContainment ? dumpContainment(value) : dumpAttribute(value, feature.name);
    if (object.eIsSet(feature.featureID)) isSet.push(feature.name);
  }
  dump['isSet'] = isSet;
  return dump as unknown as DumpedObject;
}

/**
 * Dumps a DOT model (normally a `GraphvizModel`, the root of a parse) in the shape of the `model` field of
 * `test/golden/refs/java/graphviz-dot-parse.json`; `null` (no contents) dumps as `null`.
 *
 * @param model the root object, or `null`
 * @returns the dump
 */
export function dumpModel(model: DotEObject | null): DumpedObject | null {
  return model === null ? null : dumpObject(model);
}
