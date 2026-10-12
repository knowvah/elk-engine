// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { isExperimental, markExperimental } from './ExperimentalPropertyValue.js';

class Mode {
  static readonly A: Mode = new Mode(0);
  static readonly B: Mode = new Mode(1);
  private constructor(private readonly index: number) {}
  ordinal(): number {
    return this.index;
  }
}

describe('ExperimentalPropertyValue', () => {
  it('reports only marked constants as experimental', () => {
    expect(isExperimental(Mode.A)).toBe(false);
    markExperimental(Mode.A);
    expect(isExperimental(Mode.A)).toBe(true);
    expect(isExperimental(Mode.B)).toBe(false);
  });

  it('reports null as not experimental', () => {
    expect(isExperimental(null)).toBe(false);
  });

  it('marking twice keeps the constant experimental', () => {
    markExperimental(Mode.B);
    markExperimental(Mode.B);
    expect(isExperimental(Mode.B)).toBe(true);
  });
});
