// SPDX-License-Identifier: EPL-2.0
// Structural proof of HyperEdgeSegmentDependency and its DependencyType (mission 7e, T4): list bookkeeping of
// setSource/setTarget/remove/reverse (HyperEdgeSegmentDependency.java:100-168), the critical weight constant (`:43`)
// and the enum protocol (`:35-40`). The weights the router computes are proven by the OrthogonalEdgeRouter rows.
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../../../java/lang/IllegalArgumentException.js';
import { HyperEdgeSegment } from './HyperEdgeSegment.js';
import { HyperEdgeSegmentDependency } from './HyperEdgeSegmentDependency.js';
import { HyperEdgeSegmentDependencyDependencyType as DependencyType } from './HyperEdgeSegmentDependencyDependencyType.js';

const REGULAR_WEIGHT = 7;

describe('HyperEdgeSegmentDependency', () => {
  it('createAndAddRegular links the segments and keeps the given weight', () => {
    const source = new HyperEdgeSegment(null);
    const target = new HyperEdgeSegment(null);
    const dependency = HyperEdgeSegmentDependency.createAndAddRegular(source, target, REGULAR_WEIGHT);
    expect(dependency.getType()).toBe(DependencyType.REGULAR);
    expect(dependency.getWeight()).toBe(REGULAR_WEIGHT);
    expect(dependency.getSource()).toBe(source);
    expect(dependency.getTarget()).toBe(target);
    expect(source.getOutgoingSegmentDependencies()).toEqual([dependency]);
    expect(target.getIncomingSegmentDependencies()).toEqual([dependency]);
    expect(source.getIncomingSegmentDependencies()).toEqual([]);
    expect(target.getOutgoingSegmentDependencies()).toEqual([]);
  });

  it('createAndAddCritical uses CRITICAL_DEPENDENCY_WEIGHT', () => {
    const dependency = HyperEdgeSegmentDependency.createAndAddCritical(
      new HyperEdgeSegment(null),
      new HyperEdgeSegment(null),
    );
    expect(dependency.getType()).toBe(DependencyType.CRITICAL);
    expect(dependency.getWeight()).toBe(HyperEdgeSegmentDependency.CRITICAL_DEPENDENCY_WEIGHT);
  });

  it('remove detaches both ends and leaves the other dependencies of the segments alone', () => {
    const source = new HyperEdgeSegment(null);
    const target = new HyperEdgeSegment(null);
    const kept = HyperEdgeSegmentDependency.createAndAddRegular(source, target, 1);
    const removed = HyperEdgeSegmentDependency.createAndAddRegular(source, target, 2);
    removed.remove();
    expect(removed.getSource()).toBeNull();
    expect(removed.getTarget()).toBeNull();
    expect(source.getOutgoingSegmentDependencies()).toEqual([kept]);
    expect(target.getIncomingSegmentDependencies()).toEqual([kept]);
  });

  it('reverse swaps source and target and moves the dependency between the segment lists', () => {
    const source = new HyperEdgeSegment(null);
    const target = new HyperEdgeSegment(null);
    const dependency = HyperEdgeSegmentDependency.createAndAddRegular(source, target, 1);
    dependency.reverse();
    expect(dependency.getSource()).toBe(target);
    expect(dependency.getTarget()).toBe(source);
    expect(source.getOutgoingSegmentDependencies()).toEqual([]);
    expect(source.getIncomingSegmentDependencies()).toEqual([dependency]);
    expect(target.getOutgoingSegmentDependencies()).toEqual([dependency]);
    expect(target.getIncomingSegmentDependencies()).toEqual([]);
  });

  it('prints source->target (TYPE) as HyperEdgeSegmentDependency.toString does', () => {
    const dependency = HyperEdgeSegmentDependency.createAndAddCritical(
      new HyperEdgeSegment(null),
      new HyperEdgeSegment(null),
    );
    expect(dependency.toString()).toBe('{}->{} (CRITICAL)');
  });
});

describe('HyperEdgeSegmentDependency.DependencyType', () => {
  it('lists REGULAR and CRITICAL in declaration order', () => {
    expect(DependencyType.values().map((type) => type.name())).toEqual(['REGULAR', 'CRITICAL']);
    expect(DependencyType.values().map((type) => type.ordinal())).toEqual([0, 1]);
    expect(DependencyType.CRITICAL.compareTo(DependencyType.REGULAR)).toBe(1);
  });

  it('valueOf finds a constant or throws', () => {
    expect(DependencyType.valueOf('CRITICAL')).toBe(DependencyType.CRITICAL);
    expect(DependencyType.REGULAR.toString()).toBe('REGULAR');
    expect(() => DependencyType.valueOf('OPTIONAL')).toThrow(IllegalArgumentException);
  });
});
