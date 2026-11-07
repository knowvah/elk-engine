// SPDX-License-Identifier: EPL-2.0
// Dispatch and comparison of the labels full rows. The recorded plans of every real row hold a staged 7f2 arm, so the runners
// are exercised on an inline graph the fixed algorithm lays out (no layered plan), through an injected plan capture.
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import {
  INTERACTIVE_FAMILY,
  LOGGED_FAMILY,
  compareLabelsFullRow,
  familyOf,
  runInteractiveFullRow,
  runLabelsFullRow,
  runLoggedFullRow,
} from './layered-labels-replay-full.js';
import type { FullRow, PlanMap } from './layered-pipeline-replay-rows.js';
import type { PlanCapture } from './layered-pipeline-replay-ops.js';

const FIXED = 'org.eclipse.elk.fixed';
const INPUT = {
  elk: {
    id: 'root',
    layoutOptions: { 'org.eclipse.elk.algorithm': FIXED },
    children: [{ id: 'n1', x: 3, y: 4, width: 10, height: 10 }],
  },
};
const PLANS: PlanMap = { root: ['MARK'] };
const capture: PlanCapture = (_row, runLayout) => {
  runLayout();
  return PLANS;
};

const row = (family: string, expected: Record<string, unknown> = {}): FullRow =>
  ({
    id: `full/${family}/model/variant`,
    group: 'full',
    input: INPUT,
    target: null,
    options: {},
    steps: null,
    prefix: null,
    expected: { layout: { id: 'root' }, plans: PLANS, ...expected },
  }) as FullRow;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('familyOf', () => {
  it('is the second id segment', () => {
    expect(familyOf(row('label-options'))).toBe('label-options');
  });
});

describe('runLabelsFullRow', () => {
  it('sends a plain family straight to the 7f runner (no logged, no layout1)', () => {
    const result = runLabelsFullRow(row('labels'), { capture });
    expect(result.plans).toEqual(PLANS);
    expect((result.layout as { id: string }).id).toBe('root');
    expect(result.logged).toBeUndefined();
    expect(result.layout1).toBeUndefined();
  });

  it('sends the logged family to the logging runner', () => {
    const result = runLabelsFullRow(row(LOGGED_FAMILY), { capture });
    expect(result.logged).toEqual({ tags: [], dot: [], json: [] });
    expect(runLoggedFullRow(row(LOGGED_FAMILY), { capture }).plans).toEqual(PLANS);
  });

  it('sends the interactive family to the two-run runner: layout1, the visitor, layout', () => {
    const visited: unknown[] = [];
    const env = { capture, createInteractiveVisitor: () => ({ visit: (e: unknown) => visited.push(e) }) };
    const result = runLabelsFullRow(row(INTERACTIVE_FAMILY), env);
    expect(visited).toHaveLength(1);
    expect((result.layout1 as { id: string }).id).toBe('root');
    expect(result.plans).toEqual(PLANS);
  });

  it('demands a visitor factory for the interactive family', () => {
    expect(() => runInteractiveFullRow(row(INTERACTIVE_FAMILY), {})).toThrow(
      'row full/interactive/model/variant: the interactive family needs a visitor factory',
    );
  });
});

describe('compareLabelsFullRow', () => {
  it('is empty for an equal result and names the logged graphs and layout1 when they differ', () => {
    const result = runLabelsFullRow(row(LOGGED_FAMILY), { capture });
    const logged = { tags: ['0-A'], dot: ['digraph {}'], json: ['{'] };
    expect(compareLabelsFullRow(result, row(LOGGED_FAMILY, { layout: result.layout, logged: result.logged }))).toEqual(
      [],
    );
    const diffs = compareLabelsFullRow(result, row(LOGGED_FAMILY, { layout: result.layout, logged }));
    expect(diffs.map((d) => d.path)).toEqual(['logged', 'logged', 'logged']);
    const layout1 = compareLabelsFullRow(
      result,
      row(LOGGED_FAMILY, { layout: result.layout, layout1: { id: 'other' } }),
    );
    expect(layout1.map((d) => d.path)).toEqual(['layout1']);
  });

  it('keeps 7f diffs for plans', () => {
    const result = runLabelsFullRow(row('labels'), { capture });
    const diffs = compareLabelsFullRow(result, row('labels', { layout: result.layout, plans: { root: ['OTHER'] } }));
    expect(diffs.map((d) => d.path)).toEqual(['plans[root][0]']);
  });
});
