// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ElkNodeImpl } from '../../graph/impl/ElkNodeImpl.js';
import { ClassCastException } from '../../java/lang/ClassCastException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { BasicProgressMonitor } from './BasicProgressMonitor.js';
import type { IElkProgressMonitor } from './IElkProgressMonitor.js';
import { LoggedGraph } from './LoggedGraph.js';

/** Records the protected hooks. */
class RecordingMonitor extends BasicProgressMonitor {
  readonly events: string[] = [];

  protected override doBegin(name: string, total: number, top: boolean, levels: number): void {
    this.events.push(`begin:${name}:${total}:${top}:${levels}`);
  }

  protected override doWorked(completed: number, total: number, top: boolean): void {
    this.events.push(`worked:${completed}:${total}:${top}`);
  }

  protected override doDone(top: boolean, levels: number): void {
    this.events.push(`done:${top}:${levels}`);
  }

  protected override doSubTask(work: number, levels: number): BasicProgressMonitor {
    this.events.push(`sub:${work}:${levels}`);
    return new RecordingMonitor().withMaxHierarchyLevels(levels > 0 ? levels - 1 : levels);
  }
}

function sub(parent: IElkProgressMonitor, work: number): IElkProgressMonitor {
  const child = parent.subTask(work);
  if (child === null) {
    throw new Error('expected a sub-monitor');
  }
  return child;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BasicProgressMonitor configuration', () => {
  it('has the Java defaults', () => {
    const m = new BasicProgressMonitor();
    expect(m.isLoggingEnabled()).toBe(false);
    expect(m.isLogPersistenceEnabled()).toBe(false);
    expect(m.isExecutionTimeMeasured()).toBe(false);
    expect(m.isCanceled()).toBe(false);
    expect(m.isRunning()).toBe(false);
    expect(m.getTaskName()).toBeNull();
    expect(m.getLogs()).toBeNull();
    expect(m.getLoggedGraphs()).toBeNull();
    expect(m.getParentMonitor()).toBeNull();
    expect(m.getSubMonitors()).toEqual([]);
    expect(m.getExecutionTime()).toBe(0);
    expect(BasicProgressMonitor.ROOT_DEBUG_FOLDER_NAME).toBe('logs');
  });

  it('builders return this and set the flags', () => {
    const m = new BasicProgressMonitor();
    expect(m.withLogging(true)).toBe(m);
    expect(m.withLogPersistence(true)).toBe(m);
    expect(m.withExecutionTimeMeasurement(true)).toBe(m);
    expect(m.withMaxHierarchyLevels(3)).toBe(m);
    expect(m.isLoggingEnabled()).toBe(true);
    expect(m.isLogPersistenceEnabled()).toBe(true);
    expect(m.isExecutionTimeMeasured()).toBe(true);
    expect(m.getLogs()).toEqual([]);
    expect(m.getLoggedGraphs()).toEqual([]);
    m.withLogging(false);
    expect(m.getLogs()).toBeNull();
    expect(m.getLoggedGraphs()).toBeNull();
  });

  it('the deprecated constructor sets the hierarchy levels (negative means infinite)', () => {
    const limited = new RecordingMonitor().withMaxHierarchyLevels(2);
    const viaCtor = new BasicProgressMonitor(2);
    const negative = new RecordingMonitor().withMaxHierarchyLevels(-5);
    limited.begin('a', 1);
    negative.begin('b', 1);
    viaCtor.begin('c', 1);
    expect(limited.events).toEqual(['begin:a:1:true:2']);
    expect(negative.events).toEqual(['begin:b:1:true:-1']);
    expect(viaCtor.isRunning()).toBe(true);
  });
});

describe('BasicProgressMonitor execution time', () => {
  it('measures 2.5 s between performance.now 1000 and 3500', () => {
    const now = vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(3500);
    const m = new BasicProgressMonitor().withExecutionTimeMeasurement(true);
    expect(m.begin('t', 1)).toBe(true);
    m.done();
    expect(now).toHaveBeenCalledTimes(2);
    expect(m.getExecutionTime()).toBe(2.5);
  });

  it('does not read the clock when measurement is off', () => {
    const now = vi.spyOn(performance, 'now');
    const m = new BasicProgressMonitor();
    m.begin('t', 1);
    m.done();
    expect(now).not.toHaveBeenCalled();
    expect(m.getExecutionTime()).toBe(0);
  });

  it('truncates the start time to whole nanoseconds like a Java long', () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(0.0000004).mockReturnValueOnce(0.0000026);
    const m = new BasicProgressMonitor().withExecutionTimeMeasurement(true);
    m.begin('t', 1);
    m.done();
    // start = 0 ns, end = 2 ns
    expect(m.getExecutionTime()).toBe(2 * 1e-9);
  });
});

describe('BasicProgressMonitor begin/done lifecycle', () => {
  it('begin is true once, false afterwards, and calls doBegin with the top flag', () => {
    const m = new RecordingMonitor();
    expect(m.begin('task', 10)).toBe(true);
    expect(m.begin('other', 5)).toBe(false);
    expect(m.getTaskName()).toBe('task');
    expect(m.isRunning()).toBe(true);
    expect(m.events).toEqual(['begin:task:10:true:-1']);
  });

  it('begin on a closed monitor throws IllegalStateException', () => {
    const m = new BasicProgressMonitor();
    m.begin('t', 1);
    m.done();
    expect(() => m.begin('t', 1)).toThrow(IllegalStateException);
    expect(() => m.begin('t', 1)).toThrow('The task is already done.');
  });

  it('begin with a null name throws', () => {
    expect(() => new BasicProgressMonitor().begin(null as unknown as string, 1)).toThrow(TypeError);
  });

  it('done before begin throws IllegalStateException', () => {
    expect(() => new BasicProgressMonitor().done()).toThrow('The task has not begun yet.');
  });

  it('done completes the remaining work once and is idempotent', () => {
    const m = new RecordingMonitor();
    m.begin('t', 10);
    m.worked(4);
    m.done();
    m.done();
    expect(m.isRunning()).toBe(false);
    expect(m.events).toEqual(['begin:t:10:true:-1', 'worked:4:10:true', 'worked:10:10:true', 'done:true:-1']);
  });

  it('done on fully completed work reports no extra progress', () => {
    const m = new RecordingMonitor();
    m.begin('t', 2);
    m.worked(2);
    m.done();
    expect(m.events).toEqual(['begin:t:2:true:-1', 'worked:2:2:true', 'done:true:-1']);
  });
});

describe('BasicProgressMonitor worked', () => {
  it('ignores non-positive work, work after done and work without total', () => {
    const m = new RecordingMonitor();
    m.begin('t', 10);
    m.worked(0);
    m.worked(-3);
    expect(m.events).toEqual(['begin:t:10:true:-1']);
    m.done();
    const before = m.events.length;
    m.worked(5);
    expect(m.events).toHaveLength(before);

    const unknown = new RecordingMonitor();
    unknown.begin('u', -1);
    unknown.worked(5);
    expect(unknown.events).toEqual(['begin:u:-1:true:-1']);
  });

  it('stops counting once the total is reached', () => {
    const m = new RecordingMonitor();
    m.begin('t', 3);
    m.worked(5);
    m.worked(1);
    expect(m.events).toEqual(['begin:t:3:true:-1', 'worked:5:3:true']);
  });

  it('rounds work to binary32 like a Java float', () => {
    const m = new RecordingMonitor();
    m.begin('t', 1);
    m.worked(0.1);
    expect(m.events[1]).toBe(`worked:${Math.fround(0.1)}:1:true`);
  });
});

describe('BasicProgressMonitor sub-tasks', () => {
  it('propagates sub-task progress to the parent proportionally', () => {
    const parent = new RecordingMonitor();
    parent.begin('p', 10);
    const child = sub(parent, 4) as RecordingMonitor;
    child.begin('c', 2);
    expect(child.getParentMonitor()).toBe(parent);
    expect(parent.getSubMonitors()).toEqual([child]);
    child.worked(1);
    child.done();
    expect(parent.events).toEqual(['begin:p:10:true:-1', 'sub:4:-1', 'worked:2:10:true', 'worked:4:10:true']);
    expect(child.events).toEqual(['begin:c:2:false:-1', 'worked:1:2:false', 'worked:2:2:false', 'done:false:-1']);
  });

  it('does not propagate while the parent has no active child work', () => {
    const parent = new RecordingMonitor();
    parent.begin('p', 10);
    const child = sub(parent, 0);
    child.begin('c', 2);
    child.worked(2);
    expect(parent.events).toEqual(['begin:p:10:true:-1', 'sub:0:-1']);
  });

  it('returns null from subTask after done', () => {
    const m = new BasicProgressMonitor();
    m.begin('t', 1);
    m.done();
    expect(m.subTask(1)).toBeNull();
  });

  it('configures the sub-monitor like the parent', () => {
    const parent = new BasicProgressMonitor()
      .withLogging(true)
      .withLogPersistence(true)
      .withExecutionTimeMeasurement(true);
    const child = sub(parent, 1);
    expect(child.isLoggingEnabled()).toBe(true);
    expect(child.isLogPersistenceEnabled()).toBe(true);
    expect(child.isExecutionTimeMeasured()).toBe(true);
    expect(child.getLogs()).toEqual([]);
    const plain = sub(new BasicProgressMonitor(), 1);
    expect(plain.isLoggingEnabled()).toBe(false);
    expect(plain.isExecutionTimeMeasured()).toBe(false);
  });

  it('getSubMonitors returns a snapshot in creation order', () => {
    const parent = new BasicProgressMonitor();
    const a = sub(parent, 1);
    const snapshot = parent.getSubMonitors();
    const b = sub(parent, 1);
    expect(snapshot).toEqual([a]);
    expect(parent.getSubMonitors()).toEqual([a, b]);
  });
});

describe('BasicProgressMonitor hierarchy levels', () => {
  it('decrements positive levels per sub-task and keeps 0 and infinite', () => {
    const root = new RecordingMonitor().withMaxHierarchyLevels(2);
    root.begin('r', 1);
    const child = sub(root, 1) as RecordingMonitor;
    child.begin('c', 1);
    const grand = sub(child, 1) as RecordingMonitor;
    grand.begin('g', 1);
    const great = sub(grand, 1) as RecordingMonitor;
    great.begin('x', 1);
    expect(root.events).toContain('sub:1:2');
    expect(child.events).toContain('begin:c:1:false:1');
    expect(grand.events).toContain('begin:g:1:false:0');
    expect(great.events).toContain('begin:x:1:false:0');
  });

  it('a monitor with level 0 does not report to its parent', () => {
    const root = new RecordingMonitor().withMaxHierarchyLevels(1);
    root.begin('r', 10);
    const child = sub(root, 10) as RecordingMonitor;
    child.begin('c', 1);
    child.worked(1);
    expect(child.events).toContain('worked:1:1:false');
    expect(root.events).not.toContain('worked:10:10:true');
    expect(root.events.filter((e) => e.startsWith('worked'))).toEqual([]);
  });

  it('levels above 0 report up exactly that many hierarchy steps', () => {
    const root = new RecordingMonitor().withMaxHierarchyLevels(2);
    root.begin('r', 10);
    const child = sub(root, 10) as RecordingMonitor;
    child.begin('c', 10);
    const grand = sub(child, 10) as RecordingMonitor;
    grand.begin('g', 10);
    grand.worked(10);
    // grand has level 0: nothing reaches child or root
    expect(child.events.filter((e) => e.startsWith('worked'))).toEqual([]);
    child.worked(5);
    expect(root.events.filter((e) => e.startsWith('worked'))).toEqual(['worked:5:10:true']);
  });
});

describe('BasicProgressMonitor logging', () => {
  it('collects log messages as strings and ignores null', () => {
    const m = new BasicProgressMonitor().withLogging(true);
    m.log('a');
    m.log(42);
    m.log(null);
    m.log(undefined);
    expect(m.getLogs()).toEqual(['a', '42']);
    expect(m.getDebugFolder()).toBeNull();
  });

  it('ignores logs when logging is off', () => {
    const m = new BasicProgressMonitor();
    m.log('a');
    m.logGraph(new ElkNodeImpl(), 't');
    expect(m.getLogs()).toBeNull();
    expect(m.getLoggedGraphs()).toBeNull();
  });

  it('logs an ElkNode as a copy of type ELK with its tag', () => {
    const m = new BasicProgressMonitor().withLogging(true);
    const graph = new ElkNodeImpl();
    m.logGraph(graph, 't');
    const logged = m.getLoggedGraphs();
    expect(logged).toHaveLength(1);
    expect(logged[0]?.getTag()).toBe('t');
    expect(logged[0]?.getGraphType()).toBe(LoggedGraph.Type.ELK);
    expect(logged[0]?.getGraph()).not.toBe(graph);
    expect(logged[0]?.getGraph()).toBeInstanceOf(ElkNodeImpl);
  });

  it('logs typed graphs by reference and skips null graph or type', () => {
    const m = new BasicProgressMonitor().withLogging(true);
    m.logGraph('{"a":1}', 'j', LoggedGraph.Type.JSON);
    m.logGraph(null, 'n', LoggedGraph.Type.JSON);
    m.logGraph('x', 'n', null as unknown as LoggedGraph['getGraphType'] extends () => infer T ? T : never);
    m.logGraph(null as unknown as ElkNodeImpl, 'n');
    const logged = m.getLoggedGraphs();
    expect(logged).toHaveLength(1);
    expect(logged[0]?.getGraph()).toBe('{"a":1}');
    expect(logged[0]?.getGraphType()).toBe(LoggedGraph.Type.JSON);
    expect(logged[0]?.getTag()).toBe('j');
  });

  it('rejects a graph of the wrong type', () => {
    const m = new BasicProgressMonitor().withLogging(true);
    expect(() => m.logGraph(new ElkNodeImpl(), 't', LoggedGraph.Type.JSON)).toThrow(ClassCastException);
  });

  it('returns snapshots of the logs', () => {
    const m = new BasicProgressMonitor().withLogging(true);
    m.log('a');
    const logs = m.getLogs();
    m.log('b');
    expect(logs).toEqual(['a']);
    expect(m.getLogs()).toEqual(['a', 'b']);
  });
});
