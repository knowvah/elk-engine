// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { getLexerRuleName, isLexerRule, LEXER_RULE_PREFIX } from './TokenTool.js';

describe('TokenTool', () => {
  it('recognises lexer rule token defs by the RULE_ prefix', () => {
    expect(LEXER_RULE_PREFIX).toBe('RULE_');
    expect(isLexerRule('RULE_ID')).toBe(true);
    expect(isLexerRule("'{'")).toBe(false);
  });

  it('strips the RULE_ prefix', () => {
    expect(getLexerRuleName('RULE_SIGNED_INT')).toBe('SIGNED_INT');
  });

  it('strips the SUPER_ prefix with and without a number', () => {
    expect(getLexerRuleName('SUPER_ID')).toBe('ID');
    expect(getLexerRuleName('SUPER_12_STRING')).toBe('STRING');
  });

  it('leaves other token defs unchanged', () => {
    expect(getLexerRuleName("'->'")).toBe("'->'");
    expect(getLexerRuleName('KW_node')).toBe('KW_node');
  });
});
