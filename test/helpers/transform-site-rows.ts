// SPDX-License-Identifier: EPL-2.0
// Interpreter for the `ElkGraphTransformer` / `ElkGraphLayoutTransferrer` rows of
// test/golden/refs/java/layered-sites.json (mission 7a, T11c; recorded by tools/vectors/LayeredSiteVectors.java, whose
// header documents the step ops). A row is replayed on the TS port; the tests then assert the specific fields of the
// run that the row's Java values pin. Only the ops the transform, nonMutating and origin rows use are interpreted.
import { readFileSync } from 'node:fs';
import { HierarchyHandling } from '../../src/core/options/HierarchyHandling.js';
import { KVector } from '../../src/core/math/KVector.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import type { ElkConnectableShape } from '../../src/graph/ElkConnectableShape.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import type { LEdge } from '../../src/alg/layered/graph/LEdge.js';
import { Layer } from '../../src/alg/layered/graph/Layer.js';
import { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LGraphElement } from '../../src/alg/layered/graph/LGraphElement.js';
import { LNode } from '../../src/alg/layered/graph/LNode.js';
import { NodeType } from '../../src/alg/layered/graph/LNodeNodeType.js';
import { ElkGraphLayoutTransferrer } from '../../src/alg/layered/graph/transform/ElkGraphLayoutTransferrer.js';
import { ElkGraphTransformer } from '../../src/alg/layered/graph/transform/ElkGraphTransformer.js';
import { InternalProperties } from '../../src/alg/layered/options/InternalProperties.js';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { decodeHex, findImportTarget, importInput, dumpLGraph } from './layered-framework-replay.js';
import { DumpIndex, parseExportedElk } from './transform-site-dump.js';

const SITES_URL = new URL('../golden/refs/java/layered-sites.json', import.meta.url);

export interface SiteStep {
  readonly op: string;
  readonly on: string | null;
  readonly args: readonly unknown[];
  readonly as?: string;
}

/** One recorded row of layered-sites.json. */
export interface SiteRow {
  readonly id: string;
  readonly site: string;
  readonly input: unknown;
  readonly steps: readonly SiteStep[];
  readonly expected: Readonly<Record<string, unknown>>;
}

let cachedRows: ReadonlyMap<string, SiteRow> | null = null;

/** The row with `id`; the 2 MB file is parsed once. */
export function loadSiteRow(id: string): SiteRow {
  cachedRows ??= new Map(
    (JSON.parse(readFileSync(SITES_URL, 'utf8')) as { rows: SiteRow[] }).rows.map((row) => [row.id, row] as const),
  );
  const row = cachedRows.get(id);
  if (row === undefined) {
    throw new Error(`no row ${id} in layered-sites.json`);
  }
  return row;
}

/** The ORIGINAL_BENDPOINTS of an imported edge as [x, y] pairs, or `null` when the edge has none. */
export function originalBendpoints(run: SiteRun, edge: string): [number, number][] | null {
  const chain = (run.element(edge) as LEdge).getProperty(InternalProperties.ORIGINAL_BENDPOINTS);
  return chain === null ? null : [...chain].map((v): [number, number] => [v.x, v.y]);
}

/** The re-imported ELK root of a row's `input` (layered registered), for tests that drive the API directly. */
export function importSiteInput(id: string): ElkNode {
  return importInput({ id, group: 'transform', input: loadSiteRow(id).input, options: {} });
}

export interface CaughtException {
  readonly exception: { readonly class: string; readonly message: string };
}

/** What a replayed row produced, by step label. */
export class SiteRun {
  readonly values = new Map<string, unknown>();
  readonly names = new Map<string, unknown>();
  root: ElkNode | null = null;

  /** The LGraph "g0" (the importGraph result). */
  get lgraph(): LGraph {
    return this.names.get('g0') as LGraph;
  }

  /** The T1 dump taken by the row's dumpLGraph step. */
  get dump(): DumpIndex {
    return new DumpIndex(this.values.get('lgraph') as ReturnType<typeof dumpLGraph>);
  }

  /** The exported ELK JSON recorded under label `elk` (parsed strictly). */
  get elk(): unknown {
    return this.values.get('elk');
  }

  /** The exception the step labelled `label` threw, or `undefined`. */
  exception(label: string): CaughtException['exception'] | undefined {
    return (this.values.get(label) as CaughtException | undefined)?.exception;
  }

  /** The LGraph element with the positional name ("g0/n3/p1"). */
  element(name: string): LGraphElement {
    return this.names.get(name) as LGraphElement;
  }

  /** The node "g0/n3". */
  node(name: string): LNode {
    return this.element(name) as LNode;
  }
}

/** The recorder's ELK export flags (NS1). */
export function exportElk(root: ElkNode): unknown {
  return parseExportedElk(
    ElkGraphJson.forGraph(root)
      .omitLayout(false)
      .omitZeroDimension(false)
      .omitZeroPositions(false)
      .omitUnknownLayoutOptions(true)
      .toJson(),
  );
}

/** Registers the positional names of every element of `lgraph` (T1 scheme) in `names`. */
function registerNames(lgraph: LGraph, names: Map<string, unknown>): void {
  const index = new DumpIndexNames(names);
  index.register(lgraph);
  index.registerEdges();
}

class DumpIndexNames {
  private readonly graphs: LGraph[] = [];
  private readonly nodeLists = new Map<LGraph, LNode[]>();

  constructor(private readonly names: Map<string, unknown>) {}

  register(g: LGraph): void {
    const gp = `g${String(this.graphs.length)}`;
    this.graphs.push(g);
    this.names.set(gp, g);
    const nodes = [...g.getLayerlessNodes()];
    const seen = new Set<LNode>(nodes);
    for (const layer of g.getLayers()) {
      for (const n of layer.getNodes()) {
        if (!seen.has(n)) {
          seen.add(n);
          nodes.push(n);
        }
      }
    }
    this.nodeLists.set(g, nodes);
    nodes.forEach((n, i) => this.registerNode(`${gp}/n${String(i)}`, n));
  }

  private registerNode(np: string, n: LNode): void {
    this.names.set(np, n);
    n.getLabels().forEach((label, i) => this.names.set(`${np}/l${String(i)}`, label));
    n.getPorts().forEach((p, j) => {
      this.names.set(`${np}/p${String(j)}`, p);
      p.getLabels().forEach((label, i) => this.names.set(`${np}/p${String(j)}/l${String(i)}`, label));
    });
    const nested = n.getNestedGraph();
    if (nested !== null) {
      this.register(nested);
    }
  }

  registerEdges(): void {
    const named = new Set<unknown>();
    this.graphs.forEach((g, k) => {
      let count = 0;
      for (const n of this.nodeLists.get(g) as LNode[]) {
        for (const p of n.getPorts()) {
          for (const e of [...p.getOutgoingEdges(), ...p.getIncomingEdges()]) {
            if (!named.has(e)) {
              named.add(e);
              const ep = `g${String(k)}/e${String(count++)}`;
              this.names.set(ep, e);
              e.getLabels().forEach((label, i) => this.names.set(`${ep}/l${String(i)}`, label));
            }
          }
        }
      }
    });
  }
}

type Handler = (run: SiteRun, step: SiteStep) => unknown;

const HIERARCHY_HANDLING_ID = 'org.eclipse.elk.hierarchyHandling';
const hex = (value: unknown): number => decodeHex(value as string);

function target(run: SiteRun, name: string | null): unknown {
  if (name === null || !run.names.has(name)) {
    throw new Error(`step addresses unknown name ${String(name)}`);
  }
  return run.names.get(name);
}

const HANDLERS: Readonly<Record<string, Handler>> = {
  importGraph: (run, step) => {
    const transformer = new ElkGraphTransformer();
    const lgraph = transformer.importGraph(
      findImportTarget(run.root as ElkNode, (step.args[0] ?? undefined) as string),
    );
    registerNames(lgraph, run.names);
    return 'g0';
  },
  dumpLGraph: (run) => dumpLGraph(run.lgraph),
  applyLayout: (run, step) => new ElkGraphTransformer().applyLayout(target(run, step.on) as LGraph),
  applyLayoutNonMutating: (run, step) =>
    ElkGraphLayoutTransferrer.applyLayoutNonMutating(target(run, step.on) as LGraph),
  exportElk: (run, step) => exportElk(step.on === 'elk' ? (run.root as ElkNode) : (target(run, step.on) as ElkNode)),
  getDesignation: (run, step) => (target(run, step.on) as LGraphElement).getDesignation(),
  toString: (run: SiteRun, step: SiteStep): unknown => String(target(run, step.on)),
  getOriginIdentifier: (run, step) => ElkGraphTransformer.getOriginIdentifier(target(run, step.on) as LGraphElement),
  setProperty: (run, step) => {
    const [id, value] = step.args as [string, { v: [string, string]; n?: string }];
    if (id === HIERARCHY_HANDLING_ID) {
      (target(run, step.on) as ElkNode).setProperty(
        LayeredOptions.HIERARCHY_HANDLING,
        HierarchyHandling[value.n as 'INCLUDE_CHILDREN'],
      );
      return;
    }
    (target(run, step.on) as LGraphElement).setProperty(
      InternalProperties.TARGET_OFFSET,
      new KVector(hex(value.v[0]), hex(value.v[1])),
    );
  },
  newElkGraph: (run) => {
    run.root = ElkGraphUtil.createGraph();
    return run.root;
  },
  newElkNode: (run, step) => ElkGraphUtil.createNode(target(run, step.on) as ElkNode),
  newElkEdge: (run, step) => ElkGraphUtil.createEdge(target(run, step.on) as ElkNode),
  elkSetIdentifier: (run, step) => (target(run, step.on) as ElkNode).setIdentifier(step.args[0] as string),
  elkSetDimensions: (run, step) =>
    (target(run, step.on) as ElkNode).setDimensions(hex(step.args[0]), hex(step.args[1])),
  elkAddSource: (run, step) =>
    (target(run, step.on) as ElkEdge).getSources().add(target(run, step.args[0] as string) as ElkConnectableShape),
  elkAddTarget: (run, step) =>
    (target(run, step.on) as ElkEdge).getTargets().add(target(run, step.args[0] as string) as ElkConnectableShape),
  newLNode: (run, step) => new LNode(target(run, step.args[0] as string) as LGraph),
  newLayer: (run, step) => new Layer(target(run, step.args[0] as string) as LGraph),
  layersAdd: (run, step) =>
    (target(run, step.on) as LGraph).getLayers().push(target(run, step.args[0] as string) as Layer),
  layerlessAdd: (run, step) =>
    (target(run, step.on) as LGraph).getLayerlessNodes().push(target(run, step.args[0] as string) as LNode),
  layerlessRemove: (run, step) => {
    const nodes = (target(run, step.on) as LGraph).getLayerlessNodes();
    nodes.splice(nodes.indexOf(target(run, step.args[0] as string) as LNode), 1);
  },
  setLayer: (run, step) => (target(run, step.on) as LNode).setLayer(target(run, step.args[0] as string) as Layer),
  setType: (run, step) => (target(run, step.on) as LNode).setType(NodeType[step.args[0] as 'NORMAL']),
  setSize: (run, step) => {
    const size = (target(run, step.on) as LNode).getSize();
    size.x = hex(step.args[0]);
    size.y = hex(step.args[1]);
  },
};

/** Replays a row's steps on the port; a step that throws records `{ exception: { class, message } }` and goes on. */
export function runSiteRow(id: string): SiteRun {
  const row = loadSiteRow(id);
  const run = new SiteRun();
  if (row.input !== null) {
    run.root = importInput({ id, group: 'transform', input: row.input, options: {} });
    run.names.set('elk', run.root);
  } else {
    run.names.set('g0', new LGraph());
  }
  for (const step of row.steps) {
    const handler = HANDLERS[step.op];
    if (handler === undefined) {
      throw new Error(`interpreter does not know op ${step.op} (row ${id})`);
    }
    try {
      const result = handler(run, step);
      if (step.as !== undefined) {
        run.values.set(step.as, result);
        if (step.op.startsWith('new') || step.op === 'applyLayoutNonMutating') {
          run.names.set(step.as, result);
        }
      }
    } catch (e) {
      if (step.as === undefined || !(e instanceof Error)) {
        throw e;
      }
      run.values.set(step.as, { exception: { class: e.name, message: e.message } });
    }
  }
  return run;
}
