// SPDX-License-Identifier: EPL-2.0
// The subset of the alg.test `LayoutTestRunner` that the ported layered suites need (mission 7f, F7), read from
// `framework/{LayoutTestRunner,ExperimentRunner,ExperimentStatement,WhiteboxRecorder,ExperimentalObject}.java`,
// `config/{TestConfiguration,MethodTestConfiguration}.java`, `graph/{GraphFromFile,GraphFromMethod}.java`,
// `io/{AbstractResourcePath,FileNameFilter,FileExtensionFilter}.java` and `algorithm/TestAlgorithm.java`.
//
// A suite declares its graphs, configurators and checks once (`defineLayoutTest`); every graph x configurator
// "experiment" is realised as ExperimentalObject.realize does (graph, then the `@Algorithm` option on every node, then
// the configurator, then the `@DefaultConfiguration` defaults), laid out once through the RecursiveGraphLayoutEngine
// with a TestController when there are processor checks, and every check of the suite becomes one vitest `it` on that
// experiment (the oracle's run counts are per check, `java-baseline.md`). The experiment runs lazily, on the first of
// its checks, and is shared by all of them, as the Java runs all test methods on one laid-out graph.
//
// Annotation map:
//   @RunWith(LayoutTestRunner) .......... `defineLayoutTest(spec)`
//   @GraphResourceProvider .............. `graphs: [{ path, filter?, extensions? }]` (ModelResourcePath syntax)
//   @GraphProvider ...................... `graphs: [function returning an ElkNode]`
//   @Algorithm(id) ...................... `algorithm: id` (required with processor checks, as in Java)
//   @Configurator ....................... `configurators: { name: (graph) => void }`
//   @DefaultConfiguration(...) .......... `defaultConfiguration: true | { nodes?, ports?, edges?, edgeLabels? }`
//   @Test (graph) ....................... `afterLayout: { name: (graph) => void }`
//   @TestAfterProcessor(cls) ............ `afterProcessor: [{ cls, check, failIfNotExecuted?, onlyOnRoot? }]`
//   @TestBeforeProcessor(cls) ........... `beforeProcessor: [same]`
//   @TestAfterProcessors({a, b}) ........ one entry with `cls: [a, b]`
//   @FailIfNotExecuted / @OnlyOnRootNode  the entry's `failIfNotExecuted` / `onlyOnRoot`
// A `@ConfiguratorProvider`'s configurators are `configurators` entries calling `ElkUtil.applyVisitors`, as
// `ConfiguratorTestConfiguration` does. Left out on purpose: `@AllAlgorithms`, the random-graph providers (no ported suite
// uses them).
// `ensureSensibleLabelSize` is `layout-test-labels.ts` (FX8).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { LayeredLayoutProvider } from '../../src/alg/layered/LayeredLayoutProvider.js';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
// CoreOptions first: it and TopdownSizeApproximator import each other, and CoreOptions must be the entry module.
import { CoreOptions } from '../../src/core/options/CoreOptions.js';
import { LayoutConfigurator } from '../../src/core/LayoutConfigurator.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { TestController, type ILayoutExecutionListener } from '../../src/core/testing/TestController.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkUtil } from '../../src/core/util/ElkUtil.js';
import type { ElkEdge } from '../../src/graph/ElkEdge.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { ElkNodeImpl } from '../../src/graph/impl/ElkNodeImpl.js';
import { ElkGraphJson } from '../../src/graph/json/ElkGraphJson.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import { describe, it } from 'vitest';
import { registerLayered } from './layered-framework-replay.js';
import { ensureSensibleLabelSize } from './layout-test-labels.js';
import {
  FULL_SUITES_ENV,
  inputsRoot,
  listGraphFiles,
  loadGraphFile,
  type FileGraphSource,
} from './layout-test-sources.js';

export { FULL_SUITES_ENV, inputsRoot, listGraphFiles, loadGraphFile, type FileGraphSource };

/** The class of a layout processor; `@TestAfterProcessor(cls)` compares the class of the processor that ran by identity. */
export type ProcessorClass = abstract new (...args: never[]) => unknown;

/** `@GraphProvider`: builds a fresh graph per experiment. Its name titles the cases. */
export type GraphBuilder = () => ElkNode;
export type GraphSource = FileGraphSource | GraphBuilder;

/** `@DefaultConfiguration`; the annotation's own defaults are nodes, ports and edges on, edge labels off. */
export interface DefaultConfigurationOptions {
  readonly nodes?: boolean;
  readonly ports?: boolean;
  readonly edges?: boolean;
  readonly edgeLabels?: boolean;
}

/** A whitebox test method: `check` runs on the `LGraph` whenever one of the classes' processors is notified. */
export interface ProcessorCheck {
  readonly name?: string;
  readonly cls: ProcessorClass | readonly ProcessorClass[];
  readonly check: (graph: LGraph) => void;
  readonly failIfNotExecuted?: boolean;
  readonly onlyOnRoot?: boolean;
}

export type GraphCheck = (graph: ElkNode) => void;

export interface LayoutTestSpec {
  readonly name: string;
  readonly algorithm?: string;
  readonly graphs: readonly GraphSource[];
  readonly configurators?: Readonly<Record<string, GraphCheck>>;
  readonly defaultConfiguration?: boolean | DefaultConfigurationOptions;
  readonly afterLayout?: Readonly<Record<string, GraphCheck>>;
  readonly afterProcessor?: readonly ProcessorCheck[];
  readonly beforeProcessor?: readonly ProcessorCheck[];
}

/** One emitted test; `run` throws on failure. */
export interface LayoutTestCase {
  readonly title: string;
  run(): void;
}

/** The seam to the engine: `layout` lays the graph out as ExperimentStatement does. */
export interface LayoutTestDeps {
  layout(graph: ElkNode, controller: TestController | null): void;
}

const NOT_EXECUTED = 'Test was not executed, but was supposed to.';
const NO_ALGORITHM = 'Whitebox tests require explicit @Algorithm annotations.';
const NO_GRAPHS = 'No test graphs specified.';
const NO_TESTS = 'No runnable test methods specified.';
const NO_CONFIGURATOR = 'noConfigurator';

// ------------------------------------------------------------------------------------------------------------
// graph sources

interface TestGraph {
  readonly name: string;
  provide(): ElkNode;
}

function graphsOf(sources: readonly GraphSource[], root: string): TestGraph[] {
  return sources.flatMap((source): TestGraph[] => {
    if (typeof source === 'function') {
      return [{ name: `graphMethod(${source.name || 'graph'})`, provide: source }];
    }
    return listGraphFiles(source, root).map((file) => ({
      name: `graphFile(${path.relative(root, file).split(path.sep).join('/')})`,
      provide: () => loadGraphFile(file),
    }));
  });
}

// ------------------------------------------------------------------------------------------------------------
// configuration

/** `TestConfiguration.applyDefaultConfiguration` for one edge list. */
function configureEdges(edges: Iterable<ElkEdge>, options: DefaultConfigurationOptions): void {
  for (const edge of edges) {
    if (options.edges === true) {
      ElkUtil.configureWithDefaultValues(edge);
    }
    if (options.edgeLabels === true && edge.getLabels().isEmpty()) {
      ElkGraphUtil.createLabelWithText(edge.getIdentifier(), edge);
    }
  }
}

/** `TestConfiguration.applyDefaultConfiguration`: the children of the graph, ports and edges included, recursively. */
export function applyDefaultConfiguration(graph: ElkNode, options: DefaultConfigurationOptions): void {
  for (const node of graph.getChildren()) {
    if (options.nodes === true) {
      ElkUtil.configureWithDefaultValues(node);
    }
    for (const port of node.getPorts()) {
      if (options.ports === true) {
        ElkUtil.configureWithDefaultValues(port);
      }
      configureEdges(port.getOutgoingEdges(), options);
    }
    configureEdges(node.getOutgoingEdges(), options);
    applyDefaultConfiguration(node, options);
  }
}

const ANNOTATION_DEFAULTS: DefaultConfigurationOptions = { nodes: true, ports: true, edges: true, edgeLabels: false };

function defaultOptions(value: LayoutTestSpec['defaultConfiguration']): DefaultConfigurationOptions {
  if (value === undefined || value === false) {
    return {};
  }
  // the annotation's own defaults (`DefaultConfiguration.java:31-37`), under whatever a suite sets explicitly
  return value === true ? ANNOTATION_DEFAULTS : { ...ANNOTATION_DEFAULTS, ...value };
}

/** `TestAlgorithm.apply`: the algorithm option on every node of the graph. */
function applyAlgorithm(graph: ElkNode, algorithm: string): void {
  const configurator = new LayoutConfigurator();
  configurator.configure(ElkNodeImpl).setProperty(CoreOptions.ALGORITHM, algorithm);
  ElkUtil.applyVisitors(graph, configurator);
}

// ------------------------------------------------------------------------------------------------------------
// whitebox recording

/** What `WhiteboxRecorder` keeps per whitebox test method: whether it ran, and every failure it raised. */
interface Recording {
  readonly check: ProcessorCheck;
  executed: boolean;
  readonly failures: unknown[];
}

function classesOf(check: ProcessorCheck): readonly ProcessorClass[] {
  return Array.isArray(check.cls) ? (check.cls as readonly ProcessorClass[]) : [check.cls as ProcessorClass];
}

function classNames(check: ProcessorCheck): string {
  return classesOf(check)
    .map((cls) => cls.name)
    .join(', ');
}

/** `ExperimentStatement.runWhiteboxTests`: the checks of the notified processor's class run, failures only recorded. */
class WhiteboxListener implements ILayoutExecutionListener {
  private readonly before: readonly Recording[];
  private readonly after: readonly Recording[];

  constructor(before: readonly Recording[], after: readonly Recording[]) {
    this.before = before;
    this.after = after;
  }

  layoutProcessorReady(processor: ILayoutProcessor<unknown>, graph: unknown, isRoot: boolean): void {
    this.run(this.before, processor, graph, isRoot);
  }

  layoutProcessorFinished(processor: ILayoutProcessor<unknown>, graph: unknown, isRoot: boolean): void {
    this.run(this.after, processor, graph, isRoot);
  }

  private run(
    recordings: readonly Recording[],
    processor: ILayoutProcessor<unknown>,
    graph: unknown,
    isRoot: boolean,
  ): void {
    const actual: unknown = processor.constructor;
    for (const recording of recordings) {
      const { check } = recording;
      if (classesOf(check).some((cls) => cls === actual) && (isRoot || check.onlyOnRoot !== true)) {
        recording.executed = true;
        try {
          check.check(graph as LGraph);
        } catch (error) {
          recording.failures.push(error);
        }
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------------------
// experiments

const DEFAULT_DEPS: LayoutTestDeps = {
  layout: (graph, controller) => {
    new RecursiveGraphLayoutEngine().layout(graph, controller, new BasicProgressMonitor());
  },
};

interface Experiment {
  readonly graph: TestGraph;
  readonly configurationName: string;
  readonly configurator: GraphCheck | undefined;
  readonly recordings: Map<ProcessorCheck, Recording>;
  readonly before: readonly Recording[];
  readonly after: readonly Recording[];
}

type Outcome = { readonly graph: ElkNode } | { readonly error: unknown };

/** `ExperimentalObject.realize`: the graph, the algorithm, the configurator, then the default configuration. */
function realize(spec: LayoutTestSpec, experiment: Experiment): ElkNode {
  registerLayered();
  const graph = experiment.graph.provide();
  if (spec.algorithm !== undefined) {
    applyAlgorithm(graph, spec.algorithm);
  }
  experiment.configurator?.(graph);
  applyDefaultConfiguration(graph, defaultOptions(spec.defaultConfiguration));
  ensureSensibleLabelSize(graph);
  return graph;
}

/** `ExperimentStatement.evaluate`, up to the blackbox tests: layout is raised as its own error, plainly. */
function evaluate(spec: LayoutTestSpec, experiment: Experiment, deps: LayoutTestDeps): Outcome {
  try {
    const graph = realize(spec, experiment);
    let controller: TestController | null = null;
    if (experiment.recordings.size > 0 && spec.algorithm !== undefined) {
      controller = new TestController(spec.algorithm);
      controller.addLayoutExecutionListener(new WhiteboxListener(experiment.before, experiment.after));
    }
    deps.layout(graph, controller);
    return { graph };
  } catch (error) {
    return { error };
  }
}

/** One experiment's lazily run, shared layout; released when its last check has run. */
class ExperimentRun {
  private readonly spec: LayoutTestSpec;
  private readonly experiment: Experiment;
  private readonly deps: LayoutTestDeps;
  private remaining: number;
  private outcome: Outcome | null = null;

  constructor(spec: LayoutTestSpec, experiment: Experiment, deps: LayoutTestDeps, checks: number) {
    this.spec = spec;
    this.experiment = experiment;
    this.deps = deps;
    this.remaining = checks;
  }

  /** The laid-out graph; a failed layout throws its own error. */
  graph(): ElkNode {
    this.outcome ??= evaluate(this.spec, this.experiment, this.deps);
    if ('error' in this.outcome) {
      throw this.outcome.error;
    }
    return this.outcome.graph;
  }

  /** Marks one check as run; the last one frees the laid-out graph. */
  finished(): void {
    this.remaining -= 1;
    if (this.remaining <= 0) {
      this.outcome = null;
    }
  }

  recording(check: ProcessorCheck): Recording {
    return this.experiment.recordings.get(check)!;
  }
}

/** `ExperimentStatement.simulateWhiteboxTestsForNotifiers` for one check: its recorded failure, or the not-run failure. */
function reportRecording(recording: Recording): void {
  if (recording.executed) {
    if (recording.failures.length > 0) {
      throw recording.failures[0];
    }
  } else if (recording.check.failIfNotExecuted === true) {
    throw new Error(`${NOT_EXECUTED} (${classNames(recording.check)})`);
  }
}

function checkName(kind: string, check: ProcessorCheck): string {
  return check.name ?? `${kind}Processor(${classNames(check)})`;
}

function runGuarded(run: ExperimentRun, body: () => void): () => void {
  return () => {
    try {
      body();
    } finally {
      run.finished();
    }
  };
}

function casesOf(spec: LayoutTestSpec, experiment: Experiment, deps: LayoutTestDeps): LayoutTestCase[] {
  const entries = Object.entries(spec.afterLayout ?? {});
  const whitebox = [...experiment.before, ...experiment.after];
  const run = new ExperimentRun(spec, experiment, deps, entries.length + whitebox.length);
  const where = `${experiment.graph.name} ${experiment.configurationName}`;
  const blackbox = entries.map(([name, test]): LayoutTestCase => ({
    title: `${name} [${where}]`,
    run: runGuarded(run, () => {
      test(run.graph());
    }),
  }));
  const white = [
    ...experiment.before.map((r) => ({ r, kind: 'before' })),
    ...experiment.after.map((r) => ({ r, kind: 'after' })),
  ].map(({ r, kind }): LayoutTestCase => ({
    title: `${checkName(kind, r.check)} [${where}]`,
    run: runGuarded(run, () => {
      run.graph();
      reportRecording(run.recording(r.check));
    }),
  }));
  return [...blackbox, ...white];
}

function recordingsOf(
  checks: readonly ProcessorCheck[] | undefined,
  into: Map<ProcessorCheck, Recording>,
): Recording[] {
  return (checks ?? []).map((check) => {
    const recording: Recording = { check, executed: false, failures: [] };
    into.set(check, recording);
    return recording;
  });
}

function experimentsOf(spec: LayoutTestSpec, graphs: readonly TestGraph[]): Experiment[] {
  const configurators = Object.entries(spec.configurators ?? {});
  const configurations: [string, GraphCheck | undefined][] =
    configurators.length === 0
      ? [[NO_CONFIGURATOR, undefined]]
      : configurators.map(([name, fn]) => [`configMethod(${name})`, fn]);
  return configurations.flatMap(([configurationName, configurator]) =>
    graphs.map((graph): Experiment => {
      const recordings = new Map<ProcessorCheck, Recording>();
      const before = recordingsOf(spec.beforeProcessor, recordings);
      const after = recordingsOf(spec.afterProcessor, recordings);
      return { graph, configurationName, configurator, recordings, before, after };
    }),
  );
}

function validate(spec: LayoutTestSpec, graphs: readonly TestGraph[]): void {
  const whitebox = (spec.beforeProcessor?.length ?? 0) + (spec.afterProcessor?.length ?? 0);
  if (Object.keys(spec.afterLayout ?? {}).length + whitebox === 0) {
    throw new Error(`${spec.name}: ${NO_TESTS}`);
  }
  if (whitebox > 0 && spec.algorithm === undefined) {
    throw new Error(`${spec.name}: ${NO_ALGORITHM}`);
  }
  if (graphs.length === 0) {
    throw new Error(`${spec.name}: ${NO_GRAPHS}`);
  }
}

/** The cases of a suite, graph by graph within configurator (`ExperimentalObject.inflate`), without registering them. */
export function buildLayoutTests(
  spec: LayoutTestSpec,
  deps: LayoutTestDeps = DEFAULT_DEPS,
  env: Readonly<Record<string, string | undefined>> = process.env,
): LayoutTestCase[] {
  const graphs = graphsOf(spec.graphs, inputsRoot(env));
  validate(spec, graphs);
  return experimentsOf(spec, graphs).flatMap((experiment) => casesOf(spec, experiment, deps));
}

/** Registers a suite as a `describe` with one `it` per graph x configurator x check. */
export function defineLayoutTest(spec: LayoutTestSpec): void {
  const cases = buildLayoutTests(spec);
  describe(spec.name, () => {
    for (const testCase of cases) {
      it(testCase.title, testCase.run);
    }
  });
}

/**
 * For suites that call the provider directly (`new LayeredLayoutProvider().layout(graph, new BasicProgressMonitor())`):
 * runs the optional configurator on the graph, lays it out through the provider and returns it.
 */
export function layout(graph: ElkNode, configurator?: GraphCheck): ElkNode {
  registerLayered();
  configurator?.(graph);
  new LayeredLayoutProvider().layout(graph, new BasicProgressMonitor());
  return graph;
}
