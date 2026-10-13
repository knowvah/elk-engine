// SPDX-License-Identifier: EPL-2.0
// Imports the builder module before anything else: the builder and LayoutOptionData import each
// other, and either import order must work (no TDZ error on the `Builder` member).
import { LayoutOptionDataBuilder } from './LayoutOptionDataBuilder.js';
import { describe, expect, it } from 'vitest';
import { EnumSet } from '../../java/util/EnumSet.js';
import { JavaClass } from '../../java/lang/JavaClass.js';
import { LayoutOptionData } from './LayoutOptionData.js';

describe('LayoutOptionDataBuilder (imported first)', () => {
  it('is exposed as LayoutOptionData.Builder', () => {
    expect(LayoutOptionData.Builder).toBe(LayoutOptionDataBuilder);
  });

  it('builds an option from every configured value', () => {
    const targets = EnumSet.of(LayoutOptionData.Target.NODES, LayoutOptionData.Target.PORTS);
    const data = new LayoutOptionDataBuilder()
      .id('a.b.c')
      .group('b')
      .legacyIds('old1', 'old2')
      .defaultValue(3)
      .optionClass(JavaClass.Integer)
      .type(LayoutOptionData.Type.INT)
      .name('Name')
      .description('Desc')
      .targets(targets)
      .visibility(LayoutOptionData.Visibility.ADVANCED)
      .lowerBound(1)
      .upperBound(9)
      .create();
    expect(data).toBeInstanceOf(LayoutOptionData);
    expect(data.getId()).toBe('a.b.c');
    expect(data.getGroup()).toBe('b');
    expect(data.getLegacyIds()).toEqual(['old1', 'old2']);
    expect(data.getDefault()).toBe(3);
    expect(data.getOptionClass()).toBe(JavaClass.Integer);
    expect(data.getType()).toBe(LayoutOptionData.Type.INT);
    expect(data.getName()).toBe('Name');
    expect(data.getDescription()).toBe('Desc');
    expect(data.getTargets()).toBe(targets);
    expect(data.getVisibility()).toBe(LayoutOptionData.Visibility.ADVANCED);
    expect(data.getLowerBound().compareTo(1)).toBe(0);
    expect(data.getUpperBound().compareTo(10)).toBe(-1);
  });
});
