// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { SelfLoopPreProcessor } from '../../src/alg/layered/intermediate/SelfLoopPreProcessor.js';
import { factoriesWith, runLoopsPrefix } from './layered-loops-replay-ops.js';
import { describeLoops, isStopRow, loadLoopsRowsIfPresent, type LoopsRow } from './layered-loops-replay-rows.js';
import type { PipelineStopRow } from './layered-pipeline-replay-rows.js';
import {
  SELF_LOOP_HOLDER_ID,
  compareSelfLoops,
  selfLoopsOf,
  withoutSelfLoopHolder,
} from './layered-loops-replay-selfloops.js';

const STOP = 'SELF_LOOP_PREPROCESSOR';
const factories = factoriesWith({ [STOP]: () => new SelfLoopPreProcessor() });
const HOLDER = { class: 'org.eclipse.elk.alg.layered.intermediate.loops.SelfLoopHolder' };

const stopRows = (): PipelineStopRow[] =>
  loadLoopsRowsIfPresent().filter(
    (row): row is PipelineStopRow => isStopRow(row) && row.group === 'models' && row.id.split('/').at(-2) === STOP,
  );

const withSummary = (row: LoopsRow): boolean => (row.expected as { selfLoops?: unknown }).selfLoops !== undefined;

describeLoops('layered-loops-replay-selfloops against layered-loops.json', () => {
  const row = stopRows().find(withSummary)!;
  const expected = (row.expected as { selfLoops?: Record<string, unknown> }).selfLoops!;

  it('selfLoopsOf reproduces the recorded summary of a prefix replay, key by key', () => {
    const actual = selfLoopsOf(runLoopsPrefix(row, factories));
    expect(actual).toBeDefined();
    expect(Object.keys(actual!).sort()).toEqual(Object.keys(expected).sort());
    expect(compareSelfLoops(actual, expected)).toEqual([]);
    const holder = Object.values(actual!)[0]!;
    expect(Object.keys(holder)).toEqual(['portsHidden', 'slotCounts', 'ports', 'loops']);
  });

  it('a difference in the summary is reported with its path', () => {
    const actual = selfLoopsOf(runLoopsPrefix(row, factories))!;
    const [nodePath, summary] = Object.entries(actual)[0]!;
    const altered = { ...actual, [nodePath]: { ...summary, portsHidden: !(summary.portsHidden as boolean) } };
    const diffs = compareSelfLoops(altered, expected);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.where).toBe('selfLoops');
    expect(diffs[0]!.message).toContain(`selfLoops.${nodePath}.portsHidden`);
  });

  it('a graph without a holder has no summary', () => {
    const plain = loadLoopsRowsIfPresent().find(
      (r): r is PipelineStopRow =>
        isStopRow(r) &&
        r.group === 'models' &&
        r.id.split('/').at(-2) === 'EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER' &&
        !withSummary(r),
    );
    expect(plain).toBeDefined();
    expect(selfLoopsOf(runLoopsPrefix(plain!, factories))).toBeUndefined();
  });
});

describe('compareSelfLoops', () => {
  it('equal absence is no difference', () => {
    expect(compareSelfLoops(undefined, undefined)).toEqual([]);
  });

  it('a summary without a recorded key, and a recorded key without a summary, are mismatches', () => {
    expect(compareSelfLoops({ 'g0/n0': {} }, undefined)).toEqual([
      { where: 'selfLoops', message: 'unexpected: the row records no selfLoops but the graph has a holder' },
    ]);
    expect(compareSelfLoops(undefined, { 'g0/n0': {} })).toEqual([
      { where: 'selfLoops', message: 'missing: the row records selfLoops but no node has a holder' },
    ]);
  });
});

describe('withoutSelfLoopHolder', () => {
  it('drops the holder from every properties map and from changed, and drops an entry that only held it', () => {
    const dump = {
      changed: [
        { path: 'g0/n0', props: { [SELF_LOOP_HOLDER_ID]: HOLDER, other: { t: 'bool', v: true } } },
        { path: 'g0/n1', props: { [SELF_LOOP_HOLDER_ID]: HOLDER } },
        { path: 'g0/n2', props: {} },
      ],
      dump: { graphs: [{ properties: { [SELF_LOOP_HOLDER_ID]: HOLDER, keep: 1 }, nodes: [{ properties: {} }] }] },
    };
    expect(withoutSelfLoopHolder(dump)).toEqual({
      changed: [
        { path: 'g0/n0', props: { other: { t: 'bool', v: true } } },
        { path: 'g0/n2', props: {} },
      ],
      dump: { graphs: [{ properties: { keep: 1 }, nodes: [{ properties: {} }] }] },
    });
  });

  it('a bare dump without changed is stripped the same way', () => {
    expect(withoutSelfLoopHolder({ nodes: [{ properties: { [SELF_LOOP_HOLDER_ID]: HOLDER } }] })).toEqual({
      nodes: [{ properties: {} }],
    });
  });
});
