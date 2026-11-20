// SPDX-License-Identifier: EPL-2.0
// Anchored case of LabelDummySwitcher (mission 7f2, T17a, G12): the S item of unreached.md for the SPACE_EFFICIENT_LAYER
// strategy (`LabelDummySwitcherSpaceEfficient.ts`, `LabelDummySwitcher.java:407-530`). Every literal below is copied from
// the recorded row; the expectations are never derived by hand (AD-13).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { registerLayered } from '../../../../test/helpers/layered-framework-replay.js';
import { labelsDump, type LabelsExpected } from '../../../../test/helpers/layered-labels-replay-dump.js';
import { runLabelsRow } from '../../../../test/helpers/layered-labels-replay-ops.js';
import { isStopRow, loadLabelsRows } from '../../../../test/helpers/layered-labels-replay-rows.js';
import { registerPipelineEnums, type PipelineStopRow } from '../../../../test/helpers/layered-pipeline-replay-rows.js';
import { LabelDummySwitcher } from './LabelDummySwitcher.js';
import { ComponentsProcessor } from '../components/ComponentsProcessor.js';
import { ROUTING_PHASE_FACTORIES } from '../../../../test/helpers/layered-replay-factories.js';

const ROW_ID = 'sites/LabelDummySwitcher/spaceEfficient';

const row = (): PipelineStopRow =>
  loadLabelsRows()
    .filter(isStopRow)
    .find((r) => r.id === ROW_ID)!;
const replay = (): LabelsExpected =>
  labelsDump(
    runLabelsRow(row(), { factories: ROUTING_PHASE_FACTORIES, components: new ComponentsProcessor() }),
    row().expected as unknown as LabelsExpected,
  );

beforeAll(() => {
  registerLayered();
  registerPipelineEnums();
});

describe('LabelDummySwitcher (the space-efficient site, T17a)', () => {
  it('finds the recorded row', () => {
    expect(row().id).toBe(ROW_ID);
  });

  it('puts each label dummy into the layer the space-efficient strategy picks (LabelDummySwitcher.java:407-530)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient layers; LabelDummySwitcher.java:407-530
    expect(replay().layers).toEqual([
      ['g0/n0'],
      ['new/n0', 'new/n1', 'g0/n1'],
      ['new/n2', 'new/n3', 'g0/n2', 'new/n4'],
      ['new/n5', 'g0/n3', 'new/n6', 'new/n7'],
      ['g0/n4'],
    ]);
  });

  it('keeps the layer order of the recorded edges after the switch', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient edges; LabelDummySwitcher.java:407-530
    const edges = replay().edges.map((edge) => [edge.path, edge.src, edge.tgt]);
    expect(edges).toContainEqual(['new/e2', 'new/p4', 'new/p11']);
    expect(edges).toContainEqual(['new/e5', 'new/p10', 'g0/n4/p1']);
    expect(edges).toHaveLength(16);
  });
});

/** The `[label dummy width, layer index]` of every `assignLayer` call of a replay, in call order. */
function assignmentsOf(): [number, number][] {
  const calls: [number, number][] = [];
  const original = (LabelDummySwitcher.prototype as unknown as { assignLayer: (info: never, layer: number) => void })
    .assignLayer;
  const spy = vi
    .spyOn(LabelDummySwitcher.prototype as unknown as { assignLayer: typeof original }, 'assignLayer')
    .mockImplementation(function (this: LabelDummySwitcher, info: never, layer: number) {
      calls.push([(info as { labelDummy: { getSize(): { x: number } } }).labelDummy.getSize().x, layer]);
      original.call(this, info, layer);
    });
  try {
    replay();
  } finally {
    spy.mockRestore();
  }
  return calls;
}

describe('LabelDummySwitcher (the space-efficient assignment order, internal state, T17a)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('assigns the single-layer label first, then the others from the widest to the narrowest (java:416,430-436)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient input labels le7 90 (one layer), le4 100, le5 80, le6 60
    expect(assignmentsOf().map(([width]) => width)).toEqual([90, 100, 80, 60]);
  });

  it('assigns each label dummy to the layer the recorded row holds it in (java:407-530)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient layers (the dummies new/n5, n0, n3... by their recorded sizes)
    const dump = replay();
    const layerOf = (path: string): number => dump.layers.findIndex((layer) => layer.includes(path));
    const widthOf = (path: string): number => {
      const hex = (dump.geometry.nodes[path]!.size as unknown as string[])[0]!;
      return new DataView(new BigUint64Array([BigInt(`0x${hex}`)]).buffer).getFloat64(0, true);
    };
    const recorded = dump.layers
      .flat()
      .filter((path) => path.startsWith('new/') && widthOf(path) > 0)
      .map((path): [number, number] => [widthOf(path), layerOf(path)]);
    const assigned = assignmentsOf();
    expect(assigned).toHaveLength(4);
    for (const call of assigned) {
      expect(recorded).toContainEqual(call);
    }
  });
});

// Anchored cases of the two sibling rows of issue #48 (plans/label-switcher-mutants): graphs on which one-edit mutants
// of the strategy that the row above cannot tell from the Java pick another layer. Literals are copied from the rows.
const FITS_AND_TIES_ID = 'sites/LabelDummySwitcher/spaceEfficient-fitsAndTies';
const VERTICAL_ID = 'sites/LabelDummySwitcher/spaceEfficient-vertical';

const rowOf = (id: string): PipelineStopRow =>
  loadLabelsRows()
    .filter(isStopRow)
    .find((r) => r.id === id)!;
const replayOf = (id: string): LabelsExpected =>
  labelsDump(
    runLabelsRow(rowOf(id), { factories: ROUTING_PHASE_FACTORIES, components: new ComponentsProcessor() }),
    rowOf(id).expected as unknown as LabelsExpected,
  );
/** `[layer index, width, height]` of a node of the dump, the size as the recorded raw IEEE hex. */
const placedAt = (dump: LabelsExpected, path: string): (number | string)[] => [
  dump.layers.findIndex((layer) => layer.includes(path)),
  ...(dump.geometry.nodes[path]!.size as unknown as string[]),
];

/** The `[label dummy width, layer index]` of every `assignLayer` call of a replay of the row, in call order. */
function assignmentsOfRow(id: string): [number, number][] {
  const calls: [number, number][] = [];
  const proto = LabelDummySwitcher.prototype as unknown as { assignLayer: (info: never, layer: number) => void };
  const original = proto.assignLayer;
  const spy = vi.spyOn(proto, 'assignLayer').mockImplementation(function (
    this: LabelDummySwitcher,
    info: never,
    layer: number,
  ) {
    calls.push([(info as { labelDummy: { getSize(): { x: number } } }).labelDummy.getSize().x, layer]);
    original.call(this, info, layer);
  });
  try {
    replayOf(id);
  } finally {
    spy.mockRestore();
  }
  return calls;
}

describe('LabelDummySwitcher (space-efficient: a trivial fit, an equal width and a tie, issue #48)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds the recorded row', () => {
    expect(rowOf(FITS_AND_TIES_ID).id).toBe(FITS_AND_TIES_ID);
  });

  it('puts each label dummy into the layer the strategy picks (LabelDummySwitcher.java:407-530)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient-fitsAndTies layers; LabelDummySwitcher.java:407-530
    expect(replayOf(FITS_AND_TIES_ID).layers).toEqual([
      ['g0/n0'],
      ['g0/n1', 'new/n0', 'new/n1'],
      ['new/n2', 'g0/n2', 'new/n3', 'new/n4'],
      ['new/n5', 'g0/n3'],
      ['g0/n4'],
    ]);
  });

  it('holds the 50-wide and the 0-wide label dummy in layer 1 and the 80-wide one in layer 2', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient-fitsAndTies layers and geometry.nodes (new/n0, new/n1, new/n2)
    const dump = replayOf(FITS_AND_TIES_ID);
    // le5, as wide as node b of layer 1: the first layer at least as wide is returned (java:493-495)
    expect(placedAt(dump, 'new/n0')).toEqual([1, '4049000000000000', '402c000000000000']);
    // le4, 0 wide: a layer's size is 0 here, so the first layer of its range houses it (java:452-467)
    expect(placedAt(dump, 'new/n1')).toEqual([1, '0000000000000000', '402c000000000000']);
    // le6: layers 2 and 3 have the same potential width 50 and the leftmost one is kept (java:516-519)
    expect(placedAt(dump, 'new/n2')).toEqual([2, '4054000000000000', '402c000000000000']);
  });

  it('assigns the 0-wide label in the trivial pass, then the others from the widest (java:410,416-422)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient-fitsAndTies layers and geometry: widths 0 and 50 in layer 1, 80 in
    // layer 2; the order is the Java's (LabelDummySwitcher.java:410 before :416-422)
    expect(assignmentsOfRow(FITS_AND_TIES_ID)).toEqual([
      [0, 1],
      [80, 2],
      [50, 1],
    ]);
  });
});

describe('LabelDummySwitcher (space-efficient in a vertical layout: all layer widths 0, issue #48)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('finds the recorded row', () => {
    expect(rowOf(VERTICAL_ID).id).toBe(VERTICAL_ID);
  });

  it('puts each label dummy into the layer the strategy picks (LabelDummySwitcher.java:407-530)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient-vertical layers; LabelDummySwitcher.java:407-530
    expect(replayOf(VERTICAL_ID).layers).toEqual([
      ['g0/n0'],
      ['new/n0', 'new/n1', 'new/n2', 'g0/n1'],
      ['new/n3', 'new/n4', 'new/n5', 'g0/n2'],
      ['new/n6', 'new/n7', 'g0/n3'],
      ['g0/n4'],
    ]);
  });

  it('holds the label dummy of extent 30 in layer 1 and those of extent 80 and 50 in layer 3', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient-vertical layers and geometry.nodes (new/n2, new/n6, new/n7)
    const dump = replayOf(VERTICAL_ID);
    // le4: nothing is left unassigned and every layer width is 0, so the initial, leftmost layer stays (java:488-489)
    expect(placedAt(dump, 'new/n2')).toEqual([1, '403e000000000000', '4045800000000000']);
    // le6: on layers 1 and 2 the last unassigned match, le4 (30), counts, on layer 3 only le5 (50) (java:502-508)
    expect(placedAt(dump, 'new/n6')).toEqual([3, '4054000000000000', '4045800000000000']);
    // le5: layer 3 is as wide as le6 made it (java:493-495)
    expect(placedAt(dump, 'new/n7')).toEqual([3, '4049000000000000', '4045800000000000']);
  });

  it('has no trivial assignment and assigns from the widest to the narrowest (java:416-422)', () => {
    // oracle: sites/LabelDummySwitcher/spaceEfficient-vertical layers and geometry: extents 80 and 50 in layer 3, 30 in
    // layer 1; the order is the Java's (LabelDummySwitcher.java:416-422)
    expect(assignmentsOfRow(VERTICAL_ID)).toEqual([
      [80, 3],
      [50, 3],
      [30, 1],
    ]);
  });
});
