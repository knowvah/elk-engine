// SPDX-License-Identifier: EPL-2.0
// Twin tests of the loops sweep helper (mission 7g, T19): each part's replay equals the landed sweep helper (or the engine driven by hand)
// on the vendored inputs under test/golden/inputs/loops, which hold copies of the corpus files the sweep reads.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LayeredOptions } from '../../src/alg/layered/options/LayeredOptions.js';
import { WrappingStrategy } from '../../src/alg/layered/options/WrappingStrategy.js';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { RecursiveGraphLayoutEngine } from '../../src/core/RecursiveGraphLayoutEngine.js';
import { BasicProgressMonitor } from '../../src/core/util/BasicProgressMonitor.js';
import { ElkGraphText } from '../../src/graph/text/ElkGraphText.js';
import { repoRoot } from '../corpus/corpus.js';
import { replayCase as replayLabels } from './layered-labels-sweep.js';
import { elkDump, replayCase as replayPipeline } from './layered-pipeline-sweep.js';
import {
  canonicalNaN,
  loopsHash,
  PART_A,
  PART_B,
  PART_C,
  replayCase,
  splitVariant,
  type LoopsSweepCase,
} from './layered-loops-sweep.js';

const VENDORED = path.join(repoRoot(), 'test', 'golden', 'inputs', 'loops');
const PTOLEMY_MODEL = 'realworld/ptolemy/flattened/ptera_trafficlight_TrafficLight';
const SELF_LOOPS_MODEL = 'tests/layered/self_loops/free';
const HASH_LENGTH = 64;
const WRAPPING_ID = LayeredOptions.WRAPPING_STRATEGY.getId();

const caseOf = (
  fields: Partial<LoopsSweepCase> & Pick<LoopsSweepCase, 'part' | 'model' | 'variant'>,
): LoopsSweepCase => ({
  id: `${fields.part}/${fields.model}/${fields.variant}`,
  kind: 'model',
  target: null,
  ...fields,
});

describe('layered loops sweep helper', () => {
  beforeAll(() => {
    LayoutMetaDataService.unload();
    LayoutMetaDataService.getInstance();
  });

  it('hashes both signs of a NaN alike and leaves infinities and finite values apart', () => {
    const NEGATIVE_NAN = 'fff8000000000000';
    const POSITIVE_NAN = '7ff8000000000000';
    const INFINITIES = ['7ff0000000000000', 'fff0000000000000'];
    const ONE = '3ff0000000000000';
    const dumpOf = (token: string): { [key: string]: unknown } => ({ id: 'n', box: [ONE, token], children: [] });
    expect(canonicalNaN(dumpOf(NEGATIVE_NAN))).toEqual(dumpOf(POSITIVE_NAN));
    expect(loopsHash(dumpOf(NEGATIVE_NAN))).toBe(loopsHash(dumpOf(POSITIVE_NAN)));
    for (const token of [...INFINITIES, ONE]) {
      expect(canonicalNaN(dumpOf(token))).toEqual(dumpOf(token));
      expect(loopsHash(dumpOf(token))).not.toBe(loopsHash(dumpOf(POSITIVE_NAN)));
    }
    expect(loopsHash(dumpOf(INFINITIES[0]!))).not.toBe(loopsHash(dumpOf(INFINITIES[1]!)));
  });

  it('splits a part c variant at its first equals sign', () => {
    expect(splitVariant(`${WRAPPING_ID}=SINGLE_EDGE`)).toEqual({ id: WRAPPING_ID, value: 'SINGLE_EDGE' });
  });

  it('rejects a variant without an option value', () => {
    expect(() => splitVariant('RIGHT')).toThrow('variant RIGHT is not <option id>=<value>');
  });

  it('part a replays as the pipeline sweep helper does (a whole model and a level)', () => {
    const model = caseOf({ part: PART_A, model: PTOLEMY_MODEL, variant: 'LEFT' });
    expect(loopsHash(replayCase(model, VENDORED))).toBe(
      loopsHash(replayPipeline({ ...model, direction: 'LEFT' }, VENDORED)),
    );
    const level = caseOf({ part: PART_A, kind: 'level', model: PTOLEMY_MODEL, variant: 'POLYLINE' });
    expect(loopsHash(replayCase(level, VENDORED))).toBe(
      loopsHash(replayPipeline({ ...level, routing: 'POLYLINE' }, VENDORED)),
    );
  });

  it('part b replays as the labels sweep helper does (default and a direction)', () => {
    for (const variant of ['default', 'UP']) {
      const line = caseOf({ part: PART_B, model: SELF_LOOPS_MODEL, variant });
      expect(loopsHash(replayCase(line, VENDORED))).toBe(loopsHash(replayLabels(line as never, VENDORED)));
    }
  });

  it('part c equals the engine driven by hand with the option on the root of a flat model', () => {
    const line = caseOf({
      part: PART_C,
      model: `${SELF_LOOPS_MODEL}.elkt`,
      variant: `${WRAPPING_ID}=${WrappingStrategy.SINGLE_EDGE.name()}`,
    });
    const root = ElkGraphText.load(readFileSync(path.join(VENDORED, `${SELF_LOOPS_MODEL}.elkt`), 'utf8')).root!;
    root.setProperty(LayeredOptions.WRAPPING_STRATEGY, WrappingStrategy.SINGLE_EDGE);
    new RecursiveGraphLayoutEngine().layout(root, new BasicProgressMonitor());
    const dump = replayCase(line, VENDORED);
    expect(loopsHash(dump)).toBe(loopsHash(elkDump(root)));
    expect(loopsHash(dump)).toHaveLength(HASH_LENGTH);
  });

  it('part c reads a .json model and rejects an unknown option', () => {
    const json = caseOf({
      part: PART_C,
      model: `${PTOLEMY_MODEL}.json`,
      variant: `${WRAPPING_ID}=${WrappingStrategy.MULTI_EDGE.name()}`,
    });
    expect(loopsHash(replayCase(json, VENDORED))).toHaveLength(HASH_LENGTH);
    expect(() => replayCase({ ...json, variant: 'no.such.option=X' }, VENDORED)).toThrow(
      'option no.such.option is unknown to the metadata service',
    );
  });
});
