// SPDX-License-Identifier: EPL-2.0
import type { AbstractRule } from '../AbstractRule.js';
import type { INode } from '../nodemodel/INode.js';

/**
 * A `ValueConverter` creates a semantic value from an input string or node and vice versa. Java allows
 * any reference (including `null`) wherever it says `Type`, so `null` is admitted explicitly.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/IValueConverter.java
 */
export interface IValueConverter<T> {
  /**
   * Creates a value from the given input, conformant to a data type or terminal rule. The string or the
   * node may be null but not both.
   *
   * @throws ValueConverterException when the string or node did not fulfil the expected format.
   */
  toValue(string: string | null, node: INode | null): T | null;

  /**
   * Transforms the given value to a string conformant to the expected terminal or data type rule.
   *
   * @throws ValueConverterException when the value cannot be converted to a valid string.
   */
  toString(value: T | null): string;
}

/**
 * Value converters that rely on information about the actual rule that is converted implement this
 * interface; the framework sets the rule when it registers the converter.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/IValueConverter.java:67-73
 */
export interface RuleSpecific {
  /** @throws IllegalArgumentException if the rule doesn't match the expectation of the value converter */
  setRule(rule: AbstractRule): void;
}

/** Java: `converter instanceof IValueConverter.RuleSpecific`. */
export function isRuleSpecific(
  converter: IValueConverter<unknown>,
): converter is IValueConverter<unknown> & RuleSpecific {
  return typeof (converter as Partial<RuleSpecific>).setRule === 'function';
}

/**
 * The identity converter the service falls back to for unknown rule names.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/IValueConverter.java:23-32
 */
export const NO_OP_CONVERTER: IValueConverter<unknown> = {
  toString(value: unknown): string {
    return value as string;
  },
  toValue(string: string | null): unknown {
    return string;
  },
};
