<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12b — EMF resolving lists

**Agent:** typescript-pro · **Commit:** `feat(T12b): port the emf proxy-resolving lists`

## Context
D13, `batch-5/d13-plan.md` §1(b), §2: `ElkEdge.sources/targets` and `ElkConnectableShape.outgoingEdges/incomingEdges`
are `EObjectWithInverseResolvingEList.ManyInverse` in Java (`ElkEdgeImpl.java:195-209`); `get(i)` resolves a proxy via
`EcoreEList.resolve` (`EcoreEList.java:158-205`) and replaces the slot on success; `basicGet(i)` never resolves;
`hasProxies()` is true for resolving lists. The port's lists (`src/emf/common/util/BasicEList.ts` — line 21 says
proxies are not ported — `EObjectEList.ts`, `EObjectWithInverseEList.ts`) have no resolution.

## Task
1. `BasicEList`: `basicGet`, and the `resolve(index, object)` hook used by `get` (identity for non-resolving lists),
   exactly as `BasicEList.java`/`EcoreEList.java` structure them; update the class doc.
2. `EObjectEList`: `resolveProxy`, `resolve(index, object)` (`EcoreEList.java:158-205`, containment branch included if
   reachable, else documented), `hasProxies` false; `EObjectResolvingEList` (new file) with `hasProxies` true;
   `EObjectWithInverseEList.ts`: the resolving variants (`EObjectWithInverseResolvingEList` and its `ManyInverse`, in
   the file layout the existing `ManyInverse` export uses, or one class per file if that layout allows — follow
   AD-7 and the precedent at `EObjectWithInverseEList.ts:42-48`).
3. Iteration (`iterator`, `for…of`, `toArray`, `indexOf`, `contains`) must resolve exactly where EMF resolves (read
   `EcoreEList`/`DelegatingEcoreEList` iterator and `contains` source) and not elsewhere.
4. Tests from the EMF source: resolvable proxy replaced in place (and what notification-free inverse handling the
   source performs), unresolvable proxy left and returned (`get(0) === get(0)`), `basicGet` never resolves, duplicates
   (`link-repeated-reference`: `sources: ["a","a"]` resolves without error — the assign path runs no uniqueness check).
5. Benchmark: a test-local micro-benchmark of `getSources().get(i)` over a 10k-edge graph before/after (report numbers;
   no budget assertion beyond the suite's existing performance tests).

## Write-set
`src/emf/common/util/BasicEList.ts`, `src/emf/ecore/util/{EObjectEList,EObjectWithInverseEList,EObjectResolvingEList}.ts`
(+ colocated tests; a new file for the resolving inverse list if AD-7 requires).

## Interface contracts (outputs)
Resolving list classes with Java names; `basicGet`. Consumed by T12d (`resolveLazyCrossReferences` uses `basicGet` +
`setUnique`), T12e.

## Acceptance criteria
- Given a resolving list holding a resolvable proxy, when `get(i)` runs, then the target is returned and stored.
- Given an unresolvable proxy, when `get(i)` runs twice, then the same proxy object both times.
- Given the full suite and the 4b vectors, when run, then unchanged.
