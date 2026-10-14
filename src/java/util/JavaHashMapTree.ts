// SPDX-License-Identifier: EPL-2.0

/**
 * The red-black tree bins of {@link JavaHashMap}: tree-node types and the CLR rotation, insertion
 * and deletion fix-ups. Split out of `JavaHashMap.ts` to keep it under the 500-line limit; internal
 * to `src/java/util`.
 */

type Side = 0 | 1;
export const LEFT: Side = 0;
export const RIGHT: Side = 1;
const OTHER: readonly [Side, Side] = [RIGHT, LEFT];

/** A mapping; the tree links are used only while its bin is treeified. */
export class Entry<K, V> {
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
export class Bin<K, V> {
  constructor(
    public entries: Array<Entry<K, V>> = [],
    public root: Entry<K, V> | null = null,
  ) {}
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

/** Insertion fix-up, black-uncle case: one or two rotations end the fix-up; returns the root. */
function rotateAtBlackUncle<K, V>(
  root: Entry<K, V>,
  x: Entry<K, V>,
  xp: Entry<K, V>,
  xpp: Entry<K, V>,
  side: Side,
): Entry<K, V> {
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

/** Red-black insertion fix-up (CLR) for the freshly attached leaf `x0`; returns the root. */
export function balanceInsertion<K, V>(root: Entry<K, V>, x0: Entry<K, V>): Entry<K, V> {
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
      return rotateAtBlackUncle(root, x, xp, xpp, side);
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
 * Moves the in-order successor's mapping (the leftmost node under `right`) into `p` (CLR); the
 * successor keeps its bin position. Returns the successor's node, which is deleted instead.
 */
function takeSuccessor<K, V>(bin: Bin<K, V>, p: Entry<K, V>, right: Entry<K, V>): Entry<K, V> {
  let s = right;
  for (let l = s.child[LEFT]; l !== null; l = l.child[LEFT]) {
    s = l;
  }
  [p.hash, p.key, p.value] = [s.hash, s.key, s.value];
  bin.entries[bin.entries.indexOf(s)] = p;
  return s;
}

/**
 * Deletes `p0` (already out of `bin.entries`) from a tree whose root has two children and whose
 * root's left child has a left child (smaller trees are untreeified instead), so the deleted node
 * always has a parent. A node with two children takes its in-order successor's mapping (CLR) and
 * the successor's node is deleted; the successor keeps its bin position.
 */
export function deleteFromTree<K, V>(bin: Bin<K, V>, root: Entry<K, V>, p0: Entry<K, V>): Entry<K, V> {
  const p = p0.child[LEFT] !== null && p0.child[RIGHT] !== null ? takeSuccessor(bin, p0, p0.child[RIGHT]) : p0;
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

export function moveRootToFront<K, V>(bin: Bin<K, V>, root: Entry<K, V>): void {
  bin.root = root;
  const at = bin.entries.indexOf(root);
  if (at > 0) {
    bin.entries.splice(at, 1);
    bin.entries.unshift(root);
  }
}
