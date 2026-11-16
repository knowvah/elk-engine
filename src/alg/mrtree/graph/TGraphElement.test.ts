// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { MapPropertyHolder } from '../../../graph/properties/MapPropertyHolder.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { TGraphElement } from './TGraphElement.js';

class Element extends TGraphElement {}

describe('TGraphElement', () => {
  it('is a property holder whose id is the constructor argument (TGraphElement.java:30-34)', () => {
    const element = new Element(7);
    expect(element).toBeInstanceOf(MapPropertyHolder);
    expect(element.id).toBe(7);
  });

  it('the implicit constructor leaves the Java int default 0 (TGraphElement.java:40)', () => {
    expect(new Element().id).toBe(0);
  });

  it('keeps the id writable and holds properties', () => {
    const element = new Element(1);
    element.id = 9;
    element.setProperty(InternalProperties.FAN, 4);
    expect(element.id).toBe(9);
    expect(element.getProperty(InternalProperties.FAN)).toBe(4);
  });
});
