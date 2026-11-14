<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: sharded TS comparison with a per-case limit

Decisions: TP2, TP3 ([decisions.md](../decisions.md)). Agent: typescript-pro (sonnet). Read [agent-rules.md](../agent-rules.md)
first.

## Context

`tools/corpus/ts-layout-compare.ts` (503 lines) compares the TS layout of each oracle sweep case with the oracle output. It runs
every case in one process, one after another. A case that never returns (issue #73's `absorbBlocks` loop; spore's cubic
`DepthFirstCompaction` on deep inputs) would stall a sweep of about 18,000 cases with no bound. Its default algorithm list is
still `fixed`, `box`, `random` (mission 5). Every in-scope provider is already registered (8c T13), and the `debug.discoGraph`
neutralisation is in place (#71 item 1).

## Task

1. Split the file below 500 lines and keep every current export reachable from `tools/corpus/ts-layout-compare.ts` (re-export
   them). `test/corpus/ts-layout-compare.test.ts` must pass **unchanged**: it is landed (AD-13).
2. Add the category `ts-aborted`. Insert it in `CATEGORIES` just before `excluded` and add it to `REPORTED`.
3. Add an async sharded path: `--shards <n>` (default `min(availableParallelism(), 8)`) and `--timeout-ms <ms>` (default
   120,000). Use one forked child per shard (`fork(workerFile, [], { execArgv: process.execArgv })`), with round-robin
   assignment as in `tools/corpus/sweep.ts:194-200`. The parent sends one case at a time and gets one outcome line back over
   IPC. The parent times each case. On timeout it sends `SIGKILL` and records `ts-aborted`/`timeout`; on an unexpected child
   exit it records `ts-aborted`/`exit <code|signal>`. Either way it starts a fresh child for the rest of the shard. `main` uses
   the sharded path. The synchronous `execute` and `runComparison` keep their current in-process behaviour and signatures,
   because their tests call them synchronously.
4. The default algorithms, when `--algorithms` is absent, are all 14 algorithm short names the oracle lists (`box disco fixed
   force layered mrtree radial random rectpacking sporeCompaction sporeOverlap stress topdownpacking vertiflex`).
   `parseArgs([])` must still equal `{ out, sweepDir, algorithms: DEFAULT_ALGORITHMS, filter }`, so new option keys are
   present only when their flag is given.
5. `--out` writes the [summary](#interface-contract) including `cases`. Stdout keeps today's `report()` lines and adds one
   `ts-aborted=` count, which follows the `CATEGORIES` order.
6. Exit codes stay as they are: 0 with no findings, 1 with findings, 2 on a tool error.

## Write-set

`tools/corpus/ts-layout-compare.ts` (modify), new `tools/corpus/ts-layout-classify.ts`, `tools/corpus/ts-layout-shards.ts`,
`tools/corpus/ts-layout-worker.ts` (the names are a suggestion; push-forward), new `test/corpus/ts-layout-shards.test.ts`
(and further new test files as needed). The landed `test/corpus/ts-layout-compare.test.ts` is not edited.

## Read-set

`tools/corpus/ts-layout-compare.ts` (whole), `tools/corpus/sweep.ts:180-300` and `:390-410` (the shard pattern),
`test/corpus/ts-layout-compare.test.ts:1-60`, `:221-303` and `:434-535` (what must stay), `tools/corpus/census.ts` (exports
only).

## Interface contract

The summary JSON (`--out`), which T2 consumes:

```ts
type Category = 'ok' | 'mismatch' | 'both-throw' | 'ts-only-throw' | 'oracle-only-throw' | 'ts-aborted' | 'excluded';
interface TsSweepSummary {
  elkCommit: string;            // tools/oracle/ELK_COMMIT
  modelsCommit: string;         // test/corpus/manifest.json commit
  sweepDir: string;             // the oracle sweep compared against
  node: string;                 // process.version
  shards: number;               // 1 for the in-process path
  timeoutMs: number | null;     // null for the in-process path
  wallMs: number;
  byAlgorithm: Record<string, { planned: number; counts: Record<Category, number>;
                                optionsOnlyMismatches: number; tsMs: number; oracleMs: number }>;
  findings: CaseOutcome[];      // categories mismatch, ts-only-throw, oracle-only-throw, ts-aborted
  cases: CaseOutcome[];         // every planned case, sorted by caseId
}
// CaseOutcome as today: { caseId, algorithm, category, detail, tsMs, oracleMs, optionsOnly? }
```

`byAlgorithm` keys are full algorithm ids (`org.eclipse.elk.box`), as today. For every algorithm, the counts sum to `planned`.

## Acceptance criteria

- Given a fixture sweep (the landed test's `fixture()` pattern) and `--shards 2`, when the sharded path runs, then its
  `byAlgorithm`, `findings` and `cases` equal those of the synchronous `runComparison` on the same rows, and no child process
  remains afterwards.
- Given a case whose TS run never returns (a test-only `runTs` dependency or worker hook with an endless loop) and
  `--timeout-ms 500`, when it runs, then that case is `ts-aborted` with detail `timeout`, the next case on the same shard is
  still compared, and the total wall time stays below 10 s.
- Given a child that exits mid-case (a test hook calling `process.exit(3)`), when it runs, then the case is `ts-aborted` with
  detail `exit 3`, and the following cases are compared.
- Given no `--algorithms`, when `parseArgs([])` runs, then `algorithms` is `DEFAULT_ALGORITHMS`, which holds the 14 short names,
  and the landed test file passes unchanged (`npx vitest run test/corpus/ts-layout-compare.test.ts`).
- Given `--out`, when a run ends, then the file parses into `TsSweepSummary`, `cases.length` equals the sum of `planned`, and
  every case id appears exactly once.

## Quality bar

The new modules reach at least 90 % branches in a scoped coverage run, with no `v8 ignore` except for the process wiring of
`main`. Run typecheck, prettier and complexity, and check `ps` afterwards.

**Observability:** the stdout counts and the `--out` file are the tool's whole telemetry; the per-case `tsMs` is kept.
**Rollback:** reversible (tooling only; revert the commit).
