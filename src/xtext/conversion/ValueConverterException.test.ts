// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import type { INode } from '../nodemodel/INode.js';
import { isRuleSpecific, NO_OP_CONVERTER } from './IValueConverter.js';
import { ValueConverterException } from './ValueConverterException.js';
import { ValueConverterWithValueException } from './ValueConverterWithValueException.js';

const NODE: INode = { getStartLine: () => 7, getText: () => 'x', getSemanticElement: () => null };

describe('ValueConverterException', () => {
  it('keeps message, node and cause', () => {
    const cause = new Error('inner');
    const e = new ValueConverterException('outer', NODE, cause);
    expect(e.getMessage()).toBe('outer');
    expect(e.message).toBe('outer');
    expect(e.getNode()).toBe(NODE);
    expect(e.cause).toBe(cause);
    expect(e.name).toBe('ValueConverterException');
  });

  it('takes the cause message when the message is null', () => {
    const e = new ValueConverterException(null, null, new Error('inner'));
    expect(e.getMessage()).toBe('inner');
    expect(e.getNode()).toBeNull();
  });

  it('has a null message without message and cause', () => {
    const e = new ValueConverterException(null, null, null);
    expect(e.getMessage()).toBeNull();
    expect(e.cause).toBeUndefined();
  });
});

describe('ValueConverterWithValueException', () => {
  it('has no range with the unranged form', () => {
    const e = new ValueConverterWithValueException('m', NODE, 'v', null);
    expect(e.getValue()).toBe('v');
    expect(e.hasRange()).toBe(false);
    expect([e.getOffset(), e.getLength()]).toEqual([-1, -1]);
    expect(e.getNode()).toBe(NODE);
    expect(e.name).toBe('ValueConverterWithValueException');
  });

  it('carries the range and cause of the ranged form', () => {
    const cause = new Error('c');
    const e = new ValueConverterWithValueException('m', null, 'v', cause, { offset: 3, length: 2 });
    expect(e.hasRange()).toBe(true);
    expect([e.getOffset(), e.getLength()]).toEqual([3, 2]);
    expect(e.cause).toBe(cause);
    expect(e).toBeInstanceOf(ValueConverterException);
  });
});

describe('IValueConverter helpers', () => {
  it('NO_OP_CONVERTER is the identity in both directions', () => {
    expect(NO_OP_CONVERTER.toValue('abc', null)).toBe('abc');
    expect(NO_OP_CONVERTER.toValue(null, null)).toBeNull();
    expect(NO_OP_CONVERTER.toString('abc')).toBe('abc');
  });

  it('isRuleSpecific detects a setRule method', () => {
    expect(isRuleSpecific(NO_OP_CONVERTER)).toBe(false);
    expect(isRuleSpecific({ ...NO_OP_CONVERTER, setRule: () => undefined } as typeof NO_OP_CONVERTER)).toBe(true);
  });
});
