<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: LinkedList equality audit and header

## Context

`src/java/util/LinkedList.ts` is an array-backed stand-in for `java.util.LinkedList`. `remove(e)` (line 85),
`contains` (106) and `indexOf` (110) compare with `===`; the header (lines 6-8) claims Java `equals` is identity for
every ELK element. False for `KVector` (`../elk/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:117-124`),
and `KVectorChain extends LinkedList<KVector>` (`src/core/math/KVectorChain.ts:47`). One known caller relies on value
equality and is already handled: `HypernodesProcessor.ts:24-35` (`removeEqual`, Java `HypernodesProcessor.java:178`,
documented in `docs/architecture/alg-layered-pipeline.md:106`). The KVector sets in `PolylineEdgeRouter.ts:194` and
`BaseRoutingDirectionStrategy.ts:44` are value-hashed `JavaHashSet`s, not `LinkedList`s. See `.agent-notes/linkedlist-int32-cleanup-planning.md`.

## Read-set

`src/java/util/LinkedList.ts`, `src/core/math/KVectorChain.ts`, `src/core/math/KVector.ts` (its `equals`),
`src/alg/layered/intermediate/HypernodesProcessor.ts:20-40`, `docs/translation-rules.md` (AD-10 rows), decisions D1-D3.
Java under `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.{core,alg.*,graph*}/src` (in-scope bundles only, per CLAUDE.md).

## Write-set

`src/java/util/LinkedList.ts` (header doc only), and for each `differs` row: the caller's file and its colocated
`.test.ts`. The orchestrator writes `plans/linkedlist-int32-cleanup/audit.md` from the returned rows.

## Steps

1. Confirm D1's element-type list: for every distinct `LinkedList<X>` in `src/` (non-test) and each generic
   `LinkedList<T>`/`<V>` instantiation site, find the Java class of `X` and whether it (or a superclass) overrides
   `equals`. Record the list in `audit.md` § Types.
2. Enumerate the calls (D1): from the Java side, every `contains`/`indexOf`/`lastIndexOf`/`remove(Object)`/
   `removeAll`/`retainAll`/`containsAll`/`equals`/`hashCode` and `Objects.equals` whose receiver or argument is a
   list of a value-equal type; from the TS side, every `.contains(`/`.indexOf(`/`.remove(` on a `LinkedList` or
   `KVectorChain` receiver (`rg` + LSP hover/find-references; no TS compiler API in TS 7). Also check every
   `remove(` on a `LinkedList<number>` against Java's overload (`remove(int)` vs `remove(Object)`). Record the commands.
3. Give each call a verdict (D2) with Java and TS cites.
4. For a `differs` row: diagnosis mode. Find an input that reaches the site, run it through the oracle
   (`uptime` ≤ 12, `nice -n 10`), write the failing test with the oracle's value, then fix per D3. If no reaching
   input exists, the row is `unreachable-differs` with the guard cited.
5. Rewrite the header: `===` comparison; which element types are value-equal in Java (`KVector`, boxed numbers,
   sets), that callers needing Java's `equals` compare explicitly (cite `HypernodesProcessor.removeEqual`), and a link
   to `plans/linkedlist-int32-cleanup/audit.md`. Keep the Javadoc `@see`.

## Interface contracts

Returns to the orchestrator: `audit.md` rows `| # | Java file:line | TS file:line | element type | method | verdict |
reason |`, the Types table, the enumeration commands, and any `differs` diagnosis artifact.

## Acceptance criteria

- Given every `LinkedList` equality call in `src/` (non-test), when `audit.md` is read, then each has a verdict and a
  Java and TS cite, and the enumeration commands are recorded.
- Given a `differs` row, when T1 ends, then a test with an oracle-derived expected value fails before the fix and
  passes after it, or a `needs-ruling` issue names the row.
- Given `LinkedList.ts`, when its header is read, then it no longer claims identity equality for every ELK element and
  names the value-equal types.
- Given the full suite and `test/golden/refs/`, when T1 is committed, then no existing test result or ref changes.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
