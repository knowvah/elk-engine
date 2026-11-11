// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { CompactionProcessor } from './CompactionProcessor.js';
import { DirectionProcessor } from './DirectionProcessor.js';
import { FanProcessor } from './FanProcessor.js';
import { GraphBoundsProcessor } from './GraphBoundsProcessor.js';
import { LevelCoordinatesProcessor } from './LevelCoordinatesProcessor.js';
import { LevelHeightProcessor } from './LevelHeightProcessor.js';
import { LevelProcessor } from './LevelProcessor.js';
import { NeighborsProcessor } from './NeighborsProcessor.js';
import { NodePositionProcessor } from './NodePositionProcessor.js';
import { RootProcessor } from './RootProcessor.js';
import { Untreeifyer } from './Untreeifyer.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';

const DECLARED = [
  'ROOT_PROC',
  'FAN_PROC',
  'LEVEL_PROC',
  'NEIGHBORS_PROC',
  'LEVEL_HEIGHT',
  'DIRECTION_PROC',
  'NODE_POSITION_PROC',
  'COMPACTION_PROC',
  'LEVEL_COORDS',
  'GRAPH_BOUNDS_PROC',
  'DETREEIFYING_PROC',
] as const;

describe('IntermediateProcessorStrategy', () => {
  it('declares the 11 constants in Java order (IntermediateProcessorStrategy.java:36-73) with matching ordinals and names', () => {
    expect(IntermediateProcessorStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(IntermediateProcessorStrategy.values()).toHaveLength(11);
    expect(IntermediateProcessorStrategy.values()[10]).toBe(IntermediateProcessorStrategy.DETREEIFYING_PROC);
  });

  it('compareTo orders by ordinal', () => {
    expect(IntermediateProcessorStrategy.DETREEIFYING_PROC.compareTo(IntermediateProcessorStrategy.ROOT_PROC)).toBe(10);
    expect(IntermediateProcessorStrategy.ROOT_PROC.compareTo(IntermediateProcessorStrategy.DETREEIFYING_PROC)).toBe(
      -10,
    );
    expect(IntermediateProcessorStrategy.LEVEL_PROC.compareTo(IntermediateProcessorStrategy.LEVEL_PROC)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(IntermediateProcessorStrategy.valueOf(name)).toBe(IntermediateProcessorStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => IntermediateProcessorStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => IntermediateProcessorStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.mrtree.intermediate.IntermediateProcessorStrategy.FOO',
    );
  });

  it('create() of ROOT_PROC constructs RootProcessor', () => {
    expect(IntermediateProcessorStrategy.ROOT_PROC.create()).toBeInstanceOf(RootProcessor);
  });

  it('create() of FAN_PROC constructs FanProcessor', () => {
    expect(IntermediateProcessorStrategy.FAN_PROC.create()).toBeInstanceOf(FanProcessor);
  });

  it('create() of LEVEL_PROC constructs LevelProcessor', () => {
    expect(IntermediateProcessorStrategy.LEVEL_PROC.create()).toBeInstanceOf(LevelProcessor);
  });

  it('create() of NEIGHBORS_PROC constructs NeighborsProcessor', () => {
    expect(IntermediateProcessorStrategy.NEIGHBORS_PROC.create()).toBeInstanceOf(NeighborsProcessor);
  });

  it('create() of LEVEL_HEIGHT constructs LevelHeightProcessor', () => {
    expect(IntermediateProcessorStrategy.LEVEL_HEIGHT.create()).toBeInstanceOf(LevelHeightProcessor);
  });

  it('create() of DIRECTION_PROC constructs DirectionProcessor', () => {
    expect(IntermediateProcessorStrategy.DIRECTION_PROC.create()).toBeInstanceOf(DirectionProcessor);
  });

  it('create() of NODE_POSITION_PROC constructs NodePositionProcessor', () => {
    expect(IntermediateProcessorStrategy.NODE_POSITION_PROC.create()).toBeInstanceOf(NodePositionProcessor);
  });

  it('create() of COMPACTION_PROC constructs CompactionProcessor', () => {
    expect(IntermediateProcessorStrategy.COMPACTION_PROC.create()).toBeInstanceOf(CompactionProcessor);
  });

  it('create() of LEVEL_COORDS constructs LevelCoordinatesProcessor', () => {
    expect(IntermediateProcessorStrategy.LEVEL_COORDS.create()).toBeInstanceOf(LevelCoordinatesProcessor);
  });

  it('create() of GRAPH_BOUNDS_PROC constructs GraphBoundsProcessor', () => {
    expect(IntermediateProcessorStrategy.GRAPH_BOUNDS_PROC.create()).toBeInstanceOf(GraphBoundsProcessor);
  });

  it('create() of DETREEIFYING_PROC constructs Untreeifyer', () => {
    expect(IntermediateProcessorStrategy.DETREEIFYING_PROC.create()).toBeInstanceOf(Untreeifyer);
  });

  it('create() of a constant outside the table throws the Java message (IntermediateProcessorStrategy.java:105-106)', () => {
    const foreign = Object.create(IntermediateProcessorStrategy.prototype, {
      toString: { value: () => 'NO_SUCH_PROC' },
    }) as IntermediateProcessorStrategy;
    expect(() => foreign.create()).toThrow(IllegalArgumentException);
    expect(() => foreign.create()).toThrow('No implementation is available for the layout processor NO_SUCH_PROC');
  });
});
