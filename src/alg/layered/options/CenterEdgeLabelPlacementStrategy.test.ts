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

describe('CenterEdgeLabelPlacementStrategy oracle row site/enums/CenterEdgeLabelPlacementStrategy', () => {
  // oracle: site/enums/CenterEdgeLabelPlacementStrategy
  it('site/enums/CenterEdgeLabelPlacementStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(CenterEdgeLabelPlacementStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['MEDIAN_LAYER', 0, 'MEDIAN_LAYER'],
      ['TAIL_LAYER', 1, 'TAIL_LAYER'],
      ['HEAD_LAYER', 2, 'HEAD_LAYER'],
      ['SPACE_EFFICIENT_LAYER', 3, 'SPACE_EFFICIENT_LAYER'],
      ['WIDEST_LAYER', 4, 'WIDEST_LAYER'],
      ['CENTER_LAYER', 5, 'CENTER_LAYER'],
    ]);
  });

  // oracle: site/enums/CenterEdgeLabelPlacementStrategy
  it('site/enums/CenterEdgeLabelPlacementStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => CenterEdgeLabelPlacementStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => CenterEdgeLabelPlacementStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.CenterEdgeLabelPlacementStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/CenterEdgeLabelPlacementStrategy
  it('site/enums/CenterEdgeLabelPlacementStrategy: compareTo first/last', () => {
    const values = CenterEdgeLabelPlacementStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-5);
    expect(last.compareTo(first)).toBe(5);
    expect(first.compareTo(first)).toBe(0);
  });

  // oracle: site/enums/CenterEdgeLabelPlacementStrategy
  it.each([
    ['MEDIAN_LAYER', false],
    ['TAIL_LAYER', false],
    ['HEAD_LAYER', false],
    ['SPACE_EFFICIENT_LAYER', true],
    ['WIDEST_LAYER', true],
    ['CENTER_LAYER', true],
  ] as const)(
    'site/enums/CenterEdgeLabelPlacementStrategy: %s.usesLabelSizeInformation() is %s',
    (constant, expected) => {
      expect(CenterEdgeLabelPlacementStrategy.valueOf(constant).usesLabelSizeInformation()).toBe(expected);
    },
  );
});
