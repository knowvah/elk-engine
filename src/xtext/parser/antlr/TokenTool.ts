// SPDX-License-Identifier: EPL-2.0

/** @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/TokenTool.java:58 */
export const LEXER_RULE_PREFIX = 'RULE_';

const SUPER_RULE_PATTERN = /^(SUPER_(\d+_)?).*$/;

/** @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/TokenTool.java:62-64 */
export function isLexerRule(antlrTokenDef: string): boolean {
  return antlrTokenDef.startsWith(LEXER_RULE_PREFIX);
}

/** @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/TokenTool.java:66-74 */
export function getLexerRuleName(antlrTokenDef: string): string {
  if (antlrTokenDef.startsWith(LEXER_RULE_PREFIX)) return antlrTokenDef.substring(LEXER_RULE_PREFIX.length);
  const matcher = SUPER_RULE_PATTERN.exec(antlrTokenDef);
  if (matcher !== null) return antlrTokenDef.substring((matcher[1] as string).length);
  return antlrTokenDef;
}
