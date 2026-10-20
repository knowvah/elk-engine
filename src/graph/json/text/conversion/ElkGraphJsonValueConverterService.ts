// SPDX-License-Identifier: EPL-2.0
import type { AbstractRule } from '../../../../xtext/AbstractRule.js';
import { Literals } from '../../../../emf/ecore/EcorePackage.js';
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
import { tokenize } from '../parser/ElkGraphJsonLexer.js';
import { ELK_GRAPH_JSON_KEYWORDS } from '../parser/ElkGraphJsonTokenType.js';
import { NumberValueConverter } from './NumberValueConverter.js';
import { ELK_GRAPH_JSON_ID_RULE, PropertyKeyValueConverter } from './PropertyKeyValueConverter.js';
import { PropertyValueValueConverter } from './PropertyValueValueConverter.js';

/** Rule names of `ElkGraphJson.xtext` that ELK registers converters for. */
export const ElkGraphJsonRuleName = {
  NUMBER: 'Number',
  PROPERTY_KEY: 'PropertyKey',
  STRING_VALUE: 'StringValue',
  NUMBER_VALUE: 'NumberValue',
  BOOLEAN_VALUE: 'BooleanValue',
} as const;

const GRAMMAR_PREFIX = 'org.eclipse.elk.graph.json.text.ElkGraphJson.';
const TERMINALS_PREFIX = 'org.eclipse.xtext.common.Terminals.';

function rule(name: string, terminal: boolean): AbstractRule {
  return { getName: () => name, isTerminalRule: () => terminal };
}

/** The datatype rules that have an explicit converter. */
const CONVERTED_DATATYPE_RULES: readonly AbstractRule[] = Object.values(ElkGraphJsonRuleName).map((name) =>
  rule(name, false),
);

/**
 * The datatype rules of type `EString` (no `returns`, no assignments): the arbitrary JSON rules and the key
 * rules. Xtext gives them an `EFactoryValueConverter` when they have no explicit converter.
 */
const E_STRING_DATATYPE_RULES: readonly AbstractRule[] = [
  'JsonObject',
  'JsonArray',
  'JsonMember',
  'JsonValue',
  'KeyChildren',
  'KeyPorts',
  'KeyLabels',
  'KeyEdges',
  'KeyLayoutOptions',
  'KeyId',
  'KeyX',
  'KeyY',
  'KeyWidth',
  'KeyHeight',
  'KeySources',
  'KeyTargets',
  'KeyText',
].map((name) => rule(name, false));

/** The terminals declared by `ElkGraphJson.xtext` itself. */
const GRAMMAR_TERMINALS: readonly AbstractRule[] = ['SIGNED_INT', 'FLOAT'].map((name) => rule(name, true));

/** The terminals inherited from `org.eclipse.xtext.common.Terminals`; `ID` is the shared {@link ELK_GRAPH_JSON_ID_RULE}. */
const INHERITED_TERMINALS: readonly AbstractRule[] = [
  ELK_GRAPH_JSON_ID_RULE,
  ...['INT', 'STRING', 'ML_COMMENT', 'SL_COMMENT', 'WS', 'ANY_OTHER'].map((name) => rule(name, true)),
];

/** The `EDataType` of each terminal rule's type: `ecore::EInt` / `ecore::EDouble` / `ecore::EString`. */
const TERMINAL_TYPES: readonly TerminalRuleType[] = [
  ...GRAMMAR_TERMINALS.map((r) => ({ rule: r, dataType: r.getName() === 'FLOAT' ? Literals.EDOUBLE : Literals.EINT })),
  ...INHERITED_TERMINALS.map((r) => ({ rule: r, dataType: r.getName() === 'INT' ? Literals.EINT : Literals.ESTRING })),
];

function buildRuleTable(): ReadonlyMap<string, AbstractRule> {
  const table = new Map<string, AbstractRule>();
  for (const r of [...CONVERTED_DATATYPE_RULES, ...E_STRING_DATATYPE_RULES, ...GRAMMAR_TERMINALS]) {
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

/** `GrammarUtil` / `RuleNames` over the fixed rule table of `ElkGraphJson.xtext`. */
export const ELK_GRAPH_JSON_RULES: RuleLookup = {
  findRuleForName: (name) => RULE_TABLE.get(name) ?? null,
  getQualifiedName: (r) => (INHERITED_TERMINALS.includes(r) ? TERMINALS_PREFIX : GRAMMAR_PREFIX) + r.getName(),
  getEStringDatatypeRules: () => E_STRING_DATATYPE_RULES,
  getTerminalRules: () => TERMINAL_TYPES,
};

/**
 * Value converter service of the ELK graph JSON text language: the default terminal converters plus the ELK
 * number, property key and property value converters (one shared {@link PropertyValueValueConverter} for the
 * three value rules, as the Xtend fields share their injected instance).
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/conversion/ElkGraphJsonValueConverterService.xtend
 */
export class ElkGraphJsonValueConverterService extends DefaultTerminalConverters {
  constructor(tokenSource: TokenSource | null = tokenize, keywords: ReadonlySet<string> = ELK_GRAPH_JSON_KEYWORDS) {
    super(
      ELK_GRAPH_JSON_RULES,
      new IDValueConverter(keywords, tokenSource),
      new INTValueConverter(tokenSource),
      new STRINGValueConverter(tokenSource),
    );
    this.setDefaultTerminalConverterFactory(new Factory(tokenSource));
    // The subclass level outranks DefaultTerminalConverters, as Java reflects the most derived class first.
    this.beginClassLevel();
    const propertyValue = new PropertyValueValueConverter();
    this.register(ElkGraphJsonRuleName.NUMBER, new NumberValueConverter());
    this.register(ElkGraphJsonRuleName.PROPERTY_KEY, new PropertyKeyValueConverter(tokenSource, keywords));
    this.register(ElkGraphJsonRuleName.STRING_VALUE, propertyValue);
    this.register(ElkGraphJsonRuleName.NUMBER_VALUE, propertyValue);
    this.register(ElkGraphJsonRuleName.BOOLEAN_VALUE, propertyValue);
  }
}
