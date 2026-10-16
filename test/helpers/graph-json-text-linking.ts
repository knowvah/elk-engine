// SPDX-License-Identifier: EPL-2.0
// Shared by the .elkj linking replays (T12f, T13): the recorded rows of graph-json-text-parse.json and
// graph-json-text-inverse.json (ElkjParseVectors.java / ElkjInverseVectors.java headers), the model-order walk the
// recorders use for object paths, and the raw (non-resolving) snapshots.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { EObject } from '../../src/emf/ecore/EObject.js';
import type { InternalEObject } from '../../src/emf/ecore/InternalEObject.js';
import type { ResourceDiagnostic } from '../../src/emf/ecore/resource/Resource.js';
import type { ElkConnectableShape } from '../../src/graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ParseResourceDiagnostic } from '../../src/graph/json/text/linking/ElkGraphJsonLinkingServices.js';
import { XtextLinkingDiagnostic } from '../../src/xtext/linking/impl/XtextLinkingDiagnostic.js';

export const PARSE_REF = fileURLToPath(new URL('../golden/refs/java/graph-json-text-parse.json', import.meta.url));
export const INVERSE_REF = fileURLToPath(new URL('../golden/refs/java/graph-json-text-inverse.json', import.meta.url));
export const OUTSIDE = '<outside the graph>';

export interface RecordedDiagnostic {
  readonly kind: string;
  readonly severity: string;
  readonly message: string;
  readonly line: number;
  readonly javaClass: string;
}

export interface RecordedRef {
  readonly proxy?: true;
  readonly uriFragment?: string;
  readonly kind?: string;
  readonly id?: string | null;
  readonly path?: string;
}

export interface RecordedEdgeLinks {
  readonly path: string;
  readonly sources: readonly RecordedRef[];
  readonly targets: readonly RecordedRef[];
}

export interface RecordedProxies {
  readonly path: string;
  readonly sources: readonly (string | null)[];
  readonly targets: readonly (string | null)[];
}

export interface RecordedParseCase {
  readonly id: string;
  readonly input: string;
  readonly diagnosticsAtLoad: readonly RecordedDiagnostic[];
  readonly proxiesAtLoad: readonly RecordedProxies[];
  readonly links: readonly RecordedEdgeLinks[];
  readonly diagnosticsAfterLinks: readonly RecordedDiagnostic[];
  readonly diagnosticsAfterResolveOnly: readonly RecordedDiagnostic[];
  readonly diagnosticsAfterResolve: readonly RecordedDiagnostic[];
}

export interface RecordedShape {
  readonly path: string | null;
  readonly id: string | null;
  readonly kind: string;
  readonly proxy?: true;
  readonly uriFragment?: string;
  readonly outgoingEdges: readonly (string | null)[];
  readonly incomingEdges: readonly (string | null)[];
  readonly outgoingPaths: readonly string[];
  readonly incomingPaths: readonly string[];
}

export interface RecordedEdgeState {
  readonly path: string;
  readonly id: string | null;
  readonly sources: readonly RecordedRef[];
  readonly targets: readonly RecordedRef[];
}

export interface RecordedInverseState {
  readonly shapes?: readonly RecordedShape[];
  readonly edges?: readonly RecordedEdgeState[];
  readonly errors?: readonly string[];
  readonly throws: { readonly cls: string; readonly msg: string | null } | null;
}

export interface RecordedInverseCase {
  readonly id: string;
  readonly input: string;
  readonly afterLoad: RecordedInverseState;
  readonly afterAccess: RecordedInverseState;
  readonly afterResolve: RecordedInverseState;
  readonly afterExport: RecordedInverseState;
}

export function readParseCases(): RecordedParseCase[] {
  return (JSON.parse(readFileSync(PARSE_REF, 'utf8')) as { cases: RecordedParseCase[] }).cases;
}

export function readInverseCases(): RecordedInverseCase[] {
  return (JSON.parse(readFileSync(INVERSE_REF, 'utf8')) as { cases: RecordedInverseCase[] }).cases;
}

/** An element of the graph with its containment path, as the recorders' `Tree` lists them. */
export interface PathItem {
  readonly path: string;
  readonly element: EObject;
}

function joined(parent: string, feature: string, index: number): string {
  return `${parent === '' ? '' : `${parent}/`}${feature}[${index}]`;
}

function labelItems(owner: ElkGraphElement, path: string, out: PathItem[]): void {
  [...owner.getLabels()].forEach((label, i) => {
    const p = joined(path, 'labels', i);
    out.push({ path: p, element: label });
    labelItems(label, p, out);
  });
}

function nodeItems(node: ElkNode, path: string, out: PathItem[]): void {
  out.push({ path, element: node });
  labelItems(node, path, out);
  [...node.getPorts()].forEach((port, i) => {
    const p = joined(path, 'ports', i);
    out.push({ path: p, element: port });
    labelItems(port, p, out);
  });
  [...node.getChildren()].forEach((child, i) => nodeItems(child, joined(path, 'children', i), out));
  [...node.getContainedEdges()].forEach((edge, i) => {
    const p = joined(path, 'containedEdges', i);
    out.push({ path: p, element: edge });
    labelItems(edge, p, out);
    [...edge.getSections()].forEach((section, j) => out.push({ path: joined(p, 'sections', j), element: section }));
  });
}

/** Every element of the graph in the recorders' model order. */
export function modelItems(root: ElkNode): PathItem[] {
  const items: PathItem[] = [];
  nodeItems(root, '', items);
  return items;
}

export function edgeItems(items: readonly PathItem[]): { path: string; edge: ElkEdge }[] {
  return items.filter((i) => 'getSources' in i.element).map((i) => ({ path: i.path, edge: i.element as ElkEdge }));
}

export function pathIndex(items: readonly PathItem[]): ReadonlyMap<EObject, string> {
  return new Map(items.map((i) => [i.element, i.path] as const));
}

/** The recorded `ref`: a proxy by fragment, else kind, identifier and path of the element. */
export function describeRef(target: EObject, paths: ReadonlyMap<EObject, string>): RecordedRef {
  const internal = target as InternalEObject;
  if (internal.eIsProxy()) {
    return { proxy: true, uriFragment: internal.eProxyURI()?.fragment() ?? undefined };
  }
  return {
    kind: target.eClass().getName(),
    id: (target as ElkGraphElement).getIdentifier(),
    path: paths.get(target) ?? OUTSIDE,
  };
}

/** A many-valued reference list read without resolving, as `InternalEList.basicList()`. */
export interface BasicList {
  size(): number;
  basicGet(index: number): InternalEObject;
}

export function rawEntries(list: unknown): InternalEObject[] {
  const basic = list as BasicList;
  return Array.from({ length: basic.size() }, (_, i) => basic.basicGet(i));
}

export function rawSources(edge: ElkEdge): InternalEObject[] {
  return rawEntries(edge.getSources());
}

export function rawTargets(edge: ElkEdge): InternalEObject[] {
  return rawEntries(edge.getTargets());
}

export function rawOutgoing(shape: ElkConnectableShape): InternalEObject[] {
  return rawEntries(shape.getOutgoingEdges());
}

export function rawIncoming(shape: ElkConnectableShape): InternalEObject[] {
  return rawEntries(shape.getIncomingEdges());
}

/** The recorders' `fragment(target)`: the proxy URI fragment, `null` for a non-proxy. */
export function fragmentOf(target: InternalEObject): string | null {
  return target.eIsProxy() ? (target.eProxyURI()?.fragment() ?? null) : null;
}

/** `getErrors()` then `getWarnings()` in the recorded row shape. */
export function recordedDiagnostics(resource: {
  getErrors(): Iterable<ResourceDiagnostic>;
  getWarnings(): Iterable<ResourceDiagnostic>;
}): Omit<RecordedDiagnostic, 'javaClass'>[] {
  const row = (d: ResourceDiagnostic, severity: string): Omit<RecordedDiagnostic, 'javaClass'> => ({
    kind: d instanceof XtextLinkingDiagnostic ? 'linking' : d instanceof ParseResourceDiagnostic ? d.kind : 'syntax',
    severity,
    message: d.getMessage() ?? '',
    line: d.getLine(),
  });
  return [
    ...[...resource.getErrors()].map((d) => row(d, 'error')),
    ...[...resource.getWarnings()].map((d) => row(d, 'warning')),
  ];
}

export function withoutJavaClass(d: RecordedDiagnostic): Omit<RecordedDiagnostic, 'javaClass'> {
  return { kind: d.kind, severity: d.severity, message: d.message, line: d.line };
}

/** The proxies reachable from the edges' raw sources and targets, first-encounter order, after those in `known`. */
export function reachableProxies(
  items: readonly PathItem[],
  known: readonly InternalEObject[] = [],
): InternalEObject[] {
  const seen = new Set<InternalEObject>(known);
  const out = [...known];
  for (const { edge } of edgeItems(items)) {
    for (const target of [...rawSources(edge), ...rawTargets(edge)]) {
      if (target.eIsProxy() && !seen.has(target)) {
        seen.add(target);
        out.push(target);
      }
    }
  }
  return out;
}

function edgeId(edge: EObject): string | null {
  return (edge as ElkEdge).getIdentifier();
}

function shapeRow(path: string | null, shape: InternalEObject, paths: ReadonlyMap<EObject, string>): RecordedShape {
  const connectable = shape as unknown as ElkConnectableShape;
  const outgoing = rawOutgoing(connectable);
  const incoming = rawIncoming(connectable);
  const base = {
    path,
    id: shape.eIsProxy() ? null : (shape as unknown as ElkGraphElement).getIdentifier(),
    kind: shape.eClass().getName(),
    outgoingEdges: outgoing.map(edgeId),
    incomingEdges: incoming.map(edgeId),
    outgoingPaths: outgoing.map((e) => paths.get(e) ?? OUTSIDE),
    incomingPaths: incoming.map((e) => paths.get(e) ?? OUTSIDE),
  };
  return shape.eIsProxy() ? { ...base, proxy: true, uriFragment: fragmentOf(shape) ?? undefined } : base;
}

/**
 * The raw-read snapshot of `ElkjInverseVectors.state` (the recorder lists the proxies installed at load first, then
 * those that only appear later): every connectable shape in model order, then the proxies; every edge's raw
 * entries; the resource's error messages.
 */
export function inverseSnapshot(
  root: ElkNode,
  proxiesAtLoad: readonly InternalEObject[],
  errors: Iterable<ResourceDiagnostic>,
): Required<Pick<RecordedInverseState, 'shapes' | 'edges' | 'errors'>> {
  const items = modelItems(root);
  const paths = pathIndex(items);
  const shapes = items
    .filter((i) => 'getOutgoingEdges' in i.element)
    .map((i) => shapeRow(i.path, i.element as InternalEObject, paths));
  const proxies = reachableProxies(items, proxiesAtLoad).map((p) => shapeRow(null, p, paths));
  const edges = edgeItems(items).map(({ path, edge }) => ({
    path,
    id: edge.getIdentifier(),
    sources: rawSources(edge).map((t) => describeRef(t, paths)),
    targets: rawTargets(edge).map((t) => describeRef(t, paths)),
  }));
  return { shapes: [...shapes, ...proxies], edges, errors: [...errors].map((d) => d.getMessage() ?? '') };
}
