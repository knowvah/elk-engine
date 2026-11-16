// SPDX-License-Identifier: EPL-2.0
// Test-side ops of mission 7g (W3, W6, W7) for the rows of test/golden/refs/java/layered-loops.json, which keep 7f2's row
// shape. This module adds, without editing any landed helper and without a seam in `src/`:
//   `processor <SimpleClassName>`  a step op (tools/vectors/LayeredLoopsVectors.java) that runs one processor no
//                                  `IntermediateProcessorStrategy` member creates, at its position in the step list.
//                                  7f's `STEP_ARITY` is a closed record, so the op is rewritten into a `runProcessor` step on
//                                  a reserved name that the wrapped `Factories` resolve from the caller-filled registry
//                                  (`registerStepProcessor`); the landed interpreters then run it at its position, on the
//                                  graph or, after `componentsSplit`, on each component.
//   twin hooks (W6, W7)            a named hook patches `process` of a processor class for the duration of one replay:
//                                  `before` runs ahead of the processor (it rebuilds a container in reverse order), or `wrap`
//                                  replaces the method. Same technique as EndLabelPreprocessor.test.ts / the 7f2 G4 twin.
//   `factoriesWith(overrides)`     stands a ported class in for an enum arm that still throws at plan build.
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import type { LNode } from '../../src/alg/layered/graph/LNode.js';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../src/alg/layered/options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../src/alg/layered/options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../src/alg/layered/options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../../src/alg/layered/p5edges/EdgeRouterFactory.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';
import type { IElkProgressMonitor } from '../../src/core/util/IElkProgressMonitor.js';
import type { IProperty } from '../../src/graph/properties/IProperty.js';
import { runLabelsRow, type LabelsEnvironment, type LabelsStepsResult } from './layered-labels-replay-ops.js';
import type { Factories } from './layered-phase-replay-ops.js';
import type { PhaseStep } from './layered-phase-replay-rows.js';
import type { PipelineStopRow } from './layered-pipeline-replay-rows.js';
import { runRoutingPrefix } from './layered-routing-replay-ops.js';

/** The recorder's step op that runs one processor outside `IntermediateProcessorStrategy`. */
export const PROCESSOR_OP = 'processor';
/** The `runProcessor` argument a `processor <name>` step is rewritten to: no strategy member can have a NUL in its name. */
const RESERVED_PREFIX = '\u0000processor:';

export type ProcessorFactory = () => ILayoutProcessor<LGraph>;

// ------------------------------------------------------------------------------------------------------------
// the step-processor registry (filled by callers)

/** Registry state: simple class name to factory. Concurrency: test code is single-threaded; entries are replaced, never merged. */
const stepProcessors = new Map<string, ProcessorFactory>();

/** Registers the factory of the class a `processor <name>` step runs (a second registration replaces the first). */
export function registerStepProcessor(name: string, factory: ProcessorFactory): void {
  stepProcessors.set(name, factory);
}

/** Removes one registration (a test cleans up after itself). */
export function unregisterStepProcessor(name: string): void {
  stepProcessors.delete(name);
}

const isRegistered = (name: string): boolean => stepProcessors.has(name);

function stepProcessorFor(name: string): ILayoutProcessor<LGraph> {
  const factory = stepProcessors.get(name);
  if (factory === undefined) {
    throw new Error(`step op ${PROCESSOR_OP} names ${name}, which is not registered (registerStepProcessor)`);
  }
  return factory();
}

// ------------------------------------------------------------------------------------------------------------
// factories

const CYCLE_PHASE = 'P1_CYCLE_BREAKING';
const LAYERING_PHASE = 'P2_LAYERING';
const ORDERING_PHASE = 'P3_NODE_ORDERING';
const PLACEMENT_PHASE = 'P4_NODE_PLACEMENT';
const ROUTING_PHASE = 'P5_EDGE_ROUTING';

/** The real enum-driven factories (as LayeredLabelsVectors.test.ts builds them): a staged arm throws at `create()`. */
export const strategyFactories: Factories = {
  createProcessor: (name) => IntermediateProcessorStrategy.valueOf(name).create(),
  createPhase: (phase, strategy) => {
    switch (phase) {
      case CYCLE_PHASE:
        return CycleBreakingStrategy.valueOf(strategy).create();
      case LAYERING_PHASE:
        return LayeringStrategy.valueOf(strategy).create();
      case ORDERING_PHASE:
        return CrossingMinimizationStrategy.valueOf(strategy).create();
      case PLACEMENT_PHASE:
        return NodePlacementStrategy.valueOf(strategy).create();
      case ROUTING_PHASE:
        return EdgeRouterFactory.factoryFor(EdgeRouting.valueOf(strategy)).create();
      default:
        throw new Error(`unknown phase ${phase}`);
    }
  },
};

/**
 * `base` with the processors of some `IntermediateProcessorStrategy` names replaced: `overrides` maps a strategy name
 * (`SELF_LOOP_ROUTER`) to the factory of the ported class, so a class test can replay rows before the arm is wired.
 */
export function factoriesWith(
  overrides: Readonly<Record<string, ProcessorFactory>>,
  base: Factories = strategyFactories,
): Factories {
  return {
    createPhase: (phase, strategy) => base.createPhase(phase, strategy),
    createProcessor: (name) => (Object.hasOwn(overrides, name) ? overrides[name]!() : base.createProcessor(name)),
  };
}

/** `base` extended with the reserved names the rewritten `processor` steps use. */
function withStepProcessors(base: Factories): Factories {
  return {
    createPhase: (phase, strategy) => base.createPhase(phase, strategy),
    createProcessor: (name) =>
      name.startsWith(RESERVED_PREFIX)
        ? stepProcessorFor(name.slice(RESERVED_PREFIX.length))
        : base.createProcessor(name),
  };
}

// ------------------------------------------------------------------------------------------------------------
// the `processor` op

/**
 * Rewrites every `processor <name>` step into `runProcessor <reserved name>`.
 *
 * @throws Error naming the row and the op when the op has not exactly one argument, and naming the class when it is not registered
 */
export function rewriteProcessorSteps(row: PipelineStopRow): PipelineStopRow {
  if (row.steps === null || !row.steps.some(([op]) => op === PROCESSOR_OP)) {
    return row;
  }
  const steps = row.steps.map((step): PhaseStep => {
    const [op, ...args] = step;
    if (op !== PROCESSOR_OP) {
      return step;
    }
    if (args.length !== 1) {
      throw new Error(`row ${row.id}: op ${PROCESSOR_OP} takes 1 arguments, got ${String(args.length)}`);
    }
    const name = String(args[0]);
    if (!isRegistered(name)) {
      stepProcessorFor(name); // throws, naming the class
    }
    return ['runProcessor', `${RESERVED_PREFIX}${name}`] as unknown as PhaseStep;
  });
  return { ...row, steps };
}

/** What a loops step row needs: 7f2's environment, the factories being the enum-driven ones when absent. */
export type LoopsEnvironment = Omit<LabelsEnvironment, 'factories'> & { readonly factories?: Factories };

/**
 * Interprets a step row of the loops ref: 7f2's `runLabelsRow` (labelManager / interactive / logging, then 7f's interpreter)
 * after the `processor` steps are rewritten.
 */
export function runLoopsRow(row: PipelineStopRow, env: LoopsEnvironment): LabelsStepsResult {
  const factories = withStepProcessors(env.factories ?? strategyFactories);
  return runLabelsRow(rewriteProcessorSteps(row), { ...env, factories });
}

/** Replays a `models` row's `prefix` (every entry a strategy member or `<PHASE>/<STRATEGY>`) through the given factories. */
export function runLoopsPrefix(row: PipelineStopRow, factories: Factories = strategyFactories): LGraph {
  return runRoutingPrefix(row as never, withStepProcessors(factories));
}

// ------------------------------------------------------------------------------------------------------------
// twin hooks

type ProcessFn = (graph: LGraph, monitor: IElkProgressMonitor) => void;

/** A class whose `process` a hook patches (every ported processor and phase is such a class). */
export interface TwinTarget {
  readonly prototype: ILayoutProcessor<LGraph>;
}

/** A named twin: `before` runs ahead of the target's `process`; `wrap` replaces it (give one or both; `before` runs first). */
export interface TwinHook {
  readonly name: string;
  readonly target: TwinTarget;
  readonly before?: (graph: LGraph, monitor: IElkProgressMonitor) => void;
  readonly wrap?: (original: ProcessFn) => ProcessFn;
}

const twinHooks = new Map<string, TwinHook>();

/** Registers a hook under its name (a second registration of the name replaces the first). */
export function registerTwinHook(hook: TwinHook): void {
  twinHooks.set(hook.name, hook);
}

export function unregisterTwinHook(name: string): void {
  twinHooks.delete(name);
}

function hookOf(name: string): TwinHook {
  const hook = twinHooks.get(name);
  if (hook === undefined) {
    throw new Error(`twin hook ${name} is not registered (registerTwinHook)`);
  }
  return hook;
}

function patched(hook: TwinHook): ProcessFn {
  const target = hook.target.prototype as unknown as { process: ProcessFn };
  const unpatched = target.process;
  const inner = hook.wrap === undefined ? unpatched : hook.wrap(unpatched);
  return function (this: unknown, graph: LGraph, monitor: IElkProgressMonitor): void {
    hook.before?.(graph, monitor);
    inner.call(this, graph, monitor);
  };
}

/**
 * Runs `body` with the named hooks applied (in the order given) and restores every patched method afterwards, also on a
 * throw. `body` is typically one `replayLoopsRow`: the row is replayed again, this time with the twin.
 *
 * @throws Error naming the hook when it is not registered
 */
export function withTwins<T>(names: readonly string[], body: () => T): T {
  const hooks = names.map(hookOf);
  const saved: { target: { process: ProcessFn }; original: ProcessFn }[] = [];
  try {
    for (const hook of hooks) {
      const target = hook.target.prototype as unknown as { process: ProcessFn };
      saved.push({ target, original: target.process });
      target.process = patched(hook);
    }
    return body();
  } finally {
    for (const { target, original } of saved.reverse()) {
      target.process = original;
    }
  }
}

/** Every node of a graph: the layered ones, then the layerless ones. */
function nodesOf(graph: LGraph): LNode[] {
  return [...graph.getLayers().flatMap((layer) => layer.getNodes()), ...graph.getLayerlessNodes()];
}

/** A copy of an insertion-ordered map with its entries in reverse order (the W6 twin of an identity-keyed container). */
export function reversedCopy<K, V>(map: ReadonlyMap<K, V>): Map<K, V> {
  return new Map([...map.entries()].reverse());
}

/**
 * A `before` function that rebuilds, on every node of the graph, the map-valued property in reverse order
 * (7f2's G4 twin for `END_LABELS`, generalised). A node without the property is left alone.
 */
export function reverseNodeMapProperty<K, V>(property: IProperty<Map<K, V>>): (graph: LGraph) => void {
  return (graph) => {
    for (const node of nodesOf(graph)) {
      if (node.hasProperty(property)) {
        node.setProperty(property, reversedCopy(node.getProperty(property)));
      }
    }
  };
}
