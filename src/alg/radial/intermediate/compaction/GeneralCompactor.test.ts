// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it, vi } from 'vitest';
import { buildStopState, compareStop, dumpRadial } from '../../../../../test/helpers/radial-replay-dump.js';
import { layoutOptionsOf } from '../../../../../test/helpers/radial-replay-eades-step.js';
import { rowsWithStepPair } from '../../../../../test/helpers/radial-replay-rows.js';
import { BasicProgressMonitor } from '../../../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { CompactionStrategy } from '../../options/CompactionStrategy.js';
import { RadialOptions } from '../../options/RadialOptions.js';
import { AnnulusWedgeCompaction } from './AnnulusWedgeCompaction.js';
import { GeneralCompactor } from './GeneralCompactor.js';
import { RadialCompaction } from './RadialCompaction.js';

const pairs = rowsWithStepPair('GeneralCompactor');

describe('GeneralCompactor', () => {
  it('has recorded stop pairs for both compactors', () => {
    const compactors = new Set(pairs.map(([row]) => layoutOptionsOf(row)['compactor']));
    expect([...compactors].sort()).toEqual(['RADIAL_COMPACTION', 'WEDGE_COMPACTION']);
    expect(pairs.length).toBeGreaterThan(10);
  });

  // acceptance: the recorded stop before GeneralCompactor, run through the TS processor, equals the recorded stop after it
  it.each(pairs.map(([row, pair]) => [row.id, row, pair] as const))(
    'turns the recorded before state into the recorded after state: %s',
    (_id, row, pair) => {
      const graph = buildStopState(row, pair.beforeIndex);
      new GeneralCompactor().process(graph, new BasicProgressMonitor());
      expect(compareStop(pair.after, dumpRadial(graph, pair.after.step))).toEqual([]);
    },
  );

  // GeneralCompactor.java:24-39
  it('begins the task, logs before and after when logging is enabled and compacts with the option strategy', () => {
    const graph = ElkGraphUtil.createGraph();
    const create = vi.spyOn(CompactionStrategy.RADIAL_COMPACTION, 'create').mockReturnValue({ compact: vi.fn() });
    graph.setProperty(RadialOptions.COMPACTOR, CompactionStrategy.RADIAL_COMPACTION);
    const monitor = { begin: vi.fn(() => true), isLoggingEnabled: vi.fn(() => true), logGraph: vi.fn() };
    new GeneralCompactor().process(graph, monitor as never);
    expect(monitor.begin).toHaveBeenCalledWith('General Compactor', 1);
    expect(monitor.logGraph.mock.calls.map((call) => (call as unknown[])[1])).toEqual(['Before', 'After']);
    expect(create).toHaveBeenCalledTimes(1);
    create.mockRestore();
  });

  it('does not log when logging is disabled', () => {
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(RadialOptions.COMPACTOR, CompactionStrategy.RADIAL_COMPACTION);
    const compact = vi.fn();
    const create = vi.spyOn(CompactionStrategy.RADIAL_COMPACTION, 'create').mockReturnValue({ compact });
    const monitor = { begin: vi.fn(() => true), isLoggingEnabled: vi.fn(() => false), logGraph: vi.fn() };
    new GeneralCompactor().process(graph, monitor as never);
    expect(monitor.logGraph).not.toHaveBeenCalled();
    expect(compact).toHaveBeenCalledWith(graph);
    create.mockRestore();
  });

  it('a graph with COMPACTOR = NONE has no implementation: the strategy throws', () => {
    const graph = ElkGraphUtil.createGraph();
    graph.setProperty(RadialOptions.COMPACTOR, CompactionStrategy.NONE);
    const monitor = { begin: vi.fn(() => true), isLoggingEnabled: vi.fn(() => false), logGraph: vi.fn() };
    expect(() => new GeneralCompactor().process(graph, monitor as never)).toThrow(
      'No implementation is available for the layout option NONE',
    );
  });

  it('the strategies create the two compactors', () => {
    expect(CompactionStrategy.RADIAL_COMPACTION.create()).toBeInstanceOf(RadialCompaction);
    expect(CompactionStrategy.WEDGE_COMPACTION.create()).toBeInstanceOf(AnnulusWedgeCompaction);
  });
});
