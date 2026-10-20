// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { eINSTANCE, Literals } from './EcorePackage.js';

describe('EcorePackage', () => {
  it('names the three datatype literals', () => {
    expect([Literals.EINT, Literals.EDOUBLE, Literals.ESTRING].map((t) => t.getName())).toEqual([
      'EInt',
      'EDouble',
      'EString',
    ]);
  });

  it('reaches one shared factory through EDataType -> EPackage -> EFactory', () => {
    const factory = Literals.EINT.getEPackage().getEFactoryInstance();
    expect(Literals.EDOUBLE.getEPackage()).toBe(eINSTANCE);
    expect(Literals.ESTRING.getEPackage().getEFactoryInstance()).toBe(factory);
    expect(factory.createFromString(Literals.EDOUBLE, '.5')).toBe(0.5);
  });
});
