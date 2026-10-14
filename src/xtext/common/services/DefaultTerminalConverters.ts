// SPDX-License-Identifier: EPL-2.0
import {
  AbstractDeclarativeValueConverterService,
  type RuleLookup,
} from '../../conversion/impl/AbstractDeclarativeValueConverterService.js';
import type { AbstractIDValueConverter } from '../../conversion/impl/AbstractIDValueConverter.js';
import type { INTValueConverter } from '../../conversion/impl/INTValueConverter.js';
import type { STRINGValueConverter } from '../../conversion/impl/STRINGValueConverter.js';

const TERMINALS_PREFIX = 'org.eclipse.xtext.common.Terminals.';
const ID_RULE = 'ID';
const INT_RULE = 'INT';
const STRING_RULE = 'STRING';

/**
 * Default converters for Strings, Integers and IDs. Java injects a separate converter instance for each of
 * the six `@ValueConverter` methods; here the `Terminals.*` aliases share the instance of their simple
 * name (both resolve to the same rule, so `setRule` receives the same rule either way).
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/common/services/DefaultTerminalConverters.java
 */
export class DefaultTerminalConverters extends AbstractDeclarativeValueConverterService {
  constructor(rules: RuleLookup, id: AbstractIDValueConverter, int: INTValueConverter, string: STRINGValueConverter) {
    super(rules);
    this.register(ID_RULE, id);
    this.register(TERMINALS_PREFIX + ID_RULE, id);
    this.register(INT_RULE, int);
    this.register(TERMINALS_PREFIX + INT_RULE, int);
    this.register(STRING_RULE, string);
    this.register(TERMINALS_PREFIX + STRING_RULE, string);
  }
}
