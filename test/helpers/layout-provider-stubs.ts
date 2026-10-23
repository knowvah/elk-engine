// SPDX-License-Identifier: EPL-2.0
/*
 * Stub layout algorithms and helpers for the RecursiveGraphLayoutEngine tests: providers that record each layout
 * call, run a per-node script and report disposal, plus graph builders and a recording progress monitor. Stub ids
 * avoid the core algorithm suffixes (M14).
 */
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { AbstractLayoutProvider } from '../../src/core/AbstractLayoutProvider.js';
import { LayoutAlgorithmData } from '../../src/core/data/LayoutAlgorithmData.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import type { ITopdownLayoutProvider } from '../../src/core/ITopdownLayoutProvider.js';
import { KVector } from '../../src/core/math/KVector.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import type { IWhiteBoxTestable } from '../../src/core/testing/IWhiteBoxTestable.js';
import type { TestController } from '../../src/core/testing/TestController.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { IElkProgressMonitor } from '../../src/core/util/IElkProgressMonitor.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { GraphFeature } from '../../src/graph/properties/GraphFeature.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { EnumSet } from '../../src/java/util/EnumSet.js';

export const PLAIN = 'test.engine.stubplain';
export const COMPOUND = 'test.engine.stubcompound';
export const CLUSTERS = 'test.engine.stubclusters';
export const LOOPS = 'test.engine.stubloops';
export const TOPDOWN = 'test.engine.stubtopdown';
export const WHITEBOX = 'test.engine.stubwhitebox';
export const POOLED = 'test.engine.stubpooled';
export const PREDICTED_SIZE = new KVector(300, 200);
export const STUB_TASK = (algorithm: string): string => `stub ${algorithm}`;

export interface Call {
  readonly algorithm: string;
  readonly node: ElkNode;
  readonly monitor: IElkProgressMonitor;
  readonly provider: StubProvider;
}

export const calls: Call[] = [];
export const scripts = new Map<ElkNode, (node: ElkNode) => void>();
export const created = new Map<string, StubProvider[]>();
export const predictions: ElkNode[] = [];

/** Records each layout call, begins/ends its monitor and runs the node's script. */
export class StubProvider extends AbstractLayoutProvider {
  disposed = false;
  constructor(readonly algorithm: string) {
    super();
  }

  layout(layoutGraph: ElkNode, progressMonitor: IElkProgressMonitor): void {
    progressMonitor.begin(STUB_TASK(this.algorithm), 1);
    calls.push({ algorithm: this.algorithm, node: layoutGraph, monitor: progressMonitor, provider: this });
    scripts.get(layoutGraph)?.(layoutGraph);
    progressMonitor.done();
  }

  override dispose(): void {
    this.disposed = true;
  }
}

export class TopdownStubProvider extends StubProvider implements ITopdownLayoutProvider {
  getPredictedGraphSize(graph: ElkNode): KVector {
    predictions.push(graph);
    return PREDICTED_SIZE.clone();
  }
}

export class WhiteBoxStubProvider extends StubProvider implements IWhiteBoxTestable {
  readonly controllers: (TestController | null)[] = [];
  setTestController(controller: TestController | null): void {
    this.controllers.push(controller);
  }
}

export function register(id: string, features: GraphFeature[], make: (id: string) => StubProvider): void {
  const data = new LayoutAlgorithmData.Builder()
    .id(id)
    .name(id)
    .supportedFeatures(features.length === 0 ? EnumSet.noneOf(GraphFeature) : EnumSet.of(features[0]!, ...features))
    .providerFactory({
      create: () => {
        const provider = make(id);
        created.set(id, [...(created.get(id) ?? []), provider]);
        return provider;
      },
      destroy: (provider) => provider.dispose(),
    })
    .create();
  LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders({ apply: (registry) => registry.register(data) });
}

/** Counts `begin`/`subTask` calls and can report cancellation. */
export class RecordingMonitor extends BasicProgressMonitor {
  readonly begins: [string, number][] = [];
  readonly works: number[] = [];
  canceled = false;

  override begin(name: string, totalWork: number): boolean {
    this.begins.push([name, totalWork]);
    return super.begin(name, totalWork);
  }

  override subTask(work: number): IElkProgressMonitor | null {
    this.works.push(work);
    return super.subTask(work);
  }

  override isCanceled(): boolean {
    return this.canceled;
  }
}

export function graph(algorithm: string): ElkNode {
  const root = ElkGraphUtil.createGraph();
  root.setProperty(CoreOptions.ALGORITHM, algorithm);
  return root;
}

export function node(parent: ElkNode, algorithm: string | null = null): ElkNode {
  const n = ElkGraphUtil.createNode(parent);
  if (algorithm !== null) {
    n.setProperty(CoreOptions.ALGORITHM, algorithm);
  }
  return n;
}

export function leaves(parent: ElkNode, count: number): ElkNode[] {
  return Array.from({ length: count }, () => {
    const n = ElkGraphUtil.createNode(parent);
    n.setDimensions(10, 10);
    return n;
  });
}

export function calledNodes(): ElkNode[] {
  return calls.map((call) => call.node);
}

export function run(root: ElkNode, monitor: IElkProgressMonitor = new BasicProgressMonitor()): void {
  new RecursiveGraphLayoutEngine().layout(root, monitor);
}

export function caught(action: () => void): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error('expected a throw');
}

/** Registers the stub algorithms (call in `beforeAll`, after `LayoutMetaDataService.getInstance()`). */
export function registerEngineStubs(): void {
  register(PLAIN, [], (id) => new StubProvider(id));
  register(COMPOUND, [GraphFeature.COMPOUND], (id) => new StubProvider(id));
  register(CLUSTERS, [GraphFeature.CLUSTERS], (id) => new StubProvider(id));
  register(LOOPS, [GraphFeature.INSIDE_SELF_LOOPS], (id) => new StubProvider(id));
  register(TOPDOWN, [], (id) => new TopdownStubProvider(id));
  register(WHITEBOX, [], (id) => new WhiteBoxStubProvider(id));
  register(POOLED, [], (id) => new StubProvider(id));
}

/** Clears the recorded calls, predictions and scripts (call in `beforeEach`). */
export function resetStubs(): void {
  calls.length = 0;
  predictions.length = 0;
  scripts.clear();
}

/** Exposes the protected methods. */
export class ExposedEngine extends RecursiveGraphLayoutEngine {
  countNodes(node: ElkNode, countAncestors: boolean): number {
    return this.countNodesRecursively(node, countAncestors);
  }

  gather(node: ElkNode): ElkEdge[] {
    return this.gatherInsideSelfLoops(node);
  }

  recurse(node: ElkNode): ElkEdge[] {
    return this.layoutRecursively(node, null, new BasicProgressMonitor());
  }
}
