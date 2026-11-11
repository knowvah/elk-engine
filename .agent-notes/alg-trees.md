<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — alg-trees (mission 8a, 2026-11)

## Observation: Java reference comparisons on `String` and boxed values need an identity model; a content-equality proof was wrong once

- **Context**: `FanProcessor.java:105` (`pId != tNode.getProperty(ID)`), ported as content inequality on a written proof
  (T16), then falsified by `stops/bfs/cyc79n7/searchOrder=BFS` of `mrtree-extra.json`.
- **Finding**: the proof assumed one `(pId, index)` pair per level. With a two-parent node the level mixes depths, `index`
  restarts at 0 and two distinct `String` objects with equal content exist, so Java resets `index` and a content comparison does
  not. The port now carries an identity token per iteration beside the plain string property. Boxed `Integer` (`TreeUtil.java:115-116`)
  is the other case: equal only inside the -128..127 cache.
- **Impact**: do not accept "equal references imply equal content and the converse" for a Java `==` on `String` or a box
  without an oracle row that has equal-content, distinct-object operands; model the identity.
- **Confidence**: High

## Observation: recorder rows that set an option only on the root leave node-level reads unexercised

- **Context**: vertiflex T8 replay-alone coverage (71 % branches of `p2relative/**`).
- **Finding**: every row set `considerNodeModelOrder` on the layout root, while `RelativeXPlacer.java:197` reads it on each
  subtree node, so `:197-249` never ran in the oracle recording. An additive recorder extension (471 rows from 283) fixed it.
- **Impact**: a green replay proves nothing for code the rows never ran; check replay-alone coverage, and set a property at
  every level a reader reads it.
- **Confidence**: High

## Observation: stop dumps that omit state a later step writes limit isolated replays

- **Context**: T16 (`CompactionProcessor`) and T6 (mrtree dump).
- **Finding**: `NodePlacer.java:103-105` writes `DIRECTION = DOWN` into the graph, and the mrtree dump does not carry
  `DIRECTION`, so a rebuilt "before" state read `UNDEFINED`, which `CompactionProcessor.java:78, 110` has no case for (every
  non-root coordinate 0). Only a node's first parent is dumped, so 27 multi-parent graphs cannot be rebuilt.
- **Impact**: an isolated replay after such a step must restore the write (`buildBeforeGraphs` does); a whole-pipeline replay is the
  check for states the dump cannot rebuild.
- **Confidence**: High

## Observation: a landed tripwire asserts `PENDING_TYPES` is `[]`

- **Context**: T5 (TR5 planned to add the three providers to `PENDING_TYPES`).
- **Finding**: `test/melk/model-algorithms.test.ts:121-123` fails with any entry; layered-framework X3 hit it too.
- **Impact**: hold a provider back with a staged class (`// @staged <mission>` and a `staged-classes.json` row), not with
  `PENDING_TYPES`; plan for it in later missions (8b, 8c, 8x).
- **Confidence**: High

## Observation: option keys in exported JSON depend on which providers are registered

- **Context**: T18 (`tree-goldens.test.ts`, the sweep tool).
- **Finding**: the JSON exporter names an option by the shortest unique suffix over the registered providers (`direction`
  becomes `elk.direction` once layered's `priority.direction` exists; the oracle registers everything). With layered
  unregistered, 153 mrtree sweep cases differed in `missing layoutOptions.<x>` only, and 15 hierarchical models failed to resolve
  the default algorithm.
- **Impact**: a golden or sweep comparison must register the same providers as the oracle, or classify options-only differences.
- **Confidence**: High

## Observation: a golden manifest entry without `retarget` records the default algorithm

- **Context**: T4, found by T18.
- **Finding**: `regen-goldens.sh` `write_cases` (`:110`) sends `algorithm` only with `retarget`; the three generated corpus
  inputs set no algorithm and were recorded with layered (each ref's root says `resolvedAlgorithm … layered`).
- **Impact**: assert the resolved algorithm of every golden entry.
- **Confidence**: High

## Observation: HotSpot `Math.sin` differs from V8 by one ulp at some arguments

- **Context**: radial sweep case `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2`.
- **Finding**: `Math.sin(1.6073462520335293)` is ...4178 in HotSpot, ...4177 in V8 and `StrictMath` (`EadesRadial.java:102`).
  The only visible effect is the string `layoutOptions.childAreaHeight`; geometry agrees within 1e-13.
- **Impact**: last-ulp `Math.*` differences go to the known-divergences list; they can show in exported strings.
- **Confidence**: High

## Observation: JS coerces a null box to 0 where Java throws

- **Context**: `NodeComparator.java:45-46`, `RelativeXPlacer.java:455-456` (vertiflex), found by the sweep.
- **Finding**: `integerCompare(null, null)` returned 0 and `null > null` was false; Java throws `NullPointerException`. The shim
  `src/java/lang/Unbox.ts` throws `TypeError`.
- **Impact**: every auto-unboxing of a property that can be unset needs the shim; the replay rows did not reach these sites.
- **Confidence**: High

## Observation: a whole-ref test loop needs an explicit timeout under coverage

- **Context**: `test/helpers/mrtree-replay-state.test.ts:93` timed out at the 5 s default in the coverage gate (1.6 s alone, load 65).
- **Finding**: v8 coverage at machine load multiplies a loop over 1,518 transitions beyond the default.
- **Impact**: `it('…', { timeout: 60_000 }, …)` on every test that loops over a whole ref.
- **Confidence**: High

## Observation: under `-XX:hashCode=2`, 11 or more identity-hashed elements share a treeified bin whose order is not insertion order

- **Context**: radial I30 rows (`RadialUtil.java:224`), `i30/rand-chain-big`.
- **Finding**: sets of 12 nodes iterated in the bin's tree order; 449 of 3,000 seeded permutations of the three sets reproduce
  the oracle stop, insertion order does not. Sets below 11 match in insertion order.
- **Impact**: classify such rows (issue #64), do not re-record; the order is not read from OpenJDK (AD-9).
- **Confidence**: High

## Observation: JS `substring` clamps where Java throws

- **Context**: `FanProcessor.java:128`.
- **Finding**: Java throws `StringIndexOutOfBoundsException` (`Range [0, 5) out of bounds for length 4`); `String.prototype.substring`
  clamps. `FanProcessor.substring` checks the range.
- **Impact**: audit every `substring` or `charAt` whose range an input can exceed.
- **Confidence**: High

## Observation: the mutation harness needs an external kill timer

- **Context**: T19 mutation spot checks over replay tests.
- **Finding**: the harness that runs replay tests against mutated scratch copies is killed by an external timer, not by vitest
  alone (reported to the orchestrator; the journal records no mechanism).
- **Impact**: wrap each mutant run in a timer.
- **Confidence**: Low

## Observation: `DoubleStream.average` is a Kahan sum with `sum - c` and a simple-sum fallback

- **Context**: `EdgeRouter.java:315, 330`, 2,170 JVM vectors (`mrtree-units.json`).
- **Finding**: Kahan returning `sum - c`, using the simple sum when the compensated sum is NaN and the simple sum is non-finite,
  matches 2,170 of 2,170; plain 1,603; Neumaier 1,471. Without the fallback 34 non-finite vectors differ.
- **Impact**: the Javadoc only says "may use compensated summation"; vector-prove any other `DoubleStream` reduction before porting.
- **Confidence**: High
