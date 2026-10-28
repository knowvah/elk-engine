// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LGraphElement } from './LGraphElement.js';

class Element extends LGraphElement {}

describe('LGraphElement', () => {
  it('starts with id 0 and the id is freely assignable', () => {
    const element = new Element();
    expect(element.id).toBe(0);
    element.id = 7;
    expect(element.id).toBe(7);
  });

  it('has no designation without an origin', () => {
    expect(new Element().getDesignation()).toBeNull();
  });

  it('designates itself with the identifier of its origin', () => {
    const element = new Element();
    const node = ElkGraphUtil.createGraph();
    node.setIdentifier('origin1');
    element.setProperty(InternalProperties.ORIGIN, node);
    expect(element.getDesignation()).toBe('origin1');
  });

  it('has no designation when the origin is not an ElkGraph element', () => {
    const element = new Element();
    element.setProperty(InternalProperties.ORIGIN, 'not an element');
    expect(element.getDesignation()).toBeNull();
  });
});
