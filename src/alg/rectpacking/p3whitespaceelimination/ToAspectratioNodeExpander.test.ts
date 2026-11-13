// SPDX-License-Identifier: EPL-2.0
// The task name of ToAspectratioNodeExpander (mission 8c): an upstream prose typo corrected per the CLAUDE.md carve-out. The phase's
// layout behaviour is proven by whitespaceElimination.replay.test.ts and RectPackingVectors.test.ts against the oracle rows.
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { ToAspectratioNodeExpander } from './ToAspectratioNodeExpander.js';

describe('ToAspectratioNodeExpander task name (ToAspectratioNodeExpander.java:51)', () => {
  it('begins the task "To Aspect Ratio Whitespace Eliminator" (upstream text: "To Aspect Ratio Whitesapce Eliminator")', () => {
    const monitor = new BasicProgressMonitor();
    // a graph without the drawing properties of p2: `begin` runs first, then the unboxing of DRAWING_WIDTH throws (Java: NPE)
    expect(() => new ToAspectratioNodeExpander().process(ElkGraphUtil.createGraph(), monitor)).toThrow(TypeError);
    expect(monitor.getTaskName()).toBe('To Aspect Ratio Whitespace Eliminator');
  });
});
