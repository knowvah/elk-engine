// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkNodeImpl } from '../../graph/impl/ElkNodeImpl.js';
import { LoggedGraph } from './LoggedGraph.js';
import { NullElkProgressMonitor } from './NullElkProgressMonitor.js';

describe('NullElkProgressMonitor', () => {
  const monitor = new NullElkProgressMonitor();

  it('returns the Java values for every query', () => {
    expect(monitor.isCanceled()).toBe(false);
    expect(monitor.begin('task', 10)).toBe(false);
    expect(monitor.isRunning()).toBe(false);
    expect(monitor.getTaskName()).toBeNull();
    expect(monitor.getSubMonitors()).toBeNull();
    expect(monitor.getParentMonitor()).toBeNull();
    expect(monitor.isLoggingEnabled()).toBe(false);
    expect(monitor.isLogPersistenceEnabled()).toBe(false);
    expect(monitor.getLogs()).toBeNull();
    expect(monitor.getLoggedGraphs()).toBeNull();
    expect(monitor.getDebugFolder()).toBeNull();
    expect(monitor.isExecutionTimeMeasured()).toBe(false);
    expect(monitor.getExecutionTime()).toBe(0);
  });

  it('returns itself from subTask', () => {
    expect(monitor.subTask(3)).toBe(monitor);
  });

  it('ignores work, done, log and logGraph', () => {
    monitor.worked(1);
    monitor.done();
    monitor.log('x');
    monitor.logGraph(new ElkNodeImpl(), 'tag');
    monitor.logGraph('{}', 'tag', LoggedGraph.Type.JSON);
    expect(monitor.getLogs()).toBeNull();
    expect(monitor.getLoggedGraphs()).toBeNull();
    expect(monitor.isRunning()).toBe(false);
  });
});
