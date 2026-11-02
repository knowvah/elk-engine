// SPDX-License-Identifier: EPL-2.0
import { beforeAll, describe, expect, it } from 'vitest';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { LGraph } from '../../graph/LGraph.js';
import { BKAlignedLayout } from './BKAlignedLayout.js';
import { BKAlignedLayoutHDirection as HDirection } from './BKAlignedLayoutHDirection.js';
import { BKAlignedLayoutVDirection as VDirection } from './BKAlignedLayoutVDirection.js';

beforeAll(() => {
  LayoutMetaDataService.initElkReflect();
});

describe('BKAlignedLayout directions', () => {
  it('lists the constants in declaration order', () => {
    expect(VDirection.values().map((d) => d.name())).toEqual(['DOWN', 'UP']);
    expect(HDirection.values().map((d) => d.name())).toEqual(['RIGHT', 'LEFT']);
    expect(VDirection.UP.ordinal()).toBe(1);
    expect(HDirection.LEFT.ordinal()).toBe(1);
    expect(String(VDirection.DOWN)).toBe('DOWN');
    expect(String(HDirection.RIGHT)).toBe('RIGHT');
  });

  it('resolves a name and rejects an unknown one like Enum.valueOf', () => {
    expect(VDirection.valueOf('UP')).toBe(VDirection.UP);
    expect(HDirection.valueOf('RIGHT')).toBe(HDirection.RIGHT);
    expect(() => VDirection.valueOf('SIDEWAYS')).toThrow(IllegalArgumentException);
    expect(() => HDirection.valueOf('DOWN')).toThrow(
      'No enum constant org.eclipse.elk.alg.layered.p4nodes.bk.BKAlignedLayout.HDirection.DOWN',
    );
  });
});

describe('BKAlignedLayout.toString', () => {
  it.each([
    [VDirection.UP, HDirection.LEFT, 'LEFTUP'],
    [VDirection.DOWN, HDirection.LEFT, 'LEFTDOWN'],
    [VDirection.UP, HDirection.RIGHT, 'RIGHTUP'],
    [VDirection.DOWN, HDirection.RIGHT, 'RIGHTDOWN'],
    [null, null, 'BALANCED'],
  ])('prints %s/%s as %s', (vdir, hdir, text) => {
    expect(new BKAlignedLayout(new LGraph(), 0, vdir, hdir).toString()).toBe(text);
  });
});

describe('BKAlignedLayout', () => {
  it('starts with null y and shift, false su and true od', () => {
    const bal = new BKAlignedLayout(new LGraph(), 2, VDirection.UP, HDirection.LEFT);
    expect(bal.y).toEqual([null, null]);
    expect(bal.shift).toEqual([null, null]);
    expect(bal.su).toEqual([false, false]);
    expect(bal.od).toEqual([true, true]);
  });

  it('releases its arrays on cleanup', () => {
    const bal = new BKAlignedLayout(new LGraph(), 3, VDirection.DOWN, HDirection.RIGHT);
    bal.cleanup();
    expect([bal.root, bal.blockSize, bal.align, bal.innerShift, bal.sink, bal.shift, bal.y]).toEqual(
      Array.from({ length: 7 }, () => []),
    );
  });
});
