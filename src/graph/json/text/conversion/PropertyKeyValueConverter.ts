// SPDX-License-Identifier: EPL-2.0
import { checkCast } from '../../../../java/lang/JavaCast.js';
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { isIProperty, Property } from '../../../../graph/properties/Property.js';
import type { TokenSource } from '../../../../xtext/conversion/impl/AbstractLexerBasedConverter.js';
import { AbstractValueConverter } from '../../../../xtext/conversion/impl/AbstractValueConverter.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import type { INode } from '../../../../xtext/nodemodel/INode.js';
import * as Strings from '../../../../xtext/util/Strings.js';
import { IDValueConverter } from '../../../../xtext/conversion/impl/IDValueConverter.js';
import type { AbstractRule } from '../../../../xtext/AbstractRule.js';

const DELIMITER = '.';
const QUOTE = '"';
const SINGLE_QUOTE = "'";
const MIN_QUOTED_LENGTH = 2;
const IPROPERTY_CLASS = 'org.eclipse.elk.graph.properties.IProperty';

/** The grammar's `ID` rule (`grammarAccess.IDRule`): the inherited terminal of `org.eclipse.xtext.common.Terminals`. */
export const ELK_GRAPH_JSON_ID_RULE: AbstractRule = {
  getName: () => 'ID',
  isTerminalRule: () => true,
};

/**
 * Converts the `PropertyKey` datatype rule: a possibly quoted dotted identifier that resolves, by suffix, to a
 * registered layout option or else to a fresh unregistered {@link Property}. Printing picks the shortest suffix
 * that still identifies the option and contains its group, and quotes an unknown key.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/conversion/PropertyKeyValueConverter.xtend
 */
export class PropertyKeyValueConverter extends AbstractValueConverter<IProperty<unknown>> {
  readonly #idValueConverter: IDValueConverter;

  constructor(tokenSource: TokenSource | null, keywords: ReadonlySet<string>) {
    super();
    // the Xtend `@Inject initialize(Provider<IDValueConverter>, ElkGraphJsonGrammarAccess)`
    this.#idValueConverter = new IDValueConverter(keywords, tokenSource);
    this.#idValueConverter.setRule(ELK_GRAPH_JSON_ID_RULE);
  }

  toString(value: IProperty<unknown> | null): string {
    // the JVM bridge of toString(IProperty) casts the erased value first
    checkCast(value, isIProperty, IPROPERTY_CLASS);
    if (value === null) {
      throw new ValueConverterException('IProperty value may not be null.', null, null);
    }
    const metaDataService = LayoutMetaDataService.getInstance();
    const split = Strings.split(value.getId(), DELIMITER);
    let suffix: string | null = null;
    let i = split.length - 1;
    while (i >= 0) {
      const segment = this.#idValueConverter.toString(split[i--] as string);
      suffix = suffix === null ? segment : `${segment}.${suffix}`;

      const knownOption = metaDataService.getOptionDataBySuffix(suffix);
      // make sure to always add the option's group
      if (knownOption !== null) {
        const group = knownOption.getGroup();
        if (Strings.isEmpty(group) || suffix.includes(group)) {
          return suffix;
        }
      }
    }
    return QUOTE + split.map((segment) => this.#idValueConverter.toString(segment)).join(DELIMITER) + QUOTE;
  }

  toValue(string: string | null, node: INode | null): IProperty<unknown> {
    if (Strings.isEmpty(string)) {
      throw new ValueConverterException('Cannot convert empty string to a property identifier.', node, null);
    }
    const idSuffix = Strings.split(this.unquoteIfNecessary(string), DELIMITER)
      .map((segment) => this.#idValueConverter.toValue(segment, node))
      .join(DELIMITER);
    const optionData = LayoutMetaDataService.getInstance().getOptionDataBySuffix(idSuffix);
    if (optionData === null) {
      // If the currently given id is not a known layout option, a new property instance is created and returned
      // that shall not be registered with the LayoutMetaDataService. This allows custom "key: value" pairs within
      // an elkj document, whose values yield 'LayoutOptionProxy' instances.
      return new Property<unknown>(string);
    }
    return optionData;
  }

  private unquoteIfNecessary(s: string): string {
    if (
      s.length >= MIN_QUOTED_LENGTH &&
      ((s.startsWith(QUOTE) && s.endsWith(QUOTE)) || (s.startsWith(SINGLE_QUOTE) && s.endsWith(SINGLE_QUOTE)))
    ) {
      return s.substring(1, s.length - 1);
    }
    return s;
  }
}
