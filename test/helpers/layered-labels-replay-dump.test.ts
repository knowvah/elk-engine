// SPDX-License-Identifier: EPL-2.0
// The labels dump: which members it adds, the hex encoding of label sizes, and what the comparison reports.
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../src/core/data/LayoutMetaDataService.js';
import { encodeHex } from './layered-framework-replay.js';
import { compareLabels, labelsDump, type LabelsExpected } from './layered-labels-replay-dump.js';
import { runLabelsRow } from './layered-labels-replay-ops.js';
import type { PipelineStopRow } from './layered-pipeline-replay-rows.js';

const LABEL_WIDTH = 30;
const LABEL_HEIGHT = 8;
const INPUT = {
  elk: {
    id: 'root',
    children: [
      {
        id: 'n1',
        width: 10,
        height: 10,
        labels: [{ id: 'nl', text: 'n', width: LABEL_WIDTH, height: LABEL_HEIGHT }],
        ports: [{ id: 'p1', width: 2, height: 2, labels: [{ id: 'pl', text: 'p', width: 4, height: 5 }] }],
      },
      { id: 'n2', width: 10, height: 10 },
    ],
    edges: [{ id: 'e1', sources: ['n1'], targets: ['n2'], labels: [{ id: 'el', text: 'e', width: 6, height: 7 }] }],
  },
};
const row: PipelineStopRow = {
  id: 'scenarios/synthetic',
  group: 'scenarios',
  input: INPUT,
  target: null,
  options: {},
  steps: [['importGraph', null], ['normalise'], ['dump']],
  prefix: null,
  expected: {} as PipelineStopRow['expected'],
};
const unused = (): never => {
  throw new Error('unused');
};
const env = {
  factories: { createProcessor: unused, createPhase: unused },
  components: { split: () => [], combine: () => undefined },
};
const ASKS_FOR_BOTH = { geometry: { nodes: {}, layers: [], labels: {}, labelSizes: {}, edges: {}, graph: {} } };
const asks = ASKS_FOR_BOTH as unknown as LabelsExpected;

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('labelsDump', () => {
  it('records the position and the hex size of every label, edge labels included, when the row asks', () => {
    const dump = labelsDump(runLabelsRow(row, env), asks);
    const sizes = dump.geometry.labelSizes!;
    expect(Object.values(sizes)).toContainEqual([encodeHex(LABEL_WIDTH), encodeHex(LABEL_HEIGHT)]);
    expect(Object.keys(sizes)).toHaveLength(3);
    expect(Object.keys(dump.geometry.labels!)).toEqual(Object.keys(sizes));
    expect(Object.keys(sizes)).toEqual([...Object.keys(sizes)].sort());
  });

  it('adds no label members when the row does not record them', () => {
    const dump = labelsDump(runLabelsRow(row, env), {
      geometry: { nodes: {}, layers: [] },
    } as unknown as LabelsExpected);
    expect(dump.geometry.labelSizes).toBeUndefined();
  });
});

describe('compareLabels', () => {
  it('is empty against itself and names the label whose size differs', () => {
    const actual = labelsDump(runLabelsRow(row, env), asks);
    expect(compareLabels(actual, actual)).toEqual([]);
    const [path] = Object.keys(actual.geometry.labelSizes!);
    const changed = {
      ...actual,
      geometry: {
        ...actual.geometry,
        labelSizes: { ...actual.geometry.labelSizes, [path!]: [encodeHex(99), encodeHex(1)] },
      },
    } as LabelsExpected;
    const diffs = compareLabels(actual, changed);
    expect(diffs.map((d) => d.where)).toEqual([`geometry labelSizes ${path!}`, `geometry labelSizes ${path!}`]);
  });

  it('reports a missing and an unexpected label size', () => {
    const actual = labelsDump(runLabelsRow(row, env), asks);
    const [path] = Object.keys(actual.geometry.labelSizes!);
    const without = {
      ...actual,
      geometry: { ...actual.geometry, labelSizes: { [path!]: actual.geometry.labelSizes![path!]! } },
    };
    expect(compareLabels(actual, without as LabelsExpected).map((d) => d.message)).toEqual([
      'unexpected',
      'unexpected',
    ]);
    expect(compareLabels(without as LabelsExpected, actual).map((d) => d.message)).toEqual(['missing', 'missing']);
  });

  it('compares logged graphs when the expected side has them', () => {
    const actual = labelsDump(runLabelsRow(row, env), asks);
    const expected = { ...actual, logged: { tags: ['0-A'], dot: [], json: [] } } as LabelsExpected;
    expect(compareLabels(actual, expected).map((d) => d.where)).toEqual(['logged']);
  });
});
