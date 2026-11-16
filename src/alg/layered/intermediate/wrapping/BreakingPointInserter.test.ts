// SPDX-License-Identifier: EPL-2.0
// BreakingPointInserter against the oracle (W9: the staged class's "process throws" test becomes a test of the real class).
// The full row replay is WrappingRows.test.ts; here one recorded scenario pins what the processor does to the layering: the
// replayed graph has the recorded layers and exactly the breaking point dummies the recording names.
import { describe, expect, it } from 'vitest';
import '../../../../../test/helpers/layered-loops-replay-wrapping.js';
import { InteractiveLayeredGraphVisitor } from '../../InteractiveLayeredGraphVisitor.js';
import { ComponentsProcessor } from '../../components/ComponentsProcessor.js';
import { factoriesWith, runLoopsRow } from '../../../../../test/helpers/layered-loops-replay-ops.js';
import {
  isStopRow,
  loadLoopsRowsIfPresent,
  rowsByClass,
} from '../../../../../test/helpers/layered-loops-replay-rows.js';
import { registerLayered } from '../../../../../test/helpers/layered-framework-replay.js';
import { NodeType } from '../../graph/LNodeNodeType.js';
import { BreakingPointInserter } from './BreakingPointInserter.js';
import { Cut } from './BreakingPointInserterCut.js';

const BREAKING_POINT_INFO_ID = 'breakingPoint.info';
const ROW_ID = 'scenarios/BreakingPointInserter/chain-ard/RIGHT';

describe('BreakingPointInserter', () => {
  it('inserts the layers and breaking point dummies of the recorded scenario', () => {
    registerLayered();
    const row = rowsByClass('scenarios/BreakingPointInserter', loadLoopsRowsIfPresent()).find((r) => r.id === ROW_ID)!;
    expect(isStopRow(row)).toBe(true);
    const result = runLoopsRow(row as never, {
      factories: factoriesWith({ BREAKING_POINT_INSERTER: () => new BreakingPointInserter() }),
      components: new ComponentsProcessor(),
      createInteractiveVisitor: () => new InteractiveLayeredGraphVisitor(),
    });
    const expected = row.expected as unknown as {
      layers: string[][];
      changed: { props: Record<string, unknown> }[];
    };
    const recordedDummies = expected.changed.filter((c) => BREAKING_POINT_INFO_ID in c.props).length;
    const layers = result.graph.getLayers();
    expect(layers.length).toBe(expected.layers.length);
    expect(layers.map((layer) => layer.getNodes().length)).toEqual(expected.layers.map((layer) => layer.length));
    const dummies = layers.flatMap((layer) => layer.getNodes()).filter((n) => n.getType() === NodeType.BREAKING_POINT);
    expect(dummies.length).toBe(recordedDummies);
  });
});

describe('BreakingPointInserter.Cut', () => {
  it('refuses to offset an unassigned cut with the Java message', () => {
    expect(() => new Cut(3).offset()).toThrow('Cannot offset an unassigned cut.');
  });
});
