// SPDX-License-Identifier: EPL-2.0
// Replays the JVM model vectors in test/golden/refs/java/graph.json (decision D9) against the TS
// ElkGraph model. Mirrors tools/vectors/GraphVectors.java op for op: the same op table, the same
// argument binding (the recorded step carries the bound arguments by name), the same result naming
// (an unknown section returned by an op becomes "<edgeId>.s<n>") and the same snapshot after every
// step (state, allContents, propertyKeys, properties). Exceptions: a thrown error is recorded as
// {class: error.name, message}; a TypeError is recorded as NullPointerException (decision D10:
// Java's NullPointerException is a TypeError here). Script errors (the generator's AssertionError)
// are ReplayScriptError and are never recorded.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ECollections } from '../../src/emf/common/util/ECollections.js';
import type { EList } from '../../src/emf/common/util/EList.js';
import type { InternalEObject } from '../../src/emf/ecore/InternalEObject.js';
import { BasicEObjectImpl } from '../../src/emf/ecore/impl/BasicEObjectImpl.js';
import { type EMapPropertyHolder, isEMapPropertyHolder } from '../../src/graph/EMapPropertyHolder.js';
import { type ElkConnectableShape, isElkConnectableShape } from '../../src/graph/ElkConnectableShape.js';
import { type ElkEdge, isElkEdge } from '../../src/graph/ElkEdge.js';
import { type ElkEdgeSection, isElkEdgeSection } from '../../src/graph/ElkEdgeSection.js';
import { isElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import { isElkLabel } from '../../src/graph/ElkLabel.js';
import { type ElkNode, isElkNode } from '../../src/graph/ElkNode.js';
import { isElkPort } from '../../src/graph/ElkPort.js';
import { isElkShape } from '../../src/graph/ElkShape.js';
import { ElkPropertyToValueMapEntryImpl } from '../../src/graph/impl/ElkPropertyToValueMapEntryImpl.js';
import { Property, compareStrings } from '../../src/graph/properties/Property.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';

/** The recorded JVM vectors, relative to this file. */
export const GRAPH_VECTORS_PATH: string = fileURLToPath(new URL('../golden/refs/java/graph.json', import.meta.url));

/** Ops the generator knows but this helper cannot run yet (`GraphIdentifierGenerator` lands in T10). */
export const UNSUPPORTED_OPS: readonly string[] = ['generateIdentifiers'];

/** A recorded exception: the Java simple class name and `getMessage()`. */
export interface ThrownRecord {
  class: string;
  message: string | null;
}

/** The snapshot recorded after every step (see the header of `GraphVectors.java`). */
export interface Snapshot {
  state: Record<string, Record<string, unknown>>;
  allContents: Record<string, Array<string> | null>;
  propertyKeys: Record<string, Array<string>>;
  properties: Record<string, Array<Array<unknown>>>;
}

/** What a step produced: `result` only when the op returns a value, `throws` only when it threw. */
export interface ReplayedStep extends Snapshot {
  result?: unknown;
  throws?: ThrownRecord;
}

/** A recorded step: the op, its bound arguments by name, and what it produced. */
export interface VectorStep extends ReplayedStep {
  op: string;
  readonly [argument: string]: unknown;
}

export interface Scenario {
  name: string;
  steps: VectorStep[];
}

export interface GraphVectors {
  jdk: string;
  elkCommit: string;
  scenarios: Scenario[];
}

/** A bug in a script or in this helper (the generator's `AssertionError`); never recorded as `throws`. */
export class ReplayScriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReplayScriptError';
  }
}

/** Returned by a handler whose op records no `result` (the generator's `VOID`). */
export const VOID: unique symbol = Symbol('VOID');

/** Script ids of one scenario, both directions; ids are never reused (`GraphVectors.Ctx`). */
export class ReplayContext {
  readonly byId = new Map<string, InternalEObject>();
  readonly ids = new Map<InternalEObject, string>();
  /** Per edge id, the number of sections named by {@link name} so far. */
  readonly autoNamed = new Map<string | null, number>();

  add(id: string, o: InternalEObject): void {
    if (this.byId.has(id) || this.ids.has(o)) {
      throw new ReplayScriptError(`id reused: ${id}`);
    }
    this.byId.set(id, o);
    this.ids.set(o, id);
  }

  obj(id: string | null): InternalEObject | null {
    const o = id === null ? undefined : this.byId.get(id);
    if (id !== null && o === undefined) {
      throw new ReplayScriptError(`unknown id ${id}`);
    }
    return o ?? null;
  }

  id(o: InternalEObject | null): string | null {
    const id = o === null ? undefined : this.ids.get(o);
    if (o !== null && id === undefined) {
      throw new ReplayScriptError(`unnamed element ${o.eClass().getName()}`);
    }
    return id ?? null;
  }

  /** Names an unknown section returned by an op: `<edgeId>.s<n>`. */
  name(o: InternalEObject): string | null {
    if (isElkEdgeSection(o) && !this.ids.has(o)) {
      const edge = this.id(o.eContainer());
      const n = (this.autoNamed.get(edge) ?? 0) + 1;
      this.autoNamed.set(edge, n);
      this.add(`${edge}.s${n}`, o);
    }
    return this.id(o);
  }

  /** The uncontained nodes created so far (the current graph roots), in creation order. */
  roots(): ElkNode[] {
    return [...this.byId.values()].filter((o): o is ElkNode => isElkNode(o) && o.eContainer() === null);
  }
}

/** Bound arguments of one step (`GraphVectors.Args`); `"~"` was recorded as `null`. */
export class StepArgs {
  constructor(
    readonly ctx: ReplayContext,
    readonly step: VectorStep,
  ) {}

  has(k: string): boolean {
    return Object.hasOwn(this.step, k);
  }

  str(k: string): string {
    return this.step[k] as string;
  }

  num(k: string): number {
    return this.step[k] as number;
  }

  bool(k: string): boolean {
    return this.step[k] as boolean;
  }

  el(k: string): InternalEObject {
    return this.ctx.obj(this.step[k] as string | null) as InternalEObject;
  }

  /**
   * The element bound to `k`, checked against `guard`. A `null` argument passes through untyped, as
   * in the generator: a method call on it then throws `TypeError` (Java's NPE).
   */
  as<T>(k: string, guard: (o: unknown) => o is T): T {
    const o = this.ctx.obj(this.step[k] as string | null);
    if (o !== null && !guard(o)) {
      throw new ReplayScriptError(`${k} is not a ${guard.name}`);
    }
    return o as T;
  }

  node(k: string): ElkNode {
    return this.as(k, isElkNode);
  }

  edge(k: string): ElkEdge {
    return this.as(k, isElkEdge);
  }

  section(k: string): ElkEdgeSection {
    return this.as(k, isElkEdgeSection);
  }

  shape(k: string): ElkConnectableShape {
    return this.as(k, isElkConnectableShape);
  }

  holder(k: string): EMapPropertyHolder {
    return this.as(k, isEMapPropertyHolder);
  }

  shapes(k: string): ElkConnectableShape[] {
    return (this.step[k] as string[]).map((id) => this.ctx.obj(id) as ElkConnectableShape);
  }

  /** The list feature `feature` of `owner` (the generator's `owner.eGet(feature)`). */
  list(): EList<InternalEObject> {
    const owner = this.el('owner');
    return listFeature(owner, this.str('feature'));
  }
}

/** A step interpreter: runs the step's op and returns its result, or {@link VOID}. */
export type OpHandler = (ctx: ReplayContext, step: VectorStep) => unknown;
export type OpTable = Record<string, OpHandler>;

const SHAPE_SCALARS = ['identifier', 'x', 'y', 'width', 'height'];
const SCALARS: Readonly<Record<string, readonly string[]>> = {
  ElkNode: SHAPE_SCALARS,
  ElkPort: SHAPE_SCALARS,
  ElkLabel: ['identifier', 'text', 'x', 'y', 'width', 'height'],
  ElkEdge: ['identifier'],
  ElkEdgeSection: ['identifier', 'startX', 'startY', 'endX', 'endY', 'incomingShape', 'outgoingShape'],
  ElkBendPoint: ['x', 'y'],
};
const LISTS: Readonly<Record<string, readonly string[]>> = {
  ElkNode: ['labels', 'ports', 'children', 'containedEdges', 'outgoingEdges', 'incomingEdges'],
  ElkPort: ['labels', 'outgoingEdges', 'incomingEdges'],
  ElkLabel: ['labels'],
  ElkEdge: ['labels', 'sources', 'targets', 'sections'],
  ElkEdgeSection: ['bendPoints', 'outgoingSections', 'incomingSections'],
  ElkBendPoint: [],
};
const WITH_TO_STRING: ReadonlySet<string> = new Set(['ElkNode', 'ElkPort', 'ElkEdge', 'ElkLabel']);

/** Calls the Java accessor of `feature` (`identifier` → `getIdentifier()`), the port's stand-in for `eGet`. */
function getFeature(o: InternalEObject, feature: string): unknown {
  const getter = `get${feature.charAt(0).toUpperCase()}${feature.slice(1)}`;
  const fn: unknown = Reflect.get(o, getter);
  if (typeof fn !== 'function') {
    throw new ReplayScriptError(`${o.eClass().getName()} has no feature ${feature}`);
  }
  return fn.call(o) as unknown;
}

function listFeature(owner: InternalEObject, feature: string): EList<InternalEObject> {
  if (!(LISTS[owner.eClass().getName()] ?? []).includes(feature)) {
    throw new ReplayScriptError(`${owner.eClass().getName()} has no list feature ${feature}`);
  }
  return getFeature(owner, feature) as EList<InternalEObject>;
}

function make(create: (a: StepArgs) => InternalEObject): OpHandler {
  return (ctx, step) => {
    const a = new StepArgs(ctx, step);
    const id = a.str('id');
    ctx.add(id, create(a));
    return VOID;
  };
}

function eff(effect: (a: StepArgs) => void): OpHandler {
  return (ctx, step) => {
    effect(new StepArgs(ctx, step));
    return VOID;
  };
}

function qry(query: (a: StepArgs) => unknown): OpHandler {
  return (ctx, step) => query(new StepArgs(ctx, step));
}

function setParent(a: StepArgs): void {
  const child = a.el('element');
  if (isElkNode(child)) {
    child.setParent(a.node('parent'));
  } else if (isElkPort(child)) {
    child.setParent(a.node('parent'));
  } else if (isElkLabel(child)) {
    child.setParent(a.as('parent', isElkGraphElement));
  } else {
    a.section('element').setParent(a.edge('parent'));
  }
}

function setIdentifier(a: StepArgs): void {
  const element = a.el('element');
  if (isElkGraphElement(element)) {
    element.setIdentifier(a.str('identifier'));
  } else {
    a.section('element').setIdentifier(a.str('identifier'));
  }
}

/** `listMove` with `from` is `EList.move(int, int)`; with `element` it is `EList.move(int, E)` (no result). */
function listMove(a: StepArgs): unknown {
  if (a.has('element')) {
    a.list().moveElement(a.num('to'), a.el('element'));
    return VOID;
  }
  return a.list().move(a.num('to'), a.num('from'));
}

/** `ECollections.sort(children, identifier descending by String.compareTo)`. */
function sortChildren(a: StepArgs): void {
  ECollections.sort(a.node('node').getChildren(), (x, y) =>
    compareStrings(y.getIdentifier() as string, x.getIdentifier() as string),
  );
}

const CREATION_OPS: OpTable = {
  createGraph: make(() => ElkGraphUtil.createGraph()),
  createNode: make((a) => ElkGraphUtil.createNode(a.node('parent'))),
  createPort: make((a) => ElkGraphUtil.createPort(a.node('parent'))),
  createLabel: make((a) =>
    a.has('text')
      ? ElkGraphUtil.createLabelWithText(a.str('text'), a.as('parent', isElkGraphElement))
      : ElkGraphUtil.createLabel(a.as('parent', isElkGraphElement)),
  ),
  createEdge: make((a) => ElkGraphUtil.createEdge(a.node('containingNode'))),
  createSimpleEdge: make((a) => ElkGraphUtil.createSimpleEdge(a.shape('source'), a.shape('target'))),
  createHyperedge: make((a) => ElkGraphUtil.createHyperedge(a.shapes('sources'), a.shapes('targets'))),
  createEdgeSection: make((a) => ElkGraphUtil.createEdgeSection(a.edge('edge'))),
  createBendPoint: make((a) =>
    a.has('x')
      ? ElkGraphUtil.createBendPoint(a.section('section'), a.num('x'), a.num('y'))
      : ElkGraphUtil.createBendPoint(a.section('section')),
  ),
};

const SETTER_OPS: OpTable = {
  setParent: eff(setParent),
  setContainingNode: eff((a) => a.edge('edge').setContainingNode(a.node('node'))),
  setIdentifier: eff(setIdentifier),
  setText: eff((a) => a.as('label', isElkLabel).setText(a.str('text'))),
  setLocation: eff((a) => a.as('shape', isElkShape).setLocation(a.num('x'), a.num('y'))),
  setDimensions: eff((a) => a.as('shape', isElkShape).setDimensions(a.num('width'), a.num('height'))),
  setStartLocation: eff((a) => a.section('section').setStartLocation(a.num('x'), a.num('y'))),
  setEndLocation: eff((a) => a.section('section').setEndLocation(a.num('x'), a.num('y'))),
  setIncomingShape: eff((a) => a.section('section').setIncomingShape(a.shape('shape'))),
  setOutgoingShape: eff((a) => a.section('section').setOutgoingShape(a.shape('shape'))),
};

const LIST_OPS: OpTable = {
  listAdd: qry((a) => a.list().add(a.el('element'))),
  listAddAt: eff((a) => a.list().addAt(a.num('index'), a.el('element'))),
  listSet: qry((a) => a.list().set(a.num('index'), a.el('element'))),
  listRemove: qry((a) => a.list().remove(a.el('element'))),
  listRemoveAt: qry((a) => a.list().removeAt(a.num('index'))),
  listMove: qry(listMove),
  listClear: eff((a) => a.list().clear()),
};

const PROPERTY_OPS: OpTable = {
  setProperty: eff((a) => a.holder('holder').setProperty(new Property<string>(a.str('key')), a.str('value'))),
  removeProperty: eff((a) => a.holder('holder').setProperty(new Property<string>(a.str('key')), null)),
  copyProperties: eff((a) => a.holder('holder').copyProperties(a.holder('source'))),
  sortChildren: eff(sortChildren),
};

const QUERY_OPS: OpTable = {
  updateContainment: eff((a) => ElkGraphUtil.updateContainment(a.edge('edge'))),
  findBestEdgeContainment: qry((a) => ElkGraphUtil.findBestEdgeContainment(a.edge('edge'))),
  containingGraph: qry((a) => ElkGraphUtil.containingGraph(a.as('element', isElkGraphElement))),
  findLowestCommonAncestor: qry((a) => ElkGraphUtil.findLowestCommonAncestor(a.node('node1'), a.node('node2'))),
  isDescendant: qry((a) => ElkGraphUtil.isDescendant(a.node('child'), a.node('ancestor'))),
  elementLabeledBy: qry((a) => ElkGraphUtil.elementLabeledBy(a.as('label', isElkLabel))),
  isHyperedge: qry((a) => a.edge('edge').isHyperedge()),
  isHierarchical: qry((a) => a.edge('edge').isHierarchical()),
  isSelfloop: qry((a) => a.edge('edge').isSelfloop()),
  isConnected: qry((a) => a.edge('edge').isConnected()),
  firstEdgeSection: qry((a) => ElkGraphUtil.firstEdgeSection(a.edge('edge'), a.bool('reset'), a.bool('removeOthers'))),
};

/** Every op of `GraphVectors.java` except {@link UNSUPPORTED_OPS}. */
export const DEFAULT_OPS: Readonly<OpTable> = {
  ...CREATION_OPS,
  ...SETTER_OPS,
  ...LIST_OPS,
  ...PROPERTY_OPS,
  ...QUERY_OPS,
};

function isRecord(o: unknown): o is Record<string, unknown> {
  return typeof o === 'object' && o !== null && !Array.isArray(o);
}

function isScenario(o: unknown): o is Scenario {
  return (
    isRecord(o) &&
    typeof o['name'] === 'string' &&
    Array.isArray(o['steps']) &&
    o['steps'].every((s: unknown) => isRecord(s) && typeof s['op'] === 'string' && isRecord(s['state']))
  );
}

/** Reads and shape-checks `graph.json`. */
export function loadGraphVectors(): GraphVectors {
  const parsed: unknown = JSON.parse(readFileSync(GRAPH_VECTORS_PATH, 'utf8'));
  if (!isRecord(parsed) || !Array.isArray(parsed['scenarios']) || !parsed['scenarios'].every(isScenario)) {
    throw new ReplayScriptError(`${GRAPH_VECTORS_PATH} is not a graph vector file`);
  }
  return parsed as unknown as GraphVectors;
}

/** The recorded outcome of a step, shaped like {@link ReplayedStep} (the arguments dropped). */
export function recordedStep(step: VectorStep): ReplayedStep {
  const { state, allContents, propertyKeys, properties } = step;
  const out: ReplayedStep = { state, allContents, propertyKeys, properties };
  if (Object.hasOwn(step, 'result')) {
    out.result = step.result;
  }
  if (step.throws !== undefined) {
    out.throws = step.throws;
  }
  return out;
}

function record(ctx: ReplayContext, o: InternalEObject): Record<string, unknown> {
  const cls = o.eClass().getName();
  const r: Record<string, unknown> = { class: cls, container: ctx.id(o.eContainer()) };
  for (const f of SCALARS[cls] ?? []) {
    const v = getFeature(o, f);
    r[f] = v instanceof BasicEObjectImpl ? ctx.id(v) : v;
  }
  const lists: Record<string, Array<string | null>> = {};
  for (const f of LISTS[cls] ?? []) {
    lists[f] = listFeature(o, f)
      .toArray()
      .map((x) => ctx.id(x));
  }
  r['lists'] = lists;
  r['toString'] = WITH_TO_STRING.has(cls) ? o.toString() : null;
  return r;
}

/** `eAllContents()` ids; `null` when the walk revisits an element (a containment cycle never ends). */
function allContentsOf(ctx: ReplayContext, root: InternalEObject): Array<string> | null {
  const out: string[] = [];
  const seen = new Set<InternalEObject>();
  for (const o of root.eAllContents()) {
    if (seen.has(o)) {
      return null;
    }
    seen.add(o);
    out.push(
      o instanceof ElkPropertyToValueMapEntryImpl
        ? `${ctx.id(o.eContainer())}#${o.getKey().getId()}`
        : (ctx.id(o) as string),
    );
  }
  return out;
}

function snapshot(ctx: ReplayContext): Snapshot {
  const s: Snapshot = { state: {}, allContents: {}, propertyKeys: {}, properties: {} };
  for (const [id, o] of ctx.byId) {
    s.state[id] = record(ctx, o);
    if (isElkNode(o) || !o.eContents().isEmpty()) {
      s.allContents[id] = allContentsOf(ctx, o);
    }
    if (isEMapPropertyHolder(o) && !o.getProperties().isEmpty()) {
      const entries = o.getProperties().entryList().toArray();
      s.propertyKeys[id] = entries.map((e) => e.getKey().getId());
      s.properties[id] = entries.map((e) => [e.getKey().getId(), e.getValue()]);
    }
  }
  return s;
}

/** D10: Java's `NullPointerException` is a `TypeError` here; every other class keeps its `name`. */
function thrownRecord(e: Error): ThrownRecord {
  return { class: e instanceof TypeError ? 'NullPointerException' : e.name, message: e.message };
}

function runStep(ctx: ReplayContext, handler: OpHandler, step: VectorStep): ReplayedStep {
  let outcome: { result?: unknown; throws?: ThrownRecord } = {};
  try {
    const result = handler(ctx, step);
    if (result !== VOID) {
      outcome = { result: result instanceof BasicEObjectImpl ? ctx.name(result) : result };
    }
  } catch (e) {
    if (e instanceof ReplayScriptError || !(e instanceof Error)) {
      throw e;
    }
    outcome = { throws: thrownRecord(e) };
  }
  return { ...outcome, ...snapshot(ctx) };
}

/**
 * Replays `scenario` step by step on a fresh context; `ops` adds or overrides handlers (T10 adds
 * `generateIdentifiers`). Throws before the first step when an op has no handler.
 */
export function replayScenario(scenario: Scenario, ops: Partial<OpTable> = {}): ReplayedStep[] {
  const table: Partial<OpTable> = { ...DEFAULT_OPS, ...ops };
  const missing = [...new Set(scenario.steps.map((s) => s.op).filter((op) => table[op] === undefined))];
  if (missing.length > 0) {
    throw new ReplayScriptError(`scenario ${scenario.name}: no handler for op ${missing.join(', ')}`);
  }
  const ctx = new ReplayContext();
  return scenario.steps.map((step) => runStep(ctx, table[step.op] as OpHandler, step));
}
