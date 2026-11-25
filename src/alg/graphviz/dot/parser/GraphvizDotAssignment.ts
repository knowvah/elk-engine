// SPDX-License-Identifier: EPL-2.0
import type { IValueConverterService } from '../../../../xtext/conversion/IValueConverterService.js';
import { ValueConverterException } from '../../../../xtext/conversion/ValueConverterException.js';
import { ValueConverterWithValueException } from '../../../../xtext/conversion/ValueConverterWithValueException.js';
import type { Token } from '../../../../xtext/parser/Token.js';
import type { GraphvizDotRecognizer } from './GraphvizDotRecognizer.js';

const NPE_MESSAGE =
  'A NullPointerException occured. This indicates a missing value converter or a bug in its implementation.';

/** A value to convert: the token of the assigned terminal or datatype rule (`null`: no text), and the rule name. */
export interface ConvertedValue {
  readonly token: Token | null;
  readonly rule: string;
}

/**
 * `DefaultEcoreElementFactory.set` of a token value: converted by the rule's value converter and applied; a
 * `ValueConverterWithValueException` still applies its value. A failure becomes a value-conversion diagnostic
 * (`AbstractInternalAntlrParser.handleValueConverterException`) at the token, and parsing goes on.
 *
 * Only a datatype or terminal value reaches this function. No converter bound for `GraphvizDot.xtext` fails on parsed
 * text (`DotID` is the identity, `ID.toValue` strips a `^`), so the diagnostic path is reached only with another
 * service; a pending syntax error that Xtext would let it replace is not modelled.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/DefaultEcoreElementFactory.java:64-90
 * @see org.eclipse.xtext/src/org/eclipse/xtext/parser/antlr/AbstractInternalAntlrParser.java:477-501
 */
export function convertAndSet(
  services: IValueConverterService,
  recognizer: GraphvizDotRecognizer,
  value: ConvertedValue,
  apply: (value: string | null) => void,
): void {
  try {
    convertAndApply(services, value, apply);
  } catch (e) {
    const offset = value.token?.offset ?? 0;
    const length = value.token?.text.length ?? 0;
    recognizer.addConversionError(converterMessage(wrapConverterFailure(e)), offset, length);
  }
}

function convertAndApply(
  services: IValueConverterService,
  value: ConvertedValue,
  apply: (value: string | null) => void,
): void {
  try {
    // the DOT converters yield strings: EString and ID
    apply(services.toValue(value.token?.text ?? null, value.rule, null) as string | null);
  } catch (e) {
    if (e instanceof ValueConverterWithValueException) apply(e.getValue() as string | null);
    throw e;
  }
}

function wrapConverterFailure(e: unknown): ValueConverterException {
  if (e instanceof ValueConverterException) return e;
  if (e instanceof TypeError) return new ValueConverterException(NPE_MESSAGE, null, e);
  return new ValueConverterException(null, null, e instanceof Error ? e : new Error(String(e)));
}

/** `getValueConverterExceptionMessage`: the cause's message, else the exception's, else a class name. */
function converterMessage(vce: ValueConverterException): string {
  const cause = vce.cause instanceof Error ? vce.cause : null;
  const own = nonEmpty(vce.getMessage());
  const result = cause === null ? own : (nonEmpty(cause.message) ?? own);
  return result ?? (cause ?? vce).constructor.name;
}

function nonEmpty(message: string | null): string | null {
  return message === '' ? null : message;
}
