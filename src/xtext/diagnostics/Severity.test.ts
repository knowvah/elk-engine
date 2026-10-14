// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Severity } from './Severity.js';

describe('Severity', () => {
  it('lists the constants in declaration order', () => {
    expect(Severity.values().map((s) => [s.name(), s.ordinal(), s.toString()])).toEqual([
      ['ERROR', 0, 'ERROR'],
      ['WARNING', 1, 'WARNING'],
      ['INFO', 2, 'INFO'],
      ['IGNORE', 3, 'IGNORE'],
    ]);
  });
});
