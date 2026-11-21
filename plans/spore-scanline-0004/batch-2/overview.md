<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: regenerate refs; port the tests and the walk

T2 first (it moves the refs the port must then reproduce), then T3. Sequential: T3's acceptance needs T2's refs.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-regen-refs.md) | Rerun the D3 recorders and regen scripts on the patched oracle; check every change against D4 | orchestrator | D4 refs, journal | T1 | [x] |
| [T3](T3-port-tests-and-walk.md) | Port the two JUnit tests (red), then the walk (green); spore vector and golden suites green | orchestrator or `typescript-pro` (sonnet) | `src/alg/spore/ScanlineOverlapRemovalTest.test.ts`, `src/alg/common/spore/ScanlineOverlapCheckHandler.ts` | T2 | [x] |

Exit: D4 refs regenerated and journaled with patch id 0004; the two new tests and every spore vector / packing golden
test green with the port; the full suite green (orchestrator run, gate env).
