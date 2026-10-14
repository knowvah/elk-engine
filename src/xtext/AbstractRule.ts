// SPDX-License-Identifier: EPL-2.0

/**
 * The slice of Xtext's `AbstractRule` the value-converter machinery reaches: the rule name, the
 * `instanceof TerminalRule` test and (terminal rules only) the `fragment` flag. `isFragment` is optional
 * because only terminal rules have it; an absent method means `false`.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/AbstractRule.java (generated from Xtext.ecore)
 */
export interface AbstractRule {
  getName(): string;
  /** Java: `rule instanceof TerminalRule`. */
  isTerminalRule(): boolean;
  /** Java: `TerminalRule.isFragment()`; omitted by non-terminal rules. */
  isFragment?(): boolean;
}
