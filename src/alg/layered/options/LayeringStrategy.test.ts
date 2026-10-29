// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { BreadthFirstModelOrderLayerer } from '../p2layers/BreadthFirstModelOrderLayerer.js';
import { CoffmanGrahamLayerer } from '../p2layers/CoffmanGrahamLayerer.js';
import { DepthFirstModelOrderLayerer } from '../p2layers/DepthFirstModelOrderLayerer.js';
import { InteractiveLayerer } from '../p2layers/InteractiveLayerer.js';
import { LongestPathLayerer } from '../p2layers/LongestPathLayerer.js';
import { LongestPathSourceLayerer } from '../p2layers/LongestPathSourceLayerer.js';
import { MinWidthLayerer } from '../p2layers/MinWidthLayerer.js';
import { NetworkSimplexLayerer } from '../p2layers/NetworkSimplexLayerer.js';
import { StretchWidthLayerer } from '../p2layers/StretchWidthLayerer.js';
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

/** Constant name to the class its `create()` arm returns. */
const ARMS: Record<(typeof DECLARED)[number], new () => object> = {
  NETWORK_SIMPLEX: NetworkSimplexLayerer,
  LONGEST_PATH: LongestPathLayerer,
  LONGEST_PATH_SOURCE: LongestPathSourceLayerer,
  COFFMAN_GRAHAM: CoffmanGrahamLayerer,
  INTERACTIVE: InteractiveLayerer,
  STRETCH_WIDTH: StretchWidthLayerer,
  MIN_WIDTH: MinWidthLayerer,
  BF_MODEL_ORDER: BreadthFirstModelOrderLayerer,
  DF_MODEL_ORDER: DepthFirstModelOrderLayerer,
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

  it('create() of every constant returns a new instance of its layerer class', () => {
    for (const name of DECLARED) {
      const first = LayeringStrategy[name].create();
      expect(first).toBeInstanceOf(ARMS[name]);
      expect(first.constructor).toBe(ARMS[name]);
      expect(LayeringStrategy[name].create()).not.toBe(first);
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

describe('LayeringStrategy oracle row site/enums/LayeringStrategy', () => {
  // oracle: site/enums/LayeringStrategy
  it('site/enums/LayeringStrategy: constants in declaration order with name, ordinal and toString', () => {
    expect(LayeringStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual([
      ['NETWORK_SIMPLEX', 0, 'NETWORK_SIMPLEX'],
      ['LONGEST_PATH', 1, 'LONGEST_PATH'],
      ['LONGEST_PATH_SOURCE', 2, 'LONGEST_PATH_SOURCE'],
      ['COFFMAN_GRAHAM', 3, 'COFFMAN_GRAHAM'],
      ['INTERACTIVE', 4, 'INTERACTIVE'],
      ['STRETCH_WIDTH', 5, 'STRETCH_WIDTH'],
      ['MIN_WIDTH', 6, 'MIN_WIDTH'],
      ['BF_MODEL_ORDER', 7, 'BF_MODEL_ORDER'],
      ['DF_MODEL_ORDER', 8, 'DF_MODEL_ORDER'],
    ]);
  });

  // oracle: site/enums/LayeringStrategy
  it('site/enums/LayeringStrategy: valueOf of an unknown name throws IllegalArgumentException with the Java message', () => {
    expect(() => LayeringStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(IllegalArgumentException);
    expect(() => LayeringStrategy.valueOf('NO_SUCH_CONSTANT')).toThrow(
      new IllegalArgumentException(
        'No enum constant org.eclipse.elk.alg.layered.options.LayeringStrategy.NO_SUCH_CONSTANT',
      ),
    );
  });

  // oracle: site/enums/LayeringStrategy
  it('site/enums/LayeringStrategy: compareTo first/last', () => {
    const values = LayeringStrategy.values();
    const first = values[0]!;
    const last = values[values.length - 1]!;
    expect(first.compareTo(last)).toBe(-8);
    expect(last.compareTo(first)).toBe(8);
    expect(first.compareTo(first)).toBe(0);
  });
});
