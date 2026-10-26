<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes — alg-common-nodespacing (mission 6b, 2026-10-26)

## Observation: deferred-test label sizes come from AWT font metrics

- **Context**: Choosing the oracle inputs for the nodespacing sweep (AC2).
- **Finding**: The `.elkt` models in `tests/core/{node_size,label_placement}` give labels text but no size. The JUnit
  framework sizes them in `TestConfiguration.ensureSensibleLabelSize`/`computeLabelSize`
  (`test/org.eclipse.elk.alg.test/.../framework/config/TestConfiguration.java:164-200`) through `java.awt.Font`
  metrics at font size 10, which depend on the platform.
- **Impact**: Those sizes cannot serve as an oracle. Mission 6b sizes 0×0 labels by a recorder formula (NS4) and
  stores the prepared input in the vector JSON (NS1).
- **Confidence**: High

## Observation: vector-cache inputs digest does not cover elk-models or golden inputs

- **Context**: Planning a recorder that reads `$ELK_MODELS_DIR` and `test/golden/inputs/`.
- **Finding**: `tools/vectors/vector-cache.sh` hashes only `tools/vectors/`, `test/corpus/elkt-curated/` and
  `test/corpus/elkj-curated/` as inputs (header comment, lines 7-11).
- **Impact**: A recorder that reads other model files gets stale cache hits if those files change. 6b's recorder
  embeds a SHA-256 table of every model it reads, so a change becomes a recorder (salt) change.
- **Confidence**: High

## Observation: `NodeContext.portContexts` collapses ports with equal volatile ids

- **Context**: Checking that `src/guava/TreeMultimap.ts` covers `NodeContext.java:102`.
- **Finding**: `TreeMultimap.create(comparePortSides, comparePortContexts)` has TreeSet semantics per key, and
  `comparePortContexts` (`:257-282`) compares only `port.getVolatileId()`. Two ports on one side with equal volatile ids
  keep a single context. The landed TS `TreeMultimap` (`SortedBucket`) behaves the same.
- **Impact**: Faithful by construction; T3 tests it so a later "fix" doesn't diverge.
- **Confidence**: High

## Observation: nodespacing math is exact

- **Context**: Last-ulp risk assessment (AD-4).
- **Finding**: `nodespacing/**` calls only `Math.max` (79), `Math.min` (3), `ElkMath.maxd` (2) and
  `DoubleMath.fuzzyEquals` (1): no transcendental `Math.*`.
- **Impact**: No known-divergences entries are expected from JVM-vs-V8 `Math` differences.
- **Confidence**: High
