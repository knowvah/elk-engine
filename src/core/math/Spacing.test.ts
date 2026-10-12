// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalArgumentException } from '../../java/lang/IllegalArgumentException.js';
import { longBitsToDouble } from '../../java/lang/JavaDouble.js';
import { ElkMargin } from './ElkMargin.js';
import { ElkPadding } from './ElkPadding.js';
import type { Spacing } from './Spacing.js';

const NUMBER_FORMAT_PREFIX = 'The given string contains parts that cannot be parsed as numbers.';

/** The four sides in the order `[top, right, bottom, left]`. */
function sides(s: Spacing): number[] {
  return [s.top, s.right, s.bottom, s.left];
}

/** Runs the action and returns the message of the error it throws ('no error' if none). */
function messageOf(action: () => void): string {
  try {
    action();
  } catch (e) {
    return (e as Error).message;
  }
  return 'no error';
}

/** The behavior shared by every concrete {@link Spacing}, run once per subclass. */
interface SpacingFlavor {
  readonly name: string;
  /** Calls the constructor of the subclass with the given arguments (all Java overloads). */
  readonly create: (...args: ReadonlyArray<number | Spacing>) => Spacing;
  readonly isInstance: (s: Spacing) => boolean;
}

const FLAVORS: SpacingFlavor[] = [
  {
    name: 'ElkMargin',
    create: (...args) => Reflect.construct(ElkMargin, args) as ElkMargin,
    isInstance: (s) => s instanceof ElkMargin,
  },
  {
    name: 'ElkPadding',
    create: (...args) => Reflect.construct(ElkPadding, args) as ElkPadding,
    isInstance: (s) => s instanceof ElkPadding,
  },
];

describe.each(FLAVORS)('$name', ({ create, isInstance }) => {
  describe('constructors', () => {
    it('defaults every side to 0.0', () => {
      expect(sides(create())).toEqual([0, 0, 0, 0]);
    });

    it('uses one value for every side', () => {
      expect(sides(create(7))).toEqual([7, 7, 7, 7]);
    });

    it('takes leftRight then topBottom', () => {
      // (leftRight, topBottom) -> super(topBottom, leftRight, topBottom, leftRight)
      const s = create(1, 2);
      expect(s.left).toBe(1);
      expect(s.right).toBe(1);
      expect(s.top).toBe(2);
      expect(s.bottom).toBe(2);
    });

    it('takes top, right, bottom, left', () => {
      const s = create(1, 2, 3, 4);
      expect([s.top, s.right, s.bottom, s.left]).toEqual([1, 2, 3, 4]);
    });

    it('copies another instance of its own class', () => {
      const original = create(1, 2, 3, 4);
      const copy = create(original);
      expect(copy).not.toBe(original);
      expect(sides(copy)).toEqual([1, 2, 3, 4]);
      copy.top = 99;
      expect(original.top).toBe(1);
    });
  });

  describe('clone', () => {
    it('returns an equal, distinct instance of the concrete class', () => {
      const original = create(1, 2, 3, 4);
      const clone = original.clone();
      expect(clone).not.toBe(original);
      expect(isInstance(clone)).toBe(true);
      expect(clone.equals(original)).toBe(true);
      expect(sides(clone)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('setters and getters', () => {
    it('set(Spacing) copies all four sides', () => {
      const s = create();
      s.set(create(1, 2, 3, 4));
      expect(sides(s)).toEqual([1, 2, 3, 4]);
    });

    it('set(top, right, bottom, left) assigns by position', () => {
      const s = create();
      s.set(10, 20, 30, 40);
      expect(s.top).toBe(10);
      expect(s.right).toBe(20);
      expect(s.bottom).toBe(30);
      expect(s.left).toBe(40);
    });

    it('has a getter and setter per side', () => {
      const s = create();
      s.setTop(1);
      s.setRight(2);
      s.setBottom(3);
      s.setLeft(4);
      expect([s.getTop(), s.getRight(), s.getBottom(), s.getLeft()]).toEqual([1, 2, 3, 4]);
      expect(sides(s)).toEqual([1, 2, 3, 4]);
    });

    it('setLeftRight and setTopBottom set both sides of the dimension', () => {
      const s = create();
      s.setLeftRight(5);
      expect([s.left, s.right, s.top, s.bottom]).toEqual([5, 5, 0, 0]);
      s.setTopBottom(6);
      expect([s.left, s.right, s.top, s.bottom]).toEqual([5, 5, 6, 6]);
    });

    it('getHorizontal is left + right, getVertical is top + bottom', () => {
      const s = create(1, 2, 3, 4);
      expect(s.getHorizontal()).toBe(6);
      expect(s.getVertical()).toBe(4);
    });
  });

  describe('equals', () => {
    it('compares the four sides with ==', () => {
      expect(create(1, 2, 3, 4).equals(create(1, 2, 3, 4))).toBe(true);
      expect(create(1, 2, 3, 4).equals(create(9, 2, 3, 4))).toBe(false);
      expect(create(1, 2, 3, 4).equals(create(1, 9, 3, 4))).toBe(false);
      expect(create(1, 2, 3, 4).equals(create(1, 2, 9, 4))).toBe(false);
      expect(create(1, 2, 3, 4).equals(create(1, 2, 3, 9))).toBe(false);
      expect(create(0).equals(create(-0))).toBe(true);
    });

    it('is false for a non-Spacing', () => {
      expect(create().equals({ top: 0, right: 0, bottom: 0, left: 0 })).toBe(false);
      expect(create().equals(undefined)).toBe(false);
    });
  });

  describe('hashCode', () => {
    it('is 0 when every hash has an empty low half', () => {
      // Double.hashCode of 1.0, 2.0, 3.0, 4.0 = 0x3ff00000, 0x40000000, 0x40080000, 0x40100000:
      // each has low 16 bits 0, so (h << 16) = 0 and (h & 0xffff) = 0.
      expect(create(1, 2, 3, 4).hashCode()).toBe(0);
    });

    it('combines (left << 16 | bottom & 0xffff) ^ (right << 16 | top & 0xffff)', () => {
      // Doubles whose bits are tiny integers have Double.hashCode == the bits:
      // top 1, right 2, bottom 3, left 4 -> code1 = 4 << 16 | 3 = 0x40003, code2 = 2 << 16 | 1 = 0x20001,
      // code1 ^ code2 = 0x60002 = 393218.
      const s = create(longBitsToDouble(1n), longBitsToDouble(2n), longBitsToDouble(3n), longBitsToDouble(4n));
      expect(s.hashCode()).toBe(393218);
    });

    it('wraps to a negative int and masks the low half', () => {
      // top bits 0x1ffff (& 0xffff = 0xffff), right 0x8000 (<< 16 = 0x80000000 as int),
      // bottom 0x10003 (& 0xffff = 3), left 0x12345 (<< 16 = 0x23450000):
      // code1 = 0x23450003, code2 = 0x8000ffff, code1 ^ code2 = 0xa345fffc = -1555693572.
      const s = create(
        longBitsToDouble(0x1ffffn),
        longBitsToDouble(0x8000n),
        longBitsToDouble(0x10003n),
        longBitsToDouble(0x12345n),
      );
      expect(s.hashCode()).toBe(-1555693572);
    });
  });

  describe('toString', () => {
    it('renders top, left, bottom, right with Java double text', () => {
      expect(create(1, 2, 3, 4).toString()).toBe('[top=1.0,left=4.0,bottom=3.0,right=2.0]');
      expect(create(0.5, 1e7, -0, 3).toString()).toBe('[top=0.5,left=3.0,bottom=-0.0,right=1.0E7]');
    });
  });

  describe('parse', () => {
    it('reads the toString format', () => {
      const s = create();
      s.parse('[top=1,left=2,bottom=3,right=4]');
      expect(s.top).toBe(1);
      expect(s.left).toBe(2);
      expect(s.bottom).toBe(3);
      expect(s.right).toBe(4);
    });

    it('round-trips toString', () => {
      const s = create();
      s.parse(create(1.5, 2, 3, 4.25).toString());
      expect(sides(s)).toEqual([1.5, 2, 3, 4.25]);
    });

    it('accepts ; as separator, spaces and quotes around, and ignores unknown keys', () => {
      const s = create();
      s.parse(' "( top = 1 ; foo=9 , right=2.5 )" ');
      expect(sides(s)).toEqual([1, 2.5, 0, 0]);
    });

    it('does nothing for an empty or delimiter-only string', () => {
      const s = create(1, 2, 3, 4);
      s.parse('');
      s.parse(' "" ');
      s.parse(' ([{ ');
      expect(sides(s)).toEqual([1, 2, 3, 4]);
    });

    it('rejects tokens that are not key=value pairs', () => {
      const message = 'Expecting a list of key-value pairs.';
      expect(messageOf(() => create().parse('top'))).toBe(message);
      expect(messageOf(() => create().parse('top=1=2'))).toBe(message);
      // empty token between two commas -> [""] -> length 1
      expect(messageOf(() => create().parse('top=1,,left=2'))).toBe(message);
      // Java "top=".split("=") drops the trailing empty string -> ["top"] -> length 1
      expect(messageOf(() => create().parse('top='))).toBe(message);
    });

    it('wraps a NumberFormatException, keeping sides parsed before it', () => {
      const s = create();
      expect(() => s.parse('top=x')).toThrow(IllegalArgumentException);
      expect(messageOf(() => s.parse('top=x'))).toBe(
        `${NUMBER_FORMAT_PREFIX}NumberFormatException: For input string: "x"`,
      );
      const t = create();
      expect(messageOf(() => t.parse('top=1,left=y'))).toBe(
        `${NUMBER_FORMAT_PREFIX}NumberFormatException: For input string: "y"`,
      );
      expect(t.top).toBe(1);
      expect(t.left).toBe(0);
    });
  });

  describe('copy and add', () => {
    it('copy takes the sides of the other and returns this', () => {
      const s = create(1, 2, 3, 4);
      expect(s.copy(create(5, 6, 7, 8))).toBe(s);
      expect(sides(s)).toEqual([5, 6, 7, 8]);
    });

    it('add sums side by side and returns this', () => {
      const s = create(1, 2, 3, 4);
      const other = create(10, 20, 30, 40);
      expect(s.add(other)).toBe(s);
      expect(sides(s)).toEqual([11, 22, 33, 44]);
      expect(sides(other)).toEqual([10, 20, 30, 40]);
    });
  });
});

describe('Spacing across subclasses', () => {
  it('an ElkMargin equals an ElkPadding with the same sides (Java instanceof Spacing)', () => {
    expect(new ElkMargin(1, 2, 3, 4).equals(new ElkPadding(1, 2, 3, 4))).toBe(true);
  });

  it('parses a margin string with the stated field values', () => {
    const margin = new ElkMargin();
    margin.parse('[top=1,left=2,bottom=3,right=4]');
    expect([margin.top, margin.left, margin.bottom, margin.right]).toEqual([1, 2, 3, 4]);
    expect(() => margin.parse('top=x')).toThrow(IllegalArgumentException);
  });
});
