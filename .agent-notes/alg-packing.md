<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — alg-packing (mission 8c, 2026-11-13)

Planning-time notes are in `alg-packing-planning.md`.

## Observation: a probe of a non-terminating input must run in a child process with a kill timer

- **Context**: T10 probed the input of issue #73 (`Compaction.absorbBlocks` loops forever) inside a vitest test.
- **Finding**: vitest cannot stop a synchronous loop; its fork worker survived vitest's exit as an orphan (parent 1) at 99 % CPU for
  74 minutes until the orchestrator stopped it. The loop shows up in about 0.2 to 0.5 % of random small rectpacking graphs with
  `packing.compaction.rowHeightReevaluation = true`.
- **Impact**: run such probes and any random search over rectpacking with `timeout <s> npx tsx …` plus a step counter that throws;
  after a batch, check `ps` for vitest workers whose cwd is the worktree, not only for running commands.
- **Confidence**: High

## Observation: `Objects.equals` is true for one and the same object even when its `equals` is not reflexive

- **Context**: T13 sweep; ptolemy models with a NaN node centre threw `TypeError` in the port where the oracle threw later or laid out.
- **Finding**: `KVector.equals` compares with `==`, so a vector with a NaN component does not equal itself; the JVM's
  `Objects.equals(v, v)` is true (63 JVM rows, group `objects` of `spore-layout.json`). The Javadoc of `Objects.equals` does not say
  so. `JavaObjects.equals` now returns true for an identical object before calling `equals`.
- **Impact**: a shim written from the Javadoc alone can miss behaviour only a non-reflexive `equals` shows; NaN coordinates reach
  value-hashed and value-compared code through hierarchical inputs.
- **Confidence**: High

## Observation: `Collections.sort` with a contract-violating comparator differs from V8 only from 32 elements

- **Context**: PK7, 640 JVM `sort` rows with the comparator of `InteractiveNodeReorderer.java:56-63` (returns -1 for ties both ways).
- **Finding**: `Array.prototype.sort` reproduces all 310 rows of length 1 to 31 and 117 of the 330 of length 32 to 64; 179 differ in
  order and 34 throw `IllegalArgumentException` only in the JVM. No source was read for the cause (AD-9).
- **Impact**: a comparator that breaks the contract needs JVM vectors at and above 32 elements before a port sorts with it.
- **Confidence**: High

## Observation: the oracle sweep's two-run determinism check misses some jitter cases

- **Context**: T13, `sporeOverlap` sweep.
- **Finding**: four cases with coincident centres got verdict `ok` or `throws` because their two oracle runs agreed; 12 further oracle
  runs of one of them wrote 10 distinct outputs. The TS comparison flickers on exactly these cases (0 to 4 findings per run).
- **Impact**: a spore sweep finding is first checked against repeated oracle runs (`tools/oracle/run.sh --cases` with the same case
  several times); issue #79.
- **Confidence**: High

## Observation: `RectRow.addBlock` appends without updating the block's parent row or the x order

- **Context**: T10, T14b; issue #73, issue #78.
- **Finding**: `placeNextBeside` (`Compaction.java:411-413`) adds a block to the row and leaves its `parentRow` stale; `row.children`
  is then not ordered by x, a later pass treats the block as coming from the next row, and it can be added twice. Recorded block
  `minWidth`, `maxHeight` and `averageHeight` depend on the call history (`addChild` against `resetBlock`), and with
  `compaction.iterations` above 1 the ROWS list is the first iteration's while node positions are a later one's.
- **Impact**: a test that rebuilds rectpacking rows takes coordinates and stacks from the recorded rows, never from node positions
  or from a recomputation; `calculateBlockStacks` (no caller in the Java) does not rebuild recorded stacks in general.
- **Confidence**: High

## Observation: rectpacking's p1 tie arms need degenerate inputs

- **Context**: T14b search for arms no oracle row reached.
- **Finding**: two placement options tie only with zero-size nodes or a non-positive `spacing.nodeNode`; two 0×0 nodes with spacing 0
  make `findBestCandidate` return null and the Java throw a `NullPointerException` (`AreaApproximation.java:98`).
- **Impact**: replay-alone coverage hides reachable arms that only degenerate inputs reach; search for them and record them.
- **Confidence**: High

## Observation: stack depth is decided by the combined stack, and cold runs are the worst case

- **Context**: T11, T14a (PK6 probes on 2,000-node chains).
- **Finding**: `compactTree` alone completed 2,000 levels, but with the first bottom `getMinUnderlap` on top it overflowed at about
  1,250; `growAt` overflowed only together with the whole-tree `debugOut` of every step, and only under `--jitless`. A recursive test
  helper over the chain tree passed in a full run and failed under a `-t` filter. `DepthFirstCompaction` and `GrowTreePhase` call
  `drawTree` unconditionally from `debugOut`.
- **Impact**: probe the real call stack, not each recursion by itself; treat a cold-against-warm difference as a stack symptom; test
  helpers that walk deep trees need explicit stacks too.
- **Confidence**: High

## Observation: `DepthFirstCompaction` is cubic on a path

- **Context**: T2 recorder design, T11 and T14a chain rows.
- **Finding**: the oracle took 10.5 s for 500 non-touching chain nodes and 80.8 s for 1,000; 2,000 touching nodes took 26.8 s. The
  port's 2,000-node row took 71.8 s with a large stack and 321 s under vitest with the replay's wrappers.
- **Impact**: the row runs only with `SPORE_CHAIN_FULL=1`; a spore sweep over large graphs needs a per-case bound.
- **Confidence**: High

## Observation: a test's own timeout overrides `--testTimeout`

- **Context**: the detached `--jitless` run of `full/compaction/chain2000/default`.
- **Finding**: the test carried `{ timeout: 600_000 }`; the run with `--testTimeout=7000000` worked for 47 minutes and was then
  reported as "timed out in 600000ms". The timeout now reads `SPORE_CHAIN_TIMEOUT`.
- **Impact**: a long evidence run needs the timeout raised in the test (an environment variable), not on the command line.
- **Confidence**: High

## Observation: `GridElkNode.put` inserts, and `ArrayList` messages differ by method

- **Context**: T3, T8.
- **Finding**: every grid row list is `cols` plus its node count long; `ArrayList.add(index)` out of range says "Index: -1, Size: 2",
  `get(index)` says "Index -1 out of bounds for length 2"; `new ArrayList<>(-1)` throws `IllegalArgumentException: Illegal
Capacity: -1`. A row holding only nulls makes the whitespace phase throw `IndexOutOfBoundsException`.
- **Impact**: ports of `ArrayList` calls whose index an input can push out of range need the method-specific text.
- **Confidence**: High

## Observation: the engine never calls a provider for a childless layout node

- **Context**: T3, T11 (`n0`, `empty0` rows).
- **Finding**: `RecursiveGraphLayoutEngine` leaves a childless root untouched (0×0), while `TopdownpackingLayoutProvider.layout`
  called directly gives a 4×4 root; such a full row has no provider stops.
- **Impact**: provider arms for an empty graph are reached only by direct calls; record them that way.
- **Confidence**: High

## Observation: `ElkUtil.debugFolderPath` is `null` in the port and the Java concatenates it

- **Context**: T7, spore debug paths.
- **Finding**: the Java builds `debugFolderPath("spore") + "10bw"`; with the port's `null` that is `"null10bw"`, so `SVGImage` takes
  its debug path without writing a file. The port writes `String(…)` at those sites and the debug rows replay equal.
- **Impact**: a Java `path + "name"` is ported with `String(…)`, not with `?? ''`.
- **Confidence**: High

## Observation: a subclass reached through the options cycle makes its base class a non-entry module

- **Context**: T9 import smoke over `src/alg/rectpacking`.
- **Finding**: `EqualWhitespaceEliminator.ts` fails as an entry module because `ToAspectratioNodeExpander extends` it and is reached
  first through options, provider and enum. `NON_LEAF_DEFAULT_TYPES` entries fixed the four enum cycles (`NodeArrangementStrategy`,
  `WidthApproximationStrategy`, `WhiteSpaceEliminationStrategy`, `PackingStrategy`) but cannot fix a base class.
- **Impact**: tests enter through `RectPackingOptions` or the subclass (the 8b precedent); no entry-order import in `src/`.
- **Confidence**: High

## Observation: `InteractiveRectPackingGraphVisitor` is applied by nothing in the oracle

- **Context**: T1 recorder, corpus rows with `interactiveLayout = true`.
- **Finding**: no code under `plugins/` applies the visitor, so the option has no effect on a headless run; the port's evidence for
  the visitor is a unit test of the Java's logic.
- **Impact**: do not expect oracle rows for visitors the engine does not run.
- **Confidence**: High

## Observation: spore overwrites explicit margins and can throw from small inputs

- **Context**: T2 recorder.
- **Finding**: `NodeMarginCalculator.java:218-223` overwrites `CoreOptions.MARGINS` set on children (those rows equal the defaults);
  `ScanlineOverlapCheck.java:166` ("Invalid hitboxes") was hit by 897 of 200,000 random small overlapping graphs.
- **Impact**: a `sporeOverlap` throw on an ordinary input is first checked against the oracle.
- **Confidence**: High

## Observation: scratch tooling limits

- **Context**: several tasks.
- **Finding**: vitest did not show `console.log` from tests in these runs (write to a scratch file); a scratch vitest config under
  `$TMPDIR` cannot import `vitest/config` (export a plain object with `root` set to the repo); scratch `.ts` files under `$TMPDIR`
  run as CJS (use `.mts` for top-level `await`); lizard counts a rest parameter typed as a tuple as separate parameters; in a shell
  chain `a && b && c &` the whole chain runs in the background, not only `c`.
- **Impact**: saves a diagnosis round each.
- **Confidence**: Medium (observed once each)
