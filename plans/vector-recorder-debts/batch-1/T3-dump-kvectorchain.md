<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: `dumpLGraph` encodes `KVectorChain`

## Context

D5. In `test/helpers/layered-framework-replay.ts`, `encodeObject` (about lines 247-287) encodes a `KVector` as
`{t:'obj', c:'KVector', fields:{x, y}}` and a TS array as `{t:'list', c:'List', items}`. The port's `KVectorChain`
(`src/core/math/KVectorChain.ts`, a `LinkedList`) falls to `{ class: 'KVectorChain' }`.

`test/helpers/layered-site-replay-dump.ts` (`dumpWithPropertyValues`) re-encodes every `{ class }`-only property value
from the live element with the site replay's encoder. Importers at planning:

- `test/helpers/layered-site-replay-ops-transform.ts`
- `test/helpers/layered-loops-replay-rows.ts`
- `test/helpers/layered-compound-replay-dump.ts`
- `test/helpers/layered-phase-replay-rows.ts`
- `test/helpers/layered-phase-replay-pre-state.test.ts`
- `test/helpers/layered-routing-replay-compare.test.ts`
- `src/alg/layered/LayeredRoutingVectors.test.ts`
- `src/alg/layered/p3order/LayerSweepCrossingMinimizer.test.ts`
- `src/alg/layered/LayeredPipelineReplay.test.ts`
- `src/alg/layered/p4nodes/NetworkSimplexPlacer.test.ts`

## Write-set

- `test/helpers/layered-framework-replay.ts` and its colocated test (create `layered-framework-replay.test.ts` if
  absent)
- `test/helpers/layered-site-replay-dump.ts` (narrow or delete)
- the importers above (import changes only, no assertion change)
- `tools/vectors/LayeredOrderVectors.java:2491` (the trailing comment only)
- `decision-journal.md`

## Read-set

- `test/helpers/layered-framework-replay.ts:1-60` and `:225-300`
- `test/helpers/layered-site-replay-dump.ts`
- `test/helpers/layered-site-replay-context.ts` (`Ctx.encode` for chains)
- `tools/vectors/LayeredFrameworkVectors.java:895-1000` (read-only: the recorder's shape)

## Steps

1. **Instrument first.** Temporarily make `dumpWithPropertyValues` log the class and count of each value it patches.
   Run every importer's suite once, and journal the table. Expected at planning: only `KVectorChain`.
2. **Red.** Add a test: a dumped `LNode` whose property holds a two-point `KVectorChain` is encoded as
   `{t:'list', c:'KVectorChain', items:[{t:'obj', c:'KVector', fields:{x:…, y:…}}, …]}`, with doubles encoded as the
   `KVector` arm encodes them. An empty chain gives `items: []`.
3. **Green.** Add the arm before `Array.isArray`, honouring `MAX_VALUE_DEPTH` as the other arms do.
4. **Rerun the instrumentation.**
   - If the patch count is 0 everywhere, delete `layered-site-replay-dump.ts` and switch each importer to `dumpLGraph`
     (same argument order; check the signature).
   - Otherwise narrow the module to the remaining classes and journal why each remains.
   - Remove the instrumentation.
5. Update the `LayeredOrderVectors.java:2491` comment so it no longer claims the TS dump lacks the encoder. The row's
   code is unchanged: the comment's text is the only diff in that file (`git diff` shows one line).
6. Run every importer's suite. All are green with no expected value changed (stop 6 otherwise). Commit.

## Acceptance criteria

- Given a `KVectorChain` property value, when `dumpLGraph` dumps the element, then the value equals the recorder's
  list encoding.
- Given the replay suites that used `dumpWithPropertyValues`, when they run after the change, then they pass with no
  assertion edited.
- Given the instrumentation after the fix, then the patch module is deleted (0 patches) or its remaining classes are
  journaled.
- Given `LayeredOrderVectors.java`, then the diff is one comment line.

## Observability

N/A: test tooling.

## Rollback

Reversible: revert the commit.
