// SPDX-License-Identifier: EPL-2.0
// The names a row's `prefix` and `expected.plans` use for the members of a plan (F5): phases as `<PHASE>/<STRATEGY>`,
// intermediate processors by their `IntermediateProcessorStrategy` member, `GraphTransformer` by position
// (`DIRECTION_PREPROCESSOR` when first in the plan, `DIRECTION_POSTPROCESSOR` otherwise; ticket 341). An instance is
// matched by class, and for `LayerSweepCrossingMinimizer` also by its private `crossMinType` (read through a structural
// cast), against what each enum member's `create()` makes: LAYER_SWEEP, MEDIAN_LAYER_SWEEP and the ONE_SIDED/TWO_SIDED
// greedy switch processors share that class but differ in `crossMinType`, so they are named unambiguously, with no hint
// and no position. Only the two `GraphTransformer` members are split by position (F5). `EdgeRouting.UNDEFINED` is left
// out of the P5 table because it creates the orthogonal router: that router names `P5_EDGE_ROUTING/ORTHOGONAL`, as all
// 156 landed rows spell it (none spells `/UNDEFINED`, so no hinted case remains).
// `create()` of a staged or pending arm throws `UnsupportedOperationException` (e.g. DIRECTION_PREPROCESSOR until
// GraphTransformer is ported); such members name no instance and are left out of the tables. Any other error is rethrown.
// The tables are built on first use, never at module evaluation (E1: no module-level read of an enum constant).
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { CrossingMinimizationStrategy } from '../../src/alg/layered/options/CrossingMinimizationStrategy.js';
import { CycleBreakingStrategy } from '../../src/alg/layered/options/CycleBreakingStrategy.js';
import { LayeringStrategy } from '../../src/alg/layered/options/LayeringStrategy.js';
import { NodePlacementStrategy } from '../../src/alg/layered/options/NodePlacementStrategy.js';
import { EdgeRouterFactory } from '../../src/alg/layered/p5edges/EdgeRouterFactory.js';
import { UnsupportedOperationException } from '../../src/java/lang/UnsupportedOperationException.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { EdgeRouting } from '../../src/core/options/EdgeRouting.js';

/** The separator between a phase and its strategy in a name. */
export const PHASE_SEPARATOR = '/';
export const DIRECTION_PREPROCESSOR = 'DIRECTION_PREPROCESSOR';
export const DIRECTION_POSTPROCESSOR = 'DIRECTION_POSTPROCESSOR';

export type Constructor = abstract new (...args: never[]) => unknown;
/** Class to discriminator (`crossMinType` or `undefined`) to the member names that create such an instance. */
export type ClassNames = Map<Constructor, Map<unknown, string[]>>;

export interface Creates {
  name(): string;
  create(): unknown;
}

/** The only discriminator any plan class needs: `LayerSweepCrossingMinimizer`'s private `crossMinType`. */
const discriminatorOf = (instance: object): unknown => (instance as { crossMinType?: unknown }).crossMinType;

/** A `create()` of a staged or pending arm names nothing; every other error is a real failure. */
function created(member: Creates): unknown {
  try {
    return member.create();
  } catch (error) {
    if (error instanceof UnsupportedOperationException) {
      return null;
    }
    throw error;
  }
}

function addNames(table: ClassNames, prefix: string, members: readonly Creates[]): void {
  for (const member of members) {
    const instance = created(member);
    if (instance === null || typeof instance !== 'object') {
      continue;
    }
    const key = instance.constructor as Constructor;
    const byDiscriminator = table.get(key) ?? new Map<unknown, string[]>();
    const discriminator = discriminatorOf(instance);
    byDiscriminator.set(discriminator, [...(byDiscriminator.get(discriminator) ?? []), `${prefix}${member.name()}`]);
    table.set(key, byDiscriminator);
  }
}

function tableOf(prefix: string, members: readonly Creates[]): ClassNames {
  const table: ClassNames = new Map();
  addNames(table, prefix, members);
  return table;
}

const PHASE_TABLES: readonly (readonly [string, () => readonly Creates[]])[] = [
  ['P1_CYCLE_BREAKING', () => CycleBreakingStrategy.values()],
  ['P2_LAYERING', () => LayeringStrategy.values()],
  ['P3_NODE_ORDERING', () => CrossingMinimizationStrategy.values()],
  ['P4_NODE_PLACEMENT', () => NodePlacementStrategy.values()],
  [
    'P5_EDGE_ROUTING',
    () =>
      EdgeRouting.values()
        .filter((r) => r !== EdgeRouting.UNDEFINED)
        .map((r) => ({
          name: () => r.name(),
          create: () => EdgeRouterFactory.factoryFor(r).create(),
        })),
  ],
];

let cached: ClassNames | null = null;

/** The class-to-names table of the real enums (intermediate processors, then the five phases' strategies). */
function classNames(): ClassNames {
  if (cached === null) {
    cached = tableOf('', IntermediateProcessorStrategy.values());
    for (const [phase, members] of PHASE_TABLES) {
      addNames(cached, `${phase}${PHASE_SEPARATOR}`, members());
    }
  }
  return cached;
}

/** Names `processors` against a given table (`planNames` passes the real enums'). */
export function planNamesWith(table: ClassNames, processors: readonly ILayoutProcessor<LGraph>[]): string[] {
  return processors.map((processor, index) => {
    const candidates = table.get(processor.constructor as Constructor)?.get(discriminatorOf(processor));
    if (candidates === undefined) {
      throw new Error(`plan entry ${String(index)} (${processor.constructor.name}) names no enum member`);
    }
    const [first] = candidates;
    return candidates.includes(DIRECTION_PREPROCESSOR) && candidates.includes(DIRECTION_POSTPROCESSOR)
      ? index === 0
        ? DIRECTION_PREPROCESSOR
        : DIRECTION_POSTPROCESSOR
      : first!;
  });
}

/** The names of a plan's entries, in order. */
export function planNames(processors: readonly ILayoutProcessor<LGraph>[]): string[] {
  return planNamesWith(classNames(), processors);
}

/** A table from members: what the real one is built from, exposed so a test can name a plan of stand-in classes. */
export function tableFrom(prefix: string, members: readonly Creates[]): ClassNames {
  return tableOf(prefix, members);
}

/**
 * Every spelling a row's plan or prefix may use: the names `planNames` can produce from the real enums, plus every
 * `IntermediateProcessorStrategy` member (an arm still staged cannot be matched by class yet, but its name is valid).
 */
export function knownPlanNames(): ReadonlySet<string> {
  const names = new Set<string>(IntermediateProcessorStrategy.values().map((member) => member.name()));
  for (const byDiscriminator of classNames().values()) {
    for (const list of byDiscriminator.values()) {
      list.forEach((name) => names.add(name));
    }
  }
  return names;
}
