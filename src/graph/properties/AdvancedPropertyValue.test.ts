// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { isAdvanced, markAdvanced } from './AdvancedPropertyValue.js';

class Mode {
  static readonly A: Mode = new Mode(0);
  static readonly B: Mode = new Mode(1);
  private constructor(private readonly index: number) {}
  ordinal(): number {
    return this.index;
  }
}

describe('AdvancedPropertyValue', () => {
  it('reports only marked constants as advanced', () => {
    expect(isAdvanced(Mode.A)).toBe(false);
    markAdvanced(Mode.A);
    expect(isAdvanced(Mode.A)).toBe(true);
    expect(isAdvanced(Mode.B)).toBe(false);
  });

  it('reports null as not advanced', () => {
    expect(isAdvanced(null)).toBe(false);
  });

  it('marking twice keeps the constant advanced', () => {
    markAdvanced(Mode.B);
    markAdvanced(Mode.B);
    expect(isAdvanced(Mode.B)).toBe(true);
  });
});
