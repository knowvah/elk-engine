<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: component-dfs-depth (issue #70, 2026-11)

## Observation: a cold oracle JVM does not lay out a 16,000-node force or stress path

- **Context**: measuring the depth the oracle reaches on a path (T1), on the grid 16,000 to 64,000 the brief gave.
- **Finding**: one cold JVM per algorithm threw `StackOverflowError` at 16,000 and every depth above, for force and stress,
  in two runs out of two. A JVM that first ran a ladder of shallower paths (2,000 upward in steps of 1,000 or 2,000)
  completed 16,000 and threw from 17,000 up, in three ladders. Disco completed 16,000 to 32,000 cold; in a ladder of 16,000,
  24,000, 32,000, 36,000, 40,000, 44,000, 48,000 it threw at 32,000, completed 36,000 and 40,000, and threw above. Issue
  #70's "the oracle completes 16,000" was a warmed JVM.
- **Impact**: a depth grid for the oracle starts low (2,000) and ascends in one JVM; a grid whose lowest depth is the
  expected limit measures a cold JVM and can report no depth at all. The bar is "the deepest case completed in any run",
  with the order of the cases recorded. Same cause as the tree note (`tree-recursion-depth.md`, first observation).
- **Confidence**: High

## Observation: one JVM can be warmed by another algorithm that shares the recursion

- **Context**: the stress caterpillar at 16,000 (32,000 nodes) takes the oracle most of an hour, and stress is cubic in the
  node count, so a warm-up ladder of stress caterpillars would take over two hours.
- **Finding**: force and stress run the same `ComponentsProcessor.dfs`. A case file that lists the force path at 2,000 to
  16,000 (43 s in all) and then the stress caterpillar lets the stress case start with the recursion compiled; it did not throw and completed in 69 minutes on a quiet machine (a
  first run under load was ended by a 90-minute limit). `tools/oracle/run.sh --cases` takes mixed algorithms in one file, each input naming its own.
- **Impact**: warm the recursion with the cheapest algorithm that reaches it.
- **Confidence**: High

## Observation: at depth the heap gives out before the stack does

- **Context**: the force caterpillar at 16,000 (32,000 nodes) and the stress path at 16,000.
- **Finding**: both died with `JavaScript heap out of memory` at V8's 4 GB default, converted and unconverted alike.
  `FGraph.calcAdjacency` holds an n x n matrix whose rows are `number[]` (8 bytes per element; the Java's `int[n][n]` has 4),
  8.2 GB at 32,000 nodes. `StressMajorization` holds two n x n `double` matrices, 16 n² bytes: 4.1 GB at 16,000 nodes,
  16.4 GB at 32,000. The JVM's default heap on this machine is 24 GiB. `--max-old-space-size` (12,000 to 28,000) completes
  every run; the native trace of the abort shows `Builtins_ArrayFrom`, not a `dfs` frame.
- **Impact**: a deep probe of force or stress needs a heap flag from about 16,000 nodes; an out-of-memory abort there is not
  a stack result. The brief's estimate for stress counted one matrix, not two.
- **Confidence**: High

## Observation: the probe's comparison needs the sweep's identity neutraliser for disco

- **Context**: the harness smoke run, `compareLayout` of the oracle's and the port's disco output.
- **Finding**: every disco output differs in `layoutOptions.debug.discoGraph` (`...DCGraph@<hash>` against
  `[object Object]`), the classified difference of issue #71 item 1. `tools/corpus/ts-layout-classify.ts` exports
  `neutraliseIdentity(expected, actual)`; calling it before `compareLayout` leaves everything else compared in full.
- **Impact**: a scratch comparer for disco imports that function instead of reporting one diff per case.
- **Confidence**: High

## Observation: the raised-stack reference needed no `Worker`

- **Context**: D5, the unconverted port at the oracle's depth.
- **Finding**: `node --stack-size=7000` (under `ulimit -s` 8176 KB) carried the recursive disco search to 40,000 and the
  recursive force search to 16,000 with JIT. The default 984 KB overflowed at 8,000 and 6,000.
- **Impact**: `resourceLimits.stackSizeMb` in a `Worker` is not needed below about 40,000 activations of these two methods.
- **Confidence**: High

## Observation: the full suite times out when other queue sessions load the machine

- **Context**: `npm run coverage` started at a 1-minute load of 88 on 12 cores; it rose to 237 (three other queue sessions
  plus this mission's own probe runs).
- **Finding**: four tests failed, each a few hundredths of a second past its timeout: two spore `chain2000` rows (60 s), and
  `NetworkSimplexTest` `testDeltas` and the disco FD4 twin (5 s; the latter is issue #164). All four files pass alone.
- **Impact**: the load rule of the queue names JVM runs only; the coverage gate needs a quiet machine as much. Check `uptime`
  before it and finish the mission's own long runs first.
- **Confidence**: High

## Observation: `a=… && nohup … &` backgrounds the assignments too

- **Context**: starting a detached run and using the variables again in the same shell command.
- **Finding**: in `T=x && P=y && nohup bash -c "…$T…" … &`, the `&` applies to the whole `&&` list, so the assignments run
  in the background subshell and the following lines see empty variables (`mkdir -p $T/ref` became `mkdir /ref`).
- **Impact**: separate assignments from a backgrounded command with `;` or a newline.
- **Confidence**: High
