// SPDX-License-Identifier: EPL-2.0

import { describe, expect, it } from 'vitest';
import { GRANDOM_KEYWORDS, GRandomTokenType, HIDDEN_TOKEN_TYPES, keywordTokenType } from './GRandomTokenType.js';

describe('GRandomTokenType', () => {
  it('lists the 51 keyword literals with the multi-word ones whole', () => {
    expect(GRANDOM_KEYWORDS.length).toBe(51);
    expect(new Set(GRANDOM_KEYWORDS).size).toBe(51);
    expect(GRANDOM_KEYWORDS[0]).toBe('generate');
    expect(GRANDOM_KEYWORDS).toContain('cross-hierarchy relative edges');
    expect(GRANDOM_KEYWORDS.at(-1)).toBe('ratio');
  });

  it('spells a keyword type as the quoted literal', () => {
    expect(keywordTokenType('self loops')).toBe("'self loops'");
  });

  it('hides exactly WS and both comment terminals', () => {
    expect([...HIDDEN_TOKEN_TYPES]).toEqual([
      GRandomTokenType.RULE_WS,
      GRandomTokenType.RULE_ML_COMMENT,
      GRandomTokenType.RULE_SL_COMMENT,
    ]);
  });
});
