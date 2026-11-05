// SPDX-License-Identifier: EPL-2.0
// DebugUtil is a staged class (L1, N8): every overload throws until mission 7f2 ports DotDebugUtil and JsonDebugUtil.
import { describe, expect, it } from 'vitest';
import { NullElkProgressMonitor } from '../../core/util/NullElkProgressMonitor.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { DebugUtil } from './DebugUtil.js';
import { LGraph } from './graph/LGraph.js';

const STAGED_MESSAGE = 'DotDebugUtil is ported in mission 7f2';

describe('DebugUtil (staged, mission 7f2)', () => {
  const monitor = new NullElkProgressMonitor();
  const graph = new LGraph();

  it('logDebugGraphSlot (Java logDebugGraph(monitor, lgraph, slotIndex, name)) names DotDebugUtil and 7f2', () => {
    expect(() => DebugUtil.logDebugGraphSlot(monitor, graph, 3, 'slot')).toThrow(
      new UnsupportedOperationException(STAGED_MESSAGE),
    );
  });

  it('logDebugGraphSegments (the segment-graph overload) names DotDebugUtil and 7f2', () => {
    expect(() => DebugUtil.logDebugGraphSegments(monitor, graph, [], [])).toThrow(
      new UnsupportedOperationException(STAGED_MESSAGE),
    );
  });

  it('logDebugGraphHyperedges (the hypernode overload) names DotDebugUtil and 7f2', () => {
    expect(() => DebugUtil.logDebugGraphHyperedges(monitor, graph, 0, [], 'prefix', 'label')).toThrow(
      new UnsupportedOperationException(STAGED_MESSAGE),
    );
  });
});
