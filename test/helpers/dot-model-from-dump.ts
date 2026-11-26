// SPDX-License-Identifier: EPL-2.0
// Builds a DOT model from a model dump of test/golden/refs/java/graphviz-dot-parse.json (the dump D of
// tools/vectors/DotParseVectors.java: { eClass, <feature>: V... in getEAllStructuralFeatures() order, isSet }), with
// DotFactory.eINSTANCE and the generated setters only, so the writer's tests need no parser. A feature is set when
// the dump lists it in `isSet`; every other feature keeps its EMF default, which is what the dump shows for it.
import { AttributeType } from '../../src/alg/graphviz/dot/dot/AttributeType.js';
import { DotFactory } from '../../src/alg/graphviz/dot/dot/DotFactory.js';
import type { DotEObject } from '../../src/alg/graphviz/dot/dot/DotPackage.js';
import { EdgeOperator } from '../../src/alg/graphviz/dot/dot/EdgeOperator.js';
import { GraphType } from '../../src/alg/graphviz/dot/dot/GraphType.js';
import type { GraphvizModel } from '../../src/alg/graphviz/dot/dot/GraphvizModel.js';

/** An EMF enum in a dump. */
export interface DumpEnum {
  readonly enum: string;
  readonly name: string;
  readonly literal: string;
  readonly value: number;
}

/** One object of a dump. */
export interface DumpObject {
  readonly eClass: string;
  readonly isSet: readonly string[];
  readonly [feature: string]: DumpValue | readonly string[];
}

export type DumpValue = string | boolean | null | DumpEnum | DumpObject | readonly DumpObject[];

/** The setter (or containment list) of one feature of one class: what EMF's `eSet` would call. */
type Assign = (target: DotEObject, value: unknown) => void;

const set =
  (method: string): Assign =>
  (target, value) =>
    (target as unknown as Record<string, (v: unknown) => void>)[method]!(value);
const addAll =
  (getter: string): Assign =>
  (target, value) =>
    (target as unknown as Record<string, () => { addAll(v: unknown): void }>)[getter]!().addAll(value);

/** Per class: feature name -> how to store a built value (lists are added in order). */
const FEATURES: Readonly<Record<string, Readonly<Record<string, Assign>>>> = {
  GraphvizModel: { graphs: addAll('getGraphs') },
  Graph: { strict: set('setStrict'), type: set('setType'), name: set('setName'), statements: addAll('getStatements') },
  Attribute: { name: set('setName'), value: set('setValue') },
  NodeStatement: { node: set('setNode'), attributes: addAll('getAttributes') },
  Node: { name: set('setName'), port: set('setPort') },
  EdgeStatement: {
    sourceNode: set('setSourceNode'),
    edgeTargets: addAll('getEdgeTargets'),
    attributes: addAll('getAttributes'),
  },
  EdgeTarget: {
    operator: set('setOperator'),
    targetSubgraph: set('setTargetSubgraph'),
    targetnode: set('setTargetnode'),
  },
  AttributeStatement: { type: set('setType'), attributes: addAll('getAttributes') },
  Subgraph: { name: set('setName'), statements: addAll('getStatements') },
  Port: { name: set('setName'), compass_pt: set('setCompass_pt') },
};

/** The EMF enum of a feature, by `<class>.<feature>`. */
const ENUMS: Readonly<Record<string, (name: string) => unknown>> = {
  'Graph.type': (name) => GraphType.getByName(name),
  'EdgeTarget.operator': (name) => EdgeOperator.getByName(name),
  'AttributeStatement.type': (name) => AttributeType.getByName(name),
};

function create(eClass: string): DotEObject {
  const factory = DotFactory.eINSTANCE as unknown as Record<string, () => DotEObject>;
  const make = factory[`create${eClass}`];
  if (make === undefined) throw new Error(`no DotFactory method for ${eClass}`);
  return make.call(DotFactory.eINSTANCE);
}

function isDumpObject(value: DumpValue): value is DumpObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'eClass' in value;
}

function valueOf(dump: DumpObject, feature: string): unknown {
  const value = dump[feature] as DumpValue;
  if (Array.isArray(value)) return (value as readonly DumpObject[]).map((item) => objectFromDump(item));
  if (isDumpObject(value)) return objectFromDump(value);
  if (typeof value === 'object' && value !== null) {
    const toEnum = ENUMS[`${dump.eClass}.${feature}`];
    if (toEnum === undefined) throw new Error(`no enum for ${dump.eClass}.${feature}`);
    return toEnum((value as DumpEnum).name);
  }
  return value;
}

/** A fresh object (and its contents) from its dump. */
export function objectFromDump(dump: DumpObject): DotEObject {
  const target = create(dump.eClass);
  const features = FEATURES[dump.eClass];
  if (features === undefined) throw new Error(`no features for ${dump.eClass}`);
  for (const feature of dump.isSet) {
    const assign = features[feature];
    if (assign === undefined) throw new Error(`no feature ${dump.eClass}.${feature}`);
    assign(target, valueOf(dump, feature));
  }
  return target;
}

/** A fresh model from the `model` dump of a parse case. */
export function modelFromDump(dump: DumpObject): GraphvizModel {
  if (dump.eClass !== 'GraphvizModel') throw new Error(`not a model dump: ${dump.eClass}`);
  return objectFromDump(dump) as GraphvizModel;
}
