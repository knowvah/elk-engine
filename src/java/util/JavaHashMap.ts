// SPDX-License-Identifier: EPL-2.0
import { IllegalArgumentException } from '../lang/IllegalArgumentException.js';
import type { HashStrategy } from './HashStrategy.js';

const DEFAULT_CAPACITY = 16;
const DEFAULT_LOAD_FACTOR = 0.75;
const MAXIMUM_CAPACITY = 1 << 30;
const TREEIFY_THRESHOLD = 8;
const UNTREEIFY_THRESHOLD = 6;
const MIN_TREEIFY_CAPACITY = 64;
const SPREAD_SHIFT = 16;
/** Direction for equal-hash keys without a comparison order; see the class comment. */
const TIE_BREAK = -1;

type Side = 0 | 1;
const LEFT: Side = 0;
const RIGHT: Side = 1;
const OTHER: readonly [Side, Side] = [RIGHT, LEFT];

/** A mapping; the tree links are used only while its bin is treeified. */
class Entry<K, V> {
  parent: Entry<K, V> | null = null;
  child: [Entry<K, V> | null, Entry<K, V> | null] = [null, null];
  red = false;

  constructor(
    public hash: number,
    public key: K,
    public value: V,
  ) {}
}

/** One bucket: the entries in bin (iteration) order, plus the red-black root while treeified. */
class Bin<K, V> {
  constructor(
    public entries: Array<Entry<K, V>> = [],
    public root: Entry<K, V> | null = null,
  ) {}
}

type Table<K, V> = Array<Bin<K, V> | null>;

function spread(h: number): number {
  return h ^ (h >>> SPREAD_SHIFT);
}

function tableSizeFor(capacity: number): number {
  if (capacity <= 1) {
    return 1;
  }
  return Math.min(MAXIMUM_CAPACITY, 2 ** (32 - Math.clz32(capacity - 1)));
}

function sideOf<K, V>(parent: Entry<K, V>, node: Entry<K, V>): Side {
  return parent.child[LEFT] === node ? LEFT : RIGHT;
}

function isRed<K, V>(node: Entry<K, V> | null): boolean {
  return node !== null && node.red;
}

/** Lifts `p.child[side]` (never null at call sites) into `p`'s place; returns the root. */
function rotate<K, V>(root: Entry<K, V>, p: Entry<K, V>, side: Side): Entry<K, V> {
  const r = p.child[side] as Entry<K, V>;
  const inner = r.child[OTHER[side]];
  p.child[side] = inner;
  if (inner !== null) {
    inner.parent = p;
  }
  const pp = p.parent;
  r.parent = pp;
  r.child[OTHER[side]] = p;
  p.parent = r;
  if (pp === null) {
    return r;
  }
  pp.child[sideOf(pp, p)] = r;
  return root;
}

/** Red-black insertion fix-up (CLR) for the freshly attached leaf `x0`; returns the root. */
function balanceInsertion<K, V>(root: Entry<K, V>, x0: Entry<K, V>): Entry<K, V> {
  let x = x0;
  x.red = true;
  for (;;) {
    const xp = x.parent;
    if (xp === null) {
      x.red = false;
      return x;
    }
    const xpp = xp.parent;
    if (!xp.red || xpp === null) {
      return root;
    }
    const side = sideOf(xpp, xp);
    const uncle = xpp.child[OTHER[side]];
    if (uncle === null || !uncle.red) {
      let newRoot = root;
      let top = xp;
      if (x === xp.child[OTHER[side]]) {
        newRoot = rotate(newRoot, xp, OTHER[side]);
        top = x;
      }
      top.red = false;
      xpp.red = true;
      return rotate(newRoot, xpp, side);
    }
    uncle.red = false;
    xp.red = false;
    xpp.red = true;
    x = xpp;
  }
}

/** One CLR deletion fix-up step for a black non-root `x`; returns `[root, next x]`. */
function deletionStep<K, V>(root: Entry<K, V>, x: Entry<K, V>, xp: Entry<K, V>): [Entry<K, V>, Entry<K, V>] {
  const side = sideOf(xp, x);
  const far = OTHER[side];
  let newRoot = root;
  // Equal black heights: a black non-root node always has a sibling.
  let sib = xp.child[far] as Entry<K, V>;
  if (sib.red) {
    sib.red = false;
    xp.red = true;
    newRoot = rotate(newRoot, xp, far);
    sib = xp.child[far] as Entry<K, V>;
  }
  if (!isRed(sib.child[side]) && !isRed(sib.child[far])) {
    sib.red = true;
    return [newRoot, xp];
  }
  if (!isRed(sib.child[far])) {
    (sib.child[side] as Entry<K, V>).red = false;
    sib.red = true;
    newRoot = rotate(newRoot, sib, side);
    sib = xp.child[far] as Entry<K, V>;
  }
  sib.red = xp.red;
  // The far nephew is red here: it was, or the rotation above made the old sibling it.
  (sib.child[far] as Entry<K, V>).red = false;
  xp.red = false;
  newRoot = rotate(newRoot, xp, far);
  return [newRoot, newRoot];
}

/** Red-black deletion fix-up (CLR) starting at `x0`; returns the root. */
function balanceDeletion<K, V>(root: Entry<K, V>, x0: Entry<K, V>): Entry<K, V> {
  let x = x0;
  let current = root;
  while (x !== current) {
    if (x.red) {
      x.red = false;
      return current;
    }
    [current, x] = deletionStep(current, x, x.parent as Entry<K, V>);
  }
  return current;
}

/**
 * Deletes `p0` (already out of `bin.entries`) from a tree whose root has two children and whose
 * root's left child has a left child (smaller trees are untreeified instead), so the deleted node
 * always has a parent. A node with two children takes its in-order successor's mapping (CLR) and
 * the successor's node is deleted; the successor keeps its bin position.
 */
function deleteFromTree<K, V>(bin: Bin<K, V>, root: Entry<K, V>, p0: Entry<K, V>): Entry<K, V> {
  let p = p0;
  if (p.child[LEFT] !== null && p.child[RIGHT] !== null) {
    let s = p.child[RIGHT];
    for (let l = s.child[LEFT]; l !== null; l = l.child[LEFT]) {
      s = l;
    }
    [p.hash, p.key, p.value] = [s.hash, s.key, s.value];
    bin.entries[bin.entries.indexOf(s)] = p;
    p = s;
  }
  const replacement = p.child[LEFT] ?? p.child[RIGHT] ?? p;
  const pp = p.parent as Entry<K, V>;
  if (replacement !== p) {
    replacement.parent = pp;
    pp.child[sideOf(pp, p)] = replacement;
  }
  const balanced = p.red ? root : balanceDeletion(root, replacement);
  const parent = p.parent as Entry<K, V>;
  if (replacement === p) {
    parent.child[sideOf(parent, p)] = null;
  }
  return balanced;
}

function moveRootToFront<K, V>(bin: Bin<K, V>, root: Entry<K, V>): void {
  bin.root = root;
  const at = bin.entries.indexOf(root);
  if (at > 0) {
    bin.entries.splice(at, 1);
    bin.entries.unshift(root);
  }
}

/**
 * `HashMap` with JVM iteration order (decision M1). The Javadoc fixes only capacity 16, load
 * factor 0.75, doubling once size exceeds `capacity × loadFactor`, and that colliding Comparable
 * keys may use comparison order. All else is **observed behavior** of the JDK 21 vectors in
 * `test/golden/refs/java/collections.json` (scripts named below), not taken from any JDK source:
 * - index `(h ^ (h >>> 16)) & (capacity - 1)` (`seq-string-seq`, `seq-integer-neg`); iteration in
 *   index order, then bin order; new keys append to their bin; `clear` keeps the capacity.
 * - the table is allocated on first insertion at the requested capacity rounded up to a power of
 *   two (`ctor-cap-*`, `ctor-caplf-*`). Threshold `(int) (capacity × (float) loadFactor)`, but
 *   doubled instead when growing from a capacity ≥ 16 (*).
 * - resize splits each bin into its `hash & oldCapacity` halves, keeping bin order (`seq-*`).
 * - a list bin reaching 9 entries becomes a CLR red-black tree at capacity ≥ 64, else the table
 *   doubles (`seq-string-collide`, `seq-double-int`); tree order is hash, then `compare`. A new
 *   tree entry goes right after its tree parent and the root moves to the bin front after every
 *   change (`collider-ColliderComparable-*`). Removal untreeifies when the root lacks a child or
 *   its left child lacks a left child, else deletes via the in-order successor. A resize half of
 *   ≤ 6 (*) entries untreeifies; a larger one is re-treeified unless the other half is empty.
 * - `putAll` into an unallocated map presizes to `ceil(n / loadFactor)` (`ctor-copy-*-1-*`,
 *   `putall-empty-*-12`); into an allocated one it doubles while `n` exceeds the threshold (*).
 *
 * (*) Not discriminated by `collections.json`; observed with JDK 21 probe scripts in T11 (load
 * factors 0.6/0.9/1.3, split halves 5–9, `putAll` of 40/100 shuffled colliders into a 1-entry map)
 * that are not yet committed, see `plans/java-foundations/decision-journal.md`.
 *
 * The JVM breaks ties between equal-hash keys without comparison order by identity hash: the
 * identical scripts `collider-ColliderPlain-same-fwd-cap64` and `-same-rev-cap64` diverge at step
 * 9. That order is not reproducible; this model sends the new key left.
 *
 * @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html
 */
export class JavaHashMap<K, V> implements Iterable<[K, V]> {
  private table: Table<K, V> | null = null;
  private count = 0;
  private threshold: number;
  private readonly loadFactor: number;

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#%3Cinit%3E(int,float) */
  constructor(
    private readonly strategy: HashStrategy<K>,
    initialCapacity?: number,
    loadFactor: number = DEFAULT_LOAD_FACTOR,
  ) {
    if (initialCapacity !== undefined && initialCapacity < 0) {
      throw new IllegalArgumentException(`Illegal initial capacity: ${initialCapacity}`);
    }
    if (!(loadFactor > 0)) {
      throw new IllegalArgumentException(`Illegal load factor: ${loadFactor}`);
    }
    this.loadFactor = Math.fround(loadFactor);
    this.threshold = initialCapacity === undefined ? 0 : tableSizeFor(initialCapacity);
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#%3Cinit%3E(java.util.Map) */
  static copyOf<K, V>(strategy: HashStrategy<K>, source: Iterable<[K, V]>): JavaHashMap<K, V> {
    const map = new JavaHashMap<K, V>(strategy);
    map.putAll(source);
    return map;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#size() */
  get size(): number {
    return this.count;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#isEmpty() */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#get(java.lang.Object) */
  get(k: K): V | undefined {
    return this.find(k)?.value;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#containsKey(java.lang.Object) */
  containsKey(k: K): boolean {
    return this.find(k) !== undefined;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#put(K,V) */
  put(k: K, v: V): V | undefined {
    const hash = spread(this.strategy.hash(k));
    const table = this.table ?? this.resize();
    const index = hash & (table.length - 1);
    const bin = table[index] ?? new Bin<K, V>();
    table[index] = bin;
    const existing = this.search(bin, hash, k);
    if (existing !== undefined) {
      const old = existing.value;
      existing.value = v;
      return old;
    }
    const created = new Entry(hash, k, v);
    if (bin.root === null) {
      bin.entries.push(created);
      if (bin.entries.length > TREEIFY_THRESHOLD) {
        this.treeifyBin(table, bin);
      }
    } else {
      this.putTree(bin, bin.root, created);
    }
    if (++this.count > this.threshold) {
      this.resize();
    }
    return undefined;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#remove(java.lang.Object) */
  remove(k: K): V | undefined {
    const hash = spread(this.strategy.hash(k));
    const bin = this.binFor(hash);
    const e = bin === null ? undefined : this.search(bin, hash, k);
    if (bin === null || e === undefined) {
      return undefined;
    }
    const value = e.value;
    bin.entries.splice(bin.entries.indexOf(e), 1);
    if (bin.root !== null) {
      this.removeTreeEntry(bin, bin.root, e);
    }
    this.count--;
    return value;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#clear() */
  clear(): void {
    this.table?.fill(null);
    this.count = 0;
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#putAll(java.util.Map) */
  putAll(source: Iterable<[K, V]>): void {
    const entries = [...source];
    const s = entries.length;
    if (s > 0 && this.table === null) {
      const t = Math.ceil(s / this.loadFactor);
      if (t > this.threshold) {
        this.threshold = tableSizeFor(t);
      }
    } else {
      while (s > this.threshold) {
        this.resize();
      }
    }
    for (const [k, v] of entries) {
      this.put(k, v);
    }
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#keySet() */
  *keys(): IterableIterator<K> {
    for (const e of this.walk()) {
      yield e.key;
    }
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#values() */
  *values(): IterableIterator<V> {
    for (const e of this.walk()) {
      yield e.value;
    }
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#entrySet() */
  *entries(): IterableIterator<[K, V]> {
    for (const e of this.walk()) {
      yield [e.key, e.value];
    }
  }

  /** @see https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html#entrySet() */
  [Symbol.iterator](): Iterator<[K, V]> {
    return this.entries();
  }

  private *walk(): IterableIterator<Entry<K, V>> {
    for (const bin of this.table ?? []) {
      yield* bin?.entries ?? [];
    }
  }

  private binFor(hash: number): Bin<K, V> | null {
    const table = this.table;
    return table === null ? null : (table[hash & (table.length - 1)] ?? null);
  }

  /** `Objects.equals` on keys, gated by equal spread hashes. */
  private search(bin: Bin<K, V>, hash: number, k: K): Entry<K, V> | undefined {
    return bin.entries.find((e) => e.hash === hash && (e.key === k || this.strategy.equals(k, e.key)));
  }

  private find(k: K): Entry<K, V> | undefined {
    const hash = spread(this.strategy.hash(k));
    const bin = this.binFor(hash);
    return bin === null ? undefined : this.search(bin, hash, k);
  }

  /** Tree order: hash, then `compare` for Comparable keys, then the tie-break. */
  private direction(x: Entry<K, V>, p: Entry<K, V>): number {
    if (x.hash !== p.hash) {
      return x.hash < p.hash ? -1 : 1;
    }
    const c = this.strategy.compare?.(x.key, p.key) ?? 0;
    return c === 0 ? TIE_BREAK : c;
  }

  /** Links `x` as a leaf below `root` in tree order. */
  private attach(root: Entry<K, V>, x: Entry<K, V>): void {
    let p = root;
    for (;;) {
      const side = this.direction(x, p) <= 0 ? LEFT : RIGHT;
      const c = p.child[side];
      if (c === null) {
        p.child[side] = x;
        x.parent = p;
        return;
      }
      p = c;
    }
  }

  /** Builds the tree by inserting the entries in bin order. */
  private treeify(bin: Bin<K, V>): void {
    const [head, ...rest] = bin.entries as [Entry<K, V>, ...Array<Entry<K, V>>];
    let root = head;
    for (const x of bin.entries) {
      x.parent = null;
      x.child = [null, null];
    }
    head.red = false;
    for (const x of rest) {
      this.attach(root, x);
      root = balanceInsertion(root, x);
    }
    moveRootToFront(bin, root);
  }

  private treeifyBin(table: Table<K, V>, bin: Bin<K, V>): void {
    if (table.length < MIN_TREEIFY_CAPACITY) {
      this.resize();
    } else {
      this.treeify(bin);
    }
  }

  /** New tree entry: a leaf in tree order, placed in the bin right after its tree parent. */
  private putTree(bin: Bin<K, V>, root: Entry<K, V>, x: Entry<K, V>): void {
    this.attach(root, x);
    bin.entries.splice(bin.entries.indexOf(x.parent as Entry<K, V>) + 1, 0, x);
    moveRootToFront(bin, balanceInsertion(root, x));
  }

  /** `p` is already out of `bin.entries`; `root` is the tree before the removal. */
  private removeTreeEntry(bin: Bin<K, V>, root: Entry<K, V>, p: Entry<K, V>): void {
    const rl = root.child[LEFT];
    if (bin.entries.length === 0 || root.child[RIGHT] === null || rl === null || rl.child[LEFT] === null) {
      bin.root = null;
      return;
    }
    moveRootToFront(bin, deleteFromTree(bin, root, p));
  }

  /** One resize half: a list if small, else a tree, rebuilt only if the bin really split. */
  private half(bin: Bin<K, V>, entries: Array<Entry<K, V>>, split: boolean): Bin<K, V> | null {
    if (entries.length === 0) {
      return null;
    }
    if (bin.root === null || entries.length <= UNTREEIFY_THRESHOLD) {
      return new Bin(entries);
    }
    const result = new Bin(entries, bin.root);
    if (split) {
      this.treeify(result);
    }
    return result;
  }

  private resize(): Table<K, V> {
    const old = this.table ?? [];
    const bit = old.length;
    const newCap = bit > 0 ? bit * 2 : this.threshold || DEFAULT_CAPACITY;
    const computed = Math.trunc(Math.fround(newCap * this.loadFactor));
    this.threshold = bit >= DEFAULT_CAPACITY ? this.threshold * 2 : computed;
    const table: Table<K, V> = new Array<Bin<K, V> | null>(newCap).fill(null);
    old.forEach((bin, j) => {
      if (bin !== null) {
        const lo = bin.entries.filter((e) => (e.hash & bit) === 0);
        const hi = bin.entries.filter((e) => (e.hash & bit) !== 0);
        table[j] = this.half(bin, lo, hi.length > 0);
        table[j + bit] = this.half(bin, hi, lo.length > 0);
      }
    });
    this.table = table;
    return table;
  }
}
