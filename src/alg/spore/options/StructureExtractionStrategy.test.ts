// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { DelaunayTriangulationPhase } from '../p1structure/DelaunayTriangulationPhase.js';
import { StructureExtractionStrategy } from './StructureExtractionStrategy.js';

const DECLARED = ['DELAUNAY_TRIANGULATION'] as const;

describe('StructureExtractionStrategy', () => {
  it('declares the constants in Java order with matching ordinals and names', () => {
    expect(StructureExtractionStrategy.values().map((c) => [c.name(), c.ordinal(), c.toString()])).toEqual(
      DECLARED.map((name, index) => [name, index, name]),
    );
    expect(StructureExtractionStrategy.values()[0]).toBe(StructureExtractionStrategy.DELAUNAY_TRIANGULATION);
  });

  it('compareTo of a constant with itself is 0', () => {
    expect(
      StructureExtractionStrategy.DELAUNAY_TRIANGULATION.compareTo(StructureExtractionStrategy.DELAUNAY_TRIANGULATION),
    ).toBe(0);
  });

  it('valueOf resolves each constant by name', () => {
    for (const name of DECLARED) {
      expect(StructureExtractionStrategy.valueOf(name)).toBe(StructureExtractionStrategy[name]);
    }
  });

  it('valueOf throws the Java message for an unknown name', () => {
    expect(() => StructureExtractionStrategy.valueOf('FOO')).toThrow(IllegalArgumentException);
    expect(() => StructureExtractionStrategy.valueOf('FOO')).toThrow(
      'No enum constant org.eclipse.elk.alg.spore.options.StructureExtractionStrategy.FOO',
    );
  });

  it('create() instantiates the phase of each constant', () => {
    expect(StructureExtractionStrategy.DELAUNAY_TRIANGULATION.create().constructor).toBe(DelaunayTriangulationPhase);
  });

  it('create() returns a new instance on every call', () => {
    const constant = StructureExtractionStrategy.values()[0]!;
    expect(constant.create()).not.toBe(constant.create());
  });

  it('create() throws the Java message for a constant it has no implementation for', () => {
    const unknown = { toString: () => 'NO_SUCH_STRATEGY' } as unknown as StructureExtractionStrategy;
    expect(() => StructureExtractionStrategy.prototype.create.call(unknown)).toThrow(IllegalArgumentException);
    expect(() => StructureExtractionStrategy.prototype.create.call(unknown)).toThrow(
      'No implementation available for NO_SUCH_STRATEGY',
    );
  });
});
