// SPDX-License-Identifier: EPL-2.0
// The text-measurer seam (mission text-sizing-seam, TX3-TX5). The fixed-advance rows come from the oracle's ref
// test/golden/refs/java/label-sizing.json (patch 0003, `measurer: "fixed"`), never from this implementation.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { repoRoot } from '../corpus/corpus.js';
import { ElkGraphUtil } from '../../src/graph/util/ElkGraphUtil.js';
import type { ElkNode } from '../../src/graph/ElkNode.js';
import { buildLayoutTests, type LayoutTestDeps, type LayoutTestSpec } from './layout-test-runner.js';
import {
  AWT_SNAPSHOT_TEXT_MEASURER,
  FIXED_ADVANCE_TEXT_MEASURER,
  LABEL_SIZES,
  TEXT_MEASURER_ENV,
  textMeasurerFrom,
} from './layout-test-text-measurer.js';

interface TextRow {
  readonly text: string;
  readonly size: readonly [number, number];
}

const REF = JSON.parse(readFileSync(`${repoRoot()}/test/golden/refs/java/label-sizing.json`, 'utf8')) as {
  readonly measurer: string;
  readonly texts: readonly TextRow[];
};
const KNOWN_TEXT = 'P1';
const UNKNOWN_TEXT = 'not a recorded label text';
const UNKNOWN_MESSAGE = `label text ${JSON.stringify(UNKNOWN_TEXT)} is not in layered-label-metrics.json; add it and re-record`;

describe('FIXED_ADVANCE_TEXT_MEASURER', () => {
  it('the ref was recorded in fixed mode and has the 17 text rows', () => {
    expect(REF.measurer).toBe('fixed');
    expect(REF.texts).toHaveLength(17);
  });

  it.each(REF.texts.map((row) => [JSON.stringify(row.text), row] as const))(
    'measures %s as the oracle does',
    (_name, row) => {
      const size = FIXED_ADVANCE_TEXT_MEASURER.measure(row.text);
      expect([size.x, size.y]).toEqual([...row.size]);
    },
  );
});

describe('AWT_SNAPSHOT_TEXT_MEASURER', () => {
  it('returns the recorded size of a known text', () => {
    const size = AWT_SNAPSHOT_TEXT_MEASURER.measure(KNOWN_TEXT);
    expect([size.x, size.y]).toEqual([...LABEL_SIZES[KNOWN_TEXT]!]);
  });

  it("throws today's message on an unknown text", () => {
    expect(() => AWT_SNAPSHOT_TEXT_MEASURER.measure(UNKNOWN_TEXT)).toThrow(new Error(UNKNOWN_MESSAGE));
  });
});

describe('textMeasurerFrom', () => {
  it('selects the snapshot when the variable is unset', () => {
    expect(textMeasurerFrom({})).toBe(AWT_SNAPSHOT_TEXT_MEASURER);
  });

  it('selects the snapshot for awt', () => {
    expect(textMeasurerFrom({ [TEXT_MEASURER_ENV]: 'awt' })).toBe(AWT_SNAPSHOT_TEXT_MEASURER);
  });

  it('selects the fixed advance for fixed', () => {
    expect(textMeasurerFrom({ [TEXT_MEASURER_ENV]: 'fixed' })).toBe(FIXED_ADVANCE_TEXT_MEASURER);
  });

  it('throws for any other value', () => {
    expect(() => textMeasurerFrom({ [TEXT_MEASURER_ENV]: 'bogus' })).toThrow(new Error('Unknown text measurer: bogus'));
  });
});

describe('the runner and ELK_TEST_TEXT_MEASURER', () => {
  const TEXT = 'P1';
  const NO_LAYOUT: LayoutTestDeps = { layout(): void {} };

  function labelledGraph(): ElkNode {
    const graph = ElkGraphUtil.createGraph();
    ElkGraphUtil.createLabel(ElkGraphUtil.createNode(graph)).setText(TEXT);
    return graph;
  }

  /** Builds a suite from the env and returns the size of the label after the suite's layout ran. */
  function sizeUnder(env: Record<string, string | undefined>): [number, number] {
    let seen: [number, number] = [-1, -1];
    const spec: LayoutTestSpec = {
      name: 'measurer',
      graphs: [labelledGraph],
      afterLayout: {
        capture: (graph: ElkNode) => {
          const label = graph.getChildren().get(0).getLabels().get(0);
          seen = [label.getWidth(), label.getHeight()];
        },
      },
    };
    buildLayoutTests(spec, NO_LAYOUT, env)[0]!.run();
    return seen;
  }

  it('sizes from the snapshot when unset', () => {
    expect(sizeUnder({})).toEqual([...LABEL_SIZES[TEXT]!]);
  });

  it('sizes length x 6 by 12 under fixed', () => {
    expect(sizeUnder({ [TEXT_MEASURER_ENV]: 'fixed' })).toEqual([12, 12]);
  });

  it('throws while building a suite under an unknown value', () => {
    expect(() =>
      buildLayoutTests({ name: 'x', graphs: [labelledGraph] }, NO_LAYOUT, { [TEXT_MEASURER_ENV]: 'bogus' }),
    ).toThrow(new Error('Unknown text measurer: bogus'));
  });
});
