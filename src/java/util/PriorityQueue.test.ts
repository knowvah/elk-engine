// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PriorityQueue } from './PriorityQueue.js';

const VECTORS_URL = new URL('../../../test/golden/refs/java/collections.json', import.meta.url);
const EXPECTED_SCRIPTS = 231;
const COLLECTION_CTOR = 'PriorityQueue(Collection)';
const EXPECTED_COLLECTION_SCRIPTS = 55;

interface Elem {
  readonly id: number;
  readonly key: number;
}
interface Step {
  readonly op: string;
  readonly args: readonly Elem[];
  readonly result?: unknown;
  readonly order: readonly Elem[];
}
interface Script {
  readonly name: string;
  readonly init: { readonly ctor: string; readonly capacity?: number };
  readonly steps: readonly Step[];
}

const scripts = (JSON.parse(readFileSync(VECTORS_URL, 'utf8')) as { priorityQueue: Script[] })
  .priorityQueue;

const byKey = (a: Elem, b: Elem): number => a.key - b.key;

/**
 * ELK only calls `new PriorityQueue<>(comparator)` (CoffmanGrahamLayerer:110,152;
 * BoxLayoutProvider:550; StressMajorization:143), so the Collection constructor
 * is not ported and its scripts are not replayed.
 */
const usesCollectionCtor = (s: Script): boolean => s.init.ctor === COLLECTION_CTOR;

function apply(q: PriorityQueue<Elem>, step: Step, pool: Map<number, Elem>): unknown {
  const args = step.args.map((a) => pool.get(a.id) ?? (pool.set(a.id, a), a));
  switch (step.op) {
    case 'size':
      return q.size();
    case 'add':
      return q.add(args[0]!);
    case 'offer':
      return q.offer(args[0]!);
    case 'addAll':
      return q.addAll(args);
    case 'poll':
      return q.poll();
    case 'peek':
      return q.peek();
    case 'remove':
      return q.remove(args[0]!);
    case 'isEmpty':
      return q.isEmpty();
    case 'clear':
      q.clear();
      return undefined;
    default:
      throw new Error(`unknown op ${step.op}`);
  }
}

describe('PriorityQueue JVM vectors', () => {
  it('has the frozen script count', () => {
    expect(scripts.length).toBe(EXPECTED_SCRIPTS);
    expect(scripts.filter(usesCollectionCtor).length).toBe(EXPECTED_COLLECTION_SCRIPTS);
  });

  it('replays every comparator-constructor script step by step', () => {
    const replayed = scripts.filter((s) => !usesCollectionCtor(s));
    expect(replayed.length).toBe(EXPECTED_SCRIPTS - EXPECTED_COLLECTION_SCRIPTS);
    for (const script of replayed) {
      const q = new PriorityQueue<Elem>(byKey, script.init.capacity);
      const pool = new Map<number, Elem>();
      script.steps.forEach((step, i) => {
        const where = `${script.name}#${i} ${step.op}`;
        const got = apply(q, step, pool);
        expect(got, where).toEqual(step.result ?? undefined);
        expect(
          q.toArray().map((e) => e.id),
          where,
        ).toEqual(step.order.map((e) => e.id));
      });
    }
  });
});

describe('PriorityQueue API', () => {
  it('polls and peeks undefined when empty', () => {
    const q = new PriorityQueue<number>((a, b) => a - b);
    expect(q.poll()).toBeUndefined();
    expect(q.peek()).toBeUndefined();
    expect(q.isEmpty()).toBe(true);
  });

  it('removes by reference equality only', () => {
    const q = new PriorityQueue<Elem>(byKey);
    q.add({ id: 1, key: 1 });
    expect(q.remove({ id: 1, key: 1 })).toBe(false);
    expect(q.size()).toBe(1);
  });

  it('iterates in array order and addAll of nothing returns false', () => {
    const q = new PriorityQueue<number>((a, b) => a - b);
    expect(q.addAll([])).toBe(false);
    q.addAll([3, 1, 2]);
    expect([...q]).toEqual([1, 3, 2]);
  });

  it('rejects a capacity below 1', () => {
    expect(() => new PriorityQueue<number>((a, b) => a - b, 0)).toThrow(RangeError);
  });
});
