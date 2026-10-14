// SPDX-License-Identifier: EPL-2.0
import { IntegerKey } from './preferences/IntegerKey.js';
import { StringKey } from './preferences/StringKey.js';

/** Java `System.getProperty("line.separator")` of the oracle host (macOS / Linux): see the T5 write rows. */
export const DEFAULT_LINE_SEPARATOR = '\n';
export const DEFAULT_INDENTATION = '\t';
export const DEFAULT_INDENTATION_LENGTH = -1;
export const DEFAULT_TAB_WIDTH = 4;
export const DEFAULT_MAX_LINE_WIDTH = 120;

/** @see org.eclipse.xtext/src/org/eclipse/xtext/formatting2/FormatterPreferenceKeys.java */
export class FormatterPreferenceKeys {
  static readonly lineSeparator: StringKey = new StringKey('line.separator', DEFAULT_LINE_SEPARATOR);
  static readonly indentation: StringKey = new StringKey('indentation', DEFAULT_INDENTATION);
  /** Deprecated in Xtext; only the autowrap code (not ported) reads it. */
  static readonly indentationLength: IntegerKey = new IntegerKey('indentation.length', DEFAULT_INDENTATION_LENGTH);
  static readonly tabWidth: IntegerKey = new IntegerKey('tab.width', DEFAULT_TAB_WIDTH);
  static readonly maxLineWidth: IntegerKey = new IntegerKey('line.width.max', DEFAULT_MAX_LINE_WIDTH);
}
