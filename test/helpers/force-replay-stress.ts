// SPDX-License-Identifier: EPL-2.0
// Runs a stress ref row through the REAL engine and provider while observing every stop the recorder (tools/vectors/ForceVectors.java,
// `Driver.stress`) took, without a hook in production code (mission 8b, T10). The observers are test-side wrappers of prototype methods,
// installed for the duration of one run and removed in a `finally` (the pattern of force-replay-stops.ts):
//   ForceLayoutProvider.layout (after)          `forcePass` (the whole force pass is one stop: everything it calls is ignored meanwhile)
//   ElkGraphImporter.importGraph (before)       `microLayout` when no force pass ran (the interactive arm, after NodeMicroLayout)
//   ElkGraphImporter.importGraph (after)        `import`
//   ComponentsProcessor.split (after)           `split`
//   StressMajorization.initialize (after)       `initialize` with `stress` { dim, iterationLimit, epsilon, desiredEdgeLength, apsp, w }
//   StressMajorization.execute (after)          `execute` with `stress` { dim, iterationLimit, epsilon, desiredEdgeLength }
//   the provider's label loop                   `labelRefresh` has no method to wrap: it is taken right before the next `initialize` or
//                                               the `recombine` (nothing touches the component's state in between)
//   ComponentsProcessor.recombine (before/after) `recombine`
//   ElkGraphImporter.applyLayout (after)        `applyLayout`
import { ComponentsProcessor } from '../../src/alg/force/ComponentsProcessor.js';
import { ElkGraphImporter } from '../../src/alg/force/ElkGraphImporter.js';
import { ForceLayoutProvider } from '../../src/alg/force/ForceLayoutProvider.js';
import type { FGraph } from '../../src/alg/force/graph/FGraph.js';
import { StressMajorization } from '../../src/alg/force/stress/StressMajorization.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { dumpRecombine, dumpState, importInput, type DumpOptions } from './force-replay-dump.js';
import { dumpElk } from './force-replay-elk.js';
import {
  hexOf,
  STEP_APPLY_LAYOUT,
  STEP_FORCE_PASS,
  STEP_IMPORT,
  STEP_MICRO_LAYOUT,
  STEP_RECOMBINE,
  STEP_SPLIT,
  type StopsRow,
} from './force-replay-rows.js';
import { wrap, type ObservedStop } from './force-replay-stops.js';

const STEP_INITIALIZE = 'initialize';
const STEP_EXECUTE = 'execute';
const STEP_LABEL_REFRESH = 'labelRefresh';
const STRESS_DUMP: DumpOptions = { stress: true };

/** The private state of `StressMajorization` the recorder reads by reflection (`ForceVectors.stressDump`). */
interface StressFields {
  readonly dim: { name(): string };
  readonly iterationLimit: number;
  readonly epsilon: number;
  readonly desiredEdgeLength: number;
  readonly apsp: readonly (readonly number[])[];
  readonly w: readonly (readonly number[])[];
}

const matrix = (a: readonly (readonly number[])[]): string[][] => a.map((row) => row.map(hexOf));

/** `ForceVectors.stressDump`: the matrices only at `initialize`. */
function stressDump(m: StressFields, matrices: boolean): Record<string, unknown> {
  const head = {
    dim: m.dim.name(),
    iterationLimit: m.iterationLimit,
    epsilon: hexOf(m.epsilon),
    desiredEdgeLength: hexOf(m.desiredEdgeLength),
  };
  return matrices ? { ...head, apsp: matrix(m.apsp), w: matrix(m.w) } : head;
}

/** Observes one engine run of a stress row. */
class StressObserver {
  readonly stops: ObservedStop[] = [];
  private readonly restores: (() => void)[] = [];
  private components: FGraph[] = [];
  /** Whether the force pass is running (its importer, splitter and applier calls are not stress stops). */
  private inForce = false;
  private forcePassSeen = false;
  /** The component whose `labelRefresh` has not been taken yet. */
  private pendingLabels: FGraph | null = null;

  constructor(private readonly root: ElkNode) {}

  private push(step: string, component: number | null, body: Record<string, unknown>): void {
    this.stops.push({ step, component, ...body });
  }

  private flushLabels(): void {
    if (this.pendingLabels !== null) {
      const sub = this.pendingLabels;
      this.pendingLabels = null;
      this.push(STEP_LABEL_REFRESH, this.components.indexOf(sub), { state: dumpState(sub, STRESS_DUMP) });
    }
  }

  private installForcePass(): void {
    this.restores.push(
      wrap(ForceLayoutProvider.prototype, 'layout', (_self, args, proceed) => {
        this.inForce = true;
        try {
          return proceed();
        } finally {
          this.inForce = false;
          this.forcePassSeen = true;
          this.push(STEP_FORCE_PASS, null, { elk: dumpElk(args[0] as ElkNode) });
        }
      }),
    );
  }

  private installImporter(): void {
    this.restores.push(
      wrap(ElkGraphImporter.prototype, 'importGraph', (_self, _args, proceed) => {
        if (this.inForce) {
          return proceed();
        }
        if (!this.forcePassSeen) {
          this.push(STEP_MICRO_LAYOUT, null, { elk: dumpElk(this.root) });
        }
        const fgraph = proceed() as FGraph;
        this.push(STEP_IMPORT, null, { state: dumpState(fgraph, STRESS_DUMP) });
        return fgraph;
      }),
      wrap(ElkGraphImporter.prototype, 'applyLayout', (_self, _args, proceed) => {
        const result = proceed();
        if (!this.inForce) {
          this.push(STEP_APPLY_LAYOUT, null, { elk: dumpElk(this.root) });
        }
        return result;
      }),
    );
  }

  private installComponents(): void {
    this.restores.push(
      wrap(ComponentsProcessor.prototype, 'split', (_self, _args, proceed) => {
        const components = proceed() as FGraph[];
        if (!this.inForce) {
          this.components = components;
          this.push(STEP_SPLIT, null, { components: components.map((c) => dumpState(c, STRESS_DUMP)) });
        }
        return components;
      }),
      wrap(ComponentsProcessor.prototype, 'recombine', (_self, args, proceed) => {
        if (this.inForce) {
          return proceed();
        }
        this.flushLabels();
        const result = proceed() as FGraph;
        this.push(STEP_RECOMBINE, null, { ...dumpRecombine(args[0] as FGraph[], result, STRESS_DUMP) });
        return result;
      }),
    );
  }

  private installMajorization(): void {
    this.restores.push(
      wrap(StressMajorization.prototype, 'initialize', (self, args, proceed) => {
        this.flushLabels();
        const result = proceed();
        const sub = args[0] as FGraph;
        this.push(STEP_INITIALIZE, this.components.indexOf(sub), {
          state: dumpState(sub, STRESS_DUMP),
          stress: stressDump(self as StressFields, true),
        });
        return result;
      }),
      wrap(StressMajorization.prototype, 'execute', (self, _args, proceed) => {
        const result = proceed();
        const sub = (self as { graph: FGraph }).graph;
        this.push(STEP_EXECUTE, this.components.indexOf(sub), {
          state: dumpState(sub, STRESS_DUMP),
          stress: stressDump(self as StressFields, false),
        });
        this.pendingLabels = sub;
        return result;
      }),
    );
  }

  /** Runs the engine on the root with every observer installed. */
  run(): void {
    this.installForcePass();
    this.installImporter();
    this.installComponents();
    this.installMajorization();
    try {
      new RecursiveGraphLayoutEngine().layout(this.root, new BasicProgressMonitor());
    } finally {
      for (const restore of this.restores.reverse()) {
        restore();
      }
    }
  }
}

/** The stops of the TS engine run of a stress stops row, in the order they happened. */
export function runStressStops(row: StopsRow): ObservedStop[] {
  const observer = new StressObserver(importInput(row));
  observer.run();
  return observer.stops;
}
