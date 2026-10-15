// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { IllegalStateException } from '../../java/lang/IllegalStateException.js';
import { AbstractDeclarativeValidator } from './AbstractDeclarativeValidator.js';
import { CheckMode } from './CheckMode.js';
import { CheckType } from './CheckType.js';
import { FeatureBasedDiagnostic } from './FeatureBasedDiagnostic.js';
import { BasicDiagnostic } from './emf/BasicDiagnostic.js';
import { DiagnosticSeverity } from './emf/Diagnostic.js';
import type { ValidationContext } from './emf/EValidator.js';
import type { EStructuralFeature } from './EStructuralFeature.js';
import type { MessageArgs } from './MessageArguments.js';
import type { ValidationMessageAcceptor } from './ValidationMessageAcceptor.js';

class Thing implements EObject {
  constructor(readonly name: string) {}
  eClass(): EClass {
    return { getName: () => 'Thing' };
  }
  eContainer(): EObject | null {
    return null;
  }
  eContents(): never {
    throw new Error('unused');
  }
  eAllContents(): IterableIterator<EObject> {
    throw new Error('unused');
  }
}

const FEATURE: EStructuralFeature = { getName: () => 'f' };
const isThing = (o: EObject): o is Thing => o instanceof Thing;

interface Accepted {
  kind: string;
  message: string;
  object: EObject | null;
  feature: EStructuralFeature | null;
  index: number;
  code: string | null;
  data: readonly string[];
}

/** Exposes the protected message API and records what reaches the message acceptor. */
class Probe extends AbstractDeclarativeValidator {
  readonly accepted: Accepted[] = [];
  readonly recorder: ValidationMessageAcceptor = {
    acceptError: (message, { object, feature, index }, { code, issueData: data }) => {
      this.accepted.push({ kind: 'error', message, object, feature, index, code, data });
    },
    acceptWarning: (message, { object, feature, index }, { code, issueData: data }) => {
      this.accepted.push({ kind: 'warning', message, object, feature, index, code, data });
    },
    acceptInfo: (message, { object, feature, index }, { code, issueData: data }) => {
      this.accepted.push({ kind: 'info', message, object, feature, index, code, data });
    },
  };

  register(check: (o: Thing) => void, type?: CheckType): void {
    this.addCheck(isThing, check, type);
  }

  callWarning(message: string, ...args: MessageArgs): void {
    this.warning(message, ...args);
  }

  callError(message: string, ...args: MessageArgs): void {
    this.error(message, ...args);
  }

  callGuard(expression: boolean): void {
    this.guard(expression);
  }

  override getMessageAcceptor(): ValidationMessageAcceptor {
    return this.recorder;
  }
}

function run(validator: AbstractDeclarativeValidator, target: EObject, context: ValidationContext = new Map()) {
  const chain = new BasicDiagnostic(DiagnosticSeverity.OK, 'test', 0, 'root');
  const valid = validator.validate(target.eClass(), target, chain, context);
  return { valid, chain, children: chain.getChildren() };
}

describe('AbstractDeclarativeValidator', () => {
  it('resolves every overload of error/warning to source, feature, index, code and data', () => {
    const validator = new Probe();
    const current = new Thing('current');
    const other = new Thing('other');
    validator.register((o) => {
      validator.callWarning('a', FEATURE);
      validator.callWarning('b', FEATURE, 2);
      validator.callWarning('c', FEATURE, 'CODE', 'd1', 'd2');
      validator.callWarning('d', FEATURE, 3, null);
      validator.callError('e', other, FEATURE);
      validator.callError('f', other, FEATURE, 4);
      validator.callError('g', other, FEATURE, 'CODE', 'x');
      validator.callError('h', other, null, 5, 'CODE', 'y');
      validator.callError('i', null);
      expect(o).toBe(current);
    });

    run(validator, current);

    expect(validator.accepted.map((a) => [a.kind, a.message, a.object, a.feature, a.index, a.code, a.data])).toEqual([
      ['warning', 'a', current, FEATURE, -1, null, []],
      ['warning', 'b', current, FEATURE, 2, null, []],
      ['warning', 'c', current, FEATURE, -1, 'CODE', ['d1', 'd2']],
      ['warning', 'd', current, FEATURE, 3, null, []],
      ['error', 'e', other, FEATURE, -1, null, []],
      ['error', 'f', other, FEATURE, 4, null, []],
      ['error', 'g', other, FEATURE, -1, 'CODE', ['x']],
      ['error', 'h', other, null, 5, 'CODE', ['y']],
      ['error', 'i', current, null, -1, null, []],
    ]);
  });

  it('reports valid unless a check reported an error', () => {
    const warns = new (class extends AbstractDeclarativeValidator {
      constructor() {
        super();
        this.addCheck(isThing, () => this.warning('w', null));
      }
    })();
    const fails = new (class extends AbstractDeclarativeValidator {
      constructor() {
        super();
        this.addCheck(isThing, () => this.warning('w', null));
        this.addCheck(isThing, () => this.error('e', null));
      }
    })();

    expect(run(warns, new Thing('t')).valid).toBe(true);
    expect(run(fails, new Thing('t')).valid).toBe(false);
  });

  it('creates feature-based diagnostics with severity, check type, code and data', () => {
    const validator = new (class extends AbstractDeclarativeValidator {
      constructor() {
        super();
        this.addCheck(isThing, (o) => this.error('err', o, FEATURE, 3, 'ERR', 'p'), CheckType.NORMAL);
        this.addCheck(isThing, () => this.warning('warn', null));
        this.addCheck(isThing, (o) =>
          this.getMessageAcceptor().acceptInfo(
            'inf',
            { object: o, feature: null, index: -1 },
            { code: 'INF', issueData: [] },
          ),
        );
      }
    })();
    const thing = new Thing('t');

    const { children } = run(validator, thing);

    const [error, warning, info] = children as FeatureBasedDiagnostic[];
    expect([error?.getSeverity(), warning?.getSeverity(), info?.getSeverity()]).toEqual([
      DiagnosticSeverity.ERROR,
      DiagnosticSeverity.WARNING,
      DiagnosticSeverity.INFO,
    ]);
    expect(error?.getCheckType()).toBe(CheckType.NORMAL);
    expect(warning?.getCheckType()).toBe(CheckType.FAST);
    expect(error?.getData()).toEqual([thing, FEATURE, 3, ['p']]);
    expect(warning?.getData()).toEqual([thing, []]);
    expect([error?.getIssueCode(), error?.getFeature(), error?.getIndex(), error?.getMessage()]).toEqual([
      'ERR',
      FEATURE,
      3,
      'err',
    ]);
  });

  it('honours the check mode in the context and rejects a foreign context value', () => {
    const validator = new Probe();
    validator.register(() => validator.callWarning('normal', null), CheckType.NORMAL);

    expect(run(validator, new Thing('t'), new Map([[CheckMode.KEY, CheckMode.FAST_ONLY]])).children).toEqual([]);
    expect(validator.accepted).toEqual([]);
    run(validator, new Thing('t'), new Map([[CheckMode.KEY, CheckMode.NORMAL_ONLY]]));
    expect(validator.accepted.map((a) => a.message)).toEqual(['normal']);
    expect(() => run(validator, new Thing('t'), new Map([[CheckMode.KEY, 'ALL']]))).toThrow(
      'Context object for key check.mode should be of Type CheckMode but was string',
    );
  });

  it('swallows guard failures and null dereferences, rethrows everything else', () => {
    const guarded = new Probe();
    guarded.register(() => guarded.callGuard(false));
    guarded.register(() => guarded.callGuard(true));
    const nullDeref = new Probe();
    // the TypeError a null dereference raises (Java's NPE, D10), thrown explicitly
    nullDeref.register(() => {
      throw new TypeError("Cannot read properties of null (reading 'x')");
    });
    const failing = new Probe();
    failing.register(() => {
      throw new RangeError('boom');
    });

    expect(run(guarded, new Thing('t')).valid).toBe(true);
    expect(run(nullDeref, new Thing('t')).valid).toBe(true);
    expect(() => run(failing, new Thing('t'))).toThrow(RangeError);
  });

  it('refuses a second validation run while one is active', () => {
    const validator = new Probe();
    validator.register((o) => {
      run(validator, o);
    });

    expect(() => run(validator, new Thing('t'))).toThrow(new IllegalStateException('State is already assigned.'));
  });

  it('fails like a null dereference when a message is sent outside a run', () => {
    const validator = new Probe();

    expect(() => validator.callWarning('w', null)).toThrow(TypeError);
    expect(() => validator.callError('e', null)).toThrow(TypeError);
    expect(() =>
      validator.acceptWarning('w', { object: null, feature: null, index: -1 }, { code: null, issueData: [] }),
    ).toThrow(TypeError);
  });

  it('is its own message acceptor by default', () => {
    const validator = new (class extends AbstractDeclarativeValidator {})();

    expect(validator.getMessageAcceptor()).toBe(validator);
  });

  it('exposes source, children and code of a feature-based diagnostic', () => {
    const thing = new Thing('t');
    const diagnostic = new FeatureBasedDiagnostic(
      DiagnosticSeverity.ERROR,
      'm',
      { object: thing, feature: FEATURE, index: 2 },
      CheckType.EXPENSIVE,
      { code: 'C', issueData: ['a'] },
    );
    const sourceless = new FeatureBasedDiagnostic(
      DiagnosticSeverity.ERROR,
      'm',
      { object: null, feature: null, index: -1 },
      null,
      { code: null, issueData: [] },
    );

    expect([diagnostic.getChildren(), diagnostic.getCode(), diagnostic.getSource(), diagnostic.getCheckType()]).toEqual(
      [[], 0, String(thing), CheckType.EXPENSIVE],
    );
    expect([sourceless.getSource(), sourceless.getData()]).toEqual(['', [null, []]]);
  });

  it('rejects null issue data', () => {
    expect(
      () =>
        new FeatureBasedDiagnostic(4, 'm', { object: null, feature: null, index: -1 }, null, {
          code: null,
          issueData: [null as unknown as string],
        }),
    ).toThrow(new TypeError('issueData may not contain null'));
  });
});
