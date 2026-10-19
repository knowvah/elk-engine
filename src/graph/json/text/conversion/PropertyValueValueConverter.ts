// SPDX-License-Identifier: EPL-2.0
import { LayoutMetaDataService } from '../../../../core/data/LayoutMetaDataService.js';
import { LayoutOptionData } from '../../../../core/data/LayoutOptionData.js';
import { LayoutOptionProxy } from '../../../../core/util/internal/LayoutOptionProxy.js';
import { ElkPropertyToValueMapEntryImpl } from '../../../../graph/impl/ElkPropertyToValueMapEntryImpl.js';
import type { IProperty } from '../../../../graph/properties/IProperty.js';
import { isPropertyValueProxy } from '../../../../graph/properties/IPropertyValueProxy.js';
import { toString as doubleToString } from '../../../../java/lang/DoubleToString.js';
import * as JavaDouble from '../../../../java/lang/JavaDouble.js';
import * as JavaMath from '../../../../java/lang/JavaMath.js';
import { NumberFormatException } from '../../../../java/lang/NumberFormatException.js';
import { AbstractValueConverter } from '../../../../xtext/conversion/impl/AbstractValueConverter.js';
import type { INode } from '../../../../xtext/nodemodel/INode.js';
import * as Strings from '../../../../xtext/util/Strings.js';

const NULL_LITERAL = 'null';
const TRUE_LITERAL = 'true';
const FALSE_LITERAL = 'false';
const DOUBLE_QUOTE = '"';
const SINGLE_QUOTE = "'";
const MIN_QUOTED_LENGTH = 2;

/**
 * Converts the property value rules (`StringValue`, `NumberValue`, `BooleanValue`). Derived from the `.elkt`
 * converter; the difference is that every value but numbers and booleans is printed in double quotes, and that
 * `unquoteIfNecessary` strips matching `"..."` or `'...'` only (no qualified name conversion).
 *
 * TypeScript has one `number` type: a Java `Integer`/`Short`/`Byte`/`Double` prints identically to an integral
 * `Double` within int range, so the single `typeof v === 'number'` arm is exact; `Long` is a `bigint`. A Java
 * `Float` is also a `number` and prints as a double would (`2` where Java prints `2.0`): the port has no `Float`
 * type to tell them apart, and ELK option values are doubles.
 *
 * @see org.eclipse.elk.graph.json.text/src/org/eclipse/elk/graph/json/text/conversion/PropertyValueValueConverter.xtend
 */
export class PropertyValueValueConverter extends AbstractValueConverter<unknown> {
  toString(value: unknown): string {
    // Here we assume that the toString() implementation of the proxy yields a meaningful value
    const v: unknown = isPropertyValueProxy(value) ? (value as { toString(): string | null }).toString() : value;

    if (v === null) {
      return NULL_LITERAL;
    }
    if (typeof v === 'number') {
      return Math.floor(v) === v ? String(JavaMath.d2i(v)) : doubleToString(v);
    }
    if (typeof v === 'boolean' || typeof v === 'bigint') {
      return String(v);
    }
    if (typeof v === 'string') {
      return PropertyValueValueConverter.stringToString(v);
    }
    return DOUBLE_QUOTE + String(v) + DOUBLE_QUOTE;
  }

  private static stringToString(v: string): string {
    if (v === TRUE_LITERAL || v === FALSE_LITERAL || v === NULL_LITERAL) {
      return v;
    }
    try {
      JavaDouble.parseDouble(v);
      return v;
    } catch (e) {
      if (e instanceof NumberFormatException) {
        return DOUBLE_QUOTE + v + DOUBLE_QUOTE;
      }
      throw e;
    }
  }

  toValue(string: string | null, node: INode | null): unknown {
    if (Strings.isEmpty(string) || string === NULL_LITERAL) {
      return null;
    }
    const unquotedString = PropertyValueValueConverter.unquoteIfNecessary(string);
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

  private static unquoteIfNecessary(s: string): string {
    if (
      s.length >= MIN_QUOTED_LENGTH &&
      ((s.startsWith(DOUBLE_QUOTE) && s.endsWith(DOUBLE_QUOTE)) ||
        (s.startsWith(SINGLE_QUOTE) && s.endsWith(SINGLE_QUOTE)))
    ) {
      return s.substring(1, s.length - 1);
    }
    return s;
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
