// SPDX-License-Identifier: EPL-2.0
// Ops of the layered site replay, part 3 (tools/vectors/LayeredSiteVectors.java: registerTransformOps,
// registerElkOps, registerEnumOps): ElkGraphTransformer, ElkGraphLayoutTransferrer, LayeredLayoutProvider, the ELK
// graph helpers, the hierarchy-aware probe and enum reflection.
import { readdirSync, readFileSync } from 'node:fs';
import { ElkLayered } from '../../src/alg/layered/ElkLayered.js';
import { isHierarchyAwareLayoutProcessor } from '../../src/alg/layered/IHierarchyAwareLayoutProcessor.js';
import { LayeredLayoutProvider } from '../../src/alg/layered/LayeredLayoutProvider.js';
import { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import { ElkGraphLayoutTransferrer } from '../../src/alg/layered/graph/transform/ElkGraphLayoutTransferrer.js';
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../src/core/util/IElkProgressMonitor.js';
import { GsonBuilder } from '../../src/gson/GsonBuilder.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import { isElkConnectableShape, type ElkConnectableShape } from '../../src/graph/ElkConnectableShape.js';
import { isElkGraphElement, type ElkGraphElement } from '../../src/graph/ElkGraphElement.js';
import { isElkNode, type ElkNode } from '../../src/graph/ElkNode.js';
import { JsonExporter } from '../../src/graph/json/JsonExporter.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { Random } from '../../src/java/util/Random.js';
import { findImportTarget } from './layered-framework-replay.js';
import { dumpWithPropertyValues } from './layered-site-replay-dump.js';
import { Args, assignPaths, type Op } from './layered-site-replay-args.js';
import { Handle, Raw, ReplayBug, dyn, exceptionOf, type Json } from './layered-site-replay-context.js';
import { ENUM_INFO_CLASSES, type EnumClass, type EnumConstant } from './layered-site-replay-registry.js';

/** `org.eclipse.elk.graph.json.exportSeed=1` of the oracle (J4). */
const EXPORT_SEED = 1;
const NO_SUCH_CONSTANT = 'NO_SUCH_CONSTANT';
const CANCELLED = 'cancelled';
/** Gson's lenient writer emits non-finite doubles as bare tokens: in number-token positions they become strings. */
const NON_FINITE = /"(?:[^"\\]|\\.)*"|([:,[]\s*)(-?Infinity|NaN)(?![A-Za-z0-9])/g;

/** The recorder's `strictNumbers`. */
export function strictNumbers(json: string): string {
  return json.replace(NON_FINITE, (match: string, lead?: string, token?: string) =>
    lead === undefined ? match : `${lead}"${String(token)}"`,
  );
}

/** The NS1 export (omitLayout false, omitZeroDimension false, omitZeroPositions false, unknown options omitted). */
export function exportElkText(root: ElkNode): string {
  const exporter = new JsonExporter(new Random(EXPORT_SEED));
  exporter.setOptions(false, false, false, true, true);
  const gson = new GsonBuilder().disableHtmlEscaping().create();
  return strictNumbers(gson.toJson(exporter.export(root)));
}

/** A monitor that reports itself cancelled. */
class CancelledMonitor extends BasicProgressMonitor {
  override isCanceled(): boolean {
    return true;
  }
}

function onElkNode(a: Args): ElkNode {
  const o = a.onObject();
  if (!isElkNode(o)) {
    throw new ReplayBug(`receiver ${String(a.on)} is not an ElkNode`);
  }
  return o;
}

function onElkEdge(a: Args): ElkEdge {
  return a.onObject() as ElkEdge;
}

function connectableShape(a: Args, i: number): ElkConnectableShape {
  const o = a.c.get(a.s(i));
  if (!isElkConnectableShape(o)) {
    throw new ReplayBug(`argument ${String(i)} is not an ElkConnectableShape`);
  }
  return o;
}

// ---- the layered classes that implement IHierarchyAwareLayoutProcessor (a jar scan in Java, a source scan here) ----

const LAYERED_SOURCE = new URL('../../src/alg/layered/', import.meta.url);
const LAYERED_PACKAGE = 'org.eclipse.elk.alg.layered';
const IMPLEMENTS_HIERARCHY_AWARE = /\bimplements\b[^{]*\bIHierarchyAwareLayoutProcessor\b/;

function sourceFiles(directory: URL): URL[] {
  const found: URL[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      found.push(...sourceFiles(new URL(`${entry.name}/`, directory)));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      found.push(new URL(entry.name, directory));
    }
  }
  return found;
}

/** The binary names (org.eclipse.elk.alg.layered...) of the ported classes declared hierarchy aware, sorted. */
export function hierarchyAwareClasses(): string[] {
  const root = LAYERED_SOURCE.pathname;
  return sourceFiles(LAYERED_SOURCE)
    .filter((file) => IMPLEMENTS_HIERARCHY_AWARE.test(readFileSync(file, 'utf8')))
    .map((file) => `${LAYERED_PACKAGE}.${file.pathname.slice(root.length, -'.ts'.length).replaceAll('/', '.')}`)
    .sort();
}

/** Whether the TS port has the source file of a Java layered class (a staged class has none). */
export function isPorted(binaryName: string): boolean {
  const relative = binaryName.slice(`${LAYERED_PACKAGE}.`.length).replaceAll('.', '/');
  try {
    readFileSync(new URL(`${relative}.ts`, LAYERED_SOURCE));
    return true;
  } catch {
    return false;
  }
}

export const TRANSFORM_OPS: Readonly<Record<string, Op>> = {
  // new ElkGraphTransformer().importGraph(root or the node whose identifier is targetId)
  importGraph: (a) => {
    const root = onElkNode(a);
    const target = a.isNull(0) ? undefined : a.s(0);
    const graph = new ElkGraphTransformer().importGraph(findImportTarget(root, target));
    a.c.bindAll(assignPaths(graph));
    return graph;
  },
  // T1's whole-graph dump under system property exportSeed=1
  dumpLGraph: (a) => new Raw(dumpWithPropertyValues(a.onG()) as unknown as Json),
  // new ElkGraphTransformer().applyLayout(lgraph)
  applyLayout: (a) => {
    new ElkGraphTransformer().applyLayout(a.onG());
    return null;
  },
  // ElkGraphLayoutTransferrer.applyLayoutNonMutating(lgraph) <h> (an ElkNode)
  applyLayoutNonMutating: (a) => new Handle(ElkGraphLayoutTransferrer.applyLayoutNonMutating(a.onG())),
  // the NS1 ELK JSON export, raw
  exportElk: (a) => new Raw(JSON.parse(exportElkText(onElkNode(a))) as Json),
  // ElkGraphTransformer.getOriginIdentifier(LGraphElement)
  getOriginIdentifier: (a) => ElkGraphTransformer.getOriginIdentifier(a.onAs(LGraphElement)),
  // new LayeredLayoutProvider().layout(root, monitor) with a BasicProgressMonitor, or a cancelled one
  layout: (a) => {
    const monitor: IElkProgressMonitor = a.s(0) === CANCELLED ? new CancelledMonitor() : new BasicProgressMonitor();
    new LayeredLayoutProvider().layout(onElkNode(a), monitor);
    return null;
  },
  // the sorted binary names of every class assignable to IHierarchyAwareLayoutProcessor
  hierarchyAwareClasses: () => new Raw(hierarchyAwareClasses()),
  // instanceof IHierarchyAwareLayoutProcessor for a new instance
  isHierarchyAware: (a) => {
    switch (a.s(0)) {
      case 'LayeredLayoutProvider':
        return isHierarchyAwareLayoutProcessor(new LayeredLayoutProvider());
      case 'ElkLayered':
        return isHierarchyAwareLayoutProcessor(new ElkLayered());
      default:
        throw new ReplayBug(`unknown class ${a.s(0)}`);
    }
  },
};

function identifiedElement(root: ElkNode, id: string): ElkGraphElement {
  if (root.getIdentifier() === id) {
    return root;
  }
  for (const element of (root as unknown as { eAllContents(): Iterable<unknown> }).eAllContents()) {
    if (isElkGraphElement(element) && element.getIdentifier() === id) {
      return element;
    }
  }
  throw new ReplayBug(`no ELK element with identifier ${id}`);
}

export const ELK_OPS: Readonly<Record<string, Op>> = {
  // ElkGraphUtil.createGraph() <h>
  newElkGraph: () => new Handle(ElkGraphUtil.createGraph()),
  // ElkGraphUtil.createNode(ElkNode parent) <h>
  newElkNode: (a) => new Handle(ElkGraphUtil.createNode(onElkNode(a))),
  // ElkGraphUtil.createEdge(ElkNode parent) <h>
  newElkEdge: (a) => new Handle(ElkGraphUtil.createEdge(onElkNode(a))),
  // setIdentifier(String)
  elkSetIdentifier: (a) => {
    (a.onObject() as ElkGraphElement).setIdentifier(a.s(0));
    return null;
  },
  // setDimensions(double, double)
  elkSetDimensions: (a) => {
    onElkNode(a).setDimensions(a.d(0), a.d(1));
    return null;
  },
  // getSources().add(shape)
  elkAddSource: (a) => {
    onElkEdge(a).getSources().add(connectableShape(a, 0));
    return null;
  },
  // getTargets().add(shape)
  elkAddTarget: (a) => {
    onElkEdge(a).getTargets().add(connectableShape(a, 0));
    return null;
  },
  // the ElkGraphElement of the ELK root whose getIdentifier() is id <h>
  elkFind: (a) => new Handle(identifiedElement(onElkNode(a), a.s(0))),
};

// ---- enumInfo: constants, valueOf miss, compareTo and the recorded methods, by reflection on the TS enum class ----

/** The recorder's `typeName`: the simple name, "LNode.NodeType" for a nested class (binary name `...LNode$NodeType`). */
function simpleClassName(binaryName: string): string {
  return binaryName.slice(binaryName.lastIndexOf('.') + 1).replace('$', '.');
}

function valueOfMiss(k: EnumClass): unknown {
  try {
    k.valueOf(NO_SUCH_CONSTANT);
  } catch (e) {
    return exceptionOf(e).exception;
  }
  return { class: 'none', message: `${k.name}.valueOf accepted ${NO_SUCH_CONSTANT}` };
}

function compareTo(constants: readonly EnumConstant[]): unknown {
  const first = constants[0]!;
  const last = constants[constants.length - 1]!;
  return {
    firstToLast: first.compareTo(last),
    lastToFirst: last.compareTo(first),
    firstToFirst: first.compareTo(first),
  };
}

function callOn(a: Args, target: unknown, method: string, ...args: unknown[]): unknown {
  try {
    return a.c.value(dyn(target)[method]!(...args));
  } catch (e) {
    return exceptionOf(e).exception;
  }
}

function methodValues(a: Args, constants: readonly EnumConstant[], method: string, matrix: boolean): unknown {
  return Object.fromEntries(
    constants.map((o) => [
      o.name(),
      matrix
        ? Object.fromEntries(constants.map((arg) => [arg.name(), callOn(a, o, method, arg)]))
        : callOn(a, o, method),
    ]),
  );
}

function isMatrix(recorded: unknown): boolean {
  const first = Object.values(recorded as Record<string, unknown>)[0];
  return first !== null && typeof first === 'object' && !('class' in first && 'message' in first);
}

function enumMethods(a: Args, constants: readonly EnumConstant[]): unknown {
  const recorded = ((a.c.recorded[a.label ?? ''] as { methods?: Record<string, unknown> } | undefined)?.methods ??
    {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(recorded).map(([method, perConstant]) => [
      method,
      methodValues(a, constants, method, isMatrix(perConstant)),
    ]),
  );
}

function enumInfo(a: Args): unknown {
  const binaryName = a.s(0);
  const k = ENUM_INFO_CLASSES[binaryName];
  if (k === undefined) {
    throw new ReplayBug(`unknown enum class ${binaryName}`);
  }
  const constants = k.values();
  return new Raw({
    class: simpleClassName(binaryName),
    constants: constants.map((o) => ({ name: o.name(), ordinal: o.ordinal(), toString: o.toString() })),
    valueOfMiss: valueOfMiss(k) as Json,
    compareTo: compareTo(constants) as Json,
    methods: enumMethods(a, constants) as Json,
  });
}

export const ENUM_OPS: Readonly<Record<string, Op>> = {
  // reflection on an enum class
  enumInfo,
};
