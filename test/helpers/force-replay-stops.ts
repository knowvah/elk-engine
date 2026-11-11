// SPDX-License-Identifier: EPL-2.0
// Runs a force ref row through the REAL engine and provider while observing every stop the recorder (tools/vectors/ForceVectors.java,
// `Driver.force`) took, without a hook in production code (mission 8b, T8). The observers are test-side wrappers of prototype methods,
// installed for the duration of one run and removed in a `finally`:
//   ElkGraphImporter.importGraph (after)      `import`
//   ForceLayoutProvider.updateModel (after)   the model class the provider chose (reported by `split`)
//   ComponentsProcessor.split (after)         `split`
//   the models' moreIterations(count)         `moreIterations(0)` is the state after `initialize`; `moreIterations(n)` is the state right after
//                                             iteration n (the loop calls it once per count, before the next `iterationDone`): `initialize`,
//                                             `iteration1|2|10`, and `iterationLast` when the call answers false
//   ComponentsProcessor.recombine (after)     `recombine`
//   ElkGraphImporter.applyLayout (after)      `applyLayout`
// `randomPeek` (the recorder's nextLong() of a COPY of the generator): java.util.Random cannot be copied and the shim gets no API the Java
// lacks, so every `nextDouble` is counted per generator (any other draw would throw: force draws nothing else) and the fingerprint is the
// nextLong() of a test-side generator of the same seed that replayed that many draws.
import { ComponentsProcessor } from '../../src/alg/force/ComponentsProcessor.js';
import { ElkGraphImporter } from '../../src/alg/force/ElkGraphImporter.js';
import { ForceLayoutProvider } from '../../src/alg/force/ForceLayoutProvider.js';
import type { FGraph } from '../../src/alg/force/graph/FGraph.js';
import type { AbstractForceModel } from '../../src/alg/force/model/AbstractForceModel.js';
import { EadesModel } from '../../src/alg/force/model/EadesModel.js';
import { FruchtermanReingoldModel } from '../../src/alg/force/model/FruchtermanReingoldModel.js';
import { ForceOptions } from '../../src/alg/force/options/ForceOptions.js';
import { InternalProperties } from '../../src/alg/force/options/InternalProperties.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { Random } from '../../src/java/util/Random.js';
import { dumpRecombine, dumpState, importInput, type DumpOptions } from './force-replay-dump.js';
import { dumpElk, dumpModel } from './force-replay-elk.js';
import {
  STEP_APPLY_LAYOUT,
  STEP_IMPORT,
  STEP_RECOMBINE,
  STEP_SPLIT,
  type FullRow,
  type Hex,
  type StopsRow,
  type ThrowsRow,
} from './force-replay-rows.js';

/** The iteration counts that get a checkpoint of their own (`ForceVectors.forceComponent`). */
const CHECKPOINTS: readonly number[] = [1, 2, 10];
const STEP_ITERATION_LAST = 'iterationLast';
const STEP_INITIALIZE = 'initialize';
const HEX_DIGITS = 16;
const RADIX_HEX = 16;
const LONG_BITS = 64;

/** A stop as the recorder wrote it (`{ step, component, ...body }`, the body's keys in the recorder's order). */
export type ObservedStop = Readonly<Record<string, unknown>> & { readonly step: string };

export type Around = (self: unknown, args: unknown[], proceed: () => unknown) => unknown;

/** Replaces `proto[name]` by a wrapper around it and returns the function that puts the original back. */
export function wrap(proto: object, name: string, around: Around): () => void {
  const record = proto as Record<string, (...args: unknown[]) => unknown>;
  const original = record[name]!;
  record[name] = function (this: unknown, ...args: unknown[]): unknown {
    return around(this, args, () => original.apply(this, args));
  };
  return () => {
    record[name] = original;
  };
}

const hexOfLong = (value: bigint): Hex =>
  BigInt.asUintN(LONG_BITS, value).toString(RADIX_HEX).padStart(HEX_DIGITS, '0');

/** Observes one engine run. */
class Observer {
  readonly stops: ObservedStop[] = [];
  private readonly restores: (() => void)[] = [];
  private readonly draws = new WeakMap<Random, number>();
  private readonly options: DumpOptions = { randomPeek: (random) => this.peek(random) };
  private seed = 0;
  private modelName = '';
  private components: FGraph[] = [];
  private readonly nextLong = Random.prototype.nextLong;
  private readonly nextDouble = Random.prototype.nextDouble;

  constructor(private readonly root: ElkNode) {}

  private peek(random: Random): Hex {
    const replay = new Random(this.seed);
    const count = this.draws.get(random) ?? 0;
    for (let i = 0; i < count; i++) {
      this.nextDouble.call(replay);
    }
    return hexOfLong(this.nextLong.call(replay));
  }

  private push(step: string, component: number | null, body: Record<string, unknown>): void {
    this.stops.push({ step, component, ...body });
  }

  private iterationStop(step: string, model: AbstractForceModel, count: number): void {
    const k = this.components.indexOf(model.getGraph());
    this.push(step, k, { iteration: count, state: dumpState(model.getGraph(), this.options), model: dumpModel(model) });
  }

  private onMoreIterations(model: AbstractForceModel, count: number, more: boolean): void {
    if (count === 0) {
      this.iterationStop(STEP_INITIALIZE, model, 0);
    } else if (CHECKPOINTS.includes(count)) {
      this.iterationStop(`iteration${String(count)}`, model, count);
    }
    if (!more) {
      this.iterationStop(STEP_ITERATION_LAST, model, count);
    }
  }

  private installRandom(): void {
    const proto = Random.prototype as unknown as Record<string, unknown>;
    this.restores.push(
      wrap(Random.prototype, 'nextDouble', (self, _args, proceed) => {
        this.draws.set(self as Random, (this.draws.get(self as Random) ?? 0) + 1);
        return proceed();
      }),
    );
    for (const name of ['nextInt', 'nextLong', 'nextFloat', 'nextBoolean', 'nextGaussian']) {
      if (typeof proto[name] === 'function') {
        this.restores.push(
          wrap(Random.prototype, name, () => {
            throw new Error(`unexpected Random.${name}: the force replay counts nextDouble draws only`);
          }),
        );
      }
    }
  }

  private installImporter(): void {
    this.restores.push(
      wrap(ElkGraphImporter.prototype, 'importGraph', (_self, _args, proceed) => {
        const fgraph = proceed() as FGraph;
        this.seed = fgraph.getProperty(ForceOptions.RANDOM_SEED);
        this.push(STEP_IMPORT, null, { state: dumpState(fgraph, this.options) });
        return fgraph;
      }),
      wrap(ElkGraphImporter.prototype, 'applyLayout', (_self, _args, proceed) => {
        const result = proceed();
        this.push(STEP_APPLY_LAYOUT, null, { elk: dumpElk(this.root) });
        return result;
      }),
    );
  }

  private installProvider(): void {
    this.restores.push(
      wrap(ForceLayoutProvider.prototype, 'updateModel', (self, _args, proceed) => {
        const result = proceed();
        this.modelName = (self as { forceModel: object }).forceModel.constructor.name;
        return result;
      }),
    );
  }

  private installComponents(): void {
    this.restores.push(
      wrap(ComponentsProcessor.prototype, 'split', (_self, args, proceed) => {
        const components = proceed() as FGraph[];
        this.components = components;
        const fgraph = args[0] as FGraph;
        this.push(STEP_SPLIT, null, {
          model: this.modelName,
          randomPeek: this.peek(fgraph.getProperty(InternalProperties.RANDOM)),
          components: components.map((c) => dumpState(c, this.options)),
        });
        return components;
      }),
      wrap(ComponentsProcessor.prototype, 'recombine', (_self, args, proceed) => {
        const result = proceed() as FGraph;
        this.push(STEP_RECOMBINE, null, { ...dumpRecombine(args[0] as FGraph[], result, this.options) });
        return result;
      }),
    );
  }

  private installModels(): void {
    for (const proto of [EadesModel.prototype, FruchtermanReingoldModel.prototype]) {
      this.restores.push(
        wrap(proto, 'moreIterations', (self, args, proceed) => {
          const more = proceed() as boolean;
          this.onMoreIterations(self as AbstractForceModel, args[0] as number, more);
          return more;
        }),
      );
    }
  }

  /** Runs the engine on the root with every observer installed. */
  run(): void {
    this.installRandom();
    this.installImporter();
    this.installProvider();
    this.installComponents();
    this.installModels();
    try {
      new RecursiveGraphLayoutEngine().layout(this.root, new BasicProgressMonitor());
    } finally {
      for (const restore of this.restores.reverse()) {
        restore();
      }
    }
  }
}

/** The stops of the TS engine run of a stops row, in the order they happened. */
export function runForceStops(row: StopsRow): ObservedStop[] {
  const observer = new Observer(importInput(row));
  observer.run();
  return observer.stops;
}

/** The ELK dump of the TS engine run of a full row (the real provider through `RecursiveGraphLayoutEngine`). */
export function runForceFull(row: FullRow): ReturnType<typeof dumpElk> {
  const root = importInput(row);
  new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
  return dumpElk(root);
}

/** The error the TS engine run of a throws row raised, or `null` when it completed. */
export function runForceThrows(row: ThrowsRow): unknown {
  try {
    new RecursiveGraphLayoutEngine().layout(importInput(row), new BasicProgressMonitor());
  } catch (error) {
    return error;
  }
  return null;
}
