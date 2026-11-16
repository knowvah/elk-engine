// SPDX-License-Identifier: EPL-2.0
// The two helpers of CompactionContext.ts that stand for Java library behaviour (mission 8c, T14b): the expectations are the Javadoc of
// `java.util.List.remove(Object)` and the dereference `block.getStack().updateDimension()` of Compaction.java.
import { describe, expect, it } from 'vitest';
import { Block } from '../util/Block.js';
import { BlockStack } from '../util/BlockStack.js';
import { RectRow } from '../util/RectRow.js';
import { removeRowObject, stackOf } from './CompactionContext.js';

const SPACING = 5;

describe('CompactionContext helpers', () => {
  it('removeRowObject removes the first occurrence by identity and keeps the order of the others', () => {
    const first = new RectRow(0, SPACING);
    const second = new RectRow(10, SPACING);
    const third = new RectRow(20, SPACING);
    const rows = [first, second, third];
    removeRowObject(rows, second);
    expect(rows).toEqual([first, third]);
    expect(rows[0]).toBe(first);
    expect(rows[1]).toBe(third);
  });

  it('removeRowObject leaves the list unchanged for an element that is not in it (List.remove(Object) returns false)', () => {
    const first = new RectRow(0, SPACING);
    const second = new RectRow(10, SPACING);
    const absent = new RectRow(20, SPACING);
    const rows = [first, second];
    removeRowObject(rows, absent);
    expect(rows.length).toBe(2);
    expect(rows[0]).toBe(first);
    expect(rows[1]).toBe(second);
  });

  it('stackOf returns the stack a block was added to', () => {
    const row = new RectRow(0, SPACING);
    const block = new Block(0, 0, row, SPACING);
    const stack = new BlockStack(0, 0, SPACING);
    stack.addBlock(block);
    expect(stackOf(block)).toBe(stack);
  });

  it('stackOf throws the NullPointerException of block.getStack().updateDimension() as a TypeError for a block without a stack', () => {
    const block = new Block(0, 0, new RectRow(0, SPACING), SPACING);
    expect(() => stackOf(block)).toThrow(TypeError);
    expect(() => stackOf(block)).toThrow(/Block\.getStack\(\)" is null$/);
  });
});
