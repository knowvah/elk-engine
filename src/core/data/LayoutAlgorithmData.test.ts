// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { AbstractLayoutProvider } from '../AbstractLayoutProvider.js';
import type { ElkNode } from '../../graph/ElkNode.js';
import { GraphFeature } from '../../graph/properties/GraphFeature.js';
import { Property } from '../../graph/properties/Property.js';
import { simpleNameOf } from '../../java/lang/JavaClass.js';
import * as JavaString from '../../java/lang/JavaString.js';
import { EnumSet } from '../../java/util/EnumSet.js';
import { newHashMap } from '../../guava/Maps.js';
import { STRING } from '../../java/util/HashStrategy.js';
import { ILabelManager } from '../labels/ILabelManager.js';
import { ITopdownSizeApproximator } from '../options/ITopdownSizeApproximator.js';
import type { IFactory } from '../util/IFactory.js';
import type { IElkProgressMonitor } from '../util/IElkProgressMonitor.js';
import { LayoutAlgorithmData } from './LayoutAlgorithmData.js';

const ALGORITHM_ID = 'org.eclipse.elk.layered';

class TestProvider extends AbstractLayoutProvider {
  readonly log: string[] = [];
  layout(_node: ElkNode, _monitor: IElkProgressMonitor): void {
    this.log.push('layout');
  }
  override initialize(parameter: string): void {
    this.log.push(`init:${parameter}`);
  }
  override dispose(): void {
    this.log.push('dispose');
  }
}

class ValidatorStub {}

function prop(id: string): Property<unknown> {
  return new Property<unknown>(id);
}

function algorithm(): LayoutAlgorithmData {
  return new LayoutAlgorithmData.Builder().id(ALGORITHM_ID).create();
}

describe('LayoutAlgorithmData', () => {
  it('exposes every configured builder value', () => {
    const factory: IFactory<AbstractLayoutProvider> = { create: () => new TestProvider(), destroy: () => {} };
    const features = EnumSet.of(GraphFeature.PORTS, GraphFeature.MULTI_EDGES);
    const data = new LayoutAlgorithmData.Builder()
      .id(ALGORITHM_ID)
      .name('Layered')
      .providerFactory(factory)
      .category('cat')
      .melkBundleName('bundle')
      .definingBundleId('def')
      .description('desc')
      .imagePath('img.png')
      .supportedFeatures(features)
      .validatorClass(ValidatorStub)
      .create();
    expect(data.getId()).toBe(ALGORITHM_ID);
    expect(data.getName()).toBe('Layered');
    expect(data.getCategoryId()).toBe('cat');
    expect(data.getBundleName()).toBe('bundle');
    expect(data.getDefiningBundleId()).toBe('def');
    expect(data.getDescription()).toBe('desc');
    expect(data.getPreviewImagePath()).toBe('img.png');
    expect(data.getSupportedFeatures()).toBe(features);
    expect(data.getValidatorClass()).toBe(ValidatorStub);
    expect(data.supportsFeature(GraphFeature.PORTS)).toBe(true);
    expect(data.supportsFeature(GraphFeature.SELF_LOOPS)).toBe(false);
  });

  it('defaults to no features, null values and an empty id', () => {
    const data = new LayoutAlgorithmData.Builder().create();
    expect(data.getSupportedFeatures().size()).toBe(0);
    expect(data.getName()).toBeNull();
    expect(data.getValidatorClass()).toBeNull();
    expect(data.getId()).toBe('');
  });

  it('lists known option ids in Java HashMap order', () => {
    const data = algorithm();
    const ids = ['c', 'a', 'b', 'org.eclipse.elk.direction', 'org.eclipse.elk.spacing.nodeNode'];
    ids.forEach((id) => data.addKnownOption(prop(id), id));
    const reference = newHashMap<string, unknown>(STRING);
    ids.forEach((id) => reference.put(id, id));
    expect([...data.getKnownOptionIds()]).toEqual([...reference.keys()]);
  });

  it('orders single-character ids by their hash buckets, not insertion order', () => {
    const data = algorithm();
    ['c', 'a', 'b'].forEach((id) => data.addKnownOption(prop(id), null));
    // String.hashCode of a one-char string is its code unit (97, 98, 99): buckets 1, 2, 3 of 16.
    expect([...data.getKnownOptionIds()]).toEqual(['a', 'b', 'c']);
  });

  it('answers knowsOption and getDefaultValue alike for a property and its id', () => {
    const data = algorithm();
    const known = prop('known');
    data.addKnownOption(known, 42);
    data.addKnownOption(prop('nullDefault'), null);
    expect(data.knowsOption(known)).toBe(true);
    expect(data.knowsOption('known')).toBe(true);
    expect(data.getDefaultValue(known)).toBe(42);
    expect(data.getDefaultValue('known')).toBe(42);
    expect(data.knowsOption('nullDefault')).toBe(true);
    expect(data.getDefaultValue('nullDefault')).toBeNull();
    expect(data.knowsOption(prop('unknown'))).toBe(false);
    expect(data.knowsOption('unknown')).toBe(false);
    expect(data.getDefaultValue('unknown')).toBeNull();
  });

  it('creates provider instances through the factory once per new instance', () => {
    let created = 0;
    const factory: IFactory<AbstractLayoutProvider> = {
      create: () => {
        created += 1;
        return new TestProvider();
      },
      destroy: () => {},
    };
    const data = new LayoutAlgorithmData.Builder().id(ALGORITHM_ID).providerFactory(factory).create();
    const pool = data.getInstancePool();
    const first = pool.fetch();
    expect(created).toBe(1);
    pool.release(first);
    expect(pool.fetch()).toBe(first);
    expect(created).toBe(1);
    expect(pool.fetch()).not.toBe(first);
    expect(created).toBe(2);
  });

  it('fails with a TypeError on first fetch when no provider factory was configured (D10: NPE)', () => {
    expect(() => algorithm().getInstancePool().fetch()).toThrow(TypeError);
  });

  it('follows the id-based Java object contract', () => {
    const data = algorithm();
    expect(data.toString()).toBe(`Layout Algorithm: ${ALGORITHM_ID}`);
    expect(data.hashCode()).toBe(JavaString.hashCode(ALGORITHM_ID));
    expect(data.equals(algorithm())).toBe(true);
    expect(data.equals(new LayoutAlgorithmData.Builder().id('x').create())).toBe(false);
    expect(data.equals('x')).toBe(false);
  });
});

describe('AbstractLayoutProvider', () => {
  it('has no-op initialize and dispose by default', () => {
    class Plain extends AbstractLayoutProvider {
      layout(): void {}
    }
    const p = new Plain();
    expect(p.initialize('x')).toBeUndefined();
    expect(p.dispose()).toBeUndefined();
  });

  it('dispatches overridden hooks', () => {
    const p = new TestProvider();
    p.initialize('param');
    p.dispose();
    expect(p.log).toEqual(['init:param', 'dispose']);
  });
});

describe('interface class tokens', () => {
  it('carry the Java simple names', () => {
    expect(simpleNameOf(ILabelManager)).toBe('ILabelManager');
    expect(simpleNameOf(ITopdownSizeApproximator)).toBe('ITopdownSizeApproximator');
  });
});
