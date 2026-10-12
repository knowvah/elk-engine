<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — EMF runtime: EList family, EcoreEMap, BasicEObjectImpl, EcoreUtil, ECollections

**Agent:** typescript-pro · **Commit:** `feat(emf): add the minimal emf list, map and eobject runtime`

## Context
The ElkGraph impl classes are EMF-generated; their behaviour lives in EMF's lists and
`BasicEObjectImpl`. D1 puts a minimal port under `src/emf/`, mirroring EMF class names. EMF is
EPL-2.0, so its source **may be read** (the `.source` jars in the p2 cache); port only the
D2/D4 surface. `graph.json` (T2) is the proof; this task's own tests encode the same semantics
from the EMF source so the implementation is red-then-green before T9's replay.

## Task
TDD. Create, each with `@see org.eclipse.emf.<package>.<Class>`:
- `src/emf/common/util/EList.ts` (interface), `BasicEList.ts` (array-backed, `isUnique()` hook,
  `addUnique`, `move`, `listIterator` via T1's cursor), `ECollections.ts` (`sort(list, comparator)`
  exactly as EMF: sort a copy, then `move` elements into place).
- `src/emf/ecore/EObject.ts`, `InternalEObject.ts` (interfaces), `EClass.ts` (`{ getName() }`),
  `src/emf/ecore/impl/BasicEObjectImpl.ts` (container pointer + feature id, `eContainer`,
  `eInternalContainer`, `eContainerFeatureID`, `eBasicSetContainer`, `eBasicRemoveFromContainer`,
  abstract `eInverseAdd`/`eInverseRemove`/`eBasicRemoveFromContainerFeature`/`eClass`/
  `eContainmentFeatures()` (ordered list of the containment EList getters), `eContents()` built
  from them, `eAllContents()` pre-order, `toString()` = `eClass().getName()`-based FQ name per D10).
- `src/emf/ecore/util/EObjectEList.ts` (unique, owner + feature id), `EObjectWithInverseEList.ts`
  (+ `ManyInverse` subclass as in EMF: inverse add/remove on the other end),
  `EObjectContainmentWithInverseEList.ts` (containment: remove from old container, set container,
  recursive-containment check), `EcoreEMap.ts` (entry list + id-keyed index; `put`, `get`,
  `removeKey`, `containsKey`, `clear`, `size`, `isEmpty`, `entries()` in insertion order, `map()`
  view satisfying `PropertyMap`-shaped reads; keys compared by a `HashStrategy` supplied by the
  owner), `EcoreUtil.ts` (`isAncestor`, `getRootContainer`).
- Fitness rule: admit `src/emf` (imports only `src/java`, `src/guava`; importable by every bundle
  and `src/index.ts`; `src/java`/`src/guava` must not import it), with the same self-check style
  as the `src/guava boundary (java-foundations M6)` block.

## Write-set
`src/emf/common/util/{EList,BasicEList,ECollections}.ts`, `src/emf/ecore/{EObject,InternalEObject,EClass}.ts`,
`src/emf/ecore/impl/BasicEObjectImpl.ts`,
`src/emf/ecore/util/{EObjectEList,EObjectWithInverseEList,EObjectContainmentWithInverseEList,EcoreEMap,EcoreUtil}.ts`,
colocated `.test.ts` for each class file, `test/architecture/module-boundaries.fitness.test.ts`.

## Read-set
- `../decisions.md#d1--emf-runtime`, `#d2--elist-and-emap-contract`, `#d4--eobject-surface`, `#d10--divergences-accepted-up-front`
- EMF 2.37 source (p2 cache `org.eclipse.emf.common.source`, `org.eclipse.emf.ecore.source`):
  `AbstractEList.java` (`add`, `isUnique`, `set`, `move`), `BasicEList.java`, `ECollections.java`
  (`sort`), `BasicEMap.java` (`put`, `removeKey`, entry order), `EcoreEMap.java`,
  `EObjectEList.java`, `EObjectWithInverseEList.java` (incl. `ManyInverse`),
  `EObjectContainmentWithInverseEList.java`, `EObjectContainmentEList.java` (`inverseAdd`,
  `inverseRemove`), `BasicEObjectImpl.java` (`eBasicSetContainer`, `eBasicRemoveFromContainer`,
  `eAllContents`), `EcoreUtil.java` (`isAncestor`, `getRootContainer`)
- `test/architecture/module-boundaries.fitness.test.ts:40-100,330-360` (boundary rules + M6 block)
- `src/java/util/{ListIterator,HashStrategy}.ts`, `src/java/lang/IllegalArgumentException.ts`

## Interface contract (consumed by T8, T9)
```ts
export interface EList<E> extends Iterable<E> { get(i): E; set(i, e): E; add(e): boolean; addAt(i, e): void;
  addAll(c: Iterable<E>): boolean; remove(e): boolean; removeAt(i): E; clear(): void; size(): number;
  isEmpty(): boolean; contains(e): boolean; indexOf(e): number; iterator(): Iterator<E>;
  listIterator(i?: number): ListIterator<E>; move(newPosition: number, oldPosition: number): E;
  moveElement(newPosition: number, e: E): void; toArray(): E[] }
export abstract class BasicEObjectImpl implements InternalEObject {
  eContainer(): InternalEObject | null; eInternalContainer(): InternalEObject | null; eContainerFeatureID(): number;
  eBasicSetContainer(c: InternalEObject | null, featureID: number): void; eBasicRemoveFromContainer(): void;
  abstract eInverseAdd(other: InternalEObject, featureID: number): void;     // Java: NotificationChain msgs dropped (D4)
  abstract eInverseRemove(other: InternalEObject, featureID: number): void;
  abstract eBasicRemoveFromContainerFeature(): void;
  abstract eClass(): EClass; protected abstract eContainmentFeatures(): ReadonlyArray<EList<InternalEObject>>;
  eContents(): EList<InternalEObject>; eAllContents(): IterableIterator<InternalEObject>; toString(): string }
export class EObjectContainmentWithInverseEList<E extends InternalEObject> extends EObjectWithInverseEList<E> {
  constructor(owner: InternalEObject, featureID: number, inverseFeatureID: number) }
export class ManyInverse<E extends InternalEObject> extends EObjectWithInverseEList<E> { same ctor }
export class EcoreEMap<K, V> { constructor(strategy: HashStrategy<K>); put(k, v): V | undefined;
  get(k): V | undefined; removeKey(k): V | undefined; containsKey(k): boolean; clear(): void; size(): number;
  isEmpty(): boolean; entries(): IterableIterator<[K, V]>; [Symbol.iterator](); map(): { get; containsKey; isEmpty; size; [Symbol.iterator] } }
export const EcoreUtil = { isAncestor(ancestor, eObject): boolean; getRootContainer(eObject): InternalEObject }
export const ECollections = { sort<E>(list: EList<E>, comparator: (a: E, b: E) => number): void }
```
Java `add(int, E)`/`remove(int)`/`move(int, E)` are suffixed (`addAt`, `removeAt`, `moveElement`).
Containment lists call the owner's `eInverseAdd`/`eInverseRemove` with the inverse feature id,
and the element's `eBasicSetContainer`; `EObjectWithInverseEList` calls the element's
`eInverseAdd`/`eInverseRemove` with the inverse feature id — same method boundaries as EMF so T8/T9
switch bodies port 1:1.

## Acceptance criteria
- Given two owners with an inverse pair, when `a.list.add(b)`, then `b.opposite` contains `a`;
  when removed, then both are empty; `add` again returns `true` once and `false` the second time.
- Given a containment list, when an element contained elsewhere is added, then it leaves the old
  container, `eContainer()` is the new owner and `eContainerFeatureID()` the new feature id.
- Given an element, when added to a descendant's containment list, then
  `IllegalArgumentException('Recursive containment not allowed for ' + toString())`.
- Given a unique list `[a]`, when `add(a)`, then `false` and size 1; when `set(0, b)` with `b`
  present, then `IllegalArgumentException` with EMF's message.
- Given `ECollections.sort` on a containment list, then order changes and no element changes container.
- Given `src/emf` importing `src/core`, then the fitness test fails naming both files;
  `src/graph → src/emf` passes; `src/java → src/emf` fails.

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10; files ≤ 500 lines. Each file cites the
EMF class ported and the EPL-2.0 origin.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No notifications, adapters, proxies, `eGet/eSet/eIsSet`, `Resource`. No graph classes here
(`src/graph/**` is T8/T9). Do not edit `bundle-deps.json`.
