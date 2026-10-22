// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../../graph/util/ElkGraphUtil.js';
import { Random } from '../../../../java/util/Random.js';
import { CoreOptions } from '../../../options/CoreOptions.js';
import { GeneratorOptions } from './GeneratorOptions.js';
import { nonNull, RandomGraphGenerator } from './RandomGraphGenerator.js';

const SEED = 42n;

describe('RandomGraphGenerator', () => {
  it('keeps the Java constants and starts with zeroed counters and no options', () => {
    const random = new Random(SEED);
    const gen = new RandomGraphGenerator(random);
    expect(RandomGraphGenerator.PORT_SEPARATION).toBe(7);
    expect(RandomGraphGenerator.MAX_ITER).toBe(12);
    expect(gen.random).toBe(random);
    expect(gen.options).toBeNull();
    expect([gen.nodeLabelCounter, gen.portLabelCounter, gen.maxHierarchyLevel]).toEqual([0, 0, 0]);
  });

  it('randomInt is from + nextInt(to - from + 1), inclusive of both bounds', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    const parallel = new Random(SEED);
    const expected = [5 + parallel.nextInt(6), 5 + parallel.nextInt(6), 5 + parallel.nextInt(6)];
    expect([gen.randomInt(5, 10), gen.randomInt(5, 10), gen.randomInt(5, 10)]).toEqual(expected);
    const single = gen.randomInt(3, 3);
    expect(single).toBe(3);
  });

  it('randomInt over a degenerate range still consumes one draw', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    gen.randomInt(0, 0);
    const parallel = new Random(SEED);
    parallel.nextInt(1);
    expect(gen.random.nextInt()).toBe(parallel.nextInt());
  });

  it('isHypernode reads the HYPERNODE property, false by default', () => {
    const node = ElkGraphUtil.createNode(null);
    expect(RandomGraphGenerator.isHypernode(node)).toBe(false);
    node.setProperty(CoreOptions.HYPERNODE, true);
    expect(RandomGraphGenerator.isHypernode(node)).toBe(true);
  });

  it('get and set go through the options holder', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    gen.options = new GeneratorOptions();
    expect(gen.get(GeneratorOptions.ENABLE_PORTS)).toBe(false);
    gen.set(GeneratorOptions.ENABLE_PORTS, true);
    expect(gen.get(GeneratorOptions.ENABLE_PORTS)).toBe(true);
    expect(gen.options.getProperty(GeneratorOptions.ENABLE_PORTS)).toBe(true);
  });

  it('get and set without options fail like a Java NullPointerException (TypeError)', () => {
    const gen = new RandomGraphGenerator(new Random(SEED));
    expect(() => gen.get(GeneratorOptions.ENABLE_PORTS)).toThrow(TypeError);
    expect(() => gen.set(GeneratorOptions.ENABLE_PORTS, true)).toThrow(TypeError);
  });

  it('nonNull passes a value through and rejects null with a TypeError', () => {
    expect(nonNull('x')).toBe('x');
    expect(nonNull(0)).toBe(0);
    expect(() => nonNull(null)).toThrow(TypeError);
  });
});
