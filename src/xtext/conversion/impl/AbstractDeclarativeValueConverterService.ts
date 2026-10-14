// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import type { AbstractRule } from '../../AbstractRule.js';
import type { INode } from '../../nodemodel/INode.js';
import { type IValueConverter, isRuleSpecific, NO_OP_CONVERTER } from '../IValueConverter.js';
import type { Introspectable } from '../IValueConverterService.js';
import { AbstractValueConverterService } from './AbstractValueConverterService.js';
import { EFactoryValueConverter } from './EFactoryValueConverter.js';

/**
 * The grammar queries the service needs, replacing `IGrammarAccess` / `GrammarUtil` / `RuleNames`.
 */
export interface RuleLookup {
  /** `GrammarUtil.findRuleForName`: simple or qualified (`org.eclipse.xtext.common.Terminals.ID`) names. */
  findRuleForName(name: string): AbstractRule | null;
  /** `RuleNames.getQualifiedName`. */
  getQualifiedName(rule: AbstractRule): string;
  /**
   * The datatype parser rules of the grammar whose data type is `EString` (`allParserRules` filtered by
   * `isDatatypeRule`), the one case of `registerEFactoryConverters` ELK reaches.
   */
  getEStringDatatypeRules(): readonly AbstractRule[];
}

interface Registration {
  readonly ruleName: string;
  readonly converter: IValueConverter<unknown>;
  readonly qualifiedName: string | null;
  readonly level: number;
}

const QUALIFIER_SEPARATOR = '.';

/**
 * Base implementation of the value converter service. Java discovers `@ValueConverter` methods by
 * reflection over the class hierarchy, most derived class first; here each class registers its converters
 * with {@link AbstractDeclarativeValueConverterService.register} in its constructor, and a subclass calls
 * {@link AbstractDeclarativeValueConverterService.beginClassLevel} before its own registrations so its
 * level outranks its superclass's (first registration of a name wins). The reflection failures logged by
 * `log.error`/`log.trace` have no counterpart; the `IllegalArgumentException` branch (logged and skipped)
 * is kept. The `DefaultTerminalConverter` fallback for terminal rules is not reached by ELK (see
 * `registerEFactoryConverters`) and is not ported.
 *
 * @see org.eclipse.xtext/src/org/eclipse/xtext/conversion/impl/AbstractDeclarativeValueConverterService.java
 */
export abstract class AbstractDeclarativeValueConverterService
  extends AbstractValueConverterService
  implements Introspectable
{
  readonly #rules: RuleLookup;
  readonly #registrations: Registration[] = [];
  #level = 0;
  // Java guards the lazy map with double-checked locking; the port is single-threaded.
  #converters: Map<string, IValueConverter<unknown>> | null = null;

  protected constructor(rules: RuleLookup) {
    super();
    this.#rules = rules;
  }

  /** Starts the registrations of the next (more derived) class in the hierarchy. */
  protected beginClassLevel(): void {
    this.#level++;
  }

  /**
   * Replaces a `@ValueConverter(rule = ruleName)` method. `qualifiedName` defaults to the rule's qualified
   * name from the {@link RuleLookup}.
   */
  protected register(ruleName: string, converter: IValueConverter<unknown>, qualifiedName: string | null = null): void {
    this.#registrations.push({ ruleName, converter, qualifiedName, level: this.#level });
  }

  toString(value: unknown, lexerRule: string): string {
    return this.getConverter(lexerRule).toString(value);
  }

  toValue(string: string | null, lexerRule: string, node: INode | null): unknown {
    return this.getConverter(lexerRule).toValue(string, node);
  }

  getConverter(lexerRule: string): IValueConverter<unknown> {
    return this.getConverters().get(lexerRule) ?? NO_OP_CONVERTER;
  }

  protected getConverters(): ReadonlyMap<string, IValueConverter<unknown>> {
    if (this.#converters === null) {
      const converters = new Map<string, IValueConverter<unknown>>();
      this.internalRegisterForClass(converters);
      this.#converters = converters;
    }
    return this.#converters;
  }

  protected internalRegisterForClass(converters: Map<string, IValueConverter<unknown>>): void {
    this.recursiveRegisterForClass(converters);
    this.registerEFactoryConverters(converters);
  }

  protected recursiveRegisterForClass(converters: Map<string, IValueConverter<unknown>>): void {
    for (let level = this.#level; level >= 0; level--) {
      const registrations = this.#registrations.filter((registration) => registration.level === level);
      const thisConverters = new Set<string>();
      this.registerForLevel(registrations, thisConverters, true, converters);
      this.registerForLevel(registrations, thisConverters, false, converters);
    }
  }

  private registerForLevel(
    registrations: readonly Registration[],
    thisConverters: Set<string>,
    onlyExplicitConverters: boolean,
    converters: Map<string, IValueConverter<unknown>>,
  ): void {
    for (const registration of registrations) {
      // Java: `onlyExplicitConverters ^ ruleName.indexOf('.') < 0`; `<` binds tighter than `^`, so the
      // first pass handles the qualified names, the second the simple ones.
      if (onlyExplicitConverters === registration.ruleName.includes(QUALIFIER_SEPARATOR)) {
        this.registerOne(registration, thisConverters, converters);
      }
    }
  }

  private registerOne(
    registration: Registration,
    thisConverters: Set<string>,
    converters: Map<string, IValueConverter<unknown>>,
  ): void {
    const rule = this.#rules.findRuleForName(registration.ruleName);
    if (rule === null) return;
    if (rule.isTerminalRule() && rule.isFragment?.() === true) {
      throw new IllegalStateException(
        `Tried to register a value converter for a fragment terminal rule: '${registration.ruleName}'`,
      );
    }
    if (thisConverters.has(registration.ruleName)) {
      throw new IllegalStateException(`Tried to register two value converters for rule '${registration.ruleName}'`);
    }
    thisConverters.add(registration.ruleName);
    try {
      const converter = this.registerIfMissing(registration.ruleName, rule, registration, converters);
      const qualifiedName = registration.qualifiedName ?? this.#rules.getQualifiedName(rule);
      this.registerQualifiedIfMissing(qualifiedName, rule, converter, registration, converters);
    } catch (e) {
      // Java: `log.warn`; the registration is skipped.
      if (!(e instanceof IllegalArgumentException)) throw e;
    }
  }

  private registerIfMissing(
    name: string,
    rule: AbstractRule,
    registration: Registration,
    converters: Map<string, IValueConverter<unknown>>,
  ): IValueConverter<unknown> | null {
    if (!converters.has(name)) {
      const valueConverter = this.reflectiveGetConverter(registration, rule);
      converters.set(name, valueConverter);
      return valueConverter;
    }
    return null;
  }

  private registerQualifiedIfMissing(
    name: string,
    rule: AbstractRule,
    valueConverter: IValueConverter<unknown> | null,
    registration: Registration,
    converters: Map<string, IValueConverter<unknown>>,
  ): void {
    if (!converters.has(name)) {
      converters.set(name, valueConverter ?? this.reflectiveGetConverter(registration, rule));
    }
  }

  private reflectiveGetConverter(registration: Registration, rule: AbstractRule): IValueConverter<unknown> {
    const valueConverter = registration.converter;
    if (isRuleSpecific(valueConverter)) valueConverter.setRule(rule);
    return valueConverter;
  }

  /**
   * Datatype rules without an explicit converter get an {@link EFactoryValueConverter}; ELK reaches only
   * `EString` datatypes (`QualifiedId`). Terminal rules without a converter would get a
   * `DefaultTerminalConverter` in Java: ELK has none (`SIGNED_INT`/`FLOAT` occur only inside the
   * datatype rules `Number`/`NumberValue`, which have converters; `ANY_OTHER`, `WS` and comments are
   * hidden or syntax errors), so the lookup falls back to the no-op converter for them.
   */
  protected registerEFactoryConverters(converters: Map<string, IValueConverter<unknown>>): void {
    for (const parserRule of this.#rules.getEStringDatatypeRules()) {
      this.registerEFactoryIfMissing(parserRule.getName(), converters);
      this.registerEFactoryIfMissing(this.#rules.getQualifiedName(parserRule), converters);
    }
  }

  private registerEFactoryIfMissing(name: string, converters: Map<string, IValueConverter<unknown>>): void {
    if (!converters.has(name)) {
      converters.set(name, new EFactoryValueConverter());
    }
  }
}
