// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { CalculateGraphSize } from './CalculateGraphSize.js';
import { EdgeAngleCalculator } from './EdgeAngleCalculator.js';
import { IntermediateProcessorStrategy } from './IntermediateProcessorStrategy.js';
import { GeneralCompactor } from './compaction/GeneralCompactor.js';
import { RadiusExtensionOverlapRemoval } from './overlaps/RadiusExtensionOverlapRemoval.js';
import { GeneralRotator } from './rotation/GeneralRotator.js';

const DECLARED = [
  'OVERLAP_REMOVAL',
  'COMPACTION',
  'ROTATION',
  'GRAPH_SIZE_CALCULATION',
  'OUTGOING_EDGE_ANGLES',
] as const;

describe('IntermediateProcessorStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(IntermediateProcessorStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(IntermediateProcessorStrategy.values()[4]).toBe(IntermediateProcessorStrategy.OUTGOING_EDGE_ANGLES);
  });

  it('compareTo orders by ordinal', () => {
    expect(
      IntermediateProcessorStrategy.OUTGOING_EDGE_ANGLES.compareTo(IntermediateProcessorStrategy.OVERLAP_REMOVAL),
    ).toBe(4);
    expect(
      IntermediateProcessorStrategy.OVERLAP_REMOVAL.compareTo(IntermediateProcessorStrategy.OUTGOING_EDGE_ANGLES),
    ).toBe(-4);
    expect(IntermediateProcessorStrategy.OVERLAP_REMOVAL.compareTo(IntermediateProcessorStrategy.OVERLAP_REMOVAL)).toBe(
      0,
    );
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(IntermediateProcessorStrategy.valueOf(name)).toBe(IntermediateProcessorStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => IntermediateProcessorStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => IntermediateProcessorStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.radial.intermediate.IntermediateProcessorStrategy.FOO',
    );
  });

  it('create() of OVERLAP_REMOVAL constructs RadiusExtensionOverlapRemoval', () => {
    expect(IntermediateProcessorStrategy.OVERLAP_REMOVAL.create()).toBeInstanceOf(RadiusExtensionOverlapRemoval);
  });

  it('create() of COMPACTION constructs GeneralCompactor', () => {
    expect(IntermediateProcessorStrategy.COMPACTION.create()).toBeInstanceOf(GeneralCompactor);
  });

  it('create() of ROTATION constructs GeneralRotator', () => {
    expect(IntermediateProcessorStrategy.ROTATION.create()).toBeInstanceOf(GeneralRotator);
  });

  it('create() of GRAPH_SIZE_CALCULATION constructs CalculateGraphSize', () => {
    expect(IntermediateProcessorStrategy.GRAPH_SIZE_CALCULATION.create()).toBeInstanceOf(CalculateGraphSize);
  });

  it('create() of OUTGOING_EDGE_ANGLES constructs EdgeAngleCalculator', () => {
    expect(IntermediateProcessorStrategy.OUTGOING_EDGE_ANGLES.create()).toBeInstanceOf(EdgeAngleCalculator);
  });
});
