<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Comments base: abstract interfaces (R5) and ElkGraph providers

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T13): port comment attachment interfaces and elk graph providers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). `comments/*` attaches comment boxes to the nodes they describe. Nothing in ELK calls it and it
has no Java tests (R1), so the tests here derive from the Java source; T19 adds the oracle scenarios (R6).
- This task lays the base that T15, T16 and T19 build on.
- T8's `Rectangle2D` is ready.

## Task
1. Port the interfaces:
   - `IDataProvider`, `IBoundsProvider`, `IMatcher`, `IFilter` and `IExplicitAttachmentProvider` become **abstract
     classes** with the Java names (R5). Abstract methods stay abstract and the default bodies are ported into the
     class.
   - `IDecider` has no defaults and stays a TS interface.
   - Generics as in Java: `IDataProvider<C, T>`, `IFilter<C>`, and so on.
2. **`IDataProvider.cached()`** (`J/comments/IDataProvider.java:95-158`) returns an anonymous subclass. Port its
   quirks verbatim:
   - `provideTargetsFor` returns the uncached collection on the first call and the multimap's collection afterwards.
   - An empty result never becomes a cache key, so it is recomputed on every call.
   - `commentTargetsCache` is a `HashMultimap` with identity-hashed keys and values. Use a `Map<C, Set<T>>` in
     insertion order (P2, AD-10) and journal the site. The value order is visible to `CommentAttacher.findMatch`.
3. **`IBoundsProvider.cached()`** (`:94-140`): two identity-keyed `HashMap` caches, lookups only. Use JS `Map`s and
   journal them.
4. **`ElkGraphDataProvider`** (`J/comments/ElkGraphDataProvider.java`):
   - `Objects.requireNonNull` with Java's message, thrown as a `TypeError` (NPE precedent:
     `ElkGraphUtil.requireNonNull`);
   - comments are children with `CoreOptions.COMMENT_BOX`, targets are the others;
   - sub-hierarchies are children that have children;
   - `attach` is `ElkGraphUtil.createSimpleEdge(comment, target)`;
   - keep the stream order (`getChildren()` order).
5. **`ElkGraphBoundsProvider`**: returns `new Rectangle2D.Double(node.getX(), node.getY(), width, height)` for both
   comment and target (`:29`, `:34`).
6. Write unit tests derived from the Java source for every default method and both cache wrappers, including the two
   `provideTargetsFor` quirks.

## Write-set
`src/core/comments/{IDataProvider,IBoundsProvider,IMatcher,IDecider,IFilter,IExplicitAttachmentProvider,ElkGraphDataProvider,ElkGraphBoundsProvider}.ts`
and colocated tests.

## Read-set
- The eight Java files in `J/comments/`.
- T8's `src/java/awt/geom/Rectangle2D.ts`.
- `src/graph/util/ElkGraphUtil.ts` (`createSimpleEdge`), `src/core/options/CoreOptions.ts` (`COMMENT_BOX`).
- `docs/translation-rules.md` §6.2.
- `decisions.md#r5--default-methods`.

## Interface contracts (outputs, consumed by T15, T16, T19)
- `abstract class IDataProvider<C, T>`: `provideComments()`, `provideTargets()`, `provideTargetsFor(c)` (default),
  `provideSubHierarchies()`, `attach(c, t)`, `cached()` (default).
- `abstract class IBoundsProvider<C, T>`: `boundsForComment(c)`, `boundsForTarget(t)` (each returns
  `Rectangle2D.Double`), plus the defaults `preprocess(dp, includeHierarchy)`, `cleanup()`, `cached()`.
- `abstract class IMatcher<C, T>`: `raw(c, t)`, `normalized(c, t)`, plus the defaults `preprocess` and `cleanup`.
- `abstract class IFilter<C>`: `eligibleForAttachment(c)`, plus the defaults `preprocess` and `cleanup`.
- `abstract class IExplicitAttachmentProvider<C, T>`: `findExplicitAttachment(c)`, plus the defaults `preprocess` and
  `cleanup`.
- `interface IDecider<T>`: `makeAttachmentDecision(results: Map<T, Map<MatcherClass, number>>): T | null`, where
  `MatcherClass` is an abstract constructor of `IMatcher` (Java `Class` key).

## Acceptance criteria
- Given a graph with two comment boxes and three nodes, one of them hierarchical, when `ElkGraphDataProvider` is
  queried, then comments, targets and sub-hierarchies come back in child order with Java's filtering.
- Given `cached()` and repeated `provideTargetsFor(c)` calls, when the second call returns, then it comes from the
  cache, and an empty first result is recomputed (Java quirk).
- Given `ElkGraphBoundsProvider`, when bounds are requested, then a `Rectangle2D.Double` with the node's
  `x`/`y`/`width`/`height` is returned.
- Given a subclass that does not override `preprocess` or `cleanup`, when they are called, then the inherited
  defaults run as no-ops, as Java's do.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
