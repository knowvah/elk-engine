<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: linkedlist-int32-cleanup (issue #47)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D5 were auto-confirmed at
planning (unattended run, 2026-11-19); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. Audit scope: element types whose Java `equals` is not identity

The audit covers every call of `contains`, `indexOf`, `remove(e)` on a `LinkedList` shim instance (including
`KVectorChain`), **and** any place the port compares two such lists or puts one in a hashed collection, where the
Java element type (or the list) has a non-identity `equals`. Planning found these candidate element types among the
port's `LinkedList<…>` instantiations; T1 confirms each against its Java class:

- `KVector` (`KVector.java:117`, `x == x && y == y`: `NaN` never equal, `-0.0 == 0.0`); `KVectorChain` is a
  `LinkedList<KVector>`, so Java `KVectorChain.remove(Object)`/`contains`/`indexOf` use it.
- Boxed numbers (`LinkedList<number>` ×19, `LinkedList<Double>` ×1): Java `Double.equals`/`Integer.equals` compare
  values with `Double.equals` semantics (`NaN` equals `NaN`, `-0.0` does not equal `0.0`), which `===` does not
  match. Also check the Java overload: `List<Integer>.remove(int index)` vs `remove(Object)`: the port's `removeAt` /
  `remove` must follow the overload javac picked.
- `Set<LNode>` elements (`LinkedList<Set<LNode>>` ×1): Java `AbstractSet.equals` is content equality.
- `string` is value-equal under `===` (no hazard). Every other element type found at planning (`TNode`, mrtree
  `TEdge`, `LNode`, `CGroup`, `NNode`, `TLabel`, `FEdge`, `BlockRow`, `ElkNode`, …) has no `equals` override in its
  Java class; T1 re-checks `HierarchyEdge`, `Group`, `ClassNode`, `BezierCurve`, `Postprocessable`, `LLabel[]`
  (arrays: identity) and the generic `LinkedList<T>`/`<V>` helpers by their instantiation sites.

The enumeration is driven from the **Java** side (every equality-method call on a receiver whose static type is a
`List`/`Collection` of those element types in an in-scope bundle) and cross-checked from the TS side (every
`.contains(`/`.indexOf(`/`.remove(` on a `LinkedList`-typed receiver). TypeScript 7 ships no JS compiler API, so the
TS side uses `rg`/ast-grep plus the LSP; record the commands in `audit.md`.

## D2. Verdicts

Each audited call gets one verdict:

- `same`: the arguments are always the identical object (e.g. an element just read from the same list), or the
  element type has identity `equals`. State why in one clause.
- `handled`: the port already compares by value at that site (e.g. `HypernodesProcessor.ts:24-35` `removeEqual`, or
  a `JavaHashSet` with `KVECTOR_STRATEGY` / `hashable<KVector>()` in `PolylineEdgeRouter.ts:194`,
  `BaseRoutingDirectionStrategy.ts:44`).
- `differs`: a reachable input makes `===` answer differently from Java `equals`. This is a defect; diagnosis mode
  applies (mechanism, origin `file:line`, causal chain, ruled out), and D3 fixes it.
- `unreachable-differs`: the answers differ only for a value the caller provably never passes (e.g. `NaN` coordinates
  where an upstream guard rejects them). Cite the guard.

## D3. Fix a `differs` caller at the call site, not in the shim

Follow the `HypernodesProcessor.removeEqual` precedent: compare with `KVector.equals` (or the type's ported `equals`)
at that call site. A test for the fix takes its expected value from the oracle on an input that reaches the site
(AD-13) before the fix is written. `LinkedList.ts` keeps `===`; its header names the value-equal element types and
points at the precedent.

## D4. Which `int` operations go through `Int32`

Convert an operation when all hold: (a) its Java operands are `int` (or `Integer` unboxed into `int` arithmetic),
(b) it is `+`, `-`, `*` or a compound `+=`/`-=` (JLS 15.26.2: `x += e` is `x = (int)(x + e)`), and (c) the result is
not provably bounded by one Java collection or array size. Keep bare (and list as `kept` in `int32-sites.md` only
when it is an accumulator): loop indices; `x++`/`+= 1` counters that count elements of one collection (a Java size is
an `int`, so it cannot exceed `Integer.MAX_VALUE`); sums whose Java accumulator is `double` (e.g.
`LayerSweepCrossingMinimizer.java:416` `double totalCrossings`, ported at `LayerSweepCrossingMinimizerCounting.ts:158`).

Scope: every Java `int` crossing-count or path-count accumulator in `src/alg/layered/intermediate/greedyswitch/`,
`src/alg/layered/p3order/` and `src/alg/layered/p3order/counting/`. The issue names `SwitchDecider`
(`SwitchDecider.java:138-153`), `LayerSweepTypeDecider` (`:76-136`, including `double allPaths = pathsToRandom +
pathsToHierarchical` and `(pathsToRandom - pathsToHierarchical)`, which are `int` operations widened afterwards) with
its `NodeInfo.transfer` (`:164-168`), and the thoroughness/crossing loops of `LayerSweepCrossingMinimizer`; planning
also found bare `+=` on Java `int` crossing counts in `BetweenLayerEdgeTwoNodeCrossingsCounter.java:213-220` and
`GreedyPortDistributor.java:110-118`. Keep Java's left-to-right association: `a + b + c` becomes
`Int32.add(Int32.add(a, b), c)`.

## D5. Tests for the `int` sites

TDD where a seam exists without new API: write a test that drives the site with `int` inputs near
`Integer.MAX_VALUE` (2147483647) and asserts the wrapped Java result, before converting. Expected values come from
JLS 15.18.2 (integer addition overflow wraps to the low 32 bits), and `Int32.add` is already proven by the `lang.json`
`i32` vectors; that is the Java-source basis AD-13 allows. `LayerSweepTypeDeciderNodeInfo.transfer` is such a seam.
Where reaching a site needs a graph with more than 2^31 crossings, add no test hook (YAGNI): mark the row
`converted (no seam)` and rely on the unchanged suite and goldens as the no-regression proof.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected options | Evidence |
| -------- | ------ | ---------------- | -------- |
| D1 scope | All `LinkedList` equality callers whose Java element type is value-equal | (a) `KVectorChain` only: misses boxed `Double`/`Integer` `NaN`/`-0.0` and the `remove(int)`/`remove(Object)` overload; (b) all Java lists incl. arrays: hundreds of sites, outside #47 (follow-up) | `KVector.java:117-124`; port has `LinkedList<number>` ×19, `<Double>` ×1, `<Set<LNode>>` ×1, `<KVector>` ×8 + `KVectorChain`; issue text names `indexOf`, `remove(Object)`, `contains` |
| D3 fix site | Call-site comparison, shim keeps `===` | (a) pluggable equality on `LinkedList` (like `JavaHashSet` strategies): touches every caller, no second user yet; (b) `KVectorChain` overrides `contains`/`indexOf`/`remove` with `KVector.equals`: faithful for chains, but changes behaviour at every chain caller at once and leaves `LinkedList<KVector>` and boxed numbers unfixed | Precedent `HypernodesProcessor.ts:24-35` and `docs/architecture/alg-layered-pipeline.md:106`; planning grep found the KVector-set sites already value-hashed (`PolylineEdgeRouter.ts:194`, `BaseRoutingDirectionStrategy.ts:44`); reversibility premium |
| D4 scope | `int` count accumulators in the three crossing-min directories | (a) only the three named classes: leaves `BetweenLayerEdgeTwoNodeCrossingsCounter`, `GreedyPortDistributor` inconsistent with the same rule; (b) repo-wide `int` audit: unbounded, unreviewable in one mission (follow-up) | Roadmap § Revision 2026-10-30 follow-up text; `translation-rules.md` § 1.1 "never bare `+` on ints that can exceed 2^31"; grep of `+=` in the Java of those directories |
| D5 tests | JLS-derived wrap tests at pure seams; no test hooks | (a) JVM vector rows: needs a recorder change, outside this mission; (b) no tests: violates TDD where a seam exists | AD-13 allows expected values from the Java source; `Int32.add` proven by `lang.json` `i32` |
