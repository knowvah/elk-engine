// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { JavaStringConverter } from './JavaStringConverter.js';

const code = (s: string): number => s.charCodeAt(0);

/** Rejects the letter `x` and every region containing one, to reach the validation hooks. */
class ValidatingConverter extends JavaStringConverter {
  protected override validateRegion(string: string, from: number, to: number): boolean {
    return !string.substring(from, to).includes('x');
  }

  protected override validate(c: number): boolean {
    return c !== code('x');
  }
}

describe('JavaStringConverter', () => {
  const converter = new JavaStringConverter();

  it('isHex accepts exactly the hexadecimal digits', () => {
    const accepted = [...'0123456789abcdefABCDEF'].every((c) => JavaStringConverter.isHex(code(c)));
    const rejected = [...'gGzZ:@`/ \u0010é'].some((c) => JavaStringConverter.isHex(code(c)));
    expect(accepted).toBe(true);
    expect(rejected).toBe(false);
  });

  it('doIsHexSequence checks at most the requested number of characters from the offset', () => {
    expect(JavaStringConverter.doIsHexSequence('zz00ffzz', 2, 4)).toBe(true);
    expect(JavaStringConverter.doIsHexSequence('zz00fgzz', 2, 4)).toBe(false);
    expect(JavaStringConverter.doIsHexSequence('ab', 0, 4)).toBe(true);
  });

  it('unescapes lower- and upper-case unicode escapes to the code unit', () => {
    expect(converter.convertFromJavaString('\\u00e9\\u00E9\\uFFFF', true)).toBe('éé￿');
  });

  it('keeps text without escapes unchanged and unescapes mixed text', () => {
    expect(converter.convertFromJavaString('plain', true)).toBe('plain');
    expect(converter.convertFromJavaString('a\\nb\\\\c', false)).toBe('a\nb\\c');
  });

  it('escapes only control and non-ASCII code units when unicode escapes are on', () => {
    expect(converter.convertToJavaString('a\u0001~\u007f')).toBe('a\\u0001~\\u007F');
  });

  it('applies the region and character validation hooks', () => {
    const validating = new ValidatingConverter();
    expect(validating.convertFromJavaString('axb\\tcxd', true)).toBe('ab\tcd');
    expect(validating.convertFromJavaString('a\\u0078b', true)).toBe('ab');
  });

  it('exposes isHexSequence to subclasses', () => {
    class Probe extends JavaStringConverter {
      probe(input: string): boolean {
        return this.isHexSequence(input, 0, 2);
      }
    }
    expect(new Probe().probe('0f')).toBe(true);
    expect(new Probe().probe('0g')).toBe(false);
  });

  it('toHex masks to one nibble', () => {
    expect(converter.toHex(0x1a)).toBe(code('A'));
  });
});
