// SPDX-License-Identifier: EPL-2.0
import { Literals } from '../../../../emf/ecore/EcorePackage.js';
import type { AbstractRule } from '../../../../xtext/AbstractRule.js';
import { DefaultTerminalConverters } from '../../../../xtext/common/services/DefaultTerminalConverters.js';
import type {
  RuleLookup,
  TerminalRuleType,
} from '../../../../xtext/conversion/impl/AbstractDeclarativeValueConverterService.js';
import type { TokenSource } from '../../../../xtext/conversion/impl/AbstractLexerBasedConverter.js';
import { Factory } from '../../../../xtext/conversion/impl/DefaultTerminalConverter.js';
import { IDValueConverter } from '../../../../xtext/conversion/impl/IDValueConverter.js';
import { INTValueConverter } from '../../../../xtext/conversion/impl/INTValueConverter.js';
import { STRINGValueConverter } from '../../../../xtext/conversion/impl/STRINGValueConverter.js';
import { tokenize } from './GraphvizDotLexer.js';
import { GRAPHVIZ_DOT_KEYWORDS } from './GraphvizDotTokenType.js';

const GRAMMAR_PREFIX = 'org.eclipse.elk.alg.graphviz.dot.GraphvizDot.';
const TERMINALS_PREFIX = 'org.eclipse.xtext.common.Terminals.';
const INT_RULE_NAME = 'INT';

function rule(name: string, terminal: boolean): AbstractRule {
  return { getName: () => name, isTerminalRule: () => terminal };
}

/** The datatype rule `DotID` (no `returns`: `ecore::EString`). */
const DOT_ID: AbstractRule = rule('DotID', false);

/** The terminals `GraphvizDot.xtext` declares, in declaration order; `INT`, `ID` and `STRING` override `Terminals`. */
const GRAMMAR_TERMINALS: readonly AbstractRule[] = [INT_RULE_NAME, 'ID', 'FLOAT', 'STRING', 'PREC_LINE'].map((name) =>
  rule(name, true),
);

/** The terminals inherited from `org.eclipse.xtext.common.Terminals` that the grammar does not override. */
const INHERITED_TERMINALS: readonly AbstractRule[] = ['ML_COMMENT', 'SL_COMMENT', 'WS', 'ANY_OTHER'].map((name) =>
  rule(name, true),
);

/** The overridden `Terminals` rules, still reachable under their qualified names (`GrammarUtil.findRuleForName`). */
const OVERRIDDEN_TERMINALS: readonly AbstractRule[] = [INT_RULE_NAME, 'ID', 'STRING'].map((name) => rule(name, true));

/** `allTerminalRules(grammar)` with each rule's `EDataType`: `INT returns ecore::EInt`, every other `ecore::EString`. */
const TERMINAL_TYPES: readonly TerminalRuleType[] = [...GRAMMAR_TERMINALS, ...INHERITED_TERMINALS].map((r) => ({
  rule: r,
  dataType: r.getName() === INT_RULE_NAME ? Literals.EINT : Literals.ESTRING,
}));

const TERMINALS_RULES: readonly AbstractRule[] = [...INHERITED_TERMINALS, ...OVERRIDDEN_TERMINALS];

function buildRuleTable(): ReadonlyMap<string, AbstractRule> {
  const table = new Map<string, AbstractRule>();
  for (const r of [DOT_ID, ...GRAMMAR_TERMINALS]) {
    table.set(r.getName(), r);
    table.set(GRAMMAR_PREFIX + r.getName(), r);
  }
  for (const r of INHERITED_TERMINALS) table.set(r.getName(), r);
  for (const r of TERMINALS_RULES) table.set(TERMINALS_PREFIX + r.getName(), r);
  return table;
}

const RULE_TABLE: ReadonlyMap<string, AbstractRule> = buildRuleTable();
const E_STRING_DATATYPE_RULES: readonly AbstractRule[] = [DOT_ID];

/**
 * `GrammarUtil` / `RuleNames` over the fixed rule table of `GraphvizDot.xtext` and the `Terminals` grammar it uses.
 *
 * @see org.eclipse.elk.alg.graphviz.dot/src/org/eclipse/elk/alg/graphviz/dot/GraphvizDot.xtext
 */
export const GRAPHVIZ_DOT_RULES: RuleLookup = {
  findRuleForName: (name) => RULE_TABLE.get(name) ?? null,
  getQualifiedName: (r) => (TERMINALS_RULES.includes(r) ? TERMINALS_PREFIX : GRAMMAR_PREFIX) + r.getName(),
  getEStringDatatypeRules: () => E_STRING_DATATYPE_RULES,
  getTerminalRules: () => TERMINAL_TYPES,
};

/**
 * The value converter service bound for the grammar: neither `GraphvizDotRuntimeModule` nor its generated base binds
 * one, so Xtext's default `DefaultTerminalConverters` applies, with the grammar's keywords and its lexer for the
 * re-lex checks. `DotID` gets the identity `EFactoryValueConverter` of `EString`; `FLOAT`, `PREC_LINE` and the hidden
 * terminals get a `DefaultTerminalConverter`.
 *
 * @param tokenSource the lexer of the converters' `toString` checks
 * @returns the service
 * @see org.eclipse.elk.alg.graphviz.dot/src-gen/org/eclipse/elk/alg/graphviz/dot/AbstractGraphvizDotRuntimeModule.java
 * @see org.eclipse.xtext/src/org/eclipse/xtext/service/DefaultRuntimeModule.java
 */
export function createValueConverterService(tokenSource: TokenSource = tokenize): DefaultTerminalConverters {
  const service = new DefaultTerminalConverters(
    GRAPHVIZ_DOT_RULES,
    new IDValueConverter(GRAPHVIZ_DOT_KEYWORDS, tokenSource),
    new INTValueConverter(tokenSource),
    new STRINGValueConverter(tokenSource),
  );
  service.setDefaultTerminalConverterFactory(new Factory(tokenSource));
  return service;
}
