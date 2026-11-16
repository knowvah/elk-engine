// SPDX-License-Identifier: EPL-2.0
// MinSizePostProcessor.java:41-42: TARGET_WIDTH = max(TARGET_WIDTH, MIN_WIDTH); an unset operand is a null Double that the Java
// unboxes (NullPointerException, a TypeError in the port).
import { describe, expect, it } from 'vitest';
import { BasicProgressMonitor } from '../../../core/util/BasicProgressMonitor.js';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { MinSizePostProcessor } from './MinSizePostProcessor.js';

const processed = (target: number | null, min: number | null): number => {
  const graph = ElkGraphUtil.createGraph();
  if (target !== null) {
    graph.setProperty(InternalProperties.TARGET_WIDTH, target);
  }
  if (min !== null) {
    graph.setProperty(InternalProperties.MIN_WIDTH, min);
  }
  new MinSizePostProcessor().process(graph, new BasicProgressMonitor());
  return graph.getProperty(InternalProperties.TARGET_WIDTH);
};

describe('MinSizePostProcessor', () => {
  it('raises a smaller target width to the minimum width', () => {
    expect(processed(5, 8)).toBe(8);
  });

  it('keeps a larger target width', () => {
    expect(processed(12, 8)).toBe(12);
  });

  it.each([
    [null, 8],
    [5, null],
  ])('throws a TypeError for an unset operand (target %s, min %s)', (target, min) => {
    expect(() => processed(target, min)).toThrow(TypeError);
  });
});
