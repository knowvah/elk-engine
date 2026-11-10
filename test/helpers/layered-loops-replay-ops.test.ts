// SPDX-License-Identifier: EPL-2.0
// The behaviour of the loops ops helpers themselves (T2): the `processor` step op, `factoriesWith`, twin hooks. Every
// expectation compares a replay with a recorded row of the landed layered-labels.json or with the helper's own bookkeeping.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { LGraph } from '../../src/alg/layered/graph/LGraph.js';
import { IntermediateProcessorStrategy } from '../../src/alg/layered/intermediate/IntermediateProcessorStrategy.js';
import { LabelDummyInserter } from '../../src/alg/layered/intermediate/LabelDummyInserter.js';
import type { ILayoutProcessor } from '../../src/core/alg/ILayoutProcessor.js';
import { registerLayered } from './layered-framework-replay.js';
import { labelsRefPath } from './layered-labels-replay-rows.js';
import {
  PROCESSOR_OP,
  factoriesWith,
  registerStepProcessor,
  registerTwinHook,
  reversedCopy,
  strategyFactories,
  unregisterStepProcessor,
  unregisterTwinHook,
  withTwins,
} from './layered-loops-replay-ops.js';
import { loadLoopsRows, replayLoopsRow } from './layered-loops-replay-rows.js';
import type { PhaseStep } from './layered-phase-replay-rows.js';
import { isStopRow, registerPipelineEnums, type PipelineStopRow } from './layered-pipeline-replay-rows.js';

const SCENARIO = 'scenarios/LabelDummyInserter/center/RIGHT';
const FIRST_NAME = 'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER';
const SECOND_NAME = 'LABEL_DUMMY_INSERTER';
const STEP_NAME = 'Foo';

const scenario = (): PipelineStopRow => {
  const row = loadLoopsRows('scenarios', labelsRefPath()).find((r) => r.id === SCENARIO);
  if (row === undefined || !isStopRow(row)) {
    throw new Error(`${SCENARIO} is not in layered-labels.json`);
  }
  return row;
};

/** The scenario with its `runProcessor LABEL_DUMMY_INSERTER` step replaced by `processor Foo`. */
function withProcessorStep(row: PipelineStopRow, ...extra: string[]): PipelineStopRow {
  const steps = row.steps!.map((step): PhaseStep =>
    step[1] === SECOND_NAME ? ([PROCESSOR_OP, STEP_NAME, ...extra] as unknown as PhaseStep) : step,
  );
  return { ...row, steps };
}

const recording =
  (events: string[], label: string, inner: () => ILayoutProcessor<LGraph>) => (): ILayoutProcessor<LGraph> => {
    const processor = inner();
    return {
      process: (graph, monitor) => {
        events.push(label);
        processor.process(graph, monitor);
      },
    } as ILayoutProcessor<LGraph>;
  };

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

afterEach(() => {
  unregisterStepProcessor(STEP_NAME);
  unregisterTwinHook('t');
  unregisterTwinHook('u');
});

describe('processor step op', () => {
  it('runs the registered factory at the op position and replays the recorded row', () => {
    const events: string[] = [];
    registerStepProcessor(
      STEP_NAME,
      recording(events, STEP_NAME, () => IntermediateProcessorStrategy.valueOf(SECOND_NAME).create()),
    );
    const factories = factoriesWith({
      [FIRST_NAME]: recording(events, FIRST_NAME, () => IntermediateProcessorStrategy.valueOf(FIRST_NAME).create()),
    });
    expect(replayLoopsRow(withProcessorStep(scenario()), { factories })).toEqual([]);
    expect(events).toEqual([FIRST_NAME, STEP_NAME]);
  });

  it('throws naming the class when the name is not registered', () => {
    expect(() => replayLoopsRow(withProcessorStep(scenario()))).toThrow(/Foo, which is not registered/);
  });

  it('throws naming the op when it has the wrong argument count', () => {
    expect(() => replayLoopsRow(withProcessorStep(scenario(), 'extra'))).toThrow(
      /op processor takes 1 arguments, got 2/,
    );
  });
});

describe('factoriesWith', () => {
  it('uses the override for its name and the base for every other name', () => {
    const marker = { process: () => undefined } as unknown as ILayoutProcessor<LGraph>;
    const factories = factoriesWith({ [FIRST_NAME]: () => marker });
    expect(factories.createProcessor(FIRST_NAME)).toBe(marker);
    expect(factories.createProcessor(SECOND_NAME)).toBeInstanceOf(LabelDummyInserter);
    expect(factories.createPhase('P1_CYCLE_BREAKING', 'GREEDY')).toBeInstanceOf(
      strategyFactories.createPhase('P1_CYCLE_BREAKING', 'GREEDY').constructor,
    );
  });
});

describe('twin hooks', () => {
  const hookTarget = LabelDummyInserter;

  it('runs `before` ahead of the processor on every replay in the scope and restores the method', () => {
    const original = hookTarget.prototype.process;
    const events: string[] = [];
    registerTwinHook({ name: 't', target: hookTarget, before: () => events.push('before') });
    expect(replayLoopsRow(scenario(), { twins: ['t'] })).toEqual([]);
    expect(events).toEqual(['before']);
    expect(hookTarget.prototype.process).toBe(original);
    replayLoopsRow(scenario());
    expect(events).toEqual(['before']);
  });

  it('applies `wrap` around the original and restores the method when the body throws', () => {
    const original = hookTarget.prototype.process;
    const events: string[] = [];
    registerTwinHook({
      name: 'u',
      target: hookTarget,
      wrap: (inner) =>
        function (this: unknown, graph, monitor) {
          events.push('wrapped');
          inner.call(this, graph, monitor);
        },
    });
    expect(() =>
      withTwins(['u'], () => {
        new LabelDummyInserter();
        throw new Error('stop');
      }),
    ).toThrow('stop');
    expect(hookTarget.prototype.process).toBe(original);
    expect(replayLoopsRow(scenario(), { twins: ['u'] })).toEqual([]);
    expect(events).toEqual(['wrapped']);
  });

  it('throws naming an unregistered hook', () => {
    expect(() => replayLoopsRow(scenario(), { twins: ['nope'] })).toThrow(/twin hook nope is not registered/);
  });

  it('reversedCopy reverses insertion order and leaves the source untouched', () => {
    const source = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    expect([...reversedCopy(source).keys()]).toEqual(['c', 'b', 'a']);
    expect([...source.keys()]).toEqual(['a', 'b', 'c']);
  });
});
