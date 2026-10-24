// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { IllegalStateException } from '../../../java/lang/IllegalStateException.js';
import { UnsupportedOperationException } from '../../../java/lang/UnsupportedOperationException.js';
import { NoSuchElementException } from '../../../java/util/NoSuchElementException.js';
import { AbstractTreeIterator } from './AbstractTreeIterator.js';

interface Node {
  readonly id: string;
  readonly kids: Node[];
}

function n(id: string, ...kids: Node[]): Node {
  return { id, kids };
}

class NodeIterator extends AbstractTreeIterator<Node> {
  protected override getChildren(object: unknown): Iterator<Node> {
    return (object as Node).kids[Symbol.iterator]();
  }
}

// a -> (b -> (d, e), c -> (f))
const TREE = n('a', n('b', n('d'), n('e')), n('c', n('f')));

function ids(it: Iterable<Node>): string[] {
  return [...it].map((x) => x.id);
}

describe('AbstractTreeIterator', () => {
  it('iterates pre-order including the root by default', () => {
    expect(ids(new NodeIterator(TREE))).toEqual(['a', 'b', 'd', 'e', 'c', 'f']);
  });

  it('excludes the root when includeRoot is false', () => {
    expect(ids(new NodeIterator(TREE, false))).toEqual(['b', 'd', 'e', 'c', 'f']);
  });

  it('yields only the root for a leaf root and nothing without it', () => {
    expect(ids(new NodeIterator(n('x')))).toEqual(['x']);
    expect(ids(new NodeIterator(n('x'), false))).toEqual([]);
  });

  it('reports hasNext before and after exhaustion, with and without root', () => {
    const withRoot = new NodeIterator(n('x'));
    expect(withRoot.hasNext()).toBe(true);
    expect(withRoot.nextElement().id).toBe('x');
    expect(withRoot.hasNext()).toBe(false);
    const noRoot = new NodeIterator(n('x', n('y')), false);
    expect(noRoot.hasNext()).toBe(true);
    expect(noRoot.hasNext()).toBe(true);
    expect(noRoot.nextElement().id).toBe('y');
    expect(noRoot.hasNext()).toBe(false);
  });

  it('throws NoSuchElementException from nextElement when exhausted', () => {
    const it = new NodeIterator(n('x'), false);
    expect(() => it.nextElement()).toThrow(NoSuchElementException);
    const done = new NodeIterator(n('x'));
    done.nextElement();
    expect(() => done.nextElement()).toThrow(NoSuchElementException);
  });

  it('skips the subtree of the last returned element on prune', () => {
    const it = new NodeIterator(TREE, false);
    const seen: string[] = [];
    while (it.hasNext()) {
      const node = it.nextElement();
      seen.push(node.id);
      if (node.id === 'b') {
        it.prune();
      }
    }
    expect(seen).toEqual(['b', 'c', 'f']);
  });

  it('prunes the root children when the root is included', () => {
    const it = new NodeIterator(TREE);
    expect(it.nextElement().id).toBe('a');
    it.prune();
    expect(it.hasNext()).toBe(false);
  });

  it('prunes only once and ignores prune after a leaf', () => {
    const it = new NodeIterator(TREE);
    it.nextElement();
    it.nextElement();
    it.prune();
    it.prune();
    expect(ids(it)).toEqual(['c', 'f']);
    const leaf = new NodeIterator(n('a', n('b'), n('c')));
    leaf.nextElement();
    leaf.nextElement();
    leaf.prune();
    expect(ids(leaf)).toEqual(['c']);
  });

  it('pops exhausted parents when pruning the last child', () => {
    const it = new NodeIterator(n('a', n('b', n('c', n('d')))), false);
    expect(it.nextElement().id).toBe('b');
    expect(it.nextElement().id).toBe('c');
    it.prune();
    expect(it.hasNext()).toBe(false);
  });

  it('throws IllegalStateException when removing before any next', () => {
    expect(() => new NodeIterator(TREE).remove()).toThrow(IllegalStateException);
  });

  it('delegates remove to the iterator that produced the element', () => {
    const root = n('a', n('b'), n('c'));
    class Removing extends AbstractTreeIterator<Node> {
      protected override getChildren(object: unknown): Iterator<Node> {
        const kids = (object as Node).kids;
        let i = 0;
        let last = -1;
        return {
          hasNext: (): boolean => i < kids.length,
          next: (): IteratorResult<Node> => {
            last = i++;
            return { done: false, value: kids[last] as Node };
          },
          remove: (): void => {
            kids.splice(last, 1);
            i--;
          },
        } as Iterator<Node>;
      }
    }
    const it = new Removing(root, false);
    it.nextElement();
    it.remove();
    expect(root.kids.map((k) => k.id)).toEqual(['c']);
  });

  it('throws UnsupportedOperationException when the child iterator cannot remove', () => {
    const it = new NodeIterator(TREE, false);
    it.nextElement();
    expect(() => it.remove()).toThrow(UnsupportedOperationException);
  });
});
