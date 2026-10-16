// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { EClass } from '../../emf/ecore/EClass.js';
import type { EObject } from '../../emf/ecore/EObject.js';
import { CompositeEValidator } from './CompositeEValidator.js';
import { BasicDiagnostic } from './emf/BasicDiagnostic.js';
import { DiagnosticSeverity } from './emf/Diagnostic.js';
import type { EValidator } from './emf/EValidator.js';
import { EObjectValidator } from './EObjectValidator.js';
import { EValidatorRegistrar } from './EValidatorRegistrar.js';

class FirstValidator implements EValidator {
  validate(): boolean {
    return true;
  }
}

class SecondValidator implements EValidator {
  validate(): boolean {
    return false;
  }
}

const NO_MAPS = (): [] => [];
const noLog = (): void => undefined;
const newComposite = (): CompositeEValidator => new CompositeEValidator(NO_MAPS, noLog);
const names = (composite: CompositeEValidator): string[] => composite.getContents().map((d) => d.constructor.name);

describe('EValidatorRegistrar', () => {
  it('wraps the registry default into a composite ahead of the language validator', () => {
    const registrar = new EValidatorRegistrar(new EObjectValidator(NO_MAPS), newComposite);

    const composite = registrar.register(new FirstValidator());

    expect(names(composite)).toEqual(['DefaultEObjectValidator', 'EObjectValidator', 'FirstValidator']);
  });

  it('starts a fresh composite when the registry holds no validator for the package', () => {
    const registrar = new EValidatorRegistrar(null, newComposite);

    const composite = registrar.register(new FirstValidator());

    expect(names(composite)).toEqual(['DefaultEObjectValidator', 'FirstValidator']);
  });

  it('adds later registrations to the same composite and ignores a second validator of one class', () => {
    const registrar = new EValidatorRegistrar(new EObjectValidator(NO_MAPS), newComposite);
    const first = registrar.register(new FirstValidator());

    const second = registrar.register(new SecondValidator());
    const again = registrar.register(new FirstValidator());

    expect(second).toBe(first);
    expect(again).toBe(first);
    expect(names(first)).toEqual(['DefaultEObjectValidator', 'EObjectValidator', 'FirstValidator', 'SecondValidator']);
  });
});

describe('CompositeEValidator', () => {
  const eClass: EClass = { getName: () => 'Thing' };
  const target = {} as EObject;

  it('ignores itself and merges the delegates of another composite', () => {
    const outer = newComposite();
    const inner = newComposite();
    inner.addValidator(new FirstValidator());

    outer.addValidator(outer);
    outer.addValidator(inner);

    expect(names(outer)).toEqual(['DefaultEObjectValidator', 'FirstValidator']);
  });

  it('is invalid when any delegate is invalid, and still runs every delegate', () => {
    const ran: string[] = [];
    class Recording implements EValidator {
      constructor(
        readonly label: string,
        readonly result: boolean,
      ) {}
      validate(): boolean {
        ran.push(this.label);
        return this.result;
      }
    }
    class RecordingA extends Recording {}
    class RecordingB extends Recording {}
    const composite = newComposite();
    composite.addValidator(new RecordingA('a', false));
    composite.addValidator(new RecordingB('b', true));
    const chain = new BasicDiagnostic(DiagnosticSeverity.OK, 'root', 0, 'root');

    expect(composite.validate(eClass, target, chain, new Map())).toBe(false);
    expect(ran).toEqual(['a', 'b']);
  });
});
