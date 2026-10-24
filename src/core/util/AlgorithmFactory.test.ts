// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import { AlgorithmFactory } from './AlgorithmFactory.js';

class RecordingProvider extends AbstractLayoutProvider {
  readonly initialized: (string | null)[] = [];
  disposed = 0;
  override initialize(parameter: string): void {
    this.initialized.push(parameter);
  }
  override dispose(): void {
    this.disposed++;
  }
  layout(): void {
    // not needed
  }
}

describe('AlgorithmFactory', () => {
  it('creates distinct instances, each initialized with the parameter', () => {
    const factory = new AlgorithmFactory(RecordingProvider, 'p');
    const a = factory.create() as RecordingProvider;
    const b = factory.create() as RecordingProvider;
    expect(a).toBeInstanceOf(RecordingProvider);
    expect(a).not.toBe(b);
    expect(a.initialized).toEqual(['p']);
    expect(b.initialized).toEqual(['p']);
  });

  it('initializes with null when no parameter is given', () => {
    const created = new AlgorithmFactory(RecordingProvider).create() as RecordingProvider;
    expect(created.initialized).toEqual([null]);
  });

  it('destroy disposes the provider once', () => {
    const factory = new AlgorithmFactory(RecordingProvider);
    const provider = factory.create() as RecordingProvider;
    factory.destroy(provider);
    expect(provider.disposed).toBe(1);
  });
});
