// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ElkGraphUtil } from '../../../graph/util/ElkGraphUtil.js';
import { InternalProperties } from '../options/InternalProperties.js';
import { LLabel } from './LLabel.js';
import { LShape } from './LShape.js';

describe('LLabel', () => {
  it('is an LShape; the no-argument form has empty text', () => {
    const label = new LLabel();
    expect(label).toBeInstanceOf(LShape);
    expect(label.getText()).toBe('');
  });

  it('returns its text', () => {
    expect(new LLabel('hello').getText()).toBe('hello');
  });

  it('designates itself with its text and prints it as l_<text>', () => {
    const label = new LLabel('hello');
    expect(label.getDesignation()).toBe('hello');
    expect(label.toString()).toBe('l_hello');
  });

  it('falls back to the origin identifier when the text is empty', () => {
    const label = new LLabel('');
    const origin = ElkGraphUtil.createGraph();
    origin.setIdentifier('lab');
    label.setProperty(InternalProperties.ORIGIN, origin);
    expect(label.getDesignation()).toBe('lab');
    expect(label.toString()).toBe('l_lab');
  });

  it('prints plain "label" without any designation', () => {
    const label = new LLabel();
    expect(label.getDesignation()).toBeNull();
    expect(label.toString()).toBe('label');
  });
});
