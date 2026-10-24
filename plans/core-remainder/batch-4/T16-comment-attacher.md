<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — `CommentAttacher` and `AggregatedMatchDecider`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T16): port comment attacher and aggregated match decider`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). `CommentAttacher` drives comment attachment: an explicit provider, filters, matchers, a bounds
provider and a decider.
- It needs only T13's abstract interfaces and its default decider, `AggregatedMatchDecider`, so it lands here.
- T19 adds `NodeReferenceMatcher` and replays T14's oracle scenarios end to end.
- Unit tests here derive from the Java source.

## Task
1. **`J/comments/AggregatedMatchDecider.java`:**
   - `withAggregator`, `withLowerAttachmentBoundary`, `withLowerBoundaryIncluded`;
   - the static aggregators `max`, `min`, `avg`, `sum` (`:148-185`);
   - `makeAttachmentDecision` (`:115-140`), keeping the `aggregate < 0` `IllegalStateException`, the strict `>` when
     tracking the maximum, and the boundary inclusion.
   - It iterates `normalizedHeuristics.entrySet()`, an identity-hashed map (AD-10). Use insertion order and journal
     the site (P2).
   - The inner map's `values()` order feeds a floating-point aggregate (sum or avg). Insertion order is matcher order,
     which is deterministic in TS. Journal that summation order can differ from the JVM's at the last ulp; T14
     designs ties out.
2. **`J/comments/CommentAttacher.java`:**
   - the configuration methods (`:138-275`);
   - `attachComments` (`:279-325`): the hierarchy queue, explicit-then-heuristic logic, cleanup, then
     `edgeifyFoundAttachments`;
   - `preprocess` and `cleanup`, each in Java's order: explicit provider, filters, matchers, bounds provider;
   - `isEligibleForHeuristicAttachment` (`allMatch`);
   - `findMatch` (`:379-395`): `results` keys are targets in candidate order (P2) and the inner keys are the matcher
     classes. Two matchers of the same class collide (last wins), as in Java.
3. **Defaults:**
   - `includeHierarchy = true`, `explicitAttachmentsDisableHeuristics = true`;
   - the explicit provider is Java's lambda `(a) -> null`, which becomes an anonymous `IExplicitAttachmentProvider`
     subclass instance (R5);
   - `boundsProvider = null`;
   - `decider = new AggregatedMatchDecider()`.
4. Write unit tests derived from the Java source using small fake providers and matchers:
   - explicit attachments disable heuristics, and `keepHeuristicsEnabledWithExplicitAttachments` keeps them;
   - hierarchy on and off;
   - filters veto;
   - empty candidates return `null`;
   - the decider boundary;
   - the `< 0` throw;
   - `preprocess`/`cleanup` call order, recorded by fakes.

## Write-set
`src/core/comments/{CommentAttacher,AggregatedMatchDecider}.ts` and colocated tests.

## Read-set
- `J/comments/{CommentAttacher,AggregatedMatchDecider}.java`.
- T13's `src/core/comments/*.ts`, `src/core/util/Pair.ts`, `src/java/util/LinkedList.ts` (the queue, if used).
- `decisions.md#r5--default-methods`, `#r6--comment-evidence`, `#pre-made` (P2).

## Interface contracts (outputs, consumed by T19)
- `new CommentAttacher<C, T>()`: `limitToCurrentHierarchyLevel(b)`, `keepHeuristicsEnabledWithExplicitAttachments(b)`,
  `withExplicitAttachmentProvider(p)`, `withBoundsProvider(p)`, `addFilter(f)`, `addMatcher(m)`,
  `withAttachmentDecider(d)`; each returns `this`.
- `attachComments(dataProvider): void`.
- `AggregatedMatchDecider<T> implements IDecider<T>`: `withAggregator(f)`, `withLowerAttachmentBoundary(x)`,
  `withLowerBoundaryIncluded(b)`; statics `max`, `min`, `avg`, `sum`.

## Acceptance criteria
- Given fakes that record calls, when `attachComments` runs, then `preprocess` and `cleanup` run in Java's order, and
  attachments are applied explicit first, then heuristic.
- Given one explicit attachment and `explicitAttachmentsDisableHeuristics = true`, when attached, then no heuristic
  attachment is applied, even ones already found.
- Given an aggregator that returns a negative value, when a decision is made, then `IllegalStateException` is thrown
  with Java's message.
- Given `withLowerBoundaryIncluded(false)` and a maximum equal to the boundary, when deciding, then the result is
  `null`.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
