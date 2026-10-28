// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { TestController } from '../../core/testing/TestController.js';
import { NullElkProgressMonitor } from '../../core/util/NullElkProgressMonitor.js';
import { UnsupportedOperationException } from '../../java/lang/UnsupportedOperationException.js';
import { ElkLayered } from './ElkLayered.js';
import { ElkLayeredTestExecutionState } from './ElkLayeredTestExecutionState.js';
import { LGraph } from './graph/LGraph.js';

const STAGED_MESSAGE = 'ElkLayered is ported in mission 7f';

describe('ElkLayered (staged, L2)', () => {
  it('throws the 7f message from every method that would run layout', () => {
    const layered = new ElkLayered();
    const graph = new LGraph();
    const monitor = new NullElkProgressMonitor();
    for (const run of [
      () => layered.doLayout(graph, monitor),
      () => layered.doCompoundLayout(graph, monitor),
      () => layered.prepareLayoutTest(graph),
    ]) {
      expect(run).toThrow(new UnsupportedOperationException(STAGED_MESSAGE));
    }
  });

  it('accepts and clears a test controller', () => {
    const layered = new ElkLayered();
    expect(layered.setTestController(new TestController('org.eclipse.elk.layered'))).toBeUndefined();
    expect(layered.setTestController(null)).toBeUndefined();
  });
});

describe('ElkLayeredTestExecutionState', () => {
  it('starts without graphs at step 0', () => {
    const state = new ElkLayeredTestExecutionState();
    expect(state.getGraphs()).toBeNull();
    expect(state.getStep()).toBe(0);
  });

  it('reports the graphs and step the outer class stored', () => {
    const state = new ElkLayeredTestExecutionState();
    const graph = new LGraph();
    state.graphs = [graph];
    state.step = 3;
    expect(state.getGraphs()).toEqual([graph]);
    expect(state.getGraphs()?.[0]).toBe(graph);
    expect(state.getStep()).toBe(3);
  });
});
