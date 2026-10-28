// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { LayeringStrategy } from './LayeringStrategy.js';

const DECLARED = [
  'NETWORK_SIMPLEX',
  'LONGEST_PATH',
  'LONGEST_PATH_SOURCE',
  'COFFMAN_GRAHAM',
  'INTERACTIVE',
  'STRETCH_WIDTH',
  'MIN_WIDTH',
  'BF_MODEL_ORDER',
  'DF_MODEL_ORDER',
] as const;

/** Constant name to the class its `create()` arm will return, and the mission porting it. */
const ARMS: Record<(typeof DECLARED)[number], [string, string]> = {
  NETWORK_SIMPLEX: ['NetworkSimplexLayerer', '7b'],
  LONGEST_PATH: ['LongestPathLayerer', '7b'],
  LONGEST_PATH_SOURCE: ['LongestPathSourceLayerer', '7b'],
  COFFMAN_GRAHAM: ['CoffmanGrahamLayerer', '7b'],
  INTERACTIVE: ['InteractiveLayerer', '7b'],
  STRETCH_WIDTH: ['StretchWidthLayerer', '7b'],
  MIN_WIDTH: ['MinWidthLayerer', '7b'],
  BF_MODEL_ORDER: ['BreadthFirstModelOrderLayerer', '7b'],
  DF_MODEL_ORDER: ['DepthFirstModelOrderLayerer', '7b'],
};

describe('LayeringStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(LayeringStrategy.values().map((c) => c.name())).toEqual([...DECLARED]);
    expect(LayeringStrategy.values().map((c) => c.ordinal())).toEqual(DECLARED.map((_, i) => i));
    expect(LayeringStrategy.values()[8]).toBe(LayeringStrategy.DF_MODEL_ORDER);
  });

  it('toString is the name and compareTo orders by ordinal', () => {
    expect(LayeringStrategy.DF_MODEL_ORDER.toString()).toBe('DF_MODEL_ORDER');
    expect(LayeringStrategy.DF_MODEL_ORDER.compareTo(LayeringStrategy.NETWORK_SIMPLEX)).toBe(8);
    expect(LayeringStrategy.NETWORK_SIMPLEX.compareTo(LayeringStrategy.DF_MODEL_ORDER)).toBe(-8);
    expect(LayeringStrategy.NETWORK_SIMPLEX.compareTo(LayeringStrategy.NETWORK_SIMPLEX)).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(LayeringStrategy.valueOf(name)).toBe(LayeringStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => LayeringStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => LayeringStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.options.LayeringStrategy.FOO',
    );
  });

  it('create() of every constant throws UnsupportedOperationException naming its class and mission', () => {
    for (const name of DECLARED) {
      const [className, mission] = ARMS[name];
      expect(() => LayeringStrategy[name].create()).toThrow(UnsupportedOperationException);
      expect(() => LayeringStrategy[name].create()).toThrow(`${className} is ported in mission ${mission}`);
    }
  });

  it('create() of an unknown strategy keeps the Java IllegalArgumentException text', () => {
    const unknown = { toString: () => 'FAKE' } as unknown as LayeringStrategy;
    expect(() => LayeringStrategy.prototype.create.call(unknown)).toThrow(IllegalArgumentException);
    expect(() => LayeringStrategy.prototype.create.call(unknown)).toThrow(
      'No implementation is available for the layerer FAKE',
    );
  });
});
