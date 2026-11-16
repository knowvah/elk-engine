// SPDX-License-Identifier: EPL-2.0
// The empty-graph arm `tGraph.getNodes().isEmpty() ? 1 : size()` of LevelHeightProcessor.java:51, NeighborsProcessor.java:49 and
// NodePositionProcessor.java:47 (mission 8a, T19). A component graph always has a node, so the arm is unreachable through the
// pipeline; the Java statement says numberOfNodes becomes 1. LevelHeightProcessor and NeighborsProcessor guard the missing root
// (`if (root != null)`) and complete; NodePositionProcessor has no guard and dereferences it (`root.getChildrenCopy()`,
// NodePositionProcessor.java:62): a NullPointerException in Java, a TypeError here.
import { describe, expect, it } from 'vitest';
import { NullElkProgressMonitor } from '../../../core/util/NullElkProgressMonitor.js';
import { TGraph } from '../graph/TGraph.js';
import { LevelHeightProcessor } from './LevelHeightProcessor.js';
import { NeighborsProcessor } from './NeighborsProcessor.js';
import { NodePositionProcessor } from './NodePositionProcessor.js';

const read = (processor: object): number => (processor as { numberOfNodes: number }).numberOfNodes;

describe('processors on a graph without nodes', () => {
  it('LevelHeightProcessor (:51) sets numberOfNodes to 1 and completes', () => {
    const processor = new LevelHeightProcessor();
    processor.process(new TGraph(), new NullElkProgressMonitor());
    expect(read(processor)).toBe(1);
  });

  it('NeighborsProcessor (:49) sets numberOfNodes to 1 and completes', () => {
    const processor = new NeighborsProcessor();
    processor.process(new TGraph(), new NullElkProgressMonitor());
    expect(read(processor)).toBe(1);
  });

  it('NodePositionProcessor (:47) sets numberOfNodes to 1, then fails on the missing root (NullPointerException of Java)', () => {
    const processor = new NodePositionProcessor();
    expect(() => {
      processor.process(new TGraph(), new NullElkProgressMonitor());
    }).toThrow(TypeError);
    expect(read(processor)).toBe(1);
  });
});
