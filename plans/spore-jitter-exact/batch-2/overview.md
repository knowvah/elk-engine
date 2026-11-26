<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: port replay of the `shift` rows

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-replay-shift-rows.md) | Group `shift` in the rows helper; new describe blocks in the two replays | orchestrator (or one `claude` opus subagent) | `test/helpers/spore-replay-rows.ts`, `src/alg/spore/SporeLayoutVectors.test.ts`, `src/alg/spore/ElkGraphImporter.test.ts`; `src/alg/spore/**`, `src/java/util/Random.ts` under stop 2 only | T1 | [x] |

## Common rules (include in a subagent prompt)

- The Java at `~/git/knowvah/elk` (pin `8bca22f4`) is the spec; never edit it, never read OpenJDK source.
- Tests are immutable (AD-13): no landed assertion, count or ref changes. New `describe` blocks only.
- AD-4 bar: ids, counts, non-numeric values exact; numbers within 1e-6.
- Keep each test file under 500 lines; SPDX header on new files.
- Return only the structured result: files changed, test counts, the tally line. No preamble, no trailing summary.
