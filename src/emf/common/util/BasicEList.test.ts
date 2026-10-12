// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { ArrayIndexOutOfBoundsException } from '../../../java/lang/ArrayIndexOutOfBoundsException.js';
import { IllegalArgumentException } from '../../../java/lang/IllegalArgumentException.js';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { IndexOutOfBoundsException } from '../../../java/lang/IndexOutOfBoundsException.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { BasicEList } from './BasicEList.js';
import { BasicIndexOutOfBoundsException } from './BasicIndexOutOfBoundsException.js';

const NO_DUPLICATES = "The 'no duplicates' constraint is violated";
const NULL_DATA = 'Cannot load from object array because "this.data" is null';

class UniqueEList<E> extends BasicEList<E> {
  protected override isUnique(): boolean {
    return true;
  }
}

class NoNullEList<E> extends BasicEList<E | null> {
  protected override canContainNull(): boolean {
    return false;
  }
}

function listOf<E>(...elements: E[]): BasicEList<E> {
  const list = new BasicEList<E>();
  for (const e of elements) {
    list.add(e);
  }
  return list;
}

function uniqueOf(...elements: string[]): UniqueEList<string> {
  const list = new UniqueEList<string>();
  for (const e of elements) {
    list.add(e);
  }
  return list;
}

function thrown(f: () => unknown): Error {
  try {
    f();
  } catch (e) {
    return e as Error;
  }
  throw new Error('expected a throw');
}

describe('BasicEList queries', () => {
  it('starts empty', () => {
    const list = new BasicEList<string>();
    expect(list.size()).toBe(0);
    expect(list.isEmpty()).toBe(true);
    expect(list.toArray()).toEqual([]);
  });

  it('gets, finds and copies elements by identity', () => {
    const a = { n: 1 };
    const b = { n: 1 };
    const list = listOf(a, b);
    expect(list.get(1)).toBe(b);
    expect(list.contains(b)).toBe(true);
    expect(list.contains({ n: 1 })).toBe(false);
    expect(list.indexOf(b)).toBe(1);
    expect(list.indexOf({ n: 1 })).toBe(-1);
    const copy = list.toArray();
    copy.pop();
    expect(list.size()).toBe(2);
    expect(list.isEmpty()).toBe(false);
  });

  it('throws BasicIndexOutOfBoundsException from get past the size or with no data', () => {
    const list = listOf('a', 'b');
    expect(() => list.get(2)).toThrow(new BasicIndexOutOfBoundsException(2, 2));
    expect(thrown(() => new BasicEList<string>().get(-1)).message).toBe('index=-1, size=0');
  });

  it('reaches the backing array for a negative get', () => {
    const e = thrown(() => listOf('a').get(-1));
    expect(e).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(e.message).toBe('Index -1 out of bounds for length 4');
  });
});

describe('BasicEList add', () => {
  it('appends duplicates when not unique', () => {
    const list = listOf('a');
    expect(list.add('a')).toBe(true);
    expect(list.toArray()).toEqual(['a', 'a']);
  });

  it('returns false for a present element when unique', () => {
    const list = uniqueOf('a', 'b');
    expect(list.add('a')).toBe(false);
    expect(list.toArray()).toEqual(['a', 'b']);
  });

  it('inserts at an index', () => {
    const list = listOf('a', 'c');
    list.addAt(1, 'b');
    list.addAt(3, 'd');
    list.addAt(0, 'z');
    expect(list.toArray()).toEqual(['z', 'a', 'b', 'c', 'd']);
  });

  it('rejects an index past the size and a duplicate when unique, without changing state', () => {
    const list = uniqueOf('a', 'b');
    const past = thrown(() => list.addAt(5, 'c'));
    expect(past).toBeInstanceOf(BasicIndexOutOfBoundsException);
    expect(past.message).toBe('index=5, size=2');
    expect(() => list.addAt(0, 'b')).toThrow(new IllegalArgumentException(NO_DUPLICATES));
    expect(list.toArray()).toEqual(['a', 'b']);
  });

  it('rejects null when the list cannot contain null', () => {
    const list = new NoNullEList<string>();
    expect(() => list.add(null)).toThrow(new IllegalArgumentException("The 'no null' constraint is violated"));
    expect(list.size()).toBe(0);
    expect(list.add('a')).toBe(true);
  });
});

describe('BasicEList addAll', () => {
  it('appends every element when not unique', () => {
    const list = listOf('a');
    expect(list.addAll(['a', 'b', 'b'])).toBe(true);
    expect(list.toArray()).toEqual(['a', 'a', 'b', 'b']);
  });

  it('skips present and repeated elements when unique', () => {
    const list = uniqueOf('a');
    expect(list.addAll(['b', 'a', 'b', 'c'])).toBe(true);
    expect(list.toArray()).toEqual(['a', 'b', 'c']);
    expect(list.addAll(['a', 'c'])).toBe(false);
    expect(list.size()).toBe(3);
  });

  it('accepts any iterable', () => {
    const list = new BasicEList<number>();
    expect(list.addAll(new Set([3, 1]))).toBe(true);
    expect(list.toArray()).toEqual([3, 1]);
  });
});

describe('BasicEList set', () => {
  it('replaces and returns the old element', () => {
    const list = listOf('a', 'b');
    expect(list.set(1, 'c')).toBe('b');
    expect(list.toArray()).toEqual(['a', 'c']);
  });

  it('rejects an index at or past the size', () => {
    const e = thrown(() => listOf('a', 'b').set(9, 'c'));
    expect(e).toBeInstanceOf(BasicIndexOutOfBoundsException);
    expect(e.message).toBe('index=9, size=2');
  });

  it('allows the same element at its own index but not elsewhere when unique', () => {
    const list = uniqueOf('a', 'b');
    expect(() => list.set(0, 'b')).toThrow(new IllegalArgumentException(NO_DUPLICATES));
    expect(list.set(0, 'a')).toBe('a');
    expect(list.toArray()).toEqual(['a', 'b']);
  });

  it('reaches the backing array for a negative index', () => {
    const e = thrown(() => listOf('a').set(-1, 'x'));
    expect(e).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(e.message).toBe('Index -1 out of bounds for length 4');
    expect(thrown(() => new BasicEList<string>().set(-1, 'x'))).toEqual(new TypeError(NULL_DATA));
  });

  it('writes past the size but inside the capacity through setUnique', () => {
    const list = listOf('a', 'b');
    expect(list.setUnique(3, 'y')).toBeNull();
    expect(list.toArray()).toEqual(['a', 'b']);
    const e = thrown(() => list.setUnique(7, 'x'));
    expect(e).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(e.message).toBe('Index 7 out of bounds for length 4');
  });
});

describe('BasicEList remove', () => {
  it('removes by index and by element', () => {
    const list = listOf('a', 'b', 'c');
    expect(list.removeAt(0)).toBe('a');
    expect(list.remove('c')).toBe(true);
    expect(list.remove('c')).toBe(false);
    expect(list.toArray()).toEqual(['b']);
  });

  it('rejects an index at or past the size', () => {
    const e = thrown(() => listOf('a', 'b').removeAt(7));
    expect(e).toBeInstanceOf(BasicIndexOutOfBoundsException);
    expect(e.message).toBe('index=7, size=2');
  });

  it('reaches the backing array for a negative index', () => {
    const list = listOf('a');
    const e = thrown(() => list.removeAt(-1));
    expect(e).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(e.message).toBe('Index -1 out of bounds for length 4');
    expect(list.toArray()).toEqual(['a']);
  });

  it('dereferences the cleared backing array for a negative index', () => {
    const list = listOf('a');
    list.clear();
    expect(thrown(() => list.removeAt(-1))).toEqual(new TypeError(NULL_DATA));
    expect(thrown(() => new BasicEList<string>().removeAt(-1))).toEqual(new TypeError(NULL_DATA));
  });
});

describe('BasicEList clear', () => {
  it('empties the list and drops the backing array', () => {
    const list = listOf('a', 'b', 'c', 'd', 'e');
    list.clear();
    expect(list.size()).toBe(0);
    expect(list.toArray()).toEqual([]);
    expect(thrown(() => list.addAt(-1, 'x')).message).toBe(
      'arraycopy: source index -1 out of bounds for object array[4]',
    );
  });
});

describe('BasicEList move', () => {
  it('moves forwards, backwards and in place', () => {
    const list = listOf('n1', 'n2', 'n3', 'n4');
    expect(list.move(0, 3)).toBe('n4');
    expect(list.toArray()).toEqual(['n4', 'n1', 'n2', 'n3']);
    expect(list.move(3, 0)).toBe('n4');
    expect(list.toArray()).toEqual(['n1', 'n2', 'n3', 'n4']);
    expect(list.move(1, 1)).toBe('n2');
    expect(list.toArray()).toEqual(['n1', 'n2', 'n3', 'n4']);
  });

  it('rejects target and source indices at or past the size with IndexOutOfBoundsException', () => {
    const list = listOf('n1', 'n2', 'n3', 'n4');
    const target = thrown(() => list.move(4, 0));
    expect(target.constructor).toBe(IndexOutOfBoundsException);
    expect(target.message).toBe('targetIndex=4, size=4');
    expect(thrown(() => list.move(0, 4)).message).toBe('sourceIndex=4, size=4');
    expect(list.toArray()).toEqual(['n1', 'n2', 'n3', 'n4']);
  });

  it('reaches the backing array for negative indices', () => {
    const list = listOf('n1', 'n2', 'n3', 'n4');
    const source = thrown(() => list.move(0, -1));
    expect(source).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(source.message).toBe('Index -1 out of bounds for length 4');
    expect(thrown(() => list.move(-1, 2)).message).toBe('arraycopy: source index -1 out of bounds for object array[4]');
    expect(list.toArray()).toEqual(['n1', 'n2', 'n3', 'n4']);
    expect(thrown(() => new BasicEList<string>().move(-1, -1))).toEqual(new TypeError(NULL_DATA));
  });

  it('moves an element to a position', () => {
    const list = listOf('n1', 'n2', 'n3');
    list.moveElement(2, 'n1');
    expect(list.toArray()).toEqual(['n2', 'n3', 'n1']);
    expect(thrown(() => list.moveElement(5, 'n2')).message).toBe('targetIndex=5, size=3');
    const absent = thrown(() => list.moveElement(0, 'n9'));
    expect(absent).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(absent.message).toBe('Index -1 out of bounds for length 4');
  });
});

describe('BasicEList capacity (EMF grow)', () => {
  it('grows 0 -> 4 -> 10 -> 19 and reports the capacity in arraycopy failures', () => {
    const list = new BasicEList<number>();
    expect(thrown(() => list.addAt(-1, 0)).message).toBe(
      'arraycopy: source index -1 out of bounds for object array[4]',
    );
    list.addAll([1, 2, 3, 4]);
    const grown = thrown(() => list.addAt(-2, 0));
    expect(grown).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(grown.message).toBe('arraycopy: source index -2 out of bounds for object array[10]');
    expect(list.toArray()).toEqual([1, 2, 3, 4]);
    list.addAll([5, 6, 7, 8, 9, 10, 11]);
    expect(thrown(() => list.addAt(-1, 0)).message).toBe(
      'arraycopy: source index -1 out of bounds for object array[19]',
    );
  });

  it('grows straight to the minimum when the formula falls short', () => {
    const list = new BasicEList<number>();
    list.addAll([1, 2, 3, 4, 5, 6, 7]);
    expect(thrown(() => list.removeAt(-1)).message).toBe('Index -1 out of bounds for length 7');
  });

  it('reports a negative arraycopy length for addUniqueAt past the size', () => {
    const list = listOf('a', 'b');
    const e = thrown(() => list.addUniqueAt(3, 'x'));
    expect(e).toBeInstanceOf(ArrayIndexOutOfBoundsException);
    expect(e.message).toBe('arraycopy: length -1 is negative');
    expect(list.toArray()).toEqual(['a', 'b']);
  });
});

describe('BasicEList iteration', () => {
  it('iterates in order with for..of and iterator()', () => {
    const list = listOf('a', 'b', 'c');
    expect([...list]).toEqual(['a', 'b', 'c']);
    const it = list.iterator();
    expect(it.next()).toEqual({ done: false, value: 'a' });
  });

  it('sees elements appended during iteration', () => {
    const list = listOf(1, 2);
    const seen: number[] = [];
    for (const n of list) {
      seen.push(n);
      if (n === 1) {
        list.add(3);
      }
    }
    expect(seen).toEqual([1, 2, 3]);
  });
});

describe('BasicEList listIterator', () => {
  it('walks forwards and backwards', () => {
    const it = listOf('a', 'b').listIterator();
    expect(it.hasPrevious()).toBe(false);
    expect(it.next()).toBe('a');
    expect(it.nextIndex()).toBe(1);
    expect(it.previousIndex()).toBe(0);
    expect(it.next()).toBe('b');
    expect(it.hasNext()).toBe(false);
    expect(it.previous()).toBe('b');
    expect(it.hasPrevious()).toBe(true);
  });

  it('starts at an index and rejects one outside 0..size', () => {
    const list = listOf('a', 'b', 'c', 'd');
    expect(list.listIterator(2).next()).toBe('c');
    expect(list.listIterator(4).hasNext()).toBe(false);
    const e = thrown(() => list.listIterator(-1));
    expect(e).toBeInstanceOf(BasicIndexOutOfBoundsException);
    expect(e.message).toBe('index=-1, size=4');
    expect(thrown(() => list.listIterator(5)).message).toBe('index=5, size=4');
  });

  it('throws NoSuchElementException past either end, leaving the cursor where EMF leaves it', () => {
    const list = listOf('a');
    const it = list.listIterator(1);
    expect(() => it.next()).toThrow(NoSuchElementException);
    const back = list.listIterator();
    expect(() => back.previous()).toThrow(NoSuchElementException);
    expect(back.nextIndex()).toBe(-1);
    expect(back.hasPrevious()).toBe(true);
    expect(() => new BasicEList<string>().listIterator().previous()).toThrow(NoSuchElementException);
  });

  it('propagates errors that are not index errors', () => {
    class Broken extends BasicEList<string> {
      override get(): string {
        throw new TypeError('boom');
      }
    }
    const list = new Broken();
    list.add('a');
    expect(() => list.listIterator().next()).toThrow(new TypeError('boom'));
    expect(() => list.listIterator(1).previous()).toThrow(new TypeError('boom'));
  });

  it('removes, sets and adds through the list', () => {
    const list = listOf('a', 'b', 'c');
    const it = list.listIterator();
    it.next();
    it.remove();
    expect(list.toArray()).toEqual(['b', 'c']);
    expect(it.nextIndex()).toBe(0);
    it.next();
    it.set('B');
    it.add('x');
    expect(list.toArray()).toEqual(['B', 'x', 'c']);
    expect(it.nextIndex()).toBe(2);
    expect(it.previous()).toBe('x');
    it.remove();
    expect(it.nextIndex()).toBe(1);
    expect(list.toArray()).toEqual(['B', 'c']);
  });

  it('rejects remove and set without a current element', () => {
    const it = listOf('a').listIterator();
    expect(() => it.remove()).toThrow(IllegalStateException);
    expect(() => it.set('z')).toThrow(IllegalStateException);
    it.next();
    it.add('b');
    expect(() => it.remove()).toThrow(IllegalStateException);
  });

  it('advances the cursor even when add rejects a duplicate', () => {
    const list = uniqueOf('a', 'b');
    const it = list.listIterator();
    expect(() => it.add('b')).toThrow(new IllegalArgumentException(NO_DUPLICATES));
    expect(it.nextIndex()).toBe(1);
    expect(list.toArray()).toEqual(['a', 'b']);
  });
});

/** Records EMF's `did*` hook calls; `didClear` keeps the default (one `didRemove` per old element). */
class HookEList extends BasicEList<string> {
  readonly calls: string[] = [];

  protected override didAdd(index: number, newObject: string): void {
    this.calls.push(`add ${index} ${newObject}`);
  }

  protected override didRemove(index: number, oldObject: string): void {
    this.calls.push(`remove ${index} ${oldObject}`);
  }

  protected override didSet(index: number, newObject: string, oldObject: string): void {
    this.calls.push(`set ${index} ${newObject} ${oldObject}`);
  }

  protected override didMove(index: number, movedObject: string, oldIndex: number): void {
    this.calls.push(`move ${index} ${movedObject} ${oldIndex}`);
  }
}

describe('BasicEList did* hooks', () => {
  it('reports adds, sets, removes and moves with their indices', () => {
    const list = new HookEList();
    list.add('a');
    list.addAt(0, 'b');
    list.addAll(['c', 'd']);
    list.set(1, 'x');
    list.removeAt(0);
    list.move(2, 0);
    list.move(1, 1);
    expect(list.calls).toEqual(['add 0 a', 'add 0 b', 'add 2 c', 'add 3 d', 'set 1 x a', 'remove 0 b', 'move 2 x 0']);
    expect(list.toArray()).toEqual(['c', 'd', 'x']);
  });

  it('reports a clear as one didRemove per old element, and nothing for an empty list', () => {
    const list = new HookEList();
    list.clear();
    list.addAll(['a', 'b']);
    list.calls.length = 0;
    list.clear();
    expect(list.calls).toEqual(['remove 0 a', 'remove 1 b']);
  });
});
