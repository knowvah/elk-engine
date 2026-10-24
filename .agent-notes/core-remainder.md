<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — core-remainder (mission 5b, 2026-10-23)

Planning-time notes are in `core-remainder-planning.md`.

## Observation: `Class` keys for ElkGraph types are the `*Impl` constructors

- **Context**: T5 `LayoutConfigurator.configure(Class)`.
- **Finding**: the ElkGraph interfaces (`ElkNode`, `ElkPort`, …) have no runtime value, so Java `ElkNode.class` keys
  become `ElkNodeImpl`, `ElkPortImpl`, `ElkEdgeImpl`, `ElkLabelImpl`, `ElkShapeImpl`, `ElkConnectableShapeImpl`,
  `ElkGraphElementImpl`; `findClassOptions` looks up exactly those constructors.
- **Impact**: harnesses and algorithm tests call `configure(ElkNodeImpl)`; configuring an interface-like key is
  impossible, configuring a non-listed subclass is never read.
- **Confidence**: High

## Observation: `ElkSpacings.ELK_OPTION_TARGET_FILTER` never filters

- **Context**: T7, `ElkSpacings.java`.
- **Finding**: the filter tests `property instanceof ElkGraphElement` (the property, not the element), which is never
  true, so it accepts every option and never delegates to `LayoutConfigurator.OPTION_TARGET_FILTER`. With overwrite off,
  each `build()` pushes another `NO_OVERWRITE_HOLDER` onto the builder's filter list.
- **Impact**: the 7a `LayeredSpacings` port must not assume target filtering; kept verbatim.
- **Confidence**: High

## Observation: JVM `\b` goes beyond its Javadoc definition for combining marks

- **Context**: T9 replay of `regex.json`.
- **Finding**: the JDK 21 `Pattern` Javadoc defines `\b` as `(?:(?<=\w)(?=\W)|(?<=\W)(?=\w))` with ASCII `\w`, yet
  `\b\Qi̇\E\b` (i + U+0307, the result of lowercasing `İ`) matches `i̇` on JDK 21.0.1: a combining mark after a word char
  is treated as word. `String.equalsIgnoreCase` is defined per code point (supplementary letters such as Deseret
  compare equal across case), so BMP-only tables are insufficient.
- **Impact**: R2 amended by the user: `\b` and supplementary case maps come from a recorded sweep
  (`regex-boundary.json`), never from V8 tables.
- **Confidence**: High

## Observation: `KVectorChain.iterator()` is a JS iterator

- **Context**: T10 porting `Iterator` loops over chains.
- **Finding**: `KVectorChain.iterator()` returns a plain JS `Iterator` (no `hasNext`); Java `Iterator` loops use
  `listIterator()`.
- **Impact**: later ports of `KVectorChain` walks (splines, edge routing) use `listIterator()`.
- **Confidence**: High

## Observation: timing-sensitive tests fail under heavy foreign load

- **Context**: batch-1 coverage gate at load average ~180 (another project's 22 python processes).
- **Finding**: 7 failures, all 5 s vitest timeouts (`emit.test.ts`, `JavaHashMap`/`JavaHashSet` JVM replays) or
  wall-clock budgets (`ImportedNamespaceAwareLocalScopeProvider` 600 ms, `ElkGraphJsonParser` 1000 ms); the same files
  pass alone in 7.9 s, and the full gate passed at load ~28.
- **Impact**: check `uptime` before a coverage gate; a timeout-only failure set at high load is not a code defect.
- **Confidence**: High

## Observation: subagents may lack WebFetch

- **Context**: T8 fetching the `Rectangle2D` Javadoc.
- **Finding**: WebFetch was unavailable inside the subagent; `curl` into a scratch file plus `python3 -I` HTML
  stripping worked for docs.oracle.com.
- **Impact**: brief shim agents with the curl fallback.
- **Confidence**: High

## Observation: `Collectors.summingDouble`/`averagingDouble` order is pinned only by vectors

- **Context**: T16 `AggregatedMatchDecider` `sum`/`avg`; user decision on a possible AD-9 problem.
- **Finding**: the Javadoc says the summation order "may vary". `stream-sum.json` (1,035 rows) pins the JDK 21
  behaviour: compensated summation with a final `sum - c`, and a simple-sum fallback when the result is NaN but the
  simple sum is infinite. A plain sum differs on 73 rows.
- **Impact**: do not simplify the sum to a plain loop; any future double-summing stream port must be checked against
  these rows.
- **Confidence**: High

## Observation: matcher results are keyed by matcher class in `CommentAttacher`

- **Context**: T14 oracle scenarios, used by T15, T16 and T19.
- **Finding**: two matchers of one class overwrite each other's result (last value wins, first position kept). With
  explicit attachments and keep-heuristics off, `edgeify` drops all heuristic attachments. `DistanceMatcher` adds the
  comment width to the left-side distance, and a comment touching the target's right edge with partial vertical
  overlap returns -1.
- **Impact**: scenario designs and any new matcher test must account for these; all kept verbatim.
- **Confidence**: High

## Observation: `IDataProvider.cached()` caches unevenly

- **Context**: T13.
- **Finding**: the first `provideTargetsFor(comment)` returns the uncached collection, later calls return the
  multimap's set, and an empty result never becomes a key so it is recomputed each call. `IBoundsProvider.cached()`
  tests `has()` first, so null results are cached.
- **Impact**: a test that mutates the returned collection sees different behaviour on the first and later calls.
- **Confidence**: High

## Observation: EMF `AbstractTreeIterator.hasAnyChildren()` shadows `nextPruneIterator`

- **Context**: T18; source read from the local EMF 2.31.0 sources jar
  (`~/.m2/repository/p2/osgi/bundle/org.eclipse.emf.common.source`, EPL, allowed by AD-9).
- **Finding**: the local variable shadows the field, so pruning before the first `next()` with `includeRoot=false`
  has no effect; kept. The Java `next(): E` is `nextElement()` in TS because `next()` is the JS iterator protocol.
- **Impact**: later tree walks over `AbstractTreeIterator` use `nextElement()`.
- **Confidence**: High

## Observation: new files under `tools/vectors/` make the next recorder runs cold once

- **Context**: T2 and T14 added `CoreJdkVectors.java`, `CommentVectors.java` and `comment-vectors.sh`.
- **Finding**: `vector-cache.sh` hashes the whole `tools/vectors/` input set (by design, `:11`), so the next `elkt`,
  `elkj` and `elkr` runs miss the cache once.
- **Impact**: budget the cold runs; mission 4e measured a cold `elkj` run at about 4 h wall
  (`vector-cache-and-key-line.md`).
- **Confidence**: High

## Observation: a scratch-worktree coverage run needs absolute external directories

- **Context**: batch-3 coverage gate in a detached worktree.
- **Finding**: `ELK_SOURCE_DIR`, `ELK_ORACLE_DIR` and `ELK_MODELS_DIR` default to repo-relative paths that do not
  resolve from `/tmp`; without absolute values, `test/corpus/corpus.test.ts` pinned-clone checks skip (7 extra skips).
- **Impact**: pass absolute paths when running a gate outside the repo tree.
- **Confidence**: High

## Observation: `ElkMath.maxl()`/`minl()` start from the int limits

- **Context**: T3.
- **Finding**: Java starts from `Integer.MIN_VALUE`/`MAX_VALUE` (`ElkMath.java:672,689`), so `maxl()` with no
  arguments is `-2147483648n`; `binomiall`'s `n == 0` branch is unreachable.
- **Impact**: do not "fix" the seeds when porting callers.
- **Confidence**: High
