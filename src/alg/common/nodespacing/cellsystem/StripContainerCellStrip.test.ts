// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { StripContainerCellStrip } from './StripContainerCellStrip.js';

describe('StripContainerCellStrip', () => {
  it('lists VERTICAL before HORIZONTAL', () => {
    expect(StripContainerCellStrip.values().map((s) => s.name())).toEqual(['VERTICAL', 'HORIZONTAL']);
    expect(StripContainerCellStrip.HORIZONTAL.ordinal()).toBe(1);
    expect(String(StripContainerCellStrip.VERTICAL)).toBe('VERTICAL');
  });

  it('resolves names and rejects unknown ones with the Java message', () => {
    expect(StripContainerCellStrip.valueOf('HORIZONTAL')).toBe(StripContainerCellStrip.HORIZONTAL);
    expect(() => StripContainerCellStrip.valueOf('DIAGONAL')).toThrow(IllegalArgumentException);
    expect(() => StripContainerCellStrip.valueOf('DIAGONAL')).toThrow(
      'No enum constant org.eclipse.elk.alg.common.nodespacing.cellsystem.StripContainerCell.Strip.DIAGONAL',
    );
  });
});
