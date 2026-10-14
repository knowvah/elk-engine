// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { DefaultTerminalConverters } from '../../common/services/DefaultTerminalConverters.js';
import type { AbstractRule } from '../../AbstractRule.js';
import { type IValueConverter, NO_OP_CONVERTER, type RuleSpecific } from '../IValueConverter.js';
import {
  AbstractDeclarativeValueConverterService,
  type RuleLookup,
} from './AbstractDeclarativeValueConverterService.js';
import { IDValueConverter } from './IDValueConverter.js';
import { INTValueConverter } from './INTValueConverter.js';
import { STRINGValueConverter } from './STRINGValueConverter.js';

const TERMINALS = 'org.eclipse.xtext.common.Terminals.';
const GRAMMAR = 'org.example.G.';

function rule(name: string, terminal: boolean, fragment = false): AbstractRule {
  return { getName: () => name, isTerminalRule: () => terminal, isFragment: () => fragment };
}

const ID = rule('ID', true);
const INT = rule('INT', true);
const STRING = rule('STRING', true);
const WS = rule('WS', true, true);
const QUALIFIED_ID = rule('QualifiedId', false);

const RULES: ReadonlyMap<string, AbstractRule> = new Map([
  ['ID', ID],
  [TERMINALS + 'ID', ID],
  ['INT', INT],
  [TERMINALS + 'INT', INT],
  ['STRING', STRING],
  [TERMINALS + 'STRING', STRING],
  ['WS', WS],
  ['QualifiedId', QUALIFIED_ID],
]);

const LOOKUP: RuleLookup = {
  findRuleForName: (name) => RULES.get(name) ?? null,
  getQualifiedName: (r) => (r === ID || r === INT || r === STRING || r === WS ? TERMINALS : GRAMMAR) + r.getName(),
  getEStringDatatypeRules: () => [QUALIFIED_ID],
};

class RuleRecorder implements IValueConverter<string>, RuleSpecific {
  readonly rules: string[] = [];
  constructor(
    readonly label: string,
    private readonly onSetRule: (rule: AbstractRule) => void = () => undefined,
  ) {}

  setRule(r: AbstractRule): void {
    this.rules.push(r.getName());
    this.onSetRule(r);
  }

  toValue(string: string | null): string | null {
    return string === null ? null : `${this.label}:${string}`;
  }

  toString(value: string | null): string {
    return `${this.label}:${value}`;
  }
}

class Plain extends AbstractDeclarativeValueConverterService {
  constructor(configure: (service: Plain) => void) {
    super(LOOKUP);
    configure(this);
  }

  add(ruleName: string, converter: IValueConverter<unknown>, qualifiedName: string | null = null): void {
    this.register(ruleName, converter, qualifiedName);
  }

  nextLevel(): void {
    this.beginClassLevel();
  }
}

describe('DefaultTerminalConverters', () => {
  const id = new IDValueConverter(new Set(['node']));
  const int = new INTValueConverter();
  const string = new STRINGValueConverter();
  const service = new DefaultTerminalConverters(LOOKUP, id, int, string);

  it('serves ID, INT and STRING under simple and Terminals names', () => {
    for (const [name, converter] of [
      ['ID', id],
      ['INT', int],
      ['STRING', string],
    ] as const) {
      expect(service.getConverter(name), name).toBe(converter);
      expect(service.getConverter(TERMINALS + name), name).toBe(converter);
    }
  });

  it('gives the converters their rule', () => {
    expect(() => service.toString(null, 'ID')).toThrow('ID may not be null.');
    expect(() => service.toString(null, 'INT')).toThrow('INT may not be null.');
    expect(() => service.toString(null, 'STRING')).toThrow('STRING may not be null.');
  });

  it('converts through the service', () => {
    expect(service.toValue('^a', 'ID', null)).toBe('a');
    expect(service.toValue('12', 'INT', null)).toBe(12);
    expect(service.toString('node', 'ID')).toBe('^node');
  });

  it('falls back to the no-op converter for unknown rules', () => {
    expect(service.getConverter('Unknown')).toBe(NO_OP_CONVERTER);
    expect(service.getConverter('WS')).toBe(NO_OP_CONVERTER);
    expect(service.toValue('x', 'Unknown', null)).toBe('x');
  });

  it('converts EString datatype rules by identity under both names', () => {
    expect(service.toValue('a.b', 'QualifiedId', null)).toBe('a.b');
    expect(service.toString('a.b', GRAMMAR + 'QualifiedId')).toBe('a.b');
  });
});

describe('AbstractDeclarativeValueConverterService', () => {
  it('registers the first converter per name and gives the subclass level priority', () => {
    const base = new RuleRecorder('base');
    const derived = new RuleRecorder('derived');
    const service = new Plain((s) => {
      s.add('ID', base);
      s.nextLevel();
      s.add('ID', derived);
    });
    expect(service.getConverter('ID')).toBe(derived);
    expect(service.getConverter(TERMINALS + 'ID')).toBe(derived);
  });

  it('registers qualified names before simple ones, like the precedence of Java ^ and <', () => {
    const simple = new RuleRecorder('simple');
    const qualified = new RuleRecorder('qualified');
    const service = new Plain((s) => {
      s.add('ID', simple);
      s.add(TERMINALS + 'ID', qualified);
    });
    expect(service.getConverter('ID')).toBe(simple);
    expect(service.getConverter(TERMINALS + 'ID')).toBe(qualified);
  });

  it('sets the rule on registration and registers under an explicit qualified name', () => {
    const recorder = new RuleRecorder('r');
    const service = new Plain((s) => s.add('INT', recorder, 'custom.INT'));
    expect(service.getConverter('INT')).toBe(recorder);
    expect(service.getConverter('custom.INT')).toBe(recorder);
    expect(recorder.rules).toEqual(['INT']);
  });

  it('registers a lower level under the qualified name its derived level left free', () => {
    const base = new RuleRecorder('base');
    const derived = new RuleRecorder('derived');
    const service = new Plain((s) => {
      s.add('ID', base);
      s.nextLevel();
      s.add('ID', derived, 'custom.ID');
    });
    expect(service.getConverter('ID')).toBe(derived);
    expect(service.getConverter('custom.ID')).toBe(derived);
    expect(service.getConverter(TERMINALS + 'ID')).toBe(base);
    expect(derived.rules).toEqual(['ID']);
    expect(base.rules).toEqual(['ID']);
  });

  it('skips rules that are not in the grammar', () => {
    const service = new Plain((s) => s.add('Missing', new RuleRecorder('m')));
    expect(service.getConverter('Missing')).toBe(NO_OP_CONVERTER);
  });

  it('rejects converters for fragment terminal rules', () => {
    const service = new Plain((s) => s.add('WS', new RuleRecorder('ws')));
    expect(() => service.getConverter('WS')).toThrow(IllegalStateException);
    expect(() => service.getConverter('WS')).toThrow(
      "Tried to register a value converter for a fragment terminal rule: 'WS'",
    );
  });

  it('rejects two converters for the same rule in one class', () => {
    const service = new Plain((s) => {
      s.add('ID', new RuleRecorder('a'));
      s.add('ID', new RuleRecorder('b'));
    });
    expect(() => service.getConverter('ID')).toThrow("Tried to register two value converters for rule 'ID'");
  });

  it('allows the fragment flag to be absent on a terminal rule', () => {
    const plainRule: AbstractRule = { getName: () => 'Plain', isTerminalRule: () => true };
    const lookup: RuleLookup = { ...LOOKUP, findRuleForName: () => plainRule, getQualifiedName: () => 'q.Plain' };
    class Service extends AbstractDeclarativeValueConverterService {
      constructor() {
        super(lookup);
        this.register('Plain', NO_OP_CONVERTER);
      }
    }
    expect(new Service().getConverter('q.Plain')).toBe(NO_OP_CONVERTER);
  });

  it('skips a converter whose setRule throws IllegalArgumentException', () => {
    const picky = new RuleRecorder('picky', () => {
      throw new IllegalArgumentException('wrong rule');
    });
    const service = new Plain((s) => s.add('ID', picky));
    expect(service.getConverter('ID')).toBe(NO_OP_CONVERTER);
  });

  it('propagates other errors from setRule', () => {
    const broken = new RuleRecorder('broken', () => {
      throw new Error('broken');
    });
    const service = new Plain((s) => s.add('ID', broken));
    expect(() => service.getConverter('ID')).toThrow('broken');
  });

  it('builds the converter map once', () => {
    const recorder = new RuleRecorder('once');
    const service = new Plain((s) => s.add('ID', recorder));
    service.getConverter('ID');
    service.getConverter('ID');
    expect(recorder.rules).toEqual(['ID']);
  });

  it('does not override an explicit converter for a datatype rule', () => {
    const explicit = new RuleRecorder('explicit');
    const service = new Plain((s) => s.add('QualifiedId', explicit));
    expect(service.getConverter('QualifiedId')).toBe(explicit);
    expect(service.getConverter(GRAMMAR + 'QualifiedId')).toBe(explicit);
  });
});
