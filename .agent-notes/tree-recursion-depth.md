<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: tree-recursion-depth (issue #67, 2026-11)

## Observation: the oracle's stack depth is not a fixed number

- **Context**: measuring how deep the oracle lays out a path and a caterpillar (T1).
- **Finding**: in one JVM running depths in ascending order, the vertiflex path threw `StackOverflowError` at 4,000 to 5,500
  and completed 6,000 to 10,000: the JIT compiles the recursion after the first overflows and compiled frames are smaller.
  A JVM started at 20,000 threw at every depth up to 640,000. A JVM warmed through 2,000, 3,000, 6,000, ... threw from 6,000
  up for the path and completed the caterpillar at 15,000. The case thread has the default 2 MB stack (`ThreadStackSize`).
- **Impact**: "the depth the oracle reaches" depends on the cases a JVM has already run. Record the grid and the order, and
  do not assume overflow is monotone in depth. A bracket measured once (as in issue #67's table) is the limit of that run.
- **Confidence**: High

## Observation: an explicit-stack loop turns a recursion without end into a hang

- **Context**: reviewing the first radial and vertiflex conversions.
- **Finding**: where the Java recursion never ends (a cyclic successor structure that passes `findRoot`: 173 sweep cases; a
  node that is its own right sibling: four `mrtree-extra.json` rows), the JVM throws `StackOverflowError` and the recursive
  port threw `RangeError`. An unguarded loop ran until the heap limit, or for ever when it replaced a tail call. No twin
  test on trees shows this, and a synchronous endless loop ignores vitest's per-test timeout: a red run needs an outer
  `timeout`, or `NODE_OPTIONS=--max-old-space-size=512` so the worker aborts.
- **Impact**: every explicit-stack conversion of a recursion that follows raw graph structure needs `checkStackDepth`
  (`src/java/lang/StackDepth.ts`) and a test on a cyclic input; a recursion that stops on visited marks cannot run away.
  #70 (force, disco) and #76 (spore) should check for this first. The limit's size is a cost: at 1,000,000 a cyclic
  vertiflex case took 4 s and over 500 MB.
- **Confidence**: High

## Observation: a scaled probe finds the next overflow site in seconds

- **Context**: mrtree takes 36 to 64 minutes per run at 10,000 deep.
- **Finding**: a shallow depth on a proportionally reduced stack (`node --stack-size=140` at depth 1,500 is about depth 10,000
  on the default 984 KB) overflows in the same recursions. Unoptimised frames are larger, so it is the stricter probe and
  can name a site the full-depth run would pass. `Error.stackTraceLimit = 200` and counting the repeating `src/alg` frame
  names the recursive method; the innermost frame is usually a leaf call in `EcoreEMap` or `LinkedList`.
- **Impact**: use scaled probes for discovery and one real run per shape as the evidence.
- **Confidence**: High

## Observation: the unconverted mrtree port needs more than 15 GB at 10,000 deep

- **Context**: the D5 reference (the recursive port on a raised stack).
- **Finding**: `node --stack-size=7000` is enough stack for all six shapes (under `ulimit -s` 8176), but the recursive
  `FanProcessor.calculateFan` keeps one `locFanMap` per level alive, D²/2 entries, and died at the 4.4 GB default heap.
  `--max-old-space-size=48000` completes. The loop frees each map (411 MB against 1,661 MB at 3,000).
- **Impact**: a raised-stack reference of a recursion may also need a raised heap; an out-of-memory there is not a stack
  result.
- **Confidence**: High

## Observation: vitest 5 takes `--execArgv=--jitless`

- **Context**: the `--jitless` run of the new tests.
- **Finding**: `npx vitest run <files> --pool=forks --execArgv=--jitless` reaches the test process. `node --jitless
node_modules/vitest/vitest.mjs` and `NODE_OPTIONS=--jitless` fail at startup (`WebAssembly is not defined`), and
  `--poolOptions.forks.execArgv` is rejected as an unknown option.
- **Impact**: use the top-level flag.
- **Confidence**: High

## Observation: tsx compiles a `.ts` file outside the package as CommonJS

- **Context**: probe scripts under `$TMPDIR` that import the repository's modules.
- **Finding**: top-level `await` failed with "not supported with the cjs output format"; naming the scripts `.mts` fixed it.
  Run them from the repository root so `--import tsx` resolves, and pass the checkout to load as an environment variable.
- **Impact**: scratch scripts outside the repository are `.mts`.
- **Confidence**: High

## Observation: subagents with a bundle-only write-set duplicate fixtures

- **Context**: three track agents, each limited to `src/alg/<bundle>/**`.
- **Finding**: the 16 new test files carried 5 to 7 copies of the same spec and graph builders, because `test/helpers/` was
  outside every write-set. A fourth pass moved them.
- **Impact**: give a track that writes several test files a helper module in its write-set.
- **Confidence**: High
