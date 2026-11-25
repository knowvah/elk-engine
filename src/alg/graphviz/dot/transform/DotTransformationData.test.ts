// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Property } from '../../../../graph/properties/Property.js';
import { DotTransformationData } from './DotTransformationData.js';

describe('DotTransformationData', () => {
  it('starts with a null source graph, no target graphs and no messages', () => {
    const data = new DotTransformationData<string, number>();
    expect(data.getSourceGraph()).toBeNull();
    expect(data.getTargetGraphs()).toEqual([]);
    expect([...data.getMessages()]).toEqual([]);
  });

  it('keeps the source graph it is given', () => {
    const data = new DotTransformationData<string, number>();
    data.setSourceGraph('source');
    expect(data.getSourceGraph()).toBe('source');
  });

  it('returns the live target graph list, so callers add to and replace in it', () => {
    const data = new DotTransformationData<string, number>();
    data.getTargetGraphs().push(1, 2);
    data.getTargetGraphs()[0] = 7;
    expect(data.getTargetGraphs()).toEqual([7, 2]);
  });

  it('reports log messages in the order they were logged', () => {
    const data = new DotTransformationData<string, number>();
    data.log('first');
    data.log('second');
    expect([...data.getMessages()]).toEqual(['first', 'second']);
  });

  it('is a property holder', () => {
    const data = new DotTransformationData<string, number>();
    const flag = new Property<boolean>('dotTransformationData.test.flag', false);
    expect(data.getProperty(flag)).toBe(false);
    data.setProperty(flag, true);
    expect(data.getProperty(flag)).toBe(true);
  });
});
