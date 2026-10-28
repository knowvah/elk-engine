// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { CenterEdgeLabelPlacementStrategy } from './CenterEdgeLabelPlacementStrategy.js';

const DECLARED = [
  'MEDIAN_LAYER',
  'TAIL_LAYER',
  'HEAD_LAYER',
  'SPACE_EFFICIENT_LAYER',
  'WIDEST_LAYER',
  'CENTER_LAYER',
] as const;

describe('CenterEdgeLabelPlacementStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(CenterEdgeLabelPlacementStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(CenterEdgeLabelPlacementStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(CenterEdgeLabelPlacementStrategy.values()[5]).toBe(CenterEdgeLabelPlacementStrategy.CENTER_LAYER);
  });

  it('toString is the name', () => {
    expect(CenterEdgeLabelPlacementStrategy.CENTER_LAYER.toString()).toBe('CENTER_LAYER');
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(CenterEdgeLabelPlacementStrategy.valueOf(name)).toBe(CenterEdgeLabelPlacementStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => CenterEdgeLabelPlacementStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => CenterEdgeLabelPlacementStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.CenterEdgeLabelPlacementStrategy.FOO',
    );
  });

  it('compareTo orders by ordinal', () => {
    expect(CenterEdgeLabelPlacementStrategy.CENTER_LAYER.compareTo(CenterEdgeLabelPlacementStrategy.MEDIAN_LAYER)).toBe(
      5,
    );
    expect(CenterEdgeLabelPlacementStrategy.MEDIAN_LAYER.compareTo(CenterEdgeLabelPlacementStrategy.CENTER_LAYER)).toBe(
      -5,
    );
    expect(CenterEdgeLabelPlacementStrategy.MEDIAN_LAYER.compareTo(CenterEdgeLabelPlacementStrategy.MEDIAN_LAYER)).toBe(
      0,
    );
  });

  it('usesLabelSizeInformation is true exactly for WIDEST_LAYER, CENTER_LAYER and SPACE_EFFICIENT_LAYER', () => {
    const expected = {
      MEDIAN_LAYER: false,
      TAIL_LAYER: false,
      HEAD_LAYER: false,
      SPACE_EFFICIENT_LAYER: true,
      WIDEST_LAYER: true,
      CENTER_LAYER: true,
    };
    for (const name of DECLARED) {
      expect(CenterEdgeLabelPlacementStrategy[name].usesLabelSizeInformation()).toBe(expected[name]);
    }
  });
});
