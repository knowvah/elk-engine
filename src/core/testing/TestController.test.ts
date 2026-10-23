// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { ILayoutProcessor } from '../alg/ILayoutProcessor.js';
import { LayoutAlgorithmData } from '../data/LayoutAlgorithmData.js';
import type { IWhiteBoxTestable } from './IWhiteBoxTestable.js';
import { TestController } from './TestController.js';
import type { ILayoutExecutionListener } from './TestController.js';

const TARGET_ID = 'x';
const OTHER_ID = 'y';
const GRAPH = { name: 'graph' };

class WhiteBoxProvider extends AbstractLayoutProvider implements IWhiteBoxTestable {
  readonly received: (TestController | null)[] = [];
  layout(): void {}
  setTestController(controller: TestController): void {
    this.received.push(controller);
  }
}

class PlainProvider extends AbstractLayoutProvider {
  layout(): void {}
}

const PROCESSOR: ILayoutProcessor<unknown> = { process: () => {} };

function recorder(log: string[], name: string): ILayoutExecutionListener {
  return {
    layoutProcessorReady: (p, g, isRoot) => {
      expect(p).toBe(PROCESSOR);
      expect(g).toBe(GRAPH);
      log.push(`${name}:ready:${isRoot}`);
    },
    layoutProcessorFinished: (p, g, isRoot) => {
      expect(p).toBe(PROCESSOR);
      expect(g).toBe(GRAPH);
      log.push(`${name}:finished:${isRoot}`);
    },
  };
}

describe('TestController', () => {
  it('reports its target algorithm id', () => {
    expect(new TestController(TARGET_ID).getTargetAlgorithmId()).toBe(TARGET_ID);
  });

  it('targets only algorithm data with the same id', () => {
    const controller = new TestController(TARGET_ID);
    const make = (id: string): LayoutAlgorithmData => new LayoutAlgorithmData.Builder().id(id).create();
    expect(controller.targets(make(TARGET_ID))).toBe(true);
    expect(controller.targets(make(OTHER_ID))).toBe(false);
  });

  it('installs on and uninstalls from a white-box provider', () => {
    const controller = new TestController(TARGET_ID);
    const provider = new WhiteBoxProvider();
    controller.install(provider);
    expect(provider.received).toEqual([controller]);
    controller.uninstall();
    expect(provider.received).toEqual([controller, null]);
  });

  it('uninstall without an installed provider does nothing', () => {
    const controller = new TestController(TARGET_ID);
    expect(() => {
      controller.uninstall();
    }).not.toThrow();
    const provider = new WhiteBoxProvider();
    controller.install(provider);
    controller.uninstall();
    controller.uninstall();
    expect(provider.received).toHaveLength(2);
  });

  it('rejects a second install while installed', () => {
    const controller = new TestController(TARGET_ID);
    controller.install(new WhiteBoxProvider());
    const other = new WhiteBoxProvider();
    expect(() => {
      controller.install(other);
    }).toThrow(new IllegalStateException('Test controller may be installed on only one layout provider at a time'));
    expect(() => {
      controller.install(other);
    }).toThrow(IllegalStateException);
    expect(other.received).toEqual([]);
  });

  it('rejects a provider that is not white-box testable', () => {
    const controller = new TestController(TARGET_ID);
    const act = (): void => {
      controller.install(new PlainProvider());
    };
    expect(act).toThrow(IllegalArgumentException);
    expect(act).toThrow('Test controllers can only be installed on white-box testable layout algorithms');
  });

  it('can be reinstalled after uninstall', () => {
    const controller = new TestController(TARGET_ID);
    const first = new WhiteBoxProvider();
    const second = new WhiteBoxProvider();
    controller.install(first);
    controller.uninstall();
    controller.install(second);
    expect(second.received).toEqual([controller]);
  });

  it('notifies listeners in insertion order with the root flag', () => {
    const controller = new TestController(TARGET_ID);
    const log: string[] = [];
    controller.addLayoutExecutionListener(recorder(log, 'a'));
    controller.addLayoutExecutionListener(recorder(log, 'b'));
    controller.notifyProcessorReady(GRAPH, PROCESSOR);
    controller.notifyProcessorFinished(GRAPH, PROCESSOR);
    controller.notifyRootProcessorReady(GRAPH, PROCESSOR);
    controller.notifyRootProcessorFinished(GRAPH, PROCESSOR);
    expect(log).toEqual([
      'a:ready:false',
      'b:ready:false',
      'a:finished:false',
      'b:finished:false',
      'a:ready:true',
      'b:ready:true',
      'a:finished:true',
      'b:finished:true',
    ]);
  });

  it('adding the same listener twice notifies it once', () => {
    const controller = new TestController(TARGET_ID);
    const log: string[] = [];
    const listener = recorder(log, 'a');
    controller.addLayoutExecutionListener(listener);
    controller.addLayoutExecutionListener(listener);
    controller.notifyProcessorReady(GRAPH, PROCESSOR);
    expect(log).toEqual(['a:ready:false']);
  });

  it('removeLayoutExecutionListener adds the listener, as the Java does (upstream bug kept)', () => {
    const controller = new TestController(TARGET_ID);
    const log: string[] = [];
    const listener = recorder(log, 'a');
    controller.removeLayoutExecutionListener(listener);
    controller.notifyProcessorReady(GRAPH, PROCESSOR);
    expect(log).toEqual(['a:ready:false']);
    controller.removeLayoutExecutionListener(listener);
    controller.notifyProcessorReady(GRAPH, PROCESSOR);
    expect(log).toEqual(['a:ready:false', 'a:ready:false']);
  });
});
