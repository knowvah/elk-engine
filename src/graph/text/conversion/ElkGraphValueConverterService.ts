// SPDX-License-Identifier: EPL-2.0
import { Literals } from '../../../emf/ecore/EcorePackage.js';
import { DefaultTerminalConverters } from '../../../xtext/common/services/DefaultTerminalConverters.js';
import type { AbstractRule } from '../../../xtext/AbstractRule.js';
import type {
  RuleLookup,
  TerminalRuleType,
} from '../../../xtext/conversion/impl/AbstractDeclarativeValueConverterService.js';
import type { TokenSource } from '../../../xtext/conversion/impl/AbstractLexerBasedConverter.js';
import { Factory } from '../../../xtext/conversion/impl/DefaultTerminalConverter.js';
import { IDValueConverter } from '../../../xtext/conversion/impl/IDValueConverter.js';
import { INTValueConverter } from '../../../xtext/conversion/impl/INTValueConverter.js';
import { STRINGValueConverter } from '../../../xtext/conversion/impl/STRINGValueConverter.js';
import { ELK_GRAPH_KEYWORDS } from '../parser/ElkGraphTokenType.js';
import { ElkGraphQualifiedNameConverter, ID_RULE } from '../naming/ElkGraphQualifiedNameConverter.js';
import { NumberValueConverter } from './NumberValueConverter.js';
import { PropertyKeyValueConverter } from './PropertyKeyValueConverter.js';
import { PropertyValueValueConverter } from './PropertyValueValueConverter.js';

/** Rule names of `ElkGraph.xtext` (and the inherited `Terminals`) that ELK registers converters for. */
export const ElkGraphRuleName = {
  NUMBER: 'Number',
  PROPERTY_KEY: 'PropertyKey',
  STRING_VALUE: 'StringValue',
  QUALIFIED_ID_VALUE: 'QualifiedIdValue',
  NUMBER_VALUE: 'NumberValue',
  BOOLEAN_VALUE: 'BooleanValue',
  QUALIFIED_ID: 'QualifiedId',
} as const;

const GRAMMAR_PREFIX = 'org.eclipse.elk.graph.text.ElkGraph.';
const TERMINALS_PREFIX = 'org.eclipse.xtext.common.Terminals.';

function rule(name: string, terminal: boolean): AbstractRule {
  return { getName: () => name, isTerminalRule: () => terminal };
}

const DATATYPE_RULES: readonly AbstractRule[] = [
  ElkGraphRuleName.NUMBER,
  ElkGraphRuleName.QUALIFIED_ID,
  ElkGraphRuleName.PROPERTY_KEY,
  ElkGraphRuleName.STRING_VALUE,
  ElkGraphRuleName.QUALIFIED_ID_VALUE,
  ElkGraphRuleName.NUMBER_VALUE,
  ElkGraphRuleName.BOOLEAN_VALUE,
].map((name) => rule(name, false));

/** The terminals declared by `ElkGraph.xtext` itself. */
const GRAMMAR_TERMINALS: readonly AbstractRule[] = ['SIGNED_INT', 'FLOAT'].map((name) => rule(name, true));

/** The terminals inherited from `org.eclipse.xtext.common.Terminals`; `ID` is the shared {@link ID_RULE}. */
const INHERITED_TERMINALS: readonly AbstractRule[] = [
  ID_RULE,
  ...['INT', 'STRING', 'ML_COMMENT', 'SL_COMMENT', 'WS', 'ANY_OTHER'].map((name) => rule(name, true)),
];

/** The `EDataType` of each terminal rule's type: `ecore::EInt` / `ecore::EDouble` / `ecore::EString`. */
const TERMINAL_TYPES: readonly TerminalRuleType[] = [
  ...GRAMMAR_TERMINALS.map((r) => ({ rule: r, dataType: r.getName() === 'FLOAT' ? Literals.EDOUBLE : Literals.EINT })),
  ...INHERITED_TERMINALS.map((r) => ({ rule: r, dataType: r.getName() === 'INT' ? Literals.EINT : Literals.ESTRING })),
];

function buildRuleTable(): ReadonlyMap<string, AbstractRule> {
  const table = new Map<string, AbstractRule>();
  for (const r of [...DATATYPE_RULES, ...GRAMMAR_TERMINALS]) {
    table.set(r.getName(), r);
    table.set(GRAMMAR_PREFIX + r.getName(), r);
  }
  for (const r of INHERITED_TERMINALS) {
    table.set(r.getName(), r);
    table.set(TERMINALS_PREFIX + r.getName(), r);
  }
  return table;
}

const RULE_TABLE: ReadonlyMap<string, AbstractRule> = buildRuleTable();
const E_STRING_DATATYPE_RULES: readonly AbstractRule[] = DATATYPE_RULES.filter(
  (r) => r.getName() === ElkGraphRuleName.QUALIFIED_ID,
);

/** `GrammarUtil` / `RuleNames` over the fixed rule table of `ElkGraph.xtext`. */
export const ELK_GRAPH_RULES: RuleLookup = {
  findRuleForName: (name) => RULE_TABLE.get(name) ?? null,
  getQualifiedName: (r) => (INHERITED_TERMINALS.includes(r) ? TERMINALS_PREFIX : GRAMMAR_PREFIX) + r.getName(),
  getEStringDatatypeRules: () => E_STRING_DATATYPE_RULES,
  getTerminalRules: () => TERMINAL_TYPES,
};

/**
 * Value converter service of the ELK graph text language: the default terminal converters plus the ELK number,
 * property key and property value converters (one shared {@link PropertyValueValueConverter} for the four value
 * rules, as the Xtend fields share their injected instance).
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/conversion/ElkGraphValueConverterService.xtend
 */
export class ElkGraphValueConverterService extends DefaultTerminalConverters {
  constructor(tokenSource: TokenSource | null = null, keywords: ReadonlySet<string> = ELK_GRAPH_KEYWORDS) {
    super(
      ELK_GRAPH_RULES,
      new IDValueConverter(keywords, tokenSource),
      new INTValueConverter(tokenSource),
      new STRINGValueConverter(tokenSource),
    );
    this.setDefaultTerminalConverterFactory(new Factory(tokenSource));
    // The subclass level outranks DefaultTerminalConverters, as Java reflects the most derived class first.
    this.beginClassLevel();
    const propertyValue = new PropertyValueValueConverter(new ElkGraphQualifiedNameConverter(tokenSource, keywords));
    this.register(ElkGraphRuleName.NUMBER, new NumberValueConverter());
    this.register(ElkGraphRuleName.PROPERTY_KEY, new PropertyKeyValueConverter(tokenSource, keywords));
    this.register(ElkGraphRuleName.STRING_VALUE, propertyValue);
    this.register(ElkGraphRuleName.QUALIFIED_ID_VALUE, propertyValue);
    this.register(ElkGraphRuleName.NUMBER_VALUE, propertyValue);
    this.register(ElkGraphRuleName.BOOLEAN_VALUE, propertyValue);
  }
}
