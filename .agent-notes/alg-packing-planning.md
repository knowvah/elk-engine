<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — alg-packing (mission 8c, 2026-11-13)

## Observation: spore's Math.random() fires only on coincident centres

- **Context**: Reading `ElkGraphImporter.java:167-169` against `docs/parity-report.md` (806/787 nondeterministic spore cases).
- **Finding**: the jitter loop runs while a node centre equals a key already in the value-hashed `nodeMap`; corpus models laid out at
  the origin all collide, designed inputs with distinct centres never enter it.
- **Impact**: recorder rows and goldens with distinct centres are deterministic; collisions are `jitter` rows (invariants only, PK4).
- **Confidence**: High

## Observation: GridElkNode.put inserts instead of setting

- **Context**: PK3 research.
- **Finding**: `GridElkNode.java:73` calls `grid.get(row).add(col, item)` on rows pre-filled with nulls, so each put grows the row list;
  `BottomRowEqualWhitespaceEliminator.java:58` walks back over the trailing nulls, so positions match a set-based grid but row sizes do not.
- **Impact**: the port keeps insert semantics; the recorder records row list lengths.
- **Confidence**: High

## Observation: the TS guards are instanceof against one registered class

- **Context**: PK3 research.
- **Finding**: `src/graph/ElkGraphPackage.ts:176-198` maps each interface name to one constructor; a delegating `ElkNode` would fail
  `isElkNode`. `docs/architecture/elkgraph-model.md` §5 and §9 already assign the guard extension to 8c.
- **Impact**: the registry must hold a list per name (T8).
- **Confidence**: High

## Observation: the oracle test bundles for 8c are already compiled

- **Context**: Java baseline at planning.
- **Finding**: `$ELK_ORACLE_DIR/test/org.eclipse.elk.alg.{rectpacking,spore,topdown}.test/target/classes` exist; a scratch
  `java-tests.sh` with the three bundles added ran all eight suites green (30 runs).
- **Impact**: no oracle rebuild is needed for PK10's baseline.
- **Confidence**: High

## Observation: rectpacking has a comparator that violates the Comparator contract

- **Context**: rectpacking research.
- **Finding**: `InteractiveNodeReorderer.java:56-63` returns -1 for equal `desiredPosition` in both directions; the tie order is
  whatever `Collections.sort` produces, and Java may throw from 32 elements.
- **Impact**: PK7 settles it by JVM vectors against `Array.prototype.sort`; no TimSort is written from memory (AD-9).
- **Confidence**: High (Java read); the V8 comparison is untested at planning
