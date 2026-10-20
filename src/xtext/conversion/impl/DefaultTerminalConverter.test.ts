// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { Literals } from '../../../emf/ecore/EcorePackage.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { NumberFormatException } from '../../../java/lang/NumberFormatException.js';
import type { AbstractRule } from '../../AbstractRule.js';
import { ValueConverterException } from '../ValueConverterException.js';
import type { LexerToken } from './AbstractLexerBasedConverter.js';
import { DefaultTerminalConverter, Factory } from './DefaultTerminalConverter.js';

const rule = (name: string): AbstractRule => ({ getName: () => name, isTerminalRule: () => true });
const FLOAT = rule('FLOAT');
const SIGNED_INT = rule('SIGNED_INT');
const ERROR_MESSAGE = 'Error converting string to value';

const intConverter = (): DefaultTerminalConverter => new Factory().create(SIGNED_INT, Literals.EINT);

describe('DefaultTerminalConverter', () => {
  it('converts through the EFactory of its data type', () => {
    expect(intConverter().toValue('-12', null)).toBe(-12);
    expect(new Factory().create(FLOAT, Literals.EDOUBLE).toValue('1.5', null)).toBe(1.5);
    expect(new Factory().create(rule('WS'), Literals.ESTRING).toValue(' ', null)).toBe(' ');
    expect(intConverter().toString(5)).toBe('5');
    expect(new Factory().create(FLOAT, Literals.EDOUBLE).toString(1)).toBe('1.0');
  });

  it('wraps a failed conversion with the factory exception as cause', () => {
    let thrown: unknown = null;
    try {
      intConverter().toValue('abc', null);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ValueConverterException);
    expect((thrown as ValueConverterException).getMessage()).toBe(ERROR_MESSAGE);
    expect((thrown as ValueConverterException).cause).toBeInstanceOf(NumberFormatException);
  });

  it('passes the node to the exception', () => {
    const node = {} as never;
    expect(() => intConverter().toValue('', node)).toThrow(ERROR_MESSAGE);
    try {
      intConverter().toValue('', node);
    } catch (e) {
      expect((e as ValueConverterException).getNode()).toBe(node);
    }
  });

  it('keeps null on the way in and rejects it on the way out', () => {
    expect(intConverter().toValue(null, null)).toBeNull();
    expect(() => intConverter().toString(null)).toThrow('SIGNED_INT may not be null.');
  });

  it('re-lexes its output when a token source is given', () => {
    const source = (text: string): readonly LexerToken[] => [{ type: 'RULE_FLOAT', text }];
    const converter = new Factory(source).create(FLOAT, Literals.EDOUBLE);
    expect(converter.toString(1.5)).toBe('1.5');
    const wrongType = new Factory((text) => [{ type: 'RULE_WS', text }]).create(FLOAT, Literals.EDOUBLE);
    expect(() => wrongType.toString(1.5)).toThrow("The value '1.5' is an invalid FLOAT");
  });

  it('fails on use before setDataType', () => {
    const bare = new DefaultTerminalConverter();
    bare.setRule(FLOAT);
    let thrown: unknown = null;
    try {
      bare.toValue('1', null);
    } catch (e) {
      thrown = e;
    }
    expect((thrown as ValueConverterException).cause).toBeInstanceOf(IllegalStateException);
    expect(() => bare.toString(1)).toThrow(IllegalStateException);
  });
});
