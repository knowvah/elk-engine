// SPDX-License-Identifier: EPL-2.0
// Branches of ForceLayoutProvider.java that no recorded row reaches (the recorder never uses randomSeed 0). Each expectation is read off
// the Java, the line is named in the test.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Random } from '../../java/util/Random.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { ForceLayoutProvider } from './ForceLayoutProvider.js';
import { FGraph } from './graph/FGraph.js';
import { EadesModel } from './model/EadesModel.js';
import { FruchtermanReingoldModel } from './model/FruchtermanReingoldModel.js';
import { ForceModelStrategy } from './options/ForceModelStrategy.js';
import { ForceOptions } from './options/ForceOptions.js';
import { InternalProperties } from './options/InternalProperties.js';

/** `ForceLayoutProvider` with its two private steps made callable. */
interface Steps {
  setOptions(fgraph: FGraph, parent: ElkNode | null): void;
  updateModel(strategy: ForceModelStrategy): void;
  forceModel: unknown;
}
const stepsOf = (provider: ForceLayoutProvider): Steps => provider as unknown as Steps;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ForceLayoutProvider.setOptions', () => {
  it('seeds the generator with the option value (ForceLayoutProvider.java:93)', () => {
    const graph = new FGraph();
    graph.setProperty(ForceOptions.RANDOM_SEED, 42);
    stepsOf(new ForceLayoutProvider()).setOptions(graph, null);
    expect(graph.getProperty(InternalProperties.RANDOM).nextDouble()).toBe(new Random(42).nextDouble());
  });

  it('uses the default constructor for randomSeed 0 (ForceLayoutProvider.java:91)', () => {
    const SEED = 2 ** 40;
    vi.spyOn(Math, 'random').mockReturnValue(SEED / 2 ** 48);
    const graph = new FGraph();
    graph.setProperty(ForceOptions.RANDOM_SEED, 0);
    stepsOf(new ForceLayoutProvider()).setOptions(graph, null);
    const drawn = graph.getProperty(InternalProperties.RANDOM).nextDouble();
    expect(drawn).toBe(new Random(SEED).nextDouble());
    expect(drawn).not.toBe(new Random(0).nextDouble());
  });
});

describe('ForceLayoutProvider.updateModel', () => {
  it('keeps the model it has while the strategy is unchanged and replaces it otherwise (ForceLayoutProvider.java:108-117)', () => {
    const provider = new ForceLayoutProvider();
    const steps = stepsOf(provider);
    steps.updateModel(ForceModelStrategy.EADES);
    const eades = steps.forceModel;
    expect(eades).toBeInstanceOf(EadesModel);
    steps.updateModel(ForceModelStrategy.EADES);
    expect(steps.forceModel).toBe(eades);
    steps.updateModel(ForceModelStrategy.FRUCHTERMAN_REINGOLD);
    const fr = steps.forceModel;
    expect(fr).toBeInstanceOf(FruchtermanReingoldModel);
    steps.updateModel(ForceModelStrategy.FRUCHTERMAN_REINGOLD);
    expect(steps.forceModel).toBe(fr);
    steps.updateModel(ForceModelStrategy.EADES);
    expect(steps.forceModel).not.toBe(eades);
  });
});
