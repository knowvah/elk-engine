<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: port the two JUnit tests, then the walk

## Context

Issue #111 work items 2 and 3. The PR (eclipse-elk/elk#1247, oracle patch `0004`, `tools/oracle/patches/0004-*.patch`
from T1) adds two tests to `ScanlineOverlapRemovalTest.java` and changes the walk in `ScanlineOverlapCheck.java`'s
handler `insert`. Expected values come from the patched Java test's own `assertEquals` sets, confirmed by T1's oracle run
(`runs=4 failures=0`, AD-13). Decision [D5](../decisions.md#d5). The TS handler is a split-out file
(`ScanlineOverlapCheckHandler.ts`, the Java inner class) whose `@see` already names `ScanlineOverlapCheck.java`.

## Steps

1. Read the test hunk of the patch. Port `scanlineOverlapBehindNarrowNodeTest` and
   `scanlineOverlapRightOfInsertedNodeTest` into `src/alg/spore/ScanlineOverlapRemovalTest.test.ts` with a
   `@see ScanlineOverlapRemovalTest.java:<line> <name>` each (patched line numbers), plus the two helpers as file-local
   functions: `findOverlaps(nodes: Map<string, Node>): string[]` (insertion-ordered map, reverse lookup by identity,
   names joined `a-b` in `compareTo` order, result sorted as a `TreeSet<String>` iterates: UTF-16 code-unit order) and
   `node(x, y, w, h)` = `new Node(new KVector(x + w / 2, y + h / 2), new ElkRectangle(x, y, w, h))`. Use
   `new ScanlineOverlapCheck({ handle }, new SVGImage(null)).sweep([...nodes.values()])` as
   `src/alg/common/spore/Spore.test.ts:69-74` does. Expected: `['a-b','a-c','a-p','c-p']` and `['a-c','a-p','c-p']`.
2. Run the file: the two new tests fail on the current walk (red). Journal the failing output (which pair is missing).
3. Port the walk per D5 in `src/alg/common/spore/ScanlineOverlapCheckHandler.ts` `insert` (lines 107-125). Keep the
   existing comments, add the PR's comment and the `// eclipse-elk/elk#1247 (oracle patch 0004, …)` line.
4. Run: `npx vitest run src/alg/spore src/alg/common/spore test/golden/packing-goldens.test.ts` — green, including
   `SporeVectors.test.ts` (alg-common scanline rows) and `SporeLayoutVectors.test.ts` (spore-layout rows) against T2's
   refs. Any red: stop 5 (diagnosis mode).
5. `npx prettier --check`, `npm run typecheck`, `npx tsx tools/complexity/check.ts src/alg/common/spore src/alg/spore`.
6. Orchestrator: the full suite in the gate env (README), detached; check for stop 6 (D8).

## Write-set

`src/alg/spore/ScanlineOverlapRemovalTest.test.ts`, `src/alg/common/spore/ScanlineOverlapCheckHandler.ts`. Nothing else
(no change to any other test's expected value: AD-13, stop 6).

## Read-set

The 0004 patch; `src/alg/common/spore/ScanlineOverlapCheckHandler.ts:100-130`; `src/alg/common/spore/ScanlineOverlapCheck.ts:1-12,90-105`
(imports, `overlap`); `src/alg/common/spore/Node.ts` (constructor); `src/alg/common/spore/Spore.test.ts:1-30,69-105`;
`src/alg/spore/ScanlineOverlapRemovalTest.test.ts:1-20`; `docs/translation-rules.md` (TreeSet/Map rows).

## Acceptance criteria

- Given the current walk, when the two new tests run, then both fail (red) and the journal names the missing pairs.
- Given the ported walk, when the two tests run, then they return exactly `a-b, a-c, a-p, c-p` and `a-c, a-p, c-p`.
- Given T2's refs, when `SporeVectors.test.ts`, `SporeLayoutVectors.test.ts` and `packing-goldens.test.ts` run, then all
  pass at AD-4.
- Given the full suite, when it runs in the gate env, then 0 failures and no hand-written expected value changed.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: revert the two files.
