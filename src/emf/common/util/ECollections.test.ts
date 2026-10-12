// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { BasicEList } from './BasicEList.js';
import { ECollections } from './ECollections.js';

/** A unique list that records every `move(target, source)` call. */
class RecordingEList<E> extends BasicEList<E> {
  readonly moves: Array<[number, number]> = [];

  protected override isUnique(): boolean {
    return true;
  }

  override move(targetIndex: number, sourceIndex: number): E {
    this.moves.push([targetIndex, sourceIndex]);
    return super.move(targetIndex, sourceIndex);
  }
}

interface Item {
  readonly id: string;
  readonly key: number;
}

const descendingById = (a: Item, b: Item): number => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

function recordingOf(...items: Item[]): RecordingEList<Item> {
  const list = new RecordingEList<Item>();
  list.addAll(items);
  return list;
}

describe('ECollections.sort', () => {
  it('moves elements into comparator order, front to back', () => {
    const [n1, n2, n3, n4] = ['b', 'd', 'a', 'c'].map((id) => ({ id, key: 0 })) as [Item, Item, Item, Item];
    const list = recordingOf(n1, n2, n3, n4);
    ECollections.sort(list, descendingById);
    expect(list.toArray()).toEqual([n2, n4, n1, n3]);
    expect(list.moves).toEqual([
      [0, 1],
      [1, 3],
    ]);
  });

  it('makes no move when the list is already sorted', () => {
    const list = recordingOf({ id: 'b', key: 0 }, { id: 'a', key: 0 });
    ECollections.sort(list, descendingById);
    expect(list.moves).toEqual([]);
  });

  it('is stable for equal keys', () => {
    const items = [3, 1, 3, 1].map((key, i) => ({ id: `i${i}`, key }));
    const list = recordingOf(...items);
    ECollections.sort(list, (a, b) => a.key - b.key);
    expect(list.toArray().map((e) => e.id)).toEqual(['i1', 'i3', 'i0', 'i2']);
  });
});

describe('ECollections.indexOf', () => {
  it('finds an element by identity from an index, clamping a negative start to 0', () => {
    const a = { id: 'a', key: 0 };
    const b = { id: 'b', key: 0 };
    const list = recordingOf(a, b);
    expect(ECollections.indexOf(list, b, 0)).toBe(1);
    expect(ECollections.indexOf(list, a, 1)).toBe(-1);
    expect(ECollections.indexOf(list, a, -3)).toBe(0);
    expect(ECollections.indexOf(list, { id: 'a', key: 0 }, 0)).toBe(-1);
  });
});
