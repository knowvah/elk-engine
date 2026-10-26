// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { ContainerArea } from './ContainerArea.js';

describe('ContainerArea', () => {
  it('lists the constants in declaration order', () => {
    const names = 'BEGIN,CENTER,END'.split(',');
    expect(ContainerArea.values().map((v) => v.name())).toEqual(names);
    expect(ContainerArea.values().map((v) => v.ordinal())).toEqual([0, 1, 2]);
    expect(String(ContainerArea.values()[1])).toBe(names[1]);
  });

  it('resolves names and rejects unknown ones with the Java message', () => {
    expect(ContainerArea.valueOf('CENTER')).toBe(ContainerArea.values()[1]);
    expect(() => ContainerArea.valueOf('NOPE')).toThrow(IllegalArgumentException);
    expect(() => ContainerArea.valueOf('NOPE')).toThrow(
      'No enum constant org.eclipse.elk.alg.common.nodespacing.cellsystem.ContainerArea.NOPE',
    );
  });
});
