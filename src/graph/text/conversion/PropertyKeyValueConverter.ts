// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { Property } from '../../../graph/properties/Property.js';
import type { IDValueConverter } from '../../../xtext/conversion/impl/IDValueConverter.js';
import type { TokenSource } from '../../../xtext/conversion/impl/AbstractLexerBasedConverter.js';
import { AbstractValueConverter } from '../../../xtext/conversion/impl/AbstractValueConverter.js';
import { ValueConverterException } from '../../../xtext/conversion/ValueConverterException.js';
import type { INode } from '../../../xtext/nodemodel/INode.js';
import * as Strings from '../../../xtext/util/Strings.js';
import { createIdValueConverter } from '../naming/ElkGraphQualifiedNameConverter.js';

const DELIMITER = '.';

/**
 * Converts the `PropertyKey` datatype rule: a dotted identifier that resolves, by suffix, to a registered layout
 * option or else to a fresh unregistered {@link Property}. Printing picks the shortest suffix that still
 * identifies the option and contains its group.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/conversion/PropertyKeyValueConverter.xtend
 */
export class PropertyKeyValueConverter extends AbstractValueConverter<IProperty<unknown>> {
  readonly #idValueConverter: IDValueConverter;

  constructor(tokenSource: TokenSource | null, keywords: ReadonlySet<string>) {
    super();
    this.#idValueConverter = createIdValueConverter(tokenSource, keywords);
  }

  toString(value: IProperty<unknown> | null): string {
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
    return split.map((segment) => this.#idValueConverter.toString(segment)).join(DELIMITER);
  }

  toValue(string: string | null, node: INode | null): IProperty<unknown> {
    if (Strings.isEmpty(string)) {
      throw new ValueConverterException('Cannot convert empty string to a property identifier.', node, null);
    }
    const idSuffix = Strings.split(string, DELIMITER)
      .map((segment) => this.#idValueConverter.toValue(segment, node))
      .join(DELIMITER);
    const optionData = LayoutMetaDataService.getInstance().getOptionDataBySuffix(idSuffix);
    if (optionData === null) {
      // If the currently given id is not a known layout option, a new property instance is created and returned
      // that shall not be registered with the LayoutMetaDataService. This allows custom "key: value" pairs within
      // an elkt document, whose values yield 'LayoutOptionProxy' instances.
      return new Property<unknown>(string);
    }
    return optionData;
  }
}
