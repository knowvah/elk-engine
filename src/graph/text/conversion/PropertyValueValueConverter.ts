// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../core/data/LayoutOptionData.js';
import { LayoutOptionProxy } from '../../../core/util/internal/LayoutOptionProxy.js';
import { ElkPropertyToValueMapEntryImpl } from '../../../graph/impl/ElkPropertyToValueMapEntryImpl.js';
import type { IProperty } from '../../../graph/properties/IProperty.js';
import { isPropertyValueProxy } from '../../../graph/properties/IPropertyValueProxy.js';
import { toString as doubleToString } from '../../../java/lang/DoubleToString.js';
import * as JavaDouble from '../../../java/lang/JavaDouble.js';
import * as JavaMath from '../../../java/lang/JavaMath.js';
import { NumberFormatException } from '../../../java/lang/NumberFormatException.js';
import { AbstractValueConverter } from '../../../xtext/conversion/impl/AbstractValueConverter.js';
import { ValueConverterException } from '../../../xtext/conversion/ValueConverterException.js';
import type { INode } from '../../../xtext/nodemodel/INode.js';
import { QualifiedName } from '../../../xtext/naming/QualifiedName.js';
import * as Strings from '../../../xtext/util/Strings.js';
import { ElkGraphQualifiedNameConverter } from '../naming/ElkGraphQualifiedNameConverter.js';

const NULL_LITERAL = 'null';
const TRUE_LITERAL = 'true';
const FALSE_LITERAL = 'false';
const DOUBLE_QUOTE = '"';
const SINGLE_QUOTE = "'";
const ESCAPE_PREFIX = '^';
const MIN_QUOTED_LENGTH = 2;

const ASCII_LIMIT = 0x80;
const CODE_UPPER_A = 0x41;
const CODE_UPPER_Z = 0x5a;
const CODE_LOWER_A = 0x61;
const CODE_LOWER_Z = 0x7a;
const CODE_UNDERSCORE = 0x5f;
const CODE_DOLLAR = 0x24;

/** Letter, letter number, currency symbol, connector punctuation: the `Character.isJavaIdentifierStart` Javadoc. */
const NON_ASCII_IDENTIFIER_START = /^[\p{L}\p{Nl}\p{Sc}\p{Pc}]$/u;

/** The slice of `java.lang.Enum` the converter tests for (`v instanceof Enum<?>`). */
interface EnumConstant {
  ordinal(): number;
  name(): string;
}

function isEnumConstant(v: object): v is EnumConstant {
  return (
    typeof (v as Partial<EnumConstant>).ordinal === 'function' &&
    typeof (v as Partial<EnumConstant>).name === 'function'
  );
}

/**
 * Java `Character.isJavaIdentifierStart(char)`. OpenJDK is off limits (AD-9), so this follows the Javadoc: ASCII
 * is decided exactly (`A-Za-z`, `_`, `$`); code units from 0x80 on use the Unicode categories the Javadoc names.
 * The ELK lexer only hands ASCII-start tokens to this converter, so the second arm is unreachable from `.elkt`.
 */
function isJavaIdentifierStart(first: string): boolean {
  const code = first.charCodeAt(0);
  if (code < ASCII_LIMIT) {
    return (
      (code >= CODE_UPPER_A && code <= CODE_UPPER_Z) ||
      (code >= CODE_LOWER_A && code <= CODE_LOWER_Z) ||
      code === CODE_UNDERSCORE ||
      code === CODE_DOLLAR
    );
  }
  return NON_ASCII_IDENTIFIER_START.test(first);
}

/**
 * Converts the property value rules (`StringValue`, `QualifiedIdValue`, `NumberValue`, `BooleanValue`). Values
 * are parsed to a {@link LayoutOptionProxy} (or the option's parsed value when the key is a known option) and
 * printed as a number, boolean, enum constant, bare qualified id or quoted string.
 *
 * TypeScript has one `number` type: a Java `Integer`/`Short`/`Byte`/`Double` prints identically to an integral
 * `Double` within int range, so the single `typeof v === 'number'` arm is exact; `Long` is a `bigint`. A Java
 * `Float` is also a `number` and prints as a double would (`2` where Java prints `2.0`): the port has no `Float`
 * type to tell them apart, and ELK option values are doubles.
 *
 * @see org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/conversion/PropertyValueValueConverter.xtend
 */
export class PropertyValueValueConverter extends AbstractValueConverter<unknown> {
  readonly #qualifiedNameConverter: ElkGraphQualifiedNameConverter;

  constructor(qualifiedNameConverter: ElkGraphQualifiedNameConverter) {
    super();
    this.#qualifiedNameConverter = qualifiedNameConverter;
  }

  toString(value: unknown): string {
    // Here we assume that the toString() implementation of the proxy yields a meaningful value
    const v: unknown = isPropertyValueProxy(value) ? (value as { toString(): string | null }).toString() : value;

    if (v === null) {
      return NULL_LITERAL;
    }
    if (typeof v === 'number') {
      return Math.floor(v) === v ? String(JavaMath.d2i(v)) : doubleToString(v);
    }
    if (typeof v === 'boolean' || typeof v === 'bigint' || (typeof v === 'object' && isEnumConstant(v))) {
      return String(v);
    }
    if (typeof v === 'string') {
      return this.stringToString(v);
    }
    return this.quoteIfNecessary(String(v));
  }

  private stringToString(v: string): string {
    if (v === TRUE_LITERAL || v === FALSE_LITERAL || v === NULL_LITERAL) {
      return v;
    }
    try {
      JavaDouble.parseDouble(v);
      return v;
    } catch (e) {
      if (e instanceof NumberFormatException) {
        return this.quoteIfNecessary(v);
      }
      throw e;
    }
  }

  private quoteIfNecessary(s: string): string {
    try {
      const qname = QualifiedName.createFromList(Strings.split(s, ElkGraphQualifiedNameConverter.DELIMITER));
      return this.#qualifiedNameConverter.toString(qname);
    } catch (e) {
      if (e instanceof ValueConverterException) {
        return DOUBLE_QUOTE + s + DOUBLE_QUOTE;
      }
      throw e;
    }
  }

  toValue(string: string | null, node: INode | null): unknown {
    if (Strings.isEmpty(string) || string === NULL_LITERAL) {
      return null;
    }
    const unquotedString = this.unquoteIfNecessary(string);
    const semanticElem = node?.getSemanticElement();
    if (semanticElem instanceof ElkPropertyToValueMapEntryImpl) {
      const option = PropertyValueValueConverter.toLayoutOption(semanticElem.getKey());
      const value = option?.parseValue(unquotedString) ?? null;
      if (value !== null) {
        return value;
      }
    }
    return new LayoutOptionProxy(unquotedString);
  }

  private unquoteIfNecessary(s: string): string {
    if (s.length >= MIN_QUOTED_LENGTH && PropertyValueValueConverter.isQuoted(s)) {
      return s.substring(1, s.length - 1);
    }
    if (s.length >= 1 && (isJavaIdentifierStart(s.charAt(0)) || s.startsWith(ESCAPE_PREFIX))) {
      const qname = this.#qualifiedNameConverter.toQualifiedName(s);
      return qname.toString(ElkGraphQualifiedNameConverter.DELIMITER);
    }
    return s;
  }

  private static isQuoted(s: string): boolean {
    return (
      (s.startsWith(DOUBLE_QUOTE) && s.endsWith(DOUBLE_QUOTE)) ||
      (s.startsWith(SINGLE_QUOTE) && s.endsWith(SINGLE_QUOTE))
    );
  }

  private static toLayoutOption(property: IProperty<unknown> | null): LayoutOptionData | null {
    if (property instanceof LayoutOptionData) {
      return property;
    }
    if (property !== null) {
      return LayoutMetaDataService.getInstance().getOptionData(property.getId());
    }
    return null;
  }
}
